/* ==================================================================
   04-lettura.js — sezione LEGGI, righello, una frase / una parola
   ================================================================== */

/* ------------------------------------------------------------------
   Righello di lettura (una / tre / cinque righe)
   ------------------------------------------------------------------ */

const Righello = (function () {
  let aperto = false;
  let centro = 0;          // posizione verticale (px nella finestra)
  let altezza = 120;

  function altezzaRiga() {
    const i = Stato.impostazioni;
    return Math.max(20, Number(i.dimensione) * Number(i.interlinea));
  }

  function calcolaAltezza() {
    const righe = Number(Stato.impostazioni.righelloRighe) || 3;
    altezza = altezzaRiga() * righe + 8;
  }

  function disegna() {
    const box = $('#righello');
    if (!aperto) { box.hidden = true; box.innerHTML = ''; return; }
    const h = window.innerHeight;
    const top = limita(centro - altezza / 2, 0, Math.max(0, h - altezza));
    box.hidden = false;
    box.innerHTML =
      `<div class="velo" style="top:0;height:${top}px"></div>
       <div class="finestra" style="top:${top}px;height:${altezza}px"></div>
       <div class="velo" style="top:${top + altezza}px;height:${Math.max(0, h - top - altezza)}px"></div>`;
    let barra = $('.righello-attivo');
    if (!barra) {
      barra = document.createElement('div');
      barra.className = 'righello-attivo';
      barra.innerHTML = `
        <button type="button" class="btn btn-piccolo" data-r="su" aria-label="Sposta il righello in alto">⬆</button>
        <button type="button" class="btn btn-piccolo" data-r="giu" aria-label="Sposta il righello in basso">⬇</button>
        <button type="button" class="btn btn-piccolo" data-r="righe">Righe: ${Stato.impostazioni.righelloRighe}</button>
        <button type="button" class="btn btn-piccolo btn-errore" data-r="chiudi">✕ Chiudi</button>`;
      document.body.appendChild(barra);
      barra.addEventListener('click', (e) => {
        const b = e.target.closest('[data-r]');
        if (!b) return;
        if (b.dataset.r === 'su') muovi(-altezzaRiga());
        else if (b.dataset.r === 'giu') muovi(altezzaRiga());
        else if (b.dataset.r === 'righe') {
          const seq = [1, 3, 5];
          const i = seq.indexOf(Number(Stato.impostazioni.righelloRighe));
          Stato.impostazioni.righelloRighe = seq[(i + 1) % seq.length];
          salva(); calcolaAltezza(); b.textContent = 'Righe: ' + Stato.impostazioni.righelloRighe; disegna();
        } else chiudi();
      });
    }
  }

  function muovi(dy) { centro = limita(centro + dy, 0, window.innerHeight); disegna(); }

  function daEvento(e) {
    const y = (e.touches && e.touches[0]) ? e.touches[0].clientY : e.clientY;
    if (typeof y === 'number') { centro = y; disegna(); }
  }

  function tasti(e) {
    if (!aperto) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); muovi(altezzaRiga()); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); muovi(-altezzaRiga()); }
    else if (e.key === 'Escape') { chiudi(); }
  }

  function apri() {
    if (aperto) return;
    aperto = true;
    centro = window.innerHeight * 0.45;
    calcolaAltezza();
    disegna();
    document.addEventListener('mousemove', daEvento);
    document.addEventListener('touchmove', daEvento, { passive: true });
    document.addEventListener('keydown', tasti);
    window.addEventListener('resize', disegna);
    toast('Righello attivo: muovi il dito o il mouse, oppure usa ⬆ ⬇');
  }

  function chiudi() {
    if (!aperto) return;
    aperto = false;
    document.removeEventListener('mousemove', daEvento);
    document.removeEventListener('touchmove', daEvento);
    document.removeEventListener('keydown', tasti);
    window.removeEventListener('resize', disegna);
    const barra = $('.righello-attivo');
    if (barra) barra.remove();
    disegna();
    $$('[data-az="righello"]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
  }

  function alterna() { aperto ? chiudi() : apri(); return aperto; }
  return { apri, chiudi, alterna, get aperto() { return aperto; } };
})();

function chiudiRighello() { Righello.chiudi(); }

/* ------------------------------------------------------------------
   Costruzione del foglio di lettura con le frasi cliccabili
   ------------------------------------------------------------------ */

/** Restituisce { html, frasi } — le frasi servono per la sintesi vocale. */
function fogliaTesto(testo) {
  const paragrafi = String(testo || '').split(/\n{2,}/);
  const frasi = [];
  let n = 0;
  const html = paragrafi.map((p) => {
    const pezzi = dividiInFrasi(p);
    if (!pezzi.length) return '';
    return '<p>' + pezzi.map((f) => {
      frasi.push(f);
      return `<span class="frase" data-f="${n++}" tabindex="0" role="button">${esc(f)}</span> `;
    }).join('') + '</p>';
  }).join('');
  return { html: html || '<p></p>', frasi };
}

/* ------------------------------------------------------------------
   SEZIONE: LEGGI
   ------------------------------------------------------------------ */

let _lettura = { testo: '', frasi: [], titolo: '', id: null, modo: 'normale', frase: 0, parola: 0, timerParole: null };

VISTE.leggi = function (c, par) {
  if (par) {
    const t = Stato.testi.find((x) => x.id === par);
    if (t) { _lettura.testo = t.testo; _lettura.titolo = t.titolo; _lettura.id = t.id; }
  }
  c.innerHTML = testaSezione('📖', 'Leggi', 'Incolla o apri un testo: lo rendiamo più facile da leggere.',
    bottone('home', '🏠', 'Home', 'btn-piccolo')) + `

    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:0">
        ${bottone('leggi-incolla', '📋', 'Scrivi o incolla un testo', 'btn-primario')}
        ${bottone('leggi-importa', '📂', 'Apri un file (.txt / .md)')}
        ${bottone('leggi-salvati', '📚', 'I miei testi salvati')}
        ${bottone('leggi-da-pdf', '📄', 'Prendi da un PDF')}
      </div>
    </div>

    <div id="areaLettura"></div>`;

  disegnaAreaLettura();
};

function disegnaAreaLettura() {
  const box = $('#areaLettura');
  if (!box) return;
  if (!_lettura.testo.trim()) {
    box.innerHTML = `<div class="card">${schedaVuota('📖', 'Non c\'è ancora niente da leggere.',
      'Tocca "Scrivi o incolla un testo" oppure apri un file dal dispositivo.')}</div>`;
    return;
  }

  const modo = _lettura.modo;
  box.innerHTML = `
    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:8px">
        <button type="button" class="btn" data-az="modo:normale" aria-pressed="${modo === 'normale'}"><span aria-hidden="true">📄</span><span>Tutto il testo</span></button>
        <button type="button" class="btn" data-az="modo:frase" aria-pressed="${modo === 'frase'}"><span aria-hidden="true">1️⃣</span><span>Una frase alla volta</span></button>
        <button type="button" class="btn" data-az="modo:parola" aria-pressed="${modo === 'parola'}"><span aria-hidden="true">👁️</span><span>Una parola alla volta</span></button>
      </div>
      <div class="barra-btn" style="margin-bottom:0">
        <button type="button" class="btn" data-az="righello" aria-pressed="${Righello.aperto}"><span aria-hidden="true">📏</span><span>Righello</span></button>
        <button type="button" class="btn" data-az="sillabe" aria-pressed="${Stato.impostazioni.spaziaturaSillabe}"><span aria-hidden="true">🔠</span><span>Più spazio tra le parole</span></button>
        ${bottone('impo', '⚙️', 'Come si vede')}
        ${bottone('leggi-salva', '💾', 'Salva questo testo')}
        ${bottone('leggi-appunto', '📓', 'Porta negli appunti')}
        ${bottone('leggi-stampa', '🖨️', 'Stampa / PDF')}
      </div>
    </div>
    <div id="barraVoce" class="no-stampa"></div>
    <div id="corpoLettura"></div>`;

  const dati = fogliaTesto(_lettura.testo);
  _lettura.frasi = dati.frasi;

  const corpo = $('#corpoLettura');
  if (modo === 'normale') {
    corpo.innerHTML = `<div class="foglio"><div class="foglio-testo${Stato.impostazioni.spaziaturaSillabe ? ' sillabe' : ''}" id="foglioTesto">${dati.html}</div></div>`;
    corpo.addEventListener('click', (e) => {
      const f = e.target.closest('.frase');
      if (!f) return;
      $$('.frase.attiva', corpo).forEach((x) => x.classList.remove('attiva'));
      f.classList.add('attiva');
    });
    corpo.addEventListener('keydown', (e) => {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('frase')) {
        e.preventDefault(); e.target.click();
      }
    });
  } else if (modo === 'frase') {
    disegnaModoFrase(corpo);
  } else {
    disegnaModoParola(corpo);
  }

  const bv = $('#barraVoce');
  bv.innerHTML = '';
  bv.appendChild(barraLettura(
    () => (_lettura.modo === 'frase' ? [_lettura.frasi[_lettura.frase] || ''] : _lettura.frasi),
    {
      onFrase: (i) => {
        const n = $('#foglioTesto [data-f="' + i + '"]');
        if (n) {
          $$('#foglioTesto .frase.attiva').forEach((x) => x.classList.remove('attiva'));
          n.classList.add('attiva');
          n.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
      },
      onFine: () => { $$('#foglioTesto .frase.attiva').forEach((x) => x.classList.remove('attiva')); }
    }
  ));
}

/* ---- una frase alla volta ---------------------------------------- */
function disegnaModoFrase(corpo) {
  const i = limita(_lettura.frase, 0, Math.max(0, _lettura.frasi.length - 1));
  _lettura.frase = i;
  corpo.innerHTML = `
    <div class="frase-schermo">${esc(_lettura.frasi[i] || '')}</div>
    <p class="frase-contatore">Frase ${i + 1} di ${_lettura.frasi.length}</p>
    <div class="barra-btn centro no-stampa">
      ${bottone('frase-prec', '⬅', 'Precedente', 'btn-grande')}
      ${bottone('frase-ascolta', '🔊', 'Ascolta', 'btn-primario btn-grande')}
      ${bottone('frase-succ', '➡', 'Successiva', 'btn-grande')}
    </div>`;
}

/* ---- una parola alla volta (lettura focale) ---------------------- */
const VELOCITA_PAROLE = [
  { et: 'Molto lenta', ms: 900 }, { et: 'Lenta', ms: 620 },
  { et: 'Normale', ms: 420 }, { et: 'Veloce', ms: 280 }
];
let _velParole = 1;

function disegnaModoParola(corpo) {
  const parole = dividiInParole(_lettura.testo);
  _lettura.parole = parole;
  const i = limita(_lettura.parola, 0, Math.max(0, parole.length - 1));
  _lettura.parola = i;
  corpo.innerHTML = `
    <div class="parola-schermo" id="schermoParola">${esc(parole[i] || '')}</div>
    <p class="frase-contatore">Parola ${i + 1} di ${parole.length}</p>
    <div class="barra-btn centro no-stampa">
      ${bottone('parola-prec', '⬅', 'Indietro')}
      ${bottone('parola-play', '▶', 'Avvia', 'btn-primario btn-grande')}
      ${bottone('parola-succ', '➡', 'Avanti')}
      ${bottone('parola-stop', '⏹', 'Ferma')}
    </div>
    <div class="barra-btn centro no-stampa">
      ${VELOCITA_PAROLE.map((v, k) => `<button type="button" class="btn btn-piccolo" data-az="parola-vel:${k}" aria-pressed="${k === _velParole}">${esc(v.et)}</button>`).join('')}
    </div>`;
}

function avviaParole() {
  fermaParole();
  _lettura.timerParole = setInterval(() => {
    if (_lettura.parola >= _lettura.parole.length - 1) { fermaParole(); return; }
    _lettura.parola++;
    const s = $('#schermoParola');
    if (s) s.textContent = _lettura.parole[_lettura.parola];
    const cont = $('.frase-contatore');
    if (cont) cont.textContent = 'Parola ' + (_lettura.parola + 1) + ' di ' + _lettura.parole.length;
  }, VELOCITA_PAROLE[_velParole].ms);
}
function fermaParole() { if (_lettura.timerParole) { clearInterval(_lettura.timerParole); _lettura.timerParole = null; } }

/* ------------------------------------------------------------------
   Azioni della sezione LEGGI
   ------------------------------------------------------------------ */

async function letturaIncolla() {
  const r = await finestra({
    titolo: 'Scrivi o incolla il testo',
    campi: [
      { nome: 'titolo', etichetta: 'Titolo (facoltativo)', valore: _lettura.titolo || '' },
      { nome: 'testo', etichetta: 'Testo', tipo: 'area', righe: 10, valore: _lettura.testo || '' }
    ],
    testoOk: 'Leggi'
  });
  if (!r) return;
  _lettura.testo = r.testo; _lettura.titolo = r.titolo; _lettura.id = null;
  _lettura.frase = 0; _lettura.parola = 0;
  disegnaAreaLettura();
}

async function letturaImporta() {
  const f = await scegliFile('.txt,.md,text/plain,text/markdown');
  if (!f) return;
  if (f.size > 3 * 1024 * 1024) {
    avvisoErrore('Questo file è molto grande: potrebbe rallentare il dispositivo.');
  }
  try {
    const t = await leggiFileTesto(f);
    _lettura.testo = t;
    _lettura.titolo = f.name.replace(/\.(txt|md)$/i, '');
    _lettura.id = null; _lettura.frase = 0; _lettura.parola = 0;
    disegnaAreaLettura();
    avvisoOk('Testo aperto');
  } catch (e) {
    avvisoErrore('Non sono riuscito ad aprire questo file. Deve essere un file di testo semplice.');
  }
}

async function letturaSalva() {
  const titolo = await chiediTesto('Salva il testo', 'Che nome gli diamo?', _lettura.titolo || 'Testo del ' + dataInParole(oggiISO()));
  if (titolo === null) return;
  if (_lettura.id) {
    const t = Stato.testi.find((x) => x.id === _lettura.id);
    if (t) { t.titolo = titolo; t.testo = _lettura.testo; t.modificato = oraISO(); }
  } else {
    const t = { id: uid('testo'), titolo, testo: _lettura.testo, creato: oraISO(), modificato: oraISO() };
    Stato.testi.unshift(t);
    _lettura.id = t.id;
  }
  _lettura.titolo = titolo;
  await salvaOra();
  avvisoOk('Testo salvato');
}

function letturaSalvati() {
  const box = $('#areaLettura');
  box.innerHTML = `<div class="card">
      <h2>📚 I miei testi salvati</h2>
      ${Stato.testi.length ? `<ul class="lista">${Stato.testi.map((t) => `
        <li class="voce">
          <div class="corpo"><b>${esc(t.titolo || 'Senza titolo')}</b>
          <span class="meta">${esc(quandoInParole(t.modificato))} · ${dividiInParole(t.testo).length} parole</span></div>
          <div class="azioni">
            ${bottone('testo-apri:' + t.id, '📖', 'Apri', 'btn-piccolo btn-primario')}
            ${bottone('testo-elimina:' + t.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
          </div>
        </li>`).join('')}</ul>` : schedaVuota('📚', 'Non hai ancora salvato nessun testo.')}
      <div class="barra-btn" style="margin-top:14px">${bottone('leggi-indietro', '⬅', 'Torna al testo')}</div>
    </div>`;
}
