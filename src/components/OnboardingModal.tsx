import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useEffect } from 'react';
import { UserInfo } from '../types';
import { Sparkles, ArrowRight, ShieldAlert, LogIn, Lock } from 'lucide-react';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { soundFx } from '../services/audioEffects';
import { t } from '../utils/i18n';
import { generate12DigitUID, generateAnonymizedUID } from '../utils/uidUtils';
import {
  vibrateTap,
  vibrateSubmit,
  vibrateSuccess,
  vibrateError,
  vibrateSelection
} from '../utils/hapticUtils';

const googleProvider = new GoogleAuthProvider();

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (user: UserInfo) => void;
  currentUser?: UserInfo | null;
  teams?: Array<{ id: string, name: string, color: string }>;
  teamModeActive?: boolean;
  randomTeamAssignment?: boolean;
}



export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  currentUser,
  teams,
  teamModeActive,
  randomTeamAssignment
}) => {
  const { localLanguage, toggleLanguage } = useLanguage();

  const [mode, setMode] = useState<'google' | 'register' | 'verify'>('google');
  const [googleUid, setGoogleUid] = useState<string>('');
  
  const [name, setName] = useState(currentUser?.name || '');
  const [mssv, setMssv] = useState(currentUser?.mssv || '');
  const [gender, setGender] = useState(currentUser?.gender || '');
  const [birthYear, setBirthYear] = useState('');
  const [anonymizedUid, setAnonymizedUid] = useState('');
  const [teamId, setTeamId] = useState(currentUser?.teamId || '');
  
  const [verifyId, setVerifyId] = useState('');
  const [pendingProfile, setPendingProfile] = useState<UserInfo | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setMode('google');
      setErrorMsg(null);
      setErrors({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (mode === 'register' && name.trim() && mssv.trim() && gender && birthYear) {
      setAnonymizedUid(prev => {
        if (!prev) return generate12DigitUID(name, mssv, gender, birthYear);
        return prev;
      });
    }
  }, [mode, name, mssv, gender, birthYear]);

  if (!isOpen) return null;


  const handleGoogleSignIn = async () => {
    soundFx.playClick();
    vibrateTap();
    setErrorMsg(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      setGoogleUid(user.uid);

      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const profile = userDoc.data() as UserInfo;
          if (profile.name && profile.mssv) {
            setPendingProfile(profile);
            setMode('verify');
            vibrateSuccess();
            setLoading(false);
            return;
          }
        }
      } catch (e) {
        console.error("Failed to fetch user from firestore", e);
      }
      
      let _mssv = '';
      if (user.email) {
        const match = user.email.match(/^(\d+)/);
        if (match) {
          _mssv = match[1];
        }
      }

      setName(user.displayName || (localLanguage === 'en' ? 'Audience' : 'Khán Giả'));
      setMssv(_mssv);
      setMode('register');
      vibrateTap();
      setErrorMsg(t("onboard_err_profile_incomplete", localLanguage));
    } catch (err: any) {
      console.error(err);
      vibrateError();
      setErrorMsg(t("onboard_err_login_fail", localLanguage) + err.message);
    } finally {
      setLoading(false);
    }
  };

  const validateRegister = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = t("onboard_err_name", localLanguage);
    if (!mssv.trim()) newErrors.mssv = t("onboard_err_mssv", localLanguage);
    if (!gender) newErrors.gender = t("onboard_err_gender", localLanguage);
    if (!birthYear || birthYear.length !== 4) newErrors.birthYear = t("onboard_err_birth", localLanguage);
    if (!anonymizedUid) newErrors.anonymizedUid = t("onboard_err_uid", localLanguage);
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    if (validateRegister()) {
      vibrateSubmit();
      onComplete({
        name: name.trim(),
        mssv: mssv.trim(),
        gender,
        birthYear,
        anonymizedUid: anonymizedUid.trim(),
        uid: googleUid, // Firestore doc ID will be Google UID
        registeredAt: Date.now()
      });
    } else {
      soundFx.playError();
      vibrateError();
    }
  };

  const handleVerifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundFx.playClick();
    if (!verifyId.trim()) {
      setErrors({ verifyId: t("onboard_err_verify_empty", localLanguage) });
      soundFx.playError();
      vibrateError();
      return;
    }
    
    const input = verifyId.trim().toUpperCase();
    if (!pendingProfile) return;

    if (
      input === pendingProfile.mssv.toUpperCase() ||
      (pendingProfile.anonymizedUid && input === pendingProfile.anonymizedUid.toUpperCase())
    ) {
      vibrateSuccess();
      onComplete(pendingProfile);
    } else {
      setErrors({ verifyId: t("onboard_err_verify_mismatch", localLanguage) });
      soundFx.playError();
      vibrateError();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0D0420]/80 backdrop-blur-md" />
      
      <div className="relative fluent-box rounded-[4px] p-6 sm:p-8 w-full max-w-md shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-horizon" />
        <div className="relative z-10 space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
              {t("onboard_join", localLanguage)} <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#F7CAC9] to-[#E2DBEC]">Beyond The Internet</span>
            </h2>
          </div>

          {errorMsg && mode !== 'google' && (
            <div className="flex items-start gap-2 text-rose-400 bg-white/10 backdrop-blur-md p-3 rounded-[4px] border border-rose-500/20 text-xs text-left">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{errorMsg}</p>
            </div>
          )}

          {mode === 'google' && (
            <div className="space-y-4 py-4">
              <p className="text-sm text-white/60 mb-6 leading-relaxed text-center">
                {t("onboard_google_desc", localLanguage)}
              </p>
              
              {errorMsg && (
                <div className="flex items-start gap-2 text-rose-400 bg-white/10 backdrop-blur-md p-3 rounded-[4px] border border-rose-500/20 text-xs text-left mb-4">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>{errorMsg}</p>
                </div>
              )}
              
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white hover:bg-gray-100 disabled:opacity-50 text-gray-900 font-bold rounded-[4px] px-4 py-4 transition-colors flex items-center justify-center gap-3 shadow-lg"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    {t("onboard_login_google", localLanguage)}
                  </>
                )}
              </button>
            </div>
          )}

          {mode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t("onboard_name", localLanguage)} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("onboard_name_ph", localLanguage)}
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  className="w-full fluent-box-nested focus:border-[#F7CAC9] rounded-[4px] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                />
                {errors.name && <p className="text-xs text-rose-400 mt-1">{errors.name}</p>}
              </div>
              
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t("onboard_mssv", localLanguage)} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("onboard_mssv_ph", localLanguage)}
                  value={mssv}
                  onChange={(e) => {
                    setMssv(e.target.value);
                    if (errors.mssv) setErrors({ ...errors, mssv: undefined });
                  }}
                  className="w-full fluent-box-nested focus:border-[#F7CAC9] rounded-[4px] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                />
                {errors.mssv && <p className="text-xs text-rose-400 mt-1">{errors.mssv}</p>}
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    {t("onboard_gender", localLanguage)} <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => {
                      setGender(e.target.value);
                      if (errors.gender) setErrors({ ...errors, gender: undefined });
                    }}
                    className="w-full fluent-box-nested focus:border-[#F7CAC9] rounded-[4px] px-4 py-3 text-sm text-white outline-none transition appearance-none"
                  >
                    <option value="" disabled>{t("onboard_gender_ph", localLanguage)}</option>
                    <option value="1">{t("onboard_gender_m", localLanguage)}</option>
                    <option value="2">{t("onboard_gender_f", localLanguage)}</option>
                    <option value="0">{t("onboard_gender_o", localLanguage)}</option>
                  </select>
                  {errors.gender && <p className="text-xs text-rose-400 mt-1">{errors.gender}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    {t("onboard_birth", localLanguage)} <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder={t("onboard_birth_ph", localLanguage)}
                    maxLength={4}
                    value={birthYear}
                    onChange={(e) => {
                      setBirthYear(e.target.value.replace(/\D/g, ''));
                      if (errors.birthYear) setErrors({ ...errors, birthYear: undefined });
                    }}
                    className="w-full fluent-box-nested focus:border-[#F7CAC9] rounded-[4px] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition"
                  />
                  {errors.birthYear && <p className="text-xs text-rose-400 mt-1">{errors.birthYear}</p>}
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-1.5 mt-2">
                  <label className="text-xs font-medium text-white/70">
                    {t("onboard_uid", localLanguage)}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (!name || !mssv || !gender || !birthYear) {
                        setErrors({ anonymizedUid: t("onboard_err_need_info", localLanguage) });
                        soundFx.playError();
                        vibrateError();
                        return;
                      }
                      soundFx.playClick();
                      vibrateSuccess();
                      setAnonymizedUid(generate12DigitUID(name, mssv, gender, birthYear));
                      if (errors.anonymizedUid) setErrors({ ...errors, anonymizedUid: undefined });
                    }}
                    className="text-[10px] text-[#F7CAC9] hover:text-[#FCEEEC] font-mono flex items-center gap-1 uppercase tracking-wider"
                  >
                    <Sparkles className="w-3 h-3" /> {t("onboard_gen_uid", localLanguage)}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    value={anonymizedUid}
                    readOnly
                    placeholder={t("onboard_uid_ph", localLanguage)}
                    className="w-full fluent-box-nested focus:border-[#F7CAC9] font-mono tracking-widest text-[#F7CAC9] rounded-[4px] px-4 py-3 text-sm outline-none transition"
                  />
                </div>
                {errors.anonymizedUid && <p className="text-xs text-rose-400 mt-1">{errors.anonymizedUid}</p>}
                <p className="text-[10px] text-white/40 mt-1">
                  {t("onboard_uid_hint", localLanguage)}
                </p>
              </div>
              {teamModeActive && randomTeamAssignment && (
                <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-[4px] text-center">
                  <p className="text-xs font-bold text-amber-300 uppercase">{t("onboard_team_random", localLanguage)}</p>
                </div>
              )}
              {teamModeActive && !randomTeamAssignment && teams && teams.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-white/70 uppercase tracking-wider">
                    {t("onboard_team_label", localLanguage)}
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {teams.map(tTeam => (
                      <button
                        key={tTeam.id}
                        type="button"
                        onClick={() => setTeamId(tTeam.id)}
                        className={`p-2 rounded border text-sm font-bold transition flex items-center justify-center ${teamId === tTeam.id ? 'bg-white text-black border-white' : 'border-white/20 text-white/70 hover:bg-white/10'}`}
                        style={teamId === tTeam.id ? { backgroundColor: tTeam.color, color: '#fff', borderColor: tTeam.color } : {}}
                      >
                        {tTeam.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full mt-6 bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black py-3.5 px-6 rounded-[4px] uppercase text-xs tracking-wider shadow-lg shadow-[#0D0420]/30 flex items-center justify-center gap-2 transition"
              >
                <span>{t("onboard_btn_submit", localLanguage)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {mode === 'verify' && (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <div className="flex justify-center mb-2">
                <div className="w-12 h-12 fluent-box-nested flex items-center justify-center rounded-[4px]">
                  <Lock className="w-6 h-6 text-amber-400" />
                </div>
              </div>
              <p className="text-sm text-white/80 mb-6 leading-relaxed text-center">
                {t("onboard_welcome", localLanguage).replace("{name}", pendingProfile?.name || '')}<br/>
                {t("onboard_verify_desc", localLanguage)}
              </p>
              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  {t("onboard_verify_id", localLanguage)} <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  placeholder={t("onboard_verify_id_ph", localLanguage)}
                  value={verifyId}
                  onChange={(e) => {
                    setVerifyId(e.target.value.toUpperCase());
                    if (errors.verifyId) setErrors({ ...errors, verifyId: undefined });
                  }}
                  className="w-full fluent-box-nested focus:border-amber-500 rounded-[4px] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition font-mono tracking-widest"
                />
                {errors.verifyId && <p className="text-xs text-rose-400 mt-1">{errors.verifyId}</p>}
              </div>
              <button
                type="submit"
                className="w-full mt-6 bg-amber-600 hover:bg-amber-500 text-white font-bold py-3.5 px-6 rounded-[4px] uppercase text-xs tracking-wider shadow-lg shadow-amber-900/30 flex items-center justify-center gap-2 transition"
              >
                <span>{t("onboard_verify_submit", localLanguage)}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
