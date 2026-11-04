/**
 * VN LAW COMPLIANCE & CYBERSECURITY MODERATION UTILITIES
 * Based on Vietnamese Legal Framework standards (referenced from mhfed/vn-law-check):
 * - Nghị định 13/2023/NĐ-CP (Bảo vệ dữ liệu cá nhân - PDPD)
 * - Luật An ninh mạng 2018 & Nghị định 53/2022/NĐ-CP (Môi trường mạng an toàn, lành mạnh)
 * - Luật Trẻ em 2016 (Bảo vệ trẻ em trên môi trường mạng)
 * - Minh bạch AI & Tiêu chuẩn giao dịch điện tử 2023
 */

export interface ComplianceCheckResult {
  isSafe: boolean;
  severity: 'SAFE' | 'WARNING' | 'BLOCKED';
  category?: 'PROFANITY' | 'HATE_SPEECH_CYBER_SECURITY' | 'CHEATING_CONTEST' | 'PERSONAL_DATA_LEAK';
  reasonVi?: string;
  sanitizedText: string;
  flaggedTerms: string[];
}

/**
 * Bỏ dấu tiếng Việt và chuẩn hóa ký tự
 */
export function removeVietnameseAccents(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

/**
 * Chuẩn hóa chuỗi để chống kỹ thuật lách chữ (leetspeak, teencode, khoảng trắng hoặc ký tự đặc biệt xen kẽ)
 */
export function normalizeAntiEvasionText(raw: string): string {
  if (!raw) return '';
  let text = raw.toLowerCase();

  // Thay thế ký tự số hoặc biểu tượng giả mạo chữ cái
  text = text
    .replace(/0/g, 'o')
    .replace(/1/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/5/g, 's')
    .replace(/7/g, 't')
    .replace(/8/g, 'b')
    .replace(/@/g, 'a')
    .replace(/\$/g, 's');

  // Loại bỏ các ký tự phân cách xen kẽ (dấu chấm, gạch ngang, gạch dưới, khoảng trắng thừa giữa các ký tự)
  const deAccented = removeVietnameseAccents(text);
  return deAccented;
}

// Danh mục từ ngữ vi phạm an ninh mạng, kích động, thù địch, chống phá hoặc chia rẽ dân tộc (Mức độ cực kỳ nghiêm trọng)
const CYBER_SECURITY_HATE_KEYWORDS: string[] = [
  'chong pha nha nuoc',
  'lat do chinh quyen',
  'khung bo',
  'phan dong',
  'kich dong bao luc',
  'chay nha',
  'danh bom',
  'giet nguoi',
  'buon ban vu khi',
  'chat doc da cam',
  'ma tuy',
  'thu dam',
  'khieu dam'
];

// Danh mục từ ngữ dung tục, xúc phạm danh dự nhân phẩm, thô tục trong môi trường học đường
const PROFANITY_KEYWORDS: string[] = [
  'dm',
  'dcm',
  'dmm',
  'clm',
  'clgt',
  'cc',
  'vcl',
  'vl',
  'vkl',
  'vlon',
  'lon',
  'buoi',
  'cac',
  'con cac',
  'djt',
  'dit',
  'du me',
  'dume',
  'dit me',
  'dit con me',
  'djt me',
  'me kiep',
  'oc cho',
  'ngu hoc',
  'suc vat',
  'cho de',
  'mat day',
  'fuck',
  'bitch',
  'bastard',
  'shit',
  'asshole',
  'cunt'
];

// Danh mục từ khóa cố ý gian lận, xin đáp án hoặc tiết lộ đề thi trong giờ thi đấu
const CONTEST_CHEATING_KEYWORDS: string[] = [
  'dap an cau',
  'cho xin dap an',
  'dap an la gi',
  'chon a hay b',
  'tra loi giup cau',
  'giai ho cau',
  'leak de',
  'lo de thi',
  'hack diem',
  'gian lan diem'
];

/**
 * Kiểm tra tính tuân thủ pháp luật và an toàn thông tin của văn bản theo thời gian thực
 */
export function checkContentCompliance(input: string, context: 'CHAT' | 'SHOUT' | 'QA' | 'NAME' = 'CHAT'): ComplianceCheckResult {
  if (!input || input.trim().length === 0) {
    return {
      isSafe: true,
      severity: 'SAFE',
      sanitizedText: '',
      flaggedTerms: []
    };
  }

  const normalized = normalizeAntiEvasionText(input);
  const cleanTokens = normalized.split(/[^a-z0-9]/).filter(Boolean);
  const condensed = cleanTokens.join('');

  const flaggedTerms: string[] = [];

  // 1. Kiểm tra an ninh mạng & kích động thù địch (Luật An ninh mạng 2018)
  for (const kw of CYBER_SECURITY_HATE_KEYWORDS) {
    const kwNorm = normalizeAntiEvasionText(kw);
    const kwCondensed = kwNorm.replace(/[^a-z0-9]/g, '');
    if (normalized.includes(kwNorm) || (kwCondensed.length > 4 && condensed.includes(kwCondensed))) {
      flaggedTerms.push(kw);
      return {
        isSafe: false,
        severity: 'BLOCKED',
        category: 'HATE_SPEECH_CYBER_SECURITY',
        reasonVi: 'Nội dung vi phạm quy định Luật An ninh mạng 2018 (ngôn từ gây mất an toàn hoặc kích động). Vui lòng điều chỉnh lại.',
        sanitizedText: '[Nội dung đã bị chặn do vi phạm quy chuẩn an toàn mạng]',
        flaggedTerms
      };
    }
  }

  // 2. Kiểm tra từ ngữ thô tục / thiếu chuẩn mực văn hóa (Nghị định 53/2022/NĐ-CP & Văn hóa học đường)
  let sanitized = input;
  let hasProfanity = false;

  for (const kw of PROFANITY_KEYWORDS) {
    // Regex tìm từ độc lập hoặc có ký tự ngăn cách
    const regexPattern = `\\b${kw.split('').map(c => `[${c}]`).join('[\\s._-]*')}\\b`;
    const regex = new RegExp(regexPattern, 'gi');

    // Kiểm tra trong chuỗi đã chuẩn hóa
    const isDirectMatch = cleanTokens.includes(kw) || (kw.length >= 3 && condensed.includes(kw));
    if (regex.test(input) || isDirectMatch) {
      hasProfanity = true;
      flaggedTerms.push(kw);
      // Thay thế bằng ký tự sao
      sanitized = sanitized.replace(regex, '***');
    }
  }

  if (hasProfanity) {
    // Với tên người dùng hoặc màn hình LED, nghiêm cấm từ ngữ tục
    if (context === 'NAME' || context === 'SHOUT') {
      return {
        isSafe: false,
        severity: 'BLOCKED',
        category: 'PROFANITY',
        reasonVi: 'Tên hoặc nội dung chứa ngôn từ chưa phù hợp với quy chế văn hóa học đường Beyond The Internet 2026.',
        sanitizedText: sanitized,
        flaggedTerms
      };
    }

    return {
      isSafe: true, // Cho phép tiếp tục nhưng đã làm mờ ký tự
      severity: 'WARNING',
      category: 'PROFANITY',
      reasonVi: 'Nội dung đã được lọc tự động các ký tự nhạy cảm nhằm đảm bảo môi trường giao tiếp lành mạnh.',
      sanitizedText: sanitized,
      flaggedTerms
    };
  }

  // 3. Kiểm tra hành vi xin đáp án hoặc gian lận thi đấu (Điều lệ cuộc thi)
  if (context === 'CHAT') {
    for (const kw of CONTEST_CHEATING_KEYWORDS) {
      if (normalized.includes(kw)) {
        flaggedTerms.push(kw);
        return {
          isSafe: false,
          severity: 'BLOCKED',
          category: 'CHEATING_CONTEST',
          reasonVi: 'Vì tính công bằng của Đấu trường Beyond The Internet 2026, câu hỏi này vi phạm quy chế bảo mật đề thi.',
          sanitizedText: input,
          flaggedTerms
        };
      }
    }
  }

  return {
    isSafe: true,
    severity: 'SAFE',
    sanitizedText: input,
    flaggedTerms: []
  };
}

/**
 * Kiểm tra tính hợp lệ của tên thí sinh / khán giả đăng ký
 */
export function validateUsernameCompliance(name: string): { isValid: boolean; messageVi?: string } {
  if (!name || name.trim().length < 2) {
    return { isValid: false, messageVi: 'Tên hiển thị phải có ít nhất 2 ký tự.' };
  }

  if (name.trim().length > 30) {
    return { isValid: false, messageVi: 'Tên hiển thị không được vượt quá 30 ký tự.' };
  }

  const result = checkContentCompliance(name, 'NAME');
  if (!result.isSafe || result.severity === 'BLOCKED') {
    return {
      isValid: false,
      messageVi: result.reasonVi || 'Tên chứa từ ngữ chưa chuẩn mực. Vui lòng chọn tên phù hợp với văn hóa giải đấu.'
    };
  }

  return { isValid: true };
}

/**
 * Tiêu chuẩn văn bản chính sách bảo vệ dữ liệu cá nhân theo Nghị định 13/2023/NĐ-CP (PDPD)
 */
export const PDPD_CONSENT_VERSION = '1.0-pdpd-2026';
export const PDPD_LAW_REFERENCE = 'Nghị định 13/2023/NĐ-CP & Luật An ninh mạng 2018';
