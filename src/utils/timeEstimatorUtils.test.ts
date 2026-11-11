import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectRoundIndex,
  getNextRoundDetails,
  splitMsToTime,
  formatRemainingTimeString,
  estimateNextRoundTime,
  TOURNAMENT_ROUNDS
} from './timeEstimatorUtils';

test('TOURNAMENT_ROUNDS defines both Vietnamese shortName and English shortNameEn for all 4 rounds', () => {
  assert.equal(TOURNAMENT_ROUNDS.length, 4);
  assert.equal(TOURNAMENT_ROUNDS[0].shortName, 'Khởi Động');
  assert.equal(TOURNAMENT_ROUNDS[0].shortNameEn, 'Warm-up');
  assert.equal(TOURNAMENT_ROUNDS[1].shortName, 'VCNV');
  assert.equal(TOURNAMENT_ROUNDS[1].shortNameEn, 'Obstacles');
  assert.equal(TOURNAMENT_ROUNDS[2].shortName, 'Tăng Tốc');
  assert.equal(TOURNAMENT_ROUNDS[2].shortNameEn, 'Acceleration');
  assert.equal(TOURNAMENT_ROUNDS[3].shortName, 'Về Đích');
  assert.equal(TOURNAMENT_ROUNDS[3].shortNameEn, 'Final Sprint');
});

test('detectRoundIndex and getNextRoundDetails map round names accurately', () => {
  assert.equal(detectRoundIndex('Vòng 1: Khởi động'), 0);
  assert.equal(detectRoundIndex('Vòng 2: Vượt Chướng Ngại Vật'), 1);
  assert.equal(detectRoundIndex('Round 3: Acceleration'), 2);
  assert.equal(detectRoundIndex('Vòng 4: Về Đích'), 3);

  const nextAfterR1 = getNextRoundDetails(0);
  assert.equal(nextAfterR1.nameVi, 'Vòng 2: Vượt Chướng Ngại Vật');
  assert.equal(nextAfterR1.nameEn, 'Round 2: Obstacle Challenge');

  const nextAfterR4 = getNextRoundDetails(3);
  assert.equal(nextAfterR4.nameVi, 'Tổng Kết & Vinh Danh');
  assert.equal(nextAfterR4.nameEn, 'Final Ceremony & Awards');
});

test('splitMsToTime and formatRemainingTimeString format countdown durations properly', () => {
  const parts = splitMsToTime(3665000);
  assert.deepEqual(parts, { days: 0, hours: 1, minutes: 1, seconds: 5 });
  assert.equal(formatRemainingTimeString(parts.days, parts.hours, parts.minutes, parts.seconds), '01:01:05');
});

test('estimateNextRoundTime returns clean localized labels for SCHEDULED, INTERMISSION, and IN_ROUND states', () => {
  const now = 1_700_000_000_000;

  // Scheduled
  const scheduledEst = estimateNextRoundTime({
    event_schedule: {
      enabled: true,
      status: 'SCHEDULED',
      scheduled_start_time: now + 600_000,
      title: 'Beyond The Internet 2027'
    }
  }, now);
  assert.equal(scheduledEst.status, 'SCHEDULED');
  assert.equal(scheduledEst.statusLabelVi, 'Chờ Giờ G Khai Mạc');
  assert.equal(scheduledEst.minutes, 10);

  // Paused Intermission (pure Vietnamese without English "(Paused)")
  const pausedBreakEst = estimateNextRoundTime({
    round_name: 'Vòng 1: Khởi Động',
    match_break: {
      active: true,
      title: 'Nghỉ giữa hiệp',
      is_paused: true,
      duration_seconds: 300,
      paused_remaining_seconds: 120,
      start_time: now - 60_000
    }
  }, now);
  assert.equal(pausedBreakEst.status, 'INTERMISSION');
  assert.equal(pausedBreakEst.statusLabelVi, 'Tạm Dừng Hội Ý');
  assert.equal(pausedBreakEst.statusLabelEn, 'Break Paused');
  assert.equal(pausedBreakEst.minutes, 2);
});
