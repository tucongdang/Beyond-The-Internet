import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { X, Trophy, AlertTriangle, Megaphone } from 'lucide-react';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { GameState } from '../types';
import { getSecureRandomId } from '../utils/cryptoUtils';

interface NotificationToastProps {
  userUid?: string;
  gameState?: GameState;
  currentView?: string;
}

interface ToastItem {
  id: string;
  title: string;
  message: string;
  type?: 'LUCKY_DRAW' | 'URGENT' | 'ALERT' | 'GENERAL';
  channel: string;
  rawId?: string;
  timestamp: number;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ userUid, currentView }) => {
  const { localLanguage } = useLanguage();
  const [notifications, setNotifications] = useState<ToastItem[]>([]);
  const [isExiting, setIsExiting] = useState(false);
  const activeToast = notifications[0];
  const exitTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const autoCloseTimerRef = useRef<NodeJS.Timeout | null>(null);

  const addToast = useCallback((item: ToastItem) => {
    setNotifications(prev => {
      if (prev.some(p => p.id === item.id)) return prev;
      if (item.type === 'URGENT' || item.type === 'ALERT') {
        soundFx.playWarning();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([300, 150, 300, 150, 300]);
        }
      } else {
        soundFx.playClick();
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          navigator.vibrate([200, 100, 200]);
        }
      }
      return [item, ...prev];
    });
  }, []);

  const humanizeToastCopy = useCallback((rawText: string | undefined, fallbackVi: string, fallbackEn: string) => {
    const trimmed = (rawText || '').trim();
    if (!trimmed) {
      return localLanguage !== 'vi' ? fallbackEn : fallbackVi;
    }
    if (/^(ready for next question|prepare for the next question|waiting for next question|next question ready|sẵn sàng cho câu hỏi tiếp theo|chuẩn bị cho câu hỏi tiếp theo|đang chờ câu hỏi tiếp theo|sẵn sàng câu tiếp theo)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi' ? 'Let’s see what the next question brings!' : 'Cùng chờ xem câu tiếp theo nhé!';
    }
    if (/^(connection error|network error|sync error|offline|mất kết nối|lỗi kết nối|lỗi mạng|lỗi đồng bộ)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi' ? 'Reconnecting right now!' : 'Đang kết nối lại chút nhé!';
    }
    if (/^(connected|connection restored|online|reconnected|đã kết nối|đã kết nối lại|kết nối thành công)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi' ? 'Back online and ready to roll!' : 'Đã kết nối mượt mà trở lại rồi!';
    }
    if (/^(question locked|voting locked|time expired|time is up|time's up|đã khóa câu hỏi|đã khóa bình chọn|hết giờ|hết thời gian)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi'
        ? 'Time is up! Let’s wait for the MC to reveal the answer!'
        : 'Đã khép lại thời gian trả lời! Cùng chờ MC công bố đáp án nhé!';
    }
    if (/^(answer submitted|response recorded|submission saved|saved|đã nộp đáp án|đã ghi nhận câu trả lời|đã lưu|đã lưu điểm)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi'
        ? 'Your answer is locked in! Fingers crossed for full points!'
        : 'Đã chốt đáp án của bạn! Chúc bạn rinh trọn điểm câu này nhé!';
    }
    if (/^(question active|new question|round started|câu hỏi mới|bắt đầu câu hỏi|mở câu hỏi)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi'
        ? 'New question is live — jump right in!'
        : 'Câu hỏi mới lên sóng rồi, nhập cuộc thôi nào!';
    }
    if (/^(round complete|round ended|round finished|kết thúc vòng thi|hoàn thành vòng thi)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi'
        ? 'Awesome job finishing this round! Get ready for the next challenge!'
        : 'Chúc mừng bạn đã hoàn thành vòng thi! Cùng chuẩn bị bứt phá ở thử thách tiếp theo nhé!';
    }
    if (/^(🚨\s*)?(system announcement|thông báo toàn hệ thống|system notice|thông báo hệ thống|thông báo khẩn từ ban tổ chức)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi' ? 'Live Update from the Stage!' : 'Tin mới từ Sân Khấu!';
    }
    if (/^(🚨\s*)?(urgent notice|thông báo khẩn|cảnh báo khẩn)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi' ? 'Quick heads-up from the MC!' : 'Nhắn nhanh từ sân khấu!';
    }
    if (/^(personal notice|thông báo cá nhân|thông báo mới)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi' ? 'A special message just for you!' : 'Tin nhắn dành riêng cho bạn!';
    }
    if (/^(🎉\s*)?(trúng giải lucky draw|lucky draw winner|lucky draw)[.!]*$/i.test(trimmed)) {
      return localLanguage !== 'vi' ? '🎉 Congrats! You won the Lucky Draw!' : '🎉 Chúc mừng bạn đã trúng thưởng Vòng Quay May Mắn!';
    }
    return trimmed;
  }, [localLanguage]);

  // 1. Subscribe to in-memory & cross-tab BroadcastChannel Global Notifications
  useEffect(() => {
    if (currentView === 'admin' || currentView === 'projector') return;
    const unsubBroadcast = syncService.subscribeToGlobalNotificationBroadcast((notif) => {
      addToast({
        id: notif.id || getSecureRandomId(`global_${Date.now()}_`, 6),
        title: humanizeToastCopy(notif.title, 'Nhắn nhanh từ sân khấu!', 'Quick heads-up from the MC!'),
        message: humanizeToastCopy(notif.message, 'Cùng chờ xem câu tiếp theo nhé!', 'Let’s see what the next question brings!'),
        type: notif.type || 'URGENT',
        channel: 'global',
        timestamp: notif.timestamp || Date.now()
      });
    });

    const unsubRecall = syncService.subscribeToGlobalNotificationRecall(() => {
      // Dismiss all active global notification toasts immediately when host recalls
      setNotifications(prev => prev.filter(n => n.channel !== 'global'));
    });

    return () => {
      unsubBroadcast();
      unsubRecall();
    };
  }, [currentView, addToast, humanizeToastCopy]);

  // 2. Subscribe to Firestore Global Notifications
  useEffect(() => {
    if (currentView === 'admin' || currentView === 'projector') return;
    const unsub = syncService.subscribeToNotifications('global', (notifs) => {
      const unread = notifs.filter(n => !n.read).map(n => ({
        id: `global_${n.id}`,
        title: humanizeToastCopy(n.title, 'Tin mới từ Sân Khấu!', 'Live Update from the Stage!'),
        message: humanizeToastCopy(n.message, 'Cùng chờ xem câu tiếp theo nhé!', 'Let’s see what the next question brings!'),
        type: (n.type || (/(khẩn|urgent|chú ý)/i.test(n.title || '') ? 'URGENT' : 'GENERAL')) as 'URGENT' | 'GENERAL',
        channel: 'global',
        rawId: n.id,
        timestamp: n.timestamp || Date.now()
      }));

      setNotifications(prev => {
        const prevIds = new Set(prev.map(p => p.id));
        const newItems = unread.filter(n => !prevIds.has(n.id));
        if (newItems.length > 0) {
          const hasUrgent = newItems.some(i => i.type === 'URGENT');
          if (hasUrgent) {
            soundFx.playWarning();
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate([300, 150, 300]);
            }
          } else {
            soundFx.playClick();
          }
        }
        const existingMap = new Map(prev.map(p => [p.id, p]));
        newItems.forEach(item => existingMap.set(item.id, item));
        return Array.from(existingMap.values());
      });
    });
    return () => unsub();
  }, [currentView, humanizeToastCopy]);

  // 3. Subscribe to user-specific notifications
  useEffect(() => {
    if (!userUid || currentView === 'admin' || currentView === 'projector') return;
    const unsub = syncService.subscribeToNotifications(userUid, (notifs) => {
      const unread = notifs.filter(n => !n.read).map(n => ({
        id: `user_${n.id}`,
        title: humanizeToastCopy(n.title, 'Tin nhắn dành riêng cho bạn!', 'A special message just for you!'),
        message: humanizeToastCopy(n.message, 'Ban Tổ Chức vừa gửi một lời nhắn tới bạn, xem ngay nhé!', 'The stage team just sent you a note — check it out!'),
        type: (/(lucky draw|quay số|trúng giải|trúng thưởng)/i.test(n.title || '') ? 'LUCKY_DRAW' : 'GENERAL') as 'LUCKY_DRAW' | 'GENERAL',
        channel: userUid,
        rawId: n.id,
        timestamp: n.timestamp || Date.now()
      }));

      setNotifications(prev => {
        const prevIds = new Set(prev.map(p => p.id));
        const newItems = unread.filter(n => !prevIds.has(n.id));
        if (newItems.length > 0) {
          soundFx.playClick();
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
          }
        }
        const existingMap = new Map(prev.map(p => [p.id, p]));
        newItems.forEach(item => existingMap.set(item.id, item));
        return Array.from(existingMap.values());
      });
    });
    return () => unsub();
  }, [userUid, currentView, humanizeToastCopy]);

  const handleDismiss = useCallback((notif: ToastItem) => {
    if (isExiting) return;
    setIsExiting(true);

    if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
    exitTimeoutRef.current = setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== notif.id));
      setIsExiting(false);
      if (notif.rawId && notif.channel && notif.channel !== 'local') {
        syncService.markNotificationRead(notif.channel, notif.rawId);
      }
    }, 280); // 280ms duration matches Fluent v2 toast exit timing
  }, [isExiting]);

  // Auto-close: 3 seconds for regular, 5 seconds for urgent notifications
  useEffect(() => {
    if (!activeToast) {
      setIsExiting(false);
      return;
    }

    setIsExiting(false);
    if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);

    const closeDuration = activeToast.type === 'URGENT' || activeToast.type === 'ALERT' ? 5000 : 3000;
    autoCloseTimerRef.current = setTimeout(() => {
      handleDismiss(activeToast);
    }, closeDuration);

    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, [activeToast?.id, activeToast?.type, handleDismiss]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (exitTimeoutRef.current) clearTimeout(exitTimeoutRef.current);
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  // Do NOT render notification toasts on Admin or Projector views
  if (currentView === 'admin' || currentView === 'projector') {
    return null;
  }

  if (!activeToast) return null;

  const isLuckyDraw = activeToast.type === 'LUCKY_DRAW';
  const isUrgent = activeToast.type === 'URGENT' || activeToast.type === 'ALERT';

  return (
    <div className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:top-20 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center pointer-events-none px-4 w-full max-w-lg select-none">
      {/* Show strictly ONLY 1 notification toast at a time with Fluent UI v2 motion */}
      <div
        key={activeToast.id}
        className={`w-full p-3.5 sm:p-4 rounded-[2px] flex flex-col gap-2.5 pointer-events-auto border transition-all relative overflow-hidden shadow-2xl ${
          isExiting ? 'animate-fluent-toast-exit' : 'animate-fluent-toast-enter'
        } ${
          isUrgent
            ? 'bg-[#18081a]/95 backdrop-blur-[32px] saturate-[180%] border-rose-500/50 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_24px_rgba(244,63,94,0.2)] text-white'
            : isLuckyDraw
            ? 'bg-[#1c1206]/95 backdrop-blur-[32px] saturate-[180%] border-amber-400/50 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_24px_rgba(245,158,11,0.2)] text-white'
            : 'bg-[#120824]/95 backdrop-blur-[32px] saturate-[180%] border-cyan-500/40 shadow-[0_20px_50px_rgba(0,0,0,0.8),0_0_24px_rgba(6,182,212,0.15)] text-white'
        }`}
      >
        <div className="flex items-start gap-3 w-full">
          {/* Icon Card */}
          <div
            className={`w-9 h-9 rounded-[2px] shrink-0 border flex items-center justify-center shadow-inner ${
              isUrgent
                ? 'bg-rose-500/20 text-rose-300 border-rose-400/50 ring-1 ring-rose-400/30'
                : isLuckyDraw
                ? 'bg-amber-500/20 text-amber-300 border-amber-400/50 ring-1 ring-amber-400/30'
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 ring-1 ring-cyan-400/30'
            }`}
          >
            {isUrgent ? (
              <AlertTriangle className="w-4 h-4 text-rose-300 animate-bounce" />
            ) : isLuckyDraw ? (
              <Trophy className="w-4 h-4 text-amber-300 animate-pulse" />
            ) : (
              <Megaphone className="w-4 h-4 text-cyan-300" />
            )}
          </div>

          {/* Message Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className={`font-mono font-bold uppercase tracking-wider text-[9px] sm:text-[10px] px-2 py-0.5 rounded-[2px] border flex items-center gap-1.5 ${
                  isUrgent
                    ? 'bg-rose-500/30 text-rose-200 border-rose-400/60 shadow-sm'
                    : isLuckyDraw
                    ? 'bg-amber-500/25 text-amber-200 border-amber-400/60 shadow-sm'
                    : 'bg-cyan-500/20 text-cyan-200 border-cyan-400/50 shadow-sm'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isUrgent ? 'bg-rose-400 animate-ping' : isLuckyDraw ? 'bg-amber-300 animate-pulse' : 'bg-cyan-400 animate-pulse'
                  }`}
                />
                {isUrgent
                  ? (localLanguage !== 'vi' ? 'HEADS UP!' : 'CHÚ Ý NHÉ!')
                  : isLuckyDraw
                  ? (localLanguage !== 'vi' ? 'LUCKY DRAW' : 'QUAY SỐ MAY MẮN')
                  : (localLanguage !== 'vi' ? 'FROM THE STAGE' : 'TIN TỪ SÂN KHẤU')}
              </span>
              <h4 className="font-bold text-xs uppercase tracking-wide truncate text-white/95 font-sans">
                {activeToast.title}
              </h4>
            </div>
            <p className="text-xs sm:text-[13px] font-medium leading-relaxed text-white/95 break-words">
              {activeToast.message}
            </p>
          </div>

          {/* Close Button */}
          <button
            type="button"
            onClick={() => handleDismiss(activeToast)}
            className="fluent-subtab-btn p-1.5 rounded-[2px] border border-transparent hover:border-white/20 hover:bg-white/15 transition shrink-0 text-white/70 hover:text-white cursor-pointer active:scale-95"
            title={localLanguage !== 'vi' ? 'Got it, close' : 'Đã rõ, đóng lại'}
            aria-label={localLanguage !== 'vi' ? 'Got it, close notification' : 'Đã rõ, đóng thông báo'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Fluent UI v2 Auto-dismiss Progress Bar */}
        <div className="w-full bg-white/10 rounded-[2px] h-[2px] overflow-hidden">
          <div
            className={`h-full ${
              isUrgent
                ? 'bg-gradient-to-r from-rose-500 to-[#F7CAC9]'
                : isLuckyDraw
                ? 'bg-gradient-to-r from-amber-400 to-yellow-200'
                : 'bg-gradient-to-r from-cyan-400 to-indigo-300'
            }`}
            style={{
              animation: `shrinkWidth ${isUrgent ? '5s' : '3s'} linear forwards`
            }}
          />
        </div>
      </div>
    </div>
  );
};

