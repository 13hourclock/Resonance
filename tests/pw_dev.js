// v0.8a10 browser check of the hidden DEV PANEL through REAL touch input (CDP): 3-finger 2 s hold opens / closes it (ring while holding,
// early lift / movement = nothing, a quick 3-finger tap is still undo), a tap while open identifies (consumed: no play / join / mute / pop),
// the ohm sheet, health, caught errors, layout (small, never over the closing area) and zero cost when closed.
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 4, radiusY: 4, force: .5 })) });
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a);
  const tap = async (x, y) => { await T('touchStart', [[x, y]]); await W(40); await T('touchEnd', []); await W(120); };
  const F3 = [[150, 640], [220, 640], [185, 700]];
  const fingers = async (pts, hold, o = {}) => { await T('touchStart', pts); if (o.mid) await o.mid(); if (o.move) { await W(60); await T('touchMove', pts.map(q => [q[0] + o.move, q[1] + o.move])); } await W(hold); await T('touchEnd', []); await W(200); };
  await E(() => { for (const c of RSAPP.Sf.creatures) c.breedCool = 1e9; const S = RSAPP.Sf; window.__u = 0; const u = RSAPP.undo; RSAPP.undo = (...a) => { window.__u++; return u(...a); }; window.__tap = 0; const t = S.tap; S.tap = (...a) => { window.__tap++; return t(...a); }; window.__hold = 0; const h = S.hold; S.hold = (...a) => { window.__hold++; return h(...a); }; });
  const st = () => E(() => ({ open: RS.Dev.open, panel: !!document.getElementById('devpanel'), ring: !!document.getElementById('devring'), timer: RS.Dev.timer, raf: RS.Dev.raf, hold: !!RS.Dev.hold, u: window.__u, tap: window.__tap, hold2: window.__hold }));
  // build constant in step with gradle
  const gr = fs.readFileSync(path.join(__dirname, '../android/app/build.gradle'), 'utf8'), vc = +(gr.match(/versionCode\s+(\d+)/) || [])[1], vn = (gr.match(/versionName\s+"([^"]+)"/) || [])[1];
  const bd = await E(() => RS.Dev.BUILD); ok('D0 the panel\'s build label matches build.gradle', bd.code === vc && bd.name === vn, { bd, vc, vn });
  let s = await st(); ok('D1 closed by default: no panel, no ring, no timer, no frame callback (zero cost)', !s.open && !s.panel && !s.ring && !s.timer && !s.raf, s);
  ok('D1b the guide never hints it', !/Dev\b|dev panel|devpanel/i.test(fs.readFileSync(path.join(__dirname, '../www/js/guide.js'), 'utf8')));
  // quick tap = undo, no panel
  const u0 = s.u; await fingers(F3, 80); s = await st(); ok('D2 a quick 3-finger tap is still undo (panel stays closed)', s.u === u0 + 1 && !s.open && !s.ring, s);
  // early lift: ring shows, then nothing
  let ringMid = false; await fingers(F3, 1000, { mid: async () => { await W(300); ringMid = await E(() => !!document.getElementById('devring')); } }); s = await st();
  ok('D3 a ring fills while 3 fingers rest; lifting at 1.3 s does nothing (no panel, no undo)', ringMid && !s.open && !s.ring && !s.hold && s.u === u0 + 1, { ringMid, s });
  // moved > 30 px: cancelled
  await fingers(F3, 2300, { move: 40 }); s = await st(); ok('D4 moving the fingers > 30 px cancels the hold', !s.open && !s.ring && s.u === u0 + 1, s);
  // open
  await fingers(F3, 2300); s = await st(); ok('D5 three fingers held still 2 s open the panel; the lift does not undo', s.open && s.panel && !s.ring && s.u === u0 + 1 && s.timer, s);
  const box = await E(() => { const r = document.getElementById('devpanel').getBoundingClientRect(); const cs = getComputedStyle(document.getElementById('devpanel')); return { x: r.x, y: r.y, w: r.width, h: r.height, W: innerWidth, H: innerHeight, ov: cs.overflowY, bg: cs.backgroundColor }; });
  ok('D6 small, scrollable, semi-transparent, top-left: the lower screen (closing hold) stays free', box.w <= box.W * .5 && box.h <= box.H * .56 && box.y + box.h < 640 && box.ov === 'auto' && /rgba\(.*0\.6/.test(box.bg), box);
  await W(1300); let hl = await E(() => RS.Dev.health(RSAPP)); const nC = await E(() => RSAPP.Sf.creatures.length);
  ok('D7 health: fps, ohm count, off-screen, voices, audio, build + vc, save size, error count', hl.fps > 0 && hl.ohms === nC && hl.offScreen >= 0 && /modal/.test(hl.voices) && /vc 25|vc \d+/.test(hl.build) && hl.save && /input/.test(hl.errors), hl);
  // identify an ohm (consumed)
  const os = await E(() => { const S = RSAPP.Sf; for (const c of S.creatures) { const q = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y); if (q[0] > 30 && q[0] < RSAPP.Wd - 30 && q[1] > RSAPP.Ht * .56 && q[1] < RSAPP.Ht - 40 && S.creatureAt(c.x, c.y, 14) === c) return { x: q[0], y: q[1], id: c.id }; } for (const c of S.creatures) { const q = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y); if (q[0] > RSAPP.Wd * .52 && q[0] < RSAPP.Wd - 20 && q[1] > 20 && q[1] < RSAPP.Ht - 40) return { x: q[0], y: q[1], id: c.id }; } return null; });
  if (os) { const t0 = await st(); await tap(os.x, os.y); const sel = await E(() => RS.Dev.sel); s = await st();
    ok('D8 a tap on an ohm while open shows its sheet; the tap is consumed (no join / mute / listen)', sel && sel.type === 'ohm' && s.tap === t0.tap && s.hold2 === t0.hold2, { os, type: sel && sel.type, tap: [t0.tap, s.tap] });
    ok('D9 the ohm sheet: species, instrument, named genes, xp/sk/jn/pn, learned, parents/children, tally, mood/state, jam + role', sel && ['species', 'instrument', 'genes', 'tally', 'jam', 'children', 'parents'].every(k => k in sel) && /size/.test(sel.genes) && 'xp' in sel && 'mood' in sel, sel && Object.keys(sel));
    const txt = await E(() => document.getElementById('devpanel').textContent); ok('D9b the sheet is on the panel as text', /ohm/.test(txt) && /tally/.test(txt) && /fps/.test(txt)); }
  else ok('D8 an ohm on screen to identify', false);
  // identify an item + a body + nothing
  const spot = await E(() => { const S = RSAPP.Sf; for (let yy = .6; yy < .9; yy += .03) for (let xx = .2; xx < .85; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y); if (!S.creatures.some(c => Math.hypot(c.x - w[0], c.y - w[1]) < 60) && !(S.items || []).some(i => Math.hypot(i.x - w[0], i.y - w[1]) < 40)) { const h = S.hit(w[0], w[1]); if (!h.body && !h.creature) return [x, y]; } } return [300, 600]; });
  const it = await E(sp => { const S = RSAPP.Sf, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, sp[0], sp[1]); const i = RS.Items.make(S, 'dly', w[0], w[1], { force: true }); return !!i; }, spot); await W(120);
  const iq = await E(() => { const S = RSAPP.Sf, i = S.items[S.items.length - 1], p0 = RS.Items.pos(S, i), q = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, p0[0], p0[1]); return [q[0], q[1]]; });
  await tap(iq[0], iq[1]); let sel = await E(() => RS.Dev.sel); ok('D10 a tap on an item shows its effect kind + settings', it && sel && /item: dly/.test(sel.type) && sel.settings, sel);
  const bq = await E(() => { const S = RSAPP.Sf; for (let yy = .04; yy < .96; yy += .015) for (let xx = .04; xx < .96; xx += .015) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy; if (x < RSAPP.Wd * .55 && y < RSAPP.Ht * .5) continue; const w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y), h = S.hit(w[0], w[1]); if (h.body && !h.creature && !h.bubble && !(h.body.meta && h.body.meta.item) && !S.creatureAt(w[0], w[1], 40)) return [x, y]; } return null; });
  if (!bq) ok('D11 a world body on screen to identify', false); else { await tap(bq[0], bq[1]); sel = await E(() => RS.Dev.sel); ok('D11 a tap on a world body shows type / role, material, who made it', sel && sel.material && sel.made, sel); }
  await tap(380, 600); sel = await E(() => RS.Dev.sel); ok('D12 a tap anywhere is identified (or "nothing here") and never crashes', sel && sel.type && sel.type !== 'error', sel);
  // one-finger drags still work while open (the down is only deferred)
  const sp2 = await E(() => { const S = RSAPP.Sf; for (let yy = .45; yy < .85; yy += .03) for (let xx = .55; xx < .85; xx += .05) { const x = RSAPP.Wd * xx, y = RSAPP.Ht * yy, w = RS.Render.toWorld(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y); if (!S.creatures.some(c => Math.hypot(c.x - w[0], c.y - w[1]) < 140) && !(S.items || []).some(i => Math.hypot(i.x - w[0], i.y - w[1]) < 90)) { const h = S.hit(w[0], w[1]); if (!h.body && !h.creature) return [x, y]; } } return [260, 600]; });
  const nb = await E(() => { RSAPP.lastStroke = '__'; return RSAPP.Sf.creatures.length; });
  { const pts = []; for (let i = 0; i < 90; i++) { const u = i / 89, a = u * 3 * 2 * Math.PI, r = 50 * (.15 + .85 * u); pts.push([sp2[0] + r * Math.cos(a), sp2[1] + r * Math.sin(a)]); } await T('touchStart', [pts[0]]); for (let i = 1; i < pts.length; i++) { await W(9); await T('touchMove', [pts[i]]); } await W(20); await T('touchEnd', []); await W(600); }
  const clay = await E(nb => RSAPP.lastStroke !== '__' || !!RSAPP.Sf.clay || RSAPP.Sf.creatures.length > nb, nb); ok('D13 strokes still reach the game while open (only taps are consumed): a spiral is a stroke', clay && (await E(() => RS.Dev.open)), { sp2, st: await E(() => String(RSAPP.lastStroke).slice(0, 80)) });
  await E(() => { const S = RSAPP.Sf; if (S.clay) RS.Mold.hatch(S, 'spiral'); });
  // caught errors land in the list
  await E(() => RSAPP.inputFail(new Error('pw_dev probe'), 'probe')); await W(600); const tx2 = await E(() => document.getElementById('devpanel').textContent);
  ok('D14 the last caught errors (App.inputFail) are listed', /pw_dev probe/.test(tx2) && (await E(() => RS.Dev.errs.length)) >= 1);
  // close
  const u1 = (await st()).u; await fingers(F3, 2300); s = await st(); ok('D15 the same hold closes it; closed = no timer, no frame callback, no DOM', !s.open && !s.panel && !s.timer && !s.raf && s.u === u1, s);
  // after closing a tap plays normally again
  if (os) { const t0 = await st(); await E(() => { RSAPP.lastTap = '__'; }); const q = await E(id => { const c = RSAPP.Sf.creatures.find(o => o.id === id); const s2 = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y); return [s2[0], s2[1]]; }, os.id); await tap(q[0], q[1]); await W(400); s = await st(); const lt = await E(() => RSAPP.lastTap); ok('D16 closed: a tap reaches the game again', s.tap > t0.tap || lt !== '__', { tap: [t0.tap, s.tap], lt: String(lt).slice(0, 60) }); }
  // works on other levels (the recogniser is level-independent)
  await E(() => RSAPP.Sf && RSAPP.Sf.creatures.length); 
  ok('D17 no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); const f = res.filter(x => !x).length; console.log(`\npw_dev: ${res.length - f}/${res.length}`); process.exit(f ? 1 : 0); })();
