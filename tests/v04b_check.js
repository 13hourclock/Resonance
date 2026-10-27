// v0.4b lean headless check: v0.4a weak-spot fixes (crowd density cap, crawler seeking both ways, start shore, spiral beats strum)
// and the attraction / symbiosis layer (RS.Items on, RS.Sym: 7 pairings, motif crazes, dew carrying, persistence).
const T = require('./node_env.js'), RS = global.RS, MZ = require('./musicality.js'), spiral = require('./spiral_synth.js'), Y = RS.Sym, F = RS.Field;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const ONLY = process.env.ONLY || '';
const plainAt = (Sf, seed, x, beh) => { const c = T.add(Sf, T.plain(seed), x); Object.assign(c.P.beh, { lightLove: 0, curiosity: 0, social: 0, wander: 0 }, beh || {}); return c; };
// 1 crowd density: scene mean back at / under v0.3.2 and no local crowd over 8 notes per beat
if (!ONLY || ONLY === 'crowd') { RS.Gate.on = true; const out = []; let worst = 0;
  for (const seed of [5, 7]) { const { Sf, act } = MZ.crowd({ seed, gate: true }); T.run(Sf, 30, act); const M = MZ.metrics(Sf, T.notes, 5, 30); out.push(M.onsetsPerBeatMean);
    const R = (Sf.onRing || []).filter(e => e.t > 5); for (const e of R) { const n = R.filter(o => o.t > e.t - .6 && o.t <= e.t && Math.abs(o.x - e.x) < 700).length; worst = Math.max(worst, n); } }
  ok('crowds: mean notes/beat <= v0.3.2 (6.88 / 5.69 on seeds 5 / 7) and any one crowd <= 8 per beat', out[0] <= 6.9 && out[1] <= 5.8 && worst <= 8, { mean: out, worstLocal: worst }); }
// 2 crawlers seek both ways under a weak calm pull
if (!ONLY || ONLY === 'crawl') { const J = RS.Jam, sg = J.seekGoal, rows = [];
  for (const seed of [90, 93, 96]) { const r = {}; for (const dir of [-1, 1]) { const { Sf } = T.scene({ clear: true }); const c = plainAt(Sf, seed, 0), x0 = c.x; Sf.instruments = () => []; Sf.waterSpot = null; Sf.view.cx += 600;
      J.seekGoal = (S, q) => q === c ? { k: 'light', x: x0 + dir * 400, y: c.y, stop: 30, mag: .05 } : null; T.run(Sf, 12, () => { c.energy = .5; }); r[dir] = Math.round(c.x - x0); } rows.push(r); }
  J.seekGoal = sg; ok('a weak calm pull moves crawlers left as well as right (> 40 px in 12 s)', rows.every(r => r[-1] < -40 && r[1] > 40), rows); }
// 3 start shore: dry land, a wind rock or reeds and a pool within 1-2 screens of the landing; saved content outside untouched
if (!ONLY || ONLY === 'shore') { const { Sf } = T.scene({}), P = Sf.P, fd = Sf.field, Cc = 2 * Math.PI * fd.R, W = Sf.view.x1 - Sf.view.x0;
  const near = fd.feat.map(q => { let s = q.s; if (s > Cc / 2) s -= Cc; return [q.kind, s]; }).filter(a => Math.abs(a[1]) < 2.2 * W);
  let dry = 0; for (let s = 380; s < 1160; s += 40) if (P.height(s / P.R) > P.sea) dry++;
  ok('start shore: dry land, a wind rock / reeds and a pool within two screens', dry >= 6 && near.some(a => a[0] === 'pool') && near.some(a => a[0] === 'rock' || a[0] === 'reed'), { dry, near: near.map(a => a[0] + '@' + Math.round(a[1])) });
  const th = 9000 / P.R, b0 = P.height(th); RS.START_SHORE = false; const { Sf: S2 } = T.scene({}); RS.START_SHORE = true; ok('the world beyond the start area is unchanged', Math.abs(S2.P.height(th) - b0) < 1e-6); }
// 4 a spiral beats a strum: a 2+ turn spiral over a wandering ohm still makes clay
if (!ONLY || ONLY === 'spiral') { let bad = 0; const s = spiral({}); for (let tr = 0; tr < 8; tr++) { T.t = 0; const { Sf } = T.scene({ clear: true }), x0 = Sf.view.cx + tr * 13; const c = plainAt(Sf, 300 + tr, x0 - Sf.view.cx); c.P.beh.wander = 1;
    const r = Sf.stroke(s.pts.map(p => [p[0] - 400 + x0, p[1] - 300 + c.y]), s.times, { hy: .5, endHold: 600 }); if (!(r && r.k === 'clay')) bad++; }
  ok('a spiral drawn over an ohm hatches clay, not a strum (8 trials)', bad === 0, { bad }); }
// 5 items on; a closed shape is still a blob
if (!ONLY || ONLY === 'items') { const { Sf } = T.scene({ clear: true }); const x0 = Sf.view.cx, y0 = Sf.ground(x0) - 220, pts = []; for (let k = 0; k <= 40; k++) { const a = k / 40 * Math.PI * 2; pts.push([x0 + Math.cos(a) * 40, y0 + Math.sin(a) * 36]); } const n0 = (Sf.items || []).length, r = Sf.stroke(pts, pts.map((_, i) => i * 12));
  ok('attraction objects on (RS.Items); a closed shape WITHOUT the end rest is still a blob (v0.8a3: rested = item)', !!RS.Items && Y.on() && r && r.k === 'material' && (Sf.items || []).length === n0, { k: r && r.k }); }
// 6 pairings
const pair = (fn) => { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.instruments = () => []; return fn(Sf); };
if (!ONLY || ONLY === 'pairs') {
  pair(Sf => { const k = plainAt(Sf, 11, 0), w = plainAt(Sf, 12, 200); T.run(Sf, .3); k.mind.perc = .9; w.mind.perc = 0; w.mind.lead = .1; T.run(Sf, 3); ok('#2 a wanderer bonds to a nearby timekeeper and hears its pulse louder', w.sym && w.sym.keeper === k.id && Y.hearW(w, k) > 0, w.sym); });
  pair(Sf => { const a = plainAt(Sf, 21, 0), b = plainAt(Sf, 22, 220); T.run(Sf, .3); [a, b].forEach(c => { c.mind.perc = 0; c.mind.lead = 0; }); a.mind.stub = .9; b.mind.stub = .1; b.mind.tonicC = (a.mind.tonicC + 300) % 1200; T.run(Sf, 3);
    const d = ((b.mind.tonicC - a.mind.tonicC) % 1200 + 1200) % 1200; ok('#4 a stubborn tuner pulls a flexible drifter into its key (learned, genome untouched)', (d < 50 || d > 1150) && b.mindTonic === b.mind.tonicC, { d }); });
  pair(Sf => { const a = plainAt(Sf, 31, 0), b = plainAt(Sf, 32, 150); T.run(Sf, .3); [a, b].forEach(c => { c.mind.perc = 0; }); a.mind.lead = .9; b.mind.lead = .1; let n = 0; T.run(Sf, 16, () => { a.partner = b; b.partner = a; });
    a.partner = b.partner = null; ok('#8 two ohms that talk 12 s become call & echo twins (the quieter one echoes)', a.sym.twin === b.id && b.sym.echo && !a.sym.echo); 
    b.mind.heard.push({ from: a.id, t: Sf.now(), f: 0 }); const m = Y.motif(Sf, b.mind, 'state'); ok('#8 the echo twin develops its caller\'s theme after hearing it', m !== b.mind.motif && m.length > 0); });
  pair(Sf => { const bl = plainAt(Sf, 41, 0), bo = plainAt(Sf, 42, 90); T.run(Sf, .3); global.fbA = global.fbA || RS.Field.blower; RS.Field.blower = c => c === bl; bo.mind.perc = .9; Sf.field.feat = Sf.field.feat.filter(q => q.kind !== 'rock' && q.kind !== 'reed');
    const g = Y.goal(Sf, bl); const bar = Y.shapeBar(Sf, bo.mind, 0, [{ s: 0, vel: .5 }, { s: 1, vel: .5 }]); ok('#3 a blower with no wind rock breathes on a body; its next bar accents (no extra notes)', g && g.k === 'breath' && bo.mind.breathT === Sf.now() && bar.length === 2 && bar[0].vel > .6 && bar[1].vel === .5); });
  RS.Field.blower = global.fbA; }   // restore (a cached require cannot bring it back)
// 7 harmony nest + farm + dew + persistence
if (!ONLY || ONLY === 'env') { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.instruments = () => []; const cs = [0, 1, 2].map(k => plainAt(Sf, 51 + k, k * 60)); T.run(Sf, .3);
  const j = { members: cs, coh: .8, x: cs[1].x, y: cs[1].y, leader: cs[0] }; Sf.jams = [j]; cs.forEach(c => { c.anchor = [c.x, c.y]; });
  for (let k = 0; k < 25; k++) { Sf._syT = null; T.t += 1; Y.nestTick(Sf, Sf.now()); } const n = (Sf.mods.nests || [])[0];
  ok('#7 a coherent jam near home weaves a nest that keeps its key', !!n && n.str > .3 && n.tc === cs[0].mind.tonicC, n); Sf.jams = [];
  const fb0 = F.blower; F.blower = c => c === cs[1]; const rock = { k: 'rk1', kind: 'rock', th: Sf.P.theta(cs[0].x, cs[0].y), s: 0 }; const lv0 = Y.farm(Sf, rock, cs[0].x, cs[0].y, cs[1]); Y.farm(Sf, rock, cs[0].x, cs[0].y, cs[1]);
  F.blower = fb0; ok('#13 a wind rock played with a tender beside it gets farmed (rings longer / richer)', lv0 === 0 && Sf.mods.farm.rk1 > 0, Sf.mods.farm);
  const th = Sf.P.theta(cs[2].x + 1200, cs[2].y), m0 = F.atTh(Sf, th).moist; for (let k = 0; k < 4; k++) Y.bump(Sf, th, 2, .08, .6); const m1 = F.atTh(Sf, th).moist;
  ok('#14 carried dew makes the home ground wetter', m1 > m0 + .1, { m0: +m0.toFixed(2), m1: +m1.toFixed(2) });
  cs[1].sym = { keeper: cs[0].id, twin: cs[2].id, echo: true }; for (const ci of Sf.active) Sf.dirty.add(ci); const data = JSON.parse(JSON.stringify(Sf.pack())); const { Sf: S2 } = T.make({}); S2.unpack(data, Date.now()); T.run(S2, .5);
  const c1 = S2.creatures.find(c => c.id === cs[1].id); ok('nests, farms, carried water and pair bonds survive save / load', S2.mods.nests && S2.mods.nests.length === 1 && S2.mods.farm.rk1 > 0 && Math.abs(F.atTh(S2, th).moist - m1) < .02 && c1 && c1.sym && c1.sym.twin === cs[2].id && c1.sym.echo, { c1: c1 && c1.sym }); }
// 8 dew trip end to end, crazes spread and fade without touching genome or motif
if (!ONLY || ONLY === 'dew') { T.t = 0; const { Sf } = T.scene({ clear: true }), P = Sf.P; let spot = null;
  for (let x = Sf.view.cx - 3000; x < Sf.view.cx + 3000 && spot == null; x += 40) { const y = Sf.ground(x); if (F.at(Sf, x).moist <= .65 && !(Sf.mediumAt && Sf.mediumAt(x, y - 20).water) && F.near(Sf, x, y, 'pool', 600)) spot = x; }
  if (spot == null) ok('dew: a dry spot near a pool exists', false); else { const c = T.add(Sf, T.plain(61), spot - Sf.view.cx); T.run(Sf, .3); Object.assign(c.P.beh, { waterLove: .9, wander: 0, social: 0, curiosity: 0, lightLove: 0 }); c.mind.perc = 0; c.anchor = [c.x, c.y];
    F.blower = q => false; { const v = Sf.view, hw = (v.x1 - v.x0) / 2, hh = (v.y1 - v.y0) / 2, cx = c.x + hw * .8, cy = c.y; Sf.view = Object.assign({}, v, { x0: cx - hw, x1: cx + hw, y0: cy - hh, y1: cy + hh, cx, cy }); }   /* on screen, not centred: a watched ohm holds still (v0.8b2: the view is put on the ohm itself; it used to be shifted from the scene centre, which left the ohm ~1000 px off screen, and off-screen ohms now carry by tally, B9) */ const th = P.theta(c.x, c.y), m0 = F.atTh(Sf, th).moist; let trip = 0; T.run(Sf, 120, () => { c.energy = .6; if (c.sym && c.sym.dew) trip = 1; }); const st = Sf.stats.sym || {};
    ok('#14 a water-loving ohm on dry ground fetches a droplet from the pool and brings it home', trip && st.dew >= 1 && F.atTh(Sf, th).moist > m0, { m0: +m0.toFixed(2), m1: +F.atTh(Sf, th).moist.toFixed(2), trip, dew: st.dew || 0, fill: st.dewFill || 0 }); } }
if (!ONLY || ONLY === 'craze') { T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.instruments = () => []; const cs = [0, 1, 2, 3].map(k => plainAt(Sf, 71 + k, k * 70)); T.run(Sf, .3); cs.forEach(c => { c.mind.perc = 0; });
  const g0 = cs.map(c => Array.from(c.g).join()), mo0 = cs.map(c => JSON.stringify(c.mind.motif)); const j = { members: cs, coh: .7, x: cs[1].x, y: cs[1].y, leader: cs[0] };
  Sf.crazes = { z1: { t: 0, n: 1, src: cs[0].id } }; cs[0].craze = { id: 'z1', m: [0, 2, 4, 7], src: cs[0].id, t: Sf.now(), until: Sf.now() + 40, hue: 200 }; let peak = 0;
  T.run(Sf, 90, () => { cs.forEach(c => { c.jam = j; }); peak = Math.max(peak, cs.filter(c => c.craze).length); }); cs.forEach(c => { c.jam = null; });
  ok('a motif craze spreads to jam-mates, then fades (learned only: genome untouched, never written into an ohm\'s own motif)', peak >= 3 && cs.every(c => !c.craze) && cs.every((c, i) => Array.from(c.g).join() === g0[i] && JSON.stringify(c.mind.motif.slice(0, 4)) !== '[0,2,4,7]' && JSON.stringify(c.motif || []).indexOf('0,2,4,7') < 0), { peak, left: cs.filter(c => c.craze).length }); }
const n = res.filter(Boolean).length; console.log(`v0.4b: ${n}/${res.length} passed`); process.exit(n === res.length ? 0 : 1);
