import { getOrCreateTodayGame, fetchGameState } from '../services/db';
import { extractFidFromAuthHeader } from '../services/auth';

const DEFAULT_SEED_IMAGE = 'https://picsum.photos/id/28/800/800';
const DEFAULT_SEED_PROMPT = 'A mysterious forest landscape';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'GET') {
      return respond(res, 405, { error: 'Method Not Allowed' });
    }

    const callerFid = extractFidFromAuthHeader(req) || null;

    const gameId = await getOrCreateTodayGame(
      DEFAULT_SEED_IMAGE,
      DEFAULT_SEED_PROMPT,
      callerFid
    );

    const state = await fetchGameState(gameId);
    if (!state) {
      return respond(res, 500, { error: 'Failed to load state' });
    }

    return respond(res, 200, {
      gameId,
      game: state.game,
      turns: state.turns,
      callerFid
    });
  } catch (e: any) {
    console.error('[api/game-state] Unexpected error:', e?.message || e);
    return respond(res, 500, {
      error: 'Internal server error',
      detail: e?.message || String(e)
    });
  }
}

function respond(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}