import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  Wifi,
  WifiOff,
  Gauge,
  Zap,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { syncService } from '../services/syncService';
import { LatencyHistoryPoint, LatencyStats, PingInfo } from '../types';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';

interface NetworkStabilityChartProps {
  compact?: boolean;
  className?: string;
}

export const NetworkStabilityChart: React.FC<NetworkStabilityChartProps> = ({
  compact = false,
  className = ''
}) => {
  const [history, setHistory] = useState<LatencyHistoryPoint[]>(() => syncService.getLatencyHistory());
  const [stats, setStats] = useState<LatencyStats>(() => syncService.getLatencyStats());
  const [pingInfo, setPingInfo] = useState<PingInfo>(() => syncService.getPingInfo());
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [showThresholds, setShowThresholds] = useState(true);

  useEffect(() => {
    const unsubHistory = syncService.subscribeToLatencyHistory((newHistory, newStats) => {
      setHistory([...newHistory]);
      setStats(newStats);
    });

    const unsubPing = syncService.subscribeToPing((info) => {
      setPingInfo(info);
      setIsMeasuring(false);
    });

    return () => {
      unsubHistory();
      unsubPing();
    };
  }, []);

  const handleManualMeasure = async () => {
    vibrateTap();
    soundFx.playClick();
    setIsMeasuring(true);
    await syncService.measurePing();
    setIsMeasuring(false);
  };

  // Determine overall health status
  const isOnline = pingInfo.quality !== 'offline' && pingInfo.latencyMs !== null;
  const currentLatency = pingInfo.latencyMs ?? 0;

  const getStatusTheme = () => {
    if (!isOnline) {
      return {
        stroke: '#ef4444',
        fill: '#ef4444',
        gradientStart: 'rgba(239, 68, 68, 0.35)',
        gradientEnd: 'rgba(239, 68, 68, 0.0)',
        textColor: 'text-rose-400',
        badgeBg: 'fluent-box-nested border-rose-500/30 text-rose-400',
        label: 'Mất kết nối',
        icon: WifiOff
      };
    }
    if (currentLatency < 100) {
      return {
        stroke: '#10b981',
        fill: '#10b981',
        gradientStart: 'rgba(16, 185, 129, 0.40)',
        gradientEnd: 'rgba(16, 185, 129, 0.0)',
        textColor: 'text-emerald-400',
        badgeBg: 'fluent-box-nested border-emerald-500/30 text-emerald-400',
        label: 'Rất mượt mà',
        icon: ShieldCheck
      };
    }
    if (currentLatency < 250) {
      return {
        stroke: '#38bdf8',
        fill: '#38bdf8',
        gradientStart: 'rgba(56, 189, 248, 0.40)',
        gradientEnd: 'rgba(56, 189, 248, 0.0)',
        textColor: 'text-sky-400',
        badgeBg: 'fluent-box-nested border-sky-500/30 text-sky-400',
        label: 'Ổn định',
        icon: CheckCircle2
      };
    }
    if (currentLatency < 500) {
      return {
        stroke: '#f59e0b',
        fill: '#f59e0b',
        gradientStart: 'rgba(245, 158, 11, 0.40)',
        gradientEnd: 'rgba(245, 158, 11, 0.0)',
        textColor: 'text-amber-400',
        badgeBg: 'fluent-box-nested border-amber-500/30 text-amber-400',
        label: 'Độ trễ trung bình',
        icon: AlertTriangle
      };
    }
    return {
      stroke: '#f43f5e',
      fill: '#f43f5e',
      gradientStart: 'rgba(244, 63, 94, 0.40)',
      gradientEnd: 'rgba(244, 63, 94, 0.0)',
      textColor: 'text-rose-400',
      badgeBg: 'fluent-box-nested border-rose-500/30 text-rose-400',
      label: 'Độ trễ cao',
      icon: AlertTriangle
    };
  };

  const theme = getStatusTheme();
  const StatusIcon = theme.icon;

  // Custom Glassmorphic Tooltip for Recharts
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data: LatencyHistoryPoint = payload[0].payload;
      return (
        <div className="bg-[#120429]/95 backdrop-blur-md border border-white/20 p-3 rounded-[4px] shadow-2xl text-xs font-sans select-none min-w-[170px] z-50">
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 mb-2">
            <span className="text-[11px] font-mono text-white/50 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {data.timeFormatted}
            </span>
            <span
              className={`text-[9px] font-mono uppercase font-bold px-1.5 py-0.5 rounded border ${
                data.quality === 'excellent'
                  ? 'fluent-box-nested text-emerald-300 border-emerald-500/30'
                  : data.quality === 'good'
                  ? 'fluent-box-nested text-sky-300 border-sky-500/30'
                  : data.quality === 'fair'
                  ? 'fluent-box-nested text-amber-300 border-amber-500/30'
                  : 'fluent-box-nested text-rose-300 border-rose-500/30'
              }`}
            >
              {data.quality === 'excellent' ? 'Tốt' : data.quality === 'good' ? 'Ổn' : data.quality === 'fair' ? 'Tb' : 'Chậm'}
            </span>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Độ trễ (RTT):</span>
              <span className="font-mono font-bold text-white text-sm">
                {data.latencyMs !== null ? `${data.latencyMs} ms` : 'Mất kết nối'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/40">
              <span>Trạng thái:</span>
              <span className={data.status === 'ONLINE' ? 'text-emerald-400' : 'text-rose-400'}>
                {data.status === 'ONLINE' ? 'Trực tuyến' : 'Ngoại tuyến'}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      id="network-stability-monitor"
      className={`fluent-box border border-white/10 rounded-[4px] p-4 sm:p-5 shadow-xl relative overflow-hidden backdrop-blur-md ${className}`}
    >
      {/* Background Accent Glow */}
      <div
        className="absolute -top-24 -right-24 w-60 h-60 rounded-[4px] blur-3xl opacity-20 pointer-events-none transition-all duration-700"
        style={{ backgroundColor: theme.stroke }}
      />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center border shadow-inner ${theme.badgeBg}`}>
            <Activity className={`w-5 h-5 ${isMeasuring ? 'animate-spin' : ''}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Wifi className="w-4 h-4 text-[#F7CAC9]" />
                Ổn Định Kết Nối & Độ Trễ Broadcast
              </h3>
              <span className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-[4px] border flex items-center gap-1 ${theme.badgeBg}`}>
                <StatusIcon className="w-3 h-3" />
                {theme.label}
              </span>
            </div>
            <p className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
              <span>Firebase Firestore RTT</span>
              <span>•</span>
              <span>Cửa sổ trượt 5 phút ({history.length} mẫu)</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              vibrateSelection();
              setShowThresholds(!showThresholds);
            }}
            className={`px-2.5 py-1.5 rounded-[4px] border text-[11px] font-bold font-mono transition flex items-center gap-1.5 ${
              showThresholds
                ? 'fluent-box-nested border-white/20 text-white'
                : 'bg-transparent border-white/5 text-white/40 hover:text-white/70'
            }`}
            title="Bật/Tắt đường chuẩn SLA (100ms / 250ms)"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ngưỡng SLA</span>
          </button>

          <button
            type="button"
            onClick={handleManualMeasure}
            disabled={isMeasuring}
            className="px-3 py-1.5 fluent-box-nested hover:fluent-box-nested active:scale-95 text-[#F7CAC9] border border-[#F7CAC9]/40 rounded-[4px] text-xs font-bold font-mono flex items-center gap-1.5 transition shadow-sm"
            title="Đo kiểm độ trễ ngay lập tức"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isMeasuring ? 'animate-spin' : ''}`} />
            <span>{isMeasuring ? 'Đang đo...' : 'Đo ngay'}</span>
          </button>
        </div>
      </div>

      {/* Telemetry Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 my-4 relative z-10">
        {/* Metric 1: Current Ping */}
        <div className="p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[4px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase tracking-wider">
            <span>Ping Hiện Tại</span>
            <Zap className="w-3 h-3 text-amber-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className={`text-xl sm:text-2xl font-black font-mono tracking-tight ${theme.textColor}`}>
              {stats.currentMs !== null ? stats.currentMs : '0'}
            </span>
            <span className="text-[10px] font-mono text-white/40">ms</span>
          </div>
          <div className="text-[10px] text-white/40 truncate">
            {stats.currentMs !== null ? (stats.currentMs < 100 ? 'Rất nhanh' : stats.currentMs < 250 ? 'Bình thường' : 'Chậm') : 'Offline'}
          </div>
        </div>

        {/* Metric 2: 5-Min Average */}
        <div className="p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[4px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase tracking-wider">
            <span>Trung Bình 5 Phút</span>
            <Activity className="w-3 h-3 text-sky-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-white">
              {stats.avgMs}
            </span>
            <span className="text-[10px] font-mono text-white/40">ms</span>
          </div>
          <div className="text-[10px] text-white/40 flex items-center gap-1">
            <span>Độ ổn định:</span>
            <strong className="text-sky-300 font-mono">{stats.stabilityScore}%</strong>
          </div>
        </div>

        {/* Metric 3: Minimum / Best */}
        <div className="p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[4px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase tracking-wider">
            <span>Tối Thiểu (Best)</span>
            <ArrowDownRight className="w-3 h-3 text-emerald-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-emerald-400">
              {stats.minMs}
            </span>
            <span className="text-[10px] font-mono text-white/40">ms</span>
          </div>
          <div className="text-[10px] text-emerald-400/80">Kỷ lục thấp nhất</div>
        </div>

        {/* Metric 4: Maximum Spike */}
        <div className="p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[4px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase tracking-wider">
            <span>Đỉnh Spike (Max)</span>
            <ArrowUpRight className="w-3 h-3 text-rose-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-rose-400">
              {stats.maxMs}
            </span>
            <span className="text-[10px] font-mono text-white/40">ms</span>
          </div>
          <div className="text-[10px] text-rose-400/80">Đỉnh đột biến cao nhất</div>
        </div>

        {/* Metric 5: Jitter / Variance */}
        <div className="col-span-2 sm:col-span-1 p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[4px] flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 uppercase tracking-wider">
            <span>Jitter (Biến thiên)</span>
            <Gauge className="w-3 h-3 text-purple-400" />
          </div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl sm:text-2xl font-black font-mono tracking-tight text-purple-300">
              ±{stats.jitterMs}
            </span>
            <span className="text-[10px] font-mono text-white/40">ms</span>
          </div>
          <div className="text-[10px] text-purple-300/80">
            {stats.jitterMs < 15 ? 'Rất đồng nhất' : stats.jitterMs < 40 ? 'Ổn định' : 'Có chập chờn'}
          </div>
        </div>
      </div>

      {/* Chart Canvas Container */}
      <div className={`w-full ${compact ? 'h-48' : 'h-64 sm:h-72'} relative z-10 select-none pt-2`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={history}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="latencyGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={theme.stroke} stopOpacity={0.45} />
                <stop offset="95%" stopColor={theme.stroke} stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="3 3"
              stroke="rgba(255, 255, 255, 0.07)"
              vertical={false}
            />

            <XAxis
              dataKey="timeFormatted"
              stroke="rgba(255, 255, 255, 0.35)"
              tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.45)' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
              interval="preserveStartEnd"
              minTickGap={24}
            />

            <YAxis
              stroke="rgba(255, 255, 255, 0.35)"
              tick={{ fontSize: 10, fill: 'rgba(255, 255, 255, 0.45)', fontFamily: 'monospace' }}
              tickLine={false}
              axisLine={{ stroke: 'rgba(255, 255, 255, 0.15)' }}
              domain={[0, (dataMax: number) => Math.max(120, Math.ceil((dataMax + 20) / 40) * 40)]}
              unit="ms"
            />

            <Tooltip content={<CustomTooltip />} />

            {showThresholds && (
              <>
                {/* 100ms Target Benchmark SLA */}
                <ReferenceLine
                  y={100}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeOpacity={0.6}
                  label={{
                    value: '100ms (Chuẩn Siêu Tốc)',
                    position: 'insideTopRight',
                    fill: '#10b981',
                    fontSize: 9,
                    fontFamily: 'monospace'
                  }}
                />

                {/* 250ms Warning Threshold */}
                <ReferenceLine
                  y={250}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeOpacity={0.5}
                  label={{
                    value: '250ms (Ngưỡng Chấp Nhận)',
                    position: 'insideTopRight',
                    fill: '#f59e0b',
                    fontSize: 9,
                    fontFamily: 'monospace'
                  }}
                />
              </>
            )}

            <Area
              type="monotone"
              dataKey="displayLatency"
              name="Độ trễ"
              stroke={theme.stroke}
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#latencyGradient)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Footer Legend & Health Status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 mt-1 border-t border-white/10 text-[11px] text-white/50">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-emerald-400" />
            <span>&lt; 100ms (Mượt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-sky-400" />
            <span>100–250ms (Tốt)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-amber-400" />
            <span>250–500ms (Trung bình)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[4px] bg-rose-400" />
            <span>&gt; 500ms (Chậm)</span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] text-white/40">
          <span>Tự động cập nhật mỗi 6 giây</span>
          <span>•</span>
          <span>Giao thức: Firestore Realtime Stream</span>
        </div>
      </div>
    </div>
  );
};
