// v0.8a3 (chunk 3) headless check. A: a drawn closed shape whose end RESTS (>= CLAY_HOLD) condenses into an effect item (a modulation insert,
// never a new instrument); lifted at once it is a blob. B: ohms carry real water (dew trips move volume; carried puddles; off-screen tally).
// v0.8a4: C (light regional keys) and D (jam-tuned strings). ONLY=A / B / C / D runs one section.
const T = require('./node_env.js'), RS = global.RS, spiral = require('./spiral_synth.js'), It = RS.Items, Wt = RS.Water, Y = RS.Sym, F = RS.Field, SY = RS.Symbols;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const ring = (x, y, R = 40, n = 44) => { const p = []; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; p.push([x + Math.cos(a) * R, y + Math.sin(a) * R * .9]); } return p; };
const freshPour = (Sf, x0, vol, dir = 1) => { const P = Sf.P; for (let k = 0; k < 400; k++) { const x = x0 + dir * k * 30, th = RS.Water.lowPoint(Sf, P.theta(x, Sf.ground(x) - 5)); if (P.height(th) >= P.sea + 4 && !RS.Water.poolNear(Sf, th, 260)) return RS.Water.pour(Sf, x, Sf.ground(x) - 5, vol); } return null; };
const tm = p => p.map((_, i) => i * 12);
const ITEMS_DRAW0 = RS.ITEMS_DRAW; RS.ITEMS_DRAW = true;   // v0.8b1 R4 retired the rested-shape item gesture in the app (RS.ITEMS_DRAW = false); section A keeps testing the legacy path behind the flag
if (!ONLY || ONLY === 'A') { const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.items = []; T.run(Sf, .3); const x0 = Sf.view.cx, y0 = Sf.ground(x0) - 220;
  const pl = () => Sf.items.filter(q => q.made === 'player');
  const r0 = Sf.stroke(ring(x0 - 300, y0), tm(ring(x0 - 300, y0)), { endHold: 0 });
  ok('A1 closed shape lifted at once (endHold 0) = blob, no item', r0 && r0.k === 'material' && pl().length === 0, { k: r0 && r0.k });
  const r1 = Sf.stroke(ring(x0, y0), tm(ring(x0, y0)), { endHold: 500 }); const it1 = r1 && r1.it;
  ok('A2 closed shape + end rest 500 ms = effect item made:"player" (kind from fromShape)', r1 && r1.k === 'item' && it1 && it1.made === 'player' && It.KINDS.includes(it1.kind) && Sf.items.includes(it1) && !!it1.b, { k: r1 && r1.k, kind: r1 && r1.kind });
  ok('A2b no ohm instrument changes: an item is an fx insert kind (rev/dly/dst/glt/cho/trm/cmb/pit), never a voice', It.KINDS.every(k => ['rev', 'dly', 'dst', 'glt', 'cho', 'trm', 'cmb', 'pit'].includes(k)));
  // undo / redo
  const nb = Sf.W.bodies.size; const u = Sf.doUndo(); const gone = !Sf.items.includes(it1) && !Sf.items.some(q => q.uid === it1.uid) && Sf.W.bodies.size === nb - 1;
  const rd = Sf.doRedo(); const back = Sf.items.find(q => q.uid === it1.uid);
  ok('A3 undo removes the item record AND its body; redo restores it (same uid, kind, made)', u === 'item' && gone && back && back.kind === it1.kind && back.made === 'player' && !!back.b && Sf.W.bodies.size === nb, { u, gone, back: !!back });
  const u2 = Sf.doUndo(); ok('A3b undo after redo removes it again', u2 === 'item' && !Sf.items.some(q => q.uid === it1.uid)); Sf.doRedo();
  // spiral with rest -> clay
  const s = spiral({}); const rs = Sf.stroke(s.pts.map(p => [p[0] - 400 + x0 + 500, p[1] - 300 + Sf.ground(x0 + 500) - 160]), s.times, { hy: .5, endHold: 600 });
  ok('A4 a spiral with the rest is still clay (not an item)', rs && rs.k === 'clay', { k: rs && rs.k }); if (Sf.clay && RS.Mold && RS.Mold.hatch) { try { RS.Mold.hatch(Sf, 'test'); } catch (e) { } }
  // loop around an ohm with rest -> catch
  const c = T.add(Sf, T.plain(7), 900); T.run(Sf, .6); const R = RS.Creature.radius(c) * 2.6; const lp = ring(c.x, c.y, R); const rc = Sf.stroke(lp, tm(lp), { endHold: 600 });
  ok('A5 a loop around an ohm with the rest is not an item: since v0.8b4 (Wilbow 3:32 PM MDT Oct 23, "loop + rest for any count") it selects that ohm', rc && rc.k === 'select' && rc.n === 1, { k: rc && rc.k });
  // registered glyph with rest -> glyph (infinity across two ohms)
  const a = T.add(Sf, T.plain(11), 1500), b = T.add(Sf, T.plain(12), 1660); T.run(Sf, .5); const tr = SY.trace('infinity', (a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(a.x - b.x, a.y - b.y) * .62)[0]; const rg = Sf.stroke(tr, tm(tr), { endHold: 600 });
  ok('A6 a registered glyph (infinity) with the rest is still the glyph', rg && rg.k === 'glyph', { k: rg && rg.k });
  // cap 4: items 2..4 then the fifth -> blob + shimmer
  const ks = []; for (let k = 0; k < 3; k++) { const q = ring(x0 + 200 + k * 140, y0 - 150, 30); const r = Sf.stroke(q, tm(q), { endHold: 520 }); ks.push(r && r.k); }
  const full0 = Sf.stats.itemFull || 0, q5 = ring(x0 - 200, y0 - 300, 36), r5 = Sf.stroke(q5, tm(q5), { endHold: 520 });
  ok('A7 player items 2-4 are items; the fifth rested shape = blob + "full" shimmer, nothing removed (cap 4, Q43)', ks.every(k => k === 'item') && r5 && r5.k === 'material' && (Sf.stats.itemFull || 0) === full0 + 1 && pl().length === 4 && Sf.fxList ? true : ks.every(k => k === 'item') && r5 && r5.k === 'material' && (Sf.stats.itemFull || 0) === full0 + 1 && pl().length === 4, { ks, r5: r5 && r5.k, n: pl().length });
  // pack / unpack round trip
  const d = JSON.parse(JSON.stringify(It.pack(Sf))); const before = pl().map(q => q.uid + q.kind).sort().join(); for (const q of Sf.items.slice()) It.remove(Sf, q); It.unpack(Sf, d);
  ok('A8 pack/unpack keeps the player items (uid, kind, made)', pl().map(q => q.uid + q.kind).sort().join() === before && pl().length === 4, { n: pl().length });
  // player-made embers never add permanent grit (Wilbow 3:41); world embers keep the existing loop
  const em = It.make(Sf, 'dst', c.x + 30, c.y, { made: 'player', force: true }); c.grit = 0; Sf.items.filter(q => q.kind === 'dst' && q !== em).forEach(q => It.remove(Sf, q));
  for (let k = 0; k < 40; k++) It.onNote(Sf, c, { vel: 1, gain: 1, loud: 1, perc: false, f: 220 }, {}); const g1 = c.grit || 0; It.remove(Sf, em);
  const we = It.make(Sf, 'dst', c.x + 30, c.y, { made: 'world', force: true }); if (c.item) It.drop(Sf, c, false); It.take(Sf, c, we, 'carry');   /* v0.8b5 E1: world-ember grit only for the carrier */ for (let k = 0; k < 40; k++) It.onNote(Sf, c, { vel: 1, gain: 1, loud: 1, perc: false, f: 220 }, {}); const g2 = c.grit || 0; It.remove(Sf, we);
  ok('A9 a PLAYER-made ember never adds grit to an ohm (items only modulate); world embers (carried) still do', g1 === 0 && g2 > 0, { g1, g2 });
  ok('A10 RS.ITEMS_DRAW (legacy flag, off in the app since v0.8b1) gates only the rested path; a closed shape without rest = blob', ITEMS_DRAW0 === false && RS.ITEMS_DRAW === true && r0.k === 'material'); }
RS.ITEMS_DRAW = ITEMS_DRAW0;
if (!ONLY || ONLY === 'B') { T.t = 0; const { Sf } = T.scene({ clear: true }), P = Sf.P; Sf.noSeedItems = Sf.noPatches = true; let spot = null;
  // a dry home with NO field pool within 380 px, and room for a fresh player pool 150-320 px away (the only water source for the trip test)
  const srcAt = (S, x) => { const y = S.ground(x); for (const off of [220, -220, 280, -280, 170, -170]) { const th = Wt.lowPoint(S, S.P.theta(x + off, S.ground(x + off) - 5)), [sx, sy] = S.P.surf(th), d = Math.hypot(sx - x, sy - y); if (S.P.height(th) >= S.P.sea + 4 && !Wt.poolNear(S, th, 260) && d > 150 && d < 320) return x + off; } return null; };
  let sx0 = null; for (let x = Sf.view.cx - 4000; x < Sf.view.cx + 4000 && spot == null; x += 40) { const y = Sf.ground(x); if (F.at(Sf, x).moist <= .65 && !(Sf.mediumAt && Sf.mediumAt(x, y - 20).water) && !F.near(Sf, x, y, 'pool', 380) && !Wt.poolNear(Sf, P.theta(x, y), 400)) { const s2 = srcAt(Sf, x); if (s2 != null) { spot = x; sx0 = s2; } } }
  if (spot == null) ok('B0 a dry spot with room for a pool exists', false); else {
    // unit: a field pool never drops below its natural level; a player pool can be emptied
    const fp = Sf.water.pools.find(p => p.q); let low = 1e9; for (let k = 0; k < 60; k++) { Wt.take(Sf, fp.id, 120); low = Math.min(low, fp.base); }
    ok('B1 a field pool never drops below its natural level vol0 (spring-fed)', low >= fp.vol0 - .01, { low: Math.round(low), vol0: Math.round(fp.vol0) });
    const pp = freshPour(Sf, spot + 1200, 300); let got = 0; for (let k = 0; k < 6; k++) got += Wt.take(Sf, pp.id, 90);
    ok('B2 a player pool can be emptied, and gives only what it holds', got > 290 && got < 301 && !Sf.water.pools.includes(pp), { got });
    // undoing a wave pour after carriers took some removes only what remains
    const wp = freshPour(Sf, spot + 1800, 1000); Sf.undo.push({ k: 'water', pool: wp.id, vol: 1000, bodies: [], creatures: [] }); Wt.take(Sf, wp.id, 600); Sf.doUndo();
    ok('B3 undoing a wave pour after carriers took some removes only what remains (no negative water)', !Sf.water.pools.includes(wp) && Sf.water.pools.every(p => p.base >= 0), { base: wp.base });
    // the trip: a water-loving ohm on dry ground near a player pool carries real water home
    const c = T.add(Sf, T.plain(61), spot - Sf.view.cx); T.run(Sf, .3); Object.assign(c.P.beh, { waterLove: .9, wander: 0, social: 0, curiosity: 0, lightLove: 0 }); c.mind.perc = 0; c.anchor = [c.x, c.y]; F.blower = q => false;
    const onView = (S, q) => { const v = S.view, w = v.x1 - v.x0, h = v.y1 - v.y0; v.x0 = q.x - w * .12; v.x1 = v.x0 + w; v.cx = v.x0 + w / 2; v.y0 = q.y - h / 2; v.y1 = v.y0 + h; if (v.cy != null) v.cy = q.y; }; onView(Sf, c);   /* on screen, not centred: a watched ohm holds still */
    const src = Wt.pour(Sf, sx0, Sf.ground(sx0) - 5, 4000); const s0 = src.base;
    const nonField = () => Sf.water.pools.filter(p => !p.q).reduce((a, p) => a + p.base, 0), allW = () => Sf.water.pools.reduce((a, p) => a + p.base, 0); Wt.SOAK = 0; Wt.SOAK_MIN = 0; const tot0 = nonField(); let t = 0, offN = 0;
    const wetHome = (S, q) => !(q.sym && q.sym.dew) && !Y.dewSource(S, q, S.now()); let tWet = null, cWet = 0; const pT = [];   /* B9: the carry RATE is measured while home is still dry (once home is wet enough, trips stop on and off screen) */
    while (t < 1800 && ((Sf.stats.sym || {}).dewPour || 0) < 10) { T.run(Sf, 10, () => { c.energy = .6; onView(Sf, c); if (c.lod) offN++; }); { const np = (Sf.stats.sym || {}).dewPour || 0; if (np > pT.length) pT.push([t + 10, Sf.stats.carried || 0]); } if (tWet == null && wetHome(Sf, c)) { tWet = t + 10; cWet = Sf.stats.carried || 0; } /* the camera follows: the ohm stays on screen, off centre */ t += 10; }
    const trips = (Sf.stats.sym || {}).dewPour || 0, srcNow = Sf.water.pools.includes(src) ? src.base : 0, moved = s0 - srcNow, home = Sf.water.pools.filter(p => p.src === 'carry');
    ok('B4 real trips (end to end, on screen) move real volume from the pool to home (sum conserved within 1%)', trips >= 3 && moved > trips * 55 && Math.abs(nonField() - tot0) / tot0 < .01 && home.length >= 1 && Math.abs(home.reduce((a, p) => a + p.base, 0) + (Sf.stats.carried - home.reduce((a, p) => a + p.base, 0)) - moved) < moved * .01, { trips, st: Sf.stats.sym, t, moved: Math.round(moved), carried: Math.round(Sf.stats.carried || 0), home: home.map(p => Math.round(p.base)), d: Math.round(nonField() - tot0) });
    ok('B4b at most one carried puddle per home area; the first on-screen pour shimmered once', home.length <= 1 && Sf.mods.dewPourSeen === 1, { n: home.length, seen: Sf.mods.dewPourSeen, offFrames: offN });
    const pD = tWet != null ? pT.filter(q => q[0] <= tWet) : pT, rate1 = pD.length >= 3 ? (pD[pD.length - 1][1] - pD[0][1]) / ((pD[pD.length - 1][0] - pD[0][0]) / 60) : tWet != null ? cWet / (tWet / 60) : (Sf.stats.carried || 0) / (t / 60);   // px^2 per minute on screen: the steady trip cadence (first pour -> last pour before home is wet), so the walk out to a new pool and the 4-or-5-trips-to-wet step do not swing it
    /* v0.8b3 B9: the on-screen cadence is a lottery (45 s cooldown, a coin per 15 s window, the rest gate), and one ohm makes only 3-4 dry-home trips:
       one run's cadence ranged 63-120 (b3, 9 runs), so the rate is pooled over 5 independent ohms (5 lotteries, ~15 intervals) before it is compared with the tally */
    const legs = []; if (pD.length >= 2) legs.push([pD[pD.length - 1][1] - pD[0][1], pD[pD.length - 1][0] - pD[0][0]]);
    const tSave = T.t; for (let r = 0; r < 4; r++) { T.t = 0; const S3 = T.scene({ clear: true }).Sf; S3.noSeedItems = S3.noPatches = true; const c3 = T.add(S3, T.plain(61), spot - S3.view.cx); T.run(S3, .3); Object.assign(c3.P.beh, { waterLove: .9, wander: 0, social: 0, curiosity: 0, lightLove: 0 }); c3.mind.perc = 0; c3.anchor = [c3.x, c3.y]; onView(S3, c3);
      Wt.pour(S3, sx0, S3.ground(sx0) - 5, 4000); Wt.SOAK = 0; Wt.SOAK_MIN = 0; let t3 = 0; const p3 = [];
      while (t3 < 900 && !(t3 > 0 && wetHome(S3, c3))) { T.run(S3, 10, () => { c3.energy = .6; onView(S3, c3); }); t3 += 10; const np = (S3.stats.sym || {}).dewPour || 0; if (np > p3.length) p3.push([t3, S3.stats.carried || 0]); }
      if (p3.length >= 2) legs.push([p3[p3.length - 1][1] - p3[0][1], p3[p3.length - 1][0] - p3[0][0]]); } T.t = tSave;   /* the main scene's clock runs on */
    const lv = legs.reduce((a, q) => a + q[0], 0), lt = legs.reduce((a, q) => a + q[1], 0), rateOn = legs.length >= 2 && lt > 0 ? lv / (lt / 60) : rate1;
    { const a = freshPour(Sf, spot + 3000, 2000), h0 = allW(); let mv = 0; for (let k = 0; k < 10; k++) { const v = Wt.take(Sf, a.id, 60 + k * 6); mv += v; Y.pourHome(Sf, spot, Sf.ground(spot), v, 77, false); }
      ok('B4c 10 take/pour trips of mixed size conserve water within 1% (pool -> carried puddle)', mv > 800 && Math.abs(allW() - h0) < h0 * .01, { mv, d: Math.round(allW() - h0) }); }
    // pack / unpack keeps the puddle
    const d = JSON.parse(JSON.stringify(Wt.pack(Sf))); const hb = home[0] && Math.round(home[0].base); Wt.init(Sf); Wt.unpack(Sf, d); const h2 = Sf.water.pools.find(p => p.src === 'carry');
    ok('B5 pack/unpack keeps the carried puddle (src carry, same volume)', h2 && Math.abs(Math.round(h2.base) - hb) <= 1 && /^cw/.test(h2.key), { hb, h2: h2 && Math.round(h2.base) });
    // soak: no trips -> gone in about 10 min
    Wt.SOAK = .25; Wt.SOAK_MIN = 15; let px = null; for (let x = spot + 1000; x < spot + 6000 && px == null; x += 60) { const th = P.theta(x, Sf.ground(x)); if (P.height(th) >= P.sea + 4 && !Wt.poolNear(Sf, th, 300)) px = x; } const pd = Wt.carryPour(Sf, px, Sf.ground(px) - 5, 500, 999); let alive5 = 0; for (let k = 0; k < 12; k++) { Wt.soak(Sf, 60); if (k === 4) alive5 = Sf.water.pools.includes(pd); }
    ok('B6 a carried puddle with no trips soaks away (still there at 5 min, gone by ~12 min)', alive5 && !Sf.water.pools.includes(pd));
    // grabbing a carrier mid-trip pours its droplet where it is
    const leftC = { dead: !!c.dead, caught: !!c.caught, leaving: !!c.leaving }; const g = T.add(Sf, T.plain(62), spot - Sf.view.cx + 60); T.run(Sf, .2); g.sym = g.sym || {}; g.sym.dew = { ph: 'back', hx: g.x, hy: g.y, ax: g.x, ay: g.y, px: g.x, py: g.y, pid: 'none', t0: Sf.now() }; g.sym.dewVol = 90; const cr0 = Sf.stats.carried || 0; g.grabbed = true; Sf._syT = -99; Y.tick(Sf); g.grabbed = false;
    ok('B7 grabbing a carrier mid-trip pours the water where it falls (no loss)', !g.sym.dew && (Sf.stats.carried || 0) === cr0 + 90 && g.sym.dewVol === 0, { dew: !!g.sym.dew, d: (Sf.stats.carried || 0) - cr0, v: g.sym.dewVol, leftC });
    // plants near a carried pour get the wet boost
    if (RS.Grow) { const pl = RS.Grow.plant(Sf, P.theta(c.x + 40, c.y)); if (pl) { Y.pourHome(Sf, c.x, c.y, 80, 5, false); ok('B8 a plant within 160 px of a carried pour perks up (wet boost +15% for 10 min)', pl.wetT === Sf.now()); } }
    // off screen: the per-area tally moves about the same average volume (one number per area per minute)
    { T.t = 0; const o2 = T.scene({ clear: true }), S2 = o2.Sf; S2.noSeedItems = S2.noPatches = true; const c2 = T.add(S2, T.plain(61), spot - S2.view.cx); T.run(S2, .3); Object.assign(c2.P.beh, { waterLove: .9, wander: 0, social: 0, curiosity: 0, lightLove: 0 }); c2.mind.perc = 0; c2.anchor = [c2.x, c2.y];
      Wt.pour(S2, sx0, S2.ground(sx0) - 5, 4000); { const v = S2.view, o = 4000; v.x0 += o; v.x1 += o; v.cx += o; } S2.inView = () => false; Wt.SOAK = 0; Wt.SOAK_MIN = 0;
      let u = 0, uWet = null, vWet = 0; while (u < Math.max(t, 600)) { T.run(S2, 60, () => { c2.energy = .6; }); u += 60; if (uWet == null && wetHome(S2, c2)) { uWet = u; vWet = S2.stats.carryTally || 0; } }
      const rateOff = uWet != null ? vWet / (uWet / 60) : (S2.stats.carryTally || 0) / (u / 60), lodTrip = (S2.stats.sym || {}).dewTrip || 0, m2 = F.at(S2, c2.anchor[0]).moist; Wt.SOAK = .25; Wt.SOAK_MIN = 15;
      ok('B9 off screen the per-area tally moves the on-screen average volume within 25% (steady trip cadence while home is still dry)', rateOn > 0 && Math.abs(rateOff - rateOn) / rateOn < .25, { pT: process.env.DBG ? pT : undefined, legs: process.env.DBG ? legs : undefined, rateOn: Math.round(rateOn), rate1: Math.round(rate1), rateOff: Math.round(rateOff), tWet, uWet, lodPours: (S2.stats.sym || {}).dewPour || 0 });
      ok('B9b off screen the ohm walks no trips (the tally carries; cheap), and the tally wets home until it stops on its own like trips do', lodTrip === 0 && uWet != null && m2 > .7, { lodTrip, uWet, moist: +m2.toFixed(3) }); } } }
// ---- v0.8a4 C: light regional keys (ONLY=C)
if (!ONLY || ONLY === 'C') { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; T.run(Sf, .3); const x0 = Sf.view.cx, y0 = Sf.ground(x0) - 40, Rg = Sf.region, CAT = RS.Tonal.CAT;
  const sA = CAT[0], sB = CAT.find(q => q.name !== sA.name);
  ok('C0 field + region exist', !!(Sf.field && Rg && Rg.learnKey && Rg.keyAt));
  Rg.learnKey(x0, y0, 200, sA); const k1 = JSON.parse(JSON.stringify(Rg.keyAt(x0, y0) || null)); Rg.learnKey(x0, y0, 300, sA); const k2 = Rg.keyAt(x0, y0);
  ok('C1 two seeds teach the area a key; the tonic blends (.6 old / .4 new)', k1 && k1.tc === 200 && k1.sys === sA.name && k2 && Math.abs(k2.tc - 240) < .2 && k2.n === 2, { k1, tc: k2 && k2.tc });
  Rg.learnKey(x0, y0, 240, sB); const s1 = Rg.keyAt(x0, y0).sys; Rg.learnKey(x0, y0, 240, sB); const s2 = Rg.keyAt(x0, y0).sys;
  ok('C2 the scale changes only when two seeds in a row agree on the new one', s1 === sA.name && s2 === sB.name, { s1, s2 });
  ok('C2b the tonic blends on the circle (550 then -550 lands near +-590, not 0)', (() => { const o = {}; Rg.learnKey(x0 + 3000, y0, 550, sA); Rg.learnKey(x0 + 3000, y0, -550, sA); const k = Rg.keyAt(x0 + 3000, y0); return k && Math.abs(Math.abs(k.tc) - 590) < 15; })(), Rg.keyAt(x0 + 3000, y0));
  // births: ~20 % of births in a keyed area start in the area key (direct roll, 500 births)
  let hit = 0; for (let i = 0; i < 500; i++) { const o2 = {}; RS.Field.birthKey(Sf, x0 + (i % 50) * 3, y0, o2, 'test' + i); if (o2.keyC === Rg.keyAt(x0, y0).tc) hit++; }
  ok('C3 ~20 % of births in a keyed area take the area key (500 rolls, 15-25 %)', hit >= 75 && hit <= 125, { hit });
  { const o2 = { keyC: 77 }; RS.Field.birthKey(Sf, x0, y0, o2, 'set'); ok('C3b a caller-set key (bud / breed / load) is never overwritten', o2.keyC === 77); }
  { let got = null; for (let i = 0; i < 40 && got == null; i++) { const g = T.plain(900 + i), c = Sf.addCreature(g, x0 + 100, y0 - 60, { birth: 'spiral' }); if (c && Math.abs(c.keyC - Rg.keyAt(x0, y0).tc) < .01) got = c; } ok('C3c a spiral birth can start in the area key (via addCreature)', !!got); }
  // existing ohms never retuned by the region; nests unchanged
  const cs = [0, 1, 2].map(i => T.add(Sf, T.plain(31 + i), 200 + i * 90)); const kc = cs.map(c => c.keyC), mt = cs.map(c => c.mind && c.mind.tonicC); for (let i = 0; i < 8; i++) Rg.learnKey(cs[0].x, cs[0].y, 500, sB);
  T.run(Sf, 40); ok('C4 existing ohms keep their key and tonic after the area learns a different key', cs.every((c, i) => c.keyC === kc[i] && (c.mind.E || c.mind.tonicC === mt[i])), { kc, now: cs.map(c => c.keyC) });
  // save / load keeps the region keys
  { const pk = Sf.pack ? Sf.pack() : null, n = Object.keys(Sf.mods.regionKey || {}).length; T.t = 0; const o3 = T.scene({ clear: true }), S3 = o3.Sf; if (pk && S3.unpack) S3.unpack(pk); const n3 = Object.keys((S3.mods && S3.mods.regionKey) || {}).length;
    ok('C5 save / load keeps the learned area keys', pk && n > 0 && n3 === n, { n, n3 }); }
  // world voice: with no jam nearby, wind rocks / reeds / drones use the area key
  { const near = cs.find(c => !c.mind.E) || cs[0]; const was = near.mind.E; near.mind.E = null; const vm = RS.Field.voiceMind(Sf, near, near.x, near.y), rk = Rg.keyAt(near.x, near.y); near.mind.E = was;
    ok('C6 a world voice (wind / reed / drone) near an ohm not in a jam takes the area key', vm && vm !== near.mind && rk && vm.tonicC === rk.tc && vm.sys && vm.sys.name === rk.sys, { tc: vm && vm.tonicC, rk }); }
  // proposer tie-break
  { const Co = RS.Cohere, a = cs[0], b = cs[1], rk = Rg.keyAt(a.x, a.y); const sv = Co.conf; const ca = a.mind.tonicC, cb = b.mind.tonicC, sa = a.mind.sys, sb2 = b.mind.sys;
    a.mind.tonicC = rk.tc + 300; b.mind.tonicC = rk.tc; a.mind.sys = b.mind.sys = RS.Field.sysOf(rk); Co.conf = c => c === a ? .5 : c === b ? .48 : 0; const p1 = Co.pick(Sf, [a, b]); Co.conf = c => c === a ? .6 : c === b ? .48 : 0; const p2 = Co.pick(Sf, [a, b]); Co.conf = sv;
    a.mind.tonicC = ca; b.mind.tonicC = cb; a.mind.sys = sa; b.mind.sys = sb2; ok('C7 the area key only breaks near-ties for the proposer (within .05); a clear leader stays', p1 === b && p2 === a, { p1: p1 && p1.id, p2: p2 && p2.id }); }
}
// ---- v0.8a4 D: jam-tuned strings (ONLY=D)
if (!ONLY || ONLY === 'D') { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; const J = RS.Jam, H = RS.Harm, Mi = RS.Mind, To = RS.Tonal, cx = Sf.view.cx, cy = Sf.view.cy || 400;
  const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(RS.Genome.express(T.plain(s)).inst)) return s; };
  const seeds = [pick(I => I.percK > .75, 7000), pick(I => I.percK < .2, 7100), pick(I => I.percK < .2, 7400), pick(I => I.percK < .2, 7800)];
  const cs = seeds.map((s, i) => { const c = T.add(Sf, T.plain(s), cx + [-90, 0, 90, 30][i] - Sf.view.cx); c.y = cy + [0, 40, 0, -60][i]; return c; });
  T.run(Sf, 70); const E = cs.map(c => c.mind.E).find(Boolean); ok('D0 a jam formed', !!(E && E.leader), { E: !!E });
  if (E && E.leader) { const m = E.leader.mind, near = E.members[0], W = Sf.W;
    const str = (x, y, L, h = 3) => { const b = Sf.makeRod([[x, y], [x + L, y + 2]], h, { role: 'instrument', pinStart: true, pinEnd: true }); return b; };
    const inKey = f => { const base = Mi.tonicHz(Sf, m), P = m.sys.period || 1200, c = ((1200 * Math.log2(f / base)) % P + P) % P; return m.sys.cents.some(q => Math.min(Math.abs(q - c), P - Math.abs(q - c)) < 1.5); };
    const Ls = [70, 82, 95, 110, 128]; const bs = Ls.map((L, i) => str(near.x - 60 + i * 6, near.y - 40 - i * 14, L)); T.run(Sf, .1); const raw = bs.map(b => Sf.S.physics(b).f0), tf = bs.map((b, i) => Sf.S.tune(b, raw[i], Sf.now()));
    ok('D1 player strings drawn by a jam sound in the jam key (tonic + scale)', tf.every(inKey) && bs.every(b => b.tie && b.tie.gid === E.id), { tf: tf.map(f => +f.toFixed(1)) });
    const ord = raw.map((f, i) => i).sort((a, b) => raw[a] - raw[b]), td = ord.map(i => bs[i].tie.d);
    ok('D2 each tied string gets a DISTINCT note, in the same order as their raw pitches', td.every((d, k) => k === 0 || d > td[k - 1]) && ord.map(i => tf[i]).every((f, k, A) => k === 0 || f > A[k - 1]), { td });
    const far = str(near.x + 2600, near.y - 40, 90); T.run(Sf, .05); const ff = Sf.S.physics(far).f0, fr = Sf.S.tune(far, ff, Sf.now()); ok('D3 a string far from any jam is untouched (session key as before)', !far.tie && Math.abs(fr - Sf.M.snap(ff, { t: Sf.now() })) < .01);
    const fb = bs[2]; fb.free = true; const ffree = Sf.S.physics(fb).f0; ok('D4 a grid-popped (free) string ignores the jam', Sf.S.tune(fb, ffree, Sf.now()) === ffree); fb.free = false; fb._tr = null;
    // key change -> retuned within one bar
    const t0 = E.tonicC; E.tonicC = t0 + 200; const bl = Mi.barLen(m) / (m.bpm / 60 * 4); T.run(Sf, bl * 1.1); const f2 = bs.map(b => b.tie && b.tie.f);
    ok('D5 when the jam changes key the tied strings retune within one bar (no strike needed)', bs.every(b => b.tie && b.tie.stamp.includes(Mi.tonicHz(Sf, m).toFixed(2))) && f2.every(f => f && inKey(f)), { st: bs[0].tie && bs[0].tie.stamp });
    E.tonicC = t0; T.run(Sf, bl * 1.1);
    { const P = m.sys.period || 1200, K = m.sys.cents.map((c, i) => i === 3 ? c + 100 : c); E.keyArea = { to: 'test', at: 0, cents: K }; T.run(Sf, bl * 1.1); const base = Mi.tonicHz(Sf, m), inK = f => { const c = ((1200 * Math.log2(f / base)) % P + P) % P; return K.some(q => Math.min(Math.abs(q - c), P - Math.abs(q - c)) < 1.5); };
      const okK = bs.every(b => b.tie && inK(b.tie.f)); E.keyArea = null; T.run(Sf, bl * 1.1); ok('D5b in a K section (borrowed key) the strings follow it within a bar, and come home after', okK && bs.every(b => b.tie && inKey(b.tie.f))); }
    // woven string = the owner's jam; structure (cluster) string = the cluster's jam
    { const wv = Sf.makeRod([[near.x + 900, near.y - 50], [near.x + 990, near.y - 48]], 3, { role: 'instrument', pinStart: true, pinEnd: true, meta: { woven: true, owner: near.id } }); T.run(Sf, .05); const f = Sf.S.tune(wv, Sf.S.physics(wv).f0, Sf.now());
      ok('D6 a string an ohm wove is tied to that ohm\'s jam even when it is far', wv.tie && wv.tie.gid === E.id && inKey(f)); }
    { const cl = { id: 'kTEST', members: E.members.slice(0, 2), x: near.x, y: near.y }; Sf.clusters = Sf.clusters || []; Sf.clusters.push(cl); const sb = Sf.makeRod([[near.x + 1400, near.y - 50], [near.x + 1480, near.y - 48]], 3, { role: 'structure', pinStart: true, pinEnd: true, meta: { owner: 'kTEST', string: true } });
      const f = Sf.S.tune(sb, Sf.S.physics(sb).f0, Sf.now()); Sf.clusters = Sf.clusters.filter(q => q !== cl); ok('D7 a cluster harp string sounds in the jam its members are in', sb.tie && sb.tie.gid === E.id && inKey(f)); W.removeBody ? W.removeBody(sb) : null; }
    // the jam hears the player: chord tones score higher than off-chord notes
    { const lm = E.members.find(c => c.mind && H.ok(c.mind)) ; if (lm) { const mm = lm.mind, base = Mi.tonicHz(Sf, mm), ch = { cents: [0, mm.sys.cents[2], mm.sys.cents[4]] }, now = Sf.now();
      const sc = f => { mm.hb.ev = []; H.hear(Sf, lm, { player: true, E, f, t: now - .05, vel: .8 }, true); return H.scoreOf(mm, ch, now); };
      const on = sc(base * Math.pow(2, ch.cents[1] / 1200) * 2), off = sc(base * Math.pow(2, (mm.sys.cents[1] + 0) / 1200) * 2); ok('D8 the jam hears a player string: a chord tone scores higher than an off-chord note', on > 0 && on > off, { on: +on.toFixed(2), off: +off.toFixed(2) }); }
      else ok('D8 (no member with a harmonic brain)', false); }
    { const s0 = Sf.stats.tiePlayer || 0, b = bs[1], [x, y] = W.center(b); Sf.strikeBody(b, x, y, 500, Sf.now()); ok('D9 a player strike on a tied string counts as playing with the jam (E.pl)', (Sf.stats.tiePlayer || 0) === s0 + 1 && E.pl && E.pl.length > 0); }
    // nudge: at most once per 4 bars, never a key change; no player input -> no nudge
    { E.nudgeBar = null; E.pl = []; ok('D10 no player input -> no nudge', H.nudge(Sf, E, m, 100) === 0); const base = Mi.tonicHz(Sf, m), tn = Sf.now(); for (let k = 0; k < 6; k++) E.pl.push({ t: tn - .05 * k, f: base * 4, d: 14 });
      const n1 = H.nudge(Sf, E, m, 100), n2 = H.nudge(Sf, E, m, 102), n3 = H.nudge(Sf, E, m, 104); ok('D11 dense high playing nudges up (+1), and only once per 4 bars', n1 === 1 && n2 === 0 && n3 === 1, { n1, n2, n3 }); }
    { const tn0 = E.tonicC, ka = E.keyArea; let kc = 0; E.pl = []; const rr = RS.rng(4242); T.run(Sf, 40, () => { const b = bs[(rr() * bs.length) | 0]; if (rr() < .05) { const [x, y] = W.center(b); Sf.strikeBody(b, x, y, 600, Sf.now()); } if (H.log) { } });
      ok('D12 40 s of playing along: nudges stay rare (<= 1 per 4 bars) and the strings stay in key', (Sf.stats.tieNudge || 0) <= Math.ceil(40 / (bl * 4)) && bs.filter(b => b.tie).every(b => inKey(b.tie.f)), { nudge: Sf.stats.tieNudge || 0, cap: Math.ceil(40 / (bl * 4)) }); }
  }
}
console.log(pass + '/' + tot + ' passed'); if (pass !== tot) process.exitCode = 1;
