/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { GameState, UserInfo, QR_PALETTES, QrPaletteId, AdminUser } from './types';
import { syncService, DEFAULT_GAME_STATE } from './services/syncService';
import { workerComputeService } from './services/workerComputeService';
import { signOut } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

import { auth, db, removeUndefined } from './firebase';
import { soundFx } from './services/audioEffects';
import { vibrateTap, vibrateCopy } from './utils/hapticUtils';
import { Copy, Check, Share2, X, QrCode as QrIcon, RotateCcw, AlertTriangle, Sparkles, ScanLine } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { generate12DigitUID } from './utils/uidUtils';
import { getSecureItem, setSecureItem, removeSecureItem } from './utils/secureStorage';
import { NotificationToast } from './components/NotificationToast';
import { OfflineBanner } from './components/OfflineBanner';
import { FluentTooltip } from './components/FluentTooltip';
import { CrossFadeQrCode } from './components/CrossFadeQrCode';
import { useAnimationControl } from './contexts/AnimationControlContext';
import { applyBatterySaverClasses, getBatterySaverMode, setBatterySaverMode } from './utils/batterySaverUtils';
import { useLanguage } from './hooks/useLanguage';
import { lazyWithRetry } from './utils/lazyWithRetry';
import { ViewErrorBoundary } from './components/ViewErrorBoundary';
import {
  getStoredAdminAuth,
  getStoredAdminUser,
  persistAdminSession,
  clearAdminSession,
  ADMIN_INACTIVITY_LIMIT_MS,
} from './utils/adminSession';

const FirstVisitConsentModal = lazyWithRetry(
  () => import('./components/FirstVisitConsentModal').then(m => ({ default: m.FirstVisitConsentModal })),
  'FirstVisitConsentModal'
);
const CookieConsentBanner = lazyWithRetry(
  () => import('./components/CookieConsentBanner').then(m => ({ default: m.CookieConsentBanner })),
  'CookieConsentBanner'
);
const LiveSubtitleOverlay = lazyWithRetry(
  () => import('./components/LiveSubtitleOverlay').then(m => ({ default: m.LiveSubtitleOverlay })),
  'LiveSubtitleOverlay'
);
const LoudEnvironmentAlert = lazyWithRetry(
  () => import('./components/LoudEnvironmentAlert').then(m => ({ default: m.LoudEnvironmentAlert })),
  'LoudEnvironmentAlert'
);
const FloatingDebugPanel = lazyWithRetry(
  () => import('./components/FloatingDebugPanel').then(m => ({ default: m.FloatingDebugPanel })),
  'FloatingDebugPanel'
);
const AntiExitGuard = lazyWithRetry(
  () => import('./components/AntiExitGuard').then(m => ({ default: m.AntiExitGuard })),
  'AntiExitGuard'
);
const SebAntiCheatGuard = lazyWithRetry(
  () => import('./components/SebAntiCheatGuard').then(m => ({ default: m.SebAntiCheatGuard })),
  'SebAntiCheatGuard'
);
const ChatAssistantWidget = lazyWithRetry(
  () => import('./components/ChatAssistantWidget').then(m => ({ default: m.ChatAssistantWidget })),
  'ChatAssistantWidget'
);

const AudienceView = lazyWithRetry(
  () => import('./components/AudienceView').then(m => ({ default: m.AudienceView })),
  'AudienceView'
);
const AdminPortal = lazyWithRetry(
  () => import('./components/AdminPortal').then(m => ({ default: m.AdminPortal })),
  'AdminPortal'
);
const ProjectorView = lazyWithRetry(
  () => import('./components/ProjectorView').then(m => ({ default: m.ProjectorView })),
  'ProjectorView'
);
const LandingPage = lazyWithRetry(
  () => import('./components/LandingPage').then(m => ({ default: m.LandingPage })),
  'LandingPage'
);
const ClientLandingPage = lazyWithRetry(
  () => import('./components/ClientLandingPage').then(m => ({ default: m.ClientLandingPage })),
  'ClientLandingPage'
);
const PolicyPage = lazyWithRetry(
  () => import('./components/PolicyPage').then(m => ({ default: m.PolicyPage })),
  'PolicyPage'
);
const OnboardingModal = lazyWithRetry(
  () => import('./components/OnboardingModal').then(m => ({ default: m.OnboardingModal })),
  'OnboardingModal'
);
const ProfileModal = lazyWithRetry(
  () => import('./components/ProfileModal').then(m => ({ default: m.ProfileModal })),
  'ProfileModal'
);
const FirebaseConfigModal = lazyWithRetry(
  () => import('./components/FirebaseConfigModal').then(m => ({ default: m.FirebaseConfigModal })),
  'FirebaseConfigModal'
);
const PasswordGate = lazyWithRetry(
  () => import('./components/PasswordGate').then(m => ({ default: m.PasswordGate })),
  'PasswordGate'
);
const InstallAppModal = lazyWithRetry(
  () => import('./components/InstallAppModal').then(m => ({ default: m.InstallAppModal })),
  'InstallAppModal'
);

export default function App() {
  const { localLanguage } = useLanguage();
  const { isBatterySaver, batteryLevel } = useAnimationControl();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = localLanguage || 'vi';
    }
  }, [localLanguage]);

  const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [audienceJoinUrl, setAudienceJoinUrl] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [isCopiedQrUrl, setIsCopiedQrUrl] = useState(false);
  const [batteryToast, setBatteryToast] = useState<{message: string, show: boolean}>({ message: '', show: false });
  const [isBatteryToastDismissed, setIsBatteryToastDismissed] = useState(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAudienceQrDismissed, setIsAudienceQrDismissed] = useState(false);
  const [isLocalAudienceQrOpen, setIsLocalAudienceQrOpen] = useState(false);

  useEffect(() => {
    if (batteryLevel === null) return;

    if (batteryLevel <= 0.15) {
      if (!isBatteryToastDismissed) {
        const pct = Math.round(batteryLevel * 100);
        const msg = localLanguage !== 'vi'
          ? `Battery is down to ${pct}% — Plug in your charger so you don't miss the next question!`
          : `Pin máy còn ${pct}% thôi — Cắm sạc ngay kẻo lỡ câu hỏi tiếp theo nhé!`;
        setBatteryToast({ message: msg, show: true });
      }
    } else {
      setIsBatteryToastDismissed(false);
      setBatteryToast(prev => prev.show ? { message: '', show: false } : prev);
    }
  }, [batteryLevel, isBatteryToastDismissed, localLanguage]);

  const handleDismissBatteryToast = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    setIsBatteryToastDismissed(true);
    setBatteryToast({ message: '', show: false });
  }, []);

  useEffect(() => {
    if (gameState.show_qr) {
      setIsAudienceQrDismissed(false);
    }
  }, [gameState.show_qr]);

  const handleCloseAudienceQrModal = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    setIsAudienceQrDismissed(true);
    setIsLocalAudienceQrOpen(false);
  }, []);

  const generateQrCode = useCallback(async (urlToEncode: string, paletteId?: string, transparentBg?: boolean) => {
    if (!urlToEncode) return;
    setQrError(null);
    const activePaletteId = (paletteId || gameState.qr_color_palette || 'purple_gold') as QrPaletteId;
    const palette = QR_PALETTES[activePaletteId] || QR_PALETTES.purple_gold;
    const isTransparent = transparentBg !== undefined ? transparentBg : Boolean(gameState.qr_transparent_bg);

    const qrTargetUrl = urlToEncode + (urlToEncode.includes('?') ? '&' : '?') + 'src=qr';
    try {
      const url = await workerComputeService.generateQrDataUrl({
        text: qrTargetUrl,
        width: 320,
        margin: 2,
        dark: palette.dark,
        light: isTransparent ? '#00000000' : palette.light,
        errorCorrectionLevel: 'H'
      });
      setQrDataUrl(url);
      setQrError(null);
    } catch (err) {
      console.error('QR code generation error:', err);
      setQrError(localLanguage !== 'vi' ? 'Could not create the QR code yet. Tap below to try again!' : 'Chưa tạo được mã QR rồi. Bạn bấm thử lại chút nhé!');
    }
  }, [gameState.qr_color_palette, gameState.qr_transparent_bg, localLanguage]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const isFromQr = urlParams.get('src') === 'qr' || urlParams.get('ref') === 'qr' || urlParams.get('source') === 'qr';
        const scanSessionKey = 'BTI2026_QR_SCAN_RECORDED';
        if (isFromQr && !sessionStorage.getItem(scanSessionKey)) {
          sessionStorage.setItem(scanSessionKey, '1');
          syncService.recordQrScan('mobile_qr');
        }
      } catch (err) {
        console.warn('Could not record QR scan event:', err);
      }
    }
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let fullUrl = window.location.origin + window.location.pathname;
      if (fullUrl.includes('ais-dev-')) {
        fullUrl = fullUrl.replace('ais-dev-', 'ais-pre-');
      }
      setAudienceJoinUrl(fullUrl);
    }
  }, []);

  const handleRetryQr = useCallback(() => {
    const targetUrl = audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : 'https://bti2027.app');
    generateQrCode(targetUrl);
  }, [audienceJoinUrl, generateQrCode]);

  const handleCopyQrLink = useCallback(() => {
    const urlToCopy = audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : '');
    if (!urlToCopy) return;
    vibrateCopy();
    soundFx.playClick();
    navigator.clipboard.writeText(urlToCopy).then(() => {
      setIsCopiedQrUrl(true);
      setTimeout(() => setIsCopiedQrUrl(false), 2000);
    }).catch(() => {
      setIsCopiedQrUrl(true);
      setTimeout(() => setIsCopiedQrUrl(false), 2000);
    });
  }, [audienceJoinUrl]);

  const handleShareQrLink = useCallback(async () => {
    const urlToShare = audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : '');
    vibrateTap();
    soundFx.playClick();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: localLanguage !== 'vi' ? 'BTI 2027 - Live Interactive Arena' : 'BTI 2027 - Đấu Trường Trực Tiếp',
          text: localLanguage !== 'vi' ? 'Join the real-time interactive BTI 2027 arena now!' : 'Tham gia trực tiếp đấu trường tương tác BTI 2027 ngay bây giờ!',
          url: urlToShare
        });
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Lỗi chia sẻ:', err);
        }
      }
    } else {
      handleCopyQrLink();
    }
  }, [audienceJoinUrl, handleCopyQrLink, localLanguage]);

  const [currentView, setCurrentView] = useState<'landing' | 'client_landing' | 'audience' | 'admin' | 'projector' | 'policy'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
      if (path.includes('policy') || path.includes('privacy') || params.get('view') === 'policy' || params.get('view') === 'privacy' || params.get('page') === 'policy' || params.get('page') === 'privacy') {
        return 'policy';
      }
      if (path.includes('admin') || params.get('view') === 'admin') {
        return 'admin';
      }
      if (path.includes('projector') || params.get('view') === 'projector') {
        return 'projector';
      }
      if (params.get('view') === 'audience') {
        return 'audience';
      }
      if (params.get('view') === 'landing') {
        return 'landing';
      }
      const savedUser = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
      if (!savedUser) return 'landing';
    }
    return 'audience';
  });

  const isAudienceQrVisible =
    ((gameState.show_qr && !isAudienceQrDismissed) || isLocalAudienceQrOpen) &&
    currentView !== 'admin' &&
    currentView !== 'projector';

  useEffect(() => {
    if (audienceJoinUrl && isAudienceQrVisible) {
      generateQrCode(audienceJoinUrl, gameState.qr_color_palette, gameState.qr_transparent_bg);
    }
  }, [audienceJoinUrl, isAudienceQrVisible, gameState.qr_color_palette, gameState.qr_transparent_bg, generateQrCode]);

  const [previousView, setPreviousView] = useState<'landing' | 'client_landing' | 'audience' | 'admin' | 'projector' | 'policy' | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = sessionStorage.getItem('BTI2026_PREV_VIEW');
        if (stored && ['landing', 'client_landing', 'audience', 'admin', 'projector'].includes(stored)) {
          return stored as any;
        }
      } catch {}
    }
    return null;
  });

  const getPreviousViewDisplayName = useCallback((viewKey: string | null): string => {
    switch (viewKey) {
      case 'admin':
        return localLanguage !== 'vi' ? 'Organizer Portal' : 'Trang Ban Tổ Chức';
      case 'client_landing':
        return localLanguage !== 'vi' ? 'Waiting Room' : 'Phòng Chờ Sự Kiện';
      case 'audience':
        return localLanguage !== 'vi' ? 'Live Stage' : 'Sân Khấu Tương Tác';
      case 'landing':
        return localLanguage !== 'vi' ? 'Home' : 'Trang Chủ';
      case 'projector':
        return localLanguage !== 'vi' ? 'Stage Projector' : 'Màn Chiếu Sân Khấu';
      default: {
        const hasSavedProfile = Boolean(getSecureItem('BTI2026_USER_PROFILE'));
        return hasSavedProfile ? (localLanguage !== 'vi' ? 'Live Stage' : 'Sân Khấu Tương Tác') : (localLanguage !== 'vi' ? 'Home' : 'Trang Chủ');
      }
    }
  }, [localLanguage]);

  const handleNavigateToPolicy = useCallback((targetTab?: 'PRIVACY' | 'TERMS_AI' | 'SUBJECT_RIGHTS') => {
    soundFx.playClick();
    vibrateTap();
    if (currentView !== 'policy') {
      setPreviousView(currentView);
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem('BTI2026_PREV_VIEW', currentView);
        } catch {}
        const url = new URL(window.location.href);
        url.searchParams.set('view', 'policy');
        if (targetTab) {
          url.searchParams.set('tab', targetTab.toLowerCase());
        }
        window.history.pushState({ prevView: currentView }, '', url.toString());
      }
    }
    setCurrentView('policy');
  }, [currentView]);

  const handleBackFromPolicy = useCallback(() => {
    soundFx.playClick();
    vibrateTap();
    let targetView: 'landing' | 'client_landing' | 'audience' | 'admin' | 'projector' = 'landing';
    if (previousView && previousView !== 'policy') {
      targetView = previousView as any;
    } else {
      let stored: string | null = null;
      try {
        stored = typeof window !== 'undefined' ? sessionStorage.getItem('BTI2026_PREV_VIEW') : null;
      } catch {}
      if (stored && ['landing', 'client_landing', 'audience', 'admin', 'projector'].includes(stored)) {
        targetView = stored as any;
      } else {
        const savedUser = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
        targetView = savedUser ? 'audience' : 'landing';
      }
    }

    setCurrentView(targetView);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      if (targetView === 'audience') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', targetView);
      }
      url.searchParams.delete('tab');
      url.searchParams.delete('page');
      window.history.replaceState({}, '', url.toString());
    }
  }, [previousView]);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const path = window.location.pathname.toLowerCase();
        if (path.includes('policy') || path.includes('privacy') || params.get('view') === 'policy' || params.get('view') === 'privacy' || params.get('page') === 'policy') {
          setCurrentView('policy');
        } else if (e.state?.prevView && ['landing', 'client_landing', 'audience', 'admin', 'projector'].includes(e.state.prevView)) {
          setCurrentView(e.state.prevView);
        } else if (params.get('view')) {
          const v = params.get('view') as any;
          if (['landing', 'client_landing', 'audience', 'admin', 'projector'].includes(v)) {
            setCurrentView(v);
          }
        } else {
          const savedUser = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
          setCurrentView(savedUser ? 'audience' : 'landing');
        }
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (currentView === 'admin') {
      syncService.setClientRole('ADMIN');
    } else if (currentView === 'projector') {
      syncService.setClientRole('PROJECTOR');
    } else {
      syncService.setClientRole('AUDIENCE');
    }
  }, [currentView]);

  const [lastRouteTs, setLastRouteTs] = useState<number>(0);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => getStoredAdminAuth());

  const [adminUser, setAdminUser] = useState<AdminUser | null>(() => getStoredAdminUser());

  const handleAuthenticate = useCallback((techUser?: AdminUser, keepLoggedIn: boolean = true) => {
    setIsAuthenticated(true);
    if (techUser) {
      setAdminUser(techUser);
    }
    persistAdminSession(techUser || null, undefined, keepLoggedIn);
  }, []);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setAdminUser(null);
    clearAdminSession();
    setCurrentView('landing');
  }, []);

  const [systemNotice, setSystemNotice] = useState<string | null>(null);

  useEffect(() => {
    const handleNotice = (e: Event) => {
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      if (detail?.message) {
        const raw = detail.message.trim();
        const isConnErr = /connection error|network error|mất kết nối|lỗi kết nối/i.test(raw);
        const friendlyMsg = isConnErr
          ? (localLanguage !== 'vi' ? 'Reconnecting right now!' : 'Đang kết nối lại chút nhé!')
          : raw;
        setSystemNotice(friendlyMsg);
      }
    };
    window.addEventListener('bti_system_notice', handleNotice);
    return () => window.removeEventListener('bti_system_notice', handleNotice);
  }, [localLanguage]);

  useEffect(() => {
    if (!systemNotice) return;
    const t = setTimeout(() => setSystemNotice(null), 5000);
    return () => clearTimeout(t);
  }, [systemNotice]);

  useEffect(() => {
    if (!isAuthenticated) return;

    let timerId: ReturnType<typeof setTimeout> | null = null;

    const logoutDueToInactivity = () => {
      clearAdminSession();
      setIsAuthenticated(false);
      setAdminUser(null);
      setCurrentView('landing');
      setSystemNotice(
        localLanguage !== 'vi'
          ? 'Signed out automatically after 30 minutes of inactivity to keep your account safe!'
          : 'Mình tạm đăng xuất sau 30 phút vắng mặt để giữ an toàn tài khoản nhé!'
      );
    };

    const resetTimer = () => {
      if (timerId) clearTimeout(timerId);
      timerId = setTimeout(logoutDueToInactivity, ADMIN_INACTIVITY_LIMIT_MS);
    };

    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'pointerdown'];

    resetTimer();

    events.forEach(evt => {
      window.addEventListener(evt, resetTimer, { passive: true });
    });

    return () => {
      if (timerId) clearTimeout(timerId);
      events.forEach(evt => {
        window.removeEventListener(evt, resetTimer);
      });
    };
  }, [isAuthenticated, localLanguage]);

  const handleAudienceLogout = useCallback(() => {
    try {
      if (auth) {
        signOut(auth);
      }
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('BTI2026_AUDIENCE_SESSION_ACTIVE');
        localStorage.removeItem('BTI2026_AUDIENCE_KEEP_LOGGED_IN');
      }
    } catch (e) {
      console.error('SignOut error:', e);
    }
    setUser(null);
    removeSecureItem('BTI2026_USER_PROFILE');
    setCurrentView('landing');
  }, []);

  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    return getBatterySaverMode();
  });

  const handleToggleHighContrast = useCallback(() => {
    const nextVal = !getBatterySaverMode();
    setBatterySaverMode(nextVal);
    setIsHighContrast(nextVal);
  }, []);

  useEffect(() => {
    const isModeActive = isHighContrast || getBatterySaverMode();
    applyBatterySaverClasses(isModeActive);
  }, [isHighContrast]);

  useEffect(() => {
    const handleBatterySaverChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ enabled: boolean }>;
      setIsHighContrast(customEvent.detail.enabled);
    };
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'bti_battery_saver_mode' || e.key === 'bti_audience_high_contrast') {
        setIsHighContrast(getBatterySaverMode());
      }
      if (e.key === 'bti_soundfx_enabled') {
        const nextVal = e.newValue !== 'false';
        setSoundEnabled(nextVal);
        soundFx.setEnabled(nextVal);
      }
    };
    window.addEventListener('bti_battery_saver_changed', handleBatterySaverChange);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('bti_battery_saver_changed', handleBatterySaverChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  const [user, setUser] = useState<UserInfo | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const keepLoggedIn = localStorage.getItem('BTI2026_AUDIENCE_KEEP_LOGGED_IN');
        const sessionActive = sessionStorage.getItem('BTI2026_AUDIENCE_SESSION_ACTIVE');
        if (keepLoggedIn === 'false' && !sessionActive) {
          removeSecureItem('BTI2026_USER_PROFILE');
          return null;
        }

        const saved = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
        if (saved) {
          sessionStorage.setItem('BTI2026_AUDIENCE_SESSION_ACTIVE', 'true');
          if (!saved.anonymizedUid || saved.anonymizedUid.length !== 12) {
            saved.anonymizedUid = generate12DigitUID(
              saved.name || 'Audience',
              saved.mssv || '',
              saved.gender || '1',
              saved.birthYear || '2004'
            );
            setSecureItem('BTI2026_USER_PROFILE', saved);
          }
          return saved;
        }
      } catch {}
    }
    return null;
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundFx.isEnabled());
  useEffect(() => soundFx.subscribeEnabled(setSoundEnabled), []);
  const [isOfflineBannerDismissed, setIsOfflineBannerDismissed] = useState<boolean>(false);

  const handleUserSynced = useCallback((profile: UserInfo) => {
    setUser(prev => {
      if (prev && JSON.stringify(prev) === JSON.stringify(profile)) {
        return prev;
      }
      return profile;
    });
  }, []);

  useEffect(() => {
    if (!user && currentView === 'audience') {
      setIsOnboardingOpen(true);
    }
  }, [user, currentView]);

  useEffect(() => {
    if (gameState.force_route_ts && gameState.force_route_ts > lastRouteTs) {
      setLastRouteTs(gameState.force_route_ts);
      if (currentView !== 'admin' && currentView !== 'projector' && currentView !== 'policy' && gameState.force_route) {
        if (currentView === 'landing' && gameState.force_route === 'audience') {
          return;
        }
        setCurrentView(gameState.force_route as 'landing' | 'client_landing' | 'audience' | 'projector');
      }
    }
  }, [gameState.force_route_ts, gameState.force_route, lastRouteTs, currentView]);

  const [prevConnected, setPrevConnected] = useState<boolean | null>(null);
  useEffect(() => {
    if (prevConnected !== null) {
      if (isFirebaseConnected && !prevConnected) {
        soundFx.playPacingChime('complete');
      } else if (!isFirebaseConnected && prevConnected && !syncService.isOfflineModeEnabled()) {
        soundFx.playError();
      }
    }
    setPrevConnected(isFirebaseConnected);
  }, [isFirebaseConnected, prevConnected]);

  useEffect(() => {
    const unsubState = syncService.subscribeToState((state, changedKeys) => {
      if (changedKeys && changedKeys.length === 0) return;
      setGameState(state);
    });

    const unsubConnection = syncService.subscribeToConnection((connected) => {
      setIsFirebaseConnected(connected);
    });

    return () => {
      unsubState();
      unsubConnection();
    };
  }, []);

  const handleToggleSound = useCallback(() => {
    setSoundEnabled(prev => {
      const next = !prev;
      soundFx.setEnabled(next);
      if (next) {
        soundFx.notifyUserInteraction();
        soundFx.playClick();
      }
      return next;
    });
  }, []);

  const handleNavbarViewChange = useCallback((view: 'landing' | 'client_landing' | 'audience' | 'admin' | 'projector' | 'policy') => {
    if (view === 'policy') {
      handleNavigateToPolicy();
      return;
    }
    setCurrentView(view);
    if (typeof window !== 'undefined' && window.history) {
      const url = new URL(window.location.href);
      if (view === 'audience') {
        url.searchParams.delete('view');
      } else {
        url.searchParams.set('view', view);
      }
      window.history.replaceState({}, '', url.toString());
    }
  }, [handleNavigateToPolicy]);

  const handleNavbarOpenProfile = useCallback(() => {
    if (user) {
      setIsProfileModalOpen(true);
    } else {
      setIsOnboardingOpen(true);
    }
  }, [user]);

  const handleNavbarOpenFirebaseConfig = useCallback(() => setIsFirebaseConfigOpen(true), []);
  const handleNavbarOpenInstallModal = useCallback(() => setIsInstallModalOpen(true), []);
  const handleNavbarOpenQrCode = useCallback(() => {
    if (currentView === 'admin') {
      syncService.updateGameState({ show_qr: true });
    } else {
      setIsAudienceQrDismissed(false);
      setIsLocalAudienceQrOpen(true);
    }
  }, [currentView]);

  const handleOpenOnboarding = useCallback(() => setIsOnboardingOpen(true), []);
  const handleEnterAudience = useCallback(() => {
    if (gameState.force_route === 'client_landing') {
      setCurrentView('client_landing');
      return;
    }
    setCurrentView('audience');
  }, [gameState.force_route]);
  const handleEnterAdmin = useCallback(() => setCurrentView('admin'), []);
  const handleEnterProjector = useCallback(() => setCurrentView('projector'), []);
  const handleGoHome = useCallback(() => setCurrentView('landing'), []);
  const handleAdminViewChange = useCallback((view: 'landing' | 'audience' | 'admin' | 'projector') => {
    setCurrentView(view);
  }, []);
  const handleExitOnboarding = useCallback(() => {
    if (user && isOnboardingOpen) {
      setIsOnboardingOpen(false);
    } else {
      setCurrentView('landing');
    }
  }, [user, isOnboardingOpen]);
  const handleCloseProfileModal = useCallback(() => setIsProfileModalOpen(false), []);
  const handleUpdateUser = useCallback((updatedUser: UserInfo) => {
    setUser(updatedUser);
    setSecureItem('BTI2026_USER_PROFILE', updatedUser);
  }, []);
  const handleCloseFirebaseConfigModal = useCallback(() => {
    setIsFirebaseConfigOpen(false);
    setIsFirebaseConnected(syncService.getIsFirebaseConnected());
  }, []);
  const handleCloseInstallModal = useCallback(() => setIsInstallModalOpen(false), []);
  const handleDismissOfflineBanner = useCallback(() => {
    setIsOfflineBannerDismissed(true);
    setTimeout(() => {
      setIsOfflineBannerDismissed(false);
    }, 60000);
  }, []);
  const handleRequestDataDeletion = useCallback(() => {
    if (user) {
      setIsProfileModalOpen(true);
    } else {
      setIsOnboardingOpen(true);
    }
  }, [user]);
  const handleOpenLandingPolicy = useCallback(() => handleNavigateToPolicy(), [handleNavigateToPolicy]);
  const handleOpenPolicyTab = useCallback((tab?: 'PRIVACY' | 'TERMS_AI' | 'SUBJECT_RIGHTS') => {
    handleNavigateToPolicy(tab);
  }, [handleNavigateToPolicy]);

  const activeQrPalette = useMemo(
    () => QR_PALETTES[(gameState.qr_color_palette as QrPaletteId) || 'purple_gold'] || QR_PALETTES.purple_gold,
    [gameState.qr_color_palette]
  );

  useEffect(() => {
    soundFx.setAdminMuted(currentView === 'admin');
  }, [currentView]);

  useEffect(() => {
    soundFx.syncAppSoundContext({
      currentView,
      isAdminAuthenticated: isAuthenticated,
      hasAudienceUser: Boolean(user),
      isOnboardingOpen,
      activeModule: gameState.active_module || 'GAME',
      gameStatus: gameState.status || 'STANDBY',
      drawStatus: gameState.lucky_draw?.status || 'IDLE',
      spinSeed: gameState.lucky_draw?.seed ?? gameState.lucky_draw?.draw_timestamp ?? null,
      adminMusicMuted: Boolean(gameState.lucky_draw_music_muted),
      autoStopOnMusicEnd: Boolean(
        gameState.lucky_draw?.status === 'SPINNING'
          ? (gameState.lucky_draw?.auto_stop_on_music_end ?? gameState.lucky_draw_auto_stop_on_music_end)
          : gameState.lucky_draw_auto_stop_on_music_end
      ),
      isMatchBreakActive: Boolean(gameState.match_break?.active),
      eventScheduleEnabled: Boolean(gameState.event_schedule?.enabled),
      eventScheduleStatus: gameState.event_schedule?.status || 'IN_PROGRESS',
    });
  }, [
    currentView,
    isAuthenticated,
    user,
    isOnboardingOpen,
    gameState.active_module,
    gameState.status,
    gameState.lucky_draw?.status,
    gameState.lucky_draw?.seed,
    gameState.lucky_draw?.draw_timestamp,
    gameState.lucky_draw?.auto_stop_on_music_end,
    gameState.lucky_draw_music_muted,
    gameState.lucky_draw_auto_stop_on_music_end,
    gameState.match_break?.active,
    gameState.event_schedule?.enabled,
    gameState.event_schedule?.status,
  ]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleUserGesture = () => {
      soundFx.notifyUserInteraction();
    };
    window.addEventListener('click', handleUserGesture, { passive: true });
    window.addEventListener('touchend', handleUserGesture, { passive: true });
    window.addEventListener('pointerup', handleUserGesture, { passive: true });
    window.addEventListener('keydown', handleUserGesture, { passive: true });
    return () => {
      window.removeEventListener('click', handleUserGesture);
      window.removeEventListener('touchend', handleUserGesture);
      window.removeEventListener('pointerup', handleUserGesture);
      window.removeEventListener('keydown', handleUserGesture);
    };
  }, []);

  // Global Escape key listener to close modals & 'M' hotkey to toggle sound
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable
      );

      if (e.key === 'Escape') {
        let closed = false;
        if (isProfileModalOpen) {
          setIsProfileModalOpen(false);
          closed = true;
        }
        if (isFirebaseConfigOpen) {
          setIsFirebaseConfigOpen(false);
          closed = true;
        }
        if (isInstallModalOpen) {
          setIsInstallModalOpen(false);
          closed = true;
        }
        if (isLocalAudienceQrOpen) {
          setIsLocalAudienceQrOpen(false);
          closed = true;
        }
        if (gameState.show_qr && !isAudienceQrDismissed) {
          setIsAudienceQrDismissed(true);
          closed = true;
        }
        if (isOnboardingOpen && user) {
          setIsOnboardingOpen(false);
          closed = true;
        }
        if (closed) {
          vibrateTap();
          soundFx.playClick();
        }
      } else if (!isInput && (e.key === 'm' || e.key === 'M') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        handleToggleSound();
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [isProfileModalOpen, isFirebaseConfigOpen, isInstallModalOpen, isLocalAudienceQrOpen, gameState.show_qr, isAudienceQrDismissed, isOnboardingOpen, user, soundEnabled]);

  const handleUserComplete = async (userInfo: UserInfo) => {
    if (!userInfo.uid) {
      const uidRandBytes = new Uint8Array(4);
      globalThis.crypto.getRandomValues(uidRandBytes);
      const uidSuffix = Array.from(uidRandBytes, (b) => b.toString(36)).join('').slice(0, 5);
      userInfo.uid = `aud_${Date.now()}_${uidSuffix}`;
    }
    if (!userInfo.anonymizedUid || userInfo.anonymizedUid.length !== 12) {
      userInfo.anonymizedUid = generate12DigitUID(
        userInfo.name || '',
        userInfo.mssv || '',
        userInfo.gender || '1',
        userInfo.birthYear || '2004'
      );
    }
    setUser(userInfo);
    setSecureItem('BTI2026_USER_PROFILE', userInfo);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('BTI2026_AUDIENCE_SESSION_ACTIVE', 'true');
    }
    setIsOnboardingOpen(false);
    syncService.sendPresencePing(userInfo);
    
    try {
      await setDoc(doc(db, 'users', userInfo.uid), removeUndefined(userInfo), { merge: true });
    } catch (e) {
      console.warn("Notice saving user profile to firestore:", e);
    }
  };

  return (
    <div className={`min-h-[100dvh] h-[100dvh] overflow-hidden ${currentView === 'policy' ? 'bg-[#0D0420]' : 'bg-transparent'} text-[#F5EFF9] font-sans flex flex-col antialiased selection:bg-[#F7CAC9] selection:text-[#190839] relative z-0`}>
      {!(isHighContrast || isBatterySaver || currentView === 'policy') && (
        <>
          <div className="fixed inset-0 z-[-3] bg-[#190839]/50 backdrop-blur-md pointer-events-none">
            <div className="absolute top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-[#F7CAC9]/10 backdrop-blur-md rounded-full blur-[120px] pointer-events-none animate-pulse" />
            <div className="absolute bottom-1/4 -right-1/4 w-[50vw] h-[50vw] bg-[#3E1D74]/30 backdrop-blur-md rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
          </div>
          <div className="fixed inset-0 z-[-1] fluent-noise-overlay opacity-20 mix-blend-overlay pointer-events-none" />
        </>
      )}

      {systemNotice && (
        <div
          role="status"
          aria-live="polite"
          tabIndex={0}
          aria-label={localLanguage !== 'vi' ? `Quick notice: ${systemNotice}` : `Nhắn nhanh: ${systemNotice}`}
          className="fixed top-16 left-1/2 -translate-x-1/2 z-[120] max-w-md w-[calc(100%-2rem)] fluent-toast px-4 py-3 text-xs sm:text-sm font-medium text-[#F5EFF9] flex items-center justify-between gap-3 animate-fluent-toast-enter outline-none focus-visible:ring-2 focus-visible:ring-[#F7CAC9]"
        >
          <span>{systemNotice}</span>
          <button
            type="button"
            onClick={() => setSystemNotice(null)}
            aria-label={localLanguage !== 'vi' ? 'Got it, close notice' : 'Đã rõ, đóng thông báo'}
            tabIndex={0}
            className="px-2 py-1 rounded-[2px] bg-white/10 hover:bg-white/20 text-[#F7CAC9] text-xs font-mono font-bold shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7CAC9]"
          >
            {localLanguage !== 'vi' ? 'Got it' : 'Đã rõ'}
          </button>
        </div>
      )}

      <NotificationToast userUid={user?.uid} gameState={gameState} currentView={currentView} />
      {currentView !== 'projector' && currentView !== 'policy' && (
      <Navbar
        currentView={currentView}
        onViewChange={handleNavbarViewChange}
        gameState={gameState}
        user={user}
        adminUser={adminUser}
        isAdminAuthenticated={isAuthenticated}
        isOnboardingOpen={isOnboardingOpen}
        onOpenProfile={handleNavbarOpenProfile}
        onLogout={user ? handleAudienceLogout : undefined}
        onOpenFirebaseConfig={handleNavbarOpenFirebaseConfig}
        isFirebaseConnected={isFirebaseConnected}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onAdminLogout={handleLogout}
        onOpenQrCode={handleNavbarOpenQrCode}
        onOpenInstallModal={handleNavbarOpenInstallModal}
      />
      )}
      <main className={`flex-1 flex flex-col relative overflow-x-hidden overflow-y-auto ${currentView === 'policy' ? 'bg-[#0D0420] min-h-full h-full' : ''}`}>

        {currentView === 'client_landing' && (
          <React.Suspense fallback={null}>
            <ClientLandingPage gameState={gameState} />
          </React.Suspense>
        )}

      {batteryToast.show && (
        <div
          role="alert"
          aria-live="assertive"
          tabIndex={0}
          aria-label={localLanguage !== 'vi' ? `Battery warning: ${batteryToast.message}` : `Cảnh báo mức pin: ${batteryToast.message}`}
          className="fixed top-[calc(4.5rem+env(safe-area-inset-top,0px))] sm:top-20 right-4 z-50 bg-amber-950/95 text-amber-100 px-4 py-3 rounded-[3px] shadow-2xl border border-amber-500/60 flex items-center gap-3 animate-fadeIn backdrop-blur-md max-w-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
        >
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" aria-hidden="true" />
          <span className="text-xs sm:text-sm font-medium leading-snug flex-1">{batteryToast.message}</span>
          <button
            type="button"
            onClick={handleDismissBatteryToast}
            className="p-1 text-amber-300 hover:text-white rounded-[2px] hover:bg-amber-500/20 transition cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
            title={localLanguage !== 'vi' ? 'Dismiss' : 'Đóng thông báo'}
            aria-label={localLanguage !== 'vi' ? 'Dismiss battery alert' : 'Đóng cảnh báo pin'}
            tabIndex={0}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

        {currentView === 'policy' && (
          <React.Suspense fallback={null}>
            <PolicyPage
              onBack={handleBackFromPolicy}
              previousViewName={getPreviousViewDisplayName(previousView)}
              currentUser={user}
              onRequestDataDeletion={handleRequestDataDeletion}
            />
          </React.Suspense>
        )}

        <ViewErrorBoundary
          key={currentView}
          viewName={
            currentView === 'admin'
              ? 'Ban Kỹ Thuật (Admin)'
              : currentView === 'projector'
              ? 'Màn Chiếu (Projector)'
              : 'Beyond The Internet 2027'
          }
          language={localLanguage}
          onGoHome={handleGoHome}
        >
          <React.Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-8 min-h-[50vh]">
                <div className="fluent-box px-6 py-4 rounded-[3px] border border-[#F7CAC9]/30 bg-[#190839]/80 flex items-center gap-3 text-sm font-mono text-[#FCEEEC]">
                  <span className="w-4 h-4 rounded-full border-2 border-[#F7CAC9] border-t-transparent animate-spin shrink-0" />
                  <span>{localLanguage !== 'vi' ? 'Loading module...' : 'Đang tải giao diện...'}</span>
                </div>
              </div>
            }
          >
            {currentView === 'landing' && (
              <LandingPage
                gameState={gameState}
                onEnterAudience={handleEnterAudience}
                onEnterAdmin={handleEnterAdmin}
                onEnterProjector={handleEnterProjector}
                onEnterPolicy={handleOpenLandingPolicy}
              />
            )}

            {currentView === 'audience' && (
              (!user || isOnboardingOpen) ? (
                <OnboardingModal
                  isOpen={true}
                  isInline={true}
                  onComplete={handleUserComplete}
                  currentUser={user}
                  isLobbyLocked={Boolean(gameState.lobby_locked)}
                  isLookupLocked={Boolean(gameState.lookup_locked || gameState.anti_lookup_protection)}
                  onExit={handleExitOnboarding}
                  onClose={handleExitOnboarding}
                />
              ) : (
                <AudienceView
                  gameState={gameState}
                  user={user}
                  onUserSynced={handleUserSynced}
                  isHighContrast={isHighContrast}
                  onToggleHighContrast={handleToggleHighContrast}
                  onOpenRegister={handleOpenOnboarding}
                  onOpenProfile={handleNavbarOpenProfile}
                />
              )
            )}

            {currentView === 'admin' && (
              <PasswordGate
                isAuthenticated={isAuthenticated}
                onAuthenticated={handleAuthenticate}
                viewName="Ban Kỹ Thuật (Admin)"
                isLookupLocked={Boolean(gameState.lookup_locked || gameState.anti_lookup_protection)}
                onExit={handleGoHome}
              >
                <AdminPortal
                  adminUser={adminUser}
                  onLogout={handleLogout}
                  onOpenFirebaseConfig={handleNavbarOpenFirebaseConfig}
                  onViewChange={handleAdminViewChange}
                />
              </PasswordGate>
            )}

            {currentView === 'projector' && (
              <PasswordGate
                isAuthenticated={isAuthenticated}
                onAuthenticated={handleAuthenticate}
                viewName="Màn Chiếu (Projector)"
                onExit={handleGoHome}
              >
                <ProjectorView />
              </PasswordGate>
            )}
          </React.Suspense>
        </ViewErrorBoundary>
      </main>

      {user && isProfileModalOpen && (
        <React.Suspense fallback={null}>
          <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={handleCloseProfileModal}
            user={user}
            onUpdateUser={handleUpdateUser}
            gameState={gameState}
            initialTab={
              gameState.event_schedule?.enabled && gameState.event_schedule.status === 'SCHEDULED'
                ? 'edit'
                : undefined
            }
          />
        </React.Suspense>
      )}

      {isFirebaseConfigOpen && (
        <React.Suspense fallback={null}>
          <FirebaseConfigModal
            isOpen={isFirebaseConfigOpen}
            onClose={handleCloseFirebaseConfigModal}
            isConnected={isFirebaseConnected}
          />
        </React.Suspense>
      )}

      {isInstallModalOpen && (
        <React.Suspense fallback={null}>
          <InstallAppModal
            isOpen={isInstallModalOpen}
            onClose={handleCloseInstallModal}
          />
        </React.Suspense>
      )}

      {((gameState.show_qr && !isAudienceQrDismissed) || isLocalAudienceQrOpen) && currentView !== 'admin' && currentView !== 'projector' && typeof document !== 'undefined' && !!document.body && createPortal(
        <div 
          id="app-global-qr-modal-overlay"
          role="dialog"
          aria-modal="true"
          aria-labelledby="app-global-qr-modal-title"
          aria-describedby="app-global-qr-modal-desc"
          tabIndex={-1}
          className="fluent-dialog-overlay z-[999999] animate-fadeIn flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAudienceQrModal();
            }
          }}
        >
          <div 
            id="app-global-qr-modal-content"
            tabIndex={-1}
            className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#16062f] border border-[#F7CAC9]/30 rounded-[4px] p-4 sm:p-6 text-center text-[#e5e5e5] shadow-2xl shadow-purple-950/90 relative select-none my-auto custom-scrollbar focus:outline-none"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[2px] bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center" aria-hidden="true">
                  <QrIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 id="app-global-qr-modal-title" className="text-sm font-bold text-white uppercase tracking-wider">
                    {localLanguage !== 'vi' ? 'Join QR Code' : 'Mã QR Tham Gia'}
                  </h3>
                  <p id="app-global-qr-modal-desc" className="text-[11px] text-white/50">
                    {localLanguage !== 'vi' ? 'Scan code or share room link' : 'Quét mã hoặc chia sẻ link phòng thi'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-app-qr-modal"
                onClick={handleCloseAudienceQrModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-[2px] hover:bg-white/10 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7CAC9]"
                title={localLanguage !== 'vi' ? 'Close' : 'Đóng'}
                aria-label={localLanguage !== 'vi' ? 'Close audience QR code dialog' : 'Đóng hộp thoại mã QR tham gia'}
                tabIndex={0}
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div 
              className="my-2.5 inline-block shrink-0 animate-qr-entrance"
              tabIndex={0}
              role="region"
              aria-label={localLanguage !== 'vi' ? 'Audience QR Code for entering arena' : 'Mã QR quét để tham gia đấu trường Beyond The Internet 2027'}
            >
              <div className={`p-3 rounded-[2px] shadow-2xl border-2 border-sky-400/40 relative overflow-hidden flex items-center justify-center min-w-[208px] min-h-[208px] ${
                gameState.qr_transparent_bg
                  ? 'bg-[linear-gradient(45deg,#242424_25%,transparent_25%),linear-gradient(-45deg,#242424_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#242424_75%)] bg-[size:16px_16px] bg-[#141414] ring-1 ring-emerald-400/30'
                  : 'bg-white'
              }`}>
                {qrError ? (
                  <div 
                    role="alert" 
                    tabIndex={0}
                    className="w-48 h-48 sm:w-52 sm:h-52 bg-rose-50/90 border border-rose-200 rounded-[2px] p-4 flex flex-col items-center justify-center text-center gap-2.5 text-rose-900"
                  >
                    <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" aria-hidden="true" />
                    <p className="text-xs font-semibold leading-snug">{qrError}</p>
                    <button
                      type="button"
                      id="btn-retry-qr-generation"
                      onClick={handleRetryQr}
                      aria-label={localLanguage !== 'vi' ? 'Retry generating QR code' : 'Thử tạo lại mã QR tham gia'}
                      tabIndex={0}
                      className="mt-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-[2px] shadow flex items-center gap-1.5 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    >
                      <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{localLanguage !== 'vi' ? 'Retry' : 'Thử lại'}</span>
                    </button>
                  </div>
                ) : (
                  <CrossFadeQrCode
                    dataUrl={qrDataUrl}
                    alt={localLanguage !== 'vi' ? 'Audience QR Code' : 'QR Code Khán Giả'}
                    sizeClass="w-48 h-48 sm:w-52 sm:h-52"
                    loadingFallback={
                      <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-100 rounded-[2px] flex items-center justify-center text-xs text-slate-500 font-mono" role="status" aria-live="polite">
                        {localLanguage !== 'vi' ? 'Creating QR code...' : 'Đang tạo mã QR chút nhé...'}
                      </div>
                    }
                  />
                )}
              </div>
            </div>

            {gameState.qr_custom_caption && (
              <div 
                id="landing-qr-custom-caption"
                tabIndex={0}
                role="note"
                aria-label={localLanguage !== 'vi' ? `QR Caption: ${gameState.qr_custom_caption}` : `Ghi chú mã QR: ${gameState.qr_custom_caption}`}
                className="mb-2.5 px-3 py-1 rounded-[2px] bg-sky-950/80 border border-sky-400/50 text-sky-200 font-mono font-bold text-xs tracking-wide text-center animate-fadeIn shadow-md inline-flex items-center gap-1.5 max-w-xs break-words"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" aria-hidden="true" />
                <span className="truncate">{gameState.qr_custom_caption}</span>
              </div>
            )}

            <div 
              className="flex items-center justify-center flex-wrap gap-2 mb-2.5"
              role="region"
              aria-label={localLanguage !== 'vi' ? 'Stage connection and QR scan count' : 'Trạng thái kết nối sân khấu và số lượt quét mã QR'}
            >
              <div 
                id="badge-landing-qr-scans"
                tabIndex={0}
                role="status"
                aria-label={localLanguage !== 'vi' ? `Joined via QR: ${Number(gameState.qr_scan_count) || 0}` : `Lượt quét tham gia: ${Number(gameState.qr_scan_count) || 0}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-950/40"
                title={localLanguage !== 'vi' ? 'Friends who joined by scanning this QR code' : 'Số bạn khán giả đã quét mã QR để vào sân khấu'}
              >
                <ScanLine className="w-3 h-3 text-sky-400" aria-hidden="true" />
                <span>{localLanguage !== 'vi' ? 'Joined via QR:' : 'Lượt quét mã:'} <strong className="text-white font-bold">{Number(gameState.qr_scan_count) || 0}</strong></span>
              </div>

              {isFirebaseConnected ? (
                <div 
                  id="badge-firebase-online"
                  tabIndex={0}
                  role="status"
                  aria-label={localLanguage !== 'vi' ? 'Stage connection: Connected smoothly' : 'Đường truyền sân khấu: Đang kết nối mượt mà'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/40"
                  title={localLanguage !== 'vi' ? 'Connected smoothly to the live stage!' : 'Đang kết nối mượt mà với sân khấu!'}
                >
                  <span className="relative flex h-2 w-2" aria-hidden="true">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span>{localLanguage !== 'vi' ? 'Connected smoothly' : 'Kết nối mượt mà'}</span>
                </div>
              ) : (
                <div 
                  id="badge-firebase-offline"
                  tabIndex={0}
                  role="status"
                  aria-label={localLanguage !== 'vi' ? 'Stage connection: Reconnecting right now!' : 'Đường truyền sân khấu: Đang kết nối lại chút nhé!'}
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950/40"
                  title={localLanguage !== 'vi' ? 'Reconnecting to the stage right now!' : 'Đang kết nối lại chút nhé!'}
                >
                  <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse" aria-hidden="true"></span>
                  <span>{localLanguage !== 'vi' ? 'Reconnecting right now!' : 'Đang kết nối lại chút nhé!'}</span>
                </div>
              )}

              <div 
                id="badge-qr-palette"
                tabIndex={0}
                role="note"
                aria-label={localLanguage !== 'vi' ? `QR palette theme: ${activeQrPalette.name}` : `Bảng màu mã QR: ${activeQrPalette.labelVi}`}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-white/10 text-white/80 border border-white/15"
                title={localLanguage !== 'vi' ? 'QR color theme synced with the stage' : 'Màu mã QR đang đồng bộ cùng sân khấu'}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  aria-hidden="true"
                  style={{ backgroundColor: activeQrPalette.dotColor }} 
                />
                <span>
                  {localLanguage !== 'vi' ? activeQrPalette.name : activeQrPalette.labelVi}
                </span>
              </div>
            </div>

            <div 
              tabIndex={0}
              role="region"
              aria-label={localLanguage !== 'vi' ? `Direct join URL: ${audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : 'https://bti2027.app')}` : `Đường dẫn liên kết tham gia trực tiếp: ${audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : 'https://bti2027.app')}`}
              className="mb-3.5 fluent-box-nested border border-white/10 rounded-[2px] px-3 py-1.5 text-left flex items-center justify-between gap-2 outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
            >
              <span className="text-[11px] font-mono text-sky-300 truncate select-all">
                {audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : 'https://bti2027.app')}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <button
                type="button"
                id="btn-qr-copy-link"
                onClick={handleCopyQrLink}
                tabIndex={0}
                aria-label={isCopiedQrUrl ? (localLanguage !== 'vi' ? 'Join link copied to clipboard successfully' : 'Đã sao chép liên kết tham gia vào bộ nhớ tạm thành công') : (localLanguage !== 'vi' ? 'Copy join link to clipboard' : 'Sao chép liên kết tham gia vào bộ nhớ tạm')}
                className={`py-2.5 px-3 rounded-[2px] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7CAC9] ${
                  isCopiedQrUrl
                    ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                    : 'bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839]'
                }`}
                title={localLanguage !== 'vi' ? 'Copy join link to clipboard' : 'Sao chép link tham gia vào bộ nhớ tạm'}
              >
                {isCopiedQrUrl ? (
                  <>
                    <Check className="w-4 h-4 text-black shrink-0" aria-hidden="true" />
                    <span className="truncate">{localLanguage !== 'vi' ? 'Copied!' : 'Đã sao chép!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{localLanguage !== 'vi' ? 'Copy Link' : 'Sao chép liên kết'}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-qr-share-link"
                onClick={handleShareQrLink}
                tabIndex={0}
                aria-label={localLanguage !== 'vi' ? 'Share join link via system dialog' : 'Chia sẻ liên kết tham gia qua ứng dụng hệ thống'}
                className="py-2.5 px-3 rounded-[2px] bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/25 transition active:scale-98 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                title={localLanguage !== 'vi' ? 'Share link via system dialog' : 'Chia sẻ link qua ứng dụng hệ thống'}
              >
                <Share2 className="w-4 h-4 text-white shrink-0" aria-hidden="true" />
                <span className="truncate">{localLanguage !== 'vi' ? 'Share' : 'Chia sẻ'}</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-dismiss-app-qr-modal"
              onClick={handleCloseAudienceQrModal}
              tabIndex={0}
              aria-label={localLanguage !== 'vi' ? 'Close audience QR code dialog' : 'Đóng hộp thoại mã QR tham gia'}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-[2px] transition border border-white/10 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F7CAC9]"
            >
              {localLanguage !== 'vi' ? 'Close' : 'Đóng'}
            </button>
          </div>
        </div>,
        document.body
      )}

      <OfflineBanner
        isFirebaseConnected={isFirebaseConnected}
        isDismissed={isOfflineBannerDismissed}
        onDismiss={handleDismissOfflineBanner}
      />

      <FluentTooltip />

      <React.Suspense fallback={null}>
        <LiveSubtitleOverlay />
        <LoudEnvironmentAlert />

        {currentView === 'audience' && Boolean(user) && !isOnboardingOpen && (
          <>
            <AntiExitGuard
              enabled={true}
              user={user}
              gameState={gameState}
              showStatusPill={false}
              onConfirmExit={handleGoHome}
            />
            <SebAntiCheatGuard
              enabled={true}
              user={user}
              gameState={gameState}
            />
          </>
        )}

        {typeof window !== 'undefined' && window.location.search.includes('splitDebug=1') && (
          <FloatingDebugPanel gameState={gameState} />
        )}

        {currentView !== 'projector' && currentView !== 'policy' && (
          <ChatAssistantWidget
            gameState={gameState}
            user={user}
            currentView={currentView}
          />
        )}

        <CookieConsentBanner onOpenPolicy={handleOpenPolicyTab} />

        {currentView !== 'policy' && (
          <FirstVisitConsentModal onOpenFullPolicy={handleOpenLandingPolicy} />
        )}
      </React.Suspense>
    </div>
  );
}
