/* ==================================================================
   11-studia.js — Studia, Flashcard, Mappe, Appunti, Compiti,
   Concentrazione, Le mie parole.
   ================================================================== */

/* ------------------------------------------------------------------
   STUDIA: trasformare gli appunti (tutto in locale, senza AI)
   ------------------------------------------------------------------ */

const Studia = { testo: '', frasi: [], etichette: {} };

const ETICHETTE = [
  { id: 'titolo', ic: '🏷️', tit: 'Titolo' },
  { id: 'chiave', ic: '🔑', tit: 'Parola chiave' },
  { id: 'domanda', ic: '❓', tit: 'Domanda' },
  { id: 'risposta', ic: '💬', tit: 'Risposta' },
  { id: 'definizione', ic: '📖', tit: 'Definizione' },
  { id: 'data', ic: '📅', tit: 'Data' },
  { id: 'nome', ic: '👤', tit: 'Nome' }
];

VISTE.studia = function (c) {
  c.innerHTML = testaSezione('🧠', 'Studia',
    'Incolla gli appunti: li spezzo in pezzi piccoli e tu decidi cosa è importante.',
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="card no-stampa">
      <label class="etichetta" for="stTesto">I miei appunti</label>
      <textarea class="area" id="stTesto" rows="6" spellcheck="true"
        placeholder="Incolla qui il testo da studiare.">${esc(Studia.testo)}</textarea>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('st-spezza', '✂️', 'Spezza in pezzi piccoli', 'btn-primario btn-grande')}
        ${bottone('st-elenco', '•', 'Trasforma in elenco puntato')}
        ${bottone('st-daPdf', '📄', 'Prendi da un PDF')}
      </div>
      <p class="aiutino">Attenzione: io non capisco il significato del testo. Faccio solo lavori meccanici
        (dividere, contare, riordinare). Le cose importanti le scegli tu.</p>
    </div>
    <div id="stRisultato"></div>`;
};

function spezzaAppunti() {
  Studia.testo = $('#stTesto').value;
  Studia.frasi = dividiInFrasi(Studia.testo);
  Studia.etichette = {};
  if (!Studia.frasi.length) { toast('Prima incolla un testo.'); return; }
  disegnaPezziStudio();
}

function disegnaPezziStudio() {
  const box = $('#stRisultato');
  box.innerHTML = `<div class="card">
      <h2>Un pezzo alla volta</h2>
      <p class="aiutino">Tocca un'etichetta per dire che tipo di informazione è. Poi puoi creare le flashcard.</p>
      ${Studia.frasi.map((f, i) => `
        <div class="card card-soft">
          <p style="font-size:1.05em">${esc(f)}</p>
          <div class="barra-btn" style="margin:0">
            ${ETICHETTE.map((e) => `<button type="button" class="btn btn-piccolo" data-az="st-eti:${i}:${e.id}"
              aria-pressed="${Studia.etichette[i] === e.id}"><span aria-hidden="true">${e.ic}</span><span>${esc(e.tit)}</span></button>`).join('')}
            <button type="button" class="btn btn-piccolo" data-az="st-leggi:${i}">🔊</button>
          </div>
        </div>`).join('')}
      <div class="barra-btn" style="margin-top:14px">
        ${bottone('st-flashcard', '🃏', 'Crea le flashcard dalle mie etichette', 'btn-primario btn-grande')}
        ${bottone('st-appunto', '📓', 'Salva negli appunti')}
        ${bottone('st-mappa', '🗺️', 'Manda le parole chiave alla mappa')}
      </div>
    </div>`;
}

function etichettaFrase(i, tipo) {
  Studia.etichette[i] = Studia.etichette[i] === tipo ? null : tipo;
  disegnaPezziStudio();
}

function trasformaInElenco() {
  Studia.testo = $('#stTesto').value;
  const frasi = dividiInFrasi(Studia.testo);
  if (!frasi.length) { toast('Prima incolla un testo.'); return; }
  $('#stRisultato').innerHTML = `<div class="card">
    <h2>• Elenco puntato</h2>
    <ul style="font-size:1.05em;line-height:1.9">${frasi.map((f) => '<li>' + esc(f) + '</li>').join('')}</ul>
    <div class="barra-btn">
      ${bottone('st-copiaElenco', '📋', 'Copia negli appunti', 'btn-primario')}
      ${bottone('st-stampa', '🖨️', 'Stampa')}
    </div>
  </div>`;
}

async function flashcardDaStudio() {
  const domande = [], risposte = [], definizioni = [];
  Object.keys(Studia.etichette).forEach((k) => {
    const t = Studia.etichette[k];
    if (t === 'domanda') domande.push({ i: Number(k), f: Studia.frasi[k] });
    if (t === 'risposta') risposte.push({ i: Number(k), f: Studia.frasi[k] });
    if (t === 'definizione') definizioni.push({ i: Number(k), f: Studia.frasi[k] });
  });
  let create = 0;
  domande.forEach((d) => {
    const r = risposte.filter((x) => x.i > d.i).sort((a, b) => a.i - b.i)[0];
    if (r) { Stato.flashcard.unshift(nuovaCard(d.f, r.f, 'Studio')); create++; }
  });
  definizioni.forEach((d) => {
    const pezzi = d.f.split(/[:–—]/);
    if (pezzi.length >= 2) {
      Stato.flashcard.unshift(nuovaCard('Che cos\'è ' + pezzi[0].trim() + '?', pezzi.slice(1).join(':').trim(), 'Studio'));
      create++;
    }
  });
  if (!create) {
    await finestra({ titolo: 'Non ho abbastanza etichette',
      testo: 'Per creare le flashcard segna almeno una frase come "Domanda" e quella dopo come "Risposta", oppure segna una "Definizione" scritta come "parola: significato".',
      testoOk: 'Ho capito', testoAnnulla: 'Ho capito' });
    return;
  }
  await salvaOra();
  avvisoOk(create === 1 ? 'Ho creato 1 flashcard' : 'Ho creato ' + create + ' flashcard');
}

function nuovaCard(fronte, retro, materia) {
  return { id: uid('fc'), fronte, retro, materia: materia || 'Altra', stato: 'nuova', creata: oraISO(), viste: 0 };
}

/* ------------------------------------------------------------------
   FLASHCARD
   ------------------------------------------------------------------ */

const Flash = { indice: 0, giro: false, mazzo: 'tutte', ordine: [] };
const ORDINE_STATI = { ripassa: 0, nuova: 1, quasi: 2, so: 3 };

VISTE.flash = function (c) {
  const materie2 = Array.from(new Set(Stato.flashcard.map((f) => f.materia || 'Altra')));
  c.innerHTML = testaSezione('🃏', 'Flashcard', null,
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:8px">
        ${bottone('fc-nuova', '➕', 'Nuova scheda', 'btn-primario')}
        ${bottone('fc-elenco', '📋', 'Vedi tutte')}
        ${bottone('fc-mischia', '🔀', 'Mischia')}
      </div>
      ${materie2.length > 1 ? `<label class="etichetta" for="fcMazzo">Quale mazzo?</label>
        <select class="campo" id="fcMazzo">
          <option value="tutte">Tutte le materie</option>
          ${materie2.map((m) => `<option value="${esc(m)}"${Flash.mazzo === m ? ' selected' : ''}>${esc(m)}</option>`).join('')}
        </select>` : ''}
    </div>
    <div id="fcBox"></div>`;
  const sel = $('#fcMazzo', c);
  if (sel) sel.addEventListener('change', () => { Flash.mazzo = sel.value; preparaMazzo(); disegnaFlashcard(); });
  preparaMazzo();
  disegnaFlashcard();
};

function preparaMazzo() {
  const tutte = Stato.flashcard.filter((f) => Flash.mazzo === 'tutte' || f.materia === Flash.mazzo);
  // prima quelle da ripassare, poi le nuove, poi le "quasi", infine quelle che so
  Flash.ordine = tutte.slice().sort((a, b) =>
    (ORDINE_STATI[a.stato || 'nuova'] - ORDINE_STATI[b.stato || 'nuova']) || ((a.viste || 0) - (b.viste || 0)));
  Flash.indice = 0;
  Flash.giro = false;
}

function disegnaFlashcard() {
  const box = $('#fcBox');
  if (!box) return;
  if (!Flash.ordine.length) {
    box.innerHTML = `<div class="card">${schedaVuota('🃏', 'Non hai ancora nessuna scheda.',
      'Creane una tu, oppure creale dalla sezione Studia o da un PDF.')}</div>`;
    return;
  }
  const i = limita(Flash.indice, 0, Flash.ordine.length - 1);
  const card = Flash.ordine[i];
  const daRipassare = Flash.ordine.filter((f) => (f.stato || 'nuova') !== 'so').length;

  box.innerHTML = `
    <p class="frase-contatore">Scheda ${i + 1} di ${Flash.ordine.length} · da ripassare: ${daRipassare}</p>
    <div class="flash-wrap">
      <div class="flash${Flash.giro ? ' retro' : ''}" id="fcCard" tabindex="0" role="button"
        aria-label="Tocca per girare la scheda">
        <span class="flash-lato">${Flash.giro ? 'RISPOSTA' : 'DOMANDA'}</span>
        <div>${esc(Flash.giro ? card.retro : card.fronte)}</div>
      </div>
    </div>
    <div class="barra-btn centro" style="margin-top:14px">
      ${bottone('fc-gira', '🔄', Flash.giro ? 'Rivedi la domanda' : 'Gira la scheda', 'btn-primario btn-grande')}
      ${bottone('fc-leggi', '🔊', 'Ascolta')}
    </div>
    ${Flash.giro ? `<div class="barra-btn centro">
      ${bottone('fc-so', '✅', 'Lo so', 'btn-ok btn-grande')}
      ${bottone('fc-quasi', '🤔', 'Quasi', 'btn-attenzione btn-grande')}
      ${bottone('fc-ripassa', '❌', 'Da ripassare', 'btn-errore btn-grande')}
    </div>` : ''}
    <div class="barra-btn centro">
      ${bottone('fc-prec', '⬅', 'Precedente', 'btn-piccolo')}
      ${bottone('fc-succ', '➡', 'Successiva', 'btn-piccolo')}
      ${bottone('fc-modifica:' + card.id, '✏️', 'Modifica', 'btn-piccolo')}
      ${bottone('fc-canc:' + card.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
    </div>`;

  const cn = $('#fcCard');
  cn.addEventListener('click', () => { Flash.giro = !Flash.giro; disegnaFlashcard(); });
  cn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cn.click(); } });
}

function rispondiFlashcard(stato) {
  const card = Flash.ordine[Flash.indice];
  if (!card) return;
  const vera = Stato.flashcard.find((f) => f.id === card.id);
  if (vera) { vera.stato = stato; vera.viste = (vera.viste || 0) + 1; vera.ultima = oraISO(); }
  salva();
  Flash.giro = false;
  if (Flash.indice < Flash.ordine.length - 1) Flash.indice++;
  else { preparaMazzo(); toast('Hai finito il giro! Ricominciamo dalle schede da ripassare.'); }
  disegnaFlashcard();
}

async function modificaFlashcard(id) {
  const f = id ? Stato.flashcard.find((x) => x.id === id) : null;
  const r = await finestra({
    titolo: f ? 'Modifica la scheda' : 'Nuova flashcard',
    campi: [
      { nome: 'fronte', etichetta: 'FRONTE — la domanda', tipo: 'area', righe: 3, valore: f ? f.fronte : '' },
      { nome: 'retro', etichetta: 'RETRO — la risposta', tipo: 'area', righe: 3, valore: f ? f.retro : '' },
      { nome: 'materia', etichetta: 'Materia', tipo: 'scelta', opzioni: materie(), valore: f ? f.materia : materie()[0] }
    ],
    testoOk: 'Salva'
  });
  if (!r) return;
  if (!r.fronte.trim()) { toast('La domanda non può essere vuota.'); return; }
  if (f) Object.assign(f, r);
  else Stato.flashcard.unshift(Object.assign(nuovaCard(r.fronte, r.retro, r.materia)));
  await salvaOra();
  preparaMazzo();
  disegnaFlashcard();
  avvisoOk('Scheda salvata');
}

function elencoFlashcard() {
  $('#fcBox').innerHTML = `<div class="card">
    <h2>📋 Tutte le schede</h2>
    <ul class="lista">${Stato.flashcard.map((f) => `
      <li class="voce">
        <div class="corpo"><b>${esc(accorcia(f.fronte, 60))}</b>
          <span class="meta">${esc(f.materia || '')} · ${esc({ so: 'la so', quasi: 'quasi', ripassa: 'da ripassare', nuova: 'nuova' }[f.stato || 'nuova'])}</span></div>
        <div class="azioni">
          ${bottone('fc-modifica:' + f.id, '✏️', 'Modifica', 'btn-piccolo')}
          ${bottone('fc-canc:' + f.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
        </div>
      </li>`).join('')}</ul>
    <div class="barra-btn" style="margin-top:12px">${bottone('fc-torna', '⬅', 'Torna al ripasso')}</div>
  </div>`;
}

/* ------------------------------------------------------------------
   MAPPE CONCETTUALI
   ------------------------------------------------------------------ */

const Mappa = { corrente: null, scelto: null, collegando: null, zoom: 1 };

VISTE.mappe = function (c, par) {
  if (par) Mappa.corrente = par;
  if (!Mappa.corrente && Stato.mappe.length) Mappa.corrente = Stato.mappe[0].id;
  const m = Stato.mappe.find((x) => x.id === Mappa.corrente);

  c.innerHTML = testaSezione('🗺️', 'Mappe concettuali', null,
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:${Stato.mappe.length > 1 ? '8px' : '0'}">
        ${bottone('mp-nuova', '➕', 'Nuova mappa', 'btn-primario')}
        ${m ? bottone('mp-nodo', '⬤', 'Aggiungi nodo') : ''}
        ${m ? bottone('mp-collega', '🔗', 'Collega due nodi') : ''}
        ${m ? bottone('mp-zoom+', '🔍', 'Più grande') : ''}
        ${m ? bottone('mp-zoom-', '🔎', 'Più piccolo') : ''}
        ${m ? bottone('mp-esporta', '📤', 'Esporta') : ''}
        ${m ? bottone('mp-canc', '🗑️', 'Elimina mappa', 'btn-errore') : ''}
      </div>
      ${Stato.mappe.length > 1 ? `<label class="etichetta" for="mpSel">Quale mappa?</label>
        <select class="campo" id="mpSel">${Stato.mappe.map((x) => `<option value="${esc(x.id)}"${x.id === Mappa.corrente ? ' selected' : ''}>${esc(x.titolo)}</option>`).join('')}</select>` : ''}
    </div>
    ${m ? `<div class="mappa-tela" id="mpTela"></div>
      <p class="mappa-aiuto">Trascina i nodi per spostarli. Tocca un nodo per sceglierlo, poi usa i pulsanti.
        Con la tastiera: Tab per spostarti fra i nodi, Invio per modificarli.</p>
      <div id="mpAzioniNodo"></div>`
    : `<div class="card">${schedaVuota('🗺️', 'Non hai ancora nessuna mappa.', 'Crea la prima: si parte sempre dall\'argomento centrale.')}</div>`}`;

  const sel = $('#mpSel', c);
  if (sel) sel.addEventListener('change', () => vaiA('mappe', sel.value));
  if (m) disegnaMappa();
};

async function nuovaMappa() {
  const titolo = await chiediTesto('Nuova mappa', 'Di che argomento parla?', '');
  if (titolo === null) return;
  const m = {
    id: uid('mp'), titolo: titolo || 'Mappa senza titolo', creata: oraISO(),
    nodi: [{ id: uid('nd'), testo: titolo || 'Argomento', x: 50, y: 30, centrale: true }],
    archi: []
  };
  Stato.mappe.unshift(m);
  Mappa.corrente = m.id;
  await salvaOra();
  vaiA('mappe', m.id);
}

function mappaCorrente() { return Stato.mappe.find((x) => x.id === Mappa.corrente); }

function disegnaMappa() {
  const m = mappaCorrente();
  const tela = $('#mpTela');
  if (!m || !tela) return;
  const archi = m.archi.map((a) => {
    const n1 = m.nodi.find((n) => n.id === a.da), n2 = m.nodi.find((n) => n.id === a.a);
    if (!n1 || !n2) return '';
    return `<line x1="${n1.x}%" y1="${n1.y}%" x2="${n2.x}%" y2="${n2.y}%"
      stroke="var(--primario)" stroke-width="3" opacity=".65"/>`;
  }).join('');
  tela.innerHTML = `<svg aria-hidden="true">${archi}</svg>` +
    m.nodi.map((n) => {
      const img = immagineSicura(n.img);
      return `<div class="nodo${n.centrale ? ' centrale' : ''}${Mappa.scelto === n.id ? ' scelto' : ''}"
        data-nodo="${esc(n.id)}" tabindex="0" role="button"
        style="left:${n.x}%;top:${n.y}%;font-size:${(n.dim || 1) * Mappa.zoom}em">${
        img ? `<img src="${esc(img)}" alt="${esc(n.testo)}" draggable="false">` : ''}<span>${esc(n.testo)}</span></div>`;
    }).join('');

  collegaTrascinamento(tela);
}

/** Ridisegna solo le linee fra i nodi: durante il trascinamento non
    serve rifare tutta la mappa (era lento e accumulava ascoltatori). */
function aggiornaArchi() {
  const m = mappaCorrente();
  const svg = $('#mpTela svg');
  if (!m || !svg) return;
  svg.innerHTML = m.archi.map((a) => {
    const n1 = m.nodi.find((n) => n.id === a.da), n2 = m.nodi.find((n) => n.id === a.a);
    if (!n1 || !n2) return '';
    return `<line x1="${n1.x}%" y1="${n1.y}%" x2="${n2.x}%" y2="${n2.y}%"
      stroke="var(--primario)" stroke-width="3" opacity=".65"/>`;
  }).join('');
}

let _trascinaNodo = null;

/**
 * Trascinamento dei nodi: si collega UNA VOLTA SOLA alla tela.
 * Usa i "pointer event", che valgono insieme per dito, mouse e penna, e
 * la cattura del puntatore: così il rilascio arriva sempre, anche se il
 * dito esce dalla tela.
 * (Prima il rilascio era registrato con { once: true }: dopo il primo
 * rilascio non esisteva più e il nodo restava appiccicato al cursore.)
 */
function collegaTrascinamento(tela) {
  if (tela._trascinamentoCollegato) return;
  tela._trascinamentoCollegato = true;

  const SOGLIA = 6;   // sotto questi pixel è un clic, non un trascinamento

  tela.addEventListener('pointerdown', (e) => {
    const nd = e.target.closest('.nodo');
    if (!nd) return;
    const stavaCollegando = !!Mappa.collegando;
    scegliNodo(nd.dataset.nodo);
    // se stavo collegando due nodi la mappa è stata ridisegnata: niente trascinamento
    if (stavaCollegando || !nd.isConnected) return;
    _trascinaNodo = { id: nd.dataset.nodo, elemento: nd, x0: e.clientX, y0: e.clientY, mosso: false };
    try { nd.setPointerCapture(e.pointerId); } catch (err) { /* non indispensabile */ }
  });

  tela.addEventListener('pointermove', (e) => {
    if (!_trascinaNodo) return;
    if (!_trascinaNodo.mosso &&
        Math.abs(e.clientX - _trascinaNodo.x0) < SOGLIA &&
        Math.abs(e.clientY - _trascinaNodo.y0) < SOGLIA) return;
    const m = mappaCorrente();
    const n = m && m.nodi.find((x) => x.id === _trascinaNodo.id);
    if (!n) return;
    _trascinaNodo.mosso = true;
    const r = tela.getBoundingClientRect();
    n.x = limita((e.clientX - r.left) / r.width * 100, 3, 97);
    n.y = limita((e.clientY - r.top) / r.height * 100, 5, 95);
    _trascinaNodo.elemento.style.left = n.x + '%';
    _trascinaNodo.elemento.style.top = n.y + '%';
    aggiornaArchi();
    if (e.cancelable) e.preventDefault();
  });

  const rilascia = (e) => {
    if (!_trascinaNodo) return;
    const mosso = _trascinaNodo.mosso;
    try { _trascinaNodo.elemento.releasePointerCapture(e.pointerId); } catch (err) { /* già rilasciato */ }
    _trascinaNodo = null;
    if (mosso) salva();
  };
  tela.addEventListener('pointerup', rilascia);
  tela.addEventListener('pointercancel', rilascia);
  // rete di sicurezza: una volta sola per tutta l'applicazione, altrimenti
  // si accumulerebbe un ascoltatore a ogni ingresso nella sezione Mappe
  if (!collegaTrascinamento.reteMessa) {
    collegaTrascinamento.reteMessa = true;
    window.addEventListener('pointerup', (e) => {
      if (!_trascinaNodo) return;
      const mosso = _trascinaNodo.mosso;
      _trascinaNodo = null;
      if (mosso) salva();
    });
    window.addEventListener('blur', () => { _trascinaNodo = null; });
  }

  // tastiera: frecce per spostare, Invio per modificare
  tela.addEventListener('keydown', (e) => {
    const nd = e.target.closest('.nodo');
    if (!nd) return;
    const m = mappaCorrente();
    const n = m && m.nodi.find((x) => x.id === nd.dataset.nodo);
    if (!n) return;
    if (e.key === 'Enter') { e.preventDefault(); modificaNodo(nd.dataset.nodo); return; }
    const passo = 3;
    if (e.key === 'ArrowUp') n.y = limita(n.y - passo, 5, 95);
    else if (e.key === 'ArrowDown') n.y = limita(n.y + passo, 5, 95);
    else if (e.key === 'ArrowLeft') n.x = limita(n.x - passo, 3, 97);
    else if (e.key === 'ArrowRight') n.x = limita(n.x + passo, 3, 97);
    else return;
    e.preventDefault();
    nd.style.left = n.x + '%';
    nd.style.top = n.y + '%';
    aggiornaArchi();
    salva();
  });
}

function scegliNodo(id) {
  Mappa.scelto = id;
  const m = mappaCorrente();
  const n = m && m.nodi.find((x) => x.id === id);
  $$('.nodo').forEach((x) => x.classList.toggle('scelto', x.dataset.nodo === id));
  const box = $('#mpAzioniNodo');
  if (!box || !n) return;
  if (Mappa.collegando && Mappa.collegando !== id) {
    m.archi.push({ da: Mappa.collegando, a: id });
    Mappa.collegando = null;
    salva();
    disegnaMappa();
    avvisoOk('Nodi collegati');
    return;
  }
  box.innerHTML = `<div class="card">
    <h3>Nodo scelto: ${esc(accorcia(n.testo, 40))}</h3>
    <div class="barra-btn" style="margin:0">
      ${bottone('mp-modnodo:' + id, '✏️', 'Cambia il testo')}
      ${bottone('mp-figlio:' + id, '➕', 'Aggiungi un sotto-argomento', 'btn-primario')}
      ${bottone('mp-immagine:' + id, '🖼️', n.img ? 'Cambia immagine' : 'Metti un\'immagine')}
      ${n.img ? bottone('mp-toglimg:' + id, '🚫', 'Togli l\'immagine') : ''}
      ${bottone('mp-daqui:' + id, '🔗', 'Collega a un altro nodo')}
      ${bottone('mp-grande:' + id, '🔠', 'Più grande')}
      ${bottone('mp-piccolo:' + id, '🔡', 'Più piccolo')}
      ${n.centrale ? '' : bottone('mp-elimina:' + id, '🗑️', 'Elimina nodo', 'btn-errore')}
    </div>
  </div>`;
}

async function aggiungiNodo(padre) {
  const m = mappaCorrente();
  if (!m) return;
  const t = await chiediTesto('Nuovo nodo', 'Che cosa ci scrivo?', '');
  if (!t) return;
  const p = padre && m.nodi.find((x) => x.id === padre);
  const n = {
    id: uid('nd'), testo: t,
    x: p ? limita(p.x + (Math.random() * 40 - 20), 8, 92) : 50,
    y: p ? limita(p.y + 22, 8, 92) : 60
  };
  m.nodi.push(n);
  if (p) m.archi.push({ da: p.id, a: n.id });
  await salvaOra();
  disegnaMappa();
}

async function modificaNodo(id) {
  const m = mappaCorrente();
  const n = m && m.nodi.find((x) => x.id === id);
  if (!n) return;
  const t = await chiediTesto('Modifica il nodo', 'Testo', n.testo);
  if (t === null) return;
  n.testo = t;
  await salvaOra();
  disegnaMappa();
}

/** Mette (o cambia) l'immagine di un nodo. Sul telefono il selettore
    propone anche la fotocamera, così si può fotografare il libro. */
async function immagineNodo(id) {
  const m = mappaCorrente();
  const n = m && m.nodi.find((x) => x.id === id);
  if (!n) return;
  const file = await scegliFile('image/*');
  if (!file) return;
  toast('Sto preparando l\'immagine…');
  try {
    n.img = await immagineRidotta(file, 420);
    await salvaOra();
    disegnaMappa();
    scegliNodo(id);
    avvisoOk('Immagine aggiunta');
  } catch (e) {
    avvisoErrore('Non sono riuscito a usare questa immagine. Prova con una foto o un file .jpg o .png.');
  }
}

async function togliImmagineNodo(id) {
  const m = mappaCorrente();
  const n = m && m.nodi.find((x) => x.id === id);
  if (!n) return;
  delete n.img;
  await salvaOra();
  disegnaMappa();
  scegliNodo(id);
}

async function esportaMappa() {
  const m = mappaCorrente();
  if (!m) return;
  const r = await finestra({
    titolo: 'Esporta la mappa',
    campi: [{ nome: 'f', etichetta: 'Formato', tipo: 'scelta', valore: 'png',
      opzioni: [{ v: 'png', t: 'Immagine PNG' }, { v: 'svg', t: 'Disegno SVG' }, { v: 'json', t: 'Dati JSON' }] }],
    testoOk: 'Esporta'
  });
  if (!r) return;
  const nome = (m.titolo || 'mappa').replace(/[^\wÀ-ÿ -]/g, '').trim().replace(/\s+/g, '-').toLowerCase();
  if (r.f === 'json') { scaricaFile(nome + '.json', JSON.stringify(m, null, 2), 'application/json'); return; }
  if (r.f === 'svg') { scaricaFile(nome + '.svg', mappaSvg(m), 'image/svg+xml'); return; }
  // PNG disegnato direttamente sul canvas: così le immagini dei nodi
  // finiscono davvero dentro il file (passando dall'SVG i browser le bloccano).
  try {
    const blob = await mappaPng(m);
    scaricaFile(nome + '.png', blob, 'image/png');
  } catch (e) {
    avvisoErrore('Non sono riuscito a creare l\'immagine. Prova con il formato SVG.');
  }
}

/** Disegna la mappa su un canvas e restituisce il PNG. */
function mappaPng(m) {
  const W = 1400, H = 1000;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
  const px = (n) => n.x / 100 * W, py = (n) => n.y / 100 * H;

  // prima carico tutte le immagini dei nodi
  const caricamenti = m.nodi.map((n) => new Promise((risolvi) => {
    const dato = immagineSicura(n.img);
    if (!dato) { risolvi(null); return; }
    const im = new Image();
    im.onload = () => risolvi(im);
    im.onerror = () => risolvi(null);
    im.src = dato;
  }));

  return Promise.all(caricamenti).then((immagini) => {
    g.strokeStyle = '#1d4e6f'; g.lineWidth = 3;
    m.archi.forEach((a) => {
      const n1 = m.nodi.find((n) => n.id === a.da), n2 = m.nodi.find((n) => n.id === a.a);
      if (!n1 || !n2) return;
      g.beginPath(); g.moveTo(px(n1), py(n1)); g.lineTo(px(n2), py(n2)); g.stroke();
    });

    g.textAlign = 'center'; g.textBaseline = 'middle';
    m.nodi.forEach((n, i) => {
      const im = immagini[i];
      const dim = 20 * (n.dim || 1);
      g.font = 'bold ' + dim + 'px system-ui, sans-serif';
      const righe = spezzaTesto(g, n.testo, 260);
      const largImg = im ? 150 : 0;
      const altImg = im ? Math.round(150 * (im.height / im.width)) : 0;
      const larg = Math.max(110, largImg + 20, Math.max.apply(null, righe.map((t) => g.measureText(t).width)) + 34);
      const alt = altImg + righe.length * (dim + 6) + 24;
      const x = px(n) - larg / 2, y = py(n) - alt / 2;

      g.fillStyle = n.centrale ? '#1d4e6f' : '#e3eef6';
      g.strokeStyle = '#1d4e6f'; g.lineWidth = 3;
      rettangoloTondo(g, x, y, larg, alt, 14);
      g.fill(); g.stroke();

      if (im) {
        try { g.drawImage(im, px(n) - largImg / 2, y + 10, largImg, altImg); } catch (e) { /* la salto */ }
      }
      g.fillStyle = n.centrale ? '#ffffff' : '#16242e';
      righe.forEach((t, k) => {
        g.fillText(t, px(n), y + altImg + 16 + k * (dim + 6) + dim / 2);
      });
    });

    g.fillStyle = '#16242e'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    g.font = 'bold 26px system-ui, sans-serif';
    g.fillText(m.titolo || 'Mappa', 26, 44);

    return new Promise((risolvi, rifiuta) => {
      cv.toBlob((b) => (b ? risolvi(b) : rifiuta(new Error('png'))), 'image/png');
    });
  });
}

function rettangoloTondo(g, x, y, l, a, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + l, y, x + l, y + a, r);
  g.arcTo(x + l, y + a, x, y + a, r);
  g.arcTo(x, y + a, x, y, r);
  g.arcTo(x, y, x + l, y, r);
  g.closePath();
}

function spezzaTesto(g, testo, largMax) {
  const parole = String(testo || '').split(/\s+/).filter(Boolean);
  const righe = [];
  let riga = '';
  parole.forEach((p) => {
    const prova = riga ? riga + ' ' + p : p;
    if (g.measureText(prova).width > largMax && riga) { righe.push(riga); riga = p; }
    else riga = prova;
  });
  if (riga) righe.push(riga);
  return righe.length ? righe.slice(0, 4) : [''];
}

function mappaSvg(m) {
  const W = 1200, H = 800;
  const px = (n) => (n.x / 100 * W).toFixed(0), py = (n) => (n.y / 100 * H).toFixed(0);
  const archi = m.archi.map((a) => {
    const n1 = m.nodi.find((n) => n.id === a.da), n2 = m.nodi.find((n) => n.id === a.a);
    return (n1 && n2) ? `<line x1="${px(n1)}" y1="${py(n1)}" x2="${px(n2)}" y2="${py(n2)}" stroke="#1d4e6f" stroke-width="3"/>` : '';
  }).join('');
  const nodi = m.nodi.map((n) => {
    const img = immagineSicura(n.img);
    const larg = Math.max(img ? 160 : 90, Math.min(300, n.testo.length * 11));
    const altImg = img ? 110 : 0;
    const alt = altImg + 48;
    const y0 = py(n) - alt / 2;
    return `<g><rect x="${px(n) - larg / 2}" y="${y0}" width="${larg}" height="${alt}" rx="12"
      fill="${n.centrale ? '#1d4e6f' : '#e3eef6'}" stroke="#1d4e6f" stroke-width="3"/>
      ${img ? `<image href="${esc(img)}" x="${px(n) - 70}" y="${y0 + 8}" width="140" height="${altImg - 16}" preserveAspectRatio="xMidYMid meet"/>` : ''}
      <text x="${px(n)}" y="${y0 + altImg + 30}" text-anchor="middle" font-family="sans-serif" font-size="18"
      font-weight="bold" fill="${n.centrale ? '#ffffff' : '#16242e'}">${esc(accorcia(n.testo, 26))}</text></g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <rect width="${W}" height="${H}" fill="#ffffff"/>
    <text x="24" y="40" font-family="sans-serif" font-size="24" font-weight="bold" fill="#16242e">${esc(m.titolo)}</text>
    ${archi}${nodi}</svg>`;
}

/* ------------------------------------------------------------------
   APPUNTI
   ------------------------------------------------------------------ */

const COLORI_APPUNTO = ['#e3eef6', '#fde9d0', '#e2f3e9', '#fbe6e2', '#efe2f6', '#f6f2d0'];

VISTE.appunti = function (c) {
  c.innerHTML = testaSezione('📓', 'I miei appunti', null,
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:8px">
        ${bottone('ap-nuovo', '➕', 'Nuovo appunto', 'btn-primario btn-grande')}
      </div>
      <label class="etichetta" for="apCerca">🔍 Cerca nei miei appunti</label>
      <input class="campo" id="apCerca" type="search" placeholder="Scrivi una parola" autocomplete="off">
    </div>
    <div id="apLista"></div>`;
  $('#apCerca', c).addEventListener('input', debounce(disegnaAppunti, 180));
  disegnaAppunti();
};

function disegnaAppunti() {
  const box = $('#apLista');
  if (!box) return;
  const q = (($('#apCerca') || {}).value || '').trim().toLowerCase();
  const lista = Stato.appunti.filter((a) => !q ||
    ((a.titolo || '') + ' ' + (a.testo || '') + ' ' + (a.chiavi || '') + ' ' + (a.materia || '')).toLowerCase().indexOf(q) >= 0);
  box.innerHTML = lista.length ? lista.map((a) => `
    <div class="card" style="background:${esc(a.colore || 'var(--superficie)')}">
      <div class="card-titolo">
        <h3 style="margin:0">${esc(a.titolo || 'Senza titolo')}</h3>
        <span class="tag">${esc(a.materia || 'Altra')}</span>
      </div>
      <p class="aiutino" style="margin-top:0">${esc(dataInParole(a.data))}${a.fonte ? ' · ' + esc(a.fonte) : ''}</p>
      <p style="white-space:pre-wrap">${esc(accorcia(a.testo, 400))}</p>
      ${a.chiavi ? `<p><b>Parole chiave:</b> ${esc(a.chiavi)}</p>` : ''}
      <div class="barra-btn" style="margin:0">
        ${bottone('ap-apri:' + a.id, '👁️', 'Apri tutto', 'btn-piccolo')}
        ${bottone('ap-leggi:' + a.id, '🔊', 'Ascolta', 'btn-piccolo')}
        ${bottone('ap-mod:' + a.id, '✏️', 'Modifica', 'btn-piccolo')}
        ${bottone('ap-flash:' + a.id, '🃏', 'Fanne una flashcard', 'btn-piccolo')}
        ${bottone('ap-canc:' + a.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
      </div>
    </div>`).join('')
    : `<div class="card">${schedaVuota('📓', q ? 'Nessun appunto con questa parola.' : 'Non hai ancora appunti.',
        q ? 'Prova con una parola diversa.' : 'Tocca "Nuovo appunto" per cominciare.')}</div>`;
}

async function modificaAppunto(id, precompilato) {
  const a = id ? Stato.appunti.find((x) => x.id === id) : null;
  const r = await finestra({
    titolo: a ? 'Modifica l\'appunto' : 'Nuovo appunto',
    campi: [
      { nome: 'titolo', etichetta: 'Titolo', valore: a ? a.titolo : (precompilato && precompilato.titolo) || '' },
      { nome: 'materia', etichetta: 'Materia', tipo: 'scelta', opzioni: materie(), valore: a ? a.materia : (precompilato && precompilato.materia) || materie()[0] },
      { nome: 'data', etichetta: 'Data', tipo: 'data', valore: a ? a.data : oggiISO() },
      { nome: 'testo', etichetta: 'Testo', tipo: 'area', righe: 8, valore: a ? a.testo : (precompilato && precompilato.testo) || '' },
      { nome: 'chiavi', etichetta: 'Parole chiave (facoltative)', valore: a ? a.chiavi : '' },
      { nome: 'colore', etichetta: 'Colore', tipo: 'scelta', valore: a ? a.colore : COLORI_APPUNTO[0],
        opzioni: COLORI_APPUNTO.map((c, i) => ({ v: c, t: ['Azzurro', 'Arancio', 'Verde', 'Rosa', 'Viola', 'Giallo'][i] })) }
    ],
    testoOk: 'Salva'
  });
  if (!r) return;
  if (a) Object.assign(a, r);
  else Stato.appunti.unshift(Object.assign({ id: uid('ap'), creato: oraISO(), fonte: (precompilato && precompilato.fonte) || '' }, r));
  await salvaOra();
  if ($('#apLista')) disegnaAppunti();
  avvisoOk('Appunto salvato');
}

/* ------------------------------------------------------------------
   COMPITI
   ------------------------------------------------------------------ */

const Compiti = { vista: 'oggi' };
const PRIORITA = [{ v: 'alta', t: '🔴 Importante' }, { v: 'media', t: '🟡 Normale' }, { v: 'bassa', t: '🟢 Con calma' }];

VISTE.compiti = function (c) {
  c.innerHTML = testaSezione('📅', 'Compiti', null,
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:8px">
        ${bottone('cp-nuovo', '➕', 'Nuovo compito', 'btn-primario btn-grande')}
      </div>
      <div class="barra-btn" style="margin-bottom:0">
        ${['oggi', 'domani', 'settimana', 'tutti'].map((v) => `
          <button type="button" class="btn" data-az="cp-vista:${v}" aria-pressed="${Compiti.vista === v}">
            ${esc({ oggi: 'Oggi', domani: 'Domani', settimana: 'Questa settimana', tutti: 'Tutti' }[v])}</button>`).join('')}
      </div>
    </div>
    <div id="cpLista"></div>`;
  disegnaCompiti();
};

function disegnaCompiti() {
  const box = $('#cpLista');
  if (!box) return;
  const oggi = oggiISO(), domani = giorniDaOggi(1), fine = giorniDaOggi(7);
  const filtro = (t) => {
    if (Compiti.vista === 'tutti') return true;
    if (!t.data) return Compiti.vista === 'tutti';
    if (Compiti.vista === 'oggi') return t.data <= oggi;
    if (Compiti.vista === 'domani') return t.data === domani;
    return t.data >= oggi && t.data <= fine;
  };
  const lista = Stato.compiti.filter(filtro)
    .sort((a, b) => (a.fatto - b.fatto) || String(a.data).localeCompare(String(b.data)));

  box.innerHTML = lista.length ? `<ul class="lista">${lista.map((t) => `
    <li class="voce${t.fatto ? ' fatto' : ''}">
      <label class="check" style="min-height:0">
        <input type="checkbox" data-fatto="${esc(t.id)}"${t.fatto ? ' checked' : ''}
          aria-label="segna come fatto: ${esc(accorcia(t.descrizione, 40))}">
      </label>
      <div class="corpo">
        <b>${esc(t.descrizione)}</b>
        <span class="meta">${esc(t.materia || '')}${t.data ? ' · ' + esc(dataInParole(t.data)) : ''}
          ${t.data && t.data < oggi && !t.fatto ? ' · ⚠️ era per ieri o prima' : ''}</span>
        ${t.passi && t.passi.length ? `<ol style="margin:8px 0 0;padding-left:1.3em">
          ${t.passi.map((p, i) => `<li${p.fatto ? ' style="opacity:.55;text-decoration:line-through"' : ''}>
            <label class="check" style="min-height:0;display:inline-flex">
              <input type="checkbox" data-passo="${esc(t.id)}:${i}"${p.fatto ? ' checked' : ''}>
              <span>${esc(p.testo)}</span></label></li>`).join('')}</ol>` : ''}
      </div>
      <div class="azioni">
        <span class="tag ${t.priorita === 'alta' ? 'tag-err' : t.priorita === 'bassa' ? 'tag-ok' : 'tag-att'}">
          ${esc((PRIORITA.find((p) => p.v === t.priorita) || PRIORITA[1]).t)}</span>
        ${bottone('cp-spezza:' + t.id, '🪓', 'Spezza il compito', 'btn-piccolo')}
        ${bottone('cp-mod:' + t.id, '✏️', 'Modifica', 'btn-piccolo')}
        ${bottone('cp-focus:' + t.id, '🎯', 'Fallo adesso', 'btn-piccolo btn-primario')}
        ${bottone('cp-canc:' + t.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
      </div>
    </li>`).join('')}</ul>`
    : `<div class="card">${schedaVuota('📅', 'Niente da fare qui.',
        Compiti.vista === 'oggi' ? 'Per oggi sei a posto!' : 'Prova a guardare in "Tutti".')}</div>`;
}

async function modificaCompito(id) {
  const t = id ? Stato.compiti.find((x) => x.id === id) : null;
  const r = await finestra({
    titolo: t ? 'Modifica il compito' : 'Nuovo compito',
    campi: [
      { nome: 'materia', etichetta: 'Materia', tipo: 'scelta', opzioni: materie(), valore: t ? t.materia : materie()[0] },
      { nome: 'descrizione', etichetta: 'Che cosa devo fare', tipo: 'area', righe: 2, valore: t ? t.descrizione : '' },
      { nome: 'data', etichetta: 'Per quando', tipo: 'data', valore: t ? t.data : giorniDaOggi(1) },
      { nome: 'priorita', etichetta: 'Quanto è importante', tipo: 'scelta', opzioni: PRIORITA.map((p) => ({ v: p.v, t: p.t })), valore: t ? t.priorita : 'media' }
    ],
    testoOk: 'Salva'
  });
  if (!r) return;
  if (!r.descrizione.trim()) { toast('Scrivi che cosa devi fare.'); return; }
  if (t) Object.assign(t, r);
  else Stato.compiti.unshift(Object.assign({ id: uid('cp'), fatto: false, passi: [] }, r));
  await salvaOra();
  disegnaCompiti();
  avvisoOk('Compito salvato');
}

const PASSI_SUGGERITI = [
  'Leggo la prima parte',
  'Pausa di 3 minuti',
  'Sottolineo le parole importanti',
  'Leggo la seconda parte',
  'Mi faccio 3 domande',
  'Pausa di 3 minuti',
  'Ripasso a voce alta',
  'Controllo cosa mi ricordo'
];

async function spezzaCompito(id) {
  const t = Stato.compiti.find((x) => x.id === id);
  if (!t) return;
  const attuali = (t.passi || []).map((p) => p.testo).join('\n') || PASSI_SUGGERITI.join('\n');
  const r = await finestra({
    titolo: '🪓 Spezza il compito',
    testo: 'Un compito grande fa paura. Tanti pezzi piccoli no. Cambia i passaggi come vuoi: uno per riga.',
    campi: [{ nome: 'passi', etichetta: 'I miei passaggi', tipo: 'area', righe: 9, valore: attuali }],
    testoOk: 'Salva i passaggi'
  });
  if (!r) return;
  t.passi = r.passi.split('\n').map((s) => s.trim()).filter(Boolean).map((s) => ({ testo: s, fatto: false }));
  await salvaOra();
  disegnaCompiti();
  avvisoOk('Adesso è più facile: un pezzo alla volta');
}

/* ------------------------------------------------------------------
   CONCENTRAZIONE (timer)
   ------------------------------------------------------------------ */

const Timer = {
  attivita: '', secondi: 0, totale: 0, inPausa: true, fase: 'studio',
  studio: 20, pausa: 5, riferimento: null
};

const PRESET_TIMER = [[10, 3], [15, 5], [20, 5], [25, 5]];

VISTE.focus = function (c) {
  c.innerHTML = testaSezione('🎯', 'Concentrati', null,
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="card no-stampa" id="cardImpostaTimer">
      <label class="etichetta" for="tmAttivita">Adesso fai solo questo</label>
      <input class="campo" id="tmAttivita" type="text" value="${esc(Timer.attivita)}"
        placeholder="Per esempio: leggo storia pagine 20-22">
      <label class="etichetta">Quanto tempo?</label>
      <div class="barra-btn">
        ${PRESET_TIMER.map(([s, p]) => `<button type="button" class="btn btn-grande" data-az="tm-preset:${s}:${p}"
          aria-pressed="${Timer.studio === s && Timer.pausa === p}">${s} min studio<br>+ ${p} pausa</button>`).join('')}
        ${bottone('tm-personalizzato', '⏱️', 'Scelgo io')}
      </div>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('tm-avvia', '▶', 'Comincia', 'btn-primario btn-grande')}
      </div>
    </div>
    <div id="tmSchermo"></div>`;
  if (Timer.totale) disegnaTimer();
};

function avviaTimer(studio, pausa) {
  const a = $('#tmAttivita');
  if (a) Timer.attivita = a.value.trim();
  if (studio) { Timer.studio = studio; Timer.pausa = pausa; }
  Stato.impostazioni.timerStudio = Timer.studio;
  Stato.impostazioni.timerPausa = Timer.pausa;
  salva();
  Timer.fase = 'studio';
  Timer.totale = Timer.studio * 60;
  Timer.secondi = Timer.totale;
  Timer.inPausa = false;
  cambiaFocus(true);
  battitoTimer();
  disegnaTimer();
}

function battitoTimer() {
  clearInterval(Timer.riferimento);
  Timer.riferimento = setInterval(() => {
    if (Timer.inPausa) return;
    Timer.secondi--;
    if (Timer.secondi <= 0) {
      finePeriodo();
      return;
    }
    aggiornaOrologio();
  }, 1000);
}

function finePeriodo() {
  clearInterval(Timer.riferimento);
  const eraStudio = Timer.fase === 'studio';
  Timer.fase = eraStudio ? 'pausa' : 'studio';
  Timer.totale = (eraStudio ? Timer.pausa : Timer.studio) * 60;
  Timer.secondi = Timer.totale;
  Timer.inPausa = true;
  avvisaFinePeriodo(eraStudio);
  disegnaTimer();
}

function avvisaFinePeriodo(eraStudio) {
  const testo = eraStudio ? 'Tempo! Adesso fai una pausa.' : 'Pausa finita: si riprende quando vuoi tu.';
  toast(eraStudio ? '⏰ ' + testo : '💪 ' + testo);
  // avviso sonoro semplice, generato dal dispositivo (nessun file audio)
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) {
      const ctx = new AC();
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = eraStudio ? 660 : 440;
      g.gain.setValueAtTime(0.0001, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1.1);
      o.start(); o.stop(ctx.currentTime + 1.2);
      setTimeout(() => { try { ctx.close(); } catch (e) { /* niente */ } }, 1600);
    }
  } catch (e) { /* senza suono va bene lo stesso */ }
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Studio DSA', { body: testo });
    }
  } catch (e) { /* niente */ }
}

function aggiornaOrologio() {
  const n = $('#tmOrologio');
  if (!n) return;
  n.textContent = formattaTempo(Timer.secondi);
  const b = $('#tmBarra');
  if (b) b.style.width = (100 - Timer.secondi / Timer.totale * 100) + '%';
}

function formattaTempo(s) {
  const m = Math.floor(Math.max(0, s) / 60), r = Math.max(0, s) % 60;
  return m + ':' + String(r).padStart(2, '0');
}

function disegnaTimer() {
  const box = $('#tmSchermo');
  if (!box) return;
  const impo = $('#cardImpostaTimer');
  if (impo) impo.hidden = true;
  box.innerHTML = `<div class="card">
      <p class="timer-stato">${Timer.fase === 'studio' ? 'Adesso fai solo questo' : 'Pausa'}</p>
      ${Timer.fase === 'studio' && Timer.attivita ? `<p class="timer-cosa">${esc(Timer.attivita)}</p>` : ''}
      ${Timer.fase === 'pausa' ? '<p class="timer-cosa">Alzati, bevi, guarda lontano 😊</p>' : ''}
      <div class="timer-grande" id="tmOrologio" aria-live="off">${formattaTempo(Timer.secondi)}</div>
      <div class="perc-barra"><div class="riempi" id="tmBarra" style="width:${100 - Timer.secondi / Timer.totale * 100}%"></div></div>
      <div class="barra-btn centro" style="margin-top:16px">
        <button type="button" class="btn btn-primario btn-grande" data-az="tm-pausa">
          ${Timer.inPausa ? '▶ Riprendi' : '⏸ Metti in pausa'}</button>
        ${bottone('tm-stop', '⏹', 'Ho finito', 'btn-grande')}
      </div>
    </div>`;
}

function fermaTimer() {
  clearInterval(Timer.riferimento);
  Timer.riferimento = null;
  Timer.totale = 0;
  cambiaFocus(false);
  disegna();
}

/* ------------------------------------------------------------------
   LE MIE PAROLE (vocabolario, parole difficili, inglese)
   ------------------------------------------------------------------ */

const Parole = { tab: 'vocabolario' };

VISTE.parole = function (c) {
  c.innerHTML = testaSezione('🔤', 'Le mie parole', null,
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `
    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:0">
        <button type="button" class="btn btn-grande" data-az="pr-tab:vocabolario" aria-pressed="${Parole.tab === 'vocabolario'}">📖 Vocabolario</button>
        <button type="button" class="btn btn-grande" data-az="pr-tab:difficili" aria-pressed="${Parole.tab === 'difficili'}">✏️ Parole difficili</button>
        <button type="button" class="btn btn-grande" data-az="pr-tab:inglese" aria-pressed="${Parole.tab === 'inglese'}">🇬🇧 Inglese</button>
      </div>
    </div>
    <div id="prBox"></div>`;
  disegnaParole();
};

function disegnaParole() {
  const box = $('#prBox');
  if (!box) return;
  if (Parole.tab === 'vocabolario') {
    box.innerHTML = `<div class="card">
        <p>Questo è il TUO vocabolario: non c'è nessun dizionario dentro l'app (servirebbe Internet).
          Le parole le scrivi tu, con le tue parole.</p>
        <div class="barra-btn">${bottone('pr-nuovaVoc', '➕', 'Aggiungi una parola', 'btn-primario btn-grande')}</div>
      </div>
      ${Stato.vocabolario.length ? `<ul class="lista">${Stato.vocabolario.map((v) => `
        <li class="voce"><div class="corpo">
          <b>${esc(v.parola)}</b>
          <span class="meta">${esc(v.materia || '')}</span>
          <p style="margin:6px 0 0">${esc(v.significato)}</p>
          ${v.esempio ? `<p style="margin:4px 0 0"><i>${esc(v.esempio)}</i></p>` : ''}
        </div><div class="azioni">
          ${bottone('pr-leggiVoc:' + v.id, '🔊', 'Ascolta', 'btn-piccolo')}
          ${bottone('pr-modVoc:' + v.id, '✏️', 'Modifica', 'btn-piccolo')}
          ${bottone('pr-cancVoc:' + v.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
        </div></li>`).join('')}</ul>`
        : `<div class="card">${schedaVuota('📖', 'Il vocabolario è vuoto.')}</div>`}`;
  } else if (Parole.tab === 'difficili') {
    box.innerHTML = `<div class="card">
        <p>Le parole che sbagli spesso. Scriverle qui, con la sillabazione fatta da te, aiuta a ricordarle.</p>
        <div class="barra-btn">${bottone('pr-nuovaDiff', '➕', 'Aggiungi una parola difficile', 'btn-primario btn-grande')}</div>
      </div>
      ${Stato.paroleDifficili.length ? Stato.paroleDifficili.map((v) => `
        <div class="card">
          <h3 style="margin-bottom:4px">${esc(v.parola)}</h3>
          ${v.sillabe ? `<p class="mate" style="font-size:1.3em;letter-spacing:.08em">${esc(v.sillabe)}</p>` : ''}
          ${v.errore ? `<p><b>❌ Come la sbaglio:</b> ${esc(v.errore)}</p>` : ''}
          ${v.esempio ? `<p><b>Esempio:</b> ${esc(v.esempio)}</p>` : ''}
          <div class="barra-btn" style="margin:0">
            ${bottone('pr-leggiDiff:' + v.id, '🔊', 'Ascolta la parola', 'btn-piccolo')}
            ${bottone('pr-modDiff:' + v.id, '✏️', 'Modifica', 'btn-piccolo')}
            ${bottone('pr-cancDiff:' + v.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
          </div>
        </div>`).join('')
        : `<div class="card">${schedaVuota('✏️', 'Non hai ancora segnato nessuna parola.')}</div>`}`;
  } else {
    box.innerHTML = `<div class="card">
        <div class="barra-btn">
          ${bottone('pr-nuovaEn', '➕', 'Aggiungi un vocabolo', 'btn-primario btn-grande')}
          ${bottone('pr-flashEn', '🃏', 'Crea flashcard inglese ⇄ italiano')}
        </div>
      </div>
      ${Stato.inglese.length ? `<div class="tabella-scroll"><table class="tab">
        <tr><th>English</th><th>Italiano</th><th>Esempio</th><th></th></tr>
        ${Stato.inglese.map((v) => `<tr>
          <td><b>${esc(v.en)}</b></td><td>${esc(v.it)}</td><td><i>${esc(v.esempio || '')}</i></td>
          <td style="white-space:nowrap">
            ${bottone('pr-leggiEn:' + v.id, '🔊', '', 'btn-piccolo')}
            ${bottone('pr-cancEn:' + v.id, '🗑️', '', 'btn-piccolo btn-errore')}</td>
        </tr>`).join('')}</table></div>`
        : `<div class="card">${schedaVuota('🇬🇧', 'Nessun vocabolo inglese.')}</div>`}`;
  }
}

async function nuovaParola(tipo, id) {
  if (tipo === 'vocabolario') {
    const v = id ? Stato.vocabolario.find((x) => x.id === id) : null;
    const r = await finestra({
      titolo: v ? 'Modifica la parola' : 'Nuova parola',
      campi: [
        { nome: 'parola', etichetta: 'Parola', valore: v ? v.parola : '' },
        { nome: 'significato', etichetta: 'Significato (con parole tue)', tipo: 'area', righe: 3, valore: v ? v.significato : '' },
        { nome: 'esempio', etichetta: 'Esempio', valore: v ? v.esempio : '' },
        { nome: 'materia', etichetta: 'Materia', tipo: 'scelta', opzioni: materie(), valore: v ? v.materia : materie()[0] }
      ], testoOk: 'Salva'
    });
    if (!r || !r.parola.trim()) return;
    if (v) Object.assign(v, r); else Stato.vocabolario.unshift(Object.assign({ id: uid('vc') }, r));
  } else if (tipo === 'difficili') {
    const v = id ? Stato.paroleDifficili.find((x) => x.id === id) : null;
    const r = await finestra({
      titolo: v ? 'Modifica' : 'Una parola difficile',
      campi: [
        { nome: 'parola', etichetta: 'Parola scritta giusta', valore: v ? v.parola : '' },
        { nome: 'errore', etichetta: 'Come la sbaglio di solito', valore: v ? v.errore : '' },
        { nome: 'sillabe', etichetta: 'Divisa in sillabe (scrivila tu)', valore: v ? v.sillabe : '', aiuto: 'Per esempio: ac-qua' },
        { nome: 'esempio', etichetta: 'Frase di esempio', valore: v ? v.esempio : '' }
      ], testoOk: 'Salva'
    });
    if (!r || !r.parola.trim()) return;
    if (v) Object.assign(v, r); else Stato.paroleDifficili.unshift(Object.assign({ id: uid('pd') }, r));
  } else {
    const r = await finestra({
      titolo: 'Nuovo vocabolo inglese',
      campi: [
        { nome: 'en', etichetta: 'English', valore: '' },
        { nome: 'it', etichetta: 'Italiano', valore: '' },
        { nome: 'esempio', etichetta: 'Esempio', valore: '' }
      ], testoOk: 'Salva'
    });
    if (!r || !r.en.trim()) return;
    Stato.inglese.unshift(Object.assign({ id: uid('en') }, r));
  }
  await salvaOra();
  disegnaParole();
  avvisoOk('Salvato');
}

async function flashcardInglese() {
  if (!Stato.inglese.length) { toast('Prima aggiungi qualche vocabolo.'); return; }
  const r = await finestra({
    titolo: 'Flashcard di inglese',
    campi: [{ nome: 'verso', etichetta: 'In che verso?', tipo: 'scelta', valore: 'en-it',
      opzioni: [{ v: 'en-it', t: 'Inglese → Italiano' }, { v: 'it-en', t: 'Italiano → Inglese' }, { v: 'due', t: 'Tutte e due' }] }],
    testoOk: 'Crea'
  });
  if (!r) return;
  let n = 0;
  Stato.inglese.forEach((v) => {
    if (r.verso === 'en-it' || r.verso === 'due') { Stato.flashcard.unshift(nuovaCard(v.en, v.it, 'Inglese')); n++; }
    if (r.verso === 'it-en' || r.verso === 'due') { Stato.flashcard.unshift(nuovaCard(v.it, v.en, 'Inglese')); n++; }
  });
  await salvaOra();
  avvisoOk('Ho creato ' + n + ' flashcard');
}
