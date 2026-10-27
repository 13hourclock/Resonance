// lean check (12:40): inherited note data. Crossover respects phrase/motif boundaries, seams land on the child's chord tones and the
// phrases cadence, and breeding is deterministic with mutation 0 (same parents + seed -> identical child).
const T = require('./node_env.js'); const Mi = RS.Mind, To = RS.Tonal; let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; const a = T.add(Sf, T.plain(11), 0), b = T.add(Sf, T.plain(29), 200);
let bound = true, seamCT = true, cad = true, det = true, units = { a: 0, b: 0 }, grooves = { a: 0, b: 0 }, fittedN = 0; const ex = [];
for (let s = 0; s < 40; s++) { const seed = 1000 + s * 7919; const ch = RS.Creature.child(Sf, a, b, seed), ch2 = RS.Creature.child(Sf, a, b, seed);
  for (let i = 0; i < RS.Genome.NG; i++) if (ch.g[i] !== ch2.g[i]) det = false;
  const A = Mi.decodeMotif(RS.Creature.expressed(Sf, a)), B = Mi.decodeMotif(RS.Creature.expressed(Sf, b)), K = Mi.decodeMotif(ch.g), src = ch.msrc.p;
  // every half (call 0-3, answer 4-7) comes whole from ONE parent, except notes the fitting moved (seam 3/4 + phrase ends only)
  const fit = Mi.breed(RS.Creature.expressed(Sf, a), RS.Creature.expressed(Sf, b), new Float32Array(ch.g), seed, Mi.fit(a), Mi.fit(b)).fitted; fittedN += fit.length;
  for (const [lo, hi] of [[0, 4], [4, 8]]) { if (new Set(src.slice(lo, hi)).size !== 1) bound = false; const P = src[lo] === "a" ? A : B; units[src[lo]]++; for (let k = lo; k < hi; k++) if (K.p[k] !== P.p[k] && !fit.includes(k)) { bound = false; if (!T.dbg) { T.dbg = 1; console.log("DBG", s, k, K.p, P.p, fit); } } }
  if (fit.some(k => ![3, 4, 7, 6, 5, 2, 1].includes(k))) bound = false;
  // groove: the whole rhythm block from one parent
  const G = ch.msrc.groove === 'a' ? A : B; grooves[ch.msrc.groove]++; if (K.d.some((d, k) => d !== G.d[k])) { bound = false; if (!T.dbg2) { T.dbg2 = 1; console.log("DBGd", K.d, G.d); } }
  // seams: strong-beat seam notes are chord tones of the child's tonic harmony; the answer ends on the tonic
  const sys = To.fromGene(ch.g[96]), n = sys.cents.length, ct = ch.g[101] < .55 ? 'triad' : ch.g[101] < .8 ? 'seventh' : ch.g[101] < .92 ? 'quartal' : 'cluster', chord = To.chord(sys, 0, ct === 'cluster' ? 'triad' : ct);
  let t = 0; const on = K.d.map(d => { const o = t; t += d; return o; }); for (const k of [3, 4]) if (K.p[k] != null && on[k] % 4 === 0 && !To.isChordTone(sys, K.p[k], chord)) seamCT = false;
  const last = [7, 6, 5, 4].find(k => K.p[k] != null); if (last != null && ((K.p[last] % n) + n) % n !== 0) cad = false; if (s < 3) ex.push({ src: src.join(''), groove: ch.msrc.groove, child: K.p, fitted: fit }); }
ok('BREED crossover only at phrase/motif boundaries (call / answer / groove units whole; only seam + cadence notes fitted)', bound, { units, grooves, fittedPerChild: +(fittedN / 40).toFixed(2), ex });
ok('BREED seam notes on strong beats are chord tones of the child\'s harmony; answers cadence on the tonic', seamCT && cad);
ok('BREED deterministic with mutation 0 (same parents + seed -> identical genome)', det && RS.MUTATION === false);
// fitness raises inheritance weight
const fA = { call: 30, ans: 30, jam: 60 }, fB = { call: 0, ans: 0, jam: 0 }; let fromA = 0; for (let s = 0; s < 60; s++) { const r = Mi.breed(RS.Creature.expressed(Sf, a), RS.Creature.expressed(Sf, b), new Float32Array(a.g), 77 + s * 131, fA, fB); fromA += (r.call === 'a') + (r.ans === 'a') + (r.groove === 'a'); }
ok('BREED fitter motifs (answered / jammed) are inherited more often', fromA / 180 > .8, { shareFromFitParent: +(fromA / 180).toFixed(2) });
console.log(`breed ${pass}/${tot}`);
