import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Flame,
  Sparkles,
  CheckCircle2,
  Lock,
  Trophy,
  TrendingUp,
  Zap,
  ShieldCheck,
  Target,
  UserCheck,
  Check,
} from 'lucide-react';
import { GameState, UserInfo, ChampionVote } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { soundFx } from '../services/audioEffects';
import { syncService } from '../services/syncService';
import {
  vibrateTap,
  vibrateSelection,
  vibrateSuccess,
  vibrateSubmit,
} from '../utils/hapticUtils';
import { t } from '../utils/i18n';
import { ConfidenceRangeSlider } from './ConfidenceRangeSlider';
import {
  ContestantPosition,
  StakeLevel,
  AudiencePrediction,
  CONTESTANTS_LIST,
  STAKE_LEVEL_CONFIG,
  savePrediction,
  getPredictionForQuestion,
  getPredictionWinStreak,
} from '../utils/predictionUtils';

export type UnifiedStakingMode = 'PREDICT_BET' | 'CONFIDENCE';

interface ConfidenceStakingProps {
  gameState: GameState;
  user: UserInfo | null;
  className?: string;
  isVeDichRound?: boolean;
  isDoubleDownActive?: boolean;
  hasVotedThisQuestion?: boolean;
  hasDoubleDownSubmitted?: boolean;
  isAnswerCorrectOnReveal?: boolean;
  onActivateDoubleDown?: () => void;
}

interface ContestantOption {
  id: string;
  name: string;
  color: string;
}

interface StakingStorageState {
  balance: number;
  streak: number;
  totalWins: number;
  totalStaked: number;
  defaultConfidenceLevel?: number;
  stakesByQuestion: Record<
    string,
    {
      contestantId: string;
      contestantName: string;
      stakeAmount: number;
      confidenceLevel?: number;
      timestamp: number;
      resolved?: boolean;
      won?: boolean;
      payout?: number;
    }
  >;
}

const STORAGE_KEY = 'bti2027_confidence_staking_v1';
const MODE_STORAGE_KEY = 'bti2027_unified_staking_mode_v1';

const DEFAULT_CONTESTANTS: ContestantOption[] = [
  { id: 'team_alpha', name: 'Thí sinh Alpha', color: '#38bdf8' },
  { id: 'team_beta', name: 'Thí sinh Beta', color: '#f43f5e' },
  { id: 'team_gamma', name: 'Thí sinh Gamma', color: '#10b981' },
  { id: 'team_delta', name: 'Thí sinh Delta', color: '#f59e0b' },
];

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function loadStakingState(): StakingStorageState {
  if (typeof window === 'undefined') {
    return { balance: 10, streak: 0, totalWins: 0, totalStaked: 0, defaultConfidenceLevel: 75, stakesByQuestion: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        balance: typeof parsed.balance === 'number' ? Math.max(1, parsed.balance) : 10,
        streak: typeof parsed.streak === 'number' ? parsed.streak : 0,
        totalWins: typeof parsed.totalWins === 'number' ? parsed.totalWins : 0,
        totalStaked: typeof parsed.totalStaked === 'number' ? parsed.totalStaked : 0,
        defaultConfidenceLevel: typeof parsed.defaultConfidenceLevel === 'number' ? parsed.defaultConfidenceLevel : 75,
        stakesByQuestion: parsed.stakesByQuestion || {},
      };
    }
  } catch {
    // ignore storage errors
  }
  return { balance: 10, streak: 0, totalWins: 0, totalStaked: 0, defaultConfidenceLevel: 75, stakesByQuestion: {} };
}

function saveStakingState(state: StakingStorageState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore storage errors
  }
}

export const ConfidenceStaking: React.FC<ConfidenceStakingProps> = ({
  gameState,
  user,
  className = '',
  isVeDichRound = false,
  isDoubleDownActive = false,
  hasVotedThisQuestion = false,
  hasDoubleDownSubmitted = false,
  isAnswerCorrectOnReveal = false,
  onActivateDoubleDown,
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';

  const questionId = String(gameState.question_id || gameState.round_name || 'q_default');
  const status = gameState.status;

  // Unified single-switch mode: 'PREDICT_BET' (Dự đoán & Đặt cược) vs 'CONFIDENCE' (Đặt tín nhiệm thí sinh)
  const [activeMode, setActiveMode] = useState<UnifiedStakingMode>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(MODE_STORAGE_KEY);
        if (saved === 'PREDICT_BET' || saved === 'CONFIDENCE') {
          return saved;
        }
      } catch {
        // ignore storage errors
      }
    }
    return 'CONFIDENCE';
  });

  const handleToggleMode = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    setActiveMode((prev) => {
      const next: UnifiedStakingMode = prev === 'CONFIDENCE' ? 'PREDICT_BET' : 'CONFIDENCE';
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(MODE_STORAGE_KEY, next);
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  // ==============================================================
  // PART A: CONFIDENCE STAKING STATE (Đặt Điểm Tín Nhiệm Thí Sinh)
  // ==============================================================
  const [stakingState, setStakingState] = useState<StakingStorageState>(() => loadStakingState());
  const [justStakedPulse, setJustStakedPulse] = useState(false);

  const contestants: ContestantOption[] = useMemo(() => {
    if (Array.isArray(gameState.teams) && gameState.teams.length > 0) {
      return gameState.teams.map((tItem, idx) => ({
        id: tItem.id || `contestant_${idx + 1}`,
        name: tItem.name || `Thí sinh ${idx + 1}`,
        color: tItem.color || DEFAULT_CONTESTANTS[idx % DEFAULT_CONTESTANTS.length].color,
      }));
    }
    return DEFAULT_CONTESTANTS;
  }, [gameState.teams]);

  const currentStake = stakingState.stakesByQuestion[questionId] || null;

  const [confidenceLevel, setConfidenceLevel] = useState<number>(() => {
    return currentStake?.confidenceLevel ?? stakingState.defaultConfidenceLevel ?? 75;
  });

  useEffect(() => {
    if (currentStake?.confidenceLevel !== undefined) {
      setConfidenceLevel(currentStake.confidenceLevel);
    } else {
      setConfidenceLevel(stakingState.defaultConfidenceLevel ?? 75);
    }
  }, [questionId, currentStake?.confidenceLevel, stakingState.defaultConfidenceLevel]);

  const crowdDistribution = useMemo(() => {
    const weights = contestants.map((c, idx) => {
      const seed = hashCode(`${questionId}_${c.id}_${idx}`);
      const baseWeight = 18 + (seed % 35);
      const userBonus = currentStake?.contestantId === c.id ? 12 : 0;
      return baseWeight + userBonus;
    });
    const totalWeight = weights.reduce((acc, w) => acc + w, 0) || 1;
    return contestants.reduce<Record<string, number>>((acc, c, idx) => {
      acc[c.id] = Math.round((weights[idx] / totalWeight) * 100);
      return acc;
    }, {});
  }, [contestants, questionId, currentStake?.contestantId]);

  const successfulContestantIds = useMemo(() => {
    if (status !== 'REVEAL') return new Set<string>();
    const adminWinners = gameState.stage_winning_contestants?.[questionId];
    if (Array.isArray(adminWinners) && adminWinners.length > 0) {
      return new Set<string>(adminWinners);
    }
    const winners = new Set<string>();
    contestants.forEach((c, idx) => {
      const seed = hashCode(`reveal_${questionId}_${c.id}_${gameState.correct_key || 'A'}`);
      if (seed % 10 < 7 || idx === hashCode(questionId) % contestants.length) {
        winners.add(c.id);
      }
    });
    return winners;
  }, [status, contestants, questionId, gameState.correct_key, gameState.stage_winning_contestants]);

  // Resolve payout automatically on REVEAL regardless of which switch tab is currently active
  useEffect(() => {
    if (status !== 'REVEAL') return;
    const existing = stakingState.stakesByQuestion[questionId];
    if (!existing || existing.resolved) return;

    const didWin = successfulContestantIds.has(existing.contestantId);
    const existingLevel = existing.confidenceLevel ?? 75;
    const convictionBonus = didWin && existingLevel >= 75 ? 1 : 0;
    const reward = didWin ? existing.stakeAmount * 2 + convictionBonus : 0;

    const nextState: StakingStorageState = {
      ...stakingState,
      balance: Math.max(1, stakingState.balance + reward),
      streak: didWin ? stakingState.streak + 1 : 0,
      totalWins: didWin ? stakingState.totalWins + 1 : stakingState.totalWins,
      stakesByQuestion: {
        ...stakingState.stakesByQuestion,
        [questionId]: {
          ...existing,
          resolved: true,
          won: didWin,
          payout: reward,
        },
      },
    };

    setStakingState(nextState);
    saveStakingState(nextState);

    const uid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('BTI_ANON_UID') || `anon_${Date.now()}` : 'anon');
    syncService
      .submitContestantPrediction({
        questionId,
        contestantId: existing.contestantId,
        contestantName: existing.contestantName,
        uid,
        name: user?.name || (user?.mssv ? `Thí sinh ${user.mssv}` : 'Khán giả'),
        mssv: user?.mssv || '',
        stakeAmount: existing.stakeAmount,
        confidenceLevel: existing.confidenceLevel ?? 75,
        timestamp: existing.timestamp,
        won: didWin,
      })
      .catch((err) => {
        console.warn('[ConfidenceStaking] Sync resolved prediction skipped:', err);
      });

    if (didWin) {
      vibrateSuccess();
    }
  }, [status, questionId, stakingState, successfulContestantIds, user]);

  const isConfidenceStakingOpen = status === 'ACTIVE' && gameState.confidence_staking_open !== false;

  const handleConfidenceLevelChange = (newVal: number) => {
    setConfidenceLevel(newVal);
    if (currentStake && isConfidenceStakingOpen) {
      const updatedStake = {
        ...currentStake,
        confidenceLevel: newVal,
      };
      const nextState: StakingStorageState = {
        ...stakingState,
        defaultConfidenceLevel: newVal,
        stakesByQuestion: {
          ...stakingState.stakesByQuestion,
          [questionId]: updatedStake,
        },
      };
      setStakingState(nextState);
      saveStakingState(nextState);

      const uid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('BTI_ANON_UID') || `anon_${Date.now()}` : 'anon');
      syncService
        .submitContestantPrediction({
          questionId,
          contestantId: currentStake.contestantId,
          contestantName: currentStake.contestantName,
          uid,
          name: user?.name || (user?.mssv ? `Thí sinh ${user.mssv}` : 'Khán giả'),
          mssv: user?.mssv || '',
          stakeAmount: currentStake.stakeAmount,
          confidenceLevel: newVal,
          timestamp: currentStake.timestamp,
          won: false,
        })
        .catch((err: any) => {
          if (err?.message === 'OFFLINE_MODE_DISABLED') {
            setConfidenceErrorNotice(
              isVi
                ? 'Đang mất kết nối và Chế độ Ngoại tuyến đang tắt — không thể đồng bộ mức tự tin lên máy chủ.'
                : 'Connection lost while Offline Mode is off — unable to sync confidence level.'
            );
            setTimeout(() => setConfidenceErrorNotice(null), 3500);
          }
        });
    } else {
      const nextState: StakingStorageState = {
        ...stakingState,
        defaultConfidenceLevel: newVal,
      };
      setStakingState(nextState);
      saveStakingState(nextState);
    }
  };

  const handlePlaceStake = (contestant: ContestantOption) => {
    if (!isConfidenceStakingOpen) return;
    if (currentStake?.contestantId === contestant.id) return;

    vibrateSelection();
    soundFx.playClick();

    const isChangingPick = Boolean(currentStake);
    const stakeCost = 1;
    const nextBalance = isChangingPick
      ? stakingState.balance
      : Math.max(0, stakingState.balance - stakeCost);

    const now = Date.now();
    const nextState: StakingStorageState = {
      ...stakingState,
      balance: nextBalance,
      defaultConfidenceLevel: confidenceLevel,
      totalStaked: isChangingPick ? stakingState.totalStaked : stakingState.totalStaked + 1,
      stakesByQuestion: {
        ...stakingState.stakesByQuestion,
        [questionId]: {
          contestantId: contestant.id,
          contestantName: contestant.name,
          stakeAmount: 1,
          confidenceLevel: confidenceLevel,
          timestamp: now,
          resolved: false,
        },
      },
    };

    setStakingState(nextState);
    saveStakingState(nextState);
    setJustStakedPulse(true);
    setTimeout(() => setJustStakedPulse(false), 700);

    const uid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('BTI_ANON_UID') || `anon_${now}` : 'anon');
    syncService
      .submitContestantPrediction({
        questionId,
        contestantId: contestant.id,
        contestantName: contestant.name,
        uid,
        name: user?.name || (user?.mssv ? `Thí sinh ${user.mssv}` : 'Khán giả'),
        mssv: user?.mssv || '',
        stakeAmount: 1,
        confidenceLevel: confidenceLevel,
        timestamp: now,
        won: false,
      })
      .catch((err: any) => {
        soundFx.playError();
        setConfidenceErrorNotice(
          err?.message === 'OFFLINE_MODE_DISABLED'
            ? isVi
              ? 'Đang mất kết nối và Chế độ Ngoại tuyến đang tắt. Vui lòng kiểm tra mạng hoặc bật Chế độ Ngoại tuyến.'
              : 'Connection lost while Offline Mode is disabled. Please check your network or enable Offline Mode.'
            : isVi
            ? 'Không thể đồng bộ tín nhiệm lên máy chủ lúc này.'
            : 'Unable to sync confidence stake right now.'
        );
        setTimeout(() => setConfidenceErrorNotice(null), 4000);
      });
  };

  // ==============================================================
  // PART B: PREDICTION, BETTING & CHAMPION VOTE STATE
  // ==============================================================
  const [selectedPosition, setSelectedPosition] = useState<ContestantPosition | null>(1);
  const [selectedStake, setSelectedStake] = useState<StakeLevel>('BALANCED');
  const [activePrediction, setActivePrediction] = useState<AudiencePrediction | null>(() =>
    getPredictionForQuestion(questionId)
  );
  const [predictionStreak, setPredictionStreak] = useState<number>(() => getPredictionWinStreak());
  const [justPredictedToast, setJustPredictedToast] = useState<boolean>(false);

  // Sync prediction state when active question changes or updated externally
  useEffect(() => {
    const existing = getPredictionForQuestion(questionId);
    setActivePrediction(existing);
    if (existing) {
      setSelectedPosition(existing.contestantPosition);
      setSelectedStake(existing.stakeLevel);
    }
  }, [questionId]);

  useEffect(() => {
    const handleUpdate = () => {
      setActivePrediction(getPredictionForQuestion(questionId));
      setPredictionStreak(getPredictionWinStreak());
    };
    window.addEventListener('bti-prediction-updated', handleUpdate);
    return () => window.removeEventListener('bti-prediction-updated', handleUpdate);
  }, [questionId]);

  const consensusPercentages = useMemo(() => {
    const seed = questionId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const p1 = 20 + (seed % 25);
    const p2 = 15 + ((seed * 3) % 30);
    const p3 = 10 + ((seed * 7) % 25);
    const p4 = Math.max(5, 100 - (p1 + p2 + p3));
    return { 1: p1, 2: p2, 3: p3, 4: p4 };
  }, [questionId]);

  const handleSubmitPrediction = useCallback(() => {
    if (!selectedPosition) return;
    soundFx.playSuccess();
    vibrateSubmit();
    const config = STAKE_LEVEL_CONFIG[selectedStake];
    const newPrediction: AudiencePrediction = {
      questionId,
      roundName: gameState?.round_name || 'Khởi động',
      contestantPosition: selectedPosition,
      stakeLevel: selectedStake,
      multiplier: config.multiplier,
      stakedPoints: config.pointsCost,
      timestamp: new Date().toISOString(),
    };
    savePrediction(newPrediction);
    setActivePrediction(newPrediction);
    setJustPredictedToast(true);
    setTimeout(() => setJustPredictedToast(false), 3000);
  }, [selectedPosition, selectedStake, questionId, gameState?.round_name]);

  const selectedPredictContestant = useMemo(() => {
    return CONTESTANTS_LIST.find((c) => c.id === selectedPosition) || CONTESTANTS_LIST[0];
  }, [selectedPosition]);

  // Integrated Champion Vote synced live with syncService
  const isChampionVoteOpen = gameState.champion_vote_open !== false;
  const [championVotesMap, setChampionVotesMap] = useState<Record<string, ChampionVote>>(() =>
    syncService.getChampionVotes()
  );
  const [championVoteNotice, setChampionVoteNotice] = useState<string | null>(null);
  const [confidenceErrorNotice, setConfidenceErrorNotice] = useState<string | null>(null);

  useEffect(() => {
    return syncService.subscribeToChampionVotes((votes) => {
      setChampionVotesMap(votes);
    });
  }, []);

  const myUid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('BTI_ANON_UID') || '' : '');
  const myChampionVote = myUid ? championVotesMap[myUid] : null;
  const totalChampionVotes = Object.keys(championVotesMap).length;

  const championVoteStats = useMemo(() => {
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
    const percentages: Record<string, number> = {};
    contestants.forEach((c) => {
      percentages[c.id] = totalChampionVotes > 0 ? Math.round((counts[c.id] / totalChampionVotes) * 100) : 0;
    });
    return { counts, percentages };
  }, [contestants, championVotesMap, totalChampionVotes]);

  const handleChampionVote = async (contestant: ContestantOption) => {
    if (!isChampionVoteOpen) {
      vibrateTap();
      setChampionVoteNotice(
        isVi
          ? 'Cổng bình chọn Quán quân đã khóa trước vòng Về Đích.'
          : 'Champion voting is locked before the Finale.'
      );
      setTimeout(() => setChampionVoteNotice(null), 3000);
      return;
    }

    vibrateSelection();
    soundFx.playClick();

    const uid = myUid || `anon_${Date.now()}`;
    const vote: ChampionVote = {
      uid,
      name: user?.name || (user?.mssv ? `Thí sinh ${user.mssv}` : 'Khán giả'),
      mssv: user?.mssv || '',
      contestantId: contestant.id,
      contestantName: contestant.name,
      timestamp: Date.now(),
    };
    try {
      const ok = await syncService.submitChampionVote(vote);
      if (ok) {
        vibrateSuccess();
        setChampionVoteNotice(
          isVi
            ? `Đã bình chọn Quán quân: ${contestant.name}`
            : `Champion vote recorded: ${contestant.name}`
        );
        setTimeout(() => setChampionVoteNotice(null), 2500);
      }
    } catch (err: any) {
      soundFx.playError();
      setChampionVoteNotice(
        err?.message === 'OFFLINE_MODE_DISABLED'
          ? isVi
            ? 'Đang mất kết nối và Chế độ Ngoại tuyến đang tắt. Kiểm tra mạng hoặc bật Chế độ Ngoại tuyến để gửi bình chọn.'
            : 'Connection lost while Offline Mode is off. Check your network or enable Offline Mode to vote.'
          : isVi
          ? 'Không thể gửi bình chọn Quán quân lúc này. Vui lòng thử lại.'
          : 'Unable to submit champion vote right now. Please try again.'
      );
      setTimeout(() => setChampionVoteNotice(null), 4000);
    }
  };

  const cheeredContestantId = user?.teamId;

  return (
    <section
      id="audience-confidence-staking"
      aria-label={isVi ? 'Trung tâm Dự đoán, Đặt cược & Tín nhiệm Thí sinh' : 'Prediction, Betting & Confidence Staking Hub'}
      className={`fluent-box rounded-[2px] p-3.5 sm:p-4 border transition-all duration-300 ${
        justStakedPulse
          ? 'border-[#F7CAC9] shadow-[0_0_24px_rgba(247,202,201,0.28)]'
          : 'border-[#F7CAC9]/30 bg-gradient-to-br from-[#190839]/90 via-[#12062c]/95 to-[#0D0420]/95'
      } ${className}`}
    >
      {/* Unified Header Row with Single Mode Toggle Switch */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[2px] bg-[#F7CAC9]/15 border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shrink-0">
            {activeMode === 'CONFIDENCE' ? (
              <Flame className="w-4 h-4 text-[#F7CAC9]" />
            ) : (
              <Target className="w-4 h-4 text-amber-300" />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight uppercase">
                {activeMode === 'CONFIDENCE'
                  ? isVi
                    ? 'Đặt Điểm Tín Nhiệm Thí Sinh'
                    : 'Contestant Confidence Staking'
                  : isVi
                  ? 'Dự Đoán & Đặt Cược'
                  : 'Prediction & Betting'}
              </h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-[#F7CAC9]/15 text-[#F7CAC9] border border-[#F7CAC9]/30">
                {activeMode === 'CONFIDENCE'
                  ? isVi
                    ? 'Tín nhiệm +2đ'
                    : 'Stake +2 pts'
                  : isVeDichRound
                  ? isVi
                    ? 'Ngôi sao +80/-40đ & Cược x3'
                    : 'Star +80/-40 & Bet x3'
                  : isVi
                  ? 'Cược hệ số x3.0'
                  : 'Bet x3.0'}
              </span>
              {activeMode === 'CONFIDENCE' && gameState.champion_vote_open === false && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  {isVi ? '✓ Tín nhiệm vẫn chạy' : '✓ Runs independently'}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Single Toggle Switch + Quick Status Balance */}
        <div className="flex items-center gap-2 flex-wrap shrink-0">
          <button
            id="btn-unified-staking-mode-switch"
            type="button"
            role="switch"
            aria-checked={activeMode === 'CONFIDENCE'}
            aria-label={
              isVi
                ? 'Công tắc chuyển đổi giữa Dự đoán & Đặt cược và Đặt tín nhiệm thí sinh'
                : 'Switch between Prediction & Betting and Confidence Staking'
            }
            onClick={handleToggleMode}
            className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[3px] bg-black/50 hover:bg-black/70 border border-white/20 hover:border-[#F7CAC9]/60 transition cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F7CAC9]"
            title={
              isVi
                ? 'Gạt công tắc để chuyển giữa Dự đoán & Đặt cược và Tín nhiệm thí sinh'
                : 'Flip switch between Prediction & Betting and Confidence Staking'
            }
          >
            <span
              className={`text-[11px] font-mono font-bold transition-colors ${
                activeMode === 'PREDICT_BET' ? 'text-amber-300' : 'text-white/55'
              }`}
            >
              {isVi ? 'Dự đoán & Cược' : 'Predict & Bet'}
            </span>
            <span
              aria-hidden="true"
              className={`relative inline-flex h-5 w-10 shrink-0 items-center rounded-full border transition-colors duration-200 ${
                activeMode === 'CONFIDENCE'
                  ? 'bg-[#F7CAC9]/25 border-[#F7CAC9]'
                  : 'bg-amber-500/25 border-amber-400'
              }`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 rounded-full shadow transition-transform duration-200 ${
                  activeMode === 'CONFIDENCE'
                    ? 'translate-x-5 bg-[#F7CAC9]'
                    : 'translate-x-1 bg-amber-300'
                }`}
              />
            </span>
            <span
              className={`text-[11px] font-mono font-bold transition-colors ${
                activeMode === 'CONFIDENCE' ? 'text-[#F7CAC9]' : 'text-white/55'
              }`}
            >
              {isVi ? 'Tín nhiệm' : 'Confidence'}
            </span>
          </button>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <div
              className="px-2 py-1 rounded-[2px] bg-black/40 border border-amber-400/35 text-amber-300 font-bold flex items-center gap-1"
              title={isVi ? 'Số điểm tín nhiệm ảo hiện có của bạn' : 'Your virtual confidence points'}
            >
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>
                {stakingState.balance} {isVi ? 'ĐTN' : 'CP'}
              </span>
            </div>
            {(activeMode === 'CONFIDENCE' ? stakingState.streak : predictionStreak) > 0 && (
              <div className="px-2 py-1 rounded-[2px] bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 font-bold flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-emerald-400" />
                <span>x{activeMode === 'CONFIDENCE' ? stakingState.streak : predictionStreak}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================= */}
      {/* VIEW 1: DỰ ĐOÁN & ĐẶT CƯỢC (PREDICT_BET)                         */}
      {/* ================================================================= */}
      {activeMode === 'PREDICT_BET' ? (
        <div id="unified-panel-predict-bet" className="space-y-3.5 text-xs animate-fadeIn">
          {/* A. Round 4 (Về Đích) Double Down / Ngôi Sao Hy Vọng Betting */}
          {isVeDichRound && (
            <div
              className={`p-3 rounded-[2px] border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isDoubleDownActive || hasDoubleDownSubmitted
                  ? 'bg-amber-500/20 border-amber-400 text-amber-100 shadow-[0_0_20px_rgba(251,191,36,0.25)]'
                  : 'bg-black/35 border-amber-400/30 text-slate-200 hover:border-amber-400/60'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-[2px] shrink-0 ${
                    isDoubleDownActive || hasDoubleDownSubmitted
                      ? 'bg-amber-400 text-black font-black animate-pulse'
                      : 'bg-white/10 text-amber-400'
                  }`}
                >
                  <Flame className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-xs text-white tracking-wide">
                      {t('view_bet_title', localLanguage)}
                    </span>
                    {(isDoubleDownActive || hasDoubleDownSubmitted) && (
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 bg-amber-400 text-black rounded-[2px] flex items-center gap-1 shadow-sm">
                        <Lock className="w-3 h-3" />
                        {t('view_bet_locked_badge', localLanguage)}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-amber-200/90 leading-tight mt-0.5">
                    {status === 'REVEAL' && hasDoubleDownSubmitted
                      ? `${t('view_bet_reveal_badge', localLanguage)} ${
                          isAnswerCorrectOnReveal
                            ? t('view_bet_outcome_win', localLanguage)
                            : t('view_bet_outcome_loss', localLanguage)
                        }`
                      : isDoubleDownActive || hasDoubleDownSubmitted
                      ? t('view_bet_desc_locked', localLanguage)
                      : t('view_bet_desc_default', localLanguage)}
                  </p>
                </div>
              </div>

              {status === 'ACTIVE' && onActivateDoubleDown && (
                <button
                  id="btn-unified-activate-double-down"
                  type="button"
                  disabled={isDoubleDownActive || hasVotedThisQuestion}
                  aria-label={
                    isDoubleDownActive
                      ? t('view_bet_btn_locked', localLanguage)
                      : t('view_bet_btn_action', localLanguage)
                  }
                  aria-pressed={isDoubleDownActive}
                  onClick={onActivateDoubleDown}
                  className={`px-3.5 py-2 rounded-[2px] font-mono font-black text-xs transition border shrink-0 text-center flex items-center justify-center gap-1.5 ${
                    isDoubleDownActive
                      ? 'bg-amber-400 text-black border-amber-300 shadow-md cursor-not-allowed opacity-95'
                      : hasVotedThisQuestion
                      ? 'bg-white/10 text-white/50 border-white/15 cursor-not-allowed opacity-60'
                      : 'bg-gradient-to-r from-amber-500 to-amber-400 text-black border-amber-300 hover:from-amber-400 hover:to-amber-300 cursor-pointer shadow-lg active:scale-95'
                  }`}
                >
                  {isDoubleDownActive && <Lock className="w-3.5 h-3.5" />}
                  {isDoubleDownActive
                    ? t('view_bet_btn_locked', localLanguage)
                    : t('view_bet_btn_action', localLanguage)}
                </button>
              )}
            </div>
          )}

          {/* Active Staked Prediction Confirmation */}
          {activePrediction && (
            <div className="p-2.5 rounded-[2px] bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex items-center justify-between gap-3 font-mono">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold block text-white text-[11px]">
                    {isVi ? 'ĐÃ DỰ ĐOÁN THÍ SINH:' : 'PREDICTED CONTESTANT:'}{' '}
                    {CONTESTANTS_LIST.find((c) => c.id === activePrediction.contestantPosition)?.nameVi}
                  </span>
                  <span className="text-[10px] text-emerald-300">
                    {isVi
                      ? `Hệ số nhân x${activePrediction.multiplier} • Mức ${activePrediction.stakeLevel}`
                      : `Multiplier x${activePrediction.multiplier} • ${activePrediction.stakeLevel}`}
                  </span>
                </div>
              </div>
              <span className="px-2 py-1 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-bold text-xs shrink-0">
                x{activePrediction.multiplier}
              </span>
            </div>
          )}

          {/* B. Stage Contestant Prediction (4 Positions + Multiplier Stake) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-[#F7CAC9]" />
                <span>{isVi ? '1. Dự đoán Thí sinh trả lời đúng' : '1. Predict Winning Contestant'}</span>
              </span>
              <span className="text-white/40">{isVi ? '4 Vị trí sân khấu' : '4 Stage Positions'}</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CONTESTANTS_LIST.map((contestant) => {
                const isSelected = selectedPosition === contestant.id;
                const pct = (consensusPercentages as Record<number, number>)[contestant.id] || 25;

                return (
                  <button
                    key={contestant.id}
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      vibrateSelection();
                      setSelectedPosition(contestant.id);
                    }}
                    className={`p-2.5 rounded-[2px] border text-left flex flex-col justify-between gap-1.5 transition cursor-pointer active:scale-98 ${
                      isSelected
                        ? 'bg-[#F7CAC9]/20 border-[#F7CAC9] shadow-md shadow-purple-950/50'
                        : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-5 h-5 rounded-[2px] font-mono font-bold text-[10px] flex items-center justify-center text-slate-950 shrink-0"
                          style={{ backgroundColor: contestant.color }}
                        >
                          {contestant.badge}
                        </span>
                        <span className="font-mono font-bold text-white text-[11px] truncate">
                          {isVi ? contestant.nameVi : contestant.nameEn}
                        </span>
                      </div>
                      {isSelected && <Check className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0" />}
                    </div>

                    <div className="space-y-1 pt-1 border-t border-white/5">
                      <div className="flex items-center justify-between text-[9px] font-mono text-white/60">
                        <span>{isVi ? 'Hội trường:' : 'Hall:'}</span>
                        <span className="font-bold text-sky-300 tabular-nums">{pct}%</span>
                      </div>
                      <div className="w-full h-1 bg-black/40 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-sky-400 to-[#F7CAC9] transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end pt-1">
            <div className="md:col-span-8 space-y-1.5">
              <div className="text-[11px] font-mono font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>{isVi ? '2. Chọn mức đặt cược hệ số' : '2. Select Betting Multiplier'}</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(STAKE_LEVEL_CONFIG) as StakeLevel[]).map((level) => {
                  const config = STAKE_LEVEL_CONFIG[level];
                  const isSelected = selectedStake === level;
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        vibrateSelection();
                        setSelectedStake(level);
                      }}
                      className={`p-2 rounded-[2px] border text-center flex flex-col items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 ${
                        isSelected
                          ? `${config.colorClass} shadow-md`
                          : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      <span className="font-mono font-bold text-[11px]">
                        {isVi ? config.labelVi : config.labelEn}
                      </span>
                      <span className="text-[10px] font-mono opacity-80">{config.pointsCost} pts</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-4">
              <button
                id="btn-unified-confirm-prediction"
                type="button"
                onClick={handleSubmitPrediction}
                disabled={!selectedPosition}
                className="w-full py-2.5 px-3 rounded-[2px] bg-[#F7CAC9] hover:bg-white text-[#190839] font-mono font-black text-xs uppercase tracking-wider transition cursor-pointer active:scale-98 shadow-lg shadow-purple-950/60 flex items-center justify-center gap-1.5 border border-[#F7CAC9]"
              >
                <Sparkles className="w-3.5 h-3.5 text-[#190839] shrink-0" />
                <span className="truncate">
                  {activePrediction
                    ? isVi
                      ? 'Cập nhật Cược'
                      : 'Update Stake'
                    : isVi
                    ? `Chốt Cược (${selectedPredictContestant.badge})`
                    : `Confirm (${selectedPredictContestant.badge})`}
                </span>
              </button>
            </div>
          </div>

          {justPredictedToast && (
            <div className="p-2 rounded-[2px] bg-emerald-500/20 border border-emerald-400/50 text-emerald-300 text-xs font-mono font-bold text-center flex items-center justify-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400" />
              <span>{isVi ? 'Đã lưu dự đoán & đặt cược thành công!' : 'Prediction stake recorded!'}</span>
            </div>
          )}

          {/* C. Integrated Quick Champion Vote Strip */}
          <div className="pt-2.5 border-t border-white/10 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono">
              <span className="font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>{isVi ? '3. Bình chọn Quán quân chung cuộc' : '3. Vote for Match Champion'}</span>
              </span>
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-[2px] border ${
                isChampionVoteOpen
                  ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40'
                  : 'bg-amber-950/50 text-amber-300 border-amber-500/40'
              }`}>
                {isChampionVoteOpen
                  ? isVi
                    ? `Đang mở · ${totalChampionVotes} phiếu`
                    : `Open · ${totalChampionVotes} votes`
                  : isVi
                  ? 'Đã khóa cổng'
                  : 'Locked'}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {contestants.map((c) => {
                const isChampSelected = myChampionVote?.contestantId === c.id;
                const pct = championVoteStats.percentages[c.id] || 0;
                return (
                  <button
                    key={`champ_${c.id}`}
                    type="button"
                    disabled={!isChampionVoteOpen && !isChampSelected}
                    onClick={() => handleChampionVote(c)}
                    className={`p-2 rounded-[2px] border text-left transition flex items-center justify-between gap-1.5 ${
                      isChampSelected
                        ? 'bg-amber-500/20 border-amber-400 text-white'
                        : isChampionVoteOpen
                        ? 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-amber-400/40 text-white/85 cursor-pointer'
                        : 'bg-white/5 border-white/10 text-white/45 cursor-not-allowed opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <span className="text-[11px] font-bold truncate">{c.name}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                      {isChampSelected ? '★ ' : ''}
                      {pct}%
                    </span>
                  </button>
                );
              })}
            </div>

            {championVoteNotice && (
              <div className="text-[11px] font-mono text-amber-200 bg-amber-500/15 border border-amber-400/35 px-2.5 py-1.5 rounded-[2px]">
                {championVoteNotice}
              </div>
            )}
          </div>

          <div className="p-2 rounded-[2px] bg-white/[0.02] border border-white/10 text-[10px] font-mono text-white/50 flex items-center justify-between">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>{isVi ? 'Hệ thống khảo thí công bằng BTI 2027' : 'BTI 2027 Fair Play System'}</span>
            </span>
            <span>{isVi ? 'Không mất điểm dự đoán khi sai' : 'No penalty on wrong prediction'}</span>
          </div>
        </div>
      ) : (
        /* ================================================================= */
        /* VIEW 2: ĐẶT TÍN NHIỆM THÍ SINH (CONFIDENCE STAKING)                */
        /* ================================================================= */
        <div id="unified-panel-confidence" className="animate-fadeIn">
          <p className="text-[11px] text-[#B6A6D8] leading-snug mb-3">
            {status === 'STANDBY'
              ? isVi
                ? 'Sẵn sàng đặt 1 điểm tín nhiệm ngay khi câu hỏi bắt đầu (chỉnh mức tự tin trước bên dưới).'
                : 'Ready to stake 1 confidence point once the active question begins.'
              : isConfidenceStakingOpen
              ? isVi
                ? 'Chọn 1 thí sinh bạn tin sẽ giải đúng câu này để đặt 1 điểm tín nhiệm (tự do thay đổi trước khi chốt)!'
                : 'Place 1 virtual confidence point on a contestant (you can switch anytime before cutoff)!'
              : status === 'ACTIVE' && gameState.confidence_staking_open === false
              ? isVi
                ? gameState.confidence_staking_cutoff_notice ||
                  'Ban Tổ Chức đã chốt danh sách dự đoán tín nhiệm câu này! Đang chờ kết quả...'
                : 'Confidence predictions closed by organizers!'
              : status === 'LOCKED'
              ? isVi
                ? 'Đã khóa sổ dự đoán — cùng chờ xem thí sinh bạn chọn có vượt qua câu hỏi không nhé!'
                : 'Predictions locked — waiting for the stage reveal!'
              : isVi
              ? 'Kết quả dự đoán điểm tín nhiệm ở câu hỏi này:'
              : 'Confidence staking outcome for this question:'}
          </p>

          {/* Range-Slider Component: Set Confidence Level (0 - 100%) */}
          <div className="mb-3">
            <ConfidenceRangeSlider
              value={confidenceLevel}
              onChange={handleConfidenceLevelChange}
              disabled={!isConfidenceStakingOpen && status !== 'STANDBY'}
              selectedContestantName={currentStake?.contestantName}
              isVi={isVi}
            />
          </div>

          {/* Contestants Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {contestants.map((contestant) => {
              const isStaked = currentStake?.contestantId === contestant.id;
              const crowdPct = crowdDistribution[contestant.id] || 0;
              const isCheered = cheeredContestantId === contestant.id;
              const isWinnerOnReveal = status === 'REVEAL' && successfulContestantIds.has(contestant.id);
              const isInteractive = isConfidenceStakingOpen;

              return (
                <button
                  key={contestant.id}
                  type="button"
                  disabled={!isInteractive}
                  onClick={() => handlePlaceStake(contestant)}
                  aria-pressed={isStaked}
                  className={`group relative flex flex-col justify-between p-2.5 rounded-[2px] border text-left transition-all ${
                    isStaked
                      ? status === 'REVEAL'
                        ? isWinnerOnReveal
                          ? 'bg-emerald-950/60 border-emerald-400 shadow-[0_0_16px_rgba(16,185,129,0.25)]'
                          : 'bg-rose-950/40 border-rose-400/60'
                        : 'bg-[#F7CAC9]/20 border-[#F7CAC9] shadow-[0_0_15px_rgba(247,202,201,0.22)]'
                      : status === 'REVEAL' && isWinnerOnReveal
                      ? 'bg-emerald-950/25 border-emerald-500/40'
                      : 'bg-white/5 border-white/12 hover:bg-white/10 hover:border-[#F7CAC9]/50'
                  } ${isInteractive ? 'cursor-pointer active:scale-98' : 'cursor-default'}`}
                >
                  <div className="w-full flex items-center justify-between gap-1.5 mb-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: contestant.color }}
                      />
                      <span className="text-xs font-extrabold text-white truncate">
                        {contestant.name}
                      </span>
                    </div>
                    {isStaked && (
                      <span className="shrink-0 text-[#F7CAC9]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <div className="w-full space-y-1">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-white/60">
                        {isVi ? 'Tín nhiệm:' : 'Backed:'} <strong className="text-white">{crowdPct}%</strong>
                      </span>
                      {status === 'REVEAL' ? (
                        <span
                          className={`font-bold ${
                            isWinnerOnReveal ? 'text-emerald-300' : 'text-white/40'
                          }`}
                        >
                          {isWinnerOnReveal
                            ? isVi
                              ? '✓ Trả lời đúng'
                              : '✓ Correct'
                            : isVi
                            ? 'Chưa khớp'
                            : 'Missed'}
                        </span>
                      ) : isStaked ? (
                        <span className="text-[#F7CAC9] font-bold">
                          {isVi
                            ? `Đã chọn (${currentStake.confidenceLevel ?? confidenceLevel}%)`
                            : `Staked (${currentStake.confidenceLevel ?? confidenceLevel}%)`}
                        </span>
                      ) : currentStake && isInteractive ? (
                        <span className="text-amber-300 font-bold group-hover:underline">
                          {isVi ? 'Đổi sang đây' : 'Switch here'}
                        </span>
                      ) : isCheered ? (
                        <span className="text-amber-300/90 font-semibold">
                          {isVi ? 'Đang cổ vũ' : 'Your pick'}
                        </span>
                      ) : status === 'STANDBY' ? (
                        <span className="text-white/40">
                          {isVi ? 'Chờ câu hỏi' : 'Standby'}
                        </span>
                      ) : (
                        <span className="text-white/40 group-hover:text-[#F7CAC9] transition-colors">
                          {isVi ? '+ Đặt 1đ' : '+ Stake 1'}
                        </span>
                      )}
                    </div>

                    <div className="w-full h-1.5 rounded-[1px] bg-black/50 overflow-hidden">
                      <div
                        className="h-full transition-all duration-500"
                        style={{
                          width: `${crowdPct}%`,
                          backgroundColor:
                            status === 'REVEAL' && isWinnerOnReveal
                              ? '#34d399'
                              : isStaked
                              ? '#F7CAC9'
                              : contestant.color,
                        }}
                      />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {confidenceErrorNotice && (
            <div className="mt-2.5 text-[11px] font-mono text-rose-200 bg-rose-500/15 border border-rose-400/40 px-2.5 py-1.5 rounded-[2px]">
              {confidenceErrorNotice}
            </div>
          )}

          {currentStake && (
            <div
              className={`mt-2.5 px-3 py-2 rounded-[2px] border text-xs flex flex-wrap items-center justify-between gap-2 ${
                status === 'REVEAL'
                  ? currentStake.won
                    ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-200'
                    : 'bg-white/5 border-white/15 text-[#B6A6D8]'
                  : 'bg-[#0D0420]/70 border-[#F7CAC9]/30 text-[#FCEEEC]'
              }`}
            >
              <div className="flex items-center gap-2">
                {status === 'REVEAL' ? (
                  currentStake.won ? (
                    <>
                      <Trophy className="w-4 h-4 text-amber-300 shrink-0" />
                      <span>
                        {isVi ? (
                          <>
                            Tuyệt vời! <strong>{currentStake.contestantName}</strong> đã giải đúng câu này — với mức tự tin{' '}
                            <strong className="text-amber-300 font-mono">
                              {currentStake.confidenceLevel ?? confidenceLevel}%
                            </strong>
                            , bạn nhận thưởng{' '}
                            <strong className="text-emerald-300 font-mono">
                              +{currentStake.payout || 2} Điểm Tín Nhiệm
                            </strong>
                            !
                          </>
                        ) : (
                          <>
                            Spot on! <strong>{currentStake.contestantName}</strong> answered correctly — with{' '}
                            <strong className="text-amber-300 font-mono">
                              {currentStake.confidenceLevel ?? confidenceLevel}%
                            </strong>{' '}
                            confidence, you earned{' '}
                            <strong className="text-emerald-300 font-mono">
                              +{currentStake.payout || 2} Confidence Points
                            </strong>
                            !
                          </>
                        )}
                      </span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 text-[#92A8D1] shrink-0" />
                      <span>
                        {isVi ? (
                          <>
                            Tiếc quá, <strong>{currentStake.contestantName}</strong> chưa ghi điểm ở câu này (mức tự tin:{' '}
                            {currentStake.confidenceLevel ?? confidenceLevel}%). Tiếp tục đặt niềm tin ở câu tiếp theo nhé!
                          </>
                        ) : (
                          <>
                            Close one! <strong>{currentStake.contestantName}</strong> missed this question (confidence:{' '}
                            {currentStake.confidenceLevel ?? confidenceLevel}%). Stake again on the next round!
                          </>
                        )}
                      </span>
                    </>
                  )
                ) : status === 'LOCKED' || !isConfidenceStakingOpen ? (
                  <>
                    <Lock className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                    <span>
                      {gameState.confidence_staking_cutoff_notice ? (
                        <span>{gameState.confidence_staking_cutoff_notice}</span>
                      ) : isVi ? (
                        <>
                          Đã chốt danh sách dự đoán: <strong>1 Điểm Tín Nhiệm</strong> (Mức tự tin:{' '}
                          <strong className="text-amber-300 font-mono">
                            {currentStake.confidenceLevel ?? confidenceLevel}%
                          </strong>
                          ) cho thí sinh <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong>.
                        </>
                      ) : (
                        <>
                          Predictions closed: <strong>1 Confidence Point</strong> (Confidence:{' '}
                          <strong className="text-amber-300 font-mono">
                            {currentStake.confidenceLevel ?? confidenceLevel}%
                          </strong>
                          ) on <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong>.
                        </>
                      )}
                    </span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0" />
                    <span>
                      {isVi ? (
                        <>
                          Bạn đang đặt <strong>1 Điểm Tín Nhiệm</strong> với mức tự tin{' '}
                          <strong className="text-amber-300 font-mono">
                            {currentStake.confidenceLevel ?? confidenceLevel}%
                          </strong>{' '}
                          cho <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong> (kéo thanh trượt
                          để chỉnh hoặc chạm thí sinh khác để đổi).
                        </>
                      ) : (
                        <>
                          You staked <strong>1 Confidence Point</strong> with{' '}
                          <strong className="text-amber-300 font-mono">
                            {currentStake.confidenceLevel ?? confidenceLevel}%
                          </strong>{' '}
                          confidence on <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong> (use
                          slider to adjust or tap another contestant to switch).
                        </>
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
