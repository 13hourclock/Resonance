// v0.8b5 aurafast probe (parent 10:28 PM MDT Oct 23 2026: "the b2 faint glow costs ~7.5 ms per frame for 36 ohms on the test canvas ... is that a real phone-frame concern?"):
// node-canvas (cairo, CPU) timing of RS.Aura.frame for 36 on-screen ohms on a 390x844 canvas mapped to the view, broken down by part. No screenshots.
// usage: node tests/perf_aura.js [frames=120] [dpr=1]
const T = require('./node_env.js'), RS = global.RS; require('../www/js/render.js'); const Te = RS.Teacher, Au = RS.Aura, S = Au.S;
let NC = null; for (const p of ['canvas', '/workspace/softsound_previews/node_modules/canvas']) { try { NC = require(p); break; } catch (e) { } } if (!NC) { console.log('perf_aura: node-canvas missing'); process.exit(0); }
const N = +(process.argv[2] || 120), DPR = +(process.argv[3] || 1), now = () => Number(process.hrtime.bigint()) / 1e6;
Au.mk = (w, h) => NC.createCanvas(w, h); global.App = { Wd: 390, Ht: 844 };
const o = T.scene({ clear: true, useed: 5 }), Sf = o.Sf || o; Sf.noSeedItems = true; Sf.noPatches = true; Sf.stats = Sf.stats || {};
const v = Sf.view, x0 = (v.x0 + v.x1) / 2, cv = NC.createCanvas(390 * DPR, 844 * DPR), ctx = cv.getContext('2d');
const mkE = c => { if (!c.mind) c.mind = RS.Mind.make(Sf, c); return RS.Exp.make(c); };
for (const c of Sf.creatures) c.dead = true;
const os = []; for (let i = 0; i < 36; i++) { const c = T.add(Sf, T.plain(300 + i), x0 + ((i % 9) - 4) * (v.x1 - v.x0) / 10); c.y -= Math.floor(i / 9) * 60; c.exp = mkE(c); c.exp.tx = { [['maqam', 'cuban', 'celtic', 'gamelan', 'blues', 'hindustani'][i % 6]]: 1 + i % 3 }; os.push(c); }
const sc = DPR * 390 / (v.x1 - v.x0), tf = () => ctx.setTransform(sc, 0, 0, sc, -v.x0 * sc, -v.y0 * sc);
// per-part timers (wrapping the module's own functions; the draw calls go through ctx.drawImage)
const tm = {}, wrap = (obj, k, name) => { const f = obj[k]; obj[k] = function () { const t0 = now(); try { return f.apply(this, arguments); } finally { const r = tm[name] || (tm[name] = { ms: 0, n: 0 }); r.ms += now() - t0; r.n++; if (name === 'drawImage' && arguments.length >= 5) { const m = ctx.getTransform(); r.px = (r.px || 0) + Math.abs(arguments[3] * arguments[4] * m.a * m.d); } } }; return () => obj[k] = f; };
const run = (label, setL, opt = {}) => { S.cache.clear(); S.bytes = 0; S.jobs = []; S.lvl = 0; S.ema = 0; S.lvT = -1e9; S.faint.clear(); os.forEach((c, i) => { c._auL = setL(i); Au.keyTick(c); });
  const bud = Au.P.budgetMs, pxm = Au.P.pxMax; if (opt.noLod) { Au.P.budgetMs = 1e9; Au.P.pxMax = 1e15; } const un = []; if (opt.stubFaint) { const f = Au.faint; Au.faint = () => { }; un.push(() => Au.faint = f); }
  for (let f = 0; f < 400; f++) { tf(); Au.frame(ctx, Sf, f / 60); if (!S.jobs.length && f > 30) break; }   // warm: bakes drain, sprites cached
  for (const k in tm) delete tm[k]; const W = [wrap(Au, 'faint', 'faint'), wrap(Au, 'styles', 'styles'), wrap(Au, 'draw', 'draw'), wrap(Au, 'select', 'select'), wrap(ctx, 'drawImage', 'drawImage')];
  const ms = []; for (let f = 0; f < N; f++) { tf(); const t0 = now(); Au.frame(ctx, Sf, 10 + f / 60); ms.push(now() - t0); } W.reverse().forEach(u => u()); un.forEach(u => u()); Au.P.budgetMs = bud; if (pxm !== undefined) Au.P.pxMax = pxm;
  ms.sort((a, b) => a - b); const mean = ms.reduce((a, b) => a + b, 0) / ms.length, per = k => tm[k] ? +(tm[k].ms / N).toFixed(3) : 0, cnt = k => tm[k] ? +(tm[k].n / N).toFixed(1) : 0;
  const r = { label, meanMs: +mean.toFixed(2), p95Ms: +ms[Math.floor(ms.length * .95)].toFixed(2), faintN: S.faintN, drawn: S.drawn, lvl: S.lvl, devMpx: S.px != null ? +(S.px / 1e6).toFixed(2) : null, faintMs: per('faint'), stylesMs: per('styles'), stylesN: cnt('styles'), drawMs: per('draw'), selectMs: per('select'), drawImageMs: per('drawImage'), drawImageN: cnt('drawImage'), Mpx: tm.drawImage ? +((tm.drawImage.px || 0) / N / 1e6).toFixed(3) : 0, nsPerPx: tm.drawImage && tm.drawImage.px ? +(tm.drawImage.ms * 1e6 / tm.drawImage.px).toFixed(1) : 0 };
  console.log(JSON.stringify(r)); return r; };
module.exports = { run, os, Sf, Au };
if (require.main === module) {
  console.log('perf_aura: 36 ohms, canvas ' + cv.width + 'x' + cv.height + ', ' + N + ' frames, view ' + Math.round(v.x1 - v.x0) + ' wide');
  run('A all newborn (Lm 0): faint glow only', () => 0, { noLod: true });
  run('B S9-like mixed (Lm 0..4.4)', i => i * 4.4 / 35, { noLod: true });
  run('B natural LOD', i => i * 4.4 / 35);
  run('C mixed, faint stubbed', i => i * 4.4 / 35, { noLod: true, stubFaint: true });
  run('D all baked (Lm 1..4.4)', i => 1 + i * 3.4 / 35, { noLod: true });
}
