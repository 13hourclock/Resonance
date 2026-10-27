'use strict';
// PLAY MODE (v0.3): play ONE creature like an instrument, gesture-only. Enter: tap then press-and-hold on a creature (a "tap-hold"; a plain
// hold stays hold-to-listen/speak). Its own scale is laid out as glowing nodes around its body (+ limb tips one octave up); percussive
// creatures show hit pads by hit family. Tweaks live on the same surface: fin = cutoff, antenna = vibrato, sac = formant/body send (radial)
// + glottal glide (vertical), horn = register, strings = detune; the halo = amp envelope (RS.EnvEdit, reused), its inner node = filter env.
// Vocal creatures (tract gene > 0) show a soft throat TUBE: along = tongue position, across = tongue diameter, lip node = lip opening,
// throat node = tenseness/breathiness, nose flap = velum, a shake over the tube = vocal vibrato. Edits are LEARNED (epigenetic): the birth
// DNA is kept (c.code0); offspring inherit the learned values. Play the same phrase twice -> it adopts it as its motif.
// Exit: pinch out, or a fast swipe away from the creature.
(function (G) { const RS = G.RS; const Pm = RS.Play = {}; const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), TAU = Math.PI * 2;
Pm.FX = ['fin', 'antenna', 'sac', 'horn', 'strings']; Pm.ANG = { fin: 0, antenna: -Math.PI / 2, horn: Math.PI, strings: Math.PI * .25, sac: Math.PI * .5 };
Pm.VX0 = () => ({ tu: 0, td: 0, lip: 1, vel: 0, tense: 0, glide: 0, vib: 0 });
Pm.vocalAmt = c => (c.P.tract ? c.P.tract.amt : 0);
Pm.enter = (Sf, c) => { if (!c || c.dead || c.caught) return null; if (!c.mind && RS.Mind) c.mind = RS.Mind.make(Sf, c); const s = { c, t0: Sf.now(), phrase: [], held: null, lastNode: null }; Sf.playFocus = c; Pm.layout(Sf, s); RS.Guide && RS.Guide.notify(Sf, 'enterPlay'); Sf.stats.playEnter = (Sf.stats.playEnter || 0) + 1; return s; };
Pm.exit = (Sf, s) => { if (Sf.playFocus === (s && s.c)) Sf.playFocus = null; if (s) RS.Guide && RS.Guide.notify(Sf, 'exitPlay'); if (s && s.held && s.held.id) RS.audio && RS.audio.send && RS.audio.send({ t: 'instOff', id: s.held.id }); return null; };
// layout (world coords relative to the creature, recomputed per frame: the body moves)
Pm.layout = (Sf, s) => { const c = s.c, m = Pm.mind(Sf, c), R = RS.Creature.radius(c), n = m.sys.cents.length, nodes = [];
  if ((c.P.inst.percK || 0) > .5) { const fam = ['bass', 'tone', 'slap', 'ghost']; fam.forEach((k, i) => { const a = -Math.PI * .9 + i / 3 * Math.PI * .8; nodes.push({ stroke: k, a, r: 1.45, deg: 0, pad: true }); }); }
  else { for (let d = 0; d <= n; d++) { const a = -Math.PI * 1.08 + d / n * Math.PI * 1.16; nodes.push({ deg: d, a, r: 1.4 }); } (c.limbs || []).forEach((L, k) => nodes.push({ deg: n + 1 + (k % n), limb: k })); }
  s.nodes = nodes; s.R = R; s.n = n; s.handles = Pm.FX.map(k => ({ k, a: Pm.ANG[k], r: k === 'sac' ? 1.05 : 2.05 })); s.tube = Pm.vocalAmt(c) > .02 ? { amt: Pm.vocalAmt(c) } : null; return s; };
Pm.pos = (Sf, s, o) => { const c = s.c; if (o.limb != null && c.limbs[o.limb]) { const L = c.limbs[o.limb], i = L.idx[L.idx.length - 1]; return [Sf.W.x[i], Sf.W.y[i]]; } return [c.x + Math.cos(o.a) * s.R * o.r, c.y + Math.sin(o.a) * s.R * o.r]; };
// the tube: from the throat (body centre, lower left) curving out to the lips
Pm.tubePt = (s, u) => { const c = s.c, R = s.R, a = Math.PI * .78 - u * .55, rr = R * (.35 + u * 1.25); return [c.x + Math.cos(a) * rr, c.y + Math.sin(a) * rr]; };
Pm.hit = (Sf, s, x, y) => { const R = s.R, tol = Math.max(12, R * .28); let best = null, bd = tol;
  for (const o of s.nodes) { const [px, py] = Pm.pos(Sf, s, o), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { kind: 'note', o }; } }
  for (const h of s.handles) { const [px, py] = Pm.pos(Sf, s, h), d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = { kind: 'tweak', h, x0: x, y0: y }; } }
  if (s.tube) { const lip = Pm.tubePt(s, 1), thr = Pm.tubePt(s, 0), nose = Pm.tubePt(s, .55); nose[1] -= R * .3;
    for (const [k, p] of [['lip', lip], ['throat', thr], ['nose', nose]]) { const d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = { kind: 'tract', part: k, x0: x, y0: y }; } }
    for (let u = .15; u <= .85; u += .05) { const p = Pm.tubePt(s, u), d = Math.hypot(p[0] - x, p[1] - y); if (d < bd) { bd = d; best = { kind: 'tract', part: 'tongue', x0: x, y0: y }; } } }
  return best; };
Pm.vel = (Sf, s, x, y) => { const d = clamp((Math.hypot(x - s.c.x, y - s.c.y) / s.R - .8) / 1.1, .25, 1); return RS.Force && RS.Force.real ? clamp(.5 * d + .5 * RS.Force.strength(d), .25, 1) : d; };   /* Q173b: real finger pressure joins in when the phone reports it */   // further out = louder + brighter
Pm.mind = (Sf, c) => { if (!c.mind || c.mind.g !== c.g) { c.mind = RS.Mind.make(Sf, c); c.mind.g = c.g; } return c.mind; };
Pm.note = (Sf, s, o, vel, from) => { const c = s.c, m = Pm.mind(Sf, c), deg = o.deg, f = RS.Mind.hz(Sf, m, deg); const spec = { deg, d: o.pad ? .4 : 2.4, vel, manual: true, stroke: o.pad ? o.stroke : null, perc: !!o.pad, from: from || 0 };
  RS.Mind.play(Sf, c, spec, Sf.now(), 1); s.lastNode = o; RS.Guide && RS.Guide.notify(Sf, 'tapNode'); s.lastF = f; if (!o.pad) { s.phrase.push(deg); if (s.phrase.length > 16) s.phrase.shift(); Pm.teach(Sf, s); } Sf.stats.playNotes = (Sf.stats.playNotes || 0) + 1; return spec; };
// teach-by-playing: the same 4..8-note phrase twice in a row -> its motif (learned, heritable)
// v08-voice: the big mouth reuses this path with o = { phrase: sung degrees, syl: one syllable per degree }; the second singing's syllables are kept (c.sung)
Pm.teach = (Sf, s, o) => { const p = o ? o.phrase : s.phrase; for (let L = 8; L >= 4; L--) { if (p.length < L * 2) continue; const a = p.slice(-2 * L, -L), b = p.slice(-L); if (a.join() === b.join()) { const c = s.c, mot = a.concat(a).slice(0, 8).map(d => clamp(d, -6, 9)); if (Sf.undoPush) Sf.undoPush({ k: 'motif', id: c.id, motif: c.motif.slice(), taught: c.taughtMotif || 0, sung: c.sung || null });
  c.motif = mot; if (c.mind) c.mind.motif = mot.slice(); c.taughtMotif = (c.taughtMotif || 0) + 1; c._sungI = 0; if (o && o.syl) { const sy = o.syl.slice(-L); c.sung = { deg: mot.slice(), syl: sy.concat(sy).slice(0, 8) }; o.phrase.length = 0; o.syl.length = 0; } else { c.sung = null; s.phrase = []; } Sf.fx({ k: 'learned', c, col: c.col, dur: 1.2, r: 36 }); return true; } } return false; };
Pm.down = (Sf, s, x, y) => { const h = Pm.hit(Sf, s, x, y); if (!h) return null; s.drag = h; if (h.kind === 'note') { const sp = Pm.note(Sf, s, h.o, Pm.vel(Sf, s, x, y)); s.held = { o: h.o, id: sp._id }; } return h; };
Pm.move = (Sf, s, x, y) => { const h = s.drag; if (!h) return false; const c = s.c;
  if (h.kind === 'note') { const k = Pm.hit(Sf, s, x, y); if (k && k.kind === 'note' && k.o !== h.o) { const prevF = s.lastF; if (s.held && s.held.id && RS.audio && RS.audio.send) RS.audio.send({ t: 'instOff', id: s.held.id }); const sp = Pm.note(Sf, s, k.o, Pm.vel(Sf, s, x, y), k.o.pad ? 0 : prevF); s.held = { o: k.o, id: sp._id }; h.o = k.o; } return true; }   // slide = legato glide
  const dx = x - h.x0, dy = y - h.y0, R = s.R; h.x0 = x; h.y0 = y; if (h.kind === 'tweak') { Pm.tweak(Sf, c, h.h.k, dx / R, dy / R, h); return true; }
  if (h.kind === 'tract') { Pm.tract(Sf, c, h.part, dx / R, dy / R, s, x, y); return true; } return false; };
Pm.up = (Sf, s) => { const h = s.drag; s.drag = null; if (s.held && s.held.id && RS.audio && RS.audio.send) RS.audio.send({ t: 'instOff', id: s.held.id }); s.held = null; if (h && h.kind !== 'note') { const o = s.nodes[Math.floor(s.nodes.length / 3)]; if (o) Pm.note(Sf, s, o, .6); } return h; };
// appendage tweaks -> learned gene values (C.editGene keeps the birth DNA in code0)
Pm.tweak = (Sf, c, k, dx, dy, h) => { const E = (n, d) => { const i = typeof n === 'number' ? n : RS.IG[n]; RS.Creature.editGene(Sf, c, n, clamp(c.g[i] + d, 0, .9999)); };
  h.rev = h.rev || 0; if (k === 'fin' && RS.Guide) RS.Guide.notify(Sf, 'fin'); if (k === 'fin') E('cut', (dx - dy) * .35);   // stroke the fin out/up = brighter
  else if (k === 'antenna') { const d = Math.hypot(dx, dy); if (Math.sign(dx) !== h.sx && Math.abs(dx) > .02) { h.rev++; h.sx = Math.sign(dx); } E('lfoP', d * .25 + (h.rev > 2 ? .02 : 0)); }   // pull / wiggle = vibrato depth
  else if (k === 'sac') { E('formant', dx * .3); if (Math.abs(dy) > .01) { if (Sf.undoPush) Sf.undoPush({ k: 'vx', id: c.id, i: 'vx', vx: c.voice ? Object.assign({}, c.voice) : null }); c.voice = c.voice || Pm.VX0(); c.voice.glide = clamp(c.voice.glide - dy * 4, -5, 5); } }
  else if (k === 'horn') { h.acc = (h.acc || 0) + dx - dy; if (Math.abs(h.acc) > .5) { E(123, Math.sign(h.acc) * -.25); h.acc = 0; c.mind = null; } }   // stretch the horn out = lower register
  else if (k === 'strings') E('inharm', dx * .25);   // pluck/draw the strings = tension / detune
  c.learned = (c.learned || 0) + 1; };
// vocal tract (learned offsets, c.voice; heritable). Low-vocal creatures: the tongue moves the instrument's formant layer instead.
Pm.tract = (Sf, c, part, dx, dy, s, x, y) => { if (Sf.undoPush) Sf.undoPush({ k: 'vx', id: c.id, i: 'vx', vx: c.voice ? Object.assign({}, c.voice) : null }); const v = c.voice = c.voice || Pm.VX0(); RS.Guide && RS.Guide.notify(Sf, 'tube'); if (part === 'tongue') { if ((c.P.tract.amt || 0) < .1) { RS.Creature.editGene(Sf, c, 'formant', clamp(c.g[RS.IG.formant] + (dx - dy) * .3, 0, .9999)); return; }
    v.tu = clamp(v.tu + (dx - dy) * .25, -.3, .3); v.td = clamp(v.td + (dx + dy) * .3, -.5, .5); if (Math.abs(dx) > .08) { const sg = Math.sign(dx); if (sg !== s.shSg) { s.shN = (s.shN || 0) + 1; s.shSg = sg; } if (s.shN > 4) { v.vib = clamp(v.vib + .05, 0, 1); } } }
  else if (part === 'lip') v.lip = clamp(v.lip + (dx - dy) * .6, .05, 1.4); else if (part === 'throat') v.tense = clamp(v.tense - dy * .5, -.4, .4); else if (part === 'nose') v.vel = clamp(v.vel - dy * .6, 0, .5);
  c.learned = (c.learned || 0) + 1; };
Pm.applyVX = (segs, vx) => { if (!vx) return segs; const out = []; for (const s of segs) { const q = Object.assign({}, s); if (q.v) q.v = [clamp(q.v[0] + vx.tu, .2, .8), clamp(q.v[1] * (1 + vx.td), 1.2, 3.4), clamp(q.v[2] * vx.lip, .05, 1.4)];
    if (vx.vib > .05 && !q.c && q.dur > .16) { const k = Math.max(2, Math.round(q.dur * 11)); for (let i = 0; i < k; i++) out.push(Object.assign({}, q, { dur: q.dur / k, f0: q.f0 ? q.f0 * (1 + (i % 2 ? -1 : 1) * vx.vib * .025) : q.f0 })); continue; } out.push(q); }
  if (vx.glide && out.length && out[out.length - 1].f0) out[out.length - 1].f0 *= Math.pow(2, vx.glide / 12); return out; };
Pm.childVX = (a, b) => { if (!a && !b) return null; const A = a || Pm.VX0(), B = b || Pm.VX0(), o = {}; for (const k in Pm.VX0()) o[k] = (A[k] + B[k]) / 2; return o; };   // epigenetic: offspring inherit the learned voice
// drawing (cheap: ~20 arcs)
Pm.draw = (ctx, Sf, s, z) => { const c = s.c, col = c.col || [220, 220, 255], css = RS.Render.css, t = Sf.now(); Pm.layout(Sf, s); const lw = 1.4 / z; ctx.lineWidth = lw;
  for (const o of s.nodes) { const [x, y] = Pm.pos(Sf, s, o), on = s.lastNode === o && s.held, r = (o.pad ? 9 : 6) / Math.sqrt(z) * (on ? 1.4 : 1), tonic = !o.pad && o.deg % s.n === 0; const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.4); g.addColorStop(0, css(RS.Render.mix(col, [255, 255, 255], .5), on ? .9 : .55)); g.addColorStop(1, css(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r * 2.4, 0, TAU); ctx.fill(); if (tonic || o.pad) { ctx.strokeStyle = css(col, .7); ctx.beginPath(); ctx.arc(x, y, r * 1.3, 0, TAU); ctx.stroke(); } }
  for (const h of s.handles) { const [x, y] = Pm.pos(Sf, s, h), r = 5 / Math.sqrt(z); ctx.strokeStyle = css([255, 230, 190], .5); ctx.beginPath(); if (h.k === 'fin') { ctx.moveTo(x - r, y - r * 2); ctx.quadraticCurveTo(x + r * 2, y, x - r, y + r * 2); } else if (h.k === 'antenna') { ctx.moveTo(x, y + r * 2); ctx.lineTo(x + Math.sin(t * 3) * r, y - r); ctx.arc(x + Math.sin(t * 3) * r, y - r * 1.6, r * .5, 0, TAU); } else if (h.k === 'horn') { ctx.moveTo(x + r * 2, y - r); ctx.lineTo(x - r * 2, y); ctx.lineTo(x + r * 2, y + r); } else if (h.k === 'strings') { for (let k = -1; k <= 1; k++) { ctx.moveTo(x - r * 2, y + k * r * .7); ctx.lineTo(x + r * 2, y + k * r * .7); } } else { ctx.ellipse(x, y, r * (1.6 + (c.g[RS.IG.formant] || .5)), r * 1.2, 0, 0, TAU); } ctx.stroke(); }
  if (s.tube) { const v = c.voice || Pm.VX0(); ctx.strokeStyle = css(col, .18 + .5 * s.tube.amt); ctx.lineCap = 'round'; for (let u = 0; u < 1; u += .1) { const a = Pm.tubePt(s, u), b = Pm.tubePt(s, u + .1), tongue = Math.exp(-(((u - (.5 + v.tu)) * 4) ** 2)); ctx.lineWidth = (3 + 6 * s.tube.amt) * (1 - tongue * (.4 + v.td)) * (u > .9 ? v.lip : 1) / Math.sqrt(z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    const nose = Pm.tubePt(s, .55); ctx.lineWidth = lw; ctx.beginPath(); ctx.arc(nose[0], nose[1] - s.R * .3 - v.vel * s.R * .4, 3 / Math.sqrt(z), 0, TAU); ctx.stroke(); } };
Pm.isExitSwipe = (s, x0, y0, x1, y1, dt) => { const d0 = Math.hypot(x0 - s.c.x, y0 - s.c.y), d1 = Math.hypot(x1 - s.c.x, y1 - s.c.y); return d1 - d0 > s.R * 3 && (d1 - d0) / Math.max(.05, dt) > s.R * 10; };
})(typeof window !== 'undefined' ? window : globalThis);
