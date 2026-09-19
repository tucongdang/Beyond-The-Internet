import React, { useState, useEffect, useMemo } from 'react';
import {
  Megaphone,
  Sparkles,
  Search,
  Filter,
  Trash2,
  RotateCcw,
  Heart,
  User,
  Plus,
  Flame,
  Clock,
  Pin,
  EyeOff,
  Eye,
  Settings,
  Shield,
  MessageCircle,
  Radio,
  Send,
  AlertTriangle,
  CheckCircle2,
  Volume2
} from 'lucide-react';
import { AudienceShout, ShoutSettings, ShoutBadgeColor, GameState } from '../types';
import { 
  shoutService, 
  SHOUT_BADGE_COLORS, 
  POPULAR_SHOUT_PRESETS,
  SHOUT_EMOJIS,
  DEFAULT_SHOUT_SETTINGS 
} from '../services/shoutService';
import { soundFx } from '../services/audioEffects';
import { syncService } from '../services/syncService';
import { vibrateTap, vibrateSuccess, vibrateWarning, vibrateError } from '../utils/hapticUtils';
import { exportShoutsToCSV } from '../utils/exportUtils';

interface AdminChatManagerProps {
  gameState: GameState;
}

export const AdminChatManager: React.FC<AdminChatManagerProps> = ({ gameState }) => {
  const [shouts, setShouts] = useState<AudienceShout[]>([]);
  const [settings, setSettings] = useState<ShoutSettings>(shoutService.getSettings());
  const [filterColor, setFilterColor] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'NEWEST' | 'MOST_LIKES'>('NEWEST');
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'FLAGGED'>('ACTIVE');
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState<boolean>(false);
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [summary, setSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Quick broadcast form
  const [customText, setCustomText] = useState('');
  const [customSender, setCustomSender] = useState('MC Sân Khấu');
  const [customRole, setCustomRole] = useState('HOST');
  const [customEmoji, setCustomEmoji] = useState('🔥');
  const [customColor, setCustomColor] = useState<ShoutBadgeColor>('amber');
  const [customIsPinned, setCustomIsPinned] = useState(true);

  useEffect(() => {
    const unsub = shoutService.subscribe(setShouts);
    const unsubS = shoutService.subscribeToSettings(setSettings);
    return () => {
      unsub();
      unsubS();
    };
  }, []);

  // Filter & sort shouts
  const filteredShouts = useMemo(() => {
    let list = shouts.filter(s => (s.status || 'ACTIVE') === activeTab);

    if (filterColor !== 'ALL') {
      list = list.filter((s) => s.color === filterColor);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.text.toLowerCase().includes(term) ||
          s.sender_name.toLowerCase().includes(term) ||
          (s.sender_mssv && s.sender_mssv.toLowerCase().includes(term))
      );
    }

    if (sortBy === 'MOST_LIKES') {
      list.sort((a, b) => (b.likes || 0) - (a.likes || 0));
    } else {
      list.sort((a, b) => {
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return b.timestamp - a.timestamp;
      });
    }

    return list;
  }, [shouts, filterColor, searchTerm, sortBy]);

  const stats = useMemo(() => {
    const total = shouts.length;
    const pinnedCount = shouts.filter(s => s.is_pinned).length;
    const totalLikes = shouts.reduce((acc, curr) => acc + (curr.likes || 0), 0);
    return { total, pinnedCount, totalLikes };
  }, [shouts]);

  const handleTogglePin = async (shoutId: string, currentPinned: boolean) => {
    vibrateTap();
    soundFx.playClick();
    await shoutService.pinShout(shoutId, !currentPinned);
  };

  const handleHideShout = async (shoutId: string) => {
    vibrateWarning();
    soundFx.playClick();
    await shoutService.hideShout(shoutId);
  };

  const handleClearAll = async () => {
    vibrateError();
    soundFx.playNotification();
    await shoutService.clearAllShouts();
    setIsClearAllDialogOpen(false);
  };

  const handleApprove = async (shoutId: string) => {
    vibrateTap();
    await shoutService.updateShoutStatus(shoutId, 'ACTIVE');
  };

  const handleReject = async (shoutId: string) => {
    vibrateWarning();
    await shoutService.updateShoutStatus(shoutId, 'FLAGGED');
  };

  const handleSummarize = async () => {
    setIsSummarizing(true);
    try {
      const recentShouts = shouts.slice(0, 30).map(s => ({ text: s.text, sender: s.sender_name }));
      const res = await fetch('/api/summarize-audience', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'SHOUTS', data: recentShouts })
      });
      const data = await res.json();
      if (data.summary) {
        setSummary(data.summary);
      }
    } catch (e) {
      console.error(e);
      setSummary('Có lỗi khi tạo tóm tắt AI.');
    }
    setIsSummarizing(false);
  };

  const handleTriggerEffect = async () => {
    vibrateSuccess();
    soundFx.playSuccess();
    await syncService.updateGameState({
      projector_effect: { type: 'CONFETTI', timestamp: Date.now() }
    });
  };

  const handleSendCustomShout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;

    vibrateSuccess();
    soundFx.playSuccess();

    const res = await shoutService.sendShout({
      uid: `admin_${Date.now()}`,
      sender_name: customSender.trim() || 'Ban Tổ Chức',
      sender_mssv: customRole.trim() || 'BTC',
      text: customText.trim(),
      emoji: customEmoji,
      color: customColor
    });

    if (res.success && res.shout && customIsPinned) {
      await shoutService.pinShout(res.shout.id, true);
    }

    setCustomText('');
    setIsAddCustomOpen(false);
  };

  const handleSendPreset = async (preset: { text: string; emoji: string; color: ShoutBadgeColor }) => {
    vibrateTap();
    soundFx.playClick();
    await shoutService.sendShout({
      uid: `admin_${Date.now()}`,
      sender_name: 'MC Sân Khấu',
      sender_mssv: 'HOST',
      text: preset.text,
      emoji: preset.emoji,
      color: preset.color
    });
  };

  const handleToggleOpen = async () => {
    vibrateTap();
    soundFx.playClick();
    const nextVal = !settings.is_open;
    const updated = { ...settings, is_open: nextVal };
    setSettings(updated);
    await shoutService.updateSettings({ is_open: nextVal });
  };

  const handleUpdateCooldown = async (sec: number) => {
    vibrateTap();
    const updated = { ...settings, cooldown_sec: sec };
    setSettings(updated);
    await shoutService.updateSettings({ cooldown_sec: sec });
  };

  const handleUpdateMaxChars = async (chars: number) => {
    vibrateTap();
    const updated = { ...settings, max_chars: chars };
    setSettings(updated);
    await shoutService.updateSettings({ max_chars: chars });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Header Card */}
      <section className="fluent-box p-4 sm:p-5 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-gradient-to-br from-pink-600 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-pink-900/30 border border-pink-400/30">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider">
                  Quản Lý Chat & Tiếng Hô Khán Giả (Audience Shout)
                </h2>
                <span className={`px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase tracking-wider border ${
                  settings.is_open
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 animate-pulse'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                }`}>
                  {settings.is_open ? '🟢 ĐANG MỞ CHAT' : '🔴 ĐÃ TẠM KHÓA'}
                </span>
              </div>
              <p className="text-xs text-white/50 mt-1">
                Kiểm duyệt, ghim thông điệp MC, phát thông báo nổi bật và điều chỉnh tốc độ dòng chữ chạy (Marquee Ticker) trên màn chiếu sân khấu.
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleToggleOpen}
              className={`px-3.5 py-2 rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 border cursor-pointer ${
                settings.is_open
                  ? 'bg-rose-600/80 hover:bg-rose-500 text-white border-rose-500/50'
                  : 'bg-emerald-600/80 hover:bg-emerald-500 text-white border-emerald-500/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{settings.is_open ? 'Tạm Khóa Chat' : 'Mở Lại Chat'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsAddCustomOpen(!isAddCustomOpen)}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-[4px] text-xs font-bold uppercase tracking-wider transition shadow-md shadow-purple-900/30 flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Phát Tiếng Hô MC</span>
            </button>

            <button
              type="button"
              onClick={() => setIsClearAllDialogOpen(true)}
              className="px-3.5 py-2 fluent-box hover-effect border border-rose-500/30 text-rose-300 rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa Hết Chat</span>
            </button>
            <button
              type="button"
              onClick={() => {
                vibrateTap();
                exportShoutsToCSV(shouts);
              }}
              className="px-3.5 py-2 fluent-box hover-effect border border-sky-500/30 text-sky-300 rounded-[4px] text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>

        {/* Metrics Bento Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 pt-3">
          <div className="fluent-box-nested p-3">
            <span className="text-[10px] text-white/40 font-mono uppercase block">Tổng Tiếng Hô</span>
            <span className="text-xl font-bold font-mono text-white">{stats.total}</span>
          </div>
          <div className="fluent-box-nested p-3">
            <span className="text-[10px] text-amber-300/80 font-mono uppercase block">Đang Ghim Nổi Bật</span>
            <span className="text-xl font-bold font-mono text-amber-300">{stats.pinnedCount}</span>
          </div>
          <div className="fluent-box-nested p-3">
            <span className="text-[10px] text-rose-300/80 font-mono uppercase block">Tổng Lượt Thả Tim ❤️</span>
            <span className="text-xl font-bold font-mono text-rose-300">{stats.totalLikes}</span>
          </div>
          <div className="fluent-box-nested p-3">
            <span className="text-[10px] text-sky-300/80 font-mono uppercase block">Thời Gian Chờ (Cooldown)</span>
            <span className="text-xl font-bold font-mono text-sky-300">{settings.cooldown_sec}s</span>
          </div>
        </div>
      </section>

      {/* Broadcast Quick Banner / Form if open */}
      {isAddCustomOpen && (
        <section className="fluent-box p-4 sm:p-5 border border-purple-500/40 rounded-[4px] animate-fadeIn space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-white/10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Phát Tiếng Hô Hoặc Thông Điệp Trực Tiếp Lên Màn Chiếu
              </h3>
            </div>
            <button
              onClick={() => setIsAddCustomOpen(false)}
              className="text-xs text-white/40 hover:text-white"
            >
              Đóng
            </button>
          </div>

          <form onSubmit={handleSendCustomShout} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1">Tên Người Phát</label>
                <input
                  type="text"
                  value={customSender}
                  onChange={(e) => setCustomSender(e.target.value)}
                  placeholder="MC / Ban Tổ Chức"
                  className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/15 rounded-[4px] text-white focus:outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1">Danh Xưng / Vai Trò</label>
                <input
                  type="text"
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="HOST / BTC"
                  className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/15 rounded-[4px] text-white focus:outline-none focus:border-purple-400"
                />
              </div>
              <div>
                <label className="text-[11px] font-mono text-white/60 block mb-1">Màu Nhãn</label>
                <select
                  value={customColor}
                  onChange={(e) => setCustomColor(e.target.value as ShoutBadgeColor)}
                  className="w-full px-3 py-1.5 text-xs bg-black/40 border border-white/15 rounded-[4px] text-white focus:outline-none focus:border-purple-400"
                >
                  {Object.entries(SHOUT_BADGE_COLORS).map(([key, col]) => (
                    <option key={key} value={key} className="bg-slate-900 text-white">
                      {col.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="text-[11px] font-mono text-white/60 block mb-1">
                Nội Dung Tiếng Hô (Tối đa {settings.max_chars} ký tự)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  maxLength={settings.max_chars}
                  placeholder="Nhập lời cổ vũ, nhắc nhở hoặc không khí khán phòng..."
                  className="w-full pl-3 pr-16 py-2 text-xs sm:text-sm bg-black/40 border border-white/15 rounded-[4px] text-white focus:outline-none focus:border-purple-400"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-white/40">
                  {customText.length}/{settings.max_chars}
                </span>
              </div>
            </div>

            {/* Emoji tags */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-mono text-white/50 mr-1">Biểu tượng:</span>
              {SHOUT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => setCustomEmoji(emoji)}
                  className={`w-7 h-7 rounded-[4px] flex items-center justify-center text-sm transition ${
                    customEmoji === emoji
                      ? 'bg-purple-600 border border-purple-400 scale-110'
                      : 'bg-black/30 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {emoji}
                </button>
              ))}

              <label className="ml-auto flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={customIsPinned}
                  onChange={(e) => setCustomIsPinned(e.target.checked)}
                  className="rounded border-white/20 text-purple-600 focus:ring-0"
                />
                <span className="text-xs font-mono text-amber-300 font-bold flex items-center gap-1">
                  <Pin className="w-3 h-3" /> Ghim đầu hàng
                </span>
              </label>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!customText.trim()}
                className="px-5 py-2 bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 disabled:opacity-40 text-white rounded-[4px] text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-pink-950/50 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" /> Phát Lên Màn Chiếu
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Preset Quick Shouts */}
      <section className="fluent-box p-4">
        <span className="text-[11px] font-mono text-white/50 uppercase tracking-wider block mb-2">
          ⚡ Phát nhanh các tiếng hô mẫu phổ biến:
        </span>
        <div className="flex flex-wrap gap-2">
          {POPULAR_SHOUT_PRESETS.map((preset, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendPreset(preset)}
              className="px-3 py-1.5 rounded-[4px] bg-black/40 hover:bg-white/10 border border-white/10 hover:border-purple-400/50 text-xs text-white/90 transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>{preset.emoji}</span>
              <span>{preset.text}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Advanced Admin Actions */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Toggle & Effects */}
        <div className="fluent-box p-4 flex flex-col gap-3 justify-center">
          <div className="flex items-center justify-between">
            <span className="text-sm text-white/80">Duyệt tiếng hô thủ công (Pre-moderation)</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={settings.require_approval || false}
                onChange={async (e) => {
                  vibrateTap();
                  await shoutService.updateSettings({ require_approval: e.target.checked });
                }}
              />
              <div className="w-9 h-5 bg-black/40 border border-white/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white/60 peer-checked:after:bg-purple-400 after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:border-purple-400/50"></div>
            </label>
          </div>
          <button
            onClick={handleTriggerEffect}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-[4px] text-xs font-medium text-white transition flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            Bắn Pháo Giấy (Confetti) Lên Màn Chiếu
          </button>
        </div>

        {/* AI Summarization */}
        <div className="fluent-box p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-300" /> AI Nhận Xét Không Khí
            </span>
            <button
              onClick={handleSummarize}
              disabled={isSummarizing || shouts.length === 0}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-[4px] text-xs text-white transition disabled:opacity-50"
            >
              {isSummarizing ? 'Đang phân tích...' : 'Tạo tóm tắt'}
            </button>
          </div>
          {summary ? (
            <div className="text-xs text-amber-200/90 leading-relaxed bg-amber-500/10 p-2 rounded-[4px] border border-amber-500/20">
              {summary}
            </div>
          ) : (
            <div className="text-xs text-white/40 italic">
              Bấm "Tạo tóm tắt" để AI đọc các tương tác mới nhất và đưa ra gợi ý cho MC.
            </div>
          )}
        </div>
      </section>

      {/* Filter & Search Bar */}
      <section className="fluent-box p-3 sm:p-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Search */}
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo nội dung, tên người gửi, MSSV..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-black/40 border border-white/15 rounded-[4px] text-white focus:outline-none focus:border-purple-400"
            />
          </div>

          {/* Color & Sort Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-white/40">Màu:</span>
              <select
                value={filterColor}
                onChange={(e) => setFilterColor(e.target.value)}
                className="px-2.5 py-1 text-xs bg-black/40 border border-white/15 rounded-[4px] text-white focus:outline-none"
              >
                <option value="ALL">Tất cả màu</option>
                {Object.entries(SHOUT_BADGE_COLORS).map(([key, col]) => (
                  <option key={key} value={key}>
                    {col.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[10px] font-mono text-white/40">Sắp xếp:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-2.5 py-1 text-xs bg-black/40 border border-white/15 rounded-[4px] text-white focus:outline-none"
              >
                <option value="NEWEST">Mới nhất</option>
                <option value="MOST_LIKES">Nhiều tim nhất</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['ACTIVE', 'PENDING', 'FLAGGED'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-mono rounded-[4px] border transition ${
              activeTab === tab
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                : 'bg-black/40 border-white/10 text-white/50 hover:text-white/80'
            }`}
          >
            {tab === 'ACTIVE' && 'Đã Duyệt'}
            {tab === 'PENDING' && 'Chờ Duyệt'}
            {tab === 'FLAGGED' && 'Từ Chối'}
          </button>
        ))}
      </div>

      {/* Main Shouts List */}
      <section className="space-y-2">
        {filteredShouts.length === 0 ? (
          <div className="fluent-box p-8 text-center text-white/40 font-mono text-xs">
            Không có tiếng hô nào phù hợp với bộ lọc hiện tại.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {filteredShouts.map((shout) => {
              const badgeInfo = SHOUT_BADGE_COLORS[shout.color as ShoutBadgeColor] || SHOUT_BADGE_COLORS.purple;

              return (
                <div
                  key={shout.id}
                  className={`p-3 rounded-[4px] border transition-all ${
                    shout.is_pinned
                      ? 'bg-amber-950/20 border-amber-500/50 shadow-md shadow-amber-950/20'
                      : 'fluent-box-nested border-white/10 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-base">{shout.emoji || '💬'}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold text-white truncate max-w-[120px] sm:max-w-[180px]">
                            {shout.sender_name}
                          </span>
                          {shout.sender_mssv && (
                            <span className="text-[10px] font-mono text-white/40 px-1 py-0.2 rounded bg-white/5">
                              {shout.sender_mssv}
                            </span>
                          )}
                          {shout.is_pinned && (
                            <span className="text-[9px] font-mono font-bold text-amber-300 bg-amber-500/20 border border-amber-400/40 px-1 py-0.2 rounded flex items-center gap-0.5">
                              <Pin className="w-2.5 h-2.5" /> GHIM
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-white/30 font-mono">
                          {new Date(shout.timestamp).toLocaleTimeString('vi-VN')}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      {(shout.status === 'PENDING' || shout.status === 'FLAGGED') && (
                        <button
                          type="button"
                          onClick={() => handleApprove(shout.id)}
                          className="p-1.5 rounded-[4px] hover:bg-emerald-500/20 text-white/40 hover:text-emerald-300 transition cursor-pointer"
                          title="Duyệt (Cho phép hiện lên màn chiếu)"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        </button>
                      )}

                      {shout.status === 'PENDING' && (
                        <button
                          type="button"
                          onClick={() => handleReject(shout.id)}
                          className="p-1.5 rounded-[4px] hover:bg-rose-500/20 text-white/40 hover:text-rose-300 transition cursor-pointer"
                          title="Từ chối"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleTogglePin(shout.id, Boolean(shout.is_pinned))}
                        className={`p-1.5 rounded-[4px] transition cursor-pointer ${
                          shout.is_pinned
                            ? 'bg-amber-500/30 text-amber-300 border border-amber-400/50'
                            : 'hover:bg-white/10 text-white/50 hover:text-white'
                        }`}
                        title={shout.is_pinned ? 'Bỏ ghim' : 'Ghim lên đầu'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleHideShout(shout.id)}
                        className="p-1.5 rounded-[4px] hover:bg-rose-500/20 text-white/40 hover:text-rose-300 transition cursor-pointer"
                        title="Xóa/Ẩn tiếng hô này khỏi màn chiếu"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Shout Content */}
                  <div className="mt-2 text-xs sm:text-sm text-white/90 font-medium leading-relaxed pl-6 border-l-2 border-purple-400/40">
                    {shout.text}
                  </div>

                  {/* Footer with Likes */}
                  <div className="mt-2.5 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono text-white/40">
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${badgeInfo.bg} ${badgeInfo.text} border ${badgeInfo.border}`}>
                      {badgeInfo.name}
                    </span>
                    <span className="flex items-center gap-1 text-rose-300/80 font-bold">
                      <Heart className="w-3 h-3 fill-rose-500 text-rose-400" />
                      {shout.likes || 0} lượt thích
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confirmation Dialog for Clearing All Shouts */}
      {isClearAllDialogOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="fluent-dialog-surface max-w-sm w-full p-5 space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Xác Nhận Xóa Sạch Tiếng Hô?
              </h3>
            </div>
            <p className="text-xs text-white/70">
              Thao tác này sẽ xóa toàn bộ danh sách tiếng hô của khán giả hiện có trên màn chiếu và cơ sở dữ liệu. Bạn có chắc chắn không?
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsClearAllDialogOpen(false)}
                className="px-3 py-1.5 fluent-box hover-effect text-xs text-white rounded-[4px]"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleClearAll}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-[4px] shadow-md shadow-rose-950/50"
              >
                Xóa Toàn Bộ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
