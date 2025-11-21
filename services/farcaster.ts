export interface FarcasterUserProfile {
  fid: number;
  username: string;
  pfpUrl: string;
}

export async function fetchUserProfile(fid: number): Promise<FarcasterUserProfile | null> {
  const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
  if (!apiKey) {
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
      return {
        fid,
        username: `fid_${fid}`,
        pfpUrl: 'https://placehold.co/64x64?text=User'
      };
    }
    const data = await resp.json();
    const user = data?.result?.user;
    const rawUsername = user?.username || `fid_${fid}`;
    const cleanedUsername = rawUsername.startsWith('@') ? rawUsername.slice(1) : rawUsername;
    const pfp = user?.pfp?.url && user.pfp.url.trim() !== '' 
      ? user.pfp.url 
      : 'https://placehold.co/64x64?text=User';
    return {
      fid,
      username: cleanedUsername,
      pfpUrl: pfp
    };
  } catch (e) {
    console.error('Profile fetch error', e);
    return {
      fid,
      username: `fid_${fid}`,
      pfpUrl: 'https://placehold.co/64x64?text=User'
    };
  }
}