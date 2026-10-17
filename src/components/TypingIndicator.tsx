import React, { useState, useEffect } from 'react';
import { Bot, Sparkles } from 'lucide-react';

interface TypingIndicatorProps {
  /** Optional custom status label */
  statusLabel?: string;
  /** Whether to cycle status phrases while waiting */
  cyclePhrases?: boolean;
  /** Optional custom container class name */
  className?: string;
}

const DEFAULT_PHRASES = [
  'Đang soạn câu trả lời...',
  'Đang tra cứu dữ liệu giải đấu...',
  'Đang chuẩn bị câu trả lời cho bạn...'
];

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  statusLabel,
  cyclePhrases = true,
  className = ''
}) => {
  const [phraseIndex, setPhraseIndex] = useState<number>(0);

  useEffect(() => {
    if (!cyclePhrases || statusLabel) return;
    const interval = setInterval(() => {
      setPhraseIndex((prev) => (prev + 1) % DEFAULT_PHRASES.length);
    }, 2400);
    return () => clearInterval(interval);
  }, [cyclePhrases, statusLabel]);

  const displayLabel = statusLabel || DEFAULT_PHRASES[phraseIndex];

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Trợ lý AI đang soạn câu trả lời"
      className={`flex flex-col items-start animate-fadeIn select-none ${className}`}
    >
      {/* Assistant Bubble Container */}
      <div className="max-w-[88%] p-3 rounded-[4px] relative group text-xs leading-relaxed bg-white/10 text-white/90 border border-[#F7CAC9]/30 backdrop-blur-md shadow-md shadow-purple-950/40">
        {/* Assistant Header Tag */}
        <div className="flex items-center gap-1.5 mb-2 pb-1.5 border-b border-white/10">
          <div className="w-4 h-4 rounded-[2px] bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shrink-0 shadow-sm animate-pulse">
            <Bot className="w-2.5 h-2.5 text-white" />
          </div>
          <span className="font-mono font-bold text-[10px] text-white/80 tracking-tight flex items-center gap-1">
            <span>Trợ Lý BTI</span>
            <Sparkles className="w-2.5 h-2.5 text-[#F7CAC9] animate-pulse" />
          </span>
          <span className="px-1 py-0.2 rounded-[2px] text-[7px] font-mono font-semibold bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/30 uppercase ml-auto">
            AI Gemini
          </span>
        </div>

        {/* Typing Dots & Dynamic Status Message */}
        <div className="flex items-center gap-2.5 py-0.5">
          {/* Animated 3-Dot Typing Wave */}
          <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-[3px] bg-black/30 border border-white/5">
            <span
              className="w-2 h-2 rounded-full bg-[#F7CAC9] animate-typing-dot-1 shadow-[0_0_8px_rgba(247,202,201,0.8)]"
              style={{
                animation: 'typingDot 1.2s infinite ease-in-out',
                animationDelay: '0ms'
              }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#F7CAC9]/90 animate-typing-dot-2 shadow-[0_0_8px_rgba(247,202,201,0.6)]"
              style={{
                animation: 'typingDot 1.2s infinite ease-in-out',
                animationDelay: '200ms'
              }}
            />
            <span
              className="w-2 h-2 rounded-full bg-[#F7CAC9]/80 animate-typing-dot-3 shadow-[0_0_8px_rgba(247,202,201,0.4)]"
              style={{
                animation: 'typingDot 1.2s infinite ease-in-out',
                animationDelay: '400ms'
              }}
            />
          </div>

          {/* Typing Status Feedback */}
          <span className="font-mono text-[11px] text-[#F7CAC9] font-medium transition-all duration-300 truncate">
            {displayLabel}
          </span>
        </div>

        {/* Subtle Shimmering Indicator Bar */}
        <div className="w-full h-[2px] bg-white/5 rounded-full mt-2.5 overflow-hidden relative">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#F7CAC9] to-transparent animate-shimmer" />
        </div>
      </div>

      {/* Timestamp hint */}
      <span className="text-[9px] font-mono text-white/30 px-1 mt-0.5">
        Đang phản hồi...
      </span>
    </div>
  );
};
