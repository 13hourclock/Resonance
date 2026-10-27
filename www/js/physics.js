'use strict';
// ONE material: particles (Verlet, fixed dt) joined by springs. Rods, strings, drums, bars, creatures, water: all the same stuff.
// Pure JS, no DOM. World.step(dt) is deterministic for a given input sequence.
(function (G) {
const RS = G.RS;
RS.World = function (opt = {}) {
  const W = {}, CAP = opt.cap || 6000, SCAP = CAP * 4;
  const x = new Float32Array(CAP), y = new Float32Array(CAP), px = new Float32Array(CAP), py = new Float32Array(CAP), im = new Float32Array(CAP), rad = new Float32Array(CAP),
    bod = new Int32Array(CAP), fl = new Uint8Array(CAP), fx = new Float32Array(CAP), fy = new Float32Array(CAP), heat = new Float32Array(CAP);
  const sa = new Int32Array(SCAP), sb = new Int32Array(SCAP), sr = new Float32Array(SCAP), sk = new Float32Array(SCAP), sbody = new Int32Array(SCAP);
  Object.assign(W, { x, y, px, py, im, rad, bod, fl, fx, fy, heat, sa, sb, sr, sk, sbody, n: 0, ns: 0, bodies: new Map(), nextBody: 1, events: [], t: 0, dt: 1 / 120, iters: 8,
    grav: { kind: 'planet', cx: 0, cy: 1e5, R: 1e5 - 400, g: 900 }, bounds: opt.bounds || { x0: -1500, y0: -2500, x1: 1500, y1: 1500 }, free: [] });
  // ---- particles & springs ----
  W.addP = (X, Y, m = 1, r = 5, b = 0, f = 0) => { let i; if (W.free.length) i = W.free.pop(); else { if (W.n >= CAP) return -1; i = W.n++; } x[i] = px[i] = X; y[i] = py[i] = Y; im[i] = m > 0 ? 1 / m : 0; rad[i] = r; bod[i] = b; fl[i] = f | 1; fx[i] = fy[i] = 0; heat[i] = 0; return i; };
  W.addS = (a, b, k, rest, body) => { if (W.ns >= SCAP) return -1; const i = W.ns++; sa[i] = a; sb[i] = b; sk[i] = k; sr[i] = rest == null ? Math.hypot(x[a] - x[b], y[a] - y[b]) : rest; sbody[i] = body || 0; return i; };
  // flags: 1 alive, 2 fluid, 4 pinned-to-world, 8 ground-touch(this step)
  W.newBody = (kind, mat) => { const b = { id: W.nextBody++, kind, mat: Object.assign({ stiff: .9, bend: .3, damp: .002, mass: 1, clear: 0, n: 1.5, fric: .4 }, mat || {}), idx: [], springs: [], pins: [], tension: 1, closed: false, age: 0, light: null, lit: 0, energy: 0 }; W.bodies.set(b.id, b); return b; };
  W.removeBody = b => { if (W.pins) W.pins = W.pins.filter(p => bod[p.i] !== b.id); for (const i of b.idx) { fl[i] = 0; x[i] = px[i]; y[i] = py[i]; fx[i] = fy[i] = 0; W.free.push(i); } if (!RS.LIFO) W.free.sort((p, q) => q - p);   /* reuse slots lowest-first, like fresh allocation (LIFO reuse flung re-added soft bodies) */ for (const s of b.springs) sk[s] = 0; W.bodies.delete(b.id); W.compact(); };
  W.compact = () => { let j = 0; for (let i = 0; i < W.ns; i++) { if (sk[i] === 0) continue; if (fl[sa[i]] === 0 || fl[sb[i]] === 0) continue; sa[j] = sa[i]; sb[j] = sb[i]; sk[j] = sk[i]; sr[j] = sr[i]; sbody[j] = sbody[i]; j++; } W.ns = j;
    for (const b of W.bodies.values()) b.springs = []; for (let i = 0; i < W.ns; i++) { const b = W.bodies.get(sbody[i]); if (b) b.springs.push(i); } if (W.onCompact) W.onCompact(); };
  // ---- builders (the drawn shape decides the physics) ----
  const resample = (pts, sp) => { if (!(sp > .5) || !Number.isFinite(sp)) sp = 10; const out = [pts[0].slice()]; let acc = 0; for (let i = 1; i < pts.length; i++) { let [ax, ay] = pts[i - 1]; const [bx, by] = pts[i]; let d = Math.hypot(bx - ax, by - ay); if (!Number.isFinite(d)) continue; while (acc + d >= sp && out.length < 4096) { const t = (sp - acc) / d; ax += (bx - ax) * t; ay += (by - ay) * t; out.push([ax, ay]); d = Math.hypot(bx - ax, by - ay); acc = 0; } acc += d; } const l = pts[pts.length - 1]; if (Math.hypot(out[out.length - 1][0] - l[0], out[out.length - 1][1] - l[1]) > sp * .4) out.push(l.slice()); return out; };
  W.resample = resample; W.ROD_MAX = 240;
  // open stroke -> rod/string/ramp. thick: px. bend stiffness grows with thickness (thin = string-like, thick = bar)
  W.makeRod = (pts, thick, mat) => { let sp = RS.clamp(thick * 1.1, 7, 14), P = resample(pts, sp); if (P.length > W.ROD_MAX) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); sp = L / (W.ROD_MAX - 1.5); P = resample(pts, sp); if (P.length > W.ROD_MAX) P.length = W.ROD_MAX; W.rodCapped = (W.rodCapped || 0) + 1; }   /* stab: <= ROD_MAX pieces (coarser spacing past that) */ if (P.length < 2 || P.some(q => !Number.isFinite(q[0]) || !Number.isFinite(q[1]))) return null; const b = W.newBody('rod', mat); b.thick = thick;
    const m = (mat && mat.mass || 1) * thick / 6; for (const [X, Y] of P) b.idx.push(W.addP(X, Y, m, Math.max(3, thick / 2), b.id));
    const bend = RS.clamp((thick - 3) / 14, .02, 1) * (mat && mat.bendK || 1); b.mat.bend = bend;
    for (let i = 1; i < b.idx.length; i++) b.springs.push(W.addS(b.idx[i - 1], b.idx[i], b.mat.stiff, null, b.id));
    for (let i = 2; i < b.idx.length; i++) b.springs.push(W.addS(b.idx[i - 2], b.idx[i], bend, null, b.id));
    for (let i = 3; i < b.idx.length; i++) if (bend > .3) b.springs.push(W.addS(b.idx[i - 3], b.idx[i], bend * .6, null, b.id));
    b.rest0 = W.length(b); return b; };
  // closed outline -> pressurised soft body filled to that outline (membrane / drum / blob)
  W.makeBlob = (pts, mat, kind = 'blob') => { let P = resample(pts.concat([pts[0]]), (mat && mat.sp) || 11); if (P.length > 3 && Math.hypot(P[0][0] - P[P.length - 1][0], P[0][1] - P[P.length - 1][1]) < 6) P.pop(); if (P.length < 5) { if (pts.length >= 5) P = pts.map(q => [q[0], q[1]]); else return null; }   /* tiny beads keep their own polygon instead of failing */
    const b = W.newBody(kind, Object.assign({ pressure: 1, stiff: .85, bend: .25 }, mat || {})); b.closed = true;
    const m = (mat && mat.mass || 1); for (const [X, Y] of P) b.idx.push(W.addP(X, Y, m, (mat && mat.r) || 5, b.id));
    const n = b.idx.length; for (let i = 0; i < n; i++) b.springs.push(W.addS(b.idx[i], b.idx[(i + 1) % n], b.mat.stiff, null, b.id));
    for (let i = 0; i < n; i++) b.springs.push(W.addS(b.idx[i], b.idx[(i + 2) % n], b.mat.bend, null, b.id));
    if (W.area(b) < 0) { b.idx.reverse(); } b.area0 = Math.abs(W.area(b)); b.rest0 = W.length(b); return b; };
  W.makeWater = (pts, spacing = 9) => { const b = W.newBody('water', { clear: 1, n: 1.333, fric: .05, damp: .004 }); const P = resample(pts, spacing);
    for (const [X, Y] of P) for (let k = 0; k < 2; k++) b.idx.push(W.addP(X + (k ? 3 : -3), Y + (k ? 2 : -2), .6, 4.2, b.id, 2)); return b; };
  W.pin = (i, X, Y) => { fl[i] |= 4; W.pins = W.pins || []; W.pins.push({ i, X: X == null ? x[i] : X, Y: Y == null ? y[i] : Y }); const b = W.bodies.get(bod[i]); if (b) b.pins.push(i); };
  W.unpin = i => { fl[i] &= ~4; W.pins = (W.pins || []).filter(p => p.i !== i); const b = W.bodies.get(bod[i]); if (b) b.pins = b.pins.filter(q => q !== i); };
  W.attach = (i, j, k = 1) => { const s = W.addS(i, j, k, 0, -1); const b = W.bodies.get(bod[i]); if (b) { b.pins.push(i); b.links = b.links || []; b.links.push(j); } return s; };
  // ---- measures (geometry feeds the sound) ----
  W.length = b => { let L = 0; const I = b.idx; for (let k = 1; k < I.length; k++) L += Math.hypot(x[I[k]] - x[I[k - 1]], y[I[k]] - y[I[k - 1]]); if (b.closed) L += Math.hypot(x[I[0]] - x[I[I.length - 1]], y[I[0]] - y[I[I.length - 1]]); return L; };
  W.area = b => { let A = 0; const I = b.idx, n = I.length; for (let k = 0; k < n; k++) { const a = I[k], c = I[(k + 1) % n]; A += x[a] * y[c] - x[c] * y[a]; } return A / 2; };
  W.center = b => { let cx = 0, cy = 0; for (const i of b.idx) { cx += x[i]; cy += y[i]; } const n = b.idx.length || 1; return [cx / n, cy / n]; };
  W.vel = b => { let vx = 0, vy = 0; for (const i of b.idx) { vx += x[i] - px[i]; vy += y[i] - py[i]; } const n = b.idx.length || 1; return [vx / n / W.dt, vy / n / W.dt]; };
  W.stretch = b => { let s = 0, c = 0; for (const k of b.springs) { if (k < 0) continue; const a = sa[k], d = sb[k]; if (sbody[k] !== b.id) continue; const L = Math.hypot(x[a] - x[d], y[a] - y[d]); if (sr[k] > 0 && Math.abs(sb[k] - sa[k]) <= 1 || (b.closed && sk[k] === b.mat.stiff)) { s += L / sr[k]; c++; } } return c ? s / c : 1; };
  W.nearest = (X, Y, maxD = 30, filter) => { let bi = -1, bd = maxD * maxD; for (let i = 0; i < W.n; i++) { if (!(fl[i] & 1)) continue; if (filter && !filter(i)) continue; const d = (x[i] - X) ** 2 + (y[i] - Y) ** 2; if (d < bd) { bd = d; bi = i; } } return bi; };
  W.inside = (b, X, Y) => { if (!b.closed) return false; let c = false; const I = b.idx, n = I.length; for (let k = 0, j = n - 1; k < n; j = k++) { const a = I[k], d = I[j]; if (((y[a] > Y) !== (y[d] > Y)) && X < (x[d] - x[a]) * (Y - y[a]) / (y[d] - y[a]) + x[a]) c = !c; } return c; };
  W.bodyAt = (X, Y, slop = 14) => { let best = null, bd = 1e9; for (const b of W.bodies.values()) { if (b.kind === 'water') continue; if (W.inside(b, X, Y)) { const [cx, cy] = W.center(b); const d = Math.hypot(cx - X, cy - Y) * .2; if (d < bd) { bd = d; best = b; } continue; }
      for (const i of b.idx) { const d = Math.hypot(x[i] - X, y[i] - Y) - rad[i]; if (d < slop && d < bd) { bd = d; best = b; } } } return best; };
  // ---- gravity field: a planet below (surface scale) or microgravity in open space ----
  W.gAt = (X, Y) => { const g = W.grav; if (g.kind === 'none') return [0, 0]; const dx = g.cx - X, dy = g.cy - Y, d = Math.hypot(dx, dy) || 1; return [dx / d * g.g, dy / d * g.g]; };
  W.groundY = X => { const g = W.grav; if (g.kind !== 'planet') return 1e9; if (g.terrain) { const T = g.terrain; let th = Math.asin(RS.clamp((X - g.cx) / (T.R + T.height(0)), -1, 1)); for (let k = 0; k < 3; k++) { const rr = T.R + T.height(th); th = Math.asin(RS.clamp((X - g.cx) / rr, -1, 1)); } const rr = T.R + T.height(th); return g.cy - Math.cos(th) * rr; } const dx = X - g.cx; return g.cy - Math.sqrt(Math.max(0, g.R * g.R - dx * dx)); };
  W.surfAt = (X, Y) => { const g = W.grav, T = g.terrain; if (!T) return [X, W.groundY(X)]; const th = Math.atan2(X - g.cx, -(Y - g.cy)); return T.surf(th); };
  // ---- spatial hash ----
  const HS = 8192, head = new Int32Array(HS).fill(-1), nxt = new Int32Array(CAP).fill(-1), CS = 16; const hk = (cx, cy) => ((cx * 73856093) ^ (cy * 19349663)) & (HS - 1);
  const buildHash = () => { head.fill(-1); for (let i = 0; i < W.n; i++) { if (!(fl[i] & 1)) continue; const k = hk(Math.floor(x[i] / CS), Math.floor(y[i] / CS)); nxt[i] = head[k]; head[k] = i; } };
  W.rehash = buildHash;   // v0.8 song save: a restored snapshot moves points; re-index them before anything queries
  W.query = (X, Y, R, cb) => { const c0 = Math.floor((X - R) / CS), c1 = Math.floor((X + R) / CS), r0 = Math.floor((Y - R) / CS), r1 = Math.floor((Y + R) / CS); if (!((c1 - c0 + 1) * (r1 - r0 + 1) <= 4096)) { if (Number.isFinite(X) && Number.isFinite(Y) && R > 0) for (let j = 0; j < W.n; j++) cb(j); return; }   /* stab: a huge / NaN radius never walks millions of cells */ for (let cx = c0; cx <= c1; cx++) for (let cy = r0; cy <= r1; cy++) { for (let j = head[hk(cx, cy)]; j >= 0; j = nxt[j]) cb(j); } };
  // ---- step ----
  const rho = new Float32Array(CAP), rhoN = new Float32Array(CAP), sten = new Float32Array(SCAP), pdmp = new Float32Array(CAP);
  W.penCap = 1.5;
  W.step = () => { const dt = W.dt, dt2 = dt * dt, B = W.bounds; W.t += dt; W.events.length = 0;
    for (let s = 0; s < W.ns; s++) sten[s] = 1; for (const b of W.bodies.values()) { if (b.tension !== 1) for (const s of b.springs) sten[s] = b.tension; for (const i of b.idx) pdmp[i] = b.mat.damp * (b.dampHold || 1); }
    const g = W.grav, gk = g.kind !== 'none';
    // forces + Verlet
    for (let i = 0; i < W.n; i++) { if (!(fl[i] & 1)) continue; if (fl[i] & 4 || im[i] === 0) { px[i] = x[i]; py[i] = y[i]; continue; } const dmp = Math.min(.5, pdmp[i] || .002);
      let gx = 0, gy = 0; if (gk) { const ddx = g.cx - x[i], ddy = g.cy - y[i], dd = Math.sqrt(ddx * ddx + ddy * ddy) || 1; gx = ddx / dd * g.g; gy = ddy / dd * g.g; } let vx = (x[i] - px[i]) * (1 - dmp), vy = (y[i] - py[i]) * (1 - dmp); const vm = Math.hypot(vx, vy), VMAX = 40; if (vm > VMAX) { vx *= VMAX / vm; vy *= VMAX / vm; }
      px[i] = x[i]; py[i] = y[i]; x[i] += vx + (gx + fx[i] * im[i]) * dt2; y[i] += vy + (gy + fy[i] * im[i]) * dt2; fx[i] = fy[i] = 0; fl[i] &= ~24; heat[i] *= .97; }
    // fluid: double-density relaxation (Clavet 2005) on fluid particles
    buildHash(); const h = 18, h2 = h * h, k0 = .9, kN = 2.2, rest0 = 2.2;
    for (let i = 0; i < W.n; i++) { if ((fl[i] & 3) !== 3) continue; let d = 0, dn = 0; W.query(x[i], y[i], h, j => { if (j === i || (fl[j] & 3) !== 3) return; const r2 = (x[j] - x[i]) ** 2 + (y[j] - y[i]) ** 2; if (r2 < h2) { const q = 1 - Math.sqrt(r2) / h; d += q * q; dn += q * q * q; } }); rho[i] = d; rhoN[i] = dn; }
    for (let i = 0; i < W.n; i++) { if ((fl[i] & 3) !== 3) continue; const P = k0 * (rho[i] - rest0), PN = kN * rhoN[i]; let dxs = 0, dys = 0;
      W.query(x[i], y[i], h, j => { if (j <= i || (fl[j] & 3) !== 3) return; const ddx = x[j] - x[i], ddy = y[j] - y[i], r = Math.hypot(ddx, ddy); if (r >= h || r < 1e-4) return; const q = 1 - r / h, D = dt2 * 3000 * (P * q + PN * q * q) * .5, ux = ddx / r * D, uy = ddy / r * D; x[j] += ux * .5; y[j] += uy * .5; dxs -= ux * .5; dys -= uy * .5; });
      x[i] += RS.clamp(dxs, -4, 4); y[i] += RS.clamp(dys, -4, 4); }
    // constraints
    for (let it = 0; it < W.iters; it++) {
      for (let s = 0; s < W.ns; s++) { const k = sk[s]; if (k <= 0) continue; const a = sa[s], b = sb[s], wa = (fl[a] & 4) ? 0 : im[a], wb = (fl[b] & 4) ? 0 : im[b], w = wa + wb; if (w === 0) continue;
        const dx = x[b] - x[a], dy = y[b] - y[a], L = Math.sqrt(dx * dx + dy * dy) || 1e-6, rest = sr[s] * sten[s], diff = (L - rest) / L * k / w;
        x[a] += dx * diff * wa; y[a] += dy * diff * wa; x[b] -= dx * diff * wb; y[b] -= dy * diff * wb; }
      if (it % 2 === 0) for (const b of W.bodies.values()) if (b.closed && b.mat.pressure) { const A0 = W.area(b), I = b.idx, n = I.length, target = b.area0 * b.mat.pressure * (b.inflate || 1), Lp = W.length(b); const inv = Math.sign(A0) !== Math.sign(target) && target !== 0; if (inv) { W.inversions = (W.inversions || 0) + 1; } /* inside-out (or collapsed) blob: re-inflate toward its rest disc around the centroid, moving x AND px together so no velocity is injected (a turned-inside-out
           body otherwise sits in a stable inverted state where pressure pushes outward-normals inward and it spins/launches) */
        if (target > 0 && A0 < target * .25) { W.repairs = (W.repairs || 0) + 1; let cx = 0, cy = 0; for (const i of I) { cx += x[i]; cy += y[i]; } cx /= n; cy /= n; const R0 = Math.sqrt(target / Math.PI), th0 = Math.atan2(y[I[0]] - cy, x[I[0]] - cx);
          for (let k = 0; k < n; k++) { const i = I[k]; if (fl[i] & 4) continue; const th = th0 + k / n * Math.PI * 2, dx = (cx + Math.cos(th) * R0 - x[i]) * .3, dy = (cy + Math.sin(th) * R0 - y[i]) * .3; x[i] += dx; y[i] += dy; px[i] += dx; py[i] += dy; } continue; }
        const A = A0; const dA = RS.clamp((target - A) / Lp * .5, -1.5, 1.5);   /* bounded correction */
        for (let k = 0; k < n; k++) { const p0 = I[(k - 1 + n) % n], p1 = I[(k + 1) % n], i = I[k]; if (fl[i] & 4) continue; let nx = y[p1] - y[p0], ny = -(x[p1] - x[p0]); const l = Math.hypot(nx, ny) || 1; x[i] += nx / l * dA * .5 * -1 * -1; y[i] += ny / l * dA * .5; } }
      if (W.pins) for (const p of W.pins) { x[p.i] = p.X; y[p.i] = p.Y; }
    }
    collide(); ground();
    for (let i = 0; i < W.n; i++) { if (!(fl[i] & 1)) continue; if (x[i] < B.x0) { x[i] = B.x0; px[i] = x[i]; } if (x[i] > B.x1) { x[i] = B.x1; px[i] = x[i]; } if (y[i] < B.y0) { y[i] = B.y0; py[i] = y[i]; } if (y[i] > B.y1) { y[i] = B.y1; py[i] = y[i]; } if (!isFinite(x[i]) || !isFinite(y[i])) { const ox = isFinite(px[i]) ? px[i] : (W.lastGood ? W.lastGood[0] : 0), oy = isFinite(py[i]) ? py[i] : (W.lastGood ? W.lastGood[1] : 0); x[i] = px[i] = ox; y[i] = py[i] = oy; W.nanFix = (W.nanFix || 0) + 1; } else if ((i & 63) === 0) W.lastGood = [x[i], y[i]]; }
    for (const b of W.bodies.values()) b.age += dt; };
  // particle-particle collisions between different bodies (and fluid-fluid handled by relaxation); impacts become events
  const collide = () => { for (let i = 0; i < W.n; i++) { if (!(fl[i] & 1)) continue; const bi = bod[i], ri = rad[i];
    W.query(x[i], y[i], ri + 8, j => { if (j <= i || bod[j] === bi && !(fl[i] & 2)) return; if ((fl[i] & 2) && (fl[j] & 2)) return; if (((fl[i] & 64) && (fl[j] & 128)) || ((fl[j] & 64) && (fl[i] & 128))) return;   /* v0.6.2 (4): a newborn under gentle separation (64) does not shove the ohms it was placed on (128) */ if ((fl[i] | fl[j]) & 32) { if (!((fl[i] & fl[j]) & 32) && !((fl[i] | fl[j]) & 2)) return; if ((fl[i] & fl[j]) & 32) return; } const dx = x[j] - x[i], dy = y[j] - y[i], R = ri + rad[j], d2 = dx * dx + dy * dy; if (d2 >= R * R || d2 < 1e-8) return;
      const d = Math.sqrt(d2), nx = dx / d, ny = dy / d, wa = (fl[i] & 4) ? 0 : im[i], wb = (fl[j] & 4) ? 0 : im[j], w = wa + wb; if (w === 0) return; const pen = Math.min(R - d, W.penCap) / w;   /* deep overlaps (spawns, fusions) resolve over several steps instead of exploding */
      const vix = x[i] - px[i], viy = y[i] - py[i], vjx = x[j] - px[j], vjy = y[j] - py[j], vn = (vjx - vix) * nx + (vjy - viy) * ny;
      x[i] -= nx * pen * wa; y[i] -= ny * pen * wa; x[j] += nx * pen * wb; y[j] += ny * pen * wb;
      // friction (tangential velocity exchange)
      const tx = -ny, ty = nx, vt = (vjx - vix) * tx + (vjy - viy) * ty, f = .25 * vt / w; px[i] -= tx * f * wa * -1; py[i] -= ty * f * wa * -1; px[j] += tx * f * wb; py[j] += ty * f * wb;
      if (vn < -0.6) W.events.push({ k: 'hit', a: bi, b: bod[j], i, j, x: (x[i] + x[j]) / 2, y: (y[i] + y[j]) / 2, v: -vn / W.dt }); else if (Math.abs(vt) > .45 && !((fl[i] | fl[j]) & 2)) W.slideAdd(bi, bod[j], x[i], y[i], Math.abs(vt) / W.dt); }); } };
  // sliding contacts (rub / scrape / bow): accumulated per body pair, consumed + cleared by the sound layer each frame
  W.slides = new Map(); W.slideAdd = (a, b, sx, sy, v) => { const k = a < b ? a * 65536 + b : b * 65536 + a; let q = W.slides.get(k); if (!q) W.slides.set(k, q = { a, b, x: 0, y: 0, v: 0, n: 0 }); q.x += sx; q.y += sy; q.v += v; q.n++; };
  const ground = () => { const g = W.grav; if (g.kind !== 'planet') return; const T = g.terrain;
    for (let i = 0; i < W.n; i++) { if (!(fl[i] & 1)) continue; const dx = x[i] - g.cx, dy = y[i] - g.cy, d = Math.hypot(dx, dy) || 1; let Rs = g.R, nx = dx / d, ny = dy / d;
      if (T) { const th = Math.atan2(dx, -dy); Rs = T.R + T.height(th); if (d > Rs + 40) { if (T.sea > -1e8 && d < T.seaR) W.inSea(i); continue; } const e = 3 / T.R, h1 = T.height(th + e), h0 = T.height(th - e), slope = (h1 - h0) / 6; const tx = -ny, ty = nx; let mx = nx - tx * slope, my = ny - ty * slope; const mm = Math.hypot(mx, my); nx = mx / mm; ny = my / mm; if (T.sea > -1e8 && d < T.seaR) W.inSea(i); }
      const R = Rs + rad[i]; if (d >= R) continue;
      const vx = x[i] - px[i], vy = y[i] - py[i], vn = vx * nx + vy * ny; x[i] += nx * (R - d); y[i] += ny * (R - d); fl[i] |= 8;
      const b = W.bodies.get(bod[i]), fr = b ? b.mat.fric : .4, tx = -ny, ty = nx, vt = vx * tx + vy * ty; const st = b && b.mat.static && Math.abs(vt) < b.mat.static ? 0 : vt * (1 - fr);
      px[i] = x[i] - tx * st + nx * vn * .3; py[i] = y[i] - ty * st + ny * vn * .3;
      if (vn < -0.8) W.events.push({ k: 'ground', a: bod[i], b: 0, i, x: x[i], y: y[i], v: -vn / W.dt }); else if (Math.abs(vt) > .6 && !(fl[i] & 2)) W.slideAdd(bod[i], 0, x[i], y[i], Math.abs(vt) / W.dt); } };
  // ocean impostor: buoyancy + drag for particles below sea level
  W.seaHits = 0; W.inSea = i => { const g = W.grav; W.seaHits++; fl[i] |= 16; const dx = x[i] - g.cx, dy = y[i] - g.cy, d = Math.hypot(dx, dy) || 1; const b = W.bodies.get(bod[i]); let buoy = b && b.kind === 'water' ? 0 : (b && b.mat.clear > .5 ? 1.05 : b && b.kind === 'creature' ? 1.15 : .6); if (g.gas) { if (b && b.kind === 'creature') buoy = 1; else if (buoy > 0) buoy *= 1 + Math.max(0, g.terrain.seaR - d) / 500; }   /* v0.6 cloud worlds: ohms float neutrally, other things settle in layers (denser = deeper), water rains to the floor */
    const vx = x[i] - px[i], vy = y[i] - py[i]; px[i] = x[i] - vx * .96; py[i] = y[i] - vy * .96; const k = g.g * buoy * W.dt * W.dt; x[i] += dx / d * k; y[i] += dy / d * k; };
  // ---- interaction helpers ----
  W.ghost = (b, on) => { for (const i of b.idx) fl[i] = on ? fl[i] | 32 : fl[i] & ~32; };
  W.impulse = (X, Y, R, ix, iy) => { W.query(X, Y, R, j => { const d = Math.hypot(x[j] - X, y[j] - Y); if (d > R || (fl[j] & 4)) return; const f = 1 - d / R; px[j] -= ix * f * W.dt; py[j] -= iy * f * W.dt; heat[j] = Math.min(1, heat[j] + f); }); };
  W.energy = () => { let e = 0; for (let i = 0; i < W.n; i++) if (fl[i] & 1 && im[i] > 0) { const vx = x[i] - px[i], vy = y[i] - py[i]; e += (vx * vx + vy * vy) / im[i]; } return e; };
  W.serialBody = b => ({ kind: b.kind, mat: b.mat, thick: b.thick, pts: b.idx.map(i => [Math.round(x[i]), Math.round(y[i])]), pins: b.pins.map(i => b.idx.indexOf(i)).filter(k => k >= 0), tension: b.tension, extra: b.extra });
  return W; };
})(typeof window !== 'undefined' ? window : globalThis);
