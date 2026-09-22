export type RoundType = 'MULTIPLE_CHOICE' | 'SHORT_ANSWER' | 'BLIND_POLL' | 'LOCKED' | 'SEQUENCING' | 'ELIMINATION_6' | 'VCNV' | 'TRUE_FALSE_4' | 'TRUE_FALSE' | 'FILL_IN_BLANK' | 'IMAGE_POLL';

export type GameStatus = 'STANDBY' | 'ACTIVE' | 'LOCKED' | 'REVEAL';

export type OptionKey = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface ScoreBreakdown {
  round1: number; // Khởi động chung (+10, +5 fast bonus)
  round2: number; // VCNV (Ô mạo hiểm +120, Dự đoán CNV +80)
  round3: number; // Tăng tốc (+40, +30, +20, +10 speed tiers)
  round4: number; // Về đích - Kịch tương tác / Thực hành (+40)
  [key: string]: number;
}

export interface AudienceScoreState {
  totalScore: number;
  scoreBreakdown: ScoreBreakdown;
  correctAnswersCount: number;
  totalAnswered: number;
  history?: Array<{
    questionId: string;
    roundId: string;
    pointsEarned: number;
    isCorrect: boolean;
    latencySec?: number;
    timestamp: number;
  }>;
}

export interface ScoringResult {
  isCorrect: boolean;
  partialPoints?: number; // Optional partial score override (e.g. for TRUE_FALSE_4 partial credit)
  latencySec?: number; // Response time in seconds
  speedRank?: number; // 1, 2, 3, 4+ (for Round 3 speed tiering)
  timeLimit?: number; // Total time limit of the question in seconds (e.g. 20s or 30s)
  isRiskBox?: boolean; // For Round 2 Ô Mạo Hiểm (+120)
  isCnvKeyword?: boolean; // For Round 2 Dự đoán CNV (+80)
  isDoubleDown?: boolean; // For Round 4 Về Đích All-In (+80 or -40 / -100% penalty)
  subType?: 'RISK_BOX' | 'CNV_KEYWORD' | 'STANDARD' | 'SAFE_CHOICE';
}

export interface UserInfo {
  name: string;
  mssv: string;
  gender?: string;
  birthYear?: string;
  uid: string;
  anonymizedUid?: string;
  avatarSeed?: string;
  registeredAt?: number;
  teamId?: string;
  teamName?: string;
  email?: string;
  emailVerified?: boolean;
}

export interface QuestionTranslation {
  question_text: string;
  options: Record<string, string>;
  explanation?: string;
}

export interface QuestionItem {
  id: string;
  round_name: string;
  round_type: RoundType;
  category: string;
  question_text: string;
  options: Record<string, string>;
  option_images?: Record<string, string>;
  correct_key: string;
  explanation: string;
  media_type?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'NONE';
  media_url?: string;
  media_autoplay?: boolean;
  time_limit: number; // in seconds
  eliminated_options?: string[]; // for Round 3 elimination
  blind_prompt?: string;
  likes?: number;
  liked_by?: string[];
  translations?: Record<string, QuestionTranslation>;
}

export type EmergencyPollSourceType = 'ADVISOR' | 'CONTESTANT' | 'JURY' | 'AUDIENCE' | 'HOST';

export interface EmergencyPoll {
  id: string;
  question: string;
  type: 'YES_NO' | 'TRUE_FALSE' | 'CUSTOM_2' | 'AGREE_DISAGREE' | 'MULTIPLE_CHOICE' | string;
  options: Record<string, string>; // e.g. { A: '...', B: '...', C: '...', D: '...' }
  status: 'ACTIVE' | 'LOCKED' | 'REVEALED' | 'DISMISSED';
  time_limit: number; // in seconds, 0 = unlimited / manual
  server_start_time: number;
  created_at: number;
  source_type?: EmergencyPollSourceType;
  source_name?: string; // e.g. "TS. Nguyễn Văn A - Cố vấn", "Thí sinh Hoàng Nam"
  context_note?: string; // e.g. "Phản biện tình huống Round 2"
  correct_option?: string; // e.g. "A" or "B" or "C" (optional)
  counts?: Record<string, number>;
  percentages?: Record<string, number>;
}

export interface EmergencyPollHistoryItem {
  id: string;
  question: string;
  type: 'YES_NO' | 'TRUE_FALSE' | 'CUSTOM_2' | 'AGREE_DISAGREE' | 'MULTIPLE_CHOICE' | string;
  options: Record<string, string>;
  time_limit: number;
  source_type?: EmergencyPollSourceType;
  source_name?: string;
  context_note?: string;
  correct_option?: string;
  created_at: number;
  completed_at: number;
  totalVotes: number;
  countA: number;
  countB: number;
  percentA: number;
  percentB: number;
  counts?: Record<string, number>;
  percentages?: Record<string, number>;
  dominantChoice: string;
  round_context?: string;
  responses?: Record<string, UserResponse>;
}

export interface EmergencyQuestionDraft {
  id: string;
  question: string;
  type: 'YES_NO' | 'TRUE_FALSE' | 'CUSTOM_2' | 'AGREE_DISAGREE' | 'MULTIPLE_CHOICE' | string;
  options: Record<string, string>;
  time_limit: number;
  source_type: EmergencyPollSourceType;
  source_name: string;
  context_note?: string;
  correct_option?: string;
  created_at: number;
}

export interface AnnouncerOverlay {
  id?: string;
  text: string;
  active: boolean;
  type?: 'INFO' | 'URGENT' | 'ALERT' | 'CELEBRATION';
  speed?: 'SLOW' | 'NORMAL' | 'FAST';
  repeat?: boolean;
  updated_at?: number;
}

export type LightShowPattern = 'COSMIC_PULSE' | 'GOLDEN_CHAMPION' | 'NEON_STROBE' | 'RAINBOW_WAVE' | 'HEARTBEAT_RED';
export type LightShowSpeed = 'SLOW' | 'NORMAL' | 'FAST' | 'HYPER';

export interface AudienceLightShowState {
  active: boolean;
  pattern: LightShowPattern;
  speed: LightShowSpeed;
  message?: string;
  timestamp: number;
  auto_dismiss_seconds?: number;
}

export interface GrandFinaleWinner {
  uid: string;
  name: string;
  mssv: string;
  totalScore: number;
  rank: number;
  accuracyRate?: number;
  correctAnswersCount?: number;
  totalAnswered?: number;
  avgLatency?: number;
  teamName?: string;
  avatarSeed?: string;
}

export interface GrandFinaleState {
  active: boolean;
  winner: GrandFinaleWinner | null;
  runnersUp?: GrandFinaleWinner[];
  stageTheme?: 'ROYAL_GOLD' | 'CYBER_NEON' | 'COSMIC_VICTORY';
  timestamp: number;
}

export interface LuckyDrawState {
  status: 'IDLE' | 'SPINNING' | 'REVEALED';
  winner: UserInfo | null;
}

export interface GameState {
  language?: 'vi' | 'en';
  active_module?: 'GAME' | 'LUCKY_DRAW';
  lucky_draw?: LuckyDrawState;
  audience_light_show?: AudienceLightShowState | null;
  grand_finale?: GrandFinaleState | null;
  announcer_overlay?: AnnouncerOverlay | null;
  projector_effect?: { type: 'CONFETTI' | 'ALARM' | 'FIREWORKS' | 'TING', timestamp: number, message?: string } | null;
  round_name: string;
  round_type: RoundType;
  question_id: string;
  question_text: string;
  category: string;
  options: Record<string, string>;
  option_images?: Record<string, string>;
  eliminated_options?: string[];
  time_limit: number;
  status: GameStatus;
  correct_key: string;
  explanation: string;
  translations?: Record<string, QuestionTranslation>;
  media_type?: 'IMAGE' | 'VIDEO' | 'AUDIO' | 'NONE';
  media_url?: string;
  media_autoplay?: boolean;
  server_start_time: number;
  last_updated: number;
  projectorTheme?: string;
  qr_color_palette?: string;
  qr_code_size?: number;
  qr_transparent_bg?: boolean;
  qr_custom_caption?: string;
  qr_scan_count?: number;
  last_scan_at?: number;
  qr_history?: QrHistoryItem[];
  force_route?: string;
  force_route_ts?: number;
  show_summary?: boolean;
  show_qr?: boolean;
  show_word_cloud?: boolean;
  projector_dimmed?: boolean;
  projector_view_mode?: 'DEFAULT' | 'BAR_CHART' | 'RESPONSE_LIST' | 'HEATMAP' | 'LEADERBOARD' | 'WORD_CLOUD';
  leaderboard_view_mode?: 'PODIUM' | 'LIST';
  leaderboard_round_filter?: 'ALL' | 'R1' | 'R2' | 'R3' | 'R4';
  projector_scale?: number;
  projector_autofit?: boolean;
  projector_show_cheer_meter?: boolean;
  projector_show_shout_marquee?: boolean;
  projector_cheer_expanded?: boolean;
  
  // Global Event & Quick Action Controls
  panic_mode?: boolean;
  is_timer_paused?: boolean;
  paused_remaining_seconds?: number;
  lobby_locked?: boolean;
  team_mode_active?: boolean;
  random_team_assignment?: boolean;
  teams?: Array<{ id: string, name: string, color: string }>;
  team_scores?: Record<string, number>;

  
  // Next Question Waiting / Intermission Timer
  next_question_wait_limit?: number;
  next_question_wait_start?: number;
  next_question_wait_message?: string;

  // Emergency Ad-Hoc Poll
  emergency_poll?: EmergencyPoll | null;
  emergency_poll_history?: EmergencyPollHistoryItem[];
  
  // Audience Q&A
  featured_qa_question?: AudienceQAQuestion | null;
  qa_settings?: QASettings;
  
  // Real-time Question Likes & Upvotes
  question_likes?: Record<string, number>;
  question_likes_uids?: Record<string, string[]>;
  
  // VCNV Specific Workflow & States
  vcnv_clues?: boolean[];
  vcnv_clue_texts?: string[];
  vcnv_center_status?: boolean;
  vcnv_center_visible?: boolean;
  vcnv_center_text?: string;
  vcnv_keyword?: string;
  vcnv_status?: 'IDLE' | 'OPEN' | 'LOCKED' | 'REVEALED'; // IDLE -> 1. Khán giả nhập -> 2. Chốt kết quả -> 3. Công bố đáp án
  vcnv_summary_active?: boolean; // backwards-compatible flag with REVEALED

  // VCNV Ô Mạo Hiểm (Risk Box)
  vcnv_risk_status?: 'IDLE' | 'COUNTDOWN_10S' | 'ACTIVE_ANSWER' | 'FROZEN' | 'REVEALED';
  vcnv_risk_branch?: 'BRANCH_1' | 'BRANCH_2';
  vcnv_risk_question?: string;
  vcnv_risk_answer?: string;
  vcnv_risk_start_time?: number;
  vcnv_risk_claimed_by?: {
    name: string;
    mssv: string;
    uid: string;
    timestamp: number;
  } | null;
}

export interface UserResponse {
  choice: string;
  timestamp: number;
  latency_sec: number;
  user_info: {
    name: string;
    mssv: string;
    uid?: string;
    anonymizedUid?: string;
    teamId?: string;
  };
  isDoubleDown?: boolean; // Vòng 4 Về Đích - Cược nhân đôi All-In
  tabSwitchCount?: number; // Phát hiện rời màn hình / đổi tab
  isOfflineSync?: boolean; // Đánh dấu câu trả lời được gửi từ hàng đợi ngoại tuyến
}

export interface SurvivalStats {
  survivorsCount: number;
  totalContestants: number;
  isUserAlive: boolean;
  survivalRate: number; // Tỉ lệ % sống sót (0 - 100)
  eliminatedThisQuestion?: number;
}

export interface SPSSRow {
  Timestamp: string;
  Timestamp_Unix_MS?: number;
  UID: string;
  FullName: string;
  MSSV: string;
  Round: string;
  Question_ID: string;
  Question_Text?: string;
  User_Choice: string;
  Correct_Choice: string;
  Is_Correct: string;
  Score_Earned?: number;
  Response_Time_Seconds: number;
  Response_Time_MS?: number;
  Item_Difficulty_Index?: number;
  Device_User_Agent?: string;
}

export interface ResearchItemAnalysis {
  question_id: string;
  round_name: string;
  total_responses: number;
  correct_count: number;
  incorrect_count: number;
  difficulty_index_p: number; // p-value = correct / total
  discrimination_index_d?: number;
  mean_latency_sec: number;
  std_latency_sec: number;
  option_distribution: Record<string, number>;
  option_percentage: Record<string, number>;
}

export type ActivityLogCategory = 
  | 'ADMIN_CONTROL' 
  | 'USER_INTERACTION' 
  | 'PSYCHOMETRICS' 
  | 'VCNV_WORKFLOW' 
  | 'POLL_SURVEY' 
  | 'LUCKY_DRAW' 
  | 'SYSTEM_TELEMETRY'
  | 'GENERAL';

export type ActivityLogType =
  | 'USER_JOINED'
  | 'QUESTION_SUBMITTED'
  | 'CHEER_PEAK'
  | 'SCREENSHOT_SAVED'
  | 'SYSTEM_EVENT'
  | 'ADMIN_STATUS_CHANGE'
  | 'ADMIN_QUESTION_CHANGE'
  | 'ADMIN_ROUND_RESET'
  | 'ADMIN_BROADCAST'
  | 'VCNV_PREDICTION'
  | 'VCNV_REVEAL'
  | 'EMERGENCY_POLL'
  | 'LUCKY_DRAW_WIN'
  | 'QR_SCANNED'
  | 'QR_RESET'
  | 'QR_RESTORED'
  | 'ITEM_ANALYSIS';

export interface FirebaseConfig {
  apiKey?: string;
  authDomain?: string;
  databaseURL: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
}

export type PingQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';

export interface PingInfo {
  latencyMs: number | null;
  quality: PingQuality;
  lastChecked: number;
}

export interface LatencyHistoryPoint {
  timestamp: number;
  timeFormatted: string;
  latencyMs: number | null;
  displayLatency: number;
  quality: PingQuality;
  status: 'ONLINE' | 'OFFLINE';
}

export interface LatencyStats {
  currentMs: number | null;
  avgMs: number;
  minMs: number;
  maxMs: number;
  jitterMs: number;
  stabilityScore: number;
  samplesCount: number;
}

export type CheerType = 'HEART' | 'FIRE' | 'ENERGY' | 'CLAP' | 'STAR' | 'SMILE' | 'NERVOUS' | 'HARD';

export type CheerLevel = 'RESTING' | 'WARMING_UP' | 'ENERGETIC' | 'HIGH_VOLTAGE' | 'SUPERNOVA';

export interface CheerEvent {
  id: string;
  type: CheerType;
  uid: string;
  name?: string;
  mssv?: string;
  count: number;
  combo: number;
  timestamp: number;
}

export interface CheerIntensityData {
  intensity: number; // 0% to 100%
  bpm: number; // 60 to 180 BPM
  totalCheers: number;
  recentCheersCount: number;
  activeCheerers: number;
  cheersPerSec: number;
  level: CheerLevel;
  levelTitle: string;
  colorHex: string;
  lastCheerTimestamp: number;
  recentEvents: CheerEvent[];
}

export type QAQuestionStatus = 'PENDING' | 'APPROVED' | 'FEATURED' | 'ANSWERED' | 'REJECTED' | 'ARCHIVED';

export type QAQuestionCategory = 'GENERAL' | 'JURY' | 'CONTESTANT' | 'TOPIC' | 'FEEDBACK';

export interface AudienceQAQuestion {
  id: string;
  uid: string;
  author_name: string;
  author_mssv?: string;
  is_anonymous?: boolean;
  question_text: string;
  category: QAQuestionCategory | string;
  status: QAQuestionStatus;
  upvotes: number;
  upvoted_uids?: string[];
  created_at: number;
  featured_at?: number;
  answered_at?: number;
  admin_notes?: string;
}

export interface QASettings {
  is_open: boolean;
  allow_anonymous: boolean;
  max_chars: number;
  slow_mode_sec: number;
}

export type ShoutBadgeColor = 'purple' | 'cyan' | 'pink' | 'emerald' | 'amber' | 'blue';

export interface AudienceShout {
  id: string;
  uid: string;
  sender_name: string;
  sender_mssv?: string;
  sender_avatar?: string;
  text: string; // limited characters (max 60-80 chars)
  emoji?: string; // optional reaction tag e.g. 🔥, 🎉, 🚀, 💡, 👏, 🏆, ❤️, ⚡
  color?: ShoutBadgeColor | string;
  timestamp: number;
  timestamp_iso?: string;
  likes?: number;
  liked_by?: string[];
  is_pinned?: boolean;
  status?: 'ACTIVE' | 'HIDDEN' | 'FLAGGED' | 'PENDING';
}

export interface ShoutSettings {
  is_open: boolean;
  max_chars: number;
  cooldown_sec: number;
  marquee_speed: 'slow' | 'normal' | 'fast';
  allow_marquee: boolean;
  require_approval?: boolean;
}

export interface StageSnapshotRecord {
  id: string;
  timestamp: number;
  question_id: string;
  question_text: string;
  round_name: string;
  round_type?: RoundType;
  status: GameStatus;
  response_count: number;
  active_count: number;
  image_data_url: string;
  top_distribution?: Array<{ label: string; count: number; percent: number }>;
  note?: string;
  broadcast_tag?: 'HIGHLIGHT' | 'CHART' | 'WORD_CLOUD' | 'VCNV' | 'GENERAL' | 'POLL';
}

export interface ActivityLogItem {
  id?: string;
  type: ActivityLogType | string;
  category?: ActivityLogCategory;
  title: string;
  description: string;
  timestamp: number;
  timestamp_iso?: string;
  actor_id?: string;
  actor_role?: 'ADMIN' | 'CONTESTANT' | 'AUDIENCE' | 'SYSTEM';
  actor_name?: string;
  round_id?: string;
  question_id?: string;
  latency_ms?: number;
  score_delta?: number;
  research_tags?: string[];
  metadata?: Record<string, any>;
}

export type QrPaletteId = 'purple_gold' | 'ocean_teal' | 'monochrome' | 'emerald_mint' | 'ruby_rose';

export interface QrPaletteConfig {
  id: QrPaletteId;
  name: string;
  labelVi: string;
  dark: string;
  light: string;
  description: string;
  borderClass: string;
  accentClass: string;
  dotColor: string;
  glowColor: string;
}

export const QR_PALETTES: Record<QrPaletteId, QrPaletteConfig> = {
  purple_gold: {
    id: 'purple_gold',
    name: 'Purple & Gold (Hoàng gia BTI)',
    labelVi: 'Tím Hoàng Gia & Vàng Kim',
    dark: '#4c1d95',
    light: '#ffffff',
    description: 'Sắc tím BTI 2026 chủ đạo sang trọng, quyền lực và đồng bộ sân khấu',
    borderClass: 'border-purple-500/50',
    accentClass: 'from-purple-900 to-amber-950/60',
    dotColor: '#a855f7',
    glowColor: 'rgba(168, 85, 247, 0.4)'
  },
  ocean_teal: {
    id: 'ocean_teal',
    name: 'Ocean & Teal (Đại dương)',
    labelVi: 'Xanh Đại Dương & Cyan',
    dark: '#0284c7',
    light: '#ffffff',
    description: 'Phong cách công nghệ số tương lai, tươi sáng và chuẩn nét',
    borderClass: 'border-sky-500/50',
    accentClass: 'from-sky-950 to-cyan-950/60',
    dotColor: '#38bdf8',
    glowColor: 'rgba(56, 189, 248, 0.4)'
  },
  monochrome: {
    id: 'monochrome',
    name: 'Monochrome (Đơn sắc cổ điển)',
    labelVi: 'Đen Trắng Tối Giản',
    dark: '#0f172a',
    light: '#ffffff',
    description: 'Tương phản quang học 100%, quét tức thì với mọi camera và ánh sáng',
    borderClass: 'border-slate-400/50',
    accentClass: 'from-slate-900 to-slate-800',
    dotColor: '#94a3b8',
    glowColor: 'rgba(148, 163, 184, 0.4)'
  },
  emerald_mint: {
    id: 'emerald_mint',
    name: 'Emerald & Mint (Ngọc bích)',
    labelVi: 'Ngọc Lục Bảo & Bạc Hà',
    dark: '#065f46',
    light: '#ffffff',
    description: 'Xanh ngọc lục bảo tươi mát, nổi bật và dịu mắt',
    borderClass: 'border-emerald-500/50',
    accentClass: 'from-emerald-950 to-teal-950/60',
    dotColor: '#34d399',
    glowColor: 'rgba(52, 211, 153, 0.4)'
  },
  ruby_rose: {
    id: 'ruby_rose',
    name: 'Ruby & Rose (Hồng ngọc)',
    labelVi: 'Hồng Ngọc & Nhiệt Huyết',
    dark: '#9f1239',
    light: '#ffffff',
    description: 'Đỏ hồng sân khấu kịch tính, cuốn hút và tràn đầy năng lượng',
    borderClass: 'border-rose-500/50',
    accentClass: 'from-rose-950 to-pink-950/60',
    dotColor: '#fb7185',
    glowColor: 'rgba(251, 113, 133, 0.4)'
  }
};

export interface QrHistoryItem {
  id: string;
  timestamp: number;
  palette: QrPaletteId | string;
  paletteName?: string;
  size: number;
  transparentBg: boolean;
  caption?: string;
  url: string;
  dataUrl?: string;
}

export interface QrScanEvent {
  id: string;
  timestamp: number;
  timestamp_iso: string;
  hour_key: string; // Format "YYYY-MM-DD HH:00" or "HH:00"
  hour_number: number; // 0 - 23
  day_str: string; // "DD/MM"
  source: string; // "mobile_qr", "audience_link", "admin_test", "live_stage", etc.
  device_type?: string;
  round_context?: string;
}

export interface HourlyScanDataPoint {
  hour: string; // e.g. "09:00", "10:00"
  displayLabel: string; // e.g. "10:00 (Hôm nay)"
  hourNumber: number;
  scans: number;
  cumulativeScans: number;
  isCurrentHour: boolean;
  peakRatio: number; // 0..100% relative to peak hour
  sources: Record<string, number>;
}

export interface QrScanTrendMetrics {
  totalScans: number;
  peakHour: string;
  peakCount: number;
  avgPerHour: number;
  currentHourScans: number;
  activeHoursCount: number;
  velocityTrend: 'UP' | 'DOWN' | 'STABLE';
}

// Technical Team Roles & Admin Approval Types
export type TechnicalRole =
  | 'SERVER_OPERATOR'    // Kỹ thuật Điều hành Máy chủ & Đồng bộ Realtime
  | 'LED_OPERATOR'       // Kỹ thuật Hiển thị Màn chiếu LED
  | 'STAGE_COORDINATOR'; // Kỹ thuật viên Điều phối Sân khấu & Hỗ trợ Kỹ thuật

export type AdminStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'REVOKED';

export interface AdminUser {
  id: string;
  username: string;
  fullName: string;
  technicalRole: TechnicalRole;
  role: 'SUPER_ADMIN' | 'OPERATOR';
  status: AdminStatus;
  authProvider: 'local' | 'google';
  email?: string;
  emailVerified?: boolean;
  createdAt: number;
  approvedAt?: number;
  approvedBy?: string;
  lastLoginAt?: number;
  note?: string;
}

export const TECHNICAL_ROLES: Record<TechnicalRole, { label: string; description: string; badgeColor: string }> = {
  SERVER_OPERATOR: {
    label: 'Kỹ thuật Điều hành Máy chủ & Đồng bộ Realtime',
    description: 'Điều phối câu hỏi, timer, khóa bình chọn, tính điểm trực tiếp',
    badgeColor: 'text-sky-300 bg-sky-950/60 border-sky-500/40'
  },
  LED_OPERATOR: {
    label: 'Kỹ thuật Hiển thị Màn chiếu Sân khấu LED',
    description: 'Vận hành giao diện hiển thị màn chiếu Projector sân khấu chính',
    badgeColor: 'text-indigo-300 bg-indigo-950/60 border-indigo-500/40'
  },
  STAGE_COORDINATOR: {
    label: 'Kỹ thuật viên Điều phối Sân khấu & Hỗ trợ Kỹ thuật',
    description: 'Giám sát tương tác khán giả và hỗ trợ kỹ thuật sàn đấu',
    badgeColor: 'text-emerald-300 bg-emerald-950/60 border-emerald-500/40'
  }
};


