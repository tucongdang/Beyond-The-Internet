import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Maximize2, 
  AlertTriangle, 
  X, 
  EyeOff, 
  Cpu, 
  Key, 
  Download,
  CheckCircle2,
  AlertOctagon,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateWarning, vibrateError, vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';

interface SebAntiCheatGuardProps {
  enabled?: boolean;
  user?: UserInfo | null;
  gameState?: GameState;
  showStatusPill?: boolean;
  onViolation?: (violationType: string, count: number) => void;
}

export const SebAntiCheatGuard: React.FC<SebAntiCheatGuardProps> = ({
  enabled = true,
  user,
  gameState,
  showStatusPill = false,
  onViolation
}) => {
  const { localLanguage } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [isDevToolsDetected, setIsDevToolsDetected] = useState<boolean>(false);
  const [violationCount, setViolationCount] = useState<number>(0);
  const [violationReason, setViolationReason] = useState<string>('');
  const [showViolationModal, setShowViolationModal] = useState<boolean>(false);
  const [isSebBrowserDetected, setIsSebBrowserDetected] = useState<boolean>(false);

  const isSebActive = enabled && (gameState?.seb_mode_enabled === true);
  const isStrictKiosk = gameState?.seb_strict_kiosk !== false;

  // 1. Detect authentic Safe Exam Browser User Agent
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const ua = navigator.userAgent || '';
    const isSeb = /SEB|SafeExamBrowser/i.test(ua) || Boolean((window as any).SEB);
    setIsSebBrowserDetected(isSeb);
  }, []);

  // Record Violation Function
  const recordViolation = useCallback((reason: string) => {
    soundFx.playAlarm();
    vibrateError();

    setViolationCount(prev => {
      const nextCount = prev + 1;
      setViolationReason(reason);
      setShowViolationModal(true);
      if (onViolation) {
        onViolation(reason, nextCount);
      }
      return nextCount;
    });
  }, [onViolation]);

  // 2. Fullscreen Change Handler
  useEffect(() => {
    if (!isSebActive || !isStrictKiosk) return;

    const handleFullscreenChange = () => {
      const isFS = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );

      setIsFullscreen(isFS);
      if (!isFS) {
        recordViolation(
          localLanguage !== 'vi' 
            ? 'Exited Fullscreen Kiosk Mode' 
            : 'Đã thoát chế độ Màn hình Toàn cảnh Kiosk'
        );
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [isSebActive, isStrictKiosk, localLanguage, recordViolation]);

  // 3. Hardware Keyboard Shortcuts & Right Click Blocker
  useEffect(() => {
    if (!isSebActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Keys to block: F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+Shift+C, Ctrl+U, Ctrl+S, Ctrl+P, Alt+Tab, Meta
      const isF12 = e.key === 'F12';
      const isInspect = (e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.key === 'J' || e.key === 'j' || e.key === 'C' || e.key === 'c');
      const isViewSource = (e.ctrlKey || e.metaKey) && (e.key === 'U' || e.key === 'u');
      const isSavePrint = (e.ctrlKey || e.metaKey) && (e.key === 'S' || e.key === 's' || e.key === 'P' || e.key === 'p');
      const isCopyCut = (e.ctrlKey || e.metaKey) && (e.key === 'C' || e.key === 'c' || e.key === 'X' || e.key === 'x');

      if (isF12 || isInspect || isViewSource || isSavePrint || isCopyCut) {
        e.preventDefault();
        e.stopPropagation();
        recordViolation(
          localLanguage !== 'vi' 
            ? `Blocked Shortcut Trigger: ${e.key}` 
            : `Đã chặn phím tắt gian lận: ${e.key}`
        );
        return false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      recordViolation(
        localLanguage !== 'vi' 
          ? 'Right-Click Context Menu Attempt' 
          : 'Thao tác nhấp chuột phải đã bị cấm'
      );
      return false;
    };

    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
    };
  }, [isSebActive, localLanguage, recordViolation]);

  // 4. DevTools Detection Trap (Outer vs Inner Dimension Check)
  useEffect(() => {
    if (!isSebActive) return;

    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > 160;
      const heightThreshold = window.outerHeight - window.innerHeight > 160;

      if (widthThreshold || heightThreshold) {
        if (!isDevToolsDetected) {
          setIsDevToolsDetected(true);
          recordViolation(
            localLanguage !== 'vi' 
              ? 'Developer Tools Inspection Window Detected' 
              : 'Phát hiện cửa sổ Trình kiểm tra phần tử (DevTools)'
          );
        }
      } else {
        setIsDevToolsDetected(false);
      }
    };

    const intervalId = setInterval(checkDevTools, 1500);
    window.addEventListener('resize', checkDevTools);

    return () => {
      clearInterval(intervalId);
      window.removeEventListener('resize', checkDevTools);
    };
  }, [isSebActive, isDevToolsDetected, localLanguage, recordViolation]);

  // Request Fullscreen Helper
  const requestFullscreenKiosk = async () => {
    soundFx.playClick();
    vibrateTap();
    try {
      const elem = document.documentElement as any;
      if (elem.requestFullscreen) {
        await elem.requestFullscreen();
      } else if (elem.webkitRequestFullscreen) {
        await elem.webkitRequestFullscreen();
      } else if (elem.msRequestFullscreen) {
        await elem.msRequestFullscreen();
      }
      setShowViolationModal(false);
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen request failed:', err);
    }
  };

  if (!isSebActive) {
    return null;
  }

  return (
    <>
      {/* SEB Status Indicator Pill (Top-Left) */}
      {showStatusPill && (
        <div 
          className="fixed top-2.5 left-2.5 z-[80] bg-[#001D3D]/90 border border-[#0078D4]/60 text-white text-[10px] sm:text-xs font-mono font-bold py-1 px-2.5 rounded-[3px] shadow-lg backdrop-blur-md flex items-center gap-1.5 animate-fadeIn select-none pointer-events-none"
          title="Safe Exam Browser (SEB) Kiosk Engine Active"
        >
          <Lock className="w-3.5 h-3.5 text-[#38BDF8] shrink-0 animate-pulse" />
          <span className="hidden sm:inline">SEB ANTI-CHEAT KIOSK</span>
          <span className="sm:hidden">SEB KIOSK</span>
          {isSebBrowserDetected ? (
            <span className="bg-[#107C41] text-white text-[9px] px-1 py-0.2 rounded font-mono">SEB NATIVE</span>
          ) : (
            <span className="bg-[#0078D4] text-white text-[9px] px-1 py-0.2 rounded font-mono">WEB KIOSK</span>
          )}
        </div>
      )}

      {/* SEB Security Violation Modal */}
      {showViolationModal && (
        <div 
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-2xl animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg bg-[#020B19]/98 border-2 border-rose-500/80 rounded-[4px] shadow-2xl overflow-hidden font-sans text-white text-left relative animate-scaleUp">
            {/* Fluent Alert Header */}
            <div className="h-1.5 bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 animate-pulse" />

            <div className="p-5 sm:p-6 space-y-4">
              <div className="flex items-start gap-3.5">
                <div className="w-12 h-12 rounded-[3px] bg-rose-950/90 border border-rose-500/60 flex items-center justify-center text-rose-400 shrink-0 shadow-lg shadow-rose-950/60">
                  <AlertOctagon className="w-7 h-7 text-rose-400 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-rose-300 font-mono uppercase tracking-wider">
                    {localLanguage !== 'vi' ? '⚠️ SEB SECURITY BREACH DETECTED' : '⚠️ PHÁT HIỆN VI PHẠM AN NINH SEB'}
                  </h3>
                  <p className="text-xs text-rose-200/80 font-mono mt-0.5">
                    Safe Exam Browser Kiosk Protocol Enforced
                  </p>
                </div>
              </div>

              {/* Violation Detail Box */}
              <div className="p-4 bg-rose-950/50 border border-rose-500/40 rounded-[3px] space-y-2 font-mono text-xs text-rose-100">
                <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
                  <span className="text-rose-300 uppercase">Lý do vi phạm:</span>
                  <span className="font-bold text-amber-300">{violationReason || 'N/A'}</span>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="text-slate-300">Tổng số lần vi phạm:</span>
                  <span className="font-bold text-rose-400 text-sm bg-rose-950 px-2 py-0.5 rounded border border-rose-500/40">
                    {violationCount} / 5
                  </span>
                </div>
                {user && (
                  <div className="text-[10px] text-slate-300 pt-1 border-t border-rose-500/20 flex justify-between">
                    <span>Thí sinh: <strong>{user.name}</strong></span>
                    <span>MSSV: <strong>{user.mssv || '---'}</strong></span>
                  </div>
                )}
              </div>

              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {localLanguage !== 'vi'
                  ? 'To maintain examination integrity, Safe Exam Browser requires remaining in Fullscreen Kiosk Mode without closing or inspecting elements.'
                  : 'Để đảm bảo tính minh bạch của kỳ thi, hệ thống yêu cầu duy trì chế độ Toàn Màn Hình Kiosk và nghiêm cấm mọi hành vi kiểm tra phần tử hoặc sử dụng phím tắt.'}
              </p>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={requestFullscreenKiosk}
                  className="w-full py-3 px-4 rounded-[3px] bg-[#0078D4] hover:bg-[#106EBE] text-white font-bold text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 transition cursor-pointer font-mono border border-sky-400/30"
                >
                  <Maximize2 className="w-4 h-4 text-sky-200" />
                  <span>{localLanguage !== 'vi' ? 'Re-Enter Fullscreen Kiosk Mode' : 'QUAY LẠI MÀN HÌNH KIOSK TOÀN CẢNH'}</span>
                </button>
              </div>
            </div>

            <div className="bg-[#001026] border-t border-slate-800 px-4 py-2 text-[10px] font-mono text-center text-slate-400">
              Safe Exam Browser (SEB) • Anti-Cheating Protection Engine
            </div>
          </div>
        </div>
      )}
    </>
  );
};
