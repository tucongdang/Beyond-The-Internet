import React from 'react';

interface MbcMovementBackgroundProps {
  className?: string;
  intensity?: 'subtle' | 'vibrant' | 'intense';
}

export const MbcMovementBackground: React.FC<MbcMovementBackgroundProps> = ({
  className = '',
  intensity = 'vibrant'
}) => {
  const opacityClass = intensity === 'subtle' 
    ? 'opacity-25' 
    : intensity === 'intense' 
      ? 'opacity-60' 
      : 'opacity-40';

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {/* MBC Movement Signature Rotating Conic Geometric Dual-Tone Slices */}
      <div className={`absolute top-1/2 left-1/2 w-[350%] h-[350%] animate-mbc-rotate ${opacityClass}`}>
        <div 
          className="w-full h-full"
          style={{
            background: 'conic-gradient(from -15deg at 50% 50%, #0c0f1d 0deg 90deg, #6d28d9 90deg 165deg, #0f1428 165deg 270deg, #8b5cf6 270deg 345deg, #0c0f1d 345deg 360deg)'
          }}
        />
      </div>

      {/* Secondary Pivoting Diagonal Band (MBC Movement Dynamic Slice) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280%] h-[160px] bg-gradient-to-r from-[#6d28d9]/50 via-[#9333ea]/35 to-[#0b0f19]/70 animate-mbc-pivot opacity-40 blur-[1px] transform origin-center" />

      {/* Outer Radial Glow & Ambient Pulse */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl animate-pulse-glow" />

      {/* Concentric Countdown Ripple Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-purple-400/30 rounded-full animate-countdown-ripple" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-amber-400/20 rounded-full animate-countdown-ripple" style={{ animationDelay: '1s' }} />

      {/* Floating Spark Particles */}
      <div className="absolute bottom-4 left-1/4 w-1.5 h-1.5 bg-purple-300 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-6 right-1/3 w-2 h-2 bg-amber-300 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-2 right-1/4 w-1 h-1 bg-indigo-300 rounded-full blur-[0.5px] animate-float-particle" style={{ animationDelay: '4s' }} />
    </div>
  );
};
