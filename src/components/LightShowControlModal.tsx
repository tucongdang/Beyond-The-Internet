import React, { useState } from 'react';
import { X, Sparkles, Flame, Heart, Zap, Rainbow, Play, Square, Clock, Gauge } from 'lucide-react';
import { syncService } from '../services/syncService';
import { AudienceLightShowState, LightShowPattern, LightShowSpeed, GameState } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateSuccess, vibrateWarning } from '../utils/hapticUtils';

interface LightShowControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
}

export const LightShowControlModal: React.FC<LightShowControlModalProps> = ({
  isOpen,
  onClose,
  gameState
}) => {
  const currentShow = gameState.audience_light_show;
  const isCurrentlyActive = Boolean(currentShow?.active);

  const [pattern, setPattern] = useState<LightShowPattern>(currentShow?.pattern || 'COSMIC_PULSE');
  const [speed, setSpeed] = useState<LightShowSpeed>(currentShow?.speed || 'NORMAL');
  const [message, setMessage] = useState<string>(currentShow?.message || 'GIƠ CAO ĐIỆN THOẠI HƯỚNG VỀ SÂN KHẤU!');
  const [duration, setDuration] = useState<number>(currentShow?.auto_dismiss_seconds ?? 30);

  if (!isOpen) return null;

  const handleStartLightShow = () => {
    soundFx.playStartRound();
    vibrateSuccess();

    const payload: AudienceLightShowState = {
      active: true,
      pattern,
      speed,
      message: message.trim() || 'GIƠ CAO ĐIỆN THOẠI HƯỚNG VỀ SÂN KHẤU!',
      timestamp: Date.now(),
      auto_dismiss_seconds: duration > 0 ? duration : undefined
    };

    syncService.updateGameState({
      audience_light_show: payload
    });
  };

  const handleStopLightShow = () => {
    soundFx.playLock();
    vibrateWarning();

    syncService.updateGameState({
      audience_light_show: null
    });
  };

  const patternsConfig: Array<{ id: LightShowPattern; label: string; icon: any; color: string; desc: string }> = [
    { id: 'COSMIC_PULSE', label: 'Cosmic Twilight', icon: Sparkles, color: 'from-purple-600 to-pink-600', desc: 'Tím Horizon nhịp đập vũ trụ' },
    { id: 'GOLDEN_CHAMPION', label: 'Golden Champion', icon: Flame, color: 'from-amber-500 to-yellow-400', desc: 'Sắc vàng hoàng kim vinh quang' },
    { id: 'NEON_STROBE', label: 'Cyber Strobe', icon: Zap, color: 'from-cyan-500 to-fuchsia-600', desc: 'Nhấp nháy cao trào sôi động' },
    { id: 'RAINBOW_WAVE', label: 'Rainbow Wave', icon: Rainbow, color: 'from-emerald-400 via-sky-400 to-purple-500', desc: 'Lượn sóng dải sắc cầu vồng' },
    { id: 'HEARTBEAT_RED', label: 'Heartbeat Red', icon: Heart, color: 'from-rose-600 to-red-800', desc: 'Đỏ nhịp tim hồi hộp đếm ngược' }
  ];

  const presetMessages = [
    'GIƠ CAO ĐIỆN THOẠI HƯỚNG VỀ SÂN KHẤU!',
    'CHÀO ĐÓN NHÀ VÔ ĐỊCH BEYOND THE INTERNET 2026!',
    'ĐẾM NGƯỢC THỜI KHẮC ĐỈNH CAO!',
    'HỘI TRƯỜNG CÙNG HÒA NHỊP VỚI SÂN KHẤU!'
  ];

  return (
    <div className="fluent-dialog-overlay animate-fadeIn z-[9999] flex items-center justify-center p-4">
      <div className="fluent-box border border-white/20 rounded-[4px] p-6 max-w-xl w-full text-white shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[2px] bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-white animate-spin" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-wider font-mono">
                AUDIENCE LIGHT SHOW CONTROL
              </h2>
              <p className="text-white/60 text-xs mt-0.5">
                Điều khiển đồng bộ biến màn hình điện thoại cả khán phòng thành biển ánh sáng.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-[2px] hover:bg-white/10 text-white/60 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Indicator */}
        <div className={`p-3.5 rounded-[2px] border flex items-center justify-between ${
          isCurrentlyActive
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-200 animate-pulse'
            : 'bg-white/5 border-white/10 text-white/60'
        }`}>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${isCurrentlyActive ? 'bg-emerald-400 animate-ping' : 'bg-white/30'}`} />
            <span>Trạng thái: <strong>{isCurrentlyActive ? 'ĐANG PHÁT SÁNG TRÊN MÁY KHÁN GIẢ' : 'ĐANG TẮT'}</strong></span>
          </div>
          {isCurrentlyActive && (
            <button
              type="button"
              onClick={handleStopLightShow}
              className="px-3 py-1 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white font-mono text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>DỪNG NGAY</span>
            </button>
          )}
        </div>

        {/* Patterns Selector */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>1. Chọn Hiệu Ứng Sắc Màu (Pattern)</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {patternsConfig.map((item) => {
              const Icon = item.icon;
              const isSelected = pattern === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setPattern(item.id);
                    soundFx.playClick();
                    vibrateTap();
                  }}
                  className={`p-3 rounded-[2px] border text-left transition flex items-start gap-3 cursor-pointer ${
                    isSelected
                      ? 'bg-white/15 border-purple-400 shadow-md ring-1 ring-purple-400'
                      : 'fluent-box-nested border-white/10 hover:border-white/30'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-[2px] bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 shadow`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-bold text-xs text-white font-mono">{item.label}</div>
                    <div className="text-[11px] text-white/60 truncate mt-0.5">{item.desc}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Speed Selector */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
            <Gauge className="w-4 h-4 text-sky-400" />
            <span>2. Tốc Độ Nhịp Đập (Speed)</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(['SLOW', 'NORMAL', 'FAST', 'HYPER'] as LightShowSpeed[]).map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => {
                  setSpeed(spd);
                  soundFx.playClick();
                  vibrateTap();
                }}
                className={`py-2 px-1 rounded-[2px] font-mono text-xs font-bold transition border cursor-pointer ${
                  speed === spd
                    ? 'bg-sky-500 text-slate-950 border-sky-400 font-black shadow'
                    : 'fluent-box-nested text-white/70 border-white/10 hover:text-white'
                }`}
              >
                {spd}
              </button>
            ))}
          </div>
        </div>

        {/* Message Input & Presets */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider">
            3. Thông Điệp Hiện Trên Điện Thoại Khán Giả
          </label>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="GIƠ CAO ĐIỆN THOẠI HƯỚNG VỀ SÂN KHẤU!"
            className="w-full text-xs font-mono bg-black/40 border border-white/20 rounded-[2px] px-3 py-2 text-white placeholder-white/40 focus:outline-none focus:border-purple-400"
          />
          <div className="flex flex-wrap gap-1.5 pt-1">
            {presetMessages.map((pm, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setMessage(pm)}
                className="text-[10px] font-mono bg-white/5 hover:bg-white/15 px-2 py-1 rounded-[2px] border border-white/10 text-white/70 hover:text-white transition cursor-pointer"
              >
                + {pm.slice(0, 24)}...
              </button>
            ))}
          </div>
        </div>

        {/* Auto Dismiss Timer */}
        <div className="space-y-2">
          <label className="text-xs font-mono font-bold text-white/80 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400" />
            <span>4. Tự Động Tắt Sau (Hẹn Giờ)</span>
          </label>
          <div className="grid grid-cols-4 gap-2">
            {[
              { val: 15, label: '15 Giây' },
              { val: 30, label: '30 Giây' },
              { val: 60, label: '1 Phút' },
              { val: 0, label: 'Thủ công' }
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => {
                  setDuration(opt.val);
                  soundFx.playClick();
                }}
                className={`py-1.5 px-2 rounded-[2px] font-mono text-xs font-bold transition border cursor-pointer ${
                  duration === opt.val
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-black'
                    : 'fluent-box-nested text-white/70 border-white/10 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-[2px] fluent-box-nested hover:bg-white/15 text-white/80 text-xs font-bold font-mono transition cursor-pointer"
          >
            Đóng
          </button>
          {isCurrentlyActive ? (
            <button
              type="button"
              onClick={handleStopLightShow}
              className="px-5 py-2 rounded-[2px] bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
              <span>TẮT BIỂN ÁNH SÁNG</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartLightShow}
              className="px-5 py-2 rounded-[2px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-bold font-mono transition shadow-lg flex items-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>✨ KÍCH HOẠT BIỂN ÁNH SÁNG</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
