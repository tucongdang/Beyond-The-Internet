import React, { useEffect, useState, useId } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { GameState, UserInfo } from '../types';
import { Sparkles, Gift, Dices, Volume2, VolumeX, Timer } from 'lucide-react';
import { getUserDisplayUid } from '../utils/uidUtils';
import { vibrateGrandCelebration } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';

export const LuckyDrawAudience: React.FC<{ gameState: GameState; currentUserInfo: UserInfo | null }> = ({ gameState, currentUserInfo }) => {
  const { localLanguage } = useLanguage();

  const audioOwnerId = useId();
  const luckyDraw = gameState.lucky_draw || { status: 'IDLE', winner: null };
  const activeAutoStop = Boolean(luckyDraw.auto_stop_on_music_end ?? gameState.lucky_draw_auto_stop_on_music_end);
  const activeSpinSeed = luckyDraw.seed ?? luckyDraw.draw_timestamp ?? null;
  const [localMuted, setLocalMuted] = useState(false);
  const [musicState, setMusicState] = useState(() => soundFx.getLuckyDrawMusicState());

  const isWinner = Boolean(
    currentUserInfo &&
    luckyDraw.winner &&
    (luckyDraw.winner.uid === currentUserInfo.uid ||
     (luckyDraw.winner.mssv && luckyDraw.winner.mssv === currentUserInfo.mssv))
  );

  useEffect(() => {
    return soundFx.subscribeLuckyDrawMusic(setMusicState);
  }, []);

  useEffect(() => {
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
    audioOwnerId,
    luckyDraw.status,
    gameState.active_module,
    gameState.lucky_draw_music_muted,
    localMuted,
    activeSpinSeed,
    activeAutoStop,
  ]);

  useEffect(() => {
    return () => {
      soundFx.stopLuckyDrawMusic(audioOwnerId);
    };
  }, [audioOwnerId]);

  useEffect(() => {
    if (luckyDraw.status === 'REVEALED' && isWinner) {
      vibrateGrandCelebration();
    }
  }, [luckyDraw.status, isWinner]);

  return (
    <div className={`min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 text-white text-center transition-colors duration-1000 ${isWinner && luckyDraw.status === 'REVEALED' ? 'bg-[#3E1D74]/50' : ''}`}>
      <div className={`max-w-md w-full fluent-question-box p-6 sm:p-8 space-y-6 ${isWinner ? 'ring-2 ring-amber-400/80 shadow-2xl' : ''}`}>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <button
            type="button"
            id="btn-audience-lucky-draw-music-mute"
            onClick={() => {
              const nextMuted = !localMuted;
              setLocalMuted(nextMuted);
              if (!nextMuted) {
                soundFx.unlockLuckyDrawMusic();
              }
            }}
            className={`px-2.5 py-1 rounded-[2px] font-mono text-[11px] font-bold flex items-center gap-1.5 border transition cursor-pointer ${
              gameState.lucky_draw_music_muted || localMuted
                ? 'bg-rose-950/70 text-rose-200 border-rose-400/50 hover:bg-rose-900/80'
                : musicState.isPlaying
                ? 'bg-emerald-950/70 text-emerald-200 border-emerald-400/50 hover:bg-emerald-900/80'
                : 'bg-white/5 text-white/70 border-white/15 hover:bg-white/10 hover:text-white'
            }`}
          >
            {gameState.lucky_draw_music_muted || localMuted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className={`w-3.5 h-3.5 ${musicState.isPlaying ? 'animate-pulse text-emerald-300' : ''}`} />
            )}
            <span>
              {gameState.lucky_draw_music_muted
                ? localLanguage !== 'vi'
                  ? 'Muted by Host'
                  : 'Admin đã tắt nhạc'
                : localMuted
                ? localLanguage !== 'vi'
                  ? 'Music Muted'
                  : 'Đã tắt nhạc'
                : !musicState.globalSoundEnabled
                ? localLanguage !== 'vi'
                  ? 'Sound Off'
                  : 'Âm thanh đang tắt'
                : musicState.isPlaying && musicState.activeTrack === 'waiting'
                ? localLanguage !== 'vi'
                  ? 'Playing Waiting Music'
                  : 'Đang phát: Nhạc Chờ Xổ Số'
                : musicState.isPlaying && musicState.activeTrack === 'spinning'
                ? localLanguage !== 'vi'
                  ? 'Playing Spin Music'
                  : 'Đang phát: Nhạc Quay Nón'
                : luckyDraw.status === 'REVEALED'
                ? localLanguage !== 'vi'
                  ? 'Draw Music Stopped'
                  : 'Đã dừng nhạc (Công bố)'
                : localLanguage !== 'vi'
                ? 'Draw Music Ready'
                : 'Nhạc quay sẵn sàng'}
            </span>
          </button>

          {!gameState.lucky_draw_music_muted && !localMuted && (!musicState.globalSoundEnabled || musicState.volume <= 0.01) && (
            <button
              type="button"
              onClick={() => soundFx.unlockLuckyDrawMusic(true)}
              className="px-2.5 py-1 rounded-[2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[11px] font-bold shadow animate-pulse cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Enable Sound' : 'Bật âm thanh'}
            </button>
          )}

          {(musicState.autoplayBlocked || musicState.reason === 'awaiting_spin_interaction') &&
            !gameState.lucky_draw_music_muted &&
            !localMuted &&
            musicState.globalSoundEnabled &&
            musicState.volume > 0.01 && (
            <button
              type="button"
              onClick={() => soundFx.unlockLuckyDrawMusic(true)}
              className="px-2.5 py-1 rounded-[2px] bg-amber-400 hover:bg-amber-300 text-slate-950 font-mono text-[11px] font-bold shadow animate-pulse cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Tap for Music' : 'Bấm bật nhạc'}
            </button>
          )}

          {musicState.error && !gameState.lucky_draw_music_muted && !localMuted && (
            <button
              type="button"
              onClick={() => soundFx.unlockLuckyDrawMusic(true)}
              className="px-2.5 py-1 rounded-[2px] bg-rose-500 hover:bg-rose-400 text-white font-mono text-[11px] font-bold shadow cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Retry Audio' : 'Thử phát lại'}
            </button>
          )}
        </div>

        {luckyDraw.filter_label && (
          <div className="inline-block px-3 py-1 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/35 text-xs font-mono font-bold tracking-wide">
            🎯 {luckyDraw.filter_label}
          </div>
        )}

        {luckyDraw.status === 'IDLE' && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-[2px] bg-white/10 flex items-center justify-center text-[#F7CAC9] border border-white/10">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wider uppercase font-mono">
              {localLanguage !== 'vi' ? 'LUCKY DRAW' : 'VÒNG QUAY MAY MẮN'}
            </h2>
            <p className="text-white/60 text-xs sm:text-sm">
              {localLanguage !== 'vi'
                ? 'The lucky draw is about to begin! Keep an eye on the stage...'
                : 'Vòng quay may mắn sắp bắt đầu! Cùng hướng mắt lên sân khấu nhé...'}
            </p>
          </div>
        )}

        {luckyDraw.status === 'SPINNING' && (
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-[2px] bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
              <Dices className="w-7 h-7 text-[#F7CAC9] animate-bounce" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white/80 tracking-[0.2em] font-mono">
              {localLanguage !== 'vi' ? 'FINDING LUCKY WINNER...' : 'ĐANG TÌM CHỦ NHÂN MAY MẮN...'}
            </h2>
            {activeAutoStop && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[2px] bg-amber-400/15 border border-amber-400/35 text-amber-200 text-[11px] font-mono font-bold">
                <Timer className="w-3.5 h-3.5 animate-pulse" />
                <span>
                  {localLanguage !== 'vi'
                    ? 'Auto-reveal when spin music ends'
                    : 'Tự động công bố khi hết nhạc quay'}
                </span>
              </div>
            )}
          </div>
        )}

        {luckyDraw.status === 'REVEALED' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-[2px] bg-white/10 flex items-center justify-center text-amber-300 border border-amber-400/30">
              <Gift className={`w-7 h-7 ${isWinner ? 'text-amber-300' : 'text-white/80'}`} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-amber-300 uppercase font-mono tracking-widest">
                {localLanguage !== 'vi' ? 'Winning Identifier' : 'Mã Định Danh Trúng Giải'}
              </h2>
              <div className={`text-xl sm:text-2xl font-bold font-mono tracking-wider py-2.5 px-4 rounded-[2px] inline-block mt-1 ${isWinner ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-lg' : 'fluent-box-nested text-white'}`}>
                UID: {getUserDisplayUid(luckyDraw.winner)}
              </div>
              <p className="text-[11px] text-white/50 font-mono italic mt-2">
                {localLanguage !== 'vi' ? '🔒 Only your anonymous UID is shown on the main screen' : '🔒 Chỉ hiển thị mã UID ẩn danh để bảo mật thông tin cá nhân'}
              </p>
            </div>
            
            {isWinner && (
              <div className="bg-amber-400 text-slate-950 font-bold text-base py-3 px-5 rounded-[2px] mt-6 shadow-xl animate-bounce font-mono">
                {localLanguage !== 'vi' ? '🎉 CONGRATULATIONS!' : '🎉 XIN CHÚC MỪNG BẠN!'}
                <div className="text-xs font-normal mt-0.5">
                  {localLanguage !== 'vi' ? `Your identifier (${getUserDisplayUid(currentUserInfo)}) has won!` : `Mã định danh của bạn (${getUserDisplayUid(currentUserInfo)}) đã trúng thưởng!`}
                </div>
              </div>
            )}
          </div>
        )}

        {currentUserInfo && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <p className="text-white/40 text-[11px] uppercase font-mono tracking-wider mb-2">{localLanguage !== 'vi' ? "Your Identifier" : "Mã định danh của bạn"}</p>
            <p className="font-mono font-bold text-amber-300 text-xs fluent-box-nested px-3 py-1.5 rounded-[2px] inline-block">
              {getUserDisplayUid(currentUserInfo)}
            </p>
            <p className="text-xs text-white/70 mt-1.5 font-mono">{currentUserInfo.name} ({currentUserInfo.mssv})</p>
          </div>
        )}
      </div>
    </div>
  );
};
