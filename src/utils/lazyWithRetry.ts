import React from 'react';

export interface RetryImportOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  sleep?: (ms: number) => Promise<void>;
  onRetryAttempt?: (attempt: number, error: unknown) => void;
  storageKey?: string;
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null;
  triggerReload?: () => void;
  now?: () => number;
}

const CHUNK_RELOAD_COOLDOWN_MS = 15_000;

export function isDynamicImportError(err: unknown): boolean {
  if (!err) return false;
  const message =
    err instanceof Error
      ? err.message
      : typeof (err as any)?.message === 'string'
      ? (err as any).message
      : String(err);

  return /failed to fetch dynamically imported module|importing a module script failed|loading chunk|error loading dynamically imported module|dynamically imported module/i.test(
    message
  );
}

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function shouldTriggerChunkReload(
  storageKey: string,
  storage?: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'> | null,
  nowMs: number = Date.now()
): boolean {
  if (!storage) return false;
  try {
    const raw = storage.getItem(storageKey);
    const lastAttempt = raw ? Number(raw) : 0;
    if (Number.isFinite(lastAttempt) && lastAttempt > 0 && nowMs - lastAttempt < CHUNK_RELOAD_COOLDOWN_MS) {
      return false;
    }
    storage.setItem(storageKey, String(nowMs));
    return true;
  } catch {
    return false;
  }
}

export async function retryDynamicImport<T>(
  loader: () => Promise<T>,
  options: RetryImportOptions = {}
): Promise<T> {
  const maxRetries = Math.max(0, options.maxRetries ?? 3);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 250);
  const sleepFn = options.sleep ?? defaultSleep;
  const nowFn = options.now ?? (() => Date.now());
  const storageKey = options.storageKey || 'bti_chunk_reload_at';
  const storageObj =
    options.storage !== undefined
      ? options.storage
      : typeof window !== 'undefined' && typeof window.sessionStorage !== 'undefined'
      ? window.sessionStorage
      : null;

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const mod = await loader();
      if (storageObj) {
        try {
          storageObj.removeItem(storageKey);
        } catch {}
      }
      return mod;
    } catch (err) {
      lastError = err;
      const canRetry = attempt < maxRetries && (isDynamicImportError(err) || attempt === 0);
      if (!canRetry) {
        break;
      }
      if (options.onRetryAttempt) {
        options.onRetryAttempt(attempt + 1, err);
      }
      const delay = baseDelayMs * (attempt + 1);
      if (delay > 0) {
        await sleepFn(delay);
      }
    }
  }

  if (
    isDynamicImportError(lastError) &&
    options.triggerReload &&
    shouldTriggerChunkReload(storageKey, storageObj, nowFn())
  ) {
    options.triggerReload();
  }

  throw lastError;
}

export function lazyWithRetry<T extends React.ComponentType<any>>(
  loader: () => Promise<{ default: T }>,
  moduleKey: string
): React.LazyExoticComponent<T> {
  return React.lazy(() =>
    retryDynamicImport(loader, {
      maxRetries: 3,
      baseDelayMs: 300,
      storageKey: `bti_chunk_reload_${moduleKey}`,
      onRetryAttempt: (attempt, err) => {
        console.warn(`[lazyWithRetry] Retrying module "${moduleKey}" (attempt ${attempt}):`, err);
      },
    })
  );
}
