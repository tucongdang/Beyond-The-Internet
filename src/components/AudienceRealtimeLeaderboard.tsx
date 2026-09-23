import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crown, 
  Medal, 
  Zap, 
  Clock, 
  CheckCircle2, 
  Sparkles, 
  Flame, 
  Users, 
  Search, 
  Filter, 
  X, 
  ArrowUpRight, 
  TrendingUp, 
  Radio, 
  RefreshCw, 
  Award,
  ChevronUp,
  ChevronDown,
  Target,
  BarChart3,
  Share2
} from 'lucide-react';
import { GameState, UserInfo, UserResponse, QuestionItem } from '../types';
import { calculateLeaderboard, UserScoreSummary, calculateRankChanges, calculateUserTrends } from '../utils/leaderboardUtils';
import { RankMovementIndicator } from './RankMovementIndicator';
import { TrendIndicator } from './TrendIndicator';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSelection, vibrateSuccess, vibrateGrandCelebration } from '../utils/hapticUtils';
import confetti from '../utils/confetti';
import { useLanguage } from '../hooks/useLanguage';

interface AudienceRealtimeLeaderboardProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo | null;
  gameState: GameState;
  initialAllResponses?: Record<string, Record<string, UserResponse>>;
  customQuestionBank?: QuestionItem[];
  onOpenShareModal?: () => void;
  isEmbedded?: boolean;
}

type SortMetric = 'SCORE_SPEED' | 'SPEED_ONLY' | 'ACCURACY_ONLY';

export const AudienceRealtimeLeaderboard: React.FC<AudienceRealtimeLeaderboardProps> = ({
  isOpen,
  onClose,
  user,
  gameState,
  initialAllResponses,
  customQuestionBank,
  onOpenShareModal,
  isEmbedded = false
}) => {
  const { localLanguage } = useLanguage();
  const [allResponses, setAllResponses] = useState<Record<string, Record<string, UserResponse>>>(
    initialAllResponses || {}
  );
  const [roundFilter, setRoundFilter] = useState<'ALL' | 'R1' | 'R2' | 'R3' | 'R4'>('ALL');
  const [sortMetric, setSortMetric] = useState<SortMetric>('SCORE_SPEED');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLiveSyncing, setIsLiveSyncing] = useState<boolean>(true);
  const [lastSyncTs, setLastSyncTs] = useState<number>(Date.now());

  // 1. Real-time Subscription to responses via syncService
  useEffect(() => {
    if (!isOpen && !isEmbedded) return;

    // Initial fetch from syncService
    const currentResponses = syncService.getAllResponses();
    if (currentResponses && Object.keys(currentResponses).length > 0) {
      setAllResponses(currentResponses);
    }

    // Subscribe to live response stream
    const unsubscribe = syncService.subscribeToResponses((incoming) => {
      if (incoming) {
        setAllResponses(incoming);
        setLastSyncTs(Date.now());
      }
    });

    return () => {
      unsubscribe();
    };
  }, [isOpen, isEmbedded]);

  // 2. Compute Full Leaderboard with Speed & Accuracy Scoring
  const rawLeaderboard = useMemo(() => {
    return calculateLeaderboard(allResponses, customQuestionBank, gameState, roundFilter);
  }, [allResponses, customQuestionBank, gameState, roundFilter]);

  // 3. Apply Sorting Metric (Score & Speed / Fastest Speed / Accuracy)
  const sortedLeaderboard = useMemo(() => {
    const list = [...rawLeaderboard];

    if (sortMetric === 'SPEED_ONLY') {
      // Sort by fastest average latency (lower is better, minimum 1 answered)
      return list.sort((a, b) => {
        if (a.totalAnswered === 0 && b.totalAnswered > 0) return 1;
        if (b.totalAnswered === 0 && a.totalAnswered > 0) return -1;
        if (a.avgLatency === b.avgLatency) return b.totalScore - a.totalScore;
        return a.avgLatency - b.avgLatency;
      }).map((item, idx) => ({ ...item, rank: idx + 1 }));
    }

    if (sortMetric === 'ACCURACY_ONLY') {
      // Sort by highest accuracy %
      return list.sort((a, b) => {
        if (b.accuracyRate !== a.accuracyRate) return b.accuracyRate - a.accuracyRate;
        if (b.correctAnswersCount !== a.correctAnswersCount) return b.correctAnswersCount - a.correctAnswersCount;
        return a.avgLatency - b.avgLatency;
      }).map((item, idx) => ({ ...item, rank: idx + 1 }));
    }

    // Default 'SCORE_SPEED': Highest Total Score, then Fastest Avg Latency
    return list.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.correctAnswersCount !== a.correctAnswersCount) return b.correctAnswersCount - a.correctAnswersCount;
      return a.avgLatency - b.avgLatency;
    }).map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [rawLeaderboard, sortMetric]);

  // 4. Filter by Search Query (Name or MSSV)
  const filteredLeaderboard = useMemo(() => {
    if (!searchQuery.trim()) return sortedLeaderboard;
    const q = searchQuery.toLowerCase().trim();
    return sortedLeaderboard.filter(
      item => (item.name && item.name.toLowerCase().includes(q)) ||
              (item.mssv && item.mssv.toLowerCase().includes(q))
    );
  }, [sortedLeaderboard, searchQuery]);

  // 5. Current User Performance & Relative Standing
  const myData = useMemo(() => {
    if (!user) return null;
    const found = sortedLeaderboard.find(
      item => (item.uid && item.uid === user.uid) ||
              (item.mssv && user.mssv && item.mssv.toLowerCase() === user.mssv.toLowerCase())
    );
    return found || null;
  }, [sortedLeaderboard, user]);

  // Gap to next rank
  const gapToNextRank = useMemo(() => {
    if (!myData || myData.rank <= 1) return null;
    const prevItem = sortedLeaderboard.find(item => item.rank === myData.rank - 1);
    if (!prevItem) return null;
    const scoreDiff = Math.max(0, prevItem.totalScore - myData.totalScore);
    const latencyDiff = Number(Math.max(0, myData.avgLatency - prevItem.avgLatency).toFixed(2));
    return {
      prevName: prevItem.name,
      scoreDiff,
      latencyDiff,
      prevRank: prevItem.rank
    };
  }, [myData, sortedLeaderboard]);

  // Track rank delta (up/down/same) compared to previous question
  const rankChangesMap = useMemo(() => {
    return calculateRankChanges(
      allResponses,
      sortedLeaderboard,
      gameState.question_id,
      customQuestionBank,
      gameState,
      roundFilter
    );
  }, [allResponses, sortedLeaderboard, gameState.question_id, customQuestionBank, gameState, roundFilter]);

  // Track multi-round performance trends
  const trendsMap = useMemo(() => {
    return calculateUserTrends(
      allResponses,
      sortedLeaderboard,
      customQuestionBank,
      gameState
    );
  }, [allResponses, sortedLeaderboard, customQuestionBank, gameState]);

  // Top 3 Podium Contestants
  const top1 = sortedLeaderboard[0] || null;
  const top2 = sortedLeaderboard[1] || null;
  const top3 = sortedLeaderboard[2] || null;

  // Trigger celebration if current user is Top 3 on opening
  useEffect(() => {
    if (isOpen && myData && myData.rank <= 3 && myData.totalScore > 0) {
      vibrateGrandCelebration();
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    }
  }, [isOpen, myData]);

  if (!isOpen && !isEmbedded) return null;

  const content = (
    <div className={`flex flex-col h-full w-full select-none ${isEmbedded ? '' : 'max-h-[92vh]'}`}>
      
      {/* HEADER BAR */}
      <div className="flex items-center justify-between p-3.5 sm:p-4 bg-gradient-to-r from-[#18092e] via-[#240b3b] to-[#120524] border-b border-purple-500/30 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-[3px] bg-gradient-to-br from-amber-500/20 to-purple-600/30 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-md shrink-0">
            <Trophy className="w-5 h-5 text-amber-300 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white uppercase tracking-wider truncate">
                {localLanguage !== 'vi' ? 'Live Audience Leaderboard' : 'Bảng Xếp Hạng Khán Giả Live'}
              </h2>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[2px] bg-emerald-500/15 border border-emerald-400/40 text-[9px] font-mono font-bold text-emerald-300 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                <span>REAL-TIME</span>
              </span>
            </div>
            <p className="text-[10px] text-[#B6A6D8] font-mono flex items-center gap-1 truncate">
              <span>Tính điểm chuẩn: Độ chính xác + Tốc độ phản xạ (⚡)</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenShareModal && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                onOpenShareModal();
              }}
              className="p-1.5 rounded-[2px] fluent-box-nested hover:bg-white/10 text-amber-300 border border-amber-400/30 transition cursor-pointer"
              title="Chia sẻ thành tích"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {!isEmbedded && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                onClose();
              }}
              className="p-1.5 rounded-[2px] fluent-box-nested hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
              title="Đóng bảng xếp hạng"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* BODY SCROLL CONTAINER */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4 custom-scrollbar bg-slate-950/60">
        
        {/* MY PERFORMANCE SPOTLIGHT CARD */}
        {myData ? (
          <div className="p-3 sm:p-4 rounded-[4px] fluent-box border border-amber-400/50 bg-gradient-to-r from-purple-950/70 via-[#260f38]/80 to-slate-950/90 shadow-xl space-y-2.5 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-[2px] bg-amber-400 text-slate-950 font-mono font-black text-xs flex items-center justify-center shadow-md">
                  #{myData.rank}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5 flex-wrap">
                    <span className="truncate max-w-[140px] sm:max-w-[200px]">{myData.name}</span>
                    {rankChangesMap.get(myData.uid) && (
                      <RankMovementIndicator
                        delta={rankChangesMap.get(myData.uid)?.delta}
                        prevRank={rankChangesMap.get(myData.uid)?.prevRank}
                        compact
                      />
                    )}
                    {trendsMap.get(myData.uid) && (
                      <TrendIndicator
                        trendInfo={trendsMap.get(myData.uid)}
                      />
                    )}
                    {myData.mssv && (
                      <span className="text-[10px] font-mono text-amber-300/80">({myData.mssv})</span>
                    )}
                  </div>
                  <div className="text-[10px] text-[#B6A6D8]">
                    Hạng của bạn trong tổng số {sortedLeaderboard.length} thí sinh
                  </div>
                </div>
              </div>

              {/* Total Points */}
              <div className="text-right">
                <div className="text-xl sm:text-2xl font-mono font-black text-amber-300 drop-shadow-md">
                  {myData.totalScore.toLocaleString()} <span className="text-xs text-amber-400/80 font-normal">đ</span>
                </div>
                <div className="text-[9px] font-mono text-emerald-400 font-bold uppercase">
                  Đúng {myData.correctAnswersCount}/{myData.totalAnswered} câu
                </div>
              </div>
            </div>

            {/* Performance Chips Bar */}
            <div className="grid grid-cols-3 gap-2 pt-1 border-t border-white/10 font-mono text-center">
              <div className="p-1.5 rounded bg-black/40 border border-white/10">
                <div className="text-[9px] text-white/50 uppercase">Tốc độ TB</div>
                <div className="text-xs sm:text-sm font-bold text-sky-300 flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-sky-400" />
                  <span>{myData.avgLatency > 0 ? `${myData.avgLatency.toFixed(2)}s` : '--'}</span>
                </div>
              </div>

              <div className="p-1.5 rounded bg-black/40 border border-white/10">
                <div className="text-[9px] text-white/50 uppercase">Chính xác</div>
                <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center justify-center gap-1">
                  <Target className="w-3 h-3 text-amber-400" />
                  <span>{Math.round(myData.accuracyRate)}%</span>
                </div>
              </div>

              <div className="p-1.5 rounded bg-black/40 border border-white/10">
                <div className="text-[9px] text-white/50 uppercase">Hạng tiếp theo</div>
                <div className="text-[11px] sm:text-xs font-bold text-purple-300 truncate">
                  {gapToNextRank ? (
                    <span>-{gapToNextRank.scoreDiff}đ</span>
                  ) : (
                    <span className="text-amber-300 font-black">TOP 1 👑</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-[3px] fluent-box-nested border border-white/10 text-center text-xs text-white/60 font-mono">
            {user ? 'Bạn chưa nộp câu trả lời nào. Hãy tham gia trả lời câu hỏi tiếp theo để ghi điểm trên BXH!' : 'Vui lòng đăng ký / đăng nhập để lưu điểm số và leo Top BXH!'}
          </div>
        )}

        {/* PODIUM SHOWCASE (TOP 1, 2, 3) */}
        {sortedLeaderboard.length > 0 && (
          <div className="p-3 sm:p-4 rounded-[4px] fluent-box border border-purple-500/30 bg-gradient-to-b from-[#1c0c32]/80 to-slate-950/90 shadow-xl space-y-3">
            <div className="text-[11px] font-mono text-amber-300 uppercase font-bold tracking-wider flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>Bục Vinh Quang • Top 3 Xuất Sắc Nhất</span>
              </div>
              <span className="text-[10px] text-white/40 font-normal">
                {roundFilter === 'ALL' ? 'Toàn trận' : `Vòng ${roundFilter}`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3 items-end pt-2 pb-1">
              
              {/* TOP 2 (BẠC) */}
              <div className="flex flex-col items-center text-center order-1">
                {top2 ? (
                  <div className="w-full flex flex-col items-center animate-fadeIn">
                    <div className="relative mb-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-400/20 border-2 border-slate-300 text-slate-200 font-bold flex items-center justify-center text-xs sm:text-sm shadow-lg">
                        {top2.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-950 font-mono font-black text-[10px] flex items-center justify-center shadow">
                        2
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[110px] mt-1 flex items-center justify-center gap-1">
                      <span>{top2.name}</span>
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                      {rankChangesMap.get(top2.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(top2.uid)?.delta}
                          prevRank={rankChangesMap.get(top2.uid)?.prevRank}
                          compact
                        />
                      )}
                      {trendsMap.get(top2.uid) && (
                        <TrendIndicator
                          trendInfo={trendsMap.get(top2.uid)}
                        />
                      )}
                    </div>
                    <div className="text-xs font-mono font-black text-slate-300 mt-0.5">
                      {top2.totalScore} đ
                    </div>
                    <div className="text-[9px] font-mono text-sky-300 flex items-center gap-0.5 mt-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      <span>{top2.avgLatency.toFixed(1)}s</span>
                    </div>
                    <div className="w-full h-14 sm:h-18 bg-gradient-to-t from-slate-700/60 to-slate-500/30 rounded-t-[3px] border-t border-slate-400/50 mt-2 flex items-center justify-center font-mono font-bold text-slate-300 text-xs">
                      🥈 HẠNG 2
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-20 border border-dashed border-white/10 rounded flex items-center justify-center text-[10px] text-white/30 font-mono">
                    Đang chờ
                  </div>
                )}
              </div>

              {/* TOP 1 (VÀNG - QUÁN QUÂN) */}
              <div className="flex flex-col items-center text-center order-2 -mt-2">
                {top1 ? (
                  <div className="w-full flex flex-col items-center animate-fadeIn">
                    <div className="relative mb-1">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-amber-500/30 border-2 border-yellow-300 text-yellow-300 font-black flex items-center justify-center text-sm sm:text-base shadow-xl ring-2 ring-yellow-400/30">
                        {top1.name.charAt(0).toUpperCase()}
                      </div>
                      <Crown className="w-5 h-5 text-yellow-400 absolute -top-3 left-1/2 -translate-x-1/2 drop-shadow" />
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-yellow-400 text-slate-950 font-mono font-black text-[10px] flex items-center justify-center shadow">
                        1
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-black text-yellow-300 truncate max-w-[100px] sm:max-w-[130px] mt-1">
                      {top1.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                      {rankChangesMap.get(top1.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(top1.uid)?.delta}
                          prevRank={rankChangesMap.get(top1.uid)?.prevRank}
                          compact
                        />
                      )}
                      {trendsMap.get(top1.uid) && (
                        <TrendIndicator
                          trendInfo={trendsMap.get(top1.uid)}
                        />
                      )}
                    </div>
                    <div className="text-sm font-mono font-black text-amber-300 mt-0.5">
                      {top1.totalScore} đ
                    </div>
                    <div className="text-[9px] font-mono text-emerald-300 font-bold flex items-center gap-0.5 mt-0.5">
                      <Zap className="w-2.5 h-2.5 text-yellow-400" />
                      <span>{top1.avgLatency.toFixed(1)}s • {Math.round(top1.accuracyRate)}%</span>
                    </div>
                    <div className="w-full h-20 sm:h-24 bg-gradient-to-t from-amber-600/70 to-yellow-500/40 rounded-t-[3px] border-t-2 border-yellow-300 mt-2 flex items-center justify-center font-mono font-black text-yellow-200 text-xs sm:text-sm shadow-lg">
                      👑 QUÁN QUÂN
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-24 border border-dashed border-white/10 rounded flex items-center justify-center text-[10px] text-white/30 font-mono">
                    Đang chờ
                  </div>
                )}
              </div>

              {/* TOP 3 (ĐỒNG) */}
              <div className="flex flex-col items-center text-center order-3">
                {top3 ? (
                  <div className="w-full flex flex-col items-center animate-fadeIn">
                    <div className="relative mb-1">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-amber-800/30 border-2 border-amber-600 text-amber-300 font-bold flex items-center justify-center text-xs sm:text-sm shadow-lg">
                        {top3.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-600 text-slate-950 font-mono font-black text-[10px] flex items-center justify-center shadow">
                        3
                      </span>
                    </div>
                    <div className="text-xs font-bold text-white truncate max-w-[90px] sm:max-w-[110px] mt-1">
                      {top3.name}
                    </div>
                    <div className="flex items-center justify-center gap-1 mt-0.5 flex-wrap">
                      {rankChangesMap.get(top3.uid) && (
                        <RankMovementIndicator
                          delta={rankChangesMap.get(top3.uid)?.delta}
                          prevRank={rankChangesMap.get(top3.uid)?.prevRank}
                          compact
                        />
                      )}
                      {trendsMap.get(top3.uid) && (
                        <TrendIndicator
                          trendInfo={trendsMap.get(top3.uid)}
                        />
                      )}
                    </div>
                    <div className="text-xs font-mono font-black text-amber-400 mt-0.5">
                      {top3.totalScore} đ
                    </div>
                    <div className="text-[9px] font-mono text-sky-300 flex items-center gap-0.5 mt-0.5">
                      <Zap className="w-2.5 h-2.5" />
                      <span>{top3.avgLatency.toFixed(1)}s</span>
                    </div>
                    <div className="w-full h-11 sm:h-14 bg-gradient-to-t from-amber-900/60 to-amber-700/30 rounded-t-[3px] border-t border-amber-600/50 mt-2 flex items-center justify-center font-mono font-bold text-amber-300 text-xs">
                      🥉 HẠNG 3
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-16 border border-dashed border-white/10 rounded flex items-center justify-center text-[10px] text-white/30 font-mono">
                    Đang chờ
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* CONTROLS: ROUND FILTER, SORT METRIC, SEARCH */}
        <div className="space-y-2.5">
          {/* Round Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
            {[
              { id: 'ALL', label: 'Toàn Trận' },
              { id: 'R1', label: 'R1 Khởi Động' },
              { id: 'R2', label: 'R2 VCNV' },
              { id: 'R3', label: 'R3 Tăng Tốc' },
              { id: 'R4', label: 'R4 Về Đích' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  vibrateSelection();
                  soundFx.playClick();
                  setRoundFilter(tab.id as any);
                }}
                className={`px-3 py-1.5 rounded-[2px] font-mono text-xs font-bold whitespace-nowrap transition cursor-pointer shrink-0 border ${
                  roundFilter === tab.id
                    ? 'bg-gradient-to-r from-amber-500 to-purple-600 text-slate-950 border-amber-300 shadow'
                    : 'fluent-box-nested hover:bg-white/10 text-white/70 border-white/10'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Sort Metrics & Search Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
            {/* Sort Toggle */}
            <div className="flex items-center gap-1 bg-black/40 p-1 rounded-[2px] border border-white/10">
              <button
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setSortMetric('SCORE_SPEED');
                }}
                className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold transition cursor-pointer ${
                  sortMetric === 'SCORE_SPEED'
                    ? 'bg-amber-500 text-slate-950 shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                Điểm & Tốc Độ
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setSortMetric('SPEED_ONLY');
                }}
                className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  sortMetric === 'SPEED_ONLY'
                    ? 'bg-sky-500 text-slate-950 shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Zap className="w-3 h-3" />
                <span>Nhanh Nhất</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateSelection();
                  setSortMetric('ACCURACY_ONLY');
                }}
                className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold transition cursor-pointer flex items-center gap-1 ${
                  sortMetric === 'ACCURACY_ONLY'
                    ? 'bg-emerald-500 text-slate-950 shadow'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                <Target className="w-3 h-3" />
                <span>Chính Xác</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative flex-1 sm:max-w-xs">
              <Search className="w-3.5 h-3.5 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm thí sinh / MSSV..."
                className="w-full pl-8 pr-3 py-1.5 rounded-[2px] bg-black/40 border border-white/15 text-xs text-white placeholder-white/40 focus:border-amber-400 focus:outline-none font-mono"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* FULL CONTESTANT LIST */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-mono text-[#B6A6D8] px-2 py-1">
            <span>THÍ SINH ({filteredLeaderboard.length})</span>
            <div className="flex items-center gap-4">
              <span>ĐỘ CHÍNH XÁC</span>
              <span>TỐC ĐỘ TB</span>
              <span className="w-16 text-right">TỔNG ĐIỂM</span>
            </div>
          </div>

          {filteredLeaderboard.length > 0 ? (
            <AnimatePresence initial={false}>
              {filteredLeaderboard.map((item) => {
                const isMe = Boolean(user && (item.uid === user.uid || (user.mssv && item.mssv?.toLowerCase() === user.mssv.toLowerCase())));
                
                return (
                  <motion.div
                    key={item.uid || item.mssv || item.rank}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{
                      layout: { type: 'spring', damping: 25, stiffness: 350 },
                      opacity: { duration: 0.2 }
                    }}
                    className={`p-2.5 sm:p-3 rounded-[3px] border transition flex items-center justify-between gap-2 ${
                      isMe
                        ? 'bg-gradient-to-r from-purple-900/60 via-amber-950/60 to-slate-900/90 border-amber-400 shadow-md ring-1 ring-amber-400/50'
                        : item.rank === 1
                          ? 'bg-amber-950/30 border-amber-500/40 text-white'
                          : item.rank === 2
                            ? 'bg-slate-900/40 border-slate-400/30 text-white'
                            : item.rank === 3
                              ? 'bg-amber-950/20 border-amber-700/30 text-white'
                              : 'fluent-box-nested border-white/5 text-white/90 hover:border-white/20'
                    }`}
                  >
                    {/* Left: Rank & Name */}
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div className={`w-6 h-6 rounded-[2px] font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                        item.rank === 1
                          ? 'bg-yellow-400 text-slate-950 shadow'
                          : item.rank === 2
                            ? 'bg-slate-300 text-slate-950 shadow'
                            : item.rank === 3
                              ? 'bg-amber-600 text-white shadow'
                              : 'bg-white/10 text-white/70'
                      }`}>
                        {item.rank}
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`text-xs font-bold truncate max-w-[120px] sm:max-w-[200px] ${
                            isMe ? 'text-amber-300' : 'text-white'
                          }`}>
                            {item.name}
                          </span>
                          {rankChangesMap.get(item.uid) && (
                            <RankMovementIndicator
                              delta={rankChangesMap.get(item.uid)?.delta}
                              prevRank={rankChangesMap.get(item.uid)?.prevRank}
                              compact
                            />
                          )}
                          {trendsMap.get(item.uid) && (
                            <TrendIndicator
                              trendInfo={trendsMap.get(item.uid)}
                            />
                          )}
                          {isMe && (
                            <span className="px-1.5 py-0.2 rounded-[2px] bg-amber-400 text-slate-950 font-mono font-bold text-[9px]">
                              BẠN
                            </span>
                          )}
                        </div>
                        {item.mssv && (
                          <div className="text-[10px] font-mono text-[#B6A6D8]/70">
                            {item.mssv}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Accuracy, Speed, Points */}
                    <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono">
                      {/* Accuracy */}
                      <div className="text-[11px] text-amber-300 text-right min-w-[36px]">
                        {Math.round(item.accuracyRate)}%
                      </div>

                      {/* Speed Latency */}
                      <div className="text-[11px] text-sky-300 flex items-center gap-0.5 min-w-[42px] justify-end">
                        <Zap className="w-2.5 h-2.5 text-sky-400" />
                        <span>{item.avgLatency > 0 ? `${item.avgLatency.toFixed(1)}s` : '--'}</span>
                      </div>

                      {/* Total Score */}
                      <div className="w-16 text-right">
                        <span className="text-xs sm:text-sm font-black font-mono text-amber-300">
                          {item.totalScore}
                        </span>
                        <span className="text-[10px] text-white/40 ml-0.5">đ</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          ) : (
            <div className="p-8 text-center text-xs font-mono text-white/40 fluent-box-nested rounded-[3px] border border-white/5">
              {searchQuery ? 'Không tìm thấy thí sinh nào khớp với từ khóa tìm kiếm.' : 'Chưa có dữ liệu xếp hạng trong vòng đấu này.'}
            </div>
          )}
        </div>

      </div>

      {/* FOOTER SYNC STATUS */}
      <div className="p-2.5 sm:p-3 bg-[#110522] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#B6A6D8] shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
          </span>
          <span>Đồng bộ máy chủ NTP thời gian thực</span>
        </div>
        <div className="text-[10px] text-white/40">
          Tổng cộng: {sortedLeaderboard.length} khán giả
        </div>
      </div>

    </div>
  );

  if (isEmbedded) {
    return content;
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 select-none animate-fadeIn">
      <div className="fluent-box w-full max-w-2xl rounded-[4px] border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {content}
      </div>
    </div>
  );
};
