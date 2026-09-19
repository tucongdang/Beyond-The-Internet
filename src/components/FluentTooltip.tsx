import React from 'react';
import { useFluentTooltip, FluentTooltipState, TooltipPlacement } from '../hooks/useFluentTooltip';

export interface FluentTooltipProps {
  /**
   * Optional controlled state. If not provided, FluentTooltip connects
   * directly to the global `useFluentTooltip` hook.
   */
  state?: FluentTooltipState;
  /**
   * Optional wrapper children if used as a declarative JSX wrapper
   */
  children?: React.ReactNode;
  content?: string;
  title?: string;
  hotkey?: string;
  placement?: TooltipPlacement;
  variant?: 'default' | 'accent' | 'success' | 'danger' | 'warning';
  className?: string;
}

export const FluentTooltip: React.FC<FluentTooltipProps> = ({
  state: externalState,
  children,
  content,
  title,
  hotkey,
  placement = 'top',
  variant = 'default',
  className = ''
}) => {
  const internalHook = useFluentTooltip();
  const state = externalState || internalHook.tooltipState;

  // Wrapper mode: if children are passed, wrap them with tooltip data attributes
  if (children) {
    return (
      <span
        className={`has-tooltip inline-flex items-center ${className}`}
        data-tooltip={content}
        data-tooltip-title={title}
        data-tooltip-hotkey={hotkey}
        data-tooltip-placement={placement}
        data-tooltip-variant={variant}
      >
        {children}
      </span>
    );
  }

  // Overlay tooltip rendering
  if (!state || !state.isOpen || !state.content) {
    return null;
  }

  const { x, y, placement: currentPlacement, arrowOffset, title: stateTitle, content: stateContent, hotkey: stateHotkey, variant: stateVariant } = state;

  // Transform styles depending on placement
  let transformStyle = '';
  switch (currentPlacement) {
    case 'top':
      transformStyle = 'translate(-50%, -100%)';
      break;
    case 'bottom':
      transformStyle = 'translate(-50%, 0%)';
      break;
    case 'left':
      transformStyle = 'translate(-100%, -50%)';
      break;
    case 'right':
      transformStyle = 'translate(0%, -50%)';
      break;
  }

  // Indicator Caret / Arrow positioning
  const renderArrow = () => {
    const baseArrowClasses = "absolute w-2 h-2 rotate-45 pointer-events-none bg-[#15072c] border-white/20";
    
    switch (currentPlacement) {
      case 'top':
        return (
          <div
            className={`${baseArrowClasses} border-r border-b -bottom-1`}
            style={{
              left: `calc(50% + ${arrowOffset}px)`,
              transform: 'translateX(-50%) rotate(45deg)'
            }}
          />
        );
      case 'bottom':
        return (
          <div
            className={`${baseArrowClasses} border-l border-t -top-1`}
            style={{
              left: `calc(50% + ${arrowOffset}px)`,
              transform: 'translateX(-50%) rotate(45deg)'
            }}
          />
        );
      case 'left':
        return (
          <div
            className={`${baseArrowClasses} border-t border-r -right-1`}
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)'
            }}
          />
        );
      case 'right':
        return (
          <div
            className={`${baseArrowClasses} border-b border-l -left-1`}
            style={{
              top: '50%',
              transform: 'translateY(-50%) rotate(45deg)'
            }}
          />
        );
    }
  };

  const getVariantStyles = () => {
    switch (stateVariant) {
      case 'accent':
        return 'border-cyan-500/40 text-cyan-100 shadow-cyan-950/40';
      case 'success':
        return 'border-emerald-500/40 text-emerald-100 shadow-emerald-950/40';
      case 'danger':
        return 'border-rose-500/40 text-rose-100 shadow-rose-950/40';
      case 'warning':
        return 'border-amber-500/40 text-amber-100 shadow-amber-950/40';
      default:
        return 'border-white/15 text-white/95';
    }
  };

  return (
    <div
      id="fluent-ui-tooltip-portal"
      className="fixed z-[9999] pointer-events-none select-none transition-all duration-150 ease-out animate-fadeIn"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        transform: transformStyle
      }}
    >
      <div
        className={`relative px-2.5 py-1.5 max-w-[280px] text-xs font-sans rounded-[2px] border shadow-2xl backdrop-blur-md transition-all ${getVariantStyles()}`}
        style={{
          // Fluent UI 2 Acrylic surface matching .fluent-box
          background: 'rgba(21, 7, 44, 0.95)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
          borderRadius: '2px',
          boxShadow: '0 8px 24px -2px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
        }}
      >
        {renderArrow()}

        <div className="flex flex-col gap-0.5 relative z-10">
          {stateTitle && (
            <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-purple-300 flex items-center justify-between gap-2 border-b border-white/10 pb-0.5 mb-0.5">
              <span>{stateTitle}</span>
              {stateHotkey && (
                <kbd className="px-1 py-0.2 rounded-[2px] bg-white/10 border border-white/15 text-[9px] font-mono text-purple-200 font-normal">
                  {stateHotkey}
                </kbd>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-2.5">
            <span className="leading-snug text-white/90 text-[11px] break-words">
              {stateContent}
            </span>

            {!stateTitle && stateHotkey && (
              <kbd className="shrink-0 px-1.5 py-0.5 rounded-[2px] bg-white/10 border border-white/15 text-[9px] font-mono text-purple-200 shadow-sm">
                {stateHotkey}
              </kbd>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
