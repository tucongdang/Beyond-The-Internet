import React, { useState, useEffect, useMemo } from 'react';
import { 
  Coffee, 
  Clock, 
  Sparkles, 
  Radio, 
  AlertTriangle, 
  ShieldCheck, 
  Flame, 
  QrCode,
  Users,
  Tv
} from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { RotatingSplitBackground } from './RotatingSplitBackground';

interface MatchBreakProjectorOverlayProps {
  gameState: GameState;
  activeCount: number;
  qrDataUrl?: string;
  audienceJoinUrl?: string;
}

export const MatchBreakProjectorOverlay: React.FC<MatchBreakProjectorOverlayProps> = ({
  gameState,
  activeCount,
  qrDataUrl,
  audienceJoinUrl
}) => {
  const matchBreak = gameState.match_break;
  const [now, setNow] = useState<number>(syncService.getSynchronizedNow());

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(syncService.getSynchronizedNow());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Calculate remaining seconds
  const { remainingSeconds, totalSeconds, progressPercent, isFinished, isPaused } = useMemo(() => {
    if (!matchBreak || !matchBreak.active) {
      return { remainingSeconds: 0, totalSeconds: 0, progressPercent: 0, isFinished: true, isPaused: false };
    }

    const total = matchBreak.duration_seconds || 180;

    if (matchBreak.is_paused) {
      const rem = matchBreak.paused_remaining_seconds ?? total;
      const pct = Math.max(0, Math.min(100, (rem / total) * 100));
      return {
        remainingSeconds: rem,
        totalSeconds: total,
        progressPercent: pct,
        isFinished: rem <= 0,
        isPaused: true
      };
    }

    const elapsedMs = Math.max(0, now - (matchBreak.start_time || now));
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const rem = Math.max(0, total - elapsedSec);
    const pct = Math.max(0, Math.min(100, (rem / total) * 100));

    return {
      remainingSeconds: rem,
      totalSeconds: total,
      progressPercent: pct,
      isFinished: rem <= 0,
      isPaused: false
    };
  }, [matchBreak, now]);

  // Audio chimes on last 10s countdown
  useEffect(() => {
    if (!matchBreak?.active || isPaused) return;

    if (remainingSeconds === 10 || remainingSeconds === 5 || remainingSeconds === 3 || remainingSeconds === 2 || remainingSeconds === 1) {
      soundFx.playTing();
    } else if (remainingSeconds === 0) {
      soundFx.playStartRound();
    }
  }, [remainingSeconds, matchBreak?.active, isPaused]);

  if (!matchBreak || !matchBreak.active) return null;

  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const matchLabel = gameState.event_schedule?.match_name || 'BEYOND THE INTERNET 2026';
  const matchSubtitle = gameState.event_schedule?.match_subtitle || 'ĐẤU TRƯỜNG AN TOÀN SỐ VÀ TRÍ TUỆ NHÂN TẠO';

  return (
    <div className="fixed inset-0 z-50 bg-[#0c051a]/95 backdrop-blur-2xl flex flex-col justify-between p-6 sm:p-10 lg:p-14 select-none text-white overflow-hidden animate-fadeIn">
      {/* Rotating Split Background (MBC Movement) */}
      <RotatingSplitBackground durationSeconds={10} darkColor="#190839" lightColor="#F7CAC9" opacity={0.08} isFixed={true} />

      {/* Ambient background glow & grid */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-purple-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-10 left-10 w-[450px] h-[450px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>

      {/* TOP HEADER: Branding, Match Stage, Connection Status */}
      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[2px] bg-gradient-to-br from-amber-500 to-purple-600 p-0.5 shadow-lg shadow-purple-950/60 flex items-center justify-center">
            <div className="w-full h-full bg-[#160b2b] rounded-[1px] flex items-center justify-center">
              <Coffee className="w-6 h-6 text-amber-400 animate-bounce" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-400/40 text-xs font-mono font-black uppercase tracking-widest">
                TẠM DỪNG / NGHỈ GIẢI LAO
              </span>
              <span className="text-white/40 text-xs font-mono">•</span>
              <span className="text-amber-200/90 font-mono font-bold text-xs uppercase tracking-wider">
                {matchLabel}
              </span>
            </div>
            <h2 className="text-sm sm:text-base font-semibold text-white/80 tracking-wide mt-0.5">
              {matchSubtitle}
            </h2>
          </div>
        </div>

        {/* Live Audience Connected Pill */}
        <div className="flex items-center gap-3">
          {isPaused && (
            <span className="px-3 py-1 rounded-[2px] bg-rose-600/30 text-rose-300 border border-rose-500/50 font-mono text-xs font-bold animate-pulse flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              ĐỒNG HỒ ĐANG TẠM DỪNG
            </span>
          )}

          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-[2px] bg-purple-950/50 border border-purple-500/30 font-mono text-xs text-purple-200 shadow-sm backdrop-blur-md">
            <Users className="w-4 h-4 text-purple-400" />
            <span>Khán giả online: <strong className="text-white font-bold">{activeCount}</strong></span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-emerald-950/40 border border-emerald-500/30 font-mono text-xs text-emerald-300">
            <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
            <span>STAGE SYNC</span>
          </div>
        </div>
      </div>

      {/* CENTER STAGE: Giant Countdown Clock & Intermission HUD */}
      <div className="relative z-10 my-auto flex flex-col items-center justify-center text-center space-y-6 max-w-5xl mx-auto w-full">
        {/* Break Title Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-[2px] bg-gradient-to-r from-purple-500/20 via-amber-500/20 to-purple-500/20 border border-amber-400/40 shadow-inner">
          <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
          <span className="text-amber-300 font-mono font-extrabold text-sm sm:text-base uppercase tracking-widest">
            {matchBreak.title || 'TẠM DỪNG GIẢI LAO GIỮA TRẬN'}
          </span>
        </div>

        {/* Subtitle / Advisory Note */}
        {matchBreak.subtitle && (
          <p className="text-sm sm:text-lg text-white/80 max-w-3xl font-medium leading-relaxed">
            {matchBreak.subtitle}
          </p>
        )}

        {/* Giant Digital Countdown Display */}
        <div className="relative flex flex-col items-center justify-center p-8 sm:p-12">
          {/* Animated Background Motion Orbitals around Circular Ring */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            {/* Spinning Outer SVG Dashed Ring */}
            <svg className="w-[340px] h-[340px] sm:w-[480px] sm:h-[480px] animate-spin-slow opacity-40 text-amber-400" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 6" />
            </svg>
            <svg className="w-[380px] h-[380px] sm:w-[540px] sm:h-[540px] animate-spin-slow-reverse opacity-25 text-purple-400 absolute" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="0.4" strokeDasharray="2 10" />
            </svg>

            {/* Expanding Pulse Waves */}
            <div className="w-[300px] h-[300px] sm:w-[420px] sm:h-[420px] rounded-full border border-amber-400/30 animate-countdown-ripple absolute" />
            <div className="w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] rounded-full border border-purple-400/20 animate-countdown-ripple absolute" style={{ animationDelay: '1s' }} />
          </div>

          {/* Circular Glowing Ring */}
          <div className={`relative z-10 flex items-center justify-center rounded-full p-10 sm:p-16 border-4 shadow-2xl transition-all duration-300 backdrop-blur-md ${
            isFinished 
              ? 'border-emerald-400 bg-emerald-950/40 shadow-emerald-500/30' 
              : remainingSeconds <= 10 
              ? 'border-rose-500 bg-rose-950/40 shadow-rose-500/40 animate-pulse' 
              : 'border-amber-400/80 bg-purple-950/40 shadow-purple-950/80'
          }`}>
            <div className="flex flex-col items-center justify-center">
              <span className={`font-mono font-black tracking-tight leading-none text-6xl sm:text-8xl md:text-9xl ${
                isFinished 
                  ? 'text-emerald-300' 
                  : remainingSeconds <= 10 
                  ? 'text-rose-400' 
                  : 'text-amber-300'
              }`}>
                {formattedTime}
              </span>

              <div className="flex items-center gap-2 mt-4 text-xs sm:text-sm font-mono uppercase tracking-widest text-white/60">
                <Clock className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>
                  {isFinished ? 'HẾT GIỜ NGHỈ • CHUẨN BỊ BẮT ĐẦU' : 'THỜI GIAN NGHỈ CÒN LẠI'}
                </span>
              </div>
            </div>
          </div>

          {/* Progress Bar under Timer */}
          <div className="w-full max-w-xl mt-8 space-y-2">
            <div className="w-full h-3 rounded-full bg-white/10 overflow-hidden border border-white/20 p-0.5">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  remainingSeconds <= 10 
                    ? 'bg-rose-500 shadow-md shadow-rose-500' 
                    : 'bg-gradient-to-r from-amber-400 via-purple-400 to-cyan-400'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[11px] font-mono text-white/40">
              <span>ĐÃ NGHỈ: {Math.floor((totalSeconds - remainingSeconds) / 60)}p {(totalSeconds - remainingSeconds) % 60}s</span>
              <span>TỔNG: {Math.floor(totalSeconds / 60)} phút</span>
            </div>
          </div>
        </div>

        {/* Motivational / Standby Message */}
        <div className="p-4 rounded-[2px] bg-purple-950/60 border border-purple-500/30 text-xs sm:text-sm text-purple-200 font-mono flex items-center gap-3">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            Các thí sinh và khán giả vui lòng chuẩn bị sẵn sàng thiết bị để tiếp tục hiệp thi đấu tiếp theo!
          </span>
        </div>
      </div>

      {/* BOTTOM FOOTER: QR Check-in Code & Guide */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4 pt-5 border-t border-white/10">
        <div className="flex items-center gap-4">
          {qrDataUrl && (
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white p-1 rounded-[2px] shadow-lg shrink-0">
              <img src={qrDataUrl} alt="QR Code" className="w-full h-full object-contain" />
            </div>
          )}
          <div className="text-left space-y-0.5">
            <div className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
              <QrCode className="w-3.5 h-3.5" />
              <span>GIAO DIỆN TƯƠNG TÁC KHÁN GIẢ</span>
            </div>
            <p className="text-[11px] text-white/60 font-mono truncate max-w-md">
              {audienceJoinUrl || 'Quét mã QR để bình chọn và cổ vũ thí sinh'}
            </p>
          </div>
        </div>

        <div className="text-right text-[11px] font-mono text-white/40 hidden md:block">
          <span>HỘI TRƯỜNG BEYOND THE INTERNET 2026 • LIVE BROADCAST</span>
        </div>
      </div>
    </div>
  );
};
