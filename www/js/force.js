// RS.Force (v0.8b3, Q173b): how hard a finger presses. Real e.pressure only once the phone has reported
// at least two distinct in-between values (many phones send a constant 0 / .5 / 1); until then callers keep their speed-based strength.
(function (G) { 'use strict';
const RS = G.RS, F = RS.Force = { real: false, seen: [], max: 0, last: null, N: 2 };
F.note = (p, type) => { if (p == null || type === 'mouse' || !(p >= 0)) return; F.last = p; if (p > F.max) F.max = p; if (!F.real && p > .001 && Math.abs(p - .5) > .001 && p < .999) { const q = Math.round(p * 1000) / 1000; if (F.seen.indexOf(q) < 0) F.seen.push(q); if (F.seen.length >= F.N) F.real = true; } };
F.down = (p, type) => { F.max = 0; F.last = null; F.note(p, type); };
// strength 0..1: the press when it is real, else the caller's fallback (tap speed / swipe speed)
F.strength = fb => F.real && F.last != null ? Math.max(.2, Math.min(1, .15 + .95 * F.max)) : fb;
F.reset = () => { F.real = false; F.seen = []; F.max = 0; F.last = null; };
})(typeof window !== 'undefined' ? window : globalThis);
