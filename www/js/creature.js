'use strict';
// Creatures: genome -> soft body made of the same material (pressurised segments + limb rods), gene-weighted steering drives, voice, learning, breeding.
// Needs a surface context Sf (see surface.js). No DOM.
(function (G) {
const RS = G.RS, TAU = RS.TAU, CONS = [0, 500, 700, 1200], TRAT = [1, 2, .5];
const C = RS.Creature = {};
let NEXT = 1;
// v0.6 deterministic test ids: production ids stay 'c' + Date.now() base36 + counter (saved ids always load as they are, o.id). Tests set
// RS.ID_SEED (or call RS.idReset(seed)) to get repeatable ids 'c' + seed36 + 'd' + n, so per-ohm rngs seeded from the id repeat run to run.
RS.idReset = seed => { RS.ID_SEED = seed; RS.ID_N = 0; };
RS.newId = () => RS.ID_SEED != null ? 'c' + (RS.ID_SEED >>> 0).toString(36) + 'd' + (RS.ID_N = (RS.ID_N || 0) + 1) : 'c' + Date.now().toString(36) + (NEXT++);
const wrapC = c => ((c % 1200) + 1200) % 1200;
// key / tempo / phase / register come from the 4 tuning genes (v0.1 genomes get them filled from their other genes, same distribution)
C.defaults = (g, P) => { if (g.length < 168 || g[164] === 0 && g[165] === 0) RS.Genome.fillTuning(g); const D = RS.Genome.dec; const q = (v, s) => Math.round(v / s) * s;
  return { keyC: q(D.key(g[164]), 1), tempo: Math.round(D.tempo(g[165]) * 1000) / 1000, phase: D.phase(g[166]) % 1, regOff: q(D.reg(g[167]), 1) }; };
// ---------------- build ----------------
C.build = (Sf, g, x, y, o = {}) => { const W = Sf.W, P = RS.Genome.express(g, Sf.env), c = { id: o.id || RS.newId(), g, P, name: RS.Genome.name(g), code: RS.Genome.toCode(g), segs: [], limbs: [], growth: o.growth == null ? .4 : o.growth,
    energy: o.energy == null ? .7 : o.energy, thirst: .2, born: o.born || (Sf.bornN = (Sf.bornN || 0) + 1, RS.hash('born', Sf.seed || 1, Sf.bornN, Math.floor(Sf.now() * 1000))), parents: o.parents || null, gen: o.gen || 0, motif: P.mus.motif.p.slice(), mdur: P.mus.motif.d.slice(), mstep: 0, bornT: null, age: 0, rest: 0, lastSing: -9, bonds: {}, cool: 0, state: 'wander', wander: RS.rng(RS.Genome.hash(g))() * TAU,
    learn: [], fade: 0, alpha: 1, nest: null, carry: null, home: null, loop: null, ride: null, mood: 0, sleep: 0, heard: [], stats: { sang: 0, strikes: 0, carried: 0, ate: 0, pushes: 0, imitated: 0, alarms: 0, coop: 0 } };
  const d = C.defaults(g, P); c.keyC = o.keyC != null ? o.keyC : d.keyC; c.tempo = o.tempo != null ? o.tempo : d.tempo; c.phase = o.phase || 0; c.regOff = o.regOff || 0; c.learnRate = .12 + P.life.learnRate * 1.3 * (.55 + P.life.conformity * .7);   // learning-rate + conformity genes
  c.rnd = RS.rng(RS.hash("rnd", c.born)); if (o.form && o.form.length >= 12 && RS.ClayLook) { c.form = Array.from(o.form, v => +v); P.segments = 1; }   /* v0.8b3: an ohm hatched from clay keeps the clay's outline (one body) */
  C.mesh(Sf, c, x, y); return c; };
// outline from genes (cached per creature): harmonics with bilateral or radial symmetry
C.outline = (P, R, seg, n) => { const pts = []; for (let i = 0; i < n; i++) { const th = i / n * TAU; let r = 1; P.harm.forEach((h, k) => { const m = P.radial ? (k + 1) * P.symN : k + 2; r += h.a * (P.radial ? Math.cos(m * th + h.ph) : Math.cos(m * th) * (k % 2 ? 1 : .8)); });
    if (seg === 0 && !P.radial) r += P.headBulge * Math.max(0, Math.cos(th)) * .5; pts.push([Math.cos(th) * R * r * (P.radial ? 1 : P.aspect), Math.sin(th) * R * r]); } return pts; };
C.mesh = (Sf, c, x, y) => { const W = Sf.W, P = c.P, s = c.growth; let ox = 0;
  const mat = { stiff: P.stiff, bend: P.bendK, damp: P.damp, mass: P.mass * .5, clear: P.clear, n: P.nIdx, pressure: P.pressure, fric: P.fric, r: 4, sp: 9 };
  for (let k = 0; k < P.segments; k++) { const R = P.size * Math.pow(P.segTaper, k) * (P.segments > 1 ? .8 : 1), n = RS.clamp(Math.round(TAU * R / 8), 9, 22), fo = k === 0 && c.form && RS.ClayLook ? RS.ClayLook.formOutline(c.form, R, Math.max(n, 14)) : null, O = fo ? fo.x.map((v, i) => [v, fo.y[i]]) : C.outline(P, R, k, n);
    const pts = O.map(([px, py]) => [x - ox * s + px * s, y + py * s]); const b = W.makeBlob(pts, mat, 'creature'); if (!b) continue;
    // build the adult rest geometry, start small: tension scales rest lengths, inflate the target area
    b.area0 = b.area0 / (s * s); for (const sp of b.springs) W.sr[sp] /= s; b.tension = s; b.inflate = s * s; b.meta = { role: 'creature', c, seg: k }; if (fo) { b.formO = RS.ClayLook.formRest(W, b, fo.mean); b.formR = R * s; } c.segs.push(b);
    ox += R * 1.5 * (P.radial ? 0 : 1); if (P.radial) break; }
  // spine: link consecutive segments with two soft springs
  for (let k = 1; k < c.segs.length; k++) { const a = c.segs[k - 1], b = c.segs[k]; const na = a.idx.length, nb = b.idx.length; const pa = [a.idx[Math.floor(na / 2) - 1], a.idx[Math.floor(na / 2) + 1]], pb = [b.idx[0], b.idx[1]];
    for (let j = 0; j < 2; j++) { const sp = W.addS(pa[j], pb[j % 2], .5, null, b.id); b.springs.push(sp); W.sr[sp] /= s; } }
  // limbs: thin rods attached to perimeter points (symmetric placement)
  const main = c.segs[0]; if (main && P.limbs) { const n = main.idx.length; for (let l = 0; l < P.limbs; l++) { const la = (l + .5) / P.limbs * TAU + (P.limbPhase || 0), k = ((Math.round(la / TAU * n) % n) + n) % n, i0 = main.idx[k],   /* v0.3.2: at the gene angle, exactly where the clay drew the strand */ [cx, cy] = W.center(main), dx = W.x[i0] - cx, dy = W.y[i0] - cy, d = Math.hypot(dx, dy) || 1, L = P.size * P.limbLen * s;
      const pts = [[W.x[i0] + dx / d * 4, W.y[i0] + dy / d * 4], [W.x[i0] + dx / d * (4 + L), W.y[i0] + dy / d * (4 + L)]]; const r = W.makeRod(pts, 2.5 + (1 - P.limbTaper) * 2, { stiff: .9, damp: P.damp * 2, mass: .3, bendK: .3 });
      if (!r) continue; for (const sp of r.springs) W.sr[sp] /= s; r.tension = s; r.meta = { role: 'limb', c, kind: RS.Body ? RS.Body.limbKind(P.body, Math.atan2(dy, dx)) : null }; W.attach(r.idx[0], i0, .9); c.limbs.push(r); } }
  c.bodies = c.segs.concat(c.limbs); };
C.center = (Sf, c) => { let x = 0, y = 0, n = 0; for (const b of c.segs) { const [a, d] = Sf.W.center(b); x += a; y += d; n++; } return n ? [x / n, y / n] : [0, 0]; };
C.vel = (Sf, c) => c.segs[0] ? Sf.W.vel(c.segs[0]) : [0, 0];
C.radius = c => c.P.size * c.growth * (c.P.segments > 1 && !c.P.radial ? 1.6 : 1);
C.destroy = (Sf, c) => { for (const b of c.bodies) if (Sf.W.bodies.has(b.id)) Sf.W.removeBody(b); c.dead = true; };
C.owns = (c, b) => b && b.meta && b.meta.c === c;
// ---------------- pitch (personal key centre + learned register) ----------------
C.hz = (Sf, c, deg) => { const M = Sf.M, S = M.S(), n = S.c.length, chord = M.chord(Sf.now()), d = Math.round(deg) + chord, o = Math.floor(d / n), i = ((d % n) + n) % n;
  const base = Math.log2(c.P.f0 / M.rootHz()); const oct = Math.round(base + c.regOff / 1200); const tu = c.P.mus.tuning, cents = RS.Theory && tu.sys !== '12tet' ? RS.Theory.tune(o * 1200 + S.c[i], tu.sys, tu.micro, i) : M.tc(o * 1200 + S.c[i], i); return M.rootHz() * Math.pow(2, oct + (cents + c.keyC) / 1200); };
C.hzCents = (Sf, c, cents) => Sf.M.rootHz() * Math.pow(2, cents / 1200);
C.compat = (a, b) => { const iv = wrapC(a.keyC - b.keyC + (a.regOff - b.regOff) * 0), dk = Math.min(...CONS.map(x => Math.abs(iv - x))), r = a.tempo / b.tempo, dt = Math.min(...TRAT.map(x => Math.abs(r / x - 1))); const rough = RS.Theory ? RS.Theory.intervalRough(iv) : 0; return { ok: dk <= 25 && dt <= .03, dk, dt, rough }; };
// ---------------- teaching (prompted learning) ----------------
C.teach = (Sf, a, b) => { if (a === b) return false; b.synced = null; if (a.synced && a.synced.to === b.id) a.synced = null;   /* the teacher becomes the learner's conductor */
   if (!b.learn.find(l => l.from === a.id)) b.learn.push({ from: a.id, t0: Sf.now() }); Sf.fx({ k: 'filament', a, b, t: Sf.now(), dur: 2 }); Sf.stats.teach = (Sf.stats.teach || 0) + 1; if (RS.Teacher) RS.Teacher.taught(Sf, a, b); return true; };
const learnStep = (Sf, c, dt) => { if (!c.learn.length) return;   // songs never drift on their own (no spontaneous change without teaching)
  for (const L of c.learn) { const a = Sf.creatures.find(q => q.id === L.from && !q.dead); if (!a) { L.done = true; continue; }
    // the lesson needs a channel: ear (not deaf), sight of the teacher's pulses (not blind, lit), touch, or ground vibration
    const p = RS.Ensemble.perceive(Sf, c, a); L.ch = p ? p.ch : null; if (!p) { L.blocked = (L.blocked || 0) + dt; if (!L.flickT || Sf.now() - L.flickT > 1.5) { L.flickT = Sf.now(); Sf.fx({ k: 'unheard', a, b: c, dur: .8 }); } continue; }
    const chw = p.ch === 'ear' ? 1 : p.ch === 'touch' ? 1.1 : p.ch === 'sight' ? .7 : .5;
    const k = 1 - Math.exp(-c.learnRate * chw * p.w * dt);
    // key centre: move along the shortest way round the octave toward the teacher
    let dk = wrapC(a.keyC - c.keyC); if (dk > 600) dk -= 1200; c.keyC += dk * k;
    // register spacing: harmonise, not unison -> nearest consonant spacing (3rd, 5th, octave) from where it is
    const sp = (C.hz(Sf, c, 0) / C.hz(Sf, a, 0)); const cents = 1200 * Math.log2(sp); const targets = [-1200, -700, -500, -400, 400, 500, 700, 1200, 1900]; let best = targets[0]; for (const t of targets) if (Math.abs(t - cents) < Math.abs(best - cents)) best = t; c.regOff += (best - cents) * k * .5;
    // tempo + phase lock
    c.tempo += (a.tempo - c.tempo) * k; let dp = a.phase - c.phase; dp -= Math.round(dp); c.phase += dp * k;
    L.err = Math.abs(dk) + Math.abs(a.tempo - c.tempo) * 400; L.learned = (L.learned || 0) + k; if (Math.abs(dk) < 2 && Math.abs(a.tempo - c.tempo) < .002) { L.done = true; C.entrain(Sf, c, a, 'teach'); for (const w of (a.words || [])) C.learnWord(Sf, c, w.w, { src: 'teach', from: a.id, ph: w.ph }); if (Sf.modulateTo && Math.abs(a.keyC) >= 100 && Sf.creatures.filter(q => !q.dead && Math.abs(((q.keyC - a.keyC) % 1200 + 1800) % 1200 - 600) < 30).length > Sf.creatures.length / 2) Sf.modulateTo(a.keyC); c.keyC = c.keyC; Sf.fx({ k: 'resolve', c, t: Sf.now(), dur: 1.2 }); Sf.stats.resolved = (Sf.stats.resolved || 0) + 1; } }
  c.learn = c.learn.filter(l => !l.done); };
// ---------------- brain: gene-weighted drives -> desired velocity ----------------
C.think = (Sf, c, dt) => { const W = Sf.W, P = c.P, B = P.beh, [x, y] = C.center(Sf, c), env = Sf.env; c.x = x; c.y = y; c.cool = Math.max(0, c.cool - dt); c.breedCool = Math.max(0, (c.breedCool || 0) - dt);
  learnStep(Sf, c, dt);
  // growth and energy: light powers them (photosynthesis-like), water quenches, activity drains
  const L = Sf.lightAt(x, y), lightI = L ? L.I : 0, wet = Sf.waterNear(x, y, 40); c.light = lightI;
  const fit = c.fit = RS.fitOf(P, env); const LI = P.life, SE = P.sense; c.age = (c.age || 0) + dt; c.energy = RS.clamp(c.energy + (lightI * .1 * (.5 + fit) * (1.1 - LI.energySrc) - LI.drain * (.6 + c.activity * .6 || 1) - (c.state === 'flee' ? .02 : 0)) * dt, 0, 1);
  c.thirst = RS.clamp(c.thirst + (.006 - (wet > 2 ? .08 : 0)) * dt, 0, 1); if (wet > 2 && c.thirst > .3) { c.stats.drank = (c.stats.drank || 0) + 1; }
  if (c.growth < 1) { c.growth = Math.min(1, c.growth + dt * .02 * (.4 + fit) * (.5 + c.energy) * (.4 + LI.growthRate * 1.4)); C.setGrowth(Sf, c); }
  // unsuited worlds: dim and fade (gently) when fit stays low
  c.fade = RS.clamp(c.fade + (fit < .25 || (!c.home && c.age > LI.lifeSec) ? .004 : -.01 * (.5 + LI.regen)) * dt, 0, 1); c.alpha = 1 - c.fade * .8;
  // day/night: rest by night (hum), active by day; gravity: low -> leap/float, high -> crawl
  const night = 1 - Sf.day, nightOwl = B.night; c.activity = RS.clamp((.35 + c.energy * .8) * (1 - night * (1 - nightOwl) * .75) * (1 - c.fade * .7) * (Sf.weather && Sf.weather.storm ? .6 : 1), .05, 1.2);
  c.sleep = night > .6 && nightOwl < .5 || c.energy < .08 || c.doze ? Math.min(1, c.sleep + dt * .3) : Math.max(0, c.sleep - dt * .5);
  let dx = 0, dy = 0; const push = (vx, vy, w) => { dx += vx * w; dy += vy * w; };
  // wander
  c.wander += (RS.rng(Math.floor(Sf.now() * 4) ^ c.born)() - .5) * .8 * B.wander; push(Math.cos(c.wander), Math.sin(c.wander) * .4, .3 + B.wander * .5);
  // neighbours: flock / follow / play / compete / alarm / rest-cluster / courtship
  let ax = 0, ay = 0, cxs = 0, cys = 0, sx = 0, sy = 0, nn = 0; c.near = [];
  for (const o of Sf.creatures) { if (o === c || o.dead || o.caught) continue; const ddx = o.x - x, ddy = o.y - y, d = Math.hypot(ddx, ddy) || 1; if (d > 220) continue; c.near.push([o, d]); nn++;
    const [ovx, ovy] = C.vel(Sf, o); ax += ovx; ay += ovy; cxs += o.x; cys += o.y; if (d < (C.radius(c) + C.radius(o)) * 1.3) { sx -= ddx / d; sy -= ddy / d; }
    if (o.alarm > 0 && d < 160 * (1.4 - B.bold * .8) && c.state !== 'flee' && RS.Ensemble.perceive(Sf, c, o)) { c.state = 'flee'; c.fleeFrom = [o.alarmX, o.alarmY]; c.fleeT = 1.2; c.alarm = .5; c.alarmX = o.alarmX; c.alarmY = o.alarmY; c.stats.alarms++; Sf.creatureCall(c, 'alarm'); } }
  if (nn) { const soc = B.social * (1 + c.sleep * 2); push(ax / nn / 80, ay / nn / 80, soc * .6); push((cxs / nn - x) / 120, (cys / nn - y) / 120, soc * .8); push(sx, sy, 1.2); }
  // play: chase the nearest
  if (B.play > .55 && c.near.length && c.energy > .3) { const [o, d] = c.near.reduce((a, b) => b[1] < a[1] ? b : a); push((o.x - x) / d, (o.y - y) / d, (B.play - .5) * 1.2); if (d < C.radius(c) + C.radius(o) + 6 && !c.cool) { c.cool = 1; Sf.fx({ k: 'bounce', x: (x + o.x) / 2, y: (y + o.y) / 2, t: Sf.now(), dur: .5 }); if (!RS.CALM) { C.impulse(Sf, c, (x - o.x) / d * 250, -200); Sf.creatureCall(c, 'play'); } } }
  // flee fast touches
  for (const T of Sf.touchFast) { const d = Math.hypot(T.x - x, T.y - y); if (d < (140 + B.shyness * 120) * (1.3 - B.bold * .6) && Sf.now() - T.t < .6 && c.state !== 'flee' && (!SE.blind || d < 60 + SE.vibration * 120)) { c.state = 'flee'; c.stats.fled = (c.stats.fled || 0) + 1; c.fleeFrom = [T.x, T.y]; c.fleeT = .8 + B.shyness; c.alarm = 1; c.alarmX = T.x; c.alarmY = T.y; Sf.creatureCall(c, 'alarm'); } }
  if (c.state === 'flee') { c.fleeT -= dt; const d = Math.hypot(x - c.fleeFrom[0], y - c.fleeFrom[1]) || 1; push((x - c.fleeFrom[0]) / d, (y - c.fleeFrom[1]) / d, 3); if (c.fleeT <= 0) c.state = 'wander'; }
  c.alarm = Math.max(0, (c.alarm || 0) - dt);
  // attractions: instruments, light, water (gene-weighted); favourite spot competition
  const seek = (tx, ty, w) => { const d = Math.hypot(tx - x, ty - y) || 1; push((tx - x) / d, (ty - y) / d, w); return d; };
  if (Sf.instruments().length && !c.home) { let best = null, bd = 1e9; for (const b of Sf.instruments()) { const [bx, by] = W.center(b); const d = Math.hypot(bx - x, by - y); if (d < bd) { bd = d; best = b; } } if (best && bd < 600) { const [bx, by] = W.center(best); seek(bx, by - 20, B.instrLove * .9 * c.activity); c.fav = best; } }
  c.seesLight = !SE.blind && !!L; if (L && !SE.blind && Sf.brightSpot && B.lightLove > .4 && c.energy < .8) { const bs = Sf.brightSpot(); if (bs) seek(bs[0], bs[1], (B.lightLove - .3) * 1.1); }
  if (Sf.waterSpot && (c.thirst > .5 || B.waterLove > .6)) { const ws = Sf.waterSpot(x, y); if (ws) seek(ws[0], ws[1], c.thirst * .8 + (B.waterLove - .5)); }
  // blind creatures navigate by sound: they head for the most recent loud sound they can hear (or feel)
  if (SE.blind && !SE.deaf && Sf.recentNotes && Sf.recentNotes.length) { let best = null, bs = 0; const tn = Sf.now(); for (const n of Sf.recentNotes) { if (n.src === c || n.x == null || tn - n.t > 2.5 || n.t > tn) continue; const d = Math.hypot(n.x - x, n.y - y); if (d > SE.hearR * 1.5 || d < 20) continue; const sc = n.g / (1 + d / 200); if (sc > bs) { bs = sc; best = n; } } if (best) { seek(best.x, best.y, .9 + SE.hearing * .5); c.soundTarget = [best.x, best.y]; } }
  // curiosity: newly made things draw curious creatures; empathy: approach dim ones; territoriality: shove others off the favourite spot
  if (B.curiosity > .5 && Sf.newest && Sf.now() - Sf.newest.t < 20) seek(Sf.newest.x, Sf.newest.y, (B.curiosity - .5) * 1.4);
  if (LI.empathy > .6) for (const [o, d] of c.near) if (o.fade > .1 || o.energy < .25) { seek(o.x, o.y, (LI.empathy - .6) * 1.5); if (d < 80) { o.energy = Math.min(1, o.energy + dt * .01 * LI.empathy); } break; }
  if (B.territory > .7 && c.fav) for (const [o, d] of c.near) if (d < 70 && o.fav === c.fav) { if (!RS.CALM) C.impulse(Sf, o, (o.x - x) / d * 80 * (B.territory - .6), -20); }
  if (LI.aquatic > .6 && Sf.waterSpot) { const ws = Sf.waterSpot(x, y); if (ws) seek(ws[0], ws[1], (LI.aquatic - .5) * 1.2); }
  // storms scatter them (downwind), rain draws them out
  if (Sf.weather && Sf.weather.storm) push(Sf.wind[0] / 200, 0, .8 * (1 - B.bold));
  // courtship & harmonising -> breeding (only key/rhythm-compatible pairs)
  if (c.growth > .9 && c.energy > .45 && fit > .35 && !(c.breedCool > 0)) for (const [o, d] of c.near) { if (o.growth < .9 || d > 90) continue; push((o.x - x) / d, (o.y - y) / d, .4 * B.social);
    const cp = C.compat(c, o); c.bonds[o.id] = c.bonds[o.id] || 0;
    if (Sf.now() - c.lastSing < 1 && Sf.now() - o.lastSing < 1) { if (cp.ok) { c.bonds[o.id] += dt * 1.2; Sf.fx({ k: 'harmony', a: c, b: o, t: Sf.now(), dur: .6 }); } else { c.bonds[o.id] = 0; if (!c.clashT || Sf.now() - c.clashT > 2) { c.clashT = Sf.now(); Sf.fx({ k: 'clash', a: c, b: o, t: Sf.now(), dur: 1 }); Sf.stats.clash = (Sf.stats.clash || 0) + 1; if (!RS.CALM) { Sf.clash(c, o); C.impulse(Sf, c, (x - o.x) / d * 220, -60); C.impulse(Sf, o, (o.x - x) / d * 220, -60); } } } }
    if (c.bonds[o.id] > 4.5 - LI.fertility * 3 && cp.ok && !(o.breedCool > 0) && Sf.eggs.length < 4 && Sf.creatures.length < 14) { c.bonds[o.id] = 0; c.breedCool = o.breedCool = 40; Sf.layEgg(c, o); } }
  // eat a little material when hungry and touching a creation
  if ((B.hunger > .5 || LI.energySrc > .7) && c.energy < .5 + LI.energySrc * .3 && c.touching && c.touching.meta && c.touching.meta.role === 'instrument' && c.rnd() < dt * .2) Sf.eat(c, c.touching);
  // carry small objects to a nest spot
  if (!c.carry && B.territory > .55 && c.touching && c.touching.meta && c.touching.meta.role === 'instrument' && c.touching.idx.length < 10 && !c.touching.pins.length && c.rnd() < dt * .3) Sf.pickUp(c, c.touching);
  if (c.carry) { if (!c.nest) c.nest = [x + (RS.rng(c.born)() - .5) * 300, y]; const d = seek(c.nest[0], c.nest[1], 1.2); if (d < 30) Sf.drop(c); }
  // ride: small calm creature on a bigger one
  // (handled physically: resting on top; flagged here for the voice duet)
  c.riding = null; for (const [o, d] of c.near) if (C.radius(o) > C.radius(c) * 1.6 && d < C.radius(o) + C.radius(c) + 4 && y < o.y) { c.riding = o; break; }
  if (c.home) { const [hx, hy] = W.center(c.home); seek(hx, hy - 25, 1.6); }
  if (c.sleep > .5) { dx *= .2; dy *= .2; }
  const m = Math.hypot(dx, dy) || 1; c.want = [dx / m, dy / m]; c.wantMag = Math.min(1, m) * c.activity * (.7 + B.curiosity * .5);
  if (RS.Abilities) RS.Abilities.think(Sf, c, dt);
  if (RS.Jam && RS.MIND !== false) RS.Jam.steer(Sf, c, dt); };   // calm movement (v0.3)
C.setGrowth = (Sf, c) => { const s = c.growth; for (const b of c.bodies) { b.tension = s; if (b.closed) b.inflate = s * s * (1 + (c.breath || 0)); } };
C.impulse = (Sf, c, vx, vy) => { const W = Sf.W; for (const b of c.segs) for (const i of b.idx) { W.px[i] -= vx * W.dt; W.py[i] -= vy * W.dt; } };
// ---------------- locomotion: muscles (pressure pulses, limb strokes) turn the wish into motion ----------------
C.forces = (Sf, c, t) => { if (c.caught || !c.want) return; const W = Sf.W, P = c.P, env = Sf.env, g = env.g || 900, lowG = g < 600, inWater = Sf.waterNear(c.x, c.y, C.radius(c) + 6) > 4;
  const ph = t * P.mFreq * TAU * c.tempo, pulse = .5 + .5 * Math.sin(ph), str = P.maxSpeed * 9 * c.wantMag * (c.growth * .6 + .4) * (1 - c.fade * .6);
  c.breath = Math.sin(ph) * P.mAmp * .5 * (1 + c.wantMag); C.setGrowth(Sf, c);
  let fx = c.want[0] * str, fy = c.want[1] * str; if (c.lod && !RS._noUnpress && RS.Social && RS.Social.reach) { if (!c._pressT || t - c._pressT > .25) { c._pressT = t; c._press = null; const rc = RS.Social.reach(Sf, c); for (const o of Sf.creatures) { if (o === c || o.dead || o.caught) continue; const dx = o.x - c.x, dy = o.y - c.y, d = Math.hypot(dx, dy); if (d > 1 && d < rc + RS.Social.reach(Sf, o)) (c._press = c._press || []).push([dx / d, dy / d]); } } if (c._press) for (const pr of c._press) { const q = fx * pr[0] + fy * pr[1]; if (q > 0) { fx -= q * pr[0]; fy -= q * pr[1]; Sf.stats.unpress = (Sf.stats.unpress || 0) + 1; } } }   /* v0.7 H.3 storm seed 53 root cause: the check kept only the FIRST touching ohm (break), so in a cluster (a hatchling between two ohms) it still thrust into the second one; now every touching ohm is pressed out */   /* v0.6.1 storm-spike root cause #3: off screen an ohm whose body already overlaps another ohm's reach no longer thrusts INTO it (a hatchling steering to its parent kept shoving through a sleeping ohm until their chains tangled and the contact solver threw it at 231 px/s) */ const bm = RS.Body && P.body ? RS.Body.move(c, inWater, !!(c.segs[0] && c.segs[0].idx.some(i => W.fl[i] & 8))) : null; if (bm) { fx *= bm.k; fy *= bm.k; }   // v0.3.2 body plan: striders walk, serpents swim, drum-bellies / shells are heavy
  const air = Sf.P && Sf.P.gas && inWater && RS.Body && RS.Body.airMove;   /* v0.6.1 cloud worlds: the body's aerial kit (bladder / wings / sail / fins) moves it, nobody walks or swims on air */
  if (air) { const m = RS.Body.airMove(c, ph); fx *= m[0]; fy *= m[1]; }
  const style = air ? 'air' : lowG && P.style === 'crawl' ? 'hop' : (!lowG && g > 1200 && P.style === 'float') ? 'crawl' : P.style;
  c.loco = air ? 'air:' + RS.Body.air(P) : style;
  if (style === 'crawl') { fx *= pulse * 1.6; fy *= pulse * 1.6; }
  else if (style === 'swim') { const k = inWater ? 1.4 : .35; fx *= k * pulse; fy *= k * pulse; }
  else if (style === 'float') { const lift = Math.min(g * (RS.MIND !== false && c.calm === 'still' ? 1 : 1.02), g * P.buoy * (env.atmo == null ? .6 : (.3 + env.atmo * .7)) * P.mass * .5), G1 = W.grav, ld = Math.hypot(c.x - G1.cx, c.y - G1.cy) || 1; fx = fx * .7 + (c.x - G1.cx) / ld * lift; fy = fy * .7 + (c.y - G1.cy) / ld * lift; }
  else if (style === 'jet') { const jp = (t / P.jetPeriod) % 1; const on = jp < .12, jk = RS.MIND !== false && c.calm ? 2 : 5; fx *= on ? jk : .1; fy *= on ? jk : .1; if (on && !c.jetOn) Sf.creatureCall(c, 'jet'); c.jetOn = on; }
  if (style === 'hop' || P.hop) { const gr = c.segs[0] && c.segs[0].idx.some(i => W.fl[i] & 8); if (gr && !(RS.CALM && c.holding) && (!c.hopT || t - c.hopT > 1.2 - P.burst * .6) && c.wantMag > .2) { c.hopT = t; C.impulse(Sf, c, c.want[0] * 140, -(lowG ? 380 : 220) * (.5 + (P.hop || .5)) * (bm ? .6 + .4 * bm.hop : 1)); } }
  // thrust needs something to push against: ground contact, water, or (float/jet) a thick enough atmosphere. Work in the LOCAL frame
  // (gravity is radial): the 'up' component is capped so nothing but a floater/jet can out-climb gravity, and airborne crawlers barely steer.
  { const G0 = W.grav, ux0 = c.x - G0.cx, uy0 = c.y - G0.cy, ud = Math.hypot(ux0, uy0) || 1, ux = ux0 / ud, uy = uy0 / ud, grounded = (c.bodies || c.segs).some(b => b.idx.some(i => W.fl[i] & 8)), atmo = env.atmo == null ? .6 : env.atmo;
    let up = fx * ux + fy * uy, tg = fx * -uy + fy * ux; const medium = inWater ? 1 : grounded ? 1 : (style === 'float' || style === 'jet') ? Math.min(1, atmo * 1.6) : .12;
    tg *= medium; const upCap = (inWater && (style === 'swim' || style === 'jet' || style === 'air')) ? g * 1.15 : style === 'float' ? g * 1.02 * medium : style === 'jet' ? g * .9 * medium : (grounded ? g * .3 : 0); up = Math.min(up * medium, upCap); fx = tg * -uy + up * ux; fy = tg * ux + up * uy; c.thrustMedium = medium; }
  const fm = Math.hypot(fx, fy), cap = 1400; if (fm > cap) { fx *= cap / fm; fy *= cap / fm; } const kf = 1.2 / Math.max(1, c.segs.length * .6); for (const b of c.segs) for (const i of b.idx) { W.fx[i] += fx * kf / W.im[i]; W.fy[i] += fy * kf / W.im[i]; }
  if (RS.Abilities) RS.Abilities.forces(Sf, c);
  // v0.3 calm: a creature that is just playing / listening holds its spot (floaters hover, walkers stop sliding); throws/drags are exempt
  if (RS.MIND !== false && (c.calm === 'still' || c.calm === 'approach') && !c.grabbed && !(c.thrownT && t - c.thrownT < 2.5)) { const G2 = W.grav, still = c.calm === 'still', hover = style === 'float' || style === 'jet' || (style === 'swim' && inWater);
    for (const b of (c.bodies || c.segs)) for (const i of b.idx) { let vx = W.x[i] - W.px[i], vy = W.y[i] - W.py[i]; const ux = W.x[i] - G2.cx, uy = W.y[i] - G2.cy, ud = Math.hypot(ux, uy) || 1, nx = ux / ud, ny = uy / ud, vn = vx * nx + vy * ny;
      const k = hover ? (still ? .08 : .03) : (still ? .3 : .12); if (!k) continue; if (hover) { W.px[i] += vx * k; W.py[i] += vy * k; } else { const tx = vx - vn * nx, ty = vy - vn * ny; W.px[i] += tx * k; W.py[i] += ty * k; } }
    /* v0.4a root cause of the off-screen drift: away from the flat start area the ground slopes, and the calm want (|.1|) could not out-pull gravity's
       downhill component, so ohms slid downhill (the first one 'pulled left') and never reached a partner. Grounded calm ohms now grip: the downhill
       part of gravity is cancelled on contact points (static friction), so they climb to partners and stay put when still. */
    /* v0.4a: in the sea the wave band carries a hovering swimmer along (Stokes drift), the main off-screen drift source (most of the start
       coast is under sea level). A still hoverer keeps the spot it settled on with a soft positional hold (<= .6 px / step, no velocity added). */
    if ((hover || RS.CALM) && still && !(c.touching || (c.near || []).some(([o, d]) => d < C.radius(o) + C.radius(c) + 8))) { if (!c.holdPt || Math.abs(c.holdPt[0] - c.x) > 60) c.holdPt = [c.x, c.y]; const hx = c.holdPt[0] - c.x, hy = 0, hl = Math.abs(hx);   /* v0.4a: the hold is sideways only (the drift was sideways); height settles by buoyancy / ground as before */
      if (hl > .5) { const m = Math.min(.6, hl * .05) / hl, ux = hx * m, uy = hy * m; for (const b of (c.bodies || c.segs)) for (const i of b.idx) { W.x[i] += ux; W.y[i] += uy; W.px[i] += ux; W.py[i] += uy; } } } else c.holdPt = null;
    if (!still && (inWater || !hover)) for (const b of (c.bodies || c.segs)) for (const i of b.idx) { const vx = W.x[i] - W.px[i], vy = W.y[i] - W.py[i], wd = c.want[0] * vx + c.want[1] * vy; if (wd < 0) { const kb = hover ? .15 : .35; W.px[i] += c.want[0] * wd * kb; W.py[i] += c.want[1] * wd * kb; } }   // backward drift against the want is damped (v0.4a: walkers / crawlers too: an asymmetric gait crept the wrong way under a weak calm want)
    /* v0.4b root cause of 'crawlers cannot seek left' (and some floaters right): a gait whose limb wave / shell is lopsided makes more ground one way, and a weak calm want (.04-.06) was below the gait's own bias, so damping only stopped the backward creep. A calm approach now has a small progress assist: if the body's speed along the want is under a gentle walking pace, it gets a nudge along the want (<= 2.5 px/s per step, horizontal only on the ground) - a steady crawl either way, still slow and leash-clipped. */
    /* v0.6 root cause of 'a weak crawler cannot climb a steep slope while approaching': the assist pushed horizontally, i.e. INTO a steep slope
       (the ground absorbed it) and was capped at 2.5. On the ground it now pushes along the ground tangent (uphill or downhill toward the want)
       and the cap grows with the slope (x1 flat .. x3 at 35 deg+); still only while approaching calmly, still leash-clipped. */
    if (!still && c.calm === 'approach' && c.want && W.dt) { const fly = hover || inWater; let dx0 = c.want[0], dy0 = fly ? c.want[1] : 0, steep = 0;
      if (!fly && Sf.tanAt && c.want[0]) { const Tg = Sf.tanAt(c.x, c.y); if (Tg.ok) { const sg = c.want[0] * Tg.c + (c.want[1] || 0) * Tg.s; dx0 = Tg.tx * sg; dy0 = Tg.ty * sg; steep = Tg.steep; } }   /* v0.8a9: radial ground tangent (identical on the top) */
      let vs = 0, nn = 0; for (const b of (c.bodies || c.segs)) for (const i of b.idx) { vs += (W.x[i] - W.px[i]) * dx0 + (W.y[i] - W.py[i]) * dy0; nn++; } const va = nn ? vs / nn / W.dt : 0, vd = Math.min(40, 10 + 500 * (c.wantMag || 0)); if (steep > .36) Sf.stats.slopeAssist = (Sf.stats.slopeAssist || 0) + 1; if (va < vd) { const dv = Math.min(2.5 * (1 + Math.min(2, steep * 3)), (vd - va) * .12) * W.dt, ax = dx0 * dv, ay = dy0 * dv; for (const b of (c.bodies || c.segs)) for (const i of b.idx) { W.px[i] -= ax; W.py[i] -= ay; } } }
    if (!hover && Sf.tanAt && G2.g) {  const Tg = Sf.tanAt(c.x, c.y), tx = Tg.tx, ty = Tg.ty;   /* v0.8a9: radial ground tangent */
      const Bs = c.bodies || c.segs; if (Bs.some(b => b.idx.some(i => W.fl[i] & 8))) for (const b of Bs) for (const i of b.idx) if (W.im[i] > 0) { const dx = G2.cx - W.x[i], dy = G2.cy - W.y[i], dd = Math.hypot(dx, dy) || 1, ga = (dx * tx + dy * ty) / dd * G2.g; W.fx[i] -= ga * tx / W.im[i]; W.fy[i] -= ga * ty / W.im[i]; } } }
  // limbs stroke in a travelling wave
  c.limbs.forEach((r, k) => { const tip = r.idx[r.idx.length - 1], s = Math.sin(ph + k * P.wave + P.limbPhase) * P.limbAmp * 900 * (RS.CALM && c.calm === 'still' && !c.grabbed ? .04 : .3 + c.wantMag);   /* v0.3.1: a still creature only sways its limbs; a full idle stroke WALKED it (drift while 'holding') */ const root = r.idx[0], Fx = -c.want[1] * s * W.dt * 4, Fy = c.want[0] * s * W.dt * 4, mr = W.im[tip] / (W.im[root] || W.im[tip]); W.fx[tip] += Fx; W.fy[tip] += Fy; W.fx[root] -= Fx; W.fy[root] -= Fy; });   /* internal pair: no net push */ };
// ---------------- voice on the world clock: motif, phrases, rests, chord-aware, personal key + tempo ----------------
C.onGrid = (Sf, c, g, tg) => { if (c.caught || c.dead || c.leaving) return; const P = c.P, MU = P.mus, M = Sf.M; const lt = RS.Abilities ? RS.Abilities.tempoAt(Sf, c) : 1; c.phase = (c.phase + 1 / 16 * c.tempo * lt) % 1;
  if (RS.Abilities) RS.Abilities.onGrid(Sf, c, g, tg);
  // creature's own pulse grid: tempo ratio of the world 16th (time-stretch fields scale it)
  const step = Math.round(g * c.tempo * lt), inGroup = c.ens && c.ens.grp.length > 1; if (step === c.lastStep && !inGroup && !(c.home && c.loop)) return; c.lastStep = step;   // group parts + loops run on the shared/loop clocks
  // an instrument player is not 'a drummer': it keeps its loop AND still sings its part in a group (or a phrase now and then alone)
  if (c.home && c.loop) { C.playLoop(Sf, c, g, tg); if (!(c.ens && c.ens.grp.length > 1) && ((step % 32) + 32) % 32 !== 24) return; }
  if (c.scored) return C.playScore(Sf, c, step, tg);
  if (RS.Mind && RS.MIND !== false) return;   // v0.3: the creature's own musical mind (mind.js) performs; the world grid no longer generates its notes
  // personal feel: swing on odd steps, timing precision (deterministic, no drift), meter accents
  const jitter = (RS.rng(RS.hash(c.born, step))() - .5) * (1 - MU.precision) * .05, when = tg + (step % 2 ? MU.swing * M.dt16() : 0) + Math.max(0, jitter);
  const W = RS.Theory ? RS.Theory.weights(MU.meter) : [4], wv = W[((step % W.length) + W.length) % W.length], dyn = (RS.Theory ? RS.Theory.dynamics(M.bar(tg), ((g / 4) | 0) % 4, MU.dynRange) : 1) * (c.dynFollow || 1);
  // ensemble part first (self-organised group music)
  const part = null;   /* v0.3.1: the v0.2 ensemble parts are gone (minds play the music) */
  if (part) { if (c.sleep > .7 && !part.drone) return; const o = { len: part.len, gain: (part.gain || .8) * dyn, part }; if (part.cents != null) o.hz = C.hzCents(Sf, c, part.cents); C.perform(Sf, c, part.deg == null ? 0 : part.deg, when, o); return; }
  if (c.ens && c.ens.grp.length > 1) return;   // group members only play their part
  if (c.rest > 0) { c.rest--; return; }
  if (MU.subdiv === 1 && step % 2) return;
  const accent = wv >= 3 ? 1.6 : wv === 2 ? 1 : .55 + MU.syncop * .9;
  const chance = P.density * c.activity * (.4 + c.fit) * accent * (1.35 - P.life.patience * .7) * (c.sleep > .5 ? .25 : 1) * .22;
  if (RS.rng(RS.hash(c.born, g))() > chance) return;
  // form: A sections play the stored motif, B (bridge) develops it (inversion/sequence...), last note of a consequent lands on the tonic
  const ml = c.motif.length, form = RS.Theory ? RS.Theory.formAt(M.bar(tg)) : { sect: 'A' }; let mot = c.motif;
  if (form.sect === 'B' && RS.Theory) { const key = c.motif.join(','); if (c.devKey !== key) { c.devKey = key; c.dev = RS.Theory.develop({ p: c.motif.slice(), d: c.mdur.slice() }, RS.hash(c.id, 'dev'), MU.improv).p; while (c.dev.length < ml) c.dev.push(null); } mot = c.dev; }
  let deg = mot[c.mstep % ml]; c.mstep++;
  if (c.mstep % ml === 0) c.rest = 2 + Math.floor((1 - P.density) * 8 + P.life.patience * 40);   // phrase then rest (patience = longer breaths)
  if (deg == null) return;   // a rest in the DNA motif
  if (form.period === 'consequent' && c.mstep % ml === ml - 1) deg = 0;
  deg += c.sleep > .5 ? -7 : 0;
  const dur = (c.mdur[(c.mstep - 1) % ml] || 2) / 2;
  C.perform(Sf, c, deg, when, { len: (c.sleep > .5 ? 1.8 : 1) * (.6 + dur * .5), gain: dyn, grid: true }); };
// a pattern written/edited by the player (DAW view): played exactly, every repeat. notes: motif[k] at start step = sum(mdur[<k]), loop = loopLen
C.score = c => { const out = []; let s = 0; for (let k = 0; k < c.motif.length; k++) { const d = c.mdur[k] || 2; if (c.motif[k] != null) out.push({ k, s, deg: c.motif[k], len: c.mlen ? c.mlen[k] || d : d, vel: c.mvel ? (c.mvel[k] == null ? .8 : c.mvel[k]) : .8, chord: c.mchord ? c.mchord[k] || [] : [], free: c.freeCents ? c.freeCents[k] || 0 : 0 }); s += d; } return { notes: out, len: c.loopLen || Math.max(4, s) }; };
C.playScore = (Sf, c, step, tg) => { const sc = c._sc && c._scKey === c.scoreV ? c._sc : (c._scKey = c.scoreV, c._sc = C.score(c)); const pos = ((step % sc.len) + sc.len) % sc.len; c.scorePos = pos;
  for (const n of sc.notes) if (n.s === pos) { const len = Math.max(.25, n.len / 2), o = { len, gain: (.35 + n.vel) * (c.dynFollow || 1), grid: true, scored: true }; if (c.freeCents && c.freeCents[n.k]) o.hz = C.hz(Sf, c, n.deg) * Math.pow(2, c.freeCents[n.k] / 1200); C.sing(Sf, c, n.deg, tg, o); for (const d of n.chord) C.sing(Sf, c, d, tg + .004, Object.assign({}, o, { gain: o.gain * .7, chordTone: true, hz: undefined })); } };
// perform = sing with ornaments (grace notes, slides) from genes
C.perform = (Sf, c, deg, when, o = {}) => { const MU = c.P.mus; if (MU.ornament > .7 && !o.part) { const r = RS.rng(RS.hash(c.born, when * 1000 | 0))(); if (r < (MU.ornament - .7) * 2) { C.sing(Sf, c, deg + 1, when - .06, { gain: (o.gain || 1) * .4, len: .2, grace: true }); } }
  return C.sing(Sf, c, deg, when, o); };
// S3: the voice is continuous and context-dependent: the same creature sounds different tired vs alert, alarmed vs calm, small vs grown, at night,
// next to a partner (timbres converge with empathy), cold vs warm. Pitch stays musical (degree/key); colour, formants, vibrato, breath, attack move.
C.voiceCtx = (Sf, c) => { const ar = RS.clamp((c.state === 'flee' ? .8 : 0) + (c.alarm || 0) * .6 + (c.ens && c.ens.leader === c ? .15 : 0), 0, 1), en = RS.clamp(c.energy, 0, 1), night = RS.clamp(1 - Sf.day, 0, 1) * (c.P.beh.night > .5 ? .3 : 1), gr = RS.clamp(c.growth, .2, 1), temp = Sf.env.temp == null ? .5 : Sf.env.temp;
  let partner = null, pd = 1e9; for (const [o, d] of (c.near || [])) if (!o.dead && d < pd && (c.bonds[o.id] > .5 || (c.ens && c.ens.grp.includes(o)))) { pd = d; partner = o; }
  return { arousal: ar, energy: en, night, growth: gr, temp, partner, sleep: c.sleep || 0 }; };
C.voiceP = (c, x) => { const P = c.P, sz = 1 / Math.sqrt(x.growth + .25) / 1.12, fsh = sz * (1 + x.arousal * .22 - (1 - x.energy) * .12), emp = c.P.life.empathy;
  let bright = RS.clamp(P.bright * (.55 + .6 * x.energy) + x.arousal * .3 - x.night * .2, .02, 1);   /* v0.3.1: no timbre convergence (jam-mates share a tint, not a sound) */
  return Object.assign({}, P, { F1: P.F1 * fsh, F2: P.F2 * fsh, bright, vib: P.vib * (1 + x.arousal * 2) * (1 - x.night * .4) * (1 - x.sleep * .5), vibR: P.vibR * (1 + x.arousal * .6) + (x.temp - .5) * 2, breath: RS.clamp(P.breath + x.night * .3 + (1 - x.energy) * .25 + x.sleep * .3, 0, 1), vdecay: P.vdecay * (1 + (1 - x.arousal) * .3) }); };
C.sing = (Sf, c, deg, when, o = {}) => { if (RS.ONE_SOURCE && c.mind && !o.manual && !o.scored && !Sf._player) return null;   /* (a DAW-written score is the player's music: it plays) */   /* v0.3.1: an ohm only sounds through its mind */ const f0 = o.hz || C.hz(Sf, c, deg), vx = C.voiceCtx(Sf, c), v = Sf.S.voice(C.voiceP(c, vx), 0, { gain: (.08 + .12 * c.activity) * (1 - c.fade * .8) * (o.gain || 1) * c.P.loud * (Sf.env.atmo == null ? 1 : .5 + Sf.env.atmo * .6), len: o.len, pan: Sf.panOf(c.x) });
  const r = f0 / v.f0; v.modes.forEach(m => m.f *= r); v.f0 = f0; v.send = .3 + (Sf.env.atmo || .5) * .3 + (Sf.nestNear && Sf.nestNear(c.x, c.y) ? .3 : 0); v.body = c.segs[0] ? c.segs[0].id : 0; v.src = c; v.lane = c.id; v.len = o.len; v.grid = !!o.grid; v.modes.forEach((m, k) => { if (k) m.a *= Math.pow(.45 + .9 * vx.energy + .4 * vx.arousal, Math.min(k, 6) * .35); }); v.deg = deg; if (c.P.inst) { v.inst = c.P.inst; v.dur = o.len || .3; v.vel = RS.clamp(o.gain || .8, .1, 1); } v.chordTone = !!o.chordTone; v.scored = !!o.scored; v.ctx = { arousal: vx.arousal, energy: vx.energy, night: vx.night, growth: vx.growth, partner: vx.partner ? vx.partner.id : null }; if (vx.arousal > .3) v.glide = (v.glide || 1) * (1 + vx.arousal * .03); v.gain *= .7 + vx.arousal * .5 + vx.energy * .2 - vx.night * .15;
  if (c.P.purity < .3) v.click = (v.click || 0) + (.3 - c.P.purity) * .5;   // noisy voices breathe
  if (c.P.mus.ornament > .85 && !o.grace) v.glide = 1 + (c.P.mus.ornament - .85) * .4;   // slides
  if (c.light > .2) v.modes.forEach((m, k) => { if (k > 2) m.a *= 1 + c.light; });   // light brightens the voice
  if (RS.Abilities) RS.Abilities.onSing(Sf, c, v, f0, when);
  if (RS.Vocal && !o.grace) RS.Vocal.attach(Sf, c, v, o.len || Sf.M.dt16() * 2);   // articulatory part (continuous: c.P.tract.amt)
  Sf.play(v, when, c.x, c.y); c.lastSing = when || Sf.now(); c.lastDeg = deg; c.lastHz = f0; c.stats.sang++; Sf.fx({ k: 'sing', c, t: when || Sf.now(), dur: .5, f: f0 });
  if (o.grace || o.chordTone) return f0;
  // others perceive it: call & response + imitation (exact copy, no copying errors) — only if they can hear it, see its pulse, or feel it
  for (const [oc, d] of (c.near || [])) { if (d > 200 || oc.dead) continue; const p = RS.Ensemble.perceive(Sf, oc, c); if (!p) continue; oc.heard.push({ from: c.id, deg, t: when || Sf.now(), ch: p.ch }); if (oc.heard.length > (oc.P.life.memLen || 6)) oc.heard.shift();
    // culture: songs only change by learning from someone heard (or a player prompt) — never by random drift. In a group you learn the current leader's song.
    const inGrp = oc.ens && oc.ens.grp.length > 1; if (inGrp && oc.ens.leader !== c) continue;
    if (v.syl && v.syl.w && p.ch === 'ear' && oc.P.beh.mimic > .5 && !(oc.words || []).find(q => q.w === v.syl.w) && RS.rng(RS.hash(oc.born, c.stats.sang, 7))() < (oc.P.beh.mimic - .4) * .5) { const src = (c.words || []).find(q => q.w === v.syl.w); if (C.learnWord(Sf, oc, v.syl.w, { src: 'heard', from: c.id, ph: src && src.ph })) { oc.learnedFrom = oc.learnedFrom || {}; oc.learnedFrom[c.id] = (oc.learnedFrom[c.id] || 0) + 1; Sf.stats.wordSpread = (Sf.stats.wordSpread || 0) + 1; } }
    if (oc.P.beh.mimic > .6 && RS.rng(RS.hash(oc.born, c.stats.sang))() < (oc.P.beh.mimic - .5) * .3) { oc.motif[oc.mstep % oc.motif.length] = deg; oc.stats.imitated++; oc.learnedFrom = oc.learnedFrom || {}; oc.learnedFrom[c.id] = (oc.learnedFrom[c.id] || 0) + 1; Sf.stats.imitations = (Sf.stats.imitations || 0) + 1; }
    if (!inGrp && oc.P.beh.chorus > .55 && (!oc.respondT || Sf.now() - oc.respondT > 2)) { oc.respondT = Sf.now(); const nx = Sf.M.nextGrid((when || Sf.now()) + Sf.M.beatDur() * .9, 2); C.sing(Sf, oc, deg + 2, nx.t, { gain: .7 }); Sf.stats.responses = (Sf.stats.responses || 0) + 1; } }
  return f0; };
// adopted instrument: loop the player's last strikes on it (or a gene rhythm), synced to the world clock
C.adopt = (Sf, c, b) => { c.home = b; const str = (b.strikes || []).filter(s => Sf.now() - s.t < Sf.M.barDur() * 2.2); let loop;
  if (str.length) { const bar = Sf.M.barDur(), t0 = str[0].t; const len = (str[str.length - 1].t - t0) > bar * .95 ? 32 : 16; loop = { len, steps: str.map(s => ({ s: Math.round((s.t - t0) / Sf.M.dt16()) % len, x: s.x - Sf.W.center(b)[0], y: s.y - Sf.W.center(b)[1], v: s.v })), learned: true }; }
  else { const k = 2 + Math.floor(c.P.beh.rhythm * 5), steps = []; for (let i = 0; i < 16; i++) if (Math.floor(i * k / 16) !== Math.floor((i - 1) * k / 16)) steps.push({ s: i, x: 0, y: 0, v: 300 + c.P.beh.rhythm * 300 }); loop = { len: 16, steps, learned: false }; }
  c.loop = loop; c.loopG0 = c.gen > 0 ? Math.floor(Sf.M.b16(Sf.now()) / 16) * 16 + Math.round(C.genTraits(c).phase * 16) : Math.round(Sf.M.b16(Sf.now())); c.lastLoopPos = null; Sf.fx({ k: 'adopt', c, b, t: Sf.now(), dur: 1.4 }); Sf.stats.adopt = (Sf.stats.adopt || 0) + 1; return loop; };
C.playLoop = (Sf, c, g, tg) => { const L = c.loop, b = c.home; if (!b || !Sf.W.bodies.has(b.id)) { c.home = null; c.loop = null; return; } const pos = C.loopPos(Sf, c, g); if (pos === c.lastLoopPos) return; c.lastLoopPos = pos; const s = ((pos % L.len) + L.len) % L.len; if (s === 0) { c.loopStarts = c.loopStarts || []; c.loopStarts.push(tg); if (c.loopStarts.length > 8) c.loopStarts.shift(); }
  for (const st of L.steps) if (st.s === s) { const [bx, by] = Sf.W.center(b); Sf.strikeBody(b, bx + st.x, by + st.y, st.v, tg, { byCreature: c }); if (st.chord) st.chord.forEach((d, i) => Sf.strikeBody(b, bx + st.x + (i + 1) * 3, by + st.y, st.v * .7, tg + (i + 1) * .025, { byCreature: c, chordTone: true })); if (!RS.CALM) C.impulse(Sf, c, 0, -120); c.stats.strikes++; } };
// a PLAYER EDIT of one gene (envelope halo, tuning gestures, DAW bead edges): written into the genome (persisted in the code, inherited by
// offspring), remembered in editedGenes (DNA-view highlight); the instrument is re-expressed so the next note already sounds different
C.editGene = (Sf, c, name, v) => { const i = typeof name === 'number' ? name : RS.IG[name]; if (i == null) return; if (!c.code0) c.code0 = c.code || RS.Genome.toCode(c.g); if (Sf && Sf.undoPush && !Sf._undoing) Sf.undoPush({ k: 'gene', id: c.id, i, v: c.g[i] });   /* the birth DNA is kept; c.g carries the learned (epigenetic, heritable) values */ c.g[i] = RS.clamp(v, 0, .9999); c.code = RS.Genome.toCode(c.g); { const dk = c.g.dk; c.g = RS.Genome.fromCode(c.code); if (dk) c.g.dk = dk; } /* snapped to stored precision */ c._gt = null;
  if (RS.Inst) { c.P.inst = RS.Inst.fromGenome(c.g); if (c.mind) c.mind.I = c.P.inst; } c.mind = c.mind && c.mind.g !== c.g ? Object.assign(c.mind, { g: c.g }) : c.mind; c.editedGenes = c.editedGenes || []; if (!c.editedGenes.includes(i)) c.editedGenes.push(i); c.edited = true; Sf.stats.geneEdits = (Sf.stats.geneEdits || 0) + 1; };
C.release = (Sf, c) => { if (c.home) Sf.fx({ k: 'unadopt', c, t: Sf.now(), dur: .8 }); c.home = null; c.loop = null; };
// ---------------- offspring ----------------
// ---------------- epigenetics: a creature's own genome never changes from learning. What it learns (key centre, tempo, loop phase,
// register, motif) lives in an epigenetic layer (c.epi.marks: gene index -> expressed value) that modulates expression. Offspring are built
// from the parents' EXPRESSED genomes by the normal crossover, so learned key/timing become real DNA in the child (no mutation, no drift).
C.genTraits = c => c._gt || (c._gt = C.defaults(c.g, c.P));
C.epiUpdate = (Sf, c) => { const E = RS.Genome.enc, gt = C.genTraits(c), m = {}, gm = c.P.mus.motif.p;
  if (Math.abs(c.keyC - gt.keyC) > .5) m[164] = E.key(c.keyC); if (Math.abs(c.tempo - gt.tempo) > .0015) m[165] = E.tempo(c.tempo); if (c.epiPhase != null && Math.abs(c.epiPhase - gt.phase) > .002) m[166] = E.phase(c.epiPhase); if (Math.abs(c.regOff - gt.regOff) > .5) m[167] = E.reg(c.regOff);
  for (let k = 0; k < 8; k++) { const v = c.motif[k] === undefined ? gm[k] : c.motif[k]; if (v !== gm[k]) m[107 + k] = E.deg(v == null ? null : RS.clamp(Math.round(v), -6, 9)); }
  if (c.mdur && RS.Mind && RS.Mind.encDur) { const gd = c.P.mus.motif.d; for (let k = 0; k < 8; k++) if (c.mdur[k] != null && c.mdur[k] !== gd[k] && RS.Mind.DUR.includes(c.mdur[k])) m[115 + k] = RS.Mind.encDur(c.mdur[k]); }   /* learned groove too */
  c.epi = c.epi || { via: {} }; c.epi.marks = m; return m; };
C.expressed = (Sf, c) => { const m = C.epiUpdate(Sf, c), x = new Float32Array(c.g); for (const k in m) x[k] = m[k]; return x; };
C.child = (Sf, a, b, seed) => { const g = RS.Genome.mutate(RS.Genome.crossover(C.expressed(Sf, a), C.expressed(Sf, b), seed), seed ^ 0x9e37, .12, .03, .02);
  const words = []; for (const w of [...(a.words || []), ...(b.words || [])]) if (!words.find(q => q.w === w.w) && words.length < C.MAXW) words.push({ w: w.w, ph: w.ph || null, src: 'inherited', innate: true });   /* the learned song words become the child's own (deterministic, a's first) */
  const msrc = RS.Mind && RS.Mind.breed ? RS.Mind.breed(C.expressed(Sf, a), C.expressed(Sf, b), g, seed, RS.Mind.fit(a), RS.Mind.fit(b)) : null;   /* inherited note data: whole call / answer / groove units, fitted to the child's harmony */
  const em = [a, b].map(q => q.epi && q.epi.mind).filter(Boolean)[(seed >>> 3) & 1] || [a, b].map(q => q.epi && q.epi.mind).find(Boolean) || null;   /* a learned tonal system / meter is passed on epigenetically */
  return { g, gen: Math.max(a.gen, b.gen) + 1, parents: [a.id, b.id], words, mind: em, msrc: msrc ? { p: msrc.src, groove: msrc.groove, ca: a.col, cb: b.col } : null, voice: RS.Play ? RS.Play.childVX(a.voice, b.voice) : null }; };
// ---------------- loop sync after communication: tempo locks to a simple ratio of the partner's, the loop restarts on the partner's
// (conductor's) bar grid, loop lengths become simply related (1:1, 1:2, 2:3). Before communication loops run on their own clock.
// ---------------- words (epigenetic song layer): learned from the player (voice or ink), from teachers, or by hearing others sing them
C.MAXW = 6;
C.learnWord = (Sf, c, w, o = {}) => { if (!c || c.dead || (!w && !(o.ph && o.ph.length))) return false; w = w ? String(w).toLowerCase().replace(/[^a-z' ]/g, '').trim() : ''; if (!w && !o.ph) return false; c.words = c.words || [];
  const key = w || (o.ph ? o.ph.map(s => s.on.join('') + s.nu).join('-') : ''); if (c.words.find(q => (q.w || q.key) === key)) return false;
  c.words.push({ w: w || key, ph: o.ph || null, src: o.src || 'heard', from: o.from || null, contour: o.contour || null, echoed: !o.contour }); if (c.words.length > C.MAXW) c.words.shift(); c._wsyl = null;
  c.epi = c.epi || { marks: {}, via: {} }; c.epi.words = c.words.length; c.epi.via.words = o.src || 'heard'; Sf.stats.wordsLearned = (Sf.stats.wordsLearned || 0) + 1; return true; };
// a word's syllables (pseudo-words from voice shapes carry their own syllables)
C.wordSyl = w => w.ph && w.ph.length ? w.ph : RS.Vocal.text(w.w);
// the first imitation of a spoken word echoes the speaker's intonation and rhythm (contour), then it is sung on the conductor's pitches
C.echoWord = (Sf, c, w, when) => { const sy = C.wordSyl(w), ct = w.contour || []; let t = when || Sf.now() + .05; const base = C.hz(Sf, c, 0), T = c.P.tract || { amt: .5, len: 1, tense: .6, nasal: 0, agil: .5 };
  sy.forEach((s, k) => { const cc = ct[k] || ct[ct.length - 1] || { st: 0, dur: .22 }; const f0 = base * Math.pow(2, (cc.st || 0) / 12), dur = RS.clamp(cc.dur || .22, .12, .6);
    const v = { modes: [{ f: f0, a: 1, d: dur }], gain: .12 * (1 - Math.max(.3, T.amt) * .9), att: .03, send: .35, raw: true, player: true, lane: c.id, tract: { key: c.born % 1e6 | 0, amt: Math.max(.3, T.amt), len: T.len, tense: T.tense, nasal: T.nasal, agil: T.agil, sy: s, dur } };
    Sf.play(v, t, c.x, c.y); t += dur; });
  w.echoed = true; Sf.fx({ k: 'sing', c, t: when || Sf.now(), dur: .8, f: base }); return t; };
C.RATIOS = [1, .5, 2, 2 / 3, 1.5];
C.entrain = (Sf, c, a, via) => { if (!a || a === c || a.dead) return false; if (via === 'teach' && a.synced && a.synced.to === c.id) a.synced = null; { let q = a, n = 0; while (q && q.synced && n++ < 12) { if (q.synced.to === c.id) return false; q = Sf.creatures.find(z => z.id === q.synced.to); } } /* no sync cycles: follow the chain to its conductor */ let best = 1; for (const r of C.RATIOS) if (Math.abs(Math.log(c.tempo / (a.tempo * r))) < Math.abs(Math.log(c.tempo / (a.tempo * best)))) best = r; if (via === 'teach') best = 1;
  c.tempo = a.tempo * best; const gNow = Math.round(Sf.M.b16(Sf.now())); if (a.loopG0 == null) a.loopG0 = Math.floor(gNow / 16) * 16; const G0 = a.loopG0; c.loopG0 = G0; c.epiPhase = ((G0 % 16) + 16) % 16 / 16;
  if (a.loop) { c.loopAcc = C.loopAccAt(Sf, a, gNow) * best; c.loopLastG = gNow; } else { c.loopAcc = (gNow - Math.floor(gNow / 16) * 16) * c.tempo; c.loopLastG = gNow; }
  if (c.loop && a.loop) { const la = a.loop.len, opts = [la, la * 2, la / 2, la * 1.5, la * 2 / 3].filter(n => Number.isInteger(n) && n >= 4 && n <= 64); let L = opts[0]; for (const n of opts) if (Math.abs(Math.log(n / c.loop.len)) < Math.abs(Math.log(L / c.loop.len))) L = n;
    if (L !== c.loop.len) { const old = c.loop.len, st = []; if (old >= 1) for (let o = 0; o < L; o += old) for (const q of c.loop.steps) if (q.s + o < L) st.push(Object.assign({}, q, { s: q.s + o })); c.loop.steps = st.filter(q => q.s < L); c.loop.len = L; } }
  c.synced = { to: a.id, via, ratio: best, t: Sf.now() }; c.epi = c.epi || { via: {} }; c.epi.via = c.epi.via || {}; c.epi.via[via] = (c.epi.via[via] || 0) + 1; C.epiUpdate(Sf, c); Sf.stats.entrained = (Sf.stats.entrained || 0) + 1; Sf.fx({ k: 'sync', c, t: Sf.now(), dur: 1 }); return true; };
// personal loop clock: an accumulator advanced by the creature's own tempo each world 16th (robust to tempo changes). A synced creature is
// hard-locked to its partner's clock (tempo x ratio, same accumulated phase), so the two stay audibly together.
C.loopAccAt = (Sf, c, g) => { const lt = RS.Abilities ? RS.Abilities.tempoAt(Sf, c) : 1; if (c.loopAcc == null) { c.loopAcc = c.loopG0 != null ? (g - c.loopG0) * c.tempo : 0; c.loopLastG = g; } if (g !== c.loopLastG) { c.loopAcc += (g - c.loopLastG) * c.tempo * lt; c.loopLastG = g; } return c.loopAcc; };
C.loopPos = (Sf, c, g) => { if (c.synced) { const a = Sf.creatures.find(q => q.id === c.synced.to && !q.dead); if (a && a.loop && a.loopAcc != null) { const r = c.synced.ratio; c.tempo = a.tempo * r; c.loopAcc = C.loopAccAt(Sf, a, g) * r; c.loopLastG = g; return Math.floor(c.loopAcc + 1e-6); } }
  return Math.floor(C.loopAccAt(Sf, c, g) + 1e-6); };
C.serial = c => ({ id: c.id, code: c.code, dk: c.g && c.g.dk ? c.g.dk : undefined, muted: c.muted || undefined, x: Math.round(c.x || 0), y: Math.round(c.y || 0), growth: +c.growth.toFixed(3), energy: +c.energy.toFixed(2), keyC: +c.keyC.toFixed(1), tempo: +c.tempo.toFixed(4), regOff: +c.regOff.toFixed(1), phase: c.phase, born: c.born, parents: c.parents, gen: c.gen, motif: c.motif, mdur: c.mdur, mvel: c.mvel || null, mlen: c.mlen || null, mchord: c.mchord || null, scored: !!c.scored, loopLen: c.loopLen || null, freeCents: c.freeCents || null, age: Math.round(c.age || 0), natural: c.natural || false, epi: c.epi ? { marks: C.epiUpdate(null, c), via: c.epi.via || {} } : null, epiPhase: c.epiPhase == null ? null : c.epiPhase, loopG0: c.loopG0 == null ? null : c.loopG0, synced: c.synced || null, editedGenes: c.editedGenes && c.editedGenes.length ? c.editedGenes : null, learnedSys: c.learnedSys == null ? null : c.learnedSys, learnedMeter: c.learnedMeter || null, motifSrc: c.motifSrc || null, motifFit: c.motifFit || null, voice: c.voice || null, sung: c.sung || null, code0: c.code0 || null, taughtMotif: c.taughtMotif || 0, guide: !!c.guide, bond: c.bond || null, sym: RS.Sym && c.sym ? RS.Sym.packC(c) : null, rel: c.rel ? Object.fromEntries(Object.entries(c.rel).map(([k, v]) => [k, +v.toFixed(3)])) : null, tapCell: c.tapCell || null, eggVoice: c.eggVoice || null, glyphs: c.glyphs || null, eggBpm: c.eggBpm || null, eggTier: c.eggTier || null, parentId: c.youngT != null ? c.parentId : null, copied: c.copied || 0, shaped: c.shaped || 0, sec: c.sec || undefined, lumps: c.lumps || undefined, form: c.form || undefined, clayFam: c.clayFam || undefined, fired: c.fired || undefined, stutter: c.stutter ? +c.stutter.toFixed(3) : null, grit: c.grit ? +c.grit.toFixed(3) : null, wxMem: c.wxMem || null, pollen: c.pollen || null, mindTonic: c.mind ? Math.round(c.mind.tonicC * 10) / 10 : (c.mindTonic == null ? null : c.mindTonic), colourC: c.mind && c.mind.colourC ? Math.round(c.mind.colourC * 10) / 10 : (c.colourC || null), exp: c.exp || null, addPh: c.addPh || null, paint: c.paint || null, inhP: c._inhP || null, words: c.words && c.words.length ? c.words.map(w => ({ w: w.w, ph: w.ph || null, src: w.src, innate: !!w.innate })) : null });
})(typeof window !== 'undefined' ? window : globalThis);
