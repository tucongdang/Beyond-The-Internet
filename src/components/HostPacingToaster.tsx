import React, { useState, useEffect } from 'react';
import {
  Bell,
  BellRing,
  Volume2,
  VolumeX,
  Zap,
  Lock,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  X,
  Sliders,
  Sparkles,
  Layers,
  Clock,
  Users,
  Activity
} from 'lucide-react';
import { vibrateTap, vibrateWarning } from '../utils/hapticUtils';

export interface PacingToastItem {
  id: string;
  questionId: string;
  type: '50' | '75' | '90' | '100' | 'rush' | 'volume';
  title: string;
  message: string;
  detail?: string;
  percent: number;
  count: number;
  total: number;
  timestamp: number;
  durationMs: number;
  level: 'low' | 'medium' | 'high' | 'complete';
}

export interface HostPacingSettings {
  enabled: boolean;
  soundEnabled: boolean;
  minThreshold: number; // 50, 75, 90
  rushAlertEnabled: boolean;
}

interface HostPacingToasterProps {
  toasts: PacingToastItem[];
  onDismiss: (id: string) => void;
  onQuickLock?: () => void;
  isGameActive: boolean;
}

/**
 * Floating Toaster Container for Host Pacing Alerts
 */
export const HostPacingToaster: React.FC<HostPacingToasterProps> = ({
  toasts,
  onDismiss,
  onQuickLock,
  isGameActive
}) => {
  if (toasts.length === 0) return null;

  return (
    <div
      id="host-pacing-toaster-container"
      className="fixed top-16 sm:top-20 left-3 right-3 sm:left-auto sm:right-6 z-50 flex flex-col gap-2.5 sm:gap-3 max-w-[calc(100vw-24px)] sm:max-w-md pointer-events-none"
    >
      {toasts.map((toast) => (
        <ToastCard
          key={toast.id}
          toast={toast}
          onDismiss={onDismiss}
          onQuickLock={onQuickLock}
          isGameActive={isGameActive}
        />
      ))}
    </div>
  );
};

interface ToastCardProps {
  toast: PacingToastItem;
  onDismiss: (id: string) => void;
  onQuickLock?: () => void;
  isGameActive: boolean;
}

const ToastCard: React.FC<ToastCardProps> = ({
  toast,
  onDismiss,
  onQuickLock,
  isGameActive
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 100 - (elapsed / toast.durationMs) * 100);
      setProgress(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        onDismiss(toast.id);
      }
    }, 50);

    return () => clearInterval(interval);
  }, [toast.id, toast.durationMs, onDismiss]);

  // Color theming based on milestone type
  const theme = {
    '100': {
      border: 'border-emerald-400/60 ring-2 ring-emerald-500/30',
      bg: 'bg-gradient-to-r from-[#041a10]/95 via-[#062416]/95 to-[#0b1b2b]/95',
      iconBg: 'fluent-box-nested text-emerald-400 border border-emerald-500/40',
      badge: 'fluent-box-nested text-emerald-300 border border-emerald-500/40',
      progressBar: 'bg-emerald-400',
      icon: CheckCircle2
    },
    '90': {
      border: 'border-[#F7CAC9]/50 ring-2 ring-[#F7CAC9]/20',
      bg: 'bg-gradient-to-r from-[#061e2e]/95 via-[#08283d]/95 to-[#0f172a]/95',
      iconBg: 'bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] border border-[#F7CAC9]/40',
      badge: 'bg-[#F7CAC9]/20 backdrop-blur-md text-[#FCEEEC] border border-[#F7CAC9]/40',
      progressBar: 'bg-[#F7CAC9]',
      icon: TrendingUp
    },
    '75': {
      border: 'border-amber-500/50',
      bg: 'bg-gradient-to-r from-[#211604]/95 via-[#2b1d06]/95 to-[#0f172a]/95',
      iconBg: 'fluent-box-nested text-amber-400 border border-amber-500/40',
      badge: 'fluent-box-nested text-amber-300 border border-amber-500/40',
      progressBar: 'bg-amber-400',
      icon: Zap
    },
    '50': {
      border: 'border-[#FCEEEC]/40',
      bg: 'bg-gradient-to-r from-[#120f2e]/95 via-[#1a1542]/95 to-[#0f172a]/95',
      iconBg: 'bg-[#FCEEEC]/20 backdrop-blur-md text-[#EBC7D6] border border-[#FCEEEC]/40',
      badge: 'bg-[#FCEEEC]/20 backdrop-blur-md text-[#EBC7D6] border border-[#FCEEEC]/40',
      progressBar: 'bg-[#E39A96]',
      icon: Activity
    },
    rush: {
      border: 'border-rose-500/50 ring-2 ring-rose-500/20',
      bg: 'bg-gradient-to-r from-[#2e0915]/95 via-[#3b0d1d]/95 to-[#0f172a]/95',
      iconBg: 'fluent-box-nested text-rose-400 border border-rose-500/40',
      badge: 'fluent-box-nested text-rose-300 border border-rose-500/40',
      progressBar: 'bg-rose-500',
      icon: Sparkles
    },
    volume: {
      border: 'border-[#E39A96]/40',
      bg: 'bg-gradient-to-r from-[#0b192e]/95 via-[#10223f]/95 to-[#0f172a]/95',
      iconBg: 'bg-[#E39A96]/20 backdrop-blur-md text-[#FCEEEC] border border-[#E39A96]/40',
      badge: 'bg-[#E39A96]/20 backdrop-blur-md text-[#EBC7D6] border border-[#E39A96]/40',
      progressBar: 'bg-[#FCEEEC]',
      icon: Users
    }
  }[toast.type];

  const IconComp = theme.icon;

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden rounded-[2px] border ${theme.border} ${theme.bg} p-4 shadow-2xl backdrop-blur-xl animate-slideInRight transition-all`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`w-10 h-10 rounded-[2px] flex items-center justify-center shrink-0 ${theme.iconBg}`}>
          <IconComp className="w-5 h-5 animate-pulse" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] uppercase tracking-wider ${theme.badge}`}>
                {toast.type === 'rush' ? '⚡ TỐC ĐỘ CAO' : toast.type === 'volume' ? '📊 CỘT MỐC LƯỢT NỘP' : `TIẾN ĐỘ ${toast.percent}%`}
              </span>
              <span className="text-[10px] font-mono text-white/40">
                [{toast.questionId}]
              </span>
            </div>

            <button
              onClick={() => onDismiss(toast.id)}
              className="p-1 text-white/40 hover:text-white rounded-[2px] hover:fluent-box-nested transition"
              title="Đóng thông báo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
            {toast.title}
          </h4>

          <p className="text-xs text-white/70 mt-1 leading-relaxed">
            {toast.message}
          </p>

          {/* Quick Action Footer */}
          <div className="flex items-center justify-between gap-2 mt-3 pt-2.5 border-t border-white/10">
            <div className="flex items-center gap-2 text-[11px] font-mono text-white/60">
              <Users className="w-3.5 h-3.5 text-white/40" />
              <span>
                Đã nộp: <strong className="text-white font-bold">{toast.count}</strong> / {toast.total}
              </span>
            </div>

            {isGameActive && onQuickLock && (
              <button
                type="button"
                onClick={() => {
                  vibrateWarning();
                  onQuickLock();
                  onDismiss(toast.id);
                }}
                className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-[#0D0420] font-mono font-bold text-[11px] uppercase tracking-wider rounded-[2px] shadow transition flex items-center gap-1.5"
                title="Khóa nhận đáp án ngay lúc này"
              >
                <Lock className="w-3 h-3" />
                <span>Khóa Vote (L)</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Countdown Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-1 fluent-box-nested">
        <div
          className={`h-full ${theme.progressBar} transition-all duration-75`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

// =========================================================================
// HOST PACING INLINE WIDGET (For Master Console)
// =========================================================================

interface HostPacingWidgetProps {
  submittedCount: number;
  totalCount: number;
  percent: number;
  isGameActive: boolean;
  settings: HostPacingSettings;
  onUpdateSettings: (newSettings: Partial<HostPacingSettings>) => void;
  recentPacingEvents: PacingToastItem[];
  onQuickLock?: () => void;
}

export const HostPacingWidget: React.FC<HostPacingWidgetProps> = ({
  submittedCount,
  totalCount,
  percent,
  isGameActive,
  settings,
  onUpdateSettings,
  recentPacingEvents,
  onQuickLock
}) => {
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Determine pacing status recommendation
  const getPacingStatus = () => {
    if (!isGameActive) {
      return {
        label: 'Đang ở Chế Độ Chờ / Khóa',
        color: 'text-white/40 fluent-box-nested border-white/10',
        dot: 'bg-white/30',
        tip: 'Khán giả chưa mở cổng bình chọn'
      };
    }
    if (percent >= 100) {
      return {
        label: 'Hoàn Tất 100% Khán Giả',
        color: 'text-emerald-300 fluent-box-nested border-emerald-500/40',
        dot: 'bg-emerald-400 animate-ping',
        tip: 'Tất cả người tham gia đã nộp bài - Nên Khóa Vote ngay'
      };
    }
    if (percent >= 90) {
      return {
        label: 'Đa Số Đã Nộp (≥90%)',
        color: 'text-[#FCEEEC] bg-[#F7CAC9]/20 backdrop-blur-md border-[#F7CAC9]/40',
        dot: 'bg-[#F7CAC9] animate-pulse',
        tip: 'Gần như toàn bộ đã xong - Sẵn sàng Khóa Vote'
      };
    }
    if (percent >= 75) {
      return {
        label: 'Tiến Độ Tốt (≥75%)',
        color: 'text-amber-300 fluent-box-nested border-amber-500/40',
        dot: 'bg-amber-400',
        tip: 'Số lượng nộp đã đạt ngưỡng đa số an toàn'
      };
    }
    if (percent >= 50) {
      return {
        label: 'Đã Vượt Mốc 50%',
        color: 'text-[#EBC7D6] bg-[#FCEEEC]/20 backdrop-blur-md border-[#FCEEEC]/40',
        dot: 'bg-[#E39A96]',
        tip: 'Đang tiếp tục ghi nhận thêm phản hồi'
      };
    }
    return {
      label: 'Đang Tiếp Nhận Phản Hồi (<50%)',
      color: 'text-rose-300 fluent-box-nested border-rose-500/30',
      dot: 'bg-rose-400 animate-pulse',
      tip: 'Đang chờ khán giả hoàn thành lựa chọn'
    };
  };

  const status = getPacingStatus();

  return (
    <div
      id="host-pacing-master-widget"
      className="fluent-box-nested border border-white/10 rounded-[2px] p-3 sm:p-4 md:p-6 space-y-3 relative overflow-hidden"
    >
      {/* Header & Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[2px] bg-[#F7CAC9]/20 backdrop-blur-md border border-[#E39A96]/30 text-[#FCEEEC] flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs uppercase font-mono font-bold text-white tracking-wider">
                Hệ Thống Kiểm Soát Nhịp Độ (Host Pacing Control)
              </h3>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] border flex items-center gap-1.5 ${status.color}`}>
                <span className={`w-1.5 h-1.5 rounded-[2px] ${status.dot}`} />
                {status.label}
              </span>
            </div>
            <p className="text-[11px] text-white/50 mt-0.5">
              {status.tip}
            </p>
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`p-2 rounded-[2px] text-xs font-mono transition border ${
              settings.soundEnabled
                ? 'fluent-box-nested border-emerald-500/40 text-emerald-300'
                : 'fluent-box-nested border-white/10 text-white/40 hover:text-white'
            }`}
            title={settings.soundEnabled ? 'Chuông cảnh báo nhịp độ: ĐANG BẬT' : 'Chuông cảnh báo: ĐÃ TẮT'}
          >
            {settings.soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => onUpdateSettings({ enabled: !settings.enabled })}
            className={`px-2.5 py-1.5 rounded-[2px] text-xs font-mono font-bold transition border flex items-center gap-1.5 ${
              settings.enabled
                ? 'bg-[#F7CAC9]/20 backdrop-blur-md border-[#E39A96]/40 text-[#EBC7D6]'
                : 'fluent-box-nested border-white/10 text-white/40 hover:text-white'
            }`}
            title="Bật/Tắt Toast cảnh báo nhịp độ cho Host"
          >
            <BellRing className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">
              {settings.enabled ? 'Toast: BẬT' : 'Toast: TẮT'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            className="p-2 fluent-box-nested hover:fluent-box-nested border border-white/10 rounded-[2px] text-white/60 hover:text-white transition"
            title="Cài đặt ngưỡng nhịp độ"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          {recentPacingEvents.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHistoryModal(true)}
              className="px-2.5 py-1.5 fluent-box-nested hover:fluent-box-nested border border-white/10 rounded-[2px] text-[11px] font-mono text-white/70 hover:text-white transition flex items-center gap-1"
              title="Xem lịch sử cảnh báo"
            >
              <Clock className="w-3 h-3" />
              <span>{recentPacingEvents.length}</span>
            </button>
          )}
        </div>
      </div>

      {/* Settings Popover Dropdown */}
      {showSettingsMenu && (
        <div className="p-3 fluent-box-nested border border-white/10 rounded-[2px] space-y-3 animate-fadeIn text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <span className="font-bold text-white">Cấu Hình Ngưỡng Cảnh Báo Toast</span>
            <button
              type="button"
              onClick={() => setShowSettingsMenu(false)}
              className="text-white/40 hover:text-white text-xs"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-white/70">Ngưỡng thông báo tối thiểu:</span>
              <div className="flex gap-1">
                {[50, 75, 90].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => onUpdateSettings({ minThreshold: t })}
                    className={`px-2 py-0.5 rounded-[2px] font-mono text-[11px] font-bold ${
                      settings.minThreshold === t
                        ? 'bg-[#F7CAC9] text-white'
                        : 'fluent-box-nested text-white/60 hover:text-white'
                    }`}
                  >
                    {t}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-white/70">Cảnh báo tốc độ nhanh (Rush Turnout):</span>
              <button
                type="button"
                onClick={() => onUpdateSettings({ rushAlertEnabled: !settings.rushAlertEnabled })}
                className={`px-2 py-0.5 rounded-[2px] font-mono text-[11px] font-bold ${
                  settings.rushAlertEnabled
                    ? 'fluent-box-nested text-emerald-300 border border-emerald-500/40'
                    : 'fluent-box-nested text-white/40'
                }`}
              >
                {settings.rushAlertEnabled ? 'BẬT' : 'TẮT'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Live Pacing Gauge */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <span className="text-white/60">Tỷ lệ hoàn thành:</span>
            <span className="font-bold text-white text-sm">
              {submittedCount} / {totalCount}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`text-base font-black ${
              percent >= 90 ? 'text-emerald-400' : percent >= 75 ? 'text-[#F7CAC9]' : percent >= 50 ? 'text-amber-400' : 'text-white/80'
            }`}>
              {percent}%
            </span>
          </div>
        </div>

        {/* Progress bar with glowing milestone pips */}
        <div className="relative w-full h-3 fluent-box rounded-[2px] border border-white/10 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-[2px] ${
              percent >= 100
                ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                : percent >= 90
                ? 'bg-gradient-to-r from-[#F7CAC9] to-emerald-400'
                : percent >= 75
                ? 'bg-gradient-to-r from-amber-500 to-[#F7CAC9]'
                : percent >= 50
                ? 'bg-gradient-to-r from-[#FCEEEC] to-amber-500'
                : 'bg-gradient-horizon'
            }`}
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />

          {/* Milestone markers */}
          <div className="absolute inset-0 flex justify-between pointer-events-none px-0.5">
            <div className="w-px h-full fluent-box-nested" style={{ left: '50%' }} />
            <div className="w-px h-full fluent-box-nested" style={{ left: '75%' }} />
            <div className="w-px h-full fluent-box-nested" style={{ left: '90%' }} />
          </div>
        </div>

        {/* Milestone Labels */}
        <div className="flex justify-between text-[9px] font-mono text-white/30 px-0.5 pt-0.5">
          <span>0%</span>
          <span className={percent >= 50 ? 'text-[#EBC7D6] font-bold' : ''}>50%</span>
          <span className={percent >= 75 ? 'text-amber-300 font-bold' : ''}>75%</span>
          <span className={percent >= 90 ? 'text-[#FCEEEC] font-bold' : ''}>90%</span>
          <span className={percent >= 100 ? 'text-emerald-300 font-bold' : ''}>100%</span>
        </div>
      </div>

      {/* Quick Lock Action if majority responded */}
      {isGameActive && percent >= 75 && onQuickLock && (
        <div className="pt-1 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 sm:gap-2 fluent-box-nested border border-amber-500/30 rounded-[2px] p-2.5">
          <div className="flex items-center gap-2 text-xs text-amber-200">
            <Zap className="w-4 h-4 text-amber-400 animate-pulse shrink-0" />
            <span>
              {percent >= 90 ? 'Đa số khán giả đã nộp bài.' : 'Đã đạt trên 75% phản hồi.'} Host có thể chốt sớm để giữ nhịp show:
            </span>
          </div>

          <button
            type="button"
            onClick={onQuickLock}
            className="w-full sm:w-auto px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-[#0D0420] font-bold font-mono text-xs rounded-[2px] uppercase tracking-wider transition shadow flex items-center justify-center gap-1.5 shrink-0"
          >
            <Lock className="w-3.5 h-3.5" /> Khóa Vote (L)
          </button>
        </div>
      )}

      {/* Recent Alerts Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[24px] saturate-150/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a]/50 backdrop-blur-md border border-white/10 rounded-[2px] max-w-md w-full p-5 space-y-4 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#FCEEEC]" />
                <h4 className="text-sm font-bold text-white font-mono uppercase">
                  Lịch Sử Cảnh Báo Nhịp Độ ({recentPacingEvents.length})
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="text-white/40 hover:text-white text-xs"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {recentPacingEvents.length === 0 ? (
                <p className="text-xs text-white/30 text-center py-6">
                  Chưa có sự kiện nhịp độ nào được kích hoạt.
                </p>
              ) : (
                recentPacingEvents.map((e) => (
                  <div
                    key={e.id}
                    className="p-3 fluent-box-nested border border-white/10 rounded-[2px] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-[#FCEEEC]">
                        [{e.questionId}] {e.title}
                      </span>
                      <span className="text-[10px] text-white/40 font-mono">
                        {new Date(e.timestamp).toLocaleTimeString('vi-VN')}
                      </span>
                    </div>
                    <p className="text-white/80">{e.message}</p>
                    <div className="text-[10px] font-mono text-emerald-400">
                      Tỷ lệ: {e.percent}% ({e.count}/{e.total} nộp)
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowHistoryModal(false)}
                className="px-4 py-2 fluent-box-nested hover:fluent-box-nested text-white rounded-[2px] text-xs font-bold transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
