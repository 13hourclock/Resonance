// v0.8b6 learned sound layers check (Wilbow 6:57-7:00 PM MDT Oct 23 2026): every ohm keeps its birth instrument and can slowly learn up to 3
// other sounds from the ohms it jams with; partly learned = a faint layer, fully learned = pulled out cleanly on its own (a separate voice).
const T = require('./node_env.js'), RS = global.RS; const Ly = RS.Layers, Te = RS.Teacher, Ex = RS.Exp;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const scene = () => { const o = T.scene({ clear: true, useed: 3 }), Sf = o.Sf || o; Sf.noSeedItems = true; Sf.noPatches = true; Sf.stats = Sf.stats || {}; return { Sf, x0: (Sf.view.x0 + Sf.view.x1) / 2 }; };
const prep = (Sf, c) => { if (!c.mind) c.mind = RS.Mind.make(Sf, c); c.mind.quiet = false; c.exp = c.exp || Ex.make(c); return c; };
const isPerc = c => !!(c.mind && c.mind.perc > .55);
// a cast: one plain ohm + others whose birth instruments are clearly different
const cast = (Sf, x0, n, want) => { const a = prep(Sf, T.add(Sf, T.plain(11), x0)); const os = []; for (let s = 50; os.length < n && s < 400; s++) { const b = prep(Sf, T.add(Sf, T.plain(s), x0 + 30 + os.length * 25)); if (Ly.dist(a, b) >= .2 && (!want || want(b))) os.push(b); else { b.dead = true; Sf.creatures.splice(Sf.creatures.indexOf(b), 1); } } return { a, os }; };
const jam = (a, ms) => { const j = { id: 'jL', members: [a, ...ms], E: {} }; for (const c of j.members) c.jam = j; return j; };
const K = .06;   // a typical Ex.learn weight per 2 s tick (w 2 x RATE 1/15 x learn ~.5 x ~.9)
const minutes = (Sf, a, j, stop, cap = 600) => { let t = 0; for (; t < cap * 30; t++) { T.t += 2; Ly.learn(Sf, a, j, K); if (stop()) break; } return t / 30; };
// L1 old saves: no learned sounds, birth voice only
{ const { Sf, x0 } = scene(); const a = prep(Sf, T.add(Sf, T.plain(11), x0)); const s = JSON.parse(JSON.stringify(RS.Creature.serial ? RS.Creature.serial(a) : Sf.serialCreature(a))); delete s.exp; const b = Sf.loadCreature(s);
  ok('L1 an old save (no learned sounds) loads with none', !Ly.list(b) && !(b.exp && b.exp.sl)); }
// L2-L5 learning: slow, experience-weighted, capped at 3, birth instrument untouched
{ const { Sf, x0 } = scene(); const { a, os } = cast(Sf, x0, 5); const j = jam(a, os), I0 = JSON.stringify(a.P.inst), G0 = JSON.stringify(a.g);
  let m1 = 0; for (let r = 0; r < 24; r++) { a.exp.sl = []; m1 += minutes(Sf, a, j, () => a.exp.sl.length > 0) / 24; } a.exp.sl.length = 1; const L = a.exp.sl[0]; const m2 = minutes(Sf, a, j, () => L.p >= 1);
  ok('L2 slow: a beginner needs many minutes of jamming to start (average >= 10) and to fully learn a sound (>= 10)', m1 >= 10 && m2 >= 10, { start: +m1.toFixed(1), full: +m2.toFixed(1) });
  minutes(Sf, a, j, () => false, 400); ok('L3 capped: never more than 3 learned sounds', a.exp.sl.length === 3, a.exp.sl.length);
  ok('L4 the birth instrument (genes + engine parameters) is never changed', JSON.stringify(a.P.inst) === I0 && JSON.stringify(a.g) === G0);
  const src = os.find(o => o.id === L.s); ok('L5 a learned sound is the source ohm\'s birth sound (engine snapshot)', !!src && Object.keys(L.P).length > 5 && ['engName', 'drum', 'eng'].every(k => JSON.stringify(L.P[k]) === JSON.stringify(src.P.inst[k])) && L.P.eng !== src.P.inst.eng && Math.abs((L.P.cut || 0) - (src.P.inst.cut || 0)) < 1e-3);
  // experience + teacher weighting
  const rate = (lvlX, teach) => { const { Sf: S2, x0: x2 } = scene(); const { a: b, os: o2 } = cast(S2, x2, 1); const jj = jam(b, o2); b.exp.sl = [{ s: o2[0].id, k: 'colour', p: 0, P: Ly.snap(o2[0].P.inst) }]; const tg = Te.target; Te.target = e => e === b.exp ? lvlX : tg(e); const it = Te.teachOf; Te.teachOf = (e, o) => teach && o === o2[0] ? 1 : 0;   /* 8:57 PM gradient: a full-strength teacher vs none */
    const m = minutes(S2, b, jj, () => b.exp.sl[0].p >= 1); Te.target = tg; Te.teachOf = it; return m; };
  const r0 = rate(0, false), r3 = rate(3, false), r0t = rate(0, true); ok('L6 weighted by experience (level 3 learns ~4x faster than a beginner) and teachers teach ~2x faster', r3 < r0 / 3 && r0t < r0 / 1.8, { beginner: +r0.toFixed(1), level3: +r3.toFixed(1), fromTeacher: +r0t.toFixed(1) });
  const sv = JSON.parse(JSON.stringify(RS.Creature.serial ? RS.Creature.serial(a) : Sf.serialCreature(a))), b = Sf.loadCreature(sv); ok('L7 saved: learned sounds + progress survive save / load', JSON.stringify(Ly.list(b)) === JSON.stringify(a.exp.sl), JSON.stringify(sv.exp.sl).length);
  ok('L8 save cost stays small (< 4 KB for 3 sounds)', JSON.stringify(a.exp.sl).length < 4096, JSON.stringify(a.exp.sl).length); }
// L9-L13 playback
const notesOf = (c, t0) => T.notesSince(t0, n => n.src === c);
const playMany = (Sf, c, N, o = {}) => { const t0 = T.t; for (let i = 0; i < N; i++) { const w = T.t + .01 + i * 1.03; RS.Mind.play(Sf, c, Object.assign({ deg: i % 5, d: .4, vel: .7 }, o), w, 6.4); } T.t += N * 1.03 + 2; const by = {}; for (const n of notesOf(c, t0)) (by[n.when.toFixed(3)] = by[n.when.toFixed(3)] || []).push(n.n); return Object.values(by); };
{ const { Sf, x0 } = scene(); const { a, os } = cast(Sf, x0, 2); for (const o of os) o.dead = true; const P0 = a.P.inst;
  a.exp.sl = [{ s: os[0].id, k: 'colour', p: .5, P: Ly.snap(os[0].P.inst) }]; Sf.inView = () => true;
  const g1 = playMany(Sf, a, 40); const fa = g1.filter(g => g.length === 2 && g.some(n => n.inst === a.exp.sl[0].P) && g.some(n => !n.layer));
  ok('L9 partly learned: a faint extra voice under the birth voice (birth always present, layer gain ~ .35 x progress)', g1.length >= 30 && fa.length === g1.length && fa.every(g => { const b = g.find(n => !n.layer), l = g.find(n => n.layer); return l.gain <= b.gain * .35 * .5 + 1e-6 && (b.inst === P0 || b.inst.cut != null); }), { notes: g1.length, faint: fa.length });
  a.exp.sl[0].p = 1; a.exp.sl.push({ s: os[1].id, k: 'colour', p: 1, P: Ly.snap(os[1].P.inst) }); const LP = a.exp.sl.map(q => q.P);
  const g2 = playMany(Sf, a, 1200); const whenOf = g => T.notes.find(n => n.n === g[0]).when, clean = g2.filter(g => g.some(n => n.layer && n.layer[0] === 'L')), rest = g2.filter(g => !clean.includes(g));
  const pure = clean.every(g => g.length === 1 && LP.some(P => Object.keys(P).every(k => k === 'cut' || JSON.stringify(P[k]) === JSON.stringify(g[0].inst[k]))) && !g[0].tract);
  ok('L10 fully learned, "Alone, but rarely" (7:25 PM): a solo is the learned sound ALONE (one voice, learned parameters, no birth voice, no vocal tract); every other note keeps the birth voice with the learned sound blended faintly', clean.length >= 5 && pure && rest.every(g => g.length === 2 && g.some(n => !n.layer) && g.some(n => n.layer && n.layer[0] === 'f' && n.gain <= g.find(m => !m.layer).gain * .35 + 1e-6)), { notes: g2.length, solo: clean.length });
  { const sp = [...new Set(clean.map(g => Math.floor(whenOf(g) / Ly.P.phrase)))].sort((x, y) => x - y), nPh = new Set(g2.map(g => Math.floor(whenOf(g) / Ly.P.phrase))).size, consec = sp.some((v, k) => k && v - sp[k - 1] === 1), ends = clean.every(g => whenOf(g) / Ly.P.phrase % 1 >= 1 - Ly.P.soloEnd - 1e-9);
    ok('L11 rarity cap: solo share < 10% of notes over a long run, at most ~1 phrase in 8, never two phrases in a row, only at phrase endings', clean.length / g2.length < .1 && sp.length / nPh <= 1 / 8 && !consec && ends, { share: +(clean.length / g2.length).toFixed(3), phrases: sp.length + '/' + nPh, consec, ends }); }
  { const b = cast(Sf, x0 + 600, 1); b.a.mind.perc = .9; b.a.exp.sl = [{ s: b.os[0].id, k: 'hit', p: 1, P: Ly.snap(b.os[0].P.inst) }]; b.os[0].dead = true; const gd = playMany(Sf, b.a, 1200, { perc: true, db: true }); ok('L11b drums: never a learned solo on a downbeat', gd.every(g => !g.some(n => n.layer && n.layer[0] === 'L'))); }
  // DSP: a clean note renders exactly as the learned sound alone (zero birth-voice energy)
  { const A = RS.audio, SR = 48000, rend = Ps => { const d = A.DSPFactory(SR, RS.TractFactory, RS.InstFactory, RS.FXFactory), n = SR >> 1, x = new Float32Array(n); Ps.forEach((P, i) => d.msg({ t: 'inst', id: 7e6 + i, P, f: 220, dur: .3, vel: .8, gain: .2, pan: 0, send: 0, fx: -1, from: 0 })); for (let i = 0; i < n; i += 128) { const L = new Float32Array(128), R = new Float32Array(128); d.render(L, R, 128); x.set(L.subarray(0, Math.min(128, n - i)), i); } return x; };
    const g = clean[0][0], i = +g.layer.slice(1), C = rend([g.inst]), Lo = rend([Object.assign({}, a.exp.sl[i].P, g.inst.cut != null ? { cut: g.inst.cut } : {})]), B = rend([P0]);
    let res2 = 0, eL = 0, dot = 0, eB = 0; for (let k = 0; k < C.length; k++) { const r = C[k] - Lo[k]; res2 += r * r; eL += Lo[k] * Lo[k]; dot += C[k] * B[k]; eB += B[k] * B[k]; }
    const mix = rend([g.inst, P0]); let dm = 0; for (let k = 0; k < C.length; k++) dm += (mix[k] - C[k]) ** 2;
    ok('L12 a fully learned sound renders with no birth-voice energy (clean note == the learned voice alone; the birth voice would be audible if mixed in)', eL > 1e-4 && res2 / eL < 1e-12 && dm / eB > .1, { residual: res2 / eL, birthIfMixed: +(dm / eB).toFixed(2) }); }
  // off screen: birth voice only, no extra voices
  Sf.inView = () => false; const g3 = playMany(Sf, a, 40); ok('L13 off screen: birth voice only (no extra or clean voices, no cost)', g3.length >= 30 && g3.every(g => g.length === 1 && !g[0].layer)); }
// L14 drums: a fully learned hit is handed to RS.Drums.learn when the drums branch is present (guarded; absent = no error)
{ const { Sf, x0 } = scene(); const { a, os } = cast(Sf, x0, 1); a.mind.perc = .9; const j = jam(a, os); a.exp.sl = [{ s: os[0].id, k: 'hit', p: .999, P: Ly.snap(os[0].P.inst) }];
  const had = RS.Drums; let got = null; RS.Drums = Object.assign({}, had || {}, { learn: (c, h) => { got = [c.id, h.from]; } }); for (let i = 0; i < 50 && a.exp.sl[0].p < 1; i++) Ly.learn(Sf, a, j, .25); RS.Drums = had;
  const b = cast(Sf, x0 + 300, 1); b.a.mind.perc = .9; const jb = jam(b.a, b.os); b.a.exp.sl = [{ s: b.os[0].id, k: 'hit', p: .999, P: {} }]; let err = null; try { for (let i = 0; i < 50; i++) Ly.learn(Sf, b.a, jb, .25); } catch (e) { err = e.message; }
  ok('L14 drums: a fully learned hit goes to RS.Drums.learn(ohm, hitDef) when present; without the drums module nothing breaks', got && got[0] === a.id && got[1] === os[0].id && !err, { got, err, drumsModule: !!had }); }
// L15 wiring: Ex.learn drives it (the jam's experience tick), off when jam learning is off
{ const src = require('fs').readFileSync(__dirname + '/../www/js/exp.js', 'utf8'); ok('L15 wired into the jam experience tick (Ex.learn -> Layers.learn), off when jam learning is off', /RS\.Layers\.learn\(Sf, c, j, k\)/.test(src) && /RS\.Teacher\.P\.learn/.test(src)); }
const p = res.filter(Boolean).length; console.log(`v08y2 ${p}/${res.length}`); process.exitCode = p === res.length ? 0 : 1;
