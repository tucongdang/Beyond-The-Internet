import React, { useState, useEffect, useMemo } from 'react';
import { GameState, UserInfo, ContestantPrediction, ChampionVote } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { Sparkles, Play, Square, Trophy, AlertCircle, X, Users, Target, Flame, CheckCircle2, Filter, Lock, Unlock, Zap } from 'lucide-react';
import { getUserDisplayUid } from '../utils/uidUtils';
import { getSecureRandomItem } from '../utils/cryptoUtils';

export interface LuckyDrawAdminProps {
  gameState: GameState;
  allResponses: any;
  onExit?: () => void;
}

const DEFAULT_CONTESTANTS = [
  { id: 'team_alpha', name: 'Thí sinh Alpha', color: '#38bdf8' },
  { id: 'team_beta', name: 'Thí sinh Beta', color: '#f43f5e' },
  { id: 'team_gamma', name: 'Thí sinh Gamma', color: '#10b981' },
  { id: 'team_delta', name: 'Thí sinh Delta', color: '#f59e0b' },
];

export const LuckyDrawAdmin: React.FC<LuckyDrawAdminProps> = ({ gameState, allResponses, onExit }) => {
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3500);
  };

  const luckyDraw = gameState.lucky_draw || { status: 'IDLE', winner: null };

  // 4 Filter modes:
  // 1. 'ALL' -> Tất cả khán giả
  // 2. 'CHAMPION_VOTE' -> Khán giả bình chọn đúng Thí sinh Quán quân (Tournament Champion)
  // 3. 'CORRECT_PREDICTION' -> Khán giả đặt điểm tín nhiệm đúng từng câu (Confidence Staking)
  // 4. 'BY_CONTESTANT' -> Khán giả theo Thí sinh cụ thể
  const [filterMode, setFilterMode] = useState<'ALL' | 'CHAMPION_VOTE' | 'CORRECT_PREDICTION' | 'BY_CONTESTANT'>('ALL');
  const [selectedQuestionId, setSelectedQuestionId] = useState<string>(gameState.question_id || 'CURRENT');
  const [selectedContestantId, setSelectedContestantId] = useState<string>('team_alpha');
  const [winningContestantId, setWinningContestantId] = useState<string>('');
  const [championContestantId, setChampionContestantId] = useState<string>(gameState.champion_contestant_id || 'team_alpha');

  // Subscribe to live predictions from confidence staking (per-question micro stakes)
  const [predictionsMap, setPredictionsMap] = useState<Record<string, Record<string, ContestantPrediction>>>(() =>
    syncService.getAllPredictions()
  );

  useEffect(() => {
    return syncService.subscribeToPredictions((preds) => {
      setPredictionsMap(preds);
    });
  }, []);

  // Subscribe to live tournament-level champion votes (overall winner)
  const [championVotesMap, setChampionVotesMap] = useState<Record<string, ChampionVote>>(() =>
    syncService.getChampionVotes()
  );

  useEffect(() => {
    return syncService.subscribeToChampionVotes((votes) => {
      setChampionVotesMap(votes);
    });
  }, []);

  // Sync stage contestant list from gameState.teams
  const contestants = useMemo(() => {
    if (Array.isArray(gameState.teams) && gameState.teams.length > 0) {
      return gameState.teams.map((t, idx) => ({
        id: t.id || `contestant_${idx + 1}`,
        name: t.name || `Thí sinh ${idx + 1}`,
        color: t.color || DEFAULT_CONTESTANTS[idx % DEFAULT_CONTESTANTS.length].color,
      }));
    }
    return DEFAULT_CONTESTANTS;
  }, [gameState.teams]);

  // Keep championContestantId synced with gameState
  useEffect(() => {
    if (gameState.champion_contestant_id) {
      setChampionContestantId(gameState.champion_contestant_id);
    } else if (!championContestantId && contestants.length > 0) {
      setChampionContestantId(contestants[0].id);
    }
  }, [gameState.champion_contestant_id, contestants]);

  // Set default question winner
  useEffect(() => {
    const qId = selectedQuestionId === 'CURRENT' ? gameState.question_id : selectedQuestionId;
    const adminWinners = gameState.stage_winning_contestants?.[qId];
    if (Array.isArray(adminWinners) && adminWinners.length > 0) {
      setWinningContestantId(adminWinners[0]);
    } else if (!winningContestantId && contestants.length > 0) {
      setWinningContestantId(contestants[0].id);
    }
  }, [selectedQuestionId, gameState.question_id, gameState.stage_winning_contestants, contestants]);

  // Handle setting per-question winning contestant
  const handleSelectWinningContestant = (contestantId: string) => {
    setWinningContestantId(contestantId);
    const qId = selectedQuestionId === 'CURRENT' ? gameState.question_id : selectedQuestionId;
    syncService.setStageWinningContestant(qId, [contestantId]);
    notify(`Đã xác nhận ${contestants.find((c) => c.id === contestantId)?.name || contestantId} là thí sinh chiến thắng câu này!`);
  };

  // Handle setting overall champion contestant
  const handleSelectChampionContestant = (contestantId: string) => {
    setChampionContestantId(contestantId);
    syncService.setChampionContestant(contestantId);
    notify(`Đã xác nhận ${contestants.find((c) => c.id === contestantId)?.name || contestantId} là Quán quân chung cuộc!`);
  };

  // Toggle champion vote open/closed (e.g. lock before final round "Về Đích")
  const isChampionVoteOpen = gameState.champion_vote_open !== false;
  const handleToggleChampionVote = () => {
    soundFx.playClick();
    const nextState = !isChampionVoteOpen;
    syncService.toggleChampionVoteOpen(nextState);
    notify(
      nextState
        ? 'Đã MỞ lại cổng Bình chọn Thí sinh Chiến thắng (Quán quân)!'
        : 'Đã KHÓA cổng Bình chọn Thí sinh Chiến thắng (trước vòng Về Đích). Đặt điểm tín nhiệm từng câu vẫn chạy bình thường!'
    );
  };

  // Collect all unique participants across responses, predictions, and champion votes
  const allUsersMap = useMemo(() => {
    const map = new Map<string, UserInfo>();

    // From question responses
    Object.values(allResponses).forEach((qResps: any) => {
      if (qResps && typeof qResps === 'object') {
        Object.values(qResps).forEach((res: any) => {
          if (res?.user_info?.uid) {
            const formatted: UserInfo = {
              ...res.user_info,
              anonymizedUid: getUserDisplayUid(res.user_info),
            };
            map.set(res.user_info.uid, formatted);
          }
        });
      }
    });

    // From confidence staking predictions
    Object.values(predictionsMap).forEach((qPreds) => {
      if (qPreds && typeof qPreds === 'object') {
        Object.values(qPreds).forEach((item) => {
          const pred = item as ContestantPrediction;
          if (pred?.uid && !map.has(pred.uid)) {
            const formatted: UserInfo = {
              uid: pred.uid,
              name: pred.name || 'Khán giả',
              mssv: pred.mssv || '',
              anonymizedUid: getUserDisplayUid({ uid: pred.uid, mssv: pred.mssv, name: pred.name }),
            };
            map.set(pred.uid, formatted);
          }
        });
      }
    });

    // From champion votes
    Object.values(championVotesMap).forEach((item) => {
      const vote = item as ChampionVote;
      if (vote?.uid && !map.has(vote.uid)) {
        const formatted: UserInfo = {
          uid: vote.uid,
          name: vote.name || 'Khán giả',
          mssv: vote.mssv || '',
          anonymizedUid: getUserDisplayUid({ uid: vote.uid, mssv: vote.mssv, name: vote.name }),
        };
        map.set(vote.uid, formatted);
      }
    });

    return map;
  }, [allResponses, predictionsMap, championVotesMap]);

  // Compute eligible candidates based on selected filterMode
  const candidates: UserInfo[] = useMemo(() => {
    if (filterMode === 'ALL') {
      return Array.from(allUsersMap.values());
    }

    // 1. CHAMPION VOTE FILTER: Khán giả bình chọn đúng Quán quân chung cuộc
    if (filterMode === 'CHAMPION_VOTE') {
      const targetChampionId = championContestantId;
      const matchedUids = new Set<string>();

      Object.values(championVotesMap).forEach((item) => {
        const vote = item as ChampionVote;
        if (vote?.contestantId === targetChampionId) {
          matchedUids.add(vote.uid);
        }
      });

      return Array.from(matchedUids)
        .map((uid) => allUsersMap.get(uid))
        .filter((u): u is UserInfo => Boolean(u));
    }

    // 2. CORRECT PREDICTION (Confidence Staking): Khán giả đặt tín nhiệm đúng câu hỏi
    const qId = selectedQuestionId === 'CURRENT' ? gameState.question_id : selectedQuestionId;

    if (filterMode === 'CORRECT_PREDICTION') {
      const targetWinningId = winningContestantId;
      const matchedUids = new Set<string>();

      const checkPred = (pred: ContestantPrediction) => {
        if (targetWinningId) {
          return pred.contestantId === targetWinningId;
        }
        return pred.won === true;
      };

      if (qId === 'ALL') {
        Object.values(predictionsMap).forEach((qPreds) => {
          Object.values(qPreds || {}).forEach((item) => {
            const pred = item as ContestantPrediction;
            if (checkPred(pred)) matchedUids.add(pred.uid);
          });
        });
      } else {
        const qPreds = predictionsMap[qId] || {};
        Object.values(qPreds).forEach((item) => {
          const pred = item as ContestantPrediction;
          if (checkPred(pred)) matchedUids.add(pred.uid);
        });
      }

      return Array.from(matchedUids)
        .map((uid) => allUsersMap.get(uid))
        .filter((u): u is UserInfo => Boolean(u));
    }

    // 3. BY CONTESTANT: Khán giả theo Thí sinh cụ thể (tín nhiệm hoặc bình chọn)
    if (filterMode === 'BY_CONTESTANT') {
      const matchedUids = new Set<string>();

      // Check champion votes
      Object.values(championVotesMap).forEach((item) => {
        const vote = item as ChampionVote;
        if (vote.contestantId === selectedContestantId) {
          matchedUids.add(vote.uid);
        }
      });

      // Check confidence predictions
      if (qId === 'ALL') {
        Object.values(predictionsMap).forEach((qPreds) => {
          Object.values(qPreds || {}).forEach((item) => {
            const pred = item as ContestantPrediction;
            if (pred.contestantId === selectedContestantId) {
              matchedUids.add(pred.uid);
            }
          });
        });
      } else {
        const qPreds = predictionsMap[qId] || {};
        Object.values(qPreds).forEach((item) => {
          const pred = item as ContestantPrediction;
          if (pred.contestantId === selectedContestantId) {
            matchedUids.add(pred.uid);
          }
        });
      }

      return Array.from(matchedUids)
        .map((uid) => allUsersMap.get(uid))
        .filter((u): u is UserInfo => Boolean(u));
    }

    return Array.from(allUsersMap.values());
  }, [
    filterMode,
    allUsersMap,
    championVotesMap,
    championContestantId,
    predictionsMap,
    selectedQuestionId,
    gameState.question_id,
    winningContestantId,
    selectedContestantId,
  ]);

  // Dynamic filter label to display on projector and sync
  const currentFilterLabel = useMemo(() => {
    if (filterMode === 'ALL') {
      return 'Toàn bộ Khán giả tham gia';
    }
    if (filterMode === 'CHAMPION_VOTE') {
      const cName = contestants.find((c) => c.id === championContestantId)?.name || 'Thí sinh Quán quân';
      return `Khán giả bình chọn đúng Quán quân: ${cName}`;
    }
    if (filterMode === 'CORRECT_PREDICTION') {
      const winName = contestants.find((c) => c.id === winningContestantId)?.name || 'Thí sinh chiến thắng';
      return `Khán giả đặt tín nhiệm đúng câu: ${winName}`;
    }
    if (filterMode === 'BY_CONTESTANT') {
      const cName = contestants.find((c) => c.id === selectedContestantId)?.name || 'Thí sinh';
      return `Khán giả ủng hộ ${cName}`;
    }
    return 'Vòng quay may mắn';
  }, [filterMode, championContestantId, winningContestantId, selectedContestantId, contestants]);

  const handleStartSpin = () => {
    if (candidates.length === 0) {
      notify('Không có khán giả nào thỏa điều kiện lọc để quay số!');
      return;
    }
    soundFx.playClick();
    const isPredictor = filterMode === 'CORRECT_PREDICTION';
    const winContestant = contestants.find((c) => c.id === winningContestantId);
    const sampleUids = candidates.slice(0, 25).map((c) => getUserDisplayUid(c));

    syncService.updateGameState({
      lucky_draw: {
        status: 'SPINNING',
        winner: null,
        seed: Date.now(),
        filter_mode: filterMode,
        filter_label: currentFilterLabel,
        eligible_count: candidates.length,
        total_candidates: allUsersMap.size,
        is_predictor_draw: isPredictor,
        winning_contestant_name: winContestant?.name || (filterMode === 'CHAMPION_VOTE' ? contestants.find(c => c.id === championContestantId)?.name : ''),
        winning_contestant_id: winningContestantId,
        sample_uids: sampleUids,
        draw_timestamp: Date.now(),
      },
    });
  };

  const handleStopSpin = () => {
    soundFx.playClick();
    if (candidates.length === 0) {
      notify('Không có khán giả nào thỏa điều kiện lọc để chọn người trúng giải!');
      syncService.updateGameState({
        lucky_draw: {
          status: 'IDLE',
          winner: null,
          filter_mode: filterMode,
          filter_label: currentFilterLabel,
          eligible_count: 0,
        },
      });
      return;
    }
    const selected: UserInfo = getSecureRandomItem<UserInfo>(candidates);
    const winner: UserInfo = {
      ...selected,
      anonymizedUid: getUserDisplayUid(selected),
    };
    const isPredictor = filterMode === 'CORRECT_PREDICTION';
    const winContestant = contestants.find((c) => c.id === winningContestantId);
    const sampleUids = candidates.slice(0, 25).map((c) => getUserDisplayUid(c));

    syncService.updateGameState({
      lucky_draw: {
        status: 'REVEALED',
        winner,
        filter_mode: filterMode,
        filter_label: currentFilterLabel,
        eligible_count: candidates.length,
        total_candidates: allUsersMap.size,
        is_predictor_draw: isPredictor,
        winning_contestant_name: winContestant?.name || (filterMode === 'CHAMPION_VOTE' ? contestants.find(c => c.id === championContestantId)?.name : ''),
        winning_contestant_id: winningContestantId,
        sample_uids: sampleUids,
        draw_timestamp: Date.now(),
      },
    });
    const winnerUidDisplay = getUserDisplayUid(winner);
    // Send direct notification via Firestore to winner
    syncService.sendDirectNotification(
      winner.uid,
      `Chúc mừng bạn (${winner.name} - MSSV: ${winner.mssv || winnerUidDisplay}) đã may mắn trúng giải Lucky Draw (${currentFilterLabel})! Hãy liên hệ Ban tổ chức để nhận quà.`,
      '🎉 TRÚNG GIẢI LUCKY DRAW'
    );
  };

  const handleExitLuckyDraw = () => {
    soundFx.playClick();
    syncService.updateGameState({
      active_module: 'GAME',
      lucky_draw: {
        status: 'IDLE',
        winner: null,
      },
    });
    if (onExit) {
      onExit();
    }
  };

  const handleReset = () => {
    soundFx.playClick();
    syncService.updateGameState({
      lucky_draw: {
        status: 'IDLE',
        winner: null,
        filter_mode: filterMode,
        filter_label: currentFilterLabel,
        eligible_count: candidates.length,
      },
    });
  };

  // Champion votes count per contestant
  const championVotesCount = useMemo(() => {
    const counts: Record<string, number> = {};
    contestants.forEach((c) => {
      counts[c.id] = 0;
    });
    Object.values(championVotesMap).forEach((item) => {
      const v = item as ChampionVote;
      if (counts[v.contestantId] !== undefined) {
        counts[v.contestantId]++;
      }
    });
    return counts;
  }, [contestants, championVotesMap]);

  // Confidence prediction counts per contestant for the current question
  const currentQId = selectedQuestionId === 'CURRENT' ? gameState.question_id : selectedQuestionId;
  const questionPredictions = predictionsMap[currentQId] || {};
  const contestantPredictionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    contestants.forEach((c) => {
      counts[c.id] = 0;
    });
    Object.values(questionPredictions).forEach((item) => {
      const p = item as ContestantPrediction;
      if (counts[p.contestantId] !== undefined) {
        counts[p.contestantId]++;
      }
    });
    return counts;
  }, [contestants, questionPredictions]);

  return (
    <div className="fluent-box border border-white/10 rounded-[2px] p-4 sm:p-6 space-y-6 text-white shadow-2xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5 flex-wrap">
          <h2 className="text-xs uppercase text-white font-bold tracking-widest font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#F7CAC9]" /> QUY TRÌNH QUAY SỐ TRÚNG THƯỞNG
          </h2>
          <span className="px-2 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-400/30">
            MÀN CHIẾU: LUCKY DRAW
          </span>
          <span className="px-2 py-0.5 rounded-[2px] bg-purple-500/20 text-purple-300 font-mono text-[10px] font-bold border border-purple-400/30">
            {currentFilterLabel}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-white/70 text-xs font-mono fluent-box-nested px-3 py-1.5 rounded-[2px] border border-white/10 flex items-center gap-2">
            <span>Ứng viên đủ điều kiện:</span>
            <strong className="text-amber-300 text-sm font-bold">
              {candidates.length} / {allUsersMap.size}
            </strong>
          </div>
          <button
            type="button"
            onClick={handleExitLuckyDraw}
            className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-[2px] font-mono font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md active:scale-95 border border-rose-400/40"
            title="Thoát chế độ quay số và trở về Đấu Trường câu hỏi (Tránh xung đột)"
          >
            <X className="w-3.5 h-3.5" />
            <span>Thoát Quay Số</span>
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS: Tách biệt rõ ràng Bình Chọn Quán Quân vs Đặt Điểm Tín Nhiệm */}
      <div className="fluent-box-nested rounded-[2px] p-4 border border-[#F7CAC9]/25 space-y-4 bg-[#190839]/60">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#F7CAC9]" />
            <span className="text-xs font-bold uppercase tracking-wider text-white font-mono">
              Bộ Lọc Danh Sách Quay Số Trúng Thưởng
            </span>
          </div>
          <span className="text-[11px] text-[#B6A6D8] font-mono">
            {filterMode === 'ALL'
              ? 'Toàn bộ khán giả đã tham gia thi đấu / tương tác'
              : filterMode === 'CHAMPION_VOTE'
              ? 'Lọc khán giả đã bình chọn đúng Thí sinh Quán quân (trước khi khóa cổng)'
              : filterMode === 'CORRECT_PREDICTION'
              ? 'Lọc khán giả đặt điểm tín nhiệm đúng thí sinh ở câu hỏi'
              : 'Lọc khán giả theo Thí sinh được chọn'}
          </span>
        </div>

        {/* 4 Filter Modes Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <button
            type="button"
            onClick={() => {
              setFilterMode('ALL');
              soundFx.playClick();
            }}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-[2px] border text-xs font-mono font-bold transition cursor-pointer ${
              filterMode === 'ALL'
                ? 'bg-[#F7CAC9] text-[#190839] border-[#F7CAC9] shadow-md'
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tất cả khán giả ({allUsersMap.size})</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('CHAMPION_VOTE');
              soundFx.playClick();
            }}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-[2px] border text-xs font-mono font-bold transition cursor-pointer ${
              filterMode === 'CHAMPION_VOTE'
                ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-300/80'
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Trophy className="w-4 h-4 text-amber-500 fill-current" />
            <span>🏆 Bình chọn đúng Quán quân</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('CORRECT_PREDICTION');
              soundFx.playClick();
            }}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-[2px] border text-xs font-mono font-bold transition cursor-pointer ${
              filterMode === 'CORRECT_PREDICTION'
                ? 'bg-sky-400 text-slate-950 border-sky-300 shadow-md ring-2 ring-sky-300/80'
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Zap className="w-4 h-4 text-sky-400" />
            <span>⚡ Predictor Draw (Tín nhiệm)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterMode('BY_CONTESTANT');
              soundFx.playClick();
            }}
            className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-[2px] border text-xs font-mono font-bold transition cursor-pointer ${
              filterMode === 'BY_CONTESTANT'
                ? 'bg-purple-500 text-white border-purple-400 shadow-md'
                : 'bg-white/5 border-white/15 text-white/70 hover:bg-white/10 hover:text-white'
            }`}
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Theo Thí sinh cụ thể</span>
          </button>
        </div>

        {/* SUB-SECTION 1: CHAMPION VOTE FILTER (Tách biệt hoàn toàn) */}
        {filterMode === 'CHAMPION_VOTE' && (
          <div className="pt-3 border-t border-white/10 space-y-3 bg-amber-950/20 p-3 rounded-[2px] border border-amber-500/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-amber-300" />
                <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                  Bình Chọn Thí Sinh Chiến Thắng (Quán Quân Chung Cuộc)
                </span>
              </div>

              {/* Lock/Unlock Switch for Champion Voting before final round */}
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-white/60">
                  Trạng thái cổng:
                </span>
                <button
                  type="button"
                  onClick={handleToggleChampionVote}
                  className={`px-2.5 py-1 rounded-[2px] font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                    isChampionVoteOpen
                      ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 hover:bg-emerald-900/80'
                      : 'bg-rose-950/70 border-rose-400 text-rose-200 hover:bg-rose-900/80'
                  }`}
                  title="Nhấn để Khóa / Mở cổng bình chọn Thí sinh Chiến thắng. Thường khóa trước vòng Về Đích!"
                >
                  {isChampionVoteOpen ? (
                    <>
                      <Unlock className="w-3.5 h-3.5 text-emerald-300" />
                      <span>ĐANG MỞ BÌNH CHỌN</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-rose-300" />
                      <span>ĐÃ KHÓA TRƯỚC VỀ ĐÍCH</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <p className="text-[11px] text-[#B6A6D8] font-mono leading-relaxed">
              💡 <strong>Lưu ý quan trọng:</strong> Cổng bình chọn Thí sinh Chiến thắng này thường được khóa lại trước vòng Về Đích để chốt danh sách dự đoán. Dù cổng này bị khóa, <strong>tính năng Đặt Điểm Tín Nhiệm theo từng câu hỏi vẫn chạy bình thường</strong>!
            </p>

            <div className="pt-1">
              <label className="text-xs text-white/80 font-mono font-bold block mb-2">
                Chọn Thí sinh đạt Quán quân để quay số cho các khán giả đã bình chọn đúng:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {contestants.map((c) => {
                  const isChampion = championContestantId === c.id;
                  const votesCount = championVotesCount[c.id] || 0;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => handleSelectChampionContestant(c.id)}
                      className={`flex items-center justify-between p-2.5 rounded-[2px] border text-xs font-mono transition cursor-pointer ${
                        isChampion
                          ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold ring-2 ring-amber-300/80 shadow-lg'
                          : 'bg-black/40 border-white/15 text-white/70 hover:border-amber-400/50 hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                        <span className="truncate">{c.name}</span>
                      </div>
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-bold ${
                          isChampion ? 'bg-black text-amber-300' : 'bg-white/10 text-white/60'
                        }`}
                      >
                        {votesCount} votes
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* SUB-SECTION 2: CORRECT PREDICTION (Confidence Staking theo từng câu) */}
        {filterMode === 'CORRECT_PREDICTION' && (
          <div className="pt-3 border-t border-white/10 space-y-3 bg-sky-950/20 p-3 rounded-[2px] border border-sky-500/30">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs text-sky-300 font-mono font-bold flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-sky-300" />
                Thí sinh sân khấu đã giải đúng câu hỏi hiện tại:
              </label>
              <span className="text-[11px] text-white/60 font-mono">
                Bấm vào Thí sinh để xác nhận người chiến thắng câu này:
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {contestants.map((c) => {
                const isSelectedWinner = winningContestantId === c.id;
                const count = contestantPredictionCounts[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => handleSelectWinningContestant(c.id)}
                    className={`flex items-center justify-between p-2.5 rounded-[2px] border text-xs font-mono transition cursor-pointer ${
                      isSelectedWinner
                        ? 'bg-sky-400 text-slate-950 border-sky-300 font-bold ring-2 ring-sky-300/80 shadow-lg'
                        : 'bg-black/40 border-white/15 text-white/70 hover:border-sky-500/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="truncate">{c.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-bold ${
                        isSelectedWinner ? 'bg-black text-sky-300' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {count} người đoán
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* SUB-SECTION 3: BY CONTESTANT */}
        {filterMode === 'BY_CONTESTANT' && (
          <div className="pt-2 border-t border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-purple-300 font-mono font-bold flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-purple-300" />
                Chọn Thí sinh để lấy danh sách khán giả đã đặt niềm tin hoặc bình chọn:
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {contestants.map((c) => {
                const isChosen = selectedContestantId === c.id;
                const predCount = contestantPredictionCounts[c.id] || 0;
                const voteCount = championVotesCount[c.id] || 0;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedContestantId(c.id);
                      soundFx.playClick();
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-[2px] border text-xs font-mono transition cursor-pointer ${
                      isChosen
                        ? 'bg-purple-950/70 border-purple-400 text-purple-200 ring-2 ring-purple-400/50 shadow-lg'
                        : 'bg-black/40 border-white/15 text-white/70 hover:border-purple-500/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="font-bold truncate">{c.name}</span>
                    </div>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-[2px] font-bold ${
                        isChosen ? 'bg-purple-400 text-black' : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {predCount + voteCount} ủng hộ
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Candidate Preview Chips */}
        {candidates.length > 0 && (
          <div className="pt-2 border-t border-white/10">
            <div className="text-[11px] font-mono text-white/50 mb-1.5 flex items-center justify-between">
              <span>Danh sách ứng viên trong vòng quay ({candidates.length}):</span>
              {candidates.length > 12 && <span>Hiển thị 12 ứng viên đầu tiên</span>}
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {candidates.slice(0, 16).map((cand) => {
                const userPred = filterMode === 'CORRECT_PREDICTION' ? questionPredictions[cand.uid] : null;
                return (
                  <span
                    key={cand.uid}
                    className="px-2 py-0.5 rounded-[2px] bg-white/10 text-[10px] font-mono text-white/80 border border-white/10 flex items-center gap-1"
                  >
                    <span className="font-bold">{cand.name || 'Khán giả'}</span>
                    <span className="text-white/40">({cand.mssv || getUserDisplayUid(cand)})</span>
                    {userPred?.confidenceLevel !== undefined && (
                      <span className="px-1 rounded-[1px] bg-sky-400/20 text-sky-300 font-bold text-[9px]" title="Mức độ tự tin khi đặt cược">
                        {userPred.confidenceLevel}%
                      </span>
                    )}
                  </span>
                );
              })}
              {candidates.length > 16 && (
                <span className="px-2 py-0.5 rounded-[2px] bg-amber-500/20 text-[10px] font-mono text-amber-300">
                  +{candidates.length - 16} ứng viên khác
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Main Spinning Arena */}
      <div className="flex flex-col items-center justify-center p-8 fluent-box-nested rounded-[2px] min-h-[280px] border border-white/10 bg-gradient-to-b from-[#190839]/80 to-[#0D0420]/90">
        {luckyDraw.status === 'IDLE' && (
          <div className="text-center space-y-4 text-white/60 max-w-md">
            <div className="w-14 h-14 mx-auto rounded-[2px] bg-white/5 border border-white/15 flex items-center justify-center text-[#F7CAC9]">
              <Sparkles className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-white uppercase font-mono tracking-wider">
                {currentFilterLabel}
              </p>
              <p className="text-xs text-[#B6A6D8]">
                Đã sẵn sàng với <strong className="text-amber-300">{candidates.length}</strong> ứng viên hợp lệ. Nhấn nút bên dưới để bắt đầu quay!
              </p>
            </div>
          </div>
        )}

        {luckyDraw.status === 'SPINNING' && (
          <div className="text-center space-y-4 animate-pulse">
            <div className="text-xs font-mono uppercase tracking-[0.2em] text-amber-300">
              {currentFilterLabel}
            </div>
            <div className="text-5xl font-bold font-mono text-white/80 blur-[1px] transition-all">
              XXXXXXXXXX
            </div>
            <p className="text-[#F7CAC9] uppercase tracking-[0.3em] font-mono mt-4 text-sm">
              Đang quay số trong {candidates.length} ứng viên...
            </p>
          </div>
        )}

        {luckyDraw.status === 'REVEALED' && luckyDraw.winner && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 fluent-box text-amber-300 rounded-[2px] border-2 border-amber-400/40 mb-2 shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase text-amber-300 font-bold tracking-widest font-mono">
                {luckyDraw.filter_label || currentFilterLabel}
              </div>
              <div className="text-3xl font-black font-mono text-white fluent-box py-2.5 px-6 rounded-[2px] border-2 border-amber-400/60 inline-block shadow-lg">
                UID: {getUserDisplayUid(luckyDraw.winner)}
              </div>
              <div className="pt-2 text-xs font-mono text-white/70 fluent-box-nested py-1.5 px-4 rounded-[2px] border border-white/10 inline-block">
                🔒 Xác minh BTC: <strong className="text-white">{luckyDraw.winner.name}</strong> - MSSV:{' '}
                <strong className="text-white">{luckyDraw.winner.mssv || 'Không có'}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-center gap-3">
        {luckyDraw.status === 'IDLE' || luckyDraw.status === 'REVEALED' ? (
          <button
            onClick={handleStartSpin}
            disabled={candidates.length === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-[2px] font-bold font-mono text-sm transition cursor-pointer shadow-lg active:scale-95 ${
              candidates.length === 0
                ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/10'
                : 'bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839]'
            }`}
          >
            <Play className="w-4 h-4 fill-current" />{' '}
            {filterMode === 'CORRECT_PREDICTION'
              ? `⚡ BẮT ĐẦU PREDICTOR DRAW (${candidates.length})`
              : `BẮT ĐẦU QUAY (${candidates.length})`}
          </button>
        ) : (
          <button
            onClick={handleStopSpin}
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-[2px] font-bold font-mono text-sm transition cursor-pointer shadow-lg active:scale-95"
          >
            <Square className="w-4 h-4 fill-current" /> DỪNG QUAY & CHỌN NGƯỜI THẮNG
          </button>
        )}

        {luckyDraw.status === 'REVEALED' && (
          <button
            onClick={handleReset}
            className="px-5 py-3 fluent-box hover:bg-white/15 text-white rounded-[2px] font-bold font-mono text-sm transition border border-white/10 cursor-pointer shadow"
          >
            Quay Lại Lượt Này
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed bottom-6 right-6 z-[300] fluent-box border border-amber-500/40 text-amber-200 px-4 py-3 rounded-[2px] shadow-2xl flex items-center gap-2 animate-fadeIn text-sm">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
};
