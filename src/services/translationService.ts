import { QuestionItem, QuestionTranslation } from '../types';

export interface SupportedLanguageOption {
  code: string;
  label: string;
  nativeLabel: string;
  flag: string;
}

export const SUPPORTED_TRANSLATION_LANGUAGES: SupportedLanguageOption[] = [
  { code: 'en', label: 'English', nativeLabel: 'English', flag: '🇬🇧' },
  { code: 'zh', label: 'Chinese', nativeLabel: '中文', flag: '🇨🇳' },
  { code: 'ja', label: 'Japanese', nativeLabel: '日本語', flag: '🇯🇵' },
  { code: 'ko', label: 'Korean', nativeLabel: '한국어', flag: '🇰🇷' },
  { code: 'fr', label: 'French', nativeLabel: 'Français', flag: '🇫🇷' },
  { code: 'es', label: 'Spanish', nativeLabel: 'Español', flag: '🇪🇸' },
  { code: 'de', label: 'German', nativeLabel: 'Deutsch', flag: '🇩🇪' },
  { code: 'th', label: 'Thai', nativeLabel: 'ไทย', flag: '🇹🇭' },
  { code: 'lo', label: 'Lao', nativeLabel: 'ພາສາລາວ', flag: '🇱🇦' },
  { code: 'km', label: 'Khmer', nativeLabel: 'ភាសាខ្មែរ', flag: '🇰🇭' },
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский', flag: '🇷🇺' }
];

// Local memory cache to ensure 0ms instantaneous lookup and 0 token re-calls
const memoryCache = new Map<string, QuestionTranslation>();
const surveyMemoryCache = new Map<string, SurveyTranslation>();

export interface SurveyTranslation {
  title: string;
  description: string;
  gift_note: string;
}

function getAuthHeaders(): Record<string, string> {
  let token = 'bti2026_admin_authorized';
  if (typeof sessionStorage !== 'undefined') {
    const sessionToken = sessionStorage.getItem('BTI2026_ADMIN_TOKEN');
    if (sessionToken) token = sessionToken;
  }
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };
}

function getCacheKey(questionId: string, lang: string): string {
  return `bti_trans_${questionId}_${lang}`;
}

export const translationService = {
  /**
   * Retrieves translation from memory or persistent localStorage cache
   */
  getCachedTranslation(questionId: string, targetLang: string): QuestionTranslation | null {
    if (!questionId || !targetLang || targetLang === 'vi') return null;

    const key = getCacheKey(questionId, targetLang);
    if (memoryCache.has(key)) {
      return memoryCache.get(key)!;
    }

    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed = JSON.parse(stored) as QuestionTranslation;
        memoryCache.set(key, parsed);
        return parsed;
      }
    } catch {}

    return null;
  },

  /**
   * Caches translation locally
   */
  setCachedTranslation(questionId: string, targetLang: string, translation: QuestionTranslation): void {
    if (!questionId || !targetLang || targetLang === 'vi') return;

    const key = getCacheKey(questionId, targetLang);
    memoryCache.set(key, translation);
    try {
      localStorage.setItem(key, JSON.stringify(translation));
    } catch {}
  },

  /**
   * Translates a single question using lightweight Gemini fallback endpoint.
   * Checks cache first; if cached, returns in 0ms without hitting AI.
   */
  async translateQuestion(
    question: Pick<QuestionItem, 'id' | 'question_text' | 'options' | 'explanation'>,
    targetLang: string,
    apiKey?: string
  ): Promise<QuestionTranslation> {
    if (!targetLang || targetLang === 'vi') {
      return {
        question_text: question.question_text,
        options: question.options,
        explanation: question.explanation
      };
    }

    // 1. Check local cache
    const cached = this.getCachedTranslation(question.id, targetLang);
    if (cached) {
      return cached;
    }

    // 2. Call backend translation endpoint (powered by Gemini Flash models)
    try {
      const resp = await fetch('/api/translate-question', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          question_text: question.question_text,
          options: question.options,
          explanation: question.explanation || '',
          target_lang: targetLang
        })
      });

      if (!resp.ok) {
        const errJson = await resp.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${resp.status}: Dịch thất bại.`);
      }

      const data = await resp.json();
      const translation: QuestionTranslation = data.translation || {
        question_text: question.question_text,
        options: question.options,
        explanation: question.explanation
      };

      // 3. Cache result
      this.setCachedTranslation(question.id, targetLang, translation);

      return translation;
    } catch (err: any) {
      console.warn(`[TranslationService] Fallback to original for question ${question.id} (${targetLang}):`, err?.message || err);
      return {
        question_text: question.question_text,
        options: question.options,
        explanation: question.explanation
      };
    }
  },

  /**
   * Translates a short answer or term into the target language (Vietnamese, English, Korean, Japanese, Chinese, etc.).
   * Checks local memory and localStorage cache first for 0ms lookup.
   */
  async translateShortAnswer(text: string, targetLang: string = 'vi', apiKey?: string): Promise<string> {
    if (!text || typeof text !== 'string' || !text.trim()) {
      return '';
    }

    const trimmed = text.trim();
    const lang = targetLang || 'vi';
    const cacheKey = `bti_trans_short_${lang}_${trimmed.toLowerCase()}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {}

    try {
      const resp = await fetch('/api/translate-short-answer', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          text: trimmed,
          target_lang: lang
        })
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const translated = data.translated_text || trimmed;

      try {
        localStorage.setItem(cacheKey, translated);
      } catch {}

      return translated;
    } catch (err) {
      console.warn(`[TranslationService] Failed to translate short answer "${trimmed}" to ${lang}:`, err);
      return trimmed;
    }
  },

  /**
   * Translates a short answer or term into natural, accurate Vietnamese (Tiếng Việt).
   */
  async translateShortAnswerToVietnamese(text: string, apiKey?: string): Promise<string> {
    return this.translateShortAnswer(text, 'vi', apiKey);
  },

  /**
   * Translates answer options from Vietnamese into a foreign language
   */
  async translateOptions(
    options: Record<string, string>,
    targetLang: string,
    apiKey?: string
  ): Promise<Record<string, string>> {
    if (!targetLang || targetLang === 'vi' || !options || Object.keys(options).length === 0) {
      return options;
    }

    try {
      const resp = await fetch('/api/translate-answers', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          options,
          target_lang: targetLang
        })
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      return data.translated_options || options;
    } catch (err) {
      console.warn(`[TranslationService] Failed to translate options to ${targetLang}:`, err);
      return options;
    }
  },

  /**
   * Batch translate multiple questions (for admin preparing questions ahead of time)
   */
  async batchTranslateQuestions(
    questions: QuestionItem[],
    targetLang: string,
    apiKey?: string,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Record<string, QuestionTranslation>> {
    const results: Record<string, QuestionTranslation> = {};
    const total = questions.length;
    let completed = 0;

    for (const q of questions) {
      try {
        const trans = await this.translateQuestion(q, targetLang, apiKey);
        results[q.id] = trans;
      } catch (err) {
        console.warn(`[BatchTranslate] Failed question ${q.id}:`, err);
      }
      completed++;
      if (onProgress) {
        onProgress(completed, total);
      }
      // Brief pause to honor rate limits
      await new Promise(r => setTimeout(r, 200));
    }

    return results;
  },

  /**
   * Translates Audience Survey invitation info (Title, Description, Gift Note) into target language
   */
  async translateSurveyConfig(
    config: { title?: string; description?: string; gift_note?: string },
    targetLang: string
  ): Promise<SurveyTranslation> {
    const fallback: SurveyTranslation = {
      title: config.title || 'Khảo Sát Khán Giả BTI 2026',
      description: config.description || '',
      gift_note: config.gift_note || ''
    };

    if (!targetLang || targetLang === 'vi') {
      return fallback;
    }

    const cacheKey = `bti_trans_survey_${targetLang}_${(config.title || '').slice(0, 20)}`;
    if (surveyMemoryCache.has(cacheKey)) {
      return surveyMemoryCache.get(cacheKey)!;
    }

    try {
      const stored = localStorage.getItem(cacheKey);
      if (stored) {
        const parsed = JSON.parse(stored) as SurveyTranslation;
        surveyMemoryCache.set(cacheKey, parsed);
        return parsed;
      }
    } catch {}

    try {
      const resp = await fetch('/api/translate-survey', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          title: config.title,
          description: config.description,
          gift_note: config.gift_note,
          target_lang: targetLang
        })
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      const translation: SurveyTranslation = data.translation || fallback;

      surveyMemoryCache.set(cacheKey, translation);
      try {
        localStorage.setItem(cacheKey, JSON.stringify(translation));
      } catch {}

      return translation;
    } catch (err) {
      console.warn(`[TranslationService] Failed to translate survey config to ${targetLang}:`, err);
      return fallback;
    }
  },

  /**
   * Batch translates survey questions (Google Form structure items) into target language
   */
  async translateSurveyQuestions(
    items: Array<{ id: string; title: string; description?: string; options?: string[]; scaleLowLabel?: string; scaleHighLabel?: string }>,
    targetLang: string
  ): Promise<Array<{ id: string; title: string; description?: string; options?: string[]; scaleLowLabel?: string; scaleHighLabel?: string }>> {
    if (!targetLang || targetLang === 'vi' || !items || items.length === 0) {
      return items;
    }

    try {
      const resp = await fetch('/api/translate-survey-questions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          items,
          target_lang: targetLang
        })
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}`);
      }

      const data = await resp.json();
      return data.items || items;
    } catch (err) {
      console.warn(`[TranslationService] Failed to translate survey questions to ${targetLang}:`, err);
      return items;
    }
  }
};
