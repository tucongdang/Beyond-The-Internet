import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  LogOut, 
  AlertTriangle, 
  X, 
  ArrowRight
} from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateWarning, vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';

interface AntiExitGuardProps {
  enabled?: boolean;
  user?: UserInfo | null;
  gameState?: GameState;
  onConfirmExit?: () => void;
  showStatusPill?: boolean;
}

export const AntiExitGuard: React.FC<AntiExitGuardProps> = ({
  enabled = true,
  user,
  gameState,
  onConfirmExit,
  showStatusPill = false
}) => {
  const { localLanguage } = useLanguage();
  const [showExitConfirmModal, setShowExitConfirmModal] = useState<boolean>(false);
  const [isToastVisible, setIsToastVisible] = useState<boolean>(false);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isProtectionActive = enabled && (gameState?.anti_exit_protection !== false);

  // 1. Intercept beforeunload (closing tab, F5 refresh, closing browser, URL change)
  useEffect(() => {
    if (!isProtectionActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      const warningMessage = localLanguage !== 'vi' 
        ? 'You are currently participating in a live session. Are you sure you want to exit?' 
        : 'Bạn đang tham gia trận đấu trực tiếp. Bạn có chắc chắn muốn thoát khỏi trình duyệt không?';
      e.returnValue = warningMessage;
      return warningMessage;
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isProtectionActive, localLanguage]);

  // 2. Intercept popstate (browser back button & swipe back on mobile)
  useEffect(() => {
    if (!isProtectionActive) return;

    // Push initial history state so popstate can intercept back navigation
    try {
      window.history.pushState({ antiExitGuard: true }, '', window.location.href);
    } catch {
      // Ignore
    }

    const handlePopState = () => {
      // Re-push state so user stays on current URL
      try {
        window.history.pushState({ antiExitGuard: true }, '', window.location.href);
      } catch {
        // Ignore
      }

      // Play warning sound and vibrate
      soundFx.playAlarm();
      vibrateWarning();

      // Show custom exit confirmation modal
      setShowExitConfirmModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [isProtectionActive]);

  // 3. Handle Visibility change (warning when user switches tab or minimizes browser)
  useEffect(() => {
    if (!isProtectionActive) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // User returned to tab -> Show alert toast
        setIsToastVisible(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setIsToastVisible(false);
        }, 4000);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [isProtectionActive]);

  // Handle Stay in Match
  const handleStayInMatch = useCallback(() => {
    soundFx.playClick();
    vibrateSuccess();
    setShowExitConfirmModal(false);
    // Re-push history entry
    try {
      window.history.pushState({ antiExitGuard: true }, '', window.location.href);
    } catch {
      // Ignore
    }
  }, []);

  // Handle Confirmed Exit
  const handleProceedExit = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    setShowExitConfirmModal(false);
    if (onConfirmExit) {
      onConfirmExit();
    } else {
      window.location.href = '/';
    }
  }, [onConfirmExit]);

  if (!isProtectionActive) {
    return null;
  }

  return (
    <>
      {/* Optional Floating Status Badge */}
      {showStatusPill && (
        <div 
          className="fixed top-2.5 right-2.5 z-[80] bg-[#001D3D]/80 border border-[#0078D4]/40 text-[#60A5FA] text-[10px] sm:text-xs font-mono font-bold py-1 px-2.5 rounded-[3px] shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-fadeIn select-none pointer-events-none"
          title="Chống thoát trình duyệt đang hoạt động"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#38BDF8] shrink-0" />
          <span className="hidden sm:inline">CHỐNG THOÁT TRÌNH DUYỆT</span>
          <span className="sm:hidden">CHỐNG THOÁT</span>
        </div>
      )}

      {/* Return to Tab Warning Toast - Fluent UI MessageBar Style */}
      {isToastVisible && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-[90] max-w-md w-[92vw] bg-[#291800]/95 border border-[#F59E0B]/60 text-amber-100 p-3 rounded-[3px] shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 text-xs font-sans animate-bounce-short">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0 animate-pulse" />
            <div>
              <strong className="block text-amber-200 font-mono font-bold uppercase text-[11px]">
                {localLanguage !== 'vi' ? 'Focus Loss Warning' : 'Cảnh Báo Chuyển Màn Hình'}
              </strong>
              <p className="text-[11px] text-amber-100/90 leading-tight">
                {localLanguage !== 'vi' 
                  ? 'Please stay on this browser tab to keep your connection active and not miss quiz questions!'
                  : 'Hãy duy trì màn hình này để giữ kết nối ổn định và không bỏ lỡ điểm số câu hỏi!'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsToastVisible(false)}
            className="p-1 rounded hover:bg-amber-900/60 text-amber-300 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Exit Confirmation Modal - Fluent UI Acrylic Dialog */}
      {showExitConfirmModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-2xl animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md bg-[#020B19]/95 border border-[#38BDF8]/40 rounded-[4px] shadow-2xl overflow-hidden font-sans text-white text-left relative animate-scaleUp">
            {/* Top Fluent Accent Bar */}
            <div className="h-1 bg-gradient-to-r from-[#0078D4] via-[#0284C7] to-[#107C41]" />

            {/* Modal Body */}
            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-11 h-11 rounded-[3px] bg-[#002855]/80 border border-[#0078D4]/50 flex items-center justify-center text-[#38BDF8] shrink-0 shadow-lg shadow-sky-950/50">
                  <ShieldAlert className="w-5.5 h-5.5 text-[#38BDF8]" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white font-mono uppercase tracking-wider">
                    {localLanguage !== 'vi' ? 'Confirm Exit Match' : 'XÁC NHẬN RỜI TRẬN ĐẤU'}
                  </h3>
                  <p className="text-xs text-sky-200/70 font-mono mt-0.5">
                    {localLanguage !== 'vi' ? 'Anti-Exit Guard Active' : 'Cơ chế chống thoát trình duyệt đang bảo vệ phiên thi'}
                  </p>
                </div>
              </div>

              {/* Message Content */}
              <div className="p-3.5 bg-[#001D3D]/60 border border-[#0078D4]/30 rounded-[3px] text-xs text-slate-200 leading-relaxed space-y-2">
                <p>
                  {localLanguage !== 'vi'
                    ? 'You are currently participating in a live event. Leaving or refreshing the page now may interrupt your session and score!'
                    : 'Bạn đang trong phiên thi đấu trực tiếp. Việc thoát trình duyệt hoặc chuyển trang lúc này có thể làm gián đoạn kết nối và ảnh hưởng tới điểm số!'}
                </p>
                {user && (
                  <div className="pt-2 border-t border-[#0078D4]/20 flex items-center justify-between font-mono text-[11px] text-sky-300">
                    <span>Khán giả: <strong>{user.name}</strong></span>
                    <span>MSSV: <strong>{user.mssv || '---'}</strong></span>
                  </div>
                )}
              </div>

              {/* Action Buttons - Fluent UI Button Styling */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  onClick={handleStayInMatch}
                  className="w-full py-3 px-4 rounded-[3px] bg-[#0078D4] hover:bg-[#106EBE] active:bg-[#005A9E] text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition cursor-pointer font-mono border border-sky-400/30"
                >
                  <ShieldCheck className="w-4 h-4 text-sky-200" />
                  <span>{localLanguage !== 'vi' ? 'Stay In Match (Recommended)' : 'Ở LẠI TRẬN ĐẤU (KHUYÊN DÙNG)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleProceedExit}
                  className="w-full py-2.5 px-4 rounded-[3px] bg-slate-900/60 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/50 text-slate-300 hover:text-rose-200 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition cursor-pointer font-mono"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{localLanguage !== 'vi' ? 'Proceed Exit' : 'Vẫn Muốn Rời Đi'}</span>
                </button>
              </div>
            </div>

            {/* Fluent Footer Note */}
            <div className="bg-[#001026]/80 border-t border-slate-800 px-4 py-2 text-[10px] font-mono text-center text-slate-400">
              Fluent Design System • Anti-Exit Protection Guard
            </div>
          </div>
        </div>
      )}
    </>
  );
};
