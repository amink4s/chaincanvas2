import { useEffect, useState, useCallback } from 'react';

export interface ServerGameState {
  game: any;
  turns: any[];
  gameId: string;
}

export function useGameServer() {
  const [serverState, setServerState] = useState<ServerGameState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/game-state');
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Failed to load game state');
      }
      setServerState({
        game: data.game,
        turns: data.turns || [],
        gameId: data.gameId
      });
    } catch (e: any) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { serverState, loading, error, reload: load };
}