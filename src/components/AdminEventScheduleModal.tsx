import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Play,
  Flag,
  RotateCcw,
  Shield,
  ShieldAlert,
  CheckCircle2,
  X,
  AlertTriangle,
  Sparkles,
  Info,
  Radio,
  Save,
  Lock,
  Unlock,
  Trophy,
  Swords,
  FlaskConical,
  Award,
  Layers,
  Tag
} from 'lucide-react';
import { GameState, EventScheduleConfig, EventStageStatus, TournamentMatchStage } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess } from '../utils/hapticUtils';

export interface TournamentPresetOption {
  id: TournamentMatchStage;
  label: string;
  badge: string;
  icon: string;
  name: string;
  subtitle: string;
  briefing: string;
  concluding: string;
  badgeBg: string;
  borderColor: string;
}

export const TOURNAMENT_MATCH_PRESETS: TournamentPresetOption[] = [
  {
    id: 'SCRIM',
    label: 'Đấu Thử Nghiệm',
    badge: 'TẬP DƯỢT',
    icon: '🧪',
    name: 'Trận Đấu Thử Nghiệm / Mock Match',
    subtitle: 'Khảo sát giao diện & Làm quen hệ thống',
    briefing: 'Chào mừng các bạn tham gia trận đấu thử nghiệm! Hãy thử tương tác, trả lời câu hỏi và kiểm tra độ mượt mà của hệ thống.',
    concluding: 'Buổi tập dượt đã kết thúc thành công! Hẹn gặp lại các bạn tại các vòng thi chính thức của Beyond The Internet 2026!',
    badgeBg: 'bg-amber-500/20 text-amber-300',
    borderColor: 'border-amber-500/40 hover:border-amber-400'
  },
  {
    id: 'SEMI_1',
    label: 'Bán Kết 1',
    badge: 'SEMI-FINAL 1',
    icon: '⚔️',
    name: 'Trận Bán Kết 1 (Semi-Final 1)',
    subtitle: 'Bảng A - Tranh vé vào Chung Kết',
    briefing: 'Chào mừng quý vị và các bạn đến với Trận Bán Kết 1! Chúc các thí sinh thi đấu tự tin, bản lĩnh và bứt phá ngoạn mục.',
    concluding: 'Trận Bán Kết 1 đã khép lại thành công rực rỡ! Chúc mừng các thí sinh xuất sắc nhất đã giành tấm vé đầu tiên vào Chung Kết!',
    badgeBg: 'bg-sky-500/20 text-sky-300',
    borderColor: 'border-sky-500/40 hover:border-sky-400'
  },
  {
    id: 'SEMI_2',
    label: 'Bán Kết 2',
    badge: 'SEMI-FINAL 2',
    icon: '⚔️',
    name: 'Trận Bán Kết 2 (Semi-Final 2)',
    subtitle: 'Bảng B - Tranh vé vào Chung Kết',
    briefing: 'Chào mừng quý vị và các bạn đến với Trận Bán Kết 2! Hãy chuẩn bị tinh thần và chiến thuật tốt nhất cho từng câu hỏi.',
    concluding: 'Trận Bán Kết 2 đã khép lại thành công rực rỡ! Chúc mừng các thí sinh xuất sắc tiếp theo bước vào Chung Kết!',
    badgeBg: 'bg-indigo-500/20 text-indigo-300',
    borderColor: 'border-indigo-500/40 hover:border-indigo-400'
  },
  {
    id: 'SEMI_3',
    label: 'Bán Kết 3',
    badge: 'SEMI-FINAL 3',
    icon: '⚔️',
    name: 'Trận Bán Kết 3 (Semi-Final 3)',
    subtitle: 'Bảng C - Tranh vé vào Chung Kết',
    briefing: 'Chào mừng quý vị và các bạn đến với Trận Bán Kết 3! Cơ hội cuối cùng để giành tấm vé bước tiếp vào Đêm Chung Kết Tổng!',
    concluding: 'Trận Bán Kết 3 đã kết thúc! Toàn bộ các tấm vé vàng bước vào Đêm Chung Kết Tổng đã chính thức có chủ!',
    badgeBg: 'bg-pink-500/20 text-pink-300',
    borderColor: 'border-pink-500/40 hover:border-pink-400'
  },
  {
    id: 'FINALS',
    label: 'Chung Kết Tổng',
    badge: 'GRAND FINALS',
    icon: '🏆',
    name: 'Đêm Chung Kết Tổng (Grand Finale)',
    subtitle: 'Đêm Vinh Quang & Ngôi Vị Quán Quân',
    briefing: 'Chào mừng toàn thể quý vị đại biểu, thầy cô và khán giả đến với ĐÊM CHUNG KẾT TỔNG Beyond The Internet 2026! Cùng đón xem những màn tranh tài đỉnh cao!',
    concluding: 'Beyond The Internet 2026 đã chính thức tìm ra Nhà Vô Địch! Trân trọng cảm ơn tất cả quý vị đại biểu, thầy cô và các bạn khán giả!',
    badgeBg: 'bg-yellow-500/25 text-yellow-300',
    borderColor: 'border-yellow-400/60 hover:border-yellow-300'
  },
  {
    id: 'CUSTOM',
    label: 'Tùy Chỉnh',
    badge: 'CUSTOM',
    icon: '⚙️',
    name: 'Trận Đấu Tùy Chỉnh',
    subtitle: 'Phiên đấu tương tác đặc biệt',
    briefing: 'Chào mừng các bạn tham gia trận đấu! Chúc các bạn có những trải nghiệm tuyệt vời.',
    concluding: 'Trận đấu đã kết thúc! Cảm ơn sự tham gia nhiệt tình của tất cả các bạn!',
    badgeBg: 'bg-slate-500/20 text-slate-300',
    borderColor: 'border-slate-500/40 hover:border-slate-400'
  }
];

interface AdminEventScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  activeAudienceCount?: number;
  triggerToast?: (message: string) => void;
}

export const AdminEventScheduleModal: React.FC<AdminEventScheduleModalProps> = ({
  isOpen,
  onClose,
  gameState,
  activeAudienceCount = 0,
  triggerToast
}) => {
  const currentSchedule = gameState.event_schedule;

  // Local form state
  const [enabled, setEnabled] = useState<boolean>(Boolean(currentSchedule?.enabled));
  const [status, setStatus] = useState<EventStageStatus>(currentSchedule?.status || 'SCHEDULED');
  
  // Format datetime-local string (YYYY-MM-DDTHH:mm)
  const formatDateTimeLocal = (timestamp: number) => {
    try {
      const d = new Date(timestamp);
      const pad = (n: number) => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
      return '';
    }
  };

  const [scheduledStartTime, setScheduledStartTime] = useState<string>(() => {
    const ts = currentSchedule?.scheduled_start_time || Date.now() + 3600000;
    return formatDateTimeLocal(ts);
  });

  const [autoStartOnTime, setAutoStartOnTime] = useState<boolean>(Boolean(currentSchedule?.auto_start_on_time));
  const [title, setTitle] = useState<string>(currentSchedule?.title || 'Beyond The Internet 2026');
  const [matchStage, setMatchStage] = useState<TournamentMatchStage>(currentSchedule?.match_stage || 'SEMI_1');
  const [matchName, setMatchName] = useState<string>(currentSchedule?.match_name || 'Trận Bán Kết 1 (Semi-Final 1)');
  const [matchSubtitle, setMatchSubtitle] = useState<string>(currentSchedule?.match_subtitle || 'Bảng A - Tranh vé vào Chung Kết');
  const [location, setLocation] = useState<string>(currentSchedule?.location || 'Hội trường Trực tiếp & Nền tảng Tương tác Trực tuyến');
  const [briefingNote, setBriefingNote] = useState<string>(
    currentSchedule?.briefing_note || 'Chào mừng các bạn khán giả! Vui lòng ổn định chỗ ngồi, kiểm tra kết nối mạng và sẵn sàng cho các vòng thi gay cấn.'
  );
  const [concludingMessage, setConcludingMessage] = useState<string>(
    currentSchedule?.concluding_message || 'Cảm ơn toàn thể quý thầy cô, quý đại biểu và các bạn khán giả đã tham gia và cổ vũ nhiệt tình cho Beyond The Internet 2026!'
  );

  const [confirmAction, setConfirmAction] = useState<{
    type: 'START' | 'END' | 'RESET';
    title: string;
    message: string;
  } | null>(null);

  // Sync when prop changes
  useEffect(() => {
    if (isOpen && currentSchedule) {
      setEnabled(Boolean(currentSchedule.enabled));
      setStatus(currentSchedule.status || 'SCHEDULED');
      if (currentSchedule.scheduled_start_time) {
        setScheduledStartTime(formatDateTimeLocal(currentSchedule.scheduled_start_time));
      }
      setAutoStartOnTime(Boolean(currentSchedule.auto_start_on_time));
      if (currentSchedule.title) setTitle(currentSchedule.title);
      if (currentSchedule.match_stage) setMatchStage(currentSchedule.match_stage);
      if (currentSchedule.match_name) setMatchName(currentSchedule.match_name);
      if (currentSchedule.match_subtitle) setMatchSubtitle(currentSchedule.match_subtitle);
      if (currentSchedule.location) setLocation(currentSchedule.location);
      if (currentSchedule.briefing_note) setBriefingNote(currentSchedule.briefing_note);
      if (currentSchedule.concluding_message) setConcludingMessage(currentSchedule.concluding_message);
    }
  }, [isOpen, currentSchedule]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    if (triggerToast) {
      triggerToast(msg);
    }
  };

  // Quick preset helpers for Match Selection
  const applyMatchPreset = (preset: TournamentPresetOption) => {
    soundFx.playClick();
    vibrateTap();
    setMatchStage(preset.id);
    setMatchName(preset.name);
    setMatchSubtitle(preset.subtitle);
    setBriefingNote(preset.briefing);
    setConcludingMessage(preset.concluding);
    showToast(`Đã chọn cấu hình: ${preset.label}`);
  };

  // Quick preset helpers for Time
  const applyPreset = (offsetMs: number) => {
    soundFx.playClick();
    vibrateTap();
    const newDate = new Date(Date.now() + offsetMs);
    setScheduledStartTime(formatDateTimeLocal(newDate.getTime()));
    showToast('Đã áp dụng thời gian dự kiến');
  };

  const applyFixedTimeToday = (hour: number, minute: number) => {
    soundFx.playClick();
    vibrateTap();
    const now = new Date();
    now.setHours(hour, minute, 0, 0);
    // If already past today, set to tomorrow
    if (now.getTime() < Date.now()) {
      now.setDate(now.getDate() + 1);
    }
    setScheduledStartTime(formatDateTimeLocal(now.getTime()));
    showToast(`Đã thiết lập ${hour}:${String(minute).padStart(2, '0')}`);
  };

  // Save config
  const handleSaveConfig = async () => {
    soundFx.playClick();
    vibrateSuccess();

    let startTimestamp = Date.now() + 3600000;
    try {
      const parsed = new Date(scheduledStartTime).getTime();
      if (!isNaN(parsed)) {
        startTimestamp = parsed;
      }
    } catch {}

    const updatedSchedule: EventScheduleConfig = {
      enabled,
      status,
      scheduled_start_time: startTimestamp,
      auto_start_on_time: autoStartOnTime,
      title: title.trim() || 'Beyond The Internet 2026',
      match_stage: matchStage,
      match_name: matchName.trim() || 'Trận Đấu',
      match_subtitle: matchSubtitle.trim(),
      location: location.trim(),
      briefing_note: briefingNote.trim(),
      concluding_message: concludingMessage.trim(),
      allow_early_registration: true,
      started_at: currentSchedule?.started_at,
      ended_at: currentSchedule?.ended_at
    };

    await syncService.updateGameState({
      event_schedule: updatedSchedule
    });

    showToast('✓ Đã lưu cấu hình trận đấu & lịch trình sự kiện!');
    onClose();
  };

  // Handle Start Event Action
  const handleConfirmStartEvent = async () => {
    soundFx.playReveal(true);
    vibrateSuccess();

    let startTimestamp = Date.now();
    try {
      const parsed = new Date(scheduledStartTime).getTime();
      if (!isNaN(parsed)) startTimestamp = parsed;
    } catch {}

    const updatedSchedule: EventScheduleConfig = {
      ...(currentSchedule || {}),
      enabled: true,
      status: 'IN_PROGRESS',
      scheduled_start_time: startTimestamp,
      auto_start_on_time: autoStartOnTime,
      title: title.trim() || 'Beyond The Internet 2026',
      match_stage: matchStage,
      match_name: matchName.trim() || 'Trận Đấu',
      match_subtitle: matchSubtitle.trim(),
      location: location.trim(),
      briefing_note: briefingNote.trim(),
      concluding_message: concludingMessage.trim(),
      started_at: Date.now()
    };

    await syncService.updateGameState({
      event_schedule: updatedSchedule
    });

    setStatus('IN_PROGRESS');
    setConfirmAction(null);
    showToast('🚀 ĐÃ BẮT ĐẦU TRẬN ĐẤU! Khán giả đã được mở khóa vào sàn đấu trực tiếp.');
  };

  // Handle End Event Action
  const handleConfirmEndEvent = async () => {
    soundFx.playSuccess();
    vibrateTap();

    const updatedSchedule: EventScheduleConfig = {
      ...(currentSchedule || {}),
      enabled: true,
      status: 'CONCLUDED',
      title: title.trim() || 'Beyond The Internet 2026',
      match_stage: matchStage,
      match_name: matchName.trim() || 'Trận Đấu',
      match_subtitle: matchSubtitle.trim(),
      location: location.trim(),
      briefing_note: briefingNote.trim(),
      concluding_message: concludingMessage.trim(),
      ended_at: Date.now()
    };

    await syncService.updateGameState({
      event_schedule: updatedSchedule,
      show_qr: false
    });

    setStatus('CONCLUDED');
    setConfirmAction(null);
    showToast('🏁 ĐÃ KẾT THÚC SỰ KIỆN! Khán giả đã chuyển sang màn hình bế mạc & vinh danh.');
  };

  // Handle Reset to Scheduled Action
  const handleConfirmResetScheduled = async () => {
    soundFx.playClick();
    vibrateTap();

    let startTimestamp = Date.now() + 3600000;
    try {
      const parsed = new Date(scheduledStartTime).getTime();
      if (!isNaN(parsed)) startTimestamp = parsed;
    } catch {}

    const updatedSchedule: EventScheduleConfig = {
      ...(currentSchedule || {}),
      enabled: true,
      status: 'SCHEDULED',
      scheduled_start_time: startTimestamp,
      auto_start_on_time: autoStartOnTime,
      title: title.trim() || 'Beyond The Internet 2026',
      match_stage: matchStage,
      match_name: matchName.trim() || 'Trận Đấu',
      match_subtitle: matchSubtitle.trim(),
      location: location.trim(),
      briefing_note: briefingNote.trim(),
      concluding_message: concludingMessage.trim(),
      started_at: undefined,
      ended_at: undefined
    };

    await syncService.updateGameState({
      event_schedule: updatedSchedule
    });

    setStatus('SCHEDULED');
    setConfirmAction(null);
    showToast('⏳ Đã đưa sự kiện về trạng thái Chờ Khai Mạc.');
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0f172a] border border-sky-500/40 rounded-[6px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-white/10 bg-gradient-to-r from-sky-950/60 via-slate-900 to-indigo-950/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-sky-500/20 border border-sky-400/40 text-sky-300 flex items-center justify-center shadow-md">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-white tracking-tight">
                  LỊCH TRÌNH & CẤU HÌNH TRẬN ĐẤU
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-sky-500/20 text-sky-200 border border-sky-400/30 font-bold uppercase">
                  ANTI-LEAK GATE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Thiết lập vòng đấu (Bán kết / Chung kết / Thử nghiệm), ngày giờ và điều phối trận
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[3px] hover:bg-white/10 text-slate-400 hover:text-white transition cursor-pointer"
            title="Đóng modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 custom-scrollbar text-xs sm:text-sm text-slate-200">

          {/* Master Operational Control Bar (Start & End Buttons) */}
          <div className="p-4 rounded-[4px] bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-white/15 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-sky-400 animate-pulse" />
                <span className="font-mono font-bold text-xs uppercase tracking-wider text-slate-300">
                  Trạng Thái Hiện Tại:
                </span>
                {status === 'SCHEDULED' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40">
                    <Clock className="w-3 h-3" /> CHỜ KHAI MẠC (LOCKED)
                  </span>
                ) : status === 'IN_PROGRESS' ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 animate-pulse">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                    ĐANG DIỄN RA (LIVE)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-400/40">
                    <Flag className="w-3 h-3" /> ĐÃ KẾT THÚC (BẾ MẠC)
                  </span>
                )}
              </div>

              <div className="text-[11px] font-mono text-slate-400">
                Khán giả trực tuyến: <strong className="text-emerald-400">{activeAudienceCount}</strong>
              </div>
            </div>

            {/* The 2 Primary Action Buttons: Start & End */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              {/* Button BẮT ĐẦU */}
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  vibrateTap();
                  setConfirmAction({
                    type: 'START',
                    title: 'Xác Nhận Bắt Đầu Sự Kiện?',
                    message: 'Toàn bộ khán giả đang ở Phòng Chờ Khai Mạc sẽ được mở khóa vào sàn đấu trực tiếp ngay lập tức! Bạn đã sẵn sàng mở màn?'
                  });
                }}
                disabled={status === 'IN_PROGRESS'}
                className={`py-3 px-4 rounded-[4px] font-bold text-xs sm:text-sm font-mono flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  status === 'IN_PROGRESS'
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 shadow-emerald-950/60 active:scale-98 ring-1 ring-emerald-300/40'
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                <span>BẮT ĐẦU TRẬN ĐẤU</span>
              </button>

              {/* Button KẾT THÚC */}
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  vibrateTap();
                  setConfirmAction({
                    type: 'END',
                    title: 'Xác Nhận Kết Thúc Sự Kiện?',
                    message: 'Hành động này sẽ đóng phòng thi và chuyển toàn bộ khán giả sang màn hình Bế Mạc & Tổng Kết thành tích chung cuộc!'
                  });
                }}
                disabled={status === 'CONCLUDED'}
                className={`py-3 px-4 rounded-[4px] font-bold text-xs sm:text-sm font-mono flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  status === 'CONCLUDED'
                    ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                    : 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white shadow-rose-950/60 active:scale-98 ring-1 ring-rose-300/40'
                }`}
              >
                <Flag className="w-4 h-4" />
                <span>KẾT THÚC SỰ KIỆN</span>
              </button>
            </div>

            {/* Sub-action: Reset to Scheduled if testing */}
            {status !== 'SCHEDULED' && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    soundFx.playClick();
                    vibrateTap();
                    setConfirmAction({
                      type: 'RESET',
                      title: 'Khôi phục về trạng thái Chờ Khai Mạc?',
                      message: 'Thao tác này dùng cho trường hợp chạy thử/tổng duyệt và muốn đưa hệ thống về lại Phòng Chờ trước khi diễn ra trận thật.'
                    });
                  }}
                  className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 font-mono hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Đưa về trạng thái Chờ Khai Mạc (Reset to Scheduled)</span>
                </button>
              </div>
            )}
          </div>

          {/* Section: Tournament Match Selection Presets */}
          <div className="p-4 rounded-[4px] bg-slate-900 border border-white/10 space-y-3.5">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-amber-300">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>Vòng Đấu & Trận Đấu Giải (Tournament Match Presets)</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/10">
                1-Click Quick Select
              </span>
            </div>

            {/* Quick Match Preset Buttons */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-2.5">
              {TOURNAMENT_MATCH_PRESETS.map((preset) => {
                const isSelected = matchStage === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyMatchPreset(preset)}
                    className={`p-2.5 rounded-[4px] text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-slate-800/90 border-amber-400 shadow-md ring-1 ring-amber-400/50 scale-[1.02]'
                        : 'bg-slate-950/60 border-white/10 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-base">{preset.icon}</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${preset.badgeBg}`}>
                        {preset.badge}
                      </span>
                    </div>
                    <div>
                      <div className={`font-bold text-xs ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        {preset.label}
                      </div>
                      <div className="text-[10px] text-slate-400 line-clamp-1">
                        {preset.subtitle}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Match Customization Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 block font-bold">
                  Tên trận đấu hiển thị:
                </label>
                <input
                  type="text"
                  value={matchName}
                  onChange={(e) => setMatchName(e.target.value)}
                  placeholder="Ví dụ: Trận Bán Kết 1 (Semi-Final 1)"
                  className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 text-white text-xs px-3 py-2 rounded-[3px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 block font-bold">
                  Phụ đề / Bảng đấu:
                </label>
                <input
                  type="text"
                  value={matchSubtitle}
                  onChange={(e) => setMatchSubtitle(e.target.value)}
                  placeholder="Ví dụ: Bảng A - Tranh vé vào Chung Kết"
                  className="w-full bg-slate-950 border border-white/15 focus:border-amber-400 text-white text-xs px-3 py-2 rounded-[3px] outline-none"
                />
              </div>
            </div>
          </div>

          {/* Master Toggle: Enable Anti-Leak Waiting Room Gate */}
          <div className="p-4 rounded-[4px] bg-slate-900 border border-white/10 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-white text-xs sm:text-sm">
                  <Shield className="w-4 h-4 text-sky-400" />
                  <span>Bật Phòng Chờ Khai Mạc (Bảo vệ nội dung đề thi trước giờ G)</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Khi bật: Khán giả quét QR hoặc đăng ký sớm sẽ được giữ ở Phòng Chờ Khai Mạc có đồng hồ đếm ngược. Toàn bộ câu hỏi, đáp án được mã hóa bảo mật tuyệt đối cho đến khi Ban Tổ Chức bấm &ldquo;Bắt đầu&rdquo;.
                </p>
              </div>

              {/* Toggle Switch */}
              <button
                type="button"
                onClick={() => {
                  soundFx.playClick();
                  vibrateTap();
                  setEnabled(!enabled);
                }}
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                  enabled ? 'bg-sky-500' : 'bg-slate-700'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                    enabled ? 'left-6.5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Section: Date & Time Picker */}
          <div className="p-4 rounded-[4px] bg-slate-900 border border-white/10 space-y-3">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
              <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-slate-300">
                <Clock className="w-4 h-4 text-amber-400" />
                <span>Ngày & Giờ Tổ Chức Sự Kiện</span>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">Múi giờ: GMT+7 (Hà Nội)</span>
            </div>

            <div className="space-y-2">
              <input
                type="datetime-local"
                value={scheduledStartTime}
                onChange={(e) => setScheduledStartTime(e.target.value)}
                className="w-full bg-slate-950 border border-white/15 focus:border-sky-400 text-white font-mono text-sm px-3.5 py-2.5 rounded-[3px] outline-none transition"
              />

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[11px] font-mono text-slate-400 mr-1">Chọn nhanh:</span>
                <button
                  type="button"
                  onClick={() => applyPreset(15 * 60 * 1000)}
                  className="px-2 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition cursor-pointer"
                >
                  +15 phút nữa
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(60 * 60 * 1000)}
                  className="px-2 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-mono transition cursor-pointer"
                >
                  +1 giờ nữa
                </button>
                <button
                  type="button"
                  onClick={() => applyFixedTimeToday(19, 30)}
                  className="px-2 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-amber-300 hover:text-amber-200 border border-amber-400/20 text-xs font-mono transition cursor-pointer"
                >
                  19:30 Tối nay
                </button>
                <button
                  type="button"
                  onClick={() => applyFixedTimeToday(20, 0)}
                  className="px-2 py-1 rounded-[2px] bg-white/5 hover:bg-white/10 text-sky-300 hover:text-sky-200 border border-sky-400/20 text-xs font-mono transition cursor-pointer"
                >
                  20:00 Tối nay
                </button>
              </div>
            </div>

            {/* Auto Start Option */}
            <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5">
              <div>
                <span className="text-xs font-bold text-slate-200 block">
                  Tự động chuyển vào sàn đấu khi tới giờ
                </span>
                <span className="text-[11px] text-slate-400 block">
                  Khuyên dùng: Tắt tùy chọn này để Ban Tổ Chức chủ động bấm &ldquo;Bắt đầu&rdquo; sau khi MC khai mạc xong.
                </span>
              </div>
              <input
                type="checkbox"
                checked={autoStartOnTime}
                onChange={(e) => setAutoStartOnTime(e.target.checked)}
                className="w-4 h-4 rounded accent-sky-500 cursor-pointer"
              />
            </div>
          </div>

          {/* Section: Event Information (Title, Location, Briefing) */}
          <div className="p-4 rounded-[4px] bg-slate-900 border border-white/10 space-y-3">
            <div className="flex items-center gap-2 font-mono font-bold text-xs uppercase tracking-wider text-slate-300 border-b border-white/10 pb-2">
              <Info className="w-4 h-4 text-purple-400" />
              <span>Thông Tin & Thông Điệp Sự Kiện</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 block font-bold">
                  Tiêu đề sự kiện lớn:
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ví dụ: Beyond The Internet 2026"
                  className="w-full bg-slate-950 border border-white/15 focus:border-sky-400 text-white text-xs px-3 py-2 rounded-[3px] outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-mono text-slate-300 block font-bold">
                  Địa điểm tổ chức:
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ví dụ: Hội trường A / Sân khấu chính"
                  className="w-full bg-slate-950 border border-white/15 focus:border-sky-400 text-white text-xs px-3 py-2 rounded-[3px] outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300 block font-bold">
                Lời dặn gửi khán giả (Hiển thị trong Phòng Chờ Khai Mạc):
              </label>
              <textarea
                value={briefingNote}
                onChange={(e) => setBriefingNote(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-white/15 focus:border-sky-400 text-white text-xs p-2.5 rounded-[3px] outline-none resize-none leading-relaxed"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-mono text-slate-300 block font-bold">
                Thông điệp bế mạc (Hiển thị khi Kết Thúc Sự Kiện):
              </label>
              <textarea
                value={concludingMessage}
                onChange={(e) => setConcludingMessage(e.target.value)}
                rows={2}
                className="w-full bg-slate-950 border border-white/15 focus:border-sky-400 text-white text-xs p-2.5 rounded-[3px] outline-none resize-none leading-relaxed"
              />
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[3px] bg-white/10 hover:bg-white/15 text-slate-300 hover:text-white text-xs font-mono transition cursor-pointer"
          >
            Đóng
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-5 py-2 rounded-[3px] bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs font-mono shadow-md flex items-center gap-1.5 cursor-pointer transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Lưu Cấu Hình Trận Đấu & Lịch Trình</span>
          </button>
        </div>

        {/* Confirm Action Sub-Dialog */}
        {confirmAction && (
          <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="max-w-md w-full bg-[#13072b] border border-amber-400/40 rounded-[6px] p-5 sm:p-6 shadow-2xl text-white space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-[4px] flex items-center justify-center shrink-0 ${
                  confirmAction.type === 'START' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-400/40' :
                  confirmAction.type === 'END' ? 'bg-rose-500/20 text-rose-400 border border-rose-400/40' :
                  'bg-amber-500/20 text-amber-400 border border-amber-400/40'
                }`}>
                  {confirmAction.type === 'START' ? <Play className="w-5 h-5 fill-current" /> :
                   confirmAction.type === 'END' ? <Flag className="w-5 h-5" /> :
                   <RotateCcw className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="font-bold text-sm sm:text-base text-white">{confirmAction.title}</h3>
                  <p className="text-xs text-slate-400">Xác nhận thao tác vận hành sự kiện</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-black/30 p-3 rounded-[4px] border border-white/10">
                {confirmAction.message}
              </p>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="px-3.5 py-1.5 rounded-[3px] bg-white/10 hover:bg-white/15 text-xs font-mono text-slate-300 transition cursor-pointer"
                >
                  Hủy Bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirmAction.type === 'START') {
                      handleConfirmStartEvent();
                    } else if (confirmAction.type === 'END') {
                      handleConfirmEndEvent();
                    } else if (confirmAction.type === 'RESET') {
                      handleConfirmResetScheduled();
                    }
                  }}
                  className={`px-4 py-1.5 rounded-[3px] font-bold text-xs font-mono shadow-md transition cursor-pointer ${
                    confirmAction.type === 'START' ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950' :
                    confirmAction.type === 'END' ? 'bg-rose-600 hover:bg-rose-500 text-white' :
                    'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  Đồng Ý Thực Hiện
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
