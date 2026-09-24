import React, { useState, useEffect } from 'react';
import { useAnimationControl } from '../contexts/AnimationControlContext';

interface RotatingSplitBackgroundProps {
  durationSeconds?: number;
  darkColor?: string;
  lightColor?: string;
  opacity?: number;
  startAngle?: number;
  isFixed?: boolean;
  className?: string;
}

export const RotatingSplitBackground: React.FC<RotatingSplitBackgroundProps> = ({
  durationSeconds = 10,
  darkColor = '#190839',
  lightColor = '#F7CAC9',
  opacity = 0.08,
  startAngle = 0,
  isFixed = true,
  className = '',
}) => {
  const { isAnimationsPaused } = useAnimationControl();

  // Check for URL param ?splitDebug=1
  const [isDebug, setIsDebug] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const params = new URLSearchParams(window.location.search);
    return params.get('splitDebug') === '1';
  });

  useEffect(() => {
    const checkDebugParam = () => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        setIsDebug(params.get('splitDebug') === '1');
      }
    };

    checkDebugParam();
    window.addEventListener('popstate', checkDebugParam);
    return () => window.removeEventListener('popstate', checkDebugParam);
  }, []);

  const effectiveOpacity = isDebug ? 1 : opacity;

  return (
    <div
      className={`split-bg ${className}`}
      style={
        {
          '--split-dark': darkColor,
          '--split-light': lightColor,
          '--split-opacity': effectiveOpacity,
          position: isFixed ? 'fixed' : 'absolute',
          inset: 0,
          zIndex: 0,
          pointerEvents: 'none',
          overflow: 'hidden',
          opacity: effectiveOpacity,
        } as React.CSSProperties
      }
      aria-hidden="true"
      data-split-debug={isDebug ? '1' : '0'}
    >
      <div
        className="split-bg__disc"
        style={
          {
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '150vmax',
            height: '150vmax',
            margin: '-75vmax 0 0 -75vmax',
            background: 'linear-gradient(to bottom, var(--split-dark) 50%, var(--split-light) 50%)',
            transformOrigin: '50% 50%',
            animationName: isAnimationsPaused ? 'none' : 'split-spin',
            animationDuration: `${durationSeconds}s`,
            animationTimingFunction: 'linear',
            animationIterationCount: 'infinite',
            willChange: isAnimationsPaused ? 'auto' : 'transform',
            transform: `rotate(${startAngle}deg)`,
          } as React.CSSProperties
        }
      />
    </div>
  );
};

export default RotatingSplitBackground;
