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
    <div className="w-full min-h-full bg-transparent relative flex flex-col items-center justify-start text-[#F5EFF9] px-4 py-4 sm:p-6 pb-20 select-none">
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center text-center my-auto py-2 sm:py-4">
        
        {/* Top Centered Brand Identity Header */}
        <div className="flex flex-col items-center text-center space-y-2.5 sm:space-y-3 max-w-3xl mx-auto mb-5 sm:mb-6">
          {/* Top Horizon Badge */}
          <div className="inline-flex items-center justify-center gap-2 text-xs font-mono font-bold tracking-widest text-[#F7CAC9]">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#F7CAC9] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#F7CAC9]"></span>
            </span>
            <span className="text-white/85 font-mono text-[11px] uppercase tracking-wider">
              {localLanguage !== 'vi' ? 'Real-time Academic Interactive Arena' : 'Đấu Trường Học Thuật Tương Tác Trực Tiếp'}
            </span>
          </div>

          {/* Official Brand Logo (Centered) */}
          <div className="relative flex items-center justify-center w-full py-0.5">
            <BrandLogo variant="square" size="xl" />
            <h1 className="sr-only">Beyond The Internet 2027</h1>
          </div>
          
          {/* Tagline / Description (Centered) */}
          <p className="text-sm sm:text-base text-[#B6A6D8] font-normal leading-relaxed max-w-2xl mx-auto">
            {localLanguage !== 'vi'
              ? 'Join the live academic arena, test your wits across every round, and cheer on the contestants right from the hall.'
              : 'Cùng hòa nhịp tranh tài trực tiếp, thử sức qua từng câu hỏi hóc búa và tiếp lửa cho các thí sinh ngay tại hội trường.'}
          </p>

          {/* Live Arena Status (Centered) */}
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

        {/* Main 2-Column Arena Hub */}
        {isScheduleActive ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 w-full max-w-6xl mx-auto mb-6 items-stretch text-left">
            
            {/* Left Column: Compact Real-time Countdown & Schedule Widget */}
            <div className="lg:col-span-6 flex">
              <TimeEstimator gameState={gameState} className="w-full h-full" />
            </div>

            {/* Right Column: Action Portal Cards */}
            <div className="lg:col-span-6 flex flex-col gap-4 justify-between h-full">
              
              {/* Featured Primary Focal Anchor - Audience & Players Card */}
              <button 
                type="button"
                id="portal-btn-audience"
                onClick={() => { 
                  vibrateTap();
                  soundFx.playClick(); 
                  onEnterAudience(); 
                }}
                className="group relative flex flex-col items-start text-left p-5 fluent-box rounded-[2px] border-[#F7CAC9]/45 bg-gradient-to-b from-[#2A1052]/90 via-[#200c40]/90 to-[#160834]/95 shadow-[0_14px_40px_-4px_rgba(247,202,201,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-[#F7CAC9]/85 hover:shadow-[0_20px_48px_-4px_rgba(247,202,201,0.28)] active:scale-98 cursor-pointer overflow-hidden justify-between"
              >
                <span className="hidden sm:inline-flex absolute top-3 right-3 px-1.5 py-0.5 rounded-[2px] bg-white/10 border border-white/15 text-[10px] font-mono text-white/60">
                  [1]
                </span>
                <div className="flex items-start gap-4 mb-3.5 pr-8">
                  <div className="w-12 h-12 shrink-0 bg-[#F7CAC9]/20 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#F7CAC9] font-bold shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-[#F7CAC9]/40">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-extrabold text-[#F5EFF9] mb-1 group-hover:text-[#F7CAC9] transition-colors">
                      {localLanguage !== 'vi' ? 'Audience & Players' : 'Khán Giả & Người Tham Gia'}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#E2D9F3]/90 leading-relaxed">
                      {localLanguage !== 'vi'
                        ? 'Answer live questions alongside contestants, climb the leaderboard, and cheer for your favorite contestant.'
                        : 'Đồng hành giải câu hỏi cùng thí sinh, tích lũy điểm thưởng trên bảng vàng và tiếp lửa cho thí sinh yêu thích.'}
                    </p>
                  </div>
                </div>
                <div className="w-full py-2.5 px-4 rounded-[2px] bg-[#F7CAC9] text-[#190839] font-extrabold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-md group-hover:bg-white transition-colors mt-auto">
                  <span>{localLanguage !== 'vi' ? 'Enter Arena' : 'Vào Sàn Đấu Ngay'}</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

              {/* Bottom Operations Cards Side-by-Side (Stage LED + Admin MC) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                
                {/* Projector LED Card */}
                <button 
                  type="button"
                  id="portal-btn-projector"
                  onClick={() => { 
                    vibrateTap();
                    soundFx.playClick(); 
                    onEnterProjector(); 
                  }}
                  className="group relative flex flex-col text-left p-4 fluent-box rounded-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-xl hover:shadow-sky-500/10 active:scale-98 cursor-pointer justify-between"
                >
                  <span className="hidden sm:inline-flex absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-[10px] font-mono text-white/45">
                    [2]
                  </span>
                  <div className="flex items-start gap-3 mb-3 pr-7">
                    <div className="w-10 h-10 shrink-0 bg-sky-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-sky-300 font-bold shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-sky-400/25">
                      <Tv className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#F5EFF9] mb-1 group-hover:text-sky-300 transition-colors">
                        {localLanguage !== 'vi' ? 'Stage LED Screen' : 'Màn Chiếu Sân Khấu'}
                      </h3>
                      <p className="text-[11px] text-[#B6A6D8]/85 leading-relaxed line-clamp-2">
                        {localLanguage !== 'vi'
                          ? 'Live stage display showing questions, countdowns, and real-time hall results.'
                          : 'Trình chiếu câu hỏi, đồng hồ đếm ngược và bảng điểm trực tiếp.'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full py-2 px-3 rounded-[2px] bg-sky-500/15 border border-sky-400/30 text-sky-200 font-bold text-[11px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 group-hover:bg-sky-500/25 group-hover:text-white transition-colors mt-auto">
                    <span>{localLanguage !== 'vi' ? 'Open Stage View' : 'Mở Màn Chiếu'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
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
                  className="group relative flex flex-col text-left p-4 fluent-box rounded-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-[#B6A6D8]/60 hover:shadow-xl hover:shadow-purple-500/10 active:scale-98 cursor-pointer justify-between"
                >
                  <span className="hidden sm:inline-flex absolute top-2.5 right-2.5 px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-[10px] font-mono text-white/45">
                    [3]
                  </span>
                  <div className="flex items-start gap-3 mb-3 pr-7">
                    <div className="w-10 h-10 shrink-0 bg-purple-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#B6A6D8] font-bold shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-purple-400/25">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-[#F5EFF9] mb-1 group-hover:text-purple-200 transition-colors">
                        {localLanguage !== 'vi' ? 'Organizers & MC' : 'Ban Tổ Chức & MC'}
                      </h3>
                      <p className="text-[11px] text-[#B6A6D8]/85 leading-relaxed line-clamp-2">
                        {localLanguage !== 'vi'
                          ? 'Manage contest rounds, trigger stage timers, moderate Q&A, and review scores.'
                          : 'Dẫn dắt vòng thi, mở câu hỏi sân khấu và duyệt giao lưu hỏi đáp.'}
                      </p>
                    </div>
                  </div>
                  <div className="w-full py-2 px-3 rounded-[2px] bg-purple-500/15 border border-purple-400/30 text-[#E2D9F3] font-bold text-[11px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 group-hover:bg-purple-500/25 group-hover:text-white transition-colors mt-auto">
                    <span>{localLanguage !== 'vi' ? 'Control Panel' : 'Bàn Điều Khiển'}</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

              </div>

            </div>

          </div>
        ) : (
          /* Fallback 2-Column Action Portal Cards when schedule is inactive */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 w-full max-w-4xl mx-auto mb-8 items-stretch">
            
            {/* Column 1: Primary Focal Anchor - Audience & Players Card */}
            <button 
              type="button"
              id="portal-btn-audience"
              onClick={() => { 
                vibrateTap();
                soundFx.playClick(); 
                onEnterAudience(); 
              }}
              className="group relative flex flex-col items-center sm:items-start text-center sm:text-left p-6 sm:p-7 fluent-box rounded-[2px] border-[#F7CAC9]/45 bg-gradient-to-b from-[#2A1052]/90 via-[#200c40]/90 to-[#160834]/95 shadow-[0_14px_40px_-4px_rgba(247,202,201,0.16)] transition-all duration-300 hover:-translate-y-1 hover:border-[#F7CAC9]/85 hover:shadow-[0_20px_48px_-4px_rgba(247,202,201,0.28)] active:scale-98 cursor-pointer overflow-hidden h-full justify-between"
            >
              <span className="hidden sm:inline-flex absolute top-3 right-3 px-1.5 py-0.5 rounded-[2px] bg-white/10 border border-white/15 text-[10px] font-mono text-white/60">
                [1]
              </span>
              <div>
                <div className="w-14 h-14 sm:w-16 sm:h-16 bg-[#F7CAC9]/20 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#F7CAC9] font-bold mb-4 shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-[#F7CAC9]/40">
                  <Users className="w-7 h-7 sm:w-8 sm:h-8" />
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-[#F5EFF9] mb-1.5 group-hover:text-[#F7CAC9] transition-colors">
                  {localLanguage !== 'vi' ? 'Audience & Players' : 'Khán Giả & Người Tham Gia'}
                </h2>
                <p className="text-xs sm:text-sm text-[#E2D9F3]/90 mb-5 leading-relaxed">
                  {localLanguage !== 'vi'
                    ? 'Answer live questions alongside contestants, climb the leaderboard, and cheer for your favorite contestant.'
                    : 'Đồng hành giải câu hỏi cùng thí sinh, tích lũy điểm thưởng trên bảng vàng và tiếp lửa cho thí sinh yêu thích.'}
                </p>
              </div>
              <div className="w-full py-2.5 px-4 rounded-[2px] bg-[#F7CAC9] text-[#190839] font-extrabold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-2 shadow-md group-hover:bg-white transition-colors mt-auto">
                <span>{localLanguage !== 'vi' ? 'Enter Arena' : 'Vào Sàn Đấu Ngay'}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </button>

            {/* Column 2: Stack of Operations Cards (Stage LED + Admin MC) */}
            <div className="flex flex-col gap-4 justify-between h-full">
              
              {/* Projector LED Card */}
              <button 
                type="button"
                id="portal-btn-projector"
                onClick={() => { 
                  vibrateTap();
                  soundFx.playClick(); 
                  onEnterProjector(); 
                }}
                className="group relative flex flex-col text-left p-5 sm:p-6 fluent-box rounded-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-xl hover:shadow-sky-500/10 active:scale-98 cursor-pointer flex-1 justify-between"
              >
                <span className="hidden sm:inline-flex absolute top-3 right-3 px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-[10px] font-mono text-white/45">
                  [2]
                </span>
                <div className="flex items-start gap-4 mb-2">
                  <div className="w-11 h-11 shrink-0 bg-sky-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-sky-300 font-bold shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-sky-400/25">
                    <Tv className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5EFF9] mb-1 group-hover:text-sky-300 transition-colors">
                      {localLanguage !== 'vi' ? 'Stage LED Screen' : 'Màn Chiếu Sân Khấu'}
                    </h3>
                    <p className="text-xs text-[#B6A6D8]/85 leading-relaxed line-clamp-2">
                      {localLanguage !== 'vi'
                        ? 'Live stage display showing questions, countdowns, and real-time hall results.'
                        : 'Trình chiếu câu hỏi, đồng hồ đếm ngược và bảng điểm trực tiếp trên màn hình lớn.'}
                    </p>
                  </div>
                </div>
                <div className="w-full py-2 px-3 rounded-[2px] bg-sky-500/15 border border-sky-400/30 text-sky-200 font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 group-hover:bg-sky-500/25 group-hover:text-white transition-colors mt-2">
                  <span>{localLanguage !== 'vi' ? 'Open Stage View' : 'Mở Màn Chiếu'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
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
                className="group relative flex flex-col text-left p-5 sm:p-6 fluent-box rounded-[2px] transition-all duration-300 hover:-translate-y-1 hover:border-[#B6A6D8]/60 hover:shadow-xl hover:shadow-purple-500/10 active:scale-98 cursor-pointer flex-1 justify-between"
              >
                <span className="hidden sm:inline-flex absolute top-3 right-3 px-1.5 py-0.5 rounded-[2px] bg-white/5 border border-white/10 text-[10px] font-mono text-white/45">
                  [3]
                </span>
                <div className="flex items-start gap-4 mb-2">
                  <div className="w-11 h-11 shrink-0 bg-purple-500/15 backdrop-blur-md rounded-[2px] flex items-center justify-center text-[#B6A6D8] font-bold shadow-md shadow-[#0D0420]/50 group-hover:scale-108 transition-transform duration-300 border border-purple-400/25">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-[#F5EFF9] mb-1 group-hover:text-purple-200 transition-colors">
                      {localLanguage !== 'vi' ? 'Organizers & MC' : 'Ban Tổ Chức & MC'}
                    </h3>
                    <p className="text-xs text-[#B6A6D8]/85 leading-relaxed line-clamp-2">
                      {localLanguage !== 'vi'
                        ? 'Manage contest rounds, trigger stage timers, moderate Q&A, and review scores.'
                        : 'Dẫn dắt nhịp độ vòng thi, mở câu hỏi sân khấu và duyệt giao lưu hỏi đáp.'}
                    </p>
                  </div>
                </div>
                <div className="w-full py-2 px-3 rounded-[2px] bg-purple-500/15 border border-purple-400/30 text-[#E2D9F3] font-bold text-xs uppercase tracking-wider inline-flex items-center justify-center gap-1.5 group-hover:bg-purple-500/25 group-hover:text-white transition-colors mt-2">
                  <span>{localLanguage !== 'vi' ? 'Control Panel' : 'Bàn Điều Khiển'}</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </button>

            </div>

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
