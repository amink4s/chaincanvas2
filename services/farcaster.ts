export interface FarcasterUserProfile {
  fid: number;
  username: string;
  pfpUrl: string;
}

function placeholder(fid: number): FarcasterUserProfile {
  return {
    fid,
    username: `fid_${fid}`,
    pfpUrl: 'https://placehold.co/64x64?text=User'
  };
}

/**
 * Attempts to fetch a user profile from Neynar.
 * Strategy:
 * 1. Single endpoint: /v2/farcaster/user?fid=FID
 * 2. If 404, fallback to bulk endpoint: /v2/farcaster/users?fids=FID
 * 3. Retry once after short delay if still not found.
 */
export async function fetchUserProfile(fid: number): Promise<FarcasterUserProfile | null> {
  const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
  if (!apiKey) {
    console.warn('Neynar API key missing; returning placeholder profile.');
    return placeholder(fid);
  }

  async function trySingle(): Promise<FarcasterUserProfile | null> {
    const url = `https://api.neynar.com/v2/farcaster/user?fid=${fid}`;
    try {
      const resp = await fetch(url, { headers: { api_key: apiKey, accept: 'application/json' } });
      if (!resp.ok) {
        console.warn('Single user endpoint status', resp.status);
        if (resp.status === 404) return null;
        return placeholder(fid);
      }
      const data = await resp.json();
      const user = data?.result?.user;
      if (!user) return null;
      return normalizeUser(fid, user);
    } catch (e) {
      console.error('Single user fetch error', e);
      return null;
    }
  }

  async function tryBulk(): Promise<FarcasterUserProfile | null> {
    const url = `https://api.neynar.com/v2/farcaster/users?fids=${fid}`;
    try {
      const resp = await fetch(url, { headers: { api_key: apiKey, accept: 'application/json' } });
      if (!resp.ok) {
        console.warn('Bulk users endpoint status', resp.status);
        if (resp.status === 404) return null;
        return placeholder(fid);
      }
      const data = await resp.json();
      const users = data?.result?.users;
      const user = Array.isArray(users) ? users.find((u: any) => Number(u?.fid) === fid) : null;
      if (!user) return null;
      return normalizeUser(fid, user);
    } catch (e) {
      console.error('Bulk user fetch error', e);
      return null;
    }
  }

  // First attempt: single
  let profile = await trySingle();
  if (!profile) {
    // Fallback: bulk
    profile = await tryBulk();
  }
  if (!profile) {
    // Retry once after short delay
    await new Promise(r => setTimeout(r, 800));
    profile = await trySingle() || await tryBulk();
  }

  return profile || placeholder(fid);
}

function normalizeUser(fid: number, user: any): FarcasterUserProfile {
  const rawUsername = user?.username || `fid_${fid}`;
  const cleanedUsername = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
  const pfpUrl =
    user?.pfp?.url && typeof user.pfp.url === 'string' && user.pfp.url.trim() !== ''
      ? user.pfp.url
      : 'https://placehold.co/64x64?text=User';
  return {
    fid,
    username: cleanedUsername,
    pfpUrl
  };
}