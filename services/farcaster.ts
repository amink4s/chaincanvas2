export interface FarcasterUserProfile {
  fid: number;
  username: string;
  pfpUrl: string;
  source: string;
}

const PLACEHOLDER_PFP = 'https://placehold.co/64x64?text=User';

function placeholder(fid: number, reason: string): FarcasterUserProfile {
  return {
    fid,
    username: `fid_${fid}`,
    pfpUrl: PLACEHOLDER_PFP,
    source: reason
  };
}

function warpcastAvatar(fid: number, size = 64) {
  return `https://warpcast.com/~/avatar?fid=${fid}&height=${size}&width=${size}`;
}

/**
 * Primary fetch: Neynar, fallback: Searchcaster, fallback avatar only (Warpcast).
 * Includes optional retry logic – caller can invoke again later.
 */
export async function fetchUserProfile(fid: number): Promise<FarcasterUserProfile | null> {
  const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
  // Try Neynar if key present
  if (apiKey) {
    const neynar = await tryNeynar(fid, apiKey);
    if (neynar) return neynar;
  }

  // Fallback: Searchcaster
  const sc = await trySearchcaster(fid);
  if (sc) return sc;

  // Final fallback: Warpcast avatar only
  return {
    fid,
    username: `fid_${fid}`,
    pfpUrl: warpcastAvatar(fid),
    source: 'warpcast-avatar-fallback'
  };
}

async function tryNeynar(fid: number, apiKey: string): Promise<FarcasterUserProfile | null> {
  const singleUrl = `https://api.neynar.com/v2/farcaster/user?fid=${fid}`;
  try {
    const resp = await fetch(singleUrl, { headers: { api_key: apiKey, accept: 'application/json' } });
    if (resp.status === 404) {
      console.warn('Neynar single 404 for fid', fid);
      // Try bulk before giving up
      const bulkUrl = `https://api.neynar.com/v2/farcaster/users?fids=${fid}`;
      const bulkResp = await fetch(bulkUrl, { headers: { api_key: apiKey, accept: 'application/json' } });
      if (!bulkResp.ok) {
        console.warn('Neynar bulk status', bulkResp.status);
        return null;
      }
      const bulkData = await bulkResp.json();
      const users = bulkData?.result?.users;
      const user = Array.isArray(users) ? users.find((u: any) => Number(u?.fid) === fid) : null;
      if (!user) return null;
      return normalizeUser(fid, user, 'neynar-bulk');
    }
    if (!resp.ok) {
      console.warn('Neynar single non-OK status', resp.status);
      return null;
    }
    const data = await resp.json();
    const user = data?.result?.user;
    if (!user) return null;
    return normalizeUser(fid, user, 'neynar-single');
  } catch (e) {
    console.error('Neynar fetch error', e);
    return null;
  }
}

async function trySearchcaster(fid: number): Promise<FarcasterUserProfile | null> {
  const url = `https://searchcaster.xyz/api/profiles?fid=${fid}`;
  try {
    const resp = await fetch(url, { headers: { accept: 'application/json' } });
    if (resp.status === 404) {
      console.warn('Searchcaster 404 for fid', fid);
      return null;
    }
    if (!resp.ok) {
      console.warn('Searchcaster status', resp.status);
      return null;
    }
    const data = await resp.json();
    const user = Array.isArray(data) ? data.find((u: any) => Number(u?.fid) === fid) : null;
    if (!user) return null;
    const username = user?.username || user?.displayName || `fid_${fid}`;
    const cleaned = username.startsWith('@') ? username.slice(1) : username;
    const pfpUrl = (user?.pfp?.url && user.pfp.url.trim() !== '')
      ? user.pfp.url
      : warpcastAvatar(fid);
    return {
      fid,
      username: cleaned,
      pfpUrl,
      source: 'searchcaster'
    };
  } catch (e) {
    console.error('Searchcaster fetch error', e);
    return null;
  }
}

function normalizeUser(fid: number, user: any, source: string): FarcasterUserProfile {
  const rawUsername = user?.username || `fid_${fid}`;
  const cleanedUsername = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  // Prefer provided avatar, fallback to warpcast avatar which often works even if indexing lag
  const pfpUrl =
    user?.pfp?.url && typeof user.pfp.url === 'string' && user.pfp.url.trim() !== ''
      ? user.pfp.url
      : warpcastAvatar(fid);
  return {
    fid,
    username: cleanedUsername,
    pfpUrl,
    source
  };
}