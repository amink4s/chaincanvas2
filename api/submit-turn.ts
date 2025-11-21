// Finalize a turn and pass to next editor.
// POST { gameId, editorFid, passedToFid, prompt, imageDataUrl }
import { fetchGameState, insertTurn } from '../services/db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method Not Allowed' });
  }

  try {
    const body = req.body || {};
    const { gameId, editorFid, passedToFid, prompt, imageDataUrl } = body;

    if (!gameId || !editorFid || !prompt || !imageDataUrl) {
      return respond(res, 400, { error: 'Missing required fields (gameId, editorFid, prompt, imageDataUrl)' });
    }

    const state = await fetchGameState(gameId);
    if (!state) return respond(res, 404, { error: 'Game not found' });

    const turnNumber = state.game.current_turn;

    await insertTurn({
      gameId,
      turnNumber,
      editorFid: Number(editorFid),
      passedToFid: passedToFid ? Number(passedToFid) : null,
      prompt,
      imageUrl: imageDataUrl
    });

    const updated = await fetchGameState(gameId);
    return respond(res, 200, { ok: true, game: updated?.game, turns: updated?.turns });
  } catch (e: any) {
    return respond(res, 500, { error: e?.message || 'Unknown error' });
  }
}

function respond(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}