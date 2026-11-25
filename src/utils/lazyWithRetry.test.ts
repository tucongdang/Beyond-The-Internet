import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isDynamicImportError,
  retryDynamicImport,
  shouldTriggerChunkReload,
} from './lazyWithRetry';

test('isDynamicImportError detects Vite/browser module fetch errors', () => {
  assert.equal(
    isDynamicImportError(
      new TypeError('Failed to fetch dynamically imported module: https://example.com/src/components/AdminPortal.tsx')
    ),
    true
  );
  assert.equal(isDynamicImportError(new Error('Loading chunk 42 failed')), true);
  assert.equal(isDynamicImportError(new Error('Importing a module script failed.')), true);
  assert.equal(isDynamicImportError(new Error('Regular application error')), false);
});

test('retryDynamicImport recovers after transient module fetch failures', async () => {
  let calls = 0;
  const delays: number[] = [];

  const loaded = await retryDynamicImport(
    async () => {
      calls++;
      if (calls < 3) {
        throw new TypeError('Failed to fetch dynamically imported module: /src/components/AdminPortal.tsx');
      }
      return { default: 'AdminPortalComponent' };
    },
    {
      maxRetries: 3,
      baseDelayMs: 100,
      sleep: async (ms) => {
        delays.push(ms);
      },
      storage: null,
    }
  );

  assert.equal(calls, 3);
  assert.deepEqual(delays, [100, 200]);
  assert.deepEqual(loaded, { default: 'AdminPortalComponent' });
});

test('retryDynamicImport clears reload guard marker after successful recovery', async () => {
  const store = new Map<string, string>([['bti_chunk_reload_AdminPortal', '1000']]);
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };

  await retryDynamicImport(async () => ({ default: 'ok' }), {
    storageKey: 'bti_chunk_reload_AdminPortal',
    storage: mockStorage,
    sleep: async () => {},
  });

  assert.equal(store.has('bti_chunk_reload_AdminPortal'), false);
});

test('shouldTriggerChunkReload guards against reload loops within cooldown window', () => {
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };

  assert.equal(shouldTriggerChunkReload('k', mockStorage, 1000), true);
  assert.equal(shouldTriggerChunkReload('k', mockStorage, 5000), false);
  assert.equal(shouldTriggerChunkReload('k', mockStorage, 20000), true);
});

test('retryDynamicImport triggers optional reload once when all retries fail on chunk error', async () => {
  let reloads = 0;
  const store = new Map<string, string>();
  const mockStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };

  await assert.rejects(
    retryDynamicImport(
      async () => {
        throw new TypeError('Failed to fetch dynamically imported module: /src/components/AdminPortal.tsx');
      },
      {
        maxRetries: 2,
        baseDelayMs: 10,
        sleep: async () => {},
        storageKey: 'k_fail',
        storage: mockStorage,
        triggerReload: () => {
          reloads++;
        },
        now: () => 5000,
      }
    ),
    /Failed to fetch dynamically imported module/
  );

  assert.equal(reloads, 1);
});
