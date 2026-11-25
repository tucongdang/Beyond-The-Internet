import test from 'node:test';
import assert from 'node:assert/strict';
import { canTriggerVibration } from './hapticUtils';

test('canTriggerVibration blocks vibration before any user activation', () => {
  assert.equal(canTriggerVibration({ userActivation: { hasBeenActive: false } }), false);
  assert.equal(canTriggerVibration({ userActivation: {} }), false);
});

test('canTriggerVibration allows vibration after user activation or when userActivation API is unavailable', () => {
  assert.equal(canTriggerVibration({ userActivation: { hasBeenActive: true } }), true);
  assert.equal(canTriggerVibration({}), true);
  assert.equal(canTriggerVibration(null), false);
});
