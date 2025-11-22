// Venice Edit Proxy (Binary-aware)
// Env: VENICE_API_KEY required.
// POST { prompt: string, imageUrl: string, debug?: boolean }
// Response:
//   { dataUrl: string, format: string, sizeBytes: number, meta: {...} }
// Optionally you can later auto-pin to IPFS (not done here to keep latency down).

export default async function handler(req: any, res: any) {
  const start = Date.now();

  if (req.method !== 'POST') {
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  const VENICE_API_KEY = process.env.VENICE_API_KEY;
  if (!VENICE_API_KEY) {
    return json(res, 500, { error: 'Missing VENICE_API_KEY' });
  }

  const body = req.body || {};
  const prompt: string | undefined = body.prompt;
  const imageUrl: string | undefined = body.imageUrl;
  const debugFlag = body.debug === true || req.query?.debug === '1';

  if (!prompt || typeof prompt !== 'string') {
    return json(res, 400, { error: 'Missing prompt' });
  }
  if (!imageUrl || typeof imageUrl !== 'string') {
    return json(res, 400, { error: 'Missing imageUrl' });
  }

  // Strip data URI prefix if present (Venice expects raw base64)
  let imageBase64 = imageUrl;
  if (imageUrl.startsWith('data:')) {
    const commaIdx = imageUrl.indexOf(',');
    if (commaIdx !== -1) {
      imageBase64 = imageUrl.slice(commaIdx + 1);
    }
  }

  const payload = {
    prompt,
    image: imageBase64
  };

  let upstreamResp: Response | null = null;
  let upstreamError: any = null;
  let arrayBuffer: ArrayBuffer | null = null;
  let textAttempt = '';
  let contentType = '';
  let status = 0;

  try {
    upstreamResp = await fetch('https://api.venice.ai/api/v1/image/edit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: '*/*'
      },
      body: JSON.stringify(payload)
    });
    status = upstreamResp.status;
    contentType = upstreamResp.headers.get('content-type') || '';
    // If image, read as binary. If not, read text for diagnostics.
    if (contentType.startsWith('image/')) {
      arrayBuffer = await upstreamResp.arrayBuffer();
    } else {
      textAttempt = await upstreamResp.text();
    }
  } catch (e: any) {
    upstreamError = e;
  }

  const durationMs = Date.now() - start;

  if (upstreamError) {
    return json(res, 500, {
      error: 'Network error',
      message: upstreamError?.message || String(upstreamError),
      meta: meta(debugFlag, payload, null, contentType, durationMs, status, textAttempt.length)
    });
  }

  if (!upstreamResp) {
    return json(res, 500, {
      error: 'No upstream response object',
      meta: meta(debugFlag, payload, null, contentType, durationMs, status, textAttempt.length)
    });
  }

  if (!upstreamResp.ok) {
    // Non-image error body already in textAttempt
    return json(res, status, {
      error: 'Venice upstream error',
      status,
      bodyPreview: textAttempt.slice(0, 1000),
      meta: meta(debugFlag, payload, upstreamResp.headers, contentType, durationMs, status, textAttempt.length)
    });
  }

  if (!arrayBuffer) {
    // Upstream responded OK but not with image bytes (unexpected)
    return json(res, 502, {
      error: 'Expected binary image but got non-binary response',
      contentType,
      bodyPreview: textAttempt.slice(0, 1000),
      meta: meta(debugFlag, payload, upstreamResp.headers, contentType, durationMs, status, textAttempt.length)
    });
  }

  // Convert binary to base64 data URL
  const uint8 = new Uint8Array(arrayBuffer);
  const base64 = Buffer.from(uint8).toString('base64');
  const format = contentType.split('/')[1] || 'png';
  const dataUrl = `data:${contentType};base64,${base64}`;

  return json(res, 200, {
    dataUrl,
    format,
    sizeBytes: uint8.byteLength,
    meta: meta(debugFlag, payload, upstreamResp.headers, contentType, durationMs, status, textAttempt.length)
  });
}

function json(res: any, status: number, obj: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function meta(
  debugFlag: boolean,
  sentPayload: any,
  headers: Headers | null,
  contentType: string,
  durationMs: number,
  status: number,
  textLen: number
) {
  if (!debugFlag) return { durationMs };
  const h: Record<string, string> = {};
  if (headers) {
    headers.forEach((v, k) => (h[k] = v));
  }
  return {
    durationMs,
    upstreamStatus: status,
    upstreamContentType: contentType,
    upstreamHeaders: h,
    sentPayload,
    nonImageBodyLength: textLen
  };
}