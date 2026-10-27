'use strict';
// Special abilities: they EMERGE when gene combinations cross thresholds (no classes, no text). Heritable (they live in the genes), rare.
// Each condition is [gene, '>'|'<', tail probability]; thresholds are derived so that each ability alone has ~0.6% prevalence in random genomes
// (=> ~14% of random genomes carry one; ~20 offspring of ordinary parents show ~1-2). Strength = how far past the thresholds (0..1).
// Every effect is shown + heard through the shared systems (physics, light, music, fx) — see think/onSing/onGrid below.
(function (G) {
const RS = G.RS, GI = () => RS.GI, A = RS.Abilities = {};
const c2 = .0775, c3 = .182;   // tails for 2- and 3-gene combos (0.0775^2 ~ 0.182^3 ~ 0.006)
const D = (id, conds) => ({ id, conds: conds.map(([k, op, q]) => ({ k, op, q, t: op === '>' ? 1 - q : q })) });
A.DEFS = [
  D('echo', [['sight', '<', c3], ['hearing', '>', c3], ['echo', '>', c3]]), D('pitch', [['hearing', '>', c2], ['precision', '>', c2]]), D('metronome', [['precision', '>', c2], ['rhythm', '>', c2]]),
  D('mimic', [['hearing', '>', c3], ['creativity', '>', c3], ['mimic', '>', c3]]), D('overtone', [['purity', '>', c2], ['range', '>', c2]]), D('lightsing', [['glow', '>', c2], ['clear', '>', c2]]),
  D('shatter', [['loudness', '>', c3], ['reg', '>', c3], ['purity', '>', c3]]), D('levitate', [['loudness', '>', c3], ['precision', '>', c3], ['buoy', '>', c3]]), D('conduct', [['leadership', '>', c2], ['rhythm', '>', c2]]),
  D('compose', [['creativity', '>', c2], ['memory', '>', c2]]), D('weave', [['builder', '>', c2], ['stiff', '<', c2]]), D('glass', [['clear', '>', c2], ['energySrc', '>', c2]]),
  D('tide', [['aquatic', '>', c3], ['rhythm', '>', c3], ['waterLove', '>', c3]]), D('storm', [['loudness', '>', c2], ['atmoAff', '>', c2]]), D('seed', [['vacuumTol', '>', c2], ['fertility', '>', c2]]),
  D('phase', [['clear', '>', c2], ['clear2', '>', c2]]), D('symbiont', [['empathy', '>', .126], ['shyness', '>', .126], ['size', '<', .38]]), D('heal', [['empathy', '>', c3], ['hearing', '>', c3], ['precision', '>', c3]]),
  D('dream', [['night', '>', c2], ['memory', '>', c2]]), D('chameleon', [['chameleon', '>', c2], ['sat', '<', c2]]), D('bud', [['fertility', '>', c2], ['regen', '>', c2]]),
  D('ancestral', [['memory', '>', c2], ['patience', '>', c2]]), D('void', [['vacuumTol', '>', c2], ['gravTol', '>', c2]]), D('gravity', [['buoy', '>', c2], ['mass', '>', c2]]), D('timestretch', [['spark', '>', c2], ['patience', '>', c2]])];
A.IDS = A.DEFS.map(d => d.id);
const gidx = k => k === 'waterLove' ? 69 : k === 'sat' ? 34 : GI()[k];
// the raw gene value is compared with the sense skew undone (sight/hearing genes are raw genes)
A.strengthOf = (g, d) => { let m = 1; for (const c of d.conds) { const v = g[gidx(c.k)]; const ok = c.op === '>' ? v > c.t : v < c.t; if (!ok) return 0; const marg = c.op === '>' ? (v - c.t) / (1 - c.t) : (c.t - v) / c.t; m = Math.min(m, marg); } return .35 + .65 * RS.clamp(m, 0, 1); };
A.of = g => { const out = []; for (const d of A.DEFS) { const s = A.strengthOf(g, d); if (s > 0) out.push({ id: d.id, s }); } return out; };
A.has = (c, id) => { const a = c.P.abil && c.P.abil.find(x => x.id === id); return a ? a.s : 0; };
// push an ability's genes over threshold (natural rare life, tests). r: rng
A.grant = (g, id, r) => { const d = A.DEFS.find(x => x.id === id); for (const c of d.conds) { const i = gidx(c.k), u = r ? r() : .5; g[i] = c.op === '>' ? c.t + (1 - c.t) * (.25 + .7 * u) : c.t * (.05 + .7 * u); } return g; };
const nearC = (Sf, c, R) => Sf.creatures.filter(o => o !== c && !o.dead && Math.hypot(o.x - c.x, o.y - c.y) < R);
const st = (Sf, c, id, n = 1) => { c.ab = c.ab || {}; c.ab[id] = (c.ab[id] || 0) + n; Sf.stats['ab_' + id] = (Sf.stats['ab_' + id] || 0) + n; };
const wrapC = v => ((v % 1200) + 1200) % 1200, sdist = (a, b) => { let d = wrapC(a - b); if (d > 600) d -= 1200; return d; };
// ---------------- per-brain-tick behaviour (10 Hz) ----------------
A.think = (Sf, c, dt) => { const ab = c.P.abil; if (!ab || !ab.length || c.dead) return; const W = Sf.W, M = Sf.M, now = Sf.now();
  for (const { id, s } of ab) switch (id) {
    case 'echo': { // pulses every ~1.2 s; echoes from nearby bodies steer it away / toward instruments even in the dark
      if (now - (c.echoT || -9) > 1.2 - s * .4) { c.echoT = now; Sf.fx({ k: 'ring', x: c.x, y: c.y, r: 160, col: [200, 230, 255], dur: .7 }); Sf.play({ modes: [{ f: 3200, a: 1, d: .03 }, { f: 4700, a: .5, d: .02 }], gain: .05, click: .6, att: .001 }, now + .01, c.x, c.y); st(Sf, c, id);
        let ox = 0, oy = 0; W.query(c.x, c.y, 120, j => { const b = W.bodies.get(W.bod[j]); if (!b || (b.meta && b.meta.c === c)) return; const dx = W.x[j] - c.x, dy = W.y[j] - c.y, d = Math.hypot(dx, dy) || 1; ox -= dx / d / d; oy -= dy / d / d; }); c.echoAvoid = [ox * 40, oy * 40];
        const ins = Sf.instruments(); if (ins.length) { let best = null, bd = 1e9; for (const b of ins) { const [bx, by] = W.center(b), d = Math.hypot(bx - c.x, by - c.y); if (d < bd) { bd = d; best = [bx, by]; } } if (best && bd < 400) c.echoTarget = best; } }
      if (c.echoAvoid && c.want) { c.want[0] += c.echoAvoid[0] * .2; c.want[1] += c.echoAvoid[1] * .2; } break; }
    case 'pitch': for (const o of nearC(Sf, c, 220)) { const d = sdist(c.keyC, o.keyC); o.keyC += d * (1 - Math.exp(-dt * .25 * s)); if (Math.abs(d) > 3 && c.rnd() < dt) Sf.fx({ k: 'tune', a: c, b: o, dur: .4 }); st(Sf, c, id, dt); } break;
    case 'metronome': for (const o of nearC(Sf, c, 260)) { if (o.P.sense.deaf && o.P.sense.blind) continue; o.tempo += (c.tempo - o.tempo) * (1 - Math.exp(-dt * .5 * s)); let dp = c.phase - o.phase; dp -= Math.round(dp); o.phase += dp * (1 - Math.exp(-dt * .5 * s)); st(Sf, c, id, dt); } break;
    case 'mimic': { const h = Sf.recentNotes ? Sf.recentNotes.filter(n => now - n.t < 3 && Math.hypot(n.x - c.x, n.y - c.y) < 300 && n.src !== c && n.lane !== 'env') : []; if (h.length >= 3 && now - (c.mimT || -9) > 4) { c.mimT = now; const degs = h.slice(-4).map(n => M.nearestDeg(n.f) - M.nearestDeg(C().hz(Sf, c, 0))); for (let k = 0; k < degs.length; k++) c.motif[k % c.motif.length] = RS.clamp(degs[k], -7, 9); c.mimicked = degs.slice(); c.learnedFrom = c.learnedFrom || {}; for (const n of h.slice(-4)) c.learnedFrom[n.lane] = (c.learnedFrom[n.lane] || 0) + 1; st(Sf, c, id); Sf.fx({ k: 'mimic', c, dur: .8 }); } break; }
    case 'levitate': if (Math.random() < dt * 2 && now - (c.lastSing || -9) < 1.2 && c.levTargets && c.levTargets.length) Sf.fx({ k: 'standing', x: c.x, y: c.y - 40, dur: .4 }); break;
    case 'conduct': { const grp = nearC(Sf, c, 320); for (const o of grp) { o.tempo += (c.tempo - o.tempo) * (1 - Math.exp(-dt * .8 * s)); o.conductor = c; o.dynFollow = c.pulseGain || 1; } c.conducting = grp.length; if (grp.length) st(Sf, c, id, dt); break; }
    case 'weave': if (c.growth > .8 && (c.weaveT == null || now - c.weaveT > 25 - s * 10) && (Sf.woven || 0) < 12) { c.weaveT = now; const pR = Sf.surfArc ? Sf.surfArc(c.x, c.y, 60, 2) : [c.x + 60, Sf.ground(c.x + 60) - 2], pL = Sf.surfArc ? Sf.surfArc(c.x, c.y, -60, 2) : [c.x - 60, Sf.ground(c.x - 60) - 2], pM = Sf.surfAt ? Sf.surfAt(c.x, c.y, Math.max(0, Sf.alt(c.x, c.y)) + 40 + 30 * s) : [c.x, c.y - 40 - 30 * s]; const pts = [pL, pM, pR];   /* v0.8a9: radial ground */ const b = Sf.makeRod(pts, 2.2, { pinStart: true, pinEnd: true, role: 'instrument', meta: { woven: true, owner: c.id } }); if (b) { Sf.woven = (Sf.woven || 0) + 1; Sf.fx({ k: 'weave', b, dur: 1.2 }); Sf.strikeBody(b, c.x, c.y - 30, 300, now + .05, { soft: true, auto: true }); st(Sf, c, id); } } break;
    case 'tide': break;   // on the grid
    case 'storm': if (now - (c.lastSing || -9) < .5 && (Sf.env.atmo || 0) > .15 && now - (c.stormT || -99) > 30 - s * 12) { c.stormT = now; Sf.weather.rain = Math.max(Sf.weather.rain || 0, 40); Sf.weather.storm = true; Sf.stormBy = c.id; Sf.fx({ k: 'bolt', pts: [[c.x + 30, Sf.view.y0], [c.x + 10, c.y - 120], [c.x + 40, c.y - 60]], dur: .45 }); Sf.play({ modes: [60, 90, 140].map((f, k) => ({ f, a: 1 / (k + 1), d: 2 })), gain: .12, click: 1, att: .002, send: .9, force: true }, now + .02, c.x, c.y); st(Sf, c, id); } break;
    case 'seed': if (c.growth > .9 && c.energy > .8 && (c.seedT == null || now - c.seedT > 90) && Sf.sys && Sf.sys.comet) { c.seedT = now; Sf.seedOut = Sf.seedOut || []; Sf.seedOut.push({ code: c.code, keyC: c.keyC, tempo: c.tempo, from: c.id }); C().impulse(Sf, c, 0, -500); Sf.fx({ k: 'launch', x: c.x, y: c.y, col: c.col, dur: 1.5 }); Sf.play({ modes: [{ f: C().hz(Sf, c, 0), a: 1, d: 1.6 }], glide: 4, gain: .08, att: .05, force: true }, now + .01, c.x, c.y); st(Sf, c, id); } break;
    case 'phase': { const want = c.state === 'flee' || (c.touching && c.touching.meta && c.touching.meta.role !== "creature" && c.rnd() < dt * .6 * s); if (want && !c.phasing) { c.phasing = now + 1.6 * s; for (const b of c.bodies) W.ghost(b, true); Sf.fx({ k: 'phase', c, dur: 1.6 }); Sf.play({ modes: [{ f: C().hz(Sf, c, 0), a: 1, d: 1 }], gain: .05, att: .2, lp: .25, send: .8 }, now + .01, c.x, c.y); st(Sf, c, id); }
      if (c.phasing && now > c.phasing) { c.phasing = 0; for (const b of c.bodies) W.ghost(b, false); } break; }
    case 'symbiont': { if (!c.host) { const hosts = nearC(Sf, c, 140).filter(o => C().radius(o) > C().radius(c) * 1.5 && !o.guest); if (hosts.length && c.growth > .5) { c.host = hosts[0]; hosts[0].guest = c; for (const b of c.bodies) W.ghost(b, true); Sf.fx({ k: 'enter', a: c, b: hosts[0], dur: 1 }); st(Sf, c, id); } }
      else if (c.host.dead) { for (const b of c.bodies) W.ghost(b, false); c.host = null; } else { const h = c.host; h.energy = Math.min(1, h.energy + dt * .03 * s); h.voiceBoost = 1 + .6 * s; c.energy = Math.min(1, c.energy + dt * .02); c.want = [(h.x - c.x) / 30, (h.y - c.y) / 30]; c.wantMag = 1; } break; }
    case 'heal': { const dim = nearC(Sf, c, 300).filter(o => o.fade > .05 || o.energy < .3).sort((a, b) => (b.fade - a.fade)); if (dim.length) { const o = dim[0], d = Math.hypot(o.x - c.x, o.y - c.y) || 1; c.want = [(o.x - c.x) / d, (o.y - c.y) / d]; c.wantMag = .8;
        if (d < 160) { o.fade = Math.max(0, o.fade - dt * .08 * s); o.energy = Math.min(1, o.energy + dt * .05 * s); o.healed = (o.healed || 0) + dt; if (now - (c.healT || -9) > 1.5) { c.healT = now; const f = C().hz(Sf, o, 0); C().sing(Sf, c, 2, now + .02, { gain: .8, len: 1.6 }); Sf.fx({ k: 'heal', a: c, b: o, dur: 1.2 }); } st(Sf, c, id, dt); } } break; }
    case 'chameleon': { const L = Sf.lightAt(c.x, c.y), target = L && L.wl ? L.wl : (Sf.pal && Sf.pal.groundWl) || 550; const old = c.P.wl; c.P.wl += (target - c.P.wl) * (1 - Math.exp(-dt * .3 * s)); const dKey = (1200 * Math.log2((700 / c.P.wl) / (700 / old))); c.keyC += dKey; if (Math.abs(c.P.wl - old) > .05) { Sf.colourCreature(c); st(Sf, c, id, dt); } break; }
    case 'bud': if (c.growth >= 1 && c.energy > .85 && now - (c.budT || c.bornT || now) > 70 - s * 30 && Sf.creatures.length < 14) { c.budT = now; c.energy *= .55; const g = RS.Genome.mutate(C().expressed(Sf, c), RS.hash(c.id, now)); const k = Sf.addCreature(g, c.x + C().radius(c) + 12, c.y, { growth: .3, keyC: c.keyC, tempo: c.tempo, regOff: c.regOff, gen: c.gen + 1, parents: [c.id] }); k.budded = true;
      // a bud is a clone of what the parent has BECOME (no mutation): its expressed genome (learned key/tempo/motif as epigenetic DNA), its current song, its words, where it learned them, and a bond to its parent so it stays close and sings with it
      if (c.motif) k.motif = c.motif.slice(); if (c.words) k.words = c.words.map(w => Object.assign({}, w, { innate: false, from: c.id })); k.learnedFrom = c.learnedFrom ? c.learnedFrom.slice ? c.learnedFrom.slice() : c.learnedFrom : null; if (c.epiPhase != null) k.epiPhase = c.epiPhase; k.bonds = k.bonds || {}; k.bonds[c.id] = 3; c.bonds = c.bonds || {}; c.bonds[k.id] = 3; k.budOf = c.id; Sf.stats.buds = (Sf.stats.buds || 0) + 1; Sf.fx({ k: 'bud', x: c.x, y: c.y, col: c.col, dur: 1 }); Sf.play(Sf.S.bubble(4, 500), now + .01, c.x, c.y); st(Sf, c, id); } break;
    case 'void': if ((Sf.env.atmo || 0) < .25 && c.growth > .9 && c.energy > .7 && (c.voidT == null || now - c.voidT > 120) && Sf.sys && !c.visitor && !c.jam && !c.partner && !c.guide && !c.scored && !c.cluster && !(Sf.inView && Sf.inView(c.x, c.y, 300))) { c.voidT = now; Sf.voidOut = Sf.voidOut || []; Sf.voidOut.push(C().serial(c)); if (RS.Voyage) RS.Voyage.voidLeave(Sf, c);   /* v0.6: walks the void off-screen and comes home (voyage.js) */ Sf.fx({ k: 'launch', x: c.x, y: c.y, col: c.col, dur: 1.5 }); Sf.play({ modes: [{ f: C().hz(Sf, c, 0), a: 1, d: 2 }], glide: .25, gain: .08, att: .05, force: true }, now + .01, c.x, c.y); c.leaving = true; st(Sf, c, id); } break;
    case 'gravity': if ((c.rnd ? c.rnd() : Math.random()) < dt * .5) { Sf.fx({ k: 'warp', x: c.x, y: c.y, r: 150, dur: 1 }); Sf.play({ modes: [{ f: 55, a: 1, d: 1.5 }, { f: 82.5, a: .5, d: 1.2 }], gain: .05, att: .3 }, now + .01, c.x, c.y); } st(Sf, c, id, dt); break;
    case 'timestretch': for (const o of nearC(Sf, c, 170)) { o.localTempo = c.g[RS.GI.spark] > .985 ? .5 : 1.5; o.localTempoT = now + .3; st(Sf, c, id, dt); } if ((c.rnd ? c.rnd() : Math.random()) < dt * .4) Sf.fx({ k: 'clockwarp', x: c.x, y: c.y, r: 170, dur: 1 }); break;
    default: break; } };
const C = () => RS.Creature;
// ---------------- continuous fields, applied every physics substep (forces are cleared each substep) ----------------
A.forces = (Sf, c) => { const ab = c.P.abil; if (!ab || !ab.length) return; const W = Sf.W, now = Sf.now();
  for (const { id, s } of ab) {
    if (id === 'levitate' && now - (c.lastSing || -9) < 1.2) { c.levTargets = []; for (const b of W.bodies.values()) { if (!b.meta || b.idx.length > 14 || b.pins.length || b.meta.c || b.meta.role === 'water') continue; const [bx, by] = W.center(b); if (Math.hypot(bx - c.x, by - c.y) > 110) continue; c.levTargets.push(b);
        for (const i of b.idx) { const gg = W.gAt(W.x[i], W.y[i]); const hov = 1 + .04 * Math.sin(now * 3 + b.id);   /* hover: cancels gravity with a gentle bob, never out-lifts it */ W.fx[i] -= gg[0] * hov / W.im[i]; W.fy[i] -= gg[1] * hov / W.im[i]; } b.levT = now; } if (c.levTargets.length) st(Sf, c, 'levitate', W.dt); }
    if (id === 'gravity') for (let i = 0; i < W.n; i++) { if (!(W.fl[i] & 1) || (W.fl[i] & 4) || (W.fl[i] & 2)) continue; const b = W.bodies.get(W.bod[i]); if (!b || (b.meta && b.meta.c === c)) continue; const dx = c.x - W.x[i], dy = c.y - W.y[i], d2 = dx * dx + dy * dy; if (d2 > 150 * 150 || d2 < 400) continue; const d = Math.sqrt(d2), isC = b.meta && b.meta.c, gmax = (W.grav.g || 900) * (isC ? .25 : .7), f = Math.min(gmax, 8e5 * s / d2), sw = isC ? 0 : .35;   /* bounded pull; creatures are not swirled */
        W.fx[i] += (dx / d - dy / d * sw) * f / W.im[i]; W.fy[i] += (dy / d + dx / d * sw) * f / W.im[i]; c.gravN = (c.gravN || 0) + 1; } } };
// ---------------- when singing ----------------
A.onSing = (Sf, c, v, f0, when) => { const ab = c.P.abil; if (!ab || !ab.length) return v; const M = Sf.M, W = Sf.W;
  for (const { id, s } of ab) switch (id) {
    case 'overtone': { // two clearly separate pitches at once: the fundamental + a strong 3rd harmonic whistle (a 12th above)
      v.modes.push({ f: f0 * 3, a: .9 * s, d: v.modes[0] ? v.modes[0].d : .6 }); v.modes.push({ f: f0 * 4, a: .25 * s, d: .4 }); v.two = true; st(Sf, c, id); break; }
    case 'lightsing': { Sf.extraLights = Sf.extraLights || []; Sf.extraLights.push({ x: c.x, y: c.y, wl: M.hzWl(f0), I: .7 * s, until: (when || Sf.now()) + .6, n: 10, r: C().radius(c) + 4, by: c.id }); st(Sf, c, id); break; }
    case 'shatter': { // sing at the exact resonant pitch of a brittle (crystal/clear) body nearby -> it cracks into shards
      for (const b of W.bodies.values()) { if (!b.meta || !(b.meta.role === 'crystal' || (b.mat && b.mat.clear > .5 && b.meta.role === 'instrument'))) continue; const [bx, by] = W.center(b); if (Math.hypot(bx - c.x, by - c.y) > 160) continue; const bf = Sf.S.physics(b).f0; if (!(bf > 0)) continue;
        v.modes[0].f = bf * Math.pow(2, Math.round(Math.log2(f0 / bf))); b.resHit = (b.resHit || 0) + .35 * s; Sf.fx({ k: 'resonate', b, dur: .5 });
        if (b.resHit > 1) { Sf.shatter(b, c); st(Sf, c, id); } break; } break; }
    case 'dream': if (c.sleep > .5) { v.modes = v.modes.slice(0, 3).map(m => ({ f: m.f / 2, a: m.a, d: m.d * 4 })); v.att = .6; v.len = 3; v.send = .9; c.dreamN = (c.dreamN || 0) + 1; st(Sf, c, id); } break;
    case 'heal': break;
    default: break; }
  if (c.voiceBoost > 1) { v.gain *= c.voiceBoost; v.modes.push({ f: f0 * 1.5, a: .3, d: .5 }); }
  return v; };
// ---------------- on the 16th grid ----------------
A.onGrid = (Sf, c, g, tg) => { const ab = c.P.abil; if (!ab || !ab.length) return; const M = Sf.M, W = Sf.W;
  for (const { id, s } of ab) switch (id) {
    case 'metronome': if (M.strong(g)) { Sf.play({ modes: [{ f: 1800, a: 1, d: .02 }], gain: .03 * s, click: .7, att: .001 }, tg, c.x, c.y); C().impulse(Sf, c, 0, -40); } break;
    case 'conduct': if (M.strong(g)) { const bar = M.bar(tg), beat = ((g / 4) | 0) % 4; c.pulseGain = RS.Theory ? RS.Theory.dynamics(bar, beat, c.P.mus.dynRange) : 1; for (const b of c.segs) b.inflate = c.growth * c.growth * (1 + .12 * c.pulseGain); Sf.fx({ k: 'conduct', c, dur: .25, g: c.pulseGain }); } break;
    case 'tide': if (M.strong(g)) { let n = 0; const ph = ((g / 4) | 0) % 2 ? 1 : -1; for (let i = 0; i < W.n; i++) { if (!(W.fl[i] & 2)) continue; const dx = W.x[i] - c.x; if (Math.abs(dx) > 260) continue; W.py[i] += 2.2 * s * (W.y[i] > c.y - 40 ? 1 : .5) * (dx > 0 ? ph : -ph) * .6 + 1.6 * s; W.px[i] -= ph * 1.2 * s; n++; } if (n) { Sf.play(Sf.S.bubble(8, 300), tg, c.x, c.y); c.tides = (c.tides || 0) + 1; st(Sf, c, id); } } break;
    case 'compose': if (g % 64 === 0 && RS.Theory) { const mo = { p: c.motif.slice(0, 4), d: [2, 2, 2, 2] }; const nm = RS.Theory.develop(mo, RS.hash(c.id, g), c.P.mus.improv); const newP = nm.p.slice(0, 4).map((x, k) => x == null ? c.motif[k] : RS.clamp(x, -7, 9)); c.motif = newP; c.composed = (c.composed || 0) + 1; c.signature = newP.join(','); Sf.fx({ k: 'compose', c, dur: 1 });
        for (const o of Sf.creatures) if (o !== c && !o.dead && Math.hypot(o.x - c.x, o.y - c.y) < 260 && o.P.life.conformity > .35 && !(o.P.sense.deaf && o.P.sense.blind)) { o.motif = newP.slice(); o.cultureFrom = c.id; Sf.stats.motifSpread = (Sf.stats.motifSpread || 0) + 1; } st(Sf, c, id); } break;
    case 'ancestral': if (g % 128 === 32 && Sf.ancestors && Sf.ancestors.length) { const anc = Sf.ancestors[RS.rng(RS.hash(c.id, g))() * Sf.ancestors.length | 0]; c.motif = anc.motif.slice(0, 4); c.revived = anc.id; if (c.cluster && anc.style) c.cluster.style = anc.style; Sf.fx({ k: 'ancestral', c, dur: 1.5 }); st(Sf, c, id); } break;
    default: break; } };
// local tempo (time stretching) as seen by others' clocks
A.tempoAt = (Sf, c) => c.localTempoT && Sf.now() < c.localTempoT ? c.localTempo : 1;
})(typeof window !== 'undefined' ? window : globalThis);
