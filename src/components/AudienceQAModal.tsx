import { t } from "../utils/i18n";
import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { createPortal } from 'react-dom';
import {
  MessageSquare,
  Send,
  Heart,
  User,
  ShieldCheck,
  Sparkles,
  CheckCircle2,
  Clock,
  Filter,
  Flame,
  X,
  AlertCircle,
  HelpCircle,
  Eye,
  EyeOff,
  Radio,
  Share2
} from 'lucide-react';
import { UserInfo, AudienceQAQuestion, QAQuestionCategory, QASettings } from '../types';
import { qaService, QA_CATEGORIES } from '../services/qaService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateError, vibrateImpact, vibrateSelection } from '../utils/hapticUtils';

interface AudienceQAModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo | null;
  isHighContrast?: boolean;
  initialTab?: 'ASK' | 'MY_QUESTIONS' | 'COMMUNITY';
}

export const AudienceQAModal: React.FC<AudienceQAModalProps> = ({
  isOpen,
  onClose,
  user,
  isHighContrast = false,
  initialTab
}) => {
  const { localLanguage } = useLanguage();

  const [questions, setQuestions] = useState<AudienceQAQuestion[]>([]);
  const [settings, setSettings] = useState<QASettings>(qaService.getSettings());
  const [activeTab, setActiveTab] = useState<'ASK' | 'MY_QUESTIONS' | 'COMMUNITY'>(initialTab || 'ASK');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);
  
  // Submission Form State
  const [questionText, setQuestionText] = useState('');
  const [category, setCategory] = useState<QAQuestionCategory>('GENERAL');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [cooldownSec, setCooldownSec] = useState(0);

  // Filter and Sort in Community Tab
  const [communityFilter, setCommunityFilter] = useState<string>('ALL');
  const [communitySort, setCommunitySort] = useState<'HOT' | 'NEW'>('HOT');

  // Subscribe to Q&A updates
  useEffect(() => {
    const unsubQ = qaService.subscribe(setQuestions);
    const unsubS = qaService.subscribeToSettings(setSettings);
    return () => {
      unsubQ();
      unsubS();
    };
  }, []);

  // Cooldown timer
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const timer = setInterval(() => {
      setCooldownSec((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSec]);

  // Questions submitted by this user
  const myQuestions = useMemo(() => {
    if (!user?.uid) return [];
    return questions.filter((q) => q.uid === user.uid);
  }, [questions, user?.uid]);

  // Community questions (approved or featured or answered)
  const communityQuestions = useMemo(() => {
    let list = questions.filter(
      (q) => q.status === 'APPROVED' || q.status === 'FEATURED' || q.status === 'ANSWERED'
    );

    if (communityFilter !== 'ALL') {
      list = list.filter((q) => q.category === communityFilter);
    }

    if (communitySort === 'HOT') {
      list.sort((a, b) => (b.upvotes || 0) - (a.upvotes || 0));
    } else {
      list.sort((a, b) => b.created_at - a.created_at);
    }

    // Always sort FEATURED questions to the top
    list.sort((a, b) => {
      if (a.status === 'FEATURED' && b.status !== 'FEATURED') return -1;
      if (b.status === 'FEATURED' && a.status !== 'FEATURED') return 1;
      return 0;
    });

    return list;
  }, [questions, communityFilter, communitySort]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionText.trim()) {
      vibrateError();
      setSubmitError(t("qa_err_empty", localLanguage));
      return;
    }
    if (cooldownSec > 0) {
      vibrateError();
      setSubmitError(t("qa_err_cooldown", localLanguage).replace("{cooldown}", String(cooldownSec)));
      return;
    }

    setIsSubmitting(true);
    setSubmitError('');

    const res = await qaService.submitQuestion(
      questionText,
      user,
      isAnonymous,
      category
    );

    setIsSubmitting(false);

    if (res.success) {
      vibrateSuccess();
      soundFx.playReveal(true);
      setSubmitSuccess(true);
      setQuestionText('');
      setCooldownSec(settings.slow_mode_sec || 15);
      setTimeout(() => {
        setSubmitSuccess(false);
        setActiveTab('MY_QUESTIONS');
      }, 1500);
    } else {
      vibrateError();
      setSubmitError(res.error || t("qa_err_fail", localLanguage));
    }
  };

  const handleToggleUpvote = async (qId: string) => {
    if (!user?.uid) return;
    vibrateTap();
    soundFx.playClick();
    await qaService.toggleUpvote(qId, user.uid);
  };

  if (!isOpen) return null;

  const content = (
    <div 
      className="fluent-dialog-overlay z-[60] animate-fadeIn" 
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="qa-modal-title"
    >
      <div
        className="fluent-dialog w-full max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="fluent-dialog-header">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-[2px] fluent-acrylic-surface flex items-center justify-center shadow-lg border border-white/20">
              <MessageSquare className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 id="qa-modal-title" className="text-base sm:text-lg font-bold tracking-wide text-white flex items-center gap-2">
                  {t("qa_title", localLanguage)}
                </h3>
                {settings.is_open ? (
                  <span className="fluent-badge fluent-badge-success">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {localLanguage !== 'vi' ? 'OPEN' : 'ĐANG MỞ'}
                  </span>
                ) : (
                  <span className="fluent-badge fluent-badge-danger">
                    {localLanguage !== 'vi' ? 'CLOSED' : 'TẠM ĐÓNG'}
                  </span>
                )}
              </div>
              <p className="text-xs text-white/60">
                {t("qa_subtitle", localLanguage)}
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="p-1.5 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title={t("qa_close", localLanguage)}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-4 pt-2.5 pb-2 border-b border-white/10 bg-white/[0.02] overflow-x-auto custom-scrollbar">
          <button
            onClick={() => {
              vibrateSelection();
              soundFx.playTing();
              setActiveTab('ASK');
            }}
            className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-mono uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'ASK'
                ? 'fluent-acrylic-surface bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'fluent-box-nested text-white/60 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>{localLanguage !== 'vi' ? 'New Question' : 'Gửi câu hỏi mới'}</span>
          </button>

          <button
            onClick={() => {
              vibrateSelection();
              soundFx.playTing();
              setActiveTab('MY_QUESTIONS');
            }}
            className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-mono uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'MY_QUESTIONS'
                ? 'fluent-acrylic-surface bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'fluent-box-nested text-white/60 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>{localLanguage !== 'vi' ? 'My Questions' : 'Câu hỏi của tôi'}</span>
            {myQuestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-[2px] text-[10px] bg-purple-500/30 text-purple-200 border border-purple-500/40 font-mono font-black">
                {myQuestions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              vibrateSelection();
              soundFx.playTing();
              setActiveTab('COMMUNITY');
            }}
            className={`px-3 py-1.5 rounded-[2px] text-xs font-bold font-mono uppercase tracking-wider transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeTab === 'COMMUNITY'
                ? 'fluent-acrylic-surface bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]'
                : 'fluent-box-nested text-white/60 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{localLanguage !== 'vi' ? 'Auditorium Discussion' : 'Khán phòng thảo luận'}</span>
            {communityQuestions.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-[2px] text-[10px] bg-pink-500/30 text-pink-200 border border-pink-500/40 font-mono">
                {communityQuestions.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="fluent-dialog-body space-y-4">
          {/* TAB 1: ASK QUESTION */}
          {activeTab === 'ASK' && (
            <div className="space-y-4 animate-fadeIn">
              {submitSuccess ? (
                <div className="p-6 rounded-[2px] fluent-box-nested border border-emerald-500/30 text-center space-y-3 animate-scaleUp">
                  <div className="w-12 h-12 mx-auto rounded-[2px] bg-emerald-950/60 flex items-center justify-center text-emerald-400 border border-emerald-500/30 shadow-lg">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-emerald-300 font-mono">{t("qa_success_title", localLanguage)}</h4>
                  <p className="text-xs text-white/70 max-w-sm mx-auto">
                    {t("qa_success_desc", localLanguage)}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Category Selection */}
                  <div>
                    <label className="block text-xs font-bold text-white/80 mb-2 uppercase font-mono tracking-wider">
                      {t("qa_field_topic", localLanguage)}
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {QA_CATEGORIES.map((cat) => {
                        const isSelected = category === cat.id;
                        return (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              vibrateTap();
                              setCategory(cat.id);
                            }}
                            className={`p-2.5 rounded-[2px] text-xs font-bold border transition text-left flex flex-col gap-0.5 cursor-pointer ${
                              isSelected
                                ? 'fluent-option-btn selected text-white'
                                : 'fluent-option-btn text-white/70'
                            }`}
                          >
                            <span className="text-[11px] leading-tight">{cat.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Question Input Textarea */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-white/80 uppercase font-mono tracking-wider">
                        {t("qa_field_content", localLanguage)}
                      </label>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          questionText.length > (settings.max_chars || 250) - 20
                            ? 'text-rose-400 animate-pulse'
                            : 'text-white/40'
                        }`}
                      >
                        {questionText.length}/{settings.max_chars || 250} {t("qa_chars", localLanguage)}
                      </span>
                    </div>

                    <textarea
                      id="input-qa-question-text"
                      rows={4}
                      value={questionText}
                      maxLength={settings.max_chars || 250}
                      onChange={(e) => setQuestionText(e.target.value)}
                      placeholder={t("qa_ph_content", localLanguage)}
                      className="w-full fluent-textarea leading-relaxed resize-none"
                    />
                  </div>

                  {/* Sender Identity Options */}
                  <div className="p-3.5 rounded-[2px] fluent-box-nested border border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-[2px] bg-white/10 flex items-center justify-center text-purple-300">
                        {isAnonymous ? <EyeOff className="w-4 h-4" /> : <User className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">
                          {isAnonymous ? t("qa_mode_anon", localLanguage) : `${t("qa_mode_name", localLanguage)} ${user?.name || "Khán giả"}`}
                        </div>
                        <div className="text-[10px] text-white/50 font-mono">
                          {isAnonymous
                            ? t("qa_anon_hint", localLanguage)
                            : t("qa_mssv_hint", localLanguage).replace("{mssv}", user?.mssv || "---")}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        vibrateTap();
                        setIsAnonymous(!isAnonymous);
                      }}
                      className={`fluent-btn px-3 py-1.5 rounded-[2px] text-xs font-bold font-mono transition cursor-pointer ${
                        isAnonymous
                          ? 'fluent-acrylic-surface bg-purple-500/20 text-purple-200 border border-purple-500/40'
                          : 'fluent-box-nested text-white/70 hover:text-white'
                      }`}
                    >
                      {isAnonymous ? (localLanguage !== 'vi' ? 'Anonymous: ON' : 'Ẩn danh: BẬT') : (localLanguage !== 'vi' ? 'Anonymous: OFF' : 'Ẩn danh: TẮT')}
                    </button>
                  </div>

                  {submitError && (
                    <div className="p-3 rounded-[2px] bg-rose-950/60 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 font-mono">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    id="btn-submit-qa-question"
                    disabled={isSubmitting || !settings.is_open || cooldownSec > 0 || !questionText.trim()}
                    className={`fluent-btn w-full py-3 px-4 rounded-[2px] font-bold text-xs font-mono uppercase tracking-wider flex items-center justify-center gap-2 shadow-xl transition active:scale-[0.98] ${
                      !settings.is_open
                        ? 'fluent-box-nested opacity-50 cursor-not-allowed'
                        : cooldownSec > 0
                        ? 'bg-amber-600/40 text-amber-200 border border-amber-500/30 cursor-not-allowed'
                        : !questionText.trim()
                        ? 'fluent-box-nested opacity-50 cursor-not-allowed'
                        : 'fluent-acrylic-surface bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 shadow-lg cursor-pointer'
                    }`}
                  >
                    {isSubmitting ? (
                      <span>{t("qa_sending", localLanguage)}</span>
                    ) : cooldownSec > 0 ? (
                      <span className="flex items-center gap-1.5 font-mono">
                        <Clock className="w-4 h-4 animate-spin" />
                        {t("qa_wait", localLanguage).replace("{cooldown}", String(cooldownSec))}
                      </span>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>{localLanguage !== 'vi' ? 'Send Question to Screen' : 'Gửi Câu Hỏi Lên Màn Chiếu'}</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {/* TAB 2: MY QUESTIONS */}
          {activeTab === 'MY_QUESTIONS' && (
            <div className="space-y-3 animate-fadeIn">
              {myQuestions.length === 0 ? (
                <div className="p-8 text-center fluent-box-nested rounded-[2px] space-y-2">
                  <MessageSquare className="w-8 h-8 text-white/30 mx-auto" />
                  <p className="text-sm font-bold text-white/60">{t("qa_no_my_q", localLanguage)}</p>
                  <p className="text-xs text-white/40">
                    {t("qa_no_my_q_hint", localLanguage)}
                  </p>
                </div>
              ) : (
                myQuestions.map((q) => {
                  const catInfo = QA_CATEGORIES.find((c) => c.id === q.category) || QA_CATEGORIES[0];
                  const isFeatured = q.status === 'FEATURED';

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-[2px] border transition-all ${
                        isFeatured
                          ? 'fluent-box border-pink-500/60 ring-1 ring-pink-500/40 shadow-lg'
                          : 'fluent-box'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`fluent-badge ${catInfo.badgeBg}`}>
                            {catInfo.label}
                          </span>
                          <span className="text-[10px] font-mono text-white/40">
                            {new Date(q.created_at).toLocaleTimeString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>

                        {/* Status Badges */}
                        <div>
                          {q.status === 'FEATURED' && (
                            <span className="fluent-badge fluent-badge-danger animate-pulse">
                              <Radio className="w-3 h-3" />
                              {localLanguage !== 'vi' ? 'BROADCASTING ON STAGE' : 'ĐANG CHIẾU TRÊN SÂN KHẤU'}
                            </span>
                          )}
                          {q.status === 'APPROVED' && (
                            <span className="fluent-badge fluent-badge-accent">
                              <CheckCircle2 className="w-3 h-3" />
                              {localLanguage !== 'vi' ? 'Approved' : 'Đã duyệt'}
                            </span>
                          )}
                          {q.status === 'PENDING' && (
                            <span className="fluent-badge fluent-badge-warning">
                              <Clock className="w-3 h-3" />
                              {localLanguage !== 'vi' ? 'Pending Approval' : 'Đang chờ duyệt'}
                            </span>
                          )}
                          {q.status === 'ANSWERED' && (
                            <span className="fluent-badge fluent-badge-success">
                              <Sparkles className="w-3 h-3" />
                              {localLanguage !== 'vi' ? 'Answered' : 'Đã giải đáp'}
                            </span>
                          )}
                          {q.status === 'REJECTED' && (
                            <span className="fluent-badge fluent-badge-danger">
                              {localLanguage !== 'vi' ? 'Declined' : 'Chưa phù hợp'}
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-sm text-white/90 leading-relaxed mb-3">{q.question_text}</p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs">
                        <span className="text-[11px] text-white/50 font-mono">
                          {q.is_anonymous ? t("qa_anon", localLanguage) : `${q.author_name} (${q.author_mssv || '---'})`}
                        </span>
                        <div className="flex items-center gap-1 text-pink-400 font-mono font-bold text-xs">
                          <Heart className="w-3.5 h-3.5 fill-current" />
                          <span>{q.upvotes || 0} {localLanguage !== 'vi' ? "likes" : "lượt thích"}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: COMMUNITY DISCUSSION */}
          {activeTab === 'COMMUNITY' && (
            <div className="space-y-3 animate-fadeIn">
              {/* Category Filter & Sort Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-[2px] fluent-box-nested">
                <div className="flex items-center gap-1 overflow-x-auto max-w-full custom-scrollbar">
                  <button
                    onClick={() => setCommunityFilter('ALL')}
                    className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                      communityFilter === 'ALL'
                        ? 'fluent-acrylic-surface bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm'
                        : 'text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {localLanguage !== 'vi' ? 'All' : 'Tất cả'}
                  </button>
                  {QA_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setCommunityFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold transition whitespace-nowrap cursor-pointer ${
                        communityFilter === cat.id
                          ? 'fluent-acrylic-surface bg-purple-500/20 text-purple-200 border border-purple-500/40 shadow-sm'
                          : 'text-white/60 hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 fluent-box-nested p-0.5 rounded-[2px]">
                  <button
                    onClick={() => setCommunitySort('HOT')}
                    className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                      communitySort === 'HOT' ? 'fluent-acrylic-surface bg-pink-500/20 text-pink-200 border-pink-500/40 shadow-sm' : 'text-white/50 hover:text-white border border-transparent'
                    }`}
                  >
                    <Flame className="w-3 h-3" />
                    Top Vote
                  </button>
                  <button
                    onClick={() => setCommunitySort('NEW')}
                    className={`px-2.5 py-1 rounded-[2px] text-[11px] font-mono font-bold transition flex items-center gap-1 cursor-pointer ${
                      communitySort === 'NEW' ? 'fluent-acrylic-surface bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-sm' : 'text-white/50 hover:text-white border border-transparent'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    {localLanguage !== 'vi' ? 'Latest' : 'Mới nhất'}
                  </button>
                </div>
              </div>

              {/* Questions List */}
              {communityQuestions.length === 0 ? (
                <div className="p-8 text-center fluent-box-nested rounded-[2px] space-y-2">
                  <MessageSquare className="w-8 h-8 text-white/30 mx-auto" />
                  <p className="text-sm font-bold text-white/60">{t("qa_no_q", localLanguage)}</p>
                </div>
              ) : (
                communityQuestions.map((q) => {
                  const catInfo = QA_CATEGORIES.find((c) => c.id === q.category) || QA_CATEGORIES[0];
                  const hasUpvoted = (q.upvoted_uids || []).includes(user?.uid || '');
                  const isFeatured = q.status === 'FEATURED';

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 rounded-[2px] border transition-all ${
                        isFeatured
                          ? 'fluent-box border-pink-500/60 ring-1 ring-pink-500/40 shadow-lg'
                          : 'fluent-box'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`fluent-badge ${catInfo.badgeBg}`}>
                            {catInfo.label}
                          </span>
                          {isFeatured && (
                            <span className="fluent-badge fluent-badge-danger animate-pulse">
                              <Radio className="w-3 h-3" />
                              {localLanguage !== 'vi' ? 'BROADCASTING ON STAGE' : 'ĐANG CHIẾU TRÊN SÂN KHẤU'}
                            </span>
                          )}
                          {q.status === 'ANSWERED' && (
                            <span className="fluent-badge fluent-badge-success">
                              {localLanguage !== 'vi' ? 'Answered' : 'Đã giải đáp'}
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] font-mono text-white/40">
                          {new Date(q.created_at).toLocaleTimeString(localLanguage !== 'vi' ? 'en-US' : 'vi-VN', {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>

                      <p className="text-sm text-white/90 leading-relaxed mb-3 font-medium">
                        {q.question_text}
                      </p>

                      <div className="flex items-center justify-between pt-2 border-t border-white/10">
                        <div className="flex items-center gap-1.5 text-xs text-white/60 font-mono">
                          <User className="w-3.5 h-3.5 text-white/40" />
                          <span>
                            {q.is_anonymous ? t("qa_anon", localLanguage) : `${q.author_name} (${q.author_mssv || '---'})`}
                          </span>
                        </div>

                        {/* Upvote Button */}
                        <button
                          type="button"
                          onClick={() => handleToggleUpvote(q.id)}
                          className={`fluent-btn px-3 py-1 rounded-[2px] text-xs font-mono font-bold flex items-center gap-1.5 transition active:scale-95 cursor-pointer border ${
                            hasUpvoted
                              ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                              : 'fluent-box-nested text-white/80 hover:text-white'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${hasUpvoted ? 'fill-current' : ''}`} />
                          <span className="font-mono">{q.upvotes || 0}</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="fluent-dialog-footer text-[11px] text-white/40 font-mono">
          <div className="mr-auto">BEYOND THE INTERNET 2026 • LIVE AUDIENCE Q&A</div>
          <button
            type="button"
            onClick={onClose}
            className="fluent-btn px-3 py-1 rounded-[2px] fluent-box-nested text-white/80 hover:text-white cursor-pointer"
          >
            {localLanguage !== 'vi' ? 'Close' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
};
