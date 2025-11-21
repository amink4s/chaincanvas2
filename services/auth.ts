interface DecodedQuickAuth {
  sub?: number;
  [k: string]: any;
}

/**
 * Convert a base64url segment to standard base64 safely.
 */
function base64UrlToBase64(segment: string): string {
  let s = segment.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4;
  if (pad === 2) s += '==';
  else if (pad === 3) s += '=';
  else if (pad === 1) {
    // Invalid padding length
    throw new Error('Invalid base64url segment length');
  }
  return s;
}

export function decodeQuickAuthJwt(jwt: string): DecodedQuickAuth | null {
  try {
    const parts = jwt.split('.');
    if (parts.length !== 3) return null;
    const payloadB64 = base64UrlToBase64(parts[1]);
    const json = Buffer.from(payloadB64, 'base64').toString('utf-8');
    const payload = JSON.parse(json);
    return payload;
  } catch (e: any) {
    console.error('[auth] JWT decode error:', e?.message || e);
    return null;
  }
}

/**
 * Extract the fid (sub) from Authorization: Bearer <token>
 */
export function extractFidFromAuthHeader(req: any): number | null {
  try {
    const auth = req.headers?.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    const decoded = decodeQuickAuthJwt(m[1]);
    if (decoded?.sub && typeof decoded.sub === 'number') return decoded.sub;
    return null;
  } catch {
    return null;
  }
}