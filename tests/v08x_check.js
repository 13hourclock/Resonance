// v0.8b5 headless check (Wilbow 4:07-4:12 PM MDT Oct 23 2026): items affect only their carrier + fused ohms (E1), darker / softer musical echo (E2),
// seeded + culture-weighted world items (E3), 20 new kinds, beat-grid / key locking, the close-up controls (notch + snap + saved), G1 / G2 / G6.
const T = require('./node_env.js'), RS = global.RS; require('../www/js/render.js'); const It = RS.Items, X = RS.FXK, IE = RS.ItemEdit;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const SR = 44100, r3 = v => Math.round(v * 1000) / 1000;
const scene = (useed = 3) => { const o = T.scene({ clear: true, useed }), Sf = o.Sf || o; Sf.noSeedItems = true; Sf.noPatches = true; const x0 = (Sf.view.x0 + Sf.view.x1) / 2; return { Sf, x0 }; };
// run a worklet kind on a signal fn(t) for sec seconds -> L samples
const runFx = (kind, p, sig, sec, mix = 1) => { const F = RS.FXFactory(SR); F.msg({ t: 'fx', slot: 0, kind, p, mix }); const out = new Float32Array(Math.ceil(sec * SR / 128) * 128); for (let b = 0; b < out.length / 128; b++) { const bl = F.bus(0); for (let i = 0; i < 128; i++) { const v = sig(b * 128 + i); bl.L[i] = v; bl.R[i] = v; } const L = new Float32Array(128), R = new Float32Array(128); F.render(L, R, [0], 128); out.set(L, b * 128); } return out; };
// ---- X1-X3 E2 echo: about half as loud, each repeat darker, timed on a musical value ----
{ const per = .25, burst = t => t < 2000 ? Math.sin(t * .9) * .5 * Math.exp(-t / 500) + Math.sin(t * .05) * .3 * Math.exp(-t / 500) : 0, y = runFx('dly', { time: per, fb: .6, tone: .5, per, t0: 0, now: 0 }, burst, 1.2), dry = runFx('dly', { time: per, fb: .6, tone: .5 }, burst, .04, 0);
  const win = k => { const a = Math.round(k * per * SR), b = a + 2200; let pk = 0, e = 0, hf = 0, at = -1; for (let i = a - 400; i < b; i++) { const v = Math.abs(y[i]); if (v > pk) pk = v; if (at < 0 && v > .01) at = i; e += y[i] * y[i]; hf += (y[i] - y[i - 1]) ** 2; } return { pk, at, br: hf / Math.max(1e-9, e) }; };
  let dpk = 0; for (let i = 0; i < 2000; i++) dpk = Math.max(dpk, Math.abs(burst(i)));
  const e1 = win(1), e2 = win(2), e3 = win(3);
  ok('X1 E2 the first echo is about half as loud as the sound (<= .55x) and each repeat is quieter', e1.pk < dpk * .55 && e1.pk > dpk * .05 && e2.pk < e1.pk && e3.pk < e2.pk, { dry: r3(dpk), echoes: [e1.pk, e2.pk, e3.pk].map(r3) });
  ok('X2 E2 each repeat is darker (less high-frequency energy per unit energy)', e2.br < e1.br * .9 && e3.br < e2.br * .95, [e1.br, e2.br, e3.br].map(v => +v.toFixed(4)));
  ok('X3 E2 repeats land on the musical value (first echo starts within 6 ms of the set time)', Math.abs(e1.at / SR - per) < .006, { at: r3(e1.at / SR) }); }
{ const { Sf, x0 } = scene(); const c = T.add(Sf, T.plain(21), x0); T.run(Sf, .5); const fac = [3, 4, 5, 6, 7, 8].map(f => { const it = It.make(Sf, 'dly', x0 + 400, Sf.ground(x0 + 400) - 6, { force: true }); it.mass = (f - 3) / 5; const b = X.uDiv(X.home(Sf, it, 'div')); It.remove(Sf, it); return +b.toFixed(3); });
  ok('X4 E2 the crystal\'s facets choose the echo value (triplet, 1/4, dotted 1/8, 1/8, 1/2 - all in the division table)', fac.every(b => X.DIVS.some(d => Math.abs(d - b) < 1e-3)) && new Set(fac).size >= 4, fac); }
// ---- X5-X6 beat-grid lock ----
{ const per = .1, dc = () => .5, edge = t0 => { const y = runFx('gat', { per, t0, now: 0, pat: 0x0F, depth: 1 }, dc, 1); for (let i = Math.round((t0 + 3.9 * per) * SR); i < y.length; i++) if (Math.abs(y[i]) < .5 * .25) return i / SR; return -1; };
  const a = edge(0), b = edge(.03); ok('X5 the gate closes on its beat grid (cycle 4 edge within 12 ms) and moves with the grid start (t0 + 30 ms -> + 30 ms)', a > 4 * per && a - 4 * per < .012 && Math.abs((b - a) - .03) < .002, { a: r3(a), b: r3(b) });
  const { Sf, x0 } = scene(); const c = T.add(Sf, T.plain(22), x0); T.run(Sf, 1); const it = It.make(Sf, 'trm', x0, Sf.ground(x0) - 8, { force: true }); It.take(Sf, c, it, 'carry'); const p = It.params(Sf, c, it).p, g = X.grid(Sf, c);
  ok('X6 a time item carried by an ohm runs on that ohm\'s beat (per = 1/2 beat, t0 = a beat start of its clock)', p.per && Math.abs(p.per - g.beat * .5) < 1e-6 && Math.abs(p.t0 - g.t0) < 1e-6 && p.now != null, { per: p.per && r3(p.per), beat: r3(g.beat) }); }
// ---- X7-X8 key lock + detune ----
{ const { Sf, x0 } = scene(); const c = T.add(Sf, T.plain(23), x0); T.run(Sf, 1); const it = It.make(Sf, 'hrm', x0, Sf.ground(x0) - 8, { force: true }); It.take(Sf, c, it, 'carry'); const C = X.cents(c), tn = X.tonic(Sf, c);
  const inKey = cents => { const m = ((cents % 1200) + 1200) % 1200; return C.some(k => Math.abs(k - m) < 2 || Math.abs(k - m - 1200) < 2 || Math.abs(k + 1200 - m) < 2); };
  const outs = [0, 1, 2, 3, 4, 5, 6].map(d => { const f0 = tn * Math.pow(2, X.degC(C, d) / 1200), s = X.noteSet(Sf, c, it, f0); return 1200 * Math.log2(f0 * s.ratio / tn); });
  ok('X7 a harmony item answers every scale note with a note IN the carrier\'s key', outs.every(inKey), outs.map(Math.round));
  X.set(Sf, it, 'cents', .6, true); const f0 = tn * Math.pow(2, X.degC(C, 2) / 1200), s2 = X.noteSet(Sf, c, it, f0), det = 1200 * Math.log2(f0 * s2.ratio / tn) - outs[2];
  ok('X8 dragging cents off the notch detunes it (+20 c at u .6) and leaves the notch dark', Math.abs(det - 20) < 1 && !X.onNotch(Sf, it, 'cents'), { det: +det.toFixed(1) });
  const pi = It.make(Sf, 'pit', x0 + 300, Sf.ground(x0 + 300) - 8, { force: true }), pp = X.apply(Sf, c, pi, {}, 1).p; ok('X9 a pitch lens shifts by an in-key step', inKey(1200 * Math.log2(pp.ratio)), { ratio: r3(pp.ratio) }); }
// ---- X10-X12 controls: notch, magnet, snap, saved ----
{ const { Sf, x0 } = scene(); const it = It.make(Sf, 'tap', x0, Sf.ground(x0) - 8, { force: true }), h = X.home(Sf, it, 'div');
  const v1 = X.set(Sf, it, 'div', X.divU(.5) + .01, false), v2 = X.set(Sf, it, 'div', X.divU(.5) + .02, true), v3 = X.set(Sf, it, 'div', .3, true);
  ok('X10 the beat division is magnetic near a notch (.01 holds), snaps on release (.02) and goes off-grid between notches (.30 = free time)', Math.abs(v1 - X.divU(.5)) < 1e-9 && Math.abs(v2 - X.divU(.5)) < 1e-9 && Math.abs(v3 - .3) < 1e-9 && !X.onNotch(Sf, it, 'div'), { v1: r3(v1), v2: r3(v2), v3: r3(v3) });
  X.set(Sf, it, 'mix', .5, true); X.set(Sf, it, 'div', h, true); ok('X11 back on the home notch = nothing stored (snap is the default)', X.val(Sf, it, 'div') === h && (!it.adj || it.adj.div == null), it.adj);
  X.set(Sf, it, 'off', .58, true); X.set(Sf, it, 'tone', .9, true); const pk = JSON.parse(JSON.stringify(It.pack(Sf))), Sf2 = scene().Sf; It.unpack(Sf2, pk); const it2 = Sf2.items.find(q => q.uid === it.uid);
  ok('X12 control values are saved with the item (pack / unpack)', it2 && it2.adj && it2.adj.off === .58 && it2.adj.tone === .9 && X.val(Sf2, it2, 'off') === .58, it2 && it2.adj);
  const ctl = X.ALL.map(k => X.controls({ kind: k }).length); ok('X13 every one of the 28 kinds has 2-5 controls, starting with mix', X.ALL.length === 28 && ctl.every(n => n >= 2 && n <= 5) && X.ALL.every(k => X.controls({ kind: k })[0] === 'mix'), { n: X.ALL.length, ctl: [Math.min(...ctl), Math.max(...ctl)] }); }
// ---- X14-X15 20 new kinds: on by default, sound finite + bounded, cheap ----
{ const p = { per: .25, t0: 0, now: 0, time: .25, fb: .45, tone: .5, depth: .6, ratio: 1.5, hz: 220, fr: [110, 165, 220, 330], pat: 0xB5, semi: -2, rates: [1, 2, .5] }, sig = t => (t % 11025 < 2000) ? Math.sin(t * .06) * .5 * Math.exp(-(t % 11025) / 600) : 0;
  const bad = [], t0 = Date.now(); let mx = 0; for (const k of X.NEW) { const y = runFx(k, p, sig, 1); let m = 0; for (const v of y) { if (!Number.isFinite(v)) { bad.push(k); break; } m = Math.max(m, Math.abs(v)); } mx = Math.max(mx, m); if (m > 1.2) bad.push(k + ':' + r3(m)); } const ms = (Date.now() - t0) / X.NEW.length;
  ok('X14 all 20 new kinds default ON, render finite and bounded (peak <= 1.2 on a .5 input)', X.NEW.length === 20 && X.NEW.every(k => X.ON[k]) && !bad.length, { bad, peak: r3(mx) });
  ok('X15 a new kind costs < 120 ms per second of audio here (one slot)', ms < 120, { ms: Math.round(ms) }); }
// ---- X16-X19 E1 routing ----
{ const { Sf, x0 } = scene(); const c = T.add(Sf, T.plain(31), x0 - 30), o = T.add(Sf, T.plain(32), x0 + 30); T.run(Sf, .5); const it = It.make(Sf, 'dly', x0 - 30, Sf.ground(x0 - 30) - 6, { force: true }); It.take(Sf, c, it, 'carry'); It.slots(Sf);
  ok('X16 E1 the carrier plays through its item; a near (not fused) ohm does not', It.active(Sf, c) === it && !It.active(Sf, o) && It.fusedSlot(Sf, o) == null, { cSlot: c.fxSlot, oSlot: o.fxSlot });
  const sp0 = { f0: 220 }; It.decorate(Sf, o, sp0, { perc: false }); RS.Colony.fuse(Sf, c, o); const sp1 = { f0: 220 }; It.decorate(Sf, o, sp1, { perc: false }); const sp2 = { f0: 220 }; It.decorate(Sf, o, sp2, { perc: true });
  ok('X17 E1 fused to the carrier, its melodic notes share the carrier\'s insert (percussion stays dry)', sp0.fx == null && sp1.fx === c.fxSlot && c.fxSlot != null && sp2.fx == null, { before: sp0.fx, fused: sp1.fx, perc: sp2.fx });
  const ne = It.make(Sf, 'rev', x0 + 300, Sf.ground(x0 + 300) - 6, { force: true }), r = T.add(Sf, T.plain(33), x0 + 300); T.run(Sf, .3); ne.mode = 'nest'; ne.nest = c.id; ne.residents = [r.id]; It.slots(Sf);
  ok('X18 E1 a nest resident no longer plays through the nest it lives in', It.active(Sf, r) !== ne, { r: It.active(Sf, r) && It.active(Sf, r).kind }); }
// ---- X19-X21 E3 seeding ----
{ const kinds = [], nulls = [], det = []; for (let s = 1; s <= 24; s++) { const { Sf, x0 } = scene(s); T.add(Sf, T.plain(s + 300), x0); Sf.noPatches = false; Sf.noSeedItems = false; Sf.patches = []; Sf.items = []; Sf.seed = s * 97; It.seed(Sf); for (const p of Sf.patches) { nulls.push(p.kind == null); if (p.kind) kinds.push(p.kind); } const a = Sf.patches.map(p => p.kind).join(); Sf.patches = []; Sf.items = []; It.seed(Sf); det.push(a === Sf.patches.map(p => p.kind).join()); }
  const nf = nulls.filter(Boolean).length / nulls.length; ok('X19 E3 patches grow a seeded kind or none (~30% bare), the same every time for a seed', nf > .1 && nf < .55 && det.every(Boolean) && new Set(kinds).size >= 8, { bare: r3(nf), kinds: new Set(kinds).size });
  const { Sf, x0 } = scene(5); for (let k = 0; k < 9; k++) T.add(Sf, T.plain(40 + k), x0 - 160 + k * 40); Sf.noSeedItems = false; for (let k = 0; k < 30; k++) { It.seed(Sf); Sf.itemN = (Sf.itemN || 0) + 1; } const nw = Sf.items.filter(q => q.made === 'world').length, live = Sf.creatures.filter(c => !c.dead).length;
  ok('X20 E3 fewer world items: at most 1 + ceil(ohms / 3)', nw <= 1 + Math.ceil(live / 3) && nw >= 1, { world: nw, ohms: live });
  const a = It.make(Sf, 'wah', x0, Sf.ground(x0) - 6, { force: true }), b = It.make(Sf, 'wah', x0 + 40, Sf.ground(x0 + 40) - 6, { force: true }), S2 = scene(9).Sf; S2.seed = Sf.seed + 1; const c2 = It.make(S2, 'wah', x0, S2.ground(x0) - 6, { force: true });
  ok('X21 E3 an item\'s character comes from its shape + the world seed (same shape same world = same; other world = different)', JSON.stringify(X.ch(Sf, a)) === JSON.stringify(X.ch(Sf, b)) && JSON.stringify(X.ch(S2, c2)) !== JSON.stringify(X.ch(Sf, a)), { a: X.ch(Sf, a).tone.toFixed(3), c: X.ch(S2, c2).tone.toFixed(3) }); }
{ const Tr = RS.Trad; RS.Trad = { lean: () => 'gamelan', world: () => 'gamelan' }; const { Sf, x0 } = scene(); T.add(Sf, T.plain(51), x0); const w = X.weights(Sf), r = RS.rng(5), n = {}; for (let i = 0; i < 4000; i++) { const k = X.pick(Sf, r); n[k] = (n[k] || 0) + 1; } RS.Trad = Tr;
  const gs = X.CULT.gamelan.reduce((s, k) => s + (n[k] || 0), 0) / 4000; ok('X22 E3 world kinds lean to the culture blend (a gamelan world: shimmer / strings / bells / combs / tremolo > 2.5x their even share)', w.shm === 5 && w.wah === 1 && gs > 2.5 * 5 / 28, { share: r3(gs), even: r3(5 / 28) }); }
// ---- X23-X26 G1 / G2: an item inside its radius wins; drag takes it, flick knocks it off ----
{ const { Sf, x0 } = scene(); const c = T.add(Sf, T.plain(61), x0); T.run(Sf, .8); const it = It.make(Sf, 'shm', x0, Sf.ground(x0) - 6, { force: true }); It.take(Sf, c, it, 'carry'); T.run(Sf, .1); const App = { Sf, cam: { x: c.x, y: c.y, z: 2, th: 0 }, Wd: 400, Ht: 800, level: 'surface' };
  const q = IE.at(Sf, it), h1 = IE.hitCarried(App, q[0], q[1]), h2 = IE.hitCarried(App, c.x, c.y), h3 = IE.hitCarried(App, q[0] + q[2] + 4, q[1]);
  ok('X23 G1 a touch inside the carried item\'s radius hits the item; the ohm\'s centre and just outside the radius do not', h1 && h1.it === it && !h2 && !h3, { r: r3(q[2]), d: r3(Math.hypot(q[0] - c.x, q[1] - c.y)) });
  const at = IE.knock(Sf, it, 900, -200), d = at && Math.hypot(at[0] - q[0], at[1] - q[1]); T.run(Sf, 3);
  ok('X24 G2 a flick knocks it off: it lands 40-120 px away and the ohm does not take it straight back (3 s)', at && d >= 30 && d <= 125 && !c.item && it.holder == null && Sf.items.includes(it), { d: d && Math.round(d), holder: it.holder && it.holder.id });
  T.run(Sf, 1); if (!c.item) It.take(Sf, c, it, 'carry'); T.run(Sf, .1); const q2 = IE.at(Sf, it), okT = IE.take(Sf, it, [q2[0] + 30, q2[1] - 20]);
  ok('X25 G1 dragging it away takes it: the item is now the grabbed body (normal throw rules), the ohm lets go', okT && Sf.grabbed && Sf.grabbed.b === it.b && !c.item && it.holder == null, { ok: okT });
  Sf.grabEnd(0, 0); ok('X26 G1/G2 knock + take are counted', Sf.stats.itemsKnocked === 1 && Sf.stats.itemsTaken === 1, { k: Sf.stats.itemsKnocked, t: Sf.stats.itemsTaken }); }
// ---- X27-X29 G6 unfuse (Wilbow 4:54 / 4:55 PM: fused ohms only; quick + wide spread only; no re-fuse for a few minutes) ----
{ const { Sf, x0 } = scene(); const cs = [0, 1, 2, 3].map(k => T.add(Sf, T.plain(71 + k), x0 - 90 + k * 60)); T.run(Sf, .5); const j = RS.Jam.form(Sf, cs, .8); if (!Sf.jams.includes(j)) Sf.jams.push(j); for (const c of cs) c.jam = j;
  Sf.herd = { ids: cs.map(c => c.id) };
  ok('X27 G6 a jam or a herd selection is NOT a G6 group (only fused ohms unfuse); the same ohm twice is not either', !IE.groupOf(Sf, cs[1], cs[2]) && !IE.groupOf(Sf, cs[0], cs[0]) && cs.every(c => c.jam === j));
  ok('X28 G6 only a QUICK, WIDE spread counts (>= 120 px within 350 ms); slow or small stays squeeze / zoom', IE.SPREAD_PX === 120 && IE.SPREAD_MS === 350 && IE.quick(100, 230, 300) && !IE.quick(100, 200, 300) && !IE.quick(100, 260, 500), { px: IE.SPREAD_PX, ms: IE.SPREAD_MS }); }
{ const { Sf, x0 } = scene(); const cs = [0, 1, 2, 3].map(k => T.add(Sf, T.plain(81 + k), x0 - 60 + k * 30)); T.run(Sf, .5); for (let k = 0; k < 3; k++) RS.Colony.fuse(Sf, cs[k], cs[k + 1]); const cl = cs[0].cluster; T.run(Sf, .3);
  const g = IE.groupOf(Sf, cs[1], cs[2]), r = g && IE.split(Sf, g, [cs[1].x, cs[1].y], [cs[2].x, cs[2].y]), W = Sf.W; T.run(Sf, .5);
  const linksOk = Sf.clusters.every(q => q.links.every(L => L.s >= 0 && W.sk[L.s] > 0));
  ok('X29 G6 a fused colony splits into two colonies along the spread (no link left across)', g && g.k === 'cluster' && r && Sf.clusters.length === 2 && cs[0].cluster === cs[1].cluster && cs[2].cluster === cs[3].cluster && cs[1].cluster !== cs[2].cluster && linksOk, { r, n: Sf.clusters.length, links: Sf.clusters.map(q => q.links.length) });
  const K = RS.Colony, until = cs[1].noFuse && cs[1].noFuse[cs[2].id], left = until - Sf.now(), blocked = K.blocked(Sf, cs[2], cs[1]) && K.blocked(Sf, cs[0], cs[3]) && !K.blocked(Sf, cs[0], cs[1]), f1 = K.fuse(Sf, cs[1], cs[2]);
  for (const a of cs) for (const id in (a.noFuse || {})) a.noFuse[id] = Sf.now() - 1; const f2 = K.fuse(Sf, cs[1], cs[2]);
  ok('X29b G6 the two sides will not re-fuse for 3-5 min (pair marks, both ways), then fuse normally again', blocked && f1 == null && left >= 180 && left <= 300 && !!f2 && cs[1].cluster === cs[2].cluster, { left: Math.round(left), f1: !!f1, f2: !!f2 }); }
// ---- X30-X31 the close-up ring: on screen, 44 px targets, exclusive with the ohm ring ----
{ const { Sf, x0 } = scene(); const c = T.add(Sf, T.plain(91), x0 - 120); T.run(Sf, .5); const it = It.make(Sf, 'dly', x0 + 60, Sf.ground(x0 + 60) - 6, { force: true }); T.run(Sf, .2); const q = IE.at(Sf, it), App = { Sf, cam: { x: q[0], y: q[1], z: 2.4, th: 0 }, Wd: 390, Ht: 844, level: 'surface' };
  const B = IE.safe(App), w = RS.Render.toWorld(App.cam, App.Wd, App.Ht, B.cx, B.cy); App.cam.x += q[0] - w[0]; App.cam.y += q[1] - w[1]; const pk = IE.pick(App); App.itemSel = pk;
  const L = pk && IE.layout(App, pk), hs = L ? L.ctl.map((k, i) => IE.hpos(L, i, X.val(Sf, pk, k))) : [], on = hs.every(p => p[0] - 22 >= 0 && p[0] + 22 <= App.Wd && p[1] - 22 >= 0 && p[1] + 22 <= App.Ht);
  let gap = 1e9; for (let a = 0; a < hs.length; a++) for (let b = a + 1; b < hs.length; b++) gap = Math.min(gap, Math.hypot(hs[a][0] - hs[b][0], hs[a][1] - hs[b][1]));
  ok('X30 zoomed in on an item: the close-up picks it; every handle is on screen with a 44 px target and no two overlap', pk === it && on && IE.M.hit * 2 >= 44 && gap >= 44, { n: hs.length, R: L && Math.round(L.R), gap: Math.round(gap) });
  const hh = IE.hit(App, hs[1][0], hs[1][1]), v = hh && IE.drag(App, hh, hs[1][0] + 0, hs[1][1] + 0, true); ok('X31 touching a handle grabs that control; releasing on it keeps it on its notch', hh && hh.k === L.ctl[1] && X.onNotch(Sf, it, hh.k), hh);
  App.cam.x = c.x; App.cam.y = c.y; const B2 = IE.safe(App), w2 = RS.Render.toWorld(App.cam, App.Wd, App.Ht, B2.cx, B2.cy); App.cam.x += c.x - w2[0]; App.cam.y += c.y - w2[1]; App.itemSel = null;
  ok('X32 centred on an ohm instead, no item close-up (the ohm ring keeps it)', !IE.pick(App)); }
// ---- X33 cost: the item hit test with many ohms and no carried items ----
{ const { Sf, x0 } = scene(); for (let k = 0; k < 12; k++) T.add(Sf, T.plain(100 + k), x0 - 200 + k * 35); T.run(Sf, .3); const App = { Sf, cam: { x: x0, y: 0, z: 1, th: 0 }, Wd: 390, Ht: 844 }; const t0 = process.hrtime.bigint(); for (let i = 0; i < 20000; i++) IE.hitCarried(App, x0, 0); const us = Number(process.hrtime.bigint() - t0) / 1e3 / 20000;
  ok('X33 the item hit test is cheap (< 5 us with 12 ohms)', us < 5, +us.toFixed(3)); }
console.log('v08x_check ' + res.filter(Boolean).length + '/' + res.length); process.exit(res.every(Boolean) ? 0 : 1);
