import { useEffect, useState } from 'react';
import { DEFAULT_GAME_STATE, syncService } from '../services/syncService';
import { GameState, UserResponse } from '../types';

export interface UseAdminSyncOptions {
  enabled?: boolean;
  role?: 'ADMIN' | 'PROJECTOR';
  initialGameState?: GameState;
}

export interface UseAdminSyncResult {
  gameState: GameState;
  currentResponses: Record<string, UserResponse>;
  allResponses: Record<string, Record<string, UserResponse>>;
  activeCount: number;
  isFirebaseConnected: boolean;
}

export function useAdminSync({
  enabled = true,
  role = 'ADMIN',
  initialGameState
}: UseAdminSyncOptions = {}): UseAdminSyncResult {
  const [gameState, setGameState] = useState<GameState>(() => initialGameState || syncService.getGameState() || DEFAULT_GAME_STATE);
  const [currentResponses, setCurrentResponses] = useState<Record<string, UserResponse>>({});
  const [allResponses, setAllResponses] = useState<Record<string, Record<string, UserResponse>>>({});
  const [activeCount, setActiveCount] = useState<number>(1);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState<boolean>(() => syncService.getIsFirebaseConnected());

  useEffect(() => {
    if (!enabled) {
      setCurrentResponses({});
      setAllResponses({});
      return;
    }

    syncService.setClientRole(role);

    const unsubState = syncService.subscribeToState((state, changedKeys) => {
      if (changedKeys && changedKeys.length === 0) return;
      setGameState(state);
    });

    const unsubResponses = syncService.subscribeToResponses((resps) => {
      setCurrentResponses(resps);
    });

    const unsubAllResponses = syncService.subscribeToAllResponses((all) => {
      setAllResponses(all);
    });

    const unsubPresence = syncService.subscribeToPresence((count) => {
      setActiveCount(count);
    });

    const unsubConnection = syncService.subscribeToConnection((connected) => {
      setIsFirebaseConnected(connected);
    });

    return () => {
      unsubState();
      unsubResponses();
      unsubAllResponses();
      unsubPresence();
      unsubConnection();
      setCurrentResponses({});
      setAllResponses({});
    };
  }, [enabled, role]);

  return {
    gameState,
    currentResponses,
    allResponses,
    activeCount,
    isFirebaseConnected
  };
}
