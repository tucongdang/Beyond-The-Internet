import React, { useRef, useEffect, useState } from 'react';
import { X, Download, Share2, Sparkles, Check } from 'lucide-react';
import { UserInfo } from '../types';
import { getSecureRandomId } from '../utils/cryptoUtils';

interface PostMatchCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserInfo | null;
  totalScore: number;
  rank: number;
  totalContestants: number;
  accuracyRate: number;
  maxStreak: number;
  isSurvivor: boolean;
}

export const PostMatchCardModal: React.FC<PostMatchCardModalProps> = ({
  isOpen,
  onClose,
  user,
  totalScore,
  rank,
  totalContestants,
  accuracyRate,
  maxStreak,
  isSurvivor
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(true);
  const [isShared, setIsShared] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    setIsGenerating(true);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = 1080;
    const height = 1080;
    canvas.width = width;
    canvas.height = height;

    // 1. Cosmic Twilight Background Gradient
    const bgGradient = ctx.createLinearGradient(0, 0, width, height);
    bgGradient.addColorStop(0, '#0D0420');
    bgGradient.addColorStop(0.5, '#190839');
    bgGradient.addColorStop(1, '#241148');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 2. Cosmic Nebulae & Light Glows
    const radialGlow = ctx.createRadialGradient(width / 2, 280, 50, width / 2, 280, 500);
    radialGlow.addColorStop(0, 'rgba(247, 202, 201, 0.2)');
    radialGlow.addColorStop(0.5, 'rgba(235, 199, 214, 0.08)');
    radialGlow.addColorStop(1, 'rgba(13, 4, 32, 0)');
    ctx.fillStyle = radialGlow;
    ctx.fillRect(0, 0, width, height);

    // 3. Geometric Border Frame (Crisp Fluent UI 2px styling)
    ctx.strokeStyle = 'rgba(247, 202, 201, 0.4)';
    ctx.lineWidth = 3;
    ctx.strokeRect(36, 36, width - 72, height - 72);

    ctx.strokeStyle = 'rgba(235, 199, 214, 0.15)';
    ctx.lineWidth = 1;
    ctx.strokeRect(48, 48, width - 96, height - 96);

    // Corner Accents
    const drawCorner = (x: number, y: number) => {
      ctx.fillStyle = '#F7CAC9';
      ctx.fillRect(x - 4, y - 4, 8, 8);
    };
    drawCorner(36, 36);
    drawCorner(width - 36, 36);
    drawCorner(36, height - 36);
    drawCorner(width - 36, height - 36);

    // 4. Header & Branding
    ctx.textAlign = 'center';
    ctx.font = 'bold 30px "SVN-Gilroy", "Lexend", sans-serif';
    ctx.fillStyle = '#EBC7D6';
    try {
      (ctx as any).letterSpacing = '4px';
    } catch {}
    ctx.fillText('BEYOND THE INTERNET 2026', width / 2, 110);

    ctx.font = '500 20px "SVN-Gilroy", "Lexend", sans-serif';
    ctx.fillStyle = '#B6A6D8';
    ctx.fillText('ĐẠI HỘI HỌC THUẬT & AN TOÀN SỐ LIVE GAMESHOW', width / 2, 145);

    // Divider
    ctx.strokeStyle = 'rgba(247, 202, 201, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(width / 2 - 200, 175);
    ctx.lineTo(width / 2 + 200, 175);
    ctx.stroke();

    // 5. Contestant Badge & Name
    const avatarText = (user?.name || 'K').charAt(0).toUpperCase();
    
    // Avatar Outer Ring
    ctx.beginPath();
    ctx.arc(width / 2, 270, 65, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(62, 29, 116, 0.9)';
    ctx.fill();
    ctx.strokeStyle = '#F7CAC9';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Avatar Initial
    ctx.fillStyle = '#F5EFF9';
    ctx.font = 'black 64px "SVN-Gilroy", "Lexend", sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText(avatarText, width / 2, 272);
    ctx.textBaseline = 'alphabetic';

    // Name & MSSV
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 44px "SVN-Gilroy", "Lexend", sans-serif';
    ctx.fillText(user?.name || 'Khán Giả Thi Đấu', width / 2, 385);

    ctx.fillStyle = '#F7CAC9';
    ctx.font = '600 24px "SVN-Gilroy", monospace';
    ctx.fillText(`MSSV: ${user?.mssv || 'BTI-2026'}  •  UID: ${user?.anonymizedUid || user?.uid?.substring(0, 8) || 'ONLINE'}`, width / 2, 425);

    // 6. Score Showcase Card (Big Numbers)
    const cardY = 465;
    const cardH = 175;
    ctx.fillStyle = 'rgba(36, 17, 72, 0.75)';
    ctx.fillRect(80, cardY, width - 160, cardH);
    ctx.strokeStyle = 'rgba(247, 202, 201, 0.35)';
    ctx.lineWidth = 2;
    ctx.strokeRect(80, cardY, width - 160, cardH);

    // Left Column: Total Score
    ctx.textAlign = 'center';
    ctx.fillStyle = '#B6A6D8';
    ctx.font = 'bold 22px "SVN-Gilroy", sans-serif';
    ctx.fillText('TỔNG ĐIỂM TÍCH LŨY', 320, cardY + 52);

    ctx.fillStyle = '#F7CAC9';
    ctx.font = 'black 76px "SVN-Gilroy", sans-serif';
    ctx.fillText(`${totalScore}đ`, 320, cardY + 130);

    // Vertical Divider in Card
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.beginPath();
    ctx.moveTo(width / 2, cardY + 25);
    ctx.lineTo(width / 2, cardY + cardH - 25);
    ctx.stroke();

    // Right Column: Global Rank
    ctx.fillStyle = '#B6A6D8';
    ctx.font = 'bold 22px "SVN-Gilroy", sans-serif';
    ctx.fillText('HẠNG TOÀN HỘI TRƯỜNG', width - 320, cardY + 52);

    ctx.fillStyle = '#38BDF8';
    ctx.font = 'black 76px "SVN-Gilroy", sans-serif';
    ctx.fillText(`#${rank > 0 ? rank : '-'}`, width - 320, cardY + 130);

    // 7. Four Stats Badges Grid
    const gridY = 675;
    const boxW = 215;
    const boxH = 150;
    const gap = 20;
    const startX = 80;

    const stats = [
      { label: 'TỈ LỆ CHÍNH XÁC', val: `${accuracyRate}%`, color: '#34D399' },
      { label: 'CHUỖI THẮNG ĐỈNH', val: `${maxStreak} CÂU`, color: '#F59E0B' },
      { label: 'HẠNG SINH TỒN', val: isSurvivor ? 'BẤT BẠI 👑' : 'ĐÃ HẠ GỤC', color: isSurvivor ? '#FCD34D' : '#94A3B8' },
      { label: 'TỔNG ĐỐI THỦ', val: `${totalContestants}`, color: '#E2DBEC' }
    ];

    stats.forEach((item, idx) => {
      const bx = startX + idx * (boxW + gap);
      ctx.fillStyle = 'rgba(25, 8, 57, 0.85)';
      ctx.fillRect(bx, gridY, boxW, boxH);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, gridY, boxW, boxH);

      ctx.fillStyle = '#B6A6D8';
      ctx.font = 'bold 15px "SVN-Gilroy", sans-serif';
      ctx.fillText(item.label, bx + boxW / 2, gridY + 45);

      ctx.fillStyle = item.color;
      ctx.font = 'bold 28px "SVN-Gilroy", sans-serif';
      ctx.fillText(item.val, bx + boxW / 2, gridY + 105);
    });

    // 8. Bottom Honor Seal & Hash
    ctx.fillStyle = '#E2DBEC';
    ctx.font = '600 24px "SVN-Gilroy", sans-serif';
    ctx.fillText(isSurvivor ? '★ CHIẾN BINH BẤT BẠI - XUẤT SẮC TOÀN DIỆN ★' : '★ CHIẾN BINH ĐÃ HOÀN THÀNH XUẤT SẮC ĐẠI HỘI ★', width / 2, 890);

    const nowStr = new Date().toLocaleString('vi-VN');
    ctx.fillStyle = '#8B7AA8';
    ctx.font = '16px "SVN-Gilroy", monospace';
    ctx.fillText(`Thời gian xác thực: ${nowStr}  |  Mã bảo mật: BTI2026-${getSecureRandomId('', 8).toUpperCase()}`, width / 2, 955);
    ctx.fillText('Designed with Fluent UI v2 • 2026 Live Arena Interaction', width / 2, 990);

    // Generate export Data URL
    try {
      const url = canvas.toDataURL('image/png');
      setDataUrl(url);
    } catch {}
    setIsGenerating(false);
  }, [isOpen, user, totalScore, rank, totalContestants, accuracyRate, maxStreak, isSurvivor]);

  const handleDownload = () => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `BTI2026_Achievement_${user?.mssv || 'Contestant'}.png`;
    link.href = dataUrl;
    link.click();
  };

  const handleShare = async () => {
    if (!dataUrl) return;
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        const blob = await (await fetch(dataUrl)).blob();
        const file = new File([blob], `BTI2026_${user?.mssv || 'Card'}.png`, { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Thành tích Beyond The Internet 2026',
            text: `Tôi đạt ${totalScore} điểm tại Live Gameshow Beyond The Internet 2026!`,
            files: [file]
          });
          setIsShared(true);
          setTimeout(() => setIsShared(false), 2000);
          return;
        }
      } catch {}
    }
    // Fallback: download directly
    handleDownload();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fluent-dialog-overlay z-[60] animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="postmatch-modal-title"
    >
      <div 
        className="fluent-dialog w-full max-w-lg bg-[#190839] border border-[#F7CAC9]/40 rounded-[2px] shadow-2xl flex flex-col text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="fluent-dialog-header shrink-0 flex items-center justify-between p-4 border-b border-white/10 bg-white/5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#F7CAC9]" />
            <h3 id="postmatch-modal-title" className="font-bold text-base text-[#F7CAC9] uppercase tracking-wider">
              Thẻ Thành Tích Khán Giả
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-[2px] hover:bg-white/10 transition text-white/70 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="fluent-dialog-body p-4 flex flex-col items-center justify-center gap-4 scrollbar-thin">
          {/* Hidden full-res canvas */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Visual Preview */}
          {isGenerating ? (
            <div className="w-full aspect-square flex flex-col items-center justify-center bg-black/30 rounded-[2px] border border-white/10 text-slate-300 gap-3">
              <div className="w-8 h-8 border-2 border-[#F7CAC9] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-medium">Đang kết xuất thẻ thành tích HD...</span>
            </div>
          ) : dataUrl ? (
            <div className="w-full aspect-square rounded-[2px] overflow-hidden border border-[#F7CAC9]/30 shadow-xl bg-black/40">
              <img src={dataUrl} alt="Thẻ thành tích BTI 2026" className="w-full h-full object-contain" />
            </div>
          ) : null}

          <p className="text-xs text-center text-[#B6A6D8]">
            Ảnh thẻ vuông kích thước 1080x1080 tiêu chuẩn. Bạn có thể tải về để đăng Facebook, Story Instagram hoặc gửi vào nhóm lớp!
          </p>
        </div>

        {/* Footer Actions */}
        <div className="fluent-dialog-footer shrink-0 p-4 border-t border-white/10 bg-white/5 flex items-center justify-between gap-2.5">
          <button
            onClick={onClose}
            className="px-3.5 py-2 rounded-[2px] bg-white/10 hover:bg-white/20 text-xs font-semibold transition text-white cursor-pointer"
          >
            Đóng
          </button>

          <button
            onClick={handleShare}
            disabled={!dataUrl}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-[2px] bg-white/15 hover:bg-white/25 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
          >
            {isShared ? <Check className="w-4 h-4 text-emerald-400" /> : <Share2 className="w-4 h-4" />}
            {isShared ? 'Đã chia sẻ' : 'Chia sẻ'}
          </button>

          <button
            onClick={handleDownload}
            disabled={!dataUrl}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-[2px] bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-400 hover:to-rose-400 text-white font-bold text-xs shadow-lg transition active:scale-[0.98] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Tải Ảnh HD (PNG)
          </button>
        </div>
      </div>
    </div>
  );
};
