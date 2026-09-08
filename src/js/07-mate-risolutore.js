/* ==================================================================
   07-mate-risolutore.js — risoluzioni passo passo con spiegazione

   Ogni risultato ha:
     stato:   'verde'  posso risolverlo,
              'giallo' posso aiutarti solo in parte,
              'rosso'  non posso farlo in modo affidabile offline.
     passi:   [{ tit, html, spiega, perche }]
   Non viene mai inventato un passaggio: se il motore non sa
   giustificare una trasformazione, lo dichiara.
   ================================================================== */

const Risolutore = (function () {

  const F = M.fr;
  /** Frazione scritta per gli occhi (con il vero segno meno). */
  function nt(f) { return M.fTesto(f).replace(/-/g, '−'); }

  function passo(tit, html, spiega, perche) {
    return { tit, html, spiega: spiega || '', perche: perche || '' };
  }

  /* ---- come si scrive un passaggio -------------------------------
     Regole tenute per tutta la sezione:
     - l'equazione sta su UNA riga sola, con il segno = al suo posto;
     - il pezzo che cambia in questo passaggio è evidenziato;
     - prima si scrive l'operazione (22 − 7), poi si fa il conto (15).
       Chi fa fatica deve poter vedere DOVE è finito ogni numero.
     ---------------------------------------------------------------- */

  /** Un'equazione su una riga sola. */
  function eqHtml(sinistra, destra, segno) {
    return '<div class="mate mate-blocco">' + sinistra +
      '<span class="uguale">' + (segno || '=') + '</span>' + destra + '</div>';
  }
  /** Mette in risalto il pezzo che cambia (non solo col colore:
      c'è anche il bordo e la sottolineatura). */
  function evid(html) { return '<mark>' + html + '</mark>'; }

  /** Un membro scritto per intero: "3x − 27", "22", "x". */
  function latoHtml(cx, c0, v) {
    let s = '';
    if (!M.fZero(cx)) s += coefVar(cx, v, true);
    if (!M.fZero(c0) || !s) {
      if (!s) s = M.html(M.nNum(c0));
      else {
        const neg = M.fNum(c0) < 0;
        s += '<span class="operatore">' + (neg ? '−' : '+') + '</span>' +
          M.html(M.nNum(neg ? M.fNeg(c0) : c0));
      }
    }
    return s;
  }

  /** L'operazione che aggiungo ai due membri: "− 7", "+ 3x". */
  function operazioneHtml(f, v) {
    const neg = M.fNum(f) < 0;
    const ass = neg ? M.fNeg(f) : f;
    const corpo = v
      ? (M.fUno(ass) ? '<i>' + v + '</i>' : M.html(M.nNum(ass)) + '<i>' + v + '</i>')
      : M.html(M.nNum(ass));
    return '<span class="operatore">' + (neg ? '−' : '+') + '</span>' + corpo;
  }

  /** La stessa operazione detta a parole, con la preposizione giusta:
      "Tolgo 7 da tutte e due le parti" / "Aggiungo 27 a tutte e due le parti". */
  function testoOperazione(f, v) {
    const neg = M.fNum(f) < 0;
    const ass = neg ? M.fNeg(f) : f;
    return (neg ? 'Tolgo ' : 'Aggiungo ') + nt(ass) + (v || '') +
      (neg ? ' da tutte e due le parti' : ' a tutte e due le parti');
  }

  /** Una divisione scritta come frazione: serve per "3x ÷ 3". */
  function frazioneHtml(sopra, sotto) {
    return '<span class="frazione"><span class="sopra">' + sopra +
      '</span><span class="sotto">' + sotto + '</span></span>';
  }
  function esito(stato, messaggio, passi, extra) {
    return Object.assign({ stato, messaggio: messaggio || '', passi: passi || [] }, extra || {});
  }

  /** Divide "3x+7 = 22" in due parti. */
  function dividiUguale(str) {
    const t = M.normalizzaTesto(str);
    const pezzi = t.split('=');
    if (pezzi.length === 1) return { sx: pezzi[0], dx: '0', aveva: false };
    if (pezzi.length !== 2) throw M.errore('In un\'equazione ci va un solo segno "=".');
    return { sx: pezzi[0], dx: pezzi[1], aveva: true };
  }

  /** Trova la lettera dell'incognita. */
  function incognita(P, preferita) {
    const v = M.polVariabili(P);
    if (!v.length) return preferita || 'x';
    if (v.indexOf(preferita || 'x') >= 0) return preferita || 'x';
    return v[0];
  }

  /* ================================================================
     EQUAZIONI
     ================================================================ */

  function risolviEquazione(str, variabile) {
    let parti;
    try { parti = dividiUguale(str); } catch (e) { return esito('rosso', e.message); }
    if (!parti.aveva) return esito('rosso', 'Per risolvere un\'equazione serve il segno "=". Per esempio: 3x + 7 = 22');

    let sx, dx;
    try { sx = M.analizza(parti.sx); dx = M.analizza(parti.dx); }
    catch (e) { return esito('rosso', e.amichevole ? e.message : 'Non riesco a leggere questa equazione.'); }

    const rs = M.ratDaAst(sx), rd = M.ratDaAst(dx);
    if (!rs || !rd) {
      return esito('rosso', 'Questa equazione contiene funzioni (seno, logaritmo, radice…) che non so risolvere passo passo senza rischiare di sbagliare. Posso però disegnarti il grafico e trovare le soluzioni approssimate con il graficatore.');
    }

    const denominatoriConIncognita =
      !M.polCostante(rs.d) || !M.polCostante(rd.d);

    // porto tutto a sinistra:  (Ns*Dd - Nd*Ds) / (Ds*Dd) = 0
    const N = M.polSottrai(M.polProdotto(rs.n, rd.d), M.polProdotto(rd.n, rs.d));
    const D = M.polProdotto(rs.d, rd.d);
    const v = incognita(M.polSomma(N, D), variabile);

    const cN = M.polCoeffNum(N, v);
    if (!cN) {
      return esito('giallo', 'In questa equazione c\'è più di una lettera: dimmi quale è l\'incognita oppure usa una sola lettera.',
        [passo('L\'equazione', eqHtml(M.html(M.polAAst(N)), '0'), 'Questa è l\'equazione con tutto portato a sinistra.')]);
    }

    const passi = [];
    passi.push(passo('Partiamo da', eqHtml(M.html(sx), M.html(dx)),
      'Questa è l\'equazione da risolvere.'));

    let condizioni = [];
    if (denominatoriConIncognita) {
      const cD = M.polCoeffNum(D, v);
      const rad = cD ? M.radiciRazionali(cD) : [];
      condizioni = rad;
      passi.push(passo('Condizioni di esistenza',
        eqHtml(M.html(M.polAAst(D)), '0', '≠') +
        (rad.length ? eqHtml('<i>' + v + '</i>', rad.map((r) => nt(r)).join(' &nbsp;e&nbsp; <i>' + v + '</i> ≠ '), '≠') : ''),
        'Il denominatore non può mai valere zero.',
        'Se il denominatore valesse zero la frazione non avrebbe senso: quei valori vanno esclusi anche se poi vengono fuori dai calcoli.'));
      passi.push(passo('Tolgo i denominatori',
        eqHtml(M.html(M.polAAst(N)), '0'),
        'Moltiplico i due membri per il denominatore comune.',
        'Se due frazioni con lo stesso denominatore sono uguali, allora sono uguali anche i numeratori. Alla fine controllerò le condizioni di esistenza.'));
    }

    // tolgo il grado zero superfluo
    let c = cN.slice();
    while (c.length > 1 && M.fZero(c[c.length - 1])) c.pop();
    const grado = c.length - 1;

    let soluzioni = [];
    let stato = 'verde';

    if (grado <= 0) {
      if (M.fZero(c[0])) {
        passi.push(passo('Risultato', '<div class="mate mate-blocco">0 = 0</div>',
          'L\'uguaglianza è sempre vera: ogni numero va bene.',
          'Quando l\'incognita sparisce e resta una cosa vera, l\'equazione è "indeterminata".'));
        return esito('verde', 'Ogni valore di ' + v + ' è soluzione.', passi, { soluzioni: 'tutte', variabile: v });
      }
      passi.push(passo('Risultato', eqHtml(M.html(M.nNum(c[0])), '0'),
        'Questa uguaglianza è falsa: non esiste nessuna soluzione.',
        'Quando l\'incognita sparisce e resta una cosa falsa, l\'equazione è "impossibile".'));
      return esito('verde', 'Nessuna soluzione.', passi, { soluzioni: [], variabile: v });
    }

    if (grado === 1) {
      passiPrimoGrado(passi, sx, dx, v, denominatoriConIncognita, c);
      soluzioni = [M.fDiv(M.fNeg(c[0]), c[1])];
    } else if (grado === 2) {
      soluzioni = passiSecondoGrado(passi, v, c);
      if (soluzioni === null) { soluzioni = []; }
    } else {
      const r = passiGradoAlto(passi, v, c);
      soluzioni = r.soluzioni;
      stato = r.stato;
    }

    // condizioni di esistenza: scarto le soluzioni non accettabili
    if (condizioni.length && Array.isArray(soluzioni)) {
      const buone = soluzioni.filter((s) => !condizioni.some((k) => M.fCmp(k, s) === 0));
      if (buone.length !== soluzioni.length) {
        passi.push(passo('Controllo le condizioni di esistenza',
          '<div class="mate mate-blocco">' + v + ' ≠ ' + condizioni.map((r) => nt(r)).join(', ') + '</div>',
          'Una soluzione trovata non è accettabile perché annulla il denominatore: la devo scartare.'));
        soluzioni = buone;
      }
    }

    if (Array.isArray(soluzioni) && soluzioni.length) {
      const controllo = verificaNumerica(sx, dx, v, soluzioni[0]);
      if (controllo) passi.push(controllo);
    }

    return esito(stato, '', passi, { soluzioni, variabile: v });
  }

  /* ---- primo grado ------------------------------------------------ */
  function passiPrimoGrado(passi, sx, dx, v, giaSpostato, c) {
    const Psx = M.polDaAst(sx), Pdx = M.polDaAst(dx);
    const cSx = Psx ? M.polCoeffNum(Psx, v) : null;
    const cDx = Pdx ? M.polCoeffNum(Pdx, v) : null;

    let ax = c[1], m0 = M.fNeg(c[0]);      // valori finali, per il caso di ripiego

    if (!giaSpostato && cSx && cDx) {
      ax = cSx[1] || M.F0;
      let n0 = cSx[0] || M.F0;             // sinistra:  ax·x + n0
      let bx = cDx[1] || M.F0;
      m0 = cDx[0] || M.F0;                 // destra:    bx·x + m0

      // 1. via le parentesi (solo se cambia qualcosa)
      if (M.testo(M.polAAst(Psx)) !== M.testo(sx) || M.testo(M.polAAst(Pdx)) !== M.testo(dx)) {
        passi.push(passo('Tolgo le parentesi',
          eqHtml(latoHtml(ax, n0, v), latoHtml(bx, m0, v)),
          'Faccio le moltiplicazioni e sommo i termini uguali.',
          'Conviene sistemare una parte alla volta, prima di spostare i pezzi da una parte all\'altra.'));
      }

      // 2. tutte le x da una parte sola
      if (!M.fZero(bx)) {
        const op = M.fNeg(bx);
        passi.push(passo(testoOperazione(op, v),
          eqHtml(latoHtml(ax, n0, v) + evid(operazioneHtml(op, v)),
                 latoHtml(bx, m0, v) + evid(operazioneHtml(op, v))),
          'Scrivo la stessa operazione a destra e a sinistra.',
          'L\'uguale è una bilancia. Se togli qualcosa da un piatto, devi toglierlo anche dall\'altro: altrimenti non sta più in equilibrio.'));
        ax = M.fAdd(ax, op);
        passi.push(passo('Faccio i conti',
          eqHtml(latoHtml(ax, n0, v), M.html(M.nNum(m0))),
          'A destra la ' + v + ' è sparita: adesso è tutta a sinistra.'));
      }

      // 3. tutti i numeri dall'altra parte
      if (!M.fZero(n0)) {
        const op = M.fNeg(n0);
        const eraGiaSuccesso = !M.fZero(bx);
        passi.push(passo(testoOperazione(op, ''),
          eqHtml(latoHtml(ax, n0, v) + evid(operazioneHtml(op, '')),
                 M.html(M.nNum(m0)) + evid(operazioneHtml(op, ''))),
          eraGiaSuccesso ? 'Di nuovo la stessa cosa da tutte e due le parti.'
                         : 'Scrivo la stessa operazione a destra e a sinistra.',
          'Così a sinistra resta soltanto la parte con la ' + v + ', e i numeri finiscono tutti a destra.'));
        m0 = M.fAdd(m0, op);
        passi.push(passo('Faccio i conti',
          eqHtml(latoHtml(ax, M.F0, v), M.html(M.nNum(m0))),
          'Adesso l\'equazione è pulita: da una parte la ' + v + ', dall\'altra un numero.'));
      }
    } else {
      passi.push(passo('Ordino l\'equazione',
        eqHtml(latoHtml(ax, M.F0, v), M.html(M.nNum(m0))),
        'Metto la parte con la ' + v + ' a sinistra e i numeri a destra.'));
    }

    // 4. divido, se serve
    const sol = M.fDiv(M.fNeg(c[0]), c[1]);
    if (!M.fUno(ax)) {
      passi.push(passo('Divido tutte e due le parti per ' + nt(ax),
        eqHtml(frazioneHtml(latoHtml(ax, M.F0, v), evid(M.html(M.nNum(ax)))),
               frazioneHtml(M.html(M.nNum(m0)), evid(M.html(M.nNum(ax))))),
        'Divido per il numero che sta davanti alla ' + v + '.',
        'Davanti alla ' + v + ' c\'è ' + nt(ax) + '. Dividendo per ' + nt(ax) + ', a sinistra resta la ' + v + ' da sola: è quello che vogliamo.'));
    }

    passi.push(passo('Risultato',
      eqHtml('<i>' + v + '</i>', M.html(M.nNum(sol)) +
        (M.fInt(sol) ? '' : ' <span style="font-size:.65em">(cioè ' + M.fDecimale(sol) + ')</span>')),
      'Ecco quanto vale la ' + v + '.'));
  }

  /* ---- secondo grado --------------------------------------------- */
  function passiSecondoGrado(passi, v, c) {
    const a = c[2], b = c[1] || M.F0, cc = c[0] || M.F0;
    const ordinata = eqHtml(M.html(M.polAAst(M.daCoeff(c, v))), '0');
    // se l'equazione è già ordinata non ripeto lo stesso passaggio due volte
    if (!passi.length || passi[passi.length - 1].html !== ordinata) {
      passi.push(passo('Porto tutto a sinistra, nella forma ordinata', ordinata,
        'Un\'equazione di secondo grado si scrive sempre così: a' + v + '² + b' + v + ' + c = 0.'));
    }
    passi.push(passo('Riconosco a, b e c',
      '<div class="mate mate-blocco">a = ' + M.html(M.nNum(a)) + ' &nbsp;&nbsp; b = ' + M.html(M.nNum(b)) + ' &nbsp;&nbsp; c = ' + M.html(M.nNum(cc)) + '</div>',
      'a è il numero davanti a ' + v + '², b quello davanti a ' + v + ', c il numero da solo.'));

    const delta = M.fSub(M.fMul(b, b), M.fMul(F(4), M.fMul(a, cc)));
    passi.push(passo('Calcolo il delta',
      '<div class="mate mate-blocco">Δ = b² − 4ac = ' + M.htmlP(M.nNum(b)) + '² − 4·' + M.htmlP(M.nNum(a)) + '·' + M.htmlP(M.nNum(cc)) + ' = ' + M.html(M.nNum(delta)) + '</div>',
      'Il delta dice quante soluzioni ci sono.',
      'Se Δ è maggiore di zero ci sono due soluzioni; se è zero ce n\'è una sola; se è minore di zero non ci sono soluzioni fra i numeri reali.'));

    const dNum = M.fNum(delta);
    if (dNum < 0) {
      passi.push(passo('Il delta è negativo',
        '<div class="mate mate-blocco">Δ = ' + M.html(M.nNum(delta)) + ' &lt; 0</div>',
        'Non ci sono soluzioni fra i numeri reali: la parabola non tocca l\'asse delle x.'));
      return [];
    }
    if (dNum === 0) {
      const s = M.fDiv(M.fNeg(b), M.fMul(F(2), a));
      passi.push(passo('Il delta è zero: una sola soluzione (doppia)',
        '<div class="mate mate-blocco"><i>' + v + '</i> = ' + M.html(M.nDiv(M.nNum(M.fNeg(b)), M.nNum(M.fMul(F(2), a)))) + ' = ' + M.html(M.nNum(s)) + '</div>',
        'Quando Δ = 0 la formula dà un unico valore.'));
      return [s];
    }

    // Δ > 0
    passi.push(passo('Applico la formula',
      '<div class="mate mate-blocco"><i>' + v + '</i><sub>1,2</sub> = ' +
      '<span class="frazione"><span class="sopra">−b ± <span class="radice"><span class="segno">√</span><span class="dentro">Δ</span></span></span><span class="sotto">2a</span></span>' +
      ' = <span class="frazione"><span class="sopra">' + M.html(M.nNum(M.fNeg(b))) + ' ± <span class="radice"><span class="segno">√</span><span class="dentro">' + M.html(M.nNum(delta)) + '</span></span></span><span class="sotto">' + M.html(M.nNum(M.fMul(F(2), a))) + '</span></span></div>',
      'Metto i numeri al posto delle lettere.'));

    // radice esatta?
    if (M.fInt(delta) && delta.n >= 0) {
      const rs = M.radiceSemplificata(delta.n);
      if (rs && rs.dentro === 1) {
        const r = F(rs.fuori);
        const s1 = M.fDiv(M.fAdd(M.fNeg(b), r), M.fMul(F(2), a));
        const s2 = M.fDiv(M.fSub(M.fNeg(b), r), M.fMul(F(2), a));
        passi.push(passo('Calcolo la radice',
          '<div class="mate mate-blocco"><span class="radice"><span class="segno">√</span><span class="dentro">' + delta.n + '</span></span> = ' + evid(String(rs.fuori)) + '</div>',
          'La radice viene un numero intero: le soluzioni sono esatte.'));
        // faccio vedere i due conti separati, senza saltare passaggi
        const den = M.fMul(F(2), a);
        const sopraPiu = M.fAdd(M.fNeg(b), r), sopraMeno = M.fSub(M.fNeg(b), r);
        passi.push(passo('Prima soluzione: quella con il +',
          eqHtml('<i>' + v + '</i><sub>1</sub>',
            frazioneHtml(M.html(M.nNum(M.fNeg(b))) + ' <span class="operatore">+</span> ' + rs.fuori, M.html(M.nNum(den))) +
            '<span class="uguale">=</span>' + frazioneHtml(M.html(M.nNum(sopraPiu)), M.html(M.nNum(den))) +
            '<span class="uguale">=</span>' + M.html(M.nNum(s1))),
          'Faccio il conto sopra, poi divido.'));
        passi.push(passo('Seconda soluzione: quella con il −',
          eqHtml('<i>' + v + '</i><sub>2</sub>',
            frazioneHtml(M.html(M.nNum(M.fNeg(b))) + ' <span class="operatore">−</span> ' + rs.fuori, M.html(M.nNum(den))) +
            '<span class="uguale">=</span>' + frazioneHtml(M.html(M.nNum(sopraMeno)), M.html(M.nNum(den))) +
            '<span class="uguale">=</span>' + M.html(M.nNum(s2))),
          'Stesso conto, ma con il meno.'));
        const ordinate = [s1, s2].sort((x, y) => M.fCmp(x, y));
        passi.push(passo('Le due soluzioni',
          eqHtml('<i>' + v + '</i>', M.html(M.nNum(ordinate[0])) + ' &nbsp;&nbsp;oppure&nbsp;&nbsp; ' + M.html(M.nNum(ordinate[1]))),
          'Un\'equazione di secondo grado può avere due soluzioni: vanno bene tutte e due.'));
        return ordinate;
      }
      if (rs && rs.fuori > 1) {
        passi.push(passo('Semplifico la radice',
          '<div class="mate mate-blocco"><span class="radice"><span class="segno">√</span><span class="dentro">' + delta.n + '</span></span> = ' + rs.fuori + '<span class="radice"><span class="segno">√</span><span class="dentro">' + rs.dentro + '</span></span></div>',
          'Porto fuori dalla radice quello che si può.'));
      }
    }
    const dRad = Math.sqrt(Math.abs(M.fNum(delta)));
    const s1 = (M.fNum(M.fNeg(b)) + dRad) / (2 * M.fNum(a));
    const s2 = (M.fNum(M.fNeg(b)) - dRad) / (2 * M.fNum(a));
    passi.push(passo('Le due soluzioni (valori approssimati)',
      '<div class="mate mate-blocco"><i>' + v + '</i><sub>1</sub> ≈ ' + numeroIt(s1) + ' &nbsp;&nbsp;&nbsp; <i>' + v + '</i><sub>2</sub> ≈ ' + numeroIt(s2) + '</div>',
      'La radice del delta non è un numero intero: le soluzioni restano con la radice. Qui sotto trovi il valore approssimato.',
      'Sul quaderno la forma esatta si scrive con la radice: è quella la risposta "giusta". Il numero con la virgola serve solo per capire quanto vale.'));
    return [];    // niente soluzioni esatte da usare per la verifica
  }

  /* ---- grado 3 o superiore ---------------------------------------- */
  function passiGradoAlto(passi, v, c) {
    passi.push(passo('Porto tutto a sinistra',
      eqHtml(M.html(M.polAAst(M.daCoeff(c, v))), '0'),
      'Il grado di questa equazione è ' + (c.length - 1) + '.'));
    let resto = c.slice();
    const trovate = [];
    for (let giro = 0; giro < 8 && resto.length - 1 > 2; giro++) {
      const rad = M.radiciRazionali(resto);
      if (!rad.length) break;
      const r = rad[0];
      const div = M.divisioneNum(resto, [M.fNeg(r), M.F1]);
      if (!div) break;
      trovate.push(r);
      resto = div.q;
      passi.push(passo('Trovo una soluzione e abbasso il grado',
        '<div class="mate mate-blocco"><i>' + v + '</i> = ' + M.html(M.nNum(r)) + '</div>' +
        eqHtml(M.html(M.polAAst(M.daCoeff(resto, v))), '0'),
        'Provando i divisori dei numeri estremi ho trovato che ' + v + ' = ' + nt(r) + ' annulla il polinomio. Divido e resta un\'equazione di grado più basso.',
        'Se ' + v + ' = ' + nt(r) + ' è una soluzione, allora (' + v + ' − ' + nt(r) + ') è un fattore: dividendo si ottiene un polinomio di un grado in meno.'));
    }
    if (resto.length - 1 === 2) {
      const s = passiSecondoGrado(passi, v, resto);
      return { stato: 'verde', soluzioni: trovate.concat(s || []).sort((a, b) => M.fCmp(a, b)) };
    }
    if (resto.length - 1 === 1) {
      const s = M.fDiv(M.fNeg(resto[0]), resto[1]);
      passi.push(passo('Ultima soluzione', '<div class="mate mate-blocco"><i>' + v + '</i> = ' + M.html(M.nNum(s)) + '</div>', ''));
      return { stato: 'verde', soluzioni: trovate.concat([s]).sort((a, b) => M.fCmp(a, b)) };
    }
    return {
      stato: trovate.length ? 'giallo' : 'rosso',
      soluzioni: trovate,
      messaggio: trovate.length
        ? 'Ho trovato le soluzioni "semplici", ma quello che resta non si scompone con numeri razionali: le altre soluzioni non le so calcolare in modo esatto.'
        : 'Questa equazione non si risolve con i metodi della scuola in modo esatto. Prova con il graficatore per vedere dove la curva taglia l\'asse delle x.'
    };
  }

  /* ---- verifica --------------------------------------------------- */
  function verificaNumerica(sx, dx, v, valore) {
    try {
      const scope = {}; scope[v] = M.fNum(valore);
      const a = M.valuta(sx, scope), b = M.valuta(dx, scope);
      if (Math.abs(a - b) < 1e-9) {
        // riscrivo l'equazione mettendo il numero al posto della lettera
        const sxSost = M.html(M.sostituisci(sx, v, valore));
        const dxSost = M.html(M.sostituisci(dx, v, valore));
        return passo('Controllo',
          '<div class="mate mate-blocco">' + sxSost + ' = ' + dxSost + '</div>' +
          '<div class="mate mate-blocco">' + numeroIt(a) + ' = ' + numeroIt(b) + ' ✅</div>',
          'Sostituisco ' + v + ' = ' + nt(valore) + ' nell\'equazione di partenza: viene la stessa cosa da tutte e due le parti. Risultato verificato.');
      }
    } catch (e) { /* niente */ }
    return null;
  }

  /** Controlla il risultato scritto dallo studente. */
  function controllaRisultato(equazione, variabile, valoreTesto) {
    try {
      const parti = dividiUguale(equazione);
      const sx = M.analizza(parti.sx), dx = M.analizza(parti.dx);
      const val = M.valuta(M.analizza(valoreTesto), {});
      const scope = {}; scope[variabile || 'x'] = val;
      const a = M.valuta(sx, scope), b = M.valuta(dx, scope);
      return {
        ok: Math.abs(a - b) < 1e-9,
        sinistra: a, destra: b,
        html: '<div class="mate mate-blocco">' + numeroIt(a) + (Math.abs(a - b) < 1e-9 ? ' = ' : ' ≠ ') + numeroIt(b) + '</div>'
      };
    } catch (e) {
      return { errore: e.amichevole ? e.message : 'Non riesco a controllare questo risultato.' };
    }
  }

  /* ================================================================
     LO RISOLVO IO — controllo dei passaggi scritti dallo studente

     Qui il programma NON risolve: guarda quello che ha scritto il
     ragazzo e gli dice soltanto se sta ancora dicendo la stessa cosa.
     ================================================================ */

  /** Porta l'equazione nella forma "tutto a sinistra" e ne prende i coefficienti. */
  function coefficientiRiga(testo, v) {
    const parti = dividiUguale(testo);
    if (!parti.aveva) throw M.errore('In un\'equazione ci vuole il segno "=".');
    const sx = M.analizza(parti.sx), dx = M.analizza(parti.dx);
    const rs = M.ratDaAst(sx), rd = M.ratDaAst(dx);
    if (!rs || !rd) return null;
    const N = M.polSottrai(M.polProdotto(rs.n, rd.d), M.polProdotto(rd.n, rs.d));
    const c = M.polCoeffNum(N, v || incognita(N));
    if (!c) return null;
    const pulito = c.slice();
    while (pulito.length > 1 && M.fZero(pulito[pulito.length - 1])) pulito.pop();
    return pulito;
  }

  /**
   * Due righe dicono la stessa cosa?
   * Sì se una è l'altra moltiplicata per un numero: è esattamente quello
   * che succede quando si sposta un termine o si divide per un numero.
   */
  function passaggioEquivalente(rigaPrima, rigaDopo, v) {
    let a, b;
    try { a = coefficientiRiga(rigaPrima, v); b = coefficientiRiga(rigaDopo, v); }
    catch (e) { return { esito: 'nonSo', messaggio: e.amichevole ? e.message : 'Non riesco a leggere questa riga.' }; }
    if (!a || !b) {
      return { esito: 'nonSo', messaggio: 'Non riesco a controllare queste righe. Guarda che ci sia un solo segno "=" e che ci sia una sola lettera: se hai copiato dal libro, può esserci finito dentro qualche pezzo di testo.' };
    }

    const tuttoZero = (c) => c.every((x) => M.fZero(x));
    if (tuttoZero(a) && tuttoZero(b)) return { esito: 'ok' };
    if (a.length !== b.length) return { esito: 'diverso' };

    let k = null;
    for (let i = 0; i < a.length; i++) {
      const za = M.fZero(a[i]), zb = M.fZero(b[i]);
      if (za && zb) continue;
      if (za !== zb) return { esito: 'diverso' };
      const r = M.fDiv(b[i], a[i]);
      if (k === null) k = r;
      else if (M.fCmp(k, r) !== 0) return { esito: 'diverso' };
    }
    return { esito: 'ok', fattore: k };
  }

  /** Che cosa conviene fare adesso? (un suggerimento, non la soluzione) */
  function prossimaMossa(riga, v) {
    v = v || 'x';
    let parti, sx, dx;
    try {
      parti = dividiUguale(riga);
      if (!parti.aveva) return { testo: 'Manca il segno "=": un\'equazione ha sempre due parti.' };
      sx = M.analizza(parti.sx); dx = M.analizza(parti.dx);
    } catch (e) {
      return { testo: e.amichevole ? e.message : 'Non riesco a leggere questa riga: controlla come l\'hai scritta.' };
    }
    const Psx = M.polDaAst(sx), Pdx = M.polDaAst(dx);
    if (!Psx || !Pdx) return { testo: 'Ci sono ancora delle frazioni con la ' + v + '. Prova a moltiplicare tutto per il denominatore.' };

    const c = coefficientiRiga(riga, v);
    if (c && c.length - 1 > 1) {
      return { testo: 'Questa è di secondo grado. Portala nella forma a' + v + '² + b' + v + ' + c = 0, poi calcola il delta.' };
    }

    const cSx = M.polCoeffNum(Psx, v) || [], cDx = M.polCoeffNum(Pdx, v) || [];
    const a = cSx[1] || M.F0, n = cSx[0] || M.F0;
    const b = cDx[1] || M.F0, m = cDx[0] || M.F0;

    // ci sono ancora parentesi da togliere?  (guardo quello che vede lui)
    if (/\(/.test(riga)) {
      return { testo: 'Prima togli le parentesi: moltiplica quello che sta fuori per ogni pezzo che sta dentro.' };
    }
    // ci sono termini uguali da mettere insieme?
    const daUnire = (ast, P) => {
      const scritti = ast.t === '+' ? ast.a.length : 1;
      const ridotti = (() => { const c = M.polAAst(P); return c.t === '+' ? c.a.length : 1; })();
      return scritti > ridotti;
    };
    if (daUnire(sx, Psx) || daUnire(dx, Pdx)) {
      return { testo: 'Metti insieme i termini uguali: somma fra loro i numeri, e fra loro le ' + v + '.' };
    }
    if (!M.fZero(b)) {
      return { testo: 'Togli ' + nt(b) + v + ' da tutte e due le parti, così la ' + v + ' resta solo a sinistra.' };
    }
    if (!M.fZero(n)) {
      return M.fNum(n) > 0
        ? { testo: 'Togli ' + nt(n) + ' da tutte e due le parti, così a sinistra resta solo la parte con la ' + v + '.' }
        : { testo: 'Aggiungi ' + nt(M.fNeg(n)) + ' a tutte e due le parti, così a sinistra resta solo la parte con la ' + v + '.' };
    }
    if (M.fZero(a)) return { testo: 'La ' + v + ' è sparita: controlla i passaggi di prima.' };
    if (!M.fUno(a)) {
      return { testo: 'Ci sei quasi: dividi tutte e due le parti per ' + nt(a) + '.' };
    }
    // qui la riga è già "x = m": il valore è m, non il suo opposto
    return { testo: 'Hai finito! Questa riga dice già quanto vale ' + v + '.', finito: true, valore: m };
  }

  /** Alla fine: la riga dice il valore giusto? */
  function esitoFinale(righe, v) {
    v = v || 'x';
    const prima = righe[0], ultima = righe[righe.length - 1];
    const eq = passaggioEquivalente(prima, ultima, v);
    if (eq.esito === 'nonSo') return { stato: 'nonSo', messaggio: eq.messaggio };
    if (eq.esito === 'diverso') {
      return { stato: 'errore', messaggio: 'L\'ultima riga non dice più la stessa cosa della prima: da qualche parte c\'è un errore. Prova il pulsante ✓ su ogni riga per scoprire dove.' };
    }
    const mossa = prossimaMossa(ultima, v);
    if (!mossa.finito) {
      return { stato: 'quasi', messaggio: 'Fin qui è tutto giusto, ma non hai ancora finito. ' + mossa.testo };
    }
    return { stato: 'ok', messaggio: 'Perfetto: ' + v + ' = ' + nt(mossa.valore) + '. E l\'hai trovato tu.', valore: mossa.valore };
  }

  /* ================================================================
     DISEQUAZIONI
     ================================================================ */

  function risolviDisequazione(str) {
    const t = M.normalizzaTesto(str);
    const m = t.match(/(<=|>=|<|>)/);
    if (!m) return esito('rosso', 'In una disequazione ci vuole un segno di disuguaglianza: <, >, ≤ oppure ≥.');
    const segno = m[1];
    const [sxT, dxT] = t.split(segno);
    let sx, dx;
    try { sx = M.analizza(sxT); dx = M.analizza(dxT); }
    catch (e) { return esito('rosso', e.amichevole ? e.message : 'Non riesco a leggere questa disequazione.'); }

    const P = M.polDaAst(sx) && M.polDaAst(dx) ? M.polSottrai(M.polDaAst(sx), M.polDaAst(dx)) : null;
    if (!P) return esito('rosso', 'So risolvere le disequazioni con i polinomi (primo e secondo grado). Questa contiene qualcosa che non riesco a trattare in modo sicuro.');
    const v = incognita(P);
    const c = M.polCoeffNum(P, v);
    if (!c) return esito('giallo', 'Ci sono troppe lettere: usane una sola.');
    let cc = c.slice();
    while (cc.length > 1 && M.fZero(cc[cc.length - 1])) cc.pop();

    const passi = [passo('Partiamo da', eqHtml(M.html(sx), M.html(dx), segnoHtml(segno)), '')];
    passi.push(passo('Porto tutto a sinistra',
      eqHtml(M.html(M.polAAst(M.daCoeff(cc, v))), '0', segnoHtml(segno)),
      'Così devo solo studiare quando questa espressione è positiva o negativa.'));

    const grado = cc.length - 1;
    if (grado === 1) {
      const a = cc[1], b = cc[0];
      const s = M.fDiv(M.fNeg(b), a);
      let segnoFinale = segno;
      if (M.fNum(a) < 0) {
        segnoFinale = giraSegno(segno);
        passi.push(passo('Divido per un numero negativo: il verso cambia!',
          '<div class="mate mate-blocco"><i>' + v + '</i> ' + segnoHtml(segnoFinale) + ' ' + M.html(M.nNum(s)) + '</div>',
          'Ho diviso per ' + nt(a) + ', che è negativo: il segno della disuguaglianza si gira.',
          'Se moltiplichi o dividi per un numero negativo, il maggiore diventa minore. Prova con i numeri: 2 < 3, ma −2 > −3.'));
      } else {
        passi.push(passo('Divido per ' + nt(a),
          '<div class="mate mate-blocco"><i>' + v + '</i> ' + segnoHtml(segnoFinale) + ' ' + M.html(M.nNum(s)) + '</div>',
          'Il numero davanti alla ' + v + ' è positivo: il verso resta uguale.'));
      }
      return esito('verde', '', passi, {
        soluzioneTesto: v + ' ' + segnoTesto(segnoFinale) + ' ' + nt(s),
        retta: { punti: [{ x: M.fNum(s), aperto: segnoFinale === '<' || segnoFinale === '>' }], versoDestra: segnoFinale === '>' || segnoFinale === '>=' },
        variabile: v
      });
    }

    if (grado === 2) {
      const a = cc[2], b = cc[1] || M.F0, k = cc[0] || M.F0;
      const delta = M.fSub(M.fMul(b, b), M.fMul(F(4), M.fMul(a, k)));
      passi.push(passo('Calcolo il delta dell\'equazione associata',
        '<div class="mate mate-blocco">Δ = ' + M.html(M.nNum(delta)) + '</div>',
        'Prima trovo dove l\'espressione vale zero, poi guardo il segno.'));
      const dn = M.fNum(delta), an = M.fNum(a);
      const concavita = an > 0 ? 'verso l\'alto' : 'verso il basso';
      passi.push(passo('Che parabola è?',
        '<div class="mate mate-blocco">a = ' + M.html(M.nNum(a)) + ' → concavità ' + concavita + '</div>',
        an > 0 ? 'La parabola "sorride": è positiva fuori dalle radici.' : 'La parabola "è triste": è positiva dentro le radici.'));
      if (dn < 0) {
        const sempre = (an > 0) === (segno === '>' || segno === '>=');
        passi.push(passo('Δ < 0: la parabola non tocca mai l\'asse x',
          '<div class="mate mate-blocco">' + (sempre ? 'Sempre vera' : 'Mai vera') + '</div>',
          sempre ? 'L\'espressione ha sempre lo stesso segno, ed è quello che ci serve.' : 'L\'espressione ha sempre il segno opposto a quello richiesto.'));
        return esito('verde', '', passi, { soluzioneTesto: sempre ? 'Va bene ogni valore di ' + v : 'Nessuna soluzione', variabile: v });
      }
      const rad = Math.sqrt(dn);
      const x1 = (-M.fNum(b) - rad) / (2 * an);
      const x2 = (-M.fNum(b) + rad) / (2 * an);
      const min = Math.min(x1, x2), max = Math.max(x1, x2);
      passi.push(passo('Trovo dove vale zero',
        '<div class="mate mate-blocco"><i>' + v + '</i><sub>1</sub> = ' + numeroIt(min) + ' &nbsp;&nbsp; <i>' + v + '</i><sub>2</sub> = ' + numeroIt(max) + '</div>', ''));
      const cerco = (segno === '>' || segno === '>=') ? 'positiva' : 'negativa';
      const fuori = (an > 0) === (cerco === 'positiva');
      const incluso = segno === '<=' || segno === '>=';
      const testoSol = dn === 0
        ? (fuori ? (incluso ? 'Va bene ogni valore di ' + v : v + ' ≠ ' + numeroIt(min)) : (incluso ? v + ' = ' + numeroIt(min) : 'Nessuna soluzione'))
        : (fuori
          ? v + ' ' + (incluso ? '≤' : '<') + ' ' + numeroIt(min) + '   oppure   ' + v + ' ' + (incluso ? '≥' : '>') + ' ' + numeroIt(max)
          : numeroIt(min) + ' ' + (incluso ? '≤' : '<') + ' ' + v + ' ' + (incluso ? '≤' : '<') + ' ' + numeroIt(max));
      passi.push(passo('Guardo il segno',
        '<div class="mate mate-blocco">' + esc(testoSol) + '</div>',
        fuori ? 'Prendo i valori FUORI dalle due radici.' : 'Prendo i valori DENTRO le due radici.',
        'Disegna mentalmente la parabola: dove sta sopra l\'asse x l\'espressione è positiva, dove sta sotto è negativa.'));
      return esito('verde', '', passi, {
        soluzioneTesto: testoSol, variabile: v,
        retta: { intervallo: { min, max, fuori, incluso } }
      });
    }

    return esito('giallo', 'So risolvere passo passo le disequazioni di primo e secondo grado. Questa è di grado ' + grado + ': posso mostrarti il grafico e gli zeri, ma non il procedimento completo.', passi);
  }

  function giraSegno(s) { return { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[s]; }
  function segnoHtml(s) { return { '<': '&lt;', '>': '&gt;', '<=': '≤', '>=': '≥' }[s]; }
  function segnoTesto(s) { return { '<': '<', '>': '>', '<=': '≤', '>=': '≥' }[s]; }

  /* ================================================================
     SISTEMI LINEARI DI DUE EQUAZIONI
     ================================================================ */

  function risolviSistema(eq1, eq2, metodo) {
    let d1, d2;
    try {
      d1 = dividiUguale(eq1); d2 = dividiUguale(eq2);
      if (!d1.aveva || !d2.aveva) throw M.errore('Servono due equazioni con il segno "=".');
    } catch (e) { return esito('rosso', e.message); }

    let P1, P2;
    try {
      P1 = M.polSottrai(M.polDaAst(M.analizza(d1.sx)), M.polDaAst(M.analizza(d1.dx)));
      P2 = M.polSottrai(M.polDaAst(M.analizza(d2.sx)), M.polDaAst(M.analizza(d2.dx)));
    } catch (e) { return esito('rosso', 'Non riesco a leggere le due equazioni. Scrivile per esempio così: x + y = 10'); }
    if (!P1 || !P2) return esito('rosso', 'So risolvere i sistemi lineari (senza potenze e senza frazioni con le incognite).');

    const vars = Array.from(new Set(M.polVariabili(P1).concat(M.polVariabili(P2)))).sort();
    if (vars.length !== 2) return esito('rosso', 'Mi servono esattamente due incognite, per esempio x e y.');
    const [vx, vy] = vars;
    const co = (P) => {
      const cy = M.polCoeff(P, vy);
      const b = cy[1] ? M.polValoreCost(cy[1]) : M.F0;
      const resto = cy[0] || M.pol();
      const cx = M.polCoeff(resto, vx);
      const a = cx[1] ? M.polValoreCost(cx[1]) : M.F0;
      const c = cx[0] ? M.polValoreCost(cx[0]) : M.F0;
      if (M.polGrado(P) > 1) return null;
      return { a, b, c: M.fNeg(c) };     // a x + b y = c
    };
    const s1 = co(P1), s2 = co(P2);
    if (!s1 || !s2) return esito('rosso', 'Questo non è un sistema di primo grado: ci sono potenze o prodotti fra le incognite.');

    const passi = [passo('Il sistema',
      '<div class="mate mate-blocco">' + rigaSistema(s1, vx, vy) + '<br>' + rigaSistema(s2, vx, vy) + '</div>',
      'Due equazioni e due incognite: cerco la coppia di numeri che le rende vere tutte e due.')];

    const det = M.fSub(M.fMul(s1.a, s2.b), M.fMul(s2.a, s1.b));
    if (M.fZero(det)) {
      const d2v = M.fSub(M.fMul(s1.c, s2.b), M.fMul(s2.c, s1.b));
      if (M.fZero(d2v)) {
        passi.push(passo('Le due equazioni dicono la stessa cosa', '<div class="mate mate-blocco">∞ soluzioni</div>',
          'Il sistema ha infinite soluzioni: ogni punto di quella retta va bene.'));
        return esito('verde', '', passi, { soluzioni: 'infinite' });
      }
      passi.push(passo('Le due rette sono parallele', '<div class="mate mate-blocco">Nessuna soluzione</div>',
        'Non esiste nessuna coppia di numeri che vada bene per tutte e due le equazioni.'));
      return esito('verde', '', passi, { soluzioni: 'nessuna' });
    }

    metodo = metodo || 'riduzione';
    if (metodo === 'sostituzione') passiSostituzione(passi, s1, s2, vx, vy);
    else if (metodo === 'confronto') passiConfronto(passi, s1, s2, vx, vy);
    else passiRiduzione(passi, s1, s2, vx, vy);

    const x = M.fDiv(M.fSub(M.fMul(s1.c, s2.b), M.fMul(s2.c, s1.b)), det);
    const y = M.fDiv(M.fSub(M.fMul(s1.a, s2.c), M.fMul(s2.a, s1.c)), det);
    passi.push(passo('Risultato',
      '<div class="mate mate-blocco"><i>' + vx + '</i> = ' + M.html(M.nNum(x)) + ' &nbsp;&nbsp;&nbsp; <i>' + vy + '</i> = ' + M.html(M.nNum(y)) + '</div>', ''));
    passi.push(passo('Controllo',
      '<div class="mate mate-blocco">' + verificaRiga(s1, x, y, vx, vy) + '<br>' + verificaRiga(s2, x, y, vx, vy) + '</div>',
      'Sostituisco i valori trovati in tutte e due le equazioni: tornano. ✅'));
    return esito('verde', '', passi, { soluzioni: { x, y }, variabili: [vx, vy] });
  }

  /** Scrive "x", "−x", "3x" senza mai mettere il brutto "1x". */
  function coefVar(f, v, primo) {
    const neg = M.fNum(f) < 0;
    const ass = neg ? M.fNeg(f) : f;
    const segno = primo ? (neg ? '−' : '') : (neg ? ' − ' : ' + ');
    return segno + (M.fUno(ass) ? '' : M.html(M.nNum(ass))) + '<i>' + v + '</i>';
  }
  function rigaSistema(s, vx, vy) {
    let t = '';
    if (!M.fZero(s.a)) t += coefVar(s.a, vx, true);
    if (!M.fZero(s.b)) t += coefVar(s.b, vy, t === '');
    return (t || '0') + ' = ' + M.html(M.nNum(s.c));
  }
  function verificaRiga(s, x, y, vx, vy) {
    const v = M.fAdd(M.fMul(s.a, x), M.fMul(s.b, y));
    return M.fTesto(v) + ' = ' + M.fTesto(s.c) + (M.fCmp(v, s.c) === 0 ? ' ✅' : ' ❌');
  }

  function passiSostituzione(passi, s1, s2, vx, vy) {
    let base = s1, altra = s2, ricavo = vy, coefRic = s1.b, altroCoef = s1.a, altroVar = vx;
    if (M.fZero(s1.b)) { ricavo = vx; coefRic = s1.a; altroCoef = s1.b; altroVar = vy; }
    if (M.fZero(coefRic)) { base = s2; altra = s1; coefRic = s2.b; altroCoef = s2.a; ricavo = vy; altroVar = vx; }
    const espr = '<span class="frazione"><span class="sopra">' + M.html(M.nNum(base.c)) + ' − ' + M.html(M.nNum(altroCoef)) + '<i>' + altroVar + '</i></span><span class="sotto">' + M.html(M.nNum(coefRic)) + '</span></span>';
    passi.push(passo('Metodo della sostituzione — passo 1',
      '<div class="mate mate-blocco"><i>' + ricavo + '</i> = ' + espr + '</div>',
      'Dalla prima equazione ricavo ' + ricavo + '.',
      'Ricavare una lettera vuol dire lasciarla da sola da una parte dell\'uguale.'));
    passi.push(passo('Passo 2: sostituisco nell\'altra equazione',
      '<div class="mate mate-blocco">' + rigaSistema(altra, vx, vy).replace('<i>' + ricavo + '</i>', '(' + espr + ')') + '</div>',
      'Al posto di ' + ricavo + ' scrivo quello che ho trovato: resta un\'equazione con una sola incognita.'));
  }
  function passiConfronto(passi, s1, s2, vx, vy) {
    passi.push(passo('Metodo del confronto',
      '<div class="mate mate-blocco">' + rigaSistema(s1, vx, vy) + '<br>' + rigaSistema(s2, vx, vy) + '</div>',
      'Ricavo la stessa lettera da tutte e due le equazioni e poi metto le due espressioni una uguale all\'altra.',
      'Se ' + vy + ' è uguale a una cosa e anche a un\'altra, allora quelle due cose sono uguali fra loro.'));
  }
  function passiRiduzione(passi, s1, s2, vx, vy) {
    const m1 = s2.a, m2 = M.fNeg(s1.a);
    passi.push(passo('Metodo della riduzione — passo 1',
      '<div class="mate mate-blocco">(' + M.fTesto(m1) + ') · [' + rigaSistema(s1, vx, vy) + ']<br>(' + M.fTesto(m2) + ') · [' + rigaSistema(s2, vx, vy) + ']</div>',
      'Moltiplico le due equazioni per due numeri scelti apposta, così sommandole la ' + vx + ' sparisce.',
      'Se davanti alla ' + vx + ' compaiono due numeri opposti (per esempio +6 e −6), sommando le due equazioni la ' + vx + ' se ne va.'));
    const b = M.fAdd(M.fMul(m1, s1.b), M.fMul(m2, s2.b));
    const c = M.fAdd(M.fMul(m1, s1.c), M.fMul(m2, s2.c));
    passi.push(passo('Passo 2: sommo le due equazioni',
      '<div class="mate mate-blocco">' + M.html(M.nProd([M.nNum(b), M.nVar(vy)])) + ' = ' + M.html(M.nNum(c)) + '</div>',
      'Resta un\'equazione con una sola incognita: la risolvo come sempre.'));
  }

  /* ================================================================
     POLINOMI: sviluppo e scomposizione
     ================================================================ */

  /** (a + b)(a − b): due binomi uguali tranne il segno di un termine. */
  function sonoConiugati(a) {
    if (a.t !== '*' || a.a.length !== 2) return false;
    const [p, q] = a.a;
    if (p.t !== '+' || q.t !== '+' || p.a.length !== 2 || q.a.length !== 2) return false;
    const t = (x) => M.testo(M.semplifica(x));
    return (t(p.a[0]) === t(q.a[0]) && t(p.a[1]) === t(M.nProd([M.nNum(M.fr(-1)), q.a[1]]))) ||
           (t(p.a[1]) === t(q.a[1]) && t(p.a[0]) === t(M.nProd([M.nNum(M.fr(-1)), q.a[0]])));
  }

  const PRODOTTI_NOTEVOLI = [
    { test: sonoConiugati,
      nome: 'Somma per differenza', regola: '(a + b)(a − b) = a² − b²',
      perche: 'I due prodotti in mezzo si annullano fra loro: resta solo la differenza dei quadrati.' },
    { test: (a) => a.t === '^' && a.e.t === 'n' && a.e.v.n === 2 && a.e.v.d === 1 && a.b.t === '+' && a.b.a.length === 2,
      nome: 'Quadrato di un binomio', regola: '(a + b)² = a² + 2ab + b²',
      perche: 'Il quadrato di una somma NON è la somma dei quadrati: in mezzo c\'è sempre il doppio prodotto.' },
    { test: (a) => a.t === '^' && a.e.t === 'n' && a.e.v.n === 3 && a.e.v.d === 1 && a.b.t === '+' && a.b.a.length === 2,
      nome: 'Cubo di un binomio', regola: '(a + b)³ = a³ + 3a²b + 3ab² + b³', perche: '' },
    { test: (a) => a.t === '*' && a.a.length === 2 && a.a.every((x) => x.t === '+' && x.a.length === 2),
      nome: 'Prodotto di due binomi', regola: '(a + b)(c + d) = ac + ad + bc + bd',
      perche: 'Ogni termine della prima parentesi moltiplica ogni termine della seconda.' }
  ];

  function espandi(str) {
    let a;
    try { a = M.analizza(str); } catch (e) { return esito('rosso', e.amichevole ? e.message : 'Non riesco a leggere questa espressione.'); }
    const P = M.polDaAst(a);
    if (!P) return esito('rosso', 'So sviluppare somme, prodotti e potenze di polinomi. Qui c\'è qualcosa di diverso (una radice, un logaritmo, una divisione per una lettera).');
    const passi = [passo('Partiamo da', M.blocco(a), '')];
    const notevole = PRODOTTI_NOTEVOLI.find((p) => p.test(a));
    if (notevole) {
      passi.push(passo('Riconosco un prodotto notevole',
        '<div class="mate mate-blocco">' + esc(notevole.regola) + '</div>',
        notevole.nome + '.', notevole.perche));
    }
    passi.push(passo('Sviluppo', M.blocco(M.polAAst(P)),
      'Ho fatto tutte le moltiplicazioni e sommato i termini simili.'));
    return esito('verde', '', passi, { risultato: M.polAAst(P) });
  }

  function scomponi(str) {
    let a;
    try { a = M.analizza(str); } catch (e) { return esito('rosso', e.amichevole ? e.message : 'Non riesco a leggere questa espressione.'); }
    const P = M.polDaAst(a);
    if (!P) return esito('rosso', 'So scomporre i polinomi. Questa espressione non è un polinomio.');
    const passi = [passo('Partiamo da', M.blocco(M.polAAst(P)), '')];
    const fattori = [];
    let R = P;

    // 1. raccoglimento a fattor comune
    const rc = raccogliComune(R);
    if (rc) {
      fattori.push(rc.fattore);
      R = rc.resto;
      passi.push(passo('Raccolgo a fattor comune',
        M.blocco(M.nProd([rc.fattore, M.polAAst(R)])),
        'Tutti i termini hanno in comune ' + M.testo(rc.fattore) + ': lo porto fuori.',
        'Raccogliere vuol dire fare il contrario della proprietà distributiva.'));
    }

    const vars = M.polVariabili(R);
    if (vars.length === 1) {
      const v = vars[0];
      const c = M.polCoeffNum(R, v);
      if (c) {
        const g = c.length - 1;
        // differenza di quadrati  a² − b²
        if (g === 2 && M.fZero(c[1]) && M.fNum(c[2]) > 0 && M.fNum(c[0]) < 0) {
          const q1 = M.radiceSemplificata(Math.round(M.fNum(c[2])));
          const q2 = M.radiceSemplificata(Math.round(-M.fNum(c[0])));
          if (q1 && q1.dentro === 1 && q2 && q2.dentro === 1 && M.fInt(c[2]) && M.fInt(c[0])) {
            const h = '<div class="mate mate-blocco">(' + (q1.fuori === 1 ? '' : q1.fuori) + '<i>' + v + '</i> − ' + q2.fuori + ')(' + (q1.fuori === 1 ? '' : q1.fuori) + '<i>' + v + '</i> + ' + q2.fuori + ')</div>';
            passi.push(passo('Differenza di due quadrati', h,
              'La regola è: a² − b² = (a − b)(a + b).',
              'Attenzione: la SOMMA di due quadrati (a² + b²) invece non si scompone.'));
            return esito('verde', '', passi, {});
          }
        }
        // trinomio di secondo grado
        if (g === 2) {
          const rad = M.radiciRazionali(c);
          if (rad.length) {
            const testo2 = rad.slice(0, 2).map((r) => '(<i>' + v + '</i> ' + (M.fNum(r) < 0 ? '+ ' + M.fTesto(M.fNeg(r)) : '− ' + nt(r)) + ')').join('');
            const capo = M.fUno(c[2]) ? '' : M.fTesto(c[2]);
            passi.push(passo('Trovo le radici e scompongo',
              '<div class="mate mate-blocco">' + capo + testo2 + '</div>',
              'Le radici sono ' + rad.slice(0, 2).map((r) => v + ' = ' + nt(r)).join(' e ') + '.',
              'Un trinomio a' + v + '² + b' + v + ' + c si può scrivere come a(' + v + ' − x₁)(' + v + ' − x₂), dove x₁ e x₂ sono le soluzioni dell\'equazione associata.'));
            return esito('verde', '', passi, {});
          }
          passi.push(passo('Non si scompone con numeri interi',
            M.blocco(M.polAAst(R)),
            'Il delta non è un quadrato perfetto: questo trinomio è irriducibile fra i numeri razionali.'));
          return esito('giallo', '', passi, {});
        }
        // grado alto: radici razionali
        if (g >= 3) {
          let resto = c.slice();
          const lineari = [];
          for (let i = 0; i < 6; i++) {
            const rr = M.radiciRazionali(resto);
            if (!rr.length) break;
            const r = rr[0];
            const d = M.divisioneNum(resto, [M.fNeg(r), M.F1]);
            if (!d) break;
            lineari.push(r); resto = d.q;
            if (resto.length - 1 <= 0) break;
          }
          if (lineari.length) {
            const t = lineari.map((r) => '(<i>' + v + '</i> ' + (M.fNum(r) < 0 ? '+ ' + M.fTesto(M.fNeg(r)) : '− ' + nt(r)) + ')').join('');
            const restoAst = M.polAAst(M.daCoeff(resto, v));
            passi.push(passo('Scompongo con il metodo di Ruffini',
              '<div class="mate mate-blocco">' + t + (resto.length - 1 > 0 ? '(' + M.html(restoAst) + ')' : '') + '</div>',
              'Ho cercato le radici fra i divisori del termine noto e ho diviso ogni volta.',
              'Se P(a) = 0, allora (' + v + ' − a) è un fattore di P.'));
            return esito('verde', '', passi, {});
          }
        }
      }
    }

    // raccoglimento parziale (4 termini)
    const parz = raccoglimentoParziale(R);
    if (parz) { passi.push(parz); return esito('verde', '', passi, {}); }

    if (fattori.length) return esito('verde', '', passi, {});
    passi.push(passo('Non riesco a scomporlo', M.blocco(M.polAAst(R)),
      'Con i metodi della scuola (raccoglimento, prodotti notevoli, Ruffini) questo polinomio non si scompone.'));
    return esito('giallo', '', passi, {});
  }

  function raccogliComune(P) {
    const chiavi = Object.keys(P);
    if (chiavi.length < 2) return null;
    // massimo comun divisore dei coefficienti
    let num = Math.abs(P[chiavi[0]].n), den = P[chiavi[0]].d;
    chiavi.forEach((k) => { num = mcdN(num, Math.abs(P[k].n)); den = den * P[k].d / mcdN(den, P[k].d); });
    const coef = M.fr(num, den);
    // lettere comuni con l'esponente più piccolo
    const primi = monVars(chiavi[0]);
    const comuni = {};
    Object.keys(primi).forEach((v) => {
      let e = primi[v];
      chiavi.forEach((k) => { const m = monVars(k); e = Math.min(e, m[v] || 0); });
      if (e > 0) comuni[v] = e;
    });
    const haLettere = Object.keys(comuni).length > 0;
    if (M.fUno(coef) && !haLettere) return null;
    const fattoriAst = [];
    if (!M.fUno(coef)) fattoriAst.push(M.nNum(coef));
    Object.keys(comuni).sort().forEach((v) => fattoriAst.push(comuni[v] === 1 ? M.nVar(v) : M.nPot(M.nVar(v), M.nNum(M.fr(comuni[v])))));
    if (!fattoriAst.length) return null;
    // divido
    let divisore = M.polCost(coef);
    Object.keys(comuni).forEach((v) => { const m = {}; m[v] = comuni[v]; const p = {}; p[monKey(m)] = M.F1; divisore = M.polProdotto(divisore, p); });
    const resto = {};
    Object.keys(P).forEach((k) => {
      const m = monVars(k);
      Object.keys(comuni).forEach((v) => { m[v] = (m[v] || 0) - comuni[v]; if (!m[v]) delete m[v]; });
      resto[monKey(m)] = M.fDiv(P[k], coef);
    });
    return { fattore: fattoriAst.length === 1 ? fattoriAst[0] : M.nProd(fattoriAst), resto };
  }
  function mcdN(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }
  function monVars(k) { const m = {}; if (!k) return m; k.split('*').forEach((p) => { const [v, e] = p.split('^'); m[v] = Number(e); }); return m; }
  function monKey(m) { return Object.keys(m).filter((v) => m[v]).sort().map((v) => v + '^' + m[v]).join('*'); }

  function raccoglimentoParziale(P) {
    const chiavi = Object.keys(P);
    if (chiavi.length !== 4) return null;
    for (const coppia of [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]]) {
      const A = {}, B = {};
      A[chiavi[coppia[0]]] = P[chiavi[coppia[0]]]; A[chiavi[coppia[1]]] = P[chiavi[coppia[1]]];
      B[chiavi[coppia[2]]] = P[chiavi[coppia[2]]]; B[chiavi[coppia[3]]] = P[chiavi[coppia[3]]];
      const ra = raccogliComune(A), rb = raccogliComune(B);
      if (ra && rb && M.testo(M.polAAst(ra.resto)) === M.testo(M.polAAst(rb.resto))) {
        return passo('Raccoglimento parziale',
          '<div class="mate mate-blocco">(' + M.html(M.polAAst(ra.resto)) + ')(' + M.html(M.nSomma([ra.fattore, rb.fattore])) + ')</div>',
          'Raccolgo a due a due e poi raccolgo la parentesi che si ripete.',
          'Quando ci sono quattro termini conviene provare a raggrupparli a coppie.');
      }
    }
    return null;
  }

  /* ================================================================
     DERIVATE
     ================================================================ */

  const REGOLE_DERIVATA = {
    sin: (u) => ({ t: 'f', n: 'cos', a: [u] }),
    cos: (u) => M.nProd([M.nNum(M.fr(-1)), { t: 'f', n: 'sin', a: [u] }]),
    tan: (u) => M.nDiv(M.nNum(M.F1), M.nPot({ t: 'f', n: 'cos', a: [u] }, M.nNum(M.fr(2)))),
    ln: (u) => M.nDiv(M.nNum(M.F1), u),
    log: (u) => M.nDiv(M.nNum(M.F1), M.nProd([u, { t: 'f', n: 'ln', a: [M.nNum(M.fr(10))] }])),
    exp: (u) => ({ t: 'f', n: 'exp', a: [u] }),
    sqrt: (u) => M.nDiv(M.nNum(M.F1), M.nProd([M.nNum(M.fr(2)), { t: 'f', n: 'sqrt', a: [u] }])),
    atan: (u) => M.nDiv(M.nNum(M.F1), M.nSomma([M.nNum(M.F1), M.nPot(u, M.nNum(M.fr(2)))])),
    asin: (u) => M.nDiv(M.nNum(M.F1), { t: 'f', n: 'sqrt', a: [M.nSomma([M.nNum(M.F1), M.nProd([M.nNum(M.fr(-1)), M.nPot(u, M.nNum(M.fr(2)))])])] }),
    acos: (u) => M.nProd([M.nNum(M.fr(-1)), M.nDiv(M.nNum(M.F1), { t: 'f', n: 'sqrt', a: [M.nSomma([M.nNum(M.F1), M.nProd([M.nNum(M.fr(-1)), M.nPot(u, M.nNum(M.fr(2)))])])] })])
  };

  function derivata(a, v) {
    v = v || 'x';
    switch (a.t) {
      case 'n': case 'c': return M.nNum(M.F0);
      case 'v': return M.nNum(a.n === v ? M.F1 : M.F0);
      case '+': return M.nSomma(a.a.map((x) => derivata(x, v)));
      case '*': {
        const parti = a.a;
        const somma = parti.map((x, i) => {
          const altri = parti.filter((_, j) => j !== i);
          return M.nProd([derivata(x, v)].concat(altri));
        });
        return M.nSomma(somma);
      }
      case '^': {
        const b = a.b, e = a.e;
        const eCost = !contiene(e, v);
        const bCost = !contiene(b, v);
        if (eCost && !bCost) {
          const nuovo = e.t === 'n' ? M.nNum(M.fSub(e.v, M.F1)) : M.nSomma([e, M.nNum(M.fr(-1))]);
          return M.nProd([e, M.nPot(b, nuovo), derivata(b, v)]);
        }
        if (bCost && !eCost) {
          return M.nProd([M.nPot(b, e), { t: 'f', n: 'ln', a: [b] }, derivata(e, v)]);
        }
        if (bCost && eCost) return M.nNum(M.F0);
        // caso generale f(x)^g(x)
        return M.nProd([M.nPot(b, e), M.nSomma([
          M.nProd([derivata(e, v), { t: 'f', n: 'ln', a: [b] }]),
          M.nProd([e, derivata(b, v), M.nPot(b, M.nNum(M.fr(-1)))])
        ])]);
      }
      case 'f': {
        const u = a.a[0];
        const r = REGOLE_DERIVATA[a.n];
        if (!r) return null;
        const est = r(u);
        if (!est) return null;
        return M.nProd([est, derivata(u, v)]);
      }
    }
    return null;
  }

  function contiene(a, v) {
    if (!a) return false;
    if (a.t === 'v') return a.n === v;
    if (a.t === '+' || a.t === '*') return a.a.some((x) => contiene(x, v));
    if (a.t === '^') return contiene(a.b, v) || contiene(a.e, v);
    if (a.t === 'f') return contiene(a.a[0], v);
    return false;
  }

  function derivataPassi(str, v) {
    v = v || 'x';
    let a;
    try { a = M.analizza(str); } catch (e) { return esito('rosso', e.amichevole ? e.message : 'Non riesco a leggere questa funzione.'); }
    const d = derivata(a, v);
    if (!d) return esito('rosso', 'Questa funzione contiene qualcosa di cui non conosco la regola di derivazione.');
    const semplice = M.semplifica(d);
    const passi = [passo('La funzione', '<div class="mate mate-blocco">f(' + v + ') = ' + M.html(a) + '</div>', '')];

    const regole = regoleUsate(a, v);
    if (regole.length) {
      passi.push(passo('Regole che servono',
        '<ul style="margin:0;padding-left:1.2em">' + regole.map((r) => '<li>' + r + '</li>').join('') + '</ul>',
        'Queste sono le regole che uso in questo esercizio.'));
    }
    // se è una somma, mostro un pezzo alla volta: è molto più chiaro
    if (a.t === '+' && a.a.length > 1) {
      const righe = a.a.map((termine) => {
        const dt = derivata(termine, v);
        return '<div class="riga"><div class="mate">' + M.html(termine) + '</div><div class="nota">→ derivata: <span class="mate">' +
          (dt ? M.html(M.semplifica(dt)) : '?') + '</span></div></div>';
      }).join('');
      passi.push(passo('Derivo un pezzo alla volta', '<div class="cosa-faccio">' + righe + '</div>',
        'La derivata di una somma si fa termine per termine.'));
    } else {
      passi.push(passo('Applico la regola', '<div class="mate mate-blocco">' + M.html(M.semplifica(d)) + '</div>',
        'Applico la regola alla funzione.'));
    }
    passi.push(passo('Risultato', '<div class="mate mate-blocco">f\'(' + v + ') = ' + M.html(semplice) + '</div>',
      'Ho fatto i conti e messo insieme i termini simili.'));
    return esito('verde', '', passi, { risultato: semplice });
  }

  function regoleUsate(a, v) {
    const r = [];
    const vista = {};
    (function scorri(x) {
      if (!x) return;
      if (x.t === '+' && !vista.somma) { vista.somma = 1; r.push('<b>Somma:</b> la derivata di una somma è la somma delle derivate.'); }
      if (x.t === '*' && x.a.filter((y) => contiene(y, v)).length > 1 && !vista.prod) {
        vista.prod = 1; r.push('<b>Prodotto:</b> (f·g)\' = f\'·g + f·g\'.');
      }
      if (x.t === '^' && x.e.t === 'n' && contiene(x.b, v)) {
        if (!vista.pot) { vista.pot = 1; r.push('<b>Potenza:</b> la derivata di ' + v + '<sup>n</sup> è n·' + v + '<sup>n−1</sup>.'); }
        if (x.b.t !== 'v' && !vista.cat) { vista.cat = 1; r.push('<b>Funzione composta:</b> derivo la parte esterna e moltiplico per la derivata di quella interna.'); }
      }
      if (x.t === '^' && x.e.t === 'n' && x.e.v.n < 0 && !vista.quoz) { vista.quoz = 1; r.push('<b>Quoziente:</b> una divisione si può vedere come potenza con esponente negativo.'); }
      if (x.t === 'f' && !vista['f' + x.n]) {
        vista['f' + x.n] = 1;
        const nomi = { sin: 'sen(x)\' = cos(x)', cos: 'cos(x)\' = −sen(x)', tan: 'tan(x)\' = 1/cos²(x)',
          ln: 'ln(x)\' = 1/x', exp: 'e^x resta e^x', sqrt: '√x\' = 1/(2√x)' };
        if (nomi[x.n]) r.push('<b>Funzione:</b> ' + nomi[x.n] + '.');
        if (contiene(x.a[0], v) && x.a[0].t !== 'v' && !vista.cat) { vista.cat = 1; r.push('<b>Funzione composta:</b> derivo la parte esterna e moltiplico per la derivata di quella interna.'); }
      }
      if (x.a) x.a.forEach(scorri);
      if (x.b) scorri(x.b);
      if (x.e) scorri(x.e);
    })(a);
    return r;
  }

  /* ================================================================
     LIMITI
     ================================================================ */

  function limitePassi(str, verso, v) {
    v = v || 'x';
    let a;
    try { a = M.analizza(str); } catch (e) { return esito('rosso', e.amichevole ? e.message : 'Non riesco a leggere questa funzione.'); }
    const passi = [];
    const infinito = /inf|∞/i.test(String(verso));
    const x0 = infinito ? (String(verso).indexOf('-') === 0 ? -Infinity : Infinity) : Number(String(verso).replace(',', '.'));

    passi.push(passo('Il limite da calcolare',
      '<div class="mate mate-blocco">lim<sub>' + v + ' → ' + (infinito ? (x0 < 0 ? '−∞' : '+∞') : numeroIt(x0)) + '</sub> ' + M.html(a) + '</div>', ''));

    const r = M.ratDaAst(a);

    if (infinito && r) {
      const gn = M.polGrado(r.n, v), gd = M.polGrado(r.d, v);
      const cn = M.polCoeffNum(r.n, v), cd = M.polCoeffNum(r.d, v);
      passi.push(passo('Guardo i gradi',
        '<div class="mate mate-blocco">grado sopra = ' + gn + ' &nbsp;&nbsp; grado sotto = ' + gd + '</div>',
        'Quando x tende all\'infinito comandano i termini di grado più alto.'));
      if (gn < gd) {
        passi.push(passo('Risultato', '<div class="mate mate-blocco">0</div>', 'Sotto cresce più in fretta di sopra: la frazione si schiaccia verso zero.'));
        return esito('verde', '', passi, { risultato: '0' });
      }
      if (gn === gd && cn && cd) {
        const q = M.fDiv(cn[gn], cd[gd]);
        passi.push(passo('Risultato', '<div class="mate mate-blocco">' + M.html(M.nNum(q)) + '</div>',
          'Stesso grado: il limite è il rapporto fra i due coefficienti principali.'));
        return esito('verde', '', passi, { risultato: M.fTesto(q) });
      }
      const segno = (cn && cd) ? Math.sign(M.fNum(cn[gn]) / M.fNum(cd[gd])) * (x0 < 0 && (gn - gd) % 2 ? -1 : 1) : 1;
      passi.push(passo('Risultato', '<div class="mate mate-blocco">' + (segno < 0 ? '−∞' : '+∞') + '</div>',
        'Sopra cresce più in fretta: il valore diventa sempre più grande.'));
      return esito('verde', '', passi, { risultato: segno < 0 ? '-inf' : '+inf' });
    }

    if (r && isFinite(x0)) {
      const num = valutaPol(r.n, v, x0), den = valutaPol(r.d, v, x0);
      passi.push(passo('Provo a sostituire',
        '<div class="mate mate-blocco">' + (den === null || num === null ? '?' :
          '<span class="frazione"><span class="sopra">' + numeroIt(num) + '</span><span class="sotto">' + numeroIt(den) + '</span></span>') + '</div>',
        'Il primo tentativo è sempre sostituire il valore.'));
      if (den !== null && Math.abs(den) > 1e-12) {
        const val = num / den;
        passi.push(passo('Risultato', '<div class="mate mate-blocco">' + numeroIt(val) + '</div>', 'La sostituzione funziona: il limite è questo valore.'));
        return esito('verde', '', passi, { risultato: val });
      }
      if (den !== null && Math.abs(num) < 1e-12) {
        passi.push(passo('Forma indeterminata 0/0', '<div class="mate mate-blocco"><span class="frazione"><span class="sopra">0</span><span class="sotto">0</span></span></div>',
          'Devo semplificare: sopra e sotto hanno un fattore in comune.',
          'Se sostituendo viene 0/0 non vuol dire che il limite non esiste: vuol dire che devo scomporre e semplificare.'));
        const semplificata = M.semplifica(a);
        const r2 = M.ratDaAst(semplificata);
        if (r2) {
          const n2 = valutaPol(r2.n, v, x0), d2 = valutaPol(r2.d, v, x0);
          if (d2 !== null && Math.abs(d2) > 1e-12) {
            passi.push(passo('Semplifico e risostituisco',
              '<div class="mate mate-blocco">' + M.html(semplificata) + ' → ' + numeroIt(n2 / d2) + '</div>',
              'Dopo la semplificazione la sostituzione funziona.'));
            return esito('verde', '', passi, { risultato: n2 / d2 });
          }
        }
      }
      if (den !== null && Math.abs(den) < 1e-12 && Math.abs(num) > 1e-12) {
        passi.push(passo('Il denominatore va a zero', '<div class="mate mate-blocco">→ ∞</div>',
          'Il numeratore resta diverso da zero: il valore cresce senza limite (attenzione al segno, guarda da che parte ti avvicini).'));
        return esito('giallo', 'Il limite è infinito: controlla il segno avvicinandoti da destra e da sinistra.', passi, {});
      }
    }

    // stima numerica dichiarata come tale
    const stima = stimaLimite(a, v, x0);
    if (stima === null) {
      return esito('rosso', 'Non riesco a calcolare questo limite in modo affidabile senza rischiare di inventare un passaggio.', passi);
    }
    passi.push(passo('Stima numerica',
      '<div class="mate mate-blocco">≈ ' + numeroIt(stima) + '</div>',
      'Non sono riuscito a fare i passaggi simbolici, quindi mi sono avvicinato con i numeri.',
      'Questo NON è un procedimento da scrivere sul compito: è solo un controllo per capire quanto viene.'));
    return esito('giallo', 'Questo è un valore approssimato, non un procedimento: usalo solo per controllare.', passi, { risultato: stima });
  }

  function valutaPol(P, v, x) {
    const c = M.polCoeffNum(P, v);
    if (!c) return null;
    let s = 0;
    for (let i = c.length - 1; i >= 0; i--) s = s * x + M.fNum(c[i]);
    return s;
  }
  function stimaLimite(a, v, x0) {
    try {
      const punti = isFinite(x0)
        ? [x0 + 1e-4, x0 - 1e-4, x0 + 1e-6, x0 - 1e-6]
        : [x0 > 0 ? 1e5 : -1e5, x0 > 0 ? 1e6 : -1e6];
      const val = punti.map((p) => { const s = {}; s[v] = p; return M.valuta(a, s); }).filter((x) => isFinite(x));
      if (val.length < 2) return null;
      const media = val.reduce((s, x) => s + x, 0) / val.length;
      const scarto = Math.max.apply(null, val.map((x) => Math.abs(x - media)));
      if (scarto > Math.max(1e-2, Math.abs(media) * 0.01)) return null;
      return Math.abs(media) < 1e-9 ? 0 : media;
    } catch (e) { return null; }
  }

  /* ================================================================
     INTEGRALI IMMEDIATI
     ================================================================ */

  function integralePassi(str, v) {
    v = v || 'x';
    let a;
    try { a = M.analizza(str); } catch (e) { return esito('rosso', e.amichevole ? e.message : 'Non riesco a leggere questa funzione.'); }
    const passi = [passo('L\'integrale da calcolare', '<div class="mate mate-blocco">∫ ' + M.html(a) + ' d' + v + '</div>', '')];
    const termini = [];
    const P = M.polDaAst(a);
    if (P) {
      const c = M.polCoeffNum(P, v);
      if (c) {
        const nuovi = [];
        c.forEach((f, i) => {
          if (M.fZero(f)) return;
          nuovi.push(M.nProd([M.nNum(M.fDiv(f, M.fr(i + 1))), M.nPot(M.nVar(v), M.nNum(M.fr(i + 1)))]));
        });
        passi.push(passo('Regola della potenza',
          '<div class="mate mate-blocco">∫ ' + v + '<sup>n</sup> d' + v + ' = <span class="frazione"><span class="sopra">' + v + '<sup>n+1</sup></span><span class="sotto">n+1</span></span> + c</div>',
          'Aumento di uno l\'esponente e divido per il nuovo esponente.'));
        const ris = M.semplifica(M.nSomma(nuovi.length ? nuovi : [M.nNum(M.F0)]));
        passi.push(passo('Risultato', '<div class="mate mate-blocco">' + M.html(ris) + ' + c</div>',
          'Non dimenticare la costante c: le primitive sono infinite.'));
        return esito('verde', '', passi, { risultato: ris });
      }
    }
    // funzioni elementari singole
    const tabella = [
      { test: (x) => x.t === 'f' && x.n === 'sin' && x.a[0].t === 'v', ris: (x) => '−cos(' + v + ')', reg: '∫ sen(x) dx = −cos(x) + c' },
      { test: (x) => x.t === 'f' && x.n === 'cos' && x.a[0].t === 'v', ris: () => 'sen(' + v + ')', reg: '∫ cos(x) dx = sen(x) + c' },
      { test: (x) => x.t === 'f' && x.n === 'exp' && x.a[0].t === 'v', ris: () => 'e<sup>' + v + '</sup>', reg: '∫ e^x dx = e^x + c' },
      { test: (x) => x.t === '^' && x.b.t === 'v' && x.e.t === 'n' && x.e.v.n === -1 && x.e.v.d === 1, ris: () => 'ln|' + v + '|', reg: '∫ 1/x dx = ln|x| + c' }
    ];
    const t = tabella.find((r) => r.test(a));
    if (t) {
      passi.push(passo('Integrale immediato', '<div class="mate mate-blocco">' + esc(t.reg) + '</div>', 'È una delle formule da sapere a memoria.'));
      passi.push(passo('Risultato', '<div class="mate mate-blocco">' + t.ris(a) + ' + c</div>', ''));
      return esito('verde', '', passi, {});
    }
    return esito('rosso', 'So calcolare solo gli integrali immediati: polinomi, seno, coseno, e^x e 1/x. Per sostituzione o per parti serve il ragionamento, e non voglio inventarlo.', passi);
  }

  /* ================================================================
     RETTA E PARABOLA
     ================================================================ */

  function studioRetta(str) {
    const t = M.normalizzaTesto(str).replace(/^y\s*=\s*/i, '');
    let a;
    try { a = M.analizza(t); } catch (e) { return esito('rosso', 'Scrivi la retta così: y = 2x + 3'); }
    const P = M.polDaAst(a);
    if (!P) return esito('rosso', 'Scrivi la retta così: y = 2x + 3');
    const c = M.polCoeffNum(P, 'x');
    if (!c || c.length > 2) return esito('rosso', 'Questa non è una retta: c\'è una potenza della x.');
    const m = c[1] || M.F0, q = c[0] || M.F0;
    const passi = [
      passo('La retta', '<div class="mate mate-blocco">y = ' + M.html(a) + '</div>', ''),
      passo('Coefficiente angolare', '<div class="mate mate-blocco">m = ' + M.html(M.nNum(m)) + '</div>',
        'm dice quanto è ripida la retta: ' + (M.fNum(m) > 0 ? 'sale da sinistra a destra.' : M.fNum(m) < 0 ? 'scende da sinistra a destra.' : 'è orizzontale.'),
        'Il coefficiente angolare è "di quanto salgo se vado avanti di 1".'),
      passo('Intersezione con l\'asse y', '<div class="mate mate-blocco">q = ' + M.html(M.nNum(q)) + ' → punto (0; ' + M.fTesto(q) + ')</div>',
        'q è il punto in cui la retta taglia l\'asse verticale.')
    ];
    if (!M.fZero(m)) {
      const zero = M.fDiv(M.fNeg(q), m);
      passi.push(passo('Intersezione con l\'asse x', '<div class="mate mate-blocco">(' + nt(zero) + '; 0)</div>',
        'Metto y = 0 e risolvo.'));
    }
    return esito('verde', '', passi, { m, q, funzione: t });
  }

  function studioParabola(str) {
    const t = M.normalizzaTesto(str).replace(/^y\s*=\s*/i, '');
    let a;
    try { a = M.analizza(t); } catch (e) { return esito('rosso', 'Scrivi la parabola così: y = x^2 - 4x + 3'); }
    const P = M.polDaAst(a);
    const c = P ? M.polCoeffNum(P, 'x') : null;
    if (!c || c.length !== 3) return esito('rosso', 'Scrivi una parabola di questo tipo: y = x² − 4x + 3');
    const A = c[2], B = c[1] || M.F0, C = c[0] || M.F0;
    const delta = M.fSub(M.fMul(B, B), M.fMul(M.fr(4), M.fMul(A, C)));
    const xv = M.fDiv(M.fNeg(B), M.fMul(M.fr(2), A));
    const yv = M.fDiv(M.fNeg(delta), M.fMul(M.fr(4), A));
    const passi = [
      passo('La parabola', '<div class="mate mate-blocco">y = ' + M.html(a) + '</div>', ''),
      passo('a, b, c', '<div class="mate mate-blocco">a = ' + M.html(M.nNum(A)) + ' &nbsp; b = ' + M.html(M.nNum(B)) + ' &nbsp; c = ' + M.html(M.nNum(C)) + '</div>', ''),
      passo('Concavità', '<div class="mate mate-blocco">' + (M.fNum(A) > 0 ? 'verso l\'alto ∪' : 'verso il basso ∩') + '</div>',
        M.fNum(A) > 0 ? 'a è positivo: la parabola "sorride".' : 'a è negativo: la parabola è girata in giù.'),
      passo('Asse di simmetria', '<div class="mate mate-blocco">x = ' + M.html(M.nNum(xv)) + '</div>', 'È la retta verticale che divide la parabola in due parti uguali.'),
      passo('Vertice', '<div class="mate mate-blocco">V(' + nt(xv) + '; ' + nt(yv) + ')</div>',
        'Il vertice è il punto più basso (o più alto) della parabola.'),
      passo('Delta', '<div class="mate mate-blocco">Δ = ' + M.html(M.nNum(delta)) + '</div>',
        M.fNum(delta) > 0 ? 'Δ > 0: taglia l\'asse x in due punti.' : M.fNum(delta) === 0 ? 'Δ = 0: tocca l\'asse x in un punto solo.' : 'Δ < 0: non tocca mai l\'asse x.')
    ];
    const dn = M.fNum(delta);
    if (dn >= 0) {
      const r = Math.sqrt(dn), an = M.fNum(A), bn = M.fNum(B);
      passi.push(passo('Intersezioni con l\'asse x',
        '<div class="mate mate-blocco">(' + numeroIt((-bn - r) / (2 * an)) + '; 0) &nbsp;&nbsp; (' + numeroIt((-bn + r) / (2 * an)) + '; 0)</div>',
        'Metto y = 0 e risolvo l\'equazione di secondo grado.'));
    }
    passi.push(passo('Intersezione con l\'asse y', '<div class="mate mate-blocco">(0; ' + nt(C) + ')</div>', 'Metto x = 0: resta il termine noto.'));
    return esito('verde', '', passi, { a: A, b: B, c: C, vertice: { x: xv, y: yv }, delta, funzione: t });
  }

  /* ================================================================
     Utilità condivise
     ================================================================ */

  function numeroIt(x) {
    if (!isFinite(x)) return x > 0 ? '+∞' : '−∞';
    if (Math.abs(x) < 1e-12) return '0';
    const arrotondato = Math.round(x * 1e6) / 1e6;
    let s = String(arrotondato);
    if (Math.abs(arrotondato) >= 1e9 || (Math.abs(arrotondato) < 1e-4 && arrotondato !== 0)) s = arrotondato.toExponential(4);
    return s.replace('.', ',').replace('-', '−');
  }

  return {
    risolviEquazione, risolviDisequazione, risolviSistema,
    espandi, scomponi, derivata, derivataPassi, limitePassi, integralePassi,
    studioRetta, studioParabola, controllaRisultato, numeroIt, contiene,
    passaggioEquivalente, prossimaMossa, esitoFinale, coefficientiRiga
  };
})();

