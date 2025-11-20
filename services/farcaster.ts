export interface FarcasterUserProfile {
  fid: number;
  username: string;
  pfpUrl: string;
}

export async function fetchUserProfile(fid: number): Promise<FarcasterUserProfile | null> {
  const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
  if (!apiKey) {
    // Mock profile if Neynar key missing
    return {
      fid,
      username: `fid_${fid}`,
      pfpUrl: 'https://placehold.co/64x64?text=User'
    };
  }
  try {
    const resp = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
      headers: { api_key: apiKey }
    });
    if (!resp.ok) {
      console.error('Neynar user fetch failed', resp.status);
      return null;
    }
    const data = await resp.json();
    const user = data?.result?.user;
    return {
      fid,
      username: user?.username || `fid_${fid}`,
      pfpUrl: user?.pfp?.url || 'https://placehold.co/64x64?text=User'
    };
  } catch (e) {
    console.error('Profile fetch error', e);
    return null;
  }
}