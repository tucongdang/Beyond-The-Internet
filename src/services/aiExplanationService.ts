import { QuestionItem } from '../types';

export interface McCoPilotResult {
  headline: string;
  mcLine: string;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export const aiExplanationService = {
  /**
   * Fetch 2-3 sentence instant explanation on demand for audience view.
   * Leverages client-side localStorage caching for 0ms re-reads.
   */
  async getInstantExplanation(
    question: Pick<QuestionItem, 'id' | 'question_text' | 'options' | 'explanation' | 'correct_key'>,
    targetLang: string = 'vi',
    apiKey?: string
  ): Promise<string> {
    const qId = question.id || 'current';
    const cacheKey = `bti_ai_explain_${qId}_${targetLang}`;

    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) return cached;
    } catch {}

    const correctKey = (question.correct_key || 'A').toUpperCase();
    const correctOptionText = question.options?.[correctKey] || '';

    try {
      const resp = await fetch('/api/explain-question', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: question.question_text,
          correct_key: correctKey,
          correct_option_text: correctOptionText,
          explanation: question.explanation || '',
          target_lang: targetLang,
          apiKey: apiKey || localStorage.getItem('bti_gemini_api_key') || undefined
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        const text = data.explanation || question.explanation || '';
        try {
          localStorage.setItem(cacheKey, text);
        } catch {}
        return text;
      }
    } catch (err) {
      console.warn('[AIExplanationService] Failed to fetch Gemini explanation, using fallback:', err);
    }

    // Fallback: return default explanation from question item
    return question.explanation || 'Đáp án chính xác đã được hệ thống xác thực.';
  },

  /**
   * Request live MC Co-pilot advice based on audience answer distribution.
   */
  async getMcCoPilotCommentary(
    questionText: string,
    correctKey: string,
    counts: Record<string, number> = {},
    percentages: Record<string, number> = {},
    totalVotes: number = 0,
    apiKey?: string
  ): Promise<McCoPilotResult> {
    try {
      const resp = await fetch('/api/mc-copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question_text: questionText,
          correct_key: correctKey,
          counts,
          percentages,
          totalVotes,
          apiKey: apiKey || localStorage.getItem('bti_gemini_api_key') || undefined
        })
      });

      if (resp.ok) {
        const data = await resp.json();
        if (data.headline && data.mcLine) {
          return data;
        }
      }
    } catch (err) {
      console.warn('[AIExplanationService] MC Co-pilot fetch failed, using smart heuristics:', err);
    }

    // Smart Local Heuristics Fallback
    const correctPct = percentages[correctKey] || 0;
    let headline = 'Phân bổ câu trả lời cân bằng!';
    let mcLine = `Có ${totalVotes} khán giả tham gia, tỉ lệ chính xác đạt ${correctPct}%.`;

    // Find if there's a dominant wrong answer
    let maxWrongKey = '';
    let maxWrongPct = 0;
    Object.entries(percentages).forEach(([k, pct]) => {
      if (k !== correctKey && pct > maxWrongPct) {
        maxWrongPct = pct;
        maxWrongKey = k;
      }
    });

    if (maxWrongPct >= 35) {
      headline = `Bẫy tâm lý tại phương án ${maxWrongKey}!`;
      mcLine = `Hơn ${maxWrongPct}% khán phòng đã chọn ${maxWrongKey}, trong khi đáp án chính xác là ${correctKey}!`;
    } else if (correctPct >= 70) {
      headline = 'Đại đa số hội trường đồng lòng!';
      mcLine = `Có tới ${correctPct}% người chơi đưa ra đáp án chính xác ${correctKey} trong chớp mắt!`;
    }

    return { headline, mcLine };
  },

  /**
   * Native Web Speech API Voice Text-To-Speech
   * Completely client-side, zero latency, offline-capable.
   */
  speakQuestionText(
    text: string,
    langCode: string = 'vi',
    onEnd?: () => void,
    onError?: () => void
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    window.speechSynthesis.cancel(); // Cancel any existing playback

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance;
    
    // Map application language codes to BCP 47 speech synthesis tags
    const speechLangMap: Record<string, string> = {
      vi: 'vi-VN',
      en: 'en-US',
      ko: 'ko-KR',
      ja: 'ja-JP',
      zh: 'zh-CN',
      fr: 'fr-FR',
      es: 'es-ES',
      de: 'de-DE',
      th: 'th-TH',
      ru: 'ru-RU'
    };

    utterance.lang = speechLangMap[langCode] || 'vi-VN';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => {
      activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      console.warn('[SpeechSynthesis] Error:', e);
      if (onError) onError();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  },

  /**
   * Stops any currently active speech synthesis
   */
  stopSpeech(): void {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    }
  }
};
