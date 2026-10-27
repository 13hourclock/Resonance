// Browser check for Wilbow's C1 (option B) + C2/C3: a quick tap on a jam member mutes it AFTER ~300 ms; a double tap does nothing.
// v0.8b4 (Wilbow 3:32 PM MDT Oct 23 2026): a plain HOLD on an ohm = play ('hands' ring); TAP-THEN-HOLD = listen ('ear' ring, ~1.2 s); sliding up
// during the ear ring = play; lifting early = nothing. Moving ohms: double-tap bare ground = call; 3+ more taps there = tap tempo.
const { chromium } = require('playwright');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 4, radiusY: 4, force: 1 })) });
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a); const tap = async (x, y) => { await T('touchStart', [[x, y]]); await W(40); await T('touchEnd', []); };
  let t = 0; for (; t < 60; t++) { const n = await E(() => (RSAPP.Sf.jams || []).filter(j => j.members.length >= 2).length); if (n) break; await W(1000); }
  if (t >= 60) await E(() => { const S = RSAPP.Sf, cs = S.creatures.filter(c => !c.dead && !c.jam); let best = null, bd = 1e9; for (const a of cs) for (const b of cs) if (a !== b && Math.hypot(a.x - b.x, a.y - b.y) < bd) { bd = Math.hypot(a.x - b.x, a.y - b.y); best = [a, b]; } if (best) RS.Jam.form(S, best, .8); });   /* v0.8b4: the fixed world forms its first jam anywhere from ~9 s to never (b3 too); form one rather than crash */
  const pos = () => E(() => { const S = RSAPP.Sf, j = S.jams.find(j => j.members.length >= 2), c = j.members.find(q => q.mind && q.mind.E && q.mind.E.prop !== q) || j.members[0]; window.__tc = c; const s = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y); return [s[0], s[1]]; });
  const muted = () => E(() => !!window.__tc.muted);
  let [x, y] = await pos(); await tap(x, y); await W(120); const early = await muted(); await W(400); const late = await muted();
  ok('C2 a tap on a jam member is deferred (~300 ms), then mutes it (C1 option B)', !early && late, { early, late, jamAfterSecs: t });
  [x, y] = await pos(); await tap(x, y); await W(500); ok('tap again = unmute', !(await muted()));
  [x, y] = await pos(); await tap(x, y); await W(140); await tap(x, y); await W(600); ok('C3 a double tap on the ohm does nothing (no mute + unmute flicker)', !(await muted()), await E(() => RSAPP.lastTap));
  await E(() => { const S = RSAPP.Sf, h = S.hold.bind(S); window.__hold = 0; S.hold = (...a) => { if (a[2]) window.__hold++; return h(...a); }; });
  const exitPlay = () => E(() => { if (RSAPP.play) RSAPP.play = RS.Play.exit(RSAPP.Sf, RSAPP.play); });
  [x, y] = await pos(); await T('touchStart', [[x, y]]); await W(200); const ring = await E(() => RSAPP.holdUI && RSAPP.holdUI.k); await W(450); let play = await E(() => !!RSAPP.play); await T('touchEnd', []); await W(500); let m3 = await muted();
  ok('C2 a plain HOLD on an ohm = play mode (hands ring), no mute, no listen', play && !m3 && ring === 'hands' && (await E(() => window.__hold)) === 0, { play, muted: m3, ring }); await exitPlay(); await W(300);
  [x, y] = await pos(); await tap(x, y); await W(120); await T('touchStart', [[x, y]]); await W(250); const ring2 = await E(() => RSAPP.holdUI && RSAPP.holdUI.k); await W(450); play = await E(() => !!RSAPP.play); const h7 = await E(() => window.__hold);
  await W(700); const h14 = await E(() => window.__hold), ear = await E(() => RSAPP.lastEar); await T('touchEnd', []); await W(500); m3 = await muted();
  ok('C4 TAP-THEN-HOLD = listen: ear ring, nothing at 0.7 s, listening by ~1.2 s, no play, no mute', ring2 === 'ear' && !play && h7 === 0 && h14 === 1 && ear === 'listen' && !m3, { ring2, play, h7, h14, ear, m3 }); await exitPlay(); await W(300);
  [x, y] = await pos(); await tap(x, y); await W(120); await T('touchStart', [[x, y]]); await W(500); await T('touchEnd', []); await W(500);
  ok('C4b lifting before the ear ring closes does nothing (no listen, play or mute)', (await E(() => RSAPP.lastEar)) === 'lift' && (await E(() => window.__hold)) === 1 && !(await E(() => !!RSAPP.play)) && !(await muted()));
  [x, y] = await pos(); await tap(x, y); await W(120); await T('touchStart', [[x, y]]); await W(300); for (let i = 1; i <= 5; i++) { await T('touchMove', [[x, y - i * 9]]); await W(30); } await W(150); play = await E(() => !!RSAPP.play); const ear2 = await E(() => RSAPP.lastEar); await T('touchEnd', []); await W(400);
  ok('C4c sliding UP during the ear ring = play instead', play && ear2 === 'up-play' && (await E(() => window.__hold)) === 1, { play, ear2 }); await exitPlay(); await W(400);
  // moving ohms: a bare-ground spot on screen
  const gs = await E(() => { const S = RSAPP.Sf, A = RSAPP, z0 = A.cam.z; for (const zz of [z0, 1, .8, .65, .5]) { if (zz > z0) continue; A.cam.z = zz; for (let sx = 40; sx < A.Wd - 40; sx += 12) { const w = RS.Render.toWorld(A.cam, A.Wd, A.Ht, sx, A.Ht / 2); const gy = S.ground(w[0]) - 25, s = RS.Render.toScreen(A.cam, A.Wd, A.Ht, w[0], gy);
    if (s[1] < 60 || s[1] > A.Ht - 60) continue; if (S.creatures.some(c => Math.hypot(c.x - w[0], c.y - gy) < 110) || S.hit(w[0], gy).body) continue; return [s[0], s[1]]; } } A.cam.z = z0; return null; });   /* v0.8b4: the merged fixed world is crowded on a 412 px phone (every ground point had 2-4 ohms within 110 px), and play mode (C4c) leaves the camera zoomed in on the ohm (up to 4x), so the fixture zooms out a step at a time (the call needs zoom >= .35) */
  if (gs) { await E(() => { RSAPP.Sf.lastOhm = { id: window.__tc.id, t: RSAPP.Sf.now() }; }); await tap(gs[0], gs[1]); await W(120); await tap(gs[0], gs[1]); await W(300); const hc = await E(() => RSAPP.lastHerd && RSAPP.lastHerd.k);
    ok('H1 a double tap on bare ground CALLS the last-touched ohm', hc === 'call' && (await E(() => !!window.__tc.called)), { hc });
    const tq = Date.now(); for (let i = 0; i < 4; i++) { const wt = tq + i * 500 - Date.now(); if (wt > 0) await W(wt); await tap(gs[0] + 4, gs[1] - 3); } await W(300);   /* v0.8b4: taps on a 500 ms wall-clock grid (a tap's own CDP round trips added ~110 ms to every 460 ms gap: 105 bpm, not the ~120 meant) */ const ht = await E(() => RSAPP.lastHerd);
    ok('H2 4 more taps there ~0.5 s apart = TAP TEMPO for the called ohm (~120 bpm)', ht && ht.k === 'tempo' && Math.abs(ht.bpm - 120) <= 12 && (await E(() => !!(window.__tc && window.__tc.called && Math.abs((window.__tc.tapBpm || 0) - 120) <= 12))), { ...ht, tcBpm: await E(() => window.__tc && window.__tc.tapBpm) });   /* v0.8b4: the 'for the called ohm' part ran in node (window undefined); it now reads the called ohm's own bpm in the page */
  } else ok('H1 found a bare ground spot', false);
  ok('no page errors', errs.length === 0, errs.slice(0, 3)); console.log('TAP ' + res.filter(Boolean).length + '/' + res.length); await b.close(); })();
