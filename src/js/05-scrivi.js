/* ==================================================================
   05-scrivi.js — editor di scrittura, controllo del testo, modelli
   ================================================================== */

let _editor = { id: null, titolo: '', testo: '', undo: [], redo: [], ultimaVersione: 0 };

const CHECKLIST = [
  'Ho iniziato la frase con la maiuscola?',
  'Ho messo il punto?',
  'Ho controllato le doppie?',
  'Ho controllato gli apostrofi?',
  'Ho controllato gli accenti?',
  'Ho lasciato gli spazi corretti?',
  'Ho riletto lentamente?',
  'Ho ascoltato il testo con la voce?'
];

/* ------------------------------------------------------------------
   Vista principale
   ------------------------------------------------------------------ */

VISTE.scrivi = function (c, par) {
  if (par) apriDocumento(par, true);
  if (!_editor.id && Stato.documenti.length && !_editor.testo) {
    apriDocumento(Stato.documenti[0].id, true);
  }

  c.innerHTML = testaSezione('✍️', 'Scrivi', null,
    `<span class="salvato" aria-live="polite"></span>` + bottone('home', '🏠', 'Home', 'btn-piccolo')) + `

  <div class="card no-stampa">
    <div class="barra-btn" style="margin-bottom:8px">
      ${bottone('doc-nuovo', '📄', 'Nuovo', 'btn-primario')}
      ${bottone('doc-elenco', '📚', 'I miei documenti')}
      ${bottone('doc-salva', '💾', 'Salva')}
      ${bottone('doc-duplica', '⧉', 'Duplica')}
      ${bottone('doc-elimina', '🗑️', 'Elimina', 'btn-errore')}
    </div>
    <div class="barra-btn" style="margin-bottom:8px">
      ${bottone('doc-annulla', '↩️', 'Annulla')}
      ${bottone('doc-ripristina', '↪️', 'Ripristina')}
      ${bottone('doc-trova', '🔍', 'Trova parola')}
      ${bottone('doc-controlla', '🔎', 'Ricontrolla il testo', 'btn-attenzione')}
      ${bottone('doc-modelli', '🧩', 'Scrittura guidata')}
    </div>
    <div class="barra-btn" style="margin-bottom:0">
      ${bottone('doc-esporta', '📤', 'Esporta')}
      ${bottone('doc-importa', '📥', 'Importa')}
      ${bottone('doc-stampa', '🖨️', 'Stampa / PDF')}
      ${bottone('doc-versioni', '🕘', 'Versioni')}
      <button type="button" class="btn" data-az="doc-checklist" aria-pressed="${Stato.impostazioni.checklistVisibile}">
        <span aria-hidden="true">✅</span><span>Checklist</span></button>
    </div>
  </div>

  <div class="card">
    <label class="etichetta" for="docTitolo">Titolo</label>
    <input class="campo" id="docTitolo" type="text" value="${esc(_editor.titolo)}" placeholder="Per esempio: Riassunto di storia" spellcheck="true">
    <label class="etichetta" for="docTesto">Il mio testo</label>
    <textarea class="editor-area" id="docTesto" spellcheck="true" autocorrect="on" autocapitalize="sentences"
      placeholder="Scrivi qui. Non preoccuparti degli errori adesso: prima le idee, poi si controlla.">${esc(_editor.testo)}</textarea>
    <div class="contatori" id="contatori" style="margin-top:10px"></div>
  </div>

  <div id="barraVoceScrivi" class="no-stampa"></div>
  <div id="pannelloScrivi" class="no-stampa"></div>
  <div id="checklistBox" class="no-stampa"></div>`;

  const area = $('#docTesto', c);
  const tit = $('#docTitolo', c);

  aggiornaContatori();
  disegnaChecklist();

  const registraUndo = debounce(() => {
    if (_editor.undo[_editor.undo.length - 1] !== area.value) {
      _editor.undo.push(area.value);
      if (_editor.undo.length > 40) _editor.undo.shift();
      _editor.redo.length = 0;
    }
  }, 900);

  area.addEventListener('input', () => {
    _editor.testo = area.value;
    aggiornaContatori();
    registraUndo();
    salvaDocumentoAuto();
  });
  tit.addEventListener('input', () => { _editor.titolo = tit.value; salvaDocumentoAuto(); });

  const bv = $('#barraVoceScrivi', c);
  bv.appendChild(barraLettura(() => $('#docTesto').value));
};

function aggiornaContatori() {
  const n = $('#contatori');
  if (!n) return;
  const t = ($('#docTesto') ? $('#docTesto').value : _editor.testo) || '';
  const parole = dividiInParole(t).length;
  const caratteri = t.length;
  const frasi = dividiInFrasi(t).length;
  n.innerHTML = `<span>Parole: <b>${parole}</b></span>
     <span>Caratteri: <b>${caratteri}</b></span>
     <span>Frasi: <b>${frasi}</b></span>`;
}

/* ------------------------------------------------------------------
   Gestione documenti
   ------------------------------------------------------------------ */

function documentoCorrente() { return Stato.documenti.find((d) => d.id === _editor.id) || null; }

function apriDocumento(id, silenzioso) {
  const d = Stato.documenti.find((x) => x.id === id);
  if (!d) return false;
  _editor.id = d.id; _editor.titolo = d.titolo || ''; _editor.testo = d.testo || '';
  _editor.undo = [d.testo || '']; _editor.redo = [];
  if (!silenzioso) { vaiA('scrivi'); avvisoOk('Documento aperto'); }
  return true;
}

const salvaDocumentoAuto = debounce(function () {
  let d = documentoCorrente();
  if (!d) {
    if (!_editor.testo.trim() && !_editor.titolo.trim()) return;   // niente da salvare
    d = { id: uid('doc'), titolo: _editor.titolo || 'Senza titolo', testo: _editor.testo, creato: oraISO(), modificato: oraISO(), versioni: [] };
    Stato.documenti.unshift(d);
    _editor.id = d.id;
  }
  d.titolo = _editor.titolo || 'Senza titolo';
  // ogni tanto conservo una versione precedente (cronologia locale)
  const ora = Date.now();
  if (d.testo !== _editor.testo && ora - (_editor.ultimaVersione || 0) > 120000) {
    d.versioni = d.versioni || [];
    d.versioni.unshift({ quando: oraISO(), testo: d.testo });
    if (d.versioni.length > 8) d.versioni.length = 8;
    _editor.ultimaVersione = ora;
  }
  d.testo = _editor.testo;
  d.modificato = oraISO();
  salva();
}, 700);

async function nuovoDocumento() {
  await salvaDocumentoAuto.flush ? null : null;
  _editor = { id: null, titolo: '', testo: '', undo: [''], redo: [], ultimaVersione: 0 };
  disegna();
  const a = $('#docTitolo'); if (a) a.focus();
}

function elencoDocumenti() {
  const box = $('#pannelloScrivi');
  box.innerHTML = `<div class="card">
    <h2>📚 I miei documenti</h2>
    ${Stato.documenti.length ? `<ul class="lista">${Stato.documenti.map((d) => `
      <li class="voce">
        <div class="corpo"><b>${esc(d.titolo || 'Senza titolo')}</b>
        <span class="meta">${esc(quandoInParole(d.modificato))} · ${dividiInParole(d.testo).length} parole</span></div>
        <div class="azioni">
          ${bottone('doc-apri:' + d.id, '📖', 'Apri', 'btn-piccolo btn-primario')}
          ${bottone('doc-canc:' + d.id, '🗑️', 'Elimina', 'btn-piccolo btn-errore')}
        </div>
      </li>`).join('')}</ul>` : schedaVuota('📄', 'Non hai ancora nessun documento.', 'Scrivi qualcosa: si salva da solo.')}
    <div class="barra-btn" style="margin-top:12px">${bottone('pannello-chiudi', '✕', 'Chiudi')}</div>
  </div>`;
}

function mostraVersioni() {
  const d = documentoCorrente();
  const box = $('#pannelloScrivi');
  const v = (d && d.versioni) || [];
  box.innerHTML = `<div class="card">
    <h2>🕘 Versioni precedenti</h2>
    <p class="aiutino">Ogni tanto l'app mette da parte una copia del tuo testo. Restano solo su questo dispositivo.</p>
    ${v.length ? `<div class="versioni">${v.map((x, i) => `
      <button type="button" class="btn" data-az="ver-ripristina:${i}">
        <span aria-hidden="true">↩️</span><span>${esc(quandoInParole(x.quando))} — ${esc(accorcia(x.testo, 60))}</span>
      </button>`).join('')}</div>` : schedaVuota('🕘', 'Non ci sono ancora versioni precedenti.')}
    <div class="barra-btn" style="margin-top:12px">${bottone('pannello-chiudi', '✕', 'Chiudi')}</div>
  </div>`;
}

/* ------------------------------------------------------------------
   Checklist di autocorrezione
   ------------------------------------------------------------------ */

function disegnaChecklist() {
  const box = $('#checklistBox');
  if (!box) return;
  if (!Stato.impostazioni.checklistVisibile) { box.innerHTML = ''; return; }
  const d = documentoCorrente();
  const stato = (d && d.check) || {};
  box.innerHTML = `<div class="card">
    <h2>✅ Prima di consegnare</h2>
    ${CHECKLIST.map((t, i) => `<label class="check">
        <input type="checkbox" data-check="${i}"${stato[i] ? ' checked' : ''}>
        <span>${esc(t)}</span></label>`).join('')}
    <p class="aiutino">Non sei obbligato a spuntare tutto: servono solo a ricordarti cosa guardare.</p>
  </div>`;
  // uso onchange (non addEventListener) perché questa funzione può essere
  // richiamata più volte sullo stesso contenitore
  box.onchange = (e) => {
    const n = e.target.closest('[data-check]');
    if (!n) return;
    const d2 = documentoCorrente();
    if (!d2) return;
    d2.check = d2.check || {};
    d2.check[n.dataset.check] = n.checked;
    salva();
  };
}

/* ------------------------------------------------------------------
   "Ricontrolla il testo": controlli sicuri e deterministici.
   Non correggiamo mai da soli senza chiedere.
   ------------------------------------------------------------------ */

const SOSTITUZIONI_SICURE = [
  { cerca: /\bpò\b/g, con: "po'", perche: 'Si scrive "po\'" con l\'apostrofo (è accorciato da "poco").' },
  { cerca: /\bqual'è\b/gi, con: 'qual è', perche: '"Qual è" si scrive senza apostrofo.' },
  { cerca: /\bun'altro\b/gi, con: "un altro", perche: '"Un altro" (maschile) non vuole l\'apostrofo.' },
  { cerca: /\bpiù +ù\b/g, con: 'più', perche: 'Accento ripetuto.' },
  { cerca: /\bcosidetto\b/gi, con: 'cosiddetto', perche: 'Si scrive "cosiddetto" con due d.' },
  { cerca: /\bproprio +proprio\b/gi, con: 'proprio', perche: 'Parola ripetuta.' }
];

const ACCENTI_DA_GUARDARE = ['perche', 'poiche', 'giache', 'cioe', 'pero', 'piu', 'gia', 'cosi', 'puo', 'e\''];

function controllaTesto() {
  const t = ($('#docTesto') || {}).value || '';
  const box = $('#pannelloScrivi');
  const segnalazioni = [];

  // 1. spazi doppi
  const spazi = (t.match(/ {2,}/g) || []).length;
  if (spazi) segnalazioni.push({ ic: '␣', tit: spazi + (spazi === 1 ? ' spazio doppio' : ' spazi doppi'), det: 'Dove ci sono due spazi di fila ne basta uno.', fix: { cerca: / {2,}/g, con: ' ' } });

  // 2. spazio prima della punteggiatura
  const primaPunt = (t.match(/ +[,.;:!?]/g) || []).length;
  if (primaPunt) segnalazioni.push({ ic: '❕', tit: primaPunt + ' segno di punteggiatura con lo spazio prima', det: 'La virgola e il punto vanno attaccati alla parola.', fix: { cerca: / +([,.;:!?])/g, con: '$1' } });

  // 3. manca lo spazio dopo la punteggiatura
  const dopoPunt = (t.match(/[,;:](?=[A-Za-zÀ-ÿ])/g) || []).length;
  if (dopoPunt) segnalazioni.push({ ic: '␣', tit: dopoPunt + ' volte manca lo spazio dopo la virgola', det: 'Dopo la virgola ci vuole uno spazio.', fix: { cerca: /([,;:])(?=[A-Za-zÀ-ÿ])/g, con: '$1 ' } });

  // 4. maiuscola dopo il punto
  const senzaMaiuscola = [];
  const re = /([.!?])\s+([a-zà-ÿ])/g;
  let m;
  while ((m = re.exec(t))) senzaMaiuscola.push(m[2]);
  if (senzaMaiuscola.length) {
    segnalazioni.push({ ic: '🔠', tit: senzaMaiuscola.length + ' frasi iniziano con la minuscola', det: 'Dopo il punto la frase nuova comincia con la maiuscola.' });
  }

  // 5. parole ripetute
  const ripetute = [];
  const rr = /\b([A-Za-zÀ-ÿ']{3,})\s+\1\b/gi;
  while ((m = rr.exec(t))) ripetute.push(m[1]);
  if (ripetute.length) segnalazioni.push({ ic: '🔁', tit: 'Parole ripetute due volte: ' + ripetute.slice(0, 6).map((x) => '"' + x + '"').join(', '), det: 'Controlla se ne serve solo una.' });

  // 6. frasi molto lunghe
  const lunghe = dividiInFrasi(t).filter((f) => dividiInParole(f).length > 28);
  if (lunghe.length) segnalazioni.push({ ic: '📏', tit: lunghe.length + (lunghe.length === 1 ? ' frase molto lunga' : ' frasi molto lunghe'), det: 'Prova a spezzarla in due: si capisce meglio. Prima frase lunga: "' + accorcia(lunghe[0], 70) + '"' });

  // 7. punto finale
  if (t.trim() && !/[.!?…"»)]\s*$/.test(t.trim())) {
    segnalazioni.push({ ic: '⏹', tit: 'Manca il punto alla fine', det: 'L\'ultima frase non finisce con il punto.' });
  }

  // 8. accenti da guardare
  const trovatiAccenti = ACCENTI_DA_GUARDARE.filter((p) => new RegExp('\\b' + p.replace(/'/g, "'") + '\\b', 'i').test(t));
  if (trovatiAccenti.length) segnalazioni.push({ ic: '´', tit: 'Da controllare l\'accento: ' + trovatiAccenti.join(', '), det: 'Queste parole di solito vogliono l\'accento (perché, però, più, già, così, può).' });

  // 9. errori con correzione sicura
  SOSTITUZIONI_SICURE.forEach((s) => {
    const n = (t.match(s.cerca) || []).length;
    if (n) segnalazioni.push({ ic: '✏️', tit: n + ' volte: ' + s.con, det: s.perche, fix: { cerca: s.cerca, con: s.con } });
  });

  box.innerHTML = `<div class="card">
    <h2>🔎 Ho guardato il testo</h2>
    <p class="aiutino">Sono controlli meccanici: non capisco il significato delle frasi.
      Il correttore vero è quello del browser (le righe rosse sotto le parole). Non cambio niente senza il tuo permesso.</p>
    ${segnalazioni.length ? `<div class="controllo-risultato">${segnalazioni.map((s, i) => `
      <div class="controllo-riga">
        <b><span aria-hidden="true">${s.ic}</span> ${esc(s.tit)}</b>
        <div>${esc(s.det)}</div>
        ${s.fix ? `<div class="barra-btn" style="margin:8px 0 0">
          <button type="button" class="btn btn-piccolo" data-az="fix:${i}">✔️ Correggi tu queste</button></div>` : ''}
      </div>`).join('')}</div>`
      : `<div class="controllo-riga ok"><b>✅ Non ho trovato problemi meccanici.</b>
         <div>Adesso rileggi lentamente, o ascolta il testo con la voce: si sentono gli errori che l'occhio non vede.</div></div>`}
    <div class="barra-btn" style="margin-top:12px">
      ${bottone('doc-doppie', '🔍', 'Evidenzia le doppie')}
      ${bottone('pannello-chiudi', '✕', 'Chiudi')}
    </div>
  </div>`;
  box._fix = segnalazioni.map((s) => s.fix || null);
}

function applicaCorrezione(indice) {
  const box = $('#pannelloScrivi');
  const fix = box && box._fix ? box._fix[indice] : null;
  if (!fix) return;
  const area = $('#docTesto');
  area.value = area.value.replace(fix.cerca, fix.con);
  _editor.testo = area.value;
  aggiornaContatori();
  salvaDocumentoAuto();
  controllaTesto();
  avvisoOk('Corretto');
}

/** Mostra il testo con tutte le doppie evidenziate (aiuto visivo, non correzione). */
function evidenziaDoppie() {
  const t = ($('#docTesto') || {}).value || '';
  const html = esc(t).replace(/([bcdfglmnprstvz])\1/gi, '<mark>$1$1</mark>');
  $('#pannelloScrivi').innerHTML = `<div class="card">
    <h2>🔍 Le doppie del tuo testo</h2>
    <p class="aiutino">Qui vedi evidenziate tutte le doppie che hai scritto. Rileggile una per una: ci sono tutte quelle che servono? Ce n'è qualcuna di troppo?</p>
    <div class="foglio"><div class="foglio-testo" style="white-space:pre-wrap">${html || '<i>Il testo è vuoto.</i>'}</div></div>
    <div class="barra-btn" style="margin-top:12px">${bottone('pannello-chiudi', '✕', 'Chiudi')}</div>
  </div>`;
}

/* ------------------------------------------------------------------
   Scrittura guidata
   ------------------------------------------------------------------ */

const MODELLI_SCRITTURA = {
  testo: {
    tit: '📝 Racconto / testo',
    domande: ['Cosa devo raccontare?', 'Chi c\'è?', 'Dove succede?', 'Quando succede?', 'Cosa succede?', 'Come finisce?']
  },
  riassunto: {
    tit: '📋 Riassunto',
    domande: ['Qual è l\'argomento?', 'Chi sono i protagonisti?', 'Quali sono le informazioni più importanti?', 'Cosa posso eliminare?', 'Scrivi il riassunto.']
  },
  argomentativo: {
    tit: '⚖️ Testo argomentativo',
    domande: ['Argomento', 'La mia opinione', 'Motivo 1', 'Motivo 2', 'Esempio', 'Opinione contraria', 'Conclusione']
  }
};

function mostraModelli(quale) {
  const box = $('#pannelloScrivi');
  if (!quale) {
    box.innerHTML = `<div class="card">
      <h2>🧩 Scrittura guidata</h2>
      <p>Rispondi a una domanda alla volta. Alla fine metto insieme le risposte e tu le sistemi.</p>
      <div class="barra-btn">
        ${Object.keys(MODELLI_SCRITTURA).map((k) => bottone('modello:' + k, '', MODELLI_SCRITTURA[k].tit, 'btn-grande')).join('')}
      </div>
      <div class="barra-btn">${bottone('pannello-chiudi', '✕', 'Chiudi')}</div>
    </div>`;
    return;
  }
  const m = MODELLI_SCRITTURA[quale];
  box.innerHTML = `<div class="card">
    <h2>${esc(m.tit)}</h2>
    ${m.domande.map((d, i) => `<div class="guida-passo">
        <div class="domanda"><span aria-hidden="true">${i + 1}.</span> ${esc(d)}</div>
        <textarea class="area" rows="2" data-guida="${i}" spellcheck="true"></textarea>
      </div>`).join('')}
    <div class="barra-btn">
      ${bottone('modello-componi:' + quale, '⬇️', 'Metti tutto nel testo', 'btn-primario btn-grande')}
      ${bottone('pannello-chiudi', '✕', 'Chiudi')}
    </div>
  </div>`;
}

function componiModello(quale) {
  const m = MODELLI_SCRITTURA[quale];
  const risposte = $$('[data-guida]').map((n) => n.value.trim());
  const pezzi = [];
  m.domande.forEach((d, i) => { if (risposte[i]) pezzi.push(risposte[i]); });
  if (!pezzi.length) { toast('Rispondi almeno a una domanda.'); return; }
  const area = $('#docTesto');
  const nuovo = (area.value ? area.value + '\n\n' : '') + pezzi.join('\n\n');
  area.value = nuovo;
  _editor.testo = nuovo;
  aggiornaContatori();
  salvaDocumentoAuto();
  $('#pannelloScrivi').innerHTML = '';
  area.focus();
  avvisoOk('Ho messo le tue risposte nel testo');
}

/* ------------------------------------------------------------------
   Trova / esporta / stampa
   ------------------------------------------------------------------ */

async function trovaParola() {
  const q = await chiediTesto('Trova una parola', 'Che parola cerco?', '');
  if (!q) return;
  const area = $('#docTesto');
  const t = area.value.toLowerCase();
  const parola = q.toLowerCase();
  const quante = t.split(parola).length - 1;
  if (!quante) { toast('Non ho trovato "' + q + '" nel testo.'); return; }
  const da = t.indexOf(parola);
  area.focus();
  area.setSelectionRange(da, da + parola.length);
  toast('Trovata ' + quante + (quante === 1 ? ' volta' : ' volte'));
}

async function esportaDocumento() {
  const r = await finestra({
    titolo: 'Esporta il documento',
    campi: [{ nome: 'formato', etichetta: 'In che formato?', tipo: 'scelta', valore: 'txt',
      opzioni: [{ v: 'txt', t: 'Testo semplice (.txt)' }, { v: 'html', t: 'Pagina web (.html)' }, { v: 'json', t: 'Dati (.json)' }] }],
    testoOk: 'Esporta'
  });
  if (!r) return;
  const titolo = _editor.titolo || 'documento';
  const nomeBase = titolo.replace(/[^\w\sÀ-ÿ-]/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'documento';
  if (r.formato === 'txt') {
    scaricaFile(nomeBase + '.txt', titolo + '\n\n' + _editor.testo, 'text/plain;charset=utf-8');
  } else if (r.formato === 'html') {
    const html = `<!DOCTYPE html><html lang="it"><head><meta charset="utf-8">
<title>${esc(titolo)}</title>
<style>body{font-family:system-ui,sans-serif;font-size:18px;line-height:1.8;max-width:40rem;margin:40px auto;padding:0 16px}</style>
</head><body><h1>${esc(titolo)}</h1>${_editor.testo.split(/\n{2,}/).map((p) => '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>').join('\n')}</body></html>`;
    scaricaFile(nomeBase + '.html', html, 'text/html;charset=utf-8');
  } else {
    scaricaFile(nomeBase + '.json', JSON.stringify({ titolo, testo: _editor.testo, data: oraISO() }, null, 2), 'application/json');
  }
  avvisoOk('File pronto');
}

async function importaDocumento() {
  const f = await scegliFile('.txt,.md,.html,.json,text/plain');
  if (!f) return;
  try {
    let t = await leggiFileTesto(f);
    if (/\.json$/i.test(f.name)) {
      try { const j = JSON.parse(t); t = j.testo || t; } catch (e) { /* lo tratto come testo */ }
    } else if (/\.html?$/i.test(f.name)) {
      const d = document.createElement('div');
      d.innerHTML = t;
      t = d.textContent || '';         // solo testo: niente HTML dentro l'editor
    }
    const area = $('#docTesto');
    area.value = t;
    _editor.testo = t;
    if (!_editor.titolo) { _editor.titolo = f.name.replace(/\.[^.]+$/, ''); $('#docTitolo').value = _editor.titolo; }
    aggiornaContatori();
    salvaDocumentoAuto();
    avvisoOk('File importato');
  } catch (e) {
    avvisoErrore('Non sono riuscito ad aprire questo file.');
  }
}
