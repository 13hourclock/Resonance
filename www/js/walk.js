'use strict';
/* v0.7 K WALK IN AN OHM'S SHOES (Wilbow approved 12:50 AM MDT Oct 23; built last). Play mode grows: entry unchanged (tap-then-hold an ohm).
   1 MOVE: a thumb on EMPTY screen on the left half raises a floating stick (a soft world-drawn glow, only while touched). It sets the ohm's
     wish to move (want / wantMag), and the ohm's own muscles do the moving (crawl, walk, swim, float or fly: C.forces, same caps, guards on).
     A flick up = jump (grounded) or rise (floaters, fliers, swimmers in water). Its own behaviour (C.think's steering) is off while driven.
   2 PLAY: the right side (and every node / handle / tube anywhere) is play mode as before. The stick pointer is taken out of the gesture
     recogniser, so the other hand plays nodes at the same time.
   3 SENSES (cheap: whole-screen overlays + a per-note sound filter, rule J): the camera already follows; sounds are heard from the ohm (gain
     falls off past its hearing range, pan from its side); blind = dark world + echo rings at real sound events (8 pooled slots); deaf = a
     muffled mix (high partials dropped, softer) + a gentle shake and a haptic tick on loud nearby sounds; night eyes = the dark lifts at night
     (others see the night darker); energy / mood = a soft vignette + a heartbeat haptic (haptics kept as they are).
   4 HOLISTIC: walking into a jam (near a member) makes it a member (H.invite) with its own identity; what you play is its playing (D / E
     count it like any member's notes). On exit it resumes as itself.
   5 EXIT: pinch in (as before) or Android back. Only one ohm is driven at a time. Side-on view (the existing camera). */
(function (G) { const RS = G.RS; const Wk = RS.Walk = {}; const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Wk.STICK_R = 70; Wk.DEAD = .12; Wk.JUMP = 300; Wk.RISE = 170; Wk.JCOOL = .6; Wk.RINGS = 8;
const C = () => RS.Creature;
Wk.start = (Sf, s) => { if (!s || !s.c) return null; if (Sf.drive && Sf.drive.c !== s.c) Wk.stop(Sf); const c = s.c; c.driven = true; const G0 = Sf.mods && (Sf.mods.guide = Sf.mods.guide || {});
  const first = G0 ? (G0.walkN || 0) < 3 : false; if (G0) G0.walkN = (G0.walkN || 0) + 1;
  Sf.drive = { c, s, stick: null, t0: Sf.now(), jumpT: -9, joinT: -9, rings: Array.from({ length: Wk.RINGS }, () => ({ t: -9, x: 0, y: 0, g: 0 })), ri: 0, shake: 0, beatT: Sf.now(), demo: first, moved: 0 };
  Sf.stats.walkEnter = (Sf.stats.walkEnter || 0) + 1; return Sf.drive; };
Wk.stop = Sf => { const D = Sf.drive; if (!D) return; D.c.driven = false; D.c.want = [0, 0]; D.c.wantMag = 0; Sf.drive = null; };
// may a touch at screen (sx, sy) become the stick? left half, empty (not a node / handle / tube / envelope node / the ohm itself)
Wk.claim = (App, sx, sy) => { const Sf = App.Sf, s = App.play; if (!Sf || !s || !Sf.drive || sx > App.Wd * .5) return false; if (RS.EnvEdit && RS.EnvEdit.hit(App, sx, sy)) return false;
  const w = RS.Render.toWorld(App.cam, App.Wd, App.Ht, sx, sy); return Wk.emptyAt(Sf, s, w[0], w[1]); };
Wk.emptyAt = (Sf, s, wx, wy) => { if (RS.Play.hit(Sf, s, wx, wy)) return false; const c = s.c, R = C().radius(c); return Math.hypot(wx - c.x, wy - c.y) > R * 1.25; };
Wk.stickDown = (Sf, sx, sy, t, th) => { const D = Sf.drive; if (!D) return null; D.stick = { x0: sx, y0: sy, x: sx, y: sy, th: th || 0, hist: [[sx, sy, t]], flicked: false }; D.demo = false; return D.stick; };
Wk.stickMove = (Sf, sx, sy, t) => { const D = Sf.drive, k = D && D.stick; if (!k) return null; k.x = sx; k.y = sy; k.hist.push([sx, sy, t]); while (k.hist.length > 2 && t - k.hist[0][2] > 120) k.hist.shift();
  const h0 = k.hist[0], dt = (t - h0[2]) / 1000, vy = dt > .02 ? (sy - h0[1]) / dt : 0; if (!k.flicked && vy < -1100 && h0[1] - sy > 35) { k.flicked = true; Wk.jump(Sf); } else if (vy > -300) k.flicked = false; return k; };
Wk.stickUp = Sf => { const D = Sf.drive; if (!D || !D.stick) return null; D.stick = null; return true; };
Wk.vec = D => { const k = D.stick; if (!k) return [0, 0, 0]; let dx = (k.x - k.x0) / Wk.STICK_R, dy = (k.y - k.y0) / Wk.STICK_R; const m = Math.hypot(dx, dy); if (m < Wk.DEAD) return [0, 0, 0]; if (m > 1) { dx /= m; dy /= m; } const c = Math.cos(k.th), s = Math.sin(k.th); return [dx * c - dy * s, dx * s + dy * c, Math.min(1, m)]; };
const grounded = (Sf, c) => (c.bodies || c.segs).some(b => b.idx.some(i => Sf.W.fl[i] & 8));
Wk.jump = Sf => { const D = Sf.drive; if (!D) return null; const c = D.c, tn = Sf.now(); if (tn - D.jumpT < Wk.JCOOL) return null; const G0 = Sf.W.grav, ux = c.x - G0.cx, uy = c.y - G0.cy, d = Math.hypot(ux, uy) || 1;
  const st = c.P.style || '', wet = Sf.waterNear && Sf.waterNear(c.x, c.y, C().radius(c) + 6) > 4, flier = /^air|float|jet/.test(st) || (st === 'swim' && wet);
  let v = 0, kind = null; if (grounded(Sf, c)) { v = Wk.JUMP * ((Sf.env.g || 900) < 600 ? 1.3 : 1) * (.7 + .3 * (c.P.burst == null ? .5 : c.P.burst)); kind = 'jump'; } else if (flier) { v = Wk.RISE; kind = 'rise'; } if (!kind) return null;
  D.jumpT = tn; C().impulse(Sf, c, ux / d * v, uy / d * v); Sf.stats.walkJumps = (Sf.stats.walkJumps || 0) + 1; return kind; };
// C.think: a driven ohm still updates its position, then its wish comes from the stick (none = stand); its own steering is skipped
const th0 = C().think; C().think = (Sf, c, dt) => { if (!c.driven || !Sf.drive || Sf.drive.c !== c) return th0(Sf, c, dt); const [x, y] = C().center(Sf, c); c.x = x; c.y = y; const [vx, vy, m] = Wk.vec(Sf.drive); c.want = [vx, vy]; c.wantMag = m * (.75 + .25 * c.activity); if (m) Sf.drive.moved += m * dt; };
// C.forces: the calm hold (meant for an ohm that is playing still) must not brake the player's walking
const fo0 = C().forces; C().forces = (Sf, c, t) => { if (!c.driven || !Sf.drive || !Sf.drive.stick) return fo0(Sf, c, t); const cm = c.calm; c.calm = null; try { return fo0(Sf, c, t); } finally { c.calm = cm; } };
// play-mode wrappers: entering starts driving, leaving stops it (every exit path goes through Pm.exit)
const en0 = RS.Play.enter, ex0 = RS.Play.exit; RS.Play.enter = (Sf, c) => { const s = en0(Sf, c); if (s) Wk.start(Sf, s); return s; }; RS.Play.exit = (Sf, s) => { if (Sf.drive && (!s || Sf.drive.c === s.c)) Wk.stop(Sf); return ex0(Sf, s); };
// once per frame (Sf.step, only while driving): walking into a jam joins it; heartbeat haptic
Wk.tick = Sf => { const D = Sf.drive; if (!D) return; const c = D.c, tn = Sf.now(); if (c.dead || c.caught) { Wk.stop(Sf); return; }
  if (!c.jam && tn - D.joinT > 1 && RS.Harm && RS.Harm.invite && c.mind) { D.joinT = tn; const R = C().radius(c); const near = Sf.creatures.some(o => o !== c && o.jam && !o.dead && Math.hypot(o.x - c.x, o.y - c.y) < R + C().radius(o) + 70); if (near && RS.Harm.invite(Sf, c) && c.jam) { Sf.stats.walkJoin = (Sf.stats.walkJoin || 0) + 1; D.joined = c.jam; } }
  const md = c.mind && c.mind.mood, ar = md ? md.a : .5; const bpm = 54 + 60 * clamp(ar * .6 + (1 - c.energy) * .4, 0, 1); if (tn - D.beatT > 60 / bpm) { D.beatT = tn; D.beat = tn; if (RS.haptic && c.energy < .35) RS.haptic(10); } D.shake *= .9; };
// every sound while driving is heard from the ohm (called by Sf.play before the voice is made)
Wk.hear = (Sf, spec, x, y) => { const D = Sf.drive; if (!D || x == null) return spec; const c = D.c, SE = c.P.sense || {}, hr = SE.hearR || 200, d = Math.hypot(x - c.x, y - c.y);
  if (spec.src !== c && !spec.manual && d > hr) spec.gain = (spec.gain || .1) * Math.max(.12, hr / d); spec.pan = clamp((x - c.x) / (hr * 1.2) + (spec.panAdd || 0) * .5, -1, 1);
  if (SE.deaf) { spec.modes = (spec.modes || []).filter((m, i) => i === 0 || m.f < 700); spec.gain *= .55; if (spec.send != null) spec.send *= .5; if (d < hr && spec.gain > .05) { D.shake = Math.min(1, D.shake + spec.gain * 4); if (RS.haptic) RS.haptic(8); } }
  if (SE.blind && d < hr * 1.5) { const tn = Sf.now(), last = D.rings[(D.ri + Wk.RINGS - 1) % Wk.RINGS]; if (tn - last.t > .12) { const r = D.rings[D.ri]; r.t = tn; r.x = x; r.y = y; r.g = clamp(spec.gain * 6, .25, 1); D.ri = (D.ri + 1) % Wk.RINGS; } }
  return spec; };
Wk.night = (Sf, c) => (c.P.beh && c.P.beh.night > .6) || ((c.P.sense || {}).ir > .6);
// screen-space senses (after the world is drawn). No text.
Wk.draw = (ctx, Sf, App, Wd, Ht, dpr) => { const D = Sf.drive; if (!D) return; const c = D.c, SE = c.P.sense || {}, tn = Sf.now(), day = Sf.day == null ? 1 : Sf.day, css = (col, a) => 'rgba(' + col.join(',') + ',' + a + ')';
  const intro = clamp(1 - (tn - D.t0) / 2.5, 0, 1), pulse = intro * (.5 + .5 * Math.sin((tn - D.t0) * 7));   // L: the senses pulse briefly on entry
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (D.shake > .02) ctx.translate(Math.sin(tn * 53) * D.shake * 3, Math.cos(tn * 47) * D.shake * 2);
  if (SE.blind) { ctx.fillStyle = css([4, 4, 10], .8 - .25 * pulse); ctx.fillRect(-10, -10, Wd + 20, Ht + 20); ctx.restore(); ctx.save(); if (RS.Render) RS.Render.apply(ctx, App.cam, Wd, Ht, dpr); ctx.lineWidth = 2 / App.cam.z;
    for (const r of D.rings) { const u = (tn - r.t) / 1.1; if (u < 0 || u > 1) continue; ctx.strokeStyle = css([210, 225, 255], .7 * r.g * (1 - u)); ctx.beginPath(); ctx.arc(r.x, r.y, 10 + u * 120, 0, 6.283); ctx.stroke(); }
    ctx.restore(); ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
  else if (day < .5) { if (Wk.night(Sf, c)) { ctx.globalCompositeOperation = 'screen'; ctx.fillStyle = css([90, 140, 110], (.5 - day) * .45 + .1 * pulse); ctx.fillRect(0, 0, Wd, Ht); ctx.globalCompositeOperation = 'source-over'; } else { ctx.fillStyle = css([0, 0, 8], (.5 - day) * .7); ctx.fillRect(0, 0, Wd, Ht); } }
  if (SE.deaf) { ctx.fillStyle = css([200, 200, 210], .08 + .08 * pulse); ctx.fillRect(0, 0, Wd, Ht); }   // the muffled world looks a little hazy
  { const low = clamp(1 - c.energy, 0, 1), bt = D.beat ? clamp(1 - (tn - D.beat) / .35, 0, 1) : 0, a = .12 + low * .35 + bt * .08 * low + .2 * pulse, R0 = Math.min(Wd, Ht) * .45, R1 = Math.hypot(Wd, Ht) * .6;
    const gr = ctx.createRadialGradient(Wd / 2, Ht / 2, R0, Wd / 2, Ht / 2, R1); gr.addColorStop(0, css([0, 0, 0], 0)); gr.addColorStop(1, css(c.mind && c.mind.mood && c.mind.mood.v < .35 ? [20, 10, 40] : [10, 6, 2], a)); ctx.fillStyle = gr; ctx.fillRect(0, 0, Wd, Ht); }
  if (D.stick) { const k = D.stick, [vx, vy] = [(k.x - k.x0), (k.y - k.y0)], m = Math.hypot(vx, vy), q = m > Wk.STICK_R ? Wk.STICK_R / m : 1;   // the stick: a soft glow, only while touched
    ctx.fillStyle = css([255, 248, 230], .12); ctx.beginPath(); ctx.arc(k.x0, k.y0, Wk.STICK_R, 0, 6.283); ctx.fill(); ctx.fillStyle = css([255, 250, 235], .35); ctx.beginPath(); ctx.arc(k.x0 + vx * q, k.y0 + vy * q, 22, 0, 6.283); ctx.fill(); }
  else if (D.demo) { const u = ((tn - D.t0) % 3) / 3, ax = Wd * .2, ay = Ht * .72, ox = Math.sin(u * 6.283) * 40, oy = u > .7 ? -Math.sin((u - .7) / .3 * Math.PI) * 50 : 0;   // L: ghost thumb (circle, then a flick up) + a ghost finger on a node
    ctx.fillStyle = css([255, 248, 230], .1); ctx.beginPath(); ctx.arc(ax, ay, Wk.STICK_R, 0, 6.283); ctx.fill(); ctx.fillStyle = css([255, 250, 235], .4); ctx.beginPath(); ctx.arc(ax + ox, ay + oy, 20, 0, 6.283); ctx.fill();
    const o = D.s.nodes && D.s.nodes[Math.floor(u * 4) % Math.max(1, D.s.nodes.length)]; if (o) { const [px, py] = RS.Play.pos(Sf, D.s, o), cs = App.cam, cth = Math.cos(-cs.th), sth = Math.sin(-cs.th), dx = px - cs.x, dy = py - cs.y, sx = Wd / 2 + (dx * cth - dy * sth) * cs.z, sy = Ht * .58 + (dx * sth + dy * cth) * cs.z, ph = Math.sin(((u * 4) % 1) * Math.PI);
      ctx.fillStyle = css([255, 250, 235], .45 * ph); ctx.beginPath(); ctx.arc(sx, sy, 14, 0, 6.283); ctx.fill(); } }
  ctx.restore(); };
})(typeof window !== 'undefined' ? window : globalThis);
