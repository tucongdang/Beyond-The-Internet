export const LUCKY_DRAW_WAITING_MUSIC_URL =
  '/assets/aistudio/truc-tiep-xo-so-mien-bac-ngay-17-02-2020-enhanced_5e05f1f4.mp3';

export const LUCKY_DRAW_SPIN_MUSIC_URL =
  '/assets/aistudio/Nh_c_quay_n_n_CNKD_1f7dab51.mp3';

// For backwards-compatibility with previous imports
export const LUCKY_DRAW_MUSIC_URL = LUCKY_DRAW_SPIN_MUSIC_URL;

// Reveal triggers at 14.35s when the main spin notes finish, while the full audio file
// ends naturally at ~17.352s before fading back into the lottery waiting music.
export const LUCKY_DRAW_SPIN_DURATION_SEC = 14.35;
export const LUCKY_DRAW_SPIN_DURATION_MS = Math.round(LUCKY_DRAW_SPIN_DURATION_SEC * 1000);
export const LUCKY_DRAW_SPIN_FULL_DURATION_SEC = 17.35;
export const LUCKY_DRAW_SPIN_FULL_DURATION_MS = Math.round(LUCKY_DRAW_SPIN_FULL_DURATION_SEC * 1000);

export type LuckyDrawActiveTrack = 'waiting' | 'spinning' | 'none';

export type AppMusicPhase = 'lobby_wait' | 'active_game' | 'lucky_draw_spin' | 'silent';

export type AppSoundView = 'landing' | 'client_landing' | 'audience' | 'admin' | 'projector' | 'policy';

export interface AppMusicPhaseInput {
  currentView: AppSoundView;
  isAdminAuthenticated: boolean;
  hasAudienceUser: boolean;
  isOnboardingOpen: boolean;
  activeModule?: 'GAME' | 'LUCKY_DRAW';
  gameStatus?: 'STANDBY' | 'ACTIVE' | 'LOCKED' | 'REVEAL';
  luckyDrawStatus?: 'IDLE' | 'SPINNING' | 'REVEALED';
  isLuckyDrawScreenMounted?: boolean;
  isMatchBreakActive?: boolean;
  eventScheduleEnabled?: boolean;
  eventScheduleStatus?: 'SCHEDULED' | 'IN_PROGRESS' | 'CONCLUDED';
  localPreviewActive?: boolean;
  isSpinTailFinishing?: boolean;
}

export function resolveAppMusicPhase(input: AppMusicPhaseInput): AppMusicPhase {
  const {
    currentView,
    isAdminAuthenticated,
    hasAudienceUser,
    isOnboardingOpen,
    activeModule = 'GAME',
    gameStatus = 'STANDBY',
    luckyDrawStatus = 'IDLE',
    isLuckyDrawScreenMounted = false,
    isMatchBreakActive = false,
    eventScheduleEnabled = false,
    eventScheduleStatus = 'IN_PROGRESS',
    localPreviewActive = false,
    isSpinTailFinishing = false,
  } = input;

  if (currentView === 'policy') {
    return 'silent';
  }

  if (currentView === 'admin') {
    if (!isAdminAuthenticated) return 'silent';
    if (localPreviewActive) return 'lucky_draw_spin';
    if (!isLuckyDrawScreenMounted) return 'silent';
    if (luckyDrawStatus === 'SPINNING') return 'lucky_draw_spin';
    if (luckyDrawStatus === 'REVEALED') {
      return isSpinTailFinishing ? 'lucky_draw_spin' : 'lobby_wait';
    }
    return 'lobby_wait';
  }

  if (currentView === 'projector' && !isAdminAuthenticated) {
    return 'silent';
  }

  if (eventScheduleEnabled && eventScheduleStatus === 'CONCLUDED') {
    return 'silent';
  }

  // No lobby music on landing pages
  if (currentView === 'landing' || currentView === 'client_landing') {
    return 'silent';
  }

  if (currentView === 'audience' && (!hasAudienceUser || isOnboardingOpen)) {
    return 'lobby_wait';
  }

  if (isMatchBreakActive || (eventScheduleEnabled && eventScheduleStatus === 'SCHEDULED')) {
    return 'lobby_wait';
  }

  if (activeModule === 'LUCKY_DRAW' || luckyDrawStatus !== 'IDLE') {
    if (luckyDrawStatus === 'SPINNING') return 'lucky_draw_spin';
    if (luckyDrawStatus === 'REVEALED') {
      return isSpinTailFinishing ? 'lucky_draw_spin' : 'lobby_wait';
    }
    return 'lobby_wait';
  }

  if (gameStatus === 'STANDBY') {
    return 'lobby_wait';
  }

  return 'active_game';
}

export type LuckyDrawMusicReason =
  | 'playing_waiting_lottery'
  | 'playing_spin_cone'
  | 'admin_preview'
  | 'admin_screen_silent'
  | 'active_game_music_paused'
  | 'awaiting_spin_interaction'
  | 'inactive_or_revealed'
  | 'music_ended_waiting_reveal'
  | 'admin_muted'
  | 'local_muted'
  | 'global_sound_disabled'
  | 'tts_ducked';

export interface LuckyDrawMusicDecisionInput {
  drawStatus: 'IDLE' | 'SPINNING' | 'REVEALED';
  isLuckyDrawActive: boolean;
  isLuckyDrawScreenMounted?: boolean;
  isAdminView: boolean;
  adminMusicMuted: boolean;
  localMuted: boolean;
  globalSoundEnabled: boolean;
  localPreviewActive: boolean;
  isTtsSpeaking: boolean;
  autoStopOnMusicEnd?: boolean;
  hasEndedForCurrentSpin?: boolean;
  appMusicPhase?: AppMusicPhase;
  spinInteractionAuthorized?: boolean;
  isSpinTailFinishing?: boolean;
}

export interface LuckyDrawMusicDecision {
  shouldPlay: boolean;
  activeTrack: LuckyDrawActiveTrack;
  shouldLoop: boolean;
  resetPosition: boolean;
  reason: LuckyDrawMusicReason;
}

export interface LuckyDrawSpinProgress {
  elapsedMs: number;
  durationMs: number;
  progressRatio: number;
  remainingSec: number;
  shouldTriggerFallbackReveal: boolean;
}

export function resolveLuckyDrawMusicPlayback(
  input: LuckyDrawMusicDecisionInput
): LuckyDrawMusicDecision {
  const {
    drawStatus,
    isLuckyDrawActive,
    isLuckyDrawScreenMounted = false,
    isAdminView,
    adminMusicMuted,
    localMuted,
    globalSoundEnabled,
    localPreviewActive,
    isTtsSpeaking,
    autoStopOnMusicEnd = false,
    hasEndedForCurrentSpin = false,
    appMusicPhase,
    spinInteractionAuthorized = false,
    isSpinTailFinishing = false,
  } = input;

  // Explicit preview button on Admin previews the spin cone music immediately (user interaction)
  if (isAdminView && localPreviewActive) {
    if (localMuted) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop: true,
        resetPosition: false,
        reason: 'local_muted',
      };
    }
    if (isTtsSpeaking) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop: true,
        resetPosition: false,
        reason: 'tts_ducked',
      };
    }
    return {
      shouldPlay: true,
      activeTrack: 'spinning',
      shouldLoop: true,
      resetPosition: false,
      reason: 'admin_preview',
    };
  }

  // When active_game phase is live (ACTIVE/LOCKED/REVEAL question), pause lobby/wait & spin music cleanly
  if (appMusicPhase === 'active_game') {
    return {
      shouldPlay: false,
      activeTrack: 'none',
      shouldLoop: false,
      resetPosition: true,
      reason: 'active_game_music_paused',
    };
  }

  // On other Admin tabs (outside Lucky Draw), keep Admin silent
  if (isAdminView && !isLuckyDrawScreenMounted) {
    return {
      shouldPlay: false,
      activeTrack: 'none',
      shouldLoop: false,
      resetPosition: true,
      reason: 'admin_screen_silent',
    };
  }

  if (appMusicPhase === 'silent') {
    return {
      shouldPlay: false,
      activeTrack: 'none',
      shouldLoop: false,
      resetPosition: true,
      reason: 'inactive_or_revealed',
    };
  }

  const isSpinPhase =
    appMusicPhase === 'lucky_draw_spin' ||
    (appMusicPhase === undefined &&
      (drawStatus === 'SPINNING' || (drawStatus === 'REVEALED' && isSpinTailFinishing)));
  const isLobbyPhase =
    appMusicPhase === 'lobby_wait' ||
    (appMusicPhase === undefined &&
      (drawStatus === 'IDLE' || (drawStatus === 'REVEALED' && !isSpinTailFinishing)));

  // Legacy active check when appMusicPhase isn't explicitly supplied
  if (appMusicPhase === undefined) {
    const activeStage = isAdminView ? isLuckyDrawScreenMounted : isLuckyDrawActive;
    if (!activeStage) {
      return {
        shouldPlay: false,
        activeTrack: 'none',
        shouldLoop: false,
        resetPosition: true,
        reason: 'inactive_or_revealed',
      };
    }
  }

  // Track 1: SPINNING (and 14.35s->17.35s finishing tail after REVEALED) -> Spin cone music
  if (isSpinPhase) {
    const shouldLoop = !autoStopOnMusicEnd && !isSpinTailFinishing;

    // Once the full 17.35s track has finished in auto-stop mode without transition, prevent restart
    if (autoStopOnMusicEnd && hasEndedForCurrentSpin && !isSpinTailFinishing) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop: false,
        resetPosition: false,
        reason: 'music_ended_waiting_reveal',
      };
    }

    if (!spinInteractionAuthorized && !isSpinTailFinishing) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop,
        resetPosition: false,
        reason: 'awaiting_spin_interaction',
      };
    }

    if (adminMusicMuted) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop,
        resetPosition: false,
        reason: 'admin_muted',
      };
    }

    if (localMuted) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop,
        resetPosition: false,
        reason: 'local_muted',
      };
    }

    if (!globalSoundEnabled) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop,
        resetPosition: false,
        reason: 'global_sound_disabled',
      };
    }

    if (isTtsSpeaking) {
      return {
        shouldPlay: false,
        activeTrack: 'spinning',
        shouldLoop,
        resetPosition: false,
        reason: 'tts_ducked',
      };
    }

    return {
      shouldPlay: true,
      activeTrack: 'spinning',
      shouldLoop,
      resetPosition: false,
      reason: 'playing_spin_cone',
    };
  }

  // Track 2: Lobby / Wait -> Play waiting lottery music ('truc-tiep-xo-so-mien-bac-ngay-17-02-2020-enhanced_5e05f1f4.mp3')
  if (isLobbyPhase) {
    if (adminMusicMuted) {
      return {
        shouldPlay: false,
        activeTrack: 'waiting',
        shouldLoop: true,
        resetPosition: false,
        reason: 'admin_muted',
      };
    }

    if (localMuted) {
      return {
        shouldPlay: false,
        activeTrack: 'waiting',
        shouldLoop: true,
        resetPosition: false,
        reason: 'local_muted',
      };
    }

    if (!globalSoundEnabled) {
      return {
        shouldPlay: false,
        activeTrack: 'waiting',
        shouldLoop: true,
        resetPosition: false,
        reason: 'global_sound_disabled',
      };
    }

    if (isTtsSpeaking) {
      return {
        shouldPlay: false,
        activeTrack: 'waiting',
        shouldLoop: true,
        resetPosition: false,
        reason: 'tts_ducked',
      };
    }

    return {
      shouldPlay: true,
      activeTrack: 'waiting',
      shouldLoop: true,
      resetPosition: false,
      reason: 'playing_waiting_lottery',
    };
  }

  return {
    shouldPlay: false,
    activeTrack: 'none',
    shouldLoop: false,
    resetPosition: true,
    reason: 'inactive_or_revealed',
  };
}

export function computeLuckyDrawSpinProgress(params: {
  elapsedMs: number;
  durationMs?: number;
  isAudioActivelyPlaying: boolean;
  safetyGraceMs?: number;
}): LuckyDrawSpinProgress {
  const durationMs = Math.max(1000, params.durationMs ?? LUCKY_DRAW_SPIN_DURATION_MS);
  const elapsedMs = Math.max(0, params.elapsedMs);
  const progressRatio = Math.min(1, elapsedMs / durationMs);
  const remainingSec = Math.max(0, (durationMs - elapsedMs) / 1000);
  // In auto-stop mode, since we cut before the 3-second silence, allow a minimal grace window of 400ms
  // before fallback auto-triggering if audio event hasn't already fired
  const safetyGraceMs = params.safetyGraceMs ?? 400;
  const deadlineMs = params.isAudioActivelyPlaying ? durationMs + safetyGraceMs : durationMs;

  return {
    elapsedMs,
    durationMs,
    progressRatio,
    remainingSec,
    shouldTriggerFallbackReveal: elapsedMs >= deadlineMs,
  };
}
