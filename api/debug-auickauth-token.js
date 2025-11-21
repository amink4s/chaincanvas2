export default async function handler(req, res) {
    // FAKE UNSIGNED JWT FOR LOCAL TESTING ONLY (header.payload.signature)
    // Payload: {"sub":477126}
    const payload = btoa(JSON.stringify({ sub: 477126, iat: Math.floor(Date.now()/1000) }));
    const fake = `eyJhbGciOiJub25lIn0.${payload}.`;
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ token: fake }));
  }