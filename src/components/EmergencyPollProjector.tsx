import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Users,
  Award,
  BarChart3,
  GraduationCap,
  Flame,
  Radio
} from 'lucide-react';
import confetti from '../utils/confetti';
import { GameState, UserResponse, EmergencyPollSourceType } from '../types';
import { syncService } from '../services/syncService';

interface EmergencyPollProjectorProps {
  gameState: GameState;
  allResponses?: Record<string, Record<string, UserResponse>>;
  activeCount: number;
}

const SOURCE_BADGE_STYLE: Record<
  EmergencyPollSourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeBg: string; border: string; text: string }
> = {
  ADVISOR: {
    label: 'Cố vấn chuyên môn',
    icon: GraduationCap,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-sky-500/40',
    text: 'text-sky-300'
  },
  CONTESTANT: {
    label: 'Thí sinh / Đội thi',
    icon: Flame,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-amber-500/40',
    text: 'text-amber-300'
  },
  JURY: {
    label: 'Ban Giám Khảo',
    icon: Award,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-purple-500/40',
    text: 'text-purple-300'
  },
  AUDIENCE: {
    label: 'Khán giả',
    icon: Users,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300'
  },
  HOST: {
    label: 'MC / Ban Tổ Chức',
    icon: Radio,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-rose-500/40',
    text: 'text-rose-300'
  }
};

export const EmergencyPollProjector: React.FC<EmergencyPollProjectorProps> = ({
  gameState,
  allResponses,
  activeCount
}) => {
  const poll = gameState.emergency_poll;

  const pollResponses: Record<string, UserResponse> = poll?.id
    ? (allResponses?.[`EMERGENCY_POLL_${poll.id}`] as Record<string, UserResponse>) || {}
    : {};
  const [timeLeft, setTimeLeft] = useState<number>(poll?.time_limit || 0);

  // Countdown timer
  useEffect(() => {
    if (!poll || poll.status !== 'ACTIVE' || (poll.time_limit || 0) <= 0) {
      setTimeLeft(poll?.time_limit || 0);
      return;
    }

    const computeTime = () => {
      if (!poll.server_start_time) return poll.time_limit;
      const elapsed = Math.floor((syncService.getSynchronizedNow() - poll.server_start_time) / 1000);
      return Math.max(0, poll.time_limit - elapsed);
    };

    setTimeLeft(computeTime());
    const interval = setInterval(() => {
      setTimeLeft(computeTime());
    }, 250);

    return () => clearInterval(interval);
  }, [poll?.status, poll?.server_start_time, poll?.time_limit]);

  // Celebrate on reveal
  useEffect(() => {
    if (poll?.status === 'REVEALED') {
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.5 }
        });
      } catch {}
    }
  }, [poll?.status]);

  if (!poll || poll.status === 'DISMISSED') return null;

  const votesList = Object.values(pollResponses);
  const totalVotes = votesList.length;
  const optionEntries = Object.entries(poll.options || {});
  const optionColors = ['#10b981', '#f43f5e', '#0284c7', '#f59e0b', '#a855f7', '#06b6d4'];

  const stats = optionEntries.map(([key, text], index) => {
    const count = votesList.filter(v => v.choice === key).length;
    const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
    const color = optionColors[index % optionColors.length];
    return {
      key,
      text,
      count,
      percent,
      color
    };
  });

  const dominantOption = [...stats].sort((a, b) => b.count - a.count)[0];
  const isDominantTie = stats.filter(s => s.count === dominantOption?.count && s.count > 0).length > 1;

  const countA = stats.find(s => s.key === 'A')?.count || 0;
  const countB = stats.find(s => s.key === 'B')?.count || 0;
  const percentA = stats.find(s => s.key === 'A')?.percent || 0;
  const percentB = stats.find(s => s.key === 'B')?.percent || 0;

  const isTimeUp = (poll.time_limit || 0) > 0 && timeLeft <= 0;
  const isLocked = poll.status === 'LOCKED' || (poll.status === 'ACTIVE' && isTimeUp);
  const isRevealed = poll.status === 'REVEALED';

  const sourceConfig = poll.source_type ? SOURCE_BADGE_STYLE[poll.source_type] : SOURCE_BADGE_STYLE.HOST;
  const SourceIcon = sourceConfig.icon;

  return (
    <div
      id="emergency-poll-projector-stage"
      className="w-full max-w-[96vw] xl:max-w-7xl mx-auto space-y-3 sm:space-y-4 animate-fadeIn py-1 sm:py-2 px-2 sm:px-4"
    >
      {/* Compact Cinematic Banner */}
      <div className="fluent-box border border-rose-500/40 rounded-[2px] p-3.5 sm:p-4 shadow-xl text-white flex items-center justify-between relative overflow-hidden flex-wrap gap-3 fluent-acrylic-surface">
        <div className="flex items-center gap-3 relative z-10">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-[2px] bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shadow-inner animate-pulse shrink-0">
            <AlertOctagon className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-[2px] bg-rose-900/60 text-[10px] sm:text-xs font-mono font-black uppercase tracking-widest border border-rose-500/40 text-rose-200">
                🔴 KHẢO SÁT TỨC THÌ TRỰC TIẾP
              </span>
              <span className="text-xs sm:text-sm font-bold text-rose-200/80 hidden sm:inline">
                Live Audience Sentiment
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-white mt-0.5">
              Ý KIẾN KHÁN PHÒNG
            </h2>
          </div>
        </div>

        {/* Countdown Timer Badge */}
        {poll.time_limit > 0 && poll.status === 'ACTIVE' && !isTimeUp && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-[2px] fluent-box-nested border border-amber-400 font-mono font-black text-xl sm:text-2xl shadow-lg">
            <Clock className="w-6 h-6 text-amber-400 animate-spin" />
            <span className={timeLeft <= 5 ? 'text-rose-400 animate-pulse text-2xl sm:text-3xl' : 'text-white'}>
              {timeLeft}s
            </span>
          </div>
        )}

        {isLocked && !isRevealed && (
          <div className="px-4 py-2 rounded-[2px] bg-amber-950/60 border border-amber-400 text-amber-200 font-mono font-black text-sm sm:text-base flex items-center gap-2">
            <Lock className="w-5 h-5" />
            {isTimeUp ? 'HẾT GIỜ (ĐÃ KHÓA BÌNH CHỌN)' : 'ĐÃ KHÓA BÌNH CHỌN'}
          </div>
        )}

        {isRevealed && (
          <div className="px-4 py-2 rounded-[2px] bg-emerald-950/60 border border-emerald-400 text-emerald-200 font-mono font-black text-sm sm:text-base flex items-center gap-2">
            <Sparkles className="w-5 h-5" />
            KẾT QUẢ CUỐI CÙNG
          </div>
        )}
      </div>

      {/* Main Widescreen Stage Card (2-Column Split: Question Left, Options Right) */}
      <div className="fluent-question-box p-4 sm:p-6 lg:p-7 shadow-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 lg:gap-8 items-stretch">
          
          {/* LEFT COLUMN: Question, Context & Live Status */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4 fluent-box-nested rounded-[2px] p-4 sm:p-5 shadow-inner">
            <div className="space-y-3">
              {/* Source & Live Votes Badge */}
              <div className="flex items-center justify-between text-xs font-mono uppercase tracking-widest text-rose-300 font-bold flex-wrap gap-2">
                <span className={`px-2.5 py-1 rounded-[2px] text-xs font-bold border flex items-center gap-1.5 shadow ${sourceConfig.badgeBg} ${sourceConfig.border} ${sourceConfig.text}`}>
                  <SourceIcon className="w-3.5 h-3.5" />
                  <span>{poll.source_name || sourceConfig.label}</span>
                </span>

                <span className="flex items-center gap-1.5 text-[#F7CAC9] font-bold">
                  <Users className="w-3.5 h-3.5" />
                  {totalVotes} / {activeCount} Khán giả
                </span>
              </div>

              {poll.context_note && (
                <div className="px-2.5 py-1 rounded-[2px] bg-white/10 border border-white/10 text-xs text-purple-200/90 italic">
                  💬 {poll.context_note}
                </div>
              )}

              {/* Question Headline */}
              <div className="pt-1 space-y-1.5">
                <span className="text-xs sm:text-sm font-mono font-bold text-white/50 uppercase tracking-widest block">
                  CÂU HỎI KHẢO SÁT
                </span>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-black text-white leading-snug tracking-tight">
                  "{poll.question}"
                </h1>
              </div>
            </div>

            {/* Status / Dominant Winner Box */}
            {isRevealed && dominantOption ? (
              <div className="p-3 sm:p-3.5 rounded-[2px] fluent-box border border-purple-400/50 space-y-1 animate-fadeIn shadow-lg">
                <div className="text-[10px] font-mono uppercase tracking-widest text-purple-200 font-bold flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>KẾT QUẢ DẪN ĐẦU</span>
                </div>
                <div className="text-sm sm:text-base lg:text-lg font-black text-white leading-tight">
                  {isDominantTie ? (
                    <span className="text-amber-300">KẾT QUẢ CÂN BẰNG GIỮA CÁC ĐÁP ÁN!</span>
                  ) : (
                    <span style={{ color: dominantOption.color }}>
                      ĐÁP ÁN {dominantOption.key}: "{dominantOption.text}" ({dominantOption.percent}%)
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-3 sm:p-3.5 rounded-[2px] fluent-box border border-white/10 flex items-center justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono uppercase text-white/50 font-bold block">
                    TRẠNG THÁI BÌNH CHỌN
                  </span>
                  <p className="text-xs sm:text-sm font-bold text-amber-300 mt-0.5">
                    {poll.status === 'ACTIVE'
                      ? '🟢 Đang nhận bình chọn từ khán phòng...'
                      : '🔒 Đã khóa bình chọn (Chờ công bố)'}
                  </p>
                </div>
                <div className="w-3 h-3 rounded-full bg-emerald-400 animate-ping shrink-0" />
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Flexible Option Boxes */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <div className={`grid gap-2.5 sm:gap-3.5 ${
              stats.length <= 2
                ? 'grid-cols-1'
                : stats.length <= 4
                ? 'grid-cols-1 sm:grid-cols-2'
                : 'grid-cols-1 sm:grid-cols-2'
            }`}>
              {stats.map((item) => {
                const isCorrect = poll.correct_option === item.key;

                return (
                  <div
                    key={item.key}
                    className={`p-3.5 sm:p-4 rounded-[2px] border flex flex-col justify-between space-y-2.5 shadow-xl transition-all relative overflow-hidden ${
                      isCorrect && isRevealed
                        ? 'bg-emerald-950/40 border-emerald-400 ring-2 ring-emerald-400'
                        : 'fluent-box-nested border-white/15 hover:border-white/30'
                    }`}
                  >
                    {/* Badge + Option Text + Vote count */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 sm:gap-4 min-w-0">
                        <span
                          className="w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16 rounded-[2px] font-mono font-black text-2xl sm:text-3xl lg:text-4xl flex items-center justify-center shadow shrink-0 mt-0.5"
                          style={{
                            backgroundColor: `${item.color}25`,
                            color: item.color,
                            border: `2px solid ${item.color}60`
                          }}
                        >
                          {item.key}
                        </span>
                        <div className="min-w-0 mt-1 sm:mt-2">
                          <p className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-black text-white leading-snug break-words">
                            {item.text}
                          </p>
                          {isCorrect && isRevealed && (
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-[2px] bg-emerald-500 text-white font-mono font-bold text-[10px]">
                              ✓ ĐÁP ÁN ĐÚNG
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Vote Count & Percent */}
                      <div className="text-right shrink-0">
                        <span className="text-lg sm:text-2xl font-black font-mono block leading-none" style={{ color: item.color }}>
                          {item.count}
                        </span>
                        <span className="text-[10px] font-medium text-white/60 block">Phiếu</span>
                        {isRevealed && (
                          <span className="text-[11px] font-mono font-bold text-white/90 bg-black/60 px-2 py-0.5 rounded-[2px] border border-white/10 mt-1 inline-block">
                            {item.percent}%
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Dynamic Bar Track */}
                    <div className="space-y-1 pt-0.5">
                      <div className="h-3 bg-black/60 rounded-[2px] overflow-hidden p-0.5 border border-white/10 relative">
                        <div
                          className="h-full rounded-[2px] transition-all duration-700 shadow-md relative"
                          style={{
                            width: `${Math.max(item.percent, 3)}%`,
                            backgroundColor: item.color
                          }}
                        >
                          <div className="absolute inset-y-0 right-0 w-2 bg-white/40 rounded-r-[2px]" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
