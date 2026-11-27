import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchFuzzyAnswer,
  extractOptionLetter,
  normalizeRoundKey,
  calculatePointsForRound,
  getConfidenceMultiplierPreview,
  evaluateUserChoice,
  computeAudienceScoreFromResponses
} from './audienceScoringService';

describe('audienceScoringService pure logic', () => {
  test('matchFuzzyAnswer handles Vietnamese diacritics and multiple alternatives', () => {
    assert.equal(matchFuzzyAnswer('Trí tuệ nhân tạo', 'Tri tue nhan tao / AI'), true);
    assert.equal(matchFuzzyAnswer('ai', 'Trí tuệ nhân tạo | AI'), true);
    assert.equal(matchFuzzyAnswer('Blockchain', 'Trí tuệ nhân tạo | AI'), false);
  });

  test('extractOptionLetter extracts leading choice key accurately', () => {
    assert.equal(extractOptionLetter('A: Phishing'), 'A');
    assert.equal(extractOptionLetter('b. Deepfake'), 'B');
    assert.equal(extractOptionLetter('C - Zero Trust'), 'C');
    assert.equal(extractOptionLetter('D'), 'D');
  });

  test('normalizeRoundKey maps Vietnamese and shorthand round names to canonical keys', () => {
    assert.equal(normalizeRoundKey('Vòng 1 - Khởi Động'), 'round1');
    assert.equal(normalizeRoundKey('vcnv_2'), 'round2');
    assert.equal(normalizeRoundKey('Vòng 3: Tăng tốc'), 'round3');
    assert.equal(normalizeRoundKey('Vòng 4 - Về đích'), 'round4');
  });

  test('calculatePointsForRound computes speed bonuses and double-down risk accurately', () => {
    const r1Fast = calculatePointsForRound('round1', { isCorrect: true, latencySec: 2.1 });
    assert.equal(r1Fast.pointsEarned, 15);
    assert.equal(r1Fast.category, 'round1');

    const r3Tier1 = calculatePointsForRound('round3', { isCorrect: true, latencySec: 4.5, timeLimit: 20 });
    assert.equal(r3Tier1.pointsEarned, 40);

    const r4DoubleDownWin = calculatePointsForRound('round4', { isCorrect: true, isDoubleDown: true });
    assert.equal(r4DoubleDownWin.pointsEarned, 80);

    const r4DoubleDownLoss = calculatePointsForRound('round4', { isCorrect: false, isDoubleDown: true });
    assert.equal(r4DoubleDownLoss.pointsEarned, -40);
  });

  test('confidenceMultiplier scales both final gains and losses across rounds', () => {
    // Round 1 (base 10, fast 15): 2.0x -> +20 / +30 win, -10 loss
    assert.equal(calculatePointsForRound('round1', { isCorrect: true, latencySec: 5, confidenceMultiplier: 2.0 }).pointsEarned, 20);
    assert.equal(calculatePointsForRound('round1', { isCorrect: true, latencySec: 2.0, confidenceMultiplier: 2.0 }).pointsEarned, 30);
    assert.equal(calculatePointsForRound('round1', { isCorrect: false, confidenceMultiplier: 2.0 }).pointsEarned, -10);

    // Round 1 at 1.0x has zero penalty
    assert.equal(calculatePointsForRound('round1', { isCorrect: false, confidenceMultiplier: 1.0 }).pointsEarned, 0);

    // Round 3 (max 40, risk base 20): 2.5x -> +100 fast win, -30 loss
    assert.equal(calculatePointsForRound('round3', { isCorrect: true, latencySec: 3.0, timeLimit: 20, confidenceMultiplier: 2.5 }).pointsEarned, 100);
    assert.equal(calculatePointsForRound('round3', { isCorrect: false, confidenceMultiplier: 2.5 }).pointsEarned, -30);

    // Round 4 TRUE_FALSE_4 partial scaling at 2.0x
    assert.equal(calculatePointsForRound('round4', { isCorrect: true, partialPoints: 40, confidenceMultiplier: 2.0 }).pointsEarned, 80);
    assert.equal(calculatePointsForRound('round4', { isCorrect: false, partialPoints: 30, confidenceMultiplier: 2.0 }).pointsEarned, 20);
    assert.equal(calculatePointsForRound('round4', { isCorrect: false, partialPoints: 0, confidenceMultiplier: 2.0 }).pointsEarned, -40);

    // Round 4 DoubleDown + 3.0x multiplier overrides to 3.0x (+120 / -80)
    assert.equal(calculatePointsForRound('round4', { isCorrect: true, isDoubleDown: true, confidenceMultiplier: 3.0 }).pointsEarned, 120);
    assert.equal(calculatePointsForRound('round4', { isCorrect: false, isDoubleDown: true, confidenceMultiplier: 3.0 }).pointsEarned, -80);

    // Preview helper consistency
    const preview = getConfidenceMultiplierPreview('round1', 1.5);
    assert.equal(preview.minGain, 15);
    assert.equal(preview.maxGain, 23);
    assert.equal(preview.lossOnWrong, -5);

    // evaluateUserChoice & computeAudienceScoreFromResponses end-to-end
    const evalRes = evaluateUserChoice('B', 'A', 'MULTIPLE_CHOICE', 'KD_01', 4.0, undefined, 20, 2.0);
    assert.equal(evalRes.isCorrect, false);
    assert.equal(evalRes.pointsEarned, -10);

    const agg = computeAudienceScoreFromResponses(
      {
        KD_01: {
          u1: {
            choice: 'A',
            timestamp: 1000,
            latency_sec: 4.0,
            confidenceMultiplier: 2.5,
            user_info: { name: 'Test', mssv: '001', uid: 'u1' }
          }
        },
        KD_02: {
          u1: {
            choice: 'C',
            timestamp: 2000,
            latency_sec: 4.0,
            confidenceMultiplier: 1.5,
            user_info: { name: 'Test', mssv: '001', uid: 'u1' }
          }
        }
      },
      'u1',
      '001',
      [
        {
          id: 'KD_01',
          round_name: 'Vòng 1 - Khởi Động',
          round_type: 'MULTIPLE_CHOICE',
          category: 'Test',
          question_text: 'Q1',
          options: { A: 'Yes', B: 'No' },
          correct_key: 'A',
          explanation: '',
          time_limit: 20
        },
        {
          id: 'KD_02',
          round_name: 'Vòng 1 - Khởi Động',
          round_type: 'MULTIPLE_CHOICE',
          category: 'Test',
          question_text: 'Q2',
          options: { A: 'Yes', C: 'No' },
          correct_key: 'A',
          explanation: '',
          time_limit: 20
        }
      ]
    );
    // KD_01: +10 * 2.5 = +25; KD_02: -10 * 0.5 = -5 => total 20
    assert.equal(agg.totalScore, 20);
  });
});
