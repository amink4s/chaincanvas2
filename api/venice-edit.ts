// Venice Edit Proxy (Debug Enabled)
// Env vars: VENICE_API_KEY (required)
// Endpoint: https://api.venice.ai/api/v1/image/edit
//
// Client POST JSON: { prompt: string, imageUrl: string, debug?: boolean }
// Optional: send ?debug=1 in query
//
// On success: { imageUrl, meta }
// On failure: { error, status?, body?, meta }

export default async function handler(req: any, res: any) {
  const start = Date.now();

  // Only POST allowed
  if (req.method !== 'POST') {
    return respondJSON(res, 405, { error: 'Method Not Allowed' });
  }

  const VENICE_API_KEY = process.env.VENICE_API_KEY;
  if (!VENICE_API_KEY) {
    return respondJSON(res, 500, { error: 'Missing VENICE_API_KEY environment variable' });
  }

  // Parse body and flags
  const body = req.body || {};
  const prompt: string | undefined = body.prompt;
  const imageUrl: string | undefined = body.imageUrl;
  const debugFlag =
    body.debug === true ||
    req.query?.debug === '1' ||
    req.query?.debug === 'true';

  if (!prompt || typeof prompt !== 'string') {
    return respondJSON(res, 400, { error: 'Missing prompt' });
  }
  if (!imageUrl || typeof imageUrl !== 'string') {
    return respondJSON(res, 400, { error: 'Missing imageUrl (current image is required for edit)' });
  }

  const venicePayload = {
    prompt,
    image: imageUrl // Venice accepts URL or base64 here.
  };

  let upstreamResp: Response | null = null;
  let rawText = '';
  let parsed: any = null;
  let upstreamError: any = null;

  try {
    upstreamResp = await fetch('https://api.venice.ai/api/v1/image/edit', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify(venicePayload)
    });

    rawText = await upstreamResp.text();
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = null;
    }
  } catch (e: any) {
    upstreamError = e;
  }

  const durationMs = Date.now() - start;

  // If network / fetch failed
  if (upstreamError) {
    return respondJSON(res, 500, {
      error: 'Network error calling Venice',
      message: upstreamError?.message || String(upstreamError),
      meta: buildMeta(debugFlag, venicePayload, null, null, rawText, durationMs)
    });
  }

  if (!upstreamResp) {
    return respondJSON(res, 500, {
      error: 'Unknown upstream state (no response object)',
      meta: buildMeta(debugFlag, venicePayload, null, null, rawText, durationMs)
    });
  }

  // Upstream not OK
  if (!upstreamResp.ok) {
    return respondJSON(res, upstreamResp.status, {
      error: 'Venice upstream error',
      status: upstreamResp.status,
      body: rawText.slice(0, 1000),
      meta: buildMeta(debugFlag, venicePayload, upstreamResp, parsed, rawText, durationMs)
    });
  }

  // Attempt normalization
  let imageUrlResult: string | undefined;

  // Possible shapes
  if (typeof parsed?.image_url === 'string') imageUrlResult = parsed.image_url;
  else if (typeof parsed?.imageUrl === 'string') imageUrlResult = parsed.imageUrl;
  else if (typeof parsed?.url === 'string') imageUrlResult = parsed.url;
  else if (typeof parsed?.image === 'string') {
    // image may be URL or base64; detect:
    if (parsed.image.startsWith('http')) {
      imageUrlResult = parsed.image;
    } else if (parsed.image.length > 200) {
      imageUrlResult = `data:image/png;base64,${parsed.image}`;
    }
  } else if (Array.isArray(parsed?.images) && parsed.images[0]?.url) {
    imageUrlResult = parsed.images[0].url;
  } else if (parsed?.data && Array.isArray(parsed.data) && parsed.data[0]?.url) {
    imageUrlResult = parsed.data[0].url;
  }

  if (!imageUrlResult) {
    // Return debug dump
    return respondJSON(res, 502, {
      error: 'No usable image URL in Venice response',
      responseSnippet: rawText.slice(0, 1200),
      meta: buildMeta(debugFlag, venicePayload, upstreamResp, parsed, rawText, durationMs)
    });
  }

  return respondJSON(res, 200, {
    imageUrl: imageUrlResult,
    meta: buildMeta(debugFlag, venicePayload, upstreamResp, parsed, rawText, durationMs)
  });
}

function respondJSON(res: any, status: number, obj: any) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(obj));
}

function buildMeta(
  debugFlag: boolean,
  sentPayload: any,
  resp: Response | null,
  parsed: any,
  rawText: string,
  durationMs: number
) {
  if (!debugFlag) {
    return { durationMs };
  }
  const headersObj: Record<string, string> = {};
  if (resp) {
    resp.headers.forEach((v, k) => {
      headersObj[k] = v;
    });
  }
  return {
    durationMs,
    sentPayload,
    upstreamStatus: resp?.status,
    upstreamHeaders: headersObj,
    parsedKeys: parsed ? Object.keys(parsed) : null,
    rawLength: rawText.length,
    rawPreview: rawText.slice(0, 1200)
  };
}