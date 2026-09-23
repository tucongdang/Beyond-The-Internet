import React from 'react';
import { TrendingUp, TrendingDown, Minus, Flame, Activity, Sparkles } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';

export type PerformanceTrend = 'rising' | 'falling' | 'stable' | 'streak';

export interface TrendInfo {
  trend: PerformanceTrend;
  label?: string;
  labelVi?: string;
  streakCount?: number;
  description?: string;
}

interface TrendIndicatorProps {
  trendInfo?: TrendInfo | PerformanceTrend | null;
  compact?: boolean;
  showLabel?: boolean;
  className?: string;
}

export const TrendIndicator: React.FC<TrendIndicatorProps> = ({
  trendInfo,
  compact = false,
  showLabel = true,
  className = ''
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';

  if (!trendInfo) return null;

  const trend: PerformanceTrend = typeof trendInfo === 'string' ? trendInfo : trendInfo.trend;
  const streakCount = typeof trendInfo === 'object' ? trendInfo.streakCount : undefined;

  let icon = null;
  let text = '';
  let tooltip = '';
  let badgeStyle = '';

  switch (trend) {
    case 'streak':
      icon = <Flame className="w-3 h-3 text-amber-400 fill-amber-400 animate-pulse shrink-0" />;
      text = streakCount && streakCount > 1 
        ? (isVi ? `Chuỗi ${streakCount}` : `${streakCount} Streak`) 
        : (isVi ? 'Bứt phá' : 'On Fire');
      tooltip = isVi 
        ? `Đang có chuỗi ${streakCount || 3} câu trả lời đúng liên tiếp!` 
        : `Hot streak with ${streakCount || 3} consecutive correct answers!`;
      badgeStyle = 'bg-amber-950/70 border-amber-500/40 text-amber-300 ring-1 ring-amber-400/30';
      break;

    case 'rising':
      icon = <TrendingUp className="w-3 h-3 text-emerald-400 shrink-0" />;
      text = isVi ? 'Đang lên' : 'Rising';
      tooltip = isVi 
        ? 'Phong độ tăng trưởng tốt qua các câu hỏi và vòng đấu gần đây' 
        : 'Improving performance trend across recent rounds';
      badgeStyle = 'bg-emerald-950/70 border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-400/20';
      break;

    case 'falling':
      icon = <TrendingDown className="w-3 h-3 text-rose-400 shrink-0" />;
      text = isVi ? 'Giảm sút' : 'Falling';
      tooltip = isVi 
        ? 'Phong độ chững lại ở các câu hỏi gần đây, cần tăng tốc' 
        : 'Recent drop in performance, needs a comeback';
      badgeStyle = 'bg-rose-950/70 border-rose-500/40 text-rose-300 ring-1 ring-rose-400/20';
      break;

    case 'stable':
    default:
      icon = <Activity className="w-3 h-3 text-sky-400 shrink-0" />;
      text = isVi ? 'Ổn định' : 'Stable';
      tooltip = isVi 
        ? 'Phong độ thi đấu ổn định và chắc chắn qua các vòng' 
        : 'Steady, consistent scoring and accuracy across rounds';
      badgeStyle = 'bg-sky-950/70 border-sky-500/40 text-sky-300 ring-1 ring-sky-400/20';
      break;
  }

  if (compact) {
    return (
      <span
        title={tooltip}
        className={`inline-flex items-center justify-center p-1 rounded-[3px] border ${badgeStyle} transition-transform hover:scale-110 cursor-help ${className}`}
      >
        {icon}
      </span>
    );
  }

  return (
    <span
      title={tooltip}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border font-mono text-[10px] font-semibold transition-all hover:scale-105 cursor-help ${badgeStyle} ${className}`}
    >
      {icon}
      {showLabel && <span className="tracking-tight leading-none">{text}</span>}
    </span>
  );
};

export default TrendIndicator;
