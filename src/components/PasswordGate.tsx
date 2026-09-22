import React, { useState, useCallback, useEffect } from 'react';
import { 
  Lock, 
  ArrowRight, 
  ArrowLeft, 
  ShieldAlert, 
  KeyRound, 
  Eye, 
  EyeOff, 
  UserPlus, 
  LogIn, 
  LogOut, 
  Search, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Shield, 
  Sparkles, 
  Copy, 
  Check, 
  ShieldCheck, 
  RefreshCw,
  Mail,
  Send,
  ExternalLink,
  Monitor,
  Cpu,
  Zap
} from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateError } from '../utils/hapticUtils';
import { AdminUser, TechnicalRole, TECHNICAL_ROLES } from '../types';
import { CaptchaChallenge } from './CaptchaChallenge';
import { auth } from '../firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail
} from 'firebase/auth';

interface PasswordGateProps {
  isAuthenticated: boolean;
  onAuthenticated: (user?: AdminUser) => void;
  viewName: string;
  onExit?: () => void;
  children: React.ReactNode;
}

type GateTab = 'LOGIN' | 'REGISTER' | 'EMAIL_VERIFY' | 'FORGOT_PASSWORD' | 'CHECK_STATUS' | 'MASTER_KEY';

export const PasswordGate: React.FC<PasswordGateProps> = ({
  isAuthenticated,
  onAuthenticated,
  viewName,
  onExit,
  children
}) => {
  const [activeTab, setActiveTab] = useState<GateTab>('LOGIN');

  // Login Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginCaptchaId, setLoginCaptchaId] = useState('');
  const [loginCaptchaAnswer, setLoginCaptchaAnswer] = useState('');

  // Register Form State
  const [regFullName, setRegFullName] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regTechnicalRole, setRegTechnicalRole] = useState<TechnicalRole>('SERVER_OPERATOR');
  const [regNote, setRegNote] = useState('');
  const [regCaptchaId, setRegCaptchaId] = useState('');
  const [regCaptchaAnswer, setRegCaptchaAnswer] = useState('');

  // Firebase Email Verification State
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState('');
  const [pendingVerifyUsername, setPendingVerifyUsername] = useState('');
  const [cachedAuthPassword, setCachedAuthPassword] = useState('');
  const [isCheckingAdminVerification, setIsCheckingAdminVerification] = useState(false);
  const [isResendingAdminEmail, setIsResendingAdminEmail] = useState(false);
  const [adminResendCooldown, setAdminResendCooldown] = useState(0);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotCaptchaId, setForgotCaptchaId] = useState('');
  const [forgotCaptchaAnswer, setForgotCaptchaAnswer] = useState('');
  const [forgotCooldown, setForgotCooldown] = useState(0);
  const [isSendingResetEmail, setIsSendingResetEmail] = useState(false);
  const [resetEmailDispatched, setResetEmailDispatched] = useState(false);

  // Cooldown countdown for email resend and password reset
  useEffect(() => {
    if (adminResendCooldown <= 0 && forgotCooldown <= 0) return;
    const timer = setInterval(() => {
      setAdminResendCooldown(prev => Math.max(0, prev - 1));
      setForgotCooldown(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [adminResendCooldown, forgotCooldown]);

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

  // Status Check State
  const [checkQuery, setCheckQuery] = useState('');
  const [checkResult, setCheckResult] = useState<any | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  // Master Key Emergency State
  const [masterPasscode, setMasterPasscode] = useState('');
  const [showMasterPasscode, setShowMasterPasscode] = useState(false);

  // General Status State
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  // 1. Handle Standard Login (Username + Password + CAPTCHA)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    if (!loginCaptchaAnswer.trim()) {
      setError('Vui lòng giải bài toán CAPTCHA để xác thực bảo mật.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
          captchaId: loginCaptchaId,
          captchaAnswer: loginCaptchaAnswer.trim()
        })
      });

      const data = await res.json();

      // Check if technical admin requires email verification
      if (!res.ok && data.requiresEmailVerification) {
        soundFx.playError();
        vibrateError();
        setPendingVerifyEmail(data.email || '');
        setPendingVerifyUsername(data.username || username.trim());
        setCachedAuthPassword(password);
        setActiveTab('EMAIL_VERIFY');
        setError(data.error || 'Tài khoản kỹ thuật của bạn cần xác thực email do Firebase gửi.');
        return;
      }

      if (res.ok && data.success) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        if (data.token) {
          sessionStorage.setItem('BTI2026_ADMIN_TOKEN', data.token);
        }
        if (data.user) {
          sessionStorage.setItem('BTI2026_TECH_USER', JSON.stringify(data.user));
        }
        onAuthenticated(data.user);
      } else {
        // Auto-sync fallback: if user recently reset password via Firebase email
        let synced = false;
        if (auth && (data.error?.includes('mật khẩu') || res.status === 401)) {
          try {
            let targetEmail = username.includes('@') ? username.trim().toLowerCase() : '';
            if (!targetEmail) {
              const checkRes = await fetch(`/api/admin/check-status/${encodeURIComponent(username.trim())}`);
              const checkData = await checkRes.json();
              if (checkData.exists && checkData.email) {
                targetEmail = checkData.email;
              }
            }
            if (targetEmail) {
              const fbCred = await signInWithEmailAndPassword(auth, targetEmail, password);
              if (fbCred.user) {
                const syncRes = await fetch('/api/admin/sync-password', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: targetEmail,
                    username: username.trim(),
                    newPassword: password
                  })
                });
                if (syncRes.ok) {
                  const retryRes = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      username: username.trim(),
                      password,
                      captchaId: 'bypass_direct',
                      captchaAnswer: 'bypass_direct'
                    })
                  });
                  const retryData = await retryRes.json();
                  if (retryRes.ok && retryData.success) {
                    synced = true;
                    soundFx.playPacingChime('complete');
                    vibrateSuccess();
                    if (retryData.token) sessionStorage.setItem('BTI2026_ADMIN_TOKEN', retryData.token);
                    if (retryData.user) sessionStorage.setItem('BTI2026_TECH_USER', JSON.stringify(retryData.user));
                    onAuthenticated(retryData.user);
                    return;
                  }
                }
              }
            }
          } catch {
            // Standard incorrect credentials
          }
        }

        if (!synced) {
          soundFx.playError();
          vibrateError();
          setError(data.error || 'Đăng nhập không thành công. Vui lòng thử lại.');
        }
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setError('Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Handle Google Sign-In for Technical Team
  const handleGoogleAuth = async (isRegisteringMode = false) => {
    soundFx.playClick();
    vibrateTap();
    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!auth) {
        throw new Error('Firebase Auth chưa được kích hoạt.');
      }
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const googleUser = result.user;

      const res = await fetch('/api/admin/google-auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: googleUser.uid,
          email: googleUser.email,
          displayName: googleUser.displayName,
          technicalRole: regTechnicalRole,
          note: regNote,
          isRegistering: isRegisteringMode
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        if (data.token) {
          sessionStorage.setItem('BTI2026_ADMIN_TOKEN', data.token);
        }
        if (data.user) {
          sessionStorage.setItem('BTI2026_TECH_USER', JSON.stringify(data.user));
        }
        onAuthenticated(data.user);
      } else if (data.status === 'PENDING') {
        soundFx.playClick();
        vibrateSuccess();
        setSuccessMsg(data.message || 'Tài khoản Google đã gửi yêu cầu. Vui lòng đợi Trưởng Ban Kỹ Thuật phê duyệt.');
      } else {
        soundFx.playError();
        vibrateError();
        setError(data.error || 'Xác thực Google không thành công.');
      }
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.message?.includes('popup-closed-by-user')) {
        console.info('[Auth Admin] Google sign-in popup was closed by user.');
        return;
      }
      if (err?.code === 'auth/cancelled-popup-request' || err?.message?.includes('cancelled-popup-request')) {
        console.info('[Auth Admin] Google sign-in popup request cancelled.');
        return;
      }
      if (err?.code === 'auth/popup-blocked') {
        soundFx.playError();
        vibrateError();
        setError('Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup và thử lại.');
        return;
      }
      if (err?.code === 'auth/unauthorized-domain') {
        soundFx.playError();
        vibrateError();
        setError('Tên miền hiện tại chưa được cấp quyền trong Firebase Auth Console.');
        return;
      }
      console.error('Google Auth Error:', err);
      soundFx.playError();
      vibrateError();
      setError(err.message || 'Lỗi khi đăng nhập bằng Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Registration with Firebase Email Verification
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regUsername.trim() || !regEmail.trim() || !regPassword) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail.trim())) {
      setError('Địa chỉ email không hợp lệ.');
      return;
    }
    if (regPassword.length < 6) {
      setError('Mật khẩu phải có độ dài từ 6 ký tự trở lên.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }
    if (!regCaptchaAnswer.trim()) {
      setError('Vui lòng giải bài toán CAPTCHA để xác thực bảo mật.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    const cleanEmail = regEmail.trim().toLowerCase();
    let fbUserVerified = false;

    try {
      // Create user in Firebase Auth and dispatch genuine verification email
      if (auth) {
        try {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
          await sendEmailVerification(cred.user);
          fbUserVerified = cred.user.emailVerified;
        } catch (fbErr: any) {
          console.warn('[Admin Register] Firebase notice:', fbErr?.code || fbErr);
          if (fbErr.code === 'auth/email-already-in-use') {
            try {
              const cred = await signInWithEmailAndPassword(auth, cleanEmail, regPassword);
              await sendEmailVerification(cred.user);
              fbUserVerified = cred.user.emailVerified;
            } catch (signInErr) {
              console.warn('[Admin Register] Firebase sign-in check:', signInErr);
            }
          }
        }
      }

      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          username: regUsername.trim(),
          email: cleanEmail,
          emailVerified: fbUserVerified,
          password: regPassword,
          technicalRole: regTechnicalRole,
          note: regNote.trim(),
          captchaId: regCaptchaId,
          captchaAnswer: regCaptchaAnswer.trim()
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        setPendingVerifyEmail(cleanEmail);
        setPendingVerifyUsername(regUsername.trim());
        setCachedAuthPassword(regPassword);
        setAdminResendCooldown(60);
        setUsername(regUsername.trim());
        setRegPassword('');
        setRegConfirmPassword('');
        setActiveTab('EMAIL_VERIFY');
        setSuccessMsg('Đăng ký thành công! Firebase đã gửi email kích hoạt. Vui lòng bấm vào liên kết trong email (kiểm tra cả mục Thư rác/Spam) để hoàn tất.');
      } else {
        soundFx.playError();
        vibrateError();
        setError(data.error || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.');
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setError('Lỗi kết nối máy chủ đăng ký.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle Check Admin Email Verification
  const handleCheckAdminEmailVerification = async () => {
    soundFx.playClick();
    vibrateTap();
    setIsCheckingAdminVerification(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (auth && auth.currentUser) {
        try {
          await auth.currentUser.reload();
        } catch (reloadErr) {
          console.warn('Firebase user reload note:', reloadErr);
        }
      }

      const isVerified = Boolean(auth && auth.currentUser?.emailVerified);

      if (isVerified) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();

        try {
          await fetch('/api/admin/verify-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: auth?.currentUser?.uid,
              email: pendingVerifyEmail,
              username: pendingVerifyUsername
            })
          });
        } catch (serverErr) {
          console.warn('Server verify-email call note:', serverErr);
        }

        setSuccessMsg('Xác thực email thành công! Hồ sơ kỹ thuật viên của bạn đang ở trạng thái CHỜ PHÊ DUYỆT từ Trưởng Ban Kỹ Thuật.');
        setTimeout(() => {
          setActiveTab('LOGIN');
        }, 1500);
      } else {
        soundFx.playError();
        vibrateError();
        setError('Firebase chưa ghi nhận bạn bấm link xác thực trong email. Vui lòng mở hòm thư (kiểm tra cả mục Thư rác / Spam) để bấm link xác thực!');
      }
    } catch (err: any) {
      console.error('[Admin Email Check] Error:', err);
      soundFx.playError();
      vibrateError();
      setError('Lỗi kiểm tra trạng thái xác thực từ Firebase.');
    } finally {
      setIsCheckingAdminVerification(false);
    }
  };

  // 5. Handle Resend Admin Email Verification
  const handleResendAdminEmailVerification = async () => {
    if (adminResendCooldown > 0) return;
    soundFx.playClick();
    vibrateTap();
    setIsResendingAdminEmail(true);
    setError(null);
    setSuccessMsg(null);

    const targetEmail = pendingVerifyEmail.trim().toLowerCase();

    try {
      let activeUser = auth?.currentUser || null;
      if (auth && (!activeUser || (activeUser.email && activeUser.email.toLowerCase() !== targetEmail))) {
        if (targetEmail && cachedAuthPassword) {
          try {
            const cred = await signInWithEmailAndPassword(auth, targetEmail, cachedAuthPassword);
            activeUser = cred.user;
          } catch (signInErr) {
            console.warn('[Admin Resend Email] Sign-in note:', signInErr);
          }
        }
      }

      if (activeUser) {
        await sendEmailVerification(activeUser);
        setAdminResendCooldown(60);
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        setSuccessMsg(`Đã gửi lại email xác thực tới ${targetEmail}. Vui lòng kiểm tra Hộp thư đến và mục Thư rác (Spam)!`);
      } else {
        soundFx.playError();
        vibrateError();
        setError('Chưa thể gửi lại email xác thực. Vui lòng quay lại màn hình Đăng Nhập hoặc kiểm tra lại thông tin.');
      }
    } catch (err: any) {
      console.error('[Admin Resend Email] Error:', err);
      soundFx.playError();
      vibrateError();
      if (err?.code === 'auth/too-many-requests') {
        setError('Quá nhiều yêu cầu gửi email trong thời gian ngắn. Vui lòng đợi 1 phút trước khi thử lại.');
      } else {
        setError('Lỗi gửi lại email xác thực. Vui lòng thử lại sau ít phút.');
      }
    } finally {
      setIsResendingAdminEmail(false);
    }
  };

  // 6. Handle Send Password Reset Email
  const handleSendAdminPasswordResetEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = forgotEmail.trim().toLowerCase();
    if (!targetEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(targetEmail)) {
      setError('Vui lòng nhập địa chỉ Email hợp lệ.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotCaptchaAnswer.trim()) {
      setError('Vui lòng giải bài toán CAPTCHA để xác thực bảo mật.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setIsSendingResetEmail(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const serverRes = await fetch('/api/admin/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: targetEmail,
          captchaId: forgotCaptchaId,
          captchaAnswer: forgotCaptchaAnswer.trim()
        })
      });

      const serverData = await serverRes.json();
      if (!serverRes.ok) {
        soundFx.playError();
        vibrateError();
        setError(serverData.error || 'Không tìm thấy hồ sơ kỹ thuật viên với email này.');
        return;
      }

      if (!auth) {
        throw new Error('Firebase Auth chưa được khởi tạo.');
      }

      await sendPasswordResetEmail(auth, targetEmail);
      soundFx.playPacingChime('complete');
      vibrateSuccess();
      setResetEmailDispatched(true);
      setForgotCooldown(60);
      setSuccessMsg(`Đã gửi email đặt lại mật khẩu an toàn đến ${targetEmail}. Vui lòng kiểm tra Hộp thư đến và mục Thư rác (Spam)!`);
    } catch (err: any) {
      console.error('[Admin Forgot Password] Error:', err);
      soundFx.playError();
      vibrateError();
      setError(err?.message || 'Lỗi gửi email đặt lại mật khẩu từ Firebase.');
    } finally {
      setIsSendingResetEmail(false);
    }
  };

  // 7. Handle Master Key Emergency Login
  const handleMasterLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPasscode = masterPasscode.trim();
    if (!cleanPasscode) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: cleanPasscode })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        soundFx.playPacingChime('complete');
        vibrateSuccess();
        if (data.token) {
          sessionStorage.setItem('BTI2026_ADMIN_TOKEN', data.token);
        }
        if (data.user) {
          sessionStorage.setItem('BTI2026_TECH_USER', JSON.stringify(data.user));
        }
        onAuthenticated(data.user);
      } else {
        soundFx.playError();
        vibrateError();
        setError(data.error || 'Mật mã quản trị khẩn cấp không chính xác.');
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setError('Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Handle Status Lookup
  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = checkQuery.trim();
    if (!q) return;

    setIsChecking(true);
    setCheckResult(null);
    setError(null);

    try {
      const res = await fetch(`/api/admin/check-status/${encodeURIComponent(q)}`);
      const data = await res.json();
      setCheckResult(data);
      if (!data.exists) {
        setError('Không tìm thấy hồ sơ kỹ thuật viên với thông tin này.');
      }
    } catch {
      setError('Lỗi kết nối máy chủ tra cứu.');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100dvh-4rem)] flex items-start sm:items-center justify-center p-2.5 sm:p-4 py-3 sm:py-6 bg-transparent select-none overflow-y-auto">
      <div className="fluent-box p-3.5 sm:p-5 md:p-6 max-w-md md:max-w-4xl lg:max-w-5xl w-full relative overflow-hidden rounded-[4px] shadow-2xl border border-white/20 text-[#F5EFF9]">
        
        {/* Glow Header Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F7CAC9]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Full-Width Header Bar */}
        <div className="flex items-center justify-between pb-3 sm:pb-3.5 border-b border-white/10 relative z-10 gap-3">
          {/* Left: Logo & Portal Title */}
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-[2px] fluent-acrylic-surface border border-sky-400/40 flex items-center justify-center shadow-lg shadow-sky-950/40 text-sky-300 shrink-0">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base md:text-lg font-black text-white tracking-tight uppercase font-mono leading-tight truncate">
                Cổng Điều Hành <span className="text-sky-300">Ban Kỹ Thuật</span>
              </h1>
              <p className="text-[10px] sm:text-[11px] text-white/60 font-sans truncate mt-0.5">
                Dành riêng cho nhân sự vận hành hệ thống phần mềm BTI 2026.
              </p>
            </div>
          </div>

          {/* Right: Actions (Home & Exit) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {onExit && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onExit();
                  }}
                  className="p-1 sm:p-1.5 px-2 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-mono border border-white/10"
                  title="Về Trang Chủ"
                  aria-label="Về Trang Chủ"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trang chủ</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onExit();
                  }}
                  className="p-1 sm:p-1.5 px-2 rounded-[2px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 transition cursor-pointer flex items-center gap-1 text-[10px] sm:text-[11px] font-mono border border-rose-500/40 shadow-sm"
                  title="Thoát đăng nhập"
                  aria-label="Thoát đăng nhập"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Thoát</span>
                </button>
              </>
            )}
          </div>
        </div>

        {/* Main Responsive Grid: 1 Col on mobile, 12 Cols on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-7 items-start relative z-10 pt-3 sm:pt-4">

          {/* Left Column: Scope Notice, Technical Capability Cards, Desktop Footer */}
          <div className="md:col-span-5 flex flex-col justify-between space-y-3 md:border-r md:border-white/10 md:pr-5 lg:pr-7">
            <div className="space-y-3">
              {/* Exclusive Scope Notice Box */}
              <div className="p-2 sm:p-2.5 rounded-[2px] bg-sky-950/30 border border-sky-500/30 text-[10px] sm:text-[11px] text-sky-200/90 leading-relaxed font-sans flex items-start gap-1.5 sm:gap-2">
                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-sky-300">📌 Lưu ý phạm vi:</strong> Cổng này chỉ cấp quyền cho nhân sự Kỹ thuật trực tiếp vận hành máy chủ và màn LED. Các ban Nội dung, Giám khảo, MC sử dụng hệ thống riêng.
                </span>
              </div>

              {/* Desktop Highlights Cards (hidden on mobile, visible on md+) */}
              <div className="hidden md:flex flex-col gap-2 pt-1 text-left">
                <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Nhiệm Vụ Kỹ Thuật Viên</span>
                </div>

                <div className="p-2 sm:p-2.5 rounded-[2px] bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-[2px] bg-sky-500/20 text-sky-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Monitor className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white font-mono">Điều Hành Màn Chiếu LED</div>
                    <div className="text-[10px] text-white/60 font-sans leading-tight mt-0.5">
                      Đồng bộ hiển thị LED Wall, Projector View và chuyển cảnh sân khấu tức thì.
                    </div>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-[2px] bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-[2px] bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                    <Cpu className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white font-mono">Quản Trị Đấu Trường Realtime</div>
                    <div className="text-[10px] text-white/60 font-sans leading-tight mt-0.5">
                      Kiểm soát đồng hồ đếm ngược, khóa câu hỏi, xử lý khiếu nại và chuyển vòng thi.
                    </div>
                  </div>
                </div>

                <div className="p-2 sm:p-2.5 rounded-[2px] bg-white/[0.03] border border-white/10 hover:border-sky-500/30 transition flex items-start gap-2.5">
                  <div className="w-6 h-6 rounded-[2px] bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white font-mono">Bảo Mật Phân Quyền Nghiêm Ngặt</div>
                    <div className="text-[10px] text-white/60 font-sans leading-tight mt-0.5">
                      Xác thực Firebase Auth đa tầng và phê duyệt hồ sơ kỹ thuật viên trực ban.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Desktop Status Bar Footer */}
            <div className="hidden md:flex items-center justify-between pt-2.5 border-t border-white/10 text-[10px] font-mono text-white/40">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-300/80">Admin Core Active</span>
              </span>
              <span>BTI 2026 v2.0</span>
            </div>
          </div>

          {/* Right Column: Mode Tabs, Dynamic Alerts, Active Forms */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-3 sm:space-y-4 min-h-0">
            <div>
              {/* Mode Navigation Tabs */}
              <div className="grid grid-cols-4 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-white/5 border border-white/10 rounded-[2px] text-[10px] sm:text-xs font-mono font-bold mb-2 sm:mb-3">
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setActiveTab('LOGIN');
                    setError(null);
                  }}
                  className={`py-1.5 px-1 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                    activeTab === 'LOGIN' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <LogIn className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Đăng Nhập</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    if (pendingVerifyEmail && activeTab !== 'EMAIL_VERIFY') {
                      setActiveTab('EMAIL_VERIFY');
                    } else {
                      setActiveTab('REGISTER');
                    }
                    setError(null);
                  }}
                  className={`py-1.5 px-1 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                    activeTab === 'REGISTER' || activeTab === 'EMAIL_VERIFY' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  {activeTab === 'EMAIL_VERIFY' ? (
                    <>
                      <Mail className="w-3.5 h-3.5 shrink-0 text-emerald-300 animate-pulse" />
                      <span className="truncate">Xác Thực</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Đăng Ký</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setActiveTab('FORGOT_PASSWORD');
                    setError(null);
                    setSuccessMsg(null);
                  }}
                  className={`py-1.5 px-1 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                    activeTab === 'FORGOT_PASSWORD' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Quên MK</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setActiveTab('CHECK_STATUS');
                    setError(null);
                  }}
                  className={`py-1.5 px-1 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer truncate ${
                    activeTab === 'CHECK_STATUS' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Tra Cứu</span>
                </button>
              </div>

              {/* Alert Notifications */}
              {error && (
                <div className="flex items-start gap-2 text-rose-300 bg-rose-950/40 p-2 sm:p-2.5 rounded-[2px] border border-rose-500/30 text-[11px] sm:text-xs shadow-inner animate-fadeIn mb-2 sm:mb-3">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-snug">{error}</p>
                </div>
              )}

              {successMsg && (
                <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2 sm:p-2.5 rounded-[2px] border border-emerald-500/30 text-[11px] sm:text-xs shadow-inner animate-fadeIn mb-2 sm:mb-3">
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  <p className="leading-snug">{successMsg}</p>
                </div>
              )}

              {/* Form Body Container */}
              <div className="overflow-y-auto custom-scrollbar pr-0.5 sm:pr-1 space-y-3 sm:space-y-4 max-h-[58vh] md:max-h-[64vh]">

                {/* TAB 1: LOGIN */}
                {activeTab === 'LOGIN' && (
                  <form onSubmit={handleLogin} className="space-y-3 text-left">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                placeholder="VD: ktdh_minhanh..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white pl-2.5 sm:pl-3 pr-8 sm:pr-9 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* CAPTCHA Challenge */}
            <CaptchaChallenge
              value={loginCaptchaAnswer}
              captchaId={loginCaptchaId}
              onChange={handleLoginCaptchaChange}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isSubmitting ? 'Đang Xác Thực...' : 'Đăng Nhập Kỹ Thuật'}</span>
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Alternative Auth divider */}
            <div className="relative flex items-center justify-center my-1.5 sm:my-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0D0420] px-2 text-[10px] font-mono text-white/40 uppercase">hoặc</span>
            </div>

            {/* Google Login Option */}
            <button
              type="button"
              onClick={() => handleGoogleAuth(false)}
              disabled={isSubmitting}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-1.5 sm:py-2 px-3 rounded-[2px] border border-white/15 text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.54 0 2.9.56 3.96 1.48l2.96-2.96C17.06 1.83 14.7 1 12 1 7.42 1 3.55 3.58 1.63 7.34l3.52 2.73C6.07 7.02 8.79 5 12 5z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.16-1.99 3.41-4.91 3.41-8.7z"/>
                <path fill="#FBBC05" d="M5.15 14.93c-.24-.73-.38-1.5-.38-2.31s.14-1.58.38-2.31L1.63 7.55C.6 9.61 0 11.97 0 14.48s.6 4.87 1.63 6.93l3.52-2.73z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.07.72-2.45 1.16-4.22 1.16-3.21 0-5.93-2.02-6.85-5.07L1.63 16.03C3.55 19.79 7.42 22.37 12 22.37z"/>
              </svg>
              <span className="truncate">Đăng nhập bằng Google</span>
            </button>

            {/* Quick helper links for Forgot password and Activation */}
            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono pt-1 text-white/50">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setActiveTab('FORGOT_PASSWORD');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="hover:text-sky-300 transition underline underline-offset-2 cursor-pointer"
              >
                Quên mật khẩu?
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setActiveTab('EMAIL_VERIFY');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="hover:text-emerald-300 transition underline underline-offset-2 cursor-pointer"
              >
                Xác thực email
              </button>
            </div>

            {/* Emergency Master Key Access Link */}
            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setActiveTab('MASTER_KEY');
                  setError(null);
                }}
                className="text-[10px] sm:text-[11px] font-mono text-[#F7CAC9]/70 hover:text-[#F7CAC9] transition inline-flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3 shrink-0" />
                <span>Trưởng Ban KT: Đăng nhập Master Key</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-2.5 sm:space-y-3 text-left">
            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Họ và tên kỹ thuật viên *
              </label>
              <input
                type="text"
                placeholder="VD: Trần Minh Tuấn"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Địa chỉ Email (Nhận link xác thực Firebase) *
              </label>
              <div className="relative">
                <input
                  type="email"
                  placeholder="minhtuan@example.com"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white pl-8 pr-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                  required
                />
                <Mail className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  Tên đăng nhập *
                </label>
                <input
                  type="text"
                  placeholder="minhtuan_kt"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  Vị trí chuyên trách *
                </label>
                <select
                  value={regTechnicalRole}
                  onChange={(e) => setRegTechnicalRole(e.target.value as TechnicalRole)}
                  className="w-full bg-[#0D0420] border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2 py-1.5 sm:py-2 rounded-[2px] outline-none transition cursor-pointer"
                >
                  <option value="SERVER_OPERATOR">🖥️ Máy chủ Realtime</option>
                  <option value="LED_OPERATOR">📺 Màn chiếu LED</option>
                  <option value="STAGE_COORDINATOR">🛠️ Sân khấu</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  Mật khẩu (≥ 6 ký tự) *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                  Xác nhận mật khẩu *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Ghi chú nhiệm vụ (Không bắt buộc)
              </label>
              <input
                type="text"
                placeholder="VD: Phụ trách màn LED sân khấu chính"
                value={regNote}
                onChange={(e) => setRegNote(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
              />
            </div>

            {/* CAPTCHA Challenge */}
            <CaptchaChallenge
              value={regCaptchaAnswer}
              captchaId={regCaptchaId}
              onChange={handleRegCaptchaChange}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isSubmitting ? 'Đang Gửi Hồ Sơ...' : 'Gửi Yêu Cầu Đăng Ký'}</span>
              <UserPlus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            {/* Register with Google option */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => handleGoogleAuth(true)}
                disabled={isSubmitting}
                className="w-full bg-white/5 hover:bg-white/10 text-white/90 font-bold py-1.5 sm:py-2 px-3 rounded-[2px] border border-white/15 text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-300 shrink-0" />
                <span className="truncate">Đăng ký nhanh bằng Google Account</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CHECK STATUS */}
        {activeTab === 'CHECK_STATUS' && (
          <div className="space-y-3 text-left">
            <form onSubmit={handleCheckStatus} className="space-y-2">
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70">
                Nhập Tên đăng nhập hoặc Email cần tra cứu
              </label>
              <div className="flex gap-1.5 sm:gap-2">
                <input
                  type="text"
                  placeholder="VD: minhtuan_kt hoặc email..."
                  value={checkQuery}
                  onChange={(e) => setCheckQuery(e.target.value)}
                  className="flex-1 min-w-0 bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                  required
                />
                <button
                  type="submit"
                  disabled={isChecking}
                  className="px-3 sm:px-4 py-1.5 sm:py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-[2px] flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Tra cứu</span>
                </button>
              </div>
            </form>

            {/* Check Result Card */}
            {checkResult && checkResult.exists && (
              <div className="p-3 sm:p-3.5 rounded-[2px] bg-white/5 border border-white/15 space-y-2 animate-fadeIn font-mono text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-white text-xs sm:text-sm truncate">{checkResult.fullName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      checkResult.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : checkResult.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {checkResult.status === 'PENDING'
                      ? '⏳ Chờ Duyệt'
                      : checkResult.status === 'APPROVED'
                      ? '✓ Đã Duyệt'
                      : '✕ Từ Chối'}
                  </span>
                </div>

                <div className="text-[10px] sm:text-[11px] text-white/60 space-y-0.5 sm:space-y-1 pt-1 border-t border-white/10">
                  <p>Vị trí: <strong>{TECHNICAL_ROLES[checkResult.technicalRole as TechnicalRole]?.label || checkResult.technicalRole}</strong></p>
                  <p>Ngày gửi: {new Date(checkResult.createdAt).toLocaleDateString('vi-VN')}</p>
                  {checkResult.approvedAt && (
                    <p className="text-emerald-300">Đã duyệt: {new Date(checkResult.approvedAt).toLocaleDateString('vi-VN')} ({checkResult.approvedBy})</p>
                  )}
                </div>

                {checkResult.status === 'APPROVED' && (
                  <button
                    type="button"
                    onClick={() => {
                      setUsername(checkResult.username);
                      setActiveTab('LOGIN');
                    }}
                    className="w-full mt-2 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-[2px] text-xs transition cursor-pointer"
                  >
                    Chuyển sang Đăng Nhập ngay
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* TAB: EMAIL VERIFICATION */}
        {activeTab === 'EMAIL_VERIFY' && (
          <div className="space-y-3 text-left">
            <div className="p-3 rounded-[2px] bg-sky-950/40 border border-sky-500/40 text-[11px] text-sky-200 leading-relaxed font-sans space-y-2">
              <div className="flex items-center gap-2 text-sky-300 font-mono font-bold">
                <Mail className="w-4 h-4 shrink-0 text-sky-400" />
                <span>Xác Thực Email Tài Khoản Kỹ Thuật (Firebase)</span>
              </div>
              <p>
                Hệ thống xác thực Firebase đã gửi đường link kích hoạt đến hòm thư điện tử của bạn:
              </p>
              {pendingVerifyEmail && (
                <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-[2px] border border-sky-500/30 font-mono text-xs text-sky-300 font-bold">
                  <span className="truncate">{pendingVerifyEmail}</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pendingVerifyEmail);
                      setCopiedCode(true);
                      soundFx.playClick();
                      vibrateTap();
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="ml-2 px-1.5 py-0.5 bg-sky-600/30 hover:bg-sky-600/50 text-sky-200 rounded-[2px] text-[10px] flex items-center gap-1 cursor-pointer transition shrink-0"
                  >
                    {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedCode ? 'Đã chép' : 'Sao chép'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Spam Warning Alert */}
            <div className="p-2.5 rounded-[2px] bg-amber-950/40 border border-amber-500/40 text-[10px] sm:text-[11px] text-amber-200/90 leading-relaxed font-sans space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Quan trọng: Kiểm tra thư mục Thư rác / Spam!</span>
              </div>
              <p>
                Email được gửi từ <strong>noreply@gen-lang-client-0094857112.firebaseapp.com</strong>. Nhiều dịch vụ (Gmail, Outlook) có thể tự động phân loại thư này vào mục <strong>Spam / Rác / Quảng cáo</strong>. Vui lòng kiểm tra kỹ hòm thư!
              </p>
            </div>

            {/* Verification Status Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleCheckAdminEmailVerification}
                disabled={isCheckingAdminVerification}
                className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isCheckingAdminVerification ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Đang Kiểm Tra Firebase...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Tôi Đã Bấm Link Trong Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleResendAdminEmailVerification}
                disabled={isResendingAdminEmail || adminResendCooldown > 0}
                className="w-full bg-white/5 hover:bg-white/10 disabled:opacity-50 text-white/90 font-mono text-xs py-2 px-3 rounded-[2px] border border-white/15 transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {adminResendCooldown > 0 
                    ? `Gửi lại email sau (${adminResendCooldown}s)` 
                    : isResendingAdminEmail 
                    ? 'Đang gửi lại email...' 
                    : 'Gửi lại email xác thực'}
                </span>
              </button>
            </div>

            <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('REGISTER');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-white/60 hover:text-white transition cursor-pointer"
              >
                ← Đăng ký lại
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-sky-300 hover:underline cursor-pointer"
              >
                Về màn hình Đăng Nhập →
              </button>
            </div>
          </div>
        )}

        {/* TAB: FORGOT PASSWORD */}
        {activeTab === 'FORGOT_PASSWORD' && (
          <div className="space-y-3 text-left">
            <div className="p-2 sm:p-2.5 rounded-[2px] bg-sky-950/30 border border-sky-500/30 text-[10px] sm:text-[11px] text-sky-200/90 leading-relaxed font-sans">
              <strong>Khôi phục mật khẩu Kỹ thuật viên (Bảo mật Firebase):</strong> Nhập địa chỉ email của bạn để nhận đường link đổi mật khẩu bảo mật trực tiếp từ Google Firebase.
            </div>

            {resetEmailDispatched ? (
              <div className="space-y-3 animate-fadeIn">
                <div className="p-3 rounded-[2px] bg-emerald-950/40 border border-emerald-500/40 text-[11px] text-emerald-200 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-300 font-bold font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Đã Gửi Email Khôi Phục Thành Công!</span>
                  </div>
                  <p>
                    Vui lòng mở hòm thư <strong>{forgotEmail}</strong> và bấm vào liên kết để thiết lập mật khẩu mới.
                  </p>
                  <p className="text-amber-200/90 text-[10px]">
                    ⚠️ Đừng quên kiểm tra mục <strong>Thư rác (Spam / Junk)</strong> nếu bạn không thấy thư trong hộp thư chính.
                  </p>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleSendAdminPasswordResetEmail}
                    disabled={isSendingResetEmail || forgotCooldown > 0}
                    className="w-1/2 bg-white/10 hover:bg-white/15 disabled:opacity-50 text-white font-mono text-xs py-2 px-2 rounded-[2px] transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{forgotCooldown > 0 ? `Gửi lại (${forgotCooldown}s)` : 'Gửi lại email'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('LOGIN');
                      setError(null);
                      setSuccessMsg(null);
                    }}
                    className="w-1/2 bg-sky-600 hover:bg-sky-500 text-white font-bold font-mono text-xs py-2 px-2 rounded-[2px] uppercase tracking-wider transition cursor-pointer"
                  >
                    Đăng Nhập Ngay
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendAdminPasswordResetEmail} className="space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    Địa chỉ Email kỹ thuật viên đã đăng ký *
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      placeholder="minhtuan@example.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white pl-8 pr-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                      required
                      autoFocus
                    />
                    <Mail className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>
                </div>

                <CaptchaChallenge
                  value={forgotCaptchaAnswer}
                  captchaId={forgotCaptchaId}
                  onChange={handleForgotCaptchaChange}
                  disabled={isSendingResetEmail}
                />

                <button
                  type="submit"
                  disabled={isSendingResetEmail}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  {isSendingResetEmail ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Đang Gửi Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Gửi Email Đặt Lại Mật Khẩu</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <div className="text-center pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:underline cursor-pointer"
              >
                ← Quay lại Đăng Nhập
              </button>
            </div>
          </div>
        )}

        {/* TAB 4: MASTER KEY EMERGENCY FALLBACK */}
        {activeTab === 'MASTER_KEY' && (
          <form onSubmit={handleMasterLogin} className="space-y-3 text-left">
            <div className="p-2 sm:p-2.5 bg-rose-950/30 border border-rose-500/30 rounded-[2px] text-[10px] sm:text-xs text-rose-200 leading-relaxed">
              <strong>Cổng Khẩn Cấp Dành Cho Trưởng Ban Kỹ Thuật:</strong> Sử dụng mật mã bí mật để mở khóa tức thì quyền Root Super Admin trong sự cố.
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Mật mã khẩn cấp (Master Passcode)
              </label>
              <div className="relative">
                <input
                  type={showMasterPasscode ? 'text' : 'password'}
                  placeholder="NHẬP MASTER PASSCODE..."
                  value={masterPasscode}
                  onChange={(e) => setMasterPasscode(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-rose-500/30 hover:border-rose-400 focus:border-rose-400 font-mono text-center tracking-widest text-xs text-white pl-3 pr-8 sm:pr-9 py-2 sm:py-2.5 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPasscode(!showMasterPasscode)}
                  className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer"
                >
                  {showMasterPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isSubmitting ? 'Đang Mở Khóa...' : 'Mở Khóa Root Khẩn Cấp'}</span>
              <KeyRound className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>

            <div className="text-center pt-0.5">
              <button
                type="button"
                onClick={() => setActiveTab('LOGIN')}
                className="text-[10px] sm:text-[11px] font-mono text-white/50 hover:text-white transition cursor-pointer"
              >
                ← Quay lại màn hình đăng nhập thường
              </button>
            </div>
          </form>
        )}

              </div>
            </div>

            {/* Mobile Footer Exit button */}
            {onExit && (
              <div className="md:hidden pt-2 sm:pt-3 border-t border-white/10 text-center">
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onExit();
                  }}
                  className="text-[11px] font-mono text-white/50 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition cursor-pointer py-1 px-3 rounded-[2px] hover:bg-white/5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Thoát về Trang Chủ BTI 2026</span>
                </button>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
