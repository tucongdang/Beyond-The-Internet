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

  // Debug: log protection state changes so operator can verify in DevTools
  useEffect(() => {
    if (isProtectionActive) {
      console.log('[AntiExitGuard] 🛡️ Protection ACTIVE — beforeunload, popstate, hashchange listeners attached');
    } else {
      console.log('[AntiExitGuard] 🔓 Protection INACTIVE — enabled:', enabled, '| anti_exit_protection:', gameState?.anti_exit_protection);
    }
  }, [isProtectionActive, enabled, gameState?.anti_exit_protection]);

  // 1. Intercept beforeunload (closing tab, F5 refresh, closing browser, URL change)
  //    Uses { capture: true } so this fires BEFORE any other beforeunload handler
  //    that might call stopPropagation(). Also adds 'unload' as mobile fallback.
  useEffect(() => {
    if (!isProtectionActive) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      // Standard: preventDefault() triggers the browser's native "Leave site?" dialog
      e.preventDefault();
      // Legacy fallback for older browsers: setting returnValue
      const warningMessage = localLanguage !== 'vi' 
        ? 'You are currently participating in a live session. Are you sure you want to exit?' 
        : 'Bạn đang tham gia trận đấu trực tiếp. Bạn có chắc chắn muốn thoát khỏi trình duyệt không?';
      e.returnValue = warningMessage;
      return warningMessage;
    };

    // Attach with capture: true to guarantee first execution
    window.addEventListener('beforeunload', handleBeforeUnload, { capture: true });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload, { capture: true });
    };
  }, [isProtectionActive, localLanguage]);

  // 2. Intercept popstate (browser back button & swipe back on mobile)
  //    Pushes MULTIPLE history entries to make back-button interception more reliable,
  //    especially on iOS Safari where a single pushState can be bypassed by rapid swipes.
  useEffect(() => {
    if (!isProtectionActive) return;

    // Push multiple history entries for more robust back-button blocking
    const pushGuardEntries = () => {
      try {
        // Push 3 guard entries so rapid back presses are still caught
        for (let i = 0; i < 3; i++) {
          window.history.pushState({ antiExitGuard: true, idx: i }, '', window.location.href);
        }
      } catch {
        // Ignore — some environments restrict pushState calls
      }
    };

    pushGuardEntries();

    const handlePopState = (e: PopStateEvent) => {
      // Re-push guard entries so subsequent back presses are also intercepted
      pushGuardEntries();

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

  // 2b. Intercept hashchange (catches hash-based navigation that may bypass popstate)
  useEffect(() => {
    if (!isProtectionActive) return;

    const handleHashChange = (e: HashChangeEvent) => {
      // Prevent hash navigation by restoring the original URL
      e.preventDefault();
      try {
        window.history.pushState({ antiExitGuard: true }, '', e.oldURL || window.location.href);
      } catch {
        // Ignore
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
    };
  }, [isProtectionActive]);

  // 3. Handle Visibility change (warning when user switches tab or minimizes browser)
  useEffect(() => {
    if (!isProtectionActive) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // If AudienceView is already displaying the tab departure warning, skip duplicate toast
        if (document.getElementById('audience-tab-warning')) {
          return;
        }
        // User returned to tab -> Show alert toast
        setIsToastVisible(true);
        if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
        toastTimerRef.current = setTimeout(() => {
          setIsToastVisible(false);
        }, 4500);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [isProtectionActive]);

  // 4. Periodically re-verify history guard entries haven't been consumed
  //    (iOS Safari can silently consume pushState entries on certain gestures)
  useEffect(() => {
    if (!isProtectionActive) return;

    const interval = setInterval(() => {
      try {
        // Only push if we don't already have a guard entry (check via state)
        if (!window.history.state?.antiExitGuard) {
          window.history.pushState({ antiExitGuard: true, idx: 0 }, '', window.location.href);
        }
      } catch {
        // Ignore
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isProtectionActive]);

  // Handle Stay in Match
  const handleStayInMatch = useCallback(() => {
    soundFx.playClick();
    vibrateSuccess();
    setShowExitConfirmModal(false);
    // Re-push history entries
    try {
      for (let i = 0; i < 3; i++) {
        window.history.pushState({ antiExitGuard: true, idx: i }, '', window.location.href);
      }
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

      {/* Return to Tab Warning Toast - Full RED Alert */}
      {isToastVisible && (
        <div 
          id="anti-exit-warning-toast"
          className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:top-20 left-1/2 -translate-x-1/2 z-[90] max-w-md w-[92vw] bg-rose-950/95 border-2 border-rose-500 text-rose-100 p-3.5 rounded-[3px] shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3 text-xs font-sans animate-bounce-short shadow-rose-950/90 ring-1 ring-rose-400/40"
        >
          <div className="flex items-start gap-2.5 min-w-0">
            <div className="p-2 rounded-[2px] bg-rose-500/20 text-rose-400 shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 animate-pulse" />
            </div>
            <div className="min-w-0">
              <strong className="block text-rose-200 font-mono font-bold uppercase text-[11px] tracking-wider">
                {localLanguage !== 'vi' ? 'Screen Switch Warning' : 'CẢNH BÁO CHUYỂN MÀN HÌNH'}
              </strong>
              <p className="text-[11px] text-rose-100/90 leading-relaxed mt-0.5">
                {localLanguage !== 'vi' 
                  ? 'Please stay on this browser tab to keep your connection active and not miss quiz questions!'
                  : 'Hãy duy trì màn hình này để giữ kết nối ổn định và không bỏ lỡ điểm số câu hỏi!'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsToastVisible(false)}
            className="p-1.5 rounded hover:bg-rose-900/60 text-rose-400 hover:text-white transition shrink-0 cursor-pointer"
            title="Đóng cảnh báo"
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
