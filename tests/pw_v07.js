// v0.7 browser checks through REAL touch input (CDP): C undo/redo remap (+ later: egg words, conducting).
const { chromium } = require('playwright');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 4, radiusY: 4, force: .5 })) });
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a);
  const drag = async (path, dt = 12, rest = 0) => { await T('touchStart', [path[0]]); for (let i = 1; i < path.length; i++) { await W(dt); await T('touchMove', [path[i]]); } await W(dt + rest); await T('touchEnd', []); };
  const fingers = async (pts, hold = 60, wob = 0) => { await T('touchStart', pts); if (wob) { await W(20); await T('touchMove', pts.map(q => [q[0] + wob, q[1] + wob])); } await W(hold); await T('touchEnd', []); await W(200); };
  const spiral = async (cx, cy, R = 55, turns = 3) => { const pts = []; for (let i = 0; i < 90; i++) { const u = i / 89, a = u * turns * 2 * Math.PI, r = R * (.15 + .85 * u); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } await drag(pts, 9); await W(2600); };
  await E(() => { for (const c of RSAPP.Sf.creatures) c.breedCool = 1e9; });
  const findSpot = () => E(() => { const S = RSAPP.Sf; for (let yy = .22; yy < .5; yy += .04) for (let xx = .3; xx < .75; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y); if (!S.creatures.some(c => Math.hypot(c.x - w[0], c.y - w[1]) < 160)) { const h = S.hit(w[0], w[1]); if (!h.body && !h.creature) return [x, y]; } } return [206, 300]; });
  const N = () => E(() => RSAPP.Sf.creatures.length);
  if (!process.env.ONLY || process.env.ONLY === 'C') {
    const n0 = await N(), sp = await findSpot(); await spiral(sp[0], sp[1]); const n1 = await N();
    await fingers([[100, 620], [170, 620]]); const n2 = await N();
    await fingers([[100, 620], [170, 620], [135, 680]], 80, 12); const n3 = await N();
    await fingers([[90, 620], [150, 620], [210, 620], [120, 690]], 80, 10); const n4 = await N();
    ok('C a two-finger tap no longer undoes; three-finger tap (with a little wobble) undoes; four-finger tap redoes', n1 === n0 + 1 && n2 === n1 && n3 === n0 && n4 === n1, { n0, n1, n2, n3, n4 }); }
  if (!process.env.ONLY || process.env.ONLY === 'H1') {   // H.1 end-of-spiral hold ring
    const spts = (cx, cy, R = 55, turns = 3) => { const pts = []; for (let i = 0; i < 90; i++) { const u = i / 89, a = u * turns * 2 * Math.PI, r = R * (.15 + .85 * u); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; };
    const h0 = await E(() => Object.assign({}, RSAPP.hstat)); let sp = await findSpot(); await drag(spts(sp[0], sp[1]), 9, 750); await W(300);
    const h1 = await E(() => Object.assign({ clay: !!RSAPP.Sf.clay }, RSAPP.hstat)); await E(() => { if (RSAPP.Sf.clay) RS.Mold.hatch(RSAPP.Sf, 'test'); }); await W(1500);
    sp = await findSpot(); const n0 = await N(); await drag(spts(sp[0], sp[1]), 9, 0); await W(2600); const h2 = await E(() => Object.assign({ clay: !!RSAPP.Sf.clay }, RSAPP.hstat)), n1 = await N();
    ok('H.1 resting at a spiral end fills the ring (rising tone) and closes it (chime) before the clay opens', h1.ring === h0.ring + 1 && h1.done === h0.done + 1 && h1.clay, { h0, h1 });
    ok('H.1 lifting at once: no ring closes, the spiral hatches normally', h2.done === h1.done && !h2.clay && n1 === n0 + 1, { h2, n0, n1 }); }
  if (!process.env.ONLY || process.env.ONLY === 'B') {
    const lift3 = q => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: q[0], y: q[1], id: 2, radiusX: 4, radiusY: 4, force: .5 }] });   // CDP: touchEnd lists the points that lift   // B conducting through real touch: 2 fingers rest -> baton; a third finger beats, flicks; lift releases
    await E(() => { if (RSAPP.Sf.clay) RS.Mold.hatch(RSAPP.Sf, 'test'); if (RSAPP.Sf.wordEgg) RS.Egg.hatch && RS.Egg.hatch(RSAPP.Sf, 'test'); }); await W(400);
    const sp = await findSpot(), a = [sp[0] - 30, sp[1]], b = [sp[0] + 30, sp[1]], cam0 = await E(() => Object.assign({}, RSAPP.cam));
    await T('touchStart', [a, b]); await W(400); const mid = await E(() => ({ ok: RSAPP.batonOk(), up: !!RSAPP.Sf.baton })); await W(450);
    const up = await E(() => { const B = RSAPP.Sf.baton; return B ? { n: B.members.length, cam: Object.assign({}, RSAPP.cam) } : null; });
    const bx = 330, beat = []; for (let i = 0; i <= 64; i++) { const u = i / 16; beat.push([bx, 300 + 60 * Math.cos(u * 2 * Math.PI)]); }
    await T('touchStart', [a, b, beat[0]]); for (const q of beat.slice(1)) { await W(14); await T('touchMove', [a, b, q]); } await lift3(beat[beat.length - 1]); await W(150);
    const r1 = await E(() => RSAPP.lastConduct); if (process.env.DBG) console.log(await E(() => ({ cond: RSAPP.cond, ids: RSAPP.batonIds && [...RSAPP.batonIds], up: !!RSAPP.Sf.baton, lc: RSAPP.lastConduct, dbg: RSAPP.dbgC, rel: RSAPP.lastRelease && RSAPP.lastRelease.why, raised: !!RSAPP.raised, pl: RSAPP.dbgP })));
    if (process.env.DBG) await E(() => { const f = RS.Conduct.stroke; RS.Conduct.stroke = (S, w, t, h) => { const r = f(S, w, t, h); RSAPP.dbgS = { n: w.length, dur: t[t.length - 1] - t[0], w0: w[0], w1: w[w.length - 1], r }; return r; }; }); const fl = []; for (let i = 0; i <= 4; i++) fl.push([bx, 180 + i * 37.5]); await T('touchStart', [a, b, fl[0]]); for (const q of fl.slice(1)) {   /* no waits: each CDP touch already takes ~40-50 ms here, a real flick is < .28 s */ await T('touchMove', [a, b, q]); } await lift3(fl[fl.length - 1]); await W(150);
    const r2 = await E(() => ({ k: RSAPP.lastConduct && RSAPP.lastConduct.k, cut: RSAPP.Sf.baton && RSAPP.Sf.baton.members.every(c => c.batonCut), ok: RSAPP.Sf.creatures.length }));
    await T('touchEnd', []); await W(200); const rel = await E(() => ({ up: !!RSAPP.Sf.baton, why: RSAPP.lastRelease && RSAPP.lastRelease.why, cut: RSAPP.Sf.creatures.some(c => c.batonCut) }));
    ok('B two fingers resting 0.6 s on open ground raise the baton (ring filling at 0.4 s, camera unchanged), ohms in view join', mid.ok && !mid.up && up && Math.abs(up.cam.z - cam0.z) < 1e-6 && Math.abs(up.cam.x - cam0.x) < 1e-6, { mid, up, cam0 });
    if (process.env.DBG) console.log('STROKE', JSON.stringify(await E(() => RSAPP.dbgS))); ok('B a third finger beating down-up sets a snapped tempo; a sharp flick down cuts off', r1 && r1.k === 'beat' && r2.k === 'cut' && (up.n === 0 || r2.cut), { r1, r2 });
    ok('B lifting the held fingers releases (nothing stays cut)', !rel.up && rel.why === 'lift' && !rel.cut, rel);
    const z0 = await E(() => RSAPP.cam.z); await T('touchStart', [[sp[0] - 30, sp[1]], [sp[0] + 30, sp[1]]]); for (let i = 1; i <= 12; i++) { await W(16); await T('touchMove', [[sp[0] - 30 - i * 8, sp[1]], [sp[0] + 30 + i * 8, sp[1]]]); } await W(700); const pz = await E(() => ({ up: !!RSAPP.Sf.baton, z: RSAPP.cam.z })); await T('touchEnd', []); await W(300);
    ok('B a pinch still zooms and never raises the baton', !pz.up && Math.abs(pz.z - z0) > .05, { z0, pz });
    await E(c0 => { Object.assign(RSAPP.cam, c0); }, cam0); await W(300);
    const oh = await E(() => { const c = RSAPP.Sf.creatures.find(c => { const s = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y); return s[0] > 60 && s[0] < RSAPP.Wd - 60 && s[1] > 80 && s[1] < RSAPP.Ht - 80; }); return c ? RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y) : null; });
    if (oh) { await T('touchStart', [[oh[0] - 6, oh[1]], [oh[0] + 6, oh[1]]]); await W(900); const on = await E(() => !!RSAPP.Sf.baton); await T('touchEnd', []); await W(300); ok('B two fingers resting on an ohm do not raise the baton', !on); } else ok('B (an ohm on screen for the on-ohm check)', false);
    ok('B no page errors', errs.length === 0, errs.slice(0, 3)); }
  if (!process.env.ONLY || process.env.ONLY === 'A') {   // A: the word egg through real touch
    const spts = (cx, cy, R = 55, turns = 3) => { const pts = []; for (let i = 0; i < 90; i++) { const u = i / 89, a = u * turns * 2 * Math.PI, r = R * (.15 + .85 * u); pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); } return pts; };
    const eggS = () => E(() => { const e = RSAPP.Sf.wordEgg; return e ? RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, e.x, e.y) : null; });
    let sp = await findSpot(); const n0 = await N(); await drag(spts(sp[0], sp[1]), 9, 0); await W(150); const es = await eggS(), n1 = await N();
    const tap = async q => { await T('touchStart', [q]); await W(50); await T('touchEnd', []); await W(260); };
    if (es) { await tap(es); await tap(es); await tap(es); } await W(2400); const lh1 = await E(() => RSAPP.Sf.lastHatch), n2 = await N();
    ok('A touch spiral lays an egg (no ohm yet); three taps on it hatch a drum ohm after the window, with no catch/clay/join', !!es && n1 === n0 && n2 === n0 + 1 && lh1 && /^drum:/.test(lh1.voice || '') && !(await E(() => !!RSAPP.Sf.clay)), { es, n0, n1, n2, lh1 });
    sp = await findSpot(); await drag(spts(sp[0], sp[1]), 9, 0); await W(150); const e2 = await eggS(); const bub0 = await E(() => (RSAPP.Sf.bubbles || []).length);
    if (e2) { const c = []; for (let i = 0; i <= 26; i++) { const a = -1.57 + i / 26 * 6.6; c.push([e2[0] + Math.cos(a) * 9 * (i ? 4 : 0) , e2[1] + Math.sin(a) * 9 * (i ? 4 : 0)]); } c[0] = e2; await drag(c, 14); } await W(2400);
    const lh2 = await E(() => RSAPP.Sf.lastHatch), bub1 = await E(() => (RSAPP.Sf.bubbles || []).length);
    ok('A a circle started on the egg is an egg word (bell/glass), never a catch bubble', lh2 && /^(bell|glass)$/.test(lh2.voice || '') && bub1 === bub0, { lh2, bub0, bub1 }); }
  if (!process.env.ONLY || process.env.ONLY === 'K') {   // K: walk in an ohm's shoes through real touch (stick on the left + a node on the right at the same time, then Android back)
    await E(() => { if (RSAPP.Sf.clay) RS.Mold.hatch(RSAPP.Sf, 'test'); if (RSAPP.Sf.wordEgg && RS.Egg.hatch) RS.Egg.hatch(RSAPP.Sf, 'test'); }); await W(300);
    const ent = await E(() => { const S = RSAPP.Sf, c = S.creatures.find(c => !c.dead && !c.caught && !c.fossil); if (!c) return null; RSAPP.play = RS.Play.enter(S, c); return { id: c.id, drive: !!S.drive }; }); await W(1500);
    const geo = await E(() => { const S = RSAPP.Sf, s = RSAPP.play, A = RSAPP; let st = null; for (let yy = .55; yy < .9 && !st; yy += .04) for (let xx = .08; xx < .45 && !st; xx += .04) { const x = A.Wd * xx, y = A.Ht * yy; if (RS.Walk.claim(A, x, y)) st = [x, y]; }
      let nd = null; for (const o of s.nodes) { const w = RS.Play.pos(S, s, o), q = RS.Render.toScreen(A.cam, A.Wd, A.Ht, w[0], w[1]); if (q[0] > A.Wd * .5 && q[0] < A.Wd - 10 && q[1] > 10 && q[1] < A.Ht - 10) { nd = q; break; } }
      if (!nd) for (const o of s.nodes) { const w = RS.Play.pos(S, s, o), q = RS.Render.toScreen(A.cam, A.Wd, A.Ht, w[0], w[1]); if (q[0] > 10 && q[0] < A.Wd - 10 && q[1] > 10 && q[1] < A.Ht - 10 && (!st || Math.hypot(q[0] - st[0], q[1] - st[1]) > 120)) { nd = q; break; } } return { st, nd }; });
    let both = null, after = null, back = null;
    if (ent && geo.st && geo.nd) { const st = geo.st, st2 = [st[0] + 60, st[1]]; await T('touchStart', [st]); await W(30); await T('touchMove', [st2]); await W(30); await T('touchStart', [st2, geo.nd]); await W(400);
      both = await E(() => { const S = RSAPP.Sf, D = S.drive; return { stick: !!(D && D.stick), want: D ? +D.c.want[0].toFixed(2) : null, held: !!(RSAPP.play && RSAPP.play.held), pinch: !!RSAPP.pinchSt, inP: RSAPP.stickId != null, play: !!RSAPP.play }; });
      await T('touchEnd', []); await W(300); after = await E(() => ({ stick: !!(RSAPP.Sf.drive && RSAPP.Sf.drive.stick), stickId: RSAPP.stickId, play: !!RSAPP.play }));
      back = await E(() => { const r = RSAPP.back(); return { r, play: !!RSAPP.play, drive: !!RSAPP.Sf.drive, level: RSAPP.level }; }); }
    ok('K in play mode a thumb on empty left-half screen is a walking stick (the ohm wants to go that way) while the other hand plays a node at the same time; lifting ends the stick; Android back leaves play mode (and stays on the surface)', ent && ent.drive && both && both.stick && both.want > .5 && both.held && both.inP && after && !after.stick && after.stickId == null && after.play && back && back.r && !back.play && !back.drive && back.level === 'surface', { ent, geo, both, after, back });
    ok('K no page errors', errs.length === 0, errs.slice(0, 3)); }
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  const pass = res.filter(Boolean).length; console.log(`V07 ${pass}/${res.length}`); await b.close(); process.exit(pass === res.length ? 0 : 1); })();
