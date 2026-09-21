import React, { useState, useEffect } from 'react';
import { X, Mic, Sparkles, RefreshCw, Megaphone, CheckCircle2, AlertTriangle, TrendingUp, Users } from 'lucide-react';
import { GameState, UserResponse } from '../types';
import { aiExplanationService, McCoPilotResult } from '../services/aiExplanationService';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';

interface AiMcCoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  responses: Record<string, UserResponse>;
  onSendToAnnouncer?: (text: string) => void;
}

export const AiMcCoPilotModal: React.FC<AiMcCoPilotModalProps> = ({
  isOpen,
  onClose,
  gameState,
  responses,
  onSendToAnnouncer
}) => {
  const [commentary, setCommentary] = useState<McCoPilotResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sentToast, setSentToast] = useState<boolean>(false);

  // Compute distribution of current question
  const voteAnalysis = React.useMemo(() => {
    const counts: Record<string, number> = {};
    let total = 0;

    (Object.values(responses || {}) as UserResponse[]).forEach(r => {
      const choice = (r?.choice || '').trim().toUpperCase();
      if (choice) {
        counts[choice] = (counts[choice] || 0) + 1;
        total++;
      }
    });

    const percentages: Record<string, number> = {};
    Object.keys(counts).forEach(k => {
      percentages[k] = total > 0 ? Math.round((counts[k] / total) * 100) : 0;
    });

    return { counts, percentages, total };
  }, [responses]);

  const generateCommentary = async () => {
    setIsLoading(true);
    try {
      const result = await aiExplanationService.getMcCoPilotCommentary(
        gameState.question_text || '',
        (gameState.correct_key || 'A').toUpperCase(),
        voteAnalysis.counts,
        voteAnalysis.percentages,
        voteAnalysis.total
      );
      setCommentary(result);
    } catch (err) {
      console.error('[AiMcCoPilot] Error generating commentary:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateCommentary();
    }
  }, [isOpen, gameState.question_id, gameState.status]);

  if (!isOpen) return null;

  const handleBroadcast = () => {
    if (!commentary) return;
    soundFx.playTing();
    const text = `🎙️ [MC Live]: ${commentary.headline} - ${commentary.mcLine}`;
    if (onSendToAnnouncer) {
      onSendToAnnouncer(text);
    } else {
      syncService.updateGameState({
        announcer_overlay: {
          id: `mc_${Date.now()}`,
          text,
          active: true,
          type: 'INFO',
          speed: 'NORMAL',
          repeat: true,
          updated_at: Date.now()
        }
      });
    }
    setSentToast(true);
    setTimeout(() => setSentToast(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-xl bg-[#190839] border border-amber-400/40 rounded-[2px] shadow-2xl flex flex-col overflow-hidden text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-transparent">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-[2px] bg-amber-500/20 border border-amber-400/40 text-amber-300">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-amber-300 flex items-center gap-1.5">
                AI MC Co-pilot
                <span className="text-[10px] px-1.5 py-0.5 rounded-[2px] bg-amber-400/20 text-amber-200 border border-amber-400/40">
                  Live Stage Assist
                </span>
              </h3>
              <p className="text-xs text-white/60">
                Đọc vị dữ liệu hội trường & gợi ý lời dẫn kịch tính cho MC
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-[2px] hover:bg-white/10 transition text-white/70 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 overflow-y-auto max-h-[70vh]">
          {/* Question Summary Pill */}
          <div className="p-3 rounded-[2px] bg-white/5 border border-white/10 flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0 flex-1 truncate">
              <span className="text-white/50 font-mono uppercase mr-1.5">Câu hỏi:</span>
              <span className="font-semibold text-slate-200">{gameState.question_text || 'Chưa chọn câu hỏi'}</span>
            </div>
            <span className="px-2 py-0.5 rounded-[2px] bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 whitespace-nowrap">
              Đ/A: {(gameState.correct_key || 'A').toUpperCase()}
            </span>
          </div>

          {/* Real-time Response Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-[2px] bg-white/5 border border-white/10">
              <span className="text-white/50 block text-[11px]">Tổng phiếu bầu</span>
              <span className="text-base font-bold text-amber-300 font-mono">{voteAnalysis.total}</span>
            </div>
            <div className="p-2.5 rounded-[2px] bg-white/5 border border-white/10">
              <span className="text-white/50 block text-[11px]">Tỉ lệ đúng</span>
              <span className="text-base font-bold text-emerald-400 font-mono">
                {voteAnalysis.percentages[(gameState.correct_key || 'A').toUpperCase()] || 0}%
              </span>
            </div>
            <div className="p-2.5 rounded-[2px] bg-white/5 border border-white/10 col-span-2">
              <span className="text-white/50 block text-[11px]">Phân phối nổi bật</span>
              <span className="text-xs font-mono text-cyan-300 font-medium truncate block">
                {Object.entries(voteAnalysis.percentages).map(([k, p]) => `${k}:${p}%`).join(' • ') || 'Đang chờ nộp bài'}
              </span>
            </div>
          </div>

          {/* AI Cue Card */}
          <div className="p-4 rounded-[2px] bg-gradient-to-br from-amber-500/15 via-[#241148] to-[#190839] border border-amber-400/40 relative shadow-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono text-amber-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> GỢI Ý LỜI DẪN TỨC THÌ CHO MC
              </span>
              <button
                type="button"
                onClick={generateCommentary}
                disabled={isLoading}
                className="p-1 rounded-[2px] hover:bg-white/10 text-amber-300 transition"
                title="Tạo gợi ý mới"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {isLoading ? (
              <div className="py-6 flex flex-col items-center justify-center gap-2 text-white/70">
                <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono">AI đang phân tích tâm lý hội trường...</span>
              </div>
            ) : commentary ? (
              <div className="space-y-2.5">
                <div className="text-sm font-bold text-white bg-amber-400/10 px-3 py-1.5 rounded-[2px] border-l-2 border-amber-400">
                  📢 {commentary.headline}
                </div>
                <p className="text-sm text-amber-100 font-medium leading-relaxed italic bg-black/20 p-3 rounded-[2px] border border-white/5">
                  &ldquo;{commentary.mcLine}&rdquo;
                </p>
              </div>
            ) : (
              <p className="text-xs text-white/50 text-center py-4">Chưa có gợi ý. Bấm nút tạo để AI phân tích.</p>
            )}
          </div>

          {sentToast && (
            <div className="p-2.5 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold text-center flex items-center justify-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4" />
              Đã bắn nội dung lên thanh chữ chạy (Announcer Ticker)!
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-[2px] bg-white/10 hover:bg-white/20 text-xs font-semibold transition text-white"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={generateCommentary}
              disabled={isLoading}
              className="px-3.5 py-2 rounded-[2px] bg-white/10 hover:bg-white/20 border border-white/15 text-xs font-bold text-white flex items-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Gợi ý khác
            </button>

            <button
              onClick={handleBroadcast}
              disabled={!commentary}
              className="px-4 py-2 rounded-[2px] bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              Bắn Lên Chữ Chạy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
