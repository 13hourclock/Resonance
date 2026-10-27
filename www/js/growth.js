'use strict';
// v0.5a GROWTH ENGINE: plants grown from nearby sound, jam seeds that replay a whole jam, history traces.
// Organic, never stamped: each pulse of growth is shaped by the music heard at that moment, seeded by plant id + step.
//  PHI + FIBONACCI: stem segments shrink by powers of phi (with jitter); side shoots alternate by the golden angle (137.5 deg)
//    and fork at Fibonacci tip ages (3, 5, 8, 13...); at most 1/2/3 new segments per pulse, <= 8 tips; flowers are Vogel
//    golden-angle seed discs whose counts step 8 -> 13 -> 21 -> 34 as the plant matures.
//  SOUND MAPPING: consonance vs the plant's key -> regular, tighter growth; dissonance -> jitter, twist, curl (golden-spiral
//    coil) and a slight contraction; brightness -> sharper leaves; tempo / note rate -> growth rate; key -> hue;
//    loudness -> vigour (segment length); silence -> no growth at all.
//  JAM SEEDS (#10 seed carrier): when a settled jam completes its 24-bar form coherently (RS.Jam.seedCheck), one member
//    carries the glowing seed home and plants it a short walk from its anchor. The jam plant replays the jam's motifs
//    quietly, in the jam's key and tempo, with more voices (1, 2, 3, 5) and gentle re-voicing as it matures; it yields to
//    a busy crowd.
//  #9 gardener: an ohm whose home is by a plant counts double for it, and perks up when the plant flowers.
//  #11 plant chorus: lone ohms by a replaying jam plant drift into its tempo (learned; the genome never changes).
//  HISTORY TRACES: places where jams and conversations happen get faint glowing ground seams that build with time spent
//    there and fade slowly (3-day half-life) to a floor; never removed.
//  TIME PASSES OFFLINE: on load, plants keep growing from their remembered surroundings (slowly, capped).
// Pack key 'grow' (not mods, so the meta stays small). No gestures, no text, cheap (2 s tick; per-beat replay only).
(function (G) { const RS = G.RS; const Gr = RS.Grow = {}; const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2, PHI = (1 + Math.sqrt(5)) / 2, GA = TAU * (1 - 1 / PHI), BA = TAU / Math.pow(PHI, 4);   // golden angle 137.5 deg; branch angle 52.5 deg
const FIB = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];
Gr.PHI = PHI; Gr.GA = GA; Gr.FIB = FIB;
Gr.on = () => RS.GROW !== false;
Gr.TICK = 2; Gr.STEP = 90; Gr.MAXN = 96; Gr.MAXP = 24; Gr.TIPS = 8; Gr.HEAR = 520; Gr.GARDEN = 240; Gr.CHORUS = 340; Gr.TRACES = 40; Gr.OFF_MAX = 3 * 86400; Gr.OFF_STEPS = 30;
const st = Sf => Sf.grow || (Sf.grow = { plants: [], traces: [], carry: [], n: 0 });
Gr.st = st;
const rng = (...k) => RS.rng(RS.hash('grow', ...k));
const rnd = (...k) => rng(...k)();
const stat = (Sf, k, n = 1) => { const s = Sf.stats.grow || (Sf.stats.grow = {}); s[k] = (s[k] || 0) + n; };
const live = c => c && !c.dead && !c.caught && !c.leaving && c.mind;
const free = c => !c.jam && !c.partner && !(c.mind && c.mind.E) && !c.grabbed && !c.caught;
const hueOf = hz => ((((1200 * Math.log2(hz / 55)) % 1200) + 1200) % 1200) / 1200 * 360;
const CONS = [0, 1200, 702, 498, 386, 316, 884, 814, 969, 1018];   // just-ish consonances vs the plant's tonic
Gr.cons = (f, tonic) => { const c = ((1200 * Math.log2(f / tonic)) % 1200 + 1200) % 1200; let d = 1e9; for (const k of CONS) d = Math.min(d, Math.abs(c - k)); return d < 35 ? 1 : d < 70 ? .5 : 0; };
Gr.maturity = p => clamp(p.n.length / Gr.MAXN + p.fl.length * .04, 0, 1);
// local plant frame: lx along the ground tangent, ly up (away from the planet centre)
/* v0.6.1 CLOUD FLORA: on a cloud world plants root in the underside of the cloud deck and grow DOWN (hanging), same engine, same music mapping, same budgets */
Gr.hang = Sf => Sf.P && Sf.P.gas ? -1 : 1;
Gr.at = (Sf, th) => Sf.P.gas ? Sf.P.top(th) : Sf.P.surf(th);
Gr.world = (Sf, p, lx, ly) => { const b = p._b || (p._b = Gr.at(Sf, p.th)), s = Math.sin(p.th), c = Math.cos(p.th), hy = ly * Gr.hang(Sf); return [b[0] + c * lx + s * hy, b[1] + s * lx - c * hy]; };
Gr.base = (Sf, p) => p._b || (p._b = Gr.at(Sf, p.th));
const land = (Sf, th) => { const P = Sf.P; if (P.gas) return true; if (!(P.height(th) > P.sea + 2)) return false; const [x, y] = P.surf(th); return !(Sf.mediumAt && Sf.mediumAt(x, y - 6).water); };
// ---------------- planting ----------------
Gr.plant = (Sf, th, o = {}) => { const g = st(Sf); if (g.plants.length >= Gr.MAXP) return null; const id = ++g.n + '' + (Math.floor(rnd('id', Sf.seed || 0, g.n, th) * 1e4));
  const hz = o.hz || 220, p = { id, k: o.kind || 'wild', th, hz, h: hueOf(hz), b: Date.now(), s: 0, acc: 0, cu: 0, am: [0, .5], r: [], n: [[-1, 0, 0, 0, 0, 0, 0]], tp: [0], fl: [], bk: 0, lf: 0, sg: rnd('sg', id) < .5 ? -1 : 1, sd: o.seed || null, by: o.by || null, L0: o.kind === 'jam' ? 12 : 9, t0: null };
  g.plants.push(p); const s0 = { act: .6, vel: .5, cons: 1, coh: .6, bright: .5 }; for (let k = 0; k < (o.kind === 'jam' ? 2 : 1); k++) Gr.pulse(Sf, p, s0);   // a visible sprout
  stat(Sf, o.kind === 'jam' ? 'jamPlant' : 'sprout'); p.pt = Sf.now(); return p; };
// ---------------- one pulse of growth ----------------
Gr.pulse = (Sf, p, s) => { const r = rng(p.id, p.s), N = p.n; p.s++; const dis = 1 - s.cons, jit = (.05 + .4 * dis) * (p.sty ? .6 + .8 * p.sty[1] : 1);   /* v0.5b #9: the gardeners' style shapes the growth: lively, hard-played singing grows a wilder plant, gentle singing a calmer one */
  p.cu = clamp(p.cu + (dis > .55 ? .16 : -.08), 0, 1); p.r.push([Math.round(s.cons * 9), Math.round(clamp(s.act, 0, 1) * 9), Math.round(s.coh * 9)]); if (p.r.length > 34) p.r.splice(0, p.r.length - 34);
  const m = Gr.maturity(p);
  // flowering: consonant + coherent music opens a tip into a golden seed disc; open discs fill out to the next Fibonacci count
  if (s.cons > .62 && s.coh > .45 && N.length >= 21) { for (const f of p.fl) if (f.k < 34 && r() < .5) { f.k = FIB[FIB.indexOf(f.k) + 1]; } const tip = p.tp.find(i => N[i][5] >= 5);
    if (tip != null && p.fl.length < 5 && r() < .6) { p.fl.push({ i: tip, k: [8, 8, 13, 21][Math.min(3, Math.floor(m * 4))], h: Math.round(s.bright * 40) }); p.tp = p.tp.filter(i => i !== tip); p.flT = Sf.now(); stat(Sf, 'flower'); if (p.onFlower) p.onFlower(p); Gr.flowered(Sf, p); } }
  if (N.length >= Gr.MAXN) return;
  if (!p.tp.length) { p.tp.push(N.length); N.push([0, 0, 0, (p.bk++ % 2 ? 1 : -1) * BA * .5, 1, 0, 0]); }
  const budget = 1 + (s.act > .6 ? 1 : 0) + (s.cons > .7 && s.coh > .5 ? 1 : 0), tips = p.tp.slice().sort((a, b) => N[a][4] - N[b][4] || a - b).slice(0, budget);
  for (const i of tips) { if (N.length >= Gr.MAXN) break; const t = N[i], d = t[4], age = t[5];
    let L = p.L0 * Math.pow(PHI, -d) * Math.pow(PHI, -age / 13) * (.7 + .5 * clamp(s.vel, 0, 1)) * (1 + (r() - .5) * jit) * (1 - .25 * p.cu) * (p.wetT != null && Sf.now() - p.wetT < 600 && Sf.now() >= p.wetT ? 1.15 : 1);   /* v0.8 B: water carried here by ohms: +15% vigour for 10 min (capped, not stacking) */
    L = Math.max(2.5, L); let a = t[3] * (d ? .94 : .8) + p.sg * p.cu * .5 * (1 + d * .3) + (r() - .5) * jit;   // tropism up; dissonance coils the tip into a spiral
    const nx = t[1] + L * Math.sin(a), ny = Math.max(1.5, t[2] + L * Math.cos(a)), j = N.length; N.push([i, +nx.toFixed(1), +ny.toFixed(1), +a.toFixed(3), d, age + 1, 0]); p.tp[p.tp.indexOf(i)] = j;
    if (d <= 1 && N.length < Gr.MAXN && r() < .55) { const side = Math.cos(++p.lf * GA) > 0 ? 1 : -1, la = a + side * (.9 + .4 * s.bright), ll = L * (.55 + .2 * r()); N.push([j, +(nx + ll * Math.sin(la)).toFixed(1), +(ny + ll * Math.cos(la)).toFixed(1), +la.toFixed(3), d + 1, 0, 1]); }   // leaf, golden-angle phyllotaxis
    if (FIB.includes(age + 1) && age + 1 >= 3 && d < 3 && p.tp.length < Gr.TIPS && N.length < Gr.MAXN - 2) { const k = s.cons > .7 && s.act > .8 ? 2 : 1;
      for (let b = 0; b < k && p.tp.length < Gr.TIPS; b++) { const side = Math.sin((++p.bk + .5) * GA) > 0 ? 1 : -1, ang = a + side * BA * (1 + (r() - .5) * jit * 2); p.tp.push(N.length); N.push([j, +nx.toFixed(1), +ny.toFixed(1), +ang.toFixed(3), d + 1, 0, 0]); }
      stat(Sf, 'branch'); } }
  p.ver = (p.ver || 0) + 1; };
// ---------------- hearing ----------------
Gr.hear = (Sf, p, tn, win, gard) => { const R = Sf.onRing || [], [bx, by] = Gr.base(Sf, p); let w = 0, n = 0, vel = 0, cons = 0, br = 0;
  for (let i = R.length - 1; i >= 0; i--) { const e = R[i]; if (e.t < tn - win - 2) break; if (e.t > tn - win && e.t <= tn + .5 && !e.pl && e.f && Math.hypot(e.x - bx, (e.y == null ? by : e.y) - by) < Gr.HEAR) { const k = gard && gard.has(e.id) ? 2 : 1; w += k; n++; vel += (e.v == null ? .5 : e.v) * k; cons += Gr.cons(e.f, p.hz) * k; br += clamp(Math.log2(e.f / 110) / 4, 0, 1) * k; } }
  let coh = 0; for (const j of Sf.jams || []) if (j.members && j.members.length > 1 && Math.hypot((j.x || j.members[0].x) - bx, (j.y || j.members[0].y) - by) < 700) coh = Math.max(coh, j.coh || 0);
  if (Sf.convs) for (const c of Sf.convs.values()) if (c.seen > tn - 3 && Math.hypot(c.a.x - bx, c.a.y - by) < 700) coh = Math.max(coh, (c.coh || 0) * .8);
  return { n, act: clamp(w / (win * 2.5), 0, 1.5), vel: w ? vel / w : 0, cons: w ? cons / w : 0, bright: w ? br / w : .5, coh }; };
// v0.5b #10 root resonance: ohms within ROOT px of a plant's base are linked through the roots to ohms on other plants' roots (up to ROOTFAR away)
Gr.ROOT = 110; Gr.ROOTFAR = 2600;
Gr.roots = (Sf, c) => { const g = Sf.grow; if (!Gr.on() || !g || g.plants.length < 2 || !c || c.dead) return []; let mine = null; for (const p of g.plants) { const [bx, by] = Gr.base(Sf, p); if (Math.hypot(c.x - bx, c.y - by) < Gr.ROOT) { mine = p; break; } } if (!mine) return [];
  const [mx, my] = Gr.base(Sf, mine), out = []; for (const p of g.plants) { if (p === mine) continue; const [bx, by] = Gr.base(Sf, p); const D = Math.hypot(bx - mx, by - my); if (D > Gr.ROOTFAR || D < Gr.ROOT * 2) continue;
    for (const o of Sf.creatures) if (o !== c && live(o) && Math.hypot(o.x - bx, o.y - by) < Gr.ROOT) out.push(o); } if (out.length) { stat(Sf, 'rootCarry'); const tn = Sf.now(); if (!(mine.rootFx > tn - 3)) { mine.rootFx = tn; Sf.fx({ k: 'rootPulse', a: c, b: out[0], dur: 1.5 }); } } return out; };
Gr.flowered = (Sf, p) => { for (const c of Sf.creatures) if (live(c) && p._gard && p._gard.has(c.id)) { c.energy = Math.min(1, (c.energy == null ? .5 : c.energy) + .08); stat(Sf, 'gardenPerk'); } };
// ---------------- the 2 s tick (+ the per-beat replay) ----------------
Gr.tick = Sf => { if (!Gr.on() || !Sf.P) return; const tn = Sf.now(), g = st(Sf); Gr.carryTick(Sf, tn); Gr.onwardTick(Sf, tn); for (const p of g.plants) if (p.k === 'jam') Gr.play(Sf, p, tn);
  if (Sf._grT != null && tn - Sf._grT < Gr.TICK && tn >= Sf._grT) return; const dt = Sf._grT == null || tn < Sf._grT ? Gr.TICK : Math.min(6, tn - Sf._grT); Sf._grT = tn;
  const cs = Sf.creatures.filter(live);
  for (const p of g.plants) { const [bx, by] = Gr.base(Sf, p), gard = new Set(); for (const c of cs) { const a = c.anchor || [c.x, c.y]; if (Math.hypot(a[0] - bx, a[1] - by) < Gr.GARDEN) gard.add(c.id); } p._gard = gard;   // #9 gardeners
    const s = Gr.hear(Sf, p, tn, dt, gard); if (s.n) { p.am[0] += (s.act - p.am[0]) * .03; p.am[1] += (s.cons - p.am[1]) * .05; if (gard.size) { stat(Sf, 'gardenHear'); const sty = p.sty || (p.sty = [.5, .5]); sty[0] += (s.bright - sty[0]) * .1; sty[1] += (s.vel - sty[1]) * .1; } } else p.am[0] *= .995;
    if (!s.n) continue;   // silence: no growth
    p.acc += dt / Gr.STEP * s.act * (.6 + .4 * s.vel) * (1 + .6 * s.coh) * (s.cons > .6 ? 1.3 : 1); p.last = s;
    if (!Number.isFinite(p.acc)) p.acc = 0; if (p.acc > 8) p.acc = 8; while (p.acc >= 1) { p.acc -= 1; Gr.pulse(Sf, p, s); stat(Sf, 'pulse'); } }
  // v0.5b #9: a tended plant hums a quiet drone (its own root) that its gardeners play over
  for (const p of g.plants) { if (p.k === 'jam' || !p._gard || !p._gard.size || Gr.maturity(p) < .25 || p.am[0] < .05) continue; const [bx, by] = Gr.base(Sf, p); if (Sf.view && Sf.view.x0 != null && !Sf.inView(bx, by, 300)) continue; if (p.humT != null && tn - p.humT < 10 && tn >= p.humT) continue;
    const R = Sf.onRing || (Sf.onRing = []), hw = tn + .05; let k = 0; for (let i = R.length - 1; i >= 0; i--) { const e = R[i]; if (e.t < tn - 8) break; if (e.pl && Math.abs(e.x - bx) < 700 && Math.abs(e.t - hw) < (e.bl || 1) - 1e-6) k++; } if (k >= 2) continue;   /* v0.6.2: the hum counts toward the shared 2-plant-notes-a-beat cap (waits a tick if a jam plant already has 2 in this beat) */
    p.humT = tn; R.push({ t: hw, x: bx, y: by - 20, id: 'h' + p.id, f: p.hz / 2, v: .1, pl: 1 }); if (R.length > 256) R.splice(0, 64);
    Sf.play({ modes: [{ f: p.hz / 2, a: 1, d: 8 }, { f: p.hz, a: .25, d: 6 }, { f: p.hz * 1.5, a: .1, d: 5 }], gain: .006 + .008 * Gr.maturity(p), att: 1.5, send: .5, force: true, raw: true, lane: 'wind', kind: 'plantHum', plant: 1, f0: p.hz / 2 }, tn + .05, bx, by - 20); stat(Sf, 'plantHum'); }
  // #11 plant chorus: lone ohms by a replaying jam plant drift into its tempo
  for (const p of g.plants) { if (p.k !== 'jam' || !p.sd || !(p.pt > tn - 4) || !p._pl) continue; const [bx, by] = Gr.base(Sf, p);
    for (const c of cs) if (free(c) && Math.hypot(c.x - bx, c.y - by) < Gr.CHORUS && c.mind.bpmT) { c.mind.bpmT += (p.sd.bpm - c.mind.bpmT) * .12; if (Math.abs(c.mind.bpmT - p.sd.bpm) < 2 && c._grCh !== p.id) { c._grCh = p.id; stat(Sf, 'chorus'); } } }
  Gr.sproutTick(Sf, tn); Gr.traceTick(Sf, tn); };
// wild sprouts: around coherent music, on land, where few plants grow yet
Gr.sproutTick = (Sf, tn) => { if (Sf._grS != null && tn - Sf._grS < 30 && tn >= Sf._grS) return; Sf._grS = tn; const g = st(Sf), P = Sf.P; if (g.plants.length >= Gr.MAXP) return;
  const src = []; for (const j of Sf.jams || []) if (j.members && j.members.length > 1 && (j.coh || 0) > .5) src.push([j.members[0], j.leader || j.members[0]]);
  if (Sf.convs) for (const c of Sf.convs.values()) if (c.seen > tn - 3 && (c.coh || 0) > .6) src.push([c.a, c.a]);
  for (const [c, ld] of src) { const th0 = P.theta(c.x, c.y), near = g.plants.filter(p => Math.abs(p.th - th0) * P.R < 700).length; if (near >= 2) continue;
    const rich = RS.Field && Sf.field ? (RS.Field.atTh(Sf, th0).rich || 0) : 0; if (rnd('sp', c.id, Math.floor(tn / 30)) > .3 + .4 * rich) continue;
    const side = rnd('sd', c.id, Math.floor(tn / 30)) < .5 ? -1 : 1, th = th0 + side * (80 + 180 * rnd('so', c.id, Math.floor(tn / 30))) / P.R; if ((!land(Sf, th) && rnd('wet', c.id, Math.floor(tn / 30)) < .5) || g.plants.some(p => Math.abs(p.th - th) * P.R < 60)) continue;
    const hz = ld.mind && RS.Mind && RS.Mind.tonicHz ? RS.Mind.tonicHz(Sf, ld.mind) : 220; Gr.plant(Sf, th, { kind: 'wild', hz }); if (g.plants.length >= Gr.MAXP) return; } };
// ---------------- #10 seed carrier ----------------
Gr.onSeed = (Sf, j, sn) => { if (!Gr.on() || !j || !j.members) return; const g = st(Sf), tn = Sf.now(); if (j._grSeedT != null && tn - j._grSeedT < 120 && tn >= j._grSeedT) return; j._grSeedT = tn;   // one seed per settled stretch if (g.plants.length + g.carry.length >= Gr.MAXP) return;
  const ms = j.members.filter(c => live(c) && c.anchor && !g.carry.some(k => k.id === c.id)); if (!ms.length) return; let best = null, bv = -1; for (const c of ms) { const v = rnd('carrier', c.id, sn.t) + (c === j.leader ? -.3 : 0); if (v > bv) { bv = v; best = c; } }
  const sd = { t: sn.t, key: sn.key, bpm: sn.bpm, coh: sn.coh, members: sn.members.map(m => ({ id: m.id, role: m.role, code: m.code, motif: (m.motif || []).slice(0, 16) })) };
  const hm = best.home0 || best.anchor; g.carry.push({ id: best.id, sd, hx: hm[0], hy: hm[1], t0: Sf.now(), d0: Date.now(), ph: 'hold' }); best._grSeed = 1; stat(Sf, 'seedCarry'); };
Gr.spot = (Sf, hx, hy, id) => { const P = Sf.P, g = st(Sf), th0 = P.theta(hx, hy); for (const dry of [1, 0]) for (let k = 0; k < 8; k++) { const side = (k + Math.floor(rnd('spot', id) * 2)) % 2 ? 1 : -1, d = (60 + 20 * (k >> 1)) * side, th = th0 + d / P.R; if ((!dry || land(Sf, th)) && !g.plants.some(p => Math.abs(p.th - th) * P.R < 50)) return th; } return th0 + 60 / P.R; };   // a short walk from home; dry ground preferred, sea-floor plants grow too
Gr.carryTick = (Sf, tn) => { const g = st(Sf); if (!g.carry.length) return; for (const k of g.carry.slice()) { const c = Sf.creatures.find(o => o.id === k.id);
    if (!live(c)) { if (Date.now() - k.d0 > 300e3 || (c && c.dead) || (!c && Sf.creatures.length)) Gr.plantSeed(Sf, k, Sf.P.theta(k.hx, k.hy)); continue; }   // a carrier gone / long away: the seed lands at its home
    if (k.ph === 'hold' && (!c.jam || tn - k.t0 > 60 || tn < k.t0)) { k.ph = 'go'; k.tw = tn; k.th = Gr.spot(Sf, k.hx, k.hy, k.id); }
    if (k.ph === 'go' && (tn - k.tw > 60 || tn < k.tw)) { c.anchor = [k.hx, k.hy]; const [px, py] = Gr.at(Sf, k.th), th = Sf.P.theta(c.x, c.y);   /* v0.5b seed fix: a blocked carrier never teleports the seed to its target: it plants it where it stands (near home) or keeps it and tries again (after 3 tries it lands at home) */
      if (Math.hypot(px - c.x, py - c.y) < 120) Gr.plantSeed(Sf, k, k.th); else if (Math.hypot(c.x - k.hx, c.y - k.hy) < 400) { stat(Sf, 'seedHere'); Gr.plantSeed(Sf, k, th); } else { k.tries = (k.tries || 0) + 1; stat(Sf, 'seedKept'); if (k.tries > 3) Gr.plantSeed(Sf, k, Sf.P.theta(k.hx, k.hy)); else { k.tw = tn; k.th = Gr.spot(Sf, k.hx, k.hy, k.id + k.tries); } } } } };
Gr.think = (Sf, c, tn) => { if (!c._grSeed || c.grabbed || c.caught) return; const k = st(Sf).carry.find(o => o.id === c.id); if (!k) { c._grSeed = 0; return; } if (k.ph !== 'go') return;
  const [px, py] = Gr.at(Sf, k.th), d = Math.hypot(px - c.x, py - c.y); if (d < 40) { c.anchor = [k.hx, k.hy]; Gr.plantSeed(Sf, k, k.th); return; } c.itemGoal = { x: px, y: py, stop: 30, seed: 1 }; };
// v0.5c #11 onward carrying: a grown jam plant hands a copy of its seed to a free ohm passing by whose home is a short way off (120-420 px);
// the ohm plants it by ITS OWN home (Gr.spot, 60-140 px from home), so a song spreads hop by hop, never by long trips. Generations <= 4,
// <= 3 seedlings per plant, 15 min between hand-offs per plant (wall clock, kept in the save), MAXP respected.
Gr.ONWARD = { mat: .5, near: 200, min: 120, max: 420, gen: 4, kids: 3, coolMs: 900e3 };
Gr.onwardTick = (Sf, tn) => { if (Sf._grO != null && tn - Sf._grO < 5 && tn >= Sf._grO) return; Sf._grO = tn; const g = st(Sf), O = Gr.ONWARD; if (g.plants.length + g.carry.length >= Gr.MAXP) return;
  for (const p of g.plants) { if (p.k !== 'jam' || !p.sd || (p.gen || 1) >= O.gen || (p.kids || 0) >= O.kids || (p.kidD && Date.now() - p.kidD < O.coolMs) || Gr.maturity(p) < O.mat) continue; const [bx, by] = Gr.base(Sf, p);
    let best = null, bv = -1; for (const c of Sf.creatures) { if (!live(c) || c.jam || c.grabbed || c.caught || c._grSeed || c.id === p.by || g.carry.some(k => k.id === c.id)) continue; const hm = c.home0 || c.anchor; if (!hm || Math.hypot(c.x - bx, c.y - by) > O.near) continue; const dh = Math.hypot(hm[0] - bx, hm[1] - by); if (dh < O.min || dh > O.max) continue; const v = rnd('onward', p.id, c.id, p.kids || 0); if (v > bv) { bv = v; best = c; } }
    if (!best) continue; const hm = best.home0 || best.anchor, k = { id: best.id, sd: p.sd, hx: hm[0], hy: hm[1], t0: tn, d0: Date.now(), ph: 'go', tw: tn, gen: (p.gen || 1) + 1, par: p.id }; k.th = Gr.spot(Sf, k.hx, k.hy, k.id + p.id);
    g.carry.push(k); best._grSeed = 1; p.kids = (p.kids || 0) + 1; p.kidD = Date.now(); stat(Sf, 'seedPass'); Sf.fx({ k: 'seedPass', a: { x: bx, y: by - 20 }, b: best, dur: 1.4, event: true }); return; } };
Gr.plantSeed = (Sf, k, th) => { const g = st(Sf); g.carry = g.carry.filter(o => o !== k); const c = Sf.creatures.find(o => o.id === k.id); if (c) c._grSeed = 0;
  const p = Gr.plant(Sf, th, { kind: 'jam', hz: k.sd.key.tonicHz, seed: k.sd, by: k.id }); if (p) { p.t0 = Sf.now(); stat(Sf, 'seedPlant'); if (k.gen) { p.gen = k.gen; p.par = k.par; stat(Sf, 'seedOnward'); } } return p; };
// ---------------- jam plant replay ----------------
Gr.hz = (key, deg, oct) => { const C = key.cents && key.cents.length ? key.cents : [0, 200, 400, 500, 700, 900, 1100], n = C.length, o = Math.floor(deg / n), i = ((deg % n) + n) % n; return key.tonicHz * Math.pow(2, C[i] / 1200 + o + oct); };
Gr.inst = (p, v, code) => { p._in = p._in || {}; if (p._in[v] !== undefined) return p._in[v]; let inst = null; try { const Gn = RS.Genome, g = typeof code === 'string' ? Gn.fromCode(code) : Float32Array.from(code || []); inst = Gn.express(g).inst || null; } catch (e) { inst = null; } return (p._in[v] = inst); };
Gr.voices = m => [1, 2, 3, 5][Math.min(3, Math.floor(m * 4))];
Gr.play = (Sf, p, tn) => { const sd = p.sd; if (!sd || RS.GROW_PLAY === false || !(sd.bpm > 20)) return; const m = Gr.maturity(p); if (m < .12) return; const [x, y] = Gr.base(Sf, p);
  if (Sf.view && Sf.view.x0 != null && !Sf.inView(x, y, 1400)) return; const bl = 60 / sd.bpm, b = Math.floor(tn / bl) + 1; if (p._lb === b) return; const first = p._lb == null; p._lb = b; if (first) return;
  const when = b * bl, R = Sf.onRing || (Sf.onRing = []); let n = 0; for (let i = R.length - 1; i >= 0; i--) { const e = R[i]; if (e.t < tn - bl - 2) break; if (e.t > tn - bl && e.t <= when && Math.abs(e.x - x) < 700 && !e.pl) n++; }   // the last beat heard + notes already scheduled
  if (n >= 6) { stat(Sf, 'plantYield'); return; }   // a busy crowd nearby: the plant listens
  const ms = sd.members.filter(o => o.motif && o.motif.length), V = Math.min(ms.length, Gr.voices(m)); let played = 0;
  const near = () => { let k = 0; for (let i = R.length - 1; i >= 0; i--) { const e = R[i]; if (e.t < tn - 8) break; if (e.pl && Math.abs(e.x - x) < 700 && Math.abs(e.t - when) < Math.max(bl, e.bl || 0) - 1e-6) k++; } return k; };   /* v0.6.2: the 2-notes-a-beat cap is shared by every plant in earshot (two jam plants side by side used to stack 2 + 2), measured on the slower plant's beat */
  for (let v = 0; v < V; v++) { const per = FIB[v + 1 > 4 ? 4 : v + 1] , mb = ms[v]; if (b % per) continue; if (near() >= 2) break; const idx = Math.floor(b / per) % mb.motif.length; let deg = mb.motif[idx]; if (deg == null) continue;
    let oct = mb.role === 'bass' ? -1 : 0; const rv = rnd('rv', p.id, v, b >> 5); if (rv < .3 * m) deg += 2; else if (rv < .45 * m) oct += 1;   // re-voicing as it matures (a third up / an octave)
    const f = Gr.hz(sd.key, deg, oct); if (!(f > 40 && f < 3000)) continue; const inst = Gr.inst(p, v, mb.code); if (!inst) continue; const dur = clamp(bl * per * .9, .25, 1.6);
    const spec = { inst, f0: f, modes: [{ f, a: 1, d: dur }], dur, vel: .3, gain: .022 * (.6 + .6 * m), raw: true, lane: 'plant' + p.id, len: dur, grid: false, force: true, plant: true, send: .4 };
    R.push({ t: when, x, y, id: 'p' + p.id, f, v: .3, pl: 1, bl }); if (R.length > 256) R.splice(0, 64); if (Sf.play) Sf.play(spec, when, x, y); played++; if (played >= 2) break; }   // at most 2 notes per beat
  if (played) { p.pt = tn; p._pl = 1; stat(Sf, 'plantNote', played); } };
// ---------------- history traces ----------------
Gr.traceTick = (Sf, tn) => { if (Sf._grH != null && tn - Sf._grH < 10 && tn >= Sf._grH) return; Sf._grH = tn; const g = st(Sf), P = Sf.P, src = [];
  for (const j of Sf.jams || []) if (j.members && j.members.length > 1) { const a = j.members[0], ld = j.leader || a; src.push([a.x, a.y, ld, 'j']); }
  if (Sf.convs) for (const c of Sf.convs.values()) if (c.seen > tn - 3 && c.a && c.b) src.push([(c.a.x + c.b.x) / 2, (c.a.y + c.b.y) / 2, c.a, 'c']);
  for (const [x, y, ld, k] of src) { const th = P.theta(x, y), hz = ld.mind && RS.Mind && RS.Mind.tonicHz ? RS.Mind.tonicHz(Sf, ld.mind) : 220, h = hueOf(hz);
    let tr = g.traces.find(o => Math.abs(o.th - th) * P.R < 160); if (tr) { tr.w += 10 / 60 * (k === 'j' ? 1 : .5); tr.l = Date.now(); tr.th += (th - tr.th) * .05; tr.h += (((h - tr.h + 540) % 360) - 180) * .1; tr.h = (tr.h + 360) % 360; }
    else { g.traces.push({ th, w: 10 / 60, h, l: Date.now(), k }); stat(Sf, 'trace'); } }
  while (g.traces.length > Gr.TRACES) { let bi = 0, bj = 1, bd = 1e9; for (let i = 0; i < g.traces.length; i++) for (let j = i + 1; j < g.traces.length; j++) { const d = Math.abs(g.traces[i].th - g.traces[j].th); if (d < bd) { bd = d; bi = i; bj = j; } }
    const a = g.traces[bi], b = g.traces[bj]; a.th = (a.th * a.w + b.th * b.w) / (a.w + b.w); a.w += b.w; a.l = Math.max(a.l, b.l); g.traces.splice(bj, 1); } };   // merged, never dropped
Gr.traceAlpha = (tr, nowMs) => { const days = Math.max(0, (nowMs - tr.l) / 864e5); return Math.min(.38, .08 + .06 * Math.log1p(tr.w * 3)) * Math.max(.3, Math.pow(.5, days / 3)); };
// ---------------- persistence + offline time ----------------
Gr.pack = Sf => { const g = Sf.grow; if (!g || (!g.plants.length && !g.traces.length && !g.carry.length)) return null;
  return { v: 1, n: g.n, p: g.plants.map(p => ({ id: p.id, k: p.k, th: +p.th.toFixed(7), hz: p.hz, b: p.b, s: p.s, acc: +p.acc.toFixed(3), cu: +p.cu.toFixed(3), am: p.am.map(v => +v.toFixed(3)), r: p.r, n: p.n, tp: p.tp, fl: p.fl, bk: p.bk, lf: p.lf, sg: p.sg, sd: p.sd, by: p.by, L0: p.L0, gen: p.gen, par: p.par, kids: p.kids, kidD: p.kidD, sty: p.sty })),   /* v0.5c: + generation / seedlings / hand-off clock (#11) and the v0.5b style (#9) */
    tr: g.traces.map(t => ({ th: +t.th.toFixed(7), w: +t.w.toFixed(3), h: Math.round(t.h), l: t.l, k: t.k })), ca: g.carry.map(k => ({ id: k.id, sd: k.sd, hx: k.hx, hy: k.hy, d0: k.d0, gen: k.gen, par: k.par })) }; };
Gr.unpack = (Sf, d, nowMs, savedMs) => { Sf.grow = { plants: [], traces: [], carry: [], n: 0 }; if (!d || d.v !== 1) return; const g = Sf.grow; g.n = d.n || 0;
  for (const q of d.p || []) { const p = Object.assign({ fl: [], r: [], tp: [], bk: 0, lf: 0, sg: 1, L0: 9, acc: 0, cu: 0, am: [0, .5] }, q); p.h = hueOf(p.hz || 220); g.plants.push(p); }
  g.traces = (d.tr || []).map(t => Object.assign({}, t)); const tn = Sf.now(); g.carry = (d.ca || []).map(k => Object.assign({}, k, { t0: tn, ph: 'hold' }));
  const el = savedMs ? clamp(((nowMs || Date.now()) - savedMs) / 1000, 0, Gr.OFF_MAX) : 0; if (el > 5) Gr.catchUp(Sf, el); };
// time passes offline: each plant keeps growing from what it usually hears (its running average), slowly and capped per load
Gr.catchUp = (Sf, el) => { for (const p of st(Sf).plants) { const a = p.am[0]; if (a < .02) continue; const steps = Math.min(Gr.OFF_STEPS, Math.floor(el / Gr.STEP * a * .35 + p.acc));
    const s = { act: a, vel: .5, cons: p.am[1], coh: p.am[1] * .8, bright: .5 }; for (let k = 0; k < steps; k++) Gr.pulse(Sf, p, s); p.off = (p.off || 0) + steps; if (steps) stat(Sf, 'offlinePulse', steps); } };
// ---------------- drawing (world space, after items + symbiosis) ----------------
Gr.draw = (ctx, Sf, t) => { if (!Gr.on() || !Sf.grow || !Sf.P) return; const R = RS.Render, g = Sf.grow, P = Sf.P, z = (Sf.view && Sf.view.z) || 1, now = Date.now(), tn = Sf.now();
  for (const tr of g.traces) { const half = (50 + 25 * Math.sqrt(tr.w)) / P.R, [cx, cy] = Gr.at(Sf, tr.th); if (!Sf.inView(cx, cy, half * P.R + 40)) continue; if (R && R.tag) R.tag(ctx, 'item', 200); const A = Gr.traceAlpha(tr, now);
    for (const [lw, a] of [[5, A * .35], [1.4, A]]) { ctx.strokeStyle = `hsla(${tr.h | 0},70%,70%,${a})`; ctx.lineWidth = lw; ctx.beginPath(); for (let k = 0; k <= 12; k++) { const th = tr.th - half + 2 * half * k / 12, [x, y] = Gr.at(Sf, th), s = Math.sin(th), c = Math.cos(th); const px = x - s * 1.5, py = y + c * 1.5; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); } ctx.stroke(); } }
  ctx.lineCap = 'round';
  for (const p of g.plants) { const [bx, by] = Gr.base(Sf, p); if (!Sf.inView(bx, by, 260)) continue; if (R && R.tag) R.tag(ctx, 'item', 300); const N = p.n, sw = Math.sin(t * .8 + (+p.id || 0)) * (p.pt > tn - .4 ? .035 : .015), sc = 1 - .12 * p.cu, s = Math.sin(p.th), c = Math.cos(p.th);
    const hg = Gr.hang(Sf), W = (lx, ly) => { const X = (lx + sw * ly) * sc, Y = ly * sc * hg; return [bx + c * X + s * Y, by + s * X - c * Y]; }, glow = p.pt > tn - .5 ? .25 : p.flT > tn - 3 ? .2 : 0, h = p.h | 0;
    for (const [pass, lw0, al, li] of [[0, 3.6, .1 + glow, 72], [1, 1.3, .7, 80]]) { if (pass === 0 && z < .3) continue;
      for (let i = 1; i < N.length; i++) { const nd = N[i], pa = N[nd[0]]; if (nd[6] && z < .45) continue; const [x0, y0] = W(pa[1], pa[2]), [x1, y1] = W(nd[1], nd[2]);
        ctx.strokeStyle = `hsla(${(h + (nd[6] ? 25 : 0)) % 360},${nd[6] ? 55 : 70}%,${li}%,${al})`; ctx.lineWidth = Math.max(.6, (lw0 - nd[4] * .35) * (nd[6] ? .7 : 1)); ctx.beginPath(); ctx.moveTo(x0, y0);
        if (nd[6]) { const mx = (x0 + x1) / 2 + (y1 - y0) * .3, my = (y0 + y1) / 2 - (x1 - x0) * .3; ctx.quadraticCurveTo(mx, my, x1, y1); } else ctx.lineTo(x1, y1); ctx.stroke(); } }
    if (z >= .3) for (const f of p.fl) { const nd = N[f.i]; if (!nd) continue; const [fx, fy] = W(nd[1], nd[2]), sp = 1.25 + .15 * (p.cu < .3 ? 1 : 0);   // Vogel disc: r = c * sqrt(i), angle = i * golden angle
      ctx.fillStyle = `hsla(${(h + 40 + f.h) % 360},85%,${p.flT > tn - 3 ? 85 : 76}%,.8)`; for (let i = 1; i <= f.k; i++) { const rr = sp * Math.sqrt(i), a = i * GA + t * .05; ctx.beginPath(); ctx.arc(fx + rr * Math.cos(a), fy + rr * Math.sin(a), .8 + .3 * (i / f.k), 0, TAU); ctx.fill(); } }
    if (p.k === 'jam' && z >= .3) { ctx.strokeStyle = `hsla(${h},70%,75%,${.18 + glow})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(bx, by, 5 + 2 * Math.sin(t * 1.3), 0, TAU); ctx.stroke(); } }   // the jam plant's seed husk at its foot
  for (const k of g.carry) { const c = Sf.creatures.find(o => o.id === k.id); if (!live(c) || !Sf.inView(c.x, c.y, 60)) continue; if (R && R.tag) R.tag(ctx, 'item', 30); const r = RS.Creature.radius(c), x = c.x, y = c.y - r - 11, hh = hueOf(k.sd.key.tonicHz) | 0, pu = .7 + .3 * Math.sin(t * 3);
    ctx.fillStyle = `hsla(${hh},80%,70%,${.25 * pu})`; ctx.beginPath(); ctx.arc(x, y, 7, 0, TAU); ctx.fill(); ctx.fillStyle = `hsla(${hh},85%,82%,.9)`; ctx.beginPath(); ctx.ellipse(x, y, 2.6, 3.8, 0, 0, TAU); ctx.fill(); }
  ctx.lineCap = 'butt'; };
})(typeof window !== 'undefined' ? window : globalThis);
