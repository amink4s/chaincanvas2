export interface FarcasterSession {
    fid: number;
    custodyAddress?: string;
    signerPublicKey?: string;
  }
  
  export interface FarcasterUserProfile {
    fid: number;
    username: string;
    pfpUrl: string;
  }
  
  export async function fetchUserProfile(fid: number): Promise<FarcasterUserProfile | null> {
    const apiKey = import.meta.env.VITE_NEYNAR_API_KEY;
    if (!apiKey) {
      console.warn("NEYNAR API key missing; user profile will be mocked.");
      return {
        fid,
        username: `fid_${fid}`,
        pfpUrl: "https://placehold.co/64x64?text=User"
      };
    }
  
    try {
      const resp = await fetch(`https://api.neynar.com/v2/farcaster/user?fid=${fid}`, {
        headers: { "api_key": apiKey }
      });
      if (!resp.ok) {
        console.error("Failed Neynar user fetch", resp.status);
        return null;
      }
      const data = await resp.json();
      return {
        fid,
        username: data?.result?.user?.username || `fid_${fid}`,
        pfpUrl: data?.result?.user?.pfp?.url || "https://placehold.co/64x64?text=User"
      };
    } catch (e) {
      console.error("Error fetching user profile", e);
      return null;
    }
  }