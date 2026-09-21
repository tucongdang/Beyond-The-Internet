import React, { useState, useEffect } from 'react';
import { GameState, UserInfo, PingInfo } from '../types';
import { Users, Shield, Tv, Volume2, VolumeX, Database, Menu, X, LogOut, QrCode, Eye, Maximize, Minimize, Activity, RefreshCw, Download, Globe, Sliders } from 'lucide-react';
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
  // Admin Portal strictly retains Vietnamese navigation bar
  const effectiveLanguage = currentView === 'admin' ? 'vi' : localLanguage;
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
        container: 'bg-zinc-500/10 border-zinc-500/30 text-zinc-400 hover:border-zinc-500/50',
        dot: 'bg-zinc-500',
        icon: 'text-zinc-400',
        label: 'Offline',
        qualityText: effectiveLanguage === 'en' ? 'Offline' : 'Mất kết nối',
        description: effectiveLanguage === 'en' ? 'Firebase Disconnected' : 'Mất kết nối Firebase'
      };
    }
    if (pingInfo.quality === 'excellent') {
      return {
        container: 'bg-white/10 backdrop-blur-md border-emerald-500/30 text-emerald-400 hover:border-emerald-500/50',
        dot: 'bg-emerald-400',
        icon: 'text-emerald-400',
        label: `${pingInfo.latencyMs}ms`,
        qualityText: effectiveLanguage === 'en' ? 'Excellent' : 'Cực tốt',
        description: effectiveLanguage === 'en' ? 'Ultra-low latency (< 100ms)' : 'Độ trễ cực tốt (< 100ms)'
      };
    }
    if (pingInfo.quality === 'good') {
      return {
        container: 'bg-white/10 backdrop-blur-md border-sky-500/30 text-sky-400 hover:border-sky-500/50',
        dot: 'bg-sky-400',
        icon: 'text-sky-400',
        label: `${pingInfo.latencyMs}ms`,
        qualityText: effectiveLanguage === 'en' ? 'Good' : 'Tốt',
        description: effectiveLanguage === 'en' ? 'Stable latency (< 250ms)' : 'Độ trễ ổn định (< 250ms)'
      };
    }
    if (pingInfo.quality === 'fair') {
      return {
        container: 'bg-white/10 backdrop-blur-md border-amber-500/30 text-amber-400 hover:border-amber-500/50',
        dot: 'bg-amber-400',
        icon: 'text-amber-400',
        label: `${pingInfo.latencyMs}ms`,
        qualityText: effectiveLanguage === 'en' ? 'Fair' : 'Trung bình',
        description: effectiveLanguage === 'en' ? 'Moderate latency (< 500ms)' : 'Độ trễ trung bình (< 500ms)'
      };
    }
    return {
      container: 'bg-white/10 backdrop-blur-md border-rose-500/30 text-rose-400 hover:border-rose-500/50',
      dot: 'bg-rose-400 animate-ping',
      icon: 'text-rose-400',
      label: `${pingInfo.latencyMs}ms`,
      qualityText: effectiveLanguage === 'en' ? 'Poor' : 'Chậm',
      description: effectiveLanguage === 'en' ? 'High latency (> 500ms)' : 'Độ trễ cao (> 500ms)'
    };
  };

  const getStatusBadge = () => {
    switch (gameState.status) {
      case 'ACTIVE':
        return (
          <div className="px-2.5 py-1 bg-emerald-950/50 border border-emerald-500/40 rounded-[2px] flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_#34d399]" />
            <span className="text-[10px] font-mono font-bold text-emerald-300 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'In Progress' : 'Đang Diễn Ra'}
            </span>
          </div>
        );
      case 'LOCKED':
        return (
          <div className="px-2.5 py-1 bg-amber-950/50 border border-amber-500/40 rounded-[2px] flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 bg-amber-400 rounded-full" />
            <span className="text-[10px] font-mono font-bold text-amber-300 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'Locked' : 'Đã Khóa'}
            </span>
          </div>
        );
      case 'REVEAL':
        return (
          <div className="px-2.5 py-1 bg-purple-950/50 border border-purple-500/40 rounded-[2px] flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse shadow-[0_0_8px_#c084fc]" />
            <span className="text-[10px] font-mono font-bold text-purple-300 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'Result Revealed' : 'Công Bố Kết Quả'}
            </span>
          </div>
        );
      case 'STANDBY':
      default:
        return (
          <div className="px-2.5 py-1 bg-white/5 border border-white/10 rounded-[2px] flex items-center gap-2 shadow-sm">
            <div className="w-2 h-2 bg-white/40 rounded-full" />
            <span className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider">
              {effectiveLanguage === 'en' ? 'Waiting for Stage' : 'Chờ Sân Khấu'}
            </span>
          </div>
        );
    }
  };

  const pingBadge = getPingBadgeStyle();

  return (
    <header
      id="app-navbar"
      className="sticky top-0 z-40 w-full fluent-navbar text-[#e5e5e5] select-none transition-all"
    >
      <div 
        className="max-w-[1400px] mx-auto px-3 sm:px-5 h-15 flex items-center justify-between gap-3"
      >
        {/* Left: Bento Branding & Status */}
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <div
            onClick={() => {
              vibrateTap();
              onViewChange('landing');
            }}
            className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group shrink-0"
          >
            <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 fluent-acrylic-surface rounded-[2px] flex items-center justify-center font-black text-base sm:text-lg text-white shadow-lg shadow-blue-950/50 border border-blue-400/40 group-hover:scale-105 group-hover:border-blue-300/60 transition duration-200">
              BTI
            </div>
            <div className="hidden xl:block">
              <h1 className="text-sm sm:text-base font-extrabold tracking-tight leading-tight text-white flex items-center gap-1.5 whitespace-nowrap">
                BEYOND THE INTERNET <span className="text-sky-300">2026</span>
              </h1>
              <p className="text-[9px] sm:text-[10px] text-white/50 uppercase tracking-[0.15em] font-mono leading-none mt-1 whitespace-nowrap">
                Interactive Arena • BTI Node
              </p>
            </div>
            <div className="hidden sm:block xl:hidden">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-tight text-white whitespace-nowrap">
                BTI <span className="text-sky-300">2026</span>
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center">
            {getStatusBadge()}
          </div>
        </div>

        {/* Right: Telemetry & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Admin Quick Controls Group */}
          {currentView === 'admin' && (
            <div className="hidden sm:inline-flex fluent-action-group">
              {/* Sync Status Button */}
              <button
                onClick={() => {
                  vibrateTap();
                  onOpenFirebaseConfig();
                }}
                data-tooltip={isFirebaseConnected ? 'Trạng thái Firebase: Đang hoạt động trực tiếp (Live Sync)' : 'Trạng thái Firebase: Chế độ cục bộ (Offline / Local Mode)'}
                data-tooltip-title="Cấu Hình Đồng Bộ"
                data-tooltip-placement="bottom"
                data-tooltip-variant={isFirebaseConnected ? 'success' : 'warning'}
                className={`has-tooltip fluent-action-btn ${
                  isFirebaseConnected
                    ? 'text-emerald-300 bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/30'
                    : 'text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/30'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isFirebaseConnected ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]' : 'bg-amber-400 animate-pulse'
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
                  className="has-tooltip fluent-action-btn text-sky-300 bg-sky-950/40 hover:bg-sky-900/50 border-sky-500/30"
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
                data-tooltip="Mở màn hình trình chiếu LED trong cửa sổ tab mới"
                data-tooltip-title="Màn Chiếu LED"
                data-tooltip-placement="bottom"
                data-tooltip-variant="accent"
                className="has-tooltip fluent-action-btn bg-sky-600 hover:bg-sky-500 text-white border-sky-400/50 shadow-md shadow-sky-950/30"
              >
                <Eye className="w-3.5 h-3.5" />
              </button>

              {/* Admin Logout Button */}
              {onAdminLogout && (
                <button
                  onClick={() => {
                    vibrateTap();
                    onAdminLogout();
                  }}
                  data-tooltip="Đăng xuất khỏi quyền điều khiển Ban Tổ Chức"
                  data-tooltip-title="Đăng Xuất Admin"
                  data-tooltip-placement="bottom"
                  data-tooltip-variant="danger"
                  className="has-tooltip fluent-action-btn text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border-rose-500/30"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Telemetry Group: Ping, Battery, Connected Count */}
          <div className="fluent-action-group bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2px]">
            {/* Ping / Latency Indicator */}
            <button
              id="btn-ping-latency-indicator"
              onClick={handleManualPing}
              disabled={isMeasuringPing}
              data-tooltip={
                pingInfo.latencyMs !== null
                  ? (effectiveLanguage === 'en'
                      ? `Firebase latency: ${pingInfo.latencyMs}ms (${pingBadge.description}). Click to check again.`
                      : `Độ trễ Firebase: ${pingInfo.latencyMs}ms (${pingBadge.description}). Bấm để kiểm tra lại ngay.`)
                  : (effectiveLanguage === 'en'
                      ? 'Realtime sync offline. Click to reconnect.'
                      : 'Mất kết nối thời gian thực. Bấm để thử đồng bộ lại.')
              }
              data-tooltip-title={effectiveLanguage === 'en' ? 'Network Latency (RTT)' : 'Độ Trễ Mạng (Ping RTT)'}
              data-tooltip-placement="bottom"
              className={`hidden sm:flex has-tooltip fluent-action-btn ${pingBadge.container}`}
              aria-label={effectiveLanguage === 'en' ? `Firebase latency: ${pingBadge.label}` : `Độ trễ Firebase: ${pingBadge.label}`}
            >
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  {pingInfo.latencyMs !== null && pingInfo.quality === 'excellent' && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-emerald-400" />
                  )}
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${pingBadge.dot}`} />
                </span>
                <Activity className={`w-3.5 h-3.5 ${isMeasuringPing ? 'animate-spin text-white' : pingBadge.icon}`} />
              </div>
              <div className="flex flex-col items-start leading-none font-mono">
                <span className="text-[8px] uppercase tracking-wider font-bold opacity-75">
                  Ping
                </span>
                <span className="text-xs font-bold tracking-tight">
                  {isMeasuringPing ? (
                    <span className="animate-pulse">...</span>
                  ) : pingInfo.latencyMs !== null ? (
                    `${pingInfo.latencyMs}ms`
                  ) : (
                    'Off'
                  )}
                </span>
              </div>
            </button>

            {/* Battery Status Indicator */}
            <div>
              <BatteryIndicator forceLanguage={currentView === 'admin' ? 'vi' : undefined} />
            </div>

            {/* Connected Audience Metric */}
            <div
              data-tooltip={
                effectiveLanguage === 'en'
                  ? 'Total online users currently in the game room'
                  : 'Tổng số người dùng đang trực tuyến trong phòng thi'
              }
              data-tooltip-title={effectiveLanguage === 'en' ? 'Online Audience' : 'Khán Giả Trực Tuyến'}
              data-tooltip-placement="bottom"
              className="has-tooltip flex flex-col items-end justify-center px-2 sm:px-2.5 min-h-[34px] bg-white/5 border border-white/10 rounded-[2px] shrink-0 whitespace-nowrap"
            >
              <span className="text-[8px] text-white/50 uppercase font-bold tracking-wider font-mono">
                {effectiveLanguage === 'en' ? 'Connected' : 'Trực Tuyến'}
              </span>
              <span className="text-xs sm:text-sm font-mono font-extrabold text-emerald-400 leading-none">
                {activeCount}
              </span>
            </div>
          </div>

          <div className="fluent-action-group bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.15)] rounded-[2px]">
            {/* Quick Language Toggle */}
            <button
              id="btn-toggle-language"
              onClick={() => {
                vibrateTap();
                soundFx.playClick();
                toggleLanguage();
              }}
              data-tooltip={
                localLanguage !== 'vi'
                  ? 'Chuyển sang Tiếng Việt (Switch to Vietnamese)'
                  : 'Switch to English (Chuyển sang Tiếng Anh)'
              }
              data-tooltip-title={localLanguage !== 'vi' ? 'Language / Ngôn Ngữ' : 'Ngôn Ngữ / Language'}
              data-tooltip-placement="bottom"
              className="has-tooltip fluent-action-btn text-white/80 hover:text-white bg-white/5 hover:bg-white/10 border-white/10 flex items-center gap-1.5 px-2 font-mono cursor-pointer"
              aria-label={localLanguage !== 'vi' ? 'Switch to Vietnamese' : 'Switch to English'}
            >
              <Globe className="w-3.5 h-3.5 text-sky-300" />
              <span className="text-[11px] font-black text-sky-200 uppercase tracking-wide">
                {localLanguage.toUpperCase()}
              </span>
            </button>
            {/* Sound Toggle & Audio Settings */}
            <div className="flex items-center rounded-[2px] bg-white/5 border border-white/10 p-0.5">
              <button
                id="btn-toggle-sound"
                type="button"
                onClick={() => {
                  vibrateSelection();
                  onToggleSound();
                }}
                data-tooltip={
                  soundEnabled
                    ? (effectiveLanguage === 'en' ? 'Mute all sound effects' : 'Tắt toàn bộ hiệu ứng âm thanh')
                    : (effectiveLanguage === 'en' ? 'Enable arena sound effects' : 'Bật hiệu ứng âm thanh sàn đấu')
                }
                data-tooltip-title={effectiveLanguage === 'en' ? 'System Sound' : 'Âm Thanh Hệ Thống'}
                data-tooltip-hotkey="M"
                data-tooltip-placement="bottom"
                className="has-tooltip p-1.5 rounded-[1px] text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
              >
                {soundEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-sky-300" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-white/40" />
                )}
              </button>
              <button
                id="btn-open-audio-settings"
                type="button"
                onClick={() => {
                  vibrateSelection();
                  soundFx.playClick();
                  setIsAudioSettingsOpen(true);
                }}
                data-tooltip={effectiveLanguage === 'en' ? 'Adjust TTS & Sound FX volume' : 'Chỉnh âm lượng Giọng đọc AI & Hiệu ứng'}
                data-tooltip-title={effectiveLanguage === 'en' ? 'Audio Settings' : 'Cài Đặt Âm Lượng'}
                data-tooltip-placement="bottom"
                className="has-tooltip p-1.5 rounded-[1px] text-white/50 hover:text-white hover:bg-white/10 transition cursor-pointer border-l border-white/10"
              >
                <Sliders className="w-3 h-3 text-sky-300/80 hover:text-sky-300" />
              </button>
            </div>

            {/* Fullscreen Toggle */}
            <button
              id="btn-toggle-fullscreen"
              onClick={handleToggleFullscreen}
              data-tooltip={
                isFullscreen
                  ? (effectiveLanguage === 'en' ? 'Exit fullscreen mode' : 'Thoát chế độ toàn màn hình')
                  : (effectiveLanguage === 'en' ? 'Enter fullscreen for optimal experience' : 'Mở rộng toàn màn hình để tối ưu trải nghiệm')
              }
              data-tooltip-title={effectiveLanguage === 'en' ? 'Fullscreen' : 'Toàn Màn Hình'}
              data-tooltip-hotkey="F11"
              data-tooltip-placement="bottom"
              className={`hidden sm:flex has-tooltip fluent-action-btn ${
                isFullscreen
                  ? 'bg-sky-600/80 text-white border-sky-400/50 shadow-sm'
                  : 'text-white/70 hover:text-white bg-white/5 hover:bg-white/10 border-white/10'
              }`}
              aria-label={
                isFullscreen
                  ? (effectiveLanguage === 'en' ? 'Exit fullscreen' : 'Thoát toàn màn hình')
                  : (effectiveLanguage === 'en' ? 'Enter fullscreen' : 'Bật toàn màn hình')
              }
            >
              {isFullscreen ? (
                <Minimize className="w-3.5 h-3.5 text-sky-200" />
              ) : (
                <Maximize className="w-3.5 h-3.5 text-white/70 hover:text-white" />
              )}
            </button>

            {/* PWA Install Button (Desktop) */}
            {onOpenInstallModal && (
              <button
                id="btn-navbar-install-pwa"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  onOpenInstallModal();
                }}
                data-tooltip={
                  effectiveLanguage === 'en'
                    ? 'Install app to Home Screen (PWA) for smoother experience'
                    : 'Cài đặt ứng dụng về Màn hình chính (PWA) để dùng mượt mà hơn'
                }
                data-tooltip-title={effectiveLanguage === 'en' ? 'Install App' : 'Cài Đặt Ứng Dụng'}
                data-tooltip-placement="bottom"
                className="hidden sm:flex has-tooltip fluent-action-btn text-sky-300 bg-sky-950/30 hover:bg-sky-900/40 border-sky-500/30"
              >
                <Download className="w-3.5 h-3.5 text-sky-300" />
                <span className="hidden xl:inline text-[11px]">{effectiveLanguage === 'en' ? 'Install' : 'Cài App'}</span>
              </button>
            )}
          </div>

          {/* User Profile / Admin Role Badge */}
          {currentView === 'admin' ? (
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 bg-sky-950/40 border border-sky-500/30 rounded-[2px] text-xs select-none shadow-sm">
              <div className="w-5 h-5 rounded-[2px] fluent-acrylic-surface text-white font-extrabold flex items-center justify-center text-[10px] shadow-sm">
                A
              </div>
              <div className="flex flex-col items-start font-mono">
                <span className="font-extrabold text-sky-300 text-[10px] leading-tight">Ban Tổ Chức</span>
                <span className="text-white/50 text-[8px] leading-tight font-bold">Quản Trị Viên</span>
              </div>
            </div>
          ) : user ? (
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                id="btn-user-profile"
                onClick={() => {
                  vibrateTap();
                  onOpenProfile();
                }}
                className="flex items-center gap-2 px-2.5 py-1 fluent-box-nested border border-white/10 hover:border-sky-500/40 rounded-[2px] text-xs transition cursor-pointer"
              >
                <div className="w-5 h-5 rounded-[2px] fluent-acrylic-surface text-white font-bold flex items-center justify-center text-[10px]">
                  {user.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="flex flex-col items-start font-mono">
                  <span className="font-bold text-white text-[10px] leading-tight truncate max-w-[100px]">{user.name}</span>
                  <span className="text-emerald-400 font-bold text-[8px] leading-tight">{user.mssv}</span>
                </div>
              </button>
              {onLogout && (
                <button
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onLogout();
                  }}
                  className="p-1.5 fluent-action-btn text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border-rose-500/30 rounded-[2px]"
                  title={effectiveLanguage === 'en' ? 'Sign out' : 'Đăng xuất'}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={() => {
                vibrateTap();
                onOpenProfile();
              }}
              className="hidden sm:block px-3 py-1.5 fluent-acrylic-surface hover:from-blue-500 hover:to-indigo-500 text-white font-bold rounded-[2px] text-xs uppercase tracking-wider transition shadow-md shadow-blue-950/40 border border-blue-400/40"
            >
              {effectiveLanguage === 'en' ? 'Sign In' : 'Đăng nhập'}
            </button>
          )}

          {/* Hamburger Menu Toggle for Mobile */}
          <button
            onClick={() => {
              vibrateTap();
              setIsMobileMenuOpen(!isMobileMenuOpen);
            }}
            className="sm:hidden p-2 fluent-nav-btn text-white/70 hover:text-white"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu with Fluent Styling */}
      {isMobileMenuOpen && (
        <div className="sm:hidden border-t border-white/10 bg-[#0D0420]/95 backdrop-blur-2xl p-3.5 space-y-3 shadow-2xl absolute top-full left-0 w-full z-[100] animate-fadeIn">
          {/* Mobile Connection & Latency Telemetry Card */}
          <div className="p-3 fluent-box-nested border border-white/10 rounded-[2px] flex items-center justify-between shadow-inner">
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-[2px] flex items-center justify-center border ${pingBadge.container}`}>
                <Activity className={`w-4 h-4 ${isMeasuringPing ? 'animate-spin text-white' : pingBadge.icon}`} />
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-1.5 font-mono">
                  <span>Firebase Ping</span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded-[2px] font-mono font-bold uppercase tracking-wider ${
                    pingInfo.quality === 'excellent'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/30'
                      : pingInfo.quality === 'good'
                      ? 'bg-sky-950/60 text-sky-300 border border-sky-500/30'
                      : pingInfo.quality === 'fair'
                      ? 'bg-amber-950/60 text-amber-300 border border-amber-500/30'
                      : pingInfo.quality === 'poor'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-500/30'
                      : 'bg-zinc-500/20 text-zinc-400 border border-zinc-500/30'
                  }`}>
                    {pingBadge.qualityText}
                  </span>
                </div>
                <div className="text-[11px] font-mono text-white/70 flex items-center gap-1.5 mt-0.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${pingBadge.dot}`} />
                  <span>RTT: <strong className="text-white font-bold">{pingInfo.latencyMs !== null ? `${pingInfo.latencyMs} ms` : (effectiveLanguage === 'en' ? 'Disconnected' : 'Mất kết nối')}</strong></span>
                  {pingInfo.lastChecked > 0 && (
                    <span className="text-white/40 text-[9px]">
                      • {new Date(pingInfo.lastChecked).toLocaleTimeString(effectiveLanguage === 'en' ? 'en-US' : 'vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={handleManualPing}
              disabled={isMeasuringPing}
              className="px-2.5 py-1.5 fluent-action-btn text-xs font-mono font-bold border border-white/10 shrink-0"
              title={effectiveLanguage === 'en' ? 'Re-check latency now' : 'Đo lại độ trễ ngay'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isMeasuringPing ? 'animate-spin' : ''}`} />
              <span className="text-[11px]">{isMeasuringPing ? (effectiveLanguage === 'en' ? 'Testing' : 'Đang đo') : (effectiveLanguage === 'en' ? 'Re-test' : 'Đo lại')}</span>
            </button>
          </div>

          {/* Mobile Battery Status Card */}
          <BatteryIndicator showDetails className="w-full" forceLanguage={currentView === 'admin' ? 'vi' : undefined} />

          {currentView === 'admin' && (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3 p-2.5 bg-sky-950/40 border border-sky-500/30 rounded-[2px]">
                <div className="w-7 h-7 rounded-[2px] bg-sky-500 text-white flex items-center justify-center text-xs font-bold">
                  A
                </div>
                <div>
                  <div className="text-xs font-bold text-sky-300 font-mono">Ban Tổ Chức</div>
                  <div className="text-[9px] text-white/50 font-mono tracking-widest uppercase">Quản Trị Viên (Admin)</div>
                </div>
              </div>
            </div>
          )}

          {currentView === 'admin' && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
              <span className="text-[9px] text-white/40 uppercase font-mono font-bold tracking-widest px-1">Điều Khiển Admin</span>
              
              <button
                onClick={() => {
                  vibrateTap();
                  onOpenFirebaseConfig();
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2.5 rounded-[2px] flex items-center gap-2.5 transition text-left border text-xs font-semibold ${
                  isFirebaseConnected
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-950/40 text-amber-300 border-amber-500/30'
                }`}
              >
                <Database className="w-4 h-4" /> {isFirebaseConnected ? 'Firebase Live Sync' : 'Đồng bộ Cục bộ (Offline)'}
              </button>

              {onOpenQrCode && (
                <button
                  onClick={() => {
                    vibrateTap();
                    if (onOpenQrCode) onOpenQrCode();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2.5 bg-sky-950/30 text-sky-300 border border-sky-500/30 rounded-[2px] flex items-center gap-2.5 text-left text-xs font-semibold"
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
                className="px-3 py-2.5 bg-sky-600 hover:bg-sky-500 border border-sky-400/60 text-white rounded-[2px] flex items-center gap-2.5 font-bold text-left text-xs shadow-md shadow-sky-950/30"
              >
                <Eye className="w-4 h-4" /> Mở Màn Chiếu Sân Khấu
              </button>

              {onAdminLogout && (
                <button
                  onClick={() => {
                    vibrateTap();
                    if (onAdminLogout) onAdminLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2.5 bg-rose-950/30 text-rose-300 rounded-[2px] flex items-center gap-2.5 font-semibold text-left border border-rose-500/30 text-xs"
                >
                  <LogOut className="w-4 h-4" /> Đăng Xuất Admin
                </button>
              )}

              {/* Mobile Language Toggle in Admin menu */}
              <button
                id="btn-mobile-language-admin"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  toggleLanguage();
                }}
                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-[2px] flex items-center justify-between font-semibold text-left transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-sky-300" />
                  <span>Ngôn Ngữ (Language)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] font-bold ${localLanguage === 'vi' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/10 text-white/50'}`}>
                    VI
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] font-bold ${localLanguage !== 'vi' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/10 text-white/50'}`}>
                    EN
                  </span>
                </div>
              </button>

              {/* Mobile Audio Settings in Admin menu */}
              <button
                id="btn-mobile-audio-settings-admin"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setIsAudioSettingsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-[2px] flex items-center justify-between font-semibold text-left transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-sky-300" />
                  <span>{effectiveLanguage === 'en' ? 'Audio & AI Voice Settings' : 'Cài Đặt Âm Lượng & Giọng Đọc'}</span>
                </div>
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[2px] bg-sky-900/40 text-sky-200 border border-sky-500/30">
                  Sliders
                </span>
              </button>

              {/* Mobile Fullscreen Toggle in Admin menu */}
              <button
                id="btn-mobile-fullscreen-admin"
                onClick={() => {
                  handleToggleFullscreen();
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2.5 rounded-[2px] flex items-center justify-between transition text-left border text-xs font-semibold ${
                  isFullscreen
                    ? 'bg-sky-950/40 text-sky-300 border-sky-500/40 font-bold'
                    : 'bg-white/5 text-white/90 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isFullscreen ? <Minimize className="w-4 h-4 text-sky-300" /> : <Maximize className="w-4 h-4 text-white/70" />}
                  <span>{isFullscreen ? 'Thoát Toàn Màn Hình' : 'Toàn Màn Hình (Fullscreen)'}</span>
                </div>
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[2px] bg-white/10 text-white/70">
                  {isFullscreen ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Mobile PWA Install */}
              {onOpenInstallModal && (
                <button
                  id="btn-mobile-install-admin"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onOpenInstallModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2.5 bg-sky-950/30 hover:bg-sky-900/40 text-sky-300 border border-sky-500/30 rounded-[2px] flex items-center justify-between font-semibold text-left transition text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-sky-300" />
                    <span>Cài Đặt Ứng Dụng (PWA)</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-sky-900/50 text-sky-200 border border-sky-500/30">
                    Install
                  </span>
                </button>
              )}
            </div>
          )}

          {currentView !== 'admin' && (
            <div className="flex flex-col gap-1.5 pt-2 border-t border-white/10">
              <span className="text-[9px] text-white/40 uppercase font-mono font-bold tracking-widest px-1">
                {effectiveLanguage === 'en' ? 'System' : 'Hệ thống'}
              </span>

              {/* Mobile Language Toggle */}
              <button
                id="btn-mobile-language"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  toggleLanguage();
                }}
                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-[2px] flex items-center justify-between font-semibold text-left transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-sky-300" />
                  <span>{effectiveLanguage === 'en' ? 'Language' : 'Ngôn Ngữ'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] font-bold ${localLanguage === 'vi' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/10 text-white/50'}`}>
                    VI
                  </span>
                  <span className={`text-[10px] font-mono px-2 py-0.5 rounded-[2px] font-bold ${localLanguage !== 'vi' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/10 text-white/50'}`}>
                    EN
                  </span>
                </div>
              </button>

              {/* Mobile Audio Settings in Audience menu */}
              <button
                id="btn-mobile-audio-settings-user"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setIsAudioSettingsOpen(true);
                  setIsMobileMenuOpen(false);
                }}
                className="px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white/90 border border-white/10 rounded-[2px] flex items-center justify-between font-semibold text-left transition text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <Sliders className="w-4 h-4 text-sky-300" />
                  <span>{effectiveLanguage === 'en' ? 'Audio & Voice Volume Settings' : 'Cài Đặt Âm Lượng & Giọng Đọc'}</span>
                </div>
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[2px] bg-sky-900/40 text-sky-200 border border-sky-500/30">
                  Sliders
                </span>
              </button>

              {/* Fullscreen Quick Toggle */}
              <button
                id="btn-mobile-fullscreen"
                onClick={() => {
                  handleToggleFullscreen();
                  setIsMobileMenuOpen(false);
                }}
                className={`px-3 py-2.5 rounded-[2px] flex items-center justify-between transition text-left border text-xs font-semibold ${
                  isFullscreen
                    ? 'bg-sky-950/40 text-sky-300 border-sky-500/40 font-bold'
                    : 'bg-white/5 text-white/90 border-white/10 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {isFullscreen ? <Minimize className="w-4 h-4 text-sky-300" /> : <Maximize className="w-4 h-4 text-white/70" />}
                  <span>
                    {isFullscreen
                      ? (effectiveLanguage === 'en' ? 'Exit Fullscreen' : 'Thoát Toàn Màn Hình')
                      : (effectiveLanguage === 'en' ? 'Fullscreen Mode' : 'Toàn Màn Hình (Fullscreen)')}
                  </span>
                </div>
                <span className="text-[9px] font-mono uppercase font-bold tracking-wider px-2 py-0.5 rounded-[2px] bg-white/10 text-white/70">
                  {isFullscreen ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Mobile PWA Install */}
              {onOpenInstallModal && (
                <button
                  id="btn-mobile-install-user"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    onOpenInstallModal();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2.5 bg-sky-950/30 hover:bg-sky-900/40 text-sky-300 border border-sky-500/30 rounded-[2px] flex items-center justify-between font-semibold text-left transition text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-sky-300" />
                    <span>{effectiveLanguage === 'en' ? 'Install Application (PWA)' : 'Cài Đặt Ứng Dụng (PWA)'}</span>
                  </div>
                  <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-sky-900/50 text-sky-200 border border-sky-500/30">
                    Install
                  </span>
                </button>
              )}

              {user ? (
                <div className="flex items-center justify-between p-2.5 fluent-box-nested rounded-[2px] border border-white/10">
                  <button
                    onClick={() => {
                      vibrateTap();
                      onOpenProfile();
                      setIsMobileMenuOpen(false);
                    }}
                    className="flex items-center gap-2.5 text-left"
                  >
                    <div className="w-7 h-7 rounded-[2px] fluent-acrylic-surface text-white flex items-center justify-center text-xs font-bold font-mono">
                      {user.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white font-mono">{user.name}</div>
                      <div className="text-[9px] text-emerald-400 font-mono tracking-widest">{user.mssv}</div>
                    </div>
                  </button>
                  {onLogout && (
                    <button
                      onClick={() => {
                        vibrateTap();
                        soundFx.playClick();
                        onLogout();
                        setIsMobileMenuOpen(false);
                      }}
                      className="p-2 fluent-action-btn text-rose-300 bg-rose-950/30 hover:bg-rose-900/40 border-rose-500/30 rounded-[2px]"
                      title={effectiveLanguage === 'en' ? 'Sign out' : 'Đăng xuất'}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => {
                    vibrateTap();
                    onOpenProfile();
                    setIsMobileMenuOpen(false);
                  }}
                  className="px-3 py-2.5 fluent-acrylic-surface hover:from-blue-500 hover:to-indigo-500 text-white rounded-[2px] flex items-center justify-center font-bold text-xs shadow-md"
                >
                  {effectiveLanguage === 'en' ? 'Sign In' : 'Đăng nhập'}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Independent Audio & AI Voice Settings Modal */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
      />
    </header>
  );
};
