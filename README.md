# Studio DSA Offline

Quaderno digitale compensativo per uno studente con dislessia, disgrafia,
disortografia e discalculia (scuola secondaria di secondo grado).
**Funziona completamente offline**: nessuna CDN, nessuna API, nessun account,
nessun tracciamento. I dati restano sul dispositivo (IndexedDB, con
localStorage di riserva).

Per l'utente finale: leggere **ISTRUZIONI.txt**.

## Struttura della cartella

```
studio-dsa-offline/
├── studio-dsa-offline.html   ← VERSIONE MONOFILE (tutto dentro: HTML+CSS+JS+pdf.js)
├── index.html                ← versione modulare
├── style.css                 ← generato da src/css/*
├── app.js                    ← generato da src/js/*
├── manifest.json             ← per l'installazione PWA (facoltativa)
├── service-worker.js         ← cache offline (solo su https/localhost)
├── ISTRUZIONI.txt            ← istruzioni per Windows / Mac / Android / iOS
├── LICENZE.txt               ← componenti di terze parti
├── assets/
│   ├── icon-192.png, icon-512.png
│   └── pdfjs/pdf.min.js, pdf.worker.min.js   ← PDF.js 3.11.174 (Apache 2.0), locale
├── src/                      ← sorgenti modulari (solo per lo sviluppo)
│   ├── css/  01-base · 02-struttura · 03-componenti · 04-lettura · 05-matematica · 06-pdf · 07-stampa
│   └── js/   01-core · 02-ui · 03-voce · 04-lettura · 05-scrivi · 06-mate-motore
│              07-mate-risolutore · 08-matematica · 09-mate-lab · 10-mate-grafici
│              11-studia · 12-pdf · 13-avvio
├── build.mjs                 ← unisce i sorgenti e genera il monofile
└── server-locale.mjs         ← server di prova per la PWA (non serve all'utente)
```

## Sviluppo

```bash
node build.mjs          # rigenera style.css, app.js e studio-dsa-offline.html
node server-locale.mjs  # http://localhost:8123 (solo per provare la PWA)
```

I sorgenti si modificano **in `src/`**: `style.css` e `app.js` sono file generati
e vengono sovrascritti a ogni build.

Nota per il build: le sostituzioni nel monofile usano `replace(cerca, () => nuovo)`.
Passando la stringa direttamente, JavaScript interpreterebbe `$$`, `$&`, ecc. dentro
il codice sorgente come segnaposto e li mangerebbe.

## Attenzione ai test: il punto cieco degli overlay

jsdom e i click programmatici (`elemento.click()`) **non fanno hit-testing**: raggiungono
l'elemento anche se sopra c'è un pannello che lo copre. Un bug così è passato attraverso
tutta la suite — `.modale { display: flex }` batteva la regola del browser
`[hidden] { display: none }`, quindi dopo l'onboarding il pannello restava sopra a tutto,
invisibile, e mangiava ogni tocco. Da qui la riga `[hidden] { display: none !important }`
in `src/css/01-base.css`.

Per questa classe di problemi serve un browser vero e `document.elementFromPoint()`:

```js
const r = pulsante.getBoundingClientRect();
const sopra = document.elementFromPoint(r.left + r.width/2, r.top + r.height/2);
const raggiungibile = pulsante === sopra || pulsante.contains(sopra);
```

Vale la pena rifarlo su tutte le sezioni dopo ogni modifica al CSS di pannelli,
barre fisse o modali (con `node server-locale.mjs` e la finestra stretta a 375 px).
Lo stesso giro serve a controllare le aree di tocco: sotto i 40×40 px va rivisto.

## Motore matematico

`src/js/06-mate-motore.js` (aritmetica esatta con frazioni, parser, polinomi
multivariati, funzioni razionali, derivate) e `src/js/07-mate-risolutore.js`
(risoluzioni passo passo con spiegazione in italiano semplice).

Ogni risultato porta un semaforo di affidabilità:
`verde` = so risolverlo · `giallo` = posso aiutarti solo in parte ·
`rosso` = non posso farlo in modo affidabile offline.
Il motore **non inventa mai un passaggio**: quando non sa giustificare una
trasformazione lo dichiara.

## Licenza dei componenti

Vedi `LICENZE.txt`. L'unica libreria di terze parti è PDF.js (Apache 2.0),
inclusa fisicamente nel progetto.
