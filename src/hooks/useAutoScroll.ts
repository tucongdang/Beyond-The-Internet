import { useState, useEffect, useRef, useCallback } from 'react';

export type AutoScrollSpeed = 'slow' | 'normal' | 'fast';

interface UseAutoScrollOptions {
  enabled?: boolean;
  speed?: AutoScrollSpeed;
  pauseOnHover?: boolean;
  bottomPauseMs?: number;
  topPauseMs?: number;
  dependencies?: any[];
}

const SPEED_CONFIG: Record<AutoScrollSpeed, number> = {
  slow: 25,    // 25 pixels per second
  normal: 50,  // 50 pixels per second
  fast: 90     // 90 pixels per second
};

export function useAutoScroll<T extends HTMLElement = HTMLDivElement>({
  enabled = true,
  speed = 'normal',
  pauseOnHover = true,
  bottomPauseMs = 2500,
  topPauseMs = 1500,
  dependencies = []
}: UseAutoScrollOptions = {}) {
  const containerRef = useRef<T | null>(null);
  const [isAutoScrolling, setIsAutoScrolling] = useState<boolean>(enabled);
  const [currentSpeed, setCurrentSpeed] = useState<AutoScrollSpeed>(speed);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isOverflowing, setIsOverflowing] = useState<boolean>(false);
  const [scrollProgress, setScrollProgress] = useState<number>(0);

  const isUserInteractingRef = useRef<boolean>(false);
  const userInteractionTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pauseStateRef = useRef<{ isPausing: boolean; resumeAt: number }>({ isPausing: false, resumeAt: 0 });
  const directionRef = useRef<'down' | 'reset'>('down');
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Sync state if prop changes
  useEffect(() => {
    setIsAutoScrolling(enabled);
  }, [enabled]);

  // Check if content overflows container
  const checkOverflow = useCallback(() => {
    const el = containerRef.current;
    if (!el) {
      setIsOverflowing(false);
      return false;
    }
    const hasOverflow = el.scrollHeight > el.clientHeight + 10;
    setIsOverflowing(hasOverflow);
    return hasOverflow;
  }, []);

  // Update overflow state on resize or dependencies change
  useEffect(() => {
    checkOverflow();
    const handleResize = () => checkOverflow();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkOverflow, ...dependencies]);

  // Main continuous auto-scroll animation loop
  useEffect(() => {
    if (!isAutoScrolling) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const scrollStep = (currentTime: number) => {
      const el = containerRef.current;
      if (!el) {
        animationFrameRef.current = requestAnimationFrame(scrollStep);
        return;
      }

      if (!lastTimeRef.current) {
        lastTimeRef.current = currentTime;
      }

      const deltaTime = (currentTime - lastTimeRef.current) / 1000;
      lastTimeRef.current = currentTime;

      const maxScroll = el.scrollHeight - el.clientHeight;
      if (maxScroll <= 5) {
        setIsOverflowing(false);
        setScrollProgress(0);
        animationFrameRef.current = requestAnimationFrame(scrollStep);
        return;
      } else {
        setIsOverflowing(true);
      }

      // Track progress (0 to 100)
      const currentProgress = maxScroll > 0 ? Math.min(100, Math.max(0, (el.scrollTop / maxScroll) * 100)) : 0;
      setScrollProgress(Math.round(currentProgress));

      // If user is hovering or manually interacting, do not advance
      if (isUserInteractingRef.current) {
        setIsPaused(true);
        animationFrameRef.current = requestAnimationFrame(scrollStep);
        return;
      }

      // Handle pause timers (at top or bottom)
      if (pauseStateRef.current.isPausing) {
        setIsPaused(true);
        if (Date.now() >= pauseStateRef.current.resumeAt) {
          pauseStateRef.current.isPausing = false;
          setIsPaused(false);
        } else {
          animationFrameRef.current = requestAnimationFrame(scrollStep);
          return;
        }
      } else {
        setIsPaused(false);
      }

      // Move scroll position
      const pixelsPerSec = SPEED_CONFIG[currentSpeed] || SPEED_CONFIG.normal;
      const scrollDelta = pixelsPerSec * deltaTime;

      if (directionRef.current === 'down') {
        const nextScrollTop = el.scrollTop + scrollDelta;

        if (nextScrollTop >= maxScroll - 2) {
          // Reached bottom
          el.scrollTop = maxScroll;
          pauseStateRef.current = {
            isPausing: true,
            resumeAt: Date.now() + bottomPauseMs
          };
          directionRef.current = 'reset';
        } else {
          el.scrollTop = nextScrollTop;
        }
      } else if (directionRef.current === 'reset') {
        // Smoothly return to top or reset
        el.scrollTo({ top: 0, behavior: 'smooth' });
        pauseStateRef.current = {
          isPausing: true,
          resumeAt: Date.now() + topPauseMs
        };
        directionRef.current = 'down';
      }

      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    lastTimeRef.current = null;
    animationFrameRef.current = requestAnimationFrame(scrollStep);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isAutoScrolling, currentSpeed, bottomPauseMs, topPauseMs, ...dependencies]);

  // User interaction listeners (pause on mouse hover / wheel / touch)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onMouseEnter = () => {
      if (pauseOnHover) {
        isUserInteractingRef.current = true;
        setIsPaused(true);
      }
    };

    const onMouseLeave = () => {
      if (pauseOnHover) {
        isUserInteractingRef.current = false;
        setIsPaused(false);
        lastTimeRef.current = null;
      }
    };

    const onUserScroll = () => {
      isUserInteractingRef.current = true;
      setIsPaused(true);
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
      userInteractionTimeoutRef.current = setTimeout(() => {
        isUserInteractingRef.current = false;
        setIsPaused(false);
        lastTimeRef.current = null;
      }, 3000);
    };

    el.addEventListener('mouseenter', onMouseEnter);
    el.addEventListener('mouseleave', onMouseLeave);
    el.addEventListener('wheel', onUserScroll, { passive: true });
    el.addEventListener('touchstart', onUserScroll, { passive: true });

    return () => {
      el.removeEventListener('mouseenter', onMouseEnter);
      el.removeEventListener('mouseleave', onMouseLeave);
      el.removeEventListener('wheel', onUserScroll);
      el.removeEventListener('touchstart', onUserScroll);
      if (userInteractionTimeoutRef.current) {
        clearTimeout(userInteractionTimeoutRef.current);
      }
    };
  }, [pauseOnHover]);

  const toggleAutoScroll = useCallback(() => {
    setIsAutoScrolling(prev => !prev);
    lastTimeRef.current = null;
  }, []);

  const resetToTop = useCallback(() => {
    const el = containerRef.current;
    if (el) {
      el.scrollTo({ top: 0, behavior: 'smooth' });
      pauseStateRef.current = { isPausing: true, resumeAt: Date.now() + 1000 };
      directionRef.current = 'down';
    }
  }, []);

  return {
    containerRef,
    isAutoScrolling,
    setIsAutoScrolling,
    toggleAutoScroll,
    currentSpeed,
    setCurrentSpeed,
    isPaused,
    isOverflowing,
    scrollProgress,
    resetToTop
  };
}
