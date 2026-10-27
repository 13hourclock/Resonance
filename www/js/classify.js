'use strict';
// Forgiving stroke classifier for the four nature-like specials (single stroke, decided on lift; no multi-stroke flush wait).
// Adapted from Lensure's L.m31.classify ideas (travel-axis projection, reversal counting, resampled turning). When unsure -> null (plain material).
(function (G) {
const RS = G.RS;
const rsmpOld = (st, sp) => { const o = [st[0]]; for (let i = 1; i < st.length; i++) { const l = o[o.length - 1]; if (Math.hypot(st[i][0] - l[0], st[i][1] - l[1]) >= sp) o.push(st[i]); } if (o.length > 1 && o[o.length - 1] !== st[st.length - 1]) o.push(st[st.length - 1]); return o; };
// interpolating resampler (even spacing along the path)
const rsmp = (pts, sp) => { const out = [pts[0].slice()]; let acc = 0; for (let i = 1; i < pts.length; i++) { let ax = pts[i - 1][0], ay = pts[i - 1][1]; const bx = pts[i][0], by = pts[i][1]; let d = Math.hypot(bx - ax, by - ay); while (acc + d >= sp && d > 0 && sp > 0 && out.length < 4096) { const t = (sp - acc) / d; ax += (bx - ax) * t; ay += (by - ay) * t; out.push([ax, ay]); d = Math.hypot(bx - ax, by - ay); acc = 0; } acc += d; } const l = pts[pts.length - 1]; if (Math.hypot(out[out.length - 1][0] - l[0], out[out.length - 1][1] - l[1]) > sp * .3) out.push(l.slice()); return out; };
RS.strokeFeatures = st => { const n = st.length; let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(st[i][0] - st[i - 1][0], st[i][1] - st[i - 1][1]);
  let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (const p of st) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
  const diag = Math.hypot(x1 - x0, y1 - y0), chord = Math.hypot(st[n - 1][0] - st[0][0], st[n - 1][1] - st[0][1]);
  // de-jitter: fine resample, moving average, then coarse resample (finger noise must not fake turning)
  const f0 = rsmp(st, Math.max(1.5, diag / 70)), sm = f0.map((p, i) => { let sx = 0, sy = 0, c = 0; for (let k = Math.max(0, i - 1); k <= Math.min(f0.length - 1, i + 1); k++) { sx += f0[k][0]; sy += f0[k][1]; c++; } return [sx / c, sy / c]; });
  if (sm.length) { sm[0] = f0[0]; sm[sm.length - 1] = f0[f0.length - 1]; }
  const sp = RS.clamp(diag / 22, 3, 14), r = rsmp(sm, sp); const ang = []; for (let i = 1; i < r.length; i++) ang.push(Math.atan2(r[i][1] - r[i - 1][1], r[i][0] - r[i - 1][0]));
  const turn = []; for (let i = 1; i < ang.length; i++) turn.push(Math.atan2(Math.sin(ang[i] - ang[i - 1]), Math.cos(ang[i] - ang[i - 1])));
  let tNet = 0, tAbs = 0; for (const t of turn) { tNet += t; tAbs += Math.abs(t); }
  // corners: local turning summed over a short window
  const corners = []; const W = 1; for (let i = 0; i < turn.length; i++) { let s = 0; for (let k = Math.max(0, i - W); k <= Math.min(turn.length - 1, i + W); k++) s += turn[k]; corners.push(s); }
  const peaks = []; for (let i = 0; i < corners.length; i++) { const c = Math.abs(corners[i]); if (c < 1.2) continue; if ((i > 0 && Math.abs(corners[i - 1]) > c) || (i < corners.length - 1 && Math.abs(corners[i + 1]) >= c)) continue; if (peaks.length && i - peaks[peaks.length - 1].i < 3) { if (c > Math.abs(peaks[peaks.length - 1].c)) peaks[peaks.length - 1] = { i, c: corners[i] }; continue; } peaks.push({ i, c: corners[i] }); }
  let cornerTurn = 0; for (const p of peaks) cornerTurn += Math.abs(p.c);
  let cx = 0, cy = 0; for (const p of r) { cx += p[0]; cy += p[1]; } cx /= r.length; cy /= r.length;
  return { len, chord, diag, x0, y0, x1, y1, r, turn, tNet, tAbs, peaks, cornerTurn, cx, cy, closure: chord / Math.max(1, len), n: r.length, sm: rsmp(sm, Math.max(2, diag / 60)) };
};
RS.classify = st => { if (!st || st.length < 6) return null; const F = RS.strokeFeatures(st); if (F.len < 60 || F.diag < 26) return null; const TAU = RS.TAU, P = F.peaks;
  // SPIRAL: >= 1.7 turns one way, radius steadily growing or shrinking along the stroke
  if (Math.abs(F.tNet) > 1.7 * TAU) { let opp = 0; for (const t of F.turn) if (Math.sign(t) !== Math.sign(F.tNet)) opp -= -Math.abs(t);
    const bx = (F.x0 + F.x1) / 2, by = (F.y0 + F.y1) / 2, r = F.r, m = r.length, s0 = Math.hypot(r[0][0] - bx, r[0][1] - by), s1 = Math.hypot(r[m - 1][0] - bx, r[m - 1][1] - by), inner = s0 < s1 ? r[0] : r[m - 1];
    const rad = r.map(p => Math.hypot(p[0] - inner[0], p[1] - inner[1])); let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0; for (let i = 0; i < m; i++) { sx += i; sy += rad[i]; sxx += i * i; sxy += i * rad[i]; syy += rad[i] * rad[i]; }
    const cov = sxy / m - sx * sy / m / m, vx = sxx / m - (sx / m) ** 2, vy = syy / m - (sy / m) ** 2, corr = cov / Math.sqrt(vx * vy + 1e-9);
    F.spiralCorr = corr; F.opp = opp;
    if (Math.abs(corr) > .55 && opp < Math.abs(F.tNet) * .35 && Math.min(s0, s1) < F.diag * .3) return { id: 'spiral', turns: Math.abs(F.tNet) / TAU, dir: Math.sign(F.tNet), cx: inner[0], cy: inner[1], size: F.diag / 2, F }; }
  // v0.3.2 TOLERANT SPIRAL: a jittery / wobbly hand breaks the local turning test, so also measure the WINDING around the centre on a heavily
  // smoothed copy (finger noise averages out, a wave or zigzag never winds > 1.6 turns round its own centre, a star winds ~2 but its radius does not grow)
  { const sm = rsmp(st, Math.max(2, F.diag / 80)), K = Math.max(3, Math.round(sm.length / 40)), S = sm.map((p, i) => { let sx = 0, sy = 0, c = 0; for (let k = Math.max(0, i - K); k <= Math.min(sm.length - 1, i + K); k++) { sx += sm[k][0]; sy += sm[k][1]; c++; } return [sx / c, sy / c]; });
    const bx = (F.x0 + F.x1) / 2, by = (F.y0 + F.y1) / 2, m = S.length; let w = 0, back = 0, pa = Math.atan2(S[0][1] - by, S[0][0] - bx); const a = [];
    for (let i = 1; i < m; i++) { const q = Math.atan2(S[i][1] - by, S[i][0] - bx); let d = q - pa; d = Math.atan2(Math.sin(d), Math.cos(d)); a.push(d); w += d; pa = q; }
    for (const d of a) if (Math.sign(d) !== Math.sign(w)) back += Math.abs(d);
    const rad = S.map(p => Math.hypot(p[0] - bx, p[1] - by)); let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0; for (let i = 0; i < m; i++) { sx += i; sy += rad[i]; sxx += i * i; sxy += i * rad[i]; syy += rad[i] * rad[i]; }
    const corr = (sxy / m - sx * sy / m / m) / Math.sqrt((sxx / m - (sx / m) ** 2) * (syy / m - (sy / m) ** 2) + 1e-9), r0 = Math.min(rad[0], rad[m - 1]);
    F.wind = w / TAU; F.windCorr = corr; F.windBack = back;
    if (Math.abs(w) > 1.6 * TAU && Math.abs(corr) > .6 && back < Math.abs(w) * .25 && r0 < F.diag * .3 && (P.length < 4 || Math.abs(corr) > .8)) { const inner = rad[0] < rad[m - 1] ? st[0] : st[st.length - 1];
      return { id: 'spiral', turns: Math.abs(w) / TAU, dir: Math.sign(w), cx: inner[0], cy: inner[1], size: F.diag / 2, F, tolerant: true }; } }
  // STAR (pentagram in one stroke): closed, 4-6 sharp corners (>110 deg) all turning the same way, total turning ~720 deg
  if (F.closure < .2 && P.length >= 4 && P.length <= 6) { const sharp = P.filter(p => Math.abs(p.c) > 1.9).length, same = P.every(p => Math.sign(p.c) === Math.sign(P[0].c));
    if (sharp >= 4 && same && Math.abs(F.tNet) > 1.35 * TAU && Math.abs(F.tNet) < 2.6 * TAU) return { id: 'star', cx: F.cx, cy: F.cy, size: F.diag / 2, F }; }
  // travel-axis view for wave / zigzag (both progress along their chord)
  if (F.chord > F.len * .1) { const n = st.length, th = Math.atan2(st[n - 1][1] - st[0][1], st[n - 1][0] - st[0][0]), c = Math.cos(th), s = Math.sin(th);
    const Q = F.sm, U = Q.map(p => (p[0] - st[0][0]) * c + (p[1] - st[0][1]) * s), V = Q.map(p => -(p[0] - st[0][0]) * s + (p[1] - st[0][1]) * c);
    let back = 0, fwd = 0; for (let i = 1; i < U.length; i++) { const d = U[i] - U[i - 1]; if (d < 0) back -= d; else fwd += d; } if (back > fwd * .15) { F.why = 'back'; return null; }
    const vE = Math.max(...V) - Math.min(...V), uE = Math.max(...U) - Math.min(...U); if (vE < 14 || vE < uE * .06) return null;
    // extrema of V with hysteresis
    if (vE < Math.max(14, uE * .08)) { F.why = 'vE'; return null; }
    const h = Math.max(6, vE * .28); let ext = 0, dir = 0, ref = V[0], ri = 0; const xi = [0];
    for (let i = 0; i < V.length; i++) { const v = V[i]; if (dir === 0) { if (v - V[0] > h) { dir = 1; ref = v; ri = i; } else if (V[0] - v > h) { dir = -1; ref = v; ri = i; } continue; }
      if (dir > 0) { if (v > ref) { ref = v; ri = i; } else if (ref - v > h) { ext++; xi.push(ri); dir = -1; ref = v; ri = i; } } else { if (v < ref) { ref = v; ri = i; } else if (v - ref > h) { ext++; xi.push(ri); dir = 1; ref = v; ri = i; } } }
    xi.push(V.length - 1); if (dir !== 0) ext++;
    // bow: a sine bulges away from the straight segment between successive extremes; a zigzag's legs are straight
    let bow = 0, nb = 0; for (let k = 1; k < xi.length; k++) { const a = xi[k - 1], b = xi[k]; if (b - a < 3) continue; const ax = Q[a][0], ay = Q[a][1], bx = Q[b][0], by = Q[b][1], L = Math.hypot(bx - ax, by - ay); if (L < 8) continue; let m = 0;
      for (let i = a + 1; i < b; i++) m = Math.max(m, Math.abs((Q[i][0] - ax) * (by - ay) - (Q[i][1] - ay) * (bx - ax)) / L); bow += m / L; nb++; }
    bow = nb ? bow / nb : 0; F.bow = bow; F.ext = ext; F.why = 'end';
    // corner sharpness from chords (noise-proof): direction change right at the crest vs the change between the two legs. zigzag ~1, sine ~.3
    const dirA = (i, j) => Math.atan2(Q[j][1] - Q[i][1], Q[j][0] - Q[i][0]), dA = (a, b) => Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
    let shs = 0, shn = 0; for (let k = 1; k < xi.length - 1; k++) { const e = xi[k], lo = Math.floor((xi[k - 1] + e) / 2), hi = Math.ceil((e + xi[k + 1]) / 2), w = Math.max(2, Math.round(.18 * Math.min(e - lo, hi - e))); if (e - w < 0 || e + w >= Q.length || e - lo < 3 || hi - e < 3) continue;
      const ww = Math.max(1, Math.round(w * .7)), legIn = dirA(Math.max(0, lo - ww), Math.min(e, lo + ww)), legOut = dirA(Math.max(e, hi - ww), Math.min(Q.length - 1, hi + ww)), wide = dA(legIn, legOut);
      const loc = dA(dirA(e - w, e), dirA(e, e + w)); if (wide > .6) { shs += Math.min(1.2, loc / wide); shn++; } }
    const sharp = shn ? shs / shn : 0; F.sharp = sharp;
    const alt = P.length >= 3 && P.every((p, i) => i === 0 || Math.sign(p.c) !== Math.sign(P[i - 1].c));
    const cornerFrac = F.cornerTurn / Math.max(1e-6, F.tAbs);
    const zs = sharp - 4 * bow; F.zs = zs;
    if (zs > .3 && ext >= 4 && sharp > 0) return { id: 'zigzag', cx: F.cx, cy: F.cy, x1: st[n - 1][0], y1: st[n - 1][1], dx: c, dy: s, size: F.diag / 2, F };
    if (ext >= 4 && zs < .29 && sharp > 0) return { id: 'wave', cx: F.cx, cy: F.cy, amp: vE / 2, periods: ext / 2, F }; }
  return null; };
// v0.3.2 HOW a spiral was drawn (all 0..1 unless noted): weight (pen pressure if the device reports it, else slowness), wobble (curvature
// jitter), tight (ring spacing), trend (-1 swell .. +1 fast-then-slow), durs (the pauses / speed bumps as a motif rhythm in 16ths),
// hy (screen height, 0 top .. 1 bottom), asp / sq / round / oval (the spiral's outline).
RS.strokeRead = (pts, times, pres, o = {}) => { const n = pts ? pts.length : 0; if (n < 6) return null; const cl = v => Math.max(0, Math.min(1, v));
  let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const tm = times && times.length === n ? times : pts.map((_, i) => i * 16), step = Math.max(8, len / 90), Q = [[pts[0][0], pts[0][1], tm[0]]]; let acc = 0;
  for (let i = 1; i < n; i++) { const [ax, ay] = pts[i - 1], [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay); if (!d) continue; let u = 0; if (!(step > 0) || !Number.isFinite(d)) continue; while (acc + d * (1 - u) >= step && Q.length < 4096) { u += (step - acc) / d; acc = 0; Q.push([ax + (bx - ax) * u, ay + (by - ay) * u, tm[i - 1] + (tm[i] - tm[i - 1]) * u]); } acc += d * (1 - u); }
  const m = Q.length; if (m < 6) return null; const dts = [], hd = [];
  for (let i = 1; i < m; i++) { dts.push(Math.max(.5, Q[i][2] - Q[i - 1][2])); hd.push(Math.atan2(Q[i][1] - Q[i - 1][1], Q[i][0] - Q[i - 1][0])); }
  const tr = []; for (let i = 1; i < hd.length; i++) { let d = RS.wrapA(hd[i] - hd[i - 1]); tr.push(d); }
  const rv = []; for (let i = 0; i < tr.length; i++) { let a = 0, c = 0; for (let j = Math.max(0, i - 3); j <= Math.min(tr.length - 1, i + 3); j++) { a += tr[j]; c++; } rv.push(Math.abs(tr[i] - a / c)); } rv.sort((a, b) => a - b); const res = (rv[Math.floor(rv.length * .6)] || 0) * 1.6;   /* robust: a square's few corners are not wobble */
  const dir = Math.sign(tr.reduce((a, b) => a + b, 0)) || 1, flip = tr.filter(d => d * dir < -.025).length / Math.max(1, tr.length), wobble = cl(Math.max((flip - .03) / .22, (res - .12) / .5)), sp = dts.map(d => step / d), med = sp.slice().sort((a, b) => a - b)[Math.floor(sp.length / 2)], vMean = len / Math.max(1, tm[n - 1] - tm[0]);
  const third = Math.max(1, Math.floor(sp.length / 3)), avg = a => a.reduce((x, y) => x + y, 0) / a.length, v1 = avg(sp.slice(0, third)), v3 = avg(sp.slice(-third)), trend = Math.max(-1, Math.min(1, (v1 - v3) / (v1 + v3 + 1e-6) * 1.6));
  // pauses: a step that took far longer than usual (a stop) or a clear dip in speed (a bump); merged when adjacent
  const md = dts.slice().sort((a, b) => a - b)[Math.floor(dts.length / 2)], ev = []; for (let i = 0; i < dts.length; i++) { const stop = dts[i] > Math.max(60, md * 3.5), bump = sp[i] < med * .3; if ((stop || bump) && (!ev.length || i - ev[ev.length - 1].i > 2)) ev.push({ i, t: Q[i][2] }); }
  let durs = null; if (ev.length >= 2) { const ts = [Q[0][2]].concat(ev.map(e => e.t), [Q[m - 1][2]]), iv = []; for (let k = 1; k < ts.length; k++) if (ts[k] - ts[k - 1] > 40) iv.push(ts[k] - ts[k - 1]); const mn = iv.slice().sort((a, b) => a - b)[Math.floor(iv.length / 2)];
    if (iv.length >= 2) durs = iv.slice(0, 8).map(v => { const q = v / mn * 2; return [1, 2, 3, 4, 6].reduce((b, d) => Math.abs(d - q) < Math.abs(b - q) ? d : b, 2); }); }
  let usedP = false, W; if (pres && pres.length >= 4) { const pm = avg(pres), ps = Math.sqrt(avg(pres.map(p => (p - pm) ** 2))); if (pm > 0 && ps > .015 && !(o.mouse)) { usedP = true; W = cl((pm - .15) / .65); } }
  if (!usedP) W = cl(1 - (vMean - .2) / 1.1);
  let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9, cx = 0, cy = 0; for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); } cx = (x0 + x1) / 2; cy = (y0 + y1) / 2;
  const asp = Math.max(.5, Math.min(2, (x1 - x0 + 1) / (y1 - y0 + 1))); let rm = 0; const rr = Q.map(q => { const r = Math.hypot((q[0] - cx) / Math.sqrt(asp), (q[1] - cy) * Math.sqrt(asp)); rm = Math.max(rm, r); return [r, Math.atan2(q[1] - cy, q[0] - cx)]; });
  let c4 = 0, s4 = 0, rs = 0, k4 = 0; for (const [r, a] of rr) if (r > rm * .6) { c4 += r * Math.cos(4 * a); s4 += r * Math.sin(4 * a); rs += r; k4++; } const h4 = k4 ? Math.hypot(c4, s4) / rs : 0, sq = cl((h4 - .06) / .06);
  const oval = cl((Math.abs(Math.log(asp)) - .08) / .4), round = cl(1 - oval) * (1 - sq), size = Math.max(x1 - x0, y1 - y0) / 2, turns = o.turns || 2, tight = cl(1 - (size / Math.max(.8, turns) - 12) / 45);
  return { weight: W, usedP, wobble, tight, trend, durs, pauses: ev.length, hy: o.hy == null ? .5 : cl(o.hy), asp, sq, oval, round, v: vMean }; };
})(typeof window !== 'undefined' ? window : globalThis);
