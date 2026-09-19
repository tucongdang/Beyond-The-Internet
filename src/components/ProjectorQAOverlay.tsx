import React from 'react';
import { MessageSquare, Sparkles, User, Heart, Radio, X } from 'lucide-react';
import { AudienceQAQuestion } from '../types';
import { QA_CATEGORIES, qaService } from '../services/qaService';

interface ProjectorQAOverlayProps {
  question: AudienceQAQuestion | null;
  theme?: string;
  onDismiss?: () => void;
}

export const ProjectorQAOverlay: React.FC<ProjectorQAOverlayProps> = ({
  question,
  theme = 'cyber_blue',
  onDismiss
}) => {
  if (!question) return null;

  const catInfo = QA_CATEGORIES.find((c) => c.id === question.category) || QA_CATEGORIES[0];

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    } else {
      qaService.featureQuestionOnProjector(null);
    }
  };

  return (
    <div className="fixed inset-x-4 sm:inset-x-8 md:inset-x-12 bottom-16 sm:bottom-20 z-50 animate-fadeIn">
      <div className="relative max-w-5xl mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-r from-[#180936]/95 via-[#230d4a]/95 to-[#150730]/95 border-2 border-pink-500/50 shadow-[0_0_60px_rgba(244,63,94,0.35)] backdrop-blur-2xl overflow-hidden ring-1 ring-pink-400/30">
        {/* Subtle Decorative Backdrop Glow */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-white/10 backdrop-blur-md rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-white/10 backdrop-blur-md rounded-full blur-3xl pointer-events-none" />

        {/* Top Header Bar */}
        <div className="flex items-center justify-between gap-4 pb-4 mb-4 border-b border-white/15 relative z-10">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-10 h-10 rounded-2xl fluent-acrylic-surface flex items-center justify-center text-white shadow-lg shadow-rose-500/40 border border-white/20">
              <MessageSquare className="w-5 h-5" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-widest uppercase font-mono px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md text-rose-300 border border-rose-500/40 flex items-center gap-1.5 shadow-sm">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-rose-400" />
                  ĐẶT CÂU HỎI TỪ KHÁN PHÒNG • LIVE AUDIENCE Q&A
                </span>
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${catInfo.badgeBg}`}>
                  {catInfo.label}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {question.upvotes > 0 && (
              <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-rose-300 border border-rose-500/30 text-xs font-mono font-bold flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-current text-rose-400" />
                <span>{question.upvotes} Khán giả cùng quan tâm</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 rounded-full bg-white/10 backdrop-blur-md hover:bg-white/10 backdrop-blur-md text-white/70 hover:text-white transition cursor-pointer"
              title="Gỡ câu hỏi khỏi màn chiếu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="relative z-10 mb-5">
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-white leading-relaxed tracking-wide drop-shadow-md">
            "{question.question_text}"
          </p>
        </div>

        {/* Author / Questioner Identity */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 relative z-10 text-xs sm:text-sm text-white/70">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center text-white/80">
              <User className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white">
                {question.is_anonymous ? 'Khán giả ẩn danh' : question.author_name}
              </span>
              {!question.is_anonymous && question.author_mssv && (
                <span className="ml-2 font-mono text-xs px-2 py-0.5 rounded bg-white/10 backdrop-blur-md text-white/80">
                  MSSV: {question.author_mssv}
                </span>
              )}
            </div>
          </div>

          <div className="text-[11px] font-mono text-white/40">
            {new Date(question.created_at).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
