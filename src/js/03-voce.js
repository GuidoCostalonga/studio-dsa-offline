/* ==================================================================
   03-voce.js — sintesi vocale

   Usa SOLO la voce già installata nel dispositivo (window.speechSynthesis).
   Nessun servizio online: se il dispositivo non ha voci italiane,
   l'app lo dice chiaramente invece di fingere.
   ================================================================== */

const Voce = (function () {
  const disponibile = ('speechSynthesis' in window) && typeof window.SpeechSynthesisUtterance === 'function';
  let vociCache = [];
  let coda = [];          // frasi ancora da leggere
  let indice = 0;
  let inLettura = false;
  let inPausa = false;
  let cb = {};            // callback della lettura in corso

  function aggiornaVoci() {
    if (!disponibile) return [];
    try { vociCache = window.speechSynthesis.getVoices() || []; } catch (e) { vociCache = []; }
    return vociCache;
  }
  if (disponibile) {
    aggiornaVoci();
    try { window.speechSynthesis.onvoiceschanged = aggiornaVoci; } catch (e) { /* niente */ }
  }

  function voci() { if (!vociCache.length) aggiornaVoci(); return vociCache; }
  function vociItaliane() { return voci().filter((v) => /^it/i.test(v.lang || '')); }

  function voceScelta() {
    const nome = Stato.impostazioni.voce;
    const tutte = voci();
    if (nome) {
      const v = tutte.find((x) => x.name === nome);
      if (v) return v;
    }
    const it = vociItaliane();
    if (it.length) {
      // preferisco una voce locale (funziona anche senza rete)
      return it.find((v) => v.localService) || it[0];
    }
    return null;
  }

  /** true se esiste almeno una voce italiana installata nel dispositivo. */
  function haItaliano() { return vociItaliane().length > 0; }

  function fermaTutto() {
    if (!disponibile) return;
    coda = []; indice = 0; inLettura = false; inPausa = false;
    try { window.speechSynthesis.cancel(); } catch (e) { /* niente */ }
    if (cb.onFine) { const f = cb.onFine; cb = {}; try { f(true); } catch (e) { /* niente */ } }
    cb = {};
  }

  /**
   * Legge un testo dividendolo in frasi (così si può evidenziare quella corrente
   * e la pausa funziona bene su tutti i sistemi).
   * opzioni: { onFrase(indice, frase), onFine(interrotto), velocita, lang }
   */
  function parla(testo, opzioni) {
    opzioni = opzioni || {};
    if (!disponibile) {
      avvisoErrore('Questo browser non sa leggere ad alta voce. Puoi comunque usare tutte le altre funzioni.');
      return false;
    }
    const pezzi = Array.isArray(testo) ? testo.slice() : dividiInFrasi(String(testo || ''));
    if (!pezzi.length) { toast('Non c\'è testo da leggere.'); return false; }

    fermaTutto();
    coda = pezzi; indice = 0; inLettura = true; inPausa = false; cb = opzioni;

    if (!haItaliano()) {
      toast('Nel dispositivo non trovo una voce italiana: proverò con la voce predefinita.');
    }
    prossima();
    return true;
  }

  function prossima() {
    if (!inLettura || indice >= coda.length) {
      const finito = inLettura;
      inLettura = false;
      if (finito && cb.onFine) { const f = cb.onFine; cb = {}; f(false); }
      return;
    }
    const frase = coda[indice];
    const u = new SpeechSynthesisUtterance(frase);
    const v = voceScelta();
    if (v) u.voice = v;
    u.lang = cb.lang || (v ? v.lang : 'it-IT');
    u.rate = limita(Number(cb.velocita || Stato.impostazioni.velocita || 1), 0.5, 2);
    u.pitch = limita(Number(Stato.impostazioni.tono || 1), 0.5, 1.6);
    u.onstart = () => { if (cb.onFrase) cb.onFrase(indice, frase); };
    u.onend = () => { if (!inLettura) return; indice++; prossima(); };
    u.onerror = () => { if (!inLettura) return; indice++; prossima(); };
    try { window.speechSynthesis.speak(u); }
    catch (e) { avvisoErrore('La lettura ad alta voce non è partita. Prova a toccare di nuovo il pulsante.'); inLettura = false; }
  }

  function pausa() {
    if (!disponibile || !inLettura) return;
    try { window.speechSynthesis.pause(); inPausa = true; } catch (e) { /* niente */ }
  }
  function riprendi() {
    if (!disponibile) return;
    try { window.speechSynthesis.resume(); inPausa = false; } catch (e) { /* niente */ }
  }
  function stato() { return { inLettura, inPausa, indice, totale: coda.length }; }

  return { disponibile, voci, vociItaliane, haItaliano, parla, pausa, riprendi, ferma: fermaTutto, stato, aggiornaVoci, voceScelta };
})();

function fermaLettura() { if (Voce.disponibile) Voce.ferma(); }

/* ------------------------------------------------------------------
   Divisione del testo in frasi (serve alla lettura e alla modalità
   "una frase alla volta")
   ------------------------------------------------------------------ */

const ABBREVIAZIONI = ['ecc', 'prof', 'dott', 'sig', 'sig.ra', 'pag', 'pagg', 'art', 'n', 'nr',
  'es', 'cfr', 'av', 'a.C', 'd.C', 'ca', 'vol', 'fig', 'tab', 'ing', 'avv', 'geom'];

function dividiInFrasi(testo) {
  const t = String(testo || '').replace(/\r\n?/g, '\n');
  if (!t.trim()) return [];
  const frasi = [];
  let corrente = '';
  for (let i = 0; i < t.length; i++) {
    const ch = t[i];
    corrente += ch;
    if (ch === '.' || ch === '!' || ch === '?' || ch === '…' || ch === ':' || ch === ';') {
      const dopo = t[i + 1] || ' ';
      const prima = t[i - 1] || '';
      // numeri come 3.14 o 12:30 non chiudono la frase
      if (/[0-9]/.test(prima) && /[0-9]/.test(dopo)) continue;
      // abbreviazioni note
      const ultimaParola = (corrente.match(/([A-Za-zÀ-ÿ.]+)\.$/) || [])[1];
      if (ultimaParola && ABBREVIAZIONI.indexOf(ultimaParola.replace(/\.$/, '').toLowerCase()) >= 0) continue;
      if (/\s|\n|$/.test(dopo) || dopo === '"' || dopo === '»') {
        // salto eventuali virgolette di chiusura
        while (i + 1 < t.length && /["»')\]]/.test(t[i + 1])) { corrente += t[++i]; }
        if (corrente.trim()) frasi.push(corrente.trim());
        corrente = '';
      }
    } else if (ch === '\n' && corrente.trim().length > 0) {
      const dopo = t[i + 1] || '';
      if (dopo === '\n') { frasi.push(corrente.trim()); corrente = ''; }
    }
  }
  if (corrente.trim()) frasi.push(corrente.trim());
  return frasi.filter((f) => f.length > 0);
}

function dividiInParole(testo) {
  return String(testo || '').split(/\s+/).filter(Boolean);
}

/* ------------------------------------------------------------------
   Barra dei comandi di lettura, riutilizzabile in tutte le sezioni
   ------------------------------------------------------------------ */

/**
 * Crea la barra ▶ ⏸ ⏹ + velocità.
 * prendiTesto() deve restituire il testo (stringa o array di frasi) da leggere.
 */
function barraLettura(prendiTesto, opzioni) {
  opzioni = opzioni || {};
  const box = document.createElement('div');
  box.className = 'barra-btn';
  if (!Voce.disponibile) {
    box.innerHTML = `<div class="avviso avviso-att" style="margin:0">
        <span class="ic" aria-hidden="true">🔇</span>
        <p>Questo browser non può leggere ad alta voce. Tutto il resto funziona lo stesso.</p></div>`;
    return box;
  }
  box.innerHTML = `
    <button type="button" class="btn btn-primario btn-grande" data-v="play"><span aria-hidden="true">🔊</span><span>Ascolta</span></button>
    <button type="button" class="btn" data-v="pausa"><span aria-hidden="true">⏸</span><span>Pausa</span></button>
    <button type="button" class="btn" data-v="stop"><span aria-hidden="true">⏹</span><span>Ferma</span></button>
    <label class="btn" style="gap:10px">
      <span aria-hidden="true">🐢</span>
      <input type="range" min="0.5" max="1.6" step="0.05" value="${Stato.impostazioni.velocita}"
             aria-label="Velocità della voce" style="width:110px">
      <span aria-hidden="true">🐇</span>
    </label>`;

  const bPausa = $('[data-v="pausa"]', box);
  bPausa.disabled = true;

  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    if (b.dataset.v === 'play') {
      const testo = prendiTesto();
      const ok = Voce.parla(testo, {
        onFrase: opzioni.onFrase,
        onFine: (interrotto) => { bPausa.disabled = true; bPausa.querySelector('span:last-child').textContent = 'Pausa'; if (opzioni.onFine) opzioni.onFine(interrotto); }
      });
      if (ok) { bPausa.disabled = false; }
    } else if (b.dataset.v === 'pausa') {
      const s = Voce.stato();
      if (s.inPausa) { Voce.riprendi(); b.querySelector('span:last-child').textContent = 'Pausa'; }
      else { Voce.pausa(); b.querySelector('span:last-child').textContent = 'Riprendi'; }
    } else {
      Voce.ferma();
      bPausa.disabled = true;
      if (opzioni.onFine) opzioni.onFine(true);
    }
  });
  const range = $('input[type="range"]', box);
  range.addEventListener('input', () => {
    Stato.impostazioni.velocita = Number(range.value);
    salva();
  });
  return box;
}

/** Selettore della voce, usato nelle impostazioni. */
function disegnaSceltaVoce(box) {
  if (!box) return;
  if (!Voce.disponibile) {
    box.innerHTML = `<div class="avviso avviso-att"><span class="ic" aria-hidden="true">🔇</span>
      <p>Questo browser non ha la lettura ad alta voce. Su iPhone e iPad funziona con Safari,
      su Windows e Android con Chrome o Edge.</p></div>`;
    return;
  }
  const it = Voce.vociItaliane();
  const tutte = Voce.voci();
  const elenco = (it.length ? it : tutte);

  box.innerHTML = `
    ${it.length ? '' : `<div class="avviso avviso-att"><span class="ic" aria-hidden="true">⚠️</span>
      <p>Non trovo una voce italiana installata su questo dispositivo. La lettura funzionerà male.
      Puoi aggiungere una voce italiana dalle impostazioni del dispositivo (Accessibilità → Contenuto pronunciato).</p></div>`}
    <label class="etichetta" for="selVoce">Voce</label>
    <select class="campo" id="selVoce">
      <option value="">Voce automatica del dispositivo</option>
      ${elenco.map((v) => `<option value="${esc(v.name)}"${v.name === Stato.impostazioni.voce ? ' selected' : ''}>${esc(v.name)} (${esc(v.lang)})${v.localService ? '' : ' — non locale'}</option>`).join('')}
    </select>
    <div class="slider-riga" style="margin-top:12px">
      <label for="rgVel">Velocità</label><output id="outVel">${Number(Stato.impostazioni.velocita).toFixed(2)}</output>
      <input type="range" id="rgVel" min="0.5" max="1.6" step="0.05" value="${Stato.impostazioni.velocita}">
    </div>
    <div class="barra-btn">
      <button type="button" class="btn btn-primario" id="btnProva"><span aria-hidden="true">🔊</span><span>Prova la voce</span></button>
    </div>
    <p class="aiutino">Le voci arrivano dal dispositivo, non da Internet. Se una voce è segnata come "non locale" potrebbe non funzionare in modalità aereo.</p>`;

  $('#selVoce', box).addEventListener('change', (e) => {
    Stato.impostazioni.voce = e.target.value; salva();
  });
  const rg = $('#rgVel', box);
  rg.addEventListener('input', () => {
    Stato.impostazioni.velocita = Number(rg.value);
    $('#outVel', box).textContent = Number(rg.value).toFixed(2);
    salva();
  });
  $('#btnProva', box).addEventListener('click', () => {
    Voce.parla('Ciao! Se mi senti bene, la voce funziona. Puoi cambiare la velocità con il cursore.');
  });
}
