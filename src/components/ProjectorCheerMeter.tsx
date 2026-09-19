import React, { useState, useEffect, useRef } from 'react';
import { Heart, Flame, Zap, Sparkles, Activity, Users, Radio, Maximize2, Minimize2, Award, Volume2, VolumeX } from 'lucide-react';
import { cheerService } from '../services/cheerService';
import { CheerIntensityData, CheerEvent } from '../types';
import { soundFx } from '../services/audioEffects';

interface ProjectorCheerMeterProps {
  className?: string;
  theme?: string;
}

interface FloatingParticle {
  id: string;
  type: string;
  text: string;
  x: number; // percentage 0 - 100
  size: number;
  duration: number;
  color: string;
}

const CHEER_EMOJIS: Record<string, string> = {
  HEART: '❤️',
  FIRE: '🔥',
  ENERGY: '⚡',
  CLAP: '👏',
  STAR: '⭐'
};

export const ProjectorCheerMeter: React.FC<ProjectorCheerMeterProps> = ({ className = '', theme }) => {
  const [data, setData] = useState<CheerIntensityData>(cheerService.getCurrentIntensityData());
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(false);
  const miniCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const expandedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const prevEventIdsRef = useRef<Set<string>>(new Set());
  const heartbeatAudioTimerRef = useRef<any>(null);

  // Subscribe to cheer service
  useEffect(() => {
    const unsubscribe = cheerService.subscribe((newData) => {
      setData(newData);

      // Check for newly arrived events to spawn floating particles
      newData.recentEvents.forEach((ev) => {
        if (!prevEventIdsRef.current.has(ev.id)) {
          prevEventIdsRef.current.add(ev.id);
          // Limit memory size of tracked IDs
          if (prevEventIdsRef.current.size > 200) {
            prevEventIdsRef.current.clear();
          }
          spawnParticle(ev);
        }
      });
    });

    return () => unsubscribe();
  }, []);

  // Keyboard shortcut 'C' to toggle cheer meter expand
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if ((e.key === 'c' || e.key === 'C') && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setIsExpanded(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sound heartbeat pulse if sound enabled and crowd is active (>35% intensity)
  useEffect(() => {
    if (!soundEnabled || data.intensity < 35) {
      if (heartbeatAudioTimerRef.current) clearInterval(heartbeatAudioTimerRef.current);
      return;
    }

    const intervalMs = Math.round((60 / data.bpm) * 1000);
    heartbeatAudioTimerRef.current = setInterval(() => {
      soundFx.playHeartbeat(data.intensity / 100);
    }, intervalMs);

    return () => {
      if (heartbeatAudioTimerRef.current) clearInterval(heartbeatAudioTimerRef.current);
    };
  }, [soundEnabled, data.bpm, data.intensity]);

  const spawnParticle = (ev: CheerEvent) => {
    const emoji = CHEER_EMOJIS[ev.type] || '❤️';
    const comboBadge = ev.combo > 1 ? ` x${ev.combo}` : '';
    const label = ev.name && ev.name !== 'Khán giả ẩn danh' ? `${ev.name.split(' ').pop()}: ${emoji}${comboBadge}` : `${emoji}${comboBadge}`;

    const newParticle: FloatingParticle = {
      id: `p_${Date.now()}_${Math.random()}`,
      type: ev.type,
      text: label,
      x: 10 + Math.random() * 80, // Random X spread
      size: 16 + Math.min(20, ev.count * 3 + (ev.combo > 5 ? 6 : 0)),
      duration: 2.5 + Math.random() * 1.5,
      color: ev.type === 'FIRE' ? '#f97316' : ev.type === 'ENERGY' ? '#38bdf8' : ev.type === 'STAR' ? '#facc15' : '#f43f5e'
    };

    setParticles(prev => [...prev.slice(-25), newParticle]);
  };

  // Clean up finished particles
  useEffect(() => {
    if (particles.length === 0) return;
    const timer = setTimeout(() => {
      setParticles(prev => prev.filter(p => Date.now() - parseInt(p.id.split('_')[1] || '0', 10) < 4000));
    }, 1000);
    return () => clearTimeout(timer);
  }, [particles]);

  // Dynamic EKG Heartbeat waveform canvas rendering
  useEffect(() => {
    let animationFrameId: number;
    let phase = 0;

    const drawEkg = (canvas: HTMLCanvasElement | null) => {
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      const midY = height / 2;

      // Draw subtle grid lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 20) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Draw EKG line
      ctx.beginPath();
      ctx.lineWidth = 2.5;

      // Glow effect based on intensity
      ctx.shadowBlur = Math.min(25, 6 + (data.intensity / 100) * 18);
      ctx.shadowColor = data.colorHex;
      ctx.strokeStyle = data.colorHex;

      for (let x = 0; x < width; x += 2) {
        const normalizedX = (x / width) * 8 + phase;
        const cycle = normalizedX % (Math.PI * 2);

        let yOffset = 0;
        // P-wave
        if (cycle > 1.0 && cycle < 1.4) {
          yOffset = -Math.sin(((cycle - 1.0) / 0.4) * Math.PI) * 4;
        }
        // QRS complex (Heart spike)
        else if (cycle >= 1.7 && cycle <= 2.1) {
          const qrsPos = (cycle - 1.7) / 0.4;
          if (qrsPos < 0.25) {
            yOffset = 5; // Q dip
          } else if (qrsPos < 0.65) {
            // R spike scaled with crowd intensity
            const spikeAmp = 14 + (data.intensity / 100) * 18;
            yOffset = -spikeAmp;
          } else {
            yOffset = 8; // S dip
          }
        }
        // T-wave
        else if (cycle > 2.4 && cycle < 3.0) {
          yOffset = -Math.sin(((cycle - 2.4) / 0.6) * Math.PI) * 6;
        }

        const y = midY + yOffset;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      ctx.shadowBlur = 0; // Reset shadow
    };

    const render = () => {
      const speed = (data.bpm / 60) * 0.05;
      phase += speed;

      drawEkg(miniCanvasRef.current);
      drawEkg(expandedCanvasRef.current);

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [data.bpm, data.intensity, data.colorHex]);

  // Pulse rate style for CSS animation
  const pulseDurationSec = Math.max(0.35, 60 / data.bpm);

  return (
    <div
      id="bti-projector-cheer-meter"
      className={`relative select-none transition-all duration-300 ${className}`}
    >
      {/* Floating live cheer particles layer */}
      <div className="fixed inset-0 pointer-events-none z-[120] overflow-hidden">
        {particles.map((p) => (
          <div
            key={p.id}
            className="absolute font-black tracking-wide drop-shadow-[0_0_12px_rgba(0,0,0,0.8)] animate-float-up flex items-center gap-1.5"
            style={{
              left: `${p.x}%`,
              bottom: '80px',
              fontSize: `${p.size}px`,
              color: p.color,
              animationDuration: `${p.duration}s`,
              animationTimingFunction: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          >
            <span className="bg-black/50 backdrop-blur-[24px] saturate-150/60 backdrop-blur-md px-2.5 py-1 rounded-[4px] border border-white/20 text-xs sm:text-sm font-mono text-white shadow-xl flex items-center gap-1">
              {p.text}
            </span>
          </div>
        ))}
      </div>

      {/* Main Meter Container */}
      <div
        className={`rounded-[4px] border transition-all duration-300 overflow-hidden backdrop-blur-xl ${
          isExpanded
            ? 'p-4 sm:p-5 bg-[#120726]/95 border-rose-500/40 shadow-[0_0_40px_rgba(244,63,94,0.3)]'
            : 'p-2.5 sm:p-3 bg-[#160a2e]/90 backdrop-blur-md border-white/15 hover:border-rose-400/40 shadow-xl'
        }`}
        style={{
          boxShadow: data.intensity > 50
            ? `0 10px 30px -10px ${data.colorHex}40, 0 0 20px ${data.colorHex}20`
            : undefined
        }}
      >
        {/* Compact Bar Mode */}
        <div className="flex items-center justify-between gap-3">
          {/* Pulsating Heart Core */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative flex items-center justify-center">
              {/* Outer pulsing energy ripple */}
              <div
                className="absolute inset-0 rounded-[4px] opacity-75 animate-ping"
                style={{
                  backgroundColor: data.colorHex,
                  animationDuration: `${pulseDurationSec * 1.5}s`,
                  opacity: Math.max(0.15, (data.intensity / 100) * 0.4)
                }}
              />
              {/* Core Icon Box */}
              <div
                className="w-9 h-9 sm:w-11 sm:h-11 rounded-[4px] flex items-center justify-center border relative z-10 transition-transform duration-100"
                style={{
                  backgroundColor: `${data.colorHex}20`,
                  borderColor: `${data.colorHex}60`,
                  color: data.colorHex,
                  transform: `scale(${1 + (data.intensity / 100) * 0.15})`
                }}
              >
                {data.intensity > 70 ? (
                  <Flame
                    className="w-5 h-5 sm:w-6 sm:h-6 fill-current animate-bounce"
                    style={{ animationDuration: `${pulseDurationSec}s` }}
                  />
                ) : (
                  <Heart
                    className="w-5 h-5 sm:w-6 sm:h-6 fill-current animate-pulse"
                    style={{ animationDuration: `${pulseDurationSec}s` }}
                  />
                )}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                  Audience Cheer
                  <span
                    className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold tracking-tight uppercase"
                    style={{
                      backgroundColor: `${data.colorHex}25`,
                      color: data.colorHex,
                      border: `1px solid ${data.colorHex}50`
                    }}
                  >
                    {data.levelTitle.split('•')[0].trim()}
                  </span>
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] sm:text-xs text-white/70 font-mono mt-0.5">
                <span className="flex items-center gap-1 text-rose-300 font-bold">
                  <Activity className="w-3.5 h-3.5 text-rose-400" />
                  {data.bpm} <span className="text-[9px] text-white/50">BPM</span>
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-amber-300 font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  {data.totalCheers.toLocaleString('vi-VN')} <span className="text-[9px] text-white/50">LƯỢT</span>
                </span>
                {data.activeCheerers > 0 && (
                  <>
                    <span className="hidden sm:inline">•</span>
                    <span className="hidden sm:flex items-center gap-1 text-emerald-300 font-bold">
                      <Users className="w-3.5 h-3.5 text-emerald-400" />
                      {data.activeCheerers} <span className="text-[9px] text-white/50">NGƯỜI</span>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Mini EKG / Intensity Bar in compact view */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Live Waveform Canvas */}
            <div className="hidden md:block w-32 lg:w-44 h-8 rounded-[4px] fluent-box-nested border border-white/10 overflow-hidden px-1">
              <canvas ref={miniCanvasRef} width={180} height={32} className="w-full h-full" />
            </div>

            {/* Vertical / Horizontal Gauge */}
            <div className="flex flex-col items-end gap-1 w-20 sm:w-28">
              <div className="flex items-center justify-between w-full text-[10px] font-mono text-white/60">
                <span>Khí thế:</span>
                <span className="font-bold text-white" style={{ color: data.colorHex }}>
                  {data.intensity}%
                </span>
              </div>
              <div className="w-full h-2 sm:h-2.5 bg-black/50 backdrop-blur-[24px] saturate-150/50 rounded-[4px] overflow-hidden p-[1px] border border-white/10">
                <div
                  className="h-full rounded-[4px] transition-all duration-300"
                  style={{
                    width: `${Math.max(6, data.intensity)}%`,
                    backgroundColor: data.colorHex,
                    boxShadow: `0 0 10px ${data.colorHex}`
                  }}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 sm:p-2 rounded-[4px] border transition ${
                  soundEnabled
                    ? 'fluent-box-nested border-rose-500/50 text-rose-300'
                    : 'fluent-box-nested border-white/10 text-white/40 hover:text-white'
                }`}
                title={soundEnabled ? 'Tắt âm thanh nhịp tim' : 'Bật âm thanh nhịp tim'}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>

              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 sm:p-2 rounded-[4px] fluent-box-nested hover:fluent-box-nested border border-white/10 text-white/70 hover:text-white transition cursor-pointer"
                title={isExpanded ? 'Thu nhỏ bảng nhiệt (Phím C)' : 'Mở rộng bảng nhiệt chi tiết (Phím C)'}
              >
                {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Expanded Detailed Stage Visualizer Overlay */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-white/10 grid grid-cols-1 md:grid-cols-3 gap-3 animate-fadeIn text-white">
            {/* Bento Box 1: EKG & Heartbeat Pulse */}
            <div className="fluent-box-nested border border-white/10 rounded-[4px] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-rose-300 font-mono">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-400 animate-pulse" />
                  Điện Tâm Đồ Khán Phòng (EKG)
                </span>
                <span>{data.bpm} BPM</span>
              </div>
              <div className="h-14 my-2 rounded-[4px] bg-black/50 backdrop-blur-[24px] saturate-150/60 border border-white/10 overflow-hidden p-1 flex items-center justify-center">
                <canvas ref={expandedCanvasRef} width={280} height={56} className="w-full h-full" />
              </div>
              <div className="text-[10px] text-white/50 font-mono flex items-center justify-between">
                <span>Tốc độ: {data.cheersPerSec} pings/giây</span>
                <span className="text-emerald-400 font-bold">● LIVE SYNC</span>
              </div>
            </div>

            {/* Bento Box 2: Crowd Energy Thermometer */}
            <div className="fluent-box-nested border border-white/10 rounded-[4px] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-amber-300 font-mono">
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Cường Độ Khí Thế (Energy Meter)
                </span>
                <span>{data.intensity}%</span>
              </div>

              <div className="my-2 space-y-1.5">
                <div className="w-full h-4 bg-black/50 backdrop-blur-[24px] saturate-150/60 rounded-[4px] overflow-hidden p-[2px] border border-white/15">
                  <div
                    className="h-full rounded-[4px] transition-all duration-300 relative overflow-hidden"
                    style={{
                      width: `${Math.max(5, data.intensity)}%`,
                      backgroundColor: data.colorHex,
                      boxShadow: `0 0 15px ${data.colorHex}`
                    }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                  </div>
                </div>
                <div className="flex items-center justify-between text-[10px] font-mono text-white/40 px-1">
                  <span>0% Yên ả</span>
                  <span>50% Sôi nổi</span>
                  <span>100% Supernova</span>
                </div>
              </div>

              <div className="text-[11px] font-bold" style={{ color: data.colorHex }}>
                {data.levelTitle}
              </div>
            </div>

            {/* Bento Box 3: Recent Activity & Multiplier */}
            <div className="fluent-box-nested border border-white/10 rounded-[4px] p-3 flex flex-col justify-between">
              <div className="flex items-center justify-between text-xs font-bold text-sky-300 font-mono">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-400" />
                  Khán Giả Tiếp Sức
                </span>
                <span>{data.activeCheerers} đang gõ</span>
              </div>

              <div className="my-2 space-y-1 overflow-hidden max-h-14">
                {data.recentEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    className="flex items-center justify-between text-[10px] font-mono fluent-box-nested px-2 py-0.5 rounded border border-white/5"
                  >
                    <span className="text-white/80 truncate max-w-[120px]">
                      {ev.name || 'Khán giả'}
                    </span>
                    <span className="font-bold text-rose-300">
                      {CHEER_EMOJIS[ev.type] || '❤️'} +{ev.count} {ev.combo > 1 ? `(x${ev.combo})` : ''}
                    </span>
                  </div>
                ))}
                {data.recentEvents.length === 0 && (
                  <div className="text-[10px] text-white/40 italic py-2 text-center">
                    Chạm nút Cổ Vũ trên điện thoại để tiếp sức cho sân khấu!
                  </div>
                )}
              </div>

              <div className="text-[10px] text-white/50 font-mono flex items-center justify-between">
                <span>Tổng cổ vũ: <strong className="text-white">{data.totalCheers}</strong></span>
                <span className="text-rose-400 font-bold">Phím [C] để ẩn</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
