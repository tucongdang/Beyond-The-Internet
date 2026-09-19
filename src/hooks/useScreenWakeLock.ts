import { useState, useEffect, useRef, useCallback } from 'react';

export interface UseScreenWakeLockReturn {
  isSupported: boolean;
  isLocked: boolean;
  requestLock: () => Promise<boolean>;
  releaseLock: () => Promise<void>;
  toggleLock: () => Promise<boolean>;
}

/**
 * Custom React Hook to manage Screen Wake Lock API.
 * Keeps the device screen awake during live broadcast interactions.
 * Automatically handles iframe permission policies, visibility changes, and fallbacks.
 */
export function useScreenWakeLock(autoRequest: boolean = true): UseScreenWakeLockReturn {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const sentinelRef = useRef<WakeLockSentinel | null>(null);
  const isManuallyReleasedRef = useRef<boolean>(false);
  const isDisallowedRef = useRef<boolean>(false);

  // Check browser support on mount
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      typeof navigator !== 'undefined' &&
      'wakeLock' in navigator &&
      typeof (navigator as any).wakeLock?.request === 'function';
    setIsSupported(supported);
  }, []);

  const requestLock = useCallback(async (): Promise<boolean> => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !('wakeLock' in navigator) ||
      isDisallowedRef.current
    ) {
      return false;
    }

    try {
      // If already holding an active sentinel, return true
      if (sentinelRef.current && !sentinelRef.current.released) {
        setIsLocked(true);
        return true;
      }

      const sentinel = await navigator.wakeLock.request('screen');
      sentinelRef.current = sentinel;
      isManuallyReleasedRef.current = false;
      setIsLocked(true);

      sentinel.addEventListener('release', () => {
        setIsLocked(false);
        sentinelRef.current = null;
      });

      return true;
    } catch (err: any) {
      // If disallowed by permissions policy (e.g. in sandboxed iframe) or user denied
      if (
        err?.name === 'NotAllowedError' ||
        err?.name === 'SecurityError' ||
        String(err?.message || '').toLowerCase().includes('permissions policy') ||
        String(err?.message || '').toLowerCase().includes('disallowed')
      ) {
        isDisallowedRef.current = true;
        setIsSupported(false);
      }
      setIsLocked(false);
      sentinelRef.current = null;
      return false;
    }
  }, []);

  const releaseLock = useCallback(async (): Promise<void> => {
    isManuallyReleasedRef.current = true;
    if (sentinelRef.current && !sentinelRef.current.released) {
      try {
        await sentinelRef.current.release();
      } catch {
        // Silently handle release errors
      }
    }
    sentinelRef.current = null;
    setIsLocked(false);
  }, []);

  const toggleLock = useCallback(async (): Promise<boolean> => {
    if (isDisallowedRef.current || !isSupported) {
      return false;
    }
    if (isLocked) {
      await releaseLock();
      return false;
    } else {
      return await requestLock();
    }
  }, [isLocked, isSupported, requestLock, releaseLock]);

  // Initial acquisition & visibility change auto-reacquisition
  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      typeof navigator === 'undefined' ||
      !('wakeLock' in navigator) ||
      isDisallowedRef.current
    ) {
      return;
    }

    if (autoRequest && !isManuallyReleasedRef.current) {
      requestLock().catch(() => {});
    }

    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === 'visible' &&
        autoRequest &&
        !isManuallyReleasedRef.current &&
        !isDisallowedRef.current
      ) {
        await requestLock().catch(() => {});
      }
    };

    const handleFocus = async () => {
      if (
        autoRequest &&
        !isManuallyReleasedRef.current &&
        !isDisallowedRef.current &&
        (!sentinelRef.current || sentinelRef.current.released)
      ) {
        await requestLock().catch(() => {});
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      if (sentinelRef.current && !sentinelRef.current.released) {
        sentinelRef.current.release().catch(() => {});
        sentinelRef.current = null;
      }
    };
  }, [autoRequest, requestLock]);

  return {
    isSupported,
    isLocked,
    requestLock,
    releaseLock,
    toggleLock
  };
}
