import React, { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { t } from '../utils/i18n';
import { Heart, Sparkles } from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

interface QuestionLikeButtonProps {
  questionId: string;
  user: UserInfo | null;
  gameState?: GameState;
  variant?: 'compact' | 'standard' | 'pill' | 'float' | 'card_header';
  className?: string;
  showLabel?: boolean;
  onLikeChange?: (isLiked: boolean, count: number) => void;
}

export const QuestionLikeButton: React.FC<QuestionLikeButtonProps> = ({
  questionId,
  user,
  gameState,
  variant = 'standard',
  className = '',
  showLabel = true,
  onLikeChange
}) => {
  const uid = user?.uid || '';
  
  // Calculate like state from gameState or syncService fallback
  const syncLikes = gameState?.question_likes?.[questionId] ?? syncService.getQuestionLikes(questionId);
  const syncIsLiked = uid ? (
    gameState?.question_likes_uids?.[questionId]?.includes(uid) ?? 
    syncService.isQuestionLikedByUser(questionId, uid)
  ) : false;

  const { localLanguage } = useLanguage();
  const [isLiked, setIsLiked] = useState<boolean>(syncIsLiked);
  const [likesCount, setLikesCount] = useState<number>(syncLikes);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; scale: number }>>([]);

  // Keep state in sync with server / broadcast updates
  useEffect(() => {
    setIsLiked(syncIsLiked);
    setLikesCount(syncLikes);
  }, [syncIsLiked, syncLikes]);

  const handleToggleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    if (!questionId) return;

    // Haptic and audio feedback
    vibrateTap();
    if (!isLiked) {
      soundFx.playPop();
      // Trigger heart burst particles
      setIsAnimating(true);
      const newParticles = Array.from({ length: 5 }).map((_, i) => ({
        id: Date.now() + i,
        x: (Math.random() - 0.5) * 40,
        y: -15 - Math.random() * 25,
        scale: 0.6 + Math.random() * 0.5
      }));
      setParticles(newParticles);
      setTimeout(() => {
        setParticles([]);
        setIsAnimating(false);
      }, 700);
    } else {
      soundFx.playClick();
    }

    // Optimistic UI update
    const nextIsLiked = !isLiked;
    const nextCount = Math.max(0, likesCount + (nextIsLiked ? 1 : -1));
    setIsLiked(nextIsLiked);
    setLikesCount(nextCount);

    if (onLikeChange) {
      onLikeChange(nextIsLiked, nextCount);
    }

    try {
      const activeUid = uid || 'anon_' + (sessionStorage.getItem('btea_anon_id') || Math.random().toString(36).substring(2, 9));
      if (!sessionStorage.getItem('btea_anon_id')) {
        sessionStorage.setItem('btea_anon_id', activeUid);
      }
      await syncService.toggleQuestionLike(questionId, activeUid);
    } catch (err) {
      console.warn('Failed to toggle question like:', err);
    }
  };

  // Base styling depending on variant
  if (variant === 'compact') {
    return (
      <button
        type="button"
        id={`btn-like-question-compact-${questionId}`}
        onClick={handleToggleLike}
        title={isLiked ? t("view_like_unlike", localLanguage) : t("view_like_like", localLanguage)}
        className={`group relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-mono text-xs font-bold transition-all duration-200 border select-none ${
          isLiked
            ? 'fluent-box-nested text-rose-300 border-rose-500/50 shadow-sm shadow-rose-500/20 hover:fluent-box-nested'
            : 'bg-[#0D0420]/80 backdrop-blur-md text-slate-300 border-[#3E1D74] hover:border-rose-400/40 hover:text-rose-300 hover:fluent-box-nested'
        } ${className}`}
      >
        <Heart
          className={`w-3.5 h-3.5 transition-transform duration-300 ${
            isLiked 
              ? 'fill-rose-500 text-rose-500 scale-110 group-hover:scale-125' 
              : 'text-slate-400 group-hover:text-rose-400 group-hover:scale-110'
          } ${isAnimating ? 'animate-bounce' : ''}`}
        />
        <span>{likesCount}</span>

        {/* Floating Heart Particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute pointer-events-none text-rose-400 text-xs font-bold transition-all duration-700 animate-ping opacity-90"
            style={{
              transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
              left: '50%',
              top: '20%'
            }}
          >
            ❤️
          </span>
        ))}
      </button>
    );
  }

  if (variant === 'card_header') {
    return (
      <button
        type="button"
        id={`btn-like-question-header-${questionId}`}
        onClick={handleToggleLike}
        title={isLiked ? t("view_like_liked_btn", localLanguage) : t("view_like_like_btn", localLanguage)}
        className={`group relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] font-mono text-xs font-bold transition-all duration-300 border select-none ${
          isLiked
            ? 'fluent-acrylic-surface text-rose-200 border-rose-400/60 shadow-md shadow-rose-500/20 scale-[1.02]'
            : 'bg-[#0D0420]/70 backdrop-blur-md text-[#B6A6D8] border-[#3E1D74] hover:border-rose-400/50 hover:text-rose-300 hover:fluent-box-nested'
        } ${className}`}
      >
        <Heart
          className={`w-4 h-4 transition-all duration-300 ${
            isLiked 
              ? 'fill-rose-500 text-rose-500 scale-110 drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' 
              : 'text-slate-400 group-hover:text-rose-400 group-hover:scale-110'
          } ${isAnimating ? 'animate-pulse' : ''}`}
        />
        <span className="font-bold text-xs">{likesCount}</span>
        {showLabel && (
          <span className="text-[10px] uppercase tracking-wider font-sans font-medium text-slate-300 group-hover:text-white hidden sm:inline">
            {isLiked ? t("view_like_liked_txt", localLanguage) : t("view_like_like_txt", localLanguage)}
          </span>
        )}

        {/* Floating Heart Particles */}
        {particles.map((p) => (
          <span
            key={p.id}
            className="absolute pointer-events-none text-rose-400 text-xs font-bold transition-all duration-700 animate-ping opacity-90"
            style={{
              transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
              left: '50%',
              top: '20%'
            }}
          >
            💖
          </span>
        ))}
      </button>
    );
  }

  // Standard Pill variant
  return (
    <button
      type="button"
      id={`btn-like-question-${questionId}`}
      onClick={handleToggleLike}
      title={isLiked ? t("view_like_liked_title", localLanguage) : t("view_like_like_title", localLanguage)}
      className={`group relative inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-[4px] font-mono text-xs font-bold transition-all duration-300 border select-none cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 ${
        isLiked
          ? 'fluent-box-nested text-rose-200 border-rose-500/60 shadow-lg shadow-rose-950/40 hover:fluent-box-nested'
          : 'bg-[#241148]/80 backdrop-blur-md text-slate-300 border-[#3E1D74] hover:border-rose-400/50 hover:text-white hover:fluent-box-nested shadow-sm'
      } ${className}`}
    >
      <div className="relative">
        <Heart
          className={`w-4 h-4 transition-transform duration-300 ${
            isLiked 
              ? 'fill-rose-500 text-rose-500 scale-125 drop-shadow-[0_0_10px_rgba(244,63,94,0.7)]' 
              : 'text-slate-400 group-hover:text-rose-400 group-hover:scale-110'
          } ${isAnimating ? 'animate-ping' : ''}`}
        />
        {isLiked && (
          <Sparkles className="w-2.5 h-2.5 text-yellow-300 absolute -top-1.5 -right-1.5 animate-pulse" />
        )}
      </div>

      <div className="flex items-center gap-1.5">
        <span className="font-black text-sm text-white">
          {likesCount}
        </span>
        {showLabel && (
          <span className="text-[11px] font-sans font-medium text-[#B6A6D8] group-hover:text-white">
            {isLiked ? t("view_like_liked_txt", localLanguage) : t("view_like_like_txt2", localLanguage)}
          </span>
        )}
      </div>

      {/* Floating Burst Particles */}
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute pointer-events-none text-rose-400 text-xs font-bold transition-all duration-700 animate-bounce opacity-95"
          style={{
            transform: `translate(${p.x}px, ${p.y}px) scale(${p.scale})`,
            left: '50%',
            top: '0%'
          }}
        >
          ❤️
        </span>
      ))}
    </button>
  );
};
