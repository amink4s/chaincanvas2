import { neon } from '@neondatabase/serverless';

let sqlClient = null;

function getClient() {
  const env = (globalThis.process && globalThis.process.env) ? globalThis.process.env : {};
  const url = env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL not configured');
  }
  if (!sqlClient) {
    sqlClient = neon(url);
  }
  return sqlClient;
}

export async function query(strings, ...values) {
  const client = getClient();
  return await client(strings, ...values);
}

export async function getOrCreateTodayGame(seedImageUrl, seedPrompt, initialEditorFid) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await query`SELECT id FROM games WHERE day_date = ${today} LIMIT 1`;
  if (existing.length) return existing[0].id;
  const inserted = await query`
    INSERT INTO games (day_date, seed_image_url, seed_prompt, status, current_turn, max_turns, expiry_timestamp, next_editor_fid)
    VALUES (${today}, ${seedImageUrl}, ${seedPrompt}, 'active', 1, 10, NOW() + interval '30 minutes', ${initialEditorFid})
    RETURNING id
  `;
  return inserted[0].id;
}

export async function fetchGameState(gameId) {
  const gameRows = await query`SELECT * FROM games WHERE id = ${gameId} LIMIT 1`;
  if (!gameRows.length) return null;
  const turns = await query`SELECT * FROM turns WHERE game_id = ${gameId} ORDER BY turn_number ASC`;
  return { game: gameRows[0], turns };
}

export async function assertTurnPermission(gameId, fid) {
  const rows = await query`SELECT next_editor_fid, status FROM games WHERE id = ${gameId} LIMIT 1`;
  if (!rows.length) throw new Error('Game not found');
  const { next_editor_fid, status } = rows[0];
  if (status !== 'active') throw new Error('Game not active');
  if (next_editor_fid !== fid) throw new Error('Not your turn');
}

export async function insertTurnAndPass({ gameId, editorFid, passedToFid, prompt, imageUrl, veniceRequest, veniceResponse }) {
  const g = await query`SELECT current_turn, max_turns FROM games WHERE id = ${gameId} LIMIT 1`;
  if (!g.length) throw new Error('Game not found');
  const { current_turn, max_turns } = g[0];
  if (current_turn > max_turns) throw new Error('Game already completed');

  await query`
    INSERT INTO turns (game_id, turn_number, editor_fid, passed_to_fid, prompt_text, image_url,
                       venice_request_json, venice_response_json, state, created_at)
    VALUES (
      ${gameId}, ${current_turn}, ${editorFid}, ${passedToFid},
      ${prompt}, ${imageUrl},
      ${veniceRequest ? JSON.stringify(veniceRequest) : null},
      ${veniceResponse ? JSON.stringify(veniceResponse) : null},
      'finalized', NOW()
    )
  `;

  await query`
    UPDATE games
    SET current_turn = current_turn + 1,
        next_editor_fid = ${passedToFid},
        expiry_timestamp = NOW() + interval '30 minutes',
        updated_at = NOW()
    WHERE id = ${gameId}
  `;
}

export async function setTurnIpfs(gameId, turnNumber, cid) {
  await query`
    UPDATE turns SET ipfs_cid = ${cid}
    WHERE game_id = ${gameId} AND turn_number = ${turnNumber}
  `;
}