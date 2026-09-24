import React, { useState, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import {
  Clock,
  Calendar,
  MapPin,
  Radio,
  Users,
  Sparkles,
  QrCode,
  Wifi,
  ShieldCheck,
  Megaphone,
  Trophy,
  Activity,
  Zap,
  Award,
  Crown,
  Maximize2
} from 'lucide-react';
import { GameState, QR_PALETTES, QrPaletteId } from '../types';
import { CrossFadeQrCode } from './CrossFadeQrCode';
import { AnnouncerOverlay } from './AnnouncerOverlay';
import { RotatingSplitBackground } from './RotatingSplitBackground';
import { syncService } from '../services/syncService';

interface ProjectorWaitingRoomProps {
  gameState: GameState;
  activeCount: number;
  qrDataUrl?: string;
  audienceJoinUrl?: string;
  isPanic?: boolean;
}

export const ProjectorWaitingRoom: React.FC<ProjectorWaitingRoomProps> = ({
  gameState,
  activeCount,
  qrDataUrl: parentQrDataUrl,
  audienceJoinUrl: parentAudienceJoinUrl,
  isPanic = false
}) => {
  const schedule = gameState.event_schedule;
  const scheduledTime = schedule?.scheduled_start_time || Date.now() + 3600000;
  const isConcluded = Boolean(schedule?.enabled && schedule.status === 'CONCLUDED');
  const isPanicMode = isPanic || Boolean(gameState.panic_mode);

  const [currentTime, setCurrentTime] = useState<number>(Date.now());
  const [internalQrDataUrl, setInternalQrDataUrl] = useState<string>('');
  const [internalAudienceUrl, setInternalAudienceUrl] = useState<string>('');
  const [currentPing, setCurrentPing] = useState<{ latency: number; quality: string }>({
    latency: 18,
    quality: 'EXCELLENT'
  });

  // Second-by-second countdown clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(syncService.getSynchronizedNow());
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // Generate QR locally to guarantee it is NEVER empty
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let audienceUrl = parentAudienceJoinUrl;
      if (!audienceUrl) {
        audienceUrl = window.location.origin + window.location.pathname;
        if (audienceUrl.includes('ais-dev-')) {
          audienceUrl = audienceUrl.replace('ais-dev-', 'ais-pre-');
        }
      }
      setInternalAudienceUrl(audienceUrl);

      const activePaletteId = (gameState.qr_color_palette as QrPaletteId) || 'purple_gold';
      const palette = QR_PALETTES[activePaletteId] || QR_PALETTES.purple_gold;
      const isTransparent = Boolean(gameState.qr_transparent_bg);
      const targetQrUrl = audienceUrl + (audienceUrl.includes('?') ? '&' : '?') + 'src=qr';
      
      QRCode.toDataURL(targetQrUrl, { 
        width: 480, 
        margin: 2, 
        color: { 
          dark: palette.dark, 
          light: isTransparent ? '#00000000' : palette.light 
        },
        errorCorrectionLevel: 'H'
      })
        .then(url => setInternalQrDataUrl(url))
        .catch(err => console.error('ProjectorWaitingRoom QR generation error:', err));
    }
  }, [gameState.qr_color_palette, gameState.qr_transparent_bg, parentAudienceJoinUrl]);

  const activeQrDataUrl = parentQrDataUrl || internalQrDataUrl;
  const audienceJoinUrl = parentAudienceJoinUrl || internalAudienceUrl;

  // Subscribe to real-time ping
  useEffect(() => {
    const unsubscribe = syncService.subscribeToPing((info) => {
      setCurrentPing({
        latency: info.latencyMs,
        quality: info.quality
      });
    });
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const diffMs = Math.max(0, scheduledTime - currentTime);
  const isTimeReached = currentTime >= scheduledTime;

  const matchBreak = gameState.match_break;
  const isBreakActive = Boolean(matchBreak?.active);

  const breakCountdown = useMemo(() => {
    if (!isBreakActive || !matchBreak) {
      return { mins: 0, secs: 0, totalSecs: 0, isPaused: false };
    }
    const total = matchBreak.duration_seconds || 0;
    if (total <= 0) {
      return { mins: 0, secs: 0, totalSecs: 0, isPaused: false };
    }

    if (matchBreak.is_paused) {
      const rem = Math.max(0, matchBreak.paused_remaining_seconds ?? total);
      return {
        mins: Math.floor(rem / 60),
        secs: rem % 60,
        totalSecs: rem,
        isPaused: true
      };
    }

    const elapsedMs = Math.max(0, currentTime - (matchBreak.start_time || currentTime));
    const elapsedSec = Math.floor(elapsedMs / 1000);
    const rem = Math.max(0, total - elapsedSec);

    return {
      mins: Math.floor(rem / 60),
      secs: rem % 60,
      totalSecs: rem,
      isPaused: false
    };
  }, [isBreakActive, matchBreak, currentTime]);

  const countdown = useMemo(() => {
    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    }
    const totalSeconds = Math.floor(diffMs / 1000);
    const days = Math.floor(totalSeconds / (3600 * 24));
    const hours = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
  }, [diffMs]);

  const formattedScheduledDate = useMemo(() => {
    try {
      const d = new Date(scheduledTime);
      return {
        dateStr: d.toLocaleDateString('vi-VN', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        timeStr: d.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    } catch {
      return { dateStr: 'Hôm nay', timeStr: '19:30' };
    }
  }, [scheduledTime]);

  const eventTitle = schedule?.title || 'Beyond The Internet 2026';
  const eventLocation = schedule?.location || 'Hội trường Trực tiếp & Nền tảng Đấu trường Trực tuyến';
  const briefingNote = schedule?.briefing_note || 'Chào mừng quý đại biểu, thầy cô và các bạn khán giả! Vui lòng quét mã QR trên màn hình để tham gia đấu trường tương tác.';

  return (
    <div
      id="projector-waiting-room"
      className="w-full h-full min-h-[100dvh] flex flex-col justify-between p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-[#0c0414] via-[#150727] to-[#08020e] text-[#F5EFF9] relative overflow-hidden select-none animate-fadeIn"
    >
      {/* Rotating Split Background active only during match break or pre-event countdown */}
      {(isBreakActive || (schedule?.status === 'SCHEDULED' && !isTimeReached)) && (
        <RotatingSplitBackground durationSeconds={10} darkColor="#190839" lightColor="#F7CAC9" opacity={0.08} isFixed={true} />
      )}

      {/* High-Tech Stage Ambient Glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none animate-pulse" />
      <div className="absolute top-1/2 -right-32 -translate-y-1/2 w-[500px] h-[500px] bg-[#F7CAC9]/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Stage Bar */}
      <header className="relative z-10 w-full flex items-center justify-between gap-4 shrink-0 fluent-box p-3 sm:px-6 border border-white/10 rounded-[3px] bg-slate-950/60 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[2px] bg-gradient-to-br from-[#F7CAC9] to-purple-600 flex items-center justify-center text-slate-950 shadow-lg shadow-[#F7CAC9]/20">
            {isConcluded ? (
              <Crown className="w-5 h-5 text-amber-300 animate-bounce" />
            ) : (
              <Radio className="w-5 h-5 text-white animate-pulse" />
            )}
          </div>
          <div>
            <div className="text-[10px] sm:text-xs font-mono font-bold tracking-[0.2em] text-[#F7CAC9] uppercase">
              {isConcluded ? 'GRAND FINALE • BẾ MẠC VÀ VINH DANH' : 'STAGE DISPLAY • MÀN CHIẾU SÂN KHẤU CHÍNH'}
            </div>
            <h1 className="text-sm sm:text-lg font-black text-white tracking-tight flex items-center gap-2">
              <span>{eventTitle}</span>
              {schedule?.match_name && (
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/30">
                  {schedule.match_name}
                </span>
              )}
            </h1>
          </div>
        </div>

        {/* Live Audience & Stage Telemetry */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-1.5 rounded-[2px] fluent-box-nested flex items-center gap-2 font-mono text-xs text-white/90 border border-white/10">
            <Users className="w-4 h-4 text-[#F7CAC9]" />
            <span>Khán giả đã kết nối:</span>
            <strong className="text-amber-300 font-bold text-sm">{activeCount}</strong>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
            <Wifi className="w-3.5 h-3.5 animate-pulse" />
            <span>{currentPing.latency}ms • Realtime Sync</span>
          </div>

          <div className={`px-3.5 py-1.5 rounded-[2px] font-bold uppercase tracking-wider text-xs font-mono border ${
            isConcluded
              ? 'bg-purple-500/20 text-purple-300 border-purple-400/40'
              : isPanicMode
              ? 'bg-rose-500/20 text-rose-300 border-rose-400/40 animate-pulse'
              : schedule?.status === 'SCHEDULED' && !isTimeReached
              ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 animate-pulse'
              : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
          }`}>
            {isConcluded
              ? '🏁 ĐÃ BẾ MẠC'
              : isPanicMode
              ? '⏸️ HỆ THỐNG TẠM DỪNG'
              : schedule?.status === 'SCHEDULED' && !isTimeReached
              ? '⏳ CHỜ KHAI MẠC'
              : '🔴 SẴN SÀNG TRANH TÀI'}
          </div>
        </div>
      </header>

      {/* Main Center Stage Body */}
      {isConcluded ? (
        /* CONCLUDED STAGE: QR Code is HIDDEN, Full-width Honors & Closing Presentation */
        <main className="relative z-10 flex-1 my-auto w-full max-w-5xl mx-auto flex flex-col items-center justify-center text-center py-8 sm:py-12 animate-fadeIn">
          
          {/* Majestic Trophy Icon */}
          <div className="relative mb-6">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-gradient-to-tr from-amber-500/30 via-yellow-400/20 to-purple-600/30 border-2 border-amber-400/50 flex items-center justify-center shadow-2xl shadow-amber-500/20 backdrop-blur-md">
              <Trophy className="w-14 h-14 sm:w-16 sm:h-16 text-amber-400 animate-pulse drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]" />
            </div>
            <div className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black">
              <Sparkles className="w-4 h-4 fill-current animate-spin" />
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-amber-500/15 text-amber-300 border border-amber-400/40 shadow-lg mb-4">
            <Award className="w-4 h-4 text-amber-300" />
            <span>LỄ BẾ MẠC & TỔNG KẾT CHUNG CUỘC • BTI 2026</span>
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight drop-shadow-2xl mb-4">
            SỰ KIỆN ĐÃ KHÉP LẠI <span className="text-gradient-horizon font-black">THÀNH CÔNG RỰC RỠ</span>
          </h2>

          <div className="max-w-2xl mx-auto p-6 rounded-[6px] fluent-box border border-purple-500/40 bg-slate-950/80 backdrop-blur-xl shadow-2xl mb-2">
            <p className="text-base sm:text-lg text-amber-200/90 font-medium leading-relaxed italic">
              "{schedule?.concluding_message || 'Ban Tổ Chức trân trọng cảm ơn toàn thể quý thầy cô, đại biểu và các bạn khán giả đã tham gia và cổ vũ nhiệt tình!'}"
            </p>
          </div>
        </main>
      ) : (
        /* SCHEDULED / STANDBY STAGE: 2-Column Split (Left: Countdown & Info, Right: Big QR Code) */
        <main className="relative z-10 flex-1 my-auto w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-center justify-center py-4 sm:py-6">
          
          {/* Left Column: Event Hero & Grand Countdown (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-center space-y-5 sm:space-y-6 text-left">
            
            {/* Status Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-mono font-bold tracking-widest uppercase bg-amber-500/15 text-amber-300 border border-amber-400/40 shadow-lg w-fit">
              <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
              <span>
                {isBreakActive
                  ? 'ĐANG TẠM NGHỈ GIỮA TRẬN • ĐẾM NGƯỢC HỘI Ý'
                  : isPanicMode
                  ? 'CHẾ ĐỘ TẠM NGHỈ • VUI LÒNG CHỜ HIỆU LỆNH TỪ MC'
                  : schedule?.status === 'SCHEDULED' && !isTimeReached
                  ? 'ĐẾM NGƯỢC GIỜ G KHAI MẠC ĐẤU TRƯỜNG'
                  : 'ĐẤU TRƯỜNG HỌC THUẬT THỜI GIAN THỰC'}
              </span>
            </div>

            {/* Title & Match Badge */}
            <div>
              {schedule?.match_name && (
                <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-[3px] bg-gradient-to-r from-amber-500/20 via-purple-600/20 to-sky-500/20 text-amber-300 border border-amber-400/50 font-mono text-xs sm:text-sm font-bold uppercase tracking-wider mb-2.5 shadow-lg">
                  <Trophy className="w-4 h-4 text-amber-400" />
                  <span>{schedule.match_name}</span>
                  {schedule.match_subtitle && (
                    <span className="text-white/70 border-l border-white/20 pl-2 font-normal lowercase first-letter:uppercase">
                      {schedule.match_subtitle}
                    </span>
                  )}
                </div>
              )}
              <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight drop-shadow-2xl">
                {isBreakActive && matchBreak?.title ? (
                  <>
                    <span className="text-amber-300">{matchBreak.title}</span>
                  </>
                ) : (
                  <>
                    BEYOND THE INTERNET <span className="text-gradient-horizon font-black">2026</span>
                  </>
                )}
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-[#B6A6D8] mt-2 font-normal leading-relaxed">
                {isBreakActive ? (matchBreak?.subtitle || 'Trận đấu đang tạm dừng ít phút. Các thí sinh và khán giả vui lòng giữ nguyên vị trí.') : briefingNote}
              </p>
            </div>

            {/* Event Meta Pills (Date & Venue) */}
            <div className="flex flex-wrap items-center gap-3 font-mono text-xs sm:text-sm">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-[3px] fluent-box-nested border border-white/10 text-white/90">
                <Calendar className="w-4 h-4 text-amber-400" />
                <span>{formattedScheduledDate.timeStr} • {formattedScheduledDate.dateStr}</span>
              </div>

              <div className="flex items-center gap-2 px-3.5 py-2 rounded-[3px] fluent-box-nested border border-white/10 text-sky-300">
                <MapPin className="w-4 h-4 text-sky-400" />
                <span className="truncate max-w-xs">{eventLocation}</span>
              </div>
            </div>

            {/* Large Digital LED Countdown (Break Countdown or Scheduled Countdown) */}
            {isBreakActive && (matchBreak?.duration_seconds || 0) > 0 ? (
              <div className="w-full p-4 sm:p-5 rounded-[4px] fluent-box border border-amber-400/60 shadow-2xl bg-gradient-to-r from-amber-950/90 via-[#260f38]/90 to-slate-950/90 backdrop-blur-xl animate-fadeIn relative overflow-hidden">
                {/* Background Motion Layers */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                  <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.18)_0%,rgba(168,85,247,0.12)_40%,transparent_70%)] animate-spin-slow opacity-80" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-amber-400/30 rounded-full animate-countdown-ripple" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-purple-400/20 rounded-full animate-countdown-ripple" style={{ animationDelay: '1s' }} />
                </div>

                <div className="relative z-10 flex items-center justify-between mb-3 border-b border-amber-400/20 pb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-300 uppercase font-bold tracking-wider">
                    <Clock className="w-4 h-4 text-amber-400 animate-spin" />
                    <span>Thời gian giải lao / tạm dừng còn lại:</span>
                  </div>
                  <div className="text-[11px] font-mono text-amber-300/70 font-bold">
                    Trực tiếp từ Trung Tâm Điều Hành
                  </div>
                </div>

                <div className="relative z-10 flex items-center justify-center gap-3 sm:gap-6 text-center py-1">
                  {/* Minutes */}
                  <div className="p-4 sm:p-6 rounded-[4px] bg-black/80 border border-amber-400/50 shadow-inner flex-1 max-w-[180px] backdrop-blur-md">
                    <div className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono text-amber-300 tracking-tight">
                      {String(breakCountdown.mins).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] sm:text-xs font-mono text-amber-300/80 uppercase font-bold mt-2">
                      Phút
                    </div>
                  </div>

                  <span className="text-3xl sm:text-5xl font-mono font-bold text-amber-400 animate-pulse">:</span>

                  {/* Seconds */}
                  <div className="p-4 sm:p-6 rounded-[4px] bg-black/80 border border-amber-400/60 shadow-inner flex-1 max-w-[180px] backdrop-blur-md">
                    <div className="text-4xl sm:text-6xl lg:text-7xl font-black font-mono text-yellow-400 tracking-tight animate-pulse">
                      {String(breakCountdown.secs).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] sm:text-xs font-mono text-amber-300/80 uppercase font-bold mt-2">
                      Giây
                    </div>
                  </div>
                </div>
              </div>
            ) : schedule?.status === 'SCHEDULED' && !isTimeReached ? (
              <div className="w-full p-4 sm:p-5 rounded-[4px] fluent-box border border-amber-500/40 shadow-2xl bg-gradient-to-r from-slate-950/90 via-[#1a0c2c]/90 to-slate-950/90 backdrop-blur-xl relative overflow-hidden">
                {/* Background Motion Layers */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
                  <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.15)_0%,rgba(168,85,247,0.1)_40%,transparent_70%)] animate-spin-slow opacity-80" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border border-amber-400/25 rounded-full animate-countdown-ripple" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-sky-400/15 rounded-full animate-countdown-ripple" style={{ animationDelay: '1s' }} />
                </div>

                <div className="relative z-10 flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                  <div className="flex items-center gap-2 text-xs font-mono text-amber-300 uppercase font-bold tracking-wider">
                    <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                    <span>Thời gian đếm ngược chính xác tới giờ khai mạc:</span>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    Hệ thống đồng bộ Server NTP
                  </div>
                </div>

                <div className="relative z-10 grid grid-cols-4 gap-3 sm:gap-4 text-center">
                  {/* Days */}
                  <div className="p-3 sm:p-4 rounded-[3px] bg-slate-950/80 border border-white/10 shadow-inner backdrop-blur-md hover:border-amber-400/40 transition">
                    <div className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono text-amber-300 tracking-tight">
                      {String(countdown.days).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase font-bold mt-1.5">
                      Ngày
                    </div>
                  </div>

                  {/* Hours */}
                  <div className="p-3 sm:p-4 rounded-[3px] bg-slate-950/80 border border-white/10 shadow-inner backdrop-blur-md hover:border-amber-400/40 transition">
                    <div className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono text-amber-300 tracking-tight">
                      {String(countdown.hours).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase font-bold mt-1.5">
                      Giờ
                    </div>
                  </div>

                  {/* Minutes */}
                  <div className="p-3 sm:p-4 rounded-[3px] bg-slate-950/80 border border-white/10 shadow-inner backdrop-blur-md hover:border-amber-400/40 transition">
                    <div className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono text-amber-300 tracking-tight">
                      {String(countdown.minutes).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] sm:text-xs font-mono text-slate-400 uppercase font-bold mt-1.5">
                      Phút
                    </div>
                  </div>

                  {/* Seconds */}
                  <div className="p-3 sm:p-4 rounded-[3px] bg-slate-950/80 border border-amber-500/50 shadow-inner backdrop-blur-md hover:border-amber-400 transition">
                    <div className="text-3xl sm:text-5xl lg:text-6xl font-black font-mono text-yellow-400 tracking-tight animate-pulse">
                      {String(countdown.seconds).padStart(2, '0')}
                    </div>
                    <div className="text-[10px] sm:text-xs font-mono text-amber-300 uppercase font-bold mt-1.5">
                      Giây
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="w-full p-4 rounded-[4px] fluent-box border border-emerald-500/40 shadow-2xl bg-slate-950/80 flex items-center justify-center gap-3 text-emerald-400 font-mono font-bold text-base sm:text-lg">
                <span className="relative flex h-3.5 w-3.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-400" />
                </span>
                <span>ĐÃ ĐẾN GIỜ KHAI MẠC • SẴN SÀNG KHỞI TRANH</span>
              </div>
            )}

          </div>

          {/* Right Column: Stage Audience Join Portal & High-Res QR Code (5 Cols) */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center">
            <div className="w-full max-w-sm p-6 sm:p-7 rounded-[6px] fluent-box border border-[#F7CAC9]/40 shadow-2xl bg-gradient-to-b from-[#1b0a2e]/95 via-[#130622]/95 to-slate-950/95 backdrop-blur-2xl flex flex-col items-center text-center relative overflow-hidden group">
              
              {/* Ambient Corner Glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#F7CAC9]/20 rounded-full blur-2xl pointer-events-none -mr-10 -mt-10" />

              {/* Header */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-mono font-bold tracking-wider uppercase bg-[#F7CAC9]/15 text-[#F7CAC9] border border-[#F7CAC9]/30 mb-4">
                <QrCode className="w-3.5 h-3.5 text-[#F7CAC9]" />
                <span>CỔ VŨ & BÌNH CHỌN TRỰC TIẾP</span>
              </div>

              <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                Quét Mã Để Tham Gia
              </h3>

              <p className="text-xs text-[#B6A6D8] mb-5 leading-relaxed">
                Mở Camera hoặc ứng dụng Zalo trên điện thoại quét mã QR bên dưới để tham gia đấu trường.
              </p>

              {/* QR Code Container */}
              <div className="p-3.5 bg-white rounded-[4px] shadow-2xl border-2 border-[#F7CAC9]/50 mb-4 transition-transform duration-300 group-hover:scale-102">
                {activeQrDataUrl ? (
                  <CrossFadeQrCode
                    dataUrl={activeQrDataUrl}
                    alt="Mã QR tham gia khán giả"
                    sizeClass="w-48 h-48 sm:w-56 sm:h-56"
                    className="block object-contain"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center bg-slate-100 text-slate-400 font-mono text-xs">
                    Đang tạo mã QR...
                  </div>
                )}
              </div>

              {/* Audience Link Display */}
              {audienceJoinUrl && (
                <div className="w-full px-3 py-1.5 rounded-[2px] bg-white/5 border border-white/10 text-[11px] font-mono text-[#F7CAC9] truncate select-all">
                  {audienceJoinUrl}
                </div>
              )}

              <div className="mt-3 text-[10px] font-mono text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Không cần cài đặt ứng dụng • Chạy trực tiếp trên trình duyệt</span>
              </div>
            </div>
          </div>

        </main>
      )}

      {/* Footer / Broadcast Announcer */}
      <footer className="relative z-10 w-full mt-auto shrink-0">
        <div className="text-center text-[10px] sm:text-xs font-mono text-[#B6A6D8]/50 uppercase tracking-widest pt-2">
          Beyond The Internet 2026 • Academic Interactive Real-time Arena
        </div>
      </footer>

      {/* Live Broadcast Announcer Marquee Overlay */}
      <AnnouncerOverlay overlay={gameState.announcer_overlay} mode="waiting" />
    </div>
  );
};
