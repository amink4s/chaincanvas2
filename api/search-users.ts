// Farcaster user search proxy using Neynar.
// GET /api/search-users?query=alice  -> [{ fid, username, displayName, pfpUrl }]
// Env: NEYNAR_API_KEY (or change below to use VITE_NEYNAR_API_KEY)
const API_KEY = process.env.NEYNAR_API_KEY || process.env.VITE_NEYNAR_API_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return respond(res, 405, { error: 'Method Not Allowed' });
  }
  if (!API_KEY) {
    return respond(res, 500, { error: 'Missing NEYNAR_API_KEY' });
  }

  const q = (req.query?.query || '').trim();
  if (!q) {
    return respond(res, 200, { results: [] });
  }

  try {
    // Neynar user search endpoint (adjust if docs change)
    // Example (Neynar v2): /v2/farcaster/user/search?q=<query>&limit=5
    const url = `https://api.neynar.com/v2/farcaster/user/search?q=${encodeURIComponent(q)}&limit=7`;
    const upstream = await fetch(url, {
      headers: {
        'api_key': API_KEY,
        'accept': 'application/json'
      }
    });

    if (!upstream.ok) {
      const text = await upstream.text().catch(() => '');
      return respond(res, upstream.status, {
        error: 'Neynar upstream error',
        status: upstream.status,
        body: text.slice(0, 400)
      });
    }

    const data = await upstream.json();
    // Data shape expected: { result: { users: [ { fid, username, displayName, pfp: { url }} ] } }
    const users = data?.result?.users || [];
    const results = users.map((u: any) => ({
      fid: u?.fid,
      username: u?.username?.replace(/^@/, ''),
      displayName: u?.displayName || null,
      pfpUrl: u?.pfp?.url || null
    })).filter((u: any) => u.fid && u.username);

    return respond(res, 200, { results });
  } catch (e: any) {
    return respond(res, 500, { error: e?.message || 'Search failure' });
  }
}

function respond(res: any, status: number, body: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}