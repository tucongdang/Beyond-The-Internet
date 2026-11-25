import React, { useState, useEffect, useMemo, useId } from 'react';
import { GameState } from '../types';
import { Sparkles, Trophy, Dices, Volume2, VolumeX, Timer } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import confetti from '../utils/confetti';
import { vibrateGrandCelebration } from '../utils/hapticUtils';
import { getProjectorTheme } from '../utils/themeUtils';
import { getUserDisplayUid } from '../utils/uidUtils';
import { getSecureRandomChars } from '../utils/cryptoUtils';
import { computeLuckyDrawSpinProgress, LUCKY_DRAW_SPIN_DURATION_MS } from '../utils/luckyDrawAudioUtils';

export const LuckyDrawProjector: React.FC<{ gameState: GameState; isVirtual?: boolean }> = ({
  gameState,
  isVirtual = false,
}) => {
  const audioOwnerId = useId();
  const luckyDraw = gameState.lucky_draw || { status: 'IDLE', winner: null };
  const activeAutoStop = Boolean(luckyDraw.auto_stop_on_music_end ?? gameState.lucky_draw_auto_stop_on_music_end);
  const activeSpinSeed = luckyDraw.seed ?? luckyDraw.draw_timestamp ?? null;
  const [randomString, setRandomString] = useState('XXXXXXXXXX');
  const [randomName, setRandomName] = useState('XXXXXXXXXXXXXXXX');
  const [localMuted, setLocalMuted] = useState(false);
  const [musicState, setMusicState] = useState(() => soundFx.getLuckyDrawMusicState());
  const [spinProgress, setSpinProgress] = useState<{ progressRatio: number; remainingSec: number; durationSec: number }>({
    progressRatio: 0,
    remainingSec: LUCKY_DRAW_SPIN_DURATION_MS / 1000,
    durationSec: LUCKY_DRAW_SPIN_DURATION_MS / 1000,
  });

  const theme = useMemo(() => getProjectorTheme(gameState.projectorTheme), [gameState.projectorTheme]);

  useEffect(() => {
    if (isVirtual) return;
    return soundFx.subscribeLuckyDrawMusic(setMusicState);
  }, [isVirtual]);

  useEffect(() => {
    if (isVirtual) return;
    soundFx.syncLuckyDrawMusic({
      ownerId: audioOwnerId,
      drawStatus: luckyDraw.status,
      isLuckyDrawActive: gameState.active_module === 'LUCKY_DRAW' || luckyDraw.status !== 'IDLE',
      adminMusicMuted: Boolean(gameState.lucky_draw_music_muted),
      localMuted,
      spinSeed: activeSpinSeed,
      autoStopOnMusicEnd: activeAutoStop,
    });
  }, [
    isVirtual,
    audioOwnerId,
    luckyDraw.status,
    gameState.active_module,
    gameState.lucky_draw_music_muted,
    localMuted,
    activeSpinSeed,
    activeAutoStop,
  ]);

  useEffect(() => {
    if (isVirtual) return;
    return () => {
      soundFx.stopLuckyDrawMusic(audioOwnerId);
    };
  }, [isVirtual, audioOwnerId]);

  useEffect(() => {
    if (isVirtual || luckyDraw.status !== 'SPINNING' || !activeAutoStop) {
      const durSec = musicState.durationSec || LUCKY_DRAW_SPIN_DURATION_MS / 1000;
      setSpinProgress({
        progressRatio: 0,
        remainingSec: durSec,
        durationSec: durSec,
      });
      return;
    }

    const durationMs =
      luckyDraw.spin_duration_ms ||
      Math.round((musicState.durationSec || LUCKY_DRAW_SPIN_DURATION_MS / 1000) * 1000);
    const spinStartedAt = luckyDraw.draw_timestamp || Date.now();

    const update = () => {
      const liveState = soundFx.getLuckyDrawMusicState();
      const elapsedMs =
        liveState.isPlaying && liveState.currentTimeSec > 0
          ? liveState.currentTimeSec * 1000
          : Date.now() - spinStartedAt;
      const calc = computeLuckyDrawSpinProgress({
        elapsedMs,
        durationMs,
        isAudioActivelyPlaying: liveState.isPlaying,
      });
      setSpinProgress({
        progressRatio: calc.progressRatio,
        remainingSec: calc.remainingSec,
        durationSec: calc.durationMs / 1000,
      });
    };

    update();
    const timer = setInterval(update, 200);
    return () => clearInterval(timer);
  }, [isVirtual, luckyDraw.status, luckyDraw.draw_timestamp, luckyDraw.spin_duration_ms, activeAutoStop, activeSpinSeed]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (luckyDraw.status === 'SPINNING') {
      if (!isVirtual) {
        soundFx.playTick(false);
      }
      interval = setInterval(() => {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        const resMSSV = getSecureRandomChars(8, chars);
        const resName = getSecureRandomChars(15, chars);
        setRandomString(resMSSV);
        setRandomName(resName);
      }, 50); // fast change
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [luckyDraw.status, isVirtual]);

  useEffect(() => {
    if (isVirtual) return;
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
      {/* Audio Status & Local Mute Control (Top-Left, clear of Top-Right Exit button) */}
      <div className="absolute top-3 left-4 z-30 flex items-center gap-2 flex-wrap">
        <button
          type="button"
          id="btn-projector-lucky-draw-music-mute"
          onClick={() => {
            const nextMuted = !localMuted;
            setLocalMuted(nextMuted);
            if (!nextMuted) {
              soundFx.unlockLuckyDrawMusic();
            }
          }}
          className={`px-2.5 py-1 rounded-[2px] font-mono text-[11px] font-bold flex items-center gap-1.5 border transition cursor-pointer backdrop-blur-md ${
            gameState.lucky_draw_music_muted || localMuted
              ? 'bg-rose-950/75 text-rose-200 border-rose-400/50 hover:bg-rose-900/80'
              : musicState.isPlaying
              ? 'bg-emerald-950/75 text-emerald-200 border-emerald-400/50 hover:bg-emerald-900/80'
              : 'bg-black/50 text-white/75 border-white/15 hover:bg-black/70 hover:text-white'
          }`}
          title={localMuted ? 'Bật lại nhạc quay số trên màn chiếu này' : 'Tắt nhạc quay số trên màn chiếu này'}
        >
          {gameState.lucky_draw_music_muted || localMuted ? (
            <VolumeX className="w-3.5 h-3.5" />
          ) : (
            <Volume2 className={`w-3.5 h-3.5 ${musicState.isPlaying ? 'animate-pulse text-emerald-300' : ''}`} />
          )}
          <span>
            {gameState.lucky_draw_music_muted
              ? 'Admin đã mute nhạc'
              : localMuted
              ? 'Đã tắt tiếng cục bộ'
              : !musicState.globalSoundEnabled
              ? 'Âm thanh chung đang tắt'
              : musicState.isPlaying && musicState.activeTrack === 'waiting'
              ? 'Đang phát: Nhạc Xổ Số (Chờ)'
              : musicState.isPlaying && musicState.activeTrack === 'spinning'
              ? 'Đang phát: Nhạc Quay Nón'
              : luckyDraw.status === 'REVEALED'
              ? 'Đã dừng nhạc (Công bố)'
              : 'Nhạc quay sẵn sàng'}
          </span>
        </button>

        {!gameState.lucky_draw_music_muted && !localMuted && (!musicState.globalSoundEnabled || musicState.volume <= 0.01) && (
          <button
            type="button"
            id="btn-projector-lucky-draw-music-enable-global"
            onClick={() => soundFx.unlockLuckyDrawMusic(true)}
            className="px-2.5 py-1 rounded-[2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[11px] font-bold shadow-lg animate-pulse cursor-pointer"
          >
            {!musicState.globalSoundEnabled ? 'Bật âm thanh hệ thống' : 'Tăng âm lượng nhạc'}
          </button>
        )}

        {(musicState.autoplayBlocked || musicState.reason === 'awaiting_spin_interaction') &&
          !gameState.lucky_draw_music_muted &&
          !localMuted &&
          musicState.globalSoundEnabled &&
          musicState.volume > 0.01 && (
          <button
            type="button"
            id="btn-projector-lucky-draw-music-unlock"
            onClick={() => soundFx.unlockLuckyDrawMusic(true)}
            className="px-2.5 py-1 rounded-[2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[11px] font-bold shadow-lg animate-pulse cursor-pointer"
          >
            Nhấn để bật nhạc quay số
          </button>
        )}

        {musicState.error && !gameState.lucky_draw_music_muted && !localMuted && (
          <button
            type="button"
            onClick={() => soundFx.unlockLuckyDrawMusic(true)}
            className="px-2.5 py-1 rounded-[2px] bg-rose-500 hover:bg-rose-400 text-white font-mono text-[11px] font-bold shadow-lg cursor-pointer"
            title={musicState.error}
          >
            {musicState.error} • Thử lại
          </button>
        )}
      </div>

      {luckyDraw.filter_label && (
        <div className="mb-6 animate-fadeIn">
          <span className="px-4 py-1.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/40 text-xs sm:text-sm md:text-base font-mono font-bold tracking-wider uppercase inline-flex items-center gap-2 shadow-lg backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-amber-300 animate-spin" style={{ animationDuration: '6s' }} />
            <span>{luckyDraw.filter_label}</span>
            {luckyDraw.eligible_count !== undefined && (
              <span className="text-white/60 text-xs font-normal">
                ({luckyDraw.eligible_count} ứng viên)
              </span>
            )}
          </span>
        </div>
      )}

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
          {activeAutoStop && (
            <div
              id="projector-lucky-draw-auto-progress"
              className="w-full max-w-md space-y-2 px-4 py-3 rounded-[4px] bg-black/45 border border-amber-400/35 backdrop-blur-md"
            >
              <div className="flex items-center justify-between text-xs sm:text-sm font-mono">
                <span className="text-amber-300 font-bold flex items-center gap-1.5">
                  <Timer className="w-4 h-4 animate-pulse" />
                  Tự động chốt khi hết nhạc
                </span>
                <span className="text-white font-bold">
                  Còn {spinProgress.remainingSec.toFixed(1)}s
                </span>
              </div>
              <div className="w-full h-2 rounded-[2px] bg-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-400 to-[#F7CAC9] transition-all duration-200"
                  style={{ width: `${Math.round(spinProgress.progressRatio * 100)}%` }}
                />
              </div>
            </div>
          )}
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
