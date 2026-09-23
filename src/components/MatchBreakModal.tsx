import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Coffee, 
  Clock, 
  Play, 
  Pause, 
  RotateCcw, 
  Plus, 
  X, 
  AlertTriangle, 
  Sparkles, 
  CheckCircle2, 
  Radio, 
  Volume2,
  Tv,
  StopCircle,
  Users
} from 'lucide-react';
import { GameState, MatchBreakState } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';

interface MatchBreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  activeCount: number;
  triggerHudToast: (keyLabel: string, actionDesc: string) => void;
  openConfirm?: (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText?: string, 
    isDanger?: boolean
  ) => void;
}

const PRESET_DURATIONS = [
  { label: 'Không hẹn giờ (Vô thời hạn)', seconds: 0 },
  { label: '1 Phút (Hội ý nhanh)', seconds: 60 },
  { label: '2 Phút (Kỹ thuật)', seconds: 120 },
  { label: '3 Phút (Chuẩn bị)', seconds: 180 },
  { label: '5 Phút (Giải lao hiệp)', seconds: 300 },
  { label: '10 Phút (Nghỉ giữa 2 trận)', seconds: 600 },
  { label: '15 Phút (Giải lao dài)', seconds: 900 }
];

const PRESET_TITLES = [
  { title: '☕ TẠM DỪNG GIẢI LAO GIỮA TRẬN', subtitle: 'Thời gian nghỉ ngơi thư giãn & nạp năng lượng cho các thí sinh' },
  { title: '⚖️ HỘI Ý BAN CỐ VẤN & TRỌNG TÀI', subtitle: 'Hội đồng chuyên môn đang tiến hành rà soát & hội ý kết quả' },
  { title: '🛠️ TẠM DỪNG KIỂM TRA KỸ THUẬT', subtitle: 'Ban Kỹ Thuật đang tối ưu đường truyền & thiết bị thi đấu' },
  { title: '🔥 CHUẨN BỊ CHO VÒNG THI TIẾP THEO', subtitle: 'Khán giả và thí sinh vui lòng chuẩn bị thiết bị để bước vào phần thi gay cấn' },
  { title: '🎤 GIAO LƯU KHÁN GIẢ HỘI TRƯỜNG', subtitle: 'Thời gian tương tác & giao lưu trực tiếp cùng MC' }
];

export const MatchBreakModal: React.FC<MatchBreakModalProps> = ({
  isOpen,
  onClose,
  gameState,
  activeCount,
  triggerHudToast,
  openConfirm
}) => {
  const matchBreak = gameState.match_break;
  const isBreakActive = Boolean(matchBreak?.active);

  const [selectedDuration, setSelectedDuration] = useState<number>(300);
  const [customMinutes, setCustomMinutes] = useState<number>(5);
  const [selectedTitle, setSelectedTitle] = useState<string>('☕ TẠM DỪNG GIẢI LAO GIỮA TRẬN');
  const [customSubtitle, setCustomSubtitle] = useState<string>('Thời gian nghỉ ngơi thư giãn & nạp năng lượng cho các thí sinh');
  const [now, setNow] = useState<number>(syncService.getSynchronizedNow());

  useEffect(() => {
    if (!isOpen && !isBreakActive) return;
    const interval = setInterval(() => {
      setNow(syncService.getSynchronizedNow());
    }, 500);
    return () => clearInterval(interval);
  }, [isOpen, isBreakActive]);

  // Sync state if break is active
  useEffect(() => {
    if (matchBreak?.active) {
      if (matchBreak.title) setSelectedTitle(matchBreak.title);
      if (matchBreak.subtitle) setCustomSubtitle(matchBreak.subtitle);
      if (matchBreak.duration_seconds) setSelectedDuration(matchBreak.duration_seconds);
    }
  }, [matchBreak]);

  // Calculate live remaining time
  const { remainingSeconds, totalSeconds, progressPercent, isPaused, isFinished } = useMemo(() => {
    if (!matchBreak || !matchBreak.active) {
      return { remainingSeconds: selectedDuration, totalSeconds: selectedDuration, progressPercent: 100, isPaused: false, isFinished: false };
    }

    const total = matchBreak.duration_seconds || 300;

    if (matchBreak.is_paused) {
      const rem = matchBreak.paused_remaining_seconds ?? total;
      const pct = Math.max(0, Math.min(100, (rem / total) * 100));
      return { remainingSeconds: rem, totalSeconds: total, progressPercent: pct, isPaused: true, isFinished: rem <= 0 };
    }

    const elapsedMs = Math.max(0, now - (matchBreak.start_time || now));
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const rem = Math.max(0, total - elapsedSec);
    const pct = Math.max(0, Math.min(100, (rem / total) * 100));

    return { remainingSeconds: rem, totalSeconds: total, progressPercent: pct, isPaused: false, isFinished: rem <= 0 };
  }, [matchBreak, now, selectedDuration]);

  // Master Action 0: Pause immediately without timer (Không bắt buộc cài thời gian)
  const handlePauseWithoutTimer = useCallback(async () => {
    soundFx.playLock();
    const updates: Partial<GameState> = {
      force_route: 'client_landing',
      force_route_ts: Date.now(),
      match_break: {
        active: true,
        title: selectedTitle || '☕ TẠM DỪNG TRẬN ĐẤU',
        subtitle: customSubtitle || 'Trận đấu đang tạm dừng. Khán giả và thí sinh vui lòng giữ nguyên màn hình.',
        duration_seconds: 0,
        start_time: syncService.getSynchronizedNow(),
        is_paused: false,
        paused_remaining_seconds: 0,
        sound_alert_on_finish: false,
        show_qr: true
      }
    };

    if (gameState.status === 'ACTIVE' && !gameState.is_timer_paused) {
      const now = syncService.getSynchronizedNow();
      const elapsed = gameState.server_start_time ? Math.max(0, (now - gameState.server_start_time) / 1000) : 0;
      const remaining = Math.max(1, Math.ceil((gameState.time_limit || 20) - elapsed));
      updates.is_timer_paused = true;
      updates.paused_remaining_seconds = remaining;
    }

    await syncService.updateGameState(updates);
    triggerHudToast('PAUSE', 'Đã tạm dừng trận đấu (không hẹn giờ)!');
    onClose();
  }, [selectedTitle, customSubtitle, gameState.status, gameState.is_timer_paused, gameState.server_start_time, gameState.time_limit, triggerHudToast, onClose]);

  // Master Action 1: Start Break Countdown
  const handleStartBreak = useCallback(async () => {
    if (selectedDuration === 0) {
      return handlePauseWithoutTimer();
    }
    soundFx.playStartRound();
    const duration = selectedDuration > 0 ? selectedDuration : (customMinutes * 60);
    const startTs = syncService.getSynchronizedNow();

    // Also freeze question timer if active
    const updates: Partial<GameState> = {
      force_route: 'client_landing',
      force_route_ts: Date.now(),
      match_break: {
        active: true,
        title: selectedTitle,
        subtitle: customSubtitle,
        duration_seconds: duration,
        start_time: startTs,
        is_paused: false,
        paused_remaining_seconds: duration,
        sound_alert_on_finish: true,
        show_qr: true
      }
    };

    if (gameState.status === 'ACTIVE' && !gameState.is_timer_paused) {
      const now = syncService.getSynchronizedNow();
      const elapsed = gameState.server_start_time ? Math.max(0, (now - gameState.server_start_time) / 1000) : 0;
      const remaining = Math.max(1, Math.ceil((gameState.time_limit || 20) - elapsed));
      updates.is_timer_paused = true;
      updates.paused_remaining_seconds = remaining;
    }

    await syncService.updateGameState(updates);
    triggerHudToast('BREAK ON', `Đã kích hoạt đếm ngược giải lao ${Math.floor(duration / 60)} phút!`);
    onClose();
  }, [selectedDuration, handlePauseWithoutTimer, customMinutes, selectedTitle, customSubtitle, gameState.status, gameState.is_timer_paused, gameState.server_start_time, gameState.time_limit, triggerHudToast, onClose]);

  // Master Action 1.5: Quick Freeze / Resume Question Timer without Full Screen Break
  const handleToggleQuickFreezeQuestion = useCallback(async () => {
    if (gameState.is_timer_paused) {
      // Resume
      soundFx.playStartRound();
      const remainingToRestore = typeof gameState.paused_remaining_seconds === 'number' && gameState.paused_remaining_seconds > 0
        ? gameState.paused_remaining_seconds 
        : (gameState.time_limit || 20);
      
      const newServerStartTime = syncService.getSynchronizedNow() - (((gameState.time_limit || 20) - remainingToRestore) * 1000);
      
      await syncService.updateGameState({
        is_timer_paused: false,
        paused_remaining_seconds: 0,
        server_start_time: newServerStartTime,
        status: 'ACTIVE'
      });
      
      triggerHudToast('RESUME Q', `Đã tiếp tục đồng hồ câu hỏi ở ${Math.ceil(remainingToRestore)}s`);
    } else if (gameState.status === 'ACTIVE') {
      // Pause
      soundFx.playLock();
      const now = syncService.getSynchronizedNow();
      const elapsed = gameState.server_start_time ? Math.max(0, (now - gameState.server_start_time) / 1000) : 0;
      const remaining = Math.max(1, Math.ceil((gameState.time_limit || 20) - elapsed));

      await syncService.updateGameState({
        is_timer_paused: true,
        paused_remaining_seconds: remaining
      });

      triggerHudToast('PAUSE Q', `Đã đóng băng đồng hồ câu hỏi ở ${remaining}s`);
    } else {
      soundFx.playClick();
      triggerHudToast('STANDBY', 'Đồng hồ câu hỏi chưa bắt đầu');
    }
  }, [gameState.is_timer_paused, gameState.paused_remaining_seconds, gameState.server_start_time, gameState.status, gameState.time_limit, triggerHudToast]);

  // Master Action 2: Pause / Resume Break Timer
  const handleTogglePause = useCallback(async () => {
    if (!matchBreak?.active) return;
    soundFx.playClick();

    if (matchBreak.is_paused) {
      // Resume
      const currentRem = matchBreak.paused_remaining_seconds ?? matchBreak.duration_seconds;
      const total = matchBreak.duration_seconds;
      const elapsedSec = total - currentRem;
      const newStart = syncService.getSynchronizedNow() - (elapsedSec * 1000);

      await syncService.updateGameState({
        match_break: {
          ...matchBreak,
          is_paused: false,
          start_time: newStart
        }
      });
      triggerHudToast('RESUME', 'Đã tiếp tục đếm ngược thời gian giải lao');
    } else {
      // Pause
      const rem = remainingSeconds;
      await syncService.updateGameState({
        match_break: {
          ...matchBreak,
          is_paused: true,
          paused_remaining_seconds: rem
        }
      });
      triggerHudToast('PAUSE', `Đã tạm dừng đồng hồ giải lao ở ${Math.floor(rem / 60)}p ${rem % 60}s`);
    }
  }, [matchBreak, remainingSeconds, triggerHudToast]);

  // Master Action 3: Add extra time (+30s, +1m, +2m)
  const handleAddExtraTime = useCallback(async (extraSeconds: number) => {
    if (!matchBreak?.active) return;
    soundFx.playTing();

    const newDuration = matchBreak.duration_seconds + extraSeconds;

    if (matchBreak.is_paused) {
      const currentRem = (matchBreak.paused_remaining_seconds ?? matchBreak.duration_seconds) + extraSeconds;
      await syncService.updateGameState({
        match_break: {
          ...matchBreak,
          duration_seconds: newDuration,
          paused_remaining_seconds: currentRem
        }
      });
    } else {
      await syncService.updateGameState({
        match_break: {
          ...matchBreak,
          duration_seconds: newDuration
        }
      });
    }

    triggerHudToast('TIME +', `Đã cộng thêm ${extraSeconds >= 60 ? `${extraSeconds / 60} phút` : `${extraSeconds} giây`} giải lao!`);
  }, [matchBreak, triggerHudToast]);

  // Master Action 4: End Break & Dismiss
  const handleDismissBreak = useCallback(() => {
    soundFx.playLock();
    const executeEndBreak = async () => {
      soundFx.playSuccess();
      await syncService.updateGameState({
        match_break: null,
        projector_view_mode: 'DEFAULT',
        show_summary: false,
        force_route: 'audience',
        force_route_ts: Date.now()
      });
      triggerHudToast('BREAK END', 'Đã kết thúc thời gian tạm dừng & trở về sàn đấu!');
      onClose();
    };

    if (typeof openConfirm === 'function') {
      openConfirm(
        'Kết Thúc Thời Gian Tạm Dừng / Giải Lao?',
        'Hành động này sẽ tắt màn hình đếm ngược giải lao trên Màn chiếu sân khấu và đưa khán phòng về giao diện sàn đấu trực tiếp.',
        executeEndBreak,
        'Kết Thúc & Trở Về Sàn Đấu',
        false
      );
    } else {
      executeEndBreak();
    }
  }, [openConfirm, triggerHudToast, onClose]);

  if (!isOpen) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedRemaining = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 select-none animate-fadeIn">
      <div className="fluent-box w-full max-w-2xl rounded-[3px] border border-amber-500/40 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 bg-gradient-to-r from-[#211204] via-[#1c0d2e] to-[#0e071a] border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[2px] bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-inner">
              <Coffee className="w-5 h-5 animate-pulse text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                  Đếm Ngược Tạm Dừng & Giải Lao Giữa Trận
                </h3>
                <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border ${
                  isBreakActive
                    ? isPaused
                      ? 'bg-rose-950 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-amber-950 text-amber-300 border-amber-500/50'
                    : 'bg-white/5 text-white/40 border-white/10'
                }`}>
                  {isBreakActive ? (isPaused ? 'ĐANG TẠM DỪNG' : 'ĐANG PHÁT LIVE') : 'SẴN SÀNG'}
                </span>
              </div>
              <p className="text-[11px] text-white/50">
                Hiển thị đồng hồ đếm ngược giải lao khổng lồ trên Màn Chiếu Sân Khấu & Máy Khán Giả
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[2px] fluent-box-nested hover:bg-white/10 text-white/70 hover:text-white transition cursor-pointer"
            title="Đóng bảng điều khiển"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1 custom-scrollbar">
          {/* QUICK PAUSE / FREEZE QUESTION BANNER */}
          <div className={`p-3 sm:p-3.5 rounded-[3px] border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
            gameState.is_timer_paused
              ? 'bg-amber-950/60 border-amber-400/60 shadow-lg shadow-amber-950/40 ring-1 ring-amber-400/40'
              : gameState.status === 'ACTIVE'
                ? 'bg-indigo-950/40 border-indigo-500/40'
                : 'bg-white/5 border-white/10'
          }`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center shrink-0 ${
                gameState.is_timer_paused
                  ? 'bg-amber-500 text-slate-950 animate-pulse'
                  : gameState.status === 'ACTIVE'
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-400/40'
                    : 'bg-white/5 text-white/40'
              }`}>
                {gameState.is_timer_paused ? <Pause className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Đồng Hồ Câu Hỏi [{gameState.question_id || 'Chưa nạp'}]:
                  </span>
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${
                    gameState.is_timer_paused
                      ? 'bg-amber-950 text-amber-300 border-amber-400 animate-pulse'
                      : gameState.status === 'ACTIVE'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
                        : 'bg-black/40 text-white/40 border-white/10'
                  }`}>
                    {gameState.is_timer_paused 
                      ? `ĐANG DỪNG (${gameState.paused_remaining_seconds || 0}s)` 
                      : gameState.status === 'ACTIVE' ? 'ĐANG CHẠY' : 'STANDBY'}
                  </span>
                </div>
                <p className="text-[10px] text-white/50 truncate">
                  {gameState.is_timer_paused 
                    ? 'Đang đóng băng tạm thời. Bấm Tiếp Tục để các thí sinh tiếp tục nộp bài.' 
                    : gameState.status === 'ACTIVE' 
                      ? 'Đóng băng ngay nếu cần hội ý khẩn cấp mà không đổi giao diện màn chiếu.' 
                      : 'Câu hỏi chưa kích hoạt thời gian.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleQuickFreezeQuestion}
              disabled={gameState.status !== 'ACTIVE' && !gameState.is_timer_paused}
              className={`w-full sm:w-auto px-4 py-2 rounded-[2px] font-mono text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                gameState.is_timer_paused
                  ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
                  : 'bg-amber-600 hover:bg-amber-500 text-white shadow-md'
              }`}
            >
              {gameState.is_timer_paused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{gameState.is_timer_paused ? 'Tiếp Tục Đồng Hồ' : 'Đóng Băng Nhanh'}</span>
            </button>
          </div>

          {/* LIVE ACTIVE BREAK MONITOR (If Break is running) */}
          {isBreakActive && (
            <div className="p-4 rounded-[3px] bg-gradient-to-br from-amber-950/60 to-purple-950/60 border border-amber-400/50 shadow-inner space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-amber-300 font-bold">
                  <Radio className="w-3.5 h-3.5 animate-pulse text-amber-400" />
                  <span>ĐANG PHÁT MÀN CHIẾU SÂN KHẤU: {matchBreak?.title}</span>
                </div>
                <div className="text-xs font-mono text-white/60 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-400" />
                  <span>{activeCount} khán giả online</span>
                </div>
              </div>

              {/* Giant Live Digital Clock */}
              <div className="flex flex-col items-center justify-center py-2">
                <div className="font-mono font-black text-5xl sm:text-6xl text-amber-300 tracking-tight leading-none drop-shadow-md">
                  {formattedRemaining}
                </div>
                <div className="w-full max-w-md mt-3 space-y-1">
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-purple-400 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-white/40">
                    <span>{isPaused ? '⏸️ Tạm dừng' : '⏳ Đang đếm ngược'}</span>
                    <span>Tổng: {Math.floor((matchBreak?.duration_seconds || 300) / 60)} phút</span>
                  </div>
                </div>
              </div>

              {/* Live Action Controls */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleTogglePause}
                  className={`p-2 rounded-[2px] font-mono text-xs font-bold border transition flex items-center justify-center gap-1.5 cursor-pointer ${
                    isPaused 
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-400 shadow-md' 
                      : 'bg-amber-600/80 hover:bg-amber-500 text-white border-amber-400'
                  }`}
                >
                  {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
                  <span>{isPaused ? 'Tiếp Tục Đếm' : 'Tạm Dừng'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddExtraTime(30)}
                  className="p-2 rounded-[2px] fluent-box-nested hover:bg-white/10 text-white font-mono text-xs font-bold border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+30 Giây</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleAddExtraTime(60)}
                  className="p-2 rounded-[2px] fluent-box-nested hover:bg-white/10 text-white font-mono text-xs font-bold border border-white/10 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+1 Phút</span>
                </button>

                <button
                  type="button"
                  onClick={handleDismissBreak}
                  className="p-2 rounded-[2px] bg-rose-600/80 hover:bg-rose-500 text-white font-mono text-xs font-bold border border-rose-400 flex items-center justify-center gap-1 cursor-pointer shadow"
                >
                  <StopCircle className="w-3.5 h-3.5" />
                  <span>Kết Thúc Nghỉ</span>
                </button>
              </div>
            </div>
          )}

          {/* CONFIGURATION SECTION */}
          <div className="space-y-4">
            {/* Step 1: Chọn lý do / Tiêu đề giải lao */}
            <div className="space-y-2">
              <label className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>1. Chọn Tiêu Đề & Lý Do Tạm Dừng</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {PRESET_TITLES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setSelectedTitle(preset.title);
                      setCustomSubtitle(preset.subtitle);
                    }}
                    className={`p-2.5 rounded-[2px] border text-left transition cursor-pointer flex flex-col gap-1 ${
                      selectedTitle === preset.title
                        ? 'bg-amber-500/20 border-amber-400 text-white shadow-inner'
                        : 'fluent-box-nested hover:fluent-box-nested border-white/10 text-white/70 hover:text-white'
                    }`}
                  >
                    <span className="font-bold text-xs">{preset.title}</span>
                    <span className="text-[10px] text-white/40 line-clamp-1">{preset.subtitle}</span>
                  </button>
                ))}
              </div>

              {/* Custom Title Input */}
              <div className="space-y-1.5 pt-1">
                <input
                  type="text"
                  value={selectedTitle}
                  onChange={(e) => setSelectedTitle(e.target.value)}
                  placeholder="Nhập tiêu đề tạm dừng tùy chỉnh..."
                  className="w-full px-3 py-1.5 rounded-[2px] bg-black/40 border border-white/15 text-xs text-white placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
                <input
                  type="text"
                  value={customSubtitle}
                  onChange={(e) => setCustomSubtitle(e.target.value)}
                  placeholder="Nhập lời dặn / ghi chú cho thí sinh & khán giả..."
                  className="w-full px-3 py-1.5 rounded-[2px] bg-black/40 border border-white/15 text-xs text-white/70 placeholder-white/30 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            {/* Step 2: Chọn thời lượng đếm ngược */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <label className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>2. Chọn Thời Lượng Đếm Ngược</span>
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_DURATIONS.map((dur, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedDuration(dur.seconds)}
                    className={`p-2.5 rounded-[2px] border text-center transition cursor-pointer font-mono ${
                      selectedDuration === dur.seconds
                        ? 'bg-gradient-to-r from-amber-500/30 to-purple-500/30 border-amber-400 text-amber-200 font-bold shadow'
                        : 'fluent-box-nested hover:fluent-box-nested border-white/10 text-white/70 hover:text-white text-xs'
                    }`}
                  >
                    <div className="text-sm font-black">
                      {dur.seconds === 0 ? 'KHÔNG HẸN GIỜ' : `${Math.floor(dur.seconds / 60)} PHÚT`}
                    </div>
                    <div className="text-[10px] text-white/40">
                      {dur.seconds === 0 ? 'Tạm dừng vô thời hạn' : (dur.label.split('(')[1]?.replace(')', '') || '')}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Minutes Input */}
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-white/60 font-mono">Hoặc nhập số phút tùy ý:</span>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={customMinutes}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10) || 1;
                    setCustomMinutes(val);
                    setSelectedDuration(val * 60);
                  }}
                  className="w-24 px-2 py-1 rounded-[2px] bg-black/40 border border-white/15 text-xs font-mono text-center text-white focus:border-amber-400 focus:outline-none"
                />
                <span className="text-xs text-white/40 font-mono">phút ({customMinutes * 60} giây)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer: Action Buttons */}
        <div className="p-4 bg-[#120822] border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[2px] fluent-box-nested hover:bg-white/10 text-white/70 text-xs font-mono transition cursor-pointer"
          >
            Đóng Hộp Thoại
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePauseWithoutTimer}
              className="px-4 py-2.5 rounded-[2px] bg-amber-950/80 hover:bg-amber-900 border border-amber-500/50 text-amber-200 font-bold text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-3.5 h-3.5" />
              <span>Tạm Dừng (Không Hẹn Giờ)</span>
            </button>

            <button
              type="button"
              onClick={handleStartBreak}
              className="px-5 py-2.5 rounded-[2px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg shadow-amber-950/60 transition flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>
                {selectedDuration === 0
                  ? 'Tạm Dừng Vô Thời Hạn'
                  : isBreakActive 
                    ? 'Cập Nhật & Đếm Ngược Lại' 
                    : `Bắt Đầu Đếm Ngược (${Math.floor(selectedDuration / 60)} Phút)`}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
