import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
  Cell
} from 'recharts';
import {
  TrendingUp,
  BarChart2,
  Clock,
  Zap,
  Activity,
  Calendar,
  Sparkles,
  Flame,
  Layers,
  RotateCcw,
  Plus,
  RefreshCw,
  Info,
  CheckCircle2,
  QrCode,
  History,
  ArrowUpRight,
  ArrowDownRight,
  Smartphone,
  Users
} from 'lucide-react';
import { syncService } from '../services/syncService';
import { QrScanEvent, HourlyScanDataPoint, QrScanTrendMetrics, GameState } from '../types';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';

interface QrScanTrendsChartProps {
  gameState: GameState;
  onBackToCurrentQr?: () => void;
  onBackToHistory?: () => void;
  className?: string;
}

type TimeRangeFilter = 'today' | 'last12h' | 'all';
type ChartType = 'area' | 'bar';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  peakCount: number;
}

const CustomChartTooltip: React.FC<CustomTooltipProps> = ({ active, payload, label, peakCount }) => {
  if (!active || !payload || !payload.length) return null;
  const data: HourlyScanDataPoint = payload[0]?.payload;
  if (!data) return null;

  const isPeak = peakCount > 0 && data.scans === peakCount && data.scans > 0;

  return (
    <div className="p-3 rounded-[2px] bg-[#0c1322]/95 border border-sky-400/50 shadow-2xl backdrop-blur-md text-left font-mono min-w-[200px] pointer-events-none">
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-sky-400/20">
        <div className="flex items-center gap-1.5 text-sky-200 font-bold text-xs">
          <Clock className="w-3.5 h-3.5 text-sky-400" />
          <span>{data.hour} - {String((data.hourNumber + 1) % 24).padStart(2, '0')}:00</span>
        </div>
        {data.isCurrentHour && (
          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[9px] font-bold border border-emerald-500/40 animate-pulse">
            Giờ Này
          </span>
        )}
        {isPeak && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold border border-amber-500/40 flex items-center gap-0.5">
            <Flame className="w-2.5 h-2.5" />
            Đỉnh Điểm
          </span>
        )}
      </div>

      <div className="space-y-1.5 text-[11px]">
        <div className="flex items-center justify-between text-white/90">
          <span className="text-white/60">Lượt quét trong giờ:</span>
          <span className="text-base font-black text-sky-300">
            {data.scans} <span className="text-[10px] font-normal text-sky-400/70">lượt</span>
          </span>
        </div>

        <div className="flex items-center justify-between text-white/70">
          <span className="text-white/50">Tích lũy đến giờ này:</span>
          <span className="font-bold text-indigo-300">{data.cumulativeScans} lượt</span>
        </div>

        {peakCount > 0 && (
          <div className="pt-1">
            <div className="flex justify-between text-[10px] text-white/50 mb-1">
              <span>So với đỉnh ({peakCount}):</span>
              <span className="text-sky-300 font-bold">{data.peakRatio}%</span>
            </div>
            <div className="w-full bg-black/60 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-sky-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, data.peakRatio)}%` }}
              />
            </div>
          </div>
        )}

        {data.sources && Object.keys(data.sources).length > 0 && (
          <div className="pt-1.5 mt-1 border-t border-white/10 flex items-center justify-between text-[10px]">
            <span className="text-white/40">Nguồn:</span>
            <div className="flex gap-1">
              {Object.entries(data.sources).map(([src, count]) => (
                <span key={src} className="px-1 py-0.5 rounded bg-white/10 text-sky-200">
                  {src === 'mobile_qr' ? '📱 QR' : src === 'admin_test' ? '🧪 Thử' : src}: {count}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const QrScanTrendsChart: React.FC<QrScanTrendsChartProps> = ({
  gameState,
  onBackToCurrentQr,
  onBackToHistory,
  className = ''
}) => {
  const [events, setEvents] = useState<QrScanEvent[]>(() => syncService.getScanEvents());
  const [timeRange, setTimeRange] = useState<TimeRangeFilter>('today');
  const [chartType, setChartType] = useState<ChartType>('area');
  const [showDetailedLog, setShowDetailedLog] = useState<boolean>(false);
  const [isSeeding, setIsSeeding] = useState<boolean>(false);

  // Subscribe to real-time sync
  useEffect(() => {
    const unsub = syncService.subscribeToScanEvents((newEvents) => {
      setEvents([...newEvents]);
    });
    return () => unsub();
  }, []);

  // Compute hourly data and metrics based on timeRange
  const { hourlyData, metrics } = useMemo(() => {
    return syncService.computeHourlyScanData(events, timeRange);
  }, [events, timeRange]);

  const handleTimeRangeChange = (range: TimeRangeFilter) => {
    vibrateSelection();
    soundFx.playClick();
    setTimeRange(range);
  };

  const handleChartTypeChange = (type: ChartType) => {
    vibrateSelection();
    soundFx.playClick();
    setChartType(type);
  };

  const handleSimulateScan = async (delta: number) => {
    vibrateTap();
    soundFx.playReveal(true);
    await syncService.adjustQrScanCount(delta);
  };

  const handleSeedSample = async () => {
    vibrateTap();
    soundFx.playClick();
    setIsSeeding(true);
    await syncService.generateSampleScanHistory(55);
    setIsSeeding(false);
  };

  const handleReset = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử lượt quét và đặt lại bộ đếm về 0?')) {
      vibrateTap();
      soundFx.playClick();
      await syncService.resetQrScanCount();
    }
  };

  return (
    <div id="qr-scan-trends-container" className={`space-y-3 font-mono text-left ${className}`}>
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between gap-2 flex-wrap pb-2 border-b border-sky-400/20">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-[2px] bg-gradient-to-br from-cyan-500/20 to-sky-500/30 border border-sky-400/40 text-sky-300 shadow-sm shadow-sky-950/50">
            <TrendingUp className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-sky-200 uppercase tracking-wider flex items-center gap-1.5">
              <span>Phân Tích Tần Suất Quét QR (Hourly Trends)</span>
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1 inline-block" />
                Firebase Realtime
              </span>
            </div>
            <p className="text-[10px] text-white/50">Biểu đồ đo lường số lượt quét mã QR theo từng khung giờ trong ngày</p>
          </div>
        </div>

        {/* View Toggle Tabs (Range & Chart Type) */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Time range switcher */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded-[2px] p-0.5">
            <button
              type="button"
              onClick={() => handleTimeRangeChange('today')}
              className={`px-2 py-1 rounded-[2px] text-[10px] font-bold transition cursor-pointer ${
                timeRange === 'today'
                  ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40 shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              Hôm nay (24h)
            </button>
            <button
              type="button"
              onClick={() => handleTimeRangeChange('last12h')}
              className={`px-2 py-1 rounded-[2px] text-[10px] font-bold transition cursor-pointer ${
                timeRange === 'last12h'
                  ? 'bg-sky-500/30 text-sky-200 border border-sky-400/40 shadow-sm'
                  : 'text-white/50 hover:text-white/80'
              }`}
            >
              12 Giờ Gần Nhất
            </button>
          </div>

          {/* Chart visual style toggle */}
          <div className="flex items-center bg-black/50 border border-white/10 rounded-[2px] p-0.5">
            <button
              type="button"
              onClick={() => handleChartTypeChange('area')}
              className={`p-1 rounded-[2px] transition cursor-pointer ${
                chartType === 'area'
                  ? 'bg-sky-500/30 text-sky-300 border border-sky-400/40'
                  : 'text-white/40 hover:text-white/80'
              }`}
              title="Biểu đồ Miền (Area Chart)"
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleChartTypeChange('bar')}
              className={`p-1 rounded-[2px] transition cursor-pointer ${
                chartType === 'bar'
                  ? 'bg-sky-500/30 text-sky-300 border border-sky-400/40'
                  : 'text-white/40 hover:text-white/80'
              }`}
              title="Biểu đồ Cột (Bar Chart)"
            >
              <BarChart2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Metric Summary Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Total Scans Card */}
        <div className="p-2.5 rounded-[2px] bg-gradient-to-br from-black/60 to-sky-950/40 border border-sky-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
            <span>Tổng Lượt Quét</span>
            <Sparkles className="w-3.5 h-3.5 text-sky-400/60" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-sky-300 tracking-tight flex items-baseline gap-1">
            {metrics.totalScans}
            <span className="text-[10px] font-normal text-sky-400/70">lượt</span>
          </div>
          <span className="text-[9px] text-white/40 truncate">
            {events.length} sự kiện được lưu
          </span>
        </div>

        {/* Peak Scan Hour Card */}
        <div className="p-2.5 rounded-[2px] bg-gradient-to-br from-black/60 to-amber-950/40 border border-amber-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
            <span>Khung Giờ Đỉnh Điểm</span>
            <Flame className="w-3.5 h-3.5 text-amber-400/70" />
          </div>
          <div className="text-sm sm:text-base font-bold text-amber-300 tracking-tight flex items-baseline gap-1 truncate">
            {metrics.peakCount > 0 ? metrics.peakHour : '--:--'}
          </div>
          <span className="text-[9px] text-amber-400/80 font-bold">
            {metrics.peakCount > 0 ? `${metrics.peakCount} lượt quét` : 'Chưa có dữ liệu'}
          </span>
        </div>

        {/* Average Scans / Hour Card */}
        <div className="p-2.5 rounded-[2px] bg-gradient-to-br from-black/60 to-indigo-950/40 border border-indigo-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
            <span>Tần Suất / Giờ Hoạt Động</span>
            <Activity className="w-3.5 h-3.5 text-indigo-400/60" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-indigo-300 tracking-tight flex items-baseline gap-1">
            ~{metrics.avgPerHour}
            <span className="text-[10px] font-normal text-indigo-400/70">lượt/h</span>
          </div>
          <span className="text-[9px] text-white/40 truncate">
            {metrics.activeHoursCount} khung giờ có quét
          </span>
        </div>

        {/* Current Hour Velocity Card */}
        <div className="p-2.5 rounded-[2px] bg-gradient-to-br from-black/60 to-emerald-950/40 border border-emerald-500/30 flex flex-col justify-between">
          <div className="flex items-center justify-between text-white/50 text-[10px] mb-1">
            <span>Khung Giờ Hiện Tại</span>
            {metrics.velocityTrend === 'UP' ? (
              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            ) : metrics.velocityTrend === 'DOWN' ? (
              <ArrowDownRight className="w-3.5 h-3.5 text-rose-400" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-emerald-400/60" />
            )}
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-300 tracking-tight flex items-baseline gap-1">
            {metrics.currentHourScans}
            <span className="text-[10px] font-normal text-emerald-400/70">lượt</span>
          </div>
          <span className={`text-[9px] font-bold flex items-center gap-0.5 ${
            metrics.velocityTrend === 'UP' ? 'text-emerald-400' : metrics.velocityTrend === 'DOWN' ? 'text-amber-400' : 'text-white/40'
          }`}>
            {metrics.velocityTrend === 'UP' && '↑ Đang tăng so với giờ trước'}
            {metrics.velocityTrend === 'DOWN' && '↓ Giảm so với giờ trước'}
            {metrics.velocityTrend === 'STABLE' && '→ Duy trì ổn định'}
          </span>
        </div>
      </div>

      {/* Main Recharts Visualization Canvas Card */}
      <div 
        id="qr-scan-recharts-card"
        className="p-3 rounded-[4px] bg-gradient-to-br from-[#0a1120] via-[#0d1629] to-[#0a101d] border border-sky-500/40 shadow-xl shadow-black/60 relative overflow-hidden"
      >
        <div className="flex items-center justify-between text-xs text-white/60 mb-2 font-mono">
          <span className="flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Phân Bổ Lượt Quét Theo Khung Giờ (00:00 - 23:00)</span>
          </span>
          <span className="text-[10px] text-sky-300/80">
            {metrics.totalScans} tổng lượt / {hourlyData.length} cột mốc
          </span>
        </div>

        {/* Recharts Container */}
        <div className="w-full h-56 sm:h-64 pt-1">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'area' ? (
              <AreaChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="qrScanAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.65} />
                    <stop offset="60%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0369a1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="qrScanStrokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="50%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#22d3ee" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  stroke="#ffffff40" 
                  fontSize={10}
                  tickLine={false}
                  interval={timeRange === 'today' ? 2 : 1}
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="#ffffff40" 
                  fontSize={10}
                  allowDecimals={false}
                  tickLine={false}
                  fontFamily="monospace"
                />
                <Tooltip 
                  content={<CustomChartTooltip peakCount={metrics.peakCount} />} 
                />
                {metrics.peakCount > 0 && (
                  <ReferenceLine 
                    y={metrics.peakCount} 
                    stroke="#f59e0b" 
                    strokeDasharray="4 4" 
                    label={{ value: `Đỉnh: ${metrics.peakCount}`, fill: '#f59e0b', fontSize: 9, position: 'top' }} 
                  />
                )}
                <Area 
                  type="monotone" 
                  dataKey="scans" 
                  stroke="url(#qrScanStrokeGradient)" 
                  strokeWidth={2.5}
                  fill="url(#qrScanAreaGradient)"
                  activeDot={{ r: 5, fill: '#38bdf8', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            ) : (
              <BarChart data={hourlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="qrBarGradientNormal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#0369a1" />
                  </linearGradient>
                  <linearGradient id="qrBarGradientPeak" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbbf24" />
                    <stop offset="100%" stopColor="#d97706" />
                  </linearGradient>
                  <linearGradient id="qrBarGradientCurrent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                <XAxis 
                  dataKey="hour" 
                  stroke="#ffffff40" 
                  fontSize={10}
                  tickLine={false}
                  interval={timeRange === 'today' ? 2 : 1}
                  fontFamily="monospace"
                />
                <YAxis 
                  stroke="#ffffff40" 
                  fontSize={10}
                  allowDecimals={false}
                  tickLine={false}
                  fontFamily="monospace"
                />
                <Tooltip 
                  content={<CustomChartTooltip peakCount={metrics.peakCount} />} 
                />
                <Bar dataKey="scans" radius={[3, 3, 0, 0]}>
                  {hourlyData.map((entry, index) => {
                    const isPeak = metrics.peakCount > 0 && entry.scans === metrics.peakCount;
                    const isCurrent = entry.isCurrentHour;
                    let fill = 'url(#qrBarGradientNormal)';
                    if (isPeak) fill = 'url(#qrBarGradientPeak)';
                    else if (isCurrent) fill = 'url(#qrBarGradientCurrent)';
                    return <Cell key={`cell-${index}`} fill={fill} />;
                  })}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        {/* Chart Footer Legend */}
        <div className="flex items-center justify-between text-[10px] text-white/50 pt-2 border-t border-white/10 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-sky-400 inline-block" />
              <span>Lượt quét theo giờ</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-amber-400 inline-block" />
              <span>Giờ đỉnh điểm</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 inline-block" />
              <span>Giờ hiện tại</span>
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateSelection();
              soundFx.playClick();
              setShowDetailedLog(!showDetailedLog);
            }}
            className="text-sky-300 hover:text-sky-200 underline cursor-pointer flex items-center gap-1"
          >
            <Layers className="w-3 h-3" />
            <span>{showDetailedLog ? 'Thu gọn bảng chi tiết' : 'Xem bảng chi tiết từng giờ'}</span>
          </button>
        </div>
      </div>

      {/* Optional Detailed Hourly Log Grid Table */}
      {showDetailedLog && (
        <div 
          id="qr-scan-detailed-hourly-log"
          className="p-3 rounded-[2px] bg-black/60 border border-sky-400/30 animate-fadeIn"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-200 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Bảng Thống Kê Chi Tiết Từng Khung Giờ</span>
            </span>
            <span className="text-[10px] text-white/40">Sắp xếp theo dòng thời gian</span>
          </div>

          <div className="max-h-48 overflow-y-auto pr-1 space-y-1.5 divide-y divide-white/5 custom-scrollbar">
            {hourlyData.map((d) => (
              <div 
                key={d.hour} 
                className={`pt-1.5 first:pt-0 flex items-center justify-between text-[11px] ${
                  d.isCurrentHour ? 'text-emerald-300 font-bold bg-emerald-950/20 px-2 py-1 rounded-[2px]' : ''
                }`}
              >
                <div className="flex items-center gap-2 min-w-[80px]">
                  <span className="font-mono text-white/80">{d.hour}</span>
                  {d.isCurrentHour && (
                    <span className="px-1 py-0.2 rounded-[2px] bg-emerald-500/20 text-emerald-400 text-[8px]">NOW</span>
                  )}
                  {metrics.peakCount > 0 && d.scans === metrics.peakCount && d.scans > 0 && (
                    <span className="px-1 py-0.2 rounded-[2px] bg-amber-500/20 text-amber-300 text-[8px] flex items-center gap-0.5">
                      <Flame className="w-2 h-2" /> PEAK
                    </span>
                  )}
                </div>

                <div className="flex-1 max-w-[140px] sm:max-w-[220px] mx-2">
                  <div className="w-full bg-white/10 rounded-[2px] h-1.5 overflow-hidden">
                    <div 
                      className={`h-full rounded-[2px] ${
                        d.scans === metrics.peakCount && metrics.peakCount > 0 
                          ? 'bg-amber-400' 
                          : d.isCurrentHour 
                            ? 'bg-emerald-400' 
                            : 'bg-sky-400'
                      }`}
                      style={{ width: `${Math.min(100, d.peakRatio)}%` }}
                    />
                  </div>
                </div>

                <div className="text-right min-w-[60px]">
                  <span className={`font-mono font-bold ${d.scans > 0 ? 'text-sky-300' : 'text-white/30'}`}>
                    {d.scans} <span className="text-[9px] font-normal text-white/40">lượt</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Simulator / Rehearsal Action Controls for Admins */}
      <div className="p-2.5 rounded-[2px] bg-black/40 border border-white/10 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-white/50 block w-full sm:w-auto mr-1">Thao tác mô phỏng:</span>
          
          <button
            type="button"
            onClick={() => handleSimulateScan(1)}
            className="px-2 py-1 rounded-[2px] border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-[10px] font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
            title="Thử nghiệm thêm 1 lượt quét ngay bây giờ"
          >
            <Plus className="w-3 h-3" />
            <span>+1 Quét Ngay</span>
          </button>

          <button
            type="button"
            onClick={() => handleSimulateScan(5)}
            className="px-2 py-1 rounded-[2px] border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-[10px] font-bold transition cursor-pointer active:scale-95"
            title="Thêm +5 lượt quét thử nghiệm"
          >
            +5 Lượt
          </button>

          <button
            type="button"
            disabled={isSeeding}
            onClick={handleSeedSample}
            className="px-2 py-1 rounded-[2px] border border-indigo-400/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-200 text-[10px] font-bold transition cursor-pointer active:scale-95 flex items-center gap-1 disabled:opacity-50"
            title="Khởi tạo dữ liệu quét mẫu phân bổ đều các giờ trong ngày"
          >
            <RefreshCw className={`w-3 h-3 ${isSeeding ? 'animate-spin' : ''}`} />
            <span>Tạo Data Mẫu (24h)</span>
          </button>
        </div>

        {metrics.totalScans > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-1 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
            title="Xóa toàn bộ lịch sử quét & reset bộ đếm"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Toàn Bộ</span>
          </button>
        )}
      </div>

      {/* Navigation Footer: Back to QR Modal / QR History */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
        {onBackToCurrentQr && (
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              soundFx.playClick();
              onBackToCurrentQr();
            }}
            className="w-full py-2 px-3 rounded-[2px] border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Quay lại trình chiếu Mã QR Hiện Tại</span>
          </button>
        )}

        {onBackToHistory && (
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              soundFx.playClick();
              onBackToHistory();
            }}
            className="w-full py-2 px-3 rounded-[2px] border border-white/10 bg-white/5 hover:bg-white/10 text-white/80 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <History className="w-3.5 h-3.5" />
            <span>Xem Lịch Sử Cấu Hình QR (5 bản)</span>
          </button>
        )}
      </div>
    </div>
  );
};
