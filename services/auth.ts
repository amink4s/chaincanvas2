interface DecodedQuickAuth {
    sub?: number;
    [k: string]: any;
  }
  
  export function decodeQuickAuthJwt(jwt: string): DecodedQuickAuth | null {
    try {
      const parts = jwt.split('.');
      if (parts.length !== 3) return null;
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
      return payload;
    } catch {
      return null;
    }
  }
  
  export function extractFidFromAuthHeader(req: any): number | null {
    const auth = req.headers?.authorization || '';
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;
    const decoded = decodeQuickAuthJwt(m[1]);
    if (!decoded?.sub || typeof decoded.sub !== 'number') return null;
    return decoded.sub;
  }