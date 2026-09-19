import { t } from '../utils/i18n';
import React, { useState, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { createPortal } from 'react-dom';
import { GameState, UserInfo, UserResponse, QuestionItem } from '../types';
import { INITIAL_QUESTION_BANK } from '../data/questionBank';
import { evaluateUserChoice } from '../services/audienceScoringService';
import { getUserDisplayUid } from '../utils/uidUtils';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';
import {
  X,
  History,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Trophy,
  BookOpen,
  Sparkles,
  Zap,
  Shield,
  Flame,
  Target,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Radio,
  FileText,
  Heart
} from 'lucide-react';
import { QuestionLikeButton } from './QuestionLikeButton';

interface AudienceQuestionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo | null;
  allResponses?: Record<string, Record<string, UserResponse>>;
  gameState: GameState;
  questionBank?: QuestionItem[];
}

export interface LogEntryItem {
  questionId: string;
  roundName: string;
  roundType: string;
  category: string;
  questionText: string;
  options: Record<string, string>;
  correctKey: string;
  explanation: string;
  mediaType?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'NONE';
  mediaUrl?: string;
  userChoice: string;
  hasAnswered: boolean;
  isCorrect: boolean;
  partialPoints?: number;
  pointsEarned: number;
  notice: string;
  latencySec?: number;
  timestamp?: number;
  isEmergencyPoll?: boolean;
}

export const AudienceQuestionLogModal: React.FC<AudienceQuestionLogModalProps> = ({
  isOpen,
  onClose,
  user,
  allResponses = {},
  gameState,
  questionBank = INITIAL_QUESTION_BANK
}) => {
  const { localLanguage } = useLanguage();

  const [searchTerm, setSearchTerm] = useState('');
  const [roundFilter, setRoundFilter] = useState<string>('ALL');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');
  const [sortOrder, setSortOrder] = useState<'NEWEST' | 'OLDEST' | 'HIGHEST_SCORE'>('NEWEST');
  const [expandedExplanation, setExpandedExplanation] = useState<Record<string, boolean>>({});
  const [isCopied, setIsCopied] = useState(false);

  // 1. Consolidate list of reviewable questions from session
  const logEntries: LogEntryItem[] = useMemo(() => {
    if (!user) return [];

    const qMap = new Map<string, QuestionItem>();
    INITIAL_QUESTION_BANK.forEach((q) => qMap.set(q.id, q));
    if (questionBank && questionBank.length > 0) {
      questionBank.forEach((q) => qMap.set(q.id, q));
    }

    const items: LogEntryItem[] = [];

    // Collect all regular question IDs that have responses or belong to played/active questions
    const setOfQuestionIds = new Set<string>();

    // Add questions present in allResponses
    Object.keys(allResponses).forEach((qId) => {
      if (!qId.startsWith('POLL_') && qId !== 'EMERGENCY_POLL') {
        setOfQuestionIds.add(qId);
      }
    });

    // Add current active or revealed question if not present
    if (gameState.question_id && (gameState.status === 'REVEAL' || gameState.status === 'LOCKED' || gameState.status === 'ACTIVE')) {
      setOfQuestionIds.add(gameState.question_id);
    }

    // Process each regular question
    setOfQuestionIds.forEach((qId) => {
      const qData = qMap.get(qId);
      const qResponses = allResponses[qId] || {};
      const userResp = qResponses[user.uid] || (user.mssv ? (Object.values(qResponses) as UserResponse[]).find((r) => r.user_info?.mssv === user.mssv) : undefined);

      const questionText = qData?.question_text || (gameState.question_id === qId ? gameState.question_text : `Câu hỏi ${qId}`);
      const options = qData?.options || (gameState.question_id === qId ? gameState.options : {});
      let correctKey = qData?.correct_key || (gameState.question_id === qId ? gameState.correct_key : '');
      const explanation = qData?.explanation || (gameState.question_id === qId ? gameState.explanation : '');
      const roundName = qData?.round_name || (gameState.question_id === qId ? gameState.round_name : 'Phiên thi đấu');
      const roundType = qData?.round_type || (gameState.question_id === qId ? gameState.round_type : 'MULTIPLE_CHOICE');
      const category = qData?.category || (gameState.question_id === qId ? gameState.category : 'Tổng hợp');
      const mediaType = qData?.media_type || (gameState.question_id === qId ? gameState.media_type : undefined);
      const mediaUrl = qData?.media_url || (gameState.question_id === qId ? gameState.media_url : undefined);

      // Handle VCNV specific answer keys if missing
      if (!correctKey && qId.startsWith('VCNV')) {
        if (qId === 'VCNV_RISK') correctKey = gameState.vcnv_risk_answer || 'AN TOÀN SỐ';
        else correctKey = gameState.vcnv_keyword || 'DEEPFAKE';
      }

      const hasAnswered = Boolean(userResp && userResp.choice !== undefined && userResp.choice !== '');
      const userChoice = userResp?.choice || '';
      const latencySec = userResp?.latency_sec;
      const timestamp = userResp?.timestamp || 0;

      let isCorrect = false;
      let pointsEarned = 0;
      let partialPoints: number | undefined = undefined;
      let notice = localLanguage === 'en' ? 'Not answered yet' : 'Chưa tham gia trả lời';

      if (hasAnswered && correctKey) {
        const evalRes = evaluateUserChoice(userChoice, correctKey, roundType, qId, latencySec);
        isCorrect = evalRes.isCorrect;
        pointsEarned = evalRes.pointsEarned;
        partialPoints = evalRes.partialPoints;
        notice = evalRes.notice || (isCorrect ? (localLanguage === 'en' ? `Correct (+${pointsEarned}pts)` : `Đúng (+${pointsEarned}đ)`) : (localLanguage === 'en' ? 'Incorrect (0pts)' : 'Chưa chính xác (0đ)'));
      } else if (hasAnswered) {
        notice = localLanguage === 'en' ? `Selected: ${userChoice} (Pending answer reveal)` : `Đã chọn: ${userChoice} (Đang chờ công bố đáp án)`;
      }

      items.push({
        questionId: qId,
        roundName,
        roundType,
        category,
        questionText,
        options,
        correctKey,
        explanation: explanation || (localLanguage === 'en' ? 'No detailed explanation for this question.' : 'Không có giải thích chi tiết cho câu hỏi này.'),
        mediaType,
        mediaUrl,
        userChoice,
        hasAnswered,
        isCorrect,
        partialPoints,
        pointsEarned,
        notice,
        latencySec,
        timestamp,
        isEmergencyPoll: false
      });
    });

    // Process Emergency Polls if user participated or if present in history
    if (gameState.emergency_poll_history && gameState.emergency_poll_history.length > 0) {
      gameState.emergency_poll_history.forEach((poll) => {
        const pollResponses = allResponses[poll.id] || poll.responses || {};
        const userResp = pollResponses[user.uid] || (user.mssv ? (Object.values(pollResponses) as UserResponse[]).find((r) => r.user_info?.mssv === user.mssv) : undefined);
        const hasAnswered = Boolean(userResp?.choice);
        const userChoice = userResp?.choice || '';
        const correctKey = poll.correct_option || poll.dominantChoice || '';

        const isCorrect = Boolean(correctKey && userChoice.toUpperCase() === correctKey.toUpperCase());
        const pointsEarned = isCorrect ? 10 : 0;

        items.push({
          questionId: poll.id.startsWith('POLL_') ? poll.id : `POLL_${poll.id}`,
          roundName: localLanguage === 'en' ? 'Emergency Poll' : 'Khảo sát Khẩn cấp',
          roundType: poll.type || 'POLL',
          category: poll.context_note || poll.source_name || (localLanguage === 'en' ? 'Audience Opinion' : 'Ý kiến khán giả'),
          questionText: poll.question,
          options: poll.options || {},
          correctKey,
          explanation: localLanguage === 'en'
            ? `Poll result: Dominant choice was [${poll.dominantChoice || 'N/A'}] with ${poll.totalVotes} votes.`
            : `Kết quả khảo sát: Phương án phổ biến nhất là [${poll.dominantChoice || 'N/A'}] với ${poll.totalVotes} lượt vote.`,
          userChoice,
          hasAnswered,
          isCorrect,
          pointsEarned,
          notice: hasAnswered
            ? (isCorrect ? (localLanguage === 'en' ? 'Matched majority (+10pts)' : 'Khớp với ý kiến đa số (+10đ)') : (localLanguage === 'en' ? 'Minority choice' : 'Ý kiến thiểu số'))
            : (localLanguage === 'en' ? 'Did not vote' : 'Chưa tham gia vote'),
          latencySec: userResp?.latency_sec,
          timestamp: poll.completed_at || poll.created_at,
          isEmergencyPoll: true
        });
      });
    }

    return items;
  }, [allResponses, user, gameState, questionBank]);

  // 2. Summary stats from log entries
  const stats = useMemo(() => {
    const totalCount = logEntries.length;
    const answeredCount = logEntries.filter((e) => e.hasAnswered).length;
    const correctCount = logEntries.filter((e) => e.hasAnswered && e.isCorrect).length;
    const totalPoints = logEntries.reduce((sum, e) => sum + e.pointsEarned, 0);
    const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;

    return { totalCount, answeredCount, correctCount, totalPoints, accuracy };
  }, [logEntries]);

  // 3. Filter and sort entries
  const filteredEntries = useMemo(() => {
    return logEntries
      .filter((entry) => {
        // Round Filter
        if (roundFilter !== 'ALL') {
          const r = entry.roundName.toLowerCase();
          const rId = entry.questionId.toLowerCase();
          if (roundFilter === 'ROUND1' && !r.includes('1') && !r.includes('khởi động') && !rId.startsWith('kd')) return false;
          if (roundFilter === 'ROUND2' && !r.includes('2') && !r.includes('vcnv') && !rId.startsWith('vcnv')) return false;
          if (roundFilter === 'ROUND3' && !r.includes('3') && !r.includes('tăng tốc') && !rId.startsWith('tt')) return false;
          if (roundFilter === 'ROUND4' && !r.includes('4') && !r.includes('về đích') && !rId.startsWith('vd')) return false;
          if (roundFilter === 'EMERGENCY' && !entry.isEmergencyPoll && !r.includes('khẩn cấp')) return false;
        }

        // Result Filter
        if (resultFilter === 'CORRECT' && (!entry.hasAnswered || !entry.isCorrect)) return false;
        if (resultFilter === 'WRONG' && (!entry.hasAnswered || entry.isCorrect)) return false;
        if (resultFilter === 'UNANSWERED' && entry.hasAnswered) return false;

        // Search Term
        if (searchTerm.trim()) {
          const term = searchTerm.toLowerCase().trim();
          const matchText = entry.questionText.toLowerCase().includes(term);
          const matchId = entry.questionId.toLowerCase().includes(term);
          const matchCat = entry.category.toLowerCase().includes(term);
          const matchChoice = entry.userChoice.toLowerCase().includes(term);
          const matchExp = entry.explanation.toLowerCase().includes(term);
          return matchText || matchId || matchCat || matchChoice || matchExp;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortOrder === 'HIGHEST_SCORE') {
          return b.pointsEarned - a.pointsEarned;
        }
        if (sortOrder === 'OLDEST') {
          return (a.timestamp || 0) - (b.timestamp || 0);
        }
        // NEWEST default
        return (b.timestamp || 0) - (a.timestamp || 0);
      });
  }, [logEntries, roundFilter, resultFilter, searchTerm, sortOrder]);

  const toggleExplanation = (qId: string) => {
    soundFx.playClick();
    vibrateTap();
    setExpandedExplanation((prev) => ({
      ...prev,
      [qId]: !prev[qId]
    }));
  };

  const handleCopySummary = () => {
    soundFx.playClick();
    vibrateTap();
    const lines = [
      localLanguage === 'en' ? `=== AUDIENCE QUESTION & ANSWER LOG ===` : `=== NHẬT KÝ CÂU HỎI & ĐÁP ÁN KHÁN GIẢ ===`,
      localLanguage === 'en' ? `Audience: ${user?.name || 'Audience'} (UID: ${user ? getUserDisplayUid(user) : 'N/A'})` : `Khán giả: ${user?.name || 'Khán giả'} (UID: ${user ? getUserDisplayUid(user) : 'N/A'})`,
      localLanguage === 'en'
        ? `Total questions: ${stats.totalCount} | Answered: ${stats.answeredCount} | Correct: ${stats.correctCount} (${stats.accuracy}%)\nTotal points: ${stats.totalPoints} pts`
        : `Tổng số câu đã qua: ${stats.totalCount} câu | Đã trả lời: ${stats.answeredCount} câu | Đúng: ${stats.correctCount} câu (${stats.accuracy}%)\nTổng điểm tích lũy: ${stats.totalPoints} điểm`,
      `----------------------------------------`,
      ...logEntries.map((e, idx) => {
        const choiceText = e.hasAnswered ? `[${e.userChoice}]` : (localLanguage === 'en' ? 'Not answered' : 'Chưa trả lời');
        const evalText = e.hasAnswered ? (e.isCorrect ? (localLanguage === 'en' ? 'CORRECT' : 'ĐÚNG') : (localLanguage === 'en' ? 'WRONG' : 'SAI')) : (localLanguage === 'en' ? 'SKIPPED' : 'BỎ QUA');
        return localLanguage === 'en'
          ? `${idx + 1}. [${e.questionId}] ${e.questionText}\n   - Choice: ${choiceText} -> Result: ${evalText} (${e.notice})\n   - Correct key: [${e.correctKey}]\n   - Explanation: ${e.explanation}`
          : `${idx + 1}. [${e.questionId}] ${e.questionText}\n   - Lựa chọn: ${choiceText} -> Kết quả: ${evalText} (${e.notice})\n   - Đáp án chuẩn: [${e.correctKey}]\n   - Giải thích: ${e.explanation}`;
      })
    ];

    navigator.clipboard.writeText(lines.join('\n\n')).then(() => {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    });
  };

  if (!isOpen) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fluent-dialog-overlay animate-fadeIn select-none z-[9999999]"
      onClick={onClose}
    >
      <div
        className="fluent-box border border-white/10 w-full max-w-4xl max-h-[90vh] sm:max-h-[85vh] h-full rounded-[4px] shadow-2xl flex flex-col overflow-hidden text-white relative my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-4 sm:p-5 fluent-box-nested border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] fluent-box border border-[#F7CAC9]/40 text-[#F7CAC9] flex items-center justify-center font-bold shadow-md">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                  {t("log_title", localLanguage)}
                </h2>
                <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/30">
                  READ-ONLY
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                {t("log_desc", localLanguage)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-[4px] bg-white/10 hover:bg-white/20 border border-white/10 text-xs font-semibold text-white/90 transition"
              title={t("log_copy_all", localLanguage)}
            >
              {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-[#F7CAC9]" />}
              <span>{isCopied ? t("log_copied", localLanguage) : t("log_copy", localLanguage)}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                onClose();
              }}
              className="w-8 h-8 rounded-[4px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 flex items-center justify-center transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Stats Performance Summary Bar */}
        <div className="px-4 py-3 fluent-box border-b border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
          <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center gap-2.5">
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="text-[10px] text-white/50 font-mono uppercase block">{localLanguage === 'en' ? 'Total Questions' : 'Tổng Số Câu'}</span>
              <span className="font-bold font-mono text-white text-sm">{stats.totalCount} {localLanguage === "en" ? "qs" : "câu"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-white/50 font-mono uppercase block">{localLanguage === 'en' ? 'Correct Questions' : 'Số Câu Đúng'}</span>
              <span className="font-bold font-mono text-emerald-400 text-sm">
                {stats.correctCount}/{stats.answeredCount} {localLanguage === 'en' ? 'qs' : 'câu'} ({stats.accuracy}%)
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center gap-2.5">
            <Trophy className="w-4 h-4 text-yellow-400 shrink-0" />
            <div>
              <span className="text-[10px] text-white/50 font-mono uppercase block">{localLanguage === 'en' ? 'Accumulated Points' : 'Điểm Tích Lũy'}</span>
              <span className="font-bold font-mono text-yellow-300 text-sm">+{stats.totalPoints}{localLanguage === "en" ? "p" : "đ"}</span>
            </div>
          </div>

          <div className="p-2.5 rounded-[4px] fluent-box-nested border border-white/10 flex items-center gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
            <div>
              <span className="text-[10px] text-white/50 font-mono uppercase block">{localLanguage === 'en' ? 'Download Logs' : 'Tải Nhật Ký'}</span>
              <button
                type="button"
                onClick={handleCopySummary}
                className="text-xs font-bold text-[#F7CAC9] hover:underline cursor-pointer"
              >
                {isCopied ? (localLanguage === 'en' ? 'Copied to clipboard' : 'Đã lưu clipboard') : (localLanguage === 'en' ? 'Click to copy all' : 'Bấm để copy tất cả')}
              </button>
            </div>
          </div>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="p-3 sm:p-4 fluent-box-nested border-b border-white/10 flex flex-col sm:flex-row gap-2.5 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#F7CAC9] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder={localLanguage === 'en' ? 'Search by question ID, content, answer...' : 'Tìm theo mã câu, nội dung câu hỏi, đáp án...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full fluent-box border border-white/10 focus:border-[#F7CAC9] rounded-[4px] pl-9 pr-8 py-2 text-xs font-mono text-white placeholder-white/30 outline-none transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white p-0.5 rounded cursor-pointer"
                title={localLanguage === 'en' ? 'Clear search' : 'Xóa tìm kiếm'}
              >
                ✕
              </button>
            )}
          </div>

          {/* Round Filter Dropdown */}
          <select
            value={roundFilter}
            onChange={(e) => {
              soundFx.playClick();
              setRoundFilter(e.target.value);
            }}
            className="fluent-box-nested border border-white/10 focus:border-[#F7CAC9] rounded-[4px] px-3 py-2 text-xs font-mono text-white outline-none cursor-pointer"
          >
            <option value="ALL" className="bg-[#190839] text-white">{t("log_all_rounds", localLanguage)}</option>
            <option value="ROUND1" className="bg-[#190839] text-white">{t("log_round1", localLanguage)}</option>
            <option value="ROUND2" className="bg-[#190839] text-white">{t("log_round2", localLanguage)}</option>
            <option value="ROUND3" className="bg-[#190839] text-white">{t("log_round3", localLanguage)}</option>
            <option value="ROUND4" className="bg-[#190839] text-white">{t("log_round4", localLanguage)}</option>
            <option value="EMERGENCY" className="bg-[#190839] text-white">{t("log_emergency", localLanguage)}</option>
          </select>

          {/* Result Filter Buttons */}
          <div className="flex rounded-[4px] fluent-box-nested border border-white/10 p-0.5 gap-1">
            <button
              onClick={() => setResultFilter('ALL')}
              className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold transition ${
                resultFilter === 'ALL' ? 'bg-[#F7CAC9] text-[#190839]' : 'text-white/60 hover:text-white'
              }`}
            >
              {localLanguage === 'en' ? 'All' : 'Tất cả'}
            </button>
            <button
              onClick={() => setResultFilter('CORRECT')}
              className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold transition ${
                resultFilter === 'CORRECT' ? 'bg-emerald-500 text-black' : 'text-white/60 hover:text-white'
              }`}
            >
              {t("log_correct_tab", localLanguage).replace("{count}", String(logEntries.filter((e) => e.hasAnswered && e.isCorrect).length))}
            </button>
            <button
              onClick={() => setResultFilter('WRONG')}
              className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold transition ${
                resultFilter === 'WRONG' ? 'bg-rose-500 text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              {localLanguage === 'en' ? 'Wrong' : 'Sai'} ({logEntries.filter((e) => e.hasAnswered && !e.isCorrect).length})
            </button>
          </div>
        </div>

        {/* Scrollable Log Entries List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {!user ? (
            <div className="text-center py-16 p-6 rounded-[4px] fluent-box-nested border border-white/10">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-3 animate-pulse" />
              <h3 className="text-base font-bold text-white mb-1">{t("log_no_auth", localLanguage)}</h3>
              <p className="text-xs text-white/60">
                {t("log_login_req", localLanguage)}
              </p>
            </div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-16 p-6 rounded-[4px] fluent-box-nested border border-white/10">
              <History className="w-12 h-12 text-white/30 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">{t("log_no_data", localLanguage)}</h3>
              <p className="text-xs text-white/60">
                {searchTerm || roundFilter !== 'ALL' || resultFilter !== 'ALL'
                  ? t("log_no_data_hint", localLanguage)
                  : t("log_no_data_wait", localLanguage)}
              </p>
            </div>
          ) : (
            filteredEntries.map((entry, index) => {
              const showExp = Boolean(expandedExplanation[entry.questionId]);

              return (
                <div
                  key={entry.questionId + '_' + index}
                  className={`rounded-[4px] border transition-all duration-200 p-4 sm:p-5 relative overflow-hidden ${
                    !entry.hasAnswered
                      ? 'fluent-box-nested border-white/10'
                      : entry.isCorrect
                      ? 'fluent-box border-emerald-500/40 shadow-sm'
                      : 'fluent-box border-rose-500/40 shadow-sm'
                  }`}
                >
                  {/* Card Header: Round badge, Question ID, Status Tag */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2.5 py-0.5 rounded-[4px] bg-[#F7CAC9]/15 text-[#F7CAC9] border border-[#F7CAC9]/30 text-xs font-mono font-bold">
                        {entry.roundName}
                      </span>
                      <span className="px-2 py-0.5 rounded-[4px] fluent-box text-amber-300 font-mono font-bold text-xs border border-white/10">
                        {entry.questionId}
                      </span>
                      <span className="text-xs text-white/60 font-medium hidden sm:inline">
                        • {entry.category}
                      </span>
                    </div>

                    {/* Result Badge & Like Button */}
                    <div className="flex items-center gap-2">
                      <QuestionLikeButton
                        questionId={entry.questionId}
                        user={user}
                        gameState={gameState}
                        variant="compact"
                      />

                      {entry.hasAnswered ? (
                        entry.isCorrect ? (
                          <span className="px-2.5 py-0.5 rounded-[4px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            {t("log_correct_pts", localLanguage).replace("{pts}", String(entry.pointsEarned))}
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-[4px] bg-rose-950/60 text-rose-300 border border-rose-500/40 text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm">
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                            {t("log_incorrect_pts", localLanguage).replace("{pts}", String(entry.pointsEarned))}
                          </span>
                        )
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-[4px] bg-white/10 text-white/50 border border-white/10 text-xs font-mono font-bold flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-white/40" />
                          {localLanguage === 'en' ? 'SKIPPED' : 'CHƯA THAM GIA'}
                        </span>
                      )}

                      {entry.latencySec !== undefined && entry.latencySec > 0 && (
                        <span className="text-[11px] font-mono text-white/60 fluent-box px-2 py-0.5 rounded-[4px] border border-white/10">
                          {entry.latencySec.toFixed(1)}s
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Question Text */}
                  <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed mb-3">
                    {entry.questionText}
                  </h4>

                  {/* Options List Review */}
                  {entry.options && Object.keys(entry.options).length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3">
                      {Object.entries(entry.options).map(([optKey, optVal]) => {
                        const isUserChoice = entry.hasAnswered && entry.userChoice.toUpperCase() === optKey.toUpperCase();
                        const isCorrectOption = entry.correctKey.toUpperCase() === optKey.toUpperCase();

                        let optClass = 'fluent-box border-white/10 text-white/80';
                        if (isCorrectOption) {
                          optClass = 'bg-emerald-950/40 border-emerald-500/60 text-white font-bold ring-1 ring-emerald-400/40';
                        } else if (isUserChoice && !isCorrectOption) {
                          optClass = 'bg-rose-950/40 border-rose-500/60 text-white font-bold ring-1 ring-rose-400/40';
                        }

                        return (
                          <div
                            key={optKey}
                            className={`p-3 rounded-[4px] border text-xs flex items-start gap-2.5 transition-all ${optClass}`}
                          >
                            <span
                              className={`w-6 h-6 rounded-[2px] font-mono font-black text-xs flex items-center justify-center shrink-0 ${
                                isCorrectOption
                                  ? 'bg-emerald-500 text-black'
                                  : isUserChoice
                                  ? 'bg-rose-500 text-white'
                                  : 'fluent-box-nested text-[#F7CAC9] border border-white/10'
                              }`}
                            >
                              {optKey}
                            </span>
                            <div className="flex-1 min-w-0 pt-0.5">
                              <p className="leading-snug">{optVal}</p>
                              {isUserChoice && (
                                <span className="text-[10px] font-mono text-amber-300 font-bold block mt-1">
                                  {t("log_your_choice_arrow", localLanguage)}
                                </span>
                              )}
                              {isCorrectOption && (
                                <span className="text-[10px] font-mono text-emerald-300 font-bold block mt-1">
                                  {t("log_correct_check", localLanguage)}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* User Choice & Evaluation Notice Summary */}
                  <div className="mt-3 p-3 rounded-[4px] fluent-box-nested border border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 font-mono">{t("log_your_choice", localLanguage)}</span>
                      <span className="font-mono font-extrabold text-sm px-2 py-0.5 rounded-[2px] fluent-box text-white border border-white/20">
                        {entry.hasAnswered ? `[${entry.userChoice}]` : t("log_not_voted", localLanguage)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-white/60 font-mono">{t("log_std_ans", localLanguage)}</span>
                      <span className="font-mono font-extrabold text-sm px-2 py-0.5 rounded-[2px] bg-emerald-950/60 text-emerald-300 border border-emerald-500/40">
                        [{entry.correctKey || 'N/A'}]
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => toggleExplanation(entry.questionId)}
                      className="text-xs font-bold text-[#F7CAC9] hover:text-white flex items-center gap-1 transition cursor-pointer"
                    >
                      <HelpCircle className="w-3.5 h-3.5 text-[#F7CAC9]" />
                      <span>{showExp ? t("log_hide_exp", localLanguage) : t("log_show_exp", localLanguage)}</span>
                      {showExp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Expandable Official Explanation Box */}
                  {showExp && (
                    <div className="mt-3 p-4 rounded-[4px] fluent-box-nested border border-[#F7CAC9]/30 text-xs text-white/90 animate-fadeIn space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[#F7CAC9] font-mono font-bold text-[11px] uppercase tracking-wider pb-1 border-b border-white/10">
                        <FileText className="w-3.5 h-3.5 text-[#F7CAC9]" />
                        <span>{t("log_exp_title", localLanguage)}</span>
                      </div>
                      <p className="leading-relaxed text-white/80 pt-1 font-sans">
                        {entry.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 fluent-box-nested border-t border-white/10 flex items-center justify-between text-xs text-white/60 shrink-0">
          <span className="font-mono text-[11px]">
            {t("log_showing_stats", localLanguage).replace("{filtered}", String(filteredEntries.length)).replace("{total}", String(logEntries.length))}
          </span>

          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              onClose();
            }}
            className="fluent-btn px-5 py-2.5 rounded-[4px] bg-gradient-to-r from-[#F7CAC9] via-[#FCEEEC] to-[#E39A96] hover:brightness-110 active:scale-[0.98] text-[#190839] font-black text-xs uppercase tracking-wider transition shadow-lg shadow-[#F7CAC9]/20 border border-white/40 cursor-pointer"
          >
            {localLanguage === 'en' ? 'CLOSE LOGS' : 'ĐÓNG NHẬT KÝ'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
