'use strict';
// Seeded randomness + noise. Pure, no DOM.
(function (G) {
const RS = G.RS = G.RS || {};
RS.hash = function () { let h = 2166136261 >>> 0; for (let i = 0; i < arguments.length; i++) { let v = arguments[i]; if (typeof v === 'string') { for (let j = 0; j < v.length; j++) { h ^= v.charCodeAt(j); h = Math.imul(h, 16777619); } } else { v = Math.floor(v * 1000003) | 0; h ^= v; h = Math.imul(h, 16777619); h ^= h >>> 13; } } h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return (h ^ (h >>> 16)) >>> 0; };
RS.rng = seed => { let a = seed >>> 0 || 1; const f = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; f.range = (lo, hi) => lo + (hi - lo) * f(); f.int = (lo, hi) => Math.floor(lo + (hi - lo + 1) * f()); f.pick = a => a[Math.floor(f() * a.length)]; f.gauss = () => { let u = 0, v = 0; while (!u) u = f(); v = f(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(6.2831853 * v); }; f.st = v => { if (v != null) a = v >>> 0; return a; }; return f; };   /* songsave: read / set the stream position (an ohm's own rng is saved with the song) */
// 1D/2D value noise (smooth), seeded
RS.noise2 = (seed, x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, s = t => t * t * (3 - 2 * t), h = (a, b) => RS.hash(seed, a, b) / 4294967296;
  const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1), u = s(xf), v = s(yf); return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v; };
RS.fbm = (seed, x, y, oct = 4) => { let s = 0, a = .5, f = 1; for (let i = 0; i < oct; i++) { s += a * RS.noise2(seed + i * 101, x * f, y * f); a *= .5; f *= 2; } return s; };
RS.clamp = (v, a, b) => v < a ? a : v > b ? b : v;
RS.wrapA = d => { if (d > -Math.PI && d <= Math.PI) return d; if (!Number.isFinite(d)) return 0; const T = 2 * Math.PI; d = ((d + Math.PI) % T + T) % T - Math.PI; return d === -Math.PI ? Math.PI : d; };   /* stab: angle wrap without unbounded loops */
RS.lerp = (a, b, t) => a + (b - a) * t;
RS.TAU = Math.PI * 2;
})(typeof window !== 'undefined' ? window : globalThis);
