import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Lightbulb, X, ChevronLeft, ChevronRight, Sparkles, Info } from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

export interface QuickTipItem {
  id: string;
  contextTagVi: string;
  contextTagEn: string;
  titleVi: string;
  titleEn: string;
  factVi: string;
  factEn: string;
}

interface QuickTipsProps {
  gameState: GameState;
  user?: UserInfo | null;
  isHighContrast?: boolean;
  autoHideMs?: number;
  className?: string;
  onOpenRulesModal?: () => void;
}

const SESSION_SEEN_KEY = 'bti_audience_quick_tips_seen_v1';

export const QuickTips: React.FC<QuickTipsProps> = ({
  gameState,
  user,
  isHighContrast = false,
  autoHideMs = 9500,
  className = '',
  onOpenRulesModal
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';

  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRoundContextRef = useRef<string>('');

  // Build context-aware tips list ordered by relevance to the current round/state
  const contextualTips = useMemo<QuickTipItem[]>(() => {
    const roundType = gameState?.round_type || 'MULTIPLE_CHOICE';
    const roundName = (gameState?.round_name || '').toLowerCase();
    const qId = (gameState?.question_id || '').toUpperCase();
    const isVcnv =
      roundType === 'VCNV' ||
      roundName.includes('vượt chướng ngại vật') ||
      qId.startsWith('VCNV');
    const isTT =
      roundType === 'SEQUENCING' ||
      roundType === 'TRUE_FALSE_4' ||
      roundType === 'ELIMINATION_6' ||
      roundName.includes('tăng tốc') ||
      qId.startsWith('TT');
    const isVD =
      roundType === 'SHORT_ANSWER' ||
      roundType === 'FILL_IN_BLANK' ||
      roundName.includes('về đích') ||
      qId.startsWith('VD');

    const allTips: QuickTipItem[] = [];

    if (isVcnv) {
      allTips.push({
        id: 'vcnv_keyword',
        contextTagVi: 'Vòng 2 · Vượt Chướng Ngại Vật',
        contextTagEn: 'Round 2 · Obstacle Course',
        titleVi: 'Giải mã từ khóa trung tâm',
        titleEn: 'Cracking the central keyword',
        factVi: 'Mỗi hàng ngang mở ra là một mảnh ghép gợi ý. Chốt từ khóa trung tâm càng sớm khi ít hàng ngang mở, điểm thưởng của bạn càng cao!',
        factEn: 'Each revealed row is a clue. Locking in the central keyword earlier with fewer open rows earns you a bigger point bonus!'
      });
    } else if (isTT) {
      allTips.push({
        id: 'tt_speed_tiers',
        contextTagVi: 'Vòng 3 · Tăng Tốc',
        contextTagEn: 'Round 3 · Acceleration',
        titleVi: '3 mốc vàng tính điểm tốc độ',
        titleEn: '3 golden speed scoring tiers',
        factVi: 'Chốt đáp án đúng trong 0–5 giây nhận trọn 40 điểm, từ 5–10 giây nhận 30 điểm, và sau 10 giây nhận 20 điểm!',
        factEn: 'Locking in a correct answer within 0–5s awards 40 pts, 5–10s awards 30 pts, and after 10s awards 20 pts!'
      });
      if (roundType === 'SEQUENCING') {
        allTips.push({
          id: 'tt_sequencing',
          contextTagVi: 'Mẹo thao tác · Sắp xếp',
          contextTagEn: 'Control Tip · Sequencing',
          titleVi: 'Sắp xếp nhanh chỉ với 1 chạm',
          titleEn: 'Quick order sorting',
          factVi: 'Bạn có thể kéo thả trực tiếp hoặc chạm vào nút mũi tên lên/xuống ở từng thẻ để đổi vị trí cực nhanh trên điện thoại.',
          factEn: 'Drag and drop items directly or tap the up/down arrows on each card for fast sorting on mobile.'
        });
      } else if (roundType === 'TRUE_FALSE_4') {
        allTips.push({
          id: 'tt_tf4',
          contextTagVi: 'Mẹo thao tác · Đúng / Sai',
          contextTagEn: 'Control Tip · True / False',
          titleVi: 'Kiểm tra đủ 4 mệnh đề',
          titleEn: 'Check all 4 statements',
          factVi: 'Nhớ chọn Đúng (Đ) hoặc Sai (S) cho đủ cả 4 mệnh đề trước khi bấm nút gửi bài để tối ưu điểm số nhé!',
          factEn: 'Make sure you select True or False for all 4 statements before submitting to maximize your score!'
        });
      }
    } else if (isVD) {
      allTips.push({
        id: 'vd_double_down',
        contextTagVi: 'Vòng 4 · Về Đích',
        contextTagEn: 'Round 4 · Finish Line',
        titleVi: 'Ngôi Sao Hy Vọng nhân đôi điểm',
        titleEn: 'Double Down for 2x points',
        factVi: 'Tự tin với câu trả lời của mình? Hãy bật Ngôi Sao Hy Vọng trước khi bấm nộp để nhân đôi điểm thưởng ở câu hỏi này!',
        factEn: 'Confident in your answer? Activate Double Down before submitting to earn 2x points on this question!'
      });
    } else {
      allTips.push({
        id: 'kd_fast_bonus',
        contextTagVi: 'Vòng 1 · Khởi Động',
        contextTagEn: 'Round 1 · Warm-up',
        titleVi: 'Săn thêm điểm thưởng phản xạ',
        titleEn: 'Fast reaction bonus points',
        factVi: 'Chốt đáp án đúng ngay trong 3 giây đầu tiên giúp bạn nhận tới 15 điểm thay vì 10 điểm thông thường!',
        factEn: 'Locking in the right answer within the first 3 seconds earns you 15 points instead of the standard 10 points!'
      });
    }

    // Universal helpful game rule facts
    allTips.push(
      {
        id: 'auto_submit_safety',
        contextTagVi: 'Bảo vệ điểm · Tự động nộp',
        contextTagEn: 'Score Guard · Auto-Submit',
        titleVi: 'Không lo mất lượt khi hết giờ',
        titleEn: 'Never lose your selected choice',
        factVi: 'Nếu bạn đã chạm chọn đáp án nhưng chưa kịp bấm Gửi, hệ thống sẽ tự động khóa và nộp phương án đó ngay khi đồng hồ về 0s.',
        factEn: 'If you tapped an option but time runs out before you hit Submit, your selected choice is automatically locked in at 0s.'
      },
      {
        id: 'streak_honor',
        contextTagVi: 'Chuỗi thắng · Bảng Vàng',
        contextTagEn: 'Win Streak · Honor Board',
        titleVi: 'Giữ chuỗi trả lời đúng liên tiếp',
        titleEn: 'Build your winning streak',
        factVi: 'Trả lời đúng nhiều câu liên tiếp sẽ thắp sáng huy hiệu Chuỗi Thắng trên thẻ vinh danh cuối trận của bạn!',
        factEn: 'Answering consecutive questions correctly lights up your Win Streak badge on your post-match achievement card!'
      },
      {
        id: 'lucky_draw_uid',
        contextTagVi: 'Quà tặng · Quay Số May Mắn',
        contextTagEn: 'Prizes · Lucky Draw',
        titleVi: 'Mã định danh 12 ký tự dự thưởng',
        titleEn: 'Your 12-character Lucky Draw ID',
        factVi: 'Mã UID 12 ký tự trong Hồ sơ của bạn được tự động đưa vào danh sách Quay Số May Mắn trên màn chiếu sân khấu.',
        factEn: 'Your 12-character UID badge is automatically entered into the live stage Lucky Draw wheel.'
      }
    );

    return allTips;
  }, [gameState?.round_type, gameState?.round_name, gameState?.question_id]);

  // Show briefly when user first enters AudienceView, or when the round context changes for the first time
  useEffect(() => {
    const roundContextKey = `${gameState?.round_type || 'DEFAULT'}_${Boolean(user?.uid)}`;
    const hasChangedContext = lastRoundContextRef.current !== roundContextKey;
    lastRoundContextRef.current = roundContextKey;

    if (!hasChangedContext) return;

    let alreadySeenSession = false;
    try {
      alreadySeenSession = sessionStorage.getItem(SESSION_SEEN_KEY) === 'true';
    } catch {
      // ignore storage errors
    }

    // Show immediately on first entry into AudienceView, or briefly when switching to a new round type
    setActiveIndex(0);
    const openDelay = setTimeout(() => {
      setIsVisible(true);
      if (!alreadySeenSession) {
        try {
          sessionStorage.setItem(SESSION_SEEN_KEY, 'true');
        } catch {
          // ignore
        }
      }
    }, 350);

    return () => clearTimeout(openDelay);
  }, [gameState?.round_type, user?.uid]);

  // Auto-hide timer (pauses while user hovers or interacts)
  useEffect(() => {
    if (!isVisible || isPaused) {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
      return;
    }

    autoHideTimerRef.current = setTimeout(() => {
      setIsVisible(false);
    }, autoHideMs);

    return () => {
      if (autoHideTimerRef.current) {
        clearTimeout(autoHideTimerRef.current);
        autoHideTimerRef.current = null;
      }
    };
  }, [isVisible, isPaused, activeIndex, autoHideMs]);

  const handleDismiss = useCallback(() => {
    vibrateTap();
    soundFx.playClick();
    setIsVisible(false);
  }, []);

  const handleReopen = useCallback(() => {
    vibrateTap();
    soundFx.playClick();
    setIsPaused(false);
    setIsVisible(true);
  }, []);

  const handlePrevTip = useCallback(() => {
    vibrateTap();
    soundFx.playClick();
    setActiveIndex((prev) => (prev - 1 + contextualTips.length) % contextualTips.length);
  }, [contextualTips.length]);

  const handleNextTip = useCallback(() => {
    vibrateTap();
    soundFx.playClick();
    setActiveIndex((prev) => (prev + 1) % contextualTips.length);
  }, [contextualTips.length]);

  const currentTip = contextualTips[activeIndex] || contextualTips[0];
  if (!currentTip) return null;

  // When collapsed, render a subtle, accessible helper button so users can view tips anytime
  if (!isVisible) {
    return (
      <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 pt-2 flex justify-end items-center gap-2 ${className}`}>
        {onOpenRulesModal && (
          <button
            id="btn-quick-tips-open-rules"
            type="button"
            onClick={() => {
              vibrateTap();
              soundFx.playClick();
              onOpenRulesModal();
            }}
            aria-label={isVi ? 'Xem cẩm nang luật chơi BTI 2027' : 'View BTI 2027 game rules'}
            className={`min-h-[40px] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95 whitespace-nowrap shrink-0 border ${
              isHighContrast
                ? 'bg-black text-white border-white/40 hover:border-white'
                : 'bg-[#190839]/80 hover:bg-[#24104f] text-white/90 border-white/20 shadow-sm backdrop-blur-md'
            }`}
          >
            <Info className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0" />
            <span>{isVi ? 'Luật chơi' : 'Game Rules'}</span>
          </button>
        )}
        <button
          id="btn-reopen-quick-tips"
          type="button"
          onClick={handleReopen}
          aria-label={isVi ? 'Mở mẹo luật chơi (Bạn có biết?)' : 'Open game rules quick tips (Did you know?)'}
          className={`min-h-[40px] px-3 py-1.5 rounded-[2px] text-xs font-medium flex items-center gap-1.5 transition cursor-pointer active:scale-95 whitespace-nowrap shrink-0 border ${
            isHighContrast
              ? 'bg-black text-amber-300 border-white/40 hover:border-white'
              : 'bg-[#190839]/80 hover:bg-[#24104f] text-[#F7CAC9] border-[#F7CAC9]/25 shadow-sm backdrop-blur-md'
          }`}
        >
          <Lightbulb className="w-3.5 h-3.5 text-amber-300 shrink-0" />
          <span>{isVi ? 'Bạn có biết?' : 'Did you know?'}</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      id="audience-quick-tips-card"
      aria-label={isVi ? 'Mẹo nhanh luật chơi' : 'Game rules quick tip'}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      className={`w-full max-w-7xl mx-auto px-4 sm:px-6 pt-2.5 animate-fadeIn ${className}`}
    >
      <div
        className={`relative rounded-[2px] p-4 sm:px-5 sm:py-3.5 border transition-all shadow-lg overflow-hidden ${
          isHighContrast
            ? 'bg-black border-white/50 text-white'
            : 'bg-[#160832]/95 border-[#F7CAC9]/30 text-[#F5EFF9] backdrop-blur-xl shadow-[#0D0420]/60'
        }`}
      >
        <div className="flex items-start sm:items-center justify-between gap-3">
          {/* Left Icon + Kicker + Content */}
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div
              className={`w-9 h-9 rounded-[2px] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0 border ${
                isHighContrast
                  ? 'bg-white/10 border-amber-300/60 text-amber-300'
                  : 'bg-[#F7CAC9]/15 border-[#F7CAC9]/30 text-[#F7CAC9]'
              }`}
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
            </div>

            <div className="min-w-0 flex-1">
              {/* Quiet unboxed metadata line with typographic separators */}
              <div className="flex items-center gap-1.5 text-[11px] text-[#B6A6D8] font-mono flex-wrap">
                <span className="font-semibold text-[#F7CAC9]">
                  {isVi ? 'Bạn có biết?' : 'Did you know?'}
                </span>
                <span aria-hidden="true">·</span>
                <span>{isVi ? currentTip.contextTagVi : currentTip.contextTagEn}</span>
                <span aria-hidden="true">·</span>
                <span className="tabular-nums">
                  {activeIndex + 1}/{contextualTips.length}
                </span>
              </div>

              {/* Main Title & Helpful Rule Fact */}
              <p className="text-xs sm:text-sm text-white/95 leading-relaxed mt-0.5">
                <strong className="font-bold text-white mr-1.5">
                  {isVi ? currentTip.titleVi : currentTip.titleEn}:
                </strong>
                <span className="text-[#E2DBEC]">
                  {isVi ? currentTip.factVi : currentTip.factEn}
                </span>
              </p>
            </div>
          </div>

          {/* Right Interactive Controls (Rules / Prev / Next / Close) with >= 44px touch targets */}
          <div className="flex items-center gap-1 shrink-0">
            {onOpenRulesModal && (
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  onOpenRulesModal();
                }}
                aria-label={isVi ? 'Xem chi tiết luật chơi' : 'View full game rules'}
                title={isVi ? 'Xem toàn bộ luật chơi BTI 2027' : 'View full BTI 2027 game rules'}
                className="min-h-[40px] px-2.5 py-1 rounded-[2px] flex items-center gap-1 text-xs font-semibold text-[#F7CAC9] hover:text-white bg-white/5 hover:bg-white/15 border border-[#F7CAC9]/25 transition cursor-pointer active:scale-95 whitespace-nowrap shrink-0 mr-1"
              >
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden sm:inline">{isVi ? 'Luật chơi' : 'Rules'}</span>
              </button>
            )}
            {contextualTips.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrevTip}
                  aria-label={isVi ? 'Mẹo trước đó' : 'Previous tip'}
                  title={isVi ? 'Mẹo trước đó' : 'Previous tip'}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] rounded-[2px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer active:scale-95"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNextTip}
                  aria-label={isVi ? 'Mẹo tiếp theo' : 'Next tip'}
                  title={isVi ? 'Mẹo tiếp theo' : 'Next tip'}
                  className="min-w-[40px] min-h-[40px] sm:min-w-[36px] sm:min-h-[36px] rounded-[2px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer active:scale-95"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              id="btn-dismiss-quick-tips"
              type="button"
              onClick={handleDismiss}
              aria-label={isVi ? 'Đóng mẹo luật chơi' : 'Dismiss quick tip'}
              title={isVi ? 'Đã hiểu, đóng lại' : 'Got it, dismiss'}
              className="min-w-[44px] min-h-[44px] sm:min-w-[38px] sm:min-h-[38px] rounded-[2px] flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer active:scale-95"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
