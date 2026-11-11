import React, { useState, useEffect, useMemo } from 'react';
import { Flame, Sparkles, CheckCircle2, Lock, Trophy, TrendingUp, Zap, ShieldCheck } from 'lucide-react';
import { GameState, UserInfo, ContestantPrediction } from '../types';
import { useLanguage } from '../hooks/useLanguage';
import { soundFx } from '../services/audioEffects';
import { syncService } from '../services/syncService';
import { vibrateTap, vibrateSelection, vibrateSuccess } from '../utils/hapticUtils';
import { ConfidenceRangeSlider } from './ConfidenceRangeSlider';

interface ConfidenceStakingProps {
  gameState: GameState;
  user: UserInfo | null;
  className?: string;
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
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';

  const questionId = String(gameState.question_id || 'q_default');
  const status = gameState.status;

  const [stakingState, setStakingState] = useState<StakingStorageState>(() => loadStakingState());
  const [justStakedPulse, setJustStakedPulse] = useState(false);

  // Sync contestant list from gameState.teams or fallback to default stage contestants
  const contestants: ContestantOption[] = useMemo(() => {
    if (Array.isArray(gameState.teams) && gameState.teams.length > 0) {
      return gameState.teams.map((t, idx) => ({
        id: t.id || `contestant_${idx + 1}`,
        name: t.name || `Thí sinh ${idx + 1}`,
        color: t.color || DEFAULT_CONTESTANTS[idx % DEFAULT_CONTESTANTS.length].color,
      }));
    }
    return DEFAULT_CONTESTANTS;
  }, [gameState.teams]);

  const currentStake = stakingState.stakesByQuestion[questionId] || null;

  // User's confidence level (0 - 100%) when staking belief on a contestant
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

  // Deterministic crowd confidence distribution per question + live update when user stakes
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

  // Determine which contestants answered correctly on REVEAL (Admin override or deterministic)
  const successfulContestantIds = useMemo(() => {
    if (status !== 'REVEAL') return new Set<string>();
    const adminWinners = gameState.stage_winning_contestants?.[questionId];
    if (Array.isArray(adminWinners) && adminWinners.length > 0) {
      return new Set<string>(adminWinners);
    }
    const winners = new Set<string>();
    contestants.forEach((c, idx) => {
      const seed = hashCode(`reveal_${questionId}_${c.id}_${gameState.correct_key || 'A'}`);
      // Top-seeded contestants have ~70% stage accuracy; at least 1 contestant succeeds per question
      if (seed % 10 < 7 || idx === hashCode(questionId) % contestants.length) {
        winners.add(c.id);
      }
    });
    return winners;
  }, [status, contestants, questionId, gameState.correct_key, gameState.stage_winning_contestants]);

  // Resolve payout automatically when transitioning to REVEAL
  useEffect(() => {
    if (status !== 'REVEAL') return;
    const existing = stakingState.stakesByQuestion[questionId];
    if (!existing || existing.resolved) return;

    const didWin = successfulContestantIds.has(existing.contestantId);
    const existingLevel = existing.confidenceLevel ?? 75;
    // Conviction multiplier: base 2 points + extra bonus point if high conviction >= 75%
    const convictionBonus = didWin && existingLevel >= 75 ? 1 : 0;
    const reward = didWin ? existing.stakeAmount * 2 + convictionBonus : 0;

    const nextState: StakingStorageState = {
      ...stakingState,
      // Keep minimum 1 virtual point so user can always play in future questions
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

    // Sync updated result to RealtimeSyncService
    const uid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('BTI_ANON_UID') || `anon_${Date.now()}` : 'anon');
    syncService.submitContestantPrediction({
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
    });

    if (didWin) {
      vibrateSuccess();
    }
  }, [status, questionId, stakingState, successfulContestantIds, user]);

  // Confidence Staking is open while question is ACTIVE and NOT cut off by Admin
  // NOTE: Completely independent of gameState.champion_vote_open (locking champion vote does not affect this!)
  const isConfidenceStakingOpen = status === 'ACTIVE' && gameState.confidence_staking_open !== false;

  // Handle live confidence level adjustment via range-slider
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
      syncService.submitContestantPrediction({
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
    // When switching picks before cutoff, no additional points are charged
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

    // Broadcast prediction to RealtimeSyncService so Admin Lucky Draw can filter it live
    const uid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('BTI_ANON_UID') || `anon_${now}` : 'anon');
    syncService.submitContestantPrediction({
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
    });
  };

  // Pre-select user's cheered contestant hint if they haven't staked yet
  const cheeredContestantId = user?.teamId;

  return (
    <section
      id="audience-confidence-staking"
      aria-label={isVi ? 'Đặt Điểm Tín Nhiệm Cho Thí Sinh' : 'Confidence Staking on Contestants'}
      className={`fluent-box rounded-[2px] p-3.5 sm:p-4 border transition-all duration-300 ${
        justStakedPulse
          ? 'border-[#F7CAC9] shadow-[0_0_24px_rgba(247,202,201,0.28)]'
          : 'border-[#F7CAC9]/30 bg-gradient-to-br from-[#190839]/90 via-[#12062c]/95 to-[#0D0420]/95'
      } ${className}`}
    >
      {/* Header Row: Title & Virtual Confidence Point Balance */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-white/10">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[2px] bg-[#F7CAC9]/15 border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shrink-0">
            <Flame className="w-4 h-4 text-[#F7CAC9]" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-extrabold text-white tracking-tight uppercase">
                {isVi ? 'Đặt Điểm Tín Nhiệm Thí Sinh' : 'Contestant Confidence Staking'}
              </h3>
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-[#F7CAC9]/15 text-[#F7CAC9] border border-[#F7CAC9]/30">
                {isVi ? 'Tín nhiệm từng câu +2đ' : 'Per-question +2 pts'}
              </span>
              {gameState.champion_vote_open === false && (
                <span
                  className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  title={isVi ? 'Tính năng tín nhiệm từng câu vẫn chạy bình thường khi cổng bình chọn Quán quân đã khóa' : 'Confidence staking runs independently even when champion vote is locked'}
                >
                  {isVi ? '✓ Tín nhiệm từng câu vẫn chạy' : '✓ Runs independently'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#B6A6D8] leading-snug mt-0.5">
              {isConfidenceStakingOpen
                ? isVi
                  ? 'Chọn 1 thí sinh bạn tin sẽ giải đúng câu này để đặt 1 điểm tín nhiệm (tự do thay đổi trước khi chốt)!'
                  : 'Place 1 virtual confidence point on a contestant (you can switch anytime before cutoff)!'
                : status === 'ACTIVE' && gameState.confidence_staking_open === false
                ? isVi
                  ? (gameState.confidence_staking_cutoff_notice || 'Ban Tổ Chức đã chốt danh sách dự đoán tín nhiệm câu này! Đang chờ kết quả...')
                  : 'Confidence predictions closed by organizers!'
                : status === 'LOCKED'
                ? isVi
                  ? 'Đã khóa sổ dự đoán — cùng chờ xem thí sinh bạn chọn có vượt qua câu hỏi không nhé!'
                  : 'Predictions locked — waiting for the stage reveal!'
                : isVi
                ? 'Kết quả dự đoán điểm tín nhiệm ở câu hỏi này:'
                : 'Confidence staking outcome for this question:'}
            </p>
          </div>
        </div>

        {/* Virtual Confidence Stats Pill */}
        <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
          <div
            className="px-2.5 py-1 rounded-[2px] bg-black/40 border border-amber-400/35 text-amber-300 font-bold flex items-center gap-1.5"
            title={isVi ? 'Số điểm tín nhiệm ảo hiện có của bạn' : 'Your virtual confidence points'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>
              {stakingState.balance} {isVi ? 'Điểm Tín Nhiệm' : 'CP'}
            </span>
          </div>
          {stakingState.streak > 0 && (
            <div
              className="px-2 py-1 rounded-[2px] bg-emerald-950/60 border border-emerald-400/40 text-emerald-300 font-bold flex items-center gap-1"
              title={isVi ? 'Chuỗi dự đoán thí sinh chính xác liên tiếp' : 'Prediction win streak'}
            >
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
              <span>x{stakingState.streak}</span>
            </div>
          )}
        </div>
      </div>

      {/* Range-Slider Component: Set Confidence Level (0 - 100%) */}
      <div className="mb-3">
        <ConfidenceRangeSlider
          value={confidenceLevel}
          onChange={handleConfidenceLevelChange}
          disabled={!isConfidenceStakingOpen}
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
              {/* Top Row: Contestant Color Dot + Name */}
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

              {/* Crowd Confidence Bar */}
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
                      {isVi ? `Đã chọn (${currentStake.confidenceLevel ?? confidenceLevel}%)` : `Staked (${currentStake.confidenceLevel ?? confidenceLevel}%)`}
                    </span>
                  ) : currentStake && isInteractive ? (
                    <span className="text-amber-300 font-bold group-hover:underline">
                      {isVi ? 'Đổi sang đây' : 'Switch here'}
                    </span>
                  ) : isCheered ? (
                    <span className="text-amber-300/90 font-semibold">
                      {isVi ? 'Đang cổ vũ' : 'Your pick'}
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

      {/* Status Footer Banner */}
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
                        Tuyệt vời! <strong>{currentStake.contestantName}</strong> đã giải đúng câu này — với mức tự tin <strong className="text-amber-300 font-mono">{currentStake.confidenceLevel ?? confidenceLevel}%</strong>, bạn nhận thưởng{' '}
                        <strong className="text-emerald-300 font-mono">+{currentStake.payout || 2} Điểm Tín Nhiệm</strong>!
                      </>
                    ) : (
                      <>
                        Spot on! <strong>{currentStake.contestantName}</strong> answered correctly — with <strong className="text-amber-300 font-mono">{currentStake.confidenceLevel ?? confidenceLevel}%</strong> confidence, you earned{' '}
                        <strong className="text-emerald-300 font-mono">+{currentStake.payout || 2} Confidence Points</strong>!
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
                        Tiếc quá, <strong>{currentStake.contestantName}</strong> chưa ghi điểm ở câu này (mức tự tin: {currentStake.confidenceLevel ?? confidenceLevel}%). Tiếp tục đặt niềm tin ở câu tiếp theo nhé!
                      </>
                    ) : (
                      <>
                        Close one! <strong>{currentStake.contestantName}</strong> missed this question (confidence: {currentStake.confidenceLevel ?? confidenceLevel}%). Stake again on the next round!
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
                      Đã chốt danh sách dự đoán: <strong>1 Điểm Tín Nhiệm</strong> (Mức tự tin: <strong className="text-amber-300 font-mono">{currentStake.confidenceLevel ?? confidenceLevel}%</strong>) cho thí sinh{' '}
                      <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong>.
                    </>
                  ) : (
                    <>
                      Predictions closed: <strong>1 Confidence Point</strong> (Confidence: <strong className="text-amber-300 font-mono">{currentStake.confidenceLevel ?? confidenceLevel}%</strong>) on{' '}
                      <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong>.
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
                      Bạn đang đặt <strong>1 Điểm Tín Nhiệm</strong> với mức tự tin <strong className="text-amber-300 font-mono">{currentStake.confidenceLevel ?? confidenceLevel}%</strong> cho{' '}
                      <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong> (kéo thanh trượt để chỉnh hoặc chạm thí sinh khác để đổi).
                    </>
                  ) : (
                    <>
                      You staked <strong>1 Confidence Point</strong> with <strong className="text-amber-300 font-mono">{currentStake.confidenceLevel ?? confidenceLevel}%</strong> confidence on{' '}
                      <strong className="text-[#F7CAC9]">{currentStake.contestantName}</strong> (use slider to adjust or tap another contestant to switch).
                    </>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
