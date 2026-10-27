// RS.ClayLook (v0.8b3) — Wilbow 3:15 PM: "The clay doesnt display shapes or feel like clay, also it should start as a unique shape to form instrument".
// 1) a matte, lit clay render (shadow, top-left light, rim light, inner shade, grain, fingerprints) instead of the glowing sticker;
// 2) every lump STARTS as its own seeded organic shape (lobes, soft points, dents, length) and that shape sets its first sound;
// 3) the hatched ohm keeps the clay's final outline (Mo.formOf -> c.form -> creature.js mesh + render.js path).
// Cheap: everything is per-frame canvas paths on the ONE clay on screen; hatched ohms only add one 48-point path (culled like any ohm).
(function (G) { 'use strict';
const RS = G.RS, Mo = RS.Mold, CS = RS.ClayStage; if (!Mo || !Mo.SB || !CS) return;
const SB = Mo.SB, TAU = Math.PI * 2, cl = (v, a = 0, b = .9999) => Math.max(a, Math.min(b, v)), lerp = (a, b, u) => a + (b - a) * u, I = () => RS.IG, R = k => Mo.radius(k);
const CL = RS.ClayLook = { on: true, FORM_N: 48, PRINTS: 8, CLAY: [176, 150, 128], MIX: .3, K_SHAPE: 3.4, DAMP: 5.5 };
SB.K_SHAPE = CL.K_SHAPE; SB.DAMP = CL.DAMP;   /* slow, heavily damped settle: dents and squashes stay readable instead of jelly-springing back */

// ---------- colour ----------
const mixc = (col, f, add = 0) => [0, 1, 2].map(j => Math.round(cl(lerp(col[j], CL.CLAY[j], CL.MIX) * f + add, 0, 255)));
const rgba = (c, a) => 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (+a).toFixed(3) + ')';
CL.colors = col => { col = col || [220, 200, 170]; return { base: mixc(col, 1), lite: mixc(col, 1.12, 22), dark: mixc(col, .58), deep: mixc(col, .34) }; };

// ---------- paths ----------
CL.smooth = (ctx, xs, ys, n) => { const mx = i => (xs[i] + xs[(i + 1) % n]) / 2, my = i => (ys[i] + ys[(i + 1) % n]) / 2; ctx.moveTo(mx(n - 1), my(n - 1)); for (let i = 0; i < n; i++) ctx.quadraticCurveTo(xs[i], ys[i], mx(i), my(i)); ctx.closePath(); };
const jit = (k, n) => { if (k._jit && k._jit.length === n && k._jitR === k.rough) return k._jit; const r = RS.rng(RS.hash('cljit', k.seed || 0, RS.Genome.hash ? RS.Genome.hash(k.g) : 0)), a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = 1 + (r() - .5) * .05 * (k.rough || 0); k._jitR = k.rough; return (k._jit = a); };   /* static, seeded roughness (b2 shimmered with t) */

// lit matte fill of the current path set by pathFn (called several times: cheaper than Path2D on old WebViews)
CL.shade = (ctx, pathFn, cx, cy, Rr, col, o = {}) => { const C = CL.colors(col);
  ctx.save(); ctx.translate(Rr * .07, Rr * .13); ctx.beginPath(); pathFn(); ctx.fillStyle = 'rgba(8,6,12,' + (o.shadow == null ? .26 : o.shadow) + ')'; ctx.fill(); ctx.restore();   // contact shadow follows the shape
  const gr = ctx.createLinearGradient(cx - Rr * .8, cy - Rr * .9, cx + Rr * .8, cy + Rr * 1.0); gr.addColorStop(0, rgba(C.lite, 1)); gr.addColorStop(.45, rgba(C.base, 1)); gr.addColorStop(1, rgba(C.dark, 1));
  ctx.beginPath(); pathFn(); ctx.fillStyle = gr; ctx.fill();
  ctx.save(); ctx.beginPath(); pathFn(); ctx.clip();
  ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(C.deep, .26); ctx.lineWidth = Rr * .34; ctx.beginPath(); pathFn(); ctx.stroke();   // inner occlusion: edges turn away from the light
  ctx.save(); ctx.translate(Rr * .06, Rr * .08); ctx.strokeStyle = 'rgba(255,246,232,' + (o.rim == null ? .34 : o.rim) + ')'; ctx.lineWidth = Rr * .09; ctx.beginPath(); pathFn(); ctx.stroke(); ctx.restore();   // rim light on the lit (top-left) edge, follows every bump
  const sp = ctx.createRadialGradient(cx - Rr * .38, cy - Rr * .42, 0, cx - Rr * .38, cy - Rr * .42, Rr * .6); sp.addColorStop(0, 'rgba(255,250,240,' + (.13 + .2 * (o.flash || 0)).toFixed(3) + ')'); sp.addColorStop(1, 'rgba(255,250,240,0)'); ctx.fillStyle = sp; ctx.fillRect(cx - Rr * 1.1, cy - Rr * 1.1, Rr * 1.4, Rr * 1.4);   // soft broad sheen, not gloss
  if (o.inner) o.inner(C);
  ctx.restore();
  ctx.beginPath(); pathFn(); ctx.strokeStyle = rgba(C.deep, .55); ctx.lineWidth = Math.max(1, Rr * .035); ctx.stroke();
};

// a fingerprint dent: shadow on the upper-left inner wall, light on the lower-right one
CL.print = (ctx, x, y, r, a = 1) => { let g = ctx.createRadialGradient(x - r * .25, y - r * .25, r * .1, x, y, r); g.addColorStop(0, 'rgba(20,12,10,' + (.24 * a).toFixed(3) + ')'); g.addColorStop(1, 'rgba(20,12,10,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,228,' + (.22 * a).toFixed(3) + ')'; ctx.lineWidth = r * .22; ctx.beginPath(); ctx.arc(x, y, r * .78, Math.PI * -.15, Math.PI * .65); ctx.stroke(); };
const grain = (ctx, k, cx, cy, Rr, C) => { const r = RS.rng(RS.hash('clgrain', k.seed || 0)); for (let i = 0; i < 16; i++) { const a = r() * TAU, d = Math.sqrt(r()) * Rr * .85, s = Rr * (.02 + .03 * r()); ctx.fillStyle = i & 1 ? rgba(C.deep, .12) : 'rgba(255,248,236,.10)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, s, 0, TAU); ctx.fill(); } };

// ---------- the clay itself ----------
const vtx = (b, th) => { let i = Math.round(((th % TAU) + TAU) % TAU / TAU * b.n) % b.n; return i; };   /* soft-body vertices are laid out by angle */
const strand = (ctx, x0, y0, a, L, w, bend) => { const nx = -Math.sin(a), ny = Math.cos(a), x1 = x0 + Math.cos(a) * L + nx * bend, y1 = y0 + Math.sin(a) * L + ny * bend, mx = x0 + Math.cos(a) * L * .55 + nx * bend * .9, my = y0 + Math.sin(a) * L * .55 + ny * bend * .9;
  ctx.moveTo(x0 + nx * w, y0 + ny * w); ctx.quadraticCurveTo(mx + nx * w * .55, my + ny * w * .55, x1 + nx * w * .45, y1 + ny * w * .45); ctx.arc(x1, y1, w * .45, a + Math.PI / 2, a - Math.PI / 2, true); ctx.quadraticCurveTo(mx - nx * w * .55, my - ny * w * .55, x0 - nx * w, y0 - ny * w); ctx.closePath(); };
CL.lumpAt = (ctx, cx, cy, Rr, th, rootR, s, col, o) => { const a = th, rr = Rr * s, d = rootR + rr * .55, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d, nx = -Math.sin(a), ny = Math.cos(a), rx = cx + Math.cos(a) * (rootR - rr * .3), ry = cy + Math.sin(a) * (rootR - rr * .3);
  CL.shade(ctx, () => { ctx.moveTo(rx + nx * rr * .55, ry + ny * rr * .55); ctx.lineTo(x + nx * rr * .7, y + ny * rr * .7); ctx.arc(x, y, rr, a + Math.PI / 2, a + Math.PI / 2 - TAU, true); ctx.lineTo(x - nx * rr * .7, y - ny * rr * .7); ctx.lineTo(rx - nx * rr * .55, ry - ny * rr * .55); ctx.closePath(); }, x, y, rr, col, o); };
Mo.look = (ctx, Sf, t) => { const k = Sf.clay; if (!CL.on || !k || !k.sb) return false; const b = k.sb, n = b.n, P = k.P || {}, Rk = R(k), c = k.cs || {}, col = k.col || [220, 200, 170], J = jit(k, n);
  const xs = new Float32Array(n), ys = new Float32Array(n); let cx = 0, cy = 0; for (let i = 0; i < n; i++) { xs[i] = k.x + b.x[i] * J[i]; ys[i] = k.y + b.y[i] * J[i]; cx += xs[i]; cy += ys[i]; } cx /= n; cy /= n;
  const rootR = th => { const i = vtx(b, th); return Math.hypot(b.x[i], b.y[i]) * .92; }, flash = cl(k.flash || 0, 0, 1);
  if (flash > .02) { ctx.save(); const gr = ctx.createRadialGradient(k.x, k.y, Rk * .6, k.x, k.y, Rk * 1.7); gr.addColorStop(0, rgba(col, .16 * flash)); gr.addColorStop(1, rgba(col, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(k.x, k.y, Rk * 1.7, 0, TAU); ctx.fill(); ctx.restore(); }   /* touch feedback only: no permanent halo */
  const nl = P.limbs || 0; for (let l = 0; l < nl; l++) { const a = (l + .5) / nl * TAU + (P.limbPhase || 0), L = Rk * .8 * (P.limbLen || 1), r0 = rootR(a), x0 = k.x + Math.cos(a) * r0, y0 = k.y + Math.sin(a) * r0, w = Rk * (.19 + .05 * (P.limbW || 0)), bend = Rk * .18 * Math.sin(l * 2.3 + (P.limbPhase || 0) * 3);
    CL.shade(ctx, () => strand(ctx, x0, y0, a, L + Rk * .12, w, bend), x0 + Math.cos(a) * L * .5, y0 + Math.sin(a) * L * .5, w * 2.2, col, { shadow: .2 }); }   /* tapered clay strands rooted on the real outline (b2: straight sticks off a hidden ellipse) */
  if (c.lumps && c.lumps.length) for (const lp of c.lumps) CL.lumpAt(ctx, k.x, k.y, Rk, lp.th, rootR(lp.th), cl(.45 * (lp.s || 1), .28, .6), col, {});
  CL._skip = c.lumps;   /* claystage's own lump pass is replaced by the attached ones above */
  CL.shade(ctx, () => CL.smooth(ctx, xs, ys, n), cx, cy, Rk, col, { flash, inner: C => { grain(ctx, k, cx, cy, Rk, C);
    if (c.dentL) for (const d of c.dentL) { const r0 = rootR(d.th) * .7; CL.print(ctx, k.x + Math.cos(d.th) * r0, k.y + Math.sin(d.th) * r0, Rk * (.3 + .25 * d.d), .9); }
    if (c.prints) for (const p of c.prints) CL.print(ctx, k.x + p[0], k.y + p[1], Rk * p[2], p[3]); } });
  return true; };
const lumps0 = CS.drawLumps; CS.drawLumps = (ctx, x, y, r, lumps, col, a, rf) => { if (!lumps || !lumps.length) return; if (lumps === CL._skip) { CL._skip = null; return; } if (!CL.on) return lumps0(ctx, x, y, r, lumps, col, a);
  for (const lp of lumps) { const th = typeof lp === 'number' ? lp : lp.th, s = typeof lp === 'number' ? .45 : cl(.45 * (lp.s || 1), .28, .6); ctx.save(); if (a != null && a < 1) ctx.globalAlpha *= a; CL.lumpAt(ctx, x, y, r, th, rf ? rf(th) : r * 1.0, s, col, { shadow: .18, rim: .26 }); ctx.restore(); } };   /* lumps sit ON the outline (b2: floating circles at a fixed 1.12R) */

// ---------- fingerprints: pokes and taps leave a mark that stays ----------
const addPrint = (k, lx, ly, sz, a) => { const c = CS.state(k), P = c.prints || (c.prints = []); for (const p of P) if (Math.hypot(p[0] - lx, p[1] - ly) < R(k) * .22) { p[3] = Math.min(1, p[3] + .2); return false; } P.push([+lx.toFixed(1), +ly.toFixed(1), sz, a]); if (P.length > CL.PRINTS) P.shift(); return true; };
const touch0 = SB.touch; SB.touch = (k, name, ...a) => { const r = touch0(k, name, ...a); if (CL.on && k && (name === 'poke' || name === 'tap') && a[0] != null && k.sb) { const lx = a[0] - k.x, ly = a[1] - k.y, th = Math.atan2(ly, lx), b = k.sb, i = vtx(b, th), edge = Math.hypot(b.rx[i], b.ry[i]), d = Math.hypot(lx, ly);
    if (d < edge * .92) { const isNew = addPrint(k, lx, ly, name === 'tap' ? .2 : .26, name === 'tap' ? .7 : .9); if (isNew && name === 'poke' && d > edge * .5) CS.mark(k, th, -R(k) * .07, .18); } }   /* a press near the rim also leaves a small permanent dent */
  return r; };

// ---------- the start shape: every lump is born its own organic shape, and that shape is its first sound ----------
CL.START = { lobes: [2, 4], lobeAmp: [.12, .42], lobeW: [.45, .85], points: [0, 3], ptAmp: [.25, .55], ptW: [.13, .19], dents: [0, 2], dentDep: [.25, .7], stretch: .45 };
const pick = (r, [a, b]) => a + (b - a) * r(), ipick = (r, [a, b]) => a + Math.floor(r() * (b - a + 1));
Mo.onBorn = (Sf, k) => { if (!CL.on || !k.sb) return; const S = CL.START, gh = RS.Genome.hash ? RS.Genome.hash(k.g) : RS.hash('g', k.g.join(',')), r = RS.rng(RS.hash('clayborn', gh, k.seed || 0)), c = CS.state(k), Rk = R(k), g = k.g, i = I(), born = { lobes: [], points: [], dents: [], stretch: 0 };
  const nl = ipick(r, S.lobes), ph = r() * TAU; for (let j = 0; j < nl; j++) { const th = ph + j / nl * TAU + (r() - .5) * .9, amp = pick(r, S.lobeAmp); CS.mark(k, th, Rk * amp, pick(r, S.lobeW)); born.lobes.push(+th.toFixed(2)); }
  if (r() < S.stretch) { const th = r() * TAU, amp = .22 + .3 * r(); CS.mark(k, th, Rk * amp, .7); CS.mark(k, th + Math.PI, Rk * amp * (.6 + .4 * r()), .7); born.stretch = +amp.toFixed(2); }
  const np = ipick(r, S.points); for (let j = 0; j < np; j++) { const th = r() * TAU, amt = pick(r, S.ptAmp); CS.mark(k, th, Rk * amt, pick(r, S.ptW)); born.points.push(+th.toFixed(2)); } c.points = (c.points || 0) + (np >= 2 ? np - 1 : 0);   /* soft points: a little grit (one alone stays soft) */
  const nd = ipick(r, S.dents); let dmax = 0; for (let j = 0; j < nd; j++) { const th = r() * TAU, dep = pick(r, S.dentDep); CS.mark(k, th, -Rk * CS.DENT * dep, .32); CS.dents(k, th, dep); dmax = Math.max(dmax, dep); born.dents.push(+th.toFixed(2)); }
  if (dmax > 0) { g[i.bodyRes] = cl(lerp(g[i.bodyRes], .3 + .6 * dmax, .6)); g[i.reso] = cl(g[i.reso] + .08 * dmax); c.dent = Math.max(c.dent || 0, dmax); }   /* dents -> body resonance (as the dent gesture) */
  SB.reform(k); const sh = CS.shapeOf(k), L = cl((Math.max(sh.asp, 1 / Math.max(.01, sh.asp)) - 1) / 1.1, 0, 1); born.len = +L.toFixed(2);
  g[i.sus] = cl(lerp(g[i.sus], .25 + .6 * L, .55)); g[i.rel] = cl(lerp(g[i.rel], .2 + .65 * L, .55));   /* length -> sustain (as a tail) */
  c.born = born; if (CS.post) CS.post(Sf, k, 'born');   /* edge sharpness -> brightness, points -> grit, size cap: the shared timbre map */
  RS.Genome.snap(g); Mo.express(Sf, k); SB.reform(k); Sf.stats && (Sf.stats.clayBorn = (Sf.stats.clayBorn || 0) + 1); };

// ---------- the hatched ohm keeps the clay's outline ----------
CL.formOf = k => { const b = k.sb; if (!b) return null; const n = b.n, N = CL.FORM_N, Rk = R(k), out = new Array(N); let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += b.rx[i]; cy += b.ry[i]; } cx /= n; cy /= n;
  for (let j = 0; j < N; j++) { const th = j / N * TAU, dx = Math.cos(th), dy = Math.sin(th); let best = 0; for (let i = 0; i < n; i++) { const a = i, q = (i + 1) % n, ax = b.rx[a] - cx, ay = b.ry[a] - cy, ex = b.rx[q] - b.rx[a], ey = b.ry[q] - b.ry[a], den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) continue; const tt = (ax * ey - ay * ex) / den, u = (ax * dy - ay * dx) / den; if (tt > 0 && u >= 0 && u <= 1) best = Math.max(best, tt); }
    out[j] = +(cl(best / Rk, .2, 3)).toFixed(2); }
  return out; };
Mo.formOf = k => CL.on ? CL.formOf(k) : null;
CL.formAt = (F, th) => { const N = F.length, u = ((th % TAU) + TAU) % TAU / TAU * N, i = Math.floor(u) % N, f = u - Math.floor(u); return F[i] * (1 - f) + F[(i + 1) % N] * f; };
// creature outline (adult scale) from a form: n points at the soft-body's angles
CL.formOutline = (F, Rr, n) => { const x = [], y = []; let m = 0; for (const v of F) m += v; m /= F.length; for (let i = 0; i < n; i++) { const th = i / n * TAU, r = CL.formAt(F, th) / m * Rr; x.push(Math.cos(th) * r); y.push(Math.sin(th) * r); } return { x, y, mean: m }; };
// creature.js: the blob's own rest layout (makeBlob resamples, so map by angle, not by index)
CL.formRest = (W, b, mean) => { const idx = b.idx, n = idx.length; let cx = 0, cy = 0; for (const q of idx) { cx += W.x[q]; cy += W.y[q]; } cx /= n; cy /= n; const x = new Float32Array(n), y = new Float32Array(n), a = new Float32Array(n); for (let i = 0; i < n; i++) { x[i] = W.x[idx[i]] - cx; y[i] = W.y[idx[i]] - cy; a[i] = (Math.atan2(y[i], x[i]) + TAU) % TAU; } const ord = Array.from({ length: n }, (_, i) => i).sort((p, q) => a[p] - a[q]); return { x, y, a, ord, mean, n }; };
// render.js: draw a form-bodied segment with the blob's live position, turn and squash
CL.formPath = (ctx, W, b, c) => { const idx = b.idx, n = idx.length, F = c.form, O = b.formO; if (!F || !O || O.n !== n) return false; let cx = 0, cy = 0; for (const q of idx) { cx += W.x[q]; cy += W.y[q]; } cx /= n; cy /= n;
  let sn = 0, cs = 0; const sc = O.sc || (O.sc = new Float32Array(n)); for (let i = 0; i < n; i++) { const px = W.x[idx[i]] - cx, py = W.y[idx[i]] - cy, ox = O.x[i], oy = O.y[i]; sn += ox * py - oy * px; cs += ox * px + oy * py; sc[i] = Math.hypot(px, py) / Math.max(1e-6, Math.hypot(ox, oy)); }
  const rot = Math.atan2(sn, cs), N = F.length, xs = CL._xs || (CL._xs = new Float32Array(64)), ys = CL._ys || (CL._ys = new Float32Array(64)), m = O.mean || 1, ord = O.ord; c._ft = { cx, cy, rot, O, Rr: b.formR || 1 };
  let p = 0; for (let j = 0; j < N; j++) { const th = j / N * TAU; while (p < n && O.a[ord[p]] <= th) p++; const i1 = ord[p % n], i0 = ord[(p + n - 1) % n], a0 = O.a[i0], a1 = O.a[i1] + (p >= n || p === 0 && O.a[i1] < a0 ? TAU : 0), t0 = th < a0 ? th + TAU : th, f = a1 > a0 ? Math.max(0, Math.min(1, (t0 - a0) / (a1 - a0))) : 0, s = sc[i0] * (1 - f) + sc[i1] * f, r = F[j] / m * (b.formR || 1) * s; xs[j] = cx + Math.cos(th + rot) * r; ys[j] = cy + Math.sin(th + rot) * r; }
  CL.smooth(ctx, xs, ys, N); return true; };
// lump roots on a form-bodied ohm (render.js passes this to drawLumps)
CL.rootOf = c => { const F = c.form, T = c._ft; if (!F || !T) return null; const m = F.reduce((a, v) => a + v, 0) / F.length; return th => { th -= T.rot; let s = 0; for (let i = 0; i < T.O.n; i++) s += T.O.sc[i]; s /= T.O.n; return CL.formAt(F, th) / m * T.Rr * s * .95; }; };
})(typeof window !== 'undefined' ? window : globalThis);
