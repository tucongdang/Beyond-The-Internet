import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Zap,
  BatteryCharging,
  BatteryWarning,
  BatteryFull,
  BatteryMedium,
  ShieldAlert,
  Sparkles,
  Smartphone,
  Vibrate,
  Eye,
  CheckCircle2,
  X,
  Power
} from 'lucide-react';
import {
  useBatterySaver,
  getAutoBatterySaverEnabled,
  setAutoBatterySaverEnabled
} from '../utils/batterySaverUtils';
import { useLanguage } from '../hooks/useLanguage';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

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
  level: number;
  chargingTime: number;
  dischargingTime: number;
}

interface BatterySaverModalProps {
  isOpen: boolean;
  onClose: () => void;
  forceLanguage?: 'vi' | 'en';
}

export const BatterySaverModal: React.FC<BatterySaverModalProps> = ({ isOpen, onClose, forceLanguage }) => {
  const { localLanguage } = useLanguage();
  const effectiveLanguage = forceLanguage || localLanguage;
  const { isBatterySaver, toggleBatterySaver } = useBatterySaver();
  const [autoEnable, setAutoEnable] = useState<boolean>(getAutoBatterySaverEnabled());

  const [batteryState, setBatteryState] = useState<BatteryState>({
    supported: false,
    charging: false,
    level: 1,
    chargingTime: 0,
    dischargingTime: Infinity
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

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
        })
        .catch(() => {
          if (isMounted) {
            setBatteryState(prev => ({ ...prev, supported: false }));
          }
        });
    }

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  const handleToggleAuto = () => {
    vibrateTap();
    const nextVal = !autoEnable;
    setAutoEnable(nextVal);
    setAutoBatterySaverEnabled(nextVal);
  };

  const handleToggleMain = () => {
    vibrateSuccess();
    toggleBatterySaver();
  };

  const percent = Math.round(batteryState.level * 100);
  const isCharging = batteryState.charging;

  const formatTime = (seconds: number) => {
    if (!Number.isFinite(seconds) || seconds <= 0) return null;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (effectiveLanguage === 'en') {
      if (hrs > 0) return `${hrs}h ${mins}m`;
      return `${mins}m`;
    }
    if (hrs > 0) return `${hrs} giờ ${mins} phút`;
    return `${mins} phút`;
  };

  const timeStr = isCharging
    ? formatTime(batteryState.chargingTime)
    : formatTime(batteryState.dischargingTime);

  if (!isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  const modalNode = (
    <div
      id="battery-saver-modal-overlay"
      className="fluent-dialog-overlay z-[60] animate-fadeIn select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="battery-modal-title"
    >
      <div
        id="battery-saver-modal-content"
        className="fluent-dialog relative w-full max-w-lg rounded-[2px] fluent-box shadow-2xl text-white flex flex-col border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div
          className={`fluent-dialog-header shrink-0 p-4 sm:p-5 flex items-center justify-between border-b ${
            isBatterySaver ? 'bg-emerald-950/60 border-emerald-500/40' : 'fluent-box-nested border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-[2px] flex items-center justify-center border ${
                isBatterySaver ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' : 'fluent-box-nested border-white/10 text-emerald-400'
              }`}
            >
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="battery-modal-title" className="text-base sm:text-lg font-bold tracking-tight text-white">
                  {effectiveLanguage === 'en' ? 'Battery Saver Mode' : 'Chế Độ Tiết Kiệm Pin'}
                </h3>
                {isBatterySaver && (
                  <span className="px-2 py-0.5 rounded-[2px] bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wide">
                    {effectiveLanguage === 'en' ? 'ACTIVE' : 'Đang Bật'}
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/70">
                {effectiveLanguage === 'en'
                  ? 'Optimize device power & extend battery runtime'
                  : 'Tối ưu công suất thiết bị & kéo dài thời gian trải nghiệm'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            aria-label="Đóng"
            className="min-w-[44px] min-h-[44px] rounded-[2px] bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="fluent-dialog-body p-4 sm:p-5 space-y-3.5 flex-1 scrollbar-thin">
          {/* Real-time Battery Status Card */}
          {batteryState.supported && (
            <div className="p-3.5 sm:p-4 rounded-[2px] fluent-box-nested flex items-center justify-between border border-white/10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {isCharging ? (
                    <BatteryCharging className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                  ) : percent <= 20 ? (
                    <BatteryWarning className="w-7 h-7 sm:w-8 sm:h-8 text-rose-400" />
                  ) : percent <= 60 ? (
                    <BatteryMedium className="w-7 h-7 sm:w-8 sm:h-8 text-amber-300" />
                  ) : (
                    <BatteryFull className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
                  )}
                </div>
                <div>
                  <div className="text-[11px] font-medium text-white/60">
                    {effectiveLanguage === 'en' ? 'Device Battery Status' : 'Trạng thái Pin thiết bị'}
                  </div>
                  <div className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-2">
                    <span>{percent}%</span>
                    <span className="text-xs font-sans font-normal text-white/50">
                      ({isCharging ? (effectiveLanguage === 'en' ? '⚡ Charging' : '⚡ Đang sạc nguồn') : (effectiveLanguage === 'en' ? 'On battery' : 'Dùng nguồn pin')})
                    </span>
                  </div>
                  {timeStr && (
                    <div className="text-[10px] sm:text-[11px] text-emerald-300/80 font-mono mt-0.5">
                      {isCharging
                        ? (effectiveLanguage === 'en' ? 'Full in:' : 'Dự kiến đầy sau:')
                        : (effectiveLanguage === 'en' ? 'Estimated remaining:' : 'Ước tính sử dụng:')} ~{timeStr}
                    </div>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-14 sm:w-16 flex flex-col items-end gap-1">
                <div className="w-full h-2 bg-white/10 rounded-[2px] overflow-hidden p-[1px]">
                  <div
                    className={`h-full rounded-[2px] transition-all duration-500 ${
                      isCharging
                        ? 'bg-emerald-400'
                        : percent <= 20
                        ? 'bg-rose-500'
                        : percent <= 50
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(8, percent)}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Big Master Toggle Switch Button */}
          <button
            type="button"
            onClick={handleToggleMain}
            className={`w-full p-4 rounded-[2px] border transition-all duration-200 flex items-center justify-between text-left ${
              isBatterySaver ? 'bg-emerald-950/50 border-emerald-400' : 'fluent-box-nested border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-[2px] flex items-center justify-center transition-all ${
                  isBatterySaver ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white'
                }`}
              >
                <Power className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>
                    {isBatterySaver
                      ? (effectiveLanguage === 'en' ? 'Battery Saver: ACTIVE' : 'Tiết Kiệm Pin: ĐANG BẬT')
                      : (effectiveLanguage === 'en' ? 'Enable Battery Saver' : 'Bật Chế Độ Tiết Kiệm Pin')}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/60 mt-0.5">
                  {isBatterySaver
                    ? (effectiveLanguage === 'en'
                        ? 'OLED pitch black enabled, motion disabled & GPU load reduced.'
                        : 'Đang bật nền đen OLED, tắt chuyển động & giảm tải GPU.')
                    : (effectiveLanguage === 'en'
                        ? 'Tap to enable maximum power-saving performance.'
                        : 'Nhấn để bật chế độ tiết kiệm năng lượng tối đa.')}
                </p>
              </div>
            </div>

            <div
              className={`w-11 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                isBatterySaver ? 'bg-emerald-400 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className={`w-5 h-5 rounded-full shadow-md ${isBatterySaver ? 'bg-black' : 'bg-white'}`} />
            </div>
          </button>

          {/* Detailed Features List */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400/90 font-mono px-1">
              {effectiveLanguage === 'en' ? 'Power-saving features:' : 'Tính năng giảm tiêu thụ điện năng:'}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 sm:p-3 rounded-[2px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">
                    {effectiveLanguage === 'en' ? 'OLED Pitch Black' : 'Nền đen OLED (Pitch Black)'}
                  </div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    {effectiveLanguage === 'en'
                      ? 'Completely turn off pixels on AMOLED/OLED screens.'
                      : 'Tắt hoàn toàn bóng bán dẫn điểm ảnh trên màn hình AMOLED/OLED.'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-[2px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">
                    {effectiveLanguage === 'en' ? 'Disable Blur & Glow' : 'Tắt Blur & Visual Glow'}
                  </div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    {effectiveLanguage === 'en'
                      ? 'Disable backdrop-blur glass filters and heavy GPU animations.'
                      : 'Bỏ hiệu ứng mờ kính backdrop-blur và chuyển động GPU.'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-[2px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Vibrate className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">
                    {effectiveLanguage === 'en' ? 'Haptic Feedback Optimization' : 'Tối ưu Rung Haptic'}
                  </div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    {effectiveLanguage === 'en'
                      ? 'Shorten tap vibration pulses to reduce vibration motor load.'
                      : 'Giảm thời lượng nhịp rung phím bấm để giảm tải motor rung.'}
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-[2px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">
                    {effectiveLanguage === 'en' ? 'Reduce CPU/GPU Load' : 'Giảm tải CPU/GPU'}
                  </div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    {effectiveLanguage === 'en'
                      ? 'Limit unnecessary re-renders while waiting for rounds.'
                      : 'Hạn chế vẽ lại khung hình không cần thiết khi chờ câu hỏi.'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-activation threshold setting */}
          <div className="p-3 sm:p-3.5 rounded-[2px] fluent-box-nested flex items-center justify-between border border-emerald-500/25">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">
                  {effectiveLanguage === 'en' ? 'Auto-enable when Battery < 20%' : 'Tự động bật khi Pin dưới 20%'}
                </div>
                <div className="text-[11px] text-white/60">
                  {effectiveLanguage === 'en'
                    ? 'Automatically activate when device reaches low battery'
                    : 'Tự động kích hoạt khi thiết bị chạm ngưỡng pin yếu'}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={autoEnable}
              aria-label="Tự động bật khi pin dưới 20%"
              onClick={handleToggleAuto}
              className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 cursor-pointer ${
                autoEnable ? 'bg-emerald-400 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className={`w-5 h-5 rounded-full shadow ${autoEnable ? 'bg-black' : 'bg-white'}`} />
            </button>
          </div>

          {/* Energy Saving Tips */}
          <div className="p-3 rounded-[2px] fluent-box-nested border border-white/10 text-xs space-y-1.5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{effectiveLanguage === 'en' ? 'Event Battery Tips:' : 'Mẹo dùng pin lâu nhất tại sự kiện:'}</span>
            </div>
            <ul className="text-[11px] text-white/70 space-y-1 pl-5 list-disc">
              <li>{effectiveLanguage === 'en' ? 'Lower screen brightness to 40-50%.' : 'Giảm độ sáng màn hình điện thoại xuống mức 40-50%.'}</li>
              <li>{effectiveLanguage === 'en' ? 'Lock screen when the official session is paused.' : 'Khóa màn hình khi chưa đến giờ làm bài thi chính thức.'}</li>
              <li>{effectiveLanguage === 'en' ? 'Use Battery Saver mode when attending long shows.' : 'Sử dụng chế độ Tiết kiệm Pin này khi tham gia suốt buổi sự kiện dài.'}</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="fluent-dialog-footer shrink-0 p-3.5 sm:p-4 border-t border-white/10 fluent-box-nested flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-[2px] transition shadow-md cursor-pointer"
          >
            {effectiveLanguage === 'en' ? 'Done' : 'Đã Xong'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
