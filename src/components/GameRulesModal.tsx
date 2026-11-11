import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Zap,
  Shield,
  Flame,
  Target,
  CheckCircle2,
  Gift,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { useLanguage } from '../hooks/useLanguage';
import { soundFx } from '../services/audioEffects';
import { vibrateTap } from '../utils/hapticUtils';

interface GameRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  isHighContrast?: boolean;
}

interface RuleItem {
  id: string;
  number: string;
  category: 'rounds' | 'features';
  icon: React.ComponentType<{ className?: string }>;
  titleVi: string;
  titleEn: string;
  metaVi: string;
  metaEn: string;
  summaryVi: string;
  summaryEn: string;
  highlightsVi: string[];
  highlightsEn: string[];
}

const BTI_2027_RULES: RuleItem[] = [
  {
    id: 'round_1',
    number: '01',
    category: 'rounds',
    icon: Zap,
    titleVi: 'Vòng 1: Khởi Động — Phản Xạ Tia Chớp',
    titleEn: 'Round 1: Warm-Up — Lightning Reflexes',
    metaVi: 'Trắc nghiệm 4 lựa chọn · Tối đa 15 điểm/câu',
    metaEn: '4-Option Multiple Choice · Up to 15 pts/question',
    summaryVi:
      'Mở màn sôi động cùng các câu hỏi kiến thức công nghệ, văn hóa số và tư duy nhanh song hành trực tiếp với thí sinh trên sân khấu.',
    summaryEn:
      'Kick off the arena with fast-paced tech, digital culture, and logic questions alongside the stage contestants.',
    highlightsVi: [
      'Chốt đáp án đúng ngay trong 3 giây đầu tiên: nhận trọn +15 điểm (Điểm Thưởng Tia Chớp).',
      'Trả lời đúng sau mốc 3 giây: nhận +10 điểm tiêu chuẩn.',
      'Mỗi câu chỉ có từ 10–15 giây suy nghĩ, hãy giữ mắt theo dõi hiệu lệnh từ MC!'
    ],
    highlightsEn: [
      'Lock in a correct answer within the first 3 seconds: earn +15 points (Lightning Bonus).',
      'Correct answer after 3 seconds: earn +10 standard points.',
      'Each question lasts 10–15 seconds — stay tuned to the MC on stage!'
    ]
  },
  {
    id: 'round_2',
    number: '02',
    category: 'rounds',
    icon: Shield,
    titleVi: 'Vòng 2: Vượt Chướng Ngại Vật — Giải Mã Từ Khóa',
    titleEn: 'Round 2: Obstacle Course — Keyword Decoder',
    metaVi: '4 Hàng ngang gợi ý · Ô Mạo Hiểm 120 điểm',
    metaEn: '4 Clue Rows · 120-Point Risk Box',
    summaryVi:
      'Xâu chuỗi các mảnh ghép từ 4 hàng ngang gợi ý và ô trung tâm để tìm ra Từ khóa bí ẩn của chương trình.',
    summaryEn:
      'Connect clues across 4 horizontal rows and the center box to uncover the hidden central keyword.',
    highlightsVi: [
      'Dự đoán đúng Từ khóa trung tâm càng sớm khi ít hàng ngang mở, điểm thưởng càng cao (tối đa +40 điểm).',
      'Khi thí sinh trên sân khấu bật Ô Mạo Hiểm (120 điểm), khán giả được tham gia dự đoán kết quả để nhận thêm điểm thưởng nóng.',
      'Hệ thống tự động chuẩn hóa tiếng Việt không dấu/có dấu để đảm bảo công bằng.'
    ],
    highlightsEn: [
      'Guessing the central keyword earlier with fewer open rows awards higher bonus points (up to +40 pts).',
      'When a stage contestant triggers the 120-point Risk Box, audience members can predict the outcome for bonus points.',
      'Answers are automatically normalized for spacing and casing.'
    ]
  },
  {
    id: 'round_3',
    number: '03',
    category: 'rounds',
    icon: Flame,
    titleVi: 'Vòng 3: Tăng Tốc — Bứt Phá Tốc Độ',
    titleEn: 'Round 3: Acceleration — Speed Breakthrough',
    metaVi: 'Sắp xếp & Đúng/Sai 4 ý · Tối đa 40 điểm/câu',
    metaEn: 'Sequencing & 4-Statement True/False · Up to 40 pts/question',
    summaryVi:
      'Thời điểm vàng để bứt phá thứ hạng trên Bảng Vàng với các thử thách đòi hỏi cả độ chính xác lẫn tốc độ ngón tay.',
    summaryEn:
      'The golden opportunity to climb the Honor Board with challenges testing both accuracy and finger speed.',
    highlightsVi: [
      'Mốc Vàng (0 – 5 giây đầu): nhận ngay +40 điểm khi trả lời chính xác.',
      'Mốc Bạc (5 – 10 giây): nhận +30 điểm; sau 10 giây nhận +20 điểm.',
      'Với câu hỏi Sắp xếp thứ tự, bạn có thể kéo thả hoặc chạm nút mũi tên lên/xuống để đổi chỗ cực nhanh.'
    ],
    highlightsEn: [
      'Gold Tier (0–5 seconds): earn +40 points for a correct answer.',
      'Silver Tier (5–10 seconds): earn +30 points; after 10 seconds earn +20 points.',
      'For Sequencing questions, drag and drop or tap the up/down arrows to reorder items quickly.'
    ]
  },
  {
    id: 'round_4',
    number: '04',
    category: 'rounds',
    icon: Target,
    titleVi: 'Vòng 4: Về Đích & Ngôi Sao Hy Vọng',
    titleEn: 'Round 4: Finish Line & Star of Hope',
    metaVi: 'Câu hỏi quyết định · Nhân đôi điểm thưởng (x2)',
    metaEn: 'Decisive Questions · Double Down (2x Points)',
    summaryVi:
      'Chặng nước rút kịch tính nhất trận đấu, nơi một quyết định táo bạo có thể đưa bạn lên ngôi Quán Quân Khán Giả.',
    summaryEn:
      'The most dramatic final sprint where a bold call can crown you the Audience Champion.',
    highlightsVi: [
      'Mỗi câu trả lời đúng mang về từ +20 đến +40 điểm tùy gói câu hỏi trên sân khấu.',
      'Ngôi Sao Hy Vọng (x2 Điểm): Nếu tự tin, hãy bật Ngôi Sao Hy Vọng trước khi bấm nộp để nhân đôi điểm thưởng ở câu đó!',
      'Chế độ Đấu Trường Bất Bại ghi nhận chuỗi thắng liên tiếp của bạn xuyên suốt cả 4 vòng.'
    ],
    highlightsEn: [
      'Each correct answer awards +20 to +40 points depending on the stage question package.',
      'Star of Hope (2x Points): Toggle Double Down before submitting to double your points on that question!',
      'Survival Mode tracks your consecutive correct streak across all 4 rounds.'
    ]
  },
  {
    id: 'feature_safety',
    number: '05',
    category: 'features',
    icon: CheckCircle2,
    titleVi: 'Cơ Chế Bảo Vệ Điểm & Tự Động Chốt Bài',
    titleEn: 'Score Protection & Auto-Submit Safety',
    metaVi: 'Không lo rớt mạng · Tự động lưu khi hết giờ',
    metaEn: 'Offline-Resilient · Auto-Save at 0.0s',
    summaryVi:
      'Hệ thống được thiết kế để bảo vệ từng điểm số và thao tác chạm của bạn trong suốt buổi thi trực tiếp.',
    summaryEn:
      'Built to safeguard every tap and point throughout the live event.',
    highlightsVi: [
      'Tự động nộp khi hết giờ: Chỉ cần bạn đã chạm chọn đáp án, hệ thống sẽ tự động khóa và gửi phương án đó khi đồng hồ về 0.0s.',
      'Đồng bộ tức thì: Nếu mạng chập chờn vài giây, câu trả lời vẫn được lưu tạm trên máy và tự động gửi bù ngay khi có mạng lại.',
      'Giữ màn hình luôn sáng: Bật nút "Giữ Sáng" trên thanh điểm số để điện thoại không tự tắt khi đang nghe MC đọc câu hỏi.'
    ],
    highlightsEn: [
      'Auto-submit at 0.0s: As long as you tapped an option, your choice is automatically locked in when the timer expires.',
      'Instant sync recovery: Brief network drops queue your answer locally and sync it as soon as you reconnect.',
      'Screen Wake Lock: Enable "Always On" in the score bar so your phone screen never dims while the MC reads.'
    ]
  },
  {
    id: 'feature_prizes',
    number: '06',
    category: 'features',
    icon: Gift,
    titleVi: 'Vòng Quay May Mắn, Giao Lưu Q&A & Thẻ Vinh Danh',
    titleEn: 'Lucky Draw, Live Q&A & Achievement Card',
    metaVi: 'Mã UID 12 ký tự · Quà tặng trực tiếp tại hội trường',
    metaEn: '12-Character UID · Live Auditorium Prizes',
    summaryVi:
      'Không chỉ đấu trí, bạn còn có cơ hội nhận quà may mắn và lưu giữ kỷ niệm đẹp cùng Beyond The Internet 2027.',
    summaryEn:
      'Beyond the quiz, win live prizes and save your personalized Beyond The Internet 2027 achievement card.',
    highlightsVi: [
      'Quay Số May Mắn (Lucky Draw): Mã định danh 12 ký tự (UID) trong Hồ sơ của bạn tự động tham gia quay thưởng trên màn hình lớn.',
      'Giao lưu Hỏi Đáp (Q&A) & Tiếp lửa: Gửi câu hỏi hay cho Ban Cố Vấn hoặc bắn tim, gửi lời chúc cổ vũ chạy chữ trực tiếp.',
      'Thẻ Thành Tích HD: Cuối trận đấu, tải ngay ảnh thẻ vinh danh 1080x1080 với điểm số, thứ hạng và huy hiệu của riêng bạn!'
    ],
    highlightsEn: [
      'Lucky Draw: Your unique 12-character UID badge is automatically entered into the stage Lucky Draw wheel.',
      'Live Q&A & Cheering: Submit questions to the Advisory Board or send live cheers and shoutouts to the stage.',
      'HD Achievement Card: Download a 1080x1080 honor card showcasing your final score, rank, and streak!'
    ]
  }
];

export const GameRulesModal: React.FC<GameRulesModalProps> = ({
  isOpen,
  onClose,
  isHighContrast = false
}) => {
  const { localLanguage } = useLanguage();
  const isVi = localLanguage === 'vi';
  const [filter, setFilter] = useState<'all' | 'rounds' | 'features'>('all');

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        vibrateTap();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  if (typeof document === 'undefined' || !document.body) return null;

  const filteredRules = BTI_2027_RULES.filter((item) =>
    filter === 'all' ? true : item.category === filter
  );

  const modalContent = (
    <div
      id="game-rules-modal-overlay"
      className="fluent-dialog-overlay z-[65] animate-fadeIn flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-2xl"
      onClick={() => {
        soundFx.playClick();
        vibrateTap();
        onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-rules-modal-title"
    >
      <div
        id="game-rules-modal-card"
        className={`fluent-dialog w-full max-w-3xl max-h-[90vh] flex flex-col rounded-[3px] shadow-2xl overflow-hidden border transition-all ${
          isHighContrast
            ? 'bg-black border-white/60 text-white'
            : 'bg-[#13072b]/95 border-[#F7CAC9]/35 text-[#F5EFF9] backdrop-blur-3xl shadow-[0_32px_64px_rgba(0,0,0,0.85)]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="shrink-0 px-5 py-4 border-b border-white/15 bg-white/[0.04] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-[2px] bg-[#F7CAC9]/15 border border-[#F7CAC9]/40 flex items-center justify-center text-[#F7CAC9] shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2
                id="game-rules-modal-title"
                className="text-base sm:text-lg font-black text-white tracking-tight truncate"
              >
                {isVi ? 'Cẩm Nang Luật Chơi BTI 2027' : 'BTI 2027 Game Rules Guide'}
              </h2>
              <p className="text-xs text-[#B6A6D8] truncate">
                {isVi
                  ? 'Nắm trọn bí kíp săn điểm và chinh phục Bảng Vàng qua 4 vòng thi kịch tính!'
                  : 'Master the scoring rules and conquer the Honor Board across 4 thrilling rounds!'}
              </p>
            </div>
          </div>

          <button
            id="btn-close-game-rules-modal"
            type="button"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              onClose();
            }}
            aria-label={isVi ? 'Đóng cẩm nang luật chơi' : 'Close game rules guide'}
            className="min-w-[44px] min-h-[44px] p-2 rounded-[2px] bg-white/10 hover:bg-white/20 text-white/75 hover:text-white flex items-center justify-center transition cursor-pointer active:scale-95 shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Filter Segmented Bar */}
        <div className="shrink-0 px-5 py-3 border-b border-white/10 bg-black/25 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 p-1 bg-white/[0.06] rounded-[2px] border border-white/10">
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                setFilter('all');
              }}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'all'
                  ? 'bg-[#F7CAC9] text-[#190839] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {isVi ? 'Tất Cả (6)' : 'All Rules (6)'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                setFilter('rounds');
              }}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'rounds'
                  ? 'bg-[#F7CAC9] text-[#190839] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {isVi ? '4 Vòng Thi Chính' : '4 Competition Rounds'}
            </button>
            <button
              type="button"
              onClick={() => {
                soundFx.playClick();
                vibrateTap();
                setFilter('features');
              }}
              className={`px-3 py-1.5 rounded-[2px] text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
                filter === 'features'
                  ? 'bg-[#F7CAC9] text-[#190839] shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              {isVi ? 'Bí Kíp & Quà Tặng' : 'Tips & Prizes'}
            </button>
          </div>

          <div className="text-[11px] text-[#B6A6D8] font-mono">
            {isVi
              ? 'Beyond The Internet 2027 · Sân chơi học thuật sinh viên'
              : 'Beyond The Internet 2027 · Student Academic Arena'}
          </div>
        </div>

        {/* Scrollable Friendly Rules List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {filteredRules.map((rule) => {
            const IconComponent = rule.icon;
            return (
              <article
                key={rule.id}
                className={`p-4 sm:p-5 rounded-[2px] border transition-all ${
                  isHighContrast
                    ? 'bg-black border-white/40'
                    : 'bg-white/[0.04] hover:bg-white/[0.06] border-white/12'
                }`}
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-[2px] bg-[#190839] border border-[#F7CAC9]/35 flex items-center justify-center text-[#F7CAC9] shrink-0 mt-0.5">
                    <IconComponent className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Clean unboxed metadata kicker */}
                    <div className="flex items-center gap-2 text-xs font-mono text-[#B6A6D8] flex-wrap">
                      <span className="font-bold text-[#F7CAC9] tabular-nums">
                        {rule.number}.
                      </span>
                      <span>{isVi ? rule.metaVi : rule.metaEn}</span>
                    </div>

                    {/* Natural Editorial Title */}
                    <h3 className="text-sm sm:text-base font-bold text-white leading-snug">
                      {isVi ? rule.titleVi : rule.titleEn}
                    </h3>

                    {/* Engaging Summary */}
                    <p className="text-xs sm:text-sm text-[#E2DBEC] leading-relaxed">
                      {isVi ? rule.summaryVi : rule.summaryEn}
                    </p>

                    {/* Bullet Highlights */}
                    <ul className="pt-1.5 space-y-1.5 border-t border-white/10">
                      {(isVi ? rule.highlightsVi : rule.highlightsEn).map((pt, idx) => (
                        <li
                          key={idx}
                          className="text-xs text-white/85 leading-relaxed flex items-start gap-2"
                        >
                          <span className="text-[#F7CAC9] font-mono font-bold select-none mt-0.5">
                            •
                          </span>
                          <span>{pt}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-3.5 border-t border-white/15 bg-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#B6A6D8]">
            <Sparkles className="w-4 h-4 text-[#F7CAC9] shrink-0" />
            <span>
              {isVi
                ? 'Chúc bạn bứt phá điểm số và rinh quà thật chất tại đấu trường hôm nay!'
                : 'Wishing you top scores and awesome prizes in the arena today!'}
            </span>
          </div>

          <button
            id="btn-got-it-game-rules"
            type="button"
            onClick={() => {
              soundFx.playClick();
              vibrateTap();
              onClose();
            }}
            className="w-full sm:w-auto min-h-[42px] px-6 py-2 rounded-[2px] bg-[#F7CAC9] hover:bg-[#FCEEEC] text-[#190839] font-black text-xs uppercase tracking-wider transition cursor-pointer active:scale-95 whitespace-nowrap shrink-0 shadow-md"
          >
            {isVi ? 'Đã Sẵn Sàng Nhập Cuộc!' : 'Ready to Play!'}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};
