import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const apiDir = path.join(process.cwd(), 'api');
    const listing = fs.readdirSync(apiDir);
    const libDir = path.join(apiDir, '_lib');
    let libListing = [];
    try { libListing = fs.readdirSync(libDir); } catch {}
    respond(res, 200, { listing, libListing });
  } catch (e) {
    respond(res, 500, { error: e?.message || String(e) });
  }
}

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}