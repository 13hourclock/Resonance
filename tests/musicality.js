// Objective musicality metrics on a crowded scene. Usage: node tests/musicality.js [--json] [--sec 40]
// on-grid onset %, in-scale pitch %, onsets (polyphony) per beat, consonance score, noise-energy ratio.
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dna']) require('../www/js/' + m + '.js');
const MZ = {};
const CONS = [1, .1, .3, .65, .7, .8, .15, .9, .7, .65, .3, .2];   // pc interval 0..11 semitones
MZ.metrics = (Sf, notes, t0, t1) => { const M = Sf.M, ns = notes.filter(n => n.when >= t0 && n.when < t1 && n.n && n.n.modes && n.n.modes.length && (n.n.gain || 0) > 1e-4);
  const f0 = s => s.f0 || s.modes[0].f; let onG = 0, onGw = 0, inS = 0, inSw = 0, wsum = 0, eTot = 0, eNoise = 0; const beats = new Map(), sim = [];
  for (const { n: s, when } of ns) { const g = Math.round(M.b16(when)); let err = 1e9; for (let k = g - 1; k <= g + 1; k++) err = Math.min(err, Math.abs(M.gridTime(k) - when)); const w = s.gain;
    wsum += w; if (err < .012) { onG++; onGw += w; }
    const f = f0(s), d = M.nearestDeg(f), dc = Math.abs(1200 * Math.log2(f / M.degHz(d))); if (dc < 30) { inS++; inSw += w; }
    for (const m of s.modes.slice(0, 8)) { const e = Math.pow((m.a || 0) * w, 2) * Math.max(.01, m.d) / 2, r = m.f / f, h = Math.max(1, Math.round(r)), off = Math.abs(1200 * Math.log2(r / h)); eTot += e; if (off > 40) eNoise += e; }
    const ce = Math.pow((s.click || 0) * w, 2) * .003; eTot += ce; eNoise += ce;
    const b = Math.floor((when - M.t0) / M.beatDur()); if (!beats.has(b)) beats.set(b, []); beats.get(b).push({ f, w }); sim.push({ t: when, f, w }); }
  const rodN = ns.filter(n => { const b = n.n.body && Sf.W.bodies.get(n.n.body); return b && b.kind === 'rod'; }).length; const nb = Math.max(1, Math.round((t1 - t0) / M.beatDur())), per = [...beats.values()].map(a => a.length); while (per.length < nb) per.push(0); per.sort((a, b) => a - b);
  // consonance of SIMULTANEOUS notes (onsets within a 16th: sounding together), gain-weighted; melodic steps are not penalised
  sim.sort((a, b) => a.t - b.t); const win = M.dt16() * .9; let cs = 0, cw = 0; for (let i = 0; i < sim.length; i++) for (let j = i + 1; j < sim.length && sim[j].t - sim[i].t < win; j++) { const a = sim, ii = i, jj = j; const st = Math.round(Math.abs(12 * Math.log2(a[ii].f / a[jj].f))) % 12, w = a[ii].w * a[jj].w; cs += CONS[st] * w; cw += w; }
  const lanes = {}; for (const { n: s } of ns) { const k = s.kind || (s.src ? 'voice' : s.lane === 'env' ? 'env' : 'strike'); lanes[k] = (lanes[k] || 0) + s.gain; }
  return { notes: ns.length, rodOnsetsPerSec: +(rodN / (t1 - t0)).toFixed(2), onsetsPerSec: +(ns.length / (t1 - t0)).toFixed(2), onGridPct: +(100 * onG / Math.max(1, ns.length)).toFixed(1), onGridPctW: +(100 * onGw / Math.max(1e-9, wsum)).toFixed(1), inScalePct: +(100 * inS / Math.max(1, ns.length)).toFixed(1), inScalePctW: +(100 * inSw / Math.max(1e-9, wsum)).toFixed(1),
    onsetsPerBeatMean: +(ns.length / nb).toFixed(2), onsetsPerBeatP95: per[Math.floor(per.length * .95)] || 0, consonance: +(cs / Math.max(1e-9, cw)).toFixed(3), noiseEnergyPct: +(100 * eNoise / Math.max(1e-12, eTot)).toFixed(1), gainByKind: Object.fromEntries(Object.entries(lanes).map(([k, v]) => [k, +(v / wsum * 100).toFixed(1)])) }; };
// crowded scene: landmarks + companions kept, 16 random creatures, drawn instruments, water, things dropped/thrown, unquantized player taps
MZ.crowd = (opt = {}) => { T.t = 0; T.notes.length = 0; const o = T.make({ mseed: opt.mseed || 7 }), Sf = o.Sf; const us = Sf.updateSky; Sf.updateSky = () => { us(); Sf.day = 1; }; T.t += 1 / 60; Sf.step(1 / 60); const x = Sf.view.cx, r = RS.rng(opt.seed || 5);
  for (let k = 0; k < 16; k++) T.add(Sf, RS.Genome.random(1000 + k * 37 + (opt.seed || 0)), x - 180 + k * 24, { energy: .5 + r() * .5 });
  const inst = []; for (let k = 0; k < 6; k++) { const xx = x - 170 + k * 65, y = Sf.ground(xx) - 60 - r() * 80, pts = []; for (let i = 0; i < 12; i++) pts.push(k % 2 ? [xx + i * 4, y + Math.sin(i) * 2] : [xx + Math.cos(i / 12 * 6.283) * 14, y + Math.sin(i / 12 * 6.283) * 14]); if (k % 2 === 0) pts.push(pts[0]);
    const res = Sf.stroke(pts, pts.map((_, i) => i * 16), {}); if (res && res.id) inst.push(Sf.W.bodies.get(res.id)); }
  const wx = x + 120, wy = Sf.ground(wx) - 30, wp = []; for (let k = 0; k < 40; k++) wp.push([wx + Math.cos(k / 40 * 6.283) * 30, wy + Math.sin(k / 40 * 6.283) * 30]); Sf.W.makeWater(wp);
  return { Sf, inst, r, act: i => { const t = T.t; if (i % 50 === 7) { const xx = x - 150 + r() * 300, y = Sf.ground(xx) - 250, c = []; for (let k = 0; k < 8; k++) c.push([xx + Math.cos(k / 8 * 6.283) * 9, y + Math.sin(k / 8 * 6.283) * 9]); const b = Sf.makeBlob(c); }
    if (i % 23 === 3) { const b = inst[Math.floor(r() * inst.length)]; if (b && Sf.W.bodies.has(b.id)) { const [cx, cy] = Sf.W.center(b); Sf.tap(cx, cy, .4 + r() * .5); } }
    if (Sf.W.bodies.size > 140) { const loose = [...Sf.W.bodies.values()].filter(b => b.meta && b.meta.role === 'blob' && !inst.includes(b)); if (loose[0]) Sf.W.removeBody(loose[0]); } } }; };
// rods at rest: 6 open strokes lying on/over the ground, some crossing each other, nothing touching them
MZ.rodRest = (gate, sec = 20) => { RS.Gate.on = gate; T.notes.length = 0; const { Sf } = T.scene({ clear: true }), x = Sf.view.cx, rods = new Set();
  for (let k = 0; k < 6; k++) { const xx = x - 150 + k * 45, y = Sf.ground(xx) - 12 - (k % 3) * 10, pts = []; for (let i = 0; i < 14; i++) pts.push([xx + i * 6, y - i * (k % 2 ? 1.2 : -.4)]); const r = Sf.stroke(pts, pts.map((_, i) => i * 18), {}); if (r && r.id) rods.add(r.id); }
  T.run(Sf, 3); const t0 = T.t; T.run(Sf, sec - 3); const n = T.notesSince(t0, s => rods.has(s.body)).length; return { rods: rods.size, rodOnsetsPerSec: +(n / (sec - 3)).toFixed(2), allOnsetsPerSec: +(T.notesSince(t0).length / (sec - 3)).toFixed(2) }; };
MZ.run = (opt = {}) => { RS.Gate.on = opt.gate !== false; const { Sf, act } = MZ.crowd(opt); const sec = opt.sec || 40; T.run(Sf, sec, act); return MZ.metrics(Sf, T.notes, 5, sec); };
module.exports = MZ;
if (require.main === module) { const sec = +(process.argv[process.argv.indexOf('--sec') + 1]) || 40, out = []; for (const gate of [false, true]) for (const seed of [5, 11]) out.push(Object.assign({ gate, seed }, MZ.run({ seed, sec, gate }))); for (const gate of [false, true]) out.push(Object.assign({ gate, test: 'rods at rest' }, MZ.rodRest(gate))); console.log(JSON.stringify(out)); }
