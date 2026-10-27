// v0.8b6 headless check (Wilbow 8:51 / 8:57 PM MDT Oct 23 2026): "This should show in the auras of developed ohms" / "All ohms should show experience and
// influenced styles in auras not just teachers and drums. any ohm can be teacher with enough experience and its not only a title but a gradient scale".
// G1-G5 teaching is a continuous 0-1 gradient from experience (no threshold), gifted start higher, any ohm can teach, speeds follow it, old saves fine.
// S1-S9 experience strands: style strands = e.tx influences, sound strands = learned sounds (layers + learned kit hits), kit ring = kit fullness, on every
// ohm with experience, subtle on beginners, on screen only, one cached sprite, cost in budget, 0.8b2 base-aura hook. Lean: no screenshots.
const B = require('./drum_births.js'), RS = global.RS, D = RS.Drums, Mi = RS.Mind, T = B.T, Te = RS.Teacher, Au = RS.Aura, Ly = RS.Layers, Ex = RS.Exp;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
let NC = null; for (const p of ['canvas', '/workspace/softsound_previews/node_modules/canvas']) { try { NC = require(p); break; } catch (e) { } }
const Sf = B.fresh(833); let nid = 0;
const ohm = (o = {}) => { const g = RS.Genome.random(7001 + nid * 17); if (o.hits) { g[RS.IG.perc] = .92; g.dk = o.hits.map((h, i) => ({ h, s: RS.hash('y3', nid, i) >>> 0, b: 1 })); } else g[RS.IG.perc] = .1; nid++;
  const c = Sf.addCreature(g, Sf.view.cx - 200 + (nid % 10) * 40, Sf.ground(Sf.view.cx) - 40, { growth: 1, energy: .9, quiet: true }); if (!c.mind) { c.mind = Mi.make(Sf, c); c.mind.g = c.g; } c.exp = c.exp || Ex.make(c); return c; };
const withLv = (lv, fn) => { const tg = Te.target; Te.target = () => lv; try { return fn(); } finally { Te.target = tg; } };
// ---- G teaching gradient ----
const a = ohm(); let prev = -1, mono = true, jump = 0; const vals = new Set();
for (let L = 0; L <= 6.0001; L += .01) { const t = withLv(L, () => Te.teach(a)); if (t < prev - 1e-9) mono = false; if (prev >= 0) jump = Math.max(jump, t - prev); prev = t; vals.add(t); }
ok('G1 teaching strength rises monotonically with experience (0.8b2 scale: level / 5), 0 at birth, 1 at master', mono && withLv(0, () => Te.teach(a)) === 0 && Math.abs(withLv(2.5, () => Te.teach(a)) - .5) < 1e-9 && withLv(5, () => Te.teach(a)) === 1 && prev === 1, { L25: withLv(2.5, () => Te.teach(a)), L6: prev });
ok('G2 no hard threshold: continuous (largest step per .01 level < .006), hundreds of distinct values', jump < .006 && vals.size > 400, { jump: +jump.toFixed(4), distinct: vals.size });
{ const gf = ohm(); const gg = Te.gifted; Te.gifted = c => c === gf || gg(c); const both = [0, .5, 1, 2, 3, 4.5].map(L => withLv(L, () => [Te.teach(a), Te.teach(gf), Te.teachOf(null, a), Te.teachOf(null, gf)])); Te.gifted = gg;
  ok('G3 gifted births start a bit higher on the same gradient (and stay higher)', both.every(([x, y, xo, yo]) => y > x && y < 1 && yo > xo) && Math.abs(both[0][1] - Te.P.giftTeach) < 1e-6 && withLv(5, () => Te.teach(gf)) === 1, both.map(p => p.map(v => +v.toFixed(2)))); }
{ // any ohm can teach (0.8b2 design, no title gate): a barely experienced ohm passes on what is new to a newborn and gains it as a student; a stronger teacher passes on more
  const pair = (lv, s0) => { const t = ohm(), k = ohm(); t.exp.jn = lv > 0 ? 3 * Math.pow(4, lv - 1) : 0; Object.assign(t.exp, { tx: { gamelan: 3, japan: 2 }, rx: { drone: 2 }, mx: { '5/4': 1 } }); const j = { id: 'jp' + s0, members: [t, k] }; t.jam = k.jam = j; const g = Te.peer(Sf, k, j, .2); return { g, link: (k.exp.tch || []).includes(t.id), t: Te.teachE(t.exp) }; };
  const r = [.5, 1, 3, 5].map((lv, i) => pair(lv, i)); ok('G4 any ohm can teach: from level .5 a link forms and something passes on; more passes on the stronger the teacher (smoothly)', r.every(q => q.link && q.g > 0) && r.every((q, i) => !i || (q.g > r[i - 1].g && q.t > r[i - 1].t)), r.map(q => [+q.t.toFixed(2), +q.g.toFixed(3)])); }
{ // speeds follow the gradient: learned layers and kit growth both get faster smoothly as the teacher strengthens
  const mins = ts => ts.map(ts1 => { const b = ohm(), src = ohm(); const j = { id: 'jg', members: [b, src], E: {} }; b.jam = src.jam = j; b.exp.sl = [{ s: src.id, k: 'colour', p: 0, P: Ly.snap(src.P.inst) }]; const tt = Te.teachOf; Te.teachOf = (e, o) => o === src ? ts1 : 0;
    let t = 0; for (; t < 30000 && b.exp.sl[0].p < 1; t++) Ly.learn(Sf, b, j, .06); Te.teachOf = tt; return Math.round(t * 2 / 6) / 10; });
  const m = mins([0, .25, .5, .75, 1]); ok('G5 learning speed follows the teacher\'s strength smoothly (no step): layer minutes fall 0 -> .25 -> .5 -> .75 -> 1, ~2x at full', m.every((v, i) => !i || v < m[i - 1]) && m[0] / m[4] > 1.8 && m[0] / m[4] < 2.2, m); }
{ const c = ohm(); c.exp.jn = 40; const s0 = JSON.parse(JSON.stringify(RS.Creature.serial ? RS.Creature.serial(c) : Sf.serialCreature(c))); const b = Sf.loadCreature(s0);
  ok('G6 nothing new is saved for teaching (derived): an old save loads and teaches at the same strength', !/teach/.test(JSON.stringify(s0)) && Math.abs(Te.teach(b) - Te.teach(c)) < 1e-9 && Te.teach(b) > 0, { t: Te.teach(c) }); }
// ---- S strands ----
const st = ohm(); st.exp.tx = { hindustani: 3, maqam: 1.2, cuban: .4, celtic: .1 };
{ const S = Au.strands(st); ok('S1 style strands = the ohm\'s influences (e.tx), strongest first, weight rises with influence, coloured by the tradition', S.style.map(s => s.k).join() === 'hindustani,maqam,cuban,celtic' && S.style.every((s, i) => !i || s.w <= S.style[i - 1].w) && S.style.every(s => Array.isArray(s.col)), S.style.map(s => [s.k, s.w])); }
{ const n0 = Au.strands(st).sounds.length, src = [ohm(), ohm({ hits: ['kick'] })]; st.exp.sl = [{ s: src[0].id, k: 'colour', p: .3, P: Ly.snap(src[0].P.inst) }, { s: src[1].id, k: 'hit', p: 1, P: Ly.snap(src[1].P.inst) }]; const S = Au.strands(st);
  ok('S2 one sound strand per learned sound, coloured by the source family (a learned drum = its kit-slot colour), length grows with progress', n0 === 0 && S.sounds.length === 2 && S.sounds[1].k === 'perc:low' && JSON.stringify(S.sounds[1].col) === JSON.stringify(Au.SLOTC.low) && S.sounds[0].p === .3, S.sounds.map(s => [s.k, s.p])); }
const dr = ohm({ hits: ['shaker'] }), mates = [ohm({ hits: ['kick'] }), ohm({ hits: ['snare', 'tom'] }), ohm({ hits: ['hat', 'bell'] }), ohm({ hits: ['hand', 'clap'] }), ohm({ hits: ['wood'] })];
{ const F = [], N = [], K = []; let t = 0; const rec = () => { const S = Au.strands(dr); F.push(+S.kit.fullness.toFixed(3)); N.push(S.sounds.length); K.push(Au.strandKey(dr)); };
  rec(); for (; t < 40000 && !D.isFull(dr); t++) { D.study(dr, mates, .1 * .04 * 3 * .5, () => .5); if (t % 150 === 0) rec(); } rec();
  const learned = dr.g.dk.filter(e => e.l).length, S = Au.strands(dr);
  ok('S3 strand count = learned sounds for a growing drummer (birth hits are not strands)', S.sounds.length === learned && learned >= 4 && N.every((v, i) => !i || v >= N[i - 1]), { learned, strands: S.sounds.length });
  ok('S4 the kit ring tracks kit fullness: sparse (.2) when young -> 1 at full kit, never falls, equals Drums.fullness', F[0] === .2 && F[F.length - 1] === 1 && F.every((v, i) => !i || v >= F[i - 1]) && S.kit.fullness === D.fullness(dr.g), F.filter((v, i) => i % 6 === 0));
  ok('S5 the strand key changes as the kit grows (rebake), and only then (quantised)', new Set(K).size >= 5 && new Set(K).size < K.length, { keys: new Set(K).size, samples: K.length }); }
ok('S6 subtle on beginners: strand alpha ~.18 at level 0, ~.68 at level 4+', Math.abs(Au.strandAlpha(0) - .18) < 1e-6 && Au.strandAlpha(4) > .6 && Au.strandAlpha(1) < .3, [0, 1, 2, 4].map(L => +Au.strandAlpha(L).toFixed(2)));
if (NC) { Au.mk = (w, h) => NC.createCanvas(w, h); Au.S.cache.clear(); Au.S.bytes = 0; Au.S.jobs = [];
  { const S = Au.strands(dr), B1 = Au.bakeStrands(dr, S); const S2 = Au.strands(st), B2 = Au.bakeStrands(st, S2);
    ok('S7 the baked sprite draws exactly those strands (style / sound / kit-slot counts) and stays small (<= 128 px)', B1.n.sounds === S.sounds.length && B1.n.kit === 5 && B2.n.style === 4 && B2.n.sounds === 2 && B2.n.kit === 0 && B1.c.width <= 128, { dr: B1.n, st: B2.n, px: B1.c.width }); }
  { // every ohm with experience (a level-0 non-teacher, non-drummer included) is drawn; off-screen ohms get no key (no work)
    const beg = ohm(); beg.exp.tx = { blues: .5 }; beg._auL = 0; Te.tick(Sf, 2); const far = ohm(); far.exp.tx = { japan: 1 }; far.x = Sf.view.cx + 1e6; far._auSK = undefined; Te.tick(Sf, 2);
    const sel = Au.select(Sf); ok('S8 all ohms: a level-0 ohm with influences gets strands and is drawn; an off-screen one is skipped (no key, no bake)', !!beg._auSK && sel.some(o => o.c === beg) && far._auSK === undefined && !sel.some(o => o.c === far), { lvl: Te.target(beg.exp), key: !!beg._auSK }); }
  { // cost: a crowded screen (all on-screen ohms with strands) - bakes spread over frames (<= strandBakes / frame), steady frames cheap
    for (let i = 0; i < 24; i++) { const c = ohm(i % 3 ? {} : { hits: ['hat'] }); c.exp.tx = { [['western', 'cuban', 'japan', 'blues'][i % 4]]: 1 + i % 3 }; c.exp.jn = i * 20; } Te.tick(Sf, 2);
    global.App = { Wd: 390, Ht: 844 }; const cv = NC.createCanvas(390, 844), ctx = cv.getContext('2d'); Au.S.lvl = 0; Au.S.ema = 0; let worstBake = 0, steady = [], maxBakes = 0;
    for (let f = 0; f < 60; f++) { const b0 = Au.S.sBaked || 0, t0 = process.hrtime.bigint(); Au.frame(ctx, Sf, f / 60); const ms = Number(process.hrtime.bigint() - t0) / 1e6; maxBakes = Math.max(maxBakes, (Au.S.sBaked || 0) - b0); if ((Au.S.sBaked || 0) > b0) worstBake = Math.max(worstBake, ms); else if (f > 30) steady.push(ms); }
    const avg = steady.reduce((x, y) => x + y, 0) / Math.max(1, steady.length), drawn = Au.S.sDrawn;
    const off = []; Au.P.strands = 0; for (let f = 0; f < 20; f++) { const t0 = process.hrtime.bigint(); Au.frame(ctx, Sf, 2 + f / 60); off.push(Number(process.hrtime.bigint() - t0) / 1e6); } Au.P.strands = 1; const offAvg = off.slice(5).reduce((x, y) => x + y, 0) / 15, per = (avg - offAvg) / Math.max(1, drawn);
    ok('S9 render cost in budget on a crowded screen (36 ohms with strands): <= 1 strand bake a frame, nearest ' + drawn + ' strand sprites within their 1.5 ms sub-budget on top of the 0.8b2 aura frame (its faint glow on every ohm is the baseline; node-canvas is CPU-only), cache small', maxBakes <= Au.P.strandBakes && drawn >= 1 && drawn <= Au.P.maxStrands && avg - offAvg < Au.P.strandMs + .6 && Au.S.bytes < Au.P.cacheMB * 1048576, { drawn, steadyMs: +avg.toFixed(2), withoutStrandsMs: +offAvg.toFixed(2), perSpriteMs: +per.toFixed(3), worstBakeFrameMs: +worstBake.toFixed(2), MB: +(Au.S.bytes / 1048576).toFixed(2), lvl: Au.S.lvl }); }
  { let called = 0; Au.baseStrands = (ctx, c, S) => { called++; return Array.isArray(S.style); }; const b0 = Au.S.sBaked || 0; Au.S.cache.clear(); Au.S.bytes = 0; const cv = NC.createCanvas(390, 844); Au.frame(cv.getContext('2d'), Sf, 2); Au.baseStrands = null;
    ok('S10 0.8b2 hook: Au.baseStrands takes the strands into the base aura and the default sprite is skipped', called > 0 && (Au.S.sBaked || 0) === b0, { called }); }
} else console.log('skip S7-S10: no node-canvas');
{ // 0.8b2 styleHook: the aura's influenced-style tint (Au.styles -> palette) is driven by the b6 strands; finished learned sounds join it; the rebake key follows
  const o = ohm(); o.exp.tx = { gamelan: 3, japan: 1 }; Au.keyTick(o); const s0 = Au.styles(o, 5), k0 = Au.keyOf(o), p0 = Au.derive(o, 60, 2).pal.map(q => q.k);
  const src = ohm({ hits: ['kick'] }); o.exp.sl = [{ s: src.id, k: 'hit', p: 1, P: Ly.snap(src.P.inst) }]; Au.keyTick(o); const s1 = Au.styles(o, 5), k1 = Au.keyOf(o);
  const fresh = ohm(); fresh.exp.tx = {}; Au.keyTick(fresh); const own = Au.styles(fresh, 3);
  ok('S11 0.8b2 styleHook: Au.styles = the strands (influences strongest first, finished learned sounds as snd: entries), the palette follows, the rebake key changes with them; no influences -> b2 default', Au.styleHook && s0.map(q => q[0]).join() === 'gamelan,japan' && p0[0] === 'gamelan' && s1.some(q => q[0] === 'snd:perc:low') && k1 !== k0 && k1 === o._auK && own.length >= 1 && !own.some(q => /^snd:/.test(q[0])), { s0: s0.map(q => q[0]), s1: s1.map(q => [q[0], +q[1].toFixed(2)]), pal: p0, own: own.map(q => q[0]) }); }
console.log('v08y3 ' + pass + '/' + tot); process.exit(pass === tot ? 0 : 1);
