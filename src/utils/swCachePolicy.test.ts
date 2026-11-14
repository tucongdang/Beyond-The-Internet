import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ACTIVE_CACHE_NAMES,
  NON_CRITICAL_CACHE_NAME,
  SW_BG_SYNC_MAX_ITEMS,
  classifyCacheStrategy,
  computeBgSyncBackoffMs,
  isBackgroundSyncableResponseRequest,
  shouldCleanupCacheKey,
  shouldRetryResponseStatus,
  summarizeBgSyncQueue,
  summarizeCachedEntries,
  upsertBgSyncRecord,
  type BgSyncQueueRecord,
} from './swCachePolicy.ts';

const APP_ORIGIN = 'http://localhost:3000';

describe('swCachePolicy pure logic', () => {
  it('bypasses non-GET requests, API routes, sw.js, and cross-origin requests', () => {
    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/api/health',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      'BYPASS'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/sw.js',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      'BYPASS'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/index.html',
        method: 'POST',
        appOrigin: APP_ORIGIN,
      }),
      'BYPASS'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'https://firestore.googleapis.com/google.firestore.v1.Firestore/Listen/channel',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      'BYPASS'
    );
  });

  it('uses CACHE_FIRST_FONT for local fonts and font destinations', () => {
    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/fonts/SVN-Gilroy-Bold.otf',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'font',
      }),
      'CACHE_FIRST_FONT'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/fonts/NEXONLv1GothicRegular.ttf',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      'CACHE_FIRST_FONT'
    );
  });

  it('uses NETWORK_FIRST_HTML for SPA navigations and index.html', () => {
    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        mode: 'navigate',
      }),
      'NETWORK_FIRST_HTML'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/audience/round-1',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        mode: 'navigate',
      }),
      'NETWORK_FIRST_HTML'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/index.html',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      'NETWORK_FIRST_HTML'
    );
  });

  it('uses STALE_WHILE_REVALIDATE_ASSET for critical JS/CSS bundles', () => {
    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/assets/index-abc123.js',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'script',
      }),
      'STALE_WHILE_REVALIDATE_ASSET'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/assets/index-abc123.css',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'style',
      }),
      'STALE_WHILE_REVALIDATE_ASSET'
    );
  });

  it('uses STALE_WHILE_REVALIDATE_NON_CRITICAL for non-critical images, audio, PDFs, manifests, and content JSON', () => {
    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/assets/aistudio/image_a159c40c.png',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'image',
      }),
      'STALE_WHILE_REVALIDATE_NON_CRITICAL'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/manifest.json',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'manifest',
      }),
      'STALE_WHILE_REVALIDATE_NON_CRITICAL'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/pwa-192x192.png',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'image',
      }),
      'STALE_WHILE_REVALIDATE_NON_CRITICAL'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/audio/countdown-tick.mp3',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'audio',
      }),
      'STALE_WHILE_REVALIDATE_NON_CRITICAL'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/assets/aistudio/Ch_nh_s_ch_b_o_m_t___VTVgo_a4463b32.pdf',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      'STALE_WHILE_REVALIDATE_NON_CRITICAL'
    );

    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/locales/vi.json',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      'STALE_WHILE_REVALIDATE_NON_CRITICAL'
    );
  });

  it('uses NETWORK_FIRST_DEV_MODULE for Vite dev module graph requests', () => {
    assert.equal(
      classifyCacheStrategy({
        url: 'http://localhost:3000/src/App.tsx',
        method: 'GET',
        appOrigin: APP_ORIGIN,
        destination: 'script',
      }),
      'NETWORK_FIRST_DEV_MODULE'
    );
  });

  it('identifies background-syncable user response requests while excluding GET, auth, AI, and cross-origin calls', () => {
    assert.equal(
      isBackgroundSyncableResponseRequest({
        url: 'http://localhost:3000/api/responses/sync',
        method: 'POST',
        appOrigin: APP_ORIGIN,
      }),
      true
    );

    assert.equal(
      isBackgroundSyncableResponseRequest({
        url: 'http://localhost:3000/api/audience/response',
        method: 'PUT',
        appOrigin: APP_ORIGIN,
      }),
      true
    );

    assert.equal(
      isBackgroundSyncableResponseRequest({
        url: 'http://localhost:3000/api/custom-poll-save',
        method: 'POST',
        appOrigin: APP_ORIGIN,
        headers: { 'x-bti-bg-sync': 'response' },
      }),
      true
    );

    // Excluded routes or methods
    assert.equal(
      isBackgroundSyncableResponseRequest({
        url: 'http://localhost:3000/api/responses/sync',
        method: 'GET',
        appOrigin: APP_ORIGIN,
      }),
      false
    );

    assert.equal(
      isBackgroundSyncableResponseRequest({
        url: 'http://localhost:3000/api/audience/login',
        method: 'POST',
        appOrigin: APP_ORIGIN,
        headers: { 'x-bti-bg-sync': 'response' },
      }),
      false
    );

    assert.equal(
      isBackgroundSyncableResponseRequest({
        url: 'http://localhost:3000/api/audience-chat',
        method: 'POST',
        appOrigin: APP_ORIGIN,
      }),
      false
    );

    assert.equal(
      isBackgroundSyncableResponseRequest({
        url: 'https://example.com/api/responses',
        method: 'POST',
        appOrigin: APP_ORIGIN,
      }),
      false
    );
  });

  it('classifies HTTP status retry eligibility accurately', () => {
    assert.equal(shouldRetryResponseStatus(null), true);
    assert.equal(shouldRetryResponseStatus(undefined), true);
    assert.equal(shouldRetryResponseStatus(500), true);
    assert.equal(shouldRetryResponseStatus(503), true);
    assert.equal(shouldRetryResponseStatus(408), true);
    assert.equal(shouldRetryResponseStatus(429), true);

    assert.equal(shouldRetryResponseStatus(200), false);
    assert.equal(shouldRetryResponseStatus(202), false);
    assert.equal(shouldRetryResponseStatus(400), false);
    assert.equal(shouldRetryResponseStatus(401), false);
    assert.equal(shouldRetryResponseStatus(404), false);
  });

  it('computes bounded exponential backoff and deduplicates Background Sync records', () => {
    assert.equal(computeBgSyncBackoffMs(0), 1000);
    assert.equal(computeBgSyncBackoffMs(3), 8000);
    assert.equal(computeBgSyncBackoffMs(20), 60000);

    let queue: BgSyncQueueRecord[] = [];
    queue = upsertBgSyncRecord(queue, {
      id: 'req-1',
      dedupeKey: 'response:q1:u1',
      kind: 'http-request',
      url: '/api/responses/sync',
      method: 'POST',
      body: JSON.stringify({ questionId: 'q1', uid: 'u1', choice: 'A' }),
      enqueuedAt: 1000,
    });

    queue = upsertBgSyncRecord(queue, {
      id: 'req-2',
      dedupeKey: 'response:q1:u1',
      kind: 'http-request',
      url: '/api/responses/sync',
      method: 'POST',
      body: JSON.stringify({ questionId: 'q1', uid: 'u1', choice: 'B' }),
      enqueuedAt: 2000,
    });

    queue = upsertBgSyncRecord(queue, {
      id: 'prog-1',
      dedupeKey: 'prediction:q2:u1',
      kind: 'client-progress',
      enqueuedAt: 1500,
    });

    assert.equal(queue.length, 2);
    assert.equal(queue[0].id, 'prog-1');
    assert.equal(queue[1].id, 'req-2');
    assert.deepEqual(summarizeBgSyncQueue(queue), {
      total: 2,
      httpCount: 1,
      clientProgressCount: 1,
    });

    // Respects max queue cap
    let capped: BgSyncQueueRecord[] = [];
    for (let i = 0; i < SW_BG_SYNC_MAX_ITEMS + 15; i++) {
      capped = upsertBgSyncRecord(capped, {
        id: `id-${i}`,
        dedupeKey: `key-${i}`,
        kind: 'http-request',
        enqueuedAt: i,
      });
    }
    assert.equal(capped.length, SW_BG_SYNC_MAX_ITEMS);
    assert.equal(capped[0].id, 'id-15');
  });

  it('identifies obsolete bti- caches including v1 after upgrading to v2', () => {
    assert.equal(shouldCleanupCacheKey('bti-shell-v1', ACTIVE_CACHE_NAMES), true);
    assert.equal(shouldCleanupCacheKey('bti-assets-v1', ACTIVE_CACHE_NAMES), true);
    assert.equal(shouldCleanupCacheKey(NON_CRITICAL_CACHE_NAME, ACTIVE_CACHE_NAMES), false);
    assert.equal(shouldCleanupCacheKey(ACTIVE_CACHE_NAMES[0], ACTIVE_CACHE_NAMES), false);
    assert.equal(shouldCleanupCacheKey('third-party-cache', ACTIVE_CACHE_NAMES), false);
  });

  it('summarizes cached shell, font, and non-critical asset entries accurately', () => {
    const summary = summarizeCachedEntries(
      [
        'http://localhost:3000/',
        'http://localhost:3000/index.html',
        'http://localhost:3000/fonts/SVN-Gilroy-Bold.otf',
        'http://localhost:3000/fonts/NEXONLv1GothicBold.ttf',
        'http://localhost:3000/pwa-192x192.png',
        'http://localhost:3000/assets/aistudio/image_a159c40c.png',
      ],
      false,
      2
    );

    assert.deepEqual(summary, {
      totalCached: 6,
      cachedFonts: 2,
      nonCriticalCached: 2,
      shellReady: true,
    });
  });
});
