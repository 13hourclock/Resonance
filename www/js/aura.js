// v0.8b2 (brought forward from 0.8b6, Wilbow 7:57 PM): the jam / teacher aura. Drawn only on screen; nothing runs for off-screen ohms.
// v0.8b6 TEACHER AURA (TEACHER_AURA.md v3): a layered, cached pattern behind a teacher, from its own experience. Look only: no play effect.
// Port of softsound_previews/aura2.js + aura.js (field, rosette, motif ring, branches, lattice, star halo, haze, bloom, lineage ghost, gifted motes).
// Cost (section 4b): bake only on a key change (key from the 2 s tick), one layer per frame, soft <= 256 px / sharp <= 384 px, no filter / shadowBlur,
// on-screen diameter <= .45 min(view), inView by the aura radius, <= 3 full auras (<= 2 masters) - the rest and every tier <= clear flattened,
// a 16 MB LRU, and an adaptive ladder (full -> flattened -> haze -> sheen only) when the aura draw runs over budget.
(function (G) {
const RS = G.RS, Te = RS.Teacher, Au = RS.Aura = {}, TAU = Math.PI * 2, PHI = (1 + Math.sqrt(5)) / 2, GA = TAU * (1 - 1 / PHI);
const P = Au.P = Object.assign(RS.WorldLook.teacherAura, Object.assign({ capSoft: 256, capSharp: 384, maxScreenFrac: .45, maxOnScreen: 3, maxMasters: 2, cacheMB: 16, bakePerFrame: 1, budgetMs: 4, frameMs: 11,
  pulseDepth: .4, bakeFrom: 1, faintA0: .025, faintA1: .11, faintPx: 64, faintStep: 6, faintPreMax: 320, faintPreBakes: 2, faintPreMB: 4, pxSoft: 3e6, pxMax: 5e6, downbeatBoost: 1.6, breathBeats: 8, lineageAlpha: .75, minZoom: .35 }, RS.WorldLook.teacherAura));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`, ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const rng = s => () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const top = (o, n) => Object.entries(o || {}).filter(e => typeof e[1] === 'number').sort((a, b) => b[1] - a[1]).slice(0, n);
// canvas factory: OffscreenCanvas / document canvas in the browser; injectable for node tests (Au.mk = (w, h) => createCanvas(w, h)); null = no bake
Au.mk = (w, h) => { if (typeof OffscreenCanvas !== 'undefined') return new OffscreenCanvas(w, h); if (typeof document !== 'undefined' && document.createElement) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; } return null; };
const mk = (w, h) => Au.mk(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)));
const mkNoise = seed => { const Pm = new Uint8Array(512), r = rng(seed); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = (r() * (i + 1)) | 0; [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) Pm[i] = p[i & 255]; const V = new Float32Array(256).map(() => r());
  const h = (x, y, z) => V[Pm[Pm[Pm[x & 255] + (y & 255)] + (z & 255)]], f = t => t * t * (3 - 2 * t), l = (a, b, t) => a + (b - a) * t;
  const n3 = (x, y, z) => { const X = Math.floor(x), Y = Math.floor(y), Z = Math.floor(z), u = f(x - X), v = f(y - Y), w = f(z - Z); return l(l(l(h(X, Y, Z), h(X + 1, Y, Z), u), l(h(X, Y + 1, Z), h(X + 1, Y + 1, Z), u), v), l(l(h(X, Y, Z + 1), h(X + 1, Y, Z + 1), u), l(h(X, Y + 1, Z + 1), h(X + 1, Y + 1, Z + 1), u), v), w); };
  return { fbm: (x, y, z, o = 5) => { let a = 1, s = 0, n = 0; for (let i = 0; i < o; i++) { s += a * n3(x, y, z); n += a; a *= .5; x *= 2.03; y *= 2.03; z *= 2.03; } return s / n; } }; };
const toHsl = ([r, g, b]) => { r /= 255; g /= 255; b /= 255; const M = Math.max(r, g, b), m = Math.min(r, g, b), l = (M + m) / 2; let h = 0, s = 0; if (M !== m) { const d = M - m; s = l > .5 ? d / (2 - M - m) : d / (M + m); h = M === r ? (g - b) / d + (g < b ? 6 : 0) : M === g ? (b - r) / d + 2 : (r - g) / d + 4; h /= 6; } return [h, s, l]; };
const hsl = (h, s, l) => { h = ((h % 1) + 1) % 1; const f = n => { const k = (n + h * 12) % 12, a = s * Math.min(l, 1 - l); return 255 * (l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))); }; return [f(0), f(8), f(4)]; };
const ramp = (rgb, k = 1) => { const [h] = toHsl(rgb); return [hsl(h - .16, .85 * k, .42), hsl(h - .05, .9 * k, .55), hsl(h + .03, .85 * k, .64), hsl(h + .11, .75 * k, .8)]; };
const pick = (pal, t) => { let a = 0; for (const p of pal) { a += p.w; if (t <= a) return p; } return pal[pal.length - 1]; };
const rampAt = (r, u) => { u = clamp(u, 0, 1) * (r.length - 1); const i = Math.min(r.length - 2, Math.floor(u)); return mix(r[i], r[i + 1], u - i); };
const hueOf = t => { const h = RS.Trad ? (RS.Trad.hue ? RS.Trad.hue(t) : (RS.Trad.HUE && RS.Trad.HUE[t]) || null) : null; if (Array.isArray(h)) return h; if (typeof h === 'string') return h.split(',').map(Number); return null; };
// ---------------- influenced styles (v0.8b2, Wilbow 8:57 PM: 'All ohms should show experience and influenced styles in auras') ----------------
// Au.styles(c, n) = the n strongest style influences on an ohm as [key, weight, rgb]. In 0.8b2 that is the traditions it learned in jams (exp.tx,
// coloured by RS.Trad.HUE), else its own colour. HOOK for 0.8b6's per-tradition strands: set RS.Aura.styleHook = (c, n) => [[key, w, rgb], ...]
// (return null to fall back). Everything that tints an aura (the baked palette and the faint glow of a new ohm) reads only this.
Au.styleHook = null;
Au.styles = (c, n = 3) => { if (Au.styleHook) { const h = Au.styleHook(c, n); if (h && h.length) return h; } const own = c.col || [200, 200, 220], e = c.exp;
  const tx = e ? top(e.tx, n) : []; return tx.length ? tx.map(([k, w]) => [k, w, hueOf(k) || own]) : [['own', 1, own]]; };
// ---------------- tier visuals (section 2.1) ----------------
// v0.8b2 (Wilbow 8:57 PM): EVERY ohm has an aura on one smooth scale: a faint glow from birth (Lm 0) that fills in with experience, baked layers from
// Lm 1, glowing + pulsing at master (5+). The tiers (0 / 5 / 25 / 100 / 400 / 1500 jams) are only named points on it (Au.vis interpolates).
Au.ROWS = [[0, 1, 0, 0, 1, .2], [1, 1.15, .12, 0, 1, .25], [2, 1.7, .32, 1, 2, .45], [3, 2.2, .42, 3, 3, .7], [4, 3.6, .58, 5, 4, .9], [5, 6.0, .64, 7, 5, .95]];
Au.vis = Lm => { let o; Lm = Math.max(0, Lm); if (Lm >= 5) { const b = Lm - 5; o = { size: Math.min(9, 6 * (1 + .15 * b)), alpha: Math.min(.76, .64 + .04 * b), depth: Math.min(9, 7 + .7 * b), oct: 5, sat: .95 }; }
  else { const R = Au.ROWS, i = Math.floor(Lm), u = Lm - i, a = R[i], c = R[i + 1], f = j => a[j] + (c[j] - a[j]) * u; o = { size: f(1), alpha: f(2), depth: f(3), oct: Math.round(f(4)), sat: f(5) }; }
  o.bloom = Math.min(.4, .22 * ss(3.5, 5, Lm) + .05 * Math.max(0, Lm - 5)); o.pulse = ss(3.5, 5, Lm); return o; };   /* v0.8b2 (Wilbow 8:57 PM): glow + pulse swell in gradually from 'clear' (3.5) to full at master, no late switch */
Au.W8 = { haze: .9, cultures: 1, jams: .75, roles: .9, students: .5, fusions: .45, places: .85 };
// the key (section 4b): computed at the 2 s tick (Te.tick -> Au.keyTick); the LOD bucket is appended at draw time
Au.keyOf = c => { const e = c.exp; if (!e) return null; const L = Te.layers(e), Lm = c._auL != null ? c._auL : Te.target(e); return [Math.round(Lm * 4), ...['J', 'P', 'C', 'R', 'S', 'F'].map(k => Math.round(L[k] * 2)), Te.combos(e).join('+'), Te.gifted(c) ? 1 : 0, e.lm && e.lm[0] ? e.lm[0].id + '.' + e.lm[0].gen : ''].join('|'); };
// ---------------- derive the pattern parameters from the experience record ----------------
Au.derive = (c, R, Lm) => { const e = c.exp, V = Au.vis(Lm), L = Te.layers(e), cb = {}; for (const k of Te.combos(e)) cb[k] = 1; const ntx = clamp(1 + Math.floor(L.C / 1.3), 1, 3), tx = Au.styles(c, ntx), tw = tx.reduce((a, t) => a + t[1], 0) || 1, sat = V.sat * (.6 + .4 * ss(0, 3, L.C)), own = c.col || [200, 200, 220];
  const pal = cb.quiet ? [{ k: 'q', w: 1, r: [[40, 30, 90], [80, 70, 150], [150, 150, 200], [225, 230, 245]] }] : tx.map(([k, w, rgb]) => ({ k, w: w / tw, r: ramp(rgb || own, sat) }));
  const SC = RS.SCALES || [], sx = top(e.sx, 2).map(([k]) => SC[+k]).filter(Boolean), base = sx[0] && sx[0].c && sx[0].c.length >= 3 ? sx[0].c : (c.mind && c.mind.sysBase && c.mind.sysBase.c) || [0, 200, 400, 700, 900];
  const per = 1200, cents = base.filter(v => v < per), MT = (RS.Mind && RS.Mind.METERS) || {}, mx = top(e.mx, 3), Gm = MT[mx[0] ? mx[0][0] : '4/4'] || [4, 4, 4, 4], role = (top(e.rx, 1)[0] || ['melody'])[0];
  const bpm = e.bpm || [90, 120], en = e.en || [.3, .7], bmid = (bpm[0] + bpm[1]) / 2, bw = Math.log2(bpm[1] / bpm[0]), emid = (en[0] + en[1]) / 2;
  const size = Math.max(1.15, V.size), fibs = [3, 5, 8, 13, 21, 34, 55, 89, 144, 233];
  return { e, V, L, cb, Lm, pal, cents, per, N1: cents.length, sc2: sx[1] ? sx[1].c : null, G: Gm, G3: mx[2] ? MT[mx[2][0]] : null, gsum: Gm.reduce((a, b) => a + b, 0), reps: Math.max(1, Math.round(16 / Gm.length)), role,
    rev: 240 * 100 / bmid, counter: bw > .8, curl: .12 + .9 * emid, R, Rin: R * (1.15 + .15 * ss(2, 4, Lm)), Rout: R * size, oct: Math.max(1, V.oct), s: clamp((Lm - 2) / 3, 0, 1),
    D: Math.round(Math.min(V.depth, 1.6 * L.S)), florets: fibs[clamp(Math.round(1.5 * L.J), 0, 9)], seed: RS.hash('aura', c.id) >>> 0, gn: e.gn || 1, roles: top(e.rx, 6).map(q => q[0]) }; };
// ---------------- the faint glow (Lm 0..1): one cached 64 px sprite per style hue, one drawImage per ohm, no bake / no per-frame gradient ----------------
// alpha faintA0 at birth rising to faintA1 at Lm 1 (= the baked haze there), radius 1.15 x 1.35 R growing with Lm, tinted by Au.styles.
Au.faintSprite = rgb => { const k = rgb.map(v => Math.round(v / 16)).join(','); let s = S.faint.get(k); if (s !== undefined) return s; const N = P.faintPx, c = mk(N, N); if (!c) { S.faint.set(k, null); return null; }
  const x = c.getContext('2d'), g = x.createRadialGradient(N / 2, N / 2, 0, N / 2, N / 2, N / 2); g.addColorStop(0, css(mix(rgb, [255, 255, 255], .45), 1)); g.addColorStop(.45, css(rgb, .55)); g.addColorStop(1, css(rgb, 0)); x.fillStyle = g; x.fillRect(0, 0, N, N);
  if (S.faint.size > 48) S.faint.clear(); S.faint.set(k, c); return c; };
Au.faintA = Lm => P.faintA0 + (P.faintA1 - P.faintA0) * clamp(Lm, 0, 1);
// v0.8b5 aurafast: the glow is pre-scaled to its on-screen device size (6 px buckets, <= 3% size error, cached per hue x size, <= faintPreBakes new ones a
// frame, faintPreMB total) and blitted 1:1 at whole device pixels. A scaled, filtered blit costs ~4x more per pixel on CPU canvases (Skia software,
// cairo is ~10x); a radial glow is rotation-free so the world transform is not needed. Falls back to the scaled blit (no getTransform / too big / not baked yet).
Au.faintPre = (rgb, spr, b) => { const k = rgb.map(v => Math.round(v / 16)).join(',') + '|' + b; let p = S.pre.get(k); if (p) { S.pre.delete(k); S.pre.set(k, p); return p; }
  if (S.preN >= P.faintPreBakes) return null; const c = mk(b, b); if (!c) return null; S.preN++; c.getContext('2d').drawImage(spr, 0, 0, b, b); S.pre.set(k, c); S.preB += b * b * 4;
  for (const [k2, c2] of S.pre) { if (S.preB <= P.faintPreMB * 1048576) break; S.pre.delete(k2); S.preB -= c2.width * c2.height * 4; } return c; };
Au.faint = (ctx, c, R, Lm) => { const st = Au.styles(c, 1)[0], rgb = st[2] || c.col || [200, 200, 220], spr = Au.faintSprite(rgb); S.faintN = (S.faintN || 0) + 1; if (!spr) return; const D = 2 * R * 1.15 * 1.35 * (.85 + .15 * clamp(Lm, 0, 1));
  const m = ctx.getTransform && ctx.getTransform(), s = m ? Math.hypot(m.a, m.b) : 0, Dd = D * s, b = Math.max(8, Math.round(Dd / P.faintStep) * P.faintStep), pre = m && b <= P.faintPreMax ? Au.faintPre(rgb, spr, b) : null;
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = Au.faintA(Lm);
  if (pre) { const X = m.a * c.x + m.c * c.y + m.e, Y = m.b * c.x + m.d * c.y + m.f; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(pre, Math.round(X - b / 2), Math.round(Y - b / 2)); S.px += b * b; }
  else { ctx.drawImage(spr, c.x - D / 2, c.y - D / 2, D, D); S.px += Dd * Dd; } ctx.restore(); };
// ---------------- layer bakes (world units; px = bitmap pixels per world unit) ----------------
const glowDot = (x, X, Y, r, col, a) => { if (!(r > 0)) return; const g = x.createRadialGradient(X, Y, 0, X, Y, r); g.addColorStop(0, css(mix(col, [255, 255, 255], .5), a)); g.addColorStop(.35, css(col, a * .5)); g.addColorStop(1, css(col, 0)); x.fillStyle = g; x.fillRect(X - r, Y - r, 2 * r, 2 * r); };
const petal = (x, a0, r0, r1, w, col, al, role, curl) => { const ca = Math.cos(a0), sa = Math.sin(a0), Pt = (r, o) => [ca * r - sa * o, sa * r + ca * o];
  const dr = (rr0, rr1, ww, tw, aa) => { const [x0, y0] = Pt(rr0, 0), [x1, y1] = Pt(rr1, tw), [c1x, c1y] = Pt(rr0 + (rr1 - rr0) * .5, ww + tw * .5), [c2x, c2y] = Pt(rr0 + (rr1 - rr0) * .5, -ww + tw * .5);
    const g = x.createRadialGradient(x0, y0, 0, x0, y0, Math.max(.1, rr1 - rr0)); g.addColorStop(0, css(col, aa)); g.addColorStop(.7, css(col, aa * .45)); g.addColorStop(1, css(col, 0)); x.fillStyle = g; x.beginPath(); x.moveTo(x0, y0); x.quadraticCurveTo(c1x, c1y, x1, y1); x.quadraticCurveTo(c2x, c2y, x0, y0); x.fill(); };
  const L = r1 - r0;
  if (/bass/.test(role)) dr(r0, r0 + L * .75, w * 1.7, 0, al);
  else if (/melody|solo|lead/.test(role)) dr(r0, r1 * 1.08, w * .6, L * curl * .9, al);
  else if (/comp|harmony/.test(role)) { dr(r0, r1, w, 0, al * .7); dr(r0, r0 + L * .72, w * .8, 0, al * .6); dr(r0, r0 + L * .45, w * .6, 0, al * .6); }
  else if (/counter|answer/.test(role)) { const d = w * .5 / r1; petal(x, a0 - d, r0, r1, w * .55, col, al, 'x', curl); petal(x, a0 + d, r0, r1 * .9, w * .55, col, al * .8, 'x', curl); }
  else if (/drone/.test(role)) dr(r0, r1, w * 2.2, 0, al * .6);
  else if (/listen/.test(role)) dr(r0 + L * .3, r0 + L * .55, w * .5, 0, al);
  else dr(r0, r1, w, L * curl * .25, al); };
const canvasAt = (Rext, px) => { const S = Math.ceil(2 * Rext * px), c = mk(S, S); if (!c) return null; const x = c.getContext('2d'); x.translate(S / 2, S / 2); x.scale(px, px); x.globalCompositeOperation = 'lighter'; return { c, x }; };
const lowRes = (A, ext, px, fn) => { const S = Math.ceil(2 * A.Rout * ext * px), h = Math.max(16, Math.ceil(S / 2)), lo = mk(h, h); if (!lo) return null; const lx = lo.getContext('2d'), id = lx.createImageData(h, h), d8 = id.data, RR = A.Rout * ext;
  for (let j = 0; j < h; j++) for (let i = 0; i < h; i++) { const X = (i + .5) / h * 2 * RR - RR, Y = (j + .5) / h * 2 * RR - RR, o = fn(X, Y); if (!o) continue; const k = (j * h + i) * 4; d8[k] = o[0]; d8[k + 1] = o[1]; d8[k + 2] = o[2]; d8[k + 3] = clamp(o[3], 0, 255); }
  lx.putImageData(id, 0, 0); const c = mk(S, S); const x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(lo, 0, 0, S, S); return c; };
const L_haze = (A, px) => { const S = Math.ceil(2 * A.Rout * 1.35 * px), c = mk(S, S); if (!c) return null; const x = c.getContext('2d'), col = rampAt(A.pal[0].r, .7), g = x.createRadialGradient(S / 2, S / 2, A.R * .9 * px, S / 2, S / 2, S / 2);
  g.addColorStop(0, css(col, 1)); g.addColorStop(.45, css(col, .45)); g.addColorStop(1, css(col, 0)); x.fillStyle = g; x.fillRect(0, 0, S, S); return c; };
const L_field = (A, px) => { const N = mkNoise(A.seed), fold = TAU / Math.max(3, A.N1), sc = 1.15 / A.R, wp = .5 + 1.6 * A.curl;
  return lowRes(A, 1, px, (x, y) => { const r = Math.hypot(x, y); if (r < A.Rin || r > A.Rout) return null; const env = ss(A.Rin * .92, A.Rin + .4 * A.R, r) * (1 - ss(A.Rin + (A.Rout - A.Rin) * .3, A.Rout, r)); if (env <= 0) return null;
    let ph = ((Math.atan2(y, x) % fold) + fold) % fold; ph = Math.min(ph, fold - ph); const u = r * Math.cos(ph) * sc, v = r * Math.sin(ph) * sc, qx = N.fbm(u + 1.3, v + 7.1, .2, A.oct), qy = N.fbm(u + 5.2, v + 2.8, .9, A.oct);
    const d = N.fbm(u + wp * 3 * qx, v + wp * 3 * qy, 1.7, A.oct + 1), t = clamp(N.fbm(u * .7 + 4 * qx, v * .7 + 4 * qy, 3.1, 3) * 1.6 - .3, 0, .999), p = pick(A.pal, t), c = rampAt(p.r, clamp((d - .28) * 2 + (qy - .5), 0, 1));
    return [c[0], c[1], c[2], Math.pow(ss(.4, .74, d), 1.5) * env * (.5 + .7 * qx) * 1.3 * 255]; }); };
const L_rosette = (A, px, k) => { const q = canvasAt(A.Rout, px); if (!q) return null; const x = q.x, span = A.Rout - A.Rin;
  { const c0 = rampAt(A.pal[0].r, .6), g = x.createRadialGradient(0, 0, A.R * .9, 0, 0, A.Rin + span * .35); g.addColorStop(0, css(c0, .16 * k)); g.addColorStop(.4, css(c0, .12 * k)); g.addColorStop(1, css(c0, 0)); x.fillStyle = g; x.fillRect(-A.Rout, -A.Rout, 2 * A.Rout, 2 * A.Rout); }
  for (let lv = 0; lv < 3; lv++) { const sc = Math.pow(1 / PHI, lv), rot = lv * GA, r0 = A.Rin + span * .04, r1 = A.Rin + span * (.78 * sc + .1);
    A.cents.forEach((cn, i) => { const a = cn / A.per * TAU + rot, nx = (A.cents[i + 1] != null ? A.cents[i + 1] : A.per) - cn, w = (r1 - r0) * clamp(nx / A.per * A.N1 * .32, .14, .6), p = pick(A.pal, (i + .5) / A.N1); petal(x, a, r0, r1, w, rampAt(p.r, .35 + .25 * lv), (.5 - .1 * lv) * k, A.role, A.curl); }); }
  if (A.sc2) A.sc2.forEach((cn, i) => { const a = cn / 1200 * TAU + Math.PI / A.N1, p = pick(A.pal, 1 - (i + .5) / A.sc2.length); petal(x, a, A.Rin + span * .05, A.Rin + span * .4, span * .06, rampAt(p.r, .7), .14 * k, 'x', A.curl); });
  const n2 = A.G.length * A.reps, step = TAU / (A.gsum * A.reps); let a = 0;
  for (let i = 0; i < n2; i++) { const g = A.G[i % A.G.length], ac = a + g * step / 2, r0 = A.Rin + span * .5, r1 = r0 + span * (.16 + .03 * g), p = pick(A.pal, ((i % A.G.length) + .5) / A.G.length); petal(x, ac, r0, r1, Math.max(1.2, g * step * r0 * .35), rampAt(p.r, .55), .32 * k, 'x', A.curl); a += g * step; }
  for (let i = 1; i <= A.florets; i++) { const u = Math.sqrt(i / A.florets), rr = A.Rin + span * (.08 + .86 * u), an = i * GA, p = pick(A.pal, (i * .618) % 1); glowDot(x, Math.cos(an) * rr, Math.sin(an) * rr, (1.2 + 3.2 * u * (.6 + .4 * A.s)) * A.R / 18, rampAt(p.r, .8), (.28 + .25 * (1 - u)) * k); }
  return q.c; };
const L_roles = (A, px) => { const q = canvasAt(A.Rout, px); if (!q) return null; const x = q.x, roles = A.roles.length ? A.roles : ['melody'], span = A.Rout - A.Rin, rings = A.cb.polymeter ? 2 : 1;
  for (let ri = 0; ri < rings; ri++) { const Gm = ri ? (A.G3 || [4, 4, 4]) : A.G, n = Gm.length * Math.max(2, Math.round(12 / Gm.length)), r0 = A.Rin + span * (ri ? .62 : .32), r1 = r0 + span * .26;
    for (let i = 0; i < n; i++) { const role = roles[i % roles.length], a = (i + .5) / n * TAU + ri * .3, p = pick(A.pal, ((i % roles.length) + .5) / roles.length); petal(x, a, r0, r1, span * .08, rampAt(p.r, .65), .75, role, A.curl); } }
  return q.c; };
const L_students = (A, px) => { const pad = 1.3, q = canvasAt(A.Rout * pad, px); if (!q) return null; const x = q.x, r = rng(A.seed ^ 991); x.lineCap = 'round'; const span = A.Rout - A.Rin, spread = .62 / Math.sqrt(A.G.length) + .12, kids = /comp|harmony/.test(A.role) ? 3 : 2, depth = Math.max(1, Math.min(A.D, kids === 3 ? 6 : 8) - 1) + 1, Rin = A.Rin * 1.05, sz = A.R / 18;
  const br = (X, Y, ang, len, d, col, sg) => { const bend = A.curl * .22 * sg * (d % 2 ? 1 : -1), mx = X + Math.cos(ang + bend) * len * .55, my = Y + Math.sin(ang + bend) * len * .55, X2 = X + Math.cos(ang + bend * 1.6) * len, Y2 = Y + Math.sin(ang + bend * 1.6) * len, w = (.5 + .45 * d) * sz;
    for (const [lw, al] of [[w * 4, .06], [w, .5]]) { x.strokeStyle = css(col, al); x.lineWidth = lw; x.beginPath(); x.moveTo(X, Y); x.quadraticCurveTo(mx, my, X2, Y2); x.stroke(); }
    if (d <= 1) { glowDot(x, X2, Y2, (2.5 + 2 * A.s) * sz, mix(col, [255, 255, 255], .25), .45); return; } for (let i = 0; i < kids; i++) { const o = kids === 2 ? (i ? 1 : -1) : i - 1; br(X2, Y2, ang + bend * 1.6 + o * spread * (1 + .2 * (r() - .5)), len / PHI, d - 1, col, -sg); } };
  const n = Math.max(3, A.N1), L0 = span * (depth >= 3 ? .42 : .55); for (let i = 0; i < n; i++) { const a = A.cents[i % A.N1] / A.per * TAU + Math.PI / n, p = pick(A.pal, (i + .5) / n); br(Math.cos(a) * Rin, Math.sin(a) * Rin, a, L0, depth, rampAt(p.r, .62), i % 2 ? 1 : -1); }
  if (A.cb.orchard) for (let i = 0; i < 34; i++) { const an = i * GA, rr = A.Rout * (.72 + .2 * r()); glowDot(x, Math.cos(an) * rr, Math.sin(an) * rr, 4 * sz + 2 / px, [255, 230, 170], .7); }
  return q.c; };
const L_fusions = (A, px) => { const N = mkNoise(A.seed ^ 55), Lf = A.L.F, n = 3 + Math.round(Lf), f1 = TAU * (2 + Lf) / (A.Rout - A.Rin), p0 = A.pal[0].r, p1 = (A.pal[1] || A.pal[0]).r;
  return lowRes(A, 1, px, (X, Y) => { const r = Math.hypot(X, Y); if (r < A.Rin || r > A.Rout) return null; const th = Math.atan2(Y, X), w = N.fbm(X / A.R * .6, Y / A.R * .6, .3, 2), lr = Math.log(r / A.Rin) * (A.Rout - A.Rin) / A.R * 1.6;
    const v = (.5 + .5 * Math.sin(n * th + lr * 2.2 + 2 * w)) * (.5 + .5 * Math.sin(-(n + 2) * th + lr * 2.2 * PHI + 2 * w)), env = ss(A.Rin, A.Rin + A.R * .6, r) * (1 - ss(A.Rout * .8, A.Rout, r)), u = (r - A.Rin) / (A.Rout - A.Rin);
    let col; if (A.cb.prism) { const hh = (u * 1.4 + th / TAU + w) % 1; col = [0, 1, 2].map(q => 255 * (.55 + .45 * Math.cos(TAU * (hh + q / 3)))); } else col = mix(rampAt(p0, .75), rampAt(p1, .55), .5 + .5 * Math.sin(r * f1 * .5 + th));
    return [col[0], col[1], col[2], Math.pow(v, 2.2) * env * 230]; }); };
const L_places = (A, px) => { const Rh = A.Rout * 1.1, q = canvasAt(Rh, px); if (!q) return null; const x = q.x, r = rng(A.seed ^ 3131), sz = A.R / 18, fibs = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89, 144, 233, 377], n = fibs[clamp(Math.round(3 + 1.6 * A.L.P), 0, 12)], r0 = A.Rin + (A.Rout - A.Rin) * .55, star = A.cb.starRoad;
  for (let i = 1; i <= n; i++) { const u = Math.sqrt(i / n), rr = r0 + (Rh - r0) * u, an = i * GA, tint = star ? rampAt(pick(A.pal, (i * .618) % 1).r, .8) : mix([255, 250, 240], rampAt(A.pal[0].r, .8), .3); glowDot(x, Math.cos(an) * rr, Math.sin(an) * rr, (1 + 1.6 * r()) * (.7 + .1 * A.L.P) * sz, tint, .5 + .4 * r()); }
  const g = A.gn; if (g >= 2) for (let a = 0; a < g; a++) { let prev = null; for (let k = 0; k < 26; k++) { const th = k * .22, rr = A.Rin * 1.4 * Math.exp(.16 * th); if (rr > Rh) break; const an = a * TAU / g + th, X = Math.cos(an) * rr, Y = Math.sin(an) * rr, col = star ? rampAt(pick(A.pal, (k / 26 + a * .3) % 1).r, .85) : [235, 235, 255];
    glowDot(x, X, Y, (1.4 + .05 * k) * sz, col, .55); if (star && prev) { x.strokeStyle = css(col, .18); x.lineWidth = .8 * sz; x.beginPath(); x.moveTo(prev[0], prev[1]); x.lineTo(X, Y); x.stroke(); } prev = [X, Y]; } }
  return q.c; };
// the layer plan for a level (start conditions + rotation + mix weight, section 2.2); soft layers capped 256, sharp 384
Au.plan = A => { const Lm = A.Lm, L = A.L, cb = A.cb, k = (v, a, b) => ss(a, b, v), Ls = [];
  Ls.push({ name: 'haze', soft: 1, ext: 1.35, rate: 0, a: (Lm < 2 ? 1 : .5 - .25 * ss(3, 5, Lm)) * (cb.quiet ? .5 : 1), f: L_haze });
  if (Lm >= 1.3) Ls.push({ name: 'cultures', soft: 1, ext: 1, rate: .5, a: k(L.C, .5, 3) * k(Lm, 1.3, 2.6) * (cb.quiet ? 1.6 : 1), f: L_field });
  if (Lm >= 1.8 && L.J >= 1.5 && !cb.quiet) Ls.push({ name: 'jams', ext: 1, rate: A.counter ? -1 : 1, a: k(Lm, 1.8, 3), f: (A2, px) => L_rosette(A2, px, .5 + .7 * k(L.J, 2, 4.5)) });
  if (Lm >= 2.2 && L.R >= 1.5) Ls.push({ name: 'roles', ext: 1, rate: -.7, a: k(L.R, 1.5, 3.5) * k(Lm, 2.2, 3.2), f: L_roles });
  if (Lm >= 2.5 && A.D >= 1) Ls.push({ name: 'students', ext: 1.3, rate: .8, a: k(L.S, 1, 3) * k(Lm, 2.5, 3.5), f: L_students });
  if (Lm >= 2.6 && L.F >= 1) Ls.push({ name: 'fusions', soft: 1, ext: 1, rate: -.3, a: k(L.F, 1, 3.5) * k(Lm, 2.6, 3.6) * .9, f: L_fusions });
  if (Lm >= 2.4 && L.P >= 1) Ls.push({ name: 'places', ext: 1.1, rate: .2, a: k(L.P, 1, 3) * k(Lm, 2.4, 3.4), f: L_places });
  return Ls; };
Au.pxFor = (A, Ly, z) => Math.min(z, (Ly.soft ? P.capSoft : P.capSharp) / (2 * A.Rout * Ly.ext));
// ---------------- cache (bytes LRU) + bake jobs (one layer per frame) ----------------
const S = Au.S = { faint: new Map(), faintN: 0, pre: new Map(), preB: 0, preN: 0, px: 0, cache: new Map(), bytes: 0, jobs: [], lvl: 0, ema: 0, lvT: 0, baked: 0, drawn: 0 };
const bytesOf = c => c ? c.width * c.height * 4 : 0;
Au.put = (key, B) => { const old = S.cache.get(key); if (old) S.bytes -= old.bytes; S.cache.set(key, B); S.bytes += B.bytes; Au.evict(); };
// v0.8b2: never evict a look drawn this frame or the last (5+ big auras on screen used to evict each other every frame and re-bake forever);
// if that is still over the cap, the ones drawn flattened (not among the <= 3 full ones) keep only their flat + haze copies ('thin')
Au.evict = () => { const cap = P.cacheMB * 1048576; if (S.bytes <= cap) return; const fr = (S.frame || 0) - 1, ents = [...S.cache.entries()].sort((a, b) => a[1].used - b[1].used);
  for (const [k, B] of ents) { if (S.bytes <= cap) break; if (B.pin || B.used >= fr) continue; S.cache.delete(k); S.bytes -= B.bytes; S.evicted = (S.evicted || 0) + 1; }
  for (const [k, B] of ents) { if (S.bytes <= cap) break; if (B.pin || B.thin || !B.flat || (B.fullF || -9) >= fr || !B.layers || B.layers.length < 2) continue; let lb = 0; for (const Ly of B.layers.slice(1)) lb += bytesOf(Ly.c); B.layers = B.layers.slice(0, 1); B.thin = true; B.bytes -= lb; S.bytes -= lb; S.thinned = (S.thinned || 0) + 1; } };
// v0.8b2: one pending job per ohm look (a zoom-level flicker of its radius no longer queues a second copy), and a full queue drops the oldest
// job NOT yet started: before, the 7th request shifted out the job in progress, so with 4+ auras on screen whose lod flickered no bake ever finished
Au.job = (key, c, R, Lm, z) => { if (S.jobs.find(j => j.key === key || (j.ck && j.ck === c._auK))) return; const A = Au.derive(c, R, Lm), Ls = Au.plan(A); S.jobs.push({ key, ck: c._auK, A, Ls, z, i: 0, out: [], t0: Date.now() }); if (S.jobs.length > 6) S.jobs.splice(S.jobs[0].i > 0 ? 1 : 0, 1); };
// one bake step: the next layer of the first job; after the last layer: the flattened bitmap + the bloom sprite
Au.step = () => { const j = S.jobs[0]; if (!j) return false; const t0 = (G.performance || Date).now();
  if (j.i < j.Ls.length) { const Ly = j.Ls[j.i++], px = Au.pxFor(j.A, Ly, j.z), c = Ly.f(j.A, px); if (c) j.out.push({ name: Ly.name, c, ext: Ly.ext, rate: Ly.rate, a: Ly.a }); }
  else { S.jobs.shift(); const A = j.A, V = A.V, ext = 1.35, side = Math.min(P.capSharp, Math.ceil(2 * A.Rout * ext * j.z)), fl = mk(side, side); let bytes = 0;
    if (fl) { const x = fl.getContext('2d'), sc = side / (2 * A.Rout * ext); x.globalCompositeOperation = 'lighter'; for (const Ly of j.out) { const D = 2 * A.Rout * Ly.ext * sc; x.globalAlpha = clamp(V.alpha * Ly.a * (Au.W8[Ly.name] || 1), 0, 1); x.drawImage(Ly.c, (side - D) / 2, (side - D) / 2, D, D); } }
    let bloom = null; if (V.bloom > 0 && j.out.length) { const qd = 48, lo = mk(qd, qd); if (lo) { const lx = lo.getContext('2d'); lx.globalCompositeOperation = 'lighter'; for (const Ly of j.out) { const e = Math.min(1.1, Ly.ext), m = qd * .1 + (qd * .8) * (1 - e / 1.1) / 2; lx.globalAlpha = Ly.a; lx.drawImage(Ly.c, m, m, qd - 2 * m, qd - 2 * m); } bloom = mk(160, 160); bloom.getContext('2d').drawImage(lo, 0, 0, 160, 160); } }
    for (const Ly of j.out) bytes += bytesOf(Ly.c); bytes += bytesOf(fl) + bytesOf(bloom); Au.put(j.key, { A, V, layers: j.out, flat: fl, bloom, bytes, used: S.frame || 0, fullF: S.frame || 0, ms: Date.now() - j.t0 }); S.baked++; }
  S.stepMs = (G.performance || Date).now() - t0; return true; };
// lineage ghost (section 3): the master's fold at 1.3-2.6 R in its hue, alpha .75 * .5^(gen-1)
Au.ghost = (s, R, z) => { const key = 'lm:' + s.id + ':' + Math.round(Math.log2(Math.max(1, R * z)) * 2); let B = S.cache.get(key); if (B) return B; const col = Array.isArray(s.hue) ? s.hue : typeof s.hue === 'string' ? s.hue.split(',').map(Number) : [220, 220, 240], N1 = clamp(s.N1 || 5, 3, 12);
  const A = { R, Rin: R * 1.3, Rout: R * 2.6, pal: [{ k: 'l', w: 1, r: ramp(col, .8).map(c => mix(c, [255, 255, 255], .2)) }], cents: Array.from({ length: N1 }, (_, i) => i * 1200 / N1), per: 1200, N1, G: [4, 4, 4, 4], gsum: 16, reps: 4, role: 'x', curl: .4, florets: 13, s: .5, seed: s.seed >>> 0 };
  const c = L_rosette(A, Math.min(z, P.capSharp / (2 * A.Rout)), 1); if (!c) return null; B = { c, A, bytes: bytesOf(c), used: S.frame || 0 }; Au.put(key, B); return B; };
// ---------------- per-frame draw (behind the bodies) ----------------
Au.env = (c, t, bpmMid) => { const j = c.jam, L = j && j.leader && j.leader.mind; if (L && L.pos != null) { const bpb = Math.max(1, (RS.Mind.barLen ? RS.Mind.barLen(L) : 16) / 4), b = (((L.pos / 4) % bpb) + bpb) % bpb, ph = b - Math.floor(b), e = Math.exp(-ph * 5) * (1 - Math.exp(-ph * 120 - .5)); return Math.min(1, e * (Math.floor(b) === 0 ? 1 : 1 / P.downbeatBoost)); }
  return .5 - .5 * Math.cos(t * TAU * bpmMid / 60 / P.breathBeats); };
Au.select = (Sf) => { const v = Sf.view, out = []; if (!v) return out; const z = v.z || 1;
  for (const c of Sf.creatures) { if (c.dead) continue; const e = c.exp, Lm = e ? (c._auL != null ? c._auL : 0) : 0, gift = Te.gifted(c), lm = e && e.lm && e.lm.length;   /* v0.8b2: every ohm (a new one only faintly) */
    const R = RS.Creature.radius(c), Rt = R * Math.max(1.15, Au.vis(Lm).size) * 1.35; if (!Sf.inView(c.x, c.y, Rt)) continue; out.push({ c, Lm, R, gift, lm, d: Math.hypot(c.x - v.cx, c.y - v.cy) }); }
  out.sort((a, b) => a.d - b.d); let full = 0, mast = 0; for (const o of out) { o.full = false; if (o.Lm >= 4 && S.lvl < 1 && full < P.maxOnScreen && (o.Lm < 5 || mast < P.maxMasters)) { o.full = true; full++; if (o.Lm >= 5) mast++; } } return out; };
// v0.8b5 aura recovery: the quality ladder can always climb back. Before, level 3 (auras off) returned before anything was timed, so it never
// stepped down again; switching auras off and on kept the old level; and an audio clock that restarts (rebuild / restore) left t < lvT for minutes.
Au.ladderReset = t => { S.lvl = 0; S.ema = 0; S.lvT = t; S.offWait = 6; S.probe = 0; };
Au.frame = (ctx, Sf, t) => { if (!P.on) { S.wasOff = 1; return; } if (!Te || !Sf.view) return; if (S.wasOff) { S.wasOff = 0; Au.ladderReset(t); } if (!(t >= S.lvT)) S.lvT = t;
  if (S.lvl >= 3) { const fr0 = G.App && G.App.frameMs; if (t - S.lvT > (S.offWait || 6) && !(fr0 && fr0 > P.frameMs)) { S.lvl = 2; S.lvT = t; S.ema = P.budgetMs / 2; S.probe = 1; } else return; }   /* off: retry haze after a cool-off (6 s, doubling to 60 s while it keeps failing) */
  const T0 = (G.performance || Date).now(), v = Sf.view, z = v.z || 1; if (z < P.minZoom) return; S.frame = (S.frame || 0) + 1;
  const vmin = G.App && G.App.Wd ? Math.min(G.App.Wd, G.App.Ht) / z : (v.x1 - v.x0) / 1.4, list = Au.select(Sf); S.drawn = 0; S.faintN = 0; S.px = 0; S.preN = 0; S.pxCut = 0; { const m = ctx.getTransform && ctx.getTransform(); S.sc = m ? Math.hypot(m.a, m.b) : z; }   /* v0.8b5: device px drawn this frame (S.px) */
  const sb = { n: P.strandBakes, z, ms: 0 }, now = () => (G.performance || Date).now(); S.sDrawn = 0;   /* v0.8b6 strands: nearest first, own sub-budget (strandMs / maxStrands), off at ladder level 2+; b6+aurafast: drawn at device size and counted in the pixel budget, skipped past pxSoft */
  for (const o of list) { const c = o.c; let shown = false; if (c._auSK && z > .5 && S.lvl < 2 && sb.ms < P.strandMs && S.sDrawn < P.maxStrands >> S.lvl && S.px <= P.pxSoft) { const t1 = now(); if (Au.drawStrands(ctx, c, c.x, c.y, o.R, o.Lm, t, sb)) S.sDrawn++; sb.ms += now() - t1; } if (o.Lm >= P.bakeFrom && c._auK && S.px <= P.pxMax) {   /* v0.8b5: past the device-pixel budget (nearest first) the far ones fall back to the cheap glow */ const cap = P.maxScreenFrac * vmin / 2, Rtrue = o.R * Math.max(1.15, Au.vis(o.Lm).size), Rd = Math.min(Rtrue, cap), Rs = o.R * Rd / Rtrue, lod = Math.round(Math.log2(Math.max(1, Rd * z)) * 2), key = c._auK + '|' + lod;
      let B = S.cache.get(key); if (!B) { Au.job(key, c, Rs, o.Lm, z); B = c._auB && S.cache.get(c._auB); } else c._auB = key;
      if (B && o.full && B.thin) Au.job(key, c, Rs, o.Lm, z);   // a thinned look that is full again gets its layers back (drawn flat meanwhile)
      if (B) { B.used = S.frame; if (o.full) B.fullF = S.frame; const soft = S.px > P.pxSoft; if (soft) S.pxCut = (S.pxCut || 0) + 1; Au.draw(ctx, B, c.x, c.y, t, o.full && S.lvl < 1 && !soft, S.lvl >= 2 || soft, Au.env(c, t, B.A.rev ? 24000 / B.A.rev : 100)); S.drawn++; shown = true; } }
    if (!shown) { if (o.Lm >= P.bakeFrom && c._auK) S.pxCut = (S.pxCut || 0) + 1; Au.faint(ctx, c, o.R, Math.min(o.Lm, P.bakeFrom)); }   // below Lm 1, or while its first bake is still queued: the cheap glow
    if (o.lm && z > .5) for (const s of c.exp.lm) { if (s.gen > 3) continue; const B = Au.ghost(s, o.R, z); if (B) { B.used = S.frame; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = P.lineageAlpha * Math.pow(.5, s.gen - 1); const D = 2 * B.A.Rout; ctx.drawImage(B.c, c.x - D / 2, c.y - D / 2, D, D); ctx.restore(); } }
    if (o.gift && z > .5) Au.gifted(ctx, c.x, c.y, o.R, t); }
  for (let i = 0; i < P.bakePerFrame; i++) if (!Au.step()) break;
  const ms = (G.performance || Date).now() - T0 - (S.stepMs || 0); S.stepMs = 0; S.ema = S.ema * .9 + ms * .1; const fr = G.App && G.App.frameMs;
  if ((S.ema > P.budgetMs || (fr && fr > P.frameMs)) && t - S.lvT > 1) { S.lvl = Math.min(3, S.lvl + 1); S.lvT = t; if (S.lvl === 3) { S.offWait = S.probe ? Math.min(60, (S.offWait || 6) * 2) : 6; S.probe = 0; } } else if (S.ema < P.budgetMs / 3 && S.lvl > 0 && t - S.lvT > 6 && !(fr && fr > P.frameMs)) { S.lvl--; S.lvT = t; if (S.lvl <= 1) S.probe = 0; } };
Au.draw = (x, B, X, Y, t, full, hazeOnly, env) => { const A = B.A, V = B.V, sw = 1 + P.pulseDepth * V.pulse * env; x.save(); x.globalCompositeOperation = 'lighter';
  const q = (S.sc || 1) * (S.sc || 1); if (hazeOnly) { const h = B.layers[0]; if (h) { const D = 2 * A.Rout * h.ext; S.px += D * D * q; x.globalAlpha = clamp(V.alpha * h.a * .9, 0, 1); x.drawImage(h.c, X - D / 2, Y - D / 2, D, D); } }
  else if ((full && !B.thin) || !B.flat) for (const Ly of B.layers) { const D = 2 * A.Rout * Ly.ext; S.px += D * D * q; x.save(); x.globalAlpha = clamp(V.alpha * Ly.a * (Au.W8[Ly.name] || 1) * sw, 0, 1); x.translate(X, Y); if (Ly.rate) x.rotate(t * Ly.rate * TAU / A.rev); x.drawImage(Ly.c, -D / 2, -D / 2, D, D); x.restore(); }
  else { const D = 2 * A.Rout * 1.35; S.px += D * D * q; x.globalAlpha = clamp(sw, 0, 1); x.drawImage(B.flat, X - D / 2, Y - D / 2, D, D); }
  if (B.bloom && !hazeOnly) { const D = 2 * A.Rout * 1.1 / .8 * (1 + .05 * V.pulse * env); S.px += D * D * q; x.globalAlpha = clamp(V.bloom * (.6 + .8 * V.pulse * env), 0, 1); x.drawImage(B.bloom, X - D / 2, Y - D / 2, D, D); }
  x.restore(); };
// gifted-born cue (section 4): 5 pearl motes on a golden-angle spiral just outside the body + a faint pearl rim (colourless, small)
Au.gifted = (x, X, Y, R, t) => { x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createRadialGradient(X, Y, R * .95, X, Y, R * 1.35); g.addColorStop(0, 'rgba(255,250,235,0)'); g.addColorStop(.35, 'rgba(255,250,235,.16)'); g.addColorStop(1, 'rgba(255,250,235,0)'); x.fillStyle = g; x.fillRect(X - 2 * R, Y - 2 * R, 4 * R, 4 * R);
  for (let i = 0; i < 5; i++) { const an = t * .2 + i * GA, rr = R * (1.45 + .06 * i); glowDot(x, X + Math.cos(an) * rr, Y + Math.sin(an) * rr, R * .22, [255, 236, 190], 1); glowDot(x, X + Math.cos(an) * rr, Y + Math.sin(an) * rr, R * .09, [255, 255, 255], 1); } x.restore(); };
// ---------------- v0.8b6 EXPERIENCE STRANDS (Wilbow 8:51 / 8:57 PM: "This should show in the auras of developed ohms" / "All ohms should show experience
// and influenced styles in auras not just teachers and drums") ----------------
// Every ohm with an experience record (not only teachers / drummers) gets a faint strand sprite: one style strand per influencing tradition (e.tx,
// weighted by influence, the tradition hue), one sound strand per learned sound (e.sl layers + learned kit hits g.dk, coloured by the source family /
// kit slot, growing with progress) and, for a drummer, a 5-slot kit ring whose fullness reads sparse (young) -> rich (full kit). Teaching is a 0-1
// gradient (Te.teach), so strand reach grows with it - no title, no threshold. Look only, on screen only, no text. Cost: one small sprite
// (<= P.strandPx px) baked only when the quantised strand key changes (2 s tick), <= P.strandBakes bakes a frame, drawn as one drawImage.
// 0.8b2 hook: the 0.8b2 base aura (not on master yet, 8:51 PM) can take the strands into its own style-strand layer by setting
// Au.baseStrands = (ctx, c, St, X, Y, R, alpha) => bool (true = drawn there, skip the default sprite); St = Au.strands(c).
Object.assign(P, Object.assign({ strands: 1, strandPx: 128, strandBakes: 1, strandMaxStyle: 8, strandMaxSound: 12, strandMinA: .18, strandA: .5, strandMs: 1.5, maxStrands: 16 }, RS.WorldLook.teacherAura || {}));
Au.SLOTC = { low: [255, 112, 64], back: [255, 214, 92], time: [130, 226, 255], fill: [186, 136, 255], colour: [116, 255, 168] };
Au.famCol = k => { if (!k) return [200, 200, 220]; if (k === 'tract') return [255, 150, 196]; const m = /^perc:(\w+)/.exec(k); if (m) return Au.SLOTC[m[1]] || Au.SLOTC.colour; const h = ((RS.hash('fam', k) >>> 0) % 1000) / 1000; return hsl(h, .7, .62); };
const slotOf = h => RS.Drums && RS.Drums.slotOf ? RS.Drums.slotOf(h) : null;
// the family of a learned layer from its instrument snapshot (Ly.snap of the source's P.inst)
Au.famOf = q => { const I = q && q.P; if (!I) return q && q.k === 'hit' ? 'perc:fill' : 'other'; if ((I.percK || 0) > .5) { const h = I.dk && I.dk[0] ? I.dk[0].h : I.drum; return 'perc:' + (slotOf(h) || 'colour'); }
  if (I.engName === 'phys' && RS.Inst && RS.Inst.physFam) { try { return 'phys:' + RS.Inst.physFam(I); } catch (er) { } } return I.engName || 'other'; };
Au.strands = c => { const e = c && c.exp, own = c && c.col || [200, 200, 220]; if (!e) return { style: [], sounds: [], kit: null, teach: 0 };
  const style = top(e.tx, P.strandMaxStyle).filter(t => t[1] > 0).map(([k, w]) => ({ k, w: Math.round(w / (w + 1.5) * 1e3) / 1e3, col: hueOf(k) || own }));
  const sounds = []; for (const q of e.sl || []) { const k = Au.famOf(q); sounds.push({ k, src: q.s, p: clamp(q.p || 0, 0, 1), col: Au.famCol(k) }); }
  const dk = c.g && c.g.dk; let kit = null;
  if (dk && dk.length && RS.Drums && RS.Drums.kit) { for (const q of dk) if (q.l) { const s = slotOf(q.h || (q.x && q.x.base)) || 'colour', k = 'perc:' + s; sounds.push({ k, src: q.o, hit: q.h, p: clamp(q.p == null ? 1 : q.p, 0, 1), col: Au.SLOTC[s] || Au.SLOTC.colour }); }
    const sl = RS.Drums.kit(c.g), birth = {}; for (const q of dk) if (!q.l) birth[slotOf(q.h || (q.x && q.x.base)) || 'colour'] = 1; kit = { slots: sl, birth, fullness: RS.Drums.fullness(c.g) }; }
  return { style, sounds, kit, teach: Te.teach ? Te.teach(c) : 0 }; };
// quantised key: rebake only when something visible changes
Au.strandKey = c => { if (!P.strands || !c.exp) return null; const St = Au.strands(c); if (!St.style.length && !St.sounds.length && !St.kit) return null;
  return 's|' + St.style.map(s => s.k + Math.round(s.w * 8)).join(',') + '|' + St.sounds.map(s => s.k + Math.round(s.p * 8)).join(',') + '|' + (St.kit ? Au.KITS().map(s => Math.round(St.kit.slots[s] * 4) + (St.kit.birth[s] ? 'b' : '')).join('') : '') + '|' + Math.round(St.teach * 8); };
Au.KITS = () => (RS.Drums && RS.Drums.KIT) || ['low', 'back', 'time', 'fill', 'colour'];
Au.strandExt = 2.1;   // sprite radius in body radii
// bake (body radius 1 units, scaled at draw): style strands = slow curls round the body, sound strands = wisps radiating out, kit = 5 arcs
Au.bakeStrands = (c, St, Spx = P.strandPx) => { const px = Spx / (2 * Au.strandExt), q = canvasAt(Au.strandExt, px); if (!q) return null; const x = q.x, r = rng(RS.hash('strand', c.id) >>> 0), reach = .65 + .35 * St.teach; x.lineCap = 'round'; let n = 0;
  St.style.forEach((s, i) => { const a0 = r() * TAU, sp = (r() < .5 ? -1 : 1) * (.9 + .8 * s.w), r0 = 1.08 + .05 * i, r1 = r0 + (.35 + .5 * s.w) * reach; x.strokeStyle = css(s.col, .22 + .5 * s.w); x.lineWidth = .025 + .05 * s.w; x.beginPath();
    for (let j = 0; j <= 24; j++) { const u = j / 24, a = a0 + sp * u * 1.6, rr = r0 + (r1 - r0) * u; j ? x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : x.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); } x.stroke(); n++; });
  const ns = Math.min(St.sounds.length, P.strandMaxSound); for (let i = 0; i < ns; i++) { const s = St.sounds[i], a = i * GA + r() * .2, L = (.25 + .55 * s.p) * reach, r0 = 1.1, bend = (r() - .5) * .5;
    x.strokeStyle = css(s.col, .18 + .55 * s.p); x.lineWidth = .02 + .035 * s.p; x.beginPath(); x.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); x.quadraticCurveTo(Math.cos(a + bend) * (r0 + L * .6), Math.sin(a + bend) * (r0 + L * .6), Math.cos(a + bend * .4) * (r0 + L), Math.sin(a + bend * .4) * (r0 + L)); x.stroke(); glowDot(x, Math.cos(a + bend * .4) * (r0 + L), Math.sin(a + bend * .4) * (r0 + L), .06 + .06 * s.p, s.col, .3 + .5 * s.p); n++; }
  let nk = 0; if (St.kit) { const K = Au.KITS(), f = St.kit.fullness; K.forEach((s, i) => { const v = St.kit.slots[s] || 0; if (!(v > 0)) return; const a = -Math.PI / 2 + i * TAU / K.length, w = TAU / K.length * (.25 + .5 * v);
      x.strokeStyle = css(Au.SLOTC[s] || Au.SLOTC.colour, (St.kit.birth[s] ? .55 : .2 + .4 * v) * (.5 + .5 * f)); x.lineWidth = .05 + .05 * v; x.beginPath(); x.arc(0, 0, 1.03, a - w / 2, a + w / 2); x.stroke(); nk++; });
    if (f > .5) glowDot(x, 0, 0, 1.25 + .3 * f, [255, 240, 220], .06 * (f - .5) * 2); }
  return { c: q.c, n: { style: St.style.length, sounds: ns, kit: nk }, used: 0, bytes: bytesOf(q.c) }; };
// v0.8b6 + aurafast: the strand sprite is baked at its on-screen DEVICE size (6% geometric buckets, so a 1:1 blit is within 3% of the true size) and
// blitted unscaled and unrotated at whole device pixels, like the 0.8b5 glow (a scaled or rotated blit costs ~4x per pixel on CPU canvases). Bigger than
// strandPreMax, before a bake at the new size, or without getTransform: the old scaled blit. Every strand blit is counted in the device-pixel meter (S.px);
// past pxSoft the far ohms (nearest first) skip their strands. The slow b6 spin (t * .03 rad/s, one turn in ~3.5 min) is dropped: it forced a filtered blit.
P.strandPreMax = P.strandPreMax || 320; Au.strandStep = 1.06;
Au.strandLod = d => { const k = Math.round(Math.log(Math.max(16, d || 16)) / Math.log(Au.strandStep)); return Math.max(16, Math.min(P.strandPreMax, Math.round(Math.pow(Au.strandStep, k)))); };   // sprite px bucket for an on-screen device diameter
Au.strandAlpha = Lm => P.strandMinA + P.strandA * ss(0, 4, Lm || 0);   // subtle on beginners
Au.drawStrands = (ctx, c, X, Y, R, Lm, t, budget) => { if (!P.strands || !c._auSK) return false; const al = Au.strandAlpha(Lm);
  if (Au.baseStrands && Au.baseStrands(ctx, c, Au.strands(c), X, Y, R, al)) return true;
  const m = ctx.getTransform && ctx.getTransform(), sc = m ? Math.hypot(m.a, m.b) : (budget.z || 1), D = 2 * R * Au.strandExt, Dd = D * sc, Spx = Au.strandLod(Dd), key = c._auSK + '|' + Spx;   /* baked at its on-screen device size: a 1:1 blit is cheap, a scaled / rotated one is not */
  let B = S.cache.get(key); if (!B) { if (budget.n <= 0) { B = c._auSB && S.cache.get(c._auSB); } else { budget.n--; B = Au.bakeStrands(c, Au.strands(c), Spx); if (B) { Au.put(key, B); S.sBaked = (S.sBaked || 0) + 1; } } }
  if (!B) return false; c._auSB = key; B.used = S.frame; ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = clamp(al, 0, 1); const w = B.c.width;
  if (m && w === Spx && Dd <= P.strandPreMax * 1.03) { const XX = m.a * X + m.c * Y + m.e, YY = m.b * X + m.d * Y + m.f; ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(B.c, Math.round(XX - w / 2), Math.round(YY - w / 2)); S.px += w * w; S.sFast = (S.sFast || 0) + 1; }
  else { ctx.translate(X, Y); ctx.drawImage(B.c, -D / 2, -D / 2, D, D); S.px += Dd * Dd; } ctx.restore(); return true; };
// the 2 s tick (from Te.tick, on-screen ohms only): refresh the rebake keys (main aura + strands)
// v0.8b6 fills the 0.8b2 styleHook (Au.styles): the tint of every aura (baked palette + faint glow) comes from the same influences the strands
// show - the traditions it learned (weight tx / (tx + 1.5)) and, a little, the families of sounds it fully learned (incl. a drummer's learned
// kit slots). Cached at the 2 s key tick (on screen only); the frame path only reads c._auSty.
Au.sndStyleW = .25;
Au.styleOf = c => { const St = Au.strands(c), out = St.style.map(s => [s.k, s.w, s.col]), seen = {};
  for (const q of St.sounds) if (q.p >= 1 && !seen[q.k]) { seen[q.k] = 1; out.push(['snd:' + q.k, Au.sndStyleW, q.col]); }
  out.sort((a, b) => b[1] - a[1]); return out; };
Au.styleHook = (c, n) => { if (!P.strands || !c || !c.exp) return null; const L = c._auSty || (c._auSty = Au.styleOf(c)); return L.length ? L.slice(0, n) : null; };
{ const k0 = Au.keyOf; Au.sKey = L => L && L.length ? L.slice(0, 3).map(q => q[0] + ':' + Math.round(q[1] * 4)).join(',') : '';   /* b6: the style strands that tint the palette are part of the look -> part of the rebake key */
  Au.keyOf = c => { const k = k0(c); if (!k || !P.strands) return k; const sk = Au.sKey(c._auSty || (c._auSty = Au.styleOf(c))); return sk ? k + '|' + sk : k; }; }
Au.keyTick = c => { c._auSty = c.exp ? Au.styleOf(c) : null; c._auK = Au.keyOf(c); c._auSK = Au.strandKey(c); };
})(typeof window !== 'undefined' ? window : globalThis);
