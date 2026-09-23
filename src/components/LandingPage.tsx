import React, { useState, useEffect, useMemo } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Shield, Users, Tv, Sparkles, ArrowRight, Zap, Radio, Activity, Clock, Calendar } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';
import { GameState } from '../types';
import { AnnouncerOverlay } from './AnnouncerOverlay';

interface LandingPageProps {
  onEnterAudience: () => void;
  onEnterAdmin: () => void;
  onEnterProjector: () => void;
  gameState?: GameState;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterAudience,
  onEnterAdmin,
  onEnterProjector,
  gameState
}) => {
  const { localLanguage } = useLanguage();
  const [currentTime, setCurrentTime] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const schedule = gameState?.event_schedule;
  const scheduledTime = schedule?.scheduled_start_time || 0;
  const stageStatus = schedule?.status || (scheduledTime && scheduledTime > currentTime ? 'SCHEDULED' : 'IN_PROGRESS');
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

  const formattedScheduledDate = useMemo(() => {
    if (!scheduledTime) return null;
    try {
      const d = new Date(scheduledTime);
      return {
        dateStr: d.toLocaleDateString(localLanguage === 'vi' ? 'vi-VN' : 'en-US', {
          weekday: 'long',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric'
        }),
        timeStr: d.toLocaleTimeString(localLanguage === 'vi' ? 'vi-VN' : 'en-US', {
          hour: '2-digit',
          minute: '2-digit'
        })
      };
    } catch {
      return null;
    }
  }, [scheduledTime, localLanguage]);

  return (
    <div className="w-full min-h-full bg-transparent relative flex flex-col items-center justify-start text-[#F5EFF9] px-4 py-6 sm:p-8 pb-24 select-none">
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center my-auto py-4 sm:py-8">
        
        {/* Top Horizon Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 fluent-box-nested rounded-[2px] text-xs font-mono font-bold tracking-widest text-[#F7CAC9] mb-6 shadow-sm border border-[#F7CAC9]/20 animate-fadeIn">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7CAC9] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7CAC9]"></span>
          </span>
          <span className="text-[11px] uppercase tracking-wider">BTI 2026 • Real-time Interactive Arena</span>
        </div>

        {/* Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-[#F5EFF9] mb-4 drop-shadow-2xl">
          BEYOND THE INTERNET <span className="text-gradient-horizon font-black">2026</span>
        </h1>
        
        <p className="text-sm sm:text-base md:text-lg text-[#B6A6D8] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          {localLanguage !== 'vi'
            ? 'Real-time interactive academic arena. Ultra-fast synchronization between Audience, Organizers, and Stage LED Screen.'
            : 'Đấu trường tương tác trực tiếp học thuật thời gian thực. Đồng bộ siêu tốc giữa Khán Giả, Ban Tổ Chức và Màn Chiếu Sân Khấu LED.'}
        </p>

        {/* Countdown Timer Widget */}
        {isScheduleActive && (
          <div className="w-full max-w-2xl mx-auto mb-10 p-5 sm:p-6 rounded-[6px] fluent-box border border-amber-500/30 shadow-2xl bg-gradient-to-b from-[#180b2b]/95 via-[#120624]/90 to-slate-950/95 backdrop-blur-xl relative overflow-hidden animate-fadeIn">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-12 bg-gradient-to-r from-amber-500/20 via-[#F7CAC9]/25 to-sky-500/20 blur-xl pointer-events-none" />
            
            <div className="relative z-10 flex flex-col items-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold tracking-wider uppercase bg-amber-500/15 text-amber-300 border border-amber-400/30 mb-4 shadow-sm">
                <Clock className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                <span>
                  {stageStatus === 'SCHEDULED' && !isTimeReached
                    ? (localLanguage !== 'vi' ? 'COUNTDOWN TO EVENT OPENING' : 'ĐẾM NGƯỢC GIỜ G KHAI MẠC')
                    : stageStatus === 'CONCLUDED'
                    ? (localLanguage !== 'vi' ? 'EVENT CONCLUDED' : 'SỰ KIỆN ĐÃ BẾ MẠC')
                    : (localLanguage !== 'vi' ? 'EVENT IS LIVE NOW' : 'SỰ KIỆN ĐANG DIỄN RA TRỰC TIẾP')}
                </span>
              </div>

              {stageStatus === 'SCHEDULED' && !isTimeReached ? (
                <>
                  <div className="grid grid-cols-4 gap-2.5 sm:gap-4 w-full max-w-md my-1">
                    <div className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-[4px] bg-slate-950/80 border border-white/10 shadow-inner">
                      <span className="text-2xl sm:text-4xl font-black font-mono text-amber-300 tracking-tight">
                        {String(countdown.days).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] sm:text-[11px] font-mono text-slate-400 font-bold uppercase mt-1">
                        {localLanguage !== 'vi' ? 'Days' : 'Ngày'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-[4px] bg-slate-950/80 border border-white/10 shadow-inner">
                      <span className="text-2xl sm:text-4xl font-black font-mono text-amber-300 tracking-tight">
                        {String(countdown.hours).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] sm:text-[11px] font-mono text-slate-400 font-bold uppercase mt-1">
                        {localLanguage !== 'vi' ? 'Hours' : 'Giờ'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-[4px] bg-slate-950/80 border border-white/10 shadow-inner">
                      <span className="text-2xl sm:text-4xl font-black font-mono text-amber-300 tracking-tight">
                        {String(countdown.minutes).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] sm:text-[11px] font-mono text-slate-400 font-bold uppercase mt-1">
                        {localLanguage !== 'vi' ? 'Mins' : 'Phút'}
                      </span>
                    </div>

                    <div className="flex flex-col items-center p-2.5 sm:p-3.5 rounded-[4px] bg-slate-950/80 border border-amber-500/40 shadow-inner">
                      <span className="text-2xl sm:text-4xl font-black font-mono text-yellow-400 tracking-tight animate-pulse">
                        {String(countdown.seconds).padStart(2, '0')}
                      </span>
                      <span className="text-[9px] sm:text-[11px] font-mono text-amber-300/80 font-bold uppercase mt-1">
                        {localLanguage !== 'vi' ? 'Secs' : 'Giây'}
                      </span>
                    </div>
                  </div>

                  {formattedScheduledDate && (
                    <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs font-mono text-[#B6A6D8]">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      <span>{formattedScheduledDate.timeStr} • {formattedScheduledDate.dateStr}</span>
                      {schedule?.location && (
                        <>
                          <span className="text-white/30">•</span>
                          <span className="text-sky-300">{schedule.location}</span>
                        </>
                      )}
                    </div>
                  )}
                </>
              ) : stageStatus === 'CONCLUDED' ? (
                <div className="py-2 text-center text-sm text-amber-200/90 font-medium">
                  {schedule?.concluding_message || (localLanguage !== 'vi' ? 'Thank you for participating!' : 'Cảm ơn bạn đã đồng hành cùng chương trình!')}
                </div>
              ) : (
                <div className="py-2 flex items-center justify-center gap-2 text-emerald-400 font-mono font-bold text-sm sm:text-base">
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-400" />
                  </span>
                  <span>{localLanguage !== 'vi' ? 'ARENA IS LIVE • READY TO COMPETE' : 'SÀN ĐẤU ĐÃ MỞ • SẴN SÀNG TRANH TÀI'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3 Action Portal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 w-full max-w-4xl mx-auto mb-8">
          
          {/* Audience Card */}
          <button 
            type="button"
            id="portal-btn-audience"
            onClick={() => { 
              vibrateTap();
              soundFx.playClick(); 
              onEnterAudience(); 
            }}
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[4px] transition-all duration-300 hover:-translate-y-1 hover:border-[#F7CAC9]/60 hover:shadow-xl hover:shadow-[#F7CAC9]/10 active:scale-98 cursor-pointer"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-[#F7CAC9]/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#F7CAC9] font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-[#F7CAC9]/25">
              <Users className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-[#F7CAC9] transition-colors">
              {localLanguage !== 'vi' ? 'Audience' : 'Khán Giả'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage !== 'vi'
                ? 'Join live voting, answer contest questions, and accumulate competitive points.'
                : 'Tham gia bình chọn trực tiếp, trả lời câu hỏi và tích lũy điểm số thi đấu.'}
            </p>
            <div className="mt-auto inline-flex items-center gap-1.5 text-[#F7CAC9] font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
              <span>{localLanguage !== 'vi' ? 'Enter Arena' : 'Vào Sàn Đấu'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Projector LED Card */}
          <button 
            type="button"
            id="portal-btn-projector"
            onClick={() => { 
              vibrateTap();
              soundFx.playClick(); 
              onEnterProjector(); 
            }}
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[4px] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-xl hover:shadow-sky-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-sky-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-sky-300 font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-sky-400/25">
              <Tv className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-sky-300 transition-colors">
              {localLanguage !== 'vi' ? 'Stage LED' : 'Màn Chiếu LED'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage !== 'vi'
                ? 'Fullscreen visual display optimized for the main stage LED screens.'
                : 'Giao diện hiển thị trực quan toàn màn hình dành cho màn LED sân khấu chính.'}
            </p>
            <div className="mt-auto inline-flex items-center gap-1.5 text-sky-300 font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
              <span>{localLanguage !== 'vi' ? 'Open Projector' : 'Mở Màn Chiếu'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

          {/* Admin Card */}
          <button 
            type="button"
            id="portal-btn-admin"
            onClick={() => { 
              vibrateTap();
              soundFx.playClick(); 
              onEnterAdmin(); 
            }}
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[4px] transition-all duration-300 hover:-translate-y-1 hover:border-[#B6A6D8]/60 hover:shadow-xl hover:shadow-purple-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-purple-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#B6A6D8] font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-purple-400/25">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-purple-200 transition-colors">
              {localLanguage !== 'vi' ? 'Organizers' : 'Ban Tổ Chức'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage !== 'vi'
                ? 'Coordinate questions, control timers, lock responses, and export data.'
                : 'Điều phối câu hỏi, kiểm soát timer, khóa bình chọn và trích xuất dữ liệu.'}
            </p>
            <div className="mt-auto inline-flex items-center gap-1.5 text-[#B6A6D8] font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
              <span>{localLanguage !== 'vi' ? 'Control Panel' : 'Bảng Điều Khiển'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* Live Arena Status Pill */}
        {gameState && (
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-[2px] bg-white/5 border border-white/10 text-xs font-mono text-white/70">
            <span className="text-[11px]">{localLanguage !== 'vi' ? 'Arena status:' : 'Trạng thái sàn đấu:'}</span>
            <span className={`font-bold uppercase ${
              gameState.status === 'ACTIVE'
                ? 'text-emerald-400'
                : gameState.status === 'LOCKED'
                ? 'text-amber-400'
                : gameState.status === 'REVEAL'
                ? 'text-purple-300'
                : 'text-white/50'
            }`}>
              {gameState.status === 'ACTIVE'
                ? (localLanguage !== 'vi' ? 'In Progress' : 'Đang Diễn Ra')
                : gameState.status === 'LOCKED'
                ? (localLanguage !== 'vi' ? 'Locked' : 'Đã Khóa')
                : gameState.status === 'REVEAL'
                ? (localLanguage !== 'vi' ? 'Result Revealed' : 'Công Bố Đáp Án')
                : (localLanguage !== 'vi' ? 'Waiting to Start' : 'Chờ Khởi Động')}
            </span>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="mt-4 pb-6 text-center">
        <p className="text-[10px] text-[#B6A6D8]/50 font-mono tracking-widest uppercase">
          Beyond The Internet 2026 • Academic Gameshow Live System
        </p>
      </div>

      {/* Live Broadcast Announcer Marquee Overlay */}
      <AnnouncerOverlay overlay={gameState?.announcer_overlay} mode="waiting" />
    </div>
  );
};
