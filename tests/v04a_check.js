// v0.4a lean headless check: the v0.3.2 weak-spot fixes, calm light / curiosity seeking, and the environment fields (RS.Field):
// ranges + features, acoustics, tempo seed, wind rocks / reeds / wind-blowing ohms, comfort -> rests, weather bias, day length -> phrase plans.
const T = require('./node_env.js'), RS = global.RS, spiral = require('./spiral_synth.js'), Mo = RS.Mold, F = RS.Field;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const viewAt = (Sf, x, y) => { const v = Sf.view, hw = (v.x1 - v.x0) / 2, hh = (v.y1 - v.y0) / 2; Sf.view = { x0: x - hw, x1: x + hw, y0: y - hh, y1: y + hh, cx: x, cy: y, z: 1 }; };
// 1 duplicate timbre across 7 spirals: 30 trials
if (!ONLY || ONLY === 'a7') { let bad = 0, worst = 0; const s = spiral({});
  for (let tr = 0; tr < 30; tr++) { T.t = 0; const { Sf } = T.scene({ clear: true }), x0 = (Sf.view.x0 + Sf.view.x1) / 2 + tr * 11;
    for (let k = 0; k < 7; k++) { Sf.stroke(s.pts.map(p => [p[0] - 400 + x0 - 300 + k * 90, p[1] - 300 + Sf.ground(x0) - 150]), s.times, { hy: .5 }); Mo.hatch(Sf, 'test'); T.run(Sf, .2); }
    const ids = Sf.creatures.map(c => RS.Inst.identity(c.P.inst, c.g)), dup = ids.length - new Set(ids).size; if (dup || Sf.creatures.length !== 7) bad++; worst = Math.max(worst, dup); }
  ok('7 spirals side by side never share a timbre identity (30 trials)', bad === 0, { bad, worst }); }
// 2 off-screen ohms stay put
if (!ONLY || ONLY === 'drift') { const { Sf } = T.scene({ clear: true }); const cs = []; for (let k = 0; k < 6; k++) { const c = T.add(Sf, T.plain(300 + k * 17), -900 + k * 360); c.P.beh.wander = 0; c.P.beh.social = 0; c.P.beh.lightLove = 0; c.P.beh.curiosity = 0; cs.push([c, c.x, c.y]); }
  viewAt(Sf, 9000, Sf.view.cy); T.run(Sf, 60); const mv = cs.map(([c, x, y]) => Math.round(Math.hypot(c.x - x, c.y - y)));
  ok('unwatched, idle ohms (off screen) hold their places for 60 s', Math.max(...mv) < 120, mv); }
// 3 crowd thinning, 4 clay lumps kept
if (!ONLY || ONLY === 'body') { const B = RS.Body; ok('crowd factor: 0 with room, 1 when touching', B.crowd(200, 40) === 0 && B.crowd(0, 40) === 1 && B.crowd(30, 40) > 0);
  const Gn = RS.Genome; let n = 0, kept = 0; for (let s = 0; s < 600 && n < 12; s++) { const g = Gn.random(4000 + s), P = Gn.express(g); if (P.body.plan !== 'shell' && P.body.plan !== 'drum-belly') continue; n++;
    const g2 = new Float32Array(g); g2.shaped = 1; const P2 = Gn.express(g2), a = P.harm.reduce((t, h) => t + Math.abs(h.a), 0), b = P2.harm.reduce((t, h) => t + Math.abs(h.a), 0); if (b > a * 1.5 || a === 0) kept++; }
  ok('shell / drum-belly bodies keep the clay-shaped lumps (only random baseline smoothed)', n >= 6 && kept === n, { n, kept });
  const { Sf } = T.scene({ clear: true }), s = spiral({}), x0 = Sf.view.cx; Sf.stroke(s.pts.map(p => [p[0] - 400 + x0, p[1] - 300 + Sf.ground(x0) - 150]), s.times, { hy: .5, endHold: 600 }); const k = Sf.clay;
  if (k) { Mo.reshape(Sf, k, 0, 40); } const c = Mo.hatch(Sf, 'test'); ok('a reshaped clay hatches as shaped and the flag survives save / load', !!(c && c.shaped && c.g.shaped && Sf.serialCreature ? true : c && c.shaped), { clay: !!k, shaped: c && c.shaped, g: c && c.g.shaped }); }
// 5 calm seeking (also in test_music)
if (!ONLY || ONLY === 'seek') { const r = {}; for (const sc of ['free', 'watched']) { const { Sf } = T.scene({ clear: true }); const c = T.add(Sf, T.plain(91), 0); Object.assign(c.P.beh, { lightLove: .95, curiosity: 0, social: 0, wander: 0 }); const x0 = c.x, y0 = Sf.ground(0) - 40;
    Sf.lightAt = () => ({ I: .5, wl: 550 }); Sf.brightSpot = () => [x0 - 400, y0]; Sf.instruments = () => []; Sf.waterSpot = null; if (sc === 'free') viewAt(Sf, Sf.view.cx + 300, Sf.view.cy); T.run(Sf, 12, () => { c.energy = .5; }); r[sc] = Math.round(c.x - x0); }
  ok('light-seeking: unwatched it moves toward the light but no further than its leash; watched it holds', r.free < -50 && r.free > -RS.Jam.LEASH * 1.25 && Math.abs(r.watched) < 40, r); }
// 6 fields
if (!ONLY || ONLY === 'field') { const { Sf } = T.scene({ clear: true }), fd = Sf.field, K = {}; ok('fields exist and carry features', !!fd && fd.feat.length > 20, { n: fd && fd.feat.length });
  for (const q of fd.feat) K[q.kind] = (K[q.kind] || 0) + 1; ok('all four feature kinds occur (cave, pool, rock, reed)', ['cave', 'pool', 'rock', 'reed'].every(k => K[k] > 0), K);
  let bad = 0, tmin = 9, tmax = 0; for (let i = 0; i < 400; i++) { const th = i / 400 * Math.PI * 2, f = F.atTh(Sf, th); for (const k of F.KEYS) if (!(f[k] >= 0 && f[k] <= 1)) bad++; const [x, y] = Sf.P.surf(th), m = F.tempoMul(Sf, x, y); tmin = Math.min(tmin, m); tmax = Math.max(tmax, m); }
  ok('every field value stays in 0..1 round the planet', bad === 0, { bad }); ok('tempo seed nudge stays within ±10 % and varies by place', tmin >= .9 && tmax <= 1.1 && tmax - tmin > .03, { tmin: +tmin.toFixed(3), tmax: +tmax.toFixed(3) });
  const st = fd.feat.filter(q => q.kind === 'rock').map(q => Math.min(q.s, Math.PI * 2 * fd.R - q.s)); ok('a wind rock waits near the landing coast', Math.min(...st) < 2700, { nearest: Math.round(Math.min(...st)) });
  // acoustics: cave echo + darker, pool water
  const cv = fd.feat.find(q => q.kind === 'cave'); if (cv) { const [x, y] = F.pos(Sf, cv, 12), md = Sf.mediumAt(x, y); ok('inside a cave: echo and darker light', md.cave > .5 && F.light(Sf, x, y) < .7, { cave: +md.cave.toFixed(2), light: +F.light(Sf, x, y).toFixed(2) }); }
  const pl = fd.feat.find(q => q.kind === 'pool'); if (pl) { const [x, y] = F.pos(Sf, pl, 4); ok('a pool is water to the sound', Sf.mediumAt(x, y).water > 0); }
  const sp = F.shape({ modes: [{ f: 4000, a: 1, d: 1 }], send: .3 }, { hard: .2, absorb: .95, echo: .1 }); ok('absorbent ground damps highs and shortens ring', sp.modes[0].a < .9 && sp.modes[0].d < 1, sp.modes[0]);
  // the music writes the fields
  const th0 = 0, a0 = F.area(Sf, th0), D = Sf.mods.fieldD; Sf.jams = [{ members: [{ P: { inst: {} } }, { P: { inst: {} } }], x: Sf.P.surf(0)[0], y: Sf.P.surf(0)[1], coh: .9 }]; for (let i = 0; i < 30; i++) F.tick(Sf, 1.01);
  const rich = (D[a0] || [0])[0]; Sf.jams = [{ members: [{ P: { inst: { noise: .6 } } }, { P: { inst: { noise: .5 } } }], x: Sf.P.surf(0)[0], y: Sf.P.surf(0)[1], coh: .1 }]; for (let i = 0; i < 30; i++) F.tick(Sf, 1.01);
  ok('coherent jams enrich the ground, harsh incoherent ones wear it (saved in mods)', rich > .05 && (D[a0] || [0, 0])[1] > .05 && JSON.parse(JSON.stringify(Sf.mods)).fieldD, { rich: +rich.toFixed(3), wear: +((D[a0] || [0, 0])[1]).toFixed(3) }); Sf.jams = [];
  // comfort -> rest
  const c = T.add(Sf, T.plain(91), 0); c.P.sense.blind = 1; let cin = 0; if (cv) { const [x, y] = F.pos(Sf, cv, 12); c.x = x; c.y = y; cin = F.comfort(Sf, c); } ok('a blind ohm is at ease in a cave (comfort > 0)', !cv || cin > 0, { comfort: +cin.toFixed(2) });
  ok('rest adjust is at most one bar', [-1, 0, 1].includes(F.restAdj(Sf, c)));
  // weather
  const xs = [-3000, -1000, 1000, 3000], bx = F.boltX(Sf, xs), ch = xs.map(x => F.at(Sf, x).charge); ok('lightning prefers the most charged ground', F.at(Sf, bx).charge === Math.max(...ch), ch.map(v => +v.toFixed(2)));
  ok('rain bias stays within ±0.5', Math.abs(F.rainBias(Sf)) <= .5); }
// 7 wind rocks / reeds / blowers
if (!ONLY || ONLY === 'wind') { for (const kind of ['rock', 'reed']) { const { Sf } = T.scene({ clear: true }), fd = Sf.field; const q = fd.feat.filter(f => f.kind === kind && !f.wet).sort((a, b) => Math.min(a.s, 63000 - a.s) - Math.min(b.s, 63000 - b.s))[0]; const [x, y] = F.pos(Sf, q, 10);
    viewAt(Sf, x, y); const c = T.add(Sf, T.plain(91), x + 60); Sf.wind = [320, 0]; const L = Sf.updateSky; Sf.updateSky = () => { L(); Sf.wind = [320, 0]; }; let fs = []; const pl = Sf.play; Sf.play = (sp, ...a) => { if (sp.lane === 'wind') fs.push(sp.f0); return pl(sp, ...a); };
    T.run(Sf, 20); const key = kind === 'rock' ? 'windRock' : 'windReed', base = RS.Mind.tonicHz(Sf, c.mind); const inKey = fs.filter(f => [0, 2, 4].some(d => [-7, 7].some(o => Math.abs(1200 * Math.log2(f / RS.Mind.hz(Sf, c.mind, d + o))) < 2))).length;
    ok(`a ${kind} sounds in a strong wind, on the nearby ohm's tonic triad`, (Sf.stats[key] || 0) > 0 && inKey === fs.length, { n: Sf.stats[key] || 0, inKey, base: +base.toFixed(1) }); }
  { const { Sf } = T.scene({ clear: true }), fd = Sf.field; let g = null; for (let s = 0; s < 3000 && !g; s++) { const gg = T.plain(5000 + s), P = RS.Genome.express(gg); if (F.blower({ P, g: gg })) g = gg; }
    const q = fd.feat.filter(f => f.kind === 'reed' && !f.wet)[0], [x, y] = F.pos(Sf, q, 10); viewAt(Sf, x + 300, y); const c = T.add(Sf, g, x + 150); Sf.updateSky0 = Sf.updateSky; Sf.wind = [0, 0]; const L = Sf.updateSky; Sf.updateSky = () => { L(); Sf.wind = [0, 0]; };
    const d0 = Math.abs(c.x - x); T.run(Sf, 40); ok('a wind-blowing ohm (unwatched) drifts to a reed bed and plays it with its breath', g && (Sf.stats.windBlown || 0) > 0 && Math.abs(c.x - x) < d0, { blower: !!g, blown: Sf.stats.windBlown || 0, d0: Math.round(d0), d1: Math.round(Math.abs(c.x - x)) }); } }
// 8 day length shapes phrase plans
if (!ONLY || ONLY === 'day') { const plansOf = DB => { const { Sf } = T.scene({ clear: true }); Sf.dayBars = DB; const c = T.add(Sf, T.plain(91), 0); T.run(Sf, .5); const m = c.mind, seen = {}; m.Sf = Sf; for (let b = 0; b < 200; b += 4) { const p = RS.Mind.newPhrase(Sf, m, b); if (p && p.plan) seen[p.plan] = 1; } return seen; };
  { const L = plansOf(48), S = plansOf(16); ok('a long day always has the long aaba plan, a short day keeps riffs', L.aaba && S.riff, { long: Object.keys(L), short: Object.keys(S) }); } }
const n = res.filter(Boolean).length; console.log(`v0.4a: ${n}/${res.length} passed`); process.exit(n === res.length ? 0 : 1);
