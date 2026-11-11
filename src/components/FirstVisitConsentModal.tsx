import React, { useState, useEffect } from 'react';
import { FileText, Shield, Info, Check, X, ExternalLink, ShieldCheck } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateSelection } from '../utils/hapticUtils';
import { PDPD_CONSENT_VERSION, PDPD_LAW_REFERENCE } from '../utils/vnLawCompliance';
import { useLanguage } from '../hooks/useLanguage';
import { ALL_POLICIES, PolicyDocument } from '../utils/policyData';

interface FirstVisitConsentModalProps {
  onOpenFullPolicy: () => void;
}

const STORAGE_KEY = 'bti_pdpd_first_visit_consent_v1';

type PolicyTab = 'TERMS' | 'PRIVACY' | 'DATA';

export const FirstVisitConsentModal: React.FC<FirstVisitConsentModalProps> = ({
  onOpenFullPolicy
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';
  const [isVisible, setIsVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<PolicyTab>('TERMS');
  const [isAgreed, setIsAgreed] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        // Small delay so the page loads smoothly before the modal fades in
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 400);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage access errors in private browsing
    }
  }, []);

  const handleAcceptAll = () => {
    if (!isAgreed) return;
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

  const handleDismissWithoutAccept = () => {
    soundFx.playClick();
    vibrateTap();
    setIsVisible(false);
  };

  const handleOpenPolicy = () => {
    soundFx.playClick();
    vibrateTap();
    setIsVisible(false);
    onOpenFullPolicy();
  };

  const currentPolicy: PolicyDocument = ALL_POLICIES[activeTab];

  if (!isVisible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="policy-modal-title"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
    >
      <div 
        className="w-full max-w-4xl max-h-[94vh] sm:max-h-[90vh] bg-[#190839] border border-white/16 rounded-[4px] shadow-2xl text-[#F5EFF9] flex flex-col overflow-hidden relative animate-scaleUp"
      >
        {/* Close Button Top-Right */}
        <button
          type="button"
          onClick={handleDismissWithoutAccept}
          className="absolute top-3 right-3 w-8 h-8 rounded-[2px] bg-[#241148] hover:bg-[#2A1454] border border-white/15 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer z-20 shadow-md"
          title={isVi ? 'Đóng' : 'Close'}
          aria-label={isVi ? 'Đóng' : 'Close'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Main Body Grid: Left Navigation Sidebar & Right Content Area */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 min-h-0 overflow-hidden">
          
          {/* Left Sidebar Tabs (3 items matching design) */}
          <div className="md:col-span-4 lg:col-span-3.5 p-3 sm:p-4 pr-12 md:pr-4 border-b md:border-b-0 md:border-r border-white/10 flex flex-row md:flex-col gap-2 shrink-0 bg-[#0D0420] overflow-x-auto md:overflow-visible">
            
            {/* Header info on desktop */}
            <div className="hidden md:flex flex-col mb-2 pb-3 border-b border-white/10">
              <span className="text-xs font-mono font-bold uppercase tracking-wider text-[#F7CAC9] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                {isVi ? 'Quy chế & Chính sách' : 'Legal & Policies'}
              </span>
              <span className="text-[10px] text-white/50 font-mono mt-0.5">
                Beyond The Internet 2027
              </span>
            </div>

            {/* Tab 1: Điều khoản sử dụng */}
            <button
              type="button"
              id="tab-btn-terms"
              onClick={() => {
                vibrateSelection();
                soundFx.playClick();
                setActiveTab('TERMS');
              }}
              className={`flex items-center gap-2.5 px-3.5 py-3 rounded-[2px] text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap md:whitespace-normal text-left shrink-0 md:shrink w-auto md:w-full ${
                activeTab === 'TERMS'
                  ? 'bg-white text-slate-900 font-bold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className={`w-4 h-4 shrink-0 ${activeTab === 'TERMS' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{isVi ? 'Điều khoản sử dụng' : 'Terms of Service'}</span>
            </button>

            {/* Tab 2: Chính sách bảo mật */}
            <button
              type="button"
              id="tab-btn-privacy"
              onClick={() => {
                vibrateSelection();
                soundFx.playClick();
                setActiveTab('PRIVACY');
              }}
              className={`flex items-center gap-2.5 px-3.5 py-3 rounded-[2px] text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap md:whitespace-normal text-left shrink-0 md:shrink w-auto md:w-full ${
                activeTab === 'PRIVACY'
                  ? 'bg-white text-slate-900 font-bold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield className={`w-4 h-4 shrink-0 ${activeTab === 'PRIVACY' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{isVi ? 'Chính sách bảo mật' : 'Privacy Policy'}</span>
            </button>

            {/* Tab 3: Chính sách dữ liệu */}
            <button
              type="button"
              id="tab-btn-data"
              onClick={() => {
                vibrateSelection();
                soundFx.playClick();
                setActiveTab('DATA');
              }}
              className={`flex items-center gap-2.5 px-3.5 py-3 rounded-[2px] text-xs sm:text-sm font-medium transition cursor-pointer whitespace-nowrap md:whitespace-normal text-left shrink-0 md:shrink w-auto md:w-full ${
                activeTab === 'DATA'
                  ? 'bg-white text-slate-900 font-bold shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Info className={`w-4 h-4 shrink-0 ${activeTab === 'DATA' ? 'text-slate-900' : 'text-slate-400'}`} />
              <span>{isVi ? 'Chính sách dữ liệu' : 'Data Policy'}</span>
            </button>

            {/* Law Reference note at bottom of sidebar on desktop */}
            <div className="hidden md:flex flex-col mt-auto pt-4 border-t border-white/5 text-[10px] font-mono text-white/40 space-y-1">
              <span>{PDPD_LAW_REFERENCE}</span>
              <span className="text-white/30">Phiên bản: {PDPD_CONSENT_VERSION}</span>
            </div>
          </div>

          {/* Right Scrollable Content Area */}
          <div className="md:col-span-8 lg:col-span-8.5 p-4 sm:p-6 overflow-y-auto max-h-[50vh] sm:max-h-[56vh] custom-scrollbar text-xs sm:text-sm text-slate-200 leading-relaxed font-sans select-text space-y-5">
            
            {/* Preamble / Introduction */}
            <div className="p-3.5 rounded-[2px] bg-black/40 border border-white/10 text-white/90 text-xs leading-relaxed">
              <p className="mb-2">
                {isVi ? (
                  <>Bằng việc sử dụng ứng dụng <strong>Beyond The Internet 2027 (BTI 2027)</strong>, Người dùng đồng ý và chấp thuận bị ràng buộc về pháp lý bởi các quyền và nghĩa vụ phát sinh theo quy định tại Quy chế này. BTI 2027 cam kết xử lý dữ liệu minh bạch, đúng mục đích, trong phạm vi cần thiết và phù hợp với pháp luật Việt Nam.</>
                ) : (
                  <>By using the <strong>Beyond The Internet 2027 (BTI 2027)</strong> application, Users agree to be legally bound by the terms and policies set forth herein. BTI 2027 is committed to transparent, lawful, and purposeful data processing.</>
                )}
              </p>
              <p className="text-white/60 text-[11px]">
                {isVi ? currentPolicy.shortDescriptionVi : currentPolicy.shortDescriptionEn}
              </p>
            </div>

            {/* Render all numbered sections of the active policy */}
            {currentPolicy.sections.map((section) => (
              <section key={section.id} className="space-y-2 border-b border-white/5 pb-4 last:border-b-0 last:pb-0">
                <h4 className="text-sm sm:text-base font-bold text-white font-mono tracking-tight flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#F7CAC9]" />
                  {section.title}
                </h4>

                <div className="space-y-2 text-slate-300">
                  {section.content.map((paragraph, pIdx) => {
                    const isBullet = paragraph.startsWith('•') || paragraph.startsWith('(') || paragraph.startsWith('1.') || paragraph.startsWith('2.');
                    return (
                      <p
                        key={pIdx}
                        className={isBullet ? 'pl-3 border-l-2 border-[#F7CAC9]/30 text-slate-300 py-0.5' : ''}
                      >
                        {paragraph}
                      </p>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Full text link */}
            <div className="pt-2 flex items-center justify-between text-xs text-[#B6A6D8]">
              <span>{isVi ? 'Đọc toàn văn có thể xem tại:' : 'Full document available at:'}</span>
              <button
                type="button"
                onClick={handleOpenPolicy}
                className="text-[#F7CAC9] hover:underline inline-flex items-center gap-1 cursor-pointer font-medium"
              >
                <span>{isVi ? 'Trang Chính sách & Pháp lý chuyên sâu' : 'Dedicated Policy Page'}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>

          </div>
        </div>

        {/* BOTTOM FOOTER: ACTIVE CONSENT (KHẲNG ĐỊNH CHỦ ĐỘNG) */}
        <div className="p-3.5 sm:p-4 bg-[#0D0420] border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-xs z-10">
          
          {/* Active Consent Checkbox & Transparent Label */}
          <div className="flex items-start sm:items-center gap-3 w-full md:w-auto flex-1">
            
            {/* Custom Empty Checkbox (Khẳng định chủ động) */}
            <label
              htmlFor="active-consent-checkbox"
              className="flex items-start sm:items-center gap-2.5 cursor-pointer select-none group"
            >
              <div className="relative flex items-center justify-center mt-0.5 sm:mt-0 shrink-0">
                <input
                  id="active-consent-checkbox"
                  type="checkbox"
                  checked={isAgreed}
                  onChange={(e) => {
                    setIsAgreed(e.target.checked);
                    if (e.target.checked) {
                      soundFx.playClick();
                      vibrateSelection();
                    }
                  }}
                  className="sr-only peer"
                  aria-required="true"
                />
                <div
                  className={`w-5 h-5 rounded-[2px] border transition-all flex items-center justify-center ${
                    isAgreed
                      ? 'bg-red-600 border-red-500 text-white shadow-md shadow-red-600/40'
                      : 'bg-black/50 border-white/30 hover:border-[#F7CAC9] text-transparent'
                  }`}
                >
                  <Check className={`w-3.5 h-3.5 stroke-[3] ${isAgreed ? 'opacity-100' : 'opacity-0'}`} />
                </div>
              </div>

              {/* Explicit Transparent Label with Clickable Tab Links */}
              <div className="text-xs sm:text-[13px] text-white/90 leading-snug">
                {isVi ? (
                  <span>
                    Tôi đã đọc, hiểu và đồng ý với{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTab('TERMS');
                        vibrateTap();
                      }}
                      className="text-sky-300 hover:text-sky-200 underline font-semibold decoration-sky-400/60 cursor-pointer"
                    >
                      Điều khoản sử dụng
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTab('PRIVACY');
                        vibrateTap();
                      }}
                      className="text-sky-300 hover:text-sky-200 underline font-semibold decoration-sky-400/60 cursor-pointer"
                    >
                      Chính sách bảo mật
                    </button>{' '}
                    và{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTab('DATA');
                        vibrateTap();
                      }}
                      className="text-sky-300 hover:text-sky-200 underline font-semibold decoration-sky-400/60 cursor-pointer"
                    >
                      Chính sách dữ liệu
                    </button>{' '}
                    của hệ thống.
                  </span>
                ) : (
                  <span>
                    I have read, understood, and agreed to the{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTab('TERMS');
                      }}
                      className="text-sky-300 underline font-semibold"
                    >
                      Terms of Service
                    </button>
                    ,{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTab('PRIVACY');
                      }}
                      className="text-sky-300 underline font-semibold"
                    >
                      Privacy Policy
                    </button>{' '}
                    and{' '}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setActiveTab('DATA');
                      }}
                      className="text-sky-300 underline font-semibold"
                    >
                      Data Policy
                    </button>
                    .
                  </span>
                )}
              </div>
            </label>
          </div>

          {/* Action Button: Disabled when not agreed; bright red when agreed */}
          <div className="w-full md:w-auto shrink-0 flex items-center justify-end">
            <button
              type="button"
              id="btn-agree-and-continue"
              disabled={!isAgreed}
              onClick={handleAcceptAll}
              aria-disabled={!isAgreed}
              className={`w-full md:w-auto px-6 py-2.5 rounded-[2px] font-bold text-xs sm:text-sm uppercase tracking-wider transition-all duration-200 select-none ${
                isAgreed
                  ? 'bg-red-600 hover:bg-red-500 text-white cursor-pointer shadow-lg shadow-red-600/40 transform hover:-translate-y-0.5 active:translate-y-0'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-50 border border-white/5'
              }`}
            >
              {isVi ? 'Đồng ý & tiếp tục' : 'Agree & Continue'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};
