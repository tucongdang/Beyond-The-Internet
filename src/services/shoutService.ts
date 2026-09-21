import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  limit, 
  getDocs 
} from 'firebase/firestore';
import { db, auth } from '../firebase';
import { AudienceShout, ShoutBadgeColor, ShoutSettings } from '../types';
import { getSecureRandomId } from '../utils/cryptoUtils';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid || null,
      email: auth?.currentUser?.email || null,
      emailVerified: auth?.currentUser?.emailVerified || null,
      isAnonymous: auth?.currentUser?.isAnonymous || null,
      tenantId: auth?.currentUser?.tenantId || null,
      providerInfo: auth?.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Shout Error: ', JSON.stringify(errInfo));
}

const STORAGE_KEY_SHOUTS = 'BTI2026_AUDIENCE_SHOUTS';
const STORAGE_KEY_LAST_SHOUT_TIME = 'BTI2026_LAST_SHOUT_TIMESTAMP';

export const DEFAULT_SHOUT_SETTINGS: ShoutSettings = {
  is_open: true,
  max_chars: 70,
  cooldown_sec: 6,
  marquee_speed: 'normal',
  allow_marquee: true,
  require_approval: false
};

// Preset quick shout suggestions for gameshow audience
export const POPULAR_SHOUT_PRESETS = [
  { text: 'BTI 2026 đỉnh chóp! 🔥', emoji: '🔥', color: 'pink' as ShoutBadgeColor },
  { text: 'Cố lên cả nhà ơi! 💪', emoji: '💪', color: 'emerald' as ShoutBadgeColor },
  { text: 'Câu này gài bẫy rồi! 🧠', emoji: '🧠', color: 'purple' as ShoutBadgeColor },
  { text: 'Quá nhanh quá nguy hiểm! ⚡', emoji: '⚡', color: 'amber' as ShoutBadgeColor },
  { text: 'Tự tin 100 điểm về tay! 🏆', emoji: '🏆', color: 'cyan' as ShoutBadgeColor },
  { text: 'Hồi hộp từng giây luôn 🎉', emoji: '🎉', color: 'blue' as ShoutBadgeColor },
  { text: 'Ủng hộ đội nhà hết mình ❤️', emoji: '❤️', color: 'pink' as ShoutBadgeColor },
  { text: 'Đỉnh nóc kịch trần bay phấp phới 🚀', emoji: '🚀', color: 'purple' as ShoutBadgeColor }
];

export const SHOUT_EMOJIS = ['🔥', '🎉', '🚀', '💡', '👏', '🏆', '❤️', '⚡', '🤩', '🎯', '💯', '🙌'];

export const SHOUT_BADGE_COLORS: Record<ShoutBadgeColor, {
  name: string;
  bg: string;
  border: string;
  text: string;
  glow: string;
  tagClass: string;
}> = {
  purple: {
    name: 'Tím Hoàng Gia',
    bg: 'bg-purple-900/60',
    border: 'border-purple-500/50',
    text: 'text-purple-200',
    glow: 'rgba(168, 85, 247, 0.3)',
    tagClass: 'from-purple-600 to-indigo-600 text-white'
  },
  cyan: {
    name: 'Cyan Laser',
    bg: 'bg-cyan-950/60',
    border: 'border-cyan-500/50',
    text: 'text-cyan-200',
    glow: 'rgba(6, 182, 212, 0.3)',
    tagClass: 'from-cyan-600 to-blue-600 text-white'
  },
  pink: {
    name: 'Hồng Cyber',
    bg: 'bg-rose-950/60',
    border: 'border-rose-500/50',
    text: 'text-rose-200',
    glow: 'rgba(244, 63, 94, 0.3)',
    tagClass: 'from-pink-600 to-rose-600 text-white'
  },
  emerald: {
    name: 'Lục Bảo Ngọc',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-500/50',
    text: 'text-emerald-200',
    glow: 'rgba(16, 185, 129, 0.3)',
    tagClass: 'from-emerald-600 to-teal-600 text-white'
  },
  amber: {
    name: 'Vàng Kim Quang',
    bg: 'bg-amber-950/60',
    border: 'border-amber-500/50',
    text: 'text-amber-200',
    glow: 'rgba(245, 158, 11, 0.3)',
    tagClass: 'from-amber-500 to-orange-600 text-slate-950 font-bold'
  },
  blue: {
    name: 'Lam Vũ Trụ',
    bg: 'bg-blue-950/60',
    border: 'border-blue-500/50',
    text: 'text-blue-200',
    glow: 'rgba(59, 130, 246, 0.3)',
    tagClass: 'from-blue-600 to-sky-600 text-white'
  }
};

type ShoutListener = (shouts: AudienceShout[]) => void;

class RealtimeShoutService {
  private shouts: AudienceShout[] = [];
  private listeners: Set<ShoutListener> = new Set();
  private broadcastChannel: BroadcastChannel | null = null;
  private unsubscribeFirestore: (() => void) | null = null;
  private settings: ShoutSettings = DEFAULT_SHOUT_SETTINGS;

  constructor() {
    this.loadFromStorage();
    this.setupBroadcastChannel();
    this.initFirestoreListener();
  }

  private setupBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        this.broadcastChannel = new BroadcastChannel('bti2026_shout_channel');
        this.broadcastChannel.onmessage = (event) => {
          const { type, payload } = event.data || {};
          if (type === 'SHOUT_ADDED' && payload) {
            this.handleIncomingShout(payload);
          } else if (type === 'SHOUT_LIKED' && payload) {
            const { shoutId, likes, liked_by } = payload;
            this.updateShoutLikesLocal(shoutId, likes, liked_by);
          } else if (type === 'SHOUT_REMOVED' && payload?.shoutId) {
            this.shouts = this.shouts.filter(s => s.id !== payload.shoutId);
            this.saveToStorage();
            this.notifyListeners();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel not supported for shouts', e);
      }
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY_SHOUTS);
      if (stored) {
        this.shouts = JSON.parse(stored);
      } else {
        // Seed a few initial welcome shouts for exciting live atmosphere
        const now = Date.now();
        this.shouts = [
          {
            id: 'shout_seed_1',
            uid: 'system_host',
            sender_name: 'MC Sân Khấu',
            sender_mssv: 'HOST',
            text: 'Chào mừng tất cả khán giả đến với Beyond The Internet 2026!',
            emoji: '🎉',
            color: 'amber',
            timestamp: now - 35000,
            timestamp_iso: new Date(now - 35000).toISOString(),
            likes: 42,
            liked_by: [],
            is_pinned: true,
            status: 'ACTIVE'
          },
          {
            id: 'shout_seed_2',
            uid: 'seed_u1',
            sender_name: 'Minh Hoàng',
            sender_mssv: '2212****',
            text: 'Cố lên đội A ơi, câu 3 đỉnh quá! 🔥',
            emoji: '🔥',
            color: 'pink',
            timestamp: now - 18000,
            timestamp_iso: new Date(now - 18000).toISOString(),
            likes: 15,
            liked_by: [],
            status: 'ACTIVE'
          },
          {
            id: 'shout_seed_3',
            uid: 'seed_u2',
            sender_name: 'Thu Trang',
            sender_mssv: '2311****',
            text: 'Hội trường hôm nay cháy quá mọi người ơi 🚀',
            emoji: '🚀',
            color: 'cyan',
            timestamp: now - 8000,
            timestamp_iso: new Date(now - 8000).toISOString(),
            likes: 28,
            liked_by: [],
            status: 'ACTIVE'
          }
        ];
        this.saveToStorage();
      }
    } catch (e) {
      console.warn('Failed to load local shouts', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_SHOUTS, JSON.stringify(this.shouts.slice(0, 50)));
    } catch (e) {}
  }

  private initFirestoreListener() {
    if (!db) return;
    try {
      const shoutsRef = collection(db, 'shouts');
      const q = query(shoutsRef, orderBy('timestamp', 'desc'), limit(40));

      this.unsubscribeFirestore = onSnapshot(q, (snapshot) => {
        const remoteShouts: AudienceShout[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data.status !== 'HIDDEN') {
            remoteShouts.push({
              id: docSnap.id,
              uid: data.uid || '',
              sender_name: data.sender_name || 'Khán giả',
              sender_mssv: data.sender_mssv || '',
              sender_avatar: data.sender_avatar || '',
              text: data.text || '',
              emoji: data.emoji || '💬',
              color: data.color || 'purple',
              timestamp: data.timestamp || Date.now(),
              timestamp_iso: data.timestamp_iso || new Date(data.timestamp || Date.now()).toISOString(),
              likes: data.likes || 0,
              liked_by: Array.isArray(data.liked_by) ? data.liked_by : [],
              is_pinned: Boolean(data.is_pinned),
              status: data.status || 'ACTIVE'
            });
          }
        });

        if (remoteShouts.length > 0) {
          // Sort with pinned first, then newest timestamp
          remoteShouts.sort((a, b) => {
            if (a.is_pinned && !b.is_pinned) return -1;
            if (!a.is_pinned && b.is_pinned) return 1;
            return b.timestamp - a.timestamp;
          });
          this.shouts = remoteShouts;
          this.saveToStorage();
          this.notifyListeners();
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.LIST, 'shouts');
      });
    } catch (e) {
      console.warn('Could not initialize Firestore shout listener', e);
    }
  }

  private handleIncomingShout(shout: AudienceShout) {
    if (this.shouts.some(s => s.id === shout.id)) return;
    this.shouts = [shout, ...this.shouts].slice(0, 50);
    this.saveToStorage();
    this.notifyListeners();
  }

  private updateShoutLikesLocal(shoutId: string, likes: number, liked_by: string[]) {
    const idx = this.shouts.findIndex(s => s.id === shoutId);
    if (idx !== -1) {
      this.shouts[idx] = {
        ...this.shouts[idx],
        likes,
        liked_by
      };
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  private notifyListeners() {
    const sorted = [...this.shouts].sort((a, b) => {
      if (a.is_pinned && !b.is_pinned) return -1;
      if (!a.is_pinned && b.is_pinned) return 1;
      return b.timestamp - a.timestamp;
    });
    this.listeners.forEach(cb => {
      try { cb(sorted); } catch (err) {}
    });
  }

  // --- Public APIs ---

  public getShouts(): AudienceShout[] {
    return [...this.shouts];
  }

  public getSettings(): ShoutSettings {
    return this.settings;
  }

  public subscribe(callback: ShoutListener): () => void {
    this.listeners.add(callback);
    callback([...this.shouts]);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public getRemainingCooldownSec(uid: string): number {
    if (typeof window === 'undefined') return 0;
    try {
      const lastTimeStr = localStorage.getItem(`${STORAGE_KEY_LAST_SHOUT_TIME}_${uid}`);
      if (!lastTimeStr) return 0;
      const lastTime = Number(lastTimeStr);
      const elapsedSec = (Date.now() - lastTime) / 1000;
      const remaining = Math.ceil(this.settings.cooldown_sec - elapsedSec);
      return remaining > 0 ? remaining : 0;
    } catch {
      return 0;
    }
  }

  public async sendShout(payload: {
    uid: string;
    sender_name: string;
    sender_mssv?: string;
    sender_avatar?: string;
    text: string;
    emoji?: string;
    color?: ShoutBadgeColor | string;
  }): Promise<{ success: boolean; error?: string; shout?: AudienceShout }> {
    const trimmedText = (payload.text || '').trim();
    if (!trimmedText) {
      return { success: false, error: 'Vui lòng nhập nội dung Hô to' };
    }

    if (trimmedText.length > this.settings.max_chars) {
      return { 
        success: false, 
        error: `Nội dung vượt quá giới hạn cho phép (tối đa ${this.settings.max_chars} ký tự)` 
      };
    }

    // Cooldown verification
    const remainingCooldown = this.getRemainingCooldownSec(payload.uid);
    if (remainingCooldown > 0) {
      return { 
        success: false, 
        error: `Vui lòng đợi ${remainingCooldown} giây trước khi gửi tiếng hô tiếp theo` 
      };
    }

    const now = Date.now();
    const shoutId = getSecureRandomId(`shout_${now}_`, 7);
    
    // Basic Bad Word Filter
    const BAD_WORDS = ['đụ', 'đù', 'cặc', 'lồn', 'địt', 'chó', 'điên', 'ngu', 'fuck', 'shit', 'bitch'];
    let filteredText = trimmedText;
    const lowerText = filteredText.toLowerCase();
    const hasBadWord = BAD_WORDS.some(bw => lowerText.includes(bw));
    if (hasBadWord) {
      BAD_WORDS.forEach(bw => {
        const regex = new RegExp(bw, 'gi');
        filteredText = filteredText.replace(regex, '***');
      });
    }

    // Determine status
    let initialStatus: 'ACTIVE' | 'PENDING' | 'FLAGGED' = 'ACTIVE';
    if (hasBadWord) initialStatus = 'FLAGGED';
    else if (this.settings.require_approval && !payload.uid.startsWith('admin_')) initialStatus = 'PENDING';

    const newShout: AudienceShout = {
      id: shoutId,
      uid: payload.uid,
      sender_name: payload.sender_name.trim().substring(0, 40) || 'Khán giả',
      sender_mssv: payload.sender_mssv?.trim().substring(0, 15) || '',
      sender_avatar: payload.sender_avatar || '',
      text: filteredText,
      emoji: payload.emoji || '🔥',
      color: payload.color || 'purple',
      timestamp: now,
      timestamp_iso: new Date(now).toISOString(),
      likes: 0,
      liked_by: [],
      is_pinned: false,
      status: initialStatus
    };

    // Update local state immediately for instant feedback
    this.handleIncomingShout(newShout);

    // Save cooldown timestamp
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`${STORAGE_KEY_LAST_SHOUT_TIME}_${payload.uid}`, String(now));
      } catch {}
    }

    // Broadcast across browser tabs
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SHOUT_ADDED',
          payload: newShout
        });
      } catch (e) {}
    }

    // Persist to Firestore
    if (db) {
      const path = `shouts/${shoutId}`;
      try {
        await setDoc(doc(db, 'shouts', shoutId), newShout);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, path);
      }
    }

    return { success: true, shout: newShout };
  }

  public async toggleLikeShout(shoutId: string, uid: string): Promise<{ liked: boolean; likes: number }> {
    if (!shoutId || !uid) return { liked: false, likes: 0 };

    const shout = this.shouts.find(s => s.id === shoutId);
    if (!shout) return { liked: false, likes: 0 };

    const likedBy = Array.isArray(shout.liked_by) ? [...shout.liked_by] : [];
    const idx = likedBy.indexOf(uid);
    let isLiked = false;

    if (idx >= 0) {
      likedBy.splice(idx, 1);
      isLiked = false;
    } else {
      likedBy.push(uid);
      isLiked = true;
    }

    const updatedLikes = Math.max(0, likedBy.length);
    this.updateShoutLikesLocal(shoutId, updatedLikes, likedBy);

    // Broadcast like change
    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SHOUT_LIKED',
          payload: { shoutId, likes: updatedLikes, liked_by: likedBy }
        });
      } catch (e) {}
    }

    // Sync to Firestore
    if (db) {
      const path = `shouts/${shoutId}`;
      try {
        await setDoc(doc(db, 'shouts', shoutId), {
          likes: updatedLikes,
          liked_by: likedBy
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }

    return { liked: isLiked, likes: updatedLikes };
  }

  public async pinShout(shoutId: string, isPinned: boolean): Promise<void> {
    const idx = this.shouts.findIndex(s => s.id === shoutId);
    if (idx !== -1) {
      this.shouts[idx].is_pinned = isPinned;
      this.saveToStorage();
      this.notifyListeners();
    }

    if (db) {
      const path = `shouts/${shoutId}`;
      try {
        await setDoc(doc(db, 'shouts', shoutId), {
          is_pinned: isPinned
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  }

  public async updateShoutStatus(shoutId: string, status: 'ACTIVE' | 'HIDDEN' | 'FLAGGED' | 'PENDING'): Promise<void> {
    const shoutIndex = this.shouts.findIndex(s => s.id === shoutId);
    if (shoutIndex > -1) {
      this.shouts[shoutIndex].status = status;
      this.saveToStorage();
      this.notifyListeners();
    }
    
    if (db) {
      const path = `shouts/${shoutId}`;
      try {
        await setDoc(doc(db, 'shouts', shoutId), {
          status: status
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  }

  public async hideShout(shoutId: string): Promise<void> {
    this.shouts = this.shouts.filter(s => s.id !== shoutId);
    this.saveToStorage();
    this.notifyListeners();

    if (this.broadcastChannel) {
      try {
        this.broadcastChannel.postMessage({
          type: 'SHOUT_REMOVED',
          payload: { shoutId }
        });
      } catch (e) {}
    }

    if (db) {
      const path = `shouts/${shoutId}`;
      try {
        await setDoc(doc(db, 'shouts', shoutId), {
          status: 'HIDDEN'
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, path);
      }
    }
  }

  public async clearAllShouts(): Promise<void> {
    this.shouts = [];
    this.saveToStorage();
    this.notifyListeners();

    if (db) {
      try {
        const q = query(collection(db, 'shouts'), limit(100));
        const snapshot = await getDocs(q);
        const deletes = snapshot.docs.map(docSnap => deleteDoc(doc(db, 'shouts', docSnap.id)));
        await Promise.all(deletes);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'shouts');
      }
    }
  }

  public subscribeToSettings(callback: (settings: ShoutSettings) => void): () => void {
    callback(this.settings);
    const interval = setInterval(() => {
      callback(this.settings);
    }, 2000);
    return () => clearInterval(interval);
  }

  public async updateSettings(newSettings: Partial<ShoutSettings>): Promise<void> {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('BTI2026_SHOUT_SETTINGS', JSON.stringify(this.settings));
      } catch {}
    }
  }
}

export const shoutService = new RealtimeShoutService();
