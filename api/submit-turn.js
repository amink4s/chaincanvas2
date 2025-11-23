import { fetchGameState, assertTurnPermission, insertTurnAndPass, ensureUser } from './_lib/db.js';
import { extractFidFromAuthHeader } from './_lib/auth.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return respond(res, 405, { error: 'Method Not Allowed' });
    }

    const callerFid = extractFidFromAuthHeader(req);
    if (!callerFid) {
      return respond(res, 401, { error: 'Unauthorized (missing or invalid token)' });
    }
    await ensureUser(callerFid);

    const body = req.body || {};
    const { gameId, passedToFid, prompt, imageDataUrl, ipfsCid } = body;

    if (!gameId || !passedToFid || !prompt || !imageDataUrl || !ipfsCid) {
      return respond(res, 400, {
        error: 'Missing required fields (gameId, passedToFid, prompt, imageDataUrl, ipfsCid)'
      });
    }

    await ensureUser(Number(passedToFid));

    await assertTurnPermission(gameId, callerFid);

    // Use IPFS gateway URL if available, otherwise fallback to data URL
    const finalImageUrl = ipfsCid ? `https://ipfs.io/ipfs/${ipfsCid}` : imageDataUrl;

    await insertTurnAndPass({
      gameId,
      editorFid: callerFid,
      passedToFid: Number(passedToFid),
      prompt,
      imageUrl: finalImageUrl,
      ipfsCid
    });

    const updated = await fetchGameState(gameId);
    return respond(res, 200, { ok: true, game: updated?.game, turns: updated?.turns });
  } catch (e) {
    console.error('[api/submit-turn] Unexpected error:', e?.message || e);
    return respond(res, 500, { error: 'Internal server error', detail: e?.message || String(e) });
  }
}

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}