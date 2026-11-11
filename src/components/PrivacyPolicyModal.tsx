import React from 'react';
import { X, ShieldCheck, CheckCircle2, ExternalLink } from 'lucide-react';
import { PRIVACY_POLICY_DATA } from '../utils/policyData';
import { PDPD_LAW_REFERENCE, PDPD_CONSENT_VERSION } from '../utils/vnLawCompliance';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRequestDataDeletion?: () => void;
  onOpenFullPolicy?: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  onRequestDataDeletion,
  onOpenFullPolicy
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="privacy-policy-title"
    >
      <div className="relative w-full max-w-3xl max-h-[88vh] flex flex-col bg-[#140628] border border-[#F7CAC9]/30 rounded-[4px] shadow-2xl overflow-hidden text-[#F5EFF9]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#F7CAC9]/20 bg-[#1D0A3A]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-[2px] bg-[#F7CAC9]/10 border border-[#F7CAC9]/30 text-[#F7CAC9]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 id="privacy-policy-title" className="text-base sm:text-lg font-bold text-white tracking-wide font-mono">
                {PRIVACY_POLICY_DATA.nameVi}
              </h2>
              <p className="text-xs text-[#F7CAC9]/80 font-mono">
                Căn cứ {PDPD_LAW_REFERENCE} • Phiên bản {PDPD_CONSENT_VERSION}
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

        {/* Scrollable Policy Content */}
        <div className="flex-1 overflow-y-auto px-5 sm:px-7 py-5 space-y-5 text-xs sm:text-sm leading-relaxed text-white/90 font-sans custom-scrollbar select-text">
          
          {/* Important Notice Box */}
          <div className="p-3.5 rounded-[2px] bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs leading-5">
            <div className="font-semibold flex items-center gap-1.5 mb-1 font-mono text-sky-300">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-sky-400" />
              <span>Bảo vệ quyền riêng tư & An toàn dữ liệu theo tiêu chuẩn Luật pháp Việt Nam</span>
            </div>
            Beyond The Internet 2027 tôn trọng quyền riêng tư và cam kết bảo vệ dữ liệu cá nhân của người tham gia. Chúng tôi xử lý dữ liệu minh bạch, đúng mục đích và chỉ khi nhận được sự đồng ý tự nguyện (Active Consent) của bạn.
          </div>

          {/* Render 10 articles from PRIVACY_POLICY_DATA */}
          {PRIVACY_POLICY_DATA.sections.map((sec, idx) => (
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
          {onRequestDataDeletion ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onRequestDataDeletion();
              }}
              className="text-rose-400 hover:text-rose-300 underline cursor-pointer text-xs"
            >
              Yêu cầu xóa / Ẩn danh hóa dữ liệu
            </button>
          ) : (
            <span>Tuân thủ Luật BV DLCN 91/2025</span>
          )}
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
