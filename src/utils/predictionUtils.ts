/**
 * Audience Contestant Prediction & Confidence Staking Utilities
 * BTI 2027 Academic Interactive Arena
 */

export type ContestantPosition = 1 | 2 | 3 | 4;

export type StakeLevel = 'SAFE' | 'BALANCED' | 'MAX';

export interface ContestantInfo {
  id: ContestantPosition;
  nameVi: string;
  nameEn: string;
  schoolVi: string;
  schoolEn: string;
  color: string;
  badge: string;
}

export interface AudiencePrediction {
  questionId: string;
  roundName: string;
  contestantPosition: ContestantPosition;
  stakeLevel: StakeLevel;
  multiplier: number;
  stakedPoints: number;
  timestamp: string;
  isEvaluated?: boolean;
  isWon?: boolean;
  earnedPoints?: number;
}

export const CONTESTANTS_LIST: ContestantInfo[] = [
  {
    id: 1,
    nameVi: 'Thí sinh 1 (Vị trí A)',
    nameEn: 'Contestant 1 (Pos A)',
    schoolVi: 'Góc Sân Khấu Số 1',
    schoolEn: 'Stage Corner #1',
    color: '#38BDF8', // Sky 400
    badge: 'T1'
  },
  {
    id: 2,
    nameVi: 'Thí sinh 2 (Vị trí B)',
    nameEn: 'Contestant 2 (Pos B)',
    schoolVi: 'Góc Sân Khấu Số 2',
    schoolEn: 'Stage Corner #2',
    color: '#F43F5E', // Rose 500
    badge: 'T2'
  },
  {
    id: 3,
    nameVi: 'Thí sinh 3 (Vị trí C)',
    nameEn: 'Contestant 3 (Pos C)',
    schoolVi: 'Góc Sân Khấu Số 3',
    schoolEn: 'Stage Corner #3',
    color: '#10B981', // Emerald 500
    badge: 'T3'
  },
  {
    id: 4,
    nameVi: 'Thí sinh 4 (Vị trí D)',
    nameEn: 'Contestant 4 (Pos D)',
    schoolVi: 'Góc Sân Khấu Số 4',
    schoolEn: 'Stage Corner #4',
    color: '#F59E0B', // Amber 500
    badge: 'T4'
  }
];

export const STAKE_LEVEL_CONFIG: Record<StakeLevel, {
  labelVi: string;
  labelEn: string;
  multiplier: number;
  pointsCost: number;
  colorClass: string;
}> = {
  SAFE: {
    labelVi: 'Tin tưởng x1.5',
    labelEn: 'Safe x1.5',
    multiplier: 1.5,
    pointsCost: 50,
    colorClass: 'bg-sky-500/20 border-sky-400/50 text-sky-300'
  },
  BALANCED: {
    labelVi: 'Đồng hành x2.0',
    labelEn: 'Balanced x2.0',
    multiplier: 2.0,
    pointsCost: 100,
    colorClass: 'bg-[#F7CAC9]/20 border-[#F7CAC9]/60 text-[#F7CAC9]'
  },
  MAX: {
    labelVi: 'Đặt cược x3.0',
    labelEn: 'Max Stake x3.0',
    multiplier: 3.0,
    pointsCost: 200,
    colorClass: 'bg-amber-500/20 border-amber-400/60 text-amber-300 animate-pulse'
  }
};

export const PREDICTION_STORAGE_KEY = 'bti_audience_predictions_v1';

/**
 * Get all saved predictions from LocalStorage
 */
export function getSavedPredictions(): AudiencePrediction[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(PREDICTION_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {
    console.warn('Error reading saved predictions:', err);
  }
  return [];
}

/**
 * Save a new prediction to LocalStorage
 */
export function savePrediction(prediction: AudiencePrediction): void {
  if (typeof window === 'undefined') return;
  try {
    const list = getSavedPredictions();
    // Remove duplicate for same question if re-staked
    const filtered = list.filter(p => p.questionId !== prediction.questionId);
    const updated = [prediction, ...filtered].slice(0, 50);
    localStorage.setItem(PREDICTION_STORAGE_KEY, JSON.stringify(updated));

    // Dispatch custom event for real-time listeners
    window.dispatchEvent(new CustomEvent('bti-prediction-updated', { detail: prediction }));
  } catch (err) {
    console.warn('Error saving prediction:', err);
  }
}

/**
 * Get active prediction for current question if any
 */
export function getPredictionForQuestion(questionId: string): AudiencePrediction | null {
  if (!questionId) return null;
  const list = getSavedPredictions();
  return list.find(p => p.questionId === questionId) || null;
}

/**
 * Calculate consecutive winning streak count
 */
export function getPredictionWinStreak(): number {
  const list = getSavedPredictions().filter(p => p.isEvaluated);
  let streak = 0;
  for (const p of list) {
    if (p.isWon) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
