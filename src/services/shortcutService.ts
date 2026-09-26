import { soundFx } from './audioEffects';

export type ShortcutCategory = 'HOST_CONTROL' | 'NAVIGATION' | 'OVERLAY_TOOLS' | 'TABS';

export type ShortcutProfileId = 'BROADCAST_HOST' | 'CLASSIC_OLYMPIA' | 'CUSTOM';

export interface KeyCombo {
  key: string;            // e.g. 'Space', '1', 'a', 'ArrowRight', 'Escape', 'Enter'
  code?: string;           // e.g. 'Space', 'Digit1', 'KeyA'
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  label?: string;          // Human-readable label, e.g. "SPACE", "1", "Ctrl + Shift + X"
}

export interface ShortcutDefinition {
  id: string;
  category: ShortcutCategory;
  name: string;
  description: string;
  defaultCombos: Record<ShortcutProfileId, KeyCombo[]>;
  currentCombos: KeyCombo[];
  badgeColor?: string;
  iconName?: string;
  isHostCommand?: boolean;
  priorityOrder?: number;
}

export interface ShortcutActionHandlers {
  // Common Host Commands (Keys 1-4, Space)
  togglePlayPauseTimer?: () => void | Promise<void>;
  cycleMasterState?: () => void | Promise<void>;
  startQuestion?: () => void | Promise<void>;
  pauseResumeTimer?: () => void | Promise<void>;
  lockVoting?: () => void | Promise<void>;
  revealResults?: () => void | Promise<void>;
  returnToStandby?: () => void | Promise<void>;
  toggleLobbyLock?: () => void | Promise<void>;

  // Navigation & Data
  navigateNextQuestion?: () => void | Promise<void>;
  navigatePrevQuestion?: () => void | Promise<void>;
  toggleLeaderboard?: () => void | Promise<void>;
  clearCurrentResponses?: () => void | Promise<void>;
  clearAllResponses?: () => void | Promise<void>;
  toggleAutoClearResponses?: () => void | Promise<void>;

  // Overlays & Screen Tools
  toggleQr?: () => void | Promise<void>;
  toggleQrDiagnostics?: () => void | Promise<void>;
  openEmergencyPoll?: () => void | Promise<void>;
  openAnnouncerModal?: () => void | Promise<void>;
  openUrgentBroadcastModal?: () => void | Promise<void>;
  toggleWordCloud?: () => void | Promise<void>;
  eliminateRandom2Options?: () => void | Promise<void>;
  toggleTurboTimer?: () => void | Promise<void>;
  toggleFullscreen?: () => void | Promise<void>;
  openShortcutsModal?: () => void | Promise<void>;
  closeModals?: () => void | boolean | Promise<void>;

  // Tabs
  switchTab?: (tabKey: string) => void;
}

const STORAGE_KEY_PROFILE = 'bti_admin_shortcut_profile_v1';
const STORAGE_KEY_CUSTOM_BINDINGS = 'bti_admin_custom_shortcuts_v1';
const STORAGE_KEY_ENABLED = 'bti_admin_shortcuts_enabled_v1';

// Default Master Shortcut Registry
const DEFAULT_SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  // ================= 1. HOST COMMANDS & CORE BROADCAST =================
  {
    id: 'TOGGLE_PLAY_PAUSE',
    category: 'HOST_CONTROL',
    name: 'Phím [Space] - Tiến Bước Chu Trình (Master Next Step)',
    description: 'Tự động tiến bước chu trình trận đấu: 1. Bắt đầu -> 2. Khóa -> 3. Công bố -> 4. Câu tiếp theo',
    badgeColor: 'amber',
    isHostCommand: true,
    priorityOrder: 1,
    defaultCombos: {
      BROADCAST_HOST: [{ key: ' ', code: 'Space', label: 'SPACE' }],
      CLASSIC_OLYMPIA: [{ key: ' ', code: 'Space', label: 'SPACE' }],
      CUSTOM: [{ key: ' ', code: 'Space', label: 'SPACE' }]
    },
    currentCombos: [{ key: ' ', code: 'Space', label: 'SPACE' }]
  },
  {
    id: 'HOST_CMD_1_START',
    category: 'HOST_CONTROL',
    name: 'Phím [1] - Phát Câu Hỏi & Bắt Đầu (Start Active)',
    description: 'Bắt đầu tính giờ và mở cổng bình chọn cho toàn bộ khán giả',
    badgeColor: 'emerald',
    isHostCommand: true,
    priorityOrder: 2,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: '1', label: '1' },
        { key: 'a', label: 'A' },
        { key: 'A', label: 'A' },
        { key: 'Enter', label: 'ENTER' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'a', label: 'A' },
        { key: 'A', label: 'A' },
        { key: 'Enter', label: 'ENTER' }
      ],
      CUSTOM: [{ key: '1', label: '1' }]
    },
    currentCombos: [
      { key: '1', label: '1' },
      { key: 'a', label: 'A' },
      { key: 'Enter', label: 'ENTER' }
    ]
  },
  {
    id: 'HOST_CMD_2_PAUSE',
    category: 'HOST_CONTROL',
    name: 'Phím [2 / P] - Đóng Băng / Tiếp Tục Giờ (Pause / Resume)',
    description: 'Đóng băng đồng hồ đếm ngược tức thì khi MC cần hội ý hoặc giải thích câu hỏi',
    badgeColor: 'amber',
    isHostCommand: true,
    priorityOrder: 3,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: '2', label: '2' },
        { key: 'p', label: 'P' },
        { key: 'P', label: 'P' }
      ],
      CLASSIC_OLYMPIA: [
        { key: '2', label: '2' },
        { key: 'p', label: 'P' }
      ],
      CUSTOM: [{ key: '2', label: '2' }, { key: 'p', label: 'P' }]
    },
    currentCombos: [
      { key: '2', label: '2' },
      { key: 'p', label: 'P' }
    ]
  },
  {
    id: 'HOST_CMD_3_LOCK',
    category: 'HOST_CONTROL',
    name: 'Phím [3] - Chốt Đáp Án Ngay (Force Lock)',
    description: 'Khóa cổng nhận bình chọn tức thì và ngưng nhận đáp án từ khán giả',
    badgeColor: 'rose',
    isHostCommand: true,
    priorityOrder: 4,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: '3', label: '3' },
        { key: 'l', label: 'L' },
        { key: 'L', label: 'L' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'l', label: 'L' },
        { key: 'L', label: 'L' }
      ],
      CUSTOM: [{ key: '3', label: '3' }]
    },
    currentCombos: [
      { key: '3', label: '3' },
      { key: 'l', label: 'L' }
    ]
  },
  {
    id: 'HOST_CMD_4_REVEAL',
    category: 'HOST_CONTROL',
    name: 'Phím [4] - Công Bố Đáp Án & Điểm Số (Reveal)',
    description: 'Mở khóa đáp án chính xác trên Màn Chiếu & cộng điểm cho khán giả trả lời đúng',
    badgeColor: 'blue',
    isHostCommand: true,
    priorityOrder: 5,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: '4', label: '4' },
        { key: 'r', label: 'R' },
        { key: 'R', label: 'R' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'r', label: 'R' },
        { key: 'R', label: 'R' }
      ],
      CUSTOM: [{ key: '4', label: '4' }]
    },
    currentCombos: [
      { key: '4', label: '4' },
      { key: 'r', label: 'R' }
    ]
  },
  {
    id: 'HOST_CMD_5_STANDBY',
    category: 'HOST_CONTROL',
    name: 'Phím [5] - Đưa Về Chế Độ Chờ (Standby)',
    description: 'Đặt lại trạng thái câu hỏi về Standby sẵn sàng thi đấu lại',
    badgeColor: 'slate',
    isHostCommand: true,
    priorityOrder: 6,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: '5', label: '5' },
        { key: 's', label: 'S' },
        { key: 'S', label: 'S' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 's', label: 'S' },
        { key: 'S', label: 'S' }
      ],
      CUSTOM: [{ key: '5', label: '5' }]
    },
    currentCombos: [
      { key: '5', label: '5' },
      { key: 's', label: 'S' }
    ]
  },
  {
    id: 'HOST_CMD_6_LOBBY',
    category: 'HOST_CONTROL',
    name: 'Phím [6] - Khóa / Mở Cổng Tham Gia (Lobby Lock)',
    description: 'Chặn hoặc cho phép khán giả mới tham gia phòng thi đấu',
    badgeColor: 'purple',
    isHostCommand: true,
    priorityOrder: 7,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '6', label: '6' }],
      CLASSIC_OLYMPIA: [{ key: 'l', label: 'Alt + L', altKey: true }],
      CUSTOM: [{ key: '6', label: '6' }]
    },
    currentCombos: [{ key: '6', label: '6' }]
  },
  {
    id: 'MASTER_CYCLE_FLOW',
    category: 'HOST_CONTROL',
    name: 'Chu Trình Trận Đấu (Shift + Space)',
    description: 'Chuyển đổi tuần tự 4 bước: Chờ (Standby) -> Thi đấu (Active) -> Khóa (Locked) -> Công bố (Reveal)',
    badgeColor: 'indigo',
    priorityOrder: 8,
    defaultCombos: {
      BROADCAST_HOST: [{ key: ' ', code: 'Space', shiftKey: true, label: 'Shift + SPACE' }],
      CLASSIC_OLYMPIA: [{ key: ' ', code: 'Space', shiftKey: true, label: 'Shift + SPACE' }],
      CUSTOM: [{ key: ' ', code: 'Space', shiftKey: true, label: 'Shift + SPACE' }]
    },
    currentCombos: [{ key: ' ', code: 'Space', shiftKey: true, label: 'Shift + SPACE' }]
  },

  // ================= 2. NAVIGATION & DATA CLEARING =================
  {
    id: 'NAV_NEXT_QUESTION',
    category: 'NAVIGATION',
    name: 'Nạp Câu Hỏi Kế Tiếp',
    description: 'Chuyển sang câu hỏi kế tiếp trong danh sách ngân hàng đề thi',
    badgeColor: 'cyan',
    priorityOrder: 9,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'ArrowRight', label: '→' },
        { key: 'n', label: 'N' },
        { key: 'N', label: 'N' },
        { key: 'PageDown', label: 'PgDn' },
        { key: ']', label: ']' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'ArrowRight', label: '→' },
        { key: 'n', label: 'N' },
        { key: 'PageDown', label: 'PgDn' }
      ],
      CUSTOM: [{ key: 'ArrowRight', label: '→' }]
    },
    currentCombos: [
      { key: 'ArrowRight', label: '→' },
      { key: 'n', label: 'N' },
      { key: 'PageDown', label: 'PgDn' }
    ]
  },
  {
    id: 'NAV_PREV_QUESTION',
    category: 'NAVIGATION',
    name: 'Nạp Câu Hỏi Trước Đó',
    description: 'Quay lại câu hỏi trước đó trong danh sách ngân hàng',
    badgeColor: 'cyan',
    priorityOrder: 10,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'ArrowLeft', label: '←' },
        { key: 'p', label: 'P' },
        { key: 'P', label: 'P' },
        { key: 'PageUp', label: 'PgUp' },
        { key: '[', label: '[' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'ArrowLeft', label: '←' },
        { key: 'p', label: 'P' },
        { key: 'PageUp', label: 'PgUp' }
      ],
      CUSTOM: [{ key: 'ArrowLeft', label: '←' }]
    },
    currentCombos: [
      { key: 'ArrowLeft', label: '←' },
      { key: 'p', label: 'P' },
      { key: 'PageUp', label: 'PgUp' }
    ]
  },
  {
    id: 'TOGGLE_LEADERBOARD',
    category: 'NAVIGATION',
    name: 'Bảng Tổng Kết Điểm (Leaderboard)',
    description: 'Bật hoặc tắt bảng xếp hạng khán giả & điểm số trên Màn Chiếu',
    badgeColor: 'amber',
    priorityOrder: 11,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'b', label: 'B' },
        { key: 'B', label: 'B' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'b', label: 'B' },
        { key: 'B', label: 'B' }
      ],
      CUSTOM: [{ key: 'b', label: 'B' }]
    },
    currentCombos: [{ key: 'b', label: 'B' }]
  },
  {
    id: 'CLEAR_CURRENT_RESPONSES',
    category: 'NAVIGATION',
    name: 'Xóa Phản Hồi Câu Hiện Tại',
    description: 'Xóa sạch tất cả các câu trả lời của câu hỏi đang chọn để sẵn sàng thi lại',
    badgeColor: 'rose',
    priorityOrder: 12,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'x', label: 'X' },
        { key: 'X', label: 'X' },
        { key: 'Delete', label: 'Delete' },
        { key: 'Backspace', label: 'Backspace' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'x', label: 'X' },
        { key: 'Delete', label: 'Delete' }
      ],
      CUSTOM: [{ key: 'x', label: 'X' }]
    },
    currentCombos: [
      { key: 'x', label: 'X' },
      { key: 'Delete', label: 'Delete' }
    ]
  },
  {
    id: 'CLEAR_ALL_RESPONSES',
    category: 'NAVIGATION',
    name: 'Reset Toàn Bộ Điểm Số (Global Reset)',
    description: 'Xóa sạch tất cả phản hồi ở mọi vòng và đưa bảng điểm tất cả khán giả về 0',
    badgeColor: 'rose',
    priorityOrder: 13,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'x', ctrlKey: true, shiftKey: true, label: 'Ctrl + Shift + X' },
        { key: 'X', ctrlKey: true, shiftKey: true, label: 'Ctrl + Shift + X' },
        { key: 'Delete', ctrlKey: true, shiftKey: true, label: 'Ctrl + Shift + Delete' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'x', ctrlKey: true, shiftKey: true, label: 'Ctrl + Shift + X' }
      ],
      CUSTOM: [{ key: 'x', ctrlKey: true, shiftKey: true, label: 'Ctrl + Shift + X' }]
    },
    currentCombos: [{ key: 'x', ctrlKey: true, shiftKey: true, label: 'Ctrl + Shift + X' }]
  },
  {
    id: 'TOGGLE_AUTO_CLEAR',
    category: 'NAVIGATION',
    name: 'Bật / Tắt Tự Động Xóa Khi Chuyển Câu',
    description: 'Tự động dọn dẹp phản hồi cũ mỗi khi Host chuyển sang câu hỏi mới',
    badgeColor: 'emerald',
    priorityOrder: 14,
    defaultCombos: {
      BROADCAST_HOST: [{ key: 'c', shiftKey: true, label: 'Shift + C' }],
      CLASSIC_OLYMPIA: [{ key: 'c', shiftKey: true, label: 'Shift + C' }],
      CUSTOM: [{ key: 'c', shiftKey: true, label: 'Shift + C' }]
    },
    currentCombos: [{ key: 'c', shiftKey: true, label: 'Shift + C' }]
  },

  // ================= 3. OVERLAY TOOLS & BROADCAST =================
  {
    id: 'TOGGLE_QR',
    category: 'OVERLAY_TOOLS',
    name: 'Bật / Tắt Mã QR Khán Giả',
    description: 'Hiển thị mã QR cỡ lớn trên Màn Chiếu để khán giả quét vào phòng thi đấu',
    badgeColor: 'sky',
    priorityOrder: 15,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'q', label: 'Q' },
        { key: 'Q', label: 'Q' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'q', label: 'Q' },
        { key: 'Q', label: 'Q' }
      ],
      CUSTOM: [{ key: 'q', label: 'Q' }]
    },
    currentCombos: [{ key: 'q', label: 'Q' }]
  },
  {
    id: 'TOGGLE_QR_DIAGNOSTICS',
    category: 'OVERLAY_TOOLS',
    name: 'Mở Bảng Chẩn Đoán & Logs QR',
    description: 'Xem chi tiết lượt quét, độ trễ và sự cố mạng khi QR đang mở',
    badgeColor: 'emerald',
    priorityOrder: 16,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'd', label: 'D' },
        { key: 'D', label: 'D' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'd', label: 'D' }
      ],
      CUSTOM: [{ key: 'd', label: 'D' }]
    },
    currentCombos: [{ key: 'd', label: 'D' }]
  },
  {
    id: 'EMERGENCY_POLL',
    category: 'OVERLAY_TOOLS',
    name: 'Khảo Sát Khẩn Cấp (Flash Poll Yes/No)',
    description: 'Mở biểu quyết nhanh 15 giây cho toàn bộ hội trường',
    badgeColor: 'rose',
    priorityOrder: 17,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'k', label: 'K' },
        { key: 'K', label: 'K' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'k', label: 'K' }
      ],
      CUSTOM: [{ key: 'k', label: 'K' }]
    },
    currentCombos: [{ key: 'k', label: 'K' }]
  },
  {
    id: 'ANNOUNCER_OVERLAY',
    category: 'OVERLAY_TOOLS',
    name: 'Phát Chữ Chạy Màn Chiếu (Announcer Marquee)',
    description: 'Bật chữ chạy tin nhắn hoặc hiệu lệnh MC ngang đáy màn hình',
    badgeColor: 'cyan',
    priorityOrder: 18,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'o', label: 'O' },
        { key: 'O', label: 'O' },
        { key: 'a', shiftKey: true, label: 'Shift + A' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'o', label: 'O' },
        { key: 'a', shiftKey: true, label: 'Shift + A' }
      ],
      CUSTOM: [{ key: 'o', label: 'O' }]
    },
    currentCombos: [
      { key: 'o', label: 'O' },
      { key: 'a', shiftKey: true, label: 'Shift + A' }
    ]
  },
  {
    id: 'URGENT_BROADCAST',
    category: 'OVERLAY_TOOLS',
    name: 'Trung Tâm Phát Tin Khẩn Cấp (Broadcast Hub)',
    description: 'Gửi thông báo âm thanh & rung tới toàn bộ điện thoại khán giả',
    badgeColor: 'purple',
    priorityOrder: 19,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'm', label: 'M' },
        { key: 'M', label: 'M' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'm', label: 'M' }
      ],
      CUSTOM: [{ key: 'm', label: 'M' }]
    },
    currentCombos: [{ key: 'm', label: 'M' }]
  },
  {
    id: 'WORD_CLOUD',
    category: 'OVERLAY_TOOLS',
    name: 'Bật / Tắt Đám Mây Từ Khóa (Word Cloud)',
    description: 'Hiển thị đám mây từ khóa theo thời gian thực từ câu trả lời tự luận',
    badgeColor: 'pink',
    priorityOrder: 20,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'w', label: 'W' },
        { key: 'W', label: 'W' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'w', label: 'W' }
      ],
      CUSTOM: [{ key: 'w', label: 'W' }]
    },
    currentCombos: [{ key: 'w', label: 'W' }]
  },
  {
    id: 'ELIMINATE_2',
    category: 'OVERLAY_TOOLS',
    name: 'Loại Trừ 2 Phương Án Sai (Vòng 3)',
    description: 'Quyền trợ giúp ngẫu nhiên loại bỏ 2 đáp án sai cho toàn bộ thí sinh',
    badgeColor: 'amber',
    priorityOrder: 21,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 'e', label: 'E' },
        { key: 'E', label: 'E' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 'e', label: 'E' }
      ],
      CUSTOM: [{ key: 'e', label: 'E' }]
    },
    currentCombos: [{ key: 'e', label: 'E' }]
  },
  {
    id: 'TURBO_TIMER',
    category: 'OVERLAY_TOOLS',
    name: 'Bắt Đầu / Khóa Tăng Tốc (Turbo Timer)',
    description: 'Bắt đầu nhanh hoặc khóa đồng hồ vòng Tăng Tốc',
    badgeColor: 'amber',
    priorityOrder: 22,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: 't', label: 'T' },
        { key: 'T', label: 'T' }
      ],
      CLASSIC_OLYMPIA: [
        { key: 't', label: 'T' }
      ],
      CUSTOM: [{ key: 't', label: 'T' }]
    },
    currentCombos: [{ key: 't', label: 'T' }]
  },
  {
    id: 'OPEN_SHORTCUTS',
    category: 'OVERLAY_TOOLS',
    name: 'Mở Bảng Ánh Xạ Phím Tắt & Cấu Hình Hotkeys',
    description: 'Tra cứu phím tắt, đổi phím và kiểm tra phản hồi phím trực tiếp',
    badgeColor: 'purple',
    priorityOrder: 23,
    defaultCombos: {
      BROADCAST_HOST: [
        { key: '?', label: '?' },
        { key: '/', shiftKey: true, label: 'Shift + /' },
        { key: 'F1', label: 'F1' },
        { key: 'h', label: 'H' },
        { key: 'H', label: 'H' }
      ],
      CLASSIC_OLYMPIA: [
        { key: '?', label: '?' },
        { key: 'F1', label: 'F1' }
      ],
      CUSTOM: [{ key: '?', label: '?' }]
    },
    currentCombos: [
      { key: '?', label: '?' },
      { key: 'F1', label: 'F1' },
      { key: 'h', label: 'H' }
    ]
  },
  {
    id: 'CLOSE_MODALS',
    category: 'OVERLAY_TOOLS',
    name: 'Đóng Hộp Thoại / Huỷ Thao Tác (Esc)',
    description: 'Đóng ngay lập tức bất kỳ popup, modal, bảng khảo sát, chẩn đoán hoặc form tạo câu hỏi đang mở',
    badgeColor: 'slate',
    priorityOrder: 24,
    defaultCombos: {
      BROADCAST_HOST: [{ key: 'Escape', label: 'ESC' }],
      CLASSIC_OLYMPIA: [{ key: 'Escape', label: 'ESC' }],
      CUSTOM: [{ key: 'Escape', label: 'ESC' }]
    },
    currentCombos: [{ key: 'Escape', label: 'ESC' }]
  },

  // ================= 4. TAB SWITCHING =================
  {
    id: 'TAB_1_KDC',
    category: 'TABS',
    name: 'Chuyển Tab: 1. Khởi Động Chung',
    description: 'Mở danh sách câu hỏi vòng 1 (45 câu Khởi Động)',
    badgeColor: 'sky',
    priorityOrder: 25,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '1', altKey: true, label: 'Alt + 1' }],
      CLASSIC_OLYMPIA: [{ key: '1', label: '1' }],
      CUSTOM: [{ key: '1', altKey: true, label: 'Alt + 1' }]
    },
    currentCombos: [{ key: '1', altKey: true, label: 'Alt + 1' }]
  },
  {
    id: 'TAB_2_VCNV',
    category: 'TABS',
    name: 'Chuyển Tab: 2. Vượt Chướng Ngại Vật',
    description: 'Mở giao diện lật mở 4 hàng ngang và từ khóa CNV',
    badgeColor: 'emerald',
    priorityOrder: 26,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '2', altKey: true, label: 'Alt + 2' }],
      CLASSIC_OLYMPIA: [{ key: '2', label: '2' }],
      CUSTOM: [{ key: '2', altKey: true, label: 'Alt + 2' }]
    },
    currentCombos: [{ key: '2', altKey: true, label: 'Alt + 2' }]
  },
  {
    id: 'TAB_3_TT',
    category: 'TABS',
    name: 'Chuyển Tab: 3. Tăng Tốc',
    description: 'Mở giao diện 4 câu Tăng Tốc xếp hạng thời gian',
    badgeColor: 'amber',
    priorityOrder: 27,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '3', altKey: true, label: 'Alt + 3' }],
      CLASSIC_OLYMPIA: [{ key: '3', label: '3' }],
      CUSTOM: [{ key: '3', altKey: true, label: 'Alt + 3' }]
    },
    currentCombos: [{ key: '3', altKey: true, label: 'Alt + 3' }]
  },
  {
    id: 'TAB_4_VD',
    category: 'TABS',
    name: 'Chuyển Tab: 4. Về Đích',
    description: 'Mở gói câu hỏi Về Đích phân cấp điểm số',
    badgeColor: 'rose',
    priorityOrder: 28,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '4', altKey: true, label: 'Alt + 4' }],
      CLASSIC_OLYMPIA: [{ key: '4', label: '4' }],
      CUSTOM: [{ key: '4', altKey: true, label: 'Alt + 4' }]
    },
    currentCombos: [{ key: '4', altKey: true, label: 'Alt + 4' }]
  },
  {
    id: 'TAB_5_QUESTIONS',
    category: 'TABS',
    name: 'Chuyển Tab: 5. Ngân Hàng Câu Hỏi',
    description: 'Quản trị và nạp nhanh tất cả câu hỏi trong cơ sở dữ liệu',
    badgeColor: 'purple',
    priorityOrder: 29,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '5', altKey: true, label: 'Alt + 5' }],
      CLASSIC_OLYMPIA: [{ key: '5', label: '5' }],
      CUSTOM: [{ key: '5', altKey: true, label: 'Alt + 5' }]
    },
    currentCombos: [{ key: '5', altKey: true, label: 'Alt + 5' }]
  },
  {
    id: 'TAB_6_STATS',
    category: 'TABS',
    name: 'Chuyển Tab: 6. Thống Kê Toàn Diện & Logs',
    description: 'Xem biểu đồ phân phối đáp án, độ trễ và logs SPSS',
    badgeColor: 'indigo',
    priorityOrder: 30,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '6', altKey: true, label: 'Alt + 6' }],
      CLASSIC_OLYMPIA: [{ key: '6', label: '6' }],
      CUSTOM: [{ key: '6', altKey: true, label: 'Alt + 6' }]
    },
    currentCombos: [{ key: '6', altKey: true, label: 'Alt + 6' }]
  },
  {
    id: 'TAB_7_LUCKY_DRAW',
    category: 'TABS',
    name: 'Chuyển Tab: 7. Quay Số Trúng Thưởng',
    description: 'Vòng quay may mắn chọn khán giả nhận quà',
    badgeColor: 'amber',
    priorityOrder: 31,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '7', altKey: true, label: 'Alt + 7' }],
      CLASSIC_OLYMPIA: [{ key: '7', label: '7' }],
      CUSTOM: [{ key: '7', altKey: true, label: 'Alt + 7' }]
    },
    currentCombos: [{ key: '7', altKey: true, label: 'Alt + 7' }]
  },
  {
    id: 'TAB_8_POLL_HISTORY',
    category: 'TABS',
    name: 'Chuyển Tab: 8. Lịch Sử Khảo Sát',
    description: 'Xem kết quả các phiên biểu quyết Yes/No đã diễn ra',
    badgeColor: 'cyan',
    priorityOrder: 32,
    defaultCombos: {
      BROADCAST_HOST: [{ key: '8', altKey: true, label: 'Alt + 8' }],
      CLASSIC_OLYMPIA: [{ key: '8', label: '8' }],
      CUSTOM: [{ key: '8', altKey: true, label: 'Alt + 8' }]
    },
    currentCombos: [{ key: '8', altKey: true, label: 'Alt + 8' }]
  }
];

class ShortcutService {
  private shortcuts: ShortcutDefinition[] = [];
  private activeProfile: ShortcutProfileId = 'BROADCAST_HOST';
  private enabled: boolean = true;
  private listeners: Array<() => void> = [];

  constructor() {
    this.init();
  }

  private init() {
    // 1. Load active profile
    if (typeof window !== 'undefined') {
      try {
        const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE) as ShortcutProfileId | null;
        if (savedProfile && ['BROADCAST_HOST', 'CLASSIC_OLYMPIA', 'CUSTOM'].includes(savedProfile)) {
          this.activeProfile = savedProfile;
        }

        const savedEnabled = localStorage.getItem(STORAGE_KEY_ENABLED);
        if (savedEnabled !== null) {
          this.enabled = savedEnabled === 'true';
        }
      } catch (e) {
        console.warn('Failed to load shortcut preferences', e);
      }
    }

    // 2. Load shortcut definitions & merge with profile defaults or custom bindings
    this.applyProfile(this.activeProfile, false);
  }

  public getActiveProfile(): ShortcutProfileId {
    return this.activeProfile;
  }

  public setActiveProfile(profileId: ShortcutProfileId) {
    this.activeProfile = profileId;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_PROFILE, profileId);
      } catch (e) {}
    }
    this.applyProfile(profileId, true);
    this.notifyListeners();
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_ENABLED, String(enabled));
      } catch (e) {}
    }
    this.notifyListeners();
  }

  private applyProfile(profileId: ShortcutProfileId, resetCustom: boolean = false) {
    let customBindings: Record<string, KeyCombo[]> = {};
    if (!resetCustom && typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_BINDINGS);
        if (raw) {
          customBindings = JSON.parse(raw);
        }
      } catch (e) {}
    }

    this.shortcuts = DEFAULT_SHORTCUT_DEFINITIONS.map(def => {
      let combos: KeyCombo[] = [];
      if (profileId === 'CUSTOM' && customBindings[def.id]) {
        combos = customBindings[def.id];
      } else {
        combos = def.defaultCombos[profileId] || def.defaultCombos['BROADCAST_HOST'] || [];
      }

      return {
        ...def,
        currentCombos: combos.length > 0 ? combos : [{ key: '', label: 'Chưa gán' }]
      };
    });
  }

  public getAllShortcuts(): ShortcutDefinition[] {
    return [...this.shortcuts];
  }

  public getShortcutById(id: string): ShortcutDefinition | undefined {
    return this.shortcuts.find(s => s.id === id);
  }

  public updateShortcutCombos(id: string, newCombos: KeyCombo[]) {
    this.shortcuts = this.shortcuts.map(s => {
      if (s.id === id) {
        return {
          ...s,
          currentCombos: newCombos.length > 0 ? newCombos : [{ key: '', label: 'Chưa gán' }]
        };
      }
      return s;
    });

    this.activeProfile = 'CUSTOM';
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_PROFILE, 'CUSTOM');
        const customMap: Record<string, KeyCombo[]> = {};
        this.shortcuts.forEach(s => {
          customMap[s.id] = s.currentCombos;
        });
        localStorage.setItem(STORAGE_KEY_CUSTOM_BINDINGS, JSON.stringify(customMap));
      } catch (e) {}
    }

    this.notifyListeners();
  }

  public resetToDefaults(profileId: ShortcutProfileId = 'BROADCAST_HOST') {
    this.setActiveProfile(profileId);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_CUSTOM_BINDINGS);
      } catch (e) {}
    }
  }

  public subscribe(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach(l => l());
  }

  /** Formats a KeyboardEvent into human-readable label and KeyCombo */
  public parseKeyComboFromEvent(e: KeyboardEvent): KeyCombo {
    const isShift = e.shiftKey;
    const isCtrl = e.ctrlKey;
    const isAlt = e.altKey;
    const isMeta = e.metaKey;

    let key = e.key;
    if (key === ' ') key = 'Space';

    const parts: string[] = [];
    if (isCtrl) parts.push('Ctrl');
    if (isAlt) parts.push('Alt');
    if (isShift) parts.push('Shift');
    if (isMeta) parts.push('Meta');

    // Only add key if it's not a pure modifier
    if (!['Control', 'Shift', 'Alt', 'Meta'].includes(key)) {
      if (key === 'Space') {
        parts.push('SPACE');
      } else if (key === 'ArrowRight') {
        parts.push('→');
      } else if (key === 'ArrowLeft') {
        parts.push('←');
      } else if (key === 'ArrowUp') {
        parts.push('↑');
      } else if (key === 'ArrowDown') {
        parts.push('↓');
      } else {
        parts.push(key.toUpperCase());
      }
    }

    return {
      key: e.key,
      code: e.code,
      ctrlKey: isCtrl,
      shiftKey: isShift,
      altKey: isAlt,
      metaKey: isMeta,
      label: parts.join(' + ')
    };
  }

  /**
   * Matches an incoming KeyboardEvent against registered combos for an action
   */
  public matchesEvent(combo: KeyCombo, e: KeyboardEvent): boolean {
    if (!combo.key && !combo.code) return false;

    const ctrlMatch = Boolean(combo.ctrlKey) === Boolean(e.ctrlKey);
    const altMatch = Boolean(combo.altKey) === Boolean(e.altKey);
    const metaMatch = Boolean(combo.metaKey) === Boolean(e.metaKey);

    // If combo explicitly requires shiftKey
    let shiftMatch = true;
    if (combo.shiftKey !== undefined) {
      shiftMatch = Boolean(combo.shiftKey) === Boolean(e.shiftKey);
    }

    if (!ctrlMatch || !altMatch || !metaMatch || !shiftMatch) {
      return false;
    }

    // Match code (e.g. Space) or key
    if (combo.code && e.code && combo.code.toLowerCase() === e.code.toLowerCase()) {
      return true;
    }

    if (combo.key && e.key) {
      if (combo.key.toLowerCase() === e.key.toLowerCase()) {
        return true;
      }
      if (combo.key === ' ' && e.code === 'Space') {
        return true;
      }
    }

    return false;
  }

  /**
   * Dispatches the event against the action handlers.
   * Returns the matched ShortcutDefinition or null.
   */
  public handleGlobalKeyDown(
    e: KeyboardEvent,
    handlers: ShortcutActionHandlers,
    options: {
      triggerHudToast: (keyLabel: string, actionDesc: string) => void;
      isInputActive?: boolean;
    }
  ): ShortcutDefinition | null {
    if (!this.enabled) return null;

    // Check if user is typing in an input element (Airtight guard)
    const activeEl = document.activeElement as HTMLElement | null;
    const targetEl = e.target as HTMLElement | null;
    const isInput = options.isInputActive || Boolean(
      (activeEl && (
        activeEl.tagName === 'INPUT' ||
        activeEl.tagName === 'TEXTAREA' ||
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable ||
        Boolean(activeEl.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
      )) ||
      (targetEl && (
        targetEl.tagName === 'INPUT' ||
        targetEl.tagName === 'TEXTAREA' ||
        targetEl.tagName === 'SELECT' ||
        targetEl.isContentEditable ||
        Boolean(targetEl.closest('input, textarea, select, [contenteditable="true"], [role="textbox"]'))
      ))
    );

    // Escape / Close Modals shortcut always closes open dialogs instantly even inside input focus
    const closeShortcut = this.getShortcutById('CLOSE_MODALS');
    const isCloseMatched = (closeShortcut && closeShortcut.currentCombos.some(combo => this.matchesEvent(combo, e))) || e.key === 'Escape';

    if (isCloseMatched) {
      if (handlers.closeModals) {
        e.preventDefault();
        e.stopPropagation();
        handlers.closeModals();
        return closeShortcut || null;
      }
    }

    if (isInput) {
      return null;
    }

    // Iterate through registered shortcuts
    for (const shortcut of this.shortcuts) {
      const isMatched = shortcut.currentCombos.some(combo => this.matchesEvent(combo, e));
      if (!isMatched) continue;

      e.preventDefault();
      e.stopPropagation();

      // Trigger Haptic feedback if supported
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        try {
          navigator.vibrate(shortcut.isHostCommand ? 80 : 40);
        } catch {}
      }

      // Execute corresponding handler
      switch (shortcut.id) {
        // HOST COMMANDS
        case 'TOGGLE_PLAY_PAUSE':
          if (handlers.cycleMasterState) {
            handlers.cycleMasterState();
          } else if (handlers.togglePlayPauseTimer) {
            handlers.togglePlayPauseTimer();
          }
          break;

        case 'HOST_CMD_1_START':
          if (handlers.startQuestion) {
            handlers.startQuestion();
            options.triggerHudToast('1 / A', 'Bắt đầu câu hỏi (Start Active)');
          }
          break;

        case 'HOST_CMD_2_PAUSE':
          if (handlers.pauseResumeTimer) {
            handlers.pauseResumeTimer();
          } else if (handlers.togglePlayPauseTimer) {
            handlers.togglePlayPauseTimer();
          }
          break;

        case 'HOST_CMD_3_LOCK':
          if (handlers.lockVoting) {
            handlers.lockVoting();
            options.triggerHudToast('3 / L', 'Chốt đáp án tức thì (Lock Voting)');
          }
          break;

        case 'HOST_CMD_4_REVEAL':
          if (handlers.revealResults) {
            handlers.revealResults();
            options.triggerHudToast('4 / R', 'Công bố đáp án chính xác (Reveal)');
          }
          break;

        case 'HOST_CMD_5_STANDBY':
          if (handlers.returnToStandby) {
            handlers.returnToStandby();
            options.triggerHudToast('5 / S', 'Chuyển về Chế độ Chờ (Standby)');
          }
          break;

        case 'HOST_CMD_6_LOBBY':
          if (handlers.toggleLobbyLock) {
            handlers.toggleLobbyLock();
          }
          break;

        case 'MASTER_CYCLE_FLOW':
          if (handlers.cycleMasterState) {
            handlers.cycleMasterState();
          }
          break;

        // NAVIGATION
        case 'NAV_NEXT_QUESTION':
          if (handlers.navigateNextQuestion) {
            handlers.navigateNextQuestion();
          }
          break;

        case 'NAV_PREV_QUESTION':
          if (handlers.navigatePrevQuestion) {
            handlers.navigatePrevQuestion();
          }
          break;

        case 'TOGGLE_LEADERBOARD':
          if (handlers.toggleLeaderboard) {
            handlers.toggleLeaderboard();
          }
          break;

        case 'CLEAR_CURRENT_RESPONSES':
          if (handlers.clearCurrentResponses) {
            handlers.clearCurrentResponses();
          }
          break;

        case 'CLEAR_ALL_RESPONSES':
          if (handlers.clearAllResponses) {
            handlers.clearAllResponses();
          }
          break;

        case 'TOGGLE_AUTO_CLEAR':
          if (handlers.toggleAutoClearResponses) {
            handlers.toggleAutoClearResponses();
          }
          break;

        // OVERLAYS & TOOLS
        case 'TOGGLE_QR':
          if (handlers.toggleQr) {
            handlers.toggleQr();
          }
          break;

        case 'TOGGLE_QR_DIAGNOSTICS':
          if (handlers.toggleQrDiagnostics) {
            handlers.toggleQrDiagnostics();
          }
          break;

        case 'EMERGENCY_POLL':
          if (handlers.openEmergencyPoll) {
            handlers.openEmergencyPoll();
          }
          break;

        case 'ANNOUNCER_OVERLAY':
          if (handlers.openAnnouncerModal) {
            handlers.openAnnouncerModal();
          }
          break;

        case 'URGENT_BROADCAST':
          if (handlers.openUrgentBroadcastModal) {
            handlers.openUrgentBroadcastModal();
          }
          break;

        case 'WORD_CLOUD':
          if (handlers.toggleWordCloud) {
            handlers.toggleWordCloud();
          }
          break;

        case 'ELIMINATE_2':
          if (handlers.eliminateRandom2Options) {
            handlers.eliminateRandom2Options();
          }
          break;

        case 'TURBO_TIMER':
          if (handlers.toggleTurboTimer) {
            handlers.toggleTurboTimer();
          }
          break;

        case 'OPEN_SHORTCUTS':
          if (handlers.openShortcutsModal) {
            handlers.openShortcutsModal();
          }
          break;

        // TABS
        case 'TAB_1_KDC':
          handlers.switchTab?.('KDC');
          options.triggerHudToast('Tab 1', '1. Khởi động chung (45 câu)');
          break;
        case 'TAB_2_VCNV':
          handlers.switchTab?.('VCNV');
          options.triggerHudToast('Tab 2', '2. Vượt chướng ngại vật');
          break;
        case 'TAB_3_TT':
          handlers.switchTab?.('TT');
          options.triggerHudToast('Tab 3', '3. Tăng tốc');
          break;
        case 'TAB_4_VD':
          handlers.switchTab?.('VD');
          options.triggerHudToast('Tab 4', '4. Về đích');
          break;
        case 'TAB_5_QUESTIONS':
          handlers.switchTab?.('QUESTIONS');
          options.triggerHudToast('Tab 5', '5. Ngân hàng câu hỏi');
          break;
        case 'TAB_6_STATS':
          handlers.switchTab?.('STATS');
          options.triggerHudToast('Tab 6', '6. Thống kê toàn diện & Logs');
          break;
        case 'TAB_7_LUCKY_DRAW':
          handlers.switchTab?.('LUCKY_DRAW');
          options.triggerHudToast('Tab 7', '7. Quay số trúng thưởng');
          break;
        case 'TAB_8_POLL_HISTORY':
          handlers.switchTab?.('POLL_HISTORY');
          options.triggerHudToast('Tab 8', '8. Lịch sử khảo sát');
          break;
      }

      return shortcut;
    }

    return null;
  }
}

export const shortcutService = new ShortcutService();
