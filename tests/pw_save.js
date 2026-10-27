// v0.8 H browser check (replaces the v0.5a version; same intents on the rs2 layout): IndexedDB-first; an unchanged world stores nothing;
// a change survives a reload and a wiped localStorage; a corrupt copy falls back to the .bak; a world too big for localStorage round-trips;
// random start: three launches, a change in each, all three reachable (profile -> galaxy -> world) and load with their change, other
// galaxies show as smudges at minimum zoom and flyGalaxy reaches them; saving never costs a long frame; the hide flush is < 30 ms.
const { chromium } = require('playwright');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a);
  const URL = 'http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html', ready = () => p.waitForFunction(() => window.RSAPP && RSAPP.Sf && RS.Save, null, { timeout: 8000 });
  const load = async (q = '?fixed=1') => { await p.goto(URL + q); await ready(); await W(400); };
  const probe = () => E(() => RSAPP.Sf.mods.saveProbe), keys = pre => E(pre => Object.keys(RS.Store.mem).filter(k => k.startsWith(pre) && !k.endsWith('.bak')), pre);
  const edit = v => E(v => { const Sf = RSAPP.Sf; Sf.mods.saveProbe = v; RS.Save.mark(Sf, null); RSAPP.save(); }, v);
  await load(); ok('store loaded from IndexedDB before the app started; rs2 layout', await E(() => RS.Store.loaded && RS.Store.IDB.ok && RS.Store.prefix === 'rs2:'));
  await W(2600); await E(() => RSAPP.save()); const w0 = await keys('rs2:w:'), c0 = await keys('rs2:c:'), p0 = await keys('rs2:p');
  ok('an unchanged world stores nothing (the profile is stored)', w0.length === 0 && c0.length === 0 && p0.length === 1, { w0, c0: c0.length, p0 });
  await edit(42); await W(300); await load(); ok('a change survives a reload', (await probe()) === 42 && (await E(() => RS.Save.isChanged(RSAPP.Sf.key))), await probe());
  await edit(44); await W(300); await E(() => { RSAPP.save = () => { }; localStorage.clear(); }); await load();
  ok('wiped localStorage: restored straight from IndexedDB', (await probe()) === 44, await probe());
  await edit(45); await edit(46); await W(300); await E(() => { RS.Store.raw.set(RSAPP.Sf.key, '{"broken'); RSAPP.save = () => { }; }); await W(300); await load();
  ok('corrupt copy -> the previous good copy (.bak) loads', (await probe()) === 45, await probe());
  await E(() => { const Sf = RSAPP.Sf; Sf.mods.big = 'x'.repeat(400000); RS.Save.mark(Sf, null); RSAPP.save(); }); await W(500); await E(() => { RSAPP.save = () => { }; localStorage.clear(); }); await load();
  const big = await E(() => (RSAPP.Sf.mods.big || '').length); ok('a world header bigger than the localStorage mirror allows round-trips via IndexedDB', big === 400000, big);
  await E(() => { delete RSAPP.Sf.mods.big; RS.Save.mark(RSAPP.Sf, null); RSAPP.save(); }); await W(300);
  // random start: three launches (each a fresh random world), one change in each
  const L = []; for (let i = 0; i < 3; i++) { await load(''); await W(300); const k = await E(() => RSAPP.Sf.key), u = await E(() => RSAPP.meta.useed); await edit(100 + i); await W(200); L.push({ k, u, v: 100 + i }); }
  await load(''); const cw = await E(() => RS.Save.changedWorlds().map(w => w.key)), gal = await E(() => RS.Save.galaxies()), launches = await E(() => RS.Save.prof.stats.launches);
  const back = []; for (const l of L) back.push(await E(l => { const d = RS.Save.loadWorld(l.k); return d && d.mods && d.mods.saveProbe; }, l));
  ok('three launches: each changed world is in its galaxy index and its galaxy is in the profile; each loads with its change', L.every(l => cw.includes(l.k) && gal.includes(l.u)) && back.every((v, i) => v === L[i].v) && launches >= 3, { L, back, launches, nGal: gal.length });
  const off = await E(() => { RSAPP.gcam.z = .4; const n = RSAPP.smudges().length; RSAPP.gcam.z = 1; return n; });
  ok('Q59 not approved: by default no smudges, so galaxy double tap is unchanged from v0.7', off === 0, { off });
  const sm = await E(() => { RSAPP.wayBack = true; RSAPP.gcam.z = .4; const s = RSAPP.smudges(); RSAPP.gcam.z = 1; return s.map(g => g.u); });
  const cur = await E(() => RSAPP.meta.useed), want = [...new Set(L.map(l => l.u))].filter(u => u !== cur);
  ok('minimum galaxy zoom shows every other changed galaxy as a smudge (none at normal zoom)', want.every(u => sm.includes(u)) && (await E(() => RSAPP.smudges().length)) === 0, { sm, want });
  const tgt = L[0]; const got = await E(t => { const [, , u, sys, bk] = t.k.split(':'); RSAPP.leaveSurface(); RSAPP.flyGalaxy(+u); const S = RSAPP.system(+sys); const body = [...S.bodies, ...S.bodies.flatMap(q => q.moons || [])].find(q => RSAPP.bodyKey(S, q) === bk); RSAPP.enterSurface(+sys, body, 0); return { key: RSAPP.Sf.key, v: RSAPP.Sf.mods.saveProbe, glow: RS.Save.isChanged(RSAPP.Sf.key) }; }, tgt);
  ok('way back: fly to the galaxy (smudge target) and enter the glowing body -> your change loads', got.key === tgt.k && got.v === tgt.v && got.glow, got);
  // saving cost while playing: edits every 700 ms for 12 s; slices and the hide flush
  await E(() => { RS.Save.stats.sliceMs.length = 0; window.__long = 0; let last = performance.now(); const f = () => { const n = performance.now(); if (n - last > 50) window.__long++; last = n; if (window.__run) requestAnimationFrame(f); }; window.__run = 1; requestAnimationFrame(f); });
  for (let i = 0; i < 17; i++) { await E(i => { const Sf = RSAPP.Sf; Sf.mods.soakN = i; RS.Save.markAt(Sf, Sf.view.cx, Sf.view.cy); }, i); await W(700); }
  await W(2500); const sl = await E(() => { window.__run = 0; const a = RS.Save.stats.sliceMs; return { n: a.length, max: a.length ? Math.max(...a) : 0 }; });
  await E(() => { const Sf = RSAPP.Sf; Sf.mods.soakN = 99; RS.Save.markAt(Sf, Sf.view.cx, Sf.view.cy); RS.Save.hide(); }); const hide = await E(() => ({ ms: RS.Save.stats.hideMs, flushN: RS.Save.stats.flushN }));
  ok('idle saver ran during play and no save slice reached 16 ms', sl.n >= 1 && sl.max < 16, sl);
  ok('hide flush (dirty header + chunks only) under 30 ms', hide.ms != null && hide.ms < 30, hide);
  await load(''); await E(() => { RSAPP.save = () => { }; });
  ok('no page errors', errs.length === 0, errs.slice(0, 3)); console.log('SAVE ' + res.filter(Boolean).length + '/' + res.length); await b.close(); })();
