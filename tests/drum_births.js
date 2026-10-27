// Percussion ohms from every birth path (shared by drum_measure / drum_check). Returns live creatures in their scenes.
const T = require('./node_env.js'), RS = global.RS, DM = require('./drum_metrics.js');
const fresh = (u = 1) => { const { Sf } = T.scene({ clear: true, useed: u }); Sf.noSeedItems = Sf.noPatches = true; Sf.items = []; Sf.moldOn = false; T.run(Sf, .05); return Sf; };
// deterministic births: spirals mix Date.now() + Math.random() into their genome seed, so pin both (SEED env picks another population)
const reseed = seed => { let s = seed, t = 1.7e12; Math.random = () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x80000000; Date.now = () => (t += 997); }; reseed(+(process.env.SEED || 12345));
const spiral = (x, y, r, turns, n = 60, wob = 0, rr = Math.random) => { const p = []; for (let k = 0; k <= n; k++) { const t = k / n, a = t * turns * Math.PI * 2, j = 1 + wob * (rr() - .5) * .5; p.push([x + Math.cos(a) * r * (.15 + .85 * t) * j, y + Math.sin(a) * r * (.15 + .85 * t) * j]); } return p; };
const isDrum = c => c && c.g[RS.IG.perc] > .7;
function births(opt = {}) { const out = [], nS = opt.spiral || 25, nN = opt.natural || 20, nF = opt.fresh || 10, nE = opt.egg || 5;
  // 1. small tight spirals, drawn at varied speeds / wobble (speed = weight when the phone reports no pressure)
  for (let s = 1, k = 0; k < nS && s < 400; s++) { const Sf = fresh(1 + s), rr = RS.rng(s * 131 + 7), cx = Sf.view.cx, gy = Sf.ground(cx), R = 22 + rr() * 22, msPer = 4 + rr() * 26, pts = spiral(cx, gy - 200, R, 2 + rr() * .8, 60, rr() < .3 ? 2 : 0, rr);
    const r = Sf.stroke(pts, pts.map((_, i) => i * msPer), { z: 1 }), c = r && r.c != null ? Sf.creatures.find(q => q.id === r.c) : null; if (!isDrum(c)) continue; out.push({ path: 'spiral', c, Sf }); k++; }
  // 2. natural / wild / bred life: RS.Genome.random genomes that came out strongly percussive (fillInst ~1 in 5)
  { const Sf = fresh(501); for (let s = 1, k = 0; k < nN && s < 4000; s++) { const g = RS.Genome.random(s * 7919 + 11); if (g[RS.IG.perc] <= .7) continue; const x = Sf.view.cx - 900 + (k % 10) * 190, c = Sf.addCreature(g, x, Sf.ground(x) - 40, { growth: 1, energy: .9, quiet: true, birth: 'wild' }); if (isDrum(c)) { out.push({ path: 'natural', c, Sf }); k++; } } }
  // 3. a fresh launch's opening scene: 'drum:<type>' voices dealt by setVoice
  { const Sf = fresh(601), D = RS.Genome.DRUMS.map(d => 'drum:' + d); for (let k = 0; k < nF; k++) { const r = RS.rng(RS.hash('fm', k)), g = RS.Genome.random(RS.hash('freshohm', 77, k)); RS.Genome.setVoice(g, D[Math.floor(r() * D.length)], r); const x = Sf.view.cx - 900 + k * 190, c = Sf.addCreature(g, x, Sf.ground(x) - 40, { growth: .9, quiet: true, birth: 'wild' }); if (isDrum(c)) out.push({ path: 'fresh', c, Sf }); } }
  // 4. egg taps (1..5 taps = the player's explicit pick)
  { const Sf = fresh(701); for (let k = 0; k < nE; k++) { const g = RS.Genome.random(RS.hash('egg', k)), r = RS.rng(k + 3); RS.Genome.setVoice(g, RS.Egg ? RS.Egg.TAPV[k % 5] : 'drum:kick', r); const x = Sf.view.cx - 500 + k * 200, c = Sf.addCreature(g, x, Sf.ground(x) - 40, { growth: 1, quiet: true }); if (isDrum(c)) out.push({ path: 'egg', c, Sf }); } }
  return out; }
// what an ohm sounds like playing alone: 4 bars of its own drum part (incl. a fill), every hit rendered + classified, weighted by loudness
const Mi = RS.Mind;
function sound(e, bars = 4) { const { c, Sf } = e; if (!c.mind) { c.mind = Mi.make(Sf, c); c.mind.g = c.g; } const m = c.mind, r = RS.rng(c.id * 17 + 3), hits = new Map(), I = c.P.inst;
  for (let b = 0; b < bars; b++) { const o = Mi.drumBar(Sf, m, b, e.role || 'solo', b === bars - 1, r, .8, [0, 2, 4]); for (const n of o) { const f0 = n.f || Mi.hz(Sf, m, n.deg); let P, f, id;
      if (I.dkP && RS.Drums && !n.inst) { const v = RS.Drums.voice(I, n, f0); if (!v) continue; P = v.P; f = v.f; id = v.hit + ':' + n.stroke; } else { P = n.inst || (n.stroke ? RS.Inst.stroke(I, n.stroke) : I); f = f0; id = n.stroke; }
      const key = id + '@' + Math.round(f), h = hits.get(key) || { P, f, w: 0, id }; h.w += n.vel * (n.stroke === 'ghost' ? .5 : 1); hits.set(key, h); } }
  const cls = {}; let tot = 0; for (const h of hits.values()) { h.F = DM.hit(h.P, h.f); h.cl = DM.classify(h.F); cls[h.cl] = (cls[h.cl] || 0) + h.w; tot += h.w; }
  const top = Object.keys(cls).sort((a, b) => cls[b] - cls[a])[0] || 'other'; return { top, cls, tot, hits: [...hits.values()] }; }
module.exports = { births, sound, fresh, reseed, T };
