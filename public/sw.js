/* eslint-disable no-restricted-globals */
const SW_CACHE_VERSION = 'v2';
const SHELL_CACHE_NAME = `bti-shell-${SW_CACHE_VERSION}`;
const FONTS_CACHE_NAME = `bti-fonts-${SW_CACHE_VERSION}`;
const ASSETS_CACHE_NAME = `bti-assets-${SW_CACHE_VERSION}`;
const NON_CRITICAL_CACHE_NAME = `bti-noncritical-${SW_CACHE_VERSION}`;
const ACTIVE_CACHE_NAMES = [
  SHELL_CACHE_NAME,
  FONTS_CACHE_NAME,
  ASSETS_CACHE_NAME,
  NON_CRITICAL_CACHE_NAME,
];

const SW_BG_SYNC_TAG = 'bti-response-sync';
const SW_BG_SYNC_DB_NAME = 'bti-sw-bg-sync-v2';
const SW_BG_SYNC_DB_VERSION = 1;
const SW_BG_SYNC_STORE_NAME = 'response_queue';
const SW_NON_CRITICAL_MAX_ENTRIES = 80;
const SW_BG_SYNC_MAX_ITEMS = 250;
const SW_BG_SYNC_MAX_ATTEMPTS = 8;

const ESSENTIAL_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
];

const ESSENTIAL_FONT_URLS = [
  '/fonts/SVN-Gilroy-Medium.otf',
  '/fonts/SVN-Gilroy-SemiBold.otf',
  '/fonts/SVN-Gilroy-Bold.otf',
  '/fonts/SVN-Gilroy-XBold.otf',
  '/fonts/SVN-Gilroy-Black.otf',
  '/fonts/NEXONLv1GothicRegular.ttf',
  '/fonts/NEXONLv1GothicBold.ttf',
  '/fonts/NEXONLv1GothicLight.ttf',
];

const FONT_EXT_RE = /\.(?:otf|ttf|woff2?|eot)$/i;
const CRITICAL_BUNDLE_EXT_RE = /\.(?:js|mjs|css)$/i;
const NON_CRITICAL_EXT_RE = /\.(?:svg|png|jpe?g|webp|avif|gif|ico|json|mp3|wav|ogg|m4a|mp4|webm|pdf)$/i;

const BG_SYNC_RESPONSE_PATH_RE =
  /^\/api\/(?:responses(?:\/|$)|audience\/responses?(?:\/|$)|poll\/responses?(?:\/|$)|survey\/responses?(?:\/|$)|qa\/responses?(?:\/|$))/i;

const BG_SYNC_EXCLUDED_PATH_RE =
  /^\/api\/(?:health|compliance|captcha|admin|audience\/(?:login|register|verify-email|forgot-password|sync-password|activate|resend-activation|google-auth|quick-access|captcha|check-status)|generate-question|gemini-tts|translate-|summarize-|explain-question|mc-copilot|audience-chat|google\/)/i;

let activeSyncPromise = null;
let lastBgSyncAt = null;
let lastBgSyncReplayedCount = 0;

function classifyRequest(request) {
  if (!request || request.method !== 'GET') return 'BYPASS';

  let parsed;
  try {
    parsed = new URL(request.url);
  } catch {
    return 'BYPASS';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'BYPASS';
  if (parsed.origin !== self.location.origin) return 'BYPASS';

  const pathname = parsed.pathname;
  if (pathname.startsWith('/api/') || pathname === '/sw.js') return 'BYPASS';

  if (
    pathname.startsWith('/fonts/') ||
    request.destination === 'font' ||
    FONT_EXT_RE.test(pathname)
  ) {
    return 'CACHE_FIRST_FONT';
  }

  if (
    request.mode === 'navigate' ||
    request.destination === 'document' ||
    pathname === '/' ||
    pathname === '/index.html'
  ) {
    return 'NETWORK_FIRST_HTML';
  }

  if (
    pathname.startsWith('/src/') ||
    pathname.startsWith('/node_modules/') ||
    pathname.startsWith('/@vite/') ||
    pathname.startsWith('/@react-refresh') ||
    pathname.startsWith('/@fs/') ||
    pathname.startsWith('/@id/')
  ) {
    return 'NETWORK_FIRST_DEV_MODULE';
  }

  if (
    pathname.startsWith('/assets/aistudio/') ||
    pathname.startsWith('/locales/') ||
    NON_CRITICAL_EXT_RE.test(pathname) ||
    request.destination === 'image' ||
    request.destination === 'audio' ||
    request.destination === 'video' ||
    request.destination === 'manifest'
  ) {
    return 'STALE_WHILE_REVALIDATE_NON_CRITICAL';
  }

  if (
    pathname.startsWith('/assets/') ||
    CRITICAL_BUNDLE_EXT_RE.test(pathname) ||
    request.destination === 'style' ||
    request.destination === 'script'
  ) {
    return 'STALE_WHILE_REVALIDATE_ASSET';
  }

  return 'BYPASS';
}

function isBackgroundSyncableResponseRequest(request) {
  if (!request) return false;
  const method = (request.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') return false;

  let parsed;
  try {
    parsed = new URL(request.url);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  if (parsed.origin !== self.location.origin) return false;

  const pathname = parsed.pathname;
  if (BG_SYNC_EXCLUDED_PATH_RE.test(pathname)) return false;
  if (BG_SYNC_RESPONSE_PATH_RE.test(pathname)) return true;

  const syncHeader = request.headers.get('x-bti-bg-sync') || '';
  return syncHeader.toLowerCase() === 'response';
}

function shouldRetryResponseStatus(status) {
  if (status === null || status === undefined) return true;
  if (status >= 500) return true;
  return status === 408 || status === 429;
}

function computeBgSyncBackoffMs(attempts) {
  const safeAttempts = Math.max(0, Math.min(6, Math.floor(attempts || 0)));
  return Math.min(60000, 1000 * Math.pow(2, safeAttempts));
}

function openBgSyncDb() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable in Service Worker'));
      return;
    }
    const req = indexedDB.open(SW_BG_SYNC_DB_NAME, SW_BG_SYNC_DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SW_BG_SYNC_STORE_NAME)) {
        const store = db.createObjectStore(SW_BG_SYNC_STORE_NAME, { keyPath: 'id' });
        store.createIndex('dedupeKey', 'dedupeKey', { unique: false });
        store.createIndex('enqueuedAt', 'enqueuedAt', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('Failed to open SW IndexedDB'));
  });
}

async function getAllQueueRecords() {
  const db = await openBgSyncDb();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(SW_BG_SYNC_STORE_NAME, 'readonly');
      const store = tx.objectStore(SW_BG_SYNC_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const rows = Array.isArray(req.result) ? req.result : [];
        rows.sort((a, b) => (a.enqueuedAt || 0) - (b.enqueuedAt || 0));
        resolve(rows);
      };
      req.onerror = () => reject(req.error || new Error('IndexedDB getAll failed'));
    });
  } finally {
    db.close();
  }
}

async function upsertQueueRecordInDb(record) {
  const db = await openBgSyncDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SW_BG_SYNC_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SW_BG_SYNC_STORE_NAME);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const existing = Array.isArray(getAllReq.result) ? getAllReq.result : [];
        for (const item of existing) {
          if (item.id === record.id || (record.dedupeKey && item.dedupeKey === record.dedupeKey)) {
            store.delete(item.id);
          }
        }
        store.put(record);
        const remaining = existing.filter(
          (item) => item.id !== record.id && item.dedupeKey !== record.dedupeKey
        );
        remaining.push(record);
        if (remaining.length > SW_BG_SYNC_MAX_ITEMS) {
          remaining.sort((a, b) => (a.enqueuedAt || 0) - (b.enqueuedAt || 0));
          const excess = remaining.slice(0, remaining.length - SW_BG_SYNC_MAX_ITEMS);
          for (const old of excess) {
            store.delete(old.id);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB upsert failed'));
    });
  } finally {
    db.close();
  }
}

async function deleteQueueRecordsFromDb(idsOrKeys) {
  if (!Array.isArray(idsOrKeys) || idsOrKeys.length === 0) return;
  const targetSet = new Set(idsOrKeys);
  const db = await openBgSyncDb();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(SW_BG_SYNC_STORE_NAME, 'readwrite');
      const store = tx.objectStore(SW_BG_SYNC_STORE_NAME);
      const getAllReq = store.getAll();
      getAllReq.onsuccess = () => {
        const rows = Array.isArray(getAllReq.result) ? getAllReq.result : [];
        for (const row of rows) {
          if (targetSet.has(row.id) || (row.dedupeKey && targetSet.has(row.dedupeKey))) {
            store.delete(row.id);
          }
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error('IndexedDB delete failed'));
    });
  } finally {
    db.close();
  }
}

async function summarizeQueueFromDb() {
  try {
    const records = await getAllQueueRecords();
    let httpCount = 0;
    let clientProgressCount = 0;
    for (const r of records) {
      if (r.kind === 'http-request') httpCount++;
      else clientProgressCount++;
    }
    return {
      records,
      pendingCount: records.length,
      httpPendingCount: httpCount,
      clientProgressCount,
    };
  } catch {
    return {
      records: [],
      pendingCount: 0,
      httpPendingCount: 0,
      clientProgressCount: 0,
    };
  }
}

async function broadcastToClients(message) {
  try {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windowClients) {
      client.postMessage(message);
    }
  } catch {
    // Ignore client broadcast errors
  }
}

async function broadcastBgSyncStatus(extra = {}) {
  const summary = await summarizeQueueFromDb();
  await broadcastToClients({
    type: 'SW_BG_SYNC_STATUS',
    payload: {
      pendingCount: summary.pendingCount,
      httpPendingCount: summary.httpPendingCount,
      clientProgressCount: summary.clientProgressCount,
      lastBgSyncAt,
      lastBgSyncReplayedCount,
      ...extra,
    },
  });
  return summary;
}

async function registerBackgroundSyncTag() {
  try {
    if (self.registration && 'sync' in self.registration) {
      await self.registration.sync.register(SW_BG_SYNC_TAG);
      return true;
    }
  } catch {
    // Background Sync API unavailable or denied; client reconciliation fallback still handles replay
  }
  return false;
}

async function serializeFailedRequest(request, errorReason) {
  let body = null;
  try {
    body = await request.clone().text();
  } catch {
    body = null;
  }

  const headers = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower !== 'content-length' && lower !== 'host') {
      headers[key] = value;
    }
  });

  let dedupeKey = `${request.method}:${new URL(request.url).pathname}:${Date.now()}`;
  if (body) {
    try {
      const parsed = JSON.parse(body);
      if (parsed && typeof parsed === 'object') {
        const qId = parsed.questionId || parsed.surveyId || '';
        const uid = parsed.uid || parsed.user_info?.uid || '';
        if (qId && uid) {
          dedupeKey = `http-response:${qId}:${uid}`;
        } else if (parsed.dedupeKey) {
          dedupeKey = String(parsed.dedupeKey);
        } else if (parsed.id) {
          dedupeKey = `http-response:${parsed.id}`;
        }
      }
    } catch {
      // Keep URL+timestamp key for non-JSON payloads
    }
  }

  const now = Date.now();
  return {
    id: `sw_req_${now}_${Math.random().toString(36).slice(2, 8)}`,
    dedupeKey,
    kind: 'http-request',
    url: request.url,
    method: request.method,
    headers,
    body,
    enqueuedAt: now,
    attempts: 0,
    nextRetryAt: now,
    lastError: errorReason || 'Network request failed',
  };
}

async function handleBackgroundSyncResponse(event) {
  const request = event.request;
  try {
    const networkRes = await fetch(request.clone());
    if (networkRes && !shouldRetryResponseStatus(networkRes.status)) {
      return networkRes;
    }

    const queuedRecord = await serializeFailedRequest(
      request,
      `HTTP ${networkRes ? networkRes.status : 'error'}`
    );
    await upsertQueueRecordInDb(queuedRecord);
    await registerBackgroundSyncTag();
    await broadcastBgSyncStatus({ lastQueuedId: queuedRecord.id });

    return new Response(
      JSON.stringify({
        ok: true,
        queued: true,
        backgroundSync: true,
        tag: SW_BG_SYNC_TAG,
        id: queuedRecord.id,
        dedupeKey: queuedRecord.dedupeKey,
      }),
      {
        status: 202,
        statusText: 'Accepted (Queued for Background Sync)',
        headers: {
          'Content-Type': 'application/json',
          'X-BTI-Background-Sync': 'queued',
        },
      }
    );
  } catch (err) {
    const queuedRecord = await serializeFailedRequest(
      request,
      err?.message || 'Offline or network drop'
    );
    await upsertQueueRecordInDb(queuedRecord);
    await registerBackgroundSyncTag();
    await broadcastBgSyncStatus({ lastQueuedId: queuedRecord.id });

    return new Response(
      JSON.stringify({
        ok: true,
        queued: true,
        backgroundSync: true,
        tag: SW_BG_SYNC_TAG,
        id: queuedRecord.id,
        dedupeKey: queuedRecord.dedupeKey,
      }),
      {
        status: 202,
        statusText: 'Accepted (Queued for Background Sync)',
        headers: {
          'Content-Type': 'application/json',
          'X-BTI-Background-Sync': 'queued',
        },
      }
    );
  }
}

async function processBackgroundSyncQueue(triggerSource = 'sync-event') {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = (async () => {
    const records = await getAllQueueRecords();
    let replayedCount = 0;
    let failedCount = 0;
    let clientProgressCount = 0;
    const idsToDelete = [];

    for (const record of records) {
      if (record.kind === 'client-progress') {
        clientProgressCount++;
        continue;
      }

      if (record.kind === 'http-request' && record.url) {
        try {
          const replayHeaders = new Headers(record.headers || {});
          replayHeaders.set('X-BTI-Background-Sync-Replay', '1');
          const res = await fetch(record.url, {
            method: record.method || 'POST',
            headers: replayHeaders,
            body: record.method === 'GET' || record.method === 'HEAD' ? undefined : record.body,
          });

          if (!shouldRetryResponseStatus(res.status)) {
            idsToDelete.push(record.id);
            replayedCount++;
          } else {
            const nextAttempts = (record.attempts || 0) + 1;
            if (nextAttempts >= SW_BG_SYNC_MAX_ATTEMPTS) {
              idsToDelete.push(record.id);
            } else {
              await upsertQueueRecordInDb({
                ...record,
                attempts: nextAttempts,
                nextRetryAt: Date.now() + computeBgSyncBackoffMs(nextAttempts),
                lastError: `HTTP ${res.status}`,
              });
              failedCount++;
            }
          }
        } catch (err) {
          const nextAttempts = (record.attempts || 0) + 1;
          if (nextAttempts >= SW_BG_SYNC_MAX_ATTEMPTS) {
            idsToDelete.push(record.id);
          } else {
            await upsertQueueRecordInDb({
              ...record,
              attempts: nextAttempts,
              nextRetryAt: Date.now() + computeBgSyncBackoffMs(nextAttempts),
              lastError: err?.message || 'Replay network failure',
            });
            failedCount++;
          }
        }
      }
    }

    if (idsToDelete.length > 0) {
      await deleteQueueRecordsFromDb(idsToDelete);
    }

    lastBgSyncAt = Date.now();
    lastBgSyncReplayedCount = replayedCount;

    if (clientProgressCount > 0 || triggerSource === 'sync-event') {
      await broadcastToClients({
        type: 'SW_BG_SYNC_RECONCILE_CLIENTS',
        payload: {
          triggerSource,
          clientProgressCount,
          replayedCount,
        },
      });
    }

    const summary = await broadcastBgSyncStatus({
      triggerSource,
      replayedCount,
      failedCount,
    });

    if (failedCount > 0) {
      throw new Error(`Background Sync has ${failedCount} pending HTTP response(s)`);
    }

    return {
      replayedCount,
      failedCount,
      pendingCount: summary.pendingCount,
    };
  })().finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}

async function trimCacheEntries(cache, maxEntries) {
  try {
    const keys = await cache.keys();
    if (keys.length <= maxEntries) return;
    const excess = keys.length - maxEntries;
    for (let i = 0; i < excess; i++) {
      await cache.delete(keys[i]);
    }
  } catch {
    // Ignore cache trim errors
  }
}

async function precacheUrlsResilient(cacheName, urls) {
  const cache = await caches.open(cacheName);
  await Promise.allSettled(
    urls.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: 'reload' }));
        if (res && res.ok) {
          await cache.put(url, res);
        }
      } catch {
        // Ignore single-asset precache error so other essential assets still cache cleanly
      }
    })
  );
}

async function precacheEssentialAssets() {
  await Promise.all([
    precacheUrlsResilient(SHELL_CACHE_NAME, ESSENTIAL_SHELL_URLS),
    precacheUrlsResilient(FONTS_CACHE_NAME, ESSENTIAL_FONT_URLS),
  ]);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    precacheEssentialAssets().then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith('bti-') && !ACTIVE_CACHE_NAMES.includes(key))
          .map((key) => caches.delete(key))
      );
      try {
        const db = await openBgSyncDb();
        db.close();
      } catch {
        // Ignore IndexedDB warm-up errors
      }
      await self.clients.claim();
    })()
  );
});

async function handleCacheFirstFont(request) {
  const fontCache = await caches.open(FONTS_CACHE_NAME);
  const cached = (await fontCache.match(request)) || (await fontCache.match(new URL(request.url).pathname));
  if (cached) {
    return cached;
  }

  const networkRes = await fetch(request);
  if (networkRes && networkRes.ok) {
    fontCache.put(request, networkRes.clone()).catch(() => {});
  }
  return networkRes;
}

async function handleNetworkFirstHtml(request) {
  const shellCache = await caches.open(SHELL_CACHE_NAME);
  try {
    const networkRes = await fetch(request);
    if (networkRes && networkRes.ok) {
      shellCache.put('/index.html', networkRes.clone()).catch(() => {});
      const pathname = new URL(request.url).pathname;
      if (pathname === '/') {
        shellCache.put('/', networkRes.clone()).catch(() => {});
      }
    }
    return networkRes;
  } catch {
    const fallback =
      (await shellCache.match(request)) ||
      (await shellCache.match('/index.html')) ||
      (await shellCache.match('/')) ||
      (await caches.match('/index.html'));
    if (fallback) {
      return fallback;
    }
    return new Response(
      '<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BTI 2027 - Ngoại tuyến</title></head><body style="background:#0D0420;color:#F5EFF9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center"><div><h1 style="margin:0 0 8px">Đang ngoại tuyến</h1><p style="opacity:.8">Không có kết nối mạng và trang chưa được lưu vào bộ nhớ đệm. Vui lòng kết nối WiFi/4G và tải lại.</p></div></body></html>',
      {
        status: 503,
        statusText: 'Service Unavailable (Offline)',
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      }
    );
  }
}

async function handleNetworkFirstDevModule(request) {
  const assetCache = await caches.open(ASSETS_CACHE_NAME);
  try {
    const networkRes = await fetch(request);
    if (networkRes && networkRes.ok) {
      assetCache.put(request, networkRes.clone()).catch(() => {});
    }
    return networkRes;
  } catch {
    const cached =
      (await assetCache.match(request)) ||
      (await assetCache.match(request, { ignoreSearch: true }));
    if (cached) {
      return cached;
    }
    throw new Error('Offline dev module cache miss');
  }
}

async function handleStaleWhileRevalidate(request, event, primaryCacheName, maxEntries = 0) {
  const primaryCache = await caches.open(primaryCacheName);
  const shellCache = await caches.open(SHELL_CACHE_NAME);
  const pathname = new URL(request.url).pathname;

  const cached =
    (await primaryCache.match(request)) ||
    (await primaryCache.match(pathname)) ||
    (await shellCache.match(request)) ||
    (await shellCache.match(pathname));

  const networkPromise = fetch(request)
    .then(async (networkRes) => {
      if (networkRes && networkRes.ok) {
        await primaryCache.put(request, networkRes.clone());
        if (maxEntries > 0) {
          await trimCacheEntries(primaryCache, maxEntries);
        }
      }
      return networkRes;
    })
    .catch(() => null);

  if (cached) {
    if (event && typeof event.waitUntil === 'function') {
      event.waitUntil(networkPromise);
    }
    return cached;
  }

  const networkRes = await networkPromise;
  if (networkRes) {
    return networkRes;
  }

  return new Response('', { status: 504, statusText: 'Offline Asset Unavailable' });
}

self.addEventListener('fetch', (event) => {
  if (isBackgroundSyncableResponseRequest(event.request)) {
    event.respondWith(handleBackgroundSyncResponse(event));
    return;
  }

  const strategy = classifyRequest(event.request);
  if (strategy === 'BYPASS') return;

  if (strategy === 'CACHE_FIRST_FONT') {
    event.respondWith(handleCacheFirstFont(event.request));
    return;
  }

  if (strategy === 'NETWORK_FIRST_HTML') {
    event.respondWith(handleNetworkFirstHtml(event.request));
    return;
  }

  if (strategy === 'NETWORK_FIRST_DEV_MODULE') {
    event.respondWith(handleNetworkFirstDevModule(event.request));
    return;
  }

  if (strategy === 'STALE_WHILE_REVALIDATE_NON_CRITICAL') {
    event.respondWith(
      handleStaleWhileRevalidate(
        event.request,
        event,
        NON_CRITICAL_CACHE_NAME,
        SW_NON_CRITICAL_MAX_ENTRIES
      )
    );
    return;
  }

  if (strategy === 'STALE_WHILE_REVALIDATE_ASSET') {
    event.respondWith(
      handleStaleWhileRevalidate(event.request, event, ASSETS_CACHE_NAME, 0)
    );
  }
});

self.addEventListener('sync', (event) => {
  if (event.tag === SW_BG_SYNC_TAG) {
    event.waitUntil(processBackgroundSyncQueue('sync-event'));
  }
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const reply = (payload) => {
    if (event.ports && event.ports[0]) {
      event.ports[0].postMessage(payload);
    }
  };

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'REFRESH_ESSENTIAL_CACHE') {
    const task = precacheEssentialAssets().then(() => {
      reply({ ok: true });
    });
    if (typeof event.waitUntil === 'function') {
      event.waitUntil(task);
    }
    return;
  }

  if (data.type === 'ENQUEUE_RESPONSE_SYNC') {
    const item = data.payload || {};
    const record = {
      id: item.id || `sw_prog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      dedupeKey: item.dedupeKey || item.id || `prog:${Date.now()}`,
      kind: 'client-progress',
      payload: item.payload || null,
      enqueuedAt: typeof item.savedAt === 'number' ? item.savedAt : Date.now(),
      attempts: 0,
      lastError: item.lastError || undefined,
    };

    const task = (async () => {
      await upsertQueueRecordInDb(record);
      await registerBackgroundSyncTag();
      const summary = await broadcastBgSyncStatus({ lastQueuedId: record.id });
      reply({ ok: true, pendingCount: summary.pendingCount });
    })().catch((err) => {
      reply({ ok: false, error: err?.message || 'Enqueue failed' });
    });

    if (typeof event.waitUntil === 'function') {
      event.waitUntil(task);
    }
    return;
  }

  if (data.type === 'RESOLVE_RESPONSE_SYNC_ITEMS') {
    const keys = Array.isArray(data.payload?.keys) ? data.payload.keys : [];
    const task = (async () => {
      await deleteQueueRecordsFromDb(keys);
      lastBgSyncAt = Date.now();
      const summary = await broadcastBgSyncStatus({ resolvedKeysCount: keys.length });
      reply({ ok: true, pendingCount: summary.pendingCount });
    })().catch((err) => {
      reply({ ok: false, error: err?.message || 'Resolve failed' });
    });

    if (typeof event.waitUntil === 'function') {
      event.waitUntil(task);
    }
    return;
  }

  if (data.type === 'TRIGGER_RESPONSE_SYNC') {
    const task = processBackgroundSyncQueue('client-trigger')
      .then((res) => reply({ ok: true, ...res }))
      .catch((err) => reply({ ok: false, error: err?.message || 'Sync failed' }));

    if (typeof event.waitUntil === 'function') {
      event.waitUntil(task);
    }
    return;
  }

  if (data.type === 'GET_BG_SYNC_STATUS') {
    const task = summarizeQueueFromDb()
      .then((summary) => {
        reply({
          ok: true,
          pendingCount: summary.pendingCount,
          httpPendingCount: summary.httpPendingCount,
          clientProgressCount: summary.clientProgressCount,
          lastBgSyncAt,
          lastBgSyncReplayedCount,
        });
      })
      .catch((err) => {
        reply({ ok: false, error: err?.message || 'Status lookup failed' });
      });

    if (typeof event.waitUntil === 'function') {
      event.waitUntil(task);
    }
  }
});
