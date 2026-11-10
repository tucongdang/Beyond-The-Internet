import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchFuzzyAnswer,
  extractOptionLetter,
  normalizeRoundKey,
  calculatePointsForRound
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
});
