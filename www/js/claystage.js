// v0.8b2 R7 "clay timbre stage" (V08_SPEC R7.0-R7.10, R7.14-R7.15). Wraps mold.js: every section 4 clay gesture keeps its start
// condition and its genome edit; R7 adds what the touch MEANS for the sound. Only the clay being shaped is simulated (one at a time),
// hatched ohms keep a few numbers (sec, lumps) and cost nothing extra. RS.ClayStage.on = false (or Sf.clayStage = false) = v0.8b1 clay.
(function (G) { 'use strict';
const RS = G.RS, Mo = RS.Mold; if (!Mo || !Mo.SB) return; const SB = Mo.SB, TAU = Math.PI * 2, cl = (v, a = 0, b = .9999) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a) * u;
const CS = RS.ClayStage = { on: true, SEC_CAP: 5, FIRE_HOLD: .5, FIRE_T: 2.4, PRESS_MIN: .2, STILL: 8, TWO_TAP: 250, SPLIT_R: 1.6, PLASTIC: .85, PLAST_CAP: .6, CAP_OUT: 1.4, TAIL_T: .6, TAIL_V: 2.2,
  /* R7.1: ways of playing (excitation families), each dealt across every engine that fits it; never a real-instrument class (2:23 PM) */
  FAMILY: { struck: ['mallet', 'struck', 'bell', 'glass', 'drum:tom', 'drum:kit', 'drum:snare', 'grit'], plucked: ['pluck', 'harp', 'foldlead', 'mallet'], bowed: ['bowed', 'drone', 'movepad', 'organ', 'shimmer', 'pad'],
    blown: ['reed', 'pipe', 'wind', 'grain', 'lead'], voiced: ['singer', 'choir', 'foldlead'] },
  ROLE_COL: { bass: [120, 150, 255], melody: [255, 210, 120], comp: [150, 240, 190], pulse: [255, 140, 150] },
  attackHook: null, POKE_MIX: .6, DENT: .45, PT0: .35, PT1: .5, TL0: .45, TL1: .65 };   /* v0.8b3 sizes (b2: dent .3, point .3+.4a, tail .35+.5L): every formed shape must be visible */   /* R7.3 (stated to Wilbow ~2:28 PM MDT, no objection): attack = POKE SPEED. A quick jab = a sharp start, a slow press = a soft swell. The hook stays replaceable (k, g) => void; default = CS.pokeAttack (set below) */
SB.N = 48;   /* R7.0: a finer soft body (was 28): small dents, sharp points, thin tails */
const live = Sf => CS.on && !(Sf && Sf.clayStage === false);
const st = k => k.cs || (k.cs = { fam: null, plx: null, ply: null, points: 0, lumps: [], fire: 0, firing: false, frozen: 0, vib: 0, tail: 0, dent: 0, lean: null, hint: null, press: null, two: null });
const I = () => RS.IG, R = k => Mo.radius(k);
CS.state = st;
CS.dents = (k, th, dep) => { const c = st(k); (c.dentL || (c.dentL = [])).push({ th: +th.toFixed(3), d: +dep.toFixed(2) }); if (c.dentL.length > 8) c.dentL.shift(); };   /* v0.8b3: where the dents are (the look shades them) */
// ---- R7.0 plastic clay: the rest outline = genome outline + a kept offset, so shapes STAY ----
const rest0 = SB.rest; SB.rest = k => { const r = rest0(k), c = k.cs; if (c && c.plx && c.plx.length === r.rx.length) for (let i = 0; i < r.rx.length; i++) { r.rx[i] += c.plx[i]; r.ry[i] += c.ply[i]; } return r; };
CS.keep = (k, bx, by, amt = CS.PLASTIC) => { const c = st(k), n = bx.length, g0 = rest0(k), cap = R(k) * CS.PLAST_CAP; if (!c.plx || c.plx.length !== n) { c.plx = new Float32Array(n); c.ply = new Float32Array(n); }
  { const rf = SB.rest(k); let sxy = 0, srr = 0; for (let i = 0; i < n; i++) { sxy += bx[i] * rf.rx[i] + by[i] * rf.ry[i]; srr += rf.rx[i] * rf.rx[i] + rf.ry[i] * rf.ry[i]; } const sc = cl(sxy / Math.max(1e-6, srr), .5, 1.2); if (sc < .98) { bx = Float32Array.from(bx, v => v / sc); by = Float32Array.from(by, v => v / sc); } }   /* v0.8b3: the newborn swell (slow settle) is not a shape the finger made */
  const nx = new Float32Array(n), ny = new Float32Array(n); for (let i = 0; i < n; i++) { nx[i] = lerp(c.plx[i], bx[i] - g0.rx[i], amt); ny[i] = lerp(c.ply[i], by[i] - g0.ry[i], amt); }
  /* v0.8b3: smooth only what THIS touch added (the old full smoothing blurred earlier points / tails away on every edge push); outward offsets may reach CAP_OUT */
  const ox = Float32Array.from(c.plx), oy = Float32Array.from(c.ply); for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, b = (i + 1) % n, dx = ((nx[a] - ox[a]) + 2 * (nx[i] - ox[i]) + (nx[b] - ox[b])) / 4, dy = ((ny[a] - oy[a]) + 2 * (ny[i] - oy[i]) + (ny[b] - oy[b])) / 4; let x = ox[i] + dx, y = oy[i] + dy; const th = i / n * TAU, outw = x * Math.cos(th) + y * Math.sin(th) > 0, cp = outw ? R(k) * CS.CAP_OUT : cap, m = Math.hypot(x, y); if (m > cp) { x *= cp / m; y *= cp / m; } c.plx[i] = x; c.ply[i] = y; }
  SB.reform(k); };
// a lasting bump / hollow at angle th (out > 0 = out), width wid radians: used by tails, dents, points and splits
CS.mark = (k, th, out, wid = .35) => { const b = k.sb || SB.make(k), n = b.n, c = st(k); if (!c.plx || c.plx.length !== n) { c.plx = new Float32Array(n); c.ply = new Float32Array(n); } const cap = R(k) * (out > 0 ? CS.CAP_OUT : CS.PLAST_CAP);   /* v0.8b3: was 1.1 */
  for (let i = 0; i < n; i++) { const a = i / n * TAU, d = Math.abs(((a - th + Math.PI * 3) % TAU) - Math.PI), w = Math.exp(-((d / wid) ** 2)); if (w < .01) continue; c.plx[i] += Math.cos(a) * out * w; c.ply[i] += Math.sin(a) * out * w; const m = Math.hypot(c.plx[i], c.ply[i]); if (m > cap) { c.plx[i] *= cap / m; c.ply[i] *= cap / m; } }
  SB.reform(k); };
// ---- R7.2 one brightness target from edge sharpness; corners + pulled points = drive ----
CS.sharp = k => { const b = k.sb; if (!b) return { sharp: 0, corners: 0 }; const n = b.n, x = b.rx, y = b.ry; let mx = 0, sum = 0, corners = 0; for (let i = 0; i < n; i++) { const a = (i + n - 1) % n, c = (i + 1) % n, a1 = Math.atan2(y[i] - y[a], x[i] - x[a]), a2 = Math.atan2(y[c] - y[i], x[c] - x[i]); let d = Math.abs(((a2 - a1 + Math.PI * 3) % TAU) - Math.PI) - TAU / n; d = Math.max(0, d); sum += d; mx = Math.max(mx, d); if (d > .55) corners++; }
  return { sharp: cl(mx / 1.4 * .7 + sum / n / .25 * .3, 0, 1), corners }; };
CS.shapeOf = k => { const b = k.sb; if (!b) return { w: 1, h: 1, asp: 1 }; let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (let i = 0; i < b.n; i++) { x0 = Math.min(x0, b.rx[i]); x1 = Math.max(x1, b.rx[i]); y0 = Math.min(y0, b.ry[i]); y1 = Math.max(y1, b.ry[i]); } const w = x1 - x0, h = y1 - y0; return { w, h, asp: w / Math.max(1, h) }; };
// ---- R7.6 the shape leans the role (a lean, never a lock); a lean toward a role missing nearby, with a colour hint ----
CS.roleOf = k => { const s = CS.shapeOf(k), sh = CS.sharp(k), c = st(k); if (c.points >= 2 || sh.corners >= 3) return 'pulse'; if (s.asp > 1.3 || k.g[0] > .8) return 'bass'; if (s.asp < 1 / 1.3) return 'melody'; if (sh.sharp < .25) return 'comp'; return null; };
CS.missing = (Sf, k) => { const have = new Set(), seen = new Set(); for (const c of Sf.creatures || []) { if (c.dead || !c.mind || !c.mind.E || Math.hypot(c.x - k.x, c.y - k.y) > 900) continue; seen.add(c.mind.E); const r = c.mind.role || ''; have.add(r.startsWith('pulse') ? 'pulse' : /^(comp|harmony|pad)$/.test(r) ? 'comp' : r); } if (!seen.size) return null; return ['bass', 'melody', 'comp', 'pulse'].find(r => !have.has(r)) || null; };
const leanTo = (g, role, w) => { const i = I(); if (role === 'bass') { g[123] = cl(g[123] - .14 * w); } else if (role === 'melody') g[123] = cl(g[123] + .14 * w); else if (role === 'comp') { g[i.att] = cl(g[i.att] + .12 * w); g[i.sus] = cl(g[i.sus] + .12 * w); g[i.rel] = cl(g[i.rel] + .1 * w); } else if (role === 'pulse') { g[i.transient] = cl(g[i.transient] + .15 * w); g[i.dec] = cl(g[i.dec] - .1 * w); } };
// ---- applied after every shaping touch, before the genome is snapped and expressed ----
CS.post = (Sf, k, what) => { const g = k.g, i = I(), c = st(k), sh = CS.sharp(k);
  g[i.cut] = cl(lerp(g[i.cut], .18 + .78 * sh.sharp, .6));   /* one brightness target (rounder = darker, sharper = brighter) */
  const drive = cl(.12 * c.points + .06 * sh.corners, 0, .8); if (drive > 0) { g[i.sat] = Math.max(g[i.sat], cl(.25 + drive)); g[i.fold] = Math.max(g[i.fold], cl(drive * .8)); }
  const role = CS.roleOf(k); if (role && role !== c.lean) { leanTo(g, role, 1); c.lean = role; }
  g[123] = Math.min(g[123], cl(.3 + .7 * g[0]));   /* R7.6: the body size caps the pitch range (a tiny clay can't span a tuba's range) */
  const miss = Sf && CS.missing(Sf, k); if (miss && miss !== c.hint) { leanTo(g, miss, .5); c.hint = miss; } else if (!miss) c.hint = null;
  if (c.sec) { g[i.detune] = Math.max(g[i.detune], cl(.38 + .07 * c.lumps.length)); g[i.width] = Math.max(g[i.width], cl(.45 + .1 * c.lumps.length)); }
  if (typeof CS.attackHook === 'function') CS.attackHook(k, g); };
// R7.3 poke speed -> attack: c.poke in [0, 1] (1 = a quick jab) is set by the latest touch; the attack gene is pulled toward
// .04 (about 1.3 ms) for a jab and .80 (about 250 ms) for a slow press, POKE_MIX of the way (so the role lean still shows a little)
CS.pokeAttack = (k, g) => { const c = k.cs; if (!c || c.poke == null) return; const i = I(); g[i.att] = cl(lerp(g[i.att], .04 + .76 * (1 - c.poke), CS.POKE_MIX)); };
CS.attackHook = CS.pokeAttack;
CS.pokeOf = (Rk, len, T, still) => T == null ? null : cl((len / Math.max(.03, T) / Math.max(1, Rk) - 1) / 5) * (1 - cl(still / CS.FIRE_HOLD));
// ---- R7.1 the first touch picks the way of playing ----
CS.pick = (Sf, k, fam) => { const c = st(k); if (c.fam || k.steps > 0 || !CS.FAMILY[fam]) return null; const L = CS.FAMILY[fam], r = RS.rng(RS.Genome.hash(k.g) ^ 0x7e11), id = L[Math.floor(r() * L.length)];
  c.fam = fam; RS.Genome.setVoice(k.g, id, r); Sf.stats.clayFamily = (Sf.stats.clayFamily || 0) + 1; return id; };
// ---- wrap the mold gestures ----
const express0 = Mo.express; Mo.express = (Sf, k, ...a) => { const r = express0(Sf, k, ...a); if (live(Sf) && k && k.g) { const cap = cl(.3 + .7 * k.g[0]); if (k.g[123] > cap + 1e-6) { k.g[123] = cap; return express0(Sf, k, ...a); } } return r; };   /* R7.6 cap holds after the shape re-reads the size */
const touch0 = Mo.touch; Mo.touch = (Sf, k, what, quiet) => { if (live(Sf)) CS.post(Sf, k, what); return touch0(Sf, k, what, quiet); };
const tap0 = Mo.tap; Mo.tap = (Sf, k, tms, x, y) => { if (live(Sf)) st(k).poke = .9;   /* R7.3: a tap is a quick jab */ if (live(Sf) && CS.pick(Sf, k, 'struck')) { Mo.express(Sf, k); k.log.push('family:struck'); } const r = tap0(Sf, k, tms, x, y); if (live(Sf) && Sf.clay === k && typeof CS.attackHook === 'function') { CS.attackHook(k, k.g); Mo.express(Sf, k); } return r; };
const revs = (pts, ax, hy) => { let hi = pts[0][ax], lo = hi, dir = 0, n = 0; for (const p of pts) { const v = p[ax]; hi = Math.max(hi, v); lo = Math.min(lo, v); if (dir >= 0 && v < hi - hy) { if (dir > 0) n++; dir = -1; hi = lo = v; } else if (dir <= 0 && v > lo + hy) { if (dir < 0) n++; dir = 1; hi = lo = v; } } return n; };
const drag0 = Mo.drag; Mo.drag = (Sf, k, pts, times) => { if (!live(Sf) || !pts || pts.length < 2) return drag0(Sf, k, pts);
  const Rk = R(k), c = st(k), [sx, sy] = pts[0], [ex, ey] = pts[pts.length - 1], ds = Math.hypot(sx - k.x, sy - k.y), de = Math.hypot(ex - k.x, ey - k.y), T = times && times.length === pts.length ? (times[times.length - 1] - times[0]) / 1000 : null;
  let len = 0, rev = 0, lx = 0, ly = 0, bx0 = 1e9, bx1 = -1e9, by0 = 1e9, by1 = -1e9, still = 0; for (let j = 0; j < pts.length; j++) { const [x, y] = pts[j]; bx0 = Math.min(bx0, x); bx1 = Math.max(bx1, x); by0 = Math.min(by0, y); by1 = Math.max(by1, y); if (j) { const dx = x - pts[j - 1][0], dy = y - pts[j - 1][1]; len += Math.hypot(dx, dy); } } rev = revs(pts, 0, Rk * .08) + revs(pts, 1, Rk * .08);   /* reversals with hysteresis: finger jitter is not a rub */
  if (T != null) for (let j = 1; j < pts.length; j++) { if (Math.hypot(pts[j][0] - sx, pts[j][1] - sy) > CS.STILL) { still = (times[j] - times[0]) / 1000; break; } }
  { const pk = CS.pokeOf(Rk, len, T, still); if (pk != null) c.poke = pk; }   /* R7.3 */
  const box = Math.max(bx1 - bx0, by1 - by0), b = k.sb, keepX = b ? Float32Array.from(b.x) : null, keepY = b ? Float32Array.from(b.y) : null;
  // R7.9 wiggle (small, held, back and forth) = vibrato, never a scribble or a family pick
  if (rev >= 3 && box < Rk * .35 && T != null && T > .4) { Mo.save(k); const g = k.g, i = I(), hz = rev / 2 / Math.max(.2, T); g[i.lfoP] = cl(.3 + box / Rk * 1.4); g[i.lfoR] = cl(Math.pow(Math.max(0, (Math.min(8, hz) - .3) / 8), 1 / 1.4)); c.vib++; SB.touch(k, 'rough', .1); return Mo.touch(Sf, k, 'vibrato'); }
  let fam = null; if (rev >= 4 && box >= Rk * .35) fam = 'bowed'; else if (still >= CS.PRESS_MIN && still < CS.FIRE_HOLD) fam = 'blown'; else if (T != null && T < .35 && len > Rk * .5) fam = 'plucked';
  if (fam && CS.pick(Sf, k, fam)) { Mo.express(Sf, k); k.log.push('family:' + fam); if (fam === 'bowed') { Mo.save(k); SB.touch(k, 'rough', .2); return Mo.touch(Sf, k, 'rub'); } }   /* the first rub bows (it is not the later scribble = grit) */
  // R7.4 a thick, slow pull from the edge = tail (sustain / release); a quick thin one stays a limb (Q169 open: this split is the default)
  if (ds > Rk * .45 && de > Rk * 1.3 && T != null && T >= CS.TAIL_T && len / T < Rk * CS.TAIL_V * 3) { Mo.save(k); const g = k.g, i = I(), L = cl((de - Rk) / Rk / 2, 0, 1), th = Math.atan2(ey - k.y, ex - k.x); g[i.sus] = cl(Math.max(g[i.sus], .3 + .55 * L)); g[i.rel] = cl(Math.max(g[i.rel], .25 + .65 * L)); c.tail = Math.max(c.tail, L); CS.mark(k, th, Rk * (CS.TL0 + CS.TL1 * L), .2); SB.touch(k, 'pull', th, .5); return Mo.touch(Sf, k, 'tail'); }
  const r = drag0(Sf, k, pts);
  // R7.5 a push in from the rim = a dent that stays = body resonance
  const inward = de < ds - Rk * .3 && ds > Rk * .55 && ds < Rk * 1.3; if (r && inward) { const g = k.g, i = I(), dep = cl((ds - de) / Rk, 0, 1), th = Math.atan2(sy - k.y, sx - k.x); g[i.bodyRes] = cl(Math.max(g[i.bodyRes] + .2 * dep, .3 + .6 * dep)); g[i.reso] = cl(g[i.reso] + .12 * dep); c.dent = Math.max(c.dent, dep); CS.mark(k, th, -Rk * CS.DENT * dep, .3); CS.dents(k, th, dep); RS.Genome.snap(g); Mo.express(Sf, k); }
  else if (r === 'shape' && keepX) { CS.keep(k, keepX, keepY); if (de > ds + Rk * .15 && ds > Rk * .4 && ds < Rk * 1.4) CS.mark(k, Math.atan2(sy - k.y, sx - k.x), Rk * Math.min(.6, (de - ds) / Rk * .45), .2); CS.refresh(Sf, k); }   /* v0.8b3: an outward edge pull always leaves its bump, even when the slow-settling body lags the finger */   /* edge pushes / pulls keep the shape the finger left */
  return r; };
CS.refresh = (Sf, k) => { CS.post(Sf, k, 'refresh'); RS.Genome.snap(k.g); Mo.express(Sf, k); };
// ---- two fingers: R7.7 outside pinch = point, R7.10 rim pinch-and-pull = split, R7.8 two-finger tap = freeze / confirm ----
CS.twoKind = (k, wa, wb) => { const Rk = R(k), cx = (wa[0] + wb[0]) / 2, cy = (wa[1] + wb[1]) / 2, dm = Math.hypot(cx - k.x, cy - k.y), da = Math.hypot(wa[0] - k.x, wa[1] - k.y), db = Math.hypot(wb[0] - k.x, wb[1] - k.y), gap = Math.hypot(wa[0] - wb[0], wa[1] - wb[1]);
  if (da > Rk * 1.05 && db > Rk * 1.05 && dm < Rk * 2.4 && gap < Rk * 1.4) return 'out'; if (da > Rk * .6 && db > Rk * .6 && da < Rk * 1.3 && db < Rk * 1.3 && gap < Rk * .9 && dm > Rk * .55) return 'rim'; return 'mid'; };
const twoStart0 = Mo.twoStart; Mo.twoStart = (Sf, wa, wb) => { const k = Sf.clay; if (!k || !live(Sf)) return twoStart0(Sf, wa, wb); const kind = CS.twoKind(k, wa, wb), ok = twoStart0(Sf, wa, wb) || kind === 'out';
  if (ok) { st(k).two = { kind, cx: (wa[0] + wb[0]) / 2, cy: (wa[1] + wb[1]) / 2, gap: Math.hypot(wa[0] - wb[0], wa[1] - wb[1]) }; k.twistAt = k.twistAt || 0; } return ok; };
const twoMove0 = Mo.twoMove; Mo.twoMove = (Sf, info) => { const k = Sf.clay; if (k && k.cs && k.cs.two && k.cs.two.kind !== 'mid') return; return twoMove0(Sf, info); };   /* point / split pairs never twist voices */
const twoEnd0 = Mo.twoEnd; Mo.twoEnd = (Sf, info) => { const k = Sf.clay; if (!k || !live(Sf)) return twoEnd0(Sf, info); const c = st(k), tw = c.two; c.two = null; const Rk = R(k);
  if (tw && tw.kind !== 'mid' && info && info.wc) { const ex = info.wc[0], ey = info.wc[1], dm0 = Math.hypot(tw.cx - k.x, tw.cy - k.y), dm1 = Math.hypot(ex - k.x, ey - k.y), th = Math.atan2(ey - k.y, ex - k.x), ratio = info.ratio || 1;
    if (tw.kind === 'out' && (ratio < .8 || dm1 > dm0 + Rk * .15)) return CS.point(Sf, k, th, cl((dm1 - Rk) / Rk, .2, 1.2));
    if (tw.kind === 'rim' && Math.abs(ratio - 1) < .35 && dm1 > Rk * CS.SPLIT_R) return CS.split(Sf, k, th);
    k.twistAt = 0; return null; }
  if (!c.fam && k.steps === 0 && info && info.ratio < .88 && !k.twistAt && CS.pick(Sf, k, 'voiced')) { Mo.express(Sf, k); k.log.push('family:voiced'); }   /* R7.1 squeeze = voiced (then the normal pinch) */
  return twoEnd0(Sf, info); };
CS.point = (Sf, k, th, amt) => { Mo.save(k); const c = st(k); c.points++; CS.mark(k, th, R(k) * (CS.PT0 + CS.PT1 * amt), .12); SB.touch(k, 'pull', th, .6); const g = k.g, i = I(); g[i.inharm] = cl(g[i.inharm] + .08); return Mo.touch(Sf, k, 'point'); };
CS.split = (Sf, k, th) => { const c = st(k); if (c.lumps.length >= CS.SEC_CAP) { k.flash = .4; Sf.stats.claySplitFull = (Sf.stats.claySplitFull || 0) + 1; return 'splitFull'; } Mo.save(k); c.sec = true; c.lumps.push({ th, s: .32 + .08 * ((c.lumps.length * 7) % 3) });
  CS.mark(k, th, -R(k) * .12, .3); SB.touch(k, 'pull', th, .4); Sf.play({ modes: [{ f: 900, a: 1, d: .04 }, { f: 1400, a: .5, d: .03 }], gain: .035, att: .001, force: true, lane: 'clayClick' }, Sf.now() + .005, k.x, k.y);   /* a soft snap */
  Sf.stats.claySplits = (Sf.stats.claySplits || 0) + 1; return Mo.touch(Sf, k, 'split'); };
// R7.8 a two-finger tap (< 250 ms, little movement) freezes the ring; a second one confirms: a rising pitch + glow, then it hatches
CS.twoTap = (Sf) => { const k = Sf.clay; if (!k || !live(Sf)) return null; const c = st(k);
  if (!c.frozen) { c.frozen = 1; k.flash = .6; Mo.note(Sf, k, 0, Sf.now() + .005, .1, .5); Sf.stats.clayFrozen = (Sf.stats.clayFrozen || 0) + 1; return 'clayFreeze'; }
  const t = Sf.now() + .01; for (let j = 0; j < 4; j++) Mo.note(Sf, k, [0, 2, 4, 7][j], t + j * .07, .12, .55 + j * .08); k.flash = 1; Sf.fx({ k: 'bloom', x: k.x, y: k.y, col: k.col, dur: .7 }); Mo.hatch(Sf, 'confirm'); return 'clayConfirm'; };
// R7.7 press and hold still inside for > 0.5 s fires the clay: soft -> ceramic -> metal bell; stiffer, brighter glow, rising shimmer; still malleable
CS.down = (Sf, k, x, y) => { if (!k || !live(Sf)) return; st(k).press = { x, y, t0: k.age, moved: false, fired: false, nextT: 0 }; };
CS.move = (Sf, k, x, y) => { const p = k && k.cs && k.cs.press; if (p && !p.moved && Math.hypot(x - p.x, y - p.y) > CS.STILL) { p.moved = true; k.cs.firing = false; } };
CS.up = (Sf, k) => { const c = k && k.cs, p = c && c.press; if (!p) return null; c.press = null; c.firing = false; if (!p.fired) return null; Mo.save(k); const g = k.g, i = I(), f = c.fire;
  g[i.inharm] = cl(lerp(g[i.inharm], .3 + .65 * f, .8)); g[i.dec] = cl(Math.max(g[i.dec], .4 + .5 * f)); g[i.att] = cl(g[i.att] * (1 - .8 * f)); g[i.sus] = cl(g[i.sus] * (1 - .7 * f)); g[i.cut] = cl(Math.max(g[i.cut], .45 + .5 * f)); if (f > .45) { g[i.fmI] = cl(Math.max(g[i.fmI], .3 + .5 * (f - .45))); }
  return Mo.touch(Sf, k, 'fire:' + CS.fireLevel(k)); };
CS.fireLevel = k => { const f = (k.cs && k.cs.fire) || 0; return f >= .8 ? 'metal' : f >= .4 ? 'ceramic' : 'soft'; };
const step0 = SB.step; SB.step = (k, dt) => { const f = (k.cs && k.cs.fire) || 0; if (!f) return step0(k, dt); const K = SB.K_SHAPE; SB.K_SHAPE = K * (1 + 2.5 * f); try { step0(k, dt); } finally { SB.K_SHAPE = K; } };   /* fired clay is stiffer */
const tick0 = Mo.tick; Mo.tick = (Sf, dt) => { const k = Sf.clay; if (!k || !live(Sf) || !k.cs) return tick0(Sf, dt); const c = k.cs, p = c.press;
  if (p && !p.moved && k.age - p.t0 >= CS.FIRE_HOLD && c.fire < 1) { if (!c.firing) { c.firing = true; p.fired = true; } c.fire = Math.min(1, c.fire + dt / CS.FIRE_T); k.flash = Math.max(k.flash, .35 + .5 * c.fire); k.left = Math.max(k.left, Math.min(Mo.WIN, Mo.CAP - k.age));
    if (k.age >= p.nextT) { p.nextT = k.age + .22; Sf.play({ modes: [{ f: 1200 + 2400 * c.fire, a: 1, d: .08 }, { f: (1200 + 2400 * c.fire) * 2.76, a: .3 * c.fire, d: .06 }], gain: .02 + .02 * c.fire, att: .002, force: true, lane: 'clayClick' }, Sf.now() + .005, k.x, k.y); } }   /* the rising shimmer */
  if (c.frozen) { const l = k.left, a = k.age; k.left = Infinity; k.age = Math.min(a, Mo.CAP - 1); tick0(Sf, dt); if (Sf.clay === k) { k.left = l; k.age = a + dt; } return; }   /* frozen: the ring stops (backgrounding / save still hatch) */
  return tick0(Sf, dt); };
// ---- hatch: the family, section and fire level carry over (a few numbers; the appendage lumps draw on the ohm) ----
// 3-finger undo also restores the stage state (lumps, points, family, plastic rest outline)
const save0 = Mo.save; Mo.save = k => { save0(k); const h = k.hist[k.hist.length - 1], c = k.cs; if (h && c) h.cs = { fam: c.fam, points: c.points, lumps: c.lumps.map(l => Object.assign({}, l)), sec: c.sec, dent: c.dent, tail: c.tail, vib: c.vib, fire: c.fire, plx: c.plx && Float32Array.from(c.plx), ply: c.ply && Float32Array.from(c.ply) }; };
const undo0 = Mo.undo; Mo.undo = Sf => { const k = Sf.clay, h = k && k.hist[k.hist.length - 1]; const r = undo0(Sf); if (r === 'clayUndo' && h) { if (h.cs && k.cs) { Object.assign(k.cs, h.cs, { plx: h.cs.plx && Float32Array.from(h.cs.plx), ply: h.cs.ply && Float32Array.from(h.cs.ply) }); if (!k.cs.lumps.length) k.cs.sec = false; if (k.sb) SB.reform(k); } } return r; };
const hatch0 = Mo.hatch; Mo.hatch = (Sf, why) => { const k = Sf.clay, c = k && k.cs; if (c && c.frozen && why === 'tap' && live(Sf)) { k.flash = .3; return null; }   /* R7.8: frozen clay ignores tap-away (spiral, background and save still hatch) */ if (c && c.sec) k.g.sec = c.lumps.length; const o = hatch0(Sf, why); if (o && c) { if (c.sec) { o.sec = c.lumps.length; o.lumps = c.lumps.map(l => +l.th.toFixed(3)); o.g.sec = o.sec; } if (c.fam) o.clayFam = c.fam; if (c.fire) o.fired = +c.fire.toFixed(2); if (c.sec && o.P && RS.Inst) o.P.inst = RS.Inst.fromGenome(o.g); } return o; };
// ---- drawing: appendage lumps on the clay and on hatched ohms; the role hint; frozen ring; fire glow ----
CS.drawLumps = (ctx, x, y, r, lumps, col, a = .9) => { if (!lumps || !lumps.length) return; ctx.save(); for (const l of lumps) { const th = typeof l === 'number' ? l : l.th, s = typeof l === 'number' ? .34 : l.s, lx = x + Math.cos(th) * r * 1.12, ly = y + Math.sin(th) * r * 1.12, rr = r * s;
  ctx.strokeStyle = 'rgba(' + col.map(Math.round).join(',') + ',' + (a * .6).toFixed(2) + ')'; ctx.lineWidth = Math.max(2, rr * .5); ctx.beginPath(); ctx.moveTo(x + Math.cos(th) * r * .85, y + Math.sin(th) * r * .85); ctx.lineTo(lx, ly); ctx.stroke();
  ctx.fillStyle = 'rgba(' + col.map(Math.round).join(',') + ',' + a.toFixed(2) + ')'; ctx.beginPath(); ctx.arc(lx, ly, rr, 0, TAU); ctx.fill(); } ctx.restore(); };
const draw0 = Mo.draw; Mo.draw = (ctx, Sf, t) => { const k = Sf.clay; draw0(ctx, Sf, t); if (!k || !k.cs) return; const c = k.cs, Rk = R(k), col = k.col || [220, 200, 170];
  CS.drawLumps(ctx, k.x, k.y, Rk, c.lumps, col);
  if (c.fire > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; const lv = c.fire, gr = ctx.createRadialGradient(k.x, k.y, Rk * .3, k.x, k.y, Rk * 1.6); gr.addColorStop(0, 'rgba(255,' + Math.round(200 + 55 * lv) + ',' + Math.round(150 + 105 * lv) + ',' + (.15 + .35 * lv).toFixed(2) + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(k.x, k.y, Rk * 1.6, 0, TAU); ctx.fill(); ctx.restore(); }
  if (c.hint && CS.ROLE_COL[c.hint]) { const hc = CS.ROLE_COL[c.hint]; ctx.save(); ctx.strokeStyle = 'rgba(' + hc.join(',') + ',.55)'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(k.x, k.y, Rk * 1.45, Math.PI * .15, Math.PI * .85); ctx.stroke(); ctx.restore(); }   /* a wordless colour hint: the role missing nearby */
  if (c.frozen) { ctx.save(); ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 2; ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.arc(k.x, k.y, Rk * 1.9, 0, TAU); ctx.stroke(); ctx.restore(); } };
})(typeof window !== 'undefined' ? window : globalThis);
