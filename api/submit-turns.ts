import { fetchGameState, assertTurnPermission, insertTurnAndPass } from '../services/db';
import { extractFidFromAuthHeader } from '../services/auth';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method Not Allowed' });
  }
  try {
    const callerFid = extractFidFromAuthHeader(req);
    if (!callerFid) return respond(res, 401, { error: 'Unauthorized (missing QuickAuth token)' });

    const body = req.body || {};
    const { gameId, passedToFid, prompt, imageDataUrl } = body;
    if (!gameId || !passedToFid || !prompt || !imageDataUrl) {
      return respond(res, 400, { error: 'Missing required fields (gameId, passedToFid, prompt, imageDataUrl)' });
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
    respond(res, 200, { ok: true, game: updated?.game, turns: updated?.turns });
  } catch (e: any) {
    respond(res, 500, { error: e?.message || 'Unknown error' });
  }
}

function respond(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}