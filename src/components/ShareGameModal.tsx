import React, { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../hooks/useLanguage';
import { createPortal } from 'react-dom';
import QRCode from 'qrcode';
import {
  QrCode,
  Share2,
  Copy,
  Check,
  Download,
  X,
  Smartphone,
  ExternalLink,
  Sparkles,
  Radio,
  Layers,
  Clock,
  ScanLine,
  Maximize2,
  Minimize2,
  Activity,
  Terminal,
  ArrowLeft,
  RotateCcw
} from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { syncService } from '../services/syncService';
import { vibrateTap, vibrateCopy, vibrateShare, vibrateSuccess } from '../utils/hapticUtils';
import { QR_PALETTES, QrPaletteId } from '../types';
import { CrossFadeQrCode } from './CrossFadeQrCode';
import { QrDiagnosticOverlay, QrDiagnosticData } from './QrDiagnosticOverlay';
import { RecentQrsSection } from './RecentQrsSection';
import { recentQrUtils, RecentQrRecord } from '../utils/recentQrUtils';

interface ShareGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameTitle?: string;
  roundName?: string;
}

export const ShareGameModal: React.FC<ShareGameModalProps> = ({
  isOpen,
  onClose,
  gameTitle = 'Beyond The Internet 2026',
  roundName
}) => {
  const { localLanguage } = useLanguage();

  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(true);
  const [qrPaletteId, setQrPaletteId] = useState<QrPaletteId>('purple_gold');
  const [isTransparentBg, setIsTransparentBg] = useState<boolean>(false);
  const [qrCustomCaption, setQrCustomCaption] = useState<string>('');
  const [estimatedScans, setEstimatedScans] = useState<number>(0);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [displayMode, setDisplayMode] = useState<'compact' | 'fullscreen'>('compact');
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);
  const [previewRecentQr, setPreviewRecentQr] = useState<RecentQrRecord | null>(null);
  const [diagnosticData, setDiagnosticData] = useState<QrDiagnosticData>({
    status: 'idle',
    errorCode: 'ERR_NONE',
    errorMessage: null,
    targetUrl: '',
    generationLatencyMs: null,
    errorCorrectionLevel: 'H',
    resolutionPx: 360,
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

  // Inactivity auto-close timer (60s default for broadcast protection)
  useEffect(() => {
    if (!isOpen) return;
    setSecondsRemaining(60);

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose]);

  // Reset inactivity timer on interaction
  const handleUserActivity = useCallback(() => {
    setSecondsRemaining(60);
  }, []);

  // Subscribe to real-time Firebase connection and state status
  useEffect(() => {
    const unsubConn = syncService.subscribeToConnection((connected) => {
      setIsFirebaseConnected(connected);
    });
    const unsubState = syncService.subscribeToState((state) => {
      if (state.qr_color_palette) {
        setQrPaletteId(state.qr_color_palette as QrPaletteId);
      }
      if (state.qr_transparent_bg !== undefined) {
        setIsTransparentBg(Boolean(state.qr_transparent_bg));
      }
      if (state.qr_custom_caption !== undefined) {
        setQrCustomCaption(state.qr_custom_caption);
      }
      if (state.qr_scan_count !== undefined) {
        setEstimatedScans(Number(state.qr_scan_count) || 0);
      }
    });
    return () => {
      unsubConn();
      unsubState();
    };
  }, []);

  // Diagnostic QR generator function with benchmark telemetry
  const runQrGenerationPass = useCallback((overrideMode?: 'compact' | 'fullscreen') => {
    if (typeof window === 'undefined' || !isOpen) return;

    const activeMode = overrideMode || displayMode;
    let url = window.location.origin + window.location.pathname;
    if (url.includes('ais-dev-')) {
      url = url.replace('ais-dev-', 'ais-pre-');
    }
    setShareUrl(url);

    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    const targetQrUrl = url + (url.includes('?') ? '&' : '?') + 'src=qr';
    const palette = QR_PALETTES[qrPaletteId] || QR_PALETTES.purple_gold;
    const qrWidth = activeMode === 'fullscreen' ? 600 : 360;
    const urlByteLen = new TextEncoder().encode(targetQrUrl).length;

    // QR version estimation (byte capacity with ECL Level H)
    let versionEst = 3;
    if (urlByteLen > 150) versionEst = 7;
    else if (urlByteLen > 100) versionEst = 5;
    else if (urlByteLen > 60) versionEst = 4;

    setIsGenerating(true);
    const startTime = performance.now();

    if (!targetQrUrl || targetQrUrl.trim() === '') {
      const errCode = 'ERR_PAYLOAD_EMPTY';
      setDiagnosticData({
        status: 'error',
        errorCode: errCode,
        errorMessage: 'Chuỗi địa chỉ URL đích rỗng hoặc không hợp lệ.',
        targetUrl: '',
        generationLatencyMs: 0,
        errorCorrectionLevel: 'H',
        resolutionPx: qrWidth,
        paletteId: qrPaletteId,
        paletteDarkHex: palette.dark,
        paletteLightHex: isTransparentBg ? '#00000000' : palette.light,
        isTransparent: isTransparentBg,
        isOnline,
        isFirebaseConnected,
        timestamp: Date.now(),
        urlByteLength: 0,
        qrVersionEstimate: versionEst
      });
      setIsGenerating(false);
      return;
    }

    QRCode.toDataURL(targetQrUrl, {
      width: qrWidth,
      margin: 2,
      color: {
        dark: palette.dark,
        light: isTransparentBg ? '#00000000' : palette.light
      },
      errorCorrectionLevel: 'H'
    })
      .then((dataUrl) => {
        const renderTime = Math.round(performance.now() - startTime);
        setQrDataUrl(dataUrl);
        recentQrUtils.saveRecentQr({
          url: targetQrUrl,
          dataUrl,
          caption: qrCustomCaption || roundName || gameTitle,
          roundName,
          paletteId: qrPaletteId,
          paletteName: palette.labelVi
        });
        setIsGenerating(false);
        setDiagnosticData({
          status: 'success',
          errorCode: 'ERR_NONE',
          errorMessage: null,
          targetUrl: targetQrUrl,
          generationLatencyMs: renderTime,
          errorCorrectionLevel: 'H',
          resolutionPx: qrWidth,
          paletteId: qrPaletteId,
          paletteDarkHex: palette.dark,
          paletteLightHex: isTransparentBg ? '#00000000' : palette.light,
          isTransparent: isTransparentBg,
          isOnline,
          isFirebaseConnected,
          timestamp: Date.now(),
          urlByteLength: urlByteLen,
          qrVersionEstimate: versionEst
        });
      })
      .catch((err: any) => {
        const renderTime = Math.round(performance.now() - startTime);
        console.error('Failed to generate QR code:', err);
        setIsGenerating(false);
        const errCode = !isOnline ? 'ERR_NETWORK_OFFLINE' : 'ERR_QR_RENDER_FAILED';
        setDiagnosticData({
          status: 'error',
          errorCode: errCode,
          errorMessage: err?.message || 'Lỗi xử lý render canvas mã QR.',
          targetUrl: targetQrUrl,
          generationLatencyMs: renderTime,
          errorCorrectionLevel: 'H',
          resolutionPx: qrWidth,
          paletteId: qrPaletteId,
          paletteDarkHex: palette.dark,
          paletteLightHex: isTransparentBg ? '#00000000' : palette.light,
          isTransparent: isTransparentBg,
          isOnline,
          isFirebaseConnected,
          timestamp: Date.now(),
          urlByteLength: urlByteLen,
          qrVersionEstimate: versionEst
        });
      });
  }, [isOpen, displayMode, qrPaletteId, isTransparentBg, isFirebaseConnected]);

  // Compute join URL and generate QR code
  useEffect(() => {
    runQrGenerationPass();
  }, [runQrGenerationPass]);

  // Handle escape key to close or 'f' to toggle fullscreen, 'd' for diagnostics
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        vibrateTap();
        if (showDiagnostics) {
          setShowDiagnostics(false);
        } else {
          onClose();
        }
      } else if ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Toggle compact / fullscreen mode
        e.preventDefault();
        vibrateTap();
        soundFx.playClick();
        setDisplayMode((prev) => (prev === 'compact' ? 'fullscreen' : 'compact'));
      } else if ((e.key === 'd' || e.key === 'D') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Toggle diagnostic overlay
        e.preventDefault();
        vibrateTap();
        soundFx.playClick();
        setShowDiagnostics((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, showDiagnostics]);

  const handleCopyLink = useCallback(async () => {
    const urlToCopy = previewRecentQr ? previewRecentQr.url : shareUrl;
    if (!urlToCopy) return;
    try {
      soundFx.playClick();
      vibrateCopy();
      await navigator.clipboard.writeText(urlToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Could not copy text: ', err);
    }
  }, [shareUrl, previewRecentQr]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.share) return;
    const urlToShare = previewRecentQr ? previewRecentQr.url : shareUrl;
    try {
      soundFx.playClick();
      vibrateShare();
      await navigator.share({
        title: gameTitle || 'BTI 2026 - Đấu Trường Trực Tiếp',
        text: `Tham gia trực tiếp đấu trường tương tác ${gameTitle || 'BTI 2026'} ngay bây giờ!`,
        url: urlToShare
      });
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Lỗi khi chia sẻ qua Web Share API:', err);
      }
    }
  }, [gameTitle, shareUrl, previewRecentQr]);

  const handleDownloadQr = useCallback(() => {
    const activeDataUrl = previewRecentQr?.dataUrl || qrDataUrl;
    if (!activeDataUrl) return;
    soundFx.playClick();
    vibrateSuccess();
    const link = document.createElement('a');
    link.href = activeDataUrl;
    link.download = `BTI2026_Join_QRCode_${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [qrDataUrl, previewRecentQr]);

  if (!isOpen) return null;

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const modalContent = (
    <div
      id="share-game-modal-overlay"
      className="fluent-dialog-overlay z-[999999] animate-fadeIn flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onMouseMove={handleUserActivity}
      onTouchStart={handleUserActivity}
      onClick={(e) => {
        handleUserActivity();
        if (e.target === e.currentTarget) {
          soundFx.playClick();
          vibrateTap();
          onClose();
        }
      }}
    >
      <div
        id="share-game-modal-content"
        className={`w-full bg-[#16062f] border border-[#F7CAC9]/30 rounded-[12px] p-4 sm:p-6 shadow-2xl shadow-purple-950/90 relative overflow-y-auto my-auto flex flex-col items-center select-none transition-all duration-300 ${
          displayMode === 'fullscreen'
            ? 'max-w-4xl min-h-[88vh] md:min-h-[92vh] justify-between p-6 sm:p-8'
            : 'max-w-md max-h-[90vh]'
        }`}
        onMouseMove={handleUserActivity}
        onTouchStart={handleUserActivity}
      >
        {/* Top Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-transparent via-[#F7CAC9] to-transparent pointer-events-none" />

        {/* Timeout Indicator, Diagnostic Toggle, FullScreen Toggle & Close Button */}
        <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5 z-10 flex-wrap sm:flex-nowrap justify-end">
          {/* Diagnostic Overlay Trigger */}
          <button
            id="btn-toggle-share-diagnostics"
            type="button"
            onClick={() => {
              vibrateTap();
              soundFx.playClick();
              setShowDiagnostics((prev) => !prev);
            }}
            className={`flex items-center gap-1 px-2 py-1 rounded-[4px] font-mono text-[11px] font-bold transition active:scale-95 cursor-pointer border ${
              showDiagnostics
                ? 'bg-sky-500 text-black border-sky-300 shadow-md shadow-sky-500/30 ring-1 ring-sky-300'
                : diagnosticData.status === 'error'
                ? 'bg-rose-500/25 text-rose-300 border-rose-500/50 animate-pulse'
                : 'bg-white/10 hover:bg-white/20 text-sky-300 border-sky-400/30'
            }`}
            title="Mở bảng kiểm tra chẩn đoán & trạng thái dịch vụ tạo QR (Phím D)"
          >
            <Activity className={`w-3.5 h-3.5 ${showDiagnostics ? 'text-black animate-pulse' : 'text-sky-300'}`} />
            <span className="hidden sm:inline">Chẩn Đoán (Phím D)</span>
            <span className="sm:hidden">Debug</span>
          </button>

          {/* Responsive Toggle Button: Compact vs Full Screen */}
          <button
            id="btn-toggle-share-display-mode"
            type="button"
            onClick={() => {
              vibrateTap();
              soundFx.playClick();
              setDisplayMode((prev) => (prev === 'compact' ? 'fullscreen' : 'compact'));
            }}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-[4px] font-mono text-[11px] font-bold transition active:scale-95 cursor-pointer border ${
              displayMode === 'fullscreen'
                ? 'bg-amber-500/25 text-amber-300 border-amber-400/50 shadow-sm'
                : 'bg-white/10 hover:bg-white/20 text-[#F7CAC9] border-[#F7CAC9]/30'
            }`}
            title={
              displayMode === 'fullscreen'
                ? (localLanguage === 'en' ? 'Switch to compact view (Key F)' : 'Chuyển về chế độ thu gọn (Compact - Phím F)')
                : (localLanguage === 'en' ? 'Switch to fullscreen projector view (Key F)' : 'Chuyển sang chế độ toàn màn hình máy chiếu (Full Screen - Phím F)')
            }
          >
            {displayMode === 'fullscreen' ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">{localLanguage === 'en' ? 'Compact' : 'Thu Gọn (Compact)'}</span>
                <span className="sm:hidden">{localLanguage === 'en' ? 'Compact' : 'Thu Gọn'}</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#F7CAC9]" />
                <span className="hidden sm:inline">{localLanguage === 'en' ? 'Fullscreen' : 'Toàn Màn Hình (Full Screen)'}</span>
                <span className="sm:hidden">{localLanguage === 'en' ? 'Fullscreen' : 'Toàn Màn Hình'}</span>
              </>
            )}
          </button>

          <div 
            id="badge-share-modal-timeout"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono font-bold border transition ${
              secondsRemaining <= 10
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-white/10 text-white/70 border-white/15'
            }`}
            title={localLanguage === 'en' ? `Auto-closing in ${secondsRemaining}s of inactivity` : `Tự động đóng sau ${secondsRemaining}s không hoạt động`}
          >
            <Clock className="w-3 h-3 text-[#F7CAC9]" />
            <span>{secondsRemaining}s</span>
          </div>

          <button
            id="btn-close-share-modal"
            type="button"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              onClose();
            }}
            className="w-7 h-7 rounded-[4px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
            aria-label={localLanguage === 'en' ? 'Close (ESC)' : 'Đóng (ESC)'}
            title={localLanguage === 'en' ? 'Close (Key ESC)' : 'Đóng (Phím ESC)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Header */}
        <div className="text-center mb-3 pr-6 pl-6 shrink-0">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[10px] font-mono font-bold uppercase tracking-widest bg-[#F7CAC9]/15 text-[#F7CAC9] border border-[#F7CAC9]/30 mb-1.5">
            <Radio className="w-3 h-3 animate-pulse text-[#F7CAC9]" />
            <span>
              {displayMode === 'fullscreen'
                ? (localLanguage === 'en' ? 'Fullscreen Broadcast Mode • Live' : 'Chế Độ Trình Chiếu Toàn Màn Hình • Live Broadcast')
                : (localLanguage === 'en' ? 'Invite Audience • Live Broadcast' : 'Mời Người Chơi • Live Broadcast')}
            </span>
          </div>
          <h3 className={`font-black tracking-tight text-white flex items-center justify-center gap-2 ${
            displayMode === 'fullscreen' ? 'text-xl sm:text-2xl md:text-3xl' : 'text-lg sm:text-xl'
          }`}>
            <span>{localLanguage === 'en' ? 'Scan Code to Join Arena' : 'Quét Mã Tham Gia Đấu Trường'}</span>
          </h3>
          {roundName && (
            <p className="text-xs sm:text-sm text-[#F7CAC9]/80 font-mono mt-0.5 truncate max-w-md mx-auto">
              {localLanguage === 'en' ? 'Round:' : 'Vòng thi:'} {roundName}
            </p>
          )}
        </div>

        {/* Replay Banner when viewing a Recent QR from localStorage */}
        {previewRecentQr && (
          <div 
            id="banner-share-modal-recent-qr-replay"
            className="w-full my-2 p-2.5 rounded-[4px] bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-center justify-between gap-2 text-left animate-fadeIn shrink-0"
          >
            <div className="min-w-0">
              <span className="text-[10px] uppercase font-bold text-amber-400 block tracking-wider">
                {localLanguage === 'en' ? 'Reviewing previous broadcast QR' : 'Đang xem lại mã từ lịch sử broadcast'}
              </span>
              <span className="font-bold truncate text-white block text-[11px]">
                {previewRecentQr.caption || previewRecentQr.roundName || previewRecentQr.url}
              </span>
            </div>
            <button
              type="button"
              id="btn-share-modal-return-live-qr"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                setPreviewRecentQr(null);
              }}
              className="px-2.5 py-1 rounded-[4px] bg-amber-500 hover:bg-amber-400 text-black font-bold text-[10px] shrink-0 transition active:scale-95 cursor-pointer shadow flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>{localLanguage === 'en' ? 'Live QR' : 'Về Mã Live'}</span>
            </button>
          </div>
        )}

        {/* QR Code Container */}
        <div className="relative group my-1 shrink-0 animate-qr-entrance">
          <div className={`p-3 sm:p-4 rounded-[4px] shadow-2xl border-2 border-[#F7CAC9]/40 relative transition-all duration-300 ${
            isTransparentBg
              ? 'bg-[linear-gradient(45deg,#242424_25%,transparent_25%),linear-gradient(-45deg,#242424_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#242424_75%),linear-gradient(-45deg,transparent_75%,#242424_75%)] bg-[size:16px_16px] bg-[#141414] ring-1 ring-emerald-400/30'
              : 'bg-white'
          }`}>
            <CrossFadeQrCode
              dataUrl={previewRecentQr ? (previewRecentQr.dataUrl || qrDataUrl) : qrDataUrl}
              alt="QR Code to Join Game"
              sizeClass={
                displayMode === 'fullscreen'
                  ? 'w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] lg:w-[420px] lg:h-[420px]'
                  : 'w-48 h-48 sm:w-56 sm:h-56'
              }
              loadingFallback={
                <div className={`${
                  displayMode === 'fullscreen'
                    ? 'w-64 h-64 sm:w-80 sm:h-80 md:w-[380px] md:h-[380px] lg:w-[420px] lg:h-[420px]'
                    : 'w-48 h-48 sm:w-56 sm:h-56'
                } flex flex-col items-center justify-center text-slate-800 gap-2`}>
                  <div className="w-8 h-8 border-4 border-[#F7CAC9] border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-mono font-bold">
                    {localLanguage === 'en' ? 'Generating QR...' : 'Đang tạo mã QR...'}
                  </span>
                </div>
              }
            />
          </div>
        </div>

        {/* Custom Short Caption below QR Code */}
        {qrCustomCaption && (
          <div 
            id="share-modal-custom-caption"
            className="my-1 px-3 py-1 rounded-[4px] bg-purple-950/80 border border-[#F7CAC9]/40 text-[#F7CAC9] font-mono font-bold text-xs tracking-wide text-center animate-fadeIn shadow-md inline-flex items-center gap-1.5 max-w-xs break-words"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0 animate-pulse" />
            <span className="truncate">{qrCustomCaption}</span>
          </div>
        )}

        {/* Realtime Firebase Connection & Estimated Scans Status Badges */}
        <div className="flex items-center justify-center gap-2 flex-wrap my-1.5 shrink-0">
          <div 
            id="badge-share-modal-scans"
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-950/40"
            title={localLanguage === 'en' ? 'Total audience scans joining the arena' : 'Tổng số lượt khán giả quét mã QR tham gia đấu trường'}
          >
            <ScanLine className="w-3 h-3 text-sky-400" />
            <span>
              {localLanguage === 'en' ? 'Estimated scans:' : 'Ước tính quét:'} <strong className="text-white font-bold">{estimatedScans}</strong> {localLanguage === 'en' ? 'scans' : 'lượt'}
            </span>
          </div>

          {isFirebaseConnected ? (
            <div 
              id="badge-share-modal-firebase-online"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shadow-sm shadow-emerald-950/40"
              title={localLanguage === 'en' ? 'Live arena is online and real-time sync is active' : 'Đấu trường trực tuyến và đồng bộ dữ liệu thời gian thực đang hoạt động ổn định'}
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
              </span>
              <span>{localLanguage === 'en' ? 'Firebase: Online' : 'Firebase: Trực Tuyến'}</span>
            </div>
          ) : (
            <div 
              id="badge-share-modal-firebase-offline"
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[4px] text-[11px] font-mono font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950/40"
              title={localLanguage === 'en' ? 'Reconnecting with Firebase server...' : 'Đang kết nối lại với máy chủ Firebase...'}
            >
              <span className="inline-flex rounded-full h-2 w-2 bg-rose-500 animate-pulse"></span>
              <span>{localLanguage === 'en' ? 'Firebase: Offline' : 'Firebase: Ngoại Tuyến'}</span>
            </div>
          )}
        </div>

        {/* Quick Instructions */}
        <div className="w-full fluent-box-nested border border-white/10 rounded-[4px] p-2.5 sm:p-3 my-2.5 text-left text-xs space-y-1 shrink-0">
          <div className="flex items-center gap-2 text-[#F7CAC9] font-bold">
            <Smartphone className="w-3.5 h-3.5 text-[#F7CAC9] shrink-0" />
            <span>{localLanguage === 'en' ? 'Instructions for new audience:' : 'Hướng dẫn cho khán giả mới:'}</span>
          </div>
          <ol className="text-[11px] text-white/70 space-y-0.5 pl-5 list-decimal leading-relaxed font-sans">
            <li>{localLanguage === 'en' ? 'Open Phone Camera or Scanner app to scan the QR code.' : 'Mở Camera điện thoại hoặc Zalo để quét mã QR.'}</li>
            <li>{localLanguage === 'en' ? 'Enter your Name & Student ID to receive a personal identifier.' : 'Nhập Họ tên & MSSV để nhận mã định danh cá nhân.'}</li>
            <li>{localLanguage === 'en' ? 'Start voting and interacting live with the MC!' : 'Bắt đầu bình chọn và tương tác trực tiếp cùng MC!'}</li>
          </ol>
        </div>

        {/* URL Box & Actions */}
        <div className="w-full space-y-2 shrink-0">
          {/* Link Box */}
          <div className="flex items-center gap-2 p-1.5 rounded-[4px] bg-black/40 border border-white/15">
            <div className="flex-1 min-w-0 px-2 font-mono text-xs text-sky-300 truncate select-all">
              {previewRecentQr ? previewRecentQr.url : shareUrl}
            </div>
            <button
              id="btn-copy-game-url"
              type="button"
              onClick={handleCopyLink}
              className={`px-3 py-1.5 rounded-[4px] text-xs font-bold font-mono transition active:scale-95 flex items-center gap-1.5 shrink-0 cursor-pointer ${
                copied
                  ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                  : 'bg-white/10 hover:bg-white/20 text-[#F7CAC9] border border-[#F7CAC9]/30'
              }`}
              title={localLanguage === 'en' ? 'Copy link to clipboard' : 'Sao chép liên kết vào bộ nhớ tạm'}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{localLanguage === 'en' ? 'Copied!' : 'Đã chép!'}</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy URL</span>
                </>
              )}
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 pt-0.5">
            {canNativeShare && (
              <button
                id="btn-native-share"
                type="button"
                onClick={handleNativeShare}
                className="w-full py-2.5 px-3 rounded-[4px] bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-sky-500/25 transition active:scale-95 cursor-pointer"
                title={localLanguage === 'en' ? 'Share via system apps' : 'Chia sẻ link qua các ứng dụng hệ thống trên thiết bị di động'}
              >
                <Share2 className="w-4 h-4 text-white shrink-0" />
                <span>{localLanguage === 'en' ? 'Share via App (SMS / AirDrop)' : 'Chia sẻ qua ứng dụng (Zalo / SMS / AirDrop)'}</span>
              </button>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                id="btn-copy-url-primary"
                type="button"
                onClick={handleCopyLink}
                className={`py-2.5 px-3 rounded-[4px] font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition active:scale-95 cursor-pointer ${
                  copied
                    ? 'bg-emerald-500 text-black shadow-emerald-500/30'
                    : 'bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839]'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>{localLanguage === 'en' ? 'Copied!' : 'Đã sao chép!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>{localLanguage === 'en' ? 'Copy Audience URL' : 'Copy URL Khán Giả'}</span>
                  </>
                )}
              </button>

              <button
                id="btn-download-qr"
                type="button"
                onClick={handleDownloadQr}
                disabled={!qrDataUrl}
                className="py-2.5 px-3 rounded-[4px] bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-white/10 transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>{localLanguage === 'en' ? 'Download QR' : 'Tải ảnh QR'}</span>
              </button>
            </div>
          </div>

          {/* Recent QRs Section (localStorage) */}
          <RecentQrsSection
            onSelectQr={(qr) => setPreviewRecentQr(qr)}
            selectedQrId={previewRecentQr?.id}
            className="w-full mt-2"
          />
        </div>

        {/* Diagnostic Overlay for QR Generator Telemetry & Debugging */}
        <QrDiagnosticOverlay
          isOpen={showDiagnostics}
          onClose={() => setShowDiagnostics(false)}
          data={diagnosticData}
          onRetest={() => runQrGenerationPass()}
        />
      </div>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(modalContent, document.body);
};
