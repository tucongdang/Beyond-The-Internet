import confettiLib from 'canvas-confetti';

/**
 * Bulletproof Confetti Launcher
 * 
 * Avoids Web Worker / OffscreenCanvas bugs in browser/iframe environments
 * where canvas.getBoundingClientRect() is undefined on OffscreenCanvas.
 * Initialized with `useWorker: false` to guarantee stable main-thread rendering.
 */

type ConfettiOptions = confettiLib.Options;

let mainThreadConfetti: confettiLib.CreateTypes | null = null;

try {
  if (typeof window !== 'undefined') {
    // Create dedicated main-thread instance (never uses workers which fail getBoundingClientRect on OffscreenCanvas)
    mainThreadConfetti = confettiLib.create(undefined, {
      resize: true,
      useWorker: false
    });
  }
} catch (err) {
  console.warn('Could not initialize custom confetti cannon, using fallback:', err);
}

/**
 * Safe Confetti Execution function
 */
export const confetti = (options?: ConfettiOptions): Promise<void> | null => {
  if (typeof window === 'undefined') return null;

  try {
    if (mainThreadConfetti) {
      return mainThreadConfetti(options) || null;
    }
    return confettiLib(options) || null;
  } catch (err) {
    console.warn('Confetti launch caught exception gracefully:', err);
    return null;
  }
};

export const resetConfetti = (): void => {
  try {
    if (mainThreadConfetti && typeof mainThreadConfetti.reset === 'function') {
      mainThreadConfetti.reset();
    } else if (typeof confettiLib.reset === 'function') {
      confettiLib.reset();
    }
  } catch (err) {
    console.warn('Confetti reset caught exception:', err);
  }
};

export default confetti;
