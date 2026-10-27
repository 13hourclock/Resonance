'use strict';
// v0.8a5 P (chunk 3b, part 1): DRAWN INSTRUMENTS. Movable rod ends and blob rims (P1), length/size -> pitch with the soft range limit
// and the jam -> region -> session snap (P2), a seeded voice per drawn shape from all synth engines, layered on the modal ring (P3/P4).
// Wilbow 3:38/3:41: a shape has ITS OWN voice; nothing here swaps or rewrites any ohm's instrument. Nothing runs per frame unless a
// shape is being dragged (off-screen cost: zero).
(function (G) { const RS = G.RS, clamp = RS.clamp;
const Sh = RS.Shapes = { HANDLE: 16, RELAY: .12, REBUILD: .25, POOL: 4, NI: 14, CLICK: .2, BAG: 45 };
Sh.softLimit = f => RS.clamp(f < 41.2 ? 41.2 * Math.pow(f / 41.2, .3) : f > 2093 ? 2093 * Math.pow(f / 2093, .3) : f, 10, 12000);   // Q116: order-preserving, E1-C7
const isShape = b => !!(b && (b.kind === 'rod' || b.kind === 'blob') && b.meta && b.meta.role === 'instrument' && !b.meta.wl && !b.meta.limb);
Sh.isShape = isShape;
Sh.zoom = Sf => { const A = G.App; return (A && A.Sf === Sf && A.cam && A.cam.z) || (Sf.view && Sf.view.z) || 1; };
const ends = b => [b.idx[0], b.idx[b.idx.length - 1]];
const linkOf = (W, i) => { for (let s = 0; s < W.ns; s++) if (W.sa[s] === i && W.sbody[s] === -1 && W.sk[s] > 0) return s; return -1; };
const drop1 = (arr, v) => { const k = arr ? arr.indexOf(v) : -1; if (k >= 0) arr.splice(k, 1); };
const unlink = (W, b, i, s) => { const j = W.sb[s]; W.sk[s] = 0; drop1(b.pins, i); drop1(b.links, j); W.compact(); return j; };
const nearestP = (W, b, X, Y) => { let bi = b.idx[0], bd = 1e18; for (const i of b.idx) { const d = (W.x[i] - X) ** 2 + (W.y[i] - Y) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
const isString = b => b.kind === 'rod' && (b.tension || 1) < 1 && (b.thick || 4) < 7;
const bag = (seed, N) => { const r = RS.rng(RS.hash('shapeBag', seed, Math.floor(N / Sh.BAG))), p = []; for (let k = 0; k < Sh.BAG; k++) p.push(k); for (let k = Sh.BAG - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [p[k], p[j]] = [p[j], p[k]]; } return p[N % Sh.BAG]; };
// ---------------- handles (P1) ----------------
Sh.handleAt = (Sf, x, y, z) => { z = z || Sh.zoom(Sf); const W = Sf.W; let best = null, bd = 1e9;
  for (const b of Sf.instruments()) { if (!b.drawn || !isShape(b) || b.idx.length < 2) continue;   /* only shapes drawn since 0.8a5 have handles */
    if (b.kind === 'rod') { const L = W.length(b); ends(b).forEach((i, e) => { const hr = Math.max(Sh.HANDLE / z, (W.rad[i] || 3) + 4), d = Math.hypot(W.x[i] - x, W.y[i] - y); if (d < hr && d < L / 3 && d < bd) { bd = d; best = { b, mode: 'end', e, i }; } }); }
    else { const [cx, cy] = W.center(b), R = Math.sqrt(Math.abs(W.area(b)) / Math.PI) || 10, d = Math.hypot(x - cx, y - cy), band = Math.min(Math.max(R / 4, 12 / z), R * .4);   /* the inner 60% is always the old grab/throw */ if (d >= R - band && d <= R + Math.max(8 / z, 6)) { const dd = Math.abs(d - R) * .5; if (dd < bd) { bd = dd; best = { b, mode: 'rim' }; } } } }
  return best; };
// a stroke starting/ending just beside a rod end chains onto it (handle radius + 8 px)
Sh.endNear = (Sf, x, y, z) => { z = z || Sh.zoom(Sf); const W = Sf.W, r = Sh.HANDLE / z + 8; let best = null, bd = r; for (const b of Sf.instruments()) { if (b.kind !== 'rod' || !b.drawn || !isShape(b)) continue; for (const i of ends(b)) { const d = Math.hypot(W.x[i] - x, W.y[i] - y); if (d < bd) { bd = d; best = b; } } } return best; };
const snapRest = (W, b) => { const m = new Map(), a0 = b.idx[0], a1 = b.idx[1]; let seg = 0, sum = 0; const nx = new Map(); for (let k = 1; k < b.idx.length; k++) nx.set(b.idx[k - 1], b.idx[k]);
  for (const s of b.springs) { if (W.sbody[s] !== b.id) continue; m.set(W.sa[s] * 8192 + W.sb[s], W.sr[s]); if (nx.get(W.sa[s]) === W.sb[s]) { sum += W.sr[s]; if (W.sa[s] === a0 && W.sb[s] === a1) seg = W.sr[s]; } } return { m, seg, sum }; };
const relayRest = (W, b, R, k) => { for (const s of b.springs) { if (W.sbody[s] !== b.id) continue; const r0 = R.m.get(W.sa[s] * 8192 + W.sb[s]); if (r0 != null) W.sr[s] = r0 * k; } };
Sh.start = (Sf, h, x, y) => { const W = Sf.W, b = h.b, t = Sf.now(); Sh.end(Sf); const D = { mode: h.mode, b, fx: x, fy: y, relT: t, rbT: t, clickT: -9, lastF: 0, lastSnap: 0, moved: 0 };
  if (h.mode === 'end') { const i = h.i, o = h.e ? b.idx[0] : b.idx[b.idx.length - 1]; let pin = (W.pins || []).find(p => p.i === i), was = 'free', link = -1;
    if (pin) was = 'pin'; else { const s = linkOf(W, i); if (s >= 0) { was = 'link'; link = unlink(W, b, i, s); } W.pin(i); pin = W.pins[W.pins.length - 1]; }
    Object.assign(D, { i, o, atStart: h.e === 0, pin, was, link, ox: pin.X - x, oy: pin.Y - y, L0: W.length(b), c0: Math.hypot(pin.X - W.x[o], pin.Y - W.y[o]) }); D.Lsnap = D.L0; D.Ld = D.L0; D.R = snapRest(W, b); D.st0 = D.L0 / Math.max(1, D.R.sum); }
  else { const [cx, cy] = W.center(b), n = b.idx.length; let k0 = 0, bd = 1e18; b.idx.forEach((i, k) => { const d = (W.x[i] - x) ** 2 + (W.y[i] - y) ** 2; if (d < bd) { bd = d; k0 = k; } });
    const grp = []; for (let q = -2; q <= 2; q++) { const i = b.idx[(k0 + q + n) % n]; let p = (W.pins || []).find(e => e.i === i), tmp = false; if (!p) { W.pin(i); p = W.pins[W.pins.length - 1]; tmp = true; } grp.push({ i, p, tmp, ox: W.x[i] - x, oy: W.y[i] - y }); }
    Object.assign(D, { cx, cy, d0: Math.max(4, Math.hypot(x - cx, y - cy)), A0: b.area0 || Math.abs(W.area(b)), grp, R: snapRest(W, b) }); D.Asnap = D.A0; }
  D.lastF = Sf.S.physics(b).f0; D.lastSnap = Sf.S.tune(b, D.lastF, t); Sf.shapeDrag = D; Sf.stats[h.mode === 'end' ? 'endDragN' : 'rimDragN'] = (Sf.stats[h.mode === 'end' ? 'endDragN' : 'rimDragN'] || 0) + 1; return { k: h.mode, id: b.id }; };
Sh.move = (Sf, x, y) => { const D = Sf.shapeDrag; if (!D) return false; D.fx = x; D.fy = y; D.moved++; return true; };
// rebuild a rod past 0.5x-2x of its particle spacing (same uid, mat, voice, pins, links); <= once per 250 ms
const rebuild = (Sf, D) => { const W = Sf.W, ob = D.b; if (ob.idx.length < 2) return false;
  const into = []; for (let s = 0; s < W.ns; s++) if (W.sbody[s] === -1 && W.sk[s] > 0 && ob.idx.includes(W.sb[s]) && W.bod[W.sa[s]] !== ob.id) into.push({ a: W.sa[s], j: W.sb[s], x: W.x[W.sb[s]], y: W.y[W.sb[s]] });
  const op = (W.pins || []).find(p => p.i === D.o), ol = op ? -1 : linkOf(W, D.o), oj = ol >= 0 ? W.sb[ol] : -1;
  const pts = ob.idx.map(i => [W.x[i], W.y[i]]), nb = Sf.makeRod(pts, ob.thick || 4, { mat: Object.assign({}, ob.mat), role: ob.meta.role, meta: ob.meta }); if (!nb) return false;
  for (const k of ['uid', 'tension', 'free', 'drawn', 'dr', 'd0', 'sp0', 'dense', 'tie', 'lastStrike', 'ring']) if (ob[k] !== undefined) nb[k] = ob[k];
  for (const q of into) { const ab = W.bodies.get(W.bod[q.a]); if (ab) { drop1(ab.pins, q.a); drop1(ab.links, q.j); } }
  const PX = D.pin.X, PY = D.pin.Y; W.removeBody(ob); Sf._shapeSf.set(nb, Sf);
  const ni = D.atStart ? nb.idx[0] : nb.idx[nb.idx.length - 1], no = D.atStart ? nb.idx[nb.idx.length - 1] : nb.idx[0];
  W.pin(ni, PX, PY); D.pin = W.pins[W.pins.length - 1]; if (op) W.pin(no, op.X, op.Y); else if (oj >= 0 && W.fl[oj]) W.attach(no, oj, 1);
  for (const q of into) if (W.fl[q.a]) W.attach(q.a, nearestP(W, nb, q.x, q.y), 1);
  { const f = (D.Ld / D.st0) / Math.max(1, W.length(nb)); for (const s of nb.springs) if (W.sbody[s] === nb.id) W.sr[s] *= f; }   // keep the rest length target (so the stretch and tension it had)
  D.b = nb; D.i = ni; D.o = no; D.R = snapRest(W, nb); D.Lsnap = D.Ld; Sf.stats.shapeRebuild = (Sf.stats.shapeRebuild || 0) + 1; return true; };
const relay = (Sf, D) => { const W = Sf.W, b = D.b, t = Sf.now(); D.relT = t;
  if (D.mode === 'end') { const k = D.Ld / D.Lsnap, sp = b.sp0 || clamp((b.thick || 4) * 1.1, 7, 14), seg = (D.R.seg || sp) * k;
    if ((seg < sp * .5 || seg > sp * 2) && t - D.rbT >= Sh.REBUILD) { D.rbT = t; if (rebuild(Sf, D)) return; }
    relayRest(W, b, D.R, k); Sf.stats.shapeRelay = (Sf.stats.shapeRelay || 0) + 1; }
  else { const Ad = b.d0 || D.A0, r = Math.pow(Math.hypot(D.fx - D.cx, D.fy - D.cy) / D.d0, 2), A = clamp(D.A0 * r, .15 * Ad, 6 * Ad); b.area0 = A; relayRest(W, b, D.R, Math.sqrt(A / D.Asnap)); Sf.stats.shapeRelay = (Sf.stats.shapeRelay || 0) + 1; } };
// live pitch while dragging (Q118): glide by retune each frame of motion; a soft click on each new note of the key (<= 5/s); free shapes glide only
const pitchTick = (Sf, D) => { const b = D.b, S = Sf.S, t = Sf.now(), f = S.physics(b).f0; if (!(f > 0)) return;
  if (D.lastF && Math.abs(f / D.lastF - 1) > .003) { if (Sf.A && Sf.A.retune) Sf.A.retune(b.id, f / D.lastF); D.lastF = f; Sf.stats.shapeRetune = (Sf.stats.shapeRetune || 0) + 1; }
  if (b.free) return; const s = S.tune(b, f, t); if (D.lastSnap && Math.abs(s / D.lastSnap - 1) > .01 && t - D.clickT >= Sh.CLICK) { D.clickT = t; D.lastSnap = s; const P = D.mode === 'end' ? [D.pin.X, D.pin.Y] : Sf.W.center(b); Sf.strikeBody(b, P[0], P[1], 150, t, { soft: true, auto: true, noImpulse: true, click: true }); Sf.stats.shapeClick = (Sf.stats.shapeClick || 0) + 1; } };
Sh.tick = Sf => { const D = Sf.shapeDrag; if (!D) return; const W = Sf.W; if (!W.bodies.has(D.b.id)) { Sf.shapeDrag = null; return; } const b = D.b, t = Sf.now();
  if (D.mode === 'end') { const tx = D.fx + D.ox, ty = D.fy + D.oy, ox = W.x[D.o], oy = W.y[D.o], dx = tx - ox, dy = ty - oy, h = Math.hypot(dx, dy) || 1; let c = h;
    const Ld0 = b.d0 || D.L0, Lmin = Math.max(24, .3 * Ld0), Lmax = Math.min(1200, 3 * Ld0); let Ld = D.L0 + (c - D.c0); if (Ld > Lmax) { c -= Ld - Lmax; Ld = Lmax; } else if (Ld < Lmin) { c += Lmin - Ld; Ld = Lmin; } c = Math.max(2, c);
    const gx = ox + dx / h * c, gy = oy + dy / h * c, mv = Math.hypot(gx - D.pin.X, gy - D.pin.Y); D.pin.X += (gx - D.pin.X) * .6; D.pin.Y += (gy - D.pin.Y) * .6; D.Ld = Ld;
    if (t - D.relT >= Sh.RELAY) relay(Sf, D); if (mv > .3) pitchTick(Sf, D); }
  else { let mv = 0; for (const q of D.grp) { const gx = D.fx + q.ox, gy = D.fy + q.oy; mv = Math.max(mv, Math.hypot(gx - q.p.X, gy - q.p.Y)); q.p.X += (gx - q.p.X) * .6; q.p.Y += (gy - q.p.Y) * .6; } if (t - D.relT >= Sh.RELAY) relay(Sf, D); if (mv > .3) pitchTick(Sf, D); } };
const bodyNear = (Sf, X, Y, r, self) => { const W = Sf.W; let best = null, bd = 1e9; for (const b of W.bodies.values()) { if (b === self || b.kind === 'water' || !b.meta) continue; const role = b.meta.role; if (role === 'creature' || role === 'bubble' || b.meta.limb) continue; for (const i of b.idx) { const d = Math.hypot(W.x[i] - X, W.y[i] - Y) - (W.rad[i] || 3); if (d < r && d < bd) { bd = d; best = b; } } } return best; };
// release (Q112/Q114): ground within 16 px -> pin; a non-ohm body within 8 px -> tie on; else free. Never a throw, never a farewell flick.
Sh.end = Sf => { const D = Sf.shapeDrag; if (!D) return null; Sf.shapeDrag = null; const W = Sf.W, b = D.b; if (!W.bodies.has(b.id)) return null; let res = 'free';
  if (D.mode === 'end') { relay(Sf, D); const X = D.pin.X, Y = D.pin.Y; W.unpin(D.i); W.x[D.i] = W.px[D.i] = X; W.y[D.i] = W.py[D.i] = Y; const G = Sf.gnd ? Sf.gnd(X, Y) : null, gy = G ? 0 : Sf.ground(X);
    if (G ? G.on : (Math.abs(Y - gy) < 16 || Y > gy)) { const q = G ? G.lift(2) : [X, Math.min(Y, gy - 2)]; W.pin(D.i, q[0], q[1]); res = 'pin'; } else { const tb = bodyNear(Sf, X, Y, 8, b); if (tb) { W.attach(D.i, nearestP(W, tb, X, Y), 1); res = 'tie'; } }
    const anch = ends(b).filter(i => b.pins.includes(i)).length; if (anch >= 2 && (b.thick || 4) < 7) { const [a, c] = ends(b); b.tension = clamp(Math.hypot(W.x[a] - W.x[c], W.y[a] - W.y[c]) / Math.max(1, W.length(b)) * .93, .5, 1); } }
  else { relay(Sf, D); for (const q of D.grp) if (q.tmp) W.unpin(q.i); res = 'rim'; }
  for (const i of b.idx) { W.px[i] = W.x[i]; W.py[i] = W.y[i]; }   // release velocity 0
  Sf.lastShapeEvent = { k: D.mode, id: b.id, t: Sf.now() }; Sf.stats.lastRelease = res; return { k: D.mode === 'end' ? 'endDrag' : 'rimDrag', res, id: b.id }; };
// ---------------- snap order (P2, Q117): nearest jam (450 px) -> regional key -> session key ----------------
Sh.tune = (Sf, b, f) => { if (b.ens && RS.ShapePlay) { const ef = RS.ShapePlay.ensTune(Sf, b, f); if (ef > 0) return ef; }   /* v0.8a6 P6: ensemble tuning first */
  const W = Sf.W, [x, y] = W.center(b), J = RS.Jam; const m = J && J.local ? J.local(Sf, x, y) : null; if (m && m.sys) { Sf.stats.shapeSnapJam = (Sf.stats.shapeSnapJam || 0) + 1; return J.snap(Sf, m, f, isString(b)); }
  const rk = Sf.region && Sf.region.keyAt ? Sf.region.keyAt(x, y) : null, sys = rk && RS.Field && RS.Field.sysOf ? RS.Field.sysOf(rk) : null; if (sys && J) { Sf.stats.shapeSnapRegion = (Sf.stats.shapeSnapRegion || 0) + 1; return J.snap(Sf, { sys, tonicC: rk.tc, regOct: 0, oct: 0 }, f, false); }
  return 0; };
// ---------------- seeded voice (P3/P4) ----------------
Sh.mark = (Sf, b, dr) => { b.drawn = true; Sf._shapeSf.set(b, Sf); b.sp0 = clamp((b.thick || 4) * 1.1, 7, 14);
  if (!dr) { const N = Sf.mods.shapeN = (Sf.mods.shapeN || 0) + 1; dr = { v: 2, s: RS.hash('shapeVoice', Sf.seed, b.uid, N, Math.floor(Math.random() * 4294967296)) >>> 0, sl: Sh.deal(Sf) };   /* v0.8a9 (Wilbow 12:06): a fresh random voice per drawn shape; the engine comes from a shuffled 9-card deck (all 9 engines, no physical-only slot); saved, so it keeps its voice */
    const r = RS.rng(dr.s ^ 0x51ed27); for (const k of ['rigid', 'hard', 'loss', 'grain', 'density']) b.mat[k] = Math.round(clamp((b.mat[k] != null ? b.mat[k] : .5) + (r() * 2 - 1) * .15, 0, 1) * 1000) / 1000;   // 3 dp = what a save keeps, so a reload sounds identical   // seeded jitter around Sf.matFrom
    b.d0 = b.kind === 'rod' ? Sf.W.length(b) : (b.area0 || Math.abs(Sf.W.area(b))); }
  b.dr = dr; return b; };
// v0.8a9: random voice v2. Every timbre gene is drawn wide; the material only leans (30 %); the modal ring gets its own random character and is
// quieter than the engine voice (share .55-.92), so the shape's sound is the engine's, not a membrane bell. v1 shapes (saved before 0.8a9) keep theirs.
Sh.deal = Sf => { if (!Sf._engDeck || !Sf._engDeck.length) { const d = [0, 1, 2, 3, 4, 5, 6, 7, 8]; for (let k = 8; k > 0; k--) { const j = Math.floor(Math.random() * (k + 1)); [d[k], d[j]] = [d[j], d[k]]; } Sf._engDeck = d; } return Sf._engDeck.pop(); };
Sh.RINGS = [{ n: 'harm', R: [1, 2, 3, 4, 5, 6], w: .25 }, { n: 'odd', R: [1, 3, 5, 7, 9], w: .15 }, { n: 'soft', R: [1], w: .2 }, { n: 'oct', R: [1, 2, 4], w: .15 }, { n: 'bar', R: [1, 2.756, 5.404, 8.933], w: .1 }, { n: 'membrane', R: [1, 1.594, 2.136, 2.296, 2.653], w: .1 }, { n: 'tine', R: [1, 6.27, 17.55], w: .05 }];
Sh.ring = b => { const dr = b.dr; if (!dr || dr.v < 2) return null; if (b._ring && b._ring.s === dr.s) return b._ring; const r = RS.rng((dr.s ^ 0x7e11a) >>> 0); let u = r(), f = Sh.RINGS[0]; for (const q of Sh.RINGS) { if (u < q.w) { f = q; break; } u -= q.w; }
  return b._ring = { s: dr.s, fam: f.n, R: f.R, tilt: .35 + r() * .6, dk: .35 + r() * 1.1, share: .55 + r() * .37, exc: r(), res: r() }; };
Sh.reRing = (b, spec) => { const q = Sh.ring(b), M = spec && spec.modes; if (!q || !M || !M.length || !(M[0].f > 0)) return; const f0 = M[0].f, out = [];
  for (let k = 0; k < Math.min(M.length, q.R.length); k++) { const m = M[k]; out.push(Object.assign({}, m, { f: f0 * q.R[k], a: (k ? M[0].a * Math.pow(q.tilt, k) : m.a), d: m.d * q.dk })); } spec.modes = out; };
Sh.genome2 = b => { const dr = b.dr, r = RS.rng((dr.s ^ 0x9a3c) >>> 0), I = RS.IG, E = RS.ENGINES, g = new Array(240).fill(0), m = b.mat, cl = v => clamp(v, 0, .9999), lean = (k, t) => { g[I[k]] = cl(g[I[k]] * .7 + t * .3); };
  for (const k of RS.INST_GENES) g[I[k]] = r() * .9999; for (const e of E) g[I[e]] = r() * .2;
  const e0 = E[(dr.sl | 0) % 9]; g[I[e0]] = .72 + r() * .27; const e1 = E[Math.floor(r() * 9)]; if (r() < .38 && e1 !== e0 && e0 !== 'eNRES' && e1 !== 'eNRES') g[I[e1]] = .34 + r() * .3;   // optional 2-engine blend
  g[I.perc] = r() * .4; g[I.engMix] = r() * .3; g[I.inharm] = cl(Math.pow(r(), 2) * .5); g[I.lfoP] = cl(Math.pow(g[I.lfoP], 2) * .6); g[I.sat] = cl(g[I.sat] * .7);
  const hard = m.hard != null ? m.hard : .5, rig = m.rigid != null ? m.rigid : .5, loss = m.loss != null ? m.loss : .5, gr = m.grain || 0;   // the material only leans now
  lean('cut', .15 + .45 * hard + .2 * rig); lean('dec', .2 + .6 * (1 - loss)); lean('noise', gr * .6); lean('fold', gr); return g; };
Sh.resOf = b => b.kind === 'rod' ? (isString(b) ? 0 : .25) : (b.mat.clear || 0) > .4 ? 1 : (b.thick || 5) < 4 ? .75 : .5;
Sh.genome = (b) => { const dr = b.dr, r = RS.rng((dr.s ^ 0x9a3c) >>> 0), I = RS.IG, E = RS.ENGINES, g = new Array(240).fill(0), m = b.mat, cl = v => clamp(v, 0, .9999);
  for (const k of RS.INST_GENES) g[I[k]] = r() * .9999; for (const e of E) g[I[e]] = r() * .22;
  if (dr.sl < 36) { const e0 = E[dr.sl % 9]; g[I[e0]] = .72 + r() * .27; const u = r(), e1 = E[Math.floor(r() * 9)]; if (u < .35 && e0 !== 'eNRES' && e1 !== e0) g[I[e1]] = .32 + r() * .3; }   // 20 % physical only (slots 36-44)
  g[I.perc] = r() * .4; g[I.engMix] = r() * .3; const hard = m.hard != null ? m.hard : .5, rig = m.rigid != null ? m.rigid : .5, loss = m.loss != null ? m.loss : .5, gr = m.grain || 0;
  g[I.cut] = cl(.15 + .45 * hard + .2 * rig + (g[I.cut] - .5) * .3); g[I.dec] = cl(.2 + .6 * (1 - loss) + (g[I.dec] - .5) * .25); g[I.att] = cl(Math.pow(g[I.att], 1.6) * (1.2 - hard)); g[I.fold] = cl(g[I.fold] * .5 + gr * .5);
  g[I.noise] = cl(g[I.noise] * .5 + gr * .3); g[I.lfoP] = cl(Math.pow(g[I.lfoP], 2) * .6); g[I.inharm] = cl(Math.min(.7, g[I.inharm] * .6 + rig * .3)); g[I.sat] = cl(g[I.sat] * .6); return g; };
Sh.voice = (b, exc) => { const q = Sh.ring(b); if (exc == null) exc = q ? q.exc : .2; const res = q ? q.res : Sh.resOf(b), key = exc + '|' + res; b._vc = b._vc && b._vc.s === b.dr.s ? b._vc : { s: b.dr.s, g: q ? Sh.genome2(b) : Sh.genome(b) }; if (b._vc[key]) return b._vc[key]; const g = b._vc.g; g[RS.IG.exc] = exc; g[RS.IG.res] = res; return b._vc[key] = RS.Inst.fromGenome(g); };
Sh.share = b => { const q = Sh.ring(b); if (q) return q.share; const m = b.mat, base = clamp(.2 + .45 * ((m.hard != null ? m.hard : .5) * .5 + (m.clear || 0) * .5), .2, .65); return clamp(base + ((m.clear || 0) > .4 ? .15 : b.dense ? -.15 : 0), .05, .8); };   // Q121
// ---------------- v0.8b1 R5: blob shaping touches + a voice that tracks the CURRENT shape ----------------
// (rim drag = edge push / pull and pinch already exist.) A scribble inside a drawn blob roughens it. The blob's sound follows its shape at
// every strike: stretched = brighter / nasal (filter + formants up), lumpy / rough = grittier and shorter (noise, saturation, fold up; decay down).
Sh.ROUGH_MAX = 1;
Sh.scribble = (Sf, b, rev) => { const W = Sf.W, was = b.rough || 0, a = clamp(rev / 10, .3, 1); b.rough = clamp(was + .18 + .22 * a, 0, Sh.ROUGH_MAX); Sf.undoPush({ k: 'rough', uid: b.uid, v: was });
  const r = RS.rng(RS.hash('rough', b.uid, Math.round(b.rough * 100))), [cx, cy] = W.center(b); for (const i of b.idx) { const dx = W.x[i] - cx, dy = W.y[i] - cy, d = Math.hypot(dx, dy) || 1, j = (r() - .5) * 5 * b.rough; W.px[i] = W.x[i] - dx / d * j; W.py[i] = W.y[i] - dy / d * j; }   /* the rim shivers */
  b._form = null; Sf.stats.blobRough = (Sf.stats.blobRough || 0) + 1; if (Sf.strikeBody) Sf.strikeBody(b, cx, cy, 260); return { k: 'rough', id: b.id, rough: +b.rough.toFixed(2) }; };
// shape now: elong 0 (round) .. 1 (3:1 stretched), lump 0 (smooth) .. 1 (very irregular rim), plus the scribbled roughness
Sh.form = (W, b) => { const F = b._form, tn = W.t || 0; if (F && F.t === tn) return F; const n = b.idx.length; let cx = 0, cy = 0; for (const i of b.idx) { cx += W.x[i]; cy += W.y[i]; } cx /= n; cy /= n; let sxx = 0, syy = 0, sxy = 0, per = 0;
  for (let k = 0; k < n; k++) { const i = b.idx[k], j = b.idx[(k + 1) % n], dx = W.x[i] - cx, dy = W.y[i] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; per += Math.hypot(W.x[j] - W.x[i], W.y[j] - W.y[i]); }
  const tr = (sxx + syy) / n, det = (sxx * syy - sxy * sxy) / n / n, dd = Math.sqrt(Math.max(0, tr * tr / 4 - det)), l1 = tr / 2 + dd, l2 = Math.max(1e-6, tr / 2 - dd), ratio = Math.sqrt(l1 / l2), A = Math.abs(W.area(b)) || 1;
  const ell = Math.PI * Math.sqrt(2 * (l1 + l2)) * 1.414, iso = per / Math.max(1, ell);   /* rim length vs the matching ellipse's: > 1 = lumpy */
  return b._form = { t: tn, elong: clamp((ratio - 1) / 2, 0, 1), lump: clamp((iso - 1.06) / .5, 0, 1), rough: b.rough || 0, area: A }; };
Sh.shaped = (P, f) => { const e = f.elong, g = clamp(f.lump * .6 + f.rough, 0, 1.2); if (e < .03 && g < .03) return P; const q = Object.assign({}, P);
  q.cut = P.cut * (1 + 1.1 * e) * (1 - .1 * g); q.F1 = P.F1 * (1 + .25 * e); q.F2 = P.F2 * (1 + .45 * e); q.form = clamp((P.form || 0) + .35 * e, 0, 1); q.q = P.q * (1 + .5 * e);
  q.noise = clamp((P.noise || 0) + .3 * g, 0, 1); q.sat = clamp((P.sat || 0) + .35 * g, 0, 1); q.fold = clamp((P.fold || 0) + .3 * g, 0, 1); q.dec = P.dec * (1 - .45 * clamp(g, 0, 1)); q.rel = P.rel * (1 - .4 * clamp(g, 0, 1)); return q; };
Sh.install = Sf => { if (Sf._shapes) return; Sf._shapes = true; Sf._shapeSf = new WeakMap(); const W = Sf.W, S = Sf.S, pool = Sf.shapePool = { shape: [], ohm: [] };
  S.shapeTune = (b, f, t, chord) => (Sf._shapeSf.get(b) === Sf ? Sh.tune(Sf, b, f) : 0);
  const mr0 = Sf.makeRod, mb0 = Sf.makeBlob; Sf.makeRod = (...a) => { const b = mr0(...a); if (b && Sf._drawing) Sh.mark(Sf, b, null); return b; }; Sf.makeBlob = (...a) => { const b = mb0(...a); if (b && Sf._drawing) Sh.mark(Sf, b, null); return b; };
  const st0 = Sf.stroke; Sf.stroke = (...a) => { const pv = Sf._drawing; Sf._drawing = true; try { return st0(...a); } finally { Sf._drawing = pv; } };
  const gs0 = Sf.grabStart, gm0 = Sf.grabMove, ge0 = Sf.grabEnd;
  Sf.grabStart = (x, y) => { if (!Sf.drive && !Sf.baton) { const h = Sf.hit(x, y); if (!h.creature && !h.bubble) { const hd = Sh.handleAt(Sf, x, y); if (hd) return Sh.start(Sf, hd, x, y); } } return gs0(x, y); };
  Sf.grabMove = (x, y) => Sf.shapeDrag ? Sh.move(Sf, x, y) : gm0(x, y);
  Sf.grabEnd = (vx, vy) => Sf.shapeDrag ? Sh.end(Sf) : ge0(vx, vy);
  const dt0 = Sf.doubleTap; if (dt0) Sf.doubleTap = (x, y) => { const h = Sf.hit(x, y), r = dt0(x, y); if (h.body && h.body.drawn && !h.creature) h.body.dense = !((h.body.mat.clear || 0) > .4); return r; };
  const sb0 = Sf.serialBody, lb0 = Sf.loadBody; Sf.undoKinds.rough = a => { const b = [...W.bodies.values()].find(q => q.uid === a.uid); if (b) { b.rough = a.v; b._form = null; } };   /* v0.8b1: undo a scribble */
  Sf.serialBody = b => { const sb = sb0(b); if (b.drawn && b.dr) sb.dr = [b.dr.s, b.dr.sl, Math.round(b.d0 || 0), b.dense ? 1 : 0, b.dr.v || 1]; else if (b.drawn) sb.drawn = 1; return sb; };
  Sf.loadBody = sb => { const b = lb0(sb); if (b && Array.isArray(sb.dr)) { Sh.mark(Sf, b, { v: sb.dr[4] | 0 || 1, s: sb.dr[0] >>> 0, sl: sb.dr[1] | 0 }); b.d0 = sb.dr[2] || (b.kind === 'rod' ? W.length(b) : b.area0); if (sb.dr[3]) b.dense = true; } else if (b && sb.drawn) Sh.mark(Sf, b, null); return b; };   /* stab 0.8a8: a drawn flag without a voice record still survives (fresh voice) */
  const pl0 = Sf.play; Sf.play = (spec, when, x, y) => { if (spec && spec.inst && !spec.shapeVoice) { pool.ohm.push((when || Sf.now()) + (spec.dur || spec.len || .3) + ((spec.inst && spec.inst.rel) || .3)); if (pool.ohm.length > 40) pool.ohm.splice(0, pool.ohm.length - 40); } return pl0(spec, when, x, y); };
  // P3: the shape's own voice layered on its modal ring (same f0). At most 4 shape notes in the 14-voice pool; ohms first; off-screen = modal only.
  Sf.shapeLayer = (b, spec, t, x, y, v, o2) => { if (!b.drawn || !b.dr || !spec || spec.inst || !RS.Inst || !RS.IG) return; Sh.reRing(b, spec); if (b.kind === 'blob' && spec.modes) { const f = Sh.form(W, b), g = clamp(f.lump * .6 + f.rough, 0, 1); if (g > .03 || f.elong > .03) spec.modes = spec.modes.map((m, k) => Object.assign({}, m, { d: m.d * (1 - .4 * g), a: k ? m.a * (1 + .8 * f.elong + .5 * g) : m.a })); }   /* v0.8b1 R5: the ring follows the current shape too */ /* v0.8a9: the ring's own random character (also off-screen: a cheap remap) */ if (!Sf.inView(x, y, 0)) { Sf.stats.layerOff = (Sf.stats.layerOff || 0) + 1; return; }
    const now = Sf.now(); pool.shape = pool.shape.filter(e => e > now); pool.ohm = pool.ohm.filter(e => e > now);
    if (pool.shape.length >= Sh.POOL || pool.shape.length + pool.ohm.length >= Sh.NI - 1) { Sf.stats.layerFull = (Sf.stats.layerFull || 0) + 1; return; }
    const exc = o2.strum ? 0 : o2.exc != null ? o2.exc : null, f = b.kind === 'blob' ? Sh.form(W, b) : null, P = f ? Sh.shaped(Sh.voice(b, exc), f) : Sh.voice(b, exc), d0 = spec.modes && spec.modes[0] ? spec.modes[0].d : .5, dur = clamp(d0 * .7, .15, 2.5);
    spec.shapeVoice = { P, share: Sh.share(b), dur, vel: clamp(v / 500, .15, 1) }; pool.shape.push(Math.max(now, t || now) + dur + (P.rel || .3)); Sf.stats.layer = (Sf.stats.layer || 0) + 1; };
  const sp0 = Sf.step; Sf.step = (dt, ...a) => { const r = sp0(dt, ...a); if (Sf.shapeDrag) Sh.tick(Sf); return r; };
  Sf.endNear = (x, y, z) => Sh.endNear(Sf, x, y, z); };
})(typeof window !== 'undefined' ? window : global);
