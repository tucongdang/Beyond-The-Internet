import React, { useCallback } from 'react';
import {
  Monitor,
  MonitorOff,
  BarChart2,
  ListFilter,
  BarChart3,
  Trophy,
  Cloud,
  Layers,
  Sparkles,
  Crown,
  Gift,
  HelpCircle,
  Eye,
  CheckCircle2,
  Radio,
  Tv,
  Megaphone,
  Heart,
  Activity,
  Maximize2
} from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';

interface ProjectorControlHubProps {
  gameState: GameState;
  activeCount: number;
  triggerHudToast?: (keyLabel: string, actionDesc: string) => void;
  openConfirm?: (
    title: string,
    message: string,
    onConfirm: () => void,
    confirmText?: string,
    isDanger?: boolean
  ) => void;
  onOpenLightShow?: () => void;
  onOpenGrandFinale?: () => void;
  onOpenLuckyDraw?: () => void;
  onOpenEmergencyPoll?: () => void;
  className?: string;
  isCompact?: boolean;
}

export const ProjectorControlHub: React.FC<ProjectorControlHubProps> = ({
  gameState,
  activeCount,
  triggerHudToast,
  openConfirm,
  onOpenLightShow,
  onOpenGrandFinale,
  onOpenLuckyDraw,
  onOpenEmergencyPoll,
  className = '',
  isCompact = false
}) => {
  const triggerHaptic = (pattern: number | number[] = 60) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  const activeMode = gameState.projector_view_mode || (
    gameState.show_summary ? 'LEADERBOARD' :
    gameState.show_word_cloud ? 'WORD_CLOUD' :
    'DEFAULT'
  );

  const handleSetProjectorMode = useCallback((mode: 'DEFAULT' | 'BAR_CHART' | 'RESPONSE_LIST' | 'HEATMAP' | 'LEADERBOARD' | 'WORD_CLOUD') => {
    triggerHaptic(50);
    soundFx.playClick();
    
    const updates: Partial<GameState> = {
      projector_view_mode: mode,
      show_summary: mode === 'LEADERBOARD',
      show_word_cloud: mode === 'WORD_CLOUD'
    };

    syncService.updateGameState(updates);

    const modeLabels: Record<string, string> = {
      DEFAULT: 'Thẻ Câu Hỏi & Phương Án',
      BAR_CHART: 'Biểu Đồ Cột Phân Bố',
      RESPONSE_LIST: 'Danh Sách Phản Hồi Trực Tiếp',
      HEATMAP: 'Bản Đồ Nhiệt Heatmap',
      LEADERBOARD: 'Bảng Xếp Hạng Top 5 / Tổng Kết',
      WORD_CLOUD: 'Đám Mây Từ Khóa Trực Tiếp'
    };

    if (triggerHudToast) {
      triggerHudToast('PROJECTOR', `Màn chiếu: ${modeLabels[mode] || mode}`);
    }
  }, [triggerHudToast]);

  const handleToggleDim = useCallback(() => {
    triggerHaptic(80);
    soundFx.playClick();
    const nextDim = !gameState.projector_dimmed;
    syncService.updateGameState({ projector_dimmed: nextDim });
    if (triggerHudToast) {
      triggerHudToast('STAGE', nextDim ? 'Đã ẩn tối màn chiếu LED' : 'Đã hiện màn chiếu LED');
    }
  }, [gameState.projector_dimmed, triggerHudToast]);

  const showShoutMarquee = gameState.projector_show_shout_marquee !== false;
  const showCheerMeter = gameState.projector_show_cheer_meter !== false;
  const isCheerExpanded = !!gameState.projector_cheer_expanded;

  const handleToggleShoutMarquee = useCallback(() => {
    triggerHaptic(50);
    soundFx.playClick();
    const next = !showShoutMarquee;
    syncService.updateGameState({ projector_show_shout_marquee: next });
    if (triggerHudToast) {
      triggerHudToast('PROJECTOR', next ? 'Đã hiện Tiếng Hô Khán Giả trên màn chiếu' : 'Đã ẩn Tiếng Hô Khán Giả trên màn chiếu');
    }
  }, [showShoutMarquee, triggerHudToast]);

  const handleToggleCheerMeter = useCallback(() => {
    triggerHaptic(50);
    soundFx.playClick();
    const next = !showCheerMeter;
    syncService.updateGameState({ projector_show_cheer_meter: next });
    if (triggerHudToast) {
      triggerHudToast('PROJECTOR', next ? 'Đã hiện Nhịp Tim Cổ Vũ trên màn chiếu' : 'Đã ẩn Nhịp Tim Cổ Vũ trên màn chiếu');
    }
  }, [showCheerMeter, triggerHudToast]);

  const handleToggleCheerExpanded = useCallback(() => {
    triggerHaptic(50);
    soundFx.playClick();
    const next = !isCheerExpanded;
    syncService.updateGameState({
      projector_cheer_expanded: next,
      projector_show_cheer_meter: true
    });
    if (triggerHudToast) {
      triggerHudToast('PROJECTOR', next ? 'Đã mở rộng Bảng EKG trên màn chiếu' : 'Đã thu gọn Bảng EKG trên màn chiếu');
    }
  }, [isCheerExpanded, triggerHudToast]);

  return (
    <div className={`fluent-box rounded-[2px] p-3 sm:p-4 border border-purple-500/30 shadow-xl space-y-3.5 ${className}`}>
      {/* Header Row: Title, Stage Live Badge, Dim Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-[2px] bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shadow-inner">
            <Tv className="w-4 h-4 text-purple-300 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-white uppercase tracking-wider">
                Điều Khiển Màn Chiếu Sân Khấu (Projector Remote)
              </h3>
              <span className={`px-2 py-0.5 rounded-[2px] font-mono text-[9px] font-bold border flex items-center gap-1 ${
                gameState.projector_dimmed
                  ? 'bg-purple-950 text-purple-300 border-purple-500/60 animate-pulse'
                  : 'bg-emerald-950 text-emerald-300 border-emerald-500/40'
              }`}>
                <Radio className="w-2.5 h-2.5" />
                {gameState.projector_dimmed ? 'MÀN CHIẾU ĐANG ẨN (STEALTH)' : 'STAGE LIVE FEED'}
              </span>
            </div>
            <p className="text-[10px] text-white/50">
              Điều hướng các chế độ hiển thị trên màn hình LED lớn sân khấu độc lập với màn hình Quản trị
            </p>
          </div>
        </div>

        {/* Quick Projector Stealth Dim & Unified Auto-Fit Indicator */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] bg-emerald-950/40 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-medium shadow-sm">
            <Maximize2 className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Tự Động Scale Khít Màn (Unified)</span>
          </div>

          {/* Stealth Dim button */}
          <button
            type="button"
            onClick={handleToggleDim}
            className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              gameState.projector_dimmed
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/40 ring-1 ring-purple-300'
                : 'bg-purple-950/40 text-purple-300 hover:bg-purple-900/50 border-purple-500/40'
            }`}
            title="Bật/Tắt ẩn tối màn chiếu LED tạm thời"
          >
            {gameState.projector_dimmed ? <MonitorOff className="w-3.5 h-3.5 text-white" /> : <Monitor className="w-3.5 h-3.5 text-purple-300" />}
            <span>{gameState.projector_dimmed ? 'Đang Ẩn Màn' : 'Ẩn Màn Chiếu'}</span>
          </button>
        </div>
      </div>

      {/* Main Mode Switcher Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
        {/* 1. Mặc Định (Thẻ câu hỏi & Phương án) */}
        <button
          type="button"
          onClick={() => handleSetProjectorMode('DEFAULT')}
          className={`group relative p-2.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
            activeMode === 'DEFAULT'
              ? 'bg-gradient-to-br from-purple-900/80 to-[#1e1035] border-purple-400 text-white shadow-lg shadow-purple-950/60 ring-1 ring-purple-400'
              : 'fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white border-white/10 hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center ${
              activeMode === 'DEFAULT' ? 'bg-purple-500 text-white' : 'bg-white/5 text-purple-300 border border-white/10'
            }`}>
              <Layers className="w-3.5 h-3.5" />
            </div>
            {activeMode === 'DEFAULT' && (
              <span className="w-2 h-2 rounded-[2px] bg-purple-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="font-bold text-[11px] leading-tight">Thẻ Câu Hỏi</div>
            <div className="text-[9px] text-white/50 truncate">Giao diện gốc</div>
          </div>
        </button>

        {/* 2. Biểu Đồ Cột (Bar Chart) */}
        <button
          type="button"
          onClick={() => handleSetProjectorMode('BAR_CHART')}
          className={`group relative p-2.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
            activeMode === 'BAR_CHART'
              ? 'bg-gradient-to-br from-purple-800 to-indigo-950 border-purple-300 text-white shadow-lg shadow-purple-950/60 ring-1 ring-purple-300'
              : 'fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white border-white/10 hover:border-purple-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center ${
              activeMode === 'BAR_CHART' ? 'bg-purple-500 text-white animate-bounce' : 'bg-white/5 text-purple-300 border border-white/10'
            }`}>
              <BarChart2 className="w-3.5 h-3.5" />
            </div>
            {activeMode === 'BAR_CHART' && (
              <span className="w-2 h-2 rounded-[2px] bg-purple-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="font-bold text-[11px] leading-tight">Biểu Đồ Cột</div>
            <div className="text-[9px] text-white/50 truncate">Tỷ lệ bình chọn</div>
          </div>
        </button>

        {/* 3. DS Phản Hồi (Response List) */}
        <button
          type="button"
          onClick={() => handleSetProjectorMode('RESPONSE_LIST')}
          className={`group relative p-2.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
            activeMode === 'RESPONSE_LIST'
              ? 'bg-gradient-to-br from-sky-900 to-blue-950 border-sky-400 text-white shadow-lg shadow-sky-950/60 ring-1 ring-sky-400'
              : 'fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white border-white/10 hover:border-sky-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center ${
              activeMode === 'RESPONSE_LIST' ? 'bg-sky-500 text-slate-950' : 'bg-white/5 text-sky-300 border border-white/10'
            }`}>
              <ListFilter className="w-3.5 h-3.5" />
            </div>
            {activeMode === 'RESPONSE_LIST' && (
              <span className="w-2 h-2 rounded-[2px] bg-sky-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="font-bold text-[11px] leading-tight">DS Phản Hồi</div>
            <div className="text-[9px] text-white/50 truncate">Luồng đáp án tươi</div>
          </div>
        </button>

        {/* 4. Bản Đồ Nhiệt (Heatmap) */}
        <button
          type="button"
          onClick={() => handleSetProjectorMode('HEATMAP')}
          className={`group relative p-2.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
            activeMode === 'HEATMAP'
              ? 'bg-gradient-to-br from-rose-900 to-orange-950 border-rose-400 text-white shadow-lg shadow-rose-950/60 ring-1 ring-rose-400'
              : 'fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white border-white/10 hover:border-rose-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center ${
              activeMode === 'HEATMAP' ? 'bg-rose-500 text-white' : 'bg-white/5 text-rose-300 border border-white/10'
            }`}>
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            {activeMode === 'HEATMAP' && (
              <span className="w-2 h-2 rounded-[2px] bg-rose-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="font-bold text-[11px] leading-tight">Bản Đồ Nhiệt</div>
            <div className="text-[9px] text-white/50 truncate">Phân phối màu</div>
          </div>
        </button>

        {/* 5. Bảng Xếp Hạng (Leaderboard / Summary) */}
        <button
          type="button"
          onClick={() => handleSetProjectorMode('LEADERBOARD')}
          className={`group relative p-2.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
            activeMode === 'LEADERBOARD'
              ? 'bg-gradient-to-br from-amber-900 to-yellow-950 border-amber-400 text-white shadow-lg shadow-amber-950/60 ring-1 ring-amber-400'
              : 'fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white border-white/10 hover:border-amber-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center ${
              activeMode === 'LEADERBOARD' ? 'bg-amber-500 text-slate-950' : 'bg-white/5 text-amber-300 border border-white/10'
            }`}>
              <Trophy className="w-3.5 h-3.5" />
            </div>
            {activeMode === 'LEADERBOARD' && (
              <span className="w-2 h-2 rounded-[2px] bg-amber-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="font-bold text-[11px] leading-tight">Bảng Xếp Hạng</div>
            <div className="text-[9px] text-white/50 truncate">Top 5 & Điểm số</div>
          </div>
        </button>

        {/* 6. Đám Mây Từ Khóa (Word Cloud) */}
        <button
          type="button"
          onClick={() => handleSetProjectorMode('WORD_CLOUD')}
          className={`group relative p-2.5 rounded-[2px] border text-left transition-all cursor-pointer flex flex-col justify-between gap-2 select-none ${
            activeMode === 'WORD_CLOUD'
              ? 'bg-gradient-to-br from-pink-900 to-purple-950 border-pink-400 text-white shadow-lg shadow-pink-950/60 ring-1 ring-pink-400'
              : 'fluent-box-nested hover:fluent-box-nested text-white/70 hover:text-white border-white/10 hover:border-pink-500/40'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center ${
              activeMode === 'WORD_CLOUD' ? 'bg-[#F7CAC9] text-[#190839]' : 'bg-white/5 text-pink-300 border border-white/10'
            }`}>
              <Cloud className="w-3.5 h-3.5" />
            </div>
            {activeMode === 'WORD_CLOUD' && (
              <span className="w-2 h-2 rounded-[2px] bg-pink-400 animate-ping" />
            )}
          </div>
          <div>
            <div className="font-bold text-[11px] leading-tight">Đám Mây Từ Khóa</div>
            <div className="text-[9px] text-white/50 truncate">Từ khóa nổi bật</div>
          </div>
        </button>
      </div>

      {/* Audience Overlays Remote Control Row */}
      <div className="flex items-center justify-between gap-2 flex-wrap pt-2 border-t border-white/10 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1 shrink-0">
            <Radio className="w-3 h-3 text-pink-400" />
            Lớp Phủ Màn Chiếu:
          </span>

          {/* Toggle Shout Marquee */}
          <button
            type="button"
            onClick={handleToggleShoutMarquee}
            className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              showShoutMarquee
                ? 'bg-pink-950/80 text-pink-300 border-pink-500/60 shadow-sm'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
            }`}
            title="Bật/Tắt hiển thị dải tiếng hô khán giả trên màn chiếu"
          >
            <Megaphone className={`w-3 h-3 ${showShoutMarquee ? 'text-pink-300' : 'text-white/40'}`} />
            <span>{showShoutMarquee ? '📣 Tiếng Hô: ĐANG BẬT' : '📣 Tiếng Hô: ĐÃ TẮT'}</span>
          </button>

          {/* Toggle Cheer Meter */}
          <button
            type="button"
            onClick={handleToggleCheerMeter}
            className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              showCheerMeter
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/60 shadow-sm'
                : 'bg-white/5 text-white/40 border-white/10 hover:text-white'
            }`}
            title="Bật/Tắt hiển thị thanh nhịp tim cổ vũ trên màn chiếu"
          >
            <Heart className={`w-3 h-3 ${showCheerMeter ? 'text-rose-400 fill-rose-400' : 'text-white/40'}`} />
            <span>{showCheerMeter ? '💓 Nhịp Tim: ĐANG BẬT' : '💓 Nhịp Tim: ĐÃ TẮT'}</span>
          </button>

          {/* Toggle Cheer Expanded EKG */}
          {showCheerMeter && (
            <button
              type="button"
              onClick={handleToggleCheerExpanded}
              className={`px-2 py-1 rounded-[2px] font-mono text-[10px] font-bold border transition flex items-center gap-1 cursor-pointer ${
                isCheerExpanded
                  ? 'bg-purple-900/80 text-purple-200 border-purple-400 shadow-sm'
                  : 'bg-white/5 text-white/50 border-white/10 hover:text-white'
              }`}
              title="Mở rộng / Thu gọn lưới EKG nhịp tim chi tiết trên màn chiếu"
            >
              <Activity className="w-3 h-3 text-purple-300" />
              <span>{isCheerExpanded ? 'Thu Gọn EKG' : 'Mở Rộng EKG'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Special Stage Ceremonies & Overlays Bar */}
      <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-white/10 text-xs">
        <span className="text-[10px] font-mono uppercase tracking-wider text-white/50 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3 h-3 text-amber-400" />
          Hiệu Ứng Sân Khấu:
        </span>

        {/* Light Show Trigger */}
        {onOpenLightShow && (
          <button
            type="button"
            onClick={onOpenLightShow}
            className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              gameState.audience_light_show?.active
                ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                : 'bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 border-amber-500/30'
            }`}
          >
            <Sparkles className="w-3 h-3 text-amber-300" />
            <span>Biển Ánh Sáng Khán Phòng</span>
          </button>
        )}

        {/* Grand Finale Trigger */}
        {onOpenGrandFinale && (
          <button
            type="button"
            onClick={onOpenGrandFinale}
            className="px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold bg-amber-950/40 text-amber-300 hover:bg-amber-900/50 border border-amber-500/30 transition flex items-center gap-1.5 cursor-pointer"
          >
            <Crown className="w-3 h-3 text-amber-400" />
            <span>Lễ Đăng Quang (Grand Finale)</span>
          </button>
        )}

        {/* Lucky Draw Trigger */}
        {onOpenLuckyDraw && (
          <button
            type="button"
            onClick={onOpenLuckyDraw}
            className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              gameState.active_module === 'LUCKY_DRAW'
                ? 'bg-purple-600 text-white border-purple-400 shadow-md'
                : 'bg-purple-950/30 text-purple-300 hover:bg-purple-900/40 border-purple-500/30'
            }`}
          >
            <Gift className="w-3 h-3 text-purple-300" />
            <span>Vòng Quay May Mắn</span>
          </button>
        )}

        {/* Emergency Poll Trigger */}
        {onOpenEmergencyPoll && (
          <button
            type="button"
            onClick={onOpenEmergencyPoll}
            className={`px-2.5 py-1 rounded-[2px] font-mono text-[10px] font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED'
                ? 'bg-rose-600 text-white border-rose-400 shadow-md'
                : 'bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 border-rose-500/30'
            }`}
          >
            <HelpCircle className="w-3 h-3 text-rose-300" />
            <span>Khảo Sát Khẩn Cấp</span>
          </button>
        )}
      </div>
    </div>
  );
};
