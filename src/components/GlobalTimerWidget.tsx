import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameState, RoundType } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import {
  vibrateTap,
  vibrateWarning,
  vibrateSuccess,
  vibrateImpact,
  vibrateSelection
} from '../utils/hapticUtils';
import {
  Clock,
  Play,
  Pause,
  RotateCcw,
  Lock,
  Flame,
  Zap,
  Plus,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Volume2,
  VolumeX,
  Timer,
  Eye,
  SkipForward,
  ChevronDown,
  ChevronUp,
  Settings2,
  Users
} from 'lucide-react';

interface GlobalTimerWidgetProps {
  gameState: GameState;
  onStartQuestion: () => void;
  onLockVoting: () => void;
  onRevealResults?: () => void;
  onReturnToStandby?: () => void;
  onNavigateNext?: () => void;
  onCycleMasterState?: () => void;
  onEliminateRandom2: () => void;
  autoEliminateEvery10s: boolean;
  onToggleAutoEliminate: () => void;
  onTriggerHudToast?: (keyLabel: string, actionDesc: string) => void;
  onOpenShortcuts?: () => void;
  totalVotes?: number;
  totalAudience?: number;
}

export const GlobalTimerWidget: React.FC<GlobalTimerWidgetProps> = ({
  gameState,
  onStartQuestion,
  onLockVoting,
  onRevealResults,
  onReturnToStandby,
  onNavigateNext,
  onCycleMasterState,
  onEliminateRandom2,
  autoEliminateEvery10s,
  onToggleAutoEliminate,
  onTriggerHudToast,
  onOpenShortcuts,
  totalVotes = 0,
  totalAudience = 0
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTimeSettingsOpen, setIsTimeSettingsOpen] = useState(false);

  const [customInputTime, setCustomInputTime] = useState<string>(String(gameState.time_limit || 20));
  const [isPaused, setIsPaused] = useState(false);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);

  // Time remaining computed in real-time
  const [timeRemaining, setTimeRemaining] = useState<number>(gameState.time_limit || 20);

  // Elimination milestones tracker
  const eliminatedMilestonesRef = useRef<Set<number>>(new Set());
  const lastTickTimeRef = useRef<number>(0);

  const [waitTimerInput, setWaitTimerInput] = useState<string>('10');

  const handleStartWaitTimer = (sec: number) => {
    vibrateImpact();
    soundFx.playClick();
    syncService.updateGameState({
      next_question_wait_limit: sec,
      next_question_wait_start: syncService.getSynchronizedNow(),
      next_question_wait_message: 'Chuẩn bị cho câu hỏi tiếp theo'
    });
    if (onTriggerHudToast) {
      onTriggerHudToast('WAIT TIMER', `Đã kích hoạt đếm ngược chờ ${sec}s`);
    }
  };

  const handleCancelWaitTimer = () => {
    vibrateTap();
    syncService.updateGameState({
      next_question_wait_limit: 0,
      next_question_wait_start: 0
    });
    if (onTriggerHudToast) {
      onTriggerHudToast('CANCEL WAIT', 'Đã hủy thời gian chờ');
    }
  };

  // Reset milestone tracker on new question or start
  useEffect(() => {
    if (gameState.status === 'STANDBY') {
      eliminatedMilestonesRef.current.clear();
      setIsPaused(false);
      setPausedRemaining(null);
      setTimeRemaining(gameState.time_limit || 20);
    }
  }, [gameState.status, gameState.question_id, gameState.time_limit]);

  // Real-time ticking effect
  useEffect(() => {
    if (gameState.status !== 'ACTIVE' || isPaused) {
      if (!isPaused) {
        setTimeRemaining(gameState.time_limit || 20);
      }
      return;
    }

    const computeTime = () => {
      if (!gameState.server_start_time) return gameState.time_limit || 20;
      const now = syncService.getSynchronizedNow();
      const elapsed = (now - gameState.server_start_time) / 1000;
      const remaining = Math.max(0, (gameState.time_limit || 20) - elapsed);
      return remaining;
    };

    const interval = setInterval(() => {
      const remaining = computeTime();
      setTimeRemaining(remaining);

      // Sound FX ticking
      if (soundEnabled && remaining > 0) {
        const now = Date.now();
        if (remaining <= 5 && now - lastTickTimeRef.current >= 450) {
          lastTickTimeRef.current = now;
          soundFx.playTick(true);
        } else if (remaining > 5 && now - lastTickTimeRef.current >= 950) {
          lastTickTimeRef.current = now;
          soundFx.playTick(false);
        }
      }

      // Auto-elimination every 10 seconds for Round 3 / Elimination 6
      if (
        autoEliminateEvery10s &&
        (gameState.round_type === 'ELIMINATION_6' || (gameState.options && Object.keys(gameState.options).length > 4))
      ) {
        const elapsed = (gameState.time_limit || 20) - remaining;
        const milestone10 = Math.floor(elapsed / 10);
        if (milestone10 > 0 && !eliminatedMilestonesRef.current.has(milestone10) && elapsed < (gameState.time_limit || 20) - 2) {
          eliminatedMilestonesRef.current.add(milestone10);
          onEliminateRandom2();
          if (onTriggerHudToast) {
            onTriggerHudToast('AUTO 10S', `Mốc ${milestone10 * 10}s: Tự động loại trừ 2 phương án!`);
          }
        }
      }

      // Auto lock when timer hits 0
      if (remaining <= 0) {
        clearInterval(interval);
        soundFx.playLock();
        onLockVoting();
        if (onTriggerHudToast) {
          onTriggerHudToast('TIME UP', 'Hết giờ! Đã tự động khóa nhận đáp án');
        }
      }
    }, 100);

  return () => clearInterval(interval);
  }, [
    gameState.status,
    gameState.server_start_time,
    gameState.time_limit,
    gameState.round_type,
    gameState.options,
    isPaused,
    soundEnabled,
    autoEliminateEvery10s,
    onEliminateRandom2,
    onLockVoting,
    onTriggerHudToast
  ]);

  // Set standard time preset
  const handleSelectPreset = (seconds: number) => {
    vibrateSelection();
    soundFx.playClick();
    setCustomInputTime(String(seconds));
    
    if (gameState.status === 'ACTIVE') {
      const elapsed = Math.max(0, (syncService.getSynchronizedNow() - (gameState.server_start_time || syncService.getSynchronizedNow())) / 1000);
      const newRemaining = Math.max(0, seconds - elapsed);
      syncService.updateGameState({
        time_limit: seconds,
        server_start_time: syncService.getSynchronizedNow() - (elapsed * 1000)
      });
      setTimeRemaining(newRemaining);
    } else {
      syncService.updateGameState({ time_limit: seconds });
      setTimeRemaining(seconds);
    }

    if (onTriggerHudToast) {
      onTriggerHudToast(`${seconds}s`, `Thời gian câu hỏi: ${seconds}s`);
    }
  };

  // Adjust time by offset (+5s, -5s)
  const handleAdjustTime = (delta: number) => {
    vibrateTap();
    soundFx.playClick();
    const currentLimit = gameState.time_limit || 20;
    const newLimit = Math.max(5, Math.min(180, currentLimit + delta));
    setCustomInputTime(String(newLimit));

    if (gameState.status === 'ACTIVE') {
      const currentRemaining = timeRemaining;
      const newRemaining = Math.max(1, currentRemaining + delta);
      const elapsed = Math.max(0, newLimit - newRemaining);
      syncService.updateGameState({
        time_limit: newLimit,
        server_start_time: syncService.getSynchronizedNow() - (elapsed * 1000)
      });
      setTimeRemaining(newRemaining);
    } else {
      syncService.updateGameState({ time_limit: newLimit });
      setTimeRemaining(newLimit);
    }

    if (onTriggerHudToast) {
      onTriggerHudToast(delta > 0 ? `+${delta}s` : `${delta}s`, `Thời gian: ${newLimit}s`);
    }
  };

  // Custom time limit form apply
  const handleApplyCustomTime = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customInputTime, 10);
    if (!isNaN(val) && val >= 3 && val <= 180) {
      handleSelectPreset(val);
    }
  };

  // Pause / Resume Toggle
  const handleTogglePause = () => {
    vibrateTap();
    soundFx.playClick();
    if (!isPaused && gameState.status === 'ACTIVE') {
      setIsPaused(true);
      setPausedRemaining(timeRemaining);
      if (onTriggerHudToast) {
        onTriggerHudToast('PAUSE', `Tạm dừng đồng hồ ở ${Math.ceil(timeRemaining)}s`);
      }
    } else if (isPaused) {
      setIsPaused(false);
      const remainingToRestore = pausedRemaining || timeRemaining;
      const newServerStartTime = syncService.getSynchronizedNow() - (((gameState.time_limit || 20) - remainingToRestore) * 1000);
      syncService.updateGameState({
        status: 'ACTIVE',
        server_start_time: newServerStartTime
      });
      if (onTriggerHudToast) {
        onTriggerHudToast('RESUME', 'Tiếp tục đếm ngược');
      }
    }
  };

  // Reset clock back to standby
  const handleResetTimer = () => {
    vibrateWarning();
    soundFx.playClick();
    setIsPaused(false);
    setPausedRemaining(null);
    eliminatedMilestonesRef.current.clear();
    syncService.updateGameState({
      status: 'STANDBY',
      server_start_time: 0,
      active_module: 'GAME',
      lucky_draw: { status: 'IDLE', winner: null }
    });
    setTimeRemaining(gameState.time_limit || 20);
    if (onTriggerHudToast) {
      onTriggerHudToast('RESET', 'Đặt lại trạng thái Chờ');
    }
  };

  // Progress computations
  const totalLimit = gameState.time_limit || 20;
  const currentSec = Math.max(0, Math.ceil(timeRemaining));
  const progressPercent = Math.min(100, Math.max(0, (timeRemaining / totalLimit) * 100));

  const votePercent = totalAudience > 0 ? Math.min(100, Math.round((totalVotes / totalAudience) * 100)) : 0;

  // Elimination logic for 6-option elimination round
  const isEliminationRound = gameState.round_type === 'ELIMINATION_6' || (gameState.options && Object.keys(gameState.options).length === 6);
  const elapsedSec = Math.max(0, totalLimit - timeRemaining);
  const nextEliminationIn = isEliminationRound ? Math.max(0, Math.ceil(10 - (elapsedSec % 10))) : 0;
  const currentPhase = elapsedSec < 10 ? 1 : elapsedSec < 20 ? 2 : 3;

  // Master Single-Action Progression
  const handleMasterCycleAction = () => {
    if (onCycleMasterState) {
      onCycleMasterState();
      return;
    }
    if (gameState.status === 'STANDBY') {
      vibrateImpact();
      soundFx.playClick();
      onStartQuestion();
    } else if (gameState.status === 'ACTIVE') {
      vibrateWarning();
      soundFx.playLock();
      onLockVoting();
    } else if (gameState.status === 'LOCKED') {
      vibrateSuccess();
      soundFx.playSuccess();
      if (onRevealResults) onRevealResults();
    } else if (gameState.status === 'REVEAL') {
      vibrateImpact();
      soundFx.playClick();
      if (onNavigateNext) {
        onNavigateNext();
      } else if (onReturnToStandby) {
        onReturnToStandby();
      }
    }
  };

  return (
    <div className="fluent-box border border-amber-500/30 rounded-[4px] p-3 sm:p-4 shadow-xl space-y-3 relative overflow-hidden bg-gradient-to-br from-[#180d30]/95 via-[#110724]/95 to-[#0b0319]/95">
      {/* Top Cockpit Header: Live Timer Digital Readout + Status Badges + Controls */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
        {/* Left: Prominent Live Digital Clock */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-[4px] font-mono font-black flex items-baseline gap-1 border shadow-inner ${
            gameState.status === 'ACTIVE'
              ? currentSec <= 5
                ? 'bg-rose-950/80 text-rose-300 border-rose-500 shadow-rose-950/50 animate-pulse'
                : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 shadow-emerald-950/40'
              : gameState.status === 'LOCKED'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                : gameState.status === 'REVEAL'
                  ? 'bg-purple-950/80 text-purple-300 border-purple-500/50'
                  : 'bg-white/5 text-white/80 border-white/15'
          }`}>
            <span className="text-2xl sm:text-3xl tracking-tight">
              {String(currentSec).padStart(2, '0')}
            </span>
            <span className="text-xs text-white/50 font-normal">/{totalLimit}s</span>
          </div>

          <div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className={`text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-[2px] uppercase tracking-wider border ${
                gameState.status === 'ACTIVE'
                  ? isPaused
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : currentSec <= 5
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500 animate-bounce'
                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                  : gameState.status === 'LOCKED'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : gameState.status === 'REVEAL'
                      ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                      : 'bg-white/5 text-white/60 border-white/10'
              }`}>
                {gameState.status === 'ACTIVE'
                  ? isPaused ? '⏸ TẠM DỪNG' : '⚡ ĐANG ĐẾM NGƯỢC'
                  : gameState.status === 'LOCKED'
                    ? '🔒 ĐÃ KHÓA'
                    : gameState.status === 'REVEAL'
                      ? '🏆 ĐÃ CÔNG BỐ'
                      : '⏳ CHẾ ĐỘ CHỜ'}
              </span>

              {/* Vote Count Telemetry Pill */}
              {totalAudience > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-sky-950/70 text-sky-200 border border-sky-500/30 flex items-center gap-1">
                  <Users className="w-3 h-3 text-sky-400" />
                  <span>Đã nộp: <strong className="text-white font-bold">{totalVotes}/{totalAudience}</strong> ({votePercent}%)</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Sound Toggle + Secondary Time Tools Toggle */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-1.5 rounded-[2px] border text-xs transition flex items-center gap-1 cursor-pointer ${
              soundEnabled
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
            }`}
            title={soundEnabled ? 'Tắt âm thanh đếm nhịp' : 'Bật âm thanh đếm nhịp'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Secondary Time Tools Popover Switch */}
          <button
            type="button"
            onClick={() => setIsTimeSettingsOpen(!isTimeSettingsOpen)}
            className={`px-2.5 py-1 rounded-[2px] border text-xs font-mono font-semibold transition flex items-center gap-1.5 cursor-pointer ${
              isTimeSettingsOpen
                ? 'bg-[#F7CAC9] text-[#190839] border-[#F7CAC9] font-bold shadow-sm'
                : 'bg-white/5 text-white/70 border-white/15 hover:text-white hover:bg-white/10'
            }`}
            title="Mở bảng bù giờ / đổi mốc thời gian phụ"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Chỉnh Giờ</span>
            {isTimeSettingsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* High-visibility Linear Progress Bar */}
      <div className="w-full h-1.5 bg-black/40 rounded-[2px] overflow-hidden border border-white/5">
        <div
          className={`h-full transition-all duration-150 ${
            currentSec <= 3
              ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]'
              : currentSec <= 5
                ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
                : 'bg-gradient-to-r from-emerald-500 to-teal-400'
          }`}
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* ================= DYNAMIC MASTER HERO CALL-TO-ACTION (1-CLICK & SPACEBAR) ================= */}
      <div className="pt-0.5">
        {gameState.status === 'STANDBY' && (
          <button
            type="button"
            onClick={handleMasterCycleAction}
            className="w-full py-3.5 px-4 rounded-[4px] bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-500 hover:from-emerald-500 hover:to-teal-400 text-white font-mono font-bold text-sm tracking-wide flex items-center justify-between shadow-lg shadow-emerald-950/60 border border-emerald-400/40 transition-all hover:scale-[1.008] active:scale-[0.99] cursor-pointer group"
            title="Bắt đầu tính giờ và mở cổng bình chọn cho khán giả (Phím tắt: SPACE hoặc 1 / A)"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[3px] bg-white/20 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
                <Play className="w-4 h-4 fill-current text-white ml-0.5" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] text-emerald-200 uppercase font-mono tracking-widest font-bold">Bước 1 tiếp theo:</span>
                <span className="text-sm font-black text-white uppercase tracking-tight">1. BẮT ĐẦU CÂU HỎI & TÍNH GIỜ</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/35 border border-white/20 px-2.5 py-1 rounded-[3px] text-xs text-white">
              <span className="hidden sm:inline text-white/80">Nhấn</span>
              <kbd className="font-mono font-black bg-white/25 px-1.5 py-0.5 rounded-[2px] text-emerald-200">SPACE</kbd>
              <span className="hidden sm:inline text-white/80">hoặc Click</span>
            </div>
          </button>
        )}

        {gameState.status === 'ACTIVE' && (
          <div className="flex items-stretch gap-2">
            <button
              type="button"
              onClick={handleMasterCycleAction}
              className="flex-1 py-3 px-3 sm:px-4 rounded-[4px] bg-gradient-to-r from-amber-600 via-orange-600 to-amber-500 hover:from-amber-500 hover:to-orange-400 text-white font-mono font-bold text-sm tracking-wide flex items-center justify-between shadow-lg shadow-amber-950/60 border border-amber-400/40 transition-all hover:scale-[1.008] active:scale-[0.99] cursor-pointer group"
              title="Khóa nhận đáp án khán giả tức thì (Phím tắt: SPACE hoặc 3 / L)"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[3px] bg-white/20 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
                  <Lock className="w-4 h-4 text-white" />
                </div>
                <div className="text-left">
                  <span className="block text-[10px] text-amber-200 uppercase font-mono tracking-widest font-bold">Bước 2 tiếp theo:</span>
                  <span className="text-xs sm:text-sm font-black text-white uppercase tracking-tight">2. KHÓA BÌNH CHỌN NGAY</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 bg-black/35 border border-white/20 px-2 sm:px-2.5 py-1 rounded-[3px] text-xs text-white">
                <span className="hidden sm:inline text-white/80">Nhấn</span>
                <kbd className="font-mono font-black bg-white/25 px-1.5 py-0.5 rounded-[2px] text-amber-200">SPACE</kbd>
              </div>
            </button>

            <button
              type="button"
              onClick={handleTogglePause}
              className={`px-3 sm:px-4 py-3 rounded-[4px] font-mono font-bold text-xs uppercase flex items-center gap-2 transition cursor-pointer border shadow-md ${
                isPaused
                  ? 'bg-emerald-500 text-slate-950 border-emerald-300 font-black animate-pulse'
                  : 'bg-white/10 hover:bg-white/20 text-white border-white/20'
              }`}
              title="Tạm dừng hoặc Tiếp tục đồng hồ (Phím tắt: 2 hoặc P)"
            >
              {isPaused ? <Play className="w-4 h-4 fill-current text-slate-950" /> : <Pause className="w-4 h-4 fill-current text-white" />}
              <span className="hidden sm:inline">{isPaused ? 'Tiếp tục' : 'Tạm dừng'}</span>
              <kbd className="text-[10px] bg-black/30 px-1.5 py-0.5 rounded-[2px] border border-white/20">2 / P</kbd>
            </button>
          </div>
        )}

        {gameState.status === 'LOCKED' && (
          <button
            type="button"
            onClick={handleMasterCycleAction}
            className="w-full py-3.5 px-4 rounded-[4px] bg-gradient-to-r from-pink-600 via-purple-600 to-rose-600 hover:from-pink-500 hover:to-purple-500 text-white font-mono font-bold text-sm tracking-wide flex items-center justify-between shadow-lg shadow-pink-950/60 border border-pink-400/40 transition-all hover:scale-[1.008] active:scale-[0.99] cursor-pointer group"
            title="Công bố đáp án chính xác và cộng điểm cho khán giả (Phím tắt: SPACE hoặc 4 / R)"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[3px] bg-white/20 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
                <Eye className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] text-pink-200 uppercase font-mono tracking-widest font-bold">Bước 3 tiếp theo:</span>
                <span className="text-sm font-black text-white uppercase tracking-tight">3. CÔNG BỐ ĐÁP ÁN & ĐIỂM SỐ</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/35 border border-white/20 px-2.5 py-1 rounded-[3px] text-xs text-white">
              <span className="hidden sm:inline text-white/80">Nhấn</span>
              <kbd className="font-mono font-black bg-white/25 px-1.5 py-0.5 rounded-[2px] text-pink-200">SPACE</kbd>
              <span className="hidden sm:inline text-white/80">hoặc Click</span>
            </div>
          </button>
        )}

        {gameState.status === 'REVEAL' && (
          <button
            type="button"
            onClick={handleMasterCycleAction}
            className="w-full py-3.5 px-4 rounded-[4px] bg-gradient-to-r from-sky-600 via-blue-600 to-cyan-600 hover:from-sky-500 hover:to-blue-500 text-white font-mono font-bold text-sm tracking-wide flex items-center justify-between shadow-lg shadow-sky-950/60 border border-sky-400/40 transition-all hover:scale-[1.008] active:scale-[0.99] cursor-pointer group"
            title="Chuyển sang câu hỏi kế tiếp trong ngân hàng đề (Phím tắt: SPACE hoặc → / N)"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-[3px] bg-white/20 flex items-center justify-center group-hover:scale-110 transition shadow-inner">
                <SkipForward className="w-4 h-4 text-white" />
              </div>
              <div className="text-left">
                <span className="block text-[10px] text-sky-200 uppercase font-mono tracking-widest font-bold">Bước 4 tiếp theo:</span>
                <span className="text-sm font-black text-white uppercase tracking-tight">4. SANG CÂU HỎI KẾ TIẾP</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 bg-black/35 border border-white/20 px-2.5 py-1 rounded-[3px] text-xs text-white">
              <span className="hidden sm:inline text-white/80">Nhấn</span>
              <kbd className="font-mono font-black bg-white/25 px-1.5 py-0.5 rounded-[2px] text-sky-200">SPACE</kbd>
              <span className="hidden sm:inline text-white/80">hoặc [→]</span>
            </div>
          </button>
        )}
      </div>

      {/* ================= MASTER 4-STEP ACTION WORKFLOW STEPPER ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
        {/* Step 1: Start / Pause */}
        <button
          type="button"
          onClick={() => {
            if (gameState.status === 'ACTIVE') {
              handleTogglePause();
            } else {
              vibrateImpact();
              onStartQuestion();
            }
          }}
          className={`py-3 px-2 rounded-[3px] text-xs font-bold font-mono uppercase tracking-wide flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-md cursor-pointer ${
            gameState.status === 'ACTIVE'
              ? isPaused
                ? 'bg-amber-400 text-slate-950 font-black ring-2 ring-amber-300'
                : 'bg-emerald-400 text-slate-950 ring-2 ring-emerald-300 font-black'
              : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold'
          }`}
          title="Bắt đầu câu hỏi hoặc Tạm dừng đếm ngược (Phím tắt: A / Space hoặc P)"
        >
          {gameState.status === 'ACTIVE' ? (
            isPaused ? (
              <>
                <div className="flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /><span>Tiếp tục</span></div>
                <kbd className="text-[9px] font-mono px-1 rounded-[2px] bg-slate-950/20 text-slate-950">P</kbd>
              </>
            ) : (
              <>
                <div className="flex items-center gap-1.5"><Pause className="w-4 h-4 fill-current" /><span>Tạm dừng</span></div>
                <kbd className="text-[9px] font-mono px-1 rounded-[2px] bg-slate-950/20 text-slate-950">P</kbd>
              </>
            )
          ) : (
            <>
              <div className="flex items-center gap-1.5"><Play className="w-4 h-4 fill-current" /><span>1. Bắt Đầu</span></div>
              <kbd className="text-[9px] font-mono px-1 rounded-[2px] bg-white/15 text-white">Space / A</kbd>
            </>
          )}
        </button>

        {/* Step 2: Lock Voting */}
        <button
          type="button"
          onClick={() => {
            vibrateWarning();
            onLockVoting();
          }}
          className={`py-3 px-2 rounded-[3px] text-xs font-bold font-mono uppercase tracking-wide flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            gameState.status === 'LOCKED'
              ? 'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-amber-300'
              : 'fluent-box-nested border border-amber-500/40 text-amber-300 hover:bg-amber-400/20 font-bold'
          }`}
          title="Khóa nhận đáp án (Phím tắt: L)"
        >
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4" />
            <span>2. Khóa Vote</span>
          </div>
          <kbd className={`text-[9px] font-mono px-1 rounded-[2px] border ${gameState.status === 'LOCKED' ? 'bg-slate-950/20 text-slate-950 border-slate-950/30' : 'bg-white/10 text-amber-200 border-amber-400/30'}`}>L</kbd>
        </button>

        {/* Step 3: Reveal Answer */}
        <button
          type="button"
          onClick={() => {
            vibrateSuccess();
            if (onRevealResults) onRevealResults();
          }}
          className={`py-3 px-2 rounded-[3px] text-xs font-bold font-mono uppercase tracking-wide flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
            gameState.status === 'REVEAL'
              ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white ring-2 ring-pink-300 font-black shadow-lg'
              : 'fluent-box-nested border border-pink-500/30 hover:border-pink-400/50 text-white hover:text-pink-300 font-bold'
          }`}
          title="Công bố đáp án (Phím tắt: R)"
        >
          <div className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            <span>3. Công Bố</span>
          </div>
          <kbd className="text-[9px] font-mono px-1 rounded-[2px] bg-white/10 text-white border border-white/20">R</kbd>
        </button>

        {/* Step 4: Next Question & Quick Standby/Reset Button */}
        <div className="flex items-stretch gap-1">
          {onNavigateNext ? (
            <button
              type="button"
              onClick={() => {
                vibrateImpact();
                onNavigateNext();
              }}
              className="flex-1 py-3 px-2 rounded-[3px] text-xs font-bold font-mono uppercase tracking-wide flex flex-col items-center justify-center gap-1 transition active:scale-95 bg-sky-600 hover:bg-sky-500 text-white shadow-md shadow-sky-900/40 cursor-pointer"
              title="Chuyển sang câu hỏi kế tiếp (Phím tắt: → hoặc N)"
            >
              <div className="flex items-center gap-1.5">
                <SkipForward className="w-4 h-4" />
                <span>4. Câu Tiếp</span>
              </div>
              <kbd className="text-[9px] font-mono px-1 rounded-[2px] bg-white/20 text-white border border-white/30">→ / N</kbd>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                handleResetTimer();
                if (onReturnToStandby) onReturnToStandby();
              }}
              className={`flex-1 py-3 px-2 rounded-[3px] text-xs font-bold font-mono uppercase tracking-wide flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer ${
                gameState.status === 'STANDBY'
                  ? 'bg-white/20 text-white border border-white/40 font-black shadow'
                  : 'fluent-box-nested border border-white/10 text-white/70 hover:text-white font-bold'
              }`}
              title="Chế độ chờ và Đặt lại (Phím tắt: S)"
            >
              <div className="flex items-center gap-1.5">
                <RotateCcw className="w-4 h-4" />
                <span>4. Chờ / Reset</span>
              </div>
              <kbd className="text-[9px] font-mono px-1 rounded-[2px] bg-white/10 text-white border border-white/20">S</kbd>
            </button>
          )}

          {/* Quick Standby / Reset button on current question */}
          {onNavigateNext && (
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                handleResetTimer();
                if (onReturnToStandby) onReturnToStandby();
              }}
              className={`px-2 py-3 rounded-[3px] text-xs font-mono font-bold uppercase flex flex-col items-center justify-center gap-1 transition active:scale-95 border cursor-pointer ${
                gameState.status === 'STANDBY'
                  ? 'bg-white/15 text-white border-white/30'
                  : 'bg-black/30 hover:bg-white/10 text-white/60 hover:text-white border-white/10'
              }`}
              title="Đặt lại câu hỏi này về trạng thái Chờ (Standby) & đưa đồng hồ về ban đầu (Phím tắt: S)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <kbd className="text-[9px] font-mono px-1 rounded-[2px] bg-white/10 text-white">S</kbd>
            </button>
          )}
        </div>
      </div>

      {/* ================= COMPACT HOTKEY QUICK HINT STRIP ================= */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-[3px] bg-black/40 border border-white/10 text-[10px] sm:text-[11px] font-mono text-white/70">
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-wrap">
          <span className="text-amber-400 font-bold flex items-center gap-1">⚡ Phím tắt nhanh:</span>
          <span><kbd className="px-1 py-0.5 rounded-[2px] bg-white/15 text-white font-bold border border-white/20">Space</kbd> Tiến bước tiếp</span>
          <span><kbd className="px-1 py-0.5 rounded-[2px] bg-white/15 text-white font-bold border border-white/20">2 / P</kbd> Tạm dừng</span>
          <span><kbd className="px-1 py-0.5 rounded-[2px] bg-white/15 text-white font-bold border border-white/20">3 / L</kbd> Khóa vote</span>
          <span><kbd className="px-1 py-0.5 rounded-[2px] bg-white/15 text-white font-bold border border-white/20">4 / R</kbd> Đáp án</span>
          <span><kbd className="px-1 py-0.5 rounded-[2px] bg-white/15 text-white font-bold border border-white/20">← / →</kbd> Đổi câu</span>
        </div>
        {onOpenShortcuts && (
          <button
            type="button"
            onClick={onOpenShortcuts}
            className="text-sky-300 hover:text-white hover:underline cursor-pointer text-[10px] shrink-0 font-medium"
          >
            Tất cả phím tắt ⚙️
          </button>
        )}
      </div>

      {/* ================= COLLAPSIBLE SECONDARY TIME CONTROLS (TUCKED AWAY) ================= */}
      {isTimeSettingsOpen && (
        <div className="pt-3 border-t border-white/10 space-y-2.5 animate-fadeIn text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Presets */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/50 text-[10px] uppercase">Mốc chuẩn:</span>
              {[15, 20, 30, 45].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleSelectPreset(sec)}
                  className={`px-2 py-0.5 rounded-[2px] border transition cursor-pointer ${
                    totalLimit === sec
                      ? 'bg-amber-400 text-slate-950 font-bold border-amber-300'
                      : 'fluent-box-nested text-white/70 hover:text-white border-white/10'
                  }`}
                >
                  {sec}s
                </button>
              ))}
            </div>

            {/* Bù giờ */}
            <div className="flex items-center gap-1">
              <span className="text-white/50 text-[10px] uppercase">Bù giờ:</span>
              <button
                type="button"
                onClick={() => handleAdjustTime(-5)}
                className="px-1.5 py-0.5 rounded-[2px] fluent-box-nested text-white/70 hover:text-white border border-white/10 cursor-pointer"
                title="Giảm 5 giây"
              >
                -5s
              </button>
              <button
                type="button"
                onClick={() => handleAdjustTime(5)}
                className="px-1.5 py-0.5 rounded-[2px] fluent-box-nested text-amber-300 hover:text-amber-200 border border-amber-500/30 cursor-pointer"
                title="Cộng 5 giây"
              >
                +5s
              </button>
              <button
                type="button"
                onClick={() => handleAdjustTime(10)}
                className="px-1.5 py-0.5 rounded-[2px] fluent-box-nested text-emerald-300 hover:text-emerald-200 border border-emerald-500/30 cursor-pointer"
                title="Cộng 10 giây"
              >
                +10s
              </button>
            </div>

            {/* Custom Input */}
            <form onSubmit={handleApplyCustomTime} className="flex items-center gap-1">
              <input
                type="number"
                min={3}
                max={180}
                value={customInputTime}
                onChange={(e) => setCustomInputTime(e.target.value)}
                className="w-12 bg-black/40 border border-white/20 rounded-[2px] px-1.5 py-0.5 text-xs text-white text-center outline-none"
              />
              <span className="text-white/40 text-[10px]">s</span>
              <button
                type="submit"
                className="px-2 py-0.5 bg-amber-400/20 text-amber-300 border border-amber-400/30 rounded-[2px] text-[10px] font-bold cursor-pointer"
              >
                Đặt
              </button>
            </form>
          </div>

          {/* Quick Wait Timer Setup */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/5 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Timer className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-white/60">Đếm ngược chờ câu tiếp:</span>
              {[5, 10, 15, 30].map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => handleStartWaitTimer(sec)}
                  className="px-2 py-0.5 rounded-[2px] bg-sky-950/60 hover:bg-sky-900 border border-sky-500/30 text-sky-200 cursor-pointer"
                >
                  {sec}s
                </button>
              ))}
            </div>

            {Boolean((gameState.next_question_wait_limit || 0) > 0) && (
              <button
                type="button"
                onClick={handleCancelWaitTimer}
                className="px-2 py-0.5 bg-rose-950/60 text-rose-300 border border-rose-500/40 rounded-[2px] text-[10px] font-bold cursor-pointer"
              >
                ✕ Hủy thời gian chờ
              </button>
            )}

            {/* Return to Standby quick link */}
            {onReturnToStandby && (
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  handleResetTimer();
                  onReturnToStandby();
                }}
                className="text-[10px] text-white/50 hover:text-white underline cursor-pointer"
              >
                Đặt lại về Chế Độ Chờ (Reset)
              </button>
            )}
          </div>
        </div>
      )}

      {/* 10-Second Elimination Phasing Engine (for Elimination 6 Questions in Round 3) */}
      {isEliminationRound && (
        <div className="p-2.5 fluent-box-nested border border-amber-500/30 rounded-[2px] space-y-2 relative z-10 text-xs font-mono">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-amber-300 font-bold">
              <Zap className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Tiến Trình Loại Trừ 10s (6 Phương Án):</span>
            </div>
            <span className="text-[10px] text-amber-200/80">
              Đã loại: <strong>{gameState.eliminated_options?.length || 0}/4</strong>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEliminateRandom2}
              className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-rose-500 text-white rounded-[2px] font-bold flex items-center gap-1 shadow cursor-pointer text-xs"
            >
              <Zap className="w-3 h-3" /> ⚡ Loại trừ 2 phương án sai
            </button>

            <button
              type="button"
              onClick={onToggleAutoEliminate}
              className={`px-2.5 py-1.5 rounded-[2px] border transition flex items-center gap-1 cursor-pointer text-xs ${
                autoEliminateEvery10s
                  ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-bold'
                  : 'fluent-box-nested border-white/10 text-white/60'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{autoEliminateEvery10s ? 'Tự động 10s: BẬT' : 'Tự động 10s: TẮT'}</span>
            </button>

            {(gameState.eliminated_options?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => syncService.updateGameState({ eliminated_options: [] })}
                className="text-[10px] text-white/60 hover:text-white underline cursor-pointer"
              >
                Khôi phục lại
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
