// Helper function to fetch user profiles from Neynar
const NEYNAR_API_KEY = process.env.NEYNAR_API_KEY || process.env.VITE_NEYNAR_API_KEY;

/**
 * Fetch user profiles from Neynar by FIDs
 * @param {number[]} fids - Array of FIDs to fetch
 * @returns {Promise<Map<number, {username: string, displayName: string, pfpUrl: string}>>}
 */
export async function fetchNeynarProfiles(fids) {
    if (!fids || fids.length === 0) return new Map();

    if (!NEYNAR_API_KEY) {
        console.warn('[neynar] Missing NEYNAR_API_KEY, skipping profile fetch');
        return new Map();
    }

    try {
        const fidsParam = fids.join(',');
        const url = `https://api.neynar.com/v2/farcaster/user/bulk?fids=${fidsParam}`;

        const response = await fetch(url, {
            headers: {
                'accept': 'application/json',
                'api_key': NEYNAR_API_KEY
            }
        });

        if (!response.ok) {
            console.error('[neynar] Failed to fetch profiles:', response.status, response.statusText);
            return new Map();
        }

        const data = await response.json();
        const profileMap = new Map();

        if (data.users && Array.isArray(data.users)) {
            for (const user of data.users) {
                profileMap.set(user.fid, {
                    username: user.username || null,
                    displayName: user.display_name || user.displayName || null,
                    pfpUrl: user.pfp_url || user.pfp?.url || null
                });
            }
        }

        return profileMap;
    } catch (error) {
        console.error('[neynar] Error fetching profiles:', error.message || error);
        return new Map();
    }
}
