import React, { useState, useEffect, useRef } from 'react';
import { t } from '../utils/i18n';
import { useLanguage } from '../hooks/useLanguage';
import {
  AlertOctagon,
  CheckCircle2,
  Clock,
  Lock,
  Sparkles,
  Users,
  Zap,
  Flame,
  ThumbsUp,
  ThumbsDown,
  BarChart3,
  Award,
  GraduationCap,
  Radio,
  UserCheck
} from 'lucide-react';
import confetti from '../utils/confetti';
import { GameState, UserInfo, UserResponse, EmergencyPollSourceType } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import {
  vibrateSubmit,
  vibrateSuccess,
  vibrateTap,
  vibrateEmergencyAlert,
  vibrateRoundEnd,
  vibrateCountdownCritical,
  vibrateCorrect
} from '../utils/hapticUtils';
import { interpolateTimerColor } from '../utils/colorUtils';
import { useNetworkStatus } from '../hooks/useNetworkStatus';


interface EmergencyPollAudienceProps {
  gameState: GameState;
  user: UserInfo | null;
  allResponses?: Record<string, Record<string, UserResponse>>;
  onOpenRegister: () => void;
}

const SOURCE_BADGE_STYLE: Record<
  EmergencyPollSourceType,
  { label: string; icon: React.ComponentType<{ className?: string }>; badgeBg: string; border: string; text: string }
> = {
  ADVISOR: {
    label: "view_poll_expert",
    icon: GraduationCap,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-sky-500/40',
    text: 'text-sky-300'
  },
  CONTESTANT: {
    label: "view_poll_contestant",
    icon: Flame,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-amber-500/40',
    text: 'text-amber-300'
  },
  JURY: {
    label: "view_poll_judge",
    icon: Award,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-purple-500/40',
    text: 'text-purple-300'
  },
  AUDIENCE: {
    label: "view_poll_audience",
    icon: Users,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-emerald-500/40',
    text: 'text-emerald-300'
  },
  HOST: {
    label: "view_poll_mc",
    icon: Radio,
    badgeBg: 'bg-white/10 backdrop-blur-md',
    border: 'border-rose-500/40',
    text: 'text-rose-300'
  }
};

export const EmergencyPollAudience: React.FC<EmergencyPollAudienceProps> = ({
  gameState,
  user,
  allResponses,
  onOpenRegister
}) => {
  const { localLanguage } = useLanguage();

  const poll = gameState.emergency_poll;

  const pollResponses: Record<string, UserResponse> = poll?.id
    ? (allResponses?.[`EMERGENCY_POLL_${poll.id}`] as Record<string, UserResponse>) || {}
    : {};
  const userVote = user?.uid ? pollResponses[user.uid] : undefined;

  const [selectedChoice, setSelectedChoice] = useState<string>(userVote?.choice || '');
  const [submitToast, setSubmitToast] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(poll?.time_limit || 0);
  const networkStatus = useNetworkStatus();
  const pollStats = React.useMemo(() => {
    if (!pollResponses || !poll?.options) return { total: 0, percentages: {} };
    const total = Object.keys(pollResponses).length;
    const counts: Record<string, number> = {};
    Object.values(pollResponses).forEach(r => {
      const val = r.choice?.trim();
      if (val) counts[val] = (counts[val] || 0) + 1;
    });
    const percentages: Record<string, number> = {};
    Object.keys(poll.options || {}).forEach(key => {
      percentages[key] = total > 0 ? Math.round(((counts[key] || 0) / total) * 100) : 0;
    });
    return { total, percentages };
  }, [pollResponses, poll?.options]);

  const [hasConfettiTriggered, setHasConfettiTriggered] = useState(false);
  const prevPollIdRef = useRef<string>(poll?.id || '');
  const hasPlayedTimeUpSoundRef = useRef<boolean>(false);

  // Reset or restore vote on poll ID change
  useEffect(() => {
    if (!poll || poll.status === 'DISMISSED') return;
    if (poll.id !== prevPollIdRef.current) {
      prevPollIdRef.current = poll.id;
      setSelectedChoice(userVote?.choice || '');
      setHasConfettiTriggered(false);
      hasPlayedTimeUpSoundRef.current = false;
      
      // Play a subtle chime and distinct alert haptic to notify audience of a new poll
      soundFx.playNotification();
      vibrateEmergencyAlert();
    } else if (userVote?.choice) {
      setSelectedChoice(userVote.choice);
    }
  }, [poll?.id, poll?.status, userVote]);

  // Timer countdown & Auto-close on zero
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

    const initialRemaining = computeTime();
    setTimeLeft(initialRemaining);

    let lastTickTime = 0;
    const interval = setInterval(() => {
      const remaining = computeTime();
      setTimeLeft(remaining);

      if (remaining <= 5 && remaining > 0 && Date.now() - lastTickTime >= 950) {
        lastTickTime = Date.now();
        soundFx.playTick();
        if (remaining <= 3) {
          vibrateCountdownCritical();
        }
      } else if (remaining === 0 && !hasPlayedTimeUpSoundRef.current) {
        hasPlayedTimeUpSoundRef.current = true;
        soundFx.playLock();
        vibrateRoundEnd();
      }
    }, 250);

    return () => clearInterval(interval);
  }, [poll?.status, poll?.server_start_time, poll?.time_limit]);

  // Trigger celebration confetti and correct haptic on reveal
  useEffect(() => {
    if (poll?.status === 'REVEALED' && !hasConfettiTriggered) {
      setHasConfettiTriggered(true);
      vibrateCorrect();
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.6 }
        });
      } catch {}
    }
  }, [poll?.status, hasConfettiTriggered]);

  if (!poll || poll.status === 'DISMISSED') return null;

  // Compute countdown expiry
  const isTimeUp = (poll.time_limit || 0) > 0 && timeLeft <= 0;
  const isVotingActive = poll.status === 'ACTIVE' && !isTimeUp;
  const isLocked = poll.status === 'LOCKED' || (poll.status === 'ACTIVE' && isTimeUp);
  const isRevealed = poll.status === 'REVEALED';

  const handleVote = async (choice: string) => {
    if (!isVotingActive) return;
    if (!user) {
      onOpenRegister();
      return;
    }

    vibrateSubmit();
    soundFx.playClick();
    setSelectedChoice(choice);
    setSubmitToast(true);
    setTimeout(() => setSubmitToast(false), 2500);

    const latencySec = poll.server_start_time
      ? Number(((syncService.getSynchronizedNow() - poll.server_start_time) / 1000).toFixed(2))
      : 0;

    await syncService.submitResponse(`EMERGENCY_POLL_${poll.id}`, user.uid, {
      choice,
      timestamp: syncService.getSynchronizedNow(),
      latency_sec: latencySec,
      user_info: {
        name: user.name,
        mssv: user.mssv,
        uid: user.uid
      }
    });
  };

  // Compute votes stats
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

  const sourceConfig = poll.source_type ? SOURCE_BADGE_STYLE[poll.source_type] : SOURCE_BADGE_STYLE.HOST;
  const SourceIcon = sourceConfig.icon;

  return (
    <div
      id="emergency-poll-audience-screen"
      className="w-full max-w-2xl mx-auto space-y-4 animate-fadeIn"
    >
      {/* Emergency Live Banner */}
      <div className="fluent-box border border-rose-500/40 rounded-[2px] p-4 sm:p-5 shadow-2xl text-white relative overflow-hidden fluent-acrylic-surface">
        <div className="flex items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[2px] bg-rose-500/20 border border-rose-400/40 text-rose-300 flex items-center justify-center shadow-inner animate-pulse">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono font-black uppercase tracking-widest bg-rose-900/60 px-2 py-0.5 rounded-[2px] border border-rose-500/40 text-rose-200">
                  {localLanguage !== 'vi' ? '🔴 INSTANT POLL' : '🔴 KHẢO SÁT TỨC THÌ'}
                </span>
                <span className="text-xs font-bold text-rose-200/80 hidden sm:inline">
                  {t("view_poll_live", localLanguage)}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-extrabold text-white mt-0.5 tracking-tight">
                Live Emergency Poll
              </h2>
            </div>
          </div>

          {/* Countdown timer pill if active */}
          {poll.time_limit > 0 && poll.status === 'ACTIVE' && !isTimeUp && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] fluent-box-nested border border-white/20 font-mono font-black text-sm">
              <Clock className="w-4 h-4 text-amber-300 animate-spin" />
              <span className={timeLeft <= 5 ? 'text-rose-300 animate-pulse text-base' : 'text-white'}>
                {timeLeft}s
              </span>
            </div>
          )}

          {isLocked && !isRevealed && (
            <span className="px-2.5 py-1 rounded-[2px] bg-amber-950/60 border border-amber-500/40 text-amber-200 text-xs font-mono font-bold flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              {isTimeUp ? t("view_poll_timeout_locked", localLanguage) : t("view_poll_locked", localLanguage)}
            </span>
          )}

          {isRevealed && (
            <span className="px-2.5 py-1 rounded-[2px] bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 text-xs font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {localLanguage !== 'vi' ? 'RESULT' : 'KẾT QUẢ'}
            </span>
          )}
        </div>
      </div>

      {/* Main Question Card */}
      <div className="fluent-question-box p-5 sm:p-6 shadow-2xl space-y-5">
        {/* Time Up Alert Banner (when countdown expires) */}
        {isTimeUp && !isRevealed && (
          <div className="p-3.5 rounded-[2px] bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-center gap-2.5 text-xs font-mono font-bold animate-fadeIn">
            <Lock className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{t("view_poll_timeout_msg", localLanguage)}</span>
          </div>
        )}

        {/* Source Badge & Total Votes Header */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-[2px] text-xs font-bold border flex items-center gap-1.5 shadow-sm ${sourceConfig.badgeBg} ${sourceConfig.border} ${sourceConfig.text}`}>
                <SourceIcon className="w-3.5 h-3.5" />
                <span>{poll.source_name || sourceConfig.label}</span>
              </span>
              {poll.context_note && (
                <span className="text-[11px] text-white/50 italic hidden sm:inline">
                  • {poll.context_note}
                </span>
              )}
            </div>

            <span className="text-white/50 text-xs font-mono flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-[#F7CAC9]" />
              {totalVotes} {t("view_poll_voted_count", localLanguage)}
            </span>
          </div>

          <h3 className="text-lg sm:text-xl md:text-2xl font-black text-white leading-snug tracking-tight">
            "{poll.question}"
          </h3>
        </div>

        {/* Voting Touch Cards (Dynamic Multiple-Choice Options) */}
        <div className={`grid gap-3 pt-2 ${optionEntries.length <= 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-2'}`}>
          {stats.map((item) => {
            const isSelected = selectedChoice === item.key;
            const hasSelected = Boolean(selectedChoice);
            const serverCorrectKey = poll.correct_option;
            const isCorrect = poll.correct_option === item.key;
            const isCorrectAnswer = serverCorrectKey && item.key === serverCorrectKey;
            const isUserIncorrect = hasSelected && isSelected && serverCorrectKey && item.key !== serverCorrectKey;
            const pct = (timeLeft <= 0 || !isVotingActive) ? (pollStats.percentages[item.key] || 0) : null;

            return (
              <button
                key={item.key}
                type="button"
                disabled={!isVotingActive}
                onClick={() => handleVote(item.key)}
                className={`p-4 sm:p-5 rounded-[2px] border text-left transition-all duration-300 relative overflow-hidden flex flex-col justify-between group active:scale-95 disabled:cursor-not-allowed cursor-pointer ${
                  isCorrectAnswer && hasSelected
                    ? 'fluent-option-btn !border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] !bg-emerald-500/20 z-10 scale-[1.02] animate-pulse'
                  : isUserIncorrect
                    ? 'fluent-option-btn !border-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.4)] !bg-rose-500/20 z-10 scale-[1.02]'
                  : isSelected
                    ? 'fluent-option-btn selected animate-pulse scale-[1.02] z-10'
                  : !isVotingActive
                    ? 'fluent-box-nested opacity-60'
                  : hasSelected
                    ? 'fluent-option-btn opacity-40 hover:opacity-70 scale-95'
                  : 'fluent-option-btn'
                }`}
                style={{
                  backgroundColor: isSelected ? `${item.color}35` : undefined,
                  borderColor: isSelected ? item.color : undefined,
                  boxShadow: isSelected ? `0 0 25px ${item.color}80, inset 0 0 15px ${item.color}40` : undefined,
                  outlineColor: isSelected ? item.color : undefined
                }}
              >
                {/* Percentage Overlay when time is up */}
                {pct !== null && (
                  <div className="absolute top-0 bottom-0 left-0 z-0 transition-all duration-1000 ease-out opacity-20" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                )}
                
                {/* Checkmark indicator for selected (Top Right of Button) */}
                {isSelected && (
                  <div className="absolute top-3 right-3 z-20 drop-shadow-md animate-fadeIn" style={{ color: item.color }}>
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                )}
                
                {/* Subdued Progress Bar at the top of the button */}
                {poll.time_limit > 0 && poll.status === 'ACTIVE' && (
                  <div className="absolute top-0 left-0 right-0 h-1 bg-black/20 z-0">
                    <div 
                      className="h-full"
                      style={{ 
                        width: `${Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)}%`, 
                        backgroundColor: interpolateTimerColor(Math.max(0, (timeLeft / (poll.time_limit || 1)) * 100)),
                        transition: 'width 1s linear, background-color 1s linear' 
                      }}
                    />
                  </div>
                )}

                {/* Glowing Aura Overlay when selected */}
                {isSelected && (
                  <div
                    className="absolute inset-0 pointer-events-none rounded-[2px] animate-pulse opacity-40"
                    style={{
                      background: `radial-gradient(circle at 50% 50%, ${item.color} 0%, transparent 80%)`
                    }}
                  />
                )}

                <div className="flex items-center justify-between relative z-10">
                  <div
                    className={`w-9 h-9 rounded-[2px] font-mono font-black flex items-center justify-center text-base transition-all ${
                      isSelected ? 'scale-110 text-white shadow-lg' : 'shadow-inner'
                    }`}
                    style={{
                      backgroundColor: isSelected ? item.color : `${item.color}30`,
                      color: isSelected ? '#ffffff' : item.color,
                      border: `2px solid ${item.color}`,
                      boxShadow: isSelected ? `0 0 14px ${item.color}` : undefined
                    }}
                  >
                    {item.key}
                  </div>

                  {isSelected && (
                    <span
                      className="px-2.5 py-1 rounded-[2px] text-white font-mono font-black text-[11px] flex items-center gap-1.5 shadow-lg animate-pulse"
                      style={{
                        backgroundColor: item.color,
                        boxShadow: `0 0 14px ${item.color}`
                      }}
                    >
                      <CheckCircle2 className="w-4 h-4 text-white animate-bounce" />
                      <span>{t("view_poll_you_voted", localLanguage)}</span>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                    </span>
                  )}
                  {isRevealed && isCorrect && !isSelected && (
                    <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500 text-white font-mono font-bold text-[10px]">
                      {t("view_poll_correct_ans", localLanguage)}
                    </span>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between relative z-10">
                  <span className={`text-base sm:text-lg font-black leading-snug ${isSelected ? 'text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.9)]' : 'text-white/90 group-hover:text-white'}`}>
                    {item.text}
                  </span>
                  {isSelected && (
                    <div
                      className="w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 ml-2 shadow-md animate-pulse"
                      style={{ backgroundColor: item.color, boxShadow: `0 0 12px ${item.color}` }}
                    >
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                  )}
                </div>

                {/* Revealed Percentage Bar */}
                {isRevealed && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-1 relative z-10">
                    <div className="flex justify-between text-xs font-mono font-bold">
                      <span style={{ color: item.color }}>{item.count} {localLanguage !== 'vi' ? "votes" : "phiếu"}</span>
                      <span className="font-black text-sm" style={{ color: item.color }}>{item.percent}%</span>
                    </div>
                    <div className="h-2 bg-white/10 rounded-[2px] overflow-hidden">
                      <div
                        className="h-full rounded-[2px] transition-all duration-700"
                        style={{ width: `${item.percent}%`, backgroundColor: item.color }}
                      />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* User Vote Status Feedback */}
        <div className="p-3 fluent-box-nested border border-white/10 rounded-[2px] flex items-center justify-between text-xs">
          {selectedChoice ? (
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" />
              <span>{t("view_poll_recorded", localLanguage)}</span>
            </div>
          ) : isVotingActive ? (
            <div className="flex items-center gap-2 text-amber-300 font-semibold animate-pulse">
              <Zap className="w-4 h-4 fill-amber-300" />
              <span>{t("view_poll_tap_vote", localLanguage)}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-white/50">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{isTimeUp ? t("view_poll_timeup", localLanguage) : t("view_poll_ended", localLanguage)}</span>
            </div>
          )}

          {userVote?.latency_sec !== undefined && (
            <span className="text-[10px] font-mono text-white/40">
              {t("view_poll_speed", localLanguage)} {userVote.latency_sec}s
            </span>
          )}
        </div>

        {/* Revealed Winner Callout */}
        {isRevealed && dominantOption && (
          <div className="p-4 fluent-box-nested border border-purple-500/40 rounded-[2px] text-center space-y-1 animate-fadeIn">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[#F7CAC9] font-bold flex items-center justify-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              {localLanguage === 'en' ? 'MAJORITY VOTE' : 'ĐA SỐ LỰA CHỌN'}
            </span>
            <p className="text-base sm:text-lg font-black text-white">
              {isDominantTie
                ? (localLanguage === 'en' ? 'Tie between leading options' : 'Cân bằng giữa các phương án dẫn đầu')
                : (localLanguage === 'en'
                    ? `Option ${dominantOption.key}: ${dominantOption.text} (${dominantOption.percent}%)`
                    : `Phương án ${dominantOption.key}: ${dominantOption.text} (${dominantOption.percent}%)`
                  )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
