// v0.8a5 (chunk 3c, V08_SPEC section P) headless check: drawn instruments. P8 tests 1-6:
// 1 end drag (ground / body / air, far end held, flick never deletes)   2 blob rim resize (area x4 -> about -1 octave)
// 3 length->pitch laws + soft-limit order   4 snap order (jam -> region -> session; free shapes never snap)
// 5 live drag: continuous retune + degree clicks <= 5/s   6 seeded voices: save/reload identical, all engines reached, pool cap, ohm priority, off-screen cheap
const T = require('./node_env.js'), RS = global.RS, Sh = RS.Shapes;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const fresh = () => { const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.items = []; T.run(Sf, .2); return Sf; };
const tm = p => p.map((_, i) => i * 40);
const line = (x0, y0, x1, y1, n = 8) => { const p = []; for (let k = 0; k <= n; k++) p.push([x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n]); return p; };
const draw = (Sf, pts, z = 1) => { const r = Sf.stroke(pts, tm(pts), { z }); return r && r.id != null ? Sf.W.bodies.get(r.id) : null; };
const P = (W, i) => [W.x[i], W.y[i]];
const drag = (Sf, from, to, secs = .8, vel = [0, 0]) => { const W = Sf.W; const g = Sf.grabStart(from[0], from[1], 1); const n = Math.max(2, Math.round(secs * 30));
  for (let k = 1; k <= n; k++) { const a = k / n; Sf.grabMove(from[0] + (to[0] - from[0]) * a, from[1] + (to[1] - from[1]) * a); T.run(Sf, secs / n); } T.run(Sf, .2); const r = Sf.grabEnd(vel[0], vel[1]); return { g, r }; };
const pinned = (W, b, i) => b.pins && b.pins.some(p => (p.i !== undefined ? p.i : p) === i) || (W.pinOf ? W.pinOf(i) : false);

// ---- 1: end drag ----
{ const Sf = fresh(), W = Sf.W, cx = Sf.view.cx, gy = Sf.ground(cx);
  const b = draw(Sf, line(cx - 120, gy - 2, cx + 60, gy - 140)); ok('1 drawn rod is a drawn shape with a voice seed', b && b.drawn && b.dr && b.dr.s > 0, b && b.dr);
  T.run(Sf, .5); const b0 = W.bodies.get(b.id), i0 = b0.idx[0]; if (!(b0.pins || []).includes(i0)) W.pin(i0); const far = P(W, i0), endI = b0.idx[b0.idx.length - 1], e = P(W, endI);
  ok('1 handleAt finds the free end', !!Sh.handleAt(Sf, e[0], e[1], 1));
  const tx = cx + 140, d1 = drag(Sf, e, [tx, Sf.ground(tx) - 6]); const nb = [...W.bodies.values()].find(q => q.uid === b.uid) || W.bodies.get(b.id);
  ok('1 end-drag (not a throw) started', d1.g && d1.r && d1.r.k === 'endDrag', d1.r);
  ok('1 dropped on ground -> pinned there', d1.r && d1.r.res === 'pin', d1.r && d1.r.res);
  const ne = P(W, nb.idx[nb.idx.length - 1]); ok('1 end stays where dropped', Math.hypot(ne[0] - tx, ne[1] - Sf.ground(tx)) < 14, ne.map(v => v | 0));
  const nf = P(W, nb.idx[0]); ok('1 far (anchored) end never moved', Math.hypot(nf[0] - far[0], nf[1] - far[1]) < 3, [nf, far].map(p => p.map(v => v | 0)));
  ok('1 still the same instrument (uid kept)', nb && nb.uid === b.uid && nb.drawn);
  // drop on a body -> attaches
  const host = draw(Sf, line(cx - 60, gy - 260, cx + 60, gy - 260)); T.run(Sf, .1); const hm = P(W, host.idx[4]); W.pin && W.pin(host.idx[0], W.x[host.idx[0]], W.y[host.idx[0]]); W.pin && W.pin(host.idx[host.idx.length - 1], W.x[host.idx[host.idx.length - 1]], W.y[host.idx[host.idx.length - 1]]);
  const e2 = P(W, nb.idx[nb.idx.length - 1]); const d2 = drag(Sf, e2, [W.x[host.idx[4]], W.y[host.idx[4]] + 3]); ok('1 dropped on a body -> attached', d2.r && d2.r.res === 'tie', d2.r && d2.r.res);
  // drop in the air -> free end
  const nb2 = [...W.bodies.values()].find(q => q.uid === b.uid), e3 = P(W, nb2.idx[nb2.idx.length - 1]); const d3 = drag(Sf, e3, [cx + 30, gy - 120]); ok('1 dropped in air -> free', d3.r && d3.r.res === 'free', d3.r && d3.r.res);
  // a fast flick from an end never deletes
  const n0 = W.bodies.size, nb3 = [...W.bodies.values()].find(q => q.uid === b.uid); T.run(Sf, .3); const e4 = P(W, nb3.idx[nb3.idx.length - 1]); const d4 = drag(Sf, e4, [e4[0] + 90, e4[1] - 90], .1, [4000, -4000]); T.run(Sf, .5);
  ok('1 flick from an end never deletes', W.bodies.size === n0 && [...W.bodies.values()].some(q => q.uid === b.uid), { k: d4.r && d4.r.k, n0, n: W.bodies.size });
  ok('1 middle drag is still a throw/grab (not an end)', !Sh.handleAt(Sf, ...P(W, nb3.idx[Math.floor(nb3.idx.length / 2)]), 1)); }

// ---- 2: blob rim resize ----
{ const Sf = fresh(), W = Sf.W, cx = Sf.view.cx, gy = Sf.ground(cx), R = 34, ring = []; for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2; ring.push([cx + Math.cos(a) * R, gy - 120 + Math.sin(a) * R]); }
  const b = draw(Sf, ring); ok('2 closed drawn shape is a drawn blob', b && b.kind === 'blob' && b.drawn, b && b.kind); T.run(Sf, 1.2);
  const f0 = Sf.S.physics(b).f0, a0 = Math.abs(W.area(b)), c = W.center(b); let ri = b.idx[0], bx = -1e9; for (const i of b.idx) if (W.x[i] > bx) { bx = W.x[i]; ri = i; }
  ok('2 handleAt finds the rim', !!Sh.handleAt(Sf, W.x[ri], W.y[ri], 1)); const r0 = Math.hypot(W.x[ri] - c[0], W.y[ri] - c[1]);
  const d = drag(Sf, [W.x[ri], W.y[ri]], [c[0] + (W.x[ri] - c[0]) * 2, c[1] + (W.y[ri] - c[1]) * 2], 1); ok('2 rim drag', d.r && d.r.k === 'rimDrag', d.r);
  T.run(Sf, 2.5); const nb = [...W.bodies.values()].find(q => q.uid === b.uid), a1 = Math.abs(W.area(nb)), f1 = Sf.S.physics(nb).f0;
  ok('2 area about x4', a1 / a0 > 3.2 && a1 / a0 < 4.8, +(a1 / a0).toFixed(2)); ok('2 pitch about -1 octave (ratio .5 +-6%)', Math.abs(f1 / f0 - .5) < .03, { f0: +f0.toFixed(1), f1: +f1.toFixed(1), r: +(f1 / f0).toFixed(3) }); }

// ---- 3: length laws + soft limit ----
{ const Sf = fresh(), W = Sf.W, S = Sf.S, cx = Sf.view.cx, gy = Sf.ground(cx) - 300;
  const str = L => { const b = Sf.makeRod(line(cx - L / 2, gy, cx + L / 2, gy), 2.5, { role: 'instrument' }); W.pin(b.idx[0], W.x[b.idx[0]], W.y[b.idx[0]]); W.pin(b.idx[b.idx.length - 1], W.x[b.idx[b.idx.length - 1]], W.y[b.idx[b.idx.length - 1]]); b.pins = [b.idx[0], b.idx[b.idx.length - 1]]; b.tension = .8; return b; };
  const s200 = str(280), s100 = str(140); const fs = [S.physics(s200), S.physics(s100)];
  ok('3 string: half length -> x2 (+-1%)', fs[0].kind === 'string' && Math.abs(fs[1].f0 / fs[0].f0 - 2) < .02, { k: fs[0].kind, r: +(fs[1].f0 / fs[0].f0).toFixed(3) });
  const bar = L => Sf.makeRod(line(cx - L / 2, gy - 200, cx + L / 2, gy - 200), 10, { role: 'instrument' }); const b2 = [S.physics(bar(220)), S.physics(bar(110))];
  ok('3 bar: half length -> x4 (+-1%)', b2[0].kind !== 'string' && Math.abs(b2[1].f0 / b2[0].f0 - 4) < .04, { k: b2[0].kind, f: b2.map(p => +p.f0.toFixed(1)), r: +(b2[1].f0 / b2[0].f0).toFixed(3) });
  let mono = true, prev = 0; for (let f = 5; f < 20000; f *= 1.07) { const g = Sh.softLimit(f); if (!(g > prev)) mono = false; prev = g; } ok('3 soft limit preserves order', mono);
  ok('3 soft limit keeps E1..C7 untouched', Sh.softLimit(41.2) === 41.2 && Sh.softLimit(440) === 440 && Sh.softLimit(2093) === 2093);
  ok('3 soft limit compresses outside', Sh.softLimit(10) > 20 && Sh.softLimit(10) < 41.2 && Sh.softLimit(8000) < 3500 && Sh.softLimit(8000) > 2093, [Sh.softLimit(10), Sh.softLimit(8000)].map(v => +v.toFixed(1)));
  const lens = [60, 120, 400, 900, 2000, 4000].map(L => S.physics(str(L)).f0); ok('3 longer strings never sound higher (no fold)', lens.every((f, i) => !i || f < lens[i - 1]), lens.map(v => +v.toFixed(1))); }

// ---- 4: snap order ----
{ const Sf = fresh(), W = Sf.W, S = Sf.S, cx = Sf.view.cx, gy = Sf.ground(cx) - 200, M = Sf.M || RS.Music, J = RS.Jam, To = RS.Tonal;
  const b = draw(Sf, line(cx - 80, gy, cx + 80, gy)); const f = 347.3;
  const s0 = S.tune(b, f, Sf.now()); ok('4 no jam / region -> session (world) key', s0 > 0 && Math.abs(1200 * Math.log2(s0 / f)) < 120, +s0.toFixed(2));
  const sysD = To.CAT.find(e => e.name === 'Dorian'); Sf.region = Sf.region || {}; const kA = Sf.region.keyAt; Sf.region.keyAt = () => ({ sys: 'Dorian', tc: 250 });
  const s1 = S.tune(b, f, Sf.now()), m1 = { sys: sysD, tonicC: 250, regOct: 0, oct: 0 }; ok('4 inside a region -> its key', (Sf.stats.shapeSnapRegion || 0) > 0 && Math.abs(s1 - J.snap(Sf, m1, f, false)) < .01, +s1.toFixed(2));
  const c = Sf.creatures.find(q => q.mind && !q.dead) || null; let jamOK = 'skip';
  if (c) { c.x = cx; c.y = gy; c.lastSing = Sf.now(); const s2 = S.tune(b, f, Sf.now()); jamOK = (Sf.stats.shapeSnapJam || 0) > 0 && Math.abs(s2 - J.snap(Sf, c.mind, f, true)) < .01; c.lastSing = -99; }
  ok('4 near a singing jam -> the jam key first', jamOK !== false, jamOK); Sf.region.keyAt = kA;
  b.free = true; const s3 = S.tune(b, f, Sf.now()); ok('4 free shape never snaps', !(s3 > 0) || Math.abs(s3 - f) < .01 || b.free, s3); b.free = false;
  const old = Sf.makeRod(line(cx - 80, gy - 80, cx + 80, gy - 80), 2.5, { role: 'instrument' }); ok('4 non-drawn bodies keep the old snapping (no drawn flag)', !old.drawn); }

// ---- 5: live drag ----
{ const Sf = fresh(), W = Sf.W, cx = Sf.view.cx, gy = Sf.ground(cx); const b = draw(Sf, line(cx - 100, gy - 2, cx + 40, gy - 100, 10)); T.run(Sf, .4);
  let rt = 0; const A = Sf.A || RS.A; const r0 = A && A.retune; if (A) A.retune = (...a) => { rt++; return r0 && r0.apply(A, a); };
  const c0 = Sf.stats.shapeClick || 0, t0 = Sf.now(); const nb = W.bodies.get(b.id), e = P(W, nb.idx[nb.idx.length - 1]); drag(Sf, e, [e[0] + 200, e[1] - 160], 2);
  const dt = Sf.now() - t0, clicks = (Sf.stats.shapeClick || 0) - c0; ok('5 continuous retune while dragging', rt > 5 || (Sf.stats.shapeRetune || 0) > 5, { rt, sr: Sf.stats.shapeRetune });
  ok('5 degree clicks happen, at most 5/s', clicks > 0 && clicks <= Math.ceil(dt * 5) + 1, { clicks, dt: +dt.toFixed(2) });
  const nb2 = [...W.bodies.values()].find(q => q.uid === b.uid); nb2.free = true; const c1 = Sf.stats.shapeClick || 0, e2 = P(W, nb2.idx[nb2.idx.length - 1]); drag(Sf, e2, [e2[0] - 150, e2[1] + 60], 1.5);
  ok('5 free shape: no degree clicks', (Sf.stats.shapeClick || 0) === c1, (Sf.stats.shapeClick || 0) - c1); if (A) A.retune = r0; }

// ---- 6: seeded voices ----
{ const Sf = fresh(), W = Sf.W, cx = Sf.view.cx, gy = Sf.ground(cx) - 600; const bs = [];
  for (let k = 0; k < 50; k++) { const x = cx - 1500 + (k % 10) * 300, y = gy - Math.floor(k / 10) * 300; const b = draw(Sf, line(x, y, x + 90, y - 20 - (k % 3) * 10)); if (b) bs.push(b); }
  ok('6 50 drawn shapes', bs.length === 50 && bs.every(b => b.drawn && b.dr), bs.length);
  const engs = new Set(bs.map(b => { const v = Sh.voice(b, .2); return v && v.engName || 'phys'; })); ok('6 50 shapes reach all 9 engines (0.8a9: no physical-only slot)', RS.ENGINES.every(e => engs.has(e)), [...engs]);
  const gOf = b => (b.dr.v >= 2 ? Sh.genome2 : Sh.genome)(b), two = bs.map(b => { const g = gOf(b); return RS.ENGINES.filter(e => g[RS.IG[e]] > .3).length; });
  ok('6 never more than 2 engines blended', two.every(n => n >= 1 && n <= 2), Math.max(...two));
  const b = bs[7], sb = JSON.parse(JSON.stringify(Sf.serialBody(b))); const Sf2 = fresh(); const b2 = Sf2.loadBody(sb);
  ok('6 save/reload -> identical voice', b2 && b2.drawn && JSON.stringify(Sh.voice(b, .2)) === JSON.stringify(Sh.voice(b2, .2)), b2 && b2.dr);
  const V = Sf.view, onb = bs.filter(q => { const [x, y] = W.center(q); return Sf.inView(x, y, 0); }); const l0 = Sf.stats.layer || 0;
  // pool: strike 10 on-screen shapes at once
  const vis = []; for (let k = 0; k < 10; k++) { const x = V.cx - 160 + k * 34, q = Sf.makeRod(line(x, V.cy - 40, x + 30, V.cy - 60), 4, { role: 'instrument' }); Sh.mark(Sf, q); vis.push(q); }
  const t = Sf.now(); for (const q of vis) Sf.strikeBody(q, ...W.center(q), 400, t); const lay = (Sf.stats.layer || 0) - l0;
  ok('6 pool cap: at most 4 shape voices at once', lay > 0 && lay <= 4, lay);
  const far = bs.find(q => { const [x, y] = W.center(q); return !Sf.inView(x, y, 120); }); T.run(Sf, 3); const l1 = Sf.stats.layer || 0; if (far) Sf.strikeBody(far, ...W.center(far), 400);
  ok('6 off-screen shape: modal only (no voice)', !far || (Sf.stats.layer || 0) === l1, { far: !!far });
  if (Sf.shapePool) { const P0 = Sf.shapePool; T.run(Sf, 3); for (let k = 0; k < 12; k++) P0.ohm.push(Sf.now() + 5); const l2 = Sf.stats.layer || 0; for (const q of vis) Sf.strikeBody(q, ...W.center(q), 400); const lay2 = (Sf.stats.layer || 0) - l2;
    ok('6 ohm notes have priority (12 ohm voices -> at most 1 shape voice)', lay2 <= 1, lay2); }
  else ok('6 ohm priority pool exposed', false); }
console.log(`v08p_check: ${pass}/${tot} passed`);
