import { query } from './_lib/db.js';

export default async function handler(req, res) {
  try {
    const games = await query`SELECT id, next_editor_fid FROM games ORDER BY created_at DESC LIMIT 5`;
    const turns = await query`SELECT game_id, turn_number FROM turns ORDER BY created_at DESC LIMIT 5`;
    respond(res, 200, {
      ok: true,
      envPresent: !!(globalThis.process && globalThis.process.env && globalThis.process.env.DATABASE_URL),
      gamesSample: games,
      turnsSample: turns
    });
  } catch (e) {
    respond(res, 500, {
      ok: false,
      error: e?.message || String(e),
      envPresent: !!(globalThis.process && globalThis.process.env && globalThis.process.env.DATABASE_URL)
    });
  }
}

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}