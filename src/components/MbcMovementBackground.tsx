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
    ? 'opacity-20' 
    : intensity === 'intense' 
      ? 'opacity-45' 
      : 'opacity-30';

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden z-0 ${className}`}>
      {/* Claude Design Warm Slate & Clay Geometric Ambient Field */}
      <div className={`absolute top-1/2 left-1/2 w-[350%] h-[350%] animate-mbc-rotate ${opacityClass}`}>
        <div 
          className="w-full h-full"
          style={{
            background: 'conic-gradient(from -15deg at 50% 50%, #141413 0deg 90deg, #30302E 90deg 165deg, #1A1918 165deg 270deg, #D97757 270deg 345deg, #141413 345deg 360deg)'
          }}
        />
      </div>

      {/* Secondary Warm Oat & Clay Band */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280%] h-[160px] bg-gradient-to-r from-[#D97757]/25 via-[#E3DACC]/15 to-[#141413]/70 animate-mbc-pivot opacity-35 blur-[1px] transform origin-center" />

      {/* Outer Radial Warm Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#D97757]/12 rounded-full blur-3xl animate-pulse-glow" />

      {/* Concentric Countdown Ripple Rings (Clay & Oat) */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-[#D97757]/25 rounded-full animate-countdown-ripple" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-[#E3DACC]/20 rounded-full animate-countdown-ripple" style={{ animationDelay: '1s' }} />

      {/* Floating Spark Particles */}
      <div className="absolute bottom-4 left-1/4 w-1.5 h-1.5 bg-[#D97757]/70 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-6 right-1/3 w-2 h-2 bg-[#E3DACC]/70 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-2 right-1/4 w-1 h-1 bg-[#6A9BCC]/70 rounded-full blur-[0.5px] animate-float-particle" style={{ animationDelay: '4s' }} />
    </div>
  );
};
