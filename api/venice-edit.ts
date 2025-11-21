// Serverless function to proxy Venice image edit.
// Uses environment variables: VENICE_API_KEY (required), VENICE_API_URL (endpoint).
// Expects POST { prompt: string, imageUrl?: string }
// Returns { imageUrl: string }

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method Not Allowed' }));
      return;
    }
  
    try {
      // Parse body (Vercel auto-parses JSON for Node functions only if using edge runtime differently;
      // so we do a defensive parse)
      const body = req.body || {};
      const prompt: string | undefined = body.prompt;
      const imageUrl: string | undefined = body.imageUrl;
  
      if (!prompt || typeof prompt !== 'string') {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Missing prompt' }));
        return;
      }
  
      const VENICE_API_KEY = process.env.VENICE_API_KEY;
      const VENICE_API_URL = process.env.VENICE_API_URL;
  
      if (!VENICE_API_KEY) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Missing VENICE_API_KEY' }));
        return;
      }
      if (!VENICE_API_URL) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Missing VENICE_API_URL' }));
        return;
      }
  
      // Construct payload. Adjust field names to Venice’s expected schema.
      const payload: Record<string, any> = { prompt };
      if (imageUrl) {
        // If Venice expects 'init_image' or 'image', change this key accordingly.
        payload.image_url = imageUrl;
      }
  
      const upstreamResp = await fetch(VENICE_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${VENICE_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
  
      const rawText = await upstreamResp.text();
      let parsed: any = {};
      try { parsed = JSON.parse(rawText); } catch { /* leave as text */ }
  
      if (!upstreamResp.ok) {
        res.statusCode = upstreamResp.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          error: 'Venice upstream error',
          status: upstreamResp.status,
          body: rawText
        }));
        return;
      }
  
      // Normalize image URL from various possible response shapes.
      let normalizedImageUrl: string | undefined;
      if (typeof parsed?.image_url === 'string') normalizedImageUrl = parsed.image_url;
      else if (Array.isArray(parsed?.images) && parsed.images[0]?.url) normalizedImageUrl = parsed.images[0].url;
      else if (typeof parsed?.url === 'string') normalizedImageUrl = parsed.url;
      else if (typeof parsed?.data?.[0]?.url === 'string') normalizedImageUrl = parsed.data[0].url;
  
      if (!normalizedImageUrl) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'No image URL in Venice response', response: parsed }));
        return;
      }
  
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ imageUrl: normalizedImageUrl }));
    } catch (e: any) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        error: 'Server error calling Venice',
        message: e?.message || String(e)
      }));
    }
  }