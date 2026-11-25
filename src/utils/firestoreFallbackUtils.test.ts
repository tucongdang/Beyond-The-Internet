import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FirestoreOperationType,
  buildChampionVoteFallbackDocPath,
  buildPredictionFallbackDocPath,
  buildStructuredFirestoreErrorContext,
  decideFirestoreFallbackAction,
  isOfflineOrTransientNetworkError,
  isPermissionDeniedError,
} from './firestoreFallbackUtils';

test('isPermissionDeniedError recognizes FirebaseError code and message patterns', () => {
  assert.equal(
    isPermissionDeniedError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }),
    true
  );
  assert.equal(
    isPermissionDeniedError(new Error('FirebaseError: Missing or insufficient permissions.')),
    true
  );
  assert.equal(
    isPermissionDeniedError(new Error('Firestore write timeout (network interrupted)')),
    false
  );
  assert.equal(isPermissionDeniedError(null), false);
});

test('isOfflineOrTransientNetworkError distinguishes network outages from permission errors', () => {
  assert.equal(
    isOfflineOrTransientNetworkError({ code: 'permission-denied', message: 'Missing or insufficient permissions.' }),
    false
  );
  assert.equal(
    isOfflineOrTransientNetworkError(new Error('Firestore write timeout (network interrupted)')),
    true
  );
  assert.equal(
    isOfflineOrTransientNetworkError({ code: 'unavailable', message: 'The service is currently unavailable.' }),
    true
  );
});

test('decideFirestoreFallbackAction switches to fallback collection without marking disconnected on permission-denied', () => {
  const decisionWhenOfflineOff = decideFirestoreFallbackAction({
    error: { code: 'permission-denied', message: 'Missing or insufficient permissions.' },
    offlineModeEnabled: false,
  });
  assert.deepEqual(decisionWhenOfflineOff, {
    action: 'USE_FALLBACK_COLLECTION',
    markDisconnected: false,
    permissionDenied: true,
  });

  const decisionWhenOfflineOn = decideFirestoreFallbackAction({
    error: new Error('Missing or insufficient permissions.'),
    offlineModeEnabled: true,
  });
  assert.deepEqual(decisionWhenOfflineOn, {
    action: 'USE_FALLBACK_COLLECTION',
    markDisconnected: false,
    permissionDenied: true,
  });
});

test('decideFirestoreFallbackAction queues offline or rethrows on real network errors', () => {
  const networkErr = new Error('Firestore write timeout (network interrupted)');
  assert.deepEqual(
    decideFirestoreFallbackAction({ error: networkErr, offlineModeEnabled: true }),
    {
      action: 'QUEUE_OFFLINE',
      markDisconnected: true,
      permissionDenied: false,
    }
  );
  assert.deepEqual(
    decideFirestoreFallbackAction({ error: networkErr, offlineModeEnabled: false }),
    {
      action: 'RETHROW',
      markDisconnected: true,
      permissionDenied: false,
    }
  );
});

test('fallback doc path builders produce valid Firestore document paths', () => {
  assert.deepEqual(buildChampionVoteFallbackDocPath('aud_123'), [
    'notifications',
    'champion_votes',
    'messages',
    'aud_123',
  ]);
  assert.deepEqual(buildPredictionFallbackDocPath('q_01', 'aud_123'), [
    'notifications',
    'contestant_predictions',
    'messages',
    'q_01_aud_123',
  ]);
});

test('buildStructuredFirestoreErrorContext includes operationType, path, and auth metadata', () => {
  const ctx = buildStructuredFirestoreErrorContext(
    new Error('Missing or insufficient permissions.'),
    FirestoreOperationType.WRITE,
    'champion_votes/aud_1',
    null
  );
  assert.equal(ctx.operationType, FirestoreOperationType.WRITE);
  assert.equal(ctx.path, 'champion_votes/aud_1');
  assert.equal(ctx.error, 'Missing or insufficient permissions.');
  assert.equal(ctx.authInfo.userId, null);
  assert.deepEqual(ctx.authInfo.providerInfo, []);
});
