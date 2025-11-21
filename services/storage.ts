// Future DB integration stub.
// Provide functions to persist game and turn data after we add a database.
// For now these just log.

export interface TurnRecord {
    gameId: string;
    turnNumber: number;
    editorFid: number;
    prompt: string;
    imageDataUrl?: string;
    ipfsCid?: string;
    gatewayUrl?: string;
    createdAt: number;
  }
  
  export async function saveTurn(record: TurnRecord): Promise<void> {
    console.log('[DB Stub] saveTurn', record);
    // Implement: send POST to /api/turn or use direct DB client (Neon/Supabase).
  }
  
  export async function updateTurnIpfs(gameId: string, turnNumber: number, ipfsCid: string, gatewayUrl: string) {
    console.log('[DB Stub] updateTurnIpfs', { gameId, turnNumber, ipfsCid, gatewayUrl });
  }