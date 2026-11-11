import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Clock, Megaphone } from 'lucide-react';
import { GameState } from '../types';
import { AnnouncerOverlay } from './AnnouncerOverlay';
import { RotatingSplitBackground } from './RotatingSplitBackground';
import { TimeEstimator } from './TimeEstimator';

interface ClientLandingPageProps {
  gameState?: GameState;
  isPanic?: boolean;
}

export const ClientLandingPage: React.FC<ClientLandingPageProps> = ({ gameState, isPanic }) => {
  const { localLanguage } = useLanguage();

  const overlay = gameState?.announcer_overlay;
  const hasLiveAnnouncement = Boolean(overlay?.active && overlay?.text?.trim());
  const isPanicMode = isPanic ?? Boolean(gameState?.panic_mode);

  const matchBreak = gameState?.match_break;
  const isBreakActive = Boolean(matchBreak?.active);

  return (
    <div className="min-h-full flex-1 w-full bg-transparent relative overflow-hidden flex flex-col items-center justify-center text-[#F5EFF9] p-4 sm:p-8 pb-20 select-none">
      {/* Rotating Split Background active during pause / panic / break / standby */}
      <RotatingSplitBackground durationSeconds={10} darkColor="#190839" lightColor="#F7CAC9" opacity={0.08} isFixed={true} />

      <div className="relative z-10 w-full max-w-xl mx-auto flex flex-col items-center text-center py-6 sm:py-10 animate-fadeIn">
        
        {/* Animated Clock / Horizon Radar Icon */}
        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 mb-5 sm:mb-6 rounded-[4px] flex items-center justify-center border shadow-xl shadow-[#0D0420]/60 ${
          isBreakActive 
            ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' 
            : 'bg-[#F7CAC9]/15 backdrop-blur-md border-[#F7CAC9]/30 text-[#F7CAC9]'
        }`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-[4px] opacity-60 ${
            isBreakActive ? 'bg-amber-400/30' : 'bg-[#F7CAC9]/20'
          }`}></span>
          <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2 sm:mb-3 drop-shadow-2xl uppercase font-mono">
          {isBreakActive
            ? (matchBreak?.title || (localLanguage !== 'vi' ? 'Match Break' : 'Tạm Dừng Giữa Trận'))
            : isPanicMode
              ? (localLanguage !== 'vi' ? 'System Paused' : 'Hệ Thống Tạm Dừng')
              : (localLanguage !== 'vi' ? 'Please Stand By' : 'Vui Lòng Chờ')}
        </h1>
        
        <p className="text-xs sm:text-sm text-[#B6A6D8] mb-6 font-normal leading-relaxed max-w-md">
          {isBreakActive ? (
            matchBreak?.subtitle || (localLanguage !== 'vi' ? 'The match is paused for a short intermission. Please stand by.' : 'Trận đấu đang tạm dừng để hội ý hoặc nghỉ giữa hiệp. Vui lòng giữ nguyên màn hình.')
          ) : isPanicMode ? (
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

        {/* Dedicated Real-time Time Estimator */}
        <TimeEstimator gameState={gameState} className="w-full mb-6" />

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

        {/* Real-time Connection Indicator (Clean unboxed metadata) */}
        <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wide text-emerald-400 select-none">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          <span className="text-[11px] uppercase tracking-wider">
            {localLanguage !== 'vi' ? 'Connected & Synchronized in Real-time' : 'Đã kết nối và đồng bộ thời gian thực'}
          </span>
        </div>
      </div>

      {/* Live Broadcast Announcer Marquee Overlay */}
      <AnnouncerOverlay overlay={gameState?.announcer_overlay} mode="waiting" />
    </div>
  );
};
