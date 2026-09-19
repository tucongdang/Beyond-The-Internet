/**
 * Web Audio API synthesizer for live game show sound effects
 * 100% self-contained, no external audio files required
 */
class AudioQueueManager {
  private queue: Array<{ playFn: () => void; durationMs: number }> = [];
  private isPlaying = false;
  private timer: any = null;

  public enqueue(playFn: () => void, durationMs: number) {
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
    if (this.queue.length === 0) {
      this.isPlaying = false;
      return;
    }

    this.isPlaying = true;
    const task = this.queue.shift();
    if (task) {
      try {
        task.playFn();
      } catch (e) {
        console.error("AudioQueue error", e);
      }
      this.timer = setTimeout(() => {
        this.playNext();
      }, task.durationMs);
    }
  }
}

class SoundEffectsService {
  private ctx: AudioContext | null = null;
  private enabled: boolean = true;
  private queueManager = new AudioQueueManager();

  public clearQueue() {
    this.queueManager.clear();
  }

  private getAudioContext(): AudioContext | null {
    if (!this.enabled) return null;
    if (typeof window === 'undefined') return null;

    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;

    if (!this.ctx || this.ctx.state === 'suspended') {
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
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  /** Error feedback buzz/tone */
  public playError() {
    this.queueManager.enqueue(() => {
      
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.15);
      
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.15);
    } catch {
      // ignore audio errors
    }
  
    }, 200);
  }

  /** Urgent warning / broadcast alert tone */
  public playWarning() {
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
        gain.connect(ctx.destination);
        osc.start(now + i * 0.1);
        osc.stop(now + (i + 1) * 0.1);
      });
    } catch {}
  
    }, 450);
  }

  /** Tap / selection feedback click */
  public playClick() {
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
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.05);
    } catch {
      // ignore audio errors on locked browsers
    }
  }

  /** Countdown tick sound */
  public playTick(isUrgent = false) {
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
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {}
  
    }, isUrgent ? 130 : 90);
  }

  /** Time-up / Lock gong sound */
  public playLock() {
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
      gain.connect(ctx.destination);

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

  /** Reveal fanfare */
  public playReveal(isCorrect = true) {
    this.queueManager.enqueue(() => {
      
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      if (isCorrect) {
        // Joyful major chord arpeggio
        const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + index * 0.09;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.25, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.4);
        });
      } else {
        // Gentle neutral descending tone
        const notes = [440, 392, 349.23];
        notes.forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const start = ctx.currentTime + index * 0.12;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, start);

          gain.gain.setValueAtTime(0.2, start);
          gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(start);
          osc.stop(start + 0.3);
        });
      }
    } catch {}
  
    }, isCorrect ? 720 : 590);
  }

  /** Start round tension swoosh */
  public playStartRound() {
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
      gain.connect(ctx.destination);

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
      gain.connect(ctx.destination);

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
        gain.connect(ctx.destination);

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
        gain.connect(ctx.destination);

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
      gain1.connect(ctx.destination);
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
      gain2.connect(ctx.destination);
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
      gain.connect(ctx.destination);
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
      gain.connect(ctx.destination);
      
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
      gain.connect(ctx.destination);
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
      gain1.connect(ctx.destination);
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
      gain2.connect(ctx.destination);
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
      gain3.connect(ctx.destination);
      osc3.start(now + 0.13);
      osc3.stop(now + 0.25);
    } catch {}
  }
}

export const soundFx = new SoundEffectsService();
