'use strict';
/* v0.7 B CONDUCTING (#7). Two fingers held still ~0.6 s on open ground raise the baton (app.js decides the gesture; this module is the
   headless-testable musical side). While it is up every ohm that was in view turns to look at the baton point and waits (held almost still by
   the calm guard's settle cap). One-finger strokes then conduct instead of drawing:
   - BEATS (up/down strokes away from ohms): the bottoms of the strokes are the beats, the UPSTROKE between them is the upbeat (Wilbow);
     the beat period sets the tempo (snapped to the synced steps of F4) for the conducted ohms and their jams.
   - HEIGHT: the stroke's height on screen sets loudness (high = louder, low = softer) while the baton is up.
   - SWEEP: a stroke that passes THROUGH ohms cues exactly those (F5: only strokes that cross ohms cue).
   - CUT-OFF: a sharp flick down silences the conducted ohms until they are cued again or released.
   Release (fingers lift, or 6 s with no conducting stroke): everyone is free; the jam keeps the conducted tempo and slowly drifts back toward
   its own if members disagree (F5). Only on-screen ohms take part (rule J): nothing here runs when no baton is up, except a cheap drift tick
   once a second for ohms that were conducted. */
(function (G) { const RS = G.RS; const Cd = RS.Conduct = {};
Cd.TIMEOUT = 6; Cd.STEPS = [.5, 2 / 3, .75, 1, 4 / 3, 1.5, 2];
const inView = (Sf, c) => { const v = Sf.view; return !v || (c.x > v.x0 && c.x < v.x1 && c.y > v.y0 && c.y < v.y1); };
Cd.raise = (Sf, at) => { if (Sf.baton) return Sf.baton; const now = Sf.now(), ms = Sf.creatures.filter(c => !c.dead && !c.caught && !c.grabbed && !c.leaving && inView(Sf, c));
  const B = Sf.baton = { at, t0: now, last: now, members: ms, vol: 1, beats: [], cut: false, strokes: 0 };
  for (const c of ms) { c.batonOn = true; c.tempoHome = c.tempoHome != null ? c.tempoHome : (c.mind ? c.mind.bpmPref || c.mind.bpmT : null); }
  if (Sf.fx) Sf.fx({ k: 'ripple', x: at[0], y: at[1], col: [255, 245, 220], dur: .9 }); if (Sf.blip) Sf.blip(at[0], at[1], 523, .05, .25, { force: true }); Sf.stats.baton = (Sf.stats.baton || 0) + 1; return B; };
Cd.tick = Sf => { const B = Sf.baton, now = Sf.now(); if (B) { if (now - B.last > Cd.TIMEOUT) return Cd.release(Sf, 'timeout');
    for (const c of B.members) { if (c.dead) continue; c.settleT = now; if (B.tempo && c.mind && Math.abs(c.mind.bpmT - B.tempo) > .01) Cd.setTempo(c, B.tempo); const dx = B.at[0] - c.x, dy = B.at[1] - c.y, d = Math.hypot(dx, dy) || 1; c.batonLook = [dx / d, dy / d]; } return; }
  if (Sf.frame % 30 || !Sf.conducted) return; const done = new Set();   // F5 after release: keep the conducted tempo, drift slowly back toward the members' own tempos where they disagree
  for (const c of Sf.conducted) { const m = c.mind; if (!m || c.dead || c.tempoHome == null || done.has(c)) continue; const E = m.E, ms = E ? E.members.filter(o => o.mind) : [c], homes = ms.map(o => o.tempoHome != null ? o.tempoHome : o.mind.bpmPref || o.mind.bpm), home = homes.reduce((a, b) => a + b, 0) / homes.length;
    ms.forEach(o => done.add(o)); const cur = E ? E.bpmBase || m.bpmT : m.bpmT, nx = Math.abs(home - cur) < .6 ? home : cur + (home - cur) * .025; Cd.setTempo(c, nx); if (nx === home) for (const o of ms) o.tempoHome = null; }
  Sf.conducted = Sf.conducted.filter(c => c.tempoHome != null && !c.dead); };
Cd.setTempo = (c, t, pref = true) => { const m = c.mind; if (!m) return; m.bpmT = t; if (m.E) { m.E.bpmBase = t; if (pref) for (const o of m.E.members) if (o.mind) o.mind.bpmPref = t; const L = c.jam && c.jam.leader && c.jam.leader.mind; if (L) L.bpmT = t; } };
Cd.release = (Sf, why = 'lift') => { const B = Sf.baton; if (!B) return null; Sf.baton = null; for (const c of B.members) { c.batonOn = false; c.batonLook = null; c.batonVol = null; c.batonCut = false; c.settleT = null; if (!B.tempo) c.tempoHome = null; }
  if (B.tempo) Sf.conducted = (Sf.conducted || []).concat(B.members.filter(c => c.tempoHome != null)); B.why = why; Sf.lastBaton = B; return B; };
// a conducting stroke (world points + times in ms, and the stroke's mean SCREEN height 0 top .. 1 bottom)
Cd.stroke = (Sf, pts, times, hy = .5) => { const B = Sf.baton; if (!B || pts.length < 2) return null; B.last = Sf.now(); B.strokes++; const n = pts.length, dur = Math.max(.02, (times[n - 1] - times[0]) / 1000);
  const P = Sf.P, up = p => { const th = P.theta(p[0], p[1]); return [Math.sin(th), -Math.cos(th)]; }, u = up(pts[0]), h = p => (p[0] - pts[0][0]) * u[0] + (p[1] - pts[0][1]) * u[1], sd = p => (p[0] - pts[0][0]) * -u[1] + (p[1] - pts[0][1]) * u[0];
  // cut-off: short, fast, mostly downward
  const drop = -h(pts[n - 1]), side = Math.abs(sd(pts[n - 1])); if (dur < .28 && drop > 70 && drop > side * 1.5) { B.cut = true; for (const c of B.members) c.batonCut = true; if (Sf.blip) Sf.blip(pts[n - 1][0], pts[n - 1][1], 196, .05, .12, { force: true }); return { k: 'cut' }; }
  // sweep: the ohms the stroke passes through
  const hit = B.members.filter(c => !c.dead && pts.some(p => Math.hypot(p[0] - c.x, p[1] - c.y) < RS.Creature.radius(c) + 18));
  if (hit.length) { for (const c of hit) { c.batonCut = false; c.batonCue = Sf.now(); if (Sf.fx) Sf.fx({ k: 'bloom', c, col: c.col, dur: .6 }); if (c.mind && RS.Mind) RS.Mind.play(Sf, c, { deg: 0, d: .3, vel: .55 * (c.batonVol || 1), manual: true }, Sf.now() + .02, 1); } return { k: 'cue', ids: hit.map(c => c.id) }; }
  // beats: local minima of height (bottoms) are beats; maxima between them are the upbeats (the upstroke)
  const hs = pts.map(h), bot = [], tops = []; for (let i = 1; i < n - 1; i++) { if (hs[i] <= hs[i - 1] && hs[i] < hs[i + 1]) bot.push(times[i]); if (hs[i] >= hs[i - 1] && hs[i] > hs[i + 1]) tops.push(times[i]); }
  if (hs[n - 1] < hs[n - 2]) bot.push(times[n - 1]); const range = Math.max(...hs) - Math.min(...hs); if (range < 30) return null;
  B.beats = B.beats.concat(bot.map(t => t / 1000)).slice(-6); B.ups = (B.ups || 0) + tops.length; let per = null; if (B.beats.length >= 2) { const iv = B.beats.slice(1).map((t, i) => t - B.beats[i]).filter(x => x > .2 && x < 2); if (iv.length) per = iv.reduce((a, b) => a + b, 0) / iv.length; }
  if (!per && tops.length && bot.length) per = Math.abs(bot[bot.length - 1] - tops[0]) / 1000 * 2; if (!per) per = dur;   // one down-up: the upstroke is half a beat
  B.vol = RS.clamp(1.45 - hy * .9, .55, 1.4); for (const c of B.members) c.batonVol = B.vol;
  const bpm = RS.clamp(60 / per, 48, 190), base = Sf.M && Sf.M.bpm ? Sf.M.bpm : 96, ratio = bpm / base, step = Cd.STEPS.reduce((a, s) => Math.abs(Math.log(s / ratio)) < Math.abs(Math.log(a / ratio)) ? s : a, 1), tgt = RS.clamp(base * step, 48, 190);
  B.tempo = tgt; for (const c of B.members) Cd.setTempo(c, tgt);
  return { k: 'beat', bpm: Math.round(tgt), step, vol: B.vol, beats: bot.length, ups: tops.length }; };
Cd.draw = (ctx, Sf) => { const B = Sf.baton; if (!B) return; const t = Sf.now(), [x, y] = B.at, k = .5 + .5 * Math.sin(t * 4);   // the raised baton: a soft glow at the two fingers + faint threads to each waiting ohm
  ctx.strokeStyle = RS.Render.css([255, 245, 220], .18 + .1 * k); ctx.lineWidth = 1.5; for (const c of B.members) { if (c.dead) continue; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(c.x, c.y); ctx.stroke(); }
  const gr = ctx.createRadialGradient(x, y, 0, x, y, 30); gr.addColorStop(0, RS.Render.css([255, 250, 230], .5)); gr.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 30, 0, 6.283); ctx.fill();
  if ((B.strokes || 0) < 1) { const u = (t - B.t0) % 2.4 / 2.4, ph = u * 6.283, gx = x + 90 + (u < .5 ? 0 : 0), gy = y - 70 + Math.cos(ph) * 50, g2 = ctx.createRadialGradient(gx, gy, 0, gx, gy, 14); g2.addColorStop(0, RS.Render.css([255, 250, 230], .5)); g2.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = g2; ctx.beginPath(); ctx.arc(gx, gy, 14, 0, 6.283); ctx.fill(); }   // L: a ghost fingertip beats down-UP until the first stroke
  if ((B.strokes || 0) < 2 && B.members.length && (t - B.t0) % 4.8 > 2.4) { const a = B.members[0], b = B.members[B.members.length - 1], u = ((t - B.t0) % 2.4) / 2.4, gx = a.x + (b.x - a.x) * u, gy = a.y + (b.y - a.y) * u - 6, g3 = ctx.createRadialGradient(gx, gy, 0, gx, gy, 14); g3.addColorStop(0, RS.Render.css([255, 250, 230], .4)); g3.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = g3; ctx.beginPath(); ctx.arc(gx, gy, 14, 0, 6.283); ctx.fill(); } };   // L: ... and once sweeps through the ohms
})(typeof window !== 'undefined' ? window : globalThis);
