// classifier test: specials recognised >95%, freeform misread as special <2% (realistic jitter, scale, rotation, speed)
global.window = global; ['rng', 'classify'].forEach(m => require('./www/js/' + m + '.js'));
const R = RS.rng(42); const J = () => R.gauss() * 1.2;
// realistic finger sampling: coalesced pointer events every ~4 ms (app uses getCoalescedEvents) at 0.25-2 px/ms stroke speed, ~1.2 px positional noise per event
const xf = (pts, s, a, ox, oy) => { const P = pts.map(([x, y]) => [ox + s * (x * Math.cos(a) - y * Math.sin(a)), oy + s * (x * Math.sin(a) + y * Math.cos(a))]); const step = R.range(.25, 2) * 4.2; const out = [[P[0][0] + J(), P[0][1] + J()]]; let acc = 0;
  for (let i = 1; i < P.length; i++) { acc += Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]); if (acc >= step) { out.push([P[i][0] + J(), P[i][1] + J()]); acc = 0; } } out.push([P[P.length - 1][0] + J(), P[P.length - 1][1] + J()]); return out; };
const dense = (poly, step = 3) => { const o = []; for (let i = 1; i < poly.length; i++) { const [a, b] = [poly[i - 1], poly[i]], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / step)); for (let k = 0; k < n; k++) o.push([a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n]); } o.push(poly[poly.length - 1]); return o; };
const curve = (f, n = 120) => Array.from({ length: n + 1 }, (_, i) => f(i / n));
const GEN = {
  spiral: () => { const turns = R.range(1.9, 3.2), r0 = R.range(.05, .2), dir = R() < .5 ? 1 : -1, out = R() < .5; return curve(t => { const u = out ? t : 1 - t, th = dir * u * turns * 6.283, r = r0 + u * (1 - r0); return [r * Math.cos(th), r * Math.sin(th)]; }, 160); },
  wave: () => { const per = R.range(1.6, 3), amp = R.range(.14, .32); return curve(t => [t * 2 - 1, amp * Math.sin(t * per * 6.283)]); },
  star: () => { const pts = [], ph = R.range(0, 6.28), dir = R() < .5 ? 1 : -1; for (let k = 0; k <= 5; k++) { const a = ph + dir * k * 4 * Math.PI / 5; pts.push([Math.cos(a) + R.range(-.06, .06), Math.sin(a) + R.range(-.06, .06)]); } return dense(pts, .02); },
  zigzag: () => { const nseg = R.int(4, 6), pts = []; for (let k = 0; k <= nseg; k++) pts.push([k / nseg * 2 - 1, (k % 2 ? 1 : -1) * R.range(.25, .5)]); return dense(pts, .02); },
};
const FREE = {
  line: () => dense([[-1, R.range(-.1, .1)], [1, R.range(-.1, .1)]], .02),
  arc: () => { const a = R.range(.5, 2.8); return curve(t => [Math.cos(-a / 2 + a * t), Math.sin(-a / 2 + a * t)]); },
  scurve: () => { const f = R.range(.4, .95), a = R.range(.15, .45); return curve(t => [t * 2 - 1, a * Math.sin(t * 6.283 * f)]); },
  circle: () => { const e = R.range(.6, 1), ph = R.range(0, 6.28), k = R.range(.97, 1.08); return curve(t => [Math.cos(ph + t * 6.283 * k), e * Math.sin(ph + t * 6.283 * k)]); },
  blob: () => { const h = [R.range(0, .2), R.range(0, .15), R.range(0, .1)], p = [R() * 6, R() * 6, R() * 6]; return curve(t => { const a = t * 6.283, r = 1 + h[0] * Math.sin(2 * a + p[0]) + h[1] * Math.sin(3 * a + p[1]) + h[2] * Math.sin(5 * a + p[2]); return [r * Math.cos(a), r * Math.sin(a)]; }); },
  rect: () => { const w = R.range(.4, 1); return dense([[-1, -w], [1, -w], [1, w], [-1, w], [-1, -w + .05]], .02); },
  triangle: () => dense([[0, -1], [.9, .6], [-.9, .6], [-.05, -.9]], .02),
  lshape: () => dense([[-1, -1], [-1, 1], [R.range(.2, 1), 1]], .02),
  ushape: () => { const k = R.range(.6, 1.5); return curve(t => [Math.cos(Math.PI * t), Math.sin(Math.PI * t) * k]); },
  hook: () => curve(t => t < .6 ? [0, -1 + t / .6 * 1.6] : [.3 * Math.sin((t - .6) / .4 * Math.PI), .6 + .3 * (1 - Math.cos((t - .6) / .4 * Math.PI))]),
  bowl: () => { const k = R.range(.3, .8); return curve(t => [t * 2 - 1, (t * 2 - 1) ** 2 * k]); },
  ramp: () => dense([[-1, -.6], [.2, .3], [1, .35]], .02),
  doublecircle: () => curve(t => [Math.cos(t * 6.283 * 1.6), Math.sin(t * 6.283 * 1.6)], 200),
  wobblyline: () => curve(t => [t * 2 - 1, .02 * Math.sin(t * 30) + .01 * Math.sin(t * 71)]),
  vee: () => dense([[-1, -1], [0, 1], [1, -1]], .02),
  heart: () => curve(t => { const a = t * 6.283; return [16 * Math.sin(a) ** 3 / 16, -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) / 16]; }),
};
module.exports = { GEN, FREE, xf, R };
if (require.main === module) {
const run = (gen, n) => { const res = {}; for (let k = 0; k < n; k++) { const s = R.range(45, 160), st = xf(gen(), s, R.range(0, 6.28), 200, 400), c = RS.classify(st); const id = c ? c.id : 'free'; res[id] = (res[id] || 0) + 1; } return res; };
let ok = true; const out = {};
for (const k in GEN) { const r = run(GEN[k], 300), rate = (r[k] || 0) / 300; out[k] = { rate, r }; if (rate < .95) ok = false; }
let fm = 0, ft = 0; const fr = {}; for (const k in FREE) { const r = run(FREE[k], 200); const mis = 200 - (r.free || 0); fm += mis; ft += 200; fr[k] = r; }
console.log(JSON.stringify(out)); console.log(JSON.stringify(fr)); const mr = fm / ft; console.log('freeform misread', (mr * 100).toFixed(2) + '%'); if (mr >= .02) ok = false;
console.log(ok ? 'CLASSIFY PASS' : 'CLASSIFY FAIL'); process.exit(ok ? 0 : 1);
}
