import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPendingDedupeKey,
  upsertPendingSyncItem,
  removeSyncedItemsFromQueue,
  markFailedSyncItems,
  mergeOfflineProgressSnapshot,
  migrateLegacyOfflineQueue,
  resolveOfflineFallbackAction,
  PendingSyncItem,
} from './offlineModeUtils';

test('buildPendingDedupeKey scopes responses and predictions by questionId and uid', () => {
  assert.equal(buildPendingDedupeKey('response', 'u1', 'KD_01'), 'response:KD_01:u1');
  assert.equal(buildPendingDedupeKey('prediction', 'u1', 'KD_01'), 'prediction:KD_01:u1');
  assert.equal(buildPendingDedupeKey('champion_vote', 'u1'), 'champion_vote:u1');
  assert.equal(buildPendingDedupeKey('user_profile', 'u1'), 'user_profile:u1');
});

test('upsertPendingSyncItem deduplicates updates to the same question/user and keeps newest choice', () => {
  let queue: PendingSyncItem[] = [];
  queue = upsertPendingSyncItem(queue, {
    id: 'item_1',
    type: 'response',
    questionId: 'KD_01',
    uid: 'user_a',
    payload: { choice: 'A', timestamp: 1000 },
    savedAt: 1000,
  });
  queue = upsertPendingSyncItem(queue, {
    id: 'item_2',
    type: 'response',
    questionId: 'KD_02',
    uid: 'user_a',
    payload: { choice: 'B', timestamp: 2000 },
    savedAt: 2000,
  });
  queue = upsertPendingSyncItem(queue, {
    id: 'item_3',
    type: 'response',
    questionId: 'KD_01',
    uid: 'user_a',
    payload: { choice: 'C', timestamp: 3000 },
    savedAt: 3000,
  });
  queue = upsertPendingSyncItem(queue, {
    id: 'pred_1',
    type: 'prediction',
    questionId: 'KD_01',
    uid: 'user_a',
    payload: { contestantId: 'team_alpha' },
    savedAt: 2500,
  });

  assert.equal(queue.length, 3);
  assert.equal(queue[0].questionId, 'KD_02');
  assert.equal(queue[1].type, 'prediction');
  assert.equal(queue[2].id, 'item_3');
  assert.equal(queue[2].payload.choice, 'C');
});

test('removeSyncedItemsFromQueue deletes only synced IDs and preserves failed items', () => {
  const queue: PendingSyncItem[] = [
    {
      id: 'sync_1',
      dedupeKey: 'response:Q1:u1',
      type: 'response',
      questionId: 'Q1',
      uid: 'u1',
      payload: { choice: 'A' },
      savedAt: 1000,
      attempts: 0,
    },
    {
      id: 'sync_2',
      dedupeKey: 'response:Q2:u1',
      type: 'response',
      questionId: 'Q2',
      uid: 'u1',
      payload: { choice: 'B' },
      savedAt: 2000,
      attempts: 0,
    },
  ];

  const remaining = removeSyncedItemsFromQueue(queue, ['sync_1']);
  assert.equal(remaining.length, 1);
  assert.equal(remaining[0].id, 'sync_2');
});

test('markFailedSyncItems increments attempts and records error message', () => {
  const queue: PendingSyncItem[] = [
    {
      id: 'q1',
      dedupeKey: 'response:Q1:u1',
      type: 'response',
      questionId: 'Q1',
      uid: 'u1',
      payload: { choice: 'A' },
      savedAt: 1000,
      attempts: 0,
    },
  ];

  const updated = markFailedSyncItems(queue, { q1: 'network-timeout' });
  assert.equal(updated[0].attempts, 1);
  assert.equal(updated[0].lastError, 'network-timeout');
});

test('mergeOfflineProgressSnapshot accumulates unique answered question IDs', () => {
  const first = mergeOfflineProgressSnapshot(undefined, {
    uid: 'u1',
    questionId: 'KD_01',
    roundName: 'Vòng 1: Khởi Động',
    roundType: 'MULTIPLE_CHOICE',
    choice: 'A',
    timestamp: 1000,
  });
  assert.equal(first.totalSavedAnswers, 1);
  assert.deepEqual(first.answeredQuestionIds, ['KD_01']);

  const revoteSame = mergeOfflineProgressSnapshot(first, {
    uid: 'u1',
    questionId: 'KD_01',
    roundName: 'Vòng 1: Khởi Động',
    roundType: 'MULTIPLE_CHOICE',
    choice: 'B',
    timestamp: 1500,
  });
  assert.equal(revoteSame.totalSavedAnswers, 1);
  assert.equal(revoteSame.lastChoice, 'B');
  assert.equal(revoteSame.lastUpdatedAt, 1500);

  const second = mergeOfflineProgressSnapshot(revoteSame, {
    uid: 'u1',
    questionId: 'KD_02',
    roundName: 'Vòng 1: Khởi Động',
    roundType: 'TRUE_FALSE_4',
    choice: '1:Đ,2:S',
    timestamp: 2000,
  });
  assert.equal(second.totalSavedAnswers, 2);
  assert.deepEqual(second.answeredQuestionIds, ['KD_01', 'KD_02']);
});

test('migrateLegacyOfflineQueue safely converts valid entries and skips malformed rows', () => {
  const migrated = migrateLegacyOfflineQueue([
    null,
    { questionId: '', uid: 'u1', payload: {} },
    {
      id: 'legacy_1',
      questionId: 'KD_01',
      uid: 'u1',
      payload: { choice: 'D', timestamp: 5000 },
      savedAt: 5000,
    },
    {
      questionId: 'KD_01',
      payload: { choice: 'A', user_info: { uid: 'u1' } },
      savedAt: 6000,
    },
  ]);

  assert.equal(migrated.length, 1);
  assert.equal(migrated[0].payload.choice, 'A');
  assert.equal(migrated[0].payload.isOfflineSync, true);
});

test('resolveOfflineFallbackAction keeps live online sync when connected and queues locally on network drop when enabled', () => {
  assert.equal(
    resolveOfflineFallbackAction({ isOfflineModeEnabled: true, isNetworkConnected: true }),
    'SYNC_ONLINE'
  );
  assert.equal(
    resolveOfflineFallbackAction({ isOfflineModeEnabled: false, isNetworkConnected: true }),
    'SYNC_ONLINE'
  );
  assert.equal(
    resolveOfflineFallbackAction({ isOfflineModeEnabled: true, isNetworkConnected: false }),
    'QUEUE_LOCALLY'
  );
  assert.equal(
    resolveOfflineFallbackAction({ isOfflineModeEnabled: false, isNetworkConnected: false }),
    'FAIL_OFFLINE_DISABLED'
  );
});
