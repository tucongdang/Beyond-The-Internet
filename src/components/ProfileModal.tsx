import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../hooks/useLanguage';
import { UserInfo, GameState, UserResponse } from '../types';
import { computeAudienceScoreFromResponses } from '../services/audienceScoringService';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { soundFx } from '../services/audioEffects';
import { aiExplanationService } from '../services/aiExplanationService';
import { SUPPORTED_TRANSLATION_LANGUAGES } from '../services/translationService';
import { t } from '../utils/i18n';
import { generate12DigitUID, getUserDisplayUid } from '../utils/uidUtils';
import {
  vibrateTap,
  vibrateSubmit,
  vibrateSuccess,
  vibrateError,
  vibrateSelection,
  isVibrationSupported,
  getHapticPreference,
  setHapticPreference,
  subscribeHapticPreference
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
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  allResponses,
  gameState
}) => {
  const { localLanguage, toggleLanguage, selectLanguage } = useLanguage();
  const [tab, setTab] = useState<'stats' | 'edit' | 'settings'>('stats');
  
  // Edit state
  const [name, setName] = useState(user.name);
  const [mssv, setMssv] = useState(user.mssv);
  const [gender, setGender] = useState(user.gender || '');
  const [birthYear, setBirthYear] = useState(user.birthYear || '');
  const [avatarSeed, setAvatarSeed] = useState(user.avatarSeed || user.uid);
  const [isSaving, setIsSaving] = useState(false);

  // Haptic feedback preference state
  const [hapticsEnabled, setHapticsEnabled] = useState<boolean>(getHapticPreference);
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
    const unsubTts = aiExplanationService.subscribeTtsVolume((vol) => setTtsVolume(vol));
    const unsubPitch = aiExplanationService.subscribeTtsPitch((pitch) => setTtsPitch(pitch));
    const unsubVoice = aiExplanationService.subscribeSelectedVoice((uri) => setSelectedVoiceURI(uri));
    const unsubSubs = ambientNoiseService.subscribeSubtitles((enabled) => setSubtitlesEnabled(enabled));

    return () => {
      unsubSfx();
      unsubTts();
      unsubPitch();
      unsubVoice();
      unsubSubs();
    };
  }, []);

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
    return subscribeHapticPreference((enabled) => {
      setHapticsEnabled(enabled);
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setName(user.name);
      setMssv(user.mssv);
      setGender(user.gender || '');
      setBirthYear(user.birthYear || '');
      setAvatarSeed(user.avatarSeed || user.uid);
      setTab('stats');
    }
  }, [isOpen, user]);

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
        name,
        mssv,
        gender,
        birthYear,
        anonymizedUid,
        avatarSeed
      };
      
      const app = getApps()[0];
      const db = getFirestore(app, (firebaseConfig as any).firestoreDatabaseId || '(default)');
      await setDoc(doc(db, 'users', user.uid), updatedUser, { merge: true });
      
      onUpdateUser(updatedUser);
      vibrateSuccess();
      setTab('stats');
    } catch (err) {
      console.error(err);
      soundFx.playError();
      vibrateError();
    } finally {
      setIsSaving(false);
    }
  };

  const generateNewAvatar = () => {
    soundFx.playClick();
    vibrateTap();
    setAvatarSeed(Math.random().toString(36).substring(7));
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
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fluent-dialog-overlay animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="fluent-dialog w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="fluent-dialog-header">
          <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
            <User className="w-5 h-5 text-[#F7CAC9]" /> {t("prof_title", localLanguage)}
          </h2>
          <button
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-[2px] transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Avatar Section */}
        <div className="p-5 flex flex-col items-center border-b border-white/5 shrink-0 fluent-box-nested">
          <div className="relative group">
            <div className="w-20 h-20 rounded-[2px] bg-white/10 border-2 border-purple-500/50 flex items-center justify-center overflow-hidden shadow-xl">
              <img 
                src={`https://api.dicebear.com/7.x/bottts/svg?seed=${avatarSeed}&backgroundColor=transparent`} 
                alt="Avatar" 
                className="w-16 h-16"
              />
            </div>
            {tab === 'edit' && (
              <button 
                onClick={generateNewAvatar}
                className="absolute -bottom-2 -right-2 p-2 bg-[#F7CAC9] text-[#190839] hover:brightness-110 rounded-[2px] shadow-lg transition transform hover:scale-105 active:scale-95 cursor-pointer"
                title={localLanguage !== 'vi' ? 'Change avatar' : 'Đổi ảnh đại diện'}
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="mt-3 text-center">
            <h3 className="text-lg font-bold text-white leading-tight">{user.name}</h3>
            <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
              <span className="fluent-badge fluent-badge-success">
                MSSV: {user.mssv}
              </span>
              <span className="fluent-badge fluent-badge-accent">
                UID: {user.anonymizedUid || user.uid}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex px-4 pt-3 gap-2 shrink-0 border-b border-white/10 bg-white/[0.02]">
          <button 
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              setTab('stats');
            }}
            className={`px-3.5 py-2 rounded-t-[2px] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'stats' 
                ? 'bg-white/10 text-white border-b-2 border-[#F7CAC9]' 
                : 'text-white/40 hover:bg-white/5'
            }`}
          >
            <Activity className="w-4 h-4 text-[#F7CAC9]" /> {t("prof_stats", localLanguage)}
          </button>
          <button 
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              setTab('edit');
            }}
            className={`px-3.5 py-2 rounded-t-[2px] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'edit' 
                ? 'bg-white/10 text-white border-b-2 border-[#F7CAC9]' 
                : 'text-white/40 hover:bg-white/5'
            }`}
          >
            <Edit3 className="w-4 h-4 text-purple-300" /> {t("prof_update", localLanguage)}
          </button>
          <button 
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              setTab('settings');
            }}
            className={`px-3.5 py-2 rounded-t-[2px] text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'settings' 
                ? 'bg-white/10 text-white border-b-2 border-[#F7CAC9]' 
                : 'text-white/40 hover:bg-white/5'
            }`}
          >
            <Sliders className="w-4 h-4 text-sky-300" /> {t("profile_settings_tab", localLanguage)}
          </button>
        </div>

        {/* Content */}
        <div className="fluent-dialog-body space-y-5">
          {tab === 'stats' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="fluent-box-nested border border-purple-500/30 rounded-[2px] p-4 text-center">
                  <div className="text-[#F7CAC9] text-[10px] font-mono font-bold uppercase tracking-wider mb-1">{t("profile_total_score", localLanguage)}</div>
                  <div className="text-3xl font-black text-white font-mono">{scoreState.totalScore}</div>
                </div>
                <div className="fluent-box-nested border border-emerald-500/30 rounded-[2px] p-4 text-center">
                  <div className="text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-wider mb-1">{t("profile_correct_answers", localLanguage)}</div>
                  <div className="text-3xl font-black text-white font-mono">{scoreState.correctAnswersCount}<span className="text-sm text-emerald-500/50">/{scoreState.totalAnswered}</span></div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-bold text-white/50 uppercase tracking-widest font-mono mb-2">{t("profile_score_breakdown", localLanguage)}</h4>
                
                <div className="flex justify-between items-center p-3 fluent-box-nested rounded-[2px] border border-white/5">
                  <span className="text-sm text-white/80 font-medium">{t("prof_stat_kd", localLanguage)}</span>
                  <span className="text-base font-bold text-[#F7CAC9] font-mono">+{scoreState.scoreBreakdown.round1}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 fluent-box-nested rounded-[2px] border border-white/5">
                  <span className="text-sm text-white/80 font-medium">{t("prof_stat_vcnv", localLanguage)}</span>
                  <span className="text-base font-bold text-[#F7CAC9] font-mono">+{scoreState.scoreBreakdown.round2}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 fluent-box-nested rounded-[2px] border border-white/5">
                  <span className="text-sm text-white/80 font-medium">{t("prof_stat_tt", localLanguage)}</span>
                  <span className="text-base font-bold text-[#F7CAC9] font-mono">+{scoreState.scoreBreakdown.round3}</span>
                </div>
                
                <div className="flex justify-between items-center p-3 fluent-box-nested rounded-[2px] border border-white/5">
                  <span className="text-sm text-white/80 font-medium">{t("prof_stat_vd", localLanguage)}</span>
                  <span className="text-base font-bold text-[#F7CAC9] font-mono">+{scoreState.scoreBreakdown.round4}</span>
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
                      navigator.clipboard.writeText(user.anonymizedUid || user.uid);
                      soundFx.playClick();
                      vibrateTap();
                    }}
                    className="fluent-btn px-2.5 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-[2px] text-[11px] font-bold font-mono transition active:scale-95 cursor-pointer shadow"
                  >
                    {localLanguage !== 'vi' ? 'Copy Code' : 'Sao Chép Mã'}
                  </button>
                </div>
                <div className="text-sm font-mono font-bold text-white fluent-box-nested border border-white/10 px-3 py-2 rounded-[2px] tracking-wider select-all">
                  {user.anonymizedUid || user.uid}
                </div>
                <p className="text-[10px] text-purple-200/60 leading-tight">
                  {localLanguage !== 'vi' ? '💡 12-digit unique identifier format: 4 Student ID + 2 Name chars + Gender + 2 Birth Year + 3 Random.' : '💡 Mã 12 số định danh duy nhất theo chuẩn: 4 số MSSV + 2 ký tự Tên + Giới tính + 2 số Năm sinh + 3 số Ngẫu nhiên.'}
                </p>
              </div>

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

              <div className="grid grid-cols-2 gap-3">
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

                {/* Language Select Dropdown */}
                <select
                  value={localLanguage}
                  onChange={(e) => {
                    selectLanguage(e.target.value);
                    soundFx.playClick();
                    vibrateTap();
                  }}
                  className="fluent-input text-xs font-mono py-1.5 px-2.5 rounded-[2px] bg-[#190839] text-white border border-white/20 cursor-pointer focus:outline-none focus:border-sky-400"
                >
                  <option value="vi">🇻🇳 Tiếng Việt (Gốc)</option>
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
                <div className="w-8 h-8 rounded-[2px] bg-white/10 text-amber-300 border border-amber-500/30 flex items-center justify-center">
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

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleHighContrast}
                className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                  highContrastEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-700 justify-start'
                }`}
                title={highContrastEnabled ? t("prof_dark_off", localLanguage) : t("prof_dark_on", localLanguage)}
              >
                <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
              </button>
            </div>
          </div>

          {/* Haptic Vibration Settings Card */}
          <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[2px] bg-white/10 text-purple-300 border border-purple-500/30 flex items-center justify-center">
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

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={handleToggleHaptics}
                className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                  hapticsEnabled ? 'bg-purple-600 justify-end' : 'bg-gray-700 justify-start'
                }`}
                title={hapticsEnabled ? t("prof_haptic_off", localLanguage) : t("prof_haptic_on", localLanguage)}
              >
                <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
              </button>
            </div>

            {hapticsSupported && hapticsEnabled && (
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <span className="text-[11px] text-[#B6A6D8]/80 italic">
                  {localLanguage !== 'vi' ? 'Test haptic feedback on your device:' : 'Kiểm tra phản hồi xúc giác trên thiết bị:'}
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
            )}
          </div>

          {/* Audio & Voice Settings Card */}
          <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-white/10">
              <div className="w-8 h-8 rounded-[2px] bg-sky-500/15 border border-sky-500/30 text-sky-300 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{t("audio_settings_title", localLanguage)}</span>
                </h4>
                <p className="text-[10px] text-[#B6A6D8]">
                  {t("audio_settings_desc", localLanguage)}
                </p>
              </div>
            </div>

            {/* 1. Sound FX Volume */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {sfxEnabled && sfxVolume > 0 ? (
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" />
                  ) : (
                    <VolumeX className="w-3.5 h-3.5 text-white/40" />
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
                  className="shrink-0 px-2 py-1 text-[10px] font-mono rounded-[2px] bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                >
                  <Play className="w-2.5 h-2.5 text-sky-400" />
                  <span>Thử</span>
                </button>
              </div>
            </div>

            {/* 2. TTS AI Voice Volume */}
            <div className="space-y-2 pt-2 border-t border-white/5">
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

              {/* Pitch Slider in Profile */}
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
                {/* Presets */}
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

              {/* System Voice Selection in Profile */}
              <div className="pt-2 border-t border-white/5 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 font-mono text-white font-bold text-[11px]">
                    <Mic className="w-3 h-3 text-emerald-400" />
                    <span>{t("audio_voice_select_title", localLanguage)}</span>
                  </div>
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
            </div>

            {/* 3. Live Subtitles */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono font-bold text-white">{t("audio_subtitles_title", localLanguage)}</p>
                <p className="text-[10px] text-[#B6A6D8]">{t("audio_subtitles_desc", localLanguage)}</p>
              </div>
              <button
                type="button"
                onClick={handleToggleSubtitles}
                className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                  subtitlesEnabled ? 'bg-teal-500 justify-end' : 'bg-gray-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
              </button>
            </div>

            {/* 4. Ambient Noise Detection */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono font-bold text-white">{t("audio_ambient_title", localLanguage)}</p>
                <p className="text-[10px] text-[#B6A6D8]">{t("audio_ambient_desc", localLanguage)}</p>
              </div>
              <button
                type="button"
                onClick={handleToggleAmbientListener}
                className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                  ambientListenerEnabled ? 'bg-amber-500 justify-end' : 'bg-gray-700 justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
              </button>
            </div>

            {/* 5. Auto Read Answers */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div>
                <p className="text-xs font-mono font-bold text-white">{t("audio_auto_read_title", localLanguage)}</p>
                <p className="text-[10px] text-[#B6A6D8]">{t("audio_auto_read_desc", localLanguage)}</p>
              </div>
              <button
                type="button"
                onClick={handleToggleAutoSpeak}
                className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
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
      </div>
    </div>,
    document.body
  );
};

