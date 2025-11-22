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
  console.log('[db] query:', strings, values);
  try {
    return await client(strings, ...values);
  } catch (e) {
    console.error('[db] query error:', e.message, 'Query:', strings, 'Values:', values);
    throw e;
  }
}

export async function ensureUser(fid, username = null, displayName = null, pfpUrl = null) {
  await query`
    INSERT INTO users (fid, username, display_name, pfp_url, last_seen_at, profile_last_refreshed_at, created_at, updated_at)
    VALUES (${fid}::bigint, ${username}::text, ${displayName}::text, ${pfpUrl}::text, NOW(), NOW(), NOW(), NOW())
    ON CONFLICT (fid) DO UPDATE
      SET username = COALESCE(EXCLUDED.username, users.username),
          display_name = COALESCE(EXCLUDED.display_name, users.display_name),
          pfp_url = COALESCE(EXCLUDED.pfp_url, users.pfp_url),
          last_seen_at = NOW(),
          profile_last_refreshed_at = NOW(),
          updated_at = NOW();
  `;
}

export async function getOrCreateTodayGame(seedImageUrl, seedPrompt, initialEditorFid) {
  const today = new Date().toISOString().slice(0, 10);
  const existing = await query`SELECT id FROM games WHERE day_date = ${today}::date LIMIT 1`;
  if (existing.length) return existing[0].id;

  const inserted = await query`
    INSERT INTO games (day_date, seed_image_url, seed_prompt, status, current_turn, max_turns,
                       expiry_timestamp, next_editor_fid)
    VALUES (${today}::date, ${seedImageUrl}::text, ${seedPrompt}::text, 'active', 1, 10,
            NOW() + interval '30 minutes', ${initialEditorFid}::bigint)
    RETURNING id
  `;
  return inserted[0].id;
}

export async function fetchGameState(gameId) {
  const gameRows = await query`SELECT * FROM games WHERE id = ${gameId}::uuid LIMIT 1`;
  if (!gameRows.length) return null;
  const turns = await query`
    SELECT * FROM turns WHERE game_id = ${gameId}::uuid ORDER BY turn_number ASC
  `;
  return { game: gameRows[0], turns };
}

export async function assertTurnPermission(gameId, fid) {
  const rows = await query`
    SELECT next_editor_fid, status, current_turn FROM games WHERE id = ${gameId}::uuid LIMIT 1
  `;
  if (!rows.length) throw new Error('Game not found');
  const { next_editor_fid, status, current_turn } = rows[0];
  if (status !== 'active') throw new Error('Game not active');
  // Allow initial editor if next_editor_fid still null and on first turn
  if (next_editor_fid == null && current_turn === 1) return;
  if (next_editor_fid == null) throw new Error('No editor assigned');
  if (String(next_editor_fid) !== String(fid)) throw new Error(`Not your turn (expected ${next_editor_fid}, got ${fid})`);
}

export async function insertTurnAndPass({ gameId, editorFid, passedToFid, prompt, imageUrl, ipfsCid = null }) {
  const g = await query`
    SELECT current_turn, max_turns FROM games WHERE id = ${gameId}::uuid LIMIT 1
  `;
  if (!g.length) throw new Error('Game not found');
  const { current_turn, max_turns } = g[0];
  if (current_turn > max_turns) throw new Error('Game already completed');

  await query`
    INSERT INTO turns (game_id, turn_number, editor_fid, passed_to_fid, prompt_text, image_url, ipfs_cid,
                       state, created_at)
    VALUES (${gameId}::uuid, ${current_turn}::smallint, ${editorFid}::bigint, ${passedToFid}::bigint, ${prompt}::text, ${imageUrl}::text, ${ipfsCid}::text,
            'finalized', NOW())
  `;

  await query`
    UPDATE games
    SET current_turn = current_turn + 1,
        next_editor_fid = ${passedToFid}::bigint,
        expiry_timestamp = NOW() + interval '30 minutes',
        updated_at = NOW()
    WHERE id = ${gameId}::uuid
  `;
}

export async function setTurnIpfs(gameId, turnNumber, cid) {
  await query`
    UPDATE turns SET ipfs_cid = ${cid}::text
    WHERE game_id = ${gameId}::uuid AND turn_number = ${turnNumber}::smallint
  `;
}