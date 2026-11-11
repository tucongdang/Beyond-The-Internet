import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Sparkles, 
  RotateCcw, 
  Check, 
  Palette, 
  Shuffle, 
  AlertCircle,
  HelpCircle,
  Lock,
  Unlock,
  Trophy
} from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateWarning } from '../utils/hapticUtils';

interface AdminContestantsModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  triggerToast?: (message: string) => void;
}

interface ContestantItem {
  id: string;
  name: string;
  color: string;
}

const PRESET_COLORS = [
  '#38bdf8', // Sky 400
  '#f43f5e', // Rose 500
  '#10b981', // Emerald 500
  '#f59e0b', // Amber 500
  '#a855f7', // Purple 500
  '#ec4899', // Pink 500
  '#06b6d4', // Cyan 500
  '#eab308', // Yellow 500
  '#6366f1', // Indigo 500
  '#14b8a6', // Teal 500
];

const DEFAULT_CONTESTANTS_TEMPLATES: ContestantItem[] = [
  { id: 'contestant_1', name: 'Thí sinh 1 (Alpha)', color: '#38bdf8' },
  { id: 'contestant_2', name: 'Thí sinh 2 (Beta)', color: '#f43f5e' },
  { id: 'contestant_3', name: 'Thí sinh 3 (Gamma)', color: '#10b981' },
  { id: 'contestant_4', name: 'Thí sinh 4 (Delta)', color: '#f59e0b' },
];

export const AdminContestantsModal: React.FC<AdminContestantsModalProps> = ({
  isOpen,
  onClose,
  gameState,
  triggerToast,
}) => {
  const [contestants, setContestants] = useState<ContestantItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activePresetCount, setActivePresetCount] = useState<number>(4);

  // Initialize or sync from gameState.teams
  useEffect(() => {
    if (!isOpen) return;

    if (Array.isArray(gameState.teams) && gameState.teams.length > 0) {
      setContestants(gameState.teams.map((t, idx) => ({
        id: t.id || `contestant_${idx + 1}`,
        name: t.name || `Thí sinh ${idx + 1}`,
        color: t.color || PRESET_COLORS[idx % PRESET_COLORS.length],
      })));
      setActivePresetCount(gameState.teams.length);
    } else {
      setContestants(DEFAULT_CONTESTANTS_TEMPLATES);
      setActivePresetCount(4);
    }
    setHasChanges(false);
  }, [isOpen, gameState.teams]);

  if (!isOpen) return null;

  const notify = (msg: string) => {
    if (triggerToast) triggerToast(msg);
  };

  const handleUpdateName = (index: number, newName: string) => {
    setContestants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], name: newName };
      return next;
    });
    setHasChanges(true);
  };

  const handleUpdateColor = (index: number, newColor: string) => {
    vibrateTap();
    setContestants(prev => {
      const next = [...prev];
      next[index] = { ...next[index], color: newColor };
      return next;
    });
    setHasChanges(true);
  };

  const handleAddContestant = () => {
    vibrateTap();
    soundFx.playClick();
    const nextIdx = contestants.length + 1;
    const newContestant: ContestantItem = {
      id: `contestant_${Date.now()}_${nextIdx}`,
      name: `Thí sinh ${nextIdx}`,
      color: PRESET_COLORS[(nextIdx - 1) % PRESET_COLORS.length],
    };
    setContestants(prev => [...prev, newContestant]);
    setHasChanges(true);
  };

  const handleRemoveContestant = (index: number) => {
    if (contestants.length <= 1) {
      vibrateWarning();
      notify('⚠️ Cần giữ lại ít nhất 1 thí sinh trên sân khấu!');
      return;
    }
    vibrateTap();
    soundFx.playClick();
    setContestants(prev => prev.filter((_, idx) => idx !== index));
    setHasChanges(true);
  };

  // Quick preset template (2, 3, 4, 6 contestants)
  const handleApplyPresetCount = (count: number) => {
    vibrateTap();
    soundFx.playClick();
    setActivePresetCount(count);
    const generated: ContestantItem[] = [];
    const greekLetters = ['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'];

    for (let i = 0; i < count; i++) {
      const existing = contestants[i];
      generated.push({
        id: existing?.id || `contestant_${i + 1}`,
        name: existing?.name || `Thí sinh ${i + 1} (${greekLetters[i] || `Số ${i + 1}`})`,
        color: existing?.color || PRESET_COLORS[i % PRESET_COLORS.length],
      });
    }

    setContestants(generated);
    setHasChanges(true);
  };

  const handleResetDefaults = () => {
    vibrateTap();
    soundFx.playClick();
    setContestants(DEFAULT_CONTESTANTS_TEMPLATES);
    setActivePresetCount(4);
    setHasChanges(true);
  };

  const handleSaveAndSync = async () => {
    // Validate non-empty names
    const invalid = contestants.some(c => !c.name.trim());
    if (invalid) {
      vibrateWarning();
      notify('⚠️ Vui lòng không để trống tên bất kỳ thí sinh nào!');
      return;
    }

    try {
      setIsSaving(true);
      vibrateTap();
      soundFx.playClick();

      const cleaned = contestants.map((c, idx) => ({
        id: c.id.trim() || `contestant_${idx + 1}`,
        name: c.name.trim(),
        color: c.color || PRESET_COLORS[idx % PRESET_COLORS.length],
      }));

      await syncService.updateGameState({
        teams: cleaned,
      });

      vibrateSuccess();
      soundFx.playSuccess();
      setHasChanges(false);
      notify(`✓ Đã lưu & đồng bộ thành công danh sách ${cleaned.length} thí sinh!`);
      onClose();
    } catch (e) {
      console.error('Failed to save contestants:', e);
      vibrateWarning();
      notify('❌ Lỗi khi cập nhật danh sách thí sinh. Vui lòng thử lại!');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn select-none"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-2xl fluent-box rounded-[4px] border border-amber-500/40 bg-gradient-to-b from-[#190839] via-[#12062c] to-[#0D0420] p-4 sm:p-6 shadow-2xl space-y-4 my-auto relative text-white"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[3px] bg-amber-500/20 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-tight font-mono">
                  Quản Lý Thí Sinh & Số Lượng Sân Khấu
                </h2>
                <span className="px-2 py-0.5 rounded-[2px] bg-amber-400/20 text-amber-300 border border-amber-400/40 text-[10px] font-mono font-bold">
                  LIVE SYNC
                </span>
              </div>
              <p className="text-xs text-white/60 mt-0.5">
                Thay đổi tên, màu sắc nhận diện và số lượng thí sinh trên sân khấu. Tự động đồng bộ với tính năng Đặt Điểm Tín Nhiệm (Confidence Staking) và Khán giả.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[2px] hover:bg-white/10 text-white/60 hover:text-white transition cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Presets Bar */}
        <div className="p-3 rounded-[3px] bg-white/5 border border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2 text-xs font-mono text-white/70">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Chọn nhanh số lượng:</span>
          </div>

          <div className="flex items-center gap-1.5">
            {[2, 3, 4, 6].map(num => (
              <button
                key={num}
                type="button"
                onClick={() => handleApplyPresetCount(num)}
                className={`px-3 py-1 rounded-[2px] text-xs font-mono font-bold transition cursor-pointer border ${
                  contestants.length === num
                    ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-sm'
                    : 'bg-white/5 hover:bg-white/15 text-white/80 border-white/10'
                }`}
              >
                {num} Thí Sinh
              </button>
            ))}

            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1 rounded-[2px] text-xs font-mono bg-white/5 hover:bg-white/10 text-white/60 hover:text-white border border-white/10 transition cursor-pointer flex items-center gap-1"
              title="Khôi phục mặc định"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Mặc định</span>
            </button>
          </div>
        </div>

        {/* Contestants List */}
        <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
          {contestants.map((contestant, idx) => (
            <div 
              key={contestant.id || idx}
              className="p-2.5 sm:p-3 rounded-[3px] bg-black/40 border border-white/10 hover:border-amber-400/40 transition flex items-center gap-2.5 sm:gap-3"
            >
              {/* Order Badge */}
              <div 
                className="w-7 h-7 rounded-[2px] flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-sm"
                style={{ backgroundColor: contestant.color, color: '#000' }}
              >
                #{idx + 1}
              </div>

              {/* Contestant Name Input */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={contestant.name}
                  onChange={e => handleUpdateName(idx, e.target.value)}
                  placeholder={`Tên thí sinh ${idx + 1}...`}
                  maxLength={40}
                  className="w-full bg-white/5 focus:bg-white/10 border border-white/15 focus:border-amber-400 rounded-[2px] px-2.5 py-1.5 text-xs sm:text-sm font-semibold text-white outline-none transition"
                />
              </div>

              {/* Color Picker Swatches */}
              <div className="flex items-center gap-1 shrink-0">
                {PRESET_COLORS.slice(0, 5).map(col => (
                  <button
                    key={col}
                    type="button"
                    onClick={() => handleUpdateColor(idx, col)}
                    style={{ backgroundColor: col }}
                    className={`w-5 h-5 rounded-full transition cursor-pointer border ${
                      contestant.color.toLowerCase() === col.toLowerCase()
                        ? 'border-white scale-110 shadow-md shadow-white/20'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                    title={col}
                  />
                ))}
              </div>

              {/* Remove button */}
              <button
                type="button"
                onClick={() => handleRemoveContestant(idx)}
                disabled={contestants.length <= 1}
                className="p-1.5 rounded-[2px] text-white/40 hover:text-rose-400 hover:bg-rose-950/40 transition cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed"
                title="Xóa thí sinh này"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Add Contestant Button */}
        <div>
          <button
            type="button"
            onClick={handleAddContestant}
            className="w-full py-2.5 px-3 rounded-[3px] border border-dashed border-white/20 hover:border-amber-400/60 bg-white/5 hover:bg-amber-400/10 text-white/80 hover:text-amber-300 font-mono text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            <span>Thêm Thí Sinh Mới (+1)</span>
          </button>
        </div>

        {/* Live sync notice */}
        <div className="p-2.5 rounded-[3px] bg-sky-950/40 border border-sky-400/30 text-sky-200 text-xs flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400 shrink-0" />
          <span>
            Khi lưu, tên và màu sắc thí sinh sẽ cập nhật <strong>ngay lập tức</strong> trên màn hình điện thoại khán giả và mô-đun Đặt Điểm Tín Nhiệm (Confidence Staking).
          </span>
        </div>

        {/* Separate Champion Match Vote Control (Khóa trước vòng Về Đích) */}
        <div className="p-3 rounded-[3px] bg-amber-950/30 border border-amber-400/35 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono font-bold text-amber-300 uppercase">
                Cổng Bình Chọn Thí Sinh Chiến Thắng (Quán Quân)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                const nextOpen = !(gameState.champion_vote_open !== false);
                syncService.toggleChampionVoteOpen(nextOpen);
                notify(
                  nextOpen
                    ? 'Đã MỞ cổng bình chọn Quán quân!'
                    : 'Đã KHÓA cổng bình chọn Quán quân (trước vòng Về Đích)!'
                );
              }}
              className={`px-2.5 py-1 rounded-[2px] font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                gameState.champion_vote_open !== false
                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 hover:bg-emerald-900/80'
                  : 'bg-rose-950/70 border-rose-400 text-rose-200 hover:bg-rose-900/80'
              }`}
            >
              {gameState.champion_vote_open !== false ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-300" />
                  <span>ĐANG MỞ BÌNH CHỌN</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-300" />
                  <span>ĐÃ KHÓA TRƯỚC VỀ ĐÍCH</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-[#F7CAC9] font-mono leading-relaxed">
            ⚡ <strong>Cơ chế độc lập:</strong> Cổng bình chọn Quán quân này được khóa lại trước vòng Về Đích. Dù cổng này bị khóa, <strong>tính năng Đặt Điểm Tín Nhiệm theo từng câu hỏi vẫn chạy bình thường</strong>!
          </p>
        </div>

        {/* Confidence Staking (Tín nhiệm từng câu) Gate Control */}
        <div className="p-3 rounded-[3px] bg-cyan-950/30 border border-cyan-400/35 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-cyan-300 uppercase">
                Đặt Điểm Tín Nhiệm (Theo Từng Câu Hỏi)
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                const nextOpen = !(gameState.confidence_staking_open !== false);
                syncService.toggleConfidenceStakingOpen(
                  nextOpen,
                  nextOpen ? '' : 'Ban Tổ Chức đã chốt danh sách đặt điểm tín nhiệm cho câu hỏi này!'
                );
                notify(
                  nextOpen
                    ? 'Đã MỞ LẠI đặt tín nhiệm cho câu hỏi hiện tại!'
                    : 'Đã CHỐT dự đoán tín nhiệm câu hỏi hiện tại!'
                );
              }}
              className={`px-2.5 py-1 rounded-[2px] font-mono text-xs font-bold flex items-center gap-1.5 transition cursor-pointer border ${
                gameState.confidence_staking_open !== false
                  ? 'bg-emerald-950/70 border-emerald-400 text-emerald-200 hover:bg-emerald-900/80'
                  : 'bg-rose-950/70 border-rose-400 text-rose-200 hover:bg-rose-900/80'
              }`}
            >
              {gameState.confidence_staking_open !== false ? (
                <>
                  <Unlock className="w-3.5 h-3.5 text-emerald-300" />
                  <span>ĐANG MỞ ĐẶT TÍN NHIỆM</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5 text-rose-300" />
                  <span>ĐÃ CHỐT DỰ ĐOÁN CÂU NÀY</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-cyan-200/80 font-mono leading-relaxed">
            💡 Khán giả được phép tự do thay đổi thí sinh đặt điểm tín nhiệm trước khi Admin bấm chốt hoặc hết giờ câu hỏi.
          </p>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[2px] bg-white/5 hover:bg-white/10 text-white/70 hover:text-white font-mono text-xs font-bold transition cursor-pointer"
          >
            Đóng
          </button>

          <div className="flex items-center gap-2">
            {hasChanges && (
              <span className="text-[11px] font-mono text-amber-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Chưa lưu thay đổi</span>
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveAndSync}
              disabled={isSaving}
              className="px-5 py-2 rounded-[2px] bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-slate-950 font-mono text-xs font-black shadow-lg shadow-amber-500/20 transition flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Đang Đồng Bộ...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 fill-current" />
                  <span>Lưu & Đồng Bộ Sân Khấu</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
