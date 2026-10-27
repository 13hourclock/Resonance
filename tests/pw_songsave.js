// Regression for Wilbow 7:27 PM MDT Oct 23 2026 on 0.8b1 ("When exiting the game the song didn't sound the same on return.  It needs to preserve it")
// + "Switched away" + "It should preserve it in both cases". Device-like run (mobile + touch) of the real app, two ways of leaving:
//  1. SWITCHING AWAY: the page goes hidden (visibilitychange; rAF stops like a backgrounded WebView) for 4 s and comes back: the game clock must not
//     move while away, the song carries on from the same place (same jams / roles / bar grid), notes come back, the resume record is written.
//     Also: frames stopping WITHOUT a hide event (WebView stalled) is treated as a pause too.
//  2. FULL CLOSE + REOPEN: hidden (Android saves here), then the page is killed with no more events, and the app is launched again:
//     it reopens the same world with the same song (same ohms / roles / jams, clock carries on from the saved song time, bar grid kept
//     after the first touch, effect inserts resent). ?fresh=1 still starts fresh; a bad / old resume record falls back to a fresh start.
// The note-for-note comparison (several worlds incl. items and drawn pieces) is the headless tests/songsave_check.js.
const { chromium } = require('playwright');
const URL0 = process.env.URL || 'http://localhost:8811/index.html';
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
// same ohms / roles / ensembles / jams exactly; bpm within 1.5 (a few silent frames run between the two fingerprints)
const fpEq = (a, b) => { const pa = (a || '').split(' '), pb = (b || '').split(' '); if (pa.length !== pb.length) return false;
  return pa.every((x, i) => { const u = x.split(':'), v = pb[i].split(':'); return u.slice(0, -1).join(':') === v.slice(0, -1).join(':') && Math.abs(+u[u.length - 1] - +v[v.length - 1]) <= 1.5; }); };
const INIT = () => {   // controllable visibility + a rAF that stops while hidden (what a backgrounded Android WebView does)
  window.__hid = false; window.__held = []; window.__stall = false; const raf = window.requestAnimationFrame.bind(window);
  Object.defineProperty(Document.prototype, 'hidden', { configurable: true, get: () => !!window.__hid });
  Object.defineProperty(Document.prototype, 'visibilityState', { configurable: true, get: () => window.__hid ? 'hidden' : 'visible' });
  window.requestAnimationFrame = cb => (window.__hid || window.__stall) ? (window.__held.push(cb), 0) : raf(cb);
  window.__setHid = h => { window.__hid = h; document.dispatchEvent(new Event('visibilitychange')); if (!h) { const l = window.__held.splice(0); for (const cb of l) raf(cb); } };
  window.__unstall = () => { window.__stall = false; const l = window.__held.splice(0); for (const cb of l) raf(cb); };
  window.__fp = () => { const S = RSAPP.Sf; return S.creatures.filter(c => !c.dead && c.mind).map(c => [c.id, c.mind.role, c.mind.E && c.mind.E.id, c.jam && c.jam.id, Math.round(c.mind.bpm)].join(':')).sort().join(' '); };
  window.__st = () => { const S = RSAPP.Sf, A = RS.audio; return { now: A.now(), frame: S.frame, fp: window.__fp(), jams: (S.jams || []).length, sent: A.nextId, key: S.key, u: RSAPP.meta.useed, t0: S.M.t0, ctx: A.ctx && A.ctx.state, pend: !!S.songPend, resumed: RSAPP.resumed || null, level: RSAPP.level }; };
};
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, deviceScaleFactor: 2.625, hasTouch: true, isMobile: true }); await ctx.addInitScript(INIT);
  const errs = []; const page = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); return p; };
  let p = await page(); const E = (f, a) => p.evaluate(f, a), W = ms => p.waitForTimeout(ms);
  const ready = () => p.waitForFunction(() => window.RSAPP && RSAPP.Sf && RS.audio && !RSAPP.Sf.songPend && RSAPP.Sf.frame > 2, null, { timeout: 15000 });
  const tap = async () => { const cdp = await ctx.newCDPSession(p); const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 0, radiusY: 0, force: 0 })) }); await T('touchStart', [[30, 820]]); await W(40); await T('touchEnd', []); };
  await p.goto(URL0); await ready(); const first = await E(() => window.__st());
  ok('a clean first launch starts fresh (no resume record yet)', !first.resumed && first.level === 'surface', first.resumed);
  await W(1500); await tap(); await W(9000);
  await E(() => { window.__fx = 0; const A = RS.audio, s0 = A.send; A.send = m => { if (m && m.t === 'fx' && !m.off) window.__fx++; return s0(m); }; });
  const a = await E(() => window.__st());
  ok('the song is going before leaving (audio running, notes, ohms with roles)', a.ctx === 'running' && a.sent >= 10 && a.fp.length > 0, { ctx: a.ctx, sent: a.sent, fp: a.fp, jams: a.jams });
  // ---- 1. switching away ----
  const h = await E(() => { const b0 = window.__st(); window.__setHid(true); const rec = RS.SongSave.read(); return { b0, rec: rec ? { now: rec.song.now, key: rec.key, why: rec.why } : null, saves: RSAPP.stats.songSaves }; });
  await W(300); const m0 = await E(() => ({ now: RS.audio.now(), frame: RSAPP.Sf.frame, fp: window.__fp(), t0: RSAPP.Sf.M.t0, jams: (RSAPP.Sf.jams || []).length })); await W(3700);
  const mid = await E(() => ({ now: RS.audio.now(), frame: RSAPP.Sf.frame, ctx: RS.audio.ctx.state, hidT: RS.audio.hidT }));
  const back = await E(() => { window.__setHid(false); return window.__st(); });
  await W(250); const back1 = await E(() => window.__st());
  ok('switching away: hiding writes the save + the resume record', h.rec && h.rec.key === h.b0.key && Math.abs(h.rec.now - h.b0.now) < .05 && h.saves >= 1, h.rec);
  ok('switching away: the game is paused while away (audio suspended, no frames, game clock frozen)', mid.ctx === 'suspended' && mid.frame === m0.frame && mid.hidT != null && mid.now === m0.now, { mid, at300ms: m0.frame });
  ok('switching away: on return the game clock carries on from where it stopped (4 s away, no jump)', back.now - h.b0.now < .1 && back1.now - h.b0.now < .5, { away: 4, jump: +(back.now - h.b0.now).toFixed(3), after250ms: +(back1.now - h.b0.now).toFixed(3) });
  ok('switching away: the same song on return (same ohms / roles / jams / bpm, same bar grid)', fpEq(back.fp, m0.fp) && back.t0 === m0.t0 && back.jams === m0.jams, { away: m0.fp, back: back.fp });
  await W(4000); const back2 = await E(() => window.__st());
  ok('switching away: notes come back and the audio is running again', back2.ctx === 'running' && back2.sent >= back1.sent + 3, { ctx: back2.ctx, sent: [back1.sent, back2.sent] });
  // frames stopping with no hide event (a stalled WebView): treated as a pause too
  const s0 = await E(() => { window.__stall = true; return { now: RS.audio.now(), gaps: RS.audio.pauses.gaps }; }); await W(3500);
  const s1 = await E(() => window.__unstall()); await W(300); const s2 = await E(() => ({ now: RS.audio.now(), gaps: RS.audio.pauses.gaps }));
  ok('frames stalled 3.5 s with no hide event: the clock skips the gap (as if paused)', s2.gaps === s0.gaps + 1 && s2.now - s0.now < .8, { gaps: [s0.gaps, s2.gaps], moved: +(s2.now - s0.now).toFixed(3) });
  // ---- 2. full close + reopen ----   (give one ohm an effect item first so the insert resend is exercised)
  const gave = await E(() => { const S = RSAPP.Sf, It = RS.Items, c = S.creatures.find(c => !c.dead && c.mind && !c.item); if (!It || !c) return null; const it = It.make(S, 'rev', c.x, S.ground(c.x) - 22); if (!it) return null; it.holder = c; c.item = it; return c.id; });
  await W(3000);
  const c = await E(() => { const b0 = window.__st(); window.__setHid(true); const r = RS.SongSave.read(); const its = RSAPP.Sf.creatures.filter(c => !c.dead && c.item).length; return { b0, its, rec: r && { now: r.song.now, key: r.key, u: r.u, sysI: r.sysI, bk: r.bk, cam: r.cam } }; });
  await W(800); const cm = await E(() => window.__fp()); await p.close({ runBeforeUnload: false });   // Android kills the hidden app: no more events
  p = await page(); await p.goto(URL0); await ready(); const r0 = await E(() => window.__st()); const cam = await E(() => ({ x: RSAPP.cam.x, y: RSAPP.cam.y, z: RSAPP.cam.z }));
  ok('full close: the next launch reopens the same galaxy + world', r0.resumed && r0.key === c.b0.key && r0.u === c.b0.u, { resumed: r0.resumed, key: [c.b0.key, r0.key] });
  ok('full close: the same song right after reopening (same ohms / roles / jams / bpm)', fpEq(r0.fp, cm) && r0.jams === c.b0.jams, { closed: cm, reopened: r0.fp });
  ok('full close: the game clock carries on from the saved song time (no restart at 0)', Math.abs(r0.now - c.rec.now) < 1.5 && r0.t0 === c.b0.t0, { saved: +c.rec.now.toFixed(3), reopened: +r0.now.toFixed(3) });
  ok('full close: the camera comes back where it was', Math.abs(cam.x - c.rec.cam.x) < 1 && Math.abs(cam.y - c.rec.cam.y) < 1 && Math.abs(cam.z - c.rec.cam.z) < 1e-6, { cam, rec: c.rec.cam });
  await W(800); await E(() => { window.__fx = 0; const A = RS.audio, s0 = A.send; A.send = m => { if (m && m.t === 'fx' && !m.off) window.__fx++; return s0(m); }; }); await tap(); await W(3000); const r1 = await E(() => ({ ...window.__st(), fxSent: window.__fx, fxK: RSAPP.Sf.creatures.filter(c => c.fxSlot != null && c._fxKey).length, slots: RSAPP.Sf.creatures.filter(c => c.fxSlot != null).length }));
  ok('full close: after the first touch the song plays on with its bar grid kept (not reset to the touch time)', r1.ctx === 'running' && r1.sent > 5 && r1.t0 === c.b0.t0, { sent: r1.sent, t0: [c.b0.t0, r1.t0] });
  ok('full close: effect-item inserts are sent to the new renderer', r1.slots >= 1 && r1.fxK === r1.slots && r1.fxSent >= r1.slots, { gave, slotted: r1.slots, keyed: r1.fxK, fxSent: r1.fxSent });
  // ?fresh=1 + a bad record
  await p.goto(URL0 + '?fresh=1'); await ready(); const f = await E(() => window.__st());
  ok('?fresh=1 starts a fresh random world (the old v0.7 I launch)', !f.resumed, f.resumed);
  await E(() => { RSAPP.suspendSong = () => { }; const s = RS.Store.raw.get(RS.SongSave.KEY); const d = JSON.parse(s); d.v = 0; RS.Store.raw.set(RS.SongSave.KEY, JSON.stringify(d)); }); await W(600);
  await p.goto(URL0); await ready(); const g = await E(() => window.__st());
  ok('an old / unknown resume record is ignored (fresh start, no errors)', !g.resumed && g.level === 'surface', g.resumed);
  await E(() => { RSAPP.suspendSong = () => { }; RS.Store.raw.set(RS.SongSave.KEY, '{"v":1,"song":{"now":5},"u":1,"sysI":99999,"bk":["p",0]}'); }); await W(600); await p.goto(URL0); await ready(); const g2 = await E(() => window.__st());
  ok('a broken resume record falls back to a fresh start', !g2.resumed && g2.level === 'surface', g2.resumed);
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  const pass = res.filter(Boolean).length; console.log(`SONGSAVE-PW ${pass}/${res.length}`); await b.close(); process.exit(pass === res.length ? 0 : 1); })();
