import { t } from '../utils/i18n';
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Sector 
} from 'recharts';
import { 
  PieChart as PieChartIcon, 
  TrendingUp, 
  Sparkles, 
  Users, 
  CheckCircle2, 
  Target, 
  Radio, 
  BarChart2, 
  Flame,
  HelpCircle,
  Award,
  Zap
} from 'lucide-react';
import { GameState, UserResponse } from '../types';

interface AudienceAnswerDistributionChartProps {
  gameState: GameState;
  responses: Record<string, UserResponse>;
  totalAudienceCount?: number;
  className?: string;
}

const OPTION_COLORS: Record<string, { fill: string; stroke: string; bg: string; text: string }> = {
  A: { fill: '#38bdf8', stroke: '#0284c7', bg: 'bg-sky-500/15', text: 'text-sky-300' },     // Sky Blue
  B: { fill: '#34d399', stroke: '#059669', bg: 'bg-emerald-500/15', text: 'text-emerald-300' }, // Emerald
  C: { fill: '#fbbf24', stroke: '#d97706', bg: 'bg-amber-500/15', text: 'text-amber-300' },     // Amber
  D: { fill: '#f43f5e', stroke: '#e11d48', bg: 'bg-rose-500/15', text: 'text-rose-300' },       // Rose
  E: { fill: '#a78bfa', stroke: '#7c3aed', bg: 'bg-purple-500/15', text: 'text-purple-300' },   // Purple
  F: { fill: '#fb923c', stroke: '#ea580c', bg: 'bg-orange-500/15', text: 'text-orange-300' },   // Orange
  DEFAULT: { fill: '#94a3b8', stroke: '#64748b', bg: 'bg-slate-500/15', text: 'text-slate-300' }
};

// Active Shape for Interactive Hover / Focus
const renderActiveShape = (props: any, localLanguage: string = 'vi') => {
  const {
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value
  } = props;

  return (
    <g>
      {/* Outer Pulse Glow */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={outerRadius + 3}
        outerRadius={outerRadius + 8}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        opacity={0.35}
      />
      {/* Main Expanded Sector */}
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius - 2}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      {/* Center Dynamic Telemetry Label */}
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        fill="#FFFFFF"
        className="font-mono font-bold text-sm sm:text-base select-none"
      >
        {localLanguage !== 'vi' ? `Option ${payload.key}` : `Lựa chọn ${payload.key}`}
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fill={fill}
        className="font-mono font-black text-xs sm:text-sm select-none"
      >
        {`${value} ${localLanguage !== 'vi' ? 'votes' : 'phiếu'} (${(percent * 100).toFixed(0)}%)`}
      </text>
    </g>
  );
};

export const AudienceAnswerDistributionChart: React.FC<AudienceAnswerDistributionChartProps> = ({
  gameState,
  responses,
  totalAudienceCount = 0,
  className = ''
}) => {
  const { localLanguage } = useLanguage();

  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [chartMode, setChartMode] = useState<'DONUT' | 'PIE' | 'BAR'>('DONUT');

  // Compute vote counts for all options
  const { chartData, totalVotes, leadingOption, consensusLevel, correctStats } = useMemo(() => {
    const rawOptions = gameState.options || {};
    const availableKeys = Object.keys(rawOptions).length > 0 
      ? Object.keys(rawOptions).sort() 
      : ['A', 'B', 'C', 'D'];

    const counts: Record<string, number> = {};
    availableKeys.forEach(k => { counts[k] = 0; });

    const votesList = Object.values(responses || {}) as UserResponse[];
    votesList.forEach((r) => {
      if (r && r.choice) {
        const c = r.choice.toUpperCase();
        counts[c] = (counts[c] || 0) + 1;
      }
    });

    const total = votesList.length;

    const data = availableKeys.map((key) => {
      const count = counts[key] || 0;
      const pct = total > 0 ? (count / total) * 100 : 0;
      const optText = rawOptions[key] || `Phương án ${key}`;
      const colorConfig = OPTION_COLORS[key] || OPTION_COLORS.DEFAULT;
      const isCorrect = gameState.status === 'REVEAL' && gameState.correct_key === key;
      const isEliminated = gameState.eliminated_options?.includes(key);

      return {
        key,
        name: localLanguage !== 'vi' ? `Option ${key}` : `Lựa chọn ${key}`,
        text: optText,
        value: count,
        percentage: pct,
        color: colorConfig.fill,
        strokeColor: colorConfig.stroke,
        bgColor: colorConfig.bg,
        textColor: colorConfig.text,
        isCorrect,
        isEliminated
      };
    });

    // Determine leading option
    let leader: typeof data[0] | null = null;
    if (total > 0) {
      leader = [...data].sort((a, b) => b.value - a.value)[0];
      if (leader && leader.value === 0) leader = null;
    }

    // Determine consensus / split level
    let consensus = localLanguage !== 'vi' ? 'NO FEEDBACK YET' : 'CHƯA CÓ PHẢN HỒI';
    let consensusColor = 'text-white/40';
    if (total > 0 && leader) {
      if (leader.percentage >= 65) {
        consensus = localLanguage !== 'vi' ? 'HIGH CONSENSUS (Dominant)' : 'ĐỒNG THUẬN CAO (Áp đảo)';
        consensusColor = 'text-emerald-400';
      } else if (leader.percentage >= 40) {
        consensus = localLanguage !== 'vi' ? 'CLEAR TREND' : 'XU HƯỚNG RÕ RÀNG';
        consensusColor = 'text-sky-400';
      } else {
        consensus = localLanguage !== 'vi' ? 'SPLIT / CONTESTED' : 'PHÂN TÁN / TRANH CHẤP';
        consensusColor = 'text-amber-400';
      }
    }

    // Stats for correct answer
    let correctInfo = null;
    if (gameState.status === 'REVEAL' && gameState.correct_key) {
      const correctItem = data.find(d => d.key === gameState.correct_key);
      if (correctItem) {
        correctInfo = {
          key: correctItem.key,
          count: correctItem.value,
          pct: Math.round(correctItem.percentage),
          text: correctItem.text
        };
      }
    }

    return {
      chartData: data,
      totalVotes: total,
      leadingOption: leader,
      consensusLevel: { text: consensus, color: consensusColor },
      correctStats: correctInfo
    };
  }, [gameState.options, gameState.status, gameState.correct_key, gameState.eliminated_options, responses, localLanguage]);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  const onPieLeave = () => {
    setActiveIndex(null);
  };

  const participationRate = totalAudienceCount > 0 
    ? Math.min(100, Math.round((totalVotes / totalAudienceCount) * 100)) 
    : (totalVotes > 0 ? 100 : 0);

  const isRevealed = gameState.status === 'REVEAL';
  const isActive = gameState.status === 'ACTIVE';

  return (
    <section 
      id="audience-answer-distribution-chart"
      className={`fluent-box-nested border border-white/15 rounded-[4px] p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4 bg-gradient-to-b from-slate-950/90 via-[#070d1e]/85 to-slate-950/95 shadow-xl select-none ${className}`}
    >
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[2px] bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-md shrink-0">
            <PieChartIcon className="w-4 h-4 text-sky-300" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white font-mono flex items-center gap-1.5 truncate">
                {localLanguage !== 'vi' ? 'Audience Answer Distribution' : 'Phân Bổ Lựa Chọn Khán Giả'}
              </h2>
              {isActive && (
                <span className="flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 animate-pulse shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  REALTIME
                </span>
              )}
            </div>
            <p className="text-[10px] text-white/50 font-mono truncate">
              {localLanguage !== 'vi' ? 'Real-time audience answer trends' : 'Biểu đồ trực quan xu hướng câu trả lời khán giả theo thời gian thực'}
            </p>
          </div>
        </div>

        {/* Action / View Switchers & Telemetry Counter */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 p-0.5 bg-black/40 rounded-[2px] border border-white/10">
            <button
              type="button"
              onClick={() => setChartMode('DONUT')}
              className={`px-2 py-1 rounded-[2px] text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                chartMode === 'DONUT'
                  ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Biểu đồ Donut"
            >
              <PieChartIcon className="w-3 h-3" />
              <span className="hidden xs:inline">Donut</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('PIE')}
              className={`px-2 py-1 rounded-[2px] text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                chartMode === 'PIE'
                  ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Biểu đồ Tròn đầy đủ"
            >
              <PieChartIcon className="w-3 h-3" />
              <span className="hidden xs:inline">Pie</span>
            </button>

            <button
              type="button"
              onClick={() => setChartMode('BAR')}
              className={`px-2 py-1 rounded-[2px] text-[10px] font-mono font-bold flex items-center gap-1 transition ${
                chartMode === 'BAR'
                  ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40'
                  : 'text-white/40 hover:text-white'
              }`}
              title="Thanh Phân Bổ (Bars)"
            >
              <BarChart2 className="w-3 h-3" />
              <span className="hidden xs:inline">Bars</span>
            </button>
          </div>

          <div className="flex items-center gap-1 px-2.5 py-1 rounded-[2px] bg-sky-950/70 border border-sky-500/30 text-[11px] font-mono">
            <Users className="w-3.5 h-3.5 text-sky-400" />
            <strong className="text-white">{totalVotes}</strong>
            <span className="text-white/40">/{totalAudienceCount || totalVotes}</span>
          </div>
        </div>
      </div>

      {/* MC Key Insights Ribbon (Tóm tắt nhanh cho người dẫn chương trình) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-2.5 rounded-[2px] fluent-box-nested border border-white/10 text-xs">
        {/* Metric 1: Leading Option Trend */}
        <div className="flex items-center gap-2.5 p-1.5 rounded-[2px] bg-white/[0.02]">
          <div className="w-7 h-7 rounded-[2px] bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-300 shrink-0">
            <Flame className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-white/40 font-mono block uppercase">{localLanguage !== 'vi' ? 'Leading Trend' : 'Xu Hướng Dẫn Đầu'}</span>
            {leadingOption && leadingOption.value > 0 ? (
              <div className="flex items-center gap-1 font-bold truncate">
                <span className="text-amber-300 font-mono text-xs sm:text-sm">
                  {localLanguage !== 'vi' ? `Option ${leadingOption.key}` : `Lựa chọn ${leadingOption.key}`}
                </span>
                <span className="text-[11px] text-white/70 font-mono">
                  ({Math.round(leadingOption.percentage)}% - {leadingOption.value} {localLanguage !== 'vi' ? 'votes' : 'phiếu'})
                </span>
              </div>
            ) : (
              <span className="text-white/40 font-mono text-[11px]">
                {localLanguage !== 'vi' ? 'Waiting for votes...' : 'Đang chờ lượt vote...'}
              </span>
            )}
          </div>
        </div>

        {/* Metric 2: Consensus Level */}
        <div className="flex items-center gap-2.5 p-1.5 rounded-[2px] bg-white/[0.02]">
          <div className="w-7 h-7 rounded-[2px] bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-300 shrink-0">
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-white/40 font-mono block uppercase">{localLanguage !== 'vi' ? 'Audience Consensus' : 'Độ Đồng Thuận Khán Giả'}</span>
            <span className={`font-mono font-bold text-[11px] sm:text-xs truncate block ${consensusLevel.color}`}>
              {consensusLevel.text}
            </span>
          </div>
        </div>

        {/* Metric 3: Answer Accuracy when Revealed or Participation */}
        <div className="flex items-center gap-2.5 p-1.5 rounded-[2px] bg-white/[0.02]">
          <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 ${
            isRevealed && correctStats
              ? 'bg-emerald-500/20 border border-emerald-400/40 text-emerald-300'
              : 'bg-purple-500/20 border border-purple-400/30 text-purple-300'
          }`}>
            {isRevealed && correctStats ? <Award className="w-3.5 h-3.5" /> : <Zap className="w-3.5 h-3.5" />}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] text-white/40 font-mono block uppercase">
              {isRevealed && correctStats ? 'Tỉ Lệ Trả Lời Đúng' : 'Tỉ Lệ Tham Gia'}
            </span>
            {isRevealed && correctStats ? (
              <div className="flex items-center gap-1 font-bold truncate">
                <span className="text-emerald-300 font-mono text-xs sm:text-sm">
                  {correctStats.pct}% Đúng
                </span>
                <span className="text-[11px] text-white/60 font-mono">
                  (Khóa: {correctStats.key})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 font-bold">
                <span className="text-purple-300 font-mono text-xs sm:text-sm">
                  {participationRate}%
                </span>
                <span className="text-[10px] text-white/40 font-mono font-normal">{localLanguage !== 'vi' ? 'audiences submitted' : 'khán giả đã nộp'}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Chart Body */}
      {totalVotes === 0 ? (
        <div className="h-44 sm:h-52 fluent-box-nested border border-dashed border-white/10 rounded-[2px] flex flex-col items-center justify-center text-center p-4">
          <div className="w-10 h-10 rounded-[2px] bg-white/5 flex items-center justify-center text-white/30 mb-2">
            <Radio className="w-5 h-5 animate-pulse text-sky-400/60" />
          </div>
          <p className="text-xs font-semibold text-white/70">{localLanguage !== 'vi' ? 'No answers received yet' : 'Chưa nhận được câu trả lời nào'}</p>
          <p className="text-[10px] text-white/40 max-w-xs mt-0.5">
            Biểu đồ tròn sẽ tự động vẽ và cập nhật tức thì khi có khán giả gửi lựa chọn trên thiết bị
          </p>
        </div>
      ) : chartMode === 'BAR' ? (
        /* Bar Breakdown Mode */
        <div className="space-y-2.5 pt-1">
          {chartData.map((item) => (
            <div 
              key={item.key} 
              className={`p-2.5 rounded-[2px] border transition-all ${
                item.isCorrect 
                  ? 'border-emerald-500/60 bg-emerald-950/30' 
                  : item.isEliminated 
                  ? 'border-white/5 opacity-40 line-through' 
                  : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.04]'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                <div className="flex items-center gap-2">
                  <span 
                    className="w-2.5 h-2.5 rounded-full shrink-0" 
                    style={{ backgroundColor: item.color }} 
                  />
                  <span className="font-bold text-white">
                    Lựa chọn {item.key}
                  </span>
                  {item.isCorrect && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-0.5">
                      <CheckCircle2 className="w-2.5 h-2.5" /> ĐÁP ÁN ĐÚNG
                    </span>
                  )}
                  {item.isEliminated && (
                    <span className="text-[9px] px-1 rounded-[2px] bg-rose-950 text-rose-300">
                      LOẠI TRỪ
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold text-white/80">{item.value} {t("chart_votes", localLanguage)}</span>
                  <span className="font-black text-sm" style={{ color: item.color }}>
                    {Math.round(item.percentage)}%
                  </span>
                </div>
              </div>

              {/* Progress Track */}
              <div className="h-2.5 w-full fluent-box-nested rounded-[2px] overflow-hidden p-0.5 border border-white/10 bg-black/40">
                <div
                  className="h-full rounded-[2px] transition-all duration-500"
                  style={{
                    width: `${Math.max(item.percentage, item.value > 0 ? 3 : 0)}%`,
                    backgroundColor: item.color,
                    boxShadow: item.value > 0 ? `0 0 10px ${item.color}80` : 'none'
                  }}
                />
              </div>

              <p className="text-[11px] text-white/60 truncate mt-1 pl-4.5 font-sans">
                {item.text}
              </p>
            </div>
          ))}
        </div>
      ) : (
        /* Donut / Pie Interactive Chart with Recharts */
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Chart Canvas Area */}
          <div className="md:col-span-7 h-52 sm:h-60 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  // @ts-ignore
                  activeIndex={activeIndex !== null ? activeIndex : undefined}
                  activeShape={(props: any) => renderActiveShape(props, localLanguage)}
                  data={chartData.filter(d => d.value > 0 || totalVotes === 0)}
                  cx="50%"
                  cy="50%"
                  innerRadius={chartMode === 'DONUT' ? 48 : 0}
                  outerRadius={chartMode === 'DONUT' ? 76 : 74}
                  paddingAngle={chartMode === 'DONUT' && totalVotes > 0 ? 3 : 0}
                  dataKey="value"
                  onMouseEnter={onPieEnter}
                  onMouseLeave={onPieLeave}
                  animationDuration={600}
                  animationEasing="ease-out"
                >
                  {chartData.map((entry) => (
                    <Cell
                      key={`cell-${entry.key}`}
                      fill={entry.color}
                      stroke={entry.isCorrect ? '#10b981' : entry.strokeColor}
                      strokeWidth={entry.isCorrect ? 3 : 1}
                      style={{
                        filter: entry.isCorrect ? 'drop-shadow(0 0 6px #10b981)' : 'none',
                        cursor: 'pointer'
                      }}
                    />
                  ))}
                </Pie>
                {activeIndex === null && (
                  <RechartsTooltip
                    content={({ active, payload }: any) => {
                      if (active && payload && payload.length) {
                        const item = payload[0].payload;
                        return (
                          <div className="fluent-box-nested p-2.5 rounded-[2px] border border-white/20 shadow-2xl backdrop-blur-xl text-white font-mono space-y-1 z-50">
                            <div className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                              <span className="font-bold text-xs text-white">
                                {localLanguage !== 'vi' ? `Option ${item.key}` : `Lựa chọn ${item.key}`}
                              </span>
                              {item.isCorrect && (
                                <span className="text-[9px] px-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-[2px]">
                                  {localLanguage !== 'vi' ? 'CORRECT' : 'CHÍNH XÁC'}
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-white/70 font-sans max-w-[200px] truncate">{item.text}</p>
                            <div className="flex items-center justify-between gap-3 pt-1 border-t border-white/10 text-xs">
                              <span className="font-bold" style={{ color: item.color }}>{item.value} {t("chart_votes", localLanguage)}</span>
                              <span className="text-white/80 font-black">{Math.round(item.percentage)}%</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                )}
              </PieChart>
            </ResponsiveContainer>

            {/* Static Center Badge when no sector is hovered in Donut mode */}
            {chartMode === 'DONUT' && activeIndex === null && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-[10px] font-mono text-white/40 uppercase">{localLanguage !== 'vi' ? 'Total Votes' : 'Tổng Vote'}</span>
                <span className="text-lg sm:text-xl font-black font-mono text-white leading-tight">
                  {totalVotes}
                </span>
                <span className="text-[9px] font-mono text-sky-400 font-bold">
                  {leadingOption && leadingOption.value > 0 ? `Top: ${leadingOption.key}` : 'N = 100%'}
                </span>
              </div>
            )}
          </div>

          {/* Interactive Legend & Details List */}
          <div className="md:col-span-5 space-y-1.5">
            <span className="text-[10px] font-mono text-white/40 uppercase block mb-1">
              {localLanguage !== 'vi' ? 'Option breakdown:' : 'Chi tiết từng lựa chọn:'}
            </span>
            {chartData.map((item, idx) => (
              <div
                key={item.key}
                onMouseEnter={() => setActiveIndex(idx)}
                onMouseLeave={() => setActiveIndex(null)}
                className={`p-2 rounded-[2px] border transition-all cursor-pointer ${
                  activeIndex === idx
                    ? 'border-sky-400/60 bg-sky-950/40 shadow-md scale-[1.01]'
                    : item.isCorrect
                    ? 'border-emerald-500/50 bg-emerald-950/20'
                    : 'border-white/10 bg-white/[0.02] hover:bg-white/[0.05]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <div 
                      className="w-3 h-3 rounded-[2px] shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-mono font-bold text-xs text-white">
                      {item.key}
                    </span>
                    <span className="text-xs text-white/70 truncate font-sans">
                      {item.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="text-[11px] font-mono text-white/50">
                      {item.value}p
                    </span>
                    <span 
                      className="text-xs font-mono font-black w-9 text-right"
                      style={{ color: item.color }}
                    >
                      {Math.round(item.percentage)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
