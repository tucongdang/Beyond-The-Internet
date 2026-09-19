import React, { useEffect } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { GameState, UserInfo } from '../types';
import { Sparkles, Gift, Dices } from 'lucide-react';
import { getUserDisplayUid } from '../utils/uidUtils';
import { vibrateGrandCelebration } from '../utils/hapticUtils';

export const LuckyDrawAudience: React.FC<{ gameState: GameState; currentUserInfo: UserInfo | null }> = ({ gameState, currentUserInfo }) => {
  const { localLanguage } = useLanguage();

  const luckyDraw = gameState.lucky_draw || { status: 'IDLE', winner: null };
  const isWinner = Boolean(
    currentUserInfo &&
    luckyDraw.winner &&
    (luckyDraw.winner.uid === currentUserInfo.uid ||
     (luckyDraw.winner.mssv && luckyDraw.winner.mssv === currentUserInfo.mssv))
  );

  useEffect(() => {
    if (luckyDraw.status === 'REVEALED' && isWinner) {
      vibrateGrandCelebration();
    }
  }, [luckyDraw.status, isWinner]);

  return (
    <div className={`min-h-[calc(100dvh-4rem)] flex flex-col items-center justify-center p-4 sm:p-6 text-white text-center transition-colors duration-1000 ${isWinner && luckyDraw.status === 'REVEALED' ? 'bg-[#3E1D74]/50' : ''}`}>
      <div className={`max-w-md w-full fluent-question-box p-6 sm:p-8 space-y-6 ${isWinner ? 'ring-2 ring-amber-400/80 shadow-2xl' : ''}`}>
        
        {luckyDraw.status === 'IDLE' && (
          <div className="space-y-4">
            <div className="w-12 h-12 mx-auto rounded-[4px] bg-white/10 flex items-center justify-center text-[#F7CAC9] border border-white/10">
              <Sparkles className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-wider uppercase font-mono">
              QUAY SỐ MAY MẮN
            </h2>
            <p className="text-white/60 text-xs sm:text-sm">{localLanguage === 'en' ? 'System is preparing the draw. Please wait...' : 'Hệ thống đang chuẩn bị quay số. Xin vui lòng chờ đợi...'}</p>
          </div>
        )}

        {luckyDraw.status === 'SPINNING' && (
          <div className="space-y-4">
            <div className="w-14 h-14 mx-auto rounded-[4px] bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
              <Dices className="w-7 h-7 text-[#F7CAC9] animate-bounce" />
            </div>
            <h2 className="text-sm sm:text-base font-bold text-white/80 tracking-[0.2em] font-mono">ĐANG QUAY SỐ...</h2>
          </div>
        )}

        {luckyDraw.status === 'REVEALED' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="w-14 h-14 mx-auto rounded-[4px] bg-white/10 flex items-center justify-center text-amber-300 border border-amber-400/30">
              <Gift className={`w-7 h-7 ${isWinner ? 'text-amber-300' : 'text-white/80'}`} />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-xs font-bold text-amber-300 uppercase font-mono tracking-widest">
                {localLanguage === 'en' ? 'Winning Identifier' : 'Mã Định Danh Trúng Giải'}
              </h2>
              <div className={`text-xl sm:text-2xl font-bold font-mono tracking-wider py-2.5 px-4 rounded-[4px] inline-block mt-1 ${isWinner ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-lg' : 'fluent-box-nested text-white'}`}>
                UID: {getUserDisplayUid(luckyDraw.winner)}
              </div>
              <p className="text-[11px] text-white/50 font-mono italic mt-2">
                {localLanguage === 'en' ? '🔒 Student personal information is kept private' : '🔒 Thông tin cá nhân sinh viên được bảo mật công khai'}
              </p>
            </div>
            
            {isWinner && (
              <div className="bg-amber-400 text-slate-950 font-bold text-base py-3 px-5 rounded-[4px] mt-6 shadow-xl animate-bounce font-mono">
                🎉 XIN CHÚC MỪNG BẠN!
                <div className="text-xs font-normal mt-0.5">
                  {localLanguage === 'en' ? `Your identifier (${getUserDisplayUid(currentUserInfo)}) has won!` : `Mã định danh của bạn (${getUserDisplayUid(currentUserInfo)}) đã trúng thưởng!`}
                </div>
              </div>
            )}
          </div>
        )}

        {currentUserInfo && (
          <div className="pt-4 mt-4 border-t border-white/10">
            <p className="text-white/40 text-[11px] uppercase font-mono tracking-wider mb-2">{localLanguage === "en" ? "Your Identifier" : "Mã định danh của bạn"}</p>
            <p className="font-mono font-bold text-amber-300 text-xs fluent-box-nested px-3 py-1.5 rounded-[4px] inline-block">
              {getUserDisplayUid(currentUserInfo)}
            </p>
            <p className="text-xs text-white/70 mt-1.5 font-mono">{currentUserInfo.name} ({currentUserInfo.mssv})</p>
          </div>
        )}
      </div>
    </div>
  );
};
