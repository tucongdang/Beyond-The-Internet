import React, { useState, useEffect } from 'react';
import { GameState, AnnouncerOverlay as AnnouncerOverlayType } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateWarning } from '../utils/hapticUtils';
import { AnnouncerOverlay } from './AnnouncerOverlay';
import {
  Megaphone,
  Radio,
  AlertTriangle,
  Bell,
  Sparkles,
  Play,
  Square,
  X,
  History,
  Check,
  Send,
  Zap,
  Clock,
  Trash2,
  AlertCircle
} from 'lucide-react';

interface AnnouncerControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

const PRESET_ANNOUNCEMENTS = [
  {
    type: 'INFO' as const,
    label: 'Ổn định vị trí',
    text: 'Xin mời tất cả các đội thi và khán giả ổn định vị trí để chuẩn bị bắt đầu phần thi tiếp theo!'
  },
  {
    type: 'ALERT' as const,
    label: 'Đếm ngược chuẩn bị 2 phút',
    text: 'Ban tổ chức thông báo: Thời gian chuẩn bị còn 2 phút. Khán giả vui lòng kiểm tra kết nối thiết bị!'
  },
  {
    type: 'URGENT' as const,
    label: 'Kiểm tra mạng & Giữ trật tự',
    text: 'CHÚ Ý: Đề nghị toàn thể hội trường giữ trật tự và đảm bảo không can thiệp thiết bị của thí sinh.'
  },
  {
    type: 'CELEBRATION' as const,
    label: 'Chúc mừng ghi điểm xuất sắc',
    text: 'CHÚC MỪNG: Thí sinh vừa xuất sắc giành trọn điểm số tối đa trong câu hỏi vừa qua!'
  },
  {
    type: 'INFO' as const,
    label: 'BGK đang hội ý chấm điểm',
    text: 'Hội đồng Ban Giám Khảo & Cố vấn đang tiến hành đối soát và tổng hợp kết quả. Kết quả sẽ hiển thị ngay!'
  },
  {
    type: 'CELEBRATION' as const,
    label: 'Thông báo Quay Số May Mắn',
    text: 'Sắp diễn ra chương trình Quay Số May Mắn (Lucky Draw) với nhiều phần quà hấp dẫn cho khán giả!'
  }
];

const STORAGE_KEY_HISTORY = 'BTI2026_ANNOUNCER_HISTORY';

export const AnnouncerControlModal: React.FC<AnnouncerControlModalProps> = ({
  isOpen,
  onClose,
  gameState
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isClearHistoryConfirmOpen, setIsClearHistoryConfirmOpen] = useState(false);

  const notify = (message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const currentOverlay = gameState.announcer_overlay;

  const [text, setText] = useState<string>(currentOverlay?.text || '');
  const [type, setType] = useState<'INFO' | 'URGENT' | 'ALERT' | 'CELEBRATION'>(
    currentOverlay?.type || 'INFO'
  );
  const [speed, setSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>(
    currentOverlay?.speed || 'NORMAL'
  );

  const [history, setHistory] = useState<Array<{ text: string; type: 'INFO' | 'URGENT' | 'ALERT' | 'CELEBRATION'; timestamp: number }>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_HISTORY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  // Sync state if currentOverlay changes from another admin
  useEffect(() => {
    if (currentOverlay?.text) {
      setText(currentOverlay.text);
      if (currentOverlay.type) setType(currentOverlay.type);
      if (currentOverlay.speed) setSpeed(currentOverlay.speed);
    }
  }, [currentOverlay]);

  if (!isOpen) return null;

  const handlePublish = async () => {
    if (!text.trim()) {
      notify('Vui lòng nhập nội dung thông báo!');
      return;
    }

    vibrateSuccess();
    soundFx.playReveal(true);

    const overlayPayload: AnnouncerOverlayType = {
      id: 'ann_' + Date.now(),
      text: text.trim(),
      active: true,
      type,
      speed,
      updated_at: Date.now()
    };

    // Save to local history
    const updatedHistory = [
      { text: text.trim(), type, timestamp: Date.now() },
      ...history.filter(h => h.text.trim() !== text.trim()).slice(0, 15)
    ];
    setHistory(updatedHistory);
    try {
      localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory));
    } catch {}

    await syncService.updateGameState({
      announcer_overlay: overlayPayload
    });
  };

  const handleStopOverlay = async () => {
    vibrateWarning();
    soundFx.playClick();

    await syncService.updateGameState({
      announcer_overlay: null
    });
  };


  // Preview object
  const previewOverlay: AnnouncerOverlayType = {
    text: text.trim() || 'Nhập nội dung thông báo để xem trước dòng chữ chạy trực tiếp tại đây...',
    active: true,
    type,
    speed
  };

  const isCurrentActive = Boolean(currentOverlay?.active && currentOverlay?.text);

  return (
    <div className="fluent-dialog-overlay animate-fadeIn">
      <div className="max-w-3xl w-full fluent-box rounded-[4px] p-5 sm:p-6 shadow-2xl relative max-h-[92vh] flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] fluent-box-nested text-[#F7CAC9] border border-[#F7CAC9]/30 flex items-center justify-center shadow-md">
              <Megaphone className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  Phát Thông Báo Chữ Chạy (Announcer Overlay)
                </h3>
                {isCurrentActive && (
                  <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Đang Phát Live
                  </span>
                )}
              </div>
              <p className="text-xs text-white/50">
                Hiển thị dòng chữ thông báo Marquee trực tiếp tại viền dưới màn hình Màn Chiếu & Khán Giả
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[4px] bg-white/10 hover:bg-white/20 text-white/60 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 custom-scrollbar pr-1">
          {/* Live Preview Container */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold text-white/60 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Xem Trước Dòng Chữ Chạy Trực Tiếp (Live Ticker Preview):
              </label>
              <span className="text-[10px] font-mono text-cyan-300">
                Tốc độ: {speed === 'FAST' ? 'Nhanh (14s)' : speed === 'SLOW' ? 'Chậm (32s)' : 'Chuẩn (22s)'}
              </span>
            </div>
            <div className="rounded-[4px] overflow-hidden border border-white/15 fluent-box-nested shadow-inner">
              <AnnouncerOverlay overlay={previewOverlay} mode="preview" />
            </div>
          </div>

          {/* Text Input Area */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-white/80">
                Nội dung thông báo phát trực tiếp:
              </label>
              <span className={`text-[10px] font-mono ${text.length > 250 ? 'text-amber-400' : 'text-white/40'}`}>
                {text.length} ký tự
              </span>
            </div>
            <textarea
              rows={3}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Nhập nội dung cập nhật, thông báo tiến độ, hướng dẫn khán giả hoặc lời chúc..."
              className="w-full fluent-box-nested border border-white/15 focus:border-[#F7CAC9] rounded-[4px] p-3 text-sm text-white placeholder-white/30 resize-none font-medium outline-none transition"
            />
          </div>

          {/* Quick Preset Buttons */}
          <div>
            <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
              Mẫu thông báo thông dụng (Bấm để điền nhanh):
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PRESET_ANNOUNCEMENTS.map((preset, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    setText(preset.text);
                    setType(preset.type);
                  }}
                  className="fluent-subtab-btn p-2.5 rounded-[4px] fluent-box-nested hover:bg-white/15 border border-white/10 hover:border-[#F7CAC9]/40 text-left transition group flex items-start gap-2.5 cursor-pointer"
                >
                  <span className="text-sm mt-0.5">
                    {preset.type === 'URGENT' ? '🚨' : preset.type === 'ALERT' ? '⚠️' : preset.type === 'CELEBRATION' ? '🏆' : '📢'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white group-hover:text-[#F7CAC9] transition">
                      {preset.label}
                    </div>
                    <div className="text-[11px] text-white/50 truncate font-normal">
                      {preset.text}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Configuration: Type & Speed */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Style / Theme selector */}
            <div>
              <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
                Phân Loại / Sắc Thái (Theme):
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: 'INFO', label: '📢 Thông Báo', color: 'border-cyan-500/50 bg-cyan-950/40 text-cyan-300' },
                  { id: 'URGENT', label: '🚨 Khẩn Cấp', color: 'border-rose-500/50 bg-rose-950/40 text-rose-300' },
                  { id: 'ALERT', label: '⚠️ Lưu Ý', color: 'border-amber-500/50 bg-amber-950/40 text-amber-300' },
                  { id: 'CELEBRATION', label: '🏆 Vinh Danh', color: 'border-pink-500/50 bg-pink-950/40 text-pink-300' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      setType(item.id as any);
                    }}
                    className={`fluent-subtab-btn py-2 px-2.5 rounded-[4px] border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                      type === item.id
                        ? `${item.color} shadow-lg ring-1 ring-white/30 font-black`
                        : 'border-white/10 fluent-box-nested text-white/60 hover:text-white'
                    }`}
                  >
                    <span>{item.label}</span>
                    {type === item.id && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed selector */}
            <div>
              <label className="block text-[11px] font-bold text-white/60 uppercase tracking-wider mb-2">
                Tốc Độ Chạy Chữ:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {[
                  { id: 'SLOW', label: 'Chậm', sub: '32s' },
                  { id: 'NORMAL', label: 'Chuẩn', sub: '22s' },
                  { id: 'FAST', label: 'Nhanh', sub: '14s' }
                ].map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      setSpeed(s.id as any);
                    }}
                    className={`fluent-subtab-btn py-2 px-2 rounded-[4px] border text-center transition cursor-pointer ${
                      speed === s.id
                        ? 'border-[#F7CAC9] bg-[#F7CAC9]/15 text-[#F7CAC9] shadow-md font-black'
                        : 'border-white/10 fluent-box-nested text-white/60 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-bold">{s.label}</div>
                    <div className="text-[9px] font-mono text-white/40">{s.sub}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* History Section */}
          {history.length > 0 && (
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-white/60">
                  <History className="w-3.5 h-3.5 text-[#F7CAC9]" />
                  <span>Lịch sử thông báo đã gửi gần đây:</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsClearHistoryConfirmOpen(true)}
                  className="text-[10px] text-white/40 hover:text-rose-400 flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  Xóa lịch sử
                </button>
              </div>

              {isClearHistoryConfirmOpen && (
                <div className="fluent-dialog-overlay animate-fadeIn">
                  <div className="max-w-md w-full fluent-box rounded-[4px] p-5 shadow-2xl text-white border border-rose-500/40">
                    <h3 className="font-bold text-rose-300 text-base">Xác nhận Xóa Lịch Sử?</h3>
                    <p className="text-white/70 text-xs mt-2">
                      Bạn có chắc chắn muốn xóa toàn bộ lịch sử các thông báo đã gửi không?
                    </p>
                    <div className="mt-5 flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => setIsClearHistoryConfirmOpen(false)}
                        className="px-3.5 py-1.5 rounded-[4px] bg-white/10 hover:bg-white/20 text-white font-semibold text-xs transition cursor-pointer"
                      >
                        Hủy
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setHistory([]);
                          try {
                            localStorage.removeItem(STORAGE_KEY_HISTORY);
                          } catch {}
                          setIsClearHistoryConfirmOpen(false);
                        }}
                        className="px-4 py-1.5 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition shadow-md cursor-pointer"
                      >
                        Đồng ý Xóa
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-1.5 max-h-28 overflow-y-auto custom-scrollbar pr-1">
                {history.slice(0, 5).map((item, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      vibrateTap();
                      setText(item.text);
                      setType(item.type);
                    }}
                    className="p-2 rounded-[4px] fluent-box-nested border border-white/10 flex items-center justify-between gap-2 cursor-pointer transition text-xs group"
                  >
                    <span className="truncate text-white/80 group-hover:text-[#F7CAC9] transition">
                      {item.text}
                    </span>
                    <span className="text-[10px] font-mono text-white/40 flex-shrink-0">
                      {new Date(item.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-2 flex-shrink-0">
          <div className="flex items-center gap-2">
            {isCurrentActive && (
              <button
                type="button"
                onClick={handleStopOverlay}
                className="px-4 py-2.5 rounded-[4px] bg-rose-950/50 hover:bg-rose-900/50 border border-rose-500/40 text-rose-300 font-bold text-xs flex items-center gap-2 transition"
              >
                <Square className="w-4 h-4 fill-rose-400 text-rose-400" />
                <span>Tắt / Thu Hồi Thông Báo</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-[4px] border border-white/10 text-white/70 hover:text-white hover:bg-white/10 transition text-xs font-semibold"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handlePublish}
              disabled={!text.trim()}
              className="px-5 py-2.5 rounded-[4px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black text-xs uppercase tracking-wider shadow-lg flex items-center gap-2 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>{isCurrentActive ? 'Cập Nhật & Phát Trực Tiếp' : 'Phát Trực Tiếp'}</span>
            </button>
          </div>
        </div>
      </div>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[350] fluent-box border border-purple-500/40 text-purple-200 px-4 py-3 rounded-[4px] shadow-2xl flex items-center gap-2 animate-fadeIn text-sm">
          <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

