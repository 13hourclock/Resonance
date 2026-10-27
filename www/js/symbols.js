'use strict';
// DRAWN SYMBOL GESTURES (v0.3 FOUNDATION). $P-style point-cloud multistroke recogniser + template table PORTED from Lensure
// (lightsynth/www/js/symbols.js, v2.8) as a standalone module: no Lensure globals, no Lensure features. Which glyph maps to which action
// is PENDING Wilbow's picks: the registry is empty except a demo stub, and unregistered glyphs FIZZLE (ink fades with a soft sound).
// Contexts: 'ground' (open ground), 'body' (stroke STARTS on a creature body - not its halo), 'bubble' (over a bubble or a cluster).
// Priority: the existing strokes route first (loop = catch, spiral = creature, line A->B = teach, small letters in a halo = words, closed
// shapes / waves / stars / zigzags as before); only strokes that no existing gesture claimed are offered to the recogniser.
(function (G) { const RS = G.RS; const SY = RS.Symbols = {};
const N = 40, TAU = Math.PI * 2;
const D2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
// ---------- template geometry (unit box, y down) ----------
const arcPts = (cx, cy, r, a0, a1, n = 24) => [...Array(n + 1).keys()].map(i => { const a = a0 + (a1 - a0) * i / n; return [cx + Math.cos(a) * r, cy + Math.sin(a) * r]; });
const poly = (n, r = 1, rot = -Math.PI / 2) => [...Array(n + 1).keys()].map(i => [Math.cos(rot + i * TAU / n) * r, Math.sin(rot + i * TAU / n) * r]);
const fn = (f, n = 40) => [...Array(n + 1).keys()].map(i => { const t = i / n; return f(t); });
const PHI = (1 + Math.sqrt(5)) / 2;
const T = {
  circle: [arcPts(0, 0, 1, -Math.PI / 2, 1.5 * Math.PI, 40)],
  triangle: [poly(3)], square: [[[-1, -1], [1, -1], [1, 1], [-1, 1], [-1, -1]]], hexagon: [poly(6)], pentagon: [poly(5)],
  arc: [arcPts(0, .6, 1, -Math.PI * .9, -Math.PI * .1)],
  spiral: [fn(t => { const a = t * 3.2 * Math.PI, r = Math.exp(Math.log(PHI) / (Math.PI / 2) * (a - 3.2 * Math.PI)); return [Math.cos(a) * r, Math.sin(a) * r]; }, 60)],
  sine: [fn(t => [t * 2 - 1, -Math.sin(t * TAU) * .5])],
  saw: [[[-1, .5], [-.33, -.5], [-.33, .5], [.33, -.5], [.33, .5], [1, -.5], [1, .5]]],
  squarewave: [[[-1, .5], [-1, -.5], [-.33, -.5], [-.33, .5], [.33, .5], [.33, -.5], [1, -.5], [1, .5]]],
  zigzag: [[[-1, .4], [-.5, -.4], [0, .4], [.5, -.4], [1, .4]]],
  lightning: [[[.3, -1], [-.35, .1], [.35, -.1], [-.3, 1]]],
  up: [[[0, 1], [0, -1]], [[-.6, -.4], [0, -1], [.6, -.4]]],
  down: [[[0, -1], [0, 1]], [[-.6, .4], [0, 1], [.6, .4]]],
  caretup: [[[-1, .6], [0, -.6], [1, .6]]], caretdown: [[[-1, -.6], [0, .6], [1, -.6]]],
  arrow: [[[-1, 0], [1, 0]], [[.4, -.5], [1, 0], [.4, .5]]],
  plus: [[[0, -1], [0, 1]], [[-1, 0], [1, 0]]],
  x: [[[-1, -1], [1, 1]], [[1, -1], [-1, 1]]],
  asterisk: [[[0, -1], [0, 1]], [[-.87, -.5], [.87, .5]], [[.87, -.5], [-.87, .5]]],
  bars: [[[-.4, -1], [-.4, 1]], [[.4, -1], [.4, 1]]],
  infinity: [fn(t => { const a = t * TAU; return [Math.sin(a), Math.sin(2 * a) * .45]; }, 48)],
  hourglass: [[[-.6, -1], [.6, -1], [-.6, 1], [.6, 1], [-.6, -1]]],
  star: [[0, 1, 2, 3, 4, 5].map(i => { const a = -Math.PI / 2 + i * 2 * TAU / 5; return [Math.cos(a), Math.sin(a)]; })],
  omega: [[[-1, 1], [-.4, 1], ...arcPts(0, 0, .75, Math.PI * .7, Math.PI * 2.3, 30), [.4, 1], [1, 1]]],
  waves: [fn(t => [t * 2 - 1, -.35 - Math.sin(t * TAU) * .25]), fn(t => [t * 2 - 1, .35 - Math.sin(t * TAU) * .25])],
  davidstar: [poly(3), poly(3, 1, Math.PI / 2)],
  ve: [poly(6), [[0, -1], [0, 1]], [[-.87, -.5], [.87, .5]], [[.87, -.5], [-.87, .5]]],
  fork: [[[0, 1], [0, 0]], [[-.8, -1], [0, 0], [.8, -1]]],
  tremwave: [fn(t => [t * 2 - 1, -Math.sin(t * TAU * 3) * .22], 72)],
  curl: [[[-1, .5], ...fn(t => { const a = -Math.PI / 2 + t * TAU; return [Math.cos(a) * .45 + 0 + (t - .5) * .3, -.05 + Math.sin(a) * .45 + .45]; }, 30).map(q => [q[0], q[1] - .5]), [1, .5]]],
  ess: [fn(t => { const a = t * TAU * .75 - Math.PI * .25; return t < .5 ? [Math.cos(Math.PI * .5 + t * 2 * Math.PI * 1.5) * .6, -.5 + Math.sin(Math.PI * .5 + t * 2 * Math.PI * 1.5) * -.5] : [-Math.cos(Math.PI * .5 + (t - .5) * 2 * Math.PI * 1.5) * .6, .5 + Math.sin(Math.PI * .5 + (t - .5) * 2 * Math.PI * 1.5) * .5]; }, 40)],
  diamond: [[[0, -1], [.7, 0], [0, 1], [-.7, 0], [0, -1]]],
  hash: [[[-.35, -1], [-.35, 1]], [[.35, -1], [.35, 1]], [[-1, -.35], [1, -.35]], [[-1, .35], [1, .35]]],
  scribble: [fn(t => [Math.sin(t * 37) * .9, Math.cos(t * 23) * .6 + Math.sin(t * 11) * .3], 80)],
  bow: [[[-1, -.1], [-.6, -.65], [0, -.85], [.6, -.65], [1, -.1]], [[0, -.85], [0, 1]]],
  horn: [[[-1, 0], [1, -.85]], [[-1, 0], [1, .85]]],
  drumhead: [[[1, 0], [.7, .7], [0, 1], [-.7, .7], [-1, 0], [-.7, -.7], [0, -1], [.7, -.7], [1, 0]], [[-1, 0], [1, 0]]],
  pi: [[[-1, -1], [1, -1]], [[-.6, -1], [-.6, 1]], [[.6, -1], [.6, 1]]],
  bell: [[[-.7, .6], [-.6, 0], [-.45, -.7], [0, -1], [.45, -.7], [.6, 0], [.7, .6]], [[-1, .6], [1, .6]]],
  stairs: [[[-1, 1], [-1, .33], [-.33, .33], [-.33, -.33], [.33, -.33], [.33, -1], [1, -1]]],
  rainbow: [[[-1, .6], [-.7, -.3], [0, -.7], [.7, -.3], [1, .6]], [[-.5, .6], [-.35, .1], [0, -.15], [.35, .1], [.5, .6]]],
  slashes: [[[-1, .35], [-.4, -.35]], [[-.3, .35], [.3, -.35]], [[.4, .35], [1, -.35]]],
  fmsine: [[[-1, 0], [-.75, -.7], [-.5, -1], [-.25, -.7], [0, 0], [.25, .7], [.5, 1], [.75, .7], [1, 0]], [[0, -1], [0, 1]]],
  tripsine: [[[-1, -.6], [-.5, -1], [0, -.6], [.5, -.2], [1, -.6]], [[-1, 0], [-.5, -.4], [0, 0], [.5, .4], [1, 0]], [[-1, .6], [-.5, .2], [0, .6], [.5, 1], [1, .6]]],
  pulseline: [[[-1, .3], [-1, -.6], [-.33, -.6], [-.33, .3], [.33, .3], [.33, -.6], [1, -.6], [1, .3]], [[-1, 1], [1, 1]]],
  drop: [[[0, -1], [.35, -.3], [.55, .2], [.45, .65], [0, .95], [-.45, .65], [-.55, .2], [-.35, -.3], [0, -1]]],
  lips: [[[-1, 0], [-.5, -.55], [0, -.65], [.5, -.55], [1, 0]], [[-1, 0], [-.5, .55], [0, .65], [.5, .55], [1, 0]]],
  room: [[[-1, 1], [-1, -.2], [0, -1], [1, -.2], [1, 1]]],
  frame: [[[-1, -.35], [-1, -1], [-.35, -1]], [[.35, 1], [1, 1], [1, .35]]],
  pluck: [[[-1, 1], [-.75, -1], ...fn(t => [-.75 + t * 1.75, 1 - 2 * Math.exp(-t * 4)], 20)]],
  swell: [fn(t => [t * 2 - 1, 1 - 2 * Math.exp(-((t - .5) ** 2) / .045)])],
  stutter: [[[-1, .5], [-1, -.5], [-.33, .5], [-.33, -.5], [.33, .5], [.33, -.5], [1, .5]]],
};
function cloud(strokes) {
  const all = []; let len = 0; strokes.forEach((s, si) => { for (let i = 1; i < s.length; i++) len += D2(s[i - 1], s[i]); });
  const step = len / (N - 1) || 1;
  strokes.forEach((s, si) => { let acc = 0; all.push(s[0].slice(0, 2)); let prev = s[0];
    for (let i = 1; i < s.length; i++) { let cur = s[i], d = D2(prev, cur);
      while (acc + d >= step && step > 0 && all.length < 4096) { const t = (step - acc) / d, q = [prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]; all.push(q); prev = q; d = D2(prev, cur); acc = 0; }
      acc += d; prev = cur; } });
  let pts = all; if (pts.length > N) { const o = []; for (let i = 0; i < N; i++) o.push(pts[Math.floor(i * pts.length / N)]); pts = o; } while (pts.length < N) pts.push(pts[pts.length - 1]);
  const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]), sc = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
  const cx = xs.reduce((a, b) => a + b) / N, cy = ys.reduce((a, b) => a + b) / N;
  return pts.map(p => [(p[0] - cx) / sc, (p[1] - cy) / sc]);
}
function cdist(a, b, start) { const used = new Uint8Array(N); let sum = 0, i = start;
  do { let min = 1e9, idx = -1; for (let j = 0; j < N; j++) if (!used[j]) { const d = D2(a[i], b[j]); if (d < min) { min = d; idx = j; } }
    used[idx] = 1; const w = 1 - ((i - start + N) % N) / N; sum += w * min; i = (i + 1) % N; } while (i !== start); return sum; }
function greedy(a, b) { const step = Math.floor(Math.sqrt(N)); let m = 1e9; for (let i = 0; i < N; i += step) m = Math.min(m, cdist(a, b, i), cdist(b, a, i)); return m; }
const TPL = Object.entries(T).filter(([id]) => id !== 'scribble').map(([id, st]) => ({ id, c: cloud(st), n: st.length }));
SY.templates = T; SY.TPL = TPL; SY.cloud = cloud; SY.dist = greedy; SY.N = N;
SY.addTemplate = (id, st) => { T[id] = st; const i = TPL.findIndex(t => t.id === id); const e = { id, c: cloud(st), n: st.length }; if (i >= 0) TPL[i] = e; else TPL.push(e); };
// per-player adaptive templates (hook): a confirmed recognition adds the player's own version (capped)
SY.adapt = (id, strokes, max = 3, Sf) => { if (Sf && Sf.mods) { const U = Sf.mods.glyphUser = Sf.mods.glyphUser || {}; const a = U[id] = U[id] || []; a.push(cloud(strokes).map(p => [+p[0].toFixed(3), +p[1].toFixed(3)])); while (a.length > max) a.shift(); } const k = id + '~p' + ((SY._ad = SY._ad || {})[id] = ((SY._ad[id] || 0) % max) + 1); const e = { id, c: cloud(strokes), n: strokes.length, user: true }; const i = TPL.findIndex(t => t.uid === k); e.uid = k; if (i >= 0) TPL[i] = e; else TPL.push(e); };
SY.TH = 4.2; SY.FAM = { undo: 'hook', question: 'hook' };
SY.recognize = strokes => { strokes = strokes.filter(s => s.length > 1); if (!strokes.length) return null; const P = strokes.flat(), xs = P.map(p => p[0]), ys = P.map(p => p[1]), size = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)); if (size < 18) return null;
  const c = cloud(strokes); let best = null, bs = 1e9, second = 1e9; const fam = id => SY.FAM[id] || id; for (const t of TPL) { if (Math.abs(t.n - strokes.length) > 1) continue; const d = greedy(c, t.c) * (t.n === strokes.length ? 1 : 1.35); if (d < bs) { if (!best || fam(best.id) !== fam(t.id)) second = bs; bs = d; best = t; } else if (d < second && (!best || fam(t.id) !== fam(best.id))) second = d; }   /* v0.8a O6: the two hooks ('undo', 'question') are one family: the margin is vs the best glyph of ANOTHER family */   /* margin vs the best OTHER glyph (personal variants share the id) */
  if (!best || bs > SY.TH) return null; return { id: best.id, score: +bs.toFixed(2), margin: +(second - bs).toFixed(2), size, box: { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) } }; };
// ghost completion (hook): best template for a HALF-drawn stroke, if clearly ahead
SY.complete = strokes => { const r = SY.recognize(strokes); return r && r.margin > .6 ? r : null; };
// ---------- registry: (glyph, context) -> action ----------
SY.REG = {}; SY.CONTEXTS = ['ground', 'body', 'bubble', 'pair'];
SY.register = (glyph, ctx, fn, o = {}) => { (SY.REG[glyph] = SY.REG[glyph] || {})[ctx] = { fn, stub: !!o.stub }; };
SY.context = (Sf, pts) => { const [x, y] = pts[0]; const h = Sf.hit ? Sf.hit(x, y) : {}; if (h.body && h.body.meta && (h.body.meta.role === 'bubble' || h.body.meta.cluster)) return { ctx: 'bubble', target: h.body }; const c = Sf.creatureAt ? Sf.creatureAt(x, y, 0) : null; if (c) { const inBody = c.segs.some(b => Sf.W.inside(b, x, y)); if (inBody) return { ctx: 'body', target: c }; return { ctx: 'halo', target: c }; } return { ctx: 'ground', target: null }; };
// route a stroke that no existing gesture claimed. Returns {k:'glyph', id, ctx, ok} or {k:'fizzle'}; never throws.
SY.route = (Sf, strokes, ctxInfo) => { const r = SY.recognize(strokes); const cx = ctxInfo || SY.context(Sf, strokes[0]); SY.lastInk = { strokes, t: Sf.now ? Sf.now() : 0, r };
  if (!r || cx.ctx === 'halo') return SY.fizzle(Sf, strokes, r ? 'halo' : 'low');
  const a = SY.REG[r.id] && SY.REG[r.id][cx.ctx]; if (!a || a.stub) return SY.fizzle(Sf, strokes, a ? 'stub' : 'unregistered', r);
  SY.adapt(r.id, strokes, 3, Sf); let res = null; try { res = a.fn(Sf, cx.target, r, strokes); } catch (e) { return SY.fizzle(Sf, strokes, 'error', r); }
  if (Sf.mods) (Sf.mods.glyphs = Sf.mods.glyphs || {})[r.id] = 1; return { k: 'glyph', id: r.id, ctx: cx.ctx, ok: true, res }; };
// offered by Sf.stroke AFTER the existing gestures: a confidently recognised glyph claims the stroke only if it is registered for this
// context (a stub fizzles). Unregistered shapes fall through to the old behaviour (material), so drawing is never broken while the
// glyph list is pending.
SY.CONF = 2.6; SY.offer = (Sf, strokes) => { const r = SY.recognize(strokes); if (!r || r.score > SY.CONF || r.margin < .25) return null; if (SY.FAM[r.id] === 'hook') return null;   /* v0.8a O6: a hook alone is never a glyph (two strokes: hook + arrowhead / point); SY.UNDO_GROUND retired (Q104) */ const cx = SY.context(Sf, strokes[0]); if (cx.ctx === 'halo') return null; const a = SY.REG[r.id] && SY.REG[r.id][cx.ctx]; if (!a) return null; return SY.route(Sf, strokes, cx); };
SY.fizzle = (Sf, strokes, why, r) => { const p = strokes[0][0]; if (Sf.fx) Sf.fx({ k: 'dustEat', x: p[0], y: p[1], col: [200, 200, 220], dur: .7 }); if (Sf.play && RS.Synth && RS.Synth.bubble) try { Sf.play(RS.Synth.bubble(.4, 900), Sf.now() + .01, p[0], p[1]); } catch (e) { } return { k: 'fizzle', why, id: r ? r.id : null }; };
// sky glyph constellation (hook): discovered glyphs, for the sky renderer to place as stars later
SY.constellation = Sf => Object.keys((Sf.mods && Sf.mods.glyphs) || {});
// guide demonstration (hook): ink points of a template traced at (x, y, size) - the guide plays them back as a ghost fingertip trail
SY.trace = (id, x, y, s) => (T[id] || []).map(st => st.map(p => [x + p[0] * s, y + p[1] * s]));

// ---------- v0.3 picks (Wilbow): (20) infinity across two creatures = bond / unbond; (21) hooked return arrow = undo ----------
SY.addTemplate('undo', [[[1, -.5], [-.3, -.5], ...Array.from({ length: 13 }, (_, i) => { const a = -Math.PI / 2 - i / 12 * Math.PI; return [-.3 + Math.cos(a) * .5, Math.sin(a) * .5]; }), [.6, .5]]]);
SY.pairOf = (Sf, pts) => { const hits = []; for (const c of Sf.creatures) { if (c.dead || c.caught) continue; const R = RS.Creature.radius(c) * 1.6 + 14; let k = 0; for (const p of pts) if (Math.hypot(p[0] - c.x, p[1] - c.y) < R) k++; if (k >= 2) hits.push([k, c]); } hits.sort((x, y) => y[0] - x[0]); return hits.length >= 2 ? [hits[0][1], hits[1][1]] : null; };   // the two creatures the loops pass over most
SY.bond = (Sf, a, b) => { const was = a.bond === b.id && b.bond === a.id; if (Sf.undoPush) Sf.undoPush({ k: 'bond', a: a.id, b: b.id, was }); if (was) { a.bond = b.bond = null; } else { if (a.bond) { const o = Sf.creatures.find(c => c.id === a.bond); if (o && o.bond === a.id) o.bond = null; } if (b.bond) { const o = Sf.creatures.find(c => c.id === b.bond); if (o && o.bond === b.id) o.bond = null; } a.bond = b.id; b.bond = a.id; }
  Sf.fx({ k: 'jamJoin', a, b, col: a.col, dur: 1.2 }); RS.Guide && RS.Guide.notify(Sf, 'bond'); return was ? 'unbond' : 'bond'; };
SY.register('infinity', 'pair', (Sf, t) => SY.bond(Sf, t[0], t[1]));
const undoAct = Sf => { const k = Sf.doUndo ? Sf.doUndo() : null; RS.Guide && RS.Guide.notify(Sf, 'undo'); return k; }; for (const cx of ['ground', 'body', 'bubble', 'pair']) SY.register('undo', cx, undoAct);
// EARLY offer (before the old stroke router): only these two glyphs, only when confident - an infinity across two creatures would
// otherwise be read as a catch loop, a hooked arrow as a material line.
// stab 0.8a8: the camera can be turned to any angle round the planet (cam.th), so world points are rotated against the screen; glyphs are read in
// the VIEW frame (rotated back by -th: 'up' and 'under' mean the screen's). Fresh launches land at a random angle, so '?' failed there.
SY.toView = (q, th) => { if (!th) return q; const c = Math.cos(th), s = Math.sin(th); return q.map(p => [p[0] * c + p[1] * s, -p[0] * s + p[1] * c]); };
SY.fromView = (q, th) => { if (!th) return q; const c = Math.cos(th), s = Math.sin(th); return q.map(p => [p[0] * c - p[1] * s, p[0] * s + p[1] * c]); };
SY.early = (Sf, pts, times, opt) => { const r = SY.recognize([SY.toView(pts, opt && opt.rot)]); if (!r || r.score > SY.CONF || r.margin < .2 || (r.id !== 'infinity' && SY.FAM[r.id] !== 'hook')) return null; if (r.id === 'infinity') { const pr = SY.pairOf(Sf, pts); if (!pr) { const F = RS.strokeFeatures(pts); if (Sf.fx) Sf.fx({ k: 'bloom', x: F.cx, y: F.cy, col: [150, 150, 165], dur: .5 }); return { k: 'fizzle', glyph: 'infinity' }; }   /* C8: a confident infinity with no pair under it fizzles (never a catch) */ return SY.route(Sf, [pts], { ctx: 'pair', target: pr }); } return SY.hold(Sf, pts, times, opt || {}); };   /* v0.8a O6: a hook is HELD for its second stroke (replaces the one-stroke undo and C9's SY.UNDO_GROUND, retired: Q104) */
// (28) personal variants, saved in Sf.mods.glyphUser, loaded per surface
SY.loadUser = Sf => { const U = (Sf.mods && Sf.mods.glyphUser) || {}; for (let i = TPL.length - 1; i >= 0; i--) if (TPL[i].user) TPL.splice(i, 1); for (const id in U) U[id].forEach((c, k) => TPL.push({ id, c, n: 1, user: true, uid: id + '~p' + k })); };
// (27) ghost completion: for glyphs already SEEN, match the partial stroke against template prefixes; returns the full ghost in world coords
SY.ghostFor = (Sf, pts) => { const seen = Object.keys((Sf.mods && Sf.mods.glyphs) || {}); if (!seen.length || pts.length < 6) return null; const pc = cloud([pts]); let best = null, bd = 2.2;
  for (const id of seen) { const st = T[id]; if (!st || st.length !== 1) continue; const full = st[0]; for (const fr of [.35, .5, .65, .8]) { const pre = full.slice(0, Math.max(2, Math.round(full.length * fr))); const d = greedy(pc, cloud([pre])); if (d < bd) { bd = d; best = { id, pre, full }; } } }
  if (!best) return null; const bb = q => { const xs = q.map(p => p[0]), ys = q.map(p => p[1]); return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]; }, A = bb(best.pre), B = bb(pts), sc = Math.max(B[2] - B[0], B[3] - B[1]) / (Math.max(A[2] - A[0], A[3] - A[1]) || 1);
  return { id: best.id, pts: best.full.map(p => [B[0] + (p[0] - A[0]) * sc, B[1] + (p[1] - A[1]) * sc]) }; };
SY.drawGhost = (ctx, g) => { if (!g) return; ctx.strokeStyle = 'rgba(255,248,230,.22)'; ctx.lineWidth = 2; ctx.setLineDash([4, 6]); ctx.beginPath(); g.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.setLineDash([]); };
// (26) sky constellation: each discovered glyph = a star (deterministic place per glyph), joined faintly in discovery order; screen space
SY.drawSky = (ctx, Sf, Wd, Ht, day) => { const ids = Object.keys((Sf.mods && Sf.mods.glyphs) || {}); if (!ids.length) return; const a = .35 + .5 * (1 - day); ctx.strokeStyle = 'rgba(220,230,255,' + (a * .25).toFixed(3) + ')'; ctx.lineWidth = 1; ctx.beginPath(); const P = ids.map(id => { const h = RS.hash('glyphstar', id), u = (h % 1000) / 1000, v = ((h >>> 10) % 1000) / 1000; return [Wd * (.62 + u * .3), Ht * (.06 + v * .18)]; }); P.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); for (const p of P) { ctx.fillStyle = 'rgba(240,245,255,' + a.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(p[0], p[1], 1.8, 0, 6.283); ctx.fill(); } };
// ---------- v0.8a O6 (Wilbow 2:55 AM; lone hook = rod, 3:12 Q103): TWO-STROKE GLYPHS. First stroke = a HOOK (the hooked-arrow 'undo' template or the
// new 'question' hook); it is HELD for SY.WIN s (Q101). Second stroke: an arrowhead '<' or '>' near either end of the hook = UNDO (both directions, Q100);
// a POINT under it = '?' (the guide comes, O2; its relations view is chunk 9). Anything else: the hook fades and that input routes as today. No second
// stroke: the hook becomes a normal material rod. Never held: catch loops (closed), spirals (>= 1.25 turns), flicks (small / short / fast), strokes that
// start on an ohm, bubble, halo or the egg, strokes across bodies (strum), the baton. (0.8a8: egg lessons / an open egg no longer block it.) One timer check per step, no per-frame work.
SY.addTemplate('question', [[...Array.from({ length: 23 }, (_, i) => { const a = Math.PI * 1.05 + i / 22 * Math.PI * 1.45; return [Math.cos(a) * .45, -.35 + Math.sin(a) * .45]; }), [0, .2], [0, .55]]]);
SY.WIN = 1.2; SY.PT = 12; SY.TAPMOVE = 10;
const bbox = q => { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of q) { if (p[0] < x0) x0 = p[0]; if (p[0] > x1) x1 = p[0]; if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; } return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, s: Math.max(x1 - x0, y1 - y0) }; };
const plen = q => { let L = 0; for (let i = 1; i < q.length; i++) L += D2(q[i - 1], q[i]); return L; };
const resamp = (q, n) => { const L = plen(q), st = L / (n - 1) || 1, o = [q[0]]; let acc = 0, prev = q[0]; for (let i = 1; i < q.length; i++) { let cur = q[i], d = D2(prev, cur); while (acc + d >= st && o.length < n) { const t = (st - acc) / d, r = [prev[0] + (cur[0] - prev[0]) * t, prev[1] + (cur[1] - prev[1]) * t]; o.push(r); prev = r; d = D2(prev, cur); acc = 0; } acc += d; prev = cur; } while (o.length < n) o.push(q[q.length - 1]); return o; };
// total signed turning of a stroke, in turns (resampled, so finger jitter does not add up)
SY.turns = q => { const r = resamp(q, 24); let a = 0, h0 = null; for (let i = 1; i < r.length; i++) { const dx = r[i][0] - r[i - 1][0], dy = r[i][1] - r[i - 1][1]; if (Math.hypot(dx, dy) < 1e-6) continue; const h = Math.atan2(dy, dx); if (h0 != null) { let d = h - h0; d = RS.wrapA(d); a += d; } h0 = h; } return a / TAU; };
// is this one stroke a holdable HOOK? (shape only; z = camera zoom so the px limits are screen px). Returns the hook record or null.
SY.hookShape = (pts, times, z = 1) => { if (!pts || pts.length < 6) return null; const r = SY.recognize([pts]); if (!r || r.score > SY.CONF || r.margin < .2 || SY.FAM[r.id] !== 'hook') return null;
  const B = bbox(pts), n = pts.length, sz = B.s, L = plen(pts); if (sz * z < 40) return null;                                                     // flick / tiny
  if (D2(pts[0], pts[n - 1]) < .5 * sz) return null;                                                                                                // closed: a catch loop
  const tu = Math.abs(SY.turns(pts)); if (tu < .3 || tu > 1.25) return null;                                                                        // a spiral (or a line / arc)
  if (times && times.length === n && times[n - 1] - times[0] > 0) { const dur = (times[n - 1] - times[0]) / 1000; if (dur < .25 || L * z / dur >= 900) return null; }   // a flick
  return { id: r.id, score: r.score, box: B, size: sz, start: pts[0].slice(0, 2), end: pts[n - 1].slice(0, 2), pts, times, turns: tu, z }; };
// second stroke tests (pure geometry, world or screen coords alike)
SY.isPoint = (H, p) => { const B = H.box, h = Math.max(B.h, 1), w = Math.max(B.w, 1), z = H.z || 1; return p[1] >= B.y1 - Math.max(4 / z, h * .08) && p[1] <= B.y1 + .6 * h && Math.abs(p[0] - H.end[0]) <= Math.max(.35 * w, 14 / z); };
SY.isArrow = (H, q) => { if (!q || q.length < 3) return false; const B = bbox(q), z = H.z || 1, k = B.s / H.size; if (B.s * z < SY.PT || k < .15 || k > .8) return false;
  const A = q[0], C = q[q.length - 1]; let ti = 1, best = -1; for (let i = 1; i < q.length - 1; i++) { const d = D2(q[i], A) + D2(q[i], C); if (d > best) { best = d; ti = i; } } const T = q[ti], la = D2(A, T), lc = D2(C, T); if (Math.min(la, lc) < .3 * Math.max(la, lc) || Math.min(la, lc) < 4 / z) return false;
  const dev = (P0, P1, seg) => { const L = D2(P0, P1) || 1; let m = 0; for (const p of seg) m = Math.max(m, Math.abs((P1[0] - P0[0]) * (P0[1] - p[1]) - (P0[0] - p[0]) * (P1[1] - P0[1])) / L); return m / L; };
  if (dev(A, T, q.slice(0, ti + 1)) > .3 || dev(T, C, q.slice(ti)) > .3) return false;                                                               // two straight-ish arms
  const ang = Math.acos(RS.clamp(((A[0] - T[0]) * (C[0] - T[0]) + (A[1] - T[1]) * (C[1] - T[1])) / (la * lc), -1, 1)) * 180 / Math.PI; if (ang < 20 || ang > 140) return false;
  return Math.min(D2(T, H.start), D2(T, H.end)) <= .4 * H.size; };
// the faint ghost finishes shown while a hook waits: an arrowhead at its end, a point under it
SY.ghostFinish = H => { const q = H.pts, n = q.length, e = H.end, p = q[Math.max(0, n - 5)], d = D2(e, p) || 1, ux = (e[0] - p[0]) / d, uy = (e[1] - p[1]) / d, L = H.size * .28, c = Math.cos(.6), s = Math.sin(.6);
  const arm = sg => [e[0] - L * (ux * c - sg * uy * s), e[1] - L * (uy * c + sg * ux * s)]; return { arrow: [arm(1), e.slice(), arm(-1)], point: [e[0], H.box.y1 + .3 * Math.max(H.box.h, 20)] }; };
// called from SY.early: hold the hook (or return null so the stroke routes as today)
SY.hold = (Sf, pts, times, opt) => { if (opt.noHold || Sf.baton) return null;   /* stab 0.8a8 (Wilbow 11:41): hooks are held during the egg lessons / an open egg too, so '?' works from the first minute (strokes ON the egg never get here: egg-routed) */ if (opt.ink && opt.ink.crossed && opt.ink.crossed.size) return null;   // strum, baton, egg
  const H = SY.hookShape(SY.toView(pts, opt.rot), times, opt.z || 1); if (!H) return null; H.rot = opt.rot || 0; H.wpts = pts; const cx = SY.context(Sf, pts); if (cx.ctx !== 'ground') return null;                     // starts on an ohm, its halo or a bubble
  H.opt = opt; H.t = Sf.now(); if (Sf.glyphHold) SY.holdTick(Sf, true); Sf.glyphHold = H; Sf._hookFade = null; return { k: 'held', id: H.id }; };
// window over (or forced): the lone hook becomes a normal material rod (Q103)
SY.holdTick = (Sf, force) => { const H = Sf.glyphHold; if (!H || (!force && Sf.now() - H.t <= SY.WIN)) return null; Sf.glyphHold = null; const r = Sf.stroke(H.wpts || H.pts, H.times, Object.assign({}, H.opt, { noHold: true })); Sf.lastHold = { k: 'rod', r }; return r; };
SY.fade = (Sf, H) => { Sf._hookFade = { pts: H.wpts || H.pts, t: Sf.now() }; Sf.lastHold = { k: 'fade' }; };
SY.finish = (Sf, H, id, at) => { Sf.glyphHold = null; let res = null; if (Sf.mods) (Sf.mods.glyphs = Sf.mods.glyphs || {})[id] = 1;
  if (id === 'undo') { if (H.id === 'undo') SY.adapt('undo', [H.pts], 3, Sf); res = undoAct(Sf); } else { if (H.id === 'question') SY.adapt('question', [H.pts], 3, Sf); res = RS.Guide && RS.Guide.summon ? RS.Guide.summon(Sf, at[0], at[1]) : null; }
  Sf._hookFade = { pts: H.wpts || H.pts, t: Sf.now(), glow: 1 }; Sf.lastHold = { k: id }; return { k: 'glyph', id, ctx: 'ground', ok: true, res, two: true }; };
// a second STROKE (from Sf.stroke, before anything else): arrowhead = undo, a tiny stroke under the hook = '?'; else the hook fades and null (route as today)
SY.second = (Sf, pts) => { const H = Sf.glyphHold; if (!H) return null; if (Sf.now() - H.t > SY.WIN) { SY.holdTick(Sf, true); return null; } Sf.glyphHold = null; const wp = pts; pts = SY.toView(pts, H.rot); const B = bbox(pts), z = H.z || 1;
  if (B.s * z < SY.PT) { const p = pts[pts.length - 1]; if (SY.isPoint(H, p)) return SY.finish(Sf, H, 'question', wp[wp.length - 1]); SY.fade(Sf, H); return null; }
  if (SY.isArrow(H, pts)) return SY.finish(Sf, H, 'undo'); SY.fade(Sf, H); return null; };
// a TAP while a hook waits (from the app's tap handler): under it = '?' (the tap is consumed); else the hook fades and the tap routes as today
SY.tap = (Sf, x, y) => { const H = Sf && Sf.glyphHold; if (!H) return null; if (Sf.now() - H.t > SY.WIN) { SY.holdTick(Sf, true); return null; } Sf.glyphHold = null; if (SY.isPoint(H, SY.toView([[x, y]], H.rot)[0])) return SY.finish(Sf, H, 'question', [x, y]); SY.fade(Sf, H); return null; };
SY.cancel = Sf => { if (Sf && Sf.glyphHold) { SY.fade(Sf, Sf.glyphHold); Sf.glyphHold = null; } };
// drawing (world transform already applied): the held hook, faint and fading over the window, with ghost hints of both finishes
SY.drawHold = (ctx, Sf, z = 1) => { const H = Sf.glyphHold, tn = Sf.now(); const line = (q, a, w) => { ctx.strokeStyle = 'rgba(255,248,230,' + a.toFixed(3) + ')'; ctx.lineWidth = w / z; ctx.beginPath(); q.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
  ctx.lineCap = 'round'; if (H) { const k = RS.clamp(1 - (tn - H.t) / SY.WIN, 0, 1), pu = .6 + .4 * Math.sin(tn * 9); line(H.wpts || H.pts, .18 + .32 * k, 3); const g = SY.ghostFinish(H); if (H.rot) { g.arrow = SY.fromView(g.arrow, H.rot); g.point = SY.fromView([g.point], H.rot)[0]; } ctx.setLineDash([4 / z, 5 / z]); line(g.arrow, .22 * pu * k + .06, 2); ctx.setLineDash([]); ctx.fillStyle = 'rgba(255,248,230,' + (.22 * pu * k + .06).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(g.point[0], g.point[1], 4 / z, 0, TAU); ctx.fill(); }
  const F = Sf._hookFade; if (F) { const a = 1 - (tn - F.t) / .45; if (a <= 0) Sf._hookFade = null; else line(F.pts, (F.glow ? .6 : .3) * a, 3); } };
})(typeof window !== 'undefined' ? window : globalThis);
