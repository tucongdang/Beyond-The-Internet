import { QuestionItem } from '../types';
import { soundFx } from './audioEffects';

export interface McCoPilotResult {
  headline: string;
  mcLine: string;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

export interface SpeakQuestionOptions {
  options?: Record<string, string> | null;
  roundType?: string;
  eliminatedOptions?: string[];
  correctKey?: string;
  explanation?: string;
  isReveal?: boolean;
}

export const aiExplanationService = {
  _ttsVolume: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bti_tts_volume');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val)) return Math.max(0, Math.min(1, val));
      }
    }
    return 1.0;
  })(),
  _ttsListeners: new Set<(vol: number) => void>(),

  _ttsPitch: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bti_tts_pitch');
      if (saved !== null) {
        const val = parseFloat(saved);
        if (!isNaN(val)) return Math.max(0.5, Math.min(2.0, val));
      }
    }
    return 1.0;
  })(),
  _ttsPitchListeners: new Set<(pitch: number) => void>(),

  _selectedVoiceURI: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bti_tts_voice_uri');
      if (saved !== null) return saved;
    }
    return '';
  })(),
  _ttsVoiceListeners: new Set<(voiceURI: string) => void>(),

  _activeSpeechState: { text: '', active: false, type: 'none' },
  _speechListeners: new Set<(state: { text: string; active: boolean; type: string }) => void>(),

  getActiveSpeechState() {
    return this._activeSpeechState;
  },

  subscribeSpeechState(listener: (state: { text: string; active: boolean; type: string }) => void): () => void {
    this._speechListeners.add(listener);
    return () => {
      this._speechListeners.delete(listener);
    };
  },

  _emitSpeechState(text: string, active: boolean, type: string = 'general'): void {
    this._activeSpeechState = { text, active, type };
    this._speechListeners.forEach(listener => {
      try {
        listener(this._activeSpeechState);
      } catch {}
    });
  },

  getTtsVolume(): number {
    return this._ttsVolume;
  },

  setTtsVolume(vol: number): void {
    this._ttsVolume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_tts_volume', String(this._ttsVolume));
    }
    this._ttsListeners.forEach(listener => {
      try {
        listener(this._ttsVolume);
      } catch {}
    });
  },

  subscribeTtsVolume(listener: (vol: number) => void): () => void {
    this._ttsListeners.add(listener);
    return () => {
      this._ttsListeners.delete(listener);
    };
  },

  getTtsPitch(): number {
    return this._ttsPitch;
  },

  setTtsPitch(pitch: number): void {
    this._ttsPitch = Math.max(0.5, Math.min(2.0, pitch));
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_tts_pitch', String(this._ttsPitch));
    }
    this._ttsPitchListeners.forEach(listener => {
      try {
        listener(this._ttsPitch);
      } catch {}
    });
  },

  subscribeTtsPitch(listener: (pitch: number) => void): () => void {
    this._ttsPitchListeners.add(listener);
    return () => {
      this._ttsPitchListeners.delete(listener);
    };
  },

  getSelectedVoiceURI(): string {
    return this._selectedVoiceURI || 'auto';
  },

  setSelectedVoiceURI(voiceURI: string): void {
    this._selectedVoiceURI = voiceURI;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_tts_voice_uri', voiceURI);
    }
    this._ttsVoiceListeners.forEach(listener => {
      try {
        listener(this._selectedVoiceURI);
      } catch {}
    });
  },

  subscribeSelectedVoice(listener: (voiceURI: string) => void): () => void {
    this._ttsVoiceListeners.add(listener);
    return () => {
      this._ttsVoiceListeners.delete(listener);
    };
  },

  getAvailableVoices(): SpeechSynthesisVoice[] {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        return window.speechSynthesis.getVoices() || [];
      } catch {
        return [];
      }
    }
    return [];
  },

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
          target_lang: targetLang
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
          totalVotes
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
   * Build natural formatted speech text containing the question and answer options
   */
  buildSpeechText(
    questionText: string,
    optionsConfig?: SpeakQuestionOptions,
    langCode: string = 'vi'
  ): string {
    const cleanQ = (questionText || '').trim();
    if (!optionsConfig) return cleanQ;

    const { options, roundType, eliminatedOptions = [], correctKey, explanation, isReveal } = optionsConfig;
    const isVi = langCode === 'vi';
    const isEn = langCode === 'en';

    let speech = cleanQ;

    if (options && typeof options === 'object') {
      const entries = Object.entries(options).filter(([k]) => !eliminatedOptions.includes(k));
      if (entries.length > 0) {
        if (roundType === 'TRUE_FALSE_4') {
          const intro = isVi ? 'Bốn mệnh đề gồm có:' : isEn ? 'The four statements are:' : 'Statements:';
          const items = entries.map(([k, label]) => {
            const prefix = isVi ? `Mệnh đề ${k}:` : isEn ? `Statement ${k}:` : `${k}:`;
            return `${prefix} ${label}.`;
          }).join(' ');
          speech += `. ${intro} ${items}`;
        } else if (roundType === 'SEQUENCING') {
          const intro = isVi ? 'Các mục cần sắp xếp gồm có:' : isEn ? 'The items to order are:' : 'Items to order:';
          const items = entries.map(([k, label]) => {
            const prefix = isVi ? `Mục ${k}:` : isEn ? `Item ${k}:` : `${k}:`;
            return `${prefix} ${label}.`;
          }).join(' ');
          speech += `. ${intro} ${items}`;
        } else if (roundType === 'TRUE_FALSE') {
          const intro = isVi ? 'Các lựa chọn:' : isEn ? 'The choices are:' : 'Choices:';
          const items = entries.map(([k, label]) => {
            const prefix = isVi ? `Lựa chọn ${k}:` : isEn ? `Option ${k}:` : `${k}:`;
            return `${prefix} ${label}.`;
          }).join(' ');
          speech += `. ${intro} ${items}`;
        } else {
          // Standard Multiple Choice, Image Poll, etc.
          const intro = isVi ? 'Các đáp án trắc nghiệm gồm có:' : isEn ? 'Multiple choice options are:' : 'Options:';
          const items = entries.map(([k, label]) => {
            const prefix = isVi ? `Đáp án ${k}:` : isEn ? `Option ${k}:` : `${k}:`;
            return `${prefix} ${label}.`;
          }).join(' ');
          speech += `. ${intro} ${items}`;
        }
      }
    }

    if (isReveal && correctKey) {
      const correctNotice = isVi
        ? `Đáp án chính xác là: ${correctKey}.`
        : isEn
        ? `The correct answer is: Option ${correctKey}.`
        : `Correct answer: ${correctKey}.`;
      speech += ` ${correctNotice}`;

      if (explanation && explanation.trim()) {
        const expIntro = isVi ? 'Giải thích:' : isEn ? 'Explanation:' : 'Explanation:';
        speech += ` ${expIntro} ${explanation.trim()}.`;
      }
    }

    return speech;
  },

  /**
   * Native Web Speech API Voice Text-To-Speech
   * Completely client-side, zero latency, offline-capable.
   * Speaks question text and multiple-choice options with natural pacing.
   */
  speakQuestionText(
    text: string,
    langCode: string = 'vi',
    onEnd?: () => void,
    onError?: () => void,
    optionsConfig?: SpeakQuestionOptions
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    window.speechSynthesis.cancel(); // Cancel any existing playback
    soundFx.setTtsActive(true);

    const fullSpeechText = optionsConfig
      ? this.buildSpeechText(text, optionsConfig, langCode)
      : text;

    this._emitSpeechState(fullSpeechText, true, optionsConfig?.isReveal ? 'answer' : 'question');

    const utterance = new SpeechSynthesisUtterance(fullSpeechText);
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

    const targetLang = speechLangMap[langCode] || 'vi-VN';
    utterance.lang = targetLang;
    utterance.rate = 1.0;
    utterance.pitch = this.getTtsPitch();
    utterance.volume = this.getTtsVolume();

    // Pick user-selected voice or fallback to best matching voice
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const userVoiceURI = this.getSelectedVoiceURI();
        if (userVoiceURI && userVoiceURI !== 'auto') {
          const customVoice = voices.find(v => v.voiceURI === userVoiceURI || v.name === userVoiceURI);
          if (customVoice) {
            utterance.voice = customVoice;
          }
        }
        if (!utterance.voice) {
          const langPrefix = targetLang.split('-')[0].toLowerCase();
          const matchedVoice = voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase())
            || voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }
      }
    } catch {
      // Ignore voice lookup error
    }

    utterance.onend = () => {
      activeUtterance = null;
      soundFx.setTtsActive(false);
      this._emitSpeechState('', false, 'none');
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      soundFx.setTtsActive(false);
      this._emitSpeechState('', false, 'none');
      console.warn('[SpeechSynthesis] Error:', e);
      if (onError) onError();
    };

    window.speechSynthesis.speak(utterance);
    return true;
  },

  /**
   * Build natural speech text specifically for the correct answer reveal
   */
  buildCorrectAnswerSpeechText(
    optionsConfig: SpeakQuestionOptions,
    langCode: string = 'vi'
  ): string {
    const { options, roundType, correctKey = '', explanation } = optionsConfig;
    const isVi = langCode === 'vi';
    const isEn = langCode === 'en';
    const cleanKey = (correctKey || '').trim().toUpperCase();

    if (!cleanKey) return '';

    let answerSpeech = '';

    if (roundType === 'TRUE_FALSE_4') {
      if (isVi) {
        answerSpeech = `Đáp án chính xác cho bốn mệnh đề là: `;
        if (options && typeof options === 'object') {
          const parts = Object.entries(options).map(([k]) => {
            const isTrue = cleanKey.includes(`${k}:Đ`) || cleanKey.includes(`${k}:D`) || cleanKey.includes(`${k}:TRUE`);
            return `Mệnh đề ${k}: ${isTrue ? 'Đúng' : 'Sai'}.`;
          });
          answerSpeech += parts.join(' ');
        } else {
          answerSpeech += cleanKey;
        }
      } else if (isEn) {
        answerSpeech = `The correct statements are: ${cleanKey}.`;
      } else {
        answerSpeech = `Correct statements: ${cleanKey}.`;
      }
    } else if (roundType === 'SEQUENCING') {
      if (isVi) {
        answerSpeech = `Thứ tự sắp xếp chính xác là: ${cleanKey.replace(/-/g, ', ')}.`;
      } else if (isEn) {
        answerSpeech = `The correct order is: ${cleanKey.replace(/-/g, ', ')}.`;
      } else {
        answerSpeech = `Correct order: ${cleanKey}.`;
      }
    } else if (roundType === 'SHORT_ANSWER' || roundType === 'FILL_IN_BLANK' || roundType === 'VCNV') {
      if (isVi) {
        answerSpeech = `Đáp án chính xác là: ${cleanKey}.`;
      } else if (isEn) {
        answerSpeech = `The correct answer is: ${cleanKey}.`;
      } else {
        answerSpeech = `Correct answer: ${cleanKey}.`;
      }
    } else {
      // Standard Multiple Choice / True-False / Image Poll
      const optionLabel = options && typeof options === 'object' ? options[cleanKey] : '';
      if (isVi) {
        if (optionLabel) {
          answerSpeech = `Đáp án chính xác là: Đáp án ${cleanKey}: ${optionLabel}.`;
        } else {
          answerSpeech = `Đáp án chính xác là: Đáp án ${cleanKey}.`;
        }
      } else if (isEn) {
        if (optionLabel) {
          answerSpeech = `The correct answer is: Option ${cleanKey}: ${optionLabel}.`;
        } else {
          answerSpeech = `The correct answer is: Option ${cleanKey}.`;
        }
      } else {
        answerSpeech = `Correct answer: ${cleanKey}. ${optionLabel || ''}`;
      }
    }

    if (explanation && explanation.trim()) {
      const expIntro = isVi ? 'Giải thích:' : isEn ? 'Explanation:' : 'Explanation:';
      answerSpeech += ` ${expIntro} ${explanation.trim()}.`;
    }

    return answerSpeech;
  },

  /**
   * Automatically speak the correct answer when timer expires or answer is revealed
   */
  speakCorrectAnswer(
    optionsConfig: SpeakQuestionOptions,
    langCode: string = 'vi',
    onEnd?: () => void,
    onError?: () => void
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return false;
    }

    const speechText = this.buildCorrectAnswerSpeechText(optionsConfig, langCode);
    if (!speechText.trim()) return false;

    window.speechSynthesis.cancel();
    soundFx.setTtsActive(true);
    this._emitSpeechState(speechText, true, 'explanation');

    const utterance = new SpeechSynthesisUtterance(speechText);
    activeUtterance = utterance;
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

    const targetLang = speechLangMap[langCode] || 'vi-VN';
    utterance.lang = targetLang;
    utterance.rate = 1.0;
    utterance.pitch = this.getTtsPitch();
    utterance.volume = this.getTtsVolume();

    // Pick user-selected voice or fallback to best matching voice
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const userVoiceURI = this.getSelectedVoiceURI();
        if (userVoiceURI && userVoiceURI !== 'auto') {
          const customVoice = voices.find(v => v.voiceURI === userVoiceURI || v.name === userVoiceURI);
          if (customVoice) {
            utterance.voice = customVoice;
          }
        }
        if (!utterance.voice) {
          const langPrefix = targetLang.split('-')[0].toLowerCase();
          const matchedVoice = voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase())
            || voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
          if (matchedVoice) {
            utterance.voice = matchedVoice;
          }
        }
      }
    } catch {
      // Ignore voice lookup error
    }

    utterance.onend = () => {
      activeUtterance = null;
      soundFx.setTtsActive(false);
      this._emitSpeechState('', false, 'none');
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      soundFx.setTtsActive(false);
      this._emitSpeechState('', false, 'none');
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
    soundFx.setTtsActive(false);
    this._emitSpeechState('', false, 'none');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    }
  }
};
