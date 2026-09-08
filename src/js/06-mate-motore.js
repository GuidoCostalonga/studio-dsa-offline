/* ==================================================================
   06-mate-motore.js — motore matematico locale

   Scritto apposta per questa applicazione: nessuna libreria esterna,
   nessuna connessione. Lavora in modo ESATTO con le frazioni
   (niente errori di arrotondamento tipo 0.30000000000000004).

   Cosa sa fare davvero:
   - leggere un'espressione scritta come sul quaderno;
   - lavorare con polinomi anche a più lettere e con frazioni algebriche;
   - risolvere equazioni di 1° e 2° grado, fratte e alcune di grado
     superiore (quando si scompongono con radici razionali);
   - disequazioni di 1° e 2° grado;
   - sistemi lineari di due equazioni;
   - derivate (regole scolastiche complete);
   - limiti (sostituzione + cancellazione di fattori comuni, oppure
     stima numerica dichiarata come tale);
   - integrali immediati elementari.

   Cosa NON sa fare (e lo dice): trigonometria simbolica avanzata,
   integrali per parti/sostituzione, equazioni trascendenti generiche.
   ================================================================== */

const M = (function () {

  /* ================================================================
     1. FRAZIONI ESATTE
     ================================================================ */

  function mcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { const t = a % b; a = b; b = t; } return a || 1; }

  function fr(n, d) {
    if (d === undefined) d = 1;
    if (!isFinite(n) || !isFinite(d) || d === 0) throw errore('Qui c\'è una divisione per zero.');
    if (!Number.isInteger(n) || !Number.isInteger(d)) {
      // trasformo un decimale in frazione esatta (0,25 → 1/4)
      const p = Math.max(decimali(n), decimali(d));
      const k = Math.pow(10, p);
      n = Math.round(n * k); d = Math.round(d * k);
    }
    if (d < 0) { n = -n; d = -d; }
    const g = mcd(n, d);
    return { n: n / g, d: d / g };
  }
  function decimali(x) {
    const s = String(x);
    const i = s.indexOf('.');
    return i < 0 ? 0 : Math.min(9, s.length - i - 1);
  }
  const F0 = fr(0), F1 = fr(1);
  const fAdd = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
  const fSub = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
  const fMul = (a, b) => fr(a.n * b.n, a.d * b.d);
  const fDiv = (a, b) => { if (b.n === 0) throw errore('Non si può dividere per zero.'); return fr(a.n * b.d, a.d * b.n); };
  const fNeg = (a) => ({ n: -a.n, d: a.d });
  const fZero = (a) => a.n === 0;
  const fUno = (a) => a.n === 1 && a.d === 1;
  const fInt = (a) => a.d === 1;
  const fNum = (a) => a.n / a.d;
  const fCmp = (a, b) => (a.n * b.d - b.n * a.d);
  function fPow(a, k) {
    if (k === 0) return F1;
    if (k < 0) return fDiv(F1, fPow(a, -k));
    let r = F1;
    for (let i = 0; i < k; i++) r = fMul(r, a);
    return r;
  }
  /** "3/4" oppure "5" oppure "-1,5" → testo leggibile. */
  function fTesto(a) { return a.d === 1 ? String(a.n) : a.n + '/' + a.d; }
  function fDecimale(a, cifre) {
    const v = fNum(a);
    if (fInt(a)) return String(a.n);
    const s = v.toFixed(cifre === undefined ? 4 : cifre).replace(/0+$/, '').replace(/\.$/, '');
    return s.replace('.', ',');
  }

  function errore(msg) { const e = new Error(msg); e.amichevole = true; return e; }

  /* ================================================================
     2. LETTURA DELL'ESPRESSIONE (tokenizer + parser)
     ================================================================ */

  const FUNZIONI = ['sqrt', 'radq', 'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'sen',
    'log', 'ln', 'log10', 'log2', 'abs', 'exp'];

  function normalizzaTesto(s) {
    return String(s || '')
      .replace(/ /g, ' ')
      .replace(/[−–—]/g, '-')
      .replace(/[×·∙]/g, '*')
      .replace(/[÷:]/g, '/')
      .replace(/√/g, 'sqrt')
      .replace(/π/g, 'pi')
      .replace(/²/g, '^2').replace(/³/g, '^3')
      .replace(/⁰/g, '^0').replace(/¹/g, '^1')
      .replace(/⁴/g, '^4').replace(/⁵/g, '^5').replace(/⁶/g, '^6')
      .replace(/⁷/g, '^7').replace(/⁸/g, '^8').replace(/⁹/g, '^9')
      .replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=')
      .replace(/,(?=\d)/g, '.')                 // 0,5 → 0.5
      .replace(/\bsen\b/g, 'sin')
      .replace(/\bradq\b/g, 'sqrt')
      .trim();
  }

  function tokenizza(s) {
    const t = [];
    let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (/\s/.test(c)) { i++; continue; }
      if (/[0-9.]/.test(c)) {
        let j = i;
        while (j < s.length && /[0-9.]/.test(s[j])) j++;
        const num = s.slice(i, j);
        if ((num.match(/\./g) || []).length > 1) throw errore('Ho trovato un numero scritto male: "' + num + '".');
        t.push({ t: 'num', v: Number(num) });
        i = j; continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (j < s.length && /[A-Za-z_0-9]/.test(s[j])) j++;
        let nome = s.slice(i, j);
        // "2xy" → x per y: separo le lettere se non è una funzione conosciuta
        if (FUNZIONI.indexOf(nome.toLowerCase()) >= 0 || nome === 'pi') {
          t.push({ t: nome === 'pi' ? 'cost' : 'fn', v: nome.toLowerCase() });
        } else {
          for (let k = 0; k < nome.length; k++) t.push({ t: 'var', v: nome[k] });
        }
        i = j; continue;
      }
      if ('+-*/^()!'.indexOf(c) >= 0) { t.push({ t: c }); i++; continue; }
      if (c === '=' || c === '<' || c === '>') {
        if (s[i + 1] === '=') { t.push({ t: c + '=' }); i += 2; } else { t.push({ t: c }); i++; }
        continue;
      }
      throw errore('Non capisco il simbolo "' + c + '".');
    }
    return t;
  }

  /** Analizza il testo e costruisce l'albero dell'espressione. */
  function analizza(testo) {
    const tok = tokenizza(normalizzaTesto(testo));
    let p = 0;
    const guarda = () => tok[p];
    const prendi = () => tok[p++];

    function espressione() {
      let a = termine();
      while (guarda() && (guarda().t === '+' || guarda().t === '-')) {
        const op = prendi().t;
        const b = termine();
        a = op === '+' ? nSomma([a, b]) : nSomma([a, nProd([nNum(fr(-1)), b])]);
      }
      return a;
    }
    function termine() {
      let a = unario();
      for (;;) {
        const g = guarda();
        if (!g) break;
        if (g.t === '*') { prendi(); a = nProd([a, unario()]); continue; }
        if (g.t === '/') { prendi(); a = nDiv(a, unario()); continue; }
        // moltiplicazione implicita: 2x, 3(x+1), x y, 2sin(x)
        if (g.t === 'num' || g.t === 'var' || g.t === '(' || g.t === 'fn' || g.t === 'cost') {
          a = nProd([a, unario()]); continue;
        }
        break;
      }
      return a;
    }
    function unario() {
      const g = guarda();
      if (!g) throw errore('L\'espressione finisce troppo presto.');
      if (g.t === '-') { prendi(); return nProd([nNum(fr(-1)), unario()]); }
      if (g.t === '+') { prendi(); return unario(); }
      return potenza();
    }
    function potenza() {
      let base = atomo();
      const g = guarda();
      if (g && g.t === '!') { prendi(); base = { t: 'f', n: 'fatt', a: [base] }; }
      const g2 = guarda();
      if (g2 && g2.t === '^') {
        prendi();
        const esp = unario();          // l'esponente si legge da destra: 2^3^2
        return nPot(base, esp);
      }
      return base;
    }
    function atomo() {
      const g = prendi();
      if (!g) throw errore('Manca qualcosa alla fine dell\'espressione.');
      if (g.t === 'num') return nNum(fr(g.v));
      if (g.t === 'var') return { t: 'v', n: g.v };
      if (g.t === 'cost') return { t: 'c', n: 'pi' };
      if (g.t === 'fn') {
        let arg;
        if (guarda() && guarda().t === '(') { prendi(); arg = espressione(); attendi(')'); }
        else arg = potenza();
        return { t: 'f', n: g.v, a: [arg] };
      }
      if (g.t === '(') { const e = espressione(); attendi(')'); return e; }
      throw errore('Non riesco a leggere questa parte dell\'espressione.');
    }
    function attendi(simbolo) {
      const g = prendi();
      if (!g || g.t !== simbolo) throw errore('Manca una parentesi: controlla che ogni "(" abbia la sua ")".');
    }

    const out = espressione();
    if (p < tok.length) throw errore('C\'è qualcosa di troppo nell\'espressione. Controlla i simboli.');
    return out;
  }

  /* ================================================================
     3. COSTRUTTORI DI NODI
     ================================================================ */

  const nNum = (f) => ({ t: 'n', v: f });
  const nVar = (n) => ({ t: 'v', n });
  /* Le somme e i prodotti vengono "appiattiti": così l'espressione viene
     scritta senza parentesi inutili (3x + 4y − 7 e non ((3x + 4y) − 7)). */
  function nSomma(a) {
    const out = [];
    a.forEach((x) => { if (x && x.t === '+') out.push.apply(out, x.a); else out.push(x); });
    return { t: '+', a: out };
  }
  function nProd(a) {
    const out = [];
    a.forEach((x) => { if (x && x.t === '*') out.push.apply(out, x.a); else out.push(x); });
    return { t: '*', a: out };
  }
  function nPot(b, e) { return { t: '^', b, e }; }
  function nDiv(a, b) { return nProd([a, nPot(b, nNum(fr(-1)))]); }

  const eNum = (x) => x.t === 'n';
  const eZero = (x) => x.t === 'n' && fZero(x.v);
  const eUno = (x) => x.t === 'n' && fUno(x.v);

  /* ================================================================
     4. POLINOMI A PIÙ LETTERE  (cuore del motore)
        Un polinomio è una mappa: monomio → coefficiente frazionario.
        Il monomio è scritto come {x:2, y:1} (cioè x²y).
     ================================================================ */

  function chiaveMon(m) {
    const k = Object.keys(m).filter((v) => m[v] !== 0).sort();
    return k.map((v) => v + '^' + m[v]).join('*');
  }
  function monDaChiave(k) {
    const m = {};
    if (!k) return m;
    k.split('*').forEach((p) => { const [v, e] = p.split('^'); m[v] = Number(e); });
    return m;
  }

  function pol() { return {}; }                      // polinomio vuoto = 0
  function polCost(f) { const p = {}; if (!fZero(f)) p[''] = f; return p; }
  function polVar(v) { const p = {}; p[v + '^1'] = F1; return p; }

  function polSomma(A, B) {
    const R = {};
    Object.keys(A).forEach((k) => { R[k] = A[k]; });
    Object.keys(B).forEach((k) => {
      R[k] = R[k] ? fAdd(R[k], B[k]) : B[k];
      if (fZero(R[k])) delete R[k];
    });
    return R;
  }
  function polScala(A, f) {
    const R = {};
    if (fZero(f)) return R;
    Object.keys(A).forEach((k) => { R[k] = fMul(A[k], f); });
    return R;
  }
  function polSottrai(A, B) { return polSomma(A, polScala(B, fr(-1))); }
  function polProdotto(A, B) {
    const R = {};
    Object.keys(A).forEach((ka) => {
      const ma = monDaChiave(ka);
      Object.keys(B).forEach((kb) => {
        const mb = monDaChiave(kb);
        const m = Object.assign({}, ma);
        Object.keys(mb).forEach((v) => { m[v] = (m[v] || 0) + mb[v]; });
        const k = chiaveMon(m);
        const c = fMul(A[ka], B[kb]);
        R[k] = R[k] ? fAdd(R[k], c) : c;
        if (fZero(R[k])) delete R[k];
      });
    });
    return R;
  }
  function polPotenza(A, k) {
    let r = polCost(F1);
    for (let i = 0; i < k; i++) r = polProdotto(r, A);
    return r;
  }
  function polZero(A) { return Object.keys(A).length === 0; }
  function polCostante(A) { return Object.keys(A).every((k) => k === ''); }
  function polValoreCost(A) { return A[''] || F0; }
  function polVariabili(A) {
    const s = {};
    Object.keys(A).forEach((k) => Object.keys(monDaChiave(k)).forEach((v) => { s[v] = 1; }));
    return Object.keys(s).sort();
  }
  function polGrado(A, v) {
    let g = 0;
    Object.keys(A).forEach((k) => {
      const m = monDaChiave(k);
      if (v) g = Math.max(g, m[v] || 0);
      else g = Math.max(g, Object.keys(m).reduce((s, x) => s + m[x], 0));
    });
    return g;
  }
  /** Coefficienti rispetto a una lettera: [c0, c1, c2, ...] (ognuno è un polinomio). */
  function polCoeff(A, v) {
    const g = polGrado(A, v);
    const out = [];
    for (let i = 0; i <= g; i++) out.push(pol());
    Object.keys(A).forEach((k) => {
      const m = monDaChiave(k);
      const e = m[v] || 0;
      delete m[v];
      const k2 = chiaveMon(m);
      const R = out[e];
      R[k2] = R[k2] ? fAdd(R[k2], A[k]) : A[k];
      if (fZero(R[k2])) delete R[k2];
    });
    return out;
  }
  /** Coefficienti numerici (solo se il polinomio ha una sola lettera). */
  function polCoeffNum(A, v) {
    const c = polCoeff(A, v);
    const out = [];
    for (let i = 0; i < c.length; i++) {
      if (!polCostante(c[i])) return null;
      out.push(polValoreCost(c[i]));
    }
    return out;
  }

  /** Espressione → polinomio, oppure null se non è un polinomio. */
  function polDaAst(a) {
    if (!a) return null;
    if (a.t === 'n') return polCost(a.v);
    if (a.t === 'v') return polVar(a.n);
    if (a.t === 'c') return null;                    // π non è razionale
    if (a.t === '+') {
      let r = pol();
      for (const x of a.a) { const p = polDaAst(x); if (!p) return null; r = polSomma(r, p); }
      return r;
    }
    if (a.t === '*') {
      let r = polCost(F1);
      for (const x of a.a) { const p = polDaAst(x); if (!p) return null; r = polProdotto(r, p); }
      return r;
    }
    if (a.t === '^') {
      const e = a.e;
      if (e.t !== 'n' || !fInt(e.v)) return null;
      const k = e.v.n;
      const b = polDaAst(a.b);
      if (!b) return null;
      if (k >= 0) return polPotenza(b, k);
      // potenza negativa: solo se la base è una costante
      if (polCostante(b)) { const c = polValoreCost(b); if (fZero(c)) return null; return polCost(fPow(c, k)); }
      return null;
    }
    return null;
  }

  /** Polinomio → espressione ordinata (grado decrescente). */
  function polAAst(A, ordine) {
    const chiavi = Object.keys(A);
    if (!chiavi.length) return nNum(F0);
    const v = ordine || polVariabili(A);
    chiavi.sort((a, b) => {
      const ma = monDaChiave(a), mb = monDaChiave(b);
      const ga = Object.keys(ma).reduce((s, x) => s + ma[x], 0);
      const gb = Object.keys(mb).reduce((s, x) => s + mb[x], 0);
      if (ga !== gb) return gb - ga;
      for (const x of v) { if ((mb[x] || 0) !== (ma[x] || 0)) return (mb[x] || 0) - (ma[x] || 0); }
      return a < b ? -1 : 1;
    });
    const termini = chiavi.map((k) => {
      const m = monDaChiave(k);
      const c = A[k];
      const fattori = [];
      if (!fUno(c) || !Object.keys(m).length) fattori.push(nNum(c));
      Object.keys(m).sort().forEach((x) => {
        fattori.push(m[x] === 1 ? nVar(x) : nPot(nVar(x), nNum(fr(m[x]))));
      });
      return fattori.length === 1 ? fattori[0] : nProd(fattori);
    });
    return termini.length === 1 ? termini[0] : nSomma(termini);
  }

  /* ---- divisione fra polinomi di UNA lettera ---------------------- */
  /** [c0,c1,...] / [d0,d1,...] → {q, r} */
  function divisioneNum(a, b) {
    a = a.slice();
    const q = new Array(Math.max(0, a.length - b.length + 1)).fill(F0);
    const gb = b.length - 1;
    if (fZero(b[gb])) return null;
    for (let i = a.length - 1; i >= gb; i--) {
      if (fZero(a[i])) continue;
      const c = fDiv(a[i], b[gb]);
      q[i - gb] = c;
      for (let j = 0; j <= gb; j++) a[i - gb + j] = fSub(a[i - gb + j], fMul(c, b[j]));
    }
    while (a.length > 1 && fZero(a[a.length - 1])) a.pop();
    return { q, r: a };
  }

  /* ================================================================
     5. FUNZIONI RAZIONALI (frazioni algebriche)
     ================================================================ */

  function rat(n, d) { return { n, d: d || polCost(F1) }; }
  function ratDaAst(a) {
    if (!a) return null;
    if (a.t === 'n') return rat(polCost(a.v));
    if (a.t === 'v') return rat(polVar(a.n));
    if (a.t === '+') {
      let r = rat(pol());
      for (const x of a.a) {
        const p = ratDaAst(x); if (!p) return null;
        r = rat(polSomma(polProdotto(r.n, p.d), polProdotto(p.n, r.d)), polProdotto(r.d, p.d));
      }
      return r;
    }
    if (a.t === '*') {
      let r = rat(polCost(F1));
      for (const x of a.a) {
        const p = ratDaAst(x); if (!p) return null;
        r = rat(polProdotto(r.n, p.n), polProdotto(r.d, p.d));
      }
      return r;
    }
    if (a.t === '^') {
      if (a.e.t !== 'n' || !fInt(a.e.v)) return null;
      const k = a.e.v.n;
      const b = ratDaAst(a.b); if (!b) return null;
      if (k >= 0) return rat(polPotenza(b.n, k), polPotenza(b.d, k));
      return rat(polPotenza(b.d, -k), polPotenza(b.n, -k));
    }
    return null;
  }

  /* ================================================================
     6. VALUTAZIONE NUMERICA
     ================================================================ */

  function valuta(a, scope) {
    scope = scope || {};
    switch (a.t) {
      case 'n': return fNum(a.v);
      case 'c': return Math.PI;
      case 'v': {
        if (a.n in scope) return scope[a.n];
        if (a.n === 'e') return Math.E;
        throw errore('Non so quanto vale "' + a.n + '".');
      }
      case '+': return a.a.reduce((s, x) => s + valuta(x, scope), 0);
      case '*': return a.a.reduce((s, x) => s * valuta(x, scope), 1);
      case '^': return Math.pow(valuta(a.b, scope), valuta(a.e, scope));
      case 'f': {
        const x = valuta(a.a[0], scope);
        switch (a.n) {
          case 'sqrt': if (x < 0) throw errore('Non esiste la radice quadrata di un numero negativo.'); return Math.sqrt(x);
          case 'sin': return Math.sin(x);
          case 'cos': return Math.cos(x);
          case 'tan': return Math.tan(x);
          case 'asin': return Math.asin(x);
          case 'acos': return Math.acos(x);
          case 'atan': return Math.atan(x);
          case 'ln': return Math.log(x);
          case 'log': case 'log10': return Math.log10(x);
          case 'log2': return Math.log2(x);
          case 'abs': return Math.abs(x);
          case 'exp': return Math.exp(x);
          case 'fatt': {
            if (x < 0 || !Number.isInteger(x)) throw errore('Il fattoriale si può fare solo con numeri interi maggiori o uguali a zero.');
            if (x > 170) throw errore('Questo fattoriale è un numero troppo grande.');
            let r = 1; for (let i = 2; i <= x; i++) r *= i; return r;
          }
        }
        throw errore('Non conosco la funzione "' + a.n + '".');
      }
    }
    throw errore('Espressione non valida.');
  }

  /* ================================================================
     7. SEMPLIFICAZIONE
     ================================================================ */

  function semplifica(a) {
    const r = ratDaAst(a);
    if (r) {
      if (polZero(r.n)) return nNum(F0);
      if (polCostante(r.d)) {
        const c = polValoreCost(r.d);
        if (!fZero(c)) return polAAst(polScala(r.n, fDiv(F1, c)));
      }
      // provo a semplificare numeratore e denominatore con una lettera sola
      const vs = polVariabili(polProdotto(r.n, r.d));
      if (vs.length === 1) {
        const cn = polCoeffNum(r.n, vs[0]), cd = polCoeffNum(r.d, vs[0]);
        if (cn && cd) {
          const s = semplificaFrazionePoli(cn, cd, vs[0]);
          if (s) return s;
        }
      }
      return nDiv(polAAst(r.n), polAAst(r.d));
    }
    return semplificaGenerico(a);
  }

  function semplificaFrazionePoli(cn, cd, v) {
    // cerco radici comuni razionali e divido
    let num = cn.slice(), den = cd.slice();
    let cambiato = false;
    for (let giro = 0; giro < 6; giro++) {
      const radici = radiciRazionali(num);
      let fatto = false;
      for (const rr of radici) {
        const div = [fNeg(rr), F1];
        const a = divisioneNum(num, div), b = divisioneNum(den, div);
        if (a && b && gradoZero(a.r) && gradoZero(b.r)) {
          num = a.q; den = b.q; cambiato = true; fatto = true; break;
        }
      }
      if (!fatto) break;
    }
    if (!cambiato) return null;
    const N = daCoeff(num, v), D = daCoeff(den, v);
    if (polCostante(D)) {
      const c = polValoreCost(D);
      if (!fZero(c)) return polAAst(polScala(N, fDiv(F1, c)));
    }
    return nDiv(polAAst(N), polAAst(D));
  }
  function gradoZero(r) { return r.every((x) => fZero(x)); }
  function daCoeff(c, v) {
    let P = pol();
    c.forEach((f, i) => {
      if (fZero(f)) return;
      const m = {}; if (i) m[v] = i;
      P[chiaveMon(m)] = f;
    });
    return P;
  }

  /** Semplificazione generale, per espressioni con seno, logaritmi, radici... */
  function semplificaGenerico(a) {
    if (!a || a.t === 'n' || a.t === 'v' || a.t === 'c') return a;
    if (a.t === 'f') {
      const arg = semplifica(a.a[0]);
      if (arg.t === 'n') {
        try {
          const v = valuta({ t: 'f', n: a.n, a: [arg] });
          if (Number.isInteger(v * 1e6) && Math.abs(v) < 1e9) {
            const f = fr(Math.round(v * 1e6), 1e6);
            if (Math.abs(fNum(f) - v) < 1e-12) return nNum(f);
          }
        } catch (e) { /* lo lascio simbolico */ }
      }
      return { t: 'f', n: a.n, a: [arg] };
    }
    if (a.t === '^') {
      const b = semplifica(a.b), e = semplifica(a.e);
      if (eZero(e)) return nNum(F1);
      if (eUno(e)) return b;
      if (eUno(b)) return nNum(F1);
      if (b.t === 'n' && e.t === 'n' && fInt(e.v) && Math.abs(e.v.n) < 40) return nNum(fPow(b.v, e.v.n));
      return nPot(b, e);
    }
    if (a.t === '+') {
      const parti = [];
      let cost = F0;
      const mappa = {};                       // termine simile → coefficiente
      const appiattisci = (x) => { if (x.t === '+') x.a.forEach(appiattisci); else parti.push(semplifica(x)); };
      a.a.forEach(appiattisci);
      parti.forEach((x) => {
        if (x.t === 'n') { cost = fAdd(cost, x.v); return; }
        const { coef, resto } = staccaCoefficiente(x);
        const k = testo(resto);
        if (mappa[k]) mappa[k].c = fAdd(mappa[k].c, coef);
        else mappa[k] = { c: coef, nodo: resto };
      });
      const out = [];
      Object.keys(mappa).forEach((k) => {
        const { c, nodo } = mappa[k];
        if (fZero(c)) return;
        out.push(fUno(c) ? nodo : nProd([nNum(c), nodo]));
      });
      if (!fZero(cost) || !out.length) out.push(nNum(cost));
      return out.length === 1 ? out[0] : nSomma(out);
    }
    if (a.t === '*') {
      const parti = [];
      let cost = F1;
      const appiattisci = (x) => { if (x.t === '*') x.a.forEach(appiattisci); else parti.push(semplifica(x)); };
      a.a.forEach(appiattisci);
      const altri = [];
      for (const x of parti) {
        if (x.t === 'n') { cost = fMul(cost, x.v); continue; }
        altri.push(x);
      }
      if (fZero(cost)) return nNum(F0);
      // raggruppo le potenze uguali:  x * x → x^2
      const basi = [];
      altri.forEach((x) => {
        const b = x.t === '^' ? x.b : x;
        const e = x.t === '^' ? x.e : nNum(F1);
        const k = testo(b);
        const g = basi.find((y) => y.k === k);
        if (g && g.e.t === 'n' && e.t === 'n') g.e = nNum(fAdd(g.e.v, e.v));
        else basi.push({ k, b, e });
      });
      const fattori = basi.map((g) => (eUno(g.e) ? g.b : nPot(g.b, g.e))).filter((x) => !eUno(x));
      if (!fUno(cost) || !fattori.length) fattori.unshift(nNum(cost));
      return fattori.length === 1 ? fattori[0] : nProd(fattori);
    }
    return a;
  }

  function staccaCoefficiente(x) {
    if (x.t === '*') {
      let c = F1; const resto = [];
      x.a.forEach((y) => { if (y.t === 'n') c = fMul(c, y.v); else resto.push(y); });
      if (!resto.length) return { coef: c, resto: nNum(F1) };
      return { coef: c, resto: resto.length === 1 ? resto[0] : nProd(resto) };
    }
    return { coef: F1, resto: x };
  }

  /* ================================================================
     8. SCRITTURA: testo, HTML "come sul quaderno", lettura ad alta voce
     ================================================================ */

  const PREC = { '+': 1, '*': 2, '^': 3 };

  function testo(a) {
    if (!a) return '';
    switch (a.t) {
      case 'n': return fTesto(a.v);
      case 'v': return a.n;
      case 'c': return 'π';
      case '+': return a.a.map((x, i) => {
        const s = testo(x);
        if (i === 0) return s;
        return s.startsWith('-') ? ' - ' + s.slice(1) : ' + ' + s;
      }).join('');
      case '*': return a.a.map((x) => (x.t === '+' ? '(' + testo(x) + ')' : testo(x))).join('·');
      case '^': return (PREC[a.b.t] ? '(' + testo(a.b) + ')' : testo(a.b)) + '^' + (PREC[a.e.t] ? '(' + testo(a.e) + ')' : testo(a.e));
      case 'f': return (a.n === 'fatt' ? testo(a.a[0]) + '!' : a.n + '(' + testo(a.a[0]) + ')');
    }
    return '?';
  }

  /** HTML con frazioni impilate, esponenti veri e radici con il tetto. */
  function html(a, dentro) {
    if (!a) return '';
    switch (a.t) {
      case 'n': {
        if (a.v.d === 1) return String(a.v.n).replace('-', '−');
        const seg = a.v.n < 0 ? '−' : '';
        return seg + frazioneHtml(String(Math.abs(a.v.n)), String(a.v.d));
      }
      case 'v': return '<i>' + esc(a.n) + '</i>';
      case 'c': return 'π';
      case '+': {
        const s = a.a.map((x, i) => {
          const neg = eNegativo(x);
          const corpo = html(neg ? cambiaSegno(x) : x, true);
          if (i === 0) return (neg ? '<span class="operatore">−</span>' : '') + corpo;
          return '<span class="operatore">' + (neg ? '−' : '+') + '</span>' + corpo;
        }).join('');
        return dentro ? '(' + s + ')' : s;
      }
      case '*': {
        // se è una divisione la scrivo come frazione
        const den = [], num = [];
        a.a.forEach((x) => {
          if (x.t === '^' && x.e.t === 'n' && x.e.v.n < 0 && x.e.v.d === 1) {
            den.push(x.e.v.n === -1 ? x.b : nPot(x.b, nNum(fr(-x.e.v.n))));
          } else num.push(x);
        });
        if (den.length) {
          const n = num.length ? (num.length === 1 ? html(num[0]) : num.map((x) => html(x, true)).join('')) : '1';
          const d = den.length === 1 ? html(den[0]) : den.map((x) => html(x, true)).join('');
          return frazioneHtml(n, d);
        }
        return a.a.map((x, i) => {
          const s = html(x, x.t === '+');
          if (i > 0 && (x.t === 'n' || (x.t === '^' && x.b.t === 'n'))) return '<span class="operatore">·</span>' + s;
          return s;
        }).join('');
      }
      case '^': {
        if (a.e.t === 'n' && a.e.v.d === 2 && a.e.v.n === 1) return radiceHtml(html(a.b));
        const b = (a.b.t === '+' || a.b.t === '*' || a.b.t === '^' || eNegativo(a.b)) ? '(' + html(a.b) + ')' : html(a.b);
        return b + '<sup>' + html(a.e) + '</sup>';
      }
      case 'f': {
        if (a.n === 'sqrt') return radiceHtml(html(a.a[0]));
        if (a.n === 'fatt') return html(a.a[0], true) + '!';
        const nome = { ln: 'ln', log: 'log', log10: 'log', log2: 'log<sub>2</sub>' }[a.n] || a.n;
        return nome + '(' + html(a.a[0]) + ')';
      }
    }
    return '?';
  }
  /** Come html(), ma mette le parentesi se il pezzo è negativo o è una somma:
      serve per non scrivere cose ambigue come -5² al posto di (−5)². */
  function htmlP(a) {
    const s = html(a);
    const serve = (a.t === '+' && a.a.length > 1) || (a.t === 'n' && a.v.n < 0) || eNegativo(a);
    return serve ? '(' + s + ')' : s;
  }

  /** Sostituisce una lettera con un numero: serve per le verifiche. */
  function sostituisci(a, v, valore) {
    if (!a) return a;
    switch (a.t) {
      case 'v': return a.n === v ? nNum(valore) : a;
      case '+': return { t: '+', a: a.a.map((x) => sostituisci(x, v, valore)) };
      case '*': return { t: '*', a: a.a.map((x) => sostituisci(x, v, valore)) };
      case '^': return { t: '^', b: sostituisci(a.b, v, valore), e: sostituisci(a.e, v, valore) };
      case 'f': return { t: 'f', n: a.n, a: [sostituisci(a.a[0], v, valore)] };
    }
    return a;
  }

  function frazioneHtml(n, d) {
    return '<span class="frazione"><span class="sopra">' + n + '</span><span class="sotto">' + d + '</span></span>';
  }
  function radiceHtml(dentro) {
    return '<span class="radice"><span class="segno">√</span><span class="dentro">' + dentro + '</span></span>';
  }
  function eNegativo(x) {
    if (x.t === 'n') return x.v.n < 0;
    if (x.t === '*') return x.a.some((y) => y.t === 'n' && y.v.n < 0);
    return false;
  }
  /* Toglie il segno meno SENZA fare i conti: "−5·2" deve restare "5·2",
     non diventare "10". Serve per non far sparire i passaggi sotto gli
     occhi di chi sta cercando di seguirli. */
  function cambiaSegno(x) {
    if (x.t === 'n') return nNum(fNeg(x.v));
    if (x.t === '*') {
      const fattori = x.a.slice();
      for (let i = 0; i < fattori.length; i++) {
        const f = fattori[i];
        if (f.t === 'n' && f.v.n < 0) {
          if (fUno(fNeg(f.v))) fattori.splice(i, 1);      // era −1: sparisce
          else fattori[i] = nNum(fNeg(f.v));
          if (!fattori.length) return nNum(F1);
          return fattori.length === 1 ? fattori[0] : { t: '*', a: fattori };
        }
      }
    }
    return nProd([nNum(fr(-1)), x]);
  }

  /** Blocco HTML pronto da mettere nella pagina. */
  function blocco(a, evidenzia) {
    const dentro = typeof a === 'string' ? a : html(a);
    return '<div class="mate mate-blocco">' + dentro + '</div>';
  }

  /** Trasforma la formula in parole italiane, per la sintesi vocale. */
  function parlato(a) {
    if (!a) return '';
    switch (a.t) {
      case 'n': {
        if (a.v.d === 1) return String(a.v.n);
        const nomi = { 2: 'mezzi', 3: 'terzi', 4: 'quarti', 5: 'quinti', 6: 'sesti', 7: 'settimi', 8: 'ottavi', 9: 'noni', 10: 'decimi' };
        const uno = a.v.n === 1 || a.v.n === -1;
        const sing = { 2: 'mezzo', 3: 'terzo', 4: 'quarto', 5: 'quinto', 6: 'sesto', 7: 'settimo', 8: 'ottavo', 9: 'nono', 10: 'decimo' };
        if (nomi[a.v.d]) return a.v.n + ' ' + (uno ? sing[a.v.d] : nomi[a.v.d]);
        return a.v.n + ' fratto ' + a.v.d;
      }
      case 'v': return a.n;
      case 'c': return 'pi greco';
      case '+': return a.a.map((x, i) => {
        const neg = eNegativo(x);
        const corpo = parlato(neg ? cambiaSegno(x) : x);
        if (i === 0) return (neg ? 'meno ' : '') + corpo;
        return (neg ? ' meno ' : ' più ') + corpo;
      }).join('');
      case '*': {
        // se in mezzo c'è una divisione la leggo come frazione
        const den = [], num = [];
        a.a.forEach((x) => {
          if (x.t === '^' && x.e.t === 'n' && x.e.v.n < 0 && x.e.v.d === 1) {
            den.push(x.e.v.n === -1 ? x.b : nPot(x.b, nNum(fr(-x.e.v.n))));
          } else num.push(x);
        });
        if (den.length) {
          const n = num.length ? num.map(parlato).join(' per ') : 'uno';
          return n + ' fratto ' + den.map(parlato).join(' per ');
        }
        return a.a.map((x) => parlato(x)).join(' per ');
      }
      case '^': {
        const b = parlato(a.b);
        if (a.e.t === 'n' && a.e.v.d === 1) {
          if (a.e.v.n === 2) return b + ' al quadrato';
          if (a.e.v.n === 3) return b + ' al cubo';
          return b + ' alla ' + a.e.v.n;
        }
        if (a.e.t === 'n' && a.e.v.n === 1 && a.e.v.d === 2) return 'radice quadrata di ' + b;
        return b + ' elevato a ' + parlato(a.e);
      }
      case 'f': {
        const dentro = parlato(a.a[0]);
        const nomi = { sqrt: 'radice quadrata di ', sin: 'seno di ', cos: 'coseno di ', tan: 'tangente di ',
          ln: 'logaritmo naturale di ', log: 'logaritmo di ', log2: 'logaritmo in base due di ',
          abs: 'valore assoluto di ', exp: 'e elevato a ', asin: 'arcoseno di ', acos: 'arcocoseno di ', atan: 'arcotangente di ' };
        if (a.n === 'fatt') return dentro + ' fattoriale';
        return (nomi[a.n] || (a.n + ' di ')) + dentro;
      }
    }
    return '';
  }

  /** Legge ad alta voce una formula scritta come testo. */
  function parlaFormula(str) {
    try { return parlato(analizza(str)); }
    catch (e) { return String(str); }
  }

  /* ================================================================
     9. RADICI RAZIONALI E SCOMPOSIZIONE
     ================================================================ */

  function divisoriInteri(n) {
    n = Math.abs(Math.round(n));
    const out = [];
    if (n === 0) return [1];
    for (let i = 1; i <= Math.min(n, 4000); i++) if (n % i === 0) out.push(i);
    return out;
  }

  /** Radici razionali di un polinomio a coefficienti frazionari. */
  function radiciRazionali(c) {
    while (c.length > 1 && fZero(c[c.length - 1])) c = c.slice(0, -1);
    if (c.length < 2) return [];
    // porto a coefficienti interi
    let mcm = 1;
    c.forEach((f) => { mcm = mcm * f.d / mcd(mcm, f.d); });
    const ic = c.map((f) => Math.round(fNum(f) * mcm));
    let i0 = 0;
    while (i0 < ic.length && ic[i0] === 0) i0++;
    const radici = [];
    if (i0 > 0) radici.push(F0);                   // x=0 è radice
    const cc = ic.slice(i0);
    if (cc.length < 2) return radici;
    const p = divisoriInteri(cc[0]);
    const q = divisoriInteri(cc[cc.length - 1]);
    const viste = {};
    for (const a of p) for (const b of q) for (const s of [1, -1]) {
      const r = fr(s * a, b);
      const k = fTesto(r);
      if (viste[k]) continue;
      viste[k] = 1;
      let v = F0;
      for (let i = cc.length - 1; i >= 0; i--) v = fAdd(fMul(v, r), fr(cc[i]));
      if (fZero(v)) radici.push(r);
    }
    return radici;
  }

  /* ================================================================
     10. SUPPORTO ALLE RADICI QUADRATE ESATTE
     ================================================================ */

  /** √72 → {fuori:6, dentro:2}. Se dentro===1 la radice è esatta. */
  function radiceSemplificata(n) {
    n = Math.round(n);
    if (n < 0) return null;
    let fuori = 1, dentro = n;
    for (let i = 2; i * i <= dentro; i++) {
      while (dentro % (i * i) === 0) { fuori *= i; dentro /= i * i; }
    }
    return { fuori, dentro };
  }

  /** Costruisce (a ± √Δ)/b in modo esatto quando si può. */
  function soluzioneRadicale(numCost, segno, delta, den) {
    const rs = radiceSemplificata(delta);
    if (rs && rs.dentro === 1) {
      return { esatta: true, valore: fr(numCost + segno * rs.fuori, den) };
    }
    return { esatta: false, rs, numCost, segno, den, valore: null };
  }

  /* ================================================================
     11. INTERFACCIA PUBBLICA DEL MOTORE
     ================================================================ */

  return {
    // numeri
    fr, fAdd, fSub, fMul, fDiv, fNeg, fZero, fUno, fInt, fNum, fCmp, fPow, fTesto, fDecimale, F0, F1,
    // lettura e scrittura
    analizza, testo, html, htmlP, blocco, parlato, parlaFormula, normalizzaTesto, sostituisci,
    // nodi
    nNum, nVar, nSomma, nProd, nPot, nDiv,
    // polinomi
    pol, polCost, polVar, polSomma, polSottrai, polProdotto, polPotenza, polScala,
    polDaAst, polAAst, polCoeff, polCoeffNum, polGrado, polVariabili, polZero, polCostante, polValoreCost,
    daCoeff, divisioneNum, radiciRazionali, radiceSemplificata, soluzioneRadicale,
    // funzioni razionali
    ratDaAst,
    // calcolo
    valuta, semplifica, errore
  };
})();
