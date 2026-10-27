'use strict';
// Light as a physical field (from Lensure optics.js): rays refract through CLEAR material (Snell + Cauchy dispersion + Schlick Fresnel),
// split white light into spectra, reflect off DENSE material, cast shadows. Water clusters act as droplets/prisms -> rainbows.
// Bodies hit get b.light = {I, wl}; bodies in the star's shadow get b.shadow. Pure (no DOM).
(function (G) {
const RS = G.RS, WLS = [430, 470, 510, 550, 590, 630, 670];
RS.Light = function (W) {
  const Lt = { beams: [], stats: { rays: 0, splits: 0, tir: 0, refl: 0 }, MAXB: 900 };
  const nAt = (mat, wl) => { const um = wl / 1000, B = mat.disp == null ? .0042 * 1.4 : mat.disp; return (mat.n || 1.5) + B / (um * um) - B / .3025; };   // Cauchy, anchored at 550 nm
  // geometry: outline polygons of bodies + droplet circles from water clusters
  const build = view => { const segs = [], circ = [], x = W.x, y = W.y; const vb = view || { x0: -1e9, y0: -1e9, x1: 1e9, y1: 1e9 };
    for (const b of W.bodies.values()) { if (b.kind === 'water' || !b.idx.length) continue; b._hit = 0; b._wl = 0; b._wI = 0; b._star = 0;
      let poly; if (b.closed) poly = b.idx.map(i => [x[i], y[i]]); else { const h = (b.thick || 3) / 2, L = [], R = []; const I = b.idx; for (let k = 0; k < I.length; k++) { const a = I[Math.max(0, k - 1)], c = I[Math.min(I.length - 1, k + 1)]; let tx = x[c] - x[a], ty = y[c] - y[a]; const m = Math.hypot(tx, ty) || 1; tx /= m; ty /= m; L.push([x[I[k]] - ty * h, y[I[k]] + tx * h]); R.push([x[I[k]] + ty * h, y[I[k]] - tx * h]); } poly = L.concat(R.reverse()); }
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of poly) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
      if (x1 < vb.x0 - 200 || x0 > vb.x1 + 200 || y1 < vb.y0 - 400 || y0 > vb.y1 + 200) continue;
      segs.push({ b, poly, x0, y0, x1, y1, clear: b.mat.clear > .4, mat: b.mat, emit: b.meta && b.meta.role === 'light' }); }
    // water droplets: grid clusters
    const cell = new Map(); for (const b of W.bodies.values()) if (b.kind === 'water') for (const i of b.idx) { if (!(W.fl[i] & 1)) continue; const k = Math.floor(x[i] / 26) + ',' + Math.floor(y[i] / 26); let c = cell.get(k); if (!c) cell.set(k, c = { sx: 0, sy: 0, n: 0 }); c.sx += x[i]; c.sy += y[i]; c.n++; }
    for (const c of cell.values()) if (c.n >= 3) circ.push({ cx: c.sx / c.n, cy: c.sy / c.n, r: Math.min(15, 3 + Math.sqrt(c.n) * 3.2) }); if (Lt.extra) { const ex = Lt.extra(); if (ex) for (const c of ex) if (c.cx > vb.x0 - 200 && c.cx < vb.x1 + 200 && c.cy > vb.y0 - 400 && c.cy < vb.y1 + 200) circ.push(c); }   /* v0.5b: pool surfaces + rain streaks are the droplets / prisms */
    return { segs, circ }; };
  const hitSeg = (ox, oy, dx, dy, ax, ay, bx, by) => { const ex = bx - ax, ey = by - ay, den = dx * ey - dy * ex; if (Math.abs(den) < 1e-9) return -1; const wx = ax - ox, wy = ay - oy, t = (wx * ey - wy * ex) / den, u = (wx * dy - wy * dx) / den; return (t > .05 && u >= 0 && u <= 1) ? t : -1; };
  const rayBox = (ox, oy, dx, dy, s) => { let t0 = 0, t1 = 1e9; for (const [o, d, lo, hi] of [[ox, dx, s.x0 - 1, s.x1 + 1], [oy, dy, s.y0 - 1, s.y1 + 1]]) { if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return false; continue; } let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) return false; } return true; };
  // refraction at a surface with normal n (pointing out of the denser medium side toward incoming ray handled by sign)
  const refract = (dx, dy, nx, ny, n1, n2) => { let cosi = -(dx * nx + dy * ny); if (cosi < 0) { nx = -nx; ny = -ny; cosi = -cosi; } const eta = n1 / n2, k = 1 - eta * eta * (1 - cosi * cosi);
    const rdx = dx + 2 * cosi * nx, rdy = dy + 2 * cosi * ny; if (k < 0) return { tir: true, rdx, rdy }; const ct = Math.sqrt(k), R0 = ((n1 - n2) / (n1 + n2)) ** 2, cc = n1 > n2 ? ct : cosi, R = R0 + (1 - R0) * Math.pow(1 - cc, 5);
    return { tx: eta * dx + (eta * cosi - ct) * nx, ty: eta * dy + (eta * cosi - ct) * ny, rdx, rdy, R }; };
  const cast = (G2, r, depth) => { let { x, y, dx, dy, I, wl, inside } = r, star = r.star; inside = inside || null;
    for (let bounce = 0; bounce < 10 && I > .03 && Lt.beams.length < Lt.MAXB; bounce++) { let best = 1e9, hit = null;
      for (const s of G2.segs) { if (!rayBox(x, y, dx, dy, s)) continue; const P = s.poly, n = P.length, closed = true; for (let k = 0; k < n; k++) { const a = P[k], b = P[(k + 1) % n]; const t = hitSeg(x, y, dx, dy, a[0], a[1], b[0], b[1]); if (t > 0 && t < best) { best = t; hit = { s, ax: a[0], ay: a[1], bx: b[0], by: b[1] }; } } }
      for (const c of G2.circ) { const fx = x - c.cx, fy = y - c.cy, B = fx * dx + fy * dy, C = fx * fx + fy * fy - c.r * c.r, D = B * B - C; if (D < 0) continue; const sq = Math.sqrt(D); let t = -B - sq; if (t < .05) t = -B + sq; if (t > .05 && t < best) { best = t; hit = { c }; } }
      const len = hit ? best : 3000, nx2 = x + dx * len, ny2 = y + dy * len; Lt.beams.push({ x1: x, y1: y, x2: nx2, y2: ny2, I, wl, src: curSrc, bn: bounce, d: depth, open: !hit, inside: !!inside }); Lt.stats.rays++;
      if (!hit) return; x = nx2; y = ny2;
      let mat, nX, nY, body = null, isIn;
      if (hit.c) { mat = { n: 1.333, disp: .0031 * 2.2, clear: 1 }; nX = (x - hit.c.cx) / hit.c.r; nY = (y - hit.c.cy) / hit.c.r; isIn = inside === hit.c; }
      else { const s = hit.s; body = s.b; mat = s.mat; const ex = hit.bx - hit.ax, ey = hit.by - hit.ay, m = Math.hypot(ex, ey) || 1; nX = ey / m; nY = -ex / m; isIn = inside === body;
        body._hit += I; if (star) body._star += I; if (wl && I > body._wI) { body._wI = I; body._wl = wl; }
        if (s.emit) return; if (!s.clear) { // dense: partial reflection (albedo), the rest absorbed -> shadow behind
          const dn = dx * nX + dy * nY; dx -= 2 * dn * nX; dy -= 2 * dn * nY; I *= .4; Lt.stats.refl++; x += dx * .2; y += dy * .2; continue; } }
      if (!wl) { // white light entering clear material splits into its spectrum (dispersion)
        if (depth < 2) { Lt.stats.splits++; for (const w of WLS) cast(G2, { x: x - dx * .1, y: y - dy * .1, dx, dy, I: I / WLS.length * 1.6, wl: w, inside, star }, depth + 1); return; } wl = 550; }
      const n = nAt(mat, wl), n1 = isIn ? n : 1, n2 = isIn ? 1 : n, rf = refract(dx, dy, nX, nY, n1, n2);
      if (rf.tir) { dx = rf.rdx; dy = rf.rdy; I *= .97; Lt.stats.tir++; x += dx * .2; y += dy * .2; continue; }
      if (rf.R * I > .06 && depth < 3) cast(G2, { x: x + rf.rdx * .2, y: y + rf.rdy * .2, dx: rf.rdx, dy: rf.rdy, I: I * rf.R, wl, inside, star }, depth + 1);
      const m = Math.hypot(rf.tx, rf.ty) || 1; dx = rf.tx / m; dy = rf.ty / m; I *= (1 - rf.R); inside = isIn ? null : (hit.c || body); x += dx * .2; y += dy * .2; } };
  // sources: [{kind:'sun', dir:[dx,dy], I, wl:null|nm, span:[x0,x1], y0}] or [{kind:'point', x,y, I, wl, n}]
  let curSrc = 'sun';
  Lt.trace = (sources, view) => { Lt.beams.length = 0; Lt.stats.rays = 0; Lt.stats.splits = 0; Lt.stats.tir = 0; Lt.stats.refl = 0; const G2 = build(view);
    for (const s of sources) { if (s.I < .02) continue; curSrc = s.glow ? 'glow' : s.kind; if (s.kind === 'sun') { const n = s.n || 26, [dx, dy] = s.dir; const px = -dy, py = dx; for (let k = 0; k < n; k++) { const u = (k + .5) / n, cx = s.cx + px * (u - .5) * s.w, cy = s.cy + py * (u - .5) * s.w; cast(G2, { x: cx - dx * 600, y: cy - dy * 600, dx, dy, I: s.I, wl: s.wl || null, star: true }, 0); } }
      else { const n = s.n || 14; for (let k = 0; k < n; k++) { const a = k / n * RS.TAU + (s.rot || 0); cast(G2, { x: s.x + Math.cos(a) * (s.r || 8), y: s.y + Math.sin(a) * (s.r || 8), dx: Math.cos(a), dy: Math.sin(a), I: s.I, wl: s.wl || null }, 0); } } }
    for (const s of G2.segs) { const b = s.b; const prev = b.light; b.light = b._hit > .03 ? { I: Math.min(2, b._hit), wl: b._wl || null } : null; b.lightPrev = prev; b.starHit = b._star; }
    Lt.drops = G2.circ; return Lt.beams; };
  return Lt; };
})(typeof window !== 'undefined' ? window : globalThis);
