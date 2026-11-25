import test from 'node:test';
import assert from 'node:assert/strict';
import {
  LUCKY_DRAW_WAITING_MUSIC_URL,
  LUCKY_DRAW_SPIN_MUSIC_URL,
  LUCKY_DRAW_MUSIC_URL,
  LUCKY_DRAW_SPIN_DURATION_SEC,
  LUCKY_DRAW_SPIN_DURATION_MS,
  LUCKY_DRAW_SPIN_FULL_DURATION_SEC,
  LUCKY_DRAW_SPIN_FULL_DURATION_MS,
  resolveAppMusicPhase,
  resolveLuckyDrawMusicPlayback,
  computeLuckyDrawSpinProgress,
  LuckyDrawMusicDecisionInput,
} from './luckyDrawAudioUtils';

const baseInput: LuckyDrawMusicDecisionInput = {
  drawStatus: 'IDLE',
  isLuckyDrawActive: true,
  isLuckyDrawScreenMounted: true,
  isAdminView: false,
  adminMusicMuted: false,
  localMuted: false,
  globalSoundEnabled: true,
  localPreviewActive: false,
  isTtsSpeaking: false,
  autoStopOnMusicEnd: false,
  hasEndedForCurrentSpin: false,
  spinInteractionAuthorized: true,
};

test('Audio URLs and trimmed spin duration are configured properly', () => {
  assert.equal(
    LUCKY_DRAW_WAITING_MUSIC_URL,
    '/assets/aistudio/truc-tiep-xo-so-mien-bac-ngay-17-02-2020-enhanced_5e05f1f4.mp3'
  );
  assert.equal(
    LUCKY_DRAW_SPIN_MUSIC_URL,
    '/assets/aistudio/Nh_c_quay_n_n_CNKD_1f7dab51.mp3'
  );
  assert.equal(LUCKY_DRAW_MUSIC_URL, LUCKY_DRAW_SPIN_MUSIC_URL);
  assert.equal(LUCKY_DRAW_SPIN_DURATION_SEC, 14.35);
  assert.equal(LUCKY_DRAW_SPIN_DURATION_MS, 14350);
});

test('resolveAppMusicPhase cleanly distinguishes lobby_wait, active_game, lucky_draw_spin, and silent', () => {
  // Landing hub & client landing -> silent (no lobby music on landing page)
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'landing',
      isAdminAuthenticated: false,
      hasAudienceUser: false,
      isOnboardingOpen: false,
    }),
    'silent'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'client_landing',
      isAdminAuthenticated: false,
      hasAudienceUser: false,
      isOnboardingOpen: false,
    }),
    'silent'
  );

  // Audience onboarding or STANDBY -> lobby_wait
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'audience',
      isAdminAuthenticated: false,
      hasAudienceUser: false,
      isOnboardingOpen: true,
      activeModule: 'GAME',
      gameStatus: 'ACTIVE',
    }),
    'lobby_wait'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'audience',
      isAdminAuthenticated: false,
      hasAudienceUser: true,
      isOnboardingOpen: false,
      activeModule: 'GAME',
      gameStatus: 'STANDBY',
    }),
    'lobby_wait'
  );

  // Audience & authenticated Projector during ACTIVE / LOCKED / REVEAL -> active_game
  for (const gameStatus of ['ACTIVE', 'LOCKED', 'REVEAL'] as const) {
    assert.equal(
      resolveAppMusicPhase({
        currentView: 'audience',
        isAdminAuthenticated: false,
        hasAudienceUser: true,
        isOnboardingOpen: false,
        activeModule: 'GAME',
        gameStatus,
      }),
      'active_game'
    );
    assert.equal(
      resolveAppMusicPhase({
        currentView: 'projector',
        isAdminAuthenticated: true,
        hasAudienceUser: false,
        isOnboardingOpen: false,
        activeModule: 'GAME',
        gameStatus,
      }),
      'active_game'
    );
  }

  // Match break or scheduled waiting room -> lobby_wait even if gameStatus is ACTIVE
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'projector',
      isAdminAuthenticated: true,
      hasAudienceUser: false,
      isOnboardingOpen: false,
      activeModule: 'GAME',
      gameStatus: 'ACTIVE',
      isMatchBreakActive: true,
    }),
    'lobby_wait'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'audience',
      isAdminAuthenticated: false,
      hasAudienceUser: true,
      isOnboardingOpen: false,
      activeModule: 'GAME',
      gameStatus: 'ACTIVE',
      eventScheduleEnabled: true,
      eventScheduleStatus: 'SCHEDULED',
    }),
    'lobby_wait'
  );

  // Lucky Draw IDLE -> lobby_wait, SPINNING -> lucky_draw_spin,
  // REVEALED at 14.35s with tail finishing -> keeps lucky_draw_spin until 17.35s end, then returns to lobby_wait
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'projector',
      isAdminAuthenticated: true,
      hasAudienceUser: false,
      isOnboardingOpen: false,
      activeModule: 'LUCKY_DRAW',
      luckyDrawStatus: 'IDLE',
    }),
    'lobby_wait'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'projector',
      isAdminAuthenticated: true,
      hasAudienceUser: false,
      isOnboardingOpen: false,
      activeModule: 'LUCKY_DRAW',
      luckyDrawStatus: 'SPINNING',
    }),
    'lucky_draw_spin'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'projector',
      isAdminAuthenticated: true,
      hasAudienceUser: false,
      isOnboardingOpen: false,
      activeModule: 'LUCKY_DRAW',
      luckyDrawStatus: 'REVEALED',
      isSpinTailFinishing: true,
    }),
    'lucky_draw_spin'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'projector',
      isAdminAuthenticated: true,
      hasAudienceUser: false,
      isOnboardingOpen: false,
      activeModule: 'LUCKY_DRAW',
      luckyDrawStatus: 'REVEALED',
      isSpinTailFinishing: false,
    }),
    'lobby_wait'
  );

  // Policy, unauthenticated gates, concluded event, and Admin non-LuckyDraw tabs -> silent
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'policy',
      isAdminAuthenticated: false,
      hasAudienceUser: false,
      isOnboardingOpen: false,
    }),
    'silent'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'projector',
      isAdminAuthenticated: false,
      hasAudienceUser: false,
      isOnboardingOpen: false,
    }),
    'silent'
  );
  assert.equal(
    resolveAppMusicPhase({
      currentView: 'admin',
      isAdminAuthenticated: true,
      hasAudienceUser: false,
      isOnboardingOpen: false,
      isLuckyDrawScreenMounted: false,
      luckyDrawStatus: 'IDLE',
    }),
    'silent'
  );
});

test('Pauses background music during active_game phase and plays waiting track during lobby_wait', () => {
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      appMusicPhase: 'lobby_wait',
      isLuckyDrawActive: false,
    }),
    {
      shouldPlay: true,
      activeTrack: 'waiting',
      shouldLoop: true,
      resetPosition: false,
      reason: 'playing_waiting_lottery',
    }
  );

  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      appMusicPhase: 'active_game',
      isLuckyDrawActive: false,
    }),
    {
      shouldPlay: false,
      activeTrack: 'none',
      shouldLoop: false,
      resetPosition: true,
      reason: 'active_game_music_paused',
    }
  );
});

test('Requires spinInteractionAuthorized before triggering spinning wheel sound', () => {
  // Without spin interaction authorization (e.g., stale SPINNING on mount), do NOT play spin sound
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      drawStatus: 'SPINNING',
      appMusicPhase: 'lucky_draw_spin',
      spinInteractionAuthorized: false,
    }),
    {
      shouldPlay: false,
      activeTrack: 'spinning',
      shouldLoop: true,
      resetPosition: false,
      reason: 'awaiting_spin_interaction',
    }
  );

  // With user interaction authorization, spin sound plays
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      drawStatus: 'SPINNING',
      appMusicPhase: 'lucky_draw_spin',
      spinInteractionAuthorized: true,
    }),
    {
      shouldPlay: true,
      activeTrack: 'spinning',
      shouldLoop: true,
      resetPosition: false,
      reason: 'playing_spin_cone',
    }
  );
});

test('Plays waiting lottery music on IDLE, spinning cone on SPINNING, keeps tail on REVEALED until 17.35s then fades back to waiting', () => {
  // Verify full duration constant matches 17.35s
  assert.equal(LUCKY_DRAW_SPIN_FULL_DURATION_SEC, 17.35);
  assert.equal(LUCKY_DRAW_SPIN_FULL_DURATION_MS, 17350);

  // IDLE -> Plays waiting lottery track on loop
  assert.deepEqual(resolveLuckyDrawMusicPlayback({ ...baseInput, drawStatus: 'IDLE' }), {
    shouldPlay: true,
    activeTrack: 'waiting',
    shouldLoop: true,
    resetPosition: false,
    reason: 'playing_waiting_lottery',
  });

  // SPINNING -> Plays spinning cone track when authorized
  assert.deepEqual(resolveLuckyDrawMusicPlayback({ ...baseInput, drawStatus: 'SPINNING' }), {
    shouldPlay: true,
    activeTrack: 'spinning',
    shouldLoop: true,
    resetPosition: false,
    reason: 'playing_spin_cone',
  });

  // REVEALED at 14.35s while finishing tail up to 17.35s -> continues spinning audio without cutting off
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      drawStatus: 'REVEALED',
      isSpinTailFinishing: true,
      spinInteractionAuthorized: false,
      autoStopOnMusicEnd: true,
    }),
    {
      shouldPlay: true,
      activeTrack: 'spinning',
      shouldLoop: false,
      resetPosition: false,
      reason: 'playing_spin_cone',
    }
  );

  // REVEALED after 17.35s spin tail ends -> transitions back to waiting lottery music (fade-in handled by controller)
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      drawStatus: 'REVEALED',
      isSpinTailFinishing: false,
    }),
    {
      shouldPlay: true,
      activeTrack: 'waiting',
      shouldLoop: true,
      resetPosition: false,
      reason: 'playing_waiting_lottery',
    }
  );

  // When inactive
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({ ...baseInput, isLuckyDrawActive: false }),
    {
      shouldPlay: false,
      activeTrack: 'none',
      shouldLoop: false,
      resetPosition: true,
      reason: 'inactive_or_revealed',
    }
  );
});

test('disables looping in auto-stop mode and prevents restart once track ends for current spin', () => {
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      drawStatus: 'SPINNING',
      autoStopOnMusicEnd: true,
      hasEndedForCurrentSpin: false,
    }),
    {
      shouldPlay: true,
      activeTrack: 'spinning',
      shouldLoop: false,
      resetPosition: false,
      reason: 'playing_spin_cone',
    }
  );

  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      drawStatus: 'SPINNING',
      autoStopOnMusicEnd: true,
      hasEndedForCurrentSpin: true,
    }),
    {
      shouldPlay: false,
      activeTrack: 'spinning',
      shouldLoop: false,
      resetPosition: false,
      reason: 'music_ended_waiting_reveal',
    }
  );
});

test('pauses without resetting position when admin mutes and resumes cleanly when unmuted', () => {
  const mutedSpinning = resolveLuckyDrawMusicPlayback({
    ...baseInput,
    drawStatus: 'SPINNING',
    adminMusicMuted: true,
    autoStopOnMusicEnd: true,
  });
  assert.deepEqual(mutedSpinning, {
    shouldPlay: false,
    activeTrack: 'spinning',
    shouldLoop: false,
    resetPosition: false,
    reason: 'admin_muted',
  });

  const mutedIdle = resolveLuckyDrawMusicPlayback({
    ...baseInput,
    drawStatus: 'IDLE',
    adminMusicMuted: true,
  });
  assert.deepEqual(mutedIdle, {
    shouldPlay: false,
    activeTrack: 'waiting',
    shouldLoop: true,
    resetPosition: false,
    reason: 'admin_muted',
  });

  const unmutedSpinning = resolveLuckyDrawMusicPlayback({
    ...baseInput,
    drawStatus: 'SPINNING',
    adminMusicMuted: false,
    autoStopOnMusicEnd: false,
  });
  assert.deepEqual(unmutedSpinning, {
    shouldPlay: true,
    activeTrack: 'spinning',
    shouldLoop: true,
    resetPosition: false,
    reason: 'playing_spin_cone',
  });
});

test('respects local mute, global sound toggle, and TTS ducking during SPINNING and IDLE without losing position', () => {
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({ ...baseInput, drawStatus: 'SPINNING', localMuted: true }),
    { shouldPlay: false, activeTrack: 'spinning', shouldLoop: true, resetPosition: false, reason: 'local_muted' }
  );
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({ ...baseInput, drawStatus: 'IDLE', localMuted: true }),
    { shouldPlay: false, activeTrack: 'waiting', shouldLoop: true, resetPosition: false, reason: 'local_muted' }
  );
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({ ...baseInput, drawStatus: 'SPINNING', globalSoundEnabled: false }),
    { shouldPlay: false, activeTrack: 'spinning', shouldLoop: true, resetPosition: false, reason: 'global_sound_disabled' }
  );
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({ ...baseInput, drawStatus: 'SPINNING', isTtsSpeaking: true }),
    { shouldPlay: false, activeTrack: 'spinning', shouldLoop: true, resetPosition: false, reason: 'tts_ducked' }
  );
});

test('plays on Admin only when LuckyDrawAdmin is mounted, unless explicit preview is active', () => {
  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      isAdminView: true,
      isLuckyDrawScreenMounted: true,
      drawStatus: 'IDLE',
    }),
    { shouldPlay: true, activeTrack: 'waiting', shouldLoop: true, resetPosition: false, reason: 'playing_waiting_lottery' }
  );

  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      isAdminView: true,
      isLuckyDrawScreenMounted: true,
      drawStatus: 'SPINNING',
    }),
    { shouldPlay: true, activeTrack: 'spinning', shouldLoop: true, resetPosition: false, reason: 'playing_spin_cone' }
  );

  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      isAdminView: true,
      isLuckyDrawScreenMounted: false,
      drawStatus: 'SPINNING',
      localPreviewActive: false,
    }),
    { shouldPlay: false, activeTrack: 'none', shouldLoop: false, resetPosition: true, reason: 'admin_screen_silent' }
  );

  assert.deepEqual(
    resolveLuckyDrawMusicPlayback({
      ...baseInput,
      isAdminView: true,
      isLuckyDrawScreenMounted: false,
      adminMusicMuted: true,
      localPreviewActive: true,
    }),
    { shouldPlay: true, activeTrack: 'spinning', shouldLoop: true, resetPosition: false, reason: 'admin_preview' }
  );
});

test('computeLuckyDrawSpinProgress tracks countdown based on 14.35s duration and grants natural ended grace window only when actively playing', () => {
  const halfway = computeLuckyDrawSpinProgress({
    elapsedMs: LUCKY_DRAW_SPIN_DURATION_MS / 2,
    durationMs: LUCKY_DRAW_SPIN_DURATION_MS,
    isAudioActivelyPlaying: true,
  });
  assert.ok(Math.abs(halfway.progressRatio - 0.5) < 0.01);
  assert.equal(halfway.shouldTriggerFallbackReveal, false);

  const atEndPlaying = computeLuckyDrawSpinProgress({
    elapsedMs: LUCKY_DRAW_SPIN_DURATION_MS,
    durationMs: LUCKY_DRAW_SPIN_DURATION_MS,
    isAudioActivelyPlaying: true,
  });
  assert.equal(atEndPlaying.progressRatio, 1);
  assert.equal(atEndPlaying.remainingSec, 0);
  assert.equal(atEndPlaying.shouldTriggerFallbackReveal, false);

  const pastGracePlaying = computeLuckyDrawSpinProgress({
    elapsedMs: LUCKY_DRAW_SPIN_DURATION_MS + 600,
    durationMs: LUCKY_DRAW_SPIN_DURATION_MS,
    isAudioActivelyPlaying: true,
  });
  assert.equal(pastGracePlaying.shouldTriggerFallbackReveal, true);

  const atEndMuted = computeLuckyDrawSpinProgress({
    elapsedMs: LUCKY_DRAW_SPIN_DURATION_MS,
    durationMs: LUCKY_DRAW_SPIN_DURATION_MS,
    isAudioActivelyPlaying: false,
  });
  assert.equal(atEndMuted.shouldTriggerFallbackReveal, true);
});
