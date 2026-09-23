import { UserResponse, QuestionItem, GameState, SurvivalStats } from '../types';
import { INITIAL_QUESTION_BANK } from '../data/questionBank';
import {
  evaluateUserChoice,
  calculatePointsForRound,
  normalizeRoundKey,
  computeAudienceScoreFromResponses
} from '../services/audienceScoringService';

export { evaluateUserChoice };

export interface UserScoreSummary {
  uid: string;
  anonymizedUid?: string;
  name: string;
  mssv: string;
  teamId?: string;
  totalScore: number;
  correctAnswersCount: number;
  totalAnswered: number;
  accuracyRate: number; // percentage (0 - 100)
  avgLatency: number; // in seconds
  totalLatency: number;
  lastActiveTimestamp: number;
  roundScores: {
    round1: number; // Khởi động
    round2: number; // VCNV
    round3: number; // Tăng tốc
    round4: number; // Về đích / Khác
  };
  rank: number;
}

/**
 * Aggregate all responses across all questions and compute user rankings
 * Uses computeAudienceScoreFromResponses as the unified single source of truth.
 */
export function calculateLeaderboard(
  allResponses: Record<string, Record<string, UserResponse>>,
  customQuestionBank?: QuestionItem[],
  gameState?: GameState,
  filterRound: 'ALL' | 'R1' | 'R2' | 'R3' | 'R4' = 'ALL'
): UserScoreSummary[] {
  if (!allResponses || Object.keys(allResponses).length === 0) {
    return [];
  }

  // 1. Identify all unique users across all questions
  const userMetadataMap = new Map<string, {
    uid: string;
    anonymizedUid?: string;
    name: string;
    mssv: string;
    latencies: number[];
    lastActiveTimestamp: number;
  }>();

  Object.values(allResponses).forEach(questionResponses => {
    if (!questionResponses) return;
    Object.entries(questionResponses).forEach(([keyUid, resp]) => {
      if (!resp) return;
      const uid = resp.user_info?.uid || keyUid;
      const mssv = resp.user_info?.mssv || '';
      const lookupKey = uid || mssv;
      if (!lookupKey) return;

      const existing = userMetadataMap.get(lookupKey);
      const latency = Math.max(0.01, Number(resp.latency_sec || 0));
      const timestamp = resp.timestamp || Date.now();

      if (!existing) {
        userMetadataMap.set(lookupKey, {
          uid,
          anonymizedUid: resp.user_info?.anonymizedUid || (lookupKey.length === 12 ? lookupKey : undefined),
          name: resp.user_info?.name || 'Khán giả',
          mssv,
          latencies: [latency],
          lastActiveTimestamp: timestamp
        });
      } else {
        existing.latencies.push(latency);
        existing.lastActiveTimestamp = Math.max(existing.lastActiveTimestamp, timestamp);
        if (resp.user_info?.name && (!existing.name || existing.name === 'Khán giả')) {
          existing.name = resp.user_info.name;
        }
        if (resp.user_info?.mssv && !existing.mssv) {
          existing.mssv = resp.user_info.mssv;
        }
        if (resp.user_info?.anonymizedUid && !existing.anonymizedUid) {
          existing.anonymizedUid = resp.user_info.anonymizedUid;
        }
      }
    });
  });

  // 2. Compute authoritative scores for each user using computeAudienceScoreFromResponses
  const summaries: UserScoreSummary[] = [];

  userMetadataMap.forEach(meta => {
    const scoreState = computeAudienceScoreFromResponses(
      allResponses,
      meta.uid,
      meta.mssv,
      customQuestionBank || INITIAL_QUESTION_BANK,
      gameState
    );

    const totalLatency = meta.latencies.reduce((acc, cur) => acc + cur, 0);
    const avgLatency = meta.latencies.length > 0 ? totalLatency / meta.latencies.length : 0;
    const accuracyRate = scoreState.totalAnswered > 0
      ? Math.round((scoreState.correctAnswersCount / scoreState.totalAnswered) * 100)
      : 0;

    let effectiveScore = scoreState.totalScore;
    if (filterRound === 'R1') effectiveScore = scoreState.scoreBreakdown.round1 || 0;
    else if (filterRound === 'R2') effectiveScore = scoreState.scoreBreakdown.round2 || 0;
    else if (filterRound === 'R3') effectiveScore = scoreState.scoreBreakdown.round3 || 0;
    else if (filterRound === 'R4') effectiveScore = scoreState.scoreBreakdown.round4 || 0;

    summaries.push({
      uid: meta.uid,
      anonymizedUid: meta.anonymizedUid,
      name: meta.name,
      mssv: meta.mssv,
      totalScore: filterRound === 'ALL' ? scoreState.totalScore : effectiveScore,
      correctAnswersCount: scoreState.correctAnswersCount,
      totalAnswered: scoreState.totalAnswered,
      accuracyRate,
      avgLatency: Number(avgLatency.toFixed(2)),
      totalLatency: Number(totalLatency.toFixed(2)),
      lastActiveTimestamp: meta.lastActiveTimestamp,
      roundScores: {
        round1: scoreState.scoreBreakdown.round1 || 0,
        round2: scoreState.scoreBreakdown.round2 || 0,
        round3: scoreState.scoreBreakdown.round3 || 0,
        round4: scoreState.scoreBreakdown.round4 || 0
      },
      rank: 0
    });
  });

  // 3. Sort by:
  // 1. Total / Round Score (descending)
  // 2. Correct Answers Count (descending)
  // 3. Average Latency (ascending - faster response wins ties)
  // 4. Total Answered (descending)
  summaries.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    if (b.correctAnswersCount !== a.correctAnswersCount) {
      return b.correctAnswersCount - a.correctAnswersCount;
    }
    if (a.avgLatency !== b.avgLatency) {
      return a.avgLatency - b.avgLatency;
    }
    return b.totalAnswered - a.totalAnswered;
  });

  // 4. Assign 1-indexed rank
  summaries.forEach((s, idx) => {
    s.rank = idx + 1;
  });

  return summaries;
}

/**
 * Battle Royale / Survival Mode Statistics
 * Determines how many participants are undefeated (0 wrong answers so far)
 */
export function calculateSurvivalStats(
  allResponses?: Record<string, Record<string, UserResponse>>,
  customQuestionBank?: QuestionItem[],
  gameState?: GameState,
  targetUid?: string,
  targetMssv?: string
): SurvivalStats {
  if (!allResponses || Object.keys(allResponses).length === 0) {
    return {
      survivorsCount: 0,
      totalContestants: 0,
      isUserAlive: true,
      survivalRate: 100
    };
  }

  const board = calculateLeaderboard(allResponses, customQuestionBank, gameState);
  const totalContestants = board.length;
  
  if (totalContestants === 0) {
    return {
      survivorsCount: 0,
      totalContestants: 0,
      isUserAlive: true,
      survivalRate: 100
    };
  }

  // Undefeated contestants: answered at least 1 question and has 100% accuracy (0 wrong answers)
  const survivors = board.filter(u => u.totalAnswered > 0 && u.correctAnswersCount === u.totalAnswered);
  const survivorsCount = survivors.length;
  const survivalRate = Math.round((survivorsCount / totalContestants) * 100);

  let isUserAlive = true;
  if (targetUid || targetMssv) {
    const userSummary = board.find(u => 
      (targetUid && (u.uid === targetUid || u.anonymizedUid === targetUid)) ||
      (targetMssv && u.mssv === targetMssv)
    );
    if (userSummary) {
      isUserAlive = userSummary.totalAnswered === 0 || userSummary.correctAnswersCount === userSummary.totalAnswered;
    }
  }

  return {
    survivorsCount,
    totalContestants,
    isUserAlive,
    survivalRate
  };
}

export interface RankChangeInfo {
  delta: number | null; // Positive: moved up, Negative: moved down, 0: same, null: new
  prevRank: number | null;
}

/**
 * Calculates how each contestant's rank changed compared to the previous question update
 */
export function calculateRankChanges(
  allResponses: Record<string, Record<string, UserResponse>>,
  currentRankedList: UserScoreSummary[],
  currentQuestionId?: string,
  customQuestionBank?: QuestionItem[],
  gameState?: GameState,
  filterRound: 'ALL' | 'R1' | 'R2' | 'R3' | 'R4' = 'ALL'
): Map<string, RankChangeInfo> {
  const result = new Map<string, RankChangeInfo>();
  if (!allResponses || Object.keys(allResponses).length === 0 || currentRankedList.length === 0) {
    return result;
  }

  const questionKeys = Object.keys(allResponses).filter(k => allResponses[k] && Object.keys(allResponses[k]).length > 0);
  
  // If there's only 1 question or no prior question history
  if (questionKeys.length <= 1) {
    currentRankedList.forEach(user => {
      result.set(user.uid, { delta: null, prevRank: null });
    });
    return result;
  }

  // Determine the latest question ID to exclude for prior calculation
  let targetExcludeKey = currentQuestionId;
  if (!targetExcludeKey || !allResponses[targetExcludeKey] || Object.keys(allResponses[targetExcludeKey]).length === 0) {
    targetExcludeKey = questionKeys[questionKeys.length - 1];
  }

  const priorResponses: Record<string, Record<string, UserResponse>> = {};
  questionKeys.forEach(k => {
    if (k !== targetExcludeKey) {
      priorResponses[k] = allResponses[k];
    }
  });

  const priorBoard = calculateLeaderboard(priorResponses, customQuestionBank, gameState, filterRound);
  const priorRankMap = new Map<string, number>();
  priorBoard.forEach(u => {
    priorRankMap.set(u.uid, u.rank);
    if (u.mssv) priorRankMap.set(u.mssv, u.rank);
  });

  currentRankedList.forEach(user => {
    const prevRank = priorRankMap.get(user.uid) ?? (user.mssv ? priorRankMap.get(user.mssv) : undefined);
    if (prevRank === undefined) {
      result.set(user.uid, { delta: null, prevRank: null });
    } else {
      const delta = prevRank - user.rank;
      result.set(user.uid, { delta, prevRank });
    }
  });

  return result;
}

export type PerformanceTrend = 'rising' | 'falling' | 'stable' | 'streak';

export interface TrendInfo {
  trend: PerformanceTrend;
  label?: string;
  labelVi?: string;
  streakCount?: number;
  description?: string;
}

/**
 * Evaluates performance trends across multiple question rounds and recent answers
 */
export function calculateUserTrends(
  allResponses: Record<string, Record<string, UserResponse>>,
  rankedUsers: UserScoreSummary[],
  customQuestionBank?: QuestionItem[],
  gameState?: GameState
): Map<string, TrendInfo> {
  const result = new Map<string, TrendInfo>();
  if (!allResponses || Object.keys(allResponses).length === 0 || rankedUsers.length === 0) {
    return result;
  }

  // Pre-index question items for quick lookup
  const questionMap = new Map<string, QuestionItem>();
  (customQuestionBank || INITIAL_QUESTION_BANK).forEach(q => {
    questionMap.set(q.id, q);
  });

  rankedUsers.forEach(user => {
    const userLookupKey = user.uid;
    const userMssv = user.mssv;

    // Collect all responses for this user in chronological order
    const userResponses: { questionId: string; response: UserResponse; timestamp: number; isCorrect: boolean }[] = [];

    Object.entries(allResponses).forEach(([qId, qResponses]) => {
      if (!qResponses) return;
      const resp = qResponses[userLookupKey] || 
        Object.values(qResponses).find(r => 
          (r?.user_info?.uid && r.user_info.uid === userLookupKey) ||
          (userMssv && r?.user_info?.mssv && r.user_info.mssv.toLowerCase() === userMssv.toLowerCase())
        );

      if (resp) {
        const qItem = questionMap.get(qId);
        const correctChoice = qItem?.correct_key || (gameState?.question_id === qId ? gameState?.correct_key : undefined);
        const evalResult = evaluateUserChoice(resp.choice, correctChoice);
        const isCorrect = evalResult.isCorrect;
        userResponses.push({
          questionId: qId,
          response: resp,
          timestamp: resp.timestamp || 0,
          isCorrect
        });
      }
    });

    userResponses.sort((a, b) => a.timestamp - b.timestamp);

    const total = userResponses.length;
    if (total === 0) {
      result.set(user.uid, { trend: 'stable', label: 'Stable', labelVi: 'Ổn định' });
      return;
    }

    // 1. Calculate current consecutive correct answer streak from latest questions
    let streakCount = 0;
    for (let i = total - 1; i >= 0; i--) {
      if (userResponses[i].isCorrect) {
        streakCount++;
      } else {
        break;
      }
    }

    if (streakCount >= 3) {
      result.set(user.uid, {
        trend: 'streak',
        streakCount,
        label: `${streakCount} Streak`,
        labelVi: `Chuỗi ${streakCount}`,
        description: `Đang có chuỗi ${streakCount} câu trả lời đúng liên tiếp!`
      });
      return;
    }

    // 2. Multi-round analysis
    const { round1, round2, round3, round4 } = user.roundScores;
    const activeRounds = [round1, round2, round3, round4].filter(score => score > 0);

    // 3. Analyze recent questions vs previous performance
    if (total >= 2) {
      const recentWindow = userResponses.slice(-Math.min(3, total));
      const recentCorrect = recentWindow.filter(r => r.isCorrect).length;
      const recentAccuracy = recentCorrect / recentWindow.length;

      // If user had a decent start but recently missed 2 in a row
      if (recentWindow.length >= 2 && recentCorrect === 0 && user.accuracyRate >= 30) {
        result.set(user.uid, {
          trend: 'falling',
          label: 'Falling',
          labelVi: 'Giảm sút',
          description: 'Phong độ có dấu hiệu chững lại ở các câu hỏi gần đây.'
        });
        return;
      }

      // If user is accelerating in recent questions (e.g. 2/2 or 3/3 correct or round score improving)
      if (recentAccuracy >= 0.8 && (user.accuracyRate < 80 || activeRounds.length > 1)) {
        result.set(user.uid, {
          trend: 'rising',
          label: 'Rising',
          labelVi: 'Đang lên',
          description: 'Phong độ bứt phá với các câu trả lời chính xác gần đây!'
        });
        return;
      }
    }

    // 4. Multi-round score progression check
    if (activeRounds.length >= 2) {
      const lastRoundScore = activeRounds[activeRounds.length - 1];
      const prevRoundScore = activeRounds[activeRounds.length - 2];

      if (lastRoundScore > prevRoundScore * 1.25) {
        result.set(user.uid, {
          trend: 'rising',
          label: 'Rising',
          labelVi: 'Đang lên',
          description: 'Điểm số bứt phá mạnh mẽ ở vòng đấu mới nhất!'
        });
        return;
      } else if (lastRoundScore < prevRoundScore * 0.4 && prevRoundScore > 0) {
        result.set(user.uid, {
          trend: 'falling',
          label: 'Falling',
          labelVi: 'Giảm sút',
          description: 'Cần tăng tốc trong các câu hỏi kế tiếp.'
        });
        return;
      }
    }

    // 5. Default steady stability
    result.set(user.uid, {
      trend: 'stable',
      label: 'Stable',
      labelVi: 'Ổn định',
      description: 'Phong độ và tốc độ duy trì ổn định qua các vòng thi.'
    });
  });

  return result;
}


