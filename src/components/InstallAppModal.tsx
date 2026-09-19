import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Download, Smartphone, Share2, PlusSquare, Check, X, Sparkles, Monitor } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';
import { useLanguage } from '../hooks/useLanguage';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  const { localLanguage } = useLanguage();
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePwaInstall();
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    soundFx.playClick();
    vibrateTap();
    if (isInstallable) {
      const installed = await promptInstall();
      if (installed) {
        setInstallSuccess(true);
        vibrateSuccess();
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }
  };

  const modalContent = (
    <div
      className="fluent-dialog-overlay z-[999999] animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="fluent-box border border-white/10 w-full max-w-md rounded-[4px] shadow-2xl overflow-hidden p-6 relative text-[#F5EFF9]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={() => {
            soundFx.playClick();
            onClose();
          }}
          className="absolute top-4 right-4 p-2 text-white/50 hover:text-white rounded-[2px] bg-white/10 hover:bg-white/20 transition"
          aria-label={localLanguage !== 'vi' ? 'Close' : 'Đóng'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header with App Icon */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-12 h-12 rounded-[2px] bg-[#F7CAC9] text-[#190839] flex items-center justify-center font-black text-xl shadow-md shrink-0 border border-white/20">
            BTI
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white tracking-tight leading-tight">
                {localLanguage !== 'vi' ? 'Install Web App' : 'Cài Đặt Ứng Dụng'}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-[2px] bg-[#F7CAC9]/20 text-[#F7CAC9] font-bold border border-[#F7CAC9]/30">
                PWA
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              {localLanguage !== 'vi'
                ? 'Add to Home Screen for a smooth, native app experience.'
                : 'Thêm vào Màn hình chính để trải nghiệm mượt mà như app gốc.'}
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="space-y-2.5 mb-6 text-xs text-white/80 fluent-box-nested p-4 rounded-[2px] border border-white/10">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-[#F7CAC9] shrink-0" />
            <span>
              {localLanguage !== 'vi'
                ? 'Quick launch directly from your Home Screen'
                : 'Mở nhanh ngay từ Màn hình chính (Home Screen)'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              {localLanguage !== 'vi'
                ? 'Full screen without browser URL bar obstruction'
                : 'Toàn màn hình không bị thanh địa chỉ trình duyệt che khuất'}
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <Monitor className="w-4 h-4 text-sky-400 shrink-0" />
            <span>
              {localLanguage !== 'vi'
                ? 'Ultra-fast response and battery optimized during gameplay'
                : 'Phản hồi cực nhanh và tối ưu pin khi thi đấu'}
            </span>
          </div>
        </div>

        {/* Action area */}
        {isInstalled ? (
          <div className="space-y-3">
            <div className="p-4 fluent-box-nested border border-emerald-500/30 rounded-[2px] text-center">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm mb-1">
                <Check className="w-5 h-5" />{' '}
                {localLanguage !== 'vi' ? 'Application is already installed!' : 'Ứng dụng đã được cài đặt!'}
              </div>
              <p className="text-xs text-emerald-200/80">
                {localLanguage !== 'vi'
                  ? 'You can launch the app directly from your device Home Screen.'
                  : 'Bạn có thể mở ứng dụng trực tiếp từ Màn hình chính của thiết bị.'}
              </p>
            </div>
            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="fluent-btn w-full py-3 px-4 fluent-box-nested border border-white/15 hover:border-white/30 text-white font-bold rounded-[2px] text-xs uppercase tracking-wider transition cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Got It & Close' : 'Đã Hiểu & Đóng'}
            </button>
          </div>
        ) : installSuccess ? (
          <div className="space-y-3">
            <div className="p-4 fluent-box-nested border border-emerald-500/30 rounded-[2px] text-center animate-bounce">
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
                <Check className="w-5 h-5" />{' '}
                {localLanguage !== 'vi' ? 'Installation Successful!' : 'Cài đặt thành công!'}
              </div>
            </div>
            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="fluent-btn w-full py-3 px-4 fluent-box-nested border border-white/15 hover:border-white/30 text-white font-bold rounded-[2px] text-xs uppercase tracking-wider transition cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Done' : 'Hoàn Tất'}
            </button>
          </div>
        ) : isInstallable ? (
          <div className="space-y-3">
            <button
              id="btn-confirm-pwa-install"
              onClick={handleInstallClick}
              className="fluent-btn w-full py-3.5 px-4 bg-gradient-to-r from-[#F7CAC9] via-[#FCEEEC] to-[#E39A96] hover:brightness-110 active:scale-[0.98] text-[#190839] font-black rounded-[2px] transition shadow-lg shadow-[#F7CAC9]/25 flex items-center justify-center gap-2 text-xs uppercase tracking-wider border border-white/40 cursor-pointer"
            >
              <Download className="w-4 h-4 animate-bounce" />
              {localLanguage !== 'vi' ? 'Install Now (1-Click Install)' : 'Cài Đặt Ngay (1-Click Install)'}
            </button>
            <p className="text-[11px] text-center text-white/50">
              {localLanguage !== 'vi'
                ? 'Click "Install" on the system prompt to complete.'
                : 'Nhấn "Cài đặt" trên hộp thoại xuất hiện để hoàn tất.'}
            </p>
            <div className="pt-2 flex items-center justify-center">
              <button
                onClick={() => {
                  soundFx.playClick();
                  onClose();
                }}
                className="fluent-btn w-full py-2.5 px-4 fluent-box-nested border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-[2px] text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {localLanguage !== 'vi' ? 'Maybe Later / Close' : 'Để Sau / Đóng Cửa Sổ'}
              </button>
            </div>
          </div>
        ) : isIOS ? (
          /* iOS Safari Step-by-Step Instructions */
          <div className="space-y-3">
            <div className="fluent-box-nested p-4 rounded-[2px] border border-white/10 space-y-3">
              <h4 className="text-xs font-bold text-[#F7CAC9] uppercase tracking-wider mb-2">
                {localLanguage !== 'vi'
                  ? 'Installation Guide for iPhone / iPad (Safari):'
                  : 'Hướng dẫn cài đặt trên iPhone / iPad (Safari):'}
              </h4>
              <div className="space-y-2 text-xs text-white/90">
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-[2px] bg-white/10 text-center font-bold text-[11px] flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span className="flex items-center gap-1.5">
                    {localLanguage !== 'vi' ? (
                      <>
                        Tap the <Share2 className="w-4 h-4 text-sky-400 inline" /> <strong>Share</strong> button at the bottom of Safari.
                      </>
                    ) : (
                      <>
                        Nhấn vào nút <Share2 className="w-4 h-4 text-sky-400 inline" /> <strong>Chia sẻ (Share)</strong> ở dưới cùng Safari.
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-[2px] bg-white/10 text-center font-bold text-[11px] flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span className="flex items-center gap-1.5">
                    {localLanguage !== 'vi' ? (
                      <>
                        Scroll down and select <PlusSquare className="w-4 h-4 text-emerald-400 inline" /> <strong>Add to Home Screen</strong>.
                      </>
                    ) : (
                      <>
                        Cuộn xuống và chọn <PlusSquare className="w-4 h-4 text-emerald-400 inline" /> <strong>Thêm vào MH chính (Add to Home Screen)</strong>.
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-5 h-5 rounded-[2px] bg-white/10 text-center font-bold text-[11px] flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    {localLanguage !== 'vi' ? (
                      <>
                        Tap <strong>Add</strong> in the top-right corner to complete.
                      </>
                    ) : (
                      <>
                        Nhấn <strong>Thêm (Add)</strong> ở góc trên bên phải để hoàn tất.
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="fluent-btn w-full py-2.5 px-4 fluent-box-nested border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-[2px] text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Got It & Close' : 'Đã Hiểu & Đóng'}
            </button>
          </div>
        ) : (
          /* Generic Desktop / Chrome instructions */
          <div className="space-y-3">
            <div className="fluent-box-nested p-4 rounded-[2px] border border-white/10 text-center">
              <p className="text-xs text-white/80">
                {localLanguage !== 'vi' ? (
                  <>
                    You can install by clicking the <strong>Install</strong> icon{' '}
                    <Download className="w-3.5 h-3.5 inline mx-1 text-[#F7CAC9]" /> on the Chrome / Edge address bar, or choose{' '}
                    <strong>Install app</strong> from the browser menu (⋮).
                  </>
                ) : (
                  <>
                    Bạn có thể cài đặt bằng cách nhấp vào biểu tượng <strong>Cài đặt</strong>{' '}
                    <Download className="w-3.5 h-3.5 inline mx-1 text-[#F7CAC9]" /> trên thanh địa chỉ của trình duyệt Chrome / Edge, hoặc chọn{' '}
                    <strong>Cài đặt ứng dụng</strong> trong menu trình duyệt (⋮).
                  </>
                )}
              </p>
            </div>
            <button
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="fluent-btn w-full py-2.5 px-4 fluent-box-nested border border-white/10 hover:border-white/20 text-white/70 hover:text-white rounded-[2px] text-xs font-semibold uppercase tracking-wider transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Close Window' : 'Đóng Cửa Sổ'}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
