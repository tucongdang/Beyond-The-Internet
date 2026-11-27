import React, { useId, useState, useEffect, useRef, useCallback } from 'react';
import { Sliders, Lock, TrendingUp, AlertTriangle, ShieldCheck, CheckCircle2, Sparkles } from 'lucide-react';
import {
  MIN_CONFIDENCE_MULTIPLIER,
  MAX_CONFIDENCE_MULTIPLIER,
  CONFIDENCE_MULTIPLIER_STEP,
  normalizeConfidenceMultiplier,
  getConfidenceMultiplierPreview,
} from '../services/audienceScoringService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';

interface ConfidenceMultiplierControlProps {
  value: number;
  onChange: (nextMultiplier: number) => void;
  roundId: string;
  disabled?: boolean;
  isDoubleDown?: boolean;
  isHighContrast?: boolean;
  isVi?: boolean;
  canUpdateAfterVote?: boolean;
  hasVotedThisQuestion?: boolean;
  isSyncingMultiplier?: boolean;
  className?: string;
}

const MULTIPLIER_PRESETS = [1.0, 1.5, 2.0, 2.5, 3.0];

export const ConfidenceMultiplierControl: React.FC<ConfidenceMultiplierControlProps> = React.memo(({
  value,
  onChange,
  roundId,
  disabled = false,
  isDoubleDown = false,
  isHighContrast = false,
  isVi = true,
  canUpdateAfterVote = false,
  hasVotedThisQuestion = false,
  isSyncingMultiplier = false,
  className = '',
}) => {
  const sliderId = useId();
  const numberInputId = useId();
  const normalizedValue = normalizeConfidenceMultiplier(value);
  const [inputDraft, setInputDraft] = useState<string>(normalizedValue.toFixed(2).replace(/\.?0+$/, ''));
  const [pulseSeq, setPulseSeq] = useState<number>(0);
  const [isConfirmingPulse, setIsConfirmingPulse] = useState<boolean>(false);
  const pulseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevEffectiveRef = useRef<number | null>(null);
  const prevRoundIdRef = useRef<string>(roundId);

  useEffect(() => {
    setInputDraft(normalizedValue.toFixed(2).replace(/\.00$/, '.0').replace(/(\.\d)0$/, '$1'));
  }, [normalizedValue]);

  useEffect(() => {
    return () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    };
  }, []);

  const preview = getConfidenceMultiplierPreview(roundId, normalizedValue, { isDoubleDown });
  const effectiveMultiplier = preview.effectiveMultiplier;

  const triggerChangeFeedback = useCallback(() => {
    setPulseSeq((prev) => prev + 1);
    setIsConfirmingPulse(true);
    if (pulseTimerRef.current) {
      clearTimeout(pulseTimerRef.current);
    }
    pulseTimerRef.current = setTimeout(() => {
      setIsConfirmingPulse(false);
    }, 1050);
  }, []);

  useEffect(() => {
    if (prevRoundIdRef.current !== roundId) {
      prevRoundIdRef.current = roundId;
      prevEffectiveRef.current = effectiveMultiplier;
      setIsConfirmingPulse(false);
      return;
    }
    if (prevEffectiveRef.current !== null && prevEffectiveRef.current !== effectiveMultiplier) {
      triggerChangeFeedback();
    }
    prevEffectiveRef.current = effectiveMultiplier;
  }, [effectiveMultiplier, roundId, triggerChangeFeedback]);

  const progressPct =
    ((effectiveMultiplier - MIN_CONFIDENCE_MULTIPLIER) /
      (MAX_CONFIDENCE_MULTIPLIER - MIN_CONFIDENCE_MULTIPLIER)) *
    100;

  const getTierInfo = (mult: number) => {
    if (mult <= 1.0) {
      return {
        label: isVi ? 'Tiêu chuẩn (0 rủi ro)' : 'Standard (Zero Risk)',
        accentColor: '#38bdf8',
        badgeClass: 'bg-sky-950/60 border-sky-400/40 text-sky-300',
      };
    }
    if (mult <= 1.75) {
      return {
        label: isVi ? 'Tự tin vừa' : 'Moderate Boost',
        accentColor: '#c084fc',
        badgeClass: 'bg-purple-950/60 border-purple-400/40 text-purple-200',
      };
    }
    if (mult < 2.5) {
      return {
        label: isVi ? 'Chắc chắn cao' : 'High Certainty',
        accentColor: '#F7CAC9',
        badgeClass: 'bg-rose-950/60 border-[#F7CAC9]/50 text-[#FCEEEC]',
      };
    }
    return {
      label: isVi ? 'Quyết đoán tối đa' : 'Maximum Conviction',
      accentColor: '#fbbf24',
      badgeClass: 'bg-amber-950/80 border-amber-400 text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.25)]',
    };
  };

  const tier = getTierInfo(effectiveMultiplier);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const nextVal = normalizeConfidenceMultiplier(Number(e.target.value));
    if (nextVal !== normalizedValue) {
      if (MULTIPLIER_PRESETS.includes(nextVal)) {
        vibrateTap();
      } else {
        vibrateSelection();
      }
      triggerChangeFeedback();
    }
    onChange(nextVal);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const raw = e.target.value;
    setInputDraft(raw);
    const parsed = parseFloat(raw);
    if (Number.isFinite(parsed) && parsed >= MIN_CONFIDENCE_MULTIPLIER && parsed <= MAX_CONFIDENCE_MULTIPLIER) {
      const nextNorm = normalizeConfidenceMultiplier(parsed);
      if (nextNorm !== normalizedValue) {
        vibrateSelection();
        triggerChangeFeedback();
      }
      onChange(nextNorm);
    }
  };

  const handleNumberBlur = () => {
    const parsed = parseFloat(inputDraft);
    const clamped = normalizeConfidenceMultiplier(Number.isFinite(parsed) ? parsed : normalizedValue);
    setInputDraft(clamped.toFixed(2).replace(/\.00$/, '.0').replace(/(\.\d)0$/, '$1'));
    if (clamped !== normalizedValue) {
      vibrateSelection();
      triggerChangeFeedback();
      onChange(clamped);
    }
  };

  const handlePresetClick = (preset: number) => {
    if (disabled) return;
    vibrateSelection();
    soundFx.playClick();
    triggerChangeFeedback();
    onChange(preset);
  };

  const gainLabel =
    preview.minGain === preview.maxGain
      ? `+${preview.minGain}`
      : `+${preview.minGain}..+${preview.maxGain}`;

  const containerSurface = isHighContrast
    ? 'bg-black border-white/40 text-white'
    : disabled
    ? 'bg-[#13072E]/70 border-white/10 opacity-85'
    : isConfirmingPulse
    ? 'bg-[#1f0b47]/95 border-[#F7CAC9]/70 ring-1 ring-[#F7CAC9]/40 shadow-[0_0_24px_rgba(247,202,201,0.24)]'
    : effectiveMultiplier > 1.0
    ? 'bg-[#190839]/85 border-[#F7CAC9]/40 shadow-[0_0_18px_rgba(247,202,201,0.12)]'
    : 'bg-[#190839]/75 border-white/15 hover:border-[#F7CAC9]/35';

  const nudgeClass = isConfirmingPulse
    ? pulseSeq % 2 === 1
      ? 'animate-confidence-nudge-a'
      : 'animate-confidence-nudge-b'
    : '';
  const badgePopClass = isConfirmingPulse
    ? pulseSeq % 2 === 1
      ? 'animate-confidence-badge-pop-a'
      : 'animate-confidence-badge-pop-b'
    : '';

  return (
    <div
      id="audience-confidence-multiplier-control"
      className={`relative overflow-hidden rounded-[4px] border p-3 sm:p-3.5 transition-all backdrop-blur-md ${containerSurface} ${nudgeClass} ${className}`}
    >
      {/* Luminous Shimmer Sweep Overlay on Value Change */}
      {isConfirmingPulse && pulseSeq > 0 && (
        <div
          key={`shimmer-${pulseSeq}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#F7CAC9]/25 to-transparent animate-confidence-shimmer z-0"
        />
      )}

      {/* Header */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mb-2">
        <label
          htmlFor={sliderId}
          className="flex items-center gap-1.5 text-xs font-mono font-bold uppercase tracking-wider text-white/90 select-none cursor-pointer"
        >
          <Sliders className="w-3.5 h-3.5 text-[#F7CAC9]" />
          <span>{isVi ? 'Hệ Số Tự Tin (Điểm Thưởng / Rủi Ro)' : 'Confidence Multiplier (Gain / Loss)'}</span>
        </label>

        <div className="flex items-center gap-1.5">
          {isConfirmingPulse && pulseSeq > 0 && (
            <span
              key={`confirmed-${pulseSeq}`}
              className="px-1.5 py-0.5 rounded-[2px] bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 animate-fadeIn"
              role="status"
              aria-live="polite"
            >
              <Sparkles className="w-3 h-3 text-amber-300 animate-confidence-sparkle" />
              <span>{isVi ? 'Đã ghi nhận' : 'Saved'}</span>
            </span>
          )}
          <div
            className={`relative px-2 py-0.5 rounded-[2px] border font-mono text-xs font-black tabular-nums flex items-center gap-1.5 ${tier.badgeClass} ${badgePopClass}`}
          >
            {isConfirmingPulse && pulseSeq > 0 && (
              <Sparkles
                key={`sparkle-${pulseSeq}`}
                aria-hidden="true"
                className="w-3 h-3 text-[#FCEEEC] animate-confidence-sparkle shrink-0"
              />
            )}
            <span>x{effectiveMultiplier.toFixed(effectiveMultiplier % 1 === 0 ? 1 : 2).replace(/(\.\d)0$/, '$1')}</span>
            <span className="hidden sm:inline text-[10px] font-semibold opacity-85">• {tier.label}</span>
            {disabled && <Lock className="w-3 h-3 text-amber-300" />}
          </div>
        </div>
      </div>

      {/* Slider + Direct Numeric Input */}
      <div className="flex items-center gap-3 py-1">
        <div className="relative flex-1 flex items-center">
          <input
            id={sliderId}
            type="range"
            min={MIN_CONFIDENCE_MULTIPLIER}
            max={MAX_CONFIDENCE_MULTIPLIER}
            step={CONFIDENCE_MULTIPLIER_STEP}
            value={effectiveMultiplier}
            disabled={disabled}
            onChange={handleSliderChange}
            aria-label={isVi ? 'Điều chỉnh hệ số tự tin từ 1.0x đến 3.0x' : 'Adjust confidence multiplier from 1.0x to 3.0x'}
            aria-valuemin={MIN_CONFIDENCE_MULTIPLIER}
            aria-valuemax={MAX_CONFIDENCE_MULTIPLIER}
            aria-valuenow={effectiveMultiplier}
            aria-valuetext={`x${effectiveMultiplier} - ${tier.label}`}
            className={`w-full h-2 rounded-[2px] appearance-none outline-none transition-all ${
              disabled ? 'cursor-not-allowed opacity-60' : 'cursor-grab active:cursor-grabbing'
            }`}
            style={{
              background: `linear-gradient(to right, ${tier.accentColor} 0%, ${tier.accentColor} ${progressPct}%, rgba(255, 255, 255, 0.14) ${progressPct}%, rgba(255, 255, 255, 0.14) 100%)`,
            }}
          />
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <label htmlFor={numberInputId} className="sr-only">
            {isVi ? 'Nhập hệ số tự tin' : 'Multiplier input'}
          </label>
          <div className="flex items-center bg-[#0D0420] border border-white/20 focus-within:border-[#F7CAC9] rounded-[2px] px-1.5 py-1">
            <span className="text-[11px] font-mono font-bold text-[#F7CAC9] mr-0.5 select-none">x</span>
            <input
              id={numberInputId}
              type="number"
              min={MIN_CONFIDENCE_MULTIPLIER}
              max={MAX_CONFIDENCE_MULTIPLIER}
              step={CONFIDENCE_MULTIPLIER_STEP}
              value={inputDraft}
              disabled={disabled}
              onChange={handleNumberChange}
              onBlur={handleNumberBlur}
              aria-label={isVi ? 'Nhập trực tiếp hệ số tự tin (1.0 - 3.0)' : 'Direct confidence multiplier input (1.0 - 3.0)'}
              className="w-12 bg-transparent text-white font-mono tabular-nums text-xs font-black text-center outline-none disabled:opacity-60"
            />
          </div>
        </div>
      </div>

      {/* Presets & Gain/Loss Live Impact Row */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1 border-t border-white/10 text-[11px] font-mono">
        <div className="flex items-center gap-1 flex-wrap">
          {MULTIPLIER_PRESETS.map((preset) => {
            const isSelected = Math.abs(effectiveMultiplier - preset) < 0.01;
            const isLockedByDoubleDown = isDoubleDown && preset < 2.0;
            return (
              <button
                key={preset}
                type="button"
                disabled={disabled || isLockedByDoubleDown}
                onClick={() => handlePresetClick(preset)}
                className={`px-2 py-1 min-h-[28px] rounded-[2px] border font-bold tabular-nums transition ${
                  disabled || isLockedByDoubleDown
                    ? 'border-white/5 text-white/30 cursor-not-allowed'
                    : isSelected
                    ? 'bg-[#F7CAC9] text-[#0D0420] border-[#F7CAC9] font-black shadow-sm'
                    : 'bg-white/5 border-white/10 text-white/75 hover:bg-white/10 hover:text-white cursor-pointer active:scale-95'
                }`}
              >
                x{preset.toFixed(1)}
              </button>
            );
          })}
        </div>

        {/* Live Gain / Loss Preview */}
        <div className="flex items-center gap-2 flex-wrap tabular-nums">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-emerald-950/60 border border-emerald-500/35 text-emerald-300 font-bold">
            <TrendingUp className="w-3 h-3 text-emerald-400" />
            <span>
              {isVi ? 'Đúng:' : 'Win:'} {gainLabel}đ
            </span>
          </span>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] border font-bold ${
              preview.lossOnWrong < 0
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                : 'bg-white/5 border-white/15 text-white/65'
            }`}
          >
            {preview.lossOnWrong < 0 ? (
              <AlertTriangle className="w-3 h-3 text-rose-400" />
            ) : (
              <ShieldCheck className="w-3 h-3 text-sky-400" />
            )}
            <span>
              {isVi ? 'Sai:' : 'Loss:'}{' '}
              {preview.lossOnWrong < 0 ? `${preview.lossOnWrong}đ` : isVi ? '0đ (An toàn)' : '0 (Safe)'}
            </span>
          </span>
        </div>
      </div>

      {/* Sync / Lock Status Note */}
      {(disabled || (hasVotedThisQuestion && canUpdateAfterVote)) && (
        <div className="mt-1.5 text-[10px] font-mono text-[#B6A6D8] flex items-center justify-between gap-2">
          {disabled ? (
            <span className="text-amber-300/90 flex items-center gap-1">
              <Lock className="w-3 h-3 shrink-0" />
              <span>
                {isVi
                  ? 'Hệ số tự tin đã được chốt cùng đáp án câu này.'
                  : 'Confidence multiplier locked with your submitted answer.'}
              </span>
            </span>
          ) : (
            <span className="text-emerald-300/90 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 shrink-0" />
              <span>
                {isSyncingMultiplier
                  ? isVi
                    ? 'Đang đồng bộ hệ số mới...'
                    : 'Syncing updated multiplier...'
                  : isVi
                  ? 'Bạn vẫn có thể điều chỉnh hệ số trước khi hết giờ.'
                  : 'You can still adjust your multiplier before time runs out.'}
              </span>
            </span>
          )}
        </div>
      )}
    </div>
  );
});
