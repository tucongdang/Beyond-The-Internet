import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Sparkles, Trophy, Gift, Dices, X, Minimize2, Maximize2, Volume2, VolumeX, CheckCircle, Shield, Flame } from 'lucide-react';
import { GameState, UserInfo, ContestantPrediction } from '../types';
import { getUserDisplayUid } from '../utils/uidUtils';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateGrandCelebration } from '../utils/hapticUtils';
import confetti from '../utils/confetti';
import { syncService } from '../services/syncService';

interface LuckOfTheDrawOverlayProps {
  gameState: GameState;
  currentUserInfo: UserInfo | null;
  onClose?: () => void;
  isMinimized?: boolean;
  onRestore?: () => void;
}

export const LuckOfTheDrawOverlay: React.FC<LuckOfTheDrawOverlayProps> = ({
  gameState,
  currentUserInfo,
  onClose,
  isMinimized = false,
  onRestore
}) => {
  const luckyDraw = gameState.lucky_draw;
  const status = luckyDraw?.status || 'IDLE';
  const winner = luckyDraw?.winner || null;
  const winningContestantName = luckyDraw?.winning_contestant_name || luckyDraw?.filter_contestant_name || 'Thí sinh chiến thắng';
  const eligibleCount = luckyDraw?.eligible_count ?? 0;

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [internalMinimized, setInternalMinimized] = useState<boolean>(isMinimized);
  const [tickerIndex, setTickerIndex] = useState<number>(0);
  const [revealedAnimationDone, setRevealedAnimationDone] = useState<boolean>(false);
  const hasTriggeredCelebrationRef = useRef<boolean>(false);

  // Sync internal minimized state with prop
  useEffect(() => {
    setInternalMinimized(isMinimized);
  }, [isMinimized]);

  // When status transitions from SPINNING to REVEALED, auto-expand if minimized so audience sees the result
  useEffect(() => {
    if (status === 'REVEALED' && internalMinimized) {
      setInternalMinimized(false);
      if (onRestore) onRestore();
    }
  }, [status, internalMinimized, onRestore]);

  // Check if current user is the winner
  const isWinner = Boolean(
    currentUserInfo &&
    winner &&
    (winner.uid === currentUserInfo.uid ||
      (winner.mssv && currentUserInfo.mssv && winner.mssv.trim().toLowerCase() === currentUserInfo.mssv.trim().toLowerCase()))
  );

  // Check if current user was eligible in this predictor pool
  const [userPredictions, setUserPredictions] = useState<Record<string, Record<string, ContestantPrediction>>>(() =>
    syncService.getAllPredictions()
  );

  useEffect(() => {
    return syncService.subscribeToPredictions((preds) => {
      setUserPredictions(preds);
    });
  }, []);

  const isUserStakedCorrectly = useMemo(() => {
    if (!currentUserInfo?.uid) return false;
    const qId = luckyDraw?.filter_question_id || gameState.question_id;
    const targetContestantId = luckyDraw?.winning_contestant_id;

    // Check specific question or all questions
    const checkPrediction = (p?: ContestantPrediction) => {
      if (!p) return false;
      if (targetContestantId) {
        return p.contestantId === targetContestantId;
      }
      return p.won === true;
    };

    if (qId && userPredictions[qId]) {
      const pred = userPredictions[qId][currentUserInfo.uid];
      if (checkPrediction(pred)) return true;
    }

    // Fallback: check across all questions
    for (const qKey of Object.keys(userPredictions)) {
      const pred = userPredictions[qKey]?.[currentUserInfo.uid];
      if (checkPrediction(pred)) return true;
    }

    return false;
  }, [currentUserInfo, luckyDraw, gameState.question_id, userPredictions]);

  // Sample UIDs for slot-machine reel simulation
  const reelUids = useMemo(() => {
    if (Array.isArray(luckyDraw?.sample_uids) && luckyDraw.sample_uids.length > 0) {
      return luckyDraw.sample_uids;
    }
    // Fallback procedural candidate UIDs for high-tempo spinning visual
    return [
      'BTI-9831',
      'BTI-4412',
      'BTI-7629',
      'BTI-1108',
      'BTI-5590',
      'BTI-3321',
      'BTI-8845',
      'BTI-2076',
      'BTI-6614',
      'BTI-9023'
    ];
  }, [luckyDraw?.sample_uids]);

  // Spinning ticker animation timer
  useEffect(() => {
    if (status !== 'SPINNING') return;

    let tickCount = 0;
    const interval = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % reelUids.length);
      tickCount++;

      // Subtle haptic tick every 3 ticks
      if (tickCount % 3 === 0) {
        vibrateTap();
      }
    }, 65);

    return () => clearInterval(interval);
  }, [status, reelUids.length]);

  // Celebration trigger on REVEALED
  useEffect(() => {
    if (status === 'REVEALED' && winner && !hasTriggeredCelebrationRef.current) {
      hasTriggeredCelebrationRef.current = true;
      setRevealedAnimationDone(true);

      if (soundEnabled) {
        soundFx.playReveal(true);
      }

      if (isWinner) {
        vibrateGrandCelebration();
        // Fire festive fireworks confetti
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 }
        });
        setTimeout(() => {
          confetti({
            particleCount: 120,
            spread: 100,
            origin: { y: 0.5 }
          });
        }, 350);
      }
    } else if (status === 'SPINNING') {
      hasTriggeredCelebrationRef.current = false;
      setRevealedAnimationDone(false);
    }
  }, [status, winner, isWinner, soundEnabled]);

  if (status === 'IDLE') {
    return null;
  }

  // MINIMIZED FLOATING PILL
  if (internalMinimized) {
    return (
      <aside 
        aria-label="Predictor Draw Status Notification"
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 px-3.5 py-2 rounded-[2px] bg-[#190839]/95 text-white border border-amber-400/60 shadow-xl backdrop-blur-md animate-bounce"
      >
        <div className="flex items-center gap-2">
          {status === 'SPINNING' ? (
            <Dices className="w-4 h-4 text-amber-400 animate-spin" />
          ) : (
            <Trophy className="w-4 h-4 text-amber-300" />
          )}
          <div className="text-left font-mono">
            <p className="text-[10px] text-amber-300 uppercase font-black leading-tight">
              {status === 'SPINNING' ? 'Đang quay Predictor Draw...' : 'Đã có kết quả Lucky Draw!'}
            </p>
            <p className="text-[9px] text-white/70 truncate max-w-[150px]">
              {status === 'SPINNING' ? winningContestantName : `UID: ${getUserDisplayUid(winner)}`}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            soundFx.playClick();
            setInternalMinimized(false);
            if (onRestore) onRestore();
          }}
          className="p-1 rounded-[2px] bg-amber-400/20 hover:bg-amber-400/40 text-amber-300 transition cursor-pointer"
          title="Mở lại toàn màn hình"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </aside>
    );
  }

  const currentReelUid = reelUids[tickerIndex % reelUids.length];
  const nextReelUid = reelUids[(tickerIndex + 1) % reelUids.length];
  const prevReelUid = reelUids[(tickerIndex - 1 + reelUids.length) % reelUids.length];
  const winnerUidDisplay = getUserDisplayUid(winner);
  const myUidDisplay = getUserDisplayUid(currentUserInfo);

  return (
    <div 
      role="dialog"
      aria-modal="true"
      aria-labelledby="luck-of-the-draw-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#0D0420]/85 backdrop-blur-md animate-fadeIn"
    >
      {/* Background Cosmic Particle Glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px]" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/15 rounded-full blur-[100px]" />
      </div>

      {/* Main Overlay Modal Window */}
      <div
        className={`relative w-full max-w-lg rounded-[2px] border transition-all duration-300 overflow-hidden shadow-2xl flex flex-col ${
          status === 'REVEALED'
            ? isWinner
              ? 'bg-gradient-to-b from-[#2A0E52] via-[#190839] to-[#0D0420] border-amber-400 ring-2 ring-amber-400/80 shadow-[0_0_60px_rgba(251,191,36,0.35)]'
              : 'bg-gradient-to-b from-[#1C093D] via-[#14062E] to-[#0D0420] border-amber-400/60 ring-1 ring-amber-400/40 shadow-[0_0_40px_rgba(251,191,36,0.2)]'
            : 'bg-gradient-to-b from-[#1A0A38] via-[#120529] to-[#0D0420] border-cyan-400/50 ring-1 ring-cyan-400/30 shadow-[0_0_40px_rgba(56,189,248,0.2)]'
        }`}
      >
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30">
          <div className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-[2px] flex items-center justify-center border ${
                status === 'REVEALED'
                  ? 'bg-amber-400/20 border-amber-400 text-amber-300'
                  : 'bg-cyan-400/20 border-cyan-400 text-cyan-300 animate-pulse'
              }`}
            >
              {status === 'REVEALED' ? (
                <Trophy className="w-3.5 h-3.5" />
              ) : (
                <Dices className="w-3.5 h-3.5 animate-spin" />
              )}
            </div>
            <div>
              <span id="luck-of-the-draw-title" className="text-xs font-mono font-black tracking-widest text-white uppercase block">
                LUCK OF THE DRAW • PREDICTOR DRAW
              </span>
              <span className="text-[10px] font-mono text-white/50 block">
                {status === 'SPINNING' ? 'Vòng Quay Tín Nhiệm Đang Diễn Ra' : 'Công Bố Kết Quả Trúng Thưởng'}
              </span>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              className="p-1.5 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={soundEnabled ? 'Tắt âm thanh' : 'Bật âm thanh'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-white/80" /> : <VolumeX className="w-4 h-4 text-white/40" />}
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setInternalMinimized(true);
                if (onClose) onClose();
              }}
              className="p-1.5 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Thu nhỏ cửa sổ xuống góc màn hình"
            >
              <Minimize2 className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setInternalMinimized(true);
                if (onClose) onClose();
              }}
              className="p-1.5 rounded-[2px] text-white/60 hover:text-rose-400 hover:bg-white/10 transition cursor-pointer"
              title="Đóng bảng quay số"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 space-y-5 text-center">
          {/* Target Contestant Badge (Winning Contestant) */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[2px] bg-white/5 border border-white/15 text-xs font-mono">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-white/60">Thí sinh chiến thắng:</span>
            <strong className="text-amber-300 font-bold tracking-wide">{winningContestantName}</strong>
          </div>

          {/* SPINNING ANIMATION EFFECT */}
          {status === 'SPINNING' && (
            <div className="space-y-5 py-2">
              <div className="space-y-1.5">
                <h3 className="text-xs uppercase font-mono font-bold tracking-[0.25em] text-cyan-300">
                  ⚡ ĐANG QUAY SỐ TÌM CHỦ NHÂN MAY MẮN...
                </h3>
                <p className="text-[11px] text-[#B6A6D8] font-mono">
                  Quay số từ nhóm khán giả đã đặt điểm tín nhiệm chính xác ({eligibleCount} ứng viên)
                </p>
              </div>

              {/* Slot Machine Tumbler / Reels Box */}
              <div className="relative mx-auto max-w-xs h-36 rounded-[2px] border-2 border-cyan-400/80 bg-black/60 shadow-[0_0_35px_rgba(56,189,248,0.25)] overflow-hidden flex flex-col justify-center items-center">
                {/* Horizontal Aperture Focus Lines */}
                <div className="absolute inset-x-0 top-0 h-9 bg-gradient-to-b from-[#120529] to-transparent z-10 pointer-events-none" />
                <div className="absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-[#120529] to-transparent z-10 pointer-events-none" />

                {/* Laser scan line in center */}
                <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-11 border-y border-cyan-400/70 bg-cyan-400/10 z-10 pointer-events-none shadow-[0_0_15px_rgba(56,189,248,0.4)]" />

                {/* Tumbler Reel Ticker */}
                <div className="flex flex-col items-center justify-center space-y-2 font-mono select-none transition-transform duration-75">
                  <div className="text-xs text-white/30 blur-[1px] tracking-wider">{prevReelUid}</div>
                  <div className="text-2xl sm:text-3xl font-black text-cyan-200 tracking-wider font-mono drop-shadow-[0_0_12px_rgba(56,189,248,0.8)] animate-pulse">
                    {currentReelUid}
                  </div>
                  <div className="text-xs text-white/30 blur-[1px] tracking-wider">{nextReelUid}</div>
                </div>
              </div>

              {/* User Eligibility Status Badge */}
              <div className="pt-1">
                {isUserStakedCorrectly ? (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-emerald-950/70 border border-emerald-400/60 text-emerald-300 text-xs font-mono font-bold animate-pulse">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Bạn đã đặt tín nhiệm chính xác! Đang trong danh sách quay số!</span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[2px] bg-white/5 border border-white/10 text-white/60 text-[11px] font-mono">
                    <Shield className="w-3.5 h-3.5 text-white/40" />
                    <span>Dành riêng cho khán giả đã đặt tín nhiệm đúng {winningContestantName}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* REVEAL CARD EFFECT */}
          {status === 'REVEALED' && (
            <div className="space-y-5 py-2 animate-fadeIn">
              {/* Grand Reveal Trophy / Gift Icon */}
              <div className="relative inline-block mx-auto">
                <div
                  className={`w-16 h-16 rounded-[2px] border-2 flex items-center justify-center transition-transform duration-500 ${
                    isWinner
                      ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-[0_0_35px_rgba(251,191,36,0.6)] animate-bounce'
                      : 'bg-amber-950/60 text-amber-300 border-amber-400/50 shadow-[0_0_20px_rgba(251,191,36,0.3)]'
                  }`}
                >
                  {isWinner ? <Trophy className="w-8 h-8 fill-current" /> : <Gift className="w-8 h-8" />}
                </div>
              </div>

              {/* Reveal Card Centerpiece */}
              <div className="space-y-2">
                <p className="text-xs uppercase font-mono font-bold tracking-[0.2em] text-amber-300">
                  🎉 CHỦ NHÂN MAY MẮN • PREDICTOR WINNER 🎉
                </p>

                {/* The Lucky Winner's Anonymized UID Card */}
                <div className="p-4 sm:p-5 rounded-[2px] bg-gradient-to-r from-amber-400/15 via-amber-400/25 to-amber-400/15 border-2 border-amber-400 shadow-[0_0_30px_rgba(251,191,36,0.3)] space-y-1.5">
                  <span className="text-[10px] text-amber-300/80 uppercase font-mono tracking-widest block font-bold">
                    Mã Định Danh Ẩn Danh Trúng Thưởng
                  </span>
                  <div className="text-2xl sm:text-3xl md:text-4xl font-black font-mono text-white tracking-widest text-shadow drop-shadow-md">
                    UID: {winnerUidDisplay}
                  </div>
                  <div className="text-[11px] text-white/60 font-mono pt-1">
                    🔒 Thông tin được bảo mật và mã hóa theo quy chuẩn gameshow
                  </div>
                </div>
              </div>

              {/* Winner Personal Banner OR Non-Winner Comparison */}
              {isWinner ? (
                <div className="p-4 rounded-[2px] bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 font-mono shadow-2xl space-y-2 animate-pulse">
                  <div className="text-base sm:text-lg font-black flex items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 fill-current" />
                    <span>XIN CHÚC MỪNG BẠN ĐÃ TRÚNG GIẢI!</span>
                    <Sparkles className="w-5 h-5 fill-current" />
                  </div>
                  <p className="text-xs font-semibold leading-relaxed">
                    Mã định danh của bạn (<strong>{myUidDisplay}</strong>) trùng khớp 100% với giải thưởng Predictor Draw!
                  </p>
                  <div className="text-[11px] bg-slate-950/15 p-2 rounded-[2px] font-bold">
                    👉 Vui lòng giữ nguyên màn hình này và liên hệ Ban Tổ Chức tại bàn kỹ thuật để nhận quà!
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-[2px] bg-white/5 border border-white/10 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between text-white/70">
                    <span>Mã định danh của bạn:</span>
                    <strong className="text-white font-bold">{myUidDisplay}</strong>
                  </div>
                  <div className="flex items-center justify-between text-white/70">
                    <span>Mã định danh trúng thưởng:</span>
                    <strong className="text-amber-300 font-bold">{winnerUidDisplay}</strong>
                  </div>
                  <p className="text-[10px] text-white/50 pt-1 border-t border-white/10">
                    Cảm ơn bạn đã tham gia đặt điểm tín nhiệm! Hãy tiếp tục ủng hộ thí sinh ở câu hỏi tiếp theo nhé!
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Footer Bar */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-white/50">
            <span>Pool: {eligibleCount} người dự đoán đúng</span>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                setInternalMinimized(true);
                if (onClose) onClose();
              }}
              className="px-3 py-1.5 rounded-[2px] bg-white/10 hover:bg-white/20 text-white font-bold transition cursor-pointer"
            >
              Đóng cửa sổ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
