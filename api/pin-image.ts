// Pinata pinning route.
// Accepts POST { dataUrl: string, prompt?: string }
// Returns { ipfsCid, gatewayUrl }
// Requires either PINATA_JWT or (PINATA_API_KEY & PINATA_API_SECRET)
import { setTurnIpfs } from '../services/db';
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Method Not Allowed' }));
  }

  const body = req.body || {};
  const dataUrl: string | undefined = body.dataUrl;
  const prompt: string | undefined = body.prompt;

  if (!dataUrl || !dataUrl.startsWith('data:image/')) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Invalid or missing dataUrl' }));
  }

  // Extract base64
  const base64 = dataUrl.split(',')[1];
  if (!base64) {
    res.statusCode = 400;
    return res.end(JSON.stringify({ error: 'Malformed data URL' }));
  }

  const jwt = process.env.PINATA_JWT;
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_API_SECRET;

  if (!jwt && (!apiKey || !apiSecret)) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Missing Pinata credentials' }));
  }

  // Prepare Pinata upload as multipart
  const filename = `chainreaction_${Date.now()}.png`;
  const binary = Buffer.from(base64, 'base64');

  const formDataBoundary = '----pinataBoundary' + Date.now();
  const formParts: Buffer[] = [];

  function pushText(t: string) {
    formParts.push(Buffer.from(t));
  }
  // file part
  pushText(`--${formDataBoundary}\r\n`);
  pushText(`Content-Disposition: form-data; name="file"; filename="${filename}"\r\n`);
  pushText('Content-Type: image/png\r\n\r\n');
  formParts.push(binary);
  pushText('\r\n');

  // metadata part
  const pinataMeta = {
    name: filename,
    keyvalues: prompt ? { prompt } : {}
  };
  pushText(`--${formDataBoundary}\r\n`);
  pushText('Content-Disposition: form-data; name="pinataMetadata"\r\n\r\n');
  pushText(JSON.stringify(pinataMeta) + '\r\n');

  // options (optional)
  pushText(`--${formDataBoundary}\r\n`);
  pushText('Content-Disposition: form-data; name="pinataOptions"\r\n\r\n');
  pushText(JSON.stringify({ cidVersion: 1 }) + '\r\n');

  pushText(`--${formDataBoundary}--\r\n`);

  const formBuffer = Buffer.concat(formParts);

  let uploadResp: Response;
  try {
    uploadResp = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${formDataBoundary}`,
        ...(jwt
          ? { Authorization: `Bearer ${jwt}` }
          : { pinata_api_key: apiKey as string, pinata_secret_api_key: apiSecret as string })
      },
      body: formBuffer
    });
  } catch (e: any) {
    res.statusCode = 500;
    return res.end(JSON.stringify({ error: 'Network error to Pinata', message: e?.message || String(e) }));
  }

  const resultText = await uploadResp.text();
  let json: any = {};
  try {
    json = JSON.parse(resultText);
  } catch {
    // Leave json empty
  }

  if (!uploadResp.ok) {
    res.statusCode = uploadResp.status;
    return res.end(JSON.stringify({
      error: 'Pinata error',
      status: uploadResp.status,
      bodyPreview: resultText.slice(0, 500)
    }));
  }

  const cid = json?.IpfsHash;
  if (!cid) {
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: 'No IpfsHash in Pinata response', responsePreview: resultText.slice(0, 500) }));
  }

  const gatewayUrl = `https://ipfs.io/ipfs/${cid}?filename=image.png`;
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ ipfsCid: cid, gatewayUrl }));
}