import React, { useState, useMemo } from 'react';
import { GameState, UserResponse, StageSnapshotRecord } from '../types';
import { snapshotService } from '../services/snapshotService';
import { soundFx } from '../services/audioEffects';
import {
  Camera,
  Download,
  Trash2,
  Eye,
  Sparkles,
  Search,
  Filter,
  Check,
  Copy,
  Clock,
  Users,
  Layers,
  FileSpreadsheet,
  FileJson,
  X,
  Maximize2,
  Tag,
  AlertCircle,
  Radio,
  Image as ImageIcon,
  MessageSquare,
  BarChart2,
  Cloud
} from 'lucide-react';
import { vibrateTap, vibrateSuccess, vibrateWarning, vibrateError, vibrateCopy } from '../utils/hapticUtils';

interface BroadcastSnapshotHistoryTabProps {
  gameState: GameState;
  responses: Record<string, UserResponse>;
  allResponses?: Record<string, Record<string, UserResponse>>;
  activeCount: number;
  onTriggerSnap: (customNote?: string, tag?: StageSnapshotRecord['broadcast_tag']) => Promise<StageSnapshotRecord | null>;
  isSnapping?: boolean;
}

export const BroadcastSnapshotHistoryTab: React.FC<BroadcastSnapshotHistoryTabProps> = ({
  gameState,
  responses,
  allResponses,
  activeCount,
  onTriggerSnap,
  isSnapping = false
}) => {
  const [snapshots, setSnapshots] = useState<StageSnapshotRecord[]>(() => snapshotService.getSnapshots());
  const [selectedSnapshot, setSelectedSnapshot] = useState<StageSnapshotRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<string>('ALL');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState<string>('');
  const [customSnapNote, setCustomSnapNote] = useState<string>('');
  const [customSnapTag, setCustomSnapTag] = useState<StageSnapshotRecord['broadcast_tag']>('GENERAL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [flashAnimation, setFlashAnimation] = useState<boolean>(false);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // Refresh snapshots
  const refreshList = () => {
    setSnapshots(snapshotService.getSnapshots());
  };

  // Trigger snapshot from UI
  const handleSnap = async () => {
    vibrateTap();
    setFlashAnimation(true);
    setTimeout(() => setFlashAnimation(false), 300);

    const newRecord = await onTriggerSnap(customSnapNote.trim() || undefined, customSnapTag);
    if (newRecord) {
      vibrateSuccess();
      refreshList();
      setCustomSnapNote('');
    }
  };

  // Delete single
  // Clear all
  // Save edited note
  const handleSaveNote = (id: string) => {
    vibrateTap();
    const updated = snapshotService.updateSnapshot(id, { note: noteInput.trim() });
    setSnapshots(updated);
    setEditingNoteId(null);
    if (selectedSnapshot?.id === id) {
      setSelectedSnapshot(prev => (prev ? { ...prev, note: noteInput.trim() } : null));
    }
  };

  // Copy data URL or image to clipboard
  const handleCopyImage = async (record: StageSnapshotRecord, e?: React.MouseEvent) => {
    e?.stopPropagation();
    vibrateCopy();
    try {
      if (navigator.clipboard && window.ClipboardItem) {
        const res = await fetch(record.image_data_url);
        const blob = await res.blob();
        await navigator.clipboard.write([
          new window.ClipboardItem({ [blob.type]: blob })
        ]);
        setCopiedId(record.id);
        setTimeout(() => setCopiedId(null), 2000);
      } else {
        await navigator.clipboard.writeText(record.image_data_url);
        setCopiedId(record.id);
        setTimeout(() => setCopiedId(null), 2000);
      }
    } catch (err) {
      console.warn('Clipboard write image failed, copying URL text:', err);
      try {
        await navigator.clipboard.writeText(record.image_data_url);
        setCopiedId(record.id);
        setTimeout(() => setCopiedId(null), 2000);
      } catch {}
    }
  };

  // Export JSON metadata
  const handleExportJSON = () => {
    vibrateCopy();
    soundFx.playClick();
    const metaList = snapshots.map(s => ({
      id: s.id,
      timestamp: s.timestamp,
      date_iso: new Date(s.timestamp).toISOString(),
      question_id: s.question_id,
      question_text: s.question_text,
      round_name: s.round_name,
      status: s.status,
      response_count: s.response_count,
      active_count: s.active_count,
      note: s.note,
      broadcast_tag: s.broadcast_tag,
      top_distribution: s.top_distribution
    }));

    const blob = new Blob([JSON.stringify(metaList, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `BTI2026_Broadcast_Snapshots_Log_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Filtered list
  const filteredSnapshots = useMemo(() => {
    return snapshots.filter(s => {
      const matchSearch =
        !searchTerm.trim() ||
        s.question_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.question_text.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.round_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.note && s.note.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchTag = tagFilter === 'ALL' || s.broadcast_tag === tagFilter;
      return matchSearch && matchTag;
    });
  }, [snapshots, searchTerm, tagFilter]);

  const currentVotesCount = Object.keys(responses || {}).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Screen flash on capture */}
      {flashAnimation && (
        <div className="fixed inset-0 z-[200] bg-white/40 pointer-events-none transition-opacity duration-300 animate-fadeOut" />
      )}

      {/* Hero Control Banner: Snap Action & Live Stage Status */}
      <div className="p-4 sm:p-5 md:p-6 fluent-box border border-purple-500/30 rounded-[4px] shadow-xl space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="w-12 h-12 rounded-[4px] bg-purple-500/20 text-purple-300 flex items-center justify-center border border-purple-500/40 shrink-0">
              <Camera className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  Snap Audience Interaction • Chụp Màn Chiếu Trực Tiếp
                </h2>
                <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold fluent-box-nested text-purple-200 border border-purple-500/40 uppercase">
                  Broadcast Records ({snapshots.length})
                </span>
              </div>
              <p className="text-xs text-purple-200/70 mt-0.5">
                Chụp ảnh màn chiếu sân khấu (Biểu đồ phân bố, Đám mây từ khóa, Đồng hồ, Tỉ lệ tương tác) lưu vào biên bản phát sóng
              </p>
            </div>
          </div>

          {/* Current Stage Quick Pill */}
          <div className="flex items-center gap-3 fluent-box-nested border border-white/10 px-3.5 py-2 rounded-[4px] text-xs font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>Sân Khấu: <strong>[{gameState.question_id || 'STANDBY'}]</strong></span>
            </div>
            <span className="text-white/30">•</span>
            <div className="text-purple-200">
              Đã nộp: <strong className="text-white">{currentVotesCount}/{activeCount}</strong>
            </div>
            <span className="text-white/30">•</span>
            <div className="text-white/60">
              Trạng thái: <strong className="text-amber-300">{gameState.status}</strong>
            </div>
          </div>
        </div>

        {/* Snap Action Form */}
        <div className="pt-3 border-t border-white/10 grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
          {/* Note Input */}
          <div className="md:col-span-6">
            <input
              type="text"
              placeholder="Ghi chú khoảnh khắc (VD: 95% khán giả đoán đúng, Mây từ khóa sôi nổi...)"
              value={customSnapNote}
              onChange={(e) => setCustomSnapNote(e.target.value)}
              className="w-full fluent-box-nested border border-purple-500/30 focus:border-pink-400 text-xs text-white px-3.5 py-2.5 rounded-[4px] outline-none placeholder:text-white/30 font-mono transition"
            />
          </div>

          {/* Tag Selector */}
          <div className="md:col-span-3">
            <select
              value={customSnapTag}
              onChange={(e) => setCustomSnapTag(e.target.value as any)}
              className="w-full fluent-box-nested border border-purple-500/30 focus:border-pink-400 text-xs text-white px-3 py-2.5 rounded-[4px] outline-none font-mono transition cursor-pointer"
            >
              <option value="GENERAL">🏷️ Nhãn: Tổng Quát (General)</option>
              <option value="HIGHLIGHT">⭐ Nhãn: Khoảnh Khắc Tiêu Biểu</option>
              <option value="CHART">📊 Nhãn: Biểu Đồ / Thống Kê</option>
              <option value="WORD_CLOUD">☁️ Nhãn: Đám Mây Từ Khóa</option>
              <option value="VCNV">🧩 Nhãn: Vượt Chướng Ngại Vật</option>
              <option value="POLL">🚨 Nhãn: Khảo Sát Khẩn</option>
            </select>
          </div>

          {/* Big Snap Button */}
          <div className="md:col-span-3">
            <button
              type="button"
              id="btn-snap-audience-interaction-main"
              onClick={handleSnap}
              disabled={isSnapping}
              className={`w-full py-2.5 px-4 rounded-[4px] text-xs font-black font-mono uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg ${
                isSnapping
                  ? 'bg-purple-800/40 text-purple-300 cursor-not-allowed border border-purple-500/30'
                  : 'bg-pink-600 hover:bg-pink-500 text-white shadow-pink-500/30 hover:scale-[1.02] active:scale-95 cursor-pointer border border-pink-400'
              }`}
            >
              <Camera className={`w-4 h-4 ${isSnapping ? 'animate-spin' : ''}`} />
              <span>{isSnapping ? 'Đang Chụp Sân Khấu...' : '📸 Chụp Màn Chiếu Ngay'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gallery Filter & Batch Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 fluent-box border border-white/10 rounded-[4px]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#F7CAC9] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm kiếm theo mã câu, nội dung, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full fluent-box-nested border border-white/10 focus:border-purple-400 text-xs text-white pl-8 pr-3 py-1.5 rounded-[4px] outline-none placeholder:text-white/30 font-mono transition"
            />
          </div>

          {/* Tag Filter */}
          <div className="flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-white/40 shrink-0" />
            <select
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="fluent-box-nested border border-white/10 text-xs text-white px-2 py-1.5 rounded-[4px] outline-none font-mono transition cursor-pointer"
            >
              <option value="ALL">Tất cả ({snapshots.length})</option>
              <option value="HIGHLIGHT">⭐ Tiêu biểu</option>
              <option value="CHART">📊 Biểu đồ</option>
              <option value="WORD_CLOUD">☁️ Mây từ khóa</option>
              <option value="VCNV">🧩 VCNV</option>
              <option value="POLL">🚨 Khảo sát</option>
              <option value="GENERAL">🏷️ Tổng quát</option>
            </select>
          </div>
        </div>

        {/* Batch buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportJSON}
            disabled={snapshots.length === 0}
            className="px-3 py-1.5 fluent-box-nested hover:bg-white/15 disabled:opacity-40 text-white rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 transition border border-white/10 cursor-pointer"
            title="Xuất danh mục nhật ký phát sóng dạng JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-cyan-300" />
            <span>Xuất JSON Log</span>
          </button>

          <button
            type="button"
            disabled={snapshots.length === 0}
            onClick={() => setIsClearAllDialogOpen(true)}
            className="px-3 py-1.5 fluent-box-nested hover:bg-white/15 disabled:opacity-40 text-rose-300 border border-rose-500/30 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 transition cursor-pointer"
            title="Xóa toàn bộ lịch sử ảnh chụp"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Xóa Hết</span>
          </button>
        </div>
      </div>


      {/* Snapshots Grid */}
      {filteredSnapshots.length === 0 ? (
        <div className="p-12 text-center fluent-box border border-dashed border-white/15 rounded-[4px] space-y-3">
          <div className="w-16 h-16 rounded-[4px] fluent-box-nested text-purple-300 flex items-center justify-center mx-auto border border-purple-500/20">
            <Camera className="w-8 h-8 opacity-60" />
          </div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Chưa Có Ảnh Chụp Khoảnh Khắc Nào
          </h3>
          <p className="text-xs text-white/40 max-w-md mx-auto">
            Nhấn nút <strong className="text-purple-300">"📸 Chụp Màn Chiếu Ngay"</strong> ở trên hoặc nút nhanh ở đầu trang để chụp lại màn hình sân khấu tương tác cùng khán giả.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSnapshots.map((item) => {
            const timeStr = new Date(item.timestamp).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit'
            });
            const dateStr = new Date(item.timestamp).toLocaleDateString('vi-VN');

            return (
              <div
                key={item.id}
                className="group fluent-box hover:bg-white/5 border border-white/10 hover:border-purple-400/60 rounded-[4px] overflow-hidden transition-all duration-200 shadow-xl flex flex-col"
              >
                {/* Thumbnail Image with hover overlay */}
                <div
                  className="relative aspect-video fluent-box-nested overflow-hidden cursor-pointer group"
                  onClick={() => setSelectedSnapshot(item)}
                >
                  <img
                    src={item.image_data_url}
                    alt={`Snapshot ${item.question_id}`}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />

                  {/* Tag Pill */}
                  <div className="absolute top-2.5 left-2.5 z-10">
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold bg-[#190839]/80 backdrop-blur-md text-purple-200 border border-white/20 uppercase flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#F7CAC9]" />
                      {item.broadcast_tag || 'GENERAL'}
                    </span>
                  </div>

                  {/* Status Pill */}
                  <div className="absolute top-2.5 right-2.5 z-10">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase ${
                      item.status === 'REVEAL'
                        ? 'bg-emerald-500 text-black'
                        : item.status === 'ACTIVE'
                        ? 'bg-amber-400 text-black'
                        : 'bg-blue-600 text-white'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  {/* Hover Overlay with Preview Icon */}
                  <div className="absolute inset-0 bg-[#190839]/50 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                    <span className="px-3 py-1.5 rounded-[4px] bg-white/20 backdrop-blur-md text-white font-mono text-xs font-bold flex items-center gap-1.5">
                      <Eye className="w-4 h-4 text-[#F7CAC9]" /> Xem Chi Tiết
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header info: Question ID & Time */}
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1.5 text-[#F7CAC9] font-bold">
                        <span>[{item.question_id}]</span>
                        <span className="text-white/40">•</span>
                        <span className="text-white/60 text-[11px] truncate max-w-[120px]">
                          {item.round_name}
                        </span>
                      </div>
                      <div className="text-[11px] text-white/50 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-white/40" />
                        <span>{timeStr}</span>
                      </div>
                    </div>

                    {/* Question text snippet */}
                    <p className="text-xs text-white/80 line-clamp-2 mt-1.5 font-sans leading-relaxed">
                      {item.question_text}
                    </p>

                    {/* Audience stats snippet */}
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] font-mono text-white/60">
                      <span className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-purple-400" />
                        Phản hồi: <strong className="text-white">{item.response_count}</strong>/{item.active_count}
                      </span>
                      <span className="text-white/40">{dateStr}</span>
                    </div>

                    {/* Note section */}
                    {item.note ? (
                      <div className="mt-2 p-2 fluent-box-nested rounded-[4px] text-[11px] text-purple-200 border border-purple-500/20 font-mono italic">
                        "{item.note}"
                      </div>
                    ) : null}
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      onClick={() => setSelectedSnapshot(item)}
                      className="px-2.5 py-1.5 fluent-box-nested hover:bg-white/15 text-white rounded-[4px] text-xs font-mono font-bold flex items-center gap-1 transition"
                      title="Xem phóng to"
                    >
                      <Maximize2 className="w-3 h-3 text-[#F7CAC9]" />
                      <span>Xem</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => snapshotService.downloadImage(item)}
                      className="px-2.5 py-1.5 fluent-box-nested hover:bg-white/15 text-emerald-300 border border-emerald-500/40 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1 transition"
                      title="Tải ảnh PNG về máy"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>Tải PNG</span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleCopyImage(item, e)}
                      className="p-1.5 fluent-box-nested hover:bg-white/15 text-white rounded-[4px] text-xs transition"
                      title="Sao chép ảnh vào Clipboard"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-white/70" />
                      )}
                    </button>

                    <button
                      type="button"
                      className="p-1.5 fluent-box-nested hover:bg-white/15 text-rose-300 rounded-[4px] text-xs transition cursor-pointer"
                      title="Xóa ảnh này"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTargetId(item.id);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Fullscreen Lightbox Modal */}
      {selectedSnapshot && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-5xl w-full max-h-[92vh] fluent-box border border-purple-500/40 rounded-[4px] overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 fluent-box-nested border-b border-white/10 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[4px] fluent-box text-purple-300 flex items-center justify-center border border-purple-500/30 font-mono font-bold">
                  <Camera className="w-4 h-4 text-[#F7CAC9]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider">
                      Biên Bản Khoảnh Khắc: [{selectedSnapshot.question_id}]
                    </h3>
                    <span className="px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold fluent-box text-[#F7CAC9] border border-pink-500/40 uppercase">
                      {selectedSnapshot.broadcast_tag || 'GENERAL'}
                    </span>
                  </div>
                  <p className="text-xs text-white/50 font-mono">
                    {new Date(selectedSnapshot.timestamp).toLocaleString('vi-VN')} • {selectedSnapshot.round_name}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => snapshotService.downloadImage(selectedSnapshot)}
                  className="px-3 py-1.5 fluent-box-nested hover:bg-white/15 text-emerald-300 border border-emerald-500/40 rounded-[4px] text-xs font-mono font-bold flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tải PNG</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSnapshot(null)}
                  className="p-1.5 fluent-box-nested hover:bg-white/15 text-white rounded-[4px] transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Full Resolution Image Container */}
              <div className="fluent-box-nested rounded-[4px] border border-white/10 p-2 sm:p-3 flex items-center justify-center shadow-inner">
                <img
                  src={selectedSnapshot.image_data_url}
                  alt={`Full ${selectedSnapshot.question_id}`}
                  className="max-h-[55vh] w-auto max-w-full rounded-[4px] object-contain shadow-2xl"
                />
              </div>

              {/* Detail Breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                {/* Left: Info */}
                <div className="p-4 fluent-box border border-white/10 rounded-[4px] space-y-2">
                  <h4 className="font-bold text-[#F7CAC9] uppercase flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Thông Tin Trận Đấu
                  </h4>
                  <div className="space-y-1 text-white/80">
                    <div>Mã câu hỏi: <strong className="text-white">{selectedSnapshot.question_id}</strong></div>
                    <div>Vòng thi: <strong className="text-white">{selectedSnapshot.round_name}</strong></div>
                    <div>Trạng thái sân khấu: <strong className="text-amber-300">{selectedSnapshot.status}</strong></div>
                    <div>Khán giả đã nộp: <strong className="text-emerald-400">{selectedSnapshot.response_count}</strong> / {selectedSnapshot.active_count} người</div>
                    <div className="pt-1 text-white/60 italic font-sans text-xs">
                      "{selectedSnapshot.question_text}"
                    </div>
                  </div>
                </div>

                {/* Right: Notes and Top Distribution */}
                <div className="p-4 fluent-box border border-white/10 rounded-[4px] space-y-3">
                  <h4 className="font-bold text-purple-300 uppercase flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" /> Ghi Chú Đạo Diễn / Phát Sóng
                  </h4>

                  {editingNoteId === selectedSnapshot.id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={3}
                        value={noteInput}
                        onChange={(e) => setNoteInput(e.target.value)}
                        placeholder="Nhập ghi chú cho khoảnh khắc này..."
                        className="w-full fluent-box-nested border border-purple-400 text-xs text-white p-2.5 rounded-[4px] outline-none font-sans"
                      />
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleSaveNote(selectedSnapshot.id)}
                          className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-[4px] font-bold text-xs cursor-pointer"
                        >
                          Lưu Ghi Chú
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingNoteId(null)}
                          className="px-3 py-1.5 fluent-box hover:bg-white/15 text-white rounded-[4px] text-xs cursor-pointer"
                        >
                          Hủy
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white/80 italic font-sans">
                        {selectedSnapshot.note || 'Chưa có ghi chú nào cho khoảnh khắc này.'}
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingNoteId(selectedSnapshot.id);
                          setNoteInput(selectedSnapshot.note || '');
                        }}
                        className="px-2 py-1 fluent-box-nested hover:bg-white/15 text-white rounded-[4px] text-[11px] shrink-0 cursor-pointer"
                      >
                        {selectedSnapshot.note ? 'Sửa' : '+ Thêm'}
                      </button>
                    </div>
                  )}

                  {/* Distribution list if available */}
                  {selectedSnapshot.top_distribution && selectedSnapshot.top_distribution.length > 0 && (
                    <div className="pt-2 border-t border-white/10 space-y-1">
                      <span className="text-[11px] text-white/50 font-bold uppercase">Phân Bố Đáp Án:</span>
                      <div className="space-y-1">
                        {selectedSnapshot.top_distribution.map((d, i) => (
                          <div key={i} className="flex items-center justify-between text-[11px]">
                            <span className="truncate max-w-[200px] text-white/70">{d.label}</span>
                            <span className="font-bold text-white">{d.percent}% ({d.count})</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Confirmation Modal */}
      {isClearAllDialogOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full fluent-box border border-rose-500/30 rounded-[4px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">Xác nhận Xóa Sạch?</h3>
            <p className="text-white/70 text-sm mt-2">
              Xác nhận xóa sạch toàn bộ {snapshots.length} ảnh chụp khoảnh khắc trong nhật ký? Thao tác này không thể hoàn tác.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsClearAllDialogOpen(false)}
                className="px-4 py-2 rounded-[4px] fluent-box-nested hover:bg-white/15 text-white font-bold text-sm transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateWarning();
                  snapshotService.clearAllSnapshots();
                  setSnapshots([]);
                  setSelectedSnapshot(null);
                  setIsClearAllDialogOpen(false);
                }}
                className="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
              >
                Đồng ý Xóa Sạch
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single Item Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full fluent-box border border-rose-500/30 rounded-[4px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">Xác nhận Xóa?</h3>
            <p className="text-white/70 text-sm mt-2">
              Bạn có chắc muốn xóa ảnh chụp khoảnh khắc này khỏi nhật ký không?
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 rounded-[4px] fluent-box-nested hover:bg-white/15 text-white font-bold text-sm transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  vibrateError();
                  const updated = snapshotService.deleteSnapshot(deleteTargetId);
                  setSnapshots(updated);
                  if (selectedSnapshot?.id === deleteTargetId) {
                    setSelectedSnapshot(null);
                  }
                  setDeleteTargetId(null);
                }}
                className="px-4 py-2 rounded-[4px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg cursor-pointer"
              >
                Đồng ý Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

