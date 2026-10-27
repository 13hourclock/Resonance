'use strict';
// v0.8b4 (Wilbow 3:32 PM MDT Oct 23 2026): MOVING OHMS. CALL: a double tap on bare ground calls the watched ohm (or the selected group) to that spot.
// TAP TEMPO: 3+ further taps on that spot set the called ohms' tempo. GROUP SELECT: a closed loop round 2+ ohms (or any count when the loop's end
// rests ~0.5 s) selects them (one ohm in a plain loop is still a catch); dragging a member moves the group; a tap on empty ground or ~20 s clears it.
// HOME: drag an ohm / group somewhere and keep the finger still 1 s (or, after a call, hold the called spot): that is home; ohms wander but drift
// back. Everything here is O(selected / called) per frame; off-screen ohms only pay the jam.js steer branch they already run.
(function (G) {
const RS = G.RS, TAU = Math.PI * 2;
const Hd = RS.Herd = {};
Hd.SEL_T = 20; Hd.CALL_T = 30; Hd.TEMPO_R = 50; Hd.TEMPO_GAP = 2.5; Hd.HOME_STILL = 1; Hd.HOME_PX = 7; Hd.CALL_HOLD_R = 60; Hd.ARRIVE = 30; Hd.MARK_T = 2.4; Hd.HOME_FAR = 150;
const live = c => !!c && !c.dead && !c.caught;
const st = (Sf, k, n = 1) => { Sf.stats[k] = (Sf.stats[k] || 0) + n; };
const polyHas = (pts, x, y) => { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, yi] = pts[i], [xj, yj] = pts[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi || 1e-9) + xi) c = !c; } return c; };
const byId = (Sf, id) => Sf.creatures.find(c => c.id === id);
Hd.inLoop = (Sf, pts) => Sf.creatures.filter(c => live(c) && polyHas(pts, c.x, c.y));
// ---- selection ----
Hd.sel = Sf => { const s = Sf.herd; if (!s) return []; if (Sf.now() - s.t > Hd.SEL_T) { Sf.herd = null; st(Sf, 'herdTimeout'); return []; } const m = s.ids.map(id => byId(Sf, id)).filter(live); if (!m.length) Sf.herd = null; return m; };
Hd.select = (Sf, cs, how) => { Sf.herd = { ids: cs.map(c => c.id), t: Sf.now(), t0: Sf.now() }; st(Sf, 'herdSelect');
  cs.forEach((c, k) => { Sf.fx({ k: 'bloom', x: c.x, y: c.y, col: [255, 226, 160], dur: .5 }); if (k < 4) Sf.blip(c.x, c.y, 392 * Math.pow(2, [0, 4, 7, 12][k] / 12), .03, .5, { when: Sf.now() + k * .05, force: true }); });
  return { k: 'select', n: cs.length, ids: cs.map(c => c.id), how }; };
Hd.clear = (Sf, why) => { if (!Sf.herd) return false; Sf.herd = null; st(Sf, 'herdClear'); Sf.herdWhy = why; return true; };
// the ohm a call goes to without a selection: the last one touched (if still on screen) else the on-screen ohm nearest the middle of the view
Hd.touch = (Sf, c) => { if (live(c)) Sf.lastOhm = { id: c.id, t: Sf.now() }; };
Hd.watched = Sf => { const J = RS.Jam, v = Sf.view; const L = Sf.lastOhm && Sf.now() - Sf.lastOhm.t < 60 ? byId(Sf, Sf.lastOhm.id) : null; if (live(L) && (!J || !J.watched || J.watched(Sf, L))) return L;
  if (!v || v.cx == null) return null; let best = null, bd = 1e18; for (const c of Sf.creatures) { if (!live(c) || c.grabbed || (J && J.watched && !J.watched(Sf, c))) continue; const d = (c.x - v.cx) ** 2 + (c.y - v.cy) ** 2; if (d < bd) { bd = d; best = c; } } return best; };
// ---- call + tap tempo ----
Hd.call = (Sf, x, y) => { let cs = Hd.sel(Sf); const grp = cs.length > 0; if (!grp) { const w = Hd.watched(Sf); if (w) cs = [w]; } if (!cs.length) return null; const tn = Sf.now();
  cs.forEach((c, k) => { const a = k * 2.39996, r = k ? 26 + 12 * Math.sqrt(k) : 0, q = { x: x + Math.cos(a) * r, y: y + Math.sin(a) * r, t: tn };   /* a group gathers in a loose sunflower round the spot */
    c.called = q; c.anchor = [q.x, q.y]; if (!c.homeSet) c.home0 = [q.x, q.y]; c.holdAt = null; c.itemGoal = null; c.thrownT = 0; });
  if (grp) Sf.herd.t = tn; Sf.callSpot = { x, y, t: tn, ids: cs.map(c => c.id), taps: [] }; Sf.calledN = cs.length; st(Sf, 'herdCall');
  Sf.fx({ k: 'bloom', x, y, col: [210, 236, 255], dur: .7 }); [0, 7].forEach((d, k) => Sf.blip(x, y, 523 * Math.pow(2, d / 12), .035, .4, { when: tn + k * .09, force: true }));
  return { k: 'call', n: cs.length, ids: cs.map(c => c.id), group: grp }; };
Hd.near = (S, x, y, R, z) => !!S && Math.hypot(x - S.x, y - S.y) < R / Math.max(.2, z || 1);
Hd.fold = b => { if (!(b > 0)) return null; while (b < 60) b *= 2; while (b > 180) b /= 2; return Math.round(b * 10) / 10; };
Hd.tempoTap = (Sf, x, y, z, tn = Sf.now()) => { const S = Sf.callSpot; if (!S) return null; if (tn - S.t > Hd.CALL_T) { Sf.callSpot = null; return null; } if (!Hd.near(S, x, y, Hd.TEMPO_R, z)) return null;
  const T = S.taps; if (T.length && tn - T[T.length - 1] > Hd.TEMPO_GAP) T.length = 0; T.push(tn); if (T.length > 8) T.shift(); S.t = Math.max(S.t, tn - Hd.CALL_T + 6);   /* tapping keeps the spot alive a little */
  Sf.blip(S.x, S.y, T.length >= 3 ? 1046 : 784, .025, .12, { force: true }); st(Sf, 'herdTempoTap');
  if (T.length < 3) return { k: 'tempoTap', n: T.length };
  const iv = []; for (let i = 1; i < T.length; i++) iv.push(T[i] - T[i - 1]); iv.sort((a, b) => a - b); const med = iv[iv.length >> 1], bpm = Hd.fold(60 / med); if (!bpm) return { k: 'tempoTap', n: T.length };
  const cs = S.ids.map(id => byId(Sf, id)).filter(live); for (const c of cs) { if (RS.Conduct && RS.Conduct.setTempo) RS.Conduct.setTempo(c, bpm); if (c.mind) { c.mind.bpmT = bpm; c.mind.bpmPref = bpm; } c.tapBpm = bpm; }
  S.bpm = bpm; Sf.herdBpm = bpm; st(Sf, 'herdTempo'); return { k: 'tempo', bpm, n: cs.length, taps: T.length }; };
// ---- home ----
Hd.setHome = (Sf, cs, how) => { const tn = Sf.now(); for (const c of cs) { const h = c.called && how === 'call' ? [c.called.x, c.called.y] : [c.x, c.y]; c.homeSet = [Math.round(h[0]), Math.round(h[1])]; c.home0 = c.homeSet.slice(); c.anchor = c.homeSet.slice(); c.home00 = null; c.homeWhy = null;
    (Sf.homeMarks = Sf.homeMarks || []).push({ x: c.homeSet[0], y: c.homeSet[1], t: tn }); }
  if (Sf.homeMarks && Sf.homeMarks.length > 12) Sf.homeMarks.splice(0, Sf.homeMarks.length - 12); st(Sf, 'herdHome'); const c0 = cs[0];
  if (c0) [0, 5].forEach((d, k) => Sf.blip(c0.x, c0.y, 196 * Math.pow(2, d / 12), .04, .9, { when: tn + k * .12, att: .04, force: true }));
  return { k: 'home', n: cs.length, how, ids: cs.map(c => c.id) }; };
Hd.callHold = (Sf, x, y, z) => { const S = Sf.callSpot; if (!S || Sf.now() - S.t > Hd.CALL_T || !Hd.near(S, x, y, Hd.CALL_HOLD_R, z)) return null; const cs = S.ids.map(id => byId(Sf, id)).filter(live); if (!cs.length) return null; Sf.callSpot = null; return Hd.setHome(Sf, cs, 'call'); };
// ---- per frame (cheap: nothing unless a grab / selection / call is live) ----
const shift = (Sf, c, dx, dy) => { const W = Sf.W; for (const b of c.segs) for (const i of b.idx) { W.x[i] += dx; W.y[i] += dy; W.px[i] += dx; W.py[i] += dy; } };
Hd.tick = Sf => { const tn = Sf.now(), g = Sf.grab && Sf.grab(), gc = g && g.c;
  if (gc) { Hd.touch(Sf, gc); gc.called = null; const sel = Sf.herd ? Hd.sel(Sf) : [], mem = sel.includes(gc) ? sel.filter(c => c !== gc) : [], D = Sf._hd && Sf._hd.c === gc ? Sf._hd : (Sf._hd = { c: gc, x: gc.x, y: gc.y, mem: [], sx: g.tx, sy: g.ty, st: tn, done: false });
    if (mem.length) { const dx = gc.x - D.x, dy = gc.y - D.y; for (const m of mem) { m.herdDrag = true; m.called = null; if (dx || dy) shift(Sf, m, dx, dy); } D.mem = mem; Sf.herd.t = tn; }   /* the group keeps its shape round the dragged member */
    D.x = gc.x; D.y = gc.y; const z = Sf.view && Sf.view.z || 1;
    if (Math.hypot(g.tx - D.sx, g.ty - D.sy) * z > Hd.HOME_PX || (g.fuseT || 0) > 0) { D.sx = g.tx; D.sy = g.ty; D.st = tn; }
    else if (!D.done && tn - D.st >= Hd.HOME_STILL && Math.hypot(g.tx - g.x0, g.ty - g.y0) * z > 24) { D.done = true; D.home = Hd.setHome(Sf, [gc, ...mem], 'drop'); Sf.lastHome = D.home; }   /* a still finger after a real drag (not while press-fusing) = home here */
    D.u = D.done ? 1 : RS.clamp((tn - D.st) / Hd.HOME_STILL, 0, 1); }
  else if (Sf._hd) { for (const m of Sf._hd.mem) m.herdDrag = false; Sf._hd = null; }
  if (Sf.herd && tn - Sf.herd.t > Hd.SEL_T) { Sf.herd = null; st(Sf, 'herdTimeout'); }
  if (Sf.calledN) { let n = 0; for (const c of Sf.creatures) if (c.called) { if (tn - c.called.t > Hd.CALL_T || !live(c)) { c.called = null; c.anchor = (c.homeSet || c.home0 || [c.x, c.y]).slice(); } else n++; } Sf.calledN = n; }
  if (Sf.homeMarks && Sf.homeMarks.length && tn - Sf.homeMarks[0].t > Hd.MARK_T) Sf.homeMarks = Sf.homeMarks.filter(m => tn - m.t <= Hd.MARK_T);
  if (Sf.callSpot && tn - Sf.callSpot.t > Hd.CALL_T) Sf.callSpot = null; };
// jam.js J.steer: the called branch (returns true when it moved the ohm) and the drift home when nothing else is going on
Hd.HELP = .6;   // px / frame of positional help on a call (an ohm's own walk is ~20 px/s; called, it comes at ~55 px/s)
Hd.steerCall = (Sf, c, go) => { const q = c.called; if (!q) return false; const d = Math.hypot(q.x - c.x, q.y - c.y); if (d < Hd.ARRIVE) { q.arrived = q.arrived || Sf.now(); return false; }
  const k = Math.min(Hd.HELP, (d - Hd.ARRIVE) * .03) / d; shift(Sf, c, (q.x - c.x) * k, (q.y - c.y) * k); return go(q.x, q.y, Hd.ARRIVE * .7, .45, 'travel'); };
Hd.homing = c => { const h = c.homeSet; if (!h || c.called) return false; const d = Math.hypot(h[0] - c.x, h[1] - c.y); if (d > Hd.HOME_FAR) c.homing = true; else if (d < 60) c.homing = false; return !!c.homing; };   /* hysteresis: once it heads home it gets there */
Hd.steerHome = (c, go) => { const h = c.homeSet; if (!h || c.called) return false; return Math.hypot(h[0] - c.x, h[1] - c.y) > 70 && go(h[0], h[1], 40, .06, 'drift'); };
// draw (world space): the selection glow, the home-hold ring while dragging, the soft home markers, the call spot
Hd.draw = (ctx, Sf, z) => { const tn = Sf.now(), sel = Sf.herd ? Hd.sel(Sf) : [];
  for (const c of sel) { const R = (RS.Creature && RS.Creature.radius ? RS.Creature.radius(c) : 14) + 9 / z, a = .35 + .15 * Math.sin(tn * 4 + c.id); ctx.strokeStyle = `rgba(255,226,160,${a.toFixed(3)})`; ctx.lineWidth = 2.5 / z; ctx.beginPath(); ctx.arc(c.x, c.y, R, 0, TAU); ctx.stroke(); }
  const D = Sf._hd; if (D && D.u > .08 && !D.done) { const c = D.c, R = 30 / z; ctx.strokeStyle = 'rgba(190,230,200,.75)'; ctx.lineWidth = 3 / z; ctx.beginPath(); ctx.arc(c.x, c.y, R, -Math.PI / 2, -Math.PI / 2 + D.u * TAU); ctx.stroke(); }
  for (const m of Sf.homeMarks || []) { const k = RS.clamp((tn - m.t) / Hd.MARK_T, 0, 1), R = (8 + 22 * Math.sqrt(k)) / z; ctx.fillStyle = `rgba(190,230,200,${(.28 * (1 - k)).toFixed(3)})`; ctx.beginPath(); ctx.arc(m.x, m.y, R, 0, TAU); ctx.fill(); }
  const S = Sf.callSpot; if (S) { const k = RS.clamp((tn - S.t) / 2, 0, 1); if (k < 1 || S.taps.length) { ctx.strokeStyle = `rgba(210,236,255,${(.4 * (1 - k * .7)).toFixed(3)})`; ctx.lineWidth = 2 / z; ctx.beginPath(); ctx.arc(S.x, S.y, (10 + 14 * k) / z, 0, TAU); ctx.stroke(); } } };
})(typeof window !== 'undefined' ? window : globalThis);
