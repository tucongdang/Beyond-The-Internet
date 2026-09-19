import { SPSSRow, UserResponse, QuestionItem, ActivityLogItem, ResearchItemAnalysis, GameState } from '../types';
import { evaluateUserChoice } from '../services/audienceScoringService';
import { UserScoreSummary } from './leaderboardUtils';

/**
 * Format a timestamp into ISO or readable string
 */
export function formatDateTime(timestamp: number): string {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Fuzzy normalization for Vietnamese VCNV keyword matching
 * Removes diacritics, spaces, punctuation, case-insensitive
 */
export function normalizeVcnvAnswer(s: string): string {
  return (s || '')
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Build standard dataset from all accumulated game responses across all questions
 */
export function generateSPSSData(
  allResponses: Record<string, Record<string, UserResponse>>,
  questionBank: QuestionItem[],
  gameState?: GameState
): SPSSRow[] {
  const rows: SPSSRow[] = [];
  const questionMap = new Map<string, QuestionItem>();
  questionBank.forEach(q => questionMap.set(q.id, q));

  Object.entries(allResponses || {}).forEach(([questionId, userMap]) => {
    const qData = questionMap.get(questionId);
    const roundName = qData?.round_name || (gameState?.question_id === questionId ? gameState.round_name : 'Không xác định');
    const questionText = qData?.question_text || (gameState?.question_id === questionId ? gameState.question_text : '');
    
    let correctKey = qData?.correct_key || '';
    if (!correctKey && gameState && gameState.question_id === questionId) {
      correctKey = gameState.correct_key || '';
    }
    if (questionId === 'VCNV_RISK') {
      correctKey = gameState?.vcnv_risk_answer || 'AN TOÀN SỐ';
    } else if (questionId.startsWith('VCNV') && !correctKey) {
      correctKey = gameState?.vcnv_keyword || 'DEEPFAKE';
    }

    const roundType = qData?.round_type || (gameState?.question_id === questionId ? gameState.round_type : (questionId.startsWith('VCNV') ? 'VCNV' : 'MULTIPLE_CHOICE'));

    // Speed ranking for Round 3 if applicable
    const isRound3 = questionId.startsWith('TT_') || roundName.toLowerCase().includes('tăng tốc') || roundName.toLowerCase().includes('vòng 3');
    const speedRankMap = new Map<string, number>();
    if (isRound3 && correctKey) {
      const correctList = Object.entries(userMap || {})
        .filter(([_, resp]) => {
          const evalRes = evaluateUserChoice(resp.choice, correctKey, roundType, questionId);
          return evalRes.isCorrect;
        })
        .sort((a, b) => (a[1].latency_sec || 0) - (b[1].latency_sec || 0));

      correctList.forEach(([uidKey, _], idx) => {
        speedRankMap.set(uidKey, idx + 1);
      });
    }

    Object.entries(userMap || {}).forEach(([uid, resp]) => {
      let isCorrect = 'Chưa xác định';
      let scoreEarned = 0;
      const latencySec = Number(resp.latency_sec?.toFixed(3) || '0.000');
      const latencyMs = Math.round(latencySec * 1000);

      if (correctKey) {
        const speedRank = speedRankMap.get(uid);
        const timeLimit = qData?.time_limit || (questionId === 'TT_03' || questionId === 'TT_04' ? 30 : 20);
        const evalRes = evaluateUserChoice(
          resp.choice,
          correctKey,
          roundType,
          questionId,
          latencySec,
          speedRank,
          timeLimit
        );
        if (evalRes.partialPoints !== undefined) {
          isCorrect = evalRes.partialPoints === 40 ? 'ĐÚNG (4/4)' : evalRes.partialPoints > 0 ? `ĐÚNG TỪNG PHẦN (${evalRes.partialPoints}đ)` : 'SAI (0đ)';
          scoreEarned = evalRes.pointsEarned;
        } else if (evalRes.isCorrect) {
          isCorrect = 'ĐÚNG';
          scoreEarned = evalRes.pointsEarned;
        } else {
          isCorrect = 'SAI';
          scoreEarned = 0;
        }
      }

      rows.push({
        Timestamp: formatDateTime(resp.timestamp),
        Timestamp_Unix_MS: resp.timestamp,
        UID: resp.user_info?.anonymizedUid || resp.user_info?.uid || uid,
        FullName: resp.user_info?.name || 'Khán giả',
        MSSV: resp.user_info?.mssv || '',
        Round: roundName,
        Question_ID: questionId,
        Question_Text: questionText,
        User_Choice: resp.choice || '',
        Correct_Choice: correctKey || 'N/A',
        Is_Correct: isCorrect,
        Score_Earned: scoreEarned,
        Response_Time_Seconds: latencySec,
        Response_Time_MS: latencyMs
      });
    });
  });

  // Sort rows by timestamp
  rows.sort((a, b) => a.Timestamp.localeCompare(b.Timestamp));
  return rows;
}

/**
 * Generate Psychometric Item Analysis Table (p-value, mean RT, option distribution)
 */
export function generateItemAnalysis(
  allResponses: Record<string, Record<string, UserResponse>>,
  questionBank: QuestionItem[]
): ResearchItemAnalysis[] {
  const result: ResearchItemAnalysis[] = [];
  const questionMap = new Map<string, QuestionItem>();
  questionBank.forEach(q => questionMap.set(q.id, q));

  Object.entries(allResponses || {}).forEach(([questionId, userMap]) => {
    const qData = questionMap.get(questionId);
    const roundName = qData?.round_name || 'Không xác định';
    const correctKey = (qData?.correct_key || '').trim().toUpperCase();

    const responses = Object.values(userMap || {});
    const totalResponses = responses.length;
    if (totalResponses === 0) return;

    let correctCount = 0;
    const latencies: number[] = [];
    const optionDistribution: Record<string, number> = {};

    responses.forEach(r => {
      const choice = (r.choice || '').trim().toUpperCase();
      optionDistribution[choice] = (optionDistribution[choice] || 0) + 1;

      const isCorrect = correctKey && (choice === correctKey || normalizeVcnvAnswer(choice) === normalizeVcnvAnswer(correctKey));
      if (isCorrect) correctCount++;

      if (r.latency_sec && r.latency_sec > 0) {
        latencies.push(r.latency_sec);
      }
    });

    const meanLatency = latencies.length > 0 
      ? Number((latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(3)) 
      : 0;

    const variance = latencies.length > 1
      ? latencies.reduce((acc, val) => acc + Math.pow(val - meanLatency, 2), 0) / (latencies.length - 1)
      : 0;
    const stdLatency = Number(Math.sqrt(variance).toFixed(3));

    const optionPercentage: Record<string, number> = {};
    Object.entries(optionDistribution).forEach(([k, count]) => {
      optionPercentage[k] = Number(((count / totalResponses) * 100).toFixed(1));
    });

    result.push({
      question_id: questionId,
      round_name: roundName,
      total_responses: totalResponses,
      correct_count: correctCount,
      incorrect_count: totalResponses - correctCount,
      difficulty_index_p: Number((correctCount / totalResponses).toFixed(3)),
      mean_latency_sec: meanLatency,
      std_latency_sec: stdLatency,
      option_distribution: optionDistribution,
      option_percentage: optionPercentage
    });
  });

  return result;
}

/**
 * Download CSV with UTF-8 BOM for flawless Excel & SPSS Vietnamese text rendering
 */
export function exportToCSV(rows: SPSSRow[], filename = 'BTI2026_Audience_Responses.csv') {
  if (!rows || rows.length === 0) {
    alert('Chưa có dữ liệu phản hồi nào để xuất!');
    return;
  }

  const headers: (keyof SPSSRow)[] = [
    'Timestamp',
    'Timestamp_Unix_MS',
    'UID',
    'FullName',
    'MSSV',
    'Round',
    'Question_ID',
    'Question_Text',
    'User_Choice',
    'Correct_Choice',
    'Is_Correct',
    'Score_Earned',
    'Response_Time_Seconds',
    'Response_Time_MS'
  ];

  const csvRows = [
    headers.join(','),
    ...rows.map(row =>
      headers
        .map(header => {
          const val = row[header] ?? '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(',')
    )
  ];

  // \uFEFF is UTF-8 Byte Order Mark for Excel
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Audience Leaderboard Summary to CSV
 */
export function exportLeaderboardToCSV(
  summaries: UserScoreSummary[],
  filename = 'BTI2026_BangXepHang_TongHop.csv'
) {
  if (!summaries || summaries.length === 0) {
    alert('Chưa có dữ liệu bảng xếp hạng để xuất!');
    return;
  }

  const headers = [
    'Hạng (Rank)',
    'Họ và Tên (FullName)',
    'MSSV',
    'Mã Định Danh (UID)',
    'Tổng Điểm (Total Score)',
    'Số Câu Đúng (Correct Answers)',
    'Số Câu Tham Gia (Total Answered)',
    'Tỉ Lệ Đúng % (Accuracy Rate)',
    'Tốc Độ TB Giây (Avg Latency Sec)',
    'Điểm Vòng 1 - Khởi Động',
    'Điểm Vòng 2 - VCNV',
    'Điểm Vòng 3 - Tăng Tốc',
    'Điểm Vòng 4 - Về Đích',
    'Thời Gian Hoạt Động Cuối'
  ];

  const csvRows = [
    headers.join(','),
    ...summaries.map(s => {
      const row = [
        s.rank,
        `"${(s.name || '').replace(/"/g, '""')}"`,
        `"${(s.mssv || '').replace(/"/g, '""')}"`,
        `"${(s.anonymizedUid || s.uid || '').replace(/"/g, '""')}"`,
        s.totalScore,
        s.correctAnswersCount,
        s.totalAnswered,
        `${s.accuracyRate}%`,
        s.avgLatency,
        s.roundScores.round1,
        s.roundScores.round2,
        s.roundScores.round3,
        s.roundScores.round4,
        `"${formatDateTime(s.lastActiveTimestamp)}"`
      ];
      return row.join(',');
    })
  ];

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Research-Grade Audit Action Log to CSV
 */
export function exportAuditLogsToCSV(logs: ActivityLogItem[], filename = 'BTI2026_Research_Audit_Log.csv') {
  if (!logs || logs.length === 0) {
    alert('Không có dữ liệu nhật ký hoạt động để xuất!');
    return;
  }

  const headers = [
    'Timestamp_ISO',
    'Timestamp_Unix_MS',
    'Event_ID',
    'Category',
    'Event_Type',
    'Actor_Role',
    'Actor_ID',
    'Actor_Name',
    'Question_ID',
    'Round_ID',
    'Latency_MS',
    'Score_Delta',
    'Title',
    'Description',
    'Metadata_JSON'
  ];

  const csvRows = [
    headers.join(','),
    ...logs.map(log => {
      const row = [
        new Date(log.timestamp).toISOString(),
        log.timestamp,
        log.id || '',
        log.category || 'GENERAL',
        log.type || 'SYSTEM_EVENT',
        log.actor_role || 'SYSTEM',
        log.actor_id || '',
        log.actor_name || '',
        log.question_id || '',
        log.round_id || '',
        log.latency_ms ?? '',
        log.score_delta ?? '',
        (log.title || '').replace(/"/g, '""'),
        (log.description || '').replace(/"/g, '""'),
        log.metadata ? JSON.stringify(log.metadata).replace(/"/g, '""') : ''
      ];
      return row.map(val => `"${val}"`).join(',');
    })
  ];

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Item Psychometrics Analysis to CSV
 */
export function exportItemAnalysisToCSV(items: ResearchItemAnalysis[], filename = 'BTI2026_Item_Psychometrics.csv') {
  if (!items || items.length === 0) {
    alert('Chưa có dữ liệu phân tích câu hỏi!');
    return;
  }

  const headers = [
    'Question_ID',
    'Round_Name',
    'Total_Responses_N',
    'Correct_Count',
    'Incorrect_Count',
    'Difficulty_Index_P',
    'Mean_Reaction_Time_Sec',
    'Std_Reaction_Time_Sec',
    'Option_Distribution_JSON',
    'Option_Percentage_JSON'
  ];

  const csvRows = [
    headers.join(','),
    ...items.map(item => {
      const row = [
        item.question_id,
        item.round_name,
        item.total_responses,
        item.correct_count,
        item.incorrect_count,
        item.difficulty_index_p,
        item.mean_latency_sec,
        item.std_latency_sec,
        JSON.stringify(item.option_distribution).replace(/"/g, '""'),
        JSON.stringify(item.option_percentage).replace(/"/g, '""')
      ];
      return row.map(val => `"${val}"`).join(',');
    })
  ];

  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download complete JSON dump for database replication & Python / R analysis
 */
export function exportToJSON(data: unknown, filename = 'BTI2026_Full_Database_Dump.json') {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Download JSON Lines (JSONL) for Big Data & Pandas / HuggingFace datasets
 */
export function exportToJSONLines(records: unknown[], filename = 'BTI2026_Research_Data.jsonl') {
  if (!records || records.length === 0) {
    alert('Không có bản ghi nào để xuất JSONL!');
    return;
  }
  const jsonlContent = records.map(r => JSON.stringify(r)).join('\n');
  const blob = new Blob([jsonlContent], { type: 'application/x-ndjson;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportShoutsToCSV(shouts: any[], filename = 'BTI2026_Audience_Shouts.csv') {
  if (!shouts || shouts.length === 0) {
    alert('Không có dữ liệu tiếng hô để xuất!');
    return;
  }
  const headers = ['Timestamp', 'SenderName', 'MSSV', 'Status', 'Emoji', 'Text', 'Likes', 'IsPinned'];
  const csvRows = [
    headers.join(','),
    ...shouts.map(s => {
      const row = [
        new Date(s.timestamp).toISOString(),
        `"${(s.sender_name || '').replace(/"/g, '""')}"`,
        `"${(s.sender_mssv || '').replace(/"/g, '""')}"`,
        s.status || 'ACTIVE',
        s.emoji || '',
        `"${(s.text || '').replace(/"/g, '""')}"`,
        s.likes || 0,
        s.is_pinned ? 'Yes' : 'No'
      ];
      return row.join(',');
    })
  ];
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportQAToCSV(questions: any[], filename = 'BTI2026_Audience_QA.csv') {
  if (!questions || questions.length === 0) {
    alert('Không có dữ liệu câu hỏi để xuất!');
    return;
  }
  const headers = ['Timestamp', 'SenderName', 'MSSV', 'Category', 'Status', 'Text', 'Upvotes'];
  const csvRows = [
    headers.join(','),
    ...questions.map(q => {
      const row = [
        new Date(q.timestamp).toISOString(),
        `"${(q.sender_name || '').replace(/"/g, '""')}"`,
        `"${(q.sender_mssv || '').replace(/"/g, '""')}"`,
        q.category || 'CHUNG',
        q.status || 'PENDING',
        `"${(q.question_text || '').replace(/"/g, '""')}"`,
        q.upvotes || 0
      ];
      return row.join(',');
    })
  ];
  const csvContent = '\uFEFF' + csvRows.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
