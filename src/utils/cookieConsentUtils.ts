/**
 * European Union (GDPR & ePrivacy Directive) Cookie & LocalStorage Consent Utility
 * 
 * Complies with:
 * - Regulation (EU) 2016/679 (General Data Protection Regulation - GDPR), Articles 4(11), 6(1)(a), 7, Recital 30.
 * - Directive 2002/58/EC (ePrivacy Directive) as amended by Directive 2009/136/EC, Article 5(3).
 * - EDPB (European Data Protection Board) Guidelines 05/2020 on consent.
 * - French CNIL & Irish DPC guidance requiring equal prominence between "Accept" and "Reject".
 */

export type CookieCategory = 'necessary' | 'preferences' | 'analytics' | 'marketing';

export interface CookieConsentState {
  necessary: true; // Strictly necessary is always true and cannot be disabled
  preferences: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp: string; // ISO 8601 string
  version: string;
  source: 'accept_all' | 'reject_non_essential' | 'customized';
}

export interface CookieItemDetail {
  name: string;
  category: CookieCategory;
  type: 'LocalStorage' | 'SessionStorage' | 'Cookie';
  provider: string;
  purposeVi: string;
  purposeEn: string;
  durationVi: string;
  durationEn: string;
  descriptionVi: string;
  descriptionEn: string;
}

export const GDPR_COOKIE_CONSENT_KEY = 'bti_cookie_consent_gdpr_v1';
export const GDPR_COOKIE_VERSION = '1.0-gdpr-eprivacy-2027';

/**
 * Standard cookie & local storage technical inventory for Beyond The Internet 2027
 */
export const COOKIE_INVENTORY: CookieItemDetail[] = [
  // 1. Strictly Necessary
  {
    name: 'BTI2026_USER_PROFILE',
    category: 'necessary',
    type: 'LocalStorage',
    provider: 'BTI 2027 Core Engine',
    purposeVi: 'Lưu trữ thông tin định danh thí sinh/khán giả (UID 12 chữ số, tên hiển thị, mã trường)',
    purposeEn: 'Stores participant identifier (12-digit UID, display name, school code)',
    durationVi: 'Thời gian diễn ra giải đấu (hoặc khi người dùng chủ động xóa dữ liệu)',
    durationEn: 'Duration of contest (or until user explicitly requests data erasure)',
    descriptionVi: 'Điều kiện tiên quyết để tham gia thi đấu trực tiếp và tính điểm.',
    descriptionEn: 'Essential prerequisite to join live contest and submit answers.'
  },
  {
    name: 'bti_pdpd_first_visit_consent_v1',
    category: 'necessary',
    type: 'LocalStorage',
    provider: 'BTI 2027 Legal Engine',
    purposeVi: 'Lưu bằng chứng pháp lý về việc người dùng đã đồng ý Điều khoản & Chính sách dữ liệu',
    purposeEn: 'Stores timestamped legal audit record of user accepting Terms and Data Policy',
    durationVi: '12 tháng (hoặc đến khi chính sách cập nhật phiên bản mới)',
    durationEn: '12 months (or until major policy revision)',
    descriptionVi: 'Bắt buộc theo Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15 & Nghị định 356/2025/NĐ-CP.',
    descriptionEn: 'Mandatory under Personal Data Protection Law and EU GDPR proof of consent.'
  },
  {
    name: GDPR_COOKIE_CONSENT_KEY,
    category: 'necessary',
    type: 'LocalStorage',
    provider: 'BTI 2027 Privacy Engine',
    purposeVi: 'Lưu trữ tùy chọn đồng thuận cookie theo chuẩn Châu Âu (GDPR & ePrivacy)',
    purposeEn: 'Stores European GDPR & ePrivacy cookie preference selections',
    durationVi: '12 tháng',
    durationEn: '12 months',
    descriptionVi: 'Bắt buộc để hệ thống ghi nhớ và thực thi đúng lựa chọn cookie của bạn.',
    descriptionEn: 'Required to remember and enforce your cookie choices on subsequent visits.'
  },
  {
    name: 'sync_offset',
    category: 'necessary',
    type: 'LocalStorage',
    provider: 'NTP Time Sync Module',
    purposeVi: 'Bù trừ chênh lệch đồng hồ mili-giây giữa thiết bị cá nhân và máy chủ thời gian thực',
    purposeEn: 'Compensates millisecond clock drift between local device and real-time server',
    durationVi: 'Phiên duyệt web',
    durationEn: 'Session',
    descriptionVi: 'Cần thiết để bộ đếm thời gian trả lời câu hỏi và Time Estimator hoạt động chính xác tuyệt đối.',
    descriptionEn: 'Critical for precision countdown timers and anti-cheat sync.'
  },
  {
    name: 'BTI2026_PREV_VIEW',
    category: 'necessary',
    type: 'SessionStorage',
    provider: 'BTI Navigation Router',
    purposeVi: 'Lưu màn hình trước đó khi người dùng chuyển sang trang Chính sách để quay lại chính xác',
    purposeEn: 'Saves previous screen state when opening legal policy page for smooth return',
    durationVi: 'Phiên duyệt web',
    durationEn: 'Session',
    descriptionVi: 'Giúp điều hướng không bị gián đoạn giữa các phiên thi đấu.',
    descriptionEn: 'Ensures seamless back-navigation without losing game context.'
  },

  // 2. Preferences & Functionality
  {
    name: 'bti_sound_fx_enabled',
    category: 'preferences',
    type: 'LocalStorage',
    provider: 'Web Audio API Module',
    purposeVi: 'Ghi nhớ cài đặt âm thanh, nhạc nền đấu trường và hiệu ứng tiếng gõ phím',
    purposeEn: 'Remembers sound FX, background music, and haptic feedback settings',
    durationVi: 'Vĩnh viễn cho đến khi thay đổi',
    durationEn: 'Persistent until modified',
    descriptionVi: 'Cá nhân hóa trải nghiệm thính giác theo sở thích thí sinh.',
    descriptionEn: 'Personalizes audio feedback and volume preferences.'
  },
  {
    name: 'bti_local_language',
    category: 'preferences',
    type: 'LocalStorage',
    provider: 'BTI i18n Localization',
    purposeVi: 'Lưu lựa chọn ngôn ngữ giao diện (Tiếng Việt hoặc English)',
    purposeEn: 'Saves interface display language selection (Vietnamese or English)',
    durationVi: 'Vĩnh viễn cho đến khi thay đổi',
    durationEn: 'Persistent until modified',
    descriptionVi: 'Tránh phải chọn lại ngôn ngữ mỗi lần tải lại trang.',
    descriptionEn: 'Avoids having to re-select language on each page visit.'
  },
  {
    name: 'bti_battery_saver_mode',
    category: 'preferences',
    type: 'LocalStorage',
    provider: 'BTI Energy Manager',
    purposeVi: 'Lưu cấu hình chế độ tiết kiệm năng lượng, tắt hoạt ảnh nặng và giảm tải GPU',
    purposeEn: 'Saves battery saver mode, disables heavy shaders and reduces GPU usage',
    durationVi: 'Vĩnh viễn cho đến khi thay đổi',
    durationEn: 'Persistent until modified',
    descriptionVi: 'Kéo dài thời lượng pin cho điện thoại và máy tính bảng trong suốt buổi đấu.',
    descriptionEn: 'Prolongs mobile device battery life during long tournament rounds.'
  },
  {
    name: 'bti_qr_palette_preference',
    category: 'preferences',
    type: 'LocalStorage',
    provider: 'BTI Visual Theme Engine',
    purposeVi: 'Ghi nhớ bảng màu giao diện hiển thị mã QR và chủ đề đấu trường ưa thích',
    purposeEn: 'Remembers customized QR color palette and UI theme preference',
    durationVi: 'Vĩnh viễn cho đến khi thay đổi',
    durationEn: 'Persistent until modified',
    descriptionVi: 'Cá nhân hóa phong cách hình ảnh theo ý thích của quản trị viên và thí sinh.',
    descriptionEn: 'Customizes visual styling for projectors and client dashboards.'
  },

  // 3. Analytics & Performance
  {
    name: 'bti_network_latency_ms',
    category: 'analytics',
    type: 'SessionStorage',
    provider: 'BTI Network Telemetry',
    purposeVi: 'Đo lường độ trễ ping mạng giữa trình duyệt và cụm máy chủ Cloud Firestore',
    purposeEn: 'Measures round-trip network latency between client and Cloud Firestore cluster',
    durationVi: 'Phiên duyệt web (Tự hủy sau khi kết thúc)',
    durationEn: 'Session (Automatically cleared on exit)',
    descriptionVi: 'Hỗ trợ phát hiện sớm hiện tượng nghẽn mạng để cảnh báo thí sinh.',
    descriptionEn: 'Detects network jitter and warns contestants of unstable connection.'
  },
  {
    name: 'bti_perf_jitter',
    category: 'analytics',
    type: 'SessionStorage',
    provider: 'BTI Performance Monitor',
    purposeVi: 'Thống kê biến động tốc độ truyền tải gói tin WebSocket/SSE thời gian thực',
    purposeEn: 'Tracks real-time packet delivery stability and WebSocket jitter',
    durationVi: 'Phiên duyệt web',
    durationEn: 'Session',
    descriptionVi: 'Cải thiện thuật toán dự báo thời gian kết thúc vòng thi (Time Estimator).',
    descriptionEn: 'Helps optimize the Time Estimator countdown algorithm.'
  },

  // 4. Marketing & Public Media
  {
    name: 'bti_social_campaign_ref',
    category: 'marketing',
    type: 'SessionStorage',
    provider: 'BTI Community Media',
    purposeVi: 'Ghi nhận nguồn giới thiệu chiến dịch truyền thông của giải đấu (nếu có)',
    purposeEn: 'Tracks tournament public media campaign referral sources (if any)',
    durationVi: 'Phiên duyệt web',
    durationEn: 'Session',
    descriptionVi: 'Đánh giá mức độ lan tỏa của sự kiện trên các kênh mạng xã hội học thuật.',
    descriptionEn: 'Evaluates event reach across academic social media channels.'
  }
];

/**
 * Get current saved cookie preferences from LocalStorage
 */
export function getCookieConsent(): CookieConsentState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(GDPR_COOKIE_CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.necessary === true && typeof parsed.preferences === 'boolean') {
      return parsed as CookieConsentState;
    }
  } catch (err) {
    console.warn('Could not read GDPR cookie consent:', err);
  }
  return null;
}

/**
 * Save cookie consent choices and notify the rest of the application
 */
export function setCookieConsent(consent: CookieConsentState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GDPR_COOKIE_CONSENT_KEY, JSON.stringify(consent));
    
    // Dispatch custom event for real-time listener updates
    const event = new CustomEvent('bti-cookie-consent-changed', { detail: consent });
    window.dispatchEvent(event);
  } catch (err) {
    console.warn('Could not save GDPR cookie consent:', err);
  }
}

/**
 * Checks whether the user has explicitly submitted their cookie choice
 */
export function hasUserConfiguredCookieConsent(): boolean {
  return getCookieConsent() !== null;
}

/**
 * Check if a specific cookie category is currently allowed
 */
export function isCategoryAllowed(category: CookieCategory): boolean {
  if (category === 'necessary') return true;
  const current = getCookieConsent();
  if (!current) return false; // Prior consent required under GDPR
  return Boolean(current[category]);
}

/**
 * Create a full acceptance state
 */
export function createAcceptAllConsent(): CookieConsentState {
  return {
    necessary: true,
    preferences: true,
    analytics: true,
    marketing: true,
    timestamp: new Date().toISOString(),
    version: GDPR_COOKIE_VERSION,
    source: 'accept_all'
  };
}

/**
 * Create a reject-all-non-essential state (Strictly Necessary only)
 */
export function createRejectNonEssentialConsent(): CookieConsentState {
  return {
    necessary: true,
    preferences: false,
    analytics: false,
    marketing: false,
    timestamp: new Date().toISOString(),
    version: GDPR_COOKIE_VERSION,
    source: 'reject_non_essential'
  };
}

/**
 * Clear stored cookie choices (forces banner to re-appear)
 */
export function resetCookieConsent(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GDPR_COOKIE_CONSENT_KEY);
    const event = new CustomEvent('bti-cookie-consent-changed', { detail: null });
    window.dispatchEvent(event);
  } catch (err) {
    console.warn('Could not reset cookie consent:', err);
  }
}
