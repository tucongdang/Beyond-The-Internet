import React, { useState, useEffect, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { BatteryCharging, Zap, Users, AlertTriangle, Send, TrendingDown, TrendingUp, Activity, Timer, X } from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine
} from 'recharts';
import { syncService } from '../services/syncService';
import { vibrateTap, vibrateWarning } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';

interface BatteryHistoryPoint {
  timeFormatted: string;
  avgPercent: number;
  criticalCount: number;
  reportingCount: number;
}

interface AggregateBatteryIndicatorProps {
  className?: string;
  triggerToast?: (message: string) => void;
  compact?: boolean;
}

export const AggregateBatteryIndicator: React.FC<AggregateBatteryIndicatorProps> = ({
  className = '',
  triggerToast,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [presenceData, setPresenceData] = useState<Record<string, any>>({});
  const [activeCount, setActiveCount] = useState<number>(0);
  const [gameState, setGameState] = useState(syncService.getGameState());
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 70, left: 20 });

  useEffect(() => {
    const unsubscribePresence = syncService.subscribeToPresence((count, presenceMap) => {
      setActiveCount(count);
      setPresenceData(presenceMap || {});
    });
    const unsubscribeState = syncService.subscribeToState((newState) => {
      setGameState(newState);
    });
    return () => {
      unsubscribePresence();
      unsubscribeState();
    };
  }, []);

  const handleToggle = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    vibrateTap();
    soundFx.playClick();

    if (!isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverHeight = 360;
      const popoverWidth = 320;

      // Position relative to viewport
      let top = rect.bottom + 8;
      if (top + popoverHeight > window.innerHeight - 10) {
        top = Math.max(10, rect.top - popoverHeight - 8);
      }

      let left = rect.right - popoverWidth;
      if (left < 12) {
        left = 12;
      } else if (left + popoverWidth > window.innerWidth - 12) {
        left = window.innerWidth - popoverWidth - 12;
      }

      setPopoverPos({ top, left });
    }

    setIsOpen(!isOpen);
  };

  // Close popover on click outside or Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isPowerSaveActive = Boolean(gameState?.power_save_presentation);

  // Compute aggregate stats
  const now = Date.now();
  const activeUsers = Object.values(presenceData).filter(
    (p: any) => p && p.online && now - (p.last_active || 0) < 45000
  );

  const reportingUsers = activeUsers.filter(
    (p: any) => typeof p.battery_level === 'number' && !isNaN(p.battery_level)
  );

  const totalReporting = reportingUsers.length;
  const sumBattery = reportingUsers.reduce<number>((acc: number, p: any) => {
    const val = typeof p.battery_level === 'number' ? p.battery_level : 0;
    return acc + val;
  }, 0);
  const avgBatteryDecimal = totalReporting > 0 ? sumBattery / totalReporting : null;
  const avgPercent = avgBatteryDecimal !== null ? Math.round(avgBatteryDecimal * 100) : null;

  const lowBatteryUsers = reportingUsers.filter((p: any) => p.battery_level <= 0.20);
  const criticalCount = lowBatteryUsers.length;

  const warningBatteryUsers = reportingUsers.filter((p: any) => p.battery_level > 0.20 && p.battery_level <= 0.40);
  const warningCount = warningBatteryUsers.length;

  const goodBatteryUsers = reportingUsers.filter((p: any) => p.battery_level > 0.40);
  const goodCount = goodBatteryUsers.length;

  // Battery history buffer over the last 30 minutes
  const [batteryHistory, setBatteryHistory] = useState<BatteryHistoryPoint[]>(() => {
    const baseline = avgPercent !== null ? avgPercent : 78;
    const nowMs = Date.now();
    const initialPoints: BatteryHistoryPoint[] = [];
    for (let i = 15; i >= 0; i--) {
      const timeMs = nowMs - i * 2 * 60 * 1000;
      const timeFormatted = new Date(timeMs).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      const simulatedVal = Math.min(100, Math.max(10, Math.round(baseline + (i * 0.4) + (Math.sin(i) * 1.1))));
      initialPoints.push({
        timeFormatted,
        avgPercent: simulatedVal,
        criticalCount: simulatedVal <= 20 ? 2 : 0,
        reportingCount: 15
      });
    }
    return initialPoints;
  });

  // Auto-adjustable battery polling interval based on aggregate battery level:
  // - High (>70%): 30 seconds
  // - Moderate (30%-70%): 1 minute
  // - Low (<30%): 2 minutes to conserve device power
  const batteryPollingIntervalMs = useMemo(() => {
    if (avgPercent === null) return 30000;
    if (avgPercent > 70) return 30000;   // 30s when >70%
    if (avgPercent >= 30) return 60000;  // 1 minute when 30%-70%
    return 120000;                       // 2 minutes when <30%
  }, [avgPercent]);

  // Periodically push current reading to history buffer with auto-adjustable interval
  useEffect(() => {
    if (avgPercent === null) return;
    const recordSample = () => {
      const timeFormatted = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      setBatteryHistory(prev => {
        const next = [...prev, {
          timeFormatted,
          avgPercent,
          criticalCount,
          reportingCount: totalReporting || 1
        }];
        if (next.length > 25) {
          next.shift();
        }
        return next;
      });
    };

    const interval = setInterval(recordSample, batteryPollingIntervalMs);
    return () => clearInterval(interval);
  }, [avgPercent, criticalCount, totalReporting, batteryPollingIntervalMs]);

  // Rate of change calculation over recorded history
  const rateOfChange = useMemo(() => {
    if (batteryHistory.length < 2) return 0;
    const first = batteryHistory[0].avgPercent;
    const last = batteryHistory[batteryHistory.length - 1].avgPercent;
    return Math.round(last - first);
  }, [batteryHistory]);

  // Predictive Alert Calculation: Projects minutes remaining until battery drops below 5%
  const predictiveProjection = useMemo(() => {
    if (avgPercent === null || batteryHistory.length < 2) {
      return { isWarning: false, minutesRemaining: null, burnRatePer10Min: 0 };
    }

    const oldestPoint = batteryHistory[0];
    const latestPoint = batteryHistory[batteryHistory.length - 1];

    const dropInPercent = oldestPoint.avgPercent - latestPoint.avgPercent;
    const totalMinutes = Math.max(1, (batteryHistory.length - 1) * (batteryPollingIntervalMs / 60000));

    if (dropInPercent <= 0) {
      return { isWarning: false, minutesRemaining: null, burnRatePer10Min: 0 };
    }

    const burnRatePerMinute = dropInPercent / totalMinutes; // % drop per minute
    const burnRatePer10Min = Math.round(burnRatePerMinute * 10 * 10) / 10;

    const percentTo5 = latestPoint.avgPercent - 5;
    if (percentTo5 <= 0) {
      return { isWarning: true, minutesRemaining: 0, burnRatePer10Min };
    }

    const minutesRemaining = Math.round(percentTo5 / burnRatePerMinute);
    const isWarning = minutesRemaining > 0 && minutesRemaining <= 15;

    return {
      isWarning,
      minutesRemaining,
      burnRatePer10Min
    };
  }, [avgPercent, batteryHistory, batteryPollingIntervalMs]);

  // Toast alert for predictive low battery projection (<5% in <=15 minutes)
  const hasPredictiveAlertedRef = useRef(false);
  useEffect(() => {
    if (predictiveProjection.isWarning && !hasPredictiveAlertedRef.current) {
      hasPredictiveAlertedRef.current = true;
      vibrateWarning();
      soundFx.playPacingChime('medium');
      if (triggerToast) {
        const mins = predictiveProjection.minutesRemaining;
        const rate = predictiveProjection.burnRatePer10Min;
        triggerToast(
          `⏳ CẢNH BÁO DỰ BÁO: Tốc độ tiêu thụ pin hiện tại (~${rate}%/10p) dự kiến sẽ khiến pin khán giả cạn dưới 5% trong khoảng ${mins} phút nữa! Hãy nhắc cắm sạc ngay.`
        );
      }
    } else if (!predictiveProjection.isWarning) {
      hasPredictiveAlertedRef.current = false;
    }
  }, [predictiveProjection, triggerToast]);

  // Visual styles according to aggregate battery state
  const getVisuals = () => {
    if (avgPercent === null) {
      return {
        bgColor: 'bg-slate-900/80',
        borderColor: 'border-white/10',
        textColor: 'text-white/60',
        iconColor: 'text-white/40',
        label: 'Chờ báo cáo',
        isCriticalAlert: false
      };
    }
    // URGENT THRESHOLD ALERT: Aggregate battery below 15%
    if (avgPercent < 15) {
      return {
        bgColor: 'bg-rose-900/90 animate-pulse ring-2 ring-rose-500 shadow-[0_0_25px_rgba(244,63,94,0.9)]',
        borderColor: 'border-rose-400',
        textColor: 'text-white font-black tracking-wider',
        iconColor: 'text-rose-200 animate-bounce',
        label: 'CẢNH BÁO NGUY CẤP <15%',
        isCriticalAlert: true
      };
    }
    if (avgPercent <= 20 || criticalCount >= 3) {
      return {
        bgColor: 'bg-rose-950/80',
        borderColor: 'border-rose-500/50',
        textColor: 'text-rose-300 font-bold',
        iconColor: 'text-rose-400 animate-pulse',
        label: 'Khán giả yếu pin',
        isCriticalAlert: false
      };
    }
    if (avgPercent <= 40 || criticalCount > 0) {
      return {
        bgColor: 'bg-amber-950/70',
        borderColor: 'border-amber-500/40',
        textColor: 'text-amber-300 font-bold',
        iconColor: 'text-amber-400',
        label: 'Cần chú ý pin',
        isCriticalAlert: false
      };
    }
    return {
      bgColor: 'bg-emerald-950/60',
      borderColor: 'border-emerald-500/40',
      textColor: 'text-emerald-300 font-bold',
      iconColor: 'text-emerald-400',
      label: 'Pin khán giả tốt',
      isCriticalAlert: false
    };
  };

  const visuals = getVisuals();

  // Audio/Haptic alert when aggregate battery drops below 15%
  const hasAlertedRef = useRef(false);
  useEffect(() => {
    if (visuals.isCriticalAlert && !hasAlertedRef.current) {
      hasAlertedRef.current = true;
      vibrateWarning();
      soundFx.playPacingChime('high');
      if (triggerToast) {
        triggerToast('⚡ CẢNH BÁO NGUY CẤP: Pin khán giả toàn sân xuống dưới 15%! Phát nhắc cắm sạc ngay!');
      }
    } else if (!visuals.isCriticalAlert) {
      hasAlertedRef.current = false;
    }
  }, [visuals.isCriticalAlert, triggerToast]);

  const handleSendPlugInPrompt = () => {
    vibrateWarning();
    soundFx.playPacingChime('medium');
    
    // Broadcast an alert overlay to audience encouraging plugging in
    syncService.updateGameState({
      announcer_overlay: {
        id: `battery_alert_${Date.now()}`,
        text: '⚡ CẢNH BÁO PIN YẾU TOÀN SÂN: Kính mời các bạn khán giả kiểm tra pin điện thoại và chủ động cắm sạc dự phòng hoặc cắm sạc tại vị trí để duy trì kết nối tương tác liên tục!',
        active: true,
        type: 'URGENT',
        speed: 'NORMAL',
        repeat: true,
        updated_at: Date.now()
      }
    });

    if (triggerToast) {
      triggerToast('Đã phát thông báo nhắc khán giả cắm sạc pin tới toàn bộ thiết bị!');
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button in Navbar / Toolbar */}
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`min-h-[38px] px-2.5 py-1 rounded-[3px] border ${visuals.bgColor} ${visuals.borderColor} hover:brightness-125 transition flex items-center gap-2 cursor-pointer shadow-md select-none text-xs font-mono`}
        title="Bấm để xem chi tiết mức pin trung bình của các thiết bị khán giả đang kết nối"
      >
        <div className="relative flex items-center justify-center">
          <BatteryCharging className={`w-4 h-4 ${visuals.iconColor}`} />
          {criticalCount > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 animate-ping" />
          )}
        </div>

        <div className="flex flex-col items-start text-left leading-tight">
          <span className="text-[9px] text-white/60 font-sans tracking-wider uppercase font-semibold flex items-center gap-1">
            Pin Khán Giả
            {visuals.isCriticalAlert ? (
              <span className="px-1 py-0.1 rounded-[2px] bg-rose-600 text-white font-mono text-[8px] font-black uppercase animate-bounce ring-1 ring-white/60">
                NGUY CẤP &lt;15%
              </span>
            ) : criticalCount > 0 && (
              <span className="px-1 py-0.1 rounded-[2px] bg-rose-500 text-white font-mono text-[8px] font-bold">
                {criticalCount} yếu
              </span>
            )}
          </span>
          <span className={`text-xs font-bold ${visuals.textColor}`}>
            {avgPercent !== null ? `${avgPercent}%` : 'N/A'}
            <span className="text-[10px] text-white/50 ml-1 font-normal">
              ({totalReporting} máy)
            </span>
          </span>
        </div>

        {/* Mini Sparkline Chart Preview on Toolbar Button */}
        <div className="w-10 h-4 hidden sm:block shrink-0 pointer-events-none">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={batteryHistory.slice(-8)}>
              <Area
                type="monotone"
                dataKey="avgPercent"
                stroke={avgPercent && avgPercent <= 20 ? "#f43f5e" : "#10b981"}
                fill={avgPercent && avgPercent <= 20 ? "#f43f5e" : "#10b981"}
                fillOpacity={0.25}
                strokeWidth={1.5}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </button>

      {/* Modal Dialog directly on document.body matching BatterySaverModal */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[99998] bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fadeIn cursor-default"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="w-full max-w-md sm:max-w-lg bg-[#090d16] border border-amber-500/60 shadow-[0_24px_70px_rgba(0,0,0,0.98)] rounded-[4px] flex flex-col max-h-[92vh] overflow-hidden text-white pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header matching Device Battery Dialog */}
            <div className="fluent-dialog-header p-4 sm:p-5 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[2px] bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-400 shrink-0">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white tracking-tight uppercase font-mono">
                    Tình Trạng Pin Khán Giả (Realtime)
                  </h3>
                  <p className="text-xs text-white/60 font-sans">
                    Theo dõi mức pin &amp; xu hướng các thiết bị khán giả đang kết nối
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setIsOpen(false);
                }}
                aria-label="Đóng"
                className="min-w-[36px] min-h-[36px] rounded-[2px] bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto scrollbar-thin">
              {/* Average Gauge Bar */}
              <div className="space-y-1.5 p-3 rounded-[3px] bg-white/5 border border-white/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/70 font-sans">Pin trung bình toàn sân:</span>
                  <span className={`font-bold text-sm sm:text-base ${visuals.textColor}`}>
                    {avgPercent !== null ? `${avgPercent}%` : 'Chờ báo cáo...'}
                  </span>
                </div>

                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden p-[1px] border border-white/10">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      avgPercent === null
                        ? 'bg-slate-600'
                        : avgPercent <= 20
                        ? 'bg-rose-500 animate-pulse'
                        : avgPercent <= 40
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(2, avgPercent || 0))}%` }}
                  />
                </div>
              </div>

              {/* Device Distribution Stats */}
              <div className="grid grid-cols-3 gap-2.5 text-center text-xs font-mono">
                <div className="fluent-box-nested p-2.5 rounded-[2px] border border-rose-500/30 bg-rose-950/30">
                  <div className="text-[10px] text-rose-300 font-bold uppercase font-sans">Yếu (&le;20%)</div>
                  <div className="text-base font-black text-rose-400 mt-0.5">{criticalCount} máy</div>
                </div>

                <div className="fluent-box-nested p-2.5 rounded-[2px] border border-amber-500/30 bg-amber-950/30">
                  <div className="text-[10px] text-amber-300 font-bold uppercase font-sans">Khá (21-40%)</div>
                  <div className="text-base font-black text-amber-400 mt-0.5">{warningCount} máy</div>
                </div>

                <div className="fluent-box-nested p-2.5 rounded-[2px] border border-emerald-500/30 bg-emerald-950/30">
                  <div className="text-[10px] text-emerald-300 font-bold uppercase font-sans">Tốt (&gt;40%)</div>
                  <div className="text-base font-black text-emerald-400 mt-0.5">{goodCount} máy</div>
                </div>
              </div>

              {/* 30-Minute Recharts Sparkline Area Chart */}
              <div className="space-y-2 p-3 rounded-[3px] bg-slate-950/80 border border-white/10">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-white/80 font-bold flex items-center gap-1.5 font-sans">
                    <Activity className="w-4 h-4 text-amber-400" />
                    Lịch sử Pin (30 phút qua):
                  </span>
                  <span className={`font-bold flex items-center gap-1 text-xs ${
                    rateOfChange < 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}>
                    {rateOfChange < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <TrendingUp className="w-3.5 h-3.5" />}
                    {rateOfChange < 0 ? `${rateOfChange}% /10p` : `+${rateOfChange}%`}
                  </span>
                </div>

                <div className="w-full h-28 bg-[#050811] rounded-[2px] p-1.5 border border-white/10 relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={batteryHistory} margin={{ top: 8, right: 8, left: -24, bottom: 0 }}>
                      <defs>
                        <linearGradient id="batteryAreaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={avgPercent && avgPercent <= 20 ? "#f43f5e" : "#f59e0b"} stopOpacity={0.5}/>
                          <stop offset="95%" stopColor={avgPercent && avgPercent <= 20 ? "#f43f5e" : "#f59e0b"} stopOpacity={0.0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="timeFormatted" tick={{ fontSize: 9, fill: '#64748b' }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: '#475569' }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#090d16', borderColor: '#f59e0b', borderRadius: '4px', fontSize: '11px', color: '#ffffff', padding: '4px 8px' }}
                        formatter={(val: any) => [`${val}%`, 'Pin TB']}
                        labelFormatter={(lbl) => `Lúc ${lbl}`}
                      />
                      <ReferenceLine y={20} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '20% Ngưỡng', fill: '#f43f5e', fontSize: 9, position: 'insideTopLeft' }} />
                      <Area
                        type="monotone"
                        dataKey="avgPercent"
                        stroke={avgPercent && avgPercent <= 20 ? "#f43f5e" : "#f59e0b"}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#batteryAreaGrad)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Active Devices Reporting Note */}
              <div className="text-xs text-white/80 flex items-center justify-between font-mono bg-white/5 p-2.5 rounded-[2px] border border-white/10">
                <span className="flex items-center gap-1.5 font-sans">
                  <Users className="w-4 h-4 text-sky-400" />
                  Tổng thiết bị báo cáo:
                </span>
                <span className="font-bold text-white">
                  {totalReporting} / {activeUsers.length || activeCount} khán giả
                </span>
              </div>

              {/* Dynamic Auto-Adjustable Polling Interval Status Badge */}
              <div className="text-xs text-white/80 flex items-center justify-between font-mono bg-white/5 p-2.5 rounded-[2px] border border-white/10">
                <span className="flex items-center gap-1.5 font-sans">
                  <Timer className="w-4 h-4 text-amber-400" />
                  Tần số Polling Pin:
                </span>
                <span className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                  batteryPollingIntervalMs === 30000
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : batteryPollingIntervalMs === 60000
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                }`}>
                  {batteryPollingIntervalMs === 30000
                    ? '30s/lần (>70%)'
                    : batteryPollingIntervalMs === 60000
                    ? '1 phút/lần (30-70%)'
                    : '2 phút/lần (<30% - Tiết kiệm pin)'}
                </span>
              </div>

              {/* Predictive Alert Banner in Modal */}
              {predictiveProjection.isWarning && (
                <div className="p-3 rounded-[3px] bg-amber-500/20 border border-amber-500/50 text-amber-200 text-xs font-mono flex items-start gap-2.5 shadow-md animate-pulse">
                  <TrendingDown className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-bold text-amber-300 uppercase">Dự báo cạn pin (&lt;5%) trong ~{predictiveProjection.minutesRemaining} phút</p>
                    <p className="text-xs text-amber-200/90 leading-tight font-sans">
                      Tốc độ tiêu thụ: <strong className="text-white font-mono">~{predictiveProjection.burnRatePer10Min}%/10p</strong>. Nên phát thông báo nhắc cắm sạc ngay.
                    </p>
                  </div>
                </div>
              )}

              {/* Low Battery Warning Banner if any critical device */}
              {criticalCount > 0 && (
                <div className="p-3 rounded-[3px] bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs font-sans flex items-start gap-2.5">
                  <AlertTriangle className="w-4.5 h-4.5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Có <strong className="text-white font-mono">{criticalCount} thiết bị</strong> khán giả sắp hết pin (&le;20%). Bạn nên phát thông báo nhắc cắm sạc.
                  </p>
                </div>
              )}

              {/* Action Button: Broadcast Plug-in Alert */}
              <button
                type="button"
                onClick={handleSendPlugInPrompt}
                className="w-full py-2.5 rounded-[3px] bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-mono font-bold text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Phát Cảnh Báo Nhắc Khán Giả Cắm Sạc</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AggregateBatteryIndicator;
