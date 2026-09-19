import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Radio, ChevronRight, X, Heart, Sparkles, User } from 'lucide-react';
import { AudienceQAQuestion } from '../types';
import { QA_CATEGORIES } from '../services/qaService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

interface AudienceHighlightedQuestionToastProps {
  featuredQuestion?: AudienceQAQuestion | null;
  onOpenQAModal?: () => void;
  isHighContrast?: boolean;
}

export const AudienceHighlightedQuestionToast: React.FC<AudienceHighlightedQuestionToastProps> = ({
  featuredQuestion,
  onOpenQAModal,
  isHighContrast = false
}) => {
  const [currentToastQuestion, setCurrentToastQuestion] = useState<AudienceQAQuestion | null>(null);
  const { localLanguage } = useLanguage();
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(100);
  const [isPaused, setIsPaused] = useState<boolean>(false);

  const lastSeenIdRef = useRef<string | null>(null);
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const DURATION_MS = 8000;
  const UPDATE_INTERVAL_MS = 50;

  useEffect(() => {
    if (!featuredQuestion || !featuredQuestion.id) {
      // If admin removed featured question, hide toast if currently showing that question
      if (currentToastQuestion) {
        setIsVisible(false);
      }
      return;
    }

    const qId = featuredQuestion.id;

    // Check if this is a newly highlighted question that hasn't been dismissed
    if (qId !== lastSeenIdRef.current) {
      lastSeenIdRef.current = qId;

      if (!dismissedIdsRef.current.has(qId)) {
        setCurrentToastQuestion(featuredQuestion);
        setIsVisible(true);
        setProgress(100);

        // Gentle auditory and haptic cue
        try {
          soundFx.playClick();
          vibrateTap();
        } catch {
          // ignore audio/haptic error
        }
      }
    } else if (isVisible && currentToastQuestion?.id === qId) {
      // Update data in-place if upvotes or text changed while visible
      setCurrentToastQuestion(featuredQuestion);
    }
  }, [featuredQuestion]);

  // Handle countdown timer and progress bar
  useEffect(() => {
    if (!isVisible || isPaused || !currentToastQuestion) {
      if (timerRef.current) clearInterval(timerRef.current);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      return;
    }

    const startTime = Date.now();
    const startProgress = progress;
    const totalRemainingTime = (startProgress / 100) * DURATION_MS;

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPct = Math.max(0, startProgress - (elapsed / DURATION_MS) * 100);
      setProgress(remainingPct);

      if (remainingPct <= 0) {
        if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
        setIsVisible(false);
      }
    }, UPDATE_INTERVAL_MS);

    return () => {
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
    };
  }, [isVisible, isPaused, currentToastQuestion]);

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (currentToastQuestion) {
      dismissedIdsRef.current.add(currentToastQuestion.id);
    }
    setIsVisible(false);
  };

  const handleClickToast = () => {
    if (currentToastQuestion) {
      dismissedIdsRef.current.add(currentToastQuestion.id);
    }
    setIsVisible(false);
    if (onOpenQAModal) {
      onOpenQAModal();
    }
  };

  if (!currentToastQuestion) return null;

  const catInfo = QA_CATEGORIES.find((c) => c.id === currentToastQuestion.category) || QA_CATEGORIES[0];

  return (
    <AnimatePresence>
      {isVisible && (
        <div className="fixed top-14 sm:top-5 left-0 right-0 z-[60] flex justify-center pointer-events-none px-3 sm:px-4">
          <motion.div
            id="toast-audience-highlighted-qa"
            initial={{ opacity: 0, y: -25, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
            onClick={handleClickToast}
            className={`pointer-events-auto max-w-lg w-full rounded-2xl shadow-2xl overflow-hidden cursor-pointer transition-all border group relative ${
              isHighContrast
                ? 'bg-black/50 backdrop-blur-[24px] saturate-150 text-white border-2 border-cyan-400 shadow-[0_8px_30px_rgba(6,182,212,0.4)]'
                : 'bg-gradient-to-br from-[#1b0a38]/98 via-[#240e49]/95 to-[#130729]/98 text-white border-sky-400/40 shadow-[0_10px_35px_rgba(14,165,233,0.3)] backdrop-blur-xl hover:border-sky-400/70'
            }`}
          >
            {/* Top Accent Live Stream Indicator */}
            <div className="px-3.5 pt-3 pb-1.5 flex items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/10 backdrop-blur-md text-rose-300 border border-rose-500/40">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                  </span>
                  {localLanguage === 'en' ? 'Broadcasting on stage' : 'Đang chiếu trên sân khấu'}
                </span>
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border truncate ${catInfo.badgeBg}`}>
                  {catInfo.label}
                </span>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {currentToastQuestion.upvotes > 0 && (
                  <span className="flex items-center gap-1 text-[10px] font-mono font-bold text-rose-300 bg-white/10 backdrop-blur-md px-2 py-0.5 rounded-full border border-rose-500/30">
                    <Heart className="w-2.5 h-2.5 fill-current" />
                    {currentToastQuestion.upvotes}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="p-1 rounded-full text-white/50 hover:text-white hover:bg-white/10 backdrop-blur-md transition"
                  title={localLanguage === "en" ? "Close notification" : "Đóng thông báo"}
                  aria-label={localLanguage === "en" ? "Close" : "Đóng"}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Main Body */}
            <div className="p-3 sm:p-3.5 flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl fluent-acrylic-surface flex items-center justify-center text-white shrink-0 shadow-md shadow-sky-500/20 border border-white/20 mt-0.5">
                <MessageSquare className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-1 text-xs">
                  <span className="font-bold text-white/90 truncate">
                    {currentToastQuestion.is_anonymous ? (localLanguage === 'en' ? 'Anonymous' : 'Khán giả ẩn danh') : currentToastQuestion.author_name}
                  </span>
                  {!currentToastQuestion.is_anonymous && currentToastQuestion.author_mssv && (
                    <span className="text-[10px] font-mono text-white/50">
                      ({currentToastQuestion.author_mssv})
                    </span>
                  )}
                </div>

                <p className="text-xs sm:text-[13px] font-medium text-white/95 leading-snug line-clamp-2 italic">
                  "{currentToastQuestion.question_text}"
                </p>

                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-sky-300 font-bold flex items-center gap-1 group-hover:underline">
                    {localLanguage === 'en' ? 'View & join Q&A' : 'Xem & tham gia Q&A'}
                    <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                  <span className="text-[10px] text-white/40 font-mono">
                    {localLanguage === 'en' ? 'Tap to open' : 'Nhấn để mở'}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress Bar (Auto-Dismiss) */}
            <div className="h-0.5 w-full bg-white/10 backdrop-blur-md overflow-hidden">
              <div
                className={`h-full transition-all duration-75 ${
                  isHighContrast ? 'bg-cyan-400' : 'fluent-acrylic-surface'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
