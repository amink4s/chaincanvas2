import { getOrCreateTodayGame, fetchGameState, query, ensureUser } from './_lib/db.js';
import { extractFidFromAuthHeader } from './_lib/auth.js';

const DEFAULT_SEED_IMAGE = 'https://picsum.photos/id/28/800/800';
const DEFAULT_SEED_PROMPT = 'A mysterious forest landscape';
const TURN_WINDOW_MINUTES = 30;

export default async function handler(req, res) {
  try {
    if (req.method !== 'GET') {
      return respond(res, 405, { error: 'Method Not Allowed' });
    }

    const callerFid = extractFidFromAuthHeader(req) || null;
    if (callerFid) {
      await ensureUser(callerFid);
    }

    const gameId = await getOrCreateTodayGame(
      DEFAULT_SEED_IMAGE,
      DEFAULT_SEED_PROMPT,
      callerFid
    );

    let state = await fetchGameState(gameId);
    if (!state) return respond(res, 500, { error: 'Failed to load state' });

    if (state.game.next_editor_fid == null && callerFid != null) {
      // Claim the turn: set next_editor_fid AND a new expiry timestamp
      await query`
        UPDATE games 
        SET next_editor_fid = ${callerFid}::bigint, 
            expiry_timestamp = NOW() + interval '30 minutes',
            updated_at = NOW() 
        WHERE id = ${gameId}::uuid AND next_editor_fid IS NULL
      `;
      state = await fetchGameState(gameId);
    }

    if (
      state.game.status === 'active' &&
      state.game.next_editor_fid != null && // Only check expiry if someone is editing
      state.game.expiry_timestamp &&
      new Date(state.game.expiry_timestamp).getTime() < Date.now()
    ) {
      // Release the turn if expired. 
      // IMPORTANT: Do NOT set expiry_timestamp to NULL, as that violates the check constraint.
      // Leaving it as the old timestamp is fine (it's still "expired").
      await query`
        UPDATE games
        SET next_editor_fid = NULL,
            updated_at = NOW()
        WHERE id = ${gameId}::uuid
      `;
      state = await fetchGameState(gameId);
    }

    return respond(res, 200, {
      gameId,
      game: state.game,
      turns: state.turns,
      callerFid
    });
  } catch (e) {
    console.error('[api/game-state] Unexpected error:', e?.message || e);
    return respond(res, 500, {
      error: 'Internal server error',
      detail: e?.message || String(e)
    });
  }
}

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}