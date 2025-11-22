import { query, fetchGameState, ensureUser } from './_lib/db.js';
import { extractFidFromAuthHeader } from './_lib/auth.js';

const TURN_WINDOW_MINUTES = 30;

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return respond(res, 405, { error: 'Method Not Allowed' });
    }

    const callerFid = extractFidFromAuthHeader(req);
    if (!callerFid) {
      return respond(res, 401, { error: 'Unauthorized (missing token)' });
    }
    await ensureUser(callerFid);

    const body = req.body || {};
    const { gameId } = body;
    if (!gameId) return respond(res, 400, { error: 'Missing gameId' });

    const gameRows = await query`SELECT id, next_editor_fid, expiry_timestamp, status FROM games WHERE id = ${gameId} LIMIT 1`;
    if (!gameRows.length) return respond(res, 404, { error: 'Game not found' });

    const game = gameRows[0];
    if (game.status !== 'active') return respond(res, 400, { error: 'Game not active' });

    const expired = game.expiry_timestamp && new Date(game.expiry_timestamp).getTime() < Date.now();
    if (!expired) {
      return respond(res, 400, { error: 'Turn not expired yet' });
    }

    // Claim turn
    await query`
      UPDATE games
      SET next_editor_fid = ${callerFid},
          expiry_timestamp = NOW() + interval '${TURN_WINDOW_MINUTES} minutes',
          updated_at = NOW()
      WHERE id = ${gameId}
    `;

    const updated = await fetchGameState(gameId);
    return respond(res, 200, { ok: true, game: updated?.game, turns: updated?.turns });
  } catch (e) {
    console.error('[api/claim-turn] Unexpected error:', e?.message || e);
    return respond(res, 500, { error: 'Internal server error', detail: e?.message || String(e) });
  }
}

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}