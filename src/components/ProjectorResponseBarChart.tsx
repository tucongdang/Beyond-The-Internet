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

// Claude Dataviz Categorical Palette (skills/dataviz/references/palette.md — CVD-safe OKLab validated)
const OPTION_COLORS: Record<string, { main: string; glow: string; text: string }> = {
  A: { main: '#3987e5', glow: 'rgba(57, 135, 229, 0.35)', text: '#cde2fb' }, // Slot 1: Blue
  B: { main: '#D97757', glow: 'rgba(217, 119, 87, 0.35)', text: '#EBCECE' }, // Slot 2: Claude Clay / Orange
  C: { main: '#199e70', glow: 'rgba(25, 158, 112, 0.35)', text: '#BCD1CA' }, // Slot 3: Aqua
  D: { main: '#c98500', glow: 'rgba(201, 133, 0, 0.35)', text: '#F0EEE6' },  // Slot 4: Yellow
  E: { main: '#d55181', glow: 'rgba(213, 81, 129, 0.35)', text: '#EBCECE' }, // Slot 5: Magenta
  F: { main: '#9085e9', glow: 'rgba(144, 133, 233, 0.35)', text: '#CBCADB' }, // Slot 7: Violet
};

const DEFAULT_COLOR = { main: '#87867F', glow: 'rgba(135, 134, 127, 0.25)', text: '#FAF9F5' };

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
          finalColor = '#0ca30c'; // Claude Dataviz Status Good
        } else {
          finalColor = '#5E5D59'; // Warm Gray 600
        }
      } else if (isEliminated) {
        finalColor = '#d03b3b'; // Claude Dataviz Status Critical
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
        hoverColor: isCorrect ? '#0ca30c' : '#D97757'
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
        <div className="bg-[#1A1918] border border-white/15 rounded-[2px] p-4 shadow-2xl max-w-xs text-[#FAF9F5] z-50">
          <div className="flex items-center justify-between gap-3 mb-2 border-b border-white/10 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-7 h-7 rounded-[2px] font-mono font-black text-xs flex items-center justify-center shadow"
                style={{ backgroundColor: data.color, color: '#FAF9F5' }}
              >
                {data.key}
              </span>
              <span className="font-bold text-sm text-[#FAF9F5]">Phương án {data.key}</span>
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

          <p className="text-xs text-[#C2C0B6] mb-3 leading-relaxed font-medium">
            "{data.fullLabel}"
          </p>

          <div className="grid grid-cols-2 gap-2 text-center pt-1 border-t border-white/10">
            <div className="fluent-box-nested rounded-[2px] p-2 border border-white/5">
              <div className="text-[10px] uppercase font-mono text-[#87867F]">Số phiếu</div>
              <div className="text-base font-black font-mono tabular-nums text-[#3987e5]">{data.votes}</div>
            </div>
            <div className="fluent-box-nested rounded-[2px] p-2 border border-white/5">
              <div className="text-[10px] uppercase font-mono text-[#87867F]">Tỷ lệ</div>
              <div className="text-base font-black font-mono tabular-nums text-[#D97757]">{data.percent}%</div>
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
      className={`relative w-full rounded-[2px] fluent-box border border-white/12 p-5 sm:p-6 lg:p-7 shadow-2xl overflow-hidden ${
        compact ? 'p-4' : ''
      }`}
    >
      {/* Header Bar */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[2px] bg-[#262624] flex items-center justify-center text-[#D97757] border border-white/15">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-[#FAF9F5] tracking-tight cds-title">
                Phân Bố Bình Chọn Khán Giả
              </h3>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-[2px] bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-[2px] h-2 w-2 bg-emerald-500"></span>
              </span>
            </div>
            <p className="text-xs text-[#C2C0B6] font-mono">
              Biểu đồ trực quan thời gian thực (Claude Dataviz CVD-Safe Palette)
            </p>
          </div>
        </div>

        {/* Live Stage Status Indicator */}
        <div className="flex items-center flex-wrap gap-2 font-mono text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-[#262624] border border-white/12 text-[#D97757] font-bold">
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2a" vertical={false} />
                <XAxis
                  dataKey="key"
                  tick={{ fill: '#f0efec', fontSize: 18, fontFamily: "var(--cds-font-mono)", fontWeight: 'bold' }}
                  axisLine={{ stroke: '#383835' }}
                  tickLine={{ stroke: '#383835' }}
                />
                <YAxis
                  domain={[0, metric === 'percent' ? 100 : 'auto']}
                  tick={{ fill: '#898781', fontSize: 16, fontFamily: "var(--cds-font-mono)" }}
                  axisLine={{ stroke: '#383835' }}
                  tickLine={{ stroke: '#383835' }}
                  unit={metric === 'percent' ? '%' : ''}
                />
                <Tooltip content={<CustomTooltip />} />
                {metric === 'percent' && (
                  <ReferenceLine
                    y={50}
                    stroke="#898781"
                    strokeDasharray="4 4"
                    label={{
                      value: 'Mốc 50%',
                      fill: '#c3c2b7',
                      fontSize: 14,
                      position: 'top'
                    }}
                  />
                )}
                <Bar
                  dataKey={metric === 'percent' ? 'percent' : 'votes'}
                  radius={[2, 2, 0, 0]}
                  animationDuration={600}
                >
                  <LabelList
                    dataKey={metric === 'percent' ? 'percent' : 'votes'}
                    position="top"
                    formatter={(val: any) => (metric === 'percent' ? `${val}%` : `${val}`)}
                    style={{
                      fill: '#f0efec',
                      fontSize: 18,
                      fontWeight: 800,
                      fontFamily: "var(--cds-font-mono)",
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                    }}
                  />
                  {chartData.map((entry) => {
                    const isHovered = hoveredKey === entry.key;
                    return (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={entry.color}
                        opacity={hoveredKey ? (isHovered ? 1 : 0.45) : 0.94}
                        stroke={entry.isCorrect ? '#0ca30c' : isHovered ? '#FAF9F5' : 'rgba(255,255,255,0.12)'}
                        strokeWidth={entry.isCorrect ? 2 : isHovered ? 2 : 1}
                        style={{
                          transition: 'all 0.2s ease'
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
                <CartesianGrid strokeDasharray="3 3" stroke="#2c2c2a" horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, metric === 'percent' ? 100 : 'auto']}
                  tick={{ fill: '#898781', fontSize: 16, fontFamily: "var(--cds-font-mono)" }}
                  axisLine={{ stroke: '#383835' }}
                  unit={metric === 'percent' ? '%' : ''}
                />
                <YAxis
                  type="category"
                  dataKey="key"
                  tick={{ fill: '#f0efec', fontSize: 18, fontFamily: "var(--cds-font-mono)", fontWeight: 'bold' }}
                  axisLine={{ stroke: '#383835' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey={metric === 'percent' ? 'percent' : 'votes'}
                  radius={[0, 2, 2, 0]}
                  animationDuration={600}
                >
                  <LabelList
                    dataKey={metric === 'percent' ? 'percent' : 'votes'}
                    position="right"
                    formatter={(val: any) => (metric === 'percent' ? `${val}%` : `${val} phiếu`)}
                    style={{
                      fill: '#f0efec',
                      fontSize: 18,
                      fontWeight: 800,
                      fontFamily: "var(--cds-font-mono)",
                      filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
                    }}
                  />
                  {chartData.map((entry) => {
                    const isHovered = hoveredKey === entry.key;
                    return (
                      <Cell
                        key={`cell-${entry.key}`}
                        fill={entry.color}
                        opacity={hoveredKey ? (isHovered ? 1 : 0.45) : 0.94}
                        stroke={entry.isCorrect ? '#0ca30c' : isHovered ? '#FAF9F5' : 'rgba(255,255,255,0.12)'}
                        strokeWidth={entry.isCorrect ? 2 : isHovered ? 2 : 1}
                        style={{
                          transition: 'all 0.2s ease'
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
