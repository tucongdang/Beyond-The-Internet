import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Keyboard, 
  Search, 
  RotateCcw, 
  Check, 
  X, 
  SlidersHorizontal, 
  Download, 
  Upload, 
  Play, 
  Pause, 
  Lock, 
  Trophy, 
  Megaphone, 
  Radio, 
  Zap, 
  Sparkles, 
  Layers, 
  ChevronRight, 
  AlertTriangle,
  Volume2,
  VolumeX,
  Command,
  Edit3
} from 'lucide-react';
import { 
  shortcutService, 
  ShortcutDefinition, 
  ShortcutCategory, 
  ShortcutProfileId, 
  KeyCombo 
} from '../services/shortcutService';
import { soundFx } from '../services/audioEffects';

interface ShortcutMappingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerHudToast?: (keyLabel: string, actionDesc: string) => void;
}

export const ShortcutMappingModal: React.FC<ShortcutMappingModalProps> = ({
  isOpen,
  onClose,
  onTriggerHudToast
}) => {
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>(() => shortcutService.getAllShortcuts());
  const [activeProfile, setActiveProfile] = useState<ShortcutProfileId>(() => shortcutService.getActiveProfile());
  const [isServiceEnabled, setIsServiceEnabled] = useState<boolean>(() => shortcutService.isEnabled());
  const [selectedCategory, setSelectedCategory] = useState<ShortcutCategory | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [activePressedShortcutId, setActivePressedShortcutId] = useState<string | null>(null);
  
  // Key remapping state
  const [editingShortcut, setEditingShortcut] = useState<ShortcutDefinition | null>(null);
  const [recordedCombo, setRecordedCombo] = useState<KeyCombo | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sync with shortcutService updates
  useEffect(() => {
    const unsubscribe = shortcutService.subscribe(() => {
      setShortcuts(shortcutService.getAllShortcuts());
      setActiveProfile(shortcutService.getActiveProfile());
      setIsServiceEnabled(shortcutService.isEnabled());
    });
    return unsubscribe;
  }, []);

  // Listen to keyboard inputs while modal is open for live preview or remapping
  useEffect(() => {
    if (!isOpen) return;

    const handleModalKeyDown = (e: KeyboardEvent) => {
      // If currently recording a new key combination
      if (editingShortcut) {
        e.preventDefault();
        e.stopPropagation();

        if (e.key === 'Escape') {
          setEditingShortcut(null);
          setRecordedCombo(null);
          setConflictWarning(null);
          soundFx.playClick();
          return;
        }

        // Ignore pure modifier presses until an actual key is pressed
        if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) {
          return;
        }

        const newCombo = shortcutService.parseKeyComboFromEvent(e);
        setRecordedCombo(newCombo);
        soundFx.playClick();

        // Check conflicts
        const conflicting = shortcuts.find(s => 
          s.id !== editingShortcut.id && 
          s.currentCombos.some(c => shortcutService.matchesEvent(c, e))
        );

        if (conflicting) {
          setConflictWarning(`Trùng với [${conflicting.name}] (${conflicting.currentCombos.map(c => c.label || c.key).join(', ')})`);
          soundFx.playWarning();
        } else {
          setConflictWarning(null);
        }
        return;
      }

      // If not editing, pressing Escape directly closes the modal instantly
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        soundFx.playClick();
        onClose();
        return;
      }

      // Live Interactive Preview Test: highlight shortcut if pressed
      const matched = shortcuts.find(s => 
        s.currentCombos.some(c => shortcutService.matchesEvent(c, e))
      );

      if (matched) {
        setActivePressedShortcutId(matched.id);
        soundFx.playClick();
        setTimeout(() => {
          setActivePressedShortcutId(prev => (prev === matched.id ? null : prev));
        }, 1200);
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true);
    return () => window.removeEventListener('keydown', handleModalKeyDown, true);
  }, [isOpen, editingShortcut, shortcuts]);

  const showToastFeedback = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleSwitchProfile = (profileId: ShortcutProfileId) => {
    soundFx.playClick();
    shortcutService.setActiveProfile(profileId);
    showToastFeedback(`Đã chuyển sang cấu hình: ${
      profileId === 'BROADCAST_HOST' ? 'Live Broadcast Host (Phím 1-4 & Space)' :
      profileId === 'CLASSIC_OLYMPIA' ? 'Olympia Cổ Điển' : 'Tùy Chỉnh (Custom)'
    }`);
  };

  const handleToggleEnable = () => {
    const next = !isServiceEnabled;
    shortcutService.setEnabled(next);
    soundFx.playClick();
    showToastFeedback(next ? 'Đã kích hoạt hệ thống phím tắt' : 'Đã tạm tắt hệ thống phím tắt');
  };

  const handleResetDefaults = () => {
    soundFx.playWarning();
    shortcutService.resetToDefaults(activeProfile);
    showToastFeedback('Đã khôi phục phím tắt về mặc định ban đầu');
  };

  const handleStartEditing = (shortcut: ShortcutDefinition) => {
    soundFx.playClick();
    setEditingShortcut(shortcut);
    setRecordedCombo(null);
    setConflictWarning(null);
  };

  const handleSaveRecordedCombo = () => {
    if (!editingShortcut || !recordedCombo) return;
    soundFx.playCorrect();
    shortcutService.updateShortcutCombos(editingShortcut.id, [recordedCombo]);
    showToastFeedback(`Đã gán [${recordedCombo.label}] cho "${editingShortcut.name}"`);
    setEditingShortcut(null);
    setRecordedCombo(null);
    setConflictWarning(null);
  };

  const handleExportConfig = () => {
    try {
      const data = {
        profile: activeProfile,
        shortcuts: shortcuts.map(s => ({ id: s.id, combos: s.currentCombos }))
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bti-shortcuts-${activeProfile.toLowerCase()}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      soundFx.playCorrect();
      showToastFeedback('Đã xuất file cấu hình phím tắt JSON thành công!');
    } catch (e) {
      console.error(e);
    }
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        if (parsed.shortcuts && Array.isArray(parsed.shortcuts)) {
          parsed.shortcuts.forEach((item: { id: string; combos: KeyCombo[] }) => {
            if (item.id && item.combos) {
              shortcutService.updateShortcutCombos(item.id, item.combos);
            }
          });
          if (parsed.profile) {
            shortcutService.setActiveProfile(parsed.profile);
          }
          soundFx.playCorrect();
          showToastFeedback('Đã nạp thành công cấu hình phím tắt!');
        }
      } catch (err) {
        soundFx.playError();
        showToastFeedback('Lỗi: File JSON cấu hình không hợp lệ');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filter shortcuts
  const filteredShortcuts = useMemo(() => {
    return shortcuts.filter(s => {
      const matchCategory = selectedCategory === 'ALL' || s.category === selectedCategory;
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = !query || 
        s.name.toLowerCase().includes(query) ||
        s.description.toLowerCase().includes(query) ||
        s.currentCombos.some(c => (c.label || c.key).toLowerCase().includes(query));
      return matchCategory && matchSearch;
    });
  }, [shortcuts, selectedCategory, searchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="fluent-box border border-purple-500/40 bg-gradient-to-b from-slate-950 via-[#0a0f24] to-[#040612] w-full max-w-4xl rounded-[12px] shadow-2xl shadow-purple-950/80 overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* ================= HEADER RIBBON ================= */}
        <div className="p-4 sm:p-5 border-b border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-purple-500/20 border border-purple-400/50 flex items-center justify-center text-purple-300 shadow-md shadow-purple-950/50 shrink-0">
              <Keyboard className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  Trung Tâm Ánh Xạ Phím Tắt Sân Khấu BTI 2026
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-[4px] bg-purple-950 text-purple-300 border border-purple-500/40">
                  v2.0
                </span>
              </div>
              <p className="text-xs text-white/50">
                Điều phối toàn bộ kịch bản phát sóng trong 1 phím bấm (Space, 1, 2, 3, 4) cho MC & Ban Cố Vấn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            {/* Global Master Switch */}
            <button
              type="button"
              onClick={handleToggleEnable}
              className={`px-3 py-1.5 rounded-[4px] border text-xs font-mono font-bold transition flex items-center gap-1.5 cursor-pointer ${
                isServiceEnabled
                  ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/60'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/40 hover:bg-rose-900/60'
              }`}
              title={isServiceEnabled ? 'Đang kích hoạt phím tắt - Bấm để tạm dừng' : 'Đang tắt phím tắt - Bấm để bật lại'}
            >
              <Zap className={`w-3.5 h-3.5 ${isServiceEnabled ? 'fill-current text-emerald-400' : 'text-rose-400'}`} />
              <span>{isServiceEnabled ? 'HOTKEYS: ON' : 'HOTKEYS: OFF'}</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-[4px] text-white/60 hover:text-white hover:bg-white/10 transition"
              title="Đóng bảng phím tắt (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= PROFILE SELECTION TABS & CONTROLS ================= */}
        <div className="px-4 py-2.5 sm:px-5 sm:py-3 border-b border-white/10 bg-black/40 flex flex-wrap items-center justify-between gap-3">
          {/* Profiles */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-white/40 uppercase tracking-wider mr-1 hidden sm:inline">
              Cấu hình:
            </span>

            <button
              type="button"
              onClick={() => handleSwitchProfile('BROADCAST_HOST')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                activeProfile === 'BROADCAST_HOST'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-purple-400 shadow-md shadow-purple-950/60'
                  : 'fluent-box-nested text-white/70 border-white/10 hover:text-white'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>🎬 Live Broadcast Host (Khuyên dùng)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchProfile('CLASSIC_OLYMPIA')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                activeProfile === 'CLASSIC_OLYMPIA'
                  ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white border-blue-400 shadow-md shadow-blue-950/60'
                  : 'fluent-box-nested text-white/70 border-white/10 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>🏛️ Olympia Cổ Điển (Phím 1-8 Tab)</span>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchProfile('CUSTOM')}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer ${
                activeProfile === 'CUSTOM'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white border-amber-400 shadow-md shadow-amber-950/60'
                  : 'fluent-box-nested text-white/70 border-white/10 hover:text-white'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>⚙️ Tùy Chỉnh Riêng</span>
            </button>
          </div>

          {/* Quick Actions (Reset, Export, Import) */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleResetDefaults}
              className="px-2.5 py-1.5 rounded-[4px] fluent-box-nested hover:bg-white/10 text-white/70 hover:text-white text-[11px] font-mono transition flex items-center gap-1 border border-white/10"
              title="Khôi phục tất cả phím tắt về mặc định"
            >
              <RotateCcw className="w-3 h-3 text-amber-400" />
              <span className="hidden md:inline">Khôi phục mặc định</span>
            </button>

            <button
              type="button"
              onClick={handleExportConfig}
              className="p-1.5 rounded-[4px] fluent-box-nested hover:bg-white/10 text-white/70 hover:text-white transition border border-white/10"
              title="Xuất file cấu hình phím tắt JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>

            <label className="p-1.5 rounded-[4px] fluent-box-nested hover:bg-white/10 text-white/70 hover:text-white transition border border-white/10 cursor-pointer" title="Nạp file cấu hình phím tắt JSON">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportConfig} className="hidden" />
            </label>
          </div>
        </div>

        {/* ================= SEARCH & CATEGORY FILTER ================= */}
        <div className="p-3 sm:px-5 sm:py-2.5 border-b border-white/10 bg-slate-950/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm chức năng, tên phím tắt (VD: space, khóa, bảng điểm, 1...)"
              className="w-full pl-9 pr-3 py-1.5 rounded-[4px] bg-black/60 border border-white/15 text-white text-xs placeholder:text-white/30 focus:border-purple-400 focus:outline-none"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
            {(
              [
                { id: 'ALL', label: 'Tất Cả' },
                { id: 'HOST_CONTROL', label: '⚡ Điều Khiển Host' },
                { id: 'NAVIGATION', label: '🧭 Điều Hướng' },
                { id: 'OVERLAY_TOOLS', label: '📺 Màn Chiếu' },
                { id: 'TABS', label: '📑 Chuyển Tab' }
              ] as const
            ).map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedCategory(tab.id as any)}
                className={`px-2.5 py-1 rounded-[4px] text-[11px] font-medium whitespace-nowrap transition cursor-pointer ${
                  selectedCategory === tab.id
                    ? 'bg-purple-600 text-white font-bold shadow'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= SHORTCUTS LIST BENTO GRID ================= */}
        <div className="p-3 sm:p-5 overflow-y-auto custom-scrollbar flex-1 space-y-3">
          
          {feedbackMessage && (
            <div className="p-2.5 rounded-[4px] bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-mono flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{feedbackMessage}</span>
            </div>
          )}

          {/* LIVE TESTER NOTICE */}
          <div className="p-2.5 rounded-[4px] border border-sky-500/30 bg-sky-950/30 flex items-center justify-between text-xs text-sky-200">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-sky-400 animate-pulse shrink-0" />
              <span>
                <strong>Kiểm tra phím trực tiếp:</strong> Bạn có thể bấm bất kỳ phím nào (ví dụ <kbd className="px-1.5 py-0.5 bg-black/60 rounded border border-sky-400/40 font-mono font-bold text-sky-300">Space</kbd>, <kbd className="px-1.5 py-0.5 bg-black/60 rounded border border-sky-400/40 font-mono font-bold text-sky-300">1</kbd>, <kbd className="px-1.5 py-0.5 bg-black/60 rounded border border-sky-400/40 font-mono font-bold text-sky-300">2</kbd>, <kbd className="px-1.5 py-0.5 bg-black/60 rounded border border-sky-400/40 font-mono font-bold text-sky-300">3</kbd>, <kbd className="px-1.5 py-0.5 bg-black/60 rounded border border-sky-400/40 font-mono font-bold text-sky-300">4</kbd>) ngay trên màn hình này để xem hiệu ứng phản hồi!
              </span>
            </div>
          </div>

          {filteredShortcuts.length === 0 ? (
            <div className="p-8 text-center text-white/40 space-y-2">
              <Search className="w-8 h-8 mx-auto text-white/20" />
              <p className="text-sm">Không tìm thấy phím tắt phù hợp với từ khóa "{searchQuery}"</p>
              <button
                type="button"
                onClick={() => { setSearchQuery(''); setSelectedCategory('ALL'); }}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white text-xs rounded"
              >
                Xóa bộ lọc
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {filteredShortcuts.map((shortcut) => {
                const isActivated = activePressedShortcutId === shortcut.id;
                const isHost = shortcut.isHostCommand;

                return (
                  <div
                    key={shortcut.id}
                    className={`p-3 rounded-[4px] border transition-all duration-200 flex items-center justify-between gap-3 ${
                      isActivated
                        ? 'border-purple-400 bg-purple-950/80 shadow-lg shadow-purple-900/60 ring-2 ring-purple-400 scale-[1.01]'
                        : isHost
                        ? 'fluent-box-nested border-purple-500/30 hover:border-purple-400/60 hover:bg-purple-950/20'
                        : 'fluent-box-nested border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {isHost && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        )}
                        <strong className="text-xs sm:text-sm text-white font-semibold truncate block">
                          {shortcut.name}
                        </strong>
                      </div>
                      <p className="text-[11px] text-white/50 line-clamp-1 mt-0.5">
                        {shortcut.description}
                      </p>
                    </div>

                    {/* Key combo badges & Edit action */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {shortcut.currentCombos.map((combo, idx) => (
                          <kbd
                            key={idx}
                            className={`px-2.5 py-1 rounded-[4px] font-mono text-xs font-bold border transition-transform ${
                              isActivated
                                ? 'bg-purple-500 text-slate-950 border-white shadow-md scale-110'
                                : isHost
                                ? 'bg-purple-950/90 text-purple-200 border-purple-400/50 shadow-sm'
                                : 'bg-black/60 text-sky-200 border-white/15'
                            }`}
                          >
                            {combo.label || combo.key}
                          </kbd>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartEditing(shortcut)}
                        className="p-1 rounded-[4px] text-white/40 hover:text-white hover:bg-white/10 transition"
                        title="Đổi phím tắt này"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ================= KEY RECORDER MODAL OVERLAY ================= */}
        {editingShortcut && (
          <div className="fixed inset-0 z-[100050] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
            <div className="fluent-box border border-purple-500/60 bg-gradient-to-b from-slate-950 via-[#101736] to-[#080d22] w-full max-w-md rounded-[12px] p-5 text-white shadow-2xl shadow-purple-950/90 space-y-4">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-purple-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                    Gán Phím Tắt Mới
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingShortcut(null)}
                  className="text-white/50 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] text-white/60 font-mono uppercase block">
                  Chức năng đang cấu hình:
                </label>
                <div className="p-2.5 rounded-[4px] bg-black/50 border border-white/15">
                  <strong className="text-sm text-purple-200 block">{editingShortcut.name}</strong>
                  <p className="text-xs text-white/50 mt-0.5">{editingShortcut.description}</p>
                </div>
              </div>

              {/* Key capture area */}
              <div className="p-6 rounded-[4px] border-2 border-dashed border-purple-400/60 bg-purple-950/30 text-center space-y-2">
                <p className="text-xs text-white/60">
                  Hãy nhấn tổ hợp phím mong muốn trên bàn phím của bạn:
                </p>
                
                <div className="py-2">
                  {recordedCombo ? (
                    <kbd className="px-4 py-2 rounded-[4px] bg-purple-600 text-white font-mono text-lg font-bold border border-white/40 shadow-lg inline-block animate-bounce">
                      {recordedCombo.label}
                    </kbd>
                  ) : (
                    <div className="text-sm text-purple-300 font-mono animate-pulse">
                      [Đang chờ nhấn phím...]
                    </div>
                  )}
                </div>

                <p className="text-[10px] text-white/40">
                  (Hỗ trợ các phím đơn như Space, 1, 2, N, B hoặc tổ hợp Ctrl, Shift, Alt)
                </p>
              </div>

              {conflictWarning && (
                <div className="p-2 rounded-[4px] bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{conflictWarning}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingShortcut(null)}
                  className="px-4 py-2 rounded-[4px] fluent-box-nested text-white/70 hover:text-white text-xs font-mono"
                >
                  Hủy Bỏ (ESC)
                </button>
                <button
                  type="button"
                  onClick={handleSaveRecordedCombo}
                  disabled={!recordedCombo}
                  className="px-5 py-2 rounded-[4px] bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md shadow-purple-950"
                >
                  Lưu Phím Mới
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ================= MODAL FOOTER ================= */}
        <div className="p-3 sm:px-5 sm:py-3.5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 bg-black/50 text-xs">
          <div className="flex items-center gap-2 text-white/50 text-[11px]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Phím tắt tự động ngưng kích hoạt khi đang gõ chữ trong ô nhập liệu (Input/Textarea)</span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-[4px] text-xs transition cursor-pointer shadow-md shadow-purple-950/60"
            >
              Đã Hiểu & Đóng (ESC)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
