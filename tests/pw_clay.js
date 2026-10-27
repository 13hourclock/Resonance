// v0.3.2 browser check of the CLAY shaping window through REAL touch input (CDP touch events into the shipped app): gestures 4-14 of the
// approved spec, the conflict rules (fingers that START on the clay shape it; everything off the clay behaves as before), and backgrounding.
const { chromium } = require('playwright');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 4, radiusY: 4, force: q[2] == null ? .5 : q[2] })) });
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a);
  const tap = async (x, y) => { await T('touchStart', [[x, y]]); await W(40); await T('touchEnd', []); };
  const drag = async (path, dt = 12, rest = 0) => { await T('touchStart', [path[0]]); for (let i = 1; i < path.length; i++) { await W(dt); await T('touchMove', [path[i]]); } await W(dt + rest); await T('touchEnd', []); };   /* v0.6.2: rest = finger held still before lifting */
  const line = (a, b, n = 12) => Array.from({ length: n + 1 }, (_, i) => [a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]);
  const two = async (fa, fb, n = 10, dt = 16) => { await T('touchStart', [fa(0), fb(0)]); for (let i = 1; i <= n; i++) { await W(dt); await T('touchMove', [fa(i / n), fb(i / n)]); } await W(dt); await T('touchEnd', []); };
  const spiral = async (cx, cy, R = 55, turns = 3, hold = true) => { const pts = []; for (let i = 0; i < 90; i++) { const u = i / 89, a = u * turns * 2 * Math.PI, r = R * (.15 + .85 * u); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } await drag(pts, 9, hold ? 650 : 0); await W(150); return E(() => RSAPP.lastStroke && RSAPP.lastStroke.k); };
  // spy on sounds (lane), Sf.hold (listen) and Sf.tap (join / mute / chirp)
  await E(() => { const S = RSAPP.Sf; window.__lanes = []; const pl = S.play; S.play = (sp, w, x, y) => { window.__lanes.push(sp && sp.lane); return pl(sp, w, x, y); }; window.__hold = 0; const h = S.hold; S.hold = (...a) => { window.__hold++; return h(...a); }; window.__tap = 0; const tp = S.tap; S.tap = (...a) => { window.__tap++; return tp(...a); }; const jt = S.jamTap; if (jt) S.jamTap = (...a) => { window.__tap++; return jt(...a); }; });
  // an empty spot in the sky
  const findSpot = () => E(() => { const S = RSAPP.Sf; for (let yy = .22; yy < .5; yy += .04) for (let xx = .3; xx < .75; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y); if (!S.creatures.some(c => Math.hypot(c.x - w[0], c.y - w[1]) < 140)) { const h = S.hit(w[0], w[1]); if (!h.body && !h.creature) return [x, y]; } } return [RSAPP.Wd / 2, RSAPP.Ht * .3]; }); const spot = await findSpot();
  const away = () => E(() => { const S = RSAPP.Sf, k = S.clay; for (let yy = .15; yy < .6; yy += .03) for (let xx = .15; xx < .85; xx += .04) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y); if ((!k || Math.hypot(k.x - w[0], k.y - w[1]) > 220) && !S.creatures.some(c => Math.hypot(c.x - w[0], c.y - w[1]) < 140)) { const h = S.hit(w[0], w[1]); if (!h.body && !h.creature) return [x, y]; } } return null; });
  const clay = () => E(() => { const S = RSAPP.Sf, k = S.clay; if (!k) return null; const s = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, k.x, k.y); return { x: s[0], y: s[1], R: RS.Mold.radius(k) * RSAPP.cam.z, code: RS.Genome.toCode(k.g), left: k.left, age: k.age, voice: k.voice, limbs: k.P.limbs, size: k.g[0], phrases: k.phrases || 0, jig: k.jig, col: k.col.join(','), hist: k.hist.length, rhythm: k.rhythm || null, d: Array.from(k.g.slice(115, 123)).map(v => +v.toFixed(3)), clicks: k.clicks || 0 }; });
  await E(() => { for (const c of RSAPP.Sf.creatures) c.breedCool = 1e9; });   /* v0.3.2: no breeding during the window checks (a newborn shifted the counts) */
  const n0 = await E(() => RSAPP.Sf.creatures.length);
  const k1 = await spiral(spot[0], spot[1]); let c = await clay();
  ok('B1 a spiral spawns a glowing clay lump (not yet an ohm) with the closing ring', k1 === 'clay' && c && (await E(() => RSAPP.Sf.creatures.length)) === n0, { k1, c: c && { R: c.R, left: c.left, voice: c.voice } });
  ok('B3/B10 the clay sounds its first phrase in its spiral-derived voice', c && c.phrases >= 1 && (await E(() => window.__lanes.filter(l => l === 'clay').length)) >= 1, c && c.voice);
  // 4 edge push / pull
  let pre = c; await W(1200); const leftBefore = (await clay()).left; await drag(line([c.x + c.R * .85, c.y], [c.x + c.R * 1.45, c.y], 8)); await W(120); c = await clay();
  ok('B4 one-finger pull of the edge reshapes the outline and timbre (and resets the ring)', (await E(() => RSAPP.lastClay)) === 'shape' && c.code !== pre.code && c.left > leftBefore, { lastClay: await E(() => RSAPP.lastClay), leftBefore, left: c.left });
  ok('B10 after the touch: a short phrase in its voice, the body jiggles', c.phrases > pre.phrases && c.jig > .2, { phrases: c.phrases, jig: c.jig });
  // 5 strand -> limb
  if (c.limbs >= 7) { await E(() => { const k = RSAPP.Sf.clay; k.g[4] = .3; RS.Mold.express(RSAPP.Sf, k); return 1; }); c = await clay(); }
  pre = c; await drag(line([c.x, c.y - c.R * .8], [c.x, c.y - c.R * 2.8], 12)); await W(120); c = await clay();
  ok('B5 dragging a strand outward from the edge grows a limb', (await E(() => RSAPP.lastClay)) === 'limb' && c.limbs > pre.limbs, { from: pre.limbs, to: c.limbs });
  // 6 pinch (no camera zoom)
  pre = c; const z0 = await E(() => RSAPP.cam.z); await two(u => [c.x - c.R * (.35 + .5 * u), c.y], u => [c.x + c.R * (.35 + .5 * u), c.y]); await W(150); c = await clay(); const z1 = await E(() => RSAPP.cam.z);
  ok('B6 pinch on the clay = overall size + register (the camera does not zoom)', (await E(() => RSAPP.lastClay)) === 'grow' && c.size > pre.size && Math.abs(z1 - z0) < 1e-6, { size: [pre.size, c.size], z: [z0, z1] });
  // 7 twist -> voice steps with clicks; the DAW twist does not fire
  pre = c; const rr = c.R * .5; await two(u => [c.x - rr * Math.cos(u * 1.5), c.y - rr * Math.sin(u * 1.5)], u => [c.x + rr * Math.cos(u * 1.5), c.y + rr * Math.sin(u * 1.5)], 14); await W(150); c = await clay();
  const daw = await E(() => !!(RSAPP.daw && RSAPP.daw.open));
  ok('B7 twist on the clay steps through instrument voices with a soft click per step (no DAW river)', c.voice !== pre.voice && c.clicks - pre.clicks >= 2 && !daw && /^voice:/.test(await E(() => RSAPP.lastClay)), { from: pre.voice, to: c.voice, clicks: c.clicks - pre.clicks, daw });
  ok('B10 colour tracks the sound (the twist changed its colour)', c.col !== pre.col, [pre.col, c.col]);
  // 8 scribble
  pre = c; const scr = []; for (let i = 0; i < 9; i++) scr.push([c.x + (i % 2 ? .5 : -.5) * c.R, c.y + (i - 4) * c.R * .05]); await drag(scr.flatMap((q, i) => i ? line(scr[i - 1], q, 4).slice(1) : [q]), 10); await W(120); c = await clay();
  const rough = await E(() => { const g = RSAPP.Sf.clay.g, I = RS.IG; return g[I.fold] + g[I.noise]; });
  ok('B8 scribbling back and forth on it raises texture roughness', (await E(() => RSAPP.lastClay)) === 'rough' && c.code !== pre.code, { rough });
  // 9 + 12 tap rhythm; no join / mute / chirp
  pre = c; const tap0 = await E(() => window.__tap); for (const gap of [0, 220, 220, 440, 220]) { if (gap) await W(gap); await tap(c.x, c.y); } await W(1100); c = await clay();
  ok('B9 tapping a rhythm on it sets the motif rhythm genes (115-122)', c.rhythm && c.rhythm.length >= 3 && JSON.stringify(c.d) !== JSON.stringify(pre.d), { rhythm: c.rhythm, d: c.d });
  ok('B12 a tap on the clay never triggers join, mute or chirp', (await E(() => window.__tap)) === tap0, { taps: (await E(() => window.__tap)) - tap0 });
  // 12 tap-then-hold / hold-to-listen ignore the clay
  const h0 = await E(() => window.__hold); await tap(c.x, c.y); await W(120); await T('touchStart', [[c.x, c.y]]); await W(700); const playOn = await E(() => !!RSAPP.play); await T('touchEnd', []); await W(200);
  await T('touchStart', [[c.x + 2, c.y + 2]]); await W(800); await T('touchEnd', []); await W(200);
  ok('B12 tap-then-hold (play mode) and hold-to-listen ignore the clay', !playOn && (await E(() => window.__hold)) === h0, { playOn, holds: (await E(() => window.__hold)) - h0 });
  // 12 a big pinch on the clay does not open the DNA view
  c = await clay(); await two(u => [c.x - c.R * (.3 + 1.2 * u), c.y], u => [c.x + c.R * (.3 + 1.2 * u), c.y]); await W(200);
  ok('B12 the DNA entry ignores the clay (a big pinch on it only grows it)', (await E(() => RSAPP.level)) === 'surface' && !!(await clay()), await E(() => RSAPP.lastClay));
  // 14 ink across the clay does not strum it (and a loop around it does not catch it)
  c = await clay(); const lanes0 = await E(() => window.__lanes.length); await drag(line([c.x - c.R * 3, c.y + c.R * 2.6], [c.x + c.R * 3, c.y - c.R * 2.6], 16).map((q, i) => i === 0 ? q : q), 10); await W(120);
  const crossed = await E(n => window.__lanes.slice(n).filter(l => l === 'clay').length, lanes0); c = await clay();
  ok('B14 ink crossing the clay does not strum it', crossed === 0 && !!c, { crossed });
  // 13 two-finger tap = undo one shaping step
  await drag(line([c.x - c.R * .85, c.y], [c.x - c.R * 1.4, c.y], 8)); await W(150); c = await clay();
  pre = c; await T('touchStart', [[spot[0] - 120, spot[1] + 200], [spot[0] - 60, spot[1] + 200], [spot[0] - 90, spot[1] + 240]]);   /* v0.7 C: three-finger tap = undo */ await W(60); await T('touchEnd', []); await W(200); c = await clay();
  ok('B13 a three-finger tap during the window undoes the last shaping step', (await E(() => RSAPP.lastClay)) === 'clayUndo' && c.hist === pre.hist - 1 && c.code !== pre.code && (await E(() => RSAPP.Sf.creatures.length)) === n0, { hist: [pre.hist, c.hist] });
  // 11 off the clay everything is unchanged: pinch zooms the camera, a 90-degree twist opens the river (and back)
  const za = await E(() => RSAPP.cam.z), [ox, oy] = await away(); await two(u => [ox - 20 - 30 * u, oy], u => [ox + 20 + 30 * u, oy]); await W(150); const zb = await E(() => RSAPP.cam.z);
  ok('B11 off the clay a pinch still zooms the camera', zb > za * 1.2 && !!(await clay()), { za, zb }); await E(z => { RSAPP.cam.z = z; }, za);
  const tw = async dir => two(u => [206 - 60 * Math.cos(dir * u * 1.6), 700 - 60 * Math.sin(dir * u * 1.6)], u => [206 + 60 * Math.cos(dir * u * 1.6), 700 + 60 * Math.sin(dir * u * 1.6)], 14);
  await E(() => { RSAPP.Sf.clay.left = 8; RSAPP.Sf.clay.age = 0; }); await tw(1); await W(200); const dOpen = await E(() => !!(RSAPP.daw && RSAPP.daw.open)); await tw(-1); await W(300);
  ok('B11 off the clay the DAW twist still opens (and closes) the river', dOpen && !(await E(() => RSAPP.daw.open)), { dOpen });
  // 2 tap on empty space hatches now -> a normal ohm; 13 after the hatch, undo removes the spawn (one entry)
  await E(() => { const k = RSAPP.Sf.clay; if (k) { k.left = 8; } }); c = await clay(); const voiceAt = c && c.voice, codeAt = c && c.code;
  await tap(spot[0] + 150 > 400 ? spot[0] - 150 : spot[0] + 150, spot[1] + 40); await W(250);
  const h1 = await E(() => ({ clay: !!RSAPP.Sf.clay, last: RSAPP.Sf.lastHatch, n: RSAPP.Sf.creatures.length, lt: RSAPP.lastTap, code: (RSAPP.Sf.creatures.find(q => q.id === (RSAPP.Sf.lastHatch || {}).id) || {}).g ? RS.Genome.toCode(RSAPP.Sf.creatures.find(q => q.id === RSAPP.Sf.lastHatch.id).g) : null }));
  ok('B2 a tap on empty space hatches it immediately into a normal ohm with the shaped genome', !h1.clay && h1.last && h1.last.why === 'tap' && h1.n === n0 + 1 && h1.code === codeAt, { why: h1.last && h1.last.why, n: h1.n - n0, same: h1.code === codeAt, voiceAt });
  await T('touchStart', [[100, 600], [160, 600], [130, 640]]); await W(60); await T('touchEnd', []); await W(250);
  ok('B13 after the hatch, one undo removes the spawn', (await E(() => RSAPP.Sf.creatures.length)) === n0, await E(() => RSAPP.Sf.creatures.length) - n0);
  // ring closes: hatch after ~8 s untouched; touches cap at ~20 s
  let sp2 = await findSpot(); await spiral(sp2[0], sp2[1]); await W(8600); ok('B2 left alone, it hatches when the ring closes (~8 s)', !(await clay()) && (await E(() => RSAPP.Sf.lastHatch.why)) === 'ring', await E(() => RSAPP.Sf.lastHatch));
  sp2 = await findSpot(); await spiral(sp2[0], sp2[1]); const tq = Date.now(); for (let i = 0; i < 30 && await clay(); i++) { c = await clay(); await tap(c.x, c.y); await W(780); }
  const capT = (Date.now() - tq) / 1000; ok('B1 touches keep it open but the total window is capped (~20 s)', !(await clay()) && capT < 23 && capT > 17, { capT, why: await E(() => RSAPP.Sf.lastHatch.why) });
  // 14 a new spiral hatches the current clay first
  await E(() => { const S = RSAPP.Sf, f = S.stroke; RSAPP.__sk = []; S.stroke = function () { const r = f.apply(this, arguments); RSAPP.__sk.push(r && (r.k || r.kind || JSON.stringify(r).slice(0, 60))); return r; }; }); sp2 = await findSpot(); await spiral(sp2[0], sp2[1]); const m0 = await E(() => RSAPP.Sf.creatures.length); await E(() => { RSAPP.Sf.clay && (RSAPP.Sf.__cx = RSAPP.Sf.clay.x); }); const sp3 = await away(); await spiral(sp3[0], sp3[1]);
  ok('B14 a new spiral hatches the current clay first', (await E(() => RSAPP.Sf.lastHatch.why)) === 'spiral' && (await E(() => RSAPP.Sf.creatures.length)) === m0 + 1 && !!(await clay()), await E(() => ({ last: RSAPP.Sf.lastHatch && RSAPP.Sf.lastHatch.why, dn: RSAPP.Sf.creatures.length, clay: !!RSAPP.Sf.clay, sk: RSAPP.__sk }))); console.log("  spots", sp2, sp3);
  // backgrounding hatches it safely (and saves)
  await E(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); });
  ok('B backgrounding the app hatches the clay as shaped', !(await clay()) && (await E(() => RSAPP.Sf.lastHatch.why)) === 'background');
  // v0.8b2 R7 through real touch: still hold = fire, two-finger tap = freeze then confirm, a first flick picks a family
  if (await E(() => !!RS.ClayStage)) { const spr = await findSpot(); await spiral(spr[0], spr[1], 55, 3, true); await W(300); let c = await clay();
    if (!c) ok('R7 clay for the stage checks', false); else {
      await drag([[c.x + c.R * .4, c.y], [c.x + c.R * .8, c.y - 2], [c.x + c.R * 1.2, c.y - 3], [c.x + c.R * 1.5, c.y - 4]], 20); await W(250);
      const fam = await E(() => RSAPP.Sf.clay && RSAPP.Sf.clay.cs && RSAPP.Sf.clay.cs.fam); ok('R7.1 a first quick flick on the clay picks the plucked family', fam === 'plucked', { fam, last: await E(() => RSAPP.lastClay) });
      c = await clay(); await T('touchStart', [[c.x, c.y]]); await W(1300); await T('touchEnd', []); await W(200);
      const fl = await E(() => RSAPP.lastClay), plays = await E(() => !!RSAPP.play); ok('R7.7 a still hold inside the clay fires it (no play mode, no listen)', /^fire:/.test(fl || '') && !plays, { fl, plays });
      c = await clay(); const tt = async () => { await T('touchStart', [[c.x - c.R * .3, c.y], [c.x + c.R * .3, c.y]]); await W(70); await T('touchEnd', []); await W(250); };
      await tt(); const fr = await E(() => ({ last: RSAPP.lastClay, frozen: !!(RSAPP.Sf.clay && RSAPP.Sf.clay.cs.frozen) })); await W(1500); const still = !!(await clay());
      await tt(); const cf = await E(() => ({ last: RSAPP.lastClay, clay: !!RSAPP.Sf.clay, why: RSAPP.Sf.lastHatch && RSAPP.Sf.lastHatch.why }));
      ok('R7.8 a two-finger tap on the clay freezes the ring; a second one hatches it', fr.last === 'clayFreeze' && fr.frozen && still && cf.last === 'clayConfirm' && !cf.clay, { fr, cf });
      const lastC = await E(() => { const c = RSAPP.Sf.creatures[RSAPP.Sf.creatures.length - 1]; return c && { fam: c.clayFam, fired: c.fired }; }); ok('R7 the hatched ohm keeps its family and firing', lastC && lastC.fam === 'plucked' && !!lastC.fired, lastC); } }
  // v0.6.2 quick spawn: a plain spiral (lifted without resting) hatches an ohm at once, no clay
  { const q0 = await E(() => RSAPP.Sf.creatures.length), spq = await findSpot(), kq = await spiral(spq[0], spq[1], 55, 3, false); await W(2400); const q1 = await E(() => RSAPP.Sf.creatures.length);   /* v0.7 A: a plain spiral now lays the word egg (~1.5 s window); no stroke -> the quick ohm hatches */
    ok('Q1 a plain spiral hatches an ohm quickly (v0.7: via the egg window, no clay, no ring)', (kq === 'egg' || kq === 'creature') && !(await clay()) && q1 === q0 + 1 && (await E(() => RSAPP.Sf.lastHatch.why)) === 'quick', { kq, q0, q1 }); }
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); const pass = res.filter(Boolean).length; console.log(`\n${pass}/${res.length} pass`); process.exit(pass === res.length ? 0 : 1); })();
