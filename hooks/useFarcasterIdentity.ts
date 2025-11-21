import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import { decodeJwt } from '../services/jwt';
import { fetchUserProfile, FarcasterUserProfile } from '../services/farcaster';

type Status =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'token'
  | 'profile'
  | 'error';

export function useFarcasterIdentity() {
  const [status, setStatus] = useState<Status>('idle');
  const [fid, setFid] = useState<number | null>(null);
  const [profile, setProfile] = useState<FarcasterUserProfile | null>(null);
  const [attempts, setAttempts] = useState(0);

  useEffect(() => {
    async function init() {
      setStatus('initializing');
      try {
        await sdk.actions.ready();
        setStatus('ready');
      } catch {
        setStatus('error');
        return;
      }
      try {
        const { token } = await sdk.quickAuth.getToken();
        setStatus('token');
        const payload = decodeJwt(token);
        if (payload?.sub && typeof payload.sub === 'number') {
          setFid(payload.sub);
        } else {
          setStatus('error');
        }
      } catch {
        setStatus('error');
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (fid && (!profile || (profile.source !== 'neynar-single' && profile.source !== 'neynar-bulk'))) {
      // Fetch or retry until we get a definitive neynar source or reach attempt cap.
      fetchUserProfile(fid).then(p => {
        if (p) {
          setProfile(p);
          setStatus('profile');
        }
      });
    }
  }, [fid, attempts]);

  // Schedule auto-retry every 45s for up to 5 attempts if not a definitive neynar profile.
  useEffect(() => {
    if (!fid) return;
    if (attempts >= 5) return;
    if (profile && (profile.source === 'neynar-single' || profile.source === 'neynar-bulk')) return;
    const handle = setTimeout(() => setAttempts(a => a + 1), 45000);
    return () => clearTimeout(handle);
  }, [fid, profile, attempts]);

  return { status, fid, profile };
}