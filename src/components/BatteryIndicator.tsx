import { t } from '../utils/i18n';
import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useEffect } from 'react';
import {
  BatteryCharging,
  BatteryFull,
  BatteryMedium,
  BatteryLow,
  BatteryWarning,
  Zap,
  Leaf
} from 'lucide-react';
import {
  useBatterySaver,
  getAutoBatterySaverEnabled,
  setBatterySaverMode
} from '../utils/batterySaverUtils';
import { BatterySaverModal } from './BatterySaverModal';
import { vibrateTap } from '../utils/hapticUtils';

interface BatteryManager extends EventTarget {
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  level: number;
  addEventListener(
    type: 'chargingchange' | 'levelchange' | 'chargingtimechange' | 'dischargingtimechange',
    listener: (this: BatteryManager, ev: Event) => any
  ): void;
  removeEventListener(
    type: 'chargingchange' | 'levelchange' | 'chargingtimechange' | 'dischargingtimechange',
    listener: (this: BatteryManager, ev: Event) => any
  ): void;
}

interface BatteryState {
  supported: boolean;
  charging: boolean;
  level: number; // 0 to 1
  chargingTime: number;
  dischargingTime: number;
}

interface BatteryIndicatorProps {
  compact?: boolean;
  className?: string;
  showDetails?: boolean;
  onOpenBatterySaverModal?: () => void;
  forceLanguage?: 'vi' | 'en';
}

export const BatteryIndicator: React.FC<BatteryIndicatorProps> = ({
  compact = false,
  className = '',
  showDetails = false,
  onOpenBatterySaverModal,
  forceLanguage
}) => {
  const { localLanguage } = useLanguage();
  const effectiveLanguage = forceLanguage || localLanguage;

  const { isBatterySaver } = useBatterySaver();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [batteryState, setBatteryState] = useState<BatteryState>({
    supported: false,
    charging: false,
    level: 1,
    chargingTime: 0,
    dischargingTime: Infinity
  });

  useEffect(() => {
    let batteryManager: BatteryManager | null = null;
    let isMounted = true;

    const updateBatteryInfo = (bm: BatteryManager) => {
      if (!isMounted) return;
      setBatteryState({
        supported: true,
        charging: bm.charging,
        level: bm.level,
        chargingTime: bm.chargingTime,
        dischargingTime: bm.dischargingTime
      });

      // Auto-enable battery saver if battery drops below 20% and not charging
      if (bm.level <= 0.20 && !bm.charging && getAutoBatterySaverEnabled()) {
        setBatterySaverMode(true);
      }
    };

    if (
      typeof navigator !== 'undefined' &&
      'getBattery' in navigator &&
      typeof (navigator as any).getBattery === 'function'
    ) {
      (navigator as any)
        .getBattery()
        .then((bm: BatteryManager) => {
          if (!isMounted) return;
          batteryManager = bm;
          updateBatteryInfo(bm);

          const handleChange = () => updateBatteryInfo(bm);

          bm.addEventListener('chargingchange', handleChange);
          bm.addEventListener('levelchange', handleChange);
          bm.addEventListener('chargingtimechange', handleChange);
          bm.addEventListener('dischargingtimechange', handleChange);
        })
        .catch(() => {
          if (isMounted) {
            setBatteryState(prev => ({ ...prev, supported: false }));
          }
        });
    }

    return () => {
      isMounted = false;
      if (batteryManager) {
        const bm = batteryManager;
        const handleChange = () => updateBatteryInfo(bm);
        bm.removeEventListener('chargingchange', handleChange);
        bm.removeEventListener('levelchange', handleChange);
        bm.removeEventListener('chargingtimechange', handleChange);
        bm.removeEventListener('dischargingtimechange', handleChange);
      }
    };
  }, []);

  const handleOpenModal = () => {
    vibrateTap();
    if (onOpenBatterySaverModal) {
      onOpenBatterySaverModal();
    } else {
      setIsModalOpen(true);
    }
  };

  if (!batteryState.supported) {
    return null;
  }

  const percent = Math.round(batteryState.level * 100);
  const isCharging = batteryState.charging;

  // Format discharging or charging time if available and finite
  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) {
      return `${hrs}h ${mins}m`;
    }
    return `${mins}m`;
  };

  const remainingTimeStr = isCharging
    ? formatTime(batteryState.chargingTime)
    : formatTime(batteryState.dischargingTime);

  // Determine Icon & Color
  const getBatteryVisuals = () => {
    if (isBatterySaver) {
      return {
        icon: Zap,
        iconColor: 'text-emerald-400',
        textColor: 'text-emerald-300',
        borderColor: 'border-emerald-500/50',
        bgColor: 'bg-emerald-950/50',
        barColor: 'bg-emerald-400',
        statusText: effectiveLanguage === 'en' ? '⚡ Eco Mode' : `⚡ ${t("view_battery_save", effectiveLanguage)}`
      };
    }
    if (isCharging) {
      return {
        icon: BatteryCharging,
        iconColor: 'text-emerald-400',
        textColor: 'text-emerald-300',
        borderColor: 'border-emerald-500/40',
        bgColor: 'bg-white/5',
        barColor: 'bg-emerald-400',
        statusText: effectiveLanguage === 'en' ? 'Charging' : 'Đang sạc pin'
      };
    }
    if (percent <= 15) {
      return {
        icon: BatteryWarning,
        iconColor: 'text-rose-400 animate-pulse',
        textColor: 'text-rose-400 font-bold',
        borderColor: 'border-rose-500/50',
        bgColor: 'bg-rose-950/40',
        barColor: 'bg-rose-500',
        statusText: effectiveLanguage === 'en' ? 'Low battery' : 'Pin yếu'
      };
    }
    if (percent <= 30) {
      return {
        icon: BatteryLow,
        iconColor: 'text-amber-400',
        textColor: 'text-amber-300',
        borderColor: 'border-amber-500/40',
        bgColor: 'bg-amber-950/30',
        barColor: 'bg-amber-400',
        statusText: effectiveLanguage === 'en' ? 'Battery critical' : 'Pin sắp hết'
      };
    }
    if (percent <= 70) {
      return {
        icon: BatteryMedium,
        iconColor: 'text-sky-400',
        textColor: 'text-sky-300',
        borderColor: 'border-sky-500/30',
        bgColor: 'bg-white/5',
        barColor: 'bg-sky-400',
        statusText: effectiveLanguage === 'en' ? 'Battery stable' : 'Pin ổn định'
      };
    }
    return {
      icon: BatteryFull,
      iconColor: 'text-emerald-400',
      textColor: 'text-emerald-300',
      borderColor: 'border-emerald-500/30',
      bgColor: 'bg-white/5',
      barColor: 'bg-emerald-400',
      statusText: effectiveLanguage === 'en' ? 'Battery full' : 'Pin đầy đủ'
    };
  };

  const visuals = getBatteryVisuals();
  const BatteryIcon = visuals.icon;

  const tooltipText = effectiveLanguage === 'en' ? `Device battery: ${percent}% • ${visuals.statusText}${
    remainingTimeStr ? ` (${isCharging ? 'Full in' : 'Remaining'}: ~${remainingTimeStr})` : ''
  } (Click to settings)` : `Pin thiết bị: ${percent}% • ${visuals.statusText}${remainingTimeStr ? ` (${isCharging ? 'Đầy sau' : 'Còn lại'}: ~${remainingTimeStr})` : ''} (Bấm để cài đặt)`;

  return (
    <>
      {showDetails ? (
        <div
          id="battery-indicator-detailed"
          data-tooltip={tooltipText}
          data-tooltip-title={effectiveLanguage === "en" ? "Power Status" : "Tình Trạng Nguồn Pin"}
          data-tooltip-variant="success"
          onClick={handleOpenModal}
          className={`has-tooltip p-3 fluent-box-nested border border-white/10 hover:border-emerald-500/40 rounded-[4px] flex items-center justify-between shadow-inner cursor-pointer transition ${className}`}
        >
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-[4px] flex items-center justify-center border ${visuals.bgColor} ${visuals.borderColor}`}>
              <BatteryIcon className={`w-4 h-4 ${visuals.iconColor}`} />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                <span>{t("view_battery_dev", effectiveLanguage)}</span>
                <span className={`text-[9px] px-1.5 py-0.2 rounded-[2px] font-mono font-bold uppercase tracking-wider ${visuals.bgColor} ${visuals.textColor} border border-white/10`}>
                  {visuals.statusText}
                </span>
              </div>
              <div className="text-[11px] font-mono text-white/70 flex items-center gap-1.5 mt-0.5">
                <span>{t("view_battery_level", effectiveLanguage)} <strong className={`font-bold ${visuals.textColor}`}>{percent}%</strong></span>
                {isBatterySaver && (
                  <span className="text-emerald-400 text-[10px] flex items-center gap-0.5 font-bold">
                    <Leaf className="w-3 h-3 text-emerald-400 fill-emerald-400/30" /> {t("view_battery_save", effectiveLanguage)}
                  </span>
                )}
                {isCharging && !isBatterySaver && (
                  <span className="text-emerald-400 text-[10px] flex items-center gap-0.5">
                    <Zap className="w-3 h-3 fill-emerald-400" /> {t("view_battery_charge", effectiveLanguage)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="w-16 flex flex-col items-end gap-1">
            <span className={`text-xs font-mono font-bold ${visuals.textColor}`}>{percent}%</span>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden p-[1px]">
              <div
                className={`h-full rounded-full transition-all duration-500 ${visuals.barColor}`}
                style={{ width: `${Math.min(100, Math.max(5, percent))}%` }}
              />
            </div>
          </div>
        </div>
      ) : (
        <button
          type="button"
          id="battery-indicator-navbar"
          data-tooltip={tooltipText}
          data-tooltip-title={t("view_battery_status", effectiveLanguage)}
          data-tooltip-placement="bottom"
          data-tooltip-variant="success"
          onClick={handleOpenModal}
          className={`has-tooltip fluent-nav-btn ${visuals.bgColor} ${visuals.borderColor} hover:border-emerald-400/50 ${className}`}
          aria-label={t("view_battery_label_dev", effectiveLanguage).replace("{percent}", String(percent))}
        >
          <div className="flex items-center gap-1 relative">
            <BatteryIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${visuals.iconColor}`} />
            {isBatterySaver ? (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
            ) : isCharging ? (
              <span className="absolute -top-1 -right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
              </span>
            ) : null}
          </div>

          <div className="flex flex-col items-start leading-none">
            <span className="text-[8px] uppercase tracking-wider font-bold opacity-75 text-white/60 flex items-center gap-0.5 font-mono">
              {isBatterySaver ? (
                <span className="text-emerald-300">⚡ {t("battery_eco_short", effectiveLanguage)}</span>
              ) : isCharging ? (
                <>
                  <Zap className="w-2 h-2 text-emerald-400 fill-emerald-400 inline" />
                  <span>{t("view_battery_chg", effectiveLanguage)}</span>
                </>
              ) : (
                <span>Pin</span>
              )}
            </span>
            <span className={`text-xs font-mono font-bold tracking-tight ${visuals.textColor}`}>
              {percent}%
            </span>
          </div>
        </button>
      )}

      {/* Render BatterySaverModal internally if state managed locally */}
      {!onOpenBatterySaverModal && (
        <BatterySaverModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} forceLanguage={forceLanguage} />
      )}
    </>
  );
};
