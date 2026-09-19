import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useEffect, useRef } from 'react';
import { t } from '../utils/i18n';
import { AudienceShout, UserInfo } from '../types';
import { shoutService, SHOUT_BADGE_COLORS } from '../services/shoutService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateLifeline } from '../utils/hapticUtils';
import { 
  Megaphone, 
  Heart, 
  Sparkles, 
  Pin, 
  Plus, 
  ChevronRight, 
  EyeOff, 
  Eye,
  MessageCircle,
  Flame
} from 'lucide-react';

interface AudienceShoutMarqueeProps {
  user?: UserInfo | null;
  onOpenShoutModal?: () => void;
  variant?: 'audience' | 'projector' | 'compact';
  className?: string;
  isHighContrast?: boolean;
}

export const AudienceShoutMarquee: React.FC<AudienceShoutMarqueeProps> = ({
  user,
  onOpenShoutModal,
  variant = 'audience',
  className = '',
  isHighContrast = false
}) => {
  const { localLanguage } = useLanguage();

  const [shouts, setShouts] = useState<AudienceShout[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeLikeAnimId, setActiveLikeAnimId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = shoutService.subscribe((updatedShouts) => {
      setShouts(updatedShouts);
    });
    return () => unsub();
  }, []);

  const handleLike = async (e: React.MouseEvent, shoutId: string) => {
    e.stopPropagation();
    if (!user?.uid) {
      if (onOpenShoutModal) onOpenShoutModal();
      return;
    }

    vibrateTap();
    soundFx.playClick();
    setActiveLikeAnimId(shoutId);
    setTimeout(() => setActiveLikeAnimId(null), 600);

    await shoutService.toggleLikeShout(shoutId, user.uid);
  };

  if (shouts.length === 0) {
    return null;
  }

  // Formatting time relative
  const formatRelativeTime = (timestamp: number) => {
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 10) return localLanguage === 'en' ? 'Just now' : 'Vừa xong';
    if (diffSec < 60) return `${diffSec}s`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}p`;
    return `${Math.floor(diffMin / 60)}h`;
  };

  // If collapsed in audience mode
  if (isCollapsed && variant === 'audience') {
    return (
      <div className={`w-full flex items-center justify-between px-3 py-1.5 bg-black/40 backdrop-blur-md border-y border-white/10 ${className}`}>
        <div className="flex items-center gap-2 text-xs text-white/70">
          <Megaphone className="w-3.5 h-3.5 text-[#F7CAC9]" />
          <span className="font-medium">{localLanguage === 'en' ? 'Audience Shouts' : 'Tiếng hô khán giả'} ({shouts.length})</span>
        </div>
        <div className="flex items-center gap-2">
          {onOpenShoutModal && (
            <button
              onClick={() => {
                vibrateTap();
                onOpenShoutModal();
              }}
              className="px-2.5 py-1 rounded-[2px] bg-[#B6A6D8]/20 hover:bg-[#B6A6D8]/30 border border-[#B6A6D8]/40 text-xs text-white font-medium flex items-center gap-1 transition-all"
            >
              <Plus className="w-3 h-3" /> {localLanguage === 'en' ? 'Shout' : 'Hô to'}
            </button>
          )}
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-1 text-white/50 hover:text-white transition-colors"
            title={localLanguage === "en" ? "Open shout bar" : "Mở thanh tiếng hô"}
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full overflow-hidden select-none transition-all ${
        variant === 'projector'
          ? 'bg-slate-950/85 backdrop-blur-xl border-y border-[#3E1D74]/80 py-2 shadow-2xl'
          : 'bg-[#190839]/90 backdrop-blur-lg border-y border-white/15 py-1.5 shadow-lg'
      } ${className}`}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
      {/* Left Badge / CTA Button */}
      <div className="absolute left-0 top-0 bottom-0 z-20 flex items-center pl-2 sm:pl-3 pr-4 bg-gradient-to-r from-[#190839] via-[#190839]/95 to-transparent pointer-events-auto">
        <button
          onClick={() => {
            vibrateTap();
            if (onOpenShoutModal) onOpenShoutModal();
          }}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-[2px] font-bold text-xs shadow-md transition-all group ${
            variant === 'projector'
              ? 'bg-gradient-to-r from-[#3E1D74] to-[#B6A6D8]/40 text-white border border-[#B6A6D8]/50'
              : 'bg-gradient-to-r from-pink-600/90 to-purple-600/90 hover:from-pink-500 hover:to-purple-500 text-white border border-pink-400/40 active:scale-95'
          }`}
          title={localLanguage === "en" ? "Send your shout to the screen" : "Gửi tiếng hô cổ vũ của bạn lên màn hình"}
        >
          <Megaphone className="w-3.5 h-3.5 text-[#F7CAC9] group-hover:rotate-12 transition-transform" />
          <span className="hidden sm:inline font-mono uppercase tracking-wider text-[11px]">{t("shout_btn", localLanguage)}</span>
          <span className="sm:hidden font-mono uppercase tracking-wider text-[10px]">{t("shout_btn_short", localLanguage)}</span>
          {variant !== 'projector' && (
            <Plus className="w-3 h-3 text-white/80 group-hover:scale-125 transition-transform" />
          )}
        </button>
      </div>

      {/* Marquee Content Rail */}
      <div className="overflow-hidden flex w-full pl-20 sm:pl-24 pr-12">
        <div 
          className={`flex items-center gap-3 sm:gap-4 whitespace-nowrap animate-marquee ${
            isPaused ? '[animation-play-state:paused]' : ''
          }`}
        >
          {/* Double array for infinite loop marquee */}
          {[...shouts, ...shouts].map((shout, idx) => {
            const colorConfig = SHOUT_BADGE_COLORS[(shout.color as keyof typeof SHOUT_BADGE_COLORS) || 'purple'] || SHOUT_BADGE_COLORS.purple;
            const isUserLiked = user?.uid && Array.isArray(shout.liked_by) && shout.liked_by.includes(user.uid);
            const isSender = user?.uid && shout.uid === user.uid;

            return (
              <div
                key={`${shout.id}-${idx}`}
                onClick={() => {
                  vibrateTap();
                  if (onOpenShoutModal) onOpenShoutModal();
                }}
                className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-1 rounded-[2px] border transition-all cursor-pointer ${
                  shout.is_pinned
                    ? 'bg-amber-950/70 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                    : `${colorConfig.bg} ${colorConfig.border} hover:border-white/40`
                } backdrop-blur-sm group`}
              >
                {/* Pin Icon if pinned */}
                {shout.is_pinned && (
                  <Pin className="w-3 h-3 text-amber-400 fill-amber-400 rotate-45 shrink-0" />
                )}

                {/* Emoji / Avatar */}
                <span className="text-sm sm:text-base shrink-0 select-none animate-pulse">
                  {shout.emoji || '🔥'}
                </span>

                {/* Sender Name */}
                <span className={`text-[11px] sm:text-xs font-mono font-bold shrink-0 ${
                  isSender ? 'text-emerald-300 underline' : colorConfig.text
                }`}>
                  {shout.sender_name}
                  {shout.sender_mssv ? ` (${shout.sender_mssv})` : ''}:
                </span>

                {/* Message Text (Limited Chars) */}
                <span className="text-xs sm:text-[13px] text-white/95 font-medium tracking-tight">
                  {shout.text}
                </span>

                {/* Time */}
                <span className="text-[10px] font-mono text-white/40 shrink-0">
                  {formatRelativeTime(shout.timestamp)}
                </span>

                {/* Like Button */}
                <button
                  type="button"
                  onClick={(e) => handleLike(e, shout.id)}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono transition-all ml-0.5 ${
                    isUserLiked 
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 font-bold' 
                      : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10'
                  } ${activeLikeAnimId === shout.id ? 'scale-125' : ''}`}
                  title={localLanguage === "en" ? "Heart this shout" : "Thả tim cho tiếng hô này"}
                >
                  <Heart className={`w-2.5 h-2.5 ${isUserLiked ? 'fill-rose-400 text-rose-400' : 'text-white/60'}`} />
                  <span>{shout.likes || 0}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Collapse & View Wall Button */}
      <div className="absolute right-0 top-0 bottom-0 z-20 flex items-center pr-2 pl-4 bg-gradient-to-l from-[#190839] via-[#190839]/95 to-transparent pointer-events-auto gap-1">
        {onOpenShoutModal && (
          <button
            onClick={() => {
              vibrateTap();
              onOpenShoutModal();
            }}
            className="p-1 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition-all"
            title={localLanguage === "en" ? "View all shouts / Open chat board" : "Xem tất cả tiếng hô / Mở bảng chat"}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {variant === 'audience' && (
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded-[2px] text-white/40 hover:text-white/80 transition-colors"
            title={localLanguage === "en" ? "Minimize shout bar" : "Thu nhỏ thanh tiếng hô"}
          >
            <EyeOff className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};
