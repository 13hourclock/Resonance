// v0.7 J: frame time + background tick cost in a busy world. ROOT=<project dir> picks the source (default: this project). Prints JSON.
process.env.ID_SEED = process.env.ID_SEED || '7';
const ROOT = process.env.ROOT || require('path').resolve(__dirname, '..'); const T = require(ROOT + '/tests/node_env.js'), RS = global.RS, { performance } = require('perf_hooks');
T.t = 0; const { Sf } = T.make({}); T.run(Sf, 5); const P = Sf.P, v0 = Object.assign({}, Sf.view), th0 = P.theta(v0.cx, v0.cy + 170);
const look = dpx => { const [x, y] = P.surf(th0 + dpx / P.R); Sf.view = { x0: x - 580, x1: x + 580, y0: y - 580, y1: y + 580, cx: x, cy: y - 170, z: 1 }; };
// busy: 10 more ohms near home (on screen) + 3 groups of 6 further out (off screen when the view is at home)
for (let k = 0; k < 10; k++) { const [x, y] = Sf.landAt(th0 + (k - 5) * 45 / P.R, 40, { r: 20 }); Sf.addCreature(RS.Genome.random(RS.hash('perfA', k)), x, y, { distinct: true, growth: .8 }); }
for (const off of [1600, -1600, 2600]) { look(off); T.run(Sf, .5); for (let k = 0; k < 6; k++) { const [x, y] = Sf.landAt(th0 + (off + (k - 3) * 50) / P.R, 40, { r: 20 }); Sf.addCreature(RS.Genome.random(RS.hash('perfB', off, k)), x, y, { distinct: true, growth: .8 }); } }
look(0); T.run(Sf, 20);   // settle; jams form
const meas = (dpx, sec) => { look(dpx); T.run(Sf, 2); const N = Math.round(sec * 60), ts = []; for (let i = 0; i < N; i++) { const a = performance.now(); Sf.step(1 / 60); T.t += 1 / 60; ts.push(performance.now() - a); } ts.sort((a, b) => a - b); return { mean: +(ts.reduce((a, b) => a + b, 0) / N).toFixed(3), p95: +ts[Math.floor(N * .95)].toFixed(3), lod1: Sf.creatures.filter(c => !c.dead && c.lod === 1).length, alive: Sf.creatures.filter(c => !c.dead).length }; };
const out = { frameHome: meas(0, 30), background: meas(6000, 30), frameHome2: meas(0, 30) }; console.log(JSON.stringify(out));
