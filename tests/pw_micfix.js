// Regression for Wilbow 6:18 PM MDT Oct 23 2026 on 0.8b1 ("I tried to get one of them to listen to my mic and the audio stopped coming out")
// + 6:22 PM ("its good that it cuts for a second while they listen but it should return after release").
// Device-like run: mobile + touch, a mocked microphone (getUserMedia -> an oscillator stream, tracks counted) and a mocked Android audio
// session: opening the mic SUSPENDS the game's AudioContext (what Android's voice-call switch / recogniser audio focus does to the WebView).
// The output is measured with an analyser after the master gain. Asserts: quiet while listening, sound back < 0.5 s after release
// (release, cancel, app hidden, late mic after release), mic tracks stopped, plain-mic constraints, native AudioMode.restore called, and a
// dead context is rebuilt with a continuous clock.
const { chromium } = require('playwright');
const URL0 = process.env.URL || ('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const INIT = () => {
  window.__mic = { calls: 0, cons: [], live: 0, stopped: 0, delay: 0, native: 0 };
  window.Capacitor = { Plugins: { AudioMode: { restore: async () => { window.__mic.native++; return { was: 0, restored: false, mode: 0 }; } } } };
  const md = navigator.mediaDevices || (navigator.mediaDevices = {});
  md.getUserMedia = async c => { const M = window.__mic; M.calls++; M.cons.push(JSON.stringify(c && c.audio)); if (M.delay) await new Promise(r => setTimeout(r, M.delay));
    const ac = M.ac || (M.ac = new AudioContext()); const o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.frequency.value = 220; o.connect(d); o.start();
    for (const t of d.stream.getTracks()) { M.live++; const s0 = t.stop.bind(t); t.stop = () => { if (t.readyState !== 'ended') { M.live--; M.stopped++; } s0(); }; }
    const A = window.RS && RS.audio; if (A && A.ctx && !M.noSuspend) A.ctx.suspend();   // the phone's audio session is taken by the mic
    return d.stream; };
};
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.addInitScript(INIT);
  await p.goto(URL0); await p.evaluate(() => localStorage.clear()); await p.reload(); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 0, radiusY: 0, force: 0 })) });
  const E = (f, a) => p.evaluate(f, a), W = ms => p.waitForTimeout(ms);
  await W(2500); await T('touchStart', [[30, 820]]); await W(40); await T('touchEnd', []); await W(1500);   // first touch starts audio
  // a steady tone so the output can be measured; analyser after the master gain (re-attached if the context is rebuilt)
  await E(() => { const A = RS.audio; window.__tone = setInterval(() => A.play({ modes: [{ f: 330, a: 1, d: 1.2 }], gain: .25, prio: 9 }), 150);
    window.__lvl = () => { if (!A.ctx || A.ctx.state !== 'running') return { st: A.ctx && A.ctx.state, rms: 0 }; if (window.__an && window.__an.ctx !== A.ctx || !window.__an) { const an = A.ctx.createAnalyser(); an.fftSize = 2048; A.out.connect(an); window.__an = { an, ctx: A.ctx, out: A.out }; } if (window.__an.out !== A.out) { A.out.connect(window.__an.an); window.__an.out = A.out; }
      const x = new Float32Array(2048); window.__an.an.getFloatTimeDomainData(x); let e = 0; for (const v of x) e += v * v; return { st: A.ctx.state, rms: Math.sqrt(e / x.length), g: +A.out.gain.value.toFixed(3) }; }; });
  const lvl = async (ms = 250) => { const o = []; for (let i = 0; i < 4; i++) { await W(ms / 4); o.push(await E(() => window.__lvl())); } return { st: o[o.length - 1].st, rms: Math.max(...o.map(q => q.rms)), g: o[o.length - 1].g }; };
  const pick = () => E(() => { const S = RSAPP.Sf; for (const c of S.creatures) { if (c.dead || c.P.sense.deaf || c.bubble) continue; const s = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y); if (s[0] > 40 && s[0] < RSAPP.Wd - 40 && s[1] > 120 && s[1] < RSAPP.Ht - 120) { c.vx = c.vy = 0; return s; } } return null; });
  const hold = async () => { for (let k = 0; k < 8; k++) { const s = await pick(); if (!s) { await W(300); continue; } await T('touchStart', [s]); await W(560); if (await E(() => !!RS.Listen.active)) return s; await T('touchEnd', []); await W(500); } return null; };
  const base = await lvl(400); ok('B0 the game is audible before listening', base.st === 'running' && base.rms > .003, base);
  // D1 (Wilbow 6:24 PM "audio dropouts with the mic control"): mic open 3 s (mock stream = a voiced tone, the worst case for pitch tracking),
  // no simulated suspend, CPU throttled 4x (phone-like), run first on a fresh page. Main-thread stalls are what gap the music (notes are dispatched from the main thread 30 ms ahead), so measure the
  // longest frame gap and the latest scheduled-note dispatch from 1 s before release to 2 s after (covers the post-release analysis).
  { await E(() => { window.__mic.noSuspend = true; const A = RS.audio, p0 = A.pump; window.__late = 0; A.pump = () => { const t = A.now(); for (const e of A.q) if (e.when <= t + .03 && e.__probe) window.__late = Math.max(window.__late, t - e.when); return p0(); };
      window.__probe = setInterval(() => { const n = { t: 'note', id: A.nextId++, modes: [{ f: 440, a: .2, d: .1 }], gain: .02 }; A.q.push({ when: A.now() + .08, n, __probe: 1 }); }, 40);
      window.__gap = 0; let last = performance.now(); const f = () => { const t = performance.now(); window.__gap = Math.max(window.__gap, t - last); last = t; if (window.__gapOn) requestAnimationFrame(f); }; window.__gapOn = 1; requestAnimationFrame(f); });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await W(1000); await E(() => { window.__gap = 0; window.__late = 0; }); await W(3000); const bl = await E(() => ({ gap: Math.round(window.__gap), lateMs: Math.round(window.__late * 1000) })); const s = await hold(); await W(2000); await E(() => { window.__gap = 0; window.__late = 0; }); await W(1000); await T('touchEnd', []); await W(2000); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    const m = await E(() => ({ gap: Math.round(window.__gap), lateMs: Math.round(window.__late * 1000), cap: RS.Listen.lastCap, rt: RS.audio.ratio && RS.audio.ratio(2000) }));
    await E(() => { window.__gapOn = 0; clearInterval(window.__probe); window.__mic.noSuspend = false; });
    ok('D1 no extra stalls around release (vs 3 s of normal play, same 4x CPU): frame gap < max(100 ms, 1.5x normal), note dispatch late by < max(60 ms, normal + 30 ms) (b1 was ~400 ms), audio real time', !!s && m.gap < Math.max(100, bl.gap * 1.5) && m.lateMs < Math.max(60, bl.lateMs + 30) && (m.rt == null || m.rt > .97), { normal: bl, listen: m }); }
  await W(1500);
  // L1: hold = listen: quiet while listening (the wanted dip), back after release in < 0.5 s with the mic closed
  { const s = await hold(); await W(500); const dur = await lvl(300); const m1 = await E(() => ({ ...window.__mic, ac: undefined }));
    const t0 = Date.now(); await T('touchEnd', []); let back = null; for (let i = 0; i < 12 && !back; i++) { await W(50); const v = await E(() => window.__lvl()); if (v.st === 'running' && v.rms > base.rms * .5) back = Date.now() - t0; }
    const after = await lvl(400), m2 = await E(() => ({ live: window.__mic.live, stopped: window.__mic.stopped, native: window.__mic.native }));
    ok('L1 holding an ohm opens the mic as a plain mic (no echo cancel / noise suppression / AGC = no voice-call mode)', !!s && m1.calls >= 1 && /"echoCancellation":false/.test(m1.cons[0]) && /"noiseSuppression":false/.test(m1.cons[0]) && /"autoGainControl":false/.test(m1.cons[0]), { s, cons: m1.cons });
    ok('L1 the sound dips while the ohm listens', dur.rms < base.rms * .3, { base: base.rms, during: dur });
    ok('L1 sound back after release within 0.5 s', back !== null && back <= 500 && after.st === 'running' && after.rms > base.rms * .5, { back, after });
    ok('L1 mic tracks stopped and native audio mode restored on release', m2.live === 0 && m2.stopped >= 1 && m2.native >= 1, m2); }
  await W(1200);
  // L2: the hold is cancelled by a second finger (pointercancel-like end) -> sound back
  { const s = await hold(); await W(400); await T('touchMove', [s, [s[0] + 120, s[1] + 40]]); await W(60); await T('touchEnd', []); await W(500); const a = await lvl(300), m = await E(() => window.__mic.live);
    ok('L2 a second finger ends listening: sound back, mic closed', !!s && a.st === 'running' && a.rms > base.rms * .5 && m === 0 && !(await E(() => !!RS.Listen.active)), { a, live: m }); }
  await W(1200);
  // L3: the app goes to the background mid-listen -> session ends, mic closed; back in the foreground the sound returns
  { const s = await hold(); await W(300); await E(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
    const m = await E(() => ({ live: window.__mic.live, act: !!RS.Listen.active })); await E(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => false }); document.dispatchEvent(new Event('visibilitychange')); });
    await T('touchEnd', []); await W(500); const a = await lvl(300);
    ok('L3 backgrounding ends listening (mic closed); sound back in the foreground', !!s && m.live === 0 && !m.act && a.st === 'running' && a.rms > base.rms * .5, { m, a }); }
  await W(1200);
  // L4: the mic opens only AFTER release (permission prompt mid-hold): the late stream is closed at once and the sound stays / comes back
  { await E(() => { window.__mic.delay = 900; }); const s = await hold(); await W(100); await T('touchEnd', []); await W(1300); const a = await lvl(300), m = await E(() => ({ live: window.__mic.live, calls: window.__mic.calls }));
    await E(() => { window.__mic.delay = 0; });
    ok('L4 a mic granted after release is closed immediately and the sound comes back', !!s && m.live === 0 && a.st === 'running' && a.rms > base.rms * .5, { m, a }); }
  // L5: an outside suspend (no listening at all) is healed by the watchdog / next touch
  { await E(() => RS.audio.ctx.suspend()); await W(1600); const a = await lvl(300); ok('L5 a context suspended from outside resumes by itself (watchdog)', a.st === 'running' && a.rms > base.rms * .5, a); }
  // L6: the context dies (closed / device error) -> rebuilt, clock never goes backwards, sound back
  { const t0 = await E(() => RSAPP.Sf.now()); await E(() => RS.audio.ctx.close()); await W(1500); const a = await lvl(400), t1 = await E(() => ({ t: RSAPP.Sf.now(), rb: RS.audio.heals.rebuild }));
    ok('L6 a closed context is rebuilt, game clock continuous, sound back', t1.rb >= 1 && t1.t >= t0 && a.st === 'running' && a.rms > base.rms * .5, { t0, t1, a }); }
  const fr = await E(() => RSAPP.stats.frameErr || 0);
  ok('no page errors / frame errors', !errs.length && !fr, { errs: errs.slice(0, 3), fr });
  await b.close(); const f = res.filter(x => !x).length; console.log(f ? f + ' FAIL' : 'ALL OK (' + res.length + ')'); process.exit(f ? 1 : 0);
})().catch(e => { console.log('FAIL exception ' + e.stack); process.exit(1); });
