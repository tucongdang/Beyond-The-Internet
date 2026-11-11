import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Lock, CheckCircle2, Sparkles, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { GameState, UserInfo, ChampionVote } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateSelection, vibrateSuccess, vibrateTap } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';

interface ChampionVoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  user: UserInfo | null;
}

const DEFAULT_CONTESTANTS = [
  { id: 'team_alpha', name: 'Thí sinh Alpha', color: '#38bdf8' },
  { id: 'team_beta', name: 'Thí sinh Beta', color: '#f43f5e' },
  { id: 'team_gamma', name: 'Thí sinh Gamma', color: '#10b981' },
  { id: 'team_delta', name: 'Thí sinh Delta', color: '#f59e0b' },
];

export const ChampionVoteModal: React.FC<ChampionVoteModalProps> = ({
  isOpen,
  onClose,
  gameState,
  user,
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';

  const isVoteOpen = gameState.champion_vote_open !== false;

  const [votesMap, setVotesMap] = useState<Record<string, ChampionVote>>(() =>
    syncService.getChampionVotes()
  );

  useEffect(() => {
    return syncService.subscribeToChampionVotes((votes) => {
      setVotesMap(votes);
    });
  }, []);

  // Contestant list from gameState.teams
  const contestants = useMemo(() => {
    if (Array.isArray(gameState.teams) && gameState.teams.length > 0) {
      return gameState.teams.map((t, idx) => ({
        id: t.id || `contestant_${idx + 1}`,
        name: t.name || `Thí sinh ${idx + 1}`,
        color: t.color || DEFAULT_CONTESTANTS[idx % DEFAULT_CONTESTANTS.length].color,
      }));
    }
    return DEFAULT_CONTESTANTS;
  }, [gameState.teams]);

  // Current user's vote
  const myUid = user?.uid || (typeof window !== 'undefined' ? localStorage.getItem('BTI_ANON_UID') || '' : '');
  const myVote = myUid ? votesMap[myUid] : null;

  // Distribution calculation
  const totalVotes = Object.keys(votesMap).length;
  const voteStats = useMemo(() => {
    const counts: Record<string, number> = {};
    contestants.forEach((c) => {
      counts[c.id] = 0;
    });
    Object.values(votesMap).forEach((item) => {
      const v = item as ChampionVote;
      if (counts[v.contestantId] !== undefined) {
        counts[v.contestantId]++;
      }
    });
    const percentages: Record<string, number> = {};
    contestants.forEach((c) => {
      percentages[c.id] = totalVotes > 0 ? Math.round((counts[c.id] / totalVotes) * 100) : 0;
    });
    return { counts, percentages };
  }, [contestants, votesMap, totalVotes]);

  const [notification, setNotification] = useState<string | null>(null);

  const handleVote = async (contestant: { id: string; name: string }) => {
    if (!isVoteOpen) {
      vibrateTap();
      setNotification(
        isVi
          ? 'Cổng bình chọn đã khóa trước vòng Về Đích! Không thể thay đổi bình chọn lúc này.'
          : 'Champion voting has been locked before the Finale!'
      );
      setTimeout(() => setNotification(null), 3500);
      return;
    }

    vibrateSelection();
    soundFx.playClick();

    const isChanging = Boolean(myVote && myVote.contestantId !== contestant.id);
    const uid = myUid || `anon_${Date.now()}`;
    const vote: ChampionVote = {
      uid,
      name: user?.name || (user?.mssv ? `Thí sinh ${user.mssv}` : 'Khán giả'),
      mssv: user?.mssv || '',
      contestantId: contestant.id,
      contestantName: contestant.name,
      timestamp: Date.now(),
    };

    const ok = await syncService.submitChampionVote(vote);
    if (ok) {
      vibrateSuccess();
      setNotification(
        isVi
          ? isChanging
            ? `Đã đổi bình chọn sang ${contestant.name} thành công! (Bạn có thể đổi lại bất cứ lúc nào trước khi khóa cổng)`
            : `Bạn đã bình chọn thành công cho ${contestant.name}! (Có thể đổi trước khi khóa cổng)`
          : `You selected ${contestant.name} as Champion!`
      );
      setTimeout(() => setNotification(null), 3500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="fluent-box max-w-lg w-full rounded-[4px] border border-[#F7CAC9]/40 p-5 sm:p-6 text-white shadow-2xl space-y-5 bg-gradient-to-b from-[#190839] via-[#12062c] to-[#0D0420]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-[2px] bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Trophy className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-extrabold uppercase tracking-wide text-white font-mono flex items-center gap-1.5">
                {isVi ? 'Bình Chọn Thí Sinh Chiến Thắng' : 'Vote for Match Champion'}
              </h2>
              <p className="text-[11px] text-[#B6A6D8] font-mono mt-0.5">
                {isVi ? 'Dự đoán Thí sinh đạt Quán quân chung cuộc' : 'Predict the overall tournament winner'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Callout Banner */}
        <div
          className={`p-3 rounded-[2px] border text-xs font-mono space-y-1 ${
            isVoteOpen
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-amber-950/50 border-amber-500/50 text-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold">
              {isVoteOpen ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>{isVi ? 'CỔNG BÌNH CHỌN: ĐANG MỞ' : 'VOTING: OPEN'}</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>{isVi ? 'CỔNG BÌNH CHỌN: ĐÃ KHÓA TRƯỚC VÒNG VỀ ĐÍCH' : 'VOTING: LOCKED BEFORE FINALE'}</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-white/50">
              {totalVotes} {isVi ? 'khán giả đã vote' : 'votes cast'}
            </span>
          </div>
          <p className="text-[11px] text-white/80 leading-relaxed">
            {isVoteOpen
              ? isVi
                ? 'Hãy chọn thí sinh bạn tin sẽ giành ngôi Quán quân chung cuộc! Ban Tổ chức sẽ khóa cổng bình chọn này trước khi bước vào vòng Về Đích.'
                : 'Select the contestant you believe will win! Voting will be locked by organizers before the final round.'
              : isVi
              ? 'Ban Tổ chức đã khóa cổng bình chọn để chốt danh sách dự đoán Quán quân trước vòng Về Đích.'
              : 'Organizers have locked champion voting before the final round.'}
          </p>

          {/* Critical distinction notice: Confidence staking still runs! */}
          <div className="pt-2 mt-2 border-t border-white/10 flex items-start gap-1.5 text-[11px] text-[#F7CAC9]">
            <Sparkles className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0 mt-0.5" />
            <span>
              {isVi
                ? 'Lưu ý: Điểm tín nhiệm theo từng câu hỏi vẫn hoạt động độc lập và khán giả vẫn có thể đặt điểm tín nhiệm bình thường cho từng câu!'
                : 'Note: Question-by-question confidence staking is completely independent and continues to run on each question!'}
            </span>
          </div>
        </div>

        {/* Contestants Voting Grid */}
        <div className="space-y-2">
          {contestants.map((contestant) => {
            const isSelected = myVote?.contestantId === contestant.id;
            const pct = voteStats.percentages[contestant.id] || 0;
            const count = voteStats.counts[contestant.id] || 0;

            return (
              <button
                key={contestant.id}
                type="button"
                disabled={!isVoteOpen && !isSelected}
                onClick={() => handleVote(contestant)}
                className={`w-full p-3 rounded-[2px] border text-left transition-all ${
                  isSelected
                    ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.25)] ring-1 ring-amber-400/50'
                    : isVoteOpen
                    ? 'bg-white/5 border-white/15 hover:bg-white/10 hover:border-[#F7CAC9]/50 cursor-pointer'
                    : 'bg-white/5 border-white/10 opacity-70 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: contestant.color }}
                    />
                    <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                      {contestant.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-mono font-bold text-white/90">
                      {pct}% <span className="text-[10px] text-white/50 font-normal">({count})</span>
                    </span>
                    {isSelected ? (
                      <span className="px-2 py-0.5 rounded-[2px] bg-amber-400 text-slate-950 font-mono text-[10px] font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{isVi ? 'ĐÃ CHỌN' : 'YOUR PICK'}</span>
                      </span>
                    ) : isVoteOpen ? (
                      <span className="text-[10px] text-amber-300 font-bold group-hover:underline">
                        {myVote ? (isVi ? 'Đổi sang đây' : 'Switch here') : (isVi ? 'Bình chọn' : 'Vote')}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 rounded-[1px] bg-black/60 overflow-hidden">
                  <div
                    className="h-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isSelected ? '#fbbf24' : contestant.color,
                    }}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-2.5 rounded-[2px] bg-white/5 border border-white/10 text-xs font-mono text-center text-[#B6A6D8]">
          {myVote ? (
            isVi ? (
              <>
                Lựa chọn của bạn:{' '}
                <strong className="text-amber-300">{myVote.contestantName}</strong>{' '}
                {isVoteOpen ? (
                  <span className="text-white/60">(chạm thí sinh khác để tự do đổi bất kỳ lúc nào trước khi khóa)</span>
                ) : (
                  <span className="text-amber-400/80">(cổng bình chọn đã khóa)</span>
                )}
              </>
            ) : (
              <>
                Your vote: <strong className="text-amber-300">{myVote.contestantName}</strong>
              </>
            )
          ) : isVoteOpen ? (
            isVi ? 'Chạm vào 1 thí sinh ở trên để bình chọn Quán quân (bạn có thể đổi trước khi khóa).' : 'Tap a contestant to vote (switchable before lock).'
          ) : (
            isVi ? 'Cổng bình chọn đã khóa trước vòng Về Đích.' : 'Voting is locked.'
          )}
        </div>

        {notification && (
          <div className="p-2.5 rounded-[2px] bg-amber-400/20 border border-amber-400/40 text-amber-200 text-xs font-mono flex items-center gap-2 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0" />
            <span>{notification}</span>
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[2px] bg-white/10 hover:bg-white/20 text-white font-mono font-bold text-xs transition cursor-pointer"
          >
            {isVi ? 'Đóng' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
