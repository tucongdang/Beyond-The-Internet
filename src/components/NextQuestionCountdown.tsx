import React, { useEffect, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Timer, Sparkles } from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';

interface NextQuestionCountdownProps {
  gameState?: GameState;
  className?: string;
  compact?: boolean;
}

export const NextQuestionCountdown: React.FC<NextQuestionCountdownProps> = ({
  gameState,
  className = '',
  compact = false
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);

  const limit = gameState?.next_question_wait_limit || 0;
  const start = gameState?.next_question_wait_start || 0;

  useEffect(() => {
    if (limit <= 0 || start <= 0) {
      setTimeLeft(0);
      return;
    }

    let animFrameId: number;

    const updateTimer = () => {
      const now = syncService.getSynchronizedNow();
      const elapsed = (now - start) / 1000;
      const rem = Math.max(0, limit - elapsed);
      setTimeLeft(rem);

      if (rem > 0) {
        animFrameId = requestAnimationFrame(updateTimer);
      }
    };

    updateTimer();

    return () => {
      if (animFrameId) cancelAnimationFrame(animFrameId);
    };
  }, [limit, start]);

  if (limit <= 0 || start <= 0 || timeLeft <= 0) {
    return null;
  }

  const progressPercent = Math.min(100, Math.max(0, (timeLeft / limit) * 100));
  const isUrgent = timeLeft <= 3;
  const { localLanguage } = useLanguage();
  const displayMsg = gameState?.next_question_wait_message || (localLanguage === 'en' ? 'Prepare for the next question' : 'Chuẩn bị cho câu hỏi tiếp theo');

  if (compact) {
    return (
      <div className={`w-full bg-[#26134B]/95 border border-amber-400/40 rounded-[12px] p-3 shadow-xl backdrop-blur-md text-white animate-fadeIn ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <Timer className={`w-4 h-4 text-amber-300 shrink-0 ${isUrgent ? 'animate-bounce text-rose-400' : 'animate-pulse'}`} />
            <span className="font-bold text-xs truncate text-amber-200 uppercase tracking-wider">
              {displayMsg}
            </span>
          </div>
          <span className={`font-mono font-black text-sm px-2 py-0.5 rounded-[4px] border ${
            isUrgent 
              ? 'bg-white/10 backdrop-blur-md text-rose-300 border-rose-400/50 animate-pulse' 
              : 'bg-white/10 backdrop-blur-md text-amber-300 border-amber-400/30'
          }`}>
            {timeLeft.toFixed(1)}s
          </span>
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-2.5 bg-black/50 backdrop-blur-[24px] saturate-150/50 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
          <div
            className={`h-full rounded-full transition-all duration-150 ease-linear shadow-sm ${
              isUrgent
                ? 'fluent-acrylic-surface'
                : 'fluent-acrylic-surface'
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full max-w-xl mx-auto fluent-acrylic-surface border-2 ${
      isUrgent ? 'border-rose-400 shadow-rose-500/30 animate-pulse' : 'border-amber-400/60 shadow-amber-500/20'
    } shadow-2xl rounded-[12px] p-4 sm:p-5 text-white backdrop-blur-lg animate-slideInDown transition-all ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`p-2 rounded-[4px] shrink-0 ${
            isUrgent ? 'bg-white/10 backdrop-blur-md text-rose-400 border border-rose-400/30' : 'bg-white/10 backdrop-blur-md text-amber-300 border border-amber-400/30'
          }`}>
            <Timer className={`w-5 h-5 sm:w-6 sm:h-6 ${isUrgent ? 'animate-bounce' : 'animate-spin-slow'}`} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
              <span className="text-[10px] sm:text-[11px] font-mono font-bold uppercase tracking-wider text-amber-300/90">
                {localLanguage === 'en' ? 'ROUND COUNTDOWN' : 'ĐẾM NGƯỢC THỜI GIAN CHỜ'}
              </span>
            </div>
            <h3 className="font-extrabold text-sm sm:text-base tracking-tight text-white truncate">
              {displayMsg}
            </h3>
          </div>
        </div>

        {/* Big Time Badge */}
        <div className={`shrink-0 font-mono font-black text-xl sm:text-2xl px-3 sm:px-4 py-1.5 rounded-[4px] border shadow-lg ${
          isUrgent
            ? 'bg-white/10 backdrop-blur-md text-rose-200 border-rose-400/60 animate-bounce'
            : 'fluent-acrylic-surface text-amber-300 border-amber-400/50'
        }`}>
          {timeLeft.toFixed(1)}<span className="text-xs sm:text-sm font-sans font-bold ml-0.5">s</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-3.5 sm:h-4 bg-black/50 backdrop-blur-[24px] saturate-150/60 rounded-full overflow-hidden border border-white/15 p-0.5 shadow-inner relative">
          <div
            className={`h-full rounded-full transition-all duration-150 ease-linear shadow-md relative overflow-hidden ${
              isUrgent
                ? 'fluent-acrylic-surface'
                : 'fluent-acrylic-surface'
            }`}
            style={{ width: `${progressPercent}%` }}
          >
            {/* Shimmer light effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
          </div>
        </div>
        <div className="flex items-center justify-between text-[11px] font-mono text-white/60 px-1">
          <span>{localLanguage === 'en' ? 'Wait progress' : 'Tiến trình chờ'}</span>
          <span className="font-bold text-amber-300">{Math.round(progressPercent)}%</span>
        </div>
      </div>
    </div>
  );
};
