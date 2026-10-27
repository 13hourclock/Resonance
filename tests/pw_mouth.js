// v08-mouth browser check (no screenshots): the mouth through real touches. PORT / RS_PORT must serve THIS checkout's www.
// every on-screen ohm draws a mouth (and the look is not rebuilt each frame); the first play mode on a vocal ohm shows the ghost once (saved, not after a reload);
// a double tap on the mouth opens the big mouth (a single tap does not); the tube double tap still does; a non-vocal ohm's mouth opens nothing;
// node taps in play mode are added to the ohm's phrase on leaving play mode, survive save + reload, and no page errors.
const { chromium } = require('playwright'); const PORT = process.env.PORT || process.env.RS_PORT || 8811;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html?fixed=1`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const F = new Map(); const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...F].map(([id, q]) => ({ x: q[0], y: q[1], id, radiusX: 4, radiusY: 4, force: 1 })) });
  const fdown = (id, x, y) => { F.set(id, [x, y]); return send('touchStart'); }, fup = id => { const q = F.get(id); F.delete(id); return cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: q[0], y: q[1], id, radiusX: 4, radiusY: 4, force: 1 }] }); };
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a); const tap = async (x, y) => { await fdown(0, x, y); await W(40); await fup(0); }, dtap = async q => { await tap(q[0], q[1]); await W(120); await tap(q[0], q[1]); await W(350); };
  const live = 'c => !c.dead && !c.caught && !c.fossil && c.P && c.P.tract';
  await W(1500); const d = await E(() => ({ draws: RS.MouthLook.stats.draws, looks: RS.MouthLook.stats.looks, n: RSAPP.Sf.creatures.length })); await W(1500); const d2 = await E(() => ({ draws: RS.MouthLook.stats.draws, looks: RS.MouthLook.stats.looks }));
  ok('every on-screen ohm draws its mouth each frame; the look is built once (not per frame)', d2.draws > d.draws + 30 && d2.looks === d.looks && d.looks <= d.n * 2, { d, d2 });
  const pick = await E(L => { const S = RSAPP.Sf, f = eval(L), cs = S.creatures.filter(f), v = cs.filter(c => RS.MouthLook.vocal(c)).sort((a, b) => b.P.tract.amt - a.P.tract.amt)[0], nv = cs.find(c => !RS.MouthLook.vocal(c) && c !== v);
    let forced = false; const c = v || cs.sort((a, b) => b.P.tract.amt - a.P.tract.amt)[0]; if (c && !v) { c.words = ['la']; forced = true; } window.__c = c; window.__n = nv || null; return c ? { id: c.id, forced, nv: nv ? nv.id : null, n: cs.length } : null; }, live);
  if (!pick) { ok('an ohm with a throat exists', false); await b.close(); process.exit(1); }
  { await E(() => { RSAPP.play = RS.Play.enter(RSAPP.Sf, window.__c); }); const t = await E(() => ({ h: !!RSAPP.Sf._mhint, done: RS.Guide.state(RSAPP.Sf).done, saved: RS.Guide.state(RSAPP.Sf).mouthHint })); await E(() => RSAPP.back()); await W(300);
    ok('GHOST: not during the tutorial (fresh start): kept for after it', !t.h && !t.done && !t.saved, t); await E(() => { RS.Guide.state(RSAPP.Sf).done = true; }); }
  await E(() => { RSAPP.play = RS.Play.enter(RSAPP.Sf, window.__c); }); const h = await E(() => ({ h: RSAPP.Sf._mhint ? RSAPP.Sf._mhint.id : null, saved: RS.Guide.state(RSAPP.Sf).mouthHint })); await W(2500);
  ok('GHOST: the first play mode on a vocal ohm schedules the one-time mouth double-tap ghost (saved as shown)', h.h === pick.id && h.saved === 1, { h, pick });
  await W(1800); ok('GHOST: it plays once and is gone', await E(() => !RSAPP.Sf._mhint));
  const mp = async () => E(() => { const q = RS.MouthLook.pt(RSAPP.Sf, window.__c); return RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, q[0], q[1]); });
  let m = await mp(); await tap(m[0], m[1]); await W(700); ok('a single tap on the mouth does not open the big mouth', await E(() => !RS.Mouth.cur && !!RSAPP.play));
  m = await mp(); await dtap(m); const op = await E(() => ({ open: !!RS.Mouth.cur, last: RSAPP.lastTap })); ok('a double tap on the mouth opens the big mouth', op.open && op.last === 'mouth', op);
  const out = await E(() => RS.Mouth.cur && RS.Mouth.outPt(RS.Mouth.cur)); if (out) { await tap(out[0], out[1]); await W(300); }
  m = await mp(); const off = await E(([x, y]) => { const z = RSAPP.cam.z, R = RS.MouthLook.headR(window.__c); return [x + Math.min(24, R * .4 * z), y + 8]; }, m); await dtap(off);
  ok('the target is generous: a double tap ~24 px beside the mouth still opens it', await E(() => !!RS.Mouth.cur)); await E(() => RSAPP.mouthClose()); await W(200);
  const tube = await E(() => { const w = RS.Play.tubePt(RSAPP.play, .5); return w && RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, w[0], w[1]); }); await dtap(tube);
  ok('the tube double tap still opens it (unchanged)', await E(() => !!RS.Mouth.cur && RSAPP.lastTap === 'mouth')); await E(() => RSAPP.mouthClose()); await W(2500);
  // record: three node taps, then leave play mode
  const nodes = await E(() => { const s = RSAPP.play; return s.nodes.filter(o => !o.pad).slice(1, 4).map(o => { const w = RS.Play.pos(RSAPP.Sf, s, o); return [RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, w[0], w[1]), o.deg]; }); });
  await E(() => { window.__c.addPh = null; RSAPP.play.rec = []; }); for (const [q] of nodes) { await tap(q[0], q[1]); await W(450); } const nrec = await E(() => (RSAPP.play.rec || []).length);   // (the single tap on the mouth above may have played a limb-tip node under it: a real played note, cleared here)
  await E(() => RSAPP.back()); await W(300); const A = await E(() => ({ play: !!RSAPP.play, add: window.__c.addPh }));
  ok('RECORD: node taps in play mode are added to the ohm\'s phrase when leaving play mode (as its scale steps)', !A.play && nrec === 3 && A.add && A.add.notes.length === 3 && A.add.notes.map(n => n.deg).join() === nodes.map(q => q[1]).join(), { nrec, A, degs: nodes.map(q => q[1]) });
  if (pick.nv) { await E(() => { RSAPP.play = RS.Play.enter(RSAPP.Sf, window.__n); }); await W(2500); const nh = await E(() => !RSAPP.Sf._mhint || RSAPP.Sf._mhint.id !== window.__n.id);
    const q = await E(() => { const w = RS.MouthLook.pt(RSAPP.Sf, window.__n); return RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, w[0], w[1]); }); await dtap(q); const r = await E(() => ({ open: !!RS.Mouth.cur, last: RSAPP.lastTap, play: !!RSAPP.play }));
    ok('NON-VOCAL: no ghost, and a double tap on its tiny mouth opens nothing (stays in play mode)', nh && !r.open && r.last !== 'mouth' && r.play, r); if (r.open) await E(() => RSAPP.mouthClose()); await E(() => RSAPP.back()); await W(300); }
  else ok('NON-VOCAL: (no non-vocal ohm in this world, skipped)', true);
  // save + reload: the additions and the 'ghost shown' flag are kept
  const id = pick.id, keep = JSON.stringify(A.add); await E(() => RSAPP.save()); await W(800); await p.reload(); await W(2500);
  const R2 = await E(id => { const c = RSAPP.Sf.creatures.find(q => q.id === id); return { found: !!c, add: c ? JSON.stringify(c.addPh) : null, hint: RS.Guide.state(RSAPP.Sf).mouthHint }; }, id);
  ok('SAVE: after a reload the ohm still has its additions; the ghost flag is kept', R2.found && R2.add === keep && R2.hint === 1, { R2, keep });
  if (R2.found) { await E(id => { const c = RSAPP.Sf.creatures.find(q => q.id === id); if (!RS.MouthLook.vocal(c)) c.words = ['la']; RSAPP.play = RS.Play.enter(RSAPP.Sf, c); }, id); ok('GHOST: not shown again after the reload', await E(() => !RSAPP.Sf._mhint)); await E(() => RSAPP.back()); }
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); const n = res.filter(Boolean).length; console.log(`pw_mouth: ${n}/${res.length}`); process.exit(n === res.length ? 0 : 1); })();
