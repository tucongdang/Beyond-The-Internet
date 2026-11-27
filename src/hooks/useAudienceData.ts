import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, removeUndefined } from '../firebase';
import { syncService } from '../services/syncService';
import { UserInfo, UserResponse } from '../types';
import { setSecureItem, getSecureItem } from '../utils/secureStorage';
import { generate12DigitUID } from '../utils/uidUtils';

export interface UseAudienceDataOptions {
  user: UserInfo | null;
  enabled?: boolean;
  onUserSynced?: (updatedUser: UserInfo) => void;
}

export interface UseAudienceDataResult {
  responses: Record<string, UserResponse>;
  allResponses: Record<string, Record<string, UserResponse>>;
}

export function useAudienceData({
  user,
  enabled = true,
  onUserSynced
}: UseAudienceDataOptions): UseAudienceDataResult {
  const [responses, setResponses] = useState<Record<string, UserResponse>>({});
  const [allResponses, setAllResponses] = useState<Record<string, Record<string, UserResponse>>>({});

  const onUserSyncedRef = useRef(onUserSynced);
  onUserSyncedRef.current = onUserSynced;

  const userUid = user?.uid || null;

  // 1. Subscribe to audience-scoped responses and full response map in syncService
  useEffect(() => {
    if (!enabled) {
      setResponses({});
      setAllResponses({});
      return;
    }

    syncService.setClientRole('AUDIENCE');
    syncService.setAudienceUserId(userUid);

    const unsubResponses = syncService.subscribeToResponses((nextResponses) => {
      setResponses(nextResponses);
    });

    const unsubAllResponses = syncService.subscribeToAllResponses((nextAllResponses) => {
      setAllResponses(nextAllResponses);
    });

    return () => {
      unsubResponses();
      unsubAllResponses();
      syncService.setAudienceUserId(null);
      setResponses({});
      setAllResponses({});
    };
  }, [enabled, userUid]);

  // 2. Audience Firebase Auth & Firestore users/{uid} real-time profile synchronization
  useEffect(() => {
    if (!enabled || !auth || !userUid) return;

    let isCancelled = false;
    let unsubsDoc: (() => void) | null = null;
    let unsubscribeAuth: (() => void) | null = null;

    try {
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (unsubsDoc) {
          unsubsDoc();
          unsubsDoc = null;
        }
        if (isCancelled || !firebaseUser) return;

        const saved = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
        if (!saved || saved.uid !== firebaseUser.uid) return;

        const localProfile: UserInfo = { ...saved };
        if (!localProfile.anonymizedUid || localProfile.anonymizedUid.length !== 12) {
          localProfile.anonymizedUid = generate12DigitUID(
            localProfile.name || '',
            localProfile.mssv || '',
            localProfile.gender || '1',
            localProfile.birthYear || '2004'
          );
          setSecureItem('BTI2026_USER_PROFILE', localProfile);
          onUserSyncedRef.current?.(localProfile);
          try {
            await setDoc(doc(db, 'users', localProfile.uid), removeUndefined(localProfile), { merge: true });
          } catch (err) {
            console.error(
              'Firestore Error:',
              JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
                operationType: 'write',
                path: `users/${localProfile.uid}`,
                uid: firebaseUser.uid
              })
            );
          }
        }

        if (isCancelled) return;

        unsubsDoc = onSnapshot(
          doc(db, 'users', firebaseUser.uid),
          (docSnap) => {
            if (!docSnap.exists()) return;
            const profile = docSnap.data() as UserInfo;
            const currentSaved = getSecureItem<UserInfo>('BTI2026_USER_PROFILE');
            if (!currentSaved || JSON.stringify(currentSaved) !== JSON.stringify(profile)) {
              setSecureItem('BTI2026_USER_PROFILE', profile);
              onUserSyncedRef.current?.(profile);
            }
          },
          (err) => {
            console.warn(
              'Firestore user profile listener error:',
              JSON.stringify({
                error: err instanceof Error ? err.message : String(err),
                operationType: 'get',
                path: `users/${firebaseUser.uid}`,
                uid: firebaseUser.uid
              })
            );
          }
        );
      });
    } catch (err) {
      console.warn('[useAudienceData] onAuthStateChanged initialization error:', err);
    }

    return () => {
      isCancelled = true;
      if (unsubscribeAuth) unsubscribeAuth();
      if (unsubsDoc) unsubsDoc();
    };
  }, [enabled, userUid]);

  // 3. Audience presence heartbeat while AudienceView is active
  useEffect(() => {
    if (!enabled || !user) return;

    syncService.sendPresencePing(user);

    const interval = setInterval(() => {
      if (typeof document === 'undefined' || !document.hidden) {
        syncService.sendPresencePing(user);
      }
    }, 15000);

    const handleVisibility = () => {
      if (typeof document !== 'undefined' && !document.hidden) {
        syncService.sendPresencePing(user);
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }

    return () => {
      clearInterval(interval);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibility);
      }
    };
  }, [enabled, user]);

  return { responses, allResponses };
}
