import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { WifiOff, RefreshCw, X, Clock, AlertCircle, HardDrive, Cloud } from 'lucide-react';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';
import { useOfflineSyncState } from '../utils/offlineModeUtils';

interface OfflineBannerProps {
  isFirebaseConnected: boolean;
  isDismissed: boolean;
  onDismiss: () => void;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({
  isFirebaseConnected,
  isDismissed,
  onDismiss
}) => {
  const { localLanguage } = useLanguage();
  const isEn = localLanguage !== 'vi';
  const { isOfflineMode, pendingCount, isSyncing } = useOfflineSyncState();
  const [countdown, setCountdown] = useState<number>(5);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const [isDismissing, setIsDismissing] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerReconnect = useCallback(async () => {
    setIsReconnecting(true);
    try {
      syncService.initializeFirebase();
      await syncService.measurePing();
      await syncService.syncPendingOfflineProgress();
    } catch (err) {
      console.warn('Auto-reconnect error:', err);
    } finally {
      setIsReconnecting(false);
      setReconnectAttempts(prev => prev + 1);
      setCountdown(5);
    }
  }, []);

  const handleManualRetry = () => {
    vibrateTap();
    soundFx.playClick();
    triggerReconnect();
  };

  const handleDismiss = () => {
    vibrateTap();
    soundFx.playClick();
    setIsDismissing(true);
    setTimeout(() => {
      onDismiss();
      setIsDismissing(false);
    }, 280);
  };

  // Reconnection countdown lifecycle whenever actual network/Firebase connection drops
  useEffect(() => {
    if (isFirebaseConnected || isDismissed) {
      setCountdown(5);
      setIsReconnecting(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    if (isReconnecting) {
      return;
    }

    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isFirebaseConnected, isDismissed, isReconnecting]);

  // When countdown hits 0, trigger reconnect safely inside an effect
  useEffect(() => {
    if (countdown === 0 && !isReconnecting && !isFirebaseConnected && !isDismissed) {
      triggerReconnect();
    }
  }, [countdown, isReconnecting, isFirebaseConnected, isDismissed, triggerReconnect]);

  if (isFirebaseConnected || isDismissed) {
    return null;
  }

  if (typeof document === 'undefined') {
    return null;
  }

  // Network dropped while Offline Backup Mode is ON -> calm resilience notice (no panic)
  if (isOfflineMode) {
    return createPortal(
      <div
        id="offline-mode-active-banner"
        role="status"
        aria-live="polite"
        style={{ position: 'fixed' }}
        className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] max-w-[calc(100vw-2rem)] z-40 rounded-[2px] bg-[#170e2e]/95 backdrop-blur-[32px] saturate-[180%] text-white p-4 shadow-[0_24px_64px_rgba(0,0,0,0.85),0_0_28px_rgba(245,158,11,0.22)] border border-amber-400/50 ring-1 ring-amber-400/25 flex flex-col gap-3 transition-all duration-300 ${
          isDismissing ? 'animate-fluent-toast-exit' : 'animate-fluent-toast-enter'
        } overflow-hidden select-none pointer-events-auto`}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[2px] fluent-box-nested border border-amber-400/45 flex items-center justify-center shrink-0">
            {isReconnecting ? (
              <RefreshCw className="w-5 h-5 text-amber-300 animate-spin" />
            ) : (
              <WifiOff className="w-5 h-5 text-amber-300" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider bg-amber-500/20 text-amber-200 border border-amber-400/50">
                <HardDrive className="w-3 h-3 text-amber-300" />
                {isEn ? 'OFFLINE BACKUP ACTIVE' : 'LƯU NGOẠI TUYẾN ĐANG BẬT'}
              </span>
              {pendingCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-sky-500/20 text-sky-200 border border-sky-400/40">
                  {pendingCount} {isEn ? 'saved locally' : 'đã lưu cục bộ'}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-white/10 text-amber-200 border border-white/15">
                <Clock className="w-3 h-3 text-amber-300" />
                {isReconnecting
                  ? (isEn ? 'Checking...' : 'Đang thử...')
                  : (isEn ? `${countdown}s` : `${countdown}s`)}
              </span>
            </div>

            <p className="text-xs text-white/90 leading-relaxed font-medium">
              {isEn
                ? 'WiFi/4G connection lost. Offline Mode keeps saving your quiz progress locally and will auto-sync to Firebase once reconnected.'
                : 'Mất kết nối mạng (WiFi/4G). Chế độ Ngoại tuyến vẫn lưu tiến trình thi cục bộ và sẽ tự động đồng bộ khi có mạng trở lại.'}
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            title={isEn ? 'Hide notice' : 'Tạm ẩn thông báo'}
            aria-label={isEn ? 'Hide offline mode notice' : 'Ẩn thông báo chế độ ngoại tuyến'}
            className="fluent-subtab-btn p-1.5 rounded-[2px] border border-transparent hover:border-white/15 hover:bg-white/10 text-amber-300/80 hover:text-white transition shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          <span className="text-[10px] font-mono text-amber-200/80">
            {isEn ? 'Auto-syncs when online' : 'Tự đồng bộ khi có WiFi/4G'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDismiss}
              className="fluent-btn px-3 py-1.5 rounded-[2px] fluent-box-nested border border-white/10 hover:border-white/20 text-xs font-mono font-bold text-white/80 hover:text-white transition cursor-pointer"
            >
              {isEn ? 'Hide' : 'Ẩn'}
            </button>
            <button
              type="button"
              onClick={handleManualRetry}
              disabled={isReconnecting || isSyncing}
              className="fluent-btn px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-[0.98] text-xs font-mono font-black uppercase tracking-wider text-black rounded-[2px] transition shadow-lg border border-amber-300/60 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              {isReconnecting || isSyncing ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Cloud className="w-3.5 h-3.5" />
              )}
              <span>{isEn ? 'Retry & Sync' : 'Thử Kết Nối & Đồng Bộ'}</span>
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  const progressPercent = Math.max(0, Math.min(100, ((5 - countdown) / 5) * 100));

  return createPortal(
    <div
      id="offline-connection-banner"
      role="alert"
      aria-live="assertive"
      style={{ position: 'fixed' }}
      className={`fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-[420px] max-w-[calc(100vw-2rem)] z-40 rounded-[2px] bg-[#1c0816]/95 backdrop-blur-[32px] saturate-[180%] text-white p-4 shadow-[0_24px_64px_rgba(0,0,0,0.9),0_0_36px_rgba(244,63,94,0.35)] border border-rose-500/50 ring-1 ring-rose-500/30 flex flex-col gap-3 transition-all duration-300 ${
        isDismissing ? 'animate-fluent-toast-exit' : 'animate-fluent-toast-enter'
      } overflow-hidden select-none pointer-events-auto`}
    >
      {/* Top Section */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[2px] fluent-box-nested border border-rose-400/40 flex items-center justify-center shrink-0 shadow-inner">
          {isReconnecting ? (
            <RefreshCw className="w-5 h-5 text-rose-300 animate-spin" />
          ) : (
            <WifiOff className="w-5 h-5 text-rose-400 animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-200 border border-rose-400/50">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              {isEn ? 'CONNECTION INTERRUPTED' : 'MẠNG ĐANG CHẬP CHỜN'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold bg-white/10 text-rose-200 border border-white/15">
              <Clock className="w-3 h-3 text-rose-300" />
              {isReconnecting
                ? (isEn ? 'Reconnecting...' : 'Đang kết nối lại...')
                : (isEn ? `Retry in ${countdown}s` : `Thử lại sau ${countdown}s`)}
            </span>
          </div>

          <p className="text-xs text-white/90 leading-relaxed font-medium">
            {isReconnecting
              ? (isEn
                  ? 'Reconnecting to the live stage...'
                  : 'Đang kết nối lại với sân khấu...')
              : pendingCount > 0
              ? (isEn
                  ? `Connection dropped. ${pendingCount} quiz progress item(s) saved locally and will auto-sync on reconnect.`
                  : `Đường truyền bị ngắt. ${pendingCount} mục tiến trình đã lưu cục bộ và sẽ tự đồng bộ khi có mạng.`)
              : (isEn
                  ? 'Your internet connection dropped briefly. Reconnecting automatically...'
                  : 'Đường truyền mạng vừa bị ngắt quãng. Hệ thống đang tự kết nối lại cho bạn...')}
          </p>

          {reconnectAttempts > 0 && (
            <div className="text-[10px] text-rose-300/70 font-mono mt-1">
              {isEn ? 'Reconnect attempts: ' : 'Đã thử kết nối lại: '}
              <strong>{reconnectAttempts}</strong>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          title={isEn ? 'Temporarily hide notice' : 'Tạm ẩn thông báo'}
          className="fluent-subtab-btn p-1.5 rounded-[2px] border border-transparent hover:border-white/15 hover:bg-white/10 text-rose-300/80 hover:text-white transition shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Auto-reconnect visual progress bar */}
      <div className="w-full bg-black/60 rounded-[2px] h-1.5 overflow-hidden border border-white/10 relative">
        <div
          className="h-full bg-gradient-to-r from-rose-500 via-[#F7CAC9] to-amber-400 rounded-[2px] transition-all duration-1000 ease-linear shadow-[0_0_8px_rgba(244,63,94,0.6)]"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-rose-200/80 font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          <span>{isEn ? 'Auto-sync when online' : 'Tự động đồng bộ khi có mạng'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="fluent-btn px-3 py-1.5 rounded-[2px] fluent-box-nested border border-white/10 hover:border-white/20 active:scale-95 text-xs font-mono font-bold text-rose-200 hover:text-white transition cursor-pointer"
          >
            {isEn ? 'Hide (60s)' : 'Ẩn (60s)'}
          </button>
          <button
            type="button"
            onClick={handleManualRetry}
            disabled={isReconnecting}
            className="fluent-btn px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-xs font-mono font-black uppercase tracking-wider text-white rounded-[2px] transition shadow-lg shadow-rose-950/60 border border-rose-400/50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>
              {isReconnecting
                ? (isEn ? 'Retrying...' : 'Đang thử...')
                : (isEn ? 'Retry Now' : 'Thử lại ngay')}
            </span>
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

