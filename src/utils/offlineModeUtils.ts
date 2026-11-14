import { useState, useEffect, useCallback } from 'react';

export const OFFLINE_MODE_STORAGE_KEY = 'bti_offline_mode_enabled';
export const OFFLINE_SYNC_QUEUE_KEY = 'bti_offline_sync_queue_v1';
export const OFFLINE_QUIZ_PROGRESS_KEY = 'bti_offline_quiz_progress_v1';
export const OFFLINE_SYNC_META_KEY = 'bti_offline_sync_meta_v1';
export const LEGACY_OFFLINE_QUEUE_KEY = 'bti_offline_queue';

export const OFFLINE_MODE_EVENT = 'bti_offline_mode_changed';
export const OFFLINE_SYNC_STATE_EVENT = 'bti_offline_sync_state_changed';

export type PendingSyncItemType =
  | 'response'
  | 'prediction'
  | 'champion_vote'
  | 'user_profile';

export interface PendingSyncItem {
  id: string;
  dedupeKey: string;
  type: PendingSyncItemType;
  questionId?: string;
  uid: string;
  payload: any;
  savedAt: number;
  attempts: number;
  lastError?: string;
}

export interface QuizProgressSnapshot {
  uid: string;
  questionId: string;
  roundName: string;
  roundType: string;
  answeredQuestionIds: string[];
  lastChoice?: string;
  lastUpdatedAt: number;
  totalSavedAnswers: number;
}

export interface OfflineSyncMeta {
  isSyncing: boolean;
  lastSavedAt: number | null;
  lastSyncedAt: number | null;
  lastSyncError: string | null;
  syncedCountLastRun: number;
}

export interface OfflineSyncState extends OfflineSyncMeta {
  isOfflineMode: boolean;
  pendingCount: number;
  pendingItems: PendingSyncItem[];
  progressByUid: Record<string, QuizProgressSnapshot>;
}

const MAX_PENDING_QUEUE_ITEMS = 500;

export function buildPendingDedupeKey(
  type: PendingSyncItemType,
  uid: string,
  questionId?: string
): string {
  const normalizedUid = (uid || 'anonymous').trim();
  const normalizedQuestion = (questionId || '').trim();
  if (type === 'response' || type === 'prediction') {
    return `${type}:${normalizedQuestion}:${normalizedUid}`;
  }
  return `${type}:${normalizedUid}`;
}

export function upsertPendingSyncItem(
  queue: PendingSyncItem[],
  incoming: Omit<PendingSyncItem, 'attempts' | 'dedupeKey'> & { dedupeKey?: string }
): PendingSyncItem[] {
  const dedupeKey =
    incoming.dedupeKey ||
    buildPendingDedupeKey(incoming.type, incoming.uid, incoming.questionId);

  const nextItem: PendingSyncItem = {
    ...incoming,
    dedupeKey,
    attempts: 0,
    lastError: undefined,
  };

  const filtered = queue.filter((item) => item.dedupeKey !== dedupeKey);
  filtered.push(nextItem);
  filtered.sort((a, b) => a.savedAt - b.savedAt);

  if (filtered.length > MAX_PENDING_QUEUE_ITEMS) {
    return filtered.slice(filtered.length - MAX_PENDING_QUEUE_ITEMS);
  }
  return filtered;
}

export function removeSyncedItemsFromQueue(
  queue: PendingSyncItem[],
  syncedIds: string[]
): PendingSyncItem[] {
  if (!syncedIds || syncedIds.length === 0) return queue;
  const syncedSet = new Set(syncedIds);
  return queue.filter((item) => !syncedSet.has(item.id));
}

export function markFailedSyncItems(
  queue: PendingSyncItem[],
  failuresById: Record<string, string>
): PendingSyncItem[] {
  if (!failuresById || Object.keys(failuresById).length === 0) return queue;
  return queue.map((item) => {
    if (!Object.prototype.hasOwnProperty.call(failuresById, item.id)) {
      return item;
    }
    return {
      ...item,
      attempts: (item.attempts || 0) + 1,
      lastError: failuresById[item.id],
    };
  });
}

export function mergeOfflineProgressSnapshot(
  existing: QuizProgressSnapshot | undefined,
  update: {
    uid: string;
    questionId?: string;
    roundName?: string;
    roundType?: string;
    choice?: string;
    timestamp: number;
  }
): QuizProgressSnapshot {
  const priorIds = Array.isArray(existing?.answeredQuestionIds)
    ? [...existing!.answeredQuestionIds]
    : [];

  const qId = (update.questionId || '').trim();
  if (qId && !priorIds.includes(qId)) {
    priorIds.push(qId);
  }

  return {
    uid: update.uid,
    questionId: qId || existing?.questionId || '',
    roundName: update.roundName || existing?.roundName || '',
    roundType: update.roundType || existing?.roundType || '',
    answeredQuestionIds: priorIds,
    lastChoice: update.choice !== undefined ? update.choice : existing?.lastChoice,
    lastUpdatedAt: Math.max(update.timestamp || 0, existing?.lastUpdatedAt || 0),
    totalSavedAnswers: priorIds.length,
  };
}

export function migrateLegacyOfflineQueue(rawLegacyItems: unknown): PendingSyncItem[] {
  if (!Array.isArray(rawLegacyItems)) return [];
  let result: PendingSyncItem[] = [];
  for (const item of rawLegacyItems) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, any>;
    const questionId = typeof candidate.questionId === 'string' ? candidate.questionId : '';
    const uid =
      typeof candidate.uid === 'string'
        ? candidate.uid
        : typeof candidate.payload?.user_info?.uid === 'string'
        ? candidate.payload.user_info.uid
        : '';
    if (!questionId || !uid || !candidate.payload) continue;

    const savedAt = typeof candidate.savedAt === 'number' ? candidate.savedAt : Date.now();
    const id =
      typeof candidate.id === 'string' && candidate.id.trim()
        ? candidate.id
        : `legacy_${questionId}_${uid}_${savedAt}`;

    result = upsertPendingSyncItem(result, {
      id,
      type: 'response',
      questionId,
      uid,
      payload: { ...candidate.payload, isOfflineSync: true },
      savedAt,
    });
  }
  return result;
}

export type OfflineFallbackDecision = 'SYNC_ONLINE' | 'QUEUE_LOCALLY' | 'FAIL_OFFLINE_DISABLED';

export function resolveOfflineFallbackAction(params: {
  isOfflineModeEnabled: boolean;
  isNetworkConnected: boolean;
}): OfflineFallbackDecision {
  if (params.isNetworkConnected) {
    return 'SYNC_ONLINE';
  }
  return params.isOfflineModeEnabled ? 'QUEUE_LOCALLY' : 'FAIL_OFFLINE_DISABLED';
}

// --- Storage helpers (browser-safe with fallback) ---

const DEFAULT_META: OfflineSyncMeta = {
  isSyncing: false,
  lastSavedAt: null,
  lastSyncedAt: null,
  lastSyncError: null,
  syncedCountLastRun: 0,
};

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

function dispatchSyncStateChanged() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent(OFFLINE_SYNC_STATE_EVENT, { detail: getOfflineSyncState() }));
  } catch {}
}

export function getOfflineModeEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(OFFLINE_MODE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setOfflineModeEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(OFFLINE_MODE_STORAGE_KEY, String(enabled));
  } catch {}
  try {
    window.dispatchEvent(new CustomEvent(OFFLINE_MODE_EVENT, { detail: { enabled } }));
  } catch {}
  dispatchSyncStateChanged();
}

export function getPendingSyncQueue(): PendingSyncItem[] {
  const current = safeReadJson<PendingSyncItem[]>(OFFLINE_SYNC_QUEUE_KEY, []);
  const legacyRaw = safeReadJson<unknown>(LEGACY_OFFLINE_QUEUE_KEY, null);
  if (Array.isArray(legacyRaw) && legacyRaw.length > 0) {
    const migrated = migrateLegacyOfflineQueue(legacyRaw);
    let merged = Array.isArray(current) ? [...current] : [];
    for (const item of migrated) {
      merged = upsertPendingSyncItem(merged, item);
    }
    safeWriteJson(OFFLINE_SYNC_QUEUE_KEY, merged);
    try {
      localStorage.removeItem(LEGACY_OFFLINE_QUEUE_KEY);
    } catch {}
    return merged;
  }
  return Array.isArray(current) ? current : [];
}

export function savePendingSyncQueue(queue: PendingSyncItem[]): void {
  safeWriteJson(OFFLINE_SYNC_QUEUE_KEY, queue);
  dispatchSyncStateChanged();
}

export function enqueuePendingSyncItem(
  item: Omit<PendingSyncItem, 'attempts' | 'dedupeKey'> & { dedupeKey?: string }
): PendingSyncItem[] {
  const current = getPendingSyncQueue();
  const next = upsertPendingSyncItem(current, item);
  safeWriteJson(OFFLINE_SYNC_QUEUE_KEY, next);

  const meta = getOfflineSyncMeta();
  saveOfflineSyncMeta({
    ...meta,
    lastSavedAt: Math.max(item.savedAt || Date.now(), meta.lastSavedAt || 0),
    lastSyncError: null,
  });
  return next;
}

export function getOfflineProgressByUid(): Record<string, QuizProgressSnapshot> {
  const map = safeReadJson<Record<string, QuizProgressSnapshot>>(OFFLINE_QUIZ_PROGRESS_KEY, {});
  return map && typeof map === 'object' ? map : {};
}

export function recordLocalQuizProgress(update: {
  uid: string;
  questionId?: string;
  roundName?: string;
  roundType?: string;
  choice?: string;
  timestamp?: number;
}): QuizProgressSnapshot | null {
  if (!update.uid) return null;
  const map = getOfflineProgressByUid();
  const ts = update.timestamp || Date.now();
  const updated = mergeOfflineProgressSnapshot(map[update.uid], {
    ...update,
    timestamp: ts,
  });
  map[update.uid] = updated;
  safeWriteJson(OFFLINE_QUIZ_PROGRESS_KEY, map);

  const meta = getOfflineSyncMeta();
  saveOfflineSyncMeta({
    ...meta,
    lastSavedAt: Math.max(ts, meta.lastSavedAt || 0),
  });
  return updated;
}

export function getOfflineSyncMeta(): OfflineSyncMeta {
  const parsed = safeReadJson<Partial<OfflineSyncMeta>>(OFFLINE_SYNC_META_KEY, {});
  return {
    isSyncing: Boolean(parsed?.isSyncing),
    lastSavedAt: typeof parsed?.lastSavedAt === 'number' ? parsed.lastSavedAt : null,
    lastSyncedAt: typeof parsed?.lastSyncedAt === 'number' ? parsed.lastSyncedAt : null,
    lastSyncError: typeof parsed?.lastSyncError === 'string' ? parsed.lastSyncError : null,
    syncedCountLastRun: typeof parsed?.syncedCountLastRun === 'number' ? parsed.syncedCountLastRun : 0,
  };
}

export function saveOfflineSyncMeta(meta: OfflineSyncMeta): void {
  safeWriteJson(OFFLINE_SYNC_META_KEY, meta);
  dispatchSyncStateChanged();
}

export function getOfflineSyncState(): OfflineSyncState {
  const pendingItems = getPendingSyncQueue();
  const meta = getOfflineSyncMeta();
  const progressByUid = getOfflineProgressByUid();
  return {
    isOfflineMode: getOfflineModeEnabled(),
    pendingCount: pendingItems.length,
    pendingItems,
    progressByUid,
    ...meta,
  };
}

export function clearOfflineSyncDataForUser(uid?: string): void {
  if (typeof window === 'undefined') return;
  if (!uid) {
    safeWriteJson(OFFLINE_SYNC_QUEUE_KEY, []);
    safeWriteJson(OFFLINE_QUIZ_PROGRESS_KEY, {});
    saveOfflineSyncMeta(DEFAULT_META);
    return;
  }
  const filteredQueue = getPendingSyncQueue().filter((item) => item.uid !== uid);
  safeWriteJson(OFFLINE_SYNC_QUEUE_KEY, filteredQueue);
  const progress = getOfflineProgressByUid();
  delete progress[uid];
  safeWriteJson(OFFLINE_QUIZ_PROGRESS_KEY, progress);
  dispatchSyncStateChanged();
}

export function useOfflineMode() {
  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(() => getOfflineModeEnabled());

  useEffect(() => {
    const handleCustom = (e: Event) => {
      const detail = (e as CustomEvent<{ enabled?: boolean }>).detail;
      if (typeof detail?.enabled === 'boolean') {
        setIsOfflineMode(detail.enabled);
      } else {
        setIsOfflineMode(getOfflineModeEnabled());
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === OFFLINE_MODE_STORAGE_KEY) {
        setIsOfflineMode(e.newValue === 'true');
      }
    };

    window.addEventListener(OFFLINE_MODE_EVENT, handleCustom);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(OFFLINE_MODE_EVENT, handleCustom);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const setOfflineMode = useCallback((enabled: boolean) => {
    setOfflineModeEnabled(enabled);
  }, []);

  return { isOfflineMode, setOfflineMode };
}

export function useOfflineSyncState(): OfflineSyncState {
  const [syncState, setSyncState] = useState<OfflineSyncState>(() => getOfflineSyncState());

  useEffect(() => {
    const refresh = () => setSyncState(getOfflineSyncState());

    const handleStorage = (e: StorageEvent) => {
      if (
        e.key === OFFLINE_MODE_STORAGE_KEY ||
        e.key === OFFLINE_SYNC_QUEUE_KEY ||
        e.key === OFFLINE_QUIZ_PROGRESS_KEY ||
        e.key === OFFLINE_SYNC_META_KEY
      ) {
        refresh();
      }
    };

    window.addEventListener(OFFLINE_MODE_EVENT, refresh);
    window.addEventListener(OFFLINE_SYNC_STATE_EVENT, refresh);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(OFFLINE_MODE_EVENT, refresh);
      window.removeEventListener(OFFLINE_SYNC_STATE_EVENT, refresh);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return syncState;
}
