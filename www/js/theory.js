'use strict';
// Music theory core (pure). Scales/modes, tunings, Plomp-Levelt consonance, functional harmony + cadences + secondary dominants + pivot modulation,
// voice leading (minimal motion, contrary preferred, no parallel 5ths/8ves, tendency tones), species-like counterpoint, rhythm (meter, Euclid,
// polyrhythm, hemiola, syncopation), motif development, form (AABA / periods) and tension arcs.
(function (G) {
const RS = G.RS, T = RS.Theory = {};
const md = (a, n) => ((a % n) + n) % n;
// ---------- scales / modes (cents). family: 'diatonic' | 'pent' | 'minor' | 'sym' | 'exotic'
T.MODES = {
  ionian: [0, 200, 400, 500, 700, 900, 1100], dorian: [0, 200, 300, 500, 700, 900, 1000], phrygian: [0, 100, 300, 500, 700, 800, 1000], lydian: [0, 200, 400, 600, 700, 900, 1100],
  mixolydian: [0, 200, 400, 500, 700, 900, 1000], aeolian: [0, 200, 300, 500, 700, 800, 1000], locrian: [0, 100, 300, 500, 600, 800, 1000],
  pentMajor: [0, 200, 400, 700, 900], pentMinor: [0, 300, 500, 700, 1000], harmonicMinor: [0, 200, 300, 500, 700, 800, 1100], melodicMinor: [0, 200, 300, 500, 700, 900, 1100],
  wholeTone: [0, 200, 400, 600, 800, 1000], octatonic: [0, 200, 300, 500, 600, 800, 900, 1100] };
T.FAMILY = { ionian: 'diatonic', dorian: 'diatonic', phrygian: 'diatonic', lydian: 'diatonic', mixolydian: 'diatonic', aeolian: 'diatonic', locrian: 'diatonic', pentMajor: 'pent', pentMinor: 'pent', harmonicMinor: 'minor', melodicMinor: 'minor', wholeTone: 'sym', octatonic: 'sym' };
T.MODE_LIST = Object.keys(T.MODES);
// gene (0..1) -> mode: consonant/common modes take most of the range, symmetric scales only at the extremes
T.modeFromGene = x => { const order = ['pentMajor', 'ionian', 'mixolydian', 'dorian', 'aeolian', 'pentMinor', 'lydian', 'harmonicMinor', 'melodicMinor', 'phrygian', 'locrian', 'wholeTone', 'octatonic'], w = [10, 14, 9, 10, 10, 9, 7, 6, 5, 4, 2, 1.5, 1.5]; const s = w.reduce((a, b) => a + b); let acc = 0; for (let i = 0; i < order.length; i++) { acc += w[i] / s; if (x < acc) return order[i]; } return order[order.length - 1]; };
// ---------- tuning systems
T.JUST = [0, 111.73, 203.91, 315.64, 386.31, 498.04, 590.22, 701.96, 813.69, 884.36, 1017.6, 1088.27];   // 5-limit
T.tune = (cents, sys = '12tet', micro = 0, deg = 0) => { if (sys === '12tet') return cents; const o = Math.floor(cents / 1200), c = cents - o * 1200, s = Math.round(c / 100), fr = c - s * 100;
  if (sys === 'just') return o * 1200 + T.JUST[md(s, 12)] + (s === 12 ? 1200 - T.JUST[0] : 0) + fr;
  // gentle microtonal: deterministic per-degree offsets up to +-micro cents
  return cents + Math.sin(deg * 2.39996 + 1) * micro; };
T.tuningFromGene = (x, amt) => x < .62 ? { sys: '12tet', micro: 0 } : x < .9 ? { sys: 'just', micro: 0 } : { sys: 'micro', micro: 6 + amt * 24 };
// ---------- consonance: harmonic series + Plomp-Levelt (Sethares parameterisation)
T.plRough = (f1, f2, a1 = 1, a2 = 1) => { const fmin = Math.min(f1, f2), s = .24 / (.021 * fmin + 19), d = Math.abs(f2 - f1); return a1 * a2 * (Math.exp(-3.5 * s * d) - Math.exp(-5.75 * s * d)); };
T.roughness = (f1, f2, nP = 6) => { let r = 0; for (let i = 1; i <= nP; i++) for (let j = 1; j <= nP; j++) r += T.plRough(f1 * i, f2 * j, Math.pow(.88, i - 1), Math.pow(.88, j - 1)); return r; };
T.intervalRough = cents => T.roughness(261.6, 261.6 * Math.pow(2, cents / 1200)) - T.roughness(261.6, 261.6);   // 0 for unison
T.chordRough = fs => { let r = 0; for (let i = 0; i < fs.length; i++) for (let j = i + 1; j < fs.length; j++) r += T.roughness(fs[i], fs[j], 4); return r / Math.max(1, fs.length * (fs.length - 1) / 2); };
// ---------- harmony
T.triad = (scale, deg, seventh) => { const n = scale.length, out = []; for (const k of seventh ? [0, 2, 4, 6] : [0, 2, 4]) { const d = deg + k; out.push(scale[md(d, n)] + Math.floor(d / n) * 1200); } return out; };
T.fn = deg => { const d = md(deg, 7); return d === 0 || d === 2 || d === 5 ? 'T' : d === 1 || d === 3 ? 'S' : 'D'; };
T.cadence = (a, b, end = true) => { if (!end) return null; const A = md(a.deg, 7), B = md(b.deg, 7); if (B === 0 && (A === 4 || A === 6)) return 'authentic'; if (B === 0 && A === 3) return 'plagal'; if (A === 4 && B === 5) return 'deceptive'; if (B === 4) return 'half'; return null; };
// secondary dominant of a diatonic target: a major triad a fifth above it (chromatic), as cents
T.secondaryDom = (scale, target) => { const r = scale[md(target, scale.length)] + 700; return [r, r + 400, r + 700].map(c => md(c, 1200)); };
// functional phrase grammar -> 16-bar AABA form; cadences: A1 half, A2 authentic/deceptive, B half, A3 authentic
T.FORM = ['A', 'A', 'B', 'A'];
T.plan = (seed, opts = {}) => { const r = RS.rng(RS.hash('harm', seed)), bars = [];
  const pickT = () => r.pick([0, 0, 0, 5, 2]), pickS = () => r.pick([3, 1, 3, 1, 3]), pickD = () => r.pick([4, 4, 4, 6]);
  const phrase = (cad, startFn) => { const p = []; p.push({ deg: startFn === 'S' ? pickS() : 0 }); p.push({ deg: r() < .5 ? pickT() : pickS() });
    if (cad === 'half') { p.push({ deg: pickS() }); p.push({ deg: 4 }); }
    else if (cad === 'plagal') { p[1] = { deg: r() < .5 ? 5 : 4 }; p.push({ deg: 3 }); p.push({ deg: 0 }); }
    else if (cad === 'deceptive') { p[1] = { deg: pickS() }; p.push({ deg: 4 }); p.push({ deg: 5 }); }
    else { p[1] = { deg: r() < .5 ? pickS() : pickT() }; p.push({ deg: r() < .7 ? 4 : 6 }); p.push({ deg: 0 }); }
    return p; };
  const cads = ['half', r() < .22 ? 'deceptive' : 'authentic', 'half', opts.plagal || r() < .2 ? 'plagal' : 'authentic'];
  const P4 = [phrase(cads[0]), phrase(cads[1]), phrase(cads[2], 'S'), phrase(cads[3])];
  // secondary dominant (V/x) before the S chord in the bridge
  if (r() < .6) P4[2][1] = { deg: P4[2][2].deg, sec: P4[2][2].deg };
  P4.forEach((ph, i) => ph.forEach((c, k) => bars.push(Object.assign({ fn: c.sec != null ? 'D' : T.fn(c.deg), sec: c.sec == null ? null : c.sec, phrase: i, sect: T.FORM[i], pos: k, cad: k === 3 ? cads[i] : null }, c))));
  return { bars, cads, len: 16 }; };
// pivot modulation: a diatonic triad common to both keys (keys = {root semitone, scale cents})
T.pcSet = (root, scale, deg) => T.triad(scale, deg).map(c => md(Math.round(c / 100) + root, 12)).sort((a, b) => a - b).join(',');
T.pivot = (kA, kB) => { const nA = kA.scale.length, nB = kB.scale.length, out = []; for (let a = 0; a < nA; a++) { const s = T.pcSet(kA.root, kA.scale, a); for (let b = 0; b < nB; b++) if (s === T.pcSet(kB.root, kB.scale, b)) out.push({ a, b, pcs: s }); }
  out.sort((x, y) => (T.fn(y.b) === 'S' ? 1 : 0) - (T.fn(x.b) === 'S' ? 1 : 0)); return out[0] || null; };
T.modulate = (kA, kB) => { const p = T.pivot(kA, kB); return p ? [{ key: 'A', deg: 0 }, { key: 'A', deg: p.a, pivot: true }, { key: 'B', deg: 4 }, { key: 'B', deg: 0 }] : [{ key: 'A', deg: 0 }, { key: 'B', deg: 4 }, { key: 'B', deg: 0 }]; };
// ---------- voice leading: assign chord tones to voices (cents, absolute) with minimal motion; avoid parallel perfects; contrary preferred; resolve tendencies
T.isPerfect = c => { const m = md(Math.round(c / 100), 12); return m === 7 || m === 0; };
T.parallels = (A, B) => { let n = 0; for (let i = 0; i < A.length; i++) for (let j = i + 1; j < A.length; j++) { const ia = A[j] - A[i], ib = B[j] - B[i]; if (A[i] === B[i] && A[j] === B[j]) continue; if (T.isPerfect(ia) && T.isPerfect(ib) && md(Math.round(ia / 100), 12) === md(Math.round(ib / 100), 12) && Math.sign(B[i] - A[i]) === Math.sign(B[j] - A[j]) && B[i] !== A[i]) n++; } return n; };
T.voiceLead = (prev, chordPcs, ranges, opt = {}) => { const nv = prev.length, cand = [];
  for (let v = 0; v < nv; v++) { const list = []; for (const pc of chordPcs) for (let o = -3; o <= 4; o++) { const c = pc + o * 1200; if (c >= ranges[v][0] && c <= ranges[v][1]) list.push(c); } list.sort((a, b) => Math.abs(a - prev[v]) - Math.abs(b - prev[v])); cand.push(list.slice(0, 4).length ? list.slice(0, 4) : [prev[v]]); }
  let best = null, bs = 1e18; const cur = new Array(nv);
  const tend = opt.tend || [];   // [{from: cents mod 1200, to: dir}] e.g. leading tone up, chord 7th down
  const rec = v => { if (v === nv) { let s = 0; const used = new Set(); for (let i = 0; i < nv; i++) { s += Math.abs(cur[i] - prev[i]); used.add(md(cur[i], 1200)); }
      s += (chordPcs.length - Math.min(chordPcs.length, used.size)) * 260;   // complete chords
      s += T.parallels(prev, cur) * (opt.allowParallels ? 0 : 900);
      for (let i = 1; i < nv; i++) if (cur[i] < cur[i - 1]) s += 400;   // no crossing
      if (nv >= 2) { const db = cur[0] - prev[0], ds = cur[nv - 1] - prev[nv - 1]; if (db && ds && Math.sign(db) !== Math.sign(ds)) s -= 40; }   // contrary motion bonus
      for (const t of tend) for (let i = 0; i < nv; i++) if (Math.abs(md(prev[i], 1200) - t.from) < 30) { const d = cur[i] - prev[i]; if (Math.sign(d) !== t.dir || Math.abs(d) > 220) s += 300; }
      if (s < bs) { bs = s; best = cur.slice(); } return; }
    for (const c of cand[v]) { cur[v] = c; rec(v + 1); } };
  rec(0); return best; };
T.motion = (A, B) => A.reduce((s, a, i) => s + Math.abs(B[i] - a), 0) / A.length;
// ---------- counterpoint: a line against a cantus (scale degrees). strong beats consonant (3rds, 5ths, 6ths, 8ves), weak beats passing/neighbour
T.CONS_DEG = new Set([0, 2, 4, 5]);   // diatonic steps: unison/8ve, 3rd, 5th, 6th
T.counter = (cantus, seed, opt = {}) => { const r = RS.rng(RS.hash('cp', seed)), out = []; let prev = cantus[0] + (opt.above === false ? -7 : 4), prevI = null;
  for (let i = 0; i < cantus.length; i++) { const cf = cantus[i], strong = i % 2 === 0; let best = null, bs = 1e9;
    for (let d = cf - 9; d <= cf + 11; d++) { const iv = md(d - cf, 7), s0 = Math.abs(d - prev); let s = s0 + r() * .4 + (d === prev ? 2.5 : 0) + (s0 > 4 ? 2 : 0);
      if (strong) { if (!T.CONS_DEG.has(iv)) continue; if ((iv === 0 || iv === 4) && prevI === iv && d !== prev) s += 20; if (i === cantus.length - 1 && iv !== 0) s += 10; }
      else { if (!(s0 === 1 || s0 === 0) && !T.CONS_DEG.has(iv)) continue; if (s0 > 1 && !T.CONS_DEG.has(iv)) s += 5; }
      if (i > 0 && Math.sign(d - prev) === Math.sign(cf - cantus[i - 1]) && d !== prev) s += .6;   // prefer contrary motion
      if (s < bs) { bs = s; best = d; } }
    if (best == null) best = cf + 4; out.push(best); prevI = md(best - cf, 7); prev = best; }
  return out; };
// ---------- rhythm
T.METERS = { '4/4': [4, 4, 4, 4], '3/4': [4, 4, 4], '6/8': [6, 6], '5/8': [6, 4], '7/8': [4, 4, 6], '2/4': [4, 4] };
T.meterFromGene = x => ['4/4', '4/4', '4/4', '3/4', '3/4', '6/8', '6/8', '2/4', '5/8', '7/8'][Math.min(9, Math.floor(x * 10))];
T.weights = meter => { const gr = T.METERS[meter] || T.METERS['4/4'], w = []; gr.forEach((g, k) => { for (let i = 0; i < g; i++) w.push(i === 0 ? (k === 0 ? 4 : 3) : (g % 3 === 0 ? (i % 3 === 0 ? 2 : 1) : (i % 2 === 0 ? 2 : 1))); }); return w; };
T.euclid = (k, n, rot = 0) => { const out = []; for (let i = 0; i < n; i++) out.push(Math.floor(((i + rot) * k) / n) !== Math.floor(((i + rot - 1) * k) / n) || (k === n) ? 1 : 0); if (k === 0) return out.fill(0); return out; };
T.euclidB = (k, n) => { // Bjorklund (canonical, starts on an onset)
  if (k <= 0) return new Array(n).fill(0); let a = [], b = []; for (let i = 0; i < n; i++) (i < k ? a : b).push([i < k ? 1 : 0]);
  while (b.length > 1) { const m = Math.min(a.length, b.length), na = []; for (let i = 0; i < m; i++) na.push(a[i].concat(b[i])); const rest = a.length > m ? a.slice(m) : b.slice(m); a = na; b = rest; }
  return a.concat(b).flat(); };
T.polyrhythm = (a, b, len) => { const A = [], B = []; for (let i = 0; i < len; i++) { A.push(Math.abs((i * a / len) % 1) < 1e-9 || Math.floor(i * a / len) !== Math.floor((i - 1) * a / len) ? 1 : 0); B.push(Math.floor(i * b / len) !== Math.floor((i - 1) * b / len) ? 1 : 0); } return [A, B]; };
T.hemiola = len => { const out = []; for (let i = 0; i < len; i++) out.push(i % 4 === 0 ? 1 : 0); return out; };   // duple grouping across a triple bar
T.syncopation = (pat, meter = '4/4') => { const w = T.weights(meter), n = w.length; let s = 0; for (let i = 0; i < pat.length; i++) if (pat[i]) { const j = (i + 1) % n; let k = j; while (k !== i && !pat[k % pat.length]) { if (w[k % n] > w[i % n]) { s += w[k % n] - w[i % n]; break; } k = (k + 1) % n; if (w[k % n] <= w[i % n] && pat[k % pat.length]) break; } } return s; };
T.swingTime = (step, dt16, swing) => step * dt16 + (step % 2 ? swing * dt16 : 0);
// ---------- motif development. motif = { p: [deg...] (null = rest), d: [16ths...] }
T.mot = { transpose: (m, k) => ({ p: m.p.map(x => x == null ? x : x + k), d: m.d.slice() }), invert: (m, axis) => { const a = axis == null ? m.p.find(x => x != null) || 0 : axis; return { p: m.p.map(x => x == null ? x : 2 * a - x), d: m.d.slice() }; },
  retrograde: m => ({ p: m.p.slice().reverse(), d: m.d.slice().reverse() }), augment: (m, f = 2) => ({ p: m.p.slice(), d: m.d.map(x => x * f) }), diminish: (m, f = 2) => ({ p: m.p.slice(), d: m.d.map(x => Math.max(1, Math.round(x / f))) }),
  fragment: (m, a = 0, b = 2) => ({ p: m.p.slice(a, b), d: m.d.slice(a, b) }), sequence: (m, step = 1, times = 2) => { const o = { p: [], d: [] }; for (let t = 0; t < times; t++) { o.p.push(...m.p.map(x => x == null ? x : x + step * t)); o.d.push(...m.d); } return o; },
  intervals: m => { const q = m.p.filter(x => x != null); return q.slice(1).map((x, i) => x - q[i]); }, len: m => m.d.reduce((a, b) => a + b, 0) };
// developing variation chosen by creativity/improvisation genes (deterministic per seed)
T.develop = (m, seed, improv = .5) => { const r = RS.rng(seed >>> 0), ops = ['transpose', 'invert', 'retrograde', 'sequence', 'fragment', 'augment', 'diminish']; const op = improv < .3 ? 'transpose' : r.pick(ops);
  let o = op === 'transpose' ? T.mot.transpose(m, r.pick([-2, -1, 1, 2, 3])) : op === 'sequence' ? T.mot.fragment(T.mot.sequence(T.mot.fragment(m, 0, Math.max(2, m.p.length >> 1)), r.pick([-1, 1, 2]), 2), 0, m.p.length) : op === 'fragment' ? T.mot.sequence(T.mot.fragment(m, 0, Math.max(2, m.p.length >> 1)), r.pick([1, -1]), 2) : T.mot[op](m);
  if (op === 'augment') o = T.mot.fragment(o, 0, Math.max(2, m.p.length >> 1)); o.op = op; return o; };
// ---------- form + tension: AABA over 16 bars, periods (antecedent ends half cadence, consequent authentic)
T.formAt = bar => { const b = md(bar, 16), ph = Math.floor(b / 4); return { sect: T.FORM[ph], phrase: ph, pos: b % 4, end: b % 4 === 3, period: ph === 0 ? 'antecedent' : ph === 1 ? 'consequent' : ph === 2 ? 'bridge' : 'return' }; };
T.tension = (bar, beat = 0) => { const b = md(bar, 16) + beat / 4; const arc = b < 12 ? Math.sin(Math.PI * b / 13) * (.55 + b / 26) : Math.max(0, 1 - (b - 12) / 4) * .9; const local = .25 * Math.sin(Math.PI * (b % 4) / 4); return RS.clamp(arc + local, 0, 1); };
T.dynamics = (bar, beat, range = .5) => .55 + (T.tension(bar, beat) - .5) * range;
})(typeof window !== 'undefined' ? window : globalThis);
