'use strict';
// v0.8b1 (V08_SPEC R1-R3, Wilbow 1:42-1:45 PM MDT Oct 23 2026): a stroke no gesture recognises is only INK. It glows and fades
// (~2 s). Drawing over the same ink again (either direction, mean distance < ~18 screen px, > ~70% of it covered) inside the window
// (1.2 s open, 2.5 s after a closed loop) turns the ink into a piece in EXACTLY the drawn shape: a rod / string / bar (V08 P) for an
// open stroke, a soft squishy blob for a closed loop. Retraced pieces can be carried by ohms (R4, items.js It.fromPiece).
(function (G) {
const RS = G.RS, TAU = Math.PI * 2;
const RT = RS.Retrace = {};
RT.WIN_OPEN = 1.2; RT.WIN_CLOSED = 2.5; RT.FADE = 2; RT.TOL = 18; RT.COV = .7; RT.HINTS = 4; RT.KEEP = 8;
const plen = p => { let L = 0; for (let i = 1; i < p.length; i++) L += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); return L; };
// resample a polyline at a fixed arc-length step (at most 400 points)
RT.resample = (pts, step) => { const L = plen(pts); step = Math.max(step, L / 400, .5); const out = [pts[0].slice(0, 2)]; let need = step, i = 1, [ax, ay] = pts[0];
  while (i < pts.length) { const [bx, by] = pts[i], d = Math.hypot(bx - ax, by - ay); if (d >= need && d > 0) { const t = need / d; ax += (bx - ax) * t; ay += (by - ay) * t; out.push([ax, ay]); need = step; } else { need -= d; ax = bx; ay = by; i++; } }
  const e = pts[pts.length - 1]; if (Math.hypot(e[0] - out[out.length - 1][0], e[1] - out[out.length - 1][1]) > step * .3) out.push(e.slice(0, 2)); return out; };
const nearest = (p, Q) => { let bd = 1e18; for (const q of Q) { const d = (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2; if (d < bd) bd = d; } return Math.sqrt(bd); };
// does stroke `pts` retrace the ink `ink` (both world units; z = camera zoom so the tolerance is ~18 SCREEN px)?
RT.match = (ink, pts, z = 1) => { const tol = RT.TOL / Math.max(.2, z), st = tol / 3, A = RT.resample(ink, st), B = RT.resample(pts, st);
  if (A.length < 2 || B.length < 2) return { ok: false, mean: 1e9, cov: 0 };
  let s = 0; for (const p of B) s += nearest(p, A); const mean = s / B.length; let hit = 0; for (const p of A) if (nearest(p, B) < tol * 1.5) hit++; const cov = hit / A.length;
  return { ok: mean < tol && cov > RT.COV, mean: mean * z, cov }; };
RT.list = Sf => (Sf.inkPend = Sf.inkPend || []);
RT.win = closed => closed ? RT.WIN_CLOSED : RT.WIN_OPEN;
// R1: leave ink (called from Sf.stroke's freeform branch)
RT.add = (Sf, pts, times, opt, closed) => { const L = RT.list(Sf), st = Sf.stats; st.inks = (st.inks || 0) + 1; const md = Sf.mods || (Sf.mods = {}), hint = (md.inkHint || 0) < RT.HINTS; if (hint) md.inkHint = (md.inkHint || 0) + 1;   /* first 4 inks ever (saved with the world) */
  const w = RT.win(closed), e = { pts: pts.map(p => [p[0], p[1]]), times: times ? times.slice() : null, closed, t: Sf.now(), win: w, fade: Math.max(RT.FADE, w + .5), z: opt.z || 1, rot: opt.rot || 0, hint };
  L.push(e); if (L.length > RT.KEEP) L.shift(); return { k: 'ink', closed, win: w }; };
RT.tick = Sf => { const L = Sf.inkPend; if (L && L.length) { const tn = Sf.now(); Sf.inkPend = L.filter(e => tn - e.t <= e.fade && tn >= e.t - 1); }
  if (Sf.pendPieces && Sf.pendPieces.length && RS.Items && RS.Items.fromPiece) { for (const b of Sf.pendPieces.splice(0)) if (Sf.W.bodies.has(b.id) && !(Sf.items || []).some(q => q.piece && q.b === b)) RS.Items.fromPiece(Sf, b); } };
const inside = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi || 1e-9) + xi) c = !c; } return c; };
// R2: the stroke just drawn retraces waiting ink (or a held hook) -> the piece; else null (route as usual)
RT.try = (Sf, pts, times, opt = {}) => { const tn = Sf.now(), z = opt.z || 1, L = RT.list(Sf), dur = opt.live && times && times.length > 1 ? Math.min(3, Math.max(0, (times[times.length - 1] - times[0]) / 1000)) : 0, t0 = tn - dur; let best = null, bm = null, hook = false;   /* a live (touch) retrace counts when it STARTS inside the window (a slow, careful retrace may end after it); headless / synthetic strokes (no opt.live) are timed at the call, as before */
  for (const e of L) { if (t0 - e.t > e.win || tn < e.t - 1) continue; const m = RT.match(e.pts, pts, z); if (m.ok && (!bm || m.mean < bm.mean)) { best = e; bm = m; } }
  const H = Sf.glyphHold; if (!best && H && RS.Symbols && t0 - H.t <= RS.Symbols.WIN) { const hp = H.wpts || H.pts, m = RT.match(hp, pts, z); if (m.ok) { best = { pts: hp.map(p => [p[0], p[1]]), times: H.times, closed: false, z, rot: opt.rot || 0 }; bm = m; hook = true; } }
  if (!best) return null;
  if (best.closed) for (const c of Sf.creatures) if (!c.dead && !c.caught && inside(best.pts, c.x, c.y)) return null;   // an ohm wandered into the loop: the retrace catches it (catch keeps priority)
  if (hook) { Sf.glyphHold = null; Sf._hookFade = null; } else Sf.inkPend = L.filter(e => e !== best);
  const r = Sf.stroke(best.pts, best.times, { z: best.z || z, rot: best.rot || 0, direct: true, retraced: true, noHold: true, noGlyph: true, noStrum: true, noItem: true, noClay: true, endHold: 0, ink: { crossed: new Map() } });
  const st = Sf.stats; st.retraced = (st.retraced || 0) + 1; if (Sf.mods) Sf.mods.retraced = (Sf.mods.retraced || 0) + 1;
  if (r && r.k === 'material') { const b = Sf.W.bodies.get(r.id); if (b) { b.meta.piece = 1; if (best.closed) b.meta.soft = 1; if (RS.Items && RS.Items.fromPiece) RS.Items.fromPiece(Sf, b); } r.retrace = true; r.closed = !!best.closed; r.hook = hook; r.mean = +bm.mean.toFixed(1); r.cov = +bm.cov.toFixed(2); }
  return r; };
RT.install = Sf => { if (Sf._retrace) return; Sf._retrace = true; if (Sf.inkMode == null) Sf.inkMode = RS.RETRACE !== false;
  const sb0 = Sf.serialBody, lb0 = Sf.loadBody; Sf.serialBody = b => { const s = sb0(b); if (b.meta && b.meta.piece) s.piece = b.meta.soft ? 2 : 1; if (b.rough) s.rough = +b.rough.toFixed(3); return s; };
  Sf.loadBody = s => { const b = lb0(s); if (b && s.piece) { b.meta.piece = 1; if (s.piece === 2) b.meta.soft = 1; (Sf.pendPieces = Sf.pendPieces || []).push(b); } if (b && s.rough) b.rough = s.rough; return b; }; };
// drawing (world coordinates): warm glowing ink; while it can still be retraced it pulses (the first few times: an invitation)
RT.draw = (ctx, Sf, z = 1) => { const L = Sf.inkPend; if (!L || !L.length) return; const tn = Sf.now(); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (const e of L) { const age = tn - e.t, a = Math.max(0, 1 - age / e.fade); if (a <= 0) continue; const open = age <= e.win, pu = open && e.hint ? .55 + .45 * Math.sin(age * 9) : 1;
    const path = () => { ctx.beginPath(); e.pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); if (e.closed) ctx.closePath(); };
    path(); ctx.strokeStyle = 'rgba(255,214,150,' + (.16 * a * pu).toFixed(3) + ')'; ctx.lineWidth = (e.hint && open ? 12 : 8) / z; ctx.stroke();
    path(); ctx.strokeStyle = 'rgba(255,244,222,' + (.55 * a * (open ? .7 + .3 * pu : .8)).toFixed(3) + ')'; ctx.lineWidth = 2.6 / z; ctx.stroke(); }
  ctx.restore(); };
})(typeof window !== 'undefined' ? window : globalThis);
