import React from 'react';
import { RefreshCw } from 'lucide-react';
import { RoundType } from '../types';
import { getQuestionSkeletonLayout } from '../utils/questionSkeletonUtils';

interface AudienceQuestionSkeletonProps {
  mode: 'active-question-card' | 'active-options' | 'standby-preview' | 'vcnv-card';
  roundType?: RoundType;
  options?: Record<string, string>;
  isLongQuestion?: boolean;
  localLanguage?: string;
  roundName?: string;
}

const OPTION_KEYS = ['A', 'B', 'C', 'D', 'E', 'F'];

export const AudienceQuestionSkeleton: React.FC<AudienceQuestionSkeletonProps> = ({
  mode,
  roundType = 'MULTIPLE_CHOICE',
  options,
  isLongQuestion = false,
  localLanguage = 'vi',
  roundName
}) => {
  const isEn = localLanguage !== 'vi';
  const { variant, optionCount } = getQuestionSkeletonLayout(roundType, options);

  if (mode === 'active-question-card') {
    return (
      <div
        data-testid="audience-question-card-skeleton"
        role="status"
        aria-busy="true"
        aria-live="polite"
        aria-label={isEn ? 'Loading new question from stage' : 'Đang tải câu hỏi mới từ sân khấu'}
        className={`fluent-question-box rounded-[2px] p-5 sm:p-6 lg:p-7 xl:p-8 flex flex-col justify-between relative overflow-hidden ${
          isLongQuestion
            ? 'min-h-[140px] md:min-h-[170px] w-full'
            : 'min-h-[180px] md:min-h-[280px] h-full'
        }`}
      >
        {/* Header Skeleton Row */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 sm:pb-3 mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <RefreshCw className="w-3.5 h-3.5 text-[#F7CAC9] animate-spin shrink-0" />
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F7CAC9] truncate">
              {isEn ? 'Opening new question...' : 'Đang mở câu hỏi mới...'}
            </span>
            <div className="hidden sm:block h-3.5 w-20 fluent-skeleton-bar" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="h-6 w-14 fluent-skeleton-bar" />
            <div className="h-6 w-7 fluent-skeleton-bar" />
            <div className="h-6 w-7 fluent-skeleton-bar" />
          </div>
        </div>

        {/* Question Body Shimmer Lines */}
        <div className="my-auto py-3 space-y-3.5">
          <div className="h-5 sm:h-6 w-11/12 fluent-skeleton-bar" />
          <div className="h-5 sm:h-6 w-4/5 fluent-skeleton-bar" />
          <div className="h-5 sm:h-6 w-3/5 fluent-skeleton-bar" />
        </div>

        {/* Footer Sync Indicator */}
        <div className="mt-4 pt-2.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-[#B6A6D8]/80">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-[#F7CAC9] animate-pulse" />
            {roundName || (isEn ? 'REALTIME SYNC' : 'ĐỒNG BỘ TRỰC TIẾP')}
          </span>
          <div className="h-3 w-24 fluent-skeleton-bar" />
        </div>
      </div>
    );
  }

  if (mode === 'active-options') {
    if (variant === 'SHORT_ANSWER') {
      return (
        <div
          data-testid="audience-options-skeleton"
          role="status"
          aria-busy="true"
          className="space-y-3 pt-1"
        >
          <div className="h-4 w-48 fluent-skeleton-bar" />
          <div className="flex gap-2">
            <div className="flex-1 h-12 fluent-skeleton-card p-3 flex items-center">
              <div className="h-4 w-2/3 fluent-skeleton-bar" />
            </div>
            <div className="w-28 h-12 fluent-skeleton-card flex items-center justify-center">
              <div className="h-4 w-16 fluent-skeleton-bar" />
            </div>
          </div>
        </div>
      );
    }

    if (variant === 'TRUE_FALSE_4') {
      return (
        <div
          data-testid="audience-options-skeleton"
          role="status"
          aria-busy="true"
          className="space-y-3 pt-1"
        >
          <div className="h-4 w-52 fluent-skeleton-bar mb-2" />
          <div className={`grid grid-cols-1 ${isLongQuestion ? 'md:grid-cols-2' : ''} gap-3`}>
            {Array.from({ length: optionCount }).map((_, idx) => (
              <div
                key={idx}
                className="p-3.5 fluent-skeleton-card rounded-[2px] space-y-3"
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-6 h-6 fluent-skeleton-bar shrink-0" />
                  <div className="flex-1 space-y-2 pt-0.5">
                    <div className="h-3.5 w-11/12 fluent-skeleton-bar" />
                    <div className="h-3.5 w-3/5 fluent-skeleton-bar" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="h-8 fluent-skeleton-bar" />
                  <div className="h-8 fluent-skeleton-bar" />
                </div>
              </div>
            ))}
          </div>
          <div className="w-full h-12 fluent-skeleton-bar mt-3" />
        </div>
      );
    }

    if (variant === 'SEQUENCING') {
      return (
        <div
          data-testid="audience-options-skeleton"
          role="status"
          aria-busy="true"
          className="space-y-3 pt-1"
        >
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <div className="h-4 w-44 fluent-skeleton-bar" />
            <div className="h-4 w-16 fluent-skeleton-bar" />
          </div>
          <div className="space-y-2">
            {Array.from({ length: optionCount }).map((_, idx) => (
              <div
                key={idx}
                className="p-3 fluent-skeleton-card rounded-[2px] flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5 flex-1">
                  <div className="w-4 h-4 fluent-skeleton-bar shrink-0" />
                  <div className="w-7 h-7 fluent-skeleton-bar shrink-0" />
                  <div className="w-6 h-6 fluent-skeleton-bar shrink-0" />
                  <div className="h-4 w-3/4 fluent-skeleton-bar" />
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <div className="w-8 h-8 fluent-skeleton-bar" />
                  <div className="w-8 h-8 fluent-skeleton-bar" />
                </div>
              </div>
            ))}
          </div>
          <div className="w-full h-12 fluent-skeleton-bar mt-2" />
        </div>
      );
    }

    if (variant === 'TRUE_FALSE') {
      return (
        <div
          data-testid="audience-options-skeleton"
          role="status"
          aria-busy="true"
          className="flex flex-col sm:flex-row gap-4 pt-4 items-center justify-center"
        >
          {[0, 1].map((idx) => (
            <div
              key={idx}
              className="flex-1 w-full sm:max-w-xs px-4 py-8 sm:py-10 fluent-skeleton-card rounded-[2px] flex flex-col items-center justify-center gap-3"
            >
              <div className="h-10 w-28 fluent-skeleton-bar" />
              <div className="h-3 w-16 fluent-skeleton-bar" />
            </div>
          ))}
        </div>
      );
    }

    // Default: MULTIPLE_CHOICE / IMAGE_POLL / BLIND_POLL / ELIMINATION_6
    return (
      <div
        data-testid="audience-options-skeleton"
        role="status"
        aria-busy="true"
        className={`grid grid-cols-1 sm:grid-cols-2 ${isLongQuestion ? 'lg:grid-cols-4' : ''} gap-4 pt-1`}
      >
        {Array.from({ length: optionCount }).map((_, idx) => {
          const keyLabel = OPTION_KEYS[idx] || String(idx + 1);
          return (
            <div
              key={keyLabel}
              className="relative w-full min-h-[64px] sm:min-h-[72px] p-4 sm:p-5 fluent-skeleton-card rounded-[2px] flex flex-col gap-3 overflow-hidden"
            >
              {variant === 'IMAGE_POLL' && (
                <div className="w-full h-40 sm:h-48 fluent-skeleton-bar" />
              )}
              <div className="flex items-start gap-3.5 w-full">
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className="w-10 h-10 sm:w-11 sm:h-11 fluent-skeleton-bar flex items-center justify-center font-mono font-black text-xs text-[#F7CAC9]/40">
                    {keyLabel}
                  </div>
                  <div className="w-6 h-3.5 fluent-skeleton-bar hidden sm:block" />
                </div>
                <div className="flex-1 pt-1 space-y-2.5">
                  <div className="h-4 w-5/6 fluent-skeleton-bar" />
                  <div className="h-3.5 w-3/5 fluent-skeleton-bar" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  if (mode === 'vcnv-card') {
    return (
      <div
        data-testid="audience-vcnv-skeleton"
        role="status"
        aria-busy="true"
        className="fluent-question-box rounded-[2px] p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 text-[#F7CAC9] animate-spin" />
            <span className="text-xs font-mono font-bold uppercase text-[#F7CAC9]">
              {isEn ? 'Loading obstacle clue...' : 'Đang tải gợi ý Vượt Chướng Ngại Vật...'}
            </span>
          </div>
          <div className="h-4 w-20 fluent-skeleton-bar" />
        </div>
        <div className="space-y-2.5 py-2">
          <div className="h-4 w-11/12 fluent-skeleton-bar" />
          <div className="h-4 w-4/5 fluent-skeleton-bar" />
          <div className="h-4 w-2/3 fluent-skeleton-bar" />
        </div>
      </div>
    );
  }

  // mode === 'standby-preview'
  return (
    <div
      data-testid="audience-standby-question-skeleton"
      role="status"
      aria-busy="true"
      aria-live="polite"
      className="w-full max-w-2xl mt-4 fluent-question-box rounded-[2px] p-4 sm:p-5 text-left shadow-xl animate-fadeIn"
    >
      <div className="flex items-center justify-between gap-2 pb-2.5 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-3.5 h-3.5 text-[#F7CAC9] animate-spin shrink-0" />
          <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#F7CAC9]">
            {isEn
              ? 'Receiving new question from stage...'
              : 'Đang nhận câu hỏi mới từ sân khấu...'}
          </span>
        </div>
        <div className="h-4 w-16 fluent-skeleton-bar shrink-0" />
      </div>

      {/* Question Card Skeleton Lines */}
      <div className="space-y-2.5 mb-4">
        <div className="h-4 w-11/12 fluent-skeleton-bar" />
        <div className="h-4 w-3/4 fluent-skeleton-bar" />
      </div>

      {/* 4 Mini Option Card Skeletons */}
      <div className="grid grid-cols-2 gap-2.5">
        {['A', 'B', 'C', 'D'].map((key) => (
          <div
            key={key}
            className="p-2.5 fluent-skeleton-card rounded-[2px] flex items-center gap-2.5"
          >
            <div className="w-7 h-7 fluent-skeleton-bar shrink-0 flex items-center justify-center font-mono font-black text-[10px] text-[#F7CAC9]/40">
              {key}
            </div>
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-4/5 fluent-skeleton-bar" />
              <div className="h-2.5 w-1/2 fluent-skeleton-bar" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
