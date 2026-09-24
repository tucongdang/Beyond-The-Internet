import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  MapPin,
  Shield,
  Volume2,
  VolumeX,
  Wifi,
  Sun,
  Radio,
  UserCheck,
  UserPlus,
  Info,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Trophy,
  Zap,
  Lock
} from 'lucide-react';
import { GameState, UserInfo } from '../types';
import { soundFx } from '../services/audioEffects';
import { RotatingSplitBackground } from './RotatingSplitBackground';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';
import { syncService } from '../services/syncService';
import { getUserDisplayUid } from '../utils/uidUtils';

interface EventWaitingRoomProps {
  gameState: GameState;
  user: UserInfo | null;
  activeCount?: number;
  onOpenRegister: () => void;
  onOpenProfile?: () => void;
  isWakeLockSupported?: boolean;
  isWakeLockLocked?: boolean;
  onToggleWakeLock?: () => void;
}

export const EventWaitingRoom: React.FC<EventWaitingRoomProps> = ({
  gameState,
  user,
  activeCount = 1,
  onOpenRegister,
  onOpenProfile,
  isWakeLockSupported = true,
  isWakeLockLocked = false,
  onToggleWakeLock
}) => {
  const schedule = gameState.event_schedule;
  const scheduledTime = schedule?.scheduled_start_time || Date.now() + 3600000;

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [testedAudio, setTestedAudio] = useState(false);
  const [currentPing, setCurrentPing] = useState<{ latency: number; quality: string }>({
    latency: 24,
    quality: 'EXCELLENT'
  });

  // Real-time second clock
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Listen to ping
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

  // Format date time
  const formattedScheduledDate = useMemo(() => {
    try {
      const d = new Date(scheduledTime);
      return {
        dateStr: d.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }),
        timeStr: d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      };
    } catch {
      return { dateStr: 'Hôm nay', timeStr: '19:30' };
    }
  }, [scheduledTime]);

  const handleTestAudio = () => {
    soundFx.playTing();
    vibrateSuccess();
    setTestedAudio(true);
    setTimeout(() => setTestedAudio(false), 3500);
  };

  const eventTitle = schedule?.title || 'Beyond The Internet 2026';
  const eventLocation = schedule?.location || 'Hội trường Trực tiếp & Nền tảng Tương tác Trực tuyến';
  const briefingNote = schedule?.briefing_note || 'Chào mừng các bạn khán giả! Vui lòng ổn định vị trí, kiểm tra kết nối mạng và sẵn sàng cho các vòng thi đấu trực tiếp.';

  return (
    <div id="event-waiting-room" className="min-h-[calc(100dvh-5rem)] p-3 sm:p-5 md:p-8 flex flex-col items-center justify-center animate-in fade-in duration-300 relative">
      {/* Rotating Split Background active only when scheduled countdown is running */}
      {(!isTimeReached && schedule?.status === 'SCHEDULED') && (
        <RotatingSplitBackground durationSeconds={10} darkColor="#190839" lightColor="#F7CAC9" opacity={0.08} isFixed={true} />
      )}

      <div className="max-w-3xl w-full space-y-4 sm:space-y-6 relative z-10">
        
        {/* Top Header Card: Title, Status Badge, Location */}
        <div className="fluent-box rounded-[4px] p-5 sm:p-7 relative overflow-hidden border border-sky-500/30 shadow-2xl bg-gradient-to-br from-slate-900/95 via-[#13092b]/95 to-slate-950/95">
          {/* Subtle Cyber Glow Background Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Stage Status Pill & Match Badge */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-400/40 shadow-sm">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>PHÒNG CHỜ KHAI MẠC • SẮP DIỄN RA</span>
              </div>
              {schedule?.match_name && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase bg-purple-500/20 text-purple-300 border border-purple-400/40 shadow-sm">
                  <Trophy className="w-3.5 h-3.5 text-amber-300" />
                  <span>{schedule.match_name}</span>
                </div>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight leading-tight mb-2">
              {eventTitle}
            </h1>

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-5 text-xs sm:text-sm text-slate-300 font-medium mb-4">
              <span className="flex items-center gap-1.5 text-sky-300">
                <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{formattedScheduledDate.timeStr} • {formattedScheduledDate.dateStr}</span>
              </span>
              <span className="hidden sm:inline text-white/30">•</span>
              <span className="flex items-center gap-1.5 text-slate-300">
                <MapPin className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{eventLocation}</span>
              </span>
            </div>

            {/* Live Presence in Waiting Room */}
            <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-500/30 px-3 py-1 rounded-[3px]">
              <Radio className="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span>{activeCount} khán giả đang có mặt trong phòng chờ</span>
            </div>
          </div>
        </div>

        {/* Countdown Timer Centerpiece with Dynamic Animated Background Motion */}
        <div className="fluent-box rounded-[4px] p-5 sm:p-7 relative overflow-hidden border border-amber-500/30 shadow-xl bg-gradient-to-b from-slate-900/90 to-[#120826]/90 text-center">
          {/* Dynamic Motion Background Layers */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
            {/* Spinning & Pulsing Ambient Aura Mesh */}
            <div className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%] bg-[radial-gradient(ellipse_at_center,rgba(245,158,11,0.12)_0%,rgba(168,85,247,0.08)_35%,transparent_70%)] animate-spin-slow opacity-80" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl animate-pulse-glow" />
            <div className="absolute -bottom-10 -right-10 w-72 h-72 bg-purple-600/20 rounded-full blur-2xl animate-mesh-wave" />

            {/* Subtle Expanding Ripple Wave */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-amber-400/20 rounded-full animate-countdown-ripple" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-purple-400/15 rounded-full animate-countdown-ripple" style={{ animationDelay: '1s' }} />

            {/* Ambient Floating Light Particle Dots */}
            <div className="absolute bottom-4 left-1/4 w-1.5 h-1.5 bg-amber-300 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '0s' }} />
            <div className="absolute bottom-6 right-1/3 w-2 h-2 bg-sky-300 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '2s' }} />
            <div className="absolute bottom-2 right-1/4 w-1 h-1 bg-purple-300 rounded-full blur-[0.5px] animate-float-particle" style={{ animationDelay: '4s' }} />
          </div>

          <div className="relative z-10 flex items-center justify-center gap-2 text-xs font-mono uppercase tracking-widest text-amber-400 font-bold mb-4">
            <Clock className="w-4 h-4 text-amber-400 animate-bounce" />
            <span>ĐỒNG HỒ ĐẾM NGƯỢC ĐẾN GIỜ KHAI MẠC</span>
          </div>

          {!isTimeReached ? (
            <div className="relative z-10 grid grid-cols-4 gap-2 sm:gap-4 max-w-lg mx-auto mb-4">
              {/* Days */}
              <div className="p-3 sm:p-4 rounded-[4px] bg-slate-950/80 border border-white/10 shadow-inner flex flex-col items-center backdrop-blur-sm transition hover:border-amber-400/40">
                <span className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-white tracking-tight">
                  {String(countdown.days).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold font-mono text-slate-400 uppercase mt-1">Ngày</span>
              </div>
              {/* Hours */}
              <div className="p-3 sm:p-4 rounded-[4px] bg-slate-950/80 border border-white/10 shadow-inner flex flex-col items-center backdrop-blur-sm transition hover:border-amber-400/40">
                <span className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-amber-300 tracking-tight">
                  {String(countdown.hours).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold font-mono text-slate-400 uppercase mt-1">Giờ</span>
              </div>
              {/* Minutes */}
              <div className="p-3 sm:p-4 rounded-[4px] bg-slate-950/80 border border-white/10 shadow-inner flex flex-col items-center backdrop-blur-sm transition hover:border-amber-400/40">
                <span className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-sky-300 tracking-tight">
                  {String(countdown.minutes).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold font-mono text-slate-400 uppercase mt-1">Phút</span>
              </div>
              {/* Seconds */}
              <div className="p-3 sm:p-4 rounded-[4px] bg-slate-950/80 border border-amber-500/40 shadow-inner shadow-amber-500/10 flex flex-col items-center backdrop-blur-sm transition hover:border-amber-400">
                <span className="text-2xl sm:text-4xl md:text-5xl font-black font-mono text-emerald-400 tracking-tight animate-pulse key={countdown.seconds}">
                  {String(countdown.seconds).padStart(2, '0')}
                </span>
                <span className="text-[10px] sm:text-xs font-bold font-mono text-emerald-400/80 uppercase mt-1">Giây</span>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-[4px] bg-amber-500/10 border border-amber-400/40 text-amber-200 mb-4 max-w-lg mx-auto">
              <div className="flex items-center justify-center gap-2 font-black text-base sm:text-lg mb-1">
                <Sparkles className="w-5 h-5 text-amber-300 animate-spin" />
                <span>ĐÃ ĐẾN GIỜ KHAI MẠC!</span>
              </div>
              <p className="text-xs text-amber-100/80">
                Chương trình đang chuẩn bị mở màn. Ban Tổ Chức sẽ kích hoạt hiệu lệnh &ldquo;Bắt đầu&rdquo; ngay ít phút nữa!
              </p>
            </div>
          )}

          {/* Anti-Leak Security Guarantee Card */}
          <div className="flex items-start sm:items-center justify-center gap-2.5 p-3 rounded-[3px] bg-sky-950/40 border border-sky-500/30 text-sky-200 text-xs text-left sm:text-center max-w-xl mx-auto">
            <Lock className="w-4 h-4 text-sky-400 shrink-0 mt-0.5 sm:mt-0" />
            <span>
              <strong>Bảo mật nội dung tuyệt đối:</strong> Toàn bộ câu hỏi, dữ liệu vòng thi được niêm phong chống rò rỉ. Thiết bị của bạn sẽ tự động chuyển vào sàn đấu mà không cần làm mới trang khi có tín hiệu Bắt đầu.
            </span>
          </div>
        </div>

        {/* Two-Column Bento: Registration Profile & Device Readiness Check */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Card 1: Khán Giả Ghi Danh (Audience Profile) */}
          <div className="fluent-box rounded-[4px] p-4 sm:p-5 border border-white/10 bg-slate-900/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Hồ Sơ Tham Gia Của Bạn</span>
                </div>
                {user ? (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 font-bold">
                    ✓ ĐÃ GHI DANH
                  </span>
                ) : (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-400/30 font-bold">
                    CHƯA GHI DANH
                  </span>
                )}
              </div>

              {user ? (
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-[3px] bg-slate-950/60 border border-white/5 space-y-1.5 font-mono">
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Họ và tên:</span>
                      <span className="font-bold text-white text-sm">{user.name}</span>
                    </div>
                    {user.mssv && (
                      <div className="flex justify-between items-center text-slate-400">
                        <span>MSSV / Mã số:</span>
                        <span className="font-bold text-sky-300">{user.mssv}</span>
                      </div>
                    )}
                    {user.teamName && (
                      <div className="flex justify-between items-center text-slate-400">
                        <span>Đội cổ vũ:</span>
                        <span className="font-bold text-amber-300">{user.teamName}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-slate-400">
                      <span>Mã định danh (UID):</span>
                      <span className="font-mono text-xs font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-[2px] border border-purple-500/30 tracking-wider">
                        {getUserDisplayUid(user)}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-400 italic">
                    💡 Bạn đã ghi danh thành công. Khi sự kiện bắt đầu, điểm số và câu trả lời của bạn sẽ được lưu tự động vào bảng vàng vinh danh!
                  </p>
                </div>
              ) : (
                <div className="space-y-3 py-2 text-center">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Bạn đang ở chế độ khách vãng lai. Hãy ghi danh ngay để lưu thành tích, cạnh tranh xếp hạng và tham gia bốc thăm trúng thưởng!
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      soundFx.playClick();
                      vibrateTap();
                      onOpenRegister();
                    }}
                    className="w-full py-3 px-4 rounded-[3px] bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-sky-950/50 flex items-center justify-center gap-2 cursor-pointer transition active:scale-95"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Ghi Danh Tham Gia Ngay</span>
                  </button>
                </div>
              )}
            </div>

            {user && onOpenProfile && (
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  vibrateTap();
                  onOpenProfile();
                }}
                className="w-full py-2 px-3 rounded-[3px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-medium flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Chỉnh sửa hồ sơ cá nhân</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Card 2: Kiểm Tra Thiết Bị & Kết Nối (Device & Audio Readiness) */}
          <div className="fluent-box rounded-[4px] p-4 sm:p-5 border border-white/10 bg-slate-900/80 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-3">
                <div className="flex items-center gap-2 text-xs font-bold font-mono text-slate-200 uppercase tracking-wider">
                  <Zap className="w-4 h-4 text-sky-400" />
                  <span>Kiểm Tra Thiết Bị Trước Giờ Thi</span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ONLINE
                </span>
              </div>

              <div className="space-y-2.5 text-xs">
                {/* 1. Network Ping */}
                <div className="p-2.5 rounded-[3px] bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Độ trễ kết nối (Ping):</span>
                  </div>
                  <span className="font-mono font-bold text-emerald-400">
                    {currentPing.latency} ms ({currentPing.quality})
                  </span>
                </div>

                {/* 2. Audio Speaker Check */}
                <div className="p-2.5 rounded-[3px] bg-slate-950/60 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-slate-300">
                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Thử loa / Chuông thông báo:</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleTestAudio}
                    className={`px-2.5 py-1 rounded-[2px] font-mono text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                      testedAudio
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-white/10 hover:bg-white/20 text-amber-300 border border-amber-400/30'
                    }`}
                  >
                    {testedAudio ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" /> Đã Phát
                      </>
                    ) : (
                      <>Bấm Thử Loa</>
                    )}
                  </button>
                </div>

                {/* 3. Screen Keep Awake */}
                {isWakeLockSupported && onToggleWakeLock && (
                  <div className="p-2.5 rounded-[3px] bg-slate-950/60 border border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-300">
                      <Sun className="w-3.5 h-3.5 text-yellow-400" />
                      <span>Giữ màn hình luôn sáng:</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        soundFx.playClick();
                        vibrateTap();
                        onToggleWakeLock();
                      }}
                      className={`px-2.5 py-1 rounded-[2px] font-mono text-[11px] font-bold transition cursor-pointer ${
                        isWakeLockLocked
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'bg-white/10 text-slate-400 hover:text-white border border-white/10'
                      }`}
                    >
                      {isWakeLockLocked ? 'Đang Bật' : 'Bật Giữ Sáng'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="p-2 rounded-[3px] bg-slate-950/40 border border-white/5 text-[11px] text-slate-400 text-center">
              Khuyến khích giữ màn hình bật và không thoát trình duyệt trong suốt buổi thi.
            </div>
          </div>

        </div>

        {/* Organizer Briefing & Rules Notice Card */}
        <div className="fluent-box rounded-[4px] p-4 sm:p-5 border border-white/10 bg-slate-900/60 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold font-mono text-purple-300 uppercase tracking-wider mb-1">
            <Info className="w-4 h-4 text-purple-400" />
            <span>Thông Điệp & Thể Lệ Từ Ban Tổ Chức</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
            &ldquo;{briefingNote}&rdquo;
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-white/10 text-[11px] text-slate-300">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
              <span>1. Khởi động chung</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span>2. Vượt chướng ngại vật</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
              <span>3. Tăng tốc tốc độ</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>4. Về đích tương tác</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
