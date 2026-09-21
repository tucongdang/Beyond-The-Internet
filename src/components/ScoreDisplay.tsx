import React, { useMemo, useState, useEffect, useRef } from 'react';
import { ScoreBreakdown, GameState, UserInfo, UserResponse } from '../types';
import { Trophy, Zap, Shield, Target, Flame, Star, ChevronDown, ChevronUp, Contrast, Sun, SunMedium, Smartphone, History, Maximize, Minimize, Sparkles } from 'lucide-react';
import { computeAudienceScoreFromResponses, getAudienceTotalScore, getAudienceScoreBreakdown } from '../services/audienceScoringService';
import { t } from '../utils/i18n';
import { calculateLeaderboard, calculateSurvivalStats } from '../utils/leaderboardUtils';
import { vibrateTap } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';
import { BatteryIndicator } from './BatteryIndicator';
import { useLanguage } from '../hooks/useLanguage';
import { getSecureRandomInt } from '../utils/cryptoUtils';

interface ScoreDisplayProps {
  user: UserInfo | null;
  allResponses: Record<string, Record<string, UserResponse>>;
  gameState: GameState;
  className?: string;
  isHighContrast?: boolean;
  onToggleHighContrast?: () => void;
  isWakeLockLocked?: boolean;
  isWakeLockSupported?: boolean;
  onToggleWakeLock?: () => void;
  onOpenLogModal?: () => void;
  onOpenPostMatchModal?: () => void;
}

const getRoundDetails = (lang: 'vi' | 'en') => [
  {
    key: 'round1' as const,
    name: t("view_score_start", lang),
    shortName: 'R1',
    description: t("view_score_start_desc", lang),
    icon: Zap,
    colorClass: 'from-[#E39A96]/20 to-[#F7CAC9]/20 text-[#FCEEEC] border-[#F7CAC9]/30'
  },
  {
    key: 'round2' as const,
    name: lang !== 'vi' ? 'Obstacle' : 'VCNV',
    shortName: 'R2',
    description: t("view_score_obs_desc", lang),
    icon: Shield,
    colorClass: 'from-amber-500/20 to-orange-500/20 text-amber-300 border-amber-500/30'
  },
  {
    key: 'round3' as const,
    name: t("view_score_accel", lang),
    shortName: 'R3',
    description: t("view_score_accel_desc", lang),
    icon: Flame,
    colorClass: 'from-emerald-500/20 to-teal-500/20 text-emerald-300 border-emerald-500/30'
  },
  {
    key: 'round4' as const,
    name: t("view_score_finish", lang),
    shortName: 'R4',
    description: t("view_score_finish_desc", lang),
    icon: Target,
    colorClass: 'from-purple-500/20 to-pink-500/20 text-purple-300 border-purple-500/30'
  }
];

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  user,
  allResponses,
  gameState,
  className = '',
  isHighContrast = false,
  onToggleHighContrast,
  isWakeLockLocked = false,
  isWakeLockSupported = true,
  onToggleWakeLock,
  onOpenLogModal,
  onOpenPostMatchModal
}) => {
  const { localLanguage } = useLanguage();
  const ROUND_DETAILS = getRoundDetails(localLanguage);

  const [isExpanded, setIsExpanded] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(Boolean(document.fullscreenElement));
  
  const prevScoreRef = useRef(0);
  const [displayScore, setDisplayScore] = useState(0);
  const [popups, setPopups] = useState<{ id: number, diff: number }[]>([]);


  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleToggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundFx.playClick();
    vibrateTap();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  const stats = useMemo(() => {
    if (!user?.uid || !allResponses) return null;
    const board = calculateLeaderboard(allResponses, undefined, gameState);
    const myData = board.find(p => p.uid === user.uid || (user.mssv && p.mssv === user.mssv));
    const audienceScoreState = computeAudienceScoreFromResponses(allResponses, user.uid, user.mssv, undefined, gameState);

    return {
      totalScore: getAudienceTotalScore(audienceScoreState),
      scoreBreakdown: getAudienceScoreBreakdown(audienceScoreState),
      rank: myData?.rank || '-',
      accuracyRate: myData?.accuracyRate || 0,
      correctCount: audienceScoreState.correctAnswersCount,
      totalAnswered: audienceScoreState.totalAnswered,
      totalPlayers: board.length
    };
  }, [allResponses, user, gameState]);

  const survivalStats = useMemo(() => {
    return calculateSurvivalStats(allResponses, undefined, gameState, user?.uid, user?.mssv);
  }, [allResponses, gameState, user]);



  useEffect(() => {
    if (stats && stats.totalScore !== prevScoreRef.current) {
      // First load behavior: jump straight to score if prevScore is 0 and we haven't rendered yet
      // Actually counting up from 0 on first load is a fun effect!
      
      const endScore = stats.totalScore;
      
      if (endScore > prevScoreRef.current && prevScoreRef.current > 0) {
         const diff = endScore - prevScoreRef.current;
         const id = Date.now() + getSecureRandomInt(1, 1000000);
         setPopups(prev => [...prev, { id, diff }]);
         setTimeout(() => {
            setPopups(prev => prev.filter(p => p.id !== id));
         }, 1500);
      }
      
      const start = prevScoreRef.current;
      const end = endScore;
      const duration = 1000;
      const startTime = performance.now();
      
      const updateCounter = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        if (elapsed < duration) {
           const progress = elapsed / duration;
           const easeOut = 1 - Math.pow(1 - progress, 3);
           setDisplayScore(Math.round(start + (end - start) * easeOut));
           requestAnimationFrame(updateCounter);
        } else {
           setDisplayScore(end);
        }
      };
      requestAnimationFrame(updateCounter);
      
      prevScoreRef.current = endScore;
    }
  }, [stats?.totalScore]);

  if (!stats) return null;


  return (
    <div id="bti-score-display" className={`fluent-box border-b border-white/10 text-white sticky top-0 z-40 shadow-xl max-w-full overflow-x-hidden ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5">
        <div 
          className="flex items-center justify-between cursor-pointer select-none active:opacity-80"
          onClick={() => {
            soundFx.playClick();
            vibrateTap();
            setIsExpanded(!isExpanded);
          }}
        >
          <div className="relative group flex items-center gap-3">
            <div className="w-10 h-10 rounded-[2px] fluent-acrylic-surface border border-amber-500/40 text-amber-300 flex items-center justify-center font-bold shadow-lg">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-amber-400 font-bold block">{t("view_score_total", localLanguage)}</span>
              <div className="flex items-baseline gap-1.5 relative">
                <span className="text-xl sm:text-2xl font-black font-mono text-white tracking-tight leading-none relative">
                  {displayScore.toLocaleString('vi-VN')}
                  {popups.map(p => (
                    <span 
                      key={p.id} 
                      className="absolute left-full ml-2 bottom-full text-base sm:text-xl font-black font-mono text-yellow-200 animate-float-fade pointer-events-none drop-shadow-lg z-50 whitespace-nowrap"
                    >
                      +{p.diff}
                    </span>
                  ))}
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-300 uppercase">{t("score_score", localLanguage)}</span>
              </div>
            </div>

            {/* Hover Tooltip / Popover */}
            <div className="absolute top-full left-0 mt-3 w-52 fluent-box-nested border border-white/10 rounded-[2px] shadow-2xl p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 pointer-events-none origin-top">
              <div className="space-y-1.5">
                <div className="text-[9px] text-slate-400 font-mono uppercase tracking-wider border-b border-white/10 pb-1.5 mb-2">{t("view_score_per_round", localLanguage)}</div>
                {ROUND_DETAILS.map(round => {
                  const Icon = round.icon;
                  return (
                    <div key={round.key} className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-white/70">
                        <Icon className="w-3 h-3 opacity-70" />
                        <span>{round.shortName}</span>
                      </div>
                      <span className="text-white font-bold">+{stats.scoreBreakdown[round.key] || 0}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {isWakeLockSupported !== false && onToggleWakeLock && (
              <button
                type="button"
                id="btn-audience-wake-lock-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playClick();
                  vibrateTap();
                  onToggleWakeLock();
                }}
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[2px] border text-xs font-mono font-bold transition hover-effect ${
                  isWakeLockLocked
                    ? 'fluent-box-nested text-amber-300 border-amber-500/50 shadow-inner'
                    : 'fluent-box-nested hover:bg-white/15 text-slate-400 hover:text-white border-white/10'
                }`}
                title={isWakeLockLocked ? (t("view_score_wake_on", localLanguage)) : (t("view_score_wake_off", localLanguage))}
              >
                {isWakeLockLocked ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                ) : (
                  <SunMedium className="w-3.5 h-3.5 text-slate-400 shrink-0 opacity-60" />
                )}
                <span className="hidden sm:inline text-[11px]">
                  {isWakeLockLocked ? (t("view_score_always_on", localLanguage)) : (t("view_score_auto_off", localLanguage))}
                </span>
                <span className={`w-1.5 h-1.5 rounded-full ${isWakeLockLocked ? 'bg-amber-400 animate-pulse' : 'bg-slate-600'}`} />
              </button>
            )}

            {onToggleHighContrast && (
              <button
                type="button"
                id="btn-audience-high-contrast-toggle"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playClick();
                  vibrateTap();
                  onToggleHighContrast();
                }}
                className={`flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-[2px] border text-xs font-mono font-bold transition hover-effect ${
                  isHighContrast
                    ? 'bg-amber-400 text-black border-amber-300 shadow-lg'
                    : 'fluent-box-nested hover:bg-white/15 text-white/80 hover:text-white border-white/20'
                }`}
                title={isHighContrast ? (t("view_score_dark_on", localLanguage)) : (t("view_score_dark_off", localLanguage))}
              >
                <Contrast className={`w-3.5 h-3.5 ${isHighContrast ? 'text-black' : 'text-amber-300'}`} />
                <span className="hidden sm:inline text-[11px]">
                  {t("view_score_dark", localLanguage)}
                </span>
              </button>
            )}

            {onOpenLogModal && (
              <button
                type="button"
                id="btn-audience-open-log-modal"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playClick();
                  vibrateTap();
                  onOpenLogModal();
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[2px] border text-xs font-mono font-bold bg-[#F7CAC9]/15 hover:bg-[#F7CAC9]/30 text-[#F7CAC9] border-[#F7CAC9]/40 shadow-sm transition hover-effect"
                title={t("view_score_log_title", localLanguage)}
              >
                <History className="w-3.5 h-3.5 text-[#F7CAC9]" />
                <span className="hidden min-[380px]:inline text-[11px]">Logs</span>
              </button>
            )}

            {onOpenPostMatchModal && (
              <button
                type="button"
                id="btn-audience-open-postmatch-modal"
                onClick={(e) => {
                  e.stopPropagation();
                  soundFx.playClick();
                  vibrateTap();
                  onOpenPostMatchModal();
                }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-[2px] border text-xs font-mono font-bold bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-[#FCEEEC] border-purple-400/40 shadow-sm transition hover-effect cursor-pointer"
                title="Xuất thẻ thành tích Infographic (Post-Match Card)"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden min-[380px]:inline text-[11px]">Thẻ</span>
              </button>
            )}

            {/* Desktop Fullscreen Button */}
            <button
              type="button"
              id="btn-audience-fullscreen-toggle"
              onClick={handleToggleFullscreen}
              className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-[2px] border text-xs font-mono font-bold transition hover-effect ${
                isFullscreen
                  ? 'fluent-box-nested text-indigo-200 border-indigo-400'
                  : 'fluent-box-nested hover:bg-white/15 text-slate-300 hover:text-white border-white/10'
              }`}
              title={isFullscreen ? (t("view_score_full_exit", localLanguage)) : (t("view_score_full_enter", localLanguage))}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              ) : (
                <Maximize className="w-3.5 h-3.5 text-indigo-300 shrink-0" />
              )}
              <span className="text-[11px]">{isFullscreen ? (t("view_score_full_exit_short", localLanguage)) : (t("view_score_full_enter_short", localLanguage))}</span>
            </button>

            {/* Battle Royale Survival Status Pill */}
            {survivalStats.totalContestants > 0 && (
              <div 
                className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-[2px] fluent-box-nested border border-purple-500/40 text-purple-200 text-xs font-mono font-bold"
                title={`Đấu trường sinh tử: ${survivalStats.survivorsCount}/${survivalStats.totalContestants} bất bại (${survivalStats.survivalRate}%)`}
              >
                <Shield className={`w-3.5 h-3.5 ${survivalStats.isUserAlive ? 'text-emerald-400' : 'text-slate-400'}`} />
                <span className="text-[11px] uppercase">
                  {survivalStats.isUserAlive ? 'Bất Bại' : 'Đã Hạ'} ({survivalStats.survivorsCount})
                </span>
              </div>
            )}

            <div className="hidden sm:flex px-3 py-1.5 rounded-[2px] fluent-box-nested border border-purple-500/40 text-purple-200 text-xs font-mono font-bold items-center gap-1.5">
              <Star className="w-3.5 h-3.5 text-purple-400 fill-purple-400/50" />
              <span>{t("score_rank", localLanguage).toUpperCase()} #{stats.rank}</span>
            </div>
            <div className="px-2 py-1.5 rounded-[2px] fluent-box-nested hover:bg-white/15 transition flex items-center hover-effect">
              {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </div>
          </div>
        </div>

        {/* Collapsible Breakdown */}
        {isExpanded && (
          <div className="mt-4 pt-3 border-t border-white/10 animate-fadeIn">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">{t("view_score_details", localLanguage)}</span>
              <div className="flex gap-2">
                <span className="text-[10px] px-2 py-1 fluent-box-nested rounded-[2px] font-mono">{t("score_rank", localLanguage)}: #{stats.rank}/{stats.totalPlayers}</span>
                <span className="text-[10px] px-2 py-1 fluent-box-nested text-emerald-300 rounded-[2px] font-mono">{stats.accuracyRate}% {t("score_accuracy", localLanguage)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ROUND_DETAILS.map(round => {
                const Icon = round.icon;
                const pts = stats.scoreBreakdown[round.key] || 0;

                return (
                  <div
                    key={round.key}
                    className={`p-2.5 rounded-[2px] bg-gradient-to-br border flex flex-col justify-between space-y-1.5 ${round.colorClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Icon className="w-3 h-3" />
                        <span className="text-[10px] font-bold font-mono uppercase truncate">{round.name}</span>
                      </div>
                    </div>
                    <div className="flex items-baseline gap-0.5">
                      <span className="text-base font-black font-mono tracking-tight text-white">
                        +{pts}
                      </span>
                    </div>
                    <p className="text-[9px] text-white/50 leading-tight">
                      {round.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Detailed Battery Status in Expanded Drawer */}
            <BatteryIndicator showDetails={true} className="mt-3" />
          </div>
        )}
      </div>
    </div>
  );
};

export default ScoreDisplay;
