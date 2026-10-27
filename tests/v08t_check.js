// v0.8b1 (V08_SPEC R) headless check. R1 ink + fade, R2 retrace (either direction, tolerance, coverage), R3 windows (open 1.2 s,
// closed 2.5 s, hook = glyph window + ink window), R4 carryable pieces (cap 6, undo / redo, carried modulation never replaces the voice),
// R5 soft clay (particles, gestures unchanged, springs back) + blob scribble / shape-tracking voice. ONLY=R1..R5 runs one section.
const T = require('./node_env.js'), RS = global.RS, RT = RS.Retrace, It = RS.Items, Mo = RS.Mold, Sh = RS.Shapes;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const tm = p => p.map((_, i) => i * 12);
const line = (x, y, L = 160, n = 30, wob = 0) => { const p = []; for (let k = 0; k <= n; k++) p.push([x + k / n * L, y + Math.sin(k * .7) * wob + k * .6]); return p; };
const arc = (x, y, R = 70, n = 30) => { const p = []; for (let k = 0; k <= n; k++) { const a = Math.PI * (.1 + .8 * k / n); p.push([x + Math.cos(a) * R, y - Math.sin(a) * R * .7]); } return p; };
const ring = (x, y, R = 40, n = 44) => { const p = []; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; p.push([x + Math.cos(a) * R, y + Math.sin(a) * R * .9]); } return p; };
const jit = (p, a, s = 1) => p.map(([x, y], i) => [x + Math.sin(i * 1.7 + s) * a, y + Math.cos(i * 2.3 + s) * a]);
const S = (Sf, p, o = {}) => Sf.stroke(p, tm(p), Object.assign({ z: 1 }, o));
const scene = () => { const { Sf } = T.scene({ clear: true, ink: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.items = []; T.run(Sf, .3); const x0 = Sf.view.cx, y0 = Sf.ground(x0) - 230; return { Sf, x0, y0 }; };
const nBodies = Sf => [...Sf.W.bodies.values()].filter(b => b.drawn).length;
if (!ONLY || ONLY === 'R1') { const { Sf, x0, y0 } = scene(); const b0 = nBodies(Sf), p = arc(x0, y0);
  const r = S(Sf, p); ok('R1 an unrecognised stroke leaves ink, not material', r && r.k === 'ink' && nBodies(Sf) === b0 && Sf.inkPend.length === 1, r);
  T.run(Sf, 1.0); ok('R1 the ink is still there (glowing) after 1 s', Sf.inkPend.length === 1);
  T.run(Sf, 1.6); ok('R1 the ink has faded by ~2.6 s, and left nothing', Sf.inkPend.length === 0 && nBodies(Sf) === b0);
  const zz = []; for (let k = 0; k <= 8; k++) zz.push([x0 - 200 + k * 20, y0 + (k % 2 ? -30 : 30)]); const rz = S(Sf, zz); ok('R1 recognised gestures are unchanged (a zigzag is not ink)', rz && rz.k !== 'ink', rz && rz.k);
  const { Sf: Sl } = T.scene({ clear: true }); T.run(Sl, .2); const rl = Sl.stroke(arc(Sl.view.cx, Sl.ground(Sl.view.cx) - 230), tm(arc(0, 0)), { z: 1 }); ok('R1 legacy headless scenes (inkMode off) still draw material directly', rl && rl.k === 'material', rl && rl.k); }
if (!ONLY || ONLY === 'R2') { const { Sf, x0, y0 } = scene(); const p = arc(x0, y0);
  S(Sf, p); T.run(Sf, .4); const r = S(Sf, jit(p, 6)); const b = r && Sf.W.bodies.get(r.id);
  ok('R2 a retrace (same direction, ~6 px off) makes the piece', r && r.retrace && r.k === 'material' && !!b, r);
  ok('R2 the piece has exactly the drawn shape (open = rod, endpoints where the ink was)', b && b.kind === 'rod' && Math.hypot(Sf.W.x[b.idx[0]] - p[0][0], Sf.W.y[b.idx[0]] - p[0][1]) < 14, b && b.kind);
  ok('R2 the piece got a random voice (0.8a9) and is a drawn shape', b && b.drawn && b.dr && b.dr.v === 2);
  ok('R2 the ink is consumed', Sf.inkPend.length === 0);
  const q = line(x0 - 260, y0 - 120); S(Sf, q); T.run(Sf, .3); const r2 = S(Sf, jit(q.slice().reverse(), 5, 3)); ok('R2 reverse direction retraces too', r2 && r2.retrace, r2 && r2.k);
  const u = line(x0 - 260, y0 + 60); S(Sf, u); T.run(Sf, .3); const far = u.map(([x, y]) => [x, y + 30]), r3 = S(Sf, far); ok('R2 30 px away is NOT a retrace (new ink instead)', r3 && r3.k === 'ink', r3 && r3.k);
  const v = line(x0 + 120, y0 + 140, 200); S(Sf, v); T.run(Sf, .3); const r4 = S(Sf, v.slice(0, 12)); ok('R2 covering < 70% is NOT a retrace', !(r4 && r4.retrace), r4 && { k: r4.k, cov: r4.cov });
  const { Sf: Sz } = scene(), w = line(Sz.view.cx - 100, Sz.view.cy - 150, 160); Sz.stroke(w, tm(w), { z: .5 }); T.run(Sz, .2); const r5 = Sz.stroke(jit(w, 26), tm(w), { z: .5 }); ok('R2 tolerance is zoom-scaled (26 world px at zoom .5 = 13 screen px)', r5 && r5.retrace, r5 && r5.k);
  ok('R2 matcher: mean distance in screen px and coverage reported', RT.match(w, jit(w, 4), 1).ok && RT.match(w, jit(w, 4), 1).mean < 18); }
if (!ONLY || ONLY === 'R3') { const { Sf, x0, y0 } = scene(); const p = arc(x0, y0); S(Sf, p); T.run(Sf, 1.35); const r = S(Sf, jit(p, 4)); ok('R3 an open ink is gone for retracing after 1.2 s', !(r && r.retrace), r && r.k);
  const c = ring(x0 - 220, y0 - 60); const rc = S(Sf, c); ok('R3 a closed loop is ink too (not an effect item, not a blob)', rc && rc.k === 'ink' && rc.closed, rc);
  T.run(Sf, 2.2); const rr = S(Sf, jit(c, 5)); const b = rr && Sf.W.bodies.get(rr.id); ok('R3 a closed loop can still be retraced after 2.2 s (2.5 s window)', rr && rr.retrace && b && b.kind === 'blob', rr && rr.k);
  ok('R3 a retraced loop is a SOFT blob (low stiffness, meta.soft)', b && b.mat.stiff <= .5 && b.meta.soft === 1, b && b.mat.stiff);
  const c2 = ring(x0 + 220, y0 - 60); S(Sf, c2); T.run(Sf, 2.7); const r6 = S(Sf, jit(c2, 4)); ok('R3 ... but not after 2.7 s', !(r6 && r6.retrace));
  const SY = RS.Symbols; if (SY) { const { Sf: Sh2, x0: hx, y0: hy } = scene(); const hk = SY.trace('undo', hx, hy - 60, 50)[0], hm = hk.map((_, i) => i * 420 / hk.length);   // the real hook glyph, drawn in ~.4 s (not a flick)
    const rh = Sh2.stroke(hk, hm, { z: 1 }); const held = rh && rh.k === 'held'; ok('R3 setup: a hook is held for the glyph window', held, rh && rh.k);
    if (held) { T.run(Sh2, 1.3); ok('R3 after the glyph window the lone hook becomes ink (not a rod; supersedes Q103)', Sh2.inkPend.length === 1 && !(Sh2.lastHold && Sh2.lastHold.r && Sh2.lastHold.r.k === 'material'));
      T.run(Sh2, .8); const rr2 = Sh2.stroke(jit(hk, 4), hm, { z: 1 }); ok('R3 the hook can be retraced during the ink window (1.2 + 1.2)', rr2 && rr2.retrace, rr2 && rr2.k);
      const r7 = Sh2.stroke(hk, hm, { z: 1 }); T.run(Sh2, 2.6); const late = Sh2.stroke(jit(hk, 4), hm, { z: 1, noHold: true }); T.run(Sh2, 1.5); ok('R3 a hook left alone can no longer be retraced after 1.2 + 1.2 s and fades away, leaving nothing', !(late && late.retrace) && !Sh2.glyphHold && Sh2.inkPend.length <= 1, { r7: r7 && r7.k, late: late && late.k, ink: Sh2.inkPend.length });
      const r8 = Sh2.stroke(hk, hm, { z: 1 }); T.run(Sh2, .5); const r9 = Sh2.stroke(jit(hk, 4), hm, { z: 1 }); ok('R3 retracing the hook inside the glyph window also makes the piece', r8 && r8.k === 'held' && r9 && r9.retrace && r9.hook, r9 && r9.k); } } }
if (!ONLY || ONLY === 'R4') { const { Sf, x0, y0 } = scene(); const mk = (x, y, closed) => { const p = closed ? ring(x, y, 22) : arc(x, y, 30); S(Sf, p); T.run(Sf, .2); return S(Sf, jit(p, 3)); };
  const r = mk(x0, y0, false), b = Sf.W.bodies.get(r.id), it = (Sf.items || []).find(q => q.b === b);
  ok('R4 a retraced piece registers as a carryable effect item (piece, made=piece)', it && it.piece && it.made === 'piece' && b.meta.piece === 1, it && it.kind);
  ok('R4 its kind is one of the modulation kinds', it && ['rev', 'dly', 'dst', 'glt', 'cho', 'trm', 'cmb', 'pit'].includes(it.kind), it && it.kind);
  ok('R4 the piece keeps its own body (no preset shape)', it && It.pos(Sf, it) && Sf.W.bodies.has(b.id) && b.drawn);
  ok('R4 a closed retrace + rest is no longer an effect-item shortcut', RS.ITEMS_DRAW === false);
  for (let k = 0; k < 7; k++) mk(x0 - 300 + k * 90, y0 - 140, k % 2 === 0); ok('R4 at most 6 pieces are carryable', It.pieces(Sf).length === 6 && (Sf.stats.pieceFull || 0) >= 1, It.pieces(Sf).length);
  const g = T.plain(3); const c = T.add(Sf, g, x0 + 400); It.take(Sf, c, it); ok('R4 an ohm can carry a piece; mode is carry / wear (never swallow / nest)', it.holder === c && ['carry', 'wear'].includes(it.mode), it.mode);
  const c0 = { x: c.x, y: c.y, voice: c.voice }; T.run(Sf, 1); const [px, py] = Sf.W.center(b); const lim = RS.Creature.radius(c) + Math.min(it.span || 10, 40) + 20; ok('R4 the carried piece rides with its carrier, just above it (shape kept)', Math.hypot(px - c.x, py - c.y) < lim && Sf.W.bodies.has(b.id), { d: Math.round(Math.hypot(px - c.x, py - c.y)), lim: Math.round(lim) });
  ok('R4 the carrier keeps its own voice (the piece only modulates)', c.voice === c0.voice && (!It.active || Array.isArray(It.active(Sf, c)) || It.active(Sf, c) != null));
  const wear0 = it.wear; T.run(Sf, 3); ok('R4 a piece does not wear out', it.wear === wear0);
  It.drop(Sf, c); It.remove(Sf, It.pieces(Sf)[5]);   // room for one more
  const rr = mk(x0 + 200, y0 + 100, true); const nb = rr && Sf.W.bodies.get(rr.id);
  ok('R4 setup: a new piece registers once there is room', nb && It.pieces(Sf).some(q => q.b === nb));
  const before = It.pieces(Sf).length; Sf.doUndo(); T.run(Sf, .7); ok('R4 undo removes the piece (body and item)', !Sf.W.bodies.has(rr.id) && It.pieces(Sf).length <= before, { before, after: It.pieces(Sf).length });
  const u0 = It.pieces(Sf).length; It.remove(Sf, It.pieces(Sf)[0]); T.run(Sf, .1); Sf.doUndo(); T.run(Sf, .7); Sf.doRedo(); T.run(Sf, .7); ok('R4 redo re-registers a piece', It.pieces(Sf).some(q => q.b && Sf.W.bodies.has(q.b.id)) && It.pieces(Sf).length >= u0 - 1, It.pieces(Sf).length);
  ok('R4 pieces are not packed as items (they persist as bodies)', !It.pack(Sf).items.some(q => q.made === 'piece'));
  const sb = Sf.serialBody(It.pieces(Sf)[0].b); ok('R4 a piece body saves its piece flag', sb.piece >= 1); }
if (!ONLY || ONLY === 'R5') { const { Sf, x0, y0 } = scene(); const g = T.plain(5), k = Mo.make(Sf, g, x0, y0);
  ok('R5 the clay lump is a soft body (particle ring)', k.sb && k.sb.n === Mo.SB.N && k.sb.x.length === Mo.SB.N);
  T.run(Sf, 1.5); ok('R5 it swells to its genome outline and settles', Mo.SB.squish(k) < .08, +Mo.SB.squish(k).toFixed(3));
  const g0 = Array.from(k.g); Mo.tap(Sf, k, 1000, k.x, k.y - 10); const sq = Mo.SB.squish(k); T.run(Sf, .05); ok('R5 a tap squashes it', Mo.SB.squish(k) > .02 || sq > .02, +Mo.SB.squish(k).toFixed(3));
  T.run(Sf, 1.2); ok('R5 ... and it springs back', Mo.SB.squish(k) < .08, +Mo.SB.squish(k).toFixed(3));
  const R = Mo.radius(k), r1 = Mo.drag(Sf, k, [[k.x + R, k.y], [k.x + R * 1.5, k.y]]); ok('R5 edge pull still reshapes (same section 4 gesture, same genome edit path)', r1 === 'shape' && k.sbLast === 'pull', r1);
  T.run(Sf, 1.2); const ex = Math.max(...Array.from(k.sb.rx)); ok('R5 the rest outline follows the new genome', ex > 0 && Mo.SB.squish(k) < .1);
  const r2 = Mo.drag(Sf, k, [[k.x - 5, k.y], [k.x + 8, k.y + 2], [k.x - 6, k.y - 1], [k.x + 9, k.y], [k.x - 7, k.y + 2], [k.x + 8, k.y], [k.x - 6, k.y]]); ok('R5 scribble on the clay still roughens', r2 === 'rough' && k.sbLast === 'rough', r2);
  ok('R5 pinch still resizes', Mo.pinch(Sf, k, 1.4) === 'grow' && k.sbLast === 'pinch'); const st = Mo.twist(Sf, k, 1); ok('R5 twist still steps voices', typeof st === 'string' && k.sbLast === 'twist');
  ok('R5 the touch registry is extensible (new shaping touches plug in)', typeof Mo.SB.def === 'function' && ['push', 'pull', 'pinch', 'twist', 'rough', 'tap', 'poke', 'limb'].every(n => Mo.SB.TOUCH[n]));
  Mo.SB.touch(k, 'poke', k.x + R * 1.4, k.y); T.run(Sf, .02); ok('R5 a live finger poke moves the rim', Mo.SB.squish(k) > .01);
  const hk = Mo.hatch(Sf, 'test'); ok('R5 the clay still hatches into an ohm', hk && !hk.dead);
  // blobs
  const { Sf: Sb, x0: bx, y0: by } = scene(); const lp = ring(bx, by, 50); const rb = Sb.stroke(lp, tm(lp), { z: 1, direct: true }); const b = Sb.W.bodies.get(rb.id); T.run(Sb, .5);
  const [qx, qy] = Sb.W.center(b);   // the blob has settled / fallen: scribble where it is now
  const sc = []; for (let i = 0; i <= 24; i++) sc.push([qx - 25 + (i % 2) * 50, qy - 20 + i * 1.6]); const ink = { crossed: new Map([[b.id, 1]]) };
  const rs = Sb.stroke(sc, tm(sc), { z: 1, ink }); ok('R5 a scribble inside a drawn blob roughens it (not a strum)', rs && rs.k === 'rough' && b.rough > 0, rs);
  const cr = []; for (let i = 0; i <= 20; i++) cr.push([qx - 120 + i * 12, qy]); const rs2 = Sb.stroke(cr, tm(cr), { z: 1, ink: { crossed: new Map([[b.id, 1]]) } }); ok('R5 a line across the blob is still a strum', rs2 && rs2.k === 'strum', rs2 && rs2.k);
  Sb.doUndo(); ok('R5 undo un-roughens', !b.rough, b.rough);
  const P0 = Sh.voice(b, .2), f0 = Sh.form(Sb.W, b), Q0 = Sh.shaped(P0, f0);
  const [cx, cy] = Sb.W.center(b); for (const i of b.idx) { Sb.W.x[i] = cx + (Sb.W.x[i] - cx) * 1.8; Sb.W.y[i] = cy + (Sb.W.y[i] - cy) * .55; } b._form = null; const f1 = Sh.form(Sb.W, b), Q1 = Sh.shaped(P0, f1);
  ok('R5 a stretched blob sounds brighter / more nasal', f1.elong > f0.elong + .3 && Q1.cut > Q0.cut * 1.2 && Q1.F2 > Q0.F2, { e0: +f0.elong.toFixed(2), e1: +f1.elong.toFixed(2) });
  b.rough = .8; b._form = null; const Q2 = Sh.shaped(P0, Sh.form(Sb.W, b)); ok('R5 a rough blob sounds grittier and shorter', Q2.noise > Q1.noise && Q2.sat > Q1.sat && Q2.dec < Q1.dec);
  ok('R5 roughness is saved', Sb.serialBody(b).rough === .8); }
console.log(`v08t ${pass}/${tot}`); process.exit(pass === tot ? 0 : 1);
