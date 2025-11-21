export interface FarcasterUserProfile {
  fid: number;
  username: string;
  displayName?: string;
  pfpUrl: string;
  source: string;
}

const PLACEHOLDER_PFP = 'https://placehold.co/64x64?text=User';

function warpcastAvatar(fid: number, size = 64) {
  return `https://warpcast.com/~/avatar?fid=${fid}&height=${size}&width=${size}`;
}

// Simple in-memory cache for this session
const profileCache = new Map<number, FarcasterUserProfile>();

export async function fetchUserProfile(fid: number): Promise<FarcasterUserProfile | null> {
  if (profileCache.has(fid)) {
    return profileCache.get(fid)!;
  }

  const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
  if (!apiKey) {
    const mock = {
      fid,
      username: `fid_${fid}`,
      pfpUrl: PLACEHOLDER_PFP,
      source: 'no-api-key'
    };
    profileCache.set(fid, mock);
    return mock;
  }

  // Fetch all user data messages for this fid
  const url = `https://snapchain-api.neynar.com/v1/userDataByFid?fid=${fid}&pageSize=100`;
  let json: any;
  try {
    const resp = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        'accept': 'application/json'
      }
    });
    if (!resp.ok) {
      // If truly not found or temporary issue, fallback
      console.warn('userDataByFid status', resp.status);
      const fallback = {
        fid,
        username: `fid_${fid}`,
        pfpUrl: warpcastAvatar(fid),
        source: `status-${resp.status}-fallback`
      };
      profileCache.set(fid, fallback);
      return fallback;
    }
    json = await resp.json();
  } catch (e) {
    console.error('Error fetching userDataByFid', e);
    const fallback = {
      fid,
      username: `fid_${fid}`,
      pfpUrl: warpcastAvatar(fid),
      source: 'network-error-fallback'
    };
    profileCache.set(fid, fallback);
    return fallback;
  }

  // The response can be either:
  // 1) Single object with hash + data (if user_data_type was passed) OR
  // 2) Paginated { messages: [...], nextPageToken: ... }
  let messages: any[] = [];
  if (Array.isArray(json?.messages)) {
    messages = json.messages;
  } else if (json?.data?.userDataBody) {
    messages = [json]; // Single message mode
  }

  const byType: Record<string, string> = {};
  for (const m of messages) {
    const type = m?.data?.userDataBody?.type;
    const value = m?.data?.userDataBody?.value;
    if (type && typeof value === 'string' && value.trim() !== '') {
      byType[type] = value.trim();
    }
  }

  // Username preference
  const usernameRaw =
    byType['USER_DATA_TYPE_USERNAME'] ||
    byType['USER_DATA_TYPE_DISPLAY'] ||
    `fid_${fid}`;

  const cleanedUsername = usernameRaw.startsWith('@')
    ? usernameRaw.slice(1)
    : usernameRaw;

  // PFP preference
  let pfpUrl = byType['USER_DATA_TYPE_PFP'] || warpcastAvatar(fid);
  if (!pfpUrl || pfpUrl.trim() === '') {
    pfpUrl = warpcastAvatar(fid);
  }

  const profile: FarcasterUserProfile = {
    fid,
    username: cleanedUsername,
    displayName: byType['USER_DATA_TYPE_DISPLAY'],
    pfpUrl,
    source: 'userDataByFid'
  };

  profileCache.set(fid, profile);
  return profile;
}