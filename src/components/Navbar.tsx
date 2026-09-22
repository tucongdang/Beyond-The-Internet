import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GameState, UserInfo, PingInfo, AdminUser, TECHNICAL_ROLES } from '../types';
import { Users, Shield, Tv, Volume2, VolumeX, Database, Menu, X, LogOut, QrCode, Eye, Maximize, Minimize, Activity, RefreshCw, Download, Globe, Sliders, User, Sparkles } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSelection } from '../utils/hapticUtils';
import { syncService } from '../services/syncService';
import { BatteryIndicator } from './BatteryIndicator';
import { useLanguage } from '../hooks/useLanguage';
import { AudioSettingsModal } from './AudioSettingsModal';

interface NavbarProps {
  currentView: 'landing' | 'client_landing' | 'audience' | 'admin' | 'projector';
  onViewChange: (view: 'landing' | 'client_landing' | 'audience' | 'admin' | 'projector') => void;
  gameState: GameState;
  activeCount: number;
  user: UserInfo | null;
  adminUser?: AdminUser | null;
  isAdminAuthenticated?: boolean;
  isOnboardingOpen?: boolean;
  onOpenProfile: () => void;
  onLogout?: () => void;
  onOpenFirebaseConfig: () => void;
  isFirebaseConnected: boolean;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onAdminLogout?: () => void;
  onOpenQrCode?: () => void;
  onOpenInstallModal?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onViewChange,
  gameState,
  activeCount,
  user,
  adminUser,
  isAdminAuthenticated = false,
  isOnboardingOpen = false,
  onOpenProfile,
  onLogout,
  onOpenFirebaseConfig,
  isFirebaseConnected,
  soundEnabled,
  onToggleSound,
  onAdminLogout,
  onOpenQrCode,
  onOpenInstallModal,
}) => {
  const { localLanguage, toggleLanguage } = useLanguage();
  const effectiveLanguage = currentView === 'admin' ? 'vi' : localLanguage;
  const isLanding = currentView === 'landing' || currentView === 'client_landing';

  // Determine if the user is currently on an authentication / login screen
  const isLoginScreen =
    isLanding ||
    (currentView === 'admin' && !isAdminAuthenticated) ||
    (currentView === 'projector' && !isAdminAuthenticated) ||
    (currentView === 'audience' && (!user || isOnboardingOpen));

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState(false);

  // Fullscreen State & Change Listeners
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
    }
    return false;
  });

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFull = !!(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFull);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const handleToggleFullscreen = async () => {
    vibrateSelection();
    soundFx.playClick();
    try {
      if (!isFullscreen) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
          await elem.requestFullscreen();
        } else if ((elem as any).webkitRequestFullscreen) {
          await (elem as any).webkitRequestFullscreen();
        } else if ((elem as any).mozRequestFullScreen) {
          await (elem as any).mozRequestFullScreen();
        } else if ((elem as any).msRequestFullscreen) {
          await (elem as any).msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        } else if ((document as any).mozCancelFullScreen) {
          await (document as any).mozCancelFullScreen();
        } else if ((document as any).msExitFullscreen) {
          await (document as any).msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen request could not be completed:', err);
    }
  };

  const [pingInfo, setPingInfo] = useState<PingInfo>(() => syncService.getPingInfo());
  const [isMeasuringPing, setIsMeasuringPing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncService.subscribeToPing((info) => {
      setPingInfo(info);
      setIsMeasuringPing(false);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  const handleManualPing = async () => {
    vibrateTap();
    soundFx.playClick();
    setIsMeasuringPing(true);
    await syncService.measurePing();
    setIsMeasuringPing(false);
  };

  const getPingBadgeStyle = () => {
    if (pingInfo.quality === 'offline' || pingInfo.latencyMs === null) {
      return {
        dot: 'bg-zinc-500',
        text: 'text-zinc-400',
        label: 'Offline',
        qualityText: effectiveLanguage === 'en' ? 'Offline' : 'Mất kết nối',
        description: effectiveLanguage === 'en' ? 'Firebase Disconnected' : 'Mất kết nối Firebase'
      };
    }
    if (pingInfo.quality === 'excellent') {
      return {
        dot: 'bg-emerald-400 shadow-[0_0_6px_#34d399]',
        text: 'text-emerald-300',
        label: `${pingInfo.latencyMs}ms`,
        qualityText: effectiveLanguage === 'en' ? 'Excellent' : 'Cực tốt',
        description: effectiveLanguage === 'en' ? 'Ultra-low latency (< 100ms)' : 'Độ trễ cực tốt (< 100ms)'
      };
    }
    if (pingInfo.quality === 'good') {
      return {
        dot: 'bg-sky-400 shadow-[0_0_6px_#38bdf8]',
        text: 'text-sky-300',
        label: `${pingInfo.latencyMs}ms`,
        qualityText: effectiveLanguage === 'en' ? 'Good' : 'Tốt',
        description: effectiveLanguage === 'en' ? 'Stable latency (< 250ms)' : 'Độ trễ ổn định (< 250ms)'
      };
    }
    if (pingInfo.quality === 'fair') {
      return {
        dot: 'bg-amber-400',
        text: 'text-amber-300',
        label: `${pingInfo.latencyMs}ms`,
        qualityText: effectiveLanguage === 'en' ? 'Fair' : 'Trung bình',
        description: effectiveLanguage === 'en' ? 'Moderate latency (< 500ms)' : 'Độ trễ trung bình (< 500ms)'
      };
    }
    return {
      dot: 'bg-rose-400 animate-ping',
      text: 'text-rose-300',
      label: `${pingInfo.latencyMs}ms`,
      qualityText: effectiveLanguage === 'en' ? 'Poor' : 'Chậm',
      description: effectiveLanguage === 'en' ? 'High latency (> 500ms)' : 'Độ trễ cao (> 500ms)'
    };
  };

  const getStatusBadge = () => {
    switch (gameState.status) {
      case 'ACTIVE':
        return (
          <div className="px-2 py-0.5 bg-emerald-950/40 border border-emerald-500/30 rounded-[2px] flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_6px_#34d399]" />
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'Active' : 'Đang Đấu'}
            </span>
          </div>
        );
      case 'LOCKED':
        return (
          <div className="px-2 py-0.5 bg-amber-950/40 border border-amber-500/30 rounded-[2px] flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full" />
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'Locked' : 'Đã Khóa'}
            </span>
          </div>
        );
      case 'REVEAL':
        return (
          <div className="px-2 py-0.5 bg-purple-950/40 border border-purple-500/30 rounded-[2px] flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse shadow-[0_0_6px_#c084fc]" />
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'Result' : 'Kết Quả'}
            </span>
          </div>
        );
      case 'STANDBY':
      default:
        return (
          <div className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-[2px] flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 bg-white/40 rounded-full" />
            <span className="text-[9px] sm:text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'Standby' : 'Chờ Khởi Động'}
            </span>
          </div>
        );
    }
  };

  const pingBadge = getPingBadgeStyle();

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-50 w-full fluent-navbar text-[#e5e5e5] select-none transition-all"
    >
      <div 
        className="max-w-[1400px] mx-auto px-2.5 sm:px-4 h-13 sm:h-14 flex items-center justify-between gap-2 sm:gap-3"
      >
        {/* Left: Branding & Status Badge */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink-0">
          <div
            onClick={() => {
              vibrateTap();
              onViewChange('landing');
            }}
            className="flex items-center gap-2 cursor-pointer group shrink-0"
            title="Trang chủ BTI 2026"
          >
            <div className="w-8 h-8 sm:w-8.5 sm:h-8.5 shrink-0 fluent-acrylic-surface rounded-[2px] flex items-center justify-center font-black text-sm sm:text-base text-white shadow-md shadow-blue-950/40 border border-blue-400/40 group-hover:scale-105 group-hover:border-blue-300/60 transition duration-200">
              BTI
            </div>
            <div className="hidden sm:block">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight leading-tight text-white flex items-center gap-1 whitespace-nowrap">
                BEYOND THE INTERNET <span className="text-sky-300">2026</span>
              </h1>
              <p className="text-[8px] sm:text-[9px] text-white/40 uppercase tracking-wider font-mono leading-none mt-0.5 whitespace-nowrap">
                {currentView === 'admin' ? 'Ban Kỹ Thuật • Điều Hành' : 'Đấu Trường Trực Tiếp'}
              </p>
            </div>
          </div>

          {/* Status Badge - Hidden during Login */}
          {!isLoginScreen && (
            <div className="hidden md:flex items-center">
              {getStatusBadge()}
            </div>
          )}
        </div>

        {/* Right: Sleek Groups (Admin Actions, Telemetry, Controls, Identity) */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          
          {/* Admin Tools Group (Sync, QR, LED Screen) - Only when Admin is authenticated */}
          {!isLoginScreen && currentView === 'admin' && (
            <div className="hidden sm:inline-flex items-center bg-white/5 backdrop-blur-xl border border-white/15 rounded-[2px] p-0.5">
              {/* Sync Status Button */}
              <button
                onClick={() => {
                  vibrateTap();
                  onOpenFirebaseConfig();
                }}
                data-tooltip={isFirebaseConnected ? 'Firebase Live: Đang đồng bộ thời gian thực' : 'Firebase Offline: Chế độ lưu trữ cục bộ'}
                data-tooltip-title="Đồng Bộ Dữ Liệu"
                data-tooltip-placement="bottom"
                data-tooltip-variant={isFirebaseConnected ? 'success' : 'warning'}
                className={`has-tooltip min-w-[44px] min-h-[44px] p-2 sm:p-1.5 rounded-[1px] text-xs transition cursor-pointer flex items-center justify-center gap-1 ${
                  isFirebaseConnected
                    ? 'text-emerald-300 hover:bg-emerald-950/50'
                    : 'text-amber-300 hover:bg-amber-950/50'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isFirebaseConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_5px_#34d399]' : 'bg-amber-400'
                  }`}
                />
              </button>

              {/* QR Code Button */}
              {onOpenQrCode && (
                <button
                  onClick={() => {
                    vibrateTap();
                    onOpenQrCode();
                  }}
                  data-tooltip="Bật/Tắt hiển thị mã QR tham gia cho khán giả"
                  data-tooltip-title="Mã QR Khán Giả"
                  data-tooltip-hotkey="Q"
                  data-tooltip-placement="bottom"
                  className="has-tooltip min-w-[44px] min-h-[44px] p-2 sm:p-1.5 rounded-[1px] text-sky-300 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center justify-center"
                >
                  <QrCode className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Open Projector Button */}
              <button
                onClick={() => {
                  vibrateTap();
                  window.open(window.location.origin + window.location.pathname + '?view=projector', '_blank');
                }}
                data-tooltip="Mở màn hình trình chiếu LED trong tab mới"
                data-tooltip-title="Màn Chiếu LED"
                data-tooltip-placement="bottom"
                data-tooltip-variant="accent"
                className="has-tooltip min-w-[44px] min-h-[44px] p-2 sm:p-1.5 rounded-[1px] bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer flex items-center justify-center"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Unified Compact Telemetry Group (Ping, Battery, Online Audience) - Only when logged in */}
          {!isLoginScreen && (
            <div className="hidden md:inline-flex items-center bg-white/5 backdrop-blur-xl border border-white/15 rounded-[2px] px-1 py-0.5 gap-1.5 text-xs font-mono">
              {/* Ping / Latency Indicator */}
              <button
                id="btn-ping-latency-indicator"
                onClick={handleManualPing}
                disabled={isMeasuringPing}
                data-tooltip={
                  pingInfo.latencyMs !== null
                    ? (effectiveLanguage === 'en'
                        ? `Firebase ping: ${pingInfo.latencyMs}ms (${pingBadge.description})`
                        : `Độ trễ Firebase: ${pingInfo.latencyMs}ms (${pingBadge.description}). Bấm để đo lại.`)
                    : 'Realtime offline'
                }
                data-tooltip-title={effectiveLanguage === 'en' ? 'Ping Latency' : 'Độ Trễ Mạng'}
                data-tooltip-placement="bottom"
                className="has-tooltip min-h-[44px] px-2 flex items-center gap-1 text-white/80 hover:text-white cursor-pointer"
              >
                <span className={`w-1.5 h-1.5 rounded-full ${pingBadge.dot}`} />
                <Activity className={`w-3 h-3 ${isMeasuringPing ? 'animate-spin text-white' : pingBadge.text}`} />
                <span className={`text-[10px] font-bold ${pingBadge.text}`}>
                  {isMeasuringPing ? '...' : pingInfo.latencyMs !== null ? `${pingInfo.latencyMs}ms` : 'Off'}
                </span>
              </button>

              <span className="w-[1px] h-3 bg-white/15" />

              {/* Battery Status Indicator */}
              <BatteryIndicator compact forceLanguage={currentView === 'admin' ? 'vi' : undefined} />

              <span className="w-[1px] h-3 bg-white/15" />

              {/* Connected Audience Metric */}
              <div
                data-tooltip={effectiveLanguage === 'en' ? 'Online arena members' : 'Số người đang trực tuyến'}
                data-tooltip-title={effectiveLanguage === 'en' ? 'Audience' : 'Trực Tuyến'}
                data-tooltip-placement="bottom"
                className="has-tooltip min-h-[44px] px-2 flex items-center gap-1 text-white/80"
              >
                <Users className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-extrabold text-emerald-400">{activeCount}</span>
              </div>
            </div>
          )}

          {/* System Utilities Group (Language, Audio, Fullscreen) - Unified everywhere */}
          <div className="inline-flex items-center bg-white/5 backdrop-blur-xl border border-white/15 rounded-[2px] p-0.5">
            {/* Quick Language Toggle */}
            <button
              id="btn-toggle-language"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                toggleLanguage();
              }}
              data-tooltip={localLanguage !== 'vi' ? 'Chuyển sang Tiếng Việt' : 'Switch to English'}
              data-tooltip-title="Language / Ngôn Ngữ"
              data-tooltip-placement="bottom"
              className="has-tooltip min-w-[44px] min-h-[44px] px-2.5 py-1.5 rounded-[1px] text-white/80 hover:text-white hover:bg-white/10 flex items-center justify-center gap-1 text-[10px] font-mono font-bold cursor-pointer"
            >
              <Globe className="w-3 h-3 text-sky-300" />
              <span>{localLanguage.toUpperCase()}</span>
            </button>

            {/* Sound Toggle */}
            <button
              id="btn-toggle-sound"
              type="button"
              onClick={() => {
                vibrateSelection();
                onToggleSound();
              }}
              data-tooltip={soundEnabled ? 'Tắt âm thanh hệ thống' : 'Bật âm thanh hệ thống'}
              data-tooltip-title="Âm Thanh"
              data-tooltip-hotkey="M"
              data-tooltip-placement="bottom"
              className="has-tooltip min-w-[44px] min-h-[44px] p-2 rounded-[1px] text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center justify-center"
            >
              {soundEnabled ? (
                <Volume2 className="w-3.5 h-3.5 text-sky-300" />
              ) : (
                <VolumeX className="w-3.5 h-3.5 text-white/40" />
              )}
            </button>

            {/* Sound EQ Slider Settings (Hidden in Admin View) */}
            {currentView !== 'admin' && (
              <button
                id="btn-open-audio-settings"
                type="button"
                onClick={() => {
                  vibrateSelection();
                  soundFx.playClick();
                  setIsAudioSettingsOpen(true);
                }}
                data-tooltip="Tùy chỉnh âm lượng Giọng đọc AI & Hiệu ứng"
                data-tooltip-title="Cài Đặt Âm Lượng"
                data-tooltip-placement="bottom"
                className="has-tooltip min-w-[44px] min-h-[44px] p-2 rounded-[1px] text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer flex items-center justify-center"
              >
                <Sliders className="w-3 h-3 text-sky-300/80 hover:text-sky-300" />
              </button>
            )}

            {/* Fullscreen Toggle */}
            <button
              id="btn-toggle-fullscreen"
              onClick={handleToggleFullscreen}
              data-tooltip={isFullscreen ? 'Thoát toàn màn hình' : 'Bật toàn màn hình (F11)'}
              data-tooltip-title="Toàn Màn Hình"
              data-tooltip-hotkey="F11"
              data-tooltip-placement="bottom"
              className={`hidden sm:flex has-tooltip min-w-[44px] min-h-[44px] p-2 rounded-[1px] transition cursor-pointer items-center justify-center ${
                isFullscreen
                  ? 'bg-sky-600 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5" />
              ) : (
                <Maximize className="w-3.5 h-3.5" />
              )}
            </button>
          </div>

          {/* User Profile / Admin Role Identity Pill */}
          {!isLoginScreen && (
            currentView === 'admin' ? (
              <div className="flex items-center bg-white/5 backdrop-blur-xl border border-sky-500/30 rounded-[2px] p-0.5">
                <div 
                  className="flex items-center gap-1.5 px-2 py-0.5 min-h-[44px] text-xs select-none"
                  title={`Ban Kỹ Thuật: ${adminUser ? adminUser.fullName : 'Admin'}`}
                >
                  <div className="w-5 h-5 rounded-[2px] bg-sky-600 text-white font-black flex items-center justify-center text-[10px]">
                    {adminUser ? adminUser.fullName.charAt(0).toUpperCase() : 'A'}
                  </div>
                  <span className="hidden xl:inline font-mono font-bold text-sky-300 text-[10px] truncate max-w-[100px]">
                    {adminUser ? adminUser.fullName : 'Ban Kỹ Thuật'}
                  </span>
                </div>

                {onAdminLogout && (
                  <button
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      onAdminLogout();
                    }}
                    data-tooltip="Đăng xuất Admin"
                    data-tooltip-title="Đăng Xuất"
                    data-tooltip-placement="bottom"
                    data-tooltip-variant="danger"
                    className="has-tooltip min-w-[44px] min-h-[44px] p-2 rounded-[1px] text-rose-300 hover:bg-rose-950/60 transition cursor-pointer flex items-center justify-center"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : user ? (
              <div className="flex items-center bg-white/5 backdrop-blur-xl border border-white/15 rounded-[2px] p-0.5">
                <button
                  id="btn-user-profile"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onOpenProfile();
                  }}
                  data-tooltip="Xem thông tin cá nhân"
                  data-tooltip-title="Hồ Sơ Khán Giả"
                  data-tooltip-placement="bottom"
                  className="has-tooltip min-h-[44px] flex items-center gap-1.5 px-2 py-1 text-xs transition cursor-pointer hover:bg-white/10 rounded-[1px]"
                >
                  <div className="w-5 h-5 rounded-[2px] fluent-acrylic-surface text-white font-bold flex items-center justify-center text-[10px] border border-blue-400/40">
                    {user.name.slice(0, 1).toUpperCase()}
                  </div>
                  <span className="hidden xl:inline font-mono font-bold text-white text-[10px] truncate max-w-[100px]">
                    {user.name}
                  </span>
                </button>

                {onLogout && (
                  <button
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      onLogout();
                    }}
                    data-tooltip="Đăng xuất"
                    data-tooltip-title="Đăng Xuất"
                    data-tooltip-placement="bottom"
                    data-tooltip-variant="danger"
                    className="has-tooltip min-w-[44px] min-h-[44px] p-2 rounded-[1px] text-rose-300 hover:bg-rose-950/60 transition cursor-pointer flex items-center justify-center"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : null
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => {
              vibrateTap();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="md:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-[2px] bg-white/5 border border-white/15 text-white/80 hover:text-white flex items-center justify-center"
            aria-label="Toggle mobile menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer / Floating Sheet */}
      {typeof document !== 'undefined' && !!document.body && isMobileMenuOpen && createPortal(
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-start pointer-events-auto">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-fadeIn cursor-pointer"
            onClick={() => {
              vibrateTap();
              setIsMobileMenuOpen(false);
            }}
            aria-hidden="true"
          />

          {/* Drawer Sheet */}
          <div 
            className="relative z-10 mx-auto w-full max-w-lg mt-[calc(3.5rem+env(safe-area-inset-top,0px))] max-h-[calc(100dvh-4.5rem-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px))] overflow-y-auto bg-[#0D0420]/95 backdrop-blur-2xl border border-white/15 rounded-b-[4px] p-4 space-y-3 shadow-2xl animate-slideUpFade"
          >
            {/* Header row */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-[2px] fluent-acrylic-surface flex items-center justify-center font-black text-xs text-white border border-blue-400/40">
                  BTI
                </div>
                <span className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                  {effectiveLanguage === 'en' ? 'Menu' : 'Menu Điều Khiển'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  vibrateTap();
                  setIsMobileMenuOpen(false);
                }}
                className="min-w-[44px] min-h-[44px] p-2 rounded-[2px] bg-white/10 text-white/70 hover:text-white flex items-center justify-center cursor-pointer"
                aria-label="Close menu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* In Login Screen: Clean minimal options */}
            {isLoginScreen ? (
              <div className="space-y-2 pt-1">
                {/* Language switch */}
                <button
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    toggleLanguage();
                  }}
                  className="w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2px] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-sky-300" />
                    <span>{effectiveLanguage === 'en' ? 'Language' : 'Ngôn Ngữ'}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-[2px] bg-sky-500/30 text-sky-200 font-bold border border-sky-400/30">
                    {localLanguage.toUpperCase()}
                  </span>
                </button>

                {/* Audio settings (Hidden in Admin View) */}
                {currentView !== 'admin' && (
                  <button
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      setIsAudioSettingsOpen(true);
                      setIsMobileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2px] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-sky-300" />
                      <span>{effectiveLanguage === 'en' ? 'Audio Settings' : 'Cài Đặt Âm Lượng & Giọng Đọc'}</span>
                    </div>
                    <span className="text-[10px] text-white/50 font-bold">Sliders</span>
                  </button>
                )}

                {/* Fullscreen */}
                <button
                  onClick={() => {
                    handleToggleFullscreen();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 rounded-[2px] flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    {isFullscreen ? <Minimize className="w-4 h-4 text-sky-300" /> : <Maximize className="w-4 h-4 text-white/70" />}
                    <span>{isFullscreen ? 'Thoát Toàn Màn Hình' : 'Toàn Màn Hình'}</span>
                  </div>
                  <span className="text-[10px] text-white/50">{isFullscreen ? 'ON' : 'OFF'}</span>
                </button>

                {/* Return Home */}
                <button
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onViewChange('landing');
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/80 border border-white/10 rounded-[2px] flex items-center justify-center gap-2 text-xs font-mono mt-2"
                >
                  <span>{effectiveLanguage === 'en' ? 'Home' : 'Quay Về Trang Chủ BTI'}</span>
                </button>
              </div>
            ) : (
              /* Authenticated Mobile Menu */
              <div className="space-y-3">
                {/* Account / Profile Card */}
                {currentView === 'admin' ? (
                  <div className="p-3 bg-sky-950/40 border border-sky-500/30 rounded-[2px] flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-[2px] bg-sky-500 text-white flex items-center justify-center text-xs font-bold font-mono">
                        {adminUser ? adminUser.fullName.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-sky-300 font-mono">
                          {adminUser ? adminUser.fullName : 'Ban Kỹ Thuật'}
                        </div>
                        <div className="text-[9px] text-white/50 font-mono uppercase tracking-wider">
                          {adminUser ? (TECHNICAL_ROLES[adminUser.technicalRole]?.label || 'Kỹ Thuật Viên') : 'Quản Trị Viên'}
                        </div>
                      </div>
                    </div>
                    {onAdminLogout && (
                      <button
                        onClick={() => {
                          vibrateTap();
                          onAdminLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="p-1.5 bg-rose-950/40 text-rose-300 border border-rose-500/30 rounded-[2px]"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : user ? (
                  <div className="p-3 bg-white/10 border border-white/15 rounded-[2px] flex items-center justify-between">
                    <button
                      onClick={() => {
                        vibrateTap();
                        onOpenProfile();
                        setIsMobileMenuOpen(false);
                      }}
                      className="flex items-center gap-2.5 text-left cursor-pointer"
                    >
                      <div className="w-7 h-7 rounded-[2px] fluent-acrylic-surface text-white flex items-center justify-center text-xs font-bold font-mono border border-blue-400/40">
                        {user.name.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white font-mono">{user.name}</div>
                        <div className="text-[9px] text-emerald-400 font-mono">{user.mssv}</div>
                      </div>
                    </button>
                    {onLogout && (
                      <button
                        onClick={() => {
                          vibrateTap();
                          onLogout();
                          setIsMobileMenuOpen(false);
                        }}
                        className="p-1.5 bg-rose-950/40 text-rose-300 border border-rose-500/30 rounded-[2px]"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ) : null}

                {/* Telemetry Card */}
                <div className="p-3 fluent-box-nested border border-white/10 rounded-[2px] space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${pingBadge.dot}`} />
                      <span className="text-white/80">Độ trễ Ping:</span>
                      <span className={`font-bold ${pingBadge.text}`}>
                        {pingInfo.latencyMs !== null ? `${pingInfo.latencyMs}ms` : 'Offline'}
                      </span>
                    </div>
                    <button
                      onClick={handleManualPing}
                      disabled={isMeasuringPing}
                      className="px-2 py-0.5 text-[10px] bg-white/10 border border-white/15 rounded-[2px] text-white"
                    >
                      {isMeasuringPing ? '...' : 'Đo lại'}
                    </button>
                  </div>

                  <BatteryIndicator showDetails className="w-full" forceLanguage={currentView === 'admin' ? 'vi' : undefined} />
                </div>

                {/* Admin Quick Options */}
                {currentView === 'admin' && (
                  <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                    <button
                      onClick={() => {
                        vibrateTap();
                        onOpenFirebaseConfig();
                        setIsMobileMenuOpen(false);
                      }}
                      className={`px-3 py-2.5 rounded-[2px] flex items-center gap-2 text-xs font-semibold border ${
                        isFirebaseConnected
                          ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                          : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                      }`}
                    >
                      <Database className="w-4 h-4" /> {isFirebaseConnected ? 'Firebase Live' : 'Firebase Offline'}
                    </button>

                    {onOpenQrCode && (
                      <button
                        onClick={() => {
                          vibrateTap();
                          onOpenQrCode();
                          setIsMobileMenuOpen(false);
                        }}
                        className="px-3 py-2.5 bg-sky-950/30 text-sky-300 border border-sky-500/30 rounded-[2px] flex items-center gap-2 text-xs font-semibold"
                      >
                        <QrCode className="w-4 h-4" /> Mã QR Khán Giả
                      </button>
                    )}

                    <button
                      onClick={() => {
                        vibrateTap();
                        window.open(window.location.origin + window.location.pathname + '?view=projector', '_blank');
                        setIsMobileMenuOpen(false);
                      }}
                      className="px-3 py-2.5 bg-sky-600 hover:bg-sky-500 text-white rounded-[2px] flex items-center gap-2 text-xs font-bold"
                    >
                      <Eye className="w-4 h-4" /> Mở Màn Chiếu LED Sân Khấu
                    </button>
                  </div>
                )}

                {/* Utilities in Drawer */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
                  <button
                    onClick={() => {
                      vibrateTap();
                      soundFx.playClick();
                      toggleLanguage();
                    }}
                    className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-[2px] flex items-center justify-between text-xs font-mono"
                  >
                    <div className="flex items-center gap-2">
                      <Globe className="w-4 h-4 text-sky-300" />
                      <span>{effectiveLanguage === 'en' ? 'Language' : 'Ngôn Ngữ'}</span>
                    </div>
                    <span className="font-bold text-sky-200">{localLanguage.toUpperCase()}</span>
                  </button>

                  {currentView !== 'admin' && (
                    <button
                      onClick={() => {
                        vibrateTap();
                        soundFx.playClick();
                        setIsAudioSettingsOpen(true);
                        setIsMobileMenuOpen(false);
                      }}
                      className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-[2px] flex items-center justify-between text-xs font-mono"
                    >
                      <div className="flex items-center gap-2">
                        <Sliders className="w-4 h-4 text-sky-300" />
                        <span>{effectiveLanguage === 'en' ? 'Audio Settings' : 'Cài Đặt Âm Lượng'}</span>
                      </div>
                      <span className="text-[10px] text-sky-200">Sliders</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}

      {/* Audio Settings Modal */}
      {currentView !== 'admin' && (
        <AudioSettingsModal
          isOpen={isAudioSettingsOpen}
          onClose={() => setIsAudioSettingsOpen(false)}
        />
      )}
    </header>
  );
};
