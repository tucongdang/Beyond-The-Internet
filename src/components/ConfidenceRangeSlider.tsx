import React, { useId, useCallback } from 'react';
import { Sliders, Flame, Lock, Sparkles, Check } from 'lucide-react';
import { vibrateTap } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';

interface ConfidenceRangeSliderProps {
  value: number; // 0 to 100
  onChange: (newValue: number) => void;
  disabled?: boolean;
  selectedContestantName?: string;
  isVi?: boolean;
  className?: string;
}

export const ConfidenceRangeSlider: React.FC<ConfidenceRangeSliderProps> = ({
  value,
  onChange,
  disabled = false,
  selectedContestantName,
  isVi = true,
  className = '',
}) => {
  const sliderId = useId();

  // Dynamic tier descriptor & theme colors
  const tier = useCallback((val: number) => {
    if (val <= 25) {
      return {
        label: isVi ? 'Thấp / Dò xét' : 'Cautious',
        color: '#38bdf8', // sky blue
        badgeClass: 'bg-sky-950/60 border-sky-400/40 text-sky-300',
        trackGradient: 'from-sky-500 to-cyan-400',
        icon: '🛡️',
      };
    }
    if (val <= 60) {
      return {
        label: isVi ? 'Vừa phải / Cân nhắc' : 'Moderate',
        color: '#c084fc', // purple
        badgeClass: 'bg-purple-950/60 border-purple-400/40 text-purple-300',
        trackGradient: 'from-sky-400 via-indigo-400 to-purple-400',
        icon: '⚡',
      };
    }
    if (val <= 85) {
      return {
        label: isVi ? 'Rất tự tin' : 'High Conviction',
        color: '#F7CAC9', // rose quartz
        badgeClass: 'bg-rose-950/60 border-[#F7CAC9]/50 text-[#FCEEEC]',
        trackGradient: 'from-purple-400 via-[#F7CAC9] to-rose-400',
        icon: '🔥',
      };
    }
    return {
      label: isVi ? 'Tuyệt đối / All-In' : 'Maximum / All-In',
      color: '#fbbf24', // amber/gold
      badgeClass: 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] animate-pulse',
      trackGradient: 'from-[#F7CAC9] via-amber-400 to-yellow-300',
      icon: '🚀',
    };
  }, [isVi]);

  const currentTier = tier(value);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVal = Math.max(0, Math.min(100, Number(e.target.value)));
    // Threshold haptic vibration
    if (nextVal === 0 || nextVal === 25 || nextVal === 50 || nextVal === 75 || nextVal === 100) {
      vibrateTap();
    }
    onChange(nextVal);
  };

  const handlePresetClick = (presetVal: number) => {
    if (disabled) return;
    vibrateTap();
    soundFx.playClick();
    onChange(presetVal);
  };

  return (
    <div
      className={`fluent-box-nested rounded-[2px] p-3 sm:p-3.5 border transition-all ${
        disabled
          ? 'border-white/10 bg-black/40 opacity-80'
          : 'border-[#F7CAC9]/30 bg-black/30 hover:border-[#F7CAC9]/50 shadow-inner'
      } ${className}`}
    >
      {/* Header Row: Label & Readout */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <label
          htmlFor={sliderId}
          className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white/90 select-none cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#F7CAC9]" />
          <span>{isVi ? 'Mức Độ Tự Tin' : 'Confidence Level'}:</span>
          {selectedContestantName && (
            <span className="text-[#F7CAC9] normal-case font-sans font-semibold truncate max-w-[140px] sm:max-w-[200px]">
              ({selectedContestantName})
            </span>
          )}
        </label>

        {/* Dynamic Percentage Badge */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] border font-mono text-xs font-black transition-all ${currentTier.badgeClass}`}
          title={`${isVi ? 'Mức tự tin' : 'Confidence'}: ${value}% - ${currentTier.label}`}
        >
          <span>{currentTier.icon}</span>
          <span className="text-sm tracking-tight">{value}%</span>
          <span className="hidden sm:inline text-[10px] font-medium opacity-80">
            • {currentTier.label}
          </span>
          {disabled && <Lock className="w-3 h-3 text-amber-300 ml-0.5" />}
        </div>
      </div>

      {/* Range Slider Track */}
      <div className="relative py-1.5 flex items-center">
        <input
          id={sliderId}
          type="range"
          min="0"
          max="100"
          step="1"
          value={value}
          disabled={disabled}
          onChange={handleSliderChange}
          aria-label={isVi ? 'Điều chỉnh mức độ tự tin từ 0 đến 100%' : 'Confidence level from 0 to 100%'}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={value}
          aria-valuetext={`${value}% - ${currentTier.label}`}
          className={`w-full h-2 rounded-[2px] appearance-none cursor-pointer outline-none transition-all ${
            disabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'
          }`}
          style={{
            background: `linear-gradient(to right, ${currentTier.color} 0%, ${currentTier.color} ${value}%, rgba(255, 255, 255, 0.12) ${value}%, rgba(255, 255, 255, 0.12) 100%)`,
          }}
        />
      </div>

      {/* Quick Preset Buttons (0%, 25%, 50%, 75%, 100%) & Helper Note */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-white/5 text-[10px] font-mono">
        <div className="flex items-center gap-1">
          <span className="text-white/40 uppercase mr-1 hidden xs:inline">{isVi ? 'Mốc:' : 'Presets:'}</span>
          {[25, 50, 75, 100].map((preset) => {
            const isSelected = value === preset;
            return (
              <button
                key={preset}
                type="button"
                disabled={disabled}
                onClick={() => handlePresetClick(preset)}
                className={`px-2 py-0.5 rounded-[2px] border font-bold transition-all ${
                  disabled
                    ? 'border-white/5 text-white/30 cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#F7CAC9] text-slate-950 border-[#F7CAC9] shadow-sm font-black'
                    : 'bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:text-white cursor-pointer active:scale-95'
                }`}
              >
                {preset}%
              </button>
            );
          })}
        </div>

        <div className="text-white/50 text-[10px] flex items-center gap-1">
          {disabled ? (
            <span className="text-amber-300/80 flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" />
              <span>{isVi ? 'Đã khóa mức tự tin' : 'Locked'}</span>
            </span>
          ) : (
            <span className="italic">
              {isVi ? 'Kéo thanh để thay đổi (0-100%)' : 'Drag to adjust (0-100%)'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
