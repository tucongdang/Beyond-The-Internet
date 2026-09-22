import { QuestionItem } from '../types';
import { soundFx } from './audioEffects';

export interface McCoPilotResult {
  headline: string;
  mcLine: string;
}

let activeUtterance: SpeechSynthesisUtterance | null = null;

function createWavBlobFromBase64Audio(base64Data: string, mimeType: string): string {
  if (mimeType.includes('pcm') || (!mimeType.includes('wav') && !mimeType.includes('mp3') && !mimeType.includes('mpeg') && !mimeType.includes('ogg'))) {
    let sampleRate = 24000;
    const rateMatch = mimeType.match(/rate=(\d+)/);
    if (rateMatch && rateMatch[1]) {
      sampleRate = parseInt(rateMatch[1], 10) || 24000;
    }

    try {
      const binaryString = atob(base64Data);
      const pcmLength = binaryString.length;
      const buffer = new ArrayBuffer(44 + pcmLength);
      const view = new DataView(buffer);

      // 'RIFF' chunk descriptor
      view.setUint32(0, 0x52494646, false); // "RIFF"
      view.setUint32(4, 36 + pcmLength, true); // ChunkSize
      view.setUint32(8, 0x57415645, false); // "WAVE"

      // 'fmt ' sub-chunk
      view.setUint32(12, 0x666d7420, false); // "fmt "
      view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
      view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
      view.setUint16(22, 1, true); // NumChannels (1 for mono)
      view.setUint32(24, sampleRate, true); // SampleRate
      view.setUint32(28, sampleRate * 1 * 2, true); // ByteRate
      view.setUint16(32, 2, true); // BlockAlign
      view.setUint16(34, 16, true); // BitsPerSample

      // 'data' sub-chunk
      view.setUint32(36, 0x64617461, false); // "data"
      view.setUint32(40, pcmLength, true); // Subchunk2Size

      // Copy PCM bytes
      const bytes = new Uint8Array(buffer, 44, pcmLength);
      for (let i = 0; i < pcmLength; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch (e) {
      console.warn('[Gemini TTS] Error converting PCM to WAV blob:', e);
    }
  }

  return `data:${mimeType.split(';')[0] || 'audio/mp3'};base64,${base64Data}`;
}

export interface SpeakQuestionOptions {
  options?: Record<string, string> | null;
  roundType?: string;
  eliminatedOptions?: string[];
  correctKey?: string;
  explanation?: string;
  isReveal?: boolean;
}

export const aiExplanationService = {
  _useGeminiTts: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bti_use_gemini_tts');
      if (saved !== null) return saved === 'true';
      localStorage.setItem('bti_use_gemini_tts', 'true');
    }
    return true; // Default to Gemini TTS
  })(),
  _geminiTtsListeners: new Set<(enabled: boolean) => void>(),

  _geminiVoice: (() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('bti_gemini_voice');
      if (saved) return saved;
    }
    return 'Kore'; // 'Kore', 'Puck', 'Charon', 'Fenrir', 'Zephyr'
  })(),
  _geminiVoiceListeners: new Set<(voice: string) => void>(),

  _activeAudioElement: null as HTMLAudioElement | null,

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

  isGeminiTtsEnabled(): boolean {
    return this._useGeminiTts;
  },

  setGeminiTtsEnabled(enabled: boolean): void {
    this._useGeminiTts = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_use_gemini_tts', String(enabled));
    }
    this._geminiTtsListeners.forEach(listener => {
      try { listener(this._useGeminiTts); } catch {}
    });
  },

  subscribeGeminiTts(listener: (enabled: boolean) => void): () => void {
    this._geminiTtsListeners.add(listener);
    return () => { this._geminiTtsListeners.delete(listener); };
  },

  getGeminiVoice(): string {
    return this._geminiVoice || 'Kore';
  },

  setGeminiVoice(voice: string): void {
    this._geminiVoice = voice;
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_gemini_voice', voice);
    }
    this._geminiVoiceListeners.forEach(listener => {
      try { listener(this._geminiVoice); } catch {}
    });
  },

  subscribeGeminiVoice(listener: (voice: string) => void): () => void {
    this._geminiVoiceListeners.add(listener);
    return () => { this._geminiVoiceListeners.delete(listener); };
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
   * Play high quality realistic TTS using Gemini API model gemini-3.1-flash-tts-preview
   */
  async playGeminiTts(
    text: string,
    langCode: string = 'vi',
    onEnd?: () => void,
    onError?: () => void,
    type: string = 'general'
  ): Promise<boolean> {
    this.stopSpeech();
    soundFx.setTtsActive(true);
    this._emitSpeechState(text, true, type);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (typeof window !== 'undefined') {
        const token = sessionStorage.getItem('BTI2026_ADMIN_TOKEN') || 'bti2026_admin_authorized';
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/gemini-tts', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          text,
          voiceName: this.getGeminiVoice(),
          langCode
        })
      });

      if (!res.ok) {
        throw new Error(`Gemini TTS returned HTTP ${res.status}`);
      }

      const data = await res.json();
      if (!data.audio) {
        throw new Error('No audio returned from Gemini TTS');
      }

      const audioUrl = createWavBlobFromBase64Audio(data.audio, data.mimeType || 'audio/pcm;rate=24000');
      const audio = new Audio(audioUrl);
      this._activeAudioElement = audio;
      audio.volume = this.getTtsVolume();

      return new Promise<boolean>((resolve) => {
        audio.onended = () => {
          if (this._activeAudioElement === audio) {
            this._activeAudioElement = null;
          }
          soundFx.setTtsActive(false);
          this._emitSpeechState('', false, 'none');
          if (onEnd) onEnd();
          resolve(true);
        };

        audio.onerror = (e) => {
          if (this._activeAudioElement === audio) {
            this._activeAudioElement = null;
          }
          soundFx.setTtsActive(false);
          this._emitSpeechState('', false, 'none');
          console.warn('[Gemini TTS] Playback error:', e);
          if (onError) onError();
          resolve(false);
        };

        audio.play().catch((err) => {
          console.warn('[Gemini TTS] Audio play error:', err);
          if (this._activeAudioElement === audio) {
            this._activeAudioElement = null;
          }
          soundFx.setTtsActive(false);
          this._emitSpeechState('', false, 'none');
          resolve(false);
        });
      });
    } catch (err) {
      console.warn('[Gemini TTS] API error, will fallback:', err);
      soundFx.setTtsActive(false);
      this._emitSpeechState('', false, 'none');
      return false;
    }
  },

  /**
   * Browser SpeechSynthesis fallback
   */
  speakWithBrowserTTS(
    fullSpeechText: string,
    langCode: string = 'vi',
    onEnd?: () => void,
    onError?: () => void,
    type: string = 'general'
  ): boolean {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      if (onError) onError();
      return false;
    }

    window.speechSynthesis.cancel();
    soundFx.setTtsActive(true);
    this._emitSpeechState(fullSpeechText, true, type);

    const utterance = new SpeechSynthesisUtterance(fullSpeechText);
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

    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        const userVoiceURI = this.getSelectedVoiceURI();
        if (userVoiceURI && userVoiceURI !== 'auto') {
          const customVoice = voices.find(v => v.voiceURI === userVoiceURI || v.name === userVoiceURI);
          if (customVoice) utterance.voice = customVoice;
        }
        if (!utterance.voice) {
          const langPrefix = targetLang.split('-')[0].toLowerCase();
          const matchedVoice = voices.find(v => v.lang.toLowerCase() === targetLang.toLowerCase())
            || voices.find(v => v.lang.toLowerCase().startsWith(langPrefix));
          if (matchedVoice) utterance.voice = matchedVoice;
        }
      }
    } catch {}

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
  /**
   * Text-To-Speech execution (Gemini TTS with Web Speech API fallback)
   */
  speakQuestionText(
    text: string,
    langCode: string = 'vi',
    onEnd?: () => void,
    onError?: () => void,
    optionsConfig?: SpeakQuestionOptions
  ): boolean {
    const fullSpeechText = optionsConfig
      ? this.buildSpeechText(text, optionsConfig, langCode)
      : text;

    const type = optionsConfig?.isReveal ? 'answer' : 'question';

    if (this.isGeminiTtsEnabled()) {
      this.playGeminiTts(fullSpeechText, langCode, onEnd, () => {
        // Fallback to browser TTS if Gemini TTS encounters error
        this.speakWithBrowserTTS(fullSpeechText, langCode, onEnd, onError, type);
      }, type).then((success) => {
        if (!success) {
          this.speakWithBrowserTTS(fullSpeechText, langCode, onEnd, onError, type);
        }
      });
      return true;
    }

    return this.speakWithBrowserTTS(fullSpeechText, langCode, onEnd, onError, type);
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
    const speechText = this.buildCorrectAnswerSpeechText(optionsConfig, langCode);
    if (!speechText.trim()) return false;

    if (this.isGeminiTtsEnabled()) {
      this.playGeminiTts(speechText, langCode, onEnd, () => {
        this.speakWithBrowserTTS(speechText, langCode, onEnd, onError, 'explanation');
      }, 'explanation').then((success) => {
        if (!success) {
          this.speakWithBrowserTTS(speechText, langCode, onEnd, onError, 'explanation');
        }
      });
      return true;
    }

    return this.speakWithBrowserTTS(speechText, langCode, onEnd, onError, 'explanation');
  },

  /**
   * Stops any currently active speech synthesis or Gemini TTS audio
   */
  stopSpeech(): void {
    soundFx.setTtsActive(false);
    this._emitSpeechState('', false, 'none');

    if (this._activeAudioElement) {
      try {
        this._activeAudioElement.pause();
        this._activeAudioElement.onended = null;
        this._activeAudioElement.onerror = null;
        this._activeAudioElement = null;
      } catch {}
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        if (activeUtterance) {
          activeUtterance.onend = null;
          activeUtterance.onerror = null;
          activeUtterance.onstart = null;
          activeUtterance.onpause = null;
          activeUtterance.onresume = null;
          activeUtterance = null;
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        window.speechSynthesis.cancel();
        setTimeout(() => {
          try {
            if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
              window.speechSynthesis.cancel();
            }
          } catch {}
        }, 15);
      } catch (err) {
        console.warn('[SpeechSynthesis] stopSpeech error:', err);
      }
    }
  }
};
