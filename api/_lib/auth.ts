interface DecodedQuickAuth {
  sub?: number;
  [k: string]: any;
}

function base64UrlToBase64(segment: string): string {
  let s = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad === 2) s += '==';
  else if (pad === 3) s += '=';
  else if (pad === 1) throw new Error('Invalid base64url segment length');
  return s;
}

function decodeBase64ToString(b64: string): string {
  try {
    if (typeof atob === 'function') {
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
  } catch {}
  // eslint-disable-next-line no-undef
  return Buffer.from(b64, 'base64').toString('utf-8');
}

export function decodeQuickAuthJwt(jwt: string): DecodedQuickAuth | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = base64UrlToBase64(parts[1]);
    const json = decodeBase64ToString(payloadB64);
    return JSON.parse(json);
  } catch (e: any) {
    console.error('[auth] JWT decode error:', e?.message || e);
    return null;
  }
}

export function extractFidFromAuthHeader(req: any): number | null {
  const auth = req.headers?.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;
  const decoded = decodeQuickAuthJwt(m[1]);
  if (decoded?.sub && typeof decoded.sub === 'number') return decoded.sub;
  return null;
}