// v0.8b songsave headless check (Wilbow 7:27 PM MDT Oct 23 2026: "When exiting the game the song didn't sound the same on return.  It needs to preserve it" /
// "It should preserve it in both cases"). Each world plays T1 s, then forks: control (keeps playing), close (save + resume record, app restart on the fake IndexedDB,
// 10 min closed, reopen with the record) and close0 (the same restart without the song snapshot = what master did with the same world). The note streams after the
// fork are compared modulo a constant time offset (ohm id | role | pitch | time to 5 ms).
// SWITCHED AWAY: switch = the app goes to the background for 30 s (visibilitychange hidden, no frames, then visible) with the game clock driven by the REAL
// www/js/audio.js clock (loaded in a vm with a fake page clock / document); switch0 = the same with master's audio.js (= what the player heard on 0.8b1; since 0.8b5 shipped the fix, 'master' here = tag v0.8b4, env SS_REF).
// The browser run of both cases (events, IndexedDB, real WebAudio) is tests/pw_songsave.js.
// Arms run as child processes so every arm builds the identical world. WORLDS=plain,items,retrace  ARM=... runs one arm (internal).
process.env.ID_SEED = process.env.ID_SEED || '71';
const ARM = process.env.ARM, path = require('path');
const T1 = +(process.env.T1 || 45), T2 = +(process.env.T2 || 40);
if (!ARM) { const { execFileSync } = require('child_process'); const cmp = require('./songsave_cmp.js'); let pass = 0, tot = 0; const bugW = [];
  const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
  const run = (w, arm) => JSON.parse(execFileSync(process.execPath, [__filename], { env: Object.assign({}, process.env, { ARM: arm, WORLD: w }), maxBuffer: 1 << 26 }).toString().split('\n').filter(l => l.startsWith('{')).pop());
  for (const w of (process.env.WORLDS || 'plain,items,retrace').split(',')) { const C = run(w, 'control'), R = run(w, 'close'), Z = run(w, 'close0'), C2 = run(w, 'control');
    const W10 = a => a.filter(n => +n.split('|').pop() < T1 + 10.5);   // the first ten seconds after reopening
    const sR = cmp(C.out, R.out), sZ = cmp(C.out, Z.out), sC = cmp(C.out, C2.out), sR10 = cmp(W10(C.out), W10(R.out)), sZ10 = cmp(W10(C.out), W10(Z.out));
    ok(w + ': the world is deterministic (control vs control)', sC.sim === 1, sC);
    ok(w + ': the world had a song going at the fork (a jam or an ensemble, notes)', (C.jams >= 1 || /:E\d/.test(C.s0)) && C.out.length > 40, { jams: C.jams, notes: C.out.length, s0: C.s0 });
    ok(w + ': close + reopen: every ohm comes back into its part', R.restored && R.restored.n >= 4 && !R.restored.miss, { restored: R.restored });
    ok(w + ': close + reopen: the first 10 s after reopening are note for note what would have played (ohm, role, pitch, timing)', sR10.sim >= .98, { sim10: sR10.sim, d: sR10.d });
    ok(w + ': close + reopen: the whole ' + T2 + ' s after reopening stays the same song (later drift = body-contact chaos only)', sR.sim >= .85, { sim: sR.sim, notes: R.out.length, control: C.out.length });
    ok(w + ': close + reopen: same jams / roles / bpm right after reopening as at the moment it closed', R.s0r === C.s0, { closed: C.s0, reopened: R.s0r });
    ok(w + ': close + reopen: the clock carries on from the saved song time (no phase jump)', Math.abs(sR.d || 0) < .006, { d: sR.d });
    const S = run(w, 'switch'), S0 = run(w, 'switch0'), sS = cmp(C.out, S.out), sS10 = cmp(W10(C.out), W10(S.out)), sS010 = cmp(W10(C.out), W10(S0.out));
    ok(w + ': switch away 30 s + back: the game clock is paused while away (no jump on return)', Math.abs(S.jump) < 1e-6 && S.away >= 29.9, { jump: S.jump, away: S.away });
    ok(w + ': switch away + back: the first 10 s after returning are note for note what would have played', sS10.sim >= .98, { sim10: sS10.sim, d: sS10.d });
    ok(w + ': switch away + back: the whole ' + T2 + ' s after returning stays the same song', sS.sim >= .85 && Math.abs(sS.d || 0) < .006, { sim: sS.sim, d: sS.d });
    ok(w + ': switch away + back: same jams / roles / bpm on return as when it left', S.s0r === C.s0, { left: C.s0, back: S.s0r });
    ok(w + ': with master\'s clock (jumps by the time away) the return is not note for note the same (check sensitivity)', sS010.sim < sS10.sim && Math.abs(S0.jump - 30) < .01, { master_jump: S0.jump, master_sim10: sS010.sim, roles_on_return: S0.s0r }); if (sS010.sim < .5) bugW.push(w);
    if (w === 'plain') { const X = run(w, 'cut'); ok(w + ': a record whose world save was cut short (an ohm missing) is dropped whole: no half-restored song, no errors, the world plays on', X.restored && X.restored.skipped && X.out.length > 20, { restored: X.restored, notes: X.out.length }); }
    if (w === 'items') ok(w + ': effect items and their holders come back', R.items === C.items && parseInt(R.items) >= 1, { control: C.items, reopened: R.items });
    if (w === 'retrace') ok(w + ': drawn / retraced pieces come back with their voices', R.drawn === C.drawn && R.drawn >= 1, { control: C.drawn, reopened: R.drawn });
    ok(w + ': the check catches the bug: without the snapshot (= master) the song is not the same', sZ10.sim < .5, { master_sim10: sZ10.sim, master_sim: sZ.sim, roles_after_reopen: Z.s0r }); }
  if (!process.env.WORLDS) ok('the switch-away check catches the bug: master\'s clock audibly changes the song (sim10 < .5) in at least 2 of the 3 worlds', bugW.length >= 2, { worlds: bugW });
  console.log(pass + '/' + tot + ' songsave checks passed'); process.exit(pass === tot ? 0 : 1); }
// ---- one arm ----
const T = require('./save_env.js'), RS = global.RS, SS = RS.SongSave, It = RS.Items, W = process.env.WORLD || 'plain', U = { plain: 31, items: 41, retrace: 51 }[W];
const St = () => RS.Store;
const tune = Sf => { Sf.noSeedItems = Sf.noPatches = true; const us = Sf.updateSky; Sf.updateSky = () => { us(); Sf.day = 1; }; };
const opt = { useed: U, ink: W === 'retrace' };
const st = Sf => Sf.creatures.filter(c => !c.dead && c.mind).map(c => [c.id, c.mind.role, c.mind.E && c.mind.E.id, c.jam && c.jam.id, Math.round(c.mind.bpm)].join(':')).sort().join(' ');
const tm = p => p.map((_, i) => i * 12);
const arc = (x, y, R = 70, n = 30) => { const p = []; for (let k = 0; k <= n; k++) { const a = Math.PI * (.1 + .8 * k / n); p.push([x + Math.cos(a) * R, y - Math.sin(a) * R * .7]); } return p; };
const jit = (p, a, s = 1) => p.map(([x, y], i) => [x + Math.sin(i * 1.7 + s) * a, y + Math.cos(i * 2.3 + s) * a]);
const midi = f => Math.round(12 * Math.log2(f / 440) + 69);
const items = Sf => (Sf.items || []).length + ':' + Sf.creatures.filter(c => c.item).length;
const drawn = Sf => [...Sf.W.bodies.values()].filter(b => b.drawn).length;
// the headless audio logs every note at once (future ones included): the ones not yet due at a close are what the real A.q holds
T.A.qOut = () => T.notes.filter(x => x.when > T.t + 1e-9).map(x => ({ when: x.when, n: x.n }));
T.A.qIn = l => { for (const e of l) T.notes.push({ n: e.n, when: e.when }); };
(async () => {
  T.DB.clear(); let SV = await T.boot(); T.meta = St().meta(); SV.app = null; T.t = 0;
  let o = T.enter(opt), Sf = o.Sf; tune(Sf); RS.Save.app = { Sf, save: () => St().saveMeta(T.meta) }; T.t += 1 / 60; Sf.step(1 / 60);
  for (const c of Sf.creatures.slice()) Sf.removeCreature(c); for (const b of [...Sf.W.bodies.values()]) if (b.meta && b.meta.role !== 'ground') Sf.W.removeBody(b); Sf.items = []; Sf.patches = [];
  const cx = Sf.view.cx;
  const cs = [-330, -110, 110, 330].map((dx, i) => T.add(Sf, T.plain(13000 + i * 17 + U), cx + dx, { quiet: false }));
  for (const c of cs) SV.markAt(Sf, c.x, c.y);
  if (W === 'items') { It.make(Sf, 'rev', cx - 200, Sf.ground(cx - 200) - 22); It.make(Sf, 'dly', cx + 220, Sf.ground(cx + 220) - 22); }
  if (W === 'retrace') { T.run(Sf, .3); const p = arc(cx, Sf.ground(cx) - 230); Sf.stroke(p, tm(p), { z: 1 }); T.run(Sf, .4); Sf.stroke(jit(p, 5), tm(p), { z: 1 }); }
  SV.mark(Sf, null);
  T.run(Sf, T1);
  const fork = () => { Math.random = RS.rng(RS.hash('fork', U)); };
  const s0 = st(Sf), jams = (Sf.jams || []).length; let out = [], tA = T.t, s0r = null, restored = null;
  const grab = (S, t0) => T.notes.filter(x => x.when >= t0 && x.n.src).map(x => [x.n.src.id, x.n.role, midi(x.n.f0 || 1), x.when.toFixed(3)].join('|'));
  const dumpS = (S, f) => { if (!process.env.DUMPS) return; const o = {}; for (const c of S.creatures) { if (c.dead) continue; const d = {}; for (const k of Object.keys(c)) { const v = c[k]; if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') d[k] = v; } d.m = {}; if (c.mind) for (const k of Object.keys(c.mind)) { const v = c.mind[k]; if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') d.m[k] = v; else if (v && typeof v === 'object') { try { d.m[k] = JSON.stringify(v, (kk, vv) => vv && typeof vv === 'object' && (vv.mind || vv.creatures || vv.W) ? '#' : vv).length; } catch (e) { d.m[k] = 'cyc'; } } } o[c.id] = d; } const sfo = {}; for (const k of Object.keys(S)) { const v = S[k]; if (typeof v === 'function') continue; if (v == null || typeof v !== 'object') sfo[k] = v; else { let n; try { n = JSON.stringify(v, (kk, vv) => vv && typeof vv === 'object' && (vv.mind || vv.creatures || vv.W || vv.bodies instanceof Map || ArrayBuffer.isView(vv)) ? '#' : vv instanceof Map ? [...vv] : vv instanceof Set ? [...vv] : vv); n = n ? n.length : 0; } catch (e) { n = 'cyc'; } sfo[k] = n; } } o.$Sf = sfo; o.$M = {}; for (const k of Object.keys(S.M)) { const v = S.M[k]; if (typeof v !== 'function') { try { o.$M[k] = JSON.stringify(v); } catch (e) { o.$M[k] = 'cyc'; } } }
    require('fs').writeFileSync(process.env.DUMPS + f, JSON.stringify(o, null, 1)); };
  const probe = S => { if (!process.env.PROBE) return; const c0 = S.creatures.find(c => !c.dead && c.mind), xy = RS.Creature ? RS.Creature.center(S, c0) : [c0.x, c0.y]; const P = { 0: JSON.stringify(SS.pack(S).sf), dbg: JSON.stringify({ env: S.env, day: S.day, L: S.lightAt(xy[0], xy[1]), fl: RS.Field && S.field ? RS.Field.light(S, xy[0], xy[1]) : null, wet: S.waterNear(xy[0], xy[1], 40), xy, nW: [...S.W.bodies.values()].filter(b => b.kind === 'water').reduce((a, b) => a + b.idx.length, 0), Wt: S.W.t, Wn: S.W.n, kinds: [...S.W.bodies.values()].reduce((a, b) => { const k = b.kind + ':' + (b.meta && b.meta.role); a[k] = (a[k] || 0) + b.idx.length; return a; }, {}), chunks: [...(S.active || [])].join(','), pools: S.water && S.water.pools.length, P: JSON.parse(JSON.stringify(c0.P, (k, v) => typeof v === 'function' ? undefined : v)), spr: (() => { const W = S.W, loc = new Map(); c0.bodies.forEach((b, bi) => b.idx.forEach((i, k) => loc.set(i, bi + ':' + k))); const o = []; for (let s = 0; s < W.ns; s++) if (loc.has(W.sa[s]) || loc.has(W.sb[s])) o.push([loc.get(W.sa[s]) || 'x', loc.get(W.sb[s]) || 'x', +W.sk[s].toFixed(5), +W.sr[s].toFixed(5), W.sbody[s] > 0 ? 'b' : W.sbody[s]]); return o; })(), ptsx: (() => { const W = S.W, o = []; for (const b of c0.bodies) for (const i of b.idx) o.push([W.im[i], W.rad[i], W.fl[i], W.bod[i] === b.id]); return o; })(), grav: S.W.grav, Wk: Object.keys(S.W).filter(k => typeof S.W[k] !== 'function' && !ArrayBuffer.isView(S.W[k])).map(k => k + '=' + (typeof S.W[k] === 'object' ? JSON.stringify(S.W[k]).slice(0, 80) : S.W[k])), rocks: [...S.W.bodies.values()].filter(b => b.kind === 'blob').map(b => [Math.round(S.W.center(b)[0]), Math.round(S.W.center(b)[1]), b.uid, b.meta && b.meta.src]), now: S.now(), want: c0.want, tempo: c0.tempo }) }; for (const k of [1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 720, 960, 1100, 1180, 1250]) { const n0 = k === 1 ? 0 : [1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 720, 960, 1100, 1180, 1250][[1, 2, 4, 8, 15, 30, 60, 120, 240, 480, 720, 960, 1100, 1180, 1250].indexOf(k) - 1]; for (let i = n0; i < k; i++) { T.t += 1 / 60; S.step(1 / 60); } P[k] = JSON.stringify(SS.pack(S).sf); } require('fs').writeFileSync(process.env.PROBE + '.' + ARM, JSON.stringify(P)); process.exit(0); };
  if (ARM === 'control') { dumpS(Sf, '.' + ARM); fork(); probe(Sf); if (process.env.JIT) { const c0 = Sf.creatures.find(c => !c.dead && c.mind); Sf.W.x[c0.segs[0].idx[0]] += +process.env.JIT; } T.run(Sf, T2); out = grab(Sf, tA); s0r = s0; }
  else if (ARM === 'switch' || ARM === 'switch0') { // switched away: the real audio.js clock (this branch / master) drives the game time; no frames while hidden
    const vm = require('vm'), ev = {}, doc = { hidden: false, addEventListener: (k, f) => (ev[k] = ev[k] || []).push(f) }; let wall = T.t;
    const G = { RS: {}, document: doc, setInterval: () => 0, addEventListener: (k, f) => (ev['w:' + k] = ev['w:' + k] || []).push(f) };
    const src = ARM === 'switch' ? require('fs').readFileSync(path.join(__dirname, '../www/js/audio.js'), 'utf8') : require('child_process').execFileSync('git', ['show', (process.env.SS_REF || 'v0.8b4') + ':www/js/audio.js'], { cwd: __dirname }).toString();   /* 0.8b6: the pre-fix clock = the last release before songsave (v0.8b4); 'master' stopped meaning that once 0.8b5 shipped the fix */
    vm.runInNewContext(src, { window: G, performance: { now: () => wall * 1000 }, console, Math, Float32Array, Number, Array, Object, JSON, String, btoa: x => Buffer.from(x, 'binary').toString('base64'), unescape, encodeURIComponent });
    const RA = G.RS.audio; if (RA.setNow) RA.setNow(T.t); const fire = k => { for (const f of ev[k] || []) f(); };
    const step = n => { for (let i = 0; i < n; i++) { wall += 1 / 60; T.t = RA.now(); Sf.step(1 / 60); } };
    dumpS(Sf, '.' + ARM); fork(); const tLeft = T.t;
    doc.hidden = true; fire('visibilitychange'); wall += 30; doc.hidden = false; fire('visibilitychange');   // 30 s in another app: rAF stopped, no sim frames
    const away = 30, tBack = RA.now(), jump = tBack - tLeft; step(1); s0r = st(Sf);   // the first frame back
    step(T2 * 60 - 1); out = grab(Sf, tA).map(s => { const p = s.split('|'); if (+p[3] >= tBack - 1e-9) p[3] = (+p[3] - jump).toFixed(3); return p.join('|'); });
    console.log(JSON.stringify({ s0, s0r, jams, out, jump, away, items: items(Sf), drawn: drawn(Sf) })); return; }
  else { // close: what App does on hide / pagehide (save everything + the resume record), then a cold start
    const rec = SS.out(Sf, { key: o.key }); SV.mark(Sf, null); SV.flush(Sf); T.meta.mods[o.key] = Sf.mods; St().saveMeta(T.meta); if (ARM === 'cut') rec.song.ids.push('gone1'); if (ARM === 'close' || ARM === 'cut') SS.write(rec);
    const closedAt = T.t; await T.settle(); SV = await T.boot(); T.meta = St().meta(); SV.app = null; T.notes.length = 0;
    const r = (ARM === 'close' || ARM === 'cut') ? SS.read() : null; T.t = r ? r.song.now : 0;   // reopen: master's clock starts over; songsave's carries on from the saved song time
    const m = T.make(opt); Sf = m.Sf; tune(Sf); const data = SV.loadWorld(o.key); if (r) SS.pend(Sf, r.song); Sf.unpack(data, Date.now() + 600e3); SV.attach(Sf, o.key, data); RS.Save.app = { Sf, save: () => St().saveMeta(T.meta) };
    if (process.env.DBG) console.error("keys", Object.keys(St().mem).filter(k => !k.endsWith(".bak")).map(k => k + ":" + St().mem[k].length).join(" "), "cr", Sf.creatures.length, "active", Sf.active && Sf.active.size, "view", Sf.view.cx); Sf.stream(); if (process.env.DBG) console.error("after stream cr", Sf.creatures.length, Sf.creatures.map(c => c.id).join(",")); if (Sf.songPend) SS.tryApply(Sf); restored = Sf.songRestored || null; s0r = st(Sf); dumpS(Sf, '.' + ARM);   // the first frame streams the saved ohms in
    fork(); probe(Sf); const t1 = T.t; T.run(Sf, T2); if (ARM === 'cut') restored = Sf.songRestored || null; const off = t1 - closedAt; out = grab(Sf, t1).map(s => { const p = s.split('|'); p[3] = (+p[3] - off).toFixed(3); return p.join('|'); }); }
  if (process.env.DUMP) require('fs').writeFileSync(process.env.DUMP, JSON.stringify(out));
  console.log(JSON.stringify({ s0, s0r, jams, out, restored, items: items(Sf), drawn: drawn(Sf) }));
})().catch(e => { console.error(e.stack); process.exit(2); });
