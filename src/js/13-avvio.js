/* ==================================================================
   13-avvio.js — collegamento dei pulsanti, scorciatoie, onboarding,
   dati di esempio e avvio dell'applicazione.
   ================================================================== */

/* ------------------------------------------------------------------
   Piccole funzioni di appoggio usate dai pulsanti
   ------------------------------------------------------------------ */

/**
 * Stampa la pagina in A4 (o la salva come PDF, dalla finestra del browser).
 * Prima di stampare: scrive l'intestazione del foglio e apre i pannelli
 * chiusi, altrimenti sulla carta resterebbero dei buchi.
 */
function stampa(titoloPagina) {
  const testa = $('#intestazioneStampa');
  if (testa) {
    const nome = (Stato.profilo.nome || '').trim();
    const classe = (Stato.profilo.classe || '').trim();
    const titolo = titoloPagina || (($('#vista h1') || {}).textContent || APP.nome).trim();
    testa.innerHTML =
      '<span><b>' + esc(titolo) + '</b>' +
      (nome ? ' — ' + esc(nome) : '') + (classe ? ' (' + esc(classe) + ')' : '') + '</span>' +
      '<span>' + esc(dataInParole(oggiISO())) + '</span>';
  }
  const chiusi = $$('details:not([open])');
  chiusi.forEach((d) => { d.open = true; });
  const ripristina = () => chiusi.forEach((d) => { d.open = false; });
  try { window.addEventListener('afterprint', ripristina, { once: true }); } catch (e) { /* niente */ }
  setTimeout(() => {
    try { window.print(); }
    catch (e) { avvisoErrore('Questo browser non riesce ad aprire la stampa. Prova con Ctrl+P (su Mac ⌘+P).'); }
  }, 60);
  setTimeout(ripristina, 5000);          // rete di sicurezza
}

async function eliminaSeConfermi(elenco, id, cosa, dopo) {
  const i = elenco.findIndex((x) => x.id === id);
  if (i < 0) return;
  const ok = await conferma('Elimino ' + cosa + '?', 'Non si può tornare indietro.', 'Sì, elimina', true);
  if (!ok) return;
  elenco.splice(i, 1);
  await salvaOra();
  if (dopo) dopo();
  avvisoOk('Eliminato');
}

function leggiTesto(t) {
  if (!t || !String(t).trim()) { toast('Non c\'è niente da leggere.'); return; }
  Voce.parla(String(t));
}

async function duplicaDocumento() {
  const d = documentoCorrente();
  if (!d) { toast('Prima scrivi qualcosa.'); return; }
  const copia = Object.assign({}, d, { id: uid('doc'), titolo: (d.titolo || 'Documento') + ' (copia)', creato: oraISO(), modificato: oraISO(), versioni: [] });
  Stato.documenti.unshift(copia);
  await salvaOra();
  apriDocumento(copia.id);
  disegna();
  avvisoOk('Documento duplicato');
}

async function eliminaDocumentoCorrente() {
  const d = documentoCorrente();
  if (!d) { _editor = { id: null, titolo: '', testo: '', undo: [''], redo: [] }; disegna(); return; }
  const ok = await conferma('Elimino questo documento?', '"' + (d.titolo || 'Senza titolo') + '" sparirà per sempre.', 'Sì, elimina', true);
  if (!ok) return;
  Stato.documenti = Stato.documenti.filter((x) => x.id !== d.id);
  _editor = { id: null, titolo: '', testo: '', undo: [''], redo: [] };
  await salvaOra();
  disegna();
  avvisoOk('Documento eliminato');
}

function annullaEditor() {
  const area = $('#docTesto');
  if (!area || _editor.undo.length < 2) { toast('Non c\'è niente da annullare.'); return; }
  _editor.redo.push(_editor.undo.pop());
  const t = _editor.undo[_editor.undo.length - 1] || '';
  area.value = t; _editor.testo = t;
  aggiornaContatori(); salvaDocumentoAuto();
}
function ripristinaEditor() {
  const area = $('#docTesto');
  if (!area || !_editor.redo.length) { toast('Non c\'è niente da ripristinare.'); return; }
  const t = _editor.redo.pop();
  _editor.undo.push(t);
  area.value = t; _editor.testo = t;
  aggiornaContatori(); salvaDocumentoAuto();
}

async function portaNegliAppunti(testo, fonte) {
  if (!testo || !testo.trim()) { toast('Non c\'è testo da salvare.'); return; }
  await modificaAppunto(null, { titolo: accorcia(testo, 40), testo, fonte: fonte || '' });
}

async function creaFlashcardDaTesto(testo) {
  const r = await finestra({
    titolo: '🃏 Nuova flashcard',
    testo: 'Scegli tu cosa chiedere e cosa rispondere: io non invento le domande.',
    campi: [
      { nome: 'fronte', etichetta: 'FRONTE — la domanda', tipo: 'area', righe: 3, valore: '' },
      { nome: 'retro', etichetta: 'RETRO — la risposta', tipo: 'area', righe: 3, valore: testo || '' },
      { nome: 'materia', etichetta: 'Materia', tipo: 'scelta', opzioni: materie(), valore: materie()[0] }
    ],
    testoOk: 'Crea la scheda'
  });
  if (!r || !r.fronte.trim()) return;
  Stato.flashcard.unshift(nuovaCard(r.fronte, r.retro, r.materia));
  await salvaOra();
  avvisoOk('Flashcard creata');
}

async function mandaAllaMappa(testo) {
  if (!Stato.mappe.length) { await nuovaMappa(); }
  const m = Stato.mappe.find((x) => x.id === Mappa.corrente) || Stato.mappe[0];
  if (!m) return;
  Mappa.corrente = m.id;
  m.nodi.push({
    id: uid('nd'), testo: accorcia(testo, 60),
    x: limita(30 + Math.random() * 40, 10, 90), y: limita(40 + Math.random() * 40, 15, 90)
  });
  await salvaOra();
  avvisoOk('Aggiunto alla mappa "' + m.titolo + '"');
}

/**
 * Dal libro al quaderno: il testo copiato dal PDF finisce in "Lo risolvo io",
 * dove il ragazzo prova per conto suo. La soluzione automatica è un passo
 * successivo, e la chiede lui.
 */
function portaInMatematica(testo) {
  _esercizioDaPdf = String(testo || '').replace(/\s+/g, ' ').trim();
  Risolvi.aiuto = 0;
  vaiA('mate', 'risolvoio');
  setTimeout(() => {
    const box = $('#riEsito');
    if (box) box.innerHTML = `<div class="avviso avviso-att"><span class="ic">👀</span>
      <p><b>Controlla che l'esercizio sia stato copiato bene prima di cominciare.</b>
      Quando si copia da un PDF capita che qualche simbolo si perda o cambi:
      puoi correggerlo direttamente nella prima riga.</p></div>`;
  }, 80);
}

/* ------------------------------------------------------------------
   Elenco delle azioni: nome → cosa fare
   ------------------------------------------------------------------ */

const AZIONI = {
  /* ---- navigazione ---- */
  home: () => vaiA('home'),
  impo: () => vaiA('impo'),
  cerca: () => vaiA('cerca'),
  mate: () => vaiA('mate'),
  vai: (v) => vaiA(v),
  righello: (x, b) => { const a = Righello.alterna(); if (b) b.setAttribute('aria-pressed', String(a)); },
  sillabe: (x, b) => {
    Stato.impostazioni.spaziaturaSillabe = !Stato.impostazioni.spaziaturaSillabe;
    salva();
    $$('.foglio-testo').forEach((n) => n.classList.toggle('sillabe', Stato.impostazioni.spaziaturaSillabe));
    if (b) b.setAttribute('aria-pressed', String(Stato.impostazioni.spaziaturaSillabe));
  },

  /* ---- impostazioni ---- */
  'salva-profilo': salvaProfilo,
  backup: creaBackup,
  ripristina: ripristinaBackup,
  azzera: azzeraTutto,
  'rivedi-onboarding': () => { Stato.impostazioni.onboardingFatto = false; salva(); mostraOnboarding(); },

  /* ---- lettura ---- */
  'leggi-incolla': letturaIncolla,
  'leggi-importa': letturaImporta,
  'leggi-salvati': letturaSalvati,
  'leggi-da-pdf': () => vaiA('pdf'),
  'leggi-indietro': disegnaAreaLettura,
  'leggi-salva': letturaSalva,
  'leggi-appunto': () => portaNegliAppunti(_lettura.testo, _lettura.titolo),
  'leggi-stampa': stampa,
  modo: (m) => { _lettura.modo = m; fermaParole(); fermaLettura(); disegnaAreaLettura(); },
  'frase-prec': () => { _lettura.frase = Math.max(0, _lettura.frase - 1); disegnaAreaLettura(); },
  'frase-succ': () => { _lettura.frase = Math.min(_lettura.frasi.length - 1, _lettura.frase + 1); disegnaAreaLettura(); },
  'frase-ascolta': () => leggiTesto(_lettura.frasi[_lettura.frase]),
  'parola-prec': () => { _lettura.parola = Math.max(0, _lettura.parola - 1); disegnaAreaLettura(); },
  'parola-succ': () => { _lettura.parola = Math.min(_lettura.parole.length - 1, _lettura.parola + 1); disegnaAreaLettura(); },
  'parola-play': avviaParole,
  'parola-stop': fermaParole,
  'parola-vel': (k) => { _velParole = Number(k); if (_lettura.timerParole) avviaParole(); disegnaAreaLettura(); },
  'testo-apri': (id) => { const t = Stato.testi.find((x) => x.id === id); if (t) { _lettura.testo = t.testo; _lettura.titolo = t.titolo; _lettura.id = t.id; _lettura.frase = 0; _lettura.parola = 0; disegnaAreaLettura(); } },
  'testo-elimina': (id) => eliminaSeConfermi(Stato.testi, id, 'questo testo', letturaSalvati),

  /* ---- scrittura ---- */
  'doc-nuovo': nuovoDocumento,
  'doc-elenco': elencoDocumenti,
  'doc-salva': async () => { await salvaDocumentoAuto(); await salvaOra(); avvisoOk('Salvato'); },
  'doc-duplica': duplicaDocumento,
  'doc-elimina': eliminaDocumentoCorrente,
  'doc-annulla': annullaEditor,
  'doc-ripristina': ripristinaEditor,
  'doc-trova': trovaParola,
  'doc-controlla': controllaTesto,
  'doc-doppie': evidenziaDoppie,
  'doc-modelli': () => mostraModelli(null),
  'doc-esporta': esportaDocumento,
  'doc-importa': importaDocumento,
  'doc-stampa': stampa,
  'doc-versioni': mostraVersioni,
  'doc-checklist': (x, b) => {
    Stato.impostazioni.checklistVisibile = !Stato.impostazioni.checklistVisibile;
    salva(); disegnaChecklist();
    if (b) b.setAttribute('aria-pressed', String(Stato.impostazioni.checklistVisibile));
  },
  'doc-apri': (id) => { apriDocumento(id); disegna(); },
  'doc-canc': (id) => eliminaSeConfermi(Stato.documenti, id, 'questo documento', elencoDocumenti),
  'pannello-chiudi': () => { const p = $('#pannelloScrivi'); if (p) p.innerHTML = ''; },
  'ver-ripristina': async (i) => {
    const d = documentoCorrente();
    if (!d || !d.versioni || !d.versioni[i]) return;
    const ok = await conferma('Torno a questa versione?', 'Il testo di adesso viene messo da parte come versione precedente.', 'Sì');
    if (!ok) return;
    d.versioni.unshift({ quando: oraISO(), testo: d.testo });
    d.testo = d.versioni[i + 1].testo;
    _editor.testo = d.testo;
    await salvaOra();
    disegna();
    avvisoOk('Versione ripristinata');
  },
  fix: (i) => applicaCorrezione(Number(i)),
  modello: (k) => mostraModelli(k),
  'modello-componi': (k) => componiModello(k),

  /* ---- calcolatrice ---- */
  'calc-modo': (x, b) => { Calc.scientifica = !Calc.scientifica; disegnaTastiCalc(); if (b) b.setAttribute('aria-pressed', String(Calc.scientifica)); },
  'calc-gradi': (x, b) => {
    Calc.gradi = !Calc.gradi;
    if (b) { b.setAttribute('aria-pressed', String(Calc.gradi)); b.querySelector('span:last-child').textContent = Calc.gradi ? 'GRADI' : 'RADIANTI'; }
    toast(Calc.gradi ? 'Modalità GRADI' : 'Modalità RADIANTI');
  },
  'calc-leggi': () => leggiTesto(M.parlaFormula(Calc.espressione) + (($('#calcRis') || {}).textContent ? ' fa ' + $('#calcRis').textContent : '')),
  'calc-storia': mostraStoriaCalc,
  'calc-chiudi-storia': () => { $('#calcStoria').innerHTML = ''; },
  'calc-riusa': (i) => { Calc.espressione = Calc.storia[i].esp; $('#calcEsp').textContent = Calc.espressione; $('#calcStoria').innerHTML = ''; },

  /* ---- colonna ---- */
  'col-incolonna': incolonna,
  'col-controlla': controllaColonna,
  'col-aiuto': aiutoColonna,
  'col-mostra': () => {
    const r = String(risultatoColonna());
    $('#colEsito').innerHTML = `<div class="avviso"><span class="ic">👀</span>
      <p>Il risultato è <b>${esc(r)}</b>. Adesso prova a rifare il conto da solo per capire perché.</p></div>`;
  },
  'col-pulisci': () => { $$('#colGriglia input').forEach((n) => { n.value = ''; }); $('#colEsito').innerHTML = ''; },

  /* ---- tabelline ---- */
  'tab-nascondi': (x, b) => { Tab.nascondi = !Tab.nascondi; disegnaPitagorica(); if (b) b.setAttribute('aria-pressed', String(Tab.nascondi)); },
  'tab-allena': nuovaSfidaTabelline,
  'tab-rispondi': rispondiTabellina,
  'tab-salta': nuovaSfidaTabelline,
  'tab-aiuto': aiutoTabellina,

  /* ---- frazioni, retta, percentuali ---- */
  'fr-disegna': disegnaFrazioni,
  'fr-leggi': () => {
    const t = 'Prima frazione: ' + M.parlato(M.nNum(M.fr(Number($('#frA1').value), Number($('#frA2').value)))) +
      '. Seconda frazione: ' + M.parlato(M.nNum(M.fr(Number($('#frB1').value), Number($('#frB2').value)))) + '.';
    leggiTesto(t);
  },
  'rt-mostra': () => disegnaRettaNumeri(true),
  'pc-calcola': () => calcolaPercentuale(false),
  'pc-passaggi': () => calcolaPercentuale(true),

  /* ---- problemi guidati ---- */
  'pb-leggi': () => { problemaLeggiCampi(); leggiTesto(Problema.testo); },
  'pb-avanti': (n) => { problemaLeggiCampi(); Problema.passo = Number(n); disegnaProblema(); },
  'pb-indietro': (n) => { problemaLeggiCampi(); Problema.passo = Number(n); disegnaProblema(); },
  'pb-op': (op) => problemaOperazione(op),
  'pb-calcola': problemaCalcola,
  'pb-salva': problemaSalva,
  'pb-nuovo': () => {
    Object.assign(Problema, { testo: '', so: '', trovare: '', op: '', calcolo: '', risposta: '', passo: 1 });
    disegnaProblema();
  },

  /* ---- risolutore ---- */
  'passi-modo': (x, b) => { _passi.unoAllaVolta = !_passi.unoAllaVolta; disegnaPassi(); },
  'passi-leggi': () => {
    if (!_passi.esito) return;
    const t = _passi.esito.passi.map((p) => p.tit + '. ' + (p.spiega || '')).join(' ');
    leggiTesto(t);
  },
  'passi-quaderno': () => {
    if (!_passi.esito) return;
    nuovoEsercizioQuaderno({
      titolo: accorcia(Risolvi.testo || 'Esercizio', 50),
      testo: Risolvi.testo,
      procedimento: _passi.esito.passi.map((p, i) => (i + 1) + '. ' + p.tit + ' — ' + (p.spiega || '')).join('\n'),
      risultato: _passi.esito.soluzioneTesto || ''
    });
  },
  perche: (i) => { const n = $('#perche-' + i); if (n) n.hidden = !n.hidden; },
  'passo-prec': () => { _passi.indice = Math.max(0, _passi.indice - 1); disegnaPassi(); },
  'passo-succ': () => { _passi.indice = Math.min(_passi.esito.passi.length - 1, _passi.indice + 1); disegnaPassi(); },
  'rs-tipo': (t) => {
    Risolvi.tipo = t;
    $$('[data-az^="rs-tipo:"]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.az === 'rs-tipo:' + t)));
    const s = $('#rsSeconda');
    if (s) s.hidden = (t !== 'sistema');
    const ex = $('#rsExtra');
    if (ex) ex.innerHTML = (t === 'limite')
      ? `<label class="etichetta" for="rsVerso">x tende a</label>
         <input class="campo" id="rsVerso" type="text" value="0" placeholder="un numero oppure inf">` : '';
  },
  'rs-conme': () => { Risolvi.aiuto = 0; risolviEsercizio('conme'); },
  'rs-aiuto': aiutoProgressivo,
  'rs-passaggi': () => risolviEsercizio('conme'),
  'rs-controlla': controllaMioRisultato,
  'rs-soluzione': () => risolviEsercizio('tutto'),

  /* ---- allenamento, quaderno, errori ---- */
  /* ---- lo risolvo io ---- */
  'ri-ricopia': ricopiaRiga,
  'ri-controlla': (i) => controllaRigaEq(Number(i)),
  'ri-leggi': (i) => { leggiRigheDalloSchermo(); leggiTesto(M.parlaFormula(RisolvoIo.righe[i])); },
  'ri-canc': (i) => {
    leggiRigheDalloSchermo();
    RisolvoIo.righe.splice(Number(i), 1);
    RisolvoIo.esitoRighe = {};
    salvaLavoroEquazione();
    disegnaRisolvoIo();
  },
  'ri-aiuto': aiutoRisolvoIo,
  'ri-finito': finitoRisolvoIo,
  'ri-programma': mostraSoluzioneProgramma,
  'ri-quaderno': salvaLavoroNelQuaderno,
  'ri-daPdf': () => vaiA('pdf'),
  'ri-nuovo': async () => {
    const ok = await conferma('Ricomincio da capo?', 'I passaggi che hai scritto verranno cancellati.', 'Sì, ricomincia');
    if (!ok) return;
    RisolvoIo.righe = [''];
    RisolvoIo.esitoRighe = {};
    Stato.lavoroEquazione = null;
    await salvaOra();
    disegnaRisolvoIo();
    const p = $('#riEsito'); if (p) p.innerHTML = '';
  },

  'al-nuovo': nuovoAllenamento,
  'al-controlla': controllaAllenamento,
  'al-aiuto1': () => aiutoAllenamento(1),
  'al-aiuto2': () => aiutoAllenamento(2),
  'al-formula': () => aiutoAllenamento(3),
  'qd-nuovo': () => nuovoEsercizioQuaderno(),
  'qf-aggiorna': disegnaFoglioQuaderno,
  'qf-stampa': () => stampa('Il mio quaderno di matematica'),
  'qd-apri': apriEsercizioQuaderno,
  'qd-canc': (id) => eliminaSeConfermi(Stato.quaderno, id, 'questo esercizio', disegnaQuaderno),
  'er-nuovo': nuovoErrore,
  'er-leggi': (id) => { const e = Stato.erroriMate.find((x) => x.id === id); if (e) leggiTesto(e.titolo + '. Sbagliato: ' + M.parlaFormula(e.sbagliato) + '. Corretto: ' + M.parlaFormula(e.corretto) + '. ' + e.regola); },
  'er-canc': (id) => eliminaSeConfermi(Stato.erroriMate, id, 'questo errore', disegnaErrori),

  /* ---- grafici ---- */
  'gf-aggiungi': () => aggiungiFunzione(),
  'gf-zoom+': () => Piano.zoom(0.7),
  'gf-zoom-': () => Piano.zoom(1.4),
  'gf-centra': () => { Piano.xmin = -10; Piano.xmax = 10; Piano.adatta(); Piano.disegna(); },
  'gf-zeri': trovaZeri,
  'gf-inter': trovaIntersezioni,
  'gf-togli': (i) => { Piano.funzioni.splice(Number(i), 1); disegnaElencoFunzioni(); Piano.disegna(); },
  'rp-studia': studiaRettaParabola,
  'rp-esempio-retta': () => { $('#rpTesto').value = 'y = 2x + 3'; studiaRettaParabola(); },
  'rp-esempio-par': () => { $('#rpTesto').value = 'y = x^2 - 4x + 3'; studiaRettaParabola(); },

  /* ---- trigonometria e triangoli ---- */
  'tr-vai': (a) => { Trigo.angolo = Number(a); const r = $('#trAng'); if (r) r.value = a; disegnaTrigo(); },
  'tr-leggi': () => {
    const a = Trigo.angolo * Math.PI / 180;
    leggiTesto('Angolo di ' + Trigo.angolo + ' gradi. Seno ' + Risolutore.numeroIt(Math.round(Math.sin(a) * 1000) / 1000) +
      '. Coseno ' + Risolutore.numeroIt(Math.round(Math.cos(a) * 1000) / 1000) + '.');
  },
  'tri-risolvi': risolviTriangolo,
  'tri-esempio': () => { $('#triA').value = 3; $('#triB').value = 4; $('#triC').value = 5; risolviTriangolo(); },
  'lg-calcola': calcolaLogaritmo,

  /* ---- analisi ---- */
  'an-derivata': () => { _passi.unoAllaVolta = false; mostraPassi(Risolutore.derivataPassi($('#anTesto').value), '#risultatoMate'); },
  'an-limite': () => { _passi.unoAllaVolta = false; mostraPassi(Risolutore.limitePassi($('#anTesto').value, $('#anVerso').value), '#risultatoMate'); },
  'an-integrale': () => { _passi.unoAllaVolta = false; mostraPassi(Risolutore.integralePassi($('#anTesto').value), '#risultatoMate'); },
  'an-grafico': () => {
    Piano.funzioni = []; Piano.punti = [];
    aggiungiFunzione($('#anTesto').value);
  },
  'sf-avvia': () => { Studio.risultati = {}; eseguiPassoStudio('dominio'); },
  'sf-passo': eseguiPassoStudio,
  'sta-calcola': () => calcolaStatistica(false),
  'sta-passaggi': () => calcolaStatistica(true),

  /* ---- formulario ---- */
  'fm-nuova': () => modificaFormula(null),
  'fm-modifica': modificaFormula,
  'fm-canc': (id) => eliminaSeConfermi(Stato.formule, id, 'questa formula', disegnaFormule),
  'fm-leggi': (id) => { const f = Stato.formule.find((x) => x.id === id); if (f) leggiTesto(f.nome + '. ' + M.parlaFormula(f.formula) + '. ' + (f.quando || '')); },
  'fm-stampa': stampa,

  /* ---- studia ---- */
  'st-spezza': spezzaAppunti,
  'st-elenco': trasformaInElenco,
  'st-daPdf': () => vaiA('pdf'),
  'st-eti': (i, tipo) => etichettaFrase(Number(i), tipo),
  'st-leggi': (i) => leggiTesto(Studia.frasi[i]),
  'st-flashcard': flashcardDaStudio,
  'st-appunto': () => portaNegliAppunti(($('#stTesto') || {}).value || Studia.testo, 'Da Studia'),
  'st-mappa': () => {
    const chiavi = Object.keys(Studia.etichette).filter((k) => Studia.etichette[k] === 'chiave' || Studia.etichette[k] === 'titolo');
    if (!chiavi.length) { toast('Segna prima qualche frase come "Titolo" o "Parola chiave".'); return; }
    chiavi.forEach((k) => mandaAllaMappa(Studia.frasi[k]));
  },
  'st-copiaElenco': () => portaNegliAppunti(dividiInFrasi(Studia.testo).map((f) => '• ' + f).join('\n'), 'Elenco'),
  'st-stampa': stampa,

  /* ---- flashcard ---- */
  'fc-nuova': () => modificaFlashcard(null),
  'fc-elenco': elencoFlashcard,
  'fc-torna': () => { preparaMazzo(); disegnaFlashcard(); },
  'fc-mischia': () => { Flash.ordine.sort(() => Math.random() - 0.5); Flash.indice = 0; Flash.giro = false; disegnaFlashcard(); },
  'fc-gira': () => { Flash.giro = !Flash.giro; disegnaFlashcard(); },
  'fc-leggi': () => { const c = Flash.ordine[Flash.indice]; if (c) leggiTesto(Flash.giro ? c.retro : c.fronte); },
  'fc-so': () => rispondiFlashcard('so'),
  'fc-quasi': () => rispondiFlashcard('quasi'),
  'fc-ripassa': () => rispondiFlashcard('ripassa'),
  'fc-prec': () => { Flash.indice = Math.max(0, Flash.indice - 1); Flash.giro = false; disegnaFlashcard(); },
  'fc-succ': () => { Flash.indice = Math.min(Flash.ordine.length - 1, Flash.indice + 1); Flash.giro = false; disegnaFlashcard(); },
  'fc-modifica': modificaFlashcard,
  'fc-canc': (id) => eliminaSeConfermi(Stato.flashcard, id, 'questa scheda', () => { preparaMazzo(); disegnaFlashcard(); }),

  /* ---- mappe ---- */
  'mp-nuova': nuovaMappa,
  'mp-nodo': () => aggiungiNodo(null),
  'mp-figlio': (id) => aggiungiNodo(id),
  'mp-modnodo': modificaNodo,
  'mp-immagine': immagineNodo,
  'mp-toglimg': togliImmagineNodo,
  'mp-collega': () => { toast('Tocca il primo nodo, poi il secondo.'); Mappa.collegando = Mappa.scelto; },
  'mp-daqui': (id) => { Mappa.collegando = id; toast('Adesso tocca l\'altro nodo da collegare.'); },
  'mp-elimina': async (id) => {
    const m = mappaCorrente();
    if (!m) return;
    m.nodi = m.nodi.filter((n) => n.id !== id);
    m.archi = m.archi.filter((a) => a.da !== id && a.a !== id);
    await salvaOra();
    $('#mpAzioniNodo').innerHTML = '';
    disegnaMappa();
  },
  'mp-grande': async (id) => { const n = mappaCorrente().nodi.find((x) => x.id === id); if (n) { n.dim = limita((n.dim || 1) + 0.15, 0.7, 2.2); await salvaOra(); disegnaMappa(); } },
  'mp-piccolo': async (id) => { const n = mappaCorrente().nodi.find((x) => x.id === id); if (n) { n.dim = limita((n.dim || 1) - 0.15, 0.7, 2.2); await salvaOra(); disegnaMappa(); } },
  'mp-zoom+': () => { Mappa.zoom = limita(Mappa.zoom + 0.12, 0.6, 2); disegnaMappa(); },
  'mp-zoom-': () => { Mappa.zoom = limita(Mappa.zoom - 0.12, 0.6, 2); disegnaMappa(); },
  'mp-esporta': esportaMappa,
  'mp-canc': () => eliminaSeConfermi(Stato.mappe, Mappa.corrente, 'questa mappa', () => { Mappa.corrente = null; vaiA('mappe'); }),

  /* ---- appunti ---- */
  'ap-nuovo': () => modificaAppunto(null),
  'ap-mod': modificaAppunto,
  'ap-canc': (id) => eliminaSeConfermi(Stato.appunti, id, 'questo appunto', disegnaAppunti),
  'ap-leggi': (id) => { const a = Stato.appunti.find((x) => x.id === id); if (a) leggiTesto((a.titolo || '') + '. ' + a.testo); },
  'ap-apri': (id) => {
    const a = Stato.appunti.find((x) => x.id === id);
    if (a) finestra({ titolo: a.titolo || 'Appunto', testo: a.testo, testoOk: 'Chiudi', testoAnnulla: 'Chiudi' });
  },
  'ap-flash': (id) => { const a = Stato.appunti.find((x) => x.id === id); if (a) creaFlashcardDaTesto(a.testo); },

  /* ---- compiti ---- */
  'cp-nuovo': () => modificaCompito(null),
  'cp-mod': modificaCompito,
  'cp-vista': (v) => { Compiti.vista = v; disegna(); },
  'cp-spezza': spezzaCompito,
  'cp-canc': (id) => eliminaSeConfermi(Stato.compiti, id, 'questo compito', disegnaCompiti),
  'cp-focus': (id) => {
    const t = Stato.compiti.find((x) => x.id === id);
    if (!t) return;
    Timer.attivita = t.descrizione;
    vaiA('focus');
    setTimeout(() => { const a = $('#tmAttivita'); if (a) a.value = t.descrizione; }, 60);
  },

  /* ---- timer ---- */
  'tm-preset': (s, p) => avviaTimer(Number(s), Number(p)),
  'tm-avvia': () => avviaTimer(Stato.impostazioni.timerStudio || 20, Stato.impostazioni.timerPausa || 5),
  'tm-personalizzato': async () => {
    const r = await finestra({
      titolo: 'Timer su misura',
      campi: [
        { nome: 'studio', etichetta: 'Minuti di studio', tipo: 'numero', valore: Timer.studio },
        { nome: 'pausa', etichetta: 'Minuti di pausa', tipo: 'numero', valore: Timer.pausa }
      ], testoOk: 'Comincia'
    });
    if (!r) return;
    avviaTimer(limita(Number(r.studio) || 20, 1, 120), limita(Number(r.pausa) || 5, 1, 60));
  },
  'tm-pausa': () => { Timer.inPausa = !Timer.inPausa; if (!Timer.inPausa && !Timer.riferimento) battitoTimer(); disegnaTimer(); },
  'tm-stop': fermaTimer,

  /* ---- parole ---- */
  'pr-tab': (t) => { Parole.tab = t; disegna(); },
  'pr-nuovaVoc': () => nuovaParola('vocabolario'),
  'pr-modVoc': (id) => nuovaParola('vocabolario', id),
  'pr-cancVoc': (id) => eliminaSeConfermi(Stato.vocabolario, id, 'questa parola', disegnaParole),
  'pr-leggiVoc': (id) => { const v = Stato.vocabolario.find((x) => x.id === id); if (v) leggiTesto(v.parola + '. ' + v.significato); },
  'pr-nuovaDiff': () => nuovaParola('difficili'),
  'pr-modDiff': (id) => nuovaParola('difficili', id),
  'pr-cancDiff': (id) => eliminaSeConfermi(Stato.paroleDifficili, id, 'questa parola', disegnaParole),
  'pr-leggiDiff': (id) => { const v = Stato.paroleDifficili.find((x) => x.id === id); if (v) leggiTesto(v.parola + '. ' + (v.sillabe || '') + '. ' + (v.esempio || '')); },
  'pr-nuovaEn': () => nuovaParola('inglese'),
  'pr-cancEn': (id) => eliminaSeConfermi(Stato.inglese, id, 'questo vocabolo', disegnaParole),
  'pr-leggiEn': (id) => {
    const v = Stato.inglese.find((x) => x.id === id);
    if (!v) return;
    if (!Voce.disponibile) { toast('Questo browser non legge ad alta voce.'); return; }
    Voce.parla([v.en], { lang: 'en-GB' });
  },
  'pr-flashEn': flashcardInglese,

  /* ---- PDF ---- */
  'pdf-apri': () => apriPdfDaFile(null),
  'pdf-libreria': () => { Pdf.doc = null; Pdf.libroId = null; disegnaBarraPdf(); disegnaLibreria(); },
  'pdf-riapri': (id) => vaiA('pdf', id),
  'pdf-riscegli': (id) => apriPdfDaFile(id),
  'pdf-prec': () => vaiAPagina(Pdf.pagina - 1),
  'pdf-succ': () => vaiAPagina(Pdf.pagina + 1),
  'pdf-vai': (n) => { const p = $('#pdfPannello'); if (p) p.innerHTML = ''; vaiAPagina(Number(n)); },
  'pdf-zoom+': () => { Pdf.adatta = 'no'; Pdf.zoom = limita(Pdf.zoom * 1.25, 0.25, 5); mostraPagina(); },
  'pdf-zoom-': () => { Pdf.adatta = 'no'; Pdf.zoom = limita(Pdf.zoom / 1.25, 0.25, 5); mostraPagina(); },
  'pdf-adatta': () => {
    Pdf.adatta = Pdf.adatta === 'larghezza' ? 'pagina' : 'larghezza';
    toast(Pdf.adatta === 'larghezza' ? 'Adattata alla larghezza' : 'Pagina intera');
    mostraPagina();
  },
  'pdf-dsa': (x, b) => {
    Pdf.modoDsa = !Pdf.modoDsa;
    if (b) b.setAttribute('aria-pressed', String(Pdf.modoDsa));
    if (Pdf.modoDsa) mostraModoDsa();
    else { const p = $('#pdfPannello'); if (p) p.innerHTML = ''; }
  },
  'pdf-dsaChiudi': () => { Pdf.modoDsa = false; disegnaBarraPdf(); const p = $('#pdfPannello'); if (p) p.innerHTML = ''; },
  'pdf-ascolta': () => {
    if (!Pdf.haTesto) { mostraAvvisoScansione(); toast('Questa pagina è un\'immagine: non c\'è testo da leggere.'); return; }
    leggiTesto(Pdf.testoPagina);
  },
  'pdf-frase': () => {
    if (!Pdf.haTesto) { mostraAvvisoScansione(); return; }
    _lettura.testo = Pdf.testoPagina;
    _lettura.titolo = 'Pagina ' + Pdf.pagina;
    _lettura.id = null; _lettura.modo = 'frase'; _lettura.frase = 0;
    vaiA('leggi');
  },
  'pdf-inLettura': () => {
    _lettura.testo = Pdf.testoPagina;
    _lettura.titolo = 'Pagina ' + Pdf.pagina;
    _lettura.id = null; _lettura.modo = 'normale';
    vaiA('leggi');
  },
  'pdf-cerca': cercaNelPdf,
  'pdf-segnalibro': aggiungiSegnalibro,
  'pdf-note': mostraNotePdf,
  'pdf-chiudiPannello': () => { const p = $('#pdfPannello'); if (p) { p.innerHTML = ''; p._scansione = false; } },
  'pdf-esportaNote': esportaNotePdf,
  'pdf-trascrivi': trascriviPagina,
  'pdf-appunto': () => {
    const libro = Stato.libri.find((l) => l.id === Pdf.libroId);
    portaNegliAppunti(Pdf.testoPagina, (libro ? libro.nome : 'PDF') + ' — pagina ' + Pdf.pagina);
  },
  'pdf-materia': async (id) => {
    const l = Stato.libri.find((x) => x.id === id);
    if (!l) return;
    const r = await finestra({ titolo: 'Materia del libro', campi: [{ nome: 'm', etichetta: 'Materia', tipo: 'scelta', opzioni: materie(), valore: l.materia || materie()[0] }], testoOk: 'Salva' });
    if (!r) return;
    l.materia = r.m;
    await salvaOra();
    disegnaLibreria();
  },
  'pdf-canc': async (id) => {
    const ok = await conferma('Tolgo questo libro?', 'Spariranno anche le note, le evidenziazioni e i segnalibri di questo libro.', 'Sì, togli', true);
    if (!ok) return;
    Stato.libri = Stato.libri.filter((l) => l.id !== id);
    Stato.notePdf = Stato.notePdf.filter((n) => n.libroId !== id);
    Stato.evidenziazioni = Stato.evidenziazioni.filter((n) => n.libroId !== id);
    Stato.segnalibri = Stato.segnalibri.filter((n) => n.libroId !== id);
    await Archivio.cancella('pdf:' + id);
    await salvaOra();
    disegnaLibreria();
    avvisoOk('Libro tolto dalla libreria');
  },
  'pdf-cancNota': (id) => eliminaSeConfermi(Stato.notePdf, id, 'questa nota', mostraNotePdf),
  'pdf-cancEvid': (id) => eliminaSeConfermi(Stato.evidenziazioni, id, 'questa evidenziazione', () => { mostraNotePdf(); disegnaEvidenziazioni(); }),
  'pdf-cancSeg': (id) => eliminaSeConfermi(Stato.segnalibri, id, 'questo segnalibro', mostraNotePdf),

  /* ---- menu della selezione ---- */
  'sel-leggi': () => { leggiTesto(selezioneCorrente()); chiudiMenuSelezione(); },
  'sel-evidenzia': evidenziaSelezione,
  'sel-nota': notaSuPdf,
  'sel-appunto': () => {
    const libro = Stato.libri.find((l) => l.id === Pdf.libroId);
    const t = selezioneCorrente();
    chiudiMenuSelezione();
    portaNegliAppunti(t, libro ? libro.nome + ' — pagina ' + Pdf.pagina : '');
  },
  'sel-flash': () => { const t = selezioneCorrente(); chiudiMenuSelezione(); creaFlashcardDaTesto(t); },
  'sel-mappa': () => { const t = selezioneCorrente(); chiudiMenuSelezione(); mandaAllaMappa(t); },
  'sel-mate': () => { const t = selezioneCorrente(); chiudiMenuSelezione(); portaInMatematica(t); },
  'sel-dsa': () => {
    const t = selezioneCorrente();
    chiudiMenuSelezione();
    _lettura.testo = t; _lettura.titolo = 'Dal PDF'; _lettura.id = null; _lettura.modo = 'frase'; _lettura.frase = 0;
    vaiA('leggi');
  },
  'sel-chiudi': chiudiMenuSelezione
};

/* ------------------------------------------------------------------
   Un solo ascoltatore per tutti i pulsanti
   ------------------------------------------------------------------ */

function collegaEventi() {
  document.addEventListener('click', (e) => {
    // navigazione rapida
    const vai = e.target.closest('[data-vai]');
    if (vai) {
      const p = vai.dataset.vai.split('/');
      vaiA(p[0], p[1]);
      return;
    }
    // azioni
    const b = e.target.closest('[data-az]');
    if (b) {
      const pezzi = b.dataset.az.split(':');
      const fn = AZIONI[pezzi[0]];
      if (fn) {
        e.preventDefault();
        try { fn.apply(null, pezzi.slice(1).concat([b])); }
        catch (err) { console.error(err); avvisoErrore('Questa funzione non è riuscita a partire. Riprova.'); }
        return;
      }
    }
    // tasti della calcolatrice
    const t = e.target.closest('[data-tasto]');
    if (t) { premiTastoCalc(t.dataset.tasto); return; }
    // simboli matematici
    const s = e.target.closest('[data-simbolo]');
    if (s) { inserisciSimbolo(s.dataset.campo, s.dataset.simbolo); return; }
    // tavola pitagorica
    const tb = e.target.closest('[data-tab]');
    if (tb) { const [i, j] = tb.dataset.tab.split(','); toccaTabellina(Number(i), Number(j)); return; }
  });

  document.addEventListener('change', (e) => {
    const f = e.target.closest('[data-fatto]');
    if (f) {
      const t = Stato.compiti.find((x) => x.id === f.dataset.fatto);
      if (t) { t.fatto = f.checked; salva(); disegnaCompiti(); if (t.fatto) toast('👏 Fatto!'); }
      return;
    }
    const p = e.target.closest('[data-passo]');
    if (p) {
      const [id, i] = p.dataset.passo.split(':');
      const t = Stato.compiti.find((x) => x.id === id);
      if (t && t.passi && t.passi[i]) { t.passi[i].fatto = p.checked; salva(); }
    }
  });

  // barra superiore
  $('#btnHome').addEventListener('click', () => vaiA('home'));
  $('#btnCerca').addEventListener('click', () => vaiA('cerca'));
  $('#btnImpostazioni').addEventListener('click', () => vaiA('impo'));
  $('#btnStampa').addEventListener('click', () => stampa());

  window.addEventListener('hashchange', disegna);

  // se l'app viene chiusa o messa via, provo comunque a salvare l'ultimo lavoro
  window.addEventListener('pagehide', () => { salvaOra(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') salvaOra();
  });

  // selezione del testo → menu (nel PDF e nel foglio di lettura)
  document.addEventListener('mouseup', gestisciSelezione);
  document.addEventListener('touchend', gestisciSelezione);

  // scorciatoie da tastiera (tutte le funzioni restano disponibili anche senza)
  document.addEventListener('keydown', (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    if (ctrl && e.key.toLowerCase() === 's') { e.preventDefault(); salvaOra(); avvisoOk('Salvato'); }
    else if (ctrl && e.key.toLowerCase() === 'f') {
      if (vistaCorrente === 'scrivi') { e.preventDefault(); trovaParola(); }
      else if (vistaCorrente === 'pdf' && Pdf.doc) { e.preventDefault(); cercaNelPdf(); }
      else { e.preventDefault(); vaiA('cerca'); }
    } else if (ctrl && e.key.toLowerCase() === 'z' && vistaCorrente === 'scrivi' && e.target.id !== 'docTesto') {
      e.preventDefault(); annullaEditor();
    } else if (e.key === 'Escape') {
      if ($('#menuSelezione')) chiudiMenuSelezione();
      else if (Righello.aperto) Righello.chiudi();
      else if (focusAttivo()) { cambiaFocus(false); disegna(); }
    } else if (vistaCorrente === 'pdf' && Pdf.doc && !e.target.closest('input, textarea')) {
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { e.preventDefault(); vaiAPagina(Pdf.pagina + 1); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); vaiAPagina(Pdf.pagina - 1); }
    } else if (vistaCorrente === 'flash' && !e.target.closest('input, textarea')) {
      if (e.key === ' ') { e.preventDefault(); Flash.giro = !Flash.giro; disegnaFlashcard(); }
      if (e.key === 'ArrowRight') { AZIONI['fc-succ'](); }
      if (e.key === 'ArrowLeft') { AZIONI['fc-prec'](); }
    }
  });
}

function gestisciSelezione(e) {
  if (e.target && e.target.closest('.menu-selezione')) return;
  setTimeout(() => {
    const t = testoSelezionato();
    const dentroPdf = e.target && (e.target.closest('#pdfLivelloTesto') || e.target.closest('.foglio-testo'));
    if (t && t.length > 2 && dentroPdf) {
      const p = (e.changedTouches && e.changedTouches[0]) || e;
      mostraMenuSelezione(t, p.clientX || window.innerWidth / 2, p.clientY || window.innerHeight / 2);
    } else if (!t) {
      chiudiMenuSelezione();
    }
  }, 30);
}

/* ------------------------------------------------------------------
   Onboarding (solo la prima volta)
   ------------------------------------------------------------------ */

let _passoOnboarding = 1;

function mostraOnboarding() {
  const box = $('#modale');
  const i = Stato.impostazioni;
  const schermate = {
    1: `<h2>👋 Benvenuto in Studio DSA</h2>
        <p style="font-size:1.15em">Questo è il tuo spazio per studiare.</p>
        <p>Funziona senza Internet e quello che scrivi resta sul tuo dispositivo.</p>`,
    2: `<h2>👓 Come preferisci leggere?</h2>
        <p>Prova a cambiare finché questa frase non ti sembra facile da leggere.</p>
        <div class="foglio" style="margin:12px 0"><div class="foglio-testo">
          Il gatto dorme sul divano vicino alla finestra.</div></div>
        <div class="slider-riga">
          <label for="obDim">Grandezza del testo</label><output id="obOutDim">${i.dimensione} px</output>
          <input type="range" id="obDim" min="14" max="42" step="1" value="${i.dimensione}">
        </div>
        <div class="slider-riga">
          <label for="obSpazio">Spazio fra le parole</label><output id="obOutSp">${i.parole}</output>
          <input type="range" id="obSpazio" min="0" max="0.8" step="0.04" value="${i.parole}">
        </div>
        <label class="etichetta" for="obSfondo">Sfondo</label>
        <select class="campo" id="obSfondo">
          <option value="bianco">Bianco</option><option value="crema">Crema</option>
          <option value="giallo">Giallo tenue</option><option value="grigio">Grigio chiaro</option>
          <option value="scuro">Scuro</option>
        </select>`,
    3: `<h2>🎉 Sei pronto</h2>
        <p>Puoi cambiare tutto quando vuoi da <b>⚙️ Impostazioni</b>.</p>
        <p>Se una cosa non ti serve, lasciala perdere: l'app si usa anche solo per una funzione alla volta.</p>`
  };
  box.innerHTML = `<div class="modale-box" role="dialog" aria-modal="true">
      ${schermate[_passoOnboarding]}
      <p class="frase-contatore">${_passoOnboarding} di 3</p>
      <div class="modale-azioni">
        ${_passoOnboarding > 1 ? '<button type="button" class="btn" data-ob="indietro">⬅ Indietro</button>' : ''}
        <button type="button" class="btn btn-primario btn-grande" data-ob="avanti">
          ${_passoOnboarding === 3 ? 'INIZIA' : 'Avanti ➡'}</button>
      </div>
    </div>`;
  box.hidden = false;

  if (_passoOnboarding === 2) {
    const d = $('#obDim', box), s = $('#obSpazio', box), sf = $('#obSfondo', box);
    sf.value = i.sfondoLettura;
    d.addEventListener('input', () => { i.dimensione = Number(d.value); $('#obOutDim', box).textContent = d.value + ' px'; applicaAspetto(); });
    s.addEventListener('input', () => { i.parole = Number(s.value); $('#obOutSp', box).textContent = s.value; applicaAspetto(); });
    sf.addEventListener('change', () => { i.sfondoLettura = sf.value; applicaAspetto(); });
  }

  box.onclick = async (e) => {
    const b = e.target.closest('[data-ob]');
    if (!b) return;
    if (b.dataset.ob === 'indietro') { _passoOnboarding--; mostraOnboarding(); return; }
    if (_passoOnboarding < 3) { _passoOnboarding++; mostraOnboarding(); return; }
    Stato.impostazioni.onboardingFatto = true;
    await salvaOra();
    box.hidden = true;
    box.innerHTML = '';
    box.onclick = null;
    _passoOnboarding = 1;
    vaiA('home');
  };
}

/* ------------------------------------------------------------------
   Pochi dati di esempio, chiaramente cancellabili
   ------------------------------------------------------------------ */

function metteDatiDiEsempio() {
  Stato.flashcard.push({
    id: uid('fc'), fronte: 'In quale anno è iniziata la Prima guerra mondiale?', retro: '1914.',
    materia: 'Storia', stato: 'nuova', creata: oraISO(), viste: 0, esempio: true
  });
  Stato.quaderno.push({
    id: uid('es'), data: oggiISO(), materia: 'Matematica', argomento: 'Problema',
    titolo: 'Esempio: le figurine di Marco',
    testo: 'Marco ha 24 figurine e ne regala 7. Quante figurine gli rimangono?',
    procedimento: 'So: ha 24 figurine, ne regala 7.\nDevo trovare: quante gliene restano.\nOperazione: sottrazione\nCalcolo: 24 - 7',
    risultato: 'A Marco rimangono 17 figurine.', nota: 'Questo è un esempio: puoi cancellarlo.', esempio: true
  });
  Stato.appunti.push({
    id: uid('ap'), titolo: 'Come funziona questa app', materia: 'Altra', data: oggiISO(),
    testo: 'Questo è un appunto di esempio: puoi cancellarlo con il cestino.\n\n' +
      'Ogni cosa che scrivi resta su questo dispositivo. Ogni tanto fai un backup dalle Impostazioni: ' +
      'è un file che puoi rimettere dentro se cambi computer.',
    chiavi: 'esempio, backup', colore: COLORI_APPUNTO[0], esempio: true
  });
}

/* ------------------------------------------------------------------
   Service worker (solo quando serve e solo se possibile)
   ------------------------------------------------------------------ */

function registraServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  const p = location.protocol;
  if (p !== 'https:' && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') return;
  // updateViaCache 'none': il browser deve sempre ricontrollare se c'è
  // una versione nuova, altrimenti resterebbe fermo a quella salvata.
  navigator.serviceWorker.register('service-worker.js', { updateViaCache: 'none' })
    .catch(() => { /* l'app funziona lo stesso */ });
}

/* ------------------------------------------------------------------
   Avvio
   ------------------------------------------------------------------ */

async function avvia() {
  await Archivio.apri();
  const letti = await Archivio.leggi('dati');
  if (letti) applicaDati(letti);
  else metteDatiDiEsempio();

  if (Stato.impostazioni.timerStudio) Timer.studio = Stato.impostazioni.timerStudio;
  if (Stato.impostazioni.timerPausa) Timer.pausa = Stato.impostazioni.timerPausa;

  applicaAspetto();
  collegaEventi();
  aggiornaTab();

  if (!Stato.impostazioni.onboardingFatto) mostraOnboarding();
  if (!location.hash) location.hash = '#/home';
  disegna();

  registraServiceWorker();

  // le voci del dispositivo arrivano con un attimo di ritardo
  if (Voce.disponibile) setTimeout(() => Voce.aggiornaVoci(), 800);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia);
else avvia();
