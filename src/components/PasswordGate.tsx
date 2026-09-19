import React, { useState } from 'react';
import { Lock, ArrowRight, ShieldAlert, KeyRound, Eye, EyeOff } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateError } from '../utils/hapticUtils';

interface PasswordGateProps {
  isAuthenticated: boolean;
  onAuthenticated: () => void;
  viewName: string;
  children: React.ReactNode;
}

export const PasswordGate: React.FC<PasswordGateProps> = ({
  isAuthenticated,
  onAuthenticated,
  viewName,
  children
}) => {
  const [passcode, setPasscode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isAuthenticated) {
    return <>{children}</>;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPasscode = passcode.trim();
    if (cleanPasscode === 'BTI2026Admin' || cleanPasscode === 'admin123') {
      soundFx.playClick();
      vibrateSuccess();
      setError(null);
      onAuthenticated();
    } else {
      soundFx.playError();
      vibrateError();
      setError('Mật mã quản trị không chính xác. Vui lòng thử lại!');
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100dvh-4rem)] flex items-center justify-center p-4 bg-transparent">
      <div className="fluent-box p-8 max-w-sm w-full text-center space-y-6 relative overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-[#F7CAC9]/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="w-16 h-16 rounded-[2px] bg-[#241148]/50 border border-[#3E1D74] flex items-center justify-center mx-auto relative z-10 shadow-lg border-t-[#F7CAC9]/20">
          <Lock className="w-8 h-8 text-[#F7CAC9]" />
        </div>
        
        <div className="relative z-10 space-y-2">
          <h2 className="text-xl font-bold text-[#F5EFF9] tracking-wide uppercase">Xác thực quyền hạn</h2>
          <p className="text-xs text-[#B6A6D8]">
            Vui lòng nhập mật mã để truy cập khu vực <strong className="text-[#F7CAC9]">{viewName}</strong>.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 relative z-10 text-left">
          {error && (
            <div className="flex items-start gap-2 text-rose-400 bg-rose-950/40 p-3 rounded-[2px] border border-rose-500/20 text-xs shadow-inner">
              <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="NHẬP MẬT MÃ QUẢN TRỊ..."
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full bg-[#0D0420]/40 border border-white/10 hover:border-white/20 focus:border-[#F7CAC9]/60 text-center font-mono text-sm text-white px-10 py-3 rounded-[2px] outline-none tracking-widest transition shadow-inner"
              autoFocus
            />
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                setShowPassword(!showPassword);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B6A6D8] hover:text-white transition"
              title={showPassword ? 'Ẩn mật mã' : 'Hiển thị mật mã'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          <button
            type="submit"
            className="w-full bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black py-3.5 px-6 rounded-[2px] uppercase text-xs tracking-wider transition shadow-lg shadow-[#F7CAC9]/20 flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Mở Khóa Hệ Thống</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
