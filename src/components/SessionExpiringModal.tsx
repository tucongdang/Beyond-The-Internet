import React from 'react';
import { AlertTriangle, Clock, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

interface SessionExpiringModalProps {
  isOpen: boolean;
  secondsRemaining: number;
  onStayLoggedIn: () => void;
  onLogoutNow: () => void;
}

export const SessionExpiringModal: React.FC<SessionExpiringModalProps> = ({
  isOpen,
  secondsRemaining,
  onStayLoggedIn,
  onLogoutNow,
}) => {
  if (!isOpen) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / 120) * 100));

  const handleStayLoggedIn = () => {
    vibrateSuccess();
    soundFx.playSuccess();
    onStayLoggedIn();
  };

  const handleLogoutNow = () => {
    vibrateTap();
    soundFx.playClick();
    onLogoutNow();
  };

  return (
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="session-expiring-title"
    >
      <div className="relative w-full max-w-md bg-[#001D3D] border border-amber-500/60 rounded-[3px] p-6 shadow-2xl text-white space-y-5 animate-scaleUp">
        {/* Header Icon & Title */}
        <div className="flex items-start gap-3.5">
          <div className="p-3 bg-amber-500/20 border border-amber-500/40 rounded-[3px] text-amber-400 shrink-0 animate-pulse">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 
                id="session-expiring-title"
                className="text-base sm:text-lg font-black tracking-wide uppercase text-amber-300"
              >
                Phiên Làm Việc Sắp Hết Hạn
              </h3>
              <span className="text-[9px] font-mono font-semibold bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded text-amber-200 uppercase">
                Session Expiring
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Do 28 phút không thao tác, hệ thống sẽ tự động đăng xuất để bảo vệ an toàn dữ liệu sau:
            </p>
          </div>
        </div>

        {/* Live Countdown Clock & Progress Bar */}
        <div className="bg-slate-950/90 border border-amber-500/30 rounded p-4 text-center space-y-2.5">
          <div className="text-4xl font-mono font-black tracking-widest text-amber-400 drop-shadow-[0_0_15px_rgba(245,158,11,0.5)]">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <p className="text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            Tự động hết hạn khi đếm ngược về 00:00
          </p>

          {/* Animated Countdown Progress Bar */}
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden border border-amber-500/30">
            <div
              className="bg-gradient-to-r from-amber-500 via-amber-400 to-red-500 h-full transition-all duration-1000 ease-linear shadow-sm shadow-amber-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-amber-950/40 border border-amber-500/20 rounded p-3 text-[11px] text-amber-200/90 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400 shrink-0" />
          <span>Bấm <strong>Duy trì đăng nhập (Stay Logged In)</strong> để reset bộ đếm và giữ nguyên tiến độ công việc.</span>
        </div>

        {/* Modal Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleLogoutNow}
            className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold uppercase rounded-[2px] border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Đăng Xuất Ngay
          </button>

          <button
            type="button"
            onClick={handleStayLoggedIn}
            className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold uppercase rounded-[2px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all transform active:scale-95"
          >
            <RefreshCw className="w-4 h-4" />
            Duy Trì Đăng Nhập (Stay Logged In)
          </button>
        </div>
      </div>
    </div>
  );
};
