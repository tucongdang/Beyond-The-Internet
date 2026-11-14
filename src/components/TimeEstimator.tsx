import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Clock, CheckCircle2, AlertCircle, Sparkles, Radio, Zap } from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';
import {
  estimateNextRoundTime,
  TOURNAMENT_ROUNDS,
  RoundTimeEstimate
} from '../utils/timeEstimatorUtils';
import { vibrateCountdown, vibrateCountdownCritical } from '../utils/hapticUtils';

export interface TimeEstimatorProps {
  gameState?: Partial<GameState> | null;
  className?: string;
  variant?: 'card' | 'compact' | 'hero';
  showRoadmap?: boolean;
}

export const TimeEstimator: React.FC<TimeEstimatorProps> = ({
  gameState,
  className = '',
  variant = 'card',
  showRoadmap = true
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';
  const [now, setNow] = useState<number>(() => syncService.getSynchronizedNow());
  const lastVibratedSecondRef = useRef<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setNow(syncService.getSynchronizedNow());
    }, 250);
    return () => clearInterval(timer);
  }, []);

  const estimate: RoundTimeEstimate = useMemo(() => {
    return estimateNextRoundTime(gameState, now);
  }, [gameState, now]);

  const {
    status,
    statusLabelVi,
    statusLabelEn,
    nextRoundNameVi,
    nextRoundNameEn,
    currentRoundIndex,
    days,
    hours,
    minutes,
    seconds,
    remainingMs,
    progressPercent,
    isPaused,
    matchTitle,
    matchSubtitle,
    matchStage,
    estimatedNextRoundStartStr
  } = estimate;

  // Detect urgent countdown state when remaining time is under 10 seconds (<10s)
  const isUrgent = remainingMs > 0 && remainingMs <= 10000;

  // Trigger tactile vibration (Web Haptics) under 10s to create a sense of urgency for contestants
  useEffect(() => {
    if (isUrgent) {
      const currentSec = Math.ceil(remainingMs / 1000);
      if (currentSec !== lastVibratedSecondRef.current) {
        lastVibratedSecondRef.current = currentSec;
        if (currentSec <= 3 && currentSec >= 1) {
          vibrateCountdownCritical();
        } else if (currentSec <= 10 && currentSec >= 1) {
          vibrateCountdown();
        }
      }
    } else {
      lastVibratedSecondRef.current = null;
    }
  }, [isUrgent, remainingMs]);

  // Determine status color accents
  const getStatusTheme = () => {
    switch (status) {
      case 'INTERMISSION':
        return {
          border: 'border-amber-500/40',
          glow: 'shadow-amber-500/10',
          badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
          digitColor: 'text-amber-300',
          dotColor: 'bg-amber-400',
          barColor: 'from-amber-500 to-yellow-400'
        };
      case 'COUNTDOWN':
        return {
          border: 'border-sky-500/40',
          glow: 'shadow-sky-500/10',
          badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
          digitColor: 'text-sky-300',
          dotColor: 'bg-sky-400',
          barColor: 'from-sky-500 to-teal-400'
        };
      case 'IN_ROUND':
        return {
          border: 'border-emerald-500/40',
          glow: 'shadow-emerald-500/10',
          badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
          digitColor: 'text-emerald-300',
          dotColor: 'bg-emerald-400',
          barColor: 'from-emerald-500 to-[#F7CAC9]'
        };
      case 'CONCLUDED':
        return {
          border: 'border-purple-500/40',
          glow: 'shadow-purple-500/10',
          badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
          digitColor: 'text-purple-300',
          dotColor: 'bg-purple-400',
          barColor: 'from-purple-500 to-pink-500'
        };
      case 'SCHEDULED':
      default:
        return {
          border: 'border-[#F7CAC9]/30',
          glow: 'shadow-[#F7CAC9]/10',
          badgeBg: 'bg-[#F7CAC9]/15 text-[#F7CAC9] border-[#F7CAC9]/30',
          digitColor: 'text-amber-300',
          dotColor: 'bg-[#F7CAC9]',
          barColor: 'from-[#F7CAC9] to-amber-400'
        };
    }
  };

  const theme = getStatusTheme();

  if (variant === 'compact') {
    return (
      <aside
        role="region"
        aria-label={isVi ? 'Đồng hồ nhịp độ trận đấu' : 'Arena Pace Clock'}
        className={`flex items-center gap-3 px-3 py-1.5 rounded-[2px] bg-slate-950/70 border ${theme.border} text-xs font-mono text-[#F5EFF9] ${className}`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.dotColor} opacity-75`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.dotColor}`} />
        </span>
        <div className="flex items-center gap-1.5 truncate">
          <span className="font-semibold text-[#B6A6D8]">
            {isVi ? 'Chặng kế tiếp:' : 'Up next:'}
          </span>
          <span className="font-bold text-white truncate">
            {isVi ? nextRoundNameVi : nextRoundNameEn}
          </span>
        </div>
        <div className={`ml-auto font-black tabular-nums ${theme.digitColor}`}>
          {remainingMs > 0 ? (
            `${String(hours * 60 + minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
          ) : (
            '--:--'
          )}
        </div>
      </aside>
    );
  }

  return (
    <aside
      role="region"
      aria-label={isVi ? 'Đồng hồ nhịp độ trận đấu' : 'Arena Pace Clock'}
      className={`w-full rounded-[4px] fluent-box border ${theme.border} shadow-2xl ${theme.glow} bg-gradient-to-b from-[#180b2b]/95 via-[#120624]/90 to-slate-950/95 backdrop-blur-xl relative overflow-hidden select-none animate-fadeIn ${className}`}
    >
      {/* Decorative Cyber Top Gradient Line */}
      <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${theme.barColor}`} />

      <div className="p-4 sm:p-5 flex flex-col justify-between gap-3.5 h-full">
        
        {/* Header: Status badge & Tournament Stage */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] border text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider ${theme.badgeBg}`}>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${theme.dotColor} opacity-75`} />
                <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.dotColor}`} />
              </span>
              <span>{isVi ? statusLabelVi : statusLabelEn}</span>
            </span>

            {isUrgent && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-rose-500/25 border border-rose-500/60 text-[10px] font-mono font-black text-rose-300 uppercase tracking-wider animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.4)]">
                <Zap className="w-3 h-3 text-rose-400 animate-bounce" />
                <span>{isVi ? '⚡ SẮP BẮT ĐẦU (<10S)' : '⚡ STARTING SOON (<10S)'}</span>
              </span>
            )}

            {isPaused && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-rose-500/20 border border-rose-500/40 text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider">
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span>{isVi ? 'Tạm Dừng' : 'Paused'}</span>
              </span>
            )}
          </div>

          {(matchStage || matchTitle) && (
            <div className="text-[10px] sm:text-[11px] font-mono text-[#B6A6D8] flex items-center gap-1.5 ml-auto min-w-0">
              {matchStage && (
                <span className="px-2 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-white font-bold uppercase tracking-wider shrink-0">
                  {matchStage}
                </span>
              )}
              {matchSubtitle && (
                <span className="text-white/45 hidden sm:inline truncate max-w-[180px]">• {matchSubtitle}</span>
              )}
            </div>
          )}
        </div>

        {/* Main Countdown Display & Next Round Details */}
        <div className="flex flex-col gap-3">
          
          {/* Top/Meta: Next Round Identification & Kickoff Info */}
          <div className="flex flex-wrap items-end justify-between gap-2 pb-2.5 border-b border-white/10">
            <div className="min-w-0">
              <div className="text-[11px] font-mono text-[#B6A6D8] uppercase tracking-wider mb-0.5 flex items-center gap-1.5">
                <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{isVi ? 'Chặng Tranh Tài Sắp Tới' : 'Up Next on Stage'}</span>
              </div>
              
              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug drop-shadow-md">
                {isVi ? nextRoundNameVi : nextRoundNameEn}
              </h3>
            </div>

            {estimatedNextRoundStartStr && (
              <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-[2px] border border-amber-500/25 shrink-0 whitespace-nowrap">
                <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                <span>
                  {isVi ? 'Dự kiến:' : 'Kickoff:'}
                </span>
                <span className="font-bold underline decoration-amber-400/50 underline-offset-2">
                  ~{estimatedNextRoundStartStr}
                </span>
              </div>
            )}
          </div>

          {/* Bottom: Digital Tabular Countdown Units (Single compact row) */}
          <div className="flex items-center justify-center py-0.5">
            {remainingMs > 0 ? (
              <div className="flex items-center justify-center gap-1.5 sm:gap-2.5 w-full">
                {days > 0 && (
                  <>
                    <div className="flex flex-col items-center justify-center min-w-[56px] sm:min-w-[68px] flex-1 max-w-[84px] py-2 px-1.5 rounded-[2px] bg-slate-950/80 border border-white/10 shadow-inner">
                      <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${theme.digitColor}`}>
                        {String(days).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold mt-1">
                        {isVi ? 'Ngày' : 'Days'}
                      </span>
                    </div>
                    <span className="text-lg sm:text-xl font-mono text-white/30 font-bold shrink-0">:</span>
                  </>
                )}

                {(days > 0 || hours > 0) && (
                  <>
                    <div className="flex flex-col items-center justify-center min-w-[56px] sm:min-w-[68px] flex-1 max-w-[84px] py-2 px-1.5 rounded-[2px] bg-slate-950/80 border border-white/10 shadow-inner">
                      <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${theme.digitColor}`}>
                        {String(hours).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold mt-1">
                        {isVi ? 'Giờ' : 'Hours'}
                      </span>
                    </div>
                    <span className="text-lg sm:text-xl font-mono text-white/30 font-bold shrink-0">:</span>
                  </>
                )}

                <div className="flex flex-col items-center justify-center min-w-[56px] sm:min-w-[68px] flex-1 max-w-[84px] py-2 px-1.5 rounded-[2px] bg-slate-950/80 border border-white/10 shadow-inner">
                  <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${theme.digitColor}`}>
                    {String(minutes).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold mt-1">
                    {isVi ? 'Phút' : 'Mins'}
                  </span>
                </div>

                <span className={`text-lg sm:text-xl font-mono font-bold animate-pulse shrink-0 ${isUrgent ? 'text-rose-400' : 'text-amber-400/80'}`}>:</span>

                <div className={`flex flex-col items-center justify-center min-w-[56px] sm:min-w-[68px] flex-1 max-w-[84px] py-2 px-1.5 rounded-[2px] shadow-inner transition-all duration-300 ${
                  isUrgent 
                    ? 'bg-rose-950/80 border border-rose-500/80 shadow-[0_0_20px_rgba(244,63,94,0.5)] animate-pulse' 
                    : `bg-slate-950/80 border ${theme.border}`
                }`}>
                  <span className={`text-2xl sm:text-3xl font-black font-mono tabular-nums leading-none ${
                    isUrgent ? 'text-rose-300' : 'text-yellow-300 animate-pulse'
                  }`}>
                    {String(seconds).padStart(2, '0')}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-amber-300 uppercase tracking-wider font-bold mt-1">
                    {isVi ? 'Giây' : 'Secs'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="px-4 py-2.5 rounded-[2px] bg-slate-950/80 border border-white/10 flex items-center gap-2 text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{isVi ? 'Sẵn sàng khai cuộc!' : 'Ready to kick off!'}</span>
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {progressPercent > 0 && progressPercent < 100 && (
          <div className="w-full">
            <div className="flex items-center justify-between text-[10px] font-mono text-[#B6A6D8] mb-1">
              <span>{isVi ? 'Nhịp độ chặng hiện tại' : 'Current round pace'}</span>
              <span className="font-bold text-white tabular-nums">{progressPercent}%</span>
            </div>
            <div className="w-full h-1.5 rounded-[1px] bg-white/10 overflow-hidden">
              <div
                className={`h-full bg-gradient-to-r ${theme.barColor} transition-all duration-300 ease-out`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Tournament 4-Round Roadmap Stepper */}
        {showRoadmap && (
          <div className="pt-2.5 border-t border-white/10 flex flex-col gap-2">
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-[#B6A6D8]">
              <span className="uppercase tracking-wider font-semibold">
                {isVi ? 'Lộ Trình 4 Vòng Tranh Tài' : '4-Round Contest Roadmap'}
              </span>
              <span className="text-[10px] text-white/50">
                {isVi ? '4 Vòng Chính Thức' : '4 Official Rounds'}
              </span>
            </div>

            <div className={`grid gap-2 ${variant === 'hero' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2'}`}>
              {TOURNAMENT_ROUNDS.map((round, idx) => {
                const isPast = currentRoundIndex > idx || status === 'CONCLUDED';
                const isCurrent = currentRoundIndex === idx && status !== 'CONCLUDED';
                const isNext = currentRoundIndex + 1 === idx && status !== 'CONCLUDED';

                let itemBg = 'bg-black/30 border-white/10 text-white/50';
                let dotIcon = <div className="w-1.5 h-1.5 rounded-full bg-white/30 shrink-0" />;

                if (isPast) {
                  itemBg = 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300';
                  dotIcon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />;
                } else if (isCurrent) {
                  itemBg = 'bg-[#1f103d] border-[#F7CAC9]/50 text-white shadow-md shadow-[#F7CAC9]/10';
                  dotIcon = (
                    <span className="relative flex h-2 w-2 shrink-0">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7CAC9] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7CAC9]" />
                    </span>
                  );
                } else if (isNext) {
                  itemBg = 'bg-amber-950/20 border-amber-500/30 text-amber-200';
                  dotIcon = <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />;
                }

                return (
                  <div
                    key={round.id}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-[2px] border text-left transition-all ${itemBg}`}
                  >
                    {dotIcon}
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-[10px] font-mono uppercase tracking-wider font-bold truncate">
                        {isVi ? round.shortName : round.shortNameEn}
                      </span>
                      <span className="text-[9px] font-mono text-white/45 truncate">
                        ~{round.estimatedDurationMinutes} {isVi ? 'phút' : 'min'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Live sync footer note */}
        <div className="flex items-center justify-between text-[10px] font-mono text-white/45 pt-0.5">
          <span className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-emerald-400" />
            <span>{isVi ? 'Đã đồng bộ giờ sân khấu' : 'Synced with Stage Clock'}</span>
          </span>
          <span>{isVi ? 'Đấu trường BTI 2027' : 'BTI 2027 Live Arena'}</span>
        </div>

      </div>
    </aside>
  );
};
