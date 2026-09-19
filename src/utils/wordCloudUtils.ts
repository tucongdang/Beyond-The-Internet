export interface WordCloudItem {
  text: string;
  count: number;
  score: number;
  percentage: number;
  category?: string;
  color?: string;
  sources: {
    id: string;
    type: 'QA' | 'POLL' | 'SHORT_ANSWER' | 'VCNV';
    snippet: string;
    author?: string;
    upvotes?: number;
  }[];
}

export interface WordCloudInputSource {
  type: 'QA' | 'POLL' | 'SHORT_ANSWER' | 'VCNV';
  id: string;
  text: string;
  author?: string;
  upvotes?: number;
  category?: string;
}

// Common Vietnamese Stop Words
const VIETNAMESE_STOP_WORDS = new Set([
  'là', 'và', 'của', 'có', 'được', 'cho', 'trong', 'với', 'không', 'các', 'những', 'một', 
  'khi', 'nào', 'tại', 'sao', 'xin', 'hỏi', 'thì', 'ở', 'về', 'gì', 'như', 'đã', 'sẽ', 
  'đang', 'từ', 'đến', 'này', 'đó', 'lại', 'bị', 'ra', 'vào', 'theo', 'nên', 'phải', 
  'rất', 'quá', 'thế', 'đâu', 'ai', 'mình', 'tôi', 'bạn', 'em', 'anh', 'chị', 'thầy', 
  'cô', 'họ', 'chúng', 'ta', 'ơi', 'ạ', 'nhé', 'nha', 'hả', 'hử', 'vậy', 'nay', 'hôm', 
  'ngày', 'giờ', 'sau', 'trước', 'nữa', 'cũng', 'chỉ', 'luôn', 'rồi', 'cả', 'mọi', 'mỗi', 
  'tất', 'nhiều', 'ít', 'hơn', 'nhất', 'cùng', 'nhau', 'làm', 'biết', 'muốn', 'thấy', 
  'nghĩ', 'bảo', 'nói', 'cảm', 'ơn', 'chúc', 'mừng', 'giúp', 'chia', 'sẻ', 'thêm', 'như',
  'nhưng', 'hoặc', 'nếu', 'vì', 'do', 'bởi', 'bằng', 'để', 'qua', 'giữa', 'dưới', 'trên',
  'mới', 'cũ', 'khác', 'từng', 'vẫn', 'ngay', 'liền', 'tự', 'gặp', 'thực', 'hiện'
]);

// Common English Stop Words
const ENGLISH_STOP_WORDS = new Set([
  'the', 'is', 'are', 'was', 'were', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'about', 'into', 'through', 'during', 'before', 'after', 
  'above', 'below', 'between', 'under', 'again', 'further', 'then', 'once', 'here', 'there',
  'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'can', 'will', 'just', 'should', 'now', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me',
  'him', 'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'what', 'which',
  'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'would', 'could', 'get', 'got', 'make', 'made', 'like'
]);

// Known Compound Multi-word Terms to preserve intact
const COMPOUND_TERMS: string[] = [
  'Zero Trust',
  'An ninh mạng',
  'Trí tuệ nhân tạo',
  'Hệ điều hành',
  'Cơ sở dữ liệu',
  'Mật mã học',
  'Tấn công mạng',
  'Tường lửa',
  'Mã độc',
  'Mạng máy tính',
  'Điện toán đám mây',
  'Kỹ thuật xã hội',
  'Chuỗi khối',
  'Vượt chướng ngại vật',
  'Ban giám khảo',
  'Thí sinh',
  'Beyond The Internet',
  'BTI 2026',
  'Tăng tốc',
  'Khởi động',
  'Về đích',
  'Chướng ngại vật',
  'Phòng thủ',
  'Xác thực đa yếu tố',
  'Bảo mật thông tin',
  'Lỗ hổng bảo mật',
  'Đánh giá rủi ro'
];

/** Clean and normalize a token */
export function normalizeToken(token: string): string {
  return token
    .trim()
    .replace(/^["'“”‘’({\[\<]+|["'“”‘’)}\]\>\.,;:!?]+$/g, '');
}

/** Check if token is a stop word or garbage */
export function isStopWord(token: string): boolean {
  if (!token || token.length <= 1) return true;
  const lower = token.toLowerCase();
  if (VIETNAMESE_STOP_WORDS.has(lower) || ENGLISH_STOP_WORDS.has(lower)) return true;
  // Numbers only
  if (/^\d+$/.test(token)) return false; // Allow meaningful years/numbers like 2026, 4.0
  // Punctuation only
  if (/^[^a-zA-Z0-9\u00C0-\u1EF9]+$/.test(token)) return true;
  return false;
}

/** Extract keywords and frequency scores from inputs */
export function extractWordCloudKeywords(
  sources: WordCloudInputSource[],
  maxWords: number = 50,
  minOccurrence: number = 1
): WordCloudItem[] {
  if (!sources || sources.length === 0) return [];

  const wordMap: Map<string, {
    count: number;
    upvotes: number;
    sources: WordCloudInputSource[];
    canonical: string;
  }> = new Map();

  sources.forEach((item) => {
    if (!item.text || !item.text.trim()) return;

    let text = item.text;
    const foundCompounds: string[] = [];

    // Step 1: Detect and extract known compound terms
    COMPOUND_TERMS.forEach((compound) => {
      const regex = new RegExp(`\\b${compound}\\b`, 'gi');
      if (regex.test(text)) {
        foundCompounds.push(compound);
        // Replace in text with placeholder to avoid splitting into separate tokens
        text = text.replace(regex, ' ');
      }
    });

    // Record found compound terms
    foundCompounds.forEach((term) => {
      const key = term.toLowerCase();
      const existing = wordMap.get(key);
      if (existing) {
        existing.count += 1;
        existing.upvotes += item.upvotes || 0;
        if (!existing.sources.some((s) => s.id === item.id)) {
          existing.sources.push(item);
        }
      } else {
        wordMap.set(key, {
          count: 1,
          upvotes: item.upvotes || 0,
          sources: [item],
          canonical: term
        });
      }
    });

    // Step 2: Split remaining text into individual words
    const tokens = text.split(/[\s,;:.!?()\[\]{}"'“”‘’/\\+*&^%$#@~`<>|=]+/);

    tokens.forEach((rawToken) => {
      const token = normalizeToken(rawToken);
      if (isStopWord(token)) return;

      const key = token.toLowerCase();
      const existing = wordMap.get(key);

      // Determine proper display casing: Preserve uppercase for acronyms like AI, NIST, SQL, API, VCNV, DDoS, etc.
      const isAcronym = token === token.toUpperCase() && token.length >= 2;
      const canonical = isAcronym
        ? token
        : token.charAt(0).toUpperCase() + token.slice(1);

      if (existing) {
        existing.count += 1;
        existing.upvotes += item.upvotes || 0;
        if (!existing.sources.some((s) => s.id === item.id)) {
          existing.sources.push(item);
        }
      } else {
        wordMap.set(key, {
          count: 1,
          upvotes: item.upvotes || 0,
          sources: [item],
          canonical
        });
      }
    });
  });

  // Calculate total occurrences for percentage calculation
  let totalOccurrences = 0;
  wordMap.forEach((val) => {
    totalOccurrences += val.count;
  });

  if (totalOccurrences === 0) return [];

  // Convert to array and score
  const items: WordCloudItem[] = Array.from(wordMap.entries())
    .map(([_, val]) => {
      // Weight score = count * 10 + upvotes * 2
      const score = val.count * 10 + val.upvotes * 2;
      const percentage = Math.round((val.count / totalOccurrences) * 100 * 10) / 10;

      return {
        text: val.canonical,
        count: val.count,
        score,
        percentage,
        sources: val.sources.map((s) => ({
          id: s.id,
          type: s.type,
          snippet: s.text,
          author: s.author,
          upvotes: s.upvotes
        }))
      };
    })
    .filter((item) => item.count >= minOccurrence)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return b.count - a.count;
    })
    .slice(0, maxWords);

  return items;
}

// Color palettes for word cloud tags based on frequency rank
export const WORD_CLOUD_PALETTES = [
  {
    bg: 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.3)]',
    glow: 'rgba(244,63,94,0.4)',
    badge: 'bg-rose-500 text-slate-950 font-black'
  },
  {
    bg: 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.3)]',
    glow: 'rgba(245,158,11,0.4)',
    badge: 'bg-amber-500 text-slate-950 font-black'
  },
  {
    bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.3)]',
    glow: 'rgba(16,185,129,0.4)',
    badge: 'bg-emerald-500 text-slate-950 font-black'
  },
  {
    bg: 'bg-sky-500/20 text-sky-300 border-sky-500/50 shadow-[0_0_20px_rgba(14,165,233,0.3)]',
    glow: 'rgba(14,165,233,0.4)',
    badge: 'bg-sky-500 text-slate-950 font-black'
  },
  {
    bg: 'bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]',
    glow: 'rgba(168,85,247,0.4)',
    badge: 'bg-purple-500 text-slate-950 font-black'
  },
  {
    bg: 'bg-pink-500/20 text-pink-300 border-pink-500/50 shadow-[0_0_20px_rgba(236,72,153,0.3)]',
    glow: 'rgba(236,72,153,0.4)',
    badge: 'bg-pink-500 text-slate-950 font-black'
  }
];

export function getWordColorPalette(rank: number, total: number) {
  const index = Math.min(
    Math.floor((rank / Math.max(1, total)) * WORD_CLOUD_PALETTES.length),
    WORD_CLOUD_PALETTES.length - 1
  );
  return WORD_CLOUD_PALETTES[index] || WORD_CLOUD_PALETTES[0];
}
