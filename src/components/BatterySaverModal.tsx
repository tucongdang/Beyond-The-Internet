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
}

export const BatterySaverModal: React.FC<BatterySaverModalProps> = ({ isOpen, onClose }) => {
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
    if (hrs > 0) return `${hrs} giờ ${mins} phút`;
    return `${mins} phút`;
  };

  const timeStr = isCharging
    ? formatTime(batteryState.chargingTime)
    : formatTime(batteryState.dischargingTime);

  const modalNode = (
    <div
      id="battery-saver-modal-overlay"
      className="fixed inset-0 select-none animate-fadeIn flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md z-[9999999]"
      onClick={onClose}
    >
      <div
        id="battery-saver-modal-content"
        className="relative w-full max-w-lg rounded-[4px] fluent-box shadow-2xl overflow-hidden text-white flex flex-col max-h-[90vh] border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div
          className={`p-4 sm:p-5 flex items-center justify-between border-b ${
            isBatterySaver ? 'bg-emerald-950/60 border-emerald-500/40' : 'fluent-box-nested border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-[4px] flex items-center justify-center border ${
                isBatterySaver ? 'bg-emerald-500/20 border-emerald-400 text-emerald-400' : 'fluent-box-nested border-white/10 text-emerald-400'
              }`}
            >
              <Zap className="w-5 h-5 fill-current animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-white">Chế Độ Tiết Kiệm Pin</h3>
                {isBatterySaver && (
                  <span className="px-2 py-0.5 rounded-[4px] bg-emerald-950/80 border border-emerald-400/50 text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-wide">
                    Đang Bật
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-emerald-200/70">
                Tối ưu công suất thiết bị & kéo dài thời gian trải nghiệm
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="w-8 h-8 rounded-[4px] bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="p-4 sm:p-5 space-y-3.5 overflow-y-auto scrollbar-none flex-1">
          {/* Real-time Battery Status Card */}
          {batteryState.supported && (
            <div className="p-3.5 sm:p-4 rounded-[4px] fluent-box-nested flex items-center justify-between border border-white/10">
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
                  <div className="text-[11px] font-medium text-white/60">Trạng thái Pin thiết bị</div>
                  <div className="text-base sm:text-lg font-bold font-mono text-white flex items-center gap-2">
                    <span>{percent}%</span>
                    <span className="text-xs font-sans font-normal text-white/50">
                      ({isCharging ? '⚡ Đang sạc nguồn' : 'Dùng nguồn pin'})
                    </span>
                  </div>
                  {timeStr && (
                    <div className="text-[10px] sm:text-[11px] text-emerald-300/80 font-mono mt-0.5">
                      {isCharging ? 'Dự kiến đầy sau:' : 'Ước tính sử dụng:'} ~{timeStr}
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
            className={`w-full p-4 rounded-[4px] border transition-all duration-200 flex items-center justify-between text-left ${
              isBatterySaver ? 'bg-emerald-950/50 border-emerald-400' : 'fluent-box-nested border-white/10 hover:border-white/20'
            }`}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={`w-11 h-11 rounded-[4px] flex items-center justify-center transition-all ${
                  isBatterySaver ? 'bg-emerald-400 text-black' : 'bg-white/10 text-white'
                }`}
              >
                <Power className="w-6 h-6" />
              </div>
              <div>
                <div className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                  <span>{isBatterySaver ? 'Tiết Kiệm Pin: ĐANG BẬT' : 'Bật Chế Độ Tiết Kiệm Pin'}</span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/60 mt-0.5">
                  {isBatterySaver
                    ? 'Đang bật nền đen OLED, tắt chuyển động & giảm tải GPU.'
                    : 'Nhấn để bật chế độ tiết kiệm năng lượng tối đa.'}
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
              Tính năng giảm tiêu thụ điện năng:
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 sm:p-3 rounded-[4px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Eye className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Nền đen OLED (Pitch Black)</div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    Tắt hoàn toàn bóng bán dẫn điểm ảnh trên màn hình AMOLED/OLED.
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-[4px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Tắt Blur & Visual Glow</div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    Bỏ hiệu ứng mờ kính backdrop-blur và chuyển động GPU.
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-[4px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Vibrate className="w-4 h-4 text-sky-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Tối ưu Rung Haptic</div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    Giảm thời lượng nhịp rung phím bấm để giảm tải motor rung.
                  </div>
                </div>
              </div>

              <div className="p-2.5 sm:p-3 rounded-[4px] fluent-box-nested border border-white/10 flex items-start gap-2.5">
                <Smartphone className="w-4 h-4 text-rose-300 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-white">Giảm tải CPU/GPU</div>
                  <div className="text-[11px] text-white/60 leading-tight mt-0.5">
                    Hạn chế vẽ lại khung hình không cần thiết khi chờ câu hỏi.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Auto-activation threshold setting */}
          <div className="p-3 sm:p-3.5 rounded-[4px] fluent-box-nested flex items-center justify-between border border-emerald-500/25">
            <div className="flex items-center gap-2.5">
              <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-bold text-white">Tự động bật khi Pin dưới 20%</div>
                <div className="text-[11px] text-white/60">
                  Tự động kích hoạt khi thiết bị chạm ngưỡng pin yếu
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleToggleAuto}
              className={`w-10 h-6 rounded-full transition-colors p-0.5 flex items-center shrink-0 ${
                autoEnable ? 'bg-emerald-400 justify-end' : 'bg-white/20 justify-start'
              }`}
            >
              <div className={`w-5 h-5 rounded-full shadow ${autoEnable ? 'bg-black' : 'bg-white'}`} />
            </button>
          </div>

          {/* Energy Saving Tips */}
          <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 text-xs space-y-1.5">
            <div className="font-bold text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Mẹo dùng pin lâu nhất tại sự kiện:</span>
            </div>
            <ul className="text-[11px] text-white/70 space-y-1 pl-5 list-disc">
              <li>Giảm độ sáng màn hình điện thoại xuống mức 40-50%.</li>
              <li>Khóa màn hình khi chưa đến giờ làm bài thi chính thức.</li>
              <li>Sử dụng chế độ Tiết kiệm Pin này khi tham gia suốt buổi sự kiện dài.</li>
            </ul>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 sm:p-4 border-t border-white/10 fluent-box-nested flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs rounded-[4px] transition shadow-md cursor-pointer"
          >
            Đã Xong
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
