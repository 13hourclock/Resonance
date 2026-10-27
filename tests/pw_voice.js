// v08-voice browser check (no screenshots): the big mouth through real touches. PORT env (default 8811) must serve THIS checkout's www.
// tube double-tap in play mode opens it; a double tap on a note node does not; tongue drag sings (live tract messages); a second finger on the arc
// sets the pitch; three-finger tap = undo; tap outside closes; Android back closes the mouth first (play mode stays); leaving play closes it.
const { chromium } = require('playwright'); const PORT = process.env.PORT || process.env.RS_PORT || 8811;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html?fixed=1`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500); const cdp = await ctx.newCDPSession(p);
  const F = new Map(); const send = type => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: [...F].map(([id, q]) => ({ x: q[0], y: q[1], id, radiusX: 4, radiusY: 4, force: 1 })) });
  const fdown = (id, x, y) => { F.set(id, [x, y]); return send('touchStart'); }, fmove = (id, x, y) => { F.set(id, [x, y]); return send('touchMove'); }, fup = id => { const q = F.get(id); F.delete(id); return cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: q[0], y: q[1], id, radiusX: 4, radiusY: 4, force: 1 }] }); };   // CDP touchEnd lists the point being lifted
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a); const tap = async (x, y) => { await fdown(0, x, y); await W(40); await fup(0); };
  const ent = await E(() => { const S = RSAPP.Sf, c = S.creatures.filter(c => !c.dead && !c.caught && !c.fossil && c.P.tract && c.P.tract.amt > .2).sort((a, b) => b.P.tract.amt - a.P.tract.amt)[0]; if (!c) return null; RSAPP.play = RS.Play.enter(S, c); window.__c = c; return { id: c.id, amt: c.P.tract.amt }; });
  if (!ent) { ok('a creature with a throat exists', false); await b.close(); process.exit(1); } await W(2500);
  const scr = (wx, wy) => E(([x, y]) => RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, x, y), [wx, wy]);
  const node = await E(() => { const s = RSAPP.play, o = s.nodes.filter(o => !o.pad)[1], w = RS.Play.pos(RSAPP.Sf, s, o); return RS.Render.toScreen(RSAPP.cam, RSAPP.Wd, RSAPP.Ht, w[0], w[1]); });
  await tap(node[0], node[1]); await W(120); await tap(node[0], node[1]); await W(500);
  ok('a double tap on a note node in play mode does NOT open the mouth (unchanged)', await E(() => !RS.Mouth.cur && !!RSAPP.play), await E(() => RSAPP.lastTap)); await W(500);
  const tubeW = await E(() => RS.Play.tubePt(RSAPP.play, .5)), tube = await scr(tubeW[0], tubeW[1]);
  await tap(tube[0], tube[1]); await W(120); await tap(tube[0], tube[1]); await W(300);
  const op = await E(() => ({ open: !!RS.Mouth.cur, last: RSAPP.lastTap, sent: RS.Mouth.stats.sent, reserve: RS.Vocal.reserve }));
  ok('a double tap on the throat tube opens the big mouth', op.open && op.last === 'mouth' && op.reserve === 1, op);
  if (!op.open) { console.log('errors', errs); await b.close(); process.exit(1); }
  const G = await E(() => { const M = RS.Mouth.cur, V = RS.Vocal.VW; return { a: RS.Mouth.tonguePt(M, ...V.AA), i: RS.Mouth.tonguePt(M, ...V.IY), arcLo: RS.Mouth.arcPt(M, .2), arcHi: RS.Mouth.arcPt(M, .8), roof: RS.Mouth.roofPt(M, .55), out: RS.Mouth.outPt(M) }; });
  const s0 = await E(() => RS.Mouth.stats.sent); await fdown(0, ...G.a); await W(150); for (let k = 1; k <= 8; k++) { await fmove(0, G.a[0] + (G.i[0] - G.a[0]) * k / 8, G.a[1] + (G.i[1] - G.a[1]) * k / 8); await W(30); }
  const tg = await E(() => ({ ...RS.Mouth.cur.last, sent: RS.Mouth.stats.sent }));
  ok('tongue drag sings: voiced, the tongue moves front (live tract messages sent)', tg.vo === 1 && tg.tu > .55 && tg.sent > s0 + 3, tg);
  await fdown(1, ...G.arcLo); await W(120); const d0 = await E(() => RS.Mouth.cur.deg); if (process.env.DBG) console.log('dbg', JSON.stringify(await E(() => { const M = RS.Mouth.cur; return { pid: M.pitchId, tid: M.tongueId, ptr: [...M.ptr.values()].map(q => [q.id, q.r]), ids: RSAPP.mouthIds ? [...RSAPP.mouthIds] : null }; })), JSON.stringify(G)); await fmove(1, ...G.arcHi); await W(150); const d1 = await E(() => ({ deg: RS.Mouth.cur.deg, f0: RS.Mouth.cur.last.f0, vo: RS.Mouth.cur.last.vo }));
  await fup(1); await W(120); const af = await E(() => RS.Mouth.cur.last.vo); if (process.env.DBG) console.log('dbg2', JSON.stringify(await E(() => { const M = RS.Mouth.cur; return { pid: M.pitchId, tid: M.tongueId, used: M.pitchUsed, ptr: [...M.ptr.values()].map(q => [q.id, q.r]), last: RSAPP.lastMouth }; }))); await fup(0); await W(100);
  ok('a second finger on the arc sets the pitch (higher up = higher step); lifting it stops the voice', d1.deg > d0 && d1.vo === 1 && af === 0, { d0, d1, after: af });
  await fdown(0, ...G.roof); await W(60); const hap = await E(() => RS.Mouth.cur.last.man); await fup(0); await W(80); ok('roof tap = a stop (closure, then release)', hap === 1 && await E(() => RS.Mouth.cur.lastCons === 'K'));
  await fdown(0, G.a[0], G.a[1]); await fdown(1, G.i[0], G.i[1]); await fdown(2, G.roof[0], G.roof[1] + 30); await W(80); await fup(2); await fup(1); await fup(0); await W(200);
  ok('three-finger tap inside the mouth = undo (and it stays open)', await E(() => RSAPP.lastMouth === 'undo' && !!RS.Mouth.cur), await E(() => RSAPP.lastMouth));
  await tap(G.out[0], G.out[1]); await W(250); ok('tap outside closes the mouth (play mode stays)', await E(() => !RS.Mouth.cur && RSAPP.lastMouth === 'close' && !!RSAPP.play && RS.Vocal.reserve === 0));
  await tap(tube[0], tube[1]); await W(120); await tap(tube[0], tube[1]); await W(300); const re = await E(() => !!RS.Mouth.cur); await E(() => RSAPP.back()); await W(200);
  ok('Android back closes the mouth first (still in play mode)', re && await E(() => !RS.Mouth.cur && !!RSAPP.play));
  await tap(tube[0], tube[1]); await W(120); await tap(tube[0], tube[1]); await W(300); await E(() => RSAPP.back()); await E(() => RSAPP.back()); await W(200);
  const st = await E(() => ({ cur: !!RS.Mouth.cur, play: !!RSAPP.play, ticks: RS.Mouth.stats.ticks, sent: RS.Mouth.stats.sent })); await W(1500); const st2 = await E(() => ({ ticks: RS.Mouth.stats.ticks, sent: RS.Mouth.stats.sent }));
  ok('leaving play mode: closed, and nothing ticks or sends afterwards', !st.cur && !st.play && st2.ticks === st.ticks && st2.sent === st.sent, { st, st2 });
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  await b.close(); const n = res.filter(Boolean).length; console.log(`pw_voice: ${n}/${res.length}`); process.exit(n === res.length ? 0 : 1); })();
