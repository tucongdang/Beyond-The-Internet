import React, { useState, useEffect } from 'react';
import {
  Trophy,
  Swords,
  FlaskConical,
  Sparkles,
  CheckCircle2,
  Calendar,
  Save,
  Radio,
  Tv,
  Users,
  Layers,
  Edit3,
  RefreshCw,
  Tag
} from 'lucide-react';
import { GameState, TournamentMatchStage, EventScheduleConfig } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

export interface MatchPreset {
  id: TournamentMatchStage;
  label: string;
  badge: string;
  icon: string;
  name: string;
  subtitle: string;
  badgeBg: string;
  activeBorder: string;
}

export const MATCH_PRESETS: MatchPreset[] = [
  {
    id: 'SCRIM',
    label: 'Đấu Thử Nghiệm',
    badge: 'TẬP DƯỢT',
    icon: '🧪',
    name: 'Trận Đấu Thử Nghiệm',
    subtitle: 'Khảo sát giao diện & Làm quen hệ thống',
    badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-400/40',
    activeBorder: 'border-amber-400 bg-amber-950/40 text-amber-200'
  },
  {
    id: 'SEMI_1',
    label: 'Bán Kết 1',
    badge: 'BÁN KẾT 1',
    icon: '⚔️',
    name: 'Trận Bán Kết 1',
    subtitle: 'Bảng A - Tranh vé vào Chung Kết',
    badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-400/40',
    activeBorder: 'border-sky-400 bg-sky-950/40 text-sky-200'
  },
  {
    id: 'SEMI_2',
    label: 'Bán Kết 2',
    badge: 'BÁN KẾT 2',
    icon: '⚔️',
    name: 'Trận Bán Kết 2',
    subtitle: 'Bảng B - Tranh vé vào Chung Kết',
    badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-400/40',
    activeBorder: 'border-indigo-400 bg-indigo-950/40 text-indigo-200'
  },
  {
    id: 'SEMI_3',
    label: 'Bán Kết 3',
    badge: 'BÁN KẾT 3',
    icon: '⚔️',
    name: 'Trận Bán Kết 3',
    subtitle: 'Bảng C - Tranh vé vào Chung Kết',
    badgeBg: 'bg-pink-500/20 text-pink-300 border-pink-400/40',
    activeBorder: 'border-pink-400 bg-pink-950/40 text-pink-200'
  },
  {
    id: 'FINALS',
    label: 'Chung Kết Tổng',
    badge: 'CHUNG KẾT',
    icon: '🏆',
    name: 'Đêm Chung Kết Tổng',
    subtitle: 'Đêm Vinh Quang & Ngôi Vị Quán Quân',
    badgeBg: 'bg-yellow-500/25 text-yellow-300 border-yellow-400/50',
    activeBorder: 'border-yellow-400 bg-yellow-950/40 text-yellow-200'
  },
  {
    id: 'CUSTOM',
    label: 'Tùy Chỉnh',
    badge: 'TÙY CHỈNH',
    icon: '⚙️',
    name: 'Trận Đấu Tùy Chỉnh',
    subtitle: 'Phiên đấu tương tác đặc biệt',
    badgeBg: 'bg-slate-500/20 text-slate-300 border-slate-400/40',
    activeBorder: 'border-slate-400 bg-slate-900 text-slate-200'
  }
];

interface AdminMatchConfigSectionProps {
  gameState: GameState;
  onOpenFullScheduleModal?: () => void;
  triggerToast?: (message: string) => void;
  className?: string;
  compact?: boolean;
}

export const AdminMatchConfigSection: React.FC<AdminMatchConfigSectionProps> = ({
  gameState,
  onOpenFullScheduleModal,
  triggerToast,
  className = '',
  compact = false
}) => {
  const currentSchedule = gameState.event_schedule;
  const currentMatchStage = currentSchedule?.match_stage || 'SEMI_1';
  const currentMatchName = currentSchedule?.match_name || 'Trận Bán Kết 1';
  const currentMatchSubtitle = currentSchedule?.match_subtitle || 'Bảng A - Tranh vé vào Chung Kết';

  const [inputName, setInputName] = useState<string>(currentMatchName);
  const [inputSubtitle, setInputSubtitle] = useState<string>(currentMatchSubtitle);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDirty, setIsDirty] = useState<boolean>(false);

  // Sync state when gameState updates from remote
  useEffect(() => {
    if (currentSchedule?.match_name) {
      setInputName(currentSchedule.match_name);
    }
    if (currentSchedule?.match_subtitle !== undefined) {
      setInputSubtitle(currentSchedule.match_subtitle || '');
    }
    setIsDirty(false);
  }, [currentSchedule?.match_name, currentSchedule?.match_subtitle, currentSchedule?.match_stage]);

  const showToast = (msg: string) => {
    if (triggerToast) {
      triggerToast(msg);
    }
  };

  // Quick 1-Click switch preset
  const handleSelectPreset = async (preset: MatchPreset) => {
    soundFx.playClick();
    vibrateTap();

    setInputName(preset.name);
    setInputSubtitle(preset.subtitle);
    setIsDirty(false);

    const updatedSchedule: EventScheduleConfig = {
      ...(currentSchedule || {
        enabled: true,
        status: 'SCHEDULED',
        scheduled_start_time: Date.now() + 3600000,
        title: 'Beyond The Internet 2026'
      }),
      match_stage: preset.id,
      match_name: preset.name,
      match_subtitle: preset.subtitle
    };

    try {
      setIsSaving(true);
      await syncService.updateGameState({
        event_schedule: updatedSchedule
      });
      vibrateSuccess();
      showToast(`✓ Đã chuyển sang: ${preset.label} — Đồng bộ ngay lập tức toàn hệ thống!`);
    } catch (e) {
      console.error('Failed to update match preset:', e);
      showToast('❌ Lỗi khi đồng bộ trận đấu');
    } finally {
      setIsSaving(false);
    }
  };

  // Apply custom text input
  const handleApplyCustom = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputName.trim()) {
      showToast('⚠️ Vui lòng nhập tên nhãn trận đấu');
      return;
    }

    soundFx.playClick();
    vibrateTap();

    const trimmedName = inputName.trim();
    const trimmedSubtitle = inputSubtitle.trim();

    // Determine stage if matching preset
    let detectedStage: TournamentMatchStage = 'CUSTOM';
    const found = MATCH_PRESETS.find(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase() || p.label.toLowerCase() === trimmedName.toLowerCase()
    );
    if (found) {
      detectedStage = found.id;
    }

    const updatedSchedule: EventScheduleConfig = {
      ...(currentSchedule || {
        enabled: true,
        status: 'SCHEDULED',
        scheduled_start_time: Date.now() + 3600000,
        title: 'Beyond The Internet 2026'
      }),
      match_stage: detectedStage,
      match_name: trimmedName,
      match_subtitle: trimmedSubtitle
    };

    try {
      setIsSaving(true);
      await syncService.updateGameState({
        event_schedule: updatedSchedule
      });
      vibrateSuccess();
      setIsDirty(false);
      showToast(`✓ Đã cập nhật nhãn trận đấu: "${trimmedName}" & đồng bộ màn chiếu/khán giả!`);
    } catch (e) {
      console.error('Failed to update match name:', e);
      showToast('❌ Lỗi khi lưu nhãn trận đấu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section
      id="section-match-configuration"
      className={`border rounded-[4px] p-3.5 sm:p-4 transition-all duration-300 bg-gradient-to-r from-[#140b2a]/90 via-[#0e1628]/95 to-[#140b2a]/90 border-amber-500/30 shadow-xl relative overflow-hidden ${className}`}
    >
      {/* Background glow ambient */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none -mr-16 -mt-16" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-sky-500/5 rounded-full blur-3xl pointer-events-none -ml-16 -mb-16" />

      <div className="relative z-10 space-y-3.5">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-white/10">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-[3px] bg-gradient-to-tr from-amber-500/20 to-yellow-500/30 border border-amber-400/50 flex items-center justify-center text-amber-300 shadow-md shrink-0">
              <Trophy className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <span>CẤU HÌNH VÒNG ĐẤU & NHÃN TRẬN</span>
                  <span className="text-slate-400 font-normal">/ MATCH CONFIG</span>
                </h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[9px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  REAL-TIME SYNC
                </span>
              </div>
              <p className="text-[11px] text-slate-300/80 truncate">
                Đồng bộ thương hiệu vòng thi (Bán kết 1, Bán kết 2, Chung kết, Thử nghiệm) trên Màn chiếu & Khán giả
              </p>
            </div>
          </div>

          {/* Current Active Badge Display & Full Schedule Modal Trigger */}
          <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
            <div className="px-2.5 py-1 rounded-[3px] bg-black/40 border border-amber-400/30 flex items-center gap-2">
              <span className="text-[10px] font-mono text-slate-400 uppercase">Hiện tại:</span>
              <span className="text-xs font-mono font-black text-amber-300 flex items-center gap-1">
                <span>{currentMatchName}</span>
              </span>
            </div>

            {onOpenFullScheduleModal && (
              <button
                type="button"
                onClick={onOpenFullScheduleModal}
                className="px-2.5 py-1 rounded-[3px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[11px] font-mono flex items-center gap-1 transition cursor-pointer"
                title="Mở toàn bộ cấu hình lịch trình ngày giờ & phòng chờ"
              >
                <Calendar className="w-3 h-3 text-sky-400" />
                <span className="hidden sm:inline">Lịch Trình Chi Tiết</span>
              </button>
            )}
          </div>
        </div>

        {/* 1-Click Match Presets Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>Chọn nhanh vòng đấu (1-Click Switch):</span>
            <span className="text-[10px] text-amber-300/80">Tự động cập nhật tức thì</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {MATCH_PRESETS.map((preset) => {
              const isSelected =
                currentSchedule?.match_stage === preset.id ||
                (!currentSchedule?.match_stage && preset.id === 'SEMI_1') ||
                currentSchedule?.match_name === preset.name;

              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  disabled={isSaving}
                  className={`p-2 rounded-[3px] text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1 shadow-sm ${
                    isSelected
                      ? `${preset.activeBorder} shadow-amber-950/50 ring-1 ring-amber-400/50 scale-[1.02]`
                      : 'bg-black/30 hover:bg-white/5 border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-sm">{preset.icon}</span>
                    <span className={`text-[8.5px] font-mono font-bold px-1.5 py-0.2 rounded ${preset.badgeBg}`}>
                      {preset.badge}
                    </span>
                  </div>
                  <div>
                    <div className={`font-bold text-[11px] truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {preset.label}
                    </div>
                    <div className="text-[9.5px] text-slate-400 truncate">
                      {preset.subtitle.split('-')[0].trim()}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Inline Match Label & Subtitle Editor */}
        <form onSubmit={handleApplyCustom} className="pt-2 border-t border-white/10 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-end">
          <div className="md:col-span-5 space-y-1">
            <label className="text-[10.5px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Tag className="w-3 h-3 text-amber-400" />
              <span>Tên nhãn trận đấu hiển thị (Match Title):</span>
            </label>
            <input
              type="text"
              value={inputName}
              onChange={(e) => {
                setInputName(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ví dụ: Bán kết 1, Chung kết, Vòng Bảng A..."
              className="w-full bg-black/50 border border-white/15 focus:border-amber-400 text-white font-mono text-xs px-3 py-1.5 rounded-[3px] outline-none transition"
            />
          </div>

          <div className="md:col-span-4 space-y-1">
            <label className="text-[10.5px] font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Layers className="w-3 h-3 text-sky-400" />
              <span>Phụ đề / Bảng đấu (Match Subtitle):</span>
            </label>
            <input
              type="text"
              value={inputSubtitle}
              onChange={(e) => {
                setInputSubtitle(e.target.value);
                setIsDirty(true);
              }}
              placeholder="Ví dụ: Bảng A - Tranh vé vào Chung kết"
              className="w-full bg-black/50 border border-white/15 focus:border-sky-400 text-white text-xs px-3 py-1.5 rounded-[3px] outline-none transition"
            />
          </div>

          <div className="md:col-span-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={isSaving || (!isDirty && inputName === currentMatchName && inputSubtitle === currentMatchSubtitle)}
              className={`w-full py-2 px-3 rounded-[3px] font-mono font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer ${
                isDirty
                  ? 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-amber-950/50 animate-pulse'
                  : 'bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Lưu & Đồng Bộ</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Real-time Screen Synchronization Indicators */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 text-sky-300">
              <Tv className="w-3 h-3" /> Màn Chiếu Khán Phòng (Synced)
            </span>
            <span className="flex items-center gap-1 text-purple-300">
              <Users className="w-3 h-3" /> Thiết Bị Khán Giả (Synced)
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <Radio className="w-3 h-3" /> Phòng Chờ Khai Mạc (Synced)
            </span>
          </div>

          <span className="text-white/40">
            Thao tác trực tiếp cập nhật toàn bộ Header & Bảng điểm
          </span>
        </div>
      </div>
    </section>
  );
};
