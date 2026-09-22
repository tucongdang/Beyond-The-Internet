import React, { useState, useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { CSSProperties, RefObject } from 'react';

export interface UseAdaptiveFontSizeOptions {
  /** The text content to fit. Can also be passed as the first parameter to the hook. */
  text?: string;
  /** Minimum allowable font size in pixels. Default: 14 */
  minFontSize?: number;
  /** Maximum allowable font size in pixels. Default: 36 */
  maxFontSize?: number;
  /** Line-height multiplier ratio. Default: 1.35 */
  lineHeight?: number;
  /** Alias for lineHeight */
  lineHeightRatio?: number;
  /** Explicit maximum container or box height constraint in pixels. */
  maxHeight?: number;
  /** Maximum allowed line count before constraining font size. */
  maxLines?: number;
  /** Whether to respect the container's clientHeight to prevent vertical overflow. Default: false */
  checkHeight?: boolean;
  /** Alias for checkHeight */
  checkContainerHeight?: boolean;
  /** Custom container ref if provided by the caller. */
  containerRef?: RefObject<HTMLElement | null>;
  /** Custom text element ref if provided by the caller. */
  textRef?: RefObject<HTMLElement | null>;
  /** Whether automatic calculation is active. Default: true */
  enabled?: boolean;
  /** Fallback font size when container is not yet measured. Default: 20 */
  defaultFontSize?: number;
}

export interface AdaptiveFontSizeResult {
  /** The calculated optimal font size in numeric pixels (e.g. 24) */
  fontSize: number;
  /** The font size formatted as CSS string (e.g. "24px") */
  fontSizePx: string;
  /** Ref to attach to the container element wrapping the text */
  containerRef: RefObject<any>;
  /** Ref to attach directly to the question text or heading element */
  textRef: RefObject<any>;
  /** CSS properties ready to spread onto the text element */
  style: CSSProperties;
  /** True when the font has scaled down to or near minFontSize */
  isCompact: boolean;
  /** The latest measured container width in pixels */
  containerWidth: number;
  /** Function to trigger an immediate re-measurement */
  recalculate: () => void;
}

// Hidden measurement probe in DOM to calculate accurate wrapping without screen flicker
let sharedProbe: HTMLDivElement | null = null;

function getSharedProbe(): HTMLDivElement | null {
  if (typeof document === 'undefined') return null;
  if (!sharedProbe) {
    sharedProbe = document.createElement('div');
    sharedProbe.setAttribute('aria-hidden', 'true');
    sharedProbe.style.position = 'fixed';
    sharedProbe.style.left = '-99999px';
    sharedProbe.style.top = '-99999px';
    sharedProbe.style.visibility = 'hidden';
    sharedProbe.style.pointerEvents = 'none';
    sharedProbe.style.zIndex = '-9999';
    sharedProbe.style.whiteSpace = 'normal';
    sharedProbe.style.wordBreak = 'break-word';
    sharedProbe.style.overflowWrap = 'break-word';
    sharedProbe.style.boxSizing = 'border-box';
    document.body.appendChild(sharedProbe);
  }
  return sharedProbe;
}

/**
 * Custom React hook that monitors container width via ResizeObserver
 * and dynamically calculates the optimal font size for question text,
 * guaranteeing it stays within bounds without overflowing.
 *
 * Usage:
 * ```tsx
 * const { containerRef, textRef, style, fontSizePx } = useAdaptiveFontSize(questionText, {
 *   minFontSize: 16,
 *   maxFontSize: 40
 * });
 *
 * return (
 *   <div ref={containerRef} className="w-full">
 *     <h2 ref={textRef} style={style}>{questionText}</h2>
 *   </div>
 * );
 * ```
 */
export function useAdaptiveFontSize(
  textOrOptions: string | UseAdaptiveFontSizeOptions,
  optionalOptions?: Omit<UseAdaptiveFontSizeOptions, 'text'>
): AdaptiveFontSizeResult {
  const options: UseAdaptiveFontSizeOptions =
    typeof textOrOptions === 'string'
      ? { text: textOrOptions, ...optionalOptions }
      : textOrOptions;

  const {
    text = '',
    minFontSize = 14,
    maxFontSize = 36,
    lineHeight: customLineHeight,
    lineHeightRatio,
    maxHeight,
    maxLines,
    checkHeight: customCheckHeight,
    checkContainerHeight,
    containerRef: customContainerRef,
    textRef: customTextRef,
    enabled = true,
    defaultFontSize = 20
  } = options;

  const lineHeight = customLineHeight ?? lineHeightRatio ?? 1.35;
  const checkHeight = customCheckHeight ?? checkContainerHeight ?? false;

  const defaultContainerRef = useRef<HTMLElement | null>(null);
  const defaultTextRef = useRef<HTMLElement | null>(null);

  const containerRef = customContainerRef || defaultContainerRef;
  const textRef = customTextRef || defaultTextRef;

  // Initial estimate to prevent visual layout jump before ResizeObserver fires
  const [fontSize, setFontSize] = useState<number>(() => {
    if (!text) return defaultFontSize;
    const len = text.length;
    if (len < 50) return Math.min(maxFontSize, Math.max(minFontSize, 28));
    if (len < 120) return Math.min(maxFontSize, Math.max(minFontSize, 22));
    if (len < 200) return Math.min(maxFontSize, Math.max(minFontSize, 18));
    return minFontSize;
  });

  const [containerWidth, setContainerWidth] = useState<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const computeOptimalFontSize = useCallback(() => {
    if (!enabled || typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    // Calculate actual inner width taking container padding into account
    const computedStyle = window.getComputedStyle(container);
    const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
    const paddingRight = parseFloat(computedStyle.paddingRight) || 0;
    const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
    const paddingBottom = parseFloat(computedStyle.paddingBottom) || 0;

    const availableWidth = Math.max(20, container.clientWidth - paddingLeft - paddingRight);
    setContainerWidth(availableWidth);

    if (!text.trim()) {
      setFontSize(maxFontSize);
      return;
    }

    // Determine available vertical space if constrained
    let availableHeight: number | undefined = maxHeight;
    if (!availableHeight && checkHeight && container.clientHeight > 0) {
      availableHeight = Math.max(24, container.clientHeight - paddingTop - paddingBottom);
    }

    const probe = getSharedProbe();
    if (!probe) {
      // Fallback mathematical ratio if measurement probe is unavailable
      const len = text.length;
      const target = Math.max(
        minFontSize,
        Math.min(
          maxFontSize,
          Math.round((availableWidth / Math.max(10, Math.sqrt(len) * 3)) * 1.8)
        )
      );
      setFontSize(target);
      return;
    }

    // Mirror styling from the actual text element
    const sourceEl = textRef.current || container;
    const sourceStyle = window.getComputedStyle(sourceEl);

    probe.style.fontFamily = sourceStyle.fontFamily;
    probe.style.fontWeight = sourceStyle.fontWeight;
    probe.style.letterSpacing = sourceStyle.letterSpacing;
    probe.style.lineHeight = String(lineHeight);
    probe.style.width = `${availableWidth}px`;
    probe.innerText = text;

    // Binary search for maximum font size that does not overflow availableWidth or availableHeight
    let low = Math.floor(minFontSize);
    let high = Math.floor(maxFontSize);
    let bestFit = low;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      probe.style.fontSize = `${mid}px`;

      // Allow 2px sub-pixel rounding tolerance
      const fitsWidth = probe.scrollWidth <= availableWidth + 2;
      const currentHeight = probe.scrollHeight;
      const fitsHeight = availableHeight ? currentHeight <= availableHeight + 2 : true;

      const approxLineHeight = mid * lineHeight;
      const estimatedLines = Math.round(currentHeight / approxLineHeight);
      const fitsLines = maxLines ? estimatedLines <= maxLines : true;

      if (fitsWidth && fitsHeight && fitsLines) {
        bestFit = mid;
        low = mid + 1; // Try larger font size
      } else {
        high = mid - 1; // Fit failed, scale down
      }
    }

    const finalSize = Math.max(minFontSize, Math.min(maxFontSize, bestFit));
    setFontSize(finalSize);

    // Apply directly to textRef element style if mounted to avoid re-render lag
    if (textRef.current) {
      textRef.current.style.fontSize = `${finalSize}px`;
    }
  }, [
    text,
    minFontSize,
    maxFontSize,
    lineHeight,
    maxHeight,
    maxLines,
    checkHeight,
    enabled,
    containerRef,
    textRef
  ]);

  const scheduleCompute = useCallback(() => {
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
    }
    rafIdRef.current = requestAnimationFrame(() => {
      computeOptimalFontSize();
    });
  }, [computeOptimalFontSize]);

  // Initial computation on DOM mount / layout change
  useLayoutEffect(() => {
    scheduleCompute();
  }, [scheduleCompute]);

  // ResizeObserver to monitor container width changes in real time
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const container = containerRef.current;
    if (!container) return;

    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            scheduleCompute();
          }
        }
      });
      observer.observe(container);
    }

    // Additional listeners for window resize & device orientation change
    const onResize = () => scheduleCompute();
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });

    return () => {
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
      }
    };
  }, [enabled, containerRef, scheduleCompute]);

  return {
    fontSize,
    fontSizePx: `${fontSize}px`,
    containerRef,
    textRef,
    style: {
      fontSize: `${fontSize}px`,
      wordBreak: 'break-word',
      overflowWrap: 'break-word'
    },
    isCompact: fontSize <= minFontSize + 2,
    containerWidth,
    recalculate: scheduleCompute
  };
}

export default useAdaptiveFontSize;
