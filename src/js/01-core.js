/* ==================================================================
   STUDIO DSA OFFLINE
   01-core.js — fondamenta: utilità, salvataggio locale, avvisi, modali

   Tutto quello che c'è qui dentro funziona senza Internet.
   Nessuna richiesta di rete viene mai effettuata dall'applicazione.
   ================================================================== */

'use strict';

const APP = {
  nome: 'Studio DSA',
  versione: '1.0',
  chiaveDati: 'studio_dsa_dati_v1',   // localStorage di riserva
  dbNome: 'studio-dsa',
  dbStore: 'dati'
};

/* ------------------------------------------------------------------
   Utilità di base
   ------------------------------------------------------------------ */

const $  = (sel, ctx) => (ctx || document).querySelector(sel);
const $$ = (sel, ctx) => Array.from((ctx || document).querySelectorAll(sel));

/** Rende sicuro qualsiasi testo dell'utente prima di inserirlo nella pagina. */
function esc(v) {
  return String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

/** Identificatore semplice e unico (senza librerie). */
function uid(prefisso) {
  return (prefisso || 'id') + '-' + Date.now().toString(36) + '-' +
    Math.random().toString(36).slice(2, 8);
}

function oraISO() { return new Date().toISOString(); }
function oggiISO() {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}
function giorniDaOggi(n) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

const MESI = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno',
  'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const GIORNI = ['domenica', 'lunedì', 'martedì', 'mercoledì', 'giovedì', 'venerdì', 'sabato'];

/** "2026-08-16" → "domenica 16 agosto" */
function dataInParole(iso) {
  if (!iso) return '';
  const p = String(iso).slice(0, 10).split('-');
  if (p.length !== 3) return iso;
  const d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  if (isNaN(d.getTime())) return iso;
  return GIORNI[d.getDay()] + ' ' + d.getDate() + ' ' + MESI[d.getMonth()];
}

/** "2026-08-16T17:32:11.000Z" → "oggi 17:32" / "ieri 19:42" / "12 agosto 19:42" */
function quandoInParole(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const ore = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  const g = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const o = new Date();
  const oggi = new Date(o.getFullYear(), o.getMonth(), o.getDate());
  const diff = Math.round((oggi - g) / 86400000);
  if (diff === 0) return 'oggi ' + ore;
  if (diff === 1) return 'ieri ' + ore;
  return d.getDate() + ' ' + MESI[d.getMonth()] + ' ' + ore;
}

function debounce(fn, ms) {
  let t = null;
  return function () {
    const args = arguments, self = this;
    clearTimeout(t);
    t = setTimeout(() => fn.apply(self, args), ms);
  };
}

function limita(v, min, max) { return Math.min(max, Math.max(min, v)); }

/** Taglia un testo lungo mettendo i puntini. */
function accorcia(t, n) {
  t = String(t || '').replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
}

/** Scarica un file creato in locale (nessun server coinvolto). */
function scaricaFile(nomeFile, contenuto, tipo) {
  try {
    const blob = (contenuto instanceof Blob) ? contenuto : new Blob([contenuto], { type: tipo || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = nomeFile;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1500);
    return true;
  } catch (e) {
    avvisoErrore('Non sono riuscito a preparare il file da salvare. Prova a usare un altro browser.');
    return false;
  }
}

/** Legge un file scelto dall'utente. Restituisce una Promise con il testo. */
function leggiFileTesto(file) {
  return new Promise((risolvi, rifiuta) => {
    const r = new FileReader();
    r.onload = () => risolvi(String(r.result || ''));
    r.onerror = () => rifiuta(new Error('lettura'));
    r.readAsText(file, 'utf-8');
  });
}

/**
 * Legge un'immagine scelta dall'utente e la rimpicciolisce.
 * Restituisce una data URL: l'immagine resta dentro i dati dell'app,
 * sul dispositivo, senza file esterni da tenere insieme.
 */
function immagineRidotta(file, latoMax) {
  return new Promise((risolvi, rifiuta) => {
    if (!file || !/^image\//.test(file.type || '')) { rifiuta(new Error('tipo')); return; }
    const lettore = new FileReader();
    lettore.onerror = () => rifiuta(new Error('lettura'));
    lettore.onload = () => {
      const img = new Image();
      img.onload = () => {
        const lato = latoMax || 420;
        const scala = Math.min(1, lato / Math.max(img.width || 1, img.height || 1));
        const l = Math.max(1, Math.round((img.width || 1) * scala));
        const a = Math.max(1, Math.round((img.height || 1) * scala));
        try {
          const cv = document.createElement('canvas');
          cv.width = l; cv.height = a;
          const g = cv.getContext('2d');
          g.fillStyle = '#ffffff';           // le trasparenze diventerebbero nere in JPEG
          g.fillRect(0, 0, l, a);
          g.drawImage(img, 0, 0, l, a);
          risolvi(cv.toDataURL('image/jpeg', 0.82));
        } catch (e) { rifiuta(new Error('conversione')); }
      };
      img.onerror = () => rifiuta(new Error('immagine'));
      img.src = String(lettore.result);
    };
    lettore.readAsDataURL(file);
  });
}

/** Accetta solo immagini incorporate: mai un indirizzo esterno. */
function immagineSicura(dato) {
  const s = String(dato || '');
  return /^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(s.replace(/\s/g, '')) ? s : '';
}

/** Apre il selettore di file del dispositivo. */
function scegliFile(accetta) {
  return new Promise((risolvi) => {
    const inp = document.createElement('input');
    inp.type = 'file';
    if (accetta) inp.accept = accetta;
    inp.style.position = 'fixed';
    inp.style.left = '-9999px';
    document.body.appendChild(inp);
    inp.addEventListener('change', () => {
      const f = inp.files && inp.files[0] ? inp.files[0] : null;
      inp.remove();
      risolvi(f);
    });
    inp.click();
  });
}

/* ------------------------------------------------------------------
   Avvisi (toast) e finestre di dialogo
   ------------------------------------------------------------------ */

let _toastTimer = null;
function toast(messaggio, tipo) {
  const box = $('#toast');
  if (!box) return;
  box.textContent = messaggio;
  box.style.borderColor = tipo === 'errore' ? 'var(--errore)' :
                          tipo === 'ok' ? 'var(--ok)' : 'var(--primario)';
  box.classList.add('mostra');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => box.classList.remove('mostra'), tipo === 'errore' ? 5200 : 2600);
}

function avvisoErrore(messaggio) { toast('⚠️ ' + messaggio, 'errore'); }
function avvisoOk(messaggio) { toast('✓ ' + messaggio, 'ok'); }

/**
 * Finestra modale generica.
 * campi: [{nome, etichetta, tipo:'testo'|'area'|'numero'|'data'|'scelta', valore, opzioni, aiuto}]
 * Restituisce una Promise: oggetto con i valori, oppure null se annullata.
 */
function finestra(opz) {
  return new Promise((risolvi) => {
    const box = $('#modale');
    const campi = opz.campi || [];
    const attivoPrima = document.activeElement;

    const htmlCampi = campi.map((c, i) => {
      const id = 'campo-' + i;
      const val = c.valore == null ? '' : c.valore;
      let controllo;
      if (c.tipo === 'area') {
        controllo = `<textarea class="area" id="${id}" rows="${c.righe || 4}" spellcheck="true">${esc(val)}</textarea>`;
      } else if (c.tipo === 'scelta') {
        controllo = `<select class="campo" id="${id}">` +
          (c.opzioni || []).map((o) => {
            const v = typeof o === 'string' ? o : o.v;
            const t = typeof o === 'string' ? o : o.t;
            return `<option value="${esc(v)}"${String(v) === String(val) ? ' selected' : ''}>${esc(t)}</option>`;
          }).join('') + '</select>';
      } else if (c.tipo === 'checkbox') {
        controllo = `<label class="check"><input type="checkbox" id="${id}"${val ? ' checked' : ''}> <span>${esc(c.testoCheck || '')}</span></label>`;
      } else {
        const t = c.tipo === 'numero' ? 'number' : c.tipo === 'data' ? 'date' : 'text';
        controllo = `<input class="campo" type="${t}" id="${id}" value="${esc(val)}" spellcheck="true">`;
      }
      return `<div class="campo-blocco">
          ${c.tipo === 'checkbox' ? '' : `<label class="etichetta" for="${id}">${esc(c.etichetta)}</label>`}
          ${controllo}
          ${c.aiuto ? `<p class="aiutino">${esc(c.aiuto)}</p>` : ''}
        </div>`;
    }).join('');

    box.innerHTML = `<div class="modale-box" role="dialog" aria-modal="true" aria-labelledby="modale-titolo">
        <h2 id="modale-titolo">${esc(opz.titolo || '')}</h2>
        ${opz.testo ? `<p>${esc(opz.testo)}</p>` : ''}
        ${htmlCampi}
        <div class="modale-azioni">
          <button type="button" class="btn" data-m="annulla">${esc(opz.testoAnnulla || 'Annulla')}</button>
          <button type="button" class="btn ${opz.pericolo ? 'btn-errore' : 'btn-primario'}" data-m="ok">${esc(opz.testoOk || 'Va bene')}</button>
        </div>
      </div>`;
    box.hidden = false;

    function chiudi(risultato) {
      box.hidden = true;
      box.innerHTML = '';
      box.onclick = null;
      document.removeEventListener('keydown', tasti, true);
      if (attivoPrima && attivoPrima.focus) { try { attivoPrima.focus(); } catch (e) { /* niente */ } }
      risolvi(risultato);
    }
    function conferma() {
      const out = {};
      campi.forEach((c, i) => {
        const n = $('#campo-' + i, box);
        out[c.nome] = c.tipo === 'checkbox' ? !!n.checked : n.value;
      });
      chiudi(campi.length ? out : {});
    }
    function tasti(e) {
      if (e.key === 'Escape') { e.preventDefault(); chiudi(null); }
      if (e.key === 'Tab') {
        const f = $$('button, input, textarea, select, a[href]', box).filter((x) => !x.disabled);
        if (!f.length) return;
        const primo = f[0], ultimo = f[f.length - 1];
        if (e.shiftKey && document.activeElement === primo) { e.preventDefault(); ultimo.focus(); }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primo.focus(); }
      }
      if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && e.target.closest('.modale-box')) {
        e.preventDefault(); conferma();
      }
    }
    // IMPORTANTE: onclick (uno solo), non addEventListener.
    // Con addEventListener ogni finestra lasciava attaccato il proprio
    // ascoltatore: dalla seconda in poi quello vecchio svuotava la finestra
    // un istante prima che quello nuovo leggesse i campi, e il pulsante
    // "Va bene" non faceva più niente. (Bug trovato dopo la consegna.)
    box.onclick = (e) => {
      const b = e.target.closest('[data-m]');
      if (!b) return;
      if (b.dataset.m === 'ok') conferma(); else chiudi(null);
    };
    document.addEventListener('keydown', tasti, true);
    const primo = $('input, textarea, select, button', box);
    if (primo) primo.focus();
  });
}

/** Domanda sì / no. */
async function conferma(titolo, testo, testoOk, pericolo) {
  const r = await finestra({ titolo, testo, testoOk: testoOk || 'Sì, vai', testoAnnulla: 'No, annulla', pericolo: !!pericolo });
  return r !== null;
}

/** Chiede un solo valore. */
async function chiediTesto(titolo, etichetta, valore, tipo) {
  const r = await finestra({ titolo, campi: [{ nome: 'v', etichetta, valore, tipo: tipo || 'testo' }] });
  return r ? r.v : null;
}

/* ------------------------------------------------------------------
   Salvataggio locale: IndexedDB con riserva su localStorage
   ------------------------------------------------------------------ */

const Archivio = (function () {
  let db = null;
  let usaIDB = true;

  function apri() {
    return new Promise((risolvi) => {
      if (!('indexedDB' in window)) { usaIDB = false; return risolvi(false); }
      let req;
      try { req = indexedDB.open(APP.dbNome, 1); }
      catch (e) { usaIDB = false; return risolvi(false); }
      req.onupgradeneeded = () => {
        const d = req.result;
        if (!d.objectStoreNames.contains(APP.dbStore)) d.createObjectStore(APP.dbStore);
      };
      req.onsuccess = () => { db = req.result; risolvi(true); };
      req.onerror = () => { usaIDB = false; risolvi(false); };
      // Se il browser blocca IndexedDB (per esempio in navigazione privata su iOS)
      setTimeout(() => { if (!db) { usaIDB = false; risolvi(false); } }, 2500);
    });
  }

  function leggi(chiave) {
    return new Promise((risolvi) => {
      if (usaIDB && db) {
        try {
          const tx = db.transaction(APP.dbStore, 'readonly');
          const req = tx.objectStore(APP.dbStore).get(chiave);
          req.onsuccess = () => risolvi(req.result === undefined ? null : req.result);
          req.onerror = () => risolvi(leggiLocale(chiave));
          return;
        } catch (e) { /* passo alla riserva */ }
      }
      risolvi(leggiLocale(chiave));
    });
  }

  function scrivi(chiave, valore) {
    return new Promise((risolvi, rifiuta) => {
      if (usaIDB && db) {
        try {
          const tx = db.transaction(APP.dbStore, 'readwrite');
          tx.objectStore(APP.dbStore).put(valore, chiave);
          tx.oncomplete = () => risolvi(true);
          tx.onerror = () => {
            if (scriviLocale(chiave, valore)) risolvi(true);
            else rifiuta(new Error('spazio'));
          };
          return;
        } catch (e) { /* passo alla riserva */ }
      }
      if (scriviLocale(chiave, valore)) risolvi(true); else rifiuta(new Error('spazio'));
    });
  }

  function cancella(chiave) {
    return new Promise((risolvi) => {
      try { localStorage.removeItem(APP.chiaveDati + ':' + chiave); } catch (e) { /* niente */ }
      if (usaIDB && db) {
        try {
          const tx = db.transaction(APP.dbStore, 'readwrite');
          tx.objectStore(APP.dbStore).delete(chiave);
          tx.oncomplete = () => risolvi(true);
          tx.onerror = () => risolvi(false);
          return;
        } catch (e) { /* niente */ }
      }
      risolvi(true);
    });
  }

  function leggiLocale(chiave) {
    try {
      const s = localStorage.getItem(APP.chiaveDati + ':' + chiave);
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  }
  function scriviLocale(chiave, valore) {
    try {
      localStorage.setItem(APP.chiaveDati + ':' + chiave, JSON.stringify(valore));
      return true;
    } catch (e) { return false; }
  }

  return {
    apri, leggi, scrivi, cancella,
    conIDB: () => usaIDB && !!db
  };
})();

/* ------------------------------------------------------------------
   Stato dell'applicazione (tutti i dati dell'utente)
   ------------------------------------------------------------------ */

/** Struttura vuota di partenza: serve anche come riferimento per i backup. */
function datiVuoti() {
  return {
    versione: 1,
    profilo: { nome: '', classe: '', materie: null },
    impostazioni: {
      tema: 'chiara',
      font: 'sistema',
      testoUI: '2',
      onboardingFatto: false,
      // lettura
      dimensione: 20, interlinea: 1.8, lettere: 0.02, parole: 0.16,
      larghezza: 42, sfondoLettura: 'bianco', spaziaturaSillabe: false,
      // sintesi vocale
      voce: '', velocita: 0.95, tono: 1,
      // righello
      righelloRighe: 3,
      // timer
      timerStudio: 20, timerPausa: 5,
      // varie
      checklistVisibile: true
    },
    testi: [],          // testi salvati nella sezione LEGGI
    documenti: [],      // documenti dell'editor di scrittura
    appunti: [],
    flashcard: [],
    compiti: [],
    formule: [],
    mappe: [],
    vocabolario: [],
    paroleDifficili: [],
    inglese: [],
    quaderno: [],       // quaderno di matematica
    erroriMate: [],     // "i miei errori"
    libri: [],          // PDF conosciuti (senza i byte del file)
    evidenziazioni: [],
    notePdf: [],
    segnalibri: [],
    esercizi: [],       // testi degli esercizi portati in matematica
    lavoroEquazione: null   // il quaderno "Lo risolvo io" ancora aperto
  };
}

const Stato = datiVuoti();

/** Fonde i dati letti dal dispositivo dentro lo stato, senza perdere i campi nuovi. */
function applicaDati(letti) {
  if (!letti || typeof letti !== 'object') return;
  const vuoto = datiVuoti();
  Object.keys(vuoto).forEach((k) => {
    if (k === 'impostazioni' || k === 'profilo') {
      Stato[k] = Object.assign({}, vuoto[k], letti[k] && typeof letti[k] === 'object' ? letti[k] : {});
    } else if (Array.isArray(vuoto[k])) {
      Stato[k] = Array.isArray(letti[k]) ? letti[k] : [];
    } else {
      Stato[k] = letti[k] !== undefined ? letti[k] : vuoto[k];
    }
  });
}

let _salvataggioInCorso = false;
const salvaOra = async function () {
  if (_salvataggioInCorso) return;
  _salvataggioInCorso = true;
  try {
    await Archivio.scrivi('dati', JSON.parse(JSON.stringify(Stato)));
    segnalaSalvato();
  } catch (e) {
    avvisoErrore('Non c\'è abbastanza spazio sul dispositivo per salvare. Prova a eliminare qualche materiale vecchio o a fare un backup.');
  } finally {
    _salvataggioInCorso = false;
  }
};

const salva = debounce(salvaOra, 350);

/** Mostra discretamente "✓ Salvato" dove previsto. */
function segnalaSalvato() {
  $$('.salvato').forEach((n) => {
    n.textContent = '✓ Salvato';
    n.classList.add('mostra');
    clearTimeout(n._t);
    n._t = setTimeout(() => n.classList.remove('mostra'), 1800);
  });
}

/* ------------------------------------------------------------------
   Materie
   ------------------------------------------------------------------ */

const MATERIE_INIZIALI = ['Italiano', 'Matematica', 'Inglese', 'Storia', 'Geografia',
  'Scienze', 'Tecnologia', 'Arte', 'Musica', 'Educazione civica', 'Altra'];

function materie() {
  const m = Stato.profilo.materie;
  return (Array.isArray(m) && m.length) ? m : MATERIE_INIZIALI;
}

function opzioniMaterie(scelta) {
  return materie().map((m) =>
    `<option value="${esc(m)}"${m === scelta ? ' selected' : ''}>${esc(m)}</option>`).join('');
}

/* ------------------------------------------------------------------
   Piccoli aiuti per costruire l'interfaccia
   ------------------------------------------------------------------ */

/** Intestazione standard di una sezione, con pulsante Home sempre disponibile. */
function testaSezione(icona, titolo, sottotitolo, azioniHtml) {
  return `<div class="sezione-testa">
      <h1><span aria-hidden="true">${icona}</span> ${esc(titolo)}</h1>
      <div class="spinta">${azioniHtml || ''}</div>
    </div>
    ${sottotitolo ? `<p class="sezione-sub">${esc(sottotitolo)}</p>` : ''}`;
}

function schedaVuota(icona, testo, suggerimento) {
  return `<div class="vuoto"><span class="ic" aria-hidden="true">${icona}</span>
      <p><b>${esc(testo)}</b></p>${suggerimento ? `<p>${esc(suggerimento)}</p>` : ''}</div>`;
}

/** Pulsante con icona + testo. */
function bottone(azione, icona, testo, classe, extra) {
  return `<button type="button" class="btn ${classe || ''}" data-az="${esc(azione)}" ${extra || ''}>` +
    (icona ? `<span aria-hidden="true">${icona}</span>` : '') + `<span>${esc(testo)}</span></button>`;
}

/* ------------------------------------------------------------------
   Gestione degli errori: mai codici tecnici sullo schermo
   ------------------------------------------------------------------ */

window.addEventListener('error', function (e) {
  if (e && e.message && /ResizeObserver/.test(e.message)) return;
  console.error('[Studio DSA]', e.error || e.message);
  toast('⚠️ Qualcosa non ha funzionato in questa funzione. Prova a tornare alla Home e riaprirla.', 'errore');
});
window.addEventListener('unhandledrejection', function (e) {
  console.error('[Studio DSA]', e.reason);
});
