// v0.5a lean headless check: twins echo in conversation, the growth engine (sound-grown phi / Fibonacci plants), jam seeds
// carried home + replayed, #9 gardener, #11 plant chorus, history traces, persistence + offline growth, ohms stay near home.
const T = require('./node_env.js'), RS = global.RS, Gr = RS.Grow, Y = RS.Sym;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const pl = (Sf, seed, x) => { const c = T.add(Sf, T.plain(seed), x); Object.assign(c.P.beh, { lightLove: 0, curiosity: 0, social: 0, wander: 0 }); return c; };
const empty = () => { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.instruments = () => []; return Sf; };
const feed = (Sf, x, y, f, every = .35) => { let next = 0; return () => { const tn = Sf.now(); if (tn < next) return; next = tn + every; (Sf.onRing || (Sf.onRing = [])).push({ t: tn, x, y, id: 'test', f, v: .6 }); if (Sf.onRing.length > 256) Sf.onRing.splice(0, 64); }; };
const cents = (f, t) => ((1200 * Math.log2(f / t)) % 1200 + 1200) % 1200;
// 1 twins echo in conversation turns
if (!ONLY || ONLY === 'echo') { const Sf = empty(), a = pl(Sf, 31, 0), b = pl(Sf, 32, 150); T.run(Sf, .3); [a, b].forEach(c => { c.mind.perc = 0; }); a.mind.lead = .9; b.mind.lead = .1; T.run(Sf, 16, () => { a.partner = b; b.partner = a; });
  b.mind.heard.push({ from: a.id, t: Sf.now(), f: 0 }); const yes = Y.echoAns(Sf, b.mind), caller = Y.echoAns(Sf, a.mind); b.partner = null; const gone = Y.echoAns(Sf, b.mind);
  ok('#8 in a back-and-forth the echo twin answers with its caller\'s phrase (not the caller, not without its twin as partner)', a.sym.twin === b.id && yes && !caller && !gone, { yes, caller, gone }); }
// 2 growth from nearby sound; silence = no growth
const H0 = Gr.hear; const withCoh = coh => { Gr.hear = (...a) => Object.assign(H0(...a), a[0]._noCoh ? {} : { coh }); };
if (!ONLY || ONLY === 'grow') { const Sf = empty(), P = Sf.P, th = P.theta(0, Sf.ground(0)), [x, y] = P.surf(th); Gr.STEP = 9;
  const p = Gr.plant(Sf, th, { hz: 220 }), q = Gr.plant(Sf, th + 3000 / P.R, { hz: 220 }), n0 = q.n.length; const fd = feed(Sf, x, y - 30, 330); T.run(Sf, 120, fd);
  ok('a plant grows from nearby sound; one out of earshot (silence) does not grow at all', p.n.length > 20 && q.n.length === n0 && q.s === 1, { near: p.n.length, far: q.n.length });
  // consonance vs dissonance
  const grow = (f, coh, sec = 240) => { const S = empty(), P2 = S.P, t2 = P2.theta(0, S.ground(0)), [x2, y2] = P2.surf(t2); withCoh(coh); const pp = Gr.plant(S, t2, { hz: 220 }); T.run(S, sec, feed(S, x2, y2 - 30, f)); Gr.hear = H0; return pp; };
  const con = grow(330, .8), dis = grow(233.08, .8);   // a fifth vs a minor second over the 220 Hz key
  const jit = pp => { const N = pp.n, r = []; for (let i = 1; i < N.length; i++) { const nd = N[i], pa = N[nd[0]]; if (!nd[6] && pa && nd[4] === 0 && pa[4] === 0 && i > 2) r.push(Math.abs(nd[3] - pa[3])); } return r.reduce((a, b) => a + b, 0) / Math.max(1, r.length); };
  ok('consonance: regular, no curl, flowers; dissonance: curl + twist, no flowers (same notes per second)', con.cu < .1 && dis.cu > .6 && con.fl.length > 0 && dis.fl.length === 0 && jit(dis) > jit(con) * 1.5, { cu: [+con.cu.toFixed(2), +dis.cu.toFixed(2)], fl: [con.fl.length, dis.fl.length], turn: [+jit(con).toFixed(3), +jit(dis).toFixed(3)] });
  // phi + Fibonacci laws
  const N = con.n, segL = d => { const L = []; for (let i = 1; i < N.length; i++) { const nd = N[i], pa = N[nd[0]]; if (!nd[6] && nd[4] === d && pa[4] === d) L.push(Math.hypot(nd[1] - pa[1], nd[2] - pa[2])); } return L.reduce((a, b) => a + b, 0) / Math.max(1, L.length); };
  const ratio = segL(0) / segL(1), fork = [], fl = con.fl.map(f => f.k); for (let i = 1; i < N.length; i++) { const nd = N[i], pa = N[nd[0]]; if (!nd[6] && nd[4] === pa[4] + 1 && nd[1] === pa[1] && nd[2] === pa[2]) fork.push(pa[5]); }
  ok('phi: stem / side-shoot segment ratio near phi; forks only at Fibonacci tip ages; flower seed counts are Fibonacci; <= 8 tips, <= 96 nodes', Math.abs(ratio - Gr.PHI) < .45 && fork.length > 0 && fork.every(a => Gr.FIB.includes(a)) && fl.every(k => Gr.FIB.includes(k)) && con.tp.length <= 8 && N.length <= Gr.MAXN, { ratio: +ratio.toFixed(2), forkAges: [...new Set(fork)], flowers: fl, nodes: N.length });
  const p2 = grow(330, .8), same = JSON.stringify(p2.n) === JSON.stringify(con.n); ok('organic, not stamped: the same music regrows the same plant, a different key a different one', same && JSON.stringify(dis.n) !== JSON.stringify(con.n));
  Gr.STEP = 90; }
// 3 slow: real speed
if (!ONLY || ONLY === 'slow') { const Sf = empty(), P = Sf.P, th = P.theta(0, Sf.ground(0)), [x, y] = P.surf(th); withCoh(.8); const p = Gr.plant(Sf, th, { hz: 220 }); T.run(Sf, 300, feed(Sf, x, y - 30, 330, .3)); Gr.hear = H0;
  ok('growth is slow: five minutes of steady consonant music grows well under half a plant', p.n.length < Gr.MAXN * .5 && p.n.length > 5, { nodes: p.n.length }); }
// 4 a settled jam drops a seed; a member carries it home and plants it; the jam plant replays the jam
if (!ONLY || ONLY === 'seed') { const Sf = empty(), cs = [pl(Sf, 31, 0), pl(Sf, 32, 150), pl(Sf, 33, 300)], P = Sf.P, x0 = cs.map(c => c.x), g0 = cs.map(c => Array.from(c.g).join());
  let seen = null; const plays = []; const sp = Sf.play; Sf.play = (spec, when, x, y) => { if (spec && spec.plant) plays.push({ spec, when }); return sp(spec, when, x, y); };
  T.run(Sf, 330, () => { const k = Sf.grow && Sf.grow.carry[0]; if (k && !seen) seen = { id: k.id, hx: k.hx }; });
  const jp = Sf.grow.plants.find(p => p.k === 'jam'), car = seen && Sf.creatures.find(c => c.id === seen.id);
  ok('a settled jam drops a jam seed that one member carries (drawn above its head) and plants a short walk from its home', Sf.stats.jamSeeds > 0 && seen && jp && jp.by === seen.id && Math.abs(P.surf(jp.th)[0] - seen.hx) < 200, { seeds: Sf.stats.jamSeeds, plant: jp && Math.round(P.surf(jp.th)[0] - (seen ? seen.hx : 0)) });
  ok('ohms stay near home through the seed trip (all within 350 px of where they started); genomes unchanged', cs.every((c, i) => Math.abs(c.x - x0[i]) < 350) && cs.every((c, i) => Array.from(c.g).join() === g0[i]), cs.map((c, i) => Math.round(c.x - x0[i])));
  // replay at maturity: drive it, then listen
  if (jp) { for (let k = 0; k < 30; k++) Gr.pulse(Sf, jp, { act: 1, vel: .6, cons: 1, coh: .8, bright: .5 }); plays.length = 0; for (const c of cs) c.mind.quiet = true; const t0 = Sf.now(); T.run(Sf, 30);
    const sd = jp.sd, C = sd.key.cents, inKey = plays.every(o => { const c = cents(o.spec.f0, sd.key.tonicHz); return C.some(k => Math.abs(c - k) < 2 || Math.abs(c - k - 1200) < 2 || Math.abs(c - k + 1200) < 2); });
    const perBeat = {}; for (const o of plays) { const b = Math.round(o.when * sd.bpm / 60); perBeat[b] = (perBeat[b] || 0) + 1; } const mx = Math.max(0, ...Object.values(perBeat)), insts = new Set(plays.map(o => o.spec.inst));
    ok('the jam plant replays the jam quietly: in the jam\'s key, <= 2 notes a beat, quiet gain, its members\' voices', plays.length > 10 && inKey && mx <= 2 && plays.every(o => o.spec.gain <= .035) && insts.size >= Math.min(2, sd.members.length), { notes: plays.length, inKey, maxPerBeat: mx, voices: insts.size, voicesAtMat: Gr.voices(Gr.maturity(jp)) });
    // yields to a crowd
    const yb = (Sf.stats.grow.plantYield || 0); T.run(Sf, 6, () => { for (let k = 0; k < 2; k++) (Sf.onRing || (Sf.onRing = [])).push({ t: Sf.now() + .01 * k, x: P.surf(jp.th)[0], y: 0, id: 'crowd', f: 0 }); });
    ok("a busy crowd nearby: the plant listens instead of adding notes", (Sf.stats.grow.plantYield || 0) > yb, { y: Sf.stats.grow.plantYield, yb, notes: Sf.stats.grow.plantNote, lb: jp._lb, now: Sf.now(), ring: (Sf.onRing || []).length }); }
  Sf.play = sp; }
// 5 #9 gardener, #11 chorus
if (!ONLY || ONLY === 'pairs') { const Sf = empty(), P = Sf.P, th = P.theta(0, Sf.ground(0)), [x, y] = P.surf(th); const p = Gr.plant(Sf, th, { hz: 220 }); Sf.onRing = Sf.onRing || []; for (let k = 0; k < 2; k++) Sf.onRing.push({ t: Sf.now(), x, y: y - 20, id: 'g1', f: 330, v: .5 });
  const a = Gr.hear(Sf, p, Sf.now(), 2, new Set()), b = Gr.hear(Sf, p, Sf.now(), 2, new Set(['g1']));
  const c = pl(Sf, 41, 60); T.run(Sf, .3); c.energy = .5; p._gard = new Set([c.id]); Gr.flowered(Sf, p);
  ok('#9 gardener: music by an ohm living by the plant counts double; it perks up when the plant flowers', b.act > a.act * 1.9 && c.energy > .55, { plain: +a.act.toFixed(2), gardener: +b.act.toFixed(2), energy: +c.energy.toFixed(2) });
  const S2 = empty(), P2 = S2.P, t2 = P2.theta(0, S2.ground(0)); const lone = pl(S2, 51, 120); T.run(S2, .3); const sd = { t: 0, key: { tonicHz: 220, cents: [0, 200, 400, 500, 700, 900, 1100] }, bpm: 132, coh: .8, members: [{ id: 'x', role: 'melody', code: RS.Genome.toCode(lone.g), motif: [0, 2, 4, null, 4, 2, 0, null] }] };
  const jp = Gr.plant(S2, t2, { kind: 'jam', hz: 220, seed: sd }); for (let k = 0; k < 25; k++) Gr.pulse(S2, jp, { act: 1, vel: .6, cons: 1, coh: .8, bright: .5 }); const b0 = lone.mind.bpmT; T.run(S2, 40, () => { lone.partner = null; });
  ok('#11 plant chorus: a lone ohm by a replaying jam plant drifts into its tempo (learned)', Math.abs(lone.mind.bpmT - 132) < Math.abs(b0 - 132) * .5, { from: +b0.toFixed(1), to: +lone.mind.bpmT.toFixed(1) }); }
// 6 history traces
if (!ONLY || ONLY === 'trace') { const Sf = empty(); [pl(Sf, 31, 0), pl(Sf, 32, 150), pl(Sf, 33, 300)]; T.run(Sf, 90); const g = Sf.grow, tr = g.traces.reduce((a, t) => t.w > a.w ? t : a, g.traces[0]);   /* v0.8b6: the strongest trace (jam learning can leave a faint first trace where the jam started) */
  ok('a place where a jam plays gets a history trace that builds with time', g.traces.length >= 1 && tr.w > .8, g.traces.map(t => +t.w.toFixed(2)));
  const A0 = Gr.traceAlpha(tr, Date.now()), A30 = Gr.traceAlpha(tr, Date.now() + 30 * 864e5); const w0 = g.traces.reduce((a, t) => a + t.w, 0); for (let k = 0; k < 60; k++) g.traces.push({ th: k * .01, w: 1, h: 0, l: Date.now(), k: 'c' }); Sf._grH = null; Gr.traceTick(Sf, Sf.now());
  ok('traces fade slowly to a floor (never removed); many places merge (cap 40, time kept)', A30 < A0 && A30 >= A0 * .3 - 1e-9 && g.traces.length <= 40 && Math.abs(g.traces.reduce((a, t) => a + t.w, 0) - (w0 + 60)) < 1.5, { a: [+A0.toFixed(3), +A30.toFixed(3)], n: g.traces.length }); }
// 7 persistence + time passes offline
if (!ONLY || ONLY === 'save') { const Sf = empty(), P = Sf.P, th = P.theta(0, Sf.ground(0)), [x, y] = P.surf(th); Gr.STEP = 9; withCoh(.8); const p = Gr.plant(Sf, th, { hz: 220 }), q = Gr.plant(Sf, th + 3000 / P.R, { hz: 220 }); T.run(Sf, 60, feed(Sf, x, y - 30, 330)); Gr.hear = H0; Gr.STEP = 90; pl(Sf, 61, 2000);   // someone lives here, so a load is a real world
  Sf.grow.carry.push({ id: 'nobody', sd: { key: { tonicHz: 220, cents: [0] }, bpm: 100, members: [] }, hx: x, hy: y, d0: Date.now() });
  for (const ci of Sf.active) Sf.dirty.add(ci); const data = JSON.parse(JSON.stringify(Sf.pack())); const n1 = p.n.length;
  const S2 = T.make({}).Sf; S2.unpack(data, data.t + 1000); const p2 = S2.grow.plants.find(o => o.id === p.id);
  ok('plants, traces and carried seeds save and load (pack key grow, not in mods)', p2 && JSON.stringify(p2.n) === JSON.stringify(p.n) && S2.grow.traces.length === Sf.grow.traces.length && S2.grow.carry.length === 1 && !('grow' in data.mods), { kb: +(JSON.stringify(data.grow).length / 1024).toFixed(1) });
  const S3 = T.make({}).Sf; S3.unpack(data, data.t + 86400e3); const p3 = S3.grow.plants.find(o => o.id === p.id), q3 = S3.grow.plants.find(o => o.id === q.id);
  ok('time passes offline: a day away, the plant that heard music kept growing (capped); the silent one did not', p3.n.length > n1 && p3.s - p.s <= Gr.OFF_STEPS && q3.n.length === q.n.length, { before: n1, after: p3.n.length, pulses: p3.s - p.s });
  T.run(S3, .5); ok('a seed whose carrier is not here lands at its home on load', S3.grow.carry.length === 0 && S3.grow.plants.some(o => o.k === 'jam')); }
console.log(`v0.5a: ${res.filter(Boolean).length}/${res.length} passed`); process.exitCode = res.every(Boolean) ? 0 : 1;
