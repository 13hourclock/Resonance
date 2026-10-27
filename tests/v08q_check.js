// v0.8a7 (chunk 3d, V08_SPEC Q) headless check: Q.9 tests 1-12 (11's perf part = perf_j, run separately)
// Ohms feel the room they take in a jam: occupancy map (7 bands x bar steps), fair shares, one move per bar; lead/bass/tradition/baton win.
const T = require('./node_env.js'), R = global.RS, QR = R.QRoom, Mi = R.Mind, Ex = R.Exp;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const fresh = () => { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.items = []; T.run(Sf, .2); return Sf; };
const gi = k => R.IG && R.IG[k] != null ? R.IG[k] : R.GI[k];
// a seeded jam (western unless o.trad): base 30777 = pulse:back, melody, comp, comp, bass, listen (two comps share an octave)
const jam = (base = 30777, NM = 6, o = {}) => { QR.off = true; R.idReset(base); Math.random = R.rng(R.hash('mrand', base)); const Sf = fresh(), cs = [];   /* ids + Math.random pinned per sim (ohm ids seed their minds) */ for (let i = 0; i < NM; i++) cs.push(T.add(Sf, T.plain(base + i * 13), (o.dx || 0) + (i - 2.5) * 45));
  for (const c of cs) c.trad = o.trad || 'western'; if (o.pre) o.pre(Sf, cs); T.run(Sf, 1); R.Jam.form(Sf, cs, .8); T.run(Sf, 6); const J = cs[0].jam; return { Sf, cs, J, bs: () => R.QRoom.bs((J.leader || cs[0]).mind) }; };
const bars = (S, n, f) => { for (let k = 0; k < n; k++) { if (o_each) o_each(S); T.run(S.Sf, S.bs()); if (f) f(k); } }; let o_each = null;
const isL = (J, c) => /^(melody|solo)$/.test(c.mind.role || ''), isB = c => (c.mind.role || '').startsWith('bass');
const jamE = J => { let e = 0, e0 = 0; for (const c of J.members) { const r = c.mind.qRec; if (r) { e += r.e; e0 += r.e0; } } return [e, e0]; };
const QT = x => x.qo || x.qs || x.qf || x.qv;
// record every Q pass: raw vs out per member (wraps the last genBar wrapper's worker)
const bar0 = QR.bar; let REC = null; QR.bar = (Sf, m, bar, o) => { const out = bar0(Sf, m, bar, o); if (REC) REC.push({ c: m.c, bar, raw: o || [], out: out || [] }); return out; };
const st = (Sf, k) => Sf.stats[k] || 0;
// ---- 1, 2, 9: crowding drops, bass/lead keep their place, no flapping, floor, energy (10 western seeds, paired Q off / on) ----
const SEEDS = [21036, 10111, 20481, 30925, 30666, 30777, 20814, 30074, 10000, 10407];   // 6-member western jams with 2 comps + melody (1-2 crowded cells/bar with Q off)
const movable = J => { const N = J.qN, G = J.qGr; if (!G) return 0; let n = 0; for (let i = 0; i < G.length; i++) if (G[i] > QR.CROWD) { const b = Math.floor(i / N), s2 = i % N;
  if (J.members.some(c => !isL(J, c) && !isB(c) && c.mind.role !== 'listen' && c.mind.qRec && c.mind.qRec.ns.some(x => x.b === b && x.s === s2 && !x.prot))) n++; } return n; };
const pairSim = (base, on, f) => { const S = jam(base); bars(S, 4); QR.off = !on; const rows = []; bars(S, 12, k => { const [e, e0] = jamE(S.J); rows.push({ cr: S.J.qCrowd, cl: S.J.clar, mv: movable(S.J), e, e0 }); if (f) f(S, k); }); return { S, rows }; };
if (!ONLY || ONLY === '1') {
  const W = { off: [0, 0, 0], on: [0, 0, 0], mOff: 0, mOn: 0, clOff: 0, clOn: 0 }; let bad = 0, bel = 0, leadT = 0, flap = 0, floor = 0, eS = 0, e0S = 0, eBar = 1, shifts = 0;
  for (const base of SEEDS) { const a = pairSim(base, false); REC = []; const oct = new Map();
    const b = pairSim(base, true, (S, k) => { const J = S.J, bass = J.members.find(isB), bb = bass && bass.mind.qRec && bass.mind.qRec.ns.some(r => !r.perc) ? Math.min(...bass.mind.qRec.ns.filter(r => !r.perc).map(r => r.b)) : -1;
      for (const c of J.members) { const r = c.mind.qRec; if (!r) continue; const q = c.mind.qOct || 0, h = oct.get(c) || [[-99, 0]]; if (h[h.length - 1][1] !== q) h.push([k, q]); oct.set(c, h);
        for (const x of r.ns) { if (x.src && (x.src.qo < 0 || x.src.qf) && !x.perc && bb >= 0 && x.b <= bb && c !== bass) { bad++; if (process.env.DBG) console.log('BAD', base, k, x.src.qo, !!x.src.qf, x.b, bb, J.qBassB, c.mind.role); } if (isL(J, c) && x.src && QT(x.src)) leadT++; } } });
    const by = new Map(); for (const r of REC) { const q = by.get(r.c) || []; q.push(r); by.set(r.c, q); } REC = null;
    for (const [, q] of by) for (let i = 0; i + 1 < q.length; i += 2) if (q[i].raw.length + q[i + 1].raw.length > 0 && q[i].out.length + q[i + 1].out.length === 0) floor++;
    for (const [, h] of oct) { shifts += h.length - 1; for (let i = 2; i < h.length; i++) if (h[i][0] - h[i - 1][0] < 4) flap++; }
    for (let k = 0; k < 12; k++) { const w = k < 4 ? 0 : k < 8 ? 1 : 2; W.off[w] += a.rows[k].cr; W.on[w] += b.rows[k].cr; if (w === 1) { W.mOff += a.rows[k].mv; W.mOn += b.rows[k].mv; W.clOff += a.rows[k].cl; W.clOn += b.rows[k].cl; }
      eS += b.rows[k].e; e0S += b.rows[k].e0; if (b.rows[k].e0 > 0) eBar = Math.max(eBar, Math.abs(b.rows[k].e / b.rows[k].e0 - 1) + 1); } }
  const n4 = SEEDS.length * 4;
  ok('1a two comps + melody in one octave (10 seeded 6-member jams): crowded cells drop >= 40% by bars 5-8 (paired with Q off)', W.on[1] <= W.off[1] * .6 && W.on[2] <= W.off[2] * .6, { off: W.off, on: W.on, movableOff: W.mOff, movableOn: W.mOn });
  ok('1b ...and j.clar rises', W.clOn > W.clOff, { off: +(W.clOff / n4).toFixed(3), on: +(W.clOn / n4).toFixed(3) });
  ok('2a the bass keeps the lowest occupied band (no note Q moves down or adds lands at or below it)', bad === 0, { bad });
  ok('2b the lead is never moved (no Q tags on its notes): it keeps its band in its busy slots', leadT === 0, { leadT });
  ok('9a no octave flapping (<= 1 shift per ohm per 4 bars)', flap === 0, { flap, shifts });
  ok('9b no member drops below 1 note per 2 bars from Q', floor === 0, { floor });
  ok('9c jam energy within +-10% (all seeds, 12 bars)', Math.abs(eS / e0S - 1) <= .1, { ratio: +(eS / e0S).toFixed(3), worstBar: +eBar.toFixed(2) });
}
// ---- 3: shy vs bold (genes swapped): two comps on the very same cells, one decision pass ----
if (!ONLY || ONLY === '3') {
  const run = sw => { const S = jam(30777), { J, Sf, cs } = S; bars(S, 4); const a = cs[2], b = cs[3], N = 16, tn = Sf.now();
    const set = (c, bo) => { c.g[gi('bold')] = bo; c.g[gi('shyness')] = 1 - bo; if (c.exp) c.exp.sk = 1; c.batonOn = false; Object.assign(c.mind, { qOct: 0, qOctB: null, qThin: null, qSoft: null, qSub: null, qMoveT: null, qBat: null }); };
    set(a, sw ? 1 : 0); set(b, sw ? 0 : 1);
    const mk = c => { const ns = [0, 4, 8, 12].map(s => ({ b: 4, f: 800, s, n: 1, v: .6, br: 0, perc: false, prot: false, db: false, wk: .6, src: { s, deg: 7, vel: .6 } })); return { c, m: c.mind, ns, cells: QR.cellsOf(ns, N), e: 2.4, w: QR.wOf('comp') }; };
    const mem = [mk(a), mk(b)], Gr = new Float32Array(QR.NB * N); for (const M of mem) for (const [i, v] of M.cells) Gr[i] += v;
    QR.decide(Sf, J, mem, Gr, N, 4.8, tn); let cr = 0; for (const v of Gr) if (v > QR.CROWD) cr++;
    const shy = sw ? b : a, bold = sw ? a : b; return { shyMoved: shy.mind.qMoveT === tn, boldMoved: bold.mind.qMoveT === tn, cr, mv: shy.mind.qMove }; };
  const r1 = run(false), r2 = run(true);
  ok('3a the shy ohm moves (both gene orders)', r1.shyMoved && r2.shyMoved, { r1, r2 });
  ok('3b the bold one keeps its place and the cells clear', !r1.boldMoved && !r2.boldMoved && r1.cr === 0 && r2.cr === 0, { r1, r2 });
}
// ---- 4: skill 0 vs 1: two comps on the same cells, 16 bar decisions each; leftover crowding (summed excess) after the pass ----
if (!ONLY || ONLY === '4') {
  const S = jam(30777), { J, Sf, cs } = S; bars(S, 4); const a = cs[2], b = cs[3], N = 16;
  const run = sk => { let ex = 0, mv = 0; for (let bar = 0; bar < 16; bar++) { for (const c of [a, b]) { c.g[gi('bold')] = .5; c.g[gi('shyness')] = .5; if (c.exp) c.exp.sk = sk; c.batonOn = false; Object.assign(c.mind, { bar: 1000 + bar, qOct: 0, qOctB: null, qThin: null, qSoft: null, qSub: null, qMoveT: null, qBat: null }); }
      const mk = (c, d) => { const ns = [0, 2, 4, 6, 8, 10, 12, 14].map(s => ({ b: 4, f: 800, s, n: 1, v: .6, br: 0, perc: false, prot: false, db: false, wk: .3 + .1 * (s % 4 === 0), src: { s, deg: 7, vel: .6 } })); return { c, m: c.mind, ns, cells: QR.cellsOf(ns, N), e: 4.8, w: QR.wOf('comp') }; };
      const mem = [mk(a), mk(b)], Gr = new Float32Array(QR.NB * N); for (const M of mem) for (const [i, v] of M.cells) Gr[i] += v; QR.decide(Sf, J, mem, Gr, N, 9.6, Sf.now() + bar);
      for (const v of Gr) ex += Math.max(0, v - QR.CROWD); mv += [a, b].filter(c => c.mind.qMoveT != null).length; } return { ex: +ex.toFixed(2), mv }; };
  const lo = run(0), hi = run(1);
  ok('4 skilled ohms lower crowding more (same seed, 16 bars, skill 0 vs 1)', hi.ex < lo.ex, { sk0: lo, sk1: hi });
}
// ---- 5: newcomer joins (a 5th ohm) / member leaves ----
if (!ONLY || ONLY === '5') {
  { const S = jam(30777, 4), { J, Sf } = S; QR.off = false; const pre = []; bars(S, 8, () => pre.push(J.qCrowd)); const thr = Math.max(...pre.slice(4)) + 1;   /* back to the settled level (+1 cell) */
    const nc = T.add(Sf, T.plain(30777 + 4 * 13), 3 * 45); T.run(Sf, .3); R.Jam.join(Sf, J, nc); let k0 = null; const after = []; for (let k = 0; k < 14; k++) { T.run(Sf, S.bs()); if (k0 == null && nc.mind.qRec && nc.mind.qRec.ns.length) k0 = k; if (k0 != null) after.push(J.qCrowd); }
    let worst = 0, run = 0; for (const x of after) { run = x > thr ? run + 1 : 0; worst = Math.max(worst, run); }
    ok('5a a 5th ohm joins and plays: crowding never stays above the settled level for more than 2 bars', k0 != null && after.length >= 8 && worst <= 2, { thr, k0, role: nc.mind.role, after, worst }); }
  for (const dir of [1, -1]) { const S = jam(30777, 6), { J, Sf } = S; QR.off = false; bars(S, 8); const lv = J.members.find(c => c.mind.role === 'comp' && c.mind.qOct === dir), ton = lv && lv.mind.qRec ? lv.mind.qRec.ns.filter(r => !r.perc) : [];
    const home = ton.length ? ton[ton.length >> 1].b - dir : -1, moved = J.members.filter(c => c !== lv && !isL(J, c) && !isB(c) && (c.mind.qOct || (c.mind.qThin != null && c.mind.qThin < 1))); if (lv) R.Jam.leave(Sf, J, lv);
    let at = null; bars(S, 4, k => { if (at == null && moved.some(c => !c.mind.qOct && c.mind.qRec && c.mind.qRec.ns.some(x => !x.perc && x.b === home))) at = k + 1; });
    ok('5b a member leaves (it had moved ' + (dir > 0 ? 'up' : 'down') + '): one that made room settles back into its home band within 4 bars', lv && home >= 0 && moved.length && at != null, { home, moved: moved.length, at }); }
}
// ---- 6: baton ----
if (!ONLY || ONLY === '6') {
  const S = jam(), { J, Sf, cs } = S; QR.off = false; bars(S, 2); const [x, y] = R.Jam.center(J), B = R.Conduct.raise(Sf, [x, y]); ok('6- baton raised over the jam', !!B && cs.some(c => c.batonOn));
  const mt = new Map(cs.map(c => [c, c.mind.qMoveT])); let thinCued = 0; o_each = () => { if (Sf.baton) Sf.baton.last = Sf.now(); for (const c of cs) if (c.batonOn) c.batonCue = Sf.now(); };
  REC = []; bars(S, 6); o_each = null; for (const r of REC) if (r.c.batonOn !== undefined && r.out.length < r.raw.length && r.out.some(n => n.qv || n.qo)) thinCued++;
  ok('6a baton up: no Q moves for conducted ohms', cs.filter(c => c.batonOn).every(c => c.mind.qMoveT === mt.get(c)), { conducted: cs.filter(c => c.batonOn).length });
  ok('6b cued ohms are never thinned (output = what they were going to play)', REC.filter(r => r.c.batonOn).every(r => r.out.length === r.raw.length && !r.out.some(QT)), { n: REC.length, thinCued }); REC = null;
  const m0 = st(Sf, 'qMove'); R.Conduct.release(Sf); const t0 = Sf.now(); let firstT = null; for (let k = 0; k < 10 && firstT == null; k++) { T.run(Sf, S.bs()); if (st(Sf, 'qMove') > m0) firstT = Sf.now(); }
  ok('6c moves resume after baton down (not within the first bar)', firstT != null && firstT - t0 >= S.bs() * .9, { after: firstT && +((firstT - t0) / S.bs()).toFixed(2) });
}
// ---- 7: tradition parts byte-identical ----
if (!ONLY || ONLY === '7') {
  for (const tr of ['cuban', 'bossa', 'gamelan', 'wafrica']) { const S = jam(30777, 6, { trad: tr }), { J, Sf } = S; QR.off = false; REC = []; bars(S, 8); let diff = 0, np = 0;
    for (const r of REC) { const E = r.c.mind.E, a = r.raw.filter(n => QR.prot(E, n)), b = r.out.filter(n => QR.prot(E, n)); np += a.length; if (JSON.stringify(a) !== JSON.stringify(b)) diff++; }
    ok('7 ' + tr + ': tradition parts are byte-identical with and without Q', J.E.trad === tr && diff === 0 && np > 0, { trad: J.E.trad, prot: np, diff, moves: st(Sf, 'qMove') }); REC = null; }
}
// ---- 8: a player-played shape takes room ----
if (!ONLY || ONLY === '8') {
  const run = play => { const S = jam(), { J, Sf, cs } = S; QR.off = false; bars(S, 4); const band = 4; let eIn = 0, n = 0;
    const [x, y] = R.Jam.center(J), sh = (() => { const pts = []; for (let k = 0; k <= 30; k++) { const a = k / 30 * Math.PI * 2; pts.push([x + 200 + Math.cos(a) * 30, y - 60 + Math.sin(a) * 27]); } const r = Sf.stroke(pts, pts.map((_, i) => i * 12), { endHold: 0 }); return r && Sf.W.bodies.get(r.id); })();
    const fp = sh ? JSON.stringify([sh.mat, sh.meta && sh.meta.role, sh.pts ? sh.pts.length : 0]) : '';
    for (let k = 0; k < 8; k++) { const t0 = Sf.now(), bs = S.bs(); for (let q = 0; q < 8 && play; q++) { T.run(Sf, bs / 8); if (sh && q % 4 === 0) Sf.strikeBody(sh, x + 200, y - 60, 200); Sf.strikesP.push({ t: Sf.now(), x: x + 20, y, f: 900, v: 1 }); }
      if (!play) T.run(Sf, bs); if (k >= 3) for (const c of J.members) { if (isL(J, c) || isB(c)) continue; const r = c.mind.qRec; if (r) for (const z of r.ns) if (z.b === band && !z.perc) eIn += z.v; } n++; }
    return { eIn, guest: st(Sf, 'qGuest'), same: sh ? JSON.stringify([sh.mat, sh.meta && sh.meta.role, sh.pts ? sh.pts.length : 0]) === fp : true, inst: J.members.map(c => c.P.inst.cut) }; };
  const a = run(false), b = run(true);
  ok('8a a player playing in one band: the movable members\' energy in that band falls (lead/bass keep theirs)', b.guest > 0 && b.eIn < a.eIn * .85, { off: +a.eIn.toFixed(1), on: +b.eIn.toFixed(1), guest: b.guest });
  ok('8b the shape is never changed by Q', b.same);
}
// ---- 10: hashes + determinism ----
if (!ONLY || ONLY === '10') {
  const run = off => { const S = jam(); QR.off = off; const notes = []; REC = []; bars(S, 10); for (const r of REC) notes.push(r.c.id + ':' + r.bar + ':' + r.out.map(n => [n.s, n.deg, n.vel, n.dur, n.stroke].join('/')).join(',')); REC = null;
    return { notes: notes.join('|'), g: S.cs.map(c => Array.from(c.g).join()).join('|'), mot: S.cs.map(c => JSON.stringify(c.mind.motifs || c.mind.motif || null)).join('|'), roles: S.cs.map(c => c.mind.role).join() }; };
  const a = run(false), b = run(false), o = run(true);
  ok('10a fixed seeds give identical note lists run to run (Q on)', a.notes === b.notes && a.notes.length > 100);
  ok('10b genomes, motifs and roles hash unchanged by Q', a.g === o.g && a.mot === o.mot && a.roles === o.roles, { g: a.g === o.g, mot: a.mot === o.mot, roles: [a.roles, o.roles] });
}
// ---- 11: off-screen ----
if (!ONLY || ONLY === '11') {
  const S = jam(30777, 6, { dx: 4000 }), { J, Sf, cs } = S; QR.off = false; const b0 = st(Sf, 'qBuild'); const c = cs.find(x => !isL(J, x) && !isB(x) && x.mind.role === 'comp');
  c.mind.qOct = 1; c.mind.qOctB = -99; REC = []; bars(S, 6); const mine = REC.filter(r => r.c === c && r.raw.some(n => n.deg != null && !n.perc));
  ok('11a off-screen jam: zero map builds', st(Sf, 'qBuild') === b0 && !Sf.inView(R.Jam.center(J), 120), { builds: st(Sf, 'qBuild') - b0 });
  ok('11b the cached arrangement is still applied (an ohm moved up an octave stays there)', mine.length > 0 && mine.every(r => r.out.filter(n => n.deg != null && !n.perc && !QR.prot(c.mind.E, n)).every(n => n.qo)), { bars: mine.length }); REC = null;
}
// ---- 12: experience ----
if (!ONLY || ONLY === '12') {
  const S = jam(), { J, Sf, cs } = S; QR.off = false; bars(S, 2); const L0 = Ex.learn, G0 = Ex.growTick, F0 = R.Trad && R.Trad.fuseTick, w = new Map();
  Ex.learn = (Sf2, c, j, L, ci, wt) => { w.set(c, (w.get(c) || []).concat(wt)); }; Ex.growTick = () => {}; if (R.Trad) R.Trad.fuseTick = () => {};
  const ph = J.E.phase; J.E.phase = 'settled';   /* Ex.good: the bonus rides the normal good-jam tick */ for (const c of cs) c.mind.qGoodT = null; Sf._exT = null; Ex.tick(Sf); const x = cs.find(c => w.get(c)); if (x) x.mind.qGoodT = Sf.now(); Sf._exT = null; Ex.tick(Sf); Ex.learn = L0; Ex.growTick = G0; if (F0) R.Trad.fuseTick = F0; J.E.phase = ph;
  const rx = w.get(x) ? w.get(x)[1] / w.get(x)[0] : 0, others = cs.filter(c => c !== x && w.get(c)).every(c => Math.abs(w.get(c)[1] / w.get(c)[0] - 1) < 1e-9);
  ok('12a a clear bar after a move gives exactly the +10% learn bonus (nobody else changes)', Math.abs(rx - 1.1) < 1e-9 && others, { rx });
  const nc = T.add(Sf, T.plain(777), 300); T.run(Sf, .2); QR.off = true; const g0 = JSON.stringify(Ex.gate(Sf, nc, J)); QR.off = false; const g1 = JSON.stringify(Ex.gate(Sf, nc, J));
  ok('12b Ex.gate results unchanged for the jam test seed', g0 === g1);
}
QR.off = false; QR.bar = bar0;
console.log(`v08q_check: ${pass}/${tot}`); if (pass < tot) process.exitCode = 1;
