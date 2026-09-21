import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ambientNoiseService, LoudSuggestionEvent } from '../services/ambientNoiseService';
import { aiExplanationService } from '../services/aiExplanationService';
import { soundFx } from '../services/audioEffects';
import { vibrateWarning, vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../utils/i18n';
import { Volume2, MessageSquare, AlertTriangle, X, Sparkles, Check, Mic, Activity } from 'lucide-react';

export const LoudEnvironmentAlert: React.FC = () => {
  const { localLanguage } = useLanguage();
  const [suggestionEvent, setSuggestionEvent] = useState<LoudSuggestionEvent | null>(null);
  const [autoToast, setAutoToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubSuggestion = ambientNoiseService.subscribeSuggestion((event) => {
      setSuggestionEvent(event);
      vibrateWarning();
      soundFx.playTing();
    });

    const unsubAutoBoost = ambientNoiseService.subscribeAutoBoost((msg) => {
      setAutoToast(msg);
      vibrateSuccess();
      const timer = setTimeout(() => {
        setAutoToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    });

    return () => {
      unsubSuggestion();
      unsubAutoBoost();
    };
  }, []);

  const handleDismiss = () => {
    soundFx.playClick();
    vibrateTap();
    ambientNoiseService.dismissAlertForDuration(5);
    setSuggestionEvent(null);
  };

  const handleBoostVolume = () => {
    soundFx.playClick();
    vibrateSuccess();
    ambientNoiseService.applyLoudEnvironmentAdjustments({ boostVolume: true });
    setSuggestionEvent(null);
  };

  const handleEnableSubtitles = () => {
    soundFx.playClick();
    vibrateSuccess();
    ambientNoiseService.applyLoudEnvironmentAdjustments({ enableSubtitles: true });
    setSuggestionEvent(null);
  };

  const handleApplyBoth = () => {
    soundFx.playClick();
    vibrateSuccess();
    ambientNoiseService.applyLoudEnvironmentAdjustments({ boostVolume: true, enableSubtitles: true });
    ambientNoiseService.setAutoBoostEnabled(true);
    setSuggestionEvent(null);
  };

  if (!autoToast && !suggestionEvent) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <>
      {/* Auto-boost feedback toast */}
      {autoToast && (
        <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-md animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="bg-emerald-950/95 border border-emerald-500/50 rounded-[4px] p-3 text-white shadow-2xl flex items-center gap-3 backdrop-blur-md">
            <div className="p-1.5 rounded-full bg-emerald-500/20 text-emerald-400">
              <Check className="w-4 h-4" />
            </div>
            <p className="text-xs font-mono text-emerald-100 flex-1">
              {t('loud_alert_auto_toast', localLanguage)}
            </p>
            <button
              onClick={() => setAutoToast(null)}
              className="text-emerald-400/60 hover:text-emerald-300 p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Loud Environment Suggestion Banner */}
      {suggestionEvent && (
        <aside
          aria-label="Loud environment suggestion"
          className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:top-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-lg animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="bg-slate-900/95 backdrop-blur-md border-2 border-amber-500/80 rounded-[4px] p-4 shadow-2xl shadow-amber-950/40 text-white flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 border-b border-amber-500/20 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-[2px] bg-amber-500/20 text-amber-400 shrink-0 animate-pulse">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-amber-300 font-sans flex items-center gap-1.5">
                    <span>{t('loud_alert_title', localLanguage)}</span>
                  </h4>
                  <div className="flex items-center gap-2 text-[11px] font-mono text-amber-200/70 mt-0.5">
                    <Activity className="w-3 h-3 text-amber-400 animate-spin" />
                    <span>~{Math.round(suggestionEvent.decibels)} dB (RMS {suggestionEvent.score}%)</span>
                  </div>
                </div>
              </div>

              <button
                onClick={handleDismiss}
                className="text-white/50 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
                title={t('loud_alert_dismiss', localLanguage)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Description */}
            <p className="text-xs font-sans text-white/85 leading-relaxed">
              {t('loud_alert_desc', localLanguage)}
            </p>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={handleBoostVolume}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Volume2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('loud_alert_boost_btn', localLanguage)}</span>
              </button>

              <button
                onClick={handleEnableSubtitles}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-mono text-xs font-bold transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <MessageSquare className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('loud_alert_subtitles_btn', localLanguage)}</span>
              </button>

              <button
                onClick={handleApplyBoth}
                className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-mono text-xs font-bold shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Sparkles className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">{t('loud_alert_both_btn', localLanguage)}</span>
              </button>
            </div>

            {/* Footer / Dismiss */}
            <div className="flex justify-end">
              <button
                onClick={handleDismiss}
                className="text-[11px] font-mono text-white/50 hover:text-white/80 transition-colors"
              >
                {t('loud_alert_dismiss', localLanguage)}
              </button>
            </div>
          </div>
        </aside>
      )}
    </>,
    document.body
  );
};
