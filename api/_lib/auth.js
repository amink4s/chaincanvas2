function base64UrlToBase64(segment) {
  let s = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad === 2) s += '==';
  else if (pad === 3) s += '=';
  else if (pad === 1) throw new Error('Invalid base64url segment length');
  return s;
}

function decodeBase64ToString(b64) {
  try {
    if (typeof atob === 'function') {
      const bin = atob(b64);
      const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
      return new TextDecoder().decode(bytes);
    }
  } catch { }
  return Buffer.from(b64, 'base64').toString('utf-8');
}

export function decodeQuickAuthJwt(jwt) {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = base64UrlToBase64(parts[1]);
    const json = decodeBase64ToString(payloadB64);
    return JSON.parse(json);
  } catch (e) {
    console.error('[auth] JWT decode error:', e?.message || e);
    return null;
  }
}

export function extractFidFromAuthHeader(req) {
  const auth = req.headers?.authorization || '';
  console.log('[auth] Header:', auth);
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    console.log('[auth] No Bearer match');
    return null;
  }
  const decoded = decodeQuickAuthJwt(m[1]);
  console.log('[auth] Decoded:', decoded);
  if (decoded?.sub && typeof decoded.sub === 'number') return decoded.sub;
  console.log('[auth] Invalid sub or type:', decoded?.sub);
  return null;
}