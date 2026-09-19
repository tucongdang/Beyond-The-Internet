import React, { useState, useEffect, useRef, useCallback } from 'react';
import { WifiOff, RefreshCw, X, Clock, AlertCircle } from 'lucide-react';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';

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
  const [countdown, setCountdown] = useState<number>(5);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(false);
  const [reconnectAttempts, setReconnectAttempts] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerReconnect = useCallback(async () => {
    setIsReconnecting(true);
    try {
      syncService.initializeFirebase();
      await syncService.measurePing();
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
    onDismiss();
  };

  // Reconnection countdown lifecycle
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

    setCountdown(5);
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          triggerReconnect();
          return 5;
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
  }, [isFirebaseConnected, isDismissed, triggerReconnect]);

  if (isFirebaseConnected || isDismissed) {
    return null;
  }

  const progressPercent = Math.max(0, Math.min(100, ((5 - countdown) / 5) * 100));

  return (
    <div
      id="offline-connection-banner"
      role="alert"
      aria-live="assertive"
      style={{ left: 'auto' }}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 left-auto z-[9999] max-w-[calc(100vw-2rem)] w-full sm:w-[420px] rounded-[12px] bg-[#1c0816]/95 backdrop-blur-[24px] saturate-[160%] text-white p-4 shadow-2xl shadow-rose-950/80 border border-rose-500/40 flex flex-col gap-3 transition-all duration-380 animate-fluent-toast-enter relative overflow-hidden select-none"
    >
      {/* Fluent UI 2 Top Highlight Accent Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-rose-500 via-amber-400 to-rose-500 pointer-events-none z-10" />

      {/* Top Section */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-[4px] fluent-box-nested border border-rose-400/40 flex items-center justify-center shrink-0 shadow-inner">
          {isReconnecting ? (
            <RefreshCw className="w-5 h-5 text-rose-300 animate-spin" />
          ) : (
            <WifiOff className="w-5 h-5 text-rose-400 animate-pulse" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase tracking-wider bg-rose-500/20 text-rose-200 border border-rose-400/50">
              <AlertCircle className="w-3 h-3 text-rose-400" />
              {localLanguage === 'en' ? 'SERVER DISCONNECTED' : 'MẤT KẾT NỐI MÁY CHỦ'}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-white/10 text-rose-200 border border-white/15">
              <Clock className="w-3 h-3 text-rose-300" />
              {isReconnecting
                ? (localLanguage === 'en' ? 'Reconnecting...' : 'Đang kết nối lại...')
                : (localLanguage === 'en' ? `Retry in ${countdown}s` : `Thử lại sau ${countdown}s`)}
            </span>
          </div>

          <p className="text-xs text-white/90 leading-relaxed font-medium">
            {isReconnecting
              ? (localLanguage === 'en'
                  ? 'Reconnecting and resyncing with Firebase Node...'
                  : 'Đang tái kết nối và đồng bộ lại với Firebase Node...')
              : (localLanguage === 'en'
                  ? 'Network interruption detected. System is automatically recovering connection.'
                  : 'Đã phát hiện gián đoạn mạng. Hệ thống đang tự động kích hoạt tiến trình phục hồi kết nối.')}
          </p>

          {reconnectAttempts > 0 && (
            <div className="text-[10px] text-rose-300/70 font-mono mt-1">
              {localLanguage === 'en' ? 'Auto-reconnect attempts: ' : 'Số lần đã tự động kết nối lại: '}
              <strong>{reconnectAttempts}</strong>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          title={localLanguage === 'en' ? 'Temporarily hide notice' : 'Tạm ẩn thông báo'}
          className="fluent-subtab-btn p-1.5 rounded-[4px] border border-transparent hover:border-white/15 hover:bg-white/10 text-rose-300/80 hover:text-white transition shrink-0 cursor-pointer"
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
          <span>{localLanguage === 'en' ? 'Auto-sync when online' : 'Tự động đồng bộ khi có mạng'}</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="fluent-btn px-3 py-1.5 rounded-[4px] fluent-box-nested border border-white/10 hover:border-white/20 active:scale-95 text-xs font-mono font-bold text-rose-200 hover:text-white transition cursor-pointer"
          >
            {localLanguage === 'en' ? 'Hide (60s)' : 'Ẩn (60s)'}
          </button>
          <button
            type="button"
            onClick={handleManualRetry}
            disabled={isReconnecting}
            className="fluent-btn px-3.5 py-1.5 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.98] text-xs font-mono font-black uppercase tracking-wider text-white rounded-[4px] transition shadow-lg shadow-rose-950/60 border border-rose-400/50 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            <span>
              {isReconnecting
                ? (localLanguage === 'en' ? 'Retrying...' : 'Đang thử...')
                : (localLanguage === 'en' ? 'Retry Now' : 'Thử lại ngay')}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
