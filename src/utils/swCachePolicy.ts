export const SW_CACHE_VERSION = 'v2';

export const SHELL_CACHE_NAME = `bti-shell-${SW_CACHE_VERSION}`;
export const FONTS_CACHE_NAME = `bti-fonts-${SW_CACHE_VERSION}`;
export const ASSETS_CACHE_NAME = `bti-assets-${SW_CACHE_VERSION}`;
export const NON_CRITICAL_CACHE_NAME = `bti-noncritical-${SW_CACHE_VERSION}`;

export const ACTIVE_CACHE_NAMES = [
  SHELL_CACHE_NAME,
  FONTS_CACHE_NAME,
  ASSETS_CACHE_NAME,
  NON_CRITICAL_CACHE_NAME,
] as const;

export const SW_BG_SYNC_TAG = 'bti-response-sync';
export const SW_BG_SYNC_DB_NAME = 'bti-sw-bg-sync-v2';
export const SW_BG_SYNC_STORE_NAME = 'response_queue';
export const SW_NON_CRITICAL_MAX_ENTRIES = 80;
export const SW_BG_SYNC_MAX_ITEMS = 250;
export const SW_BG_SYNC_MAX_ATTEMPTS = 8;

export const ESSENTIAL_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/icon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png',
] as const;

export const ESSENTIAL_FONT_URLS = [
  '/fonts/SVN-Gilroy-Medium.otf',
  '/fonts/SVN-Gilroy-SemiBold.otf',
  '/fonts/SVN-Gilroy-Bold.otf',
  '/fonts/SVN-Gilroy-XBold.otf',
  '/fonts/SVN-Gilroy-Black.otf',
  '/fonts/NEXONLv1GothicRegular.ttf',
  '/fonts/NEXONLv1GothicBold.ttf',
  '/fonts/NEXONLv1GothicLight.ttf',
] as const;

export type SwCacheStrategy =
  | 'BYPASS'
  | 'CACHE_FIRST_FONT'
  | 'NETWORK_FIRST_HTML'
  | 'NETWORK_FIRST_DEV_MODULE'
  | 'STALE_WHILE_REVALIDATE_ASSET'
  | 'STALE_WHILE_REVALIDATE_NON_CRITICAL';

export interface SwRequestDescriptor {
  url: string;
  method?: string;
  appOrigin: string;
  mode?: string;
  destination?: string;
  headers?: Record<string, string>;
}

const FONT_EXT_RE = /\.(?:otf|ttf|woff2?|eot)$/i;
const CRITICAL_BUNDLE_EXT_RE = /\.(?:js|mjs|css)$/i;
const NON_CRITICAL_EXT_RE = /\.(?:svg|png|jpe?g|webp|avif|gif|ico|json|mp3|wav|ogg|m4a|mp4|webm|pdf)$/i;

const BG_SYNC_RESPONSE_PATH_RE =
  /^\/api\/(?:responses(?:\/|$)|audience\/responses?(?:\/|$)|poll\/responses?(?:\/|$)|survey\/responses?(?:\/|$)|qa\/responses?(?:\/|$))/i;

const BG_SYNC_EXCLUDED_PATH_RE =
  /^\/api\/(?:health|compliance|captcha|admin|audience\/(?:login|register|verify-email|forgot-password|sync-password|activate|resend-activation|google-auth|quick-access|captcha|check-status)|generate-question|gemini-tts|translate-|summarize-|explain-question|mc-copilot|audience-chat|google\/)/i;

export function classifyCacheStrategy(descriptor: SwRequestDescriptor): SwCacheStrategy {
  const method = (descriptor.method || 'GET').toUpperCase();
  if (method !== 'GET') {
    return 'BYPASS';
  }

  let parsed: URL;
  try {
    parsed = new URL(descriptor.url, descriptor.appOrigin);
  } catch {
    return 'BYPASS';
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return 'BYPASS';
  }

  if (parsed.origin !== descriptor.appOrigin) {
    return 'BYPASS';
  }

  const pathname = parsed.pathname;

  // Never cache backend API responses or the Service Worker script itself
  if (pathname.startsWith('/api/') || pathname === '/sw.js') {
    return 'BYPASS';
  }

  // Fonts: Cache-First so typography remains crisp and zero-latency offline
  if (
    pathname.startsWith('/fonts/') ||
    descriptor.destination === 'font' ||
    FONT_EXT_RE.test(pathname)
  ) {
    return 'CACHE_FIRST_FONT';
  }

  // SPA document navigations: Network-First with cached index.html fallback
  if (
    descriptor.mode === 'navigate' ||
    descriptor.destination === 'document' ||
    pathname === '/' ||
    pathname === '/index.html'
  ) {
    return 'NETWORK_FIRST_HTML';
  }

  // Vite dev-mode source & prebundled modules: Network-First so code stays fresh online
  // while still serving cached modules when reloading offline during development
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

  // Non-critical static media, images, audio, documents, manifests, and content JSONs:
  // Stale-While-Revalidate in dedicated bti-noncritical-v2 cache
  if (
    pathname.startsWith('/assets/aistudio/') ||
    pathname.startsWith('/locales/') ||
    NON_CRITICAL_EXT_RE.test(pathname) ||
    descriptor.destination === 'image' ||
    descriptor.destination === 'audio' ||
    descriptor.destination === 'video' ||
    descriptor.destination === 'manifest'
  ) {
    return 'STALE_WHILE_REVALIDATE_NON_CRITICAL';
  }

  // Critical built JS/CSS bundles
  if (
    pathname.startsWith('/assets/') ||
    CRITICAL_BUNDLE_EXT_RE.test(pathname) ||
    descriptor.destination === 'style' ||
    descriptor.destination === 'script'
  ) {
    return 'STALE_WHILE_REVALIDATE_ASSET';
  }

  return 'BYPASS';
}

export function isBackgroundSyncableResponseRequest(descriptor: SwRequestDescriptor): boolean {
  const method = (descriptor.method || 'GET').toUpperCase();
  if (method !== 'POST' && method !== 'PUT' && method !== 'PATCH') {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(descriptor.url, descriptor.appOrigin);
  } catch {
    return false;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  if (parsed.origin !== descriptor.appOrigin) {
    return false;
  }

  const pathname = parsed.pathname;
  if (BG_SYNC_EXCLUDED_PATH_RE.test(pathname)) {
    return false;
  }

  if (BG_SYNC_RESPONSE_PATH_RE.test(pathname)) {
    return true;
  }

  const syncHeader =
    descriptor.headers?.['x-bti-bg-sync'] ||
    descriptor.headers?.['X-BTI-Bg-Sync'] ||
    '';

  return syncHeader.toLowerCase() === 'response';
}

export function shouldRetryResponseStatus(status: number | null | undefined): boolean {
  if (status === null || status === undefined) {
    return true; // Network failure / offline / timeout
  }
  if (status >= 500) {
    return true; // Transient upstream/server error
  }
  return status === 408 || status === 429;
}

export function computeBgSyncBackoffMs(attempts: number): number {
  const safeAttempts = Math.max(0, Math.min(6, Math.floor(attempts || 0)));
  return Math.min(60_000, 1000 * Math.pow(2, safeAttempts));
}

export type BgSyncQueueKind = 'http-request' | 'client-progress';

export interface BgSyncQueueRecord {
  id: string;
  dedupeKey: string;
  kind: BgSyncQueueKind;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: string | null;
  payload?: any;
  enqueuedAt: number;
  attempts: number;
  nextRetryAt?: number;
  lastError?: string;
}

export function upsertBgSyncRecord(
  queue: readonly BgSyncQueueRecord[],
  incoming: Omit<BgSyncQueueRecord, 'attempts'> & { attempts?: number }
): BgSyncQueueRecord[] {
  const nextRecord: BgSyncQueueRecord = {
    ...incoming,
    attempts: typeof incoming.attempts === 'number' ? incoming.attempts : 0,
  };

  const filtered = queue.filter(
    (item) => item.id !== nextRecord.id && item.dedupeKey !== nextRecord.dedupeKey
  );
  filtered.push(nextRecord);
  filtered.sort((a, b) => a.enqueuedAt - b.enqueuedAt);

  if (filtered.length > SW_BG_SYNC_MAX_ITEMS) {
    return filtered.slice(filtered.length - SW_BG_SYNC_MAX_ITEMS);
  }
  return filtered;
}

export function summarizeBgSyncQueue(queue: readonly BgSyncQueueRecord[]): {
  total: number;
  httpCount: number;
  clientProgressCount: number;
} {
  let httpCount = 0;
  let clientProgressCount = 0;
  for (const item of queue) {
    if (item.kind === 'http-request') {
      httpCount++;
    } else {
      clientProgressCount++;
    }
  }
  return {
    total: queue.length,
    httpCount,
    clientProgressCount,
  };
}

export function shouldCleanupCacheKey(
  cacheName: string,
  activeCaches: readonly string[] = ACTIVE_CACHE_NAMES
): boolean {
  return cacheName.startsWith('bti-') && !activeCaches.includes(cacheName);
}

export function summarizeCachedEntries(
  urls: readonly string[],
  shellCacheHit: boolean,
  nonCriticalCount: number = 0
): {
  totalCached: number;
  cachedFonts: number;
  nonCriticalCached: number;
  shellReady: boolean;
} {
  let cachedFonts = 0;
  let detectedNonCritical = 0;
  let hasIndexOrRoot = shellCacheHit;

  for (const rawUrl of urls) {
    try {
      const parsed = new URL(rawUrl, 'http://localhost');
      const p = parsed.pathname;
      if (p.startsWith('/fonts/') || FONT_EXT_RE.test(p)) {
        cachedFonts++;
      }
      if (
        p.startsWith('/assets/aistudio/') ||
        p.startsWith('/locales/') ||
        NON_CRITICAL_EXT_RE.test(p)
      ) {
        detectedNonCritical++;
      }
      if (p === '/' || p === '/index.html') {
        hasIndexOrRoot = true;
      }
    } catch {
      // Ignore malformed cache keys
    }
  }

  return {
    totalCached: urls.length,
    cachedFonts,
    nonCriticalCached: Math.max(nonCriticalCount, detectedNonCritical),
    shellReady: hasIndexOrRoot,
  };
}
