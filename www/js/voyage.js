'use strict';
// v0.6 VOYAGES: void walking and moons settled on their own, without breaking 'ohms stay near home' or 'don't remove what Wilbow has seen'.
//  - Void walking (the 'void' ability, airless worlds): the walker used to launch and then stand frozen (Sf.voidOut was never read). Now it
//    walks the void to a neighbouring world (a moon, its planet, or the next planet), visits there for a while, and comes HOME to its own
//    home spot (round trip, 6 min). It only sets off while off-screen, never in a jam / bond / tutorial.
//  - Moons settled on their own: a grown, curious, unattached ohm on a planet with moons, off-screen, now and then sends a BUD (exact genome
//    copy, mutation 0) to a moon; the parent stays home. At most one every 20 min per world, and only when the world has >= 4 ohms.
// Travellers wait in meta.voyage (persisted with the store meta) and arrive when their world is entered (landAt: clear dry spot, any angle).
(function (G) {
const RS = G.RS, TAU = RS.TAU;
const V = RS.Voyage = {};
V.TRIP_MS = 360e3; V.MIG_COOL_MS = 1200e3; V.MIG_MIN_POP = 4; V.MAX = 8; V.TICK = 10;
const busy = c => c.dead || c.caught || c.leaving || c.jam || c.partner || c.bond || c.guide || c.scored || c.grabbed || (c.mind && c.mind.E) || c.parentId || c.youngT != null || c.cluster;
const gene = (c, k) => RS.GI && RS.GI[k] != null ? c.g[RS.GI[k]] : .5;
// where a traveller from this body can go: a moon of this planet, else its own planet, else the next planet out / in
V.dest = (sys, body, kind) => { if (!sys || !body) return null; const B = sys.bodies || [];
  if (body.moons && body.moons.length) return body.moons[RS.hash('voy', body.seed) % body.moons.length];
  if (kind === 'moon') return null;
  const par = B.find(p => p.moons && p.moons.includes(body)); if (par) return par;
  const i = B.indexOf(body); return B[i + 1] || B[i - 1] || null; };
// surface tick (every ~10 s of world time): void walkers set off; a moon bud now and then
V.tick = (Sf, nowMs) => { if (RS.VOYAGE === false) return; const tn = Sf.now(); nowMs = nowMs || Date.now();
  // void walkers (the ability marks them 'leaving' and queues them in Sf.voidOut): they rise and are gone after the launch
  for (const c of Sf.creatures) if (c.leaving && !c.dead && c.voidAt == null) c.voidAt = tn; for (const c of Sf.creatures.slice()) if (c.leaving && c.voidAt != null && tn - c.voidAt > 1.5 && !c.dead) { V.purge(Sf, c.id); Sf.removeCreature(c); Sf.stats.voidGone = (Sf.stats.voidGone || 0) + 1; }
  if (tn - (Sf._voyT || -99) < V.TICK) return; Sf._voyT = tn;
  // moon buds
  const body = Sf.body; if (!body || !body.moons || !body.moons.length || Sf.isTest === 'nomig') return; const live = Sf.creatures.filter(c => !c.dead && !c.caught && !c.leaving); if (live.length < V.MIG_MIN_POP) return;
  const last = (Sf.mods.voy && Sf.mods.voy.migT) || 0; if (nowMs - last < V.MIG_COOL_MS) return;
  const pick = live.filter(c => !busy(c) && c.growth > .9 && c.energy > .75 && gene(c, 'curiosity') > .55 && !Sf.inView(c.x, c.y, 300)).sort((a, b) => (a.id < b.id ? -1 : 1))[0]; if (!pick) return;
  if (RS.rng(RS.hash('mig', pick.id, Math.floor(nowMs / 60e3)))() > (Sf.migP == null ? .25 : Sf.migP)) return;
  Sf.mods.voy = Object.assign({}, Sf.mods.voy, { migT: nowMs }); const s = Sf.serialCreature(pick), bud = Object.assign({}, s, { id: RS.newId(), parents: [pick.id], gen: (pick.gen || 0) + 1, growth: .55, home: null, home0: null, anchor: null, nest: null, cluster: null, bond: null, rel: null, sym: null, guide: null });
  (Sf.voyOut = Sf.voyOut || []).push({ kind: 'moon', s: bud, from: Sf.key, t0: nowMs }); pick.budT = tn; Sf.stats.moonBud = (Sf.stats.moonBud || 0) + 1; };
// the ability hook queues the walker: remember its home so it comes back to the same spot
V.voidLeave = (Sf, c) => { const s = Sf.serialCreature(c); (Sf.voyOut = Sf.voyOut || []).push({ kind: 'void', s, from: Sf.key, home: c.home0 || c.anchor || [c.x, c.y], t0: Date.now() }); };
V.purge = (Sf, id) => { for (const ci in Sf.chunks) { const ch = Sf.chunks[ci]; if (ch && ch.c) ch.c = ch.c.filter(q => q.id !== id); } };
// app side: move queued travellers into meta (destination keys from keyOf(body))
V.drain = (meta, Sf, keyOf) => { const out = (Sf.voyOut || []).splice(0); if (!out.length) return 0; meta.voyage = meta.voyage || []; let n = 0;
  for (const e of out) { const d = V.dest(Sf.sys, Sf.body, e.kind); if (!d) { if (e.kind === 'void') { e.to = null; e.back = e.t0; meta.voyage.push(e); n++; } continue; } e.to = keyOf(d); if (e.kind === 'void') e.back = e.t0 + V.TRIP_MS; meta.voyage.push(e); n++; }
  if (meta.voyage.length > V.MAX) { const keep = meta.voyage.filter(e => e.kind === 'void'), mig = meta.voyage.filter(e => e.kind !== 'void'); meta.voyage = keep.concat(mig.slice(-Math.max(0, V.MAX - keep.length))); }   // walkers always come home; only the oldest buds are dropped
  return n; };
const placeNear = (Sf, s, th, lift) => { if (Sf.creatures.some(c => c.id === s.id && !c.dead)) return null; const [x, y] = Sf.landAt(th, lift, { r: 40 }); const c = Sf.loadCreature(Object.assign({}, s, { x, y, home0: null, anchor: null })); c.home0 = null; c.anchor = null; return c; };
// entering a world (or every few seconds while on it): visitors arrive, walkers whose trip is over come home, buds settle on their moon
V.arrive = (meta, Sf, key, nowMs, o = {}) => { const L = meta.voyage || []; if (!L.length) return []; const got = []; const P = Sf.P;
  for (let i = L.length - 1; i >= 0; i--) { const e = L[i];
    if (e.kind === 'void' && e.from === key && nowMs >= e.back) { const h = e.home || [e.s.x, e.s.y]; if (o.offscreen && Sf.inView(h[0], h[1], 300)) continue; const th = P.theta(h[0], h[1]); const c = placeNear(Sf, Object.assign({}, e.s, { leaving: false }), th, 40); if (c) { c.home0 = h.slice(); c.anchor = h.slice(); c.voyaged = (c.voyaged || 0) + 1; got.push(c); Sf.stats.voidHome = (Sf.stats.voidHome || 0) + 1; } L.splice(i, 1); continue; }
    if (o.returnsOnly) continue;
    if (e.kind === 'void' && e.to === key && nowMs < e.back && !Sf.creatures.some(c => c.id === e.s.id)) { const th = (RS.hash('visit', e.s.id) % 1000) / 1000 * 1200 / P.R - 600 / P.R; const c = placeNear(Sf, e.s, th, 40); if (c) { c.visitor = e.back; got.push(c); Sf.stats.voidVisit = (Sf.stats.voidVisit || 0) + 1; } continue; }
    if (e.kind === 'moon' && e.to === key) { const th = ((RS.hash('settle', e.s.id) % 1000) / 1000 - .5) * 1400 / P.R; const c = placeNear(Sf, e.s, th, 40); if (c) { c.settler = true; got.push(c); Sf.stats.moonSettle = (Sf.stats.moonSettle || 0) + 1; } L.splice(i, 1); } }
  if (RS.Teacher) for (const c of got) RS.Teacher.visit(c, key, meta.useed);   /* v0.8b2 aura (from b6): worlds / galaxies visited (teacher places layer) */
  return got; };
// visitors never become residents of the world they visit: before a save they step back into the void (their trip continues in meta)
V.unvisit = (Sf, nowMs) => { let n = 0; for (const c of Sf.creatures.slice()) if (c.visitor && !c.dead) { if (nowMs >= c.visitor || Sf.leavingNow) { V.purge(Sf, c.id); Sf.removeCreature(c); n++; } } return n; };
V.stripVisitors = Sf => { const vis = Sf.creatures.filter(c => c.visitor && !c.dead); for (const c of vis) { V.purge(Sf, c.id); Sf.removeCreature(c); } return vis.length; };
})(typeof window !== 'undefined' ? window : globalThis);
