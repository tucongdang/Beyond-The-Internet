import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  FluentProvider, 
  TabList, 
  Tab 
} from './FluentTabs';
import { GameState, QuestionItem, UserResponse, RoundType, OptionKey, StageSnapshotRecord, QR_PALETTES, QrPaletteId, QrPaletteConfig, QrHistoryItem } from '../types';

const fluentDarkTransparentTheme = {};

import { INITIAL_QUESTION_BANK } from '../data/questionBank';
import { syncService, DEFAULT_GAME_STATE } from '../services/syncService';
import { soundFx } from '../services/audioEffects';
import { generateSPSSData, exportToCSV, exportToJSON, exportLeaderboardToCSV, normalizeVcnvAnswer } from '../utils/exportUtils';
import { calculateLeaderboard } from '../utils/leaderboardUtils';
import QRCode from 'qrcode';
import { HostPacingToaster,
  HostPacingWidget,
  PacingToastItem,
  HostPacingSettings
} from './HostPacingToaster';
import { GlobalTimerWidget } from './GlobalTimerWidget';
import { Leaderboard } from './Leaderboard';
import { NetworkStabilityChart } from './NetworkStabilityChart';
import { EmergencyPollControl } from './EmergencyPollControl';
import { AdminPollManager } from './AdminPollManager';
import { AnnouncerControlModal } from './AnnouncerControlModal';
import { PollHistoryTab } from './PollHistoryTab';
import { LuckyDrawAdmin } from './LuckyDrawAdmin';
import { LivePollDashboard } from './LivePollDashboard';
import { AudienceActivityFeed } from './AudienceActivityFeed';
import { AdminQAManager } from './AdminQAManager';
import { AdminChatManager } from './AdminChatManager';
import { ProjectorWordCloud } from './ProjectorWordCloud';
import { BroadcastSnapshotHistoryTab } from './BroadcastSnapshotHistoryTab';
import { AdminActivityLog } from './AdminActivityLog';
import { AdminContextMenu } from './AdminContextMenu';
import { AdminDashboard } from './AdminDashboard';
import { QuickActionsPanel } from './QuickActionsPanel';
import { ShortcutMappingModal } from './ShortcutMappingModal';
import { shortcutService } from '../services/shortcutService';
import { AudienceAnswerDistributionChart } from './AudienceAnswerDistributionChart';
import { FluentSearchBar } from './FluentSearchBar';
import { AdminGuide } from './AdminGuide';
import { snapshotService } from '../services/snapshotService';
import { ProjectorView } from './ProjectorView';
import { QrScanTrendsChart } from './QrScanTrendsChart';
import { CrossFadeQrCode } from './CrossFadeQrCode';
import { QrDiagnosticOverlay, QrDiagnosticData } from './QrDiagnosticOverlay';
import { Timer,  Shield,
  Activity,
  AlertOctagon,
  Wifi,
  WifiOff,
  Play,
  Lock,
  Eye,
  RotateCcw,
  Download,
  Users,
  Clock,
  Pause,
  PlusCircle,
  Plus,
  Trash2,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Flame,

  FileSpreadsheet,
  Layers,
  Sparkles,
  KeyRound,
  ExternalLink,
  ChevronDown,
  LayoutGrid,
  Zap,
  Target,
  BarChart,
  BarChart3,
  ListOrdered,
  Trophy,
  ListPlus,
  Edit,
  Edit3,
  Copy,
  Upload,
  Filter,
  Search,
  FileText,
  Check,
  Share2,
  X,
  Sliders,
  XCircle,
  HelpCircle,
  Keyboard, Globe,
  ChevronLeft,
  ChevronRight,
  Palette,
  Paintbrush,
  LogOut,
  Save,
  History,
  Heart,
  Maximize2,
  Minimize2,
  ZoomIn,
  ZoomOut,
  Type,
  ScanLine,
  TrendingUp
 , Monitor, MonitorOff, Volume2, Megaphone, MessageSquare, Cloud, Camera, BookOpen, LayoutDashboard , Settings } from 'lucide-react';
import { PROJECTOR_THEMES, getProjectorTheme } from '../utils/themeUtils';
import {
  vibrateTap,
  vibrateSubmit,
  vibrateSelection,
  vibrateSuccess,
  vibrateWarning,
  vibrateError,
  vibrateImpact,
  vibrateCopy,
  vibrateShare
} from '../utils/hapticUtils';

interface AdminPortalProps {
  gameState: GameState;
  activeCount: number;
  currentResponses: Record<string, UserResponse>;
  allResponses: Record<string, Record<string, UserResponse>>;
  isFirebaseConnected: boolean;
  onOpenFirebaseConfig: () => void;
  onViewChange?: (view: 'landing' | 'audience' | 'admin' | 'projector') => void;
  onLogout?: () => void;
}

const DEFAULT_ADMIN_PASSCODE = 'BTI2026Admin';

export const AdminPortal: React.FC<AdminPortalProps> = ({
  gameState,
  activeCount,
  currentResponses,
  allResponses,
  isFirebaseConnected,
  onOpenFirebaseConfig,
  onViewChange,
  onLogout
}) => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const notify = (message: string, intent: 'success' | 'warning' | 'error' = 'success') => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  };


  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('BTI2026_ADMIN_AUTH') === 'true';
  });
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Question selection & editing state
  const [questionBank, setQuestionBank] = useState<QuestionItem[]>(() => {
    const saved = localStorage.getItem('BTI2026_CUSTOM_QUESTION_BANK');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return INITIAL_QUESTION_BANK;
  });

  const [selectedBankId, setSelectedBankId] = useState<string>(questionBank[0]?.id || 'KDC_01');

  // Custom question editor modal/form
  const [isCreatingCustom, setIsCreatingCustom] = useState(false);
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [customRoundName, setCustomRoundName] = useState('Vòng 1: Khởi động chung');
  const [isCustomRoundMode, setIsCustomRoundMode] = useState(false);
  const [customRoundType, setCustomRoundType] = useState<RoundType>('MULTIPLE_CHOICE');
  const [customCategory, setCustomCategory] = useState('Miền IV: An toàn số');
  const [customQuestionId, setCustomQuestionId] = useState('KD_46');
  const [customQuestionText, setCustomQuestionText] = useState('');
  const [customMediaType, setCustomMediaType] = useState<'NONE' | 'IMAGE' | 'VIDEO' | 'AUDIO'>('NONE');
  const [customMediaUrl, setCustomMediaUrl] = useState('');
  const [customMediaAutoplay, setCustomMediaAutoplay] = useState(false);
  const [customOptionCount, setCustomOptionCount] = useState<number>(4);
  const [customOptionA, setCustomOptionA] = useState('');
  const [customOptionImageA, setCustomOptionImageA] = useState('');
  const [customOptionB, setCustomOptionB] = useState('');
  const [customOptionImageB, setCustomOptionImageB] = useState('');
  const [customOptionC, setCustomOptionC] = useState('');
  const [customOptionImageC, setCustomOptionImageC] = useState('');
  const [customOptionD, setCustomOptionD] = useState('');
  const [customOptionImageD, setCustomOptionImageD] = useState('');
  const [customOptionE, setCustomOptionE] = useState('');
  const [customOptionF, setCustomOptionF] = useState('');
  const [customOptionG, setCustomOptionG] = useState('');
  const [customOptionH, setCustomOptionH] = useState('');
  const [customOptionI, setCustomOptionI] = useState('');
  const [customOptionJ, setCustomOptionJ] = useState('');
  const [customCorrectKey, setCustomCorrectKey] = useState('A');
  const [customShortAnswerKey, setCustomShortAnswerKey] = useState('');
  const [customTimeLimit, setCustomTimeLimit] = useState(15);
  const [customExplanation, setCustomExplanation] = useState('');

  // Fluent UI Confirm Dialog State
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    content: string;
    confirmLabel: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    content: '',
    confirmLabel: 'Đồng ý',
    onConfirm: () => {}
  });

  const openConfirm = (title: string, content: string, onConfirm: () => void, confirmLabel = 'Đồng ý') => {
    setConfirmDialog({ isOpen: true, title, content, confirmLabel, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmDialog(prev => ({ ...prev, isOpen: false }));
  };

  // True/False 4 sub-statements in editor
  const [customTfA, setCustomTfA] = useState('');
  const [customTfB, setCustomTfB] = useState('');
  const [customTfC, setCustomTfC] = useState('');
  const [customTfD, setCustomTfD] = useState('');
  const [customTfKeyA, setCustomTfKeyA] = useState<'Đ' | 'S'>('Đ');
  const [customTfKeyB, setCustomTfKeyB] = useState<'Đ' | 'S'>('S');
  const [customTfKeyC, setCustomTfKeyC] = useState<'Đ' | 'S'>('S');
  const [customTfKeyD, setCustomTfKeyD] = useState<'Đ' | 'S'>('Đ');

  // Question bank tab filters & sorting
  const [qbCategoryFilter, setQbCategoryFilter] = useState<string>('ALL');
  const [qbSearchTerm, setQbSearchTerm] = useState<string>('');
  const [qbSortBy, setQbSortBy] = useState<'DEFAULT' | 'MOST_LIKED'>('DEFAULT');

  // Round 3 Auto-elimination state
  const [autoEliminateEvery10s, setAutoEliminateEvery10s] = useState<boolean>(false);

  // QR Code data URL & Live Access State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [audienceJoinUrl, setAudienceJoinUrl] = useState<string>('');
  const [isCopiedJoinUrl, setIsCopiedJoinUrl] = useState<boolean>(false);
  const [isLiveQrSectionCollapsed, setIsLiveQrSectionCollapsed] = useState<boolean>(false);
  const [adminQrSize, setAdminQrSize] = useState<number>(gameState.qr_code_size || 280);

  // Live QR Modal Auto-Close Timeout (Default 60 seconds of inactivity to protect live broadcast overlay)
  const [qrAutoCloseSeconds, setQrAutoCloseSeconds] = useState<number>(60);
  const [qrRemainingTime, setQrRemainingTime] = useState<number>(60);
  const [isQrTimeoutPaused, setIsQrTimeoutPaused] = useState<boolean>(false);

  // Live QR Custom Short Caption State
  const [adminQrCaption, setAdminQrCaption] = useState<string>(gameState.qr_custom_caption || '');

  // Live QR Code Modal Sub-Tabs ('active' | 'history' | 'trends')
  const [qrModalTab, setQrModalTab] = useState<'active' | 'history' | 'trends'>('active');
  const [showQrHistoryTab, setShowQrHistoryTab] = useState<boolean>(false);
  const [inspectHistoryItem, setInspectHistoryItem] = useState<QrHistoryItem | null>(null);
  
  const [showAdminQrDiagnostics, setShowAdminQrDiagnostics] = useState<boolean>(false);
  const [adminQrDiagnosticData, setAdminQrDiagnosticData] = useState<QrDiagnosticData>({
    status: 'idle',
    errorCode: 'ERR_NONE',
    errorMessage: null,
    targetUrl: '',
    generationLatencyMs: null,
    errorCorrectionLevel: 'H',
    resolutionPx: 560,
    paletteId: 'purple_gold',
    paletteDarkHex: '#1e1b4b',
    paletteLightHex: '#ffffff',
    isTransparent: false,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isFirebaseConnected: true,
    timestamp: Date.now(),
    urlByteLength: 0,
    qrVersionEstimate: 4
  });

  // Synchronize local caption when external/remote QR caption updates
  useEffect(() => {
    if (gameState.qr_custom_caption !== undefined && gameState.qr_custom_caption !== adminQrCaption) {
      setAdminQrCaption(gameState.qr_custom_caption);
    }
  }, [gameState.qr_custom_caption]);

  // Synchronize local slider state when external/remote QR size updates
  useEffect(() => {
    if (gameState.qr_code_size && gameState.qr_code_size !== adminQrSize) {
      setAdminQrSize(gameState.qr_code_size);
    }
  }, [gameState.qr_code_size]);

  // Safe Reset State Variables
  const [isDataExported, setIsDataExported] = useState(false);
  const [showResetCountdown, setShowResetCountdown] = useState(false);
  const [resetTimer, setResetTimer] = useState(10);
  const [isResetReady, setIsResetReady] = useState(false);

  // Countdown timer for safe reset
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (showResetCountdown && resetTimer > 0) {
      interval = setInterval(() => {
        setResetTimer((prev) => {
          if (prev <= 1) {
            setIsResetReady(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [showResetCountdown, resetTimer]);

  const handleCancelReset = () => {
    vibrateTap();
    setShowResetCountdown(false);
    setResetTimer(10);
    setIsResetReady(false);
  };

  const handleInitiateReset = () => {
    vibrateWarning();
    soundFx.playClick();
    setResetTimer(10);
    setIsResetReady(false);
    setShowResetCountdown(true);
  };

  const handleExecuteReset = async () => {
    if (!isResetReady) return;
    vibrateError();
    soundFx.playClick();
    
    try {
      // 1. Clear responses database
      await syncService.clearResponses();
      
      // 2. Reset the GameState to Default & bring viewers/projectors to Standby/Landing
      await syncService.updateGameState({
        ...DEFAULT_GAME_STATE,
        status: 'STANDBY',
        force_route: 'client_landing',
        force_route_ts: Date.now(),
        last_updated: Date.now()
      });

      notify('⚡ RESET THÀNH CÔNG! Đã xóa sạch điểm số và đưa khán giả & màn chiếu về Màn Hình Chờ.');
    } catch (err) {
      console.error('Failed to reset match database:', err);
      notify('Có lỗi xảy ra khi thực hiện Reset. Vui lòng kiểm tra kết nối mạng hoặc cấu hình Firebase!');
    } finally {
      // Clean up local safety state
      setIsDataExported(false);
      setShowResetCountdown(false);
      setResetTimer(10);
      setIsResetReady(false);
    }
  };

  // Global Keyboard Shortcuts modal & Live HUD Notification Toast
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [showEmergencyPollModal, setShowEmergencyPollModal] = useState(false);
  const [showAnnouncerModal, setShowAnnouncerModal] = useState(false);
  const [shortcutHudToast, setShortcutHudToast] = useState<{ text: string; key: string } | null>(null);

  // Fluent UI 2 Context Menu State
  const [contextMenuState, setContextMenuState] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
  }>({
    isOpen: false,
    x: 0,
    y: 0
  });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    // Don't intercept context menu inside text inputs or textareas where browser cut/copy/paste is needed
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') {
      return;
    }
    const fluentBox = target.closest('.fluent-box, .fluent-box-nested, #admin-portal-root');
    if (fluentBox) {
      e.preventDefault();
      vibrateTap();
      setContextMenuState({
        isOpen: true,
        x: e.clientX,
        y: e.clientY
      });
    }
  }, []);

  const handlePlaySoundEffect = useCallback((type: 'correct' | 'wrong' | 'start' | 'reveal' | 'pacing' | 'applause') => {
    if (type === 'correct' || type === 'reveal') {
      soundFx.playReveal(true);
    } else if (type === 'wrong') {
      soundFx.playError();
    } else if (type === 'start') {
      soundFx.playStartRound();
    } else if (type === 'pacing') {
      soundFx.playPacingChime('complete');
    } else if (type === 'applause') {
      soundFx.playCheerPop('CLAP');
    }
  }, []);

  const triggerHudToast = useCallback((keyLabel: string, actionDesc: string) => {
    setShortcutHudToast({ key: keyLabel, text: actionDesc });
  }, []);

  // Auto-dismiss HUD Toast after 2.2 seconds
  useEffect(() => {
    if (!shortcutHudToast) return;
    const timer = setTimeout(() => {
      setShortcutHudToast(null);
    }, 2200);
    return () => clearTimeout(timer);
  }, [shortcutHudToast]);

  // Reset countdown whenever Live QR Modal is opened
  useEffect(() => {
    if (gameState.show_qr) {
      setQrRemainingTime(qrAutoCloseSeconds);
      setIsQrTimeoutPaused(false);
    }
  }, [gameState.show_qr, qrAutoCloseSeconds]);

  // Inactivity countdown timer for Live QR Modal (Auto-closes modal after timeout to prevent broadcast overlay blockage)
  useEffect(() => {
    if (!gameState.show_qr || qrAutoCloseSeconds <= 0 || isQrTimeoutPaused) {
      return;
    }

    const timer = setInterval(() => {
      setQrRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          syncService.updateGameState({ show_qr: false });
          vibrateWarning();
          triggerHudToast(
            'TIMEOUT',
            `Đã tự động đóng Modal QR sau ${qrAutoCloseSeconds}s không hoạt động (bảo vệ sóng trực tiếp)!`
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.show_qr, qrAutoCloseSeconds, isQrTimeoutPaused, triggerHudToast]);

  // --- Auto Clear Responses on Question Switch ---
  const [autoClearResponses, setAutoClearResponses] = useState<boolean>(() => {
    const saved = localStorage.getItem('BTI2026_AUTO_CLEAR_RESPONSES_ON_SWITCH');
    if (saved !== null) {
      return saved === 'true';
    }
    return true; // Enabled by default so each question receives a clean voter board
  });

  const handleToggleAutoClearResponses = useCallback(() => {
    vibrateSelection();
    soundFx.playClick();
    setAutoClearResponses(prev => {
      const next = !prev;
      try {
        localStorage.setItem('BTI2026_AUTO_CLEAR_RESPONSES_ON_SWITCH', String(next));
      } catch {}
      triggerHudToast(
        'Shift + C',
        next ? 'Tự động xóa phản hồi khi đổi câu: ĐÃ BẬT' : 'Tự động xóa phản hồi khi đổi câu: ĐÃ TẮT'
      );
      return next;
    });
  }, [triggerHudToast]);

  // --- Host Pacing Alerts & Toast System ---
  const [pacingSettings, setPacingSettings] = useState<HostPacingSettings>(() => {
    const saved = localStorage.getItem('BTI2026_HOST_PACING_SETTINGS');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return {
      enabled: true,
      soundEnabled: true,
      minThreshold: 50,
      rushAlertEnabled: true
    };
  });

  const handleUpdatePacingSettings = useCallback((newSettings: Partial<HostPacingSettings>) => {
    setPacingSettings(prev => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem('BTI2026_HOST_PACING_SETTINGS', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const [pacingToasts, setPacingToasts] = useState<PacingToastItem[]>([]);
  const [recentPacingHistory, setRecentPacingHistory] = useState<PacingToastItem[]>([]);
  const triggeredMilestonesRef = useRef<Set<string>>(new Set());
  const currentSessionKeyRef = useRef<string>('');

  const handleDismissPacingToast = useCallback((id: string) => {
    setPacingToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const triggerPacingToast = useCallback((toast: Omit<PacingToastItem, 'id' | 'timestamp' | 'durationMs'>) => {
    if (!pacingSettings.enabled) return;
    if (toast.percent > 0 && toast.percent < pacingSettings.minThreshold && toast.type !== 'rush' && toast.type !== 'volume') return;

    const newToast: PacingToastItem = {
      ...toast,
      id: 'pacing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      timestamp: syncService.getSynchronizedNow(),
      durationMs: toast.type === '100' ? 6500 : 5000
    };

    if (pacingSettings.soundEnabled) {
      soundFx.playPacingChime(toast.level);
    }

    setPacingToasts(prev => [newToast, ...prev.slice(0, 2)]); // Keep max 3 toasts
    setRecentPacingHistory(prev => [newToast, ...prev.slice(0, 24)]);
  }, [pacingSettings]);

  // Monitor audience response volume and trigger real-time Pacing Toasts for Host
  useEffect(() => {
    return syncService.subscribeToAdminAlerts((msg) => {
      notify(msg, 'warning'); // Display the spam warning toast to Admin
    });
  }, []);

  useEffect(() => {
    const qId = gameState.question_id || 'UNKNOWN';
    const sessionKey = `${qId}_${gameState.server_start_time || 0}`;

    // Reset milestones if a new question or timer cycle starts
    if (currentSessionKeyRef.current !== sessionKey) {
      currentSessionKeyRef.current = sessionKey;
      triggeredMilestonesRef.current.clear();
    }

    // Only monitor and trigger during ACTIVE status
    if (gameState.status !== 'ACTIVE') return;

    const submittedCount = Object.keys(currentResponses || {}).length;
    if (submittedCount === 0) return;

    const effectiveTotal = Math.max(activeCount, submittedCount, 1);
    const percent = Math.round((submittedCount / effectiveTotal) * 100);
    const triggered = triggeredMilestonesRef.current;

    // Check 100% milestone
    if (percent >= 100 && !triggered.has('100')) {
      triggered.add('100');
      triggerPacingToast({
        questionId: qId,
        type: '100',
        title: '🎯 100% Khán Giả Đã Hoàn Tất!',
        message: `Toàn bộ phòng thi (${submittedCount}/${effectiveTotal}) đã nộp bài. Host có thể Khóa Vote ngay!`,
        percent: 100,
        count: submittedCount,
        total: effectiveTotal,
        level: 'complete'
      });
      return;
    }

    // Check 90% milestone
    if (percent >= 90 && !triggered.has('90')) {
      triggered.add('90');
      triggerPacingToast({
        questionId: qId,
        type: '90',
        title: '🚀 90% Khán Giả Đã Gửi Đáp Án',
        message: `Đã có ${submittedCount}/${effectiveTotal} người tham gia nộp bài. Đa số đã xong, sẵn sàng chốt đáp án.`,
        percent,
        count: submittedCount,
        total: effectiveTotal,
        level: 'high'
      });
      return;
    }

    // Check 75% milestone
    if (percent >= 75 && !triggered.has('75')) {
      triggered.add('75');
      triggerPacingToast({
        questionId: qId,
        type: '75',
        title: '🔥 75% Khán Giả Đã Nộp Bài',
        message: `Tiến độ trả lời rất tốt (${submittedCount}/${effectiveTotal}). Sắp đủ 100% phản hồi.`,
        percent,
        count: submittedCount,
        total: effectiveTotal,
        level: 'medium'
      });
      return;
    }

    // Check 50% milestone
    if (percent >= 50 && !triggered.has('50')) {
      triggered.add('50');
      triggerPacingToast({
        questionId: qId,
        type: '50',
        title: '⚡ 50% Khán Giả Đã Hoàn Thành',
        message: `Đã vượt mốc một nửa (${submittedCount}/${effectiveTotal}). Tiếp tục duy trì nhịp độ chương trình.`,
        percent,
        count: submittedCount,
        total: effectiveTotal,
        level: 'low'
      });
      return;
    }

    // Check Rush Alert (e.g., within 7s of start, >= 60% submissions with at least 4 responses)
    if (pacingSettings.rushAlertEnabled && gameState.server_start_time > 0) {
      const elapsedSec = (syncService.getSynchronizedNow() - gameState.server_start_time) / 1000;
      if (elapsedSec <= 7 && percent >= 60 && submittedCount >= 4 && !triggered.has('rush')) {
        triggered.add('rush');
        triggerPacingToast({
          questionId: qId,
          type: 'rush',
          title: '⚡ TỐC ĐỘ NỘP CỰC NHANH (RUSH)!',
          message: `${submittedCount} khán giả nộp trong ${Math.round(elapsedSec)} giây đầu. Host có thể linh hoạt khóa vote sớm!`,
          percent,
          count: submittedCount,
          total: effectiveTotal,
          level: 'medium'
        });
      }
    }
  }, [
    currentResponses,
    activeCount,
    gameState.status,
    gameState.question_id,
    gameState.server_start_time,
    triggerPacingToast,
    pacingSettings.rushAlertEnabled
  ]);

  // Search in data logs table
  const [searchTerm, setSearchTerm] = useState('');

  const [activeAdminTab, setActiveAdminTab] = useState<'DASHBOARD' | 'KDC' | 'VCNV' | 'TT' | 'VD' | 'QUESTIONS' | 'STATS' | 'POLL_HISTORY' | 'LUCKY_DRAW' | 'POLL_MANAGER' | 'QA_MANAGER' | 'CHAT_MANAGER' | 'WORD_CLOUD' | 'SNAPSHOTS' | 'ACTIVITY_LOG' | 'GUIDE'>('DASHBOARD');
  const [statsSubTab, setStatsSubTab] = useState<'LEADERBOARD' | 'SPSS' | 'NETWORK' | 'QR_TRENDS'>('LEADERBOARD');
  const [relaunchDraft, setRelaunchDraft] = useState<any>(null);
  const [showQuickNetworkMonitor, setShowQuickNetworkMonitor] = useState(false);
  const [vcnvInputKeyword, setVcnvInputKeyword] = useState('DEEPFAKE');
  const [vcnvClueTexts, setVcnvClueTexts] = useState<string[]>(['', '', '', '']);
  const [vcnvCenterStatus, setVcnvCenterStatus] = useState<boolean>(false);
  const [vcnvCenterVisible, setVcnvCenterVisible] = useState<boolean>(false);
  const [vcnvCenterText, setVcnvCenterText] = useState<string>('');

  // Stage Snapshot & Broadcast Records
  const projectorCaptureRef = useRef<HTMLDivElement>(null);
  const [isSnapping, setIsSnapping] = useState(false);
  const [snapshotFlash, setSnapshotFlash] = useState(false);
  const [snapshotCount, setSnapshotCount] = useState<number>(() => snapshotService.getSnapshots().length);

  const handleSnapAudienceInteraction = useCallback(async (customNote?: string, tag?: StageSnapshotRecord['broadcast_tag']) => {
    if (isSnapping) return null;
    setIsSnapping(true);
    vibrateImpact();
    soundFx.playCameraShutter();
    setSnapshotFlash(true);
    setTimeout(() => setSnapshotFlash(false), 300);

    try {
      const stageEl = projectorCaptureRef.current;
      if (stageEl) {
        const record = await snapshotService.captureAndSave(
          stageEl,
          gameState,
          currentResponses,
          activeCount,
          customNote,
          tag || (gameState.round_type === 'VCNV' ? 'VCNV' : gameState.emergency_poll ? 'POLL' : 'GENERAL')
        );
        if (record) {
          setSnapshotCount(snapshotService.getSnapshots().length);
          triggerHudToast('📸 SNAP', `Đã chụp khoảnh khắc [${record.question_id || 'STAGE'}] lưu vào Nhật ký phát sóng!`);
          return record;
        }
      }
    } catch (err) {
      console.error('Error snapping audience interaction:', err);
    } finally {
      setIsSnapping(false);
    }
    return null;
  }, [isSnapping, gameState, currentResponses, activeCount, triggerHudToast]);

  useEffect(() => {
    if (gameState.vcnv_clue_texts) setVcnvClueTexts(gameState.vcnv_clue_texts);
    if (typeof gameState.vcnv_center_status === 'boolean') setVcnvCenterStatus(gameState.vcnv_center_status);
    if (typeof gameState.vcnv_center_visible === 'boolean') setVcnvCenterVisible(gameState.vcnv_center_visible);
    if (gameState.vcnv_center_text) setVcnvCenterText(gameState.vcnv_center_text);
  }, [gameState.vcnv_clue_texts, gameState.vcnv_center_status, gameState.vcnv_center_visible, gameState.vcnv_center_text]);

  const handleUpdateClueText = (idx: number, val: string) => {
    const newTexts = [...vcnvClueTexts];
    newTexts[idx] = val;
    setVcnvClueTexts(newTexts);
    syncService.updateGameState({ vcnv_clue_texts: newTexts });
  };

  const handleToggleCenterBox = async () => {
    const newVal = !vcnvCenterVisible;
    soundFx.playClick();
    setVcnvCenterVisible(newVal);
    await syncService.updateGameState({ vcnv_center_visible: newVal });
  };

  const handleToggleCenterAnswer = async () => {
    const newVal = !vcnvCenterStatus;
    soundFx.playClick();
    setVcnvCenterStatus(newVal);
    await syncService.updateGameState({ vcnv_center_status: newVal });
  };

  const [vcnvSearch, setVcnvSearch] = useState('');

  // --- VCNV Telemetry & Distribution ---
  const vcnvAllSubmissions = useMemo(() => {
    if (activeAdminTab !== 'VCNV') return [];
    const list = Object.values(currentResponses as Record<string, UserResponse>);
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  }, [currentResponses, activeAdminTab]);

  const filteredVcnvSubmissions = useMemo(() => {
    if (!vcnvSearch.trim()) return vcnvAllSubmissions;
    const term = vcnvSearch.toLowerCase().trim();
    return vcnvAllSubmissions.filter(r => 
      r.user_info.name?.toLowerCase().includes(term) ||
      r.user_info.mssv?.toLowerCase().includes(term) ||
      r.choice?.toLowerCase().includes(term)
    );
  }, [vcnvAllSubmissions, vcnvSearch]);

  const vcnvWordDistribution = useMemo(() => {
    if (activeAdminTab !== 'VCNV') return [];
    const counts: Record<string, number> = {};
    Object.values(currentResponses as Record<string, UserResponse>).forEach(r => {
      const word = (r.choice || '').trim().toUpperCase();
      if (word) {
        counts[word] = (counts[word] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [currentResponses, activeAdminTab]);

  const top5Vcnv = useMemo(() => {
    if (activeAdminTab !== 'VCNV' || !gameState.vcnv_summary_active || !gameState.vcnv_keyword) return [];
    
    // Fuzzy matching with Vietnamese normalization
    const correctTarget = normalizeVcnvAnswer(gameState.vcnv_keyword);
    
    const correctResps = Object.values(currentResponses as Record<string, UserResponse>).filter((r: UserResponse) => {
      return normalizeVcnvAnswer(r.choice) === correctTarget;
    });
    
    // Sort by latency, then timestamp
    correctResps.sort((a: UserResponse, b: UserResponse) => {
      const latA = a.latency_sec ?? 999;
      const latB = b.latency_sec ?? 999;
      if (latA !== latB) return latA - latB;
      return a.timestamp - b.timestamp;
    });
    return correctResps.slice(0, 5);
  }, [currentResponses, gameState.vcnv_summary_active, gameState.vcnv_keyword, activeAdminTab]);

  // --- Risk Box (Ô Mạo Hiểm) Audience Predictions & Leaderboard ---
  const riskSubmissions = useMemo(() => {
    return Object.values((allResponses?.['VCNV_RISK'] || {}) as Record<string, UserResponse>);
  }, [allResponses]);

  const riskWordDistribution = useMemo(() => {
    if (activeAdminTab !== 'VCNV') return [];
    const counts: Record<string, number> = {};
    riskSubmissions.forEach(r => {
      const word = (r.choice || '').trim().toUpperCase();
      if (word) {
        counts[word] = (counts[word] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [riskSubmissions, activeAdminTab]);

  const top5Risk = useMemo(() => {
    if (activeAdminTab !== 'VCNV' || gameState.vcnv_risk_status !== 'REVEALED' || !gameState.vcnv_risk_answer) return [];
    const correctTarget = normalizeVcnvAnswer(gameState.vcnv_risk_answer);
    const correctResps = riskSubmissions.filter((r: UserResponse) => {
      return normalizeVcnvAnswer(r.choice) === correctTarget;
    });
    correctResps.sort((a: UserResponse, b: UserResponse) => {
      const latA = a.latency_sec ?? 999;
      const latB = b.latency_sec ?? 999;
      if (latA !== latB) return latA - latB;
      return a.timestamp - b.timestamp;
    });
    return correctResps.slice(0, 5);
  }, [riskSubmissions, gameState.vcnv_risk_status, gameState.vcnv_risk_answer, activeAdminTab]);

  // --- KDC Rapid Fire List ---
  const kdcQuestions = useMemo(() => questionBank.filter(q => q.round_name.includes('Khởi động') || q.id.startsWith('KDC')), [questionBank]);
  
  // --- VCNV (Audience Prediction Module & Risk Box) ---
  const handleToggleClue = async (idx: number) => {
    vibrateSelection();
    soundFx.playClick();
    const currentClues = gameState.vcnv_clues || [false, false, false, false];
    const newClues = [...currentClues];
    newClues[idx] = !newClues[idx];
    await syncService.updateGameState({ vcnv_clues: newClues });
  };
  
  // Step 1: Open submissions
  const handleVcnvOpen = async () => {
    vibrateImpact();
    soundFx.playClick();
    await syncService.updateGameState({
      vcnv_status: 'OPEN',
      vcnv_summary_active: false,
      vcnv_keyword: ''
    });
  };

  // Step 2: Lock submissions (pending/do not reveal answer yet)
  const handleVcnvLock = async () => {
    vibrateWarning();
    soundFx.playLock();
    await syncService.updateGameState({
      vcnv_status: 'LOCKED',
      vcnv_summary_active: false,
      vcnv_keyword: ''
    });
  };

  // Step 3: Reveal answer
  const handleVcnvReveal = async () => {
    if (!vcnvInputKeyword.trim()) {
      vibrateWarning();
      notify('Vui lòng nhập từ khóa Chướng Ngại Vật trước khi Công bố đáp án!');
      return;
    }
    vibrateSuccess();
    soundFx.playReveal();
    await syncService.updateGameState({
      vcnv_status: 'REVEALED',
      vcnv_summary_active: true,
      vcnv_keyword: vcnvInputKeyword.trim().toUpperCase()
    });
  };

  // Reset entire VCNV round
  const handleVcnvReset = async () => {
    openConfirm(
      'Xác nhận Reset VCNV',
      "⚠️ XÁC NHẬN RESET TOÀN BỘ VCNV:\n- Úp lại 4 hàng ngang và xóa nội dung đáp án hàng ngang\n- Tắt và xóa đáp án ô trung tâm\n- Reset trạng thái Ô Mạo Hiểm về ban đầu\n- Xóa câu trả lời dự đoán khán giả cho cả Ô Mạo Hiểm & Từ Khóa CNV (Giữ nguyên nhật ký Log)?",
      async () => {
        vibrateWarning();
        soundFx.playClick();
        setVcnvCenterVisible(false);
        setVcnvCenterStatus(false);
        setVcnvCenterText('');
        setVcnvInputKeyword('');
        setVcnvClueTexts(['', '', '', '']);

        await syncService.updateGameState({ 
          vcnv_status: 'IDLE',
          vcnv_summary_active: false, 
          vcnv_keyword: '',
          vcnv_clues: [false, false, false, false],
          vcnv_clue_texts: ['', '', '', ''],
          vcnv_center_visible: false,
          vcnv_center_status: false,
          vcnv_center_text: '',
          vcnv_risk_status: 'IDLE',
          vcnv_risk_branch: undefined,
          vcnv_risk_claimed_by: null,
          vcnv_risk_start_time: 0
        });
        await syncService.clearResponses(gameState.question_id || 'VCNV_01');
        await syncService.clearResponses('VCNV_RISK');
      },
      'Đồng ý Reset'
    );
  };

  // Risk Box (Ô Mạo Hiểm) Controls
  const [riskQuestionInput, setRiskQuestionInput] = useState(
    gameState.vcnv_risk_question || 'Gợi ý Ô Mạo Hiểm: Kỹ thuật sử dụng trí tuệ nhân tạo (AI / Deep Learning) để tổng hợp hoặc giả mạo hình ảnh, âm thanh, video khuôn mặt và giọng nói của người thật với độ chân thực cực cao.'
  );
  const [riskAnswerInput, setRiskAnswerInput] = useState(gameState.vcnv_risk_answer || 'DEEPFAKE');
  const [stageContestantName, setStageContestantName] = useState('Thí sinh số 1');

  // When a contestant presses the button (or Admin triggers contestant claim)
  const handleContestantPressRisk = async (customName?: string) => {
    const claimantName = (customName || stageContestantName || 'Thí sinh trên sân khấu').trim();
    vibrateImpact();
    soundFx.playReveal(true);
    await syncService.updateGameState({
      vcnv_status: 'IDLE',
      vcnv_risk_status: 'ACTIVE_ANSWER',
      vcnv_risk_start_time: syncService.getSynchronizedNow(),
      vcnv_risk_question: riskQuestionInput,
      vcnv_risk_answer: riskAnswerInput,
      vcnv_risk_claimed_by: {
        name: claimantName,
        mssv: 'SÂN KHẤU',
        uid: 'stage_contestant_' + Date.now(),
        timestamp: syncService.getSynchronizedNow()
      }
    });
  };

  
  const handleStart15sRiskBox = async () => {
    vibrateImpact();
    soundFx.playStartRound();
    await syncService.updateGameState({
      status: 'ACTIVE',
      server_start_time: syncService.getSynchronizedNow(),
      time_limit: 15,
      vcnv_clues: [false, false, false, false],
      vcnv_center_visible: false
    });
  };

  const handleRevealRiskBox = async () => {
    vibrateSuccess();
    soundFx.playReveal();
    await syncService.updateGameState({
      vcnv_risk_status: 'REVEALED',
      vcnv_risk_question: riskQuestionInput,
      vcnv_risk_answer: riskAnswerInput
    });
  };

  // Branch 1: Contestant answers Risk Box correctly AND predicts CNV right away (+120 pts for audience Risk Box)
  // Lật mở tất cả 4 hàng ngang (trừ ô trung tâm) & Công bố CNV
  const handleBranch1Win = async () => {
    const kw = (vcnvInputKeyword || gameState.vcnv_keyword || '').trim().toUpperCase();
    if (!kw) {
      vibrateWarning();
      notify('Vui lòng nhập từ khóa Chướng Ngại Vật trước khi thực hiện Nhánh 1!');
      return;
    }
    vibrateSuccess();
    soundFx.playReveal(true);
    await syncService.updateGameState({
      vcnv_risk_status: 'REVEALED',
      vcnv_risk_branch: 'BRANCH_1',
      vcnv_status: 'REVEALED',
      vcnv_summary_active: true,
      vcnv_clues: [true, true, true, true], // Lật mở tất cả 4 hàng ngang (trừ ô trung tâm)
      vcnv_keyword: kw,
      vcnv_risk_question: riskQuestionInput,
      vcnv_risk_answer: riskAnswerInput
    });
  };

  // Branch 2: Contestant failed Risk Box / didn't guess CNV -> Freeze Risk Box & continue round
  const handleBranch2Freeze = async () => {
    vibrateWarning();
    soundFx.playClick();
    await syncService.updateGameState({
      vcnv_risk_status: 'FROZEN',
      vcnv_risk_branch: 'BRANCH_2',
      vcnv_status: 'OPEN',
      vcnv_risk_question: riskQuestionInput,
      vcnv_risk_answer: riskAnswerInput
    });
  };

  const handleResetRiskBox = async () => {
    vibrateWarning();
    soundFx.playClick();
    await syncService.updateGameState({
      vcnv_risk_status: 'IDLE',
      vcnv_risk_claimed_by: null,
      vcnv_risk_start_time: 0
    });
    await syncService.clearResponses('VCNV_RISK');
  };

  
  useEffect(() => {
    if (gameState.status !== 'ACTIVE') return;
    if (!gameState.server_start_time) return; // Bảo vệ: Nếu chưa có thời gian bắt đầu thì không đếm
    const interval = setInterval(() => {
      const elapsed = (syncService.getSynchronizedNow() - gameState.server_start_time) / 1000;
      const remaining = Math.max(0, (gameState.time_limit || 20) - elapsed);
      if (remaining <= 0) {
        clearInterval(interval);
        handleLockVoting();
        triggerHudToast('TIME UP', 'Đã tự động khóa nhận đáp án');
      }
    }, 500);
    return () => clearInterval(interval);
  }, [gameState.status, gameState.server_start_time, gameState.time_limit]);

  // Generate QR code for mobile audience with diagnostic latency benchmarking
  const runAdminQrGenerationPass = useCallback(() => {
    if (typeof window === 'undefined') return;

    let audienceUrl = window.location.origin + window.location.pathname;
    if (audienceUrl.includes('ais-dev-')) {
      audienceUrl = audienceUrl.replace('ais-dev-', 'ais-pre-');
    }
    setAudienceJoinUrl(audienceUrl);
    const activePaletteId = (gameState.qr_color_palette as QrPaletteId) || 'purple_gold';
    const palette = QR_PALETTES[activePaletteId] || QR_PALETTES.purple_gold;
    const targetResolution = Math.max(360, (adminQrSize || 280) * 2);
    const isTransparent = Boolean(gameState.qr_transparent_bg);
    const qrTargetUrl = audienceUrl + (audienceUrl.includes('?') ? '&' : '?') + 'src=qr';
    const effectiveCaption = adminQrCaption || gameState.qr_custom_caption || '';
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const urlByteLen = new TextEncoder().encode(qrTargetUrl).length;

    let versionEst = 3;
    if (urlByteLen > 150) versionEst = 7;
    else if (urlByteLen > 100) versionEst = 5;
    else if (urlByteLen > 60) versionEst = 4;

    const startTime = performance.now();

    if (!qrTargetUrl || qrTargetUrl.trim() === '') {
      setAdminQrDiagnosticData({
        status: 'error',
        errorCode: 'ERR_PAYLOAD_EMPTY',
        errorMessage: 'Chuỗi địa chỉ URL đích rỗng hoặc không hợp lệ.',
        targetUrl: '',
        generationLatencyMs: 0,
        errorCorrectionLevel: 'H',
        resolutionPx: targetResolution,
        paletteId: activePaletteId,
        paletteDarkHex: palette.dark,
        paletteLightHex: isTransparent ? '#00000000' : palette.light,
        isTransparent,
        isOnline,
        isFirebaseConnected,
        timestamp: Date.now(),
        urlByteLength: 0,
        qrVersionEstimate: versionEst
      });
      return;
    }

    QRCode.toDataURL(qrTargetUrl, { 
      width: targetResolution, 
      margin: 2, 
      color: { 
        dark: palette.dark, 
        light: isTransparent ? '#00000000' : palette.light 
      },
      errorCorrectionLevel: 'H'
    })
      .then(url => {
        const renderTime = Math.round(performance.now() - startTime);
        setQrDataUrl(url);
        setAdminQrDiagnosticData({
          status: 'success',
          errorCode: 'ERR_NONE',
          errorMessage: null,
          targetUrl: qrTargetUrl,
          generationLatencyMs: renderTime,
          errorCorrectionLevel: 'H',
          resolutionPx: targetResolution,
          paletteId: activePaletteId,
          paletteDarkHex: palette.dark,
          paletteLightHex: isTransparent ? '#00000000' : palette.light,
          isTransparent,
          isOnline,
          isFirebaseConnected,
          timestamp: Date.now(),
          urlByteLength: urlByteLen,
          qrVersionEstimate: versionEst
        });

        // Automatically register into internal QR history (Last 5 generated QR codes with timestamps)
        const historyItem: QrHistoryItem = {
          id: `qr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          timestamp: Date.now(),
          palette: activePaletteId,
          paletteName: palette.labelVi,
          size: adminQrSize || 280,
          transparentBg: isTransparent,
          caption: effectiveCaption,
          url: qrTargetUrl,
          dataUrl: url
        };
        syncService.pushQrHistory(historyItem);
      })
      .catch(err => {
        const renderTime = Math.round(performance.now() - startTime);
        console.error('QR code generation error:', err);
        const errCode = !isOnline ? 'ERR_NETWORK_OFFLINE' : 'ERR_QR_RENDER_FAILED';
        setAdminQrDiagnosticData({
          status: 'error',
          errorCode: errCode,
          errorMessage: err?.message || 'Lỗi render canvas mã QR.',
          targetUrl: qrTargetUrl,
          generationLatencyMs: renderTime,
          errorCorrectionLevel: 'H',
          resolutionPx: targetResolution,
          paletteId: activePaletteId,
          paletteDarkHex: palette.dark,
          paletteLightHex: isTransparent ? '#00000000' : palette.light,
          isTransparent,
          isOnline,
          isFirebaseConnected,
          timestamp: Date.now(),
          urlByteLength: urlByteLen,
          qrVersionEstimate: versionEst
        });
      });
  }, [gameState.qr_color_palette, gameState.qr_transparent_bg, adminQrSize, adminQrCaption, gameState.qr_custom_caption, isFirebaseConnected]);

  // Trigger QR generation whenever settings change
  useEffect(() => {
    runAdminQrGenerationPass();
  }, [runAdminQrGenerationPass]);

  // Handler to restore a previous QR code configuration version from history
  const handleRestoreQrVersion = useCallback(async (item: QrHistoryItem) => {
    vibrateSelection();
    soundFx.playReveal(true);
    setAdminQrSize(item.size);
    setAdminQrCaption(item.caption || '');
    await syncService.restoreQrHistoryVersion(item);
    triggerHudToast('QR RESTORED', `Đã khôi phục phiên bản QR (${item.paletteName || item.palette}, ${item.size}px)!`);
  }, [triggerHudToast]);

  // Handler to clear QR history
  const handleClearQrHistory = useCallback(async () => {
    vibrateWarning();
    soundFx.playClick();
    await syncService.clearQrHistory();
    triggerHudToast('QR HISTORY', 'Đã xóa toàn bộ lịch sử tạo mã QR!');
  }, [triggerHudToast]);

  // Handlers for Estimated Scans Engagement Counter
  const handleResetScanCounter = useCallback(async () => {
    vibrateWarning();
    soundFx.playClick();
    await syncService.resetQrScanCount();
    triggerHudToast('RESET SCANS', 'Đã đặt lại bộ đếm lượt quét QR về 0!');
  }, [triggerHudToast]);

  const handleAdjustScanCounter = useCallback(async (delta: number) => {
    vibrateTap();
    soundFx.playClick();
    await syncService.adjustQrScanCount(delta);
    const newCount = Math.max(0, (Number(gameState.qr_scan_count) || 0) + delta);
    triggerHudToast('SCAN COUNTER', `${delta > 0 ? '+' : ''}${delta} lượt quét (Hiện có: ${newCount})`);
  }, [gameState.qr_scan_count, triggerHudToast]);

  // Handler to adjust QR size dynamically and persist to Firebase state
  const handleQrSizeChange = useCallback((newSize: number) => {
    setAdminQrSize(newSize);
    syncService.updateGameState({ qr_code_size: newSize });
  }, []);

  // Handler to toggle Transparent vs Solid Background for QR code
  const handleToggleQrTransparentBg = useCallback((forcedState?: boolean) => {
    vibrateSelection();
    soundFx.playClick();
    const nextState = forcedState !== undefined ? forcedState : !gameState.qr_transparent_bg;
    syncService.updateGameState({ qr_transparent_bg: nextState });
    triggerHudToast(
      'TRANSPARENCY',
      nextState 
        ? 'Đã BẬT Nền Trong Suốt (Alpha PNG) - Sẵn sàng cho OBS Overlay!' 
        : 'Đã đổi về Nền Đặc (Solid Background)!'
    );
  }, [gameState.qr_transparent_bg, triggerHudToast]);

  // Handler to dynamically toggle and persist QR color palette
  const handleSetQrPalette = useCallback((paletteId: QrPaletteId) => {
    vibrateSelection();
    soundFx.playClick();
    syncService.updateGameState({ qr_color_palette: paletteId });
    const pal = QR_PALETTES[paletteId] || QR_PALETTES.purple_gold;
    triggerHudToast('PALETTE', `Đã đổi bảng màu QR: ${pal.labelVi}`);
  }, [triggerHudToast]);

  // Reset inactivity countdown when user interacts with the QR modal
  const handleQrUserActivity = useCallback(() => {
    if (!isQrTimeoutPaused && qrAutoCloseSeconds > 0) {
      setQrRemainingTime(qrAutoCloseSeconds);
    }
  }, [isQrTimeoutPaused, qrAutoCloseSeconds]);

  // Handler to configure auto-close inactivity timeout (0, 30s, 60s, 120s)
  const handleSetQrTimeout = useCallback((seconds: number) => {
    vibrateSelection();
    soundFx.playClick();
    setQrAutoCloseSeconds(seconds);
    setQrRemainingTime(seconds);
    setIsQrTimeoutPaused(false);
    triggerHudToast(
      'TIMEOUT',
      seconds > 0
        ? `Đã đặt tự đóng QR sau ${seconds}s không hoạt động (bảo vệ màn hình live)`
        : 'Đã TẮT tự động đóng Modal QR (Hiển thị vô hạn)'
    );
  }, [triggerHudToast]);

  // Handler to toggle pause/resume on the inactivity countdown
  const handleToggleQrTimeoutPause = useCallback(() => {
    vibrateTap();
    soundFx.playClick();
    setIsQrTimeoutPaused((prev) => {
      const next = !prev;
      triggerHudToast('TIMEOUT', next ? 'Đã TẠM DỪNG đếm ngược tự đóng QR' : 'Đã TIẾP TỤC đếm ngược tự đóng QR');
      return next;
    });
  }, [triggerHudToast]);

  // Handler to update custom short caption for QR code
  const handleUpdateQrCaption = useCallback((newCaption: string) => {
    const trimmed = newCaption.slice(0, 60);
    setAdminQrCaption(trimmed);
    syncService.updateGameState({ qr_custom_caption: trimmed });
  }, []);

  // Handler to reset all QR code display settings to default production values
  const handleResetQrSettings = useCallback(() => {
    vibrateSelection();
    soundFx.playClick();
    const defaultSize = 280;
    const defaultPalette: QrPaletteId = 'purple_gold';
    const defaultTransparent = false;
    const defaultTimeout = 60;
    const defaultCaption = '';

    setAdminQrSize(defaultSize);
    setAdminQrCaption(defaultCaption);
    setQrAutoCloseSeconds(defaultTimeout);
    setQrRemainingTime(defaultTimeout);
    setIsQrTimeoutPaused(false);

    syncService.updateGameState({
      qr_code_size: defaultSize,
      qr_color_palette: defaultPalette,
      qr_transparent_bg: defaultTransparent,
      qr_custom_caption: defaultCaption,
    });
    triggerHudToast(
      'RESET',
      'Đã khôi phục cài đặt QR về mặc định (280px, Tím Hoàng Gia, Nền Đặc, Tự Đóng 60s, Xóa Caption)!'
    );
  }, [triggerHudToast]);

  // Handler to toggle Live Access QR Modal across all devices
  const handleToggleLiveQrModal = useCallback((forcedState?: boolean) => {
    vibrateSelection();
    soundFx.playClick();
    const nextState = forcedState !== undefined ? forcedState : !gameState.show_qr;
    syncService.updateGameState({ show_qr: nextState });
    triggerHudToast('Q', nextState ? 'Đã BẬT Modal QR toàn hệ thống' : 'Đã TẮT Modal QR toàn hệ thống');
  }, [gameState.show_qr, triggerHudToast]);

  // Handler to copy audience direct entry link
  const handleCopyAudienceLink = useCallback(() => {
    vibrateCopy();
    soundFx.playClick();
    if (audienceJoinUrl) {
      navigator.clipboard.writeText(audienceJoinUrl).then(() => {
        setIsCopiedJoinUrl(true);
        triggerHudToast('COPY', 'Đã sao chép link phòng thi khán giả!');
        setTimeout(() => setIsCopiedJoinUrl(false), 2000);
      }).catch(() => {
        setIsCopiedJoinUrl(true);
        setTimeout(() => setIsCopiedJoinUrl(false), 2000);
      });
    }
  }, [audienceJoinUrl, triggerHudToast]);

  // Handler to share audience link via native system sheet
  const handleNativeShareAudienceLink = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    vibrateShare();
    soundFx.playClick();
    try {
      await navigator.share({
        title: 'BTI 2026 - Đấu Trường Trực Tiếp',
        text: 'Tham gia đấu trường trực tiếp BEYOND THE INTERNET 2026 ngay bây giờ!',
        url: audienceJoinUrl || 'https://bti2026.app'
      });
      triggerHudToast('SHARE', 'Đã mở cửa sổ chia sẻ hệ thống');
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Lỗi khi chia sẻ:', err);
      }
    }
  }, [audienceJoinUrl, triggerHudToast]);

  // Handler to download QR Code PNG
  const handleDownloadQrPng = useCallback(() => {
    if (!qrDataUrl) return;
    vibrateSubmit();
    soundFx.playClick();
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `BTI2026_LiveAccess_QR_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '-')}.png`;
    link.click();
    triggerHudToast('QR', 'Đã tải ảnh mã QR xuống thiết bị!');
  }, [qrDataUrl, triggerHudToast]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === DEFAULT_ADMIN_PASSCODE || passcode === 'admin123') {
       vibrateSuccess();
       soundFx.playClick();
       setIsAuthenticated(true);
       sessionStorage.setItem('BTI2026_ADMIN_AUTH', 'true');
       setPasscodeError('');
    } else {
       vibrateError();
       setPasscodeError('Mật mã quản trị không chính xác');
    }
  };

  // Load question from Bank into Master Console
  const handleLoadQuestion = useCallback((qId: string, options?: { forceClear?: boolean }) => {
    const item = questionBank.find(q => q.id === qId);
    if (!item) return;

    vibrateTap();
    soundFx.playClick();
    setSelectedBankId(qId);

    // Auto-clear audience responses for this question if enabled or forced
    if (autoClearResponses || options?.forceClear) {
      syncService.clearResponses(item.id);
    }

    syncService.updateGameState({
      round_name: item.round_name,
      round_type: item.round_type,
      question_id: item.id,
      question_text: item.question_text,
      category: item.category,
      options: item.options,
      eliminated_options: [],
      time_limit: item.time_limit,
      status: 'STANDBY',
      correct_key: '', // Protected during active
      explanation: item.explanation,
      media_url: item.media_url || "",
      media_type: item.media_type || "NONE",
      media_autoplay: item.media_autoplay || false,
      server_start_time: 0
    });

    syncService.logActivity(
      'ADMIN_QUESTION_CHANGE',
      `Nạp câu hỏi: [${item.id}] ${item.round_name}`,
      `Ban Tổ Chức đã nạp câu hỏi ID "${item.id}" (${item.round_name}) với giới hạn ${item.time_limit}s.`,
      {
        category: 'ADMIN_CONTROL',
        question_id: item.id,
        round_id: item.round_name,
        time_limit: item.time_limit,
        round_type: item.round_type
      }
    );
  }, [questionBank, autoClearResponses]);

  // Master Step 1: Start Question
  const handleStartQuestion = useCallback(() => {
    vibrateImpact();
    soundFx.playStartRound();
    const item = questionBank.find(q => q.id === gameState.question_id);
    const startTs = syncService.getSynchronizedNow();

    syncService.updateGameState({
      status: 'ACTIVE',
      server_start_time: startTs,
      next_question_wait_limit: 0,
      next_question_wait_start: 0,
      correct_key: '', // Keep answer key secret
      explanation: item?.explanation || gameState.explanation
    });

    syncService.logActivity(
      'ADMIN_STATUS_CHANGE',
      `Mở đếm ngược nhận bài: [${gameState.question_id}]`,
      `Ban Tổ Chức đã kích hoạt trạng thái ACTIVE (Đếm ngược ${gameState.time_limit}s) cho câu hỏi ${gameState.question_id}.`,
      {
        category: 'ADMIN_CONTROL',
        question_id: gameState.question_id,
        round_id: gameState.round_name,
        new_status: 'ACTIVE',
        time_limit: gameState.time_limit,
        server_start_time: startTs
      }
    );
  }, [questionBank, gameState.question_id, gameState.round_name, gameState.time_limit, gameState.explanation]);

  // Master Step 2: Lock Voting
  const handleLockVoting = useCallback(() => {
    vibrateWarning();
    soundFx.playLock();
    syncService.updateGameState({
      status: 'LOCKED'
    });

    syncService.logActivity(
      'ADMIN_STATUS_CHANGE',
      `Khóa nhận bài: [${gameState.question_id}]`,
      `Ban Tổ Chức đã chốt khóa bài thi (LOCKED) cho câu hỏi ${gameState.question_id}.`,
      {
        category: 'ADMIN_CONTROL',
        question_id: gameState.question_id,
        round_id: gameState.round_name,
        new_status: 'LOCKED'
      }
    );
  }, [gameState.question_id, gameState.round_name]);

  // Master Step 3: Reveal Results
  const handleRevealResults = useCallback(() => {
    const item = questionBank.find(q => q.id === gameState.question_id);
    const correctKey = item?.correct_key || 'A';

    vibrateSuccess();
    soundFx.playReveal(true);
    syncService.updateGameState({
      status: 'REVEAL',
      correct_key: correctKey,
      explanation: item?.explanation || gameState.explanation
    });

    syncService.logActivity(
      'ADMIN_STATUS_CHANGE',
      `Công bố đáp án chính xác: [${gameState.question_id}] -> ${correctKey}`,
      `Ban Tổ Chức đã công bố đáp án chính xác là "${correctKey}" cho câu hỏi ${gameState.question_id} và tiến hành tính điểm.`,
      {
        category: 'ADMIN_CONTROL',
        question_id: gameState.question_id,
        round_id: gameState.round_name,
        new_status: 'REVEAL',
        correct_key: correctKey
      }
    );
  }, [questionBank, gameState.question_id, gameState.round_name, gameState.explanation]);

  // Master Step 4: Standby
  const handleReturnToStandby = useCallback(() => {
    vibrateTap();
    soundFx.playClick();
    syncService.updateGameState({
      status: 'STANDBY',
      correct_key: '',
      server_start_time: 0
    });

    syncService.logActivity(
      'ADMIN_STATUS_CHANGE',
      `Chuyển sang Chờ (STANDBY): [${gameState.question_id}]`,
      `Ban Tổ Chức đã đưa phòng thi về trạng thái chuẩn bị (STANDBY).`,
      {
        category: 'ADMIN_CONTROL',
        question_id: gameState.question_id,
        round_id: gameState.round_name,
        new_status: 'STANDBY'
      }
    );
  }, [gameState.question_id, gameState.round_name]);

  // Question Navigation (Next & Previous Question via Keyboard or Buttons)
  const handleNavigateNextQuestion = useCallback(() => {
    if (!questionBank || questionBank.length === 0) return;
    const currentIndex = questionBank.findIndex(q => q.id === gameState.question_id);
    let nextIndex = 0;
    if (currentIndex !== -1 && currentIndex < questionBank.length - 1) {
      nextIndex = currentIndex + 1;
    }
    const nextQ = questionBank[nextIndex];
    if (nextQ) {
      handleLoadQuestion(nextQ.id);
      triggerHudToast(
        '→ / N',
        `Nạp câu: [${nextQ.id}] ${nextQ.round_name}${autoClearResponses ? ' (Đã tự động xóa phản hồi)' : ''}`
      );
    }
  }, [questionBank, gameState.question_id, handleLoadQuestion, autoClearResponses, triggerHudToast]);

  const handleNavigatePrevQuestion = useCallback(() => {
    if (!questionBank || questionBank.length === 0) return;
    const currentIndex = questionBank.findIndex(q => q.id === gameState.question_id);
    let prevIndex = questionBank.length - 1;
    if (currentIndex > 0) {
      prevIndex = currentIndex - 1;
    }
    const prevQ = questionBank[prevIndex];
    if (prevQ) {
      handleLoadQuestion(prevQ.id);
      triggerHudToast(
        '← / P',
        `Nạp câu: [${prevQ.id}] ${prevQ.round_name}${autoClearResponses ? ' (Đã tự động xóa phản hồi)' : ''}`
      );
    }
  }, [questionBank, gameState.question_id, handleLoadQuestion, autoClearResponses, triggerHudToast]);

  // Master Spacebar Flow Cycle: Standby -> Active -> Locked -> Reveal -> Standby
  const handleCycleMasterState = useCallback(() => {
    if (gameState.status === 'STANDBY') {
      handleStartQuestion();
      triggerHudToast('SPACE', 'Bắt đầu câu hỏi (Active & Đếm ngược)');
    } else if (gameState.status === 'ACTIVE') {
      handleLockVoting();
      triggerHudToast('SPACE', 'Khóa nhận đáp án (Locked)');
    } else if (gameState.status === 'LOCKED') {
      handleRevealResults();
      triggerHudToast('SPACE', 'Công bố đáp án chính xác (Reveal)');
    } else if (gameState.status === 'REVEAL') {
      handleReturnToStandby();
      triggerHudToast('SPACE', 'Chuyển về Chế độ Chờ (Standby)');
    }
  }, [gameState.status, handleStartQuestion, handleLockVoting, handleRevealResults, handleReturnToStandby, triggerHudToast]);

  // Action: Toggle Pause / Resume Game Timer
  const handleTogglePauseTimer = useCallback(async () => {
    vibrateTap();
    if (gameState.is_timer_paused) {
      // Resume timer
      soundFx.playStartRound();
      const remainingToRestore = typeof gameState.paused_remaining_seconds === 'number' && gameState.paused_remaining_seconds > 0
        ? gameState.paused_remaining_seconds 
        : (gameState.time_limit || 20);
      
      const newServerStartTime = syncService.getSynchronizedNow() - (((gameState.time_limit || 20) - remainingToRestore) * 1000);
      
      await syncService.updateGameState({
        is_timer_paused: false,
        paused_remaining_seconds: 0,
        server_start_time: newServerStartTime,
        status: 'ACTIVE'
      });
      
      triggerHudToast('RESUME (2 / Space)', `Tiếp tục đếm ngược ở ${Math.ceil(remainingToRestore)}s`);
    } else if (gameState.status === 'ACTIVE') {
      // Pause running timer
      soundFx.playLock();
      const now = syncService.getSynchronizedNow();
      const elapsed = gameState.server_start_time ? Math.max(0, (now - gameState.server_start_time) / 1000) : 0;
      const remaining = Math.max(1, Math.ceil((gameState.time_limit || 20) - elapsed));

      await syncService.updateGameState({
        is_timer_paused: true,
        paused_remaining_seconds: remaining
      });

      triggerHudToast('PAUSE (2 / Space)', `Đã đóng băng đồng hồ ở ${remaining}s`);
    } else if (gameState.status === 'STANDBY') {
      // Start active if in standby
      handleStartQuestion();
      triggerHudToast('START (1 / Space)', 'Bắt đầu câu hỏi (Active)');
    }
  }, [gameState.is_timer_paused, gameState.paused_remaining_seconds, gameState.server_start_time, gameState.status, gameState.time_limit, handleStartQuestion, triggerHudToast]);

  // Action: Toggle Lobby Lock (Khóa / Mở Cổng Khán Giả)
  const handleToggleLobbyLock = useCallback(async () => {
    const nextState = !gameState.lobby_locked;
    if (nextState) {
      soundFx.playLock();
      vibrateImpact();
    } else {
      soundFx.playClick();
      vibrateTap();
    }
    await syncService.updateGameState({ lobby_locked: nextState });
    triggerHudToast(
      nextState ? 'LOBBY LOCKED (6)' : 'LOBBY OPEN (6)',
      nextState ? 'Đã khóa cổng tham gia khán giả!' : 'Đã mở cổng cho khán giả vào!'
    );
  }, [gameState.lobby_locked, triggerHudToast]);

  // Round 3 Dynamic Elimination toggler
  const handleToggleEliminateOption = (optKey: string) => {
    vibrateTap();
    soundFx.playClick();
    const currentList = gameState.eliminated_options || [];
    let updated: string[];
    if (currentList.includes(optKey)) {
      updated = currentList.filter(k => k !== optKey);
    } else {
      updated = [...currentList, optKey];
    }
    syncService.updateGameState({
      eliminated_options: updated
    });
  };

  // Round 3: Eliminate random 2 incorrect options
  const handleEliminateRandom2Options = useCallback(() => {
    const optionsObj = gameState.options || {};
    const allKeys = Object.keys(optionsObj);
    if (allKeys.length <= 2) return;

    const currentItem = questionBank.find(q => q.id === gameState.question_id);
    const correctKey = (currentItem?.correct_key || gameState.correct_key || '').toUpperCase();
    const currentEliminated = gameState.eliminated_options || [];

    // Candidates to eliminate: un-eliminated options that are NOT the correct key
    const candidates = allKeys.filter(k => k.toUpperCase() !== correctKey && !currentEliminated.includes(k));
    if (candidates.length === 0) return;

    // Pick up to 2 random candidates
    const shuffled = [...candidates].sort(() => 0.5 - Math.random());
    const toEliminate = shuffled.slice(0, 2);

    const updated = [...currentEliminated, ...toEliminate];
    vibrateImpact();
    soundFx.playLock();
    syncService.updateGameState({
      eliminated_options: updated
    });
  }, [gameState.options, gameState.question_id, gameState.correct_key, gameState.eliminated_options, questionBank]);

  // Clear current question responses
  const handleClearCurrentResponses = useCallback(() => {
    openConfirm(
      'Xác nhận Xóa Phản Hồi',
      `Bạn có chắc chắn muốn xóa toàn bộ phản hồi của câu ${gameState.question_id}?`,
      () => {
        soundFx.playClick();
        syncService.clearResponses(gameState.question_id);
        triggerHudToast('RESET', `Đã xóa sạch phản hồi của câu [${gameState.question_id}]!`);
      },
      'Đồng ý Xóa'
    );
  }, [gameState.question_id, triggerHudToast]);

  // Reset entire response database
  const handleClearAllResponses = useCallback(() => {
    openConfirm(
      'Cảnh báo Xóa Toàn Bộ',
      'CẢNH BÁO: Bạn có chắc chắn muốn xóa sạch TOÀN BỘ dữ liệu phản hồi của mọi câu hỏi?',
      () => {
        soundFx.playClick();
        syncService.clearResponses();
        triggerHudToast('RESET ALL', 'Đã xóa toàn bộ dữ liệu phản hồi trong hệ thống!');
      },
      'Xóa Tất Cả'
    );
  }, [triggerHudToast]);

  // Action: Master Modal Dismissal (Close any open dialogs / overlays / forms instantly)
  const handleCloseAllModals = useCallback(() => {
    let closedAny = false;

    if (confirmDialog.isOpen) {
      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
      closedAny = true;
    }
    if (isCreatingCustom) {
      setIsCreatingCustom(false);
      closedAny = true;
    }
    if (showShortcutsModal) {
      setShowShortcutsModal(false);
      closedAny = true;
    }
    if (showEmergencyPollModal) {
      setShowEmergencyPollModal(false);
      closedAny = true;
    }
    if (showAnnouncerModal) {
      setShowAnnouncerModal(false);
      closedAny = true;
    }
    if (showAdminQrDiagnostics) {
      setShowAdminQrDiagnostics(false);
      closedAny = true;
    }
    if (gameState.show_qr) {
      syncService.updateGameState({ show_qr: false });
      closedAny = true;
    }
    if (showResetCountdown) {
      setShowResetCountdown(false);
      closedAny = true;
    }
    if (showQuickNetworkMonitor) {
      setShowQuickNetworkMonitor(false);
      closedAny = true;
    }

    // Release focus from active input
    if (document.activeElement && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    if (closedAny) {
      vibrateTap();
      soundFx.playClick();
      triggerHudToast('ESC', 'Đã đóng hộp thoại & quay lại màn hình điều khiển chính');
    }

    return closedAny;
  }, [
    confirmDialog.isOpen,
    isCreatingCustom,
    showShortcutsModal,
    showEmergencyPollModal,
    showAnnouncerModal,
    showAdminQrDiagnostics,
    gameState.show_qr,
    showResetCountdown,
    showQuickNetworkMonitor,
    triggerHudToast
  ]);

  // Master Global Keyboard Shortcuts Listener
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if active element is an input / textarea / select / contentEditable
      const activeEl = document.activeElement;
      const isInputActive = Boolean(
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          activeEl.tagName === 'SELECT' ||
          (activeEl as HTMLElement).isContentEditable)
      );

      // Route through shortcut mapping service
      shortcutService.handleGlobalKeyDown(
        e,
        {
          togglePlayPauseTimer: handleTogglePauseTimer,
          cycleMasterState: handleCycleMasterState,
          startQuestion: handleStartQuestion,
          pauseResumeTimer: handleTogglePauseTimer,
          lockVoting: handleLockVoting,
          revealResults: handleRevealResults,
          returnToStandby: handleReturnToStandby,
          toggleLobbyLock: handleToggleLobbyLock,

          navigateNextQuestion: handleNavigateNextQuestion,
          navigatePrevQuestion: handleNavigatePrevQuestion,
          toggleLeaderboard: () => {
            const nextSummaryState = !gameState.show_summary;
            syncService.updateGameState({ show_summary: nextSummaryState });
            setActiveAdminTab('STATS');
            setStatsSubTab('LEADERBOARD');
            triggerHudToast('B', nextSummaryState ? 'Mở Bảng Tổng Kết (Leaderboard)' : 'Đóng Bảng Tổng Kết');
          },
          clearCurrentResponses: handleClearCurrentResponses,
          clearAllResponses: handleClearAllResponses,
          toggleAutoClearResponses: handleToggleAutoClearResponses,

          toggleQr: () => {
            syncService.updateGameState({ show_qr: !gameState.show_qr });
            triggerHudToast('Q', 'Mã QR Khán Giả');
          },
          toggleQrDiagnostics: () => {
            if (gameState.show_qr) {
              vibrateTap();
              soundFx.playClick();
              setShowAdminQrDiagnostics(prev => {
                const next = !prev;
                triggerHudToast('D', next ? 'Mở Chẩn Đoán QR' : 'Đóng Chẩn Đoán QR');
                return next;
              });
            }
          },
          openEmergencyPoll: () => {
            setShowEmergencyPollModal(prev => !prev);
            triggerHudToast('K', 'Khảo sát khẩn cấp (Emergency Poll)');
          },
          openAnnouncerModal: () => {
            setShowAnnouncerModal(prev => !prev);
            triggerHudToast('O / Shift+A', 'Phát thông báo chữ chạy (Announcer Overlay)');
          },
          openUrgentBroadcastModal: () => {
            triggerHudToast('M', 'Trung tâm phát thông báo khẩn');
          },
          toggleWordCloud: () => {
            const nextCloud = !gameState.show_word_cloud;
            syncService.updateGameState({ show_word_cloud: nextCloud });
            triggerHudToast('W', nextCloud ? 'Bật Đám Mây Từ Khóa Màn Chiếu' : 'Tắt Đám Mây Từ Khóa');
          },
          eliminateRandom2Options: () => {
            if (gameState.round_type === 'ELIMINATION_6' || activeAdminTab === 'TT') {
              handleEliminateRandom2Options();
              triggerHudToast('E', 'Loại trừ 2 phương án ngẫu nhiên');
            }
          },
          toggleTurboTimer: () => {
            if (
              gameState.round_type === 'ELIMINATION_6' ||
              gameState.round_type === 'SEQUENCING' ||
              activeAdminTab === 'TT' ||
              gameState.round_name?.includes('Tăng tốc') ||
              gameState.question_id?.startsWith('TT')
            ) {
              if (gameState.status === 'STANDBY') {
                handleStartQuestion();
                triggerHudToast('T', 'Bắt đầu đếm ngược Tăng Tốc');
              } else if (gameState.status === 'ACTIVE') {
                handleLockVoting();
                triggerHudToast('T', 'Khóa kết quả Tăng Tốc');
              }
            }
          },
          openShortcutsModal: () => {
            setShowShortcutsModal(prev => !prev);
          },
          closeModals: () => {
            handleCloseAllModals();
          },
          switchTab: (tabKey) => {
            setActiveAdminTab(tabKey as any);
            if (tabKey === 'VCNV') {
              const vcnvQ = questionBank.find(q => q.round_name.includes('Vượt Chướng Ngại Vật') || q.id.startsWith('VCNV'));
              if (vcnvQ && gameState.question_id !== vcnvQ.id) {
                handleLoadQuestion(vcnvQ.id);
              }
            } else if (tabKey === 'LUCKY_DRAW') {
              syncService.updateGameState({ active_module: 'LUCKY_DRAW' });
            }
          }
        },
        {
          triggerHudToast,
          isInputActive
        }
      );
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isAuthenticated,
    handleCloseAllModals,
    gameState.show_qr,
    gameState.show_summary,
    gameState.show_word_cloud,
    gameState.status,
    gameState.round_name,
    gameState.round_type,
    gameState.question_id,
    handleTogglePauseTimer,
    handleCycleMasterState,
    handleNavigateNextQuestion,
    handleNavigatePrevQuestion,
    handleStartQuestion,
    handleLockVoting,
    handleRevealResults,
    handleReturnToStandby,
    handleToggleLobbyLock,
    handleEliminateRandom2Options,
    handleLoadQuestion,
    handleToggleAutoClearResponses,
    handleClearCurrentResponses,
    handleClearAllResponses,
    questionBank,
    activeAdminTab,
    triggerHudToast,
    setStatsSubTab
  ]);

  // Helper to auto generate question code/ID based on round classification
  const generateNextQuestionId = useCallback((roundNameStr: string, bank: QuestionItem[]) => {
    let prefix = 'KD';
    const nameLower = roundNameStr.toLowerCase();

    if (nameLower.includes('khởi động chung') || nameLower.includes('kdc') || nameLower.includes('khởi động')) {
      prefix = 'KDC';
    } else if (nameLower.includes('chướng ngại vật') || nameLower.includes('vcnv')) {
      prefix = 'VCNV';
    } else if (nameLower.includes('tăng tốc') || nameLower.includes('tt')) {
      prefix = 'TT';
    } else if (nameLower.includes('về đích') || nameLower.includes('vd')) {
      prefix = 'VD';
    } else if (nameLower.includes('khảo sát') || nameLower.includes('phụ') || nameLower.includes('ks')) {
      prefix = 'KS';
    } else {
      const words = roundNameStr.trim().split(/\s+/).filter(Boolean);
      if (words.length >= 2) {
        prefix = words.map(w => w[0]).join('').toUpperCase().slice(0, 5);
      } else if (words.length === 1 && words[0].length >= 2) {
        prefix = words[0].slice(0, 4).toUpperCase();
      } else {
        prefix = 'Q';
      }
    }

    const existing = bank.filter(q => q.id.toUpperCase().startsWith(prefix.toUpperCase()));
    let maxNum = 0;
    existing.forEach(q => {
      const match = q.id.match(/[_ -]?(\d+)$/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      } else {
        if (existing.length > maxNum) maxNum = existing.length;
      }
    });

    const nextNum = maxNum + 1;
    const numStr = nextNum < 10 ? `0${nextNum}` : `${nextNum}`;
    return `${prefix}_${numStr}`;
  }, []);

  // Open Create Question Modal
  const handleOpenCreateQuestion = (prefillRound: string | any = 'Vòng 1: Khởi động chung', prefillType: RoundType = 'MULTIPLE_CHOICE') => {
    const roundName = typeof prefillRound === 'string' ? prefillRound : 'Vòng 1: Khởi động chung';
    const roundType = typeof prefillType === 'string' ? prefillType : 'MULTIPLE_CHOICE';

    const PRESET_LIST = ['Vòng 1: Khởi động chung', 'Vòng 1: Khởi động', 'Vòng 2: Vượt chướng ngại vật', 'Vòng 3: Tăng tốc', 'Vòng 4: Về đích', 'Khảo sát / Phụ'];
    setIsCustomRoundMode(!PRESET_LIST.includes(roundName));

    setEditingQuestionId(null);
    setCustomRoundName(roundName);
    setCustomRoundType(roundType);
    setCustomCategory('Miền IV: An toàn số');
    
    // Auto generate ID based on round name
    setCustomQuestionId(generateNextQuestionId(roundName, questionBank));

    setCustomQuestionText('');
    setCustomMediaType('NONE');
    setCustomMediaUrl('');
    setCustomMediaAutoplay(false);
    setCustomOptionCount(4);
    setCustomOptionA('');
    setCustomOptionImageA('');
    setCustomOptionB('');
    setCustomOptionImageB('');
    setCustomOptionC('');
    setCustomOptionImageC('');
    setCustomOptionD('');
    setCustomOptionImageD('');
    setCustomOptionE('');
    setCustomOptionF('');
    setCustomOptionG('');
    setCustomOptionH('');
    setCustomOptionI('');
    setCustomOptionJ('');
    setCustomCorrectKey('A');
    setCustomShortAnswerKey('');
    setCustomTfA('');
    setCustomTfB('');
    setCustomTfC('');
    setCustomTfD('');
    setCustomTfKeyA('Đ');
    setCustomTfKeyB('S');
    setCustomTfKeyC('S');
    setCustomTfKeyD('Đ');
    setCustomTimeLimit(15);
    setCustomExplanation('');
    setIsCreatingCustom(true);
  };

  // Open Edit Question Modal
  const handleOpenEditQuestion = (q: QuestionItem) => {
    const PRESET_LIST = ['Vòng 1: Khởi động chung', 'Vòng 1: Khởi động', 'Vòng 2: Vượt chướng ngại vật', 'Vòng 3: Tăng tốc', 'Vòng 4: Về đích', 'Khảo sát / Phụ'];
    setIsCustomRoundMode(!PRESET_LIST.includes(q.round_name));

    setEditingQuestionId(q.id);
    setCustomQuestionId(q.id);
    setCustomRoundName(q.round_name);
    setCustomRoundType(q.round_type);
    setCustomCategory(q.category);
    setCustomQuestionText(q.question_text);
    setCustomTimeLimit(q.time_limit || 15);
    setCustomExplanation(q.explanation || '');
    setCustomMediaType(q.media_type || 'NONE');
    setCustomMediaUrl(q.media_url || '');
    setCustomMediaAutoplay(Boolean(q.media_autoplay));

    const optKeysCount = Object.keys(q.options || {}).length;
    setCustomOptionCount(optKeysCount >= 2 ? optKeysCount : 4);

    if (q.round_type === 'TRUE_FALSE_4') {
      setCustomTfA(q.options?.a || '');
      setCustomTfB(q.options?.b || '');
      setCustomTfC(q.options?.c || '');
      setCustomTfD(q.options?.d || '');

      // Parse keys from correct_key e.g. a:Đ,b:S,c:S,d:Đ
      const matchA = q.correct_key.match(/a\s*:\s*([ĐSđsTFtf])/i);
      const matchB = q.correct_key.match(/b\s*:\s*([ĐSđsTFtf])/i);
      const matchC = q.correct_key.match(/c\s*:\s*([ĐSđsTFtf])/i);
      const matchD = q.correct_key.match(/d\s*:\s*([ĐSđsTFtf])/i);

      setCustomTfKeyA(matchA && (matchA[1].toUpperCase() === 'Đ' || matchA[1].toUpperCase() === 'T') ? 'Đ' : 'S');
      setCustomTfKeyB(matchB && (matchB[1].toUpperCase() === 'Đ' || matchB[1].toUpperCase() === 'T') ? 'Đ' : 'S');
      setCustomTfKeyC(matchC && (matchC[1].toUpperCase() === 'Đ' || matchC[1].toUpperCase() === 'T') ? 'Đ' : 'S');
      setCustomTfKeyD(matchD && (matchD[1].toUpperCase() === 'Đ' || matchD[1].toUpperCase() === 'T') ? 'Đ' : 'S');
    } else if (q.round_type === 'VCNV') {
      setCustomOptionA(q.options?.clue1 || '');
      setCustomOptionB(q.options?.clue2 || '');
      setCustomOptionC(q.options?.clue3 || '');
      setCustomOptionD(q.options?.clue4 || '');
      setCustomOptionE(q.options?.centerText || '');
      setCustomQuestionText(q.options?.riskQuestion || q.question_text || '');
      setCustomCorrectKey(q.correct_key || q.options?.riskAnswer || 'DEEPFAKE');
    } else if (q.round_type === 'SHORT_ANSWER') {
      setCustomShortAnswerKey(q.correct_key || '');
      setCustomCorrectKey(q.correct_key || '');
    } else if (q.round_type === 'SEQUENCING') {
      const optKeys = Object.keys(q.options || {});
      const count = Math.max(4, Math.min(10, optKeys.length || 4));
      setCustomOptionCount(count);
      setCustomOptionA(q.options?.A || '');
      setCustomOptionB(q.options?.B || '');
      setCustomOptionC(q.options?.C || '');
      setCustomOptionD(q.options?.D || '');
      setCustomOptionE(q.options?.E || '');
      setCustomOptionF(q.options?.F || '');
      setCustomOptionG(q.options?.G || '');
      setCustomOptionH(q.options?.H || '');
      setCustomOptionI(q.options?.I || '');
      setCustomOptionJ(q.options?.J || '');
      setCustomCorrectKey(q.correct_key || ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, count).join('-'));
    } else {
      setCustomOptionA(q.options?.A || '');
      setCustomOptionImageA(q.option_images?.A || '');
      setCustomOptionB(q.options?.B || '');
      setCustomOptionImageB(q.option_images?.B || '');
      setCustomOptionC(q.options?.C || '');
      setCustomOptionImageC(q.option_images?.C || '');
      setCustomOptionD(q.options?.D || '');
      setCustomOptionImageD(q.option_images?.D || '');
      setCustomOptionE(q.options?.E || '');
      setCustomOptionF(q.options?.F || '');
      setCustomCorrectKey(q.correct_key || 'A');
    }

    setIsCreatingCustom(true);
  };

  // Duplicate Question
  const handleDuplicateQuestion = (q: QuestionItem) => {
    const cloneId = `${q.id}_COPY_${Date.now().toString().slice(-3)}`;
    const cloned: QuestionItem = {
      ...q,
      id: cloneId,
      question_text: `[Bản sao] ${q.question_text}`
    };
    const updated = [...questionBank, cloned];
    setQuestionBank(updated);
    localStorage.setItem('BTI2026_CUSTOM_QUESTION_BANK', JSON.stringify(updated));
    soundFx.playClick();
  };

  // Delete Question
  const handleDeleteQuestion = (id: string) => {
    openConfirm(
      'Xác nhận Xóa Câu Hỏi',
      `Bạn có chắc chắn muốn xóa câu hỏi [${id}] khỏi ngân hàng?`,
      () => {
        const updated = questionBank.filter(q => q.id !== id);
        setQuestionBank(updated);
        localStorage.setItem('BTI2026_CUSTOM_QUESTION_BANK', JSON.stringify(updated));
        soundFx.playClick();
      },
      'Đồng ý Xóa'
    );
  };

  // Export Question Bank to JSON file
  const handleExportQuestionBankJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questionBank, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `BTI2026_QuestionBank_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    soundFx.playClick();
  };

  // Import Question Bank from JSON file
  const handleImportQuestionBankJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].question_text) {
          openConfirm(
            'Xác nhận Nạp Ngân Hàng',
            `Tìm thấy ${parsed.length} câu hỏi hợp lệ. Bạn muốn GHI ĐÈ toàn bộ ngân hàng câu hỏi hiện tại?`,
            () => {
              setQuestionBank(parsed);
              localStorage.setItem('BTI2026_CUSTOM_QUESTION_BANK', JSON.stringify(parsed));
              notify(`Đã nạp thành công ${parsed.length} câu hỏi vào ngân hàng!`);
              soundFx.playReveal();
            },
            'Ghi Đè Ngân Hàng'
          );
        } else {
          notify('Tệp JSON không đúng định dạng QuestionItem[] của chương trình!');
        }
      } catch (err) {
        notify('Lỗi đọc tệp JSON: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  // VCNV Package Handlers for Question Bank Tab
  const handleSyncVcnvStateToLive = async () => {
    soundFx.playClick();
    await syncService.updateGameState({
      vcnv_keyword: vcnvInputKeyword.trim().toUpperCase(),
      vcnv_clue_texts: vcnvClueTexts,
      vcnv_center_text: vcnvCenterText,
      vcnv_risk_question: riskQuestionInput,
      vcnv_risk_answer: riskAnswerInput.trim().toUpperCase()
    });
    notify('⚡ Đã đồng bộ gói VCNV lên Màn Chiếu & Trận Đấu thành công!');
  };

  const handleSaveVcnvToBank = () => {
    const kw = (vcnvInputKeyword || 'DEEPFAKE').trim().toUpperCase();
    const vcnvQuestionItem: QuestionItem = {
      id: 'VCNV_01',
      round_name: 'Vòng 2: Vượt Chướng Ngại Vật',
      round_type: 'VCNV',
      category: 'Quan sát & Giải mã từ khóa CNV',
      question_text: `Từ khóa Chướng Ngại Vật: ${kw}. Ô Mạo Hiểm: ${riskQuestionInput || ''}`,
      options: {
        clue1: vcnvClueTexts[0] || '',
        clue2: vcnvClueTexts[1] || '',
        clue3: vcnvClueTexts[2] || '',
        clue4: vcnvClueTexts[3] || '',
        centerText: vcnvCenterText || '',
        riskQuestion: riskQuestionInput || '',
        riskAnswer: (riskAnswerInput || kw).trim().toUpperCase()
      },
      correct_key: kw,
      explanation: `Từ khóa CNV chính thức: ${kw}. Đáp án Ô Mạo Hiểm: ${riskAnswerInput}`,
      time_limit: 60
    };

    const existingIdx = questionBank.findIndex(q => q.id === 'VCNV_01' || q.round_type === 'VCNV');
    let updatedBank: QuestionItem[];
    if (existingIdx >= 0) {
      updatedBank = questionBank.map((q, idx) => idx === existingIdx ? vcnvQuestionItem : q);
    } else {
      updatedBank = [vcnvQuestionItem, ...questionBank];
    }
    setQuestionBank(updatedBank);
    localStorage.setItem('BTI2026_CUSTOM_QUESTION_BANK', JSON.stringify(updatedBank));
    soundFx.playClick();
    notify('💾 Đã lưu thành công gói VCNV vào Ngân hàng câu hỏi (VCNV_01)!');
  };

  const handleApplyVcnvItemToLive = (q: QuestionItem) => {
    const kw = (q.correct_key || q.options?.riskAnswer || 'DEEPFAKE').trim().toUpperCase();
    const clues = [
      q.options?.clue1 || '',
      q.options?.clue2 || '',
      q.options?.clue3 || '',
      q.options?.clue4 || ''
    ];
    const center = q.options?.centerText || '';
    const rQ = q.options?.riskQuestion || q.question_text || '';
    const rA = (q.options?.riskAnswer || kw).trim().toUpperCase();

    setVcnvInputKeyword(kw);
    setVcnvClueTexts(clues);
    setVcnvCenterText(center);
    setRiskQuestionInput(rQ);
    setRiskAnswerInput(rA);

    syncService.updateGameState({
      question_id: q.id,
      vcnv_keyword: kw,
      vcnv_clue_texts: clues,
      vcnv_center_text: center,
      vcnv_risk_question: rQ,
      vcnv_risk_answer: rA
    });
    soundFx.playClick();
    notify(`⚡ Đã nạp thành công gói VCNV [${q.id}] lên Trận đấu!`);
  };

  // Reset to default standard question bank (45 KD + 4 TT + VD)
  const handleResetDefaultQuestionBank = () => {
    openConfirm(
      'Khôi Phục Mặc Định',
      'Khôi phục lại Bộ câu hỏi chuẩn Ban Tổ Chức (Gồm đầy đủ 45 câu Khởi động, 4 câu Tăng tốc và phần Về đích)? Các câu tùy biến thêm vào sẽ bị xóa.',
      () => {
        setQuestionBank(INITIAL_QUESTION_BANK);
        localStorage.setItem('BTI2026_CUSTOM_QUESTION_BANK', JSON.stringify(INITIAL_QUESTION_BANK));
        soundFx.playStartRound();
        notify('Đã khôi phục thành công Bộ câu hỏi chuẩn BTI 2026!');
      },
      'Đồng ý Khôi phục'
    );
  };

  // Save custom question (Create / Update)
  const handleSaveCustomQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customQuestionText.trim()) {
      notify('Vui lòng nhập nội dung câu hỏi!');
      return;
    }

    const targetId = editingQuestionId || customQuestionId.trim() || `Q_${Date.now().toString().slice(-4)}`;

    let opts: Record<string, string> = {};
    let optImgs: Record<string, string> = {};
    let calculatedCorrectKey = customCorrectKey;

    if (customRoundType === 'TRUE_FALSE_4') {
      opts = {
        a: customTfA.trim() || 'Nhận định a',
        b: customTfB.trim() || 'Nhận định b',
        c: customTfC.trim() || 'Nhận định c',
        d: customTfD.trim() || 'Nhận định d'
      };
      calculatedCorrectKey = `a:${customTfKeyA},b:${customTfKeyB},c:${customTfKeyC},d:${customTfKeyD}`;
    } else if (customRoundType === 'VCNV') {
      opts = {
        clue1: customOptionA.trim(),
        clue2: customOptionB.trim(),
        clue3: customOptionC.trim(),
        clue4: customOptionD.trim(),
        centerText: customOptionE.trim(),
        riskQuestion: customQuestionText.trim(),
        riskAnswer: customCorrectKey.trim().toUpperCase()
      };
      calculatedCorrectKey = customCorrectKey.trim().toUpperCase();
    } else if (customRoundType === 'SHORT_ANSWER' || customRoundType === 'FILL_IN_BLANK') {
      opts = {};
      calculatedCorrectKey = (customShortAnswerKey || customCorrectKey).trim().toUpperCase();
    } else if (customRoundType === 'SEQUENCING') {
      const allOptKeys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, customOptionCount);
      const allOptVals: Record<string, string> = {
        A: customOptionA, B: customOptionB, C: customOptionC, D: customOptionD, E: customOptionE,
        F: customOptionF, G: customOptionG, H: customOptionH, I: customOptionI, J: customOptionJ
      };
      allOptKeys.forEach(k => {
        if (allOptVals[k]?.trim()) {
          opts[k] = allOptVals[k].trim();
        }
      });
      const defaultSeqKey = allOptKeys.join('-');
      calculatedCorrectKey = (customCorrectKey || defaultSeqKey).trim().toUpperCase().replace(/[\s,]+/g, '-');
    } else if (customRoundType === 'TRUE_FALSE') {
      opts = { A: customOptionA.trim() || 'Đúng', B: customOptionB.trim() || 'Sai' };
      calculatedCorrectKey = customCorrectKey.toUpperCase();
    } else if (customRoundType === 'MULTIPLE_CHOICE' || customRoundType === 'IMAGE_POLL') {
      if (customOptionA.trim()) opts.A = customOptionA.trim();
      if (customOptionImageA.trim()) optImgs.A = customOptionImageA.trim();
      
      if (customOptionB.trim()) opts.B = customOptionB.trim();
      if (customOptionImageB.trim()) optImgs.B = customOptionImageB.trim();
      
      if (customOptionCount >= 3 && customOptionC.trim()) opts.C = customOptionC.trim();
      if (customOptionCount >= 3 && customOptionImageC.trim()) optImgs.C = customOptionImageC.trim();
      
      if (customOptionCount >= 4 && customOptionD.trim()) opts.D = customOptionD.trim();
      if (customOptionCount >= 4 && customOptionImageD.trim()) optImgs.D = customOptionImageD.trim();
      calculatedCorrectKey = customCorrectKey.toUpperCase();
    } else if (customRoundType === 'ELIMINATION_6') {
      if (customOptionA.trim()) opts.A = customOptionA.trim();
      if (customOptionB.trim()) opts.B = customOptionB.trim();
      if (customOptionC.trim()) opts.C = customOptionC.trim();
      if (customOptionD.trim()) opts.D = customOptionD.trim();
      if (customOptionE.trim()) opts.E = customOptionE.trim();
      if (customOptionF.trim()) opts.F = customOptionF.trim();
      calculatedCorrectKey = customCorrectKey.toUpperCase();
    } else {
      if (customOptionA.trim()) opts.A = customOptionA.trim();
      if (customOptionB.trim()) opts.B = customOptionB.trim();
      if (customOptionC.trim()) opts.C = customOptionC.trim();
      if (customOptionD.trim()) opts.D = customOptionD.trim();
      calculatedCorrectKey = customCorrectKey.toUpperCase();
    }

    const newQ: QuestionItem = {
      id: targetId,
      round_name: customRoundName.trim() || 'Vòng tùy chỉnh',
      round_type: customRoundType,
      category: customCategory,
      question_text: customQuestionText,
      options: opts,
      option_images: Object.keys(optImgs).length > 0 ? optImgs : undefined,
      correct_key: calculatedCorrectKey,
      explanation: customExplanation || 'Giải thích chuẩn theo Thông tư 02 và Luật ANM 2018.',
      time_limit: Number(customTimeLimit) || 15,
      media_type: customRoundType === 'VCNV' ? 'NONE' : customMediaType,
      media_url: customRoundType === 'VCNV' ? '' : customMediaUrl,
      media_autoplay: customRoundType === 'VCNV' ? false : (customMediaType !== 'NONE' && customMediaAutoplay)
    };

    let updatedBank: QuestionItem[];
    if (editingQuestionId) {
      updatedBank = questionBank.map(q => q.id === editingQuestionId ? newQ : q);
    } else {
      updatedBank = [...questionBank, newQ];
    }

    setQuestionBank(updatedBank);
    localStorage.setItem('BTI2026_CUSTOM_QUESTION_BANK', JSON.stringify(updatedBank));
    setIsCreatingCustom(false);
    setEditingQuestionId(null);
    soundFx.playClick();
    handleLoadQuestion(newQ.id);
  };

  // SPSS tabular rows
  const spssRows = useMemo(() => {
    return generateSPSSData(allResponses, questionBank, gameState);
  }, [allResponses, questionBank, gameState]);

  const filteredSpssRows = useMemo(() => {
    if (!searchTerm.trim()) return spssRows;
    const term = searchTerm.toLowerCase();
    return spssRows.filter(
      r =>
        r.FullName.toLowerCase().includes(term) ||
        r.MSSV.toLowerCase().includes(term) ||
        r.UID.toLowerCase().includes(term) ||
        r.Question_ID.toLowerCase().includes(term) ||
        (r.Question_Text && r.Question_Text.toLowerCase().includes(term))
    );
  }, [spssRows, searchTerm]);

  // Export current game session all responses to CSV (SPSS / Excel format)
  const handleExportSessionCSV = () => {
    vibrateCopy();
    soundFx.playClick();
    if (spssRows.length === 0) {
      notify('Chưa có dữ liệu phản hồi nào được ghi nhận trong phiên đấu này để xuất CSV!');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `BTI2026_GameSession_Responses_${timestamp}.csv`;
    exportToCSV(spssRows, filename);
    setIsDataExported(true);
    triggerHudToast('CSV', `Đã xuất ${spssRows.length} dòng dữ liệu phản hồi CSV thành công!`);
  };

  // Export aggregated audience leaderboard summary to CSV
  const handleExportLeaderboardCSV = () => {
    vibrateCopy();
    soundFx.playClick();
    const ranked = calculateLeaderboard(allResponses, questionBank, gameState, 'ALL');
    if (ranked.length === 0) {
      notify('Chưa có dữ liệu thí sinh nào để xuất bảng xếp hạng CSV!');
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `BTI2026_Leaderboard_Summary_${timestamp}.csv`;
    exportLeaderboardToCSV(ranked, filename);
    triggerHudToast('CSV', `Đã xuất bảng xếp hạng ${ranked.length} khán giả thành công!`);
  };

  // Export current question responses to CSV
  const handleExportCurrentQuestionCSV = () => {
    vibrateCopy();
    soundFx.playClick();
    const currentQRows = spssRows.filter(r => r.Question_ID === gameState.question_id);
    if (currentQRows.length === 0) {
      notify(`Chưa có phản hồi nào cho câu hỏi hiện tại [${gameState.question_id || 'N/A'}] để xuất CSV.`);
      return;
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `BTI2026_${gameState.question_id || 'Question'}_Responses_${timestamp}.csv`;
    exportToCSV(currentQRows, filename);
    triggerHudToast('CSV', `Đã xuất ${currentQRows.length} phản hồi câu [${gameState.question_id}]!`);
  };

  // Export full database JSON dump
  const handleExportFullJSONDump = () => {
    vibrateCopy();
    soundFx.playClick();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `BTI2026_Full_Database_Dump_${timestamp}.json`;
    exportToJSON({
      gameState,
      allResponses,
      questionBank,
      exportedAt: new Date().toISOString(),
      totalResponses: spssRows.length
    }, filename);
    setIsDataExported(true);
    triggerHudToast('JSON', `Đã xuất bản sao lưu JSON toàn bộ cơ sở dữ liệu!`);
  };

  // Question Bank Stats & Filtering
  const qbStats = useMemo(() => {
    const total = questionBank.length;
    const kd = questionBank.filter(q => q.round_name.includes('Khởi động') || q.id.startsWith('KD') || q.id.startsWith('KDC')).length;
    const vcnv = questionBank.filter(q => q.round_name.includes('Chướng ngại vật') || q.id.startsWith('VCNV') || q.round_type === 'VCNV').length;
    const tt = questionBank.filter(q => q.round_name.includes('Tăng tốc') || q.id.startsWith('TT')).length;
    const vd = questionBank.filter(q => q.round_name.includes('Về đích') || q.id.startsWith('VD')).length;
    const tf4 = questionBank.filter(q => q.round_type === 'TRUE_FALSE_4').length;
    const elim6 = questionBank.filter(q => q.round_type === 'ELIMINATION_6').length;
    const short = questionBank.filter(q => q.round_type === 'SHORT_ANSWER').length;
    const seq = questionBank.filter(q => q.round_type === 'SEQUENCING').length;
    const totalLikes = Object.values(gameState.question_likes || {}).reduce((sum: number, n: unknown) => sum + (Number(n) || 0), 0);
    return { total, kd, vcnv, tt, vd, tf4, elim6, short, seq, totalLikes };
  }, [questionBank, gameState.question_likes]);

  const filteredQbQuestions = useMemo(() => {
    let list = questionBank.filter(q => {
      if (qbCategoryFilter === 'KD') {
        if (!q.round_name.includes('Khởi động') && !q.id.startsWith('KD') && !q.id.startsWith('KDC')) return false;
      } else if (qbCategoryFilter === 'VCNV') {
        if (!q.round_name.includes('Chướng ngại vật') && !q.id.startsWith('VCNV') && q.round_type !== 'VCNV') return false;
      } else if (qbCategoryFilter === 'TT') {
        if (!q.round_name.includes('Tăng tốc') && !q.id.startsWith('TT')) return false;
      } else if (qbCategoryFilter === 'VD') {
        if (!q.round_name.includes('Về đích') && !q.id.startsWith('VD')) return false;
      } else if (qbCategoryFilter === 'TRUE_FALSE_4') {
        if (q.round_type !== 'TRUE_FALSE_4') return false;
      } else if (qbCategoryFilter === 'ELIMINATION_6') {
        if (q.round_type !== 'ELIMINATION_6') return false;
      } else if (qbCategoryFilter === 'SHORT_ANSWER') {
        if (q.round_type !== 'SHORT_ANSWER') return false;
      } else if (qbCategoryFilter === 'SEQUENCING') {
        if (q.round_type !== 'SEQUENCING') return false;
      }

      if (qbSearchTerm.trim()) {
        const term = qbSearchTerm.toLowerCase().trim();
        const inId = q.id.toLowerCase().includes(term);
        const inText = q.question_text.toLowerCase().includes(term);
        const inCat = q.category.toLowerCase().includes(term);
        const inKey = q.correct_key.toLowerCase().includes(term);
        const inExp = (q.explanation || '').toLowerCase().includes(term);
        const inOpts = Object.values(q.options || {}).some(v => String(v || '').toLowerCase().includes(term));
        if (!inId && !inText && !inCat && !inKey && !inExp && !inOpts) return false;
      }

      return true;
    });

    if (qbSortBy === 'MOST_LIKED') {
      list = [...list].sort((a, b) => {
        const likesA = gameState.question_likes?.[a.id] || 0;
        const likesB = gameState.question_likes?.[b.id] || 0;
        if (likesB !== likesA) return likesB - likesA;
        return a.id.localeCompare(b.id);
      });
    }

    return list;
  }, [questionBank, qbCategoryFilter, qbSearchTerm, qbSortBy, gameState.question_likes]);

  // Current question vote distribution stats
  const currentVoteCounts = useMemo(() => {
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, E: 0, F: 0 };
    (Object.values(currentResponses) as UserResponse[]).forEach(r => {
      const c = r.choice.toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [currentResponses]);

  const totalCurrentVotes = Object.keys(currentResponses).length;

  // Unauthenticated Lock Screen
  if (!isAuthenticated) {
    return (
      <FluentProvider theme={fluentDarkTransparentTheme} style={{ backgroundColor: 'transparent', background: 'transparent' }} className="h-full bg-transparent block min-w-0">
        <div
          id="admin-login-screen"
          className="min-h-[calc(100vh-4rem)] flex items-center justify-center p-4 bg-transparent"
        >
          <div className="max-w-md w-full fluent-box rounded-[2px] p-8 text-[#F5EFF9] shadow-2xl text-center">
            <div className="w-16 h-16 rounded-[2px] bg-[#F7CAC9]/20 backdrop-blur-md text-[#F7CAC9] flex items-center justify-center mx-auto mb-4 border border-[#F7CAC9]/30">
              <KeyRound className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold mb-1 tracking-tight text-white">OPERATIONAL CONTROL NODE</h2>
            <p className="text-[#B6A6D8] text-[10px] uppercase tracking-[0.2em] font-mono mb-6">
              Beyond The Internet 2026 • Authenticate
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <input
                  type="password"
                  placeholder="NHẬP MẬT MÃ QUẢN TRỊ..."
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full fluent-box-nested border border-white/10 focus:border-[#F7CAC9] text-center font-mono text-base text-white px-4 py-3 rounded-[2px] outline-none tracking-widest transition"
                />
                {passcodeError && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">{passcodeError}</p>
                )}
              </div>
              <button
                id="btn-admin-login-submit"
                type="submit"
                className="w-full bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black py-3.5 px-6 rounded-[2px] uppercase text-xs tracking-wider transition shadow-lg shadow-[#0D0420]/30"
              >
                Mở Khóa Bảng Điều Khiển
              </button>
              
            </form>
          </div>
        </div>
      </FluentProvider>
    );
  }

  // ==========================================
  // AUTHENTICATED OPERATOR CONTROL CENTER (BENTO GRID)
  // ==========================================
  return (
    <FluentProvider theme={fluentDarkTransparentTheme} style={{ backgroundColor: 'transparent', background: 'transparent' }} className="h-full bg-transparent block min-w-0">
      <div
        id="admin-portal-root"
        onContextMenu={handleContextMenu}
        className="w-full max-w-[1400px] mx-auto p-2 sm:p-4 md:p-6 text-[#e5e5e5] space-y-3 sm:space-y-4 md:space-y-5 overflow-x-hidden min-w-0 bg-transparent"
      >
      {/* Top Banner: Master Bento Telemetry Header */}
      <header className="fluent-box p-3 sm:p-4 md:p-5 relative z-50 overflow-visible flex flex-row flex-wrap items-center justify-between gap-4">
        {/* Brand & Telemetry Information */}
        <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-[2px] fluent-acrylic-surface text-white flex items-center justify-center font-bold text-lg sm:text-xl shadow-lg shadow-blue-950/50 border border-blue-400/40 shrink-0">
            <Shield className="w-5 h-5 sm:w-5 sm:h-5 text-blue-100" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center flex-wrap gap-1.5 sm:gap-2 mb-0.5 sm:mb-1">
              <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight text-white truncate sm:overflow-visible">
                ADMIN CONTROL CENTER
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[8px] sm:text-[9px] font-mono font-bold bg-blue-600/80 text-blue-100 uppercase tracking-wider whitespace-nowrap border border-blue-400/40 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-[2px] bg-emerald-400 animate-pulse" />
                NODE 07 • MASTER
              </span>
            </div>
            <p className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-normal sm:tracking-[0.15em] font-mono break-words">
              Beyond The Internet 2026 • Live Orchestration & SPSS Pipeline
            </p>
          </div>
        </div>

        {/* Cụm 2.5: Tìm kiếm */}
        <div className="hidden md:flex items-center flex-1 min-w-[300px] max-w-md mx-auto order-3 xl:order-2 mt-2 xl:mt-0">
          <FluentSearchBar 
            db={null}
            questionBank={questionBank}
            allResponses={allResponses}
            onSelectResult={(type, id, name) => {
              if (type === 'QUESTION') {
                setActiveAdminTab('QUESTIONS');
                triggerHudToast('SEARCH', `Đã chuyển đến câu hỏi: ${id}`);
              } else if (type === 'USER') {
                setActiveAdminTab('STATS');
                triggerHudToast('SEARCH', `Đã chọn khán giả: ${name || id}`);
              }
            }}
          />
        </div>

        {/* Fluent UI Header Action Bar (Cụm 3: Action Controls) */}
        <div className="fluent-action-bar flex-wrap justify-start xl:justify-end gap-2 w-full xl:w-auto order-2 xl:order-3 mt-3 xl:mt-0">
          {/* Group 1: Màn Chiếu & Phát Sóng (Broadcast & Stage Display) */}
          <div className="fluent-action-group flex-1 sm:flex-initial justify-center sm:justify-start">
            {/* Snap Audience Interaction Button */}
            <button
              type="button"
              id="btn-snap-audience-interaction-header"
              onClick={() => handleSnapAudienceInteraction()}
              disabled={isSnapping}
              data-tooltip="Chụp ảnh màn chiếu sân khấu (Biểu đồ, Đám mây từ khóa, Phản hồi) lưu vào Nhật ký phát sóng"
              data-tooltip-title="Snapshot Màn Chiếu"
              data-tooltip-variant="accent"
              className={`has-tooltip fluent-action-btn ${
                isSnapping
                  ? 'bg-purple-900/90 text-purple-200 border-purple-500 animate-pulse'
                  : 'fluent-acrylic-surface hover:from-pink-500 hover:to-indigo-500 text-white border-pink-400/50 shadow-md shadow-pink-950/40'
              }`}
            >
              <Camera className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isSnapping ? 'animate-spin' : 'text-pink-200'}`} />
              <span>{isSnapping ? 'Đang Chụp...' : '📸 Snap Màn Chiếu'}</span>
              <span className="px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono bg-black/40 text-pink-200 border border-pink-400/30">
                {snapshotCount}
              </span>
            </button>

            {/* Live Access QR Modal Toggle Button */}
            <button
              type="button"
              id="btn-admin-header-live-qr"
              onClick={() => handleToggleLiveQrModal()}
              data-tooltip="Bật/Tắt hiển thị Modal QR trên tất cả màn hình Khán giả & Màn chiếu sân khấu"
              data-tooltip-title="Mã QR Khán Giả"
              data-tooltip-hotkey="Q"
              className={`has-tooltip fluent-action-btn ${
                gameState.show_qr
                  ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-900/40 ring-1 ring-sky-300 animate-pulse'
                  : 'text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border-sky-500/30'
              }`}
            >
              <QrCode className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gameState.show_qr ? 'text-white' : 'text-sky-400'}`} />
              <span>Live QR</span>
              {gameState.show_qr ? (
                <span className="px-1.5 py-0.2 text-[9px] font-mono bg-sky-950/80 rounded-[2px] text-sky-200 uppercase font-extrabold tracking-wider">
                  ON
                </span>
              ) : (
                <kbd className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono bg-white/10 rounded-[2px] border border-sky-500/30 text-sky-200">
                  Q
                </kbd>
              )}
            </button>

            
            {/* PANIC BUTTON */}
            <button
              type="button"
              id="btn-admin-header-panic"
              onClick={() => {
                const nextState = !gameState.panic_mode;
                syncService.updateGameState({ panic_mode: nextState });
                triggerHudToast('PANIC', nextState ? 'ĐÃ KÍCH HOẠT PANIC MODE' : 'Đã TẮT Panic Mode');
              }}
              data-tooltip="[PANIC MODE] Ẩn tất cả đáp án và khóa quyền gửi bài trên toàn bộ thiết bị khán giả ngay lập tức"
              data-tooltip-title="Khẩn Cấp"
              className={`has-tooltip fluent-action-btn ${
                gameState.panic_mode
                  ? 'bg-red-600 text-white border-red-400 shadow-md shadow-red-900/50 ring-2 ring-red-500 animate-pulse'
                  : 'text-red-400 bg-red-950/40 hover:bg-red-900/50 border-red-500/30'
              }`}
            >
              <AlertOctagon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gameState.panic_mode ? 'text-white animate-bounce' : 'text-red-400'}`} />
              <span className="font-bold">{gameState.panic_mode ? 'PANIC ON' : 'PANIC'}</span>
            </button>
{/* Announcer Overlay Trigger */}
            <button
              type="button"
              id="btn-admin-header-announcer"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                setShowAnnouncerModal(true);
              }}
              data-tooltip="Phát thông báo chữ chạy (Marquee Ticker) trực tiếp dưới chân màn hình"
              data-tooltip-title="Chữ Chạy Trực Tiếp"
              data-tooltip-hotkey="O"
              data-tooltip-variant="accent"
              className={`has-tooltip fluent-action-btn ${
                gameState.announcer_overlay?.active && gameState.announcer_overlay?.text
                  ? 'text-cyan-200 bg-cyan-950/70 border-cyan-500/70 shadow-md shadow-cyan-950/40 ring-1 ring-cyan-500/40 animate-pulse'
                  : 'text-cyan-300 bg-cyan-950/30 hover:bg-cyan-900/40 border-cyan-500/30'
              }`}
            >
              <Megaphone className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gameState.announcer_overlay?.active && gameState.announcer_overlay?.text ? 'text-cyan-300 animate-bounce' : 'text-cyan-400'}`} />
              <span>Thông Báo Live</span>
              {gameState.announcer_overlay?.active && gameState.announcer_overlay?.text ? (
                <span className="w-2 h-2 rounded-[2px] bg-cyan-400 animate-ping" />
              ) : (
                <kbd className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono bg-white/10 rounded-[2px] border border-cyan-500/30 text-cyan-200">O</kbd>
              )}
            </button>
          </div>

          {/* Group 2: Khảo Sát & Xuất Dữ Liệu (Polls & Data Intelligence) */}
          <div className="fluent-action-group flex-1 sm:flex-initial justify-center sm:justify-start">
            {/* Emergency Poll Trigger */}
            <button
              type="button"
              id="btn-admin-header-emergency-poll"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                setShowEmergencyPollModal(true);
              }}
              data-tooltip="Tạo & phát câu hỏi khảo sát Yes/No tức thì cho khán giả"
              data-tooltip-title="Khảo Sát Khẩn Cấp"
              data-tooltip-hotkey="K"
              data-tooltip-variant="danger"
              className={`has-tooltip fluent-action-btn ${
                gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED'
                  ? 'text-rose-200 bg-rose-950/80 border-rose-500/70 shadow-md shadow-rose-950/40 ring-1 ring-rose-500/40 animate-pulse'
                  : 'text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border-rose-500/30'
              }`}
            >
              <AlertOctagon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED' ? 'text-rose-400 animate-spin' : 'text-rose-400'}`} />
              <span>Khảo Sát Nhanh</span>
              {gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED' ? (
                <span className="w-2 h-2 rounded-[2px] bg-rose-500 animate-ping" />
              ) : (
                <kbd className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono bg-white/10 rounded-[2px] border border-rose-500/30 text-rose-200">K</kbd>
              )}
            </button>

            {/* Export Session Responses CSV Button */}
            <button
              type="button"
              id="btn-admin-export-csv"
              onClick={handleExportSessionCSV}
              data-tooltip="Xuất toàn bộ dữ liệu phản hồi của trận đấu hiện tại ra tệp CSV (SPSS / Excel)"
              data-tooltip-title="Xuất Dữ Liệu SPSS"
              data-tooltip-variant="success"
              className="has-tooltip fluent-action-btn text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Xuất CSV</span>
              <span className="px-1.5 py-0.2 rounded-[2px] text-[9px] font-mono bg-emerald-900/60 text-emerald-200 border border-emerald-500/30">
                {spssRows.length}
              </span>
              <Download className="w-3 h-3 text-emerald-400/80" />
            </button>
          </div>

          {/* Group 3: Điều Phối Khán Giả & Màn Chiếu (Stage Orchestration) */}
          <div className="fluent-action-group flex-1 sm:flex-initial justify-center sm:justify-start">
            {onViewChange && (
              <button
                type="button"
                id="btn-admin-header-pause"
                onClick={() => openConfirm(
                  'Tạm dừng Game?',
                  'Cảnh báo: Hành động này sẽ chuyển TẤT CẢ khán giả về Màn Hình Chờ (Pause). Bạn có chắc chắn?',
                  () => syncService.updateGameState({ force_route: 'client_landing', force_route_ts: Date.now() }),
                  'Đồng ý Tạm Dừng'
                )}
                data-tooltip="Chuyển toàn bộ khán giả về màn hình chờ / Tạm dừng thi đấu"
                data-tooltip-title="Tạm Dừng Gameshow"
                data-tooltip-variant="warning"
                className="has-tooltip fluent-action-btn text-amber-300 bg-amber-950/30 hover:bg-amber-900/40 border-amber-500/30"
              >
                <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" />
                <span>Tạm Dừng</span>
              </button>
            )}

            {onViewChange && (
              <button
                type="button"
                id="btn-admin-header-resume"
                onClick={() => openConfirm(
                  'Tiếp tục Game?',
                  'Hành động này sẽ ĐƯA TẤT CẢ khán giả trở lại màn hình thi đấu (Audience View). Bạn có chắc chắn?',
                  () => syncService.updateGameState({ force_route: 'audience', force_route_ts: Date.now() }),
                  'Đồng ý Tiếp Tục'
                )}
                data-tooltip="Đưa tất cả khán giả trở lại giao diện thi đấu trực tiếp"
                data-tooltip-title="Tiếp Tục Gameshow"
                data-tooltip-variant="success"
                className="has-tooltip fluent-action-btn text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/30"
              >
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
                <span>Tiếp Tục</span>
              </button>
            )}

            {/* Projector Dimming / Stealth Mode Button */}
            <button
              type="button"
              id="btn-admin-header-dim"
              onClick={() => {
                const newState = !gameState.projector_dimmed;
                syncService.updateGameState({ projector_dimmed: newState });
              }}
              data-tooltip="Làm mờ/Ẩn tạm thời nội dung trên màn chiếu LED sân khấu"
              data-tooltip-title="Màn Chiếu Sân Khấu"
              className={`has-tooltip fluent-action-btn ${
                gameState.projector_dimmed 
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-500/40 border-purple-400'
                  : 'text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border-purple-500/30'
              }`}
            >
              {gameState.projector_dimmed ? <MonitorOff className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" /> : <Monitor className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />}
              <span>{gameState.projector_dimmed ? 'Đang Mờ' : 'Làm Mờ'}</span>
            </button>
            
            {/* Show Summary / Leaderboard Button */}
            <button
              type="button"
              id="btn-admin-header-summary"
              onClick={() => {
                const newSummaryState = !gameState.show_summary;
                openConfirm(
                  newSummaryState ? 'Mở Bảng Tổng Kết?' : 'Đóng Bảng Tổng Kết?',
                  newSummaryState ? 'Mở Bảng Tổng Kết (Leaderboard) cho tất cả Khán giả và Màn chiếu?' : 'Đóng Bảng Tổng Kết?',
                  () => {
                    syncService.updateGameState({ show_summary: newSummaryState });
                  },
                  'Đồng ý'
                );
              }}
              data-tooltip="Bật/Tắt hiển thị Bảng xếp hạng và Tổng kết điểm cho toàn bộ khán giả"
              data-tooltip-title="Bảng Tổng Kết Trận"
              data-tooltip-variant="accent"
              className={`has-tooltip fluent-action-btn ${
                gameState.show_summary 
                  ? 'bg-amber-500 text-white shadow-md shadow-amber-500/40 border-amber-300'
                  : 'text-amber-300 bg-amber-950/30 hover:bg-amber-900/40 border-amber-500/30'
              }`}
            >
              <Trophy className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${gameState.show_summary ? 'text-white' : 'text-amber-400'}`} />
              <span>Tổng Kết</span>
            </button>
          </div>
          {/* Group 4: Giám Sát & Trợ Giúp (Telemetry & Shortcuts) */}
          <div className="fluent-action-group flex-1 sm:flex-initial justify-center sm:justify-start">
            <button
              type="button"
              id="btn-admin-header-network-monitor"
              onClick={() => {
                vibrateSelection();
                setShowQuickNetworkMonitor(!showQuickNetworkMonitor);
              }}
              data-tooltip="Bật/Tắt đồ thị độ trễ Real-time Recharts nhanh (Ping / Network Monitor)"
              data-tooltip-title="Giám Sát Mạng"
              data-tooltip-variant="success"
              className={`has-tooltip fluent-action-btn ${
                showQuickNetworkMonitor
                  ? 'text-emerald-200 bg-emerald-950/80 border-emerald-400/60 shadow-md shadow-emerald-950/40'
                  : 'text-emerald-300 bg-emerald-950/30 hover:bg-emerald-900/40 border-emerald-500/30'
              }`}
            >
              <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
              <span>Giám Sát Mạng</span>
            </button>

            <button
              type="button"
              id="btn-admin-header-shortcuts"
              onClick={() => {
                vibrateTap();
                setShowShortcutsModal(true);
              }}
              data-tooltip="Phím tắt điều khiển nhanh cho MC / Host (Bấm ? hoặc F1)"
              data-tooltip-title="Bảng Phím Tắt"
              className="has-tooltip fluent-action-btn text-purple-300 bg-purple-950/30 hover:bg-purple-900/40 border-purple-500/30"
            >
              <Keyboard className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
              <span>Phím Tắt</span>
              <kbd className="px-1.5 py-0.2 text-[9px] sm:text-[10px] font-mono bg-white/10 rounded-[2px] border border-purple-500/30 text-purple-200">?</kbd>
            </button>
          </div>
        </div>
      </header>

      {/* Quick Collapsible Network Latency Visualizer */}
      {showQuickNetworkMonitor && (
        <div className="animate-fadeIn">
          <NetworkStabilityChart compact className="border-emerald-500/30 shadow-2xl shadow-emerald-950/30" />
        </div>
      )}

      {/* TWO-TIER TAB NAVIGATION */}
      <div className="flex flex-col gap-1.5 mb-2">
        {/* Tier 1: Top Level Categories */}
        <div className="fluent-box rounded-[2px] p-1 overflow-hidden bg-black/40 border border-white/5">
          <TabList
            selectedValue={
              ['KDC', 'VCNV', 'TT', 'VD'].includes(activeAdminTab) ? 'ROUNDS' :
              ['POLL_MANAGER', 'QA_MANAGER', 'CHAT_MANAGER', 'WORD_CLOUD', 'POLL_HISTORY'].includes(activeAdminTab) ? 'INTERACTION' :
              ['QUESTIONS', 'STATS', 'LUCKY_DRAW', 'SNAPSHOTS', 'ACTIVITY_LOG', 'GUIDE'].includes(activeAdminTab) ? 'SYSTEM' :
              'DASHBOARD'
            }
            onTabSelect={(_e, data) => {
              vibrateTap();
              soundFx.playClick();
              const top = data.value;
              if (top === 'DASHBOARD') setActiveAdminTab('DASHBOARD');
              else if (top === 'ROUNDS') setActiveAdminTab('KDC');
              else if (top === 'INTERACTION') setActiveAdminTab('QA_MANAGER');
              else if (top === 'SYSTEM') setActiveAdminTab('STATS');
            }}
            size="medium"
            appearance="transparent"
            className="fluent-tablist custom-scrollbar snap-x snap-mandatory touch-pan-x"
          >
            <Tab value="DASHBOARD" icon={<LayoutDashboard className="w-4 h-4" />}>
              <span className="font-bold text-[11px] sm:text-xs">Tổng Quan</span>
            </Tab>
            <Tab value="ROUNDS" icon={<Flame className="w-4 h-4" />}>
              <span className="font-bold text-[11px] sm:text-xs">Vòng Thi</span>
            </Tab>
            <Tab value="INTERACTION" icon={<MessageSquare className="w-4 h-4" />}>
              <span className="font-bold text-[11px] sm:text-xs">Tương Tác</span>
            </Tab>
            <Tab value="SYSTEM" icon={<Settings className="w-4 h-4" />}>
              <span className="font-bold text-[11px] sm:text-xs">Hệ Thống</span>
            </Tab>
          </TabList>
        </div>

        {/* Tier 2: Sub-tabs based on active top-tier category */}
        {!['DASHBOARD'].includes(
            ['KDC', 'VCNV', 'TT', 'VD'].includes(activeAdminTab) ? 'ROUNDS' :
            ['POLL_MANAGER', 'QA_MANAGER', 'CHAT_MANAGER', 'WORD_CLOUD', 'POLL_HISTORY'].includes(activeAdminTab) ? 'INTERACTION' :
            ['QUESTIONS', 'STATS', 'LUCKY_DRAW', 'SNAPSHOTS', 'ACTIVITY_LOG', 'GUIDE'].includes(activeAdminTab) ? 'SYSTEM' :
            'DASHBOARD'
        ) && (
          <div className="fluent-box rounded-[2px] p-1 overflow-hidden">
            <TabList
              id="admin-round-tablist"
              selectedValue={activeAdminTab}
              onTabSelect={(_e, data) => {
                const selectedId = data.value as typeof activeAdminTab;
                vibrateTap();
                soundFx.playClick();
                setActiveAdminTab(selectedId);
                if (selectedId === 'LUCKY_DRAW') {
                  syncService.updateGameState({ active_module: 'LUCKY_DRAW' });
                } else if (gameState.active_module === 'LUCKY_DRAW') {
                  syncService.updateGameState({ active_module: 'GAME' });
                }
                if (selectedId === 'VCNV') {
                  const vcnvQ = questionBank.find(q => q.round_name.includes('Vượt Chướng Ngại Vật') || q.id.startsWith('VCNV'));
                  if (vcnvQ && gameState.question_id !== vcnvQ.id) {
                    handleLoadQuestion(vcnvQ.id);
                  }
                }
              }}
              size="small"
              appearance="transparent"
              className="fluent-tablist custom-scrollbar snap-x snap-mandatory touch-pan-x"
              onWheel={(e) => {
                if (e.deltaY !== 0) {
                  e.currentTarget.scrollLeft += e.deltaY;
                }
              }}
            >
              {(
                ['KDC', 'VCNV', 'TT', 'VD'].includes(activeAdminTab) ? [
                  { id: 'KDC', label: '1. Khởi Động', badge: '45', icon: Zap },
                  { id: 'VCNV', label: '2. Chướng Ngại Vật', icon: LayoutGrid },
                  { id: 'TT', label: '3. Tăng Tốc', badge: '4', icon: Flame },
                  { id: 'VD', label: '4. Về Đích', icon: Target }
                ] :
                ['POLL_MANAGER', 'QA_MANAGER', 'CHAT_MANAGER', 'WORD_CLOUD', 'POLL_HISTORY'].includes(activeAdminTab) ? [
                  { id: 'QA_MANAGER', label: 'Hỏi Đáp Q&A', icon: MessageSquare },
                  { id: 'CHAT_MANAGER', label: 'Chat Khán Giả', badge: 'LIVE', badgeVariant: 'live', icon: Megaphone },
                  { id: 'POLL_MANAGER', label: 'Khảo Sát Live', badge: 'LIVE', badgeVariant: 'live', icon: BarChart3 },
                  { id: 'WORD_CLOUD', label: 'Mây Từ Khóa', icon: Cloud },
                  { id: 'POLL_HISTORY', label: 'Lịch Sử Poll', badge: (gameState.emergency_poll_history?.length || 0) > 0 ? `${gameState.emergency_poll_history?.length}` : undefined, icon: History }
                ] :
                [
                  { id: 'STATS', label: 'Thống Kê', icon: Trophy },
                  { id: 'QUESTIONS', label: 'Ngân Hàng CH', badge: `${questionBank.length}`, icon: ListPlus },
                  { id: 'LUCKY_DRAW', label: 'Quay Số', icon: Sparkles },
                  { id: 'SNAPSHOTS', label: 'Khoảnh Khắc', badge: snapshotCount > 0 ? `${snapshotCount}` : undefined, icon: Camera },
                  { id: 'ACTIVITY_LOG', label: 'Nhật Ký', icon: Clock },
                  { id: 'GUIDE', label: 'Hướng Dẫn', icon: BookOpen }
                ]
              ).map(tab => (
                <Tab
                  key={tab.id}
                  value={tab.id}
                  id={`admin-fluent-tab-${tab.id.toLowerCase()}`}
                  icon={<tab.icon className={`w-3.5 h-3.5 shrink-0 transition-transform ${activeAdminTab === tab.id ? 'text-sky-300 scale-110' : 'text-white/60'}`} />}
                  className="has-tooltip snap-start min-w-max"
                >
                  <span className="flex items-center gap-1.5 select-none font-mono text-[11px]">
                    <span>{tab.label}</span>
                    {tab.badge && (
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] border ${
                        activeAdminTab === tab.id
                          ? 'bg-white/20 text-white border-white/30'
                          : 'bg-white/10 text-white/70 border-white/10'
                      } ${tab.badgeVariant === 'live' ? 'animate-pulse text-amber-300 border-amber-400/40' : ''}`}>
                        {tab.badge}
                      </span>
                    )}
                  </span>
                </Tab>
              ))}
            </TabList>
          </div>
        )}
      </div>

      {/* Live Poll Results Dashboard Overlay */}
      {gameState.emergency_poll && gameState.emergency_poll.status !== 'DISMISSED' && (
        <LivePollDashboard 
          gameState={gameState} 
          allResponses={allResponses} 
          activeAudienceCount={activeCount} 
        />
      )}

      {/* ================= QUICK ACTIONS PANEL (RESET QUESTION, FORCE LOCK, URGENT BROADCAST, PAUSE TIMER, RESET SCORES, LOBBY LOCK) ================= */}
      <QuickActionsPanel
        gameState={gameState}
        activeCount={activeCount}
        openConfirm={openConfirm}
        triggerHudToast={triggerHudToast}
        onClearCurrentResponses={handleClearCurrentResponses}
        onClearAllResponses={handleClearAllResponses}
        onLockVoting={handleLockVoting}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
      />

      {/* ================= LIVE ACCESS QR CODE SECTION (MASTER AUDIENCE GATEWAY & BROADCAST TOGGLE) ================= */}
      <section
        id="section-live-access-qr"
        className={`border transition-all duration-300 overflow-hidden ${
          gameState.show_qr
            ? 'bg-gradient-to-r from-sky-950/40 via-[#18113c]/40 to-blue-950/40 border-sky-500/50 shadow-xl shadow-sky-950/40 ring-1 ring-sky-500/30 rounded-[2px]'
            : 'fluent-box'
        }`}
      >
        <div className="p-3 sm:p-4 md:p-5 space-y-3 sm:space-y-4">
          {/* Header row with Title, Live Status Pill, and Clear Toggle Switch */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-[2px] flex items-center justify-center border transition ${
                gameState.show_qr
                  ? 'fluent-box-nested text-sky-300 border-sky-400/60 shadow-lg shadow-sky-500/30'
                  : 'fluent-box-nested text-white/50 border-white/10'
              }`}>
                <QrCode className={`w-5 h-5 ${gameState.show_qr ? 'text-sky-300 animate-pulse' : 'text-white/60'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm sm:text-base font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    Live Access QR • Cổng Tham Gia Khán Giả
                  </h2>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] flex items-center gap-1.5 transition ${
                    gameState.show_qr
                      ? 'fluent-box-nested text-emerald-300 border border-emerald-500/40 animate-pulse'
                      : 'fluent-box-nested text-white/50 border border-white/10'
                  }`}>
                    <span className={`w-2 h-2 rounded-[2px] ${gameState.show_qr ? 'bg-emerald-400 animate-ping' : 'bg-white/30'}`} />
                    {gameState.show_qr ? 'ĐANG PHÁT TOÀN HỆ THỐNG (LIVE BROADCAST)' : 'ĐANG ẨN (STANDBY)'}
                  </span>
                </div>
                <p className="text-[11px] sm:text-xs text-white/50 mt-0.5">
                  Điều khiển trạng thái hiển thị Modal QR trên toàn bộ điện thoại khán giả và màn chiếu sân khấu
                </p>
              </div>
            </div>

            {/* Clear Toggle Switch & Controls */}
            <div className="flex items-center gap-2.5 sm:gap-3 self-end sm:self-auto">
              <span className="text-xs font-mono text-white/60 hidden md:inline">
                Modal QR:
              </span>
              
              {/* Prominent Cross-Device Toggle Switch */}
              <button
                type="button"
                id="toggle-live-access-qr-switch"
                role="switch"
                aria-checked={Boolean(gameState.show_qr)}
                onClick={() => handleToggleLiveQrModal()}
                className={`relative inline-flex h-8 w-16 shrink-0 cursor-pointer rounded-[2px] border-2 transition-colors duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500/50 ${
                  gameState.show_qr
                    ? 'bg-sky-600 border-sky-400 shadow-lg shadow-sky-600/40'
                    : 'fluent-box-nested border-white/20 hover:border-white/30'
                }`}
                title={gameState.show_qr ? 'Nhấn để tắt Modal QR trên toàn hệ thống' : 'Nhấn để mở Modal QR cho tất cả khán giả và màn chiếu'}
              >
                <span className="sr-only">Bật hoặc Tắt Live Access QR</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-[2px] bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                    gameState.show_qr ? 'translate-x-8 bg-sky-100' : 'translate-x-0.5 bg-white/70'
                  }`}
                />
              </button>

              <span className={`text-xs font-mono font-bold px-2.5 py-1 rounded-[2px] border transition ${
                gameState.show_qr
                  ? 'fluent-box-nested text-sky-300 border-sky-500/40'
                  : 'fluent-box-nested text-white/40 border-white/10'
              }`}>
                {gameState.show_qr ? 'BẬT (ON)' : 'TẮT (OFF)'}
              </span>

              <kbd className="hidden sm:inline px-2 py-1 text-[10px] font-mono fluent-box-nested text-white/60 rounded-[2px] border border-white/10" title="Nhấn phím Q để Bật/Tắt nhanh">
                Q
              </kbd>

              <button
                type="button"
                onClick={() => setIsLiveQrSectionCollapsed(!isLiveQrSectionCollapsed)}
                className="p-1.5 fluent-box-nested hover:fluent-box-nested border border-white/10 text-white/60 hover:text-white rounded-[2px] transition text-xs"
                title={isLiveQrSectionCollapsed ? 'Mở rộng chi tiết mã QR' : 'Thu gọn chi tiết'}
              >
                <ChevronDown className={`w-4 h-4 transition duration-200 ${isLiveQrSectionCollapsed ? '-rotate-90' : ''}`} />
              </button>
            </div>
          </div>

          {/* Interactive QR Preview and Quick Entry Information (Collapsible) */}
          {!isLiveQrSectionCollapsed && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4 items-center pt-1 animate-fadeIn">
              {/* Left side: High-contrast QR Code Thumbnail with Seamless Optical Cross-Fade */}
              <div className="md:col-span-4 lg:col-span-3 flex flex-col items-center justify-center p-3 fluent-box-nested space-y-2">
                <div
                  className={`p-2.5 rounded-[2px] shadow-xl relative group cursor-pointer transition transform hover:scale-[1.02] ${
                    gameState.qr_transparent_bg
                      ? 'bg-[linear-gradient(45deg,#242424_25%,transparent_25%),linear-gradient(-45deg,#242424_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#242424_75%),linear-gradient(-45deg,transparent_75%,#242424_75%)] bg-[size:12px_12px] bg-[#141414] ring-1 ring-emerald-400/40'
                      : 'bg-white'
                  }`}
                  onClick={() => handleToggleLiveQrModal(true)}
                  title="Nhấn để phóng to / mở Modal QR toàn màn hình"
                >
                  <CrossFadeQrCode
                    dataUrl={qrDataUrl}
                    alt="Live Access QR"
                    sizeClass="w-32 h-32 sm:w-36 sm:h-36"
                    loadingFallback={
                      <div className="w-32 h-32 sm:w-36 sm:h-36 fluent-box-nested rounded-[2px] flex items-center justify-center text-xs text-white/40 font-mono">
                        Đang tạo QR...
                      </div>
                    }
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-[2px] transition flex items-center justify-center gap-1.5 text-white text-xs font-bold font-mono">
                    <Eye className="w-4 h-4 text-sky-400" /> Mở Phóng To
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-[2px] border ${
                    gameState.qr_transparent_bg
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-white/10 text-white/70 border-white/10'
                  }`}>
                    {gameState.qr_transparent_bg ? 'Alpha Trong Suốt' : 'Nền Đặc'}
                  </span>
                </div>
                {(adminQrCaption || gameState.qr_custom_caption) && (
                  <div className="w-full text-center px-2 py-1 bg-sky-950/70 border border-sky-500/30 rounded-[2px] text-[10px] font-mono font-bold text-sky-200 truncate" title={adminQrCaption || gameState.qr_custom_caption}>
                    ✨ {adminQrCaption || gameState.qr_custom_caption}
                  </div>
                )}
              </div>

              {/* Right side: Live Access Entry Details & Broadcast Actions */}
              <div className="md:col-span-8 lg:col-span-9 space-y-3">
                {/* URL Display Box */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between flex-wrap gap-1">
                    <span className="text-[11px] font-mono uppercase text-sky-400 font-bold flex items-center gap-1.5">
                      <ExternalLink className="w-3.5 h-3.5" /> Đường Dẫn Trực Tiếp Vào Phòng Thi Đấu:
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-white/50 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-[2px] border border-sky-400/20">
                        <ScanLine className="w-3 h-3 text-sky-400" />
                        <span>Ước tính quét: <strong className="text-sky-300 font-bold">{Number(gameState.qr_scan_count) || 0}</strong></span>
                      </span>
                      <span className="text-[10px] font-mono text-white/50 flex items-center gap-1 bg-black/40 px-2 py-0.5 rounded-[2px] border border-emerald-400/20">
                        <Users className="w-3 h-3 text-emerald-400" />
                        <span>Online: <strong className="text-emerald-400 font-bold">{activeCount}</strong></span>
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <div className="flex-1 fluent-box-nested border border-white/15 focus-within:border-sky-500 rounded-[2px] px-3 py-2 text-xs font-mono text-white/90 truncate flex items-center justify-between">
                      <span className="truncate select-all text-sky-200">{audienceJoinUrl || 'Đang chuẩn bị link phòng thi...'}</span>
                    </div>

                    <button
                      type="button"
                      id="btn-copy-audience-link"
                      onClick={handleCopyAudienceLink}
                      className={`px-3.5 py-2 rounded-[2px] text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 shrink-0 border hover-effect cursor-pointer ${
                        isCopiedJoinUrl
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                          : 'fluent-box text-white border-white/15'
                      }`}
                      title="Sao chép link tham gia vào clipboard"
                    >
                      {isCopiedJoinUrl ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{isCopiedJoinUrl ? 'Đã Sao Chép!' : 'Sao Chép Link'}</span>
                    </button>
                  </div>
                </div>

                {/* Custom Short Caption Input Field (Displays below QR code across all devices) */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <label htmlFor="input-dash-qr-caption" className="flex items-center gap-1.5 text-xs font-mono font-bold text-white uppercase tracking-wider">
                      <Type className="w-3.5 h-3.5 text-sky-400" />
                      <span>Tiêu Đề Phụ Dưới Mã QR (Custom Caption):</span>
                    </label>
                    {(adminQrCaption || gameState.qr_custom_caption) && (
                      <button
                        type="button"
                        id="btn-clear-dash-qr-caption"
                        onClick={() => handleUpdateQrCaption('')}
                        className="text-[10px] font-mono text-rose-300 hover:text-rose-200 transition underline cursor-pointer"
                      >
                        Xóa chữ
                      </button>
                    )}
                  </div>

                  <div className="relative flex items-center">
                    <input
                      id="input-dash-qr-caption"
                      type="text"
                      maxLength={60}
                      value={adminQrCaption}
                      onChange={(e) => handleUpdateQrCaption(e.target.value)}
                      placeholder="Ví dụ: Tham gia Vòng 1, Quét để bình chọn, Join for Round 1..."
                      className="w-full bg-black/40 border border-white/20 rounded-[2px] px-2.5 py-1.5 text-xs text-white font-mono placeholder:text-white/30 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/50 pr-12 transition"
                    />
                    <span className="absolute right-2 text-[10px] font-mono text-white/40 pointer-events-none">
                      {adminQrCaption.length}/60
                    </span>
                  </div>

                  {/* Quick Preset Chips */}
                  <div className="flex items-center gap-1 flex-wrap pt-0.5">
                    <span className="text-[10px] font-mono text-white/40">Gợi ý:</span>
                    {[
                      'Tham gia Vòng 1',
                      'Tham gia VCNV',
                      'Tham gia Tăng Tốc',
                      'Bình chọn Khán Giả',
                      'Join for Round 1',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => handleUpdateQrCaption(preset)}
                        className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono border transition cursor-pointer ${
                          adminQrCaption === preset
                            ? 'bg-sky-500/30 text-sky-200 border-sky-400 font-bold shadow-sm'
                            : 'bg-white/5 hover:bg-sky-500/20 text-white/60 hover:text-sky-300 border-white/10'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Code Background Mode (Solid vs Transparent for Broadcast Overlay) */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white uppercase tracking-wider">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Nền Mã QR (Broadcast Overlay):</span>
                  </div>

                  <div className="inline-flex rounded-[2px] p-0.5 fluent-box-nested border border-white/15 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleQrTransparentBg(false)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-[2px] transition flex items-center gap-1 cursor-pointer ${
                        !gameState.qr_transparent_bg
                          ? 'bg-sky-500 text-white font-bold shadow-sm'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="Nền màu đặc theo bảng màu"
                    >
                      <span>Nền Đặc (Solid)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleQrTransparentBg(true)}
                      className={`px-2.5 py-1 text-[11px] font-mono font-semibold rounded-[2px] transition flex items-center gap-1 cursor-pointer ${
                        gameState.qr_transparent_bg
                          ? 'bg-emerald-500 text-white font-bold shadow-sm'
                          : 'text-white/60 hover:text-white'
                      }`}
                      title="Nền trong suốt Alpha để chèn lên overlay OBS / vMix"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
                      <span>Trong Suốt (Alpha)</span>
                    </button>
                  </div>
                </div>

                {/* Inactivity Auto-Close Timeout (60s default to prevent screen blocking) */}
                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white uppercase tracking-wider">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tự Động Đóng QR Sau (Inactivity Timeout):</span>
                  </div>

                  <div className="inline-flex rounded-[2px] p-0.5 fluent-box-nested border border-white/15 shrink-0">
                    {[
                      { seconds: 0, label: 'Tắt' },
                      { seconds: 30, label: '30s' },
                      { seconds: 60, label: '60s (Chuẩn)' },
                      { seconds: 120, label: '120s' },
                    ].map((opt) => (
                      <button
                        key={opt.seconds}
                        type="button"
                        id={`btn-dash-qr-timeout-${opt.seconds}`}
                        onClick={() => handleSetQrTimeout(opt.seconds)}
                        className={`px-2 py-1 text-[11px] font-mono font-semibold rounded-[2px] transition cursor-pointer ${
                          qrAutoCloseSeconds === opt.seconds
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-sm'
                            : 'text-white/60 hover:text-white'
                        }`}
                        title={opt.seconds === 0 ? 'Tắt tự đóng' : `Tự động đóng sau ${opt.seconds}s không hoạt động`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* QR Code Color Palette Toggle Control (Persisted to Firebase) */}
                <div className="pt-2 border-t border-white/10 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-1.5">
                    <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white uppercase tracking-wider">
                      <Palette className="w-3.5 h-3.5 text-amber-400" />
                      <span>Bảng Màu QR Code Toàn Hệ Thống:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        id="btn-dashboard-reset-qr"
                        onClick={handleResetQrSettings}
                        className="px-2 py-0.5 rounded-[2px] border border-white/15 bg-white/5 hover:bg-amber-400/15 hover:border-amber-400/50 text-white/70 hover:text-amber-300 transition text-[10px] font-mono font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                        title="Khôi phục kích thước, bảng màu và kiểu nền về mặc định"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span>Mặc định (Reset)</span>
                      </button>
                      <span className="text-[10px] font-mono text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded-[2px] border border-amber-500/20">
                        Tự động đồng bộ toàn hệ thống
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                    {(Object.keys(QR_PALETTES) as QrPaletteId[]).map((paletteKey) => {
                      const pal = QR_PALETTES[paletteKey];
                      const isSelected = ((gameState.qr_color_palette as QrPaletteId) || 'purple_gold') === paletteKey;
                      return (
                        <button
                          key={paletteKey}
                          type="button"
                          id={`btn-qr-palette-${paletteKey}`}
                          onClick={() => handleSetQrPalette(paletteKey)}
                          className={`p-2.5 rounded-[2px] border text-left transition relative cursor-pointer group flex flex-col justify-between overflow-hidden min-w-0 ${
                            isSelected
                              ? `bg-white/10 ${pal.borderClass} ring-1 ring-white/30 shadow-lg`
                              : 'bg-black/30 border-white/10 hover:border-white/25 hover:bg-white/5'
                          }`}
                          title={`Chọn bảng màu: ${pal.name} - ${pal.description}`}
                        >
                          <div className="flex items-center justify-between gap-1 mb-1.5 min-w-0 w-full">
                            <div className="flex items-center gap-1.5 min-w-0 flex-1">
                              <span
                                className="w-3 h-3 rounded-full shrink-0 shadow-sm border border-white/30"
                                style={{ backgroundColor: pal.dotColor }}
                              />
                              <span className="text-[11px] font-bold font-mono text-white truncate" title={pal.labelVi}>
                                {pal.labelVi}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-amber-400 text-slate-950 rounded-[2px] flex items-center gap-0.5 shrink-0 whitespace-nowrap shadow-sm">
                                <Check className="w-2.5 h-2.5 stroke-[3]" /> Chọn
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-[10px] font-mono text-white/50 pt-1 border-t border-white/5 min-w-0 w-full">
                            <span className="truncate">{pal.dark}</span>
                            <span className="w-3 h-3 rounded-[2px] border border-white/30 shrink-0" style={{ backgroundColor: pal.dark }} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Broadcast Action Buttons Row */}
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    id="btn-toggle-live-qr-modal"
                    onClick={() => handleToggleLiveQrModal()}
                    className={`px-3.5 py-2 rounded-[2px] text-xs font-bold uppercase tracking-wider transition flex items-center gap-1.5 shadow-md hover-effect cursor-pointer ${
                      gameState.show_qr
                        ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/30 border border-rose-400/50'
                        : 'bg-sky-600 hover:bg-sky-500 text-white shadow-sky-950/30 border border-sky-400/50'
                    }`}
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>{gameState.show_qr ? 'Tắt Modal QR (Broadcast Off)' : 'Mở Modal QR Cho Khán Giả'}</span>
                  </button>

                  <button
                    type="button"
                    id="btn-download-live-qr-png"
                    onClick={handleDownloadQrPng}
                    className="px-3.5 py-2 fluent-box hover-effect text-white rounded-[2px] text-xs font-bold font-mono transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                    title="Tải ảnh QR Code định dạng PNG chất lượng cao để in ấn hoặc chiếu màn hình"
                  >
                    <Download className="w-3.5 h-3.5 text-sky-400" />
                    <span>Tải Ảnh QR (.PNG)</span>
                  </button>

                  {onViewChange && (
                    <button
                      type="button"
                      onClick={() => onViewChange('audience')}
                      className="px-3.5 py-2 fluent-box hover-effect text-purple-300 rounded-[2px] text-xs font-bold font-mono transition flex items-center gap-1.5 border border-purple-500/30 cursor-pointer"
                      title="Mở tab giả lập khán giả để kiểm thử trải nghiệm quét QR"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem Giao Diện Khán Giả</span>
                    </button>
                  )}
                </div>

                <div className="text-[10px] text-white/40 font-mono fluent-box-nested px-3 py-1.5 flex items-center gap-1.5">
                  <span>⚡</span>
                  <span>Đồng bộ 2 chiều tức thời qua Firestore Realtime Stream — Bật công tắc để mở Modal QR đồng thời trên tất cả thiết bị.</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area with Fluent UI v2 Transition */}
      <div key={activeAdminTab} className="fluent-tab-panel">
        {activeAdminTab === 'DASHBOARD' ? (
          <AdminDashboard 
            onNavigate={setActiveAdminTab} 
            gameState={gameState} 
            snapshotCount={snapshotCount} 
          />
        ) : activeAdminTab === 'QUESTIONS' ? (
        /* ================= TAB 5: NHẬP & QUẢN LÝ NGÂN HÀNG CÂU HỎI STUDIO ================= */
        <div className="space-y-6">
          {/* Top Header & Actions */}
          <section className="fluent-box p-3 sm:p-4 md:p-5 relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-4 border-b border-white/10">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <ListPlus className="w-5 h-5 text-blue-400" />
                  Ngân Hàng Câu Hỏi BTI 2026 Studio
                </h2>
                <p className="text-xs text-white/50 mt-1">
                  Quản lý 45 câu Khởi động (Trả lời ngắn & Trắc nghiệm 4) • 4 câu Tăng tốc (Trắc nghiệm 6 loại trừ & Trả lời ngắn) • Về đích (Trắc nghiệm 4 & Đúng sai 4 theo hình)
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenCreateQuestion()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider transition shadow-md shadow-blue-900/30 flex items-center gap-1.5 hover-effect cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Thêm Câu Hỏi Mới
                </button>

                <button
                  type="button"
                  onClick={handleExportQuestionBankJSON}
                  className="px-3.5 py-2 fluent-box hover-effect text-white rounded-[2px] text-xs font-bold font-mono transition flex items-center gap-1.5 border border-white/10 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" /> Xuất File JSON
                </button>

                <label className="px-3.5 py-2 fluent-box hover-effect text-white rounded-[2px] text-xs font-bold font-mono transition flex items-center gap-1.5 border border-white/10 cursor-pointer">
                  <Upload className="w-3.5 h-3.5" /> Nhập File JSON
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImportQuestionBankJSON}
                    className="hidden"
                  />
                </label>

                <button
                  type="button"
                  onClick={handleResetDefaultQuestionBank}
                  className="px-3.5 py-2 fluent-box hover-effect border border-rose-500/30 text-rose-300 rounded-[2px] text-xs font-bold font-mono transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Khôi phục Mặc định
                </button>
              </div>
            </div>

            {/* Quick Metrics Bento Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-2.5 pt-3 sm:pt-4">
              <div className="fluent-box-nested p-2.5 sm:p-3">
                <span className="text-[10px] text-white/40 font-mono uppercase block">Tổng Số Câu</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-white">{qbStats.total}</span>
              </div>
              <div className="fluent-box-nested p-2.5 sm:p-3">
                <span className="text-[10px] text-amber-400/80 font-mono uppercase block">1. Khởi Động</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-amber-400">{qbStats.kd} / 45</span>
              </div>
              <div className="fluent-box-nested p-2.5 sm:p-3">
                <span className="text-[10px] text-cyan-400/80 font-mono uppercase block">2. Vượt CNV</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-cyan-400">{qbStats.vcnv}</span>
              </div>
              <div className="fluent-box-nested p-2.5 sm:p-3">
                <span className="text-[10px] text-orange-400/80 font-mono uppercase block">3. Tăng Tốc</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-orange-400">{qbStats.tt} / 4</span>
              </div>
              <div className="fluent-box-nested p-2.5 sm:p-3">
                <span className="text-[10px] text-emerald-400/80 font-mono uppercase block">4. Về Đích</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-emerald-400">{qbStats.vd}</span>
              </div>
              <div className="fluent-box-nested p-2.5 sm:p-3">
                <span className="text-[10px] text-purple-400/80 font-mono uppercase block">Đúng/Sai 4 Ý</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-purple-400">{qbStats.tf4}</span>
              </div>
              <div className="fluent-box-nested p-2.5 sm:p-3">
                <span className="text-[10px] text-rose-400/80 font-mono uppercase block">Loại Trừ 6 Ý</span>
                <span className="text-lg sm:text-xl font-bold font-mono text-rose-400">{qbStats.elim6}</span>
              </div>
              <div className="fluent-box-nested border-rose-500/30 p-2.5 sm:p-3">
                <span className="text-[10px] text-rose-400 font-mono uppercase block flex items-center gap-1">
                  <Heart className="w-2.5 h-2.5 fill-rose-400 text-rose-400" /> Tổng Lượt Thích
                </span>
                <span className="text-lg sm:text-xl font-bold font-mono text-rose-300">{qbStats.totalLikes}</span>
              </div>
            </div>
          </section>

          {/* Search & Filtering Bar */}
          <section className="fluent-box p-3 sm:p-4 space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Category Filter Chips */}
              <div className="flex overflow-x-auto custom-scrollbar gap-1.5 pb-1 whitespace-nowrap">
                {[
                  { id: 'ALL', label: `Tất cả (${qbStats.total})` },
                  { id: 'KD', label: `1. Khởi động (${qbStats.kd})` },
                  { id: 'VCNV', label: `2. Vượt CNV (${qbStats.vcnv})` },
                  { id: 'TT', label: `3. Tăng tốc (${qbStats.tt})` },
                  { id: 'VD', label: `4. Về đích (${qbStats.vd})` },
                  { id: 'TRUE_FALSE_4', label: `Đúng/Sai 4 (${qbStats.tf4})` },
                  { id: 'ELIMINATION_6', label: `Loại trừ 6 (${qbStats.elim6})` },
                  { id: 'SHORT_ANSWER', label: `Trả lời ngắn (${qbStats.short})` },
                  { id: 'SEQUENCING', label: `Kéo thả (${qbStats.seq})` },
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setQbCategoryFilter(item.id)}
                    className={`px-2.5 py-1.5 rounded-[2px] text-xs font-mono font-bold transition ${
                      qbCategoryFilter === item.id
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'fluent-box-nested text-white/60 hover:bg-white/15 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Search & Sort Controls */}
              <div className="flex items-center gap-2">
                {/* Sort Toggle Button */}
                <button
                  type="button"
                  onClick={() => setQbSortBy(prev => prev === 'DEFAULT' ? 'MOST_LIKED' : 'DEFAULT')}
                  className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold transition flex items-center gap-1.5 border shrink-0 ${
                    qbSortBy === 'MOST_LIKED'
                      ? 'fluent-box-nested text-rose-300 border-rose-500/40 shadow-sm'
                      : 'fluent-box-nested text-white/60 hover:text-white border-white/10'
                  }`}
                  title={qbSortBy === 'MOST_LIKED' ? 'Đang xếp theo lượt thích nhiều nhất' : 'Nhấn để xếp theo câu hỏi nhiều lượt thích nhất'}
                >
                  <Heart className={`w-3.5 h-3.5 ${qbSortBy === 'MOST_LIKED' ? 'fill-rose-400 text-rose-400' : 'text-white/40'}`} />
                  <span>{qbSortBy === 'MOST_LIKED' ? 'Nhiều Tim Nhất' : 'Xếp Theo Tim'}</span>
                </button>

                {/* Search Bar */}
                <div className="relative w-full md:w-64">
                  <Search className="w-4 h-4 text-[#F7CAC9] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Tìm theo ID, nội dung, key, căn cứ..."
                    value={qbSearchTerm}
                    onChange={(e) => setQbSearchTerm(e.target.value)}
                    className="w-full fluent-box-nested border border-white/15 focus:border-blue-500 pl-9 pr-8 py-1.5 rounded-[2px] text-base sm:text-xs text-white outline-none transition placeholder:text-white/30"
                  />
                  {qbSearchTerm && (
                    <button
                      type="button"
                      onClick={() => setQbSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white p-0.5 rounded-[2px] cursor-pointer"
                      title="Xóa tìm kiếm"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* VCNV SPECIAL PACKAGE EDITOR SECTION */}
          {(qbCategoryFilter === 'ALL' || qbCategoryFilter === 'VCNV') && (
            <section className="fluent-box rounded-[2px] p-3 sm:p-4 md:p-5 space-y-4 shadow-xl relative overflow-hidden backdrop-blur-md">
              <div className="absolute top-0 right-0 fluent-box-nested text-cyan-300 border-l border-b border-cyan-500/30 text-[10px] font-mono font-bold px-3 py-1 rounded-bl-[2px] uppercase tracking-wider">
                ⚡ Studio Matrix VCNV
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-cyan-400" />
                    Soạn Thảo Gói VCNV (Từ Khóa • 4 Hàng Ngang • Ô Trung Tâm • Ô Mạo Hiểm)
                  </h3>
                  <p className="text-[11px] text-white/60 mt-0.5">
                    Quản lý toàn bộ nội dung VCNV của chương trình: Lưu vào Ngân hàng câu hỏi hoặc Đồng bộ ngay lên Live Stream Màn Chiếu.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleSyncVcnvStateToLive}
                    className="px-3.5 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-[2px] text-xs font-mono uppercase tracking-wider transition shadow-lg shadow-cyan-950 flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" /> Đồng Bộ Ngay Lên Trận Đấu
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveVcnvToBank}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-[2px] text-xs font-mono uppercase tracking-wider transition shadow-lg shadow-emerald-950 flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" /> Lưu Ngân Hàng (VCNV_01)
                  </button>
                </div>
              </div>

              {/* Input Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {/* Column 1: Keyword + 4 Clues */}
                <div className="space-y-3 fluent-box-nested p-3.5 rounded-[2px] border border-white/5">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-amber-400 uppercase mb-1">
                      🔑 Từ Khóa Chướng Ngại Vật Chính (Key CNV):
                    </label>
                    <input
                      type="text"
                      value={vcnvInputKeyword}
                      onChange={(e) => setVcnvInputKeyword(e.target.value)}
                      placeholder="DEEPFAKE, AN TOÀN MẠNG..."
                      className="w-full fluent-box-nested border border-amber-500/40 focus:border-amber-400 rounded-[2px] px-3 py-1.5 text-base sm:text-xs text-amber-300 font-mono font-bold uppercase outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-mono font-bold text-blue-300 uppercase mb-1.5">
                      🧩 4 Hàng Ngang Gợi Ý (Đáp án hàng ngang):
                    </label>
                    <div className="space-y-1.5">
                      {[0, 1, 2, 3].map(idx => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-6 h-6 shrink-0 rounded-[2px] fluent-box-nested text-blue-300 font-mono font-bold text-[11px] flex items-center justify-center border border-blue-500/30">
                            #{idx + 1}
                          </span>
                          <input
                            type="text"
                            value={vcnvClueTexts[idx] || ''}
                            onChange={(e) => {
                              const newTexts = [...vcnvClueTexts];
                              newTexts[idx] = e.target.value;
                              setVcnvClueTexts(newTexts);
                            }}
                            placeholder={`Hàng ngang ${idx + 1}...`}
                            className="w-full fluent-box-nested border border-white/10 focus:border-blue-400 rounded-[2px] px-2.5 py-1 text-base sm:text-xs text-white font-mono uppercase outline-none"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2: Center Box + Risk Box */}
                <div className="space-y-3 fluent-box-nested p-3.5 rounded-[2px] border border-white/5">
                  <div>
                    <label className="block text-[11px] font-mono font-bold text-amber-300 uppercase mb-1">
                      🌟 Đáp Án Ô Trung Tâm (Center Box Text):
                    </label>
                    <input
                      type="text"
                      value={vcnvCenterText}
                      onChange={(e) => setVcnvCenterText(e.target.value)}
                      placeholder="CẢNH BÁO LỪA ĐẢO, AN TOÀN SỐ..."
                      className="w-full fluent-box-nested border border-white/10 focus:border-amber-400 rounded-[2px] px-3 py-1.5 text-base sm:text-xs text-amber-200 font-mono font-bold uppercase outline-none"
                    />
                  </div>

                  <div className="space-y-2 pt-0.5">
                    <label className="block text-[11px] font-mono font-bold text-rose-300 uppercase">
                      ⚡ Nội Dung Ô Mạo Hiểm (Risk Box +120 Điểm Khán Giả):
                    </label>

                    <div>
                      <span className="text-[10px] text-white/50 block mb-0.5">Câu hỏi / Gợi ý Ô Mạo Hiểm:</span>
                      <textarea
                        rows={2}
                        value={riskQuestionInput}
                        onChange={(e) => setRiskQuestionInput(e.target.value)}
                        placeholder="Nhập nội dung gợi ý/câu hỏi cho Ô Mạo Hiểm..."
                        className="w-full fluent-box-nested border border-white/10 focus:border-rose-400 rounded-[2px] px-2.5 py-1.5 text-base sm:text-xs text-white outline-none"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] text-white/50 block mb-0.5">Đáp án Ô Mạo Hiểm:</span>
                      <input
                        type="text"
                        value={riskAnswerInput}
                        onChange={(e) => setRiskAnswerInput(e.target.value)}
                        placeholder="Nhập đáp án chuẩn cho Ô Mạo Hiểm..."
                        className="w-full fluent-box-nested border border-white/10 focus:border-rose-400 rounded-[2px] px-3 py-1.5 text-base sm:text-xs text-rose-300 font-mono font-bold uppercase outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Question Cards Grid */}
          <section className="space-y-4">
            <div className="flex items-center justify-between text-xs text-white/40 font-mono">
              <span>HIỂN THỊ {filteredQbQuestions.length} / {questionBank.length} CÂU HỎI</span>
              <span>ĐỊNH DẠNG: BTI 2026 MULTI-ROUND</span>
            </div>

            {filteredQbQuestions.length === 0 ? (
              <div className="fluent-box-nested border border-white/10 rounded-[2px] p-12 text-center text-white/40">
                <p className="text-sm">Không tìm thấy câu hỏi phù hợp với bộ lọc hiện tại.</p>
                <button
                  type="button"
                  onClick={() => { setQbCategoryFilter('ALL'); setQbSearchTerm(''); }}
                  className="mt-3 px-4 py-1.5 fluent-box-nested hover:fluent-box-nested text-white text-xs rounded-[2px] transition"
                >
                  Xóa bộ lọc
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {filteredQbQuestions.map((q) => {
                  const isCurrent = gameState.question_id === q.id;
                  const isVcnv = q.round_type === 'VCNV';
                  const isTf4 = q.round_type === 'TRUE_FALSE_4';
                  const isElim6 = q.round_type === 'ELIMINATION_6';
                  const isShort = q.round_type === 'SHORT_ANSWER';

                  return (
                    <div
                      key={q.id}
                      className={`p-3.5 sm:p-4 rounded-[2px] border transition-all flex flex-col justify-between space-y-3 sm:space-y-4 ${
                        isCurrent
                          ? 'fluent-box border-blue-500/80 ring-1 ring-blue-500/50 shadow-lg'
                          : 'fluent-box hover:border-white/20'
                      }`}
                    >
                      {/* Card Header */}
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-blue-400 fluent-box-nested border-blue-500/40 px-2 py-0.5 rounded-[2px] text-xs">
                              {q.id}
                            </span>
                            <span className="text-[11px] font-medium text-white/70 fluent-box-nested px-2 py-0.5 rounded-[2px]">
                              {q.round_name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {/* Audience Upvotes / Likes Badge */}
                            <span
                              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] flex items-center gap-1 border ${
                                (gameState.question_likes?.[q.id] || 0) > 0
                                  ? 'fluent-box-nested text-rose-300 border-rose-500/40 shadow-sm'
                                  : 'fluent-box-nested text-white/40'
                              }`}
                              title={`${gameState.question_likes?.[q.id] || 0} lượt thích từ khán giả`}
                            >
                              <Heart className={`w-2.5 h-2.5 ${(gameState.question_likes?.[q.id] || 0) > 0 ? 'fill-rose-400 text-rose-400' : 'text-white/40'}`} />
                              <span>{gameState.question_likes?.[q.id] || 0}</span>
                            </span>

                            <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-[2px] ${
                              isVcnv
                                ? 'fluent-box-nested text-cyan-300 border border-cyan-500/30'
                                : isTf4
                                ? 'fluent-box-nested text-purple-300 border border-purple-500/30'
                                : isElim6
                                ? 'fluent-box-nested text-amber-300 border border-amber-500/30'
                                : isShort
                                ? 'fluent-box-nested text-cyan-300 border border-cyan-500/30'
                                : 'fluent-box-nested text-blue-300 border border-blue-500/30'
                            }`}>
                              {isVcnv ? 'VƯỢT CHƯỚNG NGẠI VẬT' : isTf4 ? 'ĐÚNG/SAI 4' : isElim6 ? 'LOẠI TRỪ 6' : isShort ? 'TRẢ LỜI NGẮN' : 'TRẮC NGHIỆM 4'}
                            </span>

                            <span className="text-[10px] font-mono fluent-box-nested text-white/80 px-2 py-0.5 rounded-[2px] flex items-center gap-1">
                              <Clock className="w-3 h-3 text-white/50" /> {q.time_limit}s
                            </span>
                          </div>
                        </div>

                        {/* Question Text */}
                        <p className="text-sm font-semibold text-white leading-snug pt-1">
                          {q.question_text}
                        </p>
                      </div>

                      {/* Options or Details */}
                      <div className="space-y-2">
                        {isVcnv ? (
                          /* Render VCNV package items */
                          <div className="space-y-2 fluent-box-nested border-cyan-500/20 p-3 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">Từ khóa CNV chính:</span>
                              <span className="font-mono font-bold text-amber-300 fluent-box-nested border-amber-500/40 px-2 py-0.5 rounded-[2px]">
                                {q.correct_key || q.options?.riskAnswer || 'DEEPFAKE'}
                              </span>
                            </div>

                            <div className="space-y-1 pt-1">
                              <span className="text-[10px] font-mono text-blue-300 block">4 Hàng ngang gợi ý:</span>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[11px] font-mono">
                                {[1, 2, 3, 4].map(num => (
                                  <div key={num} className="fluent-box-nested p-1.5 rounded-[2px] text-white/80 truncate">
                                    <strong className="text-blue-400 mr-1">#{num}:</strong> {(q.options as any)?.[`clue${num}`] || '---'}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {q.options?.centerText && (
                              <div className="text-[11px] text-amber-200/90 pt-1 border-t border-white/5">
                                🌟 <strong className="font-mono text-amber-300">Ô Trung Tâm:</strong> {q.options.centerText}
                              </div>
                            )}

                            {q.options?.riskQuestion && (
                              <div className="text-[11px] text-rose-200/90 pt-1 border-t border-white/5">
                                ⚡ <strong className="font-mono text-rose-300">Ô Mạo Hiểm:</strong> {q.options.riskQuestion} (Key: {q.options.riskAnswer || q.correct_key})
                              </div>
                            )}
                          </div>
                        ) : isTf4 ? (
                          /* Render TRUE_FALSE_4 items */
                          <div className="space-y-1.5 fluent-box-nested p-3">
                            {['a', 'b', 'c', 'd'].map(key => {
                              const statementText = (q.options as any)?.[key] || '';
                              const keyMatch = (q.correct_key || '').match(new RegExp(`${key}:([ĐS])`, 'i'));
                              const isTrue = keyMatch ? keyMatch[1].toUpperCase() === 'Đ' : false;
                              return (
                                <div key={key} className="flex items-start justify-between gap-2 text-xs">
                                  <span className="text-white/80 flex-1">
                                    <strong className="font-mono text-purple-300 mr-1">{key})</strong> {statementText}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-[2px] font-mono font-bold text-[10px] ${
                                    isTrue
                                      ? 'fluent-box-nested text-emerald-400 border border-emerald-500/30'
                                      : 'fluent-box-nested text-rose-400 border border-rose-500/30'
                                  }`}>
                                    {isTrue ? 'ĐÚNG' : 'SAI'}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : isShort ? (
                          /* Render SHORT_ANSWER keyword */
                          <div className="p-3 fluent-box-nested border-cyan-500/30">
                            <span className="text-[10px] font-mono uppercase text-cyan-300 block mb-0.5">Đáp án chuẩn:</span>
                            <span className="text-xs font-mono font-bold text-white fluent-box-nested px-2 py-1 inline-block">
                              {q.correct_key}
                            </span>
                          </div>
                        ) : (
                          /* Render MULTIPLE_CHOICE or ELIMINATION_6 options grid */
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {Object.entries(q.options || {}).map(([optKey, optText]) => {
                              const isKey = q.correct_key === optKey;
                              return (
                                <div
                                  key={optKey}
                                  className={`p-2 rounded-[2px] border flex items-center gap-2 ${
                                    isKey
                                      ? 'fluent-box-nested border-emerald-500/40 text-emerald-200 font-semibold'
                                      : 'fluent-box-nested text-white/70'
                                  }`}
                                >
                                  <span className={`w-5 h-5 rounded-[2px] flex items-center justify-center font-mono text-[10px] font-bold ${
                                    isKey ? 'bg-emerald-500 text-black' : 'bg-white/10 text-white/70'
                                  }`}>
                                    {optKey}
                                  </span>
                                  <span className="truncate flex-1">{optText}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Explanation / Law citation */}
                        {q.explanation && (
                          <p className="text-[11px] text-white/50 fluent-box-nested p-2 italic">
                            💡 <strong className="text-white/70 not-italic font-medium">Căn cứ:</strong> {q.explanation}
                          </p>
                        )}
                      </div>

                      {/* Card Actions Footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/5">
                        <div className="text-[10px] text-white/40 font-mono">
                          {q.category}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => isVcnv ? handleApplyVcnvItemToLive(q) : handleLoadQuestion(q.id)}
                            disabled={isCurrent}
                            className={`px-3 py-1.5 rounded-[2px] text-xs font-bold uppercase tracking-wider transition flex items-center gap-1 ${
                              isCurrent
                                ? 'bg-blue-600 text-white shadow'
                                : 'fluent-box-nested hover:bg-white/15 text-white'
                            }`}
                          >
                            <Play className="w-3 h-3" /> {isCurrent ? 'Đang chạy' : isVcnv ? 'Nạp Live VCNV' : 'Nạp Sân Khấu'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEditQuestion(q)}
                            className="p-1.5 fluent-box-nested hover:bg-white/15 text-white rounded-[2px] transition"
                            title="Chỉnh sửa câu hỏi"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDuplicateQuestion(q)}
                            className="p-1.5 fluent-box-nested hover:bg-white/15 text-white rounded-[2px] transition"
                            title="Nhân bản câu hỏi"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteQuestion(q.id)}
                            className="p-1.5 fluent-box-nested hover:fluent-box-nested text-rose-400 rounded-[2px] transition border border-rose-500/20"
                            title="Xóa câu hỏi"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      ) : activeAdminTab === 'STATS' ? (
        /* ================= TAB 6: THỐNG KÊ TOÀN DIỆN (LEADERBOARD, SPSS LOGS & ĐỘ TRỄ MẠNG) ================= */
        <div className="space-y-6">
          {/* Top Sub-navigation Bar for Statistics */}
          <div className="fluent-box border border-blue-500/30 rounded-[2px] p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[2px] fluent-box-nested border border-blue-400/40 text-blue-300 flex items-center justify-center shadow-lg">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                  6. THỐNG KÊ TOÀN DIỆN
                </h2>
                <p className="text-xs text-white/60">
                  Bảng xếp hạng, Nhật ký dữ liệu SPSS CSV & Giám sát độ trễ mạng phát sóng
                </p>
              </div>
            </div>

            {/* Sub-tab Navigation Buttons */}
            <div className="flex items-center gap-1.5 fluent-box-nested border border-white/10 p-1 rounded-[2px]">
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setStatsSubTab('LEADERBOARD');
                }}
                className={`fluent-subtab-btn ${
                  statsSubTab === 'LEADERBOARD'
                    ? 'active bg-[#F7CAC9] text-[#190839] font-black shadow-md border-[#F7CAC9]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Trophy className="w-3.5 h-3.5 text-amber-300" />
                <span>1. Bảng Xếp Hạng</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setStatsSubTab('SPSS');
                }}
                className={`fluent-subtab-btn ${
                  statsSubTab === 'SPSS'
                    ? 'active bg-[#F7CAC9] text-[#190839] font-black shadow-md border-[#F7CAC9]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <BarChart className="w-3.5 h-3.5 text-emerald-300" />
                <span>2. SPSS & Xuất Data</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setStatsSubTab('NETWORK');
                }}
                className={`fluent-subtab-btn ${
                  statsSubTab === 'NETWORK'
                    ? 'active bg-[#F7CAC9] text-[#190839] font-black shadow-md border-[#F7CAC9]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-sky-300" />
                <span>3. Độ Trễ & Ping</span>
              </button>

              <button
                type="button"
                id="btn-subtab-qr-trends"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setStatsSubTab('QR_TRENDS');
                }}
                className={`fluent-subtab-btn ${
                  statsSubTab === 'QR_TRENDS'
                    ? 'active bg-[#F7CAC9] text-[#190839] font-black shadow-md border-[#F7CAC9]'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-300" />
                <span>4. Xu Hướng Quét QR</span>
              </button>
            </div>
          </div>

          {/* Sub-view Content with Fluent 2 Motion Transition */}
          <div key={statsSubTab} className="fluent-tab-panel">
            {/* Sub-view 1: Leaderboard */}
            {statsSubTab === 'LEADERBOARD' && (
              <div className="space-y-4">
                <Leaderboard 
                  allResponses={allResponses} 
                  gameState={gameState} 
                  customQuestionBank={questionBank} 
                  activeCount={activeCount} 
                />
              </div>
            )}

            {/* Sub-view 2: SPSS Logs & Data Export */}
            {statsSubTab === 'SPSS' && (
              <div className="space-y-4">
                <section className="fluent-box p-3 sm:p-4 md:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div>
                      <h2 className="text-[10px] uppercase text-white/40 font-bold tracking-widest">
                        SPSS & Academic Research Telemetry
                      </h2>
                      <p className="text-xs text-white/60">
                        Tổng cộng: <strong className="text-emerald-400 font-mono">{spssRows.length}</strong> dòng dữ liệu chuẩn hóa
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        id="btn-export-spss-csv"
                        onClick={handleExportSessionCSV}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 hover-effect text-white font-bold text-xs rounded-[2px] shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition uppercase tracking-wider cursor-pointer"
                        title="Xuất file CSV chuẩn SPSS / Excel cho toàn bộ phiên đấu (Tất cả câu trả lời của khán giả)"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5" /> 1. Xuất CSV Tất Cả Câu Trả Lời ({spssRows.length})
                      </button>

                      <button
                        type="button"
                        id="btn-export-leaderboard-csv"
                        onClick={handleExportLeaderboardCSV}
                        className="px-3.5 py-2 bg-amber-600 hover:bg-amber-500 hover-effect text-white font-bold text-xs rounded-[2px] shadow-lg shadow-amber-900/30 flex items-center gap-1.5 transition uppercase tracking-wider cursor-pointer"
                        title="Xuất tệp CSV Tổng kết Bảng Xếp Hạng & Điểm số từng vòng của tất cả khán giả"
                      >
                        <Trophy className="w-3.5 h-3.5" /> 2. Xuất CSV Bảng Xếp Hạng
                      </button>

                      <button
                        type="button"
                        onClick={handleExportCurrentQuestionCSV}
                        className="px-3 py-2 fluent-box hover-effect text-white font-bold text-xs rounded-[2px] border border-teal-500/40 flex items-center gap-1.5 transition uppercase tracking-wider cursor-pointer"
                        title={`Xuất riêng dữ liệu phản hồi CSV của câu hỏi đang chọn [${gameState.question_id || 'N/A'}]`}
                      >
                        <Download className="w-3.5 h-3.5 text-teal-300" /> Xuất CSV Câu Hiện Tại
                      </button>

                      <button
                        type="button"
                        onClick={handleExportFullJSONDump}
                        className="px-3 py-2 fluent-box hover-effect text-white font-bold text-xs rounded-[2px] border border-indigo-500/40 flex items-center gap-1.5 transition uppercase tracking-wider cursor-pointer"
                        title="Xuất bản sao lưu dữ liệu toàn bộ (JSON)"
                      >
                        <Download className="w-3.5 h-3.5 text-indigo-300" /> Sao Lưu JSON
                      </button>

                      {isDataExported ? (
                        <button
                          onClick={() => {
                            vibrateError();
                            handleInitiateReset();
                          }}
                          className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 hover-effect border border-rose-500/50 text-white font-bold text-xs rounded-[2px] shadow-lg shadow-rose-900/30 flex items-center gap-1.5 transition uppercase tracking-wider animate-pulse cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> 2. Reset Toàn Bộ Trận Đấu
                        </button>
                      ) : (
                        <div className="text-[10px] text-rose-300 font-mono italic fluent-box-nested border border-rose-500/20 rounded-[2px] px-3 py-2 flex items-center gap-1">
                          <span>🔒</span> Xuất CSV để mở khóa Reset
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="relative flex-1 max-w-md">
                      <Search className="w-4 h-4 text-[#F7CAC9] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Tìm kiếm theo Tên, MSSV, UID hoặc Mã câu hỏi..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full fluent-box-nested border border-white/10 focus:border-blue-500 pl-9 pr-8 py-2 rounded-[2px] text-base sm:text-xs text-white outline-none transition placeholder:text-white/30"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white p-0.5 rounded-[2px] cursor-pointer"
                          title="Xóa tìm kiếm"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="text-[10px] text-white/40 font-mono sm:hidden flex items-center gap-1">
                      <span>👉</span> <span>Vuốt ngang bảng để xem đủ 9 cột SPSS</span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-[2px] border border-white/10 max-h-96 overflow-y-auto scrollbar-thin">
                    <table className="w-full text-left text-xs text-white/80 font-sans">
                      <thead className="fluent-box text-white/40 uppercase font-mono text-[10px] tracking-wider sticky top-0 border-b border-white/10">
                        <tr>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">UID</th>
                          <th className="p-3">Họ và Tên</th>
                          <th className="p-3">MSSV</th>
                          <th className="p-3">Question</th>
                          <th className="p-3">User Choice</th>
                          <th className="p-3">Key</th>
                          <th className="p-3">Result</th>
                          <th className="p-3">Latency (s)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 font-mono text-xs">
                        {filteredSpssRows.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="p-6 text-center text-white/30 font-sans">
                              Chưa có phản hồi nào được ghi nhận
                            </td>
                          </tr>
                        ) : (
                          filteredSpssRows.map((row, idx) => (
                            <tr key={idx} className="hover:fluent-box-nested">
                              <td className="p-3 text-[11px] text-white/40 whitespace-nowrap">{row.Timestamp}</td>
                              <td className="p-3 font-bold text-blue-400">{row.UID}</td>
                              <td className="p-3 font-sans text-white font-medium">{row.FullName}</td>
                              <td className="p-3 text-white/50">{row.MSSV}</td>
                              <td className="p-3 text-white/70">{row.Question_ID}</td>
                              <td className="p-3 font-bold text-amber-400">[{row.User_Choice}]</td>
                              <td className="p-3 text-emerald-400">[{row.Correct_Choice}]</td>
                              <td className="p-3">
                                {row.Is_Correct === '1' ? (
                                  <span className="text-emerald-400">1 (Đúng)</span>
                                ) : row.Is_Correct === '0' ? (
                                  <span className="text-rose-400">0 (Sai)</span>
                                ) : (
                                  <span className="text-white/30">NA</span>
                                )}
                              </td>
                              <td className="p-3 text-white/50">{row.Response_Time_Seconds}s</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
            )}

            {/* Sub-view 3: Network Stability & Infrastructure Health */}
            {statsSubTab === 'NETWORK' && (
              <div className="space-y-6">
                <NetworkStabilityChart />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 fluent-box-nested border border-white/10 rounded-[2px] space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 font-bold font-mono text-xs uppercase">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Hạ Tầng Cloud Realtime</span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Đồng bộ hai chiều trực tiếp qua Firestore WebSocket Stream & Snapshot listeners. Tự động dự phòng khi mạng chập chờn.
                    </p>
                    <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-white/40 flex justify-between">
                      <span>Database Node:</span>
                      <span className="text-white/80">ai-studio-beyondtheinterne</span>
                    </div>
                  </div>

                  <div className="p-4 fluent-box-nested border border-white/10 rounded-[2px] space-y-2">
                    <div className="flex items-center gap-2 text-sky-400 font-bold font-mono text-xs uppercase">
                      <Users className="w-4 h-4" />
                      <span>Khán Giả Đang Kết Nối</span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Hiện có <strong className="text-white font-mono">{activeCount}</strong> thiết bị khán giả và màn chiếu đang kết nối đồng bộ theo thời gian thực.
                    </p>
                    <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-white/40 flex justify-between">
                      <span>Heartbeat:</span>
                      <span className="text-emerald-400 font-bold">HOẠT ĐỘNG (6s)</span>
                    </div>
                  </div>

                  <div className="p-4 fluent-box-nested border border-white/10 rounded-[2px] space-y-2">
                    <div className="flex items-center gap-2 text-purple-400 font-bold font-mono text-xs uppercase">
                      <Shield className="w-4 h-4" />
                      <span>Khuyến Nghị Phát Sóng</span>
                    </div>
                    <p className="text-xs text-white/70 leading-relaxed">
                      Độ trễ tối ưu cho Game Show trực tiếp là &lt; 150ms. Nếu ping vượt 500ms, host nên tạm dừng 10s để đường truyền ổn định.
                    </p>
                    <div className="pt-2 border-t border-white/5 text-[11px] font-mono text-white/40 flex justify-between">
                      <span>Chuẩn SLA:</span>
                      <span className="text-purple-300 font-bold">RTT &lt; 250ms</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-view 4: QR Scan Count Trends (Recharts) */}
            {statsSubTab === 'QR_TRENDS' && (
              <div className="space-y-4">
                <section className="fluent-box p-3 sm:p-4 md:p-6 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
                    <div>
                      <h2 className="text-[10px] uppercase text-white/40 font-bold tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Biểu Đồ Xu Hướng Lượt Quét Mã QR (Recharts Analysis)</span>
                      </h2>
                      <p className="text-xs text-white/60">
                        Theo dõi lưu lượng truy cập và thời điểm khán giả quét mã QR tham gia đột biến theo từng khung giờ
                      </p>
                    </div>
                  </div>
                  <QrScanTrendsChart gameState={gameState} />
                </section>
              </div>
            )}
          </div>
        </div>
      ) : activeAdminTab === 'POLL_MANAGER' ? (
        <div className="space-y-6">
          <AdminPollManager
            gameState={gameState}
            allResponses={allResponses}
            activeAudienceCount={activeCount}
            onOpenHistoryTab={() => setActiveAdminTab('POLL_HISTORY')}
            onViewChange={onViewChange}
          />
        </div>
      ) : activeAdminTab === 'LUCKY_DRAW' ? (
        <div className="space-y-6">
          <LuckyDrawAdmin gameState={gameState} allResponses={allResponses} />
        </div>
      ) : activeAdminTab === 'POLL_HISTORY' ? (
        /* ================= TAB 9: LỊCH SỬ KHẢO SÁT KHẨN CẤP (EMERGENCY POLL HISTORY) ================= */
        <div className="space-y-6">
          <PollHistoryTab
            gameState={gameState}
            allResponses={allResponses}
            activeCount={activeCount}
            onRelaunchPoll={(pollData) => {
              setRelaunchDraft({
                id: `RELAUNCH_${Date.now()}`,
                question: pollData.question,
                type: pollData.type,
                options: pollData.options,
                time_limit: pollData.time_limit,
                source_type: pollData.source_type || 'HOST',
                source_name: pollData.source_name || '',
                context_note: pollData.context_note || '',
                created_at: Date.now()
              });
              setShowEmergencyPollModal(true);
            }}
          />
        </div>

      ) : activeAdminTab === 'QA_MANAGER' ? (
        <div className="space-y-6">
          <AdminQAManager gameState={gameState} />
        </div>
      ) : activeAdminTab === 'CHAT_MANAGER' ? (
        <div className="space-y-6">
          <AdminChatManager gameState={gameState} />
        </div>
      ) : activeAdminTab === 'WORD_CLOUD' ? (
        <div className="space-y-6">
          <div className="p-4 fluent-box rounded-[2px] flex flex-wrap items-center justify-between gap-3 shadow-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-[2px] fluent-box-nested text-pink-300 border border-pink-500/30 flex items-center justify-center shrink-0">
                <Cloud className="w-5 h-5 text-[#F7CAC9]" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Tổng Hợp Đám Mây Từ Khóa Trực Tiếp (Word Cloud Aggregator)
                </h3>
                <p className="text-xs text-white/60">
                  Tự động trích xuất và chấm điểm từ khóa nổi bật từ Q&A Khán Giả, Thăm Dò Khẩn Cấp và Câu Trả Lời Ngắn
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-pink-200/80 fluent-box-nested px-3 py-1.5 rounded-[2px] border border-pink-500/30">
                Phím tắt trên Màn Chiếu: <kbd className="px-1.5 py-0.5 fluent-box-nested text-pink-300 rounded-[2px] font-bold">W</kbd>
              </span>
            </div>
          </div>
          <ProjectorWordCloud
            gameState={gameState}
            responses={currentResponses}
            allResponses={allResponses}
          />
        </div>
      ) : activeAdminTab === 'ACTIVITY_LOG' ? (
        <div className="space-y-6">
          <AdminActivityLog />
        </div>
      ) : activeAdminTab === 'SNAPSHOTS' ? (
        <div className="space-y-6">
          <BroadcastSnapshotHistoryTab
            gameState={gameState}
            responses={currentResponses}
            allResponses={allResponses}
            activeCount={activeCount}
            onTriggerSnap={handleSnapAudienceInteraction}
            isSnapping={isSnapping}
          />
        </div>
      ) : activeAdminTab === 'GUIDE' ? (
        <div className="space-y-6">
          <AdminGuide />
        </div>
      ) : (
        /* ================= DEFAULT 12-COLUMN DASHBOARD ================= */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 sm:gap-4 md:gap-6 items-start">
        {/* Left Column (7 cols): Current Question Payload & Master Controls */}
        <div className="w-full lg:col-span-7 space-y-3 sm:space-y-4 md:space-y-6 min-w-0">
          
          {/* TAB 2: VCNV ONLY MODULE */}
          {activeAdminTab === 'VCNV' && (
            <section className="space-y-3 sm:space-y-4 md:space-y-6">
              {/* Main VCNV 3-Step Workflow Panel */}
              <div className="fluent-box-nested border border-white/10 rounded-[2px] p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 sm:pb-4 border-b border-white/10 gap-2.5 sm:gap-3">
                  <div>
                    <h2 className="text-xs uppercase text-cyan-400 font-bold tracking-widest font-mono flex items-center gap-2">
                      <LayoutGrid className="w-4 h-4" /> Quy Trình Vượt Chướng Ngại Vật (VCNV)
                    </h2>
                    <p className="text-[10px] sm:text-[11px] text-white/50 mt-0.5">
                      Quy trình: 1. Khán giả nhập → 2. Chốt kết quả (Chưa công bố) → 3. Công bố đáp án
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                    <span className="text-[10px] sm:text-[11px] px-2.5 py-1 fluent-box-nested text-cyan-300 border border-cyan-500/30 rounded-[2px] font-mono font-bold">
                      {totalCurrentVotes} Dự đoán đã gửi
                    </span>
                    <button
                      type="button"
                      onClick={handleStart15sRiskBox}
                      className="px-2.5 sm:px-3 py-1 fluent-box-nested hover:fluent-box-nested border border-amber-500/40 text-amber-300 rounded-[2px] text-[11px] sm:text-xs font-bold font-mono transition flex items-center gap-1.5 shadow-md shadow-amber-950/20"
                      title="Bắt đầu chạy đếm ngược 15 giây cho câu hỏi/gợi ý VCNV"
                    >
                      <Clock className="w-3.5 h-3.5" /> Chạy 15s đếm ngược
                    </button>
                    <button
                      type="button"
                      onClick={handleVcnvReset}
                      className="px-2.5 sm:px-3 py-1 fluent-box-nested hover:fluent-box-nested border border-rose-500/40 text-rose-300 rounded-[2px] text-[11px] sm:text-xs font-bold font-mono transition flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Reset VCNV
                    </button>
                  </div>
                </div>

                {/* 3-Step Workflow Selector */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
                  {/* Step 1 */}
                  <button
                    type="button"
                    onClick={handleVcnvOpen}
                    className={`p-3 sm:p-4 rounded-[2px] border text-left transition flex flex-col justify-between gap-2 sm:gap-3 ${
                      gameState.vcnv_status === 'OPEN'
                        ? 'fluent-box-nested border-cyan-500 ring-2 ring-cyan-500/30 shadow-lg shadow-cyan-950/50 text-white'
                        : 'fluent-box-nested border-white/10 text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                        Bước 1
                      </span>
                      {gameState.vcnv_status === 'OPEN' && (
                        <span className="w-2 h-2 rounded-[2px] bg-cyan-400 animate-ping" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-white">1. MỞ NHẬN DỰ ĐOÁN</p>
                      <p className="text-[10px] sm:text-[11px] text-white/50 mt-0.5">Khán giả tự do nhập & sửa dự đoán</p>
                    </div>
                  </button>

                  {/* Step 2 */}
                  <button
                    type="button"
                    onClick={handleVcnvLock}
                    className={`p-3 sm:p-4 rounded-[2px] border text-left transition flex flex-col justify-between gap-2 sm:gap-3 ${
                      gameState.vcnv_status === 'LOCKED'
                        ? 'fluent-box-nested border-amber-500 ring-2 ring-amber-500/30 shadow-lg shadow-amber-950/50 text-white'
                        : 'fluent-box-nested border-white/10 text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400">
                        Bước 2
                      </span>
                      {gameState.vcnv_status === 'LOCKED' && (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-white">2. CHỐT KẾT QUẢ</p>
                      <p className="text-[10px] sm:text-[11px] text-white/50 mt-0.5">Khóa dự đoán, chưa công bố đáp án</p>
                    </div>
                  </button>

                  {/* Step 3 */}
                  <button
                    type="button"
                    onClick={handleVcnvReveal}
                    className={`p-3 sm:p-4 rounded-[2px] border text-left transition flex flex-col justify-between gap-2 sm:gap-3 ${
                      (gameState.vcnv_status === 'REVEALED' || gameState.vcnv_summary_active)
                        ? 'fluent-box-nested border-emerald-500 ring-2 ring-emerald-500/30 shadow-lg shadow-emerald-950/50 text-white'
                        : 'fluent-box-nested border-white/10 text-white/60 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400">
                        Bước 3
                      </span>
                      {(gameState.vcnv_status === 'REVEALED' || gameState.vcnv_summary_active) && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-xs sm:text-sm text-white">3. CÔNG BỐ ĐÁP ÁN</p>
                      <p className="text-[10px] sm:text-[11px] text-white/50 mt-0.5">Hiện từ khóa & vinh danh Top 5</p>
                    </div>
                  </button>
                </div>

                {/* Status-specific Callout & Controls */}
                {gameState.vcnv_status === 'LOCKED' && (
                  <div className="p-3 sm:p-4 rounded-[2px] fluent-box-nested border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-[2px] fluent-box-nested flex items-center justify-center text-amber-400 shrink-0">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-300">ĐÃ CHỐT NHẬN DỰ ĐOÁN (CHƯA CÔNG BỐ ĐÁP ÁN)</p>
                        <p className="text-[10px] sm:text-[11px] text-white/60">Khán giả đang chờ thí sinh trên sân khấu trả lời.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleVcnvOpen}
                      className="w-full sm:w-auto px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider transition shadow-md shadow-cyan-950 flex items-center justify-center gap-2"
                    >
                      <Play className="w-3.5 h-3.5" /> Mở lại nhận dự đoán
                    </button>
                  </div>
                )}

                {(gameState.vcnv_status === 'REVEALED' || gameState.vcnv_summary_active) && (
                  <div className="p-3 sm:p-4 rounded-[2px] fluent-box-nested border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-[2px] fluent-box-nested flex items-center justify-center text-emerald-400 shrink-0">
                        <CheckCircle2 className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-emerald-300">ĐÃ CÔNG BỐ TỪ KHÓA CHƯỚNG NGẠI VẬT</p>
                        <p className="text-[10px] sm:text-[11px] text-white/70 truncate">
                          Từ khóa chính thức: <strong className="text-white font-mono fluent-box-nested px-1.5 py-0.5 rounded-[2px]">{gameState.vcnv_keyword}</strong>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={handleVcnvLock}
                        className="w-full sm:w-auto px-3 py-1.5 fluent-box-nested hover:fluent-box-nested border border-white/20 text-white rounded-[2px] text-xs font-semibold transition text-center"
                      >
                        Quay lại Chốt (Ẩn đáp án)
                      </button>
                    </div>
                  </div>
                )}

                
                {/* Center Box Control */}
                <div className="p-3 sm:p-4 fluent-box-nested border border-white/10 rounded-[2px] space-y-2.5 sm:space-y-3">
                  <h3 className="text-xs font-mono font-bold text-amber-400">ĐIỀU KHIỂN Ô TRUNG TÂM</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                        type="button"
                        onClick={handleToggleCenterBox}
                        className={`py-2.5 sm:py-3 rounded-[2px] border text-[11px] sm:text-xs font-bold uppercase transition text-center ${
                          vcnvCenterVisible
                            ? 'fluent-box-nested border-amber-500 text-amber-300'
                            : 'fluent-box-nested border-white/10 text-white/50 hover:border-white/30'
                        }`}
                      >
                        {vcnvCenterVisible ? 'ĐÃ HIỆN Ô TRUNG TÂM' : 'HIỆN Ô TRUNG TÂM'}
                    </button>
                    <button
                        type="button"
                        onClick={handleToggleCenterAnswer}
                        className={`py-2.5 sm:py-3 rounded-[2px] border text-[11px] sm:text-xs font-bold uppercase transition text-center ${
                          vcnvCenterStatus
                            ? 'bg-green-600/20 border-green-500 text-green-300'
                            : 'fluent-box-nested border-white/10 text-white/50 hover:border-white/30'
                        }`}
                      >
                        {vcnvCenterStatus ? 'ĐÃ MỞ ĐÁP ÁN' : 'MỞ ĐÁP ÁN'}
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5 sm:gap-2 p-2.5 sm:p-3 fluent-box-nested border border-amber-500/30 rounded-[2px]">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400/80">Nhập đáp án Ô Trung Tâm (Không bắt buộc)</span>
                    <input
                      type="text"
                      value={vcnvCenterText}
                      onChange={(e) => setVcnvCenterText(e.target.value)}
                      onBlur={(e) => syncService.updateGameState({ vcnv_center_text: e.target.value })}
                      placeholder="Nhập đáp án ô trung tâm..."
                      className="w-full fluent-box-nested border border-white/10 focus:border-amber-500 rounded-[2px] px-3 py-2 text-sm sm:text-xs text-white font-mono uppercase outline-none"
                    />
                  </div>
                </div>

                {/* Clues Controls (Text & Toggle) */}
                <div className="p-3 sm:p-4 fluent-box-nested border border-white/10 rounded-[2px] space-y-2.5 sm:space-y-3">
                  <h3 className="text-xs font-mono font-bold text-blue-400">LẬT MỞ HÀNG NGANG (Bảng gợi ý)</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    {[0, 1, 2, 3].map((idx) => (
                      <div key={idx} className="flex flex-col gap-1.5 sm:gap-2 p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[2px]">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-mono uppercase tracking-wider text-white/50">Hàng ngang #{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleClue(idx)}
                            className={`px-2.5 py-1 rounded-[2px] border text-[10px] font-bold uppercase transition ${
                              (gameState.vcnv_clues || [])[idx]
                                ? 'fluent-box-nested border-blue-500 text-blue-300'
                                : 'fluent-box-nested border-white/10 text-white/50 hover:border-white/30'
                            }`}
                          >
                            {(gameState.vcnv_clues || [])[idx] ? 'ĐÃ MỞ' : 'MỞ / ẨN'}
                          </button>
                        </div>
                        <input
                          type="text"
                          value={vcnvClueTexts[idx] || ''}
                          onChange={(e) => {
                            const newTexts = [...vcnvClueTexts];
                            newTexts[idx] = e.target.value;
                            setVcnvClueTexts(newTexts);
                          }}
                          onBlur={(e) => handleUpdateClueText(idx, e.target.value)}
                          placeholder="Nhập đáp án hàng ngang..."
                          className="w-full fluent-box-nested border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-sm sm:text-xs text-white font-mono uppercase outline-none"
                        />
                      </div>
                    ))}
                  </div>
                </div>


                {/* Step 3 Input & Reveal Action */}
                <div className="p-3 sm:p-4 fluent-box-nested rounded-[2px] space-y-2.5 sm:space-y-3">
                  <label className="block text-xs font-mono text-white/80 font-semibold">
                    Cấu hình Từ khóa CNV chính xác (Dùng để so khớp khi bấm Công bố):
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={vcnvInputKeyword}
                      onChange={(e) => setVcnvInputKeyword(e.target.value)}
                      className="flex-1 fluent-box-nested border border-white/10 focus:border-cyan-500 rounded-[2px] px-3.5 py-2 sm:px-4 sm:py-2.5 text-sm text-white font-mono uppercase transition outline-none"
                      placeholder="VD: DEEPFAKE, BẢO MẬT DỮ LIỆU..."
                    />
                    <button
                      type="button"
                      onClick={handleVcnvReveal}
                      className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider shadow-lg shadow-emerald-950 transition flex items-center justify-center gap-2 shrink-0 hover-effect cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> 3. Công bố đáp án
                    </button>
                  </div>
                </div>

                {/* Top 5 Correct Leaderboard */}
                {(gameState.vcnv_status === 'REVEALED' || gameState.vcnv_summary_active) && (
                  <div className="pt-3 sm:pt-4 border-t border-white/10 space-y-2.5 sm:space-y-3 animate-fadeIn">
                    <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-2">
                      <Trophy className="w-4 h-4" /> Top 5 Khán Giả Đoán Nhanh & Chính Xác Nhất
                    </h3>
                    {top5Vcnv.length === 0 ? (
                      <p className="text-xs text-white/40 italic p-3 fluent-box-nested rounded-[2px] border border-white/10 text-center">
                        Không có khán giả nào đoán đúng từ khóa "{gameState.vcnv_keyword}".
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {top5Vcnv.map((r, i) => (
                          <div key={r.user_info.uid || i} className="flex items-center justify-between p-2.5 sm:p-3 rounded-[2px] fluent-box-nested border border-emerald-500/30">
                            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] fluent-box-nested text-emerald-400 font-bold font-mono flex items-center justify-center text-xs shrink-0">
                                #{i + 1}
                              </span>
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-white truncate">{r.user_info.name}</p>
                                <p className="text-[10px] text-white/50 font-mono">{r.user_info.mssv}</p>
                              </div>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="text-xs text-emerald-400 font-mono font-bold">{(r.latency_sec || 0).toFixed(2)}s</p>
                              <p className="text-[10px] text-white/40 font-mono uppercase">{r.choice}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MODULE: Ô MẠO HIỂM (RISK BOX - BEYOND THE INTERNET) */}
              <div className="fluent-box border-amber-500/30 rounded-[2px] p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-5 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-amber-500/20 gap-2.5 sm:gap-3">
                  <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-[2px] fluent-box-nested border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-inner shrink-0">
                      <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-xs uppercase text-amber-400 font-bold tracking-widest font-mono flex items-center gap-2">
                        Ô MẠO HIỂM (RISK BOX) • 120 ĐIỂM
                      </h3>
                      <p className="text-[10px] sm:text-[11px] text-white/50 mt-0.5">
                        10s giành quyền • 20s câu hỏi Ô Mạo Hiểm • 30s giải mã CNV
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`text-[10px] uppercase font-mono font-bold px-2.5 py-1 rounded-[2px] border ${
                      gameState.vcnv_risk_status === 'COUNTDOWN_10S'
                        ? 'fluent-box-nested text-rose-300 border-rose-500/40 animate-pulse'
                        : gameState.vcnv_risk_status === 'ACTIVE_ANSWER'
                        ? 'fluent-box-nested text-amber-300 border-amber-500/40'
                        : gameState.vcnv_risk_status === 'REVEALED'
                        ? 'fluent-box-nested text-emerald-300 border-emerald-500/40'
                        : 'fluent-box-nested text-white/40 border-white/10'
                    }`}>
                      {gameState.vcnv_risk_status === 'COUNTDOWN_10S'
                        ? 'ĐANG MỞ 10S GIÀNH QUYỀN'
                        : gameState.vcnv_risk_status === 'ACTIVE_ANSWER'
                        ? 'ĐANG TRẢ LỜI BÍ MẬT'
                        : gameState.vcnv_risk_status === 'REVEALED'
                        ? 'ĐÃ CÔNG BỐ NỘI DUNG'
                        : 'CHƯA KÍCH HOẠT'}
                    </span>
                    {gameState.vcnv_risk_status && gameState.vcnv_risk_status !== 'IDLE' && (
                      <button
                        type="button"
                        onClick={handleResetRiskBox}
                        className="px-2.5 py-1 fluent-box hover-effect text-white/70 hover:text-white rounded-[2px] text-xs font-mono transition cursor-pointer"
                      >
                        Reset Ô Mạo Hiểm
                      </button>
                    )}
                  </div>
                </div>

                {/* Risk Box Rules Summary */}
                <div className="p-3 fluent-box-nested border border-amber-500/20 rounded-[2px] text-[10px] sm:text-[11px] text-amber-200/80 leading-relaxed font-sans space-y-1">
                  <p>
                    <strong>Luật Ô Mạo Hiểm:</strong> Thí sinh trên sân khấu nhấn chuông/nút để chọn giải Ô Mạo Hiểm.
                  </p>
                  <p>
                    Thời gian: <strong>20s cho câu hỏi Ô Mạo Hiểm</strong>, <strong>30s cho Chướng Ngại Vật</strong>. Đúng nhận <strong>120 điểm</strong>. Sai bị trừ 1/2 số điểm & mất quyền thi phần này.
                  </p>
                  <p className="text-[10px] text-amber-400/80 italic">
                    * Câu hỏi Ô Mạo Hiểm sẽ hiển thị trực tiếp trên máy khán giả để khán giả theo dõi và tham gia gửi dự đoán chính xác.
                  </p>
                </div>

                {/* Edit Risk Box Content */}
                <div className="space-y-2.5 sm:space-y-3">
                  <div>
                    <label className="block text-xs font-mono text-white/70 mb-1">
                      Nội dung Câu hỏi / Gợi ý Ô Mạo Hiểm:
                    </label>
                    <textarea
                      rows={2}
                      value={riskQuestionInput}
                      onChange={(e) => setRiskQuestionInput(e.target.value)}
                      className="w-full fluent-box border border-white/10 focus:border-amber-500 rounded-[2px] px-3 py-2 text-sm sm:text-xs text-white outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                    <div>
                      <label className="block text-xs font-mono text-white/70 mb-1">
                        Đáp án Ô Mạo Hiểm:
                      </label>
                      <input
                        type="text"
                        value={riskAnswerInput}
                        onChange={(e) => setRiskAnswerInput(e.target.value)}
                        className="w-full fluent-box border border-white/10 focus:border-amber-500 rounded-[2px] px-3 py-2 text-sm sm:text-xs text-white font-mono uppercase outline-none"
                      />
                    </div>

                    {/* Stage Contestant Name Input */}
                    <div>
                      <label className="block text-xs font-mono text-white/70 mb-1">
                        Tên thí sinh / Đội chọn Ô Mạo Hiểm:
                      </label>
                      <input
                        type="text"
                        value={stageContestantName}
                        onChange={(e) => setStageContestantName(e.target.value)}
                        placeholder="Thí sinh số 1..."
                        className="w-full fluent-box border border-white/10 focus:border-amber-500 rounded-[2px] px-3 py-2 text-sm sm:text-xs text-white font-mono outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Risk Box Action Buttons */}
                <div className="space-y-2 pt-1 sm:pt-2">
                  <div className="flex flex-col sm:flex-row flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleContestantPressRisk()}
                      className="w-full sm:w-auto px-3.5 py-2.5 sm:px-5 sm:py-2.5 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-[2px] text-xs uppercase tracking-wider transition shadow-lg flex items-center justify-center gap-2 hover-effect cursor-pointer"
                    >
                      <Zap className="w-4 h-4 fill-current" /> 1. Kích hoạt Ô Mạo Hiểm
                    </button>

                    <button
                      type="button"
                      onClick={handleStart15sRiskBox}
                      className="w-full sm:w-auto px-3.5 py-2 sm:px-4 sm:py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 hover-effect cursor-pointer"
                      title="Bắt đầu chạy đếm ngược 15 giây"
                    >
                      <Clock className="w-4 h-4" /> Bắt đầu 15s Đếm Ngược
                    </button>

                    <button
                      type="button"
                      onClick={handleBranch1Win}
                      className="w-full sm:w-auto px-3.5 py-2 sm:px-4 sm:py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 hover-effect cursor-pointer"
                    >
                      <CheckCircle2 className="w-4 h-4" /> 2. [Nhánh 1] Thí sinh Đúng
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleBranch2Freeze}
                      className="w-full sm:w-auto px-3.5 py-2 sm:px-4 sm:py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-blue-950/50 hover-effect cursor-pointer"
                    >
                      <Lock className="w-4 h-4" /> 3. [Nhánh 2] Thí sinh Sai / Đóng Băng
                    </button>

                    <button
                      type="button"
                      onClick={handleRevealRiskBox}
                      className="w-full sm:w-auto px-3.5 py-2 sm:px-4 sm:py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-[2px] text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50 animate-fadeIn hover-effect cursor-pointer"
                    >
                      <Eye className="w-4 h-4" /> 4. Công bố đáp án Ô Mạo Hiểm
                    </button>
                  </div>
                </div>

                {/* Real-time Audience Predictions for Risk Box */}
                <div className="pt-3 border-t border-white/10 space-y-2.5 sm:space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest font-mono flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" /> Khán Giả Dự Đoán Ô Mạo Hiểm ({riskSubmissions.length} lượt nộp)
                    </h4>
                    {riskSubmissions.length > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 fluent-box-nested text-amber-300 rounded-[2px] border border-amber-500/30">
                        {riskSubmissions.length} phiếu
                      </span>
                    )}
                  </div>

                  {riskWordDistribution.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {riskWordDistribution.map((item, i) => (
                        <div key={i} className="p-2 sm:p-2.5 fluent-box-nested border border-amber-500/20 rounded-[2px] flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-white truncate max-w-[100px] sm:max-w-[120px]">
                            {item.word}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 fluent-box-nested text-amber-300 rounded-[2px] font-bold">
                            {item.count} ({Math.round((item.count / riskSubmissions.length) * 100)}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-white/30 italic p-3 fluent-box-nested rounded-[2px] border border-white/5 text-center">
                      (Chưa có khán giả nào gửi dự đoán Ô Mạo Hiểm)
                    </p>
                  )}

                  {/* Top 5 Correct Audience for Risk Box when Revealed */}
                  {gameState.vcnv_risk_status === 'REVEALED' && (
                    <div className="mt-3 sm:mt-4 pt-3 border-t border-emerald-500/20 space-y-2.5 sm:space-y-3 animate-fadeIn">
                      <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-widest font-mono flex items-center gap-2">
                        <Trophy className="w-4 h-4" /> Top 5 Khán Giả Đoán Đúng Ô Mạo Hiểm Nhanh Nhất
                      </h4>
                      {top5Risk.length === 0 ? (
                        <p className="text-xs text-white/40 italic p-3 fluent-box-nested rounded-[2px] border border-white/10 text-center">
                          Không có khán giả nào đoán đúng đáp án Ô Mạo Hiểm "{gameState.vcnv_risk_answer}".
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {top5Risk.map((r, i) => (
                            <div key={r.user_info.uid || i} className="flex items-center justify-between p-2.5 sm:p-3 rounded-[2px] fluent-box-nested border border-emerald-500/30">
                              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] fluent-box-nested text-emerald-400 font-bold font-mono flex items-center justify-center text-xs shrink-0">
                                  #{i + 1}
                                </span>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{r.user_info.name}</p>
                                  <p className="text-[10px] text-white/50 font-mono">{r.user_info.mssv}</p>
                                </div>
                              </div>
                              <div className="text-right shrink-0 ml-2">
                                <p className="text-xs text-emerald-400 font-mono font-bold">{(r.latency_sec || 0).toFixed(2)}s</p>
                                <p className="text-[10px] text-white/40 font-mono uppercase">{r.choice}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* Core Stage Control - Show for KDC, TT, VD */}
          {activeAdminTab !== 'VCNV' && (
            <>
              {/* Bento Block 1: Current Question Payload */}
              <section className="fluent-question-box p-3 sm:p-4 md:p-6 relative space-y-3 sm:space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 pb-3 border-b border-white/10">
                  <div className="min-w-0">
                    <h2 className="text-[10px] uppercase text-[#F7CAC9] font-bold tracking-widest">
                      Current Question Payload
                    </h2>
                    <span className="text-blue-300 font-mono text-xs font-bold truncate block">
                      [{gameState.question_id}] {gameState.round_name}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Fast Question Navigation Buttons */}
                    <div className="flex items-center gap-1 fluent-box-nested p-0.5 rounded-[2px]">
                      <button
                        type="button"
                        onClick={handleNavigatePrevQuestion}
                        className="px-2 py-1 hover:bg-white/10 text-white/70 hover:text-white rounded-[2px] text-xs font-medium flex items-center gap-1 transition"
                        title="Nạp câu hỏi trước đó (Phím tắt: ← hoặc P)"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline text-[11px]">Câu trước</span>
                        <kbd className="px-1 text-[9px] font-mono bg-white/10 rounded-[2px] border border-white/10">←</kbd>
                      </button>

                      <div className="h-3 w-px bg-white/10" />

                      <button
                        type="button"
                        onClick={handleNavigateNextQuestion}
                        className="px-2 py-1 hover:bg-white/10 text-white/70 hover:text-white rounded-[2px] text-xs font-medium flex items-center gap-1 transition"
                        title="Nạp câu hỏi tiếp theo (Phím tắt: → hoặc N)"
                      >
                        <span className="hidden sm:inline text-[11px]">Câu tiếp</span>
                        <kbd className="px-1 text-[9px] font-mono bg-white/10 rounded-[2px] border border-white/10">→</kbd>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Live Question Upvotes from Audience */}
                    <div
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[2px] text-xs font-mono font-bold border transition ${
                        (gameState.question_likes?.[gameState.question_id] || 0) > 0
                          ? 'bg-rose-950/60 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-950/50'
                          : 'fluent-box-nested text-white/50 border-white/10'
                      }`}
                      title="Số lượng khán giả đã thả tim / thích câu hỏi này"
                    >
                      <Heart className={`w-3.5 h-3.5 ${(gameState.question_likes?.[gameState.question_id] || 0) > 0 ? 'fill-rose-400 text-rose-400 animate-pulse' : 'text-white/40'}`} />
                      <span>{gameState.question_likes?.[gameState.question_id] || 0} Tim</span>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-[2px] uppercase tracking-wider ${
                        gameState.status === 'ACTIVE'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40 animate-pulse'
                          : gameState.status === 'LOCKED'
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-500/40'
                          : gameState.status === 'REVEAL'
                          ? 'bg-blue-950/60 text-blue-400 border border-blue-500/40'
                          : 'fluent-box-nested text-white/50 border border-white/10'
                      }`}
                    >
                      State: {gameState.status}
                    </span>
                  </div>
                </div>

                {/* Question Text */}
                <div>
                  <h3 className="text-base sm:text-lg md:text-xl font-semibold leading-snug text-white break-words">
                    {gameState.question_text || '(Đang ở chế độ Chờ / Quan sát diễn biến sân khấu)'}
                  </h3>
                  {activeAdminTab === 'KDC' && (
                    <div className="mt-2 text-[10px] text-amber-400 font-mono fluent-box-nested inline-block px-2 py-1 rounded-[2px] border border-amber-500/20 break-words">
                      💡 Mẹo Hotkey: Nhấn <strong className="text-white underline">SPACE</strong> để chuyển vòng luồng (Bắt đầu ➔ Khóa ➔ Công bố). Nhấn <strong className="text-white underline">→</strong> để sang câu tiếp theo.
                    </div>
                  )}
                </div>

                {/* Options Bento Grid */}
                {Object.keys(gameState.options || {}).length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 pt-1">
                    {Object.entries(gameState.options).map(([k, text]) => {
                      const isElim = gameState.eliminated_options?.includes(k);
                      const isCorrect = gameState.status === 'REVEAL' && gameState.correct_key === k;
                      return (
                        <div
                          key={k}
                          className={`p-3 sm:p-3.5 rounded-[2px] border transition ${
                            isCorrect
                              ? 'fluent-box-nested border-emerald-500/60 text-emerald-300 ring-1 ring-emerald-500/40'
                              : isElim
                              ? 'fluent-box-nested opacity-30 line-through border-white/5'
                              : 'fluent-box border-white/10 text-white/90'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-[#F7CAC9] font-mono font-bold">Option {k}</span>
                            {gameState.round_type === 'ELIMINATION_6' && (
                              <button
                                onClick={() => handleToggleEliminateOption(k)}
                                className={`text-[9px] px-1.5 py-0.5 rounded-[2px] font-mono ${
                                  isElim
                                    ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/40'
                                    : 'bg-rose-950/60 text-rose-400 border border-rose-500/40'
                                }`}
                              >
                                {isElim ? 'RESTORE' : 'ELIMINATE'}
                              </button>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm font-semibold break-words">{text}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Auto-Clear Responses Toggle & Quick Reset Toolbar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[2px]">
                  <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={handleToggleAutoClearResponses}
                      className={`px-3 py-1.5 rounded-[2px] text-xs font-mono font-bold flex items-center justify-between sm:justify-start gap-2 transition border ${
                        autoClearResponses
                          ? 'fluent-box-nested border-emerald-500/40 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'fluent-box-nested border-white/10 text-white/50 hover:text-white/80'
                      }`}
                      title="Tự động xóa sạch phản hồi khán giả khi Admin nạp hoặc chuyển sang câu hỏi tiếp theo (Phím tắt: Shift + C)"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Trash2 className={`w-3.5 h-3.5 shrink-0 ${autoClearResponses ? 'text-emerald-400' : 'text-white/40'}`} />
                        <span className="font-sans font-medium text-[11px] sm:text-xs truncate">Tự động xóa khi đổi câu:</span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={`px-1.5 py-0.5 rounded-[2px] text-[10px] uppercase font-bold tracking-wider ${
                          autoClearResponses ? 'fluent-box-nested text-emerald-200' : 'fluent-box-nested text-white/50'
                        }`}>
                          {autoClearResponses ? 'BẬT' : 'TẮT'}
                        </span>
                        <span className={`w-2 h-2 rounded-[2px] ${autoClearResponses ? 'bg-emerald-400 animate-pulse' : 'bg-white/30'}`} />
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearCurrentResponses}
                      className="px-3 py-1.5 fluent-box-nested hover:fluent-box-nested text-rose-300 border border-rose-500/30 rounded-[2px] text-xs font-mono font-semibold flex items-center justify-center gap-1.5 transition"
                      title="Xóa thủ công toàn bộ phản hồi của câu hỏi hiện tại"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                      <span>Xóa phản hồi câu này ({totalCurrentVotes})</span>
                    </button>
                  </div>

                  <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-white/40">
                    <span>Phím tắt:</span>
                    <kbd className="px-1.5 py-0.5 fluent-box-nested border border-white/10 rounded-[2px] text-white/60">Shift + C</kbd>
                  </div>
                </div>

              </section>

              {/* Bento Block 1.5: Host Pacing Control & Telemetry Meter */}
              <HostPacingWidget
                submittedCount={totalCurrentVotes}
                totalCount={Math.max(activeCount, totalCurrentVotes, 1)}
                percent={Math.round((totalCurrentVotes / Math.max(activeCount, totalCurrentVotes, 1)) * 100)}
                isGameActive={gameState.status === 'ACTIVE'}
                settings={pacingSettings}
                onUpdateSettings={handleUpdatePacingSettings}
                recentPacingEvents={recentPacingHistory}
                onQuickLock={handleLockVoting}
              />

              {/* Bento Block 2: Master Action Controls & MC Workflow Stepper */}
              <section className="fluent-box-nested border border-white/10 rounded-[2px] p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                <GlobalTimerWidget
                  gameState={gameState}
                  onStartQuestion={handleStartQuestion}
                  onLockVoting={handleLockVoting}
                  onRevealResults={handleRevealResults}
                  onReturnToStandby={handleReturnToStandby}
                  onEliminateRandom2={handleEliminateRandom2Options}
                  autoEliminateEvery10s={autoEliminateEvery10s}
                  onToggleAutoEliminate={() => setAutoEliminateEvery10s(!autoEliminateEvery10s)}
                  onTriggerHudToast={triggerHudToast}
                />
              </section>
            </>
          )}



        </div>

        {/* Right Column (5 cols): Question Bank filtered by Tab */}
        <div className="w-full lg:col-span-5 space-y-3 sm:space-y-4 md:space-y-6 min-w-0">
          {/* VCNV DEDICATED RIGHT PANEL: Realtime Predictions & Keywords Feed */}
          {activeAdminTab === 'VCNV' && (
            <section className="fluent-box-nested border border-white/10 rounded-[2px] p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-xs uppercase text-cyan-400 font-bold tracking-widest font-mono">
                    Dự Đoán Khán Giả Realtime
                  </h2>
                  <p className="text-[10px] sm:text-[11px] text-white/50 mt-0.5">
                    Danh sách phản hồi gửi về trực tiếp
                  </p>
                </div>
                <span className="text-[10px] sm:text-[11px] font-mono font-bold fluent-box-nested text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-[2px]">
                  {vcnvAllSubmissions.length} lượt gửi
                </span>
              </div>

              {/* Word Frequency Distribution */}
              {vcnvWordDistribution.length > 0 && (
                <div className="p-2.5 sm:p-3 fluent-box-nested border border-white/10 rounded-[2px] space-y-2">
                  <p className="text-[10px] uppercase font-mono text-white/40 font-bold">
                    Top từ khóa khán giả dự đoán:
                  </p>
                  <div className="flex overflow-x-auto custom-scrollbar gap-2 pb-1 whitespace-nowrap">
                    {vcnvWordDistribution.map(item => (
                      <span
                        key={item.word}
                        className={`px-2.5 py-1 rounded-[2px] text-xs font-mono font-bold border ${
                          gameState.vcnv_summary_active && normalizeVcnvAnswer(item.word) === normalizeVcnvAnswer(gameState.vcnv_keyword)
                            ? 'fluent-box-nested text-emerald-300 border-emerald-500/40'
                            : 'fluent-box-nested text-white/80 border-white/10'
                        }`}
                      >
                        {item.word} <span className="text-[10px] opacity-60">({item.count})</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Search & List */}
              <div className="relative">
                <Search className="w-4 h-4 text-[#F7CAC9] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Tìm kiếm theo Tên, MSSV, hoặc Từ khóa..."
                  value={vcnvSearch}
                  onChange={(e) => setVcnvSearch(e.target.value)}
                  className="w-full fluent-box-nested border border-white/10 focus:border-cyan-500 pl-9 pr-8 py-2 rounded-[2px] text-base sm:text-xs text-white outline-none transition placeholder:text-white/30"
                />
                {vcnvSearch && (
                  <button
                    type="button"
                    onClick={() => setVcnvSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-white/40 hover:text-white p-0.5 rounded-[2px] cursor-pointer"
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="space-y-2 max-h-[380px] sm:max-h-[420px] overflow-y-auto pr-1">
                {filteredVcnvSubmissions.length === 0 ? (
                  <div className="p-6 sm:p-8 text-center text-white/30 text-xs font-sans">
                    Chưa có dự đoán nào được gửi từ khán giả
                  </div>
                ) : (
                  filteredVcnvSubmissions.map((r, idx) => {
                    const isCorrect = gameState.vcnv_summary_active && normalizeVcnvAnswer(r.choice) === normalizeVcnvAnswer(gameState.vcnv_keyword);
                    return (
                      <div
                        key={r.user_info?.uid || idx}
                        className={`p-2.5 sm:p-3 rounded-[2px] border transition flex items-center justify-between ${
                          isCorrect
                            ? 'fluent-box-nested border-emerald-500/40 text-emerald-200'
                            : 'fluent-box-nested border-white/10 text-white/90 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
                          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-[2px] flex items-center justify-center text-xs font-mono font-bold shrink-0 ${
                            isCorrect ? 'fluent-box-nested text-emerald-300' : 'fluent-box-nested text-white/60'
                          }`}>
                            #{filteredVcnvSubmissions.length - idx}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-xs font-bold text-white truncate">{r.user_info?.name || 'Khán giả'}</p>
                              <span className="text-[10px] text-white/40 font-mono shrink-0">{r.user_info?.mssv || 'N/A'}</span>
                            </div>
                            <p className="text-xs font-mono font-bold text-cyan-300 uppercase mt-0.5 truncate">
                              {r.choice}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          <span className="text-[10px] text-white/40 font-mono block">
                            {(r.latency_sec || 0).toFixed(2)}s
                          </span>
                          {gameState.vcnv_summary_active && (
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-[2px] font-mono ${
                              isCorrect ? 'fluent-box-nested text-emerald-400' : 'fluent-box-nested text-rose-400'
                            }`}>
                              {isCorrect ? 'Đúng' : 'Sai'}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          )}

          {activeAdminTab !== 'VCNV' && (
            <section className="fluent-box-nested border border-white/10 rounded-[2px] p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-white/10">
                <div>
                  <h2 className="text-[10px] uppercase text-white/40 font-bold tracking-widest">
                    Question Bank Filtered
                  </h2>
                </div>
              </div>

              <div className="space-y-2 max-h-[380px] sm:max-h-[500px] overflow-y-auto pr-1">
                {questionBank
                  .filter(q => {
                    if (activeAdminTab === 'KDC') return q.round_name.includes('Khởi động') || q.id.startsWith('KDC');
                    
                    if (activeAdminTab === 'TT') return q.round_name.includes('Tăng tốc') || q.id.startsWith('TT');
                    if (activeAdminTab === 'VD') return q.round_name.includes('Về đích') || q.id.startsWith('VD');
                    return true;
                  })
                  .map((q) => {
                  const isCurrent = gameState.question_id === q.id;
                  return (
                    <div
                      key={q.id}
                      className={`p-2.5 sm:p-3 rounded-[2px] border transition-all ${
                        isCurrent
                          ? 'fluent-box-nested border-blue-500/50 ring-1 ring-blue-500/40'
                          : 'fluent-box-nested border-white/10 hover:border-white/20'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-blue-400">
                          {q.id}
                        </span>
                        <span className="text-[10px] text-white/40 font-mono">
                          {q.time_limit}s
                        </span>
                      </div>
                      <p className="text-xs text-white/80 line-clamp-2 mb-2 font-medium break-words">
                        {q.question_text}
                      </p>

                      <div className="flex items-center justify-between pt-1 border-t border-white/5 gap-2">
                        <span className="text-[10px] text-emerald-400 font-mono truncate">
                          Key: [{q.correct_key || 'N/A'}]
                        </span>

                        <button
                          onClick={() => handleLoadQuestion(q.id)}
                          disabled={isCurrent}
                          className={`px-2.5 py-1 rounded-[2px] text-[10px] font-bold uppercase tracking-wider transition shrink-0 ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : 'fluent-box-nested hover:fluent-box-nested text-white/80'
                          }`}
                        >
                          {isCurrent ? 'Đang chạy' : 'Nạp câu này'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* Realtime Live Audience Answer Distribution Chart (Recharts Interactive Pie/Donut Chart) */}
          {activeAdminTab !== 'VCNV' && (
            <AudienceAnswerDistributionChart
              gameState={gameState}
              responses={currentResponses}
              totalAudienceCount={activeCount}
            />
          )}
        </div>
      </div>
      )}
      </div>

      {/* Bento Footer */}
      <footer className="pt-4 flex flex-wrap justify-between items-center text-[10px] text-white/20 font-mono border-t border-white/5">
        <span>ENVIRONMENT: PRODUCTION-A</span>
        <span>ENCRYPTION: AES-256-GCM</span>
        <span>FIREBASE_CLUSTER: VN-SOUTH-1</span>
      </footer>

      {/* Modals are kept below as they are absolute */}
      {/* MODAL: Audience QR Code Display (Bento Style & Master Broadcast Controller) */}
      {gameState.show_qr && (
        <div 
          className="fluent-dialog-overlay animate-fadeIn z-[999999] p-2 sm:p-4 md:p-6 flex flex-col items-center justify-center overflow-y-auto"
          onMouseMove={handleQrUserActivity}
          onTouchStart={handleQrUserActivity}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleToggleLiveQrModal(false);
            }
          }}
        >
          <div 
            className="w-full fluent-box border rounded-[4px] text-center text-[#e5e5e5] shadow-2xl shadow-sky-950/80 relative overflow-y-auto transition-all duration-300 max-w-4xl lg:max-w-5xl max-h-[92vh] border-sky-500/40 p-4 sm:p-6 my-auto"
            onMouseMove={handleQrUserActivity}
            onTouchStart={handleQrUserActivity}
            onClick={(e) => {
              e.stopPropagation();
              handleQrUserActivity();
            }}
          >
            {/* Top Bar with Status, Diagnostic Trigger, Timeout Countdown & Close Button */}
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10 gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2.5 h-2.5 rounded-[2px] bg-emerald-400 animate-ping shrink-0" />
                <span className="text-[11px] font-mono font-bold text-emerald-300 uppercase tracking-wider truncate">
                  Đang Chiếu Toàn Mạng (Live Broadcast)
                </span>
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                {/* QR Service Diagnostic Telemetry Trigger */}
                <button
                  type="button"
                  id="btn-admin-qr-toggle-diagnostics"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    setShowAdminQrDiagnostics(prev => {
                      const next = !prev;
                      triggerHudToast('D', next ? 'Mở Chẩn Đoán QR' : 'Đóng Chẩn Đoán QR');
                      return next;
                    });
                  }}
                  className={`flex items-center gap-1 px-2 py-1 rounded-[2px] font-mono text-[11px] font-bold transition active:scale-95 cursor-pointer border ${
                    showAdminQrDiagnostics
                      ? 'bg-sky-500 text-black border-sky-300 shadow-md shadow-sky-500/30 ring-1 ring-sky-300'
                      : adminQrDiagnosticData.status === 'error'
                      ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
                      : 'bg-white/10 hover:bg-white/20 text-sky-300 border-sky-400/30'
                  }`}
                  title="Mở bảng kiểm tra chẩn đoán & trạng thái dịch vụ tạo QR (Phím D)"
                >
                  <Activity className={`w-3.5 h-3.5 ${showAdminQrDiagnostics ? 'text-black animate-pulse' : 'text-sky-300'}`} />
                  <span className="hidden sm:inline">Chẩn Đoán (Phím D)</span>
                  <span className="sm:hidden">Debug</span>
                </button>

                {qrAutoCloseSeconds > 0 && (
                  <div 
                    id="badge-qr-auto-close-countdown"
                    className={`flex items-center gap-1 px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold border transition ${
                      isQrTimeoutPaused
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : qrRemainingTime <= 10
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : 'bg-sky-500/20 text-sky-300 border-sky-500/30'
                    }`}
                    title={isQrTimeoutPaused ? 'Đếm ngược đang tạm dừng' : `Tự động đóng sau ${qrRemainingTime} giây không hoạt động`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{isQrTimeoutPaused ? 'TẠM DỪNG' : `${qrRemainingTime}s`}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => handleToggleLiveQrModal(false)}
                  className="p-1 text-white/50 hover:text-white fluent-box-nested hover:fluent-box-nested rounded-[2px] transition cursor-pointer"
                  title="Đóng cửa sổ (Phím tắt: ESC hoặc Q)"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <h3 className="text-lg font-bold text-white uppercase tracking-wider mb-1 flex items-center justify-center gap-2">
              <QrCode className="w-5 h-5 text-sky-400" />
              Mã QR Quét Tham Gia Trực Tiếp
            </h3>
            <p className="text-xs text-white/50 mb-3">
              Khán giả quét mã trên điện thoại để vào tham gia trả lời câu hỏi và bình chọn
            </p>

            {/* Mode Switcher Tabs: Active QR vs QR History (Last 5 Generated Versions) vs Scan Trends */}
            <div className="flex items-center justify-center gap-1.5 p-1 mb-3.5 bg-black/40 border border-white/10 rounded-[2px]">
              <button
                type="button"
                id="btn-tab-active-qr"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setQrModalTab('active');
                  setShowQrHistoryTab(false);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-[2px] font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  qrModalTab === 'active' && !showQrHistoryTab
                    ? 'bg-sky-500/25 text-sky-200 border border-sky-400/50 shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-sky-400" />
                <span>Mã QR Hiện Tại</span>
              </button>

              <button
                type="button"
                id="btn-tab-qr-history"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setQrModalTab('history');
                  setShowQrHistoryTab(true);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-[2px] font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  qrModalTab === 'history' || showQrHistoryTab
                    ? 'bg-amber-500/25 text-amber-200 border border-amber-400/50 shadow-sm'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <History className="w-3.5 h-3.5 text-amber-400" />
                <span>Lịch Sử ({Array.isArray(gameState.qr_history) ? gameState.qr_history.length : 0}/5)</span>
              </button>

              <button
                type="button"
                id="btn-tab-qr-trends"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setQrModalTab('trends');
                  setShowQrHistoryTab(false);
                }}
                className={`flex-1 py-1.5 px-2.5 rounded-[2px] font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                  qrModalTab === 'trends'
                    ? 'bg-gradient-to-r from-cyan-500/30 to-sky-500/30 text-cyan-200 border border-cyan-400/50 shadow-sm ring-1 ring-cyan-400/30'
                    : 'text-white/60 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>Xu Hướng Quét</span>
              </button>
            </div>

            {/* TAB CONTENT: TRENDS VIEW vs HISTORY VIEW vs ACTIVE QR VIEW */}
            {qrModalTab === 'trends' ? (
              <div className="animate-fadeIn">
                <QrScanTrendsChart
                  gameState={gameState}
                  onBackToCurrentQr={() => {
                    setQrModalTab('active');
                    setShowQrHistoryTab(false);
                  }}
                  onBackToHistory={() => {
                    setQrModalTab('history');
                    setShowQrHistoryTab(true);
                  }}
                />
              </div>
            ) : (showQrHistoryTab || qrModalTab === 'history') ? (
              <div className="animate-fadeIn space-y-3">
                {/* History Header & Summary */}
                <div className="p-3 rounded-[2px] bg-gradient-to-br from-amber-950/40 via-purple-950/30 to-black/50 border border-amber-500/40 text-left shadow-lg shadow-amber-950/30">
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 rounded-[2px] bg-amber-500/20 border border-amber-400/40 text-amber-300">
                        <History className="w-4 h-4 text-amber-400" />
                      </div>
                      <div>
                        <h4 className="text-xs font-mono font-bold text-amber-200 uppercase tracking-wider">
                          Lịch Sử 5 Phiên Bản Mã QR Gần Nhất
                        </h4>
                        <p className="text-[10px] text-white/50">
                          Tự động lưu trữ 5 phiên bản QR (màu sắc, kích thước, nền, caption) và khôi phục tức thì
                        </p>
                      </div>
                    </div>
                    {Array.isArray(gameState.qr_history) && gameState.qr_history.length > 0 && (
                      <button
                        type="button"
                        id="btn-clear-all-qr-history"
                        onClick={handleClearQrHistory}
                        className="px-2 py-1 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
                        title="Xóa toàn bộ các bản ghi lịch sử QR"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Xóa Lịch Sử</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* History Items List */}
                {(!Array.isArray(gameState.qr_history) || gameState.qr_history.length === 0) ? (
                  <div className="p-8 text-center border border-white/10 rounded-[2px] bg-black/30 fluent-box">
                    <History className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="text-xs text-white/60 font-mono">Chưa có lịch sử mã QR nào được lưu trữ.</p>
                    <p className="text-[10px] text-white/40 mt-1">
                      Khi bạn tùy chỉnh bảng màu, kích thước, nền hoặc tiêu đề phụ, hệ thống sẽ tự động lưu 5 phiên bản gần nhất tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 text-left max-h-[50vh] overflow-y-auto pr-1">
                    {gameState.qr_history.map((item, idx) => {
                      const isCurrentActive = 
                        item.palette === (gameState.qr_color_palette || 'purple_gold') &&
                        item.size === (gameState.qr_code_size || 280) &&
                        Boolean(item.transparentBg) === Boolean(gameState.qr_transparent_bg) &&
                        (item.caption || '') === (gameState.qr_custom_caption || '');

                      const paletteObj = QR_PALETTES[item.palette as QrPaletteId] || QR_PALETTES.purple_gold;
                      
                      const formattedTime = (() => {
                        if (!item.timestamp) return '';
                        const d = new Date(item.timestamp);
                        const hours = String(d.getHours()).padStart(2, '0');
                        const minutes = String(d.getMinutes()).padStart(2, '0');
                        const seconds = String(d.getSeconds()).padStart(2, '0');
                        const day = String(d.getDate()).padStart(2, '0');
                        const month = String(d.getMonth() + 1).padStart(2, '0');
                        return `${hours}:${minutes}:${seconds} - ${day}/${month}`;
                      })();

                      return (
                        <div
                          key={item.id || `qr_hist_${idx}`}
                          className={`p-2.5 rounded-[2px] border transition-all duration-150 relative overflow-hidden ${
                            isCurrentActive
                              ? 'bg-gradient-to-r from-sky-950/70 via-purple-950/50 to-black/70 border-sky-400/60 ring-1 ring-sky-400/40 shadow-md shadow-sky-950/40'
                              : 'bg-black/40 border-white/10 hover:border-white/25 hover:bg-white/5'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* Thumbnail QR Preview */}
                            <div 
                              className={`w-14 h-14 rounded-[2px] border p-0.5 shrink-0 flex items-center justify-center relative overflow-hidden shadow-inner ${
                                item.transparentBg
                                  ? 'bg-[linear-gradient(45deg,#242424_25%,transparent_25%),linear-gradient(-45deg,#242424_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#242424_75%)] bg-[size:6px_6px] bg-[#141414] border-emerald-400/40'
                                  : 'bg-white border-white/20'
                              }`}
                            >
                              {item.dataUrl ? (
                                <img 
                                  src={item.dataUrl} 
                                  alt={`QR Version ${idx + 1}`} 
                                  className="w-full h-full object-contain cursor-pointer hover:scale-105 transition"
                                  onClick={() => setInspectHistoryItem(item)}
                                  title="Nhấn để xem chi tiết ảnh phóng to"
                                />
                              ) : (
                                <QrCode className="w-6 h-6 text-sky-400/50" />
                              )}
                            </div>

                            {/* Information / Details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1 flex-wrap mb-1">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-[2px] bg-white/10 text-white/90 shrink-0">
                                    #{idx + 1}
                                  </span>
                                  <span className="text-xs font-mono font-bold text-white truncate flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full shrink-0 border border-white/30" style={{ backgroundColor: paletteObj.dotColor }} />
                                    <span className="truncate">{paletteObj.labelVi}</span>
                                  </span>
                                </div>

                                {/* Timestamp Badge */}
                                <span className="text-[10px] font-mono text-white/50 flex items-center gap-1 shrink-0">
                                  <Clock className="w-2.5 h-2.5 text-amber-400/70" />
                                  {formattedTime}
                                </span>
                              </div>

                              {/* Specs chips */}
                              <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono text-white/70 mb-1">
                                <span className="px-1.5 py-0.2 rounded-[2px] bg-black/40 border border-white/10">
                                  {item.size}px
                                </span>
                                <span className={`px-1.5 py-0.2 rounded-[2px] border ${
                                  item.transparentBg
                                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                                    : 'bg-white/5 text-white/60 border-white/10'
                                }`}>
                                  {item.transparentBg ? 'Nền trong suốt' : 'Nền đặc'}
                                </span>
                              </div>

                              {/* Custom Caption display if present */}
                              {item.caption && (
                                <div className="text-[10px] font-mono text-amber-200/90 truncate flex items-center gap-1 bg-amber-950/30 px-1.5 py-0.5 rounded-[2px] border border-amber-400/20">
                                  <Sparkles className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                                  <span className="truncate">"{item.caption}"</span>
                                </div>
                              )}
                            </div>

                            {/* Action: Restore or Active indicator */}
                            <div className="shrink-0 pl-1">
                              {isCurrentActive ? (
                                <div className="px-2 py-1 rounded-[2px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 font-mono text-[10px] font-bold flex items-center gap-1 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                                  <span>Đang Dùng</span>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  id={`btn-restore-qr-history-${idx}`}
                                  onClick={() => handleRestoreQrVersion(item)}
                                  className="px-2.5 py-1.5 rounded-[2px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs flex items-center gap-1.5 transition active:scale-95 shadow-md shadow-amber-950/40 cursor-pointer"
                                  title="Khôi phục lại phiên bản mã QR và bảng màu này"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Khôi phục</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Bottom Navigation Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      setQrModalTab('active');
                      setShowQrHistoryTab(false);
                    }}
                    className="w-full py-2 px-3 rounded-[2px] border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>Quay lại Mã QR Hiện Tại</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      setQrModalTab('trends');
                      setShowQrHistoryTab(false);
                    }}
                    className="w-full py-2 px-3 rounded-[2px] border border-cyan-400/40 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 hover:from-cyan-500/30 hover:to-sky-500/30 text-cyan-200 font-mono text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Xem Xu Hướng Quét</span>
                  </button>
                </div>
              </div>
            ) : (
              /* TAB CONTENT 3: ACTIVE LIVE QR VIEW & CONTROLS */
              <div className="space-y-4">
                {/* Standard / Expanded Modal View (Spacious 2-column layout on md+) */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start text-left">
                  {/* LEFT COLUMN: Dynamic QR Code Presentation & Primary Actions */}
                  <div className="md:col-span-5 flex flex-col items-center justify-start p-4 rounded-[2px] bg-black/40 border border-white/10 shadow-inner space-y-3">
                      {/* Dynamic QR Code Container with Sizing Preview & Broadcast Transparency Checkerboard */}
                      <div 
                        className={`p-3.5 sm:p-4 rounded-[2px] inline-block shadow-2xl border-2 border-sky-400/50 animate-qr-entrance transition-all duration-300 ease-out max-w-full overflow-hidden relative ${
                          gameState.qr_transparent_bg 
                            ? 'bg-[linear-gradient(45deg,#242424_25%,transparent_25%),linear-gradient(-45deg,#242424_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#242424_75%)] bg-[size:16px_16px] bg-[#141414] ring-1 ring-emerald-400/30' 
                            : 'bg-white'
                        }`}
                        style={{ maxWidth: '100%' }}
                      >
                        <CrossFadeQrCode
                          dataUrl={qrDataUrl}
                          alt="QR Code Khán Giả"
                          style={{
                            width: `${Math.min(adminQrSize, 340)}px`,
                            height: `${Math.min(adminQrSize, 340)}px`,
                            maxWidth: '75vw',
                            maxHeight: '44vh',
                          }}
                          loadingFallback={
                            <div 
                              className="fluent-box-nested rounded-[2px] mx-auto flex items-center justify-center text-xs text-white/40 font-mono"
                              style={{
                                width: `${Math.min(adminQrSize, 340)}px`,
                                height: `${Math.min(adminQrSize, 340)}px`
                              }}
                            >
                              Đang tạo mã QR...
                            </div>
                          }
                        />
                      </div>

                      {/* Custom Short Caption Display below the QR Code */}
                      {(adminQrCaption || gameState.qr_custom_caption) && (
                        <div 
                          id="qr-modal-displayed-caption"
                          className="px-3 py-1.5 rounded-[2px] bg-gradient-to-r from-sky-950/90 via-indigo-950/90 to-sky-950/90 border border-sky-400/50 text-sky-200 font-mono font-bold text-xs tracking-wide text-center animate-fadeIn shadow-lg shadow-sky-950/60 inline-flex items-center gap-1.5 max-w-full break-words"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
                          <span className="truncate">{adminQrCaption || gameState.qr_custom_caption}</span>
                        </div>
                      )}

                      {/* Direct URL with Copy Button */}
                      <div className="w-full fluent-box border border-white/15 rounded-[2px] p-2.5 flex items-center justify-between gap-2 shadow-sm">
                        <span className="text-xs font-mono text-sky-300 truncate text-left select-all flex-1 min-w-0">
                          {audienceJoinUrl || 'https://bti2026.app'}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyAudienceLink}
                          className="px-2.5 py-1.5 fluent-box-nested hover:fluent-box-nested text-white rounded-[2px] text-xs font-mono font-bold flex items-center gap-1 shrink-0 transition cursor-pointer active:scale-95"
                        >
                          {isCopiedJoinUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{isCopiedJoinUrl ? 'Đã chép' : 'Sao chép'}</span>
                        </button>
                      </div>

                      {/* Primary Actions Group */}
                      <div className="w-full flex flex-col gap-2 pt-1">
                        {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
                          <button
                            type="button"
                            id="btn-admin-native-share-qr"
                            onClick={handleNativeShareAudienceLink}
                            className="w-full py-2 px-3 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs uppercase tracking-wider rounded-[2px] transition shadow-lg shadow-sky-950/40 border border-sky-400/40 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
                          >
                            <Share2 className="w-3.5 h-3.5 text-white" />
                            <span>Chia Sẻ (Zalo / SMS)</span>
                          </button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={handleDownloadQrPng}
                            className="py-2.5 fluent-box-nested hover:fluent-box-nested text-white font-bold text-xs uppercase tracking-wider rounded-[2px] transition border border-white/15 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-sm"
                          >
                            <Download className="w-3.5 h-3.5 text-sky-400" />
                            <span>Tải Ảnh QR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleLiveQrModal(false)}
                            className="py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs uppercase tracking-wider rounded-[2px] transition shadow-lg shadow-rose-950/40 border border-rose-400/50 flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Tắt Chiếu</span>
                          </button>
                        </div>
                      </div>

                      {/* Realtime Firebase Status & Quick Keyboard Shortcut Indicator */}
                      <div className="w-full pt-1 border-t border-white/5 flex flex-col items-center gap-1.5">
                        {isFirebaseConnected ? (
                          <div 
                            id="badge-admin-qr-firebase-online"
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                            title="Hệ thống cơ sở dữ liệu thời gian thực đang kết nối ổn định"
                          >
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                            </span>
                            <span>Firebase: Trực Tuyến (Live)</span>
                          </div>
                        ) : (
                          <div 
                            id="badge-admin-qr-firebase-offline"
                            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30"
                            title="Đang kết nối lại với Firebase..."
                          >
                            <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse"></span>
                            <span>Firebase: Ngoại Tuyến</span>
                          </div>
                        )}
                        <div className="text-[10px] font-mono text-white/30 flex items-center justify-center gap-1">
                          <span>Phím tắt:</span>
                          <kbd className="px-1 py-0.2 fluent-box-nested rounded-[2px] text-white/60">Q</kbd>
                          <span>/</span>
                          <kbd className="px-1 py-0.2 fluent-box-nested rounded-[2px] text-white/60">ESC</kbd>
                          <span>đóng/mở</span>
                        </div>
                      </div>
                    </div>

                    {/* RIGHT COLUMN: Interactive Control Center & Live Telemetry */}
                    <div className="md:col-span-7 space-y-3">
                      {/* Estimated Scans Engagement Counter & Live Metrics Card */}
                      <div 
                        id="qr-modal-estimated-scans-card"
                        className="p-3 rounded-[2px] bg-gradient-to-br from-cyan-950/70 via-sky-950/50 to-indigo-950/70 border border-sky-500/40 shadow-lg shadow-sky-950/50 text-left"
                      >
                        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
                          <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-[2px] bg-sky-500/20 border border-sky-400/40 text-sky-300">
                              <ScanLine className="w-4 h-4 text-sky-400 animate-pulse" />
                            </div>
                            <div>
                              <div className="text-[11px] font-mono font-bold text-sky-200 uppercase tracking-wider flex items-center gap-1.5">
                                <span>Lượt Quét Ước Tính</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping mr-1 inline-block" />
                                  Firebase Sync
                                </span>
                              </div>
                              <p className="text-[10px] text-white/50">Đo lường mức độ tương tác & lượt quét mã QR</p>
                            </div>
                          </div>

                          {/* Quick Calibration / Test Actions & Trends for Organizers */}
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              id="btn-qr-modal-view-trends"
                              onClick={() => {
                                vibrateTap();
                                soundFx.playClick();
                                setQrModalTab('trends');
                                setShowQrHistoryTab(false);
                              }}
                              className="px-2 py-1 rounded-[2px] border border-cyan-400/50 bg-gradient-to-r from-cyan-500/20 to-sky-500/20 hover:from-cyan-500/30 hover:to-sky-500/30 text-cyan-200 text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
                              title="Xem biểu đồ tần suất quét QR theo từng khung giờ trong ngày (Hourly Trends)"
                            >
                              <TrendingUp className="w-3 h-3 text-cyan-300 animate-pulse" />
                              <span>Xu Hướng</span>
                            </button>
                            <button
                              type="button"
                              id="btn-qr-modal-test-scan-1"
                              onClick={() => handleAdjustScanCounter(1)}
                              className="px-2 py-1 rounded-[2px] border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
                              title="Mô phỏng thử nghiệm +1 lượt quét"
                            >
                              <span>+1 Thử</span>
                            </button>
                            <button
                              type="button"
                              id="btn-qr-modal-test-scan-5"
                              onClick={() => handleAdjustScanCounter(5)}
                              className="px-2 py-1 rounded-[2px] border border-sky-400/30 bg-sky-500/10 hover:bg-sky-500/20 text-sky-200 text-[10px] font-mono font-bold transition cursor-pointer active:scale-95"
                              title="Thêm +5 lượt quét (Rehearsal/Calibration)"
                            >
                              +5
                            </button>
                            {(Number(gameState.qr_scan_count) > 0) && (
                              <button
                                type="button"
                                id="btn-qr-modal-reset-scans"
                                onClick={handleResetScanCounter}
                                className="px-2 py-1 rounded-[2px] border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold transition cursor-pointer active:scale-95 flex items-center gap-1"
                                title="Đặt lại bộ đếm lượt quét về 0"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>Reset</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Main Stats Display Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-left pt-1">
                          {/* Scan Count Hero Number */}
                          <div className="col-span-1 bg-black/40 border border-sky-400/30 rounded-[2px] p-2 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-mono text-white/50 block">Tổng Lượt Quét</span>
                              <span className="text-xl sm:text-2xl font-black font-mono text-sky-300 tracking-tight flex items-baseline gap-1">
                                {Number(gameState.qr_scan_count) || 0}
                                <span className="text-[10px] font-normal text-sky-400/70">lượt</span>
                              </span>
                            </div>
                            <ScanLine className="w-6 h-6 text-sky-400/30 shrink-0" />
                          </div>

                          {/* Live Audience Connection */}
                          <div className="col-span-1 bg-black/40 border border-white/10 rounded-[2px] p-2 flex items-center justify-between">
                            <div>
                              <span className="text-[10px] font-mono text-white/50 block">Khán Giả Online</span>
                              <span className="text-lg sm:text-xl font-bold font-mono text-emerald-300 tracking-tight flex items-baseline gap-1">
                                {activeCount}
                                <span className="text-[10px] font-normal text-emerald-400/70">kết nối</span>
                              </span>
                            </div>
                            <Users className="w-5 h-5 text-emerald-400/30 shrink-0" />
                          </div>

                          {/* Engagement Status Badge */}
                          <div className="col-span-2 sm:col-span-1 bg-black/40 border border-white/10 rounded-[2px] p-2 flex flex-col justify-center">
                            <span className="text-[10px] font-mono text-white/50 block mb-0.5">Trạng Thái</span>
                            <div className="flex items-center gap-1.5">
                              {(!gameState.qr_scan_count || gameState.qr_scan_count === 0) ? (
                                <span className="text-[11px] font-mono font-bold text-amber-300/80 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-amber-400/60 inline-block" />
                                  Sẵn sàng
                                </span>
                              ) : gameState.qr_scan_count < 15 ? (
                                <span className="text-[11px] font-mono font-bold text-sky-300 flex items-center gap-1">
                                  <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse inline-block" />
                                  Đang kết nối
                                </span>
                              ) : gameState.qr_scan_count < 50 ? (
                                <span className="text-[11px] font-mono font-bold text-emerald-300 flex items-center gap-1">
                                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                                  Tích cực
                                </span>
                              ) : (
                                <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3 text-amber-400" />
                                  Sôi nổi!
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Custom Short Caption Input Field */}
                      <div className="p-2.5 fluent-box rounded-[2px] border border-white/10 text-left space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <label htmlFor="input-modal-qr-custom-caption" className="flex items-center gap-1.5 text-xs font-mono font-bold text-white/90">
                            <Type className="w-3.5 h-3.5 text-sky-400" />
                            <span>Tiêu Đề Phụ Dưới Mã QR (Custom Caption):</span>
                          </label>
                          {(adminQrCaption || gameState.qr_custom_caption) && (
                            <button
                              type="button"
                              id="btn-clear-modal-qr-caption"
                              onClick={() => handleUpdateQrCaption('')}
                              className="text-[10px] font-mono text-rose-300 hover:text-rose-200 transition underline cursor-pointer"
                            >
                              Xóa chữ
                            </button>
                          )}
                        </div>

                        <div className="relative flex items-center">
                          <input
                            id="input-modal-qr-custom-caption"
                            type="text"
                            maxLength={60}
                            value={adminQrCaption}
                            onChange={(e) => handleUpdateQrCaption(e.target.value)}
                            placeholder="Ví dụ: Tham gia Vòng 1, Quét để bình chọn..."
                            className="w-full bg-black/40 border border-white/20 rounded-[2px] px-2.5 py-1.5 text-xs text-white font-mono placeholder:text-white/30 focus:border-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-400/50 pr-12 transition"
                          />
                          <span className="absolute right-2 text-[10px] font-mono text-white/40 pointer-events-none">
                            {adminQrCaption.length}/60
                          </span>
                        </div>

                        {/* Quick Preset Chips */}
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          <span className="text-[10px] font-mono text-white/40">Gợi ý:</span>
                          {[
                            'Tham gia Vòng 1',
                            'Tham gia VCNV',
                            'Tham gia Tăng Tốc',
                            'Bình chọn Khán Giả',
                            'Join for Round 1',
                          ].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleUpdateQrCaption(preset)}
                              className={`px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono border transition cursor-pointer ${
                                adminQrCaption === preset
                                  ? 'bg-sky-500/30 text-sky-200 border-sky-400 font-bold shadow-sm'
                                  : 'bg-white/5 hover:bg-sky-500/20 text-white/60 hover:text-sky-300 border-white/10'
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Inactivity Auto-Close Timeout Setting */}
                      <div className="p-2.5 fluent-box rounded-[2px] border border-white/10 text-left space-y-2">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-white/90">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Tự Động Đóng Khi Không Dùng (Timeout):</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`px-2 py-0.5 rounded-[2px] text-[10px] font-mono font-bold flex items-center gap-1 ${
                              qrAutoCloseSeconds === 0
                                ? 'bg-slate-500/20 text-slate-300 border border-slate-500/30'
                                : isQrTimeoutPaused
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : qrRemainingTime <= 10
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}>
                              {qrAutoCloseSeconds === 0 ? (
                                <span>Vô hạn</span>
                              ) : isQrTimeoutPaused ? (
                                <>
                                  <Pause className="w-2.5 h-2.5 text-amber-400" />
                                  <span>Tạm dừng ({qrRemainingTime}s)</span>
                                </>
                              ) : (
                                <>
                                  <span className={`w-1.5 h-1.5 rounded-full ${qrRemainingTime <= 10 ? 'bg-rose-400 animate-ping' : 'bg-emerald-400 animate-pulse'}`} />
                                  <span>Đóng sau {qrRemainingTime}s</span>
                                </>
                              )}
                            </span>

                            {qrAutoCloseSeconds > 0 && (
                              <button
                                type="button"
                                id="btn-toggle-qr-timeout-pause"
                                onClick={handleToggleQrTimeoutPause}
                                className="p-1 rounded-[2px] border border-white/15 bg-white/5 hover:bg-white/15 text-white/70 hover:text-white transition cursor-pointer text-[10px]"
                                title={isQrTimeoutPaused ? 'Tiếp tục đếm ngược tự đóng' : 'Tạm dừng đếm ngược tự đóng'}
                              >
                                {isQrTimeoutPaused ? <Play className="w-3 h-3 text-emerald-400" /> : <Pause className="w-3 h-3 text-amber-400" />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Countdown Progress Bar */}
                        {qrAutoCloseSeconds > 0 && (
                          <div className="w-full bg-black/40 h-1.5 rounded-[2px] overflow-hidden border border-white/10 relative">
                            <div
                              className={`h-full transition-all duration-1000 ease-linear rounded-[2px] ${
                                isQrTimeoutPaused
                                  ? 'bg-amber-400'
                                  : qrRemainingTime <= 10
                                  ? 'bg-rose-500 animate-pulse'
                                  : qrRemainingTime <= 25
                                  ? 'bg-amber-400'
                                  : 'bg-emerald-400'
                              }`}
                              style={{
                                width: `${Math.max(0, Math.min(100, (qrRemainingTime / qrAutoCloseSeconds) * 100))}%`,
                              }}
                            />
                          </div>
                        )}

                        {/* Timeout Presets Selection */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/5">
                          {[
                            { seconds: 0, label: 'Tắt', desc: 'Vô hạn' },
                            { seconds: 30, label: '30s', desc: 'Nhanh' },
                            { seconds: 60, label: '60s', desc: 'Chuẩn' },
                            { seconds: 120, label: '120s', desc: '2 phút' },
                          ].map((opt) => {
                            const isSelected = qrAutoCloseSeconds === opt.seconds;
                            return (
                              <button
                                key={opt.seconds}
                                type="button"
                                id={`btn-qr-timeout-${opt.seconds}`}
                                onClick={() => handleSetQrTimeout(opt.seconds)}
                                className={`px-1.5 py-1.5 rounded-[2px] border text-center transition font-mono text-[10px] cursor-pointer flex flex-col items-center justify-center ${
                                  isSelected
                                    ? 'bg-amber-500/25 border-amber-400 text-amber-200 font-bold shadow-sm'
                                    : 'bg-black/30 border-white/10 hover:border-white/25 text-white/70 hover:text-white'
                                }`}
                                title={opt.seconds === 0 ? 'Tắt tính năng tự đóng' : `Tự động đóng sau ${opt.seconds} giây`}
                              >
                                <span className="font-bold">{opt.label}</span>
                                <span className="text-[9px] opacity-70">({opt.desc})</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Background Mode & QR Size Setting Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Background Mode Toggle Switch */}
                        <div className="p-2.5 fluent-box rounded-[2px] border border-white/10 text-left space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 text-xs font-mono font-bold text-white/90">
                              <Layers className="w-3.5 h-3.5 text-amber-400" />
                              <span>Kiểu Nền:</span>
                            </div>
                            <span className="text-[10px] font-mono text-sky-300">
                              {gameState.qr_transparent_bg ? 'Trong Suốt' : 'Nền Đặc'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            <button
                              type="button"
                              id="btn-qr-bg-solid"
                              onClick={() => handleToggleQrTransparentBg(false)}
                              className={`p-1.5 rounded-[2px] border text-left transition flex items-center gap-1.5 cursor-pointer ${
                                !gameState.qr_transparent_bg
                                  ? 'bg-sky-500/20 border-sky-400 ring-1 ring-sky-400/50 text-white shadow-md'
                                  : 'bg-black/30 border-white/10 hover:border-white/20 text-white/60 hover:text-white/90'
                              }`}
                              title="Nền màu đặc theo bảng màu"
                            >
                              <div className="w-4 h-4 rounded-[2px] border border-white/30 bg-white shadow-inner shrink-0 flex items-center justify-center">
                                {!gameState.qr_transparent_bg && <Check className="w-3 h-3 text-slate-900 stroke-[3]" />}
                              </div>
                              <span className="text-[10px] font-mono font-bold truncate">Nền Đặc</span>
                            </button>

                            <button
                              type="button"
                              id="btn-qr-bg-transparent"
                              onClick={() => handleToggleQrTransparentBg(true)}
                              className={`p-1.5 rounded-[2px] border text-left transition flex items-center gap-1.5 cursor-pointer ${
                                gameState.qr_transparent_bg
                                  ? 'bg-emerald-500/20 border-emerald-400 ring-1 ring-emerald-400/50 text-white shadow-md'
                                  : 'bg-black/30 border-white/10 hover:border-white/20 text-white/60 hover:text-white/90'
                              }`}
                              title="Nền rỗng trong suốt cho OBS overlay"
                            >
                              <div className="w-4 h-4 rounded-[2px] border border-white/30 bg-[linear-gradient(45deg,#555_25%,transparent_25%),linear-gradient(-45deg,#555_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#555_75%),linear-gradient(-45deg,transparent_75%,#555_75%)] bg-[size:4px_4px] bg-[#222] shrink-0 flex items-center justify-center">
                                {gameState.qr_transparent_bg && <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />}
                              </div>
                              <span className="text-[10px] font-mono font-bold truncate">Trong Suốt</span>
                            </button>
                          </div>
                        </div>

                        {/* QR Size Slider */}
                        <div className="p-2.5 fluent-box rounded-[2px] border border-white/10 text-left space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <div className="flex items-center gap-1 text-xs font-mono font-bold text-white/90">
                              <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                              <span>Kích thước:</span>
                            </div>
                            <span className="text-sky-300 font-mono font-black text-xs">{adminQrSize}px</span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <ZoomOut className="w-3 h-3 text-white/40 shrink-0" />
                            <input
                              type="range"
                              id="input-qr-size-slider"
                              min={180}
                              max={440}
                              step={10}
                              value={adminQrSize}
                              onChange={(e) => {
                                const newSize = Number(e.target.value);
                                handleQrSizeChange(newSize);
                              }}
                              className="w-full h-1.5 bg-slate-700 rounded-[2px] appearance-none cursor-pointer accent-sky-400 hover:accent-sky-300 transition"
                              title={`Kéo để thay đổi kích thước hiển thị mã QR (${adminQrSize}px)`}
                            />
                            <ZoomIn className="w-3 h-3 text-white/40 shrink-0" />
                          </div>

                          <div className="grid grid-cols-4 gap-1 pt-0.5">
                            {[
                              { size: 190, label: '190' },
                              { size: 280, label: '280' },
                              { size: 360, label: '360' },
                              { size: 440, label: '440' },
                            ].map((preset) => {
                              const isPresetActive = Math.abs(adminQrSize - preset.size) <= 5;
                              return (
                                <button
                                  key={preset.size}
                                  type="button"
                                  onClick={() => {
                                    vibrateTap();
                                    soundFx.playClick();
                                    handleQrSizeChange(preset.size);
                                  }}
                                  className={`px-1 py-0.5 rounded-[2px] border text-center transition font-mono text-[10px] cursor-pointer ${
                                    isPresetActive
                                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-bold shadow-sm'
                                      : 'bg-black/30 border-white/10 hover:border-white/25 text-white/70 hover:text-white'
                                  }`}
                                >
                                  {preset.label}px
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {/* Quick Palette Picker in Modal */}
                      <div className="p-2.5 fluent-box rounded-[2px] border border-white/10 text-left">
                        <div className="text-[11px] font-mono font-bold text-white/80 mb-1.5 flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <Palette className="w-3.5 h-3.5 text-amber-400" /> Bảng màu hiển thị:
                          </span>
                          <span className="text-amber-300 text-[10px]">
                            {(QR_PALETTES[(gameState.qr_color_palette as QrPaletteId) || 'purple_gold'] || QR_PALETTES.purple_gold).labelVi}
                          </span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {(Object.keys(QR_PALETTES) as QrPaletteId[]).map((paletteKey) => {
                            const pal = QR_PALETTES[paletteKey];
                            const isSelected = ((gameState.qr_color_palette as QrPaletteId) || 'purple_gold') === paletteKey;
                            return (
                              <button
                                key={`modal-${paletteKey}`}
                                type="button"
                                onClick={() => handleSetQrPalette(paletteKey)}
                                className={`p-1.5 rounded-[2px] border text-center transition flex flex-col items-center gap-1 cursor-pointer ${
                                  isSelected
                                    ? 'bg-amber-400/20 border-amber-400 ring-1 ring-amber-400'
                                    : 'bg-black/30 border-white/10 hover:border-white/30'
                                }`}
                                title={pal.name}
                              >
                                <span className="w-3.5 h-3.5 rounded-full shrink-0 shadow border border-white/40" style={{ backgroundColor: pal.dotColor }} />
                                <span className="text-[9px] font-mono font-semibold text-white/90 truncate w-full">
                                  {pal.id === 'purple_gold' ? 'Tím BTI' : pal.id === 'ocean_teal' ? 'Đại dương' : pal.id === 'monochrome' ? 'Đơn sắc' : pal.id === 'emerald_mint' ? 'Ngọc bích' : 'Hồng ngọc'}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
              </div>
            )}

            {/* Diagnostic Overlay for QR Generator Telemetry & Debugging */}
            <QrDiagnosticOverlay
              isOpen={showAdminQrDiagnostics}
              onClose={() => setShowAdminQrDiagnostics(false)}
              data={adminQrDiagnosticData}
              onRetest={runAdminQrGenerationPass}
            />
          </div>
        </div>
      )}

      {/* MODAL: QR Code History Version Inspector / Zoom Preview */}
      {inspectHistoryItem && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setInspectHistoryItem(null)}
        >
          <div 
            className="max-w-sm w-full fluent-box border border-sky-400/60 rounded-[4px] p-5 text-center shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-white/10">
              <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-amber-400" /> Chi Tiết Phiên Bản QR
              </span>
              <button
                type="button"
                onClick={() => setInspectHistoryItem(null)}
                className="p-1 text-white/60 hover:text-white rounded-[2px] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div 
              className={`p-3 rounded-[2px] inline-block shadow-2xl mb-3 border-2 border-sky-400/50 ${
                inspectHistoryItem.transparentBg
                  ? 'bg-[linear-gradient(45deg,#242424_25%,transparent_25%),linear-gradient(-45deg,#242424_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#242424_75%)] bg-[size:12px_12px] bg-[#141414]'
                  : 'bg-white'
              }`}
            >
              {inspectHistoryItem.dataUrl ? (
                <img 
                  src={inspectHistoryItem.dataUrl} 
                  alt="QR Zoom" 
                  className="w-48 h-48 sm:w-56 sm:h-56 object-contain mx-auto" 
                />
              ) : (
                <QrCode className="w-48 h-48 text-sky-400/50 mx-auto" />
              )}
            </div>

            <div className="text-xs font-mono text-left space-y-1.5 p-2.5 rounded-[2px] bg-black/40 border border-white/10 mb-3">
              <div className="flex justify-between">
                <span className="text-white/50">Bảng màu:</span>
                <span className="text-white font-bold">{inspectHistoryItem.paletteName || inspectHistoryItem.palette}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Kích thước:</span>
                <span className="text-sky-300 font-bold">{inspectHistoryItem.size}px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Kiểu nền:</span>
                <span className="text-white">{inspectHistoryItem.transparentBg ? 'Trong suốt (Alpha)' : 'Nền đặc'}</span>
              </div>
              {inspectHistoryItem.caption && (
                <div className="flex justify-between">
                  <span className="text-white/50">Tiêu đề phụ:</span>
                  <span className="text-amber-300 font-bold">{inspectHistoryItem.caption}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-white/50">Thời gian tạo:</span>
                <span className="text-white/70">
                  {inspectHistoryItem.timestamp ? new Date(inspectHistoryItem.timestamp).toLocaleString('vi-VN') : 'N/A'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  handleRestoreQrVersion(inspectHistoryItem);
                  setInspectHistoryItem(null);
                }}
                className="flex-1 py-2 rounded-[2px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-mono font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục phiên bản này</span>
              </button>
              <button
                type="button"
                onClick={() => setInspectHistoryItem(null)}
                className="px-3 py-2 rounded-[2px] border border-white/20 text-white font-mono text-xs hover:bg-white/10 cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Custom Question Creator & Editor (BTI 2026 Engine) */}
      {isCreatingCustom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-[24px] saturate-150/80 backdrop-blur-md animate-fadeIn">
          <div className="max-w-2xl w-full fluent-box border border-white/15 rounded-[2px] p-3 sm:p-4 md:p-6 sm:p-8 text-[#e5e5e5] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-blue-400" />
                  Soạn Thảo / Chỉnh Sửa Câu Hỏi BTI 2026
                </h3>
                <p className="text-[10px] uppercase text-white/40 font-mono">
                  Khởi Động • Tăng Tốc • Về Đích • Đúng/Sai 4 Ý • Loại Trừ 6 Ý
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingCustom(false)}
                className="text-white/40 hover:text-white text-base px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveCustomQuestion} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-white/40 font-mono font-medium">Mã câu hỏi (ID)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = generateNextQuestionId(customRoundName, questionBank);
                        setCustomQuestionId(newId);
                      }}
                      className="text-[10px] text-blue-400 hover:text-blue-300 font-mono underline"
                      title="Tự động sinh lại mã theo tên vòng"
                    >
                      ⚡ Sinh lại mã
                    </button>
                  </div>
                  <input
                    type="text"
                    value={customQuestionId}
                    onChange={(e) => setCustomQuestionId(e.target.value)}
                    required
                    placeholder="KD-01, TT-01, VD-01..."
                    className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white font-mono font-bold"
                  />
                </div>

                {(() => {
                  const isVcnvRoundName = customRoundName.toLowerCase().includes('chướng ngại vật') || customRoundName.toLowerCase().includes('vcnv');
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-white/40 font-mono font-medium">Loại Định Dạng</label>
                        {isVcnvRoundName && (
                          <span className="text-[10px] text-cyan-400 font-mono flex items-center gap-1 font-bold">
                            🔒 Khóa dạng VCNV cho Vòng 2
                          </span>
                        )}
                      </div>
                      <select
                        value={customRoundType}
                        disabled={isVcnvRoundName}
                        onChange={(e) => {
                          const newType = e.target.value as RoundType;
                          setCustomRoundType(newType);
                          if (newType === 'TRUE_FALSE_4' && !customCorrectKey.includes(':')) {
                            setCustomCorrectKey('a:Đ,b:S,c:S,d:Đ');
                          }
                        }}
                        className={`w-full fluent-box border rounded-[2px] px-3 py-2 text-white font-medium transition ${
                          isVcnvRoundName
                            ? 'border-cyan-500/50 bg-cyan-950/40 backdrop-blur-md text-cyan-200 cursor-not-allowed'
                            : 'border-white/10 focus:border-blue-500'
                        }`}
                      >
                        <option value="MULTIPLE_CHOICE">Trắc nghiệm linh hoạt 2 - 4 lựa chọn (Khởi động / Về đích)</option>
                        <option value="TRUE_FALSE">Đúng / Sai (1 mệnh đề)</option>
                        <option value="TRUE_FALSE_4">Đúng / Sai 4 câu theo hình (Về đích)</option>
                        <option value="SHORT_ANSWER">Trả lời ngắn / Chuỗi Text</option>
                        <option value="FILL_IN_BLANK">Điền vào chỗ trống</option>
                        <option value="IMAGE_POLL">Bình chọn hình ảnh</option>
                        <option value="SEQUENCING">Kéo thả / Sắp xếp trình tự (Khởi động / Tăng tốc)</option>
                        <option value="VCNV" disabled={!isVcnvRoundName}>
                          {isVcnvRoundName
                            ? '🧩 Vượt Chướng Ngại Vật (Từ khóa, 4 hàng ngang, Ô mạo hiểm)'
                            : '🔒 Vượt Chướng Ngại Vật (Khóa - Chỉ dành riêng cho Vòng 2)'}
                        </option>
                        <option value="ELIMINATION_6">Loại trừ 6 phương án (Tăng tốc BTI)</option>
                        <option value="BLIND_POLL">Blind Poll Khảo sát</option>
                      </select>
                    </div>
                  );
                })()}

                <div>
                  <label className="block text-white/40 mb-1 font-mono font-medium">Thời gian (giây)</label>
                  <div className="flex gap-1">
                    <input
                      type="number"
                      min={3}
                      max={180}
                      value={customTimeLimit}
                      onChange={(e) => setCustomTimeLimit(Number(e.target.value))}
                      className="w-20 fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white font-mono font-bold text-center"
                    />
                    <div className="flex flex-wrap gap-1 flex-1">
                      {[5, 15, 20, 30, 60, 90].map(sec => (
                        <button
                          key={sec}
                          type="button"
                          onClick={() => setCustomTimeLimit(sec)}
                          className={`px-1.5 py-1 rounded-[2px] text-[10px] font-mono font-bold ${
                            customTimeLimit === sec
                              ? 'bg-blue-600 text-white'
                              : 'fluent-box-nested hover:fluent-box-nested text-white/60'
                          }`}
                        >
                          {sec}s
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-white/40 font-medium">Tên vòng / Phân loại kịch bản</label>
                  <span className="text-[10px] text-blue-400 font-mono">
                    ⚡ Đổi tên vòng sẽ tự động đổi Mã câu hỏi
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <select
                    value={isCustomRoundMode ? 'CUSTOM' : customRoundName}
                    onChange={(e) => {
                      const selected = e.target.value;
                      if (selected === 'CUSTOM') {
                        setIsCustomRoundMode(true);
                        setCustomRoundName('');
                      } else {
                        setIsCustomRoundMode(false);
                        setCustomRoundName(selected);
                        const autoId = generateNextQuestionId(selected, questionBank);
                        setCustomQuestionId(autoId);
                        if (selected.toLowerCase().includes('chướng ngại vật') || selected.toLowerCase().includes('vcnv')) {
                          setCustomRoundType('VCNV');
                        } else if (customRoundType === 'VCNV') {
                          setCustomRoundType('MULTIPLE_CHOICE');
                        }
                      }
                    }}
                    className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white font-medium"
                  >
                    <option value="Vòng 1: Khởi động chung">🎯 Vòng 1: Khởi động chung (Mã KDC / KD)</option>
                    <option value="Vòng 2: Vượt chướng ngại vật">🧩 Vòng 2: Vượt chướng ngại vật (Mã VCNV)</option>
                    <option value="Vòng 3: Tăng tốc">🚀 Vòng 3: Tăng tốc (Mã TT)</option>
                    <option value="Vòng 4: Về đích">🏆 Vòng 4: Về đích (Mã VD)</option>
                    <option value="Khảo sát / Phụ">📊 Khảo sát / Phụ (Mã KS)</option>
                    <option value="CUSTOM">✏️ Tự nhập tên vòng tùy chỉnh...</option>
                  </select>

                  {isCustomRoundMode && (
                    <input
                      type="text"
                      autoFocus
                      value={customRoundName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomRoundName(val);
                        if (val.trim()) {
                          const autoId = generateNextQuestionId(val, questionBank);
                          setCustomQuestionId(autoId);
                          if (val.toLowerCase().includes('chướng ngại vật') || val.toLowerCase().includes('vcnv')) {
                            setCustomRoundType('VCNV');
                          } else if (customRoundType === 'VCNV') {
                            setCustomRoundType('MULTIPLE_CHOICE');
                          }
                        }
                      }}
                      placeholder="Nhập tên vòng tùy chỉnh (VD: Vòng Phụ, Vòng Khán Giả...)"
                      className="w-full fluent-box border border-blue-500/60 focus:border-blue-400 rounded-[2px] px-3 py-2 text-white font-medium shadow-inner animate-fade-in"
                    />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-white/40 mb-1 font-medium">Nội dung câu hỏi / Tình huống / Đề bài hình</label>
                <textarea
                  rows={3}
                  value={customQuestionText}
                  onChange={(e) => setCustomQuestionText(e.target.value)}
                  placeholder="Nhập nội dung câu hỏi chi tiết..."
                  required
                  className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                />
              </div>

              {/* Media Inputs (Except VCNV) */}
              {customRoundType !== 'VCNV' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white/40 mb-1 font-medium">Đính kèm Phương tiện (Tùy chọn)</label>
                    <select
                      value={customMediaType}
                      onChange={(e) => setCustomMediaType(e.target.value as any)}
                      className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                    >
                      <option value="NONE">Không đính kèm</option>
                      <option value="IMAGE">Hình ảnh</option>
                      <option value="AUDIO">Âm thanh</option>
                      <option value="VIDEO">Video</option>
                    </select>
                  </div>
                  {customMediaType !== 'NONE' && (
                    <div>
                      <label className="block text-white/40 mb-1 font-medium">Link URL phương tiện</label>
                      <input
                        type="url"
                        value={customMediaUrl}
                        onChange={(e) => setCustomMediaUrl(e.target.value)}
                        placeholder={`Nhập link ${customMediaType.toLowerCase()}...`}
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                  )}
                  {(customMediaType === 'VIDEO' || customMediaType === 'AUDIO') && (
                    <div className="sm:col-span-2 flex items-center gap-2 pt-1">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-amber-300 cursor-pointer fluent-box-nested border border-amber-500/30 px-3.5 py-2.5 rounded-[2px] hover:fluent-box-nested transition-colors">
                        <input
                          type="checkbox"
                          checked={customMediaAutoplay}
                          onChange={(e) => setCustomMediaAutoplay(e.target.checked)}
                          className="w-4 h-4 rounded-[2px] border-gray-600 text-amber-500 focus:ring-amber-400 fluent-box"
                        />
                        <span>▶ Tự động phát {customMediaType === 'VIDEO' ? 'Video' : 'Âm thanh'} ngay khi nhấn "BẮT ĐẦU"</span>
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* Dynamic Inputs based on RoundType */}
              {customRoundType === 'VCNV' ? (
                <div className="p-4 fluent-box-nested border border-cyan-500/30 rounded-[2px] space-y-3">
                  <div className="text-cyan-300 font-mono font-bold flex items-center justify-between text-xs">
                    <span>Nội Dung Gói Vượt Chướng Ngại Vật (VCNV)</span>
                    <span className="text-[10px] text-cyan-200 fluent-box-nested px-2 py-0.5 rounded-[2px]">Gói VCNV</span>
                  </div>

                  <div>
                    <label className="block text-amber-300 font-mono text-xs font-bold mb-1">🔑 Từ Khóa CNV Chính (Key):</label>
                    <input
                      type="text"
                      value={customCorrectKey}
                      onChange={(e) => setCustomCorrectKey(e.target.value)}
                      placeholder="DEEPFAKE..."
                      required
                      className="w-full fluent-box border border-amber-500/40 rounded-[2px] px-3 py-1.5 text-amber-300 font-mono font-bold uppercase"
                    />
                  </div>

                  <div>
                    <label className="block text-blue-300 font-mono text-xs font-bold mb-1">🧩 4 Hàng Ngang Gợi Ý:</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={customOptionA}
                        onChange={(e) => setCustomOptionA(e.target.value)}
                        placeholder="Hàng ngang 1..."
                        className="fluent-box border border-white/10 rounded-[2px] px-3 py-1.5 text-white font-mono uppercase"
                      />
                      <input
                        type="text"
                        value={customOptionB}
                        onChange={(e) => setCustomOptionB(e.target.value)}
                        placeholder="Hàng ngang 2..."
                        className="fluent-box border border-white/10 rounded-[2px] px-3 py-1.5 text-white font-mono uppercase"
                      />
                      <input
                        type="text"
                        value={customOptionC}
                        onChange={(e) => setCustomOptionC(e.target.value)}
                        placeholder="Hàng ngang 3..."
                        className="fluent-box border border-white/10 rounded-[2px] px-3 py-1.5 text-white font-mono uppercase"
                      />
                      <input
                        type="text"
                        value={customOptionD}
                        onChange={(e) => setCustomOptionD(e.target.value)}
                        placeholder="Hàng ngang 4..."
                        className="fluent-box border border-white/10 rounded-[2px] px-3 py-1.5 text-white font-mono uppercase"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-amber-200 font-mono text-xs font-bold mb-1">🌟 Đáp Án Ô Trung Tâm:</label>
                    <input
                      type="text"
                      value={customOptionE}
                      onChange={(e) => setCustomOptionE(e.target.value)}
                      placeholder="Nội dung Ô Trung Tâm..."
                      className="w-full fluent-box border border-white/10 rounded-[2px] px-3 py-1.5 text-amber-200 font-mono uppercase"
                    />
                  </div>
                </div>
              ) : (customRoundType === 'SHORT_ANSWER' || customRoundType === 'FILL_IN_BLANK') ? (
                <div className="p-4 fluent-box-nested border border-cyan-500/30 rounded-[2px] space-y-2">
                  <label className="block text-cyan-300 font-mono font-bold">
                    Từ Khóa / Chuỗi Đáp Án Đúng (Hệ thống sẽ tự so khớp không phân biệt hoa thường)
                  </label>
                  <input
                    type="text"
                    value={customCorrectKey}
                    onChange={(e) => setCustomCorrectKey(e.target.value)}
                    required
                    placeholder="Ví dụ: 1986, NGHỊ ĐỊNH 13, CẦN THƠ..."
                    className="w-full fluent-box border border-cyan-500/40 focus:border-cyan-400 rounded-[2px] px-3.5 py-2 text-white font-mono font-bold uppercase"
                  />
                </div>
              ) : customRoundType === 'TRUE_FALSE_4' ? (
                <div className="p-4 fluent-box-nested border border-purple-500/30 rounded-[2px] space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-purple-300 font-mono font-bold">
                      4 Mệnh Đề / Ý Đánh Giá Đúng - Sai (Theo Hình / Tình Huống)
                    </label>
                    <span className="text-[10px] font-mono text-purple-200 fluent-box-nested px-2 py-0.5 rounded-[2px]">
                      Key format: a:Đ,b:S,c:S,d:Đ
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {[
                      { key: 'a', val: customOptionA, setVal: setCustomOptionA },
                      { key: 'b', val: customOptionB, setVal: setCustomOptionB },
                      { key: 'c', val: customOptionC, setVal: setCustomOptionC },
                      { key: 'd', val: customOptionD, setVal: setCustomOptionD },
                    ].map(item => {
                      const keyMatch = (customCorrectKey || '').match(new RegExp(`${item.key}:([ĐS])`, 'i'));
                      const currentVal = keyMatch ? keyMatch[1].toUpperCase() : 'Đ';

                      const handleSetChoice = (ans: 'Đ' | 'S') => {
                        let pairs: { [k: string]: string } = { a: 'Đ', b: 'S', c: 'S', d: 'Đ' };
                        (customCorrectKey || '').split(',').forEach(p => {
                          const [k, v] = p.split(':');
                          if (k && v) pairs[k.trim().toLowerCase()] = v.trim().toUpperCase();
                        });
                        pairs[item.key] = ans;
                        const newKeyStr = ['a', 'b', 'c', 'd'].map(k => `${k}:${pairs[k] || 'Đ'}`).join(',');
                        setCustomCorrectKey(newKeyStr);
                      };

                      return (
                        <div key={item.key} className="flex items-center gap-2">
                          <span className="w-6 font-mono font-bold text-purple-300 text-center">{item.key})</span>
                          <input
                            type="text"
                            value={item.val}
                            onChange={(e) => item.setVal(e.target.value)}
                            placeholder={`Nội dung nhận định ${item.key}...`}
                            className="flex-1 fluent-box border border-white/10 rounded-[2px] px-3 py-1.5 text-white"
                          />
                          <div className="flex rounded-[2px] overflow-hidden border border-white/10">
                            <button
                              type="button"
                              onClick={() => handleSetChoice('Đ')}
                              className={`px-2.5 py-1 text-xs font-mono font-bold transition ${
                                currentVal === 'Đ'
                                  ? 'bg-emerald-600 text-white'
                                  : 'fluent-box-nested text-white/40 hover:text-white'
                              }`}
                            >
                              ĐÚNG
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetChoice('S')}
                              className={`px-2.5 py-1 text-xs font-mono font-bold transition ${
                                currentVal === 'S'
                                  ? 'bg-rose-600 text-white'
                                  : 'fluent-box-nested text-white/40 hover:text-white'
                              }`}
                            >
                              SAI
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : customRoundType === 'TRUE_FALSE' ? (
                <div className="p-4 fluent-box-nested border border-purple-500/30 rounded-[2px] space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border border-blue-500/20 p-2.5 rounded-[2px]">
                    <span className="text-purple-300 font-mono font-bold text-xs">
                      Cấu hình Câu hỏi Đúng / Sai
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/50 mb-1 font-mono text-[11px]">Nội dung Đúng</label>
                      <input
                        type="text"
                        value={customOptionA}
                        onChange={(e) => setCustomOptionA(e.target.value)}
                        placeholder="Mặc định: Đúng"
                        className="w-full fluent-box border border-white/10 focus:border-purple-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/50 mb-1 font-mono text-[11px]">Nội dung Sai</label>
                      <input
                        type="text"
                        value={customOptionB}
                        onChange={(e) => setCustomOptionB(e.target.value)}
                        placeholder="Mặc định: Sai"
                        className="w-full fluent-box border border-white/10 focus:border-purple-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-white/50 mb-1 font-medium">Phương án Đúng (Key)</label>
                      <select
                        value={customCorrectKey}
                        onChange={(e) => setCustomCorrectKey(e.target.value)}
                        className="w-full fluent-box border border-white/10 focus:border-purple-500 rounded-[2px] px-3 py-2 text-white font-mono font-bold"
                      >
                        <option value="A">Đáp án là ĐÚNG</option>
                        <option value="B">Đáp án là SAI</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/50 mb-1 font-medium">Lĩnh vực kiến thức</label>
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="An ninh mạng, Căn cứ pháp lý..."
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : (customRoundType === 'MULTIPLE_CHOICE' || customRoundType === 'IMAGE_POLL') ? (
                /* MULTIPLE_CHOICE / IMAGE_POLL (2 to 4 options flexible) */
                <div className="space-y-3 bg-black/50 backdrop-blur-[24px] saturate-150/20 p-3.5 rounded-[2px] border border-white/10">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 fluent-box-nested border border-blue-500/20 p-2.5 rounded-[2px]">
                    <span className="text-blue-300 font-mono font-bold text-xs">
                      Số lượng lựa chọn trắc nghiệm:
                    </span>
                    <div className="flex gap-1.5">
                      {[2, 3, 4].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setCustomOptionCount(num);
                            if (num === 2 && (customCorrectKey === 'C' || customCorrectKey === 'D')) {
                              setCustomCorrectKey('A');
                            } else if (num === 3 && customCorrectKey === 'D') {
                              setCustomCorrectKey('A');
                            }
                          }}
                          className={`px-3 py-1 rounded-[2px] font-mono text-xs font-bold transition ${
                            customOptionCount === num
                              ? 'bg-blue-600 text-white shadow-md'
                              : 'fluent-box-nested text-white/50 hover:fluent-box-nested hover:text-white'
                          }`}
                        >
                          {num} phương án ({num === 2 ? 'A, B' : num === 3 ? 'A, B, C' : 'A, B, C, D'})
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <div>
                        <label className="block text-white/50 mb-1 font-mono text-[11px]">Phương án A <span className="text-rose-400">*</span></label>
                        <input
                          type="text"
                          value={customOptionA}
                          onChange={(e) => setCustomOptionA(e.target.value)}
                          placeholder="Nội dung phương án A..."
                          required
                          className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                        />
                      </div>
                      {customRoundType === 'IMAGE_POLL' && (
                        <div>
                          <label className="block text-blue-300/70 mb-1 font-mono text-[11px]">Hình ảnh A (URL)</label>
                          <input
                            type="text"
                            value={customOptionImageA}
                            onChange={(e) => setCustomOptionImageA(e.target.value)}
                            placeholder="https://..."
                            required
                            className="w-full fluent-box-nested border border-blue-500/30 focus:border-blue-400 rounded-[2px] px-3 py-2 text-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="block text-white/50 mb-1 font-mono text-[11px]">Phương án B <span className="text-rose-400">*</span></label>
                        <input
                          type="text"
                          value={customOptionB}
                          onChange={(e) => setCustomOptionB(e.target.value)}
                          placeholder="Nội dung phương án B..."
                          required
                          className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                        />
                      </div>
                      {customRoundType === 'IMAGE_POLL' && (
                        <div>
                          <label className="block text-blue-300/70 mb-1 font-mono text-[11px]">Hình ảnh B (URL)</label>
                          <input
                            type="text"
                            value={customOptionImageB}
                            onChange={(e) => setCustomOptionImageB(e.target.value)}
                            placeholder="https://..."
                            required
                            className="w-full fluent-box-nested border border-blue-500/30 focus:border-blue-400 rounded-[2px] px-3 py-2 text-white text-xs"
                          />
                        </div>
                      )}
                    </div>
                    {customOptionCount >= 3 && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-white/50 mb-1 font-mono text-[11px]">Phương án C</label>
                          <input
                            type="text"
                            value={customOptionC}
                            onChange={(e) => setCustomOptionC(e.target.value)}
                            placeholder="Nội dung phương án C..."
                            className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                          />
                        </div>
                        {customRoundType === 'IMAGE_POLL' && (
                          <div>
                            <label className="block text-blue-300/70 mb-1 font-mono text-[11px]">Hình ảnh C (URL)</label>
                            <input
                              type="text"
                              value={customOptionImageC}
                              onChange={(e) => setCustomOptionImageC(e.target.value)}
                              placeholder="https://..."
                              required
                              className="w-full fluent-box-nested border border-blue-500/30 focus:border-blue-400 rounded-[2px] px-3 py-2 text-white text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    {customOptionCount >= 4 && (
                      <div className="space-y-2">
                        <div>
                          <label className="block text-white/50 mb-1 font-mono text-[11px]">Phương án D</label>
                          <input
                            type="text"
                            value={customOptionD}
                            onChange={(e) => setCustomOptionD(e.target.value)}
                            placeholder="Nội dung phương án D..."
                            className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                          />
                        </div>
                        {customRoundType === 'IMAGE_POLL' && (
                          <div>
                            <label className="block text-blue-300/70 mb-1 font-mono text-[11px]">Hình ảnh D (URL)</label>
                            <input
                              type="text"
                              value={customOptionImageD}
                              onChange={(e) => setCustomOptionImageD(e.target.value)}
                              placeholder="https://..."
                              required
                              className="w-full fluent-box-nested border border-blue-500/30 focus:border-blue-400 rounded-[2px] px-3 py-2 text-white text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-white/50 mb-1 font-medium">Phương án Đúng (Key)</label>
                      <select
                        value={customCorrectKey}
                        onChange={(e) => setCustomCorrectKey(e.target.value)}
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white font-mono font-bold"
                      >
                        <option value="A">Phương án A</option>
                        <option value="B">Phương án B</option>
                        {customOptionCount >= 3 && <option value="C">Phương án C</option>}
                        {customOptionCount >= 4 && <option value="D">Phương án D</option>}
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/50 mb-1 font-medium">Lĩnh vực kiến thức</label>
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="An ninh mạng, Căn cứ pháp lý..."
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              ) : customRoundType === 'SEQUENCING' ? (
                /* SEQUENCING (Kéo thả / Sắp xếp trình tự 4 đến 10 mục) */
                <div className="space-y-3 bg-black/50 backdrop-blur-[24px] saturate-150/20 p-3.5 rounded-[2px] border border-white/10">
                  <div className="p-2.5 fluent-box-nested border border-amber-500/20 rounded-[2px] text-amber-300 font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 font-bold">
                      🧩 Thiết lập danh sách các mục (từ 4 đến 10) và Trình tự chuẩn
                    </span>
                    <span className="fluent-box-nested px-2 py-0.5 rounded-[2px] text-[10px] font-bold">Khởi động & Tăng tốc</span>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 fluent-box-nested border border-white/10 p-2.5 rounded-[2px]">
                    <span className="text-white/70 font-mono font-bold text-xs">
                      Số lượng mục sắp xếp (4 ➔ 10 mục):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[4, 5, 6, 7, 8, 9, 10].map(num => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => {
                            setCustomOptionCount(num);
                            const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, num);
                            setCustomCorrectKey(keys.join('-'));
                          }}
                          className={`px-2.5 py-1 rounded-[2px] font-mono text-xs font-bold transition ${
                            customOptionCount === num
                              ? 'bg-amber-500 text-slate-950 shadow-md'
                              : 'fluent-box-nested text-white/60 hover:fluent-box-nested hover:text-white'
                          }`}
                        >
                          {num} mục
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {[
                      { key: 'A', val: customOptionA, set: setCustomOptionA },
                      { key: 'B', val: customOptionB, set: setCustomOptionB },
                      { key: 'C', val: customOptionC, set: setCustomOptionC },
                      { key: 'D', val: customOptionD, set: setCustomOptionD },
                      { key: 'E', val: customOptionE, set: setCustomOptionE },
                      { key: 'F', val: customOptionF, set: setCustomOptionF },
                      { key: 'G', val: customOptionG, set: setCustomOptionG },
                      { key: 'H', val: customOptionH, set: setCustomOptionH },
                      { key: 'I', val: customOptionI, set: setCustomOptionI },
                      { key: 'J', val: customOptionJ, set: setCustomOptionJ },
                    ].slice(0, Math.max(4, Math.min(10, customOptionCount))).map(({ key, val, set }, idx) => (
                      <div key={key}>
                        <label className="block text-white/50 mb-1 font-mono text-[11px]">Mục {key} (Vị trí {idx + 1})</label>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) => set(e.target.value)}
                          placeholder={`Nội dung mục ${key}...`}
                          className="w-full fluent-box border border-white/10 focus:border-amber-400 rounded-[2px] px-3 py-2 text-white text-xs sm:text-sm"
                        />
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="block text-white/50 font-mono text-[11px]">Trình tự chính xác (Chuỗi Key nối bằng dấu -)</label>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <input
                        type="text"
                        value={customCorrectKey}
                        onChange={(e) => setCustomCorrectKey(e.target.value.toUpperCase())}
                        placeholder="A-B-C-D"
                        className="flex-1 fluent-box border border-amber-500/40 focus:border-amber-400 rounded-[2px] px-3.5 py-2 text-amber-300 font-mono font-bold uppercase text-sm"
                      />
                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, customOptionCount);
                            setCustomCorrectKey(keys.join('-'));
                          }}
                          className="px-2.5 py-1 fluent-box-nested hover:fluent-box-nested text-amber-300 rounded-[2px] font-mono text-[10px] font-bold border border-amber-500/30"
                        >
                          Chuẩn {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, customOptionCount).join('-')}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const keys = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, customOptionCount).reverse();
                            setCustomCorrectKey(keys.join('-'));
                          }}
                          className="px-2.5 py-1 fluent-box-nested hover:fluent-box-nested text-white rounded-[2px] font-mono text-[10px]"
                        >
                          Đảo {['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'].slice(0, customOptionCount).reverse().join('-')}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* Options A, B, C, D (and E, F if ELIMINATION_6) */
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-white/40 mb-1 font-mono">Phương án A</label>
                      <input
                        type="text"
                        value={customOptionA}
                        onChange={(e) => setCustomOptionA(e.target.value)}
                        placeholder="Nội dung phương án A..."
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 font-mono">Phương án B</label>
                      <input
                        type="text"
                        value={customOptionB}
                        onChange={(e) => setCustomOptionB(e.target.value)}
                        placeholder="Nội dung phương án B..."
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 font-mono">Phương án C</label>
                      <input
                        type="text"
                        value={customOptionC}
                        onChange={(e) => setCustomOptionC(e.target.value)}
                        placeholder="Nội dung phương án C..."
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 mb-1 font-mono">Phương án D</label>
                      <input
                        type="text"
                        value={customOptionD}
                        onChange={(e) => setCustomOptionD(e.target.value)}
                        placeholder="Nội dung phương án D..."
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                  </div>

                  {customRoundType === 'ELIMINATION_6' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="block text-white/40 mb-1 font-mono">Phương án E</label>
                        <input
                          type="text"
                          value={customOptionE}
                          onChange={(e) => setCustomOptionE(e.target.value)}
                          placeholder="Nội dung phương án E..."
                          className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-white/40 mb-1 font-mono">Phương án F</label>
                        <input
                          type="text"
                          value={customOptionF}
                          onChange={(e) => setCustomOptionF(e.target.value)}
                          placeholder="Nội dung phương án F..."
                          className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-white/40 mb-1 font-medium">Đáp án Đúng (Key)</label>
                      <select
                        value={customCorrectKey}
                        onChange={(e) => setCustomCorrectKey(e.target.value)}
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white font-mono font-bold"
                      >
                        <option value="A">Phương án A</option>
                        <option value="B">Phương án B</option>
                        <option value="C">Phương án C</option>
                        <option value="D">Phương án D</option>
                        {customRoundType === 'ELIMINATION_6' && (
                          <>
                            <option value="E">Phương án E</option>
                            <option value="F">Phương án F</option>
                          </>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block text-white/40 mb-1 font-medium">Lĩnh vực kiến thức</label>
                      <input
                        type="text"
                        value={customCategory}
                        onChange={(e) => setCustomCategory(e.target.value)}
                        placeholder="An ninh mạng, Pháp luật, Kỹ thuật..."
                        className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-white/40 mb-1 font-medium">Giải thích / Căn cứ pháp lý (Thông tư, Nghị định, Luật An ninh mạng...)</label>
                <textarea
                  rows={2}
                  value={customExplanation}
                  onChange={(e) => setCustomExplanation(e.target.value)}
                  placeholder="Căn cứ pháp lý, chuẩn kỹ thuật hoặc bài học rút ra..."
                  className="w-full fluent-box border border-white/10 focus:border-blue-500 rounded-[2px] px-3 py-2 text-white"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreatingCustom(false)}
                  className="px-4 py-2 rounded-[2px] border border-white/10 text-white/60 hover:text-white"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-[2px] bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase text-xs tracking-wider transition shadow-lg shadow-blue-900/30"
                >
                  Lưu Câu Hỏi Vào Ngân Hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Keyboard Shortcuts Mapping Center & Customizer */}
      <ShortcutMappingModal
        isOpen={showShortcutsModal}
        onClose={() => setShowShortcutsModal(false)}
        onTriggerHudToast={triggerHudToast}
      />

      {/* Floating HUD Notification Toast */}
      {shortcutHudToast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-2.5 bg-[#190839]/95 border border-purple-500/50 rounded-[2px] shadow-2xl backdrop-blur-md animate-fadeIn text-white font-mono text-xs">
          <div className="w-7 h-7 rounded-[2px] fluent-box-nested text-purple-300 border border-purple-500/30 flex items-center justify-center font-bold">
            <Keyboard className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <kbd className="px-1.5 py-0.5 text-[10px] fluent-box-nested border border-purple-500/40 rounded-[2px] text-purple-200 font-bold">
                {shortcutHudToast.key}
              </kbd>
              <span className="text-[10px] text-white/40 uppercase font-mono">Phím tắt thực thi</span>
            </div>
            <p className="text-xs font-semibold text-purple-100 mt-0.5 font-sans">
              {shortcutHudToast.text}
            </p>
          </div>
        </div>
      )}

      {/* Safe Reset Countdown Modal */}
      {showResetCountdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-[24px] saturate-150/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#1a0f30]/50 backdrop-blur-md border border-red-500/30 rounded-[2px] max-w-md w-full p-6 text-center space-y-6 shadow-2xl shadow-red-900/20">
            <div className="w-16 h-16 fluent-box-nested border border-red-500/20 rounded-[2px] flex items-center justify-center mx-auto text-red-400">
              <AlertTriangle className="w-8 h-8 animate-bounce" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-white uppercase tracking-wider font-mono">
                Xác Nhận Reset Toàn Bộ Trận Đấu
              </h3>
              <p className="text-xs text-white/60 leading-relaxed">
                Hành động này sẽ xóa vĩnh viễn toàn bộ phản hồi, điểm tổng, điểm thành phần của tất cả khán giả. Toàn bộ người chơi và màn chiếu sẽ bị chuyển về Màn hình chờ (Standby).
              </p>
            </div>

            {/* Countdown Display */}
            <div className="py-4 fluent-box-nested border border-red-500/10 rounded-[2px]">
              {resetTimer > 0 ? (
                <div className="space-y-1">
                  <div className="text-4xl font-black text-red-500 font-mono tracking-widest animate-pulse">
                    {resetTimer}s
                  </div>
                  <div className="text-[10px] uppercase font-mono text-white/40 tracking-widest">
                    Hệ thống đang kiểm tra an toàn...
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-4xl font-black text-emerald-400 font-mono tracking-widest animate-pulse">
                    READY
                  </div>
                  <div className="text-[10px] uppercase font-mono text-emerald-400/80 tracking-widest font-bold">
                    Cơ chế an toàn đã được mở khóa!
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCancelReset}
                className="flex-1 py-2.5 fluent-box-nested hover:fluent-box-nested border border-white/10 text-white font-bold text-xs rounded-[2px] transition font-mono uppercase"
              >
                Hủy Bỏ
              </button>
              <button
                type="button"
                disabled={!isResetReady}
                onClick={handleExecuteReset}
                className={`flex-1 py-2.5 font-bold text-xs rounded-[2px] transition font-mono uppercase tracking-widest ${
                  isResetReady
                    ? 'bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-950/50 cursor-pointer animate-pulse'
                    : 'bg-red-950/40 backdrop-blur-md text-white/20 border border-red-950/60 cursor-not-allowed'
                }`}
              >
                Xác Nhận Xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Poll Control Modal */}
      <EmergencyPollControl
        gameState={gameState}
        allResponses={allResponses}
        activeAudienceCount={activeCount}
        isOpen={showEmergencyPollModal}
        onClose={() => setShowEmergencyPollModal(false)}
        onOpenHistoryTab={() => {
          setActiveAdminTab('POLL_HISTORY');
        }}
        initialDraft={relaunchDraft}
        onClearInitialDraft={() => setRelaunchDraft(null)}
      />

      {/* Announcer Overlay Control Modal */}
      <AnnouncerControlModal
        isOpen={showAnnouncerModal}
        onClose={() => setShowAnnouncerModal(false)}
        gameState={gameState}
      />

      {/* Floating Host Pacing Toaster Notifications */}
      <HostPacingToaster
        toasts={pacingToasts}
        onDismiss={handleDismissPacingToast}
        onQuickLock={handleLockVoting}
        isGameActive={gameState.status === 'ACTIVE'}
      />

      {/* Real-time Audience Activity Feed Overlay */}
      <AudienceActivityFeed 
        gameState={gameState} 
        allResponses={allResponses} 
      />

      {/* Camera Shutter Flash Overlay */}
      {snapshotFlash && (
        <div className="fixed inset-0 z-[9999] bg-white/70 pointer-events-none transition-opacity duration-300 animate-fadeOut" />
      )}

      {/* Hidden Virtual Stage Capture Canvas for Background Snapshots */}
      {/* Global Confirm Dialog */}
      {confirmDialog.isOpen && (
        <div className="fluent-dialog-overlay animate-fadeIn">
          <div className="max-w-md w-full bg-[#160731]/90 backdrop-blur-xl border border-rose-500/30 rounded-[2px] p-6 shadow-2xl text-white">
            <h3 className="font-black text-rose-300 text-lg">{confirmDialog.title}</h3>
            <p className="text-white/70 text-sm mt-2 whitespace-pre-line">
              {confirmDialog.content}
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeConfirm}
                className="px-4 py-2 rounded-[2px] fluent-box hover:bg-white/15 text-white font-bold text-sm transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  closeConfirm();
                }}
                className="px-4 py-2 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-bold text-sm transition shadow-lg shadow-rose-900/50 cursor-pointer"
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        ref={projectorCaptureRef}
        id="projector-virtual-capture-stage"
        aria-hidden="true"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '0',
          width: '1280px',
          minHeight: '720px',
          height: 'auto',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 1
        }}
      >
        <ProjectorView
          gameState={gameState}
          responses={currentResponses}
          allResponses={allResponses}
          activeCount={activeCount}
        />
      </div>

      <AdminContextMenu
        isOpen={contextMenuState.isOpen}
        position={{ x: contextMenuState.x, y: contextMenuState.y }}
        onClose={() => setContextMenuState(prev => ({ ...prev, isOpen: false }))}
        gameState={gameState}
        activeAdminTab={activeAdminTab}
        onStartQuestion={handleStartQuestion}
        onLockVoting={handleLockVoting}
        onRevealResults={handleRevealResults}
        onReturnToStandby={handleReturnToStandby}
        onNavigateNext={handleNavigateNextQuestion}
        onNavigatePrev={handleNavigatePrevQuestion}
        onToggleLiveQr={() => handleToggleLiveQrModal()}
        onOpenAnnouncer={() => setShowAnnouncerModal(true)}
        onOpenEmergencyPoll={() => setShowEmergencyPollModal(true)}
        onOpenShortcuts={() => setShowShortcutsModal(true)}
        onSnapSnapshot={() => handleSnapAudienceInteraction()}
        onSwitchTab={(tab) => {
          setActiveAdminTab(tab);
          if (tab === 'LUCKY_DRAW') {
            syncService.updateGameState({ active_module: 'LUCKY_DRAW' });
          } else if (gameState.active_module === 'LUCKY_DRAW') {
            syncService.updateGameState({ active_module: 'GAME' });
          }
          if (tab === 'VCNV') {
            const vcnvQ = questionBank.find(q => q.round_name.includes('Vượt Chướng Ngại Vật') || q.id.startsWith('VCNV'));
            if (vcnvQ && gameState.question_id !== vcnvQ.id) {
              handleLoadQuestion(vcnvQ.id);
            }
          }
          triggerHudToast('TAB', `Đã chuyển sang tab: ${tab}`);
        }}
        onViewChange={onViewChange}
        onCopyQuestionText={() => {
          if (gameState.question_text) {
            navigator.clipboard.writeText(gameState.question_text).then(() => {
              triggerHudToast('COPY', 'Đã sao chép nội dung câu hỏi!');
            }).catch(() => {});
          }
        }}
        onCopyAudienceLink={handleCopyAudienceLink}
        onForceResync={() => {
          syncService.updateGameState({ last_updated: Date.now() });
          triggerHudToast('SYNC', 'Đã gửi tín hiệu đồng bộ toàn hệ thống!');
        }}
        onExportCsv={() => {
          const spssData = generateSPSSData(allResponses, questionBank);
          exportToCSV(spssData, `BTI2026_SPSS_Data_${new Date().toISOString().slice(0, 10)}`);
          triggerHudToast('EXPORT', 'Đã xuất file dữ liệu SPSS CSV!');
        }}
        onPlaySoundEffect={handlePlaySoundEffect}
      />

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[350] bg-purple-950/90 border border-purple-500/40 text-purple-200 px-4 py-3 rounded-[2px] shadow-2xl flex items-center gap-2 animate-fadeIn text-sm">
          <AlertCircle className="w-4 h-4 text-purple-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
      </div>
    </FluentProvider>
  );
};

