/*
  server-locale.mjs — piccolo server SOLO per lo sviluppo e per provare
  la versione installabile (PWA). L'utente finale NON ne ha bisogno:
  gli basta aprire index.html o studio-dsa-offline.html con un doppio clic.

  Uso:  node server-locale.mjs      →  http://localhost:8123
*/
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PORTA = 8123;
const TIPI = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
  '.txt': 'text/plain; charset=utf-8'
};

http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^([/\\])+/, ''));
  if (!file.startsWith(ROOT)) { res.writeHead(403).end('no'); return; }
  fs.readFile(file, (err, dati) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }).end('404'); return; }
    res.writeHead(200, { 'Content-Type': TIPI[path.extname(file).toLowerCase()] || 'application/octet-stream' });
    res.end(dati);
  });
}).listen(PORTA, () => console.log('Studio DSA su http://localhost:' + PORTA));
