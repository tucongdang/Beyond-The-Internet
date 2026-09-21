/**
 * Ambient Noise Detection Service
 * Analyzes ambient microphone audio levels to detect noisy environments
 * and intelligently suggests/applies volume boost and live subtitles.
 */

import { soundFx } from './audioEffects';
import { aiExplanationService } from './aiExplanationService';

export type NoiseCategory = 'QUIET' | 'MODERATE' | 'LOUD';

export interface NoiseLevelData {
  rms: number;
  decibels: number;
  score0to100: number;
  category: NoiseCategory;
  isLoud: boolean;
}

export interface LoudSuggestionEvent {
  decibels: number;
  score: number;
  timestamp: number;
}

class AmbientNoiseService {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private animationFrameId: number | null = null;

  private isRunning = false;
  private currentLevelData: NoiseLevelData = {
    rms: 0,
    decibels: -60,
    score0to100: 0,
    category: 'QUIET',
    isLoud: false
  };

  private loudStartTime: number | null = null;
  private isLoudActive = false;
  private lastAlertTimestamp = 0;
  private alertCooldownMs = 3 * 60 * 1000; // 3 minutes cooldown between suggestion alerts

  // Subscribers
  private noiseLevelListeners = new Set<(data: NoiseLevelData) => void>();
  private suggestionListeners = new Set<(event: LoudSuggestionEvent) => void>();
  private autoBoostListeners = new Set<(message: string) => void>();
  private subtitleListeners = new Set<(enabled: boolean) => void>();
  private activeSpeechListeners = new Set<(speech: { text: string; active: boolean; type?: string }) => void>();

  // Thresholds
  private readonly LOUD_RMS_THRESHOLD = 0.09; // Threshold for loud environment
  private readonly SUSTAINED_LOUD_MS = 1400; // Must be sustained for 1.4s to trigger alert

  constructor() {
    // If enabled by user preference, we can prepare on first user interaction
  }

  // --- Subtitles Settings ---
  public isSubtitlesEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('bti_subtitles_enabled') === 'true';
  }

  public setSubtitlesEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_subtitles_enabled', enabled ? 'true' : 'false');
    }
    this.subtitleListeners.forEach(listener => {
      try {
        listener(enabled);
      } catch {}
    });
  }

  public subscribeSubtitles(listener: (enabled: boolean) => void): () => void {
    this.subtitleListeners.add(listener);
    return () => this.subtitleListeners.delete(listener);
  }

  // --- Auto Boost Setting ---
  public isAutoBoostEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('bti_ambient_auto_boost') === 'true';
  }

  public setAutoBoostEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_ambient_auto_boost', enabled ? 'true' : 'false');
    }
  }

  // --- Auto Subtitles on Loud Noise Setting ---
  public isAutoSubtitlesOnLoudEnabled(): boolean {
    if (typeof window === 'undefined') return true;
    const val = localStorage.getItem('bti_ambient_auto_subtitles');
    return val === null ? true : val === 'true';
  }

  public setAutoSubtitlesOnLoudEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_ambient_auto_subtitles', enabled ? 'true' : 'false');
    }
  }

  // --- Listener Toggle Setting ---
  public isListenerEnabled(): boolean {
    if (typeof window === 'undefined') return false;
    const val = localStorage.getItem('bti_ambient_listener_enabled');
    return val === 'true';
  }

  public setListenerEnabled(enabled: boolean): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_ambient_listener_enabled', enabled ? 'true' : 'false');
    }
    if (enabled) {
      this.startListening();
    } else {
      this.stopListening();
    }
  }

  // --- Active Speech Captions Tracking ---
  public updateActiveSpeech(text: string, active: boolean, type: string = 'general'): void {
    this.activeSpeechListeners.forEach(listener => {
      try {
        listener({ text, active, type });
      } catch {}
    });
  }

  public subscribeActiveSpeech(listener: (speech: { text: string; active: boolean; type?: string }) => void): () => void {
    this.activeSpeechListeners.add(listener);
    return () => this.activeSpeechListeners.delete(listener);
  }

  // --- Microphone & Audio Level Analysis ---
  public async startListening(): Promise<boolean> {
    if (this.isRunning) return true;
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      console.warn('[AmbientNoiseService] Web Audio/MediaDevices not supported in this environment');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      });

      this.mediaStream = stream;
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx();

      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.6;

      this.sourceNode = this.audioContext.createMediaStreamSource(stream);
      this.sourceNode.connect(this.analyser);

      this.isRunning = true;
      this.processAudio();
      return true;
    } catch (err) {
      console.warn('[AmbientNoiseService] Microphone permission denied or audio init failed:', err);
      this.isRunning = false;
      return false;
    }
  }

  public stopListening(): void {
    this.isRunning = false;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {}
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach(track => track.stop());
      } catch {}
      this.mediaStream = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch {}
      this.audioContext = null;
    }

    this.analyser = null;
    this.loudStartTime = null;
    this.isLoudActive = false;

    this.currentLevelData = {
      rms: 0,
      decibels: -60,
      score0to100: 0,
      category: 'QUIET',
      isLoud: false
    };

    this.notifyNoiseLevel();
  }

  public isListeningActive(): boolean {
    return this.isRunning;
  }

  public getCurrentLevel(): NoiseLevelData {
    return this.currentLevelData;
  }

  private processAudio = (): void => {
    if (!this.isRunning || !this.analyser) return;

    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteTimeDomainData(dataArray);

    // Compute RMS from time-domain waveform
    let sumSquares = 0;
    for (let i = 0; i < dataArray.length; i++) {
      const normalized = (dataArray[i] - 128) / 128; // -1.0 to 1.0
      sumSquares += normalized * normalized;
    }
    const rms = Math.sqrt(sumSquares / dataArray.length);

    // Decibel calculation approx (-60dB to 0dB)
    const decibels = Math.max(-60, Math.min(0, 20 * Math.log10(rms + 1e-4)));
    
    // Normalized visual energy score (0 - 100)
    const score0to100 = Math.min(100, Math.round((rms / 0.25) * 100));

    let category: NoiseCategory = 'QUIET';
    if (rms > this.LOUD_RMS_THRESHOLD) {
      category = 'LOUD';
    } else if (rms > 0.035) {
      category = 'MODERATE';
    }

    const now = Date.now();
    const isCurrentlyLoud = category === 'LOUD';

    if (isCurrentlyLoud) {
      if (this.loudStartTime === null) {
        this.loudStartTime = now;
      } else if (now - this.loudStartTime >= this.SUSTAINED_LOUD_MS) {
        if (!this.isLoudActive) {
          this.isLoudActive = true;
          this.handleLoudEnvironmentDetected(decibels, score0to100);
        }
      }
    } else {
      if (this.loudStartTime !== null && now - this.loudStartTime > 2000) {
        this.loudStartTime = null;
        this.isLoudActive = false;
      }
    }

    this.currentLevelData = {
      rms,
      decibels,
      score0to100,
      category,
      isLoud: this.isLoudActive
    };

    this.notifyNoiseLevel();

    this.animationFrameId = requestAnimationFrame(this.processAudio);
  };

  private handleLoudEnvironmentDetected(decibels: number, score: number): void {
    const now = Date.now();

    // Check if auto-boost is configured
    if (this.isAutoBoostEnabled()) {
      // Boost TTS and SFX to 100%
      aiExplanationService.setTtsVolume(1.0);
      soundFx.setVolume(1.0);

      if (this.isAutoSubtitlesOnLoudEnabled() && !this.isSubtitlesEnabled()) {
        this.setSubtitlesEnabled(true);
      }

      this.autoBoostListeners.forEach(listener => {
        try {
          listener('Loud environment detected: Volume boosted to 100% and Subtitles activated.');
        } catch {}
      });
      return;
    }

    // Otherwise, check cooldown to show interactive suggestion banner
    if (now - this.lastAlertTimestamp >= this.alertCooldownMs) {
      this.lastAlertTimestamp = now;
      const event: LoudSuggestionEvent = {
        decibels,
        score,
        timestamp: now
      };

      this.suggestionListeners.forEach(listener => {
        try {
          listener(event);
        } catch {}
      });
    }
  }

  // Action methods triggered by suggestion modal/banner
  public applyLoudEnvironmentAdjustments(options: { boostVolume?: boolean; enableSubtitles?: boolean }): void {
    if (options.boostVolume) {
      aiExplanationService.setTtsVolume(1.0);
      soundFx.setVolume(1.0);
    }
    if (options.enableSubtitles) {
      this.setSubtitlesEnabled(true);
    }
  }

  public dismissAlertForDuration(minutes: number = 5): void {
    this.lastAlertTimestamp = Date.now() + (minutes * 60 * 1000) - this.alertCooldownMs;
  }

  // --- Subscriptions ---
  public subscribeNoiseLevel(listener: (data: NoiseLevelData) => void): () => void {
    this.noiseLevelListeners.add(listener);
    return () => this.noiseLevelListeners.delete(listener);
  }

  public subscribeSuggestion(listener: (event: LoudSuggestionEvent) => void): () => void {
    this.suggestionListeners.add(listener);
    return () => this.suggestionListeners.delete(listener);
  }

  public subscribeAutoBoost(listener: (msg: string) => void): () => void {
    this.autoBoostListeners.add(listener);
    return () => this.autoBoostListeners.delete(listener);
  }

  private notifyNoiseLevel(): void {
    this.noiseLevelListeners.forEach(listener => {
      try {
        listener(this.currentLevelData);
      } catch {}
    });
  }
}

export const ambientNoiseService = new AmbientNoiseService();
