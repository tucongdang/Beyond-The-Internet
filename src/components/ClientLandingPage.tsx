import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Clock, ShieldCheck, Megaphone, Radio, Sparkles, Wifi, Calendar } from 'lucide-react';
import { GameState } from '../types';
import { AnnouncerOverlay } from './AnnouncerOverlay';

interface ClientLandingPageProps {
  gameState?: GameState;
  isPanic?: boolean;
}

export const ClientLandingPage: React.FC<ClientLandingPageProps> = ({ gameState, isPanic }) => {
  const { localLanguage } = useLanguage();
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const overlay = gameState?.announcer_overlay;
  const hasLiveAnnouncement = Boolean(overlay?.active && overlay?.text?.trim());
  const isPanicMode = isPanic ?? Boolean(gameState?.panic_mode);

  const schedule = gameState?.event_schedule;
  const scheduledTime = schedule?.scheduled_start_time || 0;
  const isScheduleActive = Boolean(schedule?.enabled || scheduledTime > 0);
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

  return (
    <div className="min-h-full flex-1 w-full bg-transparent relative overflow-hidden flex flex-col items-center justify-center text-[#F5EFF9] p-4 sm:p-8 pb-20 select-none">
      <div className="relative z-10 w-full max-w-lg mx-auto flex flex-col items-center text-center py-8 sm:py-12 animate-fadeIn">
        
        {/* Animated Clock / Horizon Radar Icon */}
        <div className="relative w-20 h-20 sm:w-22 sm:h-22 mb-6 sm:mb-8 bg-[#F7CAC9]/15 backdrop-blur-md rounded-[4px] flex items-center justify-center border border-[#F7CAC9]/30 shadow-xl shadow-[#0D0420]/60">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-[4px] bg-[#F7CAC9]/20 opacity-60"></span>
          <Clock className="w-10 h-10 sm:w-11 sm:h-11 text-[#F7CAC9] animate-pulse" />
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-3 sm:mb-4 drop-shadow-2xl uppercase">
          {isPanicMode
            ? (localLanguage !== 'vi' ? 'System Paused' : 'Hệ Thống Tạm Dừng')
            : (localLanguage !== 'vi' ? 'Please Stand By' : 'Vui Lòng Chờ')}
        </h1>
        
        <p className="text-sm sm:text-base text-[#B6A6D8] mb-6 font-normal leading-relaxed max-w-md">
          {isPanicMode ? (
            localLanguage !== 'vi' ? (
              <>Interaction is currently paused by the Administrator.<br/>All submitted answers are safely preserved. Please wait for further announcements.</>
            ) : (
              <>Quyền tương tác hiện đang bị tạm dừng bởi Quản trị viên.<br/>Mọi câu trả lời đã nộp vẫn được bảo lưu an toàn. Vui lòng chờ thông báo tiếp theo.</>
            )
          ) : (
            localLanguage !== 'vi' ? (
              <>The organizers are preparing for the next contest round.<br/>Please stay on this screen and be ready to participate.</>
            ) : (
              <>Ban tổ chức đang chuẩn bị cho nội dung thi đấu tiếp theo.<br/>Vui lòng giữ nguyên màn hình và sẵn sàng tham gia.</>
            )
          )}
        </p>

        {/* Live Countdown Clock if upcoming */}
        {isScheduleActive && !isTimeReached && schedule?.status === 'SCHEDULED' && (
          <div className="w-full mb-6 p-4 rounded-[4px] fluent-box border border-amber-500/30 shadow-xl bg-slate-950/70 backdrop-blur-md animate-fadeIn">
            <div className="text-[11px] font-mono text-amber-300 uppercase font-bold tracking-wider mb-2 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>{localLanguage !== 'vi' ? 'Countdown to Start:' : 'Thời gian đếm ngược:'}</span>
            </div>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <div className="text-xl font-mono font-black text-amber-300">{String(countdown.days).padStart(2, '0')}</div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">{localLanguage !== 'vi' ? 'Days' : 'Ngày'}</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <div className="text-xl font-mono font-black text-amber-300">{String(countdown.hours).padStart(2, '0')}</div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">{localLanguage !== 'vi' ? 'Hours' : 'Giờ'}</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-white/10">
                <div className="text-xl font-mono font-black text-amber-300">{String(countdown.minutes).padStart(2, '0')}</div>
                <div className="text-[9px] font-mono text-slate-400 uppercase">{localLanguage !== 'vi' ? 'Mins' : 'Phút'}</div>
              </div>
              <div className="p-2 rounded bg-white/5 border border-amber-500/40">
                <div className="text-xl font-mono font-black text-yellow-400 animate-pulse">{String(countdown.seconds).padStart(2, '0')}</div>
                <div className="text-[9px] font-mono text-amber-300 uppercase">{localLanguage !== 'vi' ? 'Secs' : 'Giây'}</div>
              </div>
            </div>
          </div>
        )}

        {/* High Priority Live Broadcast Banner on Waiting Screen */}
        {hasLiveAnnouncement && (
          <div className="w-full mb-6 p-4 sm:p-5 rounded-[4px] fluent-acrylic-surface border border-sky-400/50 shadow-2xl shadow-sky-950/60 animate-fadeIn text-left">
            <div className="flex items-center gap-2 mb-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-300" />
              </span>
              <span className="text-xs font-mono font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5">
                <Megaphone className="w-3.5 h-3.5" />
                {localLanguage !== 'vi' ? 'Live Announcement from Organizers' : 'Thông báo trực tiếp từ Ban Tổ Chức'}
              </span>
            </div>
            <p className="text-sm sm:text-base font-bold text-white leading-relaxed">
              {overlay?.text}
            </p>
          </div>
        )}

        {/* Connection Status Pill */}
        <div className="inline-flex items-center gap-2 px-4 py-2 fluent-box-nested rounded-[2px] text-xs font-mono font-bold tracking-wider text-emerald-400 shadow-sm border border-emerald-500/30">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-[11px] uppercase tracking-wider">
            {localLanguage !== 'vi' ? 'CONNECTED & SYNCHRONIZED IN REAL-TIME' : 'ĐÃ KẾT NỐI VÀ ĐỒNG BỘ THỜI GIAN THỰC'}
          </span>
        </div>
      </div>

      {/* Live Broadcast Announcer Marquee Overlay */}
      <AnnouncerOverlay overlay={gameState?.announcer_overlay} mode="waiting" />
    </div>
  );
};
