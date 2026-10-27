'use strict';
// DELETE a creature, gently (v0.3). Catch it in a bubble (loop), then flick the bubble firmly UP (away from the planet) - speed AND distance
// thresholds, so a slow / short flick never deletes. The bubble rises, the creature sings a short fading farewell in its own voice and
// dissolves into motes that linger ~5 s: tapping the motes reforms it exactly (full serial: genome + learned state). Then it is gone
// (removed from world, colony, jams and the next save). Its lineage keeps a faded star (Sf.ancestors, faded: true).
// Fused clusters: SAFER option - the bubble wobbles and refuses (separate them first); nothing is deleted.
(function (G) { const RS = G.RS; const F = RS.Farewell = {}; F.V = 900; F.D = 110; F.UNDO = 5;
F.flick = (Sf, b, vx, vy, grab) => { if (!b || !b.meta || b.meta.role !== 'bubble' || !b.meta.c) return null; const c = b.meta.c, P = Sf.P, [x, y] = Sf.W.center(b);
  const ux = x - P.cx, uy = y - P.cy, ul = Math.hypot(ux, uy) || 1, vr = (vx * ux + vy * uy) / ul, dist = grab ? Math.hypot((grab.tx == null ? x : grab.tx) - grab.x0, (grab.ty == null ? y : grab.ty) - grab.y0) : 0;
  if (vr < F.V || dist < F.D) return null;   // not firm enough: an ordinary throw
  if (c.cluster) { for (const i of b.idx) { Sf.W.px[i] += (Math.random() - .5) * 0 + Math.sin(i) * 3; } Sf.fx({ k: 'clash', x, y, dur: .6 }); Sf.stats.deleteRefused = (Sf.stats.deleteRefused || 0) + 1; return 'refuse'; }
  return F.go(Sf, b, c); };
F.go = (Sf, b, c) => { const s = JSON.parse(JSON.stringify(Sf.serialCreature(c))), [x, y] = Sf.W.center(b), m = c.mind, now = Sf.now();
  if (m && RS.Mind) { const n = m.sys.cents.length; [n, Math.round(n * .6), 0].forEach((d, k) => RS.Mind.play(Sf, c, { deg: d, d: .5 + k * .3, vel: .35 - k * .08, manual: true }, now + .05 + k * .32, 1)); }   // farewell phrase, fading, its own voice
  if (Sf.undoPush) Sf.undoPush({ k: 'delete', id: c.id, s }); Sf.W.removeBody(b); c.caught = null; if (c.jam && RS.Jam) RS.Jam.leave(Sf, c.jam, c); if (RS.Social) RS.Social.onDelete(Sf, c); Sf.removeCreature(c); const an = Sf.ancestors[Sf.ancestors.length - 1]; if (an && an.id === c.id) an.faded = true;
  Sf.motes = (Sf.motes || []).filter(q => now - q.t < F.UNDO); Sf.motes.push({ x, y, t: now, s, col: c.col, id: c.id }); Sf.dirty && Sf.dirty.add(Sf.chunkKey(Sf.P.chunkOf(Sf.P.theta(x, y))));
  Sf.fx({ k: 'emberDie', x, y, col: c.col, dur: 1.6, force: true }); Sf.stats.deleted = (Sf.stats.deleted || 0) + 1; return 'deleted'; };
// tap near the lingering motes within the undo window -> the creature reforms exactly
F.tap = (Sf, x, y) => { const now = Sf.now(); if (!Sf.motes || !Sf.motes.length) return null; for (const q of Sf.motes) { if (now - q.t > F.UNDO) continue; if (Math.hypot(q.x - x, q.y - y + (now - q.t) * 12) > 70) continue;
    Sf.motes = Sf.motes.filter(o => o !== q); const c = Sf.loadCreature(Object.assign({}, q.s, { x: q.x, y: q.y })); Sf.ancestors = Sf.ancestors.filter(a => !(a.id === q.id && a.faded)); if (RS.Social) RS.Social.onRestore(Sf, q.id); Sf.fx({ k: 'bloom', x: q.x, y: q.y, col: q.col, dur: .8 }); Sf.stats.restored = (Sf.stats.restored || 0) + 1; return c || 'restored'; }
  return null; };
F.draw = (ctx, Sf) => { const now = Sf.now(); if (!Sf.motes) return; for (const q of Sf.motes) { const a = 1 - (now - q.t) / F.UNDO; if (a <= 0) continue; for (let k = 0; k < 9; k++) { const an = k * 2.4 + (now - q.t) * .6, d = 8 + k * 3 + (now - q.t) * 4; ctx.fillStyle = RS.Render.css(q.col || [255, 255, 255], .6 * a); ctx.beginPath(); ctx.arc(q.x + Math.cos(an) * d, q.y + Math.sin(an) * d - (now - q.t) * 12, 2, 0, 6.283); ctx.fill(); } } };
})(typeof window !== 'undefined' ? window : globalThis);
