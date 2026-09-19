import React, { useState, useEffect, useMemo } from 'react';
import { GameState } from '../types';
import { Sparkles, Trophy, Dices } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import confetti from '../utils/confetti';
import { vibrateGrandCelebration } from '../utils/hapticUtils';
import { getProjectorTheme } from '../utils/themeUtils';
import { getUserDisplayUid } from '../utils/uidUtils';

export const LuckyDrawProjector: React.FC<{ gameState: GameState }> = ({ gameState }) => {
  const luckyDraw = gameState.lucky_draw || { status: 'IDLE', winner: null };
  const [randomString, setRandomString] = useState('XXXXXXXXXX');
  const [randomName, setRandomName] = useState('XXXXXXXXXXXXXXXX');

  const theme = useMemo(() => getProjectorTheme(gameState.projectorTheme), [gameState.projectorTheme]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (luckyDraw.status === 'SPINNING') {
      soundFx.playTick(false); // ensure ticking or similar sound
      interval = setInterval(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let resMSSV = '';
        let resName = '';
        for (let i = 0; i < 8; i++) {
          resMSSV += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        for (let i = 0; i < 15; i++) {
          resName += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setRandomString(resMSSV);
        setRandomName(resName);
      }, 50); // fast change
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [luckyDraw.status]);

  useEffect(() => {
    if (luckyDraw.status === 'REVEALED') {
      soundFx.playReveal(); // winning sound
      vibrateGrandCelebration();
      
      // Celebratory Confetti Animation
      const duration = 4 * 1000;
      const end = Date.now() + duration;

      const frame = () => {
        confetti({
          particleCount: 5,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.8 },
          colors: ['#F7CAC9', '#EBC7D6', '#E2DBEC', '#FFFFFF', '#FFD700']
        });
        confetti({
          particleCount: 5,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.8 },
          colors: ['#F7CAC9', '#EBC7D6', '#E2DBEC', '#FFFFFF', '#FFD700']
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      
      // Fire a big burst initially
      confetti({
        particleCount: 150,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#F7CAC9', '#EBC7D6', '#E2DBEC', '#FFFFFF', '#FFD700'],
        zIndex: 100
      });

      frame();
    }
  }, [luckyDraw.status]);

  return (
    <div className="relative z-10 w-full max-w-5xl mx-auto flex-1 flex flex-col min-h-[55vh] items-center justify-center p-6 md:p-8 lg:p-12 fluent-box transition-all duration-500 animate-fadeIn">
      {luckyDraw.status === 'IDLE' && (
        <div className="flex flex-col items-center justify-center space-y-8 md:space-y-12 animate-pulse w-full">
          <Sparkles className="w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 text-white/30" />
          <h1 className="text-4xl md:text-5xl lg:text-6xl xl:text-[4rem] font-black text-white tracking-widest uppercase text-center leading-tight">
            QUAY SỐ<br/><span className={theme.accentText}>MAY MẮN</span>
          </h1>
          <div className="space-y-2 md:space-y-4 text-center mt-8 md:mt-12 opacity-30 overflow-hidden w-full">
            <h2 className="text-lg md:text-xl lg:text-2xl font-mono uppercase tracking-[0.2em] truncate px-4">
              MÃ ĐỊNH DANH TRÚNG GIẢI
            </h2>
            <p className="text-xl md:text-2xl lg:text-3xl font-mono truncate font-bold">UID: XXXXXXXXX</p>
          </div>
        </div>
      )}

      {luckyDraw.status === 'SPINNING' && (
        <div className="flex flex-col items-center justify-center space-y-8 md:space-y-12 w-full">
          <Dices className={`w-12 h-12 md:w-16 md:h-16 lg:w-20 lg:h-20 ${theme.accentText} animate-bounce`} />
          <div className="text-xl md:text-3xl lg:text-4xl font-bold text-white/60 uppercase tracking-widest font-mono text-center">
            ĐANG QUAY SỐ MÃ ĐỊNH DANH...
          </div>
          <div className={`text-4xl md:text-5xl lg:text-6xl xl:text-[6rem] font-black ${theme.accentText} uppercase tracking-widest font-mono fluent-box-nested px-8 md:px-12 lg:px-16 py-4 md:py-6 rounded-[4px] blur-[1px] truncate max-w-[90%] text-center shadow-2xl`}>
            UID: {randomString}
          </div>
        </div>
      )}

      {luckyDraw.status === 'REVEALED' && luckyDraw.winner && (
        <div className="flex flex-col items-center justify-center space-y-6 md:space-y-8 lg:space-y-12 animate-fadeIn z-10 w-full px-4">
          <div className={`inline-flex items-center justify-center w-20 h-20 md:w-28 md:h-28 lg:w-32 lg:h-32 fluent-box rounded-full border border-white/20 mb-2 shadow-[0_0_40px_rgba(255,255,255,0.1)] shrink-0`}>
            <Trophy className={`w-10 h-10 md:w-14 md:h-14 lg:w-16 lg:h-16 ${theme.headerIconText}`} />
          </div>
          
          <div className="text-center space-y-6 md:space-y-8 w-full max-w-5xl">
            <h2 className="text-xl md:text-3xl lg:text-4xl text-amber-300 font-bold tracking-[0.3em] uppercase">
              🎉 MÃ ĐỊNH DANH MAY MẮN TRÚNG GIẢI
            </h2>
            
            <div className="inline-block my-4 max-w-full">
              <span className="inline-block text-3xl sm:text-5xl md:text-6xl lg:text-7xl xl:text-8xl 2xl:text-[6rem] font-black font-mono text-white fluent-box border border-amber-400/50 px-8 md:px-14 py-4 md:py-6 rounded-[4px] shadow-2xl tracking-wider break-all ring-1 ring-amber-400/20">
                {getUserDisplayUid(luckyDraw.winner)}
              </span>
            </div>

            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-[24px] saturate-150/40 border border-white/10 text-white/60 text-sm font-mono">
                <span>🔒</span> Thông tin cá nhân sinh viên được bảo mật theo quy định
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
