'use strict';
// Handwriting -> letters, offline. A $P point-cloud recognizer (Vatavu, Anthony & Wobbrock 2012: stroke order/direction/count
// independent) with templates for a-z and A-Z generated from our own glyph skeletons plus jittered/slanted/scaled
// augmentations. Letters are grouped from strokes by horizontal overlap; word breaks by spacing (and, in play, pauses).
(function (G) {
const RS = G.RS, N = 32;
// glyph skeletons in a unit box (y down; lowercase x-height .42..1, ascender 0, descender to 1.4). 'l' = polyline, 'a' = arc cx cy r deg0 deg1 (0 = right, 90 = down)
const GL = {
  a: ['a .45 .7 .28 -10 -360 l .73 .42 .73 1'], b: ['l .25 0 .25 1 .25 .72 a .48 .72 .23 180 -180'], c: ['a .5 .7 .28 -40 -320'], d: ['a .45 .7 .28 -10 -360 l .73 0 .73 1'],
  e: ['l .22 .7 .78 .7 a .5 .7 .28 0 -320'], f: ['a .62 .2 .18 -10 -180 l .44 .2 .44 1', 'l .25 .45 .65 .45'], g: ['a .45 .68 .26 -10 -360 l .71 .44 .71 1.2 a .46 1.2 .25 0 170'],
  h: ['l .25 0 .25 1 .25 .68 a .48 .68 .23 180 360 l .71 1'], i: ['l .5 .42 .5 1', 'l .5 .2 .5 .24'], j: ['l .55 .42 .55 1.2 a .35 1.2 .2 0 170', 'l .55 .2 .55 .24'],
  k: ['l .28 0 .28 1', 'l .7 .42 .28 .72 .72 1'], l: ['l .5 0 .5 1'], m: ['l .15 .42 .15 1 .15 .6 a .32 .6 .17 180 360 l .49 1 .49 .6 a .66 .6 .17 180 360 l .83 1'],
  n: ['l .25 .42 .25 1 .25 .65 a .48 .65 .23 180 360 l .71 1'], o: ['a .5 .7 .28 -90 -450'], p: ['l .27 .42 .27 1.4 .27 .7 a .5 .7 .23 180 -180'],
  q: ['a .45 .7 .26 -10 -360 l .71 .44 .71 1.4 .85 1.3'], r: ['l .3 .42 .3 1 .3 .66 a .5 .68 .2 180 300'], s: ['a .5 .56 .14 -30 -270 a .5 .84 .14 -90 150'],
  t: ['l .45 .1 .45 1 .65 .95', 'l .25 .42 .68 .42'], u: ['l .25 .42 .25 .75 a .48 .75 .23 180 0 l .71 .42 .71 1'], v: ['l .2 .42 .5 1 .8 .42'], w: ['l .1 .42 .3 1 .5 .55 .7 1 .9 .42'],
  x: ['l .22 .42 .78 1', 'l .78 .42 .22 1'], y: ['l .22 .42 .5 .95', 'l .78 .42 .4 1.4'], z: ['l .22 .42 .78 .42 .22 1 .78 1'],
  A: ['l .15 1 .5 0 .85 1', 'l .3 .6 .7 .6'], B: ['l .2 1 .2 0 .55 0 a .55 .25 .25 -90 90 l .58 .5 a .58 .75 .25 -90 90 l .2 1'], C: ['a .55 .5 .45 -45 -315'],
  D: ['l .2 1 .2 0 .45 0 a .45 .5 .5 -90 90 l .2 1'], E: ['l .78 0 .2 0 .2 1 .78 1', 'l .2 .5 .65 .5'], F: ['l .78 0 .2 0 .2 1', 'l .2 .5 .65 .5'], G: ['a .52 .5 .42 -40 -355 l .6 .55'],
  H: ['l .2 0 .2 1', 'l .8 0 .8 1', 'l .2 .5 .8 .5'], I: ['l .5 0 .5 1', 'l .3 0 .7 0', 'l .3 1 .7 1'], J: ['l .7 0 .7 .75 a .45 .75 .25 0 180'], K: ['l .2 0 .2 1', 'l .8 0 .2 .55 .8 1'],
  L: ['l .2 0 .2 1 .8 1'], M: ['l .1 1 .1 0 .5 .6 .9 0 .9 1'], N: ['l .2 1 .2 0 .8 1 .8 0'], O: ['a .5 .5 .45 -90 -450'], P: ['l .2 1 .2 0 .55 0 a .55 .27 .27 -90 90 l .2 .54'],
  Q: ['a .5 .5 .45 -90 -450', 'l .6 .7 .95 1.05'], R: ['l .2 1 .2 0 .55 0 a .55 .27 .27 -90 90 l .2 .54 .5 .54 .85 1'], S: ['a .5 .27 .25 -20 -270 a .5 .75 .25 -90 150'],
  T: ['l .1 0 .9 0', 'l .5 0 .5 1'], U: ['l .2 0 .2 .6 a .5 .6 .3 180 0 l .8 0'], V: ['l .1 0 .5 1 .9 0'], W: ['l .05 0 .27 1 .5 .4 .73 1 .95 0'], X: ['l .15 0 .85 1', 'l .85 0 .15 1'],
  Y: ['l .15 0 .5 .5 .85 0', 'l .5 .5 .5 1'], Z: ['l .15 0 .85 0 .15 1 .85 1'] };
// parse a skeleton stroke into points (dense), so augmentation and resampling work on real curves
function parse(str) { const t = str.split(/\s+/), pts = []; let i = 0; while (i < t.length) { const k = t[i++];
    if (k === 'l') { while (i < t.length && t[i] !== 'l' && t[i] !== 'a') { pts.push([+t[i], +t[i + 1]]); i += 2; } }
    else if (k === 'a') { const cx = +t[i], cy = +t[i + 1], r = +t[i + 2], a0 = +t[i + 3], a1 = +t[i + 4]; i += 5; const n = Math.max(6, Math.round(Math.abs(a1 - a0) / 12)); for (let q = 0; q <= n; q++) { const a = (a0 + (a1 - a0) * q / n) * Math.PI / 180; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } } }
  return pts; }
const SK = {}; for (const ch in GL) SK[ch] = GL[ch].map(parse);
// $P core
// each stroke gets points in proportion to its length but at least MINP (so i/j dots and t/f bars count)
const MINP = 4;
function resampleCloud(strokes, n = N) { strokes = strokes.filter(s => s.length); if (strokes.length <= 1) return resample1(strokes, n);
  const len = strokes.map(s => { let L = 0; for (let i = 1; i < s.length; i++) L += Math.hypot(s[i][0] - s[i - 1][0], s[i][1] - s[i - 1][1]); return L; }), tot = len.reduce((a, b) => a + b, 0) || 1;
  let alloc = len.map(L => Math.max(MINP, Math.round(L / tot * n))); while (alloc.reduce((a, b) => a + b, 0) > n) { const i = alloc.indexOf(Math.max(...alloc)); alloc[i]--; } while (alloc.reduce((a, b) => a + b, 0) < n) { const i = alloc.indexOf(Math.max(...alloc)); alloc[i]++; }
  const out = []; strokes.forEach((s, k) => { for (const p of resample1([s], alloc[k])) out.push(p); }); return out; }
function resample1(strokes, n = N) { // strokes: [[ [x,y],... ], ...] -> n points with stroke ids
  const P = []; strokes.forEach((s, id) => s.forEach(p => P.push({ x: p[0], y: p[1], id }))); let L = 0; for (let i = 1; i < P.length; i++) if (P[i].id === P[i - 1].id) L += Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y);
  if (P.length === 0) return []; if (L === 0) return Array.from({ length: n }, () => ({ x: P[0].x, y: P[0].y }));
  const I = L / (n - 1); let D = 0; const out = [{ x: P[0].x, y: P[0].y }]; const Q = P.slice();
  for (let i = 1; i < Q.length; i++) { if (Q[i].id !== Q[i - 1].id) continue; const d = Math.hypot(Q[i].x - Q[i - 1].x, Q[i].y - Q[i - 1].y);
    if (D + d >= I && d > 0) { const t = (I - D) / d, q = { x: Q[i - 1].x + t * (Q[i].x - Q[i - 1].x), y: Q[i - 1].y + t * (Q[i].y - Q[i - 1].y), id: Q[i].id }; out.push(q); Q.splice(i, 0, q); D = 0; } else D += d; }
  while (out.length < n) out.push({ x: P[P.length - 1].x, y: P[P.length - 1].y }); return out.slice(0, n); }
function normalize(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of pts) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y); }
  const s = Math.max(x1 - x0, y1 - y0) || 1; let cx = 0, cy = 0; const q = pts.map(p => ({ x: (p.x - x0) / s, y: (p.y - y0) / s })); for (const p of q) { cx += p.x; cy += p.y; } cx /= q.length; cy /= q.length; return { pts: q.map(p => ({ x: p.x - cx, y: p.y - cy })), asp: (y1 - y0) / Math.max(1e-6, x1 - x0) }; }
function cloudDist(a, b, start, minSoFar) { const n = a.length, used = new Uint8Array(n); let sum = 0, i = start, w;
  do { let idx = -1, md = Infinity; for (let j = 0; j < n; j++) if (!used[j]) { const dx = a[i].x - b[j].x, dy = a[i].y - b[j].y, d = dx * dx + dy * dy; if (d < md) { md = d; idx = j; } }
    used[idx] = 1; w = 1 - ((i - start + n) % n) / n; sum += w * Math.sqrt(md); if (sum >= minSoFar) return sum; i = (i + 1) % n; } while (i !== start); return sum; }
function greedy(a, b, best) { const n = a.length, step = Math.floor(Math.pow(n, .5)); let m = best; for (let i = 0; i < n; i += step) { const d1 = cloudDist(a, b, i, m); if (d1 < m) m = d1; const d2 = cloudDist(b, a, i, m); if (d2 < m) m = d2; } return m; }
// templates: skeleton + augmentations (seeded): slant, aspect, rotation, wobble along the stroke
function warp(strokes, r, amt) { const sl = (r() - .5) * .5 * amt, ax = 1 + (r() - .5) * .35 * amt, ay = 1 + (r() - .5) * .35 * amt, rot = (r() - .5) * .25 * amt, ph = r() * 6.28, wob = .025 * amt, c = Math.cos(rot), s = Math.sin(rot);
  return strokes.map(st => st.map(([x, y], k) => { let X = (x + sl * (1 - y)) * ax, Y = y * ay; const w = Math.sin(k * .7 + ph) * wob; X += w; Y += Math.cos(k * .55 + ph) * wob; return [X * c - Y * s, X * s + Y * c]; })); }
const INK = { templates: [], N };
INK.build = (aug = 10, seed = 1234) => { const r = RS.rng(seed); INK.templates = []; for (const ch in SK) { const add = st => { const nz = normalize(resampleCloud(st)); INK.templates.push({ ch, pts: nz.pts, asp: nz.asp }); }; add(SK[ch]); for (let k = 0; k < aug; k++) add(warp(SK[ch], r, 1)); } return INK.templates.length; };
INK.letter = strokes => { if (!INK.templates.length) INK.build(); const nz = normalize(resampleCloud(strokes)); let best = Infinity, ch = null; const sc = {};
  for (const t of INK.templates) { const d = greedy(nz.pts, t.pts, Math.min(best, sc[t.ch] == null ? Infinity : sc[t.ch])) + Math.abs(Math.log((nz.asp + .05) / (t.asp + .05))) * .6; if (sc[t.ch] == null || d < sc[t.ch]) sc[t.ch] = d; if (d < best) { best = d; ch = t.ch; } }
  return { ch, score: best }; };
// a word: strokes (any coordinates) -> letters by horizontal overlap -> recognised text; big horizontal gaps = spaces
INK.word = strokes => { const S = strokes.filter(s => s.length).map(s => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of s) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } return { s, x0, x1, y0, y1, cx: (x0 + x1) / 2 }; });
  // a stroke joins a letter when their x-ranges contain each other's centres (dots, crossbars, two-stroke letters)
  S.sort((a, b) => a.cx - b.cx); const L = []; for (const st of S) { let tgt = null; for (let k = L.length - 1; k >= Math.max(0, L.length - 2); k--) { const l = L[k], lc = (l.x0 + l.x1) / 2; if ((st.cx >= l.x0 - 2 && st.cx <= l.x1 + 2) || (lc >= st.x0 - 2 && lc <= st.x1 + 2)) { tgt = l; break; } }
    if (tgt) { tgt.s.push(st.s); tgt.x0 = Math.min(tgt.x0, st.x0); tgt.x1 = Math.max(tgt.x1, st.x1); tgt.y0 = Math.min(tgt.y0, st.y0); tgt.y1 = Math.max(tgt.y1, st.y1); } else L.push({ s: [st.s], x0: st.x0, x1: st.x1, y0: st.y0, y1: st.y1 }); }
  L.sort((a, b) => a.x0 - b.x0); const med = a => { const q = a.slice().sort((x, y) => x - y); return q[q.length >> 1] || 0; };
  const gaps = L.slice(1).map((l, k) => l.x0 - L[k].x1), hMed = med(L.map(l => l.y1 - l.y0)) || 1, thr = Math.max(1.1 * hMed, 2.5 * Math.max(2, med(gaps)));
  let txt = ''; L.forEach((l, k) => { if (k && gaps[k - 1] > thr) txt += ' '; txt += INK.letter(l.s).ch || ''; });
  return { text: txt.toLowerCase(), raw: txt, letters: L.length }; };
// synthetic handwriting for tests: a different noise model from the training augmentations (seeded, per-point jitter + warp + scale + translation)
INK.synth = (text, seed, o = {}) => { const r = RS.rng(seed), sz = o.size || 30, jit = o.jitter == null ? .03 : o.jitter, out = []; let x = o.x || 0; const y = o.y || 0;
  for (const ch of text) { if (ch === ' ') { x += sz * 1.4; continue; } const sk = SK[ch]; if (!sk) continue; const w = warp(sk, r, o.warp == null ? 1.3 : o.warp); let mx = 0; for (const st of w) { const pts = st.map(([a, b]) => [x + (a + (r() - .5) * jit * 2) * sz, y + (b + (r() - .5) * jit * 2) * sz]); out.push(pts); for (const p of pts) mx = Math.max(mx, p[0]); } x = mx + sz * .3; }
  return out; };
INK.SK = SK; INK.GL = GL;
RS.Ink = INK;
})(typeof window !== 'undefined' ? window : globalThis);
