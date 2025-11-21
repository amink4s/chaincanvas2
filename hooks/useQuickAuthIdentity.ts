import { useEffect, useState } from 'react';

// Minimal JWT decode (payload only)
function decodeJwtSub(jwt: string): number | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(parts[1].length + (4 - (parts[1].length % 4)) % 4, '=');
    const json = atob(payload);
    const data = JSON.parse(json);
    if (typeof data.sub === 'number') return data.sub;
    if (typeof data.sub === 'string') {
      const n = Number(data.sub);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

export function useQuickAuthIdentity() {
  const [fid, setFid] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Replace this with REAL quick auth API / miniapp SDK call.
        // Example placeholder: fetch token from a local route or SDK.
        // const jwt = await sdk.auth.getQuickAuthToken(); // If SDK supports it
        const resp = await fetch('/api/debug-quickauth-token'); // temporary stub endpoint
        if (!resp.ok) throw new Error('Failed to get quickauth token');
        const { token: jwt } = await resp.json();
        const sub = decodeJwtSub(jwt);
        if (!sub) throw new Error('Invalid JWT sub');
        if (cancelled) return;
        setToken(jwt);
        setFid(sub);
        // Set globals for existing code
        (window as any).QUICKAUTH_TOKEN = jwt;
        (window as any).CURRENT_FID = sub;
        // Notify listeners (GamePrototype listens for this)
        window.dispatchEvent(new Event('quickauth-ready'));
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'QuickAuth init failed');
      }
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return { fid, token, error };
}