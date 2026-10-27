// v0.6 headless check: deterministic ids, rhythm copy, slope assist, landing at any angle, voyages (void walk, moon buds), pairings #1 #5 #6 #12 #15 #16, cloud worlds.
process.env.ID_SEED = process.env.ID_SEED || '6';
const T = require('./node_env.js'), RS = global.RS, Pa = RS.Pairs, V = RS.Voyage;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const away = Sf => { const v = Sf.view; Sf.view = Object.assign({}, v, { y0: v.y0 - 4000, y1: v.y1 - 4000, cy: v.cy - 4000 }); };   // looking far up into the sky: chunks stay streamed in, nothing at home is in view
const fresh = (o = {}) => { const { Sf } = T.scene(Object.assign({ clear: true }, o)); return Sf; };
const G = (c, k, v) => { c.g[RS.GI[k]] = v; };
try {
// 1 ids
if (!ONLY || ONLY === 'ids') { RS.idReset(42); const a = [RS.newId(), RS.newId()]; RS.idReset(42); const b = [RS.newId(), RS.newId()]; RS.idReset(6); const Sf = fresh(); const c = T.add(Sf, T.plain(3), 0); const d = RS.Creature.serial(c); const c2 = Sf.loadCreature(Object.assign(JSON.parse(JSON.stringify(d)), { id: 'cLEGACY123' }));
  ok('1 test-only id seed repeats; a saved id loads unchanged', a.join() === b.join() && a[0] !== a[1] && c2.id === 'cLEGACY123', { a, legacy: c2.id }); }
// 2 rhythm copy
if (!ONLY || ONLY === 'rhythm') { const Sf = fresh(); const c = T.add(Sf, T.plain(4), 0); const q = RS.Social.copyRhythm(Sf, c, [10, 10.25, 10.5, 11]); ok('2 curiosity copies the heard rhythm (inter-onset gaps)', Array.isArray(q) && q.length >= 3 && new Set(q).size > 1, { q }); }
// 3 landing at any angle + bubble lift
if (!ONLY || ONLY === 'land') { const Sf = fresh({ sys: 0 }), P = Sf.P; let good = 0; for (const th of [0, 1, Math.PI, 4, 5.5]) { const t = Sf.landSpot(th); const [x, y] = Sf.landAt(th, 40); const alt = Math.hypot(x - P.cx, y - P.cy) - P.R - P.height(t); if (Math.abs(alt - 40) < 2 && (P.height(t) >= P.sea + 4 || P.sea < -1e8)) good++; }
  const c0 = T.add(Sf, T.plain(3), 0), s = Sf.serialCreature(c0); Sf.removeCreature(c0); const [bx, by] = P.surf(Math.PI); const got = Sf.receiveBubbles([s], bx, by + 100); const c = got[0], th = P.theta(c.x, c.y), alt = Math.hypot(c.x - P.cx, c.y - P.cy) - P.R - P.height(th);
  ok('3 arrival spots are dry and 40 px above ground at 5 angles; a bubble at theta=pi lands above ground (not inside)', good === 5 && alt > 60 && alt < 200, { good, alt: Math.round(alt) }); }
// 4 void walk round trip + visitor removal
if (!ONLY || ONLY === 'void') { const Sf = fresh({ sys: 0 }); const meta = {}; const w = T.add(Sf, T.plain(4), 300); const id = w.id; away(Sf); V.voidLeave(Sf, w); w.leaving = true; T.run(Sf, 3); const gone = !Sf.creatures.includes(w);
  V.drain(meta, Sf, b => b.kind + ':' + (b.k || 0)); const e = meta.voyage && meta.voyage[0]; const now = Date.now(); const early = V.arrive(meta, Sf, 'test', now).length; const back = V.arrive(meta, Sf, 'test', now + 4e5);
  ok('4 a void walker leaves off-screen, is away 6 min, then comes home with the same id', gone && e && e.back - e.t0 === V.TRIP_MS && early === 0 && back.length === 1 && back[0].id === id && back[0].voyaged === 1, { gone, trip: e && e.back - e.t0, early, back: back.length });
  const Sf2 = fresh({ sys: 0 }); away(Sf2); const m2 = { voyage: [{ kind: 'void', s: Sf.serialCreature(back[0]), from: 'elsewhere', to: 'test', t0: now - 1000, back: now + 2000 }] }; const vis = V.arrive(m2, Sf2, 'test', now); const v = vis[0]; const visOK = v && v.visitor; T.t += 0; v.visitor = Date.now() - 1; T.run(Sf2, 3);
  ok('4b a visitor appears on the destination and is removed off-screen once its trip is over', visOK && !Sf2.creatures.includes(v), { visitor: !!visOK, stillThere: Sf2.creatures.includes(v) }); }
// 5 moon bud
if (!ONLY || ONLY === 'moon') { const U = RS.Universe(1); let si = -1, pb = null; for (let i = 0; i < 30 && !pb; i++) { const S = RS.System(U, i); pb = S.bodies.find(b => b.moons && b.moons.length && !(RS.Planet.KIND[b.type] || {}).groundless); if (pb) si = i; }
  T.t = 0; const { Sf } = T.make({ sys: si, body: pb }); for (const c of Sf.creatures.slice()) Sf.removeCreature(c); const cs = []; for (let k = 0; k < 4; k++) { const c = T.add(Sf, T.plain(10 + k), k * 90 - 135); G(c, 'curiosity', .9); c.growth = 1; c.energy = .95; cs.push(c); } away(Sf); Sf.migP = 1; Sf.mods.voy = { migT: -1e9 };
  T.run(Sf, 12); const out = (Sf.voyOut || []).filter(e => e.kind === 'moon'); const meta = {}; V.drain(meta, Sf, b => 'k:' + b.seed); const e = (meta.voyage || []).find(q => q.kind === 'moon'); let settled = 0;
  if (e) { T.t = 0; const { Sf: M } = T.make({ sys: si, body: pb.moons[0] }); away(M); const got = V.arrive(meta, M, e.to, Date.now()); settled = got.filter(c => c.settler).length; }
  ok('5 a curious ohm on a planet with moons buds a copy that settles a moon (parent stays, mutation 0)', out.length === 1 && cs.every(c => Sf.creatures.includes(c)) && settled === 1 && JSON.stringify(Array.from(out[0].s.code)) === JSON.stringify(Array.from(RS.Creature.serial(cs.find(c => c.id === out[0].s.parents[0])).code)), { buds: out.length, settled }); }
// 6 pairings
if (!ONLY || ONLY === 'pairs') { const Sf = fresh(); away(Sf); const P = Sf.P; const mk = (x, s) => { const c = T.add(Sf, T.plain(s), x); T.run(Sf, .05); c.home0 = [c.x, c.y]; c.anchor = c.home0.slice(); c.jam = null; c.partner = null; return c; };
  const rider = mk(1450, 21), carrier = mk(1600, 22); /* the dry shore: homes never move onto wet ground */ rider.g[0] = .1; rider.mind.regOct = 1; rider.mind.oct = 0; carrier.mind.role = 'drone'; G(carrier, 'size', .8); carrier.mind.tonicC = (rider.mind.tonicC + 300) % 1200; const h0 = rider.home0.slice();
  RS.Items.lowDrone(rider) && (rider.mind.role = 'lead'); for (let k = 0; k < 3; k++) Pa.tick(Sf, 100 + k); const moved = Math.hypot(rider.home0[0] - h0[0], rider.home0[1] - h0[1]);
  ok('6a #1 rider settles beside its carrier (home moved <= 120 px, off-screen) and takes its key', (rider.sym || {}).ride === carrier.id && moved > 20 && moved <= Pa.SHIFT + 35 && Math.abs(((carrier.mind.tonicC - rider.mind.tonicC) % 1200 + 1800) % 1200 - 600) < 300, { sh: RS.Items.smallHigh(rider), ld: RS.Items.lowDrone(carrier), ride: (rider.sym || {}).ride === carrier.id, moved: Math.round(moved) });
  const deaf = mk(-300, 23), blind = mk(-200, 24); deaf.P.sense = Object.assign({}, deaf.P.sense, { deaf: true, blind: false }); blind.P.sense = Object.assign({}, blind.P.sense, { blind: true, deaf: false }); deaf.mind.bpmT = 60; blind.mind.bpm = 120; Pa.tick(Sf, 110);
  ok('6b #5 deaf ohm takes the blind ohm\'s beat', deaf.sym.db === blind.id && deaf.mind.bpmT > 80, { db: deaf.sym.db === blind.id, bpmT: Math.round(deaf.mind.bpmT) });
  const hun = mk(400, 25); G(hun, 'hunger', .9); hun.mind.perc = 0; hun.energy = .5; const e0 = hun.energy; Sf.recentNotes = [{ t: 200, f: 220, x: hun.x + 50, y: hun.y, lane: 'other', d: 1.2 }]; Pa.tick(Sf, 200.5); const fed = (Sf.stats.pairs.tailFeed || 0) > 0; Sf.recentNotes = []; Pa.tick(Sf, 215);
  ok('6c #15 a hungry ohm feeds on long note tails, rests when it is quiet', fed && hun.energy >= e0 && (Sf.stats.pairs.tailRest || 0) > 0, { fed, rest: Sf.stats.pairs.tailRest });
  const hoard = mk(700, 26), clean = mk(760, 27); G(clean, 'calm', .9); clean.mind.perc = 0; clean.item = null; const it = RS.Items.make(Sf, 'rev', hoard.x, hoard.y - 30, { force: true }); it.wear = .3; hoard.hoard = [it.uid]; for (let k = 0; k < 10; k++) Pa.tick(Sf, 300 + k);
  ok('6d #6 a calm ohm cleans a hoarder\'s worn item and is given it', it.wear <= .02 && clean.item === it && !hoard.hoard.includes(it.uid), { wear: +it.wear.toFixed(2), gift: clean.item === it });
  const gr = mk(1000, 28); gr.mind.perc = 1; const fake = { meta: { role: 'crystal' }, idx: [gr.segs[0].idx[0]] }; const inst0 = Sf.instruments; Sf.instruments = () => [fake]; Sf.recentNotes = []; for (let k = 0; k < 30; k++) { Sf.recentNotes.push({ t: 400 + k, f: 300, x: gr.x, y: gr.y, lane: gr.id, d: .2 }); Pa.tick(Sf, 400 + k); } Sf.instruments = inst0;
  const du = Pa.dustAt(Sf, gr.x, gr.y), med = Sf.mediumAt(gr.x, gr.y); const spec = { modes: [{ f: 4000, a: 1, d: 1 }] }, a1 = Sf.applyMedium(JSON.parse(JSON.stringify(spec)), Object.assign({}, med)).modes[0].a, a0 = Sf.applyMedium(JSON.parse(JSON.stringify(spec)), Object.assign({}, med, { dust: 0 })).modes[0].a;
  ok('6e #12 a percussive ohm by a crystal grinds dust (<= 16 sites) that softens high partials there', du > .4 && Sf.mods.dust.length <= Pa.DUST_MAX && a1 < a0, { dust: +du.toFixed(2), sites: Sf.mods.dust.length, a1: +a1.toFixed(3), a0: +a0.toFixed(3) });
  const Sf3 = fresh(); away(Sf3); const tri = [0, 60, 120].map((x, k) => { const c = T.add(Sf3, T.plain(31), 1400 + x); return c; }); T.run(Sf3, .05); for (const c of tri) { c.home0 = [c.x, c.y]; c.anchor = c.home0.slice(); c.jam = null; c.partner = null; c.P.inst.engName = 'same'; } Pa.tick(Sf3, 500); const sh = tri.filter(c => c.homeWhy === 'spread'); const dmv = sh.length ? Math.hypot(sh[0].home0[0] - sh[0].home00[0], sh[0].home0[1] - sh[0].home00[1]) : 0;
  ok('6f #16 three of one instrument: one moves its home away, within 120 px (+frame lift)', sh.length === 1 && dmv > 20 && dmv <= Pa.SHIFT + 35, { shifted: sh.length, d: Math.round(dmv) });
  const Sf4 = fresh(); const c4 = T.add(Sf4, T.plain(32), 0); T.run(Sf4, .05); c4.home0 = [c4.x, c4.y]; const before = c4.home0.slice(); const ok4 = Pa.shiftHome(Sf4, c4, c4.x + 100, c4.y, 'test');
  ok('6g homes never shift while on screen', !ok4 && c4.home0[0] === before[0], { shifted: ok4 }); }
// 7 cloud worlds
if (!ONLY || ONLY === 'gas') { const U = RS.Universe(1); let si = -1, gb = null; for (let i = 0; i < 40 && !gb; i++) { const S = RS.System(U, i); gb = S.bodies.find(b => (RS.Planet.KIND[b.type] || {}).groundless); if (gb) si = i; }
  T.t = 0; const { Sf } = T.make({ sys: si, body: gb }); const P = Sf.P; for (const c of Sf.creatures.slice()) Sf.removeCreature(c); const cs = []; for (let k = 0; k < 4; k++) cs.push(T.add(Sf, T.plain(40 + k), (k - 1.5) * 120)); let bad = 0, maxDepth = -1e9;
  const rock = Sf.W.bodies.size; T.run(Sf, 40, () => { for (const c of cs) { if (!isFinite(c.x) || !isFinite(c.y)) bad++; } });
  const alts = cs.map(c => Math.round(P.R - Math.hypot(c.x - P.cx, c.y - P.cy))); for (let i = 0; i < Sf.W.n; i++) if (Sf.W.fl[i] & 1) maxDepth = Math.max(maxDepth, P.R - Math.hypot(Sf.W.x[i] - P.cx, Sf.W.y[i] - P.cy));
  ok('7a cloud world: ohms float inside the cloud, each near its own home altitude (20..600 px under the deck), no NaN', P.gas && bad === 0 && alts.every(a => a >= 15 && a <= 620) && cs.every(c => c.gasAlt != null && Math.abs(P.R - Math.hypot(c.x - P.cx, c.y - P.cy) - c.gasAlt) < 60), { alts, homes: cs.map(c => c.gasAlt), bad });
  ok('7b nothing falls forever: every particle stays above the safety floor', maxDepth < -RS.Planet.GAS_FLOOR + 5, { deepest: Math.round(maxDepth), floor: -RS.Planet.GAS_FLOOR });
  const c = cs[0]; c.grabbed = true; const [gx, gy] = [c.x, c.y]; T.run(Sf, .5); c.grabbed = false; for (const b of c.segs) for (const i of b.idx) { Sf.W.y[i] -= 500; Sf.W.py[i] -= 500; } T.run(Sf, 25); const alt2 = P.R - Math.hypot(c.x - P.cx, c.y - P.cy);
  ok('7c an ohm lifted above the deck falls back into the cloud and returns to its home altitude', Math.abs(alt2 - c.gasAlt) < 60, { alt: Math.round(alt2), home: c.gasAlt });
  const med = Sf.mediumAt(cs[1].x, cs[1].y); ok('7d the cloud is air for sound (not muffled like water)', !med.water && med.atmo > .5, { water: med.water, atmo: med.atmo });
  const sys = RS.System(U, si); const S2 = RS.Surface({ M: RS.Music(7), A: T.A, sys, body: gb, key: 'legacy', useed: 1, mods: { water: 0, light: 0, cloud: 0 } });
  ok('7e a giant saved before v0.6 (mods.cloud = 0) keeps its solid ground', !S2.P.gas && S2.P.sea < -1e8 && S2.W.grav.terrain === S2.P, { gas: S2.P.gas }); }
} catch (e) { ok('no crash', false, e.stack.split('\n').slice(0, 4).join(' | ')); }
console.log(`v0.6: ${res.filter(Boolean).length}/${res.length} passed`); process.exitCode = res.every(Boolean) ? 0 : 1;
