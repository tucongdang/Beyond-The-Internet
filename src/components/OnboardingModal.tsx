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
  Zap,
  Trophy
} from 'lucide-react';
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth, removeUndefined } from '../firebase';
import { soundFx } from '../services/audioEffects';
import { t } from '../utils/i18n';
import { generate12DigitUID } from '../utils/uidUtils';
import { hashClientPassword } from '../utils/cryptoUtils';
import { CaptchaChallenge } from './CaptchaChallenge';
import {
  vibrateTap,
  vibrateSubmit,
  vibrateSuccess,
  vibrateError,
  vibrateSelection
} from '../utils/hapticUtils';
import { validateUsernameCompliance, PDPD_CONSENT_VERSION } from '../utils/vnLawCompliance';
import { PrivacyPolicyModal } from './PrivacyPolicyModal';
import { TermsOfServiceModal } from './TermsOfServiceModal';

const googleProvider = new GoogleAuthProvider();

interface OnboardingModalProps {
  isOpen: boolean;
  onComplete: (user: UserInfo) => void;
  currentUser?: UserInfo | null;
  teams?: Array<{ id: string; name: string; color: string }>;
  teamModeActive?: boolean;
  randomTeamAssignment?: boolean;
  isInline?: boolean;
  isLobbyLocked?: boolean;
  isLookupLocked?: boolean;
  onExit?: () => void;
  onClose?: () => void;
}

type AudienceAuthTab = 'LOGIN' | 'REGISTER' | 'EMAIL_VERIFY' | 'FORGOT_PASSWORD' | 'CHECK_STATUS' | 'QUICK_ACCESS' | 'GOOGLE_VERIFY';

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onComplete,
  currentUser,
  teams,
  teamModeActive,
  randomTeamAssignment,
  isInline = false,
  isLobbyLocked = false,
  isLookupLocked = false,
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
  const [regConsentAgreed, setRegConsentAgreed] = useState(false);
  const [regAgeConfirmed, setRegAgeConfirmed] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);

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
  const [firebaseEmailStatus, setFirebaseEmailStatus] = useState<'sent' | 'existing_account' | 'error' | null>(null);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);

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
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotCaptchaId, setForgotCaptchaId] = useState('');
  const [forgotCaptchaAnswer, setForgotCaptchaAnswer] = useState('');
  const [forgotCooldown, setForgotCooldown] = useState(0);

  // --- General UI State ---
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [keepLoggedIn, setKeepLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('BTI2026_AUDIENCE_KEEP_LOGGED_IN');
      return stored !== 'false';
    }
    return true;
  });
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

  // Cooldown countdown for resending verification and reset emails
  useEffect(() => {
    if (resendCooldown <= 0 && forgotCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => Math.max(0, prev - 1));
      setForgotCooldown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown, forgotCooldown]);

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

      const isVerified = Boolean(auth && auth.currentUser?.emailVerified);

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
            ? 'Email verified! Welcoming you into the BTI 2027 arena...'
            : 'Kích hoạt thành công rồi! Chào mừng bạn tiến vào sân khấu BTI 2027 nhé...'
        );

        setTimeout(() => {
          onComplete(completedUser);
        }, 800);
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(
          localLanguage !== 'vi'
            ? 'Looks like the link has not been clicked yet. Please check your inbox (and Spam/Promotions folder) and tap the activation link!'
            : 'Hệ thống chưa thấy bạn bấm link kích hoạt. Bạn mở hộp thư (nhớ ngó qua cả mục Thư rác / Spam) rồi bấm vào link trong thư nhé!'
        );
      }
    } catch (err: any) {
      console.error('[Email Verification Check] Error:', err);
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Could not check activation status right now. Try again in a moment!' : 'Chưa kiểm tra được trạng thái kích hoạt lúc này. Bạn bấm thử lại chút nhé!');
    } finally {
      setIsCheckingVerification(false);
    }
  };

  const handleSendPasswordResetEmail = async () => {
    const targetEmail = (pendingVerifyEmail || regEmail || (loginIdentifier.includes('@') ? loginIdentifier : '')).trim().toLowerCase();
    if (!targetEmail || !auth) return;
    soundFx.playClick();
    vibrateTap();
    setIsSendingResetEmail(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      await sendPasswordResetEmail(auth, targetEmail);
      soundFx.playPacingChime('complete');
      vibrateSuccess();
      setSuccessMsg(
        localLanguage !== 'vi'
          ? `Password reset email sent to ${targetEmail}. Please check your Inbox and SPAM folder.`
          : `Đã gửi email đặt lại mật khẩu tới ${targetEmail}. Vui lòng kiểm tra Hộp thư đến và mục Thư rác (Spam)!`
      );
    } catch (err: any) {
      console.warn('sendPasswordResetEmail err:', err);
      soundFx.playError();
      vibrateError();
      setErrorMsg(
        localLanguage !== 'vi'
          ? `Could not send reset email: ${err?.message || 'Error'}`
          : `Không thể gửi email đặt lại mật khẩu: ${err?.message || 'Lỗi kết nối Firebase'}`
      );
    } finally {
      setIsSendingResetEmail(false);
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
                  setFirebaseEmailStatus('existing_account');
                }
              }
            } else if (signInErr.code === 'auth/wrong-password') {
              setNeedPasswordForResend(true);
              setFirebaseEmailStatus('existing_account');
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
          setFirebaseEmailStatus('sent');
          soundFx.playPacingChime('complete');
          vibrateSuccess();
          setSuccessMsg(
            localLanguage !== 'vi'
              ? `Verification email resent to ${targetEmail}. Please check your inbox or spam folder.`
              : `Đã gửi lại email xác thực thành công tới ${targetEmail}. Vui lòng kiểm tra hộp thư hoặc mục Spam!`
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

      if (!emailSentViaFirebase) {
        soundFx.playError();
        vibrateError();
        setErrorMsg(
          localLanguage !== 'vi'
            ? 'Could not send verification email. Please check your credentials or request a password reset email.'
            : 'Chưa thể gửi email xác thực. Vui lòng nhập mật khẩu xác nhận ở trên hoặc gửi yêu cầu đặt lại mật khẩu.'
        );
      }
    } catch (err: any) {
      console.error('[Resend Email Verification] Error:', err);
      soundFx.playError();
      vibrateError();
      setErrorMsg(
        localLanguage !== 'vi'
          ? 'Error sending verification email. Please check your network and try again.'
          : 'Lỗi gửi email xác thực. Vui lòng kiểm tra kết nối mạng và thử lại sau ít phút.'
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
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter your Student ID (MSSV)/Nickname and Password!' : 'Bạn điền giúp mình MSSV (hoặc Nickname) và Mật khẩu nhé!');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!loginCaptchaAnswer.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Quick check: Please solve the simple math question below!' : 'Bạn tính nhanh phép toán nhỏ bên dưới để vào thi nhé!');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      let isServerAvailable = true;
      let res: Response | null = null;
      let data: any = null;

      try {
        res = await fetch('/api/audience/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            identifier: loginIdentifier.trim(),
            password: loginPassword,
            captchaId: loginCaptchaId,
            captchaAnswer: loginCaptchaAnswer.trim()
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.status === 404 && !contentType.includes('application/json')) {
          // Static file server (e.g. GitHub Pages without Express backend)
          isServerAvailable = false;
        } else {
          data = await res.json();
        }
      } catch (networkErr) {
        console.warn('[OnboardingModal] Backend API unreachable, activating Firebase fallback:', networkErr);
        isServerAvailable = false;
      }

      // -------------------------------------------------------------
      // Static Hosting Mode Fallback (GitHub Pages with direct Firestore)
      // -------------------------------------------------------------
      if (!isServerAvailable) {
        // Validate local CAPTCHA if it was generated client-side
        if (loginCaptchaId.startsWith('local_fallback_')) {
          const expected = loginCaptchaId.replace('local_fallback_', '').trim();
          if (loginCaptchaAnswer.trim() !== expected) {
            setErrorMsg(localLanguage !== 'vi' ? 'CAPTCHA answer is incorrect.' : 'Mã bảo vệ CAPTCHA không chính xác.');
            soundFx.playError();
            vibrateError();
            return;
          }
        }

        const cleanId = loginIdentifier.trim();
        const cleanMssv = cleanId.toUpperCase();
        const uid = `aud_${cleanMssv}`;
        
        let foundUser: UserInfo | null = null;
        let isUserRegistered = false;

        // Check Firestore users collection
        if (db) {
          try {
            const userRef = doc(db, 'users', uid);
            const snap = await getDoc(userRef);
            if (snap.exists()) {
              const uData = snap.data();
              isUserRegistered = true;

              // Verify password if passwordHash exists
              if (uData.passwordHash && uData.salt) {
                const computed = await hashClientPassword(loginPassword, uData.salt);
                if (computed !== uData.passwordHash) {
                  soundFx.playError();
                  vibrateError();
                  setErrorMsg(
                    localLanguage !== 'vi'
                      ? 'Incorrect password. Please try again.'
                      : 'Mật khẩu không chính xác. Vui lòng kiểm tra lại!'
                  );
                  return;
                }
              }

              foundUser = {
                uid: uData.uid || uid,
                name: uData.name || cleanId,
                mssv: uData.mssv || cleanMssv,
                gender: uData.gender,
                birthYear: uData.birthYear,
                anonymizedUid: uData.anonymizedUid || `BTI-${cleanMssv}`,
                teamId: uData.teamId,
                teamName: uData.teamName,
                email: uData.email,
                emailVerified: uData.emailVerified ?? true,
                registeredAt: uData.registeredAt || Date.now()
              };
            }
          } catch (fbErr) {
            console.warn('[OnboardingModal] Firestore lookup error:', fbErr);
          }
        }

        // Check local storage registry fallback
        if (!foundUser) {
          try {
            const rawReg = localStorage.getItem('bti_registered_audience');
            if (rawReg) {
              const regList = JSON.parse(rawReg);
              const localMatch = regList.find((u: any) => u.mssv === cleanMssv || u.username === cleanId.toLowerCase());
              if (localMatch) {
                isUserRegistered = true;
                if (localMatch.passwordHash && localMatch.salt) {
                  const computed = await hashClientPassword(loginPassword, localMatch.salt);
                  if (computed !== localMatch.passwordHash) {
                    soundFx.playError();
                    vibrateError();
                    setErrorMsg(
                      localLanguage !== 'vi'
                        ? 'Incorrect password. Please try again.'
                        : 'Mật khẩu không chính xác. Vui lòng kiểm tra lại!'
                    );
                    return;
                  }
                }
                foundUser = localMatch;
              }
            }
          } catch {}
        }

        // CRITICAL: Reject login if account is NOT registered!
        if (!isUserRegistered || !foundUser) {
          soundFx.playError();
          vibrateError();
          setErrorMsg(
            localLanguage !== 'vi'
              ? 'Looks like you have not signed up yet! Switch to the "Join Now" tab to create your student pass in seconds.'
              : 'Hình như bạn chưa ghi danh lần nào! Chuyển sang tab "Ghi Danh" để tạo tài khoản mới chỉ trong vài giây nhé.'
          );
          return;
        }

        soundFx.playPacingChime('complete');
        vibrateSuccess();
        onComplete(foundUser);
        return;
      }

      if (!res) {
        throw new Error('No response');
      }

      // Check if backend reported account is not registered
      if (res.status === 404 && data?.notRegistered) {
        soundFx.playError();
        vibrateError();
        setErrorMsg(
          data?.error ||
          (localLanguage !== 'vi'
            ? 'Looks like you have not signed up yet! Switch to the "Join Now" tab to create your student pass in seconds.'
            : 'Hình như bạn chưa ghi danh lần nào! Chuyển sang tab "Ghi Danh" để tạo tài khoản mới chỉ trong vài giây nhé.')
        );
        return;
      }

      // Check if user requires email verification before access
      if (!res.ok && data?.requiresEmailVerification) {
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

      if (res.ok && data?.success && data?.user) {
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
        // If local password check failed (401), check if user reset their password via Firebase Auth
        if (res.status === 401 && auth) {
          const checkEmail = (loginIdentifier.includes('@') ? loginIdentifier : pendingVerifyEmail || forgotEmail || '').trim().toLowerCase();
          if (checkEmail) {
            try {
              const fbCred = await signInWithEmailAndPassword(auth, checkEmail, loginPassword);
              if (fbCred.user) {
                // Firebase confirmed valid login with new password! Sync with local server
                const syncRes = await fetch('/api/audience/sync-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: checkEmail,
                    newPassword: loginPassword,
                    captchaId: 'bypass_sync',
                    captchaAnswer: 'bypass_sync'
                  })
                });
                const syncData = await syncRes.json();
                if (syncRes.ok && syncData.success && syncData.user) {
                  soundFx.playPacingChime('complete');
                  vibrateSuccess();
                  const userObj: UserInfo = {
                    uid: syncData.user.uid,
                    name: syncData.user.name,
                    mssv: syncData.user.mssv,
                    gender: syncData.user.gender,
                    birthYear: syncData.user.birthYear,
                    anonymizedUid: syncData.user.anonymizedUid,
                    teamId: syncData.user.teamId,
                    teamName: syncData.user.teamName,
                    email: syncData.user.email,
                    emailVerified: syncData.user.emailVerified ?? true,
                    registeredAt: syncData.user.registeredAt
                  };
                  onComplete(userObj);
                  return;
                }
              }
            } catch (fbErr) {
              console.warn('Firebase login fallback check:', fbErr);
            }
          }
        }

        soundFx.playError();
        vibrateError();
        setErrorMsg(data?.error || (localLanguage !== 'vi' ? 'Invalid credentials.' : 'Thông tin đăng nhập không chính xác.'));
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
      newErrors.name = localLanguage !== 'vi' ? 'Please enter your full name (at least 2 characters).' : 'Bạn nhập đầy đủ họ tên giúp mình nhé (tối thiểu 2 ký tự).';
    } else {
      const nameComp = validateUsernameCompliance(regName);
      if (!nameComp.isValid) {
        newErrors.name = localLanguage !== 'vi' ? 'Please use a polite, appropriate display name.' : (nameComp.messageVi || 'Bạn chọn tên hiển thị lịch sự, phù hợp với sân chơi sinh viên nhé.');
      }
    }
    if (!regMssv.trim()) {
      newErrors.mssv = localLanguage !== 'vi' ? 'Don’t forget your Student ID (MSSV)!' : 'Đừng quên nhập Mã số sinh viên (MSSV) của bạn nhé!';
    }
    if (!regEmail.trim()) {
      newErrors.email = localLanguage !== 'vi' ? 'Please enter your email to receive the activation link.' : 'Bạn nhập thêm email để nhận link kích hoạt tài khoản nhé.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      newErrors.email = localLanguage !== 'vi' ? 'Hmm, that email format looks incomplete (e.g. name@example.com).' : 'Hình như địa chỉ email chưa đúng định dạng (VD: sinhvien@example.com).';
    }
    if (!regGender) {
      newErrors.gender = localLanguage !== 'vi' ? 'Please select an option.' : 'Bạn chọn giúp mình mục này nhé.';
    }
    if (!regBirthYear || regBirthYear.length !== 4) {
      newErrors.birthYear = localLanguage !== 'vi' ? 'Please enter a 4-digit birth year (e.g. 2004).' : 'Bạn nhập năm sinh gồm 4 chữ số nhé (VD: 2004).';
    }
    if (!regPassword || regPassword.length < 6) {
      newErrors.password = localLanguage !== 'vi' ? 'Choose a password with at least 6 characters.' : 'Bạn tạo mật khẩu từ 6 ký tự trở lên cho an toàn nhé.';
    }
    if (regPassword !== regConfirmPassword) {
      newErrors.confirmPassword = localLanguage !== 'vi' ? 'The two passwords do not match yet.' : 'Mật khẩu nhập lại chưa khớp rồi, bạn kiểm tra lại chút nhé.';
    }
    if (!regCaptchaAnswer.trim()) {
      newErrors.captcha = localLanguage !== 'vi' ? 'Please solve the quick math question.' : 'Bạn giải nhanh phép tính nhỏ này nhé.';
    }
    if (!regConsentAgreed) {
      newErrors.consent = localLanguage !== 'vi' 
        ? 'Please tick the box to agree to the event rules and privacy policy.' 
        : 'Bạn tích chọn đồng ý với thể lệ sân chơi và chính sách bảo mật để tiếp tục nhé.';
    }
    if (!regAgeConfirmed) {
      newErrors.age = localLanguage !== 'vi'
        ? 'Please confirm you are 16+ (or have family permission to join).'
        : 'Bạn tích xác nhận đã đủ 16 tuổi trở lên (hoặc có sự đồng ý của gia đình) nhé.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLobbyLocked) {
      soundFx.playError();
      vibrateError();
      setErrorMsg(
        localLanguage !== 'vi'
          ? 'Lobby is currently locked by Administrator. Registration of new audience members is disabled.'
          : 'Cổng tham gia hiện đang bị khóa bởi Ban Tổ Chức. Không thể đăng ký tài khoản khán giả mới lúc này.'
      );
      return;
    }
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
      let fbAccountExisted = false;
      if (auth) {
        try {
          const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
          fbUser = userCred.user;
        } catch (fbErr: any) {
          if (fbErr.code === 'auth/email-already-in-use') {
            fbAccountExisted = true;
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
      let emailVerificationSent = false;
      if (fbUser && !fbUser.emailVerified) {
        try {
          await sendEmailVerification(fbUser);
          emailVerificationSent = true;
        } catch (emailSendErr) {
          console.warn('Firebase sendEmailVerification note:', emailSendErr);
        }
      }

      // 2. Register account on backend server (with static hosting Firestore fallback)
      let isServerAvailable = true;
      let res: Response | null = null;
      let data: any = null;

      try {
        res = await fetch('/api/audience/register', {
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
            captchaAnswer: regCaptchaAnswer.trim(),
            consentGiven: true,
            consentTimestamp: Date.now(),
            consentVersion: PDPD_CONSENT_VERSION,
            ageConfirmation: true
          })
        });

        const contentType = res.headers.get('content-type') || '';
        if (res.status === 404 && !contentType.includes('application/json')) {
          isServerAvailable = false;
        } else {
          data = await res.json();
        }
      } catch (err) {
        console.warn('[OnboardingModal] Backend register unreachable, activating direct Firestore registration');
        isServerAvailable = false;
      }

      if (!isServerAvailable) {
        const cleanMssv = regMssv.trim().toUpperCase();
        const uid = fbUser?.uid || `aud_${cleanMssv}`;

        // Prevent registering an MSSV that already exists
        if (db) {
          try {
            const existingSnap = await getDoc(doc(db, 'users', uid));
            if (existingSnap.exists()) {
              soundFx.playError();
              vibrateError();
              setErrorMsg(
                localLanguage !== 'vi'
                  ? 'This Student ID (MSSV) is already registered. Please switch to the Login tab.'
                  : 'MSSV này đã được đăng ký tài khoản. Vui lòng chuyển sang tab Đăng Nhập!'
              );
              return;
            }
          } catch (checkErr) {
            console.warn('[OnboardingModal] Registration check note:', checkErr);
          }
        }

        const saltBytes = new Uint8Array(8);
        globalThis.crypto.getRandomValues(saltBytes);
        const salt = Array.from(saltBytes, (b) => b.toString(16).padStart(2, '0')).join('');
        const passwordHash = await hashClientPassword(regPassword, salt);

        const userObj: UserInfo = {
          uid,
          name: regName.trim(),
          mssv: cleanMssv,
          gender: regGender,
          birthYear: regBirthYear,
          anonymizedUid: regAnonymizedUid,
          teamId: regTeamId || undefined,
          email: cleanEmail,
          emailVerified: true,
          registeredAt: Date.now(),
          consentGiven: true,
          consentTimestamp: Date.now(),
          consentVersion: PDPD_CONSENT_VERSION,
          ageConfirmation: true
        };

        const storedRecord = {
          ...userObj,
          username: regUsername.trim().toLowerCase() || cleanMssv.toLowerCase(),
          passwordHash,
          salt,
          isRegistered: true
        };

        if (db) {
          try {
            await setDoc(doc(db, 'users', userObj.uid), removeUndefined(storedRecord), { merge: true });
          } catch (e) {
            console.warn('Firestore fallback register note:', e);
          }
        }

        // Cache in local storage registry (exclude sensitive authentication fields)
        try {
          const rawReg = localStorage.getItem('bti_registered_audience');
          const regList = rawReg ? JSON.parse(rawReg) : [];
          const { passwordHash: _passwordHash, salt: _salt, ...cachedRecord } = storedRecord;
          regList.push(cachedRecord);
          localStorage.setItem('bti_registered_audience', JSON.stringify(regList));
        } catch {}

        soundFx.playPacingChime('complete');
        vibrateSuccess();
        onComplete(userObj);
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
        setNeedPasswordForResend(fbAccountExisted && !fbUser);
        setPendingVerifyUser(userObj);
        setResendCooldown(60);
        if (fbAccountExisted && !fbUser) {
          setFirebaseEmailStatus('existing_account');
        } else if (emailVerificationSent) {
          setFirebaseEmailStatus('sent');
        } else {
          setFirebaseEmailStatus(null);
        }

        setActiveTab('EMAIL_VERIFY');

        if (emailVerificationSent) {
          setSuccessMsg(
            localLanguage !== 'vi'
              ? `Registration successful! Verification email sent to ${cleanEmail}. Please check your Inbox and SPAM folder.`
              : `Đăng ký thành công! Email xác thực đã được gửi tới ${cleanEmail}. Vui lòng kiểm tra Hộp thư đến và mục SPAM (Thư rác)!`
          );
        } else if (fbAccountExisted && !fbUser) {
          setSuccessMsg(
            localLanguage !== 'vi'
              ? `Registration successful! This email already exists on Firebase with an older password. You can activate directly using Option 2 (Code: ${data.activationCode || 'BTI2026'}).`
              : `Đăng ký thành công! Email này đã từng tạo trên Firebase với mật khẩu cũ. Bạn có thể kích hoạt trực tiếp ngay bằng Cách 2 bên dưới (Mã: ${data.activationCode || 'BTI2026'})!`
          );
        } else {
          setSuccessMsg(
            localLanguage !== 'vi'
              ? `Registration successful! Please verify your account via email or using the code below.`
              : `Đăng ký tài khoản thành công! Vui lòng xác thực tài khoản qua link email hoặc nhập mã bên dưới.`
          );
        }
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
      if (isLobbyLocked) {
        soundFx.playError();
        vibrateError();
        setErrorMsg(
          localLanguage !== 'vi'
            ? 'Lobby is currently locked by Administrator. New Google registrations are disabled.'
            : 'Cổng tham gia hiện đang bị khóa bởi Ban Tổ Chức. Tài khoản Google mới chưa từng ghi danh không thể đăng ký lúc này.'
        );
        setLoading(false);
        return;
      }

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
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        console.info('[Auth] Google sign-in popup was closed by user.');
        // User intentionally dismissed the popup, no error needed
        return;
      }
      if (err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('cancelled-popup-request')) {
        console.info('[Auth] Google sign-in popup request cancelled.');
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        vibrateError();
        setErrorMsg(localLanguage !== 'vi' 
          ? 'Sign-in popup was blocked by browser. Please allow popups for this site and try again.'
          : 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup và thử lại.');
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        vibrateError();
        setErrorMsg(localLanguage !== 'vi'
          ? 'Current domain is not authorized in Firebase Auth Console.'
          : 'Tên miền hiện tại chưa được cấp quyền trong Firebase Auth Console.');
        return;
      }
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
    if (isLobbyLocked) {
      soundFx.playError();
      vibrateError();
      setErrorMsg(
        localLanguage !== 'vi'
          ? 'Lobby is currently locked by Administrator. Registration of new audience members is disabled.'
          : 'Cổng tham gia hiện đang bị khóa bởi Ban Tổ Chức. Không thể đăng ký tài khoản khán giả mới lúc này.'
      );
      return;
    }
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
    if (isLookupLocked) {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Account status lookup is disabled by Administrator.' : 'Chức năng tra cứu thông tin hiện đang bị khóa bởi Ban Tổ Chức.');
      return;
    }
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
  // 6. Handle Forgot Password - Send Reset Link to Registered Email
  // -------------------------------------------------------------
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please enter a valid registered email.' : 'Vui lòng nhập địa chỉ email đã đăng ký hợp lệ.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotCaptchaAnswer.trim()) {
      setErrorMsg(localLanguage !== 'vi' ? 'Please solve the CAPTCHA challenge.' : 'Vui lòng giải bài toán bảo vệ CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Send genuine password reset email via Firebase Authentication
      let firebaseEmailSent = false;
      if (auth) {
        try {
          await sendPasswordResetEmail(auth, cleanEmail);
          firebaseEmailSent = true;
        } catch (fbErr: any) {
          console.warn('[Forgot Password] Firebase reset email note:', fbErr?.code || fbErr);
        }
      }

      // 2. Request backend to verify account and log reset request (without exposing code)
      let serverConfirmed = false;
      try {
        const res = await fetch('/api/audience/forgot-password/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: cleanEmail,
            captchaId: forgotCaptchaId,
            captchaAnswer: forgotCaptchaAnswer.trim()
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          serverConfirmed = true;
        } else if (!firebaseEmailSent) {
          soundFx.playError();
          vibrateError();
          setErrorMsg(data.error || (localLanguage !== 'vi' ? 'No audience account found with this email.' : 'Không tìm thấy tài khoản khán giả gắn với email này.'));
          return;
        }
      } catch (serverErr) {
        console.warn('Backend forgot-password notice:', serverErr);
      }

      if (firebaseEmailSent || serverConfirmed) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        setForgotStep(2);
        setForgotCooldown(60);
        setSuccessMsg(
          localLanguage !== 'vi'
            ? `Password reset link sent to ${cleanEmail}. Please check your Inbox and SPAM folder.`
            : `Đã gửi liên kết đặt lại mật khẩu đến ${cleanEmail}. Vui lòng kiểm tra Hộp thư đến và mục Thư rác (Spam)!`
        );
      } else {
        soundFx.playError();
        vibrateError();
        setErrorMsg(localLanguage !== 'vi' ? 'Could not find account with this email.' : 'Không tìm thấy tài khoản với email này.');
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setErrorMsg(localLanguage !== 'vi' ? 'Connection error with server.' : 'Lỗi kết nối máy chủ xác thực.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotResend = async () => {
    if (forgotCooldown > 0) return;
    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) return;

    soundFx.playClick();
    vibrateTap();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (auth) {
        await sendPasswordResetEmail(auth, cleanEmail);
      }
      soundFx.playPacingChime('complete');
      vibrateSuccess();
      setForgotCooldown(60);
      setSuccessMsg(
        localLanguage !== 'vi'
          ? `Password reset link resent to ${cleanEmail}. Please check your Inbox and SPAM folder.`
          : `Đã gửi lại liên kết đặt lại mật khẩu đến ${cleanEmail}. Vui lòng kiểm tra Hộp thư đến và mục Thư rác (Spam)!`
      );
    } catch (err: any) {
      soundFx.playError();
      vibrateError();
      setErrorMsg(
        localLanguage !== 'vi'
          ? `Could not resend email: ${err?.message || 'Error'}`
          : `Không thể gửi lại email: ${err?.message || 'Vui lòng thử lại sau ít phút'}`
      );
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div 
      className={`${
        isInline
          ? 'fluent-box p-3.5 sm:p-5 md:p-6 max-w-lg md:max-w-4xl lg:max-w-5xl w-full relative overflow-hidden rounded-[2px] shadow-2xl border border-white/20 text-[#F5EFF9]'
          : 'fluent-dialog relative fluent-box rounded-[3px] p-3.5 sm:p-5 md:p-6 w-full max-w-lg md:max-w-4xl lg:max-w-5xl shadow-2xl flex flex-col text-[#F5EFF9] max-h-[94dvh] overflow-hidden border border-white/20'
      }`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Glow Header Accent (Mirrors Admin PasswordGate) */}
      <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F7CAC9]/15 rounded-full blur-3xl pointer-events-none" />

      {/* Top Full-Width Header Bar */}
      <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-white/10 relative z-10 gap-3">
        {/* Left: Logo & Portal Title */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-[2px] fluent-acrylic-surface border border-sky-400/40 flex items-center justify-center shadow-lg shadow-sky-950/40 text-sky-300 shrink-0">
            <Users className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div className="min-w-0">
            <h1 id="audience-auth-title" className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight uppercase font-mono leading-tight truncate">
              {localLanguage !== 'vi' ? (
                <>Student Check-In <span className="text-sky-300">BTI 2027 Arena</span></>
              ) : (
                <>Trạm Ghi Danh <span className="text-sky-300">Đấu Trường BTI 2027</span></>
              )}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-white/60 font-sans truncate mt-0.5">
              {localLanguage !== 'vi'
                ? 'Ready to compete • 12-Digit Privacy Shield • Leaderboard & Lucky Rewards'
                : 'Sẵn sàng đấu trí • Bảo mật danh tính 12 số • Ghi danh Bảng Vàng & Rinh quà'}
            </p>
          </div>
        </div>

        {/* Right: Actions (Home & Exit) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {(onExit || onClose) && (
            <>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  if (onExit) onExit();
                  else if (onClose) onClose();
                }}
                className="p-1 sm:p-1.5 px-2 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-mono border border-white/10"
                title={localLanguage !== 'vi' ? 'Home' : 'Trang chủ'}
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">{localLanguage !== 'vi' ? 'Home' : 'Trang chủ'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  if (onExit) onExit();
                  else if (onClose) onClose();
                }}
                className="p-1 sm:p-1.5 px-2 rounded-[2px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 transition cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-mono border border-rose-500/40 shadow-sm"
                title={localLanguage !== 'vi' ? 'Exit' : 'Tạm rời'}
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{localLanguage !== 'vi' ? 'Exit' : 'Tạm rời'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Responsive Grid: 1 Col on mobile, 12 Cols on desktop */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 items-start relative z-10 pt-3 sm:pt-4">

        {/* Left Column: Scope Notice, Desktop Feature Cards */}
        <div className="md:col-span-5 flex flex-col justify-between space-y-3 md:border-r md:border-white/10 md:pr-5 lg:pr-7">
          <div className="space-y-3">
            {/* Exclusive Scope / Student Notice Box */}
            <div className="p-2 sm:p-2.5 rounded-[2px] bg-sky-950/30 border border-sky-500/30 text-[10px] sm:text-[11px] text-sky-200/90 leading-relaxed font-sans flex items-start gap-1.5 sm:gap-2">
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0 mt-0.5" />
              <span>
                {localLanguage !== 'vi'
                  ? 'Welcome aboard! Enter your Student ID (MSSV) so we can track your score, rank you privately via your 12-digit code, and enter you into the lucky draw!'
                  : 'Chào mừng bạn nhập cuộc! Nhập đúng MSSV để hệ thống tự động cộng điểm, xếp hạng ẩn danh bằng Mã 12 số và trao quà quay số cuối giờ nhé!'}
              </span>
            </div>

            {/* Desktop Highlights Cards (hidden on mobile, visible on md+) */}
            <div className="hidden md:flex flex-col gap-2 pt-1 text-left">
              <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{localLanguage !== 'vi' ? 'Why Join the Live Arena?' : 'Cùng Cháy Hết Mình Tại Hội Trường'}</span>
              </div>

              <div className="p-2 sm:p-2.5 rounded-[2px] bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-[2px] bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white font-mono">{localLanguage !== 'vi' ? 'Race the Stage Clock' : 'Đua Tốc Độ Từng Giây'}</div>
                  <div className="text-[10px] text-white/60 font-sans leading-tight mt-0.5">
                    {localLanguage !== 'vi' ? 'Tap on your phone and watch your answer sync live to the main stage!' : 'Bấm chọn trên điện thoại, kết quả lên thẳng màn chiếu sân khấu ngay tức thì!'}
                  </div>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-[2px] bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-[2px] bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Fingerprint className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white font-mono">{localLanguage !== 'vi' ? 'Play Boldly, Stay Private' : 'Tự Tin Thi Tài — Giữ Kín Tên Thật'}</div>
                  <div className="text-[10px] text-white/60 font-sans leading-tight mt-0.5">
                    {localLanguage !== 'vi' ? 'Only your 12-digit code appears on the big screen — compete freely with full privacy!' : 'Chỉ hiện Mã 12 số trên màn chiếu lớn — thoải mái bung sức mà không ngại lộ tên!'}
                  </div>
                </div>
              </div>

              <div className="p-2 sm:p-2.5 rounded-[2px] bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-[2px] bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-[11px] font-bold text-white font-mono">{localLanguage !== 'vi' ? 'Climb Leaderboard & Win Prizes' : 'Leo Bảng Vàng & Săn Quà Cực Chất'}</div>
                  <div className="text-[10px] text-white/60 font-sans leading-tight mt-0.5">
                    {localLanguage !== 'vi' ? 'Score fast to top the leaderboard and unlock your lucky draw ticket at the finale!' : 'Trả lời nhanh, tích điểm cao để góp mặt trên Bảng Vàng và nhận vé quay số may mắn!'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Desktop Security Notice Footer */}
          <div className="hidden md:flex items-center justify-between pt-2.5 border-t border-white/10 text-[10px] font-mono text-white/50">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>{localLanguage !== 'vi' ? 'Connected to Live Stage' : 'Sẵn sàng kết nối sân khấu'}</span>
            </span>
            <span>{localLanguage !== 'vi' ? 'Student Privacy Protected' : 'Bảo mật thông tin sinh viên'}</span>
          </div>
        </div>

        {/* Right Column: Mode Tabs, Dynamic Alerts, Active Forms */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-3 sm:space-y-4 min-h-0">
          <div>
            {/* Mode Navigation Tabs (Mirrors Admin Portal Structure) */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-white/5 border border-white/10 rounded-[2px] text-[10px] sm:text-xs font-mono font-bold mb-2 sm:mb-3 select-none">
              <button
                type="button"
                onClick={() => handleTabChange('LOGIN')}
                className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
                  activeTab === 'LOGIN' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                <LogIn className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{localLanguage !== 'vi' ? 'Sign In' : 'Vào Thi'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('REGISTER')}
                className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
                  activeTab === 'REGISTER' || activeTab === 'EMAIL_VERIFY' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                <UserPlus className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{activeTab === 'EMAIL_VERIFY' ? (localLanguage !== 'vi' ? 'Activate' : 'Kích Hoạt') : (localLanguage !== 'vi' ? 'Join Now' : 'Ghi Danh')}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('FORGOT_PASSWORD')}
                className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
                  activeTab === 'FORGOT_PASSWORD' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                <KeyRound className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{localLanguage !== 'vi' ? 'Forgot PW' : 'Quên MK'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('CHECK_STATUS')}
                className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
                  activeTab === 'CHECK_STATUS' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                <Search className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{localLanguage !== 'vi' ? 'My Code' : 'Kiểm Tra Mã'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleTabChange('QUICK_ACCESS')}
                className={`py-1.5 px-0.5 sm:px-1 rounded-[2px] transition flex items-center justify-center gap-0.5 sm:gap-1 cursor-pointer truncate ${
                  activeTab === 'QUICK_ACCESS' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                }`}
              >
                <Fingerprint className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" />
                <span className="truncate">{localLanguage !== 'vi' ? 'Quick Join' : 'Vào Nhanh'}</span>
              </button>
            </div>

            {/* Dynamic Alerts */}
            {isLobbyLocked && (
              <div className="flex items-start gap-2.5 text-rose-200 bg-rose-950/90 p-2.5 sm:p-3 rounded-[2px] border border-rose-500/60 text-[11px] sm:text-xs mb-2 sm:mb-3 animate-fadeIn shadow-lg font-mono">
                <Lock className="w-4 h-4 text-rose-400 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <strong className="text-rose-300 uppercase block font-bold">ĐÃ TẠM KHÉP CỔNG GHI DANH MỚI</strong>
                  <span className="text-[11px] text-rose-200/90 font-sans">
                    Vòng thi đang diễn ra nên Ban Tổ Chức tạm ngưng nhận ghi danh mới. Nếu bạn đã tạo tài khoản rồi, hãy chọn tab <strong>Vào Thi</strong> hoặc <strong>Vào Nhanh</strong> để tiếp tục nhé!
                  </span>
                </div>
              </div>
            )}

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
            <div className="overflow-y-auto custom-scrollbar pr-0.5 sm:pr-1 space-y-3 sm:space-y-4 max-h-[58vh] md:max-h-[64vh]">

          {/* ========================================================= */}
          {/* TAB 1: LOGIN (MSSV / Username + Password + CAPTCHA) */}
          {/* ========================================================= */}
          {activeTab === 'LOGIN' && (
            <div className="space-y-3 sm:space-y-3.5">
              <form onSubmit={handleLoginSubmit} className="space-y-2.5 sm:space-y-3 text-left">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Your Student ID (MSSV) or Nickname' : 'Mã số sinh viên (MSSV) hoặc Nickname của bạn'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={localLanguage !== 'vi' ? 'Enter MSSV (e.g. 22123456) or nickname...' : 'Nhập MSSV (VD: 22123456) hoặc nickname...'}
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                    autoFocus
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                      {localLanguage !== 'vi' ? 'Your Password' : 'Mật khẩu của bạn'} *
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
                    <span>{localLanguage !== 'vi' ? 'Forgot your password?' : 'Lỡ quên mật khẩu?'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('EMAIL_VERIFY')}
                    className="text-white/60 hover:text-white hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Mail className="w-3 h-3" />
                    <span>{localLanguage !== 'vi' ? 'Activate via email' : 'Mở khóa qua email'}</span>
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

                {/* Keep Me Logged In Toggle */}
                <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-white/80 py-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={keepLoggedIn}
                      onChange={(e) => {
                        setKeepLoggedIn(e.target.checked);
                        try {
                          localStorage.setItem('BTI2026_AUDIENCE_KEEP_LOGGED_IN', e.target.checked ? 'true' : 'false');
                        } catch {}
                      }}
                      className="w-3.5 h-3.5 rounded-[2px] bg-[#0D0420] border-white/30 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-sky-500"
                    />
                    <span className="text-sky-200 font-medium">
                      {localLanguage !== 'vi' ? 'Keep me signed in on this device during the show' : 'Nhớ tài khoản trên máy này suốt buổi thi nhé'}
                    </span>
                  </label>
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
                      <LogIn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{localLanguage !== 'vi' ? 'Jump Into the Arena!' : 'Vào Sân Khấu Ngay!'}</span>
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
                <span className="truncate">{localLanguage !== 'vi' ? 'Continue quickly with Google' : 'Vào nhanh bằng tài khoản Google'}</span>
              </button>

              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={() => handleTabChange('REGISTER')}
                  className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:text-white hover:underline cursor-pointer"
                >
                  {localLanguage !== 'vi' ? 'First time at BTI 2027? Create your student pass here!' : 'Lần đầu tham gia BTI 2027? Ghi danh mới tại đây nhé!'}
                </button>
              </div>
            </div>
          )}

          {/* ========================================================= */}
          {/* TAB: FORGOT PASSWORD (Send Secure Password Reset Email) */}
          {/* ========================================================= */}
          {activeTab === 'FORGOT_PASSWORD' && (
            <div className="space-y-3 sm:space-y-3.5 text-left animate-fadeIn">
              <div className="p-2 sm:p-2.5 bg-sky-950/30 border border-sky-500/30 rounded-[2px] text-[10px] sm:text-xs text-sky-200">
                <p className="leading-relaxed font-sans">
                  {localLanguage !== 'vi'
                    ? 'Forgot your password? No worries! Enter the email you used to sign up and we will send you a quick link to set a new one.'
                    : 'Lỡ quên mật khẩu rồi sao? Đừng lo nhé! Chỉ cần nhập lại email bạn đã dùng khi ghi danh, tụi mình sẽ gửi ngay một đường link để bạn đặt lại mật khẩu mới.'}
                </p>
              </div>

              {forgotStep === 1 ? (
                <form onSubmit={handleForgotRequest} className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                      {localLanguage !== 'vi' ? 'Email used when signing up' : 'Email bạn đã dùng khi ghi danh'} *
                    </label>
                    <div className="relative">
                      <input
                        type="email"
                        required
                        placeholder="sinhvien@example.com"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white pl-8 pr-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                        autoFocus
                      />
                      <Mail className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    </div>
                    <p className="text-[9px] sm:text-[10px] text-white/50 mt-1 font-sans">
                      {localLanguage !== 'vi'
                        ? 'We will send a private password reset link straight to this inbox.'
                        : 'Tụi mình sẽ gửi link đổi mật khẩu riêng vào hộp thư này cho bạn nhé.'}
                    </p>
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
                        <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{localLanguage !== 'vi' ? 'Send Me a Reset Link' : 'Gửi Link Đổi Mật Khẩu Cho Mình'}</span>
                        <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-3 sm:space-y-3.5 animate-fadeIn">
                  {/* Visual Header Confirmation */}
                  <div className="p-3 sm:p-3.5 bg-gradient-to-br from-sky-950/60 via-[#0D0420] to-indigo-950/60 border border-sky-500/30 rounded-[2px] text-center space-y-2">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 mx-auto rounded-full bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shadow-lg shadow-sky-950/50">
                      <Mail className="w-5 h-5 sm:w-5.5 sm:h-5.5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-white font-mono uppercase tracking-wider">
                        {localLanguage !== 'vi' ? 'Reset Link Is on Its Way!' : 'Đã Gửi Link Đổi Mật Khẩu Rồi Nhé!'}
                      </h4>
                      <p className="text-[10px] sm:text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                        {localLanguage !== 'vi'
                          ? 'Check your inbox at this address:'
                          : 'Bạn kiểm tra hộp thư tại địa chỉ này nhé:'}
                      </p>
                    </div>

                    <div className="p-1.5 sm:p-2 bg-black/50 border border-sky-500/30 rounded-[2px] flex items-center justify-center gap-2 max-w-sm mx-auto">
                      <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                      <span className="text-xs font-mono font-bold text-sky-200 truncate">
                        {forgotEmail}
                      </span>
                    </div>
                  </div>

                  {/* 3 Step Instructions */}
                  <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-[2px] space-y-1.5 text-[11px] sm:text-xs">
                    <span className="font-mono font-bold text-sky-300 flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>{localLanguage !== 'vi' ? '3 quick steps to get back in:' : '3 bước siêu nhanh để lấy lại mật khẩu:'}</span>
                    </span>
                    <ol className="space-y-1 text-white/75 list-decimal list-inside leading-relaxed font-sans text-[10px] sm:text-[11px]">
                      <li>
                        {localLanguage !== 'vi'
                          ? 'Open your email inbox (remember to check your Spam or Promotions folder too).'
                          : 'Mở hộp thư email của bạn (nhớ ngó qua cả mục Thư rác / Spam hoặc Quảng cáo nếu chưa thấy nhé).'}
                      </li>
                      <li>
                        {localLanguage !== 'vi'
                          ? 'Click the link inside the email to set a new password.'
                          : 'Bấm vào đường link trong thư để nhập mật khẩu mới dễ nhớ hơn.'}
                      </li>
                      <li>
                        {localLanguage !== 'vi'
                          ? 'Once updated, head back to the Sign In tab and jump right into the arena!'
                          : 'Đổi xong rồi thì quay lại tab Vào Thi để tiếp tục tranh tài cùng mọi người nhé!'}
                      </li>
                    </ol>
                  </div>

                  {/* Resend button with cooldown */}
                  <button
                    type="button"
                    onClick={handleForgotResend}
                    disabled={loading || forgotCooldown > 0}
                    className="w-full bg-white/10 hover:bg-white/15 disabled:opacity-40 text-white/90 font-mono text-xs py-2 px-3 rounded-[2px] transition flex items-center justify-center gap-2 border border-white/10 cursor-pointer"
                  >
                    {loading ? (
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5 text-sky-400" />
                        <span>
                          {forgotCooldown > 0
                            ? (localLanguage !== 'vi' ? `Resend link in ${forgotCooldown}s` : `Gửi lại link sau ${forgotCooldown}s`)
                            : (localLanguage !== 'vi' ? 'Didn’t get it? Resend Reset Link' : 'Chưa thấy thư? Gửi lại link cho mình')}
                        </span>
                      </>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="text-[10px] sm:text-[11px] font-mono text-white/60 hover:text-white underline cursor-pointer"
                    >
                      {localLanguage !== 'vi' ? '← Use another email' : '← Nhập lại email khác'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTabChange('LOGIN')}
                      className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:text-white hover:underline cursor-pointer"
                    >
                      {localLanguage !== 'vi' ? 'Back to Sign In →' : 'Quay lại Vào Thi →'}
                    </button>
                  </div>
                </div>
              )}
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
                  <span className="truncate">{localLanguage !== 'vi' ? 'Connected Google:' : 'Đã kết nối Google:'} <strong>{googleLinkedEmail}</strong></span>
                </div>
              )}

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? 'Your Full Name' : 'Họ và tên đầy đủ của bạn'} *
                </label>
                <input
                  type="text"
                  placeholder={localLanguage !== 'vi' ? 'e.g. Nguyen Minh Anh (for prize verification)' : 'VD: Nguyễn Minh Anh (để BTC trao giải chính xác nhé)'}
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
                    {localLanguage !== 'vi' ? 'Student or Personal Email (for activation link)' : 'Email sinh viên hoặc cá nhân (nhận link kích hoạt)'} *
                  </label>
                  <span className="text-[9px] text-amber-300/90 font-mono">{localLanguage !== 'vi' ? 'Required' : 'Cần thiết'}</span>
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
                    ? 'We will send a quick activation link to this email right after you sign up.'
                    : 'Tụi mình sẽ gửi một link kích hoạt ngắn gọn vào email này ngay sau khi bạn bấm Ghi Danh.'}
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Student ID (MSSV)' : 'Mã số sinh viên (MSSV)'} *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: 22123456"
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
                    {localLanguage !== 'vi' ? 'Easy Nickname (Optional)' : 'Nickname dễ nhớ (Tùy chọn)'}
                  </label>
                  <input
                    type="text"
                    placeholder={regMssv ? regMssv.toLowerCase() : 'nickname'}
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
                      {localLanguage !== 'vi' ? 'Create Password' : 'Tạo mật khẩu'} *
                    </label>
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Từ 6 ký tự trở lên"
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
                      {localLanguage !== 'vi' ? 'Confirm Password' : 'Nhập lại mật khẩu'} *
                    </label>
                  </div>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    placeholder="Gõ lại mật khẩu vừa tạo"
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
                    <span className="truncate">{localLanguage !== 'vi' ? 'Your 12-Digit Privacy Code' : 'Mã Định Danh Ẩn Danh (12 số) Của Bạn'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!regName.trim() || !regMssv.trim()) {
                        setErrorMsg(localLanguage !== 'vi' ? 'Please fill in your Name and MSSV first!' : 'Bạn điền Họ tên và MSSV ở trên trước nhé!');
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
                    <span>{localLanguage !== 'vi' ? 'Refresh' : 'Đổi mã'}</span>
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
                    ? 'This 12-digit code represents you on the big screen and Leaderboard — keeping your real name private!'
                    : 'Mã 12 số này sẽ đại diện cho bạn trên màn chiếu lớn và Bảng Vàng — vừa ngầu vừa giữ kín tên thật!'}
                </p>
              </div>

              {/* Team selection (if enabled) */}
              {teamModeActive && teams && teams.length > 0 && !randomTeamAssignment && (
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Which Contestant Are You Cheering For?' : 'Bạn muốn tiếp lửa cho Thí sinh nào?'}
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

              {/* Keep Me Logged In Toggle */}
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-white/80 py-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(e) => {
                      setKeepLoggedIn(e.target.checked);
                      try {
                        localStorage.setItem('BTI2026_AUDIENCE_KEEP_LOGGED_IN', e.target.checked ? 'true' : 'false');
                      } catch {}
                    }}
                    className="w-3.5 h-3.5 rounded-[2px] bg-[#0D0420] border-white/30 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-sky-500"
                  />
                  <span className="text-sky-200 font-medium">
                    {localLanguage !== 'vi' ? 'Keep me signed in on this device' : 'Nhớ tài khoản trên máy này suốt buổi thi nhé'}
                  </span>
                </label>
              </div>

              {/* PDPD Consent Checkbox & Legal Transparency Card */}
              <div className={`p-3 sm:p-3.5 rounded-[2px] border transition-all text-left ${
                errors.consent || errors.age
                  ? 'bg-rose-950/40 border-rose-500 shadow-md shadow-rose-950/50'
                  : 'bg-gradient-to-b from-[#1E0B38]/90 to-[#120524]/90 border-sky-400/30'
              }`}>
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
                  <div className="flex items-center gap-1.5 text-sky-300 font-mono text-[11px] font-bold">
                    <ShieldCheck className="w-4 h-4 text-sky-400 shrink-0" />
                    <span className="uppercase tracking-wider">
                      {localLanguage !== 'vi' ? 'Fair Play & Privacy Commitment' : 'Cam Kết Tham Gia Văn Minh & Bảo Mật'}
                    </span>
                  </div>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-sky-500/15 border border-sky-400/30 text-sky-200">
                    {localLanguage !== 'vi' ? 'Safe & Transparent' : 'Bảo mật thông tin'}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {/* Checkbox 1: Age Confirmation */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      id="checkbox-reg-age"
                      checked={regAgeConfirmed}
                      onChange={(e) => {
                        setRegAgeConfirmed(e.target.checked);
                        if (errors.age) setErrors({ ...errors, age: undefined });
                      }}
                      className="w-4 h-4 mt-0.5 rounded-[2px] bg-[#0D0420] border-white/30 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-sky-500 shrink-0 group-hover:border-sky-400"
                    />
                    <span className="text-[10px] sm:text-[11px] text-white/90 font-sans leading-snug">
                      {localLanguage !== 'vi' 
                        ? 'I confirm I am 16 or older (or have family permission to join the event).' 
                        : 'Mình xác nhận đã đủ 16 tuổi trở lên (hoặc đã được gia đình đồng ý cho tham gia chương trình).'} <span className="text-rose-400 font-bold">*</span>
                    </span>
                  </label>
                  {errors.age && (
                    <p className="text-[10px] text-rose-300 pl-6 flex items-center gap-1 font-mono">
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{errors.age}</span>
                    </p>
                  )}

                  {/* Checkbox 2: Consent to Policy & Contest Terms */}
                  <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                    <input
                      type="checkbox"
                      id="checkbox-reg-consent"
                      checked={regConsentAgreed}
                      onChange={(e) => {
                        setRegConsentAgreed(e.target.checked);
                        if (errors.consent) setErrors({ ...errors, consent: undefined });
                      }}
                      className="w-4 h-4 mt-0.5 rounded-[2px] bg-[#0D0420] border-white/30 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-sky-500 shrink-0 group-hover:border-sky-400"
                    />
                    <span className="text-[10px] sm:text-[11px] text-white/90 font-sans leading-snug">
                      {localLanguage !== 'vi' ? 'I have reviewed and agree to the ' : 'Mình đã xem qua và đồng ý với '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowPrivacyModal(true);
                        }}
                        className="text-sky-300 hover:text-sky-200 underline font-semibold cursor-pointer"
                      >
                        {localLanguage !== 'vi' ? 'Data Privacy Policy' : 'Chính Sách Bảo Mật Dữ Liệu'}
                      </button>
                      {localLanguage !== 'vi' ? ' and ' : ' cùng '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowTermsModal(true);
                        }}
                        className="text-sky-300 hover:text-sky-200 underline font-semibold cursor-pointer"
                      >
                        {localLanguage !== 'vi' ? 'BTI 2027 Arena Rules' : 'Thể Lệ Sân Chơi BTI 2027'}
                      </button>. <span className="text-rose-400 font-bold">*</span>
                    </span>
                  </label>
                  {errors.consent && (
                    <p className="text-[10px] text-rose-300 pl-6 flex items-center gap-1 font-mono">
                      <AlertCircle className="w-3 h-3 text-rose-400 shrink-0" />
                      <span>{errors.consent}</span>
                    </p>
                  )}

                  {/* Direct link to standalone policy page */}
                  <div className="pt-1 flex items-center justify-between text-[10px] font-mono text-white/50 pl-6 border-t border-white/5">
                    <span>Phiên bản: v{PDPD_CONSENT_VERSION} • Tuân thủ Luật 91/2025 &amp; NĐ 356/2025</span>
                    <a
                      href="/policy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-300 hover:text-sky-100 flex items-center gap-1 hover:underline"
                    >
                      <span>{localLanguage !== 'vi' ? 'Read full policy' : 'Xem chi tiết quy định'}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>

              {isLobbyLocked ? (
                <div className="w-full py-2.5 sm:py-3 rounded-[2px] bg-rose-950/80 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed select-none font-mono shadow-md">
                  <Lock className="w-4 h-4 text-rose-400 animate-pulse" />
                  <span>{localLanguage !== 'vi' ? 'SIGN-UP PAUSED WHILE ROUND IS LIVE' : 'ĐANG TẠM DỪNG GHI DANH TRONG LÚC THI'}</span>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !regConsentAgreed}
                  className={`w-full font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md flex items-center justify-center gap-2 font-mono ${
                    loading || !regConsentAgreed
                      ? 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60 border border-white/5'
                      : 'bg-sky-600 hover:bg-sky-500 active:scale-98 text-white shadow-sky-950/40 cursor-pointer'
                  }`}
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      <span>{localLanguage !== 'vi' ? 'Complete Sign-Up & Join In!' : 'Hoàn Tất Ghi Danh & Nhập Cuộc!'}</span>
                      <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </>
                  )}
                </button>
              )}
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
                    {localLanguage !== 'vi' ? 'Just One Quick Step to Enter the Stage!' : 'Chỉ Còn 1 Bước Nhỏ Để Vào Sân Khấu!'}
                  </h4>
                  <p className="text-[10px] sm:text-[11px] text-white/70 mt-0.5 font-sans leading-relaxed">
                    {localLanguage !== 'vi'
                      ? 'We just sent a quick confirmation email to:'
                      : 'Tụi mình vừa gửi một thư xác nhận tới địa chỉ email của bạn:'}
                  </p>
                </div>

                {/* Target Email Box */}
                <div className="p-1.5 sm:p-2 bg-black/50 border border-sky-500/30 rounded-[2px] flex items-center justify-between gap-2 max-w-sm mx-auto">
                  <div className="flex items-center gap-1.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                    <span className="text-xs font-mono font-bold text-sky-200 truncate">
                      {pendingVerifyEmail || 'sinhvien@example.com'}
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
                    title="Sao chép email"
                  >
                    {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Step-by-Step Instructions */}
              <div className="p-2.5 sm:p-3 bg-white/5 border border-white/10 rounded-[2px] space-y-1.5 text-[11px] sm:text-xs">
                <span className="font-mono font-bold text-sky-300 flex items-center gap-1.5">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>{localLanguage !== 'vi' ? 'How to activate in seconds:' : 'Cách kích hoạt siêu nhanh:'}</span>
                </span>
                <ol className="space-y-1 text-white/75 list-decimal list-inside leading-relaxed font-sans text-[10px] sm:text-[11px]">
                  <li>
                    {localLanguage !== 'vi'
                      ? 'Open your email inbox (remember to check your Spam or Promotions folder too).'
                      : 'Mở hộp thư email của bạn (nhớ kiểm tra cả mục Thư rác / Spam hoặc Quảng cáo nhé).'}
                  </li>
                  <li>
                    {localLanguage !== 'vi'
                      ? 'Tap the confirmation link inside the email.'
                      : 'Bấm vào đường link xác nhận bên trong thư.'}
                  </li>
                  <li>
                    {localLanguage !== 'vi'
                      ? 'Come right back here and tap "I Clicked the Activation Link!" below.'
                      : 'Quay lại đây và bấm nút "Mình Đã Bấm Link Kích Hoạt Rồi!" bên dưới để vào thi ngay.'}
                  </li>
                </ol>
              </div>

              {/* Special notice if email already existed on Firebase with older password */}
              {firebaseEmailStatus === 'existing_account' && (
                <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-[2px] space-y-2 text-[10px] sm:text-[11px] text-amber-200 animate-fadeIn">
                  <div className="font-bold flex items-center gap-1.5 text-amber-300 font-mono">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{localLanguage !== 'vi' ? 'Welcome back! This email was used before' : 'À, email này đã từng tham gia trước đây rồi!'}</span>
                  </div>
                  <p className="leading-relaxed text-white/80 font-sans">
                    {localLanguage !== 'vi'
                      ? 'This email already has an account from an earlier session. If you forgot your old password, tap below to get a fresh password reset link!'
                      : 'Email này đã có sẵn tài khoản từ đợt trước. Nếu bạn không nhớ mật khẩu cũ, bấm nút bên dưới để nhận link tạo mật khẩu mới nhé!'}
                  </p>
                  <div className="flex items-center gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={handleSendPasswordResetEmail}
                      disabled={isSendingResetEmail}
                      className="px-2.5 py-1.5 bg-amber-600/80 hover:bg-amber-600 disabled:opacity-50 text-white font-mono text-[10px] font-bold rounded-[2px] transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                    >
                      {isSendingResetEmail ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-3 h-3" />
                          <span>{localLanguage !== 'vi' ? 'Send Password Reset Link' : 'Nhận Link Đặt Mật Khẩu Mới'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Password Confirmation Field (if Firebase session needs re-authentication) */}
              {(needPasswordForResend || !auth?.currentUser) && (
                <div className="p-2.5 sm:p-3 bg-amber-500/10 border border-amber-500/30 rounded-[2px] space-y-1.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-amber-200">
                      {localLanguage !== 'vi' ? 'Your Password (to resend activation email):' : 'Nhập lại mật khẩu của bạn (để gửi lại thư):'}
                    </label>
                    <span className="text-[9px] text-amber-300 font-mono">{localLanguage !== 'vi' ? 'For resend' : 'Để gửi lại'}</span>
                  </div>
                  <div className="relative">
                    <input
                      type={showVerifyPassword ? 'text' : 'password'}
                      placeholder={localLanguage !== 'vi' ? 'Enter your password...' : 'Nhập mật khẩu của bạn...'}
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
                      <span>{localLanguage !== 'vi' ? 'I Clicked the Activation Link!' : 'Mình Đã Bấm Link Kích Hoạt Rồi!'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>

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
                          ? (localLanguage !== 'vi' ? `Resend email in ${resendCooldown}s` : `Gửi lại thư sau ${resendCooldown}s`)
                          : (localLanguage !== 'vi' ? 'Didn’t get it? Resend Email' : 'Chưa thấy thư? Gửi lại cho mình')}
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
                    {localLanguage !== 'vi' ? '← Edit Email / Info' : '← Sửa lại email / thông tin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTabChange('LOGIN')}
                    className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:text-white hover:underline cursor-pointer"
                  >
                    {localLanguage !== 'vi' ? 'Back to Sign In →' : 'Về trang Vào Thi →'}
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
              {isLookupLocked ? (
                <div className="p-3.5 sm:p-4 rounded-[3px] bg-rose-950/80 border border-rose-500/50 text-rose-200 space-y-2 font-mono shadow-lg">
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase">
                    <ShieldAlert className="w-4 h-4 text-rose-400 animate-pulse shrink-0" />
                    <span>{localLanguage !== 'vi' ? 'PRIVACY SHIELD ACTIVE' : 'ĐANG TẠM KHÓA TRA CỨU ĐỂ BẢO MẬT'}</span>
                  </div>
                  <p className="text-[11px] text-rose-100/90 leading-relaxed font-sans">
                    {localLanguage !== 'vi'
                      ? 'While the round is heating up, profile lookup is temporarily paused by the Organizers to keep everyone’s info private!'
                      : 'Trong lúc vòng thi đang gay cấn, Ban Tổ Chức tạm ẩn tính năng tra cứu để bảo vệ thông tin cho các bạn sinh viên nhé!'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleCheckStatus} className="space-y-2 sm:space-y-3">
                  <p className="text-[10px] sm:text-xs text-white/60 leading-relaxed font-mono">
                    {localLanguage !== 'vi'
                      ? 'Forgot your 12-digit code or checking if you are signed up? Enter your MSSV, Nickname, or Email below!'
                      : 'Quên mất Mã 12 số hoặc muốn kiểm tra xem mình đã ghi danh chưa? Nhập MSSV, Nickname hoặc Email vào đây để xem ngay nhé!'}
                  </p>

                  <div className="flex gap-1.5 sm:gap-2">
                    <input
                      type="text"
                      required
                      placeholder={localLanguage !== 'vi' ? 'Type your MSSV, Nickname, or 12-digit code...' : 'Gõ MSSV, Nickname hoặc Mã 12 số của bạn...'}
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
                          <span>{localLanguage !== 'vi' ? 'Check' : 'Kiểm Tra'}</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {checkResult && (
                <div className="animate-fadeIn mt-2 sm:mt-3">
                  {checkResult.notFound ? (
                    <div className="p-2.5 sm:p-3 bg-rose-950/40 border border-rose-500/30 rounded-[2px] text-xs text-rose-300">
                      <div className="flex items-center gap-2 font-bold mb-1 font-mono">
                        <AlertCircle className="w-4 h-4 text-rose-400" />
                        <span>{localLanguage !== 'vi' ? 'Not Found Yet!' : 'Chưa tìm thấy thông tin của bạn rồi!'}</span>
                      </div>
                      <p className="text-rose-200/80 text-[10px] sm:text-[11px] leading-relaxed">
                        {localLanguage !== 'vi'
                          ? `No student pass matches "${checkResult.query}" yet. Tap below to sign up in just a few seconds!`
                          : `Chưa có hồ sơ nào khớp với "${checkResult.query}". Bạn bấm nút bên dưới để ghi danh mới chỉ trong vài giây nhé!`}
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
                        <span>{localLanguage !== 'vi' ? 'Sign up now with this MSSV' : 'Ghi danh ngay với MSSV này'}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="p-2.5 sm:p-3.5 bg-emerald-950/30 border border-emerald-500/30 rounded-[2px] space-y-2 text-xs">
                      <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-300 font-mono text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400 shrink-0" />
                          <span>{localLanguage !== 'vi' ? 'You Are Registered & Ready!' : 'Bạn Đã Có Tên Trong Đấu Trường!'}</span>
                        </div>
                        <span className="text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          {checkResult.authProvider === 'google' ? 'Google SSO' : 'Tài khoản BTI'}
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
                          <span className="text-white/50 block">{localLanguage !== 'vi' ? '12-Digit Privacy Code:' : 'Mã định danh 12 số:'}</span>
                          <span className="font-bold text-sky-300 tracking-wider truncate block">{checkResult.anonymizedUid}</span>
                        </div>
                        {checkResult.registeredAt && (
                          <div className="col-span-2">
                            <span className="text-white/50 block">{localLanguage !== 'vi' ? 'Signed up at:' : 'Thời gian ghi danh:'}</span>
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
                        <span>{localLanguage !== 'vi' ? 'Sign In With This Account' : 'Vào Thi Với Tài Khoản Này Ngay'}</span>
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
                    ? 'Saved your 12-digit code? Enter your MSSV and 12-digit code below to jump straight into the stage without a password!'
                    : 'Đã lưu sẵn Mã 12 số của mình rồi? Nhập nhanh MSSV kèm Mã 12 số bên dưới để vào thẳng sân khấu mà không cần gõ mật khẩu nhé!'}
                </p>
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? 'Your Student ID (MSSV)' : 'Mã số sinh viên (MSSV) của bạn'} *
                </label>
                <input
                  type="text"
                  required
                  placeholder="VD: 22123456"
                  value={quickMssv}
                  onChange={(e) => setQuickMssv(e.target.value.toUpperCase())}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition uppercase placeholder:normal-case placeholder:font-normal placeholder:text-white/30 placeholder:text-xs"
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? 'Your Saved 12-Digit Code' : 'Mã Định Danh 12 Số đã lưu'} *
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

              {/* Keep Me Logged In Toggle */}
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono text-white/80 py-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={keepLoggedIn}
                    onChange={(e) => {
                      setKeepLoggedIn(e.target.checked);
                      try {
                        localStorage.setItem('BTI2026_AUDIENCE_KEEP_LOGGED_IN', e.target.checked ? 'true' : 'false');
                      } catch {}
                    }}
                    className="w-3.5 h-3.5 rounded-[2px] bg-[#0D0420] border-white/30 text-sky-500 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-sky-500"
                  />
                  <span className="text-sky-200 font-medium">
                    {localLanguage !== 'vi' ? 'Keep me signed in on this device' : 'Nhớ tài khoản trên máy này suốt buổi thi nhé'}
                  </span>
                </label>
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
                    <span>{localLanguage !== 'vi' ? 'Jump Right In!' : 'Vào Thẳng Sân Khấu!'}</span>
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
                    ? 'Awesome! Add your Student ID (MSSV) below so we can create your 12-digit privacy code and track your score & prizes!'
                    : 'Tuyệt vời! Bạn bổ sung thêm MSSV bên dưới để hệ thống tạo Mã 12 số ẩn danh, cộng điểm và trao giải chính xác cho bạn nhé!'}
                </span>
              </div>

              {/* Name & MSSV */}
              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  {localLanguage !== 'vi' ? 'Your Full Name' : 'Họ và tên đầy đủ của bạn'} *
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
                  placeholder="VD: 22123456"
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
                    <span className="truncate">{localLanguage !== 'vi' ? 'Your 12-Digit Privacy Code' : 'Mã Định Danh Ẩn Danh (12 số) Của Bạn'}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (!gVerName.trim() || !gVerMssv.trim()) {
                        setErrorMsg(localLanguage !== 'vi' ? 'Please fill in your Name and MSSV first!' : 'Bạn điền Họ tên và MSSV ở trên trước nhé!');
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
                    <span>{localLanguage !== 'vi' ? 'Refresh' : 'Đổi mã'}</span>
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
                    ? 'This 12-digit code represents you on the big screen and Leaderboard — keeping your real name private!'
                    : 'Mã 12 số này sẽ đại diện cho bạn trên màn chiếu lớn và Bảng Vàng — vừa ngầu vừa giữ kín tên thật!'}
                </p>
              </div>

              {/* Team selection (if enabled) */}
              {teamModeActive && teams && teams.length > 0 && !randomTeamAssignment && (
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    {localLanguage !== 'vi' ? 'Which Contestant Are You Cheering For?' : 'Bạn muốn tiếp lửa cho Thí sinh nào?'}
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
                    <span className="truncate">{localLanguage !== 'vi' ? 'All Set, Let’s Go!' : 'Xong Rồi, Vào Sân Khấu Thôi!'}</span>
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
                  {localLanguage !== 'vi' ? '← Back to Sign In' : '← Quay lại trang Vào Thi'}
                </button>
              </div>
            </form>
          )}

            </div>
          </div>

          {/* Mobile Footer Exit button */}
          {(onExit || onClose) && (
            <div className="md:hidden pt-2 sm:pt-3 border-t border-white/10 text-center">
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
                <span>{localLanguage !== 'vi' ? 'Back to BTI 2027 Home' : 'Quay về Trang Chủ BTI 2027'}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <PrivacyPolicyModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
      />
      <TermsOfServiceModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />
    </div>
  );

  if (isInline) {
    return (
      <div className="flex-1 min-h-[calc(100dvh-4rem)] flex items-start sm:items-center justify-center p-2.5 sm:p-4 py-3 sm:py-6 bg-transparent select-none overflow-y-auto">
        {content}
      </div>
    );
  }

  return (
    <div 
      className="fluent-dialog-overlay z-[60] animate-fadeIn flex items-start sm:items-center justify-center p-2 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audience-auth-title"
      onClick={onClose}
    >
      {content}
    </div>
  );
};
