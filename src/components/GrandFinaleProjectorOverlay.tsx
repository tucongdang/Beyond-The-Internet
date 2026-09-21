import React, { useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, Award, Sparkles, Flame, Zap, Target, X, Star, Crown, Shield, Heart } from 'lucide-react';
import { GrandFinaleState } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateGrandCelebration } from '../utils/hapticUtils';

interface GrandFinaleProjectorOverlayProps {
  grandFinale: GrandFinaleState | null | undefined;
  onClose?: () => void;
}

export const GrandFinaleProjectorOverlay: React.FC<GrandFinaleProjectorOverlayProps> = ({
  grandFinale,
  onClose
}) => {
  const winner = grandFinale?.winner;
  const runnersUp = grandFinale?.runnersUp || [];
  const runner1 = runnersUp[0];
  const runner2 = runnersUp[1];

  // Continuous celebratory confetti cannons
  useEffect(() => {
    if (!grandFinale?.active) return;

    soundFx.playStartRound();
    vibrateGrandCelebration();

    // 1. Initial grand burst
    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#fbbf24', '#f59e0b', '#d97706', '#ec4899', '#8b5cf6', '#ffffff']
    });

    // 2. Continuous left and right cannons
    const duration = 6 * 1000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 4,
        angle: 60,
        spread: 60,
        origin: { x: 0, y: 0.7 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6']
      });
      confetti({
        particleCount: 4,
        angle: 120,
        spread: 60,
        origin: { x: 1, y: 0.7 },
        colors: ['#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6']
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };
    frame();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && onClose) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [grandFinale?.active, grandFinale?.timestamp]);

  if (!grandFinale || !grandFinale.active || !winner) {
    return null;
  }

  const triggerMoreConfetti = () => {
    soundFx.playReveal(true);
    confetti({
      particleCount: 100,
      spread: 80,
      origin: { y: 0.6 },
      colors: ['#fbbf24', '#f59e0b', '#ec4899', '#8b5cf6']
    });
  };

  return (
    <div
      id="grand-finale-projector-overlay"
      className="fixed inset-0 z-[9999] bg-[#070114] text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none overflow-hidden animate-fadeIn"
    >
      <style>{`
        @keyframes spotlightSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes trophyFloat {
          0%, 100% { transform: translateY(0px) scale(1); filter: drop-shadow(0 15px 30px rgba(251,191,36,0.5)); }
          50% { transform: translateY(-10px) scale(1.03); filter: drop-shadow(0 25px 45px rgba(251,191,36,0.8)); }
        }
        @keyframes auraPulse {
          0%, 100% { opacity: 0.5; transform: scale(0.95); }
          50% { opacity: 0.85; transform: scale(1.05); }
        }
      `}</style>

      {/* Ambient Rotating Spotlight Beams Background */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute -top-[50%] -left-[50%] w-[200%] h-[200%] opacity-20"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, rgba(251,191,36,0.4) 30deg, transparent 60deg, transparent 180deg, rgba(168,85,247,0.4) 210deg, transparent 240deg)',
            animation: 'spotlightSpin 25s linear infinite'
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-amber-500/20 via-purple-600/30 to-pink-500/20 blur-[120px] pointer-events-none"
          style={{ animation: 'auraPulse 4s ease-in-out infinite' }}
        />
      </div>

      {/* Top Header Bar */}
      <header className="relative z-10 flex items-center justify-between w-full shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[2px] bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg border border-amber-300/40">
            <Crown className="w-6 h-6 text-slate-950 fill-current" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase tracking-[0.3em] text-amber-400 font-black">
              GRAND FINALE HONORS CEREMONY
            </div>
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-white/90">
              Beyond The Internet 2026 • Lễ Trao Giải Quán Quân
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={triggerMoreConfetti}
            className="px-3 py-1.5 rounded-[2px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
            title="Thả thêm pháo hoa ăn mừng"
          >
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span className="hidden sm:inline">Thả Pháo Hoa</span>
          </button>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10 transition cursor-pointer"
              title="Đóng màn hình vinh danh (Phím Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </header>

      {/* Main Center Area: Champion Showcase */}
      <main className="relative z-10 flex flex-col items-center justify-center text-center my-auto max-w-4xl mx-auto w-full px-2 py-4">
        {/* Floating 3D Golden Trophy Emblem */}
        <div
          className="relative mb-4 flex items-center justify-center"
          style={{ animation: 'trophyFloat 3s ease-in-out infinite' }}
        >
          <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 p-1 flex items-center justify-center shadow-2xl">
            <div className="w-full h-full rounded-full bg-[#120626] flex items-center justify-center border-2 border-amber-300/60">
              <Trophy className="w-16 h-16 sm:w-20 sm:h-20 text-amber-300 fill-amber-400/40 drop-shadow-[0_4px_16px_rgba(251,191,36,0.9)]" />
            </div>
          </div>
          <div className="absolute -top-3 -right-2">
            <Sparkles className="w-8 h-8 text-yellow-200 animate-spin" />
          </div>
        </div>

        {/* Title & Champion Banner */}
        <div className="space-y-1 sm:space-y-2 mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-400/20 border border-amber-400/40 text-amber-300 font-mono text-xs sm:text-sm font-black tracking-widest uppercase shadow-lg">
            <Star className="w-4 h-4 fill-current text-amber-300" />
            <span>NHÀ VÔ ĐỊCH BEYOND THE INTERNET 2026</span>
            <Star className="w-4 h-4 fill-current text-amber-300" />
          </div>

          <h2 className="text-3xl sm:text-5xl md:text-6xl font-black uppercase tracking-tight bg-gradient-to-r from-yellow-200 via-amber-300 to-yellow-500 bg-clip-text text-transparent drop-shadow-[0_4px_24px_rgba(251,191,36,0.6)]">
            {winner.name}
          </h2>

          <div className="flex items-center justify-center gap-3 text-white/70 font-mono text-sm sm:text-base">
            {winner.mssv && (
              <span className="px-3 py-0.5 rounded-[2px] bg-white/10 border border-white/15">
                MSSV: <strong className="text-white font-bold">{winner.mssv}</strong>
              </span>
            )}
            {winner.teamName && (
              <span className="px-3 py-0.5 rounded-[2px] bg-purple-500/20 border border-purple-400/30 text-purple-200 font-semibold">
                Đội: {winner.teamName}
              </span>
            )}
          </div>
        </div>

        {/* Grand Score Display & Champion Stats */}
        <div className="w-full max-w-2xl bg-black/60 backdrop-blur-md rounded-[4px] border-2 border-amber-400/50 p-4 sm:p-6 shadow-2xl space-y-4">
          <div className="flex items-center justify-center gap-2 pb-3 border-b border-white/15">
            <span className="text-xs sm:text-sm font-mono text-amber-300/80 uppercase tracking-widest font-bold">
              TỔNG ĐIỂM CHUNG CUỘC KỶ LỤC:
            </span>
            <span className="text-3xl sm:text-4xl font-mono font-black text-amber-300 drop-shadow-[0_2px_10px_rgba(251,191,36,0.8)]">
              {winner.totalScore.toLocaleString()}
            </span>
            <span className="text-sm font-mono text-amber-200 font-bold">ĐIỂM</span>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 text-center">
            {/* Accuracy */}
            <div className="p-2.5 rounded-[2px] bg-white/5 border border-white/10">
              <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-emerald-300 font-bold">
                <Target className="w-3.5 h-3.5" />
                <span>Độ Chính Xác</span>
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-white mt-1">
                {typeof winner.accuracyRate === 'number' ? `${Math.round(winner.accuracyRate)}%` : '100%'}
              </div>
            </div>

            {/* Average Latency */}
            <div className="p-2.5 rounded-[2px] bg-white/5 border border-white/10">
              <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-sky-300 font-bold">
                <Zap className="w-3.5 h-3.5" />
                <span>Phản Xạ TB</span>
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-white mt-1">
                {winner.avgLatency ? `${winner.avgLatency.toFixed(2)}s` : '1.85s'}
              </div>
            </div>

            {/* Total Correct */}
            <div className="p-2.5 rounded-[2px] bg-white/5 border border-white/10">
              <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-amber-300 font-bold">
                <Trophy className="w-3.5 h-3.5" />
                <span>Số Câu Đúng</span>
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-white mt-1">
                {winner.correctAnswersCount ?? 'Top 1'}
              </div>
            </div>

            {/* Top Rank Badge */}
            <div className="p-2.5 rounded-[2px] bg-amber-500/10 border border-amber-400/30">
              <div className="flex items-center justify-center gap-1 text-[11px] font-mono text-amber-300 font-bold">
                <Award className="w-3.5 h-3.5" />
                <span>Xếp Hạng</span>
              </div>
              <div className="text-lg sm:text-xl font-mono font-black text-amber-300 mt-1">
                QUÁN QUÂN 🥇
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Bottom Runners-Up Pedestals Bar */}
      {(runner1 || runner2) && (
        <footer className="relative z-10 flex items-center justify-center gap-4 sm:gap-8 pt-2 pb-1 border-t border-white/10 shrink-0">
          {runner1 && (
            <div className="flex items-center gap-2.5 bg-slate-900/60 backdrop-blur-md px-4 py-2 rounded-[2px] border border-slate-400/40">
              <div className="w-7 h-7 rounded-full bg-slate-300 text-slate-950 font-black text-xs flex items-center justify-center font-mono">
                2
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">Á Quân 1 🥈</div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                  {runner1.name}
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-slate-300 ml-2">
                {runner1.totalScore} đ
              </span>
            </div>
          )}

          {runner2 && (
            <div className="flex items-center gap-2.5 bg-amber-950/40 backdrop-blur-md px-4 py-2 rounded-[2px] border border-amber-600/40">
              <div className="w-7 h-7 rounded-full bg-amber-600 text-white font-black text-xs flex items-center justify-center font-mono">
                3
              </div>
              <div className="text-left font-mono">
                <div className="text-[10px] text-amber-300 uppercase tracking-wider font-bold">Á Quân 2 🥉</div>
                <div className="text-xs sm:text-sm font-bold text-white truncate max-w-[150px] sm:max-w-[200px]">
                  {runner2.name}
                </div>
              </div>
              <span className="font-mono text-xs font-bold text-amber-300 ml-2">
                {runner2.totalScore} đ
              </span>
            </div>
          )}
        </footer>
      )}
    </div>
  );
};
