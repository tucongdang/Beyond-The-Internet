import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sparkles, X, Minimize2, Flame, Heart, Zap, Radio } from 'lucide-react';
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
  const [ripples, setRipples] = useState<TouchRipple[]>([]);
  const rippleIdRef = useRef<number>(0);
  const lastHapticRef = useRef<number>(0);

  // Auto-dismiss countdown
  const [remainingSec, setRemainingSec] = useState<number | null>(null);

  useEffect(() => {
    if (!lightShow || !lightShow.active) {
      setIsMinimized(false);
      setRemainingSec(null);
      return;
    }

    // Reset minimized state on fresh trigger
    setIsMinimized(false);

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
    if (!lightShow?.active || isMinimized) return;

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
  }, [lightShow?.active, lightShow?.speed, isMinimized]);

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

  if (!lightShow || !lightShow.active) {
    return null;
  }

  // Minimized floating banner
  if (isMinimized) {
    return (
      <div className="fixed bottom-20 right-4 z-[9999] animate-bounce">
        <button
          type="button"
          onClick={() => setIsMinimized(false)}
          className="px-3.5 py-2 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-amber-500 text-white font-mono text-xs font-bold shadow-2xl border border-white/30 flex items-center gap-2 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 animate-spin text-amber-300" />
          <span>Mở lại Biển Ánh Sáng</span>
        </button>
      </div>
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

  return (
    <div
      id="audience-light-show-overlay"
      onTouchStart={handleScreenTouch}
      onClick={handleScreenTouch}
      className={`fixed inset-0 z-[9999] ${styleConfig.bg} text-white flex flex-col justify-between p-6 select-none overflow-hidden touch-none transition-colors duration-300`}
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

      {/* Top action header: countdown & minimize */}
      <div className="relative z-10 flex items-center justify-between w-full">
        <div className="flex items-center gap-2 bg-black/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/20">
          <Radio className="w-4 h-4 text-emerald-300 animate-pulse" />
          <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
            LIVE FLASH MOB
          </span>
          {typeof remainingSec === 'number' && remainingSec > 0 && (
            <span className="ml-1 text-[11px] font-mono font-black text-amber-300 bg-black/50 px-1.5 py-0.5 rounded">
              {remainingSec}s
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsMinimized(true);
            if (onDismiss) onDismiss();
          }}
          className="p-2 rounded-full bg-black/40 backdrop-blur-md hover:bg-black/60 text-white/80 hover:text-white border border-white/20 transition cursor-pointer"
          title="Tạm ẩn để quay lại màn hình thi"
        >
          <Minimize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Center Display: Giant glowing emblem & instructions */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center my-auto space-y-4 max-w-md mx-auto">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/20 backdrop-blur-md border-2 border-white/50 flex items-center justify-center shadow-2xl animate-pulse">
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

        <div className="bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 text-xs font-medium text-white/90">
          👆 Chạm vào màn hình để tạo sóng ánh sáng
        </div>
      </div>

      {/* Bottom status bar */}
      <div className="relative z-10 text-center pb-2">
        <p className="text-[11px] font-mono uppercase tracking-widest text-white/70">
          Beyond The Internet 2026 • Synchronized Crowd Experience
        </p>
      </div>
    </div>
  );
};
