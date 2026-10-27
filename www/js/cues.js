'use strict';
// VISIBLE ROLES (v0.3.1): who plays what, at a glance. No text, no ripples: glows + body cues only. RS.Cues.of() is a pure, deterministic
// mapping (state -> cue numbers, tested); RS.Cues.draw() renders it cheaply (a few radial gradients / short strokes per ohm).
//  note        every note lights the ohm at that moment: brightness ~ velocity, length ~ note length; silent ohms rest unlit
//  bass        deep low glow pooled at its base, thumping on the downbeat
//  melody      a brighter crown glow on top, flickering with each melody note
//  chords      body glow in the jam's tint, hue shifted by the CURRENT CHORD (all chord ohms change colour together = the progression)
//  percussion  a sharp rim flash on each hit
//  beat-setter a small pendulum swaying at the jam's tempo
//  stepping back dims + settles lower; listening (newcomer / curious) leans toward the source; asleep = curled, dim, slow breathing glow
//  jam         members share a soft tint ring that breathes on the downbeat; a newcomer's tint blends in while it listens
//  register    low ohms sit heavier (wider, lower), high ohms lighter + more upright; everyone bobs gently on the shared beat
// v0.3.1 CUES (harmonic brains; read off c.cue = {k, t, dur, dir}): each is a body sign, never text
//  nod         head dips + a quick lean toward the band: "change coming"           fill   rapid rim flicker (drummer's fill)
//  walk        the bass glow climbs from its base to its chest (walk-up)           swell  the whole body swells + an outgoing ring (chorus)
//  drop        sinks + dims for the breakdown                                      again  two small hops ("one more time")
//  hold        rises and holds a bright crown (ending: held note, ritard)          pass / take  leans toward the next soloist; the crown fades out / in
//  layout      leans back + dims (lays out to listen)                              rejoin a short bright pop at the top of a phrase
//  listen      leans toward the music, still                                       ask    a bystander leans in hard + a flicker of the jam tint (silent)
//  joining     the jam tint flows in (a ring closing onto the body)                mute / unmute  dims + a closing glow / an opening glow
//  settle      a warm flash; while settled the jam tint warms with the groove score and a faint glow pools on the ground under the band
//  glow        (C11) a settled jam crossed by an ink line just glows
//  key         (v0.3.2) rises + swells while the jam tint turns: "we change key"; the tint stays turned until the band comes home
(function (G) { const RS = G.RS, Cu = RS.Cues = {}; const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), TAU = Math.PI * 2;
Cu.hueShift = (col, k) => { const a = k * TAU / 7; const r = col[0], g = col[1], b = col[2], c = Math.cos(a), s = Math.sin(a), M = [.299 + .701 * c + .168 * s, .587 - .587 * c + .33 * s, .114 - .114 * c - .497 * s, .299 - .299 * c - .328 * s, .587 + .413 * c + .035 * s, .114 - .114 * c + .292 * s, .299 - .3 * c + 1.25 * s, .587 - .588 * c - 1.05 * s, .114 + .886 * c - .203 * s];
  return [clamp(M[0] * r + M[1] * g + M[2] * b, 0, 255) | 0, clamp(M[3] * r + M[4] * g + M[5] * b, 0, 255) | 0, clamp(M[6] * r + M[7] * g + M[8] * b, 0, 255) | 0]; };
Cu.of = (c, tn) => { const m = c.mind || {}, role = m.role || 'solo', q = { role, glow: 0, crown: 0, base: 0, rim: 0, tint: null, chordCol: null, sway: null, dim: 0, lean: 0, curl: 0, breath: 0, bobY: 0, squash: 0, sx: 1, sy: 1, jamTint: null, jamA: 0 };
  const nt = c.noteT, nd = Math.max(.08, c.noteDur || .2), age = nt != null ? tn - nt : 1e9; const on = age >= 0 && age < nd + .12; const fade = on ? (age < nd ? 1 - .5 * age / nd : .5 * (1 - (age - nd) / .12)) : 0;
  q.glow = on ? clamp(c.noteVel || .5, .1, 1) * fade : 0;                               // exact note sync
  const ph = m.pos != null ? ((m.pos % 4) + 4) % 4 / 4 : 0, L = m.groups ? m.groups.reduce((a, b) => a + b, 0) : 16, down = m.pos != null && ((m.pos % L) + L) % L < 2, beat = Math.pow(1 - ph, 4);
  if (role === 'bass') q.base = .35 + .65 * (down ? beat : beat * .35);
  if (role === 'melody' || role === 'solo' || role === 'answer') q.crown = role === 'melody' ? .35 + .65 * q.glow : .5 * q.glow;
  if (role === 'comp' && m.curRoot != null) q.chordCol = Cu.hueShift(c.jam && c.jam.col ? c.jam.col : c.col || [200, 200, 200], m.curRoot);
  if (role.startsWith('pulse') && age >= 0 && age < .09) q.rim = 1 - age / .09;
  if (m.E && m.E.leader === c && (m.perc > .55 || m.lead > .55)) q.sway = Math.sin((m.pos || 0) / 4 * Math.PI) * .5;   // pendulum at the shared tempo (one swing per beat)
  if ((m.back || 0) > .3) q.dim = clamp(m.back, 0, .8) * .6;
  if (role === 'listen' || c.curious) q.lean = 1;
  if (c.doze || (c.sleep || 0) > .5) { q.curl = 1; q.dim = Math.max(q.dim, .45); q.breath = .5 + .5 * Math.sin(tn * TAU / 4); }
  if (c.jam) { q.jamTint = c.jam.col; q.jamA = (role === 'listen' ? .4 : 1) * (.08 + .1 * (down ? beat : beat * .3)); }
  const reg = (m.regOct || 0) + (m.oct || 0); q.sx = 1 + clamp(-reg, 0, 1) * .06; q.sy = 1 - clamp(-reg, 0, 1) * .05; q.lift = clamp(reg, 0, 2) * 1.5;   // register posture: low = wider + heavier, high = sits lighter / higher
  const amp = (c.bob || 0) * (m.perc > .55 ? 1.2 : 1); q.bobY = amp * 2.2; q.squash = amp * .035 * (q.curl ? .3 : 1);
  // harmonic-brain chord colour (the chord the ohm believes / proposes)
  if (role === 'comp' && m.hb && m.hb.cur) q.chordCol = Cu.hueShift(c.jam && c.jam.col ? c.jam.col : c.col || [200, 200, 200], m.hb.cur.r != null ? m.hb.cur.r : 0);
  const E = m.E; if (E && E.phase === 'settled' && c.jam) { const w = clamp(((E.score || .7) - .5) * 2, 0, 1); q.jamTint = Cu.mix(c.jam.col, [255, 188, 120], .45 * w); q.ground = .05 + .07 * w * (down ? .6 + .4 * beat : .6); }
  if (E && E.keyArea && q.jamTint) q.jamTint = Cu.hueShift(q.jamTint, 1.2);   // v0.3.2: while the band is in another key its shared tint is turned
  if (c.bystander) { q.lean = .7; q.leanDir = c.watchDir || 1; q.dim = Math.max(q.dim, .15); }
  if (c.muted) { q.dim = Math.max(q.dim, .5); q.jamA *= .3; q.glow *= .3; }
  const k = c.cue; if (k && tn >= k.t && tn - k.t < k.dur) { const u = (tn - k.t) / k.dur, env = Math.sin(Math.PI * u), dir = k.dir || q.leanDir || 1; q.cue = k.k; q.cueU = u;
    switch (k.k) {
      case 'nod': q.bobY += 3.2 * Math.sin(Math.PI * clamp(u * 2, 0, 1)); q.lean = Math.max(q.lean, .6 * env); q.leanDir = dir; break;
      case 'fill': q.rim = Math.max(q.rim, (Math.sin(u * 24) > 0 ? .8 : .2) * env); break;
      case 'walk': q.base = Math.max(q.base, .7); q.walkU = u; break;
      case 'swell': q.swell = env; break;
      case 'drop': q.dim = Math.max(q.dim, .45 * env); q.bobY += 4 * env; break;
      case 'again': q.lift = (q.lift || 0) + 5 * Math.abs(Math.sin(u * TAU)); break;
      case 'hold': q.lift = (q.lift || 0) + 4 * env; q.crown = Math.max(q.crown, .9 * env); break;
      case 'pass': q.lean = Math.max(q.lean, env); q.leanDir = dir; q.crown *= 1 - u; break;
      case 'take': q.crown = Math.max(q.crown, u); break;
      case 'layout': q.dim = Math.max(q.dim, .4 * env); q.lean = Math.max(q.lean, .6 * env); q.leanDir = -dir; break;
      case 'rejoin': q.pop = env; break;
      case 'listen': q.lean = Math.max(q.lean, .8); break;
      case 'ask': q.lean = Math.max(q.lean, 1.4 * env); q.askA = env; break;
      case 'joining': q.ring = { r0: 2.6, r1: 1.2, u, a: .35 * (1 - u * .5), col: (c.jam && c.jam.col) || [255, 220, 170] }; break;
      case 'mute': q.ring = { r0: 1.8, r1: .3, u, a: .3 * (1 - u), col: [200, 210, 255] }; break;
      case 'unmute': q.ring = { r0: .4, r1: 1.9, u, a: .3 * (1 - u), col: [255, 240, 210] }; break;
      case 'settle': q.warmFlash = env; break;
      case 'glow': q.glow = Math.max(q.glow, .7 * env); break;
      case 'key': q.lift = (q.lift || 0) + 3 * env; q.swell = Math.max(q.swell || 0, .6 * env); q.keyU = env; break;   // v0.3.2: rises + swells, the jam tint turns ("new key")
      case 'full': q.lean = Math.max(q.lean, .4 * Math.sin(u * TAU * 3)); break; } }
  return q; };
Cu.mix = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
Cu.css = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// body transform for the whole ohm (bob + squash + register posture + settle / curl); call before drawing the body
Cu.begin = (ctx, c, q, R) => { ctx.save(); const bx = c.x, by = c.y + R; ctx.translate(bx, by + q.bobY + q.dim * 3 - (q.lift || 0)); const sw = 1 + .07 * (q.swell || 0); ctx.scale(sw * q.sx * (1 + q.squash) * (q.curl ? 1.06 : 1), sw * q.sy * (1 - q.squash) * (q.curl ? .86 : 1)); if (q.lean && ctx.transform) ctx.transform(1, 0, -.1 * clamp(q.lean, 0, 1.5) * (q.leanDir || 1), 1.006, 0, 0); ctx.translate(-bx, -by); if (q.dim) ctx.globalAlpha *= 1 - q.dim * .6; };
Cu.end = ctx => ctx.restore();
Cu.draw = (ctx, c, q, R, col) => { const glo = (x, y, r, cc, a) => { if (a <= .003) return; const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, Cu.css(cc, a)); g.addColorStop(1, Cu.css(cc, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); };
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  if (q.jamTint) glo(c.x, c.y, R * 1.9, q.jamTint, q.jamA);
  if (q.chordCol) glo(c.x, c.y, R * 1.5, q.chordCol, .22);
  if (q.glow) glo(c.x, c.y, R * (1.3 + .5 * q.glow), col, .28 * q.glow);
  if (q.base) { ctx.save(); ctx.translate(c.x, c.y + R * .9); ctx.scale(1.6, .45); glo(0, 0, R, [col[0] * .45, col[1] * .35, col[2] * .6 + 40], .32 * q.base); ctx.restore(); }
  if (q.crown) glo(c.x, c.y - R * 1.05, R * .7, [255, 248, 220], .35 * q.crown);
  if (q.rim) { ctx.strokeStyle = Cu.css([255, 255, 255], .7 * q.rim); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, R * 1.08, 0, TAU); ctx.stroke(); }
  if (q.breath) glo(c.x, c.y, R * 1.3, col, .06 + .06 * q.breath);
  if (q.ground) { ctx.save(); ctx.translate(c.x, c.y + R * 1.35); ctx.scale(2.6, .32); glo(0, 0, R * 1.2, q.jamTint || col, q.ground); ctx.restore(); }
  if (q.warmFlash) glo(c.x, c.y, R * 2.2, [255, 190, 120], .2 * q.warmFlash);
  if (q.swell) { ctx.strokeStyle = Cu.css(q.jamTint || col, .25 * q.swell); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(c.x, c.y, R * (1.3 + q.cueU * 1.4), 0, TAU); ctx.stroke(); }
  if (q.walkU != null) glo(c.x, c.y + R * (.9 - 1.3 * q.walkU), R * .7, [col[0] * .5, col[1] * .4, col[2] * .6 + 60], .3);
  if (q.pop) glo(c.x, c.y, R * 1.6, [255, 255, 255], .18 * q.pop);
  if (q.askA && c.bystander && c.bystander.col) glo(c.x, c.y, R * 1.6, c.bystander.col, .16 * q.askA * (.6 + .4 * Math.sin(q.cueU * 30)));
  if (q.ring) { const g = q.ring, rr = R * (g.r0 + (g.r1 - g.r0) * g.u); ctx.strokeStyle = Cu.css(g.col, g.a); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(c.x, c.y, Math.max(1, rr), 0, TAU); ctx.stroke(); glo(c.x, c.y, Math.max(2, rr), g.col, g.a * .4); }
  if (q.sway != null) { const a = q.sway, x0 = c.x + R * .55, y0 = c.y - R * .7; ctx.strokeStyle = Cu.css(col, .8); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.sin(a) * R * .6, y0 - Math.cos(a) * R * .6); ctx.stroke(); }
  ctx.restore(); };
})(typeof window !== 'undefined' ? window : globalThis);
