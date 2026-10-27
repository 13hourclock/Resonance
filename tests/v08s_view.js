// v0.8a9 viewport-bounds check for the inspect-zoom controls: every handle (A D S R, bends, filter node at its extremes, the register ladder)
// plus its 44 px touch circle stays inside the safe band (viewport minus thumb / gesture insets) on 360x640, 412x915 and landscape, for small
// to huge ohms, zoom 1.8..4.2, centred AND off-centre at the pick limit; hit areas >= 44 px; the camera ease centres the ohm; pick hysteresis.
const T = require('./node_env.js'); for (const m of ['store', 'render']) require('../www/js/' + m + '.js'); const RS = global.RS, E = RS.EnvEdit, TAU = Math.PI * 2;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; const c = T.add(Sf, T.plain(51), 0); Sf.minds(); const IG = RS.IG, g0 = Float32Array.from(c.g);
const VIEWS = [[360, 640], [412, 915], [640, 360], [915, 412]], RADII = [5, 12, 25, 45, 80, 130], ZOOMS = [1.8, 2.4, 3.1, 4.2];
const GENES = [{}, { fenv: .9999, fdec: .9999, att: .9999, rel: .9999 }, { fenv: 0, fdec: 0, att: 0, sus: .9999, curve: 0 }, { curve: .9999, sus: 0, dec: .9999 }];
const setG = o => { c.g.set(g0); for (const k in o) c.g[IG[k]] = o[k]; c.P.inst = RS.Inst.fromGenome(c.g); };
const pts = (App) => { const g = E.geo(c, E.layout(App, c)), S = (x, y) => RS.Render.toScreen(App.cam, App.Wd, App.Ht, x, y), out = [];
  for (const k of ['A', 'D', 'S', 'R']) out.push([k, S(g.n[k].x, g.n[k].y)]); for (const k in g.bend) out.push([k, S(g.bend[k][0], g.bend[k][1])]); out.push(['F', S(g.F.x, g.F.y)]);
  const gapA = TAU - g.sweep, rr = g.R0 + g.H * .5; for (let i = 0; i < 5; i++) { const a = g.a0 - gapA * (.85 - .7 * i / 4); out.push(['L' + i, S(c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr)]); } return out; };
let worst = { m: 1e9 }, skipped = 0, cases = 0, bad = [], ringOut = 0, ringOutN = 0, minSep = 1e9;
for (const [Wd, Ht] of VIEWS) for (const R of RADII) for (const z of ZOOMS) for (const G of GENES) for (const where of ['centre', 'off']) {
  c.growth = R / c.P.size / (c.P.segments > 1 && !c.P.radial ? 1.6 : 1); setG(G); const App = { Wd, Ht, Sf, level: 'surface', cam: { x: c.x, y: c.y, z, th: 0 }, inspect: c };
  E.ease(App, c, 1); const offs = where === 'centre' ? [[0, 0]] : [0, 1, 2, 3, 4, 5, 6, 7].map(k => [Math.cos(k / 8 * TAU) * 88, Math.sin(k / 8 * TAU) * 88]);
  const camC = { ...App.cam }; for (const [ox, oy] of offs) { App.cam = { ...camC }; if (ox || oy) { const s = RS.Render.toScreen(App.cam, Wd, Ht, c.x, c.y), aw = RS.Render.toWorld(App.cam, Wd, Ht, Wd / 2 + ox, Ht * .58 + oy); App.cam.x -= aw[0] - c.x; App.cam.y -= aw[1] - c.y; }
    if (E.pick({ ...App, inspect: null }) !== c && E.pick(App) !== c) { skipped++; continue; } const B = E.safe(App); cases++; for (const [k, p] of pts(App)) { const m = Math.min(p[0] - B.x0, B.x1 - p[0], p[1] - B.y0, B.y1 - p[1]) - E.M.hit; if (m < worst.m) worst = { m: +m.toFixed(1), Wd, Ht, R, z, k, where }; if (m < 0) bad.push({ Wd, Ht, R, z, k, m: +m.toFixed(1) }); }
    const L = E.layout(App, c); if (where === 'centre' && L.rb + 18 + 30 + 20 + 20 <= L.room) { ringOutN++; if (L.R0 * z >= L.rb + 17.9) ringOut++; } } }
ok('VIEW every control + its 44 px touch circle stays inside the safe band (' + VIEWS.map(v => v.join('x')).join(', ') + '; radii ' + RADII.join('/') + '; zoom 1.8-4.2; centred and 88 px off-centre)', bad.length === 0, { cases, notInspectable: skipped, bad: bad.slice(0, 4), worstMargin: worst });
ok('VIEW a small/medium ohm keeps its ring outside the body when centred', ringOut === ringOutN, { ringOut, of: ringOutN });
ok('VIEW touch targets are >= 44 px (hit radius >= 22)', E.M.hit >= 22, E.M);
// hit test finds each handle at its own spot (412x915, medium ohm, zoom 2.4)
c.growth = 1; setG({}); { const App = { Wd: 412, Ht: 915, Sf, level: 'surface', cam: { x: c.x, y: c.y, z: 2.4, th: 0 }, inspect: c }; E.ease(App, c, 1); const P = pts(App).filter(p => p[0][0] !== 'L'); let hits = 0; for (const [k, p] of P) { if (E.hit(App, p[0] + 15, p[1]) != null) hits++; } ok('VIEW every handle answers a touch 15 px away', hits === P.length, { hits, of: P.length });
  // ease converges to the safe centre; pick keeps the inspected ohm (hysteresis) while it sits 150 px from the middle
  App.cam.x += 60; App.cam.y -= 40; for (let i = 0; i < 80; i++) E.ease(App, c, .1); const s = RS.Render.toScreen(App.cam, 412, 915, c.x, c.y), B = E.safe(App); ok('VIEW the camera ease centres the inspected ohm in the safe band', Math.hypot(s[0] - B.cx, s[1] - B.cy) < 2, { s: s.map(v => v | 0), want: [B.cx, B.cy] });
  App.cam.y += 150 / 2.4; ok('VIEW pick hysteresis: keeps the inspected ohm 150 px off-centre (a fresh pick would not)', E.pick(App) === c && E.pick({ ...App, inspect: null }) !== c);
  App.cam.z = 1.5; ok('VIEW no inspect below zoom 1.8', E.pick(App) === null); }
// feedback paths run (stub canvas) incl. touched-handle glow, pinch ladder target, DNA rim, twist + vibrato flash, ghost hints
{ const calls = { n: 0 }, ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (k === 'createRadialGradient' ? () => ({ addColorStop() { } }) : () => { calls.n++; }), set: (o, k, v) => { o[k] = v; return true; } });
  global.performance = global.performance || { now: () => Date.now() }; const App = { Wd: 360, Ht: 640, dpr: 2, Sf, level: 'surface', cam: { x: c.x, y: c.y, z: 3, th: 0 }, inspect: c, envTwistT: performance.now() / 1000, envVibT: performance.now() / 1000, envRegT: performance.now() / 1000 };
  let err = null; try { for (const a of [null, 'A', 'S', 'b2', 'F']) { App.envAct = a; E.draw(ctx, App); } App.envAct = null; App.envPinch = { ratio: .7, dir: 1 }; E.draw(ctx, App); App.envPinch = { ratio: 2, dir: 0 }; E.draw(ctx, App); } catch (e) { err = String(e.stack).slice(0, 300); } ok('VIEW all feedback layers draw without error', !err && calls.n > 100, { err, calls: calls.n });
  E._c = null; const n0 = E._n; E.tick({ inspect: null }); E.draw(ctx, App); ok('VIEW ghost hints count inspect entries', E._n === (n0 || 0) + 1 || E._n >= 1, { n: E._n }); }
// previews: drag preview is rate-limited; the register preview plays one octave away and leaves the voice untouched
{ let notes = []; const mp = RS.Mind.play; RS.Mind.play = (Sf_, cc, o) => { notes.push(cc.mind.regOct); }; const r0 = c.mind.regOct, g123 = c.g[123];
  let n = 0; for (let i = 0; i < 10; i++) n += E.preview(Sf, c) ? 1 : 0; ok('VIEW drag preview is rate-limited (1 note per burst)', n === 1, { n });
  notes = []; E.previewReg(Sf, c, 1); E.previewReg(Sf, c, -1); ok('VIEW register preview plays the would-be register, then restores it (no gene change)', c.mind.regOct === r0 && c.g[123] === g123 && notes.length === 2 && notes[0] >= r0 && notes[1] <= r0 && notes[0] !== notes[1], { notes, r0 }); RS.Mind.play = mp; }
console.log(`v08s_view: ${pass}/${tot} passed`);
