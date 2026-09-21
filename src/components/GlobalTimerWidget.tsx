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
  XCircle,
  Timer,
  Eye
} from 'lucide-react';

interface GlobalTimerWidgetProps {
  gameState: GameState;
  onStartQuestion: () => void;
  onLockVoting: () => void;
  onRevealResults?: () => void;
  onReturnToStandby?: () => void;
  onEliminateRandom2: () => void;
  autoEliminateEvery10s: boolean;
  onToggleAutoEliminate: () => void;
  onTriggerHudToast?: (keyLabel: string, actionDesc: string) => void;
}

export const GlobalTimerWidget: React.FC<GlobalTimerWidgetProps> = ({
  gameState,
  onStartQuestion,
  onLockVoting,
  onRevealResults,
  onReturnToStandby,
  onEliminateRandom2,
  autoEliminateEvery10s,
  onToggleAutoEliminate,
  onTriggerHudToast
}) => {
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [customInputTime, setCustomInputTime] = useState<string>(String(gameState.time_limit || 20));
  const [isPaused, setIsPaused] = useState(false);
  const [pausedRemaining, setPausedRemaining] = useState<number | null>(null);

  // Time remaining computed in real-time
  const [timeRemaining, setTimeRemaining] = useState<number>(gameState.time_limit || 20);

  // Elimination milestones tracker
  const eliminatedMilestonesRef = useRef<Set<number>>(new Set());
  const lastTickTimeRef = useRef<number>(0);

  const [waitTimerInput, setWaitTimerInput] = useState<string>('10');
  const [waitTimerMessage, setWaitTimerMessage] = useState<string>('Chuẩn bị cho câu hỏi tiếp theo');

  const handleStartWaitTimer = (sec: number) => {
    vibrateImpact();
    soundFx.playClick();
    syncService.updateGameState({
      next_question_wait_limit: sec,
      next_question_wait_start: syncService.getSynchronizedNow(),
      next_question_wait_message: waitTimerMessage || 'Chuẩn bị cho câu hỏi tiếp theo'
    });
    if (onTriggerHudToast) {
      onTriggerHudToast('WAIT TIMER', `Đã kích hoạt đếm ngược chờ ${sec}s cho khán giả`);
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
      const wholeSec = Math.ceil(remaining);
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
        (gameState.round_type === 'ELIMINATION_6' || gameState.options && Object.keys(gameState.options).length > 4)
      ) {
        const elapsed = (gameState.time_limit || 20) - remaining;
        const milestone10 = Math.floor(elapsed / 10);
        if (milestone10 > 0 && !eliminatedMilestonesRef.current.has(milestone10) && elapsed < (gameState.time_limit || 20) - 2) {
          eliminatedMilestonesRef.current.add(milestone10);
          onEliminateRandom2();
          if (onTriggerHudToast) {
            onTriggerHudToast('AUTO 10S', `Mốc ${milestone10 * 10}s: Tự động loại trừ 2 phương án sai!`);
          }
        }
      }

      // Auto lock when timer hits 0
      if (remaining <= 0) {
        clearInterval(interval);
        soundFx.playLock();
        onLockVoting();
        const now = syncService.getSynchronizedNow();
        const elapsed = (now - gameState.server_start_time) / 1000;
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
    
    // If currently running, recalculate server_start_time to keep elapsed or reset
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
      onTriggerHudToast(`${seconds}s`, `Đã chọn mốc thời gian: ${seconds} giây`);
    }
  };

  // Adjust time by offset (+5s, -5s)
  const handleAdjustTime = (delta: number) => {
    vibrateTap();
    soundFx.playClick();
    const currentLimit = gameState.time_limit || 20;
    const newLimit = Math.max(5, Math.min(120, currentLimit + delta));
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
      // Pause
      setIsPaused(true);
      setPausedRemaining(timeRemaining);
      if (onTriggerHudToast) {
        onTriggerHudToast('PAUSE', `Tạm dừng đồng hồ ở ${Math.ceil(timeRemaining)}s`);
      }
    } else if (isPaused) {
      // Resume
      setIsPaused(false);
      const remainingToRestore = pausedRemaining || timeRemaining;
      const newServerStartTime = syncService.getSynchronizedNow() - ((gameState.time_limit - remainingToRestore) * 1000);
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
      server_start_time: 0
    });
    setTimeRemaining(gameState.time_limit || 20);
    if (onTriggerHudToast) {
      onTriggerHudToast('RESET', 'Đặt lại đồng hồ');
    }
  };

  // Compute progress ratio (0 to 100)
  const totalLimit = gameState.time_limit || 20;
  const currentSec = Math.max(0, Math.ceil(timeRemaining));
  const progressPercent = Math.min(100, Math.max(0, (timeRemaining / totalLimit) * 100));

  // Determine elimination phase for 6-option elimination round
  const isEliminationRound = gameState.round_type === 'ELIMINATION_6' || (gameState.options && Object.keys(gameState.options).length === 6);
  const elapsedSec = Math.max(0, totalLimit - timeRemaining);
  const nextEliminationIn = isEliminationRound ? Math.max(0, Math.ceil(10 - (elapsedSec % 10))) : 0;
  const currentPhase = elapsedSec < 10 ? 1 : elapsedSec < 20 ? 2 : 3;

  return (
    <section className="fluent-box border border-amber-500/40 rounded-[2px] p-3 sm:p-4 md:p-6 shadow-2xl space-y-5 relative overflow-hidden">
      {/* Background Energy Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 backdrop-blur-md rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/10 backdrop-blur-md rounded-full blur-3xl pointer-events-none" />

      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-amber-500/30 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[2px] bg-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/30 animate-pulse">
            <Flame className="w-6 h-6 fill-current" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xs sm:text-sm font-black uppercase font-mono tracking-wider text-amber-300">
                GLOBAL COUNTDOWN TIMER
              </h2>
              <span className="px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold fluent-box-nested text-amber-200 border border-amber-500/40 uppercase">
                MASTER CONTROLS
              </span>
            </div>
            <p className="text-[11px] text-white/60 mt-0.5">
              Chuẩn 4 mốc (10s - 20s - 30s - 40s) & cơ chế loại trừ tự động mỗi 10 giây
            </p>
          </div>
        </div>

        {/* Audio Mute & State Badges */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-[2px] text-xs font-mono border transition flex items-center gap-1.5 cursor-pointer ${
              soundEnabled
                ? 'bg-amber-400/20 text-amber-300 border-amber-500/50 shadow-sm'
                : 'fluent-box-nested text-white/50 border-white/10 hover:text-white'
            }`}
            title={soundEnabled ? 'Tắt âm thanh đếm nhịp' : 'Bật âm thanh đếm nhịp'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-300" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline text-[10px] font-bold">{soundEnabled ? 'ÂM THANH' : 'MUTE'}</span>
          </button>


          <span
            className={`text-xs font-mono font-bold px-3 py-1.5 rounded-[2px] border uppercase tracking-wider ${
              gameState.status === 'ACTIVE'
                ? isPaused
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                  : currentSec <= 5
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500 animate-bounce'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
                : gameState.status === 'LOCKED'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                : gameState.status === 'REVEAL'
                ? 'bg-pink-500/25 text-pink-200 border-pink-500/50 shadow-sm'
                : 'fluent-box-nested text-white/60 border-white/10'
            }`}
          >
            {gameState.status === 'ACTIVE'
              ? isPaused
                ? '⏸ ĐANG TẠM DỪNG'
                : '⚡ ĐANG ĐẾM NGƯỢC'
              : gameState.status === 'LOCKED'
              ? '🔒 ĐÃ KHÓA'
              : gameState.status === 'REVEAL'
              ? '🏆 ĐÃ CÔNG BỐ'
              : '⏳ CHẾ ĐỘ CHỜ'}
          </span>
        </div>
      </div>

      {/* Main Countdown Display Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center relative z-10">
        {/* Left Side: Big Digital Clock + SVG Progress Gauge (5 cols) */}
        <div className="lg:col-span-5 fluent-box border border-white/10 rounded-[2px] p-4 sm:p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-inner">
          <div className="relative w-40 h-40 sm:w-44 sm:h-44 flex items-center justify-center my-1">
            {/* SVG Circular Ring Gauge */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="7"
                className="text-white/10"
                fill="transparent"
              />
              <circle
                cx="50"
                cy="50"
                r="42"
                stroke="currentColor"
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 42}`}
                strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPercent / 100)}`}
                className={`transition-all duration-200 ${
                  currentSec <= 3
                    ? 'text-rose-500 drop-shadow-[0_0_12px_rgba(244,63,94,0.8)]'
                    : currentSec <= 5
                    ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]'
                    : 'text-gradient-to-r from-amber-400 to-emerald-400 text-amber-400 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                }`}
                fill="transparent"
              />
            </svg>

            {/* Inner Content */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[10px] uppercase font-mono tracking-widest text-amber-400/80 font-bold mb-0.5">
                {gameState.status === 'ACTIVE' ? (isPaused ? 'TẠM DỪNG' : 'CÒN LẠI') : 'MỐC GIỜ'}
              </span>
              <div className="flex items-baseline justify-center">
                <span
                  className={`font-mono font-black tracking-tight ${
                    currentSec < 10 ? 'text-5xl sm:text-6xl' : 'text-4xl sm:text-5xl'
                  } ${
                    currentSec <= 3
                      ? 'text-rose-400 animate-pulse'
                      : currentSec <= 5
                      ? 'text-amber-300'
                      : 'text-white'
                  }`}
                >
                  {String(currentSec).padStart(2, '0')}
                </span>
                <span className="text-base sm:text-lg font-mono font-bold text-amber-400 ml-1">s</span>
              </div>
              <span className="text-[11px] font-mono text-white/50 mt-0.5">
                / {totalLimit}s quy định
              </span>
            </div>
          </div>

          {/* Linear Bar below */}
          <div className="w-full mt-2">
            <div className="w-full h-2 fluent-box-nested rounded-[2px] overflow-hidden p-0.5 border border-white/5">
              <div
                className={`h-full rounded-[2px] transition-all duration-200 ${
                  currentSec <= 3
                    ? 'bg-rose-500'
                    : currentSec <= 5
                    ? 'bg-amber-400'
                    : 'fluent-acrylic-surface'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Right Side: Speed Presets + Action Controls + Elimination Phase (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* 2-Tier Standard Presets */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-amber-300/90 uppercase">
              <span className="flex items-center gap-1.5">
                <Timer className="w-3.5 h-3.5" /> Mốc Thời Gian Tiêu Chuẩn:
              </span>
              <span className="text-white/40">Chọn để áp dụng</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { sec: 20, label: 'Câu 1 & 2', desc: '20 Giây' },
                { sec: 30, label: 'Câu 3 & 4', desc: '30 Giây' }
              ].map(({ sec, label, desc }) => {
                const isSelected = totalLimit === sec;
                return (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleSelectPreset(sec)}
                    className={`p-2.5 rounded-[2px] border text-center transition flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                      isSelected
                        ? 'bg-amber-400 text-slate-950 border-amber-300 font-bold shadow-lg shadow-amber-500/25 scale-[1.02] ring-2 ring-amber-300'
                        : 'fluent-box-nested border-white/10 text-white/80 hover:bg-white/10 hover:border-amber-400/50 hover:text-white'
                    }`}
                  >
                    <span className="text-xs sm:text-sm font-mono font-black">{desc}</span>
                    <span className={`text-[10px] ${isSelected ? 'text-slate-950 font-bold' : 'text-white/60'}`}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Next Question Waiting Timer Setup Panel */}
          <div className="p-3 fluent-box-nested border border-amber-500/30 rounded-[2px] space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-300 animate-pulse" />
                <span className="text-xs font-bold text-amber-200 font-mono uppercase tracking-wider">
                  Đếm ngược thời gian chờ câu tiếp (Hiển thị thanh tiến trình):
                </span>
              </div>
              {Boolean((gameState.next_question_wait_limit || 0) > 0) && (
                <button
                  type="button"
                  onClick={handleCancelWaitTimer}
                  className="px-2 py-0.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-[2px] text-[10px] font-mono font-bold uppercase transition cursor-pointer"
                >
                  ✕ Hủy chờ
                </button>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {[5, 10, 15, 30, 60].map((sec) => (
                  <button
                    key={sec}
                    type="button"
                    onClick={() => handleStartWaitTimer(sec)}
                    className="px-2.5 py-1 fluent-box-nested hover:bg-amber-400/25 border border-amber-400/30 rounded-[2px] text-xs font-mono font-bold text-amber-300 hover:text-amber-200 transition cursor-pointer"
                  >
                    Chờ {sec}s
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={3}
                  max={300}
                  value={waitTimerInput}
                  onChange={(e) => setWaitTimerInput(e.target.value)}
                  className="w-14 fluent-box-nested border border-amber-400/40 focus:border-amber-300 rounded-[2px] px-2 py-1 text-xs text-amber-200 font-mono text-center outline-none"
                  placeholder="Giây"
                />
                <span className="text-[10px] text-amber-300/70 font-mono">s</span>
                <button
                  type="button"
                  onClick={() => handleStartWaitTimer(Number(waitTimerInput) || 10)}
                  className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-[2px] text-xs font-mono font-black uppercase tracking-wide transition shadow-md shadow-amber-400/20 cursor-pointer"
                >
                  🚀 Bật đếm ngược
                </button>
              </div>
            </div>
          </div>

          {/* Quick Fine-Tuning & Custom Duration Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-2 p-2.5 fluent-box-nested border border-white/10 rounded-[2px]">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] uppercase font-mono text-white/50 font-bold mr-1">Bù giờ:</span>
              <button
                type="button"
                onClick={() => handleAdjustTime(-5)}
                className="px-2 sm:px-2.5 py-1 fluent-box-nested hover:bg-white/15 border border-white/10 rounded-[2px] text-xs font-mono text-white/80 hover:text-white transition flex items-center gap-1 cursor-pointer"
                title="Giảm 5 giây"
              >
                <Minus className="w-3 h-3" /> 5s
              </button>
              <button
                type="button"
                onClick={() => handleAdjustTime(5)}
                className="px-2 sm:px-2.5 py-1 fluent-box-nested hover:bg-amber-400/20 border border-amber-400/30 rounded-[2px] text-xs font-mono text-amber-300 transition flex items-center gap-1 font-bold cursor-pointer"
                title="Cộng 5 giây bù giờ"
              >
                <Plus className="w-3 h-3" /> 5s
              </button>
              <button
                type="button"
                onClick={() => handleAdjustTime(10)}
                className="px-2 sm:px-2.5 py-1 fluent-box-nested hover:bg-emerald-400/20 border border-emerald-400/30 rounded-[2px] text-xs font-mono text-emerald-300 transition flex items-center gap-1 font-bold cursor-pointer"
                title="Cộng 10 giây bù giờ"
              >
                <Plus className="w-3 h-3" /> 10s
              </button>
            </div>

            {/* Custom Input Form */}
            <form onSubmit={handleApplyCustomTime} className="flex items-center gap-1">
              <input
                type="number"
                min={3}
                max={180}
                value={customInputTime}
                onChange={(e) => setCustomInputTime(e.target.value)}
                className="w-14 fluent-box-nested border border-white/20 focus:border-amber-400 rounded-[2px] px-2 py-1 text-xs text-white font-mono text-center outline-none"
              />
              <span className="text-[10px] text-white/40 font-mono">s</span>
              <button
                type="submit"
                className="px-2.5 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-500/40 rounded-[2px] text-[10px] font-mono font-bold uppercase transition cursor-pointer"
              >
                Đặt
              </button>
            </form>
          </div>

          {/* Master Controls Unified Trigger Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
            <button
              onClick={() => {
                if (gameState.status === 'ACTIVE') {
                  handleTogglePause();
                } else {
                  vibrateImpact();
                  onStartQuestion();
                }
              }}
              className={`py-3 sm:py-4 px-1.5 sm:px-2 rounded-[2px] text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 shadow-md cursor-pointer ${
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
                  <><Play className="w-4 h-4 fill-current" /><span>Tiếp tục</span><kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-slate-950/20 text-slate-950 border border-slate-950/30">P</kbd></>
                ) : (
                  <><Pause className="w-4 h-4 fill-current" /><span>Tạm dừng</span><kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-slate-950/20 text-slate-950 border border-slate-950/30">P</kbd></>
                )
              ) : (
                <><Play className="w-4 h-4 fill-current" /><span>1. Bắt Đầu</span><kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] bg-white/10 text-white border border-white/20">A / Space</kbd></>
              )}
            </button>
            
            <button
              onClick={() => {
                vibrateWarning();
                onLockVoting();
              }}
              className={`py-3 sm:py-4 px-1.5 sm:px-2 rounded-[2px] text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 cursor-pointer ${
                gameState.status === 'LOCKED'
                  ? 'bg-amber-400 text-slate-950 font-black shadow-lg ring-2 ring-amber-300'
                  : 'fluent-box-nested border border-amber-500/40 text-amber-300 hover:bg-amber-400/20 font-bold'
              }`}
              title="Khóa nhận đáp án (Phím tắt: L)"
            >
              <Lock className="w-4 h-4" />
              <span>2. Khóa Vote</span>
              <kbd className={`text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] border ${gameState.status === 'LOCKED' ? 'bg-slate-950/20 text-slate-950 border-slate-950/30' : 'fluent-box-nested text-current border-current/20'}`}>L</kbd>
            </button>
            
            <button
              onClick={() => {
                vibrateSuccess();
                if (onRevealResults) onRevealResults();
              }}
              className={`py-3 sm:py-4 px-1.5 sm:px-2 rounded-[2px] text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 cursor-pointer ${
                gameState.status === 'REVEAL'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white ring-2 ring-pink-300 font-black shadow-lg'
                  : 'fluent-box-nested border border-white/15 hover:border-pink-400/50 text-white hover:text-pink-300 font-bold'
              }`}
              title="Công bố đáp án (Phím tắt: R)"
            >
              <Eye className="w-4 h-4" />
              <span>3. Công bố</span>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] fluent-box-nested text-current border border-current/20">R</kbd>
            </button>
            
            <button
              onClick={() => {
                vibrateTap();
                handleResetTimer();
                if (onReturnToStandby) onReturnToStandby();
              }}
              className={`py-3 sm:py-4 px-1.5 sm:px-2 rounded-[2px] text-[11px] sm:text-xs font-bold font-mono uppercase tracking-wider flex flex-col items-center justify-center gap-1 sm:gap-1.5 transition active:scale-95 cursor-pointer ${
                gameState.status === 'STANDBY'
                  ? 'bg-white/20 text-white border border-white/40 font-black shadow'
                  : 'fluent-box-nested border border-white/10 text-white/70 hover:text-white hover:border-white/30 font-bold'
              }`}
              title="Chế độ chờ và Đặt lại (Phím tắt: S)"
            >
              <RotateCcw className="w-4 h-4" />
              <span>4. Chế độ Chờ</span>
              <kbd className="text-[9px] font-mono px-1.5 py-0.5 rounded-[2px] fluent-box-nested text-current border border-current/20">S</kbd>
            </button>
          </div>
        </div>
      </div>

      {/* 10-Second Elimination Phasing Engine (for Elimination 6 Questions) */}
      {isEliminationRound && (
        <div className="p-4 fluent-box-nested border border-amber-500/30 rounded-[2px] space-y-3 relative z-10">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="text-xs font-bold text-amber-300 font-mono uppercase">
                Tiến Trình Loại Trừ 10 Giây (6 Phương Án):
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono px-2 py-0.5 fluent-box-nested text-amber-200 rounded-[2px] border border-amber-500/30">
                Đã loại: {gameState.eliminated_options?.length || 0}/4 phương án
              </span>
              {gameState.status === 'ACTIVE' && nextEliminationIn > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 fluent-box-nested text-rose-300 rounded-[2px] border border-rose-500/30 font-bold animate-pulse">
                  ⏱️ Mốc kế tiếp: {nextEliminationIn}s
                </span>
              )}
            </div>
          </div>

          {/* Visual 3-Stage Milestone Track */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div
              className={`p-2.5 rounded-[2px] border transition ${
                currentPhase === 1 && gameState.status === 'ACTIVE'
                  ? 'fluent-box-nested border-amber-400 text-amber-200 ring-1 ring-amber-400/50'
                  : currentPhase > 1
                  ? 'fluent-box-nested border-emerald-500/30 text-emerald-300'
                  : 'fluent-box-nested border-white/10 text-white/40'
              }`}
            >
              <span className="block text-[10px] text-white/50 uppercase">Giai đoạn 1 (0-10s)</span>
              <span className="font-bold text-[11px]">6 Phương Án</span>
            </div>

            <div
              className={`p-2.5 rounded-[2px] border transition ${
                currentPhase === 2 && gameState.status === 'ACTIVE'
                  ? 'fluent-box-nested border-amber-400 text-amber-200 ring-1 ring-amber-400/50 animate-pulse'
                  : currentPhase > 2
                  ? 'fluent-box-nested border-emerald-500/30 text-emerald-300'
                  : 'fluent-box-nested border-white/10 text-white/40'
              }`}
            >
              <span className="block text-[10px] text-white/50 uppercase">Giai đoạn 2 (10-20s)</span>
              <span className="font-bold text-[11px]">Loại 2 câu (Còn 4)</span>
            </div>

            <div
              className={`p-2.5 rounded-[2px] border transition ${
                currentPhase === 3 && gameState.status === 'ACTIVE'
                  ? 'fluent-box-nested border-rose-400 text-rose-200 ring-1 ring-rose-400/50 animate-pulse'
                  : 'fluent-box-nested border-white/10 text-white/40'
              }`}
            >
              <span className="block text-[10px] text-white/50 uppercase">Giai đoạn 3 (20s+)</span>
              <span className="font-bold text-[11px]">Loại tiếp (Còn 2)</span>
            </div>
          </div>

          {/* Action Row for Elimination */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onEliminateRandom2}
              className="px-3.5 py-2 fluent-acrylic-surface hover:from-amber-500 hover:to-rose-500 text-white rounded-[2px] text-xs font-bold font-mono transition shadow-lg flex items-center gap-1.5"
              title="Loại 2 phương án ngẫu nhiên ngay lập tức (Phím tắt: E)"
            >
              <Zap className="w-3.5 h-3.5" /> ⚡ Loại trừ ngay 2 phương án sai <kbd className="px-1 py-0.5 text-[9px] fluent-box-nested rounded-[2px] border border-white/20">E</kbd>
            </button>

            <button
              type="button"
              onClick={onToggleAutoEliminate}
              className={`px-3.5 py-2 rounded-[2px] text-xs font-bold font-mono transition border flex items-center gap-1.5 ${
                autoEliminateEvery10s
                  ? 'fluent-box-nested border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 animate-pulse'
                  : 'fluent-box-nested border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              {autoEliminateEvery10s ? '⏱️ Tự động loại 2 câu / 10s: BẬT' : '⏱️ Tự động loại 2 câu / 10s: TẮT'}
            </button>

            {(gameState.eliminated_options?.length || 0) > 0 && (
              <button
                type="button"
                onClick={() => syncService.updateGameState({ eliminated_options: [] })}
                className="px-3 py-2 fluent-box-nested hover:fluent-box-nested text-white/70 rounded-[2px] text-xs font-mono transition"
              >
                Khôi phục tất cả
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
