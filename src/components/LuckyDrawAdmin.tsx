import React, { useState, useEffect } from 'react';
import { GameState, UserInfo } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { Sparkles, Play, Square, Trophy, AlertCircle } from 'lucide-react';
import { getUserDisplayUid } from '../utils/uidUtils';
import { getSecureRandomItem } from '../utils/cryptoUtils';

export const LuckyDrawAdmin: React.FC<{ gameState: GameState; allResponses: any }> = ({ gameState, allResponses }) => {
  const [notification, setNotification] = useState<string | null>(null);

  const notify = (message: string) => {
    setNotification(message);
    setTimeout(() => setNotification(null), 3000);
  };

  const [candidates, setCandidates] = useState<UserInfo[]>([]);
  const luckyDraw = gameState.lucky_draw || { status: 'IDLE', winner: null };

  // Collect all unique users who participated
  useEffect(() => {
    const userMap = new Map<string, UserInfo>();
    Object.values(allResponses).forEach((qResps: any) => {
      Object.values(qResps).forEach((res: any) => {
        if (res.user_info && res.user_info.uid) {
          const formattedCandidate: UserInfo = {
            ...res.user_info,
            anonymizedUid: getUserDisplayUid(res.user_info)
          };
          userMap.set(res.user_info.uid, formattedCandidate);
        }
      });
    });
    setCandidates(Array.from(userMap.values()));
  }, [allResponses]);

  const handleStartSpin = () => {
    soundFx.playClick();
    syncService.updateGameState({
      lucky_draw: {
        status: 'SPINNING',
        winner: null,
        seed: Date.now()
      } as any
    });
  };

  const handleStopSpin = () => {
    soundFx.playClick();
    if (candidates.length === 0) {
      notify('Không có khán giả nào tham gia để quay số!');
      syncService.updateGameState({
        lucky_draw: {
          status: 'IDLE',
          winner: null
        }
      });
      return;
    }
    const selected: UserInfo = getSecureRandomItem<UserInfo>(candidates);
    const winner: UserInfo = {
      ...selected,
      anonymizedUid: getUserDisplayUid(selected)
    };
    syncService.updateGameState({
      lucky_draw: {
        status: 'REVEALED',
        winner
      }
    });
    const winnerUidDisplay = getUserDisplayUid(winner);
    // Send direct notification via Firestore ONLY to winner
    syncService.sendDirectNotification(
      winner.uid,
      `Chúc mừng bạn (Mã định danh: ${winnerUidDisplay}) đã may mắn trúng giải Lucky Draw! Hãy liên hệ Ban tổ chức để nhận quà.`,
      '🎉 TRÚNG GIẢI LUCKY DRAW'
    );
  };

  const handleReset = () => {
    soundFx.playClick();
    syncService.updateGameState({
      lucky_draw: {
        status: 'IDLE',
        winner: null
      }
    });
  };

  return (
    <div className="fluent-box border border-white/10 rounded-[2px] p-4 sm:p-6 space-y-6 text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <h2 className="text-xs uppercase text-white font-bold tracking-widest font-mono flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#F7CAC9]" /> QUY TRÌNH QUAY SỐ TRÚNG THƯỞNG
        </h2>
        <div className="text-white/60 text-xs font-mono fluent-box-nested px-2.5 py-1.5 rounded-[2px] border border-white/10">
          Tổng số ứng viên: <strong className="text-white text-sm">{candidates.length}</strong>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center p-8 fluent-box-nested rounded-[2px] min-h-[300px] border border-white/10">
        {luckyDraw.status === 'IDLE' && (
          <div className="text-center space-y-4 text-white/50">
            <Sparkles className="w-12 h-12 mx-auto text-[#F7CAC9]/40" />
            <p className="text-sm">Sẵn sàng quay số. Vui lòng bấm nút bên dưới để bắt đầu.</p>
          </div>
        )}

        {luckyDraw.status === 'SPINNING' && (
          <div className="text-center space-y-4 animate-pulse">
            <div className="text-5xl font-bold font-mono text-white/80 blur-[1px] transition-all">
              XXXXXXXXXX
            </div>
            <p className="text-[#F7CAC9] uppercase tracking-[0.3em] font-mono mt-4 text-sm">Đang quay số...</p>
          </div>
        )}

        {luckyDraw.status === 'REVEALED' && luckyDraw.winner && (
          <div className="text-center space-y-6 animate-fadeIn">
            <div className="inline-flex items-center justify-center w-16 h-16 fluent-box text-amber-300 rounded-[2px] border-2 border-amber-400/40 mb-2 shadow-lg">
              <Trophy className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <div className="text-xs uppercase text-amber-300 font-bold tracking-widest font-mono">
                Mã định danh trúng giải (Công khai):
              </div>
              <div className="text-3xl font-black font-mono text-white fluent-box py-2.5 px-6 rounded-[2px] border-2 border-amber-400/60 inline-block shadow-lg">
                UID: {getUserDisplayUid(luckyDraw.winner)}
              </div>
              <div className="pt-2 text-xs font-mono text-white/60 fluent-box-nested py-1.5 px-4 rounded-[2px] border border-white/10 inline-block">
                🔒 Xác minh BTC: <strong className="text-white">{luckyDraw.winner.name}</strong> - MSSV: <strong className="text-white">{luckyDraw.winner.mssv}</strong>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-3">
        {luckyDraw.status === 'IDLE' || luckyDraw.status === 'REVEALED' ? (
          <button
            onClick={handleStartSpin}
            className="flex items-center gap-2 px-6 py-3 bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] rounded-[2px] font-bold font-mono text-sm transition cursor-pointer shadow-lg active:scale-95"
          >
            <Play className="w-4 h-4 fill-current" /> BẮT ĐẦU QUAY
          </button>
        ) : (
          <button
            onClick={handleStopSpin}
            className="flex items-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-[2px] font-bold font-mono text-sm transition cursor-pointer shadow-lg active:scale-95"
          >
            <Square className="w-4 h-4 fill-current" /> DỪNG QUAY
          </button>
        )}
        
        {luckyDraw.status === 'REVEALED' && (
          <button
            onClick={handleReset}
            className="px-5 py-3 fluent-box hover:bg-white/15 text-white rounded-[2px] font-bold font-mono text-sm transition border border-white/10 cursor-pointer shadow"
          >
            Làm lại
          </button>
        )}
      </div>

      {notification && (
        <div className="fixed bottom-6 right-6 z-[300] fluent-box border border-rose-500/40 text-rose-200 px-4 py-3 rounded-[2px] shadow-2xl flex items-center gap-2 animate-fadeIn text-sm">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{notification}</span>
        </div>
      )}
    </div>
  );
};

