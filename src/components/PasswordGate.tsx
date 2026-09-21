import React, { useState, useCallback } from 'react';
import { Lock, ArrowRight, ShieldAlert, KeyRound, Eye, EyeOff, UserPlus, LogIn, Search, CheckCircle2, Clock, AlertCircle, Shield, Sparkles } from 'lucide-react';
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
  children: React.ReactNode;
}

type GateTab = 'LOGIN' | 'REGISTER' | 'CHECK_STATUS' | 'MASTER_KEY';

export const PasswordGate: React.FC<PasswordGateProps> = ({
  isAuthenticated,
  onAuthenticated,
  viewName,
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

  // Stable CAPTCHA Callbacks
  const handleLoginCaptchaChange = useCallback((id: string, val: string) => {
    setLoginCaptchaId(id);
    setLoginCaptchaAnswer(val);
  }, []);

  const handleRegCaptchaChange = useCallback((id: string, val: string) => {
    setRegCaptchaId(id);
    setRegCaptchaAnswer(val);
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

  return (
    <div className="flex-1 min-h-[calc(100dvh-4rem)] flex items-center justify-center p-3 sm:p-4 bg-transparent select-none">
      <div className="fluent-box p-5 sm:p-7 max-w-md w-full space-y-5 relative overflow-hidden rounded-[4px] shadow-2xl border border-white/20">
        
        {/* Glow Header Accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-sky-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-[#F7CAC9]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Top Logo & Branding Badge */}
        <div className="text-center space-y-2 relative z-10">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-[2px] fluent-acrylic-surface border border-sky-400/40 flex items-center justify-center mx-auto shadow-lg shadow-sky-950/40 text-sky-300">
            <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase font-mono flex items-center justify-center gap-1.5">
            Cổng Điều Hành <span className="text-sky-300">Ban Kỹ Thuật</span>
          </h1>
          <p className="text-[11px] text-white/60 font-sans leading-relaxed">
            Dành riêng cho nhân sự vận hành hệ thống phần mềm BTI 2026.
          </p>
        </div>

        {/* Exclusive Scope Notice Box */}
        <div className="p-2.5 rounded-[2px] bg-sky-950/30 border border-sky-500/30 text-[11px] text-sky-200/90 leading-relaxed font-sans">
          <strong className="text-sky-300">📌 Lưu ý phạm vi:</strong> Cổng này chỉ cấp quyền cho nhân sự Kỹ thuật trực tiếp vận hành máy chủ và màn LED. Các ban Nội dung, Giám khảo, MC sử dụng hệ thống Quản lý Ngân hàng Câu hỏi riêng.
        </div>

        {/* Mode Navigation Tabs */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-white/5 border border-white/10 rounded-[2px] text-xs font-mono font-bold">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setActiveTab('LOGIN');
              setError(null);
            }}
            className={`py-1.5 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'LOGIN' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Đăng Nhập</span>
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setActiveTab('REGISTER');
              setError(null);
            }}
            className={`py-1.5 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'REGISTER' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Đăng Ký</span>
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              setActiveTab('CHECK_STATUS');
              setError(null);
            }}
            className={`py-1.5 rounded-[2px] transition flex items-center justify-center gap-1 cursor-pointer ${
              activeTab === 'CHECK_STATUS' ? 'bg-sky-500 text-white shadow-sm' : 'text-white/60 hover:text-white'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Tra Cứu</span>
          </button>
        </div>

        {/* Alert Notifications */}
        {error && (
          <div className="flex items-start gap-2 text-rose-300 bg-rose-950/40 p-2.5 rounded-[2px] border border-rose-500/30 text-xs shadow-inner animate-fadeIn">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="flex items-start gap-2 text-emerald-300 bg-emerald-950/40 p-2.5 rounded-[2px] border border-emerald-500/30 text-xs shadow-inner animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{successMsg}</p>
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {activeTab === 'LOGIN' && (
          <form onSubmit={handleLogin} className="space-y-3.5 text-left">
            <div>
              <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                Tên đăng nhập
              </label>
              <input
                type="text"
                placeholder="VD: ktdh_minhanh..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-3 py-2 rounded-[2px] outline-none transition"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Nhập mật khẩu..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white pl-3 pr-9 py-2 rounded-[2px] outline-none transition"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer"
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
              className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-sky-950/40 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isSubmitting ? 'Đang Xác Thực...' : 'Đăng Nhập Kỹ Thuật'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            {/* Alternative Auth divider */}
            <div className="relative flex items-center justify-center my-2">
              <div className="border-t border-white/10 w-full" />
              <span className="bg-[#0D0420] px-2 text-[10px] font-mono text-white/40 uppercase">hoặc</span>
            </div>

            {/* Google Login Option */}
            <button
              type="button"
              onClick={() => handleGoogleAuth(false)}
              disabled={isSubmitting}
              className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-2 px-3 rounded-[2px] border border-white/15 text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#EA4335" d="M12 5c1.54 0 2.9.56 3.96 1.48l2.96-2.96C17.06 1.83 14.7 1 12 1 7.42 1 3.55 3.58 1.63 7.34l3.52 2.73C6.07 7.02 8.79 5 12 5z"/>
                <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58l3.71 2.88c2.16-1.99 3.41-4.91 3.41-8.7z"/>
                <path fill="#FBBC05" d="M5.15 14.93c-.24-.73-.38-1.5-.38-2.31s.14-1.58.38-2.31L1.63 7.55C.6 9.61 0 11.97 0 14.48s.6 4.87 1.63 6.93l3.52-2.73z"/>
                <path fill="#34A853" d="M12 23c3.24 0 5.95-1.08 7.93-2.91l-3.71-2.88c-1.07.72-2.45 1.16-4.22 1.16-3.21 0-5.93-2.02-6.85-5.07L1.63 16.03C3.55 19.79 7.42 22.37 12 22.37z"/>
              </svg>
              <span>Đăng nhập bằng tài khoản Google</span>
            </button>

            {/* Emergency Master Key Access Link */}
            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setActiveTab('MASTER_KEY');
                  setError(null);
                }}
                className="text-[11px] font-mono text-[#F7CAC9]/70 hover:text-[#F7CAC9] transition inline-flex items-center gap-1 cursor-pointer"
              >
                <KeyRound className="w-3 h-3" />
                <span>Trưởng Ban KT: Đăng nhập khẩn cấp (Master Key)</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 2: REGISTER */}
        {activeTab === 'REGISTER' && (
          <form onSubmit={handleRegister} className="space-y-3 text-left">
            <div>
              <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                Họ và tên kỹ thuật viên *
              </label>
              <input
                type="text"
                placeholder="VD: Trần Minh Tuấn"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-3 py-2 rounded-[2px] outline-none transition"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                  Tên đăng nhập *
                </label>
                <input
                  type="text"
                  placeholder="minhtuan_kt"
                  value={regUsername}
                  onChange={(e) => setRegUsername(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-3 py-2 rounded-[2px] outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                  Vị trí chuyên trách *
                </label>
                <select
                  value={regTechnicalRole}
                  onChange={(e) => setRegTechnicalRole(e.target.value as TechnicalRole)}
                  className="w-full bg-[#0D0420] border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-2 py-2 rounded-[2px] outline-none transition cursor-pointer"
                >
                  <option value="SERVER_OPERATOR">🖥️ Điều hành Máy chủ Realtime</option>
                  <option value="LED_OPERATOR">📺 Hiển thị Màn chiếu LED</option>
                  <option value="STAGE_COORDINATOR">🛠️ Điều phối Sân khấu</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                  Mật khẩu (≥ 6 ký tự) *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-3 py-2 rounded-[2px] outline-none transition"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                  Xác nhận mật khẩu *
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-3 py-2 rounded-[2px] outline-none transition"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                Ghi chú nhiệm vụ (Không bắt buộc)
              </label>
              <input
                type="text"
                placeholder="VD: Phụ trách màn LED sân khấu chính hội trường B"
                value={regNote}
                onChange={(e) => setRegNote(e.target.value)}
                className="w-full bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-3 py-1.5 rounded-[2px] outline-none transition"
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
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isSubmitting ? 'Đang Gửi Hồ Sơ...' : 'Gửi Yêu Cầu Đăng Ký'}</span>
              <UserPlus className="w-4 h-4" />
            </button>

            {/* Register with Google option */}
            <div className="pt-1">
              <button
                type="button"
                onClick={() => handleGoogleAuth(true)}
                disabled={isSubmitting}
                className="w-full bg-white/5 hover:bg-white/10 text-white/90 font-bold py-2 px-3 rounded-[2px] border border-white/15 text-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-sky-300" />
                <span>Hoặc đăng ký nhanh bằng Google Account</span>
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: CHECK STATUS */}
        {activeTab === 'CHECK_STATUS' && (
          <div className="space-y-3.5 text-left">
            <form onSubmit={handleCheckStatus} className="space-y-2">
              <label className="block text-[11px] font-mono font-bold text-white/70">
                Nhập Tên đăng nhập hoặc Email cần tra cứu
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="VD: minhtuan_kt hoặc email..."
                  value={checkQuery}
                  onChange={(e) => setCheckQuery(e.target.value)}
                  className="flex-1 bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-sky-400 font-mono text-xs text-white px-3 py-2 rounded-[2px] outline-none transition"
                  required
                />
                <button
                  type="submit"
                  disabled={isChecking}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-[2px] flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>Tra cứu</span>
                </button>
              </div>
            </form>

            {/* Check Result Card */}
            {checkResult && checkResult.exists && (
              <div className="p-3.5 rounded-[2px] bg-white/5 border border-white/15 space-y-2 animate-fadeIn font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm">{checkResult.fullName}</span>
                  <span
                    className={`px-2 py-0.5 rounded-[2px] text-[10px] font-bold uppercase tracking-wider ${
                      checkResult.status === 'PENDING'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : checkResult.status === 'APPROVED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {checkResult.status === 'PENDING'
                      ? '⏳ Chờ Phê Duyệt'
                      : checkResult.status === 'APPROVED'
                      ? '✓ Đã Phê Duyệt'
                      : '✕ Từ Chối / Thu Hồi'}
                  </span>
                </div>

                <div className="text-[11px] text-white/60 space-y-1 pt-1 border-t border-white/10">
                  <p>Vị trí: <strong>{TECHNICAL_ROLES[checkResult.technicalRole as TechnicalRole]?.label || checkResult.technicalRole}</strong></p>
                  <p>Ngày gửi: {new Date(checkResult.createdAt).toLocaleDateString('vi-VN')}</p>
                  {checkResult.approvedAt && (
                    <p className="text-emerald-300">Đã duyệt ngày: {new Date(checkResult.approvedAt).toLocaleDateString('vi-VN')} ({checkResult.approvedBy})</p>
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

        {/* TAB 4: MASTER KEY EMERGENCY FALLBACK */}
        {activeTab === 'MASTER_KEY' && (
          <form onSubmit={handleMasterLogin} className="space-y-3.5 text-left">
            <div className="p-3 bg-rose-950/30 border border-rose-500/30 rounded-[2px] text-xs text-rose-200">
              <strong>Cổng Khẩn Cấp Dành Cho Trưởng Ban Kỹ Thuật:</strong> Sử dụng mật mã bí mật để mở khóa tức thì quyền Root Super Admin trong sự cố.
            </div>

            <div>
              <label className="block text-[11px] font-mono font-bold text-white/70 mb-1">
                Mật mã khẩn cấp (Master Passcode)
              </label>
              <div className="relative">
                <input
                  type={showMasterPasscode ? 'text' : 'password'}
                  placeholder="NHẬP MASTER PASSCODE..."
                  value={masterPasscode}
                  onChange={(e) => setMasterPasscode(e.target.value)}
                  className="w-full bg-[#0D0420]/60 border border-rose-500/30 hover:border-rose-400 focus:border-rose-400 font-mono text-center tracking-widest text-xs text-white pl-3 pr-9 py-2.5 rounded-[2px] outline-none transition"
                  autoFocus
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowMasterPasscode(!showMasterPasscode)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition cursor-pointer"
                >
                  {showMasterPasscode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold py-2.5 px-4 rounded-[2px] uppercase text-xs tracking-wider transition shadow-md shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-98"
            >
              <span>{isSubmitting ? 'Đang Mở Khóa...' : 'Mở Khóa Root Khẩn Cấp'}</span>
              <KeyRound className="w-4 h-4" />
            </button>

            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => setActiveTab('LOGIN')}
                className="text-[11px] font-mono text-white/50 hover:text-white transition cursor-pointer"
              >
                ← Quay lại màn hình đăng nhập thường
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
