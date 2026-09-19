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
