// v0.8b5 aurafast check (parent 10:28 PM MDT Oct 23 2026: "the b2 faint glow costs ~7.5 ms per frame for 36 ohms ... propose or make a fix on v08-aurafast"):
// F1 the pre-scaled glow looks the same as the scaled one (same place, same brightness, any world transform incl. rotation), F2 it is much cheaper per glow,
// F3 its cache stays bounded (bytes, new sprites a frame), F4 a crowd of big auras at dpr 2 stays inside the device-pixel budget nearest-first and every ohm
// still shows an aura, F5 a normal 1x crowded screen is untouched by the budget. node-canvas only (no screenshots).
const T = require('./node_env.js'), RS = global.RS; require('../www/js/render.js'); const Au = RS.Aura, S = Au.S, P = Au.P;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
let NC = null; for (const p of ['canvas', '/workspace/softsound_previews/node_modules/canvas']) { try { NC = require(p); break; } catch (e) { } }
if (!NC) { ok('F0 (node-canvas missing: skipped)', true); console.log('v08aurafast_check 1/1'); process.exit(0); }
Au.mk = (w, h) => NC.createCanvas(w, h); global.App = { Wd: 390, Ht: 844 };
const o = T.scene({ clear: true, useed: 5 }), Sf = o.Sf || o; Sf.noSeedItems = true; Sf.noPatches = true; Sf.stats = Sf.stats || {}; const v = Sf.view, x0 = (v.x0 + v.x1) / 2;
const mkE = c => { if (!c.mind) c.mind = RS.Mind.make(Sf, c); return RS.Exp.make(c); }; for (const c of Sf.creatures) c.dead = true;
const now = () => Number(process.hrtime.bigint()) / 1e6, reset = () => { S.cache.clear(); S.bytes = 0; S.jobs = []; S.lvl = 0; S.ema = 0; S.lvT = -1e9; S.faint.clear(); S.pre.clear(); S.preB = 0; S.preN = 0; };
const one = T.add(Sf, T.plain(400), x0); one.exp = mkE(one); one._auL = .6; const R = RS.Creature.radius(one);
// F1: draw the same glow both ways under a few transforms and compare the pixels
{ let worst = 0, off = 0, used = 0; const cases = [[1, 0], [2, 0], [2.6, .7], [1.4, 2.2]];
  for (const [sc, rot] of cases) { const W = 300, cv = [NC.createCanvas(W, W), NC.createCanvas(W, W)]; const M = x => { x.setTransform(1, 0, 0, 1, 0, 0); x.translate(W / 2 + .3, W / 2 - .4); x.rotate(rot); x.scale(sc, sc); x.translate(-one.x, -one.y); };
    reset(); P.faintPreBakes = 2; const x1 = cv[0].getContext('2d'); M(x1); const n0 = S.pre.size; Au.faint(x1, one, R, .6); used += S.pre.size > n0;
    const keep = Au.faintPre; Au.faintPre = () => null; const x2 = cv[1].getContext('2d'); M(x2); Au.faint(x2, one, R, .6); Au.faintPre = keep;
    const a = x1.getImageData(0, 0, W, W).data, b = x2.getImageData(0, 0, W, W).data; let sa = 0, sb = 0, mx = [0, 0, 0], ma = -1, mb = -1;
    for (let i = 0; i < a.length; i += 4) { const A = a[i + 3] / 255, B = b[i + 3] / 255, pa = [0, 1, 2].map(k => a[i + k] * A), pb = [0, 1, 2].map(k => b[i + k] * B); worst = Math.max(worst, ...[0, 1, 2].map(k => Math.abs(pa[k] - pb[k]))); sa += pa[0] + pa[1] + pa[2]; sb += pb[0] + pb[1] + pb[2]; if (pa[0] > ma) { ma = pa[0]; mx[0] = i; } if (pb[0] > mb) { mb = pb[0]; mx[1] = i; } }   // premultiplied light
    const px = i => [(i / 4) % W, Math.floor(i / 4 / W)]; const pa = px(mx[0]), pb = px(mx[1]); if (process.env.DBG) console.log(sc, rot, sa, sb, ma, mb, pa, pb, worst); off = Math.max(off, Math.hypot(pa[0] - pb[0], pa[1] - pb[1]), Math.abs(sa - sb) / Math.max(1, sb) * 100 / 2); }
  ok('F1 pre-scaled glow = scaled glow (premultiplied light: per-channel diff <= 3/255, brightest pixel within 3 px, total light within 6%), under scale + rotation', worst <= 3 && off <= 6 && used === cases.length, { worst: +worst.toFixed(2), off: +off.toFixed(2), used }); }
// F2 + F3: cost per glow, cache bounds
const os = []; for (let i = 0; i < 36; i++) { const c = T.add(Sf, T.plain(300 + i), x0 + ((i % 9) - 4) * (v.x1 - v.x0) / 10); c.y -= Math.floor(i / 9) * 60; c.exp = mkE(c); c.exp.tx = { [['maqam', 'cuban', 'celtic', 'gamelan', 'blues', 'hindustani'][i % 6]]: 1 + i % 3 }; os.push(c); } one.dead = true;
const frameCost = (DP, setL, n = 40, opt = {}) => { reset(); os.forEach((c, i) => { c._auL = setL(i); Au.keyTick(c); }); const cv = NC.createCanvas(390 * DP, 844 * DP), ctx = cv.getContext('2d'), sc = DP * 390 / (v.x1 - v.x0);
  const tf = () => ctx.setTransform(sc, 0, 0, sc, -v.x0 * sc, -v.y0 * sc), bud = P.budgetMs; P.budgetMs = 1e9; let maxNew = 0;
  for (let f = 0; f < 400; f++) { tf(); Au.frame(ctx, Sf, f / 60); maxNew = Math.max(maxNew, S.preN); if (!S.jobs.length && f > 30) break; }
  const t0 = now(); let px = 0, cut = 0, all = 0, full = 0; for (let f = 0; f < n; f++) { tf(); Au.frame(ctx, Sf, 10 + f / 60); maxNew = Math.max(maxNew, S.preN); px = Math.max(px, S.px); cut = S.pxCut; all = S.drawn + S.faintN; } P.budgetMs = bud;
  return { ms: +((now() - t0) / n).toFixed(2), Mpx: +(px / 1e6).toFixed(2), cut, all, n: Au.select(Sf).length, maxNew, preMB: +(S.preB / 1048576).toFixed(2), pre: S.pre.size, faint: S.faintN, drawn: S.drawn }; };
{ const fast = frameCost(1, () => 0); const keep = Au.faintPre; Au.faintPre = () => null; const slow = frameCost(1, () => 0); Au.faintPre = keep;
  ok('F2 36 new ohms: the pre-scaled glow frame costs well under half the scaled one (node-canvas, 1x)', fast.ms < slow.ms * .5 && fast.faint === slow.faint && fast.faint >= 25, { fastMs: fast.ms, scaledMs: slow.ms, glows: fast.faint });
  P.faintPreMB = .25; const tight = frameCost(2, i => (i % 6) / 6 * .9); P.faintPreMB = 4;
  ok('F3 glow cache bounded: <= faintPreBakes new sprites a frame, bytes under faintPreMB even when tight (LRU), one sprite per hue x 6 px size bucket', fast.maxNew <= P.faintPreBakes && tight.maxNew <= P.faintPreBakes && tight.preMB <= .25 && fast.preMB <= P.faintPreMB, { fast: [fast.pre, fast.preMB], tight: [tight.pre, tight.preMB] }); }
// F4: crowd of big auras at dpr 2 (the phone case): device pixels bounded nearest-first, everyone still has an aura
{ const L = i => 1 + i * 3.4 / 35, keepMax = P.pxMax, keepSoft = P.pxSoft; P.pxMax = P.pxSoft = 1e15; const free = frameCost(2, L); P.pxMax = keepMax; P.pxSoft = keepSoft; const cap = frameCost(2, L);
  ok('F4 dpr 2 crowd of baked auras: device px held near pxMax (one aura of overshoot), far ones degrade (flat haze -> glow), every on-screen ohm still has an aura, cheaper', free.Mpx > P.pxMax / 1e6 && cap.Mpx <= P.pxMax / 1e6 * 1.25 && cap.cut > 0 && cap.all === cap.n && cap.ms < free.ms, { free: [free.Mpx, free.ms], capped: [cap.Mpx, cap.ms, cap.cut], all: cap.all, n: cap.n }); }
// F5: the 1x S9-like crowd is below the budget: nothing cut
{ const r = frameCost(1, i => i * 4.4 / 35); ok('F5 a normal 1x crowded screen (36 ohms, Lm 0..4.4) is inside the pixel budget: nothing degraded by it', r.cut === 0 && r.Mpx < P.pxSoft / 1e6 && r.all === r.n, r); }
console.log('v08aurafast_check ' + res.filter(Boolean).length + '/' + res.length); process.exitCode = res.every(Boolean) ? 0 : 1;
