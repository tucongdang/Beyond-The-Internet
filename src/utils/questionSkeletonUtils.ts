import { GameState, RoundType } from '../types';

export type QuestionSkeletonVariant =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE_4'
  | 'TRUE_FALSE'
  | 'SEQUENCING'
  | 'SHORT_ANSWER'
  | 'IMAGE_POLL'
  | 'BLIND_POLL'
  | 'VCNV';

export interface QuestionSkeletonCheckParams {
  gameState: Pick<
    GameState,
    | 'status'
    | 'question_id'
    | 'question_text'
    | 'round_type'
    | 'options'
    | 'next_question_wait_limit'
    | 'next_question_wait_start'
    | 'vcnv_risk_question'
    | 'vcnv_risk_status'
  >;
  isSyncingFromService: boolean;
  isTransitioningQuestion: boolean;
  nowMs: number;
}

/**
 * Determines whether the "Next Question Countdown" window is currently active.
 */
export function isNextQuestionWaitActive(
  gameState: Pick<GameState, 'next_question_wait_limit' | 'next_question_wait_start'>,
  nowMs: number
): boolean {
  const limit = Number(gameState?.next_question_wait_limit) || 0;
  const start = Number(gameState?.next_question_wait_start) || 0;
  if (limit <= 0 || start <= 0) return false;
  const elapsedSec = (nowMs - start) / 1000;
  return limit - elapsedSec > 0;
}

/**
 * Pure predicate that decides whether AudienceView question cards should display
 * the loading skeleton while waiting for new question data from syncService.
 */
export function shouldShowQuestionSkeleton(params: QuestionSkeletonCheckParams): boolean {
  const { gameState, isSyncingFromService, isTransitioningQuestion, nowMs } = params;

  if (isSyncingFromService || isTransitioningQuestion) {
    return true;
  }

  if (isNextQuestionWaitActive(gameState, nowMs)) {
    return true;
  }

  if (gameState.status === 'ACTIVE') {
    if (!gameState.question_id || !gameState.question_id.trim()) {
      return true;
    }

    const isBlindPoll = gameState.round_type === 'BLIND_POLL';
    const isVcnv =
      gameState.round_type === 'VCNV' || Boolean(gameState.question_id?.startsWith('VCNV'));

    if (!isBlindPoll && !isVcnv && (!gameState.question_text || !gameState.question_text.trim())) {
      return true;
    }
  }

  return false;
}

/**
 * Resolves the appropriate skeleton layout variant and option count based on the round type.
 */
export function getQuestionSkeletonLayout(
  roundType?: RoundType | string,
  options?: Record<string, string>
): {
  variant: QuestionSkeletonVariant;
  optionCount: number;
} {
  const existingKeysCount = options ? Object.keys(options).length : 0;

  switch (roundType) {
    case 'TRUE_FALSE_4':
      return { variant: 'TRUE_FALSE_4', optionCount: existingKeysCount || 4 };
    case 'TRUE_FALSE':
      return { variant: 'TRUE_FALSE', optionCount: 2 };
    case 'SEQUENCING':
      return { variant: 'SEQUENCING', optionCount: existingKeysCount || 4 };
    case 'SHORT_ANSWER':
    case 'FILL_IN_BLANK':
      return { variant: 'SHORT_ANSWER', optionCount: 1 };
    case 'IMAGE_POLL':
      return { variant: 'IMAGE_POLL', optionCount: existingKeysCount || 4 };
    case 'BLIND_POLL':
      return { variant: 'BLIND_POLL', optionCount: existingKeysCount || 4 };
    case 'VCNV':
      return { variant: 'VCNV', optionCount: 4 };
    case 'ELIMINATION_6':
      return { variant: 'MULTIPLE_CHOICE', optionCount: existingKeysCount || 6 };
    case 'MULTIPLE_CHOICE':
    default:
      return { variant: 'MULTIPLE_CHOICE', optionCount: existingKeysCount || 4 };
  }
}
