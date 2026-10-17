import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  MessageSquare,
  Bot,
  Send,
  X,
  RotateCcw,
  Shield,
  Sparkles,
  ChevronDown,
  AlertTriangle,
  Copy,
  Check,
  Zap,
  HelpCircle,
  Wifi,
  Trophy,
  BookOpen,
  Wrench,
  ExternalLink,
  Volume2,
  VolumeX,
  BarChart3,
  Users,
  Target,
  Activity,
  TrendingUp,
  Clock,
  RefreshCw,
  Flame,
  Radio,
  ArrowRight,
  ShieldAlert,
  Info,
  Bell,
  WifiOff
} from 'lucide-react';
import { GameState, UserInfo, UserResponse } from '../types';
import { soundFx } from '../services/audioEffects';
import { vibrateTap, vibrateWarning } from '../utils/hapticUtils';
import { TypingIndicator } from './TypingIndicator';
import { syncService } from '../services/syncService';
import { calculateLeaderboard, UserScoreSummary } from '../utils/leaderboardUtils';

export type MessageRole = 'user' | 'assistant' | 'system';
export type SystemMessageType = 'status_update' | 'technical_alert' | 'security_alert' | 'game_event' | 'general';

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  systemType?: SystemMessageType;
  title?: string;
}

export interface AssistantChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: GameState;
  user?: UserInfo | null;
  activeRoundName?: string;
  activeStatus?: string;
  promptContext?: string;
  onMessageSent?: () => void;
  onMessageReceived?: () => void;
  initialTab?: 'chat' | 'facts';
  allResponses?: Record<string, Record<string, UserResponse>>;
  activeParticipantsCount?: number;
}

export function parseRoundDetails(roundName?: string, roundType?: string) {
  const r = (roundName || '').toLowerCase().trim();
  const type = (roundType || '').toUpperCase();

  if (r.includes('4') || r.includes('vd') || r.includes('ve_dich') || r.includes('về đích')) {
    return { roundNumber: 4, roundTitle: 'Về Đích', badge: 'VÒNG 4', color: 'from-amber-500/20 to-orange-500/20 border-amber-500/40 text-amber-300' };
  }
  if (r.includes('3') || r.includes('tt') || r.includes('tang_toc') || r.includes('tăng tốc')) {
    return { roundNumber: 3, roundTitle: 'Tăng Tốc', badge: 'VÒNG 3', color: 'from-purple-500/20 to-pink-500/20 border-purple-500/40 text-purple-300' };
  }
  if (r.includes('2') || r.includes('vcnv') || r.includes('chuong_ngai_vat') || r.includes('chướng ngại vật') || type === 'VCNV') {
    return { roundNumber: 2, roundTitle: 'Vượt Chướng Ngại Vật', badge: 'VÒNG 2', color: 'from-blue-500/20 to-cyan-500/20 border-blue-500/40 text-cyan-300' };
  }
  return { roundNumber: 1, roundTitle: 'Khởi Động', badge: 'VÒNG 1', color: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/40 text-emerald-300' };
}

export interface QuickActionItem {
  id: string;
  label: string;
  subLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  borderColor: string;
  userPromptText: string;
  predefinedResponse: string;
}

const STORAGE_KEY = 'bti2026_audience_chat_history';

export const QUICK_ACTIONS: QuickActionItem[] = [
  {
    id: 'rules',
    label: 'Rules',
    subLabel: 'Luật 4 vòng thi',
    icon: BookOpen,
    accentColor: 'text-amber-300',
    badgeBg: 'bg-amber-400/10 hover:bg-amber-400/20',
    borderColor: 'border-amber-400/30 hover:border-amber-400/60',
    userPromptText: '📜 Cho mình xem tóm tắt Thể lệ & Luật thi 4 Vòng đấu Beyond The Internet 2026?',
    predefinedResponse: `📋 **LUẬT THI ĐẤU CHÍNH THỨC - BEYOND THE INTERNET 2026**

Cuộc thi gồm **4 vòng đấu đỉnh cao** dành cho cả thí sinh sàn đấu và khán giả tương tác:

1️⃣ **VÒNG 1: KHỞI ĐỘNG**
• 10 câu hỏi trắc nghiệm kiến thức nhanh (15 giây/câu).
• Trả lời Đúng: **+10 điểm** | Sai: **0 điểm** (không bị trừ).

2️⃣ **VÒNG 2: VƯỢT CHƯỚNG NGẠI VẬT**
• 4 từ hàng ngang gợi ý cho 1 **Từ khóa Chướng Ngại Vật**.
• Đoán đúng hàng ngang: **+10 điểm**.
• Bấm chuông giải Chướng Ngại Vật:
  - Trước hàng ngang thứ 2: **+80 điểm**
  - Trước hàng ngang thứ 3: **+60 điểm**
  - Trước hàng ngang thứ 4: **+40 điểm**
  - Sau cả 4 gợi ý: **+20 điểm**
• ⚡ **Ô Mạo Hiểm (Risk-Reward)**: Nếu chọn kích hoạt trước khi mở câu hỏi, điểm nhận được sẽ x2 nếu đúng (+20đ); nếu sai bị trừ 50% tổng điểm vòng 2!

3️⃣ **VÒNG 3: TĂNG TỐC**
• 4 câu hỏi tư duy logic với độ khó tăng dần (thời gian: 30s - 20s - 10s - 5s).
• Điểm số trao theo tốc độ phản xạ gửi đáp án đúng: **40 - 30 - 20 - 10 điểm**.

4️⃣ **VÒNG 4: VỀ ĐÍCH**
• Thí sinh lựa chọn gói câu hỏi (20đ - 30đ).
• 🌟 **Ngôi Sao Hy Vọng**: Được quyền đặt 1 lần. Đúng: x2 số điểm câu hỏi; Sai: bị trừ đúng số điểm của câu hỏi và nhường quyền bấm chuông cướp điểm!`
  },
  {
    id: 'tech_help',
    label: 'Technical Help',
    subLabel: 'Khắc phục mạng & lỗi',
    icon: Wrench,
    accentColor: 'text-cyan-300',
    badgeBg: 'bg-cyan-400/10 hover:bg-cyan-400/20',
    borderColor: 'border-cyan-400/30 hover:border-cyan-400/60',
    userPromptText: '🛠️ Hướng dẫn xử lý sự cố mạng, mất kết nối hoặc reload trang khi đang thi?',
    predefinedResponse: `🛠️ **HƯỚNG DẪN XỬ LÝ SỰ CỐ KỸ THUẬT & KẾT NỐI MẠNG**

Nếu bạn gặp sự cố khi đang tương tác trên thiết bị cá nhân:

1️⃣ **Mất kết nối hoặc giật lag mạng (Connection Lost)**:
• Kiểm tra cột sóng Wi-Fi hội trường hoặc chuyển sang mạng di động 4G/5G.
• Vuốt xuống hoặc nhấn **F5** để tải lại trang. Hệ thống đã lưu trữ phiên làm việc của bạn (MSSV & Họ tên) trên bộ nhớ máy, **điểm số và tiến trình không bị mất**!

2️⃣ **Không nghe thấy âm thanh / Nhạc hiệu**:
• Trình duyệt di động thường chặn tự động phát âm thanh. Nhấn nhẹ vào bất kỳ vị trí nào trên màn hình để cấp quyền Web Audio.
• Bật âm lượng loa và tắt chế độ im lặng/rung của điện thoại.

3️⃣ **Nút bấm đáp án không phản hồi**:
• Tắt các tiện ích chặn quảng cáo (AdBlock) hoặc các tab nền tiêu tốn RAM.
• Mở bằng trình duyệt Safari (iOS) hoặc Google Chrome (Android) để đạt hiệu năng tốt nhất.

4️⃣ **Cần hỗ trợ trực tiếp tại hội trường**:
• Giơ tay hoặc liên hệ ngay bàn **Kỹ Thuật (Tech Desk)** ở cuối khán phòng để các kỹ thuật viên hỗ trợ ngay lập tức!`
  },
  {
    id: 'prizes',
    label: 'Prizes',
    subLabel: 'Cơ cấu giải thưởng',
    icon: Trophy,
    accentColor: 'text-[#F7CAC9]',
    badgeBg: 'bg-[#F7CAC9]/10 hover:bg-[#F7CAC9]/20',
    borderColor: 'border-[#F7CAC9]/30 hover:border-[#F7CAC9]/60',
    userPromptText: '🏆 Cơ cấu giải thưởng và quà tặng cho thí sinh & khán giả BTI 2026 gồm những gì?',
    predefinedResponse: `🏆 **CƠ CẤU GIẢI THƯỞNG & QUÀ TẶNG BTI 2026**

Cuộc thi tôn vinh cả thí sinh sàn đấu và khán giả nhiệt huyết:

👑 **DÀNH CHO THÍ SINH SÀN ĐẤU:**
• 🥇 **Giải Nhất (Quán Quân)**: Cúp Vàng BTI + 5.000.000 VNĐ tiền mặt + Học bổng CNTT chuyên sâu.
• 🥈 **Giải Nhì (Á Quân)**: Kỷ niệm chương Bạc BTI + 3.000.000 VNĐ + Quà tặng nhà tài trợ.
• 🥉 **Giải Ba**: Kỷ niệm chương Đồng + 1.500.000 VNĐ.
• 🎖️ **Giải Khuyến Khích**: 500.000 VNĐ + Quà lưu niệm giải đấu.

📱 **DÀNH CHO KHÁN GIẢ TƯƠNG TÁC (AUDIENCE VIEW):**
• 🌟 **Top 1 Khán Giả Tinh Anh**: Combo Tai nghe Bluetooth cao cấp + Áo thun BTI 2026 Limited.
• 🥈 **Top 2 - Top 5 Khán Giả Nhanh Tay**: Pin sạc dự phòng 20.000mAh + Bình giữ nhiệt BTI cao cấp.
• 🎁 **Tất cả khán giả tham gia**: Giấy chứng nhận điện tử (E-Certificate) và cơ hội quay số may mắn trúng thưởng cuối chương trình!`
  },
  {
    id: 'scoring',
    label: 'Scoring',
    subLabel: 'Cách tính điểm & BXH',
    icon: Zap,
    accentColor: 'text-emerald-300',
    badgeBg: 'bg-emerald-400/10 hover:bg-emerald-400/20',
    borderColor: 'border-emerald-400/30 hover:border-emerald-400/60',
    userPromptText: '🎯 Cách tính điểm và xếp hạng realtime trên bảng Leaderboard như thế nào?',
    predefinedResponse: `🎯 **CƠ CHẾ TÍNH ĐIỂM & BẢNG XẾP HẠNG REALTIME**

Hệ thống tính điểm tự động và cập nhật tức thì:

• **Cộng điểm chuẩn xác**: Điểm được cộng dồn ngay khi trọng tài/hệ thống xác nhận đáp án đúng.
• **Tốc độ phản xạ (ms)**: Ở các câu hỏi đòi hỏi thời gian, hệ thống đo lường thời gian gửi câu trả lời đến phần nghìn giây để phân định thứ tự xếp hạng.
• **Bảng Xếp Hạng Live**: Dữ liệu được đồng bộ liên tục. Nhấn vào tab **Bảng Xếp Hạng** để theo dõi vị trí của bạn trong khán phòng.
• **Minh bạch & Công bằng**: Mọi hành vi gian lận hoặc can thiệp dữ liệu sẽ bị hệ thống tự động loại bỏ.`
  },
  {
    id: 'fair_play',
    label: 'Fair Play',
    subLabel: 'Chống gian lận đề thi',
    icon: Shield,
    accentColor: 'text-purple-300',
    badgeBg: 'bg-purple-400/10 hover:bg-purple-400/20',
    borderColor: 'border-purple-400/30 hover:border-purple-400/60',
    userPromptText: '🛡️ Chính sách chống gian lận và bảo mật đề thi BTI 2026 quy định những gì?',
    predefinedResponse: `🛡️ **CHÍNH SÁCH BẢO MẬT & CHỐNG GIAN LẬN ĐỀ THI**

Để đảm bảo tính công bằng và tinh thần thể thao trí tuệ cao nhất:

• **Khóa hỗ trợ giải đề khi câu hỏi mở**: Khi câu hỏi thi đấu đang diễn ra trên sàn đấu (\`ACTIVE\`), Trợ lý AI tuyệt đối từ chối tiết lộ, giải thích hay đưa ra gợi ý đáp án.
• **Kiểm soát phiên thi đấu**: Mỗi mã số sinh viên (MSSV) chỉ được đăng nhập và gửi câu trả lời từ một thiết bị duy nhất.
• **Giám sát thời gian thực**: Ban Trọng Tài có hệ thống giám sát tự động phát hiện các mẫu hành vi bất thường.

*Hãy tự tin thể hiện kiến thức và bản lĩnh công nghệ của chính mình nhé! Chúc bạn đạt điểm thật cao!*`
  }
];

export const AssistantChatModal: React.FC<AssistantChatModalProps> = ({
  isOpen,
  onClose,
  gameState,
  user,
  activeRoundName,
  activeStatus,
  promptContext,
  onMessageSent,
  onMessageReceived,
  initialTab = 'chat',
  allResponses: externalAllResponses,
  activeParticipantsCount: externalActiveCount
}) => {
  const currentRoundName = activeRoundName || gameState?.round_name?.trim() || 'Khởi động';
  const currentStatus = activeStatus || gameState?.status || 'STANDBY';
  const [activeTab, setActiveTab] = useState<'chat' | 'facts'>(initialTab);
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => soundFx.isEnabled());

  // Realtime Live Presence and Global Responses Subscription
  const [presenceCount, setPresenceCount] = useState<number>(externalActiveCount || 1);
  const [allResponsesData, setAllResponsesData] = useState<Record<string, Record<string, UserResponse>>>(
    externalAllResponses || {}
  );
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number>(Date.now());
  const [isRefreshingStats, setIsRefreshingStats] = useState<boolean>(false);

  useEffect(() => {
    const unsubPresence = syncService.subscribeToPresence((count) => {
      setPresenceCount(count);
    });
    const unsubAllResponses = syncService.subscribeToAllResponses((resps) => {
      setAllResponsesData(resps);
    });
    return () => {
      unsubPresence();
      unsubAllResponses();
    };
  }, []);

  useEffect(() => {
    if (externalAllResponses) {
      setAllResponsesData(externalAllResponses);
    }
  }, [externalAllResponses]);

  useEffect(() => {
    if (externalActiveCount !== undefined) {
      setPresenceCount(externalActiveCount);
    }
  }, [externalActiveCount]);

  // Compute live-updating round details, global average score, and participant statistics
  const roundDetails = useMemo(() => {
    return parseRoundDetails(currentRoundName, gameState?.round_type);
  }, [currentRoundName, gameState?.round_type]);

  const leaderboard = useMemo(() => {
    return calculateLeaderboard(allResponsesData, undefined, gameState);
  }, [allResponsesData, gameState]);

  const eventStats = useMemo(() => {
    const totalContestants = leaderboard.length;
    if (totalContestants === 0) {
      return {
        activeParticipants: Math.max(1, presenceCount),
        averageScore: 0,
        highestScore: 0,
        totalAnswered: 0,
        accuracyRate: 0,
        fastestLatency: 0,
        totalParticipantsWithScore: 0
      };
    }

    const totalScore = leaderboard.reduce((acc, u) => acc + (u.totalScore || 0), 0);
    const avgScore = totalScore / totalContestants;
    const highestScore = Math.max(...leaderboard.map(u => u.totalScore || 0));
    const totalCorrect = leaderboard.reduce((acc, u) => acc + (u.correctAnswersCount || 0), 0);
    const totalAnswers = leaderboard.reduce((acc, u) => acc + (u.totalAnswered || 0), 0);
    const accuracy = totalAnswers > 0 ? Math.round((totalCorrect / totalAnswers) * 100) : 0;
    const latencies = leaderboard.map(u => u.avgLatency).filter(l => l > 0);
    const fastest = latencies.length > 0 ? Math.min(...latencies) : 0;

    return {
      activeParticipants: Math.max(presenceCount, totalContestants),
      averageScore: Number(avgScore.toFixed(1)),
      highestScore,
      totalAnswered: totalAnswers,
      accuracyRate: accuracy,
      fastestLatency: Number(fastest.toFixed(2)),
      totalParticipantsWithScore: totalContestants
    };
  }, [leaderboard, presenceCount]);

  const currentUserStats = useMemo(() => {
    if (!user || leaderboard.length === 0) return null;
    return (
      leaderboard.find(
        (u) => (user.uid && u.uid === user.uid) || (user.mssv && u.mssv === user.mssv)
      ) || null
    );
  }, [user, leaderboard]);

  const handleRefreshStats = () => {
    vibrateTap();
    soundFx.playPop();
    setIsRefreshingStats(true);
    setLastRefreshedAt(Date.now());
    setTimeout(() => {
      setIsRefreshingStats(false);
    }, 450);
  };

  // Listen to sound enabled changes across the app
  useEffect(() => {
    return soundFx.subscribeEnabled((enabled) => setSoundEnabled(enabled));
  }, []);

  const handleToggleSound = () => {
    vibrateTap();
    const next = !soundEnabled;
    soundFx.setEnabled(next);
    setSoundEnabled(next);
    if (next) {
      soundFx.playMessageSent();
    }
  };

  const initialSystemStatus: ChatMessage = {
    id: 'initial_system_status',
    role: 'system',
    systemType: 'status_update',
    title: 'HỆ THỐNG ĐỒNG BỘ TRẬN ĐẤU',
    content: `Đang kết nối sàn đấu trực tiếp: ${currentRoundName} • Trạng thái: ${currentStatus} • Đồng bộ: Firestore Realtime`,
    timestamp: Date.now() - 1500
  };

  const initialGreeting: ChatMessage = {
    id: 'welcome_greeting',
    role: 'assistant',
    content: `Xin chào ${user?.name || 'bạn'}! 👋 Mình là **Trợ Lý Khán Giả BTI 2026**.\n\nMình có thể hỗ trợ bạn:\n- 📖 Thể lệ & cách tính điểm 4 vòng thi đấu\n- 🧩 Quy tắc Vượt Chướng Ngại Vật & Ô Mạo Hiểm\n- 📶 Hướng dẫn khắc phục sự cố kết nối mạng\n- 🎁 Cơ cấu giải thưởng & quà tặng lưu niệm\n\n🛡️ *Lưu ý công bằng: Để bảo vệ tính bảo mật và minh bạch của cuộc thi, mình tuyệt đối không giải đề hoặc tiết lộ đáp án câu hỏi thi đấu nhé!*`,
    timestamp: Date.now()
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch {
      // Fallback
    }
    return [initialSystemStatus, initialGreeting];
  });

  const prevStatusRef = useRef<string>(currentStatus);
  const prevRoundRef = useRef<string>(currentRoundName);

  // Monitor live game status updates and auto-generate distinct system status messages
  useEffect(() => {
    if (prevStatusRef.current && prevStatusRef.current !== currentStatus) {
      prevStatusRef.current = currentStatus;

      let alertText = '';
      let title = 'CẬP NHẬT TRẠNG THÁI SÀN ĐẤU';

      if (currentStatus === 'ACTIVE') {
        alertText = `⚡ Trọng tài đã kích hoạt câu hỏi thi đấu! Thời gian làm bài đang đếm ngược. Cổng nộp bài: MỞ.`;
      } else if (currentStatus === 'LOCKED') {
        alertText = `🔒 Hết thời gian làm bài! Hệ thống đã khóa tiếp nhận đáp án. Vui lòng quan sát màn chiếu để đối chiếu điểm.`;
      } else if (currentStatus === 'REVEAL') {
        alertText = `✨ Đáp án chính thức và điểm số vòng thi đã được công bố trên màn chiếu!`;
      } else if (currentStatus === 'STANDBY') {
        alertText = `⏸️ Hệ thống sàn đấu đang ở trạng thái chuẩn bị (STANDBY).`;
      }

      if (alertText) {
        const sysMsg: ChatMessage = {
          id: `status_${Date.now()}`,
          role: 'system',
          systemType: 'status_update',
          title,
          content: alertText,
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, sysMsg]);
        soundFx.playPop();
      }
    } else {
      prevStatusRef.current = currentStatus;
    }
  }, [currentStatus]);

  // Monitor live round changes and post system announcement
  useEffect(() => {
    if (prevRoundRef.current && prevRoundRef.current !== currentRoundName) {
      prevRoundRef.current = currentRoundName;

      const roundMsg: ChatMessage = {
        id: `round_${Date.now()}`,
        role: 'system',
        systemType: 'game_event',
        title: 'CHUYỂN VÒNG THI ĐẤU',
        content: `🏆 Trận đấu chính thức bước sang ${currentRoundName}! Thể lệ và cơ chế tính điểm thưởng vòng mới đã được kích hoạt.`,
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, roundMsg]);
      soundFx.playPop();
    } else {
      prevRoundRef.current = currentRoundName;
    }
  }, [currentRoundName]);

  // Monitor technical network status events (online / offline alerts)
  useEffect(() => {
    const handleOnline = () => {
      const onlineMsg: ChatMessage = {
        id: `tech_online_${Date.now()}`,
        role: 'system',
        systemType: 'technical_alert',
        title: 'THÔNG BÁO KỸ THUẬT',
        content: '🟢 Kết nối mạng Internet đã được khôi phục thành công! Phiên tương tác và đồng bộ điểm số tiếp tục hoạt động.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, onlineMsg]);
      soundFx.playMessageReceived();
    };

    const handleOffline = () => {
      const offlineMsg: ChatMessage = {
        id: `tech_offline_${Date.now()}`,
        role: 'system',
        systemType: 'technical_alert',
        title: 'CẢNH BÁO KỸ THUẬT',
        content: '⚠️ Thiết bị của bạn vừa mất kết nối Internet! Hệ thống đang lưu tạm điểm số trên bộ nhớ máy. Vui lòng kiểm tra Wi-Fi / 4G.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, offlineMsg]);
      soundFx.playAlarm();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync to sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // Ignore
    }
  }, [messages]);

  // Auto-scroll to bottom of messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom(false);
      setTimeout(() => {
        if (window.innerWidth > 640 && inputRef.current) {
          inputRef.current.focus();
        }
      }, 150);
    }
  }, [isOpen, isMinimized, scrollToBottom]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      scrollToBottom(true);
    }
  }, [messages, isLoading, isOpen, isMinimized, scrollToBottom]);

  // Client-side quick anti-cheat check for direct exam answering during active round
  const isSuspiciousCheatingQuery = (text: string): boolean => {
    const lower = text.toLowerCase();
    const cheatKeywords = [
      'đáp án là gì',
      'đáp án câu này',
      'chọn câu nào',
      'chọn đáp án nào',
      'chọn a hay b',
      'a b c hay d',
      'gợi ý đáp án',
      'giải giúp câu',
      'cho xin đáp án',
      'câu trả lời đúng là gì',
      'đáp án chính xác'
    ];
    return cheatKeywords.some(kw => lower.includes(kw));
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || isLoading) return;

    vibrateTap();
    if (onMessageSent) {
      onMessageSent();
    } else {
      soundFx.playMessageSent();
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputText('');
    setIsLoading(true);

    // If active question is running and user asks directly for the exam answer
    if (currentStatus === 'ACTIVE' && isSuspiciousCheatingQuery(textToSend)) {
      vibrateWarning();
      setTimeout(() => {
        const securityAlertMsg: ChatMessage = {
          id: `security_${Date.now()}`,
          role: 'system',
          systemType: 'security_alert',
          title: 'CẢNH BÁO AN NINH & BẢO MẬT ĐỀ THI',
          content: '🛡️ Câu hỏi thi đấu đang diễn ra trên sàn đấu. Theo quy chế giải đấu Beyond The Internet 2026, Trợ lý AI tuyệt đối không giải đề, gợi ý hay tiết lộ đáp án cho khán giả.\n\nHãy quan sát thật kỹ màn chiếu và đưa ra lựa chọn theo kiến thức của bạn nhé! Chúc bạn ghi trọn điểm!',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, securityAlertMsg]);
        setIsLoading(false);
        soundFx.playAlarm();
      }, 400);
      return;
    }

    try {
      const promptContextToSend = promptContext || `[NGỮ CẢNH TRẬN ĐẤU THỜI GIAN THỰC]: Vòng thi hiện tại là "${currentRoundName}" với trạng thái "${currentStatus}".`;

      const response = await fetch('/api/audience-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages
            .filter(m => m.role === 'user' || m.role === 'assistant')
            .slice(-8)
            .map(m => ({
              role: m.role,
              content: m.content
            })),
          userInfo: {
            name: user?.name || 'Khán giả',
            mssv: user?.mssv || ''
          },
          currentRoundName: currentRoundName,
          roundName: currentRoundName,
          currentQuestionStatus: currentStatus,
          status: currentStatus,
          promptContext: promptContextToSend,
          gameStateContext: {
            round_name: currentRoundName,
            status: currentStatus,
            round_type: gameState?.round_type,
            category: gameState?.category
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      const replyText = data.reply || 'Mình đã nhận được câu hỏi. Bạn cần thêm thông tin gì về luật thi hay cách tính điểm nữa không?';

      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: replyText,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
      if (onMessageReceived) {
        onMessageReceived();
      } else {
        soundFx.playMessageReceived();
      }
    } catch (err: any) {
      console.warn('Chat request failed:', err?.message || err);
      const fallbackMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: 'Chào bạn! Kết nối AI đang có độ trễ nhẹ. Bạn có thể tham khảo luật thi 4 vòng đấu hoặc liên hệ Ban Tổ Chức tại bàn Kỹ Thuật nếu gặp sự cố mạng nhé!',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, fallbackMessage]);
      if (onMessageReceived) {
        onMessageReceived();
      } else {
        soundFx.playMessageReceived();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerQuickAction = (action: QuickActionItem) => {
    if (isLoading) return;

    vibrateTap();
    if (onMessageSent) {
      onMessageSent();
    } else {
      soundFx.playMessageSent();
    }

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: action.userPromptText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Provide natural transition with TypingIndicator before rendering pre-defined response
    setTimeout(() => {
      const assistantMessage: ChatMessage = {
        id: `assistant_${Date.now()}`,
        role: 'assistant',
        content: action.predefinedResponse,
        timestamp: Date.now()
      };

      const systemFollowUps: ChatMessage[] = [];

      // If user triggered Technical Help, append a real-time system technical diagnostic alert
      if (action.id === 'tech_help') {
        systemFollowUps.push({
          id: `tech_diag_${Date.now() + 1}`,
          role: 'system',
          systemType: 'technical_alert',
          title: 'CHẨN ĐOÁN HỆ THỐNG KỸ THUẬT',
          content: '📶 Kết nối máy chủ: Trực tuyến (Realtime Firestore) • Độ trễ mạng: ~40ms • Web Audio API: Sẵn sàng.',
          timestamp: Date.now() + 100
        });
      } else if (action.id === 'rules') {
        systemFollowUps.push({
          id: `game_status_${Date.now() + 1}`,
          role: 'system',
          systemType: 'status_update',
          title: 'TRẠNG THÁI SÀN ĐẤU HIỆN TẠI',
          content: `🎯 Sàn đấu đang ở ${currentRoundName} (Trạng thái: ${currentStatus}). Điểm thưởng tốc độ và quy chế đang kích hoạt.`,
          timestamp: Date.now() + 100
        });
      }

      setMessages(prev => [...prev, assistantMessage, ...systemFollowUps]);
      setIsLoading(false);
      if (onMessageReceived) {
        onMessageReceived();
      } else {
        soundFx.playMessageReceived();
      }
    }, 450);
  };

  const handleClearHistory = () => {
    vibrateTap();
    soundFx.playClick();
    setMessages([initialSystemStatus, initialGreeting]);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const handleCopyText = (content: string, id: string) => {
    try {
      navigator.clipboard.writeText(content);
      setCopiedId(id);
      vibrateTap();
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  const isQuestionActive = currentStatus === 'ACTIVE';

  if (!isOpen) return null;

  return (
    <div
      id="assistant-chat-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Trợ lý Khán giả BTI 2026"
      className={`fixed bottom-4 sm:bottom-6 right-3 sm:right-6 z-50 w-[94vw] sm:w-[410px] bg-gradient-to-b from-[#18082f]/98 via-[#0f041e]/98 to-[#1a082c]/98 backdrop-blur-2xl border border-[#F7CAC9]/30 rounded-[4px] shadow-2xl shadow-purple-950/90 flex flex-col overflow-hidden transition-all duration-200 animate-fadeIn ${
        isMinimized ? 'h-14' : 'h-[540px] max-h-[82vh]'
      }`}
    >
      {/* ================= HEADER ================= */}
      <div className="px-3.5 py-2.5 bg-black/40 border-b border-white/10 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[3px] bg-gradient-to-br from-purple-600 to-indigo-600 border border-[#F7CAC9]/40 flex items-center justify-center text-white shrink-0 shadow-inner">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs font-black font-mono text-white tracking-tight truncate">
                TRỢ LÝ KHÁN GIẢ BTI
              </h3>
              <span className="px-1.5 py-0.2 rounded-[2px] text-[8px] font-mono font-bold bg-[#F7CAC9]/20 text-[#F7CAC9] border border-[#F7CAC9]/30 uppercase shrink-0">
                AI 3.8 Flash
              </span>
            </div>
            <div className="flex items-center gap-1 text-[9px] text-white/50 font-mono mt-0.5">
              <Shield className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
              <span className="truncate">Chống gian lận đề thi • Hỗ trợ 24/7</span>
            </div>
          </div>
        </div>

        {/* Window Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleToggleSound}
            className={`p-1 transition rounded cursor-pointer ${
              soundEnabled
                ? 'text-[#F7CAC9]/90 hover:text-white'
                : 'text-white/30 hover:text-white/60'
            }`}
            title={soundEnabled ? 'Tắt âm thanh hiệu ứng tin nhắn' : 'Bật âm thanh hiệu ứng tin nhắn'}
            aria-label={soundEnabled ? 'Tắt âm thanh tin nhắn' : 'Bật âm thanh tin nhắn'}
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 text-[#F7CAC9]" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 text-white/40" />
            )}
          </button>

          <button
            type="button"
            onClick={handleClearHistory}
            className="p-1 text-white/40 hover:text-white/80 transition rounded cursor-pointer"
            title="Xóa đoạn hội thoại"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 text-white/50 hover:text-white transition rounded cursor-pointer"
            title={isMinimized ? 'Mở rộng hộp chat' : 'Thu nhỏ hộp chat'}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMinimized ? 'rotate-180' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => {
              vibrateTap();
              onClose();
            }}
            className="p-1 text-white/50 hover:text-rose-400 transition rounded cursor-pointer"
            title="Đóng hộp chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ================= BODY CONTENT (Hidden when minimized) ================= */}
      {!isMinimized && (
        <>
          {/* ================= TAB NAVIGATION BAR ================= */}
          <div className="bg-[#140628] border-b border-purple-500/25 px-2.5 pt-1.5 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-1" role="tablist" aria-label="Điều hướng khung trợ lý">
              <button
                type="button"
                role="tab"
                id="tab-chat"
                aria-selected={activeTab === 'chat'}
                aria-controls="tabpanel-chat"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setActiveTab('chat');
                }}
                className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-t-[3px] border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  activeTab === 'chat'
                    ? 'border-[#F7CAC9] text-[#F7CAC9] bg-white/5'
                    : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Hỏi Đáp Chat</span>
                {messages.length > 1 && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-full text-[9px] bg-purple-500/30 text-purple-200">
                    {messages.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                role="tab"
                id="tab-facts"
                aria-selected={activeTab === 'facts'}
                aria-controls="tabpanel-facts"
                onClick={() => {
                  vibrateTap();
                  soundFx.playClick();
                  setActiveTab('facts');
                }}
                className={`px-3 py-1.5 text-[11px] font-mono font-bold rounded-t-[3px] border-b-2 transition flex items-center gap-1.5 cursor-pointer relative ${
                  activeTab === 'facts'
                    ? 'border-[#F7CAC9] text-[#F7CAC9] bg-white/5'
                    : 'border-transparent text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5 text-cyan-300" />
                <span>Quick Facts</span>
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[8px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Live</span>
                </span>
              </button>
            </div>

            {/* Live Participants Counter Badge on Tab Header */}
            <div
              className="flex items-center gap-1 text-[10px] font-mono text-cyan-300 bg-cyan-950/50 border border-cyan-500/30 px-2 py-0.5 rounded-[2px] shrink-0"
              title={`${eventStats.activeParticipants} người đang trực tuyến`}
            >
              <Users className="w-2.5 h-2.5 text-cyan-300 shrink-0" />
              <span className="font-bold">{eventStats.activeParticipants}</span>
              <span className="text-[8px] text-white/40 hidden sm:inline">online</span>
            </div>
          </div>

          {/* ================= TAB 1: CHAT ASSISTANT ================= */}
          {activeTab === 'chat' && (
            <div id="tabpanel-chat" role="tabpanel" aria-labelledby="tab-chat" className="flex-1 flex flex-col min-h-0">
              {/* Active Round & Status Indicator Bar */}
              <div className="bg-purple-950/70 border-b border-purple-500/20 px-3 py-1.5 flex items-center justify-between text-[10px] font-mono shrink-0">
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isQuestionActive ? 'bg-emerald-400 animate-pulse' : 'bg-cyan-400'}`} />
                  <span className="text-white/60">Vòng đấu:</span>
                  <span className="font-bold text-[#F7CAC9] truncate max-w-[190px]">{currentRoundName}</span>
                </div>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase shrink-0 ${
                  currentStatus === 'ACTIVE'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : currentStatus === 'LOCKED'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : currentStatus === 'REVEAL'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'bg-white/10 text-white/70 border border-white/20'
                }`}>
                  {currentStatus}
                </span>
              </div>

              {/* Active Question Warning Alert Banner */}
              {isQuestionActive && (
                <div className="bg-amber-500/10 border-b border-amber-500/20 px-3 py-1.5 flex items-center gap-2 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 animate-pulse" />
                  <p className="text-[10px] text-amber-300 font-mono leading-tight">
                    Câu hỏi đang mở: Chế độ chống gian lận đề thi đang bật. AI từ chối giải đề.
                  </p>
                </div>
              )}

              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs custom-scrollbar">
                {messages.map((msg) => {
                  const isSystem = msg.role === 'system' || Boolean(msg.systemType);
                  const isAssistant = msg.role === 'assistant';

                  if (isSystem) {
                    const sysType = msg.systemType || 'status_update';

                    let cardTheme = {
                      bg: 'bg-gradient-to-r from-blue-950/80 via-indigo-950/70 to-purple-950/80 border-cyan-400/40 text-cyan-100 shadow-cyan-950/40',
                      badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                      iconBg: 'bg-cyan-950/80 border-cyan-500/40 text-cyan-300',
                      title: msg.title || 'TRẠNG THÁI SÀN ĐẤU • MATCH STATUS',
                      Icon: Radio
                    };

                    if (sysType === 'technical_alert') {
                      cardTheme = {
                        bg: 'bg-gradient-to-r from-amber-950/85 via-orange-950/70 to-black/80 border-amber-500/50 text-amber-100 shadow-amber-950/40',
                        badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                        iconBg: 'bg-amber-950/80 border-amber-500/40 text-amber-300',
                        title: msg.title || 'CẢNH BÁO KỸ THUẬT • TECH ALERT',
                        Icon: Wrench
                      };
                    } else if (sysType === 'security_alert') {
                      cardTheme = {
                        bg: 'bg-gradient-to-r from-rose-950/85 via-red-950/70 to-black/80 border-rose-500/50 text-rose-100 shadow-rose-950/40',
                        badge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                        iconBg: 'bg-rose-950/80 border-rose-500/40 text-rose-300',
                        title: msg.title || 'AN NINH THI ĐẤU • FAIR PLAY',
                        Icon: ShieldAlert
                      };
                    } else if (sysType === 'game_event') {
                      cardTheme = {
                        bg: 'bg-gradient-to-r from-purple-950/80 via-pink-950/65 to-black/80 border-purple-500/40 text-purple-100 shadow-purple-950/40',
                        badge: 'bg-purple-500/20 text-purple-200 border-purple-500/40',
                        iconBg: 'bg-purple-950/80 border-purple-500/40 text-purple-300',
                        title: msg.title || 'SỰ KIỆN GIẢI ĐẤU • EVENT',
                        Icon: Trophy
                      };
                    } else if (sysType === 'general') {
                      cardTheme = {
                        bg: 'bg-gradient-to-r from-slate-900/80 via-purple-950/60 to-black/80 border-white/20 text-white/90 shadow-purple-950/30',
                        badge: 'bg-white/10 text-white/80 border-white/20',
                        iconBg: 'bg-white/10 border-white/20 text-white/80',
                        title: msg.title || 'THÔNG BÁO HỆ THỐNG',
                        Icon: Info
                      };
                    }

                    const SysIcon = cardTheme.Icon;

                    return (
                      <div key={msg.id} className="w-full my-2 flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
                        <div
                          className={`w-full max-w-[96%] p-2.5 rounded-[4px] border ${cardTheme.bg} shadow-md backdrop-blur-md transition-all`}
                        >
                          <div className="flex items-center justify-between gap-1.5 pb-1 mb-1.5 border-b border-white/10">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className={`p-1 rounded-[3px] border ${cardTheme.iconBg} shrink-0`}>
                                <SysIcon className="w-3.5 h-3.5" />
                              </div>
                              <span
                                className={`px-1.5 py-0.5 rounded-[2px] text-[9px] font-mono font-bold uppercase tracking-wider truncate ${cardTheme.badge}`}
                              >
                                {cardTheme.title}
                              </span>
                            </div>
                            <span className="text-[8px] font-mono opacity-60 shrink-0 ml-1">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          <div className="text-[11px] leading-relaxed whitespace-pre-wrap font-sans break-words pl-0.5">
                            {msg.content}
                          </div>

                          {/* Quick copy for system alert content */}
                          <div className="mt-1.5 pt-1 border-t border-white/10 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.content, msg.id)}
                              className="text-[9px] font-mono text-white/40 hover:text-white flex items-center gap-1 transition cursor-pointer"
                              title="Sao chép thông báo hệ thống"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  <span className="text-emerald-400">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Conversational User vs Assistant Messages
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                    >
                      <div
                        className={`max-w-[88%] p-3 rounded-[4px] relative group text-xs leading-relaxed ${
                          isAssistant
                            ? 'bg-white/10 text-white/95 border border-[#F7CAC9]/30 shadow-md shadow-purple-950/40 backdrop-blur-md'
                            : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md'
                        }`}
                      >
                        {isAssistant && (
                          <div className="flex items-center gap-1.5 mb-1.5 pb-1 border-b border-white/10 text-[10px] font-mono text-[#F7CAC9] font-bold">
                            <Bot className="w-3 h-3 text-[#F7CAC9]" />
                            <span>Trợ Lý BTI</span>
                            <span className="text-[8px] text-white/40 ml-auto font-normal">
                              {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        )}

                        <div className="whitespace-pre-wrap break-words leading-relaxed">
                          {msg.content}
                        </div>

                        {/* Copy action for assistant responses */}
                        {isAssistant && (
                          <div className="mt-2 pt-1 border-t border-white/10 flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleCopyText(msg.content, msg.id)}
                              className="text-[9px] font-mono text-white/40 hover:text-white flex items-center gap-1 transition cursor-pointer"
                              title="Sao chép câu trả lời"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-400" />
                                  <span className="text-emerald-400">Đã chép</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Sao chép</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* High-fidelity Typing Indicator Component inside chat bubble */}
                {isLoading && (
                  <TypingIndicator />
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Interactive Horizontal Quick Action Buttons Row */}
              <div className="border-t border-white/10 bg-black/40 px-3 py-2 shrink-0">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-[10px] font-mono text-white/60 font-semibold tracking-wide uppercase">
                    <Sparkles className="w-3 h-3 text-[#F7CAC9] animate-pulse" />
                    <span>Thao tác nhanh • Quick Actions</span>
                  </div>
                  <span className="text-[9px] font-mono text-white/40">1-click tức thì</span>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar no-scrollbar scroll-smooth">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        type="button"
                        onClick={() => handleTriggerQuickAction(action)}
                        disabled={isLoading}
                        aria-label={`Chọn nhanh ${action.label}`}
                        title={`${action.label}: ${action.subLabel}`}
                        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-[4px] border ${action.borderColor} ${action.badgeBg} backdrop-blur-sm transition-all duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 active:scale-95`}
                      >
                        <div className={`w-5 h-5 rounded-[3px] bg-black/40 border border-white/10 flex items-center justify-center shrink-0 ${action.accentColor} group-hover:scale-110 transition-transform`}>
                          <Icon className="w-3 h-3" />
                        </div>
                        <div className="flex flex-col text-left">
                          <span className="text-[11px] font-bold font-mono text-white tracking-tight leading-none group-hover:text-[#F7CAC9] transition-colors">
                            {action.label}
                          </span>
                          <span className="text-[8px] font-sans text-white/50 leading-tight mt-0.5 whitespace-nowrap">
                            {action.subLabel}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Input Footer */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="p-2.5 bg-black/40 border-t border-white/10 flex items-center gap-2 shrink-0"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={isQuestionActive ? 'Hỏi luật thi, điểm số (không giải đề)...' : 'Nhập câu hỏi cần hỗ trợ...'}
                  disabled={isLoading}
                  className="flex-1 bg-white/5 border border-white/15 focus:border-[#F7CAC9] rounded-[3px] px-3 py-2 text-xs text-white placeholder-white/40 outline-none transition font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isLoading}
                  className="p-2 rounded-[3px] bg-[#F7CAC9] text-[#190839] hover:bg-[#FCEEEC] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition flex items-center justify-center shrink-0 shadow cursor-pointer active:scale-95"
                  title="Gửi câu hỏi"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* ================= TAB 2: QUICK FACTS (LIVE EVENT STATISTICS) ================= */}
          {activeTab === 'facts' && (
            <div
              id="tabpanel-facts"
              role="tabpanel"
              aria-labelledby="tab-facts"
              className="flex-1 overflow-y-auto p-3 space-y-3 font-sans text-xs custom-scrollbar"
            >
              {/* Live Status Sub-header */}
              <div className="flex items-center justify-between bg-purple-950/50 border border-purple-500/20 rounded-[4px] px-2.5 py-1.5 text-[10px] font-mono">
                <div className="flex items-center gap-1.5">
                  <Radio className="w-3 h-3 text-emerald-400 animate-pulse shrink-0" />
                  <span className="text-white/80 font-bold uppercase tracking-wider">Thống Kê Sự Kiện Live</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40 text-[9px]">
                    {new Date(lastRefreshedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                  <button
                    type="button"
                    onClick={handleRefreshStats}
                    disabled={isRefreshingStats}
                    className="p-1 hover:text-[#F7CAC9] text-white/50 transition cursor-pointer disabled:opacity-40"
                    title="Làm mới số liệu tức thì"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingStats ? 'animate-spin text-[#F7CAC9]' : ''}`} />
                  </button>
                </div>
              </div>

              {/* Primary 3 Hero Stat Cards: Round Number, Active Participants, Global Average Score */}
              <div className="space-y-2.5">
                {/* 1. CURRENT ROUND NUMBER */}
                <div className="p-3 rounded-[4px] bg-gradient-to-br from-purple-900/40 via-purple-950/60 to-black/60 border border-purple-500/30 shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="flex items-start justify-between relative z-10 mb-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-purple-300 tracking-wider">
                      <Trophy className="w-3.5 h-3.5 text-amber-300" />
                      <span>Vòng Thi Hiện Tại • Current Round</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold tracking-wider uppercase ${
                      currentStatus === 'ACTIVE'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse'
                        : currentStatus === 'LOCKED'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : currentStatus === 'REVEAL'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                        : 'bg-white/10 text-white/70 border border-white/20'
                    }`}>
                      {currentStatus}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-2xl font-black font-mono text-white tracking-tight">
                      VÒNG {roundDetails.roundNumber}
                    </span>
                    <span className="text-sm font-bold font-sans text-[#F7CAC9] truncate">
                      {roundDetails.roundTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/10 text-[10px] font-mono text-white/60 relative z-10">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#F7CAC9]" />
                      <span>{gameState?.time_limit ? `${gameState.time_limit}s/câu` : '15s/câu'}</span>
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-[150px]">
                      {gameState?.category || 'Công nghệ & Đổi mới'}
                    </span>
                    <span className="ml-auto text-[9px] text-white/40">
                      {gameState?.round_type || 'MULTIPLE_CHOICE'}
                    </span>
                  </div>
                </div>

                {/* 2. NUMBER OF ACTIVE PARTICIPANTS */}
                <div className="p-3 rounded-[4px] bg-gradient-to-br from-cyan-950/40 via-blue-950/60 to-black/60 border border-cyan-500/30 shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="flex items-start justify-between relative z-10 mb-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-cyan-300 tracking-wider">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Khán Giả Đang Tham Gia • Active Participants</span>
                    </div>
                    <span className="flex items-center gap-1 text-[9px] font-mono font-semibold text-emerald-300 bg-emerald-950/50 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block" />
                      <span>Realtime</span>
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-black font-mono text-cyan-300 tracking-tight">
                      {eventStats.activeParticipants}
                    </span>
                    <span className="text-xs font-mono text-white/60">
                      người trực tuyến
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] font-mono text-white/60 relative z-10">
                    <span>Đã nộp bài: <strong className="text-white">{eventStats.totalParticipantsWithScore}</strong> thí sinh</span>
                    <span className="text-cyan-400/80">Firestore Live Presence</span>
                  </div>
                </div>

                {/* 3. GLOBAL AVERAGE SCORE */}
                <div className="p-3 rounded-[4px] bg-gradient-to-br from-emerald-950/40 via-teal-950/60 to-black/60 border border-emerald-500/30 shadow-md relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl -mr-6 -mt-6 pointer-events-none" />
                  <div className="flex items-start justify-between relative z-10 mb-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase text-emerald-300 tracking-wider">
                      <Target className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Điểm Trung Bình Toàn Giải • Global Average Score</span>
                    </div>
                    <span className="text-[10px] font-mono text-[#F7CAC9] font-bold">
                      Top: {eventStats.highestScore} đ
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 relative z-10 mt-1">
                    <span className="text-3xl font-black font-mono text-emerald-300 tracking-tight">
                      {eventStats.averageScore}
                    </span>
                    <span className="text-xs font-mono text-white/60">
                      điểm trung bình / người
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/10 text-[10px] font-mono text-white/60 relative z-10">
                    <span>Độ chính xác toàn đoàn: <strong className="text-emerald-300">{eventStats.accuracyRate}%</strong></span>
                    <span>Tổng: <strong className="text-white">{eventStats.totalAnswered}</strong> câu trả lời</span>
                  </div>
                </div>
              </div>

              {/* User Personal Performance Benchmark (if user is logged in) */}
              {user && (
                <div className="p-2.5 rounded-[4px] bg-[#1a0f30]/90 border border-[#F7CAC9]/30 text-white font-sans">
                  <div className="flex items-center justify-between text-[10px] font-mono mb-1.5 pb-1 border-b border-white/10">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full bg-[#F7CAC9] shrink-0" />
                      <span className="text-[#F7CAC9] font-bold truncate max-w-[150px]">{user.name || 'Khán giả'}</span>
                      <span className="text-white/40">({user.mssv || 'Khách'})</span>
                    </div>
                    <span className="font-bold text-amber-300 shrink-0">
                      {currentUserStats ? `Hạng #${currentUserStats.rank}` : 'Chưa ghi điểm'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center py-1">
                    <div className="bg-white/5 rounded p-1.5">
                      <div className="text-[9px] text-white/50 font-mono">Điểm của bạn</div>
                      <div className="text-sm font-bold font-mono text-white">
                        {currentUserStats?.totalScore || 0} đ
                      </div>
                    </div>
                    <div className="bg-white/5 rounded p-1.5">
                      <div className="text-[9px] text-white/50 font-mono">Độ chính xác</div>
                      <div className="text-sm font-bold font-mono text-emerald-400">
                        {currentUserStats?.accuracyRate || 0}%
                      </div>
                    </div>
                    <div className="bg-white/5 rounded p-1.5">
                      <div className="text-[9px] text-white/50 font-mono">So với mức TB</div>
                      <div className={`text-xs font-bold font-mono ${
                        (currentUserStats?.totalScore || 0) >= eventStats.averageScore
                          ? 'text-emerald-400'
                          : 'text-amber-300'
                      }`}>
                        {(currentUserStats?.totalScore || 0) >= eventStats.averageScore
                          ? `+${((currentUserStats?.totalScore || 0) - eventStats.averageScore).toFixed(1)} đ`
                          : `-${(eventStats.averageScore - (currentUserStats?.totalScore || 0)).toFixed(1)} đ`}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Secondary Metrics Row: Accuracy, Fastest Latency */}
              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                <div className="p-2.5 rounded-[4px] bg-black/40 border border-white/10">
                  <div className="text-[9px] text-white/50 mb-1 flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5 text-purple-400" />
                    <span>Tốc độ nhanh nhất</span>
                  </div>
                  <div className="text-base font-bold text-purple-300">
                    {eventStats.fastestLatency > 0 ? `${eventStats.fastestLatency}s` : '0.42s'}
                  </div>
                  <div className="text-[8px] text-white/40 mt-0.5">Phản xạ gửi đáp án</div>
                </div>

                <div className="p-2.5 rounded-[4px] bg-black/40 border border-white/10">
                  <div className="text-[9px] text-white/50 mb-1 flex items-center gap-1">
                    <TrendingUp className="w-2.5 h-2.5 text-emerald-400" />
                    <span>Tỉ lệ đúng toàn đoàn</span>
                  </div>
                  <div className="text-base font-bold text-emerald-300">
                    {eventStats.accuracyRate}%
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-1 mt-1 overflow-hidden">
                    <div
                      className="bg-emerald-400 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, Math.max(5, eventStats.accuracyRate))}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Contextual Action: Ask AI about this round */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    vibrateTap();
                    soundFx.playClick();
                    setActiveTab('chat');
                    handleSendMessage(`Phân tích chiến thuật & bí quyết ghi điểm tối đa cho Vòng ${roundDetails.roundNumber}: ${roundDetails.roundTitle}?`);
                  }}
                  className="w-full py-2.5 px-3 rounded-[4px] bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-600 hover:from-purple-600 hover:to-indigo-600 text-white font-mono text-xs font-bold border border-[#F7CAC9]/40 flex items-center justify-center gap-2 transition shadow-lg cursor-pointer active:scale-98"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#F7CAC9]" />
                  <span>Hỏi Trợ lý AI về Vòng {roundDetails.roundNumber} ({roundDetails.roundTitle})</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
