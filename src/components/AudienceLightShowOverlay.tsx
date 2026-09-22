import React, { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X, Minimize2, Flame, Heart, Zap, Radio, ChevronUp } from 'lucide-react';
import { AudienceLightShowState, LightShowPattern, LightShowSpeed } from '../types';
import { vibrateTap, vibrateImpact } from '../utils/hapticUtils';

interface AudienceLightShowOverlayProps {
  lightShow: AudienceLightShowState | null | undefined;
  onDismiss?: () => void;
}

interface TouchRipple {
  id: number;
  x: number;
  y: number;
}

export const AudienceLightShowOverlay: React.FC<AudienceLightShowOverlayProps> = ({
  lightShow,
  onDismiss
}) => {
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const rippleIdRef = useRef<number>(0);
  const lastHapticRef = useRef<number>(0);

  // Auto-dismiss countdown
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (!lightShow || !lightShow.active) {
      setIsMinimized(false);
      setIsDismissed(false);
      setRemainingSec(null);
      return;
    }

    // Reset minimized state on fresh trigger (new timestamp)
    setIsMinimized(false);
    setIsDismissed(false);

    if (lightShow.auto_dismiss_seconds && lightShow.auto_dismiss_seconds > 0) {
      const elapsed = Math.floor((Date.now() - lightShow.timestamp) / 1000);
      const left = Math.max(0, lightShow.auto_dismiss_seconds - elapsed);
      setRemainingSec(left);

      const interval = setInterval(() => {
        setRemainingSec(prev => {
          if (prev === null || prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lightShow?.timestamp, lightShow?.active, lightShow?.auto_dismiss_seconds]);

  // Haptic beat synchronization
  useEffect(() => {
    if (!lightShow?.active || isMinimized || isDismissed) return;

    const intervalMs =
      lightShow.speed === 'HYPER' ? 400 :
      lightShow.speed === 'FAST' ? 800 :
      lightShow.speed === 'NORMAL' ? 1500 : 3000;

    const timer = setInterval(() => {
      const now = Date.now();
      if (now - lastHapticRef.current >= intervalMs * 0.9) {
        lastHapticRef.current = now;
        vibrateTap();
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [lightShow?.active, lightShow?.speed, isMinimized, isDismissed]);

  const handleScreenTouch = useCallback((e: React.TouchEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;

    if (clientX === undefined || clientY === undefined) return;

    vibrateImpact();
    const newId = ++rippleIdRef.current;
    setRipples(prev => [...prev.slice(-6), { id: newId, x: clientX, y: clientY }]);

    setTimeout(() => {
      setRipples(prev => prev.filter(r => r.id !== newId));
    }, 1000);
  }, []);

  if (!lightShow || !lightShow.active || isDismissed) {
    return null;
  }

  // Minimized floating Fluent UI 2 Acrylic Pill
  if (isMinimized) {
    return createPortal(
      <div 
        id="minimized-light-show-pill"
        className="fixed bottom-[calc(76px+env(safe-area-inset-bottom,0px))] right-3 sm:right-5 z-[99999] max-w-[calc(100vw-1.5rem)] flex items-center gap-1.5 select-none animate-in fade-in slide-in-from-bottom-3 duration-200"
      >
        <button
          type="button"
          onClick={() => {
            vibrateTap();
            setIsMinimized(false);
          }}
          className="relative rounded-[3px] bg-[#1a0828]/95 backdrop-blur-[24px] saturate-[180%] border border-purple-400/50 hover:border-purple-300 text-white p-2 sm:p-2.5 px-3 sm:px-3.5 shadow-[0_12px_36px_rgba(0,0,0,0.8),0_0_20px_rgba(168,85,247,0.35)] flex items-center gap-2.5 transition-all duration-200 group cursor-pointer overflow-hidden"
          title="Chạm để mở lại toàn màn hình Biển Ánh Sáng"
        >
          {/* Fluent Top Accent Line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500 via-pink-400 to-amber-400" />
          
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] bg-purple-500/25 border border-purple-400/40 flex items-center justify-center text-amber-300 shrink-0 group-hover:scale-105 transition-transform shadow-inner">
            <Sparkles className="w-3.5 h-3.5 animate-spin text-amber-300" />
          </div>
          
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] sm:text-xs font-bold text-white tracking-tight group-hover:text-amber-200 transition-colors">
                Biển Ánh Sáng Sân Khấu
              </span>
              {typeof remainingSec === 'number' && remainingSec > 0 && (
                <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300 bg-amber-500/20 px-1 py-0.5 rounded-[2px] border border-amber-400/30">
                  {remainingSec}s
                </span>
              )}
            </div>
            <span className="text-[9px] sm:text-[10px] font-mono text-purple-300/80 flex items-center gap-1">
              <span>Chạm để mở lại</span>
              <ChevronUp className="w-3 h-3 text-purple-300 group-hover:-translate-y-0.5 transition-transform" />
            </span>
          </div>
        </button>

        {/* Quick Close Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            vibrateTap();
            setIsDismissed(true);
            if (onDismiss) onDismiss();
          }}
          className="p-2 sm:p-2.5 rounded-[3px] bg-[#1a0828]/95 backdrop-blur-[24px] saturate-[180%] hover:bg-rose-950/80 text-white/70 hover:text-rose-200 border border-purple-400/40 hover:border-rose-400/60 transition cursor-pointer shadow-[0_12px_36px_rgba(0,0,0,0.8)]"
          title="Đóng hoàn toàn thông báo"
        >
          <X className="w-4 h-4" />
        </button>
      </div>,
      document.body
    );
  }

  // Determine animation style and background gradient
  const pattern = lightShow.pattern || 'COSMIC_PULSE';
  const speed = lightShow.speed || 'NORMAL';

  const getAnimationClass = (p: LightShowPattern, s: LightShowSpeed) => {
    const speedDuration =
      s === 'HYPER' ? '0.4s' :
      s === 'FAST' ? '0.8s' :
      s === 'NORMAL' ? '1.5s' : '3.0s';

    switch (p) {
      case 'GOLDEN_CHAMPION':
        return {
          bg: 'bg-gradient-to-br from-amber-500 via-yellow-400 to-orange-600',
          animationStyle: { animation: `lightShowGold ${speedDuration} ease-in-out infinite alternate` },
          accentColor: '#fbbf24'
        };
      case 'NEON_STROBE':
        return {
          bg: 'bg-gradient-to-tr from-cyan-500 via-fuchsia-600 to-emerald-400',
          animationStyle: { animation: `lightShowNeon ${speedDuration} steps(2, start) infinite` },
          accentColor: '#22d3ee'
        };
      case 'RAINBOW_WAVE':
        return {
          bg: 'bg-gradient-to-r from-red-500 via-green-500 via-blue-500 to-purple-500 bg-[length:400%_400%]',
          animationStyle: { animation: `lightShowRainbow ${speedDuration} linear infinite` },
          accentColor: '#a855f7'
        };
      case 'HEARTBEAT_RED':
        return {
          bg: 'bg-gradient-to-b from-rose-600 via-red-700 to-rose-950',
          animationStyle: { animation: `lightShowHeartbeat ${speedDuration} ease-in-out infinite` },
          accentColor: '#f43f5e'
        };
      case 'COSMIC_PULSE':
      default:
        return {
          bg: 'bg-gradient-to-br from-purple-800 via-indigo-600 to-pink-600',
          animationStyle: { animation: `lightShowCosmic ${speedDuration} ease-in-out infinite alternate` },
          accentColor: '#e879f9'
        };
    }
  };

  const styleConfig = getAnimationClass(pattern, speed);

  return createPortal(
    <div
      id="audience-light-show-overlay"
      onTouchStart={handleScreenTouch}
      onClick={handleScreenTouch}
      className={`fixed inset-0 z-[99999] ${styleConfig.bg} text-white flex flex-col justify-between p-4 sm:p-6 select-none overflow-hidden touch-none transition-colors duration-300`}
      style={styleConfig.animationStyle}
    >
      <style>{`
        @keyframes lightShowCosmic {
          0% { filter: brightness(1) saturate(1.2); }
          100% { filter: brightness(1.7) saturate(1.8); }
        }
        @keyframes lightShowGold {
          0% { filter: brightness(1) contrast(1.1); transform: scale(1); }
          100% { filter: brightness(1.8) contrast(1.4); transform: scale(1.02); }
        }
        @keyframes lightShowNeon {
          0%, 49% { filter: brightness(0.9) hue-rotate(0deg); }
          50%, 100% { filter: brightness(2) hue-rotate(90deg); }
        }
        @keyframes lightShowRainbow {
          0% { background-position: 0% 50%; filter: brightness(1.2); }
          50% { background-position: 100% 50%; filter: brightness(1.6); }
          100% { background-position: 0% 50%; filter: brightness(1.2); }
        }
        @keyframes lightShowHeartbeat {
          0%, 100% { filter: brightness(0.9); transform: scale(0.99); }
          25% { filter: brightness(1.8); transform: scale(1.03); }
          40% { filter: brightness(1.2); transform: scale(1.01); }
          60% { filter: brightness(1.9); transform: scale(1.04); }
        }
        @keyframes rippleExpand {
          0% { transform: translate(-50%, -50%) scale(0); opacity: 0.9; }
          100% { transform: translate(-50%, -50%) scale(4); opacity: 0; }
        }
      `}</style>

      {/* Touch ripples on tap */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="pointer-events-none absolute rounded-full border-4 border-white/80 bg-white/30"
          style={{
            left: ripple.x,
            top: ripple.y,
            width: '120px',
            height: '120px',
            animation: 'rippleExpand 1s ease-out forwards'
          }}
        />
      ))}

      {/* Top action header: countdown & minimize/close controls (Fluent UI 2) */}
      <div className="relative z-10 flex items-center justify-between w-full max-w-4xl mx-auto">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-[24px] saturate-150 px-3 py-1.5 rounded-[3px] border border-white/20 shadow-lg">
          <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            LIVE FLASH MOB
          </span>
          {typeof remainingSec === 'number' && remainingSec > 0 && (
            <span className="ml-1 text-[11px] font-mono font-black text-amber-300 bg-amber-500/20 border border-amber-400/30 px-1.5 py-0.5 rounded-[2px]">
              {remainingSec}s
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Minimize / Tạm ẩn Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              vibrateTap();
              setIsMinimized(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[3px] bg-black/60 hover:bg-black/80 backdrop-blur-[24px] saturate-150 text-white border border-white/20 hover:border-amber-400/50 text-xs font-mono font-bold transition shadow-lg cursor-pointer"
            title="Tạm ẩn để quay lại giao diện thi"
          >
            <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
            <span className="hidden sm:inline">Tạm Ẩn</span>
          </button>

          {/* Complete Dismiss Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              vibrateTap();
              setIsDismissed(true);
              if (onDismiss) onDismiss();
            }}
            className="p-1.5 rounded-[3px] bg-black/60 hover:bg-rose-950/80 backdrop-blur-[24px] saturate-150 text-white/80 hover:text-white border border-white/20 hover:border-rose-400/60 transition cursor-pointer shadow-lg"
            title="Đóng hoàn toàn"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Display: Giant glowing emblem & instructions */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto space-y-4 max-w-md mx-auto">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-[4px] bg-black/30 backdrop-blur-[24px] saturate-150 border-2 border-white/50 flex items-center justify-center shadow-[0_16px_40px_rgba(0,0,0,0.6)] animate-pulse">
          {pattern === 'GOLDEN_CHAMPION' ? (
            <Flame className="w-14 h-14 text-amber-200 fill-current animate-bounce" />
          ) : pattern === 'HEARTBEAT_RED' ? (
            <Heart className="w-14 h-14 text-rose-200 fill-current animate-ping" />
          ) : pattern === 'NEON_STROBE' ? (
            <Zap className="w-14 h-14 text-cyan-200 fill-current animate-bounce" />
          ) : (
            <Sparkles className="w-14 h-14 text-pink-200 animate-spin" />
          )}
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)]">
            BIỂN ÁNH SÁNG
          </h1>
          <p className="text-lg sm:text-xl font-extrabold text-amber-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)] px-4">
            {lightShow.message || 'GIƠ CAO ĐIỆN THOẠI HƯỚNG VỀ SÂN KHẤU!'}
          </p>
        </div>

        <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-[3px] border border-white/20 text-xs font-medium text-white/90 shadow-md">
          👆 Chạm vào màn hình để tạo sóng ánh sáng
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="relative z-10 text-center pb-2">
        <p className="text-[11px] font-mono uppercase tracking-widest text-white/80">
          Beyond The Internet 2026 • Synchronized Crowd Experience
        </p>
      </div>
    </div>,
    document.body
  );
};
