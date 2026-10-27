'use strict';
// Perception between creatures: can a perceive b (hearing, sight of pulses, touch, ground vibration), and by which channel.
// v0.3.1: the v0.2 conductor ensemble (groups / tick / parts / textures) was dead code since the v0.3 minds (nothing called E.tick); deleted.
// What remains is perception (who can hear / see / feel whom), used by the minds, alarms and teaching.
(function (G) {
const RS = G.RS, E = RS.Ensemble = {};
E.perceive = (Sf, a, b) => { const d = Math.hypot(a.x - b.x, a.y - b.y), S = a.P.sense; if (d < RS.Creature.radius(a) + RS.Creature.radius(b) + 10 && S.touch > .1) return { ch: 'touch', d, w: .6 + S.touch * .6 };
  if (!S.deaf && d < S.hearR) return { ch: 'ear', d, w: S.hearing };
  const lit = Sf.day > .2 || (b.P.glow > .5) || b.light > .1; if (!S.blind && lit && d < S.sightR) return { ch: 'sight', d, w: S.sight * .8 };
  const onG = c => c.segs[0] && c.segs[0].idx.some(i => Sf.W.fl[i] & 8); if (S.vibration > .35 && d < 60 + S.vibration * 260 && onG(a) && onG(b)) return { ch: 'vibration', d, w: S.vibration * .6 };
  return null; };
})(typeof window !== 'undefined' ? window : globalThis);
