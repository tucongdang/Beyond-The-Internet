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
      {/* Cosmic Twilight Ambient Geometric Field */}
      <div className={`absolute top-1/2 left-1/2 w-[350%] h-[350%] animate-mbc-rotate ${opacityClass}`}>
        <div 
          className="w-full h-full"
          style={{
            background: 'conic-gradient(from -15deg at 50% 50%, #0D0420 0deg 90deg, #241148 90deg 165deg, #190839 165deg 270deg, #F7CAC9 270deg 345deg, #0D0420 345deg 360deg)'
          }}
        />
      </div>

      {/* Secondary Serenity & Rose Quartz Band */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280%] h-[160px] bg-gradient-to-r from-[#92A8D1]/25 via-[#F7CAC9]/20 to-[#0D0420]/70 animate-mbc-pivot opacity-40 blur-[1px] transform origin-center" />

      {/* Outer Radial Rose Quartz Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#F7CAC9]/15 rounded-full blur-3xl animate-pulse-glow" />

      {/* Concentric Countdown Ripple Rings */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border border-[#F7CAC9]/30 rounded-full animate-countdown-ripple" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 border border-[#92A8D1]/25 rounded-full animate-countdown-ripple" style={{ animationDelay: '1s' }} />

      {/* Floating Spark Particles */}
      <div className="absolute bottom-4 left-1/4 w-1.5 h-1.5 bg-[#F7CAC9]/80 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '0s' }} />
      <div className="absolute bottom-6 right-1/3 w-2 h-2 bg-[#92A8D1]/80 rounded-full blur-[1px] animate-float-particle" style={{ animationDelay: '2s' }} />
      <div className="absolute bottom-2 right-1/4 w-1 h-1 bg-[#F5EFF9]/80 rounded-full blur-[0.5px] animate-float-particle" style={{ animationDelay: '4s' }} />
    </div>
  );
};
