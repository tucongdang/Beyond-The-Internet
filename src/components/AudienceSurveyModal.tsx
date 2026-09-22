import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Gift, 
  Sparkles, 
  ExternalLink, 
  CheckCircle2, 
  X, 
  Minimize2, 
  Maximize2, 
  ClipboardList,
  Copy,
  Check,
  RotateCcw,
  Clock,
  ShieldCheck,
  Ticket,
  ChevronRight,
  Loader2,
  Share2
} from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { isUserSelectedForSurvey, buildGoogleFormUrl, generateSurveyVoucherCode } from '../utils/surveyUtils';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

interface AudienceSurveyModalProps {
  gameState: GameState;
  user?: UserInfo | null;
  isHighContrast?: boolean;
}

export const AudienceSurveyModal: React.FC<AudienceSurveyModalProps> = ({
  gameState,
  user,
  isHighContrast = false
}) => {
  const surveyConfig = gameState.audience_survey;

  // Persistent Guest ID for non-logged-in audience members to preserve deterministic sampling
  const effectiveUserId = useMemo(() => {
    if (user?.uid) return user.uid;
    if (user?.mssv) return user.mssv;
    if (typeof window !== 'undefined') {
      let guestId = localStorage.getItem('BTI_SURVEY_GUEST_ID');
      if (!guestId) {
        guestId = 'guest_' + Math.random().toString(36).substring(2, 10);
        localStorage.setItem('BTI_SURVEY_GUEST_ID', guestId);
      }
      return guestId;
    }
    return 'guest_default';
  }, [user?.uid, user?.mssv]);

  // Determine if survey is globally enabled & triggered
  const isEnabled = Boolean(surveyConfig?.enabled && surveyConfig?.form_url);
  const isTriggered = isEnabled && (
    Boolean(surveyConfig?.force_active) || 
    Boolean(surveyConfig?.auto_show_on_summary && (gameState.show_summary || gameState.grand_finale?.active))
  );

  // Check 10% sampling determinism
  const isSelected = useMemo(() => {
    if (!isEnabled || !effectiveUserId) return false;
    return isUserSelectedForSurvey(
      effectiveUserId,
      surveyConfig?.sample_rate ?? 10,
      surveyConfig?.target_seed || 'BTI2026_FINALE_SURVEY'
    );
  }, [isEnabled, effectiveUserId, surveyConfig?.sample_rate, surveyConfig?.target_seed]);

  // Support local test preview toggle from Admin
  const [forcePreview, setForcePreview] = useState(false);
  useEffect(() => {
    const handleStorage = () => {
      setForcePreview(Boolean(localStorage.getItem('BTI_SURVEY_FORCE_PREVIEW')));
    };
    handleStorage();
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const shouldDisplay = isTriggered && (isSelected || forcePreview);

  // Completion state in localStorage
  const completionStorageKey = useMemo(() => {
    const seed = surveyConfig?.target_seed || 'v1';
    return `BTI_SURVEY_COMPLETED_${seed}`;
  }, [surveyConfig?.target_seed]);

  const [isCompleted, setIsCompleted] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return Boolean(localStorage.getItem(completionStorageKey));
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCompleted(Boolean(localStorage.getItem(completionStorageKey)));
    }
  }, [completionStorageKey]);

  // Generate official digital gift claim voucher
  const voucherCode = useMemo(() => {
    return generateSurveyVoucherCode(effectiveUserId, surveyConfig?.target_seed || 'BTI2026');
  }, [effectiveUserId, surveyConfig?.target_seed]);

  // Visibility & interaction states
  const [isOpen, setIsOpen] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showEmbedded, setShowEmbedded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [copiedVoucher, setCopiedVoucher] = useState(false);
  const prevTriggeredRef = useRef(false);

  // When survey is triggered newly, auto-open if not dismissed
  useEffect(() => {
    if (shouldDisplay && !prevTriggeredRef.current) {
      setIsOpen(true);
      setIsMinimized(false);
      soundFx.playTing();
      vibrateSuccess();
    }
    prevTriggeredRef.current = shouldDisplay;
  }, [shouldDisplay]);

  if (!shouldDisplay || !surveyConfig) {
    return null;
  }

  const title = surveyConfig.title || 'Khảo Sát Khán Giả BTI 2026';
  const description = surveyConfig.description || 'Bạn là 1 trong 10% khán giả đại diện được chọn ngẫu nhiên tham gia khảo sát nhanh nhận quà tri ân từ Ban Tổ Chức!';
  const giftNote = surveyConfig.gift_note || 'Hoàn tất khảo sát để nhận phần quà lưu niệm tại bàn Lễ tân.';
  const sampleRate = surveyConfig.sample_rate ?? 10;

  const externalUrl = buildGoogleFormUrl(surveyConfig, user, false);
  const embeddedUrl = buildGoogleFormUrl(surveyConfig, user, true);

  const handleOpenExternal = () => {
    soundFx.playClick();
    vibrateTap();
    window.open(externalUrl, '_blank', 'noopener,noreferrer');
  };

  const handleMarkCompleted = () => {
    soundFx.playTing();
    vibrateSuccess();
    setIsCompleted(true);
    setShowEmbedded(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(completionStorageKey, Date.now().toString());
    }
  };

  const handleCopyVoucher = () => {
    soundFx.playClick();
    vibrateTap();
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(voucherCode).catch(() => {});
    }
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2500);
  };

  // 1. Minimized floating pill
  if (isMinimized) {
    return (
      <aside aria-label="Khảo sát khán giả" className="fixed bottom-24 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            vibrateTap();
            setIsMinimized(false);
            setIsOpen(true);
          }}
          className={`flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-2xl border transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md ${
            isCompleted
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-400/50 shadow-emerald-950/50'
              : 'bg-slate-950/95 text-[#F7CAC9] border-[#F7CAC9]/50 shadow-pink-950/50 hover:border-[#F7CAC9]'
          }`}
        >
          <div className="relative flex items-center justify-center">
            {isCompleted ? (
              <Ticket className="w-4 h-4 text-emerald-400" />
            ) : (
              <Gift className="w-4 h-4 text-[#F7CAC9] animate-bounce" />
            )}
            {!isCompleted && (
              <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-pink-500 animate-ping" />
            )}
          </div>
          <div className="text-left">
            <span className="text-xs font-bold font-sans block leading-tight">
              {isCompleted ? 'Thẻ quà: ' + voucherCode : `Khảo sát 10% • Nhận quà`}
            </span>
            <span className="text-[10px] text-white/60 block leading-none mt-0.5">
              {isCompleted ? 'Chạm để xem lại' : 'Được chọn ngẫu nhiên'}
            </span>
          </div>
          <Maximize2 className="w-3.5 h-3.5 opacity-70 ml-1 shrink-0" />
        </button>
      </aside>
    );
  }

  // 2. Full or standard modal
  if (!isOpen) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-[14px] animate-in fade-in duration-300"
      role="dialog"
      aria-modal="true"
      onClick={() => setIsMinimized(true)}
    >
      <div 
        className={`w-full rounded-[10px] overflow-hidden flex flex-col shadow-2xl border transition-all duration-300 ${
          isFullscreen
            ? 'fixed inset-2 sm:inset-4 w-auto h-auto max-w-none max-h-none'
            : showEmbedded
            ? 'max-w-2xl h-[92vh] max-h-[820px]'
            : 'max-w-lg max-h-[92vh]'
        } ${
          isHighContrast
            ? 'bg-black text-white border-white/50'
            : 'bg-[#0f172a] text-slate-100 border-[#F7CAC9]/40 shadow-2xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-4.5 border-b border-white/10 flex items-center justify-between gap-3 bg-slate-900/90 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#F7CAC9]/30 to-[#92A8D1]/20 border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shrink-0 shadow-inner">
              <Gift className="w-4 h-4 animate-pulse text-[#F7CAC9]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-[3px] bg-gradient-to-r from-[#F7CAC9]/20 to-[#92A8D1]/20 text-[#F7CAC9] border border-[#F7CAC9]/40 tracking-wider flex items-center gap-1">
                  <Sparkles className="w-2.5 h-2.5" />
                  Đại diện {sampleRate}% Khán giả BTI
                </span>
                {forcePreview && (
                  <span className="text-[9px] uppercase font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    Preview
                  </span>
                )}
              </div>
              <h3 className="text-sm sm:text-base font-black text-white truncate mt-0.5 tracking-tight">
                {title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {showEmbedded && (
              <button
                type="button"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-2 text-white/70 hover:text-white rounded-[4px] hover:bg-white/10 transition cursor-pointer"
                title={isFullscreen ? 'Thu nhỏ cửa sổ' : 'Phóng to toàn màn hình'}
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                setIsMinimized(true);
              }}
              className="p-2 text-white/70 hover:text-white rounded-[4px] hover:bg-white/10 transition cursor-pointer"
              title="Thu nhỏ để tiếp tục theo dõi sân khấu"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                setIsOpen(false);
              }}
              className="p-2 text-white/70 hover:text-white rounded-[4px] hover:bg-white/10 transition cursor-pointer"
              title="Đóng khảo sát"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        {showEmbedded ? (
          /* Embedded Google Form View with enhanced UX */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-950 relative">
            <div className="px-3.5 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300 shrink-0">
              <span className="flex items-center gap-1.5 font-medium text-slate-200">
                <ClipboardList className="w-3.5 h-3.5 text-[#F7CAC9]" />
                Điền trực tiếp trong ứng dụng
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsIframeLoading(true)}
                  className="p-1 hover:text-white text-slate-400 transition cursor-pointer"
                  title="Tải lại biểu mẫu"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleOpenExternal}
                  className="text-[#F7CAC9] hover:text-[#f8d7d6] flex items-center gap-1 font-bold transition cursor-pointer"
                >
                  Mở tab mới <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Iframe Loading Skeleton */}
            <div className="flex-1 relative w-full h-full min-h-0 bg-slate-950">
              {isIframeLoading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-slate-950/90 z-10 text-slate-400">
                  <Loader2 className="w-7 h-7 animate-spin text-[#F7CAC9]" />
                  <p className="text-xs">Đang tải biểu mẫu khảo sát Google Forms...</p>
                </div>
              )}
              <iframe
                src={embeddedUrl}
                title="Google Form Survey"
                className="w-full h-full border-0"
                loading="lazy"
                onLoad={() => setIsIframeLoading(false)}
              />
            </div>

            {/* Iframe Bottom Controls */}
            <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowEmbedded(false)}
                className="px-3.5 py-2 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition cursor-pointer"
              >
                ← Quay lại thông tin
              </button>
              <button
                type="button"
                onClick={handleMarkCompleted}
                className="px-4 py-2 rounded-[4px] bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold flex items-center gap-1.5 transition shadow cursor-pointer"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Tôi đã hoàn tất & Nhận mã quà
              </button>
            </div>
          </div>
        ) : (
          /* Welcome Card or Completed Voucher Card View */
          <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-slate-200">
            {isCompleted ? (
              /* DIGITAL GIFT CLAIM VOUCHER CARD */
              <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                {/* Congratulatory Hero */}
                <div className="text-center space-y-1">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400 mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base sm:text-lg font-black text-white">
                    Hoàn Tất Khảo Sát Thành Công!
                  </h4>
                  <p className="text-xs text-slate-300">
                    Cảm ơn bạn đã đóng góp ý kiến đại diện cho khán giả Beyond The Internet 2026.
                  </p>
                </div>

                {/* THE OFFICIAL TICKET VOUCHER */}
                <div className="rounded-[8px] bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border-2 border-[#F7CAC9]/50 p-4 sm:p-5 relative shadow-xl overflow-hidden">
                  {/* Decorative background glow */}
                  <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7CAC9]/10 rounded-full blur-2xl pointer-events-none" />

                  {/* Voucher Header */}
                  <div className="flex items-center justify-between border-b border-dashed border-slate-700 pb-3">
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-[#F7CAC9]" />
                      <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F7CAC9]">
                        Phiếu Nhận Quà Khảo Sát
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                      HỢP LỆ • SẴN SÀNG ĐỔI
                    </span>
                  </div>

                  {/* Voucher Code Display Box */}
                  <div className="py-4 text-center space-y-1.5">
                    <span className="text-[11px] text-slate-400 uppercase font-mono tracking-widest block">
                      Mã Voucher Đổi Quà Tri Ân:
                    </span>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-[6px] bg-slate-950 border border-[#F7CAC9]/40 shadow-inner">
                      <span className="text-xl sm:text-2xl font-mono font-black text-[#F7CAC9] tracking-wider select-all">
                        {voucherCode}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyVoucher}
                        className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
                        title="Sao chép mã quà"
                      >
                        {copiedVoucher ? (
                          <Check className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    {copiedVoucher && (
                      <p className="text-[11px] text-emerald-400 font-mono animate-in fade-in">
                        ✓ Đã sao chép mã voucher vào bộ nhớ tạm!
                      </p>
                    )}
                  </div>

                  {/* Attendee Info & Redemption Instructions */}
                  <div className="pt-3 border-t border-dashed border-slate-700 space-y-2 text-xs">
                    {user && (
                      <div className="flex items-center justify-between text-slate-300 font-mono text-[11px]">
                        <span>Người nhận:</span>
                        <strong className="text-white">{user.name} {user.mssv ? `(${user.mssv})` : ''}</strong>
                      </div>
                    )}
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/30 flex items-start gap-2 text-amber-200 text-xs">
                      <Gift className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block text-amber-300">Hướng dẫn nhận quà:</strong>
                        <span>{giftNote}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="flex-1 py-2.5 px-4 rounded-[4px] bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Xem lại biểu mẫu đã gửi
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsMinimized(true)}
                    className="flex-1 py-2.5 px-4 rounded-[4px] bg-gradient-to-r from-[#92A8D1] to-[#F7CAC9] hover:brightness-110 text-slate-950 font-bold text-xs transition shadow cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Trở lại xem chương trình
                  </button>
                </div>
              </div>
            ) : (
              /* INVITATION & PARTICIPATION VIEW */
              <>
                {/* Special Notification Badge */}
                <div className="p-4 rounded-[8px] bg-gradient-to-br from-[#F7CAC9]/15 via-[#92A8D1]/10 to-transparent border border-[#F7CAC9]/30 space-y-2">
                  <div className="flex items-center gap-2 text-[#F7CAC9] font-bold text-xs uppercase tracking-wider font-mono">
                    <Sparkles className="w-4 h-4 text-[#F7CAC9] animate-pulse" />
                    <span>Chúc mừng bạn là khán giả đại diện!</span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
                    {description}
                  </p>
                </div>

                {/* 3 Key Pillars of the Survey */}
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2.5 rounded-[6px] bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center gap-1">
                    <Clock className="w-4 h-4 text-sky-400" />
                    <span className="text-[11px] font-bold text-white">Chỉ ~60 giây</span>
                    <span className="text-[10px] text-slate-400">Nhanh chóng</span>
                  </div>
                  <div className="p-2.5 rounded-[6px] bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center gap-1">
                    <Gift className="w-4 h-4 text-[#F7CAC9]" />
                    <span className="text-[11px] font-bold text-white">Nhận quà</span>
                    <span className="text-[10px] text-slate-400">Tri ân tại lễ tân</span>
                  </div>
                  <div className="p-2.5 rounded-[6px] bg-slate-900/80 border border-slate-800 flex flex-col items-center justify-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-white">Bảo mật</span>
                    <span className="text-[10px] text-slate-400">Google Forms</span>
                  </div>
                </div>

                {/* Gift Callout */}
                {giftNote && (
                  <div className="p-3 rounded-[6px] bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="text-xs text-slate-200">
                      <span className="font-bold text-amber-300 block">Quà tri ân khán giả</span>
                      {giftNote}
                    </div>
                  </div>
                )}

                {/* Participant Details if authenticated */}
                {user && (
                  <div className="px-3 py-2 rounded bg-slate-900/60 border border-slate-800 text-xs text-slate-400 flex items-center justify-between font-mono">
                    <span>Khán giả tham gia:</span>
                    <span className="font-bold text-slate-200">
                      {user.name} {user.mssv ? `(${user.mssv})` : ''}
                    </span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="pt-2 space-y-2.5">
                  {/* Primary CTA: Open External */}
                  <button
                    type="button"
                    onClick={handleOpenExternal}
                    className="w-full py-3 px-4 rounded-[6px] bg-gradient-to-r from-[#92A8D1] via-[#F7CAC9] to-[#E39A96] hover:brightness-110 text-slate-950 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg flex items-center justify-center gap-2 transition hover:scale-[1.01] active:scale-95 cursor-pointer"
                  >
                    <span>Làm Khảo Sát (Mở Google Forms)</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </button>

                  {/* Secondary CTA: Embedded View */}
                  {surveyConfig.allow_embedded_view !== false && (
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        vibrateTap();
                        setShowEmbedded(true);
                      }}
                      className="w-full py-2.5 px-4 rounded-[6px] bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition flex items-center justify-center gap-2 cursor-pointer border border-slate-700"
                    >
                      <ClipboardList className="w-3.5 h-3.5 text-[#F7CAC9]" />
                      <span>Hoặc điền trực tiếp ngay trên trang này</span>
                    </button>
                  )}

                  {/* Quick Finish / Voucher Claim Link */}
                  <div className="pt-1.5 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleMarkCompleted}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-medium underline flex items-center gap-1.5 cursor-pointer transition"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tôi đã gửi câu trả lời → Nhận mã đổi quà
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMinimized(true)}
                      className="text-xs text-slate-400 hover:text-white transition cursor-pointer"
                    >
                      Để sau (Thu nhỏ)
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
