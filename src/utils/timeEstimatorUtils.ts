import { GameState, TournamentMatchStage } from '../types';

export interface RoundInfo {
  id: 'R1' | 'R2' | 'R3' | 'R4' | 'FINALE';
  number: number;
  nameVi: string;
  nameEn: string;
  shortName: string;
  shortNameEn: string;
  estimatedDurationMinutes: number;
}

export const TOURNAMENT_ROUNDS: RoundInfo[] = [
  {
    id: 'R1',
    number: 1,
    nameVi: 'Vòng 1: Khởi Động',
    nameEn: 'Round 1: Warm-up',
    shortName: 'Khởi Động',
    shortNameEn: 'Warm-up',
    estimatedDurationMinutes: 15
  },
  {
    id: 'R2',
    number: 2,
    nameVi: 'Vòng 2: Vượt Chướng Ngại Vật',
    nameEn: 'Round 2: Obstacle Challenge',
    shortName: 'VCNV',
    shortNameEn: 'Obstacles',
    estimatedDurationMinutes: 20
  },
  {
    id: 'R3',
    number: 3,
    nameVi: 'Vòng 3: Tăng Tốc',
    nameEn: 'Round 3: Acceleration',
    shortName: 'Tăng Tốc',
    shortNameEn: 'Acceleration',
    estimatedDurationMinutes: 15
  },
  {
    id: 'R4',
    number: 4,
    nameVi: 'Vòng 4: Về Đích',
    nameEn: 'Round 4: Final Sprint',
    shortName: 'Về Đích',
    shortNameEn: 'Final Sprint',
    estimatedDurationMinutes: 25
  }
];

export interface RoundTimeEstimate {
  status: 'SCHEDULED' | 'INTERMISSION' | 'COUNTDOWN' | 'IN_ROUND' | 'CONCLUDED' | 'STANDBY';
  statusLabelVi: string;
  statusLabelEn: string;
  nextRoundNameVi: string;
  nextRoundNameEn: string;
  currentRoundNameVi: string;
  currentRoundNameEn: string;
  currentRoundIndex: number; // 0 = R1, 1 = R2, 2 = R3, 3 = R4, 4 = Concluded
  remainingMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  formattedTime: string;
  targetTimestamp?: number;
  progressPercent: number; // 0 to 100
  isPaused: boolean;
  matchTitle: string;
  matchSubtitle?: string;
  matchStage?: TournamentMatchStage;
  estimatedNextRoundStartStr?: string;
}

/**
 * Determine the current round index (0-3) and details from round_name string
 */
export function detectRoundIndex(roundName?: string): number {
  if (!roundName) return 0;
  const lower = roundName.toLowerCase();
  if (lower.includes('1') || lower.includes('khởi động') || lower.includes('warm')) return 0;
  if (lower.includes('2') || lower.includes('chướng ngại') || lower.includes('vcnv') || lower.includes('obstacle')) return 1;
  if (lower.includes('3') || lower.includes('tăng tốc') || lower.includes('acceleration')) return 2;
  if (lower.includes('4') || lower.includes('về đích') || lower.includes('finish')) return 3;
  return 0;
}

/**
 * Get the next round info given a current round index or round name
 */
export function getNextRoundDetails(currentIndex: number): { nameVi: string; nameEn: string; nextIndex: number } {
  const nextIdx = currentIndex + 1;
  if (nextIdx < TOURNAMENT_ROUNDS.length) {
    return {
      nameVi: TOURNAMENT_ROUNDS[nextIdx].nameVi,
      nameEn: TOURNAMENT_ROUNDS[nextIdx].nameEn,
      nextIndex: nextIdx
    };
  }
  return {
    nameVi: 'Tổng Kết & Vinh Danh',
    nameEn: 'Final Ceremony & Awards',
    nextIndex: 4
  };
}

/**
 * Split milliseconds into days, hours, minutes, seconds
 */
export function splitMsToTime(ms: number): { days: number; hours: number; minutes: number; seconds: number } {
  if (ms <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { days, hours, minutes, seconds };
}

/**
 * Format remaining time to clean string
 */
export function formatRemainingTimeString(days: number, hours: number, minutes: number, seconds: number): string {
  if (days > 0) {
    return `${days}d ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Core pure logic: Estimate next round time and status based on GameState and current timestamp
 */
export function estimateNextRoundTime(
  gameState?: Partial<GameState> | null,
  now: number = Date.now()
): RoundTimeEstimate {
  const schedule = gameState?.event_schedule;
  const matchBreak = gameState?.match_break;
  const roundName = gameState?.round_name || 'Vòng 1: Khởi động';
  const currentRoundIdx = detectRoundIndex(roundName);
  const currentRound = TOURNAMENT_ROUNDS[currentRoundIdx] || TOURNAMENT_ROUNDS[0];
  const nextRound = getNextRoundDetails(currentRoundIdx);

  const matchTitle = schedule?.title || schedule?.match_name || 'Beyond The Internet 2027';
  const matchSubtitle = schedule?.match_subtitle || schedule?.location;
  const matchStage = schedule?.match_stage;

  // Case 1: Event Concluded
  if (schedule?.status === 'CONCLUDED') {
    return {
      status: 'CONCLUDED',
      statusLabelVi: 'Sự Kiện Đã Bế Mạc',
      statusLabelEn: 'Event Concluded',
      nextRoundNameVi: 'Lễ Tổng Kết & Vinh Danh',
      nextRoundNameEn: 'Final Awards Ceremony',
      currentRoundNameVi: 'Đã hoàn thành tất cả các vòng',
      currentRoundNameEn: 'All rounds completed',
      currentRoundIndex: 4,
      remainingMs: 0,
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 0,
      formattedTime: '00:00',
      progressPercent: 100,
      isPaused: false,
      matchTitle,
      matchSubtitle,
      matchStage
    };
  }

  // Case 2: Event Scheduled (Not yet started)
  const scheduledStartTime = schedule?.scheduled_start_time || 0;
  const isPreEvent = (schedule?.status === 'SCHEDULED' || (!schedule?.status && scheduledStartTime > 0)) && now < scheduledStartTime;

  const formatTargetClock = (ts?: number): string | undefined => {
    if (!ts || isNaN(ts)) return undefined;
    try {
      const d = new Date(ts);
      return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch {
      return undefined;
    }
  };

  if (isPreEvent && scheduledStartTime > 0) {
    const diffMs = Math.max(0, scheduledStartTime - now);
    const { days, hours, minutes, seconds } = splitMsToTime(diffMs);

    return {
      status: 'SCHEDULED',
      statusLabelVi: 'Chờ Giờ G Khai Mạc',
      statusLabelEn: 'Countdown to Opening',
      nextRoundNameVi: TOURNAMENT_ROUNDS[0].nameVi,
      nextRoundNameEn: TOURNAMENT_ROUNDS[0].nameEn,
      currentRoundNameVi: 'Phòng chờ khai mạc',
      currentRoundNameEn: 'Pre-event lobby',
      currentRoundIndex: 0,
      remainingMs: diffMs,
      days,
      hours,
      minutes,
      seconds,
      formattedTime: formatRemainingTimeString(days, hours, minutes, seconds),
      targetTimestamp: scheduledStartTime,
      estimatedNextRoundStartStr: formatTargetClock(scheduledStartTime),
      progressPercent: 0,
      isPaused: false,
      matchTitle,
      matchSubtitle,
      matchStage
    };
  }

  // Case 3: Intermission / Match Break Active
  if (matchBreak?.active) {
    const totalDurationSec = matchBreak.duration_seconds || 0;
    let remainingSec = 0;
    const isPaused = Boolean(matchBreak.is_paused);

    if (isPaused) {
      remainingSec = Math.max(0, matchBreak.paused_remaining_seconds ?? totalDurationSec);
    } else {
      const elapsedMs = Math.max(0, now - (matchBreak.start_time || now));
      const elapsedSec = Math.floor(elapsedMs / 1000);
      remainingSec = Math.max(0, totalDurationSec - elapsedSec);
    }

    const remainingMs = remainingSec * 1000;
    const { days, hours, minutes, seconds } = splitMsToTime(remainingMs);
    const progressPercent = totalDurationSec > 0 
      ? Math.min(100, Math.max(0, Math.round(((totalDurationSec - remainingSec) / totalDurationSec) * 100))) 
      : 0;
    const targetTimestamp = now + remainingMs;

    return {
      status: 'INTERMISSION',
      statusLabelVi: isPaused ? 'Tạm Dừng Hội Ý' : 'Nghỉ Giữa Trận • Sắp Vào Vòng Mới',
      statusLabelEn: isPaused ? 'Break Paused' : 'Match Break • Next Round Soon',
      nextRoundNameVi: nextRound.nameVi,
      nextRoundNameEn: nextRound.nameEn,
      currentRoundNameVi: currentRound.nameVi,
      currentRoundNameEn: currentRound.nameEn,
      currentRoundIndex: currentRoundIdx,
      remainingMs,
      days,
      hours,
      minutes,
      seconds,
      formattedTime: formatRemainingTimeString(days, hours, minutes, seconds),
      targetTimestamp,
      estimatedNextRoundStartStr: formatTargetClock(targetTimestamp),
      progressPercent,
      isPaused,
      matchTitle: matchBreak.title || matchTitle,
      matchSubtitle: matchBreak.subtitle || matchSubtitle,
      matchStage
    };
  }

  // Case 4: Next Question Intermission Timer Active
  const nextQWaitLimit = Number(gameState?.next_question_wait_limit) || 0;
  const nextQWaitStart = Number(gameState?.next_question_wait_start) || 0;
  const isNextQActive = nextQWaitLimit > 0 && nextQWaitStart > 0 && (now - nextQWaitStart) < (nextQWaitLimit * 1000);

  if (isNextQActive) {
    const elapsedMs = Math.max(0, now - nextQWaitStart);
    const totalMs = nextQWaitLimit * 1000;
    const remainingMs = Math.max(0, totalMs - elapsedMs);
    const { days, hours, minutes, seconds } = splitMsToTime(remainingMs);
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedMs / totalMs) * 100)));
    const targetTimestamp = nextQWaitStart + totalMs;

    return {
      status: 'COUNTDOWN',
      statusLabelVi: 'Đếm Ngược Câu Hỏi Kế Tiếp',
      statusLabelEn: 'Next Question Countdown',
      nextRoundNameVi: gameState?.next_question_wait_message || 'Chuẩn bị cho câu hỏi tiếp theo',
      nextRoundNameEn: gameState?.next_question_wait_message || 'Prepare for next item',
      currentRoundNameVi: currentRound.nameVi,
      currentRoundNameEn: currentRound.nameEn,
      currentRoundIndex: currentRoundIdx,
      remainingMs,
      days,
      hours,
      minutes,
      seconds,
      formattedTime: formatRemainingTimeString(days, hours, minutes, seconds),
      targetTimestamp,
      estimatedNextRoundStartStr: formatTargetClock(targetTimestamp),
      progressPercent,
      isPaused: false,
      matchTitle,
      matchSubtitle,
      matchStage
    };
  }

  // Case 5: Active Round in Progress with estimated remaining time
  // If the event started at `schedule.started_at` or `server_start_time` or match is underway
  const isMatchLive = schedule?.status === 'IN_PROGRESS' || Boolean(gameState?.round_name);
  const startedAt = schedule?.started_at || (schedule?.status === 'IN_PROGRESS' ? scheduledStartTime : 0) || (gameState?.server_start_time as number | undefined) || 0;
  const roundEstimatedDurationMs = currentRound.estimatedDurationMinutes * 60 * 1000;

  if (isMatchLive) {
    const effectiveStart = startedAt > 0 ? startedAt : (now - 2 * 60 * 1000); // sensible baseline
    // Prior rounds duration before current round
    const priorRoundsMs = TOURNAMENT_ROUNDS.slice(0, currentRoundIdx).reduce((acc, r) => acc + r.estimatedDurationMinutes * 60 * 1000, 0);
    const currentRoundStartEst = effectiveStart + priorRoundsMs;
    const currentRoundEndEst = currentRoundStartEst + roundEstimatedDurationMs;
    const remainingInRoundMs = Math.max(0, currentRoundEndEst - now);
    const { days, hours, minutes, seconds } = splitMsToTime(remainingInRoundMs);
    const elapsedInRound = Math.max(0, now - currentRoundStartEst);
    const progressPercent = Math.min(100, Math.max(0, Math.round((elapsedInRound / roundEstimatedDurationMs) * 100)));

    return {
      status: 'IN_ROUND',
      statusLabelVi: `Đang Thi Đấu • ${currentRound.shortName}`,
      statusLabelEn: `Live • ${currentRound.nameEn}`,
      nextRoundNameVi: nextRound.nameVi,
      nextRoundNameEn: nextRound.nameEn,
      currentRoundNameVi: currentRound.nameVi,
      currentRoundNameEn: currentRound.nameEn,
      currentRoundIndex: currentRoundIdx,
      remainingMs: remainingInRoundMs,
      days,
      hours,
      minutes,
      seconds,
      formattedTime: formatRemainingTimeString(days, hours, minutes, seconds),
      targetTimestamp: currentRoundEndEst,
      estimatedNextRoundStartStr: formatTargetClock(currentRoundEndEst),
      progressPercent,
      isPaused: Boolean(gameState?.is_timer_paused),
      matchTitle,
      matchSubtitle,
      matchStage
    };
  }

  // Case 6: Standby / Ready
  return {
    status: 'STANDBY',
    statusLabelVi: 'Sẵn Sàng Cho Vòng Đấu',
    statusLabelEn: 'Ready for Round',
    nextRoundNameVi: currentRound.nameVi,
    nextRoundNameEn: currentRound.nameEn,
    currentRoundNameVi: currentRound.nameVi,
    currentRoundNameEn: currentRound.nameEn,
    currentRoundIndex: currentRoundIdx,
    remainingMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    formattedTime: '00:00',
    progressPercent: 0,
    isPaused: false,
    matchTitle,
    matchSubtitle,
    matchStage
  };
}
