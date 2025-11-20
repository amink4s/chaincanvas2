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
  const [token, setToken] = useState<string | null>(null);
  const [fid, setFid] = useState<number | null>(null);
  const [profile, setProfile] = useState<FarcasterUserProfile | null>(null);
  const [debug, setDebug] = useState<string[]>([]);

  function log(msg: string) {
    setDebug(d => [...d.slice(-14), msg]);
  }

  useEffect(() => {
    async function init() {
      setStatus('initializing');
      log('init: calling sdk.actions.ready()');
      try {
        await sdk.actions.ready();
        setStatus('ready');
        log('ready acknowledged');
      } catch (e) {
        log('ready error: ' + (e as Error).message);
      }

      log('requesting quickAuth token');
      try {
        const { token } = await sdk.quickAuth.getToken();
        log('token received (length=' + token.length + ')');
        setToken(token);
        setStatus('token');
        const payload = decodeJwt(token);
        if (payload?.sub && typeof payload.sub === 'number') {
          setFid(payload.sub);
          log('decoded fid=' + payload.sub);
        } else {
          log('decode failed: no numeric sub');
        }
      } catch (e) {
        log('quickAuth error: ' + (e as Error).message);
        setStatus('error');
      }
    }

    init();
  }, []);

  useEffect(() => {
    if (fid && !profile) {
      log('fetching profile for fid=' + fid);
      fetchUserProfile(fid).then(p => {
        if (p) {
          setProfile(p);
          setStatus('profile');
          log('profile loaded username=' + p.username);
        } else {
          log('profile fetch returned null');
        }
      });
    }
  }, [fid, profile]);

  return { status, fid, token, profile, debug };
}