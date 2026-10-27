// v0.8a O6 browser checks through REAL touch input (CDP): two-stroke glyphs on the surface (hook + '<' = undo, hook + a point = '?' calls the guide,
// a lone hook = a rod after the window) and in the space views ('?' pan + a point on empty space: the camera eases back, the guide sprite, no fly-home).
const { chromium } = require('playwright');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 4, radiusY: 4, force: .5 })) });
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a);
  const drag = async (path, dt = 12, rest = 0) => { await T('touchStart', [path[0]]); for (let i = 1; i < path.length; i++) { await W(dt); await T('touchMove', [path[i]]); } await W(dt + rest); await T('touchEnd', []); };
  const tap = async (x, y) => { await T('touchStart', [[x, y]]); await W(40); await T('touchEnd', []); };
  const fingers = async (pts, hold = 60, wob = 0) => { await T('touchStart', pts); if (wob) { await W(20); await T('touchMove', pts.map(q => [q[0] + wob, q[1] + wob])); } await W(hold); await T('touchEnd', []); await W(200); };
  const spiral = async (cx, cy, R = 55, turns = 3) => { const pts = []; for (let i = 0; i < 90; i++) { const u = i / 89, a = u * turns * 2 * Math.PI, r = R * (.15 + .85 * u); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } await drag(pts, 9); await W(2600); };
  const trace = (id, x, y, s) => E(([id, x, y, s]) => { const tr = RS.Symbols.trace(id, x, y, s)[0], o = []; for (let i = 1; i < tr.length; i++) for (let k = 0; k < 2; k++) o.push([tr[i - 1][0] + (tr[i][0] - tr[i - 1][0]) * k / 2, tr[i - 1][1] + (tr[i][1] - tr[i - 1][1]) * k / 2]); o.push(tr[tr.length - 1]); return o; }, [id, x, y, s]);
  const hookAt = async (id, x, y, s = 70) => { const tr = await trace(id, x, y, s); await drag(tr, 16); await W(60); return tr; };
  await E(() => { for (const c of RSAPP.Sf.creatures) c.breedCool = 1e9; });
  const findSpot = () => E(() => { const S = RSAPP.Sf; for (let yy = .22; yy < .5; yy += .04) for (let xx = .3; xx < .75; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y); if (!S.creatures.some(c => Math.hypot(c.x - w[0], c.y - w[1]) < 180)) { const h = S.hit(w[0], w[1]); if (!h.body && !h.creature) return [x, y]; } } return [206, 300]; });
  const N = () => E(() => RSAPP.Sf.creatures.length);
  // 0.8a8 (Wilbow 11:41 'Make sure the helper is there and available with question mark gesture'): '?' DURING the egg lessons; the guide arrives within 3 s
  const gdist = w => E(w => { const g = RS.Guide.guide(RSAPP.Sf); return g ? Math.round(Math.hypot(g.x - w[0], g.y - w[1])) : -1; }, w), toW = (x, y) => E(([x, y]) => RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y), [x, y]);
  const qmark = async () => { const sp = await findSpot(); const tr = await hookAt('question', sp[0], sp[1]); const e = tr[tr.length - 1], y1 = Math.max(...tr.map(q => q[1])); const held = await E(() => !!RSAPP.Sf.glyphHold); await tap(e[0], y1 + 22); await W(80); const w = await toW(e[0], y1 + 22); return { held, w, lt: await E(() => RSAPP.lastTap && RSAPP.lastTap.id), how: await E(() => RSAPP.lastTap && RSAPP.lastTap.res && RSAPP.lastTap.res.how) }; };
  { const egg = await E(() => RS.Guide.eggPending(RSAPP.Sf)); await E(() => { const g = RS.Guide.guide(RSAPP.Sf); if (g) RS.Guide.shift(RSAPP.Sf, g, 900, 0); });   // the guide far off-screen
    const q = await qmark(); await W(2900); const d = await gdist(q.w);
    ok('Q8 (0.8a8) "?" works DURING the egg lessons: the hook is held, the guide is called and is within 80 px of the point 3 s later', egg && q.held && q.lt === 'question' && d >= 0 && d < 80, { egg, ...q, d }); }
  { await E(() => { const S = RSAPP.Sf, g = RS.Guide.guide(S); if (g) S.removeCreature(g); }); const gone = await E(() => !RS.Guide.guide(RSAPP.Sf)); const q = await qmark(); await W(600); const d = await gdist(q.w);
    ok('Q8 (0.8a8) guide deleted -> "?" re-hatches it beside the point', gone && q.how === 'hatch' && d >= 0 && d < 120, { gone, ...q, d }); }
  await E(() => { const st = RS.Guide.state(RSAPP.Sf); st.egg = RS.Guide.EGG.length; const g = RS.Guide.guide(RSAPP.Sf); if (g) { g.summon = null; RS.Guide.shift(RSAPP.Sf, g, 900, 0); } }); await W(400);   // the called guide now hovers AT the point: move it off so it doesn't catch the next touches   // past the egg lessons for the rest
  // surface: spiral, then hook + '<' undoes it
  { const n0 = await N(), sp = await findSpot(); await spiral(sp[0], sp[1]); const n1 = await N(); const s2 = await findSpot(); const tr = await hookAt('undo', s2[0], s2[1]); const held = await E(() => !!RSAPP.Sf.glyphHold); const e = tr[tr.length - 1];
    await drag([[e[0] + 22, e[1] - 18], [e[0] + 11, e[1] - 9], [e[0], e[1]], [e[0] + 11, e[1] + 9], [e[0] + 22, e[1] + 18]], 20); await W(300); const n2 = await N(), ls = await E(() => RSAPP.lastStroke && RSAPP.lastStroke.id);
    ok('O6 surface: a hook is held; hook + "<" (drawn by touch) undoes the last spiral', n1 === n0 + 1 && held && n2 === n0 && ls === 'undo', { n0, n1, n2, held, ls }); }
  // surface: hook + a tap under it = '?': the guide comes (re-hatched if none)
  { const sp = await findSpot(); const tr = await hookAt('question', sp[0], sp[1]); const e = tr[tr.length - 1], y1 = Math.max(...tr.map(q => q[1])); await tap(e[0], y1 + 22); await W(500);
    const r = await E(() => ({ lt: RSAPP.lastTap && RSAPP.lastTap.id, how: RSAPP.lastTap && RSAPP.lastTap.res && RSAPP.lastTap.res.how, g: !!RS.Guide.guide(RSAPP.Sf), lvl: RSAPP.level }));
    ok('O6 surface: hook + a tap under it = "?": the guide is called (no double-tap side effect)', r.lt === 'question' && r.g && r.lvl === 'surface', r); }
  // surface (v0.8b1 R3, supersedes Q103): a lone hook becomes INK after the glyph window; retracing that ink makes a piece; the 3-finger tap undoes it
  await E(() => { const g = RS.Guide.guide(RSAPP.Sf); if (g) { g.summon = null; RS.Guide.shift(RSAPP.Sf, g, 900, 0); } }); await W(400);   // 0.8a8: the called guide hovers at the point; move it off
  { const sp = await findSpot(); const tr = await hookAt('undo', sp[0], sp[1]); const h1 = await E(() => !!RSAPP.Sf.glyphHold); await W(1350); const r = await E(() => ({ h: !!RSAPP.Sf.glyphHold, k: RSAPP.Sf.lastHold && RSAPP.Sf.lastHold.k, rk: RSAPP.Sf.lastHold && RSAPP.Sf.lastHold.r && RSAPP.Sf.lastHold.r.k, ink: (RSAPP.Sf.inkPend || []).length, u: RSAPP.Sf.undo.length }));
    await drag(tr.map(q => [q[0] + 3, q[1] - 2]), 10); await W(250); const rt = await E(() => ({ lt: RSAPP.lastStroke && RSAPP.lastStroke.retrace, u: RSAPP.Sf.undo.length }));
    await fingers([[100, 620], [170, 620], [135, 680]], 80, 12); const u2 = await E(() => RSAPP.Sf.undo.length);
    ok('O6 surface: a lone hook is held, then becomes ink (not a rod); retracing it makes a piece; the 3-finger tap undoes it', h1 && !r.h && r.rk === 'ink' && r.ink >= 1 && rt.lt === true && rt.u === r.u + 1 && u2 === r.u, { h1, ...r, rt, u2 }); }
  // galaxy: '?' pan + a tap on empty space under it: camera eases back (300 ms), the guide sprite, no fly-home
  { await E(() => { RSAPP.go('galaxy'); }); await W(900); const gsp = await E(() => { for (let yy = .2; yy < .7; yy += .03) for (let xx = .25; xx < .75; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy; let clear = true; for (let dy = -60; dy <= 160 && clear; dy += 10) for (let dx = -60; dx <= 60 && clear; dx += 10) if (RSAPP.starAt(x + dx, y + dy) || RSAPP.smudgeAt(x + dx, y + dy) != null) clear = false; if (clear) return [x, y]; } return [206, 330]; }); const pts = await trace('question', gsp[0], gsp[1], 120); const c0 = await E(() => ({ ...RSAPP.gcam })); await drag(pts, 16); await W(80);
    const moved = await E(c0 => Math.hypot(RSAPP.gcam.x - c0.x, RSAPP.gcam.y - c0.y), c0); const e = pts[pts.length - 1], y1 = Math.max(...pts.map(q => q[1]));
    const empty = await E(([x, y]) => !RSAPP.starAt(x, y) && RSAPP.smudgeAt(x, y) == null, [e[0], y1 + 30]); await tap(e[0], y1 + 30); await W(120); const fl = await E(() => RSAPP.fly && RSAPP.fly.dur); await W(400);
    const r = await E(c0 => ({ back: Math.hypot(RSAPP.gcam.x - c0.x, RSAPP.gcam.y - c0.y), spr: !!RSAPP.qSprite, lvl: RSAPP.level }), c0);
    ok('O6 galaxy: a "?" pan + a tap under it on empty space eases the camera back (300 ms) and shows the guide sprite; no fly-home', empty && (moved > 0 && fl === 300 && r.back < 1e-6 && r.spr && r.lvl === 'galaxy'), { empty, moved, fl, ...r }); }
  // system: a '?' stroke off the bodies + a tap under it = sprite; a tap on a body is a normal tap
  { await E(() => { RSAPP.qSprite = null; RSAPP.sysI = 0; RSAPP.scam = { z: 1, x: 0, y: 0 }; RSAPP.go('system'); }); await W(900); const spot = await E(() => { for (let yy = .15; yy < .8; yy += .03) for (let xx = .15; xx < .8; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy; let clear = true; for (let dy = -90; dy <= 120 && clear; dy += 15) for (let dx = -60; dx <= 60 && clear; dx += 15) if (RSAPP.bodyAt(x + dx, y + dy)) clear = false; if (clear) return [x, y]; } return null; });
    let r = { spot }; if (spot) { const pts = await trace('question', spot[0], spot[1], 110); await drag(pts, 16); await W(80); const e = pts[pts.length - 1], y1 = Math.max(...pts.map(q => q[1])); await tap(e[0], y1 + 22); await W(200); r = await E(() => ({ spr: !!RSAPP.qSprite, lvl: RSAPP.level })); }
    ok('O6 system: a "?" stroke off the bodies + a tap under it shows the guide sprite (stays in the system view)', spot && r.spr && r.lvl === 'system', r); }
  ok('no page errors', !errs.length, errs.slice(0, 3));
  console.log(`pw_glyph ${res.filter(Boolean).length}/${res.length}`); await b.close(); })();
