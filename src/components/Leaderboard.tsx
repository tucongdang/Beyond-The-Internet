import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useMemo, useEffect } from 'react';
import { GameState, UserResponse, QuestionItem } from '../types';
import { calculateLeaderboard, UserScoreSummary } from '../utils/leaderboardUtils';
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
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
  allResponses = {},
  gameState,
  customQuestionBank,
  activeCount = 0,
  onClose
}) => {
  const [roundFilter, setRoundFilter] = useState<'ALL' | 'R1' | 'R2' | 'R3' | 'R4'>('ALL');
  const { localLanguage } = useLanguage();
  const [tabFilter, setTabFilter] = useState<'INDIVIDUAL' | 'TEAM'>(gameState.team_mode_active ? 'TEAM' : 'INDIVIDUAL');

  useEffect(() => {
    if (!gameState.team_mode_active) {
      setTabFilter('INDIVIDUAL');
    } else {
      setTabFilter('TEAM');
    }
  }, [gameState.team_mode_active]);
  const [viewModeState, setViewModeState] = useState<'PODIUM' | 'LIST'>('PODIUM');
  const viewMode = tabFilter === 'TEAM' ? 'LIST' : viewModeState;
  const setViewMode = setViewModeState;
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

  // Trigger festive stage confetti
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
  };



  // Export current leaderboard ranking to CSV
  const handleExportCSV = () => {
    vibrateCopy();
    soundFx.playClick();
    if (allRankedUsers.length === 0) {
      alert(localLanguage === 'en' ? 'No leaderboard data to export!' : 'Chưa có dữ liệu bảng xếp hạng để xuất CSV!');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filterLabel = roundFilter === 'ALL' ? 'ToanCuoc' : `Vong_${roundFilter}`;
    const filename = `BTI2026_BangXepHang_${filterLabel}_${timestamp}.csv`;
    exportLeaderboardToCSV(allRankedUsers, filename);
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-6 text-[#e5e5e5] animate-fadeIn select-none">
      {/* Leaderboard Stage Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 fluent-box rounded-[12px] p-5 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-[4px] bg-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
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
            
            <h2 className="text-xl lg:text-2xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
              {localLanguage === 'en' ? 'Leaderboard ' : 'Bảng Xếp Hạng '} {tabFilter === 'TEAM' ? (localLanguage === 'en' ? 'Teams' : 'Các Đội') : (localLanguage === 'en' ? 'Top 5' : 'Top 5 Cao Điểm Nhất')}
            </h2>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {gameState.team_mode_active && gameState.teams && gameState.teams.length > 0 && (
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-[4px] border border-white/10 mr-2">
              <button
                type="button"
                onClick={() => setTabFilter('INDIVIDUAL')}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition ${tabFilter === 'INDIVIDUAL' ? 'bg-purple-600 text-white' : 'text-white/60 hover:text-white'}`}
              >
                {localLanguage === 'en' ? 'Individual' : 'Cá Nhân'}
              </button>
              <button
                type="button"
                onClick={() => setTabFilter('TEAM')}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition ${tabFilter === 'TEAM' ? 'bg-rose-600 text-white' : 'text-white/60 hover:text-white'}`}
              >
                {localLanguage === 'en' ? 'Team (Average)' : 'Đội (Trung bình)'}
              </button>
            </div>
          )}

          {/* Export CSV button */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="fluent-btn px-3.5 py-2 rounded-[4px] bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs font-mono transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            title={localLanguage === 'en' ? 'Export CSV' : 'Xuất bảng xếp hạng thí sinh ra file CSV (Excel / SPSS)'}
          >
            <FileSpreadsheet className="w-4 h-4 text-white" />
            <span>{localLanguage === 'en' ? 'Export CSV' : 'Xuất CSV'}</span>
          </button>

          {/* Confetti Trigger */}
          <button
            type="button"
            onClick={() => {
              vibrateSuccess();
              triggerConfetti();
            }}
            className="fluent-btn px-3.5 py-2 rounded-[4px] bg-gradient-to-r from-amber-400 to-amber-300 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-bold text-xs font-mono transition shadow-lg flex items-center gap-1.5 cursor-pointer"
            title={localLanguage === 'en' ? 'Firework' : 'Bắn pháo hoa vinh danh'}
          >
            <Sparkles className="w-4 h-4 fill-current" />
            {localLanguage === 'en' ? 'Celebrate Top 1' : 'Vinh Danh Top 1'}
          </button>

          {/* View Mode Toggle */}
          <div className="flex items-center fluent-box-nested rounded-[4px] p-1 gap-1">
            <button
              type="button"
              onClick={() => {
                vibrateSelection();
                setViewMode('PODIUM');
              }}
              className={`px-3 py-1 rounded-[4px] text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'PODIUM'
                  ? 'bg-[#F7CAC9] text-[#190839] font-bold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Award className="w-3.5 h-3.5" /> {localLanguage === 'en' ? 'Podium' : 'Bục Vinh Quang'}
            </button>
            <button
              type="button"
              onClick={() => {
                vibrateSelection();
                setViewMode('LIST');
              }}
              className={`px-3 py-1 rounded-[4px] text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'LIST'
                  ? 'bg-[#F7CAC9] text-[#190839] font-bold shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> {localLanguage === 'en' ? 'List' : 'Danh Sách'}
            </button>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                onClose();
              }}
              className="fluent-btn p-2 rounded-[4px] text-white/80 hover:text-white fluent-box-nested transition cursor-pointer"
              title={localLanguage === 'en' ? 'Back' : 'Quay lại câu hỏi sân khấu'}
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Round Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 fluent-box rounded-[12px] p-2.5">
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <span className="text-white/40 px-2 flex items-center gap-1">
            <Filter className="w-3 h-3" /> {localLanguage === 'en' ? 'Round:' : 'Vòng thi:'}
          </span>
          {[
            { id: 'ALL', label: localLanguage === 'en' ? 'All (Total)' : 'Toàn Cuộc (Tổng Hợp)' },
            { id: 'R1', label: localLanguage === 'en' ? 'Round 1: Start' : 'Vòng 1: Khởi Động' },
            { id: 'R2', label: localLanguage === 'en' ? 'Round 2: Obstacles' : 'Vòng 2: VCNV' },
            { id: 'R3', label: localLanguage === 'en' ? 'Round 3: Accel' : 'Vòng 3: Tăng Tốc' },
            { id: 'R4', label: localLanguage === 'en' ? 'Round 4: Finish' : 'Vòng 4: Về Đích' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                vibrateSelection();
                setRoundFilter(tab.id as any);
              }}
              className={`fluent-subtab-btn ${
                roundFilter === tab.id
                  ? 'active bg-[#F7CAC9] text-[#190839] font-black border-[#F7CAC9] shadow-sm'
                  : 'fluent-box-nested text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="text-[11px] font-mono text-white/50 px-2 flex items-center gap-3">
          <span>👥 {localLanguage === 'en' ? 'Total players:' : 'Tổng thí sinh:'} <strong className="text-white font-bold">{allRankedUsers.length}</strong></span>
          <span>⚡ {localLanguage === 'en' ? 'Total submissions:' : 'Tổng lượt gửi:'} <strong className="text-emerald-400 font-bold">{totalSubmissions}</strong></span>
        </div>
      </div>

      {/* Leaderboard View Container with Fluent 2 Motion Transition */}
      <div key={`${roundFilter}_${viewMode}`} className="fluent-tab-panel">
      {/* Empty State when no response data exists yet */}
      {allRankedUsers.length === 0 ? (
        <div className="fluent-box rounded-[12px] p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-[4px] bg-white/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7 opacity-60" />
          </div>
          <h3 className="text-lg font-bold text-white font-mono">{localLanguage === 'en' ? 'No response data yet' : 'Chưa có dữ liệu phản hồi nào'}</h3>
          <p className="text-xs sm:text-sm text-white/50 max-w-md mx-auto">
            {localLanguage === 'en'
              ? 'When audience and players submit answers on their devices, the system will automatically tally scores and honor the Top 5 highest scorers here.'
              : 'Khi khán giả và thí sinh gửi câu trả lời trên điện thoại, hệ thống sẽ tự động tổng hợp và vinh danh Top 5 người có điểm số cao nhất tại đây.'}
          </p>
        </div>
      ) : viewMode === 'PODIUM' ? (
        /* PODIUM SHOWCASE VIEW (TOP 1, 2, 3 PODIUM + 4 & 5 TILES) */
        <div className="space-y-6">
          {/* 3-Column Olympic Podium */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-end pt-6">
            {/* Rank 2 - Silver (Left Pedestal) */}
            {rank2 ? (
              <div className="order-2 md:order-1 fluent-box border-2 border-slate-400/40 rounded-[12px] p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[300px] hover:border-[#F7CAC9]/50 transition-all group">
                <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                  <Medal className="w-24 h-24 text-slate-300" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-9 h-9 rounded-[4px] bg-slate-300 text-slate-950 font-black font-mono text-base flex items-center justify-center shadow-lg">
                      #2
                    </span>
                    <span className="fluent-badge fluent-badge-neutral uppercase tracking-wider flex items-center gap-1">
                      <Medal className="w-3 h-3 text-slate-300" /> {localLanguage === 'en' ? 'Runner-Up 1' : 'Á Quân 1'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-slate-200 transition truncate font-mono">
                    {rank2.name}
                  </h3>
                  <p className="text-xs text-white/50 font-mono mb-4 flex flex-wrap items-center gap-1.5">
                    <span>MSSV: <strong className="text-slate-300 font-bold">{rank2.mssv}</strong></span>
                    <span>•</span>
                    <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank2)}</strong></span>
                  </p>
                </div>

                {/* Score & Metrics */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-white/50 uppercase">{localLanguage === 'en' ? 'Total Points:' : 'Tổng Điểm:'}</span>
                    <span className="text-2xl sm:text-3xl font-bold text-slate-200 font-mono">
                      {rank2.totalScore} <span className="text-xs text-white/40 font-normal">pts</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="fluent-box-nested p-2 rounded-[4px]">
                      <span className="text-[10px] text-white/40 block">{localLanguage === 'en' ? 'Correct/Total' : 'Đúng / Tham gia'}</span>
                      <span className="text-emerald-400 font-bold">
                        {rank2.correctAnswersCount}/{rank2.totalAnswered} ({rank2.accuracyRate}%)
                      </span>
                    </div>
                    <div className="fluent-box-nested p-2 rounded-[4px]">
                      <span className="text-[10px] text-white/40 block">{localLanguage === 'en' ? 'Avg Speed' : 'Tốc độ TB'}</span>
                      <span className="text-[#F7CAC9] font-bold">{rank2.avgLatency}s</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-2 md:order-1 fluent-box border border-dashed border-white/10 rounded-[12px] p-6 min-h-[260px] flex items-center justify-center text-xs text-white/30 font-mono">
                {localLanguage === 'en' ? '[Runner-Up #2 spot waiting]' : '[Vị trí Á Quân #2 đang chờ]'}
              </div>
            )}

            {/* Rank 1 - Gold Champion (Center Highest Pedestal) */}
            {rank1 ? (
              <div className="order-1 md:order-2 fluent-box border-2 border-amber-400/80 rounded-[12px] p-7 relative overflow-hidden shadow-2xl ring-2 ring-amber-400/30 flex flex-col justify-between min-h-[360px] transform md:-translate-y-4 hover:scale-[1.01] transition-all group">
                <div className="absolute top-0 right-0 p-4 opacity-20 pointer-events-none">
                  <Crown className="w-32 h-32 text-amber-300 animate-pulse" />
                </div>

                {/* Shimmer Light Bar */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-400 via-yellow-200 to-amber-400" />

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="w-11 h-11 rounded-[4px] bg-amber-400 text-slate-950 font-black font-mono text-xl flex items-center justify-center shadow-xl border border-yellow-200">
                        #1
                      </span>
                      <span className="fluent-badge fluent-badge-warning uppercase tracking-widest flex items-center gap-1.5 shadow-md">
                        <Crown className="w-4 h-4 text-amber-300 fill-amber-300" /> {localLanguage === 'en' ? 'CHAMPION' : 'QUÁN QUÂN'}
                      </span>
                    </div>

                    <span className="fluent-badge fluent-badge-success flex items-center gap-1">
                      <Zap className="w-3 h-3 text-emerald-400" /> TOP 1 LIVE
                    </span>
                  </div>

                  <h3 className="text-xl lg:text-2xl font-bold text-white group-hover:text-amber-200 transition tracking-tight truncate font-mono">
                    {rank1.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-200/70 font-mono mb-4 flex flex-wrap items-center gap-2">
                    <span>MSSV: <strong className="text-amber-300 font-bold">{rank1.mssv}</strong></span>
                    <span>•</span>
                    <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank1)}</strong></span>
                  </p>
                </div>

                {/* Score & High-Profile Metrics */}
                <div className="space-y-3 pt-3 border-t border-amber-400/30">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-amber-200/70 uppercase font-bold">{localLanguage === 'en' ? 'Outstanding Total:' : 'Tổng Điểm Xuất Sắc:'}</span>
                    <span className="text-3xl lg:text-4xl font-bold text-amber-300 font-mono tracking-tight">
                      {rank1.totalScore} <span className="text-xs text-amber-200/60 font-normal">pts</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="fluent-box-nested p-2.5 rounded-[4px] border border-amber-400/20">
                      <span className="text-[10px] text-amber-200/50 block font-bold">{localLanguage === 'en' ? 'Accuracy' : 'Độ Chính Xác'}</span>
                      <span className="text-emerald-400 font-bold text-xs sm:text-sm">
                        {rank1.correctAnswersCount}/{rank1.totalAnswered} ({rank1.accuracyRate}%)
                      </span>
                    </div>
                    <div className="fluent-box-nested p-2.5 rounded-[4px] border border-amber-400/20">
                      <span className="text-[10px] text-amber-200/50 block font-bold">{localLanguage === 'en' ? 'Speed' : 'Tốc Độ Bứt Phá'}</span>
                      <span className="text-[#FCEEEC] font-bold text-xs sm:text-sm">{rank1.avgLatency}s</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-1 md:order-2 fluent-box border border-dashed border-amber-500/30 rounded-[12px] p-6 min-h-[300px] flex items-center justify-center text-xs text-amber-300/40 font-mono">
                {localLanguage === 'en' ? '[Champion #1 spot waiting]' : '[Vị trí Quán Quân #1 đang chờ]'}
              </div>
            )}

            {/* Rank 3 - Bronze (Right Pedestal) */}
            {rank3 ? (
              <div className="order-3 fluent-box border-2 border-amber-600/40 rounded-[12px] p-6 relative overflow-hidden shadow-2xl flex flex-col justify-between min-h-[280px] hover:border-amber-500 transition-all group">
                <div className="absolute top-0 right-0 p-3 opacity-15 pointer-events-none">
                  <Medal className="w-24 h-24 text-amber-600" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="w-9 h-9 rounded-[4px] fluent-acrylic-surface text-white font-black font-mono text-base flex items-center justify-center shadow-lg">
                      #3
                    </span>
                    <span className="fluent-badge fluent-badge-warning uppercase tracking-wider flex items-center gap-1">
                      <Medal className="w-3 h-3 text-amber-400" /> {localLanguage === 'en' ? 'Runner-Up 2' : 'Á Quân 2'}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white group-hover:text-amber-200 transition truncate font-mono">
                    {rank3.name}
                  </h3>
                  <p className="text-xs text-white/50 font-mono mb-4 flex flex-wrap items-center gap-1.5">
                    <span>MSSV: <strong className="text-amber-400 font-bold">{rank3.mssv}</strong></span>
                    <span>•</span>
                    <span>UID: <strong className="text-purple-300 font-bold">{getUserDisplayUid(rank3)}</strong></span>
                  </p>
                </div>

                {/* Score & Metrics */}
                <div className="space-y-3 pt-3 border-t border-white/10">
                  <div className="flex items-baseline justify-between">
                    <span className="text-xs font-mono text-white/50 uppercase">{localLanguage === 'en' ? 'Total Points:' : 'Tổng Điểm:'}</span>
                    <span className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono">
                      {rank3.totalScore} <span className="text-xs text-white/40 font-normal">pts</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                    <div className="fluent-box-nested p-2 rounded-[4px]">
                      <span className="text-[10px] text-white/40 block">{localLanguage === 'en' ? 'Correct/Total' : 'Đúng / Tham gia'}</span>
                      <span className="text-emerald-400 font-bold">
                        {rank3.correctAnswersCount}/{rank3.totalAnswered} ({rank3.accuracyRate}%)
                      </span>
                    </div>
                    <div className="fluent-box-nested p-2 rounded-[4px]">
                      <span className="text-[10px] text-white/40 block">{localLanguage === 'en' ? 'Avg Speed' : 'Tốc độ TB'}</span>
                      <span className="text-[#F7CAC9] font-bold">{rank3.avgLatency}s</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="order-3 fluent-box border border-dashed border-white/10 rounded-[12px] p-6 min-h-[260px] flex items-center justify-center text-xs text-white/30 font-mono">
                {localLanguage === 'en' ? '[Runner-Up #3 spot waiting]' : '[Vị trí Á Quân #3 đang chờ]'}
              </div>
            )}
          </div>

          {/* Rank 4 & Rank 5 Bento Cards */}
          {(rank4 || rank5) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Rank 4 */}
              {rank4 && (
                <div className="p-4 fluent-box rounded-[12px] flex items-center justify-between transition shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-[4px] bg-[#F7CAC9]/20 border border-[#E39A96]/40 text-[#EBC7D6] font-mono font-black text-sm flex items-center justify-center shadow">
                      #4
                    </span>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white font-mono">{rank4.name}</h4>
                      <p className="text-xs font-mono text-white/50">MSSV: {rank4.mssv} • UID: <span className="text-purple-300 font-bold">{getUserDisplayUid(rank4)}</span></p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xl sm:text-2xl font-bold text-[#FCEEEC] block">{rank4.totalScore} pts</span>
                    <span className="text-[11px] text-[#F7CAC9]">
                      {rank4.correctAnswersCount}/{rank4.totalAnswered} {localLanguage === 'en' ? 'correct' : 'đúng'} • {rank4.avgLatency}s
                    </span>
                  </div>
                </div>
              )}

              {/* Rank 5 */}
              {rank5 && (
                <div className="p-4 fluent-box rounded-[12px] flex items-center justify-between transition shadow-lg">
                  <div className="flex items-center gap-3">
                    <span className="w-9 h-9 rounded-[4px] bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 font-mono font-black text-sm flex items-center justify-center shadow">
                      #5
                    </span>
                    <div>
                      <h4 className="text-sm sm:text-base font-bold text-white font-mono">{rank5.name}</h4>
                      <p className="text-xs font-mono text-white/50">MSSV: {rank5.mssv} • UID: <span className="text-purple-300 font-bold">{getUserDisplayUid(rank5)}</span></p>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <span className="text-xl sm:text-2xl font-bold text-emerald-400 block">{rank5.totalScore} pts</span>
                    <span className="text-[11px] text-emerald-400">
                      {rank5.correctAnswersCount}/{rank5.totalAnswered} {localLanguage === 'en' ? 'correct' : 'đúng'} • {rank5.avgLatency}s
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* FULL DETAILED TABLE LIST VIEW WITH AUTO-SCROLL */
        <div className="fluent-box rounded-[12px] overflow-hidden shadow-2xl space-y-0">
          {/* Auto-scroll status & control toolbar */}
          <div className="fluent-box-nested border-b border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleListAutoScroll}
                className={`fluent-btn px-3 py-1 rounded-[4px] font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                  isListAutoScrolling
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : 'fluent-box text-white/70 hover:text-white'
                }`}
              >
                {isListAutoScrolling ? (
                  <>
                    <Pause className="w-3 h-3 fill-current" />
                    <span>{localLanguage === 'en' ? 'Auto scroll: ON' : 'Tự động cuộn: BẬT'}</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3 h-3 fill-current" />
                    <span>{localLanguage === 'en' ? 'Auto scroll: OFF' : 'Tự động cuộn: TẮT'}</span>
                  </>
                )}
              </button>

              {isListAutoScrolling && (
                <div className="flex items-center fluent-box-nested rounded-[4px] p-0.5 text-[11px]">
                  <span className="text-white/40 px-1.5 flex items-center gap-1">
                    <Gauge className="w-2.5 h-2.5 text-[#F7CAC9]" /> {localLanguage === 'en' ? 'Speed:' : 'Tốc độ:'}
                  </span>
                  {(['slow', 'normal', 'fast'] as AutoScrollSpeed[]).map(spd => (
                    <button
                      key={spd}
                      type="button"
                      onClick={() => setListScrollSpeed(spd)}
                      className={`px-2 py-0.5 rounded-[4px] font-bold transition uppercase cursor-pointer ${
                        listScrollSpeed === spd
                          ? 'bg-[#F7CAC9] text-[#190839]'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      {spd === 'slow' ? (localLanguage === 'en' ? 'Slow' : 'Chậm') : spd === 'normal' ? (localLanguage === 'en' ? 'Normal' : 'Vừa') : (localLanguage === 'en' ? 'Fast' : 'Nhanh')}
                    </button>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={resetListScrollToTop}
                className="fluent-btn px-2 py-1 rounded-[4px] fluent-box-nested text-white/70 hover:text-white transition flex items-center gap-1 cursor-pointer"
                title={localLanguage === 'en' ? 'Back to top' : 'Về đầu danh sách'}
              >
                <RotateCcw className="w-3 h-3" /> {localLanguage === 'en' ? 'Top' : 'Về đầu'}
              </button>
            </div>

            <div className="text-[11px] text-white/50 flex items-center gap-2">
              {isListAutoScrolling && (
                <span>
                  {isListScrollPaused ? (
                    <span className="text-amber-300">{localLanguage === 'en' ? 'Paused (Hover)' : 'Tạm dừng (Rê chuột/Tác vụ)'}</span>
                  ) : isListScrollOverflowing ? (
                    <span className="text-emerald-400">{localLanguage === 'en' ? `Cycling through ${allRankedUsers.length} players` : `Đang tuần hoàn qua ${allRankedUsers.length} thí sinh`}</span>
                  ) : (
                    <span>{localLanguage === 'en' ? 'Show all' : 'Hiển thị đầy đủ'}</span>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {isListAutoScrolling && isListScrollOverflowing && (
            <div className="h-0.5 bg-black/40 w-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F7CAC9] to-emerald-400 transition-all duration-200"
                style={{ width: `${listScrollProgress}%` }}
              />
            </div>
          )}

          <div
            ref={listContainerRef}
            className="overflow-x-auto max-h-[55vh] overflow-y-auto scroll-smooth custom-scrollbar"
          >
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#0D0420]/90 sticky top-0 z-20 border-b border-white/10 text-white/50 uppercase text-[10px] tracking-wider backdrop-blur-md">
                <tr>
                  <th className="p-3.5 text-center">{localLanguage === 'en' ? 'Rank' : 'Hạng'}</th>
                  <th className="p-3.5">{localLanguage === 'en' ? 'Player' : 'Thí Sinh / Khán Giả'}</th>
                  <th className="p-3.5">MSSV</th>
                  <th className="p-3.5">{localLanguage === 'en' ? 'UID' : 'Mã Định Danh (UID)'}</th>
                  <th className="p-3.5 text-center">{localLanguage === 'en' ? 'Correct/Total' : 'Đúng / Tham Gia'}</th>
                  <th className="p-3.5 text-center">{localLanguage === 'en' ? 'Accuracy' : 'Độ Chính Xác'}</th>
                  <th className="p-3.5 text-center">{localLanguage === 'en' ? 'Avg Speed' : 'Tốc Độ TB'}</th>
                  <th className="p-3.5 text-right">{localLanguage === 'en' ? 'Total' : 'Tổng Điểm'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {allRankedUsers.map((user, idx) => {
                  const isTop1 = idx === 0;
                  const isTop2 = idx === 1;
                  const isTop3 = idx === 2;
                  const isTop5 = idx < 5;

                  return (
                    <tr
                      key={user.uid || idx}
                      className={`transition ${
                        isTop1
                          ? 'bg-amber-400/10 hover:bg-amber-400/15 font-bold'
                          : isTop2
                          ? 'bg-slate-400/5 hover:bg-slate-400/15'
                          : isTop3
                          ? 'bg-amber-700/5 hover:bg-amber-700/15'
                          : 'hover:bg-white/5'
                      }`}
                    >
                      <td className="p-3.5 text-center">
                        <span
                          className={`inline-flex items-center justify-center w-6 h-6 rounded-[4px] font-black text-xs ${
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
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          {isTop1 && <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                          <span className={`text-xs sm:text-sm ${isTop5 ? 'text-white font-bold' : 'text-white/80'}`}>
                            {user.name}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-white/60">{user.mssv}</td>
                      <td className="p-3.5">
                        <span className="text-purple-300 font-mono text-xs bg-purple-950/40 border border-purple-500/20 px-2 py-0.5 rounded-[4px]">
                          {getUserDisplayUid(user)}
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <span className="text-emerald-400 font-bold">
                          {user.correctAnswersCount}
                        </span>
                        <span className="text-white/40"> / {user.totalAnswered}</span>
                      </td>
                      <td className="p-3.5 text-center">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[4px] fluent-box-nested border border-white/5">
                          <span className={user.accuracyRate >= 80 ? 'text-emerald-400 font-bold' : 'text-white/70'}>
                            {user.accuracyRate}%
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center text-[#FCEEEC] font-bold">{user.avgLatency}s</td>
                      <td className="p-3.5 text-right">
                        <span className={`text-sm sm:text-base font-black ${isTop1 ? 'text-amber-300' : 'text-white'}`}>
                          {user.totalScore} <span className="text-xs text-white/40 font-normal">pts</span>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      </div>

      {/* Footer Stage Note */}
      <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-white/40 pt-2 border-t border-white/5">
        <span>{localLanguage === 'en' ? 'BTI 2026 STANDARD LEADERBOARD' : 'BẢNG ĐIỂM TỔNG HỢP THEO TIÊU CHUẨN BTI 2026'}</span>
        <span>{localLanguage === 'en' ? 'RANKING CRITERIA: TOTAL POINTS ➔ CORRECT ANSWERS ➔ SPEED' : 'TIÊU CHÍ XẾP HẠNG: TỔNG ĐIỂM ➔ SỐ CÂU ĐÚNG ➔ TỐC ĐỘ GỬI ĐÁP ÁN'}</span>
      </div>
    </div>
  );
};
