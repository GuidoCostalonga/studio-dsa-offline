/* ==================================================================
   02-ui.js — navigazione, home, aspetto, ricerca, backup
   ================================================================== */

/** Ogni sezione registra qui la propria funzione di disegno. */
const VISTE = {};

/** Sezioni principali mostrate nella Home. */
const SEZIONI = [
  { id: 'pdf',      ic: '📄', tit: 'PDF e libri',   des: 'Leggi e ascolta i tuoi libri.' },
  { id: 'leggi',    ic: '📖', tit: 'Leggi',         des: 'Testi più facili da leggere.' },
  { id: 'scrivi',   ic: '✍️', tit: 'Scrivi',        des: 'Scrivi con meno difficoltà.' },
  { id: 'mate',     ic: '🔢', tit: 'Matematica',    des: 'Esercizi e formule passo passo.' },
  { id: 'studia',   ic: '🧠', tit: 'Studia',        des: 'Organizza quello che devi imparare.' },
  { id: 'mappe',    ic: '🗺️', tit: 'Mappe',         des: 'Crea mappe concettuali.' },
  { id: 'flash',    ic: '🃏', tit: 'Flashcard',     des: 'Ripassa velocemente.' },
  { id: 'appunti',  ic: '📓', tit: 'I miei appunti', des: 'Conserva il materiale.' },
  { id: 'compiti',  ic: '📅', tit: 'Compiti',       des: 'Organizza il lavoro.' },
  { id: 'focus',    ic: '🎯', tit: 'Concentrati',   des: 'Studia una cosa alla volta.' },
  { id: 'parole',   ic: '🔤', tit: 'Le mie parole', des: 'Vocabolario e parole difficili.' },
  { id: 'impo',     ic: '⚙️', tit: 'Impostazioni',  des: 'Adatta l\'app a te.' }
];

/** Voci della barra in basso sui telefoni: poche e sempre le stesse. */
const TAB = ['home', 'pdf', 'scrivi', 'mate', 'studia'];
const TAB_ICONE = { home: '🏠', pdf: '📄', scrivi: '✍️', mate: '🔢', studia: '🧠' };
const TAB_NOMI = { home: 'Home', pdf: 'PDF', scrivi: 'Scrivi', mate: 'Matematica', studia: 'Studia' };

let vistaCorrente = 'home';
let parametroCorrente = '';

/* ------------------------------------------------------------------
   Aspetto: temi, font, dimensioni
   ------------------------------------------------------------------ */

const SFONDI_LETTURA = {
  bianco: { s: '#ffffff', t: '#151515' },
  crema:  { s: '#fbf3e2', t: '#2b2318' },
  giallo: { s: '#fdf6c8', t: '#2a2712' },
  grigio: { s: '#e9edf0', t: '#1d2427' },
  scuro:  { s: '#161c21', t: '#e9eff4' }
};

/** Applica al documento tutte le preferenze visive salvate. */
function applicaAspetto() {
  const i = Stato.impostazioni;
  const h = document.documentElement;
  h.dataset.tema = i.tema || 'chiara';
  h.dataset.testo = i.testoUI || '2';
  if (i.font && i.font !== 'sistema') h.dataset.font = i.font; else delete h.dataset.font;

  const sf = SFONDI_LETTURA[i.sfondoLettura] || SFONDI_LETTURA.bianco;
  h.style.setProperty('--f-dim', i.dimensione + 'px');
  h.style.setProperty('--f-interlinea', String(i.interlinea));
  h.style.setProperty('--f-lettere', i.lettere + 'em');
  h.style.setProperty('--f-parole', i.parole + 'em');
  h.style.setProperty('--f-larghezza', i.larghezza + 'rem');
  h.style.setProperty('--f-sfondo', sf.s);
  h.style.setProperty('--f-testo', sf.t);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', i.tema === 'scura' || i.tema === 'contrasto' ? '#000000' : '#1d4e6f');
}

/* ------------------------------------------------------------------
   Navigazione
   ------------------------------------------------------------------ */

function vaiA(id, parametro) {
  const nuovo = '#/' + id + (parametro ? '/' + encodeURIComponent(parametro) : '');
  if (location.hash === nuovo) disegna();
  else location.hash = nuovo;
}

function leggiIndirizzo() {
  const pezzi = String(location.hash || '').replace(/^#\/?/, '').split('/');
  const id = pezzi[0] || 'home';
  const par = pezzi[1] ? decodeURIComponent(pezzi[1]) : '';
  return { id: VISTE[id] ? id : 'home', par };
}

function disegna() {
  const { id, par } = leggiIndirizzo();
  vistaCorrente = id;
  parametroCorrente = par;
  fermaLettura();          // la voce non deve continuare in un'altra sezione
  chiudiRighello();
  const cont = $('#vista');
  cont.innerHTML = '';
  try {
    VISTE[id](cont, par);
  } catch (e) {
    console.error(e);
    cont.innerHTML = `<div class="card"><h1>Questa parte non si è aperta</h1>
      <p>Puoi tornare alla Home e riprovare. I tuoi dati sono al sicuro.</p>
      ${bottone('home', '🏠', 'Torna alla Home', 'btn-primario')}</div>`;
  }
  aggiornaTab();
  window.scrollTo(0, 0);
  const t = $('h1', cont);
  document.title = (id === 'home' ? 'Studio DSA' : (t ? t.textContent.trim() + ' · Studio DSA' : 'Studio DSA'));
}

function aggiornaTab() {
  const barra = $('#tabbar');
  barra.innerHTML = TAB.map((t) =>
    `<button type="button" data-vai="${t}"${(t === vistaCorrente || (t === 'home' && vistaCorrente === 'home')) ? ' aria-current="page"' : ''}>
       <span class="ic" aria-hidden="true">${TAB_ICONE[t]}</span><span>${TAB_NOMI[t]}</span>
     </button>`).join('');
}

/* ------------------------------------------------------------------
   HOME
   ------------------------------------------------------------------ */

VISTE.home = function (c) {
  const nome = (Stato.profilo.nome || '').trim();
  const compitiOggi = Stato.compiti.filter((x) => !x.fatto && x.data && x.data <= oggiISO()).length;
  const daRipassare = Stato.flashcard.filter((f) => (f.stato || 'nuova') !== 'so').length;

  c.innerHTML = `
    <div class="sezione-testa">
      <h1>Studio DSA</h1>
    </div>
    <p class="sezione-sub">${nome ? 'Ciao ' + esc(nome) + '! ' : ''}Cosa vuoi fare adesso?</p>

    ${compitiOggi || daRipassare ? `<div class="card card-soft">
      <div class="barra-btn" style="margin:0">
        ${compitiOggi ? bottone('compiti', '📅', compitiOggi === 1 ? '1 compito da fare' : compitiOggi + ' compiti da fare', 'btn-attenzione') : ''}
        ${daRipassare ? bottone('flash', '🃏', daRipassare === 1 ? '1 scheda da ripassare' : daRipassare + ' schede da ripassare') : ''}
      </div></div>` : ''}

    <div class="griglia-home">
      ${SEZIONI.map((s) => `
        <button type="button" class="tessera" data-vai="${s.id}">
          <span class="ic" aria-hidden="true">${s.ic}</span>
          <span class="tx"><b>${esc(s.tit)}</b><span>${esc(s.des)}</span></span>
        </button>`).join('')}
    </div>

    <div class="card card-soft" style="margin-top:18px">
      <p style="margin:0"><span aria-hidden="true">🔒</span>
      I tuoi appunti e i tuoi dati rimangono sul tuo dispositivo.
      Questa applicazione non invia i tuoi contenuti a Internet.</p>
    </div>`;
};

/* ------------------------------------------------------------------
   RICERCA GENERALE
   ------------------------------------------------------------------ */

VISTE.cerca = function (c) {
  c.innerHTML = testaSezione('🔍', 'Cerca nei miei materiali', 'La ricerca guarda solo dentro il tuo dispositivo.') +
    `<div class="card">
      <label class="etichetta" for="qCerca">Che cosa stai cercando?</label>
      <input class="campo" id="qCerca" type="search" placeholder="Per esempio: fotosintesi" autocomplete="off">
    </div>
    <div id="risCerca"></div>`;

  const inp = $('#qCerca', c);
  const box = $('#risCerca', c);

  function cerca() {
    const q = inp.value.trim().toLowerCase();
    if (q.length < 2) { box.innerHTML = `<p class="aiutino">Scrivi almeno due lettere.</p>`; return; }
    const trovati = [];
    const agg = (tipo, icona, vista, id, titolo, testo) => {
      const t = (titolo + ' ' + testo).toLowerCase();
      if (t.indexOf(q) >= 0) trovati.push({ tipo, icona, vista, id, titolo, testo });
    };
    Stato.appunti.forEach((a) => agg('Appunto', '📓', 'appunti', a.id, a.titolo, (a.testo || '') + ' ' + (a.chiavi || '')));
    Stato.documenti.forEach((d) => agg('Documento', '✍️', 'scrivi', d.id, d.titolo, d.testo || ''));
    Stato.flashcard.forEach((f) => agg('Flashcard', '🃏', 'flash', f.id, f.fronte, f.retro || ''));
    Stato.compiti.forEach((t) => agg('Compito', '📅', 'compiti', t.id, t.descrizione, t.materia || ''));
    Stato.formule.forEach((f) => agg('Formula', '📐', 'formule', f.id, f.nome, (f.formula || '') + ' ' + (f.spiegazione || '')));
    Stato.vocabolario.forEach((v) => agg('Parola', '🔤', 'parole', v.id, v.parola, v.significato || ''));
    Stato.paroleDifficili.forEach((v) => agg('Parola difficile', '🔤', 'parole', v.id, v.parola, v.esempio || ''));
    Stato.inglese.forEach((v) => agg('Inglese', '🇬🇧', 'parole', v.id, v.en, v.it || ''));
    Stato.quaderno.forEach((v) => agg('Esercizio', '📓', 'quaderno', v.id, v.titolo, (v.testo || '') + ' ' + (v.procedimento || '')));
    Stato.testi.forEach((t) => agg('Testo da leggere', '📖', 'leggi', t.id, t.titolo, t.testo || ''));
    Stato.notePdf.forEach((n) => agg('Nota su PDF', '📄', 'pdf', n.libroId, n.testoSelezionato || '', n.nota || ''));

    box.innerHTML = trovati.length
      ? `<p class="aiutino">${trovati.length === 1 ? 'Ho trovato 1 risultato.' : 'Ho trovato ' + trovati.length + ' risultati.'}</p>
         <ul class="lista">${trovati.slice(0, 60).map((r) => `
           <li class="voce">
             <span aria-hidden="true" style="font-size:1.5em">${r.icona}</span>
             <div class="corpo">
               <b>${esc(accorcia(r.titolo || '(senza titolo)', 70))}</b>
               <span class="meta">${esc(r.tipo)} · ${esc(accorcia(r.testo, 90))}</span>
             </div>
             <div class="azioni">${bottone('vai:' + r.vista, '➡', 'Apri', 'btn-piccolo')}</div>
           </li>`).join('')}</ul>`
      : `<div class="card">${schedaVuota('🔍', 'Non ho trovato niente con questa parola.', 'Prova con una parola più corta o diversa.')}</div>`;
  }

  inp.addEventListener('input', debounce(cerca, 200));
  cerca();
  inp.focus();
};

/* ------------------------------------------------------------------
   IMPOSTAZIONI
   ------------------------------------------------------------------ */

VISTE.impo = function (c) {
  const i = Stato.impostazioni;
  const p = Stato.profilo;

  c.innerHTML = testaSezione('⚙️', 'Impostazioni', 'Le modifiche vengono salvate subito.') + `

  <div class="card">
    <h2>🎨 Come vedo l'app</h2>
    <label class="etichetta" for="selTema">Colori</label>
    <select class="campo" id="selTema">
      <option value="chiara">Chiara</option>
      <option value="crema">Crema</option>
      <option value="giallo">Giallo tenue</option>
      <option value="grigio">Grigio chiaro</option>
      <option value="scura">Scura</option>
      <option value="contrasto">Alto contrasto</option>
    </select>

    <label class="etichetta" for="selFont">Carattere</label>
    <select class="campo" id="selFont">
      <option value="sistema">Carattere del dispositivo (consigliato)</option>
      <option value="verdana">Verdana (lettere larghe)</option>
      <option value="tahoma">Tahoma</option>
      <option value="georgia">Georgia (con grazie)</option>
      <option value="mono">Larghezza fissa</option>
    </select>
    <p class="aiutino">Non esiste un carattere giusto per tutti: prova e tieni quello che ti stanca meno.</p>

    <div class="slider-riga">
      <label for="rgTesto">Grandezza del testo dei menu</label>
      <output id="outTesto"></output>
      <input type="range" id="rgTesto" min="1" max="5" step="1">
    </div>
  </div>

  <div class="card">
    <h2>📖 Come leggo</h2>
    <div class="slider-riga">
      <label for="rgDim">Grandezza del testo da leggere</label><output id="outDim"></output>
      <input type="range" id="rgDim" min="14" max="46" step="1">
    </div>
    <div class="slider-riga">
      <label for="rgInter">Spazio tra le righe</label><output id="outInter"></output>
      <input type="range" id="rgInter" min="1.2" max="3" step="0.1">
    </div>
    <div class="slider-riga">
      <label for="rgLett">Spazio tra le lettere</label><output id="outLett"></output>
      <input type="range" id="rgLett" min="0" max="0.25" step="0.01">
    </div>
    <div class="slider-riga">
      <label for="rgPar">Spazio tra le parole</label><output id="outPar"></output>
      <input type="range" id="rgPar" min="0" max="1" step="0.04">
    </div>
    <div class="slider-riga">
      <label for="rgLarg">Larghezza della colonna</label><output id="outLarg"></output>
      <input type="range" id="rgLarg" min="20" max="70" step="1">
    </div>
    <label class="etichetta" for="selSfondo">Sfondo del foglio di lettura</label>
    <select class="campo" id="selSfondo">
      <option value="bianco">Bianco</option><option value="crema">Crema</option>
      <option value="giallo">Giallo tenue</option><option value="grigio">Grigio chiaro</option>
      <option value="scuro">Scuro</option>
    </select>
    <label class="etichetta" for="selRighello">Righello di lettura: quante righe mostrare</label>
    <select class="campo" id="selRighello">
      <option value="1">Una riga</option><option value="3">Tre righe</option><option value="5">Cinque righe</option>
    </select>

    <div class="foglio" style="margin-top:14px">
      <div class="foglio-testo">Questa è una prova. Se leggi bene questa riga, le impostazioni vanno bene per te.</div>
    </div>
  </div>

  <div class="card">
    <h2>🔊 Voce che legge</h2>
    <div id="boxVoci"></div>
  </div>

  <div class="card">
    <h2>🙋 Il mio profilo</h2>
    <p class="aiutino">Non serve nessuna registrazione: questi dati restano solo qui.</p>
    <label class="etichetta" for="inNome">Nome (facoltativo)</label>
    <input class="campo" id="inNome" type="text" value="${esc(p.nome || '')}" autocomplete="off">
    <label class="etichetta" for="inClasse">Classe (facoltativo)</label>
    <input class="campo" id="inClasse" type="text" value="${esc(p.classe || '')}" autocomplete="off">
    <label class="etichetta" for="inMaterie">Le mie materie (una per riga)</label>
    <textarea class="area" id="inMaterie" rows="5">${esc(materie().join('\n'))}</textarea>
    <div class="barra-btn" style="margin-top:10px">${bottone('salva-profilo', '💾', 'Salva il profilo', 'btn-primario')}</div>
  </div>

  <div class="card">
    <h2>💾 Backup dei miei dati</h2>
    <p>Il backup è un file che contiene tutto quello che hai scritto. Serve se cambi dispositivo o se il browser cancella i dati.</p>
    <div class="barra-btn">
      ${bottone('backup', '💾', 'Crea backup', 'btn-primario btn-grande')}
      ${bottone('ripristina', '📂', 'Ripristina backup', 'btn-grande')}
    </div>
    <p class="aiutino">Nel backup non entrano i file PDF veri e propri (sono troppo grandi): restano note, evidenziazioni e segnalibri, e ti basterà riaprire il PDF dal dispositivo.</p>
  </div>

  <div class="card">
    <h2>ℹ️ Informazioni</h2>
    <p><b>${esc(APP.nome)}</b> versione ${esc(APP.versione)}.</p>
    <p><span aria-hidden="true">🔒</span> I tuoi appunti e i tuoi dati rimangono sul tuo dispositivo.
       Questa applicazione non invia i tuoi contenuti a Internet.</p>
    <p class="aiutino">Salvataggio dati: ${Archivio.conIDB() ? 'database del browser (IndexedDB)' : 'memoria del browser (localStorage)'}.</p>
    <div class="barra-btn">
      ${bottone('rivedi-onboarding', '👋', 'Rivedi la presentazione iniziale')}
      ${bottone('azzera', '🗑️', 'Cancella tutti i miei dati', 'btn-errore')}
    </div>
    ${location.protocol.indexOf('http') === 0 ? `
      <hr style="border:none;border-top:2px solid var(--bordo);margin:16px 0">
      <p><b>Stai usando l'applicazione da Internet.</b> Puoi scaricarla e tenertela sul dispositivo:
         da quel momento funziona anche in aereo, senza rete.</p>
      <div class="barra-btn">
        <a class="btn btn-primario btn-grande" href="studio-dsa-offline.html" download>
          <span aria-hidden="true">⬇️</span><span>Scarica l'app in un unico file</span></a>
        <a class="btn" id="tasto-home" href="/">
          <span aria-hidden="true">⌂</span><span>Vai al sito di Guido Costalonga</span></a>
      </div>
      <p class="aiutino">Il file scaricato si apre con un doppio clic e contiene tutto.
         Attenzione: i dati del file scaricato sono separati da quelli che vedi adesso nel browser;
         per portarli con te usa "Crea backup" qui sopra e poi "Ripristina backup" nell'altra copia.</p>` : ''}
  </div>`;

  // --- collegamenti dei controlli ---------------------------------
  const i2 = Stato.impostazioni;
  const lega = (sel, chiave, formato, dopo) => {
    const n = $(sel, c);
    if (!n) return;
    n.value = i2[chiave];
    const out = $('#out' + sel.slice(3), c);
    const mostra = () => { if (out) out.textContent = formato ? formato(n.value) : n.value; };
    mostra();
    n.addEventListener('input', () => {
      i2[chiave] = (n.type === 'range') ? Number(n.value) : n.value;
      mostra(); applicaAspetto(); salva();
      if (dopo) dopo();
    });
  };
  $('#selTema', c).value = i2.tema;
  $('#selFont', c).value = i2.font;
  $('#selSfondo', c).value = i2.sfondoLettura;
  $('#selRighello', c).value = String(i2.righelloRighe);
  ['selTema:tema', 'selFont:font', 'selSfondo:sfondoLettura', 'selRighello:righelloRighe'].forEach((coppia) => {
    const [id, chiave] = coppia.split(':');
    $('#' + id, c).addEventListener('change', (e) => {
      i2[chiave] = chiave === 'righelloRighe' ? Number(e.target.value) : e.target.value;
      applicaAspetto(); salva(); avvisoOk('Impostazione salvata');
    });
  });
  lega('#rgTesto', 'testoUI', (v) => ['', 'piccolo', 'normale', 'grande', 'molto grande', 'enorme'][Number(v)]);
  lega('#rgDim', 'dimensione', (v) => v + ' px');
  lega('#rgInter', 'interlinea', (v) => Number(v).toFixed(1));
  lega('#rgLett', 'lettere', (v) => Number(v).toFixed(2));
  lega('#rgPar', 'parole', (v) => Number(v).toFixed(2));
  lega('#rgLarg', 'larghezza', (v) => v + ' caratteri circa');

  disegnaSceltaVoce($('#boxVoci', c));
};

/* ------------------------------------------------------------------
   Azioni delle impostazioni
   ------------------------------------------------------------------ */

async function salvaProfilo() {
  Stato.profilo.nome = $('#inNome').value.trim();
  Stato.profilo.classe = $('#inClasse').value.trim();
  const righe = $('#inMaterie').value.split('\n').map((s) => s.trim()).filter(Boolean);
  Stato.profilo.materie = righe.length ? righe : null;
  await salvaOra();
  avvisoOk('Profilo salvato');
}

function creaBackup() {
  const dati = JSON.parse(JSON.stringify(Stato));
  dati._app = APP.nome;
  dati._versioneApp = APP.versione;
  dati._data = oraISO();
  const ok = scaricaFile('studio-dsa-backup.json', JSON.stringify(dati, null, 2), 'application/json');
  if (ok) avvisoOk('Backup pronto: controlla nei file scaricati');
}

async function ripristinaBackup() {
  const f = await scegliFile('.json,application/json');
  if (!f) return;
  let dati;
  try {
    dati = JSON.parse(await leggiFileTesto(f));
  } catch (e) {
    avvisoErrore('Questo file non sembra un backup di Studio DSA. Prova con un altro file.');
    return;
  }
  if (!dati || typeof dati !== 'object' || !dati.impostazioni) {
    avvisoErrore('Questo file non sembra un backup di Studio DSA.');
    return;
  }
  const conta = ['appunti', 'flashcard', 'compiti', 'documenti', 'formule', 'mappe']
    .map((k) => (Array.isArray(dati[k]) ? dati[k].length : 0)).reduce((a, b) => a + b, 0);
  const ok = await conferma('Ripristinare il backup?',
    'Dentro ci sono circa ' + conta + ' elementi. I dati che hai adesso su questo dispositivo verranno sostituiti.',
    'Sì, ripristina', true);
  if (!ok) return;
  applicaDati(dati);
  await salvaOra();
  applicaAspetto();
  avvisoOk('Backup ripristinato');
  vaiA('home');
}

async function azzeraTutto() {
  const ok = await conferma('Cancellare tutti i dati?',
    'Spariranno appunti, flashcard, compiti, documenti e impostazioni. Non si può tornare indietro. Se non hai un backup, fallo prima.',
    'Sì, cancella tutto', true);
  if (!ok) return;
  applicaDati(datiVuoti());
  await Archivio.cancella('dati');
  await salvaOra();
  applicaAspetto();
  avvisoOk('Dati cancellati');
  vaiA('home');
}

/* ------------------------------------------------------------------
   Modalità senza distrazioni
   ------------------------------------------------------------------ */

function focusAttivo() { return document.documentElement.dataset.focus === '1'; }
function cambiaFocus(attiva) {
  document.documentElement.dataset.focus = attiva ? '1' : '0';
  if (!attiva) delete document.documentElement.dataset.focus;
}
