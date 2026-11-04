import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, ChevronDown, ChevronUp, FileText, Check, ExternalLink, X, AlertCircle } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import { PDPD_CONSENT_VERSION, PDPD_LAW_REFERENCE } from '../utils/vnLawCompliance';
import { useLanguage } from '../hooks/useLanguage';

interface FirstVisitConsentModalProps {
  onOpenFullPolicy: () => void;
}

const STORAGE_KEY = 'bti_pdpd_first_visit_consent_v1';

export const FirstVisitConsentModal: React.FC<FirstVisitConsentModalProps> = ({
  onOpenFullPolicy
}) => {
  const { localLanguage } = useLanguage();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so page renders smoothly before the notice slides up
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 800);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors in private browsing
    }
  }, []);

  const handleAcceptAll = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        agreed: true,
        version: PDPD_CONSENT_VERSION,
        timestamp: Date.now()
      }));
    } catch {}
    soundFx.playClick();
    vibrateSuccess();
    setIsVisible(false);
  };

  const handleOpenPolicy = () => {
    soundFx.playClick();
    vibrateTap();
    onOpenFullPolicy();
  };

  if (!isVisible) return null;

  return (
    <div
      role="region"
      aria-label="Thông báo bảo vệ dữ liệu cá nhân"
      className="fixed bottom-0 inset-x-0 z-[110] p-3 sm:p-4 pointer-events-auto animate-slideUpFade"
    >
      <div className="max-w-4xl mx-auto bg-[#140628]/95 backdrop-blur-2xl border border-[#F7CAC9]/30 rounded-[4px] shadow-2xl shadow-purple-950/80 text-[#F5EFF9] p-4 sm:p-5 relative overflow-hidden ring-1 ring-white/10">
        
        {/* Glow accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-400 via-[#F7CAC9] to-indigo-500" />

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          
          {/* Main Info */}
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 sm:p-2.5 rounded-[2px] bg-[#F7CAC9]/15 border border-[#F7CAC9]/30 text-[#F7CAC9] shrink-0 mt-0.5">
              <ShieldCheck className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-xs sm:text-sm font-bold text-white tracking-wide uppercase font-mono">
                  {localLanguage !== 'vi' 
                    ? 'Privacy & Personal Data Protection Notice' 
                    : 'Thông Báo Bảo Vệ Dữ Liệu Cá Nhân & Quyền Riêng Tư'}
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-sky-500/15 border border-sky-400/30 text-sky-300 font-semibold">
                  {PDPD_LAW_REFERENCE}
                </span>
              </div>

              <p className="text-xs text-white/85 font-sans leading-relaxed">
                {localLanguage !== 'vi' ? (
                  <>
                    Welcome to the <strong>Beyond The Internet 2026</strong> interactive arena. To ensure fairness, anti-cheat protection, and real-time score ranking, our platform processes minimal participant data (Student ID, nickname, match scores) and essential session cookies. We strictly comply with Vietnamese data privacy regulations and never sell personal data.
                  </>
                ) : (
                  <>
                    Chào mừng bạn đến với Đấu trường <strong>Beyond The Internet 2026</strong>. Nhằm phục vụ tính điểm thời gian thực, phòng chống gian lận và trao giải, hệ thống sử dụng cookie kỹ thuật và thu thập thông tin định danh tối thiểu (MSSV, tên hiển thị, điểm số). Mật khẩu được mã hóa an toàn một chiều, tuân thủ nghiêm ngặt <strong>Nghị định 13/2023/NĐ-CP</strong> và cam kết không chia sẻ vì mục đích thương mại.
                  </>
                )}
              </p>

              {/* Collapsible Details */}
              {showDetails && (
                <div className="mt-3 p-3 rounded-[2px] bg-black/40 border border-white/10 text-[11px] text-white/80 space-y-2 animate-fadeIn font-mono">
                  <div className="flex items-start gap-2">
                    <span className="text-sky-300 font-bold shrink-0">1. Cookie kỹ thuật:</span>
                    <span className="font-sans">Lưu giữ phiên đăng nhập và khóa mã hóa cục bộ an toàn trên trình duyệt của bạn.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-300 font-bold shrink-0">2. Minh bạch AI:</span>
                    <span className="font-sans">Trợ lý hỗ trợ Gemini 3.8 Flash chỉ giải đáp thể lệ câu hỏi, không can thiệp kết quả chấm điểm.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-sky-300 font-bold shrink-0">3. Quyền chủ thể dữ liệu:</span>
                    <span className="font-sans">Bạn có toàn quyền yêu cầu xóa dữ liệu (Right to be Forgotten) hoặc hủy tài khoản bất kỳ lúc nào.</span>
                  </div>
                </div>
              )}

              {/* Toggle Details Button */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    setShowDetails(!showDetails);
                  }}
                  className="text-[11px] font-mono text-[#F7CAC9] hover:underline inline-flex items-center gap-1 cursor-pointer"
                >
                  {showDetails ? (
                    <>
                      <span>{localLanguage !== 'vi' ? 'Hide Details' : 'Thu gọn chi tiết'}</span>
                      <ChevronUp className="w-3.5 h-3.5" />
                    </>
                  ) : (
                    <>
                      <span>{localLanguage !== 'vi' ? 'View Data Categories' : 'Xem danh mục dữ liệu thu thập & quyền hạn'}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-row md:flex-col items-center justify-end gap-2 shrink-0 md:min-w-[190px] pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
            <button
              type="button"
              onClick={handleAcceptAll}
              className="flex-1 md:flex-none w-full py-2.5 px-4 rounded-[2px] bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 active:scale-98 text-white font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/60 transition cursor-pointer"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>{localLanguage !== 'vi' ? 'Accept & Continue' : 'Đồng Ý & Tiếp Tục'}</span>
            </button>

            <button
              type="button"
              onClick={handleOpenPolicy}
              className="flex-1 md:flex-none w-full py-2 px-3 rounded-[2px] bg-white/10 hover:bg-white/20 active:scale-98 text-[#F7CAC9] font-mono text-xs flex items-center justify-center gap-1.5 border border-white/15 transition cursor-pointer"
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>{localLanguage !== 'vi' ? 'Full Policy Page' : 'Trang Chính Sách'}</span>
              <ExternalLink className="w-3 h-3 text-white/50" />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};
