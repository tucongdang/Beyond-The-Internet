import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isNextQuestionWaitActive,
  shouldShowQuestionSkeleton,
  getQuestionSkeletonLayout
} from './questionSkeletonUtils';

test('isNextQuestionWaitActive detects active countdown window accurately', () => {
  const now = 100000;
  assert.equal(
    isNextQuestionWaitActive({ next_question_wait_limit: 5, next_question_wait_start: 98000 }, now),
    true
  );
  assert.equal(
    isNextQuestionWaitActive({ next_question_wait_limit: 5, next_question_wait_start: 90000 }, now),
    false
  );
  assert.equal(
    isNextQuestionWaitActive({ next_question_wait_limit: 0, next_question_wait_start: 99000 }, now),
    false
  );
});

test('shouldShowQuestionSkeleton returns true when syncService is syncing or question is transitioning', () => {
  const baseGameState = {
    status: 'ACTIVE' as const,
    question_id: 'Q01',
    question_text: 'Câu hỏi thử nghiệm?',
    round_type: 'MULTIPLE_CHOICE' as const,
    options: { A: '1', B: '2', C: '3', D: '4' },
    next_question_wait_limit: 0,
    next_question_wait_start: 0
  };

  assert.equal(
    shouldShowQuestionSkeleton({
      gameState: baseGameState,
      isSyncingFromService: true,
      isTransitioningQuestion: false,
      nowMs: 10000
    }),
    true
  );

  assert.equal(
    shouldShowQuestionSkeleton({
      gameState: baseGameState,
      isSyncingFromService: false,
      isTransitioningQuestion: true,
      nowMs: 10000
    }),
    true
  );

  assert.equal(
    shouldShowQuestionSkeleton({
      gameState: baseGameState,
      isSyncingFromService: false,
      isTransitioningQuestion: false,
      nowMs: 10000
    }),
    false
  );
});

test('shouldShowQuestionSkeleton returns true when ACTIVE question text is missing or next question countdown is active', () => {
  assert.equal(
    shouldShowQuestionSkeleton({
      gameState: {
        status: 'ACTIVE',
        question_id: 'Q02',
        question_text: '   ',
        round_type: 'MULTIPLE_CHOICE',
        options: {},
        next_question_wait_limit: 0,
        next_question_wait_start: 0
      },
      isSyncingFromService: false,
      isTransitioningQuestion: false,
      nowMs: 50000
    }),
    true
  );

  assert.equal(
    shouldShowQuestionSkeleton({
      gameState: {
        status: 'STANDBY',
        question_id: 'Q02',
        question_text: 'Có nội dung',
        round_type: 'MULTIPLE_CHOICE',
        options: { A: '1', B: '2' },
        next_question_wait_limit: 10,
        next_question_wait_start: 45000
      },
      isSyncingFromService: false,
      isTransitioningQuestion: false,
      nowMs: 50000
    }),
    true
  );
});

test('getQuestionSkeletonLayout returns matching variant and option count per round type', () => {
  assert.deepEqual(getQuestionSkeletonLayout('MULTIPLE_CHOICE'), {
    variant: 'MULTIPLE_CHOICE',
    optionCount: 4
  });
  assert.deepEqual(getQuestionSkeletonLayout('ELIMINATION_6'), {
    variant: 'MULTIPLE_CHOICE',
    optionCount: 6
  });
  assert.deepEqual(getQuestionSkeletonLayout('TRUE_FALSE_4'), {
    variant: 'TRUE_FALSE_4',
    optionCount: 4
  });
  assert.deepEqual(getQuestionSkeletonLayout('SHORT_ANSWER'), {
    variant: 'SHORT_ANSWER',
    optionCount: 1
  });
  assert.deepEqual(getQuestionSkeletonLayout('SEQUENCING', { A: '1', B: '2', C: '3', D: '4', E: '5' }), {
    variant: 'SEQUENCING',
    optionCount: 5
  });
});
