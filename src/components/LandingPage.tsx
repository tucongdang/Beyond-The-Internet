import React from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Shield, Users, Tv, Sparkles, ArrowRight, Zap, Radio, Activity } from 'lucide-react';
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

  return (
    <div className="min-h-[100dvh] w-full bg-transparent relative overflow-x-hidden overflow-y-auto flex flex-col items-center justify-center text-[#F5EFF9] p-4 sm:p-8 pb-20 select-none">
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center py-8 sm:py-14">
        
        {/* Top Horizon Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 fluent-box-nested rounded-[4px] text-xs font-mono font-bold tracking-widest text-[#F7CAC9] mb-6 shadow-sm border border-[#F7CAC9]/20 animate-fadeIn">
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
        
        <p className="text-sm sm:text-base md:text-lg text-[#B6A6D8] max-w-2xl mx-auto mb-10 font-normal leading-relaxed">
          {localLanguage === 'en'
            ? 'Real-time interactive academic arena. Ultra-fast synchronization between Audience, Organizers, and Stage LED Screen.'
            : 'Đấu trường tương tác trực tiếp học thuật thời gian thực. Đồng bộ siêu tốc giữa Khán Giả, Ban Tổ Chức và Màn Chiếu Sân Khấu LED.'}
        </p>

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
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:border-[#F7CAC9]/60 hover:shadow-xl hover:shadow-[#F7CAC9]/10 active:scale-98 cursor-pointer"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-[#F7CAC9]/15 backdrop-blur-md rounded-[4px] flex items-center justify-center text-[#F7CAC9] font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-[#F7CAC9]/25">
              <Users className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-[#F7CAC9] transition-colors">
              {localLanguage === 'en' ? 'Audience' : 'Khán Giả'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage === 'en'
                ? 'Join live voting, answer contest questions, and accumulate competitive points.'
                : 'Tham gia bình chọn trực tiếp, trả lời câu hỏi và tích lũy điểm số thi đấu.'}
            </p>
            <div className="mt-auto inline-flex items-center gap-1.5 text-[#F7CAC9] font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
              <span>{localLanguage === 'en' ? 'Enter Arena' : 'Vào Sàn Đấu'}</span>
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
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-xl hover:shadow-sky-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-sky-500/15 backdrop-blur-md rounded-[4px] flex items-center justify-center text-sky-300 font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-sky-400/25">
              <Tv className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-sky-300 transition-colors">
              {localLanguage === 'en' ? 'Stage LED' : 'Màn Chiếu LED'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage === 'en'
                ? 'Fullscreen visual display optimized for the main stage LED screens.'
                : 'Giao diện hiển thị trực quan toàn màn hình dành cho màn LED sân khấu chính.'}
            </p>
            <div className="mt-auto inline-flex items-center gap-1.5 text-sky-300 font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
              <span>{localLanguage === 'en' ? 'Open Projector' : 'Mở Màn Chiếu'}</span>
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
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[12px] transition-all duration-300 hover:-translate-y-1 hover:border-[#B6A6D8]/60 hover:shadow-xl hover:shadow-purple-500/10 active:scale-98 cursor-pointer"
          >
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-purple-500/15 backdrop-blur-md rounded-[4px] flex items-center justify-center text-[#B6A6D8] font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-purple-400/25">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-purple-200 transition-colors">
              {localLanguage === 'en' ? 'Organizers' : 'Ban Tổ Chức'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage === 'en'
                ? 'Coordinate questions, control timers, lock responses, and export data.'
                : 'Điều phối câu hỏi, kiểm soát timer, khóa bình chọn và trích xuất dữ liệu.'}
            </p>
            <div className="mt-auto inline-flex items-center gap-1.5 text-[#B6A6D8] font-bold text-xs uppercase tracking-wider group-hover:text-white transition-colors">
              <span>{localLanguage === 'en' ? 'Control Panel' : 'Bảng Điều Khiển'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* Live Arena Status Pill */}
        {gameState && (
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-[4px] bg-white/5 border border-white/10 text-xs font-mono text-white/70">
            <span className="text-[11px]">{localLanguage === 'en' ? 'Arena status:' : 'Trạng thái sàn đấu:'}</span>
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
                ? (localLanguage === 'en' ? 'In Progress' : 'Đang Diễn Ra')
                : gameState.status === 'LOCKED'
                ? (localLanguage === 'en' ? 'Locked' : 'Đã Khóa')
                : gameState.status === 'REVEAL'
                ? (localLanguage === 'en' ? 'Result Revealed' : 'Công Bố Đáp Án')
                : (localLanguage === 'en' ? 'Waiting to Start' : 'Chờ Khởi Động')}
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
