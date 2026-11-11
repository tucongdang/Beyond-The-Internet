import React, { useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Shield, Users, Tv, Sparkles, ArrowRight } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';
import { GameState } from '../types';
import { AnnouncerOverlay } from './AnnouncerOverlay';
import { TimeEstimator } from './TimeEstimator';
import { BrandLogo } from './BrandLogo';

interface LandingPageProps {
  onEnterAudience: () => void;
  onEnterAdmin: () => void;
  onEnterProjector: () => void;
  onEnterPolicy?: () => void;
  gameState?: GameState;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onEnterAudience,
  onEnterAdmin,
  onEnterProjector,
  onEnterPolicy,
  gameState
}) => {
  const { localLanguage } = useLanguage();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) {
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === '1') {
        e.preventDefault();
        vibrateTap();
        soundFx.playClick();
        onEnterAudience();
      } else if (e.key === '2') {
        e.preventDefault();
        vibrateTap();
        soundFx.playClick();
        onEnterProjector();
      } else if (e.key === '3') {
        e.preventDefault();
        vibrateTap();
        soundFx.playClick();
        onEnterAdmin();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEnterAudience, onEnterProjector, onEnterAdmin]);

  const schedule = gameState?.event_schedule;
  const isScheduleActive = Boolean(schedule?.enabled || (schedule?.scheduled_start_time || 0) > 0 || schedule?.status);

  return (
    <div className="w-full min-h-full bg-transparent relative flex flex-col items-center justify-start text-[#F5EFF9] px-4 py-6 sm:p-8 pb-24 select-none">
      <div className="relative z-10 w-full max-w-5xl mx-auto flex flex-col items-center text-center my-auto py-4 sm:py-8">
        
        {/* Top Horizon Badge */}
        <div className="flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-widest text-[#F7CAC9] mb-4">
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7CAC9] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7CAC9]"></span>
          </span>
          <span className="text-white/85 font-mono text-[11px] uppercase tracking-wider">
            {localLanguage !== 'vi' ? 'Real-time Academic Interactive Arena' : 'Đấu Trường Học Thuật Tương Tác Trực Tiếp'}
          </span>
        </div>

        {/* Official Compact Brand Logo (No Redundant Visible Title) */}
        <div className="relative mb-4 flex items-center justify-center">
          <BrandLogo variant="landscape" size="xl" />
          <h1 className="sr-only">Beyond The Internet 2027</h1>
        </div>
        
        <p className="text-sm sm:text-base md:text-lg text-[#B6A6D8] max-w-2xl mx-auto mb-8 font-normal leading-relaxed">
          {localLanguage !== 'vi'
            ? 'Join the live academic arena, test your wits across every round, and cheer on the contestants right from the hall.'
            : 'Cùng hòa nhịp tranh tài trực tiếp, thử sức qua từng câu hỏi hóc búa và tiếp lửa cho các thí sinh ngay tại hội trường.'}
        </p>

        {/* Real-time Round Time Estimator & Schedule Widget */}
        {isScheduleActive && (
          <TimeEstimator gameState={gameState} className="max-w-2xl mx-auto mb-10 text-left" />
        )}

        {/* 3 Action Portal Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6 w-full max-w-4xl mx-auto mb-8 items-stretch">
          
          {/* Primary Focal Anchor: Audience Card (2px Radius, No Top Strip) */}
          <button 
            type="button"
            id="portal-btn-audience"
            onClick={() => { 
              vibrateTap();
              soundFx.playClick(); 
              onEnterAudience(); 
            }}
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[2px] border-[#F7CAC9]/45 bg-gradient-to-b from-[#2A1052]/80 to-[#160834]/90 shadow-[0_14px_40px_-4px_rgba(247,202,201,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-[#F7CAC9]/85 hover:shadow-[0_20px_48px_-4px_rgba(247,202,201,0.28)] active:scale-98 cursor-pointer overflow-hidden"
          >
            <span className="hidden sm:inline-flex absolute top-3 right-3 px-1.5 py-0.5 rounded-[2px] bg-white/10 border border-white/15 text-[10px] font-mono text-white/60">
              [1]
            </span>
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-[#F7CAC9]/20 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#F7CAC9] font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-[#F7CAC9]/40">
              <Users className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-extrabold text-[#F5EFF9] mb-1.5 group-hover:text-[#F7CAC9] transition-colors">
              {localLanguage !== 'vi' ? 'Audience & Players' : 'Khán Giả & Người Tham Gia'}
            </h2>
            <p className="text-xs text-[#E2D9F3]/90 mb-5 leading-relaxed">
              {localLanguage !== 'vi'
                ? 'Answer live questions alongside contestants, climb the leaderboard, and cheer for your favorite contestant.'
                : 'Đồng hành giải câu hỏi cùng thí sinh, tích lũy điểm thưởng trên bảng vàng và tiếp lửa cho thí sinh yêu thích.'}
            </p>
            <div className="mt-auto w-full py-2.5 px-4 rounded-[2px] bg-[#F7CAC9] text-[#190839] font-extrabold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 shadow-md group-hover:bg-white transition-colors">
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
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-xl hover:shadow-sky-500/10 active:scale-98 cursor-pointer"
          >
            <span className="hidden sm:inline-flex absolute top-3 right-3 px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-[10px] font-mono text-white/45">
              [2]
            </span>
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-sky-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-sky-300 font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-sky-400/25">
              <Tv className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-sky-300 transition-colors">
              {localLanguage !== 'vi' ? 'Stage LED Screen' : 'Màn Chiếu Sân Khấu'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage !== 'vi'
                ? 'Live stage display showing questions, countdowns, and real-time hall results for the auditorium.'
                : 'Trình chiếu câu hỏi, đồng hồ đếm ngược và bảng điểm trực tiếp trên màn hình lớn tại hội trường.'}
            </p>
            <div className="mt-auto w-full py-2.5 px-4 rounded-[2px] bg-sky-500/15 border border-sky-400/30 text-sky-200 font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 group-hover:bg-sky-500/25 group-hover:text-white transition-colors">
              <span>{localLanguage !== 'vi' ? 'Open Stage View' : 'Mở Màn Chiếu'}</span>
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
            className="group relative flex flex-col items-center text-center p-6 sm:p-7 fluent-box rounded-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-[#B6A6D8]/60 hover:shadow-xl hover:shadow-purple-500/10 active:scale-98 cursor-pointer"
          >
            <span className="hidden sm:inline-flex absolute top-3 right-3 px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-[10px] font-mono text-white/45">
              [3]
            </span>
            <div className="w-13 h-13 sm:w-14 sm:h-14 bg-purple-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#B6A6D8] font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-purple-400/25">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <h2 className="text-base sm:text-lg font-bold text-[#F5EFF9] mb-1.5 group-hover:text-purple-200 transition-colors">
              {localLanguage !== 'vi' ? 'Organizers & MC' : 'Ban Tổ Chức & Điều Phối'}
            </h2>
            <p className="text-xs text-[#B6A6D8]/85 mb-5 leading-relaxed">
              {localLanguage !== 'vi'
                ? 'Manage contest rounds, trigger stage timers, moderate Q&A, and review official scores.'
                : 'Dẫn dắt nhịp độ vòng thi, mở câu hỏi sân khấu, duyệt giao lưu hỏi đáp và tổng kết điểm số.'}
            </p>
            <div className="mt-auto w-full py-2.5 px-4 rounded-[2px] bg-purple-500/15 border border-purple-400/30 text-[#E2D9F3] font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 group-hover:bg-purple-500/25 group-hover:text-white transition-colors">
              <span>{localLanguage !== 'vi' ? 'Control Panel' : 'Bàn Điều Khiển'}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </button>

        </div>

        {/* Live Arena Status (Clean unboxed typography) */}
        {gameState && (
          <div className="flex items-center justify-center gap-2 text-xs font-mono text-white/70 select-none">
            <span className="text-[11px]">{localLanguage !== 'vi' ? 'Arena status:' : 'Trạng thái sàn đấu:'}</span>
            <span className={`font-bold uppercase tracking-wider flex items-center gap-1.5 ${
              gameState.status === 'ACTIVE'
                ? 'text-emerald-400'
                : gameState.status === 'LOCKED'
                ? 'text-amber-400'
                : gameState.status === 'REVEAL'
                ? 'text-purple-300'
                : 'text-white/50'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                gameState.status === 'ACTIVE'
                  ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]'
                  : gameState.status === 'LOCKED'
                  ? 'bg-amber-400'
                  : gameState.status === 'REVEAL'
                  ? 'bg-purple-400 animate-pulse'
                  : 'bg-white/40'
              }`} />
              <span>
                {gameState.status === 'ACTIVE'
                  ? (localLanguage !== 'vi' ? 'In Progress' : 'Đang Diễn Ra')
                  : gameState.status === 'LOCKED'
                  ? (localLanguage !== 'vi' ? 'Locked' : 'Đã Khóa')
                  : gameState.status === 'REVEAL'
                  ? (localLanguage !== 'vi' ? 'Result Revealed' : 'Công Bố Đáp Án')
                  : (localLanguage !== 'vi' ? 'Waiting to Start' : 'Chờ Khởi Động')}
              </span>
            </span>
          </div>
        )}

      </div>
      
      {/* Footer */}
      <div className="mt-4 pb-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 text-xs font-mono text-[#F7CAC9]/80">
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              if (onEnterPolicy) {
                onEnterPolicy();
              } else if (typeof window !== 'undefined') {
                window.location.href = '?view=policy';
              }
            }}
            className="hover:text-white underline decoration-dotted transition cursor-pointer flex items-center gap-1"
          >
            <span>{localLanguage !== 'vi' ? 'Privacy Policy & Data Protection (Law 91/2025 & Decree 356/2025)' : 'Chính Sách Bảo Vệ Dữ Liệu Cá Nhân (Luật 91/2025 & NĐ 356/2025)'}</span>
          </button>
          <span>•</span>
          <button
            type="button"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              if (onEnterPolicy) {
                onEnterPolicy();
              } else if (typeof window !== 'undefined') {
                window.location.href = '?view=policy';
              }
            }}
            className="hover:text-white underline decoration-dotted transition cursor-pointer"
          >
            <span>{localLanguage !== 'vi' ? 'Contest Terms & AI Transparency' : 'Điều Lệ Cuộc Thi & Minh Bạch AI'}</span>
          </button>
        </div>
        <p className="text-[10px] text-[#B6A6D8]/50 font-mono tracking-widest uppercase">
          {localLanguage !== 'vi'
            ? 'Beyond The Internet 2027 • Academic Gameshow Live System • Version v2.0-pdpd-2027'
            : 'Beyond The Internet 2027 • Hệ Thống Đấu Trường Học Thuật Trực Tiếp • Phiên bản v2.0-pdpd-2027'}
        </p>
      </div>

      {/* Live Broadcast Announcer Marquee Overlay */}
      <AnnouncerOverlay overlay={gameState?.announcer_overlay} mode="waiting" />
    </div>
  );
};
