import {
  LUCKY_DRAW_MUSIC_URL,
  LUCKY_DRAW_WAITING_MUSIC_URL,
  LUCKY_DRAW_SPIN_MUSIC_URL,
  LUCKY_DRAW_SPIN_DURATION_SEC,
  LuckyDrawActiveTrack,
  LuckyDrawMusicReason,
  AppMusicPhase,
  AppSoundView,
  resolveAppMusicPhase,
  resolveLuckyDrawMusicPlayback,
} from '../utils/luckyDrawAudioUtils';

export interface AppSoundContextParams {
  currentView: AppSoundView;
  isAdminAuthenticated: boolean;
  hasAudienceUser: boolean;
  isOnboardingOpen: boolean;
  activeModule: 'GAME' | 'LUCKY_DRAW';
  gameStatus: 'STANDBY' | 'ACTIVE' | 'LOCKED' | 'REVEAL';
  drawStatus: 'IDLE' | 'SPINNING' | 'REVEALED';
  spinSeed?: number | null;
  adminMusicMuted: boolean;
  autoStopOnMusicEnd?: boolean;
  isMatchBreakActive?: boolean;
  eventScheduleEnabled?: boolean;
  eventScheduleStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'CONCLUDED';
}

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
  private enabledListeners: Set<(enabled: boolean) => void> = new Set();
  private audioActivityListeners: Set<(durationMs: number) => void> = new Set();

  // Lucky Draw & App Phase background music controller (HTMLAudioElements loaded lazily on demand)
  private luckyDrawAudio: HTMLAudioElement | null = null;
  private luckyDrawWaitingAudio: HTMLAudioElement | null = null;
  private luckyDrawSpinAudio: HTMLAudioElement | null = null;
  private luckyDrawActiveTrack: LuckyDrawActiveTrack = 'none';
  private hasAppSoundContext: boolean = false;
  private hasHydratedAppDrawState: boolean = false;
  private hasHydratedOwnerDrawState: boolean = false;
  private hasUserInteracted: boolean = false;
  private spinInteractionAuthorized: boolean = false;
  private authorizedSpinSeed: number | null = null;
  private appMusicPhase: AppMusicPhase = 'silent';
  private appSoundContext: AppSoundContextParams = {
    currentView: 'landing',
    isAdminAuthenticated: false,
    hasAudienceUser: false,
    isOnboardingOpen: false,
    activeModule: 'GAME',
    gameStatus: 'STANDBY',
    drawStatus: 'IDLE',
    spinSeed: null,
    adminMusicMuted: false,
    autoStopOnMusicEnd: false,
    isMatchBreakActive: false,
    eventScheduleEnabled: false,
    eventScheduleStatus: 'IN_PROGRESS',
  };
  private luckyDrawSyncParams: {
    drawStatus: 'IDLE' | 'SPINNING' | 'REVEALED';
    isLuckyDrawActive: boolean;
    isLuckyDrawScreenMounted?: boolean;
    adminMusicMuted: boolean;
    localMuted: boolean;
    spinSeed?: number | null;
    autoStopOnMusicEnd?: boolean;
  } = {
    drawStatus: 'IDLE',
    isLuckyDrawActive: false,
    isLuckyDrawScreenMounted: false,
    adminMusicMuted: false,
    localMuted: false,
    spinSeed: null,
    autoStopOnMusicEnd: false,
  };
  private luckyDrawOwners: Map<string, {
    drawStatus: 'IDLE' | 'SPINNING' | 'REVEALED';
    isLuckyDrawActive: boolean;
    isLuckyDrawScreenMounted?: boolean;
    adminMusicMuted: boolean;
    localMuted: boolean;
    spinSeed?: number | null;
    autoStopOnMusicEnd?: boolean;
  }> = new Map();
  private luckyDrawStopTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  private luckyDrawPreviewActive: boolean = false;
  private luckyDrawIsPlaying: boolean = false;
  private luckyDrawAutoplayBlocked: boolean = false;
  private luckyDrawError: string | null = null;
  private luckyDrawReason: LuckyDrawMusicReason = 'inactive_or_revealed';
  private luckyDrawShouldPlayTarget: boolean = false;
  private luckyDrawCurrentSpinSeed: number | null = null;
  private luckyDrawEndedForSeed: number | null = null;
  private luckyDrawRevealTriggeredForSeed: number | null = null;
  private luckyDrawTailFinishingSeed: number | null = null;
  private luckyDrawTailSafetyTimer: ReturnType<typeof setTimeout> | null = null;
  private waitingFadeInterval: ReturnType<typeof setInterval> | null = null;
  private waitingFadeMode: 'in' | 'out' | null = null;
  private pendingWaitingFadeIn: boolean = false;
  private luckyDrawDurationSec: number = LUCKY_DRAW_SPIN_DURATION_SEC;
  private luckyDrawCurrentTimeSec: number = 0;
  private luckyDrawAbortRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private luckyDrawGestureCleanup: (() => void) | null = null;
  private luckyDrawListeners: Set<(state: {
    isPlaying: boolean;
    activeTrack: LuckyDrawActiveTrack;
    musicPhase: AppMusicPhase;
    spinInteractionAuthorized: boolean;
    hasUserInteracted: boolean;
    autoplayBlocked: boolean;
    previewActive: boolean;
    reason: LuckyDrawMusicReason;
    error: string | null;
    globalSoundEnabled: boolean;
    volume: number;
    durationSec: number;
    currentTimeSec: number;
  }) => void> = new Set();
  private luckyDrawEndedListeners: Set<(spinSeed: number | null) => void> = new Set();

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
    this.clearWaitingFade();
    if (typeof window !== 'undefined') {
      localStorage.setItem('bti_soundfx_volume', String(this.volume));
    }
    if (this.ctx && this.masterGain) {
      try {
        this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      } catch {}
    }
    if (this.luckyDrawSpinAudio) {
      try {
        this.luckyDrawSpinAudio.volume = this.volume;
      } catch {}
    }
    if (this.luckyDrawWaitingAudio) {
      try {
        this.luckyDrawWaitingAudio.volume = this.volume;
        if (this.luckyDrawActiveTrack === 'spinning' && !this.luckyDrawWaitingAudio.paused) {
          this.luckyDrawWaitingAudio.pause();
        }
      } catch {}
    }
    if (this.luckyDrawAudio) {
      try {
        this.luckyDrawAudio.volume = this.volume;
      } catch {}
    }
    this.volumeListeners.forEach(listener => {
      try {
        listener(this.volume);
      } catch {}
    });
    this.notifyLuckyDrawListeners();
  }

  private clearWaitingFade() {
    if (this.waitingFadeInterval) {
      clearInterval(this.waitingFadeInterval);
      this.waitingFadeInterval = null;
    }
    this.waitingFadeMode = null;
  }

  private clearSpinTailSafetyTimer() {
    if (this.luckyDrawTailSafetyTimer) {
      clearTimeout(this.luckyDrawTailSafetyTimer);
      this.luckyDrawTailSafetyTimer = null;
    }
  }

  private fadeInWaitingAudio(audio: HTMLAudioElement, durationMs: number = 1500) {
    this.clearWaitingFade();
    const targetVolume = this.volume;
    if (targetVolume <= 0.01) {
      try {
        audio.volume = targetVolume;
      } catch {}
      return;
    }
    try {
      audio.volume = 0;
    } catch {}
    this.waitingFadeMode = 'in';
    const startedAt = Date.now();
    this.waitingFadeInterval = setInterval(() => {
      if (
        audio.paused ||
        this.luckyDrawActiveTrack !== 'waiting' ||
        !this.luckyDrawShouldPlayTarget
      ) {
        this.clearWaitingFade();
        return;
      }
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / durationMs);
      // Smooth ease-in curve so lottery music swells in gently after spin tail ends
      const nextVol = Math.max(0, Math.min(this.volume, this.volume * ratio));
      try {
        audio.volume = nextVol;
      } catch {}
      if (ratio >= 1) {
        this.clearWaitingFade();
      }
    }, 50);
  }

  private fadeOutWaitingAudio(audio: HTMLAudioElement | null, durationMs: number = 650) {
    if (!audio || audio.paused) {
      if (this.waitingFadeMode === 'out') {
        this.clearWaitingFade();
      }
      return;
    }
    if (this.waitingFadeMode === 'out' && this.waitingFadeInterval) {
      return;
    }
    this.clearWaitingFade();
    const startVolume =
      Number.isFinite(audio.volume) && audio.volume > 0 ? audio.volume : this.volume;
    if (startVolume <= 0.01 || durationMs <= 0) {
      try {
        audio.pause();
        audio.volume = this.volume;
      } catch {}
      return;
    }
    this.waitingFadeMode = 'out';
    const startedAt = Date.now();
    this.waitingFadeInterval = setInterval(() => {
      if (audio.paused || this.luckyDrawActiveTrack !== 'spinning') {
        this.clearWaitingFade();
        try {
          audio.volume = this.volume;
        } catch {}
        return;
      }
      const elapsed = Date.now() - startedAt;
      const ratio = Math.min(1, elapsed / durationMs);
      // Smooth fade-out curve as the spin wheel kicks in
      const nextVol = Math.max(0, startVolume * (1 - ratio));
      try {
        audio.volume = nextVol;
      } catch {}
      if (ratio >= 1) {
        this.clearWaitingFade();
        try {
          audio.pause();
          audio.volume = this.volume;
        } catch {}
      }
    }, 30);
  }

  private completeSpinTailAndFadeInWaiting() {
    this.clearSpinTailSafetyTimer();
    this.luckyDrawTailFinishingSeed = null;
    this.luckyDrawCurrentTimeSec = 0;
    if (this.luckyDrawSpinAudio) {
      try {
        this.luckyDrawSpinAudio.pause();
        this.luckyDrawSpinAudio.currentTime = 0;
      } catch {}
    }
    this.pendingWaitingFadeIn = true;
    this.reconcileLuckyDrawMusic();
  }

  private activateSpinTailFinishing(seed: number) {
    const spinAudio = this.luckyDrawSpinAudio;
    if (!spinAudio || spinAudio.paused || spinAudio.ended || spinAudio.currentTime <= 0.1) {
      return;
    }
    this.luckyDrawTailFinishingSeed = seed;
    try {
      spinAudio.loop = false;
    } catch {}
    this.clearSpinTailSafetyTimer();
    const remainingSec =
      Number.isFinite(spinAudio.duration) && spinAudio.duration > spinAudio.currentTime
        ? spinAudio.duration - spinAudio.currentTime
        : Math.max(0.5, 17.5 - spinAudio.currentTime);
    const safetyMs = Math.min(5000, Math.max(1200, Math.round(remainingSec * 1000) + 600));
    this.luckyDrawTailSafetyTimer = setTimeout(() => {
      if (this.luckyDrawTailFinishingSeed !== null) {
        this.completeSpinTailAndFadeInWaiting();
      }
    }, safetyMs);
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
    } else if (this.luckyDrawPreviewActive) {
      this.luckyDrawPreviewActive = false;
    }
    this.reconcileLuckyDrawMusic();
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
    this.reconcileLuckyDrawMusic();
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
    this.reconcileLuckyDrawMusic();
    this.enabledListeners.forEach(listener => {
      try {
        listener(enabled);
      } catch {}
    });
  }

  public subscribeEnabled(listener: (enabled: boolean) => void): () => void {
    this.enabledListeners.add(listener);
    return () => {
      this.enabledListeners.delete(listener);
    };
  }

  public isEnabled(): boolean {
    return this.enabled;
  }

  private getOrCreateLuckyDrawWaitingAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (!this.luckyDrawWaitingAudio) {
      const audio = document.createElement('audio');
      audio.id = 'bti-lucky-draw-waiting-audio';
      audio.src = LUCKY_DRAW_WAITING_MUSIC_URL;
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.volume;
      audio.setAttribute('aria-hidden', 'true');
      audio.style.display = 'none';

      audio.addEventListener('pause', () => {
        if (this.luckyDrawActiveTrack === 'waiting' || this.luckyDrawActiveTrack === 'none') {
          this.luckyDrawIsPlaying = false;
          this.notifyLuckyDrawListeners();
        }
      });
      audio.addEventListener('play', () => {
        if (this.luckyDrawActiveTrack === 'waiting') {
          this.luckyDrawIsPlaying = true;
          this.luckyDrawAutoplayBlocked = false;
          this.luckyDrawError = null;
          this.notifyLuckyDrawListeners();
        }
      });
      audio.addEventListener('playing', () => {
        if (this.luckyDrawActiveTrack === 'waiting') {
          this.luckyDrawIsPlaying = true;
          this.luckyDrawAutoplayBlocked = false;
          this.luckyDrawError = null;
          this.detachAutoplayGestureUnlock();
          this.notifyLuckyDrawListeners();
        }
      });
      audio.addEventListener('error', () => {
        if (this.luckyDrawActiveTrack === 'waiting') {
          const code = audio.error?.code;
          const msg =
            code === 1
              ? 'Tải nhạc chờ bị hủy'
              : code === 2
              ? 'Lỗi mạng khi tải file nhạc chờ'
              : code === 3
              ? 'Lỗi giải mã file nhạc chờ'
              : code === 4
              ? 'Không tải được nguồn nhạc xổ số'
              : 'Không thể phát nhạc chờ xổ số';
          this.luckyDrawError = msg;
          this.luckyDrawIsPlaying = false;
          this.notifyLuckyDrawListeners();
        }
      });

      if (document.body) {
        document.body.appendChild(audio);
      }
      this.luckyDrawWaitingAudio = audio;
    }
    return this.luckyDrawWaitingAudio;
  }

  private getOrCreateLuckyDrawSpinAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined' || typeof document === 'undefined') return null;
    if (!this.luckyDrawSpinAudio) {
      const audio = document.createElement('audio');
      audio.id = 'bti-lucky-draw-audio';
      audio.src = LUCKY_DRAW_SPIN_MUSIC_URL;
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = this.volume;
      audio.setAttribute('aria-hidden', 'true');
      audio.style.display = 'none';

      const syncAudioMetrics = () => {
        this.luckyDrawDurationSec = LUCKY_DRAW_SPIN_DURATION_SEC;
        if (Number.isFinite(audio.currentTime) && audio.currentTime >= 0) {
          this.luckyDrawCurrentTimeSec = audio.currentTime;
        }
      };

      const isEffectiveSpinningAutoStop = () => {
        const hasOwner = this.luckyDrawOwners.size > 0;
        const effectiveDrawStatus = hasOwner
          ? this.luckyDrawSyncParams.drawStatus
          : this.appSoundContext.drawStatus;
        const effectiveAutoStop = hasOwner
          ? Boolean(this.luckyDrawSyncParams.autoStopOnMusicEnd)
          : Boolean(this.appSoundContext.autoStopOnMusicEnd);
        return effectiveDrawStatus === 'SPINNING' && effectiveAutoStop && !this.luckyDrawPreviewActive;
      };

      const triggerRevealWithoutCuttingMusic = () => {
        const completedSeed =
          this.luckyDrawCurrentSpinSeed ??
          this.luckyDrawSyncParams.spinSeed ??
          this.appSoundContext.spinSeed ??
          0;
        if (this.luckyDrawRevealTriggeredForSeed === completedSeed) {
          return;
        }
        this.luckyDrawRevealTriggeredForSeed = completedSeed;
        // Reveal at 14.35s WITHOUT pausing spin audio; let the 17.35s file finish naturally
        this.activateSpinTailFinishing(completedSeed);
        this.notifyLuckyDrawListeners();
        this.luckyDrawEndedListeners.forEach((listener) => {
          try {
            listener(this.luckyDrawCurrentSpinSeed);
          } catch {}
        });
      };

      audio.addEventListener('loadedmetadata', () => {
        syncAudioMetrics();
        this.notifyLuckyDrawListeners();
      });
      audio.addEventListener('durationchange', () => {
        syncAudioMetrics();
        this.notifyLuckyDrawListeners();
      });
      audio.addEventListener('timeupdate', () => {
        syncAudioMetrics();
        // Trigger winner reveal at 14.35s while keeping the spin track playing through 17.35s
        if (isEffectiveSpinningAutoStop() && audio.currentTime >= LUCKY_DRAW_SPIN_DURATION_SEC) {
          triggerRevealWithoutCuttingMusic();
          return;
        }
        this.notifyLuckyDrawListeners();
      });
      audio.addEventListener('ended', () => {
        syncAudioMetrics();
        this.luckyDrawIsPlaying = false;
        const completedSeed =
          this.luckyDrawCurrentSpinSeed ??
          this.luckyDrawSyncParams.spinSeed ??
          this.appSoundContext.spinSeed ??
          0;

        if (isEffectiveSpinningAutoStop()) {
          if (this.luckyDrawRevealTriggeredForSeed !== completedSeed) {
            this.luckyDrawEndedForSeed = completedSeed;
            triggerRevealWithoutCuttingMusic();
          }
          this.completeSpinTailAndFadeInWaiting();
          return;
        }

        if (
          this.luckyDrawTailFinishingSeed !== null ||
          this.luckyDrawSyncParams.drawStatus === 'REVEALED' ||
          this.appSoundContext.drawStatus === 'REVEALED'
        ) {
          this.completeSpinTailAndFadeInWaiting();
          return;
        }

        this.notifyLuckyDrawListeners();
      });
      audio.addEventListener('pause', () => {
        syncAudioMetrics();
        if (this.luckyDrawActiveTrack === 'spinning' || this.luckyDrawActiveTrack === 'none') {
          this.luckyDrawIsPlaying = false;
          this.notifyLuckyDrawListeners();
        }
      });
      audio.addEventListener('play', () => {
        syncAudioMetrics();
        if (this.luckyDrawActiveTrack === 'spinning') {
          this.luckyDrawIsPlaying = true;
          this.luckyDrawAutoplayBlocked = false;
          this.luckyDrawError = null;
          this.notifyLuckyDrawListeners();
        }
      });
      audio.addEventListener('playing', () => {
        syncAudioMetrics();
        if (this.luckyDrawActiveTrack === 'spinning') {
          this.luckyDrawIsPlaying = true;
          this.luckyDrawAutoplayBlocked = false;
          this.luckyDrawError = null;
          this.detachAutoplayGestureUnlock();
          this.notifyLuckyDrawListeners();
        }
      });
      audio.addEventListener('error', () => {
        if (this.luckyDrawActiveTrack === 'spinning') {
          const code = audio.error?.code;
          const msg =
            code === 1
              ? 'Tải nhạc bị hủy'
              : code === 2
              ? 'Lỗi mạng khi tải file nhạc'
              : code === 3
              ? 'Lỗi giải mã file nhạc'
              : code === 4
              ? 'Không tải được nguồn nhạc quay nón'
              : 'Không thể phát file nhạc quay nón';
          this.luckyDrawError = msg;
          this.luckyDrawIsPlaying = false;
          this.notifyLuckyDrawListeners();
        }
      });

      if (document.body) {
        document.body.appendChild(audio);
      }
      this.luckyDrawSpinAudio = audio;
      this.luckyDrawAudio = audio;
    }
    return this.luckyDrawSpinAudio;
  }

  private getOrCreateLuckyDrawAudio(): HTMLAudioElement | null {
    return this.getOrCreateLuckyDrawSpinAudio();
  }

  public getAppMusicPhase(): AppMusicPhase {
    return this.appMusicPhase;
  }

  public getLuckyDrawMusicState() {
    return {
      isPlaying: this.luckyDrawIsPlaying,
      activeTrack: this.luckyDrawActiveTrack,
      musicPhase: this.appMusicPhase,
      spinInteractionAuthorized: this.spinInteractionAuthorized,
      hasUserInteracted: this.hasUserInteracted,
      autoplayBlocked: this.luckyDrawAutoplayBlocked,
      previewActive: this.luckyDrawPreviewActive,
      reason: this.luckyDrawReason,
      error: this.luckyDrawError,
      globalSoundEnabled: this.enabled,
      volume: this.volume,
      durationSec: this.luckyDrawDurationSec,
      currentTimeSec: this.luckyDrawCurrentTimeSec,
    };
  }

  public subscribeLuckyDrawMusic(
    listener: (state: {
      isPlaying: boolean;
      activeTrack: LuckyDrawActiveTrack;
      musicPhase: AppMusicPhase;
      spinInteractionAuthorized: boolean;
      hasUserInteracted: boolean;
      autoplayBlocked: boolean;
      previewActive: boolean;
      reason: LuckyDrawMusicReason;
      error: string | null;
      globalSoundEnabled: boolean;
      volume: number;
      durationSec: number;
      currentTimeSec: number;
    }) => void
  ): () => void {
    this.luckyDrawListeners.add(listener);
    return () => {
      this.luckyDrawListeners.delete(listener);
    };
  }

  public subscribeLuckyDrawMusicEnded(
    listener: (spinSeed: number | null) => void
  ): () => void {
    this.luckyDrawEndedListeners.add(listener);
    return () => {
      this.luckyDrawEndedListeners.delete(listener);
    };
  }

  private notifyLuckyDrawListeners() {
    const snapshot = this.getLuckyDrawMusicState();
    this.luckyDrawListeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch {}
    });
  }

  public preloadLuckyDrawAudio() {
    this.getOrCreateLuckyDrawWaitingAudio();
    this.getOrCreateLuckyDrawSpinAudio();
  }

  private computeCurrentAppMusicPhase(): AppMusicPhase | undefined {
    if (!this.hasAppSoundContext) return undefined;
    const owners = Array.from(this.luckyDrawOwners.values());
    const hasMountedLuckyDrawScreen = owners.some((o) => Boolean(o.isLuckyDrawScreenMounted));
    const hasOwner = owners.length > 0;
    const effectiveLuckyDrawStatus = hasOwner
      ? this.luckyDrawSyncParams.drawStatus
      : this.appSoundContext.drawStatus;

    return resolveAppMusicPhase({
      currentView: this.appSoundContext.currentView,
      isAdminAuthenticated: this.appSoundContext.isAdminAuthenticated,
      hasAudienceUser: this.appSoundContext.hasAudienceUser,
      isOnboardingOpen: this.appSoundContext.isOnboardingOpen,
      activeModule: this.appSoundContext.activeModule,
      gameStatus: this.appSoundContext.gameStatus,
      luckyDrawStatus: effectiveLuckyDrawStatus,
      isLuckyDrawScreenMounted: hasMountedLuckyDrawScreen,
      isMatchBreakActive: this.appSoundContext.isMatchBreakActive,
      eventScheduleEnabled: this.appSoundContext.eventScheduleEnabled,
      eventScheduleStatus: this.appSoundContext.eventScheduleStatus,
      localPreviewActive: this.luckyDrawPreviewActive,
      isSpinTailFinishing: this.luckyDrawTailFinishingSeed !== null,
    });
  }

  /**
   * Records a general browser user interaction so lobby/wait music can unlock without
   * ever triggering or authorizing the spinning wheel sound.
   */
  public notifyUserInteraction() {
    this.hasUserInteracted = true;
    const effectivePhase = this.computeCurrentAppMusicPhase();
    if (
      effectivePhase === 'lobby_wait' &&
      (this.luckyDrawAutoplayBlocked ||
        this.luckyDrawActiveTrack === 'none' ||
        (this.luckyDrawWaitingAudio && this.luckyDrawWaitingAudio.paused))
    ) {
      this.luckyDrawAutoplayBlocked = false;
      this.reconcileLuckyDrawMusic();
    }
  }

  /**
   * Syncs full application view & game phase context from App.tsx so lobby/wait music,
   * active game music suppression, and lucky draw spin sound are clearly separated.
   */
  public syncAppSoundContext(params: AppSoundContextParams) {
    const prevDrawStatus = this.appSoundContext.drawStatus;
    const prevSeed = this.appSoundContext.spinSeed ?? null;
    const nextSeed = params.spinSeed ?? null;

    this.hasAppSoundContext = true;
    this.appSoundContext = {
      ...params,
      spinSeed: nextSeed,
    };

    if (params.drawStatus === 'SPINNING') {
      const isFreshLiveTransition =
        this.hasHydratedAppDrawState &&
        (prevDrawStatus !== 'SPINNING' || (nextSeed !== null && nextSeed !== prevSeed));

      if (isFreshLiveTransition) {
        this.luckyDrawEndedForSeed = null;
        this.luckyDrawRevealTriggeredForSeed = null;
        this.luckyDrawTailFinishingSeed = null;
        this.clearSpinTailSafetyTimer();
        this.pendingWaitingFadeIn = false;
        this.clearWaitingFade();
        this.luckyDrawCurrentSpinSeed = nextSeed;
        this.luckyDrawCurrentTimeSec = 0;
        if (this.luckyDrawSpinAudio && this.luckyDrawSpinAudio.currentTime !== 0) {
          try {
            this.luckyDrawSpinAudio.currentTime = 0;
          } catch {}
        }
        if (params.currentView !== 'admin' && this.hasUserInteracted) {
          this.spinInteractionAuthorized = true;
          this.authorizedSpinSeed = nextSeed;
        } else if (this.authorizedSpinSeed !== nextSeed) {
          this.spinInteractionAuthorized = false;
        }
      } else if (!this.hasHydratedAppDrawState && this.authorizedSpinSeed !== nextSeed) {
        this.spinInteractionAuthorized = false;
      }
    } else if (params.drawStatus === 'REVEALED') {
      this.spinInteractionAuthorized = false;
      this.authorizedSpinSeed = null;
      if (
        prevDrawStatus === 'SPINNING' &&
        this.luckyDrawTailFinishingSeed === null &&
        this.luckyDrawSpinAudio &&
        !this.luckyDrawSpinAudio.paused &&
        !this.luckyDrawSpinAudio.ended &&
        this.luckyDrawSpinAudio.currentTime > 0.1
      ) {
        this.activateSpinTailFinishing(prevSeed ?? nextSeed ?? 0);
      }
    } else {
      this.spinInteractionAuthorized = false;
      this.authorizedSpinSeed = null;
      this.luckyDrawTailFinishingSeed = null;
      this.luckyDrawRevealTriggeredForSeed = null;
      this.clearSpinTailSafetyTimer();
      if (this.luckyDrawOwners.size === 0) {
        this.luckyDrawCurrentSpinSeed = null;
        this.luckyDrawEndedForSeed = null;
      }
    }

    this.hasHydratedAppDrawState = true;
    this.reconcileLuckyDrawMusic();
  }

  public syncLuckyDrawMusic(params: {
    ownerId?: string;
    drawStatus: 'IDLE' | 'SPINNING' | 'REVEALED';
    isLuckyDrawActive: boolean;
    isLuckyDrawScreenMounted?: boolean;
    adminMusicMuted: boolean;
    localMuted: boolean;
    spinSeed?: number | null;
    autoStopOnMusicEnd?: boolean;
  }) {
    const ownerKey = params.ownerId || 'default';
    const pendingStop = this.luckyDrawStopTimers.get(ownerKey);
    if (pendingStop) {
      clearTimeout(pendingStop);
      this.luckyDrawStopTimers.delete(ownerKey);
    }
    const { ownerId: _ignored, ...cleanParams } = params;
    const prevDrawStatus = this.luckyDrawSyncParams.drawStatus;
    const prevSpinSeed = this.luckyDrawSyncParams.spinSeed ?? null;
    const normalizedSeed = cleanParams.spinSeed ?? null;
    if (cleanParams.drawStatus === 'SPINNING') {
      const isFreshSpin =
        prevDrawStatus !== 'SPINNING' ||
        (normalizedSeed !== null && normalizedSeed !== this.luckyDrawCurrentSpinSeed);
      if (isFreshSpin) {
        this.luckyDrawEndedForSeed = null;
        this.luckyDrawRevealTriggeredForSeed = null;
        this.luckyDrawTailFinishingSeed = null;
        this.clearSpinTailSafetyTimer();
        this.pendingWaitingFadeIn = false;
        this.clearWaitingFade();
        this.luckyDrawCurrentSpinSeed = normalizedSeed;
        this.luckyDrawCurrentTimeSec = 0;
        if (this.luckyDrawSpinAudio && this.luckyDrawSpinAudio.currentTime !== 0) {
          try {
            this.luckyDrawSpinAudio.currentTime = 0;
          } catch {}
        }
        if (
          this.hasHydratedOwnerDrawState &&
          !this.adminMuted &&
          this.hasUserInteracted
        ) {
          this.spinInteractionAuthorized = true;
          this.authorizedSpinSeed = normalizedSeed;
        } else if (this.authorizedSpinSeed !== normalizedSeed) {
          this.spinInteractionAuthorized = false;
        }
      } else if (!this.hasHydratedOwnerDrawState && this.authorizedSpinSeed !== normalizedSeed) {
        this.spinInteractionAuthorized = false;
      }
    } else if (cleanParams.drawStatus === 'REVEALED') {
      this.spinInteractionAuthorized = false;
      this.authorizedSpinSeed = null;
      if (
        prevDrawStatus === 'SPINNING' &&
        this.luckyDrawTailFinishingSeed === null &&
        this.luckyDrawSpinAudio &&
        !this.luckyDrawSpinAudio.paused &&
        !this.luckyDrawSpinAudio.ended &&
        this.luckyDrawSpinAudio.currentTime > 0.1
      ) {
        this.activateSpinTailFinishing(prevSpinSeed ?? normalizedSeed ?? 0);
      }
    } else {
      this.spinInteractionAuthorized = false;
      this.authorizedSpinSeed = null;
      this.luckyDrawCurrentSpinSeed = null;
      this.luckyDrawEndedForSeed = null;
      this.luckyDrawRevealTriggeredForSeed = null;
      this.luckyDrawTailFinishingSeed = null;
      this.clearSpinTailSafetyTimer();
    }

    this.hasHydratedOwnerDrawState = true;
    this.luckyDrawOwners.set(ownerKey, cleanParams);
    this.luckyDrawOwners.delete('__prime__');
    this.luckyDrawSyncParams = cleanParams;
    this.reconcileLuckyDrawMusic();
  }

  public setLuckyDrawMusicPreview(active: boolean) {
    this.luckyDrawPreviewActive = active;
    if (active) {
      this.hasUserInteracted = true;
      this.spinInteractionAuthorized = true;
      this.luckyDrawAutoplayBlocked = false;
      this.luckyDrawError = null;
    } else if (this.luckyDrawSyncParams.drawStatus !== 'SPINNING') {
      this.spinInteractionAuthorized = false;
    }
    this.reconcileLuckyDrawMusic();
  }

  public stopLuckyDrawMusic(ownerId?: string) {
    const ownerKey = ownerId || 'default';
    if (ownerId) {
      const existing = this.luckyDrawStopTimers.get(ownerKey);
      if (existing) clearTimeout(existing);
      const timer = setTimeout(() => {
        this.luckyDrawStopTimers.delete(ownerKey);
        this.luckyDrawOwners.delete(ownerKey);
        const remaining = Array.from(this.luckyDrawOwners.values());
        if (remaining.length > 0) {
          this.luckyDrawSyncParams = remaining[remaining.length - 1];
          this.reconcileLuckyDrawMusic();
          return;
        }
        this.performStopLuckyDrawMusic();
      }, 60);
      this.luckyDrawStopTimers.set(ownerKey, timer);
      return;
    }
    this.luckyDrawOwners.clear();
    this.performStopLuckyDrawMusic();
  }

  private performStopLuckyDrawMusic() {
    this.luckyDrawPreviewActive = false;
    this.spinInteractionAuthorized = false;
    this.authorizedSpinSeed = null;
    this.luckyDrawCurrentSpinSeed = null;
    this.luckyDrawEndedForSeed = null;
    this.luckyDrawRevealTriggeredForSeed = null;
    this.luckyDrawTailFinishingSeed = null;
    this.pendingWaitingFadeIn = false;
    this.clearSpinTailSafetyTimer();
    this.clearWaitingFade();
    this.luckyDrawCurrentTimeSec = 0;
    if (this.luckyDrawAbortRetryTimer) {
      clearTimeout(this.luckyDrawAbortRetryTimer);
      this.luckyDrawAbortRetryTimer = null;
    }
    this.detachAutoplayGestureUnlock();
    if (this.luckyDrawSpinAudio) {
      try {
        this.luckyDrawSpinAudio.pause();
        this.luckyDrawSpinAudio.currentTime = 0;
      } catch {}
    }
    this.luckyDrawSyncParams = {
      ...this.luckyDrawSyncParams,
      drawStatus: 'IDLE',
      isLuckyDrawActive: false,
      isLuckyDrawScreenMounted: false,
      spinSeed: null,
    };
    const nextPhase = this.computeCurrentAppMusicPhase();
    if (nextPhase !== 'lobby_wait' && this.luckyDrawWaitingAudio) {
      try {
        this.luckyDrawWaitingAudio.pause();
      } catch {}
    }
    this.reconcileLuckyDrawMusic();
  }

  /**
   * Preloads the Lucky Draw waiting and spin tracks when entering Lucky Draw controls.
   */
  public primeLuckyDrawAudio(_adminMusicMuted: boolean = false) {
    this.preloadLuckyDrawAudio();
  }

  /**
   * Synchronously primes and starts the Lucky Draw spin track inside the Spin button click handler
   * so browser autoplay policies allow immediate playback from 0:00.
   */
  public primeLuckyDrawSpinAudio(
    adminMusicMuted: boolean = false,
    spinSeed: number | null = Date.now(),
    autoStopOnMusicEnd: boolean = false
  ) {
    this.clearSpinTailSafetyTimer();
    this.pendingWaitingFadeIn = false;
    const shouldSilenceImmediately =
      !this.enabled || adminMusicMuted || this.luckyDrawSyncParams.localMuted || this.isTtsSpeaking();
    if (shouldSilenceImmediately) {
      this.clearWaitingFade();
      if (this.luckyDrawWaitingAudio && !this.luckyDrawWaitingAudio.paused) {
        try {
          this.luckyDrawWaitingAudio.pause();
          this.luckyDrawWaitingAudio.volume = this.volume;
        } catch {}
      }
    } else if (this.luckyDrawWaitingAudio && !this.luckyDrawWaitingAudio.paused) {
      this.luckyDrawActiveTrack = 'spinning';
      this.fadeOutWaitingAudio(this.luckyDrawWaitingAudio, 650);
    }
    const audio = this.getOrCreateLuckyDrawSpinAudio();
    this.hasUserInteracted = true;
    this.spinInteractionAuthorized = true;
    this.authorizedSpinSeed = spinSeed;
    this.luckyDrawPreviewActive = false;
    this.luckyDrawEndedForSeed = null;
    this.luckyDrawRevealTriggeredForSeed = null;
    this.luckyDrawTailFinishingSeed = null;
    this.luckyDrawCurrentSpinSeed = spinSeed;
    this.luckyDrawCurrentTimeSec = 0;
    this.luckyDrawDurationSec = LUCKY_DRAW_SPIN_DURATION_SEC;
    if (audio) {
      try {
        audio.loop = !autoStopOnMusicEnd;
        audio.currentTime = 0;
      } catch {}
    }
    const primeParams = {
      ...this.luckyDrawSyncParams,
      drawStatus: 'SPINNING' as const,
      isLuckyDrawActive: true,
      isLuckyDrawScreenMounted: true,
      adminMusicMuted,
      spinSeed,
      autoStopOnMusicEnd,
    };
    this.luckyDrawOwners.set('__prime__', primeParams);
    this.luckyDrawSyncParams = primeParams;
    if (!this.enabled || adminMusicMuted || this.luckyDrawSyncParams.localMuted || this.isTtsSpeaking()) {
      this.reconcileLuckyDrawMusic();
      return;
    }
    this.luckyDrawAutoplayBlocked = false;
    this.luckyDrawError = null;
    this.reconcileLuckyDrawMusic();
  }

  public unlockLuckyDrawMusic(forceEnableGlobalSound: boolean = false) {
    this.hasUserInteracted = true;
    this.spinInteractionAuthorized = true;
    this.authorizedSpinSeed =
      this.luckyDrawCurrentSpinSeed ??
      this.luckyDrawSyncParams.spinSeed ??
      this.appSoundContext.spinSeed ??
      null;
    if (forceEnableGlobalSound) {
      if (!this.enabled) {
        this.setEnabled(true);
      }
      if (this.volume <= 0.01) {
        this.setVolume(0.8);
      }
    }
    if (this.luckyDrawError) {
      if (this.luckyDrawSpinAudio) {
        try {
          this.luckyDrawSpinAudio.load();
        } catch {}
      }
      if (this.luckyDrawWaitingAudio) {
        try {
          this.luckyDrawWaitingAudio.load();
        } catch {}
      }
    }
    this.luckyDrawAutoplayBlocked = false;
    this.luckyDrawError = null;
    this.detachAutoplayGestureUnlock();
    this.reconcileLuckyDrawMusic();
  }

  private detachAutoplayGestureUnlock() {
    if (this.luckyDrawGestureCleanup) {
      this.luckyDrawGestureCleanup();
      this.luckyDrawGestureCleanup = null;
    }
  }

  private attachAutoplayGestureUnlock() {
    if (typeof window === 'undefined' || this.luckyDrawGestureCleanup) return;
    if (this.luckyDrawActiveTrack !== 'waiting') return;
    const onGesture = () => {
      if (!this.luckyDrawShouldPlayTarget || this.luckyDrawActiveTrack !== 'waiting') {
        this.detachAutoplayGestureUnlock();
        return;
      }
      this.hasUserInteracted = true;
      this.luckyDrawAutoplayBlocked = false;
      this.reconcileLuckyDrawMusic();
    };
    // Use click/touchend/pointerup/keydown because pointerdown alone often does not count as media user activation
    window.addEventListener('click', onGesture, { capture: true });
    window.addEventListener('touchend', onGesture, { capture: true });
    window.addEventListener('pointerup', onGesture, { capture: true });
    window.addEventListener('keydown', onGesture, { capture: true });
    this.luckyDrawGestureCleanup = () => {
      window.removeEventListener('click', onGesture, true);
      window.removeEventListener('touchend', onGesture, true);
      window.removeEventListener('pointerup', onGesture, true);
      window.removeEventListener('keydown', onGesture, true);
    };
  }

  private attemptPlayLuckyDrawAudio(
    audio: HTMLAudioElement,
    expectedTrack: 'waiting' | 'spinning',
    fadeInOnStart: boolean = false
  ) {
    const isStillTargetTrack = () =>
      this.luckyDrawActiveTrack === expectedTrack && this.luckyDrawShouldPlayTarget;

    try {
      const playPromise = audio.play();
      if (playPromise && typeof playPromise.then === 'function') {
        playPromise
          .then(() => {
            if (!isStillTargetTrack()) {
              try {
                audio.pause();
              } catch {}
              if (this.luckyDrawActiveTrack === 'none' || !this.luckyDrawShouldPlayTarget) {
                this.luckyDrawIsPlaying = false;
              }
              this.notifyLuckyDrawListeners();
              return;
            }
            if (fadeInOnStart && expectedTrack === 'waiting') {
              this.fadeInWaitingAudio(audio, 1500);
            }
            this.luckyDrawIsPlaying = true;
            this.luckyDrawAutoplayBlocked = false;
            this.luckyDrawError = null;
            this.detachAutoplayGestureUnlock();
            this.notifyLuckyDrawListeners();
          })
          .catch((err: unknown) => {
            const errName = err instanceof Error ? err.name : '';
            const errMsg = err instanceof Error ? err.message : '';
            if (!isStillTargetTrack()) {
              if (this.luckyDrawActiveTrack === 'none' || !this.luckyDrawShouldPlayTarget) {
                this.luckyDrawIsPlaying = false;
              }
              this.notifyLuckyDrawListeners();
              return;
            }
            if (errName === 'NotAllowedError') {
              this.luckyDrawAutoplayBlocked = true;
              this.luckyDrawError = null;
              if (this.luckyDrawActiveTrack === 'waiting') {
                this.attachAutoplayGestureUnlock();
              } else {
                this.detachAutoplayGestureUnlock();
              }
            } else if (errName === 'AbortError') {
              if (isStillTargetTrack() && audio.paused && !this.luckyDrawAbortRetryTimer) {
                this.luckyDrawAbortRetryTimer = setTimeout(() => {
                  this.luckyDrawAbortRetryTimer = null;
                  if (isStillTargetTrack() && audio.paused) {
                    this.attemptPlayLuckyDrawAudio(audio, expectedTrack, fadeInOnStart);
                  }
                }, 150);
              }
            } else {
              this.luckyDrawError = errMsg || 'Không thể phát nhạc quay số';
            }
            this.luckyDrawIsPlaying = false;
            this.notifyLuckyDrawListeners();
          });
      } else {
        if (!isStillTargetTrack()) {
          try {
            audio.pause();
          } catch {}
          if (this.luckyDrawActiveTrack === 'none' || !this.luckyDrawShouldPlayTarget) {
            this.luckyDrawIsPlaying = false;
          }
          this.notifyLuckyDrawListeners();
          return;
        }
        if (fadeInOnStart && expectedTrack === 'waiting') {
          this.fadeInWaitingAudio(audio, 1500);
        }
        this.luckyDrawIsPlaying = true;
        this.luckyDrawAutoplayBlocked = false;
        this.luckyDrawError = null;
        this.detachAutoplayGestureUnlock();
        this.notifyLuckyDrawListeners();
      }
    } catch (err: unknown) {
      if (!isStillTargetTrack()) {
        if (this.luckyDrawActiveTrack === 'none' || !this.luckyDrawShouldPlayTarget) {
          this.luckyDrawIsPlaying = false;
        }
        this.notifyLuckyDrawListeners();
        return;
      }
      const errName = err instanceof Error ? err.name : '';
      if (errName === 'NotAllowedError') {
        this.luckyDrawAutoplayBlocked = true;
        if (this.luckyDrawActiveTrack === 'waiting') {
          this.attachAutoplayGestureUnlock();
        } else {
          this.detachAutoplayGestureUnlock();
        }
      } else {
        this.luckyDrawError = err instanceof Error ? err.message : 'Không thể phát nhạc quay số';
      }
      this.luckyDrawIsPlaying = false;
      this.notifyLuckyDrawListeners();
    }
  }

  private reconcileLuckyDrawMusic() {
    const owners = Array.from(this.luckyDrawOwners.values());
    const hasOwner = owners.length > 0;
    const isLuckyDrawScreenMounted = owners.some((o) => Boolean(o.isLuckyDrawScreenMounted));
    const effectiveDrawStatus = hasOwner
      ? this.luckyDrawSyncParams.drawStatus
      : this.appSoundContext.drawStatus;
    const effectiveAdminMuted = hasOwner
      ? this.luckyDrawSyncParams.adminMusicMuted
      : this.appSoundContext.adminMusicMuted;
    const effectiveLocalMuted = hasOwner ? this.luckyDrawSyncParams.localMuted : false;
    const effectiveAutoStop = hasOwner
      ? Boolean(this.luckyDrawSyncParams.autoStopOnMusicEnd)
      : Boolean(this.appSoundContext.autoStopOnMusicEnd);
    const effectiveSeed = hasOwner
      ? this.luckyDrawSyncParams.spinSeed
      : this.appSoundContext.spinSeed;

    const activeSeedKey = this.luckyDrawCurrentSpinSeed ?? effectiveSeed ?? 0;
    const hasEndedForCurrentSpin = Boolean(
      effectiveAutoStop &&
        this.luckyDrawEndedForSeed !== null &&
        this.luckyDrawEndedForSeed === activeSeedKey
    );
    const isSpinTailFinishing = this.luckyDrawTailFinishingSeed !== null;

    const computedPhase = this.computeCurrentAppMusicPhase();
    this.appMusicPhase =
      computedPhase ??
      (this.luckyDrawPreviewActive
        ? 'lucky_draw_spin'
        : this.adminMuted && !isLuckyDrawScreenMounted
        ? 'silent'
        : effectiveDrawStatus === 'SPINNING' || (effectiveDrawStatus === 'REVEALED' && isSpinTailFinishing)
        ? 'lucky_draw_spin'
        : (effectiveDrawStatus === 'IDLE' || (effectiveDrawStatus === 'REVEALED' && !isSpinTailFinishing)) &&
          this.luckyDrawSyncParams.isLuckyDrawActive
        ? 'lobby_wait'
        : 'silent');

    const decision = resolveLuckyDrawMusicPlayback({
      drawStatus: effectiveDrawStatus,
      isLuckyDrawActive: hasOwner
        ? this.luckyDrawSyncParams.isLuckyDrawActive
        : computedPhase === 'lobby_wait' || computedPhase === 'lucky_draw_spin',
      isLuckyDrawScreenMounted,
      isAdminView: this.hasAppSoundContext
        ? this.appSoundContext.currentView === 'admin'
        : this.adminMuted,
      adminMusicMuted: effectiveAdminMuted,
      localMuted: effectiveLocalMuted,
      globalSoundEnabled: this.enabled,
      localPreviewActive: this.luckyDrawPreviewActive,
      isTtsSpeaking: this.isTtsSpeaking(),
      autoStopOnMusicEnd: effectiveAutoStop,
      hasEndedForCurrentSpin,
      appMusicPhase: computedPhase,
      spinInteractionAuthorized: this.spinInteractionAuthorized,
      isSpinTailFinishing,
    });

    this.luckyDrawReason = decision.reason;
    this.luckyDrawShouldPlayTarget = decision.shouldPlay;
    this.luckyDrawActiveTrack = decision.activeTrack;

    if (decision.activeTrack === 'spinning') {
      if (decision.shouldPlay) {
        if (this.luckyDrawWaitingAudio && !this.luckyDrawWaitingAudio.paused) {
          this.fadeOutWaitingAudio(this.luckyDrawWaitingAudio, 650);
        }
      } else {
        this.clearWaitingFade();
        if (this.luckyDrawWaitingAudio && !this.luckyDrawWaitingAudio.paused) {
          try {
            this.luckyDrawWaitingAudio.pause();
            this.luckyDrawWaitingAudio.volume = this.volume;
          } catch {}
        }
      }

      if (decision.shouldPlay) {
        const spinAudio = this.getOrCreateLuckyDrawSpinAudio();
        if (!spinAudio) {
          this.notifyLuckyDrawListeners();
          return;
        }
        spinAudio.loop = decision.shouldLoop;
        spinAudio.volume = this.volume;
        spinAudio.muted = false;
        if (spinAudio.paused) {
          this.attemptPlayLuckyDrawAudio(spinAudio, 'spinning');
        } else {
          this.luckyDrawIsPlaying = true;
          this.luckyDrawError = null;
          this.detachAutoplayGestureUnlock();
          this.notifyLuckyDrawListeners();
        }
      } else {
        if (this.luckyDrawAbortRetryTimer) {
          clearTimeout(this.luckyDrawAbortRetryTimer);
          this.luckyDrawAbortRetryTimer = null;
        }
        this.detachAutoplayGestureUnlock();
        if (this.luckyDrawSpinAudio) {
          try {
            this.luckyDrawSpinAudio.pause();
            if (decision.resetPosition && this.luckyDrawSpinAudio.currentTime !== 0) {
              this.luckyDrawSpinAudio.currentTime = 0;
              this.luckyDrawCurrentTimeSec = 0;
            }
          } catch {}
        }
        this.luckyDrawIsPlaying = false;
        if (decision.resetPosition) {
          this.luckyDrawAutoplayBlocked = false;
          this.luckyDrawError = null;
        }
        this.notifyLuckyDrawListeners();
      }
      return;
    }

    if (decision.activeTrack === 'waiting') {
      if (this.luckyDrawSpinAudio && !this.luckyDrawSpinAudio.paused) {
        try {
          this.luckyDrawSpinAudio.pause();
          this.luckyDrawSpinAudio.currentTime = 0;
        } catch {}
      }

      if (decision.shouldPlay) {
        const waitingAudio = this.getOrCreateLuckyDrawWaitingAudio();
        if (!waitingAudio) {
          this.notifyLuckyDrawListeners();
          return;
        }
        waitingAudio.loop = decision.shouldLoop;
        waitingAudio.muted = false;
        if (waitingAudio.paused) {
          if (this.pendingWaitingFadeIn) {
            this.pendingWaitingFadeIn = false;
            waitingAudio.volume = 0;
            this.attemptPlayLuckyDrawAudio(waitingAudio, 'waiting', true);
          } else {
            this.clearWaitingFade();
            waitingAudio.volume = this.volume;
            this.attemptPlayLuckyDrawAudio(waitingAudio, 'waiting', false);
          }
        } else {
          if (this.waitingFadeMode === 'out') {
            this.clearWaitingFade();
            waitingAudio.volume = this.volume;
          } else if (!this.waitingFadeInterval) {
            waitingAudio.volume = this.volume;
          }
          this.luckyDrawIsPlaying = true;
          this.luckyDrawError = null;
          this.detachAutoplayGestureUnlock();
          this.notifyLuckyDrawListeners();
        }
      } else {
        this.clearWaitingFade();
        if (this.luckyDrawAbortRetryTimer) {
          clearTimeout(this.luckyDrawAbortRetryTimer);
          this.luckyDrawAbortRetryTimer = null;
        }
        this.detachAutoplayGestureUnlock();
        if (this.luckyDrawWaitingAudio) {
          try {
            this.luckyDrawWaitingAudio.pause();
          } catch {}
        }
        this.luckyDrawIsPlaying = false;
        if (decision.resetPosition) {
          this.luckyDrawAutoplayBlocked = false;
          this.luckyDrawError = null;
        }
        this.notifyLuckyDrawListeners();
      }
      return;
    }

    // activeTrack === 'none'
    if (this.luckyDrawAbortRetryTimer) {
      clearTimeout(this.luckyDrawAbortRetryTimer);
      this.luckyDrawAbortRetryTimer = null;
    }
    this.detachAutoplayGestureUnlock();
    if (this.luckyDrawSpinAudio) {
      try {
        this.luckyDrawSpinAudio.pause();
        if (decision.resetPosition && this.luckyDrawSpinAudio.currentTime !== 0) {
          this.luckyDrawSpinAudio.currentTime = 0;
          this.luckyDrawCurrentTimeSec = 0;
        }
      } catch {}
    }
    if (this.luckyDrawWaitingAudio) {
      try {
        this.luckyDrawWaitingAudio.pause();
      } catch {}
    }
    this.luckyDrawIsPlaying = false;
    if (decision.resetPosition) {
      this.luckyDrawAutoplayBlocked = false;
      this.luckyDrawError = null;
    }
    this.notifyLuckyDrawListeners();
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

  /**
   * Subtle 'message sent' sound effect for chat/assistant widget
   * Gentle, soft ascending whoosh/blip providing pleasant tactile feedback
   */
  public playMessageSent() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    this.notifyActivity(120);

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      if (this.soundPack === 'retro') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(580, now);
        osc.frequency.setValueAtTime(880, now + 0.04);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
      } else if (this.soundPack === 'cyberpunk') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(1040, now + 0.07);
        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      } else if (this.soundPack === 'zen') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.1);
        gain.gain.setValueAtTime(0.09, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      } else {
        // Classic & SciFi: Subtle silky ascending sine blip
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.065); // G5

        // Gentle attack & fast smooth decay
        gain.gain.setValueAtTime(0.01, now);
        gain.gain.linearRampToValueAtTime(0.13, now + 0.012);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.085);
      }

      osc.connect(gain);
      gain.connect(this.getDestination(ctx));

      osc.start(now);
      osc.stop(now + 0.11);
    } catch {}
  }

  /**
   * Subtle 'message received' sound effect for chat/assistant widget
   * Gentle, friendly two-tone chime/bubble pop for incoming AI messages
   */
  public playMessageReceived() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    this.notifyActivity(180);

    try {
      const now = ctx.currentTime;

      if (this.soundPack === 'retro') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(659.25, now);
        osc.frequency.setValueAtTime(987.77, now + 0.05);
        gain.gain.setValueAtTime(0.07, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now);
        osc.stop(now + 0.12);
      } else if (this.soundPack === 'cyberpunk') {
        [783.99, 1174.66].forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const t = now + idx * 0.05;
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, t);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.connect(gain);
          gain.connect(this.getDestination(ctx));
          osc.start(t);
          osc.stop(t + 0.08);
        });
      } else if (this.soundPack === 'zen') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        osc.connect(gain);
        gain.connect(this.getDestination(ctx));
        osc.start(now);
        osc.stop(now + 0.18);
      } else {
        // Classic, SciFi & Default: Two gentle melodious harmonic notes (E5 -> A5)
        const notes = [659.25, 880.00];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + idx * 0.065;
          const duration = 0.11;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);
          osc.frequency.exponentialRampToValueAtTime(freq * 1.02, startTime + duration);

          gain.gain.setValueAtTime(0.01, startTime);
          gain.gain.linearRampToValueAtTime(0.12, startTime + 0.01);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

          osc.connect(gain);
          gain.connect(this.getDestination(ctx));

          osc.start(startTime);
          osc.stop(startTime + duration);
        });
      }
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
