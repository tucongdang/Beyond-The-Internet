import { useLanguage } from '../hooks/useLanguage';
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Clock, Flame, Timer, AlertCircle, Sparkles } from 'lucide-react';
import { interpolateTimerColor } from '../utils/colorUtils';
import { syncService } from '../services/syncService';
import { GameState } from '../types';

export interface SlantedCountdownBarProps {
  progressPercent: number;
  timerColor?: string;
  heightClass?: string;
  isUrgent?: boolean;
  className?: string;
}

export const SlantedCountdownBar: React.FC<SlantedCountdownBarProps> = ({
  progressPercent,
  timerColor,
  heightClass = 'h-3.5 sm:h-4',
  isUrgent = false,
  className = ''
}) => {
  const safePercent = Math.max(0, Math.min(100, progressPercent));

  return (
    <div className={`w-full relative py-0.5 ${className}`}>
      {/* Slanted Parallelogram Container with Skew -12deg matching video motion */}
      <div className={`w-full ${heightClass} bg-[#0c081e] border border-purple-500/40 rounded-[2px] overflow-hidden transform -skew-x-12 shadow-[0_0_15px_rgba(12,8,30,0.8)_inset] relative`}>
        {/* Active Filled Section (Purple / Dynamic Timer Gradient) */}
        <div
          className={`h-full transition-all duration-200 ease-linear relative overflow-hidden ${
            isUrgent ? 'animate-pulse shadow-[0_0_16px_rgba(244,63,94,0.9)]' : 'shadow-[0_0_14px_rgba(147,51,234,0.7)]'
          }`}
          style={{
            width: `${safePercent}%`,
            background: isUrgent && timerColor
              ? timerColor
              : 'linear-gradient(90deg, #4c1d95 0%, #7c3aed 45%, #9333ea 80%, #a855f7 100%)',
          }}
        >
          {/* Shimmer light effect sliding across fill */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />

          {/* Sharp glowing slant boundary edge at the right split point */}
          <div 
            className="absolute top-0 right-0 bottom-0 w-1.5 transform translate-x-1/2 z-10"
            style={{
              backgroundColor: isUrgent ? '#fecdd3' : '#f3e8ff',
              boxShadow: isUrgent ? '0 0 10px #f43f5e, 0 0 4px #ffffff' : '0 0 10px #c084fc, 0 0 4px #ffffff'
            }}
          />
        </div>

        {/* Subtle background mesh texture */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:8px_8px]" />
      </div>
    </div>
  );
};

export type CountdownTimerVariant = 'full' | 'compact' | 'badge' | 'bar' | 'circular';

export interface CountdownTimerProps {

  /** Explicit remaining time in seconds (if controlled by parent) */
  timeLeft?: number;
  /** Total time limit in seconds */
  totalTime?: number;
  /** Optional GameState to auto-calculate synchronized time */
  gameState?: GameState;
  /** Display variant: 'full' | 'compact' | 'badge' | 'bar' | 'circular' */
  variant?: CountdownTimerVariant;
  /** Whether the current question is from a speed/tang-toc round */
  isTTRound?: boolean;
  /** Custom label to show beside timer (e.g. Round name or localLanguage !== 'vi' ? 'Answer time' : 'Thời gian trả lời') */
  label?: string;
  /** Sub-label or extra status text */
  subLabel?: string;
  /** Extra CSS classes */
  className?: string;
  /** Callback fired when timer reaches 0 */
  onTimeUp?: () => void;
  /** Whether to show audio tick or visual urgent pulses */
  showUrgentAnimations?: boolean;
  /** Custom children or action buttons to render in full variant */
  children?: React.ReactNode;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timeLeft: propTimeLeft,
  totalTime: propTotalTime,
  gameState,
  variant = 'full',
  isTTRound: propIsTTRound,
  label,
  subLabel,
  className = '',
  onTimeUp,
  showUrgentAnimations = true,
  children
}) => {
  const { localLanguage } = useLanguage();

  // Determine if time should be calculated internally from gameState
  const [internalTimeLeft, setInternalTimeLeft] = useState<number>(() => {
    if (typeof propTimeLeft === 'number') return propTimeLeft;
    if (gameState) return gameState.time_limit || 15;
    return 15;
  });

  const isControlled = typeof propTimeLeft === 'number';
  const effectiveTotal = Math.max(1, Number(propTotalTime || gameState?.time_limit) || 15);

  // Sync internal timer with gameState if not controlled
  useEffect(() => {
    if (isControlled || !gameState) return;

    if (gameState.status !== 'ACTIVE') {
      setInternalTimeLeft(gameState.time_limit || 15);
      return;
    }

    const computeTime = () => {
      if (gameState.is_timer_paused) {
        return typeof gameState.paused_remaining_seconds === 'number'
          ? Math.max(0, gameState.paused_remaining_seconds)
          : gameState.time_limit || 15;
      }
      if (!gameState.server_start_time) {
        return gameState.time_limit || 15;
      }
      const now = syncService.getSynchronizedNow();
      const elapsedSec = Math.floor((now - gameState.server_start_time) / 1000);
      const remaining = Math.max(0, (gameState.time_limit || 15) - elapsedSec);
      return remaining;
    };

    setInternalTimeLeft(computeTime());

    if (gameState.is_timer_paused) {
      return;
    }

    const interval = setInterval(() => {
      const remaining = computeTime();
      setInternalTimeLeft(remaining);
      if (remaining === 0 && onTimeUp) {
        onTimeUp();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isControlled, gameState?.status, gameState?.server_start_time, gameState?.time_limit, gameState?.is_timer_paused, gameState?.paused_remaining_seconds, onTimeUp]);

  const currentSeconds = isControlled ? propTimeLeft! : internalTimeLeft;
  const isTTRound = propIsTTRound ?? (
    gameState?.round_type === 'ELIMINATION_6' ||
    gameState?.round_type === 'SEQUENCING' ||
    gameState?.round_name?.includes('Tăng tốc') ||
    gameState?.question_id?.startsWith('TT')
  );

  const prevSecondsRef = useRef<number>(currentSeconds);
  useEffect(() => {
    if (prevSecondsRef.current > 0 && currentSeconds === 0 && onTimeUp) {
      onTimeUp();
    }
    prevSecondsRef.current = currentSeconds;
  }, [currentSeconds, onTimeUp]);

  // Calculations
  const progressPercent = Math.max(0, Math.min(100, (currentSeconds / (effectiveTotal || 1)) * 100));
  const isUrgent = showUrgentAnimations && currentSeconds <= 5 && currentSeconds > 0;
  const isCritical = showUrgentAnimations && currentSeconds <= 3 && currentSeconds > 0;
  const isExpired = currentSeconds <= 0;

  const timerColor = useMemo(() => interpolateTimerColor(progressPercent), [progressPercent]);

  // Variant 1: Progress Bar Only
  if (variant === 'bar') {
    return (
      <SlantedCountdownBar
        progressPercent={progressPercent}
        timerColor={timerColor}
        isUrgent={isUrgent}
        className={className}
      />
    );
  }

  // Variant 2: Badge Only
  if (variant === 'badge') {
    return (
      <div
        role="timer"
        aria-live="polite"
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] font-mono text-sm font-black border transition-all select-none ${
          isCritical
            ? 'bg-rose-950/80 border-rose-500 text-rose-400 scale-105 animate-bounce shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/40'
            : isUrgent
            ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse shadow-md shadow-amber-500/20 ring-2 ring-amber-500/40'
            : isTTRound
            ? 'fluent-acrylic-surface border-amber-500/40 text-amber-300'
            : 'fluent-box-nested text-[#FCEEEC] border-white/15'
        } ${className}`}
      >
        {isTTRound ? (
          <Flame
            className={`w-4 h-4 shrink-0 ${
              isUrgent ? 'text-rose-400 fill-current animate-pulse' : 'text-amber-400 fill-current'
            }`}
          />
        ) : (
          <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? 'text-amber-300 animate-spin-slow' : 'text-[#F7CAC9]'}`} />
        )}
        <span>{currentSeconds}s</span>
      </div>
    );
  }

  // Variant 3: Circular Ring
  if (variant === 'circular') {
    const radius = 24;
    const circumference = 2 * Math.PI * radius;
    const rawOffset = circumference - (progressPercent / 100) * circumference;
    const strokeDashoffset = Number.isFinite(rawOffset) ? rawOffset : 0;

    return (
      <div className={`relative inline-flex items-center justify-center select-none ${className}`}>
        <svg className="w-16 h-16 transform -rotate-90">
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="4"
            fill="transparent"
          />
          <circle
            cx="32"
            cy="32"
            r={radius}
            stroke={timerColor}
            strokeWidth="4"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            className="transition-all duration-300 ease-linear"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`font-mono text-base font-black ${
            isCritical ? 'text-rose-400 animate-pulse' : isUrgent ? 'text-amber-300' : 'text-white'
          }`}>
            {currentSeconds}
          </span>
          <span className="text-[9px] font-mono text-white/50 -mt-1">s</span>
        </div>
      </div>
    );
  }

  // Variant 4: Compact Capsule
  if (variant === 'compact') {
    return (
      <div className={`w-full fluent-box rounded-[2px] p-2.5 sm:p-3 border border-white/10 text-white shadow-lg space-y-2 select-none ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {isTTRound ? (
              <span className="p-1 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Flame className="w-3.5 h-3.5 animate-pulse" />
              </span>
            ) : (
              <span className="p-1 rounded-[2px] bg-white/10 text-[#F7CAC9] shrink-0">
                <Timer className="w-3.5 h-3.5" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#FCEEEC] truncate">
                {label || (gameState ? gameState.category || gameState.round_name : localLanguage !== 'vi' ? 'Answer time' : 'Thời gian trả lời')}
              </p>
              {subLabel && <p className="text-[10px] text-white/50 truncate">{subLabel}</p>}
            </div>
          </div>

          <div
            className={`px-2.5 py-1 rounded-[2px] font-mono text-xs font-black border transition-all ${
              isCritical
                ? 'bg-rose-950/90 border-rose-500 text-rose-300 animate-bounce'
                : isUrgent
                ? 'bg-amber-950/90 border-amber-500 text-amber-300 animate-pulse'
                : 'bg-white/10 border-white/15 text-[#FCEEEC]'
            }`}
          >
            {currentSeconds}s
          </div>
        </div>

        {/* Slanted Progress bar */}
        <SlantedCountdownBar
          progressPercent={progressPercent}
          timerColor={timerColor}
          heightClass="h-2.5 sm:h-3"
          isUrgent={isUrgent}
        />
      </div>
    );
  }

  // Variant 5: Full (Default for AudienceView question headers)
  return (
    <div className={`w-full space-y-2 select-none ${className}`}>
      {/* Header Telemetry row */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          {gameState?.event_schedule?.match_name && (
            <span className="px-2.5 py-0.5 rounded-[2px] text-[10.5px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 truncate flex items-center gap-1 shadow-sm">
              <span>{gameState.event_schedule.match_name}</span>
            </span>
          )}

          {(label || gameState?.category || gameState?.round_name) && (
            <span className="px-3 py-1 rounded-[2px] text-xs font-bold uppercase tracking-wider bg-[#F7CAC9]/20 text-[#FCEEEC] border border-[#F7CAC9]/40 truncate">
              {label || gameState?.category || gameState?.round_name}
            </span>
          )}

          {isTTRound && (
            <span className="px-2.5 py-0.5 rounded-[2px] text-[11px] font-black uppercase tracking-wider bg-white/10 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
              <Flame className="w-3 h-3 animate-pulse text-amber-400" />
              {localLanguage !== 'vi' ? 'Acceleration' : 'Tăng Tốc'}
            </span>
          )}

          {children}
        </div>

        {/* Live Countdown Badge */}
        <div
          role="timer"
          aria-live="polite"
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] font-mono text-sm font-black border transition-all shrink-0 ${
            isCritical
              ? 'bg-rose-950/80 border-rose-500 text-rose-400 scale-105 animate-bounce shadow-lg shadow-rose-500/30 ring-2 ring-rose-500/40'
              : isUrgent
              ? 'bg-amber-950/80 border-amber-500 text-amber-300 animate-pulse shadow-md shadow-amber-500/20 ring-2 ring-amber-500/40'
              : isTTRound
              ? 'fluent-acrylic-surface border-amber-500/40 text-amber-300'
              : 'fluent-box-nested text-[#FCEEEC] border-white/15'
          }`}
        >
          {isTTRound ? (
            <Flame
              className={`w-4 h-4 shrink-0 ${
                isUrgent ? 'text-rose-400 fill-current animate-pulse' : 'text-amber-400 fill-current'
              }`}
            />
          ) : (
            <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? 'text-amber-300' : 'text-[#F7CAC9]'}`} />
          )}
          <span>{currentSeconds}s</span>
        </div>
      </div>

      {/* Synchronized Slanted Linear Progress Bar */}
      <SlantedCountdownBar
        progressPercent={progressPercent}
        timerColor={timerColor}
        heightClass="h-3.5 sm:h-4.5"
        isUrgent={isUrgent}
        className="mb-3"
      />
    </div>
  );
};
