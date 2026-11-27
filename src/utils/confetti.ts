import type confettiLib from 'canvas-confetti';

/**
 * Bulletproof Confetti Launcher (Lazy-loaded)
 *
 * Avoids bundling canvas-confetti into critical boot paths and avoids
 * Web Worker / OffscreenCanvas bugs in browser/iframe environments.
 */

type ConfettiOptions = confettiLib.Options;

let mainThreadConfetti: confettiLib.CreateTypes | null = null;
let confettiLoaderPromise: Promise<confettiLib.CreateTypes | null> | null = null;

const loadConfettiCannon = async (): Promise<confettiLib.CreateTypes | null> => {
  if (typeof window === 'undefined') return null;
  if (mainThreadConfetti) return mainThreadConfetti;
  if (!confettiLoaderPromise) {
    confettiLoaderPromise = import('canvas-confetti')
      .then((mod) => {
        const lib = (mod.default || mod) as typeof confettiLib;
        mainThreadConfetti = lib.create(undefined, {
          resize: true,
          useWorker: false,
        });
        return mainThreadConfetti;
      })
      .catch((err) => {
        console.warn('Could not load confetti cannon dynamically:', err);
        confettiLoaderPromise = null;
        return null;
      });
  }
  return confettiLoaderPromise;
};

/**
 * Safe Confetti Execution function
 */
export const confetti = (options?: ConfettiOptions): Promise<void> | null => {
  if (typeof window === 'undefined') return null;

  try {
    if (mainThreadConfetti) {
      return mainThreadConfetti(options) || null;
    }
    return loadConfettiCannon().then((cannon) => {
      if (cannon) {
        return cannon(options) ?? undefined;
      }
      return undefined;
    });
  } catch (err) {
    console.warn('Confetti launch caught exception gracefully:', err);
    return null;
  }
};

export const resetConfetti = (): void => {
  try {
    if (mainThreadConfetti && typeof mainThreadConfetti.reset === 'function') {
      mainThreadConfetti.reset();
    }
  } catch (err) {
    console.warn('Confetti reset caught exception:', err);
  }
};

export default confetti;
