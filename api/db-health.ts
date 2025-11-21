import { query } from '../services/db';

export default async function handler(req: any, res: any) {
  try {
    const games = await query<{ id: string; next_editor_fid: number | null }>`
      SELECT id, next_editor_fid FROM games ORDER BY created_at DESC LIMIT 5
    `;
    const turns = await query<{ game_id: string; turn_number: number }>`
      SELECT game_id, turn_number FROM turns ORDER BY created_at DESC LIMIT 5
    `;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: true,
      envPresent: !!((globalThis as any)?.process?.env?.DATABASE_URL),
      gamesSample: games,
      turnsSample: turns
    }));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      ok: false,
      error: e?.message || String(e),
      envPresent: !!((globalThis as any)?.process?.env?.DATABASE_URL)
    }));
  }
}