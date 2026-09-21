/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { GameState, UserInfo, UserResponse, QR_PALETTES, QrPaletteId } from './types';
import { syncService, DEFAULT_GAME_STATE } from './services/syncService';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';

import { auth, db } from './firebase';
import QRCode from 'qrcode';
import { soundFx } from './services/audioEffects';
import { vibrateTap, vibrateCopy } from './utils/hapticUtils';
import { Copy, Check, Share2, X, QrCode as QrIcon, RotateCcw, AlertTriangle, Palette, Sparkles, ScanLine, Zap } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { AudienceView } from './components/AudienceView';
import { AdminPortal } from './components/AdminPortal';
import { ProjectorView } from './components/ProjectorView';
import { OnboardingModal } from './components/OnboardingModal';
import { ProfileModal } from './components/ProfileModal';
import { generate12DigitUID } from './utils/uidUtils';
import { getSecureItem, setSecureItem, removeSecureItem } from './utils/secureStorage';
import { FirebaseConfigModal } from './components/FirebaseConfigModal';
import { PasswordGate } from './components/PasswordGate';
import { LandingPage } from './components/LandingPage';
import { ClientLandingPage } from './components/ClientLandingPage';
import { NotificationToast } from './components/NotificationToast';
import { OfflineBanner } from './components/OfflineBanner';
import { InstallAppModal } from './components/InstallAppModal';
import { FluentTooltip } from './components/FluentTooltip';
import { CrossFadeQrCode } from './components/CrossFadeQrCode';
import { LiveSubtitleOverlay } from './components/LiveSubtitleOverlay';
import { LoudEnvironmentAlert } from './components/LoudEnvironmentAlert';
import { applyBatterySaverClasses, getBatterySaverMode, useBatterySaver } from './utils/batterySaverUtils';
import { useLanguage } from './hooks/useLanguage';

export default function App() {
  const { localLanguage } = useLanguage();
  const { isBatterySaver, batteryLevel } = useBatterySaver();

  // Synchronize document lang attribute with active language
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = localLanguage || 'vi';
    }
  }, [localLanguage]);

  // State synchronized from syncService
  const [gameState, setGameState] = useState<GameState>(DEFAULT_GAME_STATE);

  // QR Code display state (Lifting to App.tsx so both Navbar and AdminPortal can access)
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [audienceJoinUrl, setAudienceJoinUrl] = useState('');
  const [qrError, setQrError] = useState<string | null>(null);
  const [isQrFading, setIsQrFading] = useState(false);
  const [isCopiedQrUrl, setIsCopiedQrUrl] = useState(false);
  const [batteryToast, setBatteryToast] = useState<{message: string, show: boolean}>({ message: '', show: false });
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isAudienceQrDismissed, setIsAudienceQrDismissed] = useState(false);
  const [isLocalAudienceQrOpen, setIsLocalAudienceQrOpen] = useState(false);

  // When admin broadcasts a new live QR, un-dismiss local audience modal
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

  const generateQrCode = useCallback((urlToEncode: string, paletteId?: string, transparentBg?: boolean) => {
    if (!urlToEncode) return;
    setIsQrFading(true);
    setQrError(null);
    const activePaletteId = (paletteId || gameState.qr_color_palette || 'purple_gold') as QrPaletteId;
    const palette = QR_PALETTES[activePaletteId] || QR_PALETTES.purple_gold;
    const isTransparent = transparentBg !== undefined ? transparentBg : Boolean(gameState.qr_transparent_bg);

    const qrTargetUrl = urlToEncode + (urlToEncode.includes('?') ? '&' : '?') + 'src=qr';
    QRCode.toDataURL(qrTargetUrl, {
      width: 320,
      margin: 2,
      color: { 
        dark: palette.dark, 
        light: isTransparent ? '#00000000' : palette.light 
      },
      errorCorrectionLevel: 'H'
    })
      .then(url => {
        setQrDataUrl(url);
        setQrError(null);
        setTimeout(() => {
          setIsQrFading(false);
        }, 50);
      })
      .catch(err => {
        console.error('QR code generation error:', err);
        setQrError(localLanguage !== 'vi' ? 'Failed to generate QR code. Please try again.' : 'Lỗi tạo mã QR. Vui lòng thử lại.');
        setIsQrFading(false);
      });
  }, [gameState.qr_color_palette, gameState.qr_transparent_bg, gameState.qr_custom_caption, gameState.round_name, localLanguage]);

  // Track Estimated Scans when audience enters via QR scan (?src=qr or ?ref=qr)
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

  // Compute audience join URL dynamically
  useEffect(() => {
    if (typeof window !== 'undefined') {
      let origin = window.location.origin;
      let pathname = window.location.pathname;
      let fullUrl = origin + pathname;
      if (fullUrl.includes('ais-dev-')) {
        fullUrl = fullUrl.replace('ais-dev-', 'ais-pre-');
      }
      setAudienceJoinUrl(fullUrl);
    }
  }, []);

  // Automatically refresh the QR code whenever audienceJoinUrl, qr_color_palette, or qr_transparent_bg changes dynamically
  useEffect(() => {
    if (audienceJoinUrl) {
      generateQrCode(audienceJoinUrl, gameState.qr_color_palette, gameState.qr_transparent_bg);
    }
  }, [audienceJoinUrl, gameState.qr_color_palette, gameState.qr_transparent_bg, generateQrCode]);

  const handleRetryQr = useCallback(() => {
    const targetUrl = audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : 'https://bti2026.app');
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
          title: localLanguage !== 'vi' ? 'BTI 2026 - Live Interactive Arena' : 'BTI 2026 - Đấu Trường Trực Tiếp',
          text: localLanguage !== 'vi' ? 'Join the real-time interactive BTI 2026 arena now!' : 'Tham gia trực tiếp đấu trường tương tác BTI 2026 ngay bây giờ!',
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
  }, [audienceJoinUrl, handleCopyQrLink]);

  // Determine initial view from URL path or query parameter
  const [currentView, setCurrentView] = useState<'landing' | 'client_landing' | 'audience' | 'admin' | 'projector'>(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname.toLowerCase();
      const params = new URLSearchParams(window.location.search);
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

  // State synchronized from syncService
  const [currentResponses, setCurrentResponses] = useState<Record<string, UserResponse>>({});
  const [lastRouteTs, setLastRouteTs] = useState<number>(0);
  const [allResponses, setAllResponses] = useState<Record<string, Record<string, UserResponse>>>({});
  const [activeCount, setActiveCount] = useState<number>(1);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('BTI2026_ADMIN_AUTH') === 'true';
    }
    return false;
  });

  const handleAuthenticate = () => {
    setIsAuthenticated(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('BTI2026_ADMIN_AUTH', 'true');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('BTI2026_ADMIN_AUTH');
      sessionStorage.removeItem('BTI2026_ADMIN_TOKEN');
    }
    setCurrentView('landing');
  };

  // User Profile
  const handleAudienceLogout = () => {
    try {
      if (auth) {
        signOut(auth);
      }
    } catch (e) {
      console.error('SignOut error:', e);
    }
    setUser(null);
    removeSecureItem('BTI2026_USER_PROFILE');
    setCurrentView('landing');
  };

  // Global pure black dark mode (audience-high-contrast) persistent across sessions
  const [isHighContrast, setIsHighContrast] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('bti_audience_high_contrast') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const handleToggleHighContrast = () => {
    setIsHighContrast((prev) => {
      const nextVal = !prev;
      try {
        localStorage.setItem('bti_audience_high_contrast', String(nextVal));
      } catch {}
      return nextVal;
    });
  };

  // Keep document.body & html class in sync with isHighContrast & BatterySaverMode
  useEffect(() => {
    applyBatterySaverClasses(getBatterySaverMode());
    if (typeof document !== 'undefined') {
      if (isHighContrast) {
        document.documentElement.classList.add('audience-high-contrast');
        document.body.classList.add('audience-high-contrast');
      } else if (!getBatterySaverMode()) {
        document.documentElement.classList.remove('audience-high-contrast');
        document.body.classList.remove('audience-high-contrast');
      }
    }
  }, [isHighContrast]);

  // Synchronize across tabs or components via storage events
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const val = localStorage.getItem('bti_audience_high_contrast') === 'true';
        setIsHighContrast(val);
      } catch {
        // ignore
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const [user, setUser] = useState<UserInfo | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
        if (saved) return saved;
      } catch {}
    }
    return null;
  });

  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);
  const [isFirebaseConfigOpen, setIsFirebaseConfigOpen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [isOfflineBannerDismissed, setIsOfflineBannerDismissed] = useState<boolean>(false);

  useEffect(() => {
    if (!auth) return;
    let unsubsDoc: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;
    try {
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (unsubsDoc) {
          unsubsDoc();
          unsubsDoc = null;
        }
        if (firebaseUser) {
          const saved = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
          let shouldListen = false;
          
          if (saved) {
            const localProfile: UserInfo = saved;
            if (localProfile.uid === firebaseUser.uid) {
              if (!localProfile.anonymizedUid || localProfile.anonymizedUid.length !== 12) {
                localProfile.anonymizedUid = generate12DigitUID(
                  localProfile.name || '',
                  localProfile.mssv || '',
                  localProfile.gender || '1',
                  localProfile.birthYear || '2004'
                );
                setSecureItem('BTI2026_USER_PROFILE', localProfile);
                try {
                  await setDoc(doc(db, 'users', localProfile.uid), localProfile, { merge: true });
                } catch (e) {
                  console.error("Failed to update user 12-digit UID in firestore", e);
                }
              }
              setUser(localProfile);
              shouldListen = true;
            }
          }
          
          if (shouldListen) {
            // Listen for remote changes
            unsubsDoc = onSnapshot(doc(db, 'users', firebaseUser.uid), (docSnap) => {
              if (docSnap.exists()) {
                const profile = docSnap.data() as UserInfo;
                setUser(prev => {
                  if (prev && JSON.stringify(prev) !== JSON.stringify(profile)) {
                    setSecureItem('BTI2026_USER_PROFILE', profile);
                    return profile;
                  }
                  return prev || profile;
                });
              }
            }, (err) => {
              console.warn('Firestore user profile listener error:', err);
            });
          }
        } else {
          // Logged out
        }
      });
    } catch (err) {
      console.warn('[App] onAuthStateChanged initialization error:', err);
    }
    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubsDoc) unsubsDoc();
    };
  }, []);

  // One-time cleanup of old persistent localStorage admin auth
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('BTI2026_ADMIN_AUTH');
    }
  }, []);

  // Prompt onboarding if user is visiting Audience view and not registered yet
  useEffect(() => {
    if (!user && currentView === 'audience') {
      setIsOnboardingOpen(true);
    }
  }, [user, currentView]);

  // Handle forced routing from admin
  useEffect(() => {
    if (gameState.force_route_ts && gameState.force_route_ts > lastRouteTs) {
      setLastRouteTs(gameState.force_route_ts);
      if (currentView !== 'admin' && currentView !== 'projector' && gameState.force_route) {
        if (currentView === 'landing' && gameState.force_route === 'audience') {
          // Do not force users from the welcome page into the audience view
          return;
        }
        setCurrentView(gameState.force_route as 'landing' | 'client_landing' | 'audience' | 'projector');
      }
    }
  }, [gameState.force_route_ts, gameState.force_route, lastRouteTs, currentView]);

  // Play sound on connection drops
  const [prevConnected, setPrevConnected] = useState<boolean | null>(null);
  useEffect(() => {
    if (prevConnected !== null) {
      if (isFirebaseConnected && !prevConnected) {
        // Recovered connection! Play success pacing chime
        soundFx.playPacingChime('complete');
      } else if (!isFirebaseConnected && prevConnected) {
        // Disconnected! Play error tone
        soundFx.playError();
      }
    }
    setPrevConnected(isFirebaseConnected);
  }, [isFirebaseConnected, prevConnected]);

  // Subscribe to Realtime Data
  useEffect(() => {
    const unsubState = syncService.subscribeToState((state) => {
      setGameState(state);
    });

    const unsubResponses = syncService.subscribeToResponses((resps) => {
      setCurrentResponses(resps);
    });

    const unsubAllResponses = syncService.subscribeToAllResponses((all) => {
      setAllResponses(all);
    });

    const unsubPresence = syncService.subscribeToPresence((count) => {
      setActiveCount(count);
    });

    // Subscribing to dynamic connection status
    const unsubConnection = syncService.subscribeToConnection((connected) => {
      setIsFirebaseConnected(connected);
    });

    return () => {
      unsubState();
      unsubResponses();
      unsubAllResponses();
      unsubPresence();
      unsubConnection();
    };
  }, []);

  // Presence heartbeat when user is registered
  useEffect(() => {
    if (!user) return;

    // Send initial presence ping
    syncService.sendPresencePing(user);

    const interval = setInterval(() => {
      syncService.sendPresencePing(user);
    }, 15000);

    return () => clearInterval(interval);
  }, [user]);

  // Sound toggle handler
  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFx.setEnabled(next);
    if (next) soundFx.playClick();
  };

  // Completely disable sound FX on Admin screen
  useEffect(() => {
    soundFx.setAdminMuted(currentView === 'admin');
  }, [currentView]);

  // Global Escape key listener to close modals
  useEffect(() => {
    const handleGlobalEsc = (e: KeyboardEvent) => {
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
      }
    };

    window.addEventListener('keydown', handleGlobalEsc);
    return () => window.removeEventListener('keydown', handleGlobalEsc);
  }, [isProfileModalOpen, isFirebaseConfigOpen, isInstallModalOpen, isLocalAudienceQrOpen, gameState.show_qr, isAudienceQrDismissed, isOnboardingOpen, user]);

  const handleUserComplete = async (userInfo: UserInfo) => {
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
    setIsOnboardingOpen(false);
    syncService.sendPresencePing(userInfo);
    
    try {
      await setDoc(doc(db, 'users', userInfo.uid), userInfo, { merge: true });
    } catch (e) {
      console.error("Failed to save user to firestore", e);
    }
  };

  return (
    <div className="min-h-[100dvh] h-[100dvh] overflow-hidden bg-transparent text-[#F5EFF9] font-sans flex flex-col antialiased selection:bg-[#F7CAC9] selection:text-[#190839] relative z-0">
      {/* --- GLOBAL APP BACKGROUND (Sync with Landing Page) --- */}
      <div className="fixed inset-0 z-[-3] bg-[#190839]/50 backdrop-blur-md">
        <div className="absolute top-1/4 -left-1/4 w-[50vw] h-[50vw] bg-[#F7CAC9]/10 backdrop-blur-md rounded-full blur-[120px] pointer-events-none animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-[50vw] h-[50vw] bg-[#3E1D74]/30 backdrop-blur-md rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="fixed inset-0 z-[-1] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />

      {/* Audience Notification Toast (Hidden on Admin & Projector views) */}
      <NotificationToast userUid={user?.uid} gameState={gameState} currentView={currentView} />
      {/* Top Navigation */}
      {currentView !== 'landing' && currentView !== 'projector' && (
      <Navbar
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          // Sync URL query without full reload
          if (typeof window !== 'undefined' && window.history) {
            const url = new URL(window.location.href);
            if (view === 'audience') {
              url.searchParams.delete('view');
            } else {
              url.searchParams.set('view', view);
            }
            window.history.replaceState({}, '', url.toString());
          }
        }}
        gameState={gameState}
        activeCount={activeCount}
        user={user}
        onOpenProfile={() => {
          if (user) {
            setIsProfileModalOpen(true);
          } else {
            setIsOnboardingOpen(true);
          }
        }}
        onLogout={user ? handleAudienceLogout : undefined}
        onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
        isFirebaseConnected={isFirebaseConnected}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        onAdminLogout={handleLogout}
        onOpenQrCode={() => {
          if (currentView === 'admin') {
            syncService.updateGameState({ show_qr: true });
          } else {
            setIsAudienceQrDismissed(false);
            setIsLocalAudienceQrOpen(true);
          }
        }}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />
      )}
      {/* Main View Area */}
      <main className="flex-1 flex flex-col relative overflow-x-hidden overflow-y-auto">

        {currentView === 'client_landing' && (
          <ClientLandingPage gameState={gameState} />
        )}

        
      {batteryToast.show && (
        <div className="fixed top-20 right-4 z-[9999] bg-green-900/90 text-green-100 px-4 py-3 rounded-[2px] shadow-lg border border-green-500/50 flex items-center gap-2 animate-fadeIn">
          <Zap className="w-5 h-5 text-green-400 animate-pulse" />
          <span className="text-sm font-medium">{batteryToast.message}</span>
        </div>
      )}

      {currentView === 'landing' && (
          <LandingPage
            gameState={gameState}
            onEnterAudience={() => {
              if (gameState.force_route === 'client_landing') {
                setCurrentView('client_landing');
                return;
              }
              setCurrentView('audience');
            }}
            onEnterAdmin={() => setCurrentView('admin')}
            onEnterProjector={() => setCurrentView('projector')}
          />
        )}

        {currentView === 'audience' && (
          <AudienceView
            gameState={gameState}
            user={user}
            responses={allResponses[gameState.question_id] || currentResponses || {}}
            allResponses={allResponses}
            isHighContrast={isHighContrast}
            onToggleHighContrast={handleToggleHighContrast}
            onOpenRegister={() => setIsOnboardingOpen(true)}
            onOpenProfile={() => {
              if (user) {
                setIsProfileModalOpen(true);
              } else {
                setIsOnboardingOpen(true);
              }
            }}
          />
        )}

        {currentView === 'admin' && (
          <PasswordGate isAuthenticated={isAuthenticated} onAuthenticated={handleAuthenticate} viewName="Ban Tổ Chức (Admin)">
            <AdminPortal
              onLogout={handleLogout}
              gameState={gameState}
              activeCount={activeCount}
              currentResponses={allResponses[gameState.question_id] || currentResponses || {}}
              allResponses={allResponses}
              isFirebaseConnected={isFirebaseConnected}
              onOpenFirebaseConfig={() => setIsFirebaseConfigOpen(true)}
              onViewChange={(view) => setCurrentView(view)}
            />
          </PasswordGate>
        )}

        {currentView === 'projector' && (
          <PasswordGate isAuthenticated={isAuthenticated} onAuthenticated={handleAuthenticate} viewName="Màn Chiếu (Projector)">
            <ProjectorView
              gameState={gameState}
              responses={allResponses[gameState.question_id] || currentResponses || {}}
              allResponses={allResponses}
              activeCount={activeCount}
            />
          </PasswordGate>
        )}
      </main>

      {user && (
        <ProfileModal
          isOpen={isProfileModalOpen}
          onClose={() => setIsProfileModalOpen(false)}
          user={user}
          onUpdateUser={(updatedUser) => {
            setUser(updatedUser);
            setSecureItem('BTI2026_USER_PROFILE', updatedUser);
          }}
          allResponses={allResponses}
          gameState={gameState}
        />
      )}

      {/* Modals */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onComplete={handleUserComplete}
        currentUser={user}
      />

      <FirebaseConfigModal
        isOpen={isFirebaseConfigOpen}
        onClose={() => {
          setIsFirebaseConfigOpen(false);
          setIsFirebaseConnected(syncService.getIsFirebaseConnected());
        }}
        isConnected={isFirebaseConnected}
      />

      {/* PWA Home Screen Install Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
      />

      {/* MODAL: Audience QR Code Display (Only on audience/landing views; admin and projector have dedicated controllers) */}
      {((gameState.show_qr && !isAudienceQrDismissed) || isLocalAudienceQrOpen) && currentView !== 'admin' && currentView !== 'projector' && typeof document !== 'undefined' && createPortal(
        <div 
          id="app-global-qr-modal-overlay"
          className="fluent-dialog-overlay z-[999999] animate-fadeIn flex items-center justify-center p-4 overflow-y-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseAudienceQrModal();
            }
          }}
        >
          <div 
            id="app-global-qr-modal-content"
            className="w-full max-w-md max-h-[92vh] overflow-y-auto bg-[#16062f] border border-[#F7CAC9]/30 rounded-[4px] p-4 sm:p-6 text-center text-[#e5e5e5] shadow-2xl shadow-purple-950/90 relative select-none my-auto custom-scrollbar"
          >
            {/* Top Accent Line */}
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F7CAC9] to-transparent pointer-events-none" />

            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-[2px] bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center">
                  <QrIcon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    {localLanguage !== 'vi' ? 'Join QR Code' : 'Mã QR Tham Gia'}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {localLanguage !== 'vi' ? 'Scan code or share room link' : 'Quét mã hoặc chia sẻ link phòng thi'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                id="btn-close-app-qr-modal"
                onClick={handleCloseAudienceQrModal}
                className="p-1.5 text-slate-400 hover:text-white rounded-[2px] hover:bg-white/10 transition cursor-pointer"
                title={localLanguage !== 'vi' ? 'Close' : 'Đóng'}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* QR Code Container with Spring Entrance Animation and Smooth Optical Cross-Fade */}
            <div className="my-2.5 inline-block shrink-0 animate-qr-entrance">
              <div className={`p-3 rounded-[2px] shadow-2xl border-2 border-sky-400/40 relative overflow-hidden flex items-center justify-center min-w-[208px] min-h-[208px] ${
                gameState.qr_transparent_bg
                  ? 'bg-[linear-gradient(45deg,#242424_25%,transparent_25%),linear-gradient(-45deg,#242424_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#242424_75%)] bg-[size:16px_16px] bg-[#141414] ring-1 ring-emerald-400/30'
                  : 'bg-white'
              }`}>
                {qrError ? (
                  <div className="w-48 h-48 sm:w-52 sm:h-52 bg-rose-50/90 border border-rose-200 rounded-[2px] p-4 flex flex-col items-center justify-center text-center gap-2.5 text-rose-900">
                    <AlertTriangle className="w-8 h-8 text-rose-500 shrink-0" />
                    <p className="text-xs font-semibold leading-snug">{qrError}</p>
                    <button
                      type="button"
                      id="btn-retry-qr-generation"
                      onClick={handleRetryQr}
                      className="mt-1 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-bold text-xs rounded-[2px] shadow flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>{localLanguage !== 'vi' ? 'Retry' : 'Thử lại (Retry)'}</span>
                    </button>
                  </div>
                ) : (
                  <CrossFadeQrCode
                    dataUrl={qrDataUrl}
                    alt={localLanguage !== 'vi' ? 'Audience QR Code' : 'QR Code Khán Giả'}
                    sizeClass="w-48 h-48 sm:w-52 sm:h-52"
                    loadingFallback={
                      <div className="w-48 h-48 sm:w-52 sm:h-52 bg-slate-100 rounded-[2px] flex items-center justify-center text-xs text-slate-500 font-mono">
                        {localLanguage !== 'vi' ? 'Generating QR...' : 'Đang tạo QR...'}
                      </div>
                    }
                  />
                )}
              </div>
            </div>

            {/* Custom Short Caption below QR Code */}
            {gameState.qr_custom_caption && (
              <div 
                id="landing-qr-custom-caption"
                className="mb-2.5 px-3 py-1 rounded-[2px] bg-sky-950/80 border border-sky-400/50 text-sky-200 font-mono font-bold text-xs tracking-wide text-center animate-fadeIn shadow-md inline-flex items-center gap-1.5 max-w-xs break-words"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
                <span className="truncate">{gameState.qr_custom_caption}</span>
              </div>
            )}

            {/* Realtime Firebase Connection, Estimated Scans, & Active QR Palette Status Badges */}
            <div className="flex items-center justify-center flex-wrap gap-2 mb-2.5">
              <div 
                id="badge-landing-qr-scans"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-950/40"
                title={localLanguage !== 'vi' ? 'Total audience scans joining arena' : 'Tổng số lượt khán giả quét mã QR tham gia đấu trường'}
              >
                <ScanLine className="w-3 h-3 text-sky-400" />
                <span>{localLanguage !== 'vi' ? 'Estimated scans:' : 'Ước tính quét:'} <strong className="text-white font-bold">{Number(gameState.qr_scan_count) || 0}</strong></span>
              </div>

              {isFirebaseConnected ? (
                <div 
                  id="badge-firebase-online"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/40"
                  title={localLanguage !== 'vi' ? 'Realtime database is operating stably' : 'Hệ thống cơ sở dữ liệu thời gian thực đang hoạt động ổn định'}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                  </span>
                  <span>Firebase: {localLanguage !== 'vi' ? 'Online' : 'Trực Tuyến'}</span>
                </div>
              ) : (
                <div 
                  id="badge-firebase-offline"
                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950/40"
                  title={localLanguage !== 'vi' ? 'Reconnecting to Firebase server...' : 'Đang kết nối lại với máy chủ Firebase...'}
                >
                  <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse"></span>
                  <span>Firebase: {localLanguage !== 'vi' ? 'Offline' : 'Ngoại Tuyến'}</span>
                </div>
              )}

              <div 
                id="badge-qr-palette"
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[2px] text-[10px] font-mono font-semibold bg-white/10 text-white/80 border border-white/15"
                title={localLanguage !== 'vi' ? 'QR Code color palette is synced in real-time from Admin' : 'Bảng màu QR Code đang được đồng bộ thời gian thực từ Admin'}
              >
                <span 
                  className="w-2 h-2 rounded-full shrink-0" 
                  style={{ backgroundColor: (QR_PALETTES[(gameState.qr_color_palette as QrPaletteId) || 'purple_gold'] || QR_PALETTES.purple_gold).dotColor }} 
                />
                <span>
                  {localLanguage !== 'vi'
                    ? (QR_PALETTES[(gameState.qr_color_palette as QrPaletteId) || 'purple_gold'] || QR_PALETTES.purple_gold).name
                    : (QR_PALETTES[(gameState.qr_color_palette as QrPaletteId) || 'purple_gold'] || QR_PALETTES.purple_gold).labelVi}
                </span>
              </div>
            </div>

            {/* Direct URL text display */}
            <div className="mb-3.5 fluent-box-nested border border-white/10 rounded-[2px] px-3 py-1.5 text-left flex items-center justify-between gap-2">
              <span className="text-[11px] font-mono text-sky-300 truncate select-all">
                {audienceJoinUrl || (typeof window !== 'undefined' ? window.location.href : 'https://bti2026.app')}
              </span>
            </div>

            {/* Unified Action Buttons Grid beneath the QR code */}
            <div className="grid grid-cols-2 gap-2.5 mb-2.5">
              <button
                type="button"
                id="btn-qr-copy-link"
                onClick={handleCopyQrLink}
                className={`py-2.5 px-3 rounded-[2px] font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md ${
                  isCopiedQrUrl
                    ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                    : 'bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839]'
                }`}
                title={localLanguage !== 'vi' ? 'Copy join link to clipboard' : 'Sao chép link tham gia vào bộ nhớ tạm'}
              >
                {isCopiedQrUrl ? (
                  <>
                    <Check className="w-4 h-4 text-black shrink-0" />
                    <span className="truncate">{localLanguage !== 'vi' ? 'Copied!' : 'Đã sao chép!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 shrink-0" />
                    <span className="truncate">Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                id="btn-qr-share-link"
                onClick={handleShareQrLink}
                className="py-2.5 px-3 rounded-[2px] bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-sky-500/25 transition active:scale-98 cursor-pointer"
                title={localLanguage !== 'vi' ? 'Share link via system dialog' : 'Chia sẻ link qua ứng dụng hệ thống'}
              >
                <Share2 className="w-4 h-4 text-white shrink-0" />
                <span className="truncate">Share</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-dismiss-app-qr-modal"
              onClick={handleCloseAudienceQrModal}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white font-medium text-xs rounded-[2px] transition border border-white/10 cursor-pointer"
            >
              {localLanguage !== 'vi' ? 'Close' : 'Đóng'}
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* Offline Alert Banner with 5s Auto-Reconnect Countdown */}
      <OfflineBanner
        isFirebaseConnected={isFirebaseConnected}
        isDismissed={isOfflineBannerDismissed}
        onDismiss={() => {
          setIsOfflineBannerDismissed(true);
          setTimeout(() => {
            setIsOfflineBannerDismissed(false);
          }, 60000);
        }}
      />

      {/* Global Fluent UI 2 Tooltip Overlay */}
      <FluentTooltip />

      {/* Live Speech Subtitles Overlay */}
      <LiveSubtitleOverlay />

      {/* Smart Loud Environment Detection Banner */}
      <LoudEnvironmentAlert />
    </div>
  );
}
