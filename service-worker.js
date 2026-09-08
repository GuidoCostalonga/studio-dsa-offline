/* ------------------------------------------------------------------
   service-worker.js — GENERATO da build.mjs, non modificare a mano
   (il sorgente è src/service-worker.js)

   Mette da parte i file dell'applicazione così funziona anche senza
   rete dopo la prima apertura.

   IMPORTANTE: l'applicazione funziona anche SENZA questo file (per
   esempio aprendo index.html con un doppio clic). Il service worker
   serve solo alla versione installabile (PWA), che i browser
   permettono soltanto da https:// oppure da localhost.

   Questo file non contatta mai Internet: si limita a conservare i
   file locali dell'applicazione.
   ------------------------------------------------------------------ */

/* La versione viene riscritta a ogni build: è quello che permette al
   browser di accorgersi che c'è una versione nuova. Con un nome fisso
   la vecchia copia sarebbe rimasta in cache per sempre. */
const VERSIONE = '1948daecba';
const CACHE = 'studio-dsa-' + VERSIONE;

const FILE = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.json',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/pdfjs/pdf.min.js',
  'assets/pdfjs/pdf.worker.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.allSettled(FILE.map((f) => c.add(f))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((chiavi) => Promise.all(
        chiavi.filter((k) => k.startsWith('studio-dsa-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Strategia: rispondo subito con la copia salvata (veloce, e funziona
   anche senza rete) e intanto, in silenzio, scarico la versione nuova
   per la volta successiva. */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request).then((salvata) => {
        const dallaRete = fetch(e.request)
          .then((r) => {
            if (r && r.status === 200 && r.type === 'basic') cache.put(e.request, r.clone());
            return r;
          })
          .catch(() => {
            // senza rete: se stava aprendo una pagina, do l'applicazione
            if (e.request.mode === 'navigate') return cache.match('index.html');
            return undefined;
          });
        return salvata || dallaRete;
      })
    )
  );
});
