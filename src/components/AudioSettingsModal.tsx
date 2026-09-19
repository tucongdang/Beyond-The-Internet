import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Volume2, Volume1, VolumeX, Sparkles, X, Play, Square, Check, Sliders, Info, RotateCcw, Music, Mic, MessageSquare, Activity, AlertTriangle, Radio } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { aiExplanationService } from '../services/aiExplanationService';
import { ambientNoiseService, NoiseLevelData } from '../services/ambientNoiseService';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../utils/i18n';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { localLanguage } = useLanguage();

  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => soundFx.isEnabled());
  const [sfxVolume, setSfxVolume] = useState<number>(() => soundFx.getVolume());
  const [ttsVolume, setTtsVolume] = useState<number>(() => aiExplanationService.getTtsVolume());
  const [ttsPitch, setTtsPitch] = useState<number>(() => aiExplanationService.getTtsPitch());
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>(() => aiExplanationService.getSelectedVoiceURI());
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoSpeakAnswer, setAutoSpeakAnswer] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bti_auto_speak_answer');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });
  const [isTestingTts, setIsTestingTts] = useState<boolean>(false);

  // Subtitles & Ambient Noise states
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(() => ambientNoiseService.isSubtitlesEnabled());
  const [ambientListenerEnabled, setAmbientListenerEnabled] = useState<boolean>(() => ambientNoiseService.isListenerEnabled());
  const [autoBoostEnabled, setAutoBoostEnabled] = useState<boolean>(() => ambientNoiseService.isAutoBoostEnabled());
  const [autoSubtitlesOnLoud, setAutoSubtitlesOnLoud] = useState<boolean>(() => ambientNoiseService.isAutoSubtitlesOnLoudEnabled());
  const [noiseLevel, setNoiseLevel] = useState<NoiseLevelData>(() => ambientNoiseService.getCurrentLevel());

  // Sync state with global services on open
  useEffect(() => {
    if (isOpen) {
      setSfxEnabled(soundFx.isEnabled());
      setSfxVolume(soundFx.getVolume());
      setTtsVolume(aiExplanationService.getTtsVolume());
      setTtsPitch(aiExplanationService.getTtsPitch());
      setSelectedVoiceURI(aiExplanationService.getSelectedVoiceURI());
      setAvailableVoices(aiExplanationService.getAvailableVoices());
      setSubtitlesEnabled(ambientNoiseService.isSubtitlesEnabled());
      setAmbientListenerEnabled(ambientNoiseService.isListenerEnabled());
      setAutoBoostEnabled(ambientNoiseService.isAutoBoostEnabled());
      setAutoSubtitlesOnLoud(ambientNoiseService.isAutoSubtitlesOnLoudEnabled());
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('bti_auto_speak_answer');
        if (saved !== null) setAutoSpeakAnswer(saved === 'true');
      }
    }
  }, [isOpen]);

  // Load and listen for available system voices & noise updates
  useEffect(() => {
    const updateVoices = () => {
      const voices = aiExplanationService.getAvailableVoices();
      setAvailableVoices(voices);
    };

    updateVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    const unsubSfx = soundFx.subscribeVolume((vol) => setSfxVolume(vol));
    const unsubTts = aiExplanationService.subscribeTtsVolume((vol) => setTtsVolume(vol));
    const unsubPitch = aiExplanationService.subscribeTtsPitch((pitch) => setTtsPitch(pitch));
    const unsubVoice = aiExplanationService.subscribeSelectedVoice((uri) => setSelectedVoiceURI(uri));
    const unsubSubs = ambientNoiseService.subscribeSubtitles((enabled) => setSubtitlesEnabled(enabled));
    const unsubNoise = ambientNoiseService.subscribeNoiseLevel((data) => setNoiseLevel(data));

    return () => {
      unsubSfx();
      unsubTts();
      unsubPitch();
      unsubVoice();
      unsubSubs();
      unsubNoise();
    };
  }, []);

  // Handle Ambient Noise Listener Toggle
  const handleToggleAmbientListener = async () => {
    const next = !ambientListenerEnabled;
    setAmbientListenerEnabled(next);
    ambientNoiseService.setListenerEnabled(next);
    soundFx.playClick();
    vibrateTap();
  };

  // Handle Subtitles Toggle
  const handleToggleSubtitles = () => {
    const next = !subtitlesEnabled;
    setSubtitlesEnabled(next);
    ambientNoiseService.setSubtitlesEnabled(next);
    soundFx.playClick();
    vibrateTap();
  };

  // Handle Auto-Boost Toggle
  const handleToggleAutoBoost = () => {
    const next = !autoBoostEnabled;
    setAutoBoostEnabled(next);
    ambientNoiseService.setAutoBoostEnabled(next);
    soundFx.playClick();
    vibrateTap();
  };

  // Handle Auto-Subtitles on Loud Toggle
  const handleToggleAutoSubtitlesOnLoud = () => {
    const next = !autoSubtitlesOnLoud;
    setAutoSubtitlesOnLoud(next);
    ambientNoiseService.setAutoSubtitlesOnLoudEnabled(next);
    soundFx.playClick();
    vibrateTap();
  };

  // Handle Sound FX Volume Slider Change
  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVolume(val);
    soundFx.setVolume(val);
    if (!sfxEnabled && val > 0) {
      setSfxEnabled(true);
      soundFx.setEnabled(true);
    }
  };

  // Toggle Sound FX Mute
  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    soundFx.setEnabled(next);
    vibrateTap();
    if (next) soundFx.playClick();
  };

  // Handle TTS Voice Volume Slider Change
  const handleTtsVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTtsVolume(val);
    aiExplanationService.setTtsVolume(val);
  };

  // Handle TTS Voice Pitch Slider Change
  const handleTtsPitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTtsPitch(val);
    aiExplanationService.setTtsPitch(val);
  };

  const handleSetPitchPreset = (val: number) => {
    setTtsPitch(val);
    aiExplanationService.setTtsPitch(val);
    soundFx.playClick();
    vibrateTap();
  };

  // Handle Voice Selection Change
  const handleVoiceSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVoiceURI(val);
    aiExplanationService.setSelectedVoiceURI(val);
    soundFx.playClick();
    vibrateTap();
  };

  // Toggle Auto-Speak Answer
  const handleToggleAutoSpeak = () => {
    const next = !autoSpeakAnswer;
    setAutoSpeakAnswer(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_auto_speak_answer', String(next));
    }
    soundFx.playClick();
    vibrateTap();
  };

  // Test Sound FX
  const handleTestSfx = () => {
    vibrateSelection();
    soundFx.playTing();
  };

  // Test AI Voice
  const handleTestTts = () => {
    if (isTestingTts) {
      aiExplanationService.stopSpeech();
      setIsTestingTts(false);
      return;
    }

    setIsTestingTts(true);
    const testPhrase = localLanguage === 'en'
      ? `This is a test of the AI Voice tone at pitch ${ttsPitch.toFixed(2)}.`
      : `Kiểm tra giọng đọc AI với cao độ ${ttsPitch.toFixed(2)}.`;

    aiExplanationService.speakQuestionText(
      testPhrase,
      localLanguage,
      () => setIsTestingTts(false),
      () => setIsTestingTts(false)
    );
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div
        id="audio-settings-modal"
        className="w-full max-w-md fluent-box rounded-[2px] border border-white/20 shadow-2xl p-5 sm:p-6 space-y-6 text-white bg-[#150a2e]/95 relative"
        role="dialog"
        aria-modal="true"
        aria-labelledby="audio-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[2px] bg-sky-500/15 border border-sky-400/40 text-sky-300 flex items-center justify-center shadow-sm">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h3 id="audio-settings-title" className="text-sm sm:text-base font-bold text-white tracking-wide font-mono uppercase">
                {t('audio_settings_title', localLanguage)}
              </h3>
              <p className="text-[11px] text-white/50">
                {t('audio_settings_desc', localLanguage)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[2px] bg-white/5 hover:bg-white/15 text-white/60 hover:text-white transition cursor-pointer border border-white/10"
            title="Đóng (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Sliders Container */}
        <div className="space-y-4">
          {/* 1. SOUND FX VOLUME SLIDER */}
          <div className="p-3.5 sm:p-4 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center border transition ${
                  sfxEnabled && sfxVolume > 0
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 shadow-sm'
                    : 'bg-white/5 text-white/40 border-white/10'
                }`}>
                  {!sfxEnabled || sfxVolume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : sfxVolume < 0.5 ? (
                    <Volume1 className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <span>{t('audio_sfx_title', localLanguage)}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-[1px] bg-sky-500/20 text-sky-300 border border-sky-400/30 font-mono">
                      {sfxEnabled ? `${Math.round(sfxVolume * 100)}%` : 'MUTE'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-white/50">
                    {t('audio_sfx_desc', localLanguage)}
                  </p>
                </div>
              </div>

              {/* Mute toggle button */}
              <button
                type="button"
                onClick={handleToggleSfx}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-[2px] border transition cursor-pointer ${
                  sfxEnabled
                    ? 'bg-sky-500/20 text-sky-300 border-sky-400/40 hover:bg-sky-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/40 hover:bg-rose-500/30'
                }`}
              >
                {sfxEnabled ? 'BẬT' : 'TẮT'}
              </button>
            </div>

            {/* Range Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center gap-3">
                <input
                  id="slider-soundfx-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  disabled={!sfxEnabled}
                  value={sfxEnabled ? sfxVolume : 0}
                  onChange={handleSfxVolumeChange}
                  className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-sky-400 disabled:opacity-40 disabled:cursor-not-allowed"
                />
                <span className="text-xs font-mono text-white/80 w-10 text-right shrink-0">
                  {sfxEnabled ? `${Math.round(sfxVolume * 100)}%` : '0%'}
                </span>
              </div>
            </div>

            {/* Test Button */}
            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={handleTestSfx}
                disabled={!sfxEnabled || sfxVolume === 0}
                className="px-2.5 py-1 text-[11px] rounded-[2px] bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border border-white/15 font-mono flex items-center gap-1.5 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3 h-3 text-sky-400" />
                <span>{t('audio_test_sfx', localLanguage)}</span>
              </button>
            </div>
          </div>

          {/* 2. TTS AI VOICE VOLUME SLIDER */}
          <div className="p-3.5 sm:p-4 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center border transition ${
                  ttsVolume > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 shadow-sm'
                    : 'bg-white/5 text-white/40 border-white/10'
                }`}>
                  {ttsVolume === 0 ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono flex items-center gap-2">
                    <span>{t('audio_tts_title', localLanguage)}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-[1px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono">
                      {ttsVolume > 0 ? `${Math.round(ttsVolume * 100)}%` : 'MUTE'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-white/50">
                    {t('audio_tts_desc', localLanguage)}
                  </p>
                </div>
              </div>

              {/* Mute TTS Quick Toggle */}
              <button
                type="button"
                onClick={() => {
                  const nextVal = ttsVolume > 0 ? 0 : 1.0;
                  setTtsVolume(nextVal);
                  aiExplanationService.setTtsVolume(nextVal);
                  vibrateTap();
                }}
                className={`text-[10px] font-mono uppercase px-2 py-1 rounded-[2px] border transition cursor-pointer ${
                  ttsVolume > 0
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-400/40 hover:bg-rose-500/30'
                }`}
              >
                {ttsVolume > 0 ? 'BẬT' : 'TẮT'}
              </button>
            </div>

            {/* Range Slider */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-[11px] font-mono text-white/70">
                <span>{t('audio_volume_label', localLanguage)}</span>
                <span className="text-emerald-300 font-bold">{Math.round(ttsVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="slider-tts-volume"
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={ttsVolume}
                  onChange={handleTtsVolumeChange}
                  className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-emerald-400"
                />
              </div>
            </div>

            {/* Pitch & Tone Slider */}
            <div className="space-y-2 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-mono text-white font-bold">
                  <Music className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('audio_pitch_title', localLanguage)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-1.5 py-0.2 rounded-[1px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-mono font-bold">
                    {ttsPitch < 0.85
                      ? `${t('audio_pitch_deep', localLanguage)} (${ttsPitch.toFixed(2)}x)`
                      : ttsPitch > 1.15
                      ? `${t('audio_pitch_high', localLanguage)} (${ttsPitch.toFixed(2)}x)`
                      : `${t('audio_pitch_normal', localLanguage)} (${ttsPitch.toFixed(2)}x)`}
                  </span>
                  {ttsPitch !== 1.0 && (
                    <button
                      type="button"
                      onClick={() => handleSetPitchPreset(1.0)}
                      title={t('audio_pitch_reset', localLanguage)}
                      className="text-[10px] font-mono px-1.5 py-0.5 rounded-[1px] bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-2.5 h-2.5" />
                      <span>1.0x</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-white/40 shrink-0">0.5x</span>
                <input
                  id="slider-tts-pitch"
                  type="range"
                  min="0.5"
                  max="2.0"
                  step="0.05"
                  value={ttsPitch}
                  onChange={handleTtsPitchChange}
                  className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-emerald-400"
                />
                <span className="text-[10px] font-mono text-white/40 shrink-0">2.0x</span>
              </div>

              {/* Quick Tone Presets */}
              <div className="flex items-center justify-between gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => handleSetPitchPreset(0.7)}
                  className={`flex-1 py-1 text-[10px] font-mono rounded-[2px] border transition cursor-pointer ${
                    Math.abs(ttsPitch - 0.7) < 0.08
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                  }`}
                >
                  {t('audio_pitch_deep', localLanguage)} (0.7x)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPitchPreset(1.0)}
                  className={`flex-1 py-1 text-[10px] font-mono rounded-[2px] border transition cursor-pointer ${
                    Math.abs(ttsPitch - 1.0) < 0.08
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                  }`}
                >
                  {t('audio_pitch_normal', localLanguage)} (1.0x)
                </button>
                <button
                  type="button"
                  onClick={() => handleSetPitchPreset(1.3)}
                  className={`flex-1 py-1 text-[10px] font-mono rounded-[2px] border transition cursor-pointer ${
                    Math.abs(ttsPitch - 1.3) < 0.08
                      ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                  }`}
                >
                  {t('audio_pitch_high', localLanguage)} (1.3x)
                </button>
              </div>
            </div>

            {/* System Voice Selection Dropdown */}
            <div className="space-y-1.5 pt-3 border-t border-white/5">
              <div className="flex items-center justify-between">
                <label htmlFor="select-tts-voice" className="flex items-center gap-1.5 text-xs font-mono text-white font-bold cursor-pointer">
                  <Mic className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{t('audio_voice_select_title', localLanguage)}</span>
                </label>
                <span className="text-[10px] font-mono text-white/40">
                  {availableVoices.length > 0 ? `${availableVoices.length} voices` : ''}
                </span>
              </div>
              <div className="relative">
                <select
                  id="select-tts-voice"
                  value={selectedVoiceURI}
                  onChange={handleVoiceSelectChange}
                  className="w-full text-xs font-mono bg-black/40 border border-white/15 rounded-[2px] px-2.5 py-1.5 text-white/90 focus:outline-none focus:border-emerald-400 cursor-pointer appearance-none"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2334d399' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.25em 1.25em`, paddingRight: `2rem` }}
                >
                  <option value="auto" className="bg-slate-900 text-white">
                    {t('audio_voice_auto', localLanguage)}
                  </option>
                  {availableVoices.length === 0 ? (
                    <option value="" disabled className="bg-slate-900 text-white/50">
                      {t('audio_voice_no_voices', localLanguage)}
                    </option>
                  ) : (
                    availableVoices.map((voice) => (
                      <option
                        key={voice.voiceURI || voice.name}
                        value={voice.voiceURI || voice.name}
                        className="bg-slate-900 text-white"
                      >
                        {voice.name} ({voice.lang}){voice.default ? ' ★' : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Test Voice Button */}
            <div className="pt-2 border-t border-white/5 flex justify-end">
              <button
                type="button"
                onClick={handleTestTts}
                disabled={ttsVolume === 0}
                className={`px-2.5 py-1 text-[11px] rounded-[2px] border font-mono flex items-center gap-1.5 transition cursor-pointer ${
                  isTestingTts
                    ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 animate-pulse'
                    : 'bg-white/5 hover:bg-white/15 text-white/80 hover:text-white border-white/15'
                } disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {isTestingTts ? (
                  <>
                    <Square className="w-3 h-3 text-emerald-300" />
                    <span>Dừng Đọc</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 text-emerald-400" />
                    <span>{t('audio_test_tts', localLanguage)}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. LIVE SUBTITLES TOGGLE */}
          <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[2px] bg-teal-500/15 border border-teal-500/30 text-teal-300 flex items-center justify-center shrink-0">
                <MessageSquare className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span>{t('audio_subtitles_title', localLanguage)}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-[1px] border font-mono ${
                    subtitlesEnabled
                      ? 'bg-teal-500/20 text-teal-300 border-teal-400/30'
                      : 'bg-white/10 text-white/50 border-white/10'
                  }`}>
                    {subtitlesEnabled ? 'ACTIVE' : 'OFF'}
                  </span>
                </h4>
                <p className="text-[10px] text-white/50">
                  {t('audio_subtitles_desc', localLanguage)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleSubtitles}
              className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                subtitlesEnabled ? 'bg-teal-500 justify-end' : 'bg-gray-700 justify-start'
              }`}
              title={subtitlesEnabled ? 'Tắt phụ đề trực tiếp' : 'Bật phụ đề trực tiếp'}
            >
              <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
            </button>
          </div>

          {/* 4. SMART AMBIENT NOISE DETECTION */}
          <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3 bg-gradient-to-br from-amber-500/5 to-transparent">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[2px] bg-amber-500/15 border border-amber-500/30 text-amber-300 flex items-center justify-center shrink-0">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                    <span>{t('audio_ambient_title', localLanguage)}</span>
                    <span className={`text-[9px] px-1.5 py-0.2 rounded-[1px] border font-mono ${
                      ambientListenerEnabled
                        ? 'bg-amber-500/20 text-amber-300 border-amber-400/30 animate-pulse'
                        : 'bg-white/10 text-white/50 border-white/10'
                    }`}>
                      {ambientListenerEnabled ? 'LISTENING' : 'OFF'}
                    </span>
                  </h4>
                  <p className="text-[10px] text-white/50">
                    {t('audio_ambient_desc', localLanguage)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleToggleAmbientListener}
                className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                  ambientListenerEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-700 justify-start'
                }`}
                title={ambientListenerEnabled ? 'Tắt phát hiện môi trường ồn' : 'Bật phát hiện môi trường ồn'}
              >
                <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
              </button>
            </div>

            {/* Realtime Noise Level Meter if Listener is Enabled */}
            {ambientListenerEnabled && (
              <div className="space-y-2 pt-2 border-t border-white/5 animate-fadeIn">
                <div className="flex items-center justify-between text-[11px] font-mono">
                  <span className="text-white/70 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-amber-400" />
                    <span>{t('audio_ambient_level', localLanguage)}:</span>
                    <span className={`font-bold uppercase ${
                      noiseLevel.category === 'LOUD'
                        ? 'text-rose-400'
                        : noiseLevel.category === 'MODERATE'
                        ? 'text-amber-300'
                        : 'text-emerald-400'
                    }`}>
                      {noiseLevel.category === 'LOUD'
                        ? t('audio_ambient_loud', localLanguage)
                        : noiseLevel.category === 'MODERATE'
                        ? t('audio_ambient_moderate', localLanguage)
                        : t('audio_ambient_quiet', localLanguage)}
                    </span>
                  </span>
                  <span className="text-[10px] text-white/40">
                    {Math.round(noiseLevel.decibels)} dB ({noiseLevel.score0to100}%)
                  </span>
                </div>

                {/* Noise Bar Visualizer */}
                <div className="w-full bg-black/40 h-2 rounded-full overflow-hidden border border-white/10">
                  <div
                    className={`h-full transition-all duration-100 ${
                      noiseLevel.category === 'LOUD'
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : noiseLevel.category === 'MODERATE'
                        ? 'bg-amber-400'
                        : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(5, noiseLevel.score0to100))}%` }}
                  />
                </div>

                {/* Sub-options for Automatic Adjustments */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-[11px]">
                  <label className="flex items-center gap-2 p-1.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition border border-white/5">
                    <input
                      type="checkbox"
                      checked={autoBoostEnabled}
                      onChange={handleToggleAutoBoost}
                      className="rounded text-amber-500 focus:ring-amber-400"
                    />
                    <span className="text-white/80 font-mono text-[10px] leading-tight">
                      {t('audio_ambient_auto_boost', localLanguage)}
                    </span>
                  </label>

                  <label className="flex items-center gap-2 p-1.5 rounded bg-white/5 hover:bg-white/10 cursor-pointer transition border border-white/5">
                    <input
                      type="checkbox"
                      checked={autoSubtitlesOnLoud}
                      onChange={handleToggleAutoSubtitlesOnLoud}
                      className="rounded text-emerald-500 focus:ring-emerald-400"
                    />
                    <span className="text-white/80 font-mono text-[10px] leading-tight">
                      {t('audio_ambient_auto_subtitles', localLanguage)}
                    </span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* 5. AUTO READ ANSWER TOGGLE */}
          <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[2px] bg-purple-500/15 border border-purple-500/30 text-purple-300 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
                  <span>{t('audio_auto_read_title', localLanguage)}</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-[1px] border font-mono ${
                    autoSpeakAnswer
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'
                      : 'bg-white/10 text-white/50 border-white/10'
                  }`}>
                    {autoSpeakAnswer ? 'AUTO ON' : 'OFF'}
                  </span>
                </h4>
                <p className="text-[10px] text-white/50">
                  {t('audio_auto_read_desc', localLanguage)}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleAutoSpeak}
              className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                autoSpeakAnswer ? 'bg-emerald-500 justify-end' : 'bg-gray-700 justify-start'
              }`}
              title={autoSpeakAnswer ? 'Tắt tự động đọc' : 'Bật tự động đọc'}
            >
              <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
            </button>
          </div>
        </div>

        {/* Footer Info & Done Button */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50 font-mono">
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-sky-400" />
            <span>Tự động lưu vào trình duyệt</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white font-bold transition border border-white/20 cursor-pointer"
          >
            Hoàn Tất
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
