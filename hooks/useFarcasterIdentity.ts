import { useEffect, useState } from 'react';
import { fetchUserProfile, FarcasterUserProfile } from '../services/farcaster';

interface MiniAppSDK {
  actions: {
    ready: () => Promise<void> | void;
    signIn: () => Promise<void> | void;
  };
  session?: {
    fid?: number;
  };
}

declare global {
  interface Window {
    farcaster?: MiniAppSDK;
  }
}

export function useFarcasterIdentity() {
  const [fid, setFid] = useState<number | null>(null);
  const [profile, setProfile] = useState<FarcasterUserProfile | null>(null);
  const [status, setStatus] = useState<'idle' | 'initializing' | 'signed-in' | 'error'>('idle');

  useEffect(() => {
    async function init() {
      if (!window.farcaster) {
        console.warn("Farcaster SDK not found on window yet.");
      }
      setStatus('initializing');
      try {
        await window.farcaster?.actions.ready();
        await window.farcaster?.actions.signIn();
        // Attempt to read session immediately
        const currentFid = window.farcaster?.session?.fid;
        if (currentFid) {
          setFid(currentFid);
          setStatus('signed-in');
        } else {
            // Fallback: listen for postMessage events from host
            window.addEventListener('message', (e) => {
              if (e.data?.type === 'farcaster:session' && e.data?.data?.fid) {
                setFid(e.data.data.fid);
                setStatus('signed-in');
              }
            });
        }
      } catch (e) {
        console.error("Error during Farcaster QuickAuth init", e);
        setStatus('error');
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (fid !== null && !profile) {
      fetchUserProfile(fid).then(p => {
        if (p) setProfile(p);
      });
    }
  }, [fid, profile]);

  return { fid, profile, status };
}