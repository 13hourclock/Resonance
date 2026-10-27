// v0.8b2 headless check: V08_SPEC R7 clay timbre stage (claystage.js) at the module level. The touch routing in app.js is in pw_clay.js.
const T = require('./node_env.js'), RS = global.RS, spiral = require('./spiral_synth.js'), Mo = RS.Mold, CS = RS.ClayStage, I = RS.IG;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const mk = (seed = 0) => { T.t = 0; const o = T.scene({ clear: true, useed: 1 + seed }), Sf = o.Sf || o, x0 = (Sf.view.x0 + Sf.view.x1) / 2, s = spiral({}); Sf.stroke(s.pts.map(p => [p[0] - 400 + x0, p[1] - 300 + Sf.ground(x0) - 160]), s.times, { hy: .4, endHold: 600 }); const k = Sf.clay; if (k) T.run(Sf, .6); return { Sf, k }; };
const line = (x0, y0, x1, y1, n, ms) => { const pts = [], tm = []; for (let i = 0; i <= n; i++) { const u = i / n; pts.push([x0 + (x1 - x0) * u, y0 + (y1 - y0) * u]); tm.push(1000 + ms * u); } return { pts, tm }; };
const { Sf: S0, k: k0 } = mk(); ok('U0 a spiral + rest makes clay with the R7 stage on (48-point soft body)', k0 && CS.on && k0.sb && k0.sb.n === 48, k0 && k0.sb && k0.sb.n);
// R7.0 plastic
{ const { Sf, k } = mk(), R = Mo.radius(k), b = k.sb; let i0 = 0; for (let i = 0; i < b.n; i++) if (Math.hypot(b.rx[i], b.ry[i]) < Math.hypot(b.rx[i0], b.ry[i0])) i0 = i; const th = i0 / b.n * Math.PI * 2, before = Math.hypot(b.rx[i0], b.ry[i0]), cx = Math.cos(th), cy = Math.sin(th); for (let j = 0; j < 6; j++) RS.Mold.SB.touch(k, 'poke', k.x + cx * (before + R * .4), k.y + cy * (before + R * .4)); T.run(Sf, .05);   /* v0.8b3: every lump starts lobed, so pull at its narrowest side */
  const L = line(k.x + cx * (before - R * .05), k.y + cy * (before - R * .05), k.x + cx * (before + R * .4), k.y + cy * (before + R * .4), 8, 420); const r = Mo.drag(Sf, k, L.pts, L.tm); T.run(Sf, 3); const after = Math.hypot(k.sb.rx[i0], k.sb.ry[i0]), live = Math.hypot(k.sb.x[i0], k.sb.y[i0]);
  ok('U1 R7.0 an edge pull STAYS: the rest outline keeps the bump 3 s later (plastic, no spring-back)', r === 'shape' && after > before + R * .08 && live > before + R * .06, { r, before: +before.toFixed(1), after: +after.toFixed(1), live: +live.toFixed(1) }); }
// R7.1 the first touch picks the way of playing
{ const fams = {}; { const { Sf, k } = mk(1); Mo.tap(Sf, k, 1000, k.x, k.y); fams.struck = [k.cs.fam, k.voice]; }
  { const { Sf, k } = mk(2), R = Mo.radius(k), L = line(k.x + R * .5, k.y, k.x + R * 1.3, k.y - 5, 6, 160); Mo.drag(Sf, k, L.pts, L.tm); fams.plucked = [k.cs.fam, k.voice]; }
  { const { Sf, k } = mk(3), R = Mo.radius(k), pts = [], tm = []; for (let i = 0; i <= 40; i++) { pts.push([k.x + Math.sin(i / 40 * Math.PI * 6) * R * .45, k.y + i * .3]); tm.push(1000 + i * 30); } Mo.drag(Sf, k, pts, tm); fams.bowed = [k.cs.fam, k.voice]; }
  { const { Sf, k } = mk(4), R = Mo.radius(k), pts = [], tm = []; for (let i = 0; i < 6; i++) { pts.push([k.x + R * .2, k.y + (i % 2)]); tm.push(1000 + i * 55); } for (let i = 1; i <= 8; i++) { pts.push([k.x + R * .2 + i * R * .12, k.y]); tm.push(1300 + i * 60); } Mo.drag(Sf, k, pts, tm); fams.blown = [k.cs.fam, k.voice]; }
  { const { Sf, k } = mk(5), R = Mo.radius(k); Mo.twoStart(Sf, [k.x - R * .6, k.y], [k.x + R * .6, k.y]); Mo.twoEnd(Sf, { ratio: .7, wc: [k.x, k.y] }); fams.voiced = [k.cs.fam, k.voice]; }
  const good = Object.keys(fams).every(f => fams[f][0] === f && CS.FAMILY[f].includes(fams[f][1]));
  ok('U2 R7.1 tap = struck, flick = plucked, rub = bowed, press-drag = blown, squeeze = voiced (a voice from that family)', good, fams);
  const { Sf, k } = mk(6); Mo.tap(Sf, k, 1000, k.x, k.y); const f1 = k.cs.fam, R = Mo.radius(k), L = line(k.x + R * .5, k.y, k.x + R * 1.3, k.y, 6, 150); Mo.drag(Sf, k, L.pts, L.tm);
  ok('U3 only the FIRST touch picks: a later flick keeps the family', f1 === 'struck' && k.cs.fam === 'struck', [f1, k.cs.fam]);
  const fl = new Set(Object.values(CS.FAMILY).flat()); ok('U4 R7.14 families span synthetic engines too (not instrument classes)', ['grit', 'foldlead', 'grain', 'drone', 'shimmer', 'movepad'].every(v => fl.has(v)), [...fl]); }
// R7.2 brightness + drive, R7.7 outside pinch = point
{ const { Sf, k } = mk(7), R = Mo.radius(k), c0 = k.g[I.cut], s0 = k.g[I.sat], ih0 = k.g[I.inharm], pt0 = k.cs.points || 0; let r = null; for (let j = 0; j < 3; j++) { const th = j * 2.1; Mo.twoStart(Sf, [k.x + Math.cos(th) * R * 1.3 - 8, k.y + Math.sin(th) * R * 1.3], [k.x + Math.cos(th) * R * 1.3 + 8, k.y + Math.sin(th) * R * 1.3]); r = Mo.twoEnd(Sf, { ratio: .5, wc: [k.x + Math.cos(th) * R * 1.8, k.y + Math.sin(th) * R * 1.8] }); }
  T.run(Sf, .5); ok('U5 R7.7 a pinch from outside the edge pulls a point out (x3)', r === 'point' && k.cs.points - pt0 === 3, { r, pts: [pt0, k.cs.points] });
  ok('U6 R7.2 points: brighter (one cut target) and more drive / clang', k.g[I.cut] > c0 && k.g[I.sat] >= s0 && k.g[I.sat] > .35 && k.g[I.inharm] > ih0, { cut: [c0, k.g[I.cut]], sat: [s0, k.g[I.sat]], inharm: [ih0, k.g[I.inharm]] }); }
// R7.4 tail vs limb, R7.5 dent
{ const { Sf, k } = mk(8), R = Mo.radius(k), l0 = k.P.limbs || 0, s0 = k.g[I.sus], r0 = k.g[I.rel], L = line(k.x + R * .7, k.y, k.x + R * 2.4, k.y, 20, 1100); const r = Mo.drag(Sf, k, L.pts, L.tm);
  ok('U7 R7.4 a slow pull from the edge = tail: longer sustain + release, no new limb', r === 'tail' && k.g[I.sus] >= s0 && k.g[I.rel] >= r0 && (k.g[I.sus] > s0 || k.g[I.rel] > r0) && (k.P.limbs || 0) === l0, { r, sus: [s0, k.g[I.sus]], rel: [r0, k.g[I.rel]], limbs: [l0, k.P.limbs] });
  const Q = line(k.x - R * .7, k.y, k.x - R * 2.2, k.y, 6, 180), r2 = Mo.drag(Sf, k, Q.pts, Q.tm); ok('U8 a quick thin pull stays a limb', r2 === 'limb', r2); }
{ const { Sf, k } = mk(9), R = Mo.radius(k), b0 = k.g[I.bodyRes], L = line(k.x, k.y - R * .95, k.x, k.y - R * .35, 6, 400); const r = Mo.drag(Sf, k, L.pts, L.tm); T.run(Sf, 2);
  const i = Math.round(.75 * k.sb.n) % k.sb.n, rr = Math.hypot(k.sb.rx[i], k.sb.ry[i]);
  ok('U9 R7.5 a push in from the rim = a lasting dent = more body resonance', r && k.cs.dent > 0 && k.g[I.bodyRes] > b0, { r, dent: k.cs.dent, body: [b0, k.g[I.bodyRes]], rimAtDent: +rr.toFixed(1), R: +R.toFixed(1) }); }
// R7.9 wiggle
{ const { Sf, k } = mk(10), R = Mo.radius(k), p0 = k.g[I.lfoP], pts = [], tm = []; for (let i = 0; i <= 30; i++) { pts.push([k.x + Math.sin(i / 30 * Math.PI * 8) * R * .1, k.y]); tm.push(1000 + i * 30); } const r = Mo.drag(Sf, k, pts, tm);
  ok('U10 R7.9 a small held wiggle = vibrato (depth from the wiggle size: .2 R wide -> lfoP ~.58), not a family pick or scribble', r === 'vibrato' && k.cs.vib > 0 && Math.abs(k.g[I.lfoP] - .58) < .08 && !k.cs.fam, { r, lfoP: [p0, k.g[I.lfoP]], fam: k.cs.fam }); }
// R7.6 size caps range
{ const { Sf, k } = mk(11); k.g[0] = .1; k.g[123] = .95; Mo.express(Sf, k); Mo.tap(Sf, k, 1000, k.x, k.y); Mo.tap(Sf, k, 1300, k.x, k.y); Mo.tap(Sf, k, 1600, k.x, k.y); T.run(Sf, 1);
  ok('U11 R7.6 a tiny body caps the pitch range (gene 123 <= .3 + .7 size)', k.g[123] <= .3 + .7 * k.g[0] + 1e-6, { size: k.g[0], range: k.g[123] }); }
// R7.7 fire
{ const { Sf, k } = mk(12), K0 = Mo.SB.K_SHAPE, i0 = k.g[I.inharm]; CS.down(Sf, k, k.x, k.y); T.run(Sf, .4); const early = k.cs.fire; T.run(Sf, 1.1); const mid = CS.fireLevel(k), f1 = k.cs.fire; const r = CS.up(Sf, k);
  ok('U12 R7.7 press + hold still > 0.5 s fires: nothing before, then the level rises (soft -> ceramic)', early === 0 && f1 > .3 && /^fire:/.test(r), { early, f1: +f1.toFixed(2), mid, r });
  CS.down(Sf, k, k.x, k.y); T.run(Sf, 3); const r2 = CS.up(Sf, k); ok('U13 holding longer reaches metal: clangier (inharm), stiffness restored globally, still malleable', r2 === 'fire:metal' && k.g[I.inharm] > i0 && Mo.SB.K_SHAPE === K0 && Mo.drag(Sf, k, line(k.x + Mo.radius(k) * .9, k.y, k.x + Mo.radius(k) * 1.2, k.y, 6, 300).pts, line(0, 0, 1, 1, 6, 300).tm) != null, { r2, inharm: [i0, k.g[I.inharm]] });
  CS.down(Sf, k, k.x, k.y); T.run(Sf, .2); CS.move(Sf, k, k.x + 30, k.y); T.run(Sf, 1); ok('U14 moving the finger never fires', CS.up(Sf, k) === null); }
// R7.8 two-finger tap
{ const { Sf, k } = mk(13), n0 = Sf.creatures.length; const r1 = CS.twoTap(Sf); T.run(Sf, 25); const still = Sf.clay === k; const r2 = CS.twoTap(Sf);
  ok('U15 R7.8 a two-finger tap freezes the ring (25 s later still clay); a second one hatches it (+1 ohm)', r1 === 'clayFreeze' && still && r2 === 'clayConfirm' && !Sf.clay && Sf.creatures.length === n0 + 1, { r1, still, r2, n: [n0, Sf.creatures.length] });
  const { Sf: S2, k: k2 } = mk(14); CS.twoTap(S2); const d = S2.pack(); ok('U16 frozen clay still hatches on save / backgrounding', Mo.hatch(S2, 'hidden') && !S2.clay && !!d, null); }
// R7.10 split = section appendages
{ const { Sf, k } = mk(15), R = Mo.radius(k), n0 = Sf.creatures.length; const rs = []; for (let j = 0; j < 6; j++) { const th = -1 + j * .9, ax = k.x + Math.cos(th) * R, ay = k.y + Math.sin(th) * R, ox = -Math.sin(th) * R * .2, oy = Math.cos(th) * R * .2;
    Mo.twoStart(Sf, [ax + ox, ay + oy], [ax - ox, ay - oy]); rs.push(Mo.twoEnd(Sf, { ratio: 1.05, wc: [k.x + Math.cos(th) * R * 1.9, k.y + Math.sin(th) * R * 1.9] })); }
  ok('U17 R7.10 a rim pinch-and-pull past 1.6 R splits a lump off; cap 5 (the 6th = splitFull)', rs.filter(r => r === 'split').length === 5 && rs[5] === 'splitFull' && k.cs.lumps.length === 5, rs);
  const c = Mo.hatch(Sf, 'tap'); ok('U18 lumps never become ohms: one ohm, carrying sec 5 + its appendage angles', Sf.creatures.length === n0 + 1 && c.sec === 5 && c.lumps.length === 5, { n: [n0, Sf.creatures.length], sec: c.sec });
  const P = c.P.inst && (c.P.inst.P || c.P.inst); ok('U19 the section plays as unison copies inside the ONE voice (uni + detune), saved in the serial', P && P.uni >= .9 && P.sec === 5 && RS.Creature.serial(c).sec === 5, P && { uni: P.uni, sec: P.sec, det: P.det });
  const s = RS.Creature.serial(c), c2 = Sf.loadCreature(s); ok('U20 reload keeps the section', c2 && c2.sec === 5 && c2.lumps && c2.lumps.length === 5 && c2.g.sec === 5, c2 && { sec: c2.sec }); }
{ const { Sf, k } = mk(16), R = Mo.radius(k); Mo.twoStart(Sf, [k.x - R * .5, k.y], [k.x + R * .5, k.y]); Mo.twoMove(Sf, { dAng: Math.PI / 2 }); const v = k.voice, r = Mo.twoEnd(Sf, { ratio: 1, wc: [k.x, k.y] });
  ok('U21 a twist across the middle still steps voices (not a split / point)', /^voice:/.test(r || ''), { r, v }); }
{ const { Sf, k } = mk(20), R = Mo.radius(k), th = .3, ax = k.x + Math.cos(th) * R, ay = k.y + Math.sin(th) * R, ox = -Math.sin(th) * R * .2, oy = Math.cos(th) * R * .2; Mo.twoStart(Sf, [ax + ox, ay + oy], [ax - ox, ay - oy]); Mo.twoEnd(Sf, { ratio: 1, wc: [k.x + Math.cos(th) * R * 1.9, k.y + Math.sin(th) * R * 1.9] });
  const n1 = k.cs.lumps.length, u = Mo.undo(Sf); ok('U25 3-finger undo takes a split lump back (one player fewer)', n1 === 1 && u === 'clayUndo' && k.cs.lumps.length === 0, { n1, u, n: k.cs.lumps.length });
  const L = line(k.x + R * .95, k.y, k.x + R * 1.35, k.y, 8, 420); const p0 = Float32Array.from(k.cs.plx || []); Mo.drag(Sf, k, L.pts, L.tm); const dv = () => k.cs.plx ? Math.max(...Array.from(k.cs.plx, (v, i) => Math.abs(v - (p0[i] || 0)))) : 0, m = dv(); Mo.undo(Sf); const m2 = dv();   /* v0.8b3: measured against the lump's own start shape */
  ok('U26 undo also takes back the kept (plastic) shape', m > 1 && m2 < m * .2, { m: +m.toFixed(1), m2: +m2.toFixed(1) });
  CS.twoTap(Sf); const r = Mo.hatch(Sf, 'tap'); ok('U27 frozen clay ignores a tap-away (a new spiral / background still hatch it)', r === null && Sf.clay === k && Mo.hatch(Sf, 'spiral') && !Sf.clay, null); }
// R7.14 untouched = random, R7.15 feedback, off switch
{ const { Sf, k } = mk(17); const c = Mo.hatch(Sf, 'ring'); ok('U22 R7.14 untouched clay hatches with no family (the genome\'s random voice)', c && !c.clayFam, c && c.clayFam); }
{ const { Sf, k } = mk(18), R = Mo.radius(k); T.notes.length = 0; const L = line(k.x + R * .5, k.y, k.x + R * 1.3, k.y, 6, 160); Mo.drag(Sf, k, L.pts, L.tm); T.run(Sf, .3); ok('U23 R7.15 instant wordless feedback: a touch plays at once and the clay glows', T.notes.length > 0 && k.flash > 0, { notes: T.notes.length, flash: k.flash }); }
{ CS.on = false; const { Sf, k } = mk(19), R = Mo.radius(k); Mo.tap(Sf, k, 1000, k.x, k.y); const L = line(k.x + R * .7, k.y, k.x + R * 2.4, k.y, 20, 1100), r = Mo.drag(Sf, k, L.pts, L.tm); CS.on = true;
  ok('U24 RS.ClayStage.on = false = the v0.8b1 clay (no family, slow pull = limb)', !k.cs || (!k.cs.fam && r === 'limb'), { r, cs: !!k.cs }); }
// R7.3 attack = poke speed (stated to Wilbow ~2:28 PM MDT): a quick jab = a sharp start, a slow press = a soft swell
{ const A = {}; { const { Sf, k } = mk(20), R = Mo.radius(k), L = line(k.x + R * .95, k.y, k.x + R * 1.35, k.y, 6, 70); Mo.drag(Sf, k, L.pts, L.tm); A.jab = [k.g[I.att], k.cs.poke]; }
  { const { Sf, k } = mk(21), R = Mo.radius(k), pts = [], tm = []; for (let i = 0; i < 6; i++) { pts.push([k.x + R * .95, k.y]); tm.push(1000 + i * 60); } for (let i = 1; i <= 8; i++) { pts.push([k.x + R * .95 + i * R * .05, k.y]); tm.push(1300 + i * 90); } Mo.drag(Sf, k, pts, tm); A.press = [k.g[I.att], k.cs.poke]; }
  { const { Sf, k } = mk(22); Mo.tap(Sf, k, 1000, k.x, k.y); A.tap = [k.g[I.att], k.cs.poke]; }
  const att = g => .001 * Math.pow(1000, g) * 1000;
  ok('U25 R7.3 attack = poke speed: a quick jab / tap -> sharp attack, a slow press -> soft swell', A.jab[0] < .3 && A.tap[0] < .3 && A.press[0] > .45 && A.press[1] < A.jab[1], { jabMs: +att(A.jab[0]).toFixed(1), tapMs: +att(A.tap[0]).toFixed(1), pressMs: +att(A.press[0]).toFixed(1), A });
  const h = CS.attackHook; CS.attackHook = null; const { Sf, k } = mk(20), R = Mo.radius(k), g0 = k.g[I.att], L = line(k.x + R * .95, k.y, k.x + R * 1.35, k.y, 6, 70); Mo.drag(Sf, k, L.pts, L.tm); CS.attackHook = h;
  ok('U26 the attack hook stays replaceable (null = the genome\'s own attack, leans aside)', Math.abs(k.g[I.att] - g0) < .2, [g0, k.g[I.att]]); }
const n = res.filter(Boolean).length; console.log('v08u ' + n + '/' + res.length); process.exit(n === res.length ? 0 : 1);
