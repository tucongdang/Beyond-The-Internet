import React, { useMemo, useState } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../utils/i18n';
import { AnnouncerOverlay as AnnouncerOverlayType } from '../types';
import {
  Megaphone,
  AlertTriangle,
  Bell,
  Sparkles,
  Radio,
  X,
  ChevronUp,
  ChevronDown,
  Volume2
} from 'lucide-react';

interface AnnouncerOverlayProps {
  overlay?: AnnouncerOverlayType | null;
  mode?: 'projector' | 'audience' | 'preview' | 'waiting';
  className?: string;
  onDismiss?: () => void;
  isHighContrast?: boolean;
}

export const AnnouncerOverlay: React.FC<AnnouncerOverlayProps> = ({
  overlay,
  mode = 'projector',
  className = '',
  onDismiss,
  isHighContrast = false
}) => {
  const { localLanguage } = useLanguage();
  const [isMinimized, setIsMinimized] = useState(false);

  const isActive = Boolean(overlay?.active && overlay?.text?.trim());
  const text = overlay?.text || '';
  const type = overlay?.type || 'INFO';
  const speed = overlay?.speed || 'NORMAL';

  // Duration calculation for marquee scrolling
  const durationSeconds = useMemo(() => {
    const textLen = text.length;
    const baseSpeed = speed === 'FAST' ? 14 : speed === 'SLOW' ? 32 : 22;
    // Adjust slightly for longer text to maintain comfortable reading pace
    const factor = Math.max(1, textLen / 45);
    return Math.round(baseSpeed * factor);
  }, [text, speed]);

  // Visual Theme Configuration
  const themeConfig = useMemo(() => {
    switch (type) {
      case 'URGENT':
        return {
          containerBg: isHighContrast ? 'bg-black' : 'bg-[#150619]/95 backdrop-blur-[28px] saturate-[180%]',
          borderColor: isHighContrast ? 'border-rose-500/80 shadow-none' : 'border-rose-500/40 shadow-[0_-8px_32px_rgba(244,63,94,0.25)]',
          badgeBg: 'bg-rose-600/90 text-white shadow-md backdrop-blur-md',
          badgeBorder: 'border-rose-400/60',
          badgeText: localLanguage === 'en' ? 'EMERGENCY NOTICE' : 'CHÚ Ý KHẨN CẤP',
          textColor: 'text-rose-100',
          highlightColor: 'text-amber-300 font-bold',
          icon: AlertTriangle,
          iconColor: 'text-amber-300 animate-bounce',
          pulseDot: 'bg-rose-400 animate-ping',
          accentGradient: 'from-rose-500 via-[#F7CAC9] to-amber-400'
        };
      case 'ALERT':
        return {
          containerBg: isHighContrast ? 'bg-black' : 'bg-[#190f05]/95 backdrop-blur-[28px] saturate-[180%]',
          borderColor: isHighContrast ? 'border-amber-500/80 shadow-none' : 'border-amber-500/40 shadow-[0_-8px_32px_rgba(245,158,11,0.25)]',
          badgeBg: 'bg-amber-600/90 text-white shadow-md backdrop-blur-md',
          badgeBorder: 'border-amber-400/60',
          badgeText: localLanguage === 'en' ? 'IMPORTANT NOTICE' : 'LƯU Ý QUAN TRỌNG',
          textColor: 'text-amber-100',
          highlightColor: 'text-yellow-200 font-bold',
          icon: Bell,
          iconColor: 'text-yellow-300 animate-pulse',
          pulseDot: 'bg-amber-400 animate-ping',
          accentGradient: 'from-amber-400 via-yellow-200 to-amber-500'
        };
      case 'CELEBRATION':
        return {
          containerBg: isHighContrast ? 'bg-black' : 'bg-[#180628]/95 backdrop-blur-[28px] saturate-[180%]',
          borderColor: isHighContrast ? 'border-purple-500/80 shadow-none' : 'border-purple-500/40 shadow-[0_-8px_32px_rgba(168,85,247,0.25)]',
          badgeBg: 'bg-gradient-to-r from-purple-600/90 to-pink-600/90 text-white shadow-md backdrop-blur-md',
          badgeBorder: 'border-purple-400/60',
          badgeText: localLanguage === 'en' ? 'EVENT & HONORS' : 'VINH DANH & SỰ KIỆN',
          textColor: 'text-purple-100',
          highlightColor: 'text-pink-300 font-bold',
          icon: Sparkles,
          iconColor: 'text-pink-300 animate-spin',
          pulseDot: 'bg-pink-400 animate-ping',
          accentGradient: 'from-purple-400 via-pink-300 to-amber-300'
        };
      case 'INFO':
      default:
        return {
          containerBg: isHighContrast ? 'bg-black' : 'bg-[#0b142e]/95 backdrop-blur-[28px] saturate-[180%]',
          borderColor: isHighContrast ? 'border-cyan-500/80 shadow-none' : 'border-cyan-500/40 shadow-[0_-8px_32px_rgba(6,182,212,0.25)]',
          badgeBg: 'bg-gradient-to-r from-blue-600/90 to-cyan-600/90 text-white shadow-md backdrop-blur-md',
          badgeBorder: 'border-cyan-400/60',
          badgeText: localLanguage === 'en' ? 'ORGANIZER ANNOUNCEMENT' : 'THÔNG BÁO TỪ BTC',
          textColor: 'text-cyan-50',
          highlightColor: 'text-cyan-300 font-bold',
          icon: Megaphone,
          iconColor: 'text-cyan-300',
          pulseDot: 'bg-cyan-400 animate-ping',
          accentGradient: 'from-cyan-400 via-indigo-300 to-purple-400'
        };
    }
  }, [type, isHighContrast, localLanguage]);

  // Create repeated text segments to guarantee a continuous smooth marquee flow
  const repeatedTextItems = useMemo(() => {
    const raw = text.trim();
    return [raw, raw, raw, raw];
  }, [text]);

  if (!isActive) {
    return null;
  }

  const IconComponent = themeConfig.icon;
  const isProjector = mode === 'projector' || mode === 'waiting';
  const isPreview = mode === 'preview';

  // Minimized Floating Pill Mode (so users can collapse if desired)
  if (isMinimized && !isPreview) {
    return (
      <div
        className={`fixed ${
          mode === 'audience' ? 'bottom-[74px] sm:bottom-4' : 'bottom-4'
        } left-4 z-[99] animate-fadeIn`}
      >
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className={`fluent-subtab-btn flex items-center gap-2 px-3 py-2 rounded-[2px] border ${
            isHighContrast
              ? 'border-2 border-white bg-black text-white shadow-none'
              : `${themeConfig.badgeBorder} ${themeConfig.containerBg} text-white shadow-2xl backdrop-blur-xl`
          } transition group text-xs font-bold`}
          title={t("view_ann_expand", localLanguage)}
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isHighContrast ? 'bg-white' : themeConfig.pulseDot}`} />
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isHighContrast ? 'bg-white' : 'bg-white'}`} />
          </span>
          <IconComponent className={`w-3.5 h-3.5 ${isHighContrast ? 'text-white' : themeConfig.iconColor}`} />
          <span className="text-[11px] font-mono uppercase tracking-wider">{themeConfig.badgeText}</span>
          <ChevronUp className="w-3.5 h-3.5 text-white/70 group-hover:text-white" />
        </button>
      </div>
    );
  }

  return (
    <div
      id="bti-announcer-overlay"
      className={`${
        isPreview
          ? 'relative w-full'
          : mode === 'audience'
          ? 'fixed bottom-[68px] sm:bottom-0 left-0 right-0 z-[60]'
          : 'fixed bottom-0 left-0 right-0 z-[60]'
      } ${className} animate-slideUpFade transition-all duration-380 select-none`}
    >
      <div
        className={`w-full ${
          isHighContrast
            ? 'bg-black border-t-2 border-b-2 border-white'
            : `backdrop-blur-xl border-t ${themeConfig.borderColor} ${themeConfig.containerBg}`
        } ${
          isProjector ? 'py-3 px-3 sm:px-6 lg:px-8' : 'py-2 px-2.5 sm:px-6'
        } relative overflow-hidden flex items-center gap-2 sm:gap-4`}
      >
        {/* Subtle glowing beacon background line */}
        {!isHighContrast && (
          <div className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r ${themeConfig.accentGradient} pointer-events-none z-10 opacity-90 shadow-[0_0_8px_rgba(255,255,255,0.4)]`} />
        )}

        {/* Left Badge: Live Announcer Indicator */}
        <div className="flex-shrink-0 flex items-center gap-2 z-10">
          <div
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-[2px] border ${themeConfig.badgeBorder} ${themeConfig.badgeBg} font-mono font-black text-[9px] sm:text-xs uppercase tracking-wider shadow-md`}
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${themeConfig.pulseDot}`} />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
            <IconComponent className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${themeConfig.iconColor}`} />
            <span className="whitespace-nowrap tracking-wide">{themeConfig.badgeText}</span>
          </div>
        </div>

        {/* Marquee Viewport with Left/Right Gradient Fades */}
        <div className="relative flex-1 overflow-hidden py-0.5 mask-radial">
          {/* Left Fade Gradient */}
          <div className={`absolute left-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-r ${isHighContrast ? 'from-black' : 'from-[#190839]'} to-transparent z-10 pointer-events-none opacity-80`} />
          
          {/* Right Fade Gradient */}
          <div className={`absolute right-0 top-0 bottom-0 w-6 sm:w-12 bg-gradient-to-l ${isHighContrast ? 'from-black' : 'from-[#190839]'} to-transparent z-10 pointer-events-none opacity-80`} />

          {/* Continuous scrolling marquee track */}
          <div
            className="animate-marquee-continuous flex items-center whitespace-nowrap cursor-default"
            style={{ animationDuration: `${durationSeconds}s` }}
            title={t("view_ann_pause", localLanguage)}
          >
            {repeatedTextItems.map((item, idx) => (
              <div
                key={idx}
                className={`flex items-center gap-6 sm:gap-8 px-4 sm:px-6 ${
                  isProjector
                    ? 'text-base sm:text-lg lg:text-xl font-bold'
                    : 'text-xs sm:text-sm font-semibold'
                } ${themeConfig.textColor} tracking-wide`}
              >
                <span>{item}</span>
                <span className="inline-flex items-center gap-1.5 opacity-60 text-xs font-mono select-none">
                  <span className="text-amber-400">✦</span>
                  <span className="tracking-widest text-[#F7CAC9]">BTI 2026</span>
                  <span className="text-pink-400">✦</span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Actions on the right (Minimize / Close) */}
        {!isPreview && (
          <div className="flex-shrink-0 flex items-center gap-1 z-10">
            {mode !== 'projector' && (
              <button
                type="button"
                onClick={() => setIsMinimized(true)}
                className={`p-1.5 rounded-[2px] ${
                  isHighContrast
                    ? 'bg-black border border-white text-white hover:bg-white hover:text-black'
                    : 'fluent-box-nested border border-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                } transition`}
                title={t("view_ann_collapse", localLanguage)}
              >
                <ChevronDown className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
            {onDismiss && (
              <button
                type="button"
                onClick={onDismiss}
                className={`p-1.5 rounded-[2px] ${
                  isHighContrast
                    ? 'bg-black border border-white text-white hover:bg-white hover:text-black'
                    : 'fluent-box-nested border border-white/10 hover:bg-white/20 text-white/70 hover:text-white'
                } transition`}
                title={t("view_ann_close", localLanguage)}
              >
                <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


