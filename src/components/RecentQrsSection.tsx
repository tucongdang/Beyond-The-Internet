import React, { useState, useEffect } from 'react';
import { History, Clock, QrCode, Copy, Check, Trash2, RotateCcw, ExternalLink, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { recentQrUtils, RecentQrRecord } from '../utils/recentQrUtils';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateCopy, vibrateSelection } from '../utils/hapticUtils';
import { useLanguage } from '../hooks/useLanguage';

export interface RecentQrsSectionProps {
  onSelectQr?: (qr: RecentQrRecord) => void;
  selectedQrId?: string | null;
  className?: string;
  compact?: boolean;
}

export const RecentQrsSection: React.FC<RecentQrsSectionProps> = ({
  onSelectQr,
  selectedQrId,
  className = '',
  compact = false
}) => {
  const { localLanguage } = useLanguage();
  const [recentList, setRecentList] = useState<RecentQrRecord[]>(() => recentQrUtils.getRecentQrs());
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = recentQrUtils.subscribe((updated) => {
      setRecentList([...updated]);
    });
    return () => unsub();
  }, []);

  const handleCopy = async (e: React.MouseEvent, item: RecentQrRecord) => {
    e.stopPropagation();
    try {
      vibrateCopy();
      soundFx.playClick();
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy link:', err);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    vibrateTap();
    soundFx.playClick();
    recentQrUtils.removeRecentQr(id);
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmMsg = localLanguage !== 'vi'
      ? 'Are you sure you want to clear all recent QR codes?'
      : 'Bạn có chắc muốn xóa toàn bộ danh sách mã QR gần đây?';
    if (window.confirm(confirmMsg)) {
      vibrateTap();
      soundFx.playClick();
      recentQrUtils.clearRecentQrs();
    }
  };

  const handleSelect = (item: RecentQrRecord) => {
    vibrateSelection();
    soundFx.playClick();
    if (onSelectQr) {
      onSelectQr(item);
    }
  };

  return (
    <div className={`w-full rounded-[4px] bg-black/40 border border-white/15 p-3 text-left font-mono ${className}`}>
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
        <button
          type="button"
          onClick={() => {
            vibrateTap();
            soundFx.playClick();
            setIsExpanded(!isExpanded);
          }}
          className="flex items-center gap-1.5 text-xs font-bold text-[#F7CAC9] hover:text-white transition cursor-pointer select-none"
        >
          <History className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0" />
          <span className="uppercase tracking-wider">
            {localLanguage !== 'vi' ? 'Recent QRs' : 'Mã QR Gần Đây (Recent QRs)'}
          </span>
          <span className="px-1.5 py-0.2 rounded-[2px] text-[10px] bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/30">
            {recentList.length}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-white/50 ml-0.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-white/50 ml-0.5" />
          )}
        </button>

        {recentList.length > 0 && isExpanded && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-[10px] text-rose-400 hover:text-rose-300 transition flex items-center gap-1 cursor-pointer px-1.5 py-0.5 rounded-[2px] hover:bg-rose-500/10"
            title={localLanguage !== 'vi' ? 'Clear all QR code history on this device' : 'Xóa toàn bộ lịch sử mã QR đã lưu trên thiết bị'}
          >
            <Trash2 className="w-3 h-3" />
            <span className="hidden sm:inline">
              {localLanguage !== 'vi' ? 'Clear History' : 'Xóa Lịch Sử'}
            </span>
          </button>
        )}
      </div>

      {/* Body Content */}
      {isExpanded && (
        <div className="pt-2">
          {recentList.length === 0 ? (
            <div className="py-3 px-2 text-center text-white/40 text-[11px] space-y-1">
              <QrCode className="w-5 h-5 mx-auto text-white/20" />
              <p>
                {localLanguage !== 'vi'
                  ? 'No QR codes saved in this session.'
                  : 'Chưa có mã QR nào được lưu trong phiên này.'}
              </p>
              <p className="text-[10px] text-white/30">
                {localLanguage !== 'vi'
                  ? 'QR codes broadcast during the show are automatically saved here for quick re-scanning if missed.'
                  : 'Các mã QR xuất hiện trong buổi phát sóng sẽ tự động lưu vào đây để bạn quét lại nếu bỏ lỡ.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-[10px] text-white/50 leading-tight">
                {localLanguage !== 'vi'
                  ? 'Click any code below to enlarge and re-scan:'
                  : 'Bấm vào mã bất kỳ bên dưới để hiển thị phóng to và quét lại:'}
              </p>

              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                {recentList.map((item) => {
                  const isSelected = selectedQrId === item.id;
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`p-2 rounded-[2px] transition cursor-pointer flex items-center justify-between gap-2.5 border ${
                        isSelected
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-md shadow-sky-950/50'
                          : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                      }`}
                    >
                      {/* Mini QR Thumbnail Preview */}
                      <div className="w-10 h-10 rounded-[2px] bg-white p-0.5 shrink-0 flex items-center justify-center overflow-hidden shadow">
                        {item.dataUrl ? (
                          <img
                            src={item.dataUrl}
                            alt="Mini QR"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <QrCode className="w-6 h-6 text-slate-800" />
                        )}
                      </div>

                      {/* Info Text */}
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold truncate text-sky-200">
                            {item.caption || item.roundName || (localLanguage !== 'vi' ? 'Live Arena' : 'Đấu Trường Live')}
                          </span>
                          {isSelected && (
                            <span className="px-1 py-0.2 rounded-[2px] bg-sky-400/20 text-sky-300 text-[9px] font-bold border border-sky-400/30">
                              {localLanguage !== 'vi' ? 'Viewing' : 'Đang Xem'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{item.formattedTime}</span>
                          </span>
                          <span className="truncate max-w-[120px] sm:max-w-[180px] text-white/30">
                            {item.url}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSelect(item)}
                          className="px-2 py-1 rounded-[2px] bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-400/40 text-[10px] font-bold transition flex items-center gap-1 cursor-pointer active:scale-95"
                          title={localLanguage !== 'vi' ? 'Enlarge to re-scan this code' : 'Phóng to để quét lại mã này'}
                        >
                          <QrCode className="w-3 h-3" />
                          <span className="hidden sm:inline">
                            {localLanguage !== 'vi' ? 'Re-scan' : 'Quét lại'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleCopy(e, item)}
                          className={`p-1 rounded-[2px] border transition cursor-pointer active:scale-95 ${
                            copiedId === item.id
                              ? 'bg-emerald-500/30 text-emerald-300 border-emerald-500/50'
                              : 'bg-white/10 hover:bg-white/20 text-white/70 border-white/10'
                          }`}
                          title={localLanguage !== 'vi' ? 'Copy URL of this QR' : 'Sao chép link của mã QR này'}
                        >
                          {copiedId === item.id ? (
                            <Check className="w-3 h-3 text-emerald-300" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={(e) => handleDelete(e, item.id)}
                          className="p-1 rounded-[2px] bg-white/5 hover:bg-rose-500/20 text-white/40 hover:text-rose-300 border border-transparent hover:border-rose-500/30 transition cursor-pointer active:scale-95"
                          title={localLanguage !== 'vi' ? 'Remove from recent list' : 'Xóa mã này khỏi danh sách gần đây'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
