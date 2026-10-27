'use strict';
// v0.5b HEIGHT-FIELD WATER (replaces particle water). Water is a LEVEL filling a terrain low point: one pool = a span of ground (arc), a volume and a
// level solved from it (with a soft taper at the edges so a puddle on flat ground is a lens, a basin fills flat). Its surface is ONE light 1D spring
// line (28 points) that ripples when touched, struck, entered, or when a note is played in it; it sleeps when calm and is only simulated near the view.
// Bodies float or sink by buoyancy against the level (no particle-particle collisions). Rain = visual streaks that raise the nearest pool and wet
// the ground; geysers / pops = a few visual spray drops. A drawn wave stroke pours its water into the nearest low point (or makes a pool there).
// The field pools (RS.Field features) are pools here too. Gas worlds: floating water orbs (a ring line instead of a level). Pure (no DOM).
(function (G) {
const RS = G.RS, TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, wrapA = a => { a = (a + Math.PI) % TAU; if (a < 0) a += TAU; return a - Math.PI; };
let hapT = 0; RS.haptic = RS.haptic || (ms => { try { const t = Date.now(); if (RS.HAPTICS === false || t - hapT < 120 || typeof navigator === 'undefined' || !navigator.vibrate) return; hapT = t; navigator.vibrate(ms); } catch (e) { } });   // v0.5b haptics (no-op where vibration is unavailable)
const Wt = RS.Water = { N: 28, STREAKS: 70, SPRAY: 80, RAINV: 9, POOLS: 64, C: 90, DAMP: .992, stats: {} };
const st = (Sf, k, n = 1) => { Sf.stats[k] = (Sf.stats[k] || 0) + n; };
Wt.init = Sf => { Sf.water = { pools: [], orbs: [], streaks: [], spray: [], vis: [], nid: 1, splashT: 0, splashN: 0 }; const P = Sf.P;
  if (Sf.field && Sf.field.feat && !P.gas) for (const q of Sf.field.feat) if (q.kind === 'pool') { const p = mk(Sf, { id: 'f' + q.k, th: q.th, span: q.span, dmax: 60, q }); p.vol = p.base = p.vol0 = vAt(p, q.level); p.dirty = 1; solve(p); } };
const mk = (Sf, o) => { const w = Sf.water, p = Object.assign({ id: 'p' + (w.nid++), th: 0, span: 60, dmax: 14, base: 0, rain: 0, vol: 0, add: 0, gs: null, ds: null, lv: 0, dirty: 1, h: null, v: null, awake: 0, rt: -9 }, o); geo(Sf, p); w.pools.push(p); return p; };
// sampled ground under the pool (static terrain) + taper caps
const geo = (Sf, p) => { const P = Sf.P, N = Wt.N; p.gs = new Float32Array(N); p.cap = new Float32Array(N); let gmin = 1e9; for (let i = 0; i < N; i++) { const a = -p.span + 2 * p.span * i / (N - 1); p.gs[i] = P.height(p.th + a / P.R); gmin = Math.min(gmin, p.gs[i]); p.cap[i] = p.dmax * Math.sqrt(Math.max(0, 1 - Math.pow(a / p.span, 2))); } p.gmin = gmin; p.dx = 2 * p.span / (N - 1); p.dirty = 1; };
const vAt = (p, L) => { let v = 0; for (let i = 0; i < Wt.N; i++) v += clamp(L - p.gs[i], 0, p.cap[i]); return v * p.dx; };
const solve = p => { if (!p.dirty) return; p.dirty = 0; const V = p.vol; let lo = p.gmin, hi = p.gmin + p.dmax + 60; if (V <= 0) { p.lv = lo; } else { for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (vAt(p, m) < V) lo = m; else hi = m; } p.lv = (lo + hi) / 2; }
  p.ds = p.ds || new Float32Array(Wt.N); let dm = 0; for (let i = 0; i < Wt.N; i++) { p.ds[i] = clamp(p.lv - p.gs[i], 0, p.cap[i]); dm = Math.max(dm, p.ds[i]); } p.depth = dm; };
Wt.maxVol = p => p.q ? vAt(p, p.q.level + 4) : 18000;
// shape of a poured (non-field) pool follows its volume: wider and a little deeper as it fills
const reshape = (Sf, p) => { if (p.q || p.orb) return; const s = Math.sqrt(Math.max(0, p.vol)), sp = clamp(45 + s * .55, 45, 260), dm = clamp(8 + s * .15, 8, 45); if (Math.abs(sp - p.span) > 4 || Math.abs(dm - p.dmax) > 1.5) { p.span = sp; p.dmax = dm; geo(Sf, p); } };
const setVol = (Sf, p) => { p.vol = clamp(p.base + p.rain, 0, Wt.maxVol(p)); reshape(Sf, p); p.dirty = 1; solve(p); };
// lowest ground near (th0): walk downhill (<= 520 px) along the surface
Wt.lowPoint = (Sf, th0) => { const P = Sf.P, d = 8 / P.R; let th = th0, h = P.height(th); for (let k = 0; k < 65; k++) { const a = P.height(th - d), b = P.height(th + d); if (a < h - .01 && a <= b) { th -= d; h = a; } else if (b < h - .01) { th += d; h = b; } else break; } return th; };
const arc = (Sf, p, th) => wrapA(th - p.th) * Sf.P.R;
Wt.poolNear = (Sf, th, m = 40) => { let best = null, bd = 1e9; for (const p of Sf.water.pools) { const d = Math.abs(arc(Sf, p, th)); if (d < p.span + m && d < bd) { bd = d; best = p; } } return best; };
// pour volume (px^2 of water) at a world point: into the nearest low point (an existing pool there grows) or a new pool; gas worlds: an orb
Wt.pour = (Sf, x, y, vol, o = {}) => { const w = Sf.water, P = Sf.P; if (!w) return null; if (o.key) { const ex = w.pools.concat(w.orbs).find(q => q.key === o.key); if (ex) return ex; }
  if (P.gas) { let best = null; for (const q of w.orbs) if (Math.hypot(q.x - x, q.y - y) < q.r + 60) best = q; if (!best) { best = { id: 'o' + (w.nid++), orb: 1, x, y, r: 0, key: o.key, h: new Float32Array(24), v: new Float32Array(24), awake: 0 }; w.orbs.push(best); if (w.orbs.length > 24) w.orbs.shift(); }
    best.r = Math.min(70, Math.sqrt(best.r * best.r + vol / Math.PI)); Wt.ripple(Sf, best, 0, 2); st(Sf, 'waterPour'); return best; }
  const th = Wt.lowPoint(Sf, P.theta(x, y)); if (P.height(th) < P.sea + 2) { st(Sf, 'waterToSea'); return null; }   // ran down into the sea
  let p = Wt.poolNear(Sf, th, 30); if (!p) { if (w.pools.length >= Wt.POOLS) { p = w.pools.reduce((a, b) => Math.abs(arc(Sf, a, th)) < Math.abs(arc(Sf, b, th)) ? a : b); } else p = mk(Sf, { th, key: o.key, src: o.src || 'pour' }); }
  const before = p.vol; p.base += vol; setVol(Sf, p); Wt.ripple(Sf, p, clamp(Math.round((arc(Sf, p, th) + p.span) / p.dx), 0, Wt.N - 1), 2.5); st(Sf, 'waterPour'); p.lastAdd = p.vol - before; return p; };
Wt.unpour = (Sf, id, vol) => { const w = Sf.water, p = w && w.pools.find(q => q.id === id); if (!p) { const o = w && w.orbs.find(q => q.id === id); if (o) { o.r = Math.sqrt(Math.max(0, o.r * o.r - vol / Math.PI)); if (o.r < 4) w.orbs.splice(w.orbs.indexOf(o), 1); } return; }
  p.base = Math.max(p.q ? vAt(p, p.q.level) : 0, p.base - vol); setVol(Sf, p); if (!p.q && p.base < 30) w.pools.splice(w.pools.indexOf(p), 1); };
// v0.8 B: ohms carry water. take: dip up to vol from a pool; a FIELD pool is spring-fed (its water above the natural level vol0 goes first, the
// rest is spring water: it never drops below vol0); a player / poured pool gives what it has and can be emptied. Returns the volume carried.
Wt.take = (Sf, id, vol) => { const w = Sf.water, p = w && w.pools.find(q => q.id === id); if (!p || !(vol > 0)) return 0;
  if (p.q) { const fl = p.vol0 != null ? p.vol0 : vAt(p, p.q.level), ex = Math.max(0, p.base - fl), t = Math.min(vol, ex); if (t > 0) { p.base -= t; setVol(Sf, p); } st(Sf, 'waterTake'); return vol; }
  let t = Math.min(vol, p.base); if (p.base - t < 30) t = p.base; p.base -= t; if (p.base <= 0) { p.base = 0; w.pools.splice(w.pools.indexOf(p), 1); } else setVol(Sf, p); st(Sf, 'waterTake'); return t; };
// carried water at home: into a pool within 120 px, else the area's carried puddle (one per home area, key 'cw'+area), within Wt.POOLS
Wt.carryPour = (Sf, x, y, vol, area) => { const w = Sf.water, P = Sf.P; if (!w || !(vol > 0)) return null; if (P.gas) return Wt.pour(Sf, x, y, vol);
  const th = P.theta(x, y), key = 'cw' + (area == null ? 0 : area); let p = w.pools.find(q => q.key === key) || Wt.poolNear(Sf, th, 120);
  if (!p) { if (w.pools.length >= Wt.POOLS) return Wt.pour(Sf, x, y, vol); let t2 = Wt.lowPoint(Sf, th); if (Math.abs(arc(Sf, { th: t2 }, th)) > 120) t2 = th; if (P.height(t2) < P.sea + 2) { st(Sf, 'waterToSea'); return null; } p = mk(Sf, { th: t2, key, src: 'carry' }); }
  p.base += vol; setVol(Sf, p); Wt.ripple(Sf, p, 14, 1.5); st(Sf, 'carryPour'); return p; };
// carried puddles soak back into the ground: ~10 min with no trips and one is gone (called once a minute; dt in s)
Wt.SOAK = .25; Wt.SOAK_MIN = 15; Wt.soak = (Sf, dt) => { const w = Sf.water; if (!w) return; for (let i = w.pools.length - 1; i >= 0; i--) { const p = w.pools[i]; if (p.src !== 'carry') continue; p.base -= Math.max(Wt.SOAK_MIN, p.base * Wt.SOAK) * dt / 60; if (p.base < 30) { w.pools.splice(i, 1); st(Sf, 'puddleSoaked'); } else setVol(Sf, p); } };
Wt.addRain = (Sf, p, v) => { p.rain += v; setVol(Sf, p); };
// surface ripples: a light 1D spring line per pool (and a ring per orb); asleep when calm
Wt.ripple = (Sf, p, i, amp) => { if (!p) return; const n = p.orb ? 24 : Wt.N; if (!p.h) { p.h = new Float32Array(n); p.v = new Float32Array(n); } i = clamp(i | 0, 0, n - 1); p.v[i] += amp * 30; if (i > 0) p.v[i - 1] += amp * 12; if (i < n - 1) p.v[i + 1] += amp * 12; p.awake = 1; st(Sf, 'ripples'); };
const simLine = (p, dt, ring) => { const h = p.h, v = p.v, n = h.length, dx = ring ? Math.max(4, TAU * p.r / n) : p.dx, C = Wt.C * Wt.C / (dx * dx), K = 6; let e = 0;
  for (let s = 0; s < 2; s++) { const d = dt / 2; for (let i = 0; i < n; i++) { const a = ring ? h[(i + n - 1) % n] : h[Math.max(0, i - 1)], b = ring ? h[(i + 1) % n] : h[Math.min(n - 1, i + 1)]; v[i] += (Math.min(C, .5 / (d * d)) * (a + b - 2 * h[i]) - K * h[i]) * d; v[i] *= Wt.DAMP; }
    for (let i = 0; i < n; i++) { if (!ring && p.ds && p.ds[i] < .5) { h[i] = 0; v[i] = 0; continue; } h[i] = clamp(h[i] + v[i] * d, -6, 6); } }
  for (let i = 0; i < n; i++) e = Math.max(e, Math.abs(h[i]) + Math.abs(v[i]) * .05); if (e < .03) { h.fill(0); v.fill(0); p.awake = 0; } };
// per frame: rain decay, ripples (near the view only), streaks + spray
Wt.tick = (Sf, dt) => { const w = Sf.water; if (!w) return; const P = Sf.P, v = Sf.view, thc = P.theta(v.cx, v.cy), reach = Math.hypot(v.x1 - v.x0, v.y1 - v.y0) * .6 + 300; w.vis.length = 0;
  for (const p of w.pools) { if (p.rain > 0) { const k = Math.exp(-dt / 240); p.rain *= k; if (p.rain < 1) p.rain = 0; if (Math.random() < .02) setVol(Sf, p); } solve(p); const d = Math.abs(arc(Sf, p, thc)); if (d < reach + p.span) { w.vis.push(p); if (p.awake) simLine(p, dt); } else if (p.awake) { p.awake = 0; p.h.fill(0); p.v.fill(0); } }
  for (const o of w.orbs) if (o.awake && Sf.inView(o.x, o.y, 300)) simLine(o, dt, 1);
  const g = Sf.W && Sf.W.grav; for (const arr of [w.streaks, w.spray]) for (let k = arr.length - 1; k >= 0; k--) { const s = arr[k]; s.t += dt; const dx = P.cx - s.x, dy = P.cy - s.y, r = Math.hypot(dx, dy) || 1;
    if (s.spray) { s.vx += dx / r * 420 * dt; s.vy += dy / r * 420 * dt; } s.x += s.vx * dt; s.y += s.vy * dt; if (P.gas ? s.t > 2 : land(Sf, s, r)) { arr.splice(k, 1); continue; } if (s.t > 7) arr.splice(k, 1); } };
const land = (Sf, s, r) => { const P = Sf.P, th = P.theta(s.x, s.y), g = P.R + P.height(th); if (P.sea > -1e8 && r < P.seaR && r > g) { if (r < P.seaR - 1) return true; } let top = g; const p = Wt.poolNear(Sf, th, 0); let i = -1;
  if (p) { i = clamp(Math.round((arc(Sf, p, th) + p.span) / p.dx), 0, Wt.N - 1); if (p.ds && p.ds[i] > .5) top = P.R + p.gs[i] + p.ds[i] + (p.h ? p.h[i] : 0); else i = -1; }
  if (r > top) return false; const v = s.spray ? Wt.RAINV * 1.5 : Wt.RAINV;
  if (i >= 0) { Wt.addRain(Sf, p, v); if ((s.rip = (s.rip || 0) + 1) && Math.random() < .5) Wt.ripple(Sf, p, i, .5); st(Sf, 'rainInPool'); }
  else { const q = Wt.poolNear(Sf, th, 500); if (q) Wt.addRain(Sf, q, v * .5); if (RS.Sym && RS.Sym.bump) RS.Sym.bump(Sf, th, 2, .001, .6); st(Sf, 'rainOnGround'); } return true; };
// rain: visual streaks (no bodies), a few per rain tick across the view
Wt.rain = (Sf, x) => { const w = Sf.water; if (!w) return; const v = Sf.view, wnd = (Sf.wind && Sf.wind[0]) || 0; for (let k = 0; k < 3; k++) { if (w.streaks.length >= Wt.STREAKS) { st(Sf, 'streakCull'); break; } const xx = k ? v.x0 + Math.random() * (v.x1 - v.x0) : x;
    const dx = Sf.P.cx - xx, dy = Sf.P.cy - v.y0, r = Math.hypot(dx, dy) || 1, sp = 620 + Math.random() * 180; w.streaks.push({ x: xx, y: v.y0 - 20 - Math.random() * 160, vx: dx / r * sp + wnd * .25, vy: dy / r * sp, t: 0, len: 10 + Math.random() * 8 }); } st(Sf, 'rainStreaks'); };
// spray: geysers, pops (visual drops that land into pools / wet the ground)
Wt.spray = (Sf, x, y, ux, uy, n = 8, sp = 260) => { const w = Sf.water; if (!w) return; for (let k = 0; k < n; k++) { if (w.spray.length >= Wt.SPRAY) { st(Sf, 'sprayCull'); break; } const a = (Math.random() - .5) * .6, c = Math.cos(a), s = Math.sin(a), vx = (ux * c - uy * s) * sp * (.6 + Math.random() * .6), vy = (ux * s + uy * c) * sp * (.6 + Math.random() * .6);
    w.spray.push({ x, y, vx, vy, t: 0, spray: 1 }); } };
// where water is at a point: depth below the local surface (0 = dry)
Wt.at = (Sf, x, y) => { const w = Sf.water; if (!w) return 0; const P = Sf.P; if (P.gas) { for (const o of w.orbs) { const d = Math.hypot(x - o.x, y - o.y); if (d < o.r) return o.r - d; } return 0; }
  const th = P.theta(x, y), p = Wt.poolNear(Sf, th, 0); if (!p || !p.ds) return 0; const i = clamp(Math.round((arc(Sf, p, th) + p.span) / p.dx), 0, Wt.N - 1); if (p.ds[i] < .5) return 0; const r = Math.hypot(x - P.cx, y - P.cy), top = P.R + p.gs[i] + p.ds[i];
  return r < top && r > P.R + p.gs[i] - 30 ? top - r : 0; };
Wt.spot = (Sf, x, y, R = 700) => { const w = Sf.water; if (!w) return null; const P = Sf.P; let best = null, bd = R; for (const p of w.pools) { if (!(p.depth > 2)) continue; const s = P.surf(p.th), d = Math.hypot(s[0] - x, s[1] - y); if (d < bd) { bd = d; best = p; } }
  if (!best) { for (const o of w.orbs) { const d = Math.hypot(o.x - x, o.y - y); if (d < bd) { bd = d; best = o; } } return best && best.orb ? [best.x, best.y] : null; } const r = P.R + best.lv - 4; return [P.cx + Math.sin(best.th) * r, P.cy - Math.cos(best.th) * r]; };
// buoyancy (each physics substep, after W.step): particles under a pool surface float (ohms 1.15, clear 1.05) or sink (.6) against the level, with drag
Wt.wet = Sf => { const w = Sf.water; if (!w) return; const W = Sf.W, P = Sf.P, g = W.grav, dt = W.dt, now = Sf.now(); if (P.gas) { for (const o of w.orbs) if (Sf.inView(o.x, o.y, 600)) W.query(o.x, o.y, o.r, j => { if (!(W.fl[j] & 1) || W.fl[j] & 4) return; if (Math.hypot(W.x[j] - o.x, W.y[j] - o.y) > o.r) return; W.fl[j] |= 16; W.px[j] = W.x[j] - (W.x[j] - W.px[j]) * .97; W.py[j] = W.y[j] - (W.y[j] - W.py[j]) * .97; }); return; }
  for (const p of w.vis) { if (!(p.depth > .8)) continue; const s = P.surf(p.th), cx = s[0], cy = s[1]; W.query(cx, cy, p.span + 30, j => { if (!(W.fl[j] & 1) || W.fl[j] & 4) return; const th = Math.atan2(W.x[j] - g.cx, -(W.y[j] - g.cy)), a = arc(Sf, p, th); if (a < -p.span || a > p.span) return;
      const i = clamp(Math.round((a + p.span) / p.dx), 0, Wt.N - 1), dep = p.ds[i]; if (dep < .8) return; const dx = W.x[j] - g.cx, dy = W.y[j] - g.cy, d = Math.hypot(dx, dy) || 1, top = P.R + p.gs[i] + dep + (p.h ? p.h[i] : 0), sub = top - d + (W.rad[j] || 3); if (sub <= 0) return;
      W.fl[j] |= 16; const b = W.bodies.get(W.bod[j]), buoy = b && b.mat && b.mat.clear > .5 ? 1.05 : b && b.kind === 'creature' ? 1.15 : .6, fr = Math.min(1, sub / 10), vx = W.x[j] - W.px[j], vy = W.y[j] - W.py[j], vr = (vx * dx + vy * dy) / d / dt;
      if (vr < -70 && sub < 8) { Wt.ripple(Sf, p, i, Math.min(3, -vr / 120)); if (now - w.splashT > .08) { w.splashT = now; w.splashN = 0; } if (w.splashN++ < 1 && b) { const bt = b._splT || -9; if (now - bt > .4) { b._splT = now; Sf.fx({ k: 'splash', x: W.x[j], y: W.y[j], dur: .4 }); if (Sf.play && Sf.S && Sf.S.bubble) Sf.play(Sf.S.bubble(clamp(9 + vr / 80, 2, 9), -vr), now, W.x[j], W.y[j]); st(Sf, 'splashes'); } } }
      const dk = 1 - .05 * fr; W.px[j] = W.x[j] - vx * dk; W.py[j] = W.y[j] - vy * dk; const k = g.g * buoy * fr * dt * dt; W.x[j] += dx / d * k; W.y[j] += dy / d * k; }); } };
// a sound made at / in a pool rings its surface; taps and lightning ring it too
Wt.sound = (Sf, x, y, gain) => { const w = Sf.water; if (!w || !w.vis.length || x == null) return; const P = Sf.P, th = P.theta(x, y); for (const p of w.vis) { if (!(p.depth > 1)) continue; const a = arc(Sf, p, th); if (a < -p.span || a > p.span) continue; const i = clamp(Math.round((a + p.span) / p.dx), 0, Wt.N - 1), r = Math.hypot(x - P.cx, y - P.cy), top = P.R + p.gs[i] + p.ds[i];
    if (r > top + 50 || r < P.R + p.gs[i] - 20) continue; const now = Sf.now(); if (now - p.rt < .08) return; p.rt = now; Wt.ripple(Sf, p, i, clamp((gain || .1) * 6, .3, 1.6)); st(Sf, 'noteRipples'); return; } };
Wt.touch = (Sf, x, y, amp = 1.5) => { const w = Sf.water; if (!w) return false; const P = Sf.P; if (P.gas) { for (const o of w.orbs) if (Math.hypot(x - o.x, y - o.y) < o.r + 20) { Wt.ripple(Sf, o, Math.round((Math.atan2(y - o.y, x - o.x) / TAU + 1) * 24) % 24, amp); return true; } return false; }
  const th = P.theta(x, y); for (const p of w.vis) { const a = arc(Sf, p, th); if (a < -p.span || a > p.span || !(p.depth > 1)) continue; const i = clamp(Math.round((a + p.span) / p.dx), 0, Wt.N - 1), r = Math.hypot(x - P.cx, y - P.cy), top = P.R + p.gs[i] + p.ds[i]; if (Math.abs(r - top) < 60 || (r < top && r > P.R + p.gs[i] - 10)) { Wt.ripple(Sf, p, i, amp); return true; } } return false; };
// light: pools and rain streaks act as droplets / prisms for RS.Light (rainbows)
Wt.drops = Sf => { const w = Sf.water, out = []; if (!w) return out; const P = Sf.P; for (const p of w.vis) { if (!(p.depth > 5)) continue; for (const f of [.3, .5, .7]) { const i = Math.round(f * (Wt.N - 1)); if (p.ds[i] < 5) continue; const r = P.R + p.gs[i] + p.ds[i] - Math.min(10, p.ds[i] * .6), th = p.th + (-p.span + 2 * p.span * f) / P.R; out.push({ cx: P.cx + Math.sin(th) * r, cy: P.cy - Math.cos(th) * r, r: Math.min(10, p.ds[i] * .6) }); } }
  for (const o of w.orbs) out.push({ cx: o.x, cy: o.y, r: Math.min(15, o.r) }); for (let k = w.streaks.length - 1, n = 0; k >= 0 && n < 6; k--, n++) { const s = w.streaks[k]; out.push({ cx: s.x, cy: s.y, r: 3.2 }); } return out; };
// drawing (world space, after the terrain): pool fill + bright surface line, rain streaks, spray, orbs
Wt.draw = (ctx, Sf, cam, t) => { const w = Sf.water; if (!w) return; const P = Sf.P, day = Sf.day == null ? 1 : Sf.day, col = (Sf.pal && Sf.pal.water) || [60, 110, 170], css = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`, N = Wt.N;
  for (const p of w.vis) { if (!(p.depth > .5)) continue; const s0 = P.surf(p.th); if (!Sf.inView(s0[0], s0[1], p.span + 80)) continue; if (RS.Render && RS.Render.tag) RS.Render.tag(ctx, 'water', 30); const top = [], bot = [];
    for (let i = 0; i < N; i++) { if (p.ds[i] < .3) { if (top.length) { fillRun(ctx, P, p, top, bot, col, day, css); top.length = 0; bot.length = 0; } continue; } const th = p.th + (-p.span + p.dx * i) / P.R, rt = P.R + p.gs[i] + p.ds[i] + (p.h ? p.h[i] : 0), rb = P.R + p.gs[i] - 2;
      top.push([P.cx + Math.sin(th) * rt, P.cy - Math.cos(th) * rt]); bot.push([P.cx + Math.sin(th) * rb, P.cy - Math.cos(th) * rb]); } if (top.length) fillRun(ctx, P, p, top, bot, col, day, css); }
  if (w.orbs.length) for (const o of w.orbs) { if (!Sf.inView(o.x, o.y, o.r + 40)) continue; ctx.fillStyle = css(col, .6); ctx.strokeStyle = css([210, 235, 255], .55); ctx.lineWidth = 1.4; ctx.beginPath(); for (let i = 0; i <= 24; i++) { const a = i / 24 * TAU, rr = o.r + (o.h ? o.h[i % 24] : 0) + Math.sin(t * 1.3 + i) * .6; if (i) ctx.lineTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr); else ctx.moveTo(o.x + Math.cos(a) * rr, o.y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); ctx.stroke(); }
  if (w.streaks.length) { ctx.strokeStyle = css([200, 220, 245], .38); ctx.lineWidth = 1.1; ctx.beginPath(); for (const s of w.streaks) { const m = Math.hypot(s.vx, s.vy) || 1; ctx.moveTo(s.x, s.y); ctx.lineTo(s.x - s.vx / m * s.len, s.y - s.vy / m * s.len); } ctx.stroke(); }
  if (w.spray.length) { ctx.fillStyle = css(col.map(c => Math.min(255, c + 50)), .8); for (const s of w.spray) { ctx.beginPath(); ctx.arc(s.x, s.y, 2.4, 0, TAU); ctx.fill(); } } };
const fillRun = (ctx, P, p, top, bot, col, day, css) => { ctx.fillStyle = css(col, .55 + day * .15); ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const q of top) ctx.lineTo(q[0], q[1]); for (let k = bot.length - 1; k >= 0; k--) ctx.lineTo(bot[k][0], bot[k][1]); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = css([215, 235, 255], .32 + day * .2); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(top[0][0], top[0][1]); for (const q of top) ctx.lineTo(q[0], q[1]); ctx.stroke(); };
// persistence: poured pools + extra water in field pools + orbs
Wt.pack = Sf => { const w = Sf.water; if (!w) return null; const r = x => Math.round(x * 10) / 10; return { p: w.pools.filter(p => !p.q && p.base > 0).map(p => [r(p.th * 1e4) / 1e4, r(p.base), r(p.rain), p.key || 0, p.src || 0]), f: w.pools.filter(p => p.q && (p.base > p.vol0 + 1 || p.rain > 1)).map(p => [p.id, r(p.base), r(p.rain)]), o: w.orbs.map(o => [r(o.x), r(o.y), r(o.r), o.key || 0]) }; };
Wt.unpack = (Sf, d) => { const w = Sf.water; if (!w || !d) return; for (const a of d.p || []) { const p = mk(Sf, { th: a[0], key: a[3] || undefined, src: a[4] || 'pour' }); p.base = a[1]; p.rain = a[2] || 0; setVol(Sf, p); }
  for (const a of d.f || []) { const p = w.pools.find(q => q.id === a[0]); if (p) { p.base = Math.max(p.base, a[1]); p.rain = a[2] || 0; setVol(Sf, p); } } for (const a of d.o || []) w.orbs.push({ id: 'o' + (w.nid++), orb: 1, x: a[0], y: a[1], r: a[2], key: a[3] || undefined, h: new Float32Array(24), v: new Float32Array(24), awake: 0 }); };
// migration: an old save's particle water body becomes pool volume at the nearest low point (81 px^2 per particle at the 9 px spacing)
Wt.migrate = (Sf, sb) => { const pts = sb.pts || []; if (!pts.length) return null; let x = 0, y = 0; for (const q of pts) { x += q[0]; y += q[1]; } x /= pts.length; y /= pts.length; st(Sf, 'waterMigrated'); return Wt.pour(Sf, x, y, Math.min(pts.length, 200) * 60, { src: 'migrated' }); };
})(typeof window !== 'undefined' ? window : globalThis);
