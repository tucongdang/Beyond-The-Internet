import React, { useState, useCallback } from 'react';
import { Lock, ArrowRight, ArrowLeft, ShieldAlert, KeyRound, Eye, EyeOff, UserPlus, LogIn, LogOut, Search, CheckCircle2, Clock, AlertCircle, Shield, Sparkles, Copy, Check, ShieldCheck, RefreshCw } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateError } from '../utils/hapticUtils';
import { AdminUser, TechnicalRole, TECHNICAL_ROLES } from '../types';
import { CaptchaChallenge } from './CaptchaChallenge';
import { auth } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

interface PasswordGateProps {
  isAuthenticated: boolean;
  onAuthenticated: (user?: AdminUser) => void;
  viewName: string;
  onExit?: () => void;
  children: React.ReactNode;
}

type GateTab = 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD' | 'ACTIVATE' | 'CHECK_STATUS' | 'MASTER_KEY';

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
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regTechnicalRole, setRegTechnicalRole] = useState<TechnicalRole>('SERVER_OPERATOR');
  const [regNote, setRegNote] = useState('');
  const [regCaptchaId, setRegCaptchaId] = useState('');
  const [regCaptchaAnswer, setRegCaptchaAnswer] = useState('');

  // Forgot Password State
  const [forgotUsername, setForgotUsername] = useState('');
  const [forgotResetCode, setForgotResetCode] = useState('');
  const [forgotNewPassword, setForgotNewPassword] = useState('');
  const [forgotConfirmPassword, setForgotConfirmPassword] = useState('');
  const [showForgotNewPassword, setShowForgotNewPassword] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotGeneratedCode, setForgotGeneratedCode] = useState<string | null>(null);
  const [forgotCaptchaId, setForgotCaptchaId] = useState('');
  const [forgotCaptchaAnswer, setForgotCaptchaAnswer] = useState('');

  // Account Activation State
  const [actUsername, setActUsername] = useState('');
  const [actCode, setActCode] = useState('');
  const [actCaptchaId, setActCaptchaId] = useState('');
  const [actCaptchaAnswer, setActCaptchaAnswer] = useState('');

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
        setError(data.error || 'Đăng nhập không thành công. Vui lòng thử lại.');
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
      console.error('Google Auth Error:', err);
      soundFx.playError();
      vibrateError();
      setError(err.message || 'Lỗi khi đăng nhập bằng Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFullName.trim() || !regUsername.trim() || !regPassword) {
      setError('Vui lòng điền đầy đủ các thông tin bắt buộc.');
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

    try {
      const res = await fetch('/api/admin/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: regFullName.trim(),
          username: regUsername.trim(),
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
        setSuccessMsg('Đăng ký thành công! Hồ sơ kỹ thuật của bạn đang ở trạng thái CHỜ PHÊ DUYỆT từ Trưởng Ban Kỹ Thuật.');
        // Switch to login tab and prefill username
        setUsername(regUsername.trim());
        setRegPassword('');
        setRegConfirmPassword('');
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

  // 4. Handle Master Key Emergency Login
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

  // 5. Handle Status Lookup
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

  // 6. Handle Forgot Password - Request OTP Code
  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotUsername.trim()) {
      setError('Vui lòng nhập tên đăng nhập.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotCaptchaAnswer.trim()) {
      setError('Vui lòng giải bài toán CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/forgot-password/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUsername.trim(),
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
        setSuccessMsg(data.message || 'Mã OTP khôi phục đã sẵn sàng.');
      } else {
        soundFx.playError();
        vibrateError();
        setError(data.error || 'Không tìm thấy tài khoản quản trị.');
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setError('Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 7. Handle Forgot Password - Submit New Password
  const handleForgotReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotResetCode.trim()) {
      setError('Vui lòng nhập mã khôi phục 6 chữ số.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (forgotNewPassword !== forgotConfirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!forgotCaptchaAnswer.trim()) {
      setError('Vui lòng giải bài toán CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/forgot-password/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: forgotUsername.trim(),
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
        setSuccessMsg(data.message || 'Đặt lại mật khẩu thành công! Đang chuyển về đăng nhập...');
        setUsername(forgotUsername.trim());
        setPassword('');
        setTimeout(() => {
          setActiveTab('LOGIN');
          setForgotStep(1);
          setForgotGeneratedCode(null);
        }, 1500);
      } else {
        soundFx.playError();
        vibrateError();
        setError(data.error || 'Đặt lại mật khẩu thất bại.');
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setError('Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 8. Handle Account Activation
  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!actUsername.trim() || !actCode.trim()) {
      setError('Vui lòng nhập tên đăng nhập và mã kích hoạt 6 chữ số.');
      soundFx.playError();
      vibrateError();
      return;
    }
    if (!actCaptchaAnswer.trim()) {
      setError('Vui lòng giải bài toán CAPTCHA.');
      soundFx.playError();
      vibrateError();
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch('/api/admin/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: actUsername.trim(),
          activationCode: actCode.trim(),
          captchaId: actCaptchaId,
          captchaAnswer: actCaptchaAnswer.trim()
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
      } else {
        soundFx.playError();
        vibrateError();
        setError(data.error || 'Kích hoạt tài khoản thất bại.');
      }
    } catch {
      soundFx.playError();
      vibrateError();
      setError('Lỗi kết nối máy chủ xác thực.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100dvh-4rem)] flex items-center justify-center p-2.5 sm:p-4 py-4 sm:py-6 bg-transparent select-none overflow-y-auto">
      <div className="fluent-box p-3.5 sm:p-6 max-w-md w-full space-y-3 sm:space-y-4 relative overflow-hidden rounded-[4px] shadow-2xl border border-white/20 my-auto">
        
        {/* Glow Header Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F7CAC9]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo & Branding Badge with Exit Button */}
        <div className="text-center space-y-1.5 relative z-10">
          <div className="flex items-center justify-between">
            <div className="w-20 flex justify-start">
              {onExit && (
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onExit();
                  }}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-mono border border-white/10"
                  title="Về Trang Chủ"
                  aria-label="Về Trang Chủ"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trang chủ</span>
                </button>
              )}
            </div>

            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-[2px] fluent-acrylic-surface border border-sky-400/40 flex items-center justify-center shadow-lg shadow-sky-950/40 text-sky-300">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="w-20 flex justify-end">
              {onExit && (
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onExit();
                  }}
                  className="min-h-[44px] min-w-[44px] p-2 rounded-[2px] bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 hover:text-rose-100 transition cursor-pointer flex items-center justify-center gap-1 text-[10px] sm:text-[11px] font-mono border border-rose-500/40 shadow-sm"
                  title="Thoát đăng nhập"
                  aria-label="Thoát đăng nhập"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Thoát</span>
                </button>
              )}
            </div>
          </div>

          <h1 className="text-base sm:text-lg font-black text-white tracking-tight uppercase font-mono flex items-center justify-center gap-1.5">
            Cổng Điều Hành <span className="text-sky-300">Ban Kỹ Thuật</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-white/60 font-sans leading-relaxed">
            Dành riêng cho nhân sự vận hành hệ thống phần mềm BTI 2026.
          </p>
        </div>

        {/* Exclusive Scope Notice Box */}
        <div className="p-2 sm:p-2.5 rounded-[2px] bg-sky-950/30 border border-sky-500/30 text-[10px] sm:text-[11px] text-sky-200/90 leading-relaxed font-sans">
          <strong className="text-sky-300">📌 Lưu ý phạm vi:</strong> Cổng này chỉ cấp quyền cho nhân sự Kỹ thuật trực tiếp vận hành máy chủ và màn LED. Các ban Nội dung, Giám khảo, MC sử dụng hệ thống Quản lý Ngân hàng Câu hỏi riêng.
        </div>

        {/* Mode Navigation Tabs */}
        <div className="grid grid-cols-4 gap-0.5 sm:gap-1 p-0.5 sm:p-1 bg-white/5 border border-white/10 rounded-[2px] text-[10px] sm:text-xs font-mono font-bold">
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
              setActiveTab('REGISTER');
              setError(null);
            }}
            className={`py-1.5 px-1 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              activeTab === 'REGISTER' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Đăng Ký</span>
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setActiveTab('ACTIVATE');
              setError(null);
            }}
            className={`py-1.5 px-1 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer truncate ${
              activeTab === 'ACTIVATE' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Kích Hoạt</span>
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
          <div className="flex items-start gap-2 text-rose-300 bg-rose-950/40 p-2 sm:p-2.5 rounded-[2px] border border-rose-500/30 text-[11px] sm:text-xs shadow-inner animate-fadeIn">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2 sm:p-2.5 rounded-[2px] border border-emerald-500/30 text-[11px] sm:text-xs shadow-inner animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{successMsg}</p>
          </div>
        )}

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
                  setActiveTab('ACTIVATE');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className="hover:text-emerald-300 transition underline underline-offset-2 cursor-pointer"
              >
                Kích hoạt tài khoản
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

        {/* TAB: FORGOT PASSWORD */}
        {activeTab === 'FORGOT_PASSWORD' && (
          <div className="space-y-3 text-left">
            <div className="p-2 sm:p-2.5 rounded-[2px] bg-sky-950/30 border border-sky-500/30 text-[10px] sm:text-[11px] text-sky-200/90 leading-relaxed font-sans">
              <strong>Khôi phục mật khẩu Kỹ thuật viên:</strong> Nhập tên đăng nhập để lấy mã OTP xác thực và thiết lập lại mật khẩu mới.
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleForgotRequest} className="space-y-3">
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    Tên đăng nhập kỹ thuật viên *
                  </label>
                  <input
                    type="text"
                    placeholder="VD: ktdh_minhanh..."
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                    required
                    autoFocus
                  />
                </div>

                <CaptchaChallenge
                  value={forgotCaptchaAnswer}
                  captchaId={forgotCaptchaId}
                  onChange={handleForgotCaptchaChange}
                  disabled={isSubmitting}
                />

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Đang Kiểm Tra...' : 'Nhận Mã Xác Thực'}</span>
                </button>
              </form>
            ) : (
              <form onSubmit={handleForgotReset} className="space-y-3">
                {forgotGeneratedCode && (
                  <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/40 rounded-[2px] space-y-1.5 animate-fadeIn">
                    <p className="text-[10px] text-emerald-300 font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      Mã OTP Khôi Phục (Hệ Thống BTI 2026):
                    </p>
                    <div className="flex items-center justify-between bg-black/40 px-2.5 py-1.5 rounded-[2px] border border-emerald-500/30">
                      <span className="font-mono text-base sm:text-lg font-black text-emerald-300 tracking-widest">
                        {forgotGeneratedCode}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(forgotGeneratedCode);
                          setCopiedCode(true);
                          soundFx.playClick();
                          vibrateTap();
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="px-2 py-1 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 rounded-[2px] text-[10px] font-mono flex items-center gap-1 cursor-pointer transition"
                      >
                        {copiedCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedCode ? 'Đã sao chép' : 'Sao chép'}</span>
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    Mã xác thực OTP (6 chữ số) *
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    placeholder="VD: 123456"
                    value={forgotResetCode}
                    onChange={(e) => setForgotResetCode(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-center tracking-widest text-sm font-bold text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    Mật khẩu mới (tối thiểu 6 ký tự) *
                  </label>
                  <div className="relative">
                    <input
                      type={showForgotNewPassword ? 'text' : 'password'}
                      placeholder="Nhập mật khẩu mới..."
                      value={forgotNewPassword}
                      onChange={(e) => setForgotNewPassword(e.target.value)}
                      className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white pl-2.5 sm:pl-3 pr-8 sm:pr-9 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowForgotNewPassword(!showForgotNewPassword)}
                      className="absolute right-2 sm:right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer"
                    >
                      {showForgotNewPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                    Xác nhận mật khẩu mới *
                  </label>
                  <input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới..."
                    value={forgotConfirmPassword}
                    onChange={(e) => setForgotConfirmPassword(e.target.value)}
                    className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                    required
                  />
                </div>

                <CaptchaChallenge
                  value={forgotCaptchaAnswer}
                  captchaId={forgotCaptchaId}
                  onChange={handleForgotCaptchaChange}
                  disabled={isSubmitting}
                />

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotStep(1);
                      setForgotGeneratedCode(null);
                    }}
                    className="w-1/3 bg-white/10 hover:bg-white/15 text-white font-mono text-xs py-2 px-2 rounded-[2px] transition cursor-pointer"
                  >
                    ← Quay lại
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-2/3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Đang Cập Nhật...' : 'Lưu Mật Khẩu'}</span>
                  </button>
                </div>
              </form>
            )}

            <div className="text-center pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setError(null);
                }}
                className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:underline cursor-pointer"
              >
                ← Quay lại Đăng Nhập
              </button>
            </div>
          </div>
        )}

        {/* TAB: ACTIVATE ACCOUNT */}
        {activeTab === 'ACTIVATE' && (
          <form onSubmit={handleActivateSubmit} className="space-y-3 text-left">
            <div className="p-2 sm:p-2.5 rounded-[2px] bg-emerald-950/30 border border-emerald-500/30 text-[10px] sm:text-[11px] text-emerald-200/90 leading-relaxed font-sans">
              <strong>Kích hoạt tài khoản Kỹ thuật viên:</strong> Nhập tên đăng nhập và mã kích hoạt để hoàn tất xác thực tài khoản quản trị.
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Tên đăng nhập *
              </label>
              <input
                type="text"
                placeholder="VD: ktdh_minhanh..."
                value={actUsername}
                onChange={(e) => setActUsername(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[10px] sm:text-[11px] font-mono font-bold text-white/70 mb-1">
                Mã kích hoạt (6 chữ số) *
              </label>
              <input
                type="text"
                maxLength={6}
                placeholder="VD: 123456"
                value={actCode}
                onChange={(e) => setActCode(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-center tracking-widest text-sm font-bold text-white px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-[2px] outline-none transition placeholder:text-white/30 placeholder:text-xs placeholder:font-normal"
                required
              />
            </div>

            <CaptchaChallenge
              value={actCaptchaAnswer}
              captchaId={actCaptchaId}
              onChange={handleActCaptchaChange}
              disabled={isSubmitting}
            />

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 sm:py-2.5 px-3 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-emerald-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span>{isSubmitting ? 'Đang Kích Hoạt...' : 'Kích Hoạt Tài Khoản'}</span>
            </button>

            <div className="text-center pt-1 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('LOGIN');
                  setError(null);
                }}
                className="text-[10px] sm:text-[11px] font-mono text-sky-300 hover:underline cursor-pointer"
              >
                ← Quay lại Đăng Nhập
              </button>
            </div>
          </form>
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

        {onExit && (
          <div className="pt-2 sm:pt-3 border-t border-white/10 text-center">
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
  );
};
