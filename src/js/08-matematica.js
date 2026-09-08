/* ==================================================================
   08-matematica.js — laboratorio di matematica (parte 1)
   Calcolatrice, operazioni in colonna, tabelline, frazioni,
   retta dei numeri, percentuali, problemi guidati.
   ================================================================== */

const STRUMENTI_MATE = [
  { gruppo: 'Tutti i giorni', voci: [
    { id: 'calc', ic: '🧮', tit: 'Calcolatrice', des: 'Anche scientifica, con i tasti grandi.' },
    { id: 'colonna', ic: '📐', tit: 'Operazioni in colonna', des: 'Numeri sempre allineati.' },
    { id: 'tabelline', ic: '✖️', tit: 'Tabelline', des: 'Tavola e allenamento.' },
    { id: 'frazioni', ic: '🍕', tit: 'Frazioni', des: 'Vedere le frazioni disegnate.' },
    { id: 'rettanum', ic: '📏', tit: 'Retta dei numeri', des: 'Positivi, negativi, addizioni.' },
    { id: 'perc', ic: '％', tit: 'Percentuali', des: 'Capire il 25% di 200.' }
  ] },
  { gruppo: 'Esercizi e problemi', voci: [
    { id: 'risolvoio', ic: '✍️', tit: 'Lo risolvo io', des: 'Scrivi tu i passaggi, io controllo.' },
    { id: 'problema', ic: '🧩', tit: 'Risolviamo il problema', des: 'Un passaggio alla volta.' },
    { id: 'risolvi', ic: '🧠', tit: 'Risolvi con me', des: 'Equazioni, disequazioni, sistemi.' },
    { id: 'alleno', ic: '🎓', tit: 'Mi alleno', des: 'Provi tu, io ti do gli aiuti.' },
    { id: 'quaderno', ic: '📓', tit: 'Il mio quaderno', des: 'Gli esercizi che ho fatto.' },
    { id: 'errori', ic: '🔁', tit: 'I miei errori', des: 'Gli sbagli da non rifare.' }
  ] },
  { gruppo: 'Superiori', voci: [
    { id: 'grafico', ic: '📈', tit: 'Grafici di funzioni', des: 'Piano cartesiano, y = ...' },
    { id: 'rettapar', ic: '📉', tit: 'Retta e parabola', des: 'm, q, vertice, intersezioni.' },
    { id: 'trigono', ic: '⭕', tit: 'Trigonometria', des: 'Circonferenza goniometrica.' },
    { id: 'triangoli', ic: '🔺', tit: 'Triangoli', des: 'Pitagora, seni, coseno.' },
    { id: 'loghi', ic: '🔟', tit: 'Logaritmi e potenze', des: 'log₂8 = 3 perché 2³ = 8.' },
    { id: 'analisi', ic: '∫', tit: 'Derivate e limiti', des: 'Analisi degli ultimi anni.' },
    { id: 'statistica', ic: '📊', tit: 'Statistica', des: 'Media, mediana, moda, grafici.' },
    { id: 'studiofun', ic: '📊', tit: 'Studiamo una funzione', des: 'La scaletta completa.' },
    { id: 'formule', ic: '📐', tit: 'Formulario', des: 'Le formule che mi servono.' }
  ] }
];

/* ------------------------------------------------------------------
   Hub della sezione
   ------------------------------------------------------------------ */

VISTE.mate = function (c, par) {
  // alcuni strumenti (per esempio il foglio da stampare) non stanno
  // nell'elenco della Home ma si raggiungono lo stesso
  if (par && STRUMENTI['mate-' + par]) {
    c.innerHTML = '';
    STRUMENTI['mate-' + par](c);
    return;
  }
  c.innerHTML = testaSezione('🔢', 'Matematica', 'Scegli lo strumento che ti serve adesso.',
    bottone('home', '🏠', 'Home', 'btn-piccolo')) +
    STRUMENTI_MATE.map((g, i) => `
      <h2 style="margin-top:${i ? '22px' : '4px'}">${esc(g.gruppo)}</h2>
      <div class="griglia-home">
        ${g.voci.map((v) => `<button type="button" class="tessera" data-vai="mate/${v.id}">
            <span class="ic" aria-hidden="true">${v.ic}</span>
            <span class="tx"><b>${esc(v.tit)}</b><span>${esc(v.des)}</span></span>
          </button>`).join('')}
      </div>`).join('');
};

/** Ogni strumento si registra qui. */
const STRUMENTI = {};

/** Intestazione comune degli strumenti di matematica. */
function testaStrumento(ic, tit, sub) {
  return testaSezione(ic, tit, sub,
    bottone('mate', '⬅', 'Matematica', 'btn-piccolo') + bottone('home', '🏠', 'Home', 'btn-piccolo'));
}

/* ------------------------------------------------------------------
   CALCOLATRICE (normale e scientifica)
   ------------------------------------------------------------------ */

const Calc = {
  espressione: '',
  memoria: 0,
  gradi: true,
  scientifica: false,
  storia: []
};

const TASTI_BASE = [
  ['C', 'canc'], ['⌫', 'back'], ['(', 'ins'], [')', 'ins'],
  ['7', 'ins'], ['8', 'ins'], ['9', 'ins'], ['÷', 'op'],
  ['4', 'ins'], ['5', 'ins'], ['6', 'ins'], ['×', 'op'],
  ['1', 'ins'], ['2', 'ins'], ['3', 'ins'], ['−', 'op'],
  ['0', 'ins'], [',', 'ins'], ['%', 'op'], ['+', 'op']
];
const TASTI_SCIENZA = [
  ['x²', 'fn'], ['x³', 'fn'], ['xʸ', 'fn'], ['√', 'fn'], ['1/x', 'fn'], ['π', 'fn'],
  ['sin', 'fn'], ['cos', 'fn'], ['tan', 'fn'], ['log', 'fn'], ['ln', 'fn'], ['e', 'fn'],
  ['asin', 'fn'], ['acos', 'fn'], ['atan', 'fn'], ['10ˣ', 'fn'], ['eˣ', 'fn'], ['n!', 'fn']
];

STRUMENTI['mate-calc'] = function (c) {
  c.innerHTML = testaStrumento('🧮', 'Calcolatrice', null) + `
    <div class="card">
      <div class="barra-btn">
        <button type="button" class="btn" data-az="calc-modo" aria-pressed="${Calc.scientifica}">
          <span aria-hidden="true">🔬</span><span>Scientifica</span></button>
        <button type="button" class="btn" data-az="calc-gradi" aria-pressed="${Calc.gradi}">
          <span aria-hidden="true">📐</span><span>${Calc.gradi ? 'GRADI' : 'RADIANTI'}</span></button>
        ${bottone('calc-leggi', '🔊', 'Leggi il calcolo')}
        ${bottone('calc-storia', '🕘', 'Cronologia')}
      </div>
      <div class="calc-display">
        <div class="espressione" id="calcEsp" aria-live="off">${esc(Calc.espressione || '0')}</div>
        <div class="risultato" id="calcRis" aria-live="polite"></div>
      </div>
      <div class="calc-tasti scientifica" id="calcTasti"></div>
      <p class="aiutino">Il numero decimale si scrive con la virgola: 2,5. La modalità attiva è
        <b>${Calc.gradi ? 'GRADI' : 'RADIANTI'}</b>.</p>
    </div>
    <div id="calcStoria"></div>`;

  disegnaTastiCalc();
};

function disegnaTastiCalc() {
  const box = $('#calcTasti');
  if (!box) return;
  const tasti = (Calc.scientifica ? TASTI_SCIENZA : []).concat(TASTI_BASE)
    .concat([['MC', 'mem'], ['MR', 'mem'], ['M+', 'mem'], ['=', 'uguale']]);
  box.innerHTML = tasti.map(([t, k]) => {
    const cl = k === 'uguale' ? 'uguale' : k === 'canc' ? 'canc' : k === 'op' ? 'op' : k === 'fn' ? 'fn' : '';
    return `<button type="button" class="${cl}" data-tasto="${esc(t)}" aria-label="${esc(nomeTasto(t))}">${esc(t)}</button>`;
  }).join('');
  if (Calc.scientifica) box.classList.add('scientifica');
}

function nomeTasto(t) {
  const n = { '÷': 'diviso', '×': 'per', '−': 'meno', '+': 'più', '=': 'uguale', 'C': 'cancella tutto',
    '⌫': 'cancella l\'ultimo', '√': 'radice quadrata', 'π': 'pi greco', 'x²': 'al quadrato',
    'x³': 'al cubo', 'xʸ': 'elevato a', '1/x': 'uno diviso', 'n!': 'fattoriale',
    '10ˣ': 'dieci elevato a', 'eˣ': 'e elevato a', ',': 'virgola', '%': 'per cento' };
  return n[t] || t;
}

function premiTastoCalc(t) {
  const agg = (s) => { Calc.espressione += s; };
  switch (t) {
    case 'C': Calc.espressione = ''; $('#calcRis').textContent = ''; break;
    case '⌫': Calc.espressione = Calc.espressione.slice(0, -1); break;
    case '=': calcolaEspressione(); return;
    case '÷': agg('÷'); break;
    case '×': agg('×'); break;
    case '−': agg('−'); break;
    case 'x²': agg('^2'); break;
    case 'x³': agg('^3'); break;
    case 'xʸ': agg('^'); break;
    case '√': agg('√('); break;
    case '1/x': Calc.espressione = '1÷(' + Calc.espressione + ')'; break;
    case 'π': agg('π'); break;
    case 'e': agg('e'); break;
    case '10ˣ': agg('10^'); break;
    case 'eˣ': agg('exp('); break;
    case 'n!': agg('!'); break;
    case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan':
    case 'log': case 'ln': agg(t + '('); break;
    case 'MC': Calc.memoria = 0; toast('Memoria azzerata'); break;
    case 'MR': agg(String(Calc.memoria).replace('.', ',')); break;
    case 'M+': {
      const v = calcolaEspressione(true);
      if (v !== null) { Calc.memoria += v; toast('In memoria: ' + Risolutore.numeroIt(Calc.memoria)); }
      break;
    }
    default: agg(t);
  }
  $('#calcEsp').textContent = Calc.espressione || '0';
}

/** Converte gradi/radianti prima di calcolare. */
function adattaGradi(a) {
  if (!Calc.gradi) return a;
  const conv = (x) => {
    if (!x || typeof x !== 'object') return x;
    if (x.t === 'f' && ['sin', 'cos', 'tan'].indexOf(x.n) >= 0) {
      return { t: 'f', n: x.n, a: [M.nProd([conv(x.a[0]), { t: 'c', n: 'pi' }, M.nNum(M.fr(1, 180))])] };
    }
    if (x.t === 'f' && ['asin', 'acos', 'atan'].indexOf(x.n) >= 0) {
      return M.nProd([{ t: 'f', n: x.n, a: [conv(x.a[0])] }, M.nNum(M.fr(180)), M.nPot({ t: 'c', n: 'pi' }, M.nNum(M.fr(-1)))]);
    }
    if (x.t === 'f') return { t: 'f', n: x.n, a: [conv(x.a[0])] };
    if (x.t === '+' || x.t === '*') return { t: x.t, a: x.a.map(conv) };
    if (x.t === '^') return { t: '^', b: conv(x.b), e: conv(x.e) };
    return x;
  };
  return conv(a);
}

function calcolaEspressione(soloValore) {
  const box = $('#calcRis');
  if (!Calc.espressione.trim()) return null;
  try {
    let testo = Calc.espressione.replace(/%/g, '/100');
    const a = M.analizza(testo);
    const v = M.valuta(adattaGradi(a), { e: Math.E });
    if (!isFinite(v)) throw M.errore('Il risultato è troppo grande, oppure hai diviso per zero.');
    const arrotondato = Math.abs(v) < 1e-12 ? 0 : Number(v.toPrecision(12));
    if (soloValore) return arrotondato;
    box.textContent = Risolutore.numeroIt(arrotondato);
    Calc.storia.unshift({ esp: Calc.espressione, ris: Risolutore.numeroIt(arrotondato) });
    if (Calc.storia.length > 30) Calc.storia.pop();
    return arrotondato;
  } catch (e) {
    if (soloValore) return null;
    box.textContent = '';
    avvisoErrore(e.amichevole ? e.message : 'Non riesco a fare questo calcolo. Controlla le parentesi.');
    return null;
  }
}

function mostraStoriaCalc() {
  $('#calcStoria').innerHTML = `<div class="card">
    <h2>🕘 Cronologia dei calcoli</h2>
    ${Calc.storia.length ? `<ul class="lista">${Calc.storia.map((s, i) => `
      <li class="voce"><div class="corpo"><b>${esc(s.esp)}</b><span class="meta">= ${esc(s.ris)}</span></div>
      <div class="azioni">${bottone('calc-riusa:' + i, '↩️', 'Riusa', 'btn-piccolo')}</div></li>`).join('')}</ul>`
      : schedaVuota('🕘', 'Non hai ancora fatto calcoli.')}
    <div class="barra-btn" style="margin-top:12px">${bottone('calc-chiudi-storia', '✕', 'Chiudi')}</div>
  </div>`;
}

/* ------------------------------------------------------------------
   OPERAZIONI IN COLONNA
   ------------------------------------------------------------------ */

const Colonna = { a: '', b: '', op: '+', mostraRiporti: true };

STRUMENTI['mate-colonna'] = function (c) {
  c.innerHTML = testaStrumento('📐', 'Operazioni in colonna',
    'Scrivi i due numeri: li incolonno io. Poi provi tu a fare il conto.') + `
    <div class="card">
      <div class="riga-campi">
        <div><label class="etichetta" for="colA">Primo numero</label>
          <input class="campo" id="colA" type="text" inputmode="numeric" value="${esc(Colonna.a)}"></div>
        <div><label class="etichetta" for="colOp">Operazione</label>
          <select class="campo" id="colOp">
            <option value="+"${Colonna.op === '+' ? ' selected' : ''}>+ addizione</option>
            <option value="−"${Colonna.op === '−' ? ' selected' : ''}>− sottrazione</option>
            <option value="×"${Colonna.op === '×' ? ' selected' : ''}>× moltiplicazione</option>
          </select></div>
        <div><label class="etichetta" for="colB">Secondo numero</label>
          <input class="campo" id="colB" type="text" inputmode="numeric" value="${esc(Colonna.b)}"></div>
      </div>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('col-incolonna', '📐', 'Incolonna', 'btn-primario btn-grande')}
      </div>
    </div>
    <div id="colGriglia"></div>`;
};

function incolonna() {
  Colonna.a = $('#colA').value.trim().replace(/[^\d]/g, '');
  Colonna.b = $('#colB').value.trim().replace(/[^\d]/g, '');
  Colonna.op = $('#colOp').value;
  const box = $('#colGriglia');
  if (!Colonna.a || !Colonna.b) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">✏️</span><p>Scrivi tutti e due i numeri (solo cifre, senza virgola).</p></div>`;
    return;
  }
  if (Colonna.op === '−' && Number(Colonna.a) < Number(Colonna.b)) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">🔄</span>
      <p>Il primo numero è più piccolo del secondo: in colonna la sottrazione si fa mettendo sopra il numero più grande.
      Prova a scambiarli (il risultato sarà negativo).</p></div>`;
    return;
  }
  const larghezza = Math.max(Colonna.a.length, Colonna.b.length) +
    (Colonna.op === '×' ? Colonna.b.length : 1);
  const NOMI = ['Unità', 'Decine', 'Centinaia', 'Migliaia', 'Dec. di migliaia', 'Centinaia di migliaia', 'Milioni'];

  const cella = (ch, cl) => `<div class="colonna-cella ${cl || ''}">${ch === null ? '' : esc(ch)}</div>`;
  const rigaNum = (n, segno) => {
    const cifre = String(n).padStart(larghezza, ' ').split('');
    return '<div class="colonna-riga">' +
      (segno ? cella(segno, 'segno') : cella('', 'segno')) +
      cifre.map((ch) => cella(ch === ' ' ? null : ch)).join('') + '</div>';
  };

  const intest = '<div class="colonna-riga colonna-intestazioni">' + cella('', 'segno') +
    Array.from({ length: larghezza }, (_, i) => cella(NOMI[larghezza - 1 - i] || '', '')).join('') + '</div>';

  const riporti = Colonna.mostraRiporti
    ? '<div class="colonna-riga">' + cella('', 'segno') +
      Array.from({ length: larghezza }, (_, i) =>
        `<div class="colonna-cella riporto"><input type="text" inputmode="numeric" maxlength="1" aria-label="riporto colonna ${larghezza - i}"></div>`).join('') + '</div>'
    : '';

  const risultato = '<div class="colonna-riga linea">' + cella('', 'segno') +
    Array.from({ length: larghezza }, (_, i) =>
      `<div class="colonna-cella"><input type="text" inputmode="numeric" maxlength="1" data-ris="${larghezza - 1 - i}" aria-label="risultato colonna ${larghezza - i}"></div>`).join('') + '</div>';

  box.innerHTML = `<div class="card">
      <div style="overflow-x:auto"><div class="colonna-griglia">
        ${intest}${riporti}${rigaNum(Colonna.a)}${rigaNum(Colonna.b, Colonna.op)}${risultato}
      </div></div>
      <div class="barra-btn" style="margin-top:16px">
        ${bottone('col-controlla', '✅', 'Controlla il mio risultato', 'btn-primario btn-grande')}
        ${bottone('col-aiuto', '💡', 'Aiutami con la prima colonna')}
        ${bottone('col-mostra', '👀', 'Mostrami il risultato')}
        ${bottone('col-pulisci', '🧽', 'Cancella quello che ho scritto')}
      </div>
      <p class="aiutino">Scrivi una cifra per casella, partendo da destra. Le caselle rosse in alto sono per i riporti.</p>
      <div id="colEsito"></div>
    </div>`;
}

function risultatoColonna() {
  const a = Number(Colonna.a), b = Number(Colonna.b);
  return Colonna.op === '+' ? a + b : Colonna.op === '−' ? a - b : a * b;
}

function controllaColonna() {
  const giusto = String(risultatoColonna());
  const celle = $$('[data-ris]').sort((x, y) => Number(y.dataset.ris) - Number(x.dataset.ris));
  const scritto = celle.map((n) => (n.value || '').trim()).join('').replace(/^0+(?=\d)/, '');
  const box = $('#colEsito');
  if (!scritto) { box.innerHTML = `<div class="avviso avviso-att"><span class="ic">✏️</span><p>Scrivi prima il tuo risultato nelle caselle.</p></div>`; return; }
  if (scritto === giusto) {
    box.innerHTML = `<div class="avviso avviso-ok"><span class="ic">✅</span><p><b>Giusto!</b> ${esc(Colonna.a)} ${esc(Colonna.op)} ${esc(Colonna.b)} = ${esc(giusto)}</p></div>`;
  } else {
    const quante = Math.abs(scritto.length - giusto.length);
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">🤔</span>
      <p><b>Non ci siamo ancora.</b> ${quante ? 'Il risultato ha ' + giusto.length + ' cifre, tu ne hai scritte ' + scritto.length + '.' : 'Riguarda le colonne da destra verso sinistra: hai messo tutti i riporti?'}</p></div>`;
  }
}

function aiutoColonna() {
  const a = Colonna.a, b = Colonna.b;
  const ua = Number(a[a.length - 1]), ub = Number(b[b.length - 1]);
  let testo;
  if (Colonna.op === '+') {
    const s = ua + ub;
    testo = 'Comincia dalle unità: ' + ua + ' + ' + ub + ' = ' + s + '. ' +
      (s > 9 ? 'Scrivi ' + (s % 10) + ' e porti 1 sopra la colonna delle decine.' : 'Scrivi ' + s + ', non c\'è riporto.');
  } else if (Colonna.op === '−') {
    testo = ua >= ub
      ? 'Comincia dalle unità: ' + ua + ' − ' + ub + ' = ' + (ua - ub) + '.'
      : 'Comincia dalle unità: ' + ua + ' è più piccolo di ' + ub + ', quindi devi prendere in prestito una decina: ' + (ua + 10) + ' − ' + ub + ' = ' + (ua + 10 - ub) + '.';
  } else {
    const s = ua * ub;
    testo = 'Comincia da: ' + ub + ' × ' + ua + ' = ' + s + '. ' + (s > 9 ? 'Scrivi ' + (s % 10) + ' e porti ' + Math.floor(s / 10) + '.' : 'Scrivi ' + s + '.');
  }
  $('#colEsito').innerHTML = `<div class="avviso"><span class="ic">💡</span><p>${esc(testo)}</p></div>`;
}

/* ------------------------------------------------------------------
   TABELLINE
   ------------------------------------------------------------------ */

const Tab = { riga: 0, col: 0, nascondi: false, sfida: null, punti: 0 };

STRUMENTI['mate-tabelline'] = function (c) {
  c.innerHTML = testaStrumento('✖️', 'Tabelline', 'Tocca un numero per vedere riga e colonna.') + `
    <div class="card">
      <div class="barra-btn">
        <button type="button" class="btn" data-az="tab-nascondi" aria-pressed="${Tab.nascondi}">
          <span aria-hidden="true">🙈</span><span>Nascondi i risultati</span></button>
        ${bottone('tab-allena', '🎯', 'Allenamento', 'btn-primario')}
      </div>
      <div class="tabella-scroll" id="tabBox"></div>
      <p class="aiutino" id="tabInfo" aria-live="polite"></p>
    </div>
    <div id="tabSfida"></div>`;
  disegnaPitagorica();
};

function disegnaPitagorica() {
  const box = $('#tabBox');
  if (!box) return;
  let h = '<table class="pitagorica' + (Tab.nascondi ? ' nascondi' : '') + '"><caption class="sr-only">Tavola pitagorica da 1 a 10</caption><tr><th>×</th>';
  for (let j = 1; j <= 10; j++) h += '<th>' + j + '</th>';
  h += '</tr>';
  for (let i = 1; i <= 10; i++) {
    h += '<tr><th>' + i + '</th>';
    for (let j = 1; j <= 10; j++) {
      const evid = (Tab.riga === i || Tab.col === j);
      const scelto = (Tab.riga === i && Tab.col === j);
      h += `<td class="${scelto ? 'scelto' : evid ? 'evid' : ''}"><button type="button" data-tab="${i},${j}"
        aria-label="${i} per ${j} uguale ${i * j}">${i * j}</button></td>`;
    }
    h += '</tr>';
  }
  box.innerHTML = h + '</table>';
}

function toccaTabellina(i, j) {
  Tab.riga = i; Tab.col = j;
  disegnaPitagorica();
  const info = $('#tabInfo');
  if (info) info.textContent = i + ' × ' + j + ' = ' + (i * j) + '   (e anche ' + j + ' × ' + i + ' = ' + (i * j) + ')';
  const cella = $('[data-tab="' + i + ',' + j + '"]');
  if (cella) cella.closest('td').classList.add('svelato');
}

function nuovaSfidaTabelline() {
  const a = 2 + Math.floor(Math.random() * 9);
  const b = 2 + Math.floor(Math.random() * 9);
  Tab.sfida = { a, b };
  $('#tabSfida').innerHTML = `<div class="card">
    <h2>🎯 Allenamento</h2>
    <div class="mate mate-blocco" style="font-size:2.2em">${a} × ${b} = ?</div>
    <label class="etichetta" for="sfRisp">La mia risposta</label>
    <input class="campo" id="sfRisp" type="number" inputmode="numeric" autocomplete="off">
    <div class="barra-btn" style="margin-top:12px">
      ${bottone('tab-rispondi', '✔️', 'Controlla', 'btn-primario btn-grande')}
      ${bottone('tab-salta', '➡', 'Un\'altra')}
      ${bottone('tab-aiuto', '💡', 'Aiutami')}
    </div>
    <div id="sfEsito"></div>
  </div>`;
  const inp = $('#sfRisp');
  inp.focus();
  inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') rispondiTabellina(); });
}

function rispondiTabellina() {
  if (!Tab.sfida) return;
  const v = Number($('#sfRisp').value);
  const giusto = Tab.sfida.a * Tab.sfida.b;
  const box = $('#sfEsito');
  if (v === giusto) {
    Tab.punti++;
    box.innerHTML = `<div class="avviso avviso-ok"><span class="ic">✅</span><p><b>Corretto!</b> ${Tab.sfida.a} × ${Tab.sfida.b} = ${giusto}</p></div>`;
    setTimeout(nuovaSfidaTabelline, 1100);
  } else {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">🤔</span>
      <p><b>Riprova.</b> Nessun problema: prova a contare ${Tab.sfida.a} volte ${Tab.sfida.b}, oppure guarda la tavola qui sopra.</p></div>`;
  }
}

function aiutoTabellina() {
  if (!Tab.sfida) return;
  const { a, b } = Tab.sfida;
  const passi = [];
  for (let i = 1; i <= b; i++) passi.push(a * i);
  $('#sfEsito').innerHTML = `<div class="avviso"><span class="ic">💡</span>
    <p>Conta di ${a} in ${a}: ${esc(passi.join(' → '))}.<br>
    Oppure: ${a} × ${b} è come ${b} × ${a}: a volte è più facile al contrario.</p></div>`;
}

/* ------------------------------------------------------------------
   FRAZIONI
   ------------------------------------------------------------------ */

STRUMENTI['mate-frazioni'] = function (c) {
  c.innerHTML = testaStrumento('🍕', 'Frazioni', 'Scrivi una frazione e la vedi disegnata.') + `
    <div class="card">
      <div class="riga-campi">
        <div><label class="etichetta" for="frA">Prima frazione</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="campo" id="frA1" type="number" value="3" aria-label="numeratore prima frazione">
            <span style="font-size:1.6em">/</span>
            <input class="campo" id="frA2" type="number" value="4" aria-label="denominatore prima frazione">
          </div></div>
        <div><label class="etichetta" for="frB">Seconda frazione (per confrontare)</label>
          <div style="display:flex;gap:6px;align-items:center">
            <input class="campo" id="frB1" type="number" value="1" aria-label="numeratore seconda frazione">
            <span style="font-size:1.6em">/</span>
            <input class="campo" id="frB2" type="number" value="2" aria-label="denominatore seconda frazione">
          </div></div>
      </div>
      <div class="barra-btn" style="margin-top:12px">${bottone('fr-disegna', '🎨', 'Disegna e confronta', 'btn-primario btn-grande')}</div>
    </div>
    <div id="frRis"></div>`;
  disegnaFrazioni();
};

function disegnaFrazioni() {
  const n1 = Number($('#frA1').value), d1 = Number($('#frA2').value);
  const n2 = Number($('#frB1').value), d2 = Number($('#frB2').value);
  const box = $('#frRis');
  if (!d1 || !d2) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">⚠️</span>
      <p>Il denominatore (il numero sotto) non può essere zero: non si può dividere una cosa in zero parti.</p></div>`;
    return;
  }
  box.innerHTML = `<div class="card">
      <h2>La prima frazione</h2>
      ${bloccoFrazione(n1, d1)}
    </div>
    <div class="card">
      <h2>La seconda frazione</h2>
      ${bloccoFrazione(n2, d2)}
    </div>
    <div class="card">
      <h2>Confronto</h2>
      <div class="mate mate-blocco">${M.html(M.nNum(M.fr(n1, d1)))} ${confrontoSimbolo(n1 / d1, n2 / d2)} ${M.html(M.nNum(M.fr(n2, d2)))}</div>
      <p>${esc(spiegaConfronto(n1, d1, n2, d2))}</p>
      <div class="barra-btn">${bottone('fr-leggi', '🔊', 'Leggi le frazioni')}</div>
    </div>`;
}

function bloccoFrazione(n, d) {
  const intere = Math.floor(Math.abs(n) / d);
  const resto = Math.abs(n) % d;
  const torte = [];
  for (let k = 0; k < Math.max(1, intere + (resto ? 1 : 0)); k++) {
    const piene = k < intere ? d : resto;
    torte.push(tortaSvg(piene, d));
  }
  return `<div class="mate mate-blocco">${M.html(M.nNum(M.fr(n, d)))}</div>
    <div class="torta">${torte.join('')}</div>
    <div class="barra-frazione" style="margin:14px auto">
      ${Array.from({ length: d }, (_, i) => `<div class="fetta${i < (Math.abs(n) % d || (Math.abs(n) >= d ? d : 0)) ? ' piena' : ''}"></div>`).join('')}
    </div>
    <p class="aiutino">Sotto c'è in quante parti ho diviso l'intero (${d}), sopra quante parti prendo (${n}).</p>`;
}

function tortaSvg(piene, tot) {
  const r = 52, cx = 60, cy = 60;
  let s = `<svg width="120" height="120" viewBox="0 0 120 120" role="img" aria-label="${piene} parti colorate su ${tot}">`;
  for (let i = 0; i < tot; i++) {
    const a1 = (i / tot) * 2 * Math.PI - Math.PI / 2;
    const a2 = ((i + 1) / tot) * 2 * Math.PI - Math.PI / 2;
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2);
    const grande = (a2 - a1) > Math.PI ? 1 : 0;
    const d = tot === 1
      ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
      : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${grande} 1 ${x2} ${y2} Z`;
    s += `<path d="${d}" fill="${i < piene ? 'var(--primario)' : 'transparent'}" stroke="currentColor" stroke-width="2"/>`;
  }
  return s + '</svg>';
}

function confrontoSimbolo(a, b) { return a > b ? '&gt;' : a < b ? '&lt;' : '='; }
function spiegaConfronto(n1, d1, n2, d2) {
  const c = n1 * d2, e = n2 * d1;
  const mcm = d1 * d2;
  if (c === e) return 'Sono la stessa quantità, anche se scritte in modo diverso.';
  return 'Per confrontarle le riduco allo stesso denominatore (' + mcm + '): diventano ' +
    (n1 * d2) + '/' + mcm + ' e ' + (n2 * d1) + '/' + mcm +
    '. Adesso basta guardare i numeri sopra: ' + (c > e ? c + ' è più di ' + e : c + ' è meno di ' + e) + '.';
}

/* ------------------------------------------------------------------
   RETTA DEI NUMERI
   ------------------------------------------------------------------ */

const Retta = { da: -10, a: 10, punto: 0, secondo: 5, op: '+' };

STRUMENTI['mate-rettanum'] = function (c) {
  c.innerHTML = testaStrumento('📏', 'Retta dei numeri',
    'I numeri negativi sono a sinistra dello zero, i positivi a destra.') + `
    <div class="card">
      <div class="riga-campi">
        <div><label class="etichetta" for="rtA">Parto da</label>
          <input class="campo" id="rtA" type="number" value="${Retta.punto}"></div>
        <div><label class="etichetta" for="rtOp">Operazione</label>
          <select class="campo" id="rtOp"><option value="+">+ vado a destra</option><option value="-">− vado a sinistra</option></select></div>
        <div><label class="etichetta" for="rtB">Di quanto</label>
          <input class="campo" id="rtB" type="number" value="${Retta.secondo}"></div>
      </div>
      <div class="barra-btn" style="margin-top:12px">${bottone('rt-mostra', '▶', 'Fammi vedere', 'btn-primario btn-grande')}</div>
    </div>
    <div class="card"><div class="tela-wrap"><canvas class="tela" id="telaRetta" height="220"></canvas></div>
      <p id="rtSpiega" class="aiutino" aria-live="polite"></p></div>`;
  setTimeout(disegnaRettaNumeri, 30);
};

function disegnaRettaNumeri(mostraSalto) {
  const cv = $('#telaRetta');
  if (!cv) return;
  const larg = cv.parentElement.clientWidth - 20;
  cv.width = Math.max(320, larg) * (window.devicePixelRatio || 1);
  cv.height = 220 * (window.devicePixelRatio || 1);
  cv.style.height = '220px';
  const g = cv.getContext('2d');
  const S = window.devicePixelRatio || 1;
  g.setTransform(S, 0, 0, S, 0, 0);
  const W = cv.width / S, H = cv.height / S;
  const stile = getComputedStyle(document.documentElement);
  const colTesto = stile.getPropertyValue('--testo').trim() || '#000';
  const colPrim = stile.getPropertyValue('--primario').trim() || '#1d4e6f';

  const a = Number($('#rtA').value) || 0;
  const b = Number($('#rtB').value) || 0;
  const op = $('#rtOp').value;
  const ris = op === '+' ? a + b : a - b;
  const min = Math.min(a, ris, 0) - 3, max = Math.max(a, ris, 0) + 3;
  const px = (v) => 40 + (v - min) / (max - min) * (W - 80);
  const y = H / 2 + 20;

  g.clearRect(0, 0, W, H);
  g.strokeStyle = colTesto; g.fillStyle = colTesto; g.lineWidth = 2;
  g.beginPath(); g.moveTo(20, y); g.lineTo(W - 20, y); g.stroke();
  g.beginPath(); g.moveTo(W - 20, y); g.lineTo(W - 32, y - 6); g.lineTo(W - 32, y + 6); g.fill();

  g.font = '14px system-ui, sans-serif'; g.textAlign = 'center';
  const passo = Math.max(1, Math.round((max - min) / 20));
  for (let v = Math.ceil(min); v <= max; v += passo) {
    const x = px(v);
    g.beginPath(); g.moveTo(x, y - (v === 0 ? 12 : 7)); g.lineTo(x, y + (v === 0 ? 12 : 7)); g.stroke();
    g.fillText(String(v).replace('-', '−'), x, y + 30);
  }

  if (mostraSalto) {
    g.strokeStyle = colPrim; g.lineWidth = 3;
    g.beginPath();
    const x1 = px(a), x2 = px(ris);
    g.moveTo(x1, y - 12);
    g.quadraticCurveTo((x1 + x2) / 2, y - 78, x2, y - 12);
    g.stroke();
    g.fillStyle = colPrim;
    [[x1, a], [x2, ris]].forEach(([x, v], i) => {
      g.beginPath(); g.arc(x, y, 8, 0, 7); g.fill();
      g.font = 'bold 16px system-ui, sans-serif';
      g.fillText(i === 0 ? 'parto' : 'arrivo', x, y - 18 + (i ? -6 : 0));
    });
    $('#rtSpiega').textContent = 'Parto da ' + a + ', ' + (op === '+' ? 'vado a destra' : 'vado a sinistra') +
      ' di ' + Math.abs(b) + ' passi e arrivo a ' + ris + '.  ' + a + ' ' + op + ' ' + b + ' = ' + ris;
  }
}

/* ------------------------------------------------------------------
   PERCENTUALI
   ------------------------------------------------------------------ */

STRUMENTI['mate-perc'] = function (c) {
  c.innerHTML = testaStrumento('％', 'Percentuali', 'Per cento vuol dire "ogni cento".') + `
    <div class="card">
      <div class="riga-campi">
        <div><label class="etichetta" for="pcP">Percentuale</label>
          <input class="campo" id="pcP" type="number" value="25"></div>
        <div><label class="etichetta" for="pcD">di questo numero</label>
          <input class="campo" id="pcD" type="number" value="200"></div>
      </div>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('pc-calcola', '▶', 'Fammi vedere', 'btn-primario btn-grande')}
        ${bottone('pc-passaggi', '👣', 'Mostra i passaggi')}
      </div>
    </div>
    <div id="pcRis"></div>`;
  calcolaPercentuale(false);
};

function calcolaPercentuale(conPassaggi) {
  const p = Number($('#pcP').value) || 0;
  const d = Number($('#pcD').value) || 0;
  const r = d * p / 100;
  $('#pcRis').innerHTML = `<div class="card">
      <div class="perc-blocchi">
        <div class="blocco"><div class="et">Dato</div><div class="val">${Risolutore.numeroIt(d)}</div></div>
        <div class="blocco"><div class="et">Percentuale</div><div class="val">${Risolutore.numeroIt(p)}%</div></div>
        <div class="blocco"><div class="et">Operazione</div><div class="val" style="font-size:1.1em">${Risolutore.numeroIt(d)} × ${Risolutore.numeroIt(p)} ÷ 100</div></div>
        <div class="blocco" style="border-color:var(--ok);background:var(--ok-chiaro)"><div class="et">Risultato</div><div class="val">${Risolutore.numeroIt(r)}</div></div>
      </div>
      <div class="perc-barra" style="margin-top:16px" role="img" aria-label="${p} per cento riempito">
        <div class="riempi" style="width:${limita(p, 0, 100)}%"></div>
      </div>
      ${conPassaggi ? `
      <div style="margin-top:16px">
        <div class="passo"><div class="numero">Passo 1</div>
          <div class="mate mate-blocco">${Risolutore.numeroIt(p)}% = ${M.html(M.nNum(M.fr(p, 100)))}</div>
          <div class="spiega">"Per cento" vuol dire "diviso cento": ${p}% è ${p} parti su 100.</div></div>
        <div class="passo"><div class="numero">Passo 2</div>
          <div class="mate mate-blocco">${M.html(M.nNum(M.fr(p, 100)))} × ${Risolutore.numeroIt(d)}</div>
          <div class="spiega">"Di" vuol dire moltiplicare.</div></div>
        <div class="passo controllo"><div class="numero">Risultato</div>
          <div class="mate mate-blocco">${Risolutore.numeroIt(r)}</div>
          <div class="spiega">${esc('Controllo: se ' + p + '% è ' + Risolutore.numeroIt(r) + ', allora il 100% deve essere ' + Risolutore.numeroIt(d) + '.')}</div></div>
      </div>` : ''}
    </div>`;
}

/* ------------------------------------------------------------------
   PROBLEMI GUIDATI
   ------------------------------------------------------------------ */

const Problema = { testo: '', so: '', trovare: '', op: '', calcolo: '', risposta: '', passo: 1 };

STRUMENTI['mate-problema'] = function (c) {
  c.innerHTML = testaStrumento('🧩', 'Risolviamo il problema',
    'Non ti do subito il risultato: lo troviamo insieme, un pezzo alla volta.');
  disegnaProblema(c);
};

function disegnaProblema(c) {
  c = c || $('#vista');
  let box = $('#boxProblema');
  if (!box) {
    box = document.createElement('div');
    box.id = 'boxProblema';
    c.appendChild(box);
  }
  const p = Problema;
  const passi = [
    { n: 1, tit: '1. LEGGI', html: `
      <textarea class="area" id="pbTesto" rows="4" spellcheck="true"
        placeholder="Scrivi o incolla qui il testo del problema.">${esc(p.testo)}</textarea>
      <div class="barra-btn" style="margin-top:10px">
        ${bottone('pb-leggi', '🔊', 'Leggimelo')}
        ${bottone('pb-avanti:2', '➡', 'Ho letto, vado avanti', 'btn-primario')}
      </div>` },
    { n: 2, tit: '2. COSA SO?', html: `
      <p class="aiutino">Scrivi i numeri e le informazioni che il problema ti dà.</p>
      <textarea class="area" id="pbSo" rows="3" spellcheck="true" placeholder="Per esempio: Marco ha 24 figurine. Ne regala 7.">${esc(p.so)}</textarea>
      <div class="barra-btn" style="margin-top:10px">${bottone('pb-avanti:3', '➡', 'Avanti', 'btn-primario')}${bottone('pb-indietro:1', '⬅', 'Indietro')}</div>` },
    { n: 3, tit: '3. COSA DEVO TROVARE?', html: `
      <p class="aiutino">Di solito è l'ultima frase, quella con il punto di domanda.</p>
      <textarea class="area" id="pbTrovare" rows="2" spellcheck="true" placeholder="Per esempio: quante figurine gli rimangono.">${esc(p.trovare)}</textarea>
      <div class="barra-btn" style="margin-top:10px">${bottone('pb-avanti:4', '➡', 'Avanti', 'btn-primario')}${bottone('pb-indietro:2', '⬅', 'Indietro')}</div>` },
    { n: 4, tit: '4. QUALE OPERAZIONE SERVE?', html: `
      <div class="barra-btn">
        <button type="button" class="btn btn-grande" data-az="pb-op:+" aria-pressed="${p.op === '+'}">➕ Addizione</button>
        <button type="button" class="btn btn-grande" data-az="pb-op:-" aria-pressed="${p.op === '-'}">➖ Sottrazione</button>
        <button type="button" class="btn btn-grande" data-az="pb-op:*" aria-pressed="${p.op === '*'}">✖️ Moltiplicazione</button>
        <button type="button" class="btn btn-grande" data-az="pb-op:/" aria-pressed="${p.op === '/'}">➗ Divisione</button>
        <button type="button" class="btn btn-grande btn-attenzione" data-az="pb-op:?" aria-pressed="${p.op === '?'}">❓ Non lo so</button>
      </div>
      <div id="pbAiutoOp"></div>
      <div class="barra-btn" style="margin-top:10px">${bottone('pb-avanti:5', '➡', 'Avanti', 'btn-primario')}${bottone('pb-indietro:3', '⬅', 'Indietro')}</div>` },
    { n: 5, tit: '5. ESEGUI IL CALCOLO', html: `
      <p class="aiutino">Scrivi il calcolo, per esempio: 24 - 7</p>
      <input class="campo" id="pbCalcolo" type="text" value="${esc(p.calcolo)}" inputmode="text">
      <div class="barra-btn" style="margin-top:10px">
        ${bottone('pb-calcola', '🧮', 'Fai il conto', 'btn-primario')}
        ${bottone('pb-avanti:6', '➡', 'Avanti')}
        ${bottone('pb-indietro:4', '⬅', 'Indietro')}
      </div>
      <div id="pbRisCalcolo"></div>` },
    { n: 6, tit: '6. SCRIVI LA RISPOSTA', html: `
      <p class="aiutino">La risposta è una frase, non solo un numero.</p>
      <textarea class="area" id="pbRisposta" rows="2" spellcheck="true"
        placeholder="Per esempio: A Marco rimangono 17 figurine.">${esc(p.risposta)}</textarea>
      <div class="barra-btn" style="margin-top:10px">
        ${bottone('pb-salva', '💾', 'Salva nel quaderno', 'btn-primario')}
        ${bottone('pb-nuovo', '🆕', 'Nuovo problema')}
        ${bottone('pb-indietro:5', '⬅', 'Indietro')}
      </div>` }
  ];
  const corrente = passi.find((x) => x.n === p.passo) || passi[0];
  box.innerHTML = `
    <p class="frase-contatore">Passo ${p.passo} di 6</p>
    <div class="card">
      <h2>${esc(corrente.tit)}</h2>
      ${corrente.html}
    </div>`;
}

function problemaLeggiCampi() {
  const g = (id) => { const n = $(id); return n ? n.value : null; };
  const t = g('#pbTesto'); if (t !== null) Problema.testo = t;
  const s = g('#pbSo'); if (s !== null) Problema.so = s;
  const tr = g('#pbTrovare'); if (tr !== null) Problema.trovare = tr;
  const cl = g('#pbCalcolo'); if (cl !== null) Problema.calcolo = cl;
  const r = g('#pbRisposta'); if (r !== null) Problema.risposta = r;
}

const AIUTO_OPERAZIONE = {
  '+': 'L\'addizione serve quando si mette insieme, si aggiunge, si guadagna, si arriva in più.',
  '-': 'La sottrazione serve quando si toglie, si regala, si perde, si spende, oppure quando si chiede "quanti in più / quanti in meno".',
  '*': 'La moltiplicazione serve quando la stessa quantità si ripete più volte (per esempio 6 scatole da 12 penne).',
  '/': 'La divisione serve quando si distribuisce in parti uguali, oppure quando si chiede "quante volte ci sta".',
  '?': 'Nessun problema. Rileggi la domanda e chiediti: la quantità alla fine è PIÙ GRANDE o PIÙ PICCOLA di quella di partenza? Se è più piccola di solito serve una sottrazione o una divisione; se è più grande, un\'addizione o una moltiplicazione.'
};

function problemaOperazione(op) {
  Problema.op = op;
  const box = $('#pbAiutoOp');
  if (box) box.innerHTML = `<div class="avviso"><span class="ic">💡</span><p>${esc(AIUTO_OPERAZIONE[op] || '')}</p></div>`;
  $$('[data-az^="pb-op:"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.az === 'pb-op:' + op)));
}

function problemaCalcola() {
  problemaLeggiCampi();
  const box = $('#pbRisCalcolo');
  try {
    const v = M.valuta(M.analizza(Problema.calcolo), {});
    box.innerHTML = `<div class="avviso avviso-ok"><span class="ic">🧮</span>
      <p>Il calcolo <b>${esc(Problema.calcolo)}</b> fa <b>${esc(Risolutore.numeroIt(Number(v.toPrecision(12))))}</b>.
      Adesso però la risposta scrivila con parole tue.</p></div>`;
  } catch (e) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">✏️</span>
      <p>Non riesco a leggere questo calcolo. Scrivilo con i numeri e i segni, per esempio: 24 - 7</p></div>`;
  }
}

async function problemaSalva() {
  problemaLeggiCampi();
  if (!Problema.testo.trim()) { toast('Scrivi prima il testo del problema.'); return; }
  Stato.quaderno.unshift({
    id: uid('es'), data: oggiISO(), materia: 'Matematica', argomento: 'Problema',
    titolo: accorcia(Problema.testo, 50),
    testo: Problema.testo,
    procedimento: 'So: ' + Problema.so + '\nDevo trovare: ' + Problema.trovare +
      '\nOperazione: ' + (Problema.op || '—') + '\nCalcolo: ' + Problema.calcolo,
    risultato: Problema.risposta, nota: ''
  });
  await salvaOra();
  avvisoOk('Salvato nel quaderno di matematica');
}
