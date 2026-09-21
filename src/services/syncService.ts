import { getFirestore, initializeFirestore, doc, collection, onSnapshot, setDoc, updateDoc, Firestore, getDocs, deleteDoc, getDoc, getDocFromServer, addDoc, query, orderBy, limit, where, writeBatch } from 'firebase/firestore';
import { app, db } from '../firebase';
import { getBatterySaverMode } from '../utils/batterySaverUtils';
import firebaseConfig from '../../firebase-applet-config.json';
import { GameState, UserResponse, FirebaseConfig, UserInfo, PingInfo, PingQuality, LatencyHistoryPoint, LatencyStats, EmergencyPoll, EmergencyPollHistoryItem, ActivityLogType, ActivityLogCategory, QrHistoryItem, QrScanEvent, HourlyScanDataPoint, QrScanTrendMetrics } from '../types';
import { INITIAL_QUESTION_BANK } from '../data/questionBank';
import { calculateLeaderboard } from '../utils/leaderboardUtils';
import { getSecureRandomId, getSecureRandomInt, secureShuffle } from '../utils/cryptoUtils';

const STORAGE_KEY_FIREBASE_CONFIG = 'BTI2026_FIREBASE_CONFIG';
const STORAGE_KEY_GAME_STATE = 'BTI2026_GAME_STATE';
const STORAGE_KEY_RESPONSES = 'BTI2026_RESPONSES';
const STORAGE_KEY_PRESENCE = 'BTI2026_PRESENCE';
const STORAGE_KEY_QR_SCAN_EVENTS = 'BTI2026_QR_SCAN_EVENTS';

export const DEFAULT_GAME_STATE: GameState = {
  active_module: 'GAME',
  lucky_draw: {
    status: 'IDLE',
    winner: null
  },
  round_name: INITIAL_QUESTION_BANK[0].round_name,
  round_type: INITIAL_QUESTION_BANK[0].round_type,
  question_id: INITIAL_QUESTION_BANK[0].id,
  question_text: INITIAL_QUESTION_BANK[0].question_text,
  category: INITIAL_QUESTION_BANK[0].category,
  options: INITIAL_QUESTION_BANK[0].options,
  eliminated_options: [],
  time_limit: INITIAL_QUESTION_BANK[0].time_limit,
  status: 'STANDBY',
  correct_key: '',
  explanation: INITIAL_QUESTION_BANK[0].explanation,
  server_start_time: 0,
  last_updated: Date.now(),
  projectorTheme: 'cyber_blue',
  qr_color_palette: 'purple_gold',
  qr_code_size: 280,
  qr_transparent_bg: false,
  projector_dimmed: false,
  vcnv_clues: [false, false, false, false],
  vcnv_keyword: '',
  vcnv_status: 'IDLE',
  vcnv_summary_active: false,
  vcnv_risk_status: 'IDLE',
  vcnv_risk_question: 'Gợi ý Ô Mạo Hiểm: Kỹ thuật sử dụng trí tuệ nhân tạo (AI / Deep Learning) để tổng hợp hoặc giả mạo hình ảnh, âm thanh, video khuôn mặt và giọng nói của người thật với độ chân thực cực cao.',
  vcnv_risk_answer: 'DEEPFAKE',
  vcnv_risk_start_time: 0,
  vcnv_risk_claimed_by: null,
  show_qr: false,
  is_timer_paused: false,
  paused_remaining_seconds: 0,
  lobby_locked: false,

  teams: [
    { id: 'team_alpha', name: 'Đội Alpha', color: '#3b82f6' },
    { id: 'team_beta', name: 'Đội Beta', color: '#ef4444' },
    { id: 'team_gamma', name: 'Đội Gamma', color: '#22c55e' }
  ],

  qr_scan_count: 0,
  last_scan_at: 0,
  qr_history: [],
  announcer_overlay: null,
  emergency_poll: null,
  emergency_poll_history: [],
  featured_qa_question: null,
  qa_settings: {
    is_open: true,
    allow_anonymous: true,
    max_chars: 250,
    slow_mode_sec: 15
  },
  question_likes: {},
  question_likes_uids: {}
};

type StateListener = (state: GameState) => void;
type ResponseListener = (responses: Record<string, UserResponse>) => void;
type AllResponsesListener = (allResponses: Record<string, Record<string, UserResponse>>) => void;
type PresenceListener = (count: number, users: Record<string, { online: boolean; last_active: number; name?: string; mssv?: string }>) => void;

class RealtimeSyncService {
  private firebaseApp: any = null;
  private db: Firestore | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private isFirebaseConnected: boolean = false;
  private batterySaverInterval: any = null;
  private spamCounters: Record<string, number> = {};
  private currentConfig: FirebaseConfig | null = null;
  private connectionListeners: Set<(connected: boolean) => void> = new Set();

  private stateListeners: Set<StateListener> = new Set();
  private responseListeners: Set<ResponseListener> = new Set();
  private allResponsesListeners: Set<AllResponsesListener> = new Set();
  private presenceListeners: Set<PresenceListener> = new Set();
  private pingListeners: Set<(info: PingInfo) => void> = new Set();
  private latencyHistoryListeners: Set<(history: LatencyHistoryPoint[], stats: LatencyStats) => void> = new Set();
  private latencyHistory: LatencyHistoryPoint[] = [];
  private globalNotificationListeners: Set<(notif: any) => void> = new Set();
  private globalNotificationRecallListeners: Set<() => void> = new Set();
  private adminAlertListeners = new Set<(msg: string) => void>();
  private scanEventsListeners: Set<(events: QrScanEvent[], hourlyData: HourlyScanDataPoint[], metrics: QrScanTrendMetrics) => void> = new Set();

  private cachedGameState: GameState = DEFAULT_GAME_STATE;
  private cachedResponses: Record<string, Record<string, UserResponse>> = {};
  private cachedPresence: Record<string, { online: boolean; last_active: number; name?: string; mssv?: string }> = {};
  private cachedScanEvents: QrScanEvent[] = [];
  private currentPingInfo: PingInfo = {
    latencyMs: null,
    quality: 'offline',
    lastChecked: 0
  };
  private serverTimeOffset: number = 0;
  
  private updateGameStateTimeout: any = null;
  private gameStateUpdatePromise: Promise<void> | null = null;
  private gameStateUpdateResolve: (() => void) | null = null;
  private unsubscribes: (() => void)[] = [];

  public getSynchronizedNow(): number {
    return Date.now() + this.serverTimeOffset;
  }

  public updateServerOffset(serverOrHostTimestamp?: number) {
    // Disabled intentionally to prevent extreme time jumps when loading cached or old states.
    // Relying on native device time is safer for the admin dashboard.
    return;
  }

  constructor() {
    // Seed initial historical latency points for last 5 minutes (300 seconds)
    this.initLatencyHistorySeed();
    if (typeof window !== 'undefined') {
      window.addEventListener('bti_battery_saver_changed', (e: any) => {
        const enabled = e.detail?.enabled;
        this.logActivity('SYSTEM_EVENT', 'Battery Saver', `Chế độ siêu tiết kiệm pin: ${enabled ? 'BẬT' : 'TẮT'}`);
        if (this.db) {
          this.attachFirebaseListeners(); // Reattach with new mode
        }
      });
    }
    // Setup connection monitoring for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.notifyConnectionChange();
        this.measurePing();
      });
      window.addEventListener('offline', () => {
        this.notifyConnectionChange();
        this.currentPingInfo = {
          latencyMs: null,
          quality: 'offline',
          lastChecked: Date.now()
        };
        this.notifyPingListeners();
      });
      window.addEventListener('focus', () => {
        if (Date.now() - this.currentPingInfo.lastChecked > 8000) {
          this.measurePing();
        }
      });
    }

    // Setup BroadcastChannel for cross-tab realtime sync
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('bti2026_sync_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'GAME_STATE_UPDATE') {
            this.cachedGameState = payload;
            this.notifyStateListeners();
            this.notifyResponseListeners();
          } else if (type === 'RESPONSE_ADDED') {
            const { questionId, uid, response } = payload;
            if (!this.cachedResponses[questionId]) {
              this.cachedResponses[questionId] = {};
            }
            this.cachedResponses[questionId][uid] = response;
            this.saveLocalResponses();
            this.notifyResponseListeners();
          } else if (type === 'RESPONSES_CLEARED') {
            const { questionId } = payload;
            if (questionId) {
              delete this.cachedResponses[questionId];
            } else {
              this.cachedResponses = {};
            }
            this.saveLocalResponses();
            this.notifyResponseListeners();
          } else if (type === 'PRESENCE_PING') {
            const { uid, info } = payload;
            this.cachedPresence[uid] = {
              online: true,
              last_active: Date.now(),
              name: info?.name,
              mssv: info?.mssv
            };
            this.saveLocalPresence();
            this.notifyPresenceListeners();
          } else if (type === 'QUESTION_LIKES_UPDATED') {
            const { likes, likesUids } = payload || {};
            if (likes && likesUids) {
              this.cachedGameState = {
                ...this.cachedGameState,
                question_likes: likes,
                question_likes_uids: likesUids
              };
              this.saveLocalState();
              this.notifyStateListeners();
            }
          } else if (type === 'ADMIN_ALERT') {
            this.adminAlertListeners.forEach(cb => cb(payload));
          } else if (type === 'GLOBAL_NOTIFICATION') {
            if (payload) {
              this.globalNotificationListeners.forEach(listener => {
                try { listener(payload); } catch (e) {}
              });
            }
          } else if (type === 'CLEAR_GLOBAL_NOTIFICATIONS') {
            this.globalNotificationRecallListeners.forEach(listener => {
              try { listener(); } catch (e) {}
            });
          } else if (type === 'QR_SCAN_EVENT_ADDED') {
            if (payload) {
              const existingIdx = this.cachedScanEvents.findIndex(e => e.id === payload.id);
              if (existingIdx === -1) {
                this.cachedScanEvents = [...this.cachedScanEvents, payload];
                this.saveLocalScanEvents();
                this.notifyScanEventListeners();
              }
            }
          } else if (type === 'QR_SCAN_EVENTS_CLEARED') {
            this.cachedScanEvents = [];
            this.saveLocalScanEvents();
            this.notifyScanEventListeners();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not available', e);
      }
    }

    // Load initial local data
    this.loadLocalData();

    // Check stored Firebase Config, otherwise initialize with default applet config
    if (!this.loadStoredFirebaseConfig()) {
      this.initializeFirebase();
    }

    // Setup local presence heartbeat cleaner
    setInterval(() => {
      this.cleanStalePresence();
    }, 10000);

    // Periodic ping measurement (every 6 seconds when tab is active)
    setInterval(() => {
      if (typeof document !== 'undefined' && !document.hidden && this.getIsFirebaseConnected()) {
        this.measurePing();
      }
    }, 6000);
  }

  private initLatencyHistorySeed() {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000; // 5 minutes
    const stepMs = 10 * 1000; // every 10s = 30 points
    const points: LatencyHistoryPoint[] = [];

    // Realistic baseline latency around 38-68ms with minor jitter
    for (let t = now - windowMs; t <= now - stepMs; t += stepMs) {
      const noise = Math.floor(Math.sin(t / 25000) * 12 + Math.cos(t / 15000) * 8 + (getSecureRandomInt(0, 6) - 3));
      const lat = Math.max(28, 48 + noise);
      const timeDate = new Date(t);
      const timeFormatted = timeDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      points.push({
        timestamp: t,
        timeFormatted,
        latencyMs: lat,
        displayLatency: lat,
        quality: lat < 100 ? 'excellent' : lat < 250 ? 'good' : lat < 500 ? 'fair' : 'poor',
        status: 'ONLINE'
      });
    }
    this.latencyHistory = points;
  }

  private loadLocalData() {
    if (typeof window === 'undefined') return;
    try {
      const savedState = localStorage.getItem(STORAGE_KEY_GAME_STATE);
      if (savedState) {
        this.cachedGameState = { ...DEFAULT_GAME_STATE, ...JSON.parse(savedState) };
      }
      const savedResponses = localStorage.getItem(STORAGE_KEY_RESPONSES);
      if (savedResponses) {
        this.cachedResponses = JSON.parse(savedResponses);
      }
      const savedPresence = localStorage.getItem(STORAGE_KEY_PRESENCE);
      if (savedPresence) {
        this.cachedPresence = JSON.parse(savedPresence);
      }
      const savedScanEvents = localStorage.getItem(STORAGE_KEY_QR_SCAN_EVENTS);
      if (savedScanEvents) {
        this.cachedScanEvents = JSON.parse(savedScanEvents);
      } else {
        // Initialize with default historical scan points matching qr_scan_count or default baseline
        const initialCount = Number(this.cachedGameState.qr_scan_count) || 0;
        if (initialCount > 0) {
          this.cachedScanEvents = this.generateSeedScanEvents(initialCount);
          this.saveLocalScanEvents();
        }
      }
    } catch (e) {
      console.warn('Error loading localStorage sync state', e);
    }
  }

  private saveLocalState() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_GAME_STATE, JSON.stringify(this.cachedGameState));
    } catch {}
  }

  private saveLocalResponses() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_RESPONSES, JSON.stringify(this.cachedResponses));
    } catch {}
  }

  private saveLocalPresence() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_PRESENCE, JSON.stringify(this.cachedPresence));
    } catch {}
  }

  private saveLocalScanEvents() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_QR_SCAN_EVENTS, JSON.stringify(this.cachedScanEvents));
    } catch {}
  }

  public getFirebaseConfig(): FirebaseConfig | null {
    return this.currentConfig;
  }

  public getIsFirebaseConnected(): boolean {
    // Incorporate both Firebase initialization state and browser network online state
    return this.isFirebaseConnected && (typeof navigator === 'undefined' || navigator.onLine);
  }

  public async logActivity(
    type: ActivityLogType | string,
    title: string,
    description: string,
    optionsOrMetadata?: Record<string, any>
  ): Promise<void> {
    if (!this.db || !this.getIsFirebaseConnected()) return;
    try {
      const now = Date.now();
      const meta = optionsOrMetadata || {};
      
      // Infer research category if not provided
      let category = meta.category;
      if (!category) {
        if (type.startsWith('ADMIN_')) category = 'ADMIN_CONTROL';
        else if (type === 'QUESTION_SUBMITTED' || type === 'USER_JOINED') category = 'USER_INTERACTION';
        else if (type === 'VCNV_PREDICTION' || type === 'VCNV_REVEAL') category = 'VCNV_WORKFLOW';
        else if (type === 'EMERGENCY_POLL') category = 'POLL_SURVEY';
        else if (type === 'LUCKY_DRAW_WIN') category = 'LUCKY_DRAW';
        else if (type === 'ITEM_ANALYSIS') category = 'PSYCHOMETRICS';
        else category = 'SYSTEM_TELEMETRY';
      }

      await addDoc(collection(this.db, 'activity_logs'), {
        type,
        category,
        title,
        description,
        timestamp: now,
        timestamp_iso: new Date(now).toISOString(),
        actor_id: meta.actor_id || meta.uid || '',
        actor_role: meta.actor_role || (type.startsWith('ADMIN_') ? 'ADMIN' : 'AUDIENCE'),
        actor_name: meta.actor_name || meta.name || '',
        round_id: meta.round_id || '',
        question_id: meta.question_id || meta.questionId || '',
        latency_ms: typeof meta.latency_ms === 'number' ? meta.latency_ms : (meta.latency_sec ? Math.round(meta.latency_sec * 1000) : null),
        score_delta: meta.score_delta ?? null,
        research_tags: meta.research_tags || [],
        metadata: meta
      });
    } catch (error) {
      console.warn('Failed to log activity:', error);
    }
  }

  public subscribeToConnection(callback: (connected: boolean) => void): () => void {
    this.connectionListeners.add(callback);
    callback(this.getIsFirebaseConnected());
    return () => {
      this.connectionListeners.delete(callback);
    };
  }

  private notifyConnectionChange() {
    const isConnected = this.getIsFirebaseConnected();
    this.connectionListeners.forEach(listener => listener(isConnected));
  }

  private setFirebaseConnected(status: boolean) {
    if (this.isFirebaseConnected !== status) {
      this.isFirebaseConnected = status;
      this.notifyConnectionChange();
    }
  }

  public loadStoredFirebaseConfig(): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_FIREBASE_CONFIG);
      if (saved) {
        const config = JSON.parse(saved) as FirebaseConfig;
        if (config && config.databaseURL) {
          return this.initializeFirebase(config);
        }
      }
    } catch (e) {
      console.warn('Failed to load stored Firebase config', e);
    }
    return false;
  }

  public initializeFirebase(config?: FirebaseConfig): boolean {
    if (this.isFirebaseConnected && this.firebaseApp) return true;
    try {
      const activeConfig = config ? {
        apiKey: config.apiKey || firebaseConfig.apiKey,
        authDomain: config.authDomain || firebaseConfig.authDomain,
        projectId: config.projectId || firebaseConfig.projectId,
        appId: config.appId || firebaseConfig.appId,
        storageBucket: config.storageBucket || firebaseConfig.storageBucket,
        messagingSenderId: config.messagingSenderId || firebaseConfig.messagingSenderId,
        firestoreDatabaseId: (config as any).firestoreDatabaseId || (firebaseConfig as any).firestoreDatabaseId
      } : firebaseConfig;

      this.currentConfig = activeConfig as any;
      this.firebaseApp = app;
      this.db = db;
      this.setFirebaseConnected(true);
      this.attachFirebaseListeners();
      setTimeout(() => {
        this.measurePing();
      }, 500);
      return true;
    } catch (error) {
      console.error('Firestore Init Error:', error);
      this.setFirebaseConnected(false);
      return false;
    }
  }
  public disconnectFirebase() {
    this.setFirebaseConnected(false);
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    this.firebaseApp = null;
    this.db = null;
    this.currentConfig = null;
    this.currentPingInfo = {
      latencyMs: null,
      quality: 'offline',
      lastChecked: Date.now()
    };
    this.notifyPingListeners();
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_FIREBASE_CONFIG);
    }
  }

    private attachFirebaseListeners() {
    if (!this.db) return;
    
    this.unsubscribes.forEach(unsub => unsub());
    this.unsubscribes = [];
    if (this.batterySaverInterval) {
      clearInterval(this.batterySaverInterval);
      this.batterySaverInterval = null;
    }

    const isBatterySaver = getBatterySaverMode();

    if (isBatterySaver) {
      // BẬT CHẾ ĐỘ TIẾT KIỆM PIN: POLLING 10s một lần thay vì onSnapshot realtime
      this.batterySaverInterval = setInterval(async () => {
        if (!this.db) return;
        try {
          // Poll game_state
          const stateSnap = await getDoc(doc(this.db, 'game_state', 'current'));
          if (stateSnap.exists()) {
            this.setFirebaseConnected(true);
            const data = stateSnap.data() as GameState;
            this.cachedGameState = { ...DEFAULT_GAME_STATE, ...data };
            this.saveLocalState();
            this.notifyStateListeners();
            this.notifyResponseListeners();
          }

          // Poll responses
          const respsSnap = await getDocs(collection(this.db, 'responses'));
          const rData: Record<string, Record<string, UserResponse>> = {};
          respsSnap.forEach(docSnap => {
            const docData = docSnap.data();
            const qId = docData.questionId;
            const uid = docData.uid;
            if (qId && uid) {
              if (!rData[qId]) rData[qId] = {};
              rData[qId][uid] = docData.response;
            }
          });
          this.cachedResponses = rData;
          this.saveLocalResponses();
          this.notifyResponseListeners();

        } catch (err) {
          console.error('Polling error in Battery Saver mode:', err);
          this.setFirebaseConnected(false);
        }
      }, 10000); // 10 seconds polling interval

    } else {
      // CHẾ ĐỘ BÌNH THƯỜNG: REALTIME ONSNAPSHOT
      // 1. Listen to game_state
      this.unsubscribes.push(onSnapshot(doc(this.db, 'game_state', 'current'), (snapshot) => {
        this.setFirebaseConnected(true);
        if (snapshot.exists()) {
          const data = snapshot.data() as GameState;
          this.cachedGameState = { ...DEFAULT_GAME_STATE, ...data };
          this.saveLocalState();
          this.notifyStateListeners();
          this.notifyResponseListeners();
        }
      }, (error) => {
        console.error('Firestore game_state listener error:', error);
        this.setFirebaseConnected(false);
      }));

      // 2. Listen to responses
      this.unsubscribes.push(onSnapshot(collection(this.db, 'responses'), (snapshot) => {
        this.setFirebaseConnected(true);
        const data: Record<string, Record<string, UserResponse>> = {};
        snapshot.forEach(docSnap => {
          const docData = docSnap.data();
          const qId = docData.questionId;
          const uid = docData.uid;
          if (qId && uid) {
            if (!data[qId]) data[qId] = {};
            data[qId][uid] = docData.response;
          }
        });
        this.cachedResponses = data;
        this.saveLocalResponses();
        this.notifyResponseListeners();
      }, (error) => {
        console.error('Firestore responses listener error:', error);
        this.setFirebaseConnected(false);
      }));
    }

    // 3. Listen to presence (always poll heavily or just use snapshot because it's low traffic)
    // Actually presence we can leave as snapshot since it's just meta, but to be strict let's keep it.
    if (!isBatterySaver) {
      this.unsubscribes.push(onSnapshot(collection(this.db, 'presence'), (snapshot) => {
        this.setFirebaseConnected(true);
        const data: Record<string, any> = {};
        snapshot.forEach(docSnap => {
          data[docSnap.id] = docSnap.data();
        });
        this.cachedPresence = data;
        this.saveLocalPresence();
        this.notifyPresenceListeners();
      }, (error) => {
        console.error('Firestore presence listener error:', error);
        this.setFirebaseConnected(false);
      }));
    }

    // 4. Listen to qr_scans (Scan History for Hourly Trends)
    try {
      const qScans = query(collection(this.db, 'qr_scans'), orderBy('timestamp', 'asc'), limit(500));
      this.unsubscribes.push(onSnapshot(qScans, (snapshot) => {
        const events: QrScanEvent[] = [];
        snapshot.forEach(docSnap => {
          const docData = docSnap.data();
          events.push({
            id: docSnap.id,
            timestamp: docData.timestamp || Date.now(),
            timestamp_iso: docData.timestamp_iso || new Date(docData.timestamp || Date.now()).toISOString(),
            hour_key: docData.hour_key || '',
            hour_number: typeof docData.hour_number === 'number' ? docData.hour_number : new Date(docData.timestamp || Date.now()).getHours(),
            day_str: docData.day_str || '',
            source: docData.source || 'mobile_qr',
            device_type: docData.device_type || 'Mobile',
            round_context: docData.round_context || ''
          });
        });
        if (events.length > 0) {
          this.cachedScanEvents = events;
          this.saveLocalScanEvents();
          this.notifyScanEventListeners();
        }
      }, (error) => {
        console.warn('Firestore qr_scans listener note:', error);
      }));
    } catch (e) {
      console.warn('Could not attach Firestore qr_scans listener:', e);
    }
  }
  // --- Broadcast / Local Notifications ---
  private notifyStateListeners() {
    this.stateListeners.forEach(listener => listener(this.cachedGameState));
  }

  private notifyResponseListeners() {
    const currentQResponses = this.cachedResponses[this.cachedGameState.question_id] || {};
    this.responseListeners.forEach(listener => listener(currentQResponses));
    this.allResponsesListeners.forEach(listener => listener(this.cachedResponses));
  }

  private notifyPresenceListeners() {
    const activeCount = Object.values(this.cachedPresence).filter(p => p.online && (Date.now() - p.last_active < 30000)).length;
    this.presenceListeners.forEach(listener => listener(Math.max(1, activeCount), this.cachedPresence));
  }

  private cleanStalePresence() {
    const now = Date.now();
    let hasChanges = false;
    Object.keys(this.cachedPresence).forEach(uid => {
      if (now - this.cachedPresence[uid].last_active > 45000) {
        delete this.cachedPresence[uid];
        hasChanges = true;
      }
    });
    if (hasChanges) {
      this.saveLocalPresence();
      this.notifyPresenceListeners();
    }
  }

  // --- Public Subscription Methods ---
  public subscribeToState(callback: StateListener): () => void {
    this.stateListeners.add(callback);
    callback(this.cachedGameState);
    return () => {
      this.stateListeners.delete(callback);
    };
  }

  public subscribeToResponses(callback: ResponseListener): () => void {
    this.responseListeners.add(callback);
    const currentQResponses = this.cachedResponses[this.cachedGameState.question_id] || {};
    callback(currentQResponses);
    return () => {
      this.responseListeners.delete(callback);
    };
  }

  public subscribeToAllResponses(callback: AllResponsesListener): () => void {
    this.allResponsesListeners.add(callback);
    callback(this.cachedResponses);
    return () => {
      this.allResponsesListeners.delete(callback);
    };
  }

  public subscribeToPresence(callback: PresenceListener): () => void {
    this.presenceListeners.add(callback);
    const activeCount = Object.values(this.cachedPresence).filter(p => p.online && (Date.now() - p.last_active < 30000)).length;
    callback(Math.max(1, activeCount), this.cachedPresence);
    return () => {
      this.presenceListeners.delete(callback);
    };
  }

  public subscribeToPing(callback: (info: PingInfo) => void): () => void {
    this.pingListeners.add(callback);
    callback(this.currentPingInfo);
    if (Date.now() - this.currentPingInfo.lastChecked > 15000) {
      this.measurePing();
    }
    return () => {
      this.pingListeners.delete(callback);
    };
  }

  public getPingInfo(): PingInfo {
    return this.currentPingInfo;
  }

  private notifyPingListeners() {
    this.pingListeners.forEach(listener => listener(this.currentPingInfo));
  }

  private recordLatencyPoint(latencyMs: number | null, quality: PingQuality) {
    const now = Date.now();
    const timeFormatted = new Date(now).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const isOnline = latencyMs !== null && quality !== 'offline';

    const newPoint: LatencyHistoryPoint = {
      timestamp: now,
      timeFormatted,
      latencyMs: latencyMs,
      displayLatency: isOnline ? (latencyMs as number) : 0,
      quality,
      status: isOnline ? 'ONLINE' : 'OFFLINE'
    };

    // Keep points within the last 5 minutes (300,000 ms)
    const cutoff = now - (5 * 60 * 1000);
    this.latencyHistory = [...this.latencyHistory.filter(p => p.timestamp >= cutoff), newPoint];

    const stats = this.calculateLatencyStats();
    this.latencyHistoryListeners.forEach(listener => listener(this.latencyHistory, stats));
  }

  public calculateLatencyStats(): LatencyStats {
    const validPoints = this.latencyHistory.filter(p => p.latencyMs !== null && p.status === 'ONLINE');
    const totalSamples = this.latencyHistory.length;

    if (validPoints.length === 0) {
      return {
        currentMs: this.currentPingInfo.latencyMs,
        avgMs: 0,
        minMs: 0,
        maxMs: 0,
        jitterMs: 0,
        stabilityScore: 0,
        samplesCount: totalSamples
      };
    }

    const latencies = validPoints.map(p => p.latencyMs as number);
    const sum = latencies.reduce((a, b) => a + b, 0);
    const avgMs = Math.round(sum / latencies.length);
    const minMs = Math.min(...latencies);
    const maxMs = Math.max(...latencies);

    // Calculate jitter (mean absolute difference between consecutive points)
    let jitterSum = 0;
    for (let i = 1; i < latencies.length; i++) {
      jitterSum += Math.abs(latencies[i] - latencies[i - 1]);
    }
    const jitterMs = latencies.length > 1 ? Math.round(jitterSum / (latencies.length - 1)) : 0;

    // Stability score: percentage of successful samples with latency < 500ms
    const healthySamples = validPoints.filter(p => (p.latencyMs as number) < 500).length;
    const stabilityScore = totalSamples > 0 ? Math.round((healthySamples / totalSamples) * 1000) / 10 : 100;

    return {
      currentMs: this.currentPingInfo.latencyMs,
      avgMs,
      minMs,
      maxMs,
      jitterMs,
      stabilityScore,
      samplesCount: totalSamples
    };
  }

  public subscribeToLatencyHistory(callback: (history: LatencyHistoryPoint[], stats: LatencyStats) => void): () => void {
    this.latencyHistoryListeners.add(callback);
    callback(this.latencyHistory, this.calculateLatencyStats());
    return () => {
      this.latencyHistoryListeners.delete(callback);
    };
  }

  public getLatencyHistory(): LatencyHistoryPoint[] {
    return this.latencyHistory;
  }

  public getLatencyStats(): LatencyStats {
    return this.calculateLatencyStats();
  }

  public async measurePing(): Promise<PingInfo> {
    if (!this.getIsFirebaseConnected() || !this.db) {
      this.currentPingInfo = {
        latencyMs: null,
        quality: 'offline',
        lastChecked: Date.now()
      };
      this.recordLatencyPoint(null, 'offline');
      this.notifyPingListeners();
      return this.currentPingInfo;
    }

    const startTime = performance.now();
    try {
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Ping timeout')), 4000);
      });

      const pingFetch = (async () => {
        if (!this.db) throw new Error('No DB');
        try {
          return await getDocFromServer(doc(this.db, 'game_state', 'current'));
        } catch {
          return await getDoc(doc(this.db, 'game_state', 'current'));
        }
      })();

      await Promise.race([pingFetch, timeoutPromise]);
      const rtt = Math.round(performance.now() - startTime);

      let quality: PingQuality = 'excellent';
      if (rtt < 100) {
        quality = 'excellent';
      } else if (rtt < 250) {
        quality = 'good';
      } else if (rtt < 500) {
        quality = 'fair';
      } else {
        quality = 'poor';
      }

      this.currentPingInfo = {
        latencyMs: rtt,
        quality,
        lastChecked: Date.now()
      };
      this.recordLatencyPoint(rtt, quality);
      this.notifyPingListeners();
      return this.currentPingInfo;
    } catch (err) {
      this.currentPingInfo = {
        latencyMs: null,
        quality: 'offline',
        lastChecked: Date.now()
      };
      this.recordLatencyPoint(null, 'offline');
      this.notifyPingListeners();
      return this.currentPingInfo;
    }
  }

  // --- Operations / Mutations ---

  private removeUndefined<T>(obj: T): T {
    if (obj === null || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(item => this.removeUndefined(item)) as unknown as T;
    const clean: any = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const val = (obj as any)[key];
        if (val !== undefined) {
          clean[key] = this.removeUndefined(val);
        }
      }
    }
    return clean as T;
  }

  public async autoAssignTeamsRoundRobin(): Promise<number> {
    if (!this.db) return 0;
    if (!this.cachedGameState.teams || this.cachedGameState.teams.length === 0) return 0;
    
    try {
      const usersRef = collection(this.db, 'users');
      const snap = await getDocs(usersRef);
      const users = [];
      snap.forEach(docSnap => {
        const data = docSnap.data();
        if (data && data.uid) {
          users.push(data);
        }
      });
      
      // Sort by join time
      users.sort((a, b) => (a.registeredAt || 0) - (b.registeredAt || 0));
      
      const batch = writeBatch(this.db);
      const teams = this.cachedGameState.teams;
      let batchCount = 0;
      let updatedUsers = 0;
      
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const team = teams[i % teams.length];
        
        if (user.teamId !== team.id) {
          const userRef = doc(this.db, 'users', user.uid);
          batch.update(userRef, { 
            teamId: team.id,
            teamName: team.name
          });
          batchCount++;
          updatedUsers++;
          
          if (batchCount >= 490) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      return updatedUsers;
    } catch (e) {
      console.error('Error auto assigning teams:', e);
      return 0;
    }
  }

  public async reShuffleTeamsRandomly(): Promise<number> {
    if (!this.db) return 0;
    if (!this.cachedGameState.teams || this.cachedGameState.teams.length === 0) return 0;
    
    try {
      const usersRef = collection(this.db, 'users');
      const snap = await getDocs(usersRef);
      const onlineUsers = [];
      const now = Date.now();
      snap.forEach(docSnap => {
        const data = docSnap.data();
        const presence = this.cachedPresence[data.uid];
        const isOnline = presence && presence.online && (now - presence.last_active < 120000);
        if (data && data.uid && isOnline) {
          onlineUsers.push(data);
        }
      });
      
      const shuffledUsers = secureShuffle(onlineUsers);
      
      const batch = writeBatch(this.db);
      const teams = this.cachedGameState.teams;
      let batchCount = 0;
      let updatedUsers = 0;
      
      for (let i = 0; i < shuffledUsers.length; i++) {
        const user = shuffledUsers[i];
        const team = teams[i % teams.length];
        
        if (user.teamId !== team.id) {
          const userRef = doc(this.db, 'users', user.uid);
          batch.update(userRef, { 
            teamId: team.id,
            teamName: team.name
          });
          batchCount++;
          updatedUsers++;
          
          if (batchCount >= 490) {
            await batch.commit();
            batchCount = 0;
          }
        }
      }
      
      if (batchCount > 0) {
        await batch.commit();
      }
      
      return updatedUsers;
    } catch (e) {
      console.error('Error shuffling teams:', e);
      return 0;
    }
  }

  public updateGameState(newState: Partial<GameState>): Promise<void> {
    const updated: GameState = { ...this.cachedGameState, ...newState, last_updated: Date.now() };
    this.cachedGameState = updated;
    this.saveLocalState();
    this.notifyStateListeners();
    this.notifyResponseListeners();
    if (this.broadcastChannel) this.broadcastChannel.postMessage({ type: 'GAME_STATE_UPDATE', payload: updated });
    
    if (this.db && this.isFirebaseConnected) {
      if (!this.gameStateUpdatePromise) {
        this.gameStateUpdatePromise = new Promise<void>((resolve) => {
          this.gameStateUpdateResolve = resolve;
        });
      }

      if (this.updateGameStateTimeout) {
        clearTimeout(this.updateGameStateTimeout);
      }

      const p = this.gameStateUpdatePromise;
      
      this.updateGameStateTimeout = setTimeout(async () => {
        try {
          const cleaned = this.removeUndefined(this.cachedGameState);
          await setDoc(doc(this.db!, 'game_state', 'current'), cleaned);
        } catch (err) {
          console.error('Failed to set game_state in Firestore:', err);
        } finally {
          const resolve = this.gameStateUpdateResolve;
          this.gameStateUpdatePromise = null;
          this.gameStateUpdateResolve = null;
          this.updateGameStateTimeout = null;
          if (resolve) resolve();
        }
      }, 300); // 300ms debounce
      
      return p;
    }
    
    return Promise.resolve();
  }

  // Danh sách từ cấm cơ bản
  private readonly FORBIDDEN_WORDS = [
    'đụ', 'đù', 'cặc', 'lồn', 'buồi', 'đĩ', 'chó', 'điếm', 'phò', 'ngu',
    'fuck', 'shit', 'bitch', 'asshole', 'cút', 'địt', 'đéo', 'vcl', 'đm'
  ];

  private checkAndFilterSpam(text: string): { isSpam: boolean, filteredText: string } {
    if (!text) return { isSpam: false, filteredText: text };
    let filteredText = text;
    let isSpam = false;
    
    // 1. Lọc từ cấm
    this.FORBIDDEN_WORDS.forEach(word => {
      const regex = new RegExp(word, 'gi');
      if (regex.test(filteredText)) {
        isSpam = true;
        filteredText = filteredText.replace(regex, '***');
      }
    });

    // 2. Lọc spam ký tự lặp lại (ví dụ: aaaaa, 11111) hoặc quá dài vô nghĩa
    if (/(.)\1{4,}/.test(text)) {
      isSpam = true;
      filteredText = '*** SPAM ***';
    }

    return { isSpam, filteredText };
  }

  public async submitResponse(questionId: string, uid: string, response: UserResponse): Promise<void> {
    if (!this.cachedResponses[questionId]) this.cachedResponses[questionId] = {};

    let processedResponse = { ...response };
    const currentRoundType = this.cachedGameState.round_type;
    const isTextEntry = currentRoundType === 'SHORT_ANSWER' || currentRoundType === 'FILL_IN_BLANK' || currentRoundType === 'VCNV';
    
    if (isTextEntry && processedResponse.choice) {
      const { isSpam, filteredText } = this.checkAndFilterSpam(processedResponse.choice);
      processedResponse.choice = filteredText;
      
      if (isSpam) {
        if (!this.spamCounters[questionId]) this.spamCounters[questionId] = 0;
        this.spamCounters[questionId]++;
        
        // Cảnh báo Admin nếu có quá nhiều câu trả lời spam/vi phạm (ngưỡng = 5)
        if (this.spamCounters[questionId] === 5) {
          this.adminAlertListeners.forEach(cb => cb('Hệ thống Auto-Moderation phát hiện nhiều câu trả lời điền từ có dấu hiệu spam hoặc vi phạm từ ngữ ở câu hỏi hiện tại. Vui lòng kiểm tra!'));
          if (this.broadcastChannel) {
            this.broadcastChannel.postMessage({ type: 'ADMIN_ALERT', payload: 'Hệ thống Auto-Moderation phát hiện nhiều câu trả lời điền từ có dấu hiệu spam hoặc vi phạm từ ngữ ở câu hỏi hiện tại. Vui lòng kiểm tra!' });
          }
          this.logActivity(
            'SYSTEM_ALERT', 
            'Auto-Moderation', 
            `Đã đạt ngưỡng 5 câu trả lời vi phạm/spam ở câu hỏi ${questionId}.`, 
            { questionId, spamCount: this.spamCounters[questionId] }
          );
        }
      }
    }

    const isNewResponse = !this.cachedResponses[questionId][uid];
    this.cachedResponses[questionId][uid] = processedResponse;
    this.saveLocalResponses();
    this.notifyResponseListeners();
    if (this.broadcastChannel) this.broadcastChannel.postMessage({ type: 'RESPONSE_ADDED', payload: { questionId, uid, response: processedResponse } });
        
    if (this.db && this.isFirebaseConnected) {
      try {
        await setDoc(doc(this.db, 'responses', `${questionId}_${uid}`), this.removeUndefined({ questionId, uid, response: processedResponse }));
        if (isNewResponse) {
          const userName = processedResponse.user_info?.name || 'Khán giả';
          this.logActivity('QUESTION_SUBMITTED', 'Gửi câu trả lời', `${userName} đã gửi đáp án cho câu hỏi ${questionId}.`, { questionId, uid, choice: processedResponse.choice });
        }
      } catch (err) { console.error('Failed to submit response to Firestore:', err); }
    }
  }

  public async sendPresencePing(userInfo: UserInfo): Promise<void> {
    const { uid, name, mssv } = userInfo;
    if (!uid) return;
    const now = Date.now();
    const isNew = !this.cachedPresence[uid] || !this.cachedPresence[uid].online;
    this.cachedPresence[uid] = { online: true, last_active: now, name: name || '', mssv: mssv || '' };
    this.saveLocalPresence();
    this.notifyPresenceListeners();
    if (this.broadcastChannel) this.broadcastChannel.postMessage({ type: 'PRESENCE_PING', payload: { uid, info: { name: name || '', mssv: mssv || '' } } });
    
    if (this.db && this.isFirebaseConnected) {
      try {
        await setDoc(doc(this.db, 'presence', uid), this.removeUndefined({ online: true, last_active: now, name: name || '', mssv: mssv || '' }), { merge: true });
        if (isNew) {
          this.logActivity('USER_JOINED', 'Khán giả tham gia', `${name || 'Khán giả'} (${mssv || 'Khách'}) đã tham gia hoặc kết nối lại.`, { uid, name: name || '', mssv: mssv || '' });
        }
      } catch {}
    }
  }

  // --- QR Scan Tracking, History & Hourly Trends Analytics ---

  public notifyScanEventListeners() {
    const { hourlyData, metrics } = this.computeHourlyScanData(this.cachedScanEvents, 'today');
    this.scanEventsListeners.forEach(listener => {
      try {
        listener(this.cachedScanEvents, hourlyData, metrics);
      } catch (e) {
        console.warn('Error in scanEventListener:', e);
      }
    });
  }

  public subscribeToScanEvents(
    callback: (events: QrScanEvent[], hourlyData: HourlyScanDataPoint[], metrics: QrScanTrendMetrics) => void
  ): () => void {
    this.scanEventsListeners.add(callback);
    const { hourlyData, metrics } = this.computeHourlyScanData(this.cachedScanEvents, 'today');
    callback(this.cachedScanEvents, hourlyData, metrics);
    return () => {
      this.scanEventsListeners.delete(callback);
    };
  }

  public getScanEvents(): QrScanEvent[] {
    return this.cachedScanEvents;
  }

  public generateSeedScanEvents(count: number = 42): QrScanEvent[] {
    const now = Date.now();
    const today = new Date(now);
    const currentHour = today.getHours();
    const events: QrScanEvent[] = [];

    // Distribution profile over today's hours: morning warm-up, pre-game peak, active rounds
    const weights = [
      0, 0, 0, 0, 0, 0, 1, 2, // 00:00 - 07:00 (minimal)
      5, 12, 18, 14, 8, 6, // 08:00 - 13:00 (peak morning/noon arrival)
      10, 16, 20, 24, 18, 12, // 14:00 - 19:00 (evening main tournament peak)
      8, 4, 2, 1 // 20:00 - 23:00
    ];

    const sources = ['mobile_qr', 'mobile_qr', 'audience_link', 'mobile_qr', 'admin_test'];
    const devices = ['iOS Safari', 'Android Chrome', 'Mobile Web', 'iOS Chrome'];

    let eventIdx = 0;
    const maxHour = Math.min(23, Math.max(8, currentHour));

    // Allocate counts across hours proportionally
    for (let h = 0; h <= maxHour; h++) {
      const weight = weights[h] || 1;
      const hourScans = Math.max(0, Math.round((weight / 150) * count));
      
      for (let s = 0; s < hourScans; s++) {
        if (eventIdx >= count) break;
        const minute = getSecureRandomInt(0, 57);
        const sec = getSecureRandomInt(0, 57);
        const eventDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), h, minute, sec);
        const timestamp = eventDate.getTime();
        if (timestamp > now) continue;

        const hoursStr = `${String(h).padStart(2, '0')}:00`;
        const dayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}`;
        
        events.push({
          id: `seed_scan_${h}_${s}_${eventIdx}`,
          timestamp,
          timestamp_iso: eventDate.toISOString(),
          hour_key: `${dayStr} ${hoursStr}`,
          hour_number: h,
          day_str: dayStr,
          source: sources[eventIdx % sources.length],
          device_type: devices[eventIdx % devices.length],
          round_context: h >= 14 ? 'Vòng 2: Vượt Chướng Ngại Vật' : 'Vòng 1: Khởi Động Trực Tiếp'
        });
        eventIdx++;
      }
    }

    // Ensure we sort chronologically
    events.sort((a, b) => a.timestamp - b.timestamp);
    return events;
  }

  public computeHourlyScanData(
    eventsList: QrScanEvent[] = this.cachedScanEvents,
    timeRange: 'today' | 'last12h' | 'all' = 'today'
  ): { hourlyData: HourlyScanDataPoint[]; metrics: QrScanTrendMetrics } {
    const now = Date.now();
    const today = new Date(now);
    const currentHour = today.getHours();
    
    // Ensure we have data points for all 24 hours of today
    let effectiveEvents = eventsList;
    if (effectiveEvents.length === 0 && Number(this.cachedGameState.qr_scan_count) > 0) {
      effectiveEvents = this.generateSeedScanEvents(Number(this.cachedGameState.qr_scan_count) || 35);
    }

    const hourlyMap: Record<number, { count: number; sources: Record<string, number> }> = {};
    for (let h = 0; h < 24; h++) {
      hourlyMap[h] = { count: 0, sources: {} };
    }

    effectiveEvents.forEach(evt => {
      const evtDate = new Date(evt.timestamp);
      // If filtering today, check date match
      if (timeRange === 'today') {
        if (
          evtDate.getDate() === today.getDate() &&
          evtDate.getMonth() === today.getMonth() &&
          evtDate.getFullYear() === today.getFullYear()
        ) {
          const h = evtDate.getHours();
          if (hourlyMap[h]) {
            hourlyMap[h].count += 1;
            const src = evt.source || 'mobile_qr';
            hourlyMap[h].sources[src] = (hourlyMap[h].sources[src] || 0) + 1;
          }
        }
      } else {
        const h = evtDate.getHours();
        if (hourlyMap[h]) {
          hourlyMap[h].count += 1;
          const src = evt.source || 'mobile_qr';
          hourlyMap[h].sources[src] = (hourlyMap[h].sources[src] || 0) + 1;
        }
      }
    });

    let peakCount = 0;
    let peakHourNum = currentHour;
    Object.entries(hourlyMap).forEach(([hStr, data]) => {
      if (data.count > peakCount) {
        peakCount = data.count;
        peakHourNum = Number(hStr);
      }
    });

    let cumulative = 0;
    const hourlyData: HourlyScanDataPoint[] = [];

    // Filter hours depending on range
    let startHour = 0;
    let endHour = 23;
    if (timeRange === 'last12h') {
      startHour = Math.max(0, currentHour - 11);
      endHour = Math.min(23, currentHour + 1);
    }

    for (let h = startHour; h <= endHour; h++) {
      const entry = hourlyMap[h] || { count: 0, sources: {} };
      cumulative += entry.count;
      const hourStr = `${String(h).padStart(2, '0')}:00`;
      
      hourlyData.push({
        hour: hourStr,
        displayLabel: `${hourStr}${h === currentHour ? ' (Hiện tại)' : ''}`,
        hourNumber: h,
        scans: entry.count,
        cumulativeScans: cumulative,
        isCurrentHour: h === currentHour,
        peakRatio: peakCount > 0 ? Math.round((entry.count / peakCount) * 100) : 0,
        sources: entry.sources
      });
    }

    const totalScans = Math.max(
      effectiveEvents.length,
      hourlyData.reduce((acc, curr) => acc + curr.scans, 0),
      Number(this.cachedGameState.qr_scan_count) || 0
    );

    const activeHours = hourlyData.filter(d => d.scans > 0);
    const avgPerHour = activeHours.length > 0 ? Math.round(totalScans / activeHours.length) : 0;
    const currentHourScans = hourlyMap[currentHour]?.count || 0;
    const prevHourScans = currentHour > 0 ? (hourlyMap[currentHour - 1]?.count || 0) : 0;
    
    let velocityTrend: 'UP' | 'DOWN' | 'STABLE' = 'STABLE';
    if (currentHourScans > prevHourScans) velocityTrend = 'UP';
    else if (currentHourScans < prevHourScans) velocityTrend = 'DOWN';

    const peakHourFormatted = `${String(peakHourNum).padStart(2, '0')}:00 - ${String((peakHourNum + 1) % 24).padStart(2, '0')}:00`;

    const metrics: QrScanTrendMetrics = {
      totalScans,
      peakHour: peakHourFormatted,
      peakCount,
      avgPerHour,
      currentHourScans,
      activeHoursCount: activeHours.length,
      velocityTrend
    };

    return { hourlyData, metrics };
  }

  public async recordQrScan(source: string = 'qr', deviceType?: string): Promise<void> {
    const current = Number(this.cachedGameState.qr_scan_count) || 0;
    const now = Date.now();
    const d = new Date(now);
    const hoursStr = `${String(d.getHours()).padStart(2, '0')}:00`;
    const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
    
    const newScanEvent: QrScanEvent = {
      id: getSecureRandomId(`scan_${now}_`, 7),
      timestamp: now,
      timestamp_iso: d.toISOString(),
      hour_key: `${dayStr} ${hoursStr}`,
      hour_number: d.getHours(),
      day_str: dayStr,
      source: source || 'mobile_qr',
      device_type: deviceType || (typeof navigator !== 'undefined' && /mobile/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'),
      round_context: this.cachedGameState.round_name || 'BTI 2026'
    };

    this.cachedScanEvents = [...this.cachedScanEvents, newScanEvent];
    this.saveLocalScanEvents();
    this.notifyScanEventListeners();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'QR_SCAN_EVENT_ADDED',
          payload: newScanEvent
        });
      } catch (e) {}
    }

    await this.updateGameState({
      qr_scan_count: current + 1,
      last_scan_at: now,
    });

    if (this.db && this.isFirebaseConnected) {
      try {
        await addDoc(collection(this.db, 'qr_scans'), newScanEvent);
      } catch (err) {
        console.warn('Failed to record QR scan document in Firestore:', err);
      }
    }

    this.logActivity('QR_SCANNED', 'Khán giả quét QR', `Ghi nhận 1 lượt quét QR mới (${source}). Tổng cộng: ${current + 1} lượt.`, { source, count: current + 1, scanEvent: newScanEvent });
  }

  public async resetQrScanCount(): Promise<void> {
    this.cachedScanEvents = [];
    this.saveLocalScanEvents();
    this.notifyScanEventListeners();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'QR_SCAN_EVENTS_CLEARED',
          payload: { timestamp: Date.now() }
        });
      } catch (e) {}
    }

    await this.updateGameState({
      qr_scan_count: 0,
      last_scan_at: 0,
    });

    if (this.db && this.isFirebaseConnected) {
      try {
        const querySnapshot = await getDocs(collection(this.db, 'qr_scans'));
        querySnapshot.forEach(async (docSnap) => {
          await deleteDoc(docSnap.ref);
        });
      } catch (err) {
        console.warn('Failed to clear qr_scans collection in Firestore:', err);
      }
    }

    this.logActivity('QR_RESET', 'Đặt lại bộ đếm QR & Lịch sử xu hướng', 'Admin đã đặt lại bộ đếm số lượt quét QR về 0.');
  }

  public async adjustQrScanCount(delta: number): Promise<void> {
    const current = Number(this.cachedGameState.qr_scan_count) || 0;
    const updated = Math.max(0, current + delta);
    const now = Date.now();

    if (delta > 0) {
      const addedEvents: QrScanEvent[] = [];
      const d = new Date(now);
      const hoursStr = `${String(d.getHours()).padStart(2, '0')}:00`;
      const dayStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

      for (let i = 0; i < delta; i++) {
        const evt: QrScanEvent = {
          id: getSecureRandomId(`manual_scan_${now}_${i}_`, 6),
          timestamp: now + i * 50,
          timestamp_iso: new Date(now + i * 50).toISOString(),
          hour_key: `${dayStr} ${hoursStr}`,
          hour_number: d.getHours(),
          day_str: dayStr,
          source: 'admin_test',
          device_type: 'Simulator',
          round_context: this.cachedGameState.round_name || 'BTI 2026'
        };
        addedEvents.push(evt);

        if (this.db && this.isFirebaseConnected) {
          try {
            addDoc(collection(this.db, 'qr_scans'), evt);
          } catch (e) {}
        }
      }

      this.cachedScanEvents = [...this.cachedScanEvents, ...addedEvents];
      this.saveLocalScanEvents();
      this.notifyScanEventListeners();
    } else if (delta < 0 && this.cachedScanEvents.length > 0) {
      const removeCount = Math.min(this.cachedScanEvents.length, Math.abs(delta));
      this.cachedScanEvents = this.cachedScanEvents.slice(0, this.cachedScanEvents.length - removeCount);
      this.saveLocalScanEvents();
      this.notifyScanEventListeners();
    }

    await this.updateGameState({
      qr_scan_count: updated,
      last_scan_at: delta > 0 ? now : this.cachedGameState.last_scan_at,
    });
  }

  public async generateSampleScanHistory(targetCount: number = 65): Promise<void> {
    const seedEvents = this.generateSeedScanEvents(targetCount);
    this.cachedScanEvents = seedEvents;
    this.saveLocalScanEvents();
    this.notifyScanEventListeners();

    await this.updateGameState({
      qr_scan_count: seedEvents.length,
      last_scan_at: Date.now()
    });

    if (this.db && this.isFirebaseConnected) {
      try {
        // Upload batch of seed events
        const recentSeed = seedEvents.slice(-20);
        for (const evt of recentSeed) {
          await addDoc(collection(this.db, 'qr_scans'), evt);
        }
      } catch (e) {
        console.warn('Failed to seed qr_scans to Firestore:', e);
      }
    }

    this.logActivity(
      'ADMIN_CONTROL', 
      'Tạo dữ liệu xu hướng quét mẫu', 
      `Admin đã khởi tạo bộ dữ liệu phân bổ ${seedEvents.length} lượt quét theo từng khung giờ trong ngày.`
    );
  }

  // --- QR Code History (Last 5 Generated Configurations) ---
  public async pushQrHistory(item: QrHistoryItem): Promise<void> {
    const currentHistory = Array.isArray(this.cachedGameState.qr_history) ? [...this.cachedGameState.qr_history] : [];
    
    // Deduplication check: Do not push if identical to the most recent configuration
    if (currentHistory.length > 0) {
      const latest = currentHistory[0];
      if (
        latest.palette === item.palette &&
        latest.size === item.size &&
        latest.transparentBg === item.transparentBg &&
        (latest.caption || '') === (item.caption || '') &&
        latest.url === item.url
      ) {
        return; // Already in history as latest
      }
    }

    // Keep up to 5 most recent QR versions (LIFO)
    const newHistory = [item, ...currentHistory.filter(h => h.id !== item.id)].slice(0, 5);
    await this.updateGameState({
      qr_history: newHistory,
    });
  }

  public async restoreQrHistoryVersion(historyItem: QrHistoryItem): Promise<void> {
    await this.updateGameState({
      qr_color_palette: historyItem.palette,
      qr_code_size: historyItem.size,
      qr_transparent_bg: historyItem.transparentBg,
      qr_custom_caption: historyItem.caption || '',
    });
    this.logActivity(
      'QR_RESTORED', 
      'Khôi phục phiên bản QR', 
      `Khôi phục cấu hình QR từ lịch sử (${historyItem.paletteName || historyItem.palette}, ${historyItem.size}px, ${historyItem.transparentBg ? 'Nền trong suốt' : 'Nền đặc'}).`,
      { historyItem }
    );
  }

  public async clearQrHistory(): Promise<void> {
    await this.updateGameState({
      qr_history: [],
    });
    this.logActivity('QR_RESET', 'Xóa lịch sử QR', 'Admin đã xóa sạch danh sách lịch sử cấu hình QR.');
  }

  public async clearResponses(questionId?: string): Promise<void> {
    if (questionId) delete this.cachedResponses[questionId];
    else this.cachedResponses = {};
    this.saveLocalResponses();
    this.notifyResponseListeners();
    if (this.broadcastChannel) this.broadcastChannel.postMessage({ type: 'RESPONSES_CLEARED', payload: { questionId } });
    
    if (this.db && this.isFirebaseConnected) {
      try {
        const querySnapshot = await getDocs(collection(this.db, 'responses'));
        querySnapshot.forEach(async (docSnap) => {
          if (!questionId || docSnap.data().questionId === questionId) {
            await deleteDoc(docSnap.ref);
          }
        });
      } catch (err) { console.error('Failed to clear responses in Firestore:', err); }
    }
  }

  // --- Emergency Poll Workflow & History Archiving ---
  public computePollHistoryItem(poll: EmergencyPoll): EmergencyPollHistoryItem {
    const responses = this.getEmergencyPollResponses(poll.id);
    const votesList = Object.values(responses);
    const totalVotes = votesList.length;

    const counts: Record<string, number> = {};
    const percentages: Record<string, number> = {};
    
    Object.keys(poll.options || {}).forEach(optKey => {
      counts[optKey] = 0;
      percentages[optKey] = 0;
    });

    votesList.forEach(v => {
      if (v.choice && counts[v.choice] !== undefined) {
        counts[v.choice] = (counts[v.choice] || 0) + 1;
      }
    });

    let highestCount = -1;
    let dominantChoice = 'NONE';
    let isTie = false;

    Object.entries(counts).forEach(([key, count]) => {
      percentages[key] = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
      if (count > highestCount) {
        highestCount = count;
        dominantChoice = key;
        isTie = false;
      } else if (count === highestCount && count > 0) {
        isTie = true;
      }
    });

    if (isTie) {
      dominantChoice = 'EQUAL';
    }

    const countA = counts['A'] || 0;
    const countB = counts['B'] || 0;
    const percentA = percentages['A'] || 0;
    const percentB = percentages['B'] || 0;

    return {
      id: poll.id,
      question: poll.question,
      type: poll.type,
      options: poll.options,
      time_limit: poll.time_limit,
      source_type: poll.source_type,
      source_name: poll.source_name,
      context_note: poll.context_note,
      correct_option: poll.correct_option,
      created_at: poll.created_at,
      completed_at: Date.now(),
      totalVotes,
      countA,
      countB,
      percentA,
      percentB,
      counts,
      percentages,
      dominantChoice,
      round_context: this.cachedGameState.round_name || 'Khảo sát trực tiếp',
      responses
    };
  }

  public async launchEmergencyPoll(pollData: {
    question: string;
    type?: 'YES_NO' | 'TRUE_FALSE' | 'CUSTOM_2' | 'AGREE_DISAGREE' | 'MULTIPLE_CHOICE' | string;
    options?: Record<string, string>;
    time_limit?: number;
    source_type?: 'ADVISOR' | 'CONTESTANT' | 'JURY' | 'AUDIENCE' | 'HOST';
    source_name?: string;
    context_note?: string;
    correct_option?: string;
  }): Promise<void> {
    const existingPoll = this.cachedGameState.emergency_poll;
    let history = [...(this.cachedGameState.emergency_poll_history || [])];

    // If there was an existing active/revealed/locked poll that wasn't archived yet, archive it
    if (existingPoll && existingPoll.status !== 'DISMISSED') {
      const historyItem = this.computePollHistoryItem(existingPoll);
      const existingIdx = history.findIndex(h => h.id === existingPoll.id);
      if (existingIdx >= 0) {
        history[existingIdx] = historyItem;
      } else {
        history = [historyItem, ...history];
      }
    }

    const pollId = `POLL_${Date.now()}`;
    const defaultOptions = 
      pollData.options && Object.keys(pollData.options).length > 0
        ? pollData.options
        : pollData.type === 'TRUE_FALSE'
        ? { A: 'Đúng', B: 'Sai' }
        : pollData.type === 'AGREE_DISAGREE'
        ? { A: 'Đồng ý', B: 'Không đồng ý' }
        : pollData.type === 'MULTIPLE_CHOICE'
        ? { A: 'Lựa chọn A', B: 'Lựa chọn B', C: 'Lựa chọn C', D: 'Lựa chọn D' }
        : { A: 'Có', B: 'Không' };

    const emergencyPoll: EmergencyPoll = {
      id: pollId,
      question: pollData.question.trim(),
      type: pollData.type || 'YES_NO',
      options: defaultOptions,
      status: 'ACTIVE',
      time_limit: pollData.time_limit ?? 20,
      server_start_time: Date.now(),
      created_at: Date.now(),
      source_type: pollData.source_type || 'HOST',
      source_name: pollData.source_name?.trim() || '',
      context_note: pollData.context_note?.trim() || '',
      correct_option: pollData.correct_option?.trim() || undefined
    };

    await this.updateGameState({
      emergency_poll: emergencyPoll,
      emergency_poll_history: history
    });
  }

  public async lockEmergencyPoll(): Promise<void> {
    if (!this.cachedGameState.emergency_poll) return;
    await this.updateGameState({
      emergency_poll: {
        ...this.cachedGameState.emergency_poll,
        status: 'LOCKED'
      }
    });
  }

  public async revealEmergencyPoll(): Promise<void> {
    const poll = this.cachedGameState.emergency_poll;
    if (!poll) return;

    const revealedPoll: EmergencyPoll = {
      ...poll,
      status: 'REVEALED'
    };

    const historyItem = this.computePollHistoryItem(revealedPoll);
    let history = [...(this.cachedGameState.emergency_poll_history || [])];
    const existingIdx = history.findIndex(h => h.id === poll.id);
    if (existingIdx >= 0) {
      history[existingIdx] = historyItem;
    } else {
      history = [historyItem, ...history];
    }

    await this.updateGameState({
      emergency_poll: revealedPoll,
      emergency_poll_history: history
    });
  }

  public async dismissEmergencyPoll(): Promise<void> {
    const poll = this.cachedGameState.emergency_poll;
    if (!poll) return;

    const historyItem = this.computePollHistoryItem(poll);
    let history = [...(this.cachedGameState.emergency_poll_history || [])];
    const existingIdx = history.findIndex(h => h.id === poll.id);
    if (existingIdx >= 0) {
      history[existingIdx] = historyItem;
    } else {
      history = [historyItem, ...history];
    }

    await this.updateGameState({
      emergency_poll: {
        ...poll,
        status: 'DISMISSED'
      },
      emergency_poll_history: history
    });
  }

  public async deletePollFromHistory(pollId: string): Promise<void> {
    const currentHistory = this.cachedGameState.emergency_poll_history || [];
    const updated = currentHistory.filter(h => h.id !== pollId);
    await this.updateGameState({
      emergency_poll_history: updated
    });
  }

  public async clearPollHistory(): Promise<void> {
    await this.updateGameState({
      emergency_poll_history: []
    });
  }

  public getEmergencyPollResponses(pollId?: string): Record<string, UserResponse> {
    const targetPollId = pollId || this.cachedGameState.emergency_poll?.id;
    if (!targetPollId) return {};
    return this.cachedResponses[`EMERGENCY_POLL_${targetPollId}`] || {};
  }

  public getGameState(): GameState {
    return this.cachedGameState;
  }


  public calculateTeamScores(
    allResponses: Record<string, Record<string, UserResponse>>,
    gameState: GameState
  ): Record<string, { total: number; count: number; average: number }> {
    const teamScores: Record<string, { total: number; count: number; average: number }> = {};
    if (!gameState.teams || gameState.teams.length === 0) return teamScores;
    
    // Initialize teams
    gameState.teams.forEach(team => {
      teamScores[team.id] = { total: 0, count: 0, average: 0 };
    });

    const leaderboard = calculateLeaderboard(allResponses, undefined, gameState);

    leaderboard.forEach(player => {
       const teamId = player.teamId;
       if (teamId && teamScores[teamId]) {
         teamScores[teamId].total += player.totalScore;
         teamScores[teamId].count += 1;
       }
    });

    // Calculate averages
    Object.keys(teamScores).forEach(teamId => {
       const ts = teamScores[teamId];
       if (ts.count > 0) {
         ts.average = Math.round(ts.total / ts.count);
       }
    });

    return teamScores;
  }

  public getAllResponses(): Record<string, Record<string, UserResponse>> {
    return this.cachedResponses;
  }

  // --- Notifications ---
  public async sendDirectNotification(uid: string, message: string, title?: string): Promise<void> {
    if (this.db && this.isFirebaseConnected) {
      try {
        await addDoc(collection(this.db, 'notifications', uid, 'messages'), {
          message,
          title: title || 'Thông báo mới',
          timestamp: Date.now(),
          read: false
        });
      } catch (err) { console.error('Failed to send notification', err); }
    }
  }

  public async sendGlobalNotification(
    message: string, 
    title?: string, 
    type: 'URGENT' | 'ALERT' | 'INFO' = 'URGENT'
  ): Promise<void> {
    const notifObj = {
      id: `global_${Date.now()}`,
      message,
      title: title || (type === 'URGENT' ? '🚨 THÔNG BÁO KHẨN' : 'Thông Báo Hệ Thống'),
      type,
      channel: 'global',
      timestamp: Date.now(),
      read: false
    };

    // Notify in-process listeners immediately
    this.globalNotificationListeners.forEach(listener => {
      try { listener(notifObj); } catch (e) {}
    });

    // Broadcast across tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'GLOBAL_NOTIFICATION',
          payload: notifObj
        });
      } catch (err) {}
    }

    // Persist in Firestore
    if (this.db && this.isFirebaseConnected) {
      try {
        await addDoc(collection(this.db, 'notifications', 'global', 'messages'), notifObj);
      } catch (err) { console.error('Failed to send global notification to Firestore', err); }
    }
  }

  public subscribeToAdminAlerts(callback: (msg: string) => void): () => void {
    this.adminAlertListeners.add(callback);
    return () => this.adminAlertListeners.delete(callback);
  }

  public subscribeToGlobalNotificationBroadcast(callback: (notif: any) => void): () => void {
    this.globalNotificationListeners.add(callback);
    return () => {
      this.globalNotificationListeners.delete(callback);
    };
  }

  public subscribeToGlobalNotificationRecall(callback: () => void): () => void {
    this.globalNotificationRecallListeners.add(callback);
    return () => {
      this.globalNotificationRecallListeners.delete(callback);
    };
  }

  public async recallGlobalNotifications(): Promise<void> {
    // 1. Notify in-process recall listeners immediately
    this.globalNotificationRecallListeners.forEach(listener => {
      try { listener(); } catch (e) {}
    });

    // 2. Broadcast recall across tabs/windows
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'CLEAR_GLOBAL_NOTIFICATIONS',
          payload: { timestamp: Date.now() }
        });
      } catch (err) {}
    }

    // 3. Clear announcer overlay marquee in gameState if active
    if (this.cachedGameState.announcer_overlay?.active) {
      await this.updateGameState({
        announcer_overlay: null
      });
    }

    // 4. Mark unread global notification messages in Firestore as read/recalled
    if (this.db && this.isFirebaseConnected) {
      try {
        const q = query(
          collection(this.db, 'notifications', 'global', 'messages'),
          where('read', '==', false)
        );
        const snapshot = await getDocs(q);
        const updates = snapshot.docs.map(docSnap => 
          updateDoc(doc(this.db!, 'notifications', 'global', 'messages', docSnap.id), { 
            read: true,
            recalled: true,
            recalled_at: Date.now()
          })
        );
        await Promise.all(updates);
      } catch (err) {
        console.error('Failed to mark global notifications as recalled in Firestore', err);
      }
    }
  }

  public subscribeToNotifications(uid: string, callback: (notifications: any[]) => void): () => void {
    if (!this.db) return () => {};
    const q = query(collection(this.db, 'notifications', uid, 'messages'), orderBy('timestamp', 'desc'), limit(10));
    return onSnapshot(q, (snapshot) => {
      const notifs: any[] = [];
      snapshot.forEach(docSnap => notifs.push({ id: docSnap.id, ...docSnap.data() }));
      callback(notifs);
    }, (err) => {
      console.warn('Firestore notifications listener error:', err);
    });
  }

  public async markNotificationRead(uid: string, notificationId: string): Promise<void> {
    if (this.db && this.isFirebaseConnected) {
      try {
        await updateDoc(doc(this.db, 'notifications', uid, 'messages', notificationId), { read: true });
      } catch (err) {}
    }
  }

  public getCurrentQuestionResponses(): Record<string, UserResponse> {
    return this.cachedResponses[this.cachedGameState.question_id] || {};
  }

  // --- Realtime Question Likes & Upvotes ---
  public async toggleQuestionLike(questionId: string, uid: string): Promise<{ liked: boolean; count: number }> {
    if (!questionId || !uid) {
      return { liked: false, count: this.getQuestionLikes(questionId) };
    }

    const currentLikesMap = { ...(this.cachedGameState.question_likes || {}) };
    const currentUidsMap = { ...(this.cachedGameState.question_likes_uids || {}) };
    const uidsList = [...(currentUidsMap[questionId] || [])];
    
    const existingIndex = uidsList.indexOf(uid);
    let isNowLiked = false;

    if (existingIndex >= 0) {
      // Unlike
      uidsList.splice(existingIndex, 1);
      isNowLiked = false;
    } else {
      // Like
      uidsList.push(uid);
      isNowLiked = true;
    }

    currentUidsMap[questionId] = uidsList;
    currentLikesMap[questionId] = uidsList.length;

    // Update state locally and sync to listeners without modifying game_state/current
    this.cachedGameState.question_likes = currentLikesMap;
    this.cachedGameState.question_likes_uids = currentUidsMap;
    this.notifyStateListeners();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'QUESTION_LIKES_UPDATED',
          payload: { likes: currentLikesMap, likesUids: currentUidsMap }
        });
      } catch (err) {}
    }

    // Persist in separate Firestore doc if connected
    if (this.db && this.isFirebaseConnected) {
      try {
        await setDoc(doc(this.db, 'question_likes', questionId), {
          question_id: questionId,
          count: uidsList.length,
          uids: uidsList,
          last_updated: Date.now()
        }, { merge: true });
      } catch (err) {
        console.warn('Failed to update question_likes doc in Firestore', err);
      }
    }

    return { liked: isNowLiked, count: uidsList.length };
  }

  public getQuestionLikes(questionId: string): number {
    if (!questionId) return 0;
    return this.cachedGameState.question_likes?.[questionId] || 0;
  }

  public isQuestionLikedByUser(questionId: string, uid?: string): boolean {
    if (!questionId || !uid) return false;
    const uids = this.cachedGameState.question_likes_uids?.[questionId];
    return Array.isArray(uids) && uids.includes(uid);
  }
}

export const syncService = new RealtimeSyncService();
