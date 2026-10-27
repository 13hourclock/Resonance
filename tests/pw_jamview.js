// v08-jamview browser check (no screenshots, no audio capture): the jam view through real touches. PORT env (default 8811) must serve THIS checkout's www.
// pinch out on empty space in a jam's middle opens it; the same pinch on an ohm still goes to DNA; body tap mutes; a ring slide sets volume (queued for the next bar);
// three-finger tap = undo, four = redo (in-view history); pinching the centre = breakdown; pinching in elsewhere leaves; Android back leaves; edits survive leaving.
const { chromium } = require('playwright'); const PORT = process.env.PORT || process.env.RS_PORT || 8811;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html?fixed=1`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const F = new Map(); const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...F].map(([id, q]) => ({ x: q[0], y: q[1], id, radiusX: 4, radiusY: 4, force: 1 })) });
  const fdown = (id, x, y) => { F.set(id, [x, y]); return send('touchStart'); }, fmove = (id, x, y) => { F.set(id, [x, y]); return send('touchMove'); }, fup = id => { const q = F.get(id); F.delete(id); return cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: q[0], y: q[1], id, radiusX: 4, radiusY: 4, force: 1 }] }); };
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a); const tap = async (x, y) => { await fdown(0, x, y); await W(40); await fup(0); };
  const pinch = async (x, y, d0, d1, steps = 10) => { await fdown(0, x - d0, y); await fdown(1, x + d0, y); await W(60); for (let k = 1; k <= steps; k++) { const d = d0 + (d1 - d0) * k / steps; await fmove(0, x - d, y); await fmove(1, x + d, y); await W(30); } await W(60); await fup(1); await fup(0); await W(250); };
  const multi = async (n, x, y) => { for (let i = 0; i < n; i++) await fdown(i, x + i * 40 - 60, y); await W(80); for (let i = n - 1; i >= 0; i--) await fup(i); await W(250); };
  let t = 0; for (; t < 60; t++) { const n = await E(() => (RSAPP.Sf.jams || []).filter(j => j.E && j.members.length >= 2).length); if (n) break; await W(1000); }
  ok('a jam forms in the fixed world', t < 60, t); if (t >= 60) { await b.close(); process.exit(1); }
  // an empty spot in the jam's middle (no ohm within 30), the camera on it, zoomed in just under the entry depth
  const aim1 = () => E(() => { const S = RSAPP.Sf, JV = RS.JamView; for (const j of S.jams) { if (!j.E || j.members.length < 2) continue; let x = 0, y = 0; for (const c of j.members) { x += c.x; y += c.y; } x /= j.members.length; y /= j.members.length;
      for (let r = 0; r <= 60; r += 6) for (let a = 0; a < 6.28; a += .5) { const wx = x + Math.cos(a) * r, wy = y + Math.sin(a) * r; const h = S.hit(wx, wy); if (!h.body && !h.creature && JV.jamAt(S, wx, wy) === j) { window.__j = j; window.__aw = [wx, wy]; RSAPP.cam.x = wx; RSAPP.cam.y = wy; RSAPP.cam.z = 3.6; const s = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, wx, wy); return { s, id: j.E.id, n: j.members.length }; } } } return null; });
  const aim = async () => { for (let i = 0; i < 40; i++) { const r = await aim1(); if (r) return r; await W(500); } return null; };   // members dance: wait for a clear middle (no ohm, no world body under the pinch)
  const enterJam = async () => { let a = null; for (let i = 0; i < 4; i++) { a = await aim(); if (!a) return null; await W(60); await pinch(a.s[0], a.s[1], 30, 150, 14); await W(500); if (await E(() => RSAPP.level === 'jamview')) return a;
      await E(() => { if (RSAPP.level !== 'surface') RSAPP.back(); }); await W(1500); } return a; };   // an ohm can wander under the pinch mid-gesture: then DNA (correctly) wins; try again
  // 2) entry: pinch out on the empty middle
  const a0 = await enterJam(); ok('an empty spot in the middle of the jam', !!a0, a0); if (!a0) { await b.close(); process.exit(1); } await W(200);
  const en = await E(() => ({ lvl: RSAPP.level, v: !!RS.JamView.view, E: RS.JamView.view && RS.JamView.view.E.id, n: RS.JamView.view && RS.JamView.view.n, bmp: !!(RS.JamView.view && RS.JamView.view.bmp) }));
  ok('pinch out deep on empty space between members opens the jam view (frozen world bitmap cached)', en.lvl === 'jamview' && en.v && en.E === a0.id && en.n >= 2 && en.bmp, en);
  if (en.lvl !== 'jamview') { console.log('dbg', JSON.stringify(await E(() => { const c = RSAPP.dna && (RSAPP.dna.c || RSAPP.dna.creature), w = window.__aw; return { cam: [RSAPP.cam.x, RSAPP.cam.y, RSAPP.cam.z], w, d: c ? Math.hypot(c.x - w[0], c.y - w[1]) : null, near: RSAPP.Sf.creatures.map(c => Math.hypot(c.x - w[0], c.y - w[1])).sort((a, b) => a - b).slice(0, 3), pb: !!RSAPP.pinchB }; }))); console.log('errors', errs); await b.close(); process.exit(1); }
  await W(800);   // the 0.6 s ease
  // 3) body tap = mute (and again = unmute)
  const sp = await E(() => { const V = RS.JamView.view, i = V.n - 1; window.__ci = V.order[i]; return RS.JamView.spotOf(V, i); });
  const m0 = await E(() => !!window.__ci.muted); await tap(sp[0], sp[1]); await W(250); const m1 = await E(() => ({ m: !!window.__ci.muted, last: RSAPP.lastJv }));
  ok('tap an ohm in the view = mute (unchanged meaning)', m1.m !== m0 && m1.last === 'mute', { m0, m1 }); await tap(sp[0], sp[1]); await W(250);
  // 4) slide along a ring = volume, queued for the next bar
  const rg = await E(() => { const V = RS.JamView.view, i = 0, c = V.order[i], r = V.ring[i]; window.__rc = c; const a = Math.PI * .75; return { x: V.cx + Math.cos(a) * r, y: V.cy + Math.sin(a) * r, tx: -Math.sin(a), ty: Math.cos(a), id: c.id }; });
  const u0 = await E(() => RS.JamView.view.U.length); await fdown(0, rg.x, rg.y); await W(60); for (let k = 1; k <= 8; k++) { await fmove(0, rg.x + rg.tx * 14 * k * -1, rg.y + rg.ty * 14 * k * -1); await W(25); } await fup(0); await W(150);
  const vo = await E(id => { const J = RS.JamView.view.E.jv; return { last: RSAPP.lastJv, q: J.q.filter(o => o.k === 'vol').length, v: J.vol[id], U: RS.JamView.view.U.length }; }, rg.id);
  ok('slide along a ring = volume (an op on the history, landing on the bar)', vo.last === 'vol' && vo.U === u0 + 1 && (vo.q === 1 || vo.v != null), vo);
  // 5) three-finger tap = undo, four = redo, both from the view's own history
  await multi(3, 206, 760); const un = await E(() => ({ U: RS.JamView.view.U.length, R: RS.JamView.view.Rd.length, multi: RSAPP.lastMulti, lvl: RSAPP.level }));
  ok('three-finger tap = undo inside the view (still in the view)', un.U === u0 && un.R === 1 && un.multi === 3 && un.lvl === 'jamview', un);
  await multi(4, 206, 760); const re = await E(() => ({ U: RS.JamView.view.U.length, R: RS.JamView.view.Rd.length, multi: RSAPP.lastMulti }));
  ok('four-finger tap = redo', re.U === u0 + 1 && re.R === 0 && re.multi === 4, re);
  // 6) pinch the centre = breakdown (queued for the phrase end)
  const cc = await E(() => [RS.JamView.view.cx, RS.JamView.view.cy]); await pinch(cc[0], cc[1], 70, 22, 10); await W(200);
  const bd = await E(() => ({ last: RSAPP.lastJv, lvl: RSAPP.level, q: RS.JamView.view && RS.JamView.view.E.jv.q.filter(o => o.k === 'bd').length }));
  ok('pinch the centre = breakdown (stays in the view)', bd.last === 'breakdown' && bd.lvl === 'jamview' && bd.q === 1, bd);
  // 7) pinch in away from the centre = leave; the edits stay with the jam
  await pinch(206, 700, 150, 30, 12); await W(400);
  const ex = await E(id => ({ lvl: RSAPP.level, v: !!RS.JamView.view, last: RSAPP.lastJv, jv: !!(window.__j.E.jv), q: window.__j.E.jv ? window.__j.E.jv.q.length : 0, vol: window.__j.E.jv && window.__j.E.jv.vol[id] }), rg.id);
  ok('pinch in elsewhere = back to the world (the jam keeps its edits)', ex.lvl === 'surface' && !ex.v && ex.jv && (ex.q > 0 || ex.vol != null), ex);
  // 8) Android back leaves too
  await W(1000); await enterJam(); const in2 = await E(() => RSAPP.level);
  await E(() => RSAPP.back()); await W(300); const bk = await E(() => ({ lvl: RSAPP.level, last: RSAPP.lastJv }));
  ok('Android back leaves the jam view (to the world, not further)', in2 === 'jamview' && bk.lvl === 'surface', { in2, bk });
  // 9) the same deep pinch on an ohm still opens DNA
  const on = await E(() => { const j = RSAPP.Sf.jams.find(j => j.E && j.members.length >= 2), c = j.members[0]; RSAPP.cam.x = c.x; RSAPP.cam.y = c.y; RSAPP.cam.z = 3.6; const s = RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, c.x, c.y); return s; });
  await W(100); await pinch(on[0], on[1], 30, 150, 14); await W(300); const l1 = await E(() => ({ lvl: RSAPP.level, z: RSAPP.cam.z }));
  ok('a deep pinch on an ohm still opens DNA (not the jam view)', l1.lvl !== 'jamview' && (l1.lvl === 'dna' || l1.z > 4.2), l1);
  await E(() => { if (RSAPP.level !== 'surface') RSAPP.back(); }); await W(400); await E(() => { if (RSAPP.level !== 'surface') RSAPP.back(); }); await W(400);
  await W(1500); ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); const n = res.filter(Boolean).length; console.log(`pw_jamview: ${n}/${res.length}`); process.exit(n === res.length ? 0 : 1); })();
