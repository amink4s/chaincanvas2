import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn('[DB] Missing DATABASE_URL environment variable');
}

const sql = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;

/**
 * Wrap SQL calls with basic error logging.
 */
export async function query<T = any>(strings: TemplateStringsArray, ...values: any[]): Promise<T[]> {
  if (!sql) throw new Error('DATABASE_URL not configured');
  try {
    const result = await sql(strings, ...values);
    return result as T[];
  } catch (e: any) {
    console.error('[DB] Query error:', e?.message || e);
    throw e;
  }
}

/**
 * Get or create today’s active game (one per day).
 * If no game exists for today, create seed row using provided seed image/prompt.
 */
export async function getOrCreateTodayGame(seedImageUrl: string, seedPrompt: string, creatorFid: number | null) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const existing = await query<{ id: string }>`
    SELECT id FROM games WHERE day_date = ${today} LIMIT 1
  `;
  if (existing.length) {
    return existing[0].id;
  }
  const inserted = await query<{ id: string }>`
    INSERT INTO games (day_date, seed_image_url, seed_prompt, creator_fid, status, current_turn, max_turns, expiry_timestamp)
    VALUES (${today}, ${seedImageUrl}, ${seedPrompt}, ${creatorFid}, 'active', 1, 10, NOW() + interval '30 minutes')
    RETURNING id
  `;
  return inserted[0].id;
}

/**
 * Fetch full game state (game + turns ordered).
 */
export async function fetchGameState(gameId: string) {
  const gameRows = await query<any>`SELECT * FROM games WHERE id = ${gameId} LIMIT 1`;
  if (!gameRows.length) return null;
  const turns = await query<any>`
    SELECT * FROM turns WHERE game_id = ${gameId} ORDER BY turn_number ASC
  `;
  return { game: gameRows[0], turns };
}

/**
 * Upsert user profile cache.
 */
export async function upsertUserProfile(fid: number, username: string | null, displayName: string | null, pfpUrl: string | null) {
  await query`
    INSERT INTO users (fid, username, display_name, pfp_url, last_seen_at, profile_last_refreshed_at)
    VALUES (${fid}, ${username}, ${displayName}, ${pfpUrl}, NOW(), NOW())
    ON CONFLICT (fid) DO UPDATE
      SET username = EXCLUDED.username,
          display_name = EXCLUDED.display_name,
          pfp_url = EXCLUDED.pfp_url,
          last_seen_at = NOW(),
          profile_last_refreshed_at = NOW(),
          updated_at = NOW()
  `;
}

/**
 * Insert a finalized turn.
 */
export async function insertTurn(params: {
  gameId: string;
  turnNumber: number;
  editorFid: number;
  passedToFid: number | null;
  prompt: string;
  imageUrl: string;
  venicePayload?: any;
  veniceResponse?: any;
}) {
  const { gameId, turnNumber, editorFid, passedToFid, prompt, imageUrl, venicePayload, veniceResponse } = params;
  await query`
    INSERT INTO turns (game_id, turn_number, editor_fid, passed_to_fid, prompt_text, image_url, venice_request_json, venice_response_json, state, created_at)
    VALUES (
      ${gameId}, ${turnNumber}, ${editorFid}, ${passedToFid},
      ${prompt}, ${imageUrl},
      ${venicePayload ? JSON.stringify(venicePayload) : null},
      ${veniceResponse ? JSON.stringify(veniceResponse) : null},
      'finalized', NOW()
    )
  `;
  // Advance game current_turn and set new expiry
  await query`
    UPDATE games
    SET current_turn = current_turn + 1,
        expiry_timestamp = NOW() + interval '30 minutes',
        updated_at = NOW()
    WHERE id = ${gameId}
  `;
}

/**
 * Update IPFS CID for a given game turn.
 */
export async function setTurnIpfs(gameId: string, turnNumber: number, cid: string) {
  await query`
    UPDATE turns
    SET ipfs_cid = ${cid}
    WHERE game_id = ${gameId} AND turn_number = ${turnNumber}
  `;
}