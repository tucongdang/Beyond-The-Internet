import React, { useState, useEffect, useCallback, useRef } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

interface CaptchaChallengeProps {
  value: string;
  captchaId: string;
  onChange: (captchaId: string, answer: string) => void;
  disabled?: boolean;
}

export const CaptchaChallenge: React.FC<CaptchaChallengeProps> = ({
  value,
  captchaId,
  onChange,
  disabled = false
}) => {
  const [question, setQuestion] = useState<string>('...');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const fetchCaptcha = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/captcha');
      const data = await res.json();
      if (data.captchaId && data.question) {
        setQuestion(data.question);
        onChangeRef.current(data.captchaId, '');
      }
    } catch (err) {
      console.warn('Could not fetch CAPTCHA challenge:', err);
      // Fallback local challenge if offline
      const num1 = Math.floor(Math.random() * 20) + 10;
      const num2 = Math.floor(Math.random() * 10) + 1;
      const q = `${num1} + ${num2}`;
      setQuestion(q);
      onChangeRef.current('local_fallback_' + (num1 + num2), '');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCaptcha();
  }, [fetchCaptcha]);

  // Draw security noise and styled math on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background gradient
    const bgGrad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bgGrad.addColorStop(0, '#190839');
    bgGrad.addColorStop(1, '#0D0420');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Random security noise lines
    ctx.strokeStyle = 'rgba(247, 202, 201, 0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.lineTo(Math.random() * canvas.width, Math.random() * canvas.height);
      ctx.stroke();
    }

    // Security noise dots
    ctx.fillStyle = 'rgba(125, 211, 252, 0.2)';
    for (let i = 0; i < 25; i++) {
      ctx.fillRect(Math.random() * canvas.width, Math.random() * canvas.height, 1.5, 1.5);
    }

    // Skewed, crisp math text
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.fillStyle = '#F7CAC9';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(247, 202, 201, 0.4)';
    ctx.shadowBlur = 4;
    ctx.fillText(`${question} = ?`, canvas.width / 2, canvas.height / 2);
  }, [question]);

  return (
    <div className="space-y-1.5 select-none">
      <div className="flex items-center justify-between text-[11px] font-mono font-bold text-white/70">
        <span className="flex items-center gap-1.5 text-sky-300">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Mã bảo vệ chống bot (CAPTCHA)</span>
        </span>
        <button
          type="button"
          onClick={() => {
            vibrateTap();
            soundFx.playClick();
            fetchCaptcha();
          }}
          disabled={isLoading || disabled}
          className="hover:text-white flex items-center gap-1 transition text-[10px] text-white/50 cursor-pointer disabled:opacity-40"
          title="Đổi bài toán khác"
        >
          <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Đổi mã</span>
        </button>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative rounded-[2px] border border-white/20 overflow-hidden shadow-inner shrink-0">
          <canvas
            ref={canvasRef}
            width={120}
            height={38}
            className="block"
            title={`Bài toán CAPTCHA: ${question} = ?`}
          />
        </div>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          placeholder="Đáp án..."
          value={value}
          disabled={disabled}
          onChange={(e) => {
            const cleanVal = e.target.value.replace(/[^0-9-]/g, '');
            onChange(captchaId, cleanVal);
          }}
          className="flex-1 bg-[#0D0420]/60 border border-white/10 hover:border-white/20 focus:border-[#F7CAC9]/60 text-center font-mono font-bold text-sm text-white px-3 py-2 rounded-[2px] outline-none tracking-widest transition shadow-inner disabled:opacity-50"
          maxLength={6}
          required
        />
      </div>
    </div>
  );
};
