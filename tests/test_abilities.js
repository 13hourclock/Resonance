// Abilities: per ability -> (1) triggers from its gene combo, (2) measurable effect vs a control without it, (3) inheritance, (4) rarity over 10k genomes
const T = require('./node_env.js'); const A = RS.Abilities, Gn = RS.Genome, C = RS.Creature;
const res = []; const ok = (name, pass, info) => { res.push({ name, pass: !!pass, info }); };
const near = (Sf, c, dx = 50, g) => T.add(Sf, g || T.plain(77), c.x + dx);
// run the same scenario with/without the ability and return a metric
const pair = (id, setup, metric, sec = 12) => { const out = []; for (const withA of [true, false]) { const { Sf } = T.scene(); const g = withA ? T.withAb(id) : T.plain(1); const ctx = { Sf }; ctx.c = T.add(Sf, g, 0, setup.opt || {}); if (setup.fn) setup.fn(ctx); T.run(Sf, sec, i => setup.each && setup.each(ctx, i)); out.push(metric(ctx)); } return out; };
const S = {
  echo: [{ fn: x => { x.Sf.day = 0; } }, x => (x.c.ab && x.c.ab.echo) || 0, (a, b) => a >= 5 && b === 0],
  pitch: [{ fn: x => { x.o = near(x.Sf, x.c); x.o.keyC = 90; } }, x => Math.abs(((x.o.keyC - x.c.keyC) % 1200 + 1800) % 1200 - 600), (a, b) => a < b - 15],
  metronome: [{ fn: x => { x.o = near(x.Sf, x.c, 60); x.o.tempo = 1.08; } }, x => Math.abs(x.o.tempo - x.c.tempo), (a, b) => a < b * .6, 6],
  mimic: [{ fn: x => { x.inst = [...x.Sf.W.bodies.values()].find(b => b.meta && b.meta.role === 'instrument'); }, each: (x, i) => { if (i % 20 === 0 && i < 300) { const [bx, by] = x.Sf.W.center(x.inst); x.Sf.strikeBody(x.inst, bx, by, 600); } } }, x => x.c.mimicked ? x.c.mimicked.length : 0, (a, b) => a >= 3 && b === 0],
  overtone: [{}, x => T.notes.filter(n => n.n.src === x.c && n.n.two).length, (a, b) => a > 0 && b === 0],
  lightsing: [{ fn: x => { x.Sf.extraLights = []; }, each: (x, i) => { if (i % 30 === 0) C.sing(x.Sf, x.c, 0, x.Sf.now() + .01, { manual: true }); } }, x => x.Sf.stats.ab_lightsing || 0, (a, b) => a > 3 && b === 0],
  shatter: [{ fn: x => { x.cr = x.Sf.makeBlob(x.Sf.circle(x.c.x + 40, x.Sf.ground(x.c.x + 40) - 14, 10, 10), { role: 'crystal', mat: { clear: 1, stiff: .99 } }); }, each: (x, i) => { if (i % 20 === 0) C.sing(x.Sf, x.c, 0, x.Sf.now() + .01, { manual: true }); } }, x => x.Sf.W.bodies.has(x.cr.id) ? 0 : 1, (a, b) => a === 1 && b === 0],
  levitate: [{ fn: x => { x.p = x.Sf.makeBlob(x.Sf.circle(x.c.x + 30, x.Sf.ground(x.c.x + 30) - 10, 8, 10), { role: 'instrument', mat: { stiff: .99, mass: .5 } }); x.y0 = x.Sf.W.center(x.p)[1]; }, each: (x, i) => { if (i % 30 === 0) C.sing(x.Sf, x.c, 0, x.Sf.now()); } }, x => x.y0 - Math.min(...x.hist || [x.Sf.W.center(x.p)[1]]), (a, b) => a > b + 10],
  conduct: [{ fn: x => { x.f = [near(x.Sf, x.c, 60), near(x.Sf, x.c, -60, T.plain(91))]; x.f[0].tempo = 1.1; x.f[1].tempo = .93; } }, x => x.f.reduce((s, o) => s + Math.abs(o.tempo / x.c.tempo - (o.lockRatio || 1)), 0) + (x.c.conducting ? 0 : 1), (a, b) => a < b],
  compose: [{ fn: x => { x.o = near(x.Sf, x.c, 70); x.o.P.life.conformity = .9; } }, x => (x.c.composed || 0) + (x.o.cultureFrom === x.c.id ? 10 : 0), (a, b) => a >= 11 && b === 0, 24],
  weave: [{}, x => [...x.Sf.W.bodies.values()].filter(b => b.meta && b.meta.woven).length, (a, b) => a >= 1 && b === 0, 30],
  glass: [{ fn: x => { const inst = [...x.Sf.W.bodies.values()].find(b => b.meta && b.meta.role === 'instrument'); x.Sf.eat(x.c, inst); } }, x => [...x.Sf.W.bodies.values()].filter(b => b.meta && b.meta.glass).length, (a, b) => a >= 1 && b === 0, 1],
  tide: [{ fn: x => { x.w = x.Sf.W.makeWater(Array.from({ length: 30 }, (_, k) => [x.c.x - 60 + k * 4, x.Sf.ground(x.c.x) - 10])); } }, x => x.c.tides || 0, (a, b) => a > 4 && b === 0],
  storm: [{ fn: x => { x.Sf.env.atmo = .6; x.Sf.weather.rain = 0; x.Sf.weather.storm = false; }, each: (x, i) => { if (i % 20 === 0) C.sing(x.Sf, x.c, 0, x.Sf.now()); } }, x => x.Sf.stormBy === x.c.id ? 1 : 0, (a, b) => a === 1 && b === 0],
  seed: [{ fn: x => { x.Sf.sys = Object.assign({}, x.Sf.sys, { comet: true }); x.c.energy = 1; } , each: x => { x.c.energy = 1; } }, x => (x.Sf.seedOut || []).length, (a, b) => a >= 1 && b === 0],
  phase: [{ fn: x => { x.c.state = 'flee'; x.c.fleeFrom = [x.c.x - 50, x.c.y]; x.c.fleeT = 3; } }, x => (x.c.ab && x.c.ab.phase) || 0, (a, b) => a >= 1 && b === 0, 2],
  symbiont: [{ fn: x => { x.h = T.add(x.Sf, (() => { const g = T.plain(55); g[0] = .99; return g; })(), x.c.x + 60); x.h.energy = .3; x.c.P.size = 14; } }, x => x.h.energy + (x.c.host === x.h ? 1 : 0), (a, b) => a > b + 1],
  heal: [{ fn: x => { x.o = near(x.Sf, x.c, 60); x.o.fade = .6; x.o.energy = .2; } }, x => x.o.fade, (a, b) => a < b - .1],
  dream: [{ each: x => { x.c.sleep = 1; } , fn: x => { x.Sf.day = 0; } }, x => x.c.dreamN || 0, (a, b) => a > 0 && b === 0, 20],
  chameleon: [{ fn: x => { x.Sf.lightAt = () => ({ I: 1, wl: 450 }); x.w0 = x.c.P.wl; } }, x => Math.abs(x.c.P.wl - 450) / Math.max(1, Math.abs(x.w0 - 450)), (a, b) => a < .6 && b > .95],
  bud: [{ each: x => { x.c.energy = 1; x.c.budT = x.c.budT || -999; } }, x => x.Sf.creatures.filter(o => o.parents && o.parents.length === 1 && o.parents[0] === x.c.id).length, (a, b) => a >= 1 && b === 0, 4],
  ancestral: [{ fn: x => { x.Sf.ancestors = [{ id: 'old', motif: [5, 4, 3, 1], style: 'harp' }]; } }, x => x.c.revived === 'old' && x.c.motif.slice(0, 4).join() === '5,4,3,1' ? 1 : 0, (a, b) => a === 1 && b === 0, 30],
  void: [{ fn: x => { x.Sf.env.atmo = 0; const v = x.Sf.view; if (v) x.Sf.view = Object.assign({}, v, { y0: v.y0 - 4000, y1: v.y1 - 4000, cy: v.cy - 4000 }); /* v0.6: ohms only leave when not watched */ }, each: x => { x.c.energy = 1; } }, x => (x.Sf.voidOut || []).length, (a, b) => a >= 1 && b === 0, 2],
  gravity: [{ fn: x => { x.p = x.Sf.makeBlob(x.Sf.circle(x.c.x + 70, x.c.y - 120, 8, 10), { role: 'instrument', mat: { stiff: .99, mass: .5 } }); for (const i of x.p.idx) { x.Sf.W.px[i] = x.Sf.W.x[i] + 2; } x.c.want = [0, 0]; }, each: (x, i) => { x.c.x = x.c.x; if (x.Sf.W.bodies.has(x.p.id)) (x.tr = x.tr || []).push(x.Sf.W.center(x.p)); } }, x => x.tr, (a, b) => { const n = Math.min(a.length, b.length, 60); let d = 0; for (let k = 0; k < n; k++) d += Math.hypot(a[k][0] - b[k][0], a[k][1] - b[k][1]); return d / n > 6; }, 3],
  timestretch: [{ fn: x => { x.o = near(x.Sf, x.c, 60); } }, x => (x.o.localTempoT ? 1 : 0), (a, b) => a === 1 && b === 0, 3],
};
for (const id of A.IDS) { const sc = S[id]; if (!sc) { ok(id + ' effect', false, 'no scenario'); continue; }
  // 1) trigger: the gene combo produces it; the plain genome does not
  const g = T.withAb(id), P = Gn.express(g); ok(id + ' trigger', P.abil.some(a => a.id === id) && !Gn.express(T.plain(1)).abil.length);
  // 2) effect
  try { if (id === 'levitate') { const [setup, metric] = sc; const old = setup.each; setup.each = (x, i) => { old && old(x, i); (x.hist = x.hist || []).push(x.Sf.W.center(x.p)[1]); }; }
    const [a, b] = pair(id, sc[0], sc[1], sc[3] || 12); ok(id + ' effect', sc[2](a, b), Array.isArray(a) ? 'trajectory' : { with: +(+a).toFixed(3), without: +(+b).toFixed(3) }); } catch (e) { ok(id + ' effect', false, String(e.stack).slice(0, 300)); }
  // 3) inheritance: two carriers -> every child carries; carrier x plain -> far above baseline
  let both = 0, one = 0; for (let k = 0; k < 200; k++) { const a = T.withAb(id, 10 + k), b = T.withAb(id, 500 + k), p = T.plain(900 + k); if (A.of(Gn.crossover(a, b, k)).some(x => x.id === id)) both++; if (A.of(Gn.crossover(a, p, k)).some(x => x.id === id)) one++; }
  ok(id + ' inherit', both >= 190 && one >= 10, { both, one }); }
// 4) rarity over 10k random genomes + breeding sessions
let any = 0; const cnt = {}; for (let i = 0; i < 10000; i++) { const a = A.of(Gn.random(i * 7 + 1)); if (a.length) any++; for (const x of a) cnt[x.id] = (cnt[x.id] || 0) + 1; }
for (const id of A.IDS) ok(id + ' rarity', cnt[id] >= 20 && cnt[id] <= 120, cnt[id] / 100 + '%');
ok('any-ability prevalence 8-20%', any >= 800 && any <= 2000, any / 100 + '%');
let tot = 0; for (let s = 0; s < 300; s++) { let pool = [], q = 0; while (pool.length < 4) { const g = Gn.random(s * 1000 + (q++) * 13 + 5); if (!A.of(g).length) pool.push(g); } for (let k = 0; k < 20; k++) { const c = Gn.crossover(pool[k % pool.length], pool[(k * 3 + 1) % pool.length], s * 99 + k); if (A.of(c).length) tot++; pool.push(c); } }
ok('~20-offspring session shows ~1-2', tot / 300 >= .6 && tot / 300 <= 2.5, (tot / 300).toFixed(2));
// natural life carries rare ones
let nat = 0; for (let s = 0; s < 400; s++) if (A.of(Gn.fromWorld(s, { starWl: 550, wet: .5 })).length) nat++; ok('natural life carries abilities (~50%)', nat > 150, nat / 4 + '%');
const fails = res.filter(r => !r.pass); for (const r of res) if (!r.pass || process.argv.includes('-v')) console.log(r.pass ? 'ok  ' : 'FAIL', r.name, JSON.stringify(r.info || ''));
console.log(`abilities: ${res.length - fails.length}/${res.length}`); module.exports = { res };
if (require.main === module) process.exitCode = fails.length ? 1 : 0;
