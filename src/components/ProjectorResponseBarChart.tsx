import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LabelList,
  ReferenceLine
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3,
  CheckCircle2,
  XCircle,
  Users,
  Percent,
  Hash,
  Sparkles,
  TrendingUp,
  RotateCcw,
  Maximize2,
  X,
  Layers,
  Flame,
  Award
} from 'lucide-react';
import { GameState, UserResponse } from '../types';

interface ProjectorResponseBarChartProps {
  gameState: GameState;
  responses: Record<string, UserResponse>;
  activeCount?: number;
  onClose?: () => void;
  compact?: boolean;
}

interface ChartItem {
  key: string;
  label: string;
  fullLabel: string;
  votes: number;
  percent: number;
  isCorrect: boolean;
  isEliminated: boolean;
  color: string;
  hoverColor: string;
}

// Horizon Cybernetic Palette
const OPTION_COLORS: Record<string, { main: string; glow: string; text: string }> = {
  A: { main: '#38BDF8', glow: 'rgba(56, 189, 248, 0.4)', text: '#bae6fd' }, // Sky
  B: { main: '#F472B6', glow: 'rgba(244, 114, 182, 0.4)', text: '#fbcfe8' }, // Pink
  C: { main: '#FBBF24', glow: 'rgba(251, 191, 36, 0.4)', text: '#fef3c7' }, // Amber
  D: { main: '#A78BFA', glow: 'rgba(167, 139, 250, 0.4)', text: '#ede9fe' }, // Violet
  E: { main: '#34D399', glow: 'rgba(52, 211, 153, 0.4)', text: '#d1fae5' }, // Emerald
  F: { main: '#FB923C', glow: 'rgba(251, 146, 60, 0.4)', text: '#ffedd5' }, // Orange
};

const DEFAULT_COLOR = { main: '#94A3B8', glow: 'rgba(148, 163, 184, 0.3)', text: '#f1f5f9' };

export const ProjectorResponseBarChart: React.FC<ProjectorResponseBarChartProps> = ({
  gameState,
  responses,
  activeCount = 0,
  onClose,
  compact = false
}) => {
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('vertical');
  const [metric, setMetric] = useState<'percent' | 'count'>('percent');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const isRevealed = gameState.status === 'REVEAL';
  const correctKey = (gameState.correct_key || '').trim().toUpperCase();
  const eliminatedKeys = useMemo(() => {
    return (gameState.eliminated_options || []).map((k) => k.trim().toUpperCase());
  }, [gameState.eliminated_options]);

  // Aggregate responses
  const { chartData, totalVotes, leadingItem } = useMemo(() => {
    const rawOptions = gameState.options || {};
    const keys = Object.keys(rawOptions);
    const votesMap: Record<string, number> = {};

    keys.forEach((k) => {
      votesMap[k.toUpperCase()] = 0;
    });

    let total = 0;
    (Object.values(responses || {}) as UserResponse[]).forEach((r) => {
      if (!r || !r.choice) return;
      const ch = r.choice.trim().toUpperCase();
      if (votesMap[ch] !== undefined) {
        votesMap[ch] += 1;
        total += 1;
      }
    });

    const items: ChartItem[] = keys.map((key) => {
      const uKey = key.toUpperCase();
      const votes = votesMap[uKey] || 0;
      const percent = total > 0 ? Math.round((votes / total) * 100) : 0;
      const isCorrect = isRevealed && (uKey === correctKey || correctKey.includes(uKey));
      const isEliminated = eliminatedKeys.includes(uKey);
      const fullLabel = rawOptions[key] || '';
      const truncatedLabel =
        fullLabel.length > 28 ? fullLabel.slice(0, 26) + '...' : fullLabel;

      let colorConfig = OPTION_COLORS[uKey] || DEFAULT_COLOR;
      let finalColor = colorConfig.main;

      if (isRevealed) {
        if (isCorrect) {
          finalColor = '#10B981'; // Emerald 500
        } else {
          finalColor = '#64748B'; // Slate 500
        }
      } else if (isEliminated) {
        finalColor = '#EF4444'; // Rose 500
      }

      return {
        key: uKey,
        label: `[${uKey}] ${truncatedLabel}`,
        fullLabel,
        votes,
        percent,
        isCorrect,
        isEliminated,
        color: finalColor,
        hoverColor: isCorrect ? '#34D399' : '#F43F5E'
      };
    });

    // Find leading item
    let leader: ChartItem | null = null;
    items.forEach((item) => {
      if (!leader || item.votes > leader.votes) {
        if (item.votes > 0) leader = item;
      }
    });

    return {
      chartData: items,
      totalVotes: total,
      leadingItem: leader
    };
  }, [gameState.options, responses, isRevealed, correctKey, eliminatedKeys]);

  const participationRate = activeCount > 0 ? Math.min(100, Math.round((totalVotes / activeCount) * 100)) : 0;

  // Custom Chart Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: ChartItem = payload[0].payload;
      return (
        <div className="bg-[#190839]/95 border border-purple-500/40 rounded-[2px] p-4 shadow-2xl backdrop-blur-xl max-w-xs text-white z-50">
          <div className="flex items-center justify-between gap-3 mb-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-[2px] font-mono font-black text-xs flex items-center justify-center shadow"
                style={{ backgroundColor: data.color, color: data.isCorrect ? '#000' : '#fff' }}
              >
                {data.key}
              </span>
              <span className="font-bold text-sm text-white">Phương án {data.key}</span>
            </div>
            {data.isCorrect && (
              <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-black fluent-box-nested text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> ĐÁP ÁN ĐÚNG
              </span>
            )}
            {data.isEliminated && (
              <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-black fluent-box-nested text-rose-300 border border-rose-500/40 flex items-center gap-1">
                <XCircle className="w-3 h-3" /> ĐÃ LOẠI TRỪ
              </span>
            )}
          </div>

          <p className="text-xs text-white/80 mb-3 leading-relaxed font-medium">
            "{data.fullLabel}"
          </p>

          <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-white/10">
            <div className="fluent-box-nested rounded-[2px] p-2 border border-white/5">
              <div className="text-[10px] uppercase font-mono text-white/50">Số phiếu</div>
              <div className="text-base font-black font-mono text-cyan-300">{data.votes}</div>
            </div>
            <div className="fluent-box-nested rounded-[2px] p-2 border border-white/5">
              <div className="text-[10px] uppercase font-mono text-white/50">Tỷ lệ</div>
              <div className="text-base font-black font-mono text-pink-300">{data.percent}%</div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      transition={{ duration: 0.3 }}
      className={`relative w-full rounded-[2px] fluent-box border border-purple-500/30 p-5 sm:p-6 lg:p-7 shadow-2xl backdrop-blur-xl overflow-hidden ${
        compact ? 'p-4' : ''
      }`}
    >
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-96 h-96 fluent-box-nested rounded-[2px] blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 fluent-box-nested rounded-[2px] blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[2px] fluent-acrylic-surface flex items-center justify-center text-white shadow-lg shadow-pink-500/30 border border-white/20">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider">
                Phân Bố Bình Chọn Khán Giả
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-[2px] bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-[2px] h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-[#EBC7D6] font-mono">
              Biểu đồ trực quan thời gian thực (Recharts Live Distribution)
            </p>
          </div>
        </div>

        {/* Live Stage Status Indicator */}
        <div className="flex items-center flex-wrap gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-white/5 border border-white/10 text-[#F7CAC9] font-bold">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>BIỂU ĐỒ ĐA CHIỀU (RECHARTS)</span>
          </div>
        </div>
      </div>

      {/* KPI Overview Strip */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
        <div className="fluent-box-nested border border-white/10 rounded-[2px] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[2px] fluent-box-nested text-cyan-300 border border-cyan-500/30 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-white/50 uppercase block">Tổng bình chọn</span>
            <span className="text-base font-black font-mono text-white">{totalVotes} phiếu</span>
          </div>
        </div>

        <div className="fluent-box-nested border border-white/10 rounded-[2px] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[2px] fluent-box-nested text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] font-mono text-white/50 uppercase block">Tỷ lệ tương tác</span>
            <span className="text-base font-black font-mono text-purple-200">{participationRate}%</span>
          </div>
        </div>

        <div className="fluent-box-nested border border-white/10 rounded-[2px] p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-[2px] fluent-box-nested text-pink-300 border border-pink-500/30 flex items-center justify-center shrink-0">
            <Flame className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-white/50 uppercase block">Dẫn đầu</span>
            <span className="text-base font-black font-mono text-pink-300 truncate block">
              {leadingItem ? `[${leadingItem.key}] ${leadingItem.percent}%` : 'Chưa có'}
            </span>
          </div>
        </div>

        <div className="fluent-box-nested border border-white/10 rounded-[2px] p-3 flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-[2px] border flex items-center justify-center shrink-0 ${
              isRevealed
                ? 'fluent-box-nested text-emerald-300 border-emerald-500/40'
                : 'fluent-box-nested text-amber-300 border-amber-500/40'
            }`}
          >
            {isRevealed ? <CheckCircle2 className="w-4 h-4" /> : <Award className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-mono text-white/50 uppercase block">
              {isRevealed ? 'Đáp án đúng' : 'Trạng thái'}
            </span>
            <span
              className={`text-base font-black font-mono truncate block ${
                isRevealed ? 'text-emerald-400' : 'text-amber-300'
              }`}
            >
              {isRevealed ? `Phương án [${correctKey}]` : 'Đang tiếp nhận'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Recharts Container */}
      <div className="relative z-10 w-full h-[420px] sm:h-[500px] lg:h-[62vh] xl:h-[66vh] pt-2">
        {totalVotes === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-[2px] bg-black/50 backdrop-blur-[24px] saturate-150/20">
            <div className="w-14 h-14 rounded-[2px] fluent-box-nested text-purple-300 border border-purple-500/20 flex items-center justify-center mb-3 animate-pulse">
              <BarChart3 className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">Đang chờ lượt bình chọn đầu tiên</h4>
            <p className="text-xs text-white/50 max-w-sm">
              Khán giả đang theo dõi câu hỏi trên sân khấu và gửi lựa chọn qua điện thoại. Dữ liệu sẽ tự động biểu diễn theo thời gian thực.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {orientation === 'vertical' ? (
              <BarChart
                data={chartData}
                margin={{ top: 35, right: 20, left: -10, bottom: 25 }}
                onMouseMove={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setHoveredKey(state.activePayload[0].payload.key);
                  }
                }}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" vertical={false} />
                <XAxis
                  dataKey="key"
                  tick={{ fill: '#F5EFF9', fontSize: 18, fontFamily: "'SVN-Gilroy', monospace", fontWeight: 'bold' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                />
                <YAxis
                  domain={[0, metric === 'percent' ? 100 : 'auto']}
                  tick={{ fill: '#B6A6D8', fontSize: 16, fontFamily: "'SVN-Gilroy', monospace" }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  tickLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  unit={metric === 'percent' ? '%' : ''}
                />
                <Tooltip content={<CustomTooltip />} />
                {metric === 'percent' && (
                  <ReferenceLine
                    y={50}
                    stroke="rgba(255, 255, 255, 0.25)"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Mốc 50%',
                      fill: 'rgba(255,255,255,0.4)',
                      fontSize: 14,
                      position: 'top'
                    }}
                  />
                )}
                <Bar
                  dataKey={metric === 'percent' ? 'percent' : 'votes'}
                  radius={[12, 12, 0, 0]}
                  animationDuration={600}
                >
                  <LabelList
                    dataKey={metric === 'percent' ? 'percent' : 'votes'}
                    position="top"
                    formatter={(val: any) => (metric === 'percent' ? `${val}%` : `${val}`)}
                    style={{
                      fill: '#FFFFFF',
                      fontSize: 18,
                      fontWeight: 800,
                      fontFamily: "'SVN-Gilroy', monospace",
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                    }}
                  />
                  {chartData.map((entry) => {
                    const isHovered = hoveredKey === entry.key;
                    return (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={entry.color}
                        opacity={hoveredKey ? (isHovered ? 1 : 0.45) : 0.92}
                        stroke={entry.isCorrect ? '#34D399' : isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
                        strokeWidth={entry.isCorrect ? 3 : isHovered ? 2 : 1}
                        style={{
                          filter: entry.isCorrect
                            ? 'drop-shadow(0 0 12px rgba(16,185,129,0.7))'
                            : isHovered
                            ? 'drop-shadow(0 0 8px rgba(244,114,182,0.6))'
                            : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            ) : (
              <BarChart
                layout="vertical"
                data={chartData}
                margin={{ top: 10, right: 50, left: 30, bottom: 10 }}
                onMouseMove={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length) {
                    setHoveredKey(state.activePayload[0].payload.key);
                  }
                }}
                onMouseLeave={() => setHoveredKey(null)}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, metric === 'percent' ? 100 : 'auto']}
                  tick={{ fill: '#B6A6D8', fontSize: 16, fontFamily: "'SVN-Gilroy', monospace" }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                  unit={metric === 'percent' ? '%' : ''}
                />
                <YAxis
                  type="category"
                  dataKey="key"
                  tick={{ fill: '#F5EFF9', fontSize: 18, fontFamily: "'SVN-Gilroy', monospace", fontWeight: 'bold' }}
                  axisLine={{ stroke: 'rgba(255,255,255,0.2)' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={metric === 'percent' ? 'percent' : 'votes'}
                  radius={[0, 12, 12, 0]}
                  animationDuration={600}
                >
                  <LabelList
                    dataKey={metric === 'percent' ? 'percent' : 'votes'}
                    position="right"
                    formatter={(val: any) => (metric === 'percent' ? `${val}%` : `${val} phiếu`)}
                    style={{
                      fill: '#FFFFFF',
                      fontSize: 18,
                      fontWeight: 800,
                      fontFamily: "'SVN-Gilroy', monospace",
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                    }}
                  />
                  {chartData.map((entry) => {
                    const isHovered = hoveredKey === entry.key;
                    return (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={entry.color}
                        opacity={hoveredKey ? (isHovered ? 1 : 0.45) : 0.92}
                        stroke={entry.isCorrect ? '#34D399' : isHovered ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
                        strokeWidth={entry.isCorrect ? 3 : isHovered ? 2 : 1}
                        style={{
                          filter: entry.isCorrect
                            ? 'drop-shadow(0 0 12px rgba(16,185,129,0.7))'
                            : isHovered
                            ? 'drop-shadow(0 0 8px rgba(244,114,182,0.6))'
                            : 'none',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        )}
      </div>

      {/* Bottom Options Legend Cards */}
      <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 mt-4 pt-4 border-t border-white/10">
        {chartData.map((item) => (
          <div
            key={item.key}
            onMouseEnter={() => setHoveredKey(item.key)}
            onMouseLeave={() => setHoveredKey(null)}
            className={`p-3 rounded-[2px] border transition-all cursor-pointer flex items-center justify-between gap-2.5 ${
              item.isCorrect
                ? 'fluent-box-nested border-emerald-500/50 ring-2 ring-emerald-500/30'
                : item.isEliminated
                ? 'fluent-box-nested border-rose-500/30 opacity-60'
                : hoveredKey === item.key
                ? 'fluent-box-nested border-white/30 scale-[1.02]'
                : 'fluent-box-nested border-white/5 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="w-7 h-7 rounded-[2px] font-mono font-black text-xs flex items-center justify-center shrink-0 shadow"
                style={{ backgroundColor: item.color, color: item.isCorrect ? '#000' : '#fff' }}
              >
                {item.key}
              </span>
              <span className={`text-xs font-semibold truncate ${item.isEliminated ? 'line-through text-white/50' : 'text-white'}`}>
                {item.fullLabel}
              </span>
            </div>
            <div className="text-right font-mono shrink-0">
              <span className={`text-xs font-black block ${item.isCorrect ? 'text-emerald-400' : 'text-white'}`}>
                {item.percent}%
              </span>
              <span className="text-[9px] text-white/40 block">({item.votes})</span>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};
