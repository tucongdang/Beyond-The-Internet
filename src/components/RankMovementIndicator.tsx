import React from 'react';
import { ArrowUp, ArrowDown, Minus, Sparkles } from 'lucide-react';

interface RankMovementIndicatorProps {
  delta?: number | null; // Positive = moved up (e.g. +2), Negative = moved down (e.g. -1), 0 = no change
  prevRank?: number | null;
  compact?: boolean;
  showNumber?: boolean;
  className?: string;
}

export const RankMovementIndicator: React.FC<RankMovementIndicatorProps> = ({
  delta,
  prevRank,
  compact = false,
  showNumber = true,
  className = ''
}) => {
  if (delta === null || delta === undefined) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-white/30 font-mono text-[10px] ${className}`}
        title="Thí sinh mới tham gia bảng xếp hạng"
      >
        <span className="text-[9px] px-1 py-0.2 rounded bg-white/5 border border-white/10 text-amber-300/80 font-bold uppercase tracking-wider">
          MỚI
        </span>
      </span>
    );
  }

  // Moved UP (e.g., from rank 5 to rank 2 -> delta = +3)
  if (delta > 0) {
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-500/40 rounded px-1.5 py-0.5 shadow-[0_0_8px_rgba(16,185,129,0.25)] transition-all animate-in fade-in zoom-in duration-200 ${
          compact ? 'text-[10px] py-0 px-1' : 'text-xs'
        } ${className}`}
        title={prevRank ? `Tăng ${delta} bậc (từ hạng #${prevRank})` : `Tăng ${delta} bậc`}
      >
        <ArrowUp className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-emerald-400 stroke-[3] animate-pulse`} />
        {showNumber && <span>{delta}</span>}
      </span>
    );
  }

  // Moved DOWN (e.g., from rank 2 to rank 4 -> delta = -2)
  if (delta < 0) {
    const absDelta = Math.abs(delta);
    return (
      <span
        className={`inline-flex items-center gap-0.5 font-mono font-bold text-rose-400 bg-rose-950/60 border border-rose-500/40 rounded px-1.5 py-0.5 shadow-[0_0_8px_rgba(244,63,94,0.25)] transition-all animate-in fade-in zoom-in duration-200 ${
          compact ? 'text-[10px] py-0 px-1' : 'text-xs'
        } ${className}`}
        title={prevRank ? `Giảm ${absDelta} bậc (từ hạng #${prevRank})` : `Giảm ${absDelta} bậc`}
      >
        <ArrowDown className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-rose-400 stroke-[3]`} />
        {showNumber && <span>{absDelta}</span>}
      </span>
    );
  }

  // No change (delta === 0)
  return (
    <span
      className={`inline-flex items-center justify-center font-mono text-white/30 px-1 py-0.5 ${
        compact ? 'text-[10px]' : 'text-xs'
      } ${className}`}
      title="Giữ nguyên thứ hạng so với câu trước"
    >
      <Minus className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'} text-white/30 stroke-[2]`} />
    </span>
  );
};
