import { AudienceSurveyConfig } from '../types';

export const DEFAULT_SURVEY_CONFIG: AudienceSurveyConfig = {
  enabled: false,
  form_url: 'https://docs.google.com/forms/d/e/1FAIpQLSc_ExampleFormKey/viewform',
  sample_rate: 10, // 10%
  title: 'Khảo Sát Khán Giả BTI 2026',
  description: 'Bạn là 1 trong 10% khán giả đại diện được chọn ngẫu nhiên tham gia khảo sát nhanh nhận quà tri ân từ Ban Tổ Chức!',
  gift_note: 'Hoàn tất khảo sát để nhận phần quà lưu niệm đặc biệt tại bàn Lễ tân.',
  auto_show_on_summary: true,
  force_active: false,
  allow_embedded_view: true,
  target_seed: 'BTI2026_FINALE_SURVEY'
};

/**
 * Deterministically checks if a user is selected for the survey given sampleRate (e.g. 10%)
 * Uses DJB2 integer hash to ensure:
 * 1. Exactly sampleRate% distribution
 * 2. Absolute stability across page reloads (F5) for the same user UID / MSSV
 */
export function isUserSelectedForSurvey(
  userId: string,
  sampleRate: number = 10,
  seed: string = 'BTI2026_FINALE_SURVEY'
): boolean {
  if (!userId || !userId.trim()) return false;
  if (sampleRate >= 100) return true;
  if (sampleRate <= 0) return false;

  const input = `${seed.trim()}_${userId.trim()}`;
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) + input.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }

  const modulo = Math.abs(hash) % 100;
  return modulo < sampleRate;
}

/**
 * Validates and normalizes Google Form URLs for safe usage in href/src sinks.
 * Allows only http(s) and Google Forms hosts.
 */
export function sanitizeGoogleFormUrl(rawUrl: string): string {
  let url = (rawUrl || '').trim();
  if (!url) return '';

  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    url = `https://${url}`;
  }

  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    const isHttp = urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    const isGoogleFormsHost = hostname === 'docs.google.com' || hostname === 'forms.gle';

    if (!isHttp || !isGoogleFormsHost) return '';
    return urlObj.toString();
  } catch {
    return '';
  }
}

/**
 * Formats a Google Form URL with embedded=true and optional prefill entries
 */
export function buildGoogleFormUrl(
  config: Partial<AudienceSurveyConfig>,
  user?: { name?: string; mssv?: string; uid?: string } | null,
  embedded: boolean = false
): string {
  const safeBaseUrl = sanitizeGoogleFormUrl(config.form_url || '');
  if (!safeBaseUrl) return '';

  const urlObj = new URL(safeBaseUrl);

  // If it's a docs.google.com/forms link and embedded is requested
  if (embedded && urlObj.hostname.includes('google.com') && urlObj.pathname.includes('/forms')) {
    urlObj.searchParams.set('embedded', 'true');
  }

  // Prefill Name if configured
  if (config.prefill_name_entry && user?.name) {
    urlObj.searchParams.set(config.prefill_name_entry.trim(), user.name.trim());
  }

  // Prefill MSSV / Student ID if configured
  if (config.prefill_mssv_entry && user?.mssv) {
    urlObj.searchParams.set(config.prefill_mssv_entry.trim(), user.mssv.trim());
  }

  return urlObj.toString();
}

/**
 * Generates an official, verifiable ticket voucher code for users who complete the survey
 * Formats like BTI-SURVEY-A94E
 */
export function generateSurveyVoucherCode(userId: string, seed: string = 'BTI2026'): string {
  const cleanId = (userId || 'guest').trim();
  const input = `VOUCHER_${seed.trim()}_${cleanId}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).toUpperCase().padStart(6, '0').slice(-6);
  return `BTI-GIFT-${hex}`;
}
