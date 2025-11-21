import { fetchGameState, assertTurnPermission, insertTurnAndPass } from './_lib/db';
import { extractFidFromAuthHeader } from './_lib/auth';

export default async function handler(req: any, res: any) {
  try {
    if (req.method !== 'POST') {
      return respond(res, 405, { error: 'Method Not Allowed' });
    }

    const callerFid = extractFidFromAuthHeader(req);
    if (!callerFid) {
      return respond(res, 401, { error: 'Unauthorized (missing or invalid token)' });
    }

    const body = req.body || {};
    const { gameId, passedToFid, prompt, imageDataUrl } = body;

    if (!gameId || !passedToFid || !prompt || !imageDataUrl) {
      return respond(res, 400, {
        error: 'Missing required fields (gameId, passedToFid, prompt, imageDataUrl)'
      });
    }

    await assertTurnPermission(gameId, callerFid);

    await insertTurnAndPass({
      gameId,
      editorFid: callerFid,
      passedToFid: Number(passedToFid),
      prompt,
      imageUrl: imageDataUrl
    });

    const updated = await fetchGameState(gameId);
    return respond(res, 200, { ok: true, game: updated?.game, turns: updated?.turns });
  } catch (e: any) {
    console.error('[api/submit-turn] Unexpected error:', e?.message || e);
    return respond(res, 500, { error: 'Internal server error', detail: e?.message || String(e) });
  }
}

function respond(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}