import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { WifiOff, Cloud, X } from 'lucide-react';
import { useOfflineSyncState } from '../utils/offlineModeUtils';
import { useLanguage } from '../hooks/useLanguage';
import { vibrateTap } from '../utils/hapticUtils';
import { OfflineModePanel } from './OfflineModePanel';
import { UserInfo } from '../types';

interface OfflineModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: UserInfo | null;
  forceLanguage?: 'vi' | 'en';
  isFirebaseConnected?: boolean;
}

export const OfflineModeModal: React.FC<OfflineModeModalProps> = ({
  isOpen,
  onClose,
  user,
  forceLanguage,
  isFirebaseConnected,
}) => {
  const { localLanguage } = useLanguage();
  const effectiveLanguage = forceLanguage || localLanguage;
  const isEn = effectiveLanguage !== 'vi';
  const { isOfflineMode } = useOfflineSyncState();
  const showDisconnectedStyle = !isFirebaseConnected;

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  const modalNode = (
    <div
      id="offline-mode-modal-overlay"
      className="fluent-dialog-overlay z-[60] animate-fadeIn select-none"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="offline-mode-modal-title"
    >
      <div
        id="offline-mode-modal-content"
        className="fluent-dialog relative w-full max-w-lg rounded-[2px] fluent-box shadow-2xl text-white flex flex-col border border-white/10"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={`fluent-dialog-header shrink-0 p-4 sm:p-5 flex items-center justify-between border-b ${
            showDisconnectedStyle
              ? 'bg-amber-950/50 border-amber-500/40'
              : isOfflineMode
              ? 'bg-sky-950/40 border-sky-400/35'
              : 'fluent-box-nested border-white/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-[2px] flex items-center justify-center border ${
                showDisconnectedStyle
                  ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                  : isOfflineMode
                  ? 'bg-emerald-500/15 border-emerald-400/45 text-emerald-300'
                  : 'fluent-box-nested border-sky-400/35 text-sky-300'
              }`}
            >
              {showDisconnectedStyle ? (
                <WifiOff className="w-5 h-5" />
              ) : (
                <Cloud className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3
                id="offline-mode-modal-title"
                className="text-base sm:text-lg font-bold tracking-tight text-white"
              >
                {isEn ? 'Offline Mode & Local Backup' : 'Chế Độ Ngoại Tuyến & Dự Phòng'}
              </h3>
              <p className="text-[11px] sm:text-xs text-[#B6A6D8]">
                {isEn
                  ? 'Keep saving quiz progress locally if WiFi/4G drops and auto-sync on reconnect'
                  : 'Giữ lưu tiến trình cục bộ khi sập WiFi/hết 4G và tự đồng bộ khi có mạng'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            aria-label={isEn ? 'Close Offline Mode Settings' : 'Đóng cài đặt Ngoại tuyến'}
            className="min-w-[44px] min-h-[44px] rounded-[2px] bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="fluent-dialog-body p-4 sm:p-5 flex-1 scrollbar-thin">
          <OfflineModePanel
            user={user}
            forceLanguage={forceLanguage}
            isFirebaseConnected={isFirebaseConnected}
            compact
          />
        </div>

        <div className="fluent-dialog-footer shrink-0 p-3.5 sm:p-4 border-t border-white/10 fluent-box-nested flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-bold text-xs rounded-[2px] transition shadow-md cursor-pointer"
          >
            {isEn ? 'Done' : 'Đã Xong'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
};
