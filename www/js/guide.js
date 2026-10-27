'use strict';
// TEACH WITHOUT TEXT (v0.3, small): on a new game a friendly GUIDE creature lives near the landing point. It is a normal creature (normal
// genes; can be caught, bred, deleted). It demonstrates ONE gesture at a time as a soft glowing ghost fingertip trace next to itself,
// waits until the player does it (detected from the real gesture results), answers with a happy phrase in its own voice, then shows
// the next. It never blocks anything and can be ignored; when all are learned the ghost fades for good (progress in Sf.mods.guide, saved).
(function (G) { const RS = G.RS; const Gd = RS.Guide = {};
Gd.STEPS = ['enterPlay', 'tapNode', 'fin', 'halo', 'tube', 'catch', 'teach', 'exitPlay', 'bond', 'undo'];   // then the two glyphs: infinity across two creatures, the hooked return arrow
Gd.state = Sf => (Sf.mods.guide = Sf.mods.guide || { step: 0, done: false, id: null });
Gd.genome = Sf => { let seed = RS.hash('guide', Sf.seed || 1), g = null; for (let k = 0; k < 40; k++) { const cand = RS.Genome.random(seed + k), P = RS.Genome.express(cand); if (P.tract && P.tract.amt > .3 && P.inst.percK < .3) { g = cand; break; } } return g || RS.Genome.random(seed); };
Gd.spawn = (Sf, pos) => { const st = Gd.state(Sf); if (st.id || st.done) return null; const g = Gd.genome(Sf);
  const x = pos ? pos[0] : 140, c = Sf.addCreature(g, x, pos ? pos[1] : Sf.ground(x) - 40, { distinct: true, growth: .8 });   /* v0.7 I: pos = near a random landing spot */ if (!c) return null; c.guide = true; st.id = c.id; return c; };
/* v0.8a O6/O2 (chunk 2): '?' (hook + a point under it) CALLS THE GUIDE. Alive and free: it flies in from the screen edge to the point (an off-screen guide
   is placed just outside the view first). Deleted or caught: it RE-HATCHES from its seed beside you (same genome, a new hatch; its lessons are not
   restarted, Q107). It answers with its phrase. The relations view around it is chunk 9 (v0.8c). Space views: App.qSprite (app.js). */
/* stab 0.8a8: every height test here is RADIAL (Sf.gnd): Sf.ground(x) is the top half of the planet only, so on the far side the guide was hatched /
   summoned to the planet's top, ~2R away. */
Gd.up = (Sf, x, y, pad) => Sf.gnd ? Sf.gnd(x, y, pad).lift() : [x, Math.min(y, Sf.ground(x) - pad)];
Gd.hatch = (Sf, x, y) => { const st = Gd.state(Sf), q = Gd.up(Sf, x, y, 30), c = Sf.addCreature(Gd.genome(Sf), q[0], q[1], { distinct: true, growth: .8 }); if (!c) return null; c.guide = true; st.id = c.id; return c; };
Gd.shift = (Sf, c, dx, dy) => { const W = Sf.W; for (const b of (c.bodies || c.segs)) for (const i of b.idx) { W.x[i] += dx; W.y[i] += dy; W.px[i] += dx; W.py[i] += dy; } c.x += dx; c.y += dy; };
Gd.summon = (Sf, x, y) => { const st = Gd.state(Sf); let g = Gd.guide(Sf), how = 'fly'; if (g && g.caught) g = null; Sf.stats = Sf.stats || {}; Sf.stats.summons = (Sf.stats.summons || 0) + 1; Gd.did(Sf, 'qmark');
  if (!g) { how = 'hatch'; g = Gd.hatch(Sf, x + 50, y); if (!g) return null; }
  else { const v = Sf.view; if (v && v.x0 != null && !(g.x > v.x0 && g.x < v.x1 && g.y > v.y0 && g.y < v.y1)) { const dx = g.x - x, dy = g.y - y, d = Math.hypot(dx, dy) || 1, Rv = Math.hypot(v.x1 - v.x0, v.y1 - v.y0) / 2 + 40, q = Gd.up(Sf, x + dx / d * Rv, y + dy / d * Rv, 40); Gd.shift(Sf, g, q[0] - g.x, q[1] - g.y); how = 'flyIn'; }   /* just outside the view, on the guide's side */
    const q = Gd.up(Sf, x, y, 20); g.summon = { x: q[0], y: q[1], t: Sf.now() }; }
  Gd.answer(Sf, g); return { k: 'guide', how, id: g.id }; };
/* stab 0.8a8 (Wilbow 11:41 'Make sure the helper is there'): every world has its guide. Once per world (launch, reload, a new planet), 1.5 s after it
   starts (so the ark / fresh-start spawns go first), a world with no guide hatches one near the view's centre. Caught counts as there. Deleted / eaten
   later in the session: '?' re-hatches it. App worlds only (headless test worlds untouched). */
Gd.ensure = (Sf, cx, cy) => { if (!Sf || Sf._gdOnce || Sf.headless || !Sf.mods || Sf.level === 'space') return null; if (Sf._gdT0 == null) { Sf._gdT0 = Sf.now(); return null; } if (Sf.now() - Sf._gdT0 < 1.5) return null; Sf._gdOnce = true;
  const st = Gd.state(Sf); if (st.id && Sf.creatures.some(c => c.id === st.id && !c.dead)) return null; const g = Gd.hatch(Sf, cx + 60, cy); if (g) { Sf.stats = Sf.stats || {}; Sf.stats.guideEnsure = (Sf.stats.guideEnsure || 0) + 1; } return g; };
Gd.guide = Sf => { const st = Gd.state(Sf); return st.id ? Sf.creatures.find(c => c.id === st.id && !c.dead) : null; };
/* v0.7 A + H.1: the EGG lessons come first on touch devices (Sf.eggOn, set by the app; headless worlds skip them): the spiral, then the 4 tier-1 egg
   words (taps, wave, circle, flick - each lesson ends when the player hatches that type), then the end-of-spiral hold (clay). Tiers 2/3 are not taught.
   Kept as their own counter (st.egg) so the old step numbers (and old saves) are unchanged. */
Gd.EGG = ['spiral', 'taps', 'wave', 'circle', 'flick', 'hold'];
Gd.eggPending = Sf => { const st = Gd.state(Sf); return !!Sf.eggOn && !st.done && (st.egg || 0) < Gd.EGG.length; };
Gd.answer = (Sf, g) => { if (g && g.mind && RS.Mind) { const n = g.mind.sys.cents.length; [0, 2, 4, n].forEach((d, k) => RS.Mind.play(Sf, g, { deg: d, d: .35, vel: .5, manual: true }, Sf.now() + .05 + k * .14, 1)); Sf.fx({ k: 'bloom', c: g, col: g.col, dur: .8 }); } };
// a real gesture happened: advance only on the CURRENT step (others are just play)
Gd.notify = (Sf, kind) => { if (!Sf || !Sf.mods) return false; const st = Gd.state(Sf); if (st.done) return false; const g = Gd.guide(Sf);
  if (Gd.eggPending(Sf)) { const w = Gd.EGG[st.egg || 0], hit = (w === 'spiral' && kind === 'egg') || (w === 'hold' && kind === 'clay') || kind === 'egg:' + w; if (!hit) return false; st.egg = (st.egg || 0) + 1; st.t = Sf.now(); Gd.answer(Sf, g); return true; }
  let want = Gd.STEPS[st.step];
  if (want === 'tube' && g && !(g.P.tract && g.P.tract.amt > .02)) { st.step++; want = Gd.STEPS[st.step]; }
  if (kind !== want) return false; st.step++; st.t = Sf.now(); if (g && g.mind && RS.Mind) { const n = g.mind.sys.cents.length; [0, 2, 4, n].forEach((d, k) => RS.Mind.play(Sf, g, { deg: d, d: .35, vel: .5, manual: true }, Sf.now() + .05 + k * .14, 1)); Sf.fx({ k: 'bloom', c: g, col: g.col, dur: .8 }); }
  if (st.step >= Gd.STEPS.length) st.done = true; return true; };
// ghost fingertip paths (relative to the guide, units of its radius), looped
const P = { enterPlay: [[0, 0, 0], [0, 0, .15, 'lift'], [0, 0, .3], [0, 0, 1]], tapNode: [[-1.4, -.3, 0], [-1.4, -.3, .4, 'lift'], [-.9, -1.1, .6], [-.9, -1.1, 1]], fin: [[2.05, -.4, 0], [3.2, -.9, 1]], halo: [[1.4, 1.2, 0], [2.4, 2, 1]],
  tube: [[-.3, .35, 0], [-1, 1.2, .5], [-.3, .35, 1]], catch: Array.from({ length: 13 }, (_, i) => [Math.cos(i / 12 * 6.283) * 2.6, Math.sin(i / 12 * 6.283) * 2.6, i / 12]), teach: [[1.8, 0, 0], [5, 0, 1]], exitPlay: [[-1.8, -1.8, 0], [-.5, -.5, 1], [-.5, -.5, 1.01, 'b'], [1.8, 1.8, 0], [.5, .5, 1]] };
const EP = { spiral: Array.from({ length: 25 }, (_, i) => { const u = i / 24, a = u * 3 * 6.283, r = .3 + 1.5 * u; return [2.6 + Math.cos(a) * r, -2.4 + Math.sin(a) * r, u]; }),
  taps: [[3, -2.4, 0], [3, -2.4, .12, 'lift'], [3, -2.4, .3], [3, -2.4, .42, 'lift'], [3, -2.4, .6], [3, -2.4, .72, 'lift'], [3, -2.4, .9], [3, -2.4, 1]],
  wave: Array.from({ length: 17 }, (_, i) => { const u = i / 16; return [1.4 + u * 3.2, -2.4 + Math.sin(u * 6.283 * 1.5) * .8, u]; }),
  circle: Array.from({ length: 17 }, (_, i) => { const u = i / 16, a = -1.57 + u * 6.283; return [3 + Math.cos(a) * 1.6, -2.4 + Math.sin(a) * 1.6, u]; }),
  flick: [[3, -2.4, 0], [3, -2.4, .4], [5.4, -4.2, .55], [5.4, -4.2, 1, 'lift']] };
EP.hold = EP.spiral.map(p => [p[0], p[1], p[2] * .6]).concat([[EP.spiral[24][0], EP.spiral[24][1], 1]]);
Gd.drawEgg = (ctx, Sf, g, st) => { const w = Gd.EGG[st.egg || 0], path = EP[w], R = RS.Creature.radius(g), t = (Sf.now() % 2.6) / 2.6, ex = g.x + 3 * R, ey = g.y - 2.4 * R;
  if (w !== 'spiral' && w !== 'hold') { ctx.fillStyle = RS.Render.css([255, 246, 228], .35); ctx.beginPath(); ctx.ellipse(ex, ey, 9, 11, 0, 0, 6.283); ctx.fill(); }   // a ghost egg to show where the word goes
  let a = null, b = null; for (let i = 0; i < path.length - 1; i++) if (!path[i + 1][3] && t >= path[i][2] && t <= path[i + 1][2]) { a = path[i]; b = path[i + 1]; break; } if (!a) return; const u = (t - a[2]) / Math.max(.001, b[2] - a[2]), x = g.x + (a[0] + (b[0] - a[0]) * u) * R, y = g.y + (a[1] + (b[1] - a[1]) * u) * R;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, RS.Render.css([255, 250, 230], .55)); gr.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.283); ctx.fill();
  if (w === 'hold' && t > .6) { const k = Math.min(1, (t - .6) / .3); ctx.strokeStyle = RS.Render.css([255, 255, 255], .6); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, 18, -1.571, -1.571 + k * 6.283); ctx.stroke(); } };   // H.1: the hold ring, filling
// glowing fingertip trail along tr up to point n (the last `tail` points fade), with the fingertip glow
Gd.trail = (ctx, tr, n, fade, tail = 18, keep = 0) => { ctx.lineCap = 'round'; ctx.lineWidth = 3; for (let i = 1; i < Math.min(n, tr.length); i++) { const al = .45 * fade * Math.max(keep, 1 - (n - i) / tail); if (al <= 0) continue; ctx.strokeStyle = RS.Render.css([255, 245, 220], al); ctx.beginPath(); ctx.moveTo(tr[i - 1][0], tr[i - 1][1]); ctx.lineTo(tr[i][0], tr[i][1]); ctx.stroke(); }
  const q = tr[Math.min(n, tr.length) - 1]; if (n > 0 && q) { const [x, y] = q, gr = ctx.createRadialGradient(x, y, 0, x, y, 12); gr.addColorStop(0, RS.Render.css([255, 250, 230], .6 * fade)); gr.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.fill(); } };
/* v0.8a O6: a two-stroke glyph as a ghost: the hook over t 0-.6 (it stays faintly), then the second stroke over .68-.92: the arrowhead at the hook's end
   (undo) or a point tapped under it ('?'). No text. */
Gd.drawTwo = (ctx, Sf, id, cx, cy, s, t, fade) => { const SY = RS.Symbols, tr = SY.trace(id === 'undo' ? 'undo' : 'question', cx, cy, s)[0] || []; if (!tr.length) return; const k1 = Math.min(1, t / .6); Gd.trail(ctx, tr, Math.floor(k1 * tr.length), fade, 18, t > .6 ? .35 : 0); if (t < .66) return;
  const xs = tr.map(p => p[0]), ys = tr.map(p => p[1]), H = { pts: tr, end: tr[tr.length - 1], size: Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)), box: { y1: Math.max(...ys), h: Math.max(...ys) - Math.min(...ys) } }, g = SY.ghostFinish(H), k2 = RS.clamp((t - .68) / .24, 0, 1);
  if (id === 'undo') { const a = g.arrow, path = [a[0], a[1], a[2]], seg = []; for (let i = 0; i <= 12; i++) { const u = i / 12 * 2, j = Math.min(1, Math.floor(u)), f = u - j; seg.push([path[j][0] + (path[j + 1][0] - path[j][0]) * f, path[j][1] + (path[j + 1][1] - path[j][1]) * f]); } Gd.trail(ctx, seg, Math.floor(k2 * seg.length), fade, 30); }
  else { const al = fade * Math.sin(Math.PI * k2), [x, y] = g.point, gr = ctx.createRadialGradient(x, y, 0, x, y, 12); gr.addColorStop(0, RS.Render.css([255, 250, 230], .65 * al)); gr.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 12, 0, 6.283); ctx.fill(); } };
Gd.draw = (ctx, Sf) => { if (Gd.drawOld) Gd.drawOld(ctx, Sf); const st = Gd.state(Sf); if (st.done && !(st.t && Sf.now() - st.t < 2)) return; const g = Gd.guide(Sf); if (!g || g.caught) return; if (Gd.eggPending(Sf)) return Gd.drawEgg(ctx, Sf, g, st); const key = Gd.STEPS[Math.min(st.step, Gd.STEPS.length - 1)], path = P[key] || [], R = RS.Creature.radius(g), t = (Sf.now() % 2.4) / 2.4, fade = st.done ? 1 - (Sf.now() - st.t) / 2 : 1;
  if (key === 'undo' && Math.floor(Sf.now() / 2.4) % 2) { const R0 = RS.Creature.radius(g); for (let i = 0; i < 3; i++) { const ph = Math.max(0, Math.sin(Math.PI * Math.min(1, t * 2 - i * .1))), x = g.x + (i - 1) * R0 * 1.3, y = g.y - R0 * 3 - (i === 1 ? R0 * .4 : 0), gr = ctx.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, RS.Render.css([255, 250, 230], .55 * ph * fade)); gr.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.283); ctx.fill(); } return; }   // v0.7 L: the undo lesson alternates the glyph with a three-finger tap
  if ((key === 'bond' || key === 'undo') && RS.Symbols) { let cx = g.x, cy = g.y - R * 3, s = R * 2.2; if (key === 'bond') { let o = null, bd = 600; for (const q of Sf.creatures) if (q !== g && !q.dead) { const d = Math.hypot(q.x - g.x, q.y - g.y); if (d < bd) { bd = d; o = q; } } if (o) { cx = (g.x + o.x) / 2; cy = (g.y + o.y) / 2; s = Math.max(R * 2, bd * .6); } }
    if (key === 'undo') { Gd.drawTwo(ctx, Sf, 'undo', cx, cy, s, t, fade); return; }   // v0.8a O6: the hook, then the arrowhead (two strokes)
    const tr = RS.Symbols.trace('infinity', cx, cy, s)[0] || []; Gd.trail(ctx, tr, Math.floor(t * tr.length), fade, 18); return; }   // glyphs: traced in glowing ink
  let a = null, b = null; for (let i = 0; i < path.length - 1; i++) if (!path[i + 1][3] && t >= path[i][2] && t <= path[i + 1][2]) { a = path[i]; b = path[i + 1]; break; } if (!a) return; const u = (t - a[2]) / Math.max(.001, b[2] - a[2]), x = g.x + (a[0] + (b[0] - a[0]) * u) * R, y = g.y + (a[1] + (b[1] - a[1]) * u) * R;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, 14); gr.addColorStop(0, RS.Render.css([255, 250, 230], .55 * fade)); gr.addColorStop(1, RS.Render.css([255, 250, 230], 0)); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(x, y, 14, 0, 6.283); ctx.fill(); };
/* v0.7 L (Wilbow 2:19 AM: hints for OLDER features too). Text-free ghost fingertips, the same look as the guide's, shown in context next to the
   thing they are about, at most one at a time, with a 20 s gap between hints. Each hint shows at most 3 times (mods.guide.oh[k]) and stops for
   good once the player has done that gesture (mods.guide.ohd[k] or the existing stat). They wait until the guide's own lessons are finished (or the
   guide has gone, or it has been idle 90 s). Only gestures that already exist are shown: nothing new is added and nothing is blocked. */
Gd.GAP = 20; Gd.SHOW = 5; Gd.MAXN = 3;
const inV = (Sf, x, y) => { const v = Sf.view; return !v || v.x0 == null || (x > v.x0 && x < v.x1 && y > v.y0 && y < v.y1); };
const free = c => c && !c.dead && !c.caught && !c.grabbed && !c.leaving && !c.guide;
const ohm = (Sf, f) => Sf.creatures.find(c => free(c) && inV(Sf, c.x, c.y) && (!f || f(c)));
const bodyOf = (Sf, f) => { if (!Sf.W || !Sf.W.bodies) return null; for (const b of Sf.W.bodies.values()) if (b.meta && f(b.meta)) { const [x, y] = Sf.W.center(b); if (inV(Sf, x, y)) return { x, y, b }; } return null; };
const st0 = (Sf, k) => (Sf.stats && Sf.stats[k]) || 0;
Gd.OLD = [
  { k: 'mute', kind: 'tap', done: Sf => 0, find: Sf => ohm(Sf, c => c.jam) },                                                     // tap a jam member: mute / unmute it
  { k: 'baton', kind: 'baton', done: Sf => st0(Sf, 'baton'), find: Sf => Sf.creatures.filter(c => free(c) && inV(Sf, c.x, c.y)).length >= 2 ? (c => c && { x: c.x, y: c.y - 160, fixed: true })(ohm(Sf)) : null },   // conduct
  { k: 'adopt', kind: 'drag', done: Sf => st0(Sf, 'adopt') || Sf.creatures.some(c => c.home), find: Sf => { const c = ohm(Sf, q => !q.home && !q.jam); if (!c || !Sf.instruments) return null; let best = null, bd = 420; for (const b of Sf.instruments()) { if (b.meta.role === 'rock' || b.meta.monolith || b.meta.fossil != null) continue; const [x, y] = Sf.W.center(b), d = Math.hypot(x - c.x, y - c.y); if (d < bd && inV(Sf, x, y)) { bd = d; best = { x, y }; } } return best && { c, to: best }; } },   // drop an ohm on an instrument
  { k: 'fuse', kind: 'fuse', done: Sf => st0(Sf, 'fusions'), find: Sf => { const c = ohm(Sf, q => !q.cluster); if (!c) return null; const o = Sf.creatures.find(q => q !== c && free(q) && !q.cluster && Math.hypot(q.x - c.x, q.y - c.y) < 260); return o && { c, o }; } },   // press one ohm into another
  { k: 'squeeze', kind: 'pinch', done: Sf => 0, find: Sf => ohm(Sf) },                                                               // pinch an ohm: it sings
  { k: 'listen', kind: 'taphold', done: Sf => 0, find: Sf => ohm(Sf) },                                                              // v0.8b4: tap then hold an ohm: the ear ring, it listens to you
  { k: 'wake', kind: 'dtap', done: Sf => Sf.creatures.some(c => c.fossil), find: Sf => bodyOf(Sf, m => m.fossil != null) },          // double tap the bones
  { k: 'mono', kind: 'dtap', done: Sf => st0(Sf, 'monolithModulations'), find: Sf => bodyOf(Sf, m => m.monolith) },                 // touch the monolith twice in a bar
  { k: 'walk', kind: 'hold', n: 1, done: Sf => st0(Sf, 'walkEnter'), find: Sf => { const g = Gd.guide(Sf); return g && !g.dead && inV(Sf, g.x, g.y) ? g : ohm(Sf); } },   // v0.7 K/L, v0.8b4: HOLD an ohm (the hands ring): walk in its shoes (the guide shows it once)
  { k: 'river', kind: 'twist', done: Sf => st0(Sf, 'dawOpen'), find: Sf => ohm(Sf) && Sf.view && Sf.view.cx != null ? { x: Sf.view.cx, y: Sf.view.cy, fixed: true } : null },   // twist two fingers: the river
  { k: 'restItem', kind: 'loopRest', done: Sf => st0(Sf, 'itemsDrawn'), find: Sf => st0(Sf, 'blobs') >= 3 && RS.ITEMS_DRAW && Sf.view && Sf.view.cx != null ? { x: Sf.view.cx, y: Sf.view.cy - 40, fixed: true } : null },   // v0.8a3 I/A: after 3 blobs: a ghost loop whose end rests, the warm ring fills, an item glows (max 3 times)
  { k: 'tieStr', kind: 'tap', done: Sf => st0(Sf, 'tiePlayer'), find: Sf => { if (!Sf.ties) return null; for (const g in Sf.ties) { const G = Sf.ties[g]; if (!G.E) continue; for (const b of G.list) { if (!b.tie || !Sf.W.bodies.has(b.id)) continue; const [x, y] = Sf.W.center(b); if (inV(Sf, x, y)) return { x, y, fixed: true }; } } return null; } },   // v0.8a4 D: a dot on a string tied to a jam: tap it, you play along in their key
  { k: 'qmark', kind: 'qmark', done: Sf => st0(Sf, 'summons'), find: Sf => { const g = Gd.guide(Sf); return g && !g.caught && inV(Sf, g.x, g.y) ? { c: g } : null; } } ];   // v0.8a I/O6: the guide draws a ghost '?' with its point under it (two strokes), max 3 times (Q110)
Gd.did = (Sf, k) => { if (!Sf || !Sf.mods) return; const st = Gd.state(Sf); (st.ohd = st.ohd || {})[k] = 1; if (Sf._oh && Sf._oh.k === k) Sf._oh.end = Sf.now(); };
Gd.oldReady = Sf => { const st = Gd.state(Sf); if (Gd.eggPending(Sf)) return false; return st.done || !Gd.guide(Sf) || Sf.now() - (st.t || 0) > 90; };
Gd.oldTick = Sf => { if (!Sf || !Sf.mods) return null; const tn = Sf.now(), H = Sf._oh; if (H) { if (tn - H.t < Gd.SHOW && !H.end) return H; Sf._oh = null; Sf._ohLast = tn; }
  if (tn - (Sf._ohChk || -9) < 1) return null; Sf._ohChk = tn; if (Sf._ohLast != null && tn - Sf._ohLast < Gd.GAP) return null; if (Sf.baton || (Sf.d3s && Sf.d3s.m) || !Gd.oldReady(Sf)) return null;
  const st = Gd.state(Sf), n = st.oh = st.oh || {}, d = st.ohd = st.ohd || {};
  for (const h of Gd.OLD) { if (d[h.k] || (n[h.k] || 0) >= (h.n || Gd.MAXN)) continue; if (h.done(Sf)) { d[h.k] = 1; continue; } const a = h.find(Sf); if (!a) continue; n[h.k] = (n[h.k] || 0) + 1; return Sf._oh = { k: h.k, kind: h.kind, a, t: tn }; }
  return null; };
const css = (c, a) => RS.Render ? RS.Render.css(c, a) : 'rgba(' + c.join(',') + ',' + a + ')';
const dot = (ctx, x, y, al, r = 11) => { if (al <= .01) return; ctx.fillStyle = css([255, 250, 230], .5 * al); ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill(); ctx.fillStyle = css([255, 255, 245], .35 * al); ctx.beginPath(); ctx.arc(x, y, r * .45, 0, 6.283); ctx.fill(); };
const ring = (ctx, x, y, k, al, r = 18) => { if (k <= 0) return; ctx.strokeStyle = css([255, 255, 255], .55 * al); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y, r, -1.571, -1.571 + Math.min(1, k) * 6.283); ctx.stroke(); };
const pulse = (t, a, b) => t > a && t < b ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
Gd.drawOld = (ctx, Sf) => { const H = Gd.oldTick(Sf); if (!H) return null; const tn = Sf.now(), u = (tn - H.t) / Gd.SHOW, t = ((tn - H.t) % 2.5) / 2.5, fade = Math.min(1, u * 6, (1 - u) * 6), a = H.a;
  const c = a.c || (a.fixed ? null : a), R = c && c.P ? RS.Creature.radius(c) : 16, x = a.c ? a.c.x : a.x, y = a.c ? a.c.y : a.y;
  if (c && c.dead) { H.end = tn; return H; }
  if (H.kind === 'tap') dot(ctx, x, y, fade * pulse(t, .25, .5));
  else if (H.kind === 'dtap') { dot(ctx, x, y, fade * (pulse(t, .2, .34) + pulse(t, .42, .56))); }
  else if (H.kind === 'taphold') { dot(ctx, x, y, fade * pulse(t, .05, .2)); const on = t > .3 && t < .9; if (on) { dot(ctx, x, y, fade); ring(ctx, x, y, (t - .3) / .5, fade); } } else if (H.kind === 'hold') { const on = t > .15 && t < .8; dot(ctx, x, y, fade * (on ? 1 : 0)); if (on) ring(ctx, x, y, (t - .15) / .45, fade); }
  else if (H.kind === 'drag') { const k = Math.min(1, t / .75), ex = x + (a.to.x - x) * k, ey = y + (a.to.y - y) * k - Math.sin(Math.PI * k) * 60; dot(ctx, ex, ey, fade * (t < .9 ? 1 : 0)); }
  else if (H.kind === 'fuse') { const o = a.o, k = Math.min(1, t / .45), ex = x + (o.x - x) * k * .8, ey = y + (o.y - y) * k * .8; dot(ctx, ex, ey, fade * (t < .92 ? 1 : 0)); if (t > .45 && t < .92) ring(ctx, ex, ey, (t - .45) / .3, fade); }
  else if (H.kind === 'pinch') { const sp = R * (2.4 - 1.3 * Math.min(1, t / .6)); for (const s of [-1, 1]) dot(ctx, x + s * sp * .7, y - s * sp * .7, fade * (t < .85 ? 1 : 0)); }
  else if (H.kind === 'twist') { const th = -.6 + 1.6 * Math.min(1, t / .7); for (const s of [-1, 1]) dot(ctx, x + s * Math.cos(th) * 60, y + s * Math.sin(th) * 60, fade * (t < .85 ? 1 : 0)); }
  else if (H.kind === 'loopRest') { const r0 = 34, k = Math.min(1, t / .45), an = -1.571 + k * 6.283; dot(ctx, x + Math.cos(an) * r0, y + Math.sin(an) * r0, fade * (t < .88 ? 1 : 0)); ctx.strokeStyle = css([255, 255, 255], .3 * fade * (t < .88 ? 1 : 0)); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r0, -1.571, an); ctx.stroke(); if (t > .45 && t < .88) { ctx.strokeStyle = css([255, 184, 120], .7 * fade); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(x, y - r0, 18, -1.571, -1.571 + Math.min(1, (t - .45) / .3) * 6.283); ctx.stroke(); } if (t > .75) { const g = Math.min(1, (t - .75) / .1); ctx.fillStyle = css([255, 200, 140], .55 * fade * g); ctx.beginPath(); ctx.arc(x, y, 9 + 4 * g, 0, 6.283); ctx.fill(); } }   // v0.8a3 A: loop, rest (warm ring), condense
  else if (H.kind === 'qmark') { const g = a.c, R0 = RS.Creature.radius(g); Gd.drawTwo(ctx, Sf, 'question', g.x + R0 * 3, g.y - R0 * 3, R0 * 2.4, t, fade); }
  else if (H.kind === 'baton') { if (t < .4) { for (const s of [-1, 1]) dot(ctx, x + s * 26, y, fade); ring(ctx, x, y, t / .3, fade, 40); } else { const k = (t - .4) / .6, ph = (k * 2) % 1, yy = y - 50 + (ph < .5 ? ph * 2 : 2 - ph * 2) * 100; dot(ctx, x, yy, fade); } }   // two fingers held still, then beats
  return H; };
})(typeof window !== 'undefined' ? window : globalThis);
