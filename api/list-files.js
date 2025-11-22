// Lists files under /var/task/api to verify deployment paths.
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
  try {
    const apiDir = path.join(process.cwd(), 'api');
    const entries = fs.readdirSync(apiDir);
    respond(res, 200, { entries });
  } catch (e) {
    respond(res, 500, { error: e?.message || String(e) });
  }
}

function respond(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}