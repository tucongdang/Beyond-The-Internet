import React, { useState, useMemo } from 'react';
import { GameState, UserResponse } from '../types';
import { useAutoScroll, AutoScrollSpeed } from '../hooks/useAutoScroll';
import { normalizeVcnvAnswer } from '../utils/exportUtils';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Filter,
  Play,
  Pause,
  RotateCcw,
  Gauge,
  Search,
  X,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';

interface ProjectorResponseListProps {
  responses: Record<string, UserResponse>;
  gameState: GameState;
  onClose?: () => void;
  activeCount?: number;
}

export const ProjectorResponseList: React.FC<ProjectorResponseListProps> = ({
  responses,
  gameState,
  onClose,
  activeCount = 0
}) => {
  const [filterChoice, setFilterChoice] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'TIME_ASC' | 'TIME_DESC' | 'LATENCY' | 'NAME'>('TIME_ASC');

  // Convert map to array and sort
  const rawList = useMemo(() => {
    return Object.values(responses || []) as UserResponse[];
  }, [responses]);

  // Unique choices present in submissions
  const availableChoices = useMemo(() => {
    const set = new Set<string>();
    rawList.forEach(r => {
      if (r.choice) set.add(r.choice.trim().toUpperCase());
    });
    return Array.from(set).sort();
  }, [rawList]);

  // Filtered & Sorted list
  const filteredList = useMemo(() => {
    let list = [...rawList];

    // Filter by choice
    if (filterChoice !== 'ALL') {
      if (filterChoice === 'CORRECT' && gameState.status === 'REVEAL') {
        const correctNorm = normalizeVcnvAnswer(gameState.correct_key || '');
        list = list.filter(r => normalizeVcnvAnswer(r.choice) === correctNorm);
      } else if (filterChoice === 'INCORRECT' && gameState.status === 'REVEAL') {
        const correctNorm = normalizeVcnvAnswer(gameState.correct_key || '');
        list = list.filter(r => normalizeVcnvAnswer(r.choice) !== correctNorm);
      } else {
        list = list.filter(r => (r.choice || '').trim().toUpperCase() === filterChoice);
      }
    }

    // Filter by search query (name, mssv, choice)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(r =>
        (r.user_info?.name || '').toLowerCase().includes(q) ||
        (r.user_info?.mssv || '').toLowerCase().includes(q) ||
        (r.choice || '').toLowerCase().includes(q)
      );
    }

    // Sort list
    list.sort((a, b) => {
      if (sortBy === 'TIME_ASC') return (a.timestamp || 0) - (b.timestamp || 0);
      if (sortBy === 'TIME_DESC') return (b.timestamp || 0) - (a.timestamp || 0);
      if (sortBy === 'LATENCY') {
        const latA = a.latency_sec ?? 999;
        const latB = b.latency_sec ?? 999;
        return latA - latB;
      }
      if (sortBy === 'NAME') {
        return (a.user_info?.name || '').localeCompare(b.user_info?.name || '');
      }
      return 0;
    });

    return list;
  }, [rawList, filterChoice, searchQuery, sortBy, gameState.status, gameState.correct_key]);

  // Hook for automatic scrolling
  const {
    containerRef,
    isAutoScrolling,
    toggleAutoScroll,
    currentSpeed,
    setCurrentSpeed,
    isPaused,
    isOverflowing,
    scrollProgress,
    resetToTop
  } = useAutoScroll<HTMLDivElement>({
    enabled: true,
    speed: 'normal',
    pauseOnHover: true,
    bottomPauseMs: 3000,
    topPauseMs: 2000,
    dependencies: [filteredList.length, filterChoice, sortBy]
  });

  // Calculate statistics
  const avgLatency = useMemo(() => {
    if (rawList.length === 0) return 0;
    const total = rawList.reduce((sum, r) => sum + (r.latency_sec || 0), 0);
    return (total / rawList.length).toFixed(2);
  }, [rawList]);

  const correctCount = useMemo(() => {
    if (gameState.status !== 'REVEAL' || !gameState.correct_key) return 0;
    const target = normalizeVcnvAnswer(gameState.correct_key);
    return rawList.filter(r => normalizeVcnvAnswer(r.choice) === target).length;
  }, [rawList, gameState.status, gameState.correct_key]);

  const participationPercent = activeCount > 0
    ? Math.round((rawList.length / activeCount) * 100)
    : 0;

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 text-[#e5e5e5] animate-fadeIn select-none">
      {/* Top Banner / Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#241148]/90 backdrop-blur-md border border-[#3E1D74] rounded-[4px] p-5 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[4px] fluent-acrylic-surface flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F7CAC9] font-black">
                LIVE SUBMISSIONS MATRIX • {gameState.question_id || 'ROUND LIVE'}
              </span>
              <span className="flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-[4px] fluent-box-nested text-emerald-300 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-[4px] bg-emerald-400 animate-ping" />
                {rawList.length} PHẢN HỒI
              </span>
            </div>
            <h2 className="text-xl lg:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              Danh Sách Phản Hồi Trực Tiếp Của Khán Giả
            </h2>
          </div>
        </div>

        {/* Metrics Pill Grid */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono">
          <div className="fluent-box-nested px-3 py-1.5 rounded-[4px] border border-white/10">
            <span className="text-white/40 block text-[10px]">Tỷ lệ phản hồi</span>
            <span className="font-bold text-white">
              {rawList.length}/{activeCount} ({participationPercent}%)
            </span>
          </div>

          <div className="fluent-box-nested px-3 py-1.5 rounded-[4px] border border-white/10">
            <span className="text-white/40 block text-[10px]">Tốc độ phản hồi TB</span>
            <span className="font-bold text-[#F7CAC9]">{avgLatency}s</span>
          </div>

          {gameState.status === 'REVEAL' && (
            <div className="bg-emerald-950/40 backdrop-blur-md px-3 py-1.5 rounded-[4px] border border-emerald-500/30">
              <span className="text-emerald-300/60 block text-[10px]">Đúng đáp án</span>
              <span className="font-black text-emerald-400">
                {correctCount}/{rawList.length} ({rawList.length > 0 ? Math.round((correctCount / rawList.length) * 100) : 0}%)
              </span>
            </div>
          )}

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-2.5 rounded-[4px] fluent-box-nested hover:fluent-box-nested text-white/80 hover:text-white transition"
              title="Đóng danh sách phản hồi"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Auto-Scroll & Filters Toolbar */}
      <div className="fluent-box-nested border border-white/10 rounded-[4px] p-3 sm:p-4 space-y-3 shadow-xl backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          
          {/* AUTO-SCROLL CONTROLS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleAutoScroll}
              className={`px-3.5 py-1.5 rounded-[4px] font-mono text-xs font-bold transition flex items-center gap-2 border shadow-md ${
                isAutoScrolling
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 ring-2 ring-emerald-400/40'
                  : 'fluent-box-nested text-white/70 border-white/20 hover:fluent-box-nested'
              }`}
              title="Bật/Tắt tự động cuộn tuần hoàn qua danh sách phản hồi"
            >
              {isAutoScrolling ? (
                <>
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Tự động cuộn: BẬT</span>
                  <span className="w-2 h-2 rounded-[4px] bg-slate-950 animate-ping ml-0.5" />
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tự động cuộn: TẮT</span>
                </>
              )}
            </button>

            {/* Speed Selector */}
            {isAutoScrolling && (
              <div className="flex items-center fluent-box-nested border border-white/10 rounded-[4px] p-0.5 text-[11px] font-mono">
                <span className="text-white/40 px-2 flex items-center gap-1">
                  <Gauge className="w-3 h-3 text-[#F7CAC9]" /> Tốc độ:
                </span>
                {(['slow', 'normal', 'fast'] as AutoScrollSpeed[]).map(spd => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setCurrentSpeed(spd)}
                    className={`px-2.5 py-1 rounded-[4px] font-bold transition uppercase ${
                      currentSpeed === spd
                        ? 'bg-[#F7CAC9] text-[#190839]'
                        : 'text-white/60 hover:text-white'
                    }`}
                  >
                    {spd === 'slow' ? 'Chậm' : spd === 'normal' ? 'Vừa' : 'Nhanh'}
                  </button>
                ))}
              </div>
            )}

            {/* Reset to top button */}
            <button
              type="button"
              onClick={resetToTop}
              className="px-2.5 py-1.5 rounded-[4px] fluent-box-nested hover:fluent-box-nested border border-white/10 text-white/70 hover:text-white text-xs font-mono transition flex items-center gap-1"
              title="Về đầu danh sách"
            >
              <RotateCcw className="w-3 h-3" /> Về đầu
            </button>

            {/* Auto-scroll Status Badge */}
            {isAutoScrolling && (
              <span className="text-[11px] font-mono text-white/50 px-2 flex items-center gap-1.5">
                {isPaused ? (
                  <span className="text-amber-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-[4px] bg-amber-400 animate-pulse" />
                    Tạm dừng (Rê chuột/Tác vụ)
                  </span>
                ) : isOverflowing ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-[4px] bg-emerald-400 animate-ping" />
                    Đang tuần hoàn ({scrollProgress}%)
                  </span>
                ) : (
                  <span className="text-white/40">
                    Đủ hiển thị trong màn hình
                  </span>
                )}
              </span>
            )}
          </div>

          {/* SORTING CONTROLS */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <span className="text-white/40 hidden sm:inline flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> Sắp xếp:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="fluent-box-nested border border-white/10 rounded-[4px] px-2.5 py-1.5 text-white/90 text-xs font-mono focus:outline-none focus:border-[#F7CAC9]"
            >
              <option value="TIME_ASC">Thời gian (Sớm nhất trước)</option>
              <option value="TIME_DESC">Thời gian (Mới nhất trước)</option>
              <option value="LATENCY">Tốc độ phản hồi (Nhanh nhất)</option>
              <option value="NAME">Tên thí sinh (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Pills & Search */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs font-mono">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-white/40 px-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Lọc:
            </span>

            <button
              type="button"
              onClick={() => setFilterChoice('ALL')}
              className={`px-2.5 py-1 rounded-[4px] transition font-bold ${
                filterChoice === 'ALL'
                  ? 'bg-[#F7CAC9] text-[#190839]'
                  : 'fluent-box-nested text-white/60 hover:fluent-box-nested'
              }`}
            >
              Tất cả ({rawList.length})
            </button>

            {gameState.status === 'REVEAL' && (
              <>
                <button
                  type="button"
                  onClick={() => setFilterChoice('CORRECT')}
                  className={`px-2.5 py-1 rounded-[4px] transition font-bold flex items-center gap-1 ${
                    filterChoice === 'CORRECT'
                      ? 'bg-emerald-500 text-slate-950 font-black'
                      : 'fluent-box-nested text-emerald-300 border border-emerald-500/30'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" /> Đúng ({correctCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterChoice('INCORRECT')}
                  className={`px-2.5 py-1 rounded-[4px] transition font-bold flex items-center gap-1 ${
                    filterChoice === 'INCORRECT'
                      ? 'bg-rose-500 text-white font-black'
                      : 'fluent-box-nested text-rose-300 border border-rose-500/30'
                  }`}
                >
                  <XCircle className="w-3 h-3" /> Chưa đúng ({rawList.length - correctCount})
                </button>
              </>
            )}

            {availableChoices.slice(0, 6).map(choice => (
              <button
                key={choice}
                type="button"
                onClick={() => setFilterChoice(choice)}
                className={`px-2.5 py-1 rounded-[4px] transition font-bold ${
                  filterChoice === choice
                    ? 'bg-amber-400 text-slate-950'
                    : 'fluent-box-nested text-white/60 hover:fluent-box-nested'
                }`}
              >
                {choice}
              </button>
            ))}
          </div>

          {/* Search box */}
          <div className="relative w-full sm:w-60">
            <Search className="w-3.5 h-3.5 text-[#F7CAC9] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên, MSSV, đáp án..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full fluent-box-nested border border-white/10 rounded-[4px] pl-8 pr-3 py-1.5 text-xs font-mono text-white placeholder:text-white/30 focus:outline-none focus:border-[#F7CAC9]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* AUTO-SCROLLABLE SUBMISSIONS LIST CONTAINER */}
      <div className="relative bg-[#241148]/60 backdrop-blur-md border border-[#3E1D74] rounded-[4px] overflow-hidden shadow-2xl">
        {/* Visual auto-scroll progress track */}
        {isAutoScrolling && isOverflowing && (
          <div className="h-1 fluent-box-nested w-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#F7CAC9] via-emerald-400 to-amber-400 transition-all duration-300"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}

        {filteredList.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-center mx-auto text-white/30">
              <Users className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-white">Chưa có phản hồi nào phù hợp</h4>
            <p className="text-xs text-white/40 max-w-sm mx-auto font-mono">
              Khi khán giả gửi đáp án từ điện thoại, các câu trả lời sẽ xuất hiện trực tiếp tại đây theo thời gian thực.
            </p>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="max-h-[58vh] overflow-y-auto divide-y divide-white/5 scroll-smooth custom-scrollbar"
          >
            <table className="w-full text-left font-mono text-sm sm:text-base md:text-lg">
              <thead className="bg-slate-950/80 sticky top-0 z-20 border-b border-white/10 text-white/50 uppercase text-xs sm:text-sm tracking-wider backdrop-blur-md">
                <tr>
                  <th className="p-3.5 text-center w-14">#</th>
                  <th className="p-3.5">Khán Giả / Thí Sinh</th>
                  <th className="p-3.5">MSSV</th>
                  <th className="p-3.5">Đáp Án Lựa Chọn</th>
                  <th className="p-3.5 text-center">Tốc Độ Gửi</th>
                  <th className="p-3.5 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredList.map((resp, idx) => {
                  const isReveal = gameState.status === 'REVEAL';
                  const expected = normalizeVcnvAnswer(gameState.correct_key || '');
                  const isCorrect = isReveal && expected && normalizeVcnvAnswer(resp.choice) === expected;
                  const isIncorrect = isReveal && expected && normalizeVcnvAnswer(resp.choice) !== expected;

                  return (
                    <tr
                      key={resp.user_info?.uid || idx}
                      className={`transition-colors duration-200 ${
                        isCorrect
                          ? 'fluent-box-nested hover:fluent-box-nested'
                          : isIncorrect
                          ? 'fluent-box-nested hover:fluent-box-nested'
                          : idx % 2 === 0
                          ? 'bg-white/[0.02] hover:bg-white/[0.06]'
                          : 'hover:bg-white/[0.06]'
                      }`}
                    >
                      {/* Index / Rank */}
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-[4px] fluent-box-nested border border-white/10 text-white/60 font-bold text-sm sm:text-base">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="p-3.5 font-sans">
                        <div className="flex items-center gap-2">
                          <span className="w-7 h-7 rounded-[4px] fluent-acrylic-surface border border-white/10 text-[#F7CAC9] font-bold text-xs flex items-center justify-center uppercase">
                            {(resp.user_info?.name || 'K')[0]}
                          </span>
                          <div>
                            <span className="text-sm font-bold text-white block leading-tight">
                              {resp.user_info?.name || 'Khán giả ẩn danh'}
                            </span>
                            {(resp as any).round_type && (
                              <span className="text-[10px] text-white/40 font-mono">
                                Vòng: {(resp as any).round_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* MSSV */}
                      <td className="p-3.5 text-white/60 font-mono">
                        {resp.user_info?.mssv || '—'}
                      </td>

                      {/* Choice / Answer payload */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3 py-1 rounded-[4px] font-mono font-black text-xs sm:text-sm tracking-wider uppercase inline-flex items-center gap-1.5 shadow-sm ${
                              isCorrect
                                ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-400/50'
                                : isIncorrect
                                ? 'fluent-box-nested text-rose-300 border border-rose-500/40'
                                : 'bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] border border-[#F7CAC9]/30'
                            }`}
                          >
                            {resp.choice}
                          </span>
                          {gameState.options?.[resp.choice] && (
                            <span className="text-xs text-white/60 truncate max-w-xs hidden md:inline">
                              {gameState.options[resp.choice]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Latency */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] fluent-box-nested border border-white/10 text-amber-300 font-bold">
                          <Clock className="w-3 h-3 text-amber-400" />
                          {(resp.latency_sec ?? 0).toFixed(2)}s
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-right font-mono">
                        {isReveal ? (
                          isCorrect ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] fluent-box-nested text-emerald-400 border border-emerald-500/40 font-bold text-[11px]">
                              <CheckCircle2 className="w-3.5 h-3.5" /> CHÍNH XÁC
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] fluent-box-nested text-rose-400 border border-rose-500/40 font-bold text-[11px]">
                              <XCircle className="w-3.5 h-3.5" /> CHƯA ĐÚNG
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[4px] fluent-box-nested text-sky-300 border border-sky-500/30 text-[11px]">
                            <Zap className="w-3 h-3 text-sky-400 animate-pulse" /> ĐÃ GHI NHẬN
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom subtle auto-scroll hint bar */}
        <div className="fluent-box-nested border-t border-white/10 px-4 py-2 flex flex-wrap items-center justify-between text-[10px] font-mono text-white/40">
          <div className="flex items-center gap-2">
            <span>TỰ ĐỘNG CUỘN TUẦN HOÀN KHI VƯỢT QUÁ KHUNG HÌNH</span>
            {isAutoScrolling && isOverflowing && (
              <span className="text-emerald-400 font-bold">• ĐANG TỰ ĐỘNG CHUYỂN DÒNG</span>
            )}
          </div>
          <span>TỔNG CỘNG: {filteredList.length} DÒNG DỮ LIỆU</span>
        </div>
      </div>
    </div>
  );
};
