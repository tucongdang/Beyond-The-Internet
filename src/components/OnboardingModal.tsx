import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { UserInfo } from '../types';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft,
  ShieldAlert, 
  LogIn, 
  LogOut,
  Lock, 
  UserPlus, 
  Search, 
  KeyRound, 
  CheckCircle2, 
  Clock, 
  Eye, 
  EyeOff, 
  X, 
  Users, 
  User, 
  ShieldCheck, 
  Fingerprint, 
  Check, 
  HelpCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Mail,
  Send,
  ExternalLink,
  Zap
} from 'lucide-react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, removeUndefined } from '../firebase';
import { soundFx } from '../services/audioEffects';
import { t } from '../utils/i18n';
import { generate12DigitUID } from '../utils/uidUtils';
import { CaptchaChallenge } from './CaptchaChallenge';
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
  teams?: Array<{ id: string; name: string; color: string }>;
  teamModeActive?: boolean;
  randomTeamAssignment?: boolean;
  isInline?: boolean;
  onExit?: () => void;
  onClose?: () => void;
}

type AudienceAuthTab = 'LOGIN' | 'REGISTER' | 'EMAIL_VERIFY' | 'FORGOT_PASSWORD' | 'ACTIVATE' | 'CHECK_STATUS' | 'QUICK_ACCESS' | 'GOOGLE_VERIFY';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  currentUser,
  teams,
  teamModeActive,
  randomTeamAssignment,
  isInline = false,
  onExit,
  onClose
}) => {
  const { localLanguage } = useLanguage();
  const [activeTab, setActiveTab] = useState<AudienceAuthTab>('LOGIN');

  // --- Login State ---
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginCaptchaId, setLoginCaptchaId] = useState('');
  const [loginCaptchaAnswer, setLoginCaptchaAnswer] = useState('');

  // --- Register State ---
  const [regName, setRegName] = useState(currentUser?.name || '');
  const [regMssv, setRegMssv] = useState(currentUser?.mssv || '');
  const [regEmail, setRegEmail] = useState(currentUser?.email || '');
  const [regUsername, setRegUsername] = useState('');
  const [regGender, setRegGender] = useState(currentUser?.gender || '1');
  const [regBirthYear, setRegBirthYear] = useState(currentUser?.birthYear || '2004');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regAnonymizedUid, setRegAnonymizedUid] = useState(currentUser?.anonymizedUid || '');
  const [regTeamId, setRegTeamId] = useState(currentUser?.teamId || '');
  const [regNote, setRegNote] = useState('');
  const [regCaptchaId, setRegCaptchaId] = useState('');
  const [regCaptchaAnswer, setRegCaptchaAnswer] = useState('');
  const [googleLinkedUid, setGoogleLinkedUid] = useState<string | null>(null);
  const [googleLinkedEmail, setGoogleLinkedEmail] = useState<string | null>(null);

  // --- Firebase Email Verification State ---
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState<string>('');
  const [pendingVerifyUser, setPendingVerifyUser] = useState<UserInfo | null>(null);
  const [cachedAuthPassword, setCachedAuthPassword] = useState<string>('');
  const [verifyPasswordInput, setVerifyPasswordInput] = useState<string>('');
  const [showVerifyPassword, setShowVerifyPassword] = useState<boolean>(false);
  const [needPasswordForResend, setNeedPasswordForResend] = useState<boolean>(false);
  const [isCheckingVerification, setIsCheckingVerification] = useState(false);
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [quickActivationCode, setQuickActivationCode] = useState('');
  const [isQuickActivating, setIsQuickActivating] = useState(false);

  // --- Google Verification State (MSSV & 12-Digit UID Confirmation) ---
  const [googleAuthData, setGoogleAuthData] = useState<{
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string | null;
  } | null>(null);
  const [gVerName, setGVerName] = useState('');
  const [gVerMssv, setGVerMssv] = useState('');
  const [gVerGender, setGVerGender] = useState('1');
  const [gVerBirthYear, setGVerBirthYear] = useState('2004');
  const [gVerAnonymizedUid, setGVerAnonymizedUid] = useState('');
  const [gVerTeamId, setGVerTeamId] = useState('');

  // --- Check Status State ---
  const [checkQuery, setCheckQuery] = useState('');
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // --- Quick Access State (MSSV + 12-Digit UID) ---
  const [quickMssv, setQuickMssv] = useState('');
  const [quickUid, setQuickUid] = useState('');

  // --- Forgot Password State ---
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [forgotResetCode, setForgotResetCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotGeneratedCode, setForgotGeneratedCode] = useState<string | null>(null);
  const [forgotCaptchaId, setForgotCaptchaId] = useState('');
  const [forgotCaptchaAnswer, setForgotCaptchaAnswer] = useState('');

  // --- Account Activation State ---
  const [actIdentifier, setActIdentifier] = useState('');
  const [actCode, setActCode] = useState('');
  const [actCaptchaId, setActCaptchaId] = useState('');
  const [actCaptchaAnswer, setActCaptchaAnswer] = useState('');
  const [actResentCode, setActResentCode] = useState<string | null>(null);

  // --- General UI State ---
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Auto-generate 12-digit UID on register inputs
  useEffect(() => {
    if (activeTab === 'REGISTER' && regName.trim() && regMssv.trim() && regGender && regBirthYear.length === 4) {
      const generated = generate12DigitUID(regName, regMssv, regGender, regBirthYear);
      setRegAnonymizedUid(generated);
    }
  }, [activeTab, regName, regMssv, regGender, regBirthYear]);

  // Auto-generate 12-digit UID on Google Verify inputs
  useEffect(() => {
    if (activeTab === 'GOOGLE_VERIFY' && gVerName.trim() && gVerMssv.trim() && gVerGender && gVerBirthYear.length === 4) {
      const generated = generate12DigitUID(gVerName, gVerMssv, gVerGender, gVerBirthYear);
      setGVerAnonymizedUid(generated);
    }
  }, [activeTab, gVerName, gVerMssv, gVerGender, gVerBirthYear]);

  // Cooldown countdown for resending verification email
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Stable CAPTCHA Callbacks
  const handleLoginCaptchaChange = useCallback((id: string, val: string) => {
    setLoginCaptchaId(id);
    setLoginCaptchaAnswer(val);
  }, []);

  const handleRegCaptchaChange = useCallback((id: string, val: string) => {
    setRegCaptchaId(id);
    setRegCaptchaAnswer(val);
  }, []);

  const handleForgotCaptchaChange = useCallback((id: string, val: string) => {
    setForgotCaptchaId(id);
    setForgotCaptchaAnswer(val);
  }, []);

  const handleActCaptchaChange = useCallback((id: string, val: string) => {
    setActCaptchaId(id);
    setActCaptchaAnswer(val);
  }, []);

  // Clear messages when switching tabs
  const handleTabChange = (tab: AudienceAuthTab) => {
    vibrateSelection();
    soundFx.playClick();
    setActiveTab(tab);
    setErrorMsg(null);
    setSuccessMsg(null);
    setErrors({});
  };

  // -------------------------------------------------------------
  // Firebase Email Verification Check and Resend Handlers
  // -------------------------------------------------------------
  // -------------------------------------------------------------
  // Firebase Email Verification Check, Direct Activation and Resend Handlers
  // -------------------------------------------------------------
  const handleCheckEmailVerification = async () => {
    soundFx.playClick();
    vibrateTap();
    setIsCheckingVerification(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = (pendingVerifyEmail || regEmail || (loginIdentifier.includes('@') ? loginIdentifier : '')).trim().toLowerCase();
    const id = pendingVerifyUser?.mssv || loginIdentifier.trim() || targetEmail;

    try {
      if (auth && auth.currentUser) {
        try {
          await auth.currentUser.reload();
        } catch (reloadErr) {
          console.warn('[Email Check] Firebase reload notice:', reloadErr);
        }
      }

      let isVerified = Boolean(auth && auth.currentUser?.emailVerified);

      // If Firebase Auth does not report verified yet, verify with backend directly
      if (!isVerified) {
        try {
          const res = await fetch('/api/audience/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: pendingVerifyUser?.uid || auth?.currentUser?.uid,
              email: targetEmail,
              identifier: id
            })
          });
          const data = await res.json();
          if (res.ok && data.success) {
            isVerified = true;
          }
        } catch (serverErr) {
          console.warn('Server verify-email fallback notice:', serverErr);
        }
      }

      if (isVerified) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();

        // Update verification status on server
        try {
          await fetch('/api/audience/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: pendingVerifyUser?.uid || auth?.currentUser?.uid,
              email: targetEmail,
              identifier: id
            })
          });
        } catch (serverErr) {
          console.warn('Server verify-email call notice:', serverErr);
        }

        // Mirror update to Firestore
        if (db && pendingVerifyUser) {
          try {
            await setDoc(
              doc(db, 'users', pendingVerifyUser.uid),
              removeUndefined({
                ...pendingVerifyUser,
                emailVerified: true
              }),
              { merge: true }
            );
          } catch (e) {
            console.warn('Firestore mirror sync note:', e);
          }
        }

        const completedUser: UserInfo = {
          ...(pendingVerifyUser || {
            uid: auth?.currentUser?.uid || `aud_${Date.now()}`,
            name: loginIdentifier.trim() || 'Audience',
            mssv: id,
            gender: '1',
            birthYear: '2004',
            anonymizedUid: generate12DigitUID(loginIdentifier.trim() || 'Audience', id, '1', '2004')
          }),
          emailVerified: true
        };

        setSuccessMsg(
          localLanguage !== 'vi'
            ? 'Email verification successful! Entering arena...'
            : 'Xác thực tài khoản thành công! Đang chuyển hướng vào sàn đấu BTI 2026...'
        );

        setTimeout(() => {
          onComplete(completedUser);
        }, 800);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(
          localLanguage !== 'vi'
            ? 'Firebase has not confirmed your email verification yet. You can click "⚡ Instant Activation" below to enter directly!'
            : 'Firebase chưa ghi nhận liên kết xác thực. Bạn có thể bấm nút "⚡ Kích Hoạt Nhanh & Vào Sàn Đấu Ngay" bên dưới để vào trực tiếp!'
        );
      }
    } catch (err: any) {
      console.error('[Email Verification Check] Error:', err);
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Error checking verification status.' : 'Lỗi kiểm tra trạng thái xác thực từ Firebase.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Direct 1-Click Activation Bypass: Guarantees audience are NEVER locked out during live gameshow
  const handleDirectActivate = async () => {
    soundFx.playClick();
    vibrateTap();
    setIsCheckingVerification(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = (pendingVerifyEmail || regEmail || (loginIdentifier.includes('@') ? loginIdentifier : '')).trim().toLowerCase();
    const id = pendingVerifyUser?.mssv || loginIdentifier.trim() || targetEmail;

    try {
      const res = await fetch('/api/audience/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: pendingVerifyUser?.uid || auth?.currentUser?.uid,
          email: targetEmail,
          identifier: id
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();

        const completedUser: UserInfo = {
          uid: data.user.uid,
          name: data.user.name,
          mssv: data.user.mssv,
          gender: data.user.gender,
          birthYear: data.user.birthYear,
          anonymizedUid: data.user.anonymizedUid,
          teamId: data.user.teamId,
          teamName: data.user.teamName,
          email: data.user.email || targetEmail,
          emailVerified: true,
          registeredAt: data.user.registeredAt
        };

        if (db) {
          try {
            await setDoc(doc(db, 'users', completedUser.uid), removeUndefined(completedUser), { merge: true });
          } catch (e) {
            console.warn('Firestore mirror sync note:', e);
          }
        }

        setSuccessMsg(
          localLanguage !== 'vi'
            ? 'Account activated successfully! Entering arena...'
            : 'Kích hoạt tài khoản thành công! Đang chuyển hướng vào sàn đấu BTI 2026...'
        );

        setTimeout(() => {
          onComplete(completedUser);
        }, 800);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Activation failed.' : 'Kích hoạt không thành công.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  // Quick Activation with 6-Digit Code or Master Key BTI2026
  const handleQuickCodeActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!quickActivationCode.trim()) return;

    soundFx.playClick();
    vibrateTap();
    setIsQuickActivating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const id = pendingVerifyUser?.mssv || loginIdentifier.trim() || pendingVerifyEmail;

    try {
      const res = await fetch('/api/audience/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: id,
          activationCode: quickActivationCode.trim(),
          captchaId: 'bypass_direct',
          captchaAnswer: 'bypass_direct'
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();

        const completedUser: UserInfo = {
          uid: data.user.uid,
          name: data.user.name,
          mssv: data.user.mssv,
          gender: data.user.gender,
          birthYear: data.user.birthYear,
          anonymizedUid: data.user.anonymizedUid,
          teamId: data.user.teamId,
          teamName: data.user.teamName,
          email: data.user.email,
          emailVerified: true,
          registeredAt: data.user.registeredAt
        };

        if (db) {
          try {
            await setDoc(doc(db, 'users', completedUser.uid), removeUndefined(completedUser), { merge: true });
          } catch (e) {
            console.warn('Firestore mirror note:', e);
          }
        }

        setSuccessMsg(
          localLanguage !== 'vi'
            ? 'Account activated successfully! Entering arena...'
            : 'Kích hoạt tài khoản thành công! Đang chuyển hướng vào sàn đấu BTI 2026...'
        );

        setTimeout(() => {
          onComplete(completedUser);
        }, 800);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Invalid activation code.' : 'Mã kích hoạt không chính xác.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsQuickActivating(false);
    }
  };

  const handleResendVerificationEmail = async () => {
    if (resendCooldown > 0) return;
    soundFx.playClick();
    vibrateTap();
    setIsResendingEmail(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const targetEmail = (pendingVerifyEmail || regEmail || (loginIdentifier.includes('@') ? loginIdentifier : '')).trim().toLowerCase();
    const pwd = verifyPasswordInput || cachedAuthPassword || regPassword || loginPassword;

    try {
      let activeUser = auth?.currentUser || null;

      // 1. Try Firebase Auth flow if configured
      if (auth && (!activeUser || (activeUser.email && activeUser.email.toLowerCase() !== targetEmail))) {
        if (targetEmail && pwd) {
          try {
            const cred = await signInWithEmailAndPassword(auth, targetEmail, pwd);
            activeUser = cred.user;
          } catch (signInErr: any) {
            console.warn('[Resend Email] Sign-in check:', signInErr?.code || signInErr);
            // If user not in Firebase Auth, attempt to create in Firebase Auth
            if (signInErr.code === 'auth/user-not-found' || signInErr.code === 'auth/invalid-credential') {
              try {
                const newCred = await createUserWithEmailAndPassword(auth, targetEmail, pwd);
                activeUser = newCred.user;
              } catch (createErr: any) {
                console.warn('[Resend Email] Create user fallback:', createErr?.code || createErr);
                if (createErr.code === 'auth/email-already-in-use') {
                  setNeedPasswordForResend(true);
                  soundFx.playError();
                  vibrateError();
                  setErrorMsg(
                    localLanguage !== 'vi'
                      ? 'Incorrect password. Please enter your account password below to authorize sending the email.'
                      : 'Mật khẩu chưa chính xác. Vui lòng nhập đúng mật khẩu tài khoản bên dưới để gửi email xác thực.'
                  );
                  setIsResendingEmail(false);
                  return;
                }
              }
            }
          }
        }
      }

      // 2. If Firebase user is available, send email verification
      let emailSentViaFirebase = false;
      if (activeUser) {
        try {
          await sendEmailVerification(activeUser);
          emailSentViaFirebase = true;
          setResendCooldown(60);
          setNeedPasswordForResend(false);
          soundFx.playPacingChime('complete');
          vibrateSuccess();
          setSuccessMsg(
            localLanguage !== 'vi'
              ? `Verification email resent to ${targetEmail}. Please check your inbox or spam folder.`
              : `Đã gửi lại email xác thực thành công tới ${targetEmail}. Vui lòng kiểm tra hộp thư hoặc mục Spam.`
          );
        } catch (emailSendErr: any) {
          console.warn('[Resend Email] sendEmailVerification note:', emailSendErr?.code || emailSendErr);
          if (emailSendErr.code === 'auth/too-many-requests') {
            soundFx.playError();
            vibrateError();
            setErrorMsg(
              localLanguage !== 'vi'
                ? 'Too many requests sent. Please wait about 1 minute before requesting another email.'
                : 'Quá nhiều yêu cầu gửi email trong thời gian ngắn. Vui lòng đợi 1 phút trước khi thử lại.'
            );
            setIsResendingEmail(false);
            return;
          }
        }
      }

      // 3. If Firebase email could not be sent (or user not created in Firebase), generate server activation code!
      if (!emailSentViaFirebase) {
        try {
          const res = await fetch('/api/audience/resend-activation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: pendingVerifyUser?.mssv || loginIdentifier.trim() || targetEmail,
              captchaId: 'bypass_resend',
              captchaAnswer: 'bypass_resend'
            })
          });
          const data = await res.json();
          if (res.ok && data.success && data.activationCode) {
            setNeedPasswordForResend(false);
            setResendCooldown(30);
            soundFx.playPacingChime('complete');
            vibrateSuccess();
            setSuccessMsg(
              localLanguage !== 'vi'
                ? `Backup activation code: ${data.activationCode}. You can enter it below or click "⚡ Instant Activation" to enter now!`
                : `Đã tạo mã kích hoạt dự phòng: ${data.activationCode}. Hoặc bạn có thể bấm nút "⚡ Kích Hoạt Nhanh" bên dưới để vào sàn đấu ngay!`
            );
          } else {
            setNeedPasswordForResend(false);
            soundFx.playClick();
            setSuccessMsg(
              localLanguage !== 'vi'
                ? 'You can click "⚡ Instant Activation & Enter Arena" below to access without waiting for email!'
                : 'Bạn có thể bấm nút "⚡ Kích Hoạt Nhanh & Vào Sàn Đấu Ngay" bên dưới để tham gia trực tiếp không cần chờ email!'
            );
          }
        } catch {
          setNeedPasswordForResend(false);
          setSuccessMsg(
            localLanguage !== 'vi'
              ? 'You can click "⚡ Instant Activation & Enter Arena" below to access directly!'
              : 'Bạn có thể bấm nút "⚡ Kích Hoạt Nhanh & Vào Sàn Đấu Ngay" bên dưới để vào sàn đấu ngay!'
          );
        }
      }
    } catch (err: any) {
      console.error('[Resend Email Verification] Error:', err);
      soundFx.playError();
      vibrateError();
      setErrorMsg(
        localLanguage !== 'vi'
          ? 'Notice: You can click "⚡ Instant Activation & Enter Arena" below to enter directly.'
          : 'Gợi ý: Bạn có thể bấm nút "⚡ Kích Hoạt Nhanh & Vào Sàn Đấu Ngay" bên dưới để vào sàn đấu ngay.'
      );
    } finally {
      setIsResendingEmail(false);
    }
  };

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // 1. Handle Standard Audience Login (MSSV / Username + Password + CAPTCHA)
  // -------------------------------------------------------------
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginIdentifier.trim() || !loginPassword) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter MSSV/Username and Password.' : 'Vui lòng nhập MSSV/Tên đăng nhập và Mật khẩu.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!loginCaptchaAnswer.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please solve the CAPTCHA anti-bot challenge.' : 'Vui lòng giải bài toán bảo vệ CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/audience/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: loginIdentifier.trim(),
          password: loginPassword,
          captchaId: loginCaptchaId,
          captchaAnswer: loginCaptchaAnswer.trim()
        })
      });

      const data = await res.json();

      // Check if user requires email verification before access
      if (!res.ok && data.requiresEmailVerification) {
        soundFx.playError();
        vibrateError();
        const verifyEmail = data.email || (loginIdentifier.includes('@') ? loginIdentifier.trim() : '');
        setPendingVerifyEmail(verifyEmail);
        setCachedAuthPassword(loginPassword);
        setVerifyPasswordInput(loginPassword);
        setPendingVerifyUser({
          uid: data.user?.uid || `aud_${Date.now()}`,
          name: data.user?.name || loginIdentifier.trim(),
          mssv: data.user?.mssv || loginIdentifier.trim(),
          gender: data.user?.gender,
          birthYear: data.user?.birthYear,
          anonymizedUid: data.user?.anonymizedUid,
          teamId: data.user?.teamId,
          teamName: data.user?.teamName,
          email: verifyEmail,
          emailVerified: false,
          registeredAt: data.user?.registeredAt
        });

        // Sign in with Firebase Auth if possible to enable reload()
        if (auth && verifyEmail && loginPassword) {
          try {
            await signInWithEmailAndPassword(auth, verifyEmail, loginPassword);
          } catch (fbSignInErr) {
            console.warn('Firebase login attempt for verification check:', fbSignInErr);
          }
        }

        setActiveTab('EMAIL_VERIFY');
        setErrorMsg(
          data.error ||
          (localLanguage !== 'vi'
            ? 'Your account requires email verification. Please click the link sent from Firebase.'
            : 'Tài khoản của bạn chưa được xác thực email. Vui lòng bấm vào liên kết trong email gửi từ Firebase.')
        );
        return;
      }

      if (res.ok && data.success && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        const userObj: UserInfo = {
          uid: data.user.uid,
          name: data.user.name,
          mssv: data.user.mssv,
          gender: data.user.gender,
          birthYear: data.user.birthYear,
          anonymizedUid: data.user.anonymizedUid,
          teamId: data.user.teamId,
          teamName: data.user.teamName,
          email: data.user.email,
          emailVerified: data.user.emailVerified,
          registeredAt: data.user.registeredAt
        };
        onComplete(userObj);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Invalid credentials.' : 'Thông tin đăng nhập không chính xác.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with authentication server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 2. Handle Audience Registration (Full Profile + CAPTCHA + Firebase Email Verification)
  // -------------------------------------------------------------
  const validateRegister = () => {
    const newErrors: Record<string, string> = {};
    if (!regName.trim() || regName.trim().length < 2) {
      newErrors.name = localLanguage !== 'vi' ? 'Name must be at least 2 characters.' : 'Họ và tên tối thiểu 2 ký tự.';
    }
    if (!regMssv.trim()) {
      newErrors.mssv = localLanguage !== 'vi' ? 'MSSV is required.' : 'MSSV không được bỏ trống.';
    }
    if (!regEmail.trim()) {
      newErrors.email = localLanguage !== 'vi' ? 'Email is required for Firebase verification.' : 'Địa chỉ email không được bỏ trống.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      newErrors.email = localLanguage !== 'vi' ? 'Invalid email address format.' : 'Định dạng email không hợp lệ (VD: user@example.com).';
    }
    if (!regGender) {
      newErrors.gender = localLanguage !== 'vi' ? 'Please select gender.' : 'Vui lòng chọn giới tính.';
    }
    if (!regBirthYear || regBirthYear.length !== 4) {
      newErrors.birthYear = localLanguage !== 'vi' ? 'Birth year must be 4 digits.' : 'Năm sinh gồm 4 chữ số (VD: 2004).';
    }
    if (!regPassword || regPassword.length < 6) {
      newErrors.password = localLanguage !== 'vi' ? 'Password must be at least 6 characters.' : 'Mật khẩu tối thiểu 6 ký tự.';
    }
    if (regPassword !== regConfirmPassword) {
      newErrors.confirmPassword = localLanguage !== 'vi' ? 'Passwords do not match.' : 'Mật khẩu xác nhận không khớp.';
    }
    if (!regCaptchaAnswer.trim()) {
      newErrors.captcha = localLanguage !== 'vi' ? 'Please solve the CAPTCHA.' : 'Vui lòng giải bài toán bảo vệ CAPTCHA.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateRegister()) {
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const cleanEmail = regEmail.trim().toLowerCase();

      // 1. Create or ensure Firebase Auth user & send verification email
      let fbUser = null;
      if (auth) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
          fbUser = userCred.user;
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/email-already-in-use') {
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, regPassword);
              fbUser = cred.user;
            } catch (signInErr) {
              console.warn('Firebase sign-in for existing email notice:', signInErr);
            }
          } else {
            console.warn('Firebase Auth create user note:', fbErr);
          }
        }
      }

      // Send Firebase Email Verification
      if (fbUser && !fbUser.emailVerified) {
        try {
          await sendEmailVerification(fbUser);
        } catch (emailSendErr) {
          console.warn('Firebase sendEmailVerification note:', emailSendErr);
        }
      }

      // 2. Register account on backend server
      const res = await fetch('/api/audience/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName.trim(),
          mssv: regMssv.trim().toUpperCase(),
          username: regUsername.trim() || regMssv.trim().toLowerCase(),
          email: cleanEmail,
          emailVerified: Boolean(fbUser?.emailVerified),
          password: regPassword,
          gender: regGender,
          birthYear: regBirthYear,
          anonymizedUid: regAnonymizedUid,
          teamId: regTeamId || undefined,
          note: regNote.trim() || undefined,
          captchaId: regCaptchaId,
          captchaAnswer: regCaptchaAnswer.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();

        const userObj: UserInfo = {
          uid: data.user.uid,
          name: data.user.name,
          mssv: data.user.mssv,
          gender: data.user.gender,
          birthYear: data.user.birthYear,
          anonymizedUid: data.user.anonymizedUid,
          teamId: data.user.teamId,
          teamName: data.user.teamName,
          email: cleanEmail,
          emailVerified: false,
          registeredAt: data.user.registeredAt
        };

        // Also sync to Firestore users collection
        try {
          if (db) {
            await setDoc(doc(db, 'users', userObj.uid), removeUndefined(userObj), { merge: true });
          }
        } catch (e) {
          console.warn('Firestore mirror sync note:', e);
        }

        // Switch to the dedicated Firebase Email Verification screen
        setPendingVerifyEmail(cleanEmail);
        setCachedAuthPassword(regPassword);
        setVerifyPasswordInput(regPassword);
        setNeedPasswordForResend(false);
        setPendingVerifyUser(userObj);
        setResendCooldown(60);
        setActiveTab('EMAIL_VERIFY');
        setSuccessMsg(
          localLanguage !== 'vi'
            ? `Registration successful! A verification email has been sent to ${cleanEmail}. Please click the link to activate your account.`
            : `Đăng ký tài khoản thành công! Email xác thực từ Firebase đã được gửi đến ${cleanEmail}. Vui lòng kiểm tra hộp thư và bấm vào link xác nhận để kích hoạt!`
        );
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Registration failed.' : 'Đăng ký không thành công.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 3. Handle Google Sign-In with Required MSSV & 12-Digit UID Verification Step
  // -------------------------------------------------------------
  const handleGoogleSignIn = async () => {
    soundFx.playClick();
    vibrateTap();
    setErrorMsg(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (!auth) {
        throw new Error('Firebase Auth chưa được khởi tạo. Vui lòng kiểm tra lại cấu hình.');
      }
      const result = await signInWithPopup(auth, googleProvider);
      const googleUser = result.user;

      setGoogleAuthData({
        uid: googleUser.uid,
        email: googleUser.email || '',
        displayName: googleUser.displayName || '',
        photoURL: googleUser.photoURL
      });

      // 1. Check if user already exists in server audience store
      let existingProfile: any = null;
      try {
        const res = await fetch('/api/audience/google-auth', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            uid: googleUser.uid,
            email: googleUser.email,
            displayName: googleUser.displayName
          })
        });
        const data = await res.json();
        if (res.ok && data.success && data.user && data.user.mssv) {
          existingProfile = data.user;
        }
      } catch (e) {
        console.warn('Server google-auth check note:', e);
      }

      // 2. Check Firestore as backup if server doesn't have it yet
      if (!existingProfile && db) {
        try {
          const docSnap = await getDoc(doc(db, 'users', googleUser.uid));
          if (docSnap.exists()) {
            const fData = docSnap.data() as UserInfo;
            if (fData && fData.name && fData.mssv) {
              existingProfile = fData;
            }
          }
        } catch (e) {
          console.warn('Firestore lookup note:', e);
        }
      }

      // 3. IF EXISTING PROFILE WITH MSSV FOUND -> LOG IN IMMEDIATELY!
      if (existingProfile && existingProfile.name && existingProfile.mssv) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        const userObj: UserInfo = {
          uid: existingProfile.uid || googleUser.uid,
          name: existingProfile.name,
          mssv: existingProfile.mssv,
          gender: existingProfile.gender || '1',
          birthYear: existingProfile.birthYear || '2004',
          anonymizedUid: existingProfile.anonymizedUid || generate12DigitUID(existingProfile.name, existingProfile.mssv, existingProfile.gender || '1', existingProfile.birthYear || '2004'),
          teamId: existingProfile.teamId,
          teamName: existingProfile.teamName,
          registeredAt: existingProfile.registeredAt || Date.now()
        };

        // Mirror to Firestore users collection
        try {
          if (db) {
            await setDoc(doc(db, 'users', userObj.uid), removeUndefined(userObj), { merge: true });
          }
        } catch (e) {
          console.warn('Firestore mirror sync note:', e);
        }

        onComplete(userObj);
        return;
      }

      // 4. IF FIRST TIME (NEW GOOGLE USER OR NO MSSV) -> PROMPT MSSV & UID VERIFICATION
      let derivedMssv = existingProfile?.mssv || '';
      if (!derivedMssv && googleUser.email) {
        const match = googleUser.email.match(/^(\d+)/);
        if (match) derivedMssv = match[1];
      }

      const initialName = (existingProfile?.name || googleUser.displayName || '').trim();
      const initialGender = existingProfile?.gender || '1';
      const initialBirthYear = existingProfile?.birthYear || '2004';
      const initialTeamId = existingProfile?.teamId || '';
      const initialUid = existingProfile?.anonymizedUid || (initialName && derivedMssv ? generate12DigitUID(initialName, derivedMssv, initialGender, initialBirthYear) : '');

      setGVerName(initialName);
      setGVerMssv(derivedMssv);
      setGVerGender(initialGender);
      setGVerBirthYear(initialBirthYear);
      setGVerAnonymizedUid(initialUid);
      setGVerTeamId(initialTeamId);

      // Open the Google MSSV & UID Verification Step
      setActiveTab('GOOGLE_VERIFY');
      soundFx.playClick();
      vibrateTap();
      setSuccessMsg(localLanguage !== 'vi'
        ? 'Google account connected! Please verify your MSSV and 12-digit student UID below.'
        : 'Tài khoản Google đã kết nối! Vui lòng xác thực MSSV và Mã định danh 12 số lần đầu bên dưới.');
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Google sign-in error: ' + (err.message || '') : 'Lỗi đăng nhập Google: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  // Submit Google MSSV & 12-Digit UID Verification
  const handleGoogleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleAuthData) {
      setErrorMsg(localLanguage !== 'vi' ? 'Missing Google authentication data.' : 'Thiếu thông tin xác thực Google.');
      return;
    }

    if (!gVerName.trim() || gVerName.trim().length < 2) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter a valid full name.' : 'Họ và tên tối thiểu 2 ký tự.');
      soundFx.playError();
      vibrateError();
      return;
    }

    if (!gVerMssv.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'MSSV is required.' : 'Mã số sinh viên (MSSV) không được bỏ trống.');
      soundFx.playError();
      vibrateError();
      return;
    }

    if (!gVerBirthYear || gVerBirthYear.length !== 4) {
      setErrorMsg(localLanguage !== 'vi' ? 'Birth year must be 4 digits.' : 'Năm sinh gồm 4 chữ số (VD: 2004).');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const finalUid = gVerAnonymizedUid || generate12DigitUID(gVerName.trim(), gVerMssv.trim().toUpperCase(), gVerGender, gVerBirthYear);

    try {
      const res = await fetch('/api/audience/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: googleAuthData.uid,
          email: googleAuthData.email,
          displayName: gVerName.trim(),
          mssv: gVerMssv.trim().toUpperCase(),
          gender: gVerGender,
          birthYear: gVerBirthYear,
          anonymizedUid: finalUid,
          teamId: gVerTeamId || undefined,
          isRegistering: true
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();

        const userObj: UserInfo = {
          uid: data.user.uid,
          name: data.user.name,
          mssv: data.user.mssv,
          gender: data.user.gender,
          birthYear: data.user.birthYear,
          anonymizedUid: data.user.anonymizedUid,
          teamId: data.user.teamId,
          teamName: data.user.teamName,
          registeredAt: data.user.registeredAt
        };

        // Mirror to Firestore users collection
        try {
          if (db) {
            await setDoc(doc(db, 'users', userObj.uid), removeUndefined(userObj), { merge: true });
          }
        } catch (e) {
          console.warn('Firestore mirror sync note:', e);
        }

        onComplete(userObj);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Verification failed.' : 'Xác thực MSSV thất bại.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with verification server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 4. Handle Status Check (Query profile without logging in)
  // -------------------------------------------------------------
  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkQuery.trim()) return;

    setIsChecking(true);
    setErrorMsg(null);
    setCheckResult(null);

    try {
      const res = await fetch(`/api/audience/check-status/${encodeURIComponent(checkQuery.trim())}`);
      const data = await res.json();
      if (data.exists && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        setCheckResult(data.user);
      } else {
        soundFx.playError();
        vibrateError();
        setCheckResult({ notFound: true, query: checkQuery.trim() });
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Could not reach status check server.' : 'Lỗi kết nối tra cứu trạng thái.');
    } finally {
      setIsChecking(false);
    }
  };

  // -------------------------------------------------------------
  // 5. Handle Quick Access (MSSV + 12-Digit UID)
  // -------------------------------------------------------------
  const handleQuickAccessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMssv.trim() || !quickUid.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter MSSV and 12-Digit UID.' : 'Vui lòng nhập đầy đủ MSSV và Mã định danh 12 số.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/audience/quick-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mssv: quickMssv.trim().toUpperCase(),
          anonymizedUid: quickUid.trim().toUpperCase()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        const userObj: UserInfo = {
          uid: data.user.uid,
          name: data.user.name,
          mssv: data.user.mssv,
          gender: data.user.gender,
          birthYear: data.user.birthYear,
          anonymizedUid: data.user.anonymizedUid,
          teamId: data.user.teamId,
          teamName: data.user.teamName,
          registeredAt: data.user.registeredAt
        };
        onComplete(userObj);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Profile not found matching these credentials.' : 'Không tìm thấy hồ sơ khán giả khớp với MSSV và Mã định danh.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 6. Handle Forgot Password - Request 6-Digit OTP Code
  // -------------------------------------------------------------
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter MSSV or Username.' : 'Vui lòng nhập MSSV hoặc Tên đăng nhập.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotCaptchaAnswer.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please solve the CAPTCHA.' : 'Vui lòng giải bài toán bảo vệ CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/audience/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          captchaId: forgotCaptchaId,
          captchaAnswer: forgotCaptchaAnswer.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        setForgotGeneratedCode(data.resetCode);
        setForgotResetCode(data.resetCode || '');
        setForgotStep(2);
        setSuccessMsg(data.message || (localLanguage !== 'vi' ? 'Reset code generated successfully.' : 'Mã khôi phục đã sẵn sàng.'));
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Account not found.' : 'Không tìm thấy tài khoản khán giả.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 7. Handle Forgot Password - Submit New Password with OTP
  // -------------------------------------------------------------
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotResetCode.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter 6-digit reset code.' : 'Vui lòng nhập mã khôi phục 6 chữ số.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setErrorMsg(localLanguage !== 'vi' ? 'New password must be at least 6 characters.' : 'Mật khẩu mới phải có tối thiểu 6 ký tự.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setErrorMsg(localLanguage !== 'vi' ? 'Passwords do not match.' : 'Mật khẩu xác nhận không khớp.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotCaptchaAnswer.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please solve the CAPTCHA.' : 'Vui lòng giải bài toán bảo vệ CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/audience/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: forgotIdentifier.trim(),
          resetCode: forgotResetCode.trim(),
          newPassword: forgotNewPassword,
          captchaId: forgotCaptchaId,
          captchaAnswer: forgotCaptchaAnswer.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        setSuccessMsg(data.message || (localLanguage !== 'vi' ? 'Password reset successfully!' : 'Đặt lại mật khẩu thành công!'));
        setLoginIdentifier(forgotIdentifier.trim());
        setLoginPassword('');
        setTimeout(() => {
          setActiveTab('LOGIN');
          setForgotStep(1);
          setForgotGeneratedCode(null);
        }, 1500);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Password reset failed.' : 'Đặt lại mật khẩu thất bại.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 8. Handle Audience Account Activation with 6-Digit Code
  // -------------------------------------------------------------
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actIdentifier.trim() || !actCode.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter MSSV/Username and Activation Code.' : 'Vui lòng nhập MSSV/Tên đăng nhập và Mã kích hoạt.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!actCaptchaAnswer.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please solve the CAPTCHA.' : 'Vui lòng giải bài toán bảo vệ CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/audience/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: actIdentifier.trim(),
          activationCode: actCode.trim(),
          captchaId: actCaptchaId,
          captchaAnswer: actCaptchaAnswer.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        const userObj: UserInfo = {
          uid: data.user.uid,
          name: data.user.name,
          mssv: data.user.mssv,
          gender: data.user.gender,
          birthYear: data.user.birthYear,
          anonymizedUid: data.user.anonymizedUid,
          teamId: data.user.teamId,
          teamName: data.user.teamName,
          registeredAt: data.user.registeredAt
        };
        onComplete(userObj);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Activation failed.' : 'Kích hoạt tài khoản không thành công.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // 9. Handle Resend Activation Code
  // -------------------------------------------------------------
  const handleResendActivation = async () => {
    if (!actIdentifier.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter MSSV or Username first.' : 'Vui lòng nhập MSSV hoặc Tên đăng nhập trước.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!actCaptchaAnswer.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please solve the CAPTCHA first.' : 'Vui lòng giải bài toán CAPTCHA trước.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/audience/resend-activation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: actIdentifier.trim(),
          captchaId: actCaptchaId,
          captchaAnswer: actCaptchaAnswer.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        setActResentCode(data.activationCode);
        setActCode(data.activationCode || '');
        setSuccessMsg(data.message || (localLanguage !== 'vi' ? 'New activation code generated.' : 'Mã kích hoạt mới đã được tạo.'));
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(data.error || (localLanguage !== 'vi' ? 'Could not generate code.' : 'Không thể tạo mã kích hoạt.'));
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div 
      className={`${
        isInline
          ? 'fluent-box p-3.5 sm:p-6 max-w-lg w-full space-y-3 sm:space-y-4 relative overflow-hidden rounded-[4px] shadow-2xl border border-white/20 my-auto text-[#F5EFF9]'
          : 'fluent-dialog relative fluent-box rounded-[4px] p-3.5 sm:p-6 w-full max-w-lg shadow-2xl flex flex-col text-[#F5EFF9] max-h-[94dvh] overflow-hidden my-auto border border-white/20'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Glow Header Accent (Mirrors Admin PasswordGate) */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F7CAC9]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Logo & Branding Badge (Mirrors Admin Portal) */}
      <div className="text-center space-y-1.5 relative z-10 mb-1.5 sm:mb-2">
        <div className="flex items-center justify-between">
          <div className="w-16 flex justify-start">
            {(onExit || onClose) && (
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  if (onExit) onExit();
                  else if (onClose) onClose();
                }}
                className="p-1 sm:p-1.5 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-mono border border-white/10"
                title={localLanguage !== 'vi' ? 'Home' : 'Trang chủ'}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{localLanguage !== 'vi' ? 'Home' : 'Trang chủ'}</span>
              </button>
            )}
          </div>

          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[2px] fluent-acrylic-surface border border-sky-400/40 flex items-center justify-center shadow-lg shadow-sky-950/40 text-sky-300">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>

          <div className="w-16 flex justify-end">
            {(onExit || onClose) && (
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  if (onExit) onExit();
                  else if (onClose) onClose();
                }}
                className="p-1 sm:p-1.5 rounded-[2px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 transition cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-mono border border-rose-500/40 shadow-sm"
                title={localLanguage !== 'vi' ? 'Exit' : 'Thoát'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{localLanguage !== 'vi' ? 'Exit' : 'Thoát'}</span>
              </button>
            )}
          </div>
        </div>

        <h1 id="audience-auth-title" className="text-base sm:text-lg font-black text-white tracking-tight uppercase font-mono flex items-center justify-center gap-1.5">
          {localLanguage !== 'vi' ? (
            <>Audience Portal <span className="text-sky-300">Live Arena</span></>
          ) : (
            <>Cổng Khán Giả <span className="text-sky-300">Đấu Trường Trực Tiếp</span></>
          )}
        </h1>
        <p className="text-[10px] sm:text-[11px] text-white/60 font-sans leading-relaxed">
          {localLanguage !== 'vi'
            ? 'BTI 2026 Interactive Arena • Dual-Auth Security • Anonymized 12-Digit UID'
            : 'Dành cho sinh viên & khán giả tham gia tương tác, trả lời câu hỏi và vinh danh Bảng Xếp Hạng.'}
        </p>
      </div>

        {/* Exclusive Scope / Student Notice Box */}
        <div className="p-2 sm:p-2.5 rounded-[2px] bg-sky-950/30 border border-sky-500/30 text-[10px] sm:text-[11px] text-sky-200/90 leading-relaxed font-sans mb-2 sm:mb-3 flex items-start gap-1.5 sm:gap-2">
          <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0 mt-0.5" />
          <span>
            {localLanguage !== 'vi'
              ? 'Realtime Synchronization: Your score and responses are recorded in real-time. Use your student ID (MSSV) for automatic award attribution.'
              : 'Đồng bộ thời gian thực: Kết quả thi và thứ hạng được bảo mật qua Mã định danh 12 số, tự động ghi nhận điểm thưởng và quà may mắn.'}
          </span>
        </div>

        {/* Mode Navigation Tabs (Mirrors Admin Portal Structure) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-white/5 border border-white/10 rounded-[2px] text-[10px] sm:text-xs font-mono font-bold mb-2 sm:mb-3 select-none">
          <button
            type="button"
            onClick={() => handleTabChange('LOGIN')}
            className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
              activeTab === 'LOGIN' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{localLanguage !== 'vi' ? 'Login' : 'Đăng Nhập'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('REGISTER')}
            className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
              activeTab === 'REGISTER' || activeTab === 'EMAIL_VERIFY' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{activeTab === 'EMAIL_VERIFY' ? (localLanguage !== 'vi' ? 'Verify' : 'Xác Thực') : (localLanguage !== 'vi' ? 'Register' : 'Đăng Ký')}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('FORGOT_PASSWORD')}
            className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
              activeTab === 'FORGOT_PASSWORD' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <KeyRound className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{localLanguage !== 'vi' ? 'Reset' : 'Quên MK'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('ACTIVATE')}
            className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
              activeTab === 'ACTIVATE' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{localLanguage !== 'vi' ? 'Activate' : 'Kích Hoạt'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('CHECK_STATUS')}
            className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
              activeTab === 'CHECK_STATUS' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{localLanguage !== 'vi' ? 'Lookup' : 'Tra Cứu'}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('QUICK_ACCESS')}
            className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
              activeTab === 'QUICK_ACCESS' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <Fingerprint className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
            <span className="truncate">{localLanguage !== 'vi' ? 'UID 12' : 'Mã 12 Số'}</span>
          </button>
        </div>

        {/* Dynamic Alerts */}
        {errorMsg && (
          <div className="flex items-start gap-2 text-rose-300 bg-rose-950/40 p-2 sm:p-2.5 rounded-[2px] border border-rose-500/30 text-[11px] sm:text-xs mb-2 sm:mb-3 animate-fadeIn shadow-inner">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{errorMsg}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2 sm:p-2.5 rounded-[2px] border border-emerald-500/30 text-[11px] sm:text-xs mb-2 sm:mb-3 animate-fadeIn shadow-inner">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{successMsg}</p>
          </div>
        )}

        {/* Modal Body Container */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-0.5 sm:pr-1 space-y-3 sm:space-y-4">

          {/* ========================================================= */}
          {/* TAB 1: LOGIN (MSSV / Username + Password + CAPTCHA) */}
          {/* ========================================================= */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-3 sm:space-y-3.5">
              <form onSubmit={handleLoginSubmit} className="space-y-2.5 sm:space-y-3 text-left">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Student ID (MSSV) or Username' : 'Mã số sinh viên (MSSV) hoặc Tên đăng nhập'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={localLanguage !== 'vi' ? 'e.g. 22123456 or username' : 'VD: 22123456 hoặc tên đăng nhập'}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                      {localLanguage !== 'vi' ? 'Password' : 'Mật khẩu tài khoản'} *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                    >
                      {showLoginPassword ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                      <span>{showLoginPassword ? (localLanguage !== 'vi' ? 'Hide' : 'Ẩn') : (localLanguage !== 'vi' ? 'Show' : 'Hiện')}</span>
                    </button>
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono">
                  <button
                    type="button"
                    onClick={() => handleTabChange('FORGOT_PASSWORD')}
                    className="text-sky-300/80 hover:text-white hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>{localLanguage !== 'vi' ? 'Forgot Password?' : 'Quên mật khẩu?'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('ACTIVATE')}
                    className="text-amber-300/80 hover:text-amber-200 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <ShieldCheck className="w-3 h-3" />
                    <span>{localLanguage !== 'vi' ? 'Activate Account' : 'Kích hoạt tài khoản'}</span>
                  </button>
                </div>

                {/* Anti-bot Mathematical CAPTCHA Challenge */}
                <CaptchaChallenge
                  captchaId={loginCaptchaId}
                  value={loginCaptchaAnswer}
                  onChange={handleLoginCaptchaChange}
                  disabled={loading}
                  apiEndpoint="/api/audience/captcha"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{localLanguage !== 'vi' ? 'Sign In to Arena' : 'Đăng Nhập Khán Giả'}</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Fast Google Single Sign-On Option */}
              <div className="relative flex items-center justify-center my-1.5 sm:my-2">
                <div className="border-t border-white/10 w-full" />
                <span className="bg-[#0D0420] px-2 text-[10px] font-mono text-white/40 uppercase">
                  {localLanguage !== 'vi' ? 'or' : 'hoặc'}
                </span>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-1.5 sm:py-2 px-3 rounded-[2px] border border-white/15 text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 font-mono"
              >
                <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#EA4335" d="M12 5c1.54 0 2.9.56 3.96 1.48l2.96-2.96C17.06 1.83 14.7 1 12 1 7.42 1 3.55 3.58 1.63 7.34l3.52 2.73C6.07 7.02 8.79 5 12 5z"/>
                  <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.16-1.99 3.41-4.91 3.41-8.7z"/>
                  <path fill="#FBBC05" d="M5.15 14.93c-.24-.73-.38-1.5-.38-2.31s.14-1.58.38-2.31L1.63 7.55C.6 9.61 0 11.97 0 14.48s.6 4.87 1.63 6.93l3.52-2.73z"/>
                  <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.07.72-2.45 1.16-4.22 1.16-3.21 0-5.93-2.02-6.85-5.07L1.63 16.03C3.55 19.79 7.42 22.37 12 22.37z"/>
                </svg>
                <span className="truncate">{localLanguage !== 'vi' ? 'Sign in with Google' : 'Đăng nhập nhanh bằng Google'}</span>
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => handleTabChange('REGISTER')}
                  className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:text-white hover:underline cursor-pointer"
                >
                  {localLanguage !== 'vi' ? "Don't have an account? Register now" : "Chưa có tài khoản? Bấm vào đây để Đăng Ký"}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: FORGOT PASSWORD (Request OTP + Set New Password) */}
          {/* ========================================================= */}
          {activeTab === 'FORGOT_PASSWORD' && (
            <div className="space-y-3 sm:space-y-3.5 text-left animate-fadeIn">
              <div className="p-2 sm:p-2.5 bg-sky-950/30 border border-sky-500/30 rounded-[2px] text-[10px] sm:text-xs text-sky-200">
                <p className="leading-relaxed font-sans">
                  {localLanguage !== 'vi'
                    ? 'Reset password for your audience account. Step 1 generates an instant OTP reset code, and Step 2 allows you to set your new password.'
                    : 'Khôi phục mật khẩu tài khoản khán giả. Bước 1 tạo mã OTP khôi phục, Bước 2 cập nhật mật khẩu mới.'}
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequest} className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                      {localLanguage !== 'vi' ? 'Student ID (MSSV) or Username' : 'Mã số sinh viên (MSSV) hoặc Tên đăng nhập'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={localLanguage !== 'vi' ? 'e.g. 22123456 or username' : 'VD: 22123456 hoặc tên đăng nhập'}
                      value={forgotIdentifier}
                      onChange={(e) => setForgotIdentifier(e.target.value)}
                      className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                      autoFocus
                    />
                  </div>

                  {/* Mathematical CAPTCHA Challenge */}
                  <CaptchaChallenge
                    captchaId={forgotCaptchaId}
                    value={forgotCaptchaAnswer}
                    onChange={handleForgotCaptchaChange}
                    disabled={loading}
                    apiEndpoint="/api/audience/captcha"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{localLanguage !== 'vi' ? 'Generate Reset Code' : 'Tạo Mã Khôi Phục OTP'}</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleForgotReset} className="space-y-2.5 sm:space-y-3">
                  {forgotGeneratedCode && (
                    <div className="p-2 sm:p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-[2px] flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-emerald-300 font-mono block">
                          {localLanguage !== 'vi' ? 'Your Reset Code (valid 15 mins):' : 'Mã OTP khôi phục của bạn (hiệu lực 15 phút):'}
                        </span>
                        <span className="text-sm sm:text-base font-mono font-black text-emerald-200 tracking-widest">
                          {forgotGeneratedCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(forgotGeneratedCode);
                          setCopiedCode(true);
                          soundFx.playClick();
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-[2px] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition border border-emerald-500/40"
                      >
                        {copiedCode ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? (localLanguage !== 'vi' ? 'Copied' : 'Đã chép') : (localLanguage !== 'vi' ? 'Copy' : 'Sao chép')}</span>
                      </button>
                    </div>
                  )}

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                      {localLanguage !== 'vi' ? '6-Digit Reset Code' : 'Mã khôi phục 6 chữ số'} *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="123456"
                      value={forgotResetCode}
                      onChange={(e) => setForgotResetCode(e.target.value)}
                      className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition tracking-widest font-bold placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                        {localLanguage !== 'vi' ? 'New Password' : 'Mật khẩu mới'} *
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                        className="text-[10px] text-white/40 hover:text-white flex items-center gap-1 font-mono transition cursor-pointer"
                      >
                        {showForgotNewPassword ? <EyeOff className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> : <Eye className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                        <span>{showForgotNewPassword ? (localLanguage !== 'vi' ? 'Hide' : 'Ẩn') : (localLanguage !== 'vi' ? 'Show' : 'Hiện')}</span>
                      </button>
                    </div>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                      {localLanguage !== 'vi' ? 'Confirm New Password' : 'Xác nhận mật khẩu mới'} *
                    </label>
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={forgotConfirmPassword}
                      onChange={(e) => setForgotConfirmPassword(e.target.value)}
                      className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                    />
                  </div>

                  {/* Mathematical CAPTCHA Challenge */}
                  <CaptchaChallenge
                    captchaId={forgotCaptchaId}
                    value={forgotCaptchaAnswer}
                    onChange={handleForgotCaptchaChange}
                    disabled={loading}
                    apiEndpoint="/api/audience/captcha"
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{localLanguage !== 'vi' ? 'Update Password' : 'Xác Nhận Đổi Mật Khẩu'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}

              <div className="flex items-center justify-between pt-1">
                {forgotStep === 2 && (
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="text-[10px] sm:text-[11px] font-mono text-white/60 hover:text-white underline cursor-pointer"
                  >
                    {localLanguage !== 'vi' ? '← Back to Step 1' : '← Quay lại Bước 1'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleTabChange('LOGIN')}
                  className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:text-white hover:underline cursor-pointer ml-auto"
                >
                  {localLanguage !== 'vi' ? 'Back to Login' : 'Quay lại Đăng Nhập'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: ACCOUNT ACTIVATION (Verify Account via OTP Code) */}
          {/* ========================================================= */}
          {activeTab === 'ACTIVATE' && (
            <div className="space-y-3 sm:space-y-3.5 text-left animate-fadeIn">
              <div className="p-2 sm:p-2.5 bg-amber-950/30 border border-amber-500/30 rounded-[2px] text-[10px] sm:text-xs text-amber-200">
                <p className="leading-relaxed font-sans">
                  {localLanguage !== 'vi'
                    ? 'Activate your audience account by entering your MSSV/Username and the 6-digit Activation Code received upon registration or requested below.'
                    : 'Kích hoạt tài khoản khán giả bằng cách nhập MSSV/Tên đăng nhập và Mã kích hoạt 6 chữ số được cấp khi đăng ký hoặc bấm lấy lại mã bên dưới.'}
                </p>
              </div>

              {actResentCode && (
                <div className="p-2 sm:p-2.5 bg-amber-950/40 border border-amber-500/30 rounded-[2px] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-300 font-mono block">
                      {localLanguage !== 'vi' ? 'Your Activation Code:' : 'Mã kích hoạt tài khoản của bạn:'}
                    </span>
                    <span className="text-sm sm:text-base font-mono font-black text-amber-200 tracking-widest">
                      {actResentCode}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(actResentCode);
                      setCopiedCode(true);
                      soundFx.playClick();
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-2 py-1 bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 rounded-[2px] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition border border-amber-500/40"
                  >
                    {copiedCode ? <Check className="w-3 h-3 text-amber-300" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? (localLanguage !== 'vi' ? 'Copied' : 'Đã chép') : (localLanguage !== 'vi' ? 'Copy' : 'Sao chép')}</span>
                  </button>
                </div>
              )}

              <form onSubmit={handleActivateSubmit} className="space-y-2.5 sm:space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Student ID (MSSV) or Username' : 'Mã số sinh viên (MSSV) hoặc Tên đăng nhập'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={localLanguage !== 'vi' ? 'e.g. 22123456 or username' : 'VD: 22123456 hoặc tên đăng nhập'}
                    value={actIdentifier}
                    onChange={(e) => setActIdentifier(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                      {localLanguage !== 'vi' ? '6-Digit Activation Code' : 'Mã kích hoạt 6 chữ số'} *
                    </label>
                    <button
                      type="button"
                      onClick={handleResendActivation}
                      disabled={loading}
                      className="text-[10px] text-amber-300 hover:text-white hover:underline flex items-center gap-1 font-mono transition cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>{localLanguage !== 'vi' ? 'Get/Resend Code' : 'Lấy lại mã kích hoạt'}</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="123456"
                    value={actCode}
                    onChange={(e) => setActCode(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition tracking-widest font-bold placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                </div>

                {/* Mathematical CAPTCHA Challenge */}
                <CaptchaChallenge
                  captchaId={actCaptchaId}
                  value={actCaptchaAnswer}
                  onChange={handleActCaptchaChange}
                  disabled={loading}
                  apiEndpoint="/api/audience/captcha"
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{localLanguage !== 'vi' ? 'Activate & Enter Arena' : 'Kích Hoạt & Vào Sàn Đấu'}</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </>
                  )}
                </button>
              </form>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => handleTabChange('LOGIN')}
                  className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:text-white hover:underline cursor-pointer"
                >
                  {localLanguage !== 'vi' ? '← Back to Login' : '← Quay lại Đăng Nhập'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 2: REGISTER (Full Profile + Anonymized UID + CAPTCHA) */}
          {/* ========================================================= */}
          {activeTab === 'REGISTER' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-2.5 sm:space-y-3 text-left">
              {googleLinkedEmail && (
                <div className="p-2 sm:p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-[2px] text-[11px] text-sky-200 flex items-center gap-2">
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0" />
                  <span className="truncate">{localLanguage !== 'vi' ? 'Linked Google:' : 'Đã liên kết Google:'} <strong>{googleLinkedEmail}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? 'Full Name' : 'Họ và Tên'} *
                </label>
                <input
                  type="text"
                  placeholder={localLanguage !== 'vi' ? 'e.g. Nguyen Van A' : 'VD: Nguyễn Văn A'}
                  value={regName}
                  onChange={(e) => {
                    setRegName(e.target.value);
                    if (errors.name) setErrors({ ...errors, name: undefined });
                  }}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                />
                {errors.name && <p className="text-[10px] sm:text-[11px] text-rose-400 mt-1">{errors.name}</p>}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                    {localLanguage !== 'vi' ? 'Email Address (Firebase Verification)' : 'Địa chỉ Email (Nhận link xác thực Firebase)'} *
                  </label>
                  <span className="text-[9px] text-amber-300/90 font-mono">{localLanguage !== 'vi' ? 'Required' : 'Bắt buộc'}</span>
                </div>
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="sinhvien@example.com"
                    value={regEmail}
                    onChange={(e) => {
                      setRegEmail(e.target.value);
                      if (errors.email) setErrors({ ...errors, email: undefined });
                    }}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white pl-8 pr-2.5 sm:pr-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                  <Mail className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                </div>
                {errors.email && <p className="text-[10px] sm:text-[11px] text-rose-400 mt-1">{errors.email}</p>}
                <p className="text-[9px] text-white/40 mt-0.5 font-sans">
                  {localLanguage !== 'vi'
                    ? 'Firebase will send a confirmation link to this address after registration.'
                    : 'Firebase sẽ gửi liên kết xác thực vào email này sau khi bấm Đăng Ký.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Student ID (MSSV)' : 'Mã số sinh viên (MSSV)'} *
                  </label>
                  <input
                    type="text"
                    placeholder="22123456"
                    value={regMssv}
                    onChange={(e) => {
                      setRegMssv(e.target.value.toUpperCase());
                      if (errors.mssv) setErrors({ ...errors, mssv: undefined });
                    }}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase font-bold placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                  {errors.mssv && <p className="text-[10px] sm:text-[11px] text-rose-400 mt-1">{errors.mssv}</p>}
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Username (Optional)' : 'Tên đăng nhập (Tùy chọn)'}
                  </label>
                  <input
                    type="text"
                    placeholder={regMssv ? regMssv.toLowerCase() : 'username'}
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase())}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Gender' : 'Giới tính'} *
                  </label>
                  <select
                    value={regGender}
                    onChange={(e) => {
                      setRegGender(e.target.value);
                      if (errors.gender) setErrors({ ...errors, gender: undefined });
                    }}
                    className="w-full bg-[#0D0420] border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2 py-1.5 sm:py-2 rounded-[2px] outline-none transition cursor-pointer"
                  >
                    <option value="1">{localLanguage !== 'vi' ? 'Male' : 'Nam'}</option>
                    <option value="2">{localLanguage !== 'vi' ? 'Female' : 'Nữ'}</option>
                    <option value="0">{localLanguage !== 'vi' ? 'Other' : 'Khác'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Birth Year' : 'Năm sinh'} *
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={4}
                    placeholder="2004"
                    value={regBirthYear}
                    onChange={(e) => {
                      setRegBirthYear(e.target.value.replace(/\D/g, ''));
                      if (errors.birthYear) setErrors({ ...errors, birthYear: undefined });
                    }}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                  {errors.birthYear && <p className="text-[10px] sm:text-[11px] text-rose-400 mt-1">{errors.birthYear}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                      {localLanguage !== 'vi' ? 'Password' : 'Mật khẩu'} *
                    </label>
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="≥ 6 ký tự"
                    value={regPassword}
                    onChange={(e) => {
                      setRegPassword(e.target.value);
                      if (errors.password) setErrors({ ...errors, password: undefined });
                    }}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                  {errors.password && <p className="text-[10px] sm:text-[11px] text-rose-400 mt-1">{errors.password}</p>}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                      {localLanguage !== 'vi' ? 'Confirm' : 'Xác nhận'} *
                    </label>
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Nhập lại mật khẩu"
                    value={regConfirmPassword}
                    onChange={(e) => {
                      setRegConfirmPassword(e.target.value);
                      if (errors.confirmPassword) setErrors({ ...errors, confirmPassword: undefined });
                    }}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                  {errors.confirmPassword && <p className="text-[10px] sm:text-[11px] text-rose-400 mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* 12-Digit Anonymized UID Display & Generator */}
              <div className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-[2px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-white/80 flex items-center gap-1 sm:gap-1.5 truncate">
                    <Fingerprint className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{localLanguage !== 'vi' ? '12-Digit UID' : 'Mã định danh (12 số)'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!regName.trim() || !regMssv.trim()) {
                        setErrorMsg(localLanguage !== 'vi' ? 'Please fill in Name and MSSV first.' : 'Vui lòng nhập Họ tên và MSSV trước.');
                        soundFx.playError();
                        vibrateError();
                        return;
                      }
                      soundFx.playClick();
                      vibrateSuccess();
                      const gen = generate12DigitUID(regName, regMssv, regGender, regBirthYear);
                      setRegAnonymizedUid(gen);
                    }}
                    className="text-[10px] text-sky-300 hover:underline font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{localLanguage !== 'vi' ? 'Refresh' : 'Tạo mới'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={regAnonymizedUid || '•••• •••• ••••'}
                  className="w-full bg-[#0D0420]/80 border border-white/10 text-center font-mono tracking-widest text-sky-300 font-bold text-xs py-1.5 rounded-[2px] select-all cursor-text outline-none"
                />
                <p className="text-[9px] sm:text-[10px] text-white/50 mt-1 leading-normal">
                  {localLanguage !== 'vi'
                    ? 'This unique 12-digit code identifies you on the leaderboard while protecting your identity.'
                    : 'Mã 12 chữ số giúp hiển thị thứ hạng trên Bảng Xếp Hạng mà không làm lộ danh tính cá nhân.'}
                </p>
              </div>

              {/* Team selection (if enabled) */}
              {teamModeActive && teams && teams.length > 0 && !randomTeamAssignment && (
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Select Team to Support' : 'Chọn Đội Thi Cổ Vũ'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {teams.map(tTeam => (
                      <button
                        key={tTeam.id}
                        type="button"
                        onClick={() => setRegTeamId(tTeam.id)}
                        className={`p-1.5 sm:p-2 rounded-[2px] border text-xs font-bold transition flex items-center justify-center cursor-pointer truncate ${
                          regTeamId === tTeam.id
                            ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                            : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{tTeam.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Anti-bot Mathematical CAPTCHA Challenge */}
              <CaptchaChallenge
                captchaId={regCaptchaId}
                value={regCaptchaAnswer}
                onChange={handleRegCaptchaChange}
                disabled={loading}
                apiEndpoint="/api/audience/captcha"
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{localLanguage !== 'vi' ? 'Complete Registration' : 'Hoàn Tất Đăng Ký Khán Giả'}</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB: FIREBASE EMAIL VERIFICATION */}
          {/* ========================================================= */}
          {activeTab === 'EMAIL_VERIFY' && (
            <div className="space-y-3 sm:space-y-3.5 text-left animate-fadeIn">
              {/* Visual Header Banner */}
              <div className="p-3 sm:p-3.5 bg-gradient-to-br from-sky-950/60 via-[#0D0420] to-indigo-950/60 border border-sky-500/30 rounded-[2px] text-center space-y-2">
                <div className="w-10 h-10 sm:w-11 sm:h-11 mx-auto rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-lg shadow-sky-950/50">
                  <Mail className="w-5 h-5 sm:w-5.5 sm:h-5.5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-white font-mono uppercase tracking-wider">
                    {localLanguage !== 'vi' ? 'Firebase Email Verification Required' : 'Xác Thực Email Kích Hoạt Tài Khoản'}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                    {localLanguage !== 'vi'
                      ? 'A confirmation email from Firebase has been sent to:'
                      : 'Hệ thống Firebase Authentication đã gửi email kích hoạt tới:'}
                  </p>
                </div>

                {/* Target Email Box */}
                <div className="p-1.5 sm:p-2 bg-black/50 border border-sky-500/30 rounded-[2px] flex items-center justify-between gap-2 max-w-sm mx-auto">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-sky-200 truncate">
                      {pendingVerifyEmail || 'your-email@example.com'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (pendingVerifyEmail) {
                        navigator.clipboard.writeText(pendingVerifyEmail);
                        setCopiedCode(true);
                        soundFx.playClick();
                        setTimeout(() => setCopiedCode(false), 2000);
                      }
                    }}
                    className="p-1 text-white/60 hover:text-white transition shrink-0 cursor-pointer"
                    title="Copy Email"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-[2px] space-y-1.5 text-[11px] sm:text-xs">
                <span className="font-mono font-bold text-sky-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{localLanguage !== 'vi' ? 'Next steps to activate:' : 'Hướng dẫn 3 bước kích hoạt:'}</span>
                </span>
                <ol className="space-y-1 text-white/75 list-decimal list-inside leading-relaxed font-sans text-[10px] sm:text-[11px]">
                  <li>
                    {localLanguage !== 'vi'
                      ? 'Open your email inbox (also check Spam/Junk folder).'
                      : 'Mở hòm thư email của bạn (kiểm tra cả hộp thư Rác / Spam).'}
                  </li>
                  <li>
                    {localLanguage !== 'vi'
                      ? 'Click the verification link provided in the email.'
                      : 'Bấm vào đường liên kết xác thực (verification link) trong email do Firebase gửi.'}
                  </li>
                  <li>
                    {localLanguage !== 'vi'
                      ? 'Return to this screen and click "I Have Clicked the Verification Link".'
                      : 'Quay lại màn hình này và bấm nút "Tôi Đã Bấm Link Xác Thực" bên dưới để hoàn tất.'}
                  </li>
                </ol>
              </div>

              {/* Password Confirmation Field (if Firebase session needs re-authentication) */}
              {(needPasswordForResend || !auth?.currentUser) && (
                <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-[2px] space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-amber-200">
                      {localLanguage !== 'vi' ? 'Account Password (for Firebase Auth):' : 'Mật khẩu tài khoản (để ủy quyền Firebase):'}
                    </label>
                    <span className="text-[9px] text-amber-300 font-mono">{localLanguage !== 'vi' ? 'Required for resend' : 'Cần để gửi lại'}</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showVerifyPassword ? 'text' : 'password'}
                      placeholder={localLanguage !== 'vi' ? 'Enter password...' : 'Nhập mật khẩu của bạn...'}
                      value={verifyPasswordInput}
                      onChange={(e) => {
                        setVerifyPasswordInput(e.target.value);
                        setCachedAuthPassword(e.target.value);
                      }}
                      className="w-full bg-[#0D0420] border border-amber-500/40 hover:border-amber-400 focus:border-sky-400 font-mono text-xs text-white pl-8 pr-8 py-1.5 rounded-[2px] outline-none transition placeholder:text-white/30"
                    />
                    <Lock className="w-3.5 h-3.5 text-amber-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowVerifyPassword(!showVerifyPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white"
                    >
                      {showVerifyPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                {/* 1. Primary: I have clicked the verification link */}
                <button
                  type="button"
                  onClick={handleCheckEmailVerification}
                  disabled={isCheckingVerification}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
                >
                  {isCheckingVerification ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                      <span>{localLanguage !== 'vi' ? 'I Have Clicked the Verification Link' : 'Tôi Đã Bấm Link Xác Thực'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

                {/* 2. Direct Instant Activation Button (Bypasses email delivery delays) */}
                <button
                  type="button"
                  onClick={handleDirectActivate}
                  disabled={isCheckingVerification}
                  className="w-full bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 hover:from-amber-500 hover:to-amber-400 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono border border-amber-400/40"
                >
                  <Zap className="w-4 h-4 text-amber-200 animate-pulse" />
                  <span>{localLanguage !== 'vi' ? '⚡ Instant Activation & Enter Arena' : '⚡ Kích Hoạt Nhanh & Vào Sàn Đấu Ngay'}</span>
                </button>

                {/* 3. Fast Code / BTI2026 Activation Input */}
                <div className="p-2 sm:p-2.5 bg-black/40 border border-white/10 rounded-[2px] space-y-1.5 text-left">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] sm:text-[11px] font-mono font-bold text-sky-300 flex items-center gap-1">
                      <KeyRound className="w-3 h-3 text-sky-400" />
                      <span>{localLanguage !== 'vi' ? 'Or enter 6-digit code / BTI2026:' : 'Hoặc nhập Mã 6 số / Mã BTI2026:'}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder={localLanguage !== 'vi' ? 'e.g. 123456 or BTI2026' : 'Mã 6 số hoặc BTI2026'}
                      value={quickActivationCode}
                      onChange={(e) => setQuickActivationCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-[#0D0420] border border-white/20 hover:border-sky-400 focus:border-sky-400 font-mono text-xs text-white px-2.5 py-1.5 rounded-[2px] outline-none transition uppercase tracking-wider"
                    />
                    <button
                      type="button"
                      onClick={handleQuickCodeActivate}
                      disabled={!quickActivationCode.trim() || isQuickActivating}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-mono font-bold text-xs rounded-[2px] transition cursor-pointer shrink-0"
                    >
                      {isQuickActivating ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span>{localLanguage !== 'vi' ? 'Activate' : 'Kích Hoạt'}</span>
                      )}
                    </button>
                  </div>
                </div>

                {/* 4. Resend Verification Email */}
                <button
                  type="button"
                  onClick={handleResendVerificationEmail}
                  disabled={isResendingEmail || resendCooldown > 0}
                  className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white/90 font-mono text-xs py-2 px-3 rounded-[2px] transition flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                >
                  {isResendingEmail ? (
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-sky-400" />
                      <span>
                        {resendCooldown > 0
                          ? (localLanguage !== 'vi' ? `Resend email in ${resendCooldown}s` : `Gửi lại email sau ${resendCooldown}s`)
                          : (localLanguage !== 'vi' ? 'Resend Verification Email' : 'Gửi Lại Email Xác Thực')}
                      </span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-between pt-1.5">
                  <button
                    type="button"
                    onClick={() => handleTabChange('REGISTER')}
                    className="text-[10px] sm:text-[11px] font-mono text-white/60 hover:text-white underline cursor-pointer"
                  >
                    {localLanguage !== 'vi' ? '← Edit Registration Info' : '← Đổi Thông Tin / Email'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('LOGIN')}
                    className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:text-white hover:underline cursor-pointer"
                  >
                    {localLanguage !== 'vi' ? 'Back to Login →' : 'Quay lại Đăng Nhập →'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 3: STATUS CHECK & PROFILE LOOKUP */}
          {/* ========================================================= */}
          {activeTab === 'CHECK_STATUS' && (
            <div className="space-y-3 sm:space-y-4 text-left">
              <form onSubmit={handleCheckStatus} className="space-y-2 sm:space-y-3">
                <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed font-mono">
                  {localLanguage !== 'vi'
                    ? 'Lookup your registration and active status by entering your MSSV, Username, Email, or 12-Digit UID.'
                    : 'Tra cứu thông tin tài khoản và mã định danh bằng cách nhập MSSV, Tên đăng nhập, Email hoặc Mã 12 số.'}
                </p>

                <div className="flex gap-1.5 sm:gap-2">
                  <input
                    type="text"
                    required
                    placeholder={localLanguage !== 'vi' ? 'Enter MSSV, Username, or UID...' : 'Nhập MSSV, Tên đăng nhập, hoặc UID...'}
                    value={checkQuery}
                    onChange={(e) => setCheckQuery(e.target.value)}
                    className="flex-1 min-w-0 bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none uppercase transition placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                  />
                  <button
                    type="submit"
                    disabled={isChecking}
                    className="px-3 sm:px-4 py-1.5 sm:py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-[2px] uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer font-mono shrink-0"
                  >
                    {isChecking ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Search className="w-3.5 h-3.5" />
                        <span>{localLanguage !== 'vi' ? 'Lookup' : 'Tra Cứu'}</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {checkResult && (
                <div className="animate-fadeIn mt-2 sm:mt-3">
                  {checkResult.notFound ? (
                    <div className="p-2.5 sm:p-3 bg-rose-950/40 border border-rose-500/30 rounded-[2px] text-xs text-rose-300">
                      <div className="flex items-center gap-2 font-bold mb-1 font-mono">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>{localLanguage !== 'vi' ? 'Profile Not Found' : 'Không tìm thấy hồ sơ'}</span>
                      </div>
                      <p className="text-rose-200/80 text-[10px] sm:text-[11px] leading-relaxed">
                        {localLanguage !== 'vi'
                          ? `No audience profile matches "${checkResult.query}". Please register a new account.`
                          : `Không tìm thấy hồ sơ khán giả nào khớp với "${checkResult.query}". Bạn có thể đăng ký tài khoản mới ngay bây giờ.`}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setRegMssv(checkResult.query.toUpperCase());
                          setActiveTab('REGISTER');
                        }}
                        className="mt-2 text-xs font-bold text-sky-300 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" />
                        <span>{localLanguage !== 'vi' ? 'Register with this MSSV' : 'Đăng ký ngay với MSSV này'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 sm:p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-[2px] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-300 font-mono text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                          <span>{localLanguage !== 'vi' ? 'Active Verified Audience' : 'Khán Giả Đã Xác Thực'}</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {checkResult.authProvider === 'google' ? 'Google SSO' : 'Local Auth'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono">
                        <div>
                          <span className="text-white/50 block">{localLanguage !== 'vi' ? 'Full Name:' : 'Họ và tên:'}</span>
                          <span className="font-bold text-white truncate block">{checkResult.name}</span>
                        </div>
                        <div>
                          <span className="text-white/50 block">MSSV:</span>
                          <span className="font-bold text-sky-300 truncate block">{checkResult.mssv}</span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-white/50 block">{localLanguage !== 'vi' ? '12-Digit UID:' : 'Mã định danh 12 số:'}</span>
                          <span className="font-bold text-sky-300 tracking-wider truncate block">{checkResult.anonymizedUid}</span>
                        </div>
                        {checkResult.registeredAt && (
                          <div className="col-span-2">
                            <span className="text-white/50 block">{localLanguage !== 'vi' ? 'Registered Date:' : 'Thời gian đăng ký:'}</span>
                            <span className="text-white/70">{new Date(checkResult.registeredAt).toLocaleString(localLanguage === 'vi' ? 'vi-VN' : 'en-US')}</span>
                          </div>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setLoginIdentifier(checkResult.mssv);
                          setActiveTab('LOGIN');
                        }}
                        className="w-full mt-2 py-1.5 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-[2px] flex items-center justify-center gap-1.5 transition cursor-pointer font-mono"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>{localLanguage !== 'vi' ? 'Sign In with this Account' : 'Đăng nhập vào tài khoản này'}</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB 4: QUICK ACCESS (MSSV + 12-Digit UID Direct Unlock) */}
          {/* ========================================================= */}
          {activeTab === 'QUICK_ACCESS' && (
            <form onSubmit={handleQuickAccessSubmit} className="space-y-2.5 sm:space-y-3.5 text-left">
              <div className="p-2 sm:p-2.5 bg-sky-950/30 border border-sky-500/30 rounded-[2px] text-[10px] sm:text-xs text-sky-200">
                <p className="leading-relaxed font-sans">
                  {localLanguage !== 'vi'
                    ? 'Already have your 12-digit student UID? Reconnect immediately without needing a password.'
                    : 'Nếu bạn đã có Mã định danh 12 số từ trước, hãy nhập MSSV và Mã 12 số để mở khóa vào sàn đấu ngay lập tức.'}
                </p>
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  MSSV *
                </label>
                <input
                  type="text"
                  required
                  placeholder="22123456"
                  value={quickMssv}
                  onChange={(e) => setQuickMssv(e.target.value.toUpperCase())}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? '12-Digit Anonymized UID' : 'Mã định danh 12 số'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="200412345678"
                  value={quickUid}
                  onChange={(e) => setQuickUid(e.target.value.toUpperCase())}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-sky-300 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase tracking-widest font-bold placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Fingerprint className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span>{localLanguage !== 'vi' ? 'Quick Unlock Arena' : 'Xác Thực Nhanh Bằng UID'}</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================================= */}
          {/* TAB 5: GOOGLE_VERIFY (Confirm Google Account, MSSV & 12-Digit UID) */}
          {/* ========================================================= */}
          {activeTab === 'GOOGLE_VERIFY' && googleAuthData && (
            <form onSubmit={handleGoogleVerifySubmit} className="space-y-2.5 sm:space-y-3.5 text-left animate-fadeIn">
              {/* Google Account Summary Card */}
              <div className="p-2 sm:p-2.5 bg-gradient-to-r from-sky-950/60 to-[#190839] border border-sky-500/40 rounded-[2px] flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  {googleAuthData.photoURL ? (
                    <img
                      src={googleAuthData.photoURL}
                      alt={googleAuthData.displayName}
                      className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-sky-400/50 object-cover shrink-0"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-sky-600/30 border border-sky-400/50 flex items-center justify-center text-sky-300 font-bold text-xs shrink-0">
                      {googleAuthData.displayName ? googleAuthData.displayName[0].toUpperCase() : 'G'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-bold text-white leading-none truncate">
                        {googleAuthData.displayName || 'Google User'}
                      </span>
                      <span className="px-1 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[8px] sm:text-[9px] font-mono flex items-center gap-0.5 shrink-0">
                        <Check className="w-2 h-2" />
                        <span>SSO</span>
                      </span>
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-sky-200/80 font-mono block mt-0.5 truncate">
                      {googleAuthData.email}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleGoogleSignIn}
                  className="text-[10px] text-sky-300 hover:text-white underline font-mono cursor-pointer shrink-0 ml-2"
                >
                  {localLanguage !== 'vi' ? 'Switch' : 'Đổi tài khoản'}
                </button>
              </div>

              {/* Informative Guidance */}
              <div className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-[2px] text-[10px] sm:text-[11px] text-white/70 leading-relaxed flex items-start gap-1.5 font-sans">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  {localLanguage !== 'vi'
                    ? 'Verify your Student ID (MSSV) and 12-digit UID to link your scores and leaderboard identity.'
                    : 'Vui lòng xác thực MSSV và Mã định danh 12 số để lưu giữ thành tích và vinh danh trên Bảng Xếp Hạng.'}
                </span>
              </div>

              {/* Name & MSSV */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? 'Full Name' : 'Họ và Tên'} *
                </label>
                <input
                  type="text"
                  required
                  value={gVerName}
                  onChange={(e) => setGVerName(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? 'Student ID (MSSV)' : 'Mã số sinh viên (MSSV)'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="22123456"
                  value={gVerMssv}
                  onChange={(e) => setGVerMssv(e.target.value.toUpperCase())}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase font-bold tracking-wider placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                />
              </div>

              {/* Gender & Birth Year */}
              <div className="grid grid-cols-2 gap-2 sm:gap-2.5">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Gender' : 'Giới tính'} *
                  </label>
                  <select
                    value={gVerGender}
                    onChange={(e) => setGVerGender(e.target.value)}
                    className="w-full bg-[#0D0420] border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2 py-1.5 sm:py-2 rounded-[2px] outline-none transition cursor-pointer"
                  >
                    <option value="1">{localLanguage !== 'vi' ? 'Male' : 'Nam'}</option>
                    <option value="2">{localLanguage !== 'vi' ? 'Female' : 'Nữ'}</option>
                    <option value="3">{localLanguage !== 'vi' ? 'Other' : 'Khác'}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Birth Year' : 'Năm sinh'} *
                  </label>
                  <input
                    type="number"
                    required
                    min={1970}
                    max={2015}
                    value={gVerBirthYear}
                    onChange={(e) => setGVerBirthYear(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:font-normal placeholder:text-white/30 placeholder:text-xs font-mono"
                  />
                </div>
              </div>

              {/* 12-Digit Anonymized UID Display & Generator */}
              <div className="p-2 sm:p-2.5 bg-white/5 border border-white/10 rounded-[2px]">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] sm:text-[11px] font-mono font-bold text-white/80 flex items-center gap-1 sm:gap-1.5 truncate">
                    <Fingerprint className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{localLanguage !== 'vi' ? '12-Digit UID' : 'Mã định danh (12 số)'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!gVerName.trim() || !gVerMssv.trim()) {
                        setErrorMsg(localLanguage !== 'vi' ? 'Please fill in Name and MSSV first.' : 'Vui lòng nhập Họ tên và MSSV trước.');
                        soundFx.playError();
                        vibrateError();
                        return;
                      }
                      soundFx.playClick();
                      vibrateSuccess();
                      const gen = generate12DigitUID(gVerName, gVerMssv, gVerGender, gVerBirthYear);
                      setGVerAnonymizedUid(gen);
                    }}
                    className="text-[10px] text-sky-300 hover:underline font-mono uppercase tracking-wider flex items-center gap-1 cursor-pointer shrink-0 ml-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>{localLanguage !== 'vi' ? 'Recalculate' : 'Tính lại'}</span>
                  </button>
                </div>
                <input
                  type="text"
                  readOnly
                  value={gVerAnonymizedUid || (gVerName && gVerMssv ? generate12DigitUID(gVerName, gVerMssv, gVerGender, gVerBirthYear) : '•••• •••• ••••')}
                  className="w-full bg-[#0D0420]/80 border border-white/10 text-center font-mono tracking-widest text-sky-300 font-bold text-xs py-1.5 rounded-[2px] select-all cursor-text outline-none"
                />
                <p className="text-[9px] sm:text-[10px] text-white/50 mt-1 leading-normal">
                  {localLanguage !== 'vi'
                    ? 'This unique 12-digit code identifies you on the leaderboard while protecting your identity.'
                    : 'Mã 12 chữ số giúp hiển thị thứ hạng trên Bảng Xếp Hạng mà không làm lộ danh tính cá nhân.'}
                </p>
              </div>

              {/* Team selection (if enabled) */}
              {teamModeActive && teams && teams.length > 0 && !randomTeamAssignment && (
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Select Team to Support' : 'Chọn Đội Thi Cổ Vũ'}
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                    {teams.map(tTeam => (
                      <button
                        key={tTeam.id}
                        type="button"
                        onClick={() => setGVerTeamId(tTeam.id)}
                        className={`p-1.5 sm:p-2 rounded-[2px] border text-xs font-bold transition flex items-center justify-center cursor-pointer truncate ${
                          gVerTeamId === tTeam.id
                            ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                            : 'border-white/15 bg-white/5 text-white/70 hover:bg-white/10'
                        }`}
                      >
                        <span className="truncate">{tTeam.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98 font-mono"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="truncate">{localLanguage !== 'vi' ? 'Confirm MSSV / UID & Enter Arena' : 'Xác Nhận & Vào Sàn Đấu'}</span>
                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
                  </>
                )}
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => handleTabChange('LOGIN')}
                  className="text-xs text-white/60 hover:text-white underline font-mono cursor-pointer"
                >
                  {localLanguage !== 'vi' ? '← Back to standard login' : '← Quay lại đăng nhập thông thường'}
                </button>
              </div>
            </form>
          )}

        </div>

        {(onExit || onClose) && (
          <div className="pt-2 sm:pt-3 border-t border-white/10 text-center">
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                if (onExit) onExit();
                else if (onClose) onClose();
              }}
              className="text-[11px] font-mono text-white/50 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer py-1 px-3 rounded-[2px] hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{localLanguage !== 'vi' ? 'Return to Home Page' : 'Thoát về Trang Chủ BTI 2026'}</span>
            </button>
          </div>
        )}
      </div>
  );

  if (isInline) {
    return (
      <div className="flex-1 min-h-[calc(100dvh-4rem)] flex items-center justify-center p-2.5 sm:p-4 py-4 sm:py-6 bg-transparent select-none overflow-y-auto">
        {content}
      </div>
    );
  }

  return (
    <div 
      className="fluent-dialog-overlay z-[60] animate-fadeIn flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audience-auth-title"
      onClick={onClose}
    >
      {content}
    </div>
  );
};
