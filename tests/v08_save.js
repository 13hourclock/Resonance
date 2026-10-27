// v0.8 H (chunk 1) headless checks: the rs2 save system (persist.js) + O1 per-ohm counters. ONLY=<name> runs one block.
const T = require('./save_env.js'), RS = global.RS;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const St = () => RS.Store, mem = () => RS.Store.mem;
const keys = pre => Object.keys(mem()).filter(k => k.startsWith(pre) && !k.endsWith('.bak'));
const line = (Sf, dx = 0) => { const x = Sf.view.cx + dx, g = Sf.ground(x), pts = []; for (let i = 0; i < 20; i++) pts.push([x - 100 + i * 10, g - 80 - Math.sin(i / 3) * 10]); return Sf.stroke(pts, pts.map((_, i) => i * 15), {}); };
const boot = async () => { const SV = await T.boot(); T.meta = St().meta(); SV.app = null; return SV; };
const enter = opt => { T.t = 0; const o = T.enter(opt); RS.Save.app = { Sf: o.Sf, save: () => St().saveMeta(T.meta) }; return o; };
const leave = o => { const SV = RS.Save; SV.flush(o.Sf); T.meta.mods[o.key] = o.Sf.mods; St().saveMeta(T.meta); };
const restart = async () => { await T.settle(); return boot(); };
(async () => {
// ---------- H.1 fresh start: old rs1 saves ignored (not loaded, not migrated, not deleted)
if (!ONLY || ONLY === 'fresh') { T.DB.clear(); T.DB.set('rs1:meta', JSON.stringify({ v: 3, t: 1, useed: 77, lineage: [{ id: 'x' }], alive: { '77:0': .9 }, orbit: {}, mods: {}, seen: {} })); T.DB.set('rs1:ark', JSON.stringify({ v: 1, t: 1, chunks: {} }));
  const SV = await boot(); const m = T.meta;
  ok('H1 fresh start: rs1 saves are not loaded into memory, the profile starts empty, and the old keys are still on disk (not migrated, not deleted)', !keys('rs1:').length && m.useed === 1 && !m.lineage.length && T.DB.has('rs1:meta') && T.DB.has('rs1:ark') && St().prefix === 'rs2:', { useed: m.useed, onDisk: [...T.DB.keys()] }); }
// ---------- H.2 a world with no player change stores nothing
if (!ONLY || ONLY === 'nodelta') { T.DB.clear(); const SV = await boot(); const o = enter({ useed: 11 }); T.run(o.Sf, 3); SV.pump(o.Sf, 1e7); SV.drain(o.Sf); const n = SV.flush(o.Sf); leave(o);
  ok('H2 visiting a world without changing it writes no world or chunk record', !keys('rs2:w:').length && !keys('rs2:c:').length && n === 0 && !SV.changedWorlds().length, { w: keys('rs2:w:'), c: keys('rs2:c:').length }); }
// ---------- H.3 round trip: header + chunks + ohms (+ tally) + mods survive a restart; unchanged chunks are not rewritten
let rt = null;
if (!ONLY || ONLY === 'roundtrip' || ONLY === 'registry') { T.DB.clear(); let SV = await boot(); let o = enter({ useed: 21 }); const Sf = o.Sf; T.run(Sf, 1);
  const r = line(Sf); const a = T.add(Sf, T.plain(31), Sf.view.cx - 60), b = T.add(Sf, T.plain(32), Sf.view.cx + 60); SV.markAt(Sf, a.x, a.y); T.run(Sf, .5); Sf.tap(a.x, a.y); Sf.mods.water = .37; Sf.mix = { bus: 1 };
  T.run(Sf, 2.2); SV.pump(Sf, 1e7); SV.drain(Sf); const w0 = SV.stats.writes; SV.pump(Sf, 2e7); SV.drain(Sf); const rewrite = SV.stats.writes - w0; leave(o);
  const ids0 = Sf.creatures.filter(c => !c.dead).map(c => c.id).sort(), mats0 = [...Sf.W.bodies.values()].filter(q => q.meta && q.meta.role === 'instrument').length, ta = JSON.stringify(a.tally);
  SV = await restart(); o = enter({ useed: 21 }); const S2 = o.Sf; for (const ci of [...S2.active]) S2.deactivate(ci); T.run(S2, .1);
  { const dr0 = [...Sf.W.bodies.values()].filter(q => q.drawn).map(q => q.uid + ':' + q.dr.s).sort(), dr1 = [...S2.W.bodies.values()].filter(q => q.drawn && q.dr).map(q => q.uid + ':' + q.dr.s).sort();
    ok('S3 (0.8a8) drawn shapes keep their drawn mark + voice seed across a save / restart', dr0.length >= 1 && JSON.stringify(dr0) === JSON.stringify(dr1), { dr0, dr1 }); }
  const ids1 = S2.creatures.filter(c => !c.dead).map(c => c.id).sort(), a2 = S2.creatures.find(c => c.id === a.id), mats1 = [...S2.W.bodies.values()].filter(q => q.meta && q.meta.role === 'instrument').length;
  ok('H3 round trip: the drawn material, both ohms (same ids), the tapped ohm\'s counters and the world mods/mix come back after a restart', r && r.k === 'material' && o.data && JSON.stringify(ids0) === JSON.stringify(ids1) && a2 && JSON.stringify(a2.tally) === ta && a2.tally.i >= 1 && mats1 === mats0 && mats0 > 0 && S2.mods.water === .37 && S2.mix.bus === 1, { ids0, ids1, mats0, mats1, ta, t2: a2 && a2.tally });
  ok('H3b delta: a second save pass with nothing new rewrites no chunk', rewrite <= 1, { rewrite });   // the header may tick (aliveness)
  rt = o; }
// ---------- H.4 registry: unknown components kept verbatim, newer versions untouched, step-wise migration v1 -> v2
if (!ONLY || ONLY === 'registry') { let SV = RS.Save, o = rt; const k = o.key;
  SV.register('ztest', { scope: 'world', v: 1, pack: c => c.Sf ? (c.Sf.zt || undefined) : undefined, unpack: (c, d) => { c.h.zt = d; } });
  o.Sf.zt = { n: 1 }; SV.markAt(o.Sf, o.Sf.view.cx, o.Sf.view.cy); SV.flush(o.Sf); const v1 = JSON.parse(mem()[k]).comp.ztest;
  const rec = JSON.parse(mem()[k]); rec.comp.alien = { v: 3, d: { x: 42 } }; rec.comp.mix = { v: 99, d: { future: 1 } }; rec.t = Date.now() + 5000; St().putStrs([[k, JSON.stringify(rec)]]);   // as written by a newer build
  SV = await restart(); SV.register('ztest', { scope: 'world', v: 2, migrate: { 1: d => ({ n: d.n, m: 'migrated' }) }, pack: c => c.Sf ? c.Sf.zt : undefined, unpack: (c, d) => { c.h.zt = d; } });
  o = enter({ useed: 21 }); const data = o.data; o.Sf.zt = data.zt; const mixNotApplied = !(o.Sf.mix && o.Sf.mix.future); o.Sf.mix = { bus: 2 }; SV.markAt(o.Sf, o.Sf.view.cx, o.Sf.view.cy); SV.flush(o.Sf); const rec2 = JSON.parse(mem()[k]);
  ok('H4 registry: an unknown component and a newer-version component are kept verbatim through load + save (never applied, never overwritten); a v1 component is migrated to v2', v1 && v1.v === 1 && rec2.comp.alien && rec2.comp.alien.d.x === 42 && rec2.comp.mix.v === 99 && rec2.comp.mix.d.future === 1 && mixNotApplied && data.zt && data.zt.m === 'migrated' && rec2.comp.ztest.v === 2, { alien: rec2.comp.alien, mix: rec2.comp.mix, zt: rec2.comp.ztest });
  delete SV.comps.ztest; SV.order.world = SV.order.world.filter(x => x !== 'ztest'); }
// ---------- H.5 reachability: three launches in three galaxies, each changed -> all three listed and loadable after a restart
if (!ONLY || ONLY === 'reach') { T.DB.clear(); let SV = await boot(); const opts = [{ useed: 31 }, { useed: 4242, sys: 2 }, { useed: 909, sys: 1 }], made = [];
  for (const op of opts) { SV = await restart(); T.meta.useed = op.useed; const o = enter(op); T.run(o.Sf, .5); const c = T.add(o.Sf, T.plain(op.useed), o.Sf.view.cx); SV.markAt(o.Sf, c.x, c.y); T.run(o.Sf, .3); leave(o); made.push({ key: o.key, id: c.id }); }
  SV = await restart(); const cw = SV.changedWorlds(), gs = SV.galaxies(); let loaded = 0;
  for (const m of made) { const d = SV.loadWorld(m.key); if (d && Object.values(d.chunks).some(ch => (ch.c || []).some(s => s.id === m.id))) loaded++; }
  ok('H5 every changed world is reachable: 3 launches -> 3 galaxies in the profile, 3 worlds in their galaxy records, each loads with its ohm', cw.length === 3 && gs.length === 3 && loaded === 3 && made.every(m => SV.isChanged(m.key)), { cw: cw.map(w => w.key), gs, loaded }); }
// ---------- H.6 idle-time saving: nothing while edits keep coming, a pass 2 s after the last edit, at most 30 s after the first
if (!ONLY || ONLY === 'idle') { T.DB.clear(); const SV = await boot(); let clk = 100000; SV.now = () => clk; const o = enter({ useed: 51 }), Sf = o.Sf; T.run(Sf, .5); const st = Sf._sv; const c = T.add(Sf, T.plain(5), Sf.view.cx);
  SV.pump(Sf); SV.markAt(Sf, c.x, c.y); clk += 1000; SV.pump(Sf); const early = !!st.q; clk += 1100; SV.pump(Sf); const after = !!st.q; SV.drain(Sf);
  // steady edits every 1 s: the quiet window never comes, the 30 s cap forces a pass
  let firstAt = null; for (let s = 1; s <= 40 && firstAt == null; s++) { clk += 1000; SV.mark(Sf, null); SV.pump(Sf); if (st.q) firstAt = s; }
  SV.drain(Sf); clk += 61000; SV.pump(Sf); const drift = !!st.q; SV.drain(Sf); SV.now = () => require('perf_hooks').performance.now();
  ok('H6 idle save: no pass 1 s after an edit, a pass 2 s after it; under constant edits a pass still comes by 30 s; a 60 s drift pass while ohms live there', !early && after && firstAt != null && firstAt <= 31 && drift, { early, after, firstAt, drift, slices: SV.stats.slices }); }
// ---------- H.7 O1 counters: watched (on screen only), taps, catches, offspring, teacher; off-screen ohms unchanged; saved via the registry
if (!ONLY || ONLY === 'tally') { T.DB.clear(); let SV = await boot(); const o = enter({ useed: 61 }), Sf = o.Sf; T.run(Sf, .5);
  const a = T.add(Sf, T.plain(71), Sf.view.cx - 40), b = T.add(Sf, T.plain(72), Sf.view.cx + 40), far = T.add(Sf, T.plain(73), Sf.view.cx + 1400); T.run(Sf, .3);
  const vis = () => [a, b, far].map(c => c.lod); T.run(Sf, 10); const wA = a.tally && a.tally.w, wFar = far.tally ? far.tally.w : 0;
  Sf.tap(a.x, a.y); const i1 = a.tally.i; RS.Creature.teach(Sf, a, b); const e = Sf.layEgg(a, b); if (e) Sf.hatch(e); const off = a.tally.o, teach = (b.tally.t || []).includes(a.id);
  const cb = Sf.catch(b); const iB = b.tally.i; SV.flush(Sf);
  ok('O1 watched seconds count only on screen (a ~10 s, the far ohm 0); tap, catch, offspring and teacher are counted', wA >= 9 && wA <= 11 && wFar === 0 && i1 >= 1 && off >= 1 && teach && iB >= 1, { wA, wFar, lod: vis(), i1, off, teach, iB, egg: !!e, caught: !!cb });
  const st = JSON.parse(mem()[SV.K.c(o.key, Sf.chunkKey(Sf.P.chunkOf(Sf.P.theta(a.x, a.y))))] || '{}'), sa = st.comp && st.comp.ohms.d.find(s => s.id === a.id);
  ok('O1 counters are stored as the versioned \'tally\' ohm component, a few bytes per ohm', sa && sa.cp && sa.cp.tally && sa.cp.tally.v === 1 && JSON.stringify(sa.cp.tally).length <= 60, sa && sa.cp); }
// ---------- H.8 zero off-screen per-frame work: an ohm far off screen for 10 sim minutes keeps its counters untouched; step overhead of the hooks
if (!ONLY || ONLY === 'offscreen') { T.DB.clear(); const SV = await boot(); const o = enter({ useed: 71 }), Sf = o.Sf; T.run(Sf, .5); const far = T.add(Sf, T.plain(75), Sf.view.cx + 1500); far.tally = { w: 3, i: 2, o: 0, t: [] }; const t0 = JSON.stringify(far.tally);
  const dt = 1 / 20; for (let i = 0; i < 600 * 20 / 10; i++) { T.t += dt * 10; Sf.step(dt * 10); }   // 10 sim minutes, coarse steps
  const t1 = JSON.stringify(far.tally);
  // overhead: same world with and without the save hooks
  const mkRaw = () => { const U = RS.Universe(72), sys = RS.System(U, 0), M = RS.Music(7), S = RS.Surface._raw({ M, A: T.A, sys, body: sys.bodies[1].moons[0], key: 'raw', useed: 72 }); S.now = () => T.t; const [x, y] = S.P.top(0); S.view = { x0: x - 206, x1: x + 206, y0: y - 600, y1: y + 260, cx: x, cy: y - 170, z: 1 }; return S; };
  const mkHook = () => { const S = RS.Surface({ M: RS.Music(7), A: T.A, sys: RS.System(RS.Universe(72), 0), body: RS.System(RS.Universe(72), 0).bodies[1].moons[0], key: 'hk', useed: 72 }); S.now = () => T.t; const [x, y] = S.P.top(0); S.view = { x0: x - 206, x1: x + 206, y0: y - 600, y1: y + 260, cx: x, cy: y - 170, z: 1 }; SV.attach(S, 'rs2:w:72:0:ark', null); return S; };
  const time = S => { for (let i = 0; i < 60; i++) { T.t += 1 / 60; S.step(1 / 60); } const t = process.hrtime.bigint(); for (let i = 0; i < 600; i++) { T.t += 1 / 60; S.step(1 / 60); SV.pump(S); } return Number(process.hrtime.bigint() - t) / 1e6 / 600; };
  const r1 = time(mkRaw()), h1 = time(mkHook()), r2 = time(mkRaw()), h2 = time(mkHook()), raw = Math.min(r1, r2), hk = Math.min(h1, h2);
  ok('H8 off screen: a far ohm\'s counters are unchanged after 10 sim minutes; the hooks + saver pump add little per frame', t0 === t1 && hk < raw * 1.15 + .05, { t0, t1, rawMs: +raw.toFixed(3), hookedMs: +hk.toFixed(3) }); }
// ---------- H.9 hide / leave flush: pending edits are written synchronously (no idle pass needed), within a frame budget
if (!ONLY || ONLY === 'flush') { T.DB.clear(); let SV = await boot(); const o = enter({ useed: 81 }), Sf = o.Sf; T.run(Sf, .5); const r = line(Sf); const c = T.add(Sf, T.plain(9), Sf.view.cx + 30); SV.markAt(Sf, c.x, c.y);
  const t0 = process.hrtime.bigint(); SV.flush(Sf); const ms = Number(process.hrtime.bigint() - t0) / 1e6; St().saveMeta(T.meta);
  SV = await restart(); const d = SV.loadWorld(o.key), has = d && Object.values(d.chunks).some(ch => (ch.c || []).some(s => s.id === c.id));
  ok('H9 hide flush: an edit made a moment before the app is hidden is on disk after a restart; the flush takes < 30 ms here', r && has && ms < 30, { ms: +ms.toFixed(2), has }); }
// ---------- H.10 the guide hint progress is the player's (profile), not one world's
if (!ONLY || ONLY === 'guide') { T.DB.clear(); let SV = await boot(); let o = enter({ useed: 91 }); o.Sf.mods.guide = { step: 3, done: false, id: 'cX', oh: { pinch: 2 }, ohd: { tap: 1 } }; SV.markAt(o.Sf, o.Sf.view.cx, o.Sf.view.cy); leave(o);
  SV = await restart(); o = enter({ useed: 92 }); const g = o.Sf.mods.guide;
  ok('H10 guide hint counters travel with the player to a new world (the guide ohm id stays with its world)', g && g.step === 3 && g.oh && g.oh.pinch === 2 && g.ohd.tap === 1 && g.id !== 'cX', g); }
console.log(res.every(Boolean) ? 'ALL OK' : 'SOME FAILED', res.filter(Boolean).length + '/' + res.length);
process.exit(0);
})().catch(e => { console.error(e); console.log('SOME FAILED (exception)'); process.exit(1); });
