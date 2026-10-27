'use strict';
// v0.3.2 BODY PLANS. Every ohm has one of seven plans: blob, shell, serpent, strider, drum-belly, cluster, floater.
// The plan comes from the genes it already has (segments, symmetry, limbs, stiffness, buoyancy, float style) plus its
// instrument identity, so the body can be read: a kick is a round heavy drum-belly with a skin that ripples when it hits,
// a hat bristles with small spikes, a snare carries rattling feelers, a pad trails soft fronds, a bass hangs a heavy keel.
// Appendages are real: limbs are physics rods typed by where they sit (down = legs, up = feelers, sides = fins / arms),
// spikes / feelers / fronds / plates / fins / tail are drawn on the body and move with its notes and its breath.
// Movement follows the plan (striders walk, serpents swim, drum-bellies and shells are heavy and slow, floaters drift).
// It never touches sound or f0: only shape fields (segments, radial, aspect, outline harmonics, limb length) are nudged.
(function (G) {
const RS = G.RS, TAU = Math.PI * 2, cl = (v, a, b) => Math.max(a, Math.min(b, v));
const B = RS.Body = { PLANS: ['blob', 'shell', 'serpent', 'strider', 'drum-belly', 'cluster', 'floater'] };
// what the voice looks like (instrument identity -> look), independent of the live jam role
B.look = (P, g) => { const I = P.inst || {}, d = I.dk && g && RS.Inst.drumType ? RS.Inst.drumType(g) : I.drum;   /* v0.8 drums: the body still follows the gene drum (the drum set only changes the sound; keeps bodies + physics as before) */ if (d === 'hat') return 'hat'; if (d === 'snare') return 'snare'; if (d === 'kick' || d === 'tom' || d === 'kit') return 'kick';
  if (((I.att || 0) > .3 && (I.sus || 0) > .6) || (RS.Inst && RS.Inst.isTex && RS.Inst.isTex(I))) return 'pad'; if ((P.f0 || 220) < 130) return 'bass'; return 'lead'; };
B.choose = (P, look) => { const sc = { blob: .5,
    'drum-belly': look === 'kick' ? 2 : (P.mass > 1.6 && P.size > 36 ? .9 : 0),
    cluster: P.radial && P.symN >= 5 ? 1.2 : 0,
    serpent: !P.radial && (P.segments >= 3 || P.aspect > 1.7) ? 1 + (P.segments - 3) * .1 : 0,
    strider: P.limbs >= 4 && P.limbLen > .95 ? 1.1 : 0,
    shell: P.stiff > .8 && P.pressure > .9 ? 1.15 : 0,
    floater: P.style === 'float' && P.buoy > .4 ? 1.3 : 0 };
  let best = 'blob'; for (const k in sc) if (sc[k] > sc[best]) best = k; return best; };
B.plan = (g, P) => { const look = B.look(P, g), plan = B.choose(P, look), app = [];
  // gentle geometry for the plan (shape only)
  if (plan === 'drum-belly') { P.radial = false; P.segments = 1; P.aspect = .9 + (P.aspect - .6) / 1.1 * .2; P.headBulge *= .3; if (!g.shaped) P.harm = P.harm.map(h => ({ a: h.a * .4, ph: h.ph })); }   /* v0.4a: lumps pushed / pulled in the clay stay (only the random baseline is smoothed) */   /* limbs are left alone: strands drawn in the clay always become limbs */
  else if (plan === 'serpent') { P.radial = false; P.segments = Math.max(3, P.segments); P.aspect = Math.max(P.aspect, 1.15); }
  else if (plan === 'strider') P.limbLen = Math.max(P.limbLen, 1.1);
  else if (plan === 'shell') { if (!g.shaped) P.harm = P.harm.map(h => ({ a: h.a * .5, ph: h.ph })); P.aspect = Math.max(P.aspect, 1.1); }
  // appendages: plan-wide ones, then the voice's own
  if (plan === 'drum-belly') app.push({ k: 'band' }); if (plan === 'shell') app.push({ k: 'plates', n: 3 }); if (plan === 'serpent') app.push({ k: 'fins' });
  if (plan === 'cluster') app.push({ k: 'bubbles', n: Math.min(7, P.symN) }); if (plan === 'floater') app.push({ k: 'fronds', n: 4, len: 1.3 });
  if (look === 'hat') app.push({ k: 'spikes', n: 7 + Math.round((P.spiky || .5) * 4), len: .32 });
  else if (look === 'snare') app.push({ k: 'feelers', n: 2, len: .9, bead: true });
  else if (look === 'pad' && plan !== 'floater') app.push({ k: 'fronds', n: 3, len: 1 });
  else if (look === 'bass') app.push({ k: 'keel' });
  else if (look === 'kick' && plan !== 'drum-belly') app.push({ k: 'band' });
  if (P.tail > 0 && plan !== 'drum-belly') app.push({ k: 'tail', len: P.tail });   // gene 17/18: a tail (was expressed, never built)
  const heavy = plan === 'drum-belly' || look === 'bass' ? 1 : plan === 'shell' ? .7 : look === 'hat' ? 0 : .3;
  return { plan, look, app, heavy }; };
// limb typing from where the limb sits on the body (screen angle, y down) and the plan
B.limbKind = (Bd, ang) => { const s = Math.sin(ang), p = Bd ? Bd.plan : 'blob';
  if (p === 'cluster') return 'tentacle'; if (p === 'floater') return s > -.3 ? 'tentacle' : 'feeler';
  if (s < -.45) return 'feeler'; if (s > .45) return p === 'serpent' ? 'fin' : 'leg'; return p === 'serpent' || p === 'floater' ? 'fin' : p === 'strider' ? 'leg' : 'arm'; };
// movement: how the plan carries it (a strength factor on its steering force, and the hop share)
B.move = (c, inWater, grounded) => { const Bd = c.P.body; if (!Bd) return { k: 1, hop: 1 }; const p = Bd.plan, legs = c.limbs.filter(r => r.meta && r.meta.kind === 'leg').length, fins = c.limbs.filter(r => r.meta && r.meta.kind === 'fin').length;
  let k = 1, hop = 1; if (p === 'strider') { k = grounded ? 1.2 : .9; hop = .5; } else if (p === 'serpent') k = inWater ? 1.25 : 1.05; else if (p === 'floater') { k = .85; hop = .4; } else if (p === 'drum-belly') { k = .8; hop = .6; } else if (p === 'shell') { k = .85; hop = .7; }
  if (grounded) k *= 1 + Math.min(4, legs) * .04; if (inWater) k *= 1 + Math.min(4, fins) * .05; return { k, hop }; };
// ---- v0.6.1 AERIAL KITS (cloud / gas worlds): gene-derived, never stored (old saves just get one), sound untouched ----
// bladder: buoyant / floater / cluster / drum-belly genes -> a gas sac above the body, smooth drifting; wings: limbs + long limbs (jets, striders) -> two membranes
// that beat on the body's own pulse; sail: long aspect / pad look / shells -> a tall fin-sail, gliding sideways; fins: serpents and swimmers keep fins (ripple swim).
B.AIR = ['bladder', 'wings', 'sail', 'fins'];
B.air = P => { if (P._air) return P._air; const Bd = P.body || {}, pl = Bd.plan, sc = { bladder: (P.buoy || 0) * 1.2 + (pl === 'floater' || pl === 'cluster' || pl === 'drum-belly' ? .5 : 0) + (P.style === 'float' ? .4 : 0),
    wings: (P.limbs || 0) >= 2 && pl !== 'serpent' ? .3 + (P.limbLen || 0) * .5 + (P.style === 'jet' ? .3 : 0) + (pl === 'strider' ? .3 : 0) : 0,
    sail: Math.max(0, (P.aspect || 1) - 1) * 1.5 + (Bd.look === 'pad' ? .4 : 0) + (pl === 'shell' ? .4 : 0), fins: pl === 'serpent' ? 1.2 : P.style === 'swim' ? .8 : .2 };
  let k = 'fins'; for (const q of B.AIR) if (sc[q] > sc[k]) k = q; Object.defineProperty(P, '_air', { value: k, enumerable: false, writable: true }); return k; };
// movement in cloud: returns a force multiplier for the creature's own wish (calmGuard still caps every ohm)
B.airMove = (c, ph) => { const k = B.air(c.P), s = Math.sin(ph); if (k === 'bladder') return [.8, .8]; if (k === 'wings') { const beat = .35 + 1.5 * Math.max(0, s); return [beat, beat]; } if (k === 'sail') return [1.15, .45]; return [1.2 * (.5 + .5 * s) + .3, 1.2 * (.5 + .5 * s) + .3]; };
B.drawAir = (ctx, Sf, c, css, col, col2, a) => { const P = Sf.P; if (!P || !P.gas || !c.P || !c.segs.length) return; const z = (Sf.view && Sf.view.z) || 1; if (z < .3) return; const k = B.air(c.P), R0 = RS.Creature.radius(c), d = Math.hypot(c.x - P.cx, c.y - P.cy) || 1, ux = (c.x - P.cx) / d, uy = (c.y - P.cy) / d, tx = -uy, ty = ux;
  const ph = Sf.now() * (c.P.mFreq || 1) * Math.PI * 2 * (c.tempo || 1), hit = B.hit(Sf, c), x = c.x, y = c.y; ctx.lineWidth = 1.2;
  if (k === 'bladder') { const r = R0 * (.8 + .06 * Math.sin(ph) + .1 * hit), bx = x + ux * (R0 * .9 + r * .8), by = y + uy * (R0 * .9 + r * .8); ctx.strokeStyle = css(col2, .5 * a); ctx.beginPath(); ctx.moveTo(x + ux * R0 * .7, y + uy * R0 * .7); ctx.lineTo(bx - ux * r * .8, by - uy * r * .8); ctx.stroke();
    ctx.fillStyle = css(col2, (.18 + .15 * hit) * a); ctx.beginPath(); ctx.ellipse(bx, by, r * 1.05, r * .85, Math.atan2(ty, tx), 0, Math.PI * 2); ctx.fill(); ctx.stroke(); return; }
  if (k === 'wings') { const fl = Math.sin(ph) * .7 + hit * .3; for (const sd of [-1, 1]) { const rx = x + tx * sd * R0 * .6, ry = y + ty * sd * R0 * .6, sp = R0 * 1.9, ex = rx + (tx * sd * Math.cos(fl) + ux * Math.sin(fl)) * sp, ey = ry + (ty * sd * Math.cos(fl) + uy * Math.sin(fl)) * sp;
      ctx.fillStyle = css(col2, .3 * a); ctx.strokeStyle = css(col2, .65 * a); ctx.beginPath(); ctx.moveTo(rx + ux * R0 * .3, ry + uy * R0 * .3); ctx.quadraticCurveTo(ex + ux * R0 * .5, ey + uy * R0 * .5, ex, ey); ctx.quadraticCurveTo((rx + ex) / 2 - ux * R0 * .4, (ry + ey) / 2 - uy * R0 * .4, rx - ux * R0 * .3, ry - uy * R0 * .3); ctx.closePath(); ctx.fill(); ctx.stroke(); } return; }
  if (k === 'sail') { const h = R0 * (1.7 + .2 * hit), lean = Math.sin(ph * .5) * .25, bx = x + ux * R0 * .6, by = y + uy * R0 * .6, ex = bx + (ux + tx * lean) * h, ey = by + (uy + ty * lean) * h;
    ctx.fillStyle = css(col, .28 * a); ctx.strokeStyle = css(col2, .7 * a); ctx.beginPath(); ctx.moveTo(bx - tx * R0 * .7, by - ty * R0 * .7); ctx.quadraticCurveTo(ex - tx * h * .4, ey - ty * h * .4, ex, ey); ctx.lineTo(bx + tx * R0 * .7, by + ty * R0 * .7); ctx.closePath(); ctx.fill(); ctx.stroke(); return; }
  const w = Math.sin(ph) * .4; ctx.fillStyle = css(col2, .35 * a); for (const sd of [-1, 1]) { const rx = x + tx * sd * R0 * .9, ry = y + ty * sd * R0 * .9, ex = rx + tx * sd * R0 * .8 - ux * R0 * (.5 + w), ey = ry + ty * sd * R0 * .8 - uy * R0 * (.5 + w); ctx.beginPath(); ctx.moveTo(rx + ux * R0 * .3, ry + uy * R0 * .3); ctx.lineTo(ex, ey); ctx.lineTo(rx - ux * R0 * .3, ry - uy * R0 * .3); ctx.closePath(); ctx.fill(); } };
// ---- drawing (called from render after the body is filled) ----
const per = (W, b, ang) => { const [cx, cy] = W.center(b), ca = Math.cos(ang), sa = Math.sin(ang); let best = b.idx[0], bd = -2; for (const i of b.idx) { const dx = W.x[i] - cx, dy = W.y[i] - cy, d = Math.hypot(dx, dy) || 1, dot = (dx * ca + dy * sa) / d; if (dot > bd) { bd = dot; best = i; } } return [W.x[best], W.y[best], cx, cy]; };
B.hit = (Sf, c) => { const tn = Sf.now(), t = c.pulseT != null ? c.pulseT : c.noteT; return t != null && tn >= t ? Math.max(0, 1 - (tn - t) / .35) : 0; };
B.crowd = (gap, R0) => Math.max(0, Math.min(1, (R0 * 1.6 - gap) / (R0 * 1.6)));   // 0 = room, 1 = bodies touching
  B.draw = (ctx, Sf, c, css, col, col2, a) => { const Bd = c.P.body, W = Sf.W; if (!Bd || !c.segs.length) return; const head = c.segs[0]; if (!head.idx || head.idx.length < 3) return;
  const tn = Sf.now(), hit = B.hit(Sf, c), R0 = c.P.size * c.growth, br = Math.sin(tn * 1.3 + (c.P.patSeed % 7)), ok = v => isFinite(v);
  const [hx, hy] = W.center(head); if (!ok(hx) || !ok(hy)) return;
  /* v0.4a: tight jams - bubbles and fronds tuck in and fade when a neighbour's body is close, so they no longer lie over the neighbour */
  let gap = 1e9; for (const [o, d] of (c.near || [])) if (o && !o.dead && o.P) gap = Math.min(gap, d - R0 - o.P.size * (o.growth || 1)); const crowd = B.crowd(gap, R0); ctx.save(); ctx.lineCap = 'round';
  for (const ap of Bd.app) switch (ap.k) {
    case 'spikes': { ctx.strokeStyle = css(col2, .85 * a); ctx.lineWidth = 1.5; for (let k = 0; k < ap.n; k++) { const ang = -Math.PI / 2 + (k - (ap.n - 1) / 2) * (Math.PI * 1.25 / ap.n), [x, y, cx, cy] = per(W, head, ang), dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1, L = R0 * ap.len * (1 + .7 * hit) * (k % 2 ? .75 : 1); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dx / d * L, y + dy / d * L); ctx.stroke(); } break; }
    case 'feelers': { ctx.strokeStyle = css(col2, .8 * a); ctx.lineWidth = 1.3; for (let k = 0; k < ap.n; k++) { const sd = k ? 1 : -1, [x, y] = per(W, head, -Math.PI / 2 + sd * .45), L = R0 * ap.len, wob = Math.sin(tn * 9 + k) * hit * 4, tx = x + sd * L * .45 + wob, ty = y - L; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + sd * L * .1, y - L * .7, tx, ty); ctx.stroke(); if (ap.bead) { ctx.fillStyle = css(col, .9 * a); ctx.beginPath(); ctx.arc(tx, ty, 2 + 1.5 * hit, 0, TAU); ctx.fill(); } } break; }
    case 'fronds': { ctx.strokeStyle = css(col, .35 * a * (1 - .5 * crowd)); ctx.lineWidth = 3; for (let k = 0; k < ap.n; k++) { const ang = Math.PI / 2 + (k - (ap.n - 1) / 2) * .45, [x, y] = per(W, head, ang), L = R0 * ap.len * (1 - .55 * crowd); ctx.beginPath(); ctx.moveTo(x, y); for (let j = 1; j <= 5; j++) { const f = j / 5; ctx.lineTo(x + Math.sin(tn * 1.2 + k * 1.7 + f * 3) * (3 + 4 * f) * (1 + hit), y + L * f); } ctx.stroke(); } break; }
    case 'band': { const r = R0 * .62 * (1 + .1 * hit); ctx.strokeStyle = css(col2, (.5 + .4 * hit) * a); ctx.lineWidth = 2.6; ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.stroke(); ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(hx, hy, r * .55, 0, TAU); ctx.stroke(); if (Bd.plan === 'drum-belly') { ctx.lineWidth = 4; for (const sd of [-1, 1]) { const [x, y] = per(W, head, Math.PI / 2 + sd * .55); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sd * 2, y + R0 * .22 * (1 - .4 * hit)); ctx.stroke(); } } break; }
    case 'plates': { ctx.strokeStyle = css(col2, .55 * a); ctx.lineWidth = 1.8; for (let k = 0; k < ap.n; k++) { ctx.beginPath(); ctx.arc(hx, hy, R0 * (.42 + .2 * k), Math.PI * 1.12, Math.PI * 1.88); ctx.stroke(); } break; }
    case 'bubbles': { ctx.fillStyle = css(col, .45 * a * (1 - .6 * crowd)); for (let k = 0; k < ap.n; k++) { const ang = k / ap.n * TAU + tn * .2, rr = R0 * (1.18 - .36 * crowd + .06 * br); ctx.beginPath(); ctx.arc(hx + Math.cos(ang) * rr, hy + Math.sin(ang) * rr, R0 * (.16 + .08 * hit) * (1 - .45 * crowd), 0, TAU); ctx.fill(); } break; }
    case 'fins': { ctx.fillStyle = css(col2, .5 * a); for (const s of c.segs) { if (!s.idx || s.idx.length < 3) continue; const [x1, y1] = per(W, s, -Math.PI / 2 - .5), [x2, y2] = per(W, s, -Math.PI / 2 + .5), [xt, yt, cx, cy] = per(W, s, -Math.PI / 2), h = R0 * .35 * (1 + .3 * hit); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(xt + (xt - cx) * .1, yt - h); ctx.lineTo(x2, y2); ctx.closePath(); ctx.fill(); } break; }
    case 'keel': { ctx.strokeStyle = css(col2, .7 * a); ctx.lineWidth = 3.5; const [x, y] = per(W, head, Math.PI / 2); ctx.beginPath(); ctx.moveTo(x - R0 * .45, y - 2); ctx.quadraticCurveTo(x, y + R0 * .3 * (1 + .2 * hit), x + R0 * .45, y - 2); ctx.stroke(); break; }
    case 'tail': { const last = c.segs[c.segs.length - 1], [lx, ly] = W.center(last); let dx = lx - hx, dy = ly - hy, d = Math.hypot(dx, dy); if (d < 1) { const w = c.want || [1, 0]; dx = -w[0] || -1; dy = -w[1] * .3; d = Math.hypot(dx, dy) || 1; } dx /= d; dy /= d; const [bx, by] = per(W, last, Math.atan2(dy, dx)), L = R0 * ap.len * .8, sw = Math.sin(tn * 2.2 + br) * L * .25 * (1 + hit);
      ctx.fillStyle = css(col2, .7 * a); ctx.beginPath(); ctx.moveTo(bx - dy * 4, by + dx * 4); ctx.quadraticCurveTo(bx + dx * L * .6 - dy * sw, by + dy * L * .6 + dx * sw, bx + dx * L - dy * sw * 1.4, by + dy * L + dx * sw * 1.4); ctx.lineTo(bx + dy * 4, by - dx * 4); ctx.closePath(); ctx.fill(); break; }
  }
  ctx.restore(); };
// limb tips by kind (after the rod stroke): feet, fin webs, tentacle curls, feeler beads
B.limbTip = (ctx, Sf, c, r, css, col, col2, a) => { const W = Sf.W, k = r.meta && r.meta.kind, n = r.idx.length; if (!k || n < 2) return; const i1 = r.idx[n - 1], i0 = r.idx[n - 2], x = W.x[i1], y = W.y[i1], dx = x - W.x[i0], dy = y - W.y[i0], d = Math.hypot(dx, dy) || 1; if (!isFinite(x) || !isFinite(y)) return; const hit = B.hit(Sf, c);
  if (k === 'leg') { ctx.fillStyle = css(col2, .9 * a); ctx.beginPath(); ctx.ellipse(x, y, 3.2 + 1.5 * hit, 2, 0, 0, TAU); ctx.fill(); }
  else if (k === 'fin') { ctx.fillStyle = css(col, .45 * a); const r0 = r.idx[0]; ctx.beginPath(); ctx.moveTo(W.x[r0], W.y[r0]); ctx.lineTo(x - dy / d * 5, y + dx / d * 5); ctx.lineTo(x + dy / d * 5, y - dx / d * 5); ctx.closePath(); ctx.fill(); }
  else if (k === 'tentacle') { ctx.strokeStyle = css(col2, .7 * a); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x + dx / d * 3, y + dy / d * 3, 3 + hit * 2, 0, Math.PI * 1.4); ctx.stroke(); }
  else if (k === 'feeler') { ctx.fillStyle = css(col, .9 * a); ctx.beginPath(); ctx.arc(x, y, 2.2 + 1.4 * hit, 0, TAU); ctx.fill(); } };
})(typeof window !== 'undefined' ? window : globalThis);
