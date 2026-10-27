// v0.8b3 headless check: the clay start shape (claylook.js), the hatched ohm keeping the clay's outline, Q173 velocity brightness / pressure / accents.
const T = require('./node_env.js'), RS = global.RS, spiral = require('./spiral_synth.js'), Mo = RS.Mold, CS = RS.ClayStage, CL = RS.ClayLook, I = RS.IG;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const mk = (seed = 0) => { T.t = 0; const o = T.scene({ clear: true, useed: 1 + seed }), Sf = o.Sf || o, x0 = (Sf.view.x0 + Sf.view.x1) / 2, s = spiral({}); Sf.stroke(s.pts.map(p => [p[0] - 400 + x0, p[1] - 300 + Sf.ground(x0) - 160]), s.times, { hy: .4, endHold: 600 }); const k = Sf.clay; if (k) T.run(Sf, .6); return { Sf, k }; };
const prof = k => { const b = k.sb, R = Mo.radius(k), r = []; for (let i = 0; i < b.n; i++) r.push(Math.hypot(b.rx[i], b.ry[i]) / R); return r; };
// V1 start shapes: every lump is born its own organic (non-round) shape
const ks = []; for (let s = 0; s < 8; s++) { const { Sf, k } = mk(40 + s); if (k) ks.push({ Sf, k, p: prof(k), born: k.cs && k.cs.born }); }
ok('V1 eight spirals + rest make eight clays, each with a seeded start shape', ks.length === 8 && ks.every(o => o.born && o.born.lobes.length >= 2), ks.map(o => o.born && o.born.lobes.length));
const spread = p => Math.max(...p) - Math.min(...p);
ok('V2 none is a ball: the outline varies by > .3 R around', ks.every(o => spread(o.p) > .3), ks.map(o => +spread(o.p).toFixed(2)));
let minD = 9; for (let a = 0; a < ks.length; a++) for (let b = a + 1; b < ks.length; b++) { let d = 0; for (let i = 0; i < ks[a].p.length; i++) d += Math.abs(ks[a].p[i] - ks[b].p[i]); minD = Math.min(minD, d / ks[a].p.length); }
ok('V3 all eight start shapes differ (mean outline difference > .05 R)', minD > .05, +minD.toFixed(3));
{ const g0 = RS.Genome.random(4242), one = () => { const { Sf } = mk(41); if (Sf.clay) Mo.hatch(Sf, 'test'); const k = Mo.make(Sf, Float32Array.from(g0), Sf.view.x0 + 300, Sf.ground(Sf.view.x0 + 300) - 200); return k && k.cs && k.cs.born; }, A = one(), B = one(); ok('V4 the same seed gives the same start shape (deterministic, no extra rng)', JSON.stringify(A) === JSON.stringify(B)); }
// V5 the start shape feeds the timbre map: dents -> body resonance, length -> sustain
{ const dn = ks.filter(o => o.born.dents.length), nd = ks.filter(o => !o.born.dents.length); const avg = (L, f) => L.reduce((a, o) => a + f(o), 0) / Math.max(1, L.length);
  ok('V5 born dents carry body resonance (dented lumps >= .3 bodyRes)', dn.every(o => o.k.g[I.bodyRes] >= .3), dn.map(o => +o.k.g[I.bodyRes].toFixed(2)));
  const lg = ks.filter(o => o.born.len > .25); ok('V6 long start shapes sustain (len > .25 -> sus > .3)', lg.every(o => o.k.g[I.sus] > .3), lg.map(o => [o.born.len, +o.k.g[I.sus].toFixed(2)])); }
{ const ids = new Set(ks.map(o => RS.Inst.identity ? JSON.stringify(RS.Inst.identity(o.k.P.inst || RS.Inst.fromGenome(o.k.g), o.k.g)) : RS.Genome.toCode(o.k.g))); ok('V7 untouched clays still sound different from each other', ids.size >= 6, ids.size); }
// V8 the hatched ohm keeps the clay's outline (and through a save)
{ const { Sf, k } = mk(50), R = Mo.radius(k); const L = [[k.x + R * .5, k.y], [k.x + R * 1.8, k.y]]; const Fb = CL.formOf(k); CS.point(Sf, k, 0, 1); const F0 = CL.formOf(k); const c = Mo.hatch(Sf, 'test');
  ok('V8 hatch passes the clay outline: one body, 48-point form', c && c.form && c.form.length === 48 && c.segs.length === 1 && !!c.segs[0].formO, c && { f: c.form && c.form.length, s: c.segs.length });
  const up = Math.max(F0[0] - Fb[0], F0[1] - Fb[1], F0[47] - Fb[47]); ok('V9 a point pulled at 0 rad shows in the hatched form there (spiky where the clay was)', up > .25, { up: +up.toFixed(2), b: Fb[0], a: F0[0] });
  const s = RS.Creature.serial ? RS.Creature.serial(c) : null; ok('V10 the form is saved with the ohm', s && s.form && s.form.length === 48);
  if (s) { const c2 = Sf.loadCreature(Object.assign({}, s, { id: undefined, x: c.x + 300 })); ok('V11 ... and comes back on load', c2 && c2.form && c2.segs.length === 1 && c2.segs[0].formO); }
  const ctx = new Proxy({}, { get: () => () => {} }); ok('V12 the render path draws the form (a transform is found)', CL.formPath(ctx, Sf.W, c.segs[0], c) && c._ft && isFinite(c._ft.rot)); }
{ const { Sf, k } = mk(52); const pk = Mo.pack(Sf); ok('V13 a clay save keeps the formed outline', pk && pk.form && pk.form.length === 48); Sf.clay = null; const c = Mo.restore(Sf, pk); ok('V13 ... and the restored ohm is built in it', c && c.form && c.segs.length === 1); }
// V14 fingerprints stay
{ const { Sf, k } = mk(53); const R = Mo.radius(k); RS.Mold.SB.touch(k, 'tap', k.x + R * .3, k.y); RS.Mold.SB.touch(k, 'poke', k.x - R * .3, k.y); T.run(Sf, 2); ok('V14 taps / pokes inside the clay leave fingerprints that stay', k.cs.prints && k.cs.prints.length >= 2, k.cs.prints && k.cs.prints.length); }
// V15 the look is ON and costs nothing extra off the clay: the matte draw runs on a mock canvas without errors
{ const { Sf, k } = mk(54); let n = 0; const ctx = new Proxy({}, { get: (t, p) => (p === 'createLinearGradient' || p === 'createRadialGradient') ? () => ({ addColorStop() {} }) : () => { n++; } }); ok('V15 Mo.look draws the clay (matte path, no glow sticker)', Mo.look(ctx, Sf, 1) === true && n > 20, n); }
// Q173a: harder = brighter on every engine
{ const br = L => { let e = 0, d = 0; for (let i = 1; i < L.length; i++) { e += L[i] * L[i]; d += (L[i] - L[i - 1]) ** 2; } return Math.sqrt(d / Math.max(1e-12, e)); };
  const g = RS.Genome.random(77), out = []; for (let e = 0; e < 9; e++) { const P = Object.assign({}, RS.Inst.fromGenome(g)); if (e < 8) { P.eng = [[e, 1]]; P.nres = 0; } else { P.eng = []; P.nres = .8; } P.cut = 1500; P.fenv = .5;
    const lo = br(RS.Inst.render(P, 220, .4, .5, 48000, .3)), hi = br(RS.Inst.render(P, 220, .4, .5, 48000, .95)); out.push([RS.ENGINES[e], +(hi / lo).toFixed(3)]); }
  ok('Q173a every engine is brighter on a hard hit (vel .95 vs .3)', out.every(o => o[1] > 1.04), out); }
// Q173b pressure: only real when the phone reports varying values
{ const F = RS.Force; F.reset(); F.down(.5, 'touch'); F.note(1, 'touch'); F.note(0, 'touch'); ok('Q173b constant 0 / .5 / 1 pressure is not trusted (tap speed stays)', !F.real && F.strength(.4) === .4);
  F.down(.31, 'touch'); F.note(.62, 'touch'); ok('Q173b varying pressure is used (harder press = stronger)', F.real && F.strength(.4) > .7, F.strength(.4)); F.down(.1, 'touch'); ok('Q173b ... and a light press is soft', F.strength(.9) < .35, F.strength(.9)); F.reset(); }
// Q173c accents
{ const m = { dyn: .8 }, c = { born: 123 }; const a = []; for (let i = 0; i < 64; i++) a.push(RS.Mind.accent(c, m, i / 8, {})); const db = RS.Mind.accent(c, m, 1, { db: 1 }), orn = RS.Mind.accent(c, m, 1, { orn: 1 });
  ok('Q173c ohms vary their own hit strength (accents and soft notes)', Math.max(...a) - Math.min(...a) > .2 && a.every(v => v >= .6 && v <= 1.35), [Math.min(...a), Math.max(...a)].map(v => +v.toFixed(2)));
  ok('Q173c downbeats lean on, ornaments lean back', db > orn, [db, orn].map(v => +v.toFixed(2))); ok('Q173c deterministic', RS.Mind.accent(c, m, 2, {}) === RS.Mind.accent(c, m, 2, {})); }
const p = res.filter(Boolean).length; console.log('v08v ' + p + '/' + res.length); process.exit(p === res.length ? 0 : 1);
