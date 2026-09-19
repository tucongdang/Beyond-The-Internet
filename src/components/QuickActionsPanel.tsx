import React, { useState, useCallback } from 'react';
import { 
  RotateCcw, 
  Lock, 
  Unlock,
  Pause,
  Play,
  Trophy,
  Megaphone, 
  Zap, 
  X, 
  Radio, 
  CheckCircle2, 
  Users, 
  ChevronDown, 
  BellOff
} from 'lucide-react';
import { GameState } from '../types';
import { syncService } from '../services/syncService';
import { soundFx } from '../services/audioEffects';

interface QuickActionsPanelProps {
  gameState: GameState;
  activeCount: number;
  openConfirm: (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText?: string, 
    isDanger?: boolean
  ) => void;
  triggerHudToast: (keyLabel: string, actionDesc: string) => void;
  onClearCurrentResponses?: () => void;
  onClearAllResponses?: () => void;
  onLockVoting?: () => void;
  onOpenShortcuts?: () => void;
  className?: string;
  isCompact?: boolean;
}

const EMERGENCY_PRESETS迷 = [
  {
    title: '🚨 HIỆU LỆNH MC',
    text: 'Chú ý: Khán giả vui lòng hướng mắt về sân khấu và lắng nghe hiệu lệnh từ MC!',
    type: 'URGENT' as const,
  },
  {
    title: '⚠️ TẠM DỪNG HỘI Ý',
    text: 'Tạm dừng thi đấu: Ban Tổ Chức & Hội đồng Cố vấn đang tiến hành hội ý kết quả.',
    type: 'ALERT' as const,
  },
  {
    title: '⏱️ ĐẾM NGƯỢC NỘP BÀI',
    text: 'Sắp hết thời gian! Toàn bộ thí sinh và khán giả nhanh chóng chốt đáp án!',
    type: 'URGENT' as const,
  },
  {
    title: '🚫 KHÔNG TẢI LẠI TRANG',
    text: 'Khán giả vui lòng giữ nguyên kết nối, KHÔNG tải lại (F5) trang để tránh mất lượt.',
    type: 'ALERT' as const,
  },
  {
    title: '🏆 CHÚC MỪNG VÒNG THI',
    text: 'Chúc mừng tất cả thí sinh đã hoàn thành xuất sắc! Chuẩn bị đến vòng thi tiếp theo.',
    type: 'INFO' as const,
  }
];

export const QuickActionsPanel: React.FC<QuickActionsPanelProps> = ({
  gameState,
  activeCount,
  openConfirm,
  triggerHudToast,
  onClearCurrentResponses,
  onClearAllResponses,
  onLockVoting,
  className = '',
}) => {
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('🚨 THÔNG BÁO KHẨN TỪ BAN TỔ CHỨC');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastType, setBroadcastType] = useState<'URGENT' | 'ALERT' | 'INFO'>('URGENT');
  const [syncToMarquee, setSyncToMarquee] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isRecalling, setIsRecalling] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [lastActionFeedback, setLastActionFeedback] = useState<string | null>(null);

  // Helper vibration
  const triggerHaptic不易 = (pattern: number | number[] = 100) => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  };

  const showFeedback = (text: string) => {
    setLastActionFeedback(text);
    setTimeout(() => {
      setLastActionFeedback(null);
    }, 2800);
  };

  // ACTION 1: Pause / Resume Game Timer
  const handleTogglePauseTimer = useCallback(async () => {
    triggerHaptic不易(80);
    
    if (gameState.is_timer_paused) {
      // RESUME TIMER
      soundFx.playStartRound();
      const remainingToRestore不易 = typeof gameState.paused_remaining_seconds === 'number' && gameState.paused_remaining_seconds > 0
        ? gameState.paused_remaining_seconds 
        : (gameState.time_limit || 20);
      
      const newServerStartTime = syncService.getSynchronizedNow() - (((gameState.time_limit || 20) - remainingToRestore不易) * 1000);
      
      await syncService.updateGameState({
        is_timer_paused: false,
        paused_remaining_seconds: 0,
        server_start_time: newServerStartTime,
        status: 'ACTIVE'
      });
      
      triggerHudToast('RESUME', `Tiếp tục đếm ngược ở ${Math.ceil(remainingToRestore不易)}s`);
      showFeedback(`Đã tiếp tục đồng hồ (${Math.ceil(remainingToRestore不易)}s)`);
    } else if (gameState.status === 'ACTIVE') {
      // PAUSE RUNNING TIMER
      soundFx.playLock();
      const now = syncService.getSynchronizedNow();
      const elapsed = gameState.server_start_time ? Math.max(0, (now - gameState.server_start_time) / 1000) : 0;
      const remaining = Math.max(1, Math.ceil((gameState.time_limit || 20) - elapsed));

      await syncService.updateGameState({
        is_timer_paused: true,
        paused_remaining_seconds: remaining
      });

      triggerHudToast('PAUSE', `Đã đóng băng đồng hồ ở ${remaining}s`);
      showFeedback(`Đã tạm dừng đồng hồ ở ${remaining}s`);
    } else {
      // Game is in STANDBY / LOCKED
      soundFx.playClick();
      triggerHudToast('STANDBY', 'Đồng hồ chưa bắt đầu đếm (Chờ phát câu)');
      showFeedback('Đồng hồ đang ở trạng thái Chờ (Standby)');
    }
  }, [gameState.is_timer_paused, gameState.paused_remaining_seconds, gameState.server_start_time, gameState.status, gameState.time_limit, triggerHudToast]);

  // ACTION 2: Reset All Audience Scores (Global Leaderboard Reset)
  const handleQuickResetScores = useCallback(() => {
    triggerHaptic不易([120, 80, 150]);
    soundFx.playClick();

    openConfirm(
      'Xác nhận Reset Điểm Số Toàn Bộ?',
      'CẢNH BÁO: Hành động này sẽ xóa sạch TOÀN BỘ phản hồi và câu trả lời của mọi vòng thi, đưa điểm số của tất cả khán giả và bảng xếp hạng về 0.',
      async () => {
        soundFx.playClick();
        triggerHaptic不易(200);

        if (onClearAllResponses) {
          onClearAllResponses();
        } else {
          await syncService.clearResponses();
        }

        triggerHudToast('RESET SCORES', 'Đã xóa toàn bộ điểm số & đưa BXH về 0!');
        showFeedback('Đã reset toàn bộ điểm số về 0 thành công');
      },
      'Đồng ý Reset Điểm',
      true
    );
  }, [onClearAllResponses, openConfirm, triggerHudToast]);

  // ACTION 3: Toggle Lobby Lock (Lock / Unlock Audience Entrance)
  const handleToggleLobbyLock = useCallback(async () => {
    const nextState = !gameState.lobby_locked;
    triggerHaptic不易(nextState ? [150, 80, 150] : 100);
    
    if (nextState) {
      soundFx.playLock();
    } else {
      soundFx.playClick();
    }

    await syncService.updateGameState({
      lobby_locked: nextState
    });

    triggerHudToast(
      nextState ? 'LOBBY LOCKED' : 'LOBBY OPEN',
      nextState ? 'Đã khóa cổng tham gia khán giả!' : 'Đã mở cổng cho khán giả vào!'
    );
    showFeedback(nextState ? 'Đã khóa cổng tham gia (Lobby Locked)' : 'Đã mở cổng tham gia (Lobby Open)');
  }, [gameState.lobby_locked, triggerHudToast]);

  // ACTION 4: Reset câu hỏi hiện tại (Reset Current Question)
  const handleQuickResetQuestion = useCallback(() => {
    triggerHaptic不易([100, 50, 100]);
    soundFx.playClick();

    openConfirm(
      'Xác nhận Reset Câu Hỏi Hiện Tại?',
      `Hành động này sẽ xóa toàn bộ phản hồi của câu hỏi [${gameState.question_id || 'hiện tại'}] và đưa câu hỏi về trạng thái Chờ (Standby) để sẵn sàng thi đấu lại.`,
      async () => {
        soundFx.playClick();
        triggerHaptic不易(150);

        // 1. Clear responses of current question
        if (onClearCurrentResponses) {
          onClearCurrentResponses();
        } else if (gameState.question_id) {
          syncService.clearResponses(gameState.question_id);
        }

        // 2. Reset question state back to Standby & clear timers
        await syncService.updateGameState({
          status: 'STANDBY',
          correct_key: '',
          server_start_time: 0,
          is_timer_paused: false,
          paused_remaining_seconds: 0,
          eliminated_options: [],
          next_question_wait_limit: 0,
          next_question_wait_start: 0
        });

        triggerHudToast('RESET Q', `Đã reset câu hỏi [${gameState.question_id}] về trạng thái Chờ!`);
        showFeedback(`Đã reset câu [${gameState.question_id}] & xóa sạch phản hồi`);
      },
      'Đồng ý Reset',
      true
    );
  }, [gameState.question_id, onClearCurrentResponses, openConfirm, triggerHudToast]);

  // ACTION 5: Chốt đáp án ngay lập tức (Force Lock)
  const handleQuickForceLock喂 = useCallback(async () => {
    triggerHaptic不易([150, 80, 200]);
    soundFx.playLock();

    if (onLockVoting) {
      onLockVoting();
    } else {
      await syncService.updateGameState({
        status: 'LOCKED',
        server_start_time: 0,
        is_timer_paused: false,
        paused_remaining_seconds: 0,
        next_question_wait_limit: 0,
        next_question_wait_start: 0
      });
    }

    triggerHudToast('FORCE LOCK', 'Đã chốt khóa đáp án tức thì cho toàn bộ khán giả!');
    showFeedback('Đã chốt đáp án (Force Lock) thành công!');
  }, [onLockVoting, triggerHudToast]);

  // ACTION 6: Gửi thông báo khẩn tới toàn bộ thiết bị đang kết nối (Broadcast Urgent Notification)
  const handleOpenBroadcastModal = useCallback(() => {
    triggerHaptic不易(60);
    soundFx.playClick();
    setShowBroadcastModal(true);
  }, []);

  const handleSendUrgentBroadcast = useCallback(async (customMsg?: string, customTitle?: string, customType?: 'URGENT' | 'ALERT' | 'INFO') => {
    const finalMsg = (customMsg || broadcastMessage).trim();
    if (!finalMsg) return;

    const finalTitle = customTitle || broadcastTitle || '🚨 THÔNG BÁO KHẨN';
    const finalType专 = customType || broadcastType;

    setIsSending(true);
    triggerHaptic不易([200, 100, 200]);
    soundFx.playWarning();

    try {
      // 1. Send via real-time global notification
      await syncService.sendGlobalNotification(finalMsg, finalTitle, finalType专);

      // 2. Optionally sync with Marquee / Announcer overlay
      if (syncToMarquee) {
        await syncService.updateGameState({
          announcer_overlay: {
            id: `urgent_${Date.now()}`,
            text: `${finalTitle}: ${finalMsg}`,
            active: true,
            type: finalType专 === 'URGENT' ? 'URGENT' : finalType专 === 'ALERT' ? 'ALERT' : 'INFO',
            speed: 'NORMAL',
            repeat: true,
            updated_at: Date.now()
          }
        });
      }

      triggerHudToast('BROADCAST', `Đã phát thông báo khẩn tới ${activeCount} thiết bị kết nối!`);
      showFeedback(`Đã gửi thông báo khẩn tới ${activeCount} thiết bị`);
      setShowBroadcastModal(false);
      setBroadcastMessage('');
    } catch (err) {
      console.error('Failed to send urgent broadcast', err);
    } finally {
      setIsSending(false);
    }
  }, [broadcastMessage, broadcastTitle, broadcastType, syncToMarquee, activeCount, triggerHudToast]);

  // ACTION: Thu hồi toàn bộ thông báo khẩn & Tắt dải chữ chạy Marquee
  const handleRecallNotification = useCallback(async () => {
    setIsRecalling(true);
    triggerHaptic不易([150, 100]);
    soundFx.playClick();

    try {
      await syncService.recallGlobalNotifications();
      triggerHudToast('RECALL', 'Đã thu hồi thông báo khẩn & xóa khỏi toàn bộ thiết bị!');
      showFeedback('Đã thu hồi thông báo khẩn & tắt chữ chạy');
      setShowBroadcastModal(false);
    } catch (err) {
      console.error('Failed to recall notification', err);
    } finally {
      setIsRecalling(false);
    }
  }, [triggerHudToast]);

  const handleSelectPreset = (preset: typeof EMERGENCY_PRESETS迷[0]) => {
    triggerHaptic不易(40);
    soundFx.playClick();
    setBroadcastTitle(preset.title);
    setBroadcastMessage(preset.text);
    setBroadcastType(preset.type);
  };

  const isQuestionActive = gameState.status === 'ACTIVE';
  const isQuestionLocked = gameState.status === 'LOCKED';
  const isTimerPaused = !!gameState.is_timer_paused;
  const isLobbyLocked = !!gameState.lobby_locked;

  return (
    <>
      {/* Quick Actions Bar Container with Fluent UI v2 styling */}
      <div 
        id="admin-quick-actions-panel"
        className={`fluent-box border border-sky-500/30 bg-gradient-to-r from-slate-950/95 via-[#0c142c]/90 to-sky-950/90 shadow-xl shadow-sky-950/40 rounded-[4px] overflow-hidden transition-all duration-300 ${className}`}
      >
        {/* Header Ribbon */}
        <div className="px-3 py-2 sm:px-4 sm:py-2.5 flex items-center justify-between gap-2 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-[2px] bg-sky-500/20 border border-sky-400/40 flex items-center justify-center text-sky-300 shrink-0">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div className="flex items-center gap-2 truncate">
              <span className="text-xs font-bold font-mono uppercase tracking-wider text-white">
                Quick Actions • Tác Vụ Nhanh
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-[2px] bg-sky-950/80 text-sky-300 border border-sky-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Câu: <strong>{gameState.question_id || 'Chưa nạp'}</strong>
              </span>

              {/* Status Chips */}
              {isTimerPaused && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] bg-amber-950/90 text-amber-300 border border-amber-500/50 animate-pulse">
                  <Pause className="w-2.5 h-2.5" />
                  <span>ĐÃ TẠM DỪNG ĐỒNG HỒ ({gameState.paused_remaining_seconds || 0}s)</span>
                </span>
              )}

              {isLobbyLocked && (
                <span className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] bg-rose-950/90 text-rose-300 border border-rose-500/50">
                  <Lock className="w-2.5 h-2.5" />
                  <span>LOBBY LOCKED</span>
                </span>
              )}

              {gameState.announcer_overlay?.active && (
                <button
                  type="button"
                  onClick={handleRecallNotification}
                  disabled={isRecalling}
                  title="Đang phát thông báo khẩn - Bấm để thu hồi ngay"
                  className="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] bg-rose-950 text-rose-300 border border-rose-500/60 hover:bg-rose-900 transition active:scale-95 cursor-pointer animate-pulse"
                >
                  <BellOff className="w-3 h-3 text-rose-400" />
                  <span>ĐANG PHÁT TIN • THU HỒI</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {lastActionFeedback && (
              <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-2 py-0.5 rounded-[2px] animate-fadeIn flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                {lastActionFeedback}
              </span>
            )}

            <div className="flex items-center gap-1 text-[10px] font-mono text-white/50 px-2 py-0.5 bg-black/40 rounded-[2px] border border-white/10">
              <Users className="w-3 h-3 text-sky-400" />
              <strong className="text-sky-300 font-bold">{activeCount}</strong>
              <span className="hidden md:inline">thiết bị</span>
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 rounded-[2px] text-white/50 hover:text-white hover:bg-white/10 transition"
              title={isCollapsed ? 'Mở rộng Quick Actions' : 'Thu gọn Quick Actions'}
            >
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isCollapsed ? '-rotate-90' : ''}`} />
            </button>
          </div>
        </div>

        {/* Buttons Action Bento Grid: 6 One-Click Trigger Buttons */}
        {!isCollapsed && (
          <div className="p-2.5 sm:p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-2.5 animate-fadeIn">
            
            {/* ACTION 1: Pause / Resume Game Timer */}
            <button
              type="button"
              id="btn-quick-action-pause-timer"
              onClick={handleTogglePauseTimer}
              data-tooltip="Tạm dừng hoặc tiếp tục đếm ngược đồng hồ thi đấu hiện tại trong 1 click"
              data-tooltip-title="Tạm Dừng / Tiếp Tục Đồng Hồ (Pause Timer)"
              data-tooltip-variant="warning"
              className={`has-tooltip group relative flex items-center justify-between p-2.5 rounded-[2px] border transition-all active:scale-[0.98] cursor-pointer text-left select-none ${
                isTimerPaused
                  ? 'border-amber-400 bg-gradient-to-r from-amber-950/80 to-slate-900/90 text-amber-200 shadow-md shadow-amber-950/50 ring-1 ring-amber-400/50 animate-pulse'
                  : isQuestionActive
                    ? 'border-indigo-500/50 bg-gradient-to-r from-indigo-950/50 to-slate-900/70 hover:from-indigo-900/60 hover:to-indigo-950/60 text-indigo-200 hover:border-indigo-400 hover:shadow-lg hover:shadow-indigo-950/50'
                    : 'border-slate-700/50 bg-slate-900/40 text-white/60 hover:border-slate-500 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 transition-transform ${
                  isTimerPaused 
                    ? 'bg-amber-500 text-slate-950 shadow-md' 
                    : isQuestionActive
                      ? 'bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 group-hover:scale-105'
                      : 'bg-white/5 border border-white/10 text-white/40'
                }`}>
                  {isTimerPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white group-hover:text-indigo-200 truncate">
                      {isTimerPaused ? 'Tiếp Tục Giờ' : 'Tạm Dừng Giờ'}
                    </span>
                  </div>
                  <p className="text-[9px] text-white/50 truncate">
                    {isTimerPaused 
                      ? `Đang dừng (${gameState.paused_remaining_seconds || 0}s)` 
                      : isQuestionActive ? 'Đóng băng đếm ngược' : 'Chờ bắt đầu'}
                  </p>
                </div>
              </div>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border shrink-0 ${
                isTimerPaused
                  ? 'bg-amber-950 text-amber-300 border-amber-400/60'
                  : isQuestionActive
                    ? 'bg-indigo-950/80 text-indigo-300 border-indigo-500/30'
                    : 'bg-black/40 text-white/40 border-white/10'
              }`}>
                {isTimerPaused ? 'PAUSED' : isQuestionActive ? 'PAUSE' : 'STANDBY'}
              </span>
            </button>

            {/* ACTION 2: Toggle Lobby Lock */}
            <button
              type="button"
              id="btn-quick-action-toggle-lobby-lock"
              onClick={handleToggleLobbyLock}
              data-tooltip="Khóa hoặc mở cổng đăng ký tham gia của khán giả mới"
              data-tooltip-title="Khóa / Mở Cổng Tham Gia (Lobby Lock)"
              data-tooltip-variant="accent"
              className={`has-tooltip group relative flex items-center justify-between p-2.5 rounded-[2px] border transition-all active:scale-[0.98] cursor-pointer text-left select-none ${
                isLobbyLocked
                  ? 'border-rose-500/70 bg-gradient-to-r from-rose-950/80 to-slate-900/80 text-rose-200 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/40'
                  : 'border-purple-500/40 bg-gradient-to-r from-purple-950/40 to-slate-900/60 hover:from-purple-900/50 hover:to-purple-950/50 text-purple-200 hover:border-purple-400 hover:shadow-lg hover:shadow-purple-950/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 transition-transform ${
                  isLobbyLocked 
                    ? 'bg-rose-600 text-white shadow-md' 
                    : 'bg-purple-500/20 border border-purple-500/40 text-purple-300 group-hover:scale-105'
                }`}>
                  {isLobbyLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white group-hover:text-purple-200 truncate">
                      {isLobbyLocked ? 'Mở Cổng Vào' : 'Khóa Cổng Vào'}
                    </span>
                  </div>
                  <p className="text-[9px] text-white/50 truncate">
                    {isLobbyLocked ? 'Đang chặn đăng ký mới' : 'Cho phép vào tự do'}
                  </p>
                </div>
              </div>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border shrink-0 ${
                isLobbyLocked
                  ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                  : 'bg-purple-950/80 text-purple-300 border-purple-500/30'
              }`}>
                {isLobbyLocked ? 'LOCKED' : 'OPEN'}
              </span>
            </button>

            {/* ACTION 3: Reset Scores (Global Leaderboard Reset) */}
            <button
              type="button"
              id="btn-quick-action-reset-scores"
              onClick={handleQuickResetScores}
              data-tooltip="Xóa toàn bộ phản hồi & đưa bảng điểm của mọi khán giả về 0"
              data-tooltip-title="Reset Toàn Bộ Điểm Số (Reset Scores)"
              data-tooltip-variant="danger"
              className="has-tooltip group relative flex items-center justify-between p-2.5 rounded-[2px] border border-rose-500/40 bg-gradient-to-r from-rose-950/40 to-slate-900/60 hover:from-rose-900/50 hover:to-rose-950/50 text-rose-200 transition-all hover:border-rose-400 hover:shadow-lg hover:shadow-rose-950/50 active:scale-[0.98] cursor-pointer text-left select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[2px] bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0 group-hover:rotate-12 transition-transform">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white group-hover:text-rose-200 truncate">
                      Reset Điểm Số
                    </span>
                  </div>
                  <p className="text-[9px] text-white/50 truncate">
                    Đưa BXH & điểm về 0
                  </p>
                </div>
              </div>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-rose-950/80 text-rose-300 border border-rose-500/30 shrink-0">
                0 PTS
              </span>
            </button>

            {/* ACTION 4: Reset Câu Hỏi Hiện Tại */}
            <button
              type="button"
              id="btn-quick-action-reset-q"
              onClick={handleQuickResetQuestion}
              data-tooltip="Xóa sạch phản hồi và đưa câu hỏi về trạng thái Standby để chuẩn bị phát lại"
              data-tooltip-title="Reset Câu Hỏi Hiện Tại"
              data-tooltip-variant="warning"
              className="has-tooltip group relative flex items-center justify-between p-2.5 rounded-[2px] border border-amber-500/40 bg-gradient-to-r from-amber-950/40 to-slate-900/60 hover:from-amber-900/50 hover:to-amber-950/50 text-amber-200 transition-all hover:border-amber-400 hover:shadow-lg hover:shadow-amber-950/50 active:scale-[0.98] cursor-pointer text-left select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[2px] bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shrink-0 group-hover:rotate-[-45deg] transition-transform">
                  <RotateCcw className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white group-hover:text-amber-200 truncate">
                      Reset Câu Hỏi
                    </span>
                  </div>
                  <p className="text-[9px] text-white/50 truncate">
                    Xóa phản hồi câu này
                  </p>
                </div>
              </div>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-amber-950/80 text-amber-300 border border-amber-500/30 shrink-0">
                RESET Q
              </span>
            </button>

            {/* ACTION 5: Chốt Đáp Án Ngay Lập Tức (Force Lock) */}
            <button
              type="button"
              id="btn-quick-action-force-lock"
              onClick={handleQuickForceLock喂}
              data-tooltip="Khóa cổng nhận bình chọn tức thì cho tất cả khán giả và dừng đồng hồ đếm ngược"
              data-tooltip-title="Chốt Đáp Án Ngay (Force Lock)"
              data-tooltip-variant="danger"
              className={`has-tooltip group relative flex items-center justify-between p-2.5 rounded-[2px] border transition-all active:scale-[0.98] cursor-pointer text-left select-none ${
                isQuestionLocked
                  ? 'border-rose-500/70 bg-gradient-to-r from-rose-950/70 to-slate-900/80 text-rose-200 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/40'
                  : 'border-rose-500/40 bg-gradient-to-r from-rose-950/40 to-slate-900/60 hover:from-rose-900/50 hover:to-rose-950/50 text-rose-200 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-950/50'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-[2px] flex items-center justify-center shrink-0 transition-transform ${
                  isQuestionLocked
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'bg-rose-500/20 border border-rose-500/40 text-rose-300 group-hover:scale-105'
                }`}>
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white group-hover:text-rose-200 truncate">
                      Chốt Đáp Án
                    </span>
                    {isQuestionLocked && (
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                    )}
                  </div>
                  <p className="text-[9px] text-white/50 truncate">
                    {isQuestionLocked ? 'Đã chốt đáp án' : 'Khóa bình chọn tức thì'}
                  </p>
                </div>
              </div>
              <span className={`text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border shrink-0 ${
                isQuestionLocked
                  ? 'bg-rose-950 text-rose-300 border-rose-500/50'
                  : 'bg-rose-950/80 text-rose-300 border-rose-500/30'
              }`}>
                {isQuestionLocked ? 'LOCKED' : 'LOCK'}
              </span>
            </button>

            {/* ACTION 6: Gửi Thông Báo Khẩn (Urgent Broadcast) */}
            <button
              type="button"
              id="btn-quick-action-urgent-broadcast"
              onClick={handleOpenBroadcastModal}
              data-tooltip="Bật cửa sổ phát thông báo khẩn cấp tới toàn bộ điện thoại khán giả và màn chiếu sân khấu"
              data-tooltip-title="Gửi Thông Báo Khẩn (Broadcast)"
              data-tooltip-variant="accent"
              className="has-tooltip group relative flex items-center justify-between p-2.5 rounded-[2px] border border-cyan-500/40 bg-gradient-to-r from-cyan-950/40 to-slate-900/60 hover:from-cyan-900/50 hover:to-cyan-950/50 text-cyan-200 transition-all hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-950/50 active:scale-[0.98] cursor-pointer text-left select-none"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-[2px] bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 shrink-0 group-hover:animate-bounce">
                  <Megaphone className="w-3.5 h-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-white group-hover:text-cyan-200 truncate">
                      Thông Báo Khẩn
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  </div>
                  <p className="text-[9px] text-white/50 truncate">
                    Phát tin tới {activeCount} máy
                  </p>
                </div>
              </div>
              <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 shrink-0 flex items-center gap-1">
                <Radio className="w-2 h-2 text-cyan-400 animate-pulse" />
                ALL
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ================= URGENT BROADCAST CENTER MODAL ================= */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="fluent-box border border-cyan-500/50 bg-gradient-to-b from-slate-950 via-[#0a1226] to-[#040814] w-full max-w-xl rounded-[4px] shadow-2xl shadow-cyan-950/80 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-white/10 flex items-center justify-between bg-cyan-950/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[2px] bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-md shadow-cyan-950/50">
                  <Megaphone className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    Trung Tâm Phát Thông Báo Khẩn
                  </h3>
                  <p className="text-xs text-white/50">
                    Gửi cảnh báo tức thì kèm âm thanh & rung tới <strong className="text-cyan-300 font-mono font-bold">{activeCount} thiết bị</strong> đang kết nối
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="p-1.5 rounded-[2px] text-white/60 hover:text-white hover:bg-white/10 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Active Broadcast Alert & Instant Recall */}
              {gameState.announcer_overlay?.active && gameState.announcer_overlay?.text && (
                <div className="p-3 rounded-[2px] fluent-box-nested border border-rose-500/50 bg-rose-950/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-[2px] bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center justify-center shrink-0 mt-0.5">
                      <Radio className="w-3.5 h-3.5 animate-pulse" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-[10px] font-mono uppercase text-rose-300 font-bold block">
                        Đang phát sóng trực tiếp
                      </span>
                      <p className="text-xs text-white font-medium truncate">
                        {gameState.announcer_overlay.text}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleRecallNotification}
                    disabled={isRecalling}
                    className="px-3 py-1.5 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shrink-0 cursor-pointer shadow-md disabled:opacity-50"
                  >
                    <BellOff className="w-3.5 h-3.5" />
                    <span>{isRecalling ? 'Đang thu hồi...' : 'Thu hồi ngay'}</span>
                  </button>
                </div>
              )}

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 block">
                  Mẫu thông báo khẩn có sẵn (Click để chọn nhanh):
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {EMERGENCY_PRESETS迷.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="p-2 rounded-[2px] fluent-box-nested hover:fluent-box-nested text-left border border-white/10 hover:border-cyan-400/40 transition flex items-start gap-2 text-xs text-white/80 hover:text-white cursor-pointer"
                    >
                      <span className="shrink-0">{preset.title.split(' ')[0]}</span>
                      <div className="min-w-0">
                        <strong className="block text-[11px] text-cyan-300 truncate">
                          {preset.title.substring(preset.title.indexOf(' ') + 1)}
                        </strong>
                        <p className="text-[10px] text-white/50 line-clamp-1">
                          {preset.text}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Title Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 block">
                  Tiêu đề thông báo:
                </label>
                <input
                  type="text"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  placeholder="VD: 🚨 THÔNG BÁO KHẨN TỪ BAN TỔ CHỨC"
                  className="w-full px-3 py-2 rounded-[2px] bg-black/60 border border-white/15 text-white text-xs sm:text-sm font-medium focus:border-cyan-400 focus:outline-none"
                />
              </div>

              {/* Custom Message Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 block">
                  Nội dung thông báo phát sóng:
                </label>
                <textarea
                  rows={3}
                  value={broadcastMessage}
                  onChange={(e) => setBroadcastMessage(e.target.value)}
                  placeholder="Nhập nội dung thông báo gửi đến toàn bộ điện thoại khán giả và màn chiếu..."
                  className="w-full px-3 py-2 rounded-[2px] bg-black/60 border border-white/15 text-white text-xs sm:text-sm focus:border-cyan-400 focus:outline-none resize-none"
                />
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Notification Type */}
                <div className="space-y-1">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-white/60 block">
                    Mức độ ưu tiên:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(['URGENT', 'ALERT', 'INFO'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setBroadcastType(t)}
                        className={`py-1.5 px-2 rounded-[2px] text-[10px] font-mono font-bold transition text-center cursor-pointer border ${
                          broadcastType === t
                            ? t === 'URGENT'
                              ? 'bg-rose-600 text-white border-rose-400'
                              : t === 'ALERT'
                              ? 'bg-amber-600 text-white border-amber-400'
                              : 'bg-sky-600 text-white border-sky-400'
                            : 'fluent-box-nested text-white/50 border-white/10 hover:text-white'
                        }`}
                      >
                        {t === 'URGENT' ? 'Khẩn cấp' : t === 'ALERT' ? 'Cảnh báo' : 'Thông tin'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Marquee Sync Checkbox */}
                <div className="flex items-center gap-2 sm:pt-4">
                  <label className="flex items-center gap-2 text-xs text-white/80 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={syncToMarquee}
                      onChange={(e) => setSyncToMarquee(e.target.checked)}
                      className="w-4 h-4 rounded text-cyan-500 bg-black/50 border-white/20 focus:ring-cyan-400"
                    />
                    <span>Đồng bộ dải chữ chạy Marquee trên Màn Chiếu</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-white/10 flex items-center justify-end gap-2.5 bg-black/40">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-4 py-2 rounded-[2px] fluent-box-nested text-white/70 hover:text-white text-xs font-mono font-bold transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleSendUrgentBroadcast()}
                disabled={isSending || !broadcastMessage.trim()}
                className="px-5 py-2 rounded-[2px] bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition shadow-lg shadow-cyan-950/60 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>{isSending ? 'Đang phát sóng...' : 'Phát Thông Báo Ngay'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
