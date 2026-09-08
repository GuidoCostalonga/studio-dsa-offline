/*
  build.mjs — SOLO PER LO SVILUPPATORE, non serve all'utente finale.
  ------------------------------------------------------------------
  Unisce i sorgenti modulari in:
    - style.css                (concatenazione di src/css/*.css)
    - app.js                   (concatenazione di src/js/*.js)
    - studio-dsa-offline.html  (versione MONOFILE: HTML+CSS+JS+pdf.js in un unico file)

  Uso:  node build.mjs
*/
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const write = (p, s) => fs.writeFileSync(path.join(ROOT, p), s);

function concat(dir, ext) {
  const d = path.join(ROOT, dir);
  const files = fs.readdirSync(d).filter((f) => f.endsWith(ext)).sort();
  return files
    .map((f) => `/* ============================================================\n   ${f}\n   ============================================================ */\n` + fs.readFileSync(path.join(d, f), 'utf8'))
    .join('\n\n');
}

// ---------- 1. style.css + app.js ----------
const css = concat('src/css', '.css');
const js = concat('src/js', '.js');
write('style.css', css);
write('app.js', js);

// ---------- 2. monofile ----------
let html = read('index.html');
const pdfLib = read('assets/pdfjs/pdf.min.js');
const pdfWorker = read('assets/pdfjs/pdf.worker.min.js');

// I tag <script> dentro i sorgenti incorporati vanno neutralizzati.
const safe = (s) => s.replace(/<\/script>/gi, '<\\/script>');
// ATTENZIONE: la stringa di sostituzione va passata come FUNZIONE, altrimenti
// JavaScript interpreta "$$", "$&" ecc. dentro il codice sorgente come segnaposto
// e li mangia (bug trovato durante i test: "$$" diventava "$").
const metti = (testo, cerca, nuovo) => testo.replace(cerca, () => nuovo);

html = html
  .replace('<link rel="manifest" href="manifest.json">\n', '')
  .replace(/<link rel="icon"[^>]*>\n/, '')
  .replace(/<link rel="apple-touch-icon"[^>]*>\n/, '');

html = metti(html, '<link rel="stylesheet" href="style.css">', `<style>\n${css}\n</style>`);
html = metti(html, '<script src="app.js"></script>',
  `<!-- pdf.js 3.11.174 — Apache License 2.0 — incorporato per la lettura dei PDF senza Internet -->
<script type="text/plain" id="pdfjsLibSrc">${safe(pdfLib)}</script>
<script type="text/plain" id="pdfjsWorkerSrc">${safe(pdfWorker)}</script>
<script>\n${safe(js)}\n</script>`);

write('studio-dsa-offline.html', html);

// ---------- 3. service worker con la versione impressa ----------
// Senza un numero di versione che cambia, il browser continuerebbe a
// servire per sempre la copia vecchia messa in cache.
import crypto from 'node:crypto';
const impronta = crypto.createHash('sha1').update(css + js).digest('hex').slice(0, 10);
const sw = read('src/service-worker.js').replace('__VERSIONE__', impronta);
write('service-worker.js', sw);

const kb = (s) => Math.round(Buffer.byteLength(s, 'utf8') / 1024) + ' KB';
console.log('style.css              ', kb(css));
console.log('app.js                 ', kb(js));
console.log('studio-dsa-offline.html', kb(html));
console.log('service-worker.js         versione', impronta);
