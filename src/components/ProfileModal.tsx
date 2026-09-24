import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../hooks/useLanguage';
import { UserInfo, GameState, UserResponse } from '../types';
import { computeAudienceScoreFromResponses } from '../services/audienceScoringService';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getApp, getApps } from 'firebase/app';
import { removeUndefined } from '../firebase';
import firebaseConfig from '../../firebase-applet-config.json';
import { soundFx, SoundPackTheme, SOUND_PACKS } from '../services/audioEffects';
import { aiExplanationService } from '../services/aiExplanationService';
import { SUPPORTED_TRANSLATION_LANGUAGES } from '../services/translationService';
import { t } from '../utils/i18n';
import { generate12DigitUID, getUserDisplayUid } from '../utils/uidUtils';
import { getSecureRandomId } from '../utils/cryptoUtils';
import {
  vibrateTap,
  vibrateSubmit,
  vibrateSuccess,
  vibrateError,
  vibrateSelection,
  isVibrationSupported,
  getHapticPreference,
  setHapticPreference,
  getHapticIntensity,
  setHapticIntensity,
  subscribeHapticPreference,
  HapticIntensity
} from '../utils/hapticUtils';
import { X, User, Globe, BarChart2, Edit3, Save, Activity, Camera, Smartphone, Vibrate, Check, Sliders, Sparkles, Contrast, Volume2, Volume1, VolumeX, Play, Square, Music, RotateCcw, Mic, MessageSquare } from 'lucide-react';
import { ambientNoiseService } from '../services/ambientNoiseService';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo;
  onUpdateUser: (user: UserInfo) => void;
  allResponses: Record<string, Record<string, UserResponse>>;
  gameState: GameState;
  initialTab?: 'stats' | 'edit' | 'settings';
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  allResponses,
  gameState,
  initialTab
}) => {
  const { localLanguage, toggleLanguage, selectLanguage } = useLanguage();
  
  const isWaitingRoom = Boolean(
    gameState.event_schedule?.enabled && gameState.event_schedule.status === 'SCHEDULED'
  );
  
  const [tab, setTab] = useState<'stats' | 'edit' | 'settings'>(initialTab || (isWaitingRoom ? 'edit' : 'stats'));
  
  // Edit state
  const [name, setName] = useState(user.name);
  const [mssv, setMssv] = useState(user.mssv);
  const [teamName, setTeamName] = useState(user.teamName || '');
  const [gender, setGender] = useState(user.gender || '');
  const [birthYear, setBirthYear] = useState(user.birthYear || '');
  const [avatarSeed, setAvatarSeed] = useState(user.avatarSeed || user.uid);
  const [isSaving, setIsSaving] = useState(false);

  // Sub-tab selection inside Settings
  const [settingsSubTab, setSettingsSubTab] = useState<'visual' | 'audio' | 'voice'>('visual');

  // Haptic feedback preference state
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(getHapticPreference);
  const [hapticIntensity, setHapticIntensityState] = useState<HapticIntensity>(() => {
    return user.hapticIntensity || getHapticIntensity();
  });
  const hapticsSupported = isVibrationSupported();

  // High contrast mode preference state
  const [highContrastEnabled, setHighContrastEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('bti_audience_high_contrast') === 'true';
    } catch {
      return false;
    }
  });

  // Audio settings state
  const [sfxEnabled, setSfxEnabled] = useState<boolean>(() => soundFx.isEnabled());
  const [sfxVolume, setSfxVolume] = useState<number>(() => soundFx.getVolume());
  const [selectedSoundPack, setSelectedSoundPack] = useState<SoundPackTheme>(() => user.soundPack || soundFx.getSoundPack());
  const [ttsVolume, setTtsVolume] = useState<number>(() => aiExplanationService.getTtsVolume());
  const [ttsPitch, setTtsPitch] = useState<number>(() => aiExplanationService.getTtsPitch());
  const [useGeminiTts, setUseGeminiTts] = useState<boolean>(() => aiExplanationService.isGeminiTtsEnabled());
  const [geminiVoice, setGeminiVoice] = useState<string>(() => aiExplanationService.getGeminiVoice());
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
  const [subtitlesEnabled, setSubtitlesEnabled] = useState<boolean>(() => ambientNoiseService.isSubtitlesEnabled());
  const [ambientListenerEnabled, setAmbientListenerEnabled] = useState<boolean>(() => ambientNoiseService.isListenerEnabled());

  useEffect(() => {
    const updateVoices = () => {
      setAvailableVoices(aiExplanationService.getAvailableVoices());
    };
    updateVoices();

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
    }

    const unsubSfx = soundFx.subscribeVolume((vol) => setSfxVolume(vol));
    const unsubSoundPack = soundFx.subscribeSoundPack((pack) => setSelectedSoundPack(pack));
    const unsubTts = aiExplanationService.subscribeTtsVolume((vol) => setTtsVolume(vol));
    const unsubPitch = aiExplanationService.subscribeTtsPitch((pitch) => setTtsPitch(pitch));
    const unsubGeminiTts = aiExplanationService.subscribeGeminiTts((val) => setUseGeminiTts(val));
    const unsubGeminiVoice = aiExplanationService.subscribeGeminiVoice((v) => setGeminiVoice(v));
    const unsubVoice = aiExplanationService.subscribeSelectedVoice((uri) => setSelectedVoiceURI(uri));
    const unsubSpeech = aiExplanationService.subscribeSpeechState((st) => setIsTestingTts(st.active));
    const unsubSubs = ambientNoiseService.subscribeSubtitles((enabled) => setSubtitlesEnabled(enabled));

    return () => {
      unsubSfx();
      unsubSoundPack();
      unsubTts();
      unsubPitch();
      unsubGeminiTts();
      unsubGeminiVoice();
      unsubVoice();
      unsubSpeech();
      unsubSubs();
    };
  }, []);

  const handleSelectSoundPack = async (pack: SoundPackTheme) => {
    setSelectedSoundPack(pack);
    soundFx.setSoundPack(pack);
    soundFx.playClick();
    vibrateTap();

    if (user?.uid) {
      try {
        const updatedUser: UserInfo = {
          ...user,
          soundPack: pack
        };
        onUpdateUser(updatedUser);
        const app = getApps()[0];
        const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
        await setDoc(doc(db, 'users', user.uid), removeUndefined(updatedUser), { merge: true });
      } catch (e) {
        console.warn("Notice saving sound pack to firestore:", e);
      }
    }
  };

  const handleToggleSubtitles = () => {
    const next = !subtitlesEnabled;
    setSubtitlesEnabled(next);
    ambientNoiseService.setSubtitlesEnabled(next);
    soundFx.playClick();
    vibrateTap();
  };

  const handleToggleAmbientListener = () => {
    const next = !ambientListenerEnabled;
    setAmbientListenerEnabled(next);
    ambientNoiseService.setListenerEnabled(next);
    soundFx.playClick();
    vibrateTap();
  };

  const handleSfxVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setSfxVolume(val);
    soundFx.setVolume(val);
    if (!sfxEnabled && val > 0) {
      setSfxEnabled(true);
      soundFx.setEnabled(true);
    }
  };

  const handleToggleSfx = () => {
    const next = !sfxEnabled;
    setSfxEnabled(next);
    soundFx.setEnabled(next);
    vibrateTap();
    if (next) soundFx.playClick();
  };

  const handleTtsVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setTtsVolume(val);
    aiExplanationService.setTtsVolume(val);
  };

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

  const handleVoiceSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedVoiceURI(val);
    aiExplanationService.setSelectedVoiceURI(val);
    soundFx.playClick();
    vibrateTap();
  };

  const handleToggleAutoSpeak = () => {
    const next = !autoSpeakAnswer;
    setAutoSpeakAnswer(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_auto_speak_answer', String(next));
    }
    soundFx.playClick();
    vibrateTap();
  };

  const handleTestSfx = () => {
    vibrateSelection();
    soundFx.playTing();
  };

  const handleTestTts = () => {
    if (isTestingTts) {
      aiExplanationService.stopSpeech();
      setIsTestingTts(false);
      return;
    }
    setIsTestingTts(true);
    const testPhrase = localLanguage === 'en'
      ? 'AI Voice narration volume test.'
      : 'Thử nghiệm âm lượng giọng đọc AI thành công.';
    aiExplanationService.speakQuestionText(
      testPhrase,
      localLanguage,
      () => setIsTestingTts(false),
      () => setIsTestingTts(false)
    );
  };

  // Language preference state
    const handleToggleLanguage = () => {
    toggleLanguage();
    soundFx.playClick();
    vibrateTap();
  };

  const handleToggleHighContrast = () => {
    const nextVal = !highContrastEnabled;
    setHighContrastEnabled(nextVal);
    soundFx.playClick();
    vibrateTap();
    try {
      localStorage.setItem('bti_audience_high_contrast', String(nextVal));
      window.dispatchEvent(new Event('storage'));
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    return subscribeHapticPreference((enabled, intensity) => {
      setHapticsEnabled(enabled);
      setHapticIntensityState(intensity);
    });
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setMssv(user.mssv);
      setGender(user.gender || '');
      setBirthYear(user.birthYear || '');
      setTeamName(user.teamName || '');
      setAvatarSeed(user.avatarSeed || user.uid);
      if (user.soundPack) {
        setSelectedSoundPack(user.soundPack);
        soundFx.setSoundPack(user.soundPack);
      }
      if (user.hapticIntensity) {
        setHapticIntensityState(user.hapticIntensity);
        setHapticIntensity(user.hapticIntensity);
      } else {
        setHapticIntensityState(getHapticIntensity());
      }
      setTab(initialTab || (isWaitingRoom ? 'edit' : 'stats'));
    }
  }, [isOpen, user, isWaitingRoom, initialTab]);

  const scoreState = useMemo(() => {
    return computeAudienceScoreFromResponses(allResponses, user.uid, user.mssv, undefined, gameState);
  }, [allResponses, user, gameState]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    vibrateSubmit();
    setIsSaving(true);
    try {
      const anonymizedUid = user.anonymizedUid || generate12DigitUID(name, mssv, gender, birthYear);
      const updatedUser: UserInfo = {
        ...user,
        name: name.trim(),
        mssv: mssv.trim(),
        gender,
        birthYear,
        teamName: teamName.trim() || undefined,
        anonymizedUid,
        avatarSeed,
        soundPack: selectedSoundPack,
        hapticIntensity
      };
      
      const app = getApps()[0];
      const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
      await setDoc(doc(db, 'users', user.uid), removeUndefined(updatedUser), { merge: true });
      
      onUpdateUser(updatedUser);
      vibrateSuccess();
      soundFx.playTing();
      if (!isWaitingRoom) {
        setTab('stats');
      } else {
        onClose();
      }
    } catch (err) {
      console.error(err);
      soundFx.playError();
      vibrateError();
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectHapticIntensity = async (intensity: HapticIntensity) => {
    setHapticIntensityState(intensity);
    setHapticIntensity(intensity);
    soundFx.playClick();
    vibrateSubmit();

    if (user?.uid) {
      try {
        const updatedUser: UserInfo = {
          ...user,
          hapticIntensity: intensity
        };
        onUpdateUser(updatedUser);
        const app = getApps()[0];
        const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
        await setDoc(doc(db, 'users', user.uid), removeUndefined(updatedUser), { merge: true });
      } catch (e) {
        console.warn("Notice saving haptic intensity to firestore:", e);
      }
    }
  };

  const generateNewAvatar = () => {
    soundFx.playClick();
    vibrateTap();
    setAvatarSeed(getSecureRandomId('', 8));
  };

  const handleToggleHaptics = () => {
    const next = !hapticsEnabled;
    setHapticsEnabled(next);
    setHapticPreference(next);
    soundFx.playClick();
  };

  const handleTestVibrate = () => {
    soundFx.playClick();
    vibrateSubmit();
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div
      className="fluent-dialog-overlay z-[60] animate-fadeIn flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-2xl"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-modal-title"
    >
      <div
        className="fluent-dialog w-full max-w-lg md:max-w-3xl lg:max-w-4xl my-auto transition-all duration-300 flex flex-col max-h-[92vh] overflow-hidden bg-[#13072b]/85 backdrop-blur-3xl border border-white/20 shadow-[0_32px_64px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.3)] rounded-[3px] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle glass glow accent background lights */}
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-purple-500/20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-pink-500/15 blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="fluent-dialog-header relative z-10 backdrop-blur-xl bg-white/10 border-b border-white/15 px-5 py-4">
          <h2 id="profile-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#F7CAC9] drop-shadow-[0_0_8px_rgba(247,202,201,0.5)]" />
            {isWaitingRoom
              ? (localLanguage !== 'vi' ? 'Edit Personal Information' : 'Chỉnh Sửa Thông Tin Cá Nhân')
              : t("prof_title", localLanguage)}
          </h2>
          <button
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="min-w-[38px] min-h-[38px] p-2 text-white/70 hover:text-white hover:bg-white/15 rounded-[2px] backdrop-blur-md border border-white/10 transition cursor-pointer flex items-center justify-center active:scale-95 shadow-sm"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Section */}
        <div className="p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/10 shrink-0 relative z-10 backdrop-blur-xl bg-white/[0.04]">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="relative group shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-[2px] bg-white/10 backdrop-blur-md border-2 border-purple-400/60 flex items-center justify-center overflow-hidden shadow-[0_8px_24px_rgba(168,85,247,0.3)]">
                <img 
                  src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&backgroundColor=transparent`} 
                  alt="Avatar" 
                  className="w-14 h-14 sm:w-16 sm:h-16"
                />
              </div>
              {(tab === 'edit' || isWaitingRoom) && (
                <button 
                  onClick={generateNewAvatar}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-[#F7CAC9] text-[#190839] hover:brightness-110 rounded-[2px] shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer border border-white/40"
                  title={localLanguage !== 'vi' ? 'Change avatar' : 'Đổi ảnh đại diện'}
                >
                  <Camera className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-sm">{user.name}</h3>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2 mt-1.5">
                <span className="px-2.5 py-0.5 rounded-[2px] text-[10px] sm:text-xs font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 backdrop-blur-md shadow-sm">
                  MSSV: {user.mssv}
                </span>
                <span className="px-2.5 py-0.5 rounded-[2px] text-[10px] sm:text-xs font-mono font-semibold bg-purple-500/20 text-purple-200 border border-purple-400/30 backdrop-blur-md shadow-sm">
                  UID: {getUserDisplayUid(user)}
                </span>
                {user.teamName && (
                  <span className="px-2.5 py-0.5 rounded-[2px] text-[10px] sm:text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-400/30 backdrop-blur-md shadow-sm">
                    {user.teamName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Stats Pill on Desktop Header */}
          {!isWaitingRoom && (
            <div className="hidden md:flex items-center gap-4 shrink-0 bg-white/10 backdrop-blur-xl border border-white/20 p-2.5 px-4 rounded-[2px] font-mono shadow-[0_8px_20px_rgba(0,0,0,0.3)]">
              <div className="text-right">
                <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider">{t("profile_total_score", localLanguage)}</div>
                <div className="text-lg font-black text-[#F7CAC9] drop-shadow-[0_0_8px_rgba(247,202,201,0.4)]">{scoreState.totalScore}</div>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div>
                <div className="text-[10px] text-white/60 uppercase font-bold tracking-wider">{t("profile_correct_answers", localLanguage)}</div>
                <div className="text-lg font-black text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]">{scoreState.correctAnswersCount}<span className="text-xs text-emerald-500/60">/{scoreState.totalAnswered}</span></div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-2.5 gap-2 shrink-0 border-b border-white/15 bg-black/20 backdrop-blur-lg relative z-10">
          {!isWaitingRoom && (
            <button 
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                setTab('stats');
              }}
              className={`px-4 py-2.5 rounded-t-[2px] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md ${
                tab === 'stats' 
                  ? 'bg-white/15 text-white border-b-2 border-[#F7CAC9] shadow-[0_4px_16px_rgba(247,202,201,0.25)]' 
                  : 'text-white/50 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Activity className="w-4 h-4 text-[#F7CAC9]" /> {t("prof_stats", localLanguage)}
            </button>
          )}
          <button 
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              setTab('edit');
            }}
            className={`px-4 py-2.5 rounded-t-[2px] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md ${
              tab === 'edit' 
                ? 'bg-white/15 text-white border-b-2 border-[#F7CAC9] shadow-[0_4px_16px_rgba(247,202,201,0.25)]' 
                : 'text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Edit3 className="w-4 h-4 text-purple-300" /> {isWaitingRoom ? (localLanguage !== 'vi' ? 'Profile Details' : 'Thông Tin Cá Nhân') : t("prof_update", localLanguage)}
          </button>
          <button 
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              setTab('settings');
            }}
            className={`px-4 py-2.5 rounded-t-[2px] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer backdrop-blur-md ${
              tab === 'settings' 
                ? 'bg-white/15 text-white border-b-2 border-[#F7CAC9] shadow-[0_4px_16px_rgba(247,202,201,0.25)]' 
                : 'text-white/50 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Sliders className="w-4 h-4 text-sky-300" /> {isWaitingRoom ? (localLanguage !== 'vi' ? 'Device & Audio' : 'Cài Đặt & Thiết Bị') : t("profile_settings_tab", localLanguage)}
          </button>
        </div>

        {/* Content */}
        <div className="fluent-dialog-body space-y-5">
          {!isWaitingRoom && tab === 'stats' && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="fluent-box-nested border border-purple-500/30 rounded-[2px] p-4 text-center">
                  <div className="text-[#F7CAC9] text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-1">{t("profile_total_score", localLanguage)}</div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-mono">{scoreState.totalScore}</div>
                </div>
                <div className="fluent-box-nested border border-emerald-500/30 rounded-[2px] p-4 text-center">
                  <div className="text-emerald-400 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider mb-1">{t("profile_correct_answers", localLanguage)}</div>
                  <div className="text-3xl sm:text-4xl font-black text-white font-mono">{scoreState.correctAnswersCount}<span className="text-sm text-emerald-500/50">/{scoreState.totalAnswered}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono mb-2">{t("profile_score_breakdown", localLanguage)}</h4>
                
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 fluent-box-nested rounded-[2px] border border-white/5 text-center space-y-1">
                    <span className="text-xs text-white/70 font-medium block truncate">{t("prof_stat_kd", localLanguage)}</span>
                    <span className="text-base sm:text-lg font-bold text-[#F7CAC9] font-mono block">+{scoreState.scoreBreakdown.round1}</span>
                  </div>
                  
                  <div className="p-3.5 fluent-box-nested rounded-[2px] border border-white/5 text-center space-y-1">
                    <span className="text-xs text-white/70 font-medium block truncate">{t("prof_stat_vcnv", localLanguage)}</span>
                    <span className="text-base sm:text-lg font-bold text-[#F7CAC9] font-mono block">+{scoreState.scoreBreakdown.round2}</span>
                  </div>
                  
                  <div className="p-3.5 fluent-box-nested rounded-[2px] border border-white/5 text-center space-y-1">
                    <span className="text-xs text-white/70 font-medium block truncate">{t("prof_stat_tt", localLanguage)}</span>
                    <span className="text-base sm:text-lg font-bold text-[#F7CAC9] font-mono block">+{scoreState.scoreBreakdown.round3}</span>
                  </div>
                  
                  <div className="p-3.5 fluent-box-nested rounded-[2px] border border-white/5 text-center space-y-1">
                    <span className="text-xs text-white/70 font-medium block truncate">{t("prof_stat_vd", localLanguage)}</span>
                    <span className="text-base sm:text-lg font-bold text-[#F7CAC9] font-mono block">+{scoreState.scoreBreakdown.round4}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'edit' && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="fluent-box-nested border border-purple-500/30 rounded-[2px] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                    <span>{t("prof_uid", localLanguage)}</span>
                    <span className="fluent-badge fluent-badge-accent">
                      {localLanguage !== 'vi' ? 'Fixed' : 'Cố Định'}
                    </span>
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(getUserDisplayUid(user));
                      soundFx.playClick();
                      vibrateTap();
                    }}
                    className="fluent-btn px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-[2px] text-[11px] font-bold font-mono transition active:scale-95 cursor-pointer shadow"
                  >
                    {localLanguage !== 'vi' ? 'Copy Code' : 'Sao Chép Mã'}
                  </button>
                </div>
                <div className="text-sm font-mono font-bold text-white fluent-box-nested border border-white/10 px-3 py-2 rounded-[2px] tracking-wider select-all">
                  {getUserDisplayUid(user)}
                </div>
                <p className="text-[10px] text-purple-200/60 leading-tight">
                  {localLanguage !== 'vi' ? '💡 12-digit unique identifier format: 4 Student ID + 2 Name chars + Gender + 2 Birth Year + 3 Random.' : '💡 Mã 12 số định danh duy nhất theo chuẩn: 4 số MSSV + 2 ký tự Tên + Giới tính + 2 số Năm sinh + 3 số Ngẫu nhiên.'}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5 font-mono">{t("profile_fullname", localLanguage)}</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full fluent-input"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5 font-mono">{t("prof_mssv", localLanguage)}</label>
                  <input
                    type="text"
                    value={mssv}
                    onChange={(e) => setMssv(e.target.value)}
                    className="w-full fluent-input font-mono"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-white/70 mb-1.5 font-mono">
                    {localLanguage !== 'vi' ? 'Cheering Team (Optional)' : 'Đội Cổ Vũ (Tùy chọn)'}
                  </label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder={localLanguage !== 'vi' ? 'e.g. Phoenix, Golden Dragon, Blue Fire...' : 'VD: Rồng Vàng, Lửa Xanh...'}
                    className="w-full fluent-input font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5 font-mono">{t("profile_gender", localLanguage)}</label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      vibrateSelection();
                      setGender(e.target.value);
                    }}
                    className="w-full fluent-select"
                  >
                    <option value="" disabled>{t("prof_gender_select", localLanguage)}</option>
                    <option value="1">Nam (1)</option>
                    <option value="2">{t("prof_gender_f", localLanguage)}</option>
                    <option value="0">{t("prof_gender_o", localLanguage)}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5 font-mono">{t("profile_birthyear", localLanguage)}</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={birthYear}
                    onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
                    className="w-full fluent-input font-mono"
                  />
                </div>
              </div>
              
              <button
                type="submit"
                disabled={isSaving}
                className="fluent-btn w-full mt-4 fluent-acrylic-surface hover:brightness-110 active:scale-98 text-white font-bold py-3 px-4 rounded-[2px] uppercase text-xs font-mono tracking-wider flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> {t("prof_btn_update", localLanguage)}
                  </>
                )}
              </button>
            </form>
          )}

          {tab === 'settings' && (
            <div className="space-y-4">
              {/* Settings Sub-Tab Navigation Bar */}
              <div className="grid grid-cols-3 gap-1.5 p-1.5 bg-black/50 backdrop-blur-2xl rounded-[2px] border border-white/15 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    vibrateTap();
                    setSettingsSubTab('visual');
                  }}
                  className={`py-2 px-2.5 rounded-[2px] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 backdrop-blur-md ${
                    settingsSubTab === 'visual'
                      ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-[0_4px_16px_rgba(147,51,234,0.4)] border border-purple-300/40 ring-1 ring-white/20'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5 text-blue-300 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'Visual & Haptics' : 'Giao Diện & Rung'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    vibrateTap();
                    setSettingsSubTab('audio');
                  }}
                  className={`py-2 px-2.5 rounded-[2px] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 backdrop-blur-md ${
                    settingsSubTab === 'audio'
                      ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-[0_4px_16px_rgba(147,51,234,0.4)] border border-purple-300/40 ring-1 ring-white/20'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Sliders className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'Audio & Sound Pack' : 'Âm Thanh & Sound Pack'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    vibrateTap();
                    setSettingsSubTab('voice');
                  }}
                  className={`py-2 px-2.5 rounded-[2px] text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition cursor-pointer active:scale-98 backdrop-blur-md ${
                    settingsSubTab === 'voice'
                      ? 'bg-gradient-to-r from-purple-600/90 to-indigo-600/90 text-white shadow-[0_4px_16px_rgba(147,51,234,0.4)] border border-purple-300/40 ring-1 ring-white/20'
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'AI Voice & Subtitles' : 'Giọng Đọc AI & Phụ Đề'}</span>
                </button>
              </div>

              {/* Sub-Tab 1: Visual & Haptics */}
              {settingsSubTab === 'visual' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Language Settings Card */}
                  <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[2px] bg-white/10 text-blue-300 border border-blue-500/30 flex items-center justify-center shrink-0">
                        <Globe className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>{t("profile_language_settings", localLanguage)}</span>
                        </h4>
                        <p className="text-[10px] text-[#B6A6D8]">
                          {localLanguage === "vi" ? "Tiếng Việt (Gốc)" : (SUPPORTED_TRANSLATION_LANGUAGES.find(l => l.code === localLanguage)?.nativeLabel || localLanguage.toUpperCase())}
                        </p>
                      </div>
                    </div>

                    <select
                      value={localLanguage}
                      onChange={(e) => {
                        selectLanguage(e.target.value);
                        soundFx.playClick();
                        vibrateTap();
                      }}
                      className="fluent-input text-xs font-mono py-1.5 px-2.5 rounded-[2px] bg-[#190839] text-white border border-white/20 cursor-pointer focus:outline-none focus:border-sky-400"
                    >
                      <option value="vi">🇻🇳 Tiếng Việt (VI)</option>
                      {SUPPORTED_TRANSLATION_LANGUAGES.map((l) => (
                        <option key={l.code} value={l.code}>
                          {l.flag} {l.nativeLabel} ({l.code.toUpperCase()})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* High Contrast / Pure Black Mode Settings Card */}
                  <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[2px] bg-white/10 text-amber-300 border border-amber-500/30 flex items-center justify-center shrink-0">
                          <Contrast className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{t("prof_dark_mode", localLanguage)}</span>
                            <span className="fluent-badge fluent-badge-warning">
                              {localLanguage !== 'vi' ? 'Optimal' : 'Tối Ưu'}
                            </span>
                          </h4>
                          <p className="text-[10px] text-[#B6A6D8]">
                            {localLanguage !== 'vi' ? 'Switch entire background to deep black #000000 while preserving vibrant game colors for readability and eye comfort.' : 'Chuyển toàn bộ nền sang đen sâu `#000000` và giữ nguyên màu sắc sống động của game để nhìn rõ, đỡ mỏi mắt.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleToggleHighContrast}
                        className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer shrink-0 ${
                          highContrastEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-700 justify-start'
                        }`}
                        title={highContrastEnabled ? t("prof_dark_off", localLanguage) : t("prof_dark_on", localLanguage)}
                      >
                        <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
                      </button>
                    </div>
                  </div>

                  {/* Haptic Vibration Settings Card */}
                  <div className="md:col-span-2 p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-[2px] bg-white/10 text-purple-300 border border-purple-500/30 flex items-center justify-center shrink-0">
                          <Smartphone className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                            <span>{t("profile_haptic_title", localLanguage)}</span>
                            {hapticsSupported ? (
                              <span className="fluent-badge fluent-badge-success">
                                {localLanguage !== 'vi' ? 'Ready' : 'Sẵn Sàng'}
                              </span>
                            ) : (
                              <span className="fluent-badge fluent-badge-warning">
                                {localLanguage !== 'vi' ? 'Not Supported' : 'Không hỗ trợ'}
                              </span>
                            )}
                          </h4>
                          <p className="text-[10px] text-[#B6A6D8]">
                            {localLanguage !== 'vi' ? 'Provides physical haptic feedback when selecting answers, submitting, and locking time.' : 'Tạo cảm giác rung chạm vật lý khi chọn đáp án, nộp bài, khóa giờ.'}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={hapticsEnabled}
                        aria-label="Phản hồi xúc giác"
                        onClick={handleToggleHaptics}
                        className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer shrink-0 ${
                          hapticsEnabled ? 'bg-purple-600 justify-end' : 'bg-gray-700 justify-start'
                        }`}
                        title={hapticsEnabled ? t("prof_haptic_off", localLanguage) : t("prof_haptic_on", localLanguage)}
                      >
                        <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
                      </button>
                    </div>

                    {hapticsSupported && hapticsEnabled && (
                      <div className="pt-2.5 border-t border-white/10 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-mono text-white font-bold text-[11px]">
                            <Vibrate className="w-3.5 h-3.5 text-purple-300" />
                            <span>{localLanguage !== 'vi' ? 'Haptic Intensity' : 'Cường Độ Rung (Haptic Intensity)'}</span>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-purple-300 px-2 py-0.5 bg-purple-500/20 rounded-[2px] border border-purple-400/30">
                            {hapticIntensity === 'Soft'
                              ? (localLanguage !== 'vi' ? 'Soft (55%)' : 'Soft (Dịu Nhẹ)')
                              : hapticIntensity === 'Strong'
                              ? (localLanguage !== 'vi' ? 'Strong (155%)' : 'Strong (Mạnh Mẽ)')
                              : (localLanguage !== 'vi' ? 'Medium (100%)' : 'Medium (Vừa Phải)')}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-white/50 shrink-0">Soft</span>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="1"
                              value={hapticIntensity === 'Soft' ? 0 : hapticIntensity === 'Strong' ? 2 : 1}
                              onChange={(e) => {
                                const val = parseInt(e.target.value, 10);
                                const level: HapticIntensity = val === 0 ? 'Soft' : val === 2 ? 'Strong' : 'Medium';
                                handleSelectHapticIntensity(level);
                              }}
                              className="w-full h-2 bg-white/10 rounded-[2px] appearance-none cursor-pointer accent-purple-400"
                            />
                            <span className="text-[10px] font-mono text-white/50 shrink-0">Strong</span>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            {(['Soft', 'Medium', 'Strong'] as HapticIntensity[]).map((level) => {
                              const isSelected = hapticIntensity === level;
                              const label = level === 'Soft'
                                ? (localLanguage !== 'vi' ? 'Soft' : 'Dịu Nhẹ')
                                : level === 'Strong'
                                ? (localLanguage !== 'vi' ? 'Strong' : 'Mạnh Mẽ')
                                : (localLanguage !== 'vi' ? 'Medium' : 'Vừa Phải');
                              
                              return (
                                <button
                                  key={level}
                                  type="button"
                                  onClick={() => handleSelectHapticIntensity(level)}
                                  className={`py-1.5 px-2 rounded-[2px] border text-xs font-mono font-bold transition flex items-center justify-center gap-1 cursor-pointer active:scale-95 ${
                                    isSelected
                                      ? 'bg-purple-600/90 text-white border-purple-400 shadow-md shadow-purple-950/40 ring-1 ring-purple-300/40'
                                      : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                                  }`}
                                >
                                  <Vibrate className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-white/40'}`} />
                                  <span>{label}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="pt-1.5 border-t border-white/5 flex items-center justify-between">
                          <span className="text-[10px] text-[#B6A6D8]/80 italic">
                            {localLanguage !== 'vi' ? 'Test vibration pattern on device:' : 'Kiểm tra độ rung trên thiết bị:'}
                          </span>
                          <button
                            type="button"
                            onClick={handleTestVibrate}
                            className="fluent-btn px-3 py-1.5 rounded-[2px] bg-white/10 hover:bg-white/15 border border-purple-500/40 text-purple-200 text-xs font-bold font-mono flex items-center gap-1.5 active:scale-95 transition cursor-pointer"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{t("profile_haptic_test", localLanguage)}</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Sub-Tab 2: Audio & Sound Pack */}
              {settingsSubTab === 'audio' && (
                <div className="space-y-4">
                  {/* Sound FX Volume Card */}
                  <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {sfxEnabled && sfxVolume > 0 ? (
                          <Volume2 className="w-4 h-4 text-sky-400" />
                        ) : (
                          <VolumeX className="w-4 h-4 text-white/40" />
                        )}
                        <span className="font-mono text-white font-bold">{t("audio_sfx_title", localLanguage)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-sky-300 px-1.5 py-0.2 bg-sky-500/20 rounded-[1px] border border-sky-400/30">
                          {sfxEnabled ? `${Math.round(sfxVolume * 100)}%` : 'MUTE'}
                        </span>
                        <button
                          type="button"
                          onClick={handleToggleSfx}
                          className="text-[10px] font-mono px-2 py-0.5 rounded-[1px] border border-white/20 bg-white/5 hover:bg-white/10 text-white transition cursor-pointer"
                        >
                          {sfxEnabled ? 'Tắt' : 'Bật'}
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        disabled={!sfxEnabled}
                        value={sfxEnabled ? sfxVolume : 0}
                        onChange={handleSfxVolumeChange}
                        className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-sky-400 disabled:opacity-40"
                      />
                      <button
                        type="button"
                        onClick={handleTestSfx}
                        disabled={!sfxEnabled || sfxVolume === 0}
                        className="shrink-0 px-2.5 py-1 text-xs font-mono rounded-[2px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                      >
                        <Play className="w-3 h-3 text-sky-400" />
                        <span>Thử</span>
                      </button>
                    </div>
                  </div>

                  {/* Sound Pack Card */}
                  <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-mono text-white font-bold text-xs">
                        <Music className="w-4 h-4 text-amber-400" />
                        <span>{t("sound_pack_title", localLanguage)}</span>
                      </div>
                      <span className="text-[10px] font-mono text-amber-300 px-2 py-0.5 bg-amber-500/20 rounded-[2px] border border-amber-400/30">
                        {SOUND_PACKS.find(p => p.id === selectedSoundPack)?.iconEmoji} {localLanguage !== 'vi' ? SOUND_PACKS.find(p => p.id === selectedSoundPack)?.nameEn : SOUND_PACKS.find(p => p.id === selectedSoundPack)?.nameVi}
                      </span>
                    </div>

                    <p className="text-[10px] text-[#B6A6D8]">
                      {t("sound_pack_desc", localLanguage)}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {SOUND_PACKS.map((pack) => {
                        const isSelected = selectedSoundPack === pack.id;
                        return (
                          <div
                            key={pack.id}
                            onClick={() => handleSelectSoundPack(pack.id)}
                            className={`relative p-3 rounded-[3px] border transition-all cursor-pointer flex flex-col justify-between select-none ${
                              isSelected
                                ? 'bg-purple-950/60 border-amber-400/70 shadow-md shadow-amber-950/40 ring-1 ring-amber-400/40'
                                : 'bg-black/30 hover:bg-black/50 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-xl shrink-0">{pack.iconEmoji}</span>
                                <div>
                                  <p className="text-xs font-bold font-mono text-white flex items-center gap-1">
                                    <span>{localLanguage !== 'vi' ? pack.nameEn : pack.nameVi}</span>
                                  </p>
                                  <p className="text-[10px] text-white/60 line-clamp-1 leading-tight">
                                    {localLanguage !== 'vi' ? pack.descEn : pack.descVi}
                                  </p>
                                </div>
                              </div>
                              {isSelected && (
                                <div className="w-4 h-4 rounded-full bg-amber-400/20 border border-amber-400 text-amber-300 flex items-center justify-center shrink-0">
                                  <Check className="w-2.5 h-2.5" />
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-2 pt-2 border-t border-white/5 mt-auto">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundFx.previewSoundPack(pack.id, true);
                                  vibrateSuccess();
                                }}
                                className="flex-1 py-1.5 px-2 rounded-[2px] bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-[10px] font-mono flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                                title={localLanguage !== 'vi' ? 'Preview correct answer sound' : 'Nghe thử âm thanh câu đúng'}
                              >
                                <Play className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{t("sound_pack_test_correct", localLanguage)}</span>
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  soundFx.previewSoundPack(pack.id, false);
                                  vibrateError();
                                }}
                                className="flex-1 py-1.5 px-2 rounded-[2px] bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[10px] font-mono flex items-center justify-center gap-1 transition cursor-pointer active:scale-95"
                                title={localLanguage !== 'vi' ? 'Preview incorrect answer sound' : 'Nghe thử âm thanh câu chưa đúng'}
                              >
                                <Play className="w-3 h-3 text-rose-400 shrink-0" />
                                <span>{t("sound_pack_test_incorrect", localLanguage)}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Sub-Tab 3: AI Voice & Subtitles */}
              {settingsSubTab === 'voice' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  {/* Left: AI Voice Volume, Pitch & Engine */}
                  <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3.5">
                    {/* Volume Slider */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          {ttsVolume > 0 ? (
                            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <VolumeX className="w-3.5 h-3.5 text-white/40" />
                          )}
                          <span className="font-mono text-white font-bold">{t("audio_tts_title", localLanguage)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-emerald-300 px-1.5 py-0.2 bg-emerald-500/20 rounded-[1px] border border-emerald-400/30">
                            {ttsVolume > 0 ? `${Math.round(ttsVolume * 100)}%` : 'MUTE'}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const nextVal = ttsVolume > 0 ? 0 : 1.0;
                              setTtsVolume(nextVal);
                              aiExplanationService.setTtsVolume(nextVal);
                              vibrateTap();
                            }}
                            className="text-[10px] font-mono px-2 py-0.5 rounded-[1px] border border-white/20 bg-white/5 hover:bg-white/10 text-white transition cursor-pointer"
                          >
                            {ttsVolume > 0 ? 'Tắt' : 'Bật'}
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.01"
                          value={ttsVolume}
                          onChange={handleTtsVolumeChange}
                          className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-emerald-400"
                        />
                        <button
                          type="button"
                          onClick={handleTestTts}
                          disabled={ttsVolume === 0}
                          className={`shrink-0 px-2 py-1 text-[10px] font-mono rounded-[2px] border text-white/80 flex items-center gap-1 cursor-pointer ${
                            isTestingTts ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400' : 'bg-white/5 hover:bg-white/10 border-white/10'
                          } disabled:opacity-40`}
                        >
                          {isTestingTts ? <Square className="w-2.5 h-2.5 text-emerald-300" /> : <Play className="w-2.5 h-2.5 text-emerald-400" />}
                          <span>{isTestingTts ? 'Dừng' : 'Thử'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Pitch Slider */}
                    <div className="pt-2 border-t border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-white font-bold text-[11px]">
                          <Music className="w-3 h-3 text-emerald-400" />
                          <span>{t("audio_pitch_title", localLanguage)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-[9px] font-mono text-emerald-300 px-1.5 py-0.2 bg-emerald-500/20 rounded-[1px] border border-emerald-400/30">
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
                              className="text-[9px] font-mono px-1 py-0.2 rounded-[1px] bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 flex items-center gap-0.5 cursor-pointer"
                            >
                              <RotateCcw className="w-2.5 h-2.5" />
                              <span>1.0x</span>
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-mono text-white/40">0.5x</span>
                        <input
                          type="range"
                          min="0.5"
                          max="2.0"
                          step="0.05"
                          value={ttsPitch}
                          onChange={handleTtsPitchChange}
                          className="w-full h-2 bg-white/10 rounded-[1px] appearance-none cursor-pointer accent-emerald-400"
                        />
                        <span className="text-[9px] font-mono text-white/40">2.0x</span>
                      </div>
                      <div className="flex items-center gap-1 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleSetPitchPreset(0.7)}
                          className={`flex-1 py-0.5 text-[9px] font-mono rounded-[2px] border transition cursor-pointer ${
                            Math.abs(ttsPitch - 0.7) < 0.08
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                          }`}
                        >
                          {t('audio_pitch_deep', localLanguage)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetPitchPreset(1.0)}
                          className={`flex-1 py-0.5 text-[9px] font-mono rounded-[2px] border transition cursor-pointer ${
                            Math.abs(ttsPitch - 1.0) < 0.08
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                          }`}
                        >
                          {t('audio_pitch_normal', localLanguage)}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSetPitchPreset(1.3)}
                          className={`flex-1 py-0.5 text-[9px] font-mono rounded-[2px] border transition cursor-pointer ${
                            Math.abs(ttsPitch - 1.3) < 0.08
                              ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400 font-bold'
                              : 'bg-white/5 hover:bg-white/10 text-white/70 border-white/10'
                          }`}
                        >
                          {t('audio_pitch_high', localLanguage)}
                        </button>
                      </div>
                    </div>

                    {/* Voice Engine Select */}
                    <div className="pt-2 border-t border-white/5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 font-mono text-white font-bold text-[11px]">
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>Công nghệ Giọng đọc</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = !useGeminiTts;
                            setUseGeminiTts(next);
                            aiExplanationService.setGeminiTtsEnabled(next);
                            soundFx.playClick();
                            vibrateTap();
                          }}
                          className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border transition cursor-pointer flex items-center gap-1 ${
                            useGeminiTts
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
                              : 'bg-white/10 text-white/60 border-white/15'
                          }`}
                        >
                          <span>{useGeminiTts ? '✦ Gemini AI TTS' : 'Mặc định'}</span>
                        </button>
                      </div>

                      {useGeminiTts ? (
                        <div className="space-y-1">
                          <label htmlFor="profile-gemini-voice-select" className="text-[10px] font-mono text-emerald-300 flex items-center gap-1">
                            <Mic className="w-2.5 h-2.5 text-emerald-400" />
                            <span>Giọng đọc Gemini AI (gemini-3.1-flash-tts)</span>
                          </label>
                          <select
                            id="profile-gemini-voice-select"
                            value={geminiVoice}
                            onChange={(e) => {
                              const v = e.target.value;
                              setGeminiVoice(v);
                              aiExplanationService.setGeminiVoice(v);
                              soundFx.playClick();
                              vibrateTap();
                            }}
                            className="w-full text-[11px] font-mono bg-black/40 border border-emerald-500/30 rounded-[2px] px-2 py-1 text-emerald-200 focus:outline-none focus:border-emerald-400 cursor-pointer appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2334d399' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: `right 0.5rem center`, backgroundRepeat: `no-repeat`, backgroundSize: `1.25em 1.25em`, paddingRight: `2rem` }}
                          >
                            <option value="Kore" className="bg-slate-900 text-white">Kore (Nữ - Cân bằng, truyền cảm)</option>
                            <option value="Puck" className="bg-slate-900 text-white">Puck (Nam - Trầm ấm, tự nhiên)</option>
                            <option value="Charon" className="bg-slate-900 text-white">Charon (Nam - Uy quyền, phát thanh)</option>
                            <option value="Fenrir" className="bg-slate-900 text-white">Fenrir (Nam - Năng động, sôi nổi)</option>
                            <option value="Zephyr" className="bg-slate-900 text-white">Zephyr (Nữ - Nhẹ nhàng, mượt mà)</option>
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-[10px] font-mono text-white/70">{t("audio_voice_select_title", localLanguage)}</span>
                            <span className="text-[9px] font-mono text-white/40">
                              {availableVoices.length > 0 ? `${availableVoices.length} voices` : ''}
                            </span>
                          </div>
                          <div className="relative">
                            <select
                              value={selectedVoiceURI}
                              onChange={handleVoiceSelectChange}
                              className="w-full text-[11px] font-mono bg-black/40 border border-white/15 rounded-[2px] px-2 py-1 text-white/90 focus:outline-none focus:border-emerald-400 cursor-pointer appearance-none"
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
                      )}
                    </div>
                  </div>

                  {/* Right: Subtitles, Smart Audio, Auto Read Toggles */}
                  <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3.5">
                    {/* Live Subtitles */}
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold text-white">{t("audio_subtitles_title", localLanguage)}</p>
                        <p className="text-[10px] text-[#B6A6D8]">{t("audio_subtitles_desc", localLanguage)}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={subtitlesEnabled}
                        aria-label="Phụ đề trực tiếp"
                        onClick={handleToggleSubtitles}
                        className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer shrink-0 ${
                          subtitlesEnabled ? 'bg-teal-500 justify-end' : 'bg-gray-700 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
                      </button>
                    </div>

                    {/* Ambient Noise Detection */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold text-white">{t("audio_ambient_title", localLanguage)}</p>
                        <p className="text-[10px] text-[#B6A6D8]">{t("audio_ambient_desc", localLanguage)}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={ambientListenerEnabled}
                        aria-label="Cảnh báo tiếng ồn môi trường"
                        onClick={handleToggleAmbientListener}
                        className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer shrink-0 ${
                          ambientListenerEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-700 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
                      </button>
                    </div>

                    {/* Auto Read Answers */}
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-mono font-bold text-white">{t("audio_auto_read_title", localLanguage)}</p>
                        <p className="text-[10px] text-[#B6A6D8]">{t("audio_auto_read_desc", localLanguage)}</p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={autoSpeakAnswer}
                        aria-label="Tự động đọc đáp án"
                        onClick={handleToggleAutoSpeak}
                        className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer shrink-0 ${
                          autoSpeakAnswer ? 'bg-emerald-500 justify-end' : 'bg-gray-700 justify-start'
                        }`}
                      >
                        <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

