'use strict';
// World events that make sound and are visible in normal play:
//  S5 weather + geology: lightning (+ thunder delayed by distance), rain drips on instruments, wind swells, volcano eruptions, quakes, geyser whistles
//  S6 rare cosmic events: stellar flares, a supernova, black-hole accretion chirps, pulsar ticks (rarity seeded per system, from star physics)
//  S9 procedural discoveries: fossil genes (bones you can wake), monoliths (touch -> the world modulates), meteorites (fall, ring like bells, may carry a seed)
// Everything is seeded (planet/system seeds + grid step), quantised by the gate and in key.
(function (G) {
const RS = G.RS, TAU = Math.PI * 2;
// per-system cosmic traits (rare)
RS.cosmicOf = (sys, SP) => { const r = RS.rng(RS.hash('cosmic', sys.seed)); const T = sys.star.T; return { flareRate: T < 4000 ? .35 : T < 6000 ? .15 : .06, supernova: r() < .06 || (SP && SP.puls.kind === 'Mira' && r() < .3), blackHole: r() < .04, pulsar: r() < .06 }; };
// per-planet geology (separate random stream so v0.1 landmarks stay identical)
RS.geoOf = (P, body) => { const r = RS.rng(RS.hash('geo', P.seed || body.seed || 1)), hot = (body.temp || .5) > .55, rocky = body.type === 'rocky' || body.type === 'ark' || body.type === 'ocean', gas = body.type === 'gas' || body.type === 'ringed', g = { volcanoes: [], monolith: null, fossils: [], active: 0 };
  if (gas) return g; const nv = hot ? 1 + (r() < .5 ? 1 : 0) : (rocky && r() < .35 ? 1 : 0); for (let k = 0; k < nv; k++) g.volcanoes.push({ th: r.range(0, TAU), size: r.range(.8, 1.4), phase: r.int(0, 31) });
  g.active = RS.clamp(nv * .4 + (hot ? .3 : .1) + r() * .2, 0, 1); if (r() < .3 || body.ark) g.monolith = { th: body.ark ? .9 : r.range(0, TAU) }; const nf = r() < .6 ? 1 : 0; for (let k = 0; k < nf; k++) g.fossils.push({ th: r.range(0, TAU), seed: RS.hash('fossil', P.seed || 1, k) });
  return g; };
// a fossil genome: an extinct lineage of this world (deterministic), with its own ancient tuning
RS.fossilGenome = seed => { const g = RS.Genome.random(seed); g[164] = RS.Genome.enc.key(((seed >>> 3) % 7 - 3) * 100); g[166] = RS.Genome.enc.phase(.5); return g; };
RS.Events = (Sf) => { const M = Sf.M, W = Sf.W, P = Sf.P, E = { built: new Map(), log: [] }, sys = Sf.sys, C = RS.Creature;
  E.geo = RS.geoOf(P, Sf.body); E.cos = RS.cosmicOf(sys, Sf.SP); Sf.geo = E.geo; Sf.cosmic = E.cos;
  const note = (k, x, y) => { Sf.stats[k] = (Sf.stats[k] || 0) + 1; E.log.push({ k, t: Sf.now(), x, y }); if (E.log.length > 60) E.log.shift(); };
  const deg = (d, ch) => M.degHz(d, ch || 0);
  const rumble = (tg, x, y, gain, len = 1.6, kind = 'rumble') => Sf.play({ modes: [{ f: 38, a: 1, d: len }, { f: 55, a: .7, d: len * .8 }, { f: 81, a: .4, d: len * .6 }, { f: 120, a: .2, d: len * .4 }], gain, att: .08, send: .6, kind, lane: 'env' }, tg, x, y);
  const inView = (x, y, m) => Sf.inView(x, y, m);
  // build/unbuild discovery sites near the view
  const site = (key, th, make) => { const F = Sf.frameAt(th), near = Math.hypot(F.sx - Sf.view.cx, F.sy - Sf.view.cy) < 1600; const b = E.built.get(key); if (near && !b) { const made = make(F); E.built.set(key, made); } else if (!near && b) { for (const q of b) if (q && W.bodies.has(q.id)) W.removeBody(q); E.built.delete(key); } return E.built.get(key); };
  const at = (F, u, v) => [F.sx + F.tx * u + F.ux * v, F.sy + F.ty * u + F.uy * v];
  E.sites = () => {
    E.geo.volcanoes.forEach((v, k) => site('v' + k, v.th, F => { const w = 110 * v.size, h = 70 * v.size; v.F = F; return [Sf.makeBlob([at(F, -w, -4), at(F, -w * .25, h), at(F, w * .25, h), at(F, w, -4)], { role: 'rock', pinBottom: true, meta: { volcano: k }, mat: { mass: 20, stiff: 1, pressure: 1, fric: .8 } })].filter(Boolean); }));
    if (E.geo.monolith) site('mono', E.geo.monolith.th, F => { const b = Sf.makeRod([at(F, 140, 0), at(F, 140, 120)], 18, { role: 'crystal', pinStart: true, pinEnd: false, meta: { monolith: true }, mat: { stiff: 1, bendK: 2, clear: 0, mass: 30 } }); if (b) W.pin(b.idx[b.idx.length - 1]); return [b].filter(Boolean); });
    E.geo.fossils.forEach((f, k) => site('f' + k, f.th, F => { const out = []; for (let q = 0; q < 5; q++) out.push(Sf.makeRod([at(F, -50 + q * 22, 1), at(F, -44 + q * 22, 10 + (q % 2) * 6)], 4, { role: 'instrument', pinStart: true, meta: { fossil: k, seed: f.seed }, mat: { stiff: 1, bendK: 1 } })); return out.filter(Boolean); })); };
  // ---- S9 interactions (called from Sf.tap / Sf.doubleTap)
  E.tapped = (b, x, y) => { if (!b || !b.meta) return null;
    if (b.meta.monolith) { // the monolith hums the universe's home chord; touching it twice in a bar modulates the world (a key change everyone hears)
      const t = Sf.now(), tg = M.nextGrid(t).t; [0, 2, 4, 7].forEach((d, i) => Sf.play({ modes: [{ f: deg(d - 7, 0), a: 1, d: 3 }, { f: deg(d - 7, 0) * 2, a: .2, d: 2 }], gain: .05, att: .25, send: .7, player: true, chordTone: true, lane: 'monolith' }, tg + i * .02, x, y)); Sf.fx({ k: 'bloom', x, y, col: [200, 210, 255], dur: 2.5, r: 90 });
      if (E.monoT && t - E.monoT < M.barDur() && Sf.modulateTo) { Sf.modulateTo(((Sf.keyC || 0) + 700) % 1200); note('monolithModulations', x, y); } E.monoT = t; note('monolithTouches', x, y); return 'monolith'; }
    if (b.meta.fossil != null) { // bones remember an extinct song: its motif plays when you touch them
      const g = RS.fossilGenome(b.meta.seed), mo = RS.Genome.motifOf(g); let t = M.nextGrid(Sf.now()).t; for (let k = 0; k < 4; k++) { if (mo.p[k] != null) Sf.play({ modes: [{ f: deg(mo.p[k]), a: 1, d: .6 }, { f: deg(mo.p[k]) * 3, a: .15, d: .3 }], gain: .06, att: .01, send: .6, player: true, lane: 'fossil' }, t, x, y); t += M.dt16() * 2; } note('fossilSongs', x, y); return 'fossil'; }
    return null; };
  E.doubleTapped = (b, x, y) => { if (!b || !b.meta || b.meta.fossil == null) return null; const k = 'woke' + b.meta.seed; if (E[k]) return null; E[k] = true; // wake the fossil: an egg of the extinct lineage
    const g = RS.fossilGenome(b.meta.seed); const c = Sf.addCreature(g, x, y - 30, { distinct: true, growth: .4 }); c.fossil = true; Sf.fx({ k: 'bloom', x, y, col: [230, 220, 180], dur: 2, r: 70 }); note('fossilsWoken', x, y); return { k: 'fossil', c }; };
  // ---- per grid step
  E.onGrid = (g, tg) => { const v = Sf.view, cx = v.cx, cy = v.cy, bar = Math.floor(g / 16), st = ((g % 16) + 16) % 16, rr = RS.rng(RS.hash('ev', sys.seed, P.seed || 0, g));
    if (st === 0) E.sites();
    // lightning in storms: bolt now, thunder after the sound travels (quantised), instruments near the strike ring
    if (Sf.weather.storm && st % 8 === 4 && rr() < .35) { const x0b = v.x0 + rr() * (v.x1 - v.x0), x = RS.Field ? RS.Field.boltX(Sf, [x0b, v.x0 + RS.rng(RS.hash('bolt', st, Sf.lastG || 0))() * (v.x1 - v.x0)]) : x0b, gy = Sf.ground(x), pts = [[x + (rr() - .5) * 80, v.y0 - 50]]; for (let k = 1; k <= 8; k++) pts.push([x + (rr() - .5) * 40 * (1 - k / 9), v.y0 - 50 + (gy - v.y0 + 50) * k / 8]);
      Sf.fx({ k: 'bolt', pts, t: tg, dur: .35 }); Sf.flash = tg; const d = Math.hypot(x - cx, gy - cy); rumble(tg + d / 1100 + .05, x, gy, .06, 2.4, 'thunder'); note('lightning', x, gy);
      const hit = Sf.instruments().find(b => { const [bx, by] = W.center(b); return Math.hypot(bx - x, by - gy) < 140; }); if (hit) { const [bx, by] = W.center(hit); Sf.strikeBody(hit, bx, by, 600, tg, { auto: true, noImpulse: true }); } }
    // rain: drops ring instruments softly (pitched drips, in key)
    if (Sf.weather.rain > 0 && st % 2 === 1 && rr() < .5) { const ins = Sf.instruments().filter(b => { const [bx, by] = W.center(b); return inView(bx, by, 0); }); const x = v.x0 + rr() * (v.x1 - v.x0); Sf.play({ modes: [{ f: deg(7 + Math.floor(rr() * 7)), a: 1, d: .18 }, { f: deg(14 + Math.floor(rr() * 5)), a: .3, d: .1 }], gain: .025, att: .002, send: .5, kind: 'drip' }, tg, x, v.y0 + 40);
      if (ins.length && rr() < .3) { const b = ins[Math.floor(rr() * ins.length)], [bx, by] = W.center(b); Sf.strikeBody(b, bx, by, 160, tg, { auto: true, soft: true, noImpulse: true }); } note('drips', x, 0); }
    // wind: a breathy swell on strong-wind bars
    if (Math.abs(Sf.wind[0]) > 150 && st === 0) { Sf.play({ modes: [300, 450, 610, 820].map((f, k) => ({ f: f * (1 + rr() * .02), a: 1 / (k + 1), d: 2.2 })), gain: .02 * Math.min(2, Math.abs(Sf.wind[0]) / 250), att: .8, send: .7, kind: 'wind', glide: 1.0004 }, tg, cx, cy); note('windSwells', cx, cy); }
    // volcanoes erupt on their own long cycle: rumble, a deep tonic drone, glowing lava stones thrown out
    E.geo.volcanoes.forEach((vo, k) => { if (((bar + vo.phase) % 32) !== 0 || st !== 0) return; const F = Sf.frameAt(vo.th), [x, y] = at(F, 0, 70 * vo.size); vo.lastErupt = tg; rumble(tg, x, y, .07, 3, 'rumble'); Sf.play({ modes: [{ f: deg(-14), a: 1, d: 4 }, { f: deg(-14) * 2, a: .3, d: 3 }, { f: deg(-10), a: .4, d: 3 }], gain: .045, att: .6, send: .6, lane: 'volcano', grid: true, chordTone: true }, tg, x, y); Sf.fx({ k: 'bloom', x, y, col: [255, 120, 40], dur: 3, r: 80 });
      Sf.erupting = Sf.now(); if (inView(x, y, 300)) for (let q = 0; q < 3; q++) { const b = Sf.makeBlob(Sf.circle(x + (q - 1) * 12, y - 10, 6, 8), { role: 'light', meta: { wl: 640, lava: true, die: Sf.now() + 20 }, mat: { mass: 3, stiff: .97, pressure: 1 } }); if (b) for (const i of b.idx) { W.px[i] = W.x[i] - (q - 1) * 1.5 - F.ux * 4; W.py[i] = W.y[i] - F.uy * 4; } } note('eruptions', x, y); });
    // quakes on geologically active worlds: one bar of shaking, a rumble on each beat, loose things hop and resting instruments ring once
    if (E.geo.active > .45 && bar % 48 === 24) { if (st === 0) { Sf.shakeT = tg; Sf.shakeDur = M.barDur(); note('quakes', cx, cy); for (const b of W.bodies.values()) { if (!b.meta || b.meta.role === 'ground' || b.meta.role === 'water') continue; const [bx, by] = W.center(b); if (!inView(bx, by, 200)) continue; const soft = b.meta.role === 'creature' || b.meta.role === 'limb'; for (const i of b.idx) if (W.im[i] > 0) W.py[i] = W.y[i] + (soft ? .3 + .25 * rr() : 1 + rr()); }   /* v0.5c: ohms only bob in a quake (the old 1-2 px kick sent them near the 220 px/s 'launched' line) */ for (const b of Sf.instruments().slice(0, 4)) { const [bx, by] = W.center(b); if (inView(bx, by, 0)) Sf.strikeBody(b, bx, by, 220, tg + M.beatDur(), { auto: true, noImpulse: true }); } }
      if (st % 4 === 0) rumble(tg, cx, cy, .05, 1, 'quake'); }
    // geysers whistle as they puff (rising glide)
    if (Sf.geysers && g % 32 === 0) for (const q of Sf.geysers) if (inView(q.x, q.y, 400)) Sf.play({ modes: [{ f: deg(7), a: 1, d: 1.2 }, { f: deg(7) * 2, a: .25, d: .8 }], gain: .022, att: .15, send: .6, glide: 1.00008, kind: 'geyserWhistle', grid: true }, tg, q.x, q.y);
    // ---- S6 cosmic: flares (cool active stars more), a supernova once per visit in doomed systems, black-hole chirps, pulsar ticks
    if (st === 0 && bar % 8 === 4 && rr() < E.cos.flareRate) { Sf.flare = { t: tg, dur: M.barDur() * 2 }; Sf.env.bright = Math.min(3, (Sf.env.bright || 1) + .25); setTimeoutBar(() => { Sf.env.bright = Math.max(0, Sf.env.bright - .25); }, 2); [7, 11, 14].forEach((d, i) => Sf.play({ modes: [{ f: deg(d), a: 1, d: 2.5 }, { f: deg(d) * 2, a: .3, d: 1.5 }], gain: .025, att: .5, send: .8, lane: 'star', kind: 'flare', grid: true }, tg + i * M.dt16(), cx, cy)); for (const c of Sf.creatures) c.energy = Math.min(1, c.energy + .05); note('flares', cx, cy); }
    if (E.cos.supernova && !E.snDone && bar === 96 && st === 0) { E.snDone = true; Sf.supernova = { t: tg, x: rr() * .6 - .3, y: -.5 - rr() * .3 }; Sf.play({ modes: [-14, -7, 0, 4, 7].flatMap((d, k) => [{ f: deg(d), a: 1 - k * .1, d: 8 }, { f: deg(d) * 2, a: .2, d: 5 }]), gain: .05, att: 2.5, send: .9, lane: 'star', kind: 'supernova', grid: true }, tg, cx, cy); note('supernovae', cx, cy); }
    if (E.cos.blackHole && st === 8 && bar % 16 === 8) { Sf.bhChirp = tg; Sf.play({ modes: [{ f: deg(-7), a: 1, d: 2.2 }, { f: deg(-7) * 1.5, a: .3, d: 1.5 }], gain: .03, att: .9, send: .8, glide: 1.0003, lane: 'star', kind: 'accretion', grid: true }, tg, cx, cy); note('bhChirps', cx, cy); }
    if (E.cos.pulsar && st % 2 === 0) { Sf.pulsarT = tg; Sf.play({ modes: [{ f: deg(21), a: 1, d: .04 }], gain: .012, att: .001, send: .3, lane: 'star', kind: 'pulsar', grid: true }, tg, cx, cy); if (st === 0) note('pulsarBars', cx, cy); }
    // ---- S9 meteorites: a streak across the sky, a thump, a metal stone that rings like a bell; one in four carries a seed (an egg from another world)
    if (st === 12 && bar % 64 === 40 && rr() < .7) { const x = v.x0 + (.2 + rr() * .6) * (v.x1 - v.x0), gy = Sf.ground(x); Sf.fx({ k: 'meteor', x0: x - 260, y0: v.y0 - 80, x, y: gy - 8, t: tg, dur: .6 }); rumble(tg + M.dt16() * 2, x, gy, .05, 1.2, 'rumble');
      const b = Sf.makeBlob(Sf.circle(x, gy - 14, 10, 9), { role: 'instrument', meta: { meteorite: true }, mat: { stiff: .995, mass: 9, pressure: 1, rigid: .95, hard: .95, loss: .04, grain: 0, density: 1 } });
      { const dr = Sf.seedPool && Sf.seedPool.take(); if (dr) { Sf.layEggFrom(RS.Genome.fromCode(dr.code), x + 16, gy - 20); Sf.stats.driftSeeds = (Sf.stats.driftSeeds || 0) + 1; } else if (rr() < .25 && Sf.layEggFrom) Sf.layEggFrom(RS.Genome.random(RS.hash('meteorseed', sys.seed, g)), x + 16, gy - 20); } note('meteorites', x, gy); } };
  const setTimeoutBar = (fn, bars) => { E.later = E.later || []; E.later.push({ t: Sf.now() + bars * M.barDur(), fn }); };
  E.tick = () => { if (!E.later || !E.later.length) return; const t = Sf.now(); E.later = E.later.filter(e => { if (e.t <= t) { e.fn(); return false; } return true; }); };
  return E; };
})(typeof window !== 'undefined' ? window : globalThis);
