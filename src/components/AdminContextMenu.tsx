import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Lock,
  Eye,
  RotateCcw,
  ChevronRight,
  Sparkles,
  QrCode,
  Megaphone,
  AlertOctagon,
  Camera,
  Layers,
  BarChart3,
  Volume2,
  Tv,
  Users,
  Home,
  Copy,
  Check,
  RefreshCw,
  Keyboard,
  Radio,
  FileSpreadsheet,
  Activity
} from 'lucide-react';
import { GameState } from '../types';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';

export interface AdminContextMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  gameState: GameState;
  activeAdminTab: string;
  onStartQuestion: () => void;
  onLockVoting: () => void;
  onRevealResults: () => void;
  onReturnToStandby: () => void;
  onNavigateNext: () => void;
  onNavigatePrev: () => void;
  onToggleLiveQr: () => void;
  onOpenAnnouncer: () => void;
  onOpenEmergencyPoll: () => void;
  onOpenShortcuts: () => void;
  onSnapSnapshot: () => void;
  onSwitchTab: (tab: any) => void;
  onViewChange?: (view: 'landing' | 'audience' | 'admin' | 'projector') => void;
  onCopyQuestionText?: () => void;
  onCopyAudienceLink?: () => void;
  onForceResync?: () => void;
  onExportCsv?: () => void;
  onPlaySoundEffect?: (type: 'correct' | 'wrong' | 'start' | 'reveal' | 'pacing' | 'applause') => void;
}

export const AdminContextMenu: React.FC<AdminContextMenuProps> = ({
  isOpen,
  position,
  onClose,
  gameState,
  activeAdminTab,
  onStartQuestion,
  onLockVoting,
  onRevealResults,
  onReturnToStandby,
  onNavigateNext,
  onNavigatePrev,
  onToggleLiveQr,
  onOpenAnnouncer,
  onOpenEmergencyPoll,
  onOpenShortcuts,
  onSnapSnapshot,
  onSwitchTab,
  onViewChange,
  onCopyQuestionText,
  onCopyAudienceLink,
  onForceResync,
  onExportCsv,
  onPlaySoundEffect
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [adjustedPos, setAdjustedPos] = useState({ x: position.x, y: position.y });
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Reposition context menu when opened or position changes so it stays inside viewport
  useEffect(() => {
    if (!isOpen) {
      setActiveSubmenu(null);
      return;
    }

    const updatePosition = () => {
      const menuWidth = 270;
      const menuHeight = 440;
      const padding = 12;

      let x = position.x;
      let y = position.y;

      if (x + menuWidth > window.innerWidth - padding) {
        x = Math.max(padding, window.innerWidth - menuWidth - padding);
      }
      if (y + menuHeight > window.innerHeight - padding) {
        y = Math.max(padding, window.innerHeight - menuHeight - padding);
      }

      setAdjustedPos({ x, y });
    };

    updatePosition();
  }, [isOpen, position]);

  // Click outside and keydown listeners to dismiss menu
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    const handleScroll = (e: Event) => {
      // If scroll is happening INSIDE the context menu, DO NOT close the menu
      if (menuRef.current && (menuRef.current === e.target || menuRef.current.contains(e.target as Node))) {
        return;
      }
      onClose();
    };

    // Use non-capture or careful target checking
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', handleScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleItemClick = (action: () => void) => {
    vibrateTap();
    soundFx.playClick();
    action();
    onClose();
  };

  const handleCopy = (type: string, fn?: () => void) => {
    vibrateSelection();
    soundFx.playClick();
    if (fn) fn();
    setCopiedType(type);
    setTimeout(() => {
      setCopiedType(null);
      onClose();
    }, 600);
  };

  const getStatusBadge = () => {
    switch (gameState.status) {
      case 'ACTIVE':
        return <span className="px-1.5 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-mono font-bold animate-pulse">ACTIVE</span>;
      case 'LOCKED':
        return <span className="px-1.5 py-0.5 rounded-[2px] bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold">LOCKED</span>;
      case 'REVEAL':
        return <span className="px-1.5 py-0.5 rounded-[2px] bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[9px] font-mono font-bold">REVEAL</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded-[2px] bg-slate-500/20 text-slate-300 border border-slate-500/40 text-[9px] font-mono font-bold">STANDBY</span>;
    }
  };

  return (
    <div
      ref={menuRef}
      id="fluent-admin-context-menu"
      className="fixed z-50 w-[270px] select-none text-white animate-fadeIn"
      style={{
        left: `${adjustedPos.x}px`,
        top: `${adjustedPos.y}px`,
        // Fluent 2 Acrylic container styling
        background: 'rgba(21, 7, 44, 0.95)',
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        borderRadius: '4px',
        border: '1px solid rgba(255, 255, 255, 0.15)',
        boxShadow: '0 16px 40px -4px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.15)',
        padding: '6px'
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header telemetry info */}
      <div className="px-2 py-1.5 mb-1 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-blue-400 animate-ping" />
          <span className="text-[10px] font-mono font-bold text-white/90 uppercase tracking-wider">
            {gameState.question_id || 'BTI 2026'}
          </span>
        </div>
        {getStatusBadge()}
      </div>

      <div className="space-y-0.5 max-h-[calc(100vh-120px)] overflow-y-auto scrollbar-none">
        
        {/* SECTION 1: MASTER MATCH CONTROL */}
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300/80 px-2 py-0.5 flex items-center gap-1">
          <Radio className="w-3 h-3 text-purple-400" />
          <span>Điều Khiển Vòng Thi</span>
        </div>

        {gameState.status === 'STANDBY' && (
          <button
            type="button"
            onClick={() => handleItemClick(onStartQuestion)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-emerald-600/30 hover:text-emerald-200 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/40" />
              <span className="font-semibold text-emerald-300">Bắt đầu câu hỏi</span>
            </div>
            <kbd className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded-[2px] border border-white/15 text-emerald-300">
              Space / A
            </kbd>
          </button>
        )}

        {gameState.status === 'ACTIVE' && (
          <button
            type="button"
            onClick={() => handleItemClick(onLockVoting)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-amber-600/30 hover:text-amber-200 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Lock className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-semibold text-amber-300">Khóa nhận đáp án</span>
            </div>
            <kbd className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded-[2px] border border-white/15 text-amber-300">
              Space / L
            </kbd>
          </button>
        )}

        {gameState.status === 'LOCKED' && (
          <button
            type="button"
            onClick={() => handleItemClick(onRevealResults)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-purple-600/30 hover:text-purple-200 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-semibold text-purple-300">Công bố đáp án</span>
            </div>
            <kbd className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded-[2px] border border-white/15 text-purple-300">
              Space / R
            </kbd>
          </button>
        )}

        {gameState.status === 'REVEAL' && (
          <button
            type="button"
            onClick={() => handleItemClick(onReturnToStandby)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-blue-600/30 hover:text-blue-200 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-blue-300">Về chế độ chờ</span>
            </div>
            <kbd className="text-[9px] font-mono bg-white/10 px-1.5 py-0.5 rounded-[2px] border border-white/15 text-blue-300">
              Space / S
            </kbd>
          </button>
        )}

        <div className="grid grid-cols-2 gap-1 pt-0.5">
          <button
            type="button"
            onClick={() => handleItemClick(onNavigatePrev)}
            className="px-2 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
          >
            <span className="truncate">← Câu trước</span>
            <kbd className="text-[9px] font-mono text-white/50 bg-white/5 px-1 py-0.2 border border-white/10 rounded-[2px]">
              P
            </kbd>
          </button>

          <button
            type="button"
            onClick={() => handleItemClick(onNavigateNext)}
            className="px-2 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
          >
            <span className="truncate">Câu tiếp →</span>
            <kbd className="text-[9px] font-mono text-white/50 bg-white/5 px-1 py-0.2 border border-white/10 rounded-[2px]">
              N
            </kbd>
          </button>
        </div>

        <div className="border-b border-white/10 my-1" />

        {/* SECTION 2: LIVE STAGE & INTERACTION TOOLS */}
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300/80 px-2 py-0.5 flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-pink-400" />
          <span>Sân Khấu & Tương Tác</span>
        </div>

        <button
          type="button"
          onClick={() => handleItemClick(onSnapSnapshot)}
          className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Camera className="w-3.5 h-3.5 text-pink-400" />
            <span>📸 Snap Màn Chiếu</span>
          </div>
          <span className="text-[9px] font-mono text-pink-300 bg-pink-500/15 px-1.5 py-0.5 rounded-[2px] border border-pink-500/30">
            Lưu ảnh
          </span>
        </button>

        <button
          type="button"
          onClick={() => handleItemClick(onToggleLiveQr)}
          className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <QrCode className="w-3.5 h-3.5 text-sky-400" />
            <span>Modal QR Khán Giả</span>
          </div>
          <kbd className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded-[2px] border border-white/10">
            Q
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => handleItemClick(onOpenAnnouncer)}
          className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Chữ Chạy Thông Báo</span>
          </div>
          <kbd className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded-[2px] border border-white/10">
            O
          </kbd>
        </button>

        <button
          type="button"
          onClick={() => handleItemClick(onOpenEmergencyPoll)}
          className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
            <span>Khảo Sát Khẩn Cấp</span>
          </div>
          <kbd className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded-[2px] border border-white/10">
            K
          </kbd>
        </button>

        <div className="border-b border-white/10 my-1" />

        {/* SECTION 3: NAVIGATION & SUBMENUS (Inline Accordion Drawers for 100% reliable responsiveness) */}
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300/80 px-2 py-0.5 flex items-center gap-1">
          <Layers className="w-3 h-3 text-amber-400" />
          <span>Điều Hướng & Mô-đun</span>
        </div>

        {/* Submenu 1: Admin Tabs (Inline Accordion) */}
        <div className="rounded-[2px] transition-colors">
          <button
            type="button"
            id="ctx-btn-tabs-submenu"
            onClick={(e) => {
              e.stopPropagation();
              vibrateTap();
              soundFx.playClick();
              setActiveSubmenu(prev => prev === 'tabs' ? null : 'tabs');
            }}
            className={`w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 cursor-pointer ${
              activeSubmenu === 'tabs' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-400/40' : ''
            }`}
          >
            <div className="flex items-center gap-2">
              <BarChart3 className={`w-3.5 h-3.5 ${activeSubmenu === 'tabs' ? 'text-amber-300' : 'text-amber-400'}`} />
              <span>Chuyển Tab Quản Trị</span>
            </div>
            <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${activeSubmenu === 'tabs' ? 'text-amber-300 rotate-90' : 'text-white/40'}`} />
          </button>

          {activeSubmenu === 'tabs' && (
            <div
              id="ctx-drawer-admin-tabs"
              className="mt-1 mb-1 ml-2 mr-0.5 p-1 rounded-[2px] bg-black/50 border border-amber-400/30 space-y-0.5 animate-fadeIn max-h-[220px] overflow-y-auto"
            >
              {[
                { id: 'KDC', label: '1. Khởi Động', kbd: '1' },
                { id: 'VCNV', label: '2. Chướng Ngại Vật', kbd: '2' },
                { id: 'TT', label: '3. Tăng Tốc', kbd: '3' },
                { id: 'VD', label: '4. Về Đích', kbd: '4' },
                { id: 'QUESTIONS', label: '5. Ngân Hàng Câu', kbd: '5' },
                { id: 'STATS', label: '6. Thống Kê / SPSS', kbd: '6' },
                { id: 'LUCKY_DRAW', label: '7. Quay Số May Mắn', kbd: '7' },
                { id: 'SOUND_FX', label: '9. Hiệu Ứng Âm Thanh', kbd: '9' },
                { id: 'QA_MANAGER', label: 'Hỏi Đáp Q&A', kbd: 'Q' },
                { id: 'WORD_CLOUD', label: 'Đám Mây Từ Khóa', kbd: 'W' },
                { id: 'ACTIVITY_LOG', label: 'Nhật Ký Thao Tác', kbd: 'L' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onSwitchTab(tab.id));
                  }}
                  className={`w-full px-2 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between text-left cursor-pointer ${
                    activeAdminTab === tab.id
                      ? 'text-amber-300 font-bold bg-amber-400/20 border border-amber-400/30'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="truncate">{tab.label}</span>
                  <kbd className="text-[9px] font-mono text-white/50 bg-white/5 px-1 rounded-[2px]">{tab.kbd}</kbd>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Submenu 2: Switch Views (Inline Accordion) */}
        {onViewChange && (
          <div className="rounded-[2px] transition-colors">
            <button
              type="button"
              id="ctx-btn-views-submenu"
              onClick={(e) => {
                e.stopPropagation();
                vibrateTap();
                soundFx.playClick();
                setActiveSubmenu(prev => prev === 'views' ? null : 'views');
              }}
              className={`w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 cursor-pointer ${
                activeSubmenu === 'views' ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-400/40' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Tv className={`w-3.5 h-3.5 ${activeSubmenu === 'views' ? 'text-blue-300' : 'text-blue-400'}`} />
                <span>Chuyển Màn Hình</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${activeSubmenu === 'views' ? 'text-blue-300 rotate-90' : 'text-white/40'}`} />
            </button>

            {activeSubmenu === 'views' && (
              <div
                id="ctx-drawer-screen-views"
                className="mt-1 mb-1 ml-2 mr-0.5 p-1 rounded-[2px] bg-black/50 border border-blue-400/30 space-y-0.5 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onViewChange('projector'));
                  }}
                  className="w-full px-2 py-1.5 rounded-[2px] text-xs transition flex items-center gap-2 hover:bg-blue-500/20 text-white/80 hover:text-blue-200 text-left cursor-pointer"
                >
                  <Tv className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Màn Chiếu (Projector)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onViewChange('audience'));
                  }}
                  className="w-full px-2 py-1.5 rounded-[2px] text-xs transition flex items-center gap-2 hover:bg-emerald-500/20 text-white/80 hover:text-emerald-200 text-left cursor-pointer"
                >
                  <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Giao Diện Khán Giả</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onViewChange('landing'));
                  }}
                  className="w-full px-2 py-1.5 rounded-[2px] text-xs transition flex items-center gap-2 hover:bg-amber-500/20 text-white/80 hover:text-amber-200 text-left cursor-pointer"
                >
                  <Home className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>Trang Chủ (Landing)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Submenu 3: Quick Sound FX (Inline Accordion) */}
        {onPlaySoundEffect && (
          <div className="rounded-[2px] transition-colors">
            <button
              type="button"
              id="ctx-btn-sound-submenu"
              onClick={(e) => {
                e.stopPropagation();
                vibrateTap();
                soundFx.playClick();
                setActiveSubmenu(prev => prev === 'sound' ? null : 'sound');
              }}
              className={`w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 cursor-pointer ${
                activeSubmenu === 'sound' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-400/40' : ''
              }`}
            >
              <div className="flex items-center gap-2">
                <Volume2 className={`w-3.5 h-3.5 ${activeSubmenu === 'sound' ? 'text-emerald-300' : 'text-emerald-400'}`} />
                <span>Âm Thanh Nhanh</span>
              </div>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${activeSubmenu === 'sound' ? 'text-emerald-300 rotate-90' : 'text-white/40'}`} />
            </button>

            {activeSubmenu === 'sound' && (
              <div
                id="ctx-drawer-sound-fx"
                className="mt-1 mb-1 ml-2 mr-0.5 p-1 rounded-[2px] bg-black/50 border border-emerald-400/30 grid grid-cols-2 gap-1 animate-fadeIn"
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onPlaySoundEffect('correct'));
                  }}
                  className="px-2 py-1.5 rounded-[2px] text-[11px] transition flex items-center justify-between bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 text-left cursor-pointer border border-emerald-500/30"
                >
                  <span className="truncate">✨ Đúng (Ding)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onPlaySoundEffect('wrong'));
                  }}
                  className="px-2 py-1.5 rounded-[2px] text-[11px] transition flex items-center justify-between bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 text-left cursor-pointer border border-rose-500/30"
                >
                  <span className="truncate">❌ Sai (Buzzer)</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onPlaySoundEffect('reveal'));
                  }}
                  className="px-2 py-1.5 rounded-[2px] text-[11px] transition flex items-center justify-between bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 text-left cursor-pointer border border-purple-500/30"
                >
                  <span className="truncate">🎉 Công Bố</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onPlaySoundEffect('applause'));
                  }}
                  className="px-2 py-1.5 rounded-[2px] text-[11px] transition flex items-center justify-between bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 text-left cursor-pointer border border-amber-500/30"
                >
                  <span className="truncate">👏 Vỗ Tay</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onPlaySoundEffect('start'));
                  }}
                  className="px-2 py-1.5 rounded-[2px] text-[11px] transition flex items-center justify-between bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-300 text-left cursor-pointer border border-cyan-500/30"
                >
                  <span className="truncate">🏁 Bắt Đầu</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleItemClick(() => onPlaySoundEffect('pacing'));
                  }}
                  className="px-2 py-1.5 rounded-[2px] text-[11px] transition flex items-center justify-between bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-300 text-left cursor-pointer border border-indigo-500/30"
                >
                  <span className="truncate">⏱️ Đếm Nhịp</span>
                </button>
              </div>
            )}
          </div>
        )}

        <div className="border-b border-white/10 my-1" />

        {/* SECTION 4: DATA & QUICK ACTIONS */}
        <div className="text-[9px] font-mono font-bold uppercase tracking-wider text-purple-300/80 px-2 py-0.5 flex items-center gap-1">
          <Activity className="w-3 h-3 text-emerald-400" />
          <span>Dữ Liệu & Thao Tác Nhanh</span>
        </div>

        {onCopyQuestionText && (
          <button
            type="button"
            onClick={() => handleCopy('question', onCopyQuestionText)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {copiedType === 'question' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copiedType === 'question' ? 'Đã sao chép!' : 'Sao chép câu hỏi'}</span>
            </div>
            <span className="text-[9px] font-mono text-white/40">Text</span>
          </button>
        )}

        {onCopyAudienceLink && (
          <button
            type="button"
            onClick={() => handleCopy('link', onCopyAudienceLink)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              {copiedType === 'link' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-300" />}
              <span>{copiedType === 'link' ? 'Đã sao chép!' : 'Sao chép link phòng thi'}</span>
            </div>
            <span className="text-[9px] font-mono text-white/40">URL</span>
          </button>
        )}

        {onExportCsv && (
          <button
            type="button"
            onClick={() => handleItemClick(onExportCsv)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
              <span>Xuất Dữ Liệu SPSS (CSV)</span>
            </div>
            <span className="text-[9px] font-mono text-emerald-300 bg-emerald-500/10 px-1 py-0.5 rounded-[2px]">.csv</span>
          </button>
        )}

        {onForceResync && (
          <button
            type="button"
            onClick={() => handleItemClick(onForceResync)}
            className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
              <span>Đồng Bộ Lại Dữ Liệu</span>
            </div>
            <span className="text-[9px] font-mono text-white/40">Sync</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => handleItemClick(onOpenShortcuts)}
          className="w-full px-2.5 py-1.5 rounded-[2px] text-xs transition flex items-center justify-between hover:bg-white/10 text-white/90 text-left cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Keyboard className="w-3.5 h-3.5 text-purple-400" />
            <span>Xem Bảng Phím Tắt</span>
          </div>
          <kbd className="text-[9px] font-mono text-white/50 bg-white/5 px-1.5 py-0.5 rounded-[2px] border border-white/10">
            ?
          </kbd>
        </button>

      </div>
    </div>
  );
};
