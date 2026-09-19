import { useState, useEffect, useRef, useCallback } from 'react';

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right';

export interface FluentTooltipData {
  content: string;
  title?: string;
  hotkey?: string;
  placement?: TooltipPlacement;
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'warning';
}

export interface FluentTooltipState extends FluentTooltipData {
  isOpen: boolean;
  x: number;
  y: number;
  placement: TooltipPlacement;
  arrowOffset: number;
}

const DEFAULT_STATE: FluentTooltipState = {
  isOpen: false,
  content: '',
  title: undefined,
  hotkey: undefined,
  placement: 'top',
  variant: 'default',
  x: 0,
  y: 0,
  arrowOffset: 0
};

// Tooltip dimensions estimation for boundary detection
const ESTIMATED_TOOLTIP_WIDTH = 220;
const ESTIMATED_TOOLTIP_HEIGHT = 44;
const VIEWPORT_PADDING = 12;
const GAP_OFFSET = 8;

/**
 * useFluentTooltip - Custom React hook for managing Fluent UI 2 styled tooltips
 * 
 * Automatically captures hover / focus on any DOM element with the `.has-tooltip` class,
 * computes optimal viewport-aware positions, handles hotkeys and titles, and provides
 * smooth opening/closing transitions.
 */
export function useFluentTooltip(containerRef?: React.RefObject<HTMLElement | null>) {
  const [tooltipState, setTooltipState] = useState<FluentTooltipState>(DEFAULT_STATE);
  const showTimeoutRef = useRef<number | null>(null);
  const hideTimeoutRef = useRef<number | null>(null);
  const currentTargetRef = useRef<HTMLElement | null>(null);
  const isRecentHoverRef = useRef<boolean>(false);
  const recentHoverTimerRef = useRef<number | null>(null);

  const calculatePosition = useCallback((
    target: HTMLElement,
    preferredPlacement: TooltipPlacement = 'top'
  ): { x: number; y: number; actualPlacement: TooltipPlacement; arrowOffset: number } => {
    if (!target || typeof target.getBoundingClientRect !== 'function') {
      return { x: 0, y: 0, actualPlacement: preferredPlacement, arrowOffset: 0 };
    }
    const rect = target.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset || 0;
    const scrollY = window.scrollY || window.pageYOffset || 0;

    const targetCenter = {
      x: rect.left + rect.width / 2 + scrollX,
      y: rect.top + rect.height / 2 + scrollY
    };

    let actualPlacement = preferredPlacement;

    // Viewport collision checks for auto-flipping
    if (actualPlacement === 'top' && rect.top - ESTIMATED_TOOLTIP_HEIGHT - GAP_OFFSET < VIEWPORT_PADDING) {
      actualPlacement = 'bottom';
    } else if (actualPlacement === 'bottom' && rect.bottom + ESTIMATED_TOOLTIP_HEIGHT + GAP_OFFSET > window.innerHeight - VIEWPORT_PADDING) {
      actualPlacement = 'top';
    } else if (actualPlacement === 'left' && rect.left - ESTIMATED_TOOLTIP_WIDTH - GAP_OFFSET < VIEWPORT_PADDING) {
      actualPlacement = 'right';
    } else if (actualPlacement === 'right' && rect.right + ESTIMATED_TOOLTIP_WIDTH + GAP_OFFSET > window.innerWidth - VIEWPORT_PADDING) {
      actualPlacement = 'left';
    }

    let x = 0;
    let y = 0;

    switch (actualPlacement) {
      case 'top':
        x = targetCenter.x;
        y = rect.top + scrollY - GAP_OFFSET;
        break;
      case 'bottom':
        x = targetCenter.x;
        y = rect.bottom + scrollY + GAP_OFFSET;
        break;
      case 'left':
        x = rect.left + scrollX - GAP_OFFSET;
        y = targetCenter.y;
        break;
      case 'right':
        x = rect.right + scrollX + GAP_OFFSET;
        y = targetCenter.y;
        break;
    }

    // Clamp horizontal position so tooltip doesn't overflow viewport edges
    const minX = VIEWPORT_PADDING + ESTIMATED_TOOLTIP_WIDTH / 2;
    const maxX = window.innerWidth - VIEWPORT_PADDING - ESTIMATED_TOOLTIP_WIDTH / 2;
    const clampedX = Math.max(minX, Math.min(maxX, x));
    const arrowOffset = x - clampedX; // calculate arrow shift if tooltip was clamped

    return {
      x: clampedX,
      y,
      actualPlacement,
      arrowOffset
    };
  }, []);

  const hideTooltip = useCallback((immediate: boolean = false) => {
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }

    const doHide = () => {
      // Restore native title attribute if it was saved
      if (currentTargetRef.current && currentTargetRef.current.hasAttribute('data-original-title')) {
        const originalTitle = currentTargetRef.current.getAttribute('data-original-title');
        if (originalTitle) {
          currentTargetRef.current.setAttribute('title', originalTitle);
        }
        currentTargetRef.current.removeAttribute('data-original-title');
      }
      currentTargetRef.current = null;
      setTooltipState((prev) => (prev.isOpen ? { ...prev, isOpen: false } : prev));
    };

    if (immediate) {
      doHide();
    } else {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = window.setTimeout(doHide, 50);
    }

    // Keep warm-up state active for 500ms so moving between adjacent tooltips is instant
    isRecentHoverRef.current = true;
    if (recentHoverTimerRef.current) clearTimeout(recentHoverTimerRef.current);
    recentHoverTimerRef.current = window.setTimeout(() => {
      isRecentHoverRef.current = false;
    }, 500);
  }, []);

  const showTooltipForElement = useCallback((target: HTMLElement) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    currentTargetRef.current = target;

    // Suppress default native browser tooltip if 'title' attribute exists
    if (target.hasAttribute('title')) {
      const nativeTitle = target.getAttribute('title') || '';
      target.setAttribute('data-original-title', nativeTitle);
      target.removeAttribute('title');
    }

    const content =
      target.getAttribute('data-tooltip') ||
      target.getAttribute('data-tooltip-content') ||
      target.getAttribute('data-original-title') ||
      target.getAttribute('aria-label') ||
      '';

    if (!content.trim()) return;

    const title = target.getAttribute('data-tooltip-title') || undefined;
    const hotkey = target.getAttribute('data-tooltip-hotkey') || undefined;
    const rawPlacement = (target.getAttribute('data-tooltip-placement') ||
      target.getAttribute('data-placement') ||
      'top') as TooltipPlacement;
    const variant = (target.getAttribute('data-tooltip-variant') || 'default') as FluentTooltipData['variant'];

    const delay = isRecentHoverRef.current
      ? 40
      : parseInt(target.getAttribute('data-tooltip-delay') || '150', 10);

    const trigger = () => {
      if (currentTargetRef.current !== target) return;
      const { x, y, actualPlacement, arrowOffset } = calculatePosition(target, rawPlacement);

      setTooltipState({
        isOpen: true,
        content,
        title,
        hotkey,
        placement: actualPlacement,
        variant,
        x,
        y,
        arrowOffset
      });
    };

    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);

    if (delay <= 0) {
      trigger();
    } else {
      showTimeoutRef.current = window.setTimeout(trigger, delay);
    }
  }, [calculatePosition]);

  useEffect(() => {
    const root = containerRef?.current || document;

    const handleMouseOver = (e: MouseEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('.has-tooltip, [data-tooltip]') as HTMLElement | null;
      if (target) {
        showTooltipForElement(target);
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const related = e.relatedTarget as HTMLElement | null;
      const currentTooltipTarget = currentTargetRef.current;

      if (!currentTooltipTarget) return;

      // If moving within the same target or inside the tooltip container, do not close
      if (related && (currentTooltipTarget.contains(related) || currentTooltipTarget === related)) {
        return;
      }

      hideTooltip(false);
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = (e.target as HTMLElement)?.closest?.('.has-tooltip, [data-tooltip]') as HTMLElement | null;
      if (target) {
        showTooltipForElement(target);
      }
    };

    const handleFocusOut = () => {
      hideTooltip(true);
    };

    const handleScroll = () => {
      if (tooltipState.isOpen) {
        hideTooltip(true);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        hideTooltip(true);
      }
    };

    root.addEventListener('mouseover', handleMouseOver as EventListener, true);
    root.addEventListener('mouseout', handleMouseOut as EventListener, true);
    root.addEventListener('focusin', handleFocusIn as EventListener, true);
    root.addEventListener('focusout', handleFocusOut as EventListener, true);
    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      root.removeEventListener('mouseover', handleMouseOver as EventListener, true);
      root.removeEventListener('mouseout', handleMouseOut as EventListener, true);
      root.removeEventListener('focusin', handleFocusIn as EventListener, true);
      root.removeEventListener('focusout', handleFocusOut as EventListener, true);
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleKeyDown, true);

      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current);
      if (recentHoverTimerRef.current) clearTimeout(recentHoverTimerRef.current);
    };
  }, [containerRef, showTooltipForElement, hideTooltip, tooltipState.isOpen]);

  return {
    tooltipState,
    hideTooltip,
    showTooltipForElement,
    setTooltipState
  };
}
