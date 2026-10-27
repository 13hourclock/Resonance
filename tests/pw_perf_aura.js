// v0.8b5 aurafast browser probe (parent 10:28 PM MDT Oct 23 2026): RS.Aura.frame cost in headless Chromium (Skia; software raster here, so an upper bound
// for a phone's GPU canvas) for 36 on-screen ohms on a 412x860 phone viewport at dpr 2 (App caps dpr at 2). Each frame is flushed (getImageData 1 px)
// before and after so the raster cost is inside the timing. No screenshots. usage: PORT=8850 node tests/pw_perf_aura.js
const { chromium } = require('playwright'); const PORT = process.env.PORT || 8850;
(async () => { const b = await chromium.launch({ args: (process.env.ARGS || '').split(' ').filter(Boolean) }); const cx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 }); const p = await cx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto(`http://localhost:${PORT}/index.html?fixed=1`); await p.waitForTimeout(2500);
  const out = await p.evaluate(() => { const App = RSAPP, Sf = App.Sf, Au = RS.Aura, S = Au.S, cam = App.cam, z = cam.z || 1, DP = 2, W = App.Wd, H = App.Ht;
    const cv = document.createElement('canvas'); cv.width = W * DP; cv.height = H * DP; const ctx = cv.getContext('2d'), tf = () => ctx.setTransform(DP * z, 0, 0, DP * z, (W / 2 - cam.x * z) * DP, (H / 2 - cam.y * z) * DP);
    const flush = () => ctx.getImageData(0, 0, 1, 1); const P0 = Sf.view; App.syncView && App.syncView();
    const os = []; for (let i = 0; i < 36; i++) { const g = RS.Genome.random(9000 + i * 7919), x = cam.x + ((i % 6) - 2.5) * W / 6 / z, y = cam.y + (Math.floor(i / 6) - 2.5) * H / 6.5 / z;
      const c = Sf.addCreature(g, x, y, { growth: 1, energy: .9, quiet: true }); if (!c) continue; if (!c.mind && RS.Mind) c.mind = RS.Mind.make(Sf, c); c.exp = RS.Exp.make(c); c.exp.tx = { [['maqam', 'cuban', 'celtic', 'gamelan', 'blues', 'hindustani'][i % 6]]: 1 + i % 3 }; c._pin = [x, y]; os.push(c); }
    const pin = () => { for (const c of os) { c.x = c._pin[0]; c.y = c._pin[1]; } };
    const run = (label, setL, o = {}) => { S.cache.clear(); S.bytes = 0; S.jobs = []; S.lvl = 0; S.ema = 0; S.lvT = -1e9; S.faint.clear(); os.forEach((c, i) => { c._auL = setL(i); Au.keyTick(c); });
      const bud = Au.P.budgetMs, fms = Au.P.frameMs, pxm = Au.P.pxMax; if (o.noLod) { Au.P.budgetMs = 1e9; Au.P.frameMs = 1e9; Au.P.pxMax = 1e15; } const f0 = Au.faint; if (o.stub) Au.faint = () => { };
      const keepC = Sf.creatures; Sf.creatures = os;   // only the probe's ohms
      for (let f = 0; f < 400; f++) { pin(); tf(); Au.frame(ctx, Sf, f / 60); if (!S.jobs.length && f > 30) break; } flush();
      const ms = []; for (let f = 0; f < 120; f++) { pin(); tf(); ctx.clearRect(-1e5, -1e5, 2e5, 2e5); flush(); const t0 = performance.now(); Au.frame(ctx, Sf, 10 + f / 60); flush(); ms.push(performance.now() - t0); }
      const base = []; for (let f = 0; f < 60; f++) { tf(); flush(); const t0 = performance.now(); flush(); base.push(performance.now() - t0); }
      Sf.creatures = keepC; Au.faint = f0; Au.P.budgetMs = bud; Au.P.frameMs = fms; if (pxm !== undefined) Au.P.pxMax = pxm; ms.sort((a, b) => a - b); base.sort((a, b) => a - b);
      const mean = ms.reduce((a, b) => a + b, 0) / ms.length, med = ms[60] - base[30];
      return { label, meanMs: +mean.toFixed(2), medMs: +ms[60].toFixed(2), p95Ms: +ms[114].toFixed(2), flushMs: +base[30].toFixed(2), faintN: S.faintN, drawn: S.drawn, lvl: S.lvl, devMpx: S.px != null ? +(S.px / 1e6).toFixed(2) : null }; };
    const r = [run('A all newborn (Lm 0): faint only', () => 0, { noLod: 1 }), run('B mixed Lm 0..4.4', i => i * 4.4 / 35, { noLod: 1 }), run('B natural LOD', i => i * 4.4 / 35),
      run('C mixed, faint stubbed', i => i * 4.4 / 35, { noLod: 1, stub: 1 }), run('D all baked Lm 1..4.4', i => 1 + i * 3.4 / 35, { noLod: 1 })];
    for (const c of os) c.dead = true; return { n: os.length, z, W, H, r, gpu: (() => { try { const g = document.createElement('canvas').getContext('webgl'), d = g.getExtension('WEBGL_debug_renderer_info'); return g.getParameter(d.UNMASKED_RENDERER_WEBGL); } catch (e) { return '?'; } })() }; });
  console.log(JSON.stringify({ n: out.n, z: out.z, W: out.W, H: out.H, gpu: out.gpu })); for (const r of out.r) console.log(JSON.stringify(r)); if (errs.length) console.log('errors', errs.slice(0, 3)); await b.close(); })();
