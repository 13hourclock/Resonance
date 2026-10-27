require('./node_env.js');
const spiral = (o = {}) => { const pts = [], times = []; const N = 160, turns = o.turns || 2.5, R = o.R || 80; let t = 0;
  for (let i = 0; i < N; i++) { const u = i / (N - 1), a = u * turns * 2 * Math.PI, r = R * (.15 + .85 * u); let x = r * Math.cos(a), y = r * Math.sin(a);
    if (o.sq) { const m = Math.max(Math.abs(Math.cos(a)), Math.abs(Math.sin(a))); x = r * Math.cos(a) / m * .8; y = r * Math.sin(a) / m * .8; }
    if (o.asp) { x *= o.asp; }
    if (o.wob) { x += Math.sin(i * 2.3) * o.wob; y += Math.cos(i * 3.1) * o.wob; }
    const sp = o.speed || 1, f = o.trend ? (o.trend > 0 ? (1.6 - u * 1.2) : (.4 + u * 1.2)) : 1; t += 1000 * (2 * Math.PI * r * turns / N) / 1000 / (sp * f) ; if (o.pause && o.pause.includes(i)) t += 180;
    pts.push([x + 400, y + 300]); times.push(t); }
  return { pts, times }; };
module.exports = spiral;
if (require.main === module) {
const cases = { base: {}, wobbly: { wob: 2 }, wob3: { wob: 3.5 }, slow: { speed: .25 }, fast: { speed: 2 }, tight: { turns: 5, R: 50 }, loose: { turns: 1.6, R: 140 }, square: { sq: 1 }, oval: { asp: 1.7 }, pluck: { trend: 1 }, swell: { trend: -1 }, pauses: { pause: [40, 60, 100, 120] } };
for (const k in cases) { const s = spiral(cases[k]); const c = RS.classify(s.pts); const R = RS.strokeRead(s.pts, s.times, null, { turns: c && c.turns });
  console.log(k.padEnd(7), c && c.id, c && c.turns.toFixed(1), Object.entries(R).map(([a, b]) => a + '=' + (typeof b === 'number' ? b.toFixed(2) : JSON.stringify(b))).join(' ')); } }
