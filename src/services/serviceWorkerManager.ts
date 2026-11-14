import { useEffect, useState } from 'react';
import {
  ACTIVE_CACHE_NAMES,
  NON_CRITICAL_CACHE_NAME,
  SHELL_CACHE_NAME,
  SW_BG_SYNC_DB_NAME,
  SW_BG_SYNC_STORE_NAME,
  SW_BG_SYNC_TAG,
  summarizeCachedEntries,
} from '../utils/swCachePolicy';

export interface ServiceWorkerStatus {
  supported: boolean;
  registered: boolean;
  active: boolean;
  controlling: boolean;
  waitingUpdate: boolean;
  totalCached: number;
  cachedFonts: number;
  nonCriticalCached: number;
  shellReady: boolean;
  bgSyncSupported: boolean;
  bgSyncPendingCount: number;
  bgSyncHttpPendingCount: number;
  bgSyncClientPendingCount: number;
  isBgSyncing: boolean;
  lastBgSyncAt: number | null;
  lastBgSyncReplayedCount: number;
  isRefreshing: boolean;
  lastCheckedAt: number | null;
  error: string | null;
}

const isBgSyncFeatureSupported = (): boolean =>
  typeof window !== 'undefined' &&
  'serviceWorker' in navigator &&
  ('SyncManager' in window ||
    (typeof ServiceWorkerRegistration !== 'undefined' &&
      'sync' in ServiceWorkerRegistration.prototype));

const DEFAULT_STATUS: ServiceWorkerStatus = {
  supported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'caches' in window,
  registered: false,
  active: false,
  controlling: false,
  waitingUpdate: false,
  totalCached: 0,
  cachedFonts: 0,
  nonCriticalCached: 0,
  shellReady: false,
  bgSyncSupported: isBgSyncFeatureSupported(),
  bgSyncPendingCount: 0,
  bgSyncHttpPendingCount: 0,
  bgSyncClientPendingCount: 0,
  isBgSyncing: false,
  lastBgSyncAt: null,
  lastBgSyncReplayedCount: 0,
  isRefreshing: false,
  lastCheckedAt: null,
  error: null,
};

let currentStatus: ServiceWorkerStatus = { ...DEFAULT_STATUS };
let currentRegistration: ServiceWorkerRegistration | null = null;
let initStarted = false;
let messageListenerAttached = false;
const listeners = new Set<(status: ServiceWorkerStatus) => void>();
const reconcileCallbacks = new Set<() => Promise<unknown> | void>();

function emitStatus(patch: Partial<ServiceWorkerStatus>) {
  currentStatus = {
    ...currentStatus,
    ...patch,
    lastCheckedAt: Date.now(),
  };
  listeners.forEach((listener) => {
    try {
      listener(currentStatus);
    } catch {
      // Ignore subscriber errors
    }
  });
}

async function postSwMessage<T = any>(
  type: string,
  payload?: any,
  timeoutMs: number = 4000
): Promise<T | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return null;
  const reg = currentRegistration || (await navigator.serviceWorker.ready.catch(() => null));
  const target = reg?.active || navigator.serviceWorker.controller;
  if (!target) return null;

  return new Promise<T | null>((resolve) => {
    const channel = new MessageChannel();
    const timer = window.setTimeout(() => resolve(null), timeoutMs);
    channel.port1.onmessage = (event) => {
      window.clearTimeout(timer);
      resolve((event?.data as T) ?? null);
    };
    try {
      target.postMessage({ type, payload }, [channel.port2]);
    } catch {
      window.clearTimeout(timer);
      resolve(null);
    }
  });
}

async function readLocalBgSyncQueueCountFallback(): Promise<{
  pendingCount: number;
  httpPendingCount: number;
  clientProgressCount: number;
} | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;
  try {
    return await new Promise((resolve) => {
      const req = window.indexedDB.open(SW_BG_SYNC_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(SW_BG_SYNC_STORE_NAME)) {
          const store = db.createObjectStore(SW_BG_SYNC_STORE_NAME, { keyPath: 'id' });
          store.createIndex('dedupeKey', 'dedupeKey', { unique: false });
          store.createIndex('enqueuedAt', 'enqueuedAt', { unique: false });
        }
      };
      req.onsuccess = () => {
        const db = req.result;
        try {
          const tx = db.transaction(SW_BG_SYNC_STORE_NAME, 'readonly');
          const store = tx.objectStore(SW_BG_SYNC_STORE_NAME);
          const getAllReq = store.getAll();
          getAllReq.onsuccess = () => {
            const rows = Array.isArray(getAllReq.result) ? getAllReq.result : [];
            let httpPendingCount = 0;
            let clientProgressCount = 0;
            for (const row of rows) {
              if (row?.kind === 'http-request') httpPendingCount++;
              else clientProgressCount++;
            }
            db.close();
            resolve({
              pendingCount: rows.length,
              httpPendingCount,
              clientProgressCount,
            });
          };
          getAllReq.onerror = () => {
            db.close();
            resolve(null);
          };
        } catch {
          db.close();
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

export async function refreshBgSyncStatus(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  const reply = await postSwMessage<{
    ok?: boolean;
    pendingCount?: number;
    httpPendingCount?: number;
    clientProgressCount?: number;
    lastBgSyncAt?: number | null;
    lastBgSyncReplayedCount?: number;
  }>('GET_BG_SYNC_STATUS', undefined, 2500);

  if (reply && reply.ok) {
    emitStatus({
      bgSyncPendingCount: typeof reply.pendingCount === 'number' ? reply.pendingCount : 0,
      bgSyncHttpPendingCount: typeof reply.httpPendingCount === 'number' ? reply.httpPendingCount : 0,
      bgSyncClientPendingCount:
        typeof reply.clientProgressCount === 'number' ? reply.clientProgressCount : 0,
      lastBgSyncAt:
        typeof reply.lastBgSyncAt === 'number' ? reply.lastBgSyncAt : currentStatus.lastBgSyncAt,
      lastBgSyncReplayedCount:
        typeof reply.lastBgSyncReplayedCount === 'number'
          ? reply.lastBgSyncReplayedCount
          : currentStatus.lastBgSyncReplayedCount,
    });
    return;
  }

  const fallback = await readLocalBgSyncQueueCountFallback();
  if (fallback) {
    emitStatus({
      bgSyncPendingCount: fallback.pendingCount,
      bgSyncHttpPendingCount: fallback.httpPendingCount,
      bgSyncClientPendingCount: fallback.clientProgressCount,
    });
  }
}

export async function inspectCacheApiStatus(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) return;

  try {
    const urls: string[] = [];
    let shellCacheHit = false;
    let nonCriticalCount = 0;

    for (const cacheName of ACTIVE_CACHE_NAMES) {
      const hasCache = await caches.has(cacheName);
      if (!hasCache) continue;

      const cache = await caches.open(cacheName);
      const requests = await cache.keys();
      for (const req of requests) {
        urls.push(req.url);
      }

      if (cacheName === SHELL_CACHE_NAME) {
        const indexMatch = (await cache.match('/index.html')) || (await cache.match('/'));
        if (indexMatch) {
          shellCacheHit = true;
        }
      }

      if (cacheName === NON_CRITICAL_CACHE_NAME) {
        nonCriticalCount = requests.length;
      }
    }

    const summary = summarizeCachedEntries(urls, shellCacheHit, nonCriticalCount);
    emitStatus({
      totalCached: summary.totalCached,
      cachedFonts: summary.cachedFonts,
      nonCriticalCached: summary.nonCriticalCached,
      shellReady: summary.shellReady,
    });
  } catch (err: any) {
    emitStatus({
      error: err?.message || 'Could not inspect Cache API state',
    });
  }
}

function syncRegistrationFlags(reg: ServiceWorkerRegistration | null) {
  if (!reg) return;
  emitStatus({
    registered: true,
    active: Boolean(reg.active),
    controlling: Boolean(navigator.serviceWorker?.controller),
    waitingUpdate: Boolean(reg.waiting),
    bgSyncSupported: Boolean((reg as any).sync) || isBgSyncFeatureSupported(),
    error: null,
  });
}

function runRegisteredReconcilers() {
  reconcileCallbacks.forEach((cb) => {
    try {
      void cb();
    } catch {
      // Ignore callback error
    }
  });
}

function attachSwMessageListener() {
  if (messageListenerAttached || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }
  messageListenerAttached = true;

  navigator.serviceWorker.addEventListener('message', (event) => {
    const data = event.data || {};
    if (data.type === 'SW_BG_SYNC_STATUS' && data.payload) {
      const p = data.payload;
      emitStatus({
        bgSyncPendingCount:
          typeof p.pendingCount === 'number' ? p.pendingCount : currentStatus.bgSyncPendingCount,
        bgSyncHttpPendingCount:
          typeof p.httpPendingCount === 'number'
            ? p.httpPendingCount
            : currentStatus.bgSyncHttpPendingCount,
        bgSyncClientPendingCount:
          typeof p.clientProgressCount === 'number'
            ? p.clientProgressCount
            : currentStatus.bgSyncClientPendingCount,
        lastBgSyncAt: typeof p.lastBgSyncAt === 'number' ? p.lastBgSyncAt : currentStatus.lastBgSyncAt,
        lastBgSyncReplayedCount:
          typeof p.lastBgSyncReplayedCount === 'number'
            ? p.lastBgSyncReplayedCount
            : currentStatus.lastBgSyncReplayedCount,
        isBgSyncing: false,
      });
    } else if (data.type === 'SW_BG_SYNC_RECONCILE_CLIENTS') {
      runRegisteredReconcilers();
    }
  });
}

export function registerReconcileCallback(callback: () => Promise<unknown> | void): () => void {
  reconcileCallbacks.add(callback);
  return () => {
    reconcileCallbacks.delete(callback);
  };
}

export async function registerBackgroundResponseSync(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;
  try {
    const reg = currentRegistration || (await navigator.serviceWorker.ready.catch(() => null));
    if (reg && 'sync' in reg) {
      await (reg as any).sync.register(SW_BG_SYNC_TAG);
      return true;
    }
  } catch {
    // Browser may restrict Background Sync in incognito or non-Chromium engines
  }
  return false;
}

export async function enqueueResponseForBackgroundSync(item: {
  id: string;
  dedupeKey: string;
  payload: any;
  savedAt?: number;
  lastError?: string;
}): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  const reply = await postSwMessage<{ ok?: boolean; pendingCount?: number }>(
    'ENQUEUE_RESPONSE_SYNC',
    item,
    2500
  );
  await registerBackgroundResponseSync();
  if (reply && typeof reply.pendingCount === 'number') {
    emitStatus({
      bgSyncPendingCount: reply.pendingCount,
    });
    return Boolean(reply.ok);
  }
  await refreshBgSyncStatus();
  return Boolean(reply?.ok);
}

export async function resolveBackgroundSyncItems(keys: string[]): Promise<void> {
  if (!keys || keys.length === 0) return;
  const reply = await postSwMessage<{ ok?: boolean; pendingCount?: number }>(
    'RESOLVE_RESPONSE_SYNC_ITEMS',
    { keys },
    2500
  );
  if (reply && typeof reply.pendingCount === 'number') {
    emitStatus({
      bgSyncPendingCount: reply.pendingCount,
      lastBgSyncAt: Date.now(),
    });
  } else {
    await refreshBgSyncStatus();
  }
}

export async function triggerBackgroundResponseSync(): Promise<{
  ok: boolean;
  replayedCount: number;
  failedCount: number;
  pendingCount: number;
}> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return { ok: false, replayedCount: 0, failedCount: 0, pendingCount: 0 };
  }
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    await registerBackgroundResponseSync();
    return {
      ok: false,
      replayedCount: 0,
      failedCount: 0,
      pendingCount: currentStatus.bgSyncPendingCount,
    };
  }

  emitStatus({ isBgSyncing: true });
  try {
    const reply = await postSwMessage<{
      ok?: boolean;
      replayedCount?: number;
      failedCount?: number;
      pendingCount?: number;
    }>('TRIGGER_RESPONSE_SYNC', undefined, 6000);

    await refreshBgSyncStatus();
    emitStatus({ isBgSyncing: false });

    return {
      ok: Boolean(reply?.ok),
      replayedCount: reply?.replayedCount || 0,
      failedCount: reply?.failedCount || 0,
      pendingCount:
        typeof reply?.pendingCount === 'number'
          ? reply.pendingCount
          : currentStatus.bgSyncPendingCount,
    };
  } catch {
    emitStatus({ isBgSyncing: false });
    return {
      ok: false,
      replayedCount: 0,
      failedCount: 1,
      pendingCount: currentStatus.bgSyncPendingCount,
    };
  }
}

export async function initServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') return null;

  const supported = 'serviceWorker' in navigator && 'caches' in window;
  if (!supported) {
    emitStatus({ supported: false });
    return null;
  }

  attachSwMessageListener();

  if (initStarted && currentRegistration) {
    await Promise.all([inspectCacheApiStatus(), refreshBgSyncStatus()]);
    return currentRegistration;
  }
  initStarted = true;

  const register = async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      currentRegistration = reg;
      syncRegistrationFlags(reg);

      reg.addEventListener('updatefound', () => {
        const installing = reg.installing;
        if (!installing) return;
        installing.addEventListener('statechange', () => {
          syncRegistrationFlags(reg);
          if (installing.state === 'activated') {
            void inspectCacheApiStatus();
            void refreshBgSyncStatus();
          }
        });
      });

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        syncRegistrationFlags(currentRegistration);
        void inspectCacheApiStatus();
        void refreshBgSyncStatus();
      });

      window.addEventListener('online', () => {
        void triggerBackgroundResponseSync();
      });

      await navigator.serviceWorker.ready;
      syncRegistrationFlags(reg);
      await Promise.all([inspectCacheApiStatus(), refreshBgSyncStatus()]);
      return reg;
    } catch (err: any) {
      emitStatus({
        registered: false,
        error: err?.message || 'Service Worker registration failed',
      });
      return null;
    }
  };

  if (document.readyState === 'complete') {
    return register();
  }

  return new Promise((resolve) => {
    window.addEventListener(
      'load',
      () => {
        void register().then(resolve);
      },
      { once: true }
    );
  });
}

export async function refreshOfflineAssetCache(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return false;

  emitStatus({ isRefreshing: true, error: null });
  try {
    const reply = await postSwMessage<{ ok?: boolean }>('REFRESH_ESSENTIAL_CACHE', undefined, 5000);
    await Promise.all([inspectCacheApiStatus(), refreshBgSyncStatus()]);
    emitStatus({ isRefreshing: false });
    return Boolean(reply?.ok);
  } catch (err: any) {
    emitStatus({
      isRefreshing: false,
      error: err?.message || 'Cache refresh failed',
    });
    return false;
  }
}

export function applyWaitingServiceWorkerUpdate(): void {
  if (currentRegistration?.waiting) {
    currentRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
  }
}

export function getServiceWorkerStatus(): ServiceWorkerStatus {
  return currentStatus;
}

export function subscribeServiceWorkerStatus(
  listener: (status: ServiceWorkerStatus) => void
): () => void {
  listeners.add(listener);
  listener(currentStatus);
  return () => {
    listeners.delete(listener);
  };
}

export function useServiceWorkerStatus(): ServiceWorkerStatus {
  const [status, setStatus] = useState<ServiceWorkerStatus>(() => getServiceWorkerStatus());

  useEffect(() => {
    const unsub = subscribeServiceWorkerStatus(setStatus);
    void inspectCacheApiStatus();
    void refreshBgSyncStatus();
    return unsub;
  }, []);

  return status;
}
