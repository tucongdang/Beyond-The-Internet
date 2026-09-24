/**
 * Web Audio API synthesizer for live game show sound effects
 * 100% self-contained, no external audio files required
 */
class AudioQueueManager {
  private queue: Array<{ playFn: () => void; durationMs: number }> = [];
  private isPlaying = false;
  private timer: any = null;
  private isSuppressed?: () => boolean;

  constructor(isSuppressed?: () => boolean) {
    this.isSuppressed = isSuppressed;
  }

  public enqueue(playFn: () => void, durationMs: number) {
    if (this.isSuppressed && this.isSuppressed()) {
      return;
    }
    this.queue.push({ playFn, durationMs });
    if (!this.isPlaying) {
      this.playNext();
    }
  }

  public clear() {
    this.queue = [];
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.isPlaying = false;
  }

  private playNext() {
    if (this.isSuppressed && this.isSuppressed()) {
      this.clear();
      return;
    }
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const task = this.queue.shift();
    if (task) {
      try {
        if (!this.isSuppressed || !this.isSuppressed()) {
          task.playFn();
        }
      } catch (e) {
        console.error("AudioQueue error", e);
      }
      this.timer = setTimeout(() => {
        this.playNext();
      }, task.durationMs);
    }
  }
}

export type SoundPackTheme = 'classic' | 'retro' | 'cyberpunk' | 'zen' | 'scifi';

export interface SoundPackMeta {
  id: SoundPackTheme;
  nameVi: string;
  nameEn: string;
  descVi: string;
  descEn: string;
  iconEmoji: string;
  badgeColor: string;
  borderColor: string;
}

export const SOUND_PACKS: SoundPackMeta[] = [
  {
    id: 'classic',
    nameVi: 'Trực Tiếp Olympia',
    nameEn: 'Classic Game Show',
    descVi: 'Hợp âm chuông ngân kinh điển, sôi nổi và truyền cảm hứng',
    descEn: 'Classic major fanfare & chime arpeggios',
    iconEmoji: '🏆',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    borderColor: 'border-amber-400/50'
  },
  {
    id: 'retro',
    nameVi: '8-Bit Arcade Pixel',
    nameEn: '8-Bit Retro Arcade',
    descVi: 'Âm thanh máy chơi game thùng NES/Game Boy retro vui nhộn',
    descEn: 'Nostalgic chiptune square-wave coin & jump sounds',
    iconEmoji: '👾',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    borderColor: 'border-emerald-400/50'
  },
  {
    id: 'cyberpunk',
    nameVi: 'Cyberpunk Synthwave',
    nameEn: 'Cyberpunk Synthwave',
    descVi: 'Sóng âm Synthwave Neon 2077 với sub-bass punch và laser arpeggio',
    descEn: 'Futuristic synth chords, sub-bass lasers & glitch pulses',
    iconEmoji: '⚡',
    badgeColor: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
    borderColor: 'border-fuchsia-400/50'
  },
  {
    id: 'zen',
    nameVi: 'Zen Chuông Thạch Anh',
    nameEn: 'Zen Crystal Harmonics',
    descVi: 'Âm vang chuông xoay Tây Tạng và tiếng gõ mộc thư thái',
    descEn: 'Ethereal singing bowl harmonics & bamboo wood block resonance',
    iconEmoji: '🎐',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    borderColor: 'border-teal-400/50'
  },
  {
    id: 'scifi',
    nameVi: 'Vũ Trụ Quantum Warp',
    nameEn: 'Sci-Fi Quantum Warp',
    descVi: 'Hiệu ứng nhảy không gian du hành vũ trụ và khiên chắn năng lượng',
    descEn: 'Quantum warp drive glissando & forcefield deflections',
    iconEmoji: '🚀',
    badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    borderColor: 'border-sky-400/50'
  }
];

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bti_soundfx_enabled');
        if (saved !== null) {
          return saved === 'true';
        }
      } catch {}
    }
    return true;
  })();
  private adminMuted: boolean = false;
  private ttsActive: boolean = false;
  private soundPack: SoundPackTheme = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bti_sound_pack') as SoundPackTheme;
        if (saved && ['classic', 'retro', 'cyberpunk', 'zen', 'scifi'].includes(saved)) {
          return saved;
        }
      } catch {}
    }
    return 'classic';
  })();
  private soundPackListeners: Set<(pack: SoundPackTheme) => void> = new Set();
  private queueManager = new AudioQueueManager(() => this.shouldSuppressAudio());
  private masterGain: GainNode | null = null;
  private volume: number = (() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('bti_soundfx_volume');
        if (saved !== null) {
          const val = parseFloat(saved);
          if (!isNaN(val)) return Math.max(0, Math.min(1, val));
        }
      } catch {}
    }
    return 0.8;
  })();
  private volumeListeners: Set<(vol: number) => void> = new Set();
  private audioActivityListeners: Set<(durationMs: number) => void> = new Set();

  public getSoundPack(): SoundPackTheme {
    return this.soundPack;
  }

  public setSoundPack(pack: SoundPackTheme): void {
    if (!['classic', 'retro', 'cyberpunk', 'zen', 'scifi'].includes(pack)) return;
    this.soundPack = pack;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bti_sound_pack', pack);
      } catch {}
    }
    this.soundPackListeners.forEach(listener => {
      try {
        listener(pack);
      } catch {}
    });
  }

  public subscribeSoundPack(listener: (pack: SoundPackTheme) => void): () => void {
    this.soundPackListeners.add(listener);
    return () => {
      this.soundPackListeners.delete(listener);
    };
  }

  public notifyActivity(durationMs: number = 300) {
    if (this.shouldSuppressAudio()) return;
    this.audioActivityListeners.forEach(listener => {
      try {
        listener(durationMs);
      } catch {}
    });
  }

  public subscribeAudioActivity(listener: (durationMs: number) => void): () => void {
    this.audioActivityListeners.add(listener);
    return () => {
      this.audioActivityListeners.delete(listener);
    };
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(vol: number): void {
    this.volume = Math.max(0, Math.min(1, vol));
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_soundfx_volume', String(this.volume));
    }
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch {}
    }
    this.volumeListeners.forEach(listener => {
      try {
        listener(this.volume);
      } catch {}
    });
  }

  public subscribeVolume(listener: (vol: number) => void): () => void {
    this.volumeListeners.add(listener);
    return () => {
      this.volumeListeners.delete(listener);
    };
  }

  public getDestination(ctx: AudioContext): AudioNode {
    if (!this.masterGain || this.masterGain.context !== ctx) {
      this.masterGain = ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
      this.masterGain.connect(ctx.destination);
    }
    return this.masterGain;
  }

  public clearQueue() {
    this.queueManager.clear();
  }

  /**
   * Completely mute all sound effects on Admin screen
   */
  public setAdminMuted(muted: boolean) {
    this.adminMuted = muted;
    if (muted) {
      this.clearQueue();
    }
  }

  public isAdminMuted(): boolean {
    return this.adminMuted;
  }

  /**
   * Temporarily mute sound effects when TTS / speech synthesis is active
   */
  public setTtsActive(active: boolean) {
    this.ttsActive = active;
    if (active) {
      this.clearQueue();
    }
  }

  public isTtsSpeaking(): boolean {
    if (this.ttsActive) return true;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      return Boolean(window.speechSynthesis.speaking);
    }
    return false;
  }

  /**
   * Check if sound effects should be silenced (disabled, admin screen, or TTS speaking)
   */
  public shouldSuppressAudio(): boolean {
    if (!this.enabled) return true;
    if (this.adminMuted) return true;
    if (this.isTtsSpeaking()) return true;
    return false;
  }

  private getAudioContext(): AudioContext | null {
    if (this.shouldSuppressAudio()) return null;
    if (typeof window === 'undefined') return null;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx || this.ctx.state === 'closed') {
      try {
        this.ctx = new AudioContextClass();
      } catch {
        return null;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('bti_soundfx_enabled', String(enabled));
      } catch {}
    }
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /** Error feedback buzz/tone (routes to active sound pack) */
  public playError() {
    this.playPackAudio(this.soundPack, false);
  }

  /** Urgent warning / broadcast alert tone */
  public playWarning() {
    this.notifyActivity(500);
    this.queueManager.enqueue(() => {
      
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      [660, 880, 660, 880].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + i * 0.1);
        gain.gain.setValueAtTime(0.25, now + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.01, now + (i + 1) * 0.1);
        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + i * 0.1);
        osc.stop(now + (i + 1) * 0.1);
      });
    } catch {}
  
    }, 450);
  }

  /** Urgent alarm alias */
  public playAlarm() {
    this.playWarning();
  }

  /** Tap / selection feedback click */
  public playClick() {
    this.notifyActivity(120);
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // ignore audio errors on locked browsers
    }
  }

  /** Countdown tick sound */
  public playTick(isUrgent = false) {
    this.notifyActivity(isUrgent ? 150 : 80);
    this.queueManager.enqueue(() => {
      
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      const freq = isUrgent ? 880 : 520;
      const duration = isUrgent ? 0.08 : 0.04;
      const volume = isUrgent ? 0.35 : 0.15;

      osc.type = isUrgent ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  
    }, isUrgent ? 130 : 90);
  }

  /** Time-up / Lock gong sound */
  public playLock() {
    this.notifyActivity(450);
    this.queueManager.enqueue(() => {
      
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.35);

      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  
    }, 450);
  }

  /** Correct chime sound */
  public playCorrect() {
    this.playReveal(true);
  }

  /** Success chime alias */
  public playSuccess() {
    this.playReveal(true);
  }

  /** Preview any sound pack feedback immediately */
  public previewSoundPack(pack: SoundPackTheme, isCorrect: boolean = true) {
    this.playPackAudio(pack, isCorrect);
  }

  /** Main Reveal fanfare routing to the active sound pack theme */
  public playReveal(isCorrect = true) {
    this.playPackAudio(this.soundPack, isCorrect);
  }

  /** Play theme-specific synthesizer feedback */
  private playPackAudio(pack: SoundPackTheme, isCorrect: boolean) {
    this.notifyActivity(isCorrect ? 800 : 500);
    this.queueManager.enqueue(() => {
      const ctx = this.getAudioContext();
      if (!ctx) return;

      try {
        const now = ctx.currentTime;
        const dest = this.getDestination(ctx);

        switch (pack) {
          case 'retro': {
            if (isCorrect) {
              // 8-Bit chiptune coin / power-up arpeggio
              const notes = [659.25, 830.61, 987.77, 1318.51, 1661.22]; // E5, G#5, B5, E6, G#6
              const step = 0.045;
              notes.forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + idx * step;
                osc.type = 'square';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.2, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.08);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(start);
                osc.stop(start + 0.08);
              });
            } else {
              // 8-Bit downward pitch-drop wobble
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'square';
              osc.frequency.setValueAtTime(520, now);
              osc.frequency.exponentialRampToValueAtTime(120, now + 0.22);
              gain.gain.setValueAtTime(0.22, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);
              osc.connect(gain);
              gain.connect(dest);
              osc.start(now);
              osc.stop(now + 0.24);
            }
            break;
          }

          case 'cyberpunk': {
            if (isCorrect) {
              // Cyberpunk sub punch + resonant neon chord sweep
              const subOsc = ctx.createOscillator();
              const subGain = ctx.createGain();
              subOsc.type = 'sine';
              subOsc.frequency.setValueAtTime(180, now);
              subOsc.frequency.exponentialRampToValueAtTime(70, now + 0.09);
              subGain.gain.setValueAtTime(0.3, now);
              subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
              subOsc.connect(subGain);
              subGain.connect(dest);
              subOsc.start(now);
              subOsc.stop(now + 0.1);

              const filter = ctx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.setValueAtTime(2600, now);
              filter.frequency.exponentialRampToValueAtTime(800, now + 0.45);
              filter.Q.value = 3.0;
              filter.connect(dest);

              [523.25, 783.99, 1046.50, 1318.51].forEach((freq, idx) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + idx * 0.05;
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.18, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.42);
                osc.connect(gain);
                gain.connect(filter);
                osc.start(start);
                osc.stop(start + 0.42);
              });
            } else {
              // Cyberpunk glitch error detune
              const osc1 = ctx.createOscillator();
              const osc2 = ctx.createOscillator();
              const gain = ctx.createGain();
              osc1.type = 'sawtooth';
              osc2.type = 'sawtooth';
              osc1.frequency.setValueAtTime(145, now);
              osc2.frequency.setValueAtTime(152, now); // beating interference
              osc1.frequency.exponentialRampToValueAtTime(65, now + 0.22);
              osc2.frequency.exponentialRampToValueAtTime(60, now + 0.22);

              gain.gain.setValueAtTime(0.26, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

              osc1.connect(gain);
              osc2.connect(gain);
              gain.connect(dest);

              osc1.start(now);
              osc2.start(now);
              osc1.stop(now + 0.22);
              osc2.stop(now + 0.22);
            }
            break;
          }

          case 'zen': {
            if (isCorrect) {
              // Tibetan singing bowl & crystal bell harmonics
              const overtones = [880, 1760, 2640]; // A5, A6, E7
              overtones.forEach((freq, i) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, now);

                // Gentle shimmer vibrato
                const lfo = ctx.createOscillator();
                const lfoGain = ctx.createGain();
                lfo.frequency.value = 5.5;
                lfoGain.gain.value = 3.0;
                lfo.connect(lfoGain);
                lfoGain.connect(osc.frequency);
                lfo.start(now);
                lfo.stop(now + 0.85);

                const vol = i === 0 ? 0.22 : i === 1 ? 0.14 : 0.08;
                gain.gain.setValueAtTime(0.01, now);
                gain.gain.linearRampToValueAtTime(vol, now + 0.02);
                gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.85);

                osc.connect(gain);
                gain.connect(dest);
                osc.start(now);
                osc.stop(now + 0.85);
              });
            } else {
              // Warm wooden temple block / bamboo tap
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(360, now);
              osc.frequency.exponentialRampToValueAtTime(170, now + 0.12);

              gain.gain.setValueAtTime(0.24, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

              osc.connect(gain);
              gain.connect(dest);
              osc.start(now);
              osc.stop(now + 0.12);
            }
            break;
          }

          case 'scifi': {
            if (isCorrect) {
              // Sci-Fi quantum warp teleport glissando + celestial chime
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(360, now);
              osc.frequency.exponentialRampToValueAtTime(1750, now + 0.32);

              // 18Hz vibrato modulation
              const lfo = ctx.createOscillator();
              const lfoGain = ctx.createGain();
              lfo.frequency.value = 18;
              lfoGain.gain.value = 25;
              lfo.connect(lfoGain);
              lfoGain.connect(osc.frequency);
              lfo.start(now);
              lfo.stop(now + 0.35);

              gain.gain.setValueAtTime(0.01, now);
              gain.gain.linearRampToValueAtTime(0.22, now + 0.08);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

              osc.connect(gain);
              gain.connect(dest);
              osc.start(now);
              osc.stop(now + 0.42);

              // High celestial bell ping
              const pingOsc = ctx.createOscillator();
              const pingGain = ctx.createGain();
              pingOsc.type = 'sine';
              pingOsc.frequency.setValueAtTime(2093, now + 0.15); // C7
              pingGain.gain.setValueAtTime(0.18, now + 0.15);
              pingGain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
              pingOsc.connect(pingGain);
              pingGain.connect(dest);
              pingOsc.start(now + 0.15);
              pingOsc.stop(now + 0.48);
            } else {
              // Forcefield shield deflection
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(650, now);
              osc.frequency.exponentialRampToValueAtTime(90, now + 0.26);

              const filter = ctx.createBiquadFilter();
              filter.type = 'bandpass';
              filter.frequency.value = 420;
              filter.Q.value = 4.0;

              gain.gain.setValueAtTime(0.28, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

              osc.connect(filter);
              filter.connect(gain);
              gain.connect(dest);

              osc.start(now);
              osc.stop(now + 0.28);
            }
            break;
          }

          case 'classic':
          default: {
            if (isCorrect) {
              // Joyful major chord arpeggio
              const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
              notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + index * 0.09;
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.25, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(start);
                osc.stop(start + 0.4);
              });
            } else {
              // Gentle neutral descending tone
              const notes = [440, 392, 349.23];
              notes.forEach((freq, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const start = now + index * 0.12;
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, start);
                gain.gain.setValueAtTime(0.2, start);
                gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);
                osc.connect(gain);
                gain.connect(dest);
                osc.start(start);
                osc.stop(start + 0.3);
              });
            }
            break;
          }
        }
      } catch {
        // ignore audio synthesis error
      }
    }, isCorrect ? (pack === 'zen' ? 880 : 720) : (pack === 'zen' ? 300 : 450));
  }

  /** Start round tension swoosh */
  public playStartRound() {
    this.notifyActivity(400);
    this.queueManager.enqueue(() => {
      
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.25);

      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, ctx.currentTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  
    }, 350);
  }

  /** Drumroll effect */
  public playDrumroll() {
    this.queueManager.enqueue(() => {
      
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const duration = 2.0;
      const bufferSize = ctx.sampleRate * duration;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // Generate noise
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      // Bandpass filter to make it sound like a drum
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 100;
      
      // Tremolo/Amplitude modulation for the "roll" effect
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 25; // 25 hits per second
      osc.connect(oscGain.gain);
      osc.start();
      osc.stop(ctx.currentTime + duration);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.01, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.5, ctx.currentTime + duration - 0.2); // Build up volume
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration); // Quick fade out

      noise.connect(filter);
      filter.connect(oscGain);
      oscGain.connect(gain);
      gain.connect(this.getDestination(ctx));

      noise.start();
    } catch {}
  
    }, 2050);
  }

  /** Gentle Notification Chime for new Polls */
  public playNotification() {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [587.33, 783.99]; // D5, G5 (Perfect Fourth)
      notes.forEach((freq, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + index * 0.15;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.25, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + 0.4);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));

        osc.start(start);
        osc.stop(start + 0.4);
      });
    } catch {}
  }

  /** Host Pacing Alert Chime - Melodic multi-tone notification */
  public playPacingChime(level: 'low' | 'medium' | 'high' | 'complete' = 'medium') {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      let notes: number[];
      let duration = 0.12;

      switch (level) {
        case 'low': // 50% milestone: gentle two tones
          notes = [440, 554.37]; // A4, C#5
          break;
        case 'medium': // 75% milestone: ascending three tones
          notes = [523.25, 659.25, 783.99]; // C5, E5, G5
          break;
        case 'high': // 90% milestone: vibrant alert
          notes = [659.25, 830.61, 987.77]; // E5, G#5, B5
          break;
        case 'complete': // 100% milestone: fanfare flourish
          notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
          duration = 0.15;
          break;
      }

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const startTime = ctx.currentTime + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, startTime);

        gain.gain.setValueAtTime(0.18, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

        osc.connect(gain);
        gain.connect(this.getDestination(ctx));

        osc.start(startTime);
        osc.stop(startTime + duration);
      });
    } catch {}
  }

  /** Heartbeat Pulse (Lub-Dub sound synthesis with intensity modulation) */
  public playHeartbeat(intensity: number = 0.5) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const baseFreq = 55 + Math.min(45, intensity * 40); // 55Hz - 95Hz deep pulse

      // First beat "Lub"
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 0.08);

      gain1.gain.setValueAtTime(0.25 * (0.6 + intensity * 0.4), now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(gain1);
      gain1.connect(this.getDestination(ctx));
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Second beat "Dub" (slightly higher pitch, slightly softer)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      const dubTime = now + 0.12;
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(baseFreq * 1.25, dubTime);
      osc2.frequency.exponentialRampToValueAtTime(40, dubTime + 0.09);

      gain2.gain.setValueAtTime(0.2 * (0.6 + intensity * 0.4), dubTime);
      gain2.gain.exponentialRampToValueAtTime(0.001, dubTime + 0.09);

      osc2.connect(gain2);
      gain2.connect(this.getDestination(ctx));
      osc2.start(dubTime);
      osc2.stop(dubTime + 0.09);
    } catch {}
  }

  /** Cheer Tap Pop sound (harmonic bright pop) */
  public playCheerPop(type: string = 'HEART') {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      let startFreq = 580;
      let endFreq = 1200;
      if (type === 'FIRE') {
        startFreq = 420;
        endFreq = 950;
      } else if (type === 'ENERGY') {
        startFreq = 800;
        endFreq = 1600;
      } else if (type === 'CLAP') {
        startFreq = 300;
        endFreq = 600;
      } else if (type === 'STAR') {
        startFreq = 900;
        endFreq = 1800;
      }

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.06);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  /** Bubbly pop / like reaction sound */
  
  /** Subtle 'ting' sound for tab/menu switching */
  public playTing() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // High-pitched bright triangle/sine for a "ting"
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      
      // Quick attack, gentle release
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      
      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      
      osc.start(now);
      osc.stop(now + 0.1);
    } catch {}
  }

  public playPop() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));
      osc.start(now);
      osc.stop(now + 0.09);
    } catch {}
  }

  /** Camera shutter sound for audience interaction snapshot capture */
  public playCameraShutter() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      
      // 1. Initial click (mirror flip)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'square';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(300, now + 0.03);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(gain1);
      gain1.connect(this.getDestination(ctx));
      osc1.start(now);
      osc1.stop(now + 0.04);

      // 2. Main Shutter Click / Whirr
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sawtooth';
      osc2.frequency.setValueAtTime(400, now + 0.05);
      osc2.frequency.exponentialRampToValueAtTime(800, now + 0.09);
      gain2.gain.setValueAtTime(0.3, now + 0.05);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc2.connect(gain2);
      gain2.connect(this.getDestination(ctx));
      osc2.start(now + 0.05);
      osc2.stop(now + 0.12);

      // 3. Crisp high harmonic chime confirmation
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'sine';
      osc3.frequency.setValueAtTime(1760, now + 0.13); // A6 note
      osc3.frequency.exponentialRampToValueAtTime(2200, now + 0.22);
      gain3.gain.setValueAtTime(0.2, now + 0.13);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc3.connect(gain3);
      gain3.connect(this.getDestination(ctx));
      osc3.start(now + 0.13);
      osc3.stop(now + 0.25);
    } catch {}
  }

  /**
   * Ascending synthesizer arpeggio celebrating combo streak count (2x, 3x, 5x, 7x+)
   */
  public playStreakCombo(streak: number = 2) {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const baseFreq = Math.min(1046.5, 440 * Math.pow(1.1, Math.min(streak, 10)));
      const notes = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 1.875];
      const step = 0.065;

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = streak >= 5 ? 'triangle' : 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * step);
        gain.gain.setValueAtTime(0.2, now + idx * step);
        gain.gain.exponentialRampToValueAtTime(0.001, now + (idx + 1) * step + 0.12);
        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now + idx * step);
        osc.stop(now + (idx + 1) * step + 0.12);
      });
    } catch {}
  }

  /**
   * Dramatic energetic chord whoosh when toggling Double Down / All-In Risk
   */
  public playAllInActivation() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.5];
      freqs.forEach(freq => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq / 2, now);
        osc.frequency.exponentialRampToValueAtTime(freq, now + 0.15);
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.16, now + 0.06);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now);
        osc.stop(now + 0.32);
      });
    } catch {}
  }
}

export const soundFx = new SoundEffectsService();
