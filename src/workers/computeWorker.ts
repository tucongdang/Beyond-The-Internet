import QRCode from 'qrcode';
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
} from '../services/audienceScoringService';
import {
  GameState,
  QuestionItem,
  ResearchItemAnalysis,
  ScoreBreakdown,
  SPSSRow,
  SurvivalStats,
  UserResponse
} from '../types';

export interface QrWorkerPayload {
  text: string;
  width?: number;
  margin?: number;
  dark: string;
  light: string;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
}

export interface LeaderboardWorkerPayload {
  allResponses: Record<string, Record<string, UserResponse>>;
  customQuestionBank?: QuestionItem[];
  gameState?: GameState;
  filterRound?: 'ALL' | 'R1' | 'R2' | 'R3' | 'R4';
  includeRankChanges?: boolean;
  includeTrends?: boolean;
  includeSurvivalStats?: boolean;
  targetUid?: string;
  targetMssv?: string;
}

export interface LeaderboardWorkerResult {
  leaderboard: UserScoreSummary[];
  rankChangesEntries: Array<[string, RankChangeInfo]>;
  trendsEntries: Array<[string, TrendInfo]>;
  survivalStats: SurvivalStats | null;
}

export interface SpssWorkerPayload {
  allResponses: Record<string, Record<string, UserResponse>>;
  questionBank: QuestionItem[];
  gameState?: GameState;
  includeItemAnalysis?: boolean;
}

export interface SpssWorkerResult {
  rows: SPSSRow[];
  itemAnalysis: ResearchItemAnalysis[];
}

export interface AudienceStatsWorkerPayload {
  allResponses: Record<string, Record<string, UserResponse>>;
  uid: string;
  mssv?: string;
  customQuestionBank?: QuestionItem[];
  gameState?: GameState;
  includeLeaderboard?: boolean;
}

export interface AudienceStatsWorkerResult {
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  rank: number | '-';
  accuracyRate: number;
  correctCount: number;
  totalAnswered: number;
  avgLatency: number;
  totalPlayers: number;
  history: Array<{ isCorrect: boolean }>;
  survivalStats: SurvivalStats;
}

export type WorkerRequest =
  | { id: number; type: 'GENERATE_QR'; payload: QrWorkerPayload }
  | { id: number; type: 'COMPUTE_LEADERBOARD_BUNDLE'; payload: LeaderboardWorkerPayload }
  | { id: number; type: 'COMPUTE_SPSS_AND_ANALYSIS'; payload: SpssWorkerPayload }
  | { id: number; type: 'COMPUTE_AUDIENCE_STATS'; payload: AudienceStatsWorkerPayload };

export type WorkerResponse =
  | { id: number; ok: true; result: unknown }
  | { id: number; ok: false; error: string };

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

async function generateQrInWorker(payload: QrWorkerPayload): Promise<string> {
  const width = payload.width ?? 320;
  const margin = payload.margin ?? 2;
  const errorCorrectionLevel = payload.errorCorrectionLevel ?? 'H';

  if (typeof OffscreenCanvas !== 'undefined') {
    const qr = QRCode.create(payload.text, { errorCorrectionLevel });
    const size = qr.modules.size;
    const data = qr.modules.data;
    const totalModules = size + margin * 2;
    const canvas = new OffscreenCanvas(width, width);
    const ctx = canvas.getContext('2d');

    if (ctx) {
      const isTransparent = !payload.light || payload.light === '#00000000' || payload.light === 'transparent';
      if (!isTransparent) {
        ctx.fillStyle = payload.light;
        ctx.fillRect(0, 0, width, width);
      } else {
        ctx.clearRect(0, 0, width, width);
      }

      const cellSize = width / totalModules;
      ctx.fillStyle = payload.dark;
      for (let row = 0; row < size; row++) {
        const y1 = Math.floor((row + margin) * cellSize);
        const y2 = Math.ceil((row + 1 + margin) * cellSize);
        const h = y2 - y1;
        for (let col = 0; col < size; col++) {
          if (data[row * size + col]) {
            const x1 = Math.floor((col + margin) * cellSize);
            const x2 = Math.ceil((col + 1 + margin) * cellSize);
            ctx.fillRect(x1, y1, x2 - x1, h);
          }
        }
      }

      const blob = await canvas.convertToBlob({ type: 'image/png' });
      const buffer = await blob.arrayBuffer();
      return `data:image/png;base64,${arrayBufferToBase64(buffer)}`;
    }
  }

  const svg = await QRCode.toString(payload.text, {
    type: 'svg',
    width,
    margin,
    color: {
      dark: payload.dark,
      light: payload.light
    },
    errorCorrectionLevel
  });
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

globalThis.addEventListener('message', async (event: MessageEvent<WorkerRequest>) => {
  const req = event.data;
  if (!req || typeof req.id !== 'number') return;

  try {
    let result: unknown;

    switch (req.type) {
      case 'GENERATE_QR': {
        result = await generateQrInWorker(req.payload);
        break;
      }

      case 'COMPUTE_LEADERBOARD_BUNDLE': {
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
        } = req.payload;

        const leaderboard = calculateLeaderboard(
          allResponses,
          customQuestionBank,
          gameState,
          filterRound
        );

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
            : null;

        const trendsMap =
          includeTrends && leaderboard.length > 0
            ? calculateUserTrends(
                allResponses,
                leaderboard,
                customQuestionBank,
                gameState
              )
            : null;

        const survivalStats = includeSurvivalStats
          ? calculateSurvivalStats(allResponses, customQuestionBank, gameState, targetUid, targetMssv)
          : null;

        result = {
          leaderboard,
          rankChangesEntries: rankChangesMap ? Array.from(rankChangesMap.entries()) : [],
          trendsEntries: trendsMap ? Array.from(trendsMap.entries()) : [],
          survivalStats
        } satisfies LeaderboardWorkerResult;
        break;
      }

      case 'COMPUTE_SPSS_AND_ANALYSIS': {
        const { allResponses, questionBank, gameState, includeItemAnalysis = false } = req.payload;
        const rows = generateSPSSData(allResponses, questionBank, gameState);
        const itemAnalysis = includeItemAnalysis ? generateItemAnalysis(allResponses, questionBank) : [];
        result = { rows, itemAnalysis } satisfies SpssWorkerResult;
        break;
      }

      case 'COMPUTE_AUDIENCE_STATS': {
        const { allResponses, uid, mssv, customQuestionBank, gameState, includeLeaderboard = true } = req.payload;
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

        result = {
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
        } satisfies AudienceStatsWorkerResult;
        break;
      }

      default:
        throw new Error(`Unsupported worker request type`);
    }

    const response: WorkerResponse = { id: req.id, ok: true, result };
    globalThis.postMessage(response);
  } catch (err) {
    const response: WorkerResponse = {
      id: req.id,
      ok: false,
      error: err instanceof Error ? err.message : String(err)
    };
    globalThis.postMessage(response);
  }
});
