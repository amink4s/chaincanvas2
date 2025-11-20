import { useEffect, useState } from 'react';
import { fetchUserProfile, FarcasterUserProfile } from '../services/farcaster';
// Try to import the SDK; if it fails, we'll rely on postMessage fallback.
let sdkRef: any = null;
try {
  // Some SDKs export init or createClient. Adjust if docs differ.
  // If this throws, we ignore and rely on window.farcaster.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@farcaster/miniapp-sdk');
  sdkRef = mod?.default || mod?.init?.() || mod;
} catch (e) {
  // Ignore; window.farcaster may still be injected by host
  console.warn('MiniApp SDK import failed (this may be ok inside host):', e);
}

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
  const [status, setStatus] = useState<'idle' | 'initializing' | 'signed-in' | 'error' | 'no-session'>('idle');
  const [debug, setDebug] = useState<string[]>([]);

  function log(msg: string) {
    setDebug(d => [...d.slice(-8), msg]);
  }

  useEffect(() => {
    async function init() {
      setStatus('initializing');
      log('Initializing QuickAuth');
      const fc = window.farcaster;
      if (!fc) {
        log('window.farcaster is undefined initially');
      }
      try {
        await fc?.actions?.ready?.();
        log('actions.ready called');
        await fc?.actions?.signIn?.();
        log('actions.signIn called');
      } catch (e) {
        log('Error calling ready/signIn: ' + (e as Error).message);
      }

      // Try immediate session read
      const immediateFid = fc?.session?.fid;
      if (immediateFid) {
        log('Immediate session fid: ' + immediateFid);
        setFid(immediateFid);
        setStatus('signed-in');
      } else {
        log('No immediate fid, attaching postMessage listener');
        // Listener for host messages
        const handler = (e: MessageEvent) => {
          if (e.data?.type === 'farcaster:session') {
            const postedFid = e.data?.data?.fid;
            log('Received farcaster:session message fid=' + postedFid);
            if (postedFid) {
              setFid(postedFid);
              setStatus('signed-in');
            }
          }
        };
        window.addEventListener('message', handler);

        // Fallback timeout after 3s
        setTimeout(() => {
          if (!fid) {
            log('Timeout waiting for session');
            setStatus('no-session');
          }
        }, 3000);
        return () => window.removeEventListener('message', handler);
      }
    }
    init();
  }, []);

  useEffect(() => {
    if (fid !== null && !profile) {
      log('Fetching profile for fid ' + fid);
      fetchUserProfile(fid).then(p => {
        if (p) {
          log('Profile loaded: ' + p.username);
          setProfile(p);
        } else {
          log('Profile fetch returned null');
        }
      });
    }
  }, [fid, profile]);

  return { fid, profile, status, debug };
}