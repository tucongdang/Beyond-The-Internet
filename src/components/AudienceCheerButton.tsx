import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { Heart, Flame, Zap, Sparkles, Smile, Star, Radio, Activity } from 'lucide-react';
import { cheerService } from '../services/cheerService';
import { UserInfo, CheerType, CheerIntensityData } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateCheer, vibrateCheerCombo, vibrateTap } from '../utils/hapticUtils';

interface AudienceCheerButtonProps {
  user: UserInfo | null;
  isHighContrast?: boolean;
  className?: string;
}

interface LocalTapParticle {
  id: number;
  type: CheerType;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

const getCheerTypes = (localLanguage: string) => ([
  { type: 'HEART', label: localLanguage !== 'vi' ? 'Heart' : 'Thả Tim', icon: '❤️', color: 'from-rose-500 to-pink-600' },
  { type: 'FIRE', label: localLanguage !== 'vi' ? 'Fire' : 'Tiếp Lửa', icon: '🔥', color: 'from-amber-500 to-orange-600' },
  { type: 'ENERGY', label: localLanguage !== 'vi' ? 'Energy' : 'Năng Lượng', icon: '⚡', color: 'from-cyan-400 to-blue-600' },
  { type: 'CLAP', label: localLanguage !== 'vi' ? 'Clap' : 'Vỗ Tay', icon: '👏', color: 'from-emerald-400 to-teal-600' },
  { type: 'STAR', label: localLanguage !== 'vi' ? 'Star' : 'Tỏa Sáng', icon: '⭐', color: 'from-yellow-400 to-amber-500' },
  { type: 'SMILE', label: localLanguage !== 'vi' ? 'Smile' : 'Vui vẻ', icon: '😄', color: 'from-blue-400 to-indigo-500' },
  { type: 'NERVOUS', label: localLanguage !== 'vi' ? 'Nervous' : 'Hồi hộp', icon: '🥶', color: 'from-cyan-400 to-blue-500' },
  { type: 'HARD', label: localLanguage !== 'vi' ? 'So Hard' : 'Khó quá', icon: '🤯', color: 'from-purple-500 to-pink-600' }
]);

export const AudienceCheerButton: React.FC<AudienceCheerButtonProps> = ({
  user,
  isHighContrast = false,
  className = ''
}) => {
  const { localLanguage } = useLanguage();

  const [selectedType, setSelectedType] = useState<CheerType>('HEART');
  const [combo, setCombo] = useState<number>(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [localParticles, setLocalParticles] = useState<LocalTapParticle[]>([]);
  const [intensityData, setIntensityData] = useState<CheerIntensityData>(cheerService.getCurrentIntensityData());
  const [isPressing, setIsPressing] = useState<boolean>(false);
  const comboResetTimerRef = useRef<any>(null);
  const particleIdRef = useRef<number>(0);

  useEffect(() => {
    const unsub = cheerService.subscribe((data) => {
      setIntensityData(data);
    });
    return () => unsub();
  }, []);

  const handleTap = (e?: React.MouseEvent | React.TouchEvent) => {
    // Vibrate haptic
    vibrateCheer();
    // Play sound
    soundFx.playCheerPop(selectedType);

    // Send cheer
    const result = cheerService.sendCheer(user, selectedType, 1);
    setCombo(result.combo);

    if (result.combo % 10 === 0) {
      vibrateCheerCombo();
    }

    // Reset combo after 2 seconds of inactivity
    if (comboResetTimerRef.current) clearTimeout(comboResetTimerRef.current);
    comboResetTimerRef.current = setTimeout(() => {
      setCombo(0);
    }, 2200);

    // Spawn local floating particle
    const pId = ++particleIdRef.current;
    const randomSpreadX = (Math.random() - 0.5) * 60;
    const randomRot = (Math.random() - 0.5) * 40;

    setLocalParticles((prev) => [
      ...prev.slice(-15),
      {
        id: pId,
        type: selectedType,
        x: randomSpreadX,
        y: -10,
        rotation: randomRot,
        scale: 1 + Math.min(0.8, result.combo * 0.05)
      }
    ]);

    // Button push feedback animation
    setIsPressing(true);
    setTimeout(() => setIsPressing(false), 120);
  };

  // Clean up particles
  useEffect(() => {
    if (localParticles.length === 0) return;
    const timer = setTimeout(() => {
      setLocalParticles([]);
    }, 1200);
    return () => clearTimeout(timer);
  }, [localParticles]);

  const activeCheerMeta = getCheerTypes(localLanguage).find(c => c.type === selectedType) || getCheerTypes(localLanguage)[0];

  return (
    <div className={`relative select-none ${className}`}>
      {/* Floating local tapped emoji particles container */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none w-32 h-40 overflow-visible z-50">
        {localParticles.map((p) => {
          const typeObj = getCheerTypes(localLanguage).find(c => c.type === p.type);
          return (
            <div
              key={p.id}
              className="absolute left-1/2 bottom-0 -translate-x-1/2 text-2xl sm:text-3xl animate-float-fade font-black drop-shadow-md"
              style={{
                transform: `translate(${p.x}px, ${p.y}px) rotate(${p.rotation}deg) scale(${p.scale})`,
              }}
            >
              {typeObj?.icon || '❤️'}
            </div>
          );
        })}
      </div>

      {/* Main Cheer Widget Box */}
      <div
        className={`rounded-[2px] border transition-all duration-200 ${
          isHighContrast
            ? 'bg-black/50 backdrop-blur-[24px] saturate-150 border-2 border-white text-white'
            : 'fluent-box border-white/10 hover:border-rose-400/40'
        } p-3 sm:p-4`}
      >
        {/* Top Header: Crowd Intensity & Reaction Switcher */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 text-[11px] font-mono">
            <Activity className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
            <span className="text-white/70">{localLanguage !== 'vi' ? 'Hall:' : 'Khán phòng:'}</span>
            <span
              className="font-bold px-1.5 py-0.2 rounded-[2px] text-[10px]"
              style={{
                backgroundColor: `${intensityData.colorHex}20`,
                color: intensityData.colorHex,
                border: `1px solid ${intensityData.colorHex}40`
              }}
            >
              {intensityData.intensity}% • {intensityData.bpm} BPM
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-[10px] font-mono text-rose-300/90 hover:text-rose-200 underline flex items-center gap-1 transition"
          >
            {showEmojiPicker ? (localLanguage !== 'vi' ? 'Close icon picker' : 'Đóng chọn icon') : (localLanguage !== 'vi' ? 'Change icon ▾' : 'Đổi icon khác ▾')}
          </button>
        </div>

        {/* Reaction Type Selector Bar (Expandable or inline) */}
        {showEmojiPicker && (
          <div className="grid grid-cols-5 gap-1.5 p-1.5 mb-2.5 fluent-box-nested rounded-[2px] border border-white/10 animate-fadeIn">
            {getCheerTypes(localLanguage).map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => {
                  vibrateTap();
                  setSelectedType(item.type as CheerType);
                  setShowEmojiPicker(false);
                }}
                className={`py-1.5 flex flex-col items-center justify-center rounded-[2px] transition text-xs ${
                  selectedType === item.type
                    ? 'bg-white/10 border border-white/40 scale-105 shadow-md'
                    : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-[9px] font-mono text-white/70 mt-0.5">{item.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* Big Tactile Cheer Tap Button */}
        <button
          type="button"
          onClick={handleTap}
          className={`w-full relative overflow-hidden py-3 sm:py-3.5 px-4 rounded-[2px] font-black text-sm sm:text-base text-white shadow-lg transition-all duration-100 flex items-center justify-between cursor-pointer border ${
            isPressing ? 'scale-[0.98] brightness-125' : 'active:scale-95 hover:brightness-110'
          } ${
            isHighContrast
              ? 'bg-white text-black border-white'
              : `bg-gradient-to-r ${activeCheerMeta.color}`
          }`}
          style={{
            borderColor: isHighContrast ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
            boxShadow: isHighContrast ? 'none' : '0 10px 25px -5px rgba(244, 63, 94, 0.4)'
          }}
        >
          {/* Subtle animated light sweep */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer pointer-events-none" />

          <div className="flex items-center gap-2.5 relative z-10">
            <span className="text-2xl sm:text-3xl animate-bounce" style={{ animationDuration: '1s' }}>
              {activeCheerMeta.icon}
            </span>
            <div className="text-left">
              <div className="font-black tracking-wide flex items-center gap-1.5">
                <span>{localLanguage !== 'vi' ? 'CHEER ON STAGE' : 'CỔ VŨ SÂN KHẤU'}</span>
                {combo > 1 && (
                  <span className="px-1.5 py-0.5 rounded-[2px] bg-white/10 backdrop-blur-md border border-white/40 text-[10px] font-mono animate-pulse">
                    x{combo} COMBO!
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[11px] text-white/80 font-normal leading-tight">
                {localLanguage !== 'vi' ? 'Keep tapping to raise the hall temperature!' : 'Chạm liên tục để đẩy nhiệt độ khán phòng!'}
              </p>
            </div>
          </div>

          <div className="relative z-10 flex flex-col items-end">
            <span className="text-xs font-mono font-bold uppercase tracking-wider bg-black/50 backdrop-blur-[24px] saturate-150/30 px-2 py-0.5 rounded-[2px] border border-white/20">
              TAP ME ⚡
            </span>
            {intensityData.totalCheers > 0 && (
              <span className="text-[9px] font-mono text-white/70 mt-0.5">
                {intensityData.totalCheers.toLocaleString('vi-VN')} {localLanguage !== 'vi' ? 'taps' : 'lượt'}
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
