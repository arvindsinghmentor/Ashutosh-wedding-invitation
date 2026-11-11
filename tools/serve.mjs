// Tiny static server for local testing: node tools/serve.mjs [port]  (serves repo/ on localhost)
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..'), port = +process.argv[2] || 5500;
const types = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json',
  '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const blocked = /^[\\/](handoff|private|mockups|\.git)([\\/]|$)/;

createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname));
  if (blocked.test(p) || p.includes('..')) { res.writeHead(403).end(); return; }
  if (p.endsWith('/') || p.endsWith('\\')) p = join(p, 'index.html');
  try { const body = await readFile(join(root, p)); res.writeHead(200, { 'content-type': types[extname(p)] || 'application/octet-stream' }).end(body); }
  catch { res.writeHead(404).end('Not found'); }
}).listen(port, '127.0.0.1', () => console.log(`Serving ${root} on http://localhost:${port}`));
