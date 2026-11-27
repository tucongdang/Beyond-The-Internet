import {
  calculateLeaderboard,
  calculateRankChanges,
  calculateSurvivalStats,
  calculateUserTrends,
  RankChangeInfo,
  TrendInfo,
  UserScoreSummary
} from '../utils/leaderboardUtils';
import { generateItemAnalysis, generateSPSSData } from '../utils/exportUtils';
import {
  computeAudienceScoreFromResponses,
  getAudienceScoreBreakdown,
  getAudienceTotalScore
} from './audienceScoringService';
import type {
  AudienceStatsWorkerPayload,
  AudienceStatsWorkerResult,
  LeaderboardWorkerPayload,
  LeaderboardWorkerResult,
  QrWorkerPayload,
  SpssWorkerPayload,
  SpssWorkerResult,
  WorkerRequest,
  WorkerResponse
} from '../workers/computeWorker';
import type { SurvivalStats } from '../types';

export type { AudienceStatsWorkerResult };

export interface LeaderboardBundleResult {
  leaderboard: UserScoreSummary[];
  rankChangesMap: Map<string, RankChangeInfo>;
  trendsMap: Map<string, TrendInfo>;
  survivalStats: SurvivalStats | null;
}

class WorkerComputeService {
  private worker: Worker | null = null;
  private workerDisabled = false;
  private nextRequestId = 1;
  private pending = new Map<
    number,
    {
      resolve: (value: any) => void;
      reject: (reason?: any) => void;
      timer: ReturnType<typeof setTimeout>;
    }
  >();

  private getWorker(): Worker | null {
    if (this.workerDisabled || typeof Worker === 'undefined' || typeof window === 'undefined') {
      return null;
    }

    if (this.worker) {
      return this.worker;
    }

    try {
      const worker = new Worker(new URL('../workers/computeWorker.ts', import.meta.url), {
        type: 'module'
      });

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const msg = event.data;
        if (!msg || typeof msg.id !== 'number') return;
        const entry = this.pending.get(msg.id);
        if (!entry) return;
        clearTimeout(entry.timer);
        this.pending.delete(msg.id);
        if (msg.ok === true) {
          entry.resolve(msg.result);
        } else {
          const errorMessage = 'error' in msg && typeof msg.error === 'string' ? msg.error : 'Worker task failed';
          entry.reject(new Error(errorMessage));
        }
      };

      worker.onerror = (err) => {
        console.warn('[WorkerComputeService] Worker runtime error, switching to main-thread fallback:', err);
        this.rejectAllPending(new Error('Worker crashed or blocked'));
        this.terminateWorker();
        this.workerDisabled = true;
      };

      this.worker = worker;
      return worker;
    } catch (err) {
      console.warn('[WorkerComputeService] Could not initialize Web Worker, using main-thread fallback:', err);
      this.workerDisabled = true;
      return null;
    }
  }

  private rejectAllPending(error: Error) {
    this.pending.forEach((entry) => {
      clearTimeout(entry.timer);
      entry.reject(error);
    });
    this.pending.clear();
  }

  private terminateWorker() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch {
        // Ignore termination errors
      }
      this.worker = null;
    }
  }

  private runTask<TResult>(type: WorkerRequest['type'], payload: unknown, timeoutMs = 15000): Promise<TResult> {
    const worker = this.getWorker();
    if (!worker) {
      return Promise.reject(new Error('Web Worker unavailable'));
    }

    return new Promise<TResult>((resolve, reject) => {
      const id = this.nextRequestId++;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Worker request ${type} timed out`));
      }, timeoutMs);

      this.pending.set(id, { resolve, reject, timer });

      try {
        worker.postMessage({ id, type, payload } as WorkerRequest);
      } catch (err) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(err);
      }
    });
  }

  public async generateQrDataUrl(payload: QrWorkerPayload): Promise<string> {
    try {
      return await this.runTask<string>('GENERATE_QR', payload, 8000);
    } catch {
      const QRCode = (await import('qrcode')).default;
      return QRCode.toDataURL(payload.text, {
        width: payload.width ?? 320,
        margin: payload.margin ?? 2,
        color: {
          dark: payload.dark,
          light: payload.light
        },
        errorCorrectionLevel: payload.errorCorrectionLevel ?? 'H'
      });
    }
  }

  public async computeLeaderboardBundleAsync(payload: LeaderboardWorkerPayload): Promise<LeaderboardBundleResult> {
    try {
      const raw = await this.runTask<LeaderboardWorkerResult>('COMPUTE_LEADERBOARD_BUNDLE', payload);
      return {
        leaderboard: raw.leaderboard,
        rankChangesMap: new Map(raw.rankChangesEntries || []),
        trendsMap: new Map(raw.trendsEntries || []),
        survivalStats: raw.survivalStats
      };
    } catch {
      const {
        allResponses,
        customQuestionBank,
        gameState,
        filterRound = 'ALL',
        includeRankChanges = false,
        includeTrends = false,
        includeSurvivalStats = false,
        targetUid,
        targetMssv
      } = payload;

      const leaderboard = calculateLeaderboard(allResponses, customQuestionBank, gameState, filterRound);
      const rankChangesMap =
        includeRankChanges && leaderboard.length > 0
          ? calculateRankChanges(
              allResponses,
              leaderboard,
              gameState?.question_id,
              customQuestionBank,
              gameState,
              filterRound
            )
          : new Map<string, RankChangeInfo>();
      const trendsMap =
        includeTrends && leaderboard.length > 0
          ? calculateUserTrends(allResponses, leaderboard, customQuestionBank, gameState)
          : new Map<string, TrendInfo>();
      const survivalStats = includeSurvivalStats
        ? calculateSurvivalStats(allResponses, customQuestionBank, gameState, targetUid, targetMssv)
        : null;

      return { leaderboard, rankChangesMap, trendsMap, survivalStats };
    }
  }

  public async computeSpssDataAsync(payload: SpssWorkerPayload): Promise<SpssWorkerResult> {
    try {
      return await this.runTask<SpssWorkerResult>('COMPUTE_SPSS_AND_ANALYSIS', payload);
    } catch {
      const rows = generateSPSSData(payload.allResponses, payload.questionBank, payload.gameState);
      const itemAnalysis = payload.includeItemAnalysis
        ? generateItemAnalysis(payload.allResponses, payload.questionBank)
        : [];
      return { rows, itemAnalysis };
    }
  }

  public async computeAudienceStatsAsync(payload: AudienceStatsWorkerPayload): Promise<AudienceStatsWorkerResult> {
    try {
      return await this.runTask<AudienceStatsWorkerResult>('COMPUTE_AUDIENCE_STATS', payload);
    } catch {
      const { allResponses, uid, mssv, customQuestionBank, gameState, includeLeaderboard = true } = payload;
      const hasResponses = Boolean(allResponses && Object.keys(allResponses).length > 0);
      const board =
        includeLeaderboard && hasResponses
          ? calculateLeaderboard(allResponses, customQuestionBank, gameState)
          : [];
      const myData = board.find(p => p.uid === uid || (mssv && p.mssv === mssv));
      const audienceScoreState = computeAudienceScoreFromResponses(
        allResponses || {},
        uid,
        mssv,
        customQuestionBank,
        gameState
      );
      const survivalStats = calculateSurvivalStats(
        allResponses,
        customQuestionBank,
        gameState,
        uid,
        mssv
      );

      return {
        totalScore: getAudienceTotalScore(audienceScoreState),
        scoreBreakdown: getAudienceScoreBreakdown(audienceScoreState),
        rank: myData?.rank || '-',
        accuracyRate: myData?.accuracyRate || 0,
        correctCount: audienceScoreState.correctAnswersCount,
        totalAnswered: audienceScoreState.totalAnswered,
        avgLatency: myData?.avgLatency || 0,
        totalPlayers: board.length,
        history: (audienceScoreState.history || []).map(h => ({ isCorrect: Boolean(h.isCorrect) })),
        survivalStats
      };
    }
  }
}

export const workerComputeService = new WorkerComputeService();
