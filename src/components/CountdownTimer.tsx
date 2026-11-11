import React, { useEffect, useState, useRef, useMemo } from 'react';
import { Clock, Flame, Timer, AlertTriangle, CheckCircle2, PauseCircle, Zap } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { interpolateTimerColor } from '../utils/colorUtils';
import { syncService } from '../services/syncService';
import { GameState } from '../types';

export interface SlantedCountdownBarProps {
  progressPercent: number;
  timerColor?: string;
  heightClass?: string;
  isUrgent?: boolean;
  isCritical?: boolean;
  className?: string;
}

export const SlantedCountdownBar: React.FC<SlantedCountdownBarProps> = ({
  progressPercent,
  timerColor,
  heightClass = 'h-3.5 sm:h-4',
  isUrgent = false,
  isCritical = false,
  className = ''
}) => {
  const safePercent = Math.max(0, Math.min(100, progressPercent));

  return (
    <div className={`w-full relative py-0.5 ${className}`}>
      <div
        className={`w-full ${heightClass} bg-[#0c081e] border rounded-[2px] overflow-hidden transform -skew-x-12 shadow-[0_0_15px_rgba(12,8,30,0.8)_inset] relative transition-colors duration-300 ${
          isCritical
            ? 'border-rose-500/80 shadow-[0_0_18px_rgba(244,63,94,0.35)]'
            : isUrgent
            ? 'border-amber-400/70 shadow-[0_0_14px_rgba(245,158,11,0.25)]'
            : 'border-purple-500/40'
        }`}
      >
        <div
          className={`h-full transition-all duration-200 ease-linear relative overflow-hidden ${
            isCritical
              ? 'animate-pulse shadow-[0_0_20px_rgba(244,63,94,0.95)]'
              : isUrgent
              ? 'animate-pulse shadow-[0_0_16px_rgba(245,158,11,0.85)]'
              : 'shadow-[0_0_14px_rgba(147,51,234,0.7)]'
          }`}
          style={{
            width: `${safePercent}%`,
            background:
              (isUrgent || isCritical) && timerColor
                ? timerColor
                : 'linear-gradient(90deg, #4c1d95 0%, #7c3aed 45%, #9333ea 80%, #F7CAC9 100%)',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
          <div
            className="absolute top-0 right-0 bottom-0 w-1.5 transform translate-x-1/2 z-10"
            style={{
              backgroundColor: isCritical ? '#ffe4e6' : isUrgent ? '#fef3c7' : '#f3e8ff',
              boxShadow: isCritical
                ? '0 0 12px #f43f5e, 0 0 4px #ffffff'
                : isUrgent
                ? '0 0 10px #f59e0b, 0 0 4px #ffffff'
                : '0 0 10px #c084fc, 0 0 4px #ffffff'
            }}
          />
        </div>
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[radial-gradient(#a855f7_1px,transparent_1px)] [background-size:8px_8px]" />
      </div>
    </div>
  );
};

export interface CountdownProgressRingProps {
  seconds: number;
  progressPercent: number;
  timerColor: string;
  size?: 'sm' | 'md' | 'lg';
  isUrgent?: boolean;
  isCritical?: boolean;
  isPaused?: boolean;
  hasAnswered?: boolean;
  className?: string;
}

export const CountdownProgressRing: React.FC<CountdownProgressRingProps> = ({
  seconds,
  progressPercent,
  timerColor,
  size = 'md',
  isUrgent = false,
  isCritical = false,
  isPaused = false,
  hasAnswered = false,
  className = ''
}) => {
  const safePercent = Math.max(0, Math.min(100, progressPercent));
  const dimensions = size === 'sm' ? 46 : size === 'lg' ? 76 : 58;
  const strokeWidth = size === 'sm' ? 3.5 : size === 'lg' ? 5 : 4.25;
  const center = dimensions / 2;
  const radius = center - strokeWidth - 3;
  const circumference = 2 * Math.PI * radius;
  const rawOffset = circumference - (safePercent / 100) * circumference;
  const strokeDashoffset = Number.isFinite(rawOffset) ? rawOffset : 0;

  // Calculate leading tip dot coordinates on the ring
  const angleRad = ((safePercent / 100) * 360 - 90) * (Math.PI / 180);
  const tipX = center + radius * Math.cos(angleRad);
  const tipY = center + radius * Math.sin(angleRad);

  const activeStrokeColor = isPaused
    ? '#38BDF8'
    : isCritical
    ? '#F43F5E'
    : isUrgent
    ? '#F59E0B'
    : timerColor || '#F7CAC9';

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 select-none ${
        isCritical ? 'animate-pulse' : ''
      } ${className}`}
      style={{ width: dimensions, height: dimensions }}
      aria-hidden="true"
    >
      {/* Ambient Urgency Halo */}
      {(isUrgent || isCritical) && !isPaused && seconds > 0 && (
        <span
          className={`absolute inset-0.5 rounded-full pointer-events-none ${
            isCritical
              ? 'bg-rose-500/25 ring-2 ring-rose-500/50 animate-ping'
              : 'bg-amber-500/15 ring-1 ring-amber-400/40 animate-pulse'
          }`}
          style={{ animationDuration: isCritical ? '1s' : '1.6s' }}
        />
      )}

      <svg
        width={dimensions}
        height={dimensions}
        viewBox={`0 0 ${dimensions} ${dimensions}`}
        className="overflow-visible"
      >
        {/* Subtle 12-tick arena dial markers */}
        {Array.from({ length: 12 }).map((_, idx) => {
          const tickAngle = (idx * 30 - 90) * (Math.PI / 180);
          const innerR = radius + strokeWidth / 2 + 1.5;
          const outerR = innerR + (size === 'sm' ? 1.5 : 2.2);
          return (
            <line
              key={idx}
              x1={center + innerR * Math.cos(tickAngle)}
              y1={center + innerR * Math.sin(tickAngle)}
              x2={center + outerR * Math.cos(tickAngle)}
              y2={center + outerR * Math.sin(tickAngle)}
              stroke="rgba(255, 255, 255, 0.18)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          );
        })}

        {/* Background Track Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="rgba(255, 255, 255, 0.12)"
          strokeWidth={strokeWidth}
          fill="rgba(13, 4, 32, 0.72)"
        />

        {/* Active Progress Ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke={activeStrokeColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          transform={`rotate(-90 ${center} ${center})`}
          className="transition-[stroke-dashoffset,stroke] duration-200 ease-linear"
          style={{
            filter: isCritical
              ? 'drop-shadow(0 0 8px rgba(244, 63, 94, 0.9))'
              : isUrgent
              ? 'drop-shadow(0 0 6px rgba(245, 158, 11, 0.75))'
              : 'drop-shadow(0 0 4px rgba(247, 202, 201, 0.45))'
          }}
        />

        {/* Leading Tip Spark Dot */}
        {safePercent > 2 && safePercent < 99.5 && seconds > 0 && (
          <circle
            cx={tipX}
            cy={tipY}
            r={size === 'sm' ? 2.2 : 3}
            fill="#FFFFFF"
            style={{
              filter: `drop-shadow(0 0 6px ${activeStrokeColor})`
            }}
          />
        )}
      </svg>

      {/* Center Numeric Readout */}
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center leading-none">
        {isPaused ? (
          <PauseCircle className={`${size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'} text-sky-300`} />
        ) : (
          <>
            <span
              className={`font-mono font-black tabular-nums tracking-tight ${
                size === 'sm'
                  ? 'text-xs'
                  : size === 'lg'
                  ? 'text-xl'
                  : 'text-sm sm:text-base'
              } ${
                seconds <= 0
                  ? 'text-white/50'
                  : isCritical
                  ? 'text-rose-300 scale-110 transition-transform'
                  : isUrgent
                  ? 'text-amber-300'
                  : hasAnswered
                  ? 'text-emerald-300'
                  : 'text-[#FCEEEC]'
              }`}
            >
              {seconds}
            </span>
            <span className="text-[8px] font-mono font-bold uppercase text-white/45 mt-0.5">
              {seconds <= 0 ? 'END' : 'GIÂY'}
            </span>
          </>
        )}
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
  /** Whether the timer is currently paused by the host */
  isPaused?: boolean;
  /** Whether the current audience member has already locked in an answer */
  hasAnswered?: boolean;
  /** Custom label to show beside timer (e.g. Round name or Category) */
  label?: string;
  /** Sub-label or extra status text */
  subLabel?: string;
  /** Extra CSS classes */
  className?: string;
  /** Callback fired when timer reaches 0 */
  onTimeUp?: () => void;
  /** Whether to show visual urgent pulses */
  showUrgentAnimations?: boolean;
  /** Custom children or action badges to render in full variant */
  children?: React.ReactNode;
}

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  timeLeft: propTimeLeft,
  totalTime: propTotalTime,
  gameState,
  variant = 'full',
  isTTRound: propIsTTRound,
  isPaused: propIsPaused,
  hasAnswered = false,
  label,
  subLabel,
  className = '',
  onTimeUp,
  showUrgentAnimations = true,
  children
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';

  const [internalTimeLeft, setInternalTimeLeft] = useState<number>(() => {
    if (typeof propTimeLeft === 'number') return propTimeLeft;
    if (gameState) return gameState.time_limit || 15;
    return 15;
  });

  const isControlled = typeof propTimeLeft === 'number';
  const effectiveTotal = Math.max(1, Number(propTotalTime || gameState?.time_limit) || 15);
  const isPaused = propIsPaused ?? Boolean(gameState?.is_timer_paused);

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
      return Math.max(0, (gameState.time_limit || 15) - elapsedSec);
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
  }, [
    isControlled,
    gameState?.status,
    gameState?.server_start_time,
    gameState?.time_limit,
    gameState?.is_timer_paused,
    gameState?.paused_remaining_seconds,
    onTimeUp
  ]);

  const currentSeconds = Math.max(0, isControlled ? propTimeLeft! : internalTimeLeft);
  const isTTRound =
    propIsTTRound ??
    (gameState?.round_type === 'ELIMINATION_6' ||
      gameState?.round_type === 'SEQUENCING' ||
      gameState?.round_name?.includes('Tăng tốc') ||
      gameState?.question_id?.startsWith('TT'));

  const prevSecondsRef = useRef<number>(currentSeconds);
  useEffect(() => {
    if (prevSecondsRef.current > 0 && currentSeconds === 0 && onTimeUp) {
      onTimeUp();
    }
    prevSecondsRef.current = currentSeconds;
  }, [currentSeconds, onTimeUp]);

  const progressPercent = Math.max(0, Math.min(100, (currentSeconds / effectiveTotal) * 100));
  const isUrgent = showUrgentAnimations && !isPaused && currentSeconds <= 5 && currentSeconds > 0;
  const isCritical = showUrgentAnimations && !isPaused && currentSeconds <= 3 && currentSeconds > 0;
  const isExpired = currentSeconds <= 0;

  const timerColor = useMemo(() => interpolateTimerColor(progressPercent), [progressPercent]);

  const statusText = useMemo(() => {
    if (isPaused) {
      return isVi ? 'Đồng hồ đang tạm dừng' : 'Timer paused';
    }
    if (isExpired) {
      return isVi ? 'Đã hết giờ trả lời!' : 'Time is up!';
    }
    if (hasAnswered) {
      return isCritical
        ? isVi
          ? 'Đã chốt đáp án • Chờ mở kết quả!'
          : 'Locked in • Results coming up!'
        : isVi
        ? 'Đã ghi nhận đáp án của bạn!'
        : 'Your answer is locked in!';
    }
    if (isCritical) {
      return isVi ? 'Giây cuối — Chốt đáp án ngay!' : 'Final seconds — Lock it in now!';
    }
    if (isUrgent) {
      return isVi ? 'Sắp hết giờ — Nhanh tay chọn nhé!' : 'Hurry up — Time is running out!';
    }
    return isTTRound
      ? isVi
        ? 'Chốt càng nhanh, thứ hạng càng cao!'
        : 'Answer fast for a higher speed rank!'
      : isVi
      ? 'Đang mở bình chọn câu hỏi'
      : 'Question voting is live';
  }, [isPaused, isExpired, hasAnswered, isCritical, isUrgent, isTTRound, isVi]);

  // Variant 1: Progress Bar Only
  if (variant === 'bar') {
    return (
      <SlantedCountdownBar
        progressPercent={progressPercent}
        timerColor={timerColor}
        isUrgent={isUrgent}
        isCritical={isCritical}
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
        aria-label={isVi ? `Còn lại ${currentSeconds} giây` : `${currentSeconds} seconds remaining`}
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
          <Clock className={`w-4 h-4 shrink-0 ${isUrgent ? 'text-amber-300' : 'text-[#F7CAC9]'}`} />
        )}
        <span className="tabular-nums">{currentSeconds}s</span>
      </div>
    );
  }

  // Variant 3: Circular Progress Ring
  if (variant === 'circular') {
    return (
      <div
        role="timer"
        aria-live="polite"
        aria-label={isVi ? `Còn lại ${currentSeconds} giây` : `${currentSeconds} seconds remaining`}
        className={`inline-flex items-center gap-2 select-none ${className}`}
      >
        <CountdownProgressRing
          seconds={currentSeconds}
          progressPercent={progressPercent}
          timerColor={timerColor}
          size="sm"
          isUrgent={isUrgent}
          isCritical={isCritical}
          isPaused={isPaused}
          hasAnswered={hasAnswered}
        />
      </div>
    );
  }

  // Variant 4: Compact Capsule with Progress Ring
  if (variant === 'compact') {
    return (
      <div
        role="timer"
        aria-live="polite"
        className={`w-full fluent-box rounded-[2px] p-2.5 sm:p-3 border transition-colors text-white shadow-lg space-y-2 select-none ${
          isCritical
            ? 'border-rose-500/70 bg-rose-950/30'
            : isUrgent
            ? 'border-amber-400/60 bg-amber-950/20'
            : 'border-white/10'
        } ${className}`}
      >
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 min-w-0">
            {isTTRound ? (
              <span className="p-1.5 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                <Flame className="w-4 h-4 animate-pulse" />
              </span>
            ) : (
              <span className="p-1.5 rounded-[2px] bg-white/10 text-[#F7CAC9] shrink-0">
                <Timer className="w-4 h-4" />
              </span>
            )}
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#FCEEEC] truncate">
                {label || (gameState ? gameState.category || gameState.round_name : isVi ? 'Thời gian trả lời' : 'Answer time')}
              </p>
              <p className="text-[11px] text-white/65 truncate">{subLabel || statusText}</p>
            </div>
          </div>

          <CountdownProgressRing
            seconds={currentSeconds}
            progressPercent={progressPercent}
            timerColor={timerColor}
            size="sm"
            isUrgent={isUrgent}
            isCritical={isCritical}
            isPaused={isPaused}
            hasAnswered={hasAnswered}
          />
        </div>

        <SlantedCountdownBar
          progressPercent={progressPercent}
          timerColor={timerColor}
          heightClass="h-2.5 sm:h-3"
          isUrgent={isUrgent}
          isCritical={isCritical}
        />
      </div>
    );
  }

  // Variant 5: Full Arena Countdown Header (Default for AudienceView question responses)
  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={isVi ? `Đồng hồ đếm ngược câu hỏi: còn ${currentSeconds} giây. ${statusText}` : `Question countdown timer: ${currentSeconds} seconds left. ${statusText}`}
      className={`w-full space-y-2.5 select-none ${className}`}
    >
      <div
        className={`flex items-center justify-between gap-3 p-3 sm:p-3.5 rounded-[3px] border transition-all duration-300 ${
          isCritical
            ? 'bg-gradient-to-r from-rose-950/85 via-[#240b2c]/90 to-rose-950/85 border-rose-500/80 shadow-[0_0_25px_rgba(244,63,94,0.3)]'
            : isUrgent
            ? 'bg-gradient-to-r from-amber-950/75 via-[#1f0d38]/90 to-amber-950/75 border-amber-400/70 shadow-[0_0_20px_rgba(245,158,11,0.2)]'
            : hasAnswered
            ? 'bg-[#190839]/85 border-emerald-400/40 shadow-md'
            : 'bg-[#190839]/80 border-white/15 shadow-md'
        }`}
      >
        {/* Left: Category, Round Badges & Dynamic Excitement Callout */}
        <div className="flex flex-col gap-1.5 min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            {gameState?.event_schedule?.match_name && (
              <span className="px-2.5 py-0.5 rounded-[2px] text-[10.5px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 truncate flex items-center gap-1 shadow-sm">
                <span>{gameState.event_schedule.match_name}</span>
              </span>
            )}

            {(label || gameState?.category || gameState?.round_name) && (
              <span className="px-2.5 py-0.5 rounded-[2px] text-xs font-bold uppercase tracking-wider bg-[#F7CAC9]/20 text-[#FCEEEC] border border-[#F7CAC9]/40 truncate">
                {label || gameState?.category || gameState?.round_name}
              </span>
            )}

            {isTTRound && (
              <span className="px-2.5 py-0.5 rounded-[2px] text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                <Flame className="w-3 h-3 animate-pulse text-amber-400" />
                {isVi ? 'Tăng Tốc' : 'Speed Round'}
              </span>
            )}

            {children}
          </div>

          {/* Dynamic Excitement & Urgency Prompt */}
          <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold min-w-0">
            {isCritical && !hasAnswered ? (
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 animate-bounce" />
            ) : isUrgent && !hasAnswered ? (
              <Zap className="w-4 h-4 text-amber-300 shrink-0 animate-pulse" />
            ) : hasAnswered ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <Clock className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0" />
            )}
            <span
              className={`truncate ${
                isCritical && !hasAnswered
                  ? 'text-rose-200'
                  : isUrgent && !hasAnswered
                  ? 'text-amber-200'
                  : hasAnswered
                  ? 'text-emerald-200'
                  : 'text-[#E2DBEC]'
              }`}
            >
              {subLabel || statusText}
            </span>
          </div>
        </div>

        {/* Right: Visual SVG Countdown Progress Ring */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white/50">
              {isPaused
                ? isVi
                  ? 'Trạng thái'
                  : 'Status'
                : isVi
                ? 'Thời gian còn'
                : 'Time left'}
            </span>
            <span
              className={`text-xs font-mono font-black tabular-nums ${
                isCritical
                  ? 'text-rose-300'
                  : isUrgent
                  ? 'text-amber-300'
                  : hasAnswered
                  ? 'text-emerald-300'
                  : 'text-[#F7CAC9]'
              }`}
            >
              {currentSeconds} / {effectiveTotal}s
            </span>
          </div>

          <CountdownProgressRing
            seconds={currentSeconds}
            progressPercent={progressPercent}
            timerColor={timerColor}
            size="md"
            isUrgent={isUrgent}
            isCritical={isCritical}
            isPaused={isPaused}
            hasAnswered={hasAnswered}
          />
        </div>
      </div>

      {/* Synchronized Slanted Linear Progress Bar */}
      <SlantedCountdownBar
        progressPercent={progressPercent}
        timerColor={timerColor}
        heightClass="h-3 sm:h-3.5"
        isUrgent={isUrgent}
        isCritical={isCritical}
        className="mb-1"
      />
    </div>
  );
};
