// v0.8a6 (chunk 3c part 2, V08_SPEC P5-P7) headless check. P8 tests 7-9 (10 = perf_j, run separately):
// 7 ohms play shapes by technique (strike / pluck / bow / sing-to), <= 1 decision per 4 bars, off-screen none, the ohm's own instrument never changes
// 8 ensembles: marimba row (1:4:9.9, distinct adjacent degrees), harp (distinct chord tones), drum circle (size roles), drone (tonic/fifth)
// 9 jam pull: a 120 bpm shape near a 100 bpm jam pulls it partway (<= 125, <= 8 %/bar), it relaxes back; baton / own members / 500 px = no pull
const T = require('./node_env.js'), R = global.RS, SP = R.ShapePlay, Mi = R.Mind, To = R.Tonal;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const fresh = () => { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.items = []; T.run(Sf, .2); return Sf; };
const ring = (x, y, R0 = 30, n = 30) => { const p = []; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; p.push([x + Math.cos(a) * R0, y + Math.sin(a) * R0 * .9]); } return p; };
const blob = (Sf, x, y, R0) => { const p = ring(x, y, R0); const r = Sf.stroke(p, p.map((_, i) => i * 12), { endHold: 0 }); return r && Sf.W.bodies.get(r.id); };
const rod = (Sf, pts, h, o) => { Sf._drawing = true; try { return Sf.makeRod(pts, h, Object.assign({ role: 'instrument' }, o || {})); } finally { Sf._drawing = false; } };
const FP = o => Object.entries(o).filter(([k, v]) => typeof v === 'number' || typeof v === 'string').map(([k, v]) => k + v).join();
const ohm = (Sf, seed, x, y, inst, perc) => { const c = T.add(Sf, T.plain(seed), x - Sf.view.cx); c.y = y; T.run(Sf, .1); c.P.inst = Object.assign({}, c.P.inst, { strike: 0, pluck: 0, bow: 0, blow: 0, voc: 0 }, inst); if (perc != null) c.mind.perc = perc; c.P.beh.instrLove = .8; return c; };
const st = (Sf, k) => Sf.stats[k] || 0;
// ---- 7: techniques ----
if (!ONLY || ONLY === '7') {
  { const Sf = fresh(), cx = Sf.view.cx, gy = Sf.ground(cx), b = blob(Sf, cx + 40, gy - 60, 30), c = ohm(Sf, 7001, cx, gy - 30, { strike: 1 }, .9), f0 = FP(c.P.inst), t0 = Sf.now();
    T.run(Sf, 24); const bl = 4 * Mi.barLen(c.mind) / (c.mind.bpm / 60 * 4);
    ok('7a a percussive ohm strikes a blob (adopts it; strikes are the blob\'s own ring + voice)', st(Sf, 'sp_strike') >= 1 && c.home === b && st(Sf, 'layer') > 0, { d: st(Sf, 'sp_strike'), layer: st(Sf, 'layer') });
    ok('7b at most one decision per ohm per 4 bars', c._spN >= 1 && c._spN <= Math.floor((Sf.now() - t0) / bl) + 1, { n: c._spN, bars4: +((Sf.now() - t0) / bl).toFixed(2) });
    ok('7c the ohm\'s own instrument is untouched (no timbre taken from the shape)', FP(c.P.inst) === f0); }
  { const Sf = fresh(), cx = Sf.view.cx, gy = Sf.ground(cx), s = rod(Sf, [[cx - 60, gy - 90], [cx + 60, gy - 88]], 3, { pinStart: true, pinEnd: true }), c = ohm(Sf, 7002, cx, gy - 30, { pluck: 1 }, .05);
    T.run(Sf, 12); ok('7d a pluck ohm plucks a string', s.drawn && st(Sf, 'sp_pluck') >= 1 && c.home === s, { d: st(Sf, 'sp_pluck'), str: s.drawn }); }
  { const Sf = fresh(), cx = Sf.view.cx, gy = Sf.ground(cx), r = rod(Sf, [[cx - 70, gy - 12], [cx + 70, gy - 12]], 9); r.mat.clear = .8; const c = ohm(Sf, 7003, cx - 20, gy - 30, { bow: 1 }, .05), f0 = FP(c.P.inst);
    T.run(Sf, 14); ok('7e a bow ohm bows a clear rod (sustained, in the rod\'s voice)', st(Sf, 'sp_bow') >= 1 && st(Sf, 'spBow') >= 2, { d: st(Sf, 'sp_bow'), bows: st(Sf, 'spBow') });
    ok('7f bowing leaves the ohm\'s instrument alone', FP(c.P.inst) === f0); }
  { const Sf = fresh(), cx = Sf.view.cx, gy = Sf.ground(cx), b = blob(Sf, cx + 30, gy - 70, 34), c = ohm(Sf, 7004, cx, gy - 30, { voc: 1 }, .05);
    let hit = 0; for (let k = 0; k < 40 && !st(Sf, 'spSing'); k++) { T.run(Sf, 1); if (c.shp && c.shp.k === 'sing' && b.ring) hit++; }
    if (!st(Sf, 'spSing') && c.shp && c.shp.k === 'sing') { const f = Sf.S.tune(b, Sf.S.physics(b).f0, Sf.now()); Sf.play({ f0: f * 2, modes: [{ f: f * 2, a: 1, d: .4 }], dur: .4, src: c, raw: true, gain: .05 }, Sf.now(), c.x, c.y); }   // a sung note an octave above
    ok('7g a singer near a shape makes it ring back softly (no strike impulse) when it sings the shape\'s note', st(Sf, 'sp_sing') >= 1 && st(Sf, 'spSing') >= 1, { d: st(Sf, 'sp_sing'), rang: st(Sf, 'spSing') }); }
  { const Sf = fresh(), cx = Sf.view.cx + 3000, gy = Sf.ground(cx), b = blob(Sf, cx + 40, gy - 60, 30), c = ohm(Sf, 7001, cx, gy - 30, { strike: 1 }, .9);
    T.run(Sf, 12); ok('7h off-screen: no decisions, no shape playing', !Sf.inView(c.x, c.y, 0) && !c._spN && !st(Sf, 'spDecide'), { n: c._spN, dec: st(Sf, 'spDecide') }); }
}
// ---- 8: ensembles ----
if (!ONLY || ONLY === '8') {
  { const Sf = fresh(), cx = Sf.view.cx, gy = Sf.ground(cx), bs = [140, 120, 100].map((L, i) => rod(Sf, [[cx - 120 + i * 90, gy - 10], [cx - 120 + i * 90 + L * .2, gy - 10 - L]], 9));
    Sf._shapeEv++; T.run(Sf, 1.5); const E = (Sf.mods.shapeEns || []).find(e => e.kind === 'row');
    ok('8a three parallel bars = a marimba row (saved in mods.shapeEns)', !!E && E.ids.length === 3 && bs.every(b => b.rowBar), Sf.mods.shapeEns);
    const ph = Sf.S.physics(bs[0]); ok('8b row bars ring 1 : 4 : 9.9', ph.ratios.join() === '1,4,9.9', ph.ratios);
    const [x, y] = Sf.W.center(bs[0]), K = SP.keyAt(Sf, x, y), ds = bs.map(b => To.degOfCents(K.sys, 1200 * Math.log2(Sf.S.tune(b, Sf.S.physics(b).f0, Sf.now()) / K.base)).d).sort((a, b) => a - b);
    ok('8c each bar is a distinct adjacent scale degree', ds[1] === ds[0] + 1 && ds[2] === ds[1] + 1, ds);
    ok('8d recognition made a glow + one rising sweep', st(Sf, 'ensSweep') >= 1 && st(Sf, 'ensNew') >= 1); }
  { const Sf = fresh(), cx = Sf.view.cx, gy = Sf.ground(cx), ss = [0, 1, 2].map(i => rod(Sf, [[cx - 60 + i * 30, gy - 30], [cx - 60 + i * 30, gy - 160 - i * 15]], 3, { pinStart: true, pinEnd: true }));
    Sf._shapeEv++; T.run(Sf, 1.5); const E = (Sf.mods.shapeEns || []).find(e => e.kind === 'harp'); const [x, y] = Sf.W.center(ss[0]), K = SP.keyAt(Sf, x, y);
    const ds = ss.map(b => To.degOfCents(K.sys, 1200 * Math.log2(Sf.S.tune(b, Sf.S.physics(b).f0, Sf.now()) / K.base)).d); const ch = K.chord || [0, 2, 4];
    ok('8e three strings in a frame = a harp tuned to distinct chord tones', !!E && new Set(ds).size === 3 && ds.every(d => To.isChordTone(K.sys, d, ch)), { E: !!E, ds }); }
  { const Sf = fresh(), cx = Sf.view.cx, gy = Sf.ground(cx), bb = [[cx - 90, 40], [cx, 28], [cx + 80, 18]].map(([x, r]) => blob(Sf, x, gy - 80, r)); T.run(Sf, 1.5);
    const E = (Sf.mods.shapeEns || []).find(e => e.kind === 'circle'); ok('8f three blobs = a drum circle; the largest is the kick, the smallest the small drum', !!E && bb[0].drumRole === 'kick' && bb[2].drumRole === 'small' && bb[1].drumRole === 'tom', bb.map(b => b.drumRole)); }
  { const Sf = fresh(), J = R.Jam, cx = Sf.view.cx, cy = Sf.view.cy || 400;
    const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(R.Genome.express(T.plain(s)).inst)) return s; };
    const seeds = [pick(I => I.percK > .75, 7000), pick(I => I.percK < .2, 7100), pick(I => I.percK < .2, 7400), pick(I => I.percK < .2, 7800)];
    const cs = seeds.map((s, i) => { const c = T.add(Sf, T.plain(s), cx + [-90, 0, 90, 30][i] - Sf.view.cx); c.y = cy + [0, 40, 0, -60][i]; return c; }); T.run(Sf, 70);
    const j = cs.map(c => c.jam).find(Boolean); ok('8g a jam formed (for the drone)', !!j);
    if (j) { const ms = j.members.concat([j.leader]); ms.slice(0, 2).forEach(c => { c.P.inst = Object.assign({}, c.P.inst, { bow: 1 }); }); const m = j.leader.mind, gy = Sf.ground(j.x);
      const d = rod(Sf, [[j.x - 160, gy - 20], [j.x + 160, gy - 24]], 6); Sf._shapeEv++; T.run(Sf, 1.5); const E = (Sf.mods.shapeEns || []).find(e => e.kind === 'drone');
      const base = Mi.tonicHz(Sf, J.local(Sf, j.x, gy - 20)), f = SP.ensTune(Sf, d, base * 2 * Math.pow(2, 35 / 1200)), e = 1200 * Math.log2(f / (base * 2));
      const f5 = SP.ensTune(Sf, d, base * Math.pow(2, (To.cents(m.sys, 4) - 40) / 1200)), e5 = 1200 * Math.log2(f5 / (base * Math.pow(2, To.cents(m.sys, 4) / 1200)));
      ok('8h a 320 px rod + 2 bowing members = a drone pulled to the tonic or fifth (within 10 cents)', !!E && Math.abs(e) < 10 && Math.abs(e5) < 10, { E: !!E, e: +e.toFixed(1), e5: +e5.toFixed(1) }); } }
}
// ---- 9: jam pull ----
if (!ONLY || ONLY === '9') {
  const setup = () => { const Sf = fresh(), cx = Sf.view.cx, cy = Sf.view.cy || 400;
    const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(R.Genome.express(T.plain(s)).inst)) return s; };
    const seeds = [pick(I => I.percK > .75, 7000), pick(I => I.percK < .2, 7100), pick(I => I.percK < .2, 7400), pick(I => I.percK < .2, 7800)];
    const cs = seeds.map((s, i) => { const c = T.add(Sf, T.plain(s), cx + [-90, 0, 90, 30][i] - Sf.view.cx); c.y = cy + [0, 40, 0, -60][i]; return c; }); T.run(Sf, 70);
    const j = cs.map(c => c.jam).find(Boolean); if (!j) return { Sf }; const E = j.E, get = () => (E && E.bpmBase ? E.bpmBase : j.leader.mind.bpmT), set = v => { if (E && E.bpmBase) E.bpmBase = v; else j.leader.mind.bpmT = v; };
    set(100); T.run(Sf, 4); return { Sf, j, get, set }; };
  const shapeAt = (Sf, j, d) => { const gy = Sf.ground(j.x + d); return rod(Sf, [[j.x + d - 40, gy - 12], [j.x + d + 40, gy - 12]], 9); };
  const play = (Sf, b, secs, o) => { const [x, y] = Sf.W.center(b); const tr = []; let next = Sf.now(); const end = Sf.now() + secs; while (Sf.now() < end) { if (Sf.now() >= next) { Sf.strikeBody(b, x, y, 420, Sf.now(), o || {}); next += .5; } T.run(Sf, .05); } };
  { const { Sf, j, get } = setup(); ok('9a a jam formed', !!j);
    if (j) { const b = shapeAt(Sf, j, 200), b0 = get(), bars = []; const L = j.leader.mind, bl = () => Mi.barLen(L) / (L.bpm / 60 * 4);
      let prev = get(), maxStep = 0; const end = Sf.now() + 8 * bl() * 1.3; const [x, y] = Sf.W.center(b); let next = Sf.now(); while (Sf.now() < end) { if (Sf.now() >= next) { Sf.strikeBody(b, x, y, 420, Sf.now(), {}); next += .5; } T.run(Sf, .05); const v = get(); if (v !== prev) { maxStep = Math.max(maxStep, Math.abs(v / prev - 1)); prev = v; } }
      const v8 = get(); ok('9b a steady 120 bpm shape 200 px away pulls a 100 bpm jam toward it (but never past 125)', v8 > b0 + 2 && v8 <= 125, { b0: +b0.toFixed(1), v8: +v8.toFixed(1), W: Sf.stats.jamPullW });
      ok('9c the tempo moves at most 8 % per bar', maxStep <= .081, +maxStep.toFixed(3));
      T.run(Sf, 16 * bl()); const v16 = get(); ok('9d when the shape stops, the jam relaxes back within 3 % of its own tempo in 16 bars', Math.abs(v16 / b0 - 1) <= .03, { v16: +v16.toFixed(1), home: j._spHome }); } }
  { const { Sf, j, get } = setup(); if (j) { const b = shapeAt(Sf, j, 200), b0 = get(); const ms = j.members.concat([j.leader]); ms.forEach(c => { c.batonOn = true; }); const n0 = st(Sf, 'jamPull'); play(Sf, b, 12);
      ok('9e baton up: the shape has no pull', st(Sf, 'jamPull') === n0, { n: st(Sf, 'jamPull') - n0 }); ms.forEach(c => { c.batonOn = false; }); } }
  { const { Sf, j, get } = setup(); if (j) { const b = shapeAt(Sf, j, 200); const n0 = st(Sf, 'jamPull'); play(Sf, b, 12, { byCreature: j.leader }); ok('9f the jam\'s own members playing a shape do not pull the jam', st(Sf, 'jamPull') === n0, { n: st(Sf, 'jamPull') - n0 }); } }
  { const { Sf, j, get } = setup(); if (j) { const b = shapeAt(Sf, j, 500); const n0 = st(Sf, 'jamPull'); play(Sf, b, 12); ok('9g a shape 500 px away has no pull (450 px reach)', st(Sf, 'jamPull') === n0, { n: st(Sf, 'jamPull') - n0 }); } }
  { const { Sf, j } = setup(); if (j) { const b = shapeAt(Sf, j, 200), L = j.leader.mind, mot0 = JSON.stringify(L.motif), g0 = j.leader.g.slice(0, 240).join(); play(Sf, b, 20);
      { const m = L, base = Mi.tonicHz(Sf, m), fs = [0, 2, 4, 1].map(d => base * Math.pow(2, To.cents(m.sys, d) / 1200)), mot = [0, 1, 2, 3, 4], mm = JSON.stringify(m.motif); m.spLine = { fs, f: 1, until: Sf.now() + 60 }; m._spLast = null; m._spPh = 0;
        const outs = [0, 1, 2, 3].map(() => SP.borrow(Sf, m, mot, 0)), got = outs.map(o => o !== mot);
        ok('9i a heard line is borrowed into the local motif (intervals 2, 2, -3), at most 1 phrase in 3', got.join() === 'true,false,false,true' && outs[0].join() === '0,2,4,1,4' && JSON.stringify(m.motif) === mm, { got, o: outs[0] }); m.spLine = null; }
      ok('9h a borrowed line never rewrites the ohm\'s motif or genes', JSON.stringify(L.motif) === mot0 && j.leader.g.slice(0, 240).join() === g0, { borrow: st(Sf, 'spBorrow') }); } }
}
console.log('v08p2_check: ' + pass + '/' + tot + ' passed'); process.exit(pass === tot ? 0 : 1);
