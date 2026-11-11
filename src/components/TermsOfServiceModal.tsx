import React from 'react';
import { X, Scale, Award, ShieldCheck, CheckCircle2, FileText, ExternalLink } from 'lucide-react';
import { TERMS_OF_SERVICE_DATA } from '../utils/policyData';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenFullPolicy?: () => void;
}

export const TermsOfServiceModal: React.FC<TermsOfServiceModalProps> = ({
  isOpen,
  onClose,
  onOpenFullPolicy
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="terms-service-title"
    >
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#140628] border border-[#F7CAC9]/30 rounded-[4px] shadow-2xl overflow-hidden text-[#F5EFF9]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#F7CAC9]/20 bg-[#1D0A3A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#F7CAC9]/10 border border-[#F7CAC9]/30 text-[#F7CAC9]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terms-service-title" className="text-base sm:text-lg font-bold text-white tracking-wide font-mono">
                {TERMS_OF_SERVICE_DATA.nameVi}
              </h2>
              <p className="text-xs text-[#F7CAC9]/80 font-mono">
                Beyond The Internet 2027 • 8 Điều khoản chuẩn mực
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              onClose();
            }}
            className="p-1.5 rounded-[2px] text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Terms Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5 text-xs sm:text-sm leading-relaxed text-white/90 font-sans custom-scrollbar select-text">
          
          <div className="p-3.5 rounded-[2px] bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs leading-5">
            <div className="font-semibold flex items-center gap-1.5 mb-1 text-amber-300 font-mono">
              <Award className="w-4 h-4 shrink-0" />
              <span>Quy chế Đấu trường: Công Bằng - Minh Bạch - Liêm Chính Học Thuật</span>
            </div>
            Bằng việc tham gia đấu trường Beyond The Internet 2027, Người dùng cam kết tuân thủ toàn diện các điều khoản và quy chế thi đấu dưới đây.
          </div>

          {/* Render 8 articles from TERMS_OF_SERVICE_DATA */}
          {TERMS_OF_SERVICE_DATA.sections.map((sec, idx) => (
            <div key={sec.id} className="space-y-2 border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
              <h3 className="text-xs sm:text-sm font-bold text-[#F7CAC9] flex items-center gap-2 font-mono">
                <span className="w-5 h-5 rounded-[2px] bg-[#F7CAC9]/20 flex items-center justify-center text-[11px] text-[#F7CAC9] font-black shrink-0">
                  {idx + 1}
                </span>
                <span>{sec.title}</span>
              </h3>
              <div className="pl-7 space-y-1.5 text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                {sec.content.map((p, pIdx) => (
                  <p key={pIdx}>{p}</p>
                ))}
              </div>
            </div>
          ))}

          {onOpenFullPolicy && (
            <div className="pt-2 flex items-center justify-end">
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  vibrateTap();
                  onClose();
                  onOpenFullPolicy();
                }}
                className="text-xs font-mono text-[#F7CAC9] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <span>Xem toàn văn tại Trang Chính sách & Pháp lý chuyên sâu</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-[#0D0420] flex items-center justify-between text-xs text-white/50 font-mono">
          <span>Áp dụng mùa giải BTI 2027</span>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              onClose();
            }}
            className="px-4 py-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white font-bold transition cursor-pointer"
          >
            Đã hiểu & Đóng
          </button>
        </div>

      </div>
    </div>
  );
};
