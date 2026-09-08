/* ==================================================================
   09-mate-lab.js — "Risolvi con me", aiuti progressivi, allenamento,
   quaderno di matematica, i miei errori.
   ================================================================== */

/* ------------------------------------------------------------------
   Pannello dei passaggi (uno alla volta oppure tutti)
   ------------------------------------------------------------------ */

let _passi = { esito: null, indice: 0, unoAllaVolta: true, contenitore: null };

const SEMAFORO = {
  verde: { cl: 'verde', ic: '✅', txt: 'Posso risolverlo' },
  giallo: { cl: 'giallo', ic: '🟡', txt: 'Posso aiutarti in parte' },
  rosso: { cl: 'rosso', ic: '🔴', txt: 'Non posso farlo in modo sicuro' }
};

function mostraPassi(esito, idContenitore) {
  _passi.esito = esito;
  _passi.indice = 0;
  _passi.contenitore = idContenitore || '#risultatoMate';
  disegnaPassi();
}

function disegnaPassi() {
  const box = $(_passi.contenitore);
  if (!box) return;
  const e = _passi.esito;
  if (!e) { box.innerHTML = ''; return; }
  const sem = SEMAFORO[e.stato] || SEMAFORO.giallo;

  if (!e.passi.length) {
    box.innerHTML = `<div class="card">
      <span class="semaforo ${sem.cl}">${sem.ic} ${esc(sem.txt)}</span>
      <p style="margin-top:12px">${esc(e.messaggio || 'Non ho niente da mostrare.')}</p></div>`;
    return;
  }

  const n = e.passi.length;
  const i = limita(_passi.indice, 0, n - 1);
  const daMostrare = _passi.unoAllaVolta ? [e.passi[i]] : e.passi;

  box.innerHTML = `<div class="card">
      <div class="barra-btn" style="margin-bottom:12px">
        <span class="semaforo ${sem.cl}">${sem.ic} ${esc(sem.txt)}</span>
        <button type="button" class="btn btn-piccolo" data-az="passi-modo" aria-pressed="${_passi.unoAllaVolta}">
          <span aria-hidden="true">👣</span><span>Un passo alla volta</span></button>
        ${bottone('passi-leggi', '🔊', 'Ascolta', 'btn-piccolo')}
        ${bottone('passi-quaderno', '📓', 'Salva nel quaderno', 'btn-piccolo')}
      </div>
      ${e.messaggio ? `<div class="avviso avviso-att"><span class="ic">ℹ️</span><p>${esc(e.messaggio)}</p></div>` : ''}
      ${_passi.unoAllaVolta ? `<p class="frase-contatore">Passo ${i + 1} di ${n}</p>` : ''}
      ${daMostrare.map((p, k) => {
        const num = _passi.unoAllaVolta ? i : k;
        return `<div class="passo ${_passi.unoAllaVolta ? 'passo-solo' : ''} ${/controllo|risultato/i.test(p.tit) ? 'controllo' : ''}">
          <div class="numero">Passo ${num + 1} di ${n} · ${esc(p.tit)}</div>
          ${p.html}
          ${p.spiega ? `<div class="spiega">${esc(p.spiega)}</div>` : ''}
          ${p.perche ? `<div class="barra-btn" style="margin:8px 0 0">
              <button type="button" class="btn btn-piccolo" data-az="perche:${num}">❓ Perché?</button></div>
              <div class="aiuto-testo" id="perche-${num}" hidden>${esc(p.perche)}</div>` : ''}
        </div>`;
      }).join('')}
      ${_passi.unoAllaVolta ? `<div class="passo-nav">
        <button type="button" class="btn btn-grande" data-az="passo-prec"${i === 0 ? ' disabled' : ''}>⬅ Indietro</button>
        <button type="button" class="btn btn-grande btn-primario" data-az="passo-succ"${i >= n - 1 ? ' disabled' : ''}>Prossimo passo ➡</button>
      </div>` : ''}
      ${e.soluzioneTesto ? `<div class="avviso avviso-ok" style="margin-top:14px">
        <span class="ic">🎯</span><p><b>Soluzione:</b> ${esc(e.soluzioneTesto)}</p></div>` : ''}
      ${e.retta ? disegnaRettaSoluzione(e.retta) : ''}
    </div>`;
}

/** Piccolo disegno della soluzione di una disequazione sulla retta. */
function disegnaRettaSoluzione(r) {
  const W = 100;
  let barre = '';
  if (r.intervallo) {
    const { fuori, incluso } = r.intervallo;
    barre = fuori
      ? `<div style="position:absolute;left:0;width:28%;height:10px;background:var(--primario);top:15px"></div>
         <div style="position:absolute;right:0;width:28%;height:10px;background:var(--primario);top:15px"></div>`
      : `<div style="position:absolute;left:28%;width:44%;height:10px;background:var(--primario);top:15px"></div>`;
    return `<div style="position:relative;height:60px;margin-top:14px;border-bottom:3px solid var(--testo)">
        ${barre}
        <div style="position:absolute;left:28%;top:8px;width:24px;height:24px;border-radius:50%;border:3px solid var(--testo);background:${incluso ? 'var(--testo)' : 'var(--superficie)'};transform:translateX(-12px)"></div>
        <div style="position:absolute;left:72%;top:8px;width:24px;height:24px;border-radius:50%;border:3px solid var(--testo);background:${incluso ? 'var(--testo)' : 'var(--superficie)'};transform:translateX(-12px)"></div>
        <div style="position:absolute;left:28%;top:40px;transform:translateX(-50%);font-weight:700">${esc(Risolutore.numeroIt(r.intervallo.min))}</div>
        <div style="position:absolute;left:72%;top:40px;transform:translateX(-50%);font-weight:700">${esc(Risolutore.numeroIt(r.intervallo.max))}</div>
      </div>
      <p class="aiutino">Il pallino ${r.intervallo.incluso ? 'pieno vuol dire che il numero è compreso' : 'vuoto vuol dire che il numero NON è compreso'}.</p>`;
  }
  if (r.punti && r.punti.length) {
    const p = r.punti[0];
    return `<div style="position:relative;height:60px;margin-top:14px;border-bottom:3px solid var(--testo)">
        <div style="position:absolute;${r.versoDestra ? 'left:50%;right:0' : 'left:0;width:50%'};height:10px;background:var(--primario);top:15px"></div>
        <div style="position:absolute;left:50%;top:8px;width:24px;height:24px;border-radius:50%;border:3px solid var(--testo);background:${p.aperto ? 'var(--superficie)' : 'var(--testo)'};transform:translateX(-12px)"></div>
        <div style="position:absolute;left:50%;top:40px;transform:translateX(-50%);font-weight:700">${esc(Risolutore.numeroIt(p.x))}</div>
      </div>
      <p class="aiutino">Il pallino ${p.aperto ? 'vuoto: quel numero NON fa parte della soluzione' : 'pieno: quel numero fa parte della soluzione'}. La linea colorata è l\'insieme delle soluzioni.</p>`;
  }
  return '';
}

/* ------------------------------------------------------------------
   Tastiera dei simboli matematici
   ------------------------------------------------------------------ */

const SIMBOLI_MATE = ['x', 'y', 'a', 'b', 'c', '+', '−', '×', '÷', '=', '<', '>', '≤', '≥',
  '(', ')', '^2', '^', '√', 'π', '/', 'sin', 'cos', 'tan', 'log', 'ln'];

function tastieraMate(idCampo) {
  return `<div class="tastiera-mate" role="group" aria-label="Simboli matematici">
    ${SIMBOLI_MATE.map((s) => `<button type="button" data-simbolo="${esc(s)}" data-campo="${esc(idCampo)}"
      aria-label="inserisci ${esc(s === '^2' ? 'al quadrato' : s === '^' ? 'elevato a' : s)}">${esc(s === '^2' ? 'x²' : s === '^' ? 'xⁿ' : s)}</button>`).join('')}
    <button type="button" data-simbolo="⌫" data-campo="${esc(idCampo)}" aria-label="cancella l'ultimo carattere">⌫</button>
  </div>`;
}

function inserisciSimbolo(idCampo, simbolo) {
  // "__eq" vuol dire: la riga su cui sto scrivendo adesso nel quaderno
  if (idCampo === '__eq') idCampo = RisolvoIo.campoAttivo || 'riga-0';
  const n = $('#' + idCampo);
  if (!n) return;
  if (simbolo === '⌫') {
    const p = n.selectionStart;
    if (p > 0) { n.value = n.value.slice(0, p - 1) + n.value.slice(n.selectionEnd); n.setSelectionRange(p - 1, p - 1); }
  } else {
    const p = n.selectionStart == null ? n.value.length : n.selectionStart;
    const f = n.selectionEnd == null ? p : n.selectionEnd;
    n.value = n.value.slice(0, p) + simbolo + n.value.slice(f);
    n.setSelectionRange(p + simbolo.length, p + simbolo.length);
  }
  n.focus();
}

/* ------------------------------------------------------------------
   RISOLVI CON ME
   ------------------------------------------------------------------ */

const Risolvi = { testo: '', tipo: 'auto', aiuto: 0, seconda: '', metodo: 'riduzione' };

const TIPI_ESERCIZIO = [
  { id: 'auto', ic: '🪄', tit: 'Capiscilo tu' },
  { id: 'equazione', ic: '=', tit: 'Equazione' },
  { id: 'disequazione', ic: '<', tit: 'Disequazione' },
  { id: 'sistema', ic: '{', tit: 'Sistema' },
  { id: 'sviluppa', ic: '×', tit: 'Sviluppa' },
  { id: 'scomponi', ic: '÷', tit: 'Scomponi' },
  { id: 'derivata', ic: 'f′', tit: 'Derivata' },
  { id: 'limite', ic: 'lim', tit: 'Limite' },
  { id: 'integrale', ic: '∫', tit: 'Integrale' }
];

STRUMENTI['mate-risolvi'] = function (c) {
  if (_esercizioDaPdf) { Risolvi.testo = _esercizioDaPdf; _esercizioDaPdf = ''; }
  c.innerHTML = testaStrumento('🧠', 'Risolvi con me',
    'Prima proviamo insieme. La soluzione completa te la faccio vedere solo se vuoi.') + `
    <div class="card">
      <label class="etichetta" for="rsTesto">Scrivi l'esercizio</label>
      <input class="campo" id="rsTesto" type="text" value="${esc(Risolvi.testo)}"
        placeholder="Per esempio: 3x + 7 = 22" autocomplete="off" autocapitalize="off" spellcheck="false">
      ${tastieraMate('rsTesto')}
      <div id="rsSeconda" ${Risolvi.tipo === 'sistema' ? '' : 'hidden'}>
        <label class="etichetta" for="rsTesto2">Seconda equazione del sistema</label>
        <input class="campo" id="rsTesto2" type="text" value="${esc(Risolvi.seconda)}" placeholder="Per esempio: x - y = 2" autocomplete="off">
        <label class="etichetta" for="rsMetodo">Metodo</label>
        <select class="campo" id="rsMetodo">
          <option value="riduzione">Riduzione</option>
          <option value="sostituzione">Sostituzione</option>
          <option value="confronto">Confronto</option>
        </select>
      </div>
      <div id="rsExtra"></div>

      <label class="etichetta">Che tipo di esercizio è?</label>
      <div class="barra-btn">
        ${TIPI_ESERCIZIO.map((t) => `<button type="button" class="btn btn-piccolo" data-az="rs-tipo:${t.id}"
            aria-pressed="${Risolvi.tipo === t.id}"><span aria-hidden="true">${t.ic}</span><span>${esc(t.tit)}</span></button>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="barra-btn" style="margin-bottom:0">
        ${bottone('rs-conme', '🧠', 'Fallo con me', 'btn-primario btn-grande')}
        ${bottone('rs-aiuto', '💡', 'Dammi un aiuto', 'btn-grande')}
        ${bottone('rs-passaggi', '👣', 'Mostra i passaggi', 'btn-grande')}
        ${bottone('rs-controlla', '✅', 'Controlla il mio risultato', 'btn-grande')}
        ${bottone('rs-soluzione', '👀', 'Mostra la soluzione completa', 'btn-grande btn-attenzione')}
      </div>
      <p class="aiutino">Il pulsante giallo è l'ultima spiaggia: se lo usi sempre, impari meno.</p>
    </div>

    <div id="aiutiMate"></div>
    <div id="risultatoMate"></div>`;
};

function tipoAutomatico(t) {
  const s = M.normalizzaTesto(t);
  if (/lim|→/.test(s)) return 'limite';
  if (/<=|>=|<|>/.test(s)) return 'disequazione';
  if (s.indexOf('=') >= 0) return 'equazione';
  if (/[+\-][^)]*\)\s*\(/.test(s) || /\^\s*[23]/.test(s)) return 'sviluppa';
  return 'sviluppa';
}

function risolviEsercizio(quanto) {
  Risolvi.testo = $('#rsTesto').value.trim();
  const seconda = $('#rsTesto2');
  if (seconda) Risolvi.seconda = seconda.value.trim();
  const met = $('#rsMetodo');
  if (met) Risolvi.metodo = met.value;
  if (!Risolvi.testo) { toast('Scrivi prima l\'esercizio.'); return; }

  const tipo = Risolvi.tipo === 'auto' ? tipoAutomatico(Risolvi.testo) : Risolvi.tipo;
  let esito;
  try {
    switch (tipo) {
      case 'equazione': esito = Risolutore.risolviEquazione(Risolvi.testo); break;
      case 'disequazione': esito = Risolutore.risolviDisequazione(Risolvi.testo); break;
      case 'sistema': esito = Risolutore.risolviSistema(Risolvi.testo, Risolvi.seconda, Risolvi.metodo); break;
      case 'sviluppa': esito = Risolutore.espandi(Risolvi.testo); break;
      case 'scomponi': esito = Risolutore.scomponi(Risolvi.testo); break;
      case 'derivata': esito = Risolutore.derivataPassi(Risolvi.testo); break;
      case 'limite': esito = Risolutore.limitePassi(Risolvi.testo, ($('#rsVerso') || {}).value || '0'); break;
      case 'integrale': esito = Risolutore.integralePassi(Risolvi.testo); break;
      default: esito = Risolutore.risolviEquazione(Risolvi.testo);
    }
  } catch (e) {
    esito = { stato: 'rosso', messaggio: e.amichevole ? e.message : 'Non riesco a leggere questo esercizio. Controlla come l\'hai scritto.', passi: [] };
  }

  _passi.unoAllaVolta = (quanto !== 'tutto');
  mostraPassi(esito, '#risultatoMate');
  _ultimoEsito = esito;
  if (quanto === 'tutto') $('#aiutiMate').innerHTML = '';
}

let _ultimoEsito = null;
let _esercizioDaPdf = '';

/** Aiuti progressivi: 1 piccolo, 2 più esplicito, 3 il passaggio, 4 la soluzione. */
function aiutoProgressivo() {
  Risolvi.testo = $('#rsTesto').value.trim();
  if (!Risolvi.testo) { toast('Scrivi prima l\'esercizio.'); return; }
  if (!_ultimoEsito) risolviEsercizio('conme');
  const e = _ultimoEsito;
  if (!e || !e.passi.length) return;
  Risolvi.aiuto = Math.min(Risolvi.aiuto + 1, 4);
  const box = $('#aiutiMate');
  const p0 = e.passi[Math.min(1, e.passi.length - 1)];
  const testi = {
    1: { tit: '💡 Aiuto 1', txt: 'Guarda bene com\'è fatto l\'esercizio: ' + (e.passi[0].spiega || 'parti da quello che c\'è scritto e non saltare passaggi.') },
    2: { tit: '💡 Aiuto 2', txt: p0.perche || p0.spiega || 'Prova a fare la prima trasformazione da solo.' },
    3: { tit: '👀 Il prossimo passaggio', txt: (p0.spiega || '') },
    4: { tit: '✅ La soluzione', txt: 'Guarda tutti i passaggi qui sotto.' }
  };
  const a = testi[Risolvi.aiuto];
  box.innerHTML = `<div class="card">
    <div class="aiuti">
      <div class="aiuto-testo"><b>${esc(a.tit)}</b><br>${esc(a.txt)}</div>
      ${Risolvi.aiuto >= 3 ? `<div class="passo">${e.passi[Math.min(1, e.passi.length - 1)].html}</div>` : ''}
    </div>
    <div class="barra-btn" style="margin-top:10px">
      ${Risolvi.aiuto < 4 ? bottone('rs-aiuto', '💡', 'Ho ancora bisogno di aiuto') : bottone('rs-soluzione', '👀', 'Mostra tutto', 'btn-attenzione')}
    </div>
  </div>`;
  if (Risolvi.aiuto >= 4) { _passi.unoAllaVolta = false; disegnaPassi(); }
}

async function controllaMioRisultato() {
  const eq = $('#rsTesto').value.trim();
  if (!eq) { toast('Scrivi prima l\'esercizio.'); return; }
  const r = await finestra({
    titolo: 'Controlla il tuo risultato',
    testo: 'Scrivi il valore che hai trovato. Lo sostituisco nell\'esercizio e vediamo se torna.',
    campi: [
      { nome: 'variabile', etichetta: 'Incognita', valore: 'x' },
      { nome: 'valore', etichetta: 'Il mio risultato', valore: '', aiuto: 'Per esempio: 5 oppure 3/2' }
    ],
    testoOk: 'Controlla'
  });
  if (!r || !r.valore) return;
  const c = Risolutore.controllaRisultato(eq, r.variabile || 'x', r.valore);
  const box = $('#risultatoMate');
  if (c.errore) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">🤔</span><p>${esc(c.errore)}</p></div>`;
    return;
  }
  box.innerHTML = c.ok
    ? `<div class="card"><div class="avviso avviso-ok"><span class="ic">✅</span>
        <p><b>Risultato verificato!</b> Sostituendo ${esc(r.variabile)} = ${esc(r.valore)} l'uguaglianza è vera.</p></div>
        ${c.html}</div>`
    : `<div class="card"><div class="avviso avviso-att"><span class="ic">🤔</span>
        <p><b>Non torna.</b> Con ${esc(r.variabile)} = ${esc(r.valore)} le due parti dell'uguale danno numeri diversi.
        Rifai i passaggi con calma: succede a tutti.</p></div>
        ${c.html}</div>`;
}

/* ------------------------------------------------------------------
   LO RISOLVO IO — il quaderno dei passaggi

   Lo studente copia l'esercizio (anche dal PDF del libro), poi ricopia
   la riga di sopra e la modifica, un passaggio alla volta, come farebbe
   sul quaderno. Il programma NON risolve: controlla soltanto che ogni
   riga dica ancora la stessa cosa della precedente.
   La soluzione automatica arriva solo dopo, e solo se la chiede lui.
   ------------------------------------------------------------------ */

const RisolvoIo = { righe: [], variabile: 'x', campoAttivo: null, esitoRighe: {} };

function caricaLavoroEquazione() {
  const l = Stato.lavoroEquazione;
  if (l && Array.isArray(l.righe) && l.righe.length) {
    RisolvoIo.righe = l.righe.slice();
    RisolvoIo.variabile = l.variabile || 'x';
  }
}

/** Aggiorna SUBITO lo stato (la scrittura su disco resta ritardata da salva()):
    così, se l'app viene chiusa di colpo, l'ultima riga non si perde. */
function salvaLavoroEquazione() {
  Stato.lavoroEquazione = { righe: RisolvoIo.righe.slice(), variabile: RisolvoIo.variabile, quando: oraISO() };
  salva();
}

STRUMENTI['mate-risolvoio'] = function (c) {
  if (_esercizioDaPdf) {
    RisolvoIo.righe = [pulisciEsercizio(_esercizioDaPdf)];
    RisolvoIo.esitoRighe = {};
    _esercizioDaPdf = '';
    salvaLavoroEquazione();
  } else if (!RisolvoIo.righe.length) {
    caricaLavoroEquazione();
  }
  if (!RisolvoIo.righe.length) RisolvoIo.righe = [''];

  c.innerHTML = testaStrumento('✍️', 'Lo risolvo io',
    'Scrivi tu i passaggi, una riga alla volta. Io controllo che siano giusti.') + `
    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:0">
        ${bottone('ri-daPdf', '📄', 'Copia dal libro PDF')}
        ${bottone('ri-nuovo', '🆕', 'Ricomincia da capo')}
        ${bottone('ri-quaderno', '📓', 'Salva nel quaderno')}
      </div>
    </div>
    <div id="riRighe"></div>
    <div id="riEsito"></div>`;
  disegnaRisolvoIo();
};

/** Toglie dal testo copiato dal PDF le cose che non fanno parte dell'equazione. */
/**
 * Toglie dal testo copiato dal libro tutto quello che non è l'equazione:
 * "84. Risolvi la seguente equazione: 4x − 6 = 2x + 8" → "4x − 6 = 2x + 8".
 * Va tolto pezzo per pezzo, in giro, perché le formule dei libri sono
 * tutte diverse fra loro.
 */
const PAROLE_DA_TOGLIERE = new RegExp('^(esercizio|esercizi|es|num|numero|problema|quesito|' +
  'risolvi|risolvere|risolvete|calcola|calcolare|trova|trovare|determina|determinare|' +
  'semplifica|semplificare|verifica|verificare|svolgi|svolgere|' +
  'la|le|il|un|una|seguente|seguenti|equazione|equazioni|espressione|espressioni|' +
  'disequazione|disequazioni|sistema|sistemi)\\b[\'’]?\\s*[:.)]?\\s*', 'i');

function pulisciEsercizio(t) {
  const originale = String(t || '').replace(/\s+/g, ' ').trim();
  if (originale.indexOf('=') < 0) return originale;    // non è un'equazione: non tocco niente

  let s = originale, prima;
  do {
    prima = s;
    s = s.replace(/^n[.°]\s*\d*\s*/i, '');      // "n. 84"
    s = s.replace(/^\d+\s*[.)]\s*/, '');        // "84."  "84)"
    // "84: risolvi" è il numero dell'esercizio, ma "6 : 2" e "24 : x" sono
    // divisioni: taglio solo se dopo i due punti c'è una parola vera
    // (almeno tre lettere), non un'incognita.
    s = s.replace(/^\d+\s*:\s*(?=[a-zà-ÿ]{3,})/i, '');
    s = s.replace(/^l['’]\s*/i, '');            // "l'espressione"
    s = s.replace(PAROLE_DA_TOGLIERE, '');
  } while (s !== prima && s.length);

  // resta una frase davanti che finisce con i due punti? ("il valore di x: 5x = 20")
  // Attenzione: i due punti sono anche il segno di divisione (6 : 2 = 3),
  // quindi taglio solo se davanti c'è davvero una parola.
  const uguale = s.indexOf('=');
  const duePunti = s.lastIndexOf(':', uguale < 0 ? s.length : uguale);
  if (duePunti > 0 && /[a-zà-ÿ]{3,}/i.test(s.slice(0, duePunti))) {
    const dopo = s.slice(duePunti + 1).trim();
    if (dopo.indexOf('=') >= 0) s = dopo;
  }

  s = s.replace(/[.;,]\s*$/, '').trim();
  // se ho tolto troppo tengo il testo originale
  return (s.length >= 3 && s.indexOf('=') >= 0) ? s : originale;
}

function disegnaRisolvoIo() {
  const box = $('#riRighe');
  if (!box) return;
  const n = RisolvoIo.righe.length;
  box.innerHTML = `<div class="card">
      ${RisolvoIo.righe.map((r, i) => {
        const esito = RisolvoIo.esitoRighe[i];
        return `<div class="riga-eq ${esito ? 'esito-' + esito.stato : ''}">
          <span class="numero-riga">${i + 1}</span>
          <input class="campo campo-eq" id="riga-${i}" type="text" value="${esc(r)}"
            autocomplete="off" autocapitalize="off" spellcheck="false" inputmode="text"
            aria-label="Riga ${i + 1} del procedimento"
            placeholder="${i === 0 ? 'Scrivi qui l\'equazione, per esempio 3x + 7 = 22' : 'Scrivi il passaggio'}">
          <div class="azioni-riga">
            ${i > 0 ? `<button type="button" class="btn btn-piccolo" data-az="ri-controlla:${i}"
              aria-label="Controlla la riga ${i + 1}">✓</button>` : ''}
            <button type="button" class="btn btn-piccolo" data-az="ri-leggi:${i}" aria-label="Ascolta la riga ${i + 1}">🔊</button>
            ${n > 1 ? `<button type="button" class="btn btn-piccolo btn-errore" data-az="ri-canc:${i}"
              aria-label="Cancella la riga ${i + 1}">🗑</button>` : ''}
          </div>
          ${esito ? `<p class="messaggio-riga">${esc(esito.messaggio)}</p>` : ''}
        </div>`;
      }).join('')}

      <div class="barra-btn" style="margin-top:14px">
        ${bottone('ri-ricopia', '⬇️', 'Ricopia la riga qui sotto', 'btn-primario btn-grande')}
      </div>
      <p class="aiutino">Ricopia la riga, poi cambia solo quello che devi cambiare.
        Il pulsante ✓ ti dice se la riga nuova dice ancora la stessa cosa.</p>

      ${tastieraMate('__eq')}
    </div>

    <div class="card no-stampa">
      <div class="barra-btn" style="margin-bottom:0">
        ${bottone('ri-finito', '✅', 'Ho finito, controlla', 'btn-primario btn-grande')}
        ${bottone('ri-aiuto', '💡', 'Che cosa faccio adesso?', 'btn-grande')}
        ${bottone('ri-programma', '👀', 'Fammela vedere risolta', 'btn-grande btn-attenzione')}
      </div>
    </div>`;

  // memorizzo su quale riga sta scrivendo, per la tastiera dei simboli
  $$('.campo-eq', box).forEach((inp, i) => {
    inp.addEventListener('focus', () => { RisolvoIo.campoAttivo = inp.id; });
    inp.addEventListener('input', () => {
      RisolvoIo.righe[i] = inp.value;
      delete RisolvoIo.esitoRighe[i];
      salvaLavoroEquazione();
    });
    inp.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); ricopiaRiga(); }
    });
  });
}

function ricopiaRiga() {
  leggiRigheDalloSchermo();
  const ultima = RisolvoIo.righe[RisolvoIo.righe.length - 1] || '';
  if (!ultima.trim()) { toast('Scrivi prima l\'equazione nella riga di sopra.'); return; }
  RisolvoIo.righe.push(ultima);
  salvaLavoroEquazione();
  disegnaRisolvoIo();
  const nuovo = $('#riga-' + (RisolvoIo.righe.length - 1));
  if (nuovo) { nuovo.focus(); nuovo.setSelectionRange(nuovo.value.length, nuovo.value.length); }
}

function leggiRigheDalloSchermo() {
  RisolvoIo.righe.forEach((r, i) => {
    const n = $('#riga-' + i);
    if (n) RisolvoIo.righe[i] = n.value;
  });
  salvaLavoroEquazione();
}

function controllaRigaEq(i) {
  leggiRigheDalloSchermo();
  const v = RisolvoIo.variabile;
  const r = Risolutore.passaggioEquivalente(RisolvoIo.righe[i - 1], RisolvoIo.righe[i], v);
  if (r.esito === 'ok') {
    RisolvoIo.esitoRighe[i] = { stato: 'ok', messaggio: '✅ Giusto: questa riga dice ancora la stessa cosa.' };
  } else if (r.esito === 'diverso') {
    RisolvoIo.esitoRighe[i] = { stato: 'errore', messaggio: '🤔 Attenzione: questa riga non dice più la stessa cosa di quella sopra. Guarda bene che cosa è cambiato.' };
  } else {
    RisolvoIo.esitoRighe[i] = { stato: 'nonSo', messaggio: '🟡 ' + (r.messaggio || 'Non riesco a controllare questa riga.') };
  }
  disegnaRisolvoIo();
}

function aiutoRisolvoIo() {
  leggiRigheDalloSchermo();
  const ultima = RisolvoIo.righe[RisolvoIo.righe.length - 1] || '';
  if (!ultima.trim()) { toast('Scrivi prima l\'equazione.'); return; }
  const m = Risolutore.prossimaMossa(ultima, RisolvoIo.variabile);
  $('#riEsito').innerHTML = `<div class="card">
    <div class="aiuto-testo"><b>💡 Che cosa faccio adesso</b><br>${esc(m.testo)}</div>
    <p class="aiutino">Provaci tu: ricopia la riga qui sopra e cambia solo quello che serve.</p>
  </div>`;
}

function finitoRisolvoIo() {
  leggiRigheDalloSchermo();
  if (RisolvoIo.righe.length < 2) { toast('Scrivi almeno un passaggio, poi controlliamo.'); return; }
  const e = Risolutore.esitoFinale(RisolvoIo.righe, RisolvoIo.variabile);
  const classe = e.stato === 'ok' ? 'avviso-ok' : e.stato === 'errore' ? 'avviso-att' : 'avviso';
  const icona = e.stato === 'ok' ? '🎉' : e.stato === 'quasi' ? '💪' : e.stato === 'errore' ? '🤔' : 'ℹ️';
  $('#riEsito').innerHTML = `<div class="card">
    <div class="avviso ${classe}"><span class="ic">${icona}</span><p>${esc(e.messaggio)}</p></div>
    ${e.stato === 'ok' ? `<div class="barra-btn">
      ${bottone('ri-quaderno', '📓', 'Salvalo nel quaderno', 'btn-primario')}
      ${bottone('ri-nuovo', '🆕', 'Un altro esercizio')}
    </div>` : `<div class="barra-btn">
      ${bottone('ri-aiuto', '💡', 'Dammi un suggerimento')}
    </div>`}
  </div>`;
}

/** La soluzione automatica arriva solo dopo che ci ha provato. */
async function mostraSoluzioneProgramma() {
  leggiRigheDalloSchermo();
  const partenza = RisolvoIo.righe[0] || '';
  if (!partenza.trim()) { toast('Scrivi prima l\'equazione.'); return; }
  if (RisolvoIo.righe.length < 2) {
    const ok = await conferma('Vuoi già la soluzione?',
      'Non hai ancora provato nessun passaggio. Anche un tentativo sbagliato serve a imparare: prova almeno una riga, poi te la faccio vedere.',
      'Fammela vedere lo stesso');
    if (!ok) return;
  }
  Risolvi.testo = partenza;
  Risolvi.tipo = 'equazione';
  Risolvi.aiuto = 0;
  vaiA('mate', 'risolvi');
  setTimeout(() => {
    const inp = $('#rsTesto');
    if (inp) inp.value = partenza;
    risolviEsercizio('conme');
  }, 80);
}

async function salvaLavoroNelQuaderno() {
  leggiRigheDalloSchermo();
  if (!RisolvoIo.righe[0]) return;
  await nuovoEsercizioQuaderno({
    titolo: accorcia(RisolvoIo.righe[0], 50),
    argomento: 'Algebra',
    testo: RisolvoIo.righe[0],
    procedimento: RisolvoIo.righe.map((r, i) => (i + 1) + ')  ' + r).join('\n'),
    risultato: RisolvoIo.righe[RisolvoIo.righe.length - 1]
  });
}

/* ------------------------------------------------------------------
   MI ALLENO
   ------------------------------------------------------------------ */

const Alleno = { tipo: 'eq1', esercizio: null, aiuto: 0 };

const TIPI_ALLENAMENTO = [
  { id: 'eq1', tit: 'Equazioni di primo grado' },
  { id: 'eq2', tit: 'Equazioni di secondo grado' },
  { id: 'tab', tit: 'Tabelline' },
  { id: 'perc', tit: 'Percentuali' },
  { id: 'frazioni', tit: 'Frazioni' }
];

STRUMENTI['mate-alleno'] = function (c) {
  c.innerHTML = testaStrumento('🎓', 'Mi alleno',
    'Qui la soluzione non arriva subito: prima provi tu, e se serve chiedi un aiuto.') + `
    <div class="card">
      <label class="etichetta" for="alTipo">Su cosa mi alleno?</label>
      <select class="campo" id="alTipo">
        ${TIPI_ALLENAMENTO.map((t) => `<option value="${t.id}"${Alleno.tipo === t.id ? ' selected' : ''}>${esc(t.tit)}</option>`).join('')}
      </select>
      <div class="barra-btn" style="margin-top:12px">${bottone('al-nuovo', '🎲', 'Dammi un esercizio', 'btn-primario btn-grande')}</div>
    </div>
    <div id="alBox"></div>`;
};

function nuovoAllenamento() {
  Alleno.tipo = $('#alTipo').value;
  Alleno.aiuto = 0;
  const r = (n) => Math.floor(Math.random() * n);
  let e;
  switch (Alleno.tipo) {
    case 'eq1': {
      const a = 2 + r(8), x = 1 + r(9), b = 1 + r(20);
      e = { testo: a + 'x + ' + b + ' = ' + (a * x + b), risposta: String(x), variabile: 'x',
        aiuto1: 'Prima togli ' + b + ' da tutti e due i membri.',
        aiuto2: 'Ti resta ' + a + 'x = ' + (a * x) + '. Adesso dividi per ' + a + '.',
        formula: 'Quello che faccio a sinistra lo devo fare anche a destra.' };
      break;
    }
    case 'eq2': {
      const x1 = 1 + r(6), x2 = 1 + r(6);
      const b = -(x1 + x2), c = x1 * x2;
      e = { testo: 'x^2 ' + (b < 0 ? '- ' + Math.abs(b) : '+ ' + b) + 'x + ' + c + ' = 0',
        risposta: String(Math.min(x1, x2)) + ' e ' + String(Math.max(x1, x2)), variabile: 'x',
        aiuto1: 'Riconosci a, b e c, poi calcola Δ = b² − 4ac.',
        aiuto2: 'Δ = ' + (b * b - 4 * c) + '. Adesso usa la formula (−b ± √Δ) / 2a.',
        formula: 'x = (−b ± √(b² − 4ac)) / (2a)' };
      break;
    }
    case 'tab': {
      const a = 2 + r(9), b = 2 + r(9);
      e = { testo: a + ' × ' + b, risposta: String(a * b),
        aiuto1: 'Conta di ' + a + ' in ' + a + '.', aiuto2: a + ' × ' + b + ' è come ' + b + ' × ' + a + '.', formula: '' };
      break;
    }
    case 'perc': {
      const p = [10, 20, 25, 50, 5][r(5)], d = (2 + r(9)) * 20;
      e = { testo: p + '% di ' + d, risposta: String(d * p / 100),
        aiuto1: 'Il ' + p + '% vuol dire ' + p + ' ogni 100.',
        aiuto2: 'Fai ' + d + ' × ' + p + ' e poi dividi per 100.', formula: 'parte = totale × percentuale ÷ 100' };
      break;
    }
    default: {
      const d = 2 + r(6), n1 = 1 + r(d - 1), n2 = 1 + r(d - 1);
      e = { testo: n1 + '/' + d + ' + ' + n2 + '/' + d, risposta: M.fTesto(M.fr(n1 + n2, d)),
        aiuto1: 'I denominatori sono uguali: si sommano solo i numeratori.',
        aiuto2: 'Fai ' + n1 + ' + ' + n2 + ' = ' + (n1 + n2) + ', il denominatore resta ' + d + '. Poi semplifica se puoi.',
        formula: 'a/c + b/c = (a+b)/c' };
    }
  }
  Alleno.esercizio = e;
  disegnaAllenamento();
}

function disegnaAllenamento() {
  const e = Alleno.esercizio;
  if (!e) return;
  $('#alBox').innerHTML = `<div class="card">
      <h2>Prova tu</h2>
      <div class="mate mate-blocco" style="font-size:1.9em">${esc(e.testo)}</div>
      <label class="etichetta" for="alRisp">La mia risposta</label>
      <input class="campo" id="alRisp" type="text" autocomplete="off" placeholder="Scrivi qui">
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('al-controlla', '✅', 'Controlla', 'btn-primario btn-grande')}
        ${bottone('al-aiuto1', '💡', 'Suggerimento 1')}
        ${bottone('al-aiuto2', '💡', 'Suggerimento 2')}
        ${e.formula ? bottone('al-formula', '📐', 'Formula utile') : ''}
        ${bottone('al-nuovo', '🎲', 'Un altro esercizio')}
      </div>
      <div id="alEsito"></div>
    </div>`;
  const inp = $('#alRisp');
  inp.focus();
  inp.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') controllaAllenamento(); });
}

function controllaAllenamento() {
  const e = Alleno.esercizio;
  if (!e) return;
  const v = ($('#alRisp').value || '').trim().replace(/\s+/g, ' ').replace(',', '.');
  const atteso = String(e.risposta).replace(',', '.');
  let ok = v.toLowerCase() === atteso.toLowerCase();
  if (!ok) {
    try {
      const a = M.valuta(M.analizza(v), {}), b = M.valuta(M.analizza(atteso), {});
      ok = Math.abs(a - b) < 1e-9;
    } catch (err) { /* confronto testuale */ }
  }
  $('#alEsito').innerHTML = ok
    ? `<div class="avviso avviso-ok"><span class="ic">✅</span><p><b>Corretto!</b> Bravo.</p></div>`
    : `<div class="avviso avviso-att"><span class="ic">🤔</span><p><b>Non ancora.</b> Prova a usare un suggerimento: non c'è nessuna fretta e nessun voto.</p></div>`;
  if (ok) setTimeout(nuovoAllenamento, 1400);
}

function aiutoAllenamento(livello) {
  const e = Alleno.esercizio;
  if (!e) return;
  const t = livello === 1 ? e.aiuto1 : livello === 2 ? e.aiuto2 : e.formula;
  $('#alEsito').innerHTML = `<div class="aiuto-testo">${esc(t)}</div>`;
}

/* ------------------------------------------------------------------
   IL MIO QUADERNO DI MATEMATICA
   ------------------------------------------------------------------ */

const ARGOMENTI_QUADERNO = ['Algebra', 'Geometria', 'Funzioni', 'Trigonometria', 'Analisi', 'Statistica', 'Problema', 'Altro'];

STRUMENTI['mate-quaderno'] = function (c) {
  c.innerHTML = testaStrumento('📓', 'Il mio quaderno di matematica',
    'Gli esercizi che hai già fatto, per ritrovarli quando servono.') + `
    <div class="card">
      <div class="barra-btn" style="margin-bottom:0">
        ${bottone('qd-nuovo', '➕', 'Aggiungi un esercizio', 'btn-primario btn-grande')}
        <button type="button" class="btn btn-grande" data-vai="mate/quadernofoglio">
          <span aria-hidden="true">🖨️</span><span>Vedi e stampa il quaderno</span></button>
      </div>
    </div>
    <div id="qdLista"></div>`;
  disegnaQuaderno();
};

/* ---- il quaderno su un foglio A4 -------------------------------- */

STRUMENTI['mate-quadernofoglio'] = function (c) {
  const argomenti = Array.from(new Set(Stato.quaderno.map((q) => q.argomento || 'Altro'))).sort();
  c.innerHTML = testaStrumento('🖨️', 'Il quaderno da stampare',
    'Ecco il tuo lavoro su un foglio A4: puoi stamparlo o salvarlo in PDF.') + `
    <div class="card no-stampa">
      <div class="riga-campi">
        <div>
          <label class="etichetta" for="qfArg">Che cosa metto sul foglio</label>
          <select class="campo" id="qfArg">
            <option value="">Tutto il quaderno</option>
            ${argomenti.map((a) => `<option value="${esc(a)}">${esc(a)}</option>`).join('')}
          </select>
        </div>
        <div>
          <label class="etichetta" for="qfDa">Solo da questa data in poi</label>
          <input class="campo" id="qfDa" type="date">
        </div>
      </div>
      <label class="check"><input type="checkbox" id="qfProc" checked>
        <span>Metti anche i procedimenti e i risultati</span></label>
      <label class="check"><input type="checkbox" id="qfVuoto">
        <span>Foglio di ripasso: solo i testi, con le righe vuote per rifarli</span></label>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('qf-aggiorna', '🔄', 'Aggiorna il foglio')}
        ${bottone('qf-stampa', '🖨️', 'Stampa in A4', 'btn-primario btn-grande')}
        <button type="button" class="btn" data-vai="mate/quaderno">
          <span aria-hidden="true">⬅</span><span>Torna al quaderno</span></button>
      </div>
    </div>
    <div id="qfFoglio"></div>`;
  ['#qfArg', '#qfDa', '#qfProc', '#qfVuoto'].forEach((s) => {
    const n = $(s, c);
    if (n) n.addEventListener('change', disegnaFoglioQuaderno);
  });
  disegnaFoglioQuaderno();
};

function disegnaFoglioQuaderno() {
  const box = $('#qfFoglio');
  if (!box) return;
  const arg = ($('#qfArg') || {}).value || '';
  const da = ($('#qfDa') || {}).value || '';
  const conProcedimento = ($('#qfProc') || {}).checked !== false;
  const perRipasso = !!(($('#qfVuoto') || {}).checked);

  const lista = Stato.quaderno.filter((q) =>
    (!arg || (q.argomento || 'Altro') === arg) && (!da || String(q.data || '') >= da));

  const nome = (Stato.profilo.nome || '').trim();
  const classe = (Stato.profilo.classe || '').trim();

  box.innerHTML = `<div class="foglio-a4">
      <div class="riga-titolo">
        <h1 style="margin:0">Il mio quaderno di matematica</h1>
        <div style="text-align:right;font-size:.9em">
          ${nome ? esc(nome) + (classe ? ' — ' + esc(classe) : '') + '<br>' : ''}
          ${esc(dataInParole(oggiISO()))}
        </div>
      </div>
      ${arg ? `<p class="etichette">Argomento: <b>${esc(arg)}</b></p>` : ''}
      ${lista.length ? lista.map((q, i) => `
        <div class="esercizio">
          <h3 style="margin:0 0 4px">${i + 1}. ${esc(q.titolo || accorcia(q.testo, 60))}</h3>
          <p class="etichette">${esc(dataInParole(q.data))}${q.argomento ? ' · ' + esc(q.argomento) : ''}</p>
          ${q.testo ? `<p style="margin:4px 0">${esc(q.testo)}</p>` : ''}
          ${perRipasso
            ? '<div class="spazio-scrittura"></div>'.repeat(4)
            : (conProcedimento ? `
              ${q.procedimento ? `<div class="procedimento">${esc(q.procedimento)}</div>` : ''}
              ${q.risultato ? `<p class="risultato">Risultato: ${esc(q.risultato)}</p>` : ''}
              ${q.nota ? `<p class="etichette">Nota: ${esc(q.nota)}</p>` : ''}` : '')}
        </div>`).join('')
      : '<p>Non c\'è ancora niente da mettere sul foglio.</p>'}
      <p class="etichette" style="margin-top:18px">
        ${lista.length === 1 ? '1 esercizio' : lista.length + ' esercizi'} · Studio DSA
      </p>
    </div>`;
}

function disegnaQuaderno() {
  const box = $('#qdLista');
  if (!box) return;
  box.innerHTML = Stato.quaderno.length
    ? `<ul class="lista">${Stato.quaderno.map((q) => `
        <li class="voce">
          <div class="corpo">
            <b>${esc(q.titolo || accorcia(q.testo, 50))}</b>
            <span class="meta">${esc(dataInParole(q.data))} · ${esc(q.argomento || 'Altro')}${q.risultato ? ' · risultato: ' + esc(accorcia(q.risultato, 30)) : ''}</span>
          </div>
          <div class="azioni">
            ${bottone('qd-apri:' + q.id, '👁️', 'Vedi', 'btn-piccolo')}
            ${bottone('qd-canc:' + q.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
          </div>
        </li>`).join('')}</ul>`
    : `<div class="card">${schedaVuota('📓', 'Il quaderno è vuoto.', 'Ogni esercizio che risolvi lo puoi salvare qui.')}</div>`;
}

async function nuovoEsercizioQuaderno(precompilato) {
  const r = await finestra({
    titolo: 'Esercizio nel quaderno',
    campi: [
      { nome: 'titolo', etichetta: 'Titolo', valore: (precompilato && precompilato.titolo) || '' },
      { nome: 'argomento', etichetta: 'Argomento', tipo: 'scelta', opzioni: ARGOMENTI_QUADERNO, valore: (precompilato && precompilato.argomento) || 'Algebra' },
      { nome: 'testo', etichetta: 'Testo dell\'esercizio', tipo: 'area', righe: 3, valore: (precompilato && precompilato.testo) || '' },
      { nome: 'procedimento', etichetta: 'Procedimento', tipo: 'area', righe: 4, valore: (precompilato && precompilato.procedimento) || '' },
      { nome: 'risultato', etichetta: 'Risultato', valore: (precompilato && precompilato.risultato) || '' },
      { nome: 'nota', etichetta: 'Nota per me', tipo: 'area', righe: 2, valore: '' }
    ],
    testoOk: 'Salva'
  });
  if (!r) return;
  Stato.quaderno.unshift(Object.assign({ id: uid('es'), data: oggiISO(), materia: 'Matematica' }, r));
  await salvaOra();
  disegnaQuaderno();
  avvisoOk('Salvato nel quaderno');
}

function apriEsercizioQuaderno(id) {
  const q = Stato.quaderno.find((x) => x.id === id);
  if (!q) return;
  finestra({
    titolo: q.titolo || 'Esercizio',
    testo: [q.testo, q.procedimento, q.risultato ? 'Risultato: ' + q.risultato : '', q.nota].filter(Boolean).join('\n\n'),
    testoOk: 'Chiudi', testoAnnulla: 'Chiudi'
  });
}

/* ------------------------------------------------------------------
   I MIEI ERRORI
   ------------------------------------------------------------------ */

STRUMENTI['mate-errori'] = function (c) {
  c.innerHTML = testaStrumento('🔁', 'I miei errori',
    'Gli errori più utili sono quelli che si ripetono: scrivili qui e non li rifarai.') + `
    <div class="card">
      <div class="barra-btn" style="margin-bottom:0">${bottone('er-nuovo', '➕', 'Aggiungi un errore', 'btn-primario btn-grande')}</div>
    </div>
    <div id="erLista"></div>`;
  disegnaErrori();
};

function disegnaErrori() {
  const box = $('#erLista');
  if (!box) return;
  box.innerHTML = Stato.erroriMate.length
    ? Stato.erroriMate.map((e) => `<div class="card">
        <h3>${esc(e.titolo || 'Errore')}</h3>
        <div class="controllo-riga"><b>❌ Come lo sbaglio</b><div class="mate">${esc(e.sbagliato)}</div></div>
        <div class="controllo-riga ok" style="margin-top:8px"><b>✅ Come si fa</b><div class="mate">${esc(e.corretto)}</div></div>
        <p style="margin-top:10px"><b>Regola da ricordare:</b> ${esc(e.regola)}</p>
        <div class="barra-btn">
          ${bottone('er-leggi:' + e.id, '🔊', 'Leggimelo', 'btn-piccolo')}
          ${bottone('er-canc:' + e.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
        </div>
      </div>`).join('')
    : `<div class="card">${schedaVuota('🔁', 'Non hai ancora segnato nessun errore.',
        'Esempio: −(x − 3) non fa −x − 3 ma −x + 3.')}</div>`;
}

async function nuovoErrore() {
  const r = await finestra({
    titolo: 'Un errore da non rifare',
    campi: [
      { nome: 'titolo', etichetta: 'Che argomento è?', valore: '', aiuto: 'Per esempio: parentesi con il meno davanti' },
      { nome: 'sbagliato', etichetta: '❌ Come lo sbaglio', valore: '', aiuto: 'Per esempio: -(x - 3) = -x - 3' },
      { nome: 'corretto', etichetta: '✅ Come si fa', valore: '', aiuto: 'Per esempio: -(x - 3) = -x + 3' },
      { nome: 'regola', etichetta: 'Regola da ricordare', tipo: 'area', righe: 3, valore: '' }
    ],
    testoOk: 'Salva'
  });
  if (!r) return;
  Stato.erroriMate.unshift(Object.assign({ id: uid('err'), data: oggiISO() }, r));
  await salvaOra();
  disegnaErrori();
  avvisoOk('Salvato');
}
