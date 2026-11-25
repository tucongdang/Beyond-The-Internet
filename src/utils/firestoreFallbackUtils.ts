export enum FirestoreOperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreAuthUserLike {
  uid?: string | null;
  email?: string | null;
  emailVerified?: boolean | null;
  isAnonymous?: boolean | null;
  tenantId?: string | null;
  providerData?: Array<{
    providerId?: string | null;
    email?: string | null;
  }>;
}

export interface StructuredFirestoreErrorContext {
  error: string;
  operationType: FirestoreOperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo: Array<{
      providerId?: string | null;
      email?: string | null;
    }>;
  };
}

export type FirestoreWriteFallbackAction =
  | 'USE_FALLBACK_COLLECTION'
  | 'QUEUE_OFFLINE'
  | 'RETHROW';

export interface FallbackDecisionInput {
  error: unknown;
  offlineModeEnabled: boolean;
}

export interface FallbackDecision {
  action: FirestoreWriteFallbackAction;
  markDisconnected: boolean;
  permissionDenied: boolean;
}

export const CHAMPION_VOTE_PRIMARY_COLLECTION = 'champion_votes';
export const CONTESTANT_PREDICTION_PRIMARY_COLLECTION = 'contestant_predictions';

/**
 * Notifications subcollection segments (`notifications/{channel}/messages/{docId}`)
 * which are explicitly writable for live audience participation in deployed rules.
 */
export const CHAMPION_VOTE_FALLBACK_SEGMENTS = ['notifications', 'champion_votes', 'messages'] as const;
export const CONTESTANT_PREDICTION_FALLBACK_SEGMENTS = ['notifications', 'contestant_predictions', 'messages'] as const;

export function isPermissionDeniedError(err: unknown): boolean {
  if (!err) return false;
  const code = typeof (err as any)?.code === 'string' ? (err as any).code.toLowerCase() : '';
  if (code === 'permission-denied' || code.endsWith('/permission-denied')) {
    return true;
  }
  const message =
    err instanceof Error
      ? err.message
      : typeof (err as any)?.message === 'string'
      ? (err as any).message
      : String(err);

  return /insufficient permissions|permission[- ]denied|missing or insufficient/i.test(message);
}

export function isOfflineOrTransientNetworkError(err: unknown): boolean {
  if (!err || isPermissionDeniedError(err)) return false;
  const code = typeof (err as any)?.code === 'string' ? (err as any).code.toLowerCase() : '';
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'aborted') {
    return true;
  }
  const message =
    err instanceof Error
      ? err.message
      : typeof (err as any)?.message === 'string'
      ? (err as any).message
      : String(err);

  return /network|offline|timeout|unavailable|failed to fetch|client is offline|aborted/i.test(message);
}

export function decideFirestoreFallbackAction(input: FallbackDecisionInput): FallbackDecision {
  const permissionDenied = isPermissionDeniedError(input.error);
  if (permissionDenied) {
    return {
      action: 'USE_FALLBACK_COLLECTION',
      markDisconnected: false,
      permissionDenied: true,
    };
  }
  if (input.offlineModeEnabled) {
    return {
      action: 'QUEUE_OFFLINE',
      markDisconnected: true,
      permissionDenied: false,
    };
  }
  return {
    action: 'RETHROW',
    markDisconnected: true,
    permissionDenied: false,
  };
}

export function buildChampionVoteFallbackDocPath(uid: string): [string, string, string, string] {
  const safeUid = (uid || '').trim() || 'anon';
  return [
    CHAMPION_VOTE_FALLBACK_SEGMENTS[0],
    CHAMPION_VOTE_FALLBACK_SEGMENTS[1],
    CHAMPION_VOTE_FALLBACK_SEGMENTS[2],
    safeUid,
  ];
}

export function buildPredictionFallbackDocPath(
  questionId: string,
  uid: string
): [string, string, string, string] {
  const safeQId = (questionId || '').trim() || 'unknown_q';
  const safeUid = (uid || '').trim() || 'anon';
  return [
    CONTESTANT_PREDICTION_FALLBACK_SEGMENTS[0],
    CONTESTANT_PREDICTION_FALLBACK_SEGMENTS[1],
    CONTESTANT_PREDICTION_FALLBACK_SEGMENTS[2],
    `${safeQId}_${safeUid}`,
  ];
}

export function buildStructuredFirestoreErrorContext(
  error: unknown,
  operationType: FirestoreOperationType,
  path: string | null,
  authUser?: FirestoreAuthUserLike | null
): StructuredFirestoreErrorContext {
  return {
    error: error instanceof Error ? error.message : String(error),
    operationType,
    path,
    authInfo: {
      userId: authUser?.uid ?? null,
      email: authUser?.email ?? null,
      emailVerified: authUser?.emailVerified ?? null,
      isAnonymous: authUser?.isAnonymous ?? null,
      tenantId: authUser?.tenantId ?? null,
      providerInfo:
        authUser?.providerData?.map((provider) => ({
          providerId: provider.providerId ?? null,
          email: provider.email ?? null,
        })) || [],
    },
  };
}
