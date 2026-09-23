import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coffee, 
  Clock, 
  Sparkles, 
  ShieldCheck, 
  Flame, 
  Heart,
  Users
} from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';

interface MatchBreakAudienceOverlayProps {
  gameState: GameState;
  activeCount: number;
}

export const MatchBreakAudienceOverlay: React.FC<MatchBreakAudienceOverlayProps> = ({
  gameState,
  activeCount
}) => {
  const matchBreak = gameState.match_break;
  const [now, setNow] = useState<number>(syncService.getSynchronizedNow());
  const [cheerSent, setCheerSent] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(syncService.getSynchronizedNow());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const { remainingSeconds, totalSeconds, progressPercent, isPaused, isFinished } = useMemo(() => {
    if (!matchBreak || !matchBreak.active) {
      return { remainingSeconds: 0, totalSeconds: 0, progressPercent: 0, isPaused: false, isFinished: true };
    }

    const total = matchBreak.duration_seconds || 180;

    if (matchBreak.is_paused) {
      const rem = matchBreak.paused_remaining_seconds ?? total;
      const pct = Math.max(0, Math.min(100, (rem / total) * 100));
      return { remainingSeconds: rem, totalSeconds: total, progressPercent: pct, isPaused: true, isFinished: rem <= 0 };
    }

    const elapsedMs = Math.max(0, now - (matchBreak.start_time || now));
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const rem = Math.max(0, total - elapsedSec);
    const pct = Math.max(0, Math.min(100, (rem / total) * 100));

    return { remainingSeconds: rem, totalSeconds: total, progressPercent: pct, isPaused: false, isFinished: rem <= 0 };
  }, [matchBreak, now]);

  if (!matchBreak || !matchBreak.active) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleSendCheer = () => {
    soundFx.playTing();
    setCheerSent(true);
    setTimeout(() => setCheerSent(false), 1500);
  };

  return (
    <div className="p-4 sm:p-6 rounded-[3px] bg-gradient-to-br from-[#1d0e33]/90 via-[#130722]/95 to-[#0b0314]/95 border border-amber-400/40 shadow-2xl backdrop-blur-xl text-center space-y-4 animate-fadeIn my-auto max-w-lg mx-auto w-full">
      {/* Header Pill */}
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider">
        <Coffee className="w-3.5 h-3.5 animate-bounce" />
        <span>{matchBreak.title || 'TẠM DỪNG GIẢI LAO'}</span>
      </div>

      {/* Subtitle / Advisory */}
      {matchBreak.subtitle && (
        <p className="text-xs sm:text-sm text-white/80 font-medium leading-relaxed">
          {matchBreak.subtitle}
        </p>
      )}

      {/* Synchronized Countdown Clock */}
      <div className="py-2">
        <div className={`font-mono font-black text-5xl sm:text-6xl tracking-tight leading-none ${
          isFinished 
            ? 'text-emerald-300' 
            : remainingSeconds <= 10 
            ? 'text-rose-400 animate-pulse' 
            : 'text-amber-300'
        }`}>
          {formattedTime}
        </div>

        <div className="w-full max-w-xs mx-auto mt-3 space-y-1">
          <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
            <div 
              className="h-full bg-gradient-to-r from-amber-400 to-purple-400 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] font-mono text-white/40">
            <span>{isPaused ? '⏸️ Tạm dừng' : '⏳ Thời gian nghỉ'}</span>
            <span>{Math.floor(totalSeconds / 60)} phút</span>
          </div>
        </div>
      </div>

      {/* Friendly Tip Box */}
      <div className="p-3 rounded-[2px] bg-purple-950/50 border border-purple-500/30 text-[11px] text-purple-200 font-mono flex items-center justify-center gap-2">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>Khán giả giữ nguyên màn hình để tự động bước vào phần thi kế tiếp!</span>
      </div>

      {/* Interactive Cheer Button */}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleSendCheer}
          disabled={cheerSent}
          className="w-full py-2.5 rounded-[2px] bg-gradient-to-r from-purple-600/80 to-amber-600/80 hover:from-purple-500 hover:to-amber-500 border border-amber-400/40 text-white font-bold text-xs uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
        >
          <Heart className={`w-4 h-4 ${cheerSent ? 'fill-rose-400 text-rose-400 animate-ping' : 'text-rose-300'}`} />
          <span>{cheerSent ? '💖 Đã gửi lời cổ vũ!' : 'Gửi Nhịp Tim Cổ Vũ Thí Sinh (Heart Beat)'}</span>
        </button>
      </div>
    </div>
  );
};
