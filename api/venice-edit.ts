// Venice Edit Proxy
// Environment: VENICE_API_KEY must be set.
// Endpoint used: https://api.venice.ai/api/v1/image/edit
// Request body (client): { prompt: string, imageUrl?: string }
// Response (client): { imageUrl: string }

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method Not Allowed' }));
    return;
  }

  const VENICE_API_KEY = process.env.VENICE_API_KEY;
  if (!VENICE_API_KEY) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing VENICE_API_KEY environment variable' }));
    return;
  }

  // Body may already be parsed by Vercel; fallback if not.
  const body = req.body || {};
  const prompt: string | undefined = body.prompt;
  const imageUrl: string | undefined = body.imageUrl;

  if (!prompt || typeof prompt !== 'string') {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing prompt' }));
    return;
  }

  // Prepare Venice payload.
  // If imageUrl absent, you could send a base64 seed or reject.
  const venicePayload: Record<string, any> = { prompt };
  if (imageUrl && typeof imageUrl === 'string') {
    venicePayload.image = imageUrl; // Venice expects key "image"
  } else {
    // You can decide to enforce having a prior image, or allow it.
    // For now we return error if no prior image given.
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Missing imageUrl (must supply current image to edit)' }));
    return;
  }

  try {
    const upstreamResp = await fetch('https://api.venice.ai/api/v1/image/edit', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${VENICE_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(venicePayload)
    });

    const rawText = await upstreamResp.text();
    let parsed: any = {};
    try { parsed = JSON.parse(rawText); } catch { /* Non-JSON fallback */ }

    if (!upstreamResp.ok) {
      res.statusCode = upstreamResp.status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Venice upstream error',
        status: upstreamResp.status,
        body: rawText.slice(0, 500)
      }));
      return;
    }

    // Normalize possible response shapes.
    // Adjust if Venice returns a different field (check their actual JSON).
    let imageUrlResult: string | undefined;

    // Common patterns:
    if (typeof parsed?.image_url === 'string') imageUrlResult = parsed.image_url;
    else if (typeof parsed?.imageUrl === 'string') imageUrlResult = parsed.imageUrl;
    else if (typeof parsed?.url === 'string') imageUrlResult = parsed.url;
    else if (typeof parsed?.image === 'string' && parsed.image.startsWith('http')) imageUrlResult = parsed.image;
    else if (Array.isArray(parsed?.images) && parsed.images[0]?.url) imageUrlResult = parsed.images[0].url;
    else if (parsed?.data && Array.isArray(parsed.data) && parsed.data[0]?.url) imageUrlResult = parsed.data[0].url;

    // If Venice returns base64 only (e.g. parsed.image is base64), we need to convert it.
    // Placeholder example:
    if (!imageUrlResult && typeof parsed?.image === 'string' && parsed.image.length > 100 && !parsed.image.startsWith('http')) {
      // Return base64 directly for now.
      // Frontend can detect and convert to a data URL.
      imageUrlResult = `data:image/png;base64,${parsed.image}`;
    }

    if (!imageUrlResult) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'No usable image URL in Venice response',
        responseSnippet: rawText.slice(0, 500)
      }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ imageUrl: imageUrlResult }));
  } catch (e: any) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: 'Server error calling Venice',
      message: e?.message || String(e)
    }));
  }
}