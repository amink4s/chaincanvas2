// Cache Farcaster user profile.
// POST { fid, username?, displayName?, pfpUrl? }

import { upsertUserProfile } from '../services/db';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return respond(res, 405, { error: 'Method Not Allowed' });
  }
  try {
    const { fid, username, displayName, pfpUrl } = req.body || {};
    if (!fid) return respond(res, 400, { error: 'fid required' });

    await upsertUserProfile(Number(fid), username || null, displayName || null, pfpUrl || null);
    return respond(res, 200, { ok: true });
  } catch (e: any) {
    return respond(res, 500, { error: e?.message || 'Unknown error' });
  }
}

function respond(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}