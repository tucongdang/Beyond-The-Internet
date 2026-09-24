/**
 * Vibration Haptic Feedback Utilities for Mobile Audience & Interactive Arena
 * Provides tactile confirmation and feedback using the Web Vibration API.
 */

const HAPTIC_STORAGE_KEY = 'BTI2026_HAPTICS_ENABLED';
const HAPTIC_INTENSITY_STORAGE_KEY = 'BTI2026_HAPTIC_INTENSITY';
const HAPTIC_EVENT_NAME = 'bti_haptics_changed';

export type HapticIntensity = 'Soft' | 'Medium' | 'Strong';

/**
 * Check if the browser / hardware supports the Web Vibration API
 */
export const isVibrationSupported = (): boolean => {
  if (typeof navigator === 'undefined') return false;
  return (
    ('vibrate' in navigator && typeof navigator.vibrate === 'function') ||
    ('webkitVibrate' in navigator && typeof (navigator as any).webkitVibrate === 'function') ||
    ('mozVibrate' in navigator && typeof (navigator as any).mozVibrate === 'function')
  );
};

/**
 * Check if haptic feedback is currently enabled by user preference
 * Defaults to true if supported
 */
export const getHapticPreference = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    const saved = localStorage.getItem(HAPTIC_STORAGE_KEY);
    if (saved === null) return true;
    return saved === 'true';
  } catch {
    return true;
  }
};

/**
 * Get configured haptic feedback intensity pattern multiplier
 * Defaults to 'Medium'
 */
export const getHapticIntensity = (): HapticIntensity => {
  if (typeof window === 'undefined') return 'Medium';
  try {
    const saved = localStorage.getItem(HAPTIC_INTENSITY_STORAGE_KEY);
    if (saved === 'Soft' || saved === 'Medium' || saved === 'Strong') {
      return saved;
    }
    return 'Medium';
  } catch {
    return 'Medium';
  }
};

/**
 * Update user haptic feedback intensity in localStorage and notify listeners
 */
export const setHapticIntensity = (intensity: HapticIntensity): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HAPTIC_INTENSITY_STORAGE_KEY, intensity);
    window.dispatchEvent(
      new CustomEvent(HAPTIC_EVENT_NAME, {
        detail: { enabled: getHapticPreference(), intensity }
      })
    );
  } catch {}
};

/**
 * Update user haptic feedback preference in localStorage and notify listeners
 */
export const setHapticPreference = (enabled: boolean): void => {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HAPTIC_STORAGE_KEY, enabled ? 'true' : 'false');
    window.dispatchEvent(
      new CustomEvent(HAPTIC_EVENT_NAME, {
        detail: { enabled, intensity: getHapticIntensity() }
      })
    );
    if (enabled) {
      // Provide a brief tactile confirmation of enabling haptics
      if (isVibrationSupported()) {
        try {
          const intensity = getHapticIntensity();
          const p = intensity === 'Soft' ? [20, 20, 30] : intensity === 'Strong' ? [60, 30, 90] : [40, 30, 60];
          navigator.vibrate(p);
        } catch {}
      }
    }
  } catch {}
};

/**
 * Subscribe to haptic preference changes
 */
export const subscribeHapticPreference = (
  callback: (enabled: boolean, intensity: HapticIntensity) => void
): (() => void) => {
  if (typeof window === 'undefined') return () => {};
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<{ enabled: boolean; intensity?: HapticIntensity }>;
    callback(
      customEvent.detail?.enabled ?? getHapticPreference(),
      customEvent.detail?.intensity ?? getHapticIntensity()
    );
  };
  window.addEventListener(HAPTIC_EVENT_NAME, handler);
  return () => window.removeEventListener(HAPTIC_EVENT_NAME, handler);
};

import { getBatterySaverMode } from './batterySaverUtils';

/**
 * Generic safe vibration trigger with intensity pattern scaling
 */
const triggerVibration = (pattern: number | number[]): boolean => {
  if (!isVibrationSupported()) return false;
  if (!getHapticPreference()) return false;
  try {
    // Apply intensity scaling based on user preference ('Soft' | 'Medium' | 'Strong')
    const intensity = getHapticIntensity();
    let scale = 1.0;
    if (intensity === 'Soft') scale = 0.55;
    else if (intensity === 'Strong') scale = 1.55;

    let scaledPattern: number | number[];
    if (typeof pattern === 'number') {
      scaledPattern = Math.max(8, Math.round(pattern * scale));
    } else if (Array.isArray(pattern)) {
      scaledPattern = pattern.map((dur, idx) => {
        if (idx % 2 === 0) {
          return Math.max(8, Math.round(dur * scale));
        }
        return dur;
      });
    } else {
      scaledPattern = pattern;
    }

    // If Battery Saver mode is active, reduce vibration duration to save haptic motor power
    if (getBatterySaverMode()) {
      if (typeof scaledPattern === 'number') {
        scaledPattern = Math.min(scaledPattern, 10);
      } else if (Array.isArray(scaledPattern)) {
        scaledPattern = [Math.min(scaledPattern[0] || 10, 10)];
      }
    }

    const vibrateFn =
      navigator.vibrate ||
      (navigator as any).webkitVibrate ||
      (navigator as any).mozVibrate;
    if (typeof vibrateFn === 'function') {
      return vibrateFn.call(navigator, scaledPattern);
    }
    return false;
  } catch {
    return false;
  }
};

/**
 * Standard tactile pattern for response submission (confirmation double-burst)
 * Provides solid, satisfying confirmation when selecting an option or submitting a text prediction
 */
export const vibrateSubmit = (): boolean => {
  // 45ms buzz, 30ms pause, 65ms confirmation buzz
  return triggerVibration([45, 30, 65]);
};

/**
 * Long-pulse tactile feedback when receiving or starting a new question
 * Gives a distinct, smooth sustained vibration alert to immediately grab attention
 */
export const vibrateNewQuestion = (): boolean => {
  return triggerVibration(180);
};

/**
 * Long-pulse alias for sustained tactile alerts
 */
export const vibrateLongPulse = (): boolean => {
  return triggerVibration(180);
};

/**
 * Short-staccato pulse pattern when a round ends or time limit expires
 * Rhythmic 4-burst staccato pattern signaling voting closure
 */
export const vibrateRoundEnd = (): boolean => {
  return triggerVibration([30, 25, 30, 25, 30, 25, 30]);
};

/**
 * Short-staccato alias for rhythmic multi-bursts
 */
export const vibrateStaccato = (): boolean => {
  return triggerVibration([30, 25, 30, 25, 30, 25, 30]);
};

/**
 * Crisp light tactile feedback for quick interactions / taps / navigation
 */
export const vibrateTap = (): boolean => {
  return triggerVibration(25);
};

/**
 * Subtle micro-tactile tick for selecting an option or toggling a radio/switch
 */
export const vibrateSelection = (): boolean => {
  return triggerVibration(18);
};

/**
 * Celebratory tactile pulse for correct answers or congratulations
 */
export const vibrateSuccess = (): boolean => {
  return triggerVibration([50, 35, 50, 35, 110]);
};

/**
 * Alias for correct answer reveal feedback
 */
export const vibrateCorrect = (): boolean => {
  return triggerVibration([45, 30, 45, 30, 110]);
};

/**
 * Subdued double-thud buzz for incorrect answer or elimination
 */
export const vibrateWrong = (): boolean => {
  return triggerVibration([90, 60, 120]);
};

/**
 * Warning / lockout buzz for timer expiration or caution states
 */
export const vibrateWarning = (): boolean => {
  return triggerVibration([75, 45, 75]);
};

/**
 * Emergency poll / surprise challenge alert pattern
 */
export const vibrateEmergencyAlert = (): boolean => {
  return triggerVibration([70, 35, 70, 35, 140]);
};

/**
 * Error / validation failure buzz
 */
export const vibrateError = (): boolean => {
  return triggerVibration([80, 50, 80]);
};

/**
 * Subtle tick for countdown urgency (last 3-2-1 seconds)
 */
export const vibrateCountdown = (): boolean => {
  return triggerVibration(15);
};

/**
 * Critical high-frequency pulse for final countdown tick (last 3s)
 */
export const vibrateCountdownCritical = (): boolean => {
  return triggerVibration(22);
};

/**
 * Heavy tactile impulse for round start, buzzers, or master lock
 */
export const vibrateImpact = (): boolean => {
  return triggerVibration(75);
};

/**
 * Strong snappy impulse for buzzer or fast-finger trigger
 */
export const vibrateBuzzer = (): boolean => {
  return triggerVibration(100);
};

/**
 * Rapid crisp triple tick when copying a link, downloading QR, or exporting data
 */
export const vibrateCopy = (): boolean => {
  return triggerVibration([30, 25, 30, 25, 45]);
};

/**
 * Expressive tactile pulse when opening share sheet, initiating Web Share API or invitation
 */
export const vibrateShare = (): boolean => {
  // 35ms tactile trigger, 25ms pause, 65ms solid confirmation impulse
  return triggerVibration([35, 25, 65]);
};

/**
 * Bouncy energetic tactile pulse for cheer reaction button
 */
export const vibrateCheer = (): boolean => {
  return triggerVibration([15, 20, 25]);
};

/**
 * Multi-burst combo celebration when reaching 10x/20x cheer milestones
 */
export const vibrateCheerCombo = (): boolean => {
  return triggerVibration([30, 25, 30, 25, 55]);
};

/**
 * Double-tick for 50:50 lifeline / eliminated options
 */
export const vibrateLifeline = (): boolean => {
  return triggerVibration([40, 30, 40]);
};

/**
 * Grand fanfare vibration pattern for podium crowning / winner celebration
 */
export const vibrateGrandCelebration = (): boolean => {
  return triggerVibration([60, 30, 60, 30, 80, 40, 140, 50, 220]);
};

