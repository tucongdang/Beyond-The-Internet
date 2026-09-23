import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GameState, UserResponse, QuestionItem, GrandFinaleWinner } from '../types';
import { calculateLeaderboard, UserScoreSummary, calculateRankChanges, calculateUserTrends } from '../utils/leaderboardUtils';
import { RankMovementIndicator } from './RankMovementIndicator';
import { TrendIndicator } from './TrendIndicator';
import { syncService } from '../services/syncService';
import { exportLeaderboardToCSV } from '../utils/exportUtils';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateSelection, vibrateCopy, vibrateGrandCelebration } from '../utils/hapticUtils';
import { useAutoScroll, AutoScrollSpeed } from '../hooks/useAutoScroll';
import confetti from '../utils/confetti';
import { getUserDisplayUid } from '../utils/uidUtils';
import {
  Trophy,
  Crown,
  Medal,
  Flame,
  Zap,
  Clock,
  CheckCircle2,
  Sparkles,
  Users,
  Award,
  BarChart3,
  RefreshCw,
  Eye,
  Filter,
  X,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  FileSpreadsheet
} from 'lucide-react';

interface LeaderboardProps {
  allResponses?: Record<string, Record<string, UserResponse>>;
  gameState: GameState;
  customQuestionBank?: QuestionItem[];
  activeCount?: number;
  onClose?: () => void;
  isAudienceView?: boolean;
  isStageDisplay?: boolean;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  allResponses = {},
  gameState,
  customQuestionBank,
  activeCount = 0,
  onClose,
  isAudienceView = false,
  isStageDisplay = false
}) => {
  const [localRoundFilter, setLocalRoundFilter] = useState<'ALL' | 'R1' | 'R2' | 'R3' | 'R4'>(
    () => (gameState.leaderboard_round_filter as any) || 'ALL'
  );
  
  // For audience view, allow independent client-side filtering without host override lock.
  // For stage display, follow host gameState strictly.
  // For admin operator, control both local state and sync to host.
  const roundFilter = isAudienceView
    ? localRoundFilter
    : (gameState.leaderboard_round_filter as any) || localRoundFilter;

  const setRoundFilter = (filter: 'ALL' | 'R1' | 'R2' | 'R3' | 'R4') => {
    setLocalRoundFilter(filter);
    if (!isAudienceView && !isStageDisplay) {
      syncService.updateGameState({ leaderboard_round_filter: filter });
    }
  };

  const { localLanguage } = useLanguage();
  const [tabFilter, setTabFilter] = useState<'INDIVIDUAL' | 'TEAM'>(gameState.team_mode_active ? 'TEAM' : 'INDIVIDUAL');

  useEffect(() => {
    if (!gameState.team_mode_active) {
      setTabFilter('INDIVIDUAL');
    } else {
      setTabFilter('TEAM');
    }
  }, [gameState.team_mode_active]);

  const [localViewModeState, setLocalViewModeState] = useState<'PODIUM' | 'LIST'>('PODIUM');
  const activeViewMode = isAudienceView
    ? localViewModeState
    : (gameState.leaderboard_view_mode as 'PODIUM' | 'LIST') || localViewModeState;
  const viewMode = tabFilter === 'TEAM' ? 'LIST' : activeViewMode;
  const setViewMode = (mode: 'PODIUM' | 'LIST') => {
    setLocalViewModeState(mode);
    if (!isAudienceView && !isStageDisplay) {
      syncService.updateGameState({ leaderboard_view_mode: mode });
    }
  };

  const [isLiveAutoRefresh, setIsLiveAutoRefresh] = useState<boolean>(true);

  // Compute aggregated scores

  const teamScores = useMemo(() => {
    if (tabFilter !== 'TEAM') return [];
    const scoresMap = syncService.calculateTeamScores(allResponses, gameState);
    const list = Object.keys(scoresMap).map(teamId => ({
      teamId,
      name: gameState.teams?.find(t => t.id === teamId)?.name || teamId,
      color: gameState.teams?.find(t => t.id === teamId)?.color || '#94a3b8',
      totalScore: scoresMap[teamId].total,
      count: scoresMap[teamId].count,
      average: scoresMap[teamId].average
    }));
    return list.sort((a, b) => b.average - a.average).map((t, idx) => ({ ...t, rank: idx + 1 }));
  }, [allResponses, gameState, tabFilter]);

  const allRankedUsers = useMemo(() => {
    return calculateLeaderboard(allResponses, customQuestionBank, gameState, roundFilter);
  }, [allResponses, customQuestionBank, gameState, roundFilter]);

  // Track rank delta (up/down/same) compared to previous question
  const rankChangesMap = useMemo(() => {
    return calculateRankChanges(
      allResponses,
      allRankedUsers,
      gameState.question_id,
      customQuestionBank,
      gameState,
      roundFilter
    );
  }, [allResponses, allRankedUsers, gameState.question_id, customQuestionBank, gameState, roundFilter]);

  // Track multi-round performance trends (rising, falling, stable, streak)
  const trendsMap = useMemo(() => {
    return calculateUserTrends(
      allResponses,
      allRankedUsers,
      customQuestionBank,
      gameState
    );
  }, [allResponses, allRankedUsers, customQuestionBank, gameState]);

  // Auto-scroll hook for table list view
  const {
    containerRef: listContainerRef,
    isAutoScrolling: isListAutoScrolling,
    toggleAutoScroll: toggleListAutoScroll,
    currentSpeed: listScrollSpeed,
    setCurrentSpeed: setListScrollSpeed,
    isPaused: isListScrollPaused,
    isOverflowing: isListScrollOverflowing,
    scrollProgress: listScrollProgress,
    resetToTop: resetListScrollToTop
  } = useAutoScroll<HTMLDivElement>({
    enabled: true,
    speed: 'normal',
    pauseOnHover: true,
    bottomPauseMs: 3000,
    topPauseMs: 2000,
    dependencies: [allRankedUsers.length, roundFilter, viewMode]
  });

  // Extract Top 5 Scorers
  const top5Scorers = useMemo(() => {
    if (tabFilter === 'TEAM') return teamScores.slice(0, 5) as any[];
    return allRankedUsers.slice(0, 5);
  }, [allRankedUsers]);

  // Extract Top 1, 2, 3 for podium
  const rank1 = top5Scorers[0];
  const rank2 = top5Scorers[1];
  const rank3 = top5Scorers[2];
  const rank4 = top5Scorers[3];
  const rank5 = top5Scorers[4];

  // Total aggregated statistics
  const totalSubmissions = useMemo(() => {
    let count = 0;
    Object.values(allResponses).forEach(qMap => {
      count += Object.keys(qMap || {}).length;
    });
    return count;
  }, [allResponses]);

  // Trigger festive stage confetti and synchronize to projector
  const triggerConfetti = () => {
    try {
      soundFx.playReveal(true);
      vibrateGrandCelebration();
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 }
      });
      setTimeout(() => {
        confetti({
          particleCount: 50,
          angle: 60,
          spread: 55,
          origin: { x: 0 }
        });
        confetti({
          particleCount: 50,
          angle: 120,
          spread: 55,
          origin: { x: 1 }
        });
      }, 250);
    } catch {}

    // Synchronize firework/confetti effect directly to Projector & all connected screens
    const effectTimestamp = Date.now();
    const updatePayload: Partial<GameState> = {
      projector_effect: {
        type: 'CONFETTI',
        timestamp: effectTimestamp
      }
    };
    if (gameState.grand_finale?.active) {
      updatePayload.grand_finale = {
        ...gameState.grand_finale,
        timestamp: effectTimestamp
      };
    }
    syncService.updateGameState(updatePayload);
  };



  // Toggle Grand Finale Honors Ceremony on Projector & Audience Screens
  const handleToggleGrandFinale = () => {
    if (gameState.grand_finale?.active) {
      soundFx.playLock();
      syncService.updateGameState({
        grand_finale: null
      });
      return;
    }

    if (!rank1) {
      triggerConfetti();
      return;
    }

    soundFx.playStartRound();
    vibrateGrandCelebration();

    const winnerData: GrandFinaleWinner = {
      uid: rank1.uid,
      name: rank1.name,
      mssv: rank1.mssv,
      totalScore: rank1.totalScore,
      rank: 1,
      accuracyRate: rank1.accuracyRate,
      correctAnswersCount: rank1.correctAnswersCount,
      totalAnswered: rank1.totalAnswered,
      avgLatency: rank1.avgLatency,
      teamName: rank1.teamId
        ? gameState.teams?.find(t => t.id === rank1.teamId)?.name || rank1.teamId
        : undefined
    };

    const runners: GrandFinaleWinner[] = [];
    if (rank2) {
      runners.push({
        uid: rank2.uid,
        name: rank2.name,
        mssv: rank2.mssv,
        totalScore: rank2.totalScore,
        rank: 2,
        teamName: rank2.teamId
          ? gameState.teams?.find(t => t.id === rank2.teamId)?.name || rank2.teamId
          : undefined
      });
    }
    if (rank3) {
      runners.push({
        uid: rank3.uid,
        name: rank3.name,
        mssv: rank3.mssv,
        totalScore: rank3.totalScore,
        rank: 3,
        teamName: rank3.teamId
          ? gameState.teams?.find(t => t.id === rank3.teamId)?.name || rank3.teamId
          : undefined
      });
    }

    syncService.updateGameState({
      grand_finale: {
        active: true,
        winner: winnerData,
        runnersUp: runners,
        stageTheme: 'ROYAL_GOLD',
        timestamp: Date.now()
      },
      audience_light_show: {
        active: true,
        pattern: 'GOLDEN_CHAMPION',
        speed: 'NORMAL',
        message: `CHÀO ĐÓN NHÀ VÔ ĐỊCH: ${rank1.name.toUpperCase()}!`,
        timestamp: Date.now(),
        auto_dismiss_seconds: 60
      }
    });
  };

  // Export current leaderboard ranking to CSV
  const handleExportCSV = () => {
    vibrateCopy();
    soundFx.playClick();
    if (allRankedUsers.length === 0) {
      alert(localLanguage !== 'vi' ? 'No leaderboard data to export!' : 'Chưa có dữ liệu bảng xếp hạng để xuất CSV!');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filterLabel = roundFilter === 'ALL' ? 'ToanCuoc' : `Vong_${roundFilter}`;
    const filename = `BTI2026_BangXepHang_${filterLabel}_${timestamp}.csv`;
    exportLeaderboardToCSV(allRankedUsers, filename);
  };

  return (
    <div className="w-full max-w-[98vw] xl:max-w-[97vw] mx-auto text-[#e5e5e5] animate-fadeIn select-none flex-1 min-h-[500px] md:min-h-0 flex flex-col justify-between h-full fluent-box rounded-[4px] shadow-2xl overflow-hidden border border-white/10">
      {/* Integrated Leaderboard Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4 border-b border-white/10 bg-white/[0.02] shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[2px] bg-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
            <Trophy className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-300 font-bold">
                LEADERBOARD MATRIX • BTI 2026
              </span>
              <span className="fluent-badge fluent-badge-success flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                LIVE SYNC
              </span>
            </div>
            
            <h2 className="text-lg lg:text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
              {localLanguage !== 'vi' ? 'Leaderboard ' : 'Bảng Xếp Hạng '} {tabFilter === 'TEAM' ? (localLanguage !== 'vi' ? 'Teams' : 'Các Đội') : (localLanguage !== 'vi' ? 'Top 5' : 'Top 5 Cao Điểm Nhất')}
            </h2>
          </div>
        </div>

        {/* Action buttons (Admin / Operator controls vs Audience Stage Telemetry) */}
        {isStageDisplay ? (
          /* Projector Stage Display Only: Clean status badge, zero buttons */
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-[2px] text-xs font-mono font-bold text-amber-300 bg-amber-400/10 border border-amber-400/30 uppercase tracking-wider shadow-sm">
              {viewMode === 'PODIUM' 
                ? (localLanguage !== 'vi' ? 'PODIUM HONORS' : 'BỤC VINH QUANG') 
                : (localLanguage !== 'vi' ? 'FULL LEADERBOARD' : 'BẢNG ĐIỂM CHI TIẾT')}
            </span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {gameState.team_mode_active && gameState.teams && gameState.teams.length > 0 && (
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-[2px] border border-white/10 mr-2">
                <button
                  type="button"
                  onClick={() => setTabFilter('INDIVIDUAL')}
                  className={`px-3 py-1.5 rounded-[2px] text-xs font-bold transition cursor-pointer ${tabFilter === 'INDIVIDUAL' ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  {localLanguage !== 'vi' ? 'Individual' : 'Cá Nhân'}
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('TEAM')}
                  className={`px-3 py-1.5 rounded-[2px] text-xs font-bold transition cursor-pointer ${tabFilter === 'TEAM' ? 'bg-rose-600 text-white' : 'text-white/60 hover:text-white'}`}
                >
                  {localLanguage !== 'vi' ? 'Team (Average)' : 'Đội (Trung bình)'}
                </button>
              </div>
            )}

            {/* Admin-Only Action Buttons: Hidden on Audience View and Stage Display */}
            {!isAudienceView && !isStageDisplay && (
              <>
                {/* Export CSV button */}
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="fluent-btn px-3.5 py-2 rounded-[2px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                  title={localLanguage !== 'vi' ? 'Export CSV' : 'Xuất bảng xếp hạng thí sinh ra file CSV (Excel / SPSS)'}
                >
                  <FileSpreadsheet className="w-4 h-4 text-white" />
                  <span>{localLanguage !== 'vi' ? 'Export CSV' : 'Xuất CSV'}</span>
                </button>

                {/* Grand Finale Honors Ceremony Trigger */}
                <button
                  type="button"
                  onClick={handleToggleGrandFinale}
                  className={`fluent-btn px-3.5 py-2 rounded-[2px] font-bold text-xs font-mono transition shadow-lg flex items-center gap-1.5 cursor-pointer ${
                    gameState.grand_finale?.active
                      ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                      : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 hover:brightness-110 text-slate-950 ring-1 ring-amber-300'
                  }`}
                  title={gameState.grand_finale?.active ? 'Dừng Lễ Đăng Quang trên màn chiếu' : 'Kích hoạt Lễ Đăng Quang Quán Quân toàn màn chiếu'}
                >
                  <Trophy className="w-4 h-4 fill-current" />
                  <span>{gameState.grand_finale?.active ? 'DỪNG ĐĂNG QUANG' : 'LỄ ĐĂNG QUANG (FINALE)'}</span>
                </button>

                {/* Confetti Trigger */}
                <button
                  type="button"
                  onClick={() => {
                    vibrateSuccess();
                    triggerConfetti();
                  }}
                  className="fluent-btn px-3.5 py-2 rounded-[2px] bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs font-mono transition shadow-lg flex items-center gap-1.5 cursor-pointer"
                  title={localLanguage !== 'vi' ? 'Firework' : 'Bắn pháo hoa vinh danh'}
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  {localLanguage !== 'vi' ? 'Celebrate Top 1' : 'Pháo Hoa Top 1'}
                </button>
              </>
            )}

            {/* View Mode Toggle (Available for Both Admin and Audience) */}
            <div className="flex items-center fluent-box-nested rounded-[2px] p-1 gap-1">
              <button
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setViewMode('PODIUM');
                }}
                className={`px-3 py-1 rounded-[2px] text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'PODIUM'
                    ? 'bg-[#F7CAC9] text-[#190839] font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" /> {localLanguage !== 'vi' ? 'Podium' : 'Bục Vinh Quang'}
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setViewMode('LIST');
                }}
                className={`px-3 py-1 rounded-[2px] text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'LIST'
                    ? 'bg-[#F7CAC9] text-[#190839] font-bold shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> {localLanguage !== 'vi' ? 'List' : 'Danh Sách'}
              </button>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  onClose();
                }}
                className="fluent-btn px-2.5 py-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white font-mono text-xs flex items-center gap-1.5 transition cursor-pointer border border-white/20 shadow-sm shrink-0"
                title={localLanguage !== 'vi' ? 'Back' : 'Quay lại câu hỏi sân khấu'}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline font-bold">{localLanguage !== 'vi' ? 'Back' : 'Quay lại'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Integrated Round Filter Tabs Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 sm:px-4 border-b border-white/10 bg-black/25 shrink-0 sticky top-0 z-10">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-white/40 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> {localLanguage !== 'vi' ? 'Round:' : 'Vòng thi:'}
          </span>
          {isStageDisplay ? (
            /* Clean display pill on Stage Display, non-interactive */
            <span className="px-3 py-1 text-xs font-mono font-bold rounded-[2px] bg-[#F7CAC9] text-[#190839] border border-[#F7CAC9] shadow-sm">
              {roundFilter === 'ALL'
                ? (localLanguage !== 'vi' ? 'All (Total)' : 'Toàn Cuộc (Tổng Hợp)')
                : roundFilter === 'R1'
                ? (localLanguage !== 'vi' ? 'Round 1: Start' : 'Vòng 1: Khởi Động')
                : roundFilter === 'R2'
                ? (localLanguage !== 'vi' ? 'Round 2: Obstacles' : 'Vòng 2: VCNV')
                : roundFilter === 'R3'
                ? (localLanguage !== 'vi' ? 'Round 3: Accel' : 'Vòng 3: Tăng Tốc')
                : (localLanguage !== 'vi' ? 'Round 4: Finish' : 'Vòng 4: Về Đích')}
            </span>
          ) : (
            [
              { id: 'ALL', label: localLanguage !== 'vi' ? 'All (Total)' : 'Toàn Cuộc (Tổng Hợp)' },
              { id: 'R1', label: localLanguage !== 'vi' ? 'Round 1: Start' : 'Vòng 1: Khởi Động' },
              { id: 'R2', label: localLanguage !== 'vi' ? 'Round 2: Obstacles' : 'Vòng 2: VCNV' },
              { id: 'R3', label: localLanguage !== 'vi' ? 'Round 3: Accel' : 'Vòng 3: Tăng Tốc' },
              { id: 'R4', label: localLanguage !== 'vi' ? 'Round 4: Finish' : 'Vòng 4: Về Đích' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setRoundFilter(tab.id as any);
                }}
                className={`fluent-subtab-btn cursor-pointer transition-all ${
                  roundFilter === tab.id
                    ? 'active bg-[#F7CAC9] text-[#190839] font-black border-[#F7CAC9] shadow-sm'
                    : 'fluent-box-nested text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))
          )}
        </div>

        <div className="text-[11px] font-mono text-white/50 px-2 flex items-center gap-3">
          <span>👥 {localLanguage !== 'vi' ? 'Total players:' : 'Tổng thí sinh:'} <strong className="text-white font-bold">{allRankedUsers.length}</strong></span>
          <span>⚡ {localLanguage !== 'vi' ? 'Total submissions:' : 'Tổng lượt gửi:'} <strong className="text-emerald-400 font-bold">{totalSubmissions}</strong></span>
        </div>
      </div>

      {/* Integrated Content Body */}
      <div key={`${roundFilter}_${viewMode}`} className="fluent-tab-panel flex-1 min-h-0 flex flex-col p-2.5 sm:p-4 overflow-y-auto">
      {/* Empty State when no response data exists yet */}
      {allRankedUsers.length === 0 ? (
        <div className="p-8 sm:p-12 text-center space-y-4 my-auto">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-[2px] bg-white/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Trophy className="w-6 h-6 sm:w-7 sm:h-7 opacity-60" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-white font-mono">{localLanguage !== 'vi' ? 'No response data yet' : 'Chưa có dữ liệu phản hồi nào'}</h3>
          <p className="text-xs sm:text-sm text-white/50 max-w-md mx-auto">
            {localLanguage !== 'vi'
              ? 'When audience and players submit answers on their devices, the system will automatically tally scores and honor the Top 5 highest scorers here.'
              : 'Khi khán giả và thí sinh gửi câu trả lời trên điện thoại, hệ thống sẽ tự động tổng hợp và vinh danh Top 5 người có điểm số cao nhất tại đây.'}
          </p>
        </div>
      ) : viewMode === 'PODIUM' ? (
        /* PODIUM SHOWCASE VIEW (ADAPTIVE 1, 2, OR 3+ PODIUM + 4 & 5 TILES) */
        <div className="space-y-3 sm:space-y-4 lg:space-y-5 flex-1 min-h-0 flex flex-col justify-start md:justify-center my-auto w-full">
          {top5Scorers.length === 1 && rank1 ? (
            /* Single Champion Grand Spotlight View (Responsive Scaled for PC/Projector) */
            <div className="w-full max-w-5xl xl:max-w-6xl mx-auto my-auto py-1">
              <div className="fluent-box border-2 border-amber-400/80 rounded-[6px] p-5 sm:p-6 lg:p-8 relative overflow-hidden shadow-[0_0_40px_rgba(251,191,36,0.18)] ring-2 ring-amber-400/30 flex flex-col justify-between min-h-0 hover:scale-[1.003] transition-all group bg-gradient-to-br from-[#200e38]/95 via-[#130726]/95 to-[#0B0218]">
                {/* Grand Ambient Glowing Crown Background */}
                <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
                  <Crown className="w-48 h-48 lg:w-72 lg:h-72 text-amber-300 animate-pulse" />
                </div>

                {/* Shimmer Light Bar */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400" />

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-8 items-center my-auto w-full relative z-10">
                  {/* Left Column: Contestant Identity & Champion Badges (col-span-7) */}
                  <div className="lg:col-span-7 space-y-3 sm:space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="w-12 h-12 lg:w-14 lg:h-14 rounded-[4px] bg-gradient-to-br from-amber-300 via-amber-400 to-yellow-500 text-slate-950 font-black font-mono text-xl lg:text-2xl flex items-center justify-center shadow-xl border-2 border-yellow-200 shrink-0">
                          #1
                        </span>
                        <div>
                          <span className="fluent-badge fluent-badge-warning uppercase tracking-widest flex items-center gap-1.5 shadow-md text-xs sm:text-sm font-black px-2.5 py-0.5 sm:px-3 sm:py-1">
                            <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> {localLanguage !== 'vi' ? 'CHAMPION' : 'QUÁN QUÂN'}
                          </span>
                          <span className="text-[10px] sm:text-[11px] lg:text-xs font-mono text-amber-300/80 uppercase tracking-widest mt-0.5 block font-semibold">
                            {localLanguage !== 'vi' ? 'Highest Points in Arena' : 'Điểm Cao Nhất Đấu Trường BTI 2026'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {rankChangesMap.get(rank1.uid) && (
                          <RankMovementIndicator
                            delta={rankChangesMap.get(rank1.uid)?.delta}
                            prevRank={rankChangesMap.get(rank1.uid)?.prevRank}
                          />
                        )}
                        <span className="fluent-badge fluent-badge-success flex items-center gap-1.5 px-3 py-1 text-xs sm:text-sm font-bold shadow-md">
                          <Zap className="w-3.5 h-3.5 text-emerald-400 animate-bounce" /> TOP 1 LIVE
                        </span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-black text-white group-hover:text-amber-200 transition tracking-tight font-mono leading-tight">
                          {rank1.name}
                        </h3>
                        {rankChangesMap.get(rank1.uid) && (
                          <RankMovementIndicator
                            delta={rankChangesMap.get(rank1.uid)?.delta}
                            prevRank={rankChangesMap.get(rank1.uid)?.prevRank}
                          />
                        )}
                        {trendsMap.get(rank1.uid) && (
                          <TrendIndicator
                            trendInfo={trendsMap.get(rank1.uid)}
                          />
                        )}
                      </div>
                      <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-2.5 text-xs sm:text-sm font-mono">
                        <span className="bg-white/5 border border-white/10 px-2.5 py-1 rounded-[3px] text-white/80">
                          MSSV: <strong className="text-amber-300 font-bold">{rank1.mssv || 'N/A'}</strong>
                        </span>
                        <span className="bg-purple-950/40 border border-purple-500/30 px-2.5 py-1 rounded-[3px] text-purple-200">
                          UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank1)}</strong>
                        </span>
                        <span className="bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded-[3px] text-emerald-300 text-[11px] font-bold uppercase tracking-wider hidden sm:inline-block">
                          ★ DẪN ĐẦU BẢNG TỔNG SẮP
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Outstanding Score & High-Impact Metrics (col-span-5) */}
                  <div className="lg:col-span-5 flex flex-col justify-center items-center lg:items-end text-center lg:text-right border-t lg:border-t-0 lg:border-l border-amber-400/25 pt-4 lg:pt-0 lg:pl-6 space-y-3 lg:space-y-4">
                    <div>
                      <span className="text-[11px] sm:text-xs font-mono text-amber-200/80 uppercase font-bold tracking-wider block mb-0.5">
                        {localLanguage !== 'vi' ? 'Outstanding Total Score:' : 'Tổng Điểm Xuất Sắc:'}
                      </span>
                      <div className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_20px_rgba(251,191,36,0.45)]">
                        {rank1.totalScore} <span className="text-lg sm:text-xl lg:text-2xl text-amber-200/60 font-normal">pts</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 text-xs sm:text-sm font-mono w-full pt-1">
                      <div className="fluent-box-nested p-2.5 sm:p-3 rounded-[3px] border border-amber-400/30 text-left">
                        <span className="text-[10px] sm:text-[11px] text-amber-200/70 block font-bold mb-1">
                          {localLanguage !== 'vi' ? 'Accuracy' : 'Độ Chính Xác'}
                        </span>
                        <span className="text-emerald-400 font-black text-base sm:text-lg lg:text-xl">
                          {rank1.correctAnswersCount}/{rank1.totalAnswered} ({rank1.accuracyRate}%)
                        </span>
                      </div>
                      <div className="fluent-box-nested p-2.5 sm:p-3 rounded-[3px] border border-amber-400/30 text-left">
                        <span className="text-[10px] sm:text-[11px] text-amber-200/70 block font-bold mb-1">
                          {localLanguage !== 'vi' ? 'Breakthrough Speed' : 'Tốc Độ Bứt Phá'}
                        </span>
                        <span className="text-[#FCEEEC] font-black text-base sm:text-lg lg:text-xl">
                          {rank1.avgLatency}s
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : top5Scorers.length === 2 && rank1 && rank2 ? (
            /* 2-Contestant Balanced Spotlight */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-6 max-w-5xl xl:max-w-6xl mx-auto items-stretch my-auto pt-1 w-full">
              {/* Rank 1 - Champion */}
              <div className="order-1 fluent-box border-2 border-amber-400/80 rounded-[6px] p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-2xl ring-2 ring-amber-400/30 flex flex-col justify-between min-h-[280px] sm:min-h-[320px] lg:min-h-[360px] hover:scale-[1.005] transition-all group bg-gradient-to-br from-[#200e38]/95 to-[#0B0218]">
                <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
                  <Crown className="w-28 h-28 text-amber-300 animate-pulse" />
                </div>
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400" />
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-10 h-10 rounded-[3px] bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black font-mono text-xl flex items-center justify-center shadow-xl border border-yellow-200">
                        #1
                      </span>
                      <span className="fluent-badge fluent-badge-warning uppercase tracking-widest flex items-center gap-1.5 shadow-md text-xs font-black px-2.5 py-1">
                        <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> {localLanguage !== 'vi' ? 'CHAMPION' : 'QUÁN QUÂN'}
                      </span>
                    </div>
                    <span className="fluent-badge fluent-badge-success flex items-center gap-1 text-xs">
                      <Zap className="w-3 h-3 text-emerald-400" /> TOP 1 LIVE
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white group-hover:text-amber-200 transition tracking-tight truncate font-mono">
                    {rank1.name}
                  </h3>
                  <p className="text-xs text-amber-200/80 font-mono my-2 flex flex-wrap items-center gap-1.5">
                    <span>MSSV: <strong className="text-amber-300 font-bold">{rank1.mssv || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank1)}</strong></span>
                  </p>
                </div>
                <div className="space-y-3 pt-3 border-t border-amber-400/30">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-amber-200/80 uppercase font-bold">{localLanguage !== 'vi' ? 'Outstanding Total:' : 'Tổng Điểm Xuất Sắc:'}</span>
                    <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                      {rank1.totalScore} <span className="text-xs sm:text-sm text-amber-200/60 font-normal">pts</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="fluent-box-nested p-2.5 rounded-[3px] border border-amber-400/20">
                      <span className="text-[10px] text-amber-200/60 block font-bold mb-0.5">{localLanguage !== 'vi' ? 'Accuracy' : 'Độ Chính Xác'}</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {rank1.correctAnswersCount}/{rank1.totalAnswered} ({rank1.accuracyRate}%)
                      </span>
                    </div>
                    <div className="fluent-box-nested p-2.5 rounded-[3px] border border-amber-400/20">
                      <span className="text-[10px] text-amber-200/60 block font-bold mb-0.5">{localLanguage !== 'vi' ? 'Speed' : 'Tốc Độ Bứt Phá'}</span>
                      <span className="text-[#FCEEEC] font-bold text-sm">{rank1.avgLatency}s</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rank 2 - Runner-Up */}
              <div className="order-2 fluent-box border-2 border-slate-400/40 rounded-[6px] p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[280px] sm:min-h-[320px] lg:min-h-[360px] hover:border-[#F7CAC9]/50 transition-all group bg-gradient-to-br from-[#160B2C]/90 to-[#0B0218]">
                <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                  <Medal className="w-24 h-24 text-slate-300" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-3.5">
                    <div className="flex items-center gap-2.5">
                      <span className="w-10 h-10 rounded-[3px] bg-slate-300 text-slate-950 font-black font-mono text-xl flex items-center justify-center shadow-lg">
                        #2
                      </span>
                      <span className="fluent-badge fluent-badge-neutral uppercase tracking-wider flex items-center gap-1 text-xs font-bold px-2.5 py-1">
                        <Medal className="w-3.5 h-3.5 text-slate-300" /> {localLanguage !== 'vi' ? 'Runner-Up 1' : 'Á Quân 1'}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white group-hover:text-slate-200 transition truncate font-mono">
                    {rank2.name}
                  </h3>
                  <p className="text-xs text-white/60 font-mono my-2 flex flex-wrap items-center gap-1.5">
                    <span>MSSV: <strong className="text-slate-300 font-bold">{rank2.mssv || 'N/A'}</strong></span>
                    <span>•</span>
                    <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank2)}</strong></span>
                  </p>
                </div>
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-white/50 uppercase font-bold">{localLanguage !== 'vi' ? 'Total Points:' : 'Tổng Điểm:'}</span>
                    <span className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-200 font-mono">
                      {rank2.totalScore} <span className="text-xs text-white/40 font-normal">pts</span>
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="fluent-box-nested p-2.5 rounded-[3px]">
                      <span className="text-[10px] text-white/40 block mb-0.5">{localLanguage !== 'vi' ? 'Correct/Total' : 'Đúng / Tham gia'}</span>
                      <span className="text-emerald-400 font-bold text-sm">
                        {rank2.correctAnswersCount}/{rank2.totalAnswered} ({rank2.accuracyRate}%)
                      </span>
                    </div>
                    <div className="fluent-box-nested p-2.5 rounded-[3px]">
                      <span className="text-[10px] text-white/40 block mb-0.5">{localLanguage !== 'vi' ? 'Avg Speed' : 'Tốc độ TB'}</span>
                      <span className="text-[#F7CAC9] font-bold text-sm">{rank2.avgLatency}s</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* 3-Column Olympic Podium (Expansive Widescreen) */
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5 items-end my-auto pt-1 w-full max-w-7xl mx-auto">
              {/* Rank 2 - Silver (Left Pedestal) */}
              {rank2 ? (
                <div className="order-2 md:order-1 fluent-box border-2 border-slate-400/40 rounded-[6px] p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[250px] sm:min-h-[290px] lg:min-h-[330px] hover:border-[#F7CAC9]/50 transition-all group bg-gradient-to-br from-[#160B2C]/90 to-[#0B0218]">
                  <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                    <Medal className="w-24 h-24 text-slate-300" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-[3px] bg-slate-300 text-slate-950 font-black font-mono text-lg flex items-center justify-center shadow-lg">
                          #2
                        </span>
                        <span className="fluent-badge fluent-badge-neutral uppercase tracking-wider flex items-center gap-1 text-[11px] font-bold px-2 py-0.5">
                          <Medal className="w-3 h-3 text-slate-300" /> {localLanguage !== 'vi' ? 'Runner-Up 1' : 'Á Quân 1'}
                        </span>
                      </div>
                      {rankChangesMap.get(rank2.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(rank2.uid)?.delta}
                          prevRank={rankChangesMap.get(rank2.uid)?.prevRank}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg lg:text-xl font-black text-white group-hover:text-slate-200 transition truncate font-mono">
                        {rank2.name}
                      </h3>
                      {rankChangesMap.get(rank2.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(rank2.uid)?.delta}
                          prevRank={rankChangesMap.get(rank2.uid)?.prevRank}
                          compact
                        />
                      )}
                      {trendsMap.get(rank2.uid) && (
                        <TrendIndicator
                          trendInfo={trendsMap.get(rank2.uid)}
                        />
                      )}
                    </div>
                    <p className="text-xs text-white/60 font-mono my-2 flex flex-wrap items-center gap-1.5">
                      <span>MSSV: <strong className="text-slate-300 font-bold">{rank2.mssv || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank2)}</strong></span>
                    </p>
                  </div>

                  {/* Score & Metrics */}
                  <div className="space-y-2.5 pt-2.5 border-t border-white/10">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-mono text-white/50 uppercase font-bold">{localLanguage !== 'vi' ? 'Total Points:' : 'Tổng Điểm:'}</span>
                      <span className="text-2xl sm:text-3xl font-bold text-slate-200 font-mono">
                        {rank2.totalScore} <span className="text-xs text-white/40 font-normal">pts</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
                      <div className="fluent-box-nested p-2 rounded-[3px]">
                        <span className="text-[10px] text-white/40 block mb-0.5">{localLanguage !== 'vi' ? 'Correct/Total' : 'Đúng / Tham gia'}</span>
                        <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                          {rank2.correctAnswersCount}/{rank2.totalAnswered} ({rank2.accuracyRate}%)
                        </span>
                      </div>
                      <div className="fluent-box-nested p-2 rounded-[3px]">
                        <span className="text-[10px] text-white/40 block mb-0.5">{localLanguage !== 'vi' ? 'Avg Speed' : 'Tốc độ TB'}</span>
                        <span className="text-[#F7CAC9] font-bold text-xs sm:text-sm">{rank2.avgLatency}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Rank 1 - Gold Champion (Center Highest Pedestal) */}
              {rank1 ? (
                <div className="order-1 md:order-2 fluent-box border-2 border-amber-400/80 rounded-[6px] p-5 sm:p-6 lg:p-7 relative overflow-hidden shadow-2xl ring-2 ring-amber-400/30 flex flex-col justify-between min-h-[300px] sm:min-h-[340px] lg:min-h-[380px] transform md:-translate-y-2 hover:scale-[1.005] transition-all group bg-gradient-to-br from-[#200e38]/95 to-[#0B0218]">
                  <div className="absolute top-0 right-0 p-3 opacity-20 pointer-events-none">
                    <Crown className="w-28 h-28 text-amber-300 animate-pulse" />
                  </div>

                  {/* Shimmer Light Bar */}
                  <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400" />

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-11 h-11 rounded-[3px] bg-gradient-to-br from-amber-300 to-amber-500 text-slate-950 font-black font-mono text-xl flex items-center justify-center shadow-xl border border-yellow-200">
                          #1
                        </span>
                        <span className="fluent-badge fluent-badge-warning uppercase tracking-widest flex items-center gap-1.5 shadow-md text-xs font-black px-2.5 py-0.5 sm:px-3 sm:py-1">
                          <Crown className="w-3.5 h-3.5 text-amber-300 fill-amber-300" /> {localLanguage !== 'vi' ? 'CHAMPION' : 'QUÁN QUÂN'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {rankChangesMap.get(rank1.uid) && (
                          <RankMovementIndicator
                            delta={rankChangesMap.get(rank1.uid)?.delta}
                            prevRank={rankChangesMap.get(rank1.uid)?.prevRank}
                          />
                        )}
                        <span className="fluent-badge fluent-badge-success flex items-center gap-1 text-[11px] font-bold">
                          <Zap className="w-3 h-3 text-emerald-400" /> TOP 1 LIVE
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl lg:text-3xl font-black text-white group-hover:text-amber-200 transition tracking-tight truncate font-mono">
                        {rank1.name}
                      </h3>
                      {rankChangesMap.get(rank1.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(rank1.uid)?.delta}
                          prevRank={rankChangesMap.get(rank1.uid)?.prevRank}
                          compact
                        />
                      )}
                      {trendsMap.get(rank1.uid) && (
                        <TrendIndicator
                          trendInfo={trendsMap.get(rank1.uid)}
                        />
                      )}
                    </div>
                    <p className="text-xs text-amber-200/80 font-mono my-2 flex flex-wrap items-center gap-1.5">
                      <span>MSSV: <strong className="text-amber-300 font-bold">{rank1.mssv || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank1)}</strong></span>
                    </p>
                  </div>

                  {/* Score & High-Profile Metrics */}
                  <div className="space-y-2.5 pt-2.5 border-t border-amber-400/30">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-mono text-amber-200/80 uppercase font-bold">{localLanguage !== 'vi' ? 'Outstanding Total:' : 'Tổng Điểm Xuất Sắc:'}</span>
                      <span className="text-3xl sm:text-4xl lg:text-5xl font-black text-amber-300 font-mono tracking-tight drop-shadow-[0_0_15px_rgba(251,191,36,0.4)]">
                        {rank1.totalScore} <span className="text-xs sm:text-sm text-amber-200/60 font-normal">pts</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
                      <div className="fluent-box-nested p-2 rounded-[3px] border border-amber-400/20">
                        <span className="text-[10px] text-amber-200/60 block mb-0.5">{localLanguage !== 'vi' ? 'Accuracy' : 'Độ Chính Xác'}</span>
                        <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                          {rank1.correctAnswersCount}/{rank1.totalAnswered} ({rank1.accuracyRate}%)
                        </span>
                      </div>
                      <div className="fluent-box-nested p-2 rounded-[3px] border border-amber-400/20">
                        <span className="text-[10px] text-amber-200/60 block mb-0.5">{localLanguage !== 'vi' ? 'Speed' : 'Tốc Độ Bứt Phá'}</span>
                        <span className="text-[#FCEEEC] font-bold text-xs sm:text-sm">{rank1.avgLatency}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Rank 3 - Bronze (Right Pedestal) */}
              {rank3 ? (
                <div className="order-3 fluent-box border-2 border-amber-600/40 rounded-[6px] p-4 sm:p-5 lg:p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[240px] sm:min-h-[280px] lg:min-h-[310px] hover:border-amber-500 transition-all group bg-gradient-to-br from-[#1b0d26]/90 to-[#0B0218]">
                  <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                    <Medal className="w-24 h-24 text-amber-600" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="w-9 h-9 rounded-[3px] fluent-acrylic-surface text-amber-400 font-black font-mono text-lg flex items-center justify-center shadow-lg border border-amber-600/30">
                          #3
                        </span>
                        <span className="fluent-badge fluent-badge-warning uppercase tracking-wider flex items-center gap-1 text-[11px] font-bold px-2 py-0.5">
                          <Medal className="w-3 h-3 text-amber-400" /> {localLanguage !== 'vi' ? 'Runner-Up 2' : 'Á Quân 2'}
                        </span>
                      </div>
                      {rankChangesMap.get(rank3.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(rank3.uid)?.delta}
                          prevRank={rankChangesMap.get(rank3.uid)?.prevRank}
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg lg:text-xl font-black text-white group-hover:text-amber-200 transition truncate font-mono">
                        {rank3.name}
                      </h3>
                      {rankChangesMap.get(rank3.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(rank3.uid)?.delta}
                          prevRank={rankChangesMap.get(rank3.uid)?.prevRank}
                          compact
                        />
                      )}
                      {trendsMap.get(rank3.uid) && (
                        <TrendIndicator
                          trendInfo={trendsMap.get(rank3.uid)}
                        />
                      )}
                    </div>
                    <p className="text-xs text-white/60 font-mono my-2 flex flex-wrap items-center gap-1.5">
                      <span>MSSV: <strong className="text-amber-400 font-bold">{rank3.mssv || 'N/A'}</strong></span>
                      <span>•</span>
                      <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank3)}</strong></span>
                    </p>
                  </div>

                  {/* Score & Metrics */}
                  <div className="space-y-2.5 pt-2.5 border-t border-white/10">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs font-mono text-white/50 uppercase font-bold">{localLanguage !== 'vi' ? 'Total Points:' : 'Tổng Điểm:'}</span>
                      <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
                        {rank3.totalScore} <span className="text-xs text-white/40 font-normal">pts</span>
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-0.5">
                      <div className="fluent-box-nested p-2 rounded-[3px]">
                        <span className="text-[10px] text-white/40 block mb-0.5">{localLanguage !== 'vi' ? 'Correct/Total' : 'Đúng / Tham gia'}</span>
                        <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                          {rank3.correctAnswersCount}/{rank3.totalAnswered} ({rank3.accuracyRate}%)
                        </span>
                      </div>
                      <div className="fluent-box-nested p-2 rounded-[3px]">
                        <span className="text-[10px] text-white/40 block mb-0.5">{localLanguage !== 'vi' ? 'Avg Speed' : 'Tốc độ TB'}</span>
                        <span className="text-[#F7CAC9] font-bold text-xs sm:text-sm">{rank3.avgLatency}s</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          )}

          {/* Rank 4 & Rank 5 Bento Cards */}
          {(rank4 || rank5) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3 max-w-5xl mx-auto w-full pt-0.5">
              {/* Rank 4 */}
              {rank4 && (
                <div className="px-3.5 py-2.5 fluent-box rounded-[4px] flex items-center justify-between transition shadow-md hover:border-white/20">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-[2px] bg-[#F7CAC9]/20 border border-[#E39A96]/40 text-[#EBC7D6] font-mono font-black text-xs flex items-center justify-center shadow shrink-0">
                      #4
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-white font-mono leading-tight">{rank4.name}</h4>
                        {rankChangesMap.get(rank4.uid) && (
                          <RankMovementIndicator
                            delta={rankChangesMap.get(rank4.uid)?.delta}
                            prevRank={rankChangesMap.get(rank4.uid)?.prevRank}
                            compact
                          />
                        )}
                        {trendsMap.get(rank4.uid) && (
                          <TrendIndicator
                            trendInfo={trendsMap.get(rank4.uid)}
                          />
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-mono text-white/50">MSSV: {rank4.mssv || 'N/A'} • UID: <span className="text-purple-300 font-bold">{getUserDisplayUid(rank4)}</span></p>
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0 pl-2">
                    <span className="text-base sm:text-lg font-bold text-[#FCEEEC] block leading-tight">{rank4.totalScore} pts</span>
                    <span className="text-[10px] text-[#F7CAC9]">
                      {rank4.correctAnswersCount}/{rank4.totalAnswered} ({rank4.accuracyRate}%) • {rank4.avgLatency}s
                    </span>
                  </div>
                </div>
              )}

              {/* Rank 5 */}
              {rank5 && (
                <div className="px-3.5 py-2.5 fluent-box rounded-[4px] flex items-center justify-between transition shadow-md hover:border-white/20">
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-[2px] bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono font-black text-xs flex items-center justify-center shadow shrink-0">
                      #5
                    </span>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs sm:text-sm font-bold text-white font-mono leading-tight">{rank5.name}</h4>
                        {rankChangesMap.get(rank5.uid) && (
                          <RankMovementIndicator
                            delta={rankChangesMap.get(rank5.uid)?.delta}
                            prevRank={rankChangesMap.get(rank5.uid)?.prevRank}
                            compact
                          />
                        )}
                        {trendsMap.get(rank5.uid) && (
                          <TrendIndicator
                            trendInfo={trendsMap.get(rank5.uid)}
                          />
                        )}
                      </div>
                      <p className="text-[10px] sm:text-[11px] font-mono text-white/50">MSSV: {rank5.mssv || 'N/A'} • UID: <span className="text-purple-300 font-bold">{getUserDisplayUid(rank5)}</span></p>
                    </div>
                  </div>

                  <div className="text-right font-mono shrink-0 pl-2">
                    <span className="text-base sm:text-lg font-bold text-emerald-400 block leading-tight">{rank5.totalScore} pts</span>
                    <span className="text-[10px] text-emerald-400">
                      {rank5.correctAnswersCount}/{rank5.totalAnswered} ({rank5.accuracyRate}%) • {rank5.avgLatency}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* FULL DETAILED TABLE LIST VIEW WITH AUTO-SCROLL */
        <div className="rounded-[3px] overflow-hidden border border-white/10 flex-1 min-h-0 flex flex-col justify-between bg-black/25">
          {/* Auto-scroll status & control toolbar */}
          <div className="fluent-box-nested border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListAutoScroll}
                className={`fluent-btn px-3 py-1 rounded-[2px] font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  isListAutoScrolling
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'fluent-box text-white/70 hover:text-white'
                }`}
              >
                {isListAutoScrolling ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>{localLanguage !== 'vi' ? 'Auto scroll: ON' : 'Tự động cuộn: BẬT'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>{localLanguage !== 'vi' ? 'Auto scroll: OFF' : 'Tự động cuộn: TẮT'}</span>
                  </>
                )}
              </button>

              {isListAutoScrolling && (
                <div className="flex items-center fluent-box-nested rounded-[2px] p-0.5 text-[11px]">
                  <span className="text-white/40 px-1.5 flex items-center gap-1">
                    <Gauge className="w-2.5 h-2.5 text-[#F7CAC9]" /> {localLanguage !== 'vi' ? 'Speed:' : 'Tốc độ:'}
                  </span>
                  {(['slow', 'normal', 'fast'] as AutoScrollSpeed[]).map(spd => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setListScrollSpeed(spd)}
                      className={`px-2 py-0.5 rounded-[2px] font-bold transition uppercase cursor-pointer ${
                        listScrollSpeed === spd
                          ? 'bg-[#F7CAC9] text-[#190839]'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {spd === 'slow' ? (localLanguage !== 'vi' ? 'Slow' : 'Chậm') : spd === 'normal' ? (localLanguage !== 'vi' ? 'Normal' : 'Vừa') : (localLanguage !== 'vi' ? 'Fast' : 'Nhanh')}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={resetListScrollToTop}
                className="fluent-btn px-2 py-1 rounded-[2px] fluent-box-nested text-white/70 hover:text-white transition flex items-center gap-1 cursor-pointer"
                title={localLanguage !== 'vi' ? 'Back to top' : 'Về đầu danh sách'}
              >
                <RotateCcw className="w-3 h-3" /> {localLanguage !== 'vi' ? 'Top' : 'Về đầu'}
              </button>
            </div>

            <div className="text-[11px] text-white/50 flex items-center gap-2">
              {isListAutoScrolling && (
                <span>
                  {isListScrollPaused ? (
                    <span className="text-amber-300">{localLanguage !== 'vi' ? 'Paused (Hover)' : 'Tạm dừng (Rê chuột/Tác vụ)'}</span>
                  ) : isListScrollOverflowing ? (
                    <span className="text-emerald-400">{localLanguage !== 'vi' ? `Cycling through ${allRankedUsers.length} players` : `Đang tuần hoàn qua ${allRankedUsers.length} thí sinh`}</span>
                  ) : (
                    <span>{localLanguage !== 'vi' ? 'Show all' : 'Hiển thị đầy đủ'}</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isListAutoScrolling && isListScrollOverflowing && (
            <div className="h-0.5 bg-black/40 w-full overflow-hidden shrink-0">
              <div
                className="h-full bg-gradient-to-r from-[#F7CAC9] to-emerald-400 transition-all duration-200"
                style={{ width: `${listScrollProgress}%` }}
              />
            </div>
          )}

          <div
            ref={listContainerRef}
            className="overflow-x-auto flex-1 min-h-0 overflow-y-auto scroll-smooth custom-scrollbar"
          >
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0D0420]/95 sticky top-0 z-20 border-b border-white/10 text-white/50 uppercase text-[10px] tracking-wider backdrop-blur-md">
                <tr>
                  <th className="p-3 text-center">{localLanguage !== 'vi' ? 'Rank' : 'Hạng'}</th>
                  <th className="p-3">{localLanguage !== 'vi' ? 'Player' : 'Thí Sinh / Khán Giả'}</th>
                  <th className="p-3">MSSV</th>
                  <th className="p-3">{localLanguage !== 'vi' ? 'UID' : 'Mã Định Danh (UID)'}</th>
                  <th className="p-3 text-center">{localLanguage !== 'vi' ? 'Correct/Total' : 'Đúng / Tham Gia'}</th>
                  <th className="p-3 text-center">{localLanguage !== 'vi' ? 'Accuracy' : 'Độ Chính Xác'}</th>
                  <th className="p-3 text-center">{localLanguage !== 'vi' ? 'Avg Speed' : 'Tốc Độ TB'}</th>
                  <th className="p-3 text-right">{localLanguage !== 'vi' ? 'Total' : 'Tổng Điểm'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence initial={false}>
                  {allRankedUsers.map((user, idx) => {
                    const isTop1 = idx === 0;
                    const isTop2 = idx === 1;
                    const isTop3 = idx === 2;
                    const isTop5 = idx < 5;

                    return (
                      <motion.tr
                        key={user.uid || user.mssv || idx}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.96 }}
                        transition={{
                          layout: { type: 'spring', damping: 25, stiffness: 350 },
                          opacity: { duration: 0.2 }
                        }}
                        className={`transition-colors ${
                          isTop1
                            ? 'bg-amber-400/10 hover:bg-amber-400/15 font-bold'
                            : isTop2
                            ? 'bg-slate-400/5 hover:bg-slate-400/15'
                            : isTop3
                            ? 'bg-amber-700/5 hover:bg-amber-700/15'
                            : 'hover:bg-white/5'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-[2px] font-black text-xs ${
                              isTop1
                                ? 'bg-amber-400 text-[#0D0420] ring-1 ring-amber-300'
                                : isTop2
                                ? 'bg-slate-300 text-[#0D0420]'
                                : isTop3
                                ? 'bg-amber-700 text-white'
                                : isTop5
                                ? 'bg-[#F7CAC9]/30 text-[#EBC7D6] border border-[#E39A96]/30'
                                : 'text-white/40'
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />}
                            <span className={`text-xs sm:text-sm ${isTop5 ? 'text-white font-bold' : 'text-white/80'}`}>
                              {user.name}
                            </span>
                            {rankChangesMap.get(user.uid) && (
                              <RankMovementIndicator
                                delta={rankChangesMap.get(user.uid)?.delta}
                                prevRank={rankChangesMap.get(user.uid)?.prevRank}
                                compact
                              />
                            )}
                            {trendsMap.get(user.uid) && (
                              <TrendIndicator
                                trendInfo={trendsMap.get(user.uid)}
                              />
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-white/60">{user.mssv}</td>
                        <td className="p-3">
                          <span className="text-purple-300 font-mono text-xs bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded-[2px]">
                            {getUserDisplayUid(user)}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-emerald-400 font-bold">
                            {user.correctAnswersCount}
                          </span>
                          <span className="text-white/40"> / {user.totalAnswered}</span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] fluent-box-nested border border-white/5">
                            <span className={user.accuracyRate >= 80 ? 'text-emerald-400 font-bold' : 'text-white/70'}>
                              {user.accuracyRate}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center text-[#FCEEEC] font-bold">{user.avgLatency}s</td>
                        <td className="p-3 text-right">
                          <span className={`text-sm sm:text-base font-black ${isTop1 ? 'text-amber-300' : 'text-white'}`}>
                            {user.totalScore} <span className="text-xs text-white/40 font-normal">pts</span>
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Integrated Footer Stage Note */}
      <div className="flex flex-wrap items-center justify-between text-[10px] sm:text-[11px] font-mono text-white/40 px-4 py-2 border-t border-white/10 bg-black/25 shrink-0">
        <span>{localLanguage !== 'vi' ? 'BTI 2026 STANDARD LEADERBOARD' : 'BẢNG ĐIỂM TỔNG HỢP THEO TIÊU CHUẨN BTI 2026'}</span>
        <span>{localLanguage !== 'vi' ? 'RANKING CRITERIA: TOTAL POINTS ➔ CORRECT ANSWERS ➔ SPEED' : 'TIÊU CHÍ XẾP HẠNG: TỔNG ĐIỂM ➔ SỐ CÂU ĐÚNG ➔ TỐC ĐỘ GỬI ĐÁP ÁN'}</span>
      </div>
    </div>
  );
};
