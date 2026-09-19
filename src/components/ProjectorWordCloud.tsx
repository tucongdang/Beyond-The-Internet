import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Cloud,
  Sparkles,
  MessageSquare,
  Flame,
  Radio,
  Filter,
  Search,
  RefreshCw,
  X,
  Layers,
  Heart,
  User,
  ExternalLink,
  SlidersHorizontal,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import { GameState, UserResponse, AudienceQAQuestion } from '../types';
import { qaService } from '../services/qaService';
import {
  extractWordCloudKeywords,
  WordCloudItem,
  WordCloudInputSource,
  getWordColorPalette
} from '../utils/wordCloudUtils';
import { getProjectorTheme } from '../utils/themeUtils';

interface ProjectorWordCloudProps {
  gameState: GameState;
  responses?: Record<string, UserResponse>;
  allResponses?: Record<string, Record<string, UserResponse>>;
  onClose?: () => void;
  isStandalone?: boolean;
}

export const ProjectorWordCloud: React.FC<ProjectorWordCloudProps> = ({
  gameState,
  responses = {},
  allResponses = {},
  onClose,
  isStandalone = false
}) => {
  const [qaQuestions, setQaQuestions] = useState<AudienceQAQuestion[]>([]);
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'QA' | 'RESPONSES'>('ALL');
  const [minCount, setMinCount] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedWord, setSelectedWord] = useState<WordCloudItem | null>(null);
  const [layoutKey, setLayoutKey] = useState<number>(0);

  const theme = useMemo(() => getProjectorTheme(gameState.projectorTheme), [gameState.projectorTheme]);

  // Subscribe to real-time Q&A questions
  useEffect(() => {
    const unsub = qaService.subscribe((list) => {
      setQaQuestions(list);
    });
    return () => unsub();
  }, []);

  // Prepare input sources from Q&A and Poll / Short-Answer Submissions
  const rawSources = useMemo<WordCloudInputSource[]>(() => {
    const list: WordCloudInputSource[] = [];

    // 1. Audience Q&A Questions
    if (sourceFilter === 'ALL' || sourceFilter === 'QA') {
      qaQuestions.forEach((q) => {
        list.push({
          type: 'QA',
          id: `QA_${q.id}`,
          text: q.question_text,
          author: q.is_anonymous ? 'Khán giả ẩn danh' : `${q.author_name}${q.author_mssv ? ` (${q.author_mssv})` : ''}`,
          upvotes: q.upvotes || 0,
          category: q.category
        });
      });
    }

    // 2. Current Question / Short-Answer / VCNV Responses
    if (sourceFilter === 'ALL' || sourceFilter === 'RESPONSES') {
      // Active Responses
      Object.entries(responses).forEach(([uid, resp]) => {
        const userResp = resp as UserResponse | undefined;
        if (userResp && userResp.choice && userResp.choice.trim()) {
          list.push({
            type: 'SHORT_ANSWER',
            id: `CURR_${uid}`,
            text: userResp.choice.trim(),
            author: userResp.user_info?.name || 'Khán giả',
            upvotes: 0
          });
        }
      });

      // VCNV Keyword / Clues Responses from allResponses
      Object.entries(allResponses).forEach(([roundKey, userMap]) => {
        if (roundKey.startsWith('VCNV') || roundKey.startsWith('SHORT_ANSWER') || roundKey.startsWith('EMERGENCY_POLL')) {
          Object.entries(userMap || {}).forEach(([uid, resp]) => {
            const userResp = resp as UserResponse | undefined;
            if (userResp && userResp.choice && userResp.choice.trim()) {
              list.push({
                type: roundKey.startsWith('VCNV') ? 'VCNV' : 'POLL',
                id: `${roundKey}_${uid}`,
                text: userResp.choice.trim(),
                author: userResp.user_info?.name || 'Khán giả',
                upvotes: 0
              });
            }
          });
        }
      });
    }

    return list;
  }, [qaQuestions, responses, allResponses, sourceFilter]);

  // Extract Keywords and Frequency Statistics
  const wordCloudData = useMemo(() => {
    return extractWordCloudKeywords(rawSources, 60, minCount);
  }, [rawSources, minCount, layoutKey]);

  // Filtered by Search Term
  const filteredWords = useMemo(() => {
    if (!searchTerm.trim()) return wordCloudData;
    const term = searchTerm.toLowerCase();
    return wordCloudData.filter((w) => w.text.toLowerCase().includes(term));
  }, [wordCloudData, searchTerm]);

  // Top Metrics
  const metrics = useMemo(() => {
    const totalKeywords = wordCloudData.length;
    const totalMentions = wordCloudData.reduce((sum, w) => sum + w.count, 0);
    const topWord = wordCloudData[0]?.text || 'Chưa có';
    const totalContributions = rawSources.length;
    return { totalKeywords, totalMentions, topWord, totalContributions };
  }, [wordCloudData, rawSources]);

  // Max score for scaling math
  const maxScore = wordCloudData[0]?.score || 1;
  const minScore = wordCloudData[wordCloudData.length - 1]?.score || 1;

  // Calculate dynamic font size and scale based on score
  const getWordStyle = (item: WordCloudItem, index: number) => {
    // Normalization ratio between 0 and 1
    const ratio = maxScore > minScore ? (item.score - minScore) / (maxScore - minScore) : 0.5;

    // Font size scaling from 20px (lowest) to 68px (highest)
    const fontSize = Math.round(20 + ratio * 48);

    // Dynamic padding & elevation
    const isTopTier = index < 3;
    const isSecondTier = index >= 3 && index < 8;

    return {
      fontSize: `${fontSize}px`,
      isTopTier,
      isSecondTier,
      ratio
    };
  };

  return (
    <div
      id="projector-word-cloud-container"
      className="w-full max-w-7xl mx-auto rounded-[2px] fluent-box border-2 border-[#3E1D74] shadow-2xl p-5 sm:p-7 backdrop-blur-2xl text-white relative overflow-hidden transition-all duration-500 animate-fadeIn"
    >
      {/* Decorative Glow Elements */}
      <div className="absolute -top-20 -left-20 w-80 h-80 fluent-box-nested rounded-[2px] blur-3xl pointer-events-none" />
      <div className="absolute -bottom-20 -right-20 w-80 h-80 fluent-box-nested rounded-[2px] blur-3xl pointer-events-none" />

      {/* Top Header & Stage Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10 relative z-10">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[2px] bg-gradient-to-tr from-[#F7CAC9] to-[#E39A96] text-[#190839] flex items-center justify-center font-black shadow-lg shadow-[#F7CAC9]/30">
            <Cloud className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-[2px] bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] border border-[#F7CAC9]/40 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#F7CAC9]" />
                STAGE WORD CLOUD ENGINE
              </span>
              <span className="text-[10px] font-mono text-white/50">
                {metrics.totalContributions} phản hồi đã phân tích
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              Đám Mây Từ Khóa Trực Tiếp
              <span className="text-xs font-mono font-normal text-slate-400">
                (Phím tắt: W)
              </span>
            </h2>
          </div>
        </div>

        {/* Filter Controls & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Source Filter Switcher */}
          <div className="flex items-center fluent-box-nested border border-white/10 rounded-[2px] p-1 text-xs font-mono">
            <button
              type="button"
              onClick={() => setSourceFilter('ALL')}
              className={`px-3 py-1.5 rounded-[2px] font-bold transition ${
                sourceFilter === 'ALL'
                  ? 'bg-[#F7CAC9] text-[#190839] shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              Tất Cả ({rawSources.length})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('QA')}
              className={`px-3 py-1.5 rounded-[2px] font-bold transition flex items-center gap-1.5 ${
                sourceFilter === 'QA'
                  ? 'bg-[#F7CAC9] text-[#190839] shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <MessageSquare className="w-3 h-3" />
              Q&A ({qaQuestions.length})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('RESPONSES')}
              className={`px-3 py-1.5 rounded-[2px] font-bold transition flex items-center gap-1.5 ${
                sourceFilter === 'RESPONSES'
                  ? 'bg-[#F7CAC9] text-[#190839] shadow'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Radio className="w-3 h-3" />
              Bình Chọn / VCNV
            </button>
          </div>

          {/* Min occurrence filter */}
          <div className="hidden sm:flex items-center gap-1.5 fluent-box-nested border border-white/10 px-3 py-1.5 rounded-[2px] text-xs font-mono text-white/70">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#F7CAC9]" />
            <span>Tối thiểu:</span>
            {[1, 2, 3].map((val) => (
              <button
                key={val}
                type="button"
                onClick={() => setMinCount(val)}
                className={`px-2 py-0.5 rounded font-bold transition ${
                  minCount === val
                    ? 'bg-rose-500 text-white shadow-sm'
                    : 'fluent-box-nested text-white/50 hover:text-white'
                }`}
              >
                {val}+
              </button>
            ))}
          </div>

          {/* Re-shuffle / Re-layout Button */}
          <button
            type="button"
            onClick={() => setLayoutKey((prev) => prev + 1)}
            className="p-2 rounded-[2px] fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
            title="Sắp xếp lại vị trí từ khóa"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* Close / Return Button */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-[2px] fluent-box-nested hover:fluent-box-nested text-white font-mono text-xs font-bold transition flex items-center gap-1.5 border border-white/15 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4 relative z-10">
        <div className="fluent-box-nested border border-white/5 rounded-[2px] p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase block">Từ Khóa Trích Xuất</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-rose-300">
              {metrics.totalKeywords}
            </span>
          </div>
          <Layers className="w-5 h-5 text-rose-400/60" />
        </div>

        <div className="fluent-box-nested border border-white/5 rounded-[2px] p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase block">Tổng Số Lượt Xuất Hiện</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-amber-300">
              {metrics.totalMentions}
            </span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-400/60" />
        </div>

        <div className="fluent-box-nested border border-white/5 rounded-[2px] p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase block">Từ Khóa Dẫn Đầu</span>
            <span className="text-sm sm:text-base font-black font-mono text-[#F7CAC9] truncate max-w-[130px] block">
              {metrics.topWord}
            </span>
          </div>
          <Flame className="w-5 h-5 text-[#F7CAC9] animate-pulse" />
        </div>

        <div className="fluent-box-nested border border-white/5 rounded-[2px] p-3.5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono text-white/40 uppercase block">Lượt Đóng Góp</span>
            <span className="text-lg sm:text-xl font-bold font-mono text-emerald-300">
              {metrics.totalContributions}
            </span>
          </div>
          <BarChart3 className="w-5 h-5 text-emerald-400/60" />
        </div>
      </div>

      {/* Search & Quick Filter Bar */}
      <div className="flex items-center gap-3 mb-5 relative z-10">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#F7CAC9]" />
          <input
            type="text"
            placeholder="Tìm nhanh từ khóa trong đám mây (VD: Ransomware, Zero Trust, Bảo mật...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full fluent-box-nested border border-white/10 focus:border-[#F7CAC9] pl-10 pr-9 py-2 rounded-[2px] text-xs sm:text-sm text-white placeholder:text-white/30 outline-none transition"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Main Interactive Word Cloud Canvas */}
      <div
        className="min-h-[380px] sm:min-h-[40vh] max-h-[60vh] overflow-y-auto rounded-[2px] fluent-box-nested border border-white/10 p-6 sm:p-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4.5 content-center relative select-none scrollbar-thin scrollbar-thumb-white/20"
        key={layoutKey}
      >
        {filteredWords.length === 0 ? (
          <div className="text-center py-16 text-white/40 space-y-3">
            <Cloud className="w-12 h-12 mx-auto text-white/20 animate-pulse" />
            <p className="text-sm font-mono">
              Chưa có đủ từ khóa hoặc phản hồi phù hợp với bộ lọc hiện tại.
            </p>
            <p className="text-xs text-white/30">
              Hãy khuyến khích khán giả gửi câu hỏi hoặc câu trả lời qua thiết bị di động!
            </p>
          </div>
        ) : (
          <AnimatePresence>
            {filteredWords.map((item, index) => {
              const { fontSize, isTopTier, isSecondTier } = getWordStyle(item, index);
              const palette = getWordColorPalette(index, filteredWords.length);
              const isSelected = selectedWord?.text === item.text;

              return (
                <motion.button
                  key={`${item.text}_${index}`}
                  layout
                  initial={{ opacity: 0, scale: 0.6, y: 15 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    y: 0,
                    transition: {
                      type: 'spring',
                      stiffness: 260,
                      damping: 20,
                      delay: Math.min(index * 0.015, 0.4)
                    }
                  }}
                  whileHover={{
                    scale: 1.14,
                    zIndex: 40,
                    transition: { duration: 0.15 }
                  }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedWord(selectedWord?.text === item.text ? null : item)}
                  className={`relative rounded-[2px] border transition-all duration-300 flex items-center gap-2 cursor-pointer shadow-md group ${palette.bg} ${
                    isSelected
                      ? 'ring-4 ring-[#F7CAC9] shadow-[0_0_30px_rgba(247,202,201,0.6)] scale-110 z-30'
                      : isTopTier
                      ? 'border-rose-400/80 shadow-[0_0_25px_rgba(244,63,94,0.4)]'
                      : ''
                  }`}
                  style={{
                    padding: isTopTier
                      ? '12px 22px'
                      : isSecondTier
                      ? '8px 16px'
                      : '6px 12px'
                  }}
                  title={`Nhấn để xem ${item.count} câu hỏi/phản hồi chứa từ khóa "${item.text}"`}
                >
                  {/* Top Tier Flame / Sparkle Badge */}
                  {isTopTier && (
                    <motion.span
                      animate={{ scale: [1, 1.25, 1], rotate: [0, 5, -5, 0] }}
                      transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                      className="text-rose-400"
                    >
                      <Flame className="w-4 h-4 fill-rose-400 text-rose-400" />
                    </motion.span>
                  )}

                  <span
                    className="font-black tracking-tight font-sans transition-all group-hover:tracking-wider leading-none"
                    style={{ fontSize }}
                  >
                    {item.text}
                  </span>

                  {/* Frequency & Score Badge */}
                  <span
                    className={`text-[10px] font-mono font-black px-2 py-0.5 rounded-[2px] flex items-center gap-1 shadow-sm shrink-0 ${palette.badge}`}
                  >
                    {item.count}
                    {item.score > item.count * 10 && (
                      <span className="text-[9px] opacity-80">★</span>
                    )}
                  </span>
                </motion.button>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Detailed Word Inspector Modal / Drawer */}
      <AnimatePresence>
        {selectedWord && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="mt-5 p-5 rounded-[2px] fluent-box border border-[#F7CAC9]/50 shadow-2xl space-y-4 relative z-20"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[2px] bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] border border-[#F7CAC9]/40 flex items-center justify-center font-black">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg sm:text-xl font-black text-white font-mono">
                      "{selectedWord.text}"
                    </span>
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-[2px] fluent-box-nested text-rose-300 border border-rose-500/40 font-bold">
                      {selectedWord.count} Lần đề cập ({selectedWord.percentage}%)
                    </span>
                  </div>
                  <p className="text-xs text-white/50">
                    Trích xuất từ {selectedWord.sources.length} phản hồi / câu hỏi khán giả
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedWord(null)}
                className="p-1.5 rounded-[2px] fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Sample Sources */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/20">
              {selectedWord.sources.map((src, i) => (
                <div
                  key={src.id || i}
                  className="p-3 rounded-[2px] fluent-box-nested border border-white/10 hover:border-[#F7CAC9]/40 transition space-y-1.5 text-left"
                >
                  <div className="flex items-center justify-between text-[11px] text-white/50">
                    <div className="flex items-center gap-1.5">
                      <User className="w-3 h-3 text-[#F7CAC9]" />
                      <span className="font-bold text-white/80">{src.author || 'Khán giả'}</span>
                    </div>
                    <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded fluent-box-nested border border-white/10 text-white/60">
                      {src.type === 'QA' ? 'Câu hỏi Q&A' : src.type === 'VCNV' ? 'Dự đoán VCNV' : 'Bình chọn'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-white/90 leading-relaxed font-sans">
                    "{src.snippet}"
                  </p>
                  {(src.upvotes || 0) > 0 && (
                    <div className="flex items-center gap-1 text-[10px] text-rose-300 font-mono">
                      <Heart className="w-3 h-3 fill-rose-400 text-rose-400" />
                      <span>{src.upvotes} lượt thích</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer Info */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-3 border-t border-white/10 text-[10px] font-mono text-white/40">
        <span>BEYOND THE INTERNET 2026 • REALTIME NLP KEYWORD AGGREGATOR</span>
        <span>NHẤN PHÍM [W] ĐỂ BẬT/TẮT ĐÁM MÂY TỪ KHÓA TRÊN MÀN CHIẾU</span>
      </div>
    </div>
  );
};
