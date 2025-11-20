// Lightweight JWT payload decoder (no signature verification here).
export interface DecodedJwtPayload {
    sub?: number;
    iss?: string;
    exp?: number;
    iat?: number;
    aud?: string;
    [k: string]: any;
  }
  
  export function decodeJwt(token: string): DecodedJwtPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payloadB64 = parts[1]
        .replace(/-/g, '+')
        .replace(/_/g, '/');
      const json = atob(payloadB64);
      const obj = JSON.parse(json);
      // Convert sub to number if possible
      if (typeof obj.sub === 'string') {
        const maybeNum = Number(obj.sub);
        if (!Number.isNaN(maybeNum)) obj.sub = maybeNum;
      }
      return obj;
    } catch {
      return null;
    }
  }