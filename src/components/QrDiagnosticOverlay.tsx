import React, { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Terminal,
  RefreshCw,
  Copy,
  Check,
  Wifi,
  WifiOff,
  Server,
  Cpu,
  Layers,
  ShieldCheck,
  Bug,
  Info,
  X,
  Clock,
  Sparkles
} from 'lucide-react';
import { vibrateCopy, vibrateTap } from '../utils/hapticUtils';
import { soundFx } from '../services/audioEffects';

export interface QrDiagnosticData {
  status: 'idle' | 'generating' | 'success' | 'error';
  errorCode: string; // e.g. 'ERR_NONE', 'ERR_EMPTY_URL', 'ERR_QR_RENDER_FAILED', 'ERR_OFFLINE'
  errorMessage?: string | null;
  targetUrl: string;
  generationLatencyMs: number | null;
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  resolutionPx: number;
  paletteId: string;
  paletteDarkHex: string;
  paletteLightHex: string;
  isTransparent: boolean;
  isOnline: boolean;
  isFirebaseConnected: boolean;
  timestamp: number;
  urlByteLength: number;
  qrVersionEstimate: number; // 1-40
}

interface QrDiagnosticOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  data: QrDiagnosticData;
  onRetest?: () => void;
}

export const QrDiagnosticOverlay: React.FC<QrDiagnosticOverlayProps> = ({
  isOpen,
  onClose,
  data,
  onRetest
}) => {
  const [copiedLog, setCopiedLog] = useState(false);
  const [isRetesting, setIsRetesting] = useState(false);

  if (!isOpen) return null;

  const handleCopyDiagnostics = () => {
    soundFx.playClick();
    vibrateCopy();
    const logJson = JSON.stringify(
      {
        timestampIso: new Date(data.timestamp).toISOString(),
        service: 'BTI-2026-QR-Engine',
        environment: typeof window !== 'undefined' ? window.location.hostname : 'unknown',
        diagnostics: data,
        browserAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
        screenResolution: typeof window !== 'undefined' ? `${window.innerWidth}x${window.innerHeight}` : 'unknown'
      },
      null,
      2
    );
    navigator.clipboard.writeText(logJson).then(() => {
      setCopiedLog(true);
      setTimeout(() => setCopiedLog(false), 2200);
    });
  };

  const handleTriggerRetest = () => {
    if (onRetest) {
      soundFx.playClick();
      vibrateTap();
      setIsRetesting(true);
      onRetest();
      setTimeout(() => setIsRetesting(false), 600);
    }
  };

  const isHealthy = data.status === 'success' && data.errorCode === 'ERR_NONE' && data.isOnline;

  return (
    <div
      id="qr-diagnostic-overlay"
      className="absolute inset-0 bg-[#0c0418]/95 backdrop-blur-md rounded-[10px] z-50 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto animate-fadeIn select-none border-2 border-sky-400/40 text-left font-sans"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-[4px] ${isHealthy ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-black font-mono tracking-wide text-white uppercase flex items-center gap-1.5">
              <span>QR Service Diagnostic Telemetry</span>
              <span className="px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 text-[10px] font-mono">v2.6</span>
            </h4>
            <p className="text-[10px] text-white/60 font-mono">Real-time generator pipeline & network monitor</p>
          </div>
        </div>

        <button
          id="btn-close-qr-diagnostics"
          type="button"
          onClick={() => {
            soundFx.playClick();
            vibrateTap();
            onClose();
          }}
          className="w-7 h-7 rounded-[4px] bg-white/10 hover:bg-white/20 text-white/70 hover:text-white flex items-center justify-center transition cursor-pointer"
          title="Đóng bảng chẩn đoán (ESC)"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Diagnostic Body */}
      <div className="flex-1 space-y-3 overflow-y-auto pr-1 text-xs">
        {/* Status & Error Code Banner */}
        <div
          id="diagnostic-status-banner"
          className={`p-3 rounded-[6px] border flex items-start justify-between gap-3 ${
            isHealthy
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/50 border-rose-500/50 text-rose-200'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {isHealthy ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-bold text-xs flex items-center gap-2">
                <span>Trạng thái dịch vụ:</span>
                <span className="font-mono uppercase font-black px-1.5 py-0.5 rounded bg-black/40 text-white">
                  {data.status.toUpperCase()}
                </span>
              </div>
              <div className="text-[11px] font-mono mt-0.5 flex items-center gap-1.5">
                <span className="text-white/70">Mã lỗi (Error Code):</span>
                <span
                  className={`font-black px-1.5 py-0.5 rounded ${
                    data.errorCode === 'ERR_NONE'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : 'bg-rose-500/30 text-rose-300 animate-pulse'
                  }`}
                >
                  {data.errorCode}
                </span>
              </div>
              {data.errorMessage && (
                <p className="text-[11px] text-rose-300 mt-1 italic border-t border-rose-500/20 pt-1 font-mono">
                  {data.errorMessage}
                </p>
              )}
            </div>
          </div>

          <div className="text-right font-mono text-[10px] shrink-0">
            <span className="text-white/50 block">Render Latency</span>
            <span className="text-sky-300 font-bold text-xs">
              {data.generationLatencyMs !== null ? `${data.generationLatencyMs}ms` : '—'}
            </span>
          </div>
        </div>

        {/* Connectivity & Services Matrix */}
        <div className="grid grid-cols-2 gap-2">
          {/* Internet Connectivity */}
          <div className="p-2.5 rounded-[6px] bg-black/30 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {data.isOnline ? (
                <Wifi className="w-4 h-4 text-emerald-400" />
              ) : (
                <WifiOff className="w-4 h-4 text-rose-400" />
              )}
              <div>
                <span className="block text-[10px] text-white/50">Trình duyệt / Mạng</span>
                <span className="font-bold text-[11px] text-white">
                  {data.isOnline ? 'Online (Đã kết nối)' : 'Offline (Mất mạng)'}
                </span>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                data.isOnline ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-rose-500'
              }`}
            />
          </div>

          {/* Firebase Realtime Sync */}
          <div className="p-2.5 rounded-[6px] bg-black/30 border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-sky-400" />
              <div>
                <span className="block text-[10px] text-white/50">Firebase Sync</span>
                <span className="font-bold text-[11px] text-white">
                  {data.isFirebaseConnected ? 'Connected (Đồng bộ)' : 'Connecting...'}
                </span>
              </div>
            </div>
            <span
              className={`w-2 h-2 rounded-full ${
                data.isFirebaseConnected ? 'bg-sky-400 shadow-[0_0_8px_#38bdf8]' : 'bg-amber-400 animate-ping'
              }`}
            />
          </div>
        </div>

        {/* Technical Specs Bento Grid */}
        <div className="fluent-box-nested p-3 rounded-[6px] border border-white/10 space-y-2">
          <div className="text-[11px] font-mono font-bold text-sky-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-1">
            <Cpu className="w-3.5 h-3.5 text-sky-400" />
            <span>Thông Số Kỹ Thuật Mã Hóa QR (Encoding Specs)</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono">
            <div className="p-1.5 rounded bg-black/20">
              <span className="text-white/50 block text-[9px]">Error Correction (ECL)</span>
              <span className="font-bold text-amber-300">Level {data.errorCorrectionLevel} (30% phục hồi)</span>
            </div>

            <div className="p-1.5 rounded bg-black/20">
              <span className="text-white/50 block text-[9px]">Độ Phân Giải Canvas</span>
              <span className="font-bold text-sky-300">{data.resolutionPx} × {data.resolutionPx} px</span>
            </div>

            <div className="p-1.5 rounded bg-black/20">
              <span className="text-white/50 block text-[9px]">Dung Lượng Payload</span>
              <span className="font-bold text-white">{data.urlByteLength} Bytes ({data.targetUrl.length} chars)</span>
            </div>

            <div className="p-1.5 rounded bg-black/20">
              <span className="text-white/50 block text-[9px]">QR Version Ước Tính</span>
              <span className="font-bold text-emerald-300">Version {data.qrVersionEstimate} (Byte Mode)</span>
            </div>

            <div className="p-1.5 rounded bg-black/20">
              <span className="text-white/50 block text-[9px]">Bảng Màu (Palette)</span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className="w-3 h-3 rounded-[2px] border border-white/30"
                  style={{ backgroundColor: data.paletteDarkHex }}
                  title={`Dark: ${data.paletteDarkHex}`}
                />
                <span
                  className="w-3 h-3 rounded-[2px] border border-white/30"
                  style={{ backgroundColor: data.paletteLightHex }}
                  title={`Light: ${data.paletteLightHex}`}
                />
                <span className="text-white/80 text-[10px] truncate">{data.paletteId}</span>
              </div>
            </div>

            <div className="p-1.5 rounded bg-black/20">
              <span className="text-white/50 block text-[9px]">Nền Trong Suốt (Alpha)</span>
              <span className={`font-bold ${data.isTransparent ? 'text-emerald-300' : 'text-white/70'}`}>
                {data.isTransparent ? 'Kích Hoạt (Transparent)' : 'Không (Opaque)'}
              </span>
            </div>
          </div>

          {/* Raw Payload Inspection */}
          <div className="mt-2 pt-1 border-t border-white/10">
            <span className="text-[10px] text-white/50 font-mono block mb-1">Target Payload URL:</span>
            <div className="p-2 rounded bg-black/50 border border-white/10 font-mono text-[10px] text-sky-200 break-all select-all max-h-16 overflow-y-auto">
              {data.targetUrl}
            </div>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-between gap-2 pt-3 mt-2 border-t border-white/10 shrink-0">
        <div className="text-[10px] text-white/50 font-mono flex items-center gap-1">
          <Clock className="w-3 h-3 text-sky-400" />
          <span>Last Pass: {new Date(data.timestamp).toLocaleTimeString('vi-VN')}</span>
        </div>

        <div className="flex items-center gap-2">
          {onRetest && (
            <button
              id="btn-retest-qr-generator"
              type="button"
              onClick={handleTriggerRetest}
              disabled={isRetesting}
              className="px-2.5 py-1.5 rounded-[4px] bg-white/10 hover:bg-white/20 text-white font-mono text-[11px] font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="Chạy lại chu trình tạo mã QR để kiểm tra độ trễ và lỗi"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-sky-300 ${isRetesting ? 'animate-spin' : ''}`} />
              <span>Chạy Thử (Re-test)</span>
            </button>
          )}

          <button
            id="btn-copy-diagnostic-log"
            type="button"
            onClick={handleCopyDiagnostics}
            className={`px-3 py-1.5 rounded-[4px] font-mono text-[11px] font-bold transition active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              copiedLog
                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/20'
                : 'bg-sky-500 hover:bg-sky-400 text-white shadow-md shadow-sky-500/20'
            }`}
            title="Sao chép toàn bộ bản ghi chẩn đoán dưới định dạng JSON"
          >
            {copiedLog ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Đã Chép Log!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Log JSON</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
