// v0.7 I: a fresh launch (no ?fixed=1) starts a fresh random world and opening scene; saves still write; every planet type can come up.
// v0.8b songsave: a launch after the app was left (resume record written on hide / pagehide) reopens that world and its song; ?fresh=1 = the v0.7 I fresh start.
const { chromium } = require('playwright');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  const L = () => p.evaluate(() => { const A = RSAPP, k = A.launch; return { seed: k.seed, cat: k.cat, type: k.type, sys: k.sysI, th: +k.th.toFixed(3), key: k.key, scene: JSON.stringify(k.scene), level: A.level, ohms: A.Sf.creatures.filter(c => !c.dead).length, guide: !!A.Sf.creatures.find(c => c.guide), fr: A.Sf.frame }; });
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fresh=1'); await p.waitForTimeout(1800); const a = await L();
  // let it save: a save of the fresh world must be written under its own key (v0.8 H: an unchanged world stores nothing, so make a change first)
  const saved = await p.evaluate(() => { const Sf = RSAPP.Sf; if (RS.Save) { Sf.mods.launchN = 1; RS.Save.markAt(Sf, Sf.view.cx, Sf.view.cy); } RSAPP.save(); return RS.Save ? RS.Save.has(Sf.key) : !!RS.Store.get(Sf.key); }); await p.waitForTimeout(600);
  await p.goto('http://localhost:8811/index.html?fresh=1'); await p.waitForTimeout(1800); const c = await L();
  // songsave: leaving the app (what hide / pagehide does) then launching again reopens the same world (no fresh pick)
  const left = await p.evaluate(() => { RSAPP.suspendSong('test'); return { key: RSAPP.Sf.key, n: RSAPP.stats.songSaves }; }); await p.waitForTimeout(800);
  await p.evaluate(() => { RSAPP.suspendSong = () => { }; }); await p.goto('http://localhost:8811/index.html'); await p.waitForTimeout(1800);
  const back = await p.evaluate(() => ({ key: RSAPP.Sf.key, resumed: !!RSAPP.resumed, restored: RSAPP.Sf.songRestored || null, launch: !!RSAPP.launch }));
  ok('songsave: launching after leaving reopens the same world with its song (not a fresh pick)', back.resumed && back.key === left.key && !back.launch && back.restored && !back.restored.skipped && !back.restored.err, { left, back });
  ok('I two launches give different seeds and scenes', a.seed !== c.seed && (a.scene !== c.scene || a.key !== c.key), { a, c });
  ok('I a launch lands on a surface with a varied opening scene (2+ ohms, guide while lessons are not done) and runs', a.level === 'surface' && a.ohms >= 3 && a.guide && c.ohms >= 3 && c.fr > 30, { a: [a.ohms, a.guide, a.fr], c: [c.ohms, c.guide, c.fr] });
  ok('I save code still writes, and a fresh launch does not auto-load it (fresh world instead)', saved && c.key !== a.key, { saved, ka: a.key, kc: c.key });
  const cats = await p.evaluate(() => { const n = {}; for (let s = 1; s <= 200; s++) { const k = RSAPP.freshPick(s * 7919 + 13); n[k.cat] = (n[k.cat] || 0) + 1; } return n; });
  ok('I every planet type can come up as a start (200 sampled launches)', ['rocky', 'wet', 'icy', 'giant', 'moon'].every(k => cats[k] >= 15), cats);
  // actually enter one start of each type and run it a moment
  const each = await p.evaluate(async () => { const out = {}; for (let s = 1; s < 400 && Object.keys(out).length < 5; s++) { const sd = s * 104729 + 7, k = RSAPP.freshPick(sd); if (out[k.cat]) continue; RSAPP.freshStart(sd); for (let i = 0; i < 90; i++) RSAPP.Sf.step(1 / 60); const S = RSAPP.Sf, cr = S.creatures.filter(c => !c.dead); out[k.cat] = { type: RSAPP.launch.type, gas: !!S.P.gas, ohms: cr.length, near: cr.filter(c => Math.hypot(c.x - RSAPP.cam.x, c.y - RSAPP.cam.y) < 900).length, nan: cr.some(c => !isFinite(c.x)) }; } return out; });
  ok('I a start of each type (rocky, wet, icy, cloud giant, moon) loads with its ohms near the landing spot', ['rocky', 'wet', 'icy', 'giant', 'moon'].every(k => each[k] && each[k].ohms >= 3 && each[k].near >= 3 && !each[k].nan), each);
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.waitForTimeout(1500); const f = await p.evaluate(() => ({ ark: RSAPP.Sf.isArk, launch: !!RSAPP.launch }));
  ok('I ?fixed=1 (tests) keeps the fixed ark start', f.ark && !f.launch, f);
  ok('no page errors', errs.length === 0, errs.slice(0, 3));
  const pass = res.filter(Boolean).length; console.log(`LAUNCH ${pass}/${res.length}`); await b.close(); process.exit(pass === res.length ? 0 : 1); })();
