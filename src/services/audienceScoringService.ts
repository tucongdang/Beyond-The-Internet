import { AudienceScoreState, ScoreBreakdown, ScoringResult, UserResponse, QuestionItem, GameState } from '../types';
import { INITIAL_QUESTION_BANK } from '../data/questionBank';
import { normalizeVcnvAnswer } from '../utils/exportUtils';

export { normalizeVcnvAnswer };

/**
 * Fuzzy match helper that handles Vietnamese diacritics, whitespace, punctuation,
 * and multiple acceptable alternate answers delimited by '/', '|', ';', or newlines.
 */
export function matchFuzzyAnswer(userAnswer: string, correctKey: string): boolean {
  if (!userAnswer || !correctKey) return false;
  const normUser = normalizeVcnvAnswer(userAnswer);
  if (!normUser) return false;

  // Split correctKey by delimiter if multiple acceptable answers provided: '/', '|', ';', or '\n'
  const alternatives = correctKey
    .split(/[/|;\n]+/)
    .map(k => normalizeVcnvAnswer(k))
    .filter(Boolean);

  if (alternatives.length === 0) {
    return normUser === normalizeVcnvAnswer(correctKey);
  }
  return alternatives.includes(normUser);
}

/**
 * Extract leading option letter if formatted like 'A: Option', 'A. Option', or 'A - Option'
 */
export function extractOptionLetter(str: string): string {
  const trimmed = (str || '').trim();
  const match = trimmed.match(/^([A-Z0-9])[\s:.)-]/i);
  return match ? match[1].toUpperCase() : trimmed.toUpperCase();
}

/**
 * Default empty Audience Score State structure
 */
export const createInitialAudienceScoreState = (): AudienceScoreState => ({
  totalScore: 0,
  scoreBreakdown: {
    round1: 0,
    round2: 0,
    round3: 0,
    round4: 0
  },
  correctAnswersCount: 0,
  totalAnswered: 0,
  history: []
});

/**
 * Helper to normalize round IDs into standard breakdown keys ('round1', 'round2', 'round3', 'round4')
 */
export function normalizeRoundKey(roundId: string): keyof ScoreBreakdown {
  const r = (roundId || '').toLowerCase().trim();
  if (r.includes('1') || r.includes('kd') || r.includes('khoi_dong') || r.includes('khởi động') || r.includes('vòng 1')) {
    return 'round1';
  }
  if (r.includes('2') || r.includes('vcnv') || r.includes('chuong_ngai_vat') || r.includes('chướng ngại vật') || r.includes('vòng 2')) {
    return 'round2';
  }
  if (r.includes('3') || r.includes('tt') || r.includes('tang_toc') || r.includes('tăng tốc') || r.includes('vòng 3')) {
    return 'round3';
  }
  if (r.includes('4') || r.includes('vd') || r.includes('ve_dich') || r.includes('về đích') || r.includes('thuc_hanh') || r.includes('kich_tuong_tac') || r.includes('vòng 4')) {
    return 'round4';
  }
  return 'round1';
}

/**
 * PURE FUNCTION: Calculate exact points earned for a response in a specific round.
 * 
 * SCORING RULES:
 * - Round 1 (Khởi động chung): +10 points for correct answer (+5 bonus if fast response < 3s, total 15đ).
 * - Round 2 (VCNV):
 *     * Ô mạo hiểm (Risk Box): +120 points.
 *     * Dự đoán Từ khóa CNV (CNV Keyword): +80 points.
 *     * Đúng cả hai (Nhánh 2): +200 points.
 *     * (Không áp dụng điểm cho gợi ý hàng ngang).
 * - Round 3 (Tăng tốc): Phù hợp cho hội trường đông người với các mốc thời gian phản hồi:
 *     * Câu hỏi 20 giây (TT_01, TT_02,...):
 *         - ≤ 5.0s: +40 điểm
 *         - 5.0s - 10.0s: +30 điểm
 *         - 10.0s - 15.0s: +20 điểm
 *         - > 15.0s (hoặc 15s - 20s): +10 điểm
 *     * Câu hỏi 30 giây (TT_03, TT_04,...):
 *         - ≤ 7.5s: +40 điểm
 *         - 7.5s - 15.0s: +30 điểm
 *         - 15.0s - 22.5s: +20 điểm
 *         - > 22.5s (hoặc 22.5s - 30s): +10 điểm
 * - Round 4 (Về đích - Kịch tương tác / Thực hành / Đúng Sai 4 ý):
 *     * Trắc nghiệm / Kịch tương tác / Thực hành: +40 points.
 *     * Đúng / Sai 4 ý: 10 points per correct sub-item (4/4 = 40đ, 3/4 = 30đ, 2/4 = 20đ, 1/4 = 10đ).
 *     * Cược Nhân Đôi All-In (Double Down): Đúng +80 points, Sai trừ 100% (-40 points).
 */
export function calculatePointsForRound(
  roundId: string,
  result: ScoringResult
): { pointsEarned: number; category: keyof ScoreBreakdown; notice: string } {
  const category = normalizeRoundKey(roundId);

  // If explicit partialPoints is provided (e.g. for TRUE_FALSE_4)
  if (result.partialPoints !== undefined) {
    if (category === 'round4' && result.isDoubleDown) {
      if (result.partialPoints === 40) {
        return { pointsEarned: 80, category, notice: '⚡ XUẤT SẮC: ĐÚNG 4/4 Ý CƯỢC ALL-IN VỀ ĐÍCH (+80đ)' };
      } else {
        return { pointsEarned: -40, category, notice: '⚠️ RỦI RO: KHÔNG ĐẠT 4/4 Ý ALL-IN VỀ ĐÍCH (-40đ / Trừ 100%)' };
      }
    }
    const pts = Math.max(0, result.partialPoints);
    let notice = pts > 0 ? `Đạt ${pts}đ (Đúng từng phần)` : 'Chưa chính xác (0 điểm)';
    if (pts === 40) notice = 'Chính xác hoàn hảo 4/4 ý (+40đ)';
    return { pointsEarned: pts, category, notice };
  }

  if (!result.isCorrect) {
    if (category === 'round4' && result.isDoubleDown) {
      return { pointsEarned: -40, category, notice: '⚠️ RỦI RO: SAI CƯỢC ALL-IN VỀ ĐÍCH (-40đ / Trừ 100%)' };
    }
    return { pointsEarned: 0, category, notice: 'Chưa chính xác (0 điểm)' };
  }

  let pointsEarned = 0;
  let notice = '';

  switch (category) {
    case 'round1': {
      // Round 1 (Khởi động): +10 points correct, +5 bonus if fast < 3s
      pointsEarned = 10;
      const latencySec = result.latencySec ?? 99;
      if (latencySec >= 0 && latencySec < 3.0) {
        pointsEarned += 5;
        notice = 'Đúng Khởi Động (+10) + Thưởng Tốc Độ <3s (+5) = +15đ';
      } else {
        notice = 'Đúng Khởi Động (+10đ)';
      }
      break;
    }

    case 'round2': {
      // Round 2 (VCNV): Ô mạo hiểm (+120), Dự đoán CNV (+80)
      if (result.isRiskBox || result.subType === 'RISK_BOX') {
        pointsEarned = 120;
        notice = 'Đúng Ô Mạo Hiểm VCNV (+120đ)';
      } else if (result.isCnvKeyword || result.subType === 'CNV_KEYWORD') {
        pointsEarned = 80;
        notice = 'Dự đoán đúng Chướng Ngại Vật (+80đ)';
      } else {
        // Mặc định dự đoán VCNV
        pointsEarned = 80;
        notice = 'Dự đoán đúng Chướng Ngại Vật (+80đ)';
      }
      break;
    }

    case 'round3': {
      // Round 3 (Tăng tốc): Tính điểm dựa theo mốc thời gian phản hồi của câu hỏi (hỗ trợ cả mốc 20s và 30s)
      const latency = result.latencySec ?? 20.0;
      const limit = result.timeLimit || 20;

      if (limit >= 28) {
        // Cấu hình mốc thời gian cho câu hỏi 30 giây (chia đều 4 mốc: ≤7.5s, ≤15s, ≤22.5s, >22.5s):
        if (latency <= 7.5) {
          pointsEarned = 40;
          notice = `Tăng Tốc: Xuất sắc ≤7.5s (${latency.toFixed(1)}s) (+40đ)`;
        } else if (latency <= 15.0) {
          pointsEarned = 30;
          notice = `Tăng Tốc: Nhanh 7.5-15s (${latency.toFixed(1)}s) (+30đ)`;
        } else if (latency <= 22.5) {
          pointsEarned = 20;
          notice = `Tăng Tốc: 15-22.5s (${latency.toFixed(1)}s) (+20đ)`;
        } else {
          pointsEarned = 10;
          notice = `Tăng Tốc: >22.5s (${latency.toFixed(1)}s) (+10đ)`;
        }
      } else {
        // Cấu hình mốc thời gian cho câu hỏi 20 giây (chia đều 4 mốc: ≤5s, ≤10s, ≤15s, >15s):
        if (latency <= 5.0) {
          pointsEarned = 40;
          notice = `Tăng Tốc: Xuất sắc ≤5s (${latency.toFixed(1)}s) (+40đ)`;
        } else if (latency <= 10.0) {
          pointsEarned = 30;
          notice = `Tăng Tốc: Nhanh 5-10s (${latency.toFixed(1)}s) (+30đ)`;
        } else if (latency <= 15.0) {
          pointsEarned = 20;
          notice = `Tăng Tốc: 10-15s (${latency.toFixed(1)}s) (+20đ)`;
        } else {
          pointsEarned = 10;
          notice = `Tăng Tốc: >15s (${latency.toFixed(1)}s) (+10đ)`;
        }
      }
      break;
    }

    case 'round4': {
      // Round 4 (Về đích - Kịch tương tác / Câu hỏi thực hành / Trắc nghiệm): +40 points (hoặc +80 nếu All-In)
      if (result.isDoubleDown) {
        pointsEarned = 80;
        notice = '⚡ XUẤT SẮC: ĐÚNG CƯỢC ALL-IN VỀ ĐÍCH (+80đ)';
      } else {
        pointsEarned = 40;
        notice = 'Đúng Về Đích - Kịch Tương Tác / Thực Hành (+40đ)';
      }
      break;
    }

    default: {
      pointsEarned = 10;
      notice = 'Đúng câu hỏi (+10đ)';
      break;
    }
  }

  return { pointsEarned, category, notice };
}

/**
 * PURE EVALUATION FUNCTION: Evaluate user choice against correct key
 */
export function evaluateUserChoice(
  choice: string,
  correctKey: string,
  roundType?: string,
  questionId?: string,
  latencySec?: number,
  speedRank?: number,
  timeLimit?: number
): { isCorrect: boolean; pointsEarned: number; partialPoints?: number; notice?: string } {
  if (!choice || !correctKey) {
    return { isCorrect: false, pointsEarned: 0, notice: 'Chưa có đáp án' };
  }

  const uChoice = (choice || '').trim();
  const cKey = (correctKey || '').trim();

  let isCorrect = false;
  let partialPoints: number | undefined = undefined;

  // 1. True / False 4 sub-statements
  if (roundType === 'TRUE_FALSE_4') {
    const uParts = uChoice.split(/[,;\n]+/).map(s => s.trim().toUpperCase());
    const cParts = cKey.split(/[,;\n]+/).map(s => s.trim().toUpperCase());

    let subCorrectCount = 0;
    
    // Extract standard keys present in cParts or fallback to A, B, C, D
    const keysToCheck: string[] = [];
    cParts.forEach(cp => {
      const match = cp.match(/^([A-Z0-9]+)\s*[:.)-]/i);
      if (match) {
        const k = match[1].toUpperCase();
        if (!keysToCheck.includes(k)) keysToCheck.push(k);
      }
    });
    if (keysToCheck.length === 0) {
      keysToCheck.push('A', 'B', 'C', 'D');
    }

    keysToCheck.forEach(k => {
      // Find matching item in correct key and user choice
      const cItem = cParts.find(cp => cp.startsWith(k + ':') || cp.startsWith(k + '.') || cp.startsWith(k + '-') || cp.startsWith(k + ' ') || cp === k);
      const uItem = uParts.find(up => up.startsWith(k + ':') || up.startsWith(k + '.') || up.startsWith(k + '-') || up.startsWith(k + ' ') || up === k);

      if (cItem && uItem) {
        // True values: Đ, T, 1, TRUE, DUNG, DÚNG
        // False values: S, F, 0, FALSE, SAI
        const isCTrue = cItem.includes('Đ') || cItem.includes('T') || cItem.includes('1') || cItem.includes('TRUE') || cItem.includes('DUNG');
        const isUTrue = uItem.includes('Đ') || uItem.includes('T') || uItem.includes('1') || uItem.includes('TRUE') || uItem.includes('DUNG');
        if (isCTrue === isUTrue) {
          subCorrectCount++;
        }
      }
    });

    isCorrect = subCorrectCount === keysToCheck.length;
    partialPoints = subCorrectCount * 10; // 10đ per correct sub-item
  } else if (roundType === 'VCNV' || questionId?.startsWith('VCNV') || questionId === 'VCNV_RISK' || questionId === 'VCNV_KEYWORD') {
    // 2. VCNV Fuzzy Matching
    isCorrect = matchFuzzyAnswer(uChoice, cKey);
  } else if (roundType === 'SHORT_ANSWER') {
    // 3. Short Answer Fuzzy Matching
    isCorrect = matchFuzzyAnswer(uChoice, cKey);
  } else if (roundType === 'SEQUENCING') {
    // 4. Sequencing: match single option letter OR normalized sequence string
    const normU = uChoice.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const normC = cKey.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const uLetter = uChoice.trim().toUpperCase();
    const cLetter = cKey.trim().toUpperCase();
    isCorrect = (uLetter === cLetter) || (normU === normC && normU.length > 0);
  } else if (roundType === 'ELIMINATION_6') {
    // 5. Elimination 6: match option letter or multiple comma/space separated letters
    const normU = uChoice.split(/[,;\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean).sort().join(',');
    const normC = cKey.split(/[,;\s]+/).map(s => s.trim().toUpperCase()).filter(Boolean).sort().join(',');
    isCorrect = (uChoice.trim().toUpperCase() === cKey.trim().toUpperCase()) || (normU === normC && normU.length > 0);
  } else {
    // 6. Multiple Choice / Blind Poll / Standard
    const uLetter = extractOptionLetter(uChoice);
    const cLetter = extractOptionLetter(cKey);
    isCorrect = (uChoice.trim().toUpperCase() === cKey.trim().toUpperCase()) || (uLetter === cLetter && uLetter.length > 0);
  }

  // Derive round category
  let roundId = questionId || roundType || 'round1';
  if (questionId?.startsWith('KD_')) roundId = 'round1';
  else if (questionId?.startsWith('VCNV')) roundId = 'round2';
  else if (questionId?.startsWith('TT_')) roundId = 'round3';
  else if (questionId?.startsWith('VD_')) roundId = 'round4';

  const derivedTimeLimit = timeLimit || (
    questionId === 'TT_03' || questionId === 'TT_04' ? 30 :
    questionId === 'TT_01' || questionId === 'TT_02' ? 20 :
    20
  );

  const isRisk = questionId === 'VCNV_RISK';
  const isCnv = questionId === 'VCNV_KEYWORD' || questionId === 'VCNV_01';

  const { pointsEarned, notice } = calculatePointsForRound(roundId, {
    isCorrect,
    partialPoints,
    latencySec,
    speedRank,
    timeLimit: derivedTimeLimit,
    isRiskBox: isRisk,
    isCnvKeyword: isCnv,
    subType: isRisk ? 'RISK_BOX' : isCnv ? 'CNV_KEYWORD' : 'STANDARD'
  });

  return { isCorrect, pointsEarned, partialPoints, notice };
}

/**
 * PURE FUNCTION: Immutable state update function.
 * Accepts current audience score state and response result, returning updated AudienceScoreState.
 */
export function updateAudienceScore(
  currentState: AudienceScoreState | null | undefined,
  roundId: string,
  result: ScoringResult,
  questionId: string = 'Q_DEFAULT'
): AudienceScoreState {
  const state: AudienceScoreState = currentState
    ? {
        ...currentState,
        scoreBreakdown: { ...currentState.scoreBreakdown }
      }
    : createInitialAudienceScoreState();

  const { pointsEarned, category } = calculatePointsForRound(roundId, result);

  const updatedTotalScore = state.totalScore + pointsEarned;
  const updatedRoundScore = (state.scoreBreakdown[category] || 0) + pointsEarned;

  const historyEntry = {
    questionId,
    roundId,
    pointsEarned,
    isCorrect: result.isCorrect || Boolean(result.partialPoints && result.partialPoints > 0),
    latencySec: result.latencySec,
    timestamp: Date.now()
  };

  return {
    ...state,
    totalScore: updatedTotalScore,
    scoreBreakdown: {
      ...state.scoreBreakdown,
      [category]: updatedRoundScore
    },
    correctAnswersCount: state.correctAnswersCount + (result.isCorrect || Boolean(result.partialPoints && result.partialPoints > 0) ? 1 : 0),
    totalAnswered: state.totalAnswered + 1,
    history: [...(state.history || []), historyEntry]
  };
}

/**
 * State Selectors for Audience Score
 */
export const getAudienceTotalScore = (state?: AudienceScoreState | null): number => {
  return state?.totalScore || 0;
};

export const getAudienceScoreBreakdown = (state?: AudienceScoreState | null): ScoreBreakdown => {
  return (
    state?.scoreBreakdown || {
      round1: 0,
      round2: 0,
      round3: 0,
      round4: 0
    }
  );
};

/**
 * Aggregate audience score state across all submitted responses for a given user UID or MSSV
 */
export function computeAudienceScoreFromResponses(
  allResponses: Record<string, Record<string, UserResponse>>,
  userUid: string,
  userMssv?: string,
  questionBank: QuestionItem[] = INITIAL_QUESTION_BANK,
  gameState?: GameState
): AudienceScoreState {
  let audienceState = createInitialAudienceScoreState();

  if (!allResponses || (!userUid && !userMssv)) {
    return audienceState;
  }

  // 1. Build lookup map for questions
  const qMap = new Map<string, QuestionItem>();
  INITIAL_QUESTION_BANK.forEach(q => qMap.set(q.id, q));
  if (questionBank && questionBank.length > 0) {
    questionBank.forEach(q => qMap.set(q.id, q));
  }

  // Helper to find user response in a question's response record
  const findUserResponse = (qResponses: Record<string, UserResponse> | undefined): UserResponse | undefined => {
    if (!qResponses) return undefined;
    if (userUid && qResponses[userUid]) return qResponses[userUid];
    return Object.values(qResponses).find(r => 
      (userUid && (r.user_info?.uid === userUid || r.user_info?.anonymizedUid === userUid)) ||
      (userMssv && r.user_info?.mssv === userMssv)
    );
  };

  // 2. Process non-VCNV questions standardly
  Object.entries(allResponses).forEach(([qId, qResponses]) => {
    if (qId.startsWith('VCNV')) return; // Skip VCNV, handled separately below with Branch rules

    const userResp = findUserResponse(qResponses);
    if (!userResp) return;

    // PREVENT SCORING UNTIL REVEALED
    // If this is the current active question, and the admin hasn't revealed the result,
    // we should not compute points for it yet (to hide the result and total score from updating early).
    if (gameState?.question_id === qId && gameState?.status !== 'REVEAL') {
      return;
    }

    // Resolve question details
    const qData = qMap.get(qId);
    let correctKey = qData?.correct_key || '';
    if (!correctKey && gameState?.question_id === qId) {
      correctKey = gameState.correct_key || '';
    }

    // Determine round category / roundId
    let roundId = qData?.round_name || qData?.round_type || 'round1';
    if (qId.startsWith('KD_')) roundId = 'round1';
    else if (qId.startsWith('TT_')) roundId = 'round3';
    else if (qId.startsWith('VD_')) roundId = 'round4';

    const roundType = qData?.round_type || 'MULTIPLE_CHOICE';

    // Compute speed rank for Round 3 if applicable
    let speedRank: number | undefined;
    if (roundId === 'round3' && correctKey) {
      const correctResps = Object.entries(qResponses)
        .filter(([_, r]) => {
          const evalRes = evaluateUserChoice(r.choice, correctKey, roundType, qId);
          return evalRes.isCorrect;
        })
        .sort((a, b) => (a[1].latency_sec || 0) - (b[1].latency_sec || 0));

      const rankIndex = correctResps.findIndex(([key, r]) => 
        (userUid && (key === userUid || r.user_info?.uid === userUid || r.user_info?.anonymizedUid === userUid)) ||
        (userMssv && r.user_info?.mssv === userMssv)
      );
      if (rankIndex >= 0) {
        speedRank = rankIndex + 1;
      }
    }

    const timeLimit = qData?.time_limit || (qId.startsWith('TT_03') || qId.startsWith('TT_04') ? 30 : 20);

    const { isCorrect, pointsEarned, partialPoints } = evaluateUserChoice(
      userResp.choice,
      correctKey,
      roundType,
      qId,
      userResp.latency_sec,
      speedRank,
      timeLimit
    );

    const scoringResult: ScoringResult = {
      isCorrect,
      partialPoints,
      latencySec: userResp.latency_sec,
      speedRank,
      timeLimit,
      isDoubleDown: userResp.isDoubleDown,
      subType: 'STANDARD'
    };

    audienceState = updateAudienceScore(audienceState, roundId, scoringResult, qId);
  });

  // 3. Process Round 2 (VCNV) with Branch Rules
  const riskQResponses = allResponses['VCNV_RISK'];
  const userRiskResp = findUserResponse(riskQResponses);
  
  // Find CNV keyword response (VCNV_KEYWORD or VCNV_01 or any VCNV_ key except VCNV_RISK)
  let userCnvResp: UserResponse | undefined;
  Object.entries(allResponses).forEach(([qId, qResponses]) => {
    if (qId.startsWith('VCNV') && qId !== 'VCNV_RISK') {
      const resp = findUserResponse(qResponses);
      if (resp) userCnvResp = resp;
    }
  });

  const riskAnswerKey = gameState?.vcnv_risk_answer || 'AN TOÀN SỐ';
  const cnvKeywordKey = gameState?.vcnv_keyword || qMap.get('VCNV_01')?.correct_key || 'DEEPFAKE';

  const isVcnvRound = gameState?.round_type === 'VCNV' || (gameState?.question_id || '').startsWith('VCNV');

  // If no gameState is present (e.g. final report/SPSS export), consider revealed if answers exist.
  // In live game mode, consider revealed if status is REVEALED or if round has passed.
  const isRiskRevealed = !gameState ? true : (gameState.vcnv_risk_status === 'REVEALED' || (!isVcnvRound && gameState.vcnv_risk_status !== 'IDLE'));
  const isRiskCorrect = Boolean(userRiskResp?.choice) && matchFuzzyAnswer(userRiskResp?.choice || '', riskAnswerKey);

  const isCnvRevealed = !gameState ? true : (gameState.vcnv_status === 'REVEALED' || (!isVcnvRound && gameState.vcnv_status !== 'IDLE'));
  const isCnvCorrect = Boolean(userCnvResp?.choice) && matchFuzzyAnswer(userCnvResp?.choice || '', cnvKeywordKey);

  let vcnvPoints = 0;
  const branch = gameState?.vcnv_risk_branch;

  if (branch === 'BRANCH_1') {
    // Branch 1: Contestant answered Risk Box correctly & guessed CNV right away.
    if (isRiskCorrect && isRiskRevealed) {
      vcnvPoints = 120;
    }
  } else {
    // Branch 2 or default fallback:
    if (isRiskCorrect && isRiskRevealed) {
      vcnvPoints += 120;
    }
    if (isCnvCorrect && isCnvRevealed) {
      vcnvPoints += 80;
    }
  }

  if (vcnvPoints > 0) {
    audienceState.totalScore += vcnvPoints;
    audienceState.scoreBreakdown.round2 = (audienceState.scoreBreakdown.round2 || 0) + vcnvPoints;
    audienceState.correctAnswersCount += (isRiskCorrect ? 1 : 0) + (isCnvCorrect ? 1 : 0);
    audienceState.totalAnswered += (userRiskResp ? 1 : 0) + (userCnvResp ? 1 : 0);
    audienceState.history = [
      ...(audienceState.history || []),
      {
        questionId: 'VCNV_ROUND',
        roundId: 'round2',
        pointsEarned: vcnvPoints,
        isCorrect: true,
        latencySec: userCnvResp?.latency_sec || userRiskResp?.latency_sec || 1.0,
        timestamp: Date.now()
      }
    ];
  } else if (userRiskResp || userCnvResp) {
    audienceState.totalAnswered += (userRiskResp ? 1 : 0) + (userCnvResp ? 1 : 0);
  }

  return audienceState;
}
