/* ==================================================================
   10-mate-grafici.js — piano cartesiano, retta e parabola,
   trigonometria, triangoli, logaritmi, analisi, formulario.
   ================================================================== */

/* ------------------------------------------------------------------
   Piano cartesiano riutilizzabile
   ------------------------------------------------------------------ */

const Piano = {
  xmin: -10, xmax: 10, ymin: -7, ymax: 7,
  funzioni: [],           // [{testo, ast, colore}]
  punti: [],              // [{x, y, et}]
  tela: null,

  colori: ['#1d6fa5', '#b03a2e', '#1f7a4d', '#7d3c98', '#b9770e'],

  imposta(idTela) {
    this.tela = $('#' + idTela);
    if (!this.tela) return;
    this.adatta();
    let trascina = null;
    const pos = (e) => {
      const r = this.tela.getBoundingClientRect();
      const t = (e.touches && e.touches[0]) || e;
      return { x: t.clientX - r.left, y: t.clientY - r.top, w: r.width, h: r.height };
    };
    const giu = (e) => { trascina = pos(e); };
    const muovi = (e) => {
      if (!trascina) return;
      const p = pos(e);
      const dx = (p.x - trascina.x) / p.w * (this.xmax - this.xmin);
      const dy = (p.y - trascina.y) / p.h * (this.ymax - this.ymin);
      this.xmin -= dx; this.xmax -= dx; this.ymin += dy; this.ymax += dy;
      trascina = p;
      this.disegna();
      if (e.cancelable) e.preventDefault();
    };
    const su = () => { trascina = null; };
    this.tela.addEventListener('mousedown', giu);
    this.tela.addEventListener('mousemove', muovi);
    window.addEventListener('mouseup', su);
    this.tela.addEventListener('touchstart', giu, { passive: true });
    this.tela.addEventListener('touchmove', muovi, { passive: false });
    this.tela.addEventListener('touchend', su);
    window.addEventListener('resize', () => { this.adatta(); this.disegna(); });
    this.disegna();
  },

  adatta() {
    const cv = this.tela;
    if (!cv) return;
    const S = window.devicePixelRatio || 1;
    const larg = Math.max(300, cv.parentElement.clientWidth - 20);
    const alt = Math.round(Math.min(520, Math.max(260, larg * 0.66)));
    cv.width = larg * S; cv.height = alt * S;
    cv.style.height = alt + 'px';
    // mantengo le proporzioni: un quadretto resta quadrato
    const centroY = (this.ymin + this.ymax) / 2;
    const mezzo = (this.xmax - this.xmin) * alt / larg / 2;
    this.ymin = centroY - mezzo; this.ymax = centroY + mezzo;
  },

  zoom(fattore) {
    const cx = (this.xmin + this.xmax) / 2, cy = (this.ymin + this.ymax) / 2;
    const dx = (this.xmax - this.xmin) * fattore / 2, dy = (this.ymax - this.ymin) * fattore / 2;
    this.xmin = cx - dx; this.xmax = cx + dx; this.ymin = cy - dy; this.ymax = cy + dy;
    this.disegna();
  },

  disegna() {
    const cv = this.tela;
    if (!cv) return;
    const g = cv.getContext('2d');
    const S = window.devicePixelRatio || 1;
    g.setTransform(S, 0, 0, S, 0, 0);
    const W = cv.width / S, H = cv.height / S;
    const st = getComputedStyle(document.documentElement);
    const colTesto = (st.getPropertyValue('--testo') || '#000').trim();
    const colBordo = (st.getPropertyValue('--bordo') || '#ccc').trim();
    const colSfondo = (st.getPropertyValue('--superficie') || '#fff').trim();

    const PX = (x) => (x - this.xmin) / (this.xmax - this.xmin) * W;
    const PY = (y) => H - (y - this.ymin) / (this.ymax - this.ymin) * H;

    g.fillStyle = colSfondo; g.fillRect(0, 0, W, H);

    // griglia
    const passo = passoGriglia(this.xmax - this.xmin);
    g.lineWidth = 1; g.strokeStyle = colBordo;
    g.beginPath();
    for (let x = Math.ceil(this.xmin / passo) * passo; x <= this.xmax; x += passo) {
      g.moveTo(PX(x), 0); g.lineTo(PX(x), H);
    }
    for (let y = Math.ceil(this.ymin / passo) * passo; y <= this.ymax; y += passo) {
      g.moveTo(0, PY(y)); g.lineTo(W, PY(y));
    }
    g.stroke();

    // assi
    g.strokeStyle = colTesto; g.lineWidth = 2;
    g.beginPath();
    g.moveTo(0, PY(0)); g.lineTo(W, PY(0));
    g.moveTo(PX(0), 0); g.lineTo(PX(0), H);
    g.stroke();

    // numeri sugli assi
    g.fillStyle = colTesto; g.font = '12px system-ui, sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'top';
    for (let x = Math.ceil(this.xmin / passo) * passo; x <= this.xmax; x += passo) {
      if (Math.abs(x) < 1e-9) continue;
      g.fillText(etichettaNumero(x), PX(x), limita(PY(0) + 4, 0, H - 16));
    }
    g.textAlign = 'right'; g.textBaseline = 'middle';
    for (let y = Math.ceil(this.ymin / passo) * passo; y <= this.ymax; y += passo) {
      if (Math.abs(y) < 1e-9) continue;
      g.fillText(etichettaNumero(y), limita(PX(0) - 6, 24, W - 4), PY(y));
    }

    // funzioni
    this.funzioni.forEach((f, i) => {
      g.strokeStyle = f.colore || this.colori[i % this.colori.length];
      g.lineWidth = 3;
      g.beginPath();
      let primo = true, yPrec = null;
      const passiX = Math.min(1400, Math.round(W));
      for (let k = 0; k <= passiX; k++) {
        const x = this.xmin + (this.xmax - this.xmin) * k / passiX;
        let y;
        try { y = M.valuta(f.ast, { x, e: Math.E }); } catch (e) { y = NaN; }
        if (!isFinite(y)) { primo = true; yPrec = null; continue; }
        // salto agli asintoti verticali
        if (yPrec !== null && Math.abs(y - yPrec) > (this.ymax - this.ymin) * 2) primo = true;
        const px = PX(x), py = PY(y);
        if (primo) { g.moveTo(px, py); primo = false; } else g.lineTo(px, py);
        yPrec = y;
      }
      g.stroke();
    });

    // punti notevoli
    this.punti.forEach((p) => {
      g.fillStyle = colTesto;
      g.beginPath(); g.arc(PX(p.x), PY(p.y), 6, 0, 7); g.fill();
      if (p.et) {
        g.font = 'bold 13px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom';
        g.fillText(p.et, PX(p.x) + 9, PY(p.y) - 6);
      }
    });
  }
};

function passoGriglia(larghezza) {
  const grezzo = larghezza / 12;
  const potenza = Math.pow(10, Math.floor(Math.log10(grezzo)));
  const n = grezzo / potenza;
  return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * potenza;
}
function etichettaNumero(x) {
  const v = Math.abs(x) < 1e-10 ? 0 : x;
  const s = Math.abs(v) >= 10000 || (Math.abs(v) < 0.001 && v !== 0) ? v.toExponential(1) : String(Math.round(v * 1000) / 1000);
  return s.replace('.', ',').replace('-', '−');
}

/* ------------------------------------------------------------------
   GRAFICATORE DI FUNZIONI
   ------------------------------------------------------------------ */

STRUMENTI['mate-grafico'] = function (c) {
  c.innerHTML = testaStrumento('📈', 'Grafici di funzioni',
    'Scrivi una funzione e la vedi disegnata. Puoi trascinare il piano con il dito.') + `
    <div class="card">
      <label class="etichetta" for="gfTesto">Funzione</label>
      <div class="riga-campi">
        <input class="campo" id="gfTesto" type="text" value="x^2 - 4" placeholder="Per esempio: 2x + 3" autocomplete="off" spellcheck="false">
        <button type="button" class="btn btn-primario" data-az="gf-aggiungi" style="flex:0 0 auto">
          <span aria-hidden="true">➕</span><span>Disegna</span></button>
      </div>
      ${tastieraMate('gfTesto')}
      <div id="gfElenco"></div>
    </div>
    <div class="card">
      <div class="barra-btn">
        ${bottone('gf-zoom+', '🔍', 'Ingrandisci')}
        ${bottone('gf-zoom-', '🔎', 'Rimpicciolisci')}
        ${bottone('gf-centra', '🎯', 'Rimetti al centro')}
        ${bottone('gf-zeri', '🔢', 'Trova gli zeri')}
        ${bottone('gf-inter', '✖️', 'Intersezioni')}
      </div>
      <div class="tela-wrap"><canvas class="tela" id="telaPiano"></canvas></div>
      <p class="aiutino">Trascina per spostarti. Gli assi si incontrano nell'origine (0; 0).</p>
      <div id="gfNote"></div>
    </div>`;
  setTimeout(() => { Piano.imposta('telaPiano'); disegnaElencoFunzioni(); }, 30);
};

function aggiungiFunzione(testo) {
  const t = (testo || $('#gfTesto').value || '').trim().replace(/^y\s*=\s*/i, '').replace(/^f\(x\)\s*=\s*/i, '');
  if (!t) return;
  try {
    const ast = M.analizza(t);
    M.valuta(ast, { x: 1, e: Math.E });      // prova: deve funzionare
    Piano.funzioni.push({ testo: t, ast, colore: Piano.colori[Piano.funzioni.length % Piano.colori.length] });
    disegnaElencoFunzioni();
    Piano.disegna();
  } catch (e) {
    avvisoErrore(e.amichevole ? e.message : 'Non riesco a leggere questa funzione. Scrivila per esempio così: x^2 - 4');
  }
}

function disegnaElencoFunzioni() {
  const box = $('#gfElenco');
  if (!box) return;
  box.innerHTML = Piano.funzioni.length
    ? `<ul class="lista" style="margin-top:12px">${Piano.funzioni.map((f, i) => `
      <li class="voce" style="align-items:center">
        <span class="pallino" style="background:${f.colore}"></span>
        <div class="corpo"><b>${i === 0 ? 'f' : i === 1 ? 'g' : 'h' + i}(x) = ${esc(f.testo)}</b></div>
        <div class="azioni">${bottone('gf-togli:' + i, '🗑️', 'Togli', 'btn-piccolo')}</div>
      </li>`).join('')}</ul>`
    : '<p class="aiutino">Nessuna funzione disegnata.</p>';
}

/** Zeri numerici: cerco i cambi di segno e affino per bisezione. */
function zeriFunzione(f) {
  const zeri = [];
  const N = 2000;
  let xPrec = Piano.xmin, yPrec = valoreSicuro(f, xPrec);
  for (let i = 1; i <= N; i++) {
    const x = Piano.xmin + (Piano.xmax - Piano.xmin) * i / N;
    const y = valoreSicuro(f, x);
    if (yPrec !== null && y !== null && yPrec * y < 0) {
      let a = xPrec, b = x;
      for (let k = 0; k < 60; k++) {
        const m = (a + b) / 2, ym = valoreSicuro(f, m);
        if (ym === null) break;
        if (valoreSicuro(f, a) * ym <= 0) b = m; else a = m;
      }
      const r = (a + b) / 2;
      if (Math.abs(valoreSicuro(f, r) || 1) < 1e-6) zeri.push(r);
    }
    xPrec = x; yPrec = y;
  }
  return zeri;
}
function valoreSicuro(f, x) {
  try { const v = M.valuta(f.ast, { x, e: Math.E }); return isFinite(v) ? v : null; }
  catch (e) { return null; }
}

function trovaZeri() {
  if (!Piano.funzioni.length) { toast('Prima disegna una funzione.'); return; }
  Piano.punti = [];
  let testo = '';
  Piano.funzioni.forEach((f, i) => {
    const z = zeriFunzione(f);
    z.forEach((x) => Piano.punti.push({ x, y: 0, et: Risolutore.numeroIt(x) }));
    testo += `<p><b>${i === 0 ? 'f' : 'g'}(x) = ${esc(f.testo)}</b>: ` +
      (z.length ? 'taglia l\'asse x in ' + z.map((x) => 'x = ' + Risolutore.numeroIt(x)).join(', ')
        : 'non taglia l\'asse x in questa parte di piano') + '</p>';
  });
  Piano.disegna();
  $('#gfNote').innerHTML = `<div class="avviso"><span class="ic">🔢</span><div>${testo}
    <p class="aiutino">Gli zeri sono i punti in cui la funzione vale 0: sono le soluzioni dell'equazione f(x) = 0.</p></div></div>`;
}

function trovaIntersezioni() {
  if (Piano.funzioni.length < 2) { toast('Servono almeno due funzioni.'); return; }
  const f = Piano.funzioni[0], g = Piano.funzioni[1];
  const diff = { ast: M.nSomma([f.ast, M.nProd([M.nNum(M.fr(-1)), g.ast])]) };
  const z = zeriFunzione(diff);
  Piano.punti = z.map((x) => ({ x, y: valoreSicuro(f, x) || 0, et: '(' + Risolutore.numeroIt(x) + '; ' + Risolutore.numeroIt(valoreSicuro(f, x) || 0) + ')' }));
  Piano.disegna();
  $('#gfNote').innerHTML = `<div class="avviso"><span class="ic">✖️</span><div>
    ${z.length ? '<p>Le due funzioni si incontrano in ' + z.length + (z.length === 1 ? ' punto.' : ' punti.') + '</p>'
      : '<p>In questa parte di piano non si incontrano.</p>'}
    <p class="aiutino">Le intersezioni sono i punti dove le due curve hanno la stessa y: cioè le soluzioni di f(x) = g(x).</p></div></div>`;
}

/* ------------------------------------------------------------------
   RETTA E PARABOLA
   ------------------------------------------------------------------ */

STRUMENTI['mate-rettapar'] = function (c) {
  c.innerHTML = testaStrumento('📉', 'Retta e parabola',
    'Scrivi l\'equazione: ti mostro i dati importanti e il disegno.') + `
    <div class="card">
      <label class="etichetta" for="rpTesto">Equazione</label>
      <input class="campo" id="rpTesto" type="text" value="y = x^2 - 4x + 3" autocomplete="off" spellcheck="false">
      ${tastieraMate('rpTesto')}
      <div class="barra-btn">
        ${bottone('rp-studia', '🔍', 'Studiala', 'btn-primario btn-grande')}
        ${bottone('rp-esempio-retta', '📏', 'Esempio retta')}
        ${bottone('rp-esempio-par', '🥣', 'Esempio parabola')}
      </div>
    </div>
    <div id="risultatoMate"></div>
    <div class="card"><div class="tela-wrap"><canvas class="tela" id="telaPiano"></canvas></div></div>`;
  setTimeout(() => Piano.imposta('telaPiano'), 30);
};

function studiaRettaParabola() {
  const t = $('#rpTesto').value.trim();
  if (!t) return;
  const senzaY = M.normalizzaTesto(t).replace(/^y\s*=\s*/i, '');
  let esito;
  let grado = 1;
  try {
    const P = M.polDaAst(M.analizza(senzaY));
    grado = P ? M.polGrado(P, 'x') : 1;
  } catch (e) { /* deciderà il risolutore */ }
  esito = grado >= 2 ? Risolutore.studioParabola(t) : Risolutore.studioRetta(t);
  _passi.unoAllaVolta = false;
  mostraPassi(esito, '#risultatoMate');

  Piano.funzioni = [];
  Piano.punti = [];
  try {
    const ast = M.analizza(senzaY);
    Piano.funzioni = [{ testo: senzaY, ast, colore: Piano.colori[0] }];
    if (esito.vertice) {
      Piano.punti.push({ x: M.fNum(esito.vertice.x), y: M.fNum(esito.vertice.y), et: 'V' });
      const dx = Math.max(6, Math.abs(M.fNum(esito.vertice.x)) + 5);
      Piano.xmin = M.fNum(esito.vertice.x) - dx; Piano.xmax = M.fNum(esito.vertice.x) + dx;
      Piano.ymin = M.fNum(esito.vertice.y) - dx; Piano.ymax = M.fNum(esito.vertice.y) + dx;
      Piano.adatta();
    }
    Piano.disegna();
  } catch (e) { /* il grafico resta vuoto */ }
}

/* ------------------------------------------------------------------
   TRIGONOMETRIA: circonferenza goniometrica
   ------------------------------------------------------------------ */

const Trigo = { angolo: 30 };

STRUMENTI['mate-trigono'] = function (c) {
  c.innerHTML = testaStrumento('⭕', 'Circonferenza goniometrica',
    'Muovi l\'angolo e guarda come cambiano seno, coseno e tangente.') + `
    <div class="card">
      <div class="slider-riga">
        <label for="trAng">Angolo</label><output id="trOut">${Trigo.angolo}°</output>
        <input type="range" id="trAng" min="0" max="360" step="1" value="${Trigo.angolo}">
      </div>
      <div class="barra-btn">
        ${[0, 30, 45, 60, 90, 180, 270].map((a) => `<button type="button" class="btn btn-piccolo" data-az="tr-vai:${a}">${a}°</button>`).join('')}
      </div>
      <div class="tela-wrap"><canvas class="tela" id="telaTrigo" style="max-width:520px;margin:0 auto"></canvas></div>
      <div class="perc-blocchi" id="trValori" style="margin-top:14px"></div>
      <div class="barra-btn" style="margin-top:12px">${bottone('tr-leggi', '🔊', 'Leggi i valori')}</div>
    </div>
    <div class="card card-soft">
      <h3>Da ricordare</h3>
      <p>Il <b>coseno</b> si legge sull'asse orizzontale (quanto vado a destra o a sinistra).<br>
         Il <b>seno</b> si legge sull'asse verticale (quanto vado su o giù).<br>
         La <b>tangente</b> è seno diviso coseno: quando il coseno è zero non esiste.</p>
      <div class="mate mate-blocco">sen²α + cos²α = 1</div>
      <p class="aiutino">Questa è l'identità fondamentale: vale per qualsiasi angolo.</p>
    </div>`;
  const rg = $('#trAng', c);
  rg.addEventListener('input', () => { Trigo.angolo = Number(rg.value); disegnaTrigo(); });
  setTimeout(disegnaTrigo, 30);
};

function disegnaTrigo() {
  const cv = $('#telaTrigo');
  if (!cv) return;
  const S = window.devicePixelRatio || 1;
  const lato = Math.min(520, Math.max(280, cv.parentElement.clientWidth - 20));
  cv.width = lato * S; cv.height = lato * S; cv.style.height = lato + 'px';
  const g = cv.getContext('2d');
  g.setTransform(S, 0, 0, S, 0, 0);
  const W = lato, H = lato, cx = W / 2, cy = H / 2, R = W * 0.36;
  const st = getComputedStyle(document.documentElement);
  const colTesto = (st.getPropertyValue('--testo') || '#000').trim();
  const colBordo = (st.getPropertyValue('--bordo') || '#ccc').trim();
  const colPrim = (st.getPropertyValue('--primario') || '#1d4e6f').trim();

  g.clearRect(0, 0, W, H);
  g.strokeStyle = colBordo; g.lineWidth = 1;
  g.beginPath(); g.moveTo(0, cy); g.lineTo(W, cy); g.moveTo(cx, 0); g.lineTo(cx, H); g.stroke();
  g.strokeStyle = colTesto; g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, R, 0, Math.PI * 2); g.stroke();

  const a = Trigo.angolo * Math.PI / 180;
  const px = cx + R * Math.cos(a), py = cy - R * Math.sin(a);

  // archi e segmenti
  g.strokeStyle = colPrim; g.lineWidth = 3;
  g.beginPath(); g.moveTo(cx, cy); g.lineTo(px, py); g.stroke();
  g.setLineDash([6, 5]); g.lineWidth = 2;
  g.beginPath(); g.moveTo(px, py); g.lineTo(px, cy); g.stroke();     // seno
  g.beginPath(); g.moveTo(px, cy); g.lineTo(cx, cy); g.stroke();     // coseno
  g.setLineDash([]);
  g.fillStyle = colPrim;
  g.beginPath(); g.arc(px, py, 7, 0, 7); g.fill();

  g.strokeStyle = colPrim; g.lineWidth = 2;
  g.beginPath(); g.arc(cx, cy, 26, 0, -a, true); g.stroke();
  g.fillStyle = colTesto; g.font = 'bold 14px system-ui, sans-serif';
  g.fillText(Trigo.angolo + '°', cx + 32, cy - 12);
  g.font = '13px system-ui, sans-serif';
  g.fillText('sen', px + 8, (py + cy) / 2);
  g.fillText('cos', (px + cx) / 2 - 12, cy + 18);

  const sen = Math.sin(a), cos = Math.cos(a);
  const tan = Math.abs(cos) < 1e-12 ? null : sen / cos;
  const arr = (v) => Risolutore.numeroIt(Math.round(v * 10000) / 10000);
  $('#trOut').textContent = Trigo.angolo + '°';
  $('#trValori').innerHTML = `
    <div class="blocco"><div class="et">Gradi</div><div class="val">${Trigo.angolo}°</div></div>
    <div class="blocco"><div class="et">Radianti</div><div class="val">${esc(radianti(Trigo.angolo))}</div></div>
    <div class="blocco"><div class="et">Seno</div><div class="val">${esc(arr(sen))}</div></div>
    <div class="blocco"><div class="et">Coseno</div><div class="val">${esc(arr(cos))}</div></div>
    <div class="blocco"><div class="et">Tangente</div><div class="val">${tan === null ? 'non esiste' : esc(arr(tan))}</div></div>`;
}

function radianti(gradi) {
  const g = ((gradi % 360) + 360) % 360;
  const noti = { 0: '0', 30: 'π/6', 45: 'π/4', 60: 'π/3', 90: 'π/2', 120: '2π/3', 135: '3π/4',
    150: '5π/6', 180: 'π', 210: '7π/6', 225: '5π/4', 240: '4π/3', 270: '3π/2', 300: '5π/3', 315: '7π/4', 330: '11π/6' };
  if (noti[g] !== undefined) return noti[g];
  return Risolutore.numeroIt(Math.round(g * Math.PI / 180 * 1000) / 1000);
}

/* ------------------------------------------------------------------
   TRIANGOLI
   ------------------------------------------------------------------ */

STRUMENTI['mate-triangoli'] = function (c) {
  c.innerHTML = testaStrumento('🔺', 'Triangoli',
    'Scrivi i dati che conosci e lascia vuoto il resto: cerco io il teorema giusto.') + `
    <div class="card">
      <p class="aiutino">I lati si chiamano a, b, c. Ogni angolo sta di fronte al lato con la stessa lettera:
        l'angolo A è opposto al lato a.</p>
      <div class="riga-campi">
        <div><label class="etichetta" for="triA">Lato a</label><input class="campo" id="triA" type="number" step="any"></div>
        <div><label class="etichetta" for="triB">Lato b</label><input class="campo" id="triB" type="number" step="any"></div>
        <div><label class="etichetta" for="triC">Lato c</label><input class="campo" id="triC" type="number" step="any"></div>
      </div>
      <div class="riga-campi">
        <div><label class="etichetta" for="triAA">Angolo A (gradi)</label><input class="campo" id="triAA" type="number" step="any"></div>
        <div><label class="etichetta" for="triBB">Angolo B (gradi)</label><input class="campo" id="triBB" type="number" step="any"></div>
        <div><label class="etichetta" for="triCC">Angolo C (gradi)</label><input class="campo" id="triCC" type="number" step="any"></div>
      </div>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('tri-risolvi', '🔍', 'Risolvi il triangolo', 'btn-primario btn-grande')}
        ${bottone('tri-esempio', '💡', 'Esempio')}
      </div>
    </div>
    <div id="triRis"></div>`;
};

function risolviTriangolo() {
  const n = (id) => { const v = $(id).value.trim(); return v === '' ? null : Number(v); };
  let a = n('#triA'), b = n('#triB'), c = n('#triC');
  let A = n('#triAA'), B = n('#triBB'), C = n('#triCC');
  const box = $('#triRis');
  const passi = [];
  const rad = (x) => x * Math.PI / 180, gra = (x) => x * 180 / Math.PI;
  const num = Risolutore.numeroIt;

  const datiLati = [a, b, c].filter((x) => x !== null && x > 0).length;
  const datiAngoli = [A, B, C].filter((x) => x !== null && x > 0).length;
  if (datiLati + datiAngoli < 3) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">✏️</span>
      <p>Mi servono almeno tre dati (e almeno un lato) per risolvere il triangolo.</p></div>`;
    return;
  }
  if (datiAngoli && [A, B, C].reduce((s, x) => s + (x || 0), 0) > 180.01) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">⚠️</span>
      <p>La somma degli angoli di un triangolo è 180°: i dati che hai scritto non possono stare insieme.</p></div>`;
    return;
  }

  // terzo angolo
  if (datiAngoli === 2) {
    const somma = (A || 0) + (B || 0) + (C || 0);
    const manca = 180 - somma;
    if (A === null) { A = manca; } else if (B === null) { B = manca; } else { C = manca; }
    passi.push({ tit: 'Terzo angolo', html: '<div class="mate mate-blocco">180° − (somma degli altri due) = ' + num(manca) + '°</div>',
      spiega: 'La somma degli angoli interni di un triangolo è sempre 180°.' });
  }

  if (datiLati === 3) {
    // teorema del coseno per tutti gli angoli
    A = gra(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
    B = gra(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
    C = 180 - A - B;
    const rettangolo = [A, B, C].some((x) => Math.abs(x - 90) < 0.01);
    passi.push({ tit: 'Conosco i tre lati', html: '<div class="mate mate-blocco">cos A = (b² + c² − a²) / (2bc)</div>',
      spiega: 'Con i tre lati uso il teorema del coseno per trovare gli angoli.',
      perche: 'Il teorema del coseno è la versione "generale" di Pitagora: se l\'angolo è di 90° il termine con il coseno sparisce e resta a² = b² + c².' });
    if (rettangolo) passi.push({ tit: 'È un triangolo rettangolo!', html: '<div class="mate mate-blocco">a² = b² + c²</div>', spiega: 'Uno degli angoli è di 90°: qui vale il teorema di Pitagora.' });
  } else if (datiLati === 2 && datiAngoli >= 1) {
    // lato mancante
    if (a === null && A !== null) { a = Math.sqrt(b * b + c * c - 2 * b * c * Math.cos(rad(A))); }
    else if (b === null && B !== null) { b = Math.sqrt(a * a + c * c - 2 * a * c * Math.cos(rad(B))); }
    else if (c === null && C !== null) { c = Math.sqrt(a * a + b * b - 2 * a * b * Math.cos(rad(C))); }
    else {
      // teorema dei seni
      if (a !== null && A !== null && b !== null) { B = gra(Math.asin(b * Math.sin(rad(A)) / a)); C = 180 - A - B; c = a * Math.sin(rad(C)) / Math.sin(rad(A)); }
    }
    passi.push({ tit: 'Due lati e un angolo', html: '<div class="mate mate-blocco">a² = b² + c² − 2bc·cos A</div>',
      spiega: 'Uso il teorema del coseno per trovare il lato che manca.' });
    if (a && b && c) {
      A = gra(Math.acos((b * b + c * c - a * a) / (2 * b * c)));
      B = gra(Math.acos((a * a + c * c - b * b) / (2 * a * c)));
      C = 180 - A - B;
    }
  } else if (datiLati === 1 && datiAngoli >= 2) {
    const noto = a !== null ? { l: a, ang: A } : b !== null ? { l: b, ang: B } : { l: c, ang: C };
    if (noto.ang) {
      const k = noto.l / Math.sin(rad(noto.ang));
      if (a === null && A) a = k * Math.sin(rad(A));
      if (b === null && B) b = k * Math.sin(rad(B));
      if (c === null && C) c = k * Math.sin(rad(C));
      passi.push({ tit: 'Un lato e due angoli', html: '<div class="mate mate-blocco">a / sen A = b / sen B = c / sen C</div>',
        spiega: 'Uso il teorema dei seni: il rapporto fra un lato e il seno del suo angolo opposto è sempre lo stesso.' });
    }
  }

  if (![a, b, c].every((x) => x && isFinite(x))) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">🤔</span>
      <p>Con questi dati non riesco a risolvere il triangolo in modo sicuro. Controlla di aver messo l'angolo giusto,
      oppure aggiungi un altro dato.</p></div>`;
    return;
  }

  const p = (a + b + c) / 2;
  const area = Math.sqrt(Math.max(0, p * (p - a) * (p - b) * (p - c)));

  box.innerHTML = `<div class="card">
      ${disegnaTriangoloSvg(a, b, c)}
      <div class="perc-blocchi" style="margin-top:14px">
        <div class="blocco"><div class="et">Lato a</div><div class="val">${num(a)}</div></div>
        <div class="blocco"><div class="et">Lato b</div><div class="val">${num(b)}</div></div>
        <div class="blocco"><div class="et">Lato c</div><div class="val">${num(c)}</div></div>
        <div class="blocco"><div class="et">Angolo A</div><div class="val">${num(A)}°</div></div>
        <div class="blocco"><div class="et">Angolo B</div><div class="val">${num(B)}°</div></div>
        <div class="blocco"><div class="et">Angolo C</div><div class="val">${num(C)}°</div></div>
        <div class="blocco"><div class="et">Perimetro</div><div class="val">${num(a + b + c)}</div></div>
        <div class="blocco" style="border-color:var(--ok);background:var(--ok-chiaro)"><div class="et">Area</div><div class="val">${num(Math.round(area * 10000) / 10000)}</div></div>
      </div>
    </div>
    ${passi.map((s) => `<div class="passo"><div class="numero">${esc(s.tit)}</div>${s.html}
      <div class="spiega">${esc(s.spiega)}</div>${s.perche ? `<div class="aiuto-testo" style="margin-top:8px">${esc(s.perche)}</div>` : ''}</div>`).join('')}
    <div class="card card-soft"><p class="aiutino">L'area l'ho calcolata con la formula di Erone:
      p = (a+b+c)/2, area = √(p(p−a)(p−b)(p−c)).</p></div>`;
}

function disegnaTriangoloSvg(a, b, c) {
  // metto il lato c in orizzontale e calcolo il terzo vertice
  const W = 320, H = 220;
  const scala = Math.min(W - 60, H - 60) / Math.max(a, b, c);
  const cx = c * scala;
  const x = (b * b + cx * cx - a * a * scala * scala / (scala * scala)) / (2 * cx);
  const px = (b * b * scala * scala + cx * cx - a * a * scala * scala) / (2 * cx);
  const py = Math.sqrt(Math.max(0, b * b * scala * scala - px * px));
  const offX = (W - cx) / 2, offY = H - 30;
  const P = [[offX, offY], [offX + cx, offY], [offX + px, offY - py]];
  return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:340px;display:block;margin:0 auto" role="img" aria-label="disegno del triangolo">
    <polygon points="${P.map((q) => q[0].toFixed(1) + ',' + q[1].toFixed(1)).join(' ')}"
      fill="var(--primario-chiaro)" stroke="var(--primario)" stroke-width="3"/>
    <text x="${(P[0][0] + P[1][0]) / 2}" y="${P[0][1] + 20}" text-anchor="middle" font-size="15" fill="currentColor">c</text>
    <text x="${(P[1][0] + P[2][0]) / 2 + 12}" y="${(P[1][1] + P[2][1]) / 2}" font-size="15" fill="currentColor">a</text>
    <text x="${(P[0][0] + P[2][0]) / 2 - 18}" y="${(P[0][1] + P[2][1]) / 2}" font-size="15" fill="currentColor">b</text>
    <text x="${P[0][0] - 4}" y="${P[0][1] + 4}" text-anchor="end" font-size="14" font-weight="bold" fill="currentColor">A</text>
    <text x="${P[1][0] + 6}" y="${P[1][1] + 4}" font-size="14" font-weight="bold" fill="currentColor">B</text>
    <text x="${P[2][0]}" y="${P[2][1] - 8}" text-anchor="middle" font-size="14" font-weight="bold" fill="currentColor">C</text>
  </svg>`;
}

/* ------------------------------------------------------------------
   LOGARITMI E POTENZE
   ------------------------------------------------------------------ */

STRUMENTI['mate-loghi'] = function (c) {
  c.innerHTML = testaStrumento('🔟', 'Logaritmi e potenze',
    'Il logaritmo risponde alla domanda: "a quale potenza devo elevare la base?"') + `
    <div class="card">
      <div class="riga-campi">
        <div><label class="etichetta" for="lgBase">Base</label><input class="campo" id="lgBase" type="number" step="any" value="2"></div>
        <div><label class="etichetta" for="lgArg">Numero</label><input class="campo" id="lgArg" type="number" step="any" value="8"></div>
      </div>
      <div class="barra-btn" style="margin-top:12px">${bottone('lg-calcola', '▶', 'Fammi vedere', 'btn-primario btn-grande')}</div>
      <div id="lgRis"></div>
    </div>
    <div class="card card-soft">
      <h3>Le proprietà da ricordare</h3>
      <div class="cosa-faccio">
        <div class="riga"><div class="mate">log<sub>a</sub>(x·y) = log<sub>a</sub>x + log<sub>a</sub>y</div><div class="nota">Il prodotto dentro diventa una somma fuori.</div></div>
        <div class="riga"><div class="mate">log<sub>a</sub>(x/y) = log<sub>a</sub>x − log<sub>a</sub>y</div><div class="nota">La divisione diventa una sottrazione.</div></div>
        <div class="riga"><div class="mate">log<sub>a</sub>(x<sup>n</sup>) = n · log<sub>a</sub>x</div><div class="nota">L'esponente viene davanti.</div></div>
        <div class="riga"><div class="mate">log<sub>a</sub>1 = 0</div><div class="nota">Qualsiasi numero elevato a 0 fa 1.</div></div>
        <div class="riga"><div class="mate">log<sub>a</sub>a = 1</div><div class="nota">La base elevata a 1 dà se stessa.</div></div>
      </div>
      <div class="avviso avviso-att" style="margin-top:12px"><span class="ic">⚠️</span>
        <p>Il numero dentro al logaritmo deve essere <b>maggiore di zero</b>, e la base deve essere positiva e diversa da 1.</p></div>
    </div>`;
};

function calcolaLogaritmo() {
  const b = Number($('#lgBase').value), x = Number($('#lgArg').value);
  const box = $('#lgRis');
  if (!(b > 0) || b === 1 || !(x > 0)) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">⚠️</span>
      <p>La base deve essere positiva e diversa da 1, e il numero deve essere maggiore di zero.</p></div>`;
    return;
  }
  const y = Math.log(x) / Math.log(b);
  const esatto = Math.abs(y - Math.round(y)) < 1e-9;
  box.innerHTML = `
    <div class="passo"><div class="numero">La domanda</div>
      <div class="mate mate-blocco">log<sub>${esc(b)}</sub> ${esc(x)} = ?</div>
      <div class="spiega">A quale potenza devo elevare ${esc(String(b))} per ottenere ${esc(String(x))}?</div></div>
    <div class="passo controllo"><div class="numero">La risposta</div>
      <div class="mate mate-blocco">${esc(Risolutore.numeroIt(esatto ? Math.round(y) : Math.round(y * 10000) / 10000))}</div>
      <div class="spiega">${esatto ? 'Infatti ' + b + '^' + Math.round(y) + ' = ' + x + '.' : 'Non viene un numero intero: questo è il valore approssimato.'}</div></div>
    <div class="passo"><div class="numero">Le due facce della stessa medaglia</div>
      <div class="mate mate-blocco">log<sub>${esc(b)}</sub> ${esc(x)} = ${esc(Risolutore.numeroIt(esatto ? Math.round(y) : Math.round(y * 100) / 100))}
        &nbsp;&nbsp;⇄&nbsp;&nbsp; ${esc(b)}<sup>${esc(Risolutore.numeroIt(esatto ? Math.round(y) : Math.round(y * 100) / 100))}</sup> = ${esc(x)}</div>
      <div class="spiega">Logaritmo e potenza dicono la stessa cosa, girata al contrario.</div></div>`;
}

/* ------------------------------------------------------------------
   ANALISI: derivate, limiti, integrali
   ------------------------------------------------------------------ */

STRUMENTI['mate-analisi'] = function (c) {
  c.innerHTML = testaStrumento('∫', 'Derivate, limiti e integrali', null) + `
    <div class="card">
      <label class="etichetta" for="anTesto">La funzione</label>
      <input class="campo" id="anTesto" type="text" value="3x^2 + 2x - 5" autocomplete="off" spellcheck="false">
      ${tastieraMate('anTesto')}
      <div class="riga-campi">
        <div>
          <label class="etichetta" for="anVerso">Per il limite: x tende a</label>
          <input class="campo" id="anVerso" type="text" value="0" placeholder="un numero, oppure inf">
        </div>
      </div>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('an-derivata', 'f′', 'Derivata', 'btn-primario btn-grande')}
        ${bottone('an-limite', 'lim', 'Limite', 'btn-grande')}
        ${bottone('an-integrale', '∫', 'Integrale', 'btn-grande')}
        ${bottone('an-grafico', '📈', 'Vedi il grafico', 'btn-grande')}
      </div>
    </div>
    <div id="risultatoMate"></div>
    <div class="card"><div class="tela-wrap"><canvas class="tela" id="telaPiano"></canvas></div></div>`;
  setTimeout(() => Piano.imposta('telaPiano'), 30);
};

/* ------------------------------------------------------------------
   STUDIAMO UNA FUNZIONE
   ------------------------------------------------------------------ */

const PASSI_STUDIO = [
  { id: 'dominio', tit: 'Dominio' },
  { id: 'simmetrie', tit: 'Simmetrie' },
  { id: 'interx', tit: 'Intersezione con l\'asse x' },
  { id: 'intery', tit: 'Intersezione con l\'asse y' },
  { id: 'segno', tit: 'Segno' },
  { id: 'limiti', tit: 'Limiti agli estremi' },
  { id: 'asintoti', tit: 'Asintoti' },
  { id: 'derivata1', tit: 'Derivata prima' },
  { id: 'crescenza', tit: 'Crescenza, massimi e minimi' },
  { id: 'derivata2', tit: 'Derivata seconda' },
  { id: 'concavita', tit: 'Concavità e flessi' },
  { id: 'grafico', tit: 'Grafico finale' }
];

const Studio = { funzione: 'x^2 - 4', fatti: {}, risultati: {} };

STRUMENTI['mate-studiofun'] = function (c) {
  c.innerHTML = testaStrumento('📊', 'Studiamo una funzione',
    'Una cosa alla volta: spunta i passaggi man mano che li capisci.') + `
    <div class="card">
      <label class="etichetta" for="sfTesto">La funzione</label>
      <input class="campo" id="sfTesto" type="text" value="${esc(Studio.funzione)}" autocomplete="off" spellcheck="false">
      ${tastieraMate('sfTesto')}
      <div class="barra-btn">${bottone('sf-avvia', '▶', 'Cominciamo', 'btn-primario btn-grande')}</div>
    </div>
    <div id="sfPassi"></div>`;
  disegnaChecklistStudio();
};

function disegnaChecklistStudio() {
  const box = $('#sfPassi');
  if (!box) return;
  box.innerHTML = `<div class="card">
    <h2>La scaletta</h2>
    ${PASSI_STUDIO.map((p) => `
      <div class="voce" style="align-items:center;margin-bottom:8px">
        <label class="check" style="flex:1 1 auto;min-height:0">
          <input type="checkbox" data-studio="${p.id}"${Studio.fatti[p.id] ? ' checked' : ''}>
          <span>${esc(p.tit)}</span>
        </label>
        <div class="azioni">${bottone('sf-passo:' + p.id, '🔍', 'Fai questo', 'btn-piccolo')}</div>
      </div>`).join('')}
    <p class="aiutino">Non serve fare tutto oggi. Spunta quello che hai capito.</p>
  </div>
  <div id="sfRisultato"></div>`;
  box.addEventListener('change', (e) => {
    const n = e.target.closest('[data-studio]');
    if (!n) return;
    Studio.fatti[n.dataset.studio] = n.checked;
  });
}

function eseguiPassoStudio(id) {
  const t = ($('#sfTesto') || {}).value || Studio.funzione;
  Studio.funzione = t.replace(/^y\s*=\s*/i, '').replace(/^f\(x\)\s*=\s*/i, '');
  const box = $('#sfRisultato');
  let ast, rat;
  try { ast = M.analizza(Studio.funzione); rat = M.ratDaAst(ast); }
  catch (e) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">✏️</span><p>Non riesco a leggere questa funzione.</p></div>`;
    return;
  }
  const titolo = (PASSI_STUDIO.find((p) => p.id === id) || {}).tit || '';
  let html = '', spiega = '', stato = 'verde';

  const zeriDi = (P) => {
    const c = P ? M.polCoeffNum(P, 'x') : null;
    return c ? M.radiciRazionali(c) : null;
  };

  switch (id) {
    case 'dominio': {
      if (rat && M.polCostante(rat.d)) { html = '<div class="mate mate-blocco">D = ℝ</div>'; spiega = 'Non ci sono denominatori con la x, né radici, né logaritmi: va bene ogni numero.'; }
      else if (rat) {
        const z = zeriDi(rat.d);
        html = '<div class="mate mate-blocco">' + (z && z.length ? 'x ≠ ' + z.map((r) => M.fTesto(r).replace('-', '−')).join(', &nbsp; x ≠ ') : 'D = ℝ') + '</div>';
        spiega = 'Il denominatore non può valere zero: quei valori vanno tolti dal dominio.';
      } else {
        stato = 'giallo';
        html = '<div class="mate mate-blocco">Da controllare a mano</div>';
        spiega = 'Questa funzione contiene radici, logaritmi o altre cose: guarda tu le condizioni (radice pari ≥ 0, argomento del logaritmo > 0, denominatore ≠ 0).';
      }
      break;
    }
    case 'simmetrie': {
      let pari = true, dispari = true;
      for (const x of [0.7, 1.3, 2.1, 3.4]) {
        try {
          const f1 = M.valuta(ast, { x }), f2 = M.valuta(ast, { x: -x });
          if (Math.abs(f1 - f2) > 1e-9) pari = false;
          if (Math.abs(f1 + f2) > 1e-9) dispari = false;
        } catch (e) { pari = dispari = false; }
      }
      html = '<div class="mate mate-blocco">' + (pari ? 'Funzione PARI: f(−x) = f(x)' : dispari ? 'Funzione DISPARI: f(−x) = −f(x)' : 'Né pari né dispari') + '</div>';
      spiega = pari ? 'Il grafico è simmetrico rispetto all\'asse y.' : dispari ? 'Il grafico è simmetrico rispetto all\'origine.' : 'Non c\'è una simmetria semplice.';
      break;
    }
    case 'interx': {
      const z = rat ? zeriDi(rat.n) : null;
      if (z && z.length) { html = '<div class="mate mate-blocco">' + z.map((r) => '(' + M.fTesto(r).replace('-', '−') + '; 0)').join(' &nbsp; ') + '</div>'; spiega = 'Ho messo y = 0 e risolto: sono i punti dove il grafico taglia l\'asse orizzontale.'; }
      else {
        const f = { ast };
        Piano.xmin = -10; Piano.xmax = 10;
        const zn = zeriFunzione(f);
        stato = zn.length ? 'giallo' : 'giallo';
        html = '<div class="mate mate-blocco">' + (zn.length ? zn.map((x) => '≈ (' + Risolutore.numeroIt(x) + '; 0)').join(' &nbsp; ') : 'Nessuno fra −10 e 10') + '</div>';
        spiega = 'Questi valori li ho trovati numericamente (approssimati), non con i passaggi algebrici.';
      }
      break;
    }
    case 'intery': {
      try {
        const y0 = M.valuta(ast, { x: 0 });
        html = '<div class="mate mate-blocco">(0; ' + Risolutore.numeroIt(y0) + ')</div>';
        spiega = 'Ho messo x = 0 nella funzione.';
      } catch (e) { html = '<div class="mate mate-blocco">Non esiste</div>'; spiega = 'In x = 0 la funzione non è definita.'; }
      break;
    }
    case 'segno': {
      const z = rat ? (zeriDi(rat.n) || []).concat(zeriDi(rat.d) || []) : [];
      const punti = z.map((r) => M.fNum(r)).sort((a, b) => a - b);
      const intervalli = [];
      const bordi = [-Infinity].concat(punti, [Infinity]);
      for (let i = 0; i < bordi.length - 1; i++) {
        const a = bordi[i], b = bordi[i + 1];
        const campione = !isFinite(a) ? b - 1 : !isFinite(b) ? a + 1 : (a + b) / 2;
        let v;
        try { v = M.valuta(ast, { x: campione }); } catch (e) { v = NaN; }
        intervalli.push({ da: a, a: b, segno: v > 0 ? '+' : v < 0 ? '−' : '0' });
      }
      html = '<div class="cosa-faccio">' + intervalli.map((iv) =>
        `<div class="riga"><div class="mate">${isFinite(iv.da) ? Risolutore.numeroIt(iv.da) : '−∞'} &lt; x &lt; ${isFinite(iv.a) ? Risolutore.numeroIt(iv.a) : '+∞'}</div>
         <div class="nota">la funzione è ${iv.segno === '+' ? 'POSITIVA (sopra l\'asse x)' : iv.segno === '−' ? 'NEGATIVA (sotto l\'asse x)' : 'nulla'}</div></div>`).join('') + '</div>';
      spiega = 'Ho diviso la retta nei punti dove la funzione vale zero o non esiste, e ho provato un valore dentro ogni pezzo.';
      break;
    }
    case 'limiti': {
      const e1 = Risolutore.limitePassi(Studio.funzione, 'inf');
      const e2 = Risolutore.limitePassi(Studio.funzione, '-inf');
      html = '<div class="mate mate-blocco">lim<sub>x → +∞</sub> f(x) = ' + esc(String(e1.risultato === undefined ? '?' : e1.risultato)) +
        '<br>lim<sub>x → −∞</sub> f(x) = ' + esc(String(e2.risultato === undefined ? '?' : e2.risultato)) + '</div>';
      spiega = 'Guardo come si comporta la funzione quando la x diventa molto grande, in positivo e in negativo.';
      stato = (e1.stato === 'verde' && e2.stato === 'verde') ? 'verde' : 'giallo';
      break;
    }
    case 'asintoti': {
      const righe = [];
      if (rat && !M.polCostante(rat.d)) {
        const z = zeriDi(rat.d) || [];
        z.forEach((r) => righe.push('Asintoto verticale: x = ' + M.fTesto(r).replace('-', '−')));
        const gn = M.polGrado(rat.n, 'x'), gd = M.polGrado(rat.d, 'x');
        const cn = M.polCoeffNum(rat.n, 'x'), cd = M.polCoeffNum(rat.d, 'x');
        if (gn < gd) righe.push('Asintoto orizzontale: y = 0');
        else if (gn === gd && cn && cd) righe.push('Asintoto orizzontale: y = ' + M.fTesto(M.fDiv(cn[gn], cd[gd])).replace('-', '−'));
        else if (gn === gd + 1) righe.push('C\'è un asintoto obliquo: si trova con la divisione fra i polinomi.');
      }
      if (!righe.length) righe.push('Non trovo asintoti (oppure questa funzione non è una frazione algebrica).');
      html = '<div class="mate mate-blocco">' + righe.map(esc).join('<br>') + '</div>';
      spiega = 'Gli asintoti sono le rette a cui il grafico si avvicina sempre di più senza toccarle.';
      break;
    }
    case 'derivata1': case 'derivata2': {
      const uno = Risolutore.derivataPassi(Studio.funzione);
      if (uno.stato !== 'verde') { html = '<div class="mate mate-blocco">Non so derivare questa funzione</div>'; stato = 'rosso'; break; }
      if (id === 'derivata1') {
        Studio.risultati.d1 = uno.risultato;
        html = '<div class="mate mate-blocco">f\'(x) = ' + M.html(uno.risultato) + '</div>';
        spiega = 'La derivata prima serve per capire dove la funzione sale e dove scende.';
      } else {
        const due = Risolutore.derivataPassi(M.testo(uno.risultato));
        Studio.risultati.d2 = due.risultato;
        html = '<div class="mate mate-blocco">f\'\'(x) = ' + (due.risultato ? M.html(due.risultato) : '?') + '</div>';
        spiega = 'La derivata seconda serve per la concavità.';
      }
      break;
    }
    case 'crescenza': case 'concavita': {
      const quale = id === 'crescenza' ? 'd1' : 'd2';
      if (!Studio.risultati[quale]) {
        const base = quale === 'd1' ? Studio.funzione : M.testo(Risolutore.derivataPassi(Studio.funzione).risultato || '0');
        const d = Risolutore.derivataPassi(base);
        Studio.risultati[quale] = d.risultato;
      }
      const d = Studio.risultati[quale];
      if (!d) { html = '<div class="mate mate-blocco">Non disponibile</div>'; stato = 'rosso'; break; }
      const P = M.polDaAst(d);
      const c = P ? M.polCoeffNum(P, 'x') : null;
      const z = c ? M.radiciRazionali(c) : [];
      if (!z.length) {
        html = '<div class="mate mate-blocco">La derivata non si annulla in punti "semplici"</div>';
        spiega = 'Prova a risolvere tu l\'equazione ' + (quale === 'd1' ? 'f\'(x) = 0' : 'f\'\'(x) = 0') + ' con "Risolvi con me".';
        stato = 'giallo';
        break;
      }
      const righe = z.map((r) => {
        const x = M.fNum(r);
        let prima, dopo;
        try { prima = M.valuta(d, { x: x - 0.5 }); dopo = M.valuta(d, { x: x + 0.5 }); } catch (e) { prima = dopo = 0; }
        if (id === 'crescenza') {
          const tipo = prima < 0 && dopo > 0 ? 'MINIMO' : prima > 0 && dopo < 0 ? 'MASSIMO' : 'punto stazionario';
          let y = '';
          try { y = ' → punto (' + Risolutore.numeroIt(x) + '; ' + Risolutore.numeroIt(M.valuta(ast, { x })) + ')'; } catch (e) { /* niente */ }
          return 'x = ' + Risolutore.numeroIt(x) + ' è un ' + tipo + y;
        }
        return 'x = ' + Risolutore.numeroIt(x) + ' è un possibile FLESSO (la concavità cambia)';
      });
      html = '<div class="mate mate-blocco">' + righe.map(esc).join('<br>') + '</div>';
      spiega = id === 'crescenza'
        ? 'Dove la derivata prima è positiva la funzione sale, dove è negativa scende. Nei punti in cui cambia segno ci sono massimi e minimi.'
        : 'Dove la derivata seconda è positiva la curva tiene l\'acqua (∪), dove è negativa la perde (∩).';
      break;
    }
    case 'grafico': {
      html = '<div class="tela-wrap"><canvas class="tela" id="telaPiano"></canvas></div>';
      spiega = 'Ecco come viene il grafico: confrontalo con quello che hai trovato tu.';
      break;
    }
  }

  const sem = SEMAFORO[stato];
  box.innerHTML = `<div class="card">
    <div class="barra-btn"><span class="semaforo ${sem.cl}">${sem.ic} ${esc(sem.txt)}</span></div>
    <div class="passo"><div class="numero">${esc(titolo)}</div>${html}<div class="spiega">${esc(spiega)}</div></div>
  </div>`;
  if (id === 'grafico') {
    Piano.funzioni = [{ testo: Studio.funzione, ast, colore: Piano.colori[0] }];
    Piano.punti = [];
    setTimeout(() => Piano.imposta('telaPiano'), 30);
  }
}

/* ------------------------------------------------------------------
   STATISTICA
   ------------------------------------------------------------------ */

STRUMENTI['mate-statistica'] = function (c) {
  c.innerHTML = testaStrumento('📊', 'Statistica',
    'Scrivi i numeri separati da uno spazio o da una virgola: penso io ai conti.') + `
    <div class="card">
      <label class="etichetta" for="stNumeri">I miei dati</label>
      <textarea class="area" id="stNumeri" rows="3" inputmode="decimal"
        placeholder="Per esempio: 4 7 7 9 12 15">6 7 7 8 10 12 12 12 15</textarea>
      <div class="barra-btn" style="margin-top:12px">
        ${bottone('sta-calcola', '▶', 'Calcola', 'btn-primario btn-grande')}
        ${bottone('sta-passaggi', '👣', 'Mostrami i passaggi')}
      </div>
    </div>
    <div id="staRis"></div>`;
  calcolaStatistica(false);
};

function calcolaStatistica(conPassaggi) {
  const grezzo = ($('#stNumeri') || {}).value || '';
  const dati = grezzo.split(/[\s,;]+/).map((s) => Number(String(s).replace(',', '.')))
    .filter((x) => isFinite(x));
  const box = $('#staRis');
  if (dati.length < 2) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic">✏️</span>
      <p>Servono almeno due numeri. Scrivili separati da uno spazio.</p></div>`;
    return;
  }
  const ordinati = dati.slice().sort((a, b) => a - b);
  const somma = dati.reduce((s, x) => s + x, 0);
  const media = somma / dati.length;
  const meta = Math.floor(ordinati.length / 2);
  const mediana = ordinati.length % 2 ? ordinati[meta] : (ordinati[meta - 1] + ordinati[meta]) / 2;
  const freq = {};
  dati.forEach((x) => { freq[x] = (freq[x] || 0) + 1; });
  const maxFreq = Math.max.apply(null, Object.keys(freq).map((k) => freq[k]));
  const mode = Object.keys(freq).filter((k) => freq[k] === maxFreq).map(Number);
  const num = Risolutore.numeroIt;
  const arrotonda = (x) => num(Math.round(x * 10000) / 10000);

  box.innerHTML = `<div class="card">
      <div class="perc-blocchi">
        <div class="blocco"><div class="et">Quanti dati</div><div class="val">${dati.length}</div></div>
        <div class="blocco"><div class="et">Somma</div><div class="val">${arrotonda(somma)}</div></div>
        <div class="blocco" style="border-color:var(--ok);background:var(--ok-chiaro)">
          <div class="et">Media</div><div class="val">${arrotonda(media)}</div></div>
        <div class="blocco"><div class="et">Mediana</div><div class="val">${arrotonda(mediana)}</div></div>
        <div class="blocco"><div class="et">Moda</div><div class="val">${maxFreq === 1 ? 'nessuna' : mode.map(num).join(' e ')}</div></div>
        <div class="blocco"><div class="et">Minimo e massimo</div><div class="val">${num(ordinati[0])} … ${num(ordinati[ordinati.length - 1])}</div></div>
      </div>
    </div>
    <div class="card">
      <h2>Quante volte compare ogni numero</h2>
      <div style="display:grid;gap:8px">
        ${Object.keys(freq).sort((a, b) => Number(a) - Number(b)).map((k) => `
          <div style="display:grid;grid-template-columns:4em 1fr 3em;gap:8px;align-items:center">
            <b>${esc(num(Number(k)))}</b>
            <div class="perc-barra" style="height:26px"><div class="riempi" style="width:${freq[k] / maxFreq * 100}%"></div></div>
            <span>${freq[k]}×</span>
          </div>`).join('')}
      </div>
    </div>
    ${conPassaggi ? `<div class="card">
      <div class="passo"><div class="numero">Media</div>
        <div class="mate mate-blocco">${esc(dati.map(num).join(' + '))} = ${esc(arrotonda(somma))}</div>
        <div class="mate mate-blocco">${esc(arrotonda(somma))} ÷ ${dati.length} = ${esc(arrotonda(media))}</div>
        <div class="spiega">Sommo tutti i numeri e divido per quanti sono.</div></div>
      <div class="passo"><div class="numero">Mediana</div>
        <div class="mate mate-blocco">${esc(ordinati.map(num).join('  '))}</div>
        <div class="spiega">Prima metto i numeri in ordine, poi prendo quello in mezzo${ordinati.length % 2 ? '' : ' (qui sono due, quindi faccio la loro media)'}.</div></div>
      <div class="passo"><div class="numero">Moda</div>
        <div class="spiega">${maxFreq === 1 ? 'Nessun numero si ripete: la moda non c\'è.' : 'Il numero che compare più spesso (' + maxFreq + ' volte).'}</div></div>
    </div>` : ''}`;
}

/* ------------------------------------------------------------------
   FORMULARIO
   ------------------------------------------------------------------ */

const FORMULE_INIZIALI = [
  { cat: 'Aritmetica', nome: 'Percentuale', formula: 'parte = totale × p ÷ 100', quando: 'Quando devi calcolare il p% di un numero.', simboli: 'p = percentuale', esempio: '25% di 200 = 200 × 25 ÷ 100 = 50' },
  { cat: 'Aritmetica', nome: 'Proporzione', formula: 'a : b = c : d', quando: 'Quando due rapporti sono uguali.', simboli: 'Il prodotto dei medi è uguale al prodotto degli estremi: b·c = a·d', esempio: '3 : 6 = 5 : 10' },
  { cat: 'Aritmetica', nome: 'Potenze', formula: 'aⁿ · aᵐ = aⁿ⁺ᵐ ;  aⁿ ÷ aᵐ = aⁿ⁻ᵐ ;  (aⁿ)ᵐ = aⁿ·ᵐ', quando: 'Per moltiplicare o dividere potenze con la stessa base.', simboli: 'a = base, n e m = esponenti', esempio: '2³ · 2² = 2⁵ = 32' },
  { cat: 'Algebra', nome: 'Quadrato di binomio', formula: '(a + b)² = a² + 2ab + b²', quando: 'Per sviluppare il quadrato di una somma.', simboli: 'a e b sono i due termini', esempio: '(x + 3)² = x² + 6x + 9' },
  { cat: 'Algebra', nome: 'Somma per differenza', formula: '(a + b)(a − b) = a² − b²', quando: 'Quando i due binomi differiscono solo per un segno.', simboli: '', esempio: '(x + 3)(x − 3) = x² − 9' },
  { cat: 'Algebra', nome: 'Equazione di 2° grado', formula: 'x = (−b ± √(b² − 4ac)) ÷ (2a)', quando: 'Per risolvere ax² + bx + c = 0.', simboli: 'a, b, c sono i coefficienti; Δ = b² − 4ac', esempio: 'x² − 5x + 6 = 0 → x = 2 e x = 3' },
  { cat: 'Geometria', nome: 'Teorema di Pitagora', formula: 'i² = c₁² + c₂²', quando: 'Nei triangoli rettangoli.', simboli: 'i = ipotenusa, c = cateti', esempio: '3² + 4² = 5²' },
  { cat: 'Geometria', nome: 'Area del triangolo', formula: 'A = (b × h) ÷ 2', quando: 'Sempre, conoscendo base e altezza.', simboli: 'b = base, h = altezza', esempio: 'b = 6, h = 4 → A = 12' },
  { cat: 'Geometria', nome: 'Cerchio', formula: 'C = 2πr ;  A = πr²', quando: 'Circonferenza e area del cerchio.', simboli: 'r = raggio, π ≈ 3,14', esempio: 'r = 5 → A = 78,5' },
  { cat: 'Geometria', nome: 'Volume del prisma', formula: 'V = area di base × altezza', quando: 'Per prismi e cilindri.', simboli: '', esempio: 'base 12 cm², h 5 cm → V = 60 cm³' },
  { cat: 'Geometria analitica', nome: 'Distanza fra due punti', formula: 'd = √((x₂ − x₁)² + (y₂ − y₁)²)', quando: 'Per misurare quanto distano due punti.', simboli: '', esempio: 'A(1;2) B(4;6) → d = 5' },
  { cat: 'Geometria analitica', nome: 'Punto medio', formula: 'M = ((x₁ + x₂)/2 ; (y₁ + y₂)/2)', quando: 'Per trovare il punto a metà di un segmento.', simboli: '', esempio: 'A(0;0) B(4;6) → M(2;3)' },
  { cat: 'Geometria analitica', nome: 'Retta', formula: 'y = mx + q', quando: 'Equazione della retta.', simboli: 'm = coefficiente angolare (pendenza), q = intersezione con l\'asse y', esempio: 'y = 2x + 3' },
  { cat: 'Geometria analitica', nome: 'Rette parallele e perpendicolari', formula: 'parallele: m₁ = m₂ ;  perpendicolari: m₁ · m₂ = −1', quando: 'Per capire come stanno due rette.', simboli: '', esempio: 'y = 2x e y = −x/2 sono perpendicolari' },
  { cat: 'Geometria analitica', nome: 'Vertice della parabola', formula: 'V(−b/2a ; −Δ/4a)', quando: 'Per y = ax² + bx + c.', simboli: 'Δ = b² − 4ac', esempio: 'y = x² − 4x + 3 → V(2; −1)' },
  { cat: 'Trigonometria', nome: 'Identità fondamentale', formula: 'sen²α + cos²α = 1', quando: 'Sempre, per qualsiasi angolo.', simboli: 'α = angolo', esempio: 'sen30° = 0,5 e cos30° ≈ 0,866' },
  { cat: 'Trigonometria', nome: 'Tangente', formula: 'tanα = senα ÷ cosα', quando: 'Quando il coseno non è zero.', simboli: '', esempio: 'tan45° = 1' },
  { cat: 'Trigonometria', nome: 'Teorema dei seni', formula: 'a/senA = b/senB = c/senC', quando: 'In qualsiasi triangolo, con un lato e il suo angolo opposto.', simboli: '', esempio: '' },
  { cat: 'Trigonometria', nome: 'Teorema del coseno', formula: 'a² = b² + c² − 2bc·cosA', quando: 'Quando conosci due lati e l\'angolo fra loro.', simboli: '', esempio: '' },
  { cat: 'Logaritmi', nome: 'Definizione', formula: 'log_a x = y  ⇄  aʸ = x', quando: 'Per passare da logaritmo a potenza.', simboli: 'a = base > 0 e ≠ 1; x > 0', esempio: 'log₂8 = 3 perché 2³ = 8' },
  { cat: 'Logaritmi', nome: 'Proprietà', formula: 'log(xy) = log x + log y ;  log(x/y) = log x − log y ;  log(xⁿ) = n log x', quando: 'Per spezzare o unire logaritmi.', simboli: '', esempio: 'log(100) = log(10·10) = 1 + 1 = 2' },
  { cat: 'Derivate', nome: 'Regole principali', formula: '(xⁿ)\' = n·xⁿ⁻¹ ;  (f+g)\' = f\'+g\' ;  (f·g)\' = f\'g + fg\'', quando: 'Per derivare polinomi e prodotti.', simboli: '', esempio: '(3x²)\' = 6x' },
  { cat: 'Derivate', nome: 'Funzioni note', formula: '(senx)\' = cosx ;  (cosx)\' = −senx ;  (eˣ)\' = eˣ ;  (lnx)\' = 1/x', quando: 'Derivate da sapere a memoria.', simboli: '', esempio: '' },
  { cat: 'Integrali', nome: 'Integrale immediato', formula: '∫xⁿ dx = xⁿ⁺¹/(n+1) + c', quando: 'Per n diverso da −1.', simboli: 'c = costante di integrazione', esempio: '∫3x² dx = x³ + c' },
  { cat: 'Statistica', nome: 'Media aritmetica', formula: 'media = somma dei valori ÷ quanti sono', quando: 'Per trovare il valore "tipico".', simboli: '', esempio: '(4+6+8) ÷ 3 = 6' },
  { cat: 'Statistica', nome: 'Mediana e moda', formula: 'mediana = valore centrale ;  moda = valore più frequente', quando: 'Per descrivere un insieme di dati.', simboli: 'Per la mediana i dati vanno prima messi in ordine.', esempio: '2, 3, 3, 7, 9 → mediana 3, moda 3' },
  { cat: 'Probabilità', nome: 'Probabilità elementare', formula: 'P = casi favorevoli ÷ casi possibili', quando: 'Quando tutti i casi sono ugualmente probabili.', simboli: 'P è sempre fra 0 e 1', esempio: 'Dado: P(esce 6) = 1/6' },
  { cat: 'Fisica', nome: 'Velocità', formula: 'v = s ÷ t', quando: 'Moto rettilineo uniforme.', simboli: 's = spazio, t = tempo', esempio: '100 m in 10 s → 10 m/s' },
  { cat: 'Scienze', nome: 'Densità', formula: 'd = m ÷ V', quando: 'Per confrontare materiali.', simboli: 'm = massa, V = volume', esempio: '' },
  { cat: 'Grammatica', nome: 'Analisi logica: le domande', formula: 'soggetto = chi? ;  complemento oggetto = che cosa?', quando: 'Per riconoscere le parti della frase.', simboli: '', esempio: 'Marco (chi?) mangia la mela (che cosa?)' }
];

STRUMENTI['mate-formule'] = function (c) {
  if (!Stato.formule.length) {
    Stato.formule = FORMULE_INIZIALI.map((f) => Object.assign({ id: uid('f'), iniziale: true }, f));
    salva();
  }
  const categorie = Array.from(new Set(Stato.formule.map((f) => f.cat))).sort();
  c.innerHTML = testaStrumento('📐', 'Formulario', 'Le formule che ti servono, con un esempio.') + `
    <div class="card">
      <div class="barra-btn" style="margin-bottom:8px">
        ${bottone('fm-nuova', '➕', 'Aggiungi una formula', 'btn-primario')}
        ${bottone('fm-stampa', '🖨️', 'Stampa il formulario')}
      </div>
      <label class="etichetta" for="fmCerca">Cerca</label>
      <input class="campo" id="fmCerca" type="search" placeholder="Per esempio: pitagora" autocomplete="off">
    </div>
    <div id="fmLista"></div>`;
  $('#fmCerca', c).addEventListener('input', debounce(disegnaFormule, 180));
  disegnaFormule();
};

function disegnaFormule() {
  const box = $('#fmLista');
  if (!box) return;
  const q = (($('#fmCerca') || {}).value || '').trim().toLowerCase();
  const lista = Stato.formule.filter((f) => !q ||
    (f.nome + ' ' + f.formula + ' ' + f.cat + ' ' + (f.quando || '')).toLowerCase().indexOf(q) >= 0);
  const categorie = Array.from(new Set(lista.map((f) => f.cat)));
  box.innerHTML = categorie.length ? categorie.map((cat) => `
    <details class="pannello"${q ? ' open' : ''}>
      <summary>${esc(cat)} <span class="tag">${lista.filter((f) => f.cat === cat).length}</span></summary>
      <div class="contenuto">
        ${lista.filter((f) => f.cat === cat).map((f) => `
          <div class="card card-soft">
            <h3>${esc(f.nome)}</h3>
            <div class="mate mate-blocco">${esc(f.formula)}</div>
            ${f.quando ? `<p><b>Quando si usa:</b> ${esc(f.quando)}</p>` : ''}
            ${f.simboli ? `<p><b>Significato dei simboli:</b> ${esc(f.simboli)}</p>` : ''}
            ${f.esempio ? `<p><b>Esempio:</b> ${esc(f.esempio)}</p>` : ''}
            <div class="barra-btn" style="margin:0">
              ${bottone('fm-leggi:' + f.id, '🔊', 'Leggimela', 'btn-piccolo')}
              ${bottone('fm-modifica:' + f.id, '✏️', 'Modifica', 'btn-piccolo')}
              ${bottone('fm-canc:' + f.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
            </div>
          </div>`).join('')}
      </div>
    </details>`).join('')
    : `<div class="card">${schedaVuota('🔍', 'Nessuna formula trovata.')}</div>`;
}

async function modificaFormula(id) {
  const f = id ? Stato.formule.find((x) => x.id === id) : null;
  const categorie = Array.from(new Set(Stato.formule.map((x) => x.cat).concat(
    ['Aritmetica', 'Algebra', 'Geometria', 'Geometria analitica', 'Trigonometria', 'Logaritmi', 'Derivate', 'Integrali', 'Statistica', 'Probabilità', 'Scienze', 'Fisica', 'Grammatica'])));
  const r = await finestra({
    titolo: f ? 'Modifica la formula' : 'Nuova formula',
    campi: [
      { nome: 'cat', etichetta: 'Categoria', tipo: 'scelta', opzioni: categorie, valore: f ? f.cat : 'Algebra' },
      { nome: 'nome', etichetta: 'Nome', valore: f ? f.nome : '' },
      { nome: 'formula', etichetta: 'Formula', valore: f ? f.formula : '' },
      { nome: 'quando', etichetta: 'Quando si usa', tipo: 'area', righe: 2, valore: f ? f.quando : '' },
      { nome: 'simboli', etichetta: 'Significato dei simboli', tipo: 'area', righe: 2, valore: f ? f.simboli : '' },
      { nome: 'esempio', etichetta: 'Esempio', valore: f ? f.esempio : '' }
    ],
    testoOk: 'Salva'
  });
  if (!r) return;
  if (f) Object.assign(f, r);
  else Stato.formule.unshift(Object.assign({ id: uid('f') }, r));
  await salvaOra();
  disegnaFormule();
  avvisoOk('Formula salvata');
}
