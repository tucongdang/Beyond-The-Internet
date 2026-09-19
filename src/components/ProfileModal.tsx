import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../hooks/useLanguage';
import { UserInfo, GameState, UserResponse } from '../types';
import { computeAudienceScoreFromResponses } from '../services/audienceScoringService';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getApp, getApps } from 'firebase/app';
import firebaseConfig from '../../firebase-applet-config.json';
import { soundFx } from '../services/audioEffects';
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
import { X, User, Globe, BarChart2, Edit3, Save, Activity, Camera, Smartphone, Vibrate, Check, Sliders, Sparkles, Contrast } from 'lucide-react';

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
  const { localLanguage, toggleLanguage } = useLanguage();
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
              <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[2px] bg-white/10 text-blue-300 border border-blue-500/30 flex items-center justify-center">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                  <span>{t("profile_language_settings", localLanguage)}</span>
                </h4>
                <p className="text-[10px] text-[#B6A6D8]">
                  {localLanguage !== 'vi' ? t("profile_language_en", localLanguage) : t("profile_language_vi", localLanguage)}
                </p>
              </div>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={handleToggleLanguage}
              className={`w-11 h-6 flex items-center rounded-[2px] p-1 transition duration-300 cursor-pointer ${
                localLanguage !== 'vi' ? 'bg-blue-500 justify-end' : 'bg-gray-700 justify-start'
              }`}
              title={t("prof_lang", localLanguage)}
            >
              <div className="w-4 h-4 rounded-[2px] bg-white shadow-md transform transition" />
            </button>
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
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};

