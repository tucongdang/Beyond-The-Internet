/**
 * European Union (GDPR & ePrivacy Directive) Cookie & LocalStorage Consent Component
 * 
 * Features:
 * - Full compliance with EU Regulation 2016/679 (GDPR Art. 4(11), 7) & Directive 2002/58/EC (ePrivacy).
 * - Equal visual prominence for "Accept All" and "Reject Non-Essential" (EDPB anti-dark-pattern standard).
 * - Granular categories: Strictly Necessary, Preferences, Analytics, Marketing.
 * - Comprehensive technical cookie & LocalStorage table with name, duration, provider, and purpose.
 * - Persistent floating "Cookie Settings (GDPR)" button allowing users to withdraw/modify consent anytime.
 * - Full bilingual support (Tiếng Việt / English).
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Cookie, 
  Sliders, 
  Check, 
  X, 
  ExternalLink, 
  Info, 
  Lock, 
  SlidersHorizontal,
  Search,
  Sparkles
} from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';
import { 
  CookieConsentState, 
  COOKIE_INVENTORY, 
  getCookieConsent, 
  setCookieConsent, 
  createAcceptAllConsent, 
  createRejectNonEssentialConsent, 
  GDPR_COOKIE_VERSION 
} from '../utils/cookieConsentUtils';

interface CookieConsentBannerProps {
  onOpenPolicy?: (targetTab?: 'PRIVACY' | 'TERMS_AI' | 'SUBJECT_RIGHTS') => void;
}

export const CookieConsentBanner: React.FC<CookieConsentBannerProps> = ({ onOpenPolicy }) => {
  const { localLanguage } = useLanguage();
  const isEn = localLanguage === 'en';

  // Has the user configured cookie consent previously?
  const [hasConsent, setHasConsent] = useState<boolean>(() => {
    return getCookieConsent() !== null;
  });

  // State of the granular customize modal
  const [isCustomizeOpen, setIsCustomizeOpen] = useState(false);

  // Active preferences inside customize modal
  const [preferences, setPreferences] = useState({
    preferences: false,
    analytics: false,
    marketing: false
  });

  // Search keyword inside cookie technical inventory
  const [searchQuery, setSearchQuery] = useState('');

  // Toast confirmation when user saves preferences
  const [saveToast, setSaveToast] = useState<{ message: string; show: boolean }>({ message: '', show: false });

  // Synchronize state with LocalStorage on mount
  useEffect(() => {
    const existing = getCookieConsent();
    if (existing) {
      setHasConsent(true);
      setPreferences({
        preferences: existing.preferences,
        analytics: existing.analytics,
        marketing: existing.marketing
      });
    } else {
      setHasConsent(false);
    }
  }, []);

  // Listen for custom global events to reopen cookie settings (from PolicyPage, Navbar, or Profile)
  useEffect(() => {
    const handleOpenSettings = () => {
      soundFx.playClick();
      vibrateTap();
      const current = getCookieConsent();
      if (current) {
        setPreferences({
          preferences: current.preferences,
          analytics: current.analytics,
          marketing: current.marketing
        });
      }
      setIsCustomizeOpen(true);
    };

    const handleConsentChanged = (e: any) => {
      const updated = e.detail as CookieConsentState | null;
      if (updated) {
        setHasConsent(true);
        setPreferences({
          preferences: updated.preferences,
          analytics: updated.analytics,
          marketing: updated.marketing
        });
      } else {
        setHasConsent(false);
      }
    };

    window.addEventListener('bti-open-cookie-settings', handleOpenSettings);
    window.addEventListener('bti-cookie-consent-changed', handleConsentChanged);

    return () => {
      window.removeEventListener('bti-open-cookie-settings', handleOpenSettings);
      window.removeEventListener('bti-cookie-consent-changed', handleConsentChanged);
    };
  }, []);

  const triggerToast = useCallback((msg: string) => {
    setSaveToast({ message: msg, show: true });
    setTimeout(() => {
      setSaveToast({ message: '', show: false });
    }, 3500);
  }, []);

  // Handler: Accept All Cookies
  const handleAcceptAll = useCallback(() => {
    soundFx.playSuccess();
    vibrateSelection();
    const consent = createAcceptAllConsent();
    setCookieConsent(consent);
    setHasConsent(true);
    setIsCustomizeOpen(false);
    triggerToast(isEn ? 'All cookies and local storage accepted (GDPR compliant).' : 'Đã chấp nhận toàn bộ cookie & lưu trữ cục bộ theo chuẩn GDPR.');
  }, [isEn, triggerToast]);

  // Handler: Reject All Non-Essential Cookies (Only Necessary)
  const handleRejectNonEssential = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    const consent = createRejectNonEssentialConsent();
    setCookieConsent(consent);
    setHasConsent(true);
    setIsCustomizeOpen(false);
    triggerToast(isEn ? 'Only strictly necessary cookies will be used.' : 'Chỉ kích hoạt cookie & lưu trữ thiết yếu bắt buộc.');
  }, [isEn, triggerToast]);

  // Handler: Save Granular Choices from Customize Modal
  const handleSaveCustomPreferences = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    const consent: CookieConsentState = {
      necessary: true,
      preferences: preferences.preferences,
      analytics: preferences.analytics,
      marketing: preferences.marketing,
      timestamp: new Date().toISOString(),
      version: GDPR_COOKIE_VERSION,
      source: 'customized'
    };
    setCookieConsent(consent);
    setHasConsent(true);
    setIsCustomizeOpen(false);
    triggerToast(isEn ? 'Custom cookie preferences have been saved.' : 'Đã lưu cài đặt cookie tùy chỉnh của bạn.');
  }, [preferences, isEn, triggerToast]);

  // Handler: Open customize modal directly
  const handleOpenCustomize = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    const current = getCookieConsent();
    if (current) {
      setPreferences({
        preferences: current.preferences,
        analytics: current.analytics,
        marketing: current.marketing
      });
    }
    setIsCustomizeOpen(true);
  }, []);

  // Filtered inventory based on search query
  const filteredInventory = useMemo(() => {
    if (!searchQuery.trim()) return COOKIE_INVENTORY;
    const q = searchQuery.toLowerCase();
    return COOKIE_INVENTORY.filter(item => 
      item.name.toLowerCase().includes(q) ||
      item.provider.toLowerCase().includes(q) ||
      item.purposeVi.toLowerCase().includes(q) ||
      item.purposeEn.toLowerCase().includes(q) ||
      item.type.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <>
      {/* Toast Notification for Consent Updates */}
      {saveToast.show && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 z-[9999] bg-[#190839] text-[#F5EFF9] border border-[#F7CAC9]/50 px-4 py-3 rounded-[2px] shadow-2xl flex items-center gap-3 animate-fadeIn text-xs font-mono"
        >
          <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-500/40">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-bold text-white uppercase tracking-wider text-[11px]">
              {isEn ? 'EU GDPR Cookie Settings' : 'Cài Đặt Cookie Châu Âu'}
            </div>
            <div className="text-white/80">{saveToast.message}</div>
          </div>
        </div>
      )}

      {/* 1. European Cookie Notice Banner (Appears if user hasn't configured consent yet) */}
      {!hasConsent && (
        <aside 
          role="region" 
          aria-label={isEn ? 'European Union GDPR Cookie Notice' : 'Thông báo Cookie theo chuẩn Châu Âu (GDPR)'}
          className="fixed bottom-0 inset-x-0 z-[80] p-3 sm:p-4 bg-[#120726]/98 backdrop-blur-xl border-t border-[#F7CAC9]/30 shadow-[0_-10px_35px_rgba(0,0,0,0.7)] text-[#F5EFF9] animate-slideUp font-sans"
        >
          <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            
            {/* Header, EU Compliance Shield & Detailed Summary */}
            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[2px] bg-blue-600/20 text-blue-300 border border-blue-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                  <span className="text-xs" aria-hidden="true">🇪🇺</span>
                  <span>GDPR & ePrivacy Compliant</span>
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] bg-[#F7CAC9]/15 text-[#F7CAC9] border border-[#F7CAC9]/30 text-[10px] font-mono">
                  <Cookie className="w-3 h-3 text-[#F7CAC9]" />
                  <span>Chỉ thị 2002/58/EC & Luật 91/2025/QH15</span>
                </span>
                <span className="text-[10px] font-mono text-white/50">
                  Version {GDPR_COOKIE_VERSION}
                </span>
              </div>

              <h2 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span>{isEn ? 'Cookie & Local Storage Preferences (EU Standards)' : 'Thông Báo Cookie & Quyền Riêng Tư Theo Chuẩn Châu Âu'}</span>
              </h2>

              <p className="text-xs text-white/85 leading-relaxed max-w-4xl">
                {isEn ? (
                  <>
                    We comply with the EU General Data Protection Regulation (GDPR Art. 7) and ePrivacy Directive. BTI 2027 uses 
                    <strong className="text-white"> strictly necessary</strong> cookies and local storage to maintain session integrity, NTP clock synchronization, and anti-cheat security. 
                    Non-essential cookies (Preferences, Performance Analytics) are 
                    <strong className="text-rose-300"> disabled by default</strong> and will only be activated with your prior affirmative consent.
                  </>
                ) : (
                  <>
                    Hệ thống BTI 2027 tuân thủ Quy định chung về bảo vệ dữ liệu Châu Âu (GDPR Điều 7) và Chỉ thị ePrivacy 2002/58/EC. Chúng tôi sử dụng các cookie và lưu trữ cục bộ 
                    <strong className="text-white"> bắt buộc (thiết yếu)</strong> để bảo đảm phiên đấu trường, đồng bộ thời gian mili-giây và chống gian lận. 
                    Các danh mục tùy chọn hoặc phân tích hiệu năng được 
                    <strong className="text-[#F7CAC9]"> tắt mặc định</strong> và chỉ hoạt động khi bạn đồng ý.
                  </>
                )}
              </p>

              {/* Status Indicator Badges */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  <span>{isEn ? 'Necessary: Always Active' : 'Thiết yếu: Luôn Bật (Bắt buộc)'}</span>
                </span>
                <span className="px-2 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-white/60">
                  {isEn ? 'Preferences: Inactive' : 'Tùy chọn: Tắt'}
                </span>
                <span className="px-2 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-white/60">
                  {isEn ? 'Analytics: Inactive' : 'Phân tích: Tắt'}
                </span>
                <span className="px-2 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-white/60">
                  {isEn ? 'Marketing: Inactive' : 'Tiếp thị: Tắt'}
                </span>

                {onOpenPolicy && (
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      onOpenPolicy('PRIVACY');
                    }}
                    className="ml-auto text-[#F7CAC9] hover:text-white underline inline-flex items-center gap-1 text-[11px] cursor-pointer"
                  >
                    <span>{isEn ? 'View Data Policy (Art. 5)' : 'Xem Chi Tiết Điều 5 (Chính Sách Dữ Liệu)'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* EDPB Equal Prominence Action Buttons */}
            <div className="w-full lg:w-auto flex flex-col sm:flex-row items-stretch lg:items-center gap-2.5 shrink-0 pt-2 lg:pt-0">
              
              {/* Reject Non-Essential (Only Necessary) - Equal Weight */}
              <button
                type="button"
                onClick={handleRejectNonEssential}
                aria-label={isEn ? 'Reject all non-essential cookies and keep only necessary' : 'Từ chối các cookie không thiết yếu, chỉ bật bắt buộc'}
                className="px-4 py-2.5 rounded-[2px] bg-white/10 hover:bg-white/15 text-white border border-white/25 hover:border-white/40 text-xs font-mono font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>{isEn ? 'Only Necessary' : 'Chỉ Chấp Nhận Cần Thiết'}</span>
              </button>

              {/* Customize / Cookie Settings */}
              <button
                type="button"
                onClick={handleOpenCustomize}
                aria-label={isEn ? 'Customize granular cookie categories' : 'Tùy chỉnh chi tiết từng danh mục cookie'}
                className="px-4 py-2.5 rounded-[2px] bg-purple-900/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/40 hover:border-purple-400 text-xs font-mono font-semibold transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-sm"
              >
                <Sliders className="w-4 h-4 text-purple-300" />
                <span>{isEn ? 'Customize' : 'Tùy Chỉnh Chi Tiết'}</span>
              </button>

              {/* Accept All Cookies */}
              <button
                type="button"
                onClick={handleAcceptAll}
                aria-label={isEn ? 'Accept all cookies and local storage' : 'Chấp nhận tất cả cookie và lưu trữ'}
                className="px-5 py-2.5 rounded-[2px] bg-[#F7CAC9] hover:bg-white text-[#190839] font-mono font-bold text-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(247,202,201,0.35)]"
              >
                <Check className="w-4 h-4 text-[#190839]" />
                <span>{isEn ? 'Accept All' : 'Chấp Nhận Tất Cả'}</span>
              </button>

            </div>
          </div>
        </aside>
      )}

      {/* 3. European Granular Cookie Customization Modal */}
      {isCustomizeOpen && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="gdpr-cookie-modal-title"
        >
          <div className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-[#160a2c] text-[#F5EFF9] border border-[#F7CAC9]/40 rounded-[2px] shadow-[0_20px_50px_rgba(0,0,0,0.85)] overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-start justify-between gap-3 bg-[#190839]">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-[2px] bg-blue-600/30 text-blue-300 border border-blue-500/40 text-[10px] font-mono font-bold">
                    🇪🇺 GDPR ART. 7 & ePRIVACY
                  </span>
                  <span className="text-[10px] font-mono text-white/50">
                    BTI 2027 Academic Engine
                  </span>
                </div>
                <h2 id="gdpr-cookie-modal-title" className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#F7CAC9]" />
                  <span>{isEn ? 'Granular Cookie & Local Storage Preferences' : 'Cài Đặt Tùy Chọn Cookie & Lưu Trữ Cục Bộ'}</span>
                </h2>
                <p className="text-xs text-white/70">
                  {isEn 
                    ? 'Manage your individual preferences. Strictly necessary storage cannot be switched off.' 
                    : 'Quản lý chi tiết từng danh mục cookie. Dữ liệu thiết yếu bắt buộc không thể vô hiệu hóa.'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  vibrateTap();
                  setIsCustomizeOpen(false);
                }}
                aria-label={isEn ? 'Close cookie preferences' : 'Đóng bảng cài đặt cookie'}
                className="p-1.5 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Category Accordions & Technical Inventory */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 font-sans text-xs">
              
              {/* Quick Search Technical Key */}
              <div className="flex items-center gap-2 p-2 rounded-[2px] bg-white/5 border border-white/10">
                <Search className="w-4 h-4 text-white/40 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isEn ? 'Search technical key, provider, or purpose...' : 'Tìm kiếm tên cookie, mã lưu trữ, nhà cung cấp hoặc mục đích...'}
                  className="w-full bg-transparent text-white placeholder-white/40 focus:outline-none text-xs font-mono"
                />
                {searchQuery && (
                  <button 
                    type="button" 
                    onClick={() => setSearchQuery('')}
                    className="text-white/50 hover:text-white p-1 text-[11px]"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category 1: Strictly Necessary (Bắt buộc) */}
              <div className="border border-white/10 rounded-[2px] bg-white/[0.03] overflow-hidden">
                <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-white/[0.02]">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">1. {isEn ? 'Strictly Necessary' : 'Cookie & Lưu Trữ Thiết Yếu'}</span>
                      <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-mono font-bold flex items-center gap-1">
                        <Lock className="w-3 h-3" />
                        <span>{isEn ? 'Always Active' : 'Luôn Bật (Bắt Buộc)'}</span>
                      </span>
                    </div>
                    <p className="text-white/70 text-xs">
                      {isEn 
                        ? 'Essential for session authentication, anti-cheat checks, legal consent logging, and NTP clock synchronization. Cannot be turned off.' 
                        : 'Bắt buộc để duy trì phiên xác thực, chống gian lận, lưu chứng thực pháp lý và bù trừ đồng hồ thời gian thực NTP. Không thể tắt.'}
                    </p>
                  </div>

                  {/* Locked Toggle Switch */}
                  <div className="relative inline-flex items-center cursor-not-allowed opacity-80 shrink-0" title={isEn ? 'Mandatory category cannot be disabled' : 'Danh mục bắt buộc không thể tắt'}>
                    <div className="w-11 h-6 bg-emerald-500 rounded-full transition border border-emerald-400">
                      <div className="w-5 h-5 bg-white rounded-full translate-x-5 mt-0.5 shadow-md flex items-center justify-center">
                        <Lock className="w-3 h-3 text-emerald-700" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technical Items in Necessary Category */}
                <div className="p-3 bg-black/20 border-t border-white/5 space-y-2">
                  <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                    {isEn ? 'Registered items in this category:' : 'Các khóa lưu trữ đã đăng ký:'}
                  </div>
                  <div className="space-y-1.5">
                    {filteredInventory.filter(i => i.category === 'necessary').map(item => (
                      <div key={item.name} className="p-2 rounded-[2px] bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                        <div>
                          <span className="font-mono font-bold text-sky-300">{item.name}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">{item.type}</span>
                          <div className="text-white/80 mt-0.5">{isEn ? item.purposeEn : item.purposeVi}</div>
                        </div>
                        <div className="text-[10px] font-mono text-white/50 shrink-0 sm:text-right">
                          <div>{item.provider}</div>
                          <div className="text-emerald-400">{isEn ? item.durationEn : item.durationVi}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category 2: Preferences & Functionality (Tùy chọn) */}
              <div className="border border-white/10 rounded-[2px] bg-white/[0.03] overflow-hidden">
                <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-white/[0.02]">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">2. {isEn ? 'Preferences & Functionality' : 'Tùy Chọn & Trải Nghiệm'}</span>
                      <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold ${
                        preferences.preferences ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 text-white/60 border border-white/20'
                      }`}>
                        {preferences.preferences ? (isEn ? 'Active' : 'Đang Bật') : (isEn ? 'Inactive' : 'Đang Tắt')}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs">
                      {isEn 
                        ? 'Remembers your sound effects, high-contrast themes, battery saver mode, and language selection across sessions.' 
                        : 'Ghi nhớ cài đặt hiệu ứng âm thanh, nhạc nền đấu trường, chế độ tiết kiệm pin và lựa chọn ngôn ngữ qua các lần đăng nhập.'}
                    </p>
                  </div>

                  {/* Interactive Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferences.preferences}
                    aria-label={isEn ? 'Toggle Preferences cookies' : 'Bật/tắt cookie tùy chọn & trải nghiệm'}
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      setPreferences(prev => ({ ...prev, preferences: !prev.preferences }));
                    }}
                    className="relative inline-flex items-center cursor-pointer shrink-0"
                  >
                    <div className={`w-11 h-6 rounded-full transition border ${
                      preferences.preferences ? 'bg-purple-600 border-purple-400' : 'bg-slate-800 border-slate-700'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 shadow-md transition-transform ${
                        preferences.preferences ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </button>
                </div>

                {/* Technical Items in Preferences Category */}
                <div className="p-3 bg-black/20 border-t border-white/5 space-y-2">
                  <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                    {isEn ? 'Registered items in this category:' : 'Các khóa lưu trữ đã đăng ký:'}
                  </div>
                  <div className="space-y-1.5">
                    {filteredInventory.filter(i => i.category === 'preferences').map(item => (
                      <div key={item.name} className="p-2 rounded-[2px] bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                        <div>
                          <span className="font-mono font-bold text-purple-300">{item.name}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">{item.type}</span>
                          <div className="text-white/80 mt-0.5">{isEn ? item.purposeEn : item.purposeVi}</div>
                        </div>
                        <div className="text-[10px] font-mono text-white/50 shrink-0 sm:text-right">
                          <div>{item.provider}</div>
                          <div className="text-purple-300">{isEn ? item.durationEn : item.durationVi}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category 3: Analytics & Performance (Phân tích hiệu năng) */}
              <div className="border border-white/10 rounded-[2px] bg-white/[0.03] overflow-hidden">
                <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-white/[0.02]">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">3. {isEn ? 'Analytics & Performance' : 'Đo Lường & Hiệu Năng Mạng'}</span>
                      <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold ${
                        preferences.analytics ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 text-white/60 border border-white/20'
                      }`}>
                        {preferences.analytics ? (isEn ? 'Active' : 'Đang Bật') : (isEn ? 'Inactive' : 'Đang Tắt')}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs">
                      {isEn 
                        ? 'Measures round-trip ping latency and network jitter to dynamically alert you if your connection becomes unstable during a round.' 
                        : 'Đo lường độ trễ ping mạng và biến động đường truyền để tự động cảnh báo sớm khi tín hiệu mạng của bạn bị chập chờn.'}
                    </p>
                  </div>

                  {/* Interactive Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferences.analytics}
                    aria-label={isEn ? 'Toggle Analytics cookies' : 'Bật/tắt cookie phân tích & hiệu năng'}
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      setPreferences(prev => ({ ...prev, analytics: !prev.analytics }));
                    }}
                    className="relative inline-flex items-center cursor-pointer shrink-0"
                  >
                    <div className={`w-11 h-6 rounded-full transition border ${
                      preferences.analytics ? 'bg-blue-600 border-blue-400' : 'bg-slate-800 border-slate-700'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 shadow-md transition-transform ${
                        preferences.analytics ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </button>
                </div>

                {/* Technical Items in Analytics Category */}
                <div className="p-3 bg-black/20 border-t border-white/5 space-y-2">
                  <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                    {isEn ? 'Registered items in this category:' : 'Các khóa lưu trữ đã đăng ký:'}
                  </div>
                  <div className="space-y-1.5">
                    {filteredInventory.filter(i => i.category === 'analytics').map(item => (
                      <div key={item.name} className="p-2 rounded-[2px] bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                        <div>
                          <span className="font-mono font-bold text-blue-300">{item.name}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">{item.type}</span>
                          <div className="text-white/80 mt-0.5">{isEn ? item.purposeEn : item.purposeVi}</div>
                        </div>
                        <div className="text-[10px] font-mono text-white/50 shrink-0 sm:text-right">
                          <div>{item.provider}</div>
                          <div className="text-blue-300">{isEn ? item.durationEn : item.durationVi}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Category 4: Marketing & Public Campaigns (Tiếp thị & Truyền thông) */}
              <div className="border border-white/10 rounded-[2px] bg-white/[0.03] overflow-hidden">
                <div className="p-3 sm:p-4 flex items-center justify-between gap-3 bg-white/[0.02]">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white font-mono">4. {isEn ? 'Marketing & Public Media' : 'Tiếp Thị & Truyền Thông'}</span>
                      <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold ${
                        preferences.marketing ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'bg-white/10 text-white/60 border border-white/20'
                      }`}>
                        {preferences.marketing ? (isEn ? 'Active' : 'Đang Bật') : (isEn ? 'Inactive' : 'Đang Tắt')}
                      </span>
                    </div>
                    <p className="text-white/70 text-xs">
                      {isEn 
                        ? 'Tracks educational campaign referral sources and academic social media sharing links.' 
                        : 'Ghi nhận nguồn liên kết giới thiệu giải đấu từ các kênh truyền thông xã hội và đối tác học thuật.'}
                    </p>
                  </div>

                  {/* Interactive Toggle Switch */}
                  <button
                    type="button"
                    role="switch"
                    aria-checked={preferences.marketing}
                    aria-label={isEn ? 'Toggle Marketing cookies' : 'Bật/tắt cookie tiếp thị & truyền thông'}
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      setPreferences(prev => ({ ...prev, marketing: !prev.marketing }));
                    }}
                    className="relative inline-flex items-center cursor-pointer shrink-0"
                  >
                    <div className={`w-11 h-6 rounded-full transition border ${
                      preferences.marketing ? 'bg-rose-600 border-rose-400' : 'bg-slate-800 border-slate-700'
                    }`}>
                      <div className={`w-5 h-5 bg-white rounded-full mt-0.5 shadow-md transition-transform ${
                        preferences.marketing ? 'translate-x-5' : 'translate-x-0.5'
                      }`} />
                    </div>
                  </button>
                </div>

                {/* Technical Items in Marketing Category */}
                <div className="p-3 bg-black/20 border-t border-white/5 space-y-2">
                  <div className="text-[11px] font-mono text-white/50 uppercase tracking-wider">
                    {isEn ? 'Registered items in this category:' : 'Các khóa lưu trữ đã đăng ký:'}
                  </div>
                  <div className="space-y-1.5">
                    {filteredInventory.filter(i => i.category === 'marketing').map(item => (
                      <div key={item.name} className="p-2 rounded-[2px] bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[11px]">
                        <div>
                          <span className="font-mono font-bold text-rose-300">{item.name}</span>
                          <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/60 font-mono">{item.type}</span>
                          <div className="text-white/80 mt-0.5">{isEn ? item.purposeEn : item.purposeVi}</div>
                        </div>
                        <div className="text-[10px] font-mono text-white/50 shrink-0 sm:text-right">
                          <div>{item.provider}</div>
                          <div className="text-rose-300">{isEn ? item.durationEn : item.durationVi}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* GDPR Legal Rights Note */}
              <div className="p-3 rounded-[2px] bg-white/[0.02] border border-white/10 text-[11px] text-white/60 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong className="text-white">{isEn ? 'Withdrawal of Consent:' : 'Quyền Rút Lại Đồng Thuận:'} </strong>
                  {isEn 
                    ? 'According to GDPR Art. 7(3), you can withdraw or alter your cookie consent at any time by clicking the Cookie icon on the top navigation bar or inside your Profile settings.' 
                    : 'Theo Điều 7(3) GDPR, bạn có quyền rút lại hoặc thay đổi đồng thuận cookie bất kỳ lúc nào bằng cách bấm vào biểu tượng Cookie trên thanh điều hướng phía trên hoặc trong phần Hồ sơ cá nhân.'}
                </div>
              </div>

            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-5 border-t border-white/10 bg-[#190839] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleRejectNonEssential}
                className="px-4 py-2 rounded-[2px] bg-white/10 hover:bg-white/15 text-white/90 border border-white/20 text-xs font-mono font-semibold transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4 text-rose-400" />
                <span>{isEn ? 'Reject All Non-Essential' : 'Từ Chối Tất Cả Không Thiết Yếu'}</span>
              </button>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  className="px-4 py-2 rounded-[2px] bg-white/15 hover:bg-white/25 text-white border border-white/30 text-xs font-mono font-bold transition cursor-pointer active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>{isEn ? 'Accept All' : 'Chấp Nhận Tất Cả'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveCustomPreferences}
                  className="px-5 py-2 rounded-[2px] bg-[#F7CAC9] hover:bg-white text-[#190839] text-xs font-mono font-bold transition cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(247,202,201,0.3)] flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 text-[#190839]" />
                  <span>{isEn ? 'Save My Choices' : 'Lưu Lựa Chọn Của Tôi'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
};
