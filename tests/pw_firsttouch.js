// Regression for Wilbow 11:06 AM MDT Oct 23 2026 ("8a5 freezes instantly when I touch"). Device-like start: no ?fixed=1, no autoplay flag, fresh
// storage, mobile + touch, radius 0 / force 0 touches. Root cause: the first touch starts audio and the game clock jumped from page time back
// to AudioContext time (~0), so an ohm's recent blow looked 'in the future', field.js drew a ring with a negative radius, arc() threw inside
// the main loop, and requestAnimationFrame (scheduled at the end of the frame) never ran again = frozen screen.
const { chromium } = require('playwright');
const URL0 = process.env.URL || 'http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html';
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const withT = (pr, ms) => Promise.race([pr, new Promise(r => setTimeout(() => r('__TIMEOUT'), ms))]);
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(URL0); await p.evaluate(() => localStorage.clear()); await p.reload(); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => withT(cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 0, radiusY: 0, force: 0 })) }), 4000);
  const E = (f, a) => withT(p.evaluate(f, a), 4000), W = ms => p.waitForTimeout(ms);
  const frames = async () => { const a = await E(() => RSAPP.stats.frames); await W(600); const c = await E(() => RSAPP.stats.frames); return a === '__TIMEOUT' || c === '__TIMEOUT' ? -1 : c - a; };
  const tap = async (x, y) => { await T('touchStart', [[x, y]]); await W(50); await T('touchEnd', []); };
  await W(6000);   // a player looks first: page time is ~6 s when the first touch lands
  // F1: every ohm 'just blew' a moment before the first touch (the state that crashed field.js once the clock jumped back)
  const pre = await E(() => { const S = RSAPP.Sf, t = S.now(); let n = 0; for (const c of S.creatures) { c.blowT = t - .05; c.blowAt = [c.x + 30, c.y - 20]; n++; } return { t, n, audio: !!RS.audio.ctx }; });
  await tap(206, 640); await W(1500);
  const post = await E(() => ({ t: RSAPP.Sf.now(), audio: !!RS.audio.ctx, mode: RS.audio.mode, frameErr: RSAPP.stats.frameErr || 0 }));
  const f1 = await frames();
  ok('F1 first touch starts audio and the game clock does not jump backwards', post.audio && !pre.audio && post.t >= pre.t, { pre, post });
  ok('F1 the screen keeps animating after the first touch (blow rings in flight)', f1 >= 10, { framesPer600ms: f1 });
  ok('F1 no page errors and no caught frame errors', errs.length === 0 && post.frameErr === 0, { errs: errs.slice(0, 3), frameErr: post.frameErr });
  // F5 (0.8a8, Wilbow 11:41): the guide is there from launch, and '?' (hook + a tap under it) works on the first touches, DURING the egg lessons
  { const g0 = await E(() => { const S = RSAPP.Sf, g = RS.Guide.guide(S); return { g: !!g, egg: RS.Guide.eggPending(S) }; });
    const sp = await E(() => { const S = RSAPP.Sf; for (let yy = .22; yy < .5; yy += .04) for (let xx = .3; xx < .75; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y); if (!S.creatures.some(c => Math.hypot(c.x - w[0], c.y - w[1]) < 180)) { const h = S.hit(w[0], w[1]); if (!h.body && !h.creature) return [x, y]; } } return [206, 300]; });
    const tr = await E(([x, y]) => { const t = RS.Symbols.trace('question', x, y, 70)[0], o = []; for (let i = 1; i < t.length; i++) for (let k = 0; k < 2; k++) o.push([t[i - 1][0] + (t[i][0] - t[i - 1][0]) * k / 2, t[i - 1][1] + (t[i][1] - t[i - 1][1]) * k / 2]); o.push(t[t.length - 1]); return o; }, sp);
    await T('touchStart', [tr[0]]); for (let i = 1; i < tr.length; i++) { await W(16); await T('touchMove', [tr[i]]); } await W(16); await T('touchEnd', []); await W(60);
    const held = await E(() => !!RSAPP.Sf.glyphHold), e = tr[tr.length - 1], y1 = Math.max(...tr.map(q => q[1])); await tap(e[0], y1 + 22); await W(60);
    const w = await E(([x, y]) => RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y), [e[0], y1 + 22]), lt = await E(() => RSAPP.lastTap && RSAPP.lastTap.id); await W(2900);
    const d = await E(w => { const g = RS.Guide.guide(RSAPP.Sf); return g ? Math.round(Math.hypot(g.x - w[0], g.y - w[1])) : -1; }, w), fr = await frames();
    ok('F5 the guide exists from launch; "?" on the first touches (egg lessons still on) calls it to the point within 3 s; screen alive', g0.g && held && lt === 'question' && d >= 0 && d < 80 && fr >= 10 && !errs.length, { ...g0, held, lt, d, fr, errs: errs.slice(0, 2) }); }
  // F2: a throw inside the main loop is caught and the loop keeps going
  await E(() => { const S = RSAPP.Sf, s0 = S.step; let once = true; S.step = (...a) => { if (once) { once = false; throw new Error('test frame throw'); } return s0(...a); }; });
  await W(300); const f2 = await frames(); const fe = await E(() => RSAPP.stats.frameErr || 0);
  ok('F2 an exception in a frame never stops the loop', f2 >= 10 && fe === 1, { f2, frameErr: fe });
  // F3: a throw inside a touch handler is caught, drag state is reset, and the next touch works
  await E(() => { const S = RSAPP.Sf, h0 = S.hit; let once = true; S.hit = (...a) => { if (once) { once = false; throw new Error('test touch throw'); } return h0(...a); }; });
  await T('touchStart', [[150, 600]]); for (let k = 1; k <= 5; k++) { await T('touchMove', [[150 + k * 10, 600]]); await W(16); } await T('touchEnd', []); await W(400);
  const ie = await E(() => ({ inputErr: RSAPP.stats.inputErr || 0, last: RSAPP.lastErr && RSAPP.lastErr.where }));
  const n0 = await E(() => RSAPP.Sf.strikesP ? RSAPP.Sf.strikesP.length : 0); await T('touchStart', [[120, 560]]); for (let k = 1; k <= 8; k++) { await T('touchMove', [[120 + k * 18, 560]]); await W(16); } await T('touchEnd', []); await W(500);
  const f3 = await frames(); const after = await E(() => ({ ptrs: RSAPP.stats.inputErr, drag: !!RSAPP.Sf.shapeDrag }));
  ok('F3 an exception in a touch handler is caught and input is reset (next touch still handled, screen alive)', ie.inputErr >= 1 && f3 >= 10 && !after.drag, { ie, f3, after, n0 });
  // F4: negative radius draws nothing instead of throwing
  const f4 = await E(() => { try { const c = document.createElement('canvas').getContext('2d'); c.beginPath(); c.arc(5, 5, -3, 0, 6.28); c.ellipse && c.ellipse(5, 5, -1, -2, 0, 0, 6.28); return 'ok'; } catch (e) { return String(e.message); } });
  ok('F4 arc/ellipse with a negative radius do not throw', f4 === 'ok', f4);
  console.log('FIRSTTOUCH ' + res.filter(Boolean).length + '/' + res.length); await withT(b.close(), 5000); process.exit(0); })();
