import { useLanguage } from '../hooks/useLanguage';
import React, { useState, useEffect, useRef } from 'react';
import { t } from '../utils/i18n';
import { AudienceShout, ShoutBadgeColor, UserInfo } from '../types';
import { 
  shoutService, 
  SHOUT_BADGE_COLORS, 
  SHOUT_EMOJIS, 
  POPULAR_SHOUT_PRESETS 
} from '../services/shoutService';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateWarning } from '../utils/hapticUtils';
import confetti from '../utils/confetti';
import { 
  Megaphone, 
  Send, 
  X, 
  Sparkles, 
  Heart, 
  Clock, 
  History, 
  Flame, 
  AlertCircle, 
  Smile, 
  Palette, 
  Check, 
  RefreshCw,
  Trash2,
  Pin
} from 'lucide-react';

interface AudienceShoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo | null;
  onOpenRegister?: () => void;
  isAdmin?: boolean;
}

export const AudienceShoutModal: React.FC<AudienceShoutModalProps> = ({
  isOpen,
  onClose,
  user,
  onOpenRegister,
  isAdmin = false
}) => {
  const { localLanguage } = useLanguage();

  const [activeTab, setActiveTab] = useState<'create' | 'feed'>('create');
  const [inputText, setInputText] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('🔥');
  const [selectedColor, setSelectedColor] = useState<ShoutBadgeColor>('purple');
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [shouts, setShouts] = useState<AudienceShout[]>([]);
  const [feedFilter, setFeedFilter] = useState<'all' | 'mine' | 'top'>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  const maxChars = shoutService.getSettings().max_chars;

  useEffect(() => {
    if (!isOpen) return;
    
    // Subscribe to shouts
    const unsub = shoutService.subscribe((updated) => {
      setShouts(updated);
    });

    // Check cooldown timer
    const checkCooldown = () => {
      if (user?.uid) {
        const rem = shoutService.getRemainingCooldownSec(user.uid);
        setCooldownRemaining(rem);
      }
    };
    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);

    // Focus input on open
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [isOpen, user?.uid]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      if (onOpenRegister) onOpenRegister();
      return;
    }

    const trimmed = inputText.trim();
    if (!trimmed) {
      setErrorMessage(localLanguage === 'en' ? 'Please enter a shout message!' : 'Vui lòng nhập nội dung tiếng hô!');
      vibrateWarning();
      return;
    }

    if (trimmed.length > maxChars) {
      setErrorMessage(localLanguage === 'en' ? `Maximum ${maxChars} characters!` : `Nội dung tối đa ${maxChars} ký tự!`);
      vibrateWarning();
      return;
    }

    if (cooldownRemaining > 0) {
      setErrorMessage(localLanguage === 'en' ? `Please wait ${cooldownRemaining}s to send again` : `Vui lòng chờ ${cooldownRemaining}s để gửi tiếp`);
      vibrateWarning();
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    try {
      const result = await shoutService.sendShout({
        uid: user.uid,
        sender_name: user.name || (localLanguage === 'en' ? 'Audience' : 'Khán giả'),
        sender_mssv: user.mssv || '',
        sender_avatar: user.avatarSeed,
        text: trimmed,
        emoji: selectedEmoji,
        color: selectedColor
      });

      if (result.success) {
        vibrateSuccess();
        soundFx.playSuccess();
        setInputText('');
        setErrorMessage(null);
        
        // Trigger small celebratory micro-confetti
        try {
          confetti({
            particleCount: 25,
            spread: 60,
            origin: { y: 0.8 }
          });
        } catch {}

        // Switch to feed or close
        setActiveTab('feed');
      } else {
        setErrorMessage(result.error || (localLanguage === 'en' ? 'Cannot send shout. Please try again.' : 'Không thể gửi tiếng hô. Vui lòng thử lại.'));
        vibrateWarning();
      }
    } catch (err) {
      setErrorMessage(localLanguage === 'en' ? 'System error when sending shout.' : 'Lỗi hệ thống khi gửi tiếng hô.');
      vibrateWarning();
    } finally {
      setIsSending(false);
    }
  };

  const handlePresetClick = (preset: typeof POPULAR_SHOUT_PRESETS[0]) => {
    vibrateTap();
    soundFx.playClick();
    setInputText(preset.text);
    setSelectedEmoji(preset.emoji);
    setSelectedColor(preset.color);
    setErrorMessage(null);
  };

  const handleLike = async (shoutId: string) => {
    if (!user?.uid) {
      if (onOpenRegister) onOpenRegister();
      return;
    }
    vibrateTap();
    soundFx.playClick();
    await shoutService.toggleLikeShout(shoutId, user.uid);
  };

  const filteredShouts = shouts.filter(s => {
    if (feedFilter === 'mine') return user?.uid && s.uid === user.uid;
    if (feedFilter === 'top') return (s.likes || 0) > 0;
    return true;
  });

  const currentColorConfig = SHOUT_BADGE_COLORS[selectedColor] || SHOUT_BADGE_COLORS.purple;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-[#190839] border border-white/20 rounded-[4px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-[2px] bg-gradient-to-tr from-pink-600 to-purple-600 flex items-center justify-center text-white shadow-md">
              <Megaphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-1.5">
                {localLanguage === "en" ? "Audience Shout" : "Hô To Khán Giả"} <span className="text-[11px] font-mono text-[#F7CAC9] font-normal">Audience Shout</span>
              </h3>
              <p className="text-[11px] text-white/60">
                {localLanguage === 'en' ? 'Appears live on stage & audience screens' : 'Xuất hiện trực tiếp trên màn hình sân khấu & khán phòng'}
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/20 p-1">
          <button
            onClick={() => {
              vibrateTap();
              setActiveTab('create');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-[2px] flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'create'
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <Megaphone className="w-3.5 h-3.5" /> {localLanguage === 'en' ? 'Send New Shout' : 'Gửi Tiếng Hô Mới'}
          </button>
          <button
            onClick={() => {
              vibrateTap();
              setActiveTab('feed');
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-[2px] flex items-center justify-center gap-1.5 transition-all ${
              activeTab === 'feed'
                ? 'bg-[#F7CAC9] text-[#190839] shadow-md'
                : 'text-white/70 hover:text-white hover:bg-white/5'
            }`}
          >
            <History className="w-3.5 h-3.5" /> {localLanguage === 'en' ? 'Shout Wall' : 'Tường Tiếng Hô'} ({shouts.length})
          </button>
        </div>

        {/* Tab 1: Create Shout */}
        {activeTab === 'create' && (
          <div className="p-4 overflow-y-auto space-y-4 flex-1">
            {/* Live Preview Card */}
            <div>
              <label className="text-[11px] font-mono uppercase text-white/60 font-bold block mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#F7CAC9]" /> {localLanguage === 'en' ? 'Preview on Marquee:' : 'Xem trước hiển thị trên Marquee:'}
              </label>
              <div className={`p-3 rounded-[2px] border ${currentColorConfig.bg} ${currentColorConfig.border} flex items-center gap-2.5 transition-all shadow-inner`}>
                <span className="text-xl select-none">{selectedEmoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-mono font-bold text-white/80 truncate">
                    {user?.name || (localLanguage === 'en' ? 'You' : 'Bạn')} {user?.mssv ? `(${user.mssv})` : ''}:
                  </div>
                  <div className="text-sm font-semibold text-white truncate">
                    {inputText.trim() || (localLanguage === 'en' ? 'Enter your shout message...' : 'Nhập nội dung tiếng hô của bạn...')} 
                  </div>
                </div>
                <div className="text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded text-white/50 shrink-0">
                  {inputText.length}/{maxChars}
                </div>
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-white/90">
                    {localLanguage === 'en' ? `Shout content (Max ${maxChars} chars):` : `Nội dung tiếng hô (Giới hạn ${maxChars} ký tự):`}
                  </label>
                  <span className={`text-xs font-mono font-bold ${
                    inputText.length > maxChars ? 'text-rose-400' : 'text-[#F7CAC9]'
                  }`}>
                    {inputText.length}/{maxChars}
                  </span>
                </div>
                <div className="relative">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputText}
                    onChange={(e) => {
                      setInputText(e.target.value.substring(0, maxChars));
                      if (errorMessage) setErrorMessage(null);
                    }}
                    placeholder={localLanguage === "en" ? "Ex: Go Team A! You guys rock 🔥" : "VD: Cố lên đội A ơi! Đỉnh chóp quá 🔥"}
                    maxLength={maxChars}
                    className="w-full px-3.5 py-2.5 rounded-[2px] bg-black/50 border border-white/20 text-white placeholder-white/40 text-sm focus:outline-none focus:border-[#F7CAC9] transition-colors"
                  />
                  {inputText && (
                    <button
                      type="button"
                      onClick={() => setInputText('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white text-xs p-1"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Emoji Selector */}
              <div>
                <label className="text-[11px] font-mono uppercase text-white/60 font-bold block mb-1.5 flex items-center gap-1">
                  <Smile className="w-3 h-3 text-[#F7CAC9]" /> {localLanguage === 'en' ? 'Select Emoji:' : 'Chọn Biểu Tượng Cảm Xúc:'}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {SHOUT_EMOJIS.map((emoji) => (
                    <button
                      type="button"
                      key={emoji}
                      onClick={() => {
                        vibrateTap();
                        setSelectedEmoji(emoji);
                      }}
                      className={`w-9 h-9 rounded-[2px] text-lg flex items-center justify-center border transition-all ${
                        selectedEmoji === emoji
                          ? 'bg-[#F7CAC9]/20 border-[#F7CAC9] scale-110 shadow-md'
                          : 'bg-black/30 border-white/10 hover:border-white/30'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Theme Selector */}
              <div>
                <label className="text-[11px] font-mono uppercase text-white/60 font-bold block mb-1.5 flex items-center gap-1">
                  <Palette className="w-3 h-3 text-[#F7CAC9]" /> {localLanguage === 'en' ? 'Select Highlight Color:' : 'Chọn Màu Sắc Nổi Bật:'}
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                  {Object.entries(SHOUT_BADGE_COLORS).map(([key, config]) => {
                    const isSelected = selectedColor === key;
                    return (
                      <button
                        type="button"
                        key={key}
                        onClick={() => {
                          vibrateTap();
                          setSelectedColor(key as ShoutBadgeColor);
                        }}
                        className={`p-1.5 rounded-[2px] border text-center text-[10px] font-bold transition-all flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'border-white bg-white/20 shadow-md scale-105'
                            : 'border-white/10 bg-black/30 hover:border-white/20 text-white/70'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded-full ${config.bg} border ${config.border} flex items-center justify-center`}>
                          {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className="truncate w-full">{config.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quick Preset Chips */}
              <div>
                <label className="text-[11px] font-mono uppercase text-white/60 font-bold block mb-1.5 flex items-center gap-1">
                  <Flame className="w-3 h-3 text-pink-400" /> {localLanguage === 'en' ? '1-Tap Quick Shouts:' : 'Mẫu Hô Nhanh 1-Chạm:'}
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {POPULAR_SHOUT_PRESETS.map((preset, idx) => (
                    <button
                      type="button"
                      key={idx}
                      onClick={() => handlePresetClick(preset)}
                      className="px-2.5 py-1 rounded-[2px] bg-black/40 hover:bg-white/15 border border-white/15 text-xs text-white/90 transition-all text-left flex items-center gap-1.5 active:scale-95"
                    >
                      <span>{preset.emoji}</span>
                      <span className="truncate max-w-[200px]">{preset.text}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Error Warning */}
              {errorMessage && (
                <div className="p-2.5 rounded-[2px] bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2 animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2">
                {!user ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (onOpenRegister) onOpenRegister();
                    }}
                    className="w-full py-3 rounded-[2px] bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 font-bold text-sm text-white shadow-lg flex items-center justify-center gap-2"
                  >
                    {localLanguage === 'en' ? 'Register To Shout' : 'Đăng Ký Tham Gia Để Hô To'}
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSending || cooldownRemaining > 0 || !inputText.trim()}
                    className={`w-full py-3 rounded-[2px] font-bold text-sm shadow-xl flex items-center justify-center gap-2 transition-all ${
                      cooldownRemaining > 0
                        ? 'bg-slate-800 text-white/40 border border-white/10 cursor-not-allowed'
                        : isSending || !inputText.trim()
                        ? 'bg-purple-900/50 text-white/40 border border-white/10 cursor-not-allowed'
                        : 'bg-gradient-to-r from-pink-500 via-[#F7CAC9] to-purple-600 text-[#190839] hover:opacity-95 active:scale-98'
                    }`}
                  >
                    {isSending ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" /> {localLanguage === 'en' ? 'Sending...' : 'Đang gửi...'}
                      </>
                    ) : cooldownRemaining > 0 ? (
                      <>
                        <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                        <span>{t("shout_wait", localLanguage)} {cooldownRemaining}{t("shout_wait_s", localLanguage)}</span>
                      </>
                    ) : (
                      <>
                        <Megaphone className="w-4 h-4" />
                        <span>{t("shout_send", localLanguage)}</span>
                        <Send className="w-3.5 h-3.5 ml-1" />
                      </>
                    )}
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        {/* Tab 2: Feed / History Wall */}
        {activeTab === 'feed' && (
          <div className="p-4 overflow-y-auto space-y-3 flex-1">
            {/* Filter Bar */}
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-white/10">
              <div className="flex gap-1">
                <button
                  onClick={() => setFeedFilter('all')}
                  className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all ${
                    feedFilter === 'all'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {localLanguage === 'en' ? 'All' : 'Tất cả'} ({shouts.length})
                </button>
                <button
                  onClick={() => setFeedFilter('mine')}
                  className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all ${
                    feedFilter === 'mine'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {localLanguage === 'en' ? 'Mine' : 'Của tôi'}
                </button>
                <button
                  onClick={() => setFeedFilter('top')}
                  className={`px-2.5 py-1 rounded-[2px] text-xs font-bold transition-all ${
                    feedFilter === 'top'
                      ? 'bg-white/20 text-white border border-white/30'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {localLanguage === 'en' ? 'Top Hearts ❤️' : 'Nhiều Tim ❤️'}
                </button>
              </div>

              <button
                onClick={() => {
                  vibrateTap();
                  setActiveTab('create');
                }}
                className="px-2.5 py-1 rounded-[2px] bg-gradient-to-r from-pink-600 to-purple-600 text-xs font-bold text-white shadow hover:opacity-90 flex items-center gap-1"
              >
                <Megaphone className="w-3 h-3" /> {localLanguage === 'en' ? 'Shout' : 'Hô mới'}
              </button>
            </div>

            {/* List */}
            {filteredShouts.length === 0 ? (
              <div className="text-center py-10 text-white/50 text-xs space-y-2">
                <Megaphone className="w-8 h-8 mx-auto text-white/30" />
                <p>{localLanguage === 'en' ? 'No shouts in this category.' : 'Chưa có tiếng hô nào trong danh mục này.'}</p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-3 py-1.5 rounded bg-white/10 hover:bg-white/20 text-white font-medium text-xs inline-block"
                >
                  {localLanguage === 'en' ? 'Be the first to Shout!' : 'Hãy là người đầu tiên Hô To!'}
                </button>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {filteredShouts.map((shout) => {
                  const colorConfig = SHOUT_BADGE_COLORS[(shout.color as keyof typeof SHOUT_BADGE_COLORS) || 'purple'] || SHOUT_BADGE_COLORS.purple;
                  const isUserLiked = user?.uid && Array.isArray(shout.liked_by) && shout.liked_by.includes(user.uid);
                  const isMine = user?.uid && shout.uid === user.uid;

                  return (
                    <div
                      key={shout.id}
                      className={`p-3 rounded-[2px] border ${
                        shout.is_pinned
                          ? 'bg-amber-950/70 border-amber-500/60'
                          : `${colorConfig.bg} ${colorConfig.border}`
                      } flex items-start justify-between gap-3 transition-all`}
                    >
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <span className="text-xl select-none mt-0.5">{shout.emoji || '🔥'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                            <span className={`text-xs font-bold font-mono ${isMine ? 'text-emerald-300' : colorConfig.text}`}>
                              {shout.sender_name}
                            </span>
                            {shout.sender_mssv && (
                              <span className="text-[10px] font-mono text-white/40">
                                ({shout.sender_mssv})
                              </span>
                            )}
                            {shout.is_pinned && (
                              <span className="inline-flex items-center gap-0.5 text-[9px] bg-amber-500/30 text-amber-300 px-1 rounded font-bold">
                                <Pin className="w-2.5 h-2.5" /> Ghim
                              </span>
                            )}
                            <span className="text-[10px] font-mono text-white/40 ml-auto">
                              {new Date(shout.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm font-semibold text-white/95 break-words">
                            {shout.text}
                          </p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleLike(shout.id)}
                          className={`flex items-center gap-1 px-2 py-1 rounded-[2px] text-xs font-mono transition-all ${
                            isUserLiked
                              ? 'bg-rose-500/30 text-rose-300 border border-rose-500/50 font-bold'
                              : 'bg-white/10 hover:bg-white/20 text-white/70 hover:text-white border border-white/10'
                          }`}
                          title={localLanguage === "en" ? "Heart" : "Thả tim"}
                        >
                          <Heart className={`w-3 h-3 ${isUserLiked ? 'fill-rose-400 text-rose-400' : 'text-white/60'}`} />
                          <span>{shout.likes || 0}</span>
                        </button>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm(localLanguage === 'en' ? 'Hide this shout from screen?' : 'Ẩn tiếng hô này khỏi màn hình?')) {
                                await shoutService.hideShout(shout.id);
                              }
                            }}
                            className="p-1 rounded text-white/40 hover:text-rose-400 transition-colors"
                            title={localLanguage === "en" ? "Delete / Hide shout (Admin)" : "Xóa / Ẩn tiếng hô (Admin)"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-3 border-t border-white/10 bg-black/40 flex items-center justify-between text-xs text-white/60">
          <div className="flex items-center gap-1 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{t("shout_sync", localLanguage)}</span>
          </div>
          <button
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            {localLanguage === 'en' ? 'Close' : 'Đóng'}
          </button>
        </div>
      </div>
    </div>
  );
};
