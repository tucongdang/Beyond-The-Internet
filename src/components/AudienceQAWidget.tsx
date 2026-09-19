import { t } from '../utils/i18n';
import React, { useState, useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { MessageSquare, Send, Sparkles, User, Heart } from 'lucide-react';
import { UserInfo, AudienceQAQuestion } from '../types';
import { qaService } from '../services/qaService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

interface AudienceQAWidgetProps {
  user: UserInfo | null;
  onOpenModal: () => void;
  isHighContrast?: boolean;
}

export const AudienceQAWidget: React.FC<AudienceQAWidgetProps> = ({
  user,
  onOpenModal,
  isHighContrast = false
}) => {
  const { localLanguage } = useLanguage();

  const [questions, setQuestions] = useState<AudienceQAQuestion[]>([]);

  useEffect(() => {
    const unsub = qaService.subscribe(setQuestions);
    return () => unsub();
  }, []);

  const featured = questions.find((q) => q.status === 'FEATURED');
  const myQuestionsCount = user?.uid ? questions.filter((q) => q.uid === user.uid).length : 0;

  return (
    <div
      className={`rounded-[2px] p-4 border transition-all duration-300 ${
        isHighContrast
          ? 'bg-black/95 border-2 border-white text-white'
          : 'fluent-box border-white/10 text-white shadow-xl'
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-[2px] fluent-box-nested text-[#F7CAC9] flex items-center justify-center border border-white/10">
            <MessageSquare className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-white font-mono">
              Audience Q&A
            </h4>
            <span className="text-[10px] text-white/50 block">{localLanguage === 'en' ? 'Live Q&A' : 'Hỏi đáp trực tiếp'}</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            vibrateTap();
            soundFx.playClick();
            onOpenModal();
          }}
          className="px-2.5 py-1 rounded-[2px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black text-[10px] uppercase tracking-wider shadow-sm transition active:scale-95 cursor-pointer flex items-center gap-1"
        >
          <Send className="w-3 h-3" />
          <span>{localLanguage === 'en' ? 'Ask a question' : 'Đặt câu hỏi'}</span>
        </button>
      </div>

      {featured ? (
        <div className="p-3 rounded-[2px] fluent-box-nested border border-rose-500/40 space-y-1.5 mb-3">
          <div className="flex items-center justify-between text-[10px] font-mono text-rose-300 font-bold">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
              {localLanguage === 'en' ? 'BROADCASTING ON STAGE' : 'ĐANG CHIẾU TRÊN SÂN KHẤU'}
            </span>
            <span className="flex items-center gap-1 text-pink-400">
              <Heart className="w-3 h-3 fill-current" /> {featured.upvotes}
            </span>
          </div>
          <p className="text-xs text-white/90 font-medium line-clamp-2">
            "{featured.question_text}"
          </p>
        </div>
      ) : (
        <div className="text-[11px] text-white/60 mb-3 fluent-box-nested p-2.5 rounded-[2px] border border-white/5">
          {questions.length > 0 ? (
            <div className="flex items-center justify-between">
              <span>{questions.length} {localLanguage === "en" ? "questions in hall" : "câu hỏi trong hội trường"}</span>
              {myQuestionsCount > 0 && (
                <span className="text-[#F7CAC9] font-bold font-mono">
                  ({localLanguage === "en" ? `You asked ${myQuestionsCount}` : `Bạn đã gửi ${myQuestionsCount}`})
                </span>
              )}
            </div>
          ) : (
            <span>{localLanguage === "en" ? "No questions yet. Be the first to ask!" : "Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!"}</span>
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          vibrateTap();
          soundFx.playClick();
          onOpenModal();
        }}
        className="w-full py-2 px-3 rounded-[2px] bg-white/10 hover:bg-white/20 text-white/80 hover:text-white font-bold text-xs border border-white/10 transition flex items-center justify-center gap-1.5 cursor-pointer"
      >
        <Sparkles className="w-3.5 h-3.5 text-[#F7CAC9]" />
        <span>{t("qa_open", localLanguage)}</span>
      </button>
    </div>
  );
};
