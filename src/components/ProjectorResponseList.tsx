import React, { useMemo } from 'react';
import { GameState, UserResponse } from '../types';
import { useAutoScroll } from '../hooks/useAutoScroll';
import { normalizeVcnvAnswer } from '../utils/exportUtils';
import {
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Radio,
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
  activeCount = 0
}) => {
  // Convert map to array and sort by submission time (earliest first)
  const rawList = useMemo(() => {
    const list = Object.values(responses || []) as UserResponse[];
    return list.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
  }, [responses]);

  // Hook for automatic scrolling
  const {
    containerRef,
    isAutoScrolling,
    isPaused,
    isOverflowing,
    scrollProgress
  } = useAutoScroll<HTMLDivElement>({
    enabled: true,
    speed: 'normal',
    pauseOnHover: true,
    bottomPauseMs: 3500,
    topPauseMs: 2500,
    dependencies: [rawList.length]
  });

  // Calculate statistics
  const avgLatency = useMemo(() => {
    if (rawList.length === 0) return '0.00';
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
    <div className="w-full max-w-[96vw] xl:max-w-[95vw] mx-auto space-y-3.5 lg:space-y-4 text-[#e5e5e5] animate-fadeIn select-none flex-1 flex flex-col justify-center">
      {/* Top Banner / Summary */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#241148]/90 backdrop-blur-md border border-[#3E1D74] rounded-[2px] p-4 sm:p-5 shadow-2xl shrink-0">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-[2px] fluent-acrylic-surface flex items-center justify-center text-white font-black shadow-lg shadow-blue-500/20 shrink-0">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#F7CAC9] font-black">
                LIVE SUBMISSIONS MATRIX • {gameState.question_id || gameState.round_name || 'STAGE LIVE'}
              </span>
              <span className="flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded-[2px] fluent-box-nested text-emerald-300 border border-emerald-500/30 font-bold">
                <span className="w-1.5 h-1.5 rounded-[2px] bg-emerald-400 animate-ping" />
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
          <div className="fluent-box-nested px-3 py-1.5 rounded-[2px] border border-white/10">
            <span className="text-white/40 block text-[10px]">Tỷ lệ phản hồi</span>
            <span className="font-bold text-white">
              {rawList.length}/{activeCount} ({participationPercent}%)
            </span>
          </div>

          <div className="fluent-box-nested px-3 py-1.5 rounded-[2px] border border-white/10">
            <span className="text-white/40 block text-[10px]">Tốc độ phản hồi TB</span>
            <span className="font-bold text-[#F7CAC9]">{avgLatency}s</span>
          </div>

          {gameState.status === 'REVEAL' && (
            <div className="bg-emerald-950/60 backdrop-blur-md px-3.5 py-1.5 rounded-[2px] border border-emerald-500/40">
              <span className="text-emerald-300/60 block text-[10px] font-bold">Chính xác</span>
              <span className="font-black text-emerald-400 text-sm">
                {correctCount}/{rawList.length} ({rawList.length > 0 ? Math.round((correctCount / rawList.length) * 100) : 0}%)
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Clean Status & Auto-Scroll Info Bar (Display-Only) */}
      <div className="fluent-box-nested border border-white/10 rounded-[2px] px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs font-mono shrink-0">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] bg-[#F7CAC9]/10 text-[#F7CAC9] font-bold border border-[#F7CAC9]/20">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            TỰ ĐỘNG CUỘN TRỰC TIẾP
          </span>

          {isPaused ? (
            <span className="text-amber-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-amber-400 animate-pulse" />
              Tạm dừng cuộn (Đang tương tác)
            </span>
          ) : isOverflowing ? (
            <span className="text-emerald-400 flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 rounded-[2px] bg-emerald-400 animate-ping" />
              Đang tuần hoàn danh sách ({scrollProgress}%)
            </span>
          ) : (
            <span className="text-white/50">
              Đủ hiển thị trong khung nhìn
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-white/50">
          <span className="inline-flex items-center gap-1.5">
            <ArrowUpDown className="w-3 h-3 text-[#F7CAC9]" />
            Thứ tự: <strong className="text-white font-bold">Thời gian gửi sớm nhất</strong>
          </span>
          <span className="text-white/30">•</span>
          <span>
            Đang nhận dữ liệu: <strong className="text-white font-bold">{rawList.length}</strong> thí sinh
          </span>
        </div>
      </div>

      {/* SUBMISSIONS LIST CONTAINER */}
      <div className="relative bg-[#241148]/60 backdrop-blur-md border border-[#3E1D74] rounded-[2px] overflow-hidden shadow-2xl flex-1 flex flex-col min-h-[460px] md:min-h-[580px] lg:min-h-[66vh]">
        {/* Visual auto-scroll progress track */}
        {isAutoScrolling && isOverflowing && (
          <div className="h-1 fluent-box-nested w-full overflow-hidden shrink-0">
            <div
              className="h-full bg-gradient-to-r from-[#F7CAC9] via-emerald-400 to-amber-400 transition-all duration-300"
              style={{ width: `${scrollProgress}%` }}
            />
          </div>
        )}

        {rawList.length === 0 ? (
          <div className="p-12 sm:p-16 text-center space-y-4 my-auto flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-[2px] fluent-box-nested border border-white/10 flex items-center justify-center text-white/30 shadow-inner">
              <Users className="w-8 h-8 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h4 className="text-lg font-bold text-white">Chưa có phản hồi nào trong lượt thi này</h4>
              <p className="text-xs sm:text-sm text-white/50 max-w-md mx-auto font-mono leading-relaxed">
                Khi khán giả và thí sinh gửi đáp án từ điện thoại, các câu trả lời sẽ tự động xuất hiện và cuộn trực tiếp trên màn chiếu theo thời gian thực.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-[2px] bg-white/5 border border-white/10 text-[11px] font-mono text-[#F7CAC9]">
              <Sparkles className="w-3.5 h-3.5 text-[#F7CAC9]" />
              Hệ thống kết nối thời gian thực đã sẵn sàng
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="flex-1 max-h-[64vh] lg:max-h-[70vh] xl:max-h-[74vh] overflow-y-auto divide-y divide-white/5 scroll-smooth custom-scrollbar"
          >
            <table className="w-full text-left font-mono text-sm sm:text-base md:text-lg">
              <thead className="bg-slate-950/80 sticky top-0 z-20 border-b border-white/10 text-white/50 uppercase text-xs sm:text-sm tracking-wider backdrop-blur-md">
                <tr>
                  <th className="p-3.5 text-center w-16">#</th>
                  <th className="p-3.5">Khán Giả / Thí Sinh</th>
                  <th className="p-3.5">MSSV</th>
                  <th className="p-3.5">Đáp Án Lựa Chọn</th>
                  <th className="p-3.5 text-center">Tốc Độ Gửi</th>
                  <th className="p-3.5 text-right">Trạng Thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {rawList.map((resp, idx) => {
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
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-[2px] fluent-box-nested border border-white/10 text-white/60 font-bold text-sm sm:text-base">
                          {idx + 1}
                        </span>
                      </td>

                      {/* Name */}
                      <td className="p-3.5 font-sans">
                        <div className="flex items-center gap-2.5">
                          <span className="w-8 h-8 rounded-[2px] fluent-acrylic-surface border border-white/10 text-[#F7CAC9] font-bold text-xs flex items-center justify-center uppercase shrink-0">
                            {(resp.user_info?.name || 'K')[0]}
                          </span>
                          <div>
                            <span className="text-sm sm:text-base font-bold text-white block leading-tight">
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
                      <td className="p-3.5 text-white/60 font-mono text-sm sm:text-base">
                        {resp.user_info?.mssv || '—'}
                      </td>

                      {/* Choice / Answer payload */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-3.5 py-1 rounded-[2px] font-mono font-black text-xs sm:text-sm tracking-wider uppercase inline-flex items-center gap-1.5 shadow-sm ${
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
                            <span className="text-xs sm:text-sm text-white/70 truncate max-w-xs hidden md:inline">
                              {gameState.options[resp.choice]}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Latency */}
                      <td className="p-3.5 text-center font-mono">
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-[2px] fluent-box-nested border border-white/10 text-amber-300 font-bold text-xs sm:text-sm">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          {(resp.latency_sec ?? 0).toFixed(2)}s
                        </span>
                      </td>

                      {/* Status */}
                      <td className="p-3.5 text-right font-mono">
                        {isReveal ? (
                          isCorrect ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] fluent-box-nested text-emerald-400 border border-emerald-500/40 font-bold text-xs">
                              <CheckCircle2 className="w-4 h-4" /> CHÍNH XÁC
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] fluent-box-nested text-rose-400 border border-rose-500/40 font-bold text-xs">
                              <XCircle className="w-4 h-4" /> CHƯA ĐÚNG
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] fluent-box-nested text-sky-300 border border-sky-500/30 text-xs">
                            <Zap className="w-3.5 h-3.5 text-sky-400 animate-pulse" /> ĐÃ GHI NHẬN
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

        {/* Bottom subtle stream footer bar */}
        <div className="fluent-box-nested border-t border-white/10 px-4 py-2.5 flex flex-wrap items-center justify-between text-[10px] font-mono text-white/40 shrink-0">
          <div className="flex items-center gap-2">
            <span>BEYOND THE INTERNET 2026 • LIVE AUDIENCE SUBMISSIONS STREAM</span>
            {isAutoScrolling && isOverflowing && (
              <span className="text-emerald-400 font-bold">• ĐANG TỰ ĐỘNG CHUYỂN DÒNG</span>
            )}
          </div>
          <span>TỔNG CỘNG: {rawList.length} DÒNG DỮ LIỆU</span>
        </div>
      </div>
    </div>
  );
};
