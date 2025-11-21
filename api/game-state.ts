// Returns game state JSON. Creates today's game if none exists (seed config could be dynamic).
import { getOrCreateTodayGame, fetchGameState } from '../services/db';

const DEFAULT_SEED_IMAGE = 'https://picsum.photos/id/28/800/800';
const DEFAULT_SEED_PROMPT = 'A mysterious forest landscape';

export default async function handler(req: any, res: any) {
  try {
    if (req.method === 'POST') {
      // Optionally allow forcing a new game (not implemented: just respond).
      return respond(res, 400, { error: 'POST not supported yet' });
    }

    const creatorFid = null; // In future pass authenticated fid.
    const gameId = await getOrCreateTodayGame(DEFAULT_SEED_IMAGE, DEFAULT_SEED_PROMPT, creatorFid);
    const state = await fetchGameState(gameId);
    if (!state) {
      return respond(res, 500, { error: 'Failed to load state after creation' });
    }
    return respond(res, 200, { gameId, ...state });
  } catch (e: any) {
    return respond(res, 500, { error: e?.message || 'Unknown error' });
  }
}

function respond(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}