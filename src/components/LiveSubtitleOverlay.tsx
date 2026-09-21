import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { aiExplanationService } from '../services/aiExplanationService';
import { ambientNoiseService } from '../services/ambientNoiseService';
import { MessageSquare, Volume2, X, Sparkles, Check } from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../utils/i18n';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

export const LiveSubtitleOverlay: React.FC = () => {
  const { localLanguage } = useLanguage();
  const [isSubtitlesEnabled, setIsSubtitlesEnabled] = useState<boolean>(() =>
    ambientNoiseService.isSubtitlesEnabled()
  );
  const [speechState, setSpeechState] = useState<{ text: string; active: boolean; type: string }>(() =>
    aiExplanationService.getActiveSpeechState()
  );

  useEffect(() => {
    const unsubSub = ambientNoiseService.subscribeSubtitles((enabled) => {
      setIsSubtitlesEnabled(enabled);
    });

    const unsubSpeech = aiExplanationService.subscribeSpeechState((state) => {
      setSpeechState(state);
    });

    return () => {
      unsubSub();
      unsubSpeech();
    };
  }, []);

  if (!isSubtitlesEnabled || !speechState.active || !speechState.text.trim()) {
    return null;
  }
  if (typeof document === 'undefined' || !document.body) {
    return null;
  }

  const handleClose = () => {
    soundFx.playClick();
    vibrateTap();
    ambientNoiseService.setSubtitlesEnabled(false);
  };

  return createPortal(
    <aside
      aria-label="Live Subtitles"
      className="fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] sm:bottom-20 left-1/2 -translate-x-1/2 z-50 w-11/12 max-w-xl pointer-events-auto animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      <div className="bg-black/90 backdrop-blur-md border border-emerald-500/40 rounded-[4px] p-3.5 shadow-2xl shadow-emerald-950/50 text-white flex flex-col gap-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[11px] font-mono font-bold tracking-wider text-emerald-400 uppercase flex items-center gap-1">
              <MessageSquare className="w-3.5 h-3.5" />
              {t('audio_subtitles_title', localLanguage)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 text-[10px] text-white/50 font-mono">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>AI Voice</span>
            </div>
            <button
              onClick={handleClose}
              title="Close subtitles"
              className="text-white/60 hover:text-white p-1 rounded hover:bg-white/10 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Live Caption Text */}
        <div className="max-h-28 overflow-y-auto pr-1">
          <p className="text-sm md:text-base font-sans font-medium text-white/95 leading-relaxed selection:bg-emerald-500 selection:text-black">
            {speechState.text}
          </p>
        </div>
      </div>
    </aside>,
    document.body
  );
};
