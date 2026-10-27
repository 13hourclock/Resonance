'use strict';
// Inspect-zoom envelope + tuning editing (12:01 steer). Zoom onto a creature (cam.z 1.8..4.2, creature near the screen centre, before the
// DNA cells): a halo shows its amp envelope as a ring (angle = time, outward = level) with glowing nodes A (peak), D (decay end / sustain level),
// S (sustain end), R (release end), bend handles on each segment (curve), and an outer filter ring (node F: amount = radius, decay = angle).
// Gestures (no collisions: node hits need < 22 px (44 px targets); 0.8a9: the ring is laid out to fit the safe screen band; everything else falls through to the normal gestures):
//   drag a node  -> edits that stage;  drag a bend handle in/out -> envelope curve;  two-finger twist (while inspecting) -> cutoff/brightness
//   (instead of opening the DAW);  pinch on the inspected body -> register (pinch in = up an octave, spread = down; a big spread still opens DNA);
//   a back-and-forth stroke across the body -> vibrato (reversals = depth, speed = rate);  release of any edit plays a note.
// Every edit writes SOUND GENES as player edits (C.editGene): persisted in the code, inherited, highlighted in the DNA view.
(function (G) { const RS = G.RS = G.RS || {}; const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const E = RS.EnvEdit = {};
// 0.8a9: the controls always fit the screen. Safe band = the viewport minus thumb / Android gesture insets; the ring is laid out in SCREEN px
// around the creature (clamped to the room it has right now), and the camera eases it toward the band's centre when no finger is down.
E.M = { side: 28, top: 30, bot: 58, hit: 22 };   // hit = 22 px radius -> 44 px touch targets
E.safe = App => { const M = E.M, x0 = M.side, x1 = App.Wd - M.side, y0 = M.top, y1 = App.Ht - M.bot; return { x0, x1, y0, y1, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 }; };
E.pick = (App) => { const Sf = App.Sf, cam = App.cam; if (App.level !== 'surface' || !Sf || cam.z < 1.8 || cam.z > 4.2) return null; const B = E.safe(App), S = (x, y) => RS.Render.toScreen(cam, App.Wd, App.Ht, x, y), dd = c => { const s = S(c.x, c.y), edge = Math.min(s[0] - B.x0, B.x1 - s[0], s[1] - B.y0, B.y1 - s[1]); return edge < E.M.hit + 4 + 34 ? 1e9 : Math.min(Math.hypot(s[0] - B.cx, s[1] - B.cy), Math.hypot(s[0] - App.Wd / 2, s[1] - App.Ht * .58)); };   // too near an edge to fit its controls = not inspectable (yet)
  const cur = App.inspect; if (cur && !cur.dead && !cur.caught && cur.P.inst && Sf.creatures.includes(cur) && dd(cur) < 170) return cur;   // hysteresis: keep the one being inspected while it stays near the middle
  let best = null, bd = 90; for (const c of Sf.creatures) { if (c.dead || c.caught || !c.P.inst) continue; const d = dd(c); if (d < bd) { bd = d; best = c; } } return best; };
// the ring's size in screen px -> world units. Big ohm: the ring tucks in over the body; off-centre or tight screen: everything shrinks to fit.
E.layout = (App, c) => { const cam = App.cam, z = cam.z, M = E.M, B = E.safe(App), s = RS.Render.toScreen(cam, App.Wd, App.Ht, c.x, c.y), rb = RS.Creature.radius(c) * z;
  const room = Math.max(6, Math.min(s[0] - B.x0, B.x1 - s[0], s[1] - B.y0, B.y1 - s[1]) - M.hit - 4);   // (off-centre it can be tiny for a moment: the camera eases it back)
  let H = clamp(26 * z, 36, 64), gap = clamp(28 * z, 24, 44), Fu = clamp(7 * z, 5, 8), R0 = Math.max(rb + 18, 52); const need = () => R0 + H + gap + 5 * Fu, Hm = 30, Gm = 20, Fm = 4;
  if (need() > room) { const k = clamp((room - R0 - (Hm + Gm + 5 * Fm)) / (H - Hm + gap - Gm + 5 * (Fu - Fm)), 0, 1); H = Hm + (H - Hm) * k; gap = Gm + (gap - Gm) * k; Fu = Fm + (Fu - Fm) * k; }   // 1) tighten the bands first
  if (need() > room) R0 = Math.max(Math.min(R0, 30), R0 - (need() - room));   // 2) then pull the ring in over a big body
  let f = 1; if (need() > room) { f = room / need(); R0 *= f; H *= f; gap *= f; Fu *= f; }   // 3) last resort: scale it all (never off-frame)
  return { R0: R0 / z, H: H / z, gap: gap / z, Fu: Fu / z, f, room, rb, s, z }; };
// ease the camera so the inspected creature sits at the safe band's centre
E.ease = (App, c, k) => { const B = E.safe(App), w = RS.Render.toWorld(App.cam, App.Wd, App.Ht, B.cx, B.cy); App.cam.x += (c.x - w[0]) * k; App.cam.y += (c.y - w[1]) * k; };
// envelope geometry in WORLD units around the creature
E.geo = (c, L) => { const P = c.P.inst, R0 = L ? L.R0 : RS.Creature.radius(c) * 1.6 + 26, H = L ? L.H : 26, gp = L ? L.gap : 28, Fu = L ? L.Fu : 7, hold = .3, T = P.att + P.dec + hold + P.rel, a0 = -Math.PI / 2, sweep = TAU * .82, ang = t => a0 + sweep * Math.min(1, t / T);
  const pt = (t, lvl, rr) => { const a = ang(t), r = (rr || R0) + lvl * H; return [c.x + Math.cos(a) * r, c.y + Math.sin(a) * r]; };
  const n = { A: { t: P.att, l: 1 }, D: { t: P.att + P.dec, l: P.sus }, S: { t: P.att + P.dec + hold, l: P.sus }, R: { t: T, l: 0 } };
  for (const k in n) { const q = pt(n[k].t, n[k].l); n[k].x = q[0]; n[k].y = q[1]; }
  const bend = { b1: pt(P.att * .5, .5 + (1 / P.curve - 1) * .12), b2: pt(P.att + P.dec * .5, (1 + P.sus) / 2 + (P.curve - 1) * .08), b3: pt(P.att + P.dec + hold + P.rel * .5, P.sus * .5 + (P.curve - 1) * .08) };
  const RF = R0 + H + gp, fa = a0 + sweep * clamp(P.fdec / 1.5, 0, 1), fr = RF + clamp(P.fenv, -1, 5) * Fu; const F = { x: c.x + Math.cos(fa) * fr, y: c.y + Math.sin(fa) * fr, RF, Fu, a: fa };
  const curve = []; for (let k = 0; k <= 48; k++) { const t = T * k / 48; let l; if (t < P.att) l = Math.pow(t / P.att, 1 / P.curve); else if (t < P.att + P.dec) l = 1 - (1 - P.sus) * Math.pow((t - P.att) / P.dec, 1 / P.curve); else if (t < P.att + P.dec + hold) l = P.sus; else l = P.sus * Math.pow(1 - (t - P.att - P.dec - hold) / P.rel, P.curve); curve.push(pt(t, clamp(l, 0, 1))); }
  return { R0, H, T, ang, a0, sweep, n, bend, F, curve, hold }; };
// 0.8a9 text-free feedback: live (wobbling) envelope curve, glow + value arc/fill on the touched handle, cutoff = brightness halo, register =
// a 5-step ladder in the ring's gap (pinch previews the step it would take), vibrato = a visible wobble, ghost hints on the first 3 entries.
const mixW = (col, k) => col.map(v => Math.round(v + (255 - v) * k));
E.tick = App => { if (!App.inspect) E._c = null; };
E.count = () => { let n = (E._mem || 0) + 1; try { const ls = G.localStorage; if (ls) { n = (parseInt(ls.getItem('rs.inspHint'), 10) || 0) + 1; ls.setItem('rs.inspHint', String(n)); } } catch (e) { } E._mem = n; return n; };
E.seen = (c, t) => { if (E._c !== c) { E._c = c; E._t0 = t; E._n = E.count(); } };
E.draw = (ctx, App) => { const c = App.inspect; if (!c || c.dead) return; const L = E.layout(App, c), g = E.geo(c, L), css = RS.Render.css, col = c.col || [200, 220, 255], t = performance.now() / 1000, z = App.cam.z, px = v => v / z, IG = RS.IG, act = App.envAct || null, rbw = RS.Creature.radius(c);
  E.seen(c, t); RS.Render.apply(ctx, App.cam, App.Wd, App.Ht, App.dpr); const arc = (r, a, b, w, st) => { ctx.lineWidth = w; ctx.strokeStyle = st; ctx.beginPath(); ctx.arc(c.x, c.y, r, a, b); ctx.stroke(); }, dot = (x, y, r, f) => { ctx.fillStyle = f; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  // cutoff = brightness halo (brighter + a value arc while twisting)
  const cut = c.g[IG.cut] || 0, tw = Math.max(0, 1 - (t - (App.envTwistT || -9)) / 1.2), hr = rbw + px(14 + 30 * cut);
  if (ctx.createRadialGradient) { const gr = ctx.createRadialGradient(c.x, c.y, rbw * .5, c.x, c.y, hr); gr.addColorStop(0, css(mixW(col, .2 + .7 * cut), .08 + .3 * cut + .25 * tw)); gr.addColorStop(1, css(col, 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.x, c.y, hr, 0, TAU); ctx.fill(); }
  if (tw > 0) { arc(rbw + px(8), -Math.PI / 2, -Math.PI / 2 + TAU, px(3), css(col, .15 * tw)); arc(rbw + px(8), -Math.PI / 2, -Math.PI / 2 + TAU * Math.max(.01, cut), px(4), css([255, 244, 210], .85 * tw)); }
  // vibrato = a visible wobble (depth = lfoP, speed = lfoR) on the body rim and the envelope curve
  const vd = c.g[IG.lfoP] || 0, vr = c.g[IG.lfoR] || 0, ph = t * TAU * (.8 + vr * 6), vw = (k, a) => vd * a * Math.sin(ph + k * .9); const vf = Math.max(0, 1 - (t - (App.envVibT || -9)) / 1.5);
  if (vd > .04 || vf > 0) { ctx.lineWidth = px(1.6 + 2 * vf); ctx.strokeStyle = css(col, .3 + .5 * vf); ctx.beginPath(); for (let k = 0; k <= 40; k++) { const a = k / 40 * TAU, r = rbw + px(5) + vw(k, px(5)); k ? ctx.lineTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r) : ctx.moveTo(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); } ctx.stroke(); }
  const W = g.curve.map((p, k) => { const dx = p[0] - c.x, dy = p[1] - c.y, r = Math.hypot(dx, dy) || 1, o = vw(k, px(4)); return [p[0] + dx / r * o, p[1] + dy / r * o]; });
  arc(g.R0, g.a0, g.a0 + g.sweep, px(1.4), css(col, .18)); ctx.strokeStyle = css(col, .75); ctx.lineWidth = px(2.4); ctx.beginPath(); W.forEach((p, k) => k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
  const ed = new Set(c.editedGenes || []), segE = [[IG.att, 0, g.n.A.t], [IG.dec, g.n.A.t, g.n.D.t], [IG.rel, g.n.S.t, g.T]]; for (const [gi, t0, t1] of segE) if (ed.has(gi)) { ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); for (let k = 0; k <= 12; k++) { const tt = t0 + (t1 - t0) * k / 12, p = W[Math.min(48, Math.round(tt / g.T * 48))]; k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); }
  // the touched handle: glow + its value as an arc (time) and a fill (level / amount)
  if (act) { const q = g.n[act] ? [g.n[act].x, g.n[act].y] : g.bend[act] ? g.bend[act] : act === 'F' ? [g.F.x, g.F.y] : null; if (q) { dot(q[0], q[1], px(24), css(col, .16)); dot(q[0], q[1], px(14), css(mixW(col, .5), .3));
      if (g.n[act]) { arc(g.R0, g.a0, g.ang(g.n[act].t), px(4.5), css(mixW(col, .6), .85)); const a = g.ang(g.n[act].t); ctx.lineWidth = px(4); ctx.strokeStyle = css([255, 255, 255], .6); ctx.beginPath(); ctx.moveTo(c.x + Math.cos(a) * g.R0, c.y + Math.sin(a) * g.R0); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
      else if (act === 'F') { arc(g.F.RF, g.a0, g.F.a, px(4.5), css([255, 200, 120], .85)); ctx.lineWidth = px(4); ctx.strokeStyle = css([255, 220, 160], .7); ctx.beginPath(); ctx.moveTo(c.x + Math.cos(g.F.a) * g.F.RF, c.y + Math.sin(g.F.a) * g.F.RF); ctx.lineTo(q[0], q[1]); ctx.stroke(); }
      else { const seg = act === 'b1' ? [0, g.n.A.t] : act === 'b2' ? [g.n.A.t, g.n.D.t] : [g.n.S.t, g.T]; ctx.strokeStyle = css([255, 255, 255], .9); ctx.lineWidth = px(4); ctx.beginPath(); for (let k = 0; k <= 12; k++) { const p = W[Math.min(48, Math.round((seg[0] + (seg[1] - seg[0]) * k / 12) / g.T * 48))]; k ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); } ctx.stroke(); } } }
  for (const k of ['A', 'D', 'S', 'R']) { const q = g.n[k], pulse = .6 + .4 * Math.sin(t * 3 + k.charCodeAt(0)); dot(q.x, q.y, px(7.5), css(col, .9 * pulse)); dot(q.x, q.y, px(3), 'rgba(255,255,255,.7)'); }
  for (const k in g.bend) { const q = g.bend[k]; ctx.lineWidth = px(1.6); ctx.strokeStyle = css(col, .5); ctx.beginPath(); ctx.arc(q[0], q[1], px(6), 0, TAU); ctx.stroke(); }
  arc(g.F.RF, g.a0, g.a0 + g.sweep, px(1.4), css([255, 180, 90], .22)); dot(g.F.x, g.F.y, px(7.5), css([255, 180, 90], .85));
  // register = a 5-step ladder in the ring's gap; a pinch lights the step it would take (spread past the DNA line dims it and rims the body)
  const gapA = TAU - g.sweep, rr = g.R0 + g.H * .5, cur = Math.round(clamp((c.g[123] == null ? .5 : c.g[123]) / .25, 0, 4)), pin = App.envPinch, dna = pin && pin.ratio > 1.8, flash = Math.max(0, 1 - (t - (App.envRegT || -9)) / 1);
  const la = i => g.a0 - gapA * (.85 - .7 * i / 4); ctx.lineWidth = px(1.4); ctx.strokeStyle = css(col, dna ? .1 : .3); ctx.beginPath(); ctx.arc(c.x, c.y, rr, la(0), la(4)); ctx.stroke();
  for (let i = 0; i < 5; i++) { const a = la(i), x = c.x + Math.cos(a) * rr, y = c.y + Math.sin(a) * rr, on = i === cur, tg = pin && pin.dir && i === clamp(cur + pin.dir, 0, 4); if (tg && !dna) dot(x, y, px(13 + 3 * Math.sin(t * 10)), css([255, 255, 255], .3)); if (on && flash > 0) dot(x, y, px(16), css(mixW(col, .5), .4 * flash)); dot(x, y, px(on ? 6.5 : 3.5), css(on ? mixW(col, .5) : col, (dna ? .3 : 1) * (on ? .95 : .45))); }
  if (dna) arc(rbw + px(16), 0, TAU, px(3), css([140, 255, 220], .5 + .3 * Math.sin(t * 8)));
  // ghost hints (first ~3 entries, ~7 s, only while nothing is touched): drag a node / twist / pinch
  const ht = t - E._t0; if (E._n <= 3 && ht < 7.5 && !act && !pin && !App.envBusy) { const ph3 = (ht % 7.5) / 2.5, k = ph3 % 1, fade = Math.sin(Math.PI * k) * .3, gh = (x, y) => { dot(x, y, px(15), css([255, 255, 255], fade)); dot(x, y, px(5), css([255, 255, 255], fade * 1.6)); };
    if (ph3 < 1) { const a = g.ang(g.n.A.t) + .25 * k, r = g.R0 + g.H * (1 - .4 * k); gh(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); }
    else if (ph3 < 2) { const r = rbw + px(34), a = -.4 + .9 * k; gh(c.x + Math.cos(a) * r, c.y + Math.sin(a) * r); gh(c.x - Math.cos(a) * r, c.y - Math.sin(a) * r); }
    else { const r = rbw + px(60 - 34 * k); gh(c.x + r * .7, c.y - r * .7); gh(c.x - r * .7, c.y + r * .7); } } };
// hit test in screen space (px): returns a handle id or null
E.hit = (App, sx, sy) => { const c = App.inspect; if (!c) return null; const g = E.geo(c, E.layout(App, c)), S = (x, y) => RS.Render.toScreen(App.cam, App.Wd, App.Ht, x, y); let best = null, bd = E.M.hit;
  const test = (id, x, y) => { const s = S(x, y), d = Math.hypot(s[0] - sx, s[1] - sy); if (d < bd) { bd = d; best = id; } }; for (const k of ['A', 'D', 'S', 'R']) test(k, g.n[k].x, g.n[k].y); for (const k in g.bend) test(k, g.bend[k][0], g.bend[k][1]); test('F', g.F.x, g.F.y); return best; };
// a drag of handle h to world point w -> gene edits (absolute, so dragging back undoes)
E.drag = (Sf, c, h, w, L) => { RS.Guide && RS.Guide.notify(Sf, "halo"); const g = E.geo(c, L), dx = w[0] - c.x, dy = w[1] - c.y, r = Math.hypot(dx, dy); let a = Math.atan2(dy, dx) - g.a0; a = ((a % TAU) + TAU) % TAU; const tf = clamp(a / g.sweep, 0, 1), t = tf * g.T, lvl = clamp((r - g.R0) / g.H, 0, 1), P = c.P.inst, C = RS.Creature;
  const inv = (name, want, f) => { let bv = 0, be = 1e9; for (let k = 0; k <= 64; k++) { const v = k / 64 * .9999, e = Math.abs(f(v) - want); if (e < be) { be = e; bv = v; } } C.editGene(Sf, c, name, bv); };
  const Q = (name, v) => { const g2 = new Float32Array(c.g); g2[RS.IG[name]] = v; return RS.Inst.fromGenome(g2); };
  if (h === 'A') inv('att', Math.max(.002, t), v => Q('att', v).att); else if (h === 'D') { inv('dec', Math.max(.05, t - P.att), v => Q('dec', v).dec); inv('sus', lvl, v => Q('sus', v).sus); }
  else if (h === 'R') inv('rel', Math.max(.03, t - P.att - P.dec - .3), v => Q('rel', v).rel); else if (h === 'S') inv('sus', lvl, v => Q('sus', v).sus);
  else if (h[0] === 'b') { const out = (r - g.R0) / g.H, base = h === 'b1' ? .5 : h === 'b2' ? (1 + P.sus) / 2 : P.sus * .5; C.editGene(Sf, c, 'curve', clamp(.5 + (out - base) * (h === 'b1' ? -1.6 : 1.6), 0, .9999)); }
  else if (h === 'F') { C.editGene(Sf, c, 'fenv', clamp(.3 + ((r - g.F.RF) / g.F.Fu) / 4, 0, .9999)); C.editGene(Sf, c, 'fdec', clamp(Math.pow(clamp(tf * 1.5 / 1.42, 0, 1), 1 / 1.5), 0, .9999)); } };
E.twist = (Sf, c, dAng) => RS.Creature.editGene(Sf, c, 'cut', clamp(c.g[RS.IG.cut] + dAng / Math.PI * .5, 0, .9999));
E.register = (Sf, c, dir) => { RS.Creature.editGene(Sf, c, 123, clamp((c.g[123] || .5) + dir * .25, 0, .9999)); c.mind = null; };   // 123 = register/range gene (mind regOct)
E.vibrato = (Sf, c, rev, speed) => { RS.Creature.editGene(Sf, c, 'lfoP', clamp(rev / 8, 0, .9999)); RS.Creature.editGene(Sf, c, 'lfoR', clamp(speed / 2.5, 0, .9999)); };
// strokes: count direction reversals of the stroke's projection across the body (only strokes that stay near the body)
E.strokeVibrato = (c, pts) => { if (pts.length < 6) return null; const R = RS.Creature.radius(c) * 2.4 + 20; if (pts.some(p => Math.hypot(p[0] - c.x, p[1] - c.y) > R)) return null; let rev = 0, last = 0;
  for (let i = 2; i < pts.length; i++) { const d = pts[i][0] - pts[i - 2][0]; const s = Math.abs(d) < 1 ? 0 : Math.sign(d); if (s && last && s !== last) rev++; if (s) last = s; } return rev >= 3 ? rev : null; };
// a rate-limited preview note while a control is being dragged / twisted; a pinch previews the register step it would take
const PV = new WeakMap(); E.preview = (Sf, c, gap = .26) => { const t = Sf.now ? Sf.now() : 0, l = PV.get(c); if (l != null && t - l < gap && t >= l) return false; PV.set(c, t); E.note(Sf, c); return true; };
E.regOf = (c, g1) => { const m = c.mind; return clamp(Math.round(-1 + g1 * 2.2 + (1 - clamp((c.P.size || 20) / 40, 0, 1)) * .9), -1, 2) - (m && m.perc > .6 ? 1 : 0); };
E.previewReg = (Sf, c, dir) => { const m = c.mind; if (!m || !RS.Mind) return false; const g0 = c.g[123] == null ? .5 : c.g[123], d = E.regOf(c, clamp(g0 + dir * .25, 0, .9999)) - E.regOf(c, g0), ro = m.regOct; m.regOct = ro + d; try { RS.Mind.play(Sf, c, { deg: 0, d: 4, vel: .7, s: 0 }, Sf.now() + .02, m.bpm / 60 * 4); } finally { m.regOct = ro; } return true; };
E.note = (Sf, c) => { const m = c.mind; if (!m || !RS.Mind) return; RS.Mind.play(Sf, c, { deg: 0, d: 4, vel: .8, s: 0 }, Sf.now() + .02, m.bpm / 60 * 4); };
})(typeof window !== 'undefined' ? window : globalThis);
