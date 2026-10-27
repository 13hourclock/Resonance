'use strict';
// Effect ITEMS (12:29 steer) + the symbiosis loops (12:34 steer). An item is a soft body of the one material carrying an effect: creatures seek,
// take (carry / wear / swallow) or nest by it, and play through it (per-creature insert, fx.js, capped slots). Items have STATE (charge, wear,
// dust, mass, hollow, spin) that weather, places and creatures change; creatures gain/lose energy through sound interactions.
// Relationships are gene-weighted (8 attraction genes + temperament genes) and LEARNED per species (genetic clusters): Sf.spRel[species][kind].
// Everything is deterministic (seeded by ids + quantised time), persistent (Sf.pack items/patches/species), event-only visuals, CPU capped.
(function (G) { const RS = G.RS = G.RS || {}; const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
// STAGE 2 (v0.4): built + tested in v0.3/v0.4a (off); v0.4b turns it on.
RS.V04 = !!(G.RESONANCE_V04 || RS.V04); const It = RS.ItemsImpl = {}; if (RS.V04 || RS.ITEMS !== false) RS.Items = It;   /* v0.4b: ON (RS.ITEMS = false turns it off). Items are WORLD objects ohms find, carry and make; a player's closed shape still makes a material blob (RS.ITEMS_DRAW, off, keeps the v0.4 shape->item path for tests) */ if (RS.ITEMS_DRAW == null) RS.ITEMS_DRAW = false;   /* v0.8b1 R4: 'closed shape + rest = effect item' retired (it replaced the shape with a preset); effects now come from carried pieces (It.fromPiece) */   /* v0.8 A: ON, but it only gates the RESTED closed-shape path (closed shape + end rest >= CLAY_HOLD); a closed shape lifted at once is still a blob */
It.KINDS = ['rev', 'dly', 'dst', 'glt', 'cho', 'trm', 'cmb', 'pit'];
It.NAME = { rev: 'shell', dly: 'echo crystal', dst: 'ember-rock', glt: 'shard cluster', cho: 'droplet', trm: 'seed pod', cmb: 'reed tube', pit: 'bubble lens' };
It.AG = { rev: 'aRev', dly: 'aDly', dst: 'aDst', glt: 'aGlt', cho: 'aCho', trm: 'aTrm', cmb: 'aCmb', pit: 'aPit' };
It.COL = { rev: [230, 210, 180], dly: [170, 220, 255], dst: [255, 110, 50], glt: [200, 120, 255], cho: [120, 200, 230], trm: [170, 220, 110], cmb: [210, 190, 120], pit: [220, 240, 255] };
It.MAX = 14; It.SLOTS = 6; It.TICK = .5;
/* v0.8b5: + 20 kinds (fxkinds.js). It.KINDS stays the 8 a player's shape can read as; It.ALL = every kind the world grows. */
const FXK = () => RS.FXK; It.ALL = It.KINDS.slice(); if (RS.FXK) { for (const k of RS.FXK.NEW) { It.ALL.push(k); It.NAME[k] = RS.FXK.NAME[k]; It.COL[k] = RS.FXK.COL[k]; It.AG[k] = RS.FXK.FAMG[k]; } }
const GI = () => RS.GI, IG = () => RS.IG, gene = (c, k) => { const i = typeof k === 'number' ? k : (IG()[k] != null ? IG()[k] : GI()[k]); const v = c.g[i]; return v == null || isNaN(v) ? .5 : v; };
const rngAt = (...k) => RS.rng(RS.hash('items', ...k));
// ---------------- species: genetic clusters (instrument + body genes; breeding-compatible = close) ----------------
It.SPG = (() => { const a = []; for (let i = 0; i < 20; i++) a.push(i); for (let i = 172; i < 232; i++) a.push(i); return a; })();
It.species = (Sf, c) => { if (c.sp != null && c._spG === c.g) return c.sp; Sf.species = Sf.species || []; let best = null, bd = 1e9; for (const s of Sf.species) { let d = 0; for (let k = 0; k < It.SPG.length; k++) { const e = (c.g[It.SPG[k]] || 0) - s.cen[k]; d += e * e; } d = Math.sqrt(d / It.SPG.length); if (d < bd) { bd = d; best = s; } }
  if (!best || bd > .3) { best = { id: Sf.species.length, cen: It.SPG.map(i => c.g[i] || 0), n: 0 }; Sf.species.push(best); } best.n++; c.sp = best.id; c._spG = c.g; return c.sp; };
It.rel = (Sf, sp, k) => { Sf.spRel = Sf.spRel || {}; const r = Sf.spRel[sp] = Sf.spRel[sp] || {}; if (r[k] == null) r[k] = (rngAt('sp', sp, k)() - .5) * .4; return r[k]; };
It.learn = (Sf, c, k, d) => { const sp = It.species(Sf, c), v = It.rel(Sf, sp, k); Sf.spRel[sp][k] = clamp(v + d, -1, 1); };
It.att = (Sf, c, k) => clamp(.6 * gene(c, It.AG[k]) + .4 * (It.rel(Sf, It.species(Sf, c), k) * .5 + .5) + (k === 'dst' && It.gentle(c) ? -.5 : 0), 0, 1);
It.gentle = c => gene(c, 'loudness') < .35 || gene(c, 'calm') > .78;
It.loud = c => gene(c, 'loudness') > .6;
// ---------------- making items (shape follows kind) ----------------
It.SHP = { shm: [10, (i, a) => i % 2 ? .45 : 1.05], frz: [12, (i, a) => i % 2 ? .6 : 1], tap: [16, (i, a) => .85 + .15 * Math.cos(a * 2)], spr: [14, (i, a) => .8 + .2 * Math.cos(a * 5)], wah: [14, (i, a) => .65 + .45 * Math.max(0, Math.cos(a))], phs: [16, (i, a) => i % 4 < 2 ? 1 : .8], spn: [12, (i, a) => i % 3 ? .7 : 1.1],
  vow: [14, (i, a) => .9 + .2 * Math.sin(a) * (Math.cos(a) > 0 ? 1 : -1)], hrm: [14, (i, a) => .8 + .25 * Math.abs(Math.cos(a))], sub: [10, (i, a) => .9 + .1 * ((i * 5) % 3) / 2], gld: [14, (i, a) => .55 + .5 * Math.max(0, Math.cos(a - .4))], sym: [6, () => 1], grn: [14, (i, a) => .75 + .3 * ((i * 7) % 4) / 3], rng: [14, (i, a) => a > Math.PI * 1.25 && a < Math.PI * 1.75 ? .7 : 1],
  wrm: [12, (i, a) => .85 + .15 * Math.sin(a * 3)], rad: [4, () => 1.25], gat: [16, (i, a) => i % 2 ? 1 : .7], swl: [12, (i, a) => .7 + .35 * Math.max(0, -Math.sin(a))], dop: [12, (i, a) => .55 + .55 * Math.max(0, Math.cos(a))], pmp: [14, (i, a) => .75 + .3 * Math.abs(Math.sin(a))] };
It.shape = (kind, x, y, R, facets) => { if (It.SHP[kind]) { const [n, f] = It.SHP[kind], pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU + (kind === 'rad' ? Math.PI / 4 : 0), r = R * f(i, a); pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return pts; }
  const n = kind === 'dly' ? Math.max(3, facets || 5) : kind === 'glt' ? 9 : kind === 'cmb' ? 12 : 14, pts = [];
  for (let i = 0; i < n; i++) { const a = i / n * TAU; let r = R; if (kind === 'dst') r *= .75 + .25 * ((i * 7) % 3) / 2; if (kind === 'glt') r *= i % 2 ? .55 : 1.1; if (kind === 'trm') r *= .8 + .25 * Math.cos(a * 3); if (kind === 'rev') r *= .7 + .3 * (i / n);
    pts.push(kind === 'cmb' ? [x + Math.cos(a) * R * 1.9, y + Math.sin(a) * R * .45] : [x + Math.cos(a) * r, y + Math.sin(a) * r]); } return pts; };
It.defP = (kind, r) => ({ rev: { size: .3 + r() * .5, damp: r() }, dly: { facets: 3 + Math.floor(r() * 5), fb: .3 + r() * .4, tone: .3 + r() * .6 }, dst: { drive: .4 + r() * .5, tone: .2 + r() * .6 },
  glt: { seg: .06 + r() * .15, rep: .3, rev: .1 + r() * .2, crush: .2 }, cho: { rate: .2 + r() * 1.5, depth: .3 + r() * .6, fb: r() * .5, flange: r() < .35 ? 1 : 0 }, trm: { rate: 2 + r() * 5, depth: .4 + r() * .5, pan: r() },
  cmb: { freq: 110 * Math.pow(2, r() * 3), fb: .5 + r() * .4 }, pit: { semi: [-12, -5, 5, 7, 12][Math.floor(r() * 5)] } })[kind] || {};   /* v0.8b5: the new kinds keep their params in the character (FXK.ch) + it.adj */
It.make = (Sf, kind, x, y, o = {}) => { Sf.items = Sf.items || []; if (Sf.items.length >= It.MAX && !o.force) return null; const r = rngAt('make', kind, Math.round(x), Math.round(y), Sf.items.length + (Sf.itemN || 0));
  const p = Object.assign(It.defP(kind, r), o.p || {}), R = o.R || (RS.FXK && RS.FXK.R[kind]) || (kind === 'rev' ? 16 : kind === 'cmb' ? 9 : 11), it = { uid: o.uid || ('i' + (Sf.itemN = (Sf.itemN || 0) + 1) + '_' + Math.round(x)), kind, p, charge: o.charge == null ? 1 : o.charge, wear: o.wear || 0, dust: o.dust || 0, mass: o.mass == null ? .3 : o.mass, hollow: o.hollow || 0, spin: 0, holder: null, mode: null, nest: null, residents: [], x, y, R, patch: o.patch || null, made: o.made || 'world' }; if (o.adj) it.adj = Object.assign({}, o.adj); if (o.ch) it.ch = Object.assign({}, o.ch);   /* v0.8b5: close-up adjustments + character persist with the item */
  if (RS.FXK) RS.FXK.ch(Sf, it); Sf.items.push(it); if (!o.held) It.place(Sf, it, x, y); return it; };
It.place = (Sf, it, x, y) => { const W = Sf.W; if (it.piece) { if (it.b && W.bodies.has(it.b.id)) { const c = W.center(it.b); it.x = c[0]; it.y = c[1]; } return it.b; }   /* v0.8b1: dropped where it is */ const b = Sf.makeBlob(It.shape(it.kind, x, y, it.R, it.p.facets), { role: 'item', meta: { item: it }, mat: { clear: it.kind === 'pit' || it.kind === 'cho' || it.kind === 'dly' ? .85 : .2, n: 1.4, pressure: 1.05, mass: .6, stiff: it.kind === 'cho' ? .6 : .95 } }); it.b = b; it.x = x; it.y = y; return b; };
It.unplace = (Sf, it) => { if (it.piece) { if (it.b && Sf.W.bodies.has(it.b.id)) { const [x, y] = Sf.W.center(it.b); it.x = x; it.y = y; } return; }   /* v0.8b1: a piece keeps its own body while carried */ if (it.b && Sf.W.bodies.has(it.b.id)) { const [x, y] = Sf.W.center(it.b); it.x = x; it.y = y; Sf.W.removeBody(it.b); } it.b = null; };
It.pos = (Sf, it) => { if (it.holder) return [it.holder.x, it.holder.y]; if (it.b && Sf.W.bodies.has(it.b.id)) { const c = Sf.W.center(it.b); it.x = c[0]; it.y = c[1]; } return [it.x, it.y]; };
It.PLAYER_MAX = 4; It.playerFull = Sf => (Sf.items || []).filter(q => q.made === 'player').length >= It.PLAYER_MAX;   /* v0.8 A (Q43): at most 4 player-made items alive; world items keep It.MAX */
It.remove = (Sf, it) => { if (it.piece && it.b && Sf.W.bodies.has(it.b.id) && it.b.meta) it.b.meta.piece = 0; It.unplace(Sf, it); if (it.holder) It.drop(Sf, it.holder, true); Sf.items = Sf.items.filter(q => q !== it); };
// ---------------- the player's closed shapes -> items: form + material decide the effect, continuously ----------------
It.read = (pts, mat = {}) => { const n = pts.length; let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= n; cy /= n; const rs = pts.map(([x, y]) => Math.hypot(x - cx, y - cy)), mr = rs.reduce((a, b) => a + b, 0) / n || 1;
  const rough = Math.sqrt(rs.reduce((a, r) => a + (r - mr) ** 2, 0) / n) / mr; let corners = 0, turnAbs = 0; for (let i = 1; i < n - 1; i++) { const a1 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), a2 = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); let d = Math.abs(((a2 - a1 + Math.PI * 3) % TAU) - Math.PI); turnAbs += d; if (d > .9) corners++; }
  let xs = pts.map(q => q[0]), ys = pts.map(q => q[1]); const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys), elong = Math.max(w, h) / Math.max(4, Math.min(w, h)), size = mr, clear = mat.clear == null ? .5 : mat.clear, soft = 1 - (mat.stiff == null ? .8 : mat.stiff);
  // continuous evidence per kind; the strongest decides the kind, all features set its parameters
  const ev = { cmb: (elong - 1.8) * 1.2, dly: corners >= 3 && corners <= 8 && rough < .35 ? .6 + clear * .5 : 0, dst: rough * 2.2 - clear * .4 + (corners > 8 ? .3 : 0), glt: (corners > 9 ? .5 : 0) + rough * 1.2 + (turnAbs / TAU > 3 ? .5 : 0) - .3,
    rev: size > 34 && rough < .25 ? .5 + size / 120 : 0, pit: size < 26 && rough < .2 ? .4 + clear * .7 : 0, cho: rough < .3 ? soft * 1.4 + clear * .3 : 0, trm: Math.max(0, rough - .12) < .2 && corners >= 2 && corners <= 4 ? .45 : 0 };
  const kind = Object.keys(ev).reduce((a, b) => ev[b] > ev[a] ? b : a, 'cho'), r = rngAt('shape', Math.round(cx), Math.round(cy), n), p = It.defP(kind, r);
  if (kind === 'dly') p.facets = clamp(corners, 3, 8); if (kind === 'rev') { p.size = clamp(size / 90, .2, 1); p.damp = 1 - clear; } if (kind === 'dst') p.drive = clamp(rough * 2.5, .3, 1); if (kind === 'glt') { p.crush = clamp(rough, .1, .9); p.seg = clamp(.2 - corners * .01, .04, .2); }
  if (kind === 'cmb') p.freq = clamp(9000 / Math.max(w, h), 60, 1400); if (kind === 'pit') p.semi = Math.round(clamp((26 - size) / 2, -12, 12)) || 7; if (kind === 'cho') { p.depth = clamp(soft + .2, .2, 1); p.flange = size < 22 ? 1 : 0; } if (kind === 'trm') p.rate = clamp(10 - size / 8, 1.5, 9);
  return { kind, p, R: clamp(size * .5, 7, 22), cx, cy, ev }; };
It.fromShape = (Sf, pts, mat = {}) => { const q = It.read(pts, mat), kind = q.kind, cx = q.cx, cy = q.cy;
  const it = It.make(Sf, kind, cx, cy, { p: q.p, R: q.R, made: 'player', force: true }); Sf.stats.itemsDrawn = (Sf.stats.itemsDrawn || 0) + 1; Sf.fx({ k: 'itemMade', x: cx, y: cy, col: It.COL[kind], dur: 1.2, force: true }); return it; };
// ---------------- v0.8b1 R4: retraced PIECES are the player's effect objects ----------------
// The piece keeps its own body, shape and voice; its material qualities pick the modulation kind (same reading as 0.8 A for loops;
// open strokes: long -> delay, straight -> comb, jagged -> grit / glitch, small -> pitch, smooth curve -> chorus, few even corners ->
// tremolo). Carried, it modulates the carrier's OWN sound (It.active / It.params as for any item); it never replaces it.
It.PIECE_MAX = 6; It.PIECE_SPAN = 60;
It.readOpen = (pts, mat = {}) => { const n = pts.length; let L = 0, corners = 0, turnAbs = 0; for (let i = 1; i < n; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  for (let i = 1; i < n - 1; i++) { const a1 = Math.atan2(pts[i][1] - pts[i - 1][1], pts[i][0] - pts[i - 1][0]), a2 = Math.atan2(pts[i + 1][1] - pts[i][1], pts[i + 1][0] - pts[i][0]); const d = Math.abs(((a2 - a1 + Math.PI * 3) % TAU) - Math.PI); turnAbs += d; if (d > .9) corners++; }
  const ch = Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]), straight = ch / Math.max(1, L), clear = mat.clear == null ? .5 : mat.clear, soft = 1 - (mat.stiff == null ? .8 : mat.stiff); let cx = 0, cy = 0; for (const [x, y] of pts) { cx += x; cy += y; } cx /= n; cy /= n;
  const ev = { dly: L > 260 ? .5 + L / 900 : 0, cmb: straight > .85 && L > 60 && L <= 260 ? .55 + straight * .3 : 0, dst: corners > 5 ? .4 + corners * .05 - clear * .3 : 0, glt: corners > 9 ? .6 + corners * .03 : 0,
    pit: L < 60 ? .8 + clear * .3 : 0, cho: straight < .75 && corners < 2 ? .5 + soft * .6 + clear * .2 : 0, trm: corners >= 2 && corners <= 4 && L <= 260 ? .5 : 0, rev: straight < .4 && corners < 3 && turnAbs > 4 ? .55 : 0 };
  const kind = Object.keys(ev).reduce((a, b) => ev[b] > ev[a] ? b : a, 'cho'), r = rngAt('piece', Math.round(cx), Math.round(cy), n), p = It.defP(kind, r);
  if (kind === 'cmb') p.freq = clamp(9000 / Math.max(20, L), 60, 1400); if (kind === 'pit') p.semi = Math.round(clamp((60 - L) / 6, -12, 12)) || 7; if (kind === 'dst') p.drive = clamp(corners / 12, .3, 1); if (kind === 'glt') p.crush = clamp(corners / 20, .1, .9);
  if (kind === 'cho') p.depth = clamp(soft + .2, .2, 1); if (kind === 'trm') p.rate = clamp(2 + corners * 1.5, 1.5, 9); if (kind === 'rev') p.size = clamp(L / 500, .2, 1);
  return { kind, p, R: clamp(L / 8, 7, 22), cx, cy, ev }; };
It.pieces = Sf => (Sf.items || []).filter(q => q.piece);
It.fromPiece = (Sf, b) => { const W = Sf.W; if (!b || !W.bodies.has(b.id) || It.pieces(Sf).length >= It.PIECE_MAX) { if (b) Sf.stats.pieceFull = (Sf.stats.pieceFull || 0) + 1; return null; }
  const pts = b.idx.map(i => [W.x[i], W.y[i]]), closed = b.kind === 'blob', mat = b.mat || {}, q = closed ? It.read(pts, mat) : It.readOpen(pts, mat);
  const it = It.make(Sf, q.kind, q.cx, q.cy, { p: q.p, R: q.R, made: 'piece', force: true, held: true }); it.piece = true; it.b = b; it.closed = closed; it.span = Math.max(...pts.map(([x, y]) => Math.hypot(x - q.cx, y - q.cy)));
  Sf.stats.pieces = (Sf.stats.pieces || 0) + 1; return it; };
It.carryable = (Sf, it) => !!(it.b && Sf.W.bodies.has(it.b.id) && !it.b.pins.length && !(it.b.links && it.b.links.length) && (it.span || 0) <= It.PIECE_SPAN && !(Sf.shapeDrag && Sf.shapeDrag.b === it.b) && !(Sf.grabbed && Sf.grabbed.b === it.b));
const pUp = (Sf, x, y) => { const P = Sf.P; if (P && P.cx != null) { const dx = x - P.cx, dy = y - P.cy, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; } return [0, -1]; };
// every frame: a carried piece rides above its carrier, keeping its shape (moved as a whole; velocity damped)
It.carry = Sf => { const W = Sf.W; for (const it of Sf.items || []) { if (!it.piece || !it.holder || !it.b || !W.bodies.has(it.b.id)) continue; const c = it.holder, [ux, uy] = pUp(Sf, c.x, c.y), lift = (RS.Creature ? RS.Creature.radius(c) : 12) + Math.min(it.span || 10, 40) * .7 + 6;
    const [cx, cy] = W.center(it.b), dx = c.x + ux * lift - cx, dy = c.y + uy * lift - cy, k = .35; for (const i of it.b.idx) { W.x[i] += dx * k; W.y[i] += dy * k; W.px[i] = W.x[i] - (W.x[i] - dx * k - W.px[i]) * .6; W.py[i] = W.y[i] - (W.y[i] - dy * k - W.py[i]) * .6; } } };
// ---------------- taking / dropping ----------------
It.modeFor = (Sf, c, it) => { if (it.piece) return c.P.size > 14 ? 'wear' : 'carry';   /* v0.8b1: a piece is carried / worn, never swallowed or nested */ const sw = gene(c, 'hunger') * .6 + gene(c, 'energySrc') * .4, nb = gene(c, 'builder'), big = c.P.size > 14;
  if (it.kind === 'rev' && (it.hollow > .5 || nb > .62)) return 'nest'; if (sw > .72 && it.kind !== 'dst' && it.kind !== 'rev') return 'swallow'; if (nb > .7) return 'nest'; return big ? 'wear' : 'carry'; };
It.take = (Sf, c, it, how) => { if (it.holder === c) return; if (it.holder) It.drop(Sf, it.holder, false); const mode = how || It.modeFor(Sf, c, it);
  if (c.item && c.item !== it) { if (gene(c, 'territory') > .7 && (!c.hoard || c.hoard.length < 2)) { const old = c.item; It.drop(Sf, c, false); old.owner = c.id; (c.hoard = c.hoard || []).push(old.uid); Sf.stats.hoarded = (Sf.stats.hoarded || 0) + 1; } else It.drop(Sf, c, false); }
  c.item = it; it.mode = mode; if (mode === 'nest') { it.holder = null; it.nest = c.id; c.nestItem = it; } else { It.unplace(Sf, it); it.holder = c; it.nest = null; }
  if (it.patch) { const pa = (Sf.patches || []).find(q => q.id === it.patch); if (pa) { pa.vital = clamp(pa.vital + .25, 0, 1); pa.harvested = (pa.harvested || 0) + 1; } it.patch = null; }
  Sf.stats.itemTakes = (Sf.stats.itemTakes || 0) + 1; Sf.fx({ k: 'itemTake', c, col: It.COL[it.kind], dur: 1, item: it.kind }); };
It.drop = (Sf, c, gone) => { const it = c.item; if (!it) return; c.item = null; if (c.nestItem === it) c.nestItem = null; if (it.holder === c) { it.holder = null; if (!gone) It.place(Sf, it, c.x + 18, c.y - 10); } it.mode = null; it.nest = null; It.freeSlot(Sf, c); };
// the item a creature currently plays through (held, or a nest it is sitting by)
/* v0.8b5 E1: an item affects ONLY its carrier (+ ohms fused to it, via the shared insert in decorate). Nest residents no longer play through
   the owner's shell (they still count as protectors in fights); a nest works for its owner only while it is within 120 px. */
It.active = (Sf, c) => { const it = c.item; if (!it) return null;
  if (it.mode !== 'nest') return it; const [x, y] = It.pos(Sf, it); return Math.hypot(x - c.x, y - c.y) < 120 ? it : null; };
// ---------------- effect parameters from item state ----------------
It.params = (Sf, c, it) => { const q = It.params0(Sf, c, it); return RS.FXK ? RS.FXK.apply(Sf, c, it, q.p, q.mix) : q; };   /* v0.8b5: + grid / key / character / close-up adjustments */
It.params0 = (Sf, c, it) => { const p = Object.assign({}, it.p), beat = 60 / ((c.mind && c.mind.bpm) || 90); let mix = clamp(.55 + it.charge * .45, .2, 1) * (it.mode === 'swallow' ? 1 : it.mode === 'nest' ? .8 : .9);
  switch (it.kind) { case 'dly': p.facets = clamp(Math.round(3 + it.mass * 5), 3, 8); p.time = clamp(p.facets * beat / 4, .08, 2.8); p.pp = p.facets % 2; break;   // facets = delay in 16ths (beats/4)
    case 'dst': p.drive = (p.drive || .6) * clamp(it.charge, 0, 1); mix = clamp(it.charge * 1.2, 0, 1); break;   // a cold ember does nothing
    case 'glt': p.rep = clamp(.15 + it.dust * .6 + it.charge * .2, 0, .9); p.crush = clamp((p.crush || .2) + it.dust * .6, 0, .95); p.seg = clamp((p.seg || .12) * (1 - it.charge * .5), .03, .3); break;
    case 'rev': p.size = clamp((p.size || .5) + it.hollow * .5, .1, 1); break; case 'trm': p.rate = (p.rate || 4) * (.5 + it.spin); break; }
  return { p, mix }; };
// slots: the nearest-to-view active creatures get the (capped) insert slots
It.freeSlot = (Sf, c) => { if (c.fxSlot == null) return; const A = RS.audio; if (A && A.send) A.send({ t: 'fx', slot: c.fxSlot, off: true }); if (Sf.fxSlots) Sf.fxSlots[c.fxSlot] = null; c.fxSlot = null; };
It.slots = (Sf) => { Sf.fxSlots = Sf.fxSlots || new Array(It.SLOTS).fill(null); const A = RS.audio, v = Sf.view || {}, vx = v.cx || 0, vy = v.cy || 0;
  const want = Sf.creatures.filter(c => !c.dead && !c.caught && It.active(Sf, c)).sort((a, b) => Math.hypot(a.x - vx, a.y - vy) - Math.hypot(b.x - vx, b.y - vy)).slice(0, It.SLOTS);
  for (let s = 0; s < It.SLOTS; s++) { const c = Sf.fxSlots[s]; if (c && !want.includes(c)) It.freeSlot(Sf, c); }
  for (const c of want) { if (c.fxSlot == null) { const s = Sf.fxSlots.indexOf(null); if (s < 0) continue; Sf.fxSlots[s] = c; c.fxSlot = s; } const it = It.active(Sf, c), q = It.params(Sf, c, it), qp = q.p, t0 = qp.t0, nw = qp.now; delete qp.t0; delete qp.now; const key = it.kind + JSON.stringify(q);   /* v0.8b5: the grid start is resent only when the params change or the carrier's grid drifts > .02 beat */
    if (t0 != null) { qp.t0 = t0; qp.now = nw; } const drift = t0 != null && c._fxT0 != null && qp.per ? Math.abs((((t0 - c._fxT0) / qp.per) % 1 + 1.5) % 1 - .5) * (qp.beats || 1) : 0;
    if (c._fxKey !== key || drift > .02) { c._fxKey = key; c._fxT0 = t0; if (A && A.send) A.send({ t: 'fx', slot: c.fxSlot, kind: it.kind, p: q.p, mix: q.mix }); } }
  Sf.stats.fxSlotsUsed = Sf.fxSlots.filter(Boolean).length; };
// ---------------- the world: seeding items + crystal/glass patches ----------------
It.seed = (Sf) => { Sf.items = Sf.items || []; Sf.patches = Sf.patches || []; const cs = Sf.creatures.filter(c => !c.dead); if (!cs.length) return; const M = Sf.M;
  /* v0.8b5 E3: each patch grows a seeded, culture-weighted kind - or none (~30%: a bare patch that never buds) */
  if (!Sf.patches.length && !Sf.noPatches) { const r = rngAt('patch', Sf.seed || 1); for (let k = 0; k < 2; k++) { const q = Sf.surfArc(cs[0].x, cs[0].y, (k ? 1 : -1) * (260 + r() * 260), 14), x = q[0], rk = rngAt('patchK', Sf.seed || 1, k), kind = rk() < .3 ? null : RS.FXK ? RS.FXK.pick(Sf, rk) : (k ? 'pit' : 'dly'); Sf.patches.push({ id: 'p' + k, kind, x, y: q[1],   /* v0.8a9: radial ground */ res: (M && M.rootHz ? M.rootHz : 220) * Math.pow(2, Math.floor(r() * 12) / 12), growth: 0, vital: .7, harvested: 0 }); } }
  const target = Math.min(It.MAX - 2, 1 + Math.ceil(cs.length / 3)); if (Sf.items.filter(q => q.made === 'world').length >= target || Sf.noSeedItems) return; const n = Sf.itemN || 0, r = rngAt('seed', Sf.seed || 1, n), kind = RS.FXK ? RS.FXK.pick(Sf, r) : It.KINDS[(n * 3 + Math.floor(r() * 8)) % 8],   /* v0.8b5 E3: fewer world items; kinds weighted by the culture blend */ c = cs[n % cs.length], q = Sf.surfArc(c.x, c.y, (r() < .5 ? -1 : 1) * (140 + r() * 220), 22);
  It.make(Sf, kind, q[0], q[1]); };   /* v0.8a9: radial ground */
// ---------------- behaviour (called from Jam.steer each frame; decisions every TICK) ----------------
It.think = (Sf, c, tn) => { if (c._itT != null && tn - c._itT < It.TICK && tn >= c._itT) return; c._itT = tn; const items = Sf.items || [], r = rngAt('think', c.id, Math.floor(tn * 2));
  c.itemGoal = null; if (c.grabbed || c.caught) return;
  // style pollinators travel on their own schedule (loop 8)
  if (It.pollinate(Sf, c, tn)) return;
  // gentle lineages keep away from live embers (loop 4)
  if (It.gentle(c)) for (const it of items) if (it.kind === 'dst' && it.charge > .25 && it.holder !== c) { const [x, y] = It.pos(Sf, it); const d = Math.hypot(x - c.x, y - c.y); if (d < 170) { let gx = c.x + (c.x - x) / (d || 1) * 120, gy = c.y; if (c.home0) { const hx = gx - c.home0[0], hy = gy - c.home0[1], hd = Math.hypot(hx, hy); if (hd > 140) { gx = c.home0[0] + hx / hd * 140; gy = c.home0[1] + hy / hd * 140; } }   /* v0.5c: fleeing a sour item stays inside the home leash */ c.itemGoal = { x: gx, y: gy, stop: 0, flee: true }; return; } }
  // dust eaters go to dirty shards (loop 3)
  if (It.dustEater(c) && (c.energy < .95 || c.stutter < .3)) { const dirty = items.filter(it => it.kind === 'glt' && it.dust > .25).map(it => [it, Math.hypot(It.pos(Sf, it)[0] - c.x, It.pos(Sf, it)[1] - c.y)]).filter(q => q[1] < 500).sort((a, b) => a[1] - b[1])[0];
    if (dirty) { if (dirty[1] < (dirty[0].R || 10) + RS.Creature.radius(c) + 24) { It.eatDust(Sf, c, dirty[0]); } else { const [x, y] = It.pos(Sf, dirty[0]); c.itemGoal = { x, y, stop: (dirty[0].R || 10) + RS.Creature.radius(c) + 12 }; return; } } }
  // learned weather places (loop 5): when the weather that charged something comes again, go to where it happened
  if (c.wxMem) { const w = Sf.weather || {}; for (const k of ['storm', 'wind']) { const m = c.wxMem[k]; if (m && ((k === 'storm' && w.storm) || (k === 'wind' && Math.abs((Sf.wind || [0])[0]) > 120)) && Math.hypot(m.x - c.x, m.y - c.y) > 60 && (h => Math.hypot(m.x - h[0], m.y - h[1]) < RS.Jam.LEASH * 1.3)(c.home0 || c.anchor || [c.x, c.y])) { c.itemGoal = { x: m.x, y: m.y, stop: 40, wx: k }; return; }   /* v0.5b B: a remembered shelter only if it is near home */ } }
  // reverb burrows (loop 6): small high voices move into a hollow shell nest
  if (!c.item && It.smallHigh(c)) for (const it of items) if (it.kind === 'rev' && it.hollow > .5 && it.mode === 'nest') { const [x, y] = It.pos(Sf, it); const d = Math.hypot(x - c.x, y - c.y); if (d < 600) { if (d < 70) { if (!it.residents.includes(c.id) && it.residents.length < 3) { it.residents.push(c.id); Sf.stats.burrowResidents = (Sf.stats.burrowResidents || 0) + 1; Sf.fx({ k: 'burrow', c, col: It.COL.rev, dur: 1.2 }); } return; } c.itemGoal = { x, y, stop: 50 }; return; } }
  if (c.jam && !(c.item == null && c.mind && c.mind.role === 'listen')) { It.jamSocial(Sf, c, r); return; }   // in a jam: share / trade only, no wandering off
  if (c.blowT != null && tn >= c.blowT && tn - c.blowT < 8 && RS.Field && RS.Field.near && RS.Field.near(Sf, c.x, c.y, 'wind', 220)) return;   /* v0.8b5: a blower playing a reed bed / wind rock with its breath stays at it (like a jam: no wandering off for a new world item; the 20 new kinds made this happen) */
  // seek the most attractive perceivable item (free, hoarded far from owner, or held -> steal/fight)
  let best = null, bs = 0; for (const it of items) { if (it === c.item || (it.piece && !it.holder && !It.carryable(Sf, it)) || (it.free && Sf.now() < it.free) || (Sf.grabbed && it.b && Sf.grabbed.b === it.b)) continue;   /* v0.8b5 G1/G2: a taken / knocked item rests a few s */ const [x, y] = It.pos(Sf, it), d = Math.hypot(x - c.x, y - c.y); if (d > 480 || !(RS.Jam.perceives(c, { x, y }, d) || d < 100)) continue;
    if (it.made === 'world' && !it.holder && c.home0 && Math.hypot(x - c.home0[0], y - c.home0[1]) > RS.Jam.LEASH * 1.2) continue;   /* v0.8b5: a loose world item only tempts ohms whose home it is near (the 20 new kinds out-attract dust, and ohms walked 300-450 px from home for them: v05c leash) */
    let a = It.att(Sf, c, it.kind) - d / 1600 - (c.item ? It.att(Sf, c, c.item.kind) + .12 : 0); if (it.kind === 'dst' && it.charge < .1) a -= .3; if (it.residents.length && it.mode === 'nest') a -= .4; if (a > bs) { bs = a; best = it; } }
  if (!best || bs < .42) return; const [x, y] = It.pos(Sf, best), d = Math.hypot(x - c.x, y - c.y);
  const reach = (best.R || 10) + RS.Creature.radius(c) + 14; if (d > reach + 10) { c.itemGoal = { x, y, stop: reach, it: best }; return; }
  const o = best.holder || (best.nest != null ? Sf.creatures.find(q => q.id === best.nest) : null);
  if (!o || o.dead) return It.take(Sf, c, best);
  if (o.id === best.owner && Math.hypot(o.x - c.x, o.y - c.y) > 260) { Sf.stats.steals = (Sf.stats.steals || 0) + 1; Sf.fx({ k: 'itemSteal', c, col: It.COL[best.kind], dur: 1 }); return It.take(Sf, c, best); }
  It.contest(Sf, c, o, best, r); };
It.contest = (Sf, c, o, it, r) => { const ac = It.att(Sf, c, it.kind), ao = It.att(Sf, o, it.kind), comp = gene(c, 'competitive'), bold = gene(c, 'bold');
  if (ac < ao + .15) return; if (o.item && c.item && It.att(Sf, o, c.item.kind) > It.att(Sf, o, o.item.kind)) { const mine = c.item; It.drop(Sf, c, false); It.drop(Sf, o, false); It.take(Sf, c, it); It.take(Sf, o, mine); Sf.stats.trades = (Sf.stats.trades || 0) + 1; Sf.fx({ k: 'itemTrade', a: c, b: o, dur: 1.2 }); return; }
  const watch = o.mind && o.mind.role !== 'listen' && o.mind.role !== 'solo' ? .3 : .7;   // a busy player isn't watching its item
  if (comp < .55 && bold < .55 && r() > watch * .5) { It.take(Sf, c, it); Sf.stats.steals = (Sf.stats.steals || 0) + 1; Sf.fx({ k: 'itemSteal', c, col: It.COL[it.kind], dur: 1 }); return; }
  if (comp > .45 || bold > .6) { const def = (o.P.size || 10) * (.5 + o.energy) * (.5 + gene(o, 'competitive')) + It.protectors(Sf, o, it) * 8, atk = (c.P.size || 10) * (.5 + c.energy) * (.5 + comp);
    Sf.stats.itemFights = (Sf.stats.itemFights || 0) + 1; Sf.fx({ k: 'duelStart', a: c, b: o, dur: 1.2 }); const [win, lose] = atk > def ? [c, o] : [o, c]; win.energy = clamp(win.energy - .03, 0, 1); lose.energy = clamp(lose.energy - .08, 0, 1);
    if (win === c) It.take(Sf, c, it); It.learn(Sf, lose, it.kind, -.04); It.learn(Sf, win, it.kind, .02); lose.state = 'flee'; lose.fleeFrom = [win.x, win.y]; lose.fleeT = 1.2; } };
It.protectors = (Sf, o, it) => it.kind === 'rev' ? it.residents.length : 0;
It.jamSocial = (Sf, c, r) => { const j = c.jam; if (!c.item || c.item.mode === 'nest' || gene(c, 'empathy') < .55) return; for (const o of j.members) { if (o === c || o.item) continue; if (It.att(Sf, o, c.item.kind) > It.att(Sf, c, c.item.kind) + .12) { const it = c.item; It.drop(Sf, c, true); It.take(Sf, o, it, it.mode || 'carry'); Sf.stats.shares = (Sf.stats.shares || 0) + 1; Sf.fx({ k: 'itemShare', a: c, b: o, dur: 1.2 }); It.learn(Sf, o, it.kind, .03); return; } } };
// ---------------- per-frame world tick: state changes from environment + loops ----------------
It.tick = (Sf, dt) => { It.carry(Sf); const items0 = Sf.items || []; if (items0.some(q => q.piece && !(q.b && Sf.W.bodies.has(q.b.id)))) for (const q of items0.filter(q => q.piece && !(q.b && Sf.W.bodies.has(q.b.id)))) { if (q.holder) It.drop(Sf, q.holder, true); Sf.items = (Sf.items || []).filter(z => z !== q); }   /* v0.8b1: an undone / removed piece frees its carrier */
  const items = Sf.items || [], tn = Sf.now(), w = Sf.weather || {}, wind = Math.abs((Sf.wind || [0])[0]);
  if (Sf._itT != null && tn - Sf._itT < It.TICK && tn >= Sf._itT) return; const step = Sf._itT == null || tn < Sf._itT ? It.TICK : tn - Sf._itT; Sf._itT = tn;
  if (!Sf._seedT || tn - Sf._seedT > 15 || tn < Sf._seedT) { Sf._seedT = tn; It.seed(Sf); }
  for (const it of items) { const [x, y] = It.pos(Sf, it);
    if (it.kind === 'glt') it.dust = clamp(it.dust + step * (.006 + wind / 40000), 0, 1);   // shards gather noise dust (faster in wind)
    if (it.kind === 'dst') it.charge = clamp(it.charge - step * .012, 0, 1);                 // embers fade unless played loud nearby
    if (it.kind === 'trm') it.spin = clamp(it.spin + (wind / 300 - it.spin) * step * .5, 0, 1.6);   // wind spins seed pods
    if (it.kind === 'glt' && it.charge > 0) it.charge = clamp(it.charge - step * .004, 0, 1);
    if (it.holder && !it.piece) it.wear = clamp(it.wear + step * (it.mode === 'swallow' ? .0008 : .0003), 0, 1);
    if (it.kind === 'rev' && it.mode === 'nest') { const ow = Sf.creatures.find(q => q.id === it.nest); if (ow) it.residents = it.residents.filter(id => { const q = Sf.creatures.find(z => z.id === id); return q && !q.dead && Math.hypot(q.x - x, q.y - y) < 200; }); }
    if (it.wear >= 1) { Sf.fx({ k: 'itemBreak', x, y, col: It.COL[it.kind], dur: 1, force: true }); if (it.holder) It.learn(Sf, it.holder, it.kind, -.02); It.remove(Sf, it); if (it.kind !== 'glt') { const q = Sf.surfAt(x, y, 16); It.make(Sf, 'glt', q[0], q[1], { dust: .5, force: true }); } break; } }
  // rain damps embers (loop 5)
  if (w.rain > 0) for (const it of items) if (it.kind === 'dst' && !(it.holder && it.mode === 'swallow')) { const before = it.charge; it.charge = clamp(it.charge - step * .05, 0, 1); if (before > .2 && it.charge <= .2) Sf.fx({ k: 'emberDie', x: It.pos(Sf, it)[0], y: It.pos(Sf, it)[1], dur: 1, col: It.COL.dst }); }
  // lightning: during storms, deterministic strikes; shards near a strike are charged; watchers remember the place (loop 5)
  if (w.storm) { const k = Math.floor(tn / 3.5); if (k !== Sf._boltK) { Sf._boltK = k; const r = rngAt('bolt', Sf.seed || 1, k), pool = items.filter(it => it.kind === 'glt'), tgt = pool.length && r() < .7 ? pool[Math.floor(r() * pool.length)] : null, v = Sf.view || {}, tp = tgt ? It.pos(Sf, tgt) : null, bq = tp ? Sf.surfArc(tp[0], tp[1], (r() - .5) * 60) : Sf.surfAt((v.x0 || -300) + r() * ((v.x1 || 300) - (v.x0 || -300)), v.cy); It.lightning(Sf, bq[0], bq[1]);   /* v0.8a9: radial ground */ } }
  if (wind > 120) for (const it of items) if (it.kind === 'trm' && it.spin > .6) It.witness(Sf, it, 'wind');
  // crystal / glass patches (loop 2): over-full patches lose vitality unless harvested; dormant patches stop growing
  for (const pa of Sf.patches || []) { const free = items.filter(it => it.patch === pa.id).length; if (free >= 2) pa.vital = clamp(pa.vital - step * .01, 0, 1); }
  It.slots(Sf); };
It.lightning = (Sf, x, y) => { Sf.stats.bolts = (Sf.stats.bolts || 0) + 1; for (const it of Sf.items || []) { if (it.kind !== 'glt') continue; const [ix, iy] = It.pos(Sf, it); if (Math.hypot(ix - x, iy - y) < 130) { it.charge = clamp(it.charge + .5, 0, 1); Sf.stats.shardCharges = (Sf.stats.shardCharges || 0) + 1; Sf.fx({ k: 'charge', x: ix, y: iy, col: It.COL.glt, dur: .8 }); It.witness(Sf, it, 'storm'); } } };
It.witness = (Sf, it, k) => { const [x, y] = It.pos(Sf, it); for (const c of Sf.creatures) { if (c.dead || !c.P) continue; const d = Math.hypot(c.x - x, c.y - y); if (d > 520 || !RS.Jam.perceives(c, { x, y }, d)) continue; const want = k === 'storm' ? It.att(Sf, c, 'glt') : It.att(Sf, c, 'trm'); if (want < .5 || gene(c, 'memory') < .35) continue; c.wxMem = c.wxMem || {}; if (!c.wxMem[k]) Sf.stats.wxLearned = (Sf.stats.wxLearned || 0) + 1; c.wxMem[k] = { x: Math.round(x), y: Math.round(y) }; } };
It.dustEater = c => gene(c, 'hunger') * .45 + gene(c, 'aGlt') * .35 + gene(c, 'energySrc') * .2 > .58;
It.eatDust = (Sf, c, it) => { const take = Math.min(.25, it.dust); if (take < .05) return; it.dust -= take; It.gain(Sf, c, take * .3, 'dust'); c.stutter = clamp((c.stutter || 0) + take * .8, 0, .8); Sf.stats.dustEaten = (Sf.stats.dustEaten || 0) + take; Sf.fx({ k: 'dustEat', c, col: It.COL.glt, dur: .8 }); It.learn(Sf, c, 'glt', .02); };
It.smallHigh = c => (c.g[0] || .5) < .3 && c.mind && ((c.mind.regOct + c.mind.oct) >= 1 || (c.g[123] || 0) > .7);
It.lowDrone = c => c.mind && ((c.P.inst && c.P.inst.droneK > .5) || (c.mind.regOct + c.mind.oct) <= -1 || c.mind.role === 'drone' || c.mind.role === 'bass');
// ---------------- sound hooks (from Mind.play): the symbiosis loops that run on notes ----------------
// returns an instrument override (sound borrowing) and the fx slot; called before the note is sent
It.fusedSlot = (Sf, c) => { const cl = c.cluster; if (!cl || !cl.members) return null; for (const m of cl.members) if (m !== c && !m.dead && m.fxSlot != null && It.active(Sf, m)) return m; return null; };   /* v0.8b5 E1: fused ohms share the carrier's insert */
It.decorate = (Sf, c, spec, o) => { let fc = c.fxSlot != null ? c : null; if (!fc && !o.perc) fc = It.fusedSlot(Sf, c); if (fc) { spec.fx = fc.fxSlot; const it = It.active(Sf, fc), A = RS.audio; if (it && RS.FXK && (it.kind === 'hrm' || it.kind === 'gld') && spec.f0 > 0 && fc === c) { const set = RS.FXK.noteSet(Sf, fc, it, spec.f0); if (set && A && A.send) A.send({ t: 'fx', slot: fc.fxSlot, set }); } } if ((c.grit || 0) > .05 && spec.inst && !o.perc) { const gk = Math.round(c.grit * 10); if (!c._gritP || c._gritP.k !== gk || c._gritP.base !== spec.inst) c._gritP = { k: gk, base: spec.inst, P: Object.assign({}, spec.inst, { sat: Math.min(1, (spec.inst.sat || 0) + gk / 10 * .8), _kit: null }) }; spec.inst = c._gritP.P; } const b = c.borrow; if (b && b.host && !b.host.dead && Sf.now() < b.until && !o.perc) { spec.inst = b.host.P.inst; spec.borrowed = true; } else if (b && Sf.now() >= b.until) { c.borrow = null; c.borrowCool = Sf.now() + 20; } if (c.P.inst && c.P.inst.glT && c.lastHz && !o.perc && Math.abs(Math.log2(spec.f0 / c.lastHz)) < 1) spec.from = c.lastHz; };
It.onNote = (Sf, c, rec, spec, when) => { const items = Sf.items || [], tn = Sf.now(), vel = rec.vel || .6, loudN = vel * (.4 + gene(c, 'loudness'));
  // (4) ember keepers: loud playing near an ember keeps it alive and gives the player grit
  if (loudN > .45) for (const it of items) if (it.kind === 'dst' && it.made !== 'player') { const hc = it.holder; const mine = hc && (hc === c || (c.cluster && hc.cluster === c.cluster));   /* v0.8b5 E1: grit only from an ember c carries (or a fused partner carries); a loose ember is still fed (charge) */   /* v0.8 (Wilbow 3:41): a PLAYER-made ember never adds permanent grit (items only modulate); world embers keep the existing grit loop (not removed yet) */ const [x, y] = It.pos(Sf, it); if (Math.hypot(x - c.x, y - c.y) < 180) { it.charge = clamp(it.charge + .05 * loudN, 0, 1); if (mine) c.grit = clamp((c.grit || 0) + .006, 0, .8); Sf.stats.emberFed = (Sf.stats.emberFed || 0) + 1; } }
  // (2) crystal farming: singing a patch's resonant pitch (any octave) grows it; a grown patch buds a crystal / lens item
  if (!rec.perc) for (const pa of Sf.patches || []) { if (!pa.kind || Math.hypot(pa.x - c.x, pa.y - c.y) > 240 || pa.vital <= 0) continue;   /* v0.8b5 E3: a bare patch never buds */ const cents = 1200 * Math.log2(rec.f / pa.res), off = Math.abs(((cents % 1200) + 1800) % 1200 - 600); if (off < 45) { pa.growth += .16 * vel * (.4 + pa.vital);   /* v0.3.1: lone ohms sing less (quiet hum / one sound source), so each resonant note counts double */ Sf.stats.patchSung = (Sf.stats.patchSung || 0) + 1;
      if (pa.growth >= 1) { pa.growth = 0; if (items.filter(it => it.patch === pa.id).length < 2) { const it = It.make(Sf, pa.kind, pa.x + (items.length % 3 - 1) * 22, pa.y - 8, { patch: pa.id, mass: .2, force: true }); if (it) { Sf.stats.crystalsGrown = (Sf.stats.crystalsGrown || 0) + 1; Sf.fx({ k: 'crystalGrow', x: pa.x, y: pa.y, col: It.COL[pa.kind], dur: 1.2 }); } } } } }
  // (6) reverb burrows: a low / drone voice playing in its shell nest hollows it out
  if (It.lowDrone(c)) for (const it of items) if (it.kind === 'rev' && (it.nest === c.id || it.holder === c)) { const before = it.hollow; it.hollow = clamp(it.hollow + .04 * Math.max(.2, rec.dur || .3), 0, 1);   /* v0.3.1: x2, fewer notes from a lone ohm */ if (before <= .5 && it.hollow > .5) { it.mode = it.mode || 'nest'; Sf.fx({ k: 'burrow', c, col: It.COL.rev, dur: 1.4 }); Sf.stats.burrows = (Sf.stats.burrows || 0) + 1; } }
  // (1) echo feeding - v0.8b5 E1: only between FUSED ohms (the quiet one already plays through the carrier's shared echo insert, so no
  //     replayed note any more); the quiet one gains energy, the crystal gains material. Non-fused neighbours are no longer echoed.
  if (gene(c, 'loudness') < .42 && !rec.echo && c.cluster) for (const o of c.cluster.members) { if (o === c || o.dead || !o.item || o.item.kind !== 'dly' || o.item.mode === 'nest' || !o.mind) continue;
      const k = .3 + gene(o, 'mimic') * .7; if ((o._echoT || 0) > when - 60 / o.mind.bpm / 2 / k) continue; o._echoT = when; const it = o.item;
      It.gain(Sf, c, .006 * k, 'echoFed'); it.mass = clamp(it.mass + .004, 0, 1.2); Sf.stats.echoFeeds = (Sf.stats.echoFeeds || 0) + 1; if ((Sf.stats.echoFeeds % 24) === 1) Sf.fx({ k: 'echoFeed', a: o, b: c, col: It.COL.dly, dur: 1 }); break; }
  // (7) sound borrowing: a strongly mimicking creature takes a jam/conversation partner's timbre for a few bars; rhythmic hosts profit, weak ones are drained
  if (!c.borrow && gene(c, 'mimic') > .68 && (!c.borrowCool || tn > c.borrowCool) && !rec.perc) { const host = (c.jam ? c.jam.members.filter(q => q !== c) : c.partner ? [c.partner] : []).sort((a, b) => b.id < a.id ? -1 : 1)[0];
    if (host && host.P.inst) { c.borrow = { host, until: tn + 4 * RS.Mind.barLen(c.mind) / (c.mind.bpm / 60 * 4) }; Sf.stats.borrows = (Sf.stats.borrows || 0) + 1; Sf.fx({ k: 'borrow', a: c, b: host, col: host.col, dur: 1.2 }); } }
  if (spec.borrowed && c.borrow) { const h = c.borrow.host, rh = gene(h, 'rhythm'); It.gain(Sf, h, rh > .55 ? .004 : -.006, 'borrowed'); Sf.stats[rh > .55 ? 'borrowBoost' : 'borrowDrain'] = (Sf.stats[rh > .55 ? 'borrowBoost' : 'borrowDrain'] || 0) + 1; }
  // (3) glitch cleaners: a dust-fed creature's voice stutters (ratchets)
  if ((c.stutter || 0) > .15 && !rec.echo) { const r = rngAt('stut', c.id, Math.round(when * 100)); if (r() < c.stutter * .6) { const n = 1 + (r() < .4 ? 1 : 0), st = 60 / ((c.mind && c.mind.bpm) || 90) / 8; for (let k = 1; k <= n; k++) Sf.play(Object.assign({}, spec, { vel: (spec.vel || .6) * (.7 - k * .15), dur: Math.min(spec.dur || .2, st * .8), echo: true }), when + st * k, c.x, c.y); Sf.stats.stutters = (Sf.stats.stutters || 0) + 1; } }
  // (2) energy from sound: playing in a coherent jam feeds a little (the base symbiosis hook)
  if (c.jam && c.jam.coh > RS.Jam.TH) It.gain(Sf, c, .0008, 'jam');
  for (const h of It.hooks.note) h(Sf, c, rec, spec); };
It.hooks = { note: [], tick: [] };
// energy from sound interactions: one ledger per creature (why -> net), the hook symbiosis loops use
It.gain = (Sf, c, d, why) => { c.energy = clamp(c.energy + d, 0, 1); const L = c.eLedger = c.eLedger || {}; L[why] = +((L[why] || 0) + d).toFixed(5); const S = Sf.stats.energy = Sf.stats.energy || {}; S[why] = +((S[why] || 0) + d).toFixed(5); };   // further symbiosis loops plug in here
// ---------------- (8) style pollinators ----------------
It.pollinator = c => gene(c, 'wander') > .66 && gene(c, 'curiosity') > .45;
It.pollinate = (Sf, c, tn) => { if (!It.pollinator(c) || !c.mind) return false; const jams = Sf.jams || [], P = c.poll = c.poll || { st: 'seek', t: tn, from: null };
  if (P.st === 'seek' && c.jam) return false;   /* v0.4a: a pollinator that is a founding member of a jam stays with it (only visits end in leaving) */
  if (P.st === 'seek') { const j = jams.filter(j => j.id !== P.from && !j.members.includes(c) && !(P.fx != null && Math.hypot(j.x - P.fx, j.y - P.fy) < 300)).map(j => [j, Math.hypot(j.x - c.x, j.y - c.y)]).sort((a, b) => a[1] - b[1])[0]; if (!j) { if (c.pollen && P.fx != null) { const o = Sf.creatures.filter(q => q !== c && !q.dead && q.mind && Math.hypot(q.x - P.fx, q.y - P.fy) > 300).map(q => [q, Math.hypot(q.x - c.x, q.y - c.y)]).sort((a, b) => a[1] - b[1])[0];   /* no other jam: bring it to the nearest group elsewhere */
      if (o) { if (o[1] < RS.Jam.CONV * .7) { It.deliver(Sf, c, { members: [o[0]], id: 'solo' }); P.st = 'seek'; } else c.itemGoal = { x: o[0].x, y: o[0].y, stop: RS.Jam.CONV * .5, travel: true }; return true; } } return false; }
    if (j[1] < RS.Jam.CONV) { if (c.pollen) It.deliver(Sf, c, j[0]); P.st = 'visit'; P.t = tn; P.j = j[0].id; return false; } c.itemGoal = { x: j[0].x, y: j[0].y, stop: RS.Jam.CONV * .6, travel: true }; return true; }
  if (P.st === 'visit') { const j = jams.find(q => q.id === P.j); if (!j || tn - P.t > 8 * RS.Mind.barLen(c.mind) / (c.mind.bpm / 60 * 4)) { if (j) { It.collect(Sf, c, j); P.fx = j.x; P.fy = j.y; } if (c.jam) RS.Jam.leave(Sf, c.jam, c); c.avoidJam = P.j; P.from = P.j; P.st = 'seek'; P.t = tn; } return false; }
  return false; };
It.collect = (Sf, c, j) => { const L = j.leader && j.leader.mind; if (!L) return; c.pollen = { motif: (L.motif || []).slice(0, 4), swing: L.swing, sys: L.sysBase.i, meter: L.meter, from: j.id }; const it = (Sf.items || []).find(q => q.holder && j.members.includes(q.holder) && q.holder !== c && It.att(Sf, c, q.kind) > .5); if (it && !c.item && gene(c, 'competitive') < .6) { const h = it.holder; It.drop(Sf, h, true); It.take(Sf, c, it, 'carry'); } Sf.stats.pollenCollected = (Sf.stats.pollenCollected || 0) + 1; };
It.deliver = (Sf, c, j) => { const pl = c.pollen; c.pollen = null; const rx = j.members.filter(m => m.mind && m !== c); if (!rx.length) return; const m = rx[0].mind; m.swing = m.swing + (pl.swing - m.swing) * .5; m.mem = m.mem || []; if (pl.motif && pl.motif.length) { m.mem.push(pl.motif.slice()); rx[0].pollinatedBy = c.id; }
  if (c.item && c.item.mode !== 'nest') { const it = c.item; It.drop(Sf, c, true); const tgt = rx.find(q => !q.item) || null; if (tgt) It.take(Sf, tgt, it, 'carry'); else It.place(Sf, it, c.x, c.y - 12); }
  Sf.stats.pollinated = (Sf.stats.pollinated || 0) + 1; Sf.fx({ k: 'pollinate', a: c, b: rx[0], col: c.col, dur: 1.2 }); };
// ---------------- persistence ----------------
It.packOne = (Sf, it) => { const [x, y] = It.pos(Sf, it); return { uid: it.uid, kind: it.kind, p: it.p, charge: +it.charge.toFixed(3), wear: +it.wear.toFixed(3), dust: +it.dust.toFixed(3), mass: +it.mass.toFixed(3), hollow: +it.hollow.toFixed(3), x: Math.round(x), y: Math.round(y), R: it.R, holder: it.holder ? it.holder.id : null, nest: it.nest, mode: it.mode, residents: it.residents, owner: it.owner || null, patch: it.patch, made: it.made, adj: it.adj || undefined, ch: it.ch || undefined }; };   /* v0.8b5: close-up adjustments + character */
It.pack = Sf => ({ items: (Sf.items || []).filter(it => !it.piece).map(it => It.packOne(Sf, it)),
  patches: Sf.patches || [], species: (Sf.species || []).map(s => ({ id: s.id, cen: Array.from(s.cen, v => +v.toFixed(3)) })), spRel: Sf.spRel || {}, n: Sf.itemN || 0 });
It.unpack = (Sf, d) => { if (!d) return; Sf.items = []; Sf.patches = d.patches || []; Sf.species = (d.species || []).map(s => ({ id: s.id, cen: s.cen, n: 0 })); Sf.spRel = d.spRel || {}; Sf.itemN = d.n || 0; Sf.itemPend = {};
  for (const q of d.items || []) It.unpackOne(Sf, q); };
It.unpackOne = (Sf, q) => { Sf.itemPend = Sf.itemPend || {}; const it = It.make(Sf, q.kind, q.x, q.y, Object.assign({}, q, { force: true, held: !!q.holder })); if (!it) return null; it.residents = q.residents || []; it.owner = q.owner; it.mode = q.mode; it.nest = q.nest; if (q.holder) Sf.itemPend[q.holder] = it; return it; };
It.attachPending = (Sf, c) => { const it = Sf.itemPend && Sf.itemPend[c.id]; if (it) { delete Sf.itemPend[c.id]; it.holder = c; c.item = it; } for (const it2 of Sf.items || []) if (it2.nest === c.id) { c.item = c.item || it2; c.nestItem = it2; } };
})(typeof window !== 'undefined' ? window : globalThis);
