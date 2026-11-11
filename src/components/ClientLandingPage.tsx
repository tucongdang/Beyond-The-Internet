import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Clock, Megaphone, Sparkles, Flame, Coffee } from 'lucide-react';
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
  const isVi = localLanguage === 'vi';

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
        
        {/* Arena Stage Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 mb-4 rounded-[2px] bg-white/5 border border-[#F7CAC9]/25 text-[11px] font-mono font-bold uppercase tracking-wider text-[#F7CAC9] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>
            {isBreakActive
              ? (isVi ? 'Trạm Nghỉ Giữa Hiệp • BTI 2027' : 'Halftime Lounge • BTI 2027')
              : isPanicMode
                ? (isVi ? 'Nhịp Nghỉ Sân Khấu • BTI 2027' : 'Stage Hold • BTI 2027')
                : (isVi ? 'Đấu Trường Sinh Viên • BTI 2027' : 'Student Arena • BTI 2027')}
          </span>
        </div>

        {/* Animated Status Icon */}
        <div className={`relative w-16 h-16 sm:w-20 sm:h-20 mb-5 sm:mb-6 rounded-[4px] flex items-center justify-center border shadow-xl shadow-[#0D0420]/60 ${
          isBreakActive 
            ? 'bg-amber-500/20 border-amber-400/40 text-amber-300' 
            : 'bg-[#F7CAC9]/15 backdrop-blur-md border-[#F7CAC9]/30 text-[#F7CAC9]'
        }`}>
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-[4px] opacity-60 ${
            isBreakActive ? 'bg-amber-400/30' : 'bg-[#F7CAC9]/20'
          }`}></span>
          {isBreakActive ? (
            <Coffee className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
          ) : isPanicMode ? (
            <Clock className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
          ) : (
            <Flame className="w-8 h-8 sm:w-10 sm:h-10 animate-pulse" />
          )}
        </div>
        
        <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white mb-2 sm:mb-3 drop-shadow-2xl uppercase font-mono">
          {isBreakActive
            ? (matchBreak?.title || (!isVi ? 'Quick Recharge Break!' : 'Giờ Giải Lao Nạp Năng Lượng!'))
            : isPanicMode
              ? (!isVi ? 'Quick Stage Hold!' : 'Sân Khấu Đang Tạm Nghỉ Ít Phút!')
              : (!isVi ? 'Get Ready to Shine Next!' : 'Sẵn Sàng Bùng Nổ Ở Câu Tiếp Theo!')}
        </h1>
        
        <p className="text-xs sm:text-sm text-[#B6A6D8] mb-6 font-normal leading-relaxed max-w-md">
          {isBreakActive ? (
            matchBreak?.subtitle || (!isVi
              ? 'Contestants on stage are preparing their strategy. Relax your fingers and keep this screen open for the next round!'
              : 'Các thí sinh đang chuẩn bị chiến thuật trên sân khấu. Bạn tranh thủ thả lỏng tay một chút và giữ màn hình mở để chuẩn bị bứt phá tiếp nhé!')
          ) : isPanicMode ? (
            !isVi ? (
              <>The MC and organizers are adjusting the pace on stage.<br/>All your previous answers are safely recorded — eyes on the stage for the next cue!</>
            ) : (
              <>MC và Ban Tổ Chức đang điều chỉnh nhịp độ trên sân khấu.<br/>Mọi câu trả lời trước đó của bạn đều đã được tính điểm trọn vẹn — cùng hướng mắt lên sân khấu chờ hiệu lệnh mới nhé!</>
            )
          ) : (
            !isVi ? (
              <>A brand-new challenge is about to drop as soon as the MC gives the cue!<br/>Keep your screen open to lock in your fastest answer and climb the Leaderboard!</>
            ) : (
              <>Thử thách mới sắp lên sóng ngay khi MC phát hiệu lệnh!<br/>Giữ màn hình luôn mở để chớp thời cơ chốt đáp án thật nhanh và leo thẳng lên Bảng Vàng nhé!</>
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
                {!isVi ? 'Live Message from the Stage' : 'Nhắn Nhanh Từ Sân Khấu'}
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
            {!isVi ? 'Connected smoothly • Ready for the MC’s cue' : 'Đường truyền mượt mà • Sẵn sàng bắt nhịp cùng MC'}
          </span>
        </div>
      </div>

      {/* Live Broadcast Announcer Marquee Overlay */}
      <AnnouncerOverlay overlay={gameState?.announcer_overlay} mode="waiting" />
    </div>
  );
};

