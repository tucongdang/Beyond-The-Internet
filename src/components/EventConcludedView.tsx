import React from 'react';
import {
  Trophy,
  Award,
  Sparkles,
  CheckCircle2,
  BarChart3,
  HeartHandshake,
  Share2,
  Calendar,
  Gift
} from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

interface EventConcludedViewProps {
  gameState: GameState;
  user: UserInfo | null;
  userScore?: number;
  userRank?: number;
  correctCount?: number;
  totalAnswered?: number;
  onOpenLeaderboard?: () => void;
  onOpenSurvey?: () => void;
}

export const EventConcludedView: React.FC<EventConcludedViewProps> = ({
  gameState,
  user,
  userScore = 0,
  userRank,
  correctCount = 0,
  totalAnswered = 0,
  onOpenLeaderboard,
  onOpenSurvey
}) => {
  const schedule = gameState.event_schedule;
  const concludingMessage = schedule?.concluding_message || 'Cảm ơn toàn thể quý thầy cô, quý đại biểu và các bạn khán giả đã tham gia và cổ vũ nhiệt tình cho Beyond The Internet 2026!';
  const eventTitle = schedule?.title || 'Beyond The Internet 2026';

  const accuracy = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;

  return (
    <div id="event-concluded-view" className="min-h-[calc(100dvh-5rem)] p-3 sm:p-5 md:p-8 flex flex-col items-center justify-center animate-in fade-in duration-300">
      <div className="max-w-2xl w-full space-y-4 sm:space-y-6">

        {/* Victory & Conclusion Hero Banner */}
        <div className="fluent-box rounded-[4px] p-6 sm:p-8 relative overflow-hidden border border-amber-500/40 shadow-2xl bg-gradient-to-br from-[#1c1206]/95 via-[#1a0f2e]/95 to-slate-950/95 text-center">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          {/* Golden Trophy Icon */}
          <div className="relative w-20 h-20 mx-auto mb-4 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-amber-400/20 animate-ping" />
            <div className="w-16 h-16 rounded-[4px] bg-gradient-to-br from-amber-400 to-yellow-500 flex items-center justify-center text-slate-950 shadow-xl shadow-amber-500/30">
              <Trophy className="w-9 h-9 fill-current" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-400/40 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>SỰ KIỆN ĐÃ KHÉP LẠI THÀNH CÔNG • BẾ MẠC</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-3">
            {eventTitle}
          </h1>

          <p className="text-sm sm:text-base text-amber-100/90 leading-relaxed max-w-xl mx-auto italic font-medium">
            &ldquo;{concludingMessage}&rdquo;
          </p>
        </div>

        {/* Personal Achievement Card (If user participated) */}
        {user && (
          <div className="fluent-box rounded-[4px] p-5 sm:p-6 border border-white/10 bg-slate-900/80 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm text-white font-mono uppercase tracking-wider">
                  Tổng Kết Thành Tích Của Bạn
                </span>
              </div>
              <span className="text-xs font-mono text-slate-400 font-bold">
                {user.name} ({user.mssv || 'Khán giả'})
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-[3px] bg-slate-950/70 border border-white/5 text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-amber-300">
                  {userScore}
                </div>
                <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase mt-0.5 font-bold">
                  Tổng Điểm
                </div>
              </div>

              <div className="p-3 rounded-[3px] bg-slate-950/70 border border-white/5 text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-sky-300">
                  {userRank ? `#${userRank}` : '--'}
                </div>
                <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase mt-0.5 font-bold">
                  Hạng Chung Cuộc
                </div>
              </div>

              <div className="p-3 rounded-[3px] bg-slate-950/70 border border-white/5 text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                  {correctCount}/{totalAnswered}
                </div>
                <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase mt-0.5 font-bold">
                  Câu Trả Lời Đúng
                </div>
              </div>

              <div className="p-3 rounded-[3px] bg-slate-950/70 border border-white/5 text-center">
                <div className="text-2xl sm:text-3xl font-black font-mono text-purple-300">
                  {accuracy}%
                </div>
                <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase mt-0.5 font-bold">
                  Độ Chính Xác
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                onOpenLeaderboard();
              }}
              className="flex-1 py-3 px-4 rounded-[3px] bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Xem Bảng Xếp Hạng Chung Cuộc</span>
            </button>
          )}

          {gameState.audience_survey?.enabled && onOpenSurvey && (
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                onOpenSurvey();
              }}
              className="flex-1 py-3 px-4 rounded-[3px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-purple-950/50 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
            >
              <Gift className="w-4 h-4" />
              <span>Khảo Sát Khán Giả & Nhận Quà</span>
            </button>
          )}
        </div>

        {/* Footnote */}
        <div className="text-center text-xs text-slate-500 font-mono">
          <span>Ban Tổ Chức Beyond The Internet 2026 chân thành cảm ơn quý khán giả. Hẹn gặp lại tại mùa giải tiếp theo!</span>
        </div>

      </div>
    </div>
  );
};
