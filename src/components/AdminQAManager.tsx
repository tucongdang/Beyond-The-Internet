import React, { useState, useEffect, useMemo } from 'react';
import {
  MessageSquare,
  Sparkles,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Radio,
  Trash2,
  RotateCcw,
  Heart,
  User,
  Plus,
  Flame,
  Clock,
  ExternalLink,
  Power,
  Shield,
  Layers,
  HelpCircle,
  Eye,
  Check
} from 'lucide-react';
import { AudienceQAQuestion, QASettings, QAQuestionStatus, QAQuestionCategory, GameState } from '../types';
import { qaService, QA_CATEGORIES } from '../services/qaService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateWarning, vibrateError, vibrateImpact } from '../utils/hapticUtils';
import { exportQAToCSV } from '../utils/exportUtils';

interface AdminQAManagerProps {
  gameState: GameState;
}

export const AdminQAManager: React.FC<AdminQAManagerProps> = ({ gameState }) => {
  const [questions, setQuestions] = useState<AudienceQAQuestion[]>([]);
  const [settings, setSettings] = useState<QASettings>(qaService.getSettings());
  const [statusFilter, setStatusFilter] = useState<'ALL' | QAQuestionStatus>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'HOT'>('NEWEST');
  const [deleteTargetQuestionId, setDeleteTargetQuestionId] = useState<string | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState<boolean>(false);
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);


  useEffect(() => {
    const unsubQ = qaService.subscribe(setQuestions);
    const unsubS = qaService.subscribeToSettings(setSettings);
    return () => {
      unsubQ();
      unsubS();
    };
  }, []);

  const featuredQuestion = gameState.featured_qa_question || questions.find((q) => q.status === 'FEATURED') || null;

  // Counts for tabs
  const counts = useMemo(() => {
    return {
      all: questions.length,
      pending: questions.filter((q) => q.status === 'PENDING').length,
      approved: questions.filter((q) => q.status === 'APPROVED').length,
      featured: questions.filter((q) => q.status === 'FEATURED').length,
      answered: questions.filter((q) => q.status === 'ANSWERED').length,
      rejected: questions.filter((q) => q.status === 'REJECTED').length
    };
  }, [questions]);

  // Filtered & Sorted list
  const filteredQuestions = useMemo(() => {
    let list = [...questions];

    if (statusFilter !== 'ALL') {
      list = list.filter((q) => q.status === statusFilter);
    }

    if (categoryFilter !== 'ALL') {
      list = list.filter((q) => q.category === categoryFilter);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (q) =>
          q.question_text.toLowerCase().includes(term) ||
          q.author_name.toLowerCase().includes(term) ||
          (q.author_mssv && q.author_mssv.toLowerCase().includes(term))
      );
    }

    if (sortBy === 'HOT') {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else {
      list.sort((a, b) => b.created_at - a.created_at);
    }

    return list;
  }, [questions, statusFilter, categoryFilter, searchTerm, sortBy]);

  const handleToggleOpen = async () => {
    vibrateTap();
    soundFx.playClick();
    const nextState = !settings.is_open;
    await qaService.updateSettings({ is_open: nextState });
  };

  const handleSummarizeQA = async () => {
    setIsSummarizing(true);
    try {
      const recentQA = questions.slice(0, 30).map(q => ({ text: q.question_text, category: q.category }));
      const res = await fetch('/api/summarize-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'QA', data: recentQA })
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
      setSummary('Có lỗi khi tạo tóm tắt AI.');
    }
    setIsSummarizing(false);
  };

  const handleFeature = async (q: AudienceQAQuestion) => {
    vibrateImpact();
    soundFx.playReveal(true);
    // If clicking on already featured question, unfeature it
    if (featuredQuestion?.id === q.id) {
      await qaService.featureQuestionOnProjector(null);
      await qaService.updateQuestionStatus(q.id, 'APPROVED');
    } else {
      await qaService.featureQuestionOnProjector(q);
    }
  };

  const handleApprove = async (qId: string) => {
    vibrateSuccess();
    soundFx.playClick();
    await qaService.updateQuestionStatus(qId, 'APPROVED');
  };

  const handleReject = async (qId: string) => {
    vibrateWarning();
    soundFx.playClick();
    await qaService.updateQuestionStatus(qId, 'REJECTED');
  };

  const handleMarkAnswered = async (qId: string) => {
    vibrateSuccess();
    soundFx.playReveal(true);
    await qaService.updateQuestionStatus(qId, 'ANSWERED');
    if (featuredQuestion?.id === qId) {
      await qaService.featureQuestionOnProjector(null);
    }
  };



  const handleSeedSamples = async () => {
    vibrateTap();
    soundFx.playClick();
    await qaService.seedSampleQuestions();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Master Controls */}
      <div className="fluent-box border border-white/10 rounded-[4px] p-5 sm:p-6 shadow-2xl space-y-4 text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-[4px] fluent-box-nested border border-[#F7CAC9]/30 flex items-center justify-center text-[#F7CAC9] shadow-lg">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-white">
                  Audience Live Q&A • Quản Trị Câu Hỏi Khán Phòng
                </h3>
                <span className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-[2px] border ${
                  settings.is_open
                    ? 'fluent-box-nested text-emerald-300 border-emerald-500/40'
                    : 'fluent-box-nested text-rose-300 border-rose-500/40'
                }`}>
                  {settings.is_open ? '🟢 ĐANG MỞ NHẬN CÂU HỎI' : '🔴 ĐÃ KHÓA NHẬN CÂU HỎI'}
                </span>
              </div>
              <p className="text-xs text-white/50">
                Duyệt, chọn lọc và chiếu trực tiếp các câu hỏi từ khán giả lên màn hình sân khấu ProjectorView
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleOpen}
              className={`px-3.5 py-2 rounded-[4px] text-xs font-bold font-mono border transition flex items-center gap-1.5 cursor-pointer ${
                settings.is_open
                  ? 'fluent-box-nested hover:bg-white/15 text-emerald-300 border-emerald-500/40'
                  : 'fluent-box-nested hover:bg-white/15 text-rose-300 border-rose-500/40'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{settings.is_open ? 'Khóa Nhận Câu Hỏi' : 'Mở Nhận Câu Hỏi'}</span>
            </button>

            <button
              type="button"
              onClick={handleSeedSamples}
              className="px-3.5 py-2 rounded-[4px] text-xs font-bold font-mono fluent-box-nested hover:bg-white/15 text-[#F7CAC9] border border-[#F7CAC9]/30 transition flex items-center gap-1.5 cursor-pointer"
              title="Thêm 4 câu hỏi mẫu để test thử nghiệm"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#F7CAC9]" />
              <span>Thêm Câu Hỏi Mẫu</span>
            </button>

            <button
              type="button"
              onClick={() => setIsClearAllDialogOpen(true)}
              className="px-3.5 py-2 rounded-[4px] text-xs font-bold font-mono fluent-box-nested hover:bg-white/15 text-white/60 hover:text-rose-300 border border-white/10 hover:border-rose-500/30 transition flex items-center gap-1.5 cursor-pointer"
              title="Xóa toàn bộ câu hỏi"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Hết</span>
            </button>

            <button
              type="button"
              onClick={() => {
                vibrateTap();
                exportQAToCSV(questions);
              }}
              className="px-3.5 py-2 rounded-[4px] text-xs font-bold font-mono fluent-box-nested hover:bg-white/15 text-sky-300 border border-sky-500/30 transition flex items-center gap-1.5 cursor-pointer"
              title="Xuất dữ liệu Q&A ra CSV"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>


        {/* Currently Featured on Stage Banner */}
        {featuredQuestion ? (
          <div className="p-4 rounded-[4px] fluent-box-nested border border-rose-500/60 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[4px] bg-rose-500 text-white flex items-center justify-center shadow-lg shrink-0">
                <Radio className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="text-[11px] font-black uppercase tracking-wider text-rose-300 flex items-center gap-2 font-mono">
                  <span>⭐ ĐANG CHIẾU TRÊN MÀN HÌNH SÂN KHẤU (PROJECTOR VIEW)</span>
                </div>
                <div className="text-sm font-extrabold text-white mt-0.5 line-clamp-1">
                  "{featuredQuestion.question_text}"
                </div>
                <div className="text-xs text-white/60 mt-0.5">
                  Tác giả: {featuredQuestion.is_anonymous ? 'Khán giả ẩn danh' : `${featuredQuestion.author_name} (${featuredQuestion.author_mssv || '---'})`} • {featuredQuestion.upvotes} lượt thích
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleFeature(featuredQuestion)}
              className="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg transition flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
            >
              <XCircle className="w-4 h-4" />
              <span>Gỡ Khỏi Sân Khấu</span>
            </button>
          </div>
        ) : (
          <div className="p-3 rounded-[4px] fluent-box-nested border border-white/10 text-xs text-white/50 flex items-center gap-2">
            <Radio className="w-4 h-4 text-white/40" />
            <span>Chưa có câu hỏi nào đang được chiếu lên màn hình sân khấu. Nhấn nút "⭐ Chiếu Màn Hình" tại bất kỳ câu hỏi nào bên dưới để hiển thị.</span>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="fluent-box border border-white/10 rounded-[4px] p-4 space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1">
          {[
            { id: 'ALL', label: 'Tất cả', count: counts.all },
            { id: 'PENDING', label: 'Chờ duyệt', count: counts.pending, color: 'text-amber-300 border-amber-500/40' },
            { id: 'APPROVED', label: 'Đã duyệt', count: counts.approved, color: 'text-sky-300 border-sky-500/40' },
            { id: 'FEATURED', label: 'Đang chiếu', count: counts.featured, color: 'text-rose-300 border-rose-500/40' },
            { id: 'ANSWERED', label: 'Đã trả lời', count: counts.answered, color: 'text-emerald-300 border-emerald-500/40' },
            { id: 'REJECTED', label: 'Từ chối', count: counts.rejected }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                vibrateTap();
                setStatusFilter(tab.id as any);
              }}
              className={`fluent-subtab-btn ${
                statusFilter === tab.id
                  ? 'active bg-[#F7CAC9] text-[#190839] border-[#F7CAC9] shadow-md font-black'
                  : 'fluent-box-nested border-white/10 text-white/60 hover:bg-white/15 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-1.5 py-0.2 rounded-[2px] text-[10px] font-mono ${
                statusFilter === tab.id ? 'bg-[#190839]/20 text-[#190839]' : 'bg-black/60 text-white/70'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* AI Summarization */}
        <div className="pt-2">
          <div className="fluent-box-nested p-3 border border-[#F7CAC9]/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-white flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#F7CAC9]" /> AI Phân Tích Câu Hỏi
              </span>
              <button
                onClick={handleSummarizeQA}
                disabled={isSummarizing || questions.length === 0}
                className="px-3 py-1 bg-[#F7CAC9]/10 hover:bg-[#F7CAC9]/20 border border-[#F7CAC9]/30 rounded-[4px] text-xs text-[#F7CAC9] transition disabled:opacity-50"
              >
                {isSummarizing ? 'Đang phân tích...' : 'Tóm tắt Q&A'}
              </button>
            </div>
            {summary ? (
              <div className="text-xs text-[#F7CAC9]/90 leading-relaxed bg-[#F7CAC9]/10 p-2 rounded-[4px]">
                <div dangerouslySetInnerHTML={{ __html: summary.replace(/\n/g, '<br/>') }} />
              </div>
            ) : (
              <div className="text-xs text-white/40 italic">
                Bấm "Tóm tắt Q&A" để AI tổng hợp các xu hướng câu hỏi của khán giả.
              </div>
            )}
          </div>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-white/10">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#F7CAC9]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo nội dung, tên, MSSV..."
              className="w-full pl-9 pr-3 py-2 rounded-[4px] bg-[#0E051C]/60 border border-white/15 focus:border-[#F7CAC9] text-xs text-white placeholder-white/40 transition outline-none"
            />
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 rounded-[4px] bg-[#0E051C]/60 border border-white/15 text-xs text-white focus:border-[#F7CAC9] transition outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả chủ đề</option>
              {QA_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>

            {/* Sort Toggle */}
            <div className="flex items-center fluent-box-nested p-0.5 rounded-[4px] border border-white/10">
              <button
                type="button"
                onClick={() => setSortBy('NEWEST')}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sortBy === 'NEWEST' ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <Clock className="w-3 h-3" />
                Mới nhất
              </button>
              <button
                type="button"
                onClick={() => setSortBy('HOT')}
                className={`px-2.5 py-1 rounded-[4px] text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
                  sortBy === 'HOT' ? 'bg-pink-600 text-white' : 'text-white/50 hover:text-white'
                }`}
              >
                <Flame className="w-3 h-3" />
                Top Vote
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Questions Cards List */}
      <div key={`${statusFilter}_${categoryFilter}_${sortBy}`} className="fluent-tab-panel space-y-3">
        {filteredQuestions.length === 0 ? (
          <div className="p-12 text-center fluent-box border border-white/10 rounded-[4px] space-y-3">
            <MessageSquare className="w-10 h-10 text-white/30 mx-auto" />
            <h4 className="text-sm font-bold text-white/70">Không có câu hỏi nào phù hợp với bộ lọc</h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Khán giả gửi câu hỏi sẽ xuất hiện tại đây theo thời gian thực để Ban Quản trị phê duyệt.
            </p>
          </div>
        ) : (
          filteredQuestions.map((q) => {
            const catInfo = QA_CATEGORIES.find((c) => c.id === q.category) || QA_CATEGORIES[0];
            const isCurrentlyFeatured = featuredQuestion?.id === q.id;

            return (
              <div
                key={q.id}
                className={`p-5 rounded-[4px] border transition-all duration-200 ${
                  isCurrentlyFeatured
                    ? 'fluent-box border-rose-500/80 shadow-2xl ring-1 ring-rose-500/40'
                    : 'fluent-box hover:border-white/20'
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-[2px] border ${catInfo.badgeBg}`}>
                      {catInfo.label}
                    </span>

                    <span className="text-xs font-mono text-white/40">
                      {new Date(q.created_at).toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>

                    {/* Status Badge */}
                    {q.status === 'FEATURED' && (
                      <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-black bg-rose-500 text-white flex items-center gap-1 shadow animate-pulse">
                        <Radio className="w-3 h-3" />
                        ĐANG CHIẾU SÂN KHẤU
                      </span>
                    )}
                    {q.status === 'PENDING' && (
                      <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold fluent-box-nested text-amber-300 border border-amber-500/40">
                        Chờ duyệt
                      </span>
                    )}
                    {q.status === 'APPROVED' && (
                      <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold fluent-box-nested text-sky-300 border border-sky-500/40">
                        Đã duyệt
                      </span>
                    )}
                    {q.status === 'ANSWERED' && (
                      <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold fluent-box-nested text-emerald-300 border border-emerald-500/40">
                        Đã giải đáp
                      </span>
                    )}
                    {q.status === 'REJECTED' && (
                      <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-bold fluent-box-nested text-rose-300 border border-rose-500/40">
                        Từ chối
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-[2px] fluent-box-nested text-pink-300 border border-pink-500/30 text-xs font-mono font-bold flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 fill-current text-pink-400" />
                      <span>{q.upvotes || 0} votes</span>
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <p className="text-base font-bold text-white leading-relaxed mb-4">
                  "{q.question_text}"
                </p>

                {/* Bottom Row: Author & Action Buttons */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-xs text-white/70">
                    <User className="w-3.5 h-3.5 text-white/40" />
                    <span className="font-bold text-white">
                      {q.is_anonymous ? 'Khán giả ẩn danh' : q.author_name}
                    </span>
                    {!q.is_anonymous && q.author_mssv && (
                      <span className="font-mono text-[11px] px-1.5 py-0.2 rounded-[2px] fluent-box-nested text-white/80 border border-white/10">
                        MSSV: {q.author_mssv}
                      </span>
                    )}
                  </div>

                  {/* Moderation Controls */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Feature / Unfeature on Projector */}
                    <button
                      type="button"
                      onClick={() => handleFeature(q)}
                      className={`px-3 py-1.5 rounded-[4px] text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md ${
                        isCurrentlyFeatured
                          ? 'bg-rose-600 hover:bg-rose-700 text-white border border-rose-400 shadow-rose-600/30'
                          : 'bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black'
                      }`}
                    >
                      <Radio className={`w-3.5 h-3.5 ${isCurrentlyFeatured ? 'animate-pulse' : ''}`} />
                      <span>{isCurrentlyFeatured ? 'Gỡ Chiếu' : '⭐ Chiếu Màn Hình'}</span>
                    </button>

                    {/* Approve Button */}
                    {q.status !== 'APPROVED' && q.status !== 'FEATURED' && q.status !== 'ANSWERED' && (
                      <button
                        type="button"
                        onClick={() => handleApprove(q.id)}
                        className="px-2.5 py-1.5 rounded-[4px] fluent-box-nested hover:bg-white/15 text-sky-200 border border-sky-500/40 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Duyệt câu hỏi vào luồng cộng đồng"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>
                    )}

                    {/* Mark Answered Button */}
                    {q.status !== 'ANSWERED' && (
                      <button
                        type="button"
                        onClick={() => handleMarkAnswered(q.id)}
                        className="px-2.5 py-1.5 rounded-[4px] fluent-box-nested hover:bg-white/15 text-emerald-200 border border-emerald-500/40 text-xs font-bold flex items-center gap-1 transition cursor-pointer"
                        title="Đánh dấu đã được trả lời xong"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Đã trả lời</span>
                      </button>
                    )}

                    {/* Reject Button */}
                    {q.status !== 'REJECTED' && q.status !== 'FEATURED' && (
                      <button
                        type="button"
                        onClick={() => handleReject(q.id)}
                        className="px-2 py-1.5 rounded-[4px] fluent-box-nested hover:bg-white/15 text-white/50 hover:text-rose-300 border border-white/10 text-xs transition cursor-pointer"
                        title="Từ chối câu hỏi"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete Button */}
                    <button
                      type="button"
                      onClick={() => setDeleteTargetQuestionId(q.id)}
                      className="px-2 py-1.5 rounded-[4px] fluent-box-nested hover:bg-white/15 text-white/40 hover:text-rose-300 border border-white/10 text-xs transition cursor-pointer"
                      title="Xóa vĩnh viễn"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {deleteTargetQuestionId && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full fluent-box border border-rose-500/30 rounded-[4px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">Xác nhận Xóa?</h3>
            <p className="text-white/70 text-sm mt-2">
              Bạn có chắc chắn muốn xóa câu hỏi này không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetQuestionId(null)}
                className="px-4 py-2 rounded-[4px] fluent-box-nested hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer border border-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  vibrateWarning();
                  await qaService.deleteQuestion(deleteTargetQuestionId);
                  setDeleteTargetQuestionId(null);
                }}
                className="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}
      {isClearAllDialogOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full fluent-box border border-rose-500/30 rounded-[4px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">Xác nhận Xóa Hết?</h3>
            <p className="text-white/70 text-sm mt-2">
              Cảnh báo: Bạn có chắc chắn muốn xóa TOÀN BỘ danh sách câu hỏi Q&A không? Thao tác này không thể hoàn tác.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsClearAllDialogOpen(false)}
                className="px-4 py-2 rounded-[4px] fluent-box-nested hover:bg-white/20 text-white font-bold text-sm transition cursor-pointer border border-white/10"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={async () => {
                  vibrateError();
                  setIsClearAllDialogOpen(false);
                  await qaService.clearAllQuestions();
                }}
                className="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
              >
                Đồng ý Xóa Hết
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


