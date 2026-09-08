/* ==================================================================
   12-pdf.js — lettore PDF completamente offline

   Usa PDF.js 3.11.174 (licenza Apache 2.0), che è dentro
   la cartella dell'applicazione: nessun file viene scaricato da
   Internet e nessun PDF esce mai dal dispositivo.
   ================================================================== */

const Pdf = {
  lib: null,               // pdfjsLib, caricata solo quando serve
  doc: null,               // documento aperto
  libroId: null,
  pagina: 1,
  totale: 0,
  zoom: 1.2,
  adatta: 'larghezza',     // 'larghezza' | 'pagina' | 'no'
  testoPagina: '',
  haTesto: true,
  modoDsa: false,
  categoria: 'importante',
  inCaricamento: false
};

const CATEGORIE_EVID = [
  { id: 'importante', tit: 'Importante', colore: '#ffe14d' },
  { id: 'definizione', tit: 'Definizione', colore: '#9fe6a0' },
  { id: 'data', tit: 'Data', colore: '#9fd4f5' },
  { id: 'formula', tit: 'Formula', colore: '#f5b6e0' },
  { id: 'nonCapito', tit: 'Non ho capito', colore: '#ffb3a7' }
];

/* ------------------------------------------------------------------
   Caricamento di PDF.js dalla cartella locale
   ------------------------------------------------------------------ */

function caricaPdfLib() {
  if (Pdf.lib) return Promise.resolve(Pdf.lib);
  return new Promise((risolvi, rifiuta) => {
    const sorgenteInterna = document.getElementById('pdfjsLibSrc');   // versione in un unico file
    function dopo() {
      const lib = window.pdfjsLib;
      if (!lib) { rifiuta(new Error('pdfjs')); return; }
      try {
        const w = document.getElementById('pdfjsWorkerSrc');
        if (w) {
          const blob = new Blob([w.textContent], { type: 'text/javascript' });
          lib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        } else {
          lib.GlobalWorkerOptions.workerSrc = 'assets/pdfjs/pdf.worker.min.js';
        }
      } catch (e) { /* PDF.js userà il modo "senza worker": più lento ma funziona */ }
      Pdf.lib = lib;
      risolvi(lib);
    }
    if (sorgenteInterna) {
      try {
        const s = document.createElement('script');
        s.textContent = sorgenteInterna.textContent;
        document.head.appendChild(s);
        dopo();
      } catch (e) { rifiuta(e); }
    } else {
      const s = document.createElement('script');
      s.src = 'assets/pdfjs/pdf.min.js';
      s.onload = dopo;
      s.onerror = () => rifiuta(new Error('file'));
      document.head.appendChild(s);
    }
  });
}

/* ------------------------------------------------------------------
   Vista principale
   ------------------------------------------------------------------ */

VISTE.pdf = function (c, par) {
  c.innerHTML = testaSezione('📄', 'PDF e libri', null,
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="pdf-barra no-stampa" id="pdfBarra"></div>
    <div id="pdfCorpo"></div>`;
  disegnaBarraPdf();

  if (par && par !== Pdf.libroId) apriLibroSalvato(par);
  else if (Pdf.doc) { disegnaVisualizzatore(); mostraPagina(); }
  else disegnaLibreria();
};

function disegnaBarraPdf() {
  const b = $('#pdfBarra');
  if (!b) return;
  if (!Pdf.doc) {
    b.innerHTML = `${bottone('pdf-apri', '📂', 'Apri un PDF', 'btn-primario')}
      ${bottone('pdf-libreria', '📚', 'I miei libri')}`;
    return;
  }
  b.innerHTML = `
    ${bottone('pdf-libreria', '📚', 'Libri', 'btn-piccolo')}
    <div class="pdf-sep"></div>
    <button type="button" class="btn" data-az="pdf-prec" aria-label="pagina precedente">◀</button>
    <input class="campo pdf-pagina-campo" id="pdfPag" type="number" min="1" max="${Pdf.totale}" value="${Pdf.pagina}" aria-label="numero di pagina">
    <span class="pdf-conta">/ ${Pdf.totale}</span>
    <button type="button" class="btn" data-az="pdf-succ" aria-label="pagina successiva">▶</button>
    <div class="pdf-sep"></div>
    <button type="button" class="btn" data-az="pdf-zoom+" aria-label="ingrandisci">🔍+</button>
    <button type="button" class="btn" data-az="pdf-zoom-" aria-label="rimpicciolisci">🔍−</button>
    <button type="button" class="btn" data-az="pdf-adatta" aria-label="adatta alla larghezza">↔️</button>
    <div class="pdf-sep"></div>
    <button type="button" class="btn ${Pdf.modoDsa ? 'btn-primario' : ''}" data-az="pdf-dsa"
      aria-pressed="${Pdf.modoDsa}"><span aria-hidden="true">🧠</span><span>Modalità DSA</span></button>
    ${bottone('pdf-ascolta', '🔊', 'Leggi questa pagina')}
    ${bottone('pdf-frase', '1️⃣', 'Una frase alla volta')}
    <button type="button" class="btn" data-az="righello" aria-pressed="${Righello.aperto}"><span aria-hidden="true">📏</span><span>Righello</span></button>
    ${bottone('pdf-cerca', '🔎', 'Cerca')}
    ${bottone('pdf-segnalibro', '🔖', 'Segnalibro')}
    ${bottone('pdf-note', '📝', 'Note')}`;

  const inp = $('#pdfPag', b);
  if (inp) inp.addEventListener('change', () => vaiAPagina(Number(inp.value)));
}

/* ------------------------------------------------------------------
   Libreria personale
   ------------------------------------------------------------------ */

function disegnaLibreria() {
  const box = $('#pdfCorpo');
  box.innerHTML = `<div class="card">
      <h2>📚 I miei libri</h2>
      <p>Apri un PDF dal tuo dispositivo: resta qui, non viene mandato da nessuna parte.</p>
      <div class="barra-btn">${bottone('pdf-apri', '📂', 'Apri un PDF', 'btn-primario btn-grande')}</div>
    </div>
    ${Stato.libri.length ? Stato.libri.map((l) => {
      const perc = l.totale ? Math.round(l.ultimaPagina / l.totale * 100) : 0;
      const note = Stato.notePdf.filter((n) => n.libroId === l.id).length;
      const evid = Stato.evidenziazioni.filter((n) => n.libroId === l.id).length;
      const segn = Stato.segnalibri.filter((n) => n.libroId === l.id).length;
      return `<div class="card">
        <div class="libro">
          <div class="copertina" aria-hidden="true">📕</div>
          <div style="flex:1 1 auto;min-width:0">
            <b>${esc(l.nome)}</b>
            <div class="aiutino">${esc(l.materia || 'Nessuna materia')} · ultima apertura ${esc(quandoInParole(l.ultimoAccesso))}</div>
            <div class="aiutino">Pagina ${l.ultimaPagina || 1} di ${l.totale || '?'}${note || evid || segn ? ' · ' + [
              note ? note + ' note' : '', evid ? evid + ' evidenziazioni' : '', segn ? segn + ' segnalibri' : ''
            ].filter(Boolean).join(', ') : ''}</div>
            <div class="avanzamento" role="img" aria-label="letto il ${perc} per cento"><div class="riempi" style="width:${perc}%"></div></div>
          </div>
        </div>
        <div class="barra-btn" style="margin:12px 0 0">
          ${bottone('pdf-riapri:' + l.id, '📖', l.haFile ? 'Continua da pagina ' + (l.ultimaPagina || 1) : 'Riscegli il file e continua', 'btn-primario')}
          ${bottone('pdf-materia:' + l.id, '🏷️', 'Materia', 'btn-piccolo')}
          ${bottone('pdf-canc:' + l.id, '🗑️', 'Togli dalla libreria', 'btn-piccolo btn-errore')}
        </div>
      </div>`;
    }).join('')
    : `<div class="card">${schedaVuota('📚', 'Non hai ancora nessun libro.', 'Apri un PDF: mi ricorderò la pagina, le note e le evidenziazioni.')}</div>`}`;
}

/* ------------------------------------------------------------------
   Apertura di un PDF
   ------------------------------------------------------------------ */

async function apriPdfDaFile(libroEsistente) {
  const f = await scegliFile('.pdf,application/pdf');
  if (!f) return;
  if (!/\.pdf$/i.test(f.name) && f.type !== 'application/pdf') {
    avvisoErrore('Questo non sembra un file PDF.');
    return;
  }
  const box = $('#pdfCorpo');
  box.innerHTML = `<div class="card"><p>⏳ Sto aprendo <b>${esc(f.name)}</b>… un momento.</p></div>`;
  try {
    const byte = new Uint8Array(await f.arrayBuffer());
    await apriPdfDaByte(byte, f.name, libroEsistente, true);
  } catch (e) {
    console.error(e);
    box.innerHTML = `<div class="card"><div class="avviso avviso-err"><span class="ic">⚠️</span>
      <p>Non sono riuscito ad aprire questo PDF. Può essere protetto da password oppure rovinato.
      Prova con un altro file.</p></div>
      <div class="barra-btn">${bottone('pdf-libreria', '⬅', 'Torna ai libri')}</div></div>`;
  }
}

async function apriPdfDaByte(byte, nome, libroEsistente, salvaByte) {
  const lib = await caricaPdfLib().catch(() => null);
  if (!lib) {
    $('#pdfCorpo').innerHTML = `<div class="card"><div class="avviso avviso-err"><span class="ic">⚠️</span>
      <p>Il lettore PDF non si è caricato. Se stai usando la versione con più file, controlla che
      la cartella <b>assets</b> sia accanto al file index.html.</p></div></div>`;
    return;
  }
  // pdf.js consuma l'array: gliene do sempre una copia
  const doc = await lib.getDocument({ data: byte.slice(0) }).promise;
  Pdf.doc = doc;
  Pdf.totale = doc.numPages;

  let libro = libroEsistente ? Stato.libri.find((l) => l.id === libroEsistente) : null;
  if (!libro) libro = Stato.libri.find((l) => l.nome === nome);
  if (!libro) {
    libro = { id: uid('libro'), nome, materia: '', ultimaPagina: 1, totale: doc.numPages, zoom: Pdf.zoom, haFile: false, creato: oraISO() };
    Stato.libri.unshift(libro);
  }
  libro.totale = doc.numPages;
  libro.ultimoAccesso = oraISO();
  Pdf.libroId = libro.id;
  Pdf.pagina = limita(libro.ultimaPagina || 1, 1, doc.numPages);
  Pdf.zoom = libro.zoom || Pdf.zoom;
  await salvaOra();

  if (salvaByte) {
    try {
      await Archivio.scrivi('pdf:' + libro.id, byte);
      libro.haFile = true;
      await salvaOra();
    } catch (e) {
      libro.haFile = false;
      toast('Il PDF è troppo grande per essere tenuto in memoria: la prossima volta te lo richiederò.');
    }
  }
  disegnaBarraPdf();
  disegnaVisualizzatore();
  await mostraPagina();
}

async function apriLibroSalvato(id) {
  const libro = Stato.libri.find((l) => l.id === id);
  if (!libro) { disegnaLibreria(); return; }
  const box = $('#pdfCorpo');
  box.innerHTML = `<div class="card"><p>⏳ Sto cercando il file…</p></div>`;
  const byte = await Archivio.leggi('pdf:' + id);
  if (byte && byte.byteLength) {
    try { await apriPdfDaByte(new Uint8Array(byte), libro.nome, id, false); return; }
    catch (e) { /* passo alla richiesta del file */ }
  }
  box.innerHTML = `<div class="card">
    <h2>${esc(libro.nome)}</h2>
    <div class="avviso"><span class="ic">📂</span>
      <p>Per motivi di sicurezza il browser non può riaprire da solo un file del tuo dispositivo.
      Scegli di nuovo <b>${esc(libro.nome)}</b>: ritroverai la pagina ${libro.ultimaPagina || 1},
      le note, le evidenziazioni e i segnalibri.</p></div>
    <div class="barra-btn">
      ${bottone('pdf-riscegli:' + id, '📂', 'Scegli il file', 'btn-primario btn-grande')}
      ${bottone('pdf-libreria', '⬅', 'Torna ai libri')}
    </div></div>`;
}

/* ------------------------------------------------------------------
   Visualizzatore
   ------------------------------------------------------------------ */

function disegnaVisualizzatore() {
  $('#pdfCorpo').innerHTML = `
    <div class="pdf-scena" id="pdfScena">
      <div class="pdf-foglio" id="pdfFoglio">
        <canvas id="pdfCanvas"></canvas>
        <div class="pdf-testo" id="pdfLivelloTesto"></div>
      </div>
    </div>
    <div id="pdfPannello"></div>`;
}

async function mostraPagina() {
  if (!Pdf.doc || Pdf.inCaricamento) return;
  Pdf.inCaricamento = true;
  try {
    const pagina = await Pdf.doc.getPage(Pdf.pagina);
    const scena = $('#pdfScena');
    let scala = Pdf.zoom;
    const base = pagina.getViewport({ scale: 1 });
    if (Pdf.adatta === 'larghezza' && scena) scala = (scena.clientWidth - 30) / base.width;
    else if (Pdf.adatta === 'pagina' && scena) scala = Math.min((scena.clientWidth - 30) / base.width, (window.innerHeight * 0.72) / base.height);
    scala = limita(scala, 0.25, 5);
    const viewport = pagina.getViewport({ scale: scala });

    const cv = $('#pdfCanvas');
    const S = Math.min(2, window.devicePixelRatio || 1);
    cv.width = Math.floor(viewport.width * S);
    cv.height = Math.floor(viewport.height * S);
    cv.style.width = Math.floor(viewport.width) + 'px';
    cv.style.height = Math.floor(viewport.height) + 'px';
    const g = cv.getContext('2d');
    g.setTransform(S, 0, 0, S, 0, 0);
    await pagina.render({ canvasContext: g, viewport }).promise;

    const foglio = $('#pdfFoglio');
    foglio.style.width = Math.floor(viewport.width) + 'px';

    // livello del testo (per selezionare e copiare)
    const contenuto = await pagina.getTextContent();
    Pdf.testoPagina = componiTesto(contenuto);
    Pdf.haTesto = Pdf.testoPagina.replace(/\s/g, '').length > 12;
    costruisciLivelloTesto(contenuto, viewport);
    disegnaEvidenziazioni(viewport);

    const libro = Stato.libri.find((l) => l.id === Pdf.libroId);
    if (libro) { libro.ultimaPagina = Pdf.pagina; libro.zoom = Pdf.zoom; libro.ultimoAccesso = oraISO(); salva(); }

    const inp = $('#pdfPag');
    if (inp) inp.value = Pdf.pagina;

    if (!Pdf.haTesto) mostraAvvisoScansione();
    else { const p = $('#pdfPannello'); if (p && p._scansione) { p.innerHTML = ''; p._scansione = false; } }

    if (Pdf.modoDsa) mostraModoDsa();
  } catch (e) {
    console.error(e);
    avvisoErrore('Non riesco a mostrare questa pagina.');
  } finally {
    Pdf.inCaricamento = false;
  }
}

function componiTesto(contenuto) {
  let testo = '';
  let ultimaY = null;
  contenuto.items.forEach((it) => {
    if (!it.str) return;
    const y = it.transform ? Math.round(it.transform[5]) : null;
    if (ultimaY !== null && y !== null && Math.abs(y - ultimaY) > 3) testo += (it.hasEOL ? '\n' : '\n');
    else if (testo && !/\s$/.test(testo) && !/^\s/.test(it.str)) testo += ' ';
    testo += it.str;
    ultimaY = y;
  });
  return testo.replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
}

function costruisciLivelloTesto(contenuto, viewport) {
  const box = $('#pdfLivelloTesto');
  if (!box) return;
  box.innerHTML = '';
  box.style.width = viewport.width + 'px';
  box.style.height = viewport.height + 'px';
  const lib = Pdf.lib;
  contenuto.items.forEach((it) => {
    if (!it.str || !it.str.trim()) return;
    let t;
    try { t = lib.Util.transform(viewport.transform, it.transform); }
    catch (e) { return; }
    const altezza = Math.hypot(t[2], t[3]) || 12;
    const sp = document.createElement('span');
    sp.textContent = it.str;
    sp.style.left = t[4] + 'px';
    sp.style.top = (t[5] - altezza) + 'px';
    sp.style.fontSize = altezza + 'px';
    sp.style.fontFamily = 'sans-serif';
    if (it.width) {
      const largheza = it.width * viewport.scale;
      sp.dataset.larghezza = largheza;
    }
    box.appendChild(sp);
    // adatto la larghezza del testo invisibile a quella reale
    if (it.width) {
      const reale = sp.getBoundingClientRect().width;
      const voluta = it.width * viewport.scale;
      if (reale > 0 && voluta > 0) sp.style.transform = 'scaleX(' + (voluta / reale) + ')';
    }
  });
}

function vaiAPagina(n) {
  if (!Pdf.doc) return;
  Pdf.pagina = limita(Math.round(n) || 1, 1, Pdf.totale);
  mostraPagina();
}

/* ------------------------------------------------------------------
   Pagine scansionate: lo diciamo chiaramente
   ------------------------------------------------------------------ */

function mostraAvvisoScansione() {
  const p = $('#pdfPannello');
  if (!p) return;
  p._scansione = true;
  p.innerHTML = `<div class="card">
    <div class="avviso avviso-att"><span class="ic">🖼️</span>
      <p><b>Questa pagina sembra essere un'immagine.</b> Dentro non c'è testo che io possa leggere,
      quindi non posso né ingrandirlo in modalità DSA né leggerlo ad alta voce.
      Per trasformare l'immagine in testo servirebbe il riconoscimento OCR, che questa applicazione
      non include: renderebbe l'app cinque volte più pesante e ci metterebbe quasi un minuto per pagina.</p></div>
    <div class="avviso"><span class="ic">💡</span>
      <p><b>Il tuo dispositivo però sa già farlo.</b> Fai uno screenshot della pagina, poi:
      su iPhone, iPad e Mac tieni premuto sul testo (“Testo attivo”) e copia;
      su Windows 11 usa lo Strumento di cattura e poi “Azioni di testo”;
      su Android usa Google Lens. Poi torna qui e incolla con il pulsante qui sotto.</p></div>
    <p><b>Cosa puoi fare adesso:</b></p>
    <ul>
      <li>ingrandire la pagina con 🔍+ e usare il righello 📏;</li>
      <li>incollare (o scrivere) tu la parte che ti serve: dopo potrai ascoltarla come tutto il resto;</li>
      <li>chiedere all'insegnante il PDF "con il testo" invece della scansione.</li>
    </ul>
    <div class="barra-btn">
      ${bottone('pdf-trascrivi', '📋', 'Incolla o scrivi il testo di questa pagina', 'btn-primario btn-grande')}
    </div>
  </div>`;
}

async function trascriviPagina() {
  const r = await finestra({
    titolo: 'Il testo della pagina ' + Pdf.pagina,
    testo: 'Incolla qui il testo che hai copiato con il tuo dispositivo, oppure scrivilo (o dettalo con la tastiera del telefono). Poi potrai ascoltarlo e usarlo come tutto il resto.',
    campi: [{ nome: 'testo', etichetta: 'Testo', tipo: 'area', righe: 8, valore: '' }],
    testoOk: 'Usa questo testo'
  });
  if (!r || !r.testo.trim()) return;
  Pdf.testoPagina = r.testo;
  Pdf.haTesto = true;
  Pdf.modoDsa = true;
  disegnaBarraPdf();
  mostraModoDsa();
}

/* ------------------------------------------------------------------
   Modalità DSA: il testo della pagina, scritto in modo leggibile
   ------------------------------------------------------------------ */

function mostraModoDsa() {
  const p = $('#pdfPannello');
  if (!p) return;
  if (!Pdf.haTesto) { mostraAvvisoScansione(); return; }
  const dati = fogliaTesto(Pdf.testoPagina);
  p.innerHTML = `<div class="card">
      <div class="barra-btn">
        ${bottone('pdf-dsaChiudi', '✕', 'Chiudi la modalità DSA')}
        ${bottone('impo', '⚙️', 'Come si vede')}
        <button type="button" class="btn" data-az="sillabe" aria-pressed="${Stato.impostazioni.spaziaturaSillabe}">
          <span aria-hidden="true">🔠</span><span>Più spazio</span></button>
        ${bottone('pdf-appunto', '📓', 'Porta negli appunti')}
        ${bottone('pdf-inLettura', '📖', 'Aprilo in Leggi')}
      </div>
      <div id="pdfBarraVoce"></div>
      <div class="foglio"><div class="foglio-testo${Stato.impostazioni.spaziaturaSillabe ? ' sillabe' : ''}" id="foglioTesto">${dati.html}</div></div>
    </div>`;
  const bv = $('#pdfBarraVoce');
  bv.appendChild(barraLettura(() => dati.frasi, {
    onFrase: (i) => {
      const n = $('#foglioTesto [data-f="' + i + '"]');
      if (n) {
        $$('#foglioTesto .frase.attiva').forEach((x) => x.classList.remove('attiva'));
        n.classList.add('attiva');
        n.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }
    },
    onFine: () => $$('#foglioTesto .frase.attiva').forEach((x) => x.classList.remove('attiva'))
  }));
}

/* ------------------------------------------------------------------
   Selezione del testo → menu delle azioni
   ------------------------------------------------------------------ */

function testoSelezionato() {
  const s = window.getSelection();
  return s && s.toString().trim() ? s.toString().trim() : '';
}

function mostraMenuSelezione(testo, x, y) {
  chiudiMenuSelezione();
  const menu = document.createElement('div');
  menu.className = 'menu-selezione';
  menu.id = 'menuSelezione';
  menu.innerHTML = `
    <div class="estratto">${esc(accorcia(testo, 160))}</div>
    <div class="voci">
      ${bottone('sel-leggi', '🔊', 'Leggi')}
      ${bottone('sel-evidenzia', '🖍️', 'Evidenzia')}
      ${bottone('sel-nota', '📝', 'Nota')}
      ${bottone('sel-appunto', '📓', 'Appunti')}
      ${bottone('sel-flash', '🃏', 'Flashcard')}
      ${bottone('sel-mappa', '🗺️', 'Mappa')}
      ${bottone('sel-mate', '🔢', 'Matematica')}
      ${bottone('sel-dsa', '🧠', 'Leggilo grande')}
      ${bottone('sel-chiudi', '✕', 'Chiudi')}
    </div>`;
  document.body.appendChild(menu);
  const larg = menu.offsetWidth, alt = menu.offsetHeight;
  menu.style.left = limita(x - larg / 2, 8, window.innerWidth - larg - 8) + 'px';
  menu.style.top = limita(y + 12, 8, window.innerHeight - alt - 8) + 'px';
  menu._testo = testo;
}

function chiudiMenuSelezione() {
  const m = $('#menuSelezione');
  if (m) m.remove();
}

function selezioneCorrente() {
  const m = $('#menuSelezione');
  return m ? m._testo : '';
}

/* ------------------------------------------------------------------
   Evidenziazioni
   ------------------------------------------------------------------ */

async function evidenziaSelezione() {
  const testo = selezioneCorrente();
  if (!testo) return;
  const r = await finestra({
    titolo: 'Evidenzia',
    campi: [{ nome: 'cat', etichetta: 'Che tipo di informazione è?', tipo: 'scelta', valore: Pdf.categoria,
      opzioni: CATEGORIE_EVID.map((c) => ({ v: c.id, t: c.tit })) }],
    testoOk: 'Evidenzia'
  });
  if (!r) return;
  Pdf.categoria = r.cat;
  const rettangoli = rettangoliSelezione();
  Stato.evidenziazioni.push({
    id: uid('ev'), libroId: Pdf.libroId, pagina: Pdf.pagina,
    testo, categoria: r.cat, rettangoli, quando: oraISO()
  });
  await salvaOra();
  chiudiMenuSelezione();
  window.getSelection().removeAllRanges();
  const foglio = $('#pdfFoglio');
  if (foglio) {
    const pagina = await Pdf.doc.getPage(Pdf.pagina);
    disegnaEvidenziazioni(pagina.getViewport({ scale: 1 }));
  }
  avvisoOk('Evidenziato');
}

/** Salvo i rettangoli in percentuale, così valgono a qualsiasi zoom. */
function rettangoliSelezione() {
  const foglio = $('#pdfFoglio');
  const s = window.getSelection();
  if (!foglio || !s || !s.rangeCount) return [];
  const base = foglio.getBoundingClientRect();
  const out = [];
  for (let i = 0; i < s.rangeCount; i++) {
    const rects = s.getRangeAt(i).getClientRects();
    for (let k = 0; k < rects.length; k++) {
      const r = rects[k];
      if (r.width < 2 || r.height < 2) continue;
      out.push({
        x: (r.left - base.left) / base.width,
        y: (r.top - base.top) / base.height,
        w: r.width / base.width,
        h: r.height / base.height
      });
    }
  }
  return out;
}

function disegnaEvidenziazioni() {
  const foglio = $('#pdfFoglio');
  if (!foglio) return;
  $$('.pdf-evid', foglio).forEach((n) => n.remove());
  Stato.evidenziazioni
    .filter((e) => e.libroId === Pdf.libroId && e.pagina === Pdf.pagina)
    .forEach((e) => {
      const cat = CATEGORIE_EVID.find((c) => c.id === e.categoria) || CATEGORIE_EVID[0];
      (e.rettangoli || []).forEach((r) => {
        const d = document.createElement('div');
        d.className = 'pdf-evid';
        d.style.left = (r.x * 100) + '%';
        d.style.top = (r.y * 100) + '%';
        d.style.width = (r.w * 100) + '%';
        d.style.height = (r.h * 100) + '%';
        d.style.background = cat.colore;
        d.title = cat.tit;
        foglio.appendChild(d);
      });
    });
}

/* ------------------------------------------------------------------
   Note, segnalibri, ricerca
   ------------------------------------------------------------------ */

async function notaSuPdf() {
  const testo = selezioneCorrente();
  const r = await finestra({
    titolo: '📝 Nota a pagina ' + Pdf.pagina,
    testo: testo ? 'Testo scelto: "' + accorcia(testo, 120) + '"' : '',
    campi: [{ nome: 'nota', etichetta: 'La mia nota', tipo: 'area', righe: 4, valore: '' }],
    testoOk: 'Salva la nota'
  });
  if (!r || !r.nota.trim()) return;
  Stato.notePdf.unshift({
    id: uid('nt'), libroId: Pdf.libroId, pagina: Pdf.pagina,
    testoSelezionato: testo, nota: r.nota, quando: oraISO()
  });
  await salvaOra();
  chiudiMenuSelezione();
  avvisoOk('Nota salvata');
}

function mostraNotePdf() {
  const p = $('#pdfPannello');
  const note = Stato.notePdf.filter((n) => n.libroId === Pdf.libroId);
  const evid = Stato.evidenziazioni.filter((n) => n.libroId === Pdf.libroId);
  const segn = Stato.segnalibri.filter((n) => n.libroId === Pdf.libroId);
  p.innerHTML = `<div class="card">
    <h2>📝 Note, evidenziazioni e segnalibri di questo libro</h2>
    ${segn.length ? `<h3>🔖 Segnalibri</h3><ul class="lista">${segn.map((s) => `
      <li class="voce"><div class="corpo"><b>${esc(s.titolo || 'Pagina ' + s.pagina)}</b>
        <span class="meta">pagina ${s.pagina} · ${esc(quandoInParole(s.quando))}</span></div>
        <div class="azioni">${bottone('pdf-vai:' + s.pagina, '➡', 'Vai', 'btn-piccolo btn-primario')}
        ${bottone('pdf-cancSeg:' + s.id, '🗑️', '', 'btn-piccolo btn-errore')}</div></li>`).join('')}</ul>` : ''}
    ${note.length ? `<h3>📝 Note</h3><ul class="lista">${note.map((n) => `
      <li class="voce"><div class="corpo"><b>Pagina ${n.pagina}</b>
        ${n.testoSelezionato ? `<p style="margin:4px 0;border-left:4px solid var(--bordo);padding-left:8px"><i>${esc(accorcia(n.testoSelezionato, 140))}</i></p>` : ''}
        <p style="margin:4px 0">${esc(n.nota)}</p></div>
        <div class="azioni">${bottone('pdf-vai:' + n.pagina, '➡', 'Vai', 'btn-piccolo')}
        ${bottone('pdf-cancNota:' + n.id, '🗑️', '', 'btn-piccolo btn-errore')}</div></li>`).join('')}</ul>` : ''}
    ${evid.length ? `<h3>🖍️ Evidenziazioni</h3><ul class="lista">${evid.map((e) => {
      const cat = CATEGORIE_EVID.find((c) => c.id === e.categoria) || CATEGORIE_EVID[0];
      return `<li class="voce"><div class="corpo">
        <b><span class="pallino" style="background:${cat.colore}"></span>${esc(cat.tit)} · pagina ${e.pagina}</b>
        <p style="margin:4px 0">${esc(accorcia(e.testo, 160))}</p></div>
        <div class="azioni">${bottone('pdf-vai:' + e.pagina, '➡', 'Vai', 'btn-piccolo')}
        ${bottone('pdf-cancEvid:' + e.id, '🗑️', '', 'btn-piccolo btn-errore')}</div></li>`;
    }).join('')}</ul>` : ''}
    ${!note.length && !evid.length && !segn.length ? schedaVuota('📝', 'Non hai ancora messo niente su questo libro.') : ''}
    <div class="barra-btn" style="margin-top:12px">
      ${bottone('pdf-esportaNote', '📤', 'Esporta tutto in un file')}
      ${bottone('pdf-chiudiPannello', '✕', 'Chiudi')}
    </div>
  </div>`;
}

async function aggiungiSegnalibro() {
  const t = await chiediTesto('🔖 Segnalibro a pagina ' + Pdf.pagina, 'Come lo chiamo? (facoltativo)', '');
  if (t === null) return;
  const libro = Stato.libri.find((l) => l.id === Pdf.libroId);
  Stato.segnalibri.unshift({
    id: uid('sg'), libroId: Pdf.libroId, pagina: Pdf.pagina,
    titolo: t || ((libro ? libro.nome : '') + ' — pagina ' + Pdf.pagina), quando: oraISO()
  });
  await salvaOra();
  avvisoOk('Segnalibro messo');
}

async function cercaNelPdf() {
  if (!Pdf.doc) return;
  const q = await chiediTesto('🔎 Cerca nel documento', 'Che parola cerco?', '');
  if (!q) return;
  const p = $('#pdfPannello');
  p.innerHTML = `<div class="card"><p>⏳ Sto cercando "${esc(q)}" in ${Pdf.totale} pagine…</p></div>`;
  const trovate = [];
  const cerca = q.toLowerCase();
  for (let n = 1; n <= Pdf.totale; n++) {
    try {
      const pg = await Pdf.doc.getPage(n);
      const c = await pg.getTextContent();
      const t = c.items.map((i) => i.str).join(' ');
      const k = t.toLowerCase().indexOf(cerca);
      if (k >= 0) trovate.push({ pagina: n, estratto: t.slice(Math.max(0, k - 60), k + 90) });
      if (trovate.length >= 60) break;
    } catch (e) { /* pagina saltata */ }
  }
  p.innerHTML = `<div class="card">
    <h2>🔎 "${esc(q)}"</h2>
    ${trovate.length ? `<p class="aiutino">Trovata in ${trovate.length} pagine.</p>
      <ul class="lista">${trovate.map((t) => `<li class="voce">
        <div class="corpo"><b>Pagina ${t.pagina}</b><p style="margin:4px 0">…${esc(t.estratto)}…</p></div>
        <div class="azioni">${bottone('pdf-vai:' + t.pagina, '➡', 'Vai', 'btn-piccolo btn-primario')}</div></li>`).join('')}</ul>`
      : `<p>Non ho trovato questa parola. Se il libro è una scansione (immagini), il testo non è cercabile.</p>`}
    <div class="barra-btn">${bottone('pdf-chiudiPannello', '✕', 'Chiudi')}</div>
  </div>`;
}

function esportaNotePdf() {
  const libro = Stato.libri.find((l) => l.id === Pdf.libroId);
  const nome = libro ? libro.nome : 'libro';
  const righe = [];
  righe.push('APPUNTI SU: ' + nome, '');
  Stato.segnalibri.filter((s) => s.libroId === Pdf.libroId).forEach((s) => righe.push('[SEGNALIBRO] p.' + s.pagina + ' — ' + s.titolo));
  Stato.evidenziazioni.filter((e) => e.libroId === Pdf.libroId).forEach((e) => {
    const cat = CATEGORIE_EVID.find((c) => c.id === e.categoria) || CATEGORIE_EVID[0];
    righe.push('', '[' + cat.tit.toUpperCase() + '] p.' + e.pagina, e.testo);
  });
  Stato.notePdf.filter((n) => n.libroId === Pdf.libroId).forEach((n) => {
    righe.push('', '[NOTA] p.' + n.pagina, n.testoSelezionato ? '« ' + n.testoSelezionato + ' »' : '', '→ ' + n.nota);
  });
  scaricaFile(nome.replace(/\.pdf$/i, '') + '-appunti.txt', righe.join('\n'), 'text/plain;charset=utf-8');
  avvisoOk('File pronto');
}
