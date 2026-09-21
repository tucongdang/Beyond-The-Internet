import {
  CheerType,
  CheerLevel,
  CheerEvent,
  CheerIntensityData,
  UserInfo
} from '../types';
import { db } from '../firebase';
import {
  doc,
  collection,
  onSnapshot,
  setDoc,
  increment,
  addDoc,
  serverTimestamp,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { syncService } from './syncService';
import { getSecureRandomId, getSecureRandomItem } from '../utils/cryptoUtils';

const STORAGE_KEY_TOTAL_CHEERS = 'BTI2026_TOTAL_CHEERS';
const CHEER_DECAY_RATE = 0.88; // Decay multiplier per tick (every 250ms)
const ROLLING_WINDOW_MS = 4000; // 4 seconds sliding window

type CheerListener = (data: CheerIntensityData) => void;

class RealtimeCheerService {
  private listeners: Set<CheerListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private recentEvents: CheerEvent[] = [];
  private totalCheers: number = 0;
  private currentIntensity: number = 0; // 0 to 100
  private targetIntensity: number = 0;
  private lastCheerTimestamp: number = 0;
  private comboCounters: Map<string, { count: number; lastTime: number }> = new Map();
  private pendingBatchCount: number = 0;
  private batchFlushTimer: any = null;
  private loopInterval: any = null;
  private lastLoggedLevel: CheerLevel = 'RESTING';

  constructor() {
    this.loadInitialData();
    this.setupBroadcastChannel();
    this.setupFirestoreListener();
    this.startDecayLoop();
  }

  private loadInitialData() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_TOTAL_CHEERS);
        if (saved) {
          this.totalCheers = Math.max(0, parseInt(saved, 10) || 0);
        }
      } catch {}
    }
  }

  private saveTotalCheers() {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_TOTAL_CHEERS, String(this.totalCheers));
      } catch {}
    }
  }

  private setupBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('bti2026_cheer_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'CHEER_EVENT' && payload) {
            this.handleIncomingCheer(payload, false);
          } else if (type === 'RESET_TOTAL_CHEERS') {
            this.totalCheers = 0;
            this.saveTotalCheers();
            this.notifyListeners();
          }
        };
      } catch (err) {
        console.warn('Cheer BroadcastChannel not available', err);
      }
    }
  }

  private setupFirestoreListener() {
    if (!db) return;
    try {
      // 1. Listen to cumulative cheer counter
      onSnapshot(doc(db, 'game_cheer', 'summary'), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (typeof data?.totalCheers === 'number' && data.totalCheers > this.totalCheers) {
            this.totalCheers = data.totalCheers;
            this.saveTotalCheers();
            this.notifyListeners();
          }
        }
      }, (err) => {
        // Silently ignore permission/offline errors in preview
      });

      // 2. Listen to live cheer stream
      const cheerStreamQuery = query(
        collection(db, 'cheer_events'),
        orderBy('timestamp', 'desc'),
        limit(15)
      );

      onSnapshot(cheerStreamQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const now = Date.now();
            // Only process events that happened within the last 6 seconds
            if (data?.timestamp && now - data.timestamp < 6000) {
              const event: CheerEvent = {
                id: change.doc.id,
                type: data.type || 'HEART',
                uid: data.uid || 'anon',
                name: data.name,
                mssv: data.mssv,
                count: data.count || 1,
                combo: data.combo || 1,
                timestamp: data.timestamp
              };
              this.handleIncomingCheer(event, false);
            }
          }
        });
      }, () => {});
    } catch (err) {
      console.warn('Firestore cheer listener error', err);
    }
  }

  private startDecayLoop() {
    if (this.loopInterval) return;
    this.loopInterval = setInterval(() => {
      this.tick();
    }, 150);
  }

  private tick() {
    const now = Date.now();
    // Prune events outside rolling window
    this.recentEvents = this.recentEvents.filter(e => now - e.timestamp < ROLLING_WINDOW_MS);

    // Calculate energy boost from recent events
    // Each recent cheer adds weight based on recency
    let energySum = 0;
    const activeUids = new Set<string>();

    this.recentEvents.forEach(e => {
      activeUids.add(e.uid);
      const ageMs = now - e.timestamp;
      const weight = Math.max(0, 1 - ageMs / ROLLING_WINDOW_MS);
      energySum += (e.count * weight * 6.5);
    });

    // Bonus for multi-user synchronization (collective excitement multiplier)
    const crowdDiversityBonus = Math.min(2.5, 1 + (activeUids.size * 0.15));
    const targetCalc = Math.min(100, Math.round(energySum * crowdDiversityBonus));

    this.targetIntensity = targetCalc;

    // Smooth interpolation towards target
    if (this.currentIntensity < this.targetIntensity) {
      this.currentIntensity = Math.min(100, this.currentIntensity + (this.targetIntensity - this.currentIntensity) * 0.45 + 1);
    } else {
      this.currentIntensity = Math.max(0, this.currentIntensity * CHEER_DECAY_RATE - 0.5);
    }

    if (this.currentIntensity < 0.2) this.currentIntensity = 0;

    this.notifyListeners();
  }

  private handleIncomingCheer(event: CheerEvent, isLocal: boolean) {
    const now = Date.now();
    this.lastCheerTimestamp = now;

    // Avoid duplicate event IDs
    if (!this.recentEvents.some(e => e.id === event.id)) {
      this.recentEvents.unshift(event);
      if (this.recentEvents.length > 40) {
        this.recentEvents = this.recentEvents.slice(0, 40);
      }
    }

    if (isLocal) {
      this.totalCheers += event.count;
      this.saveTotalCheers();

      // Post to local BroadcastChannel
      if (this.broadcastChannel) {
        try {
          this.broadcastChannel.postMessage({
            type: 'CHEER_EVENT',
            payload: event
          });
        } catch {}
      }

      // Buffer batch for Firestore
      this.pendingBatchCount += event.count;
      this.scheduleBatchFlush(event);
    }

    // Immediate excitement kick
    this.currentIntensity = Math.min(100, this.currentIntensity + (event.count * 8) + (event.combo > 5 ? 4 : 0));
    this.notifyListeners();
  }

  private scheduleBatchFlush(sampleEvent: CheerEvent) {
    if (this.batchFlushTimer) return;
    this.batchFlushTimer = setTimeout(async () => {
      this.batchFlushTimer = null;
      const countToFlush = this.pendingBatchCount;
      this.pendingBatchCount = 0;

      if (!db || countToFlush <= 0) return;

      try {
        // 1. Increment global summary count
        await setDoc(doc(db, 'game_cheer', 'summary'), {
          totalCheers: increment(countToFlush),
          lastUpdated: Date.now()
        }, { merge: true });

        // 2. Log recent event sample to collection
        await addDoc(collection(db, 'cheer_events'), {
          type: sampleEvent.type,
          uid: sampleEvent.uid,
          name: sampleEvent.name || 'Khán giả',
          mssv: sampleEvent.mssv || '',
          count: countToFlush,
          combo: sampleEvent.combo,
          timestamp: Date.now()
        });
      } catch (err) {
        // Silently tolerate transient firestore write limits
      }
    }, 400);
  }

  public sendCheer(
    user: Partial<UserInfo> | null,
    type: CheerType = 'HEART',
    count: number = 1
  ): { combo: number; event: CheerEvent } {
    const now = Date.now();
    const uid = user?.uid || getSecureRandomId('guest_', 7);

    // Calculate user combo
    let combo = 1;
    const existing = this.comboCounters.get(uid);
    if (existing && now - existing.lastTime < 1800) {
      combo = existing.count + 1;
    }
    this.comboCounters.set(uid, { count: combo, lastTime: now });

    const event: CheerEvent = {
      id: getSecureRandomId(`cheer_${uid}_${now}_`, 5),
      type,
      uid,
      name: user?.name || 'Khán giả ẩn danh',
      mssv: user?.mssv,
      count,
      combo,
      timestamp: now
    };

    this.handleIncomingCheer(event, true);
    return { combo, event };
  }

  public resetTotalCheers() {
    this.totalCheers = 0;
    this.saveTotalCheers();
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({ type: 'RESET_TOTAL_CHEERS' });
    }
    if (db) {
      setDoc(doc(db, 'game_cheer', 'summary'), {
        totalCheers: 0,
        lastUpdated: Date.now()
      }, { merge: true }).catch(() => {});
    }
    this.notifyListeners();
  }

  public triggerMegaCheer(user?: Partial<UserInfo> | null) {
    for (let i = 0; i < 15; i++) {
      setTimeout(() => {
        const types: CheerType[] = ['HEART', 'FIRE', 'ENERGY', 'CLAP', 'STAR'];
        const randomType = getSecureRandomItem(types);
        this.sendCheer(user || null, randomType, 2);
      }, i * 60);
    }
  }

  public getCurrentIntensityData(): CheerIntensityData {
    const now = Date.now();
    const roundedIntensity = Math.min(100, Math.max(0, Math.round(this.currentIntensity)));

    // Dynamic BPM calculation: 65 resting BPM -> 175 BPM hyper fever pitch
    const restingBpm = 65;
    const maxBpm = 175;
    const bpm = Math.round(restingBpm + ((maxBpm - restingBpm) * (roundedIntensity / 100)));

    const activeUids = new Set<string>();
    let recentCheersSum = 0;
    this.recentEvents.forEach(e => {
      activeUids.add(e.uid);
      recentCheersSum += e.count;
    });

    const cheersPerSec = Math.round((recentCheersSum / (ROLLING_WINDOW_MS / 1000)) * 10) / 10;

    let level: CheerLevel = 'RESTING';
    let levelTitle = 'Điềm tĩnh • Yên ả';
    let colorHex = '#38bdf8'; // Sky blue

    if (roundedIntensity >= 90) {
      level = 'SUPERNOVA';
      levelTitle = '🔥 SIÊU TÂN TINH • BÙNG NỔ!';
      colorHex = '#ec4899'; // Neon Pink / Rose
    } else if (roundedIntensity >= 70) {
      level = 'HIGH_VOLTAGE';
      levelTitle = '⚡ ĐIỆN CAO THẾ • CỰC NHIỆT!';
      colorHex = '#f43f5e'; // Fiery Rose
    } else if (roundedIntensity >= 40) {
      level = 'ENERGETIC';
      levelTitle = '✨ SÔI NỔI • TIẾP LỬA!';
      colorHex = '#fbbf24'; // Amber Gold
    } else if (roundedIntensity >= 15) {
      level = 'WARMING_UP';
      levelTitle = '🌱 KHỞI SẮC • HÒA NHỊP';
      colorHex = '#34d399'; // Emerald
    }

    return {
      intensity: roundedIntensity,
      bpm,
      totalCheers: this.totalCheers,
      recentCheersCount: recentCheersSum,
      activeCheerers: activeUids.size,
      cheersPerSec,
      level,
      levelTitle,
      colorHex,
      lastCheerTimestamp: this.lastCheerTimestamp,
      recentEvents: this.recentEvents.slice(0, 10)
    };
  }

  public subscribe(callback: CheerListener): () => void {
    this.listeners.add(callback);
    callback(this.getCurrentIntensityData());
    return () => {
      this.listeners.delete(callback);
    };
  }

  private notifyListeners() {
    const data = this.getCurrentIntensityData();
    
    if (data.level !== this.lastLoggedLevel) {
      if (data.level === 'SUPERNOVA' && this.lastLoggedLevel !== 'SUPERNOVA') {
        syncService.logActivity('CHEER_PEAK', 'Bùng nổ Cổ vũ', 'Khán giả đang cổ vũ cực kỳ cuồng nhiệt (Cấp độ Siêu Tân Tinh)!', { totalCheers: data.totalCheers, activeCheerers: data.activeCheerers });
      }
      this.lastLoggedLevel = data.level;
    }

    this.listeners.forEach(cb => cb(data));
  }
}

export const cheerService = new RealtimeCheerService();
