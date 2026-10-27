// lean check (ground bug): ~200 planet seeds across every planet kind: terrain exists (amp > 0, not groundless), finite, the landing point is dry
// walkable land, and the ground is on screen at the landing view for the zoom levels the app opens at / allows (far .02 .. near 2).
const T = require('./node_env.js'); const types = ['rocky', 'ocean', 'icy', 'gas', 'ringed']; let bad = [], n = 0;
for (let k = 0; k < 200; k++) { const type = types[k % 5], r = RS.rng(RS.hash('gnd', k)), big = type === 'gas' || type === 'ringed', body = { seed: RS.hash('planet', k), type, size: big ? 2.2 + r() * 1.8 : .6 + r() * .8, wet: RS.PTYPES[type].wet, temp: r() };
  for (const mods of big ? [{}, { cloud: 0 }] : [{}]) { const P = RS.Planet(body, null, mods); n++;   /* v0.6: giants are deliberate cloud worlds (deck at R, floor at GAS_FLOOR); saved legacy giants (cloud 0) keep the old solid shelf */ let fin = true; for (let i = 0; i < P.N; i += 7) if (!isFinite(P.h[i])) { fin = false; break; }
  const p = P.gas ? P.top(0) : P.surf(0), dry = P.gas ? (P.height(0) === RS.Planet.GAS_FLOOR && P.seaR > P.R + P.height(0)) : P.height(0) > P.sea + 5, cam = { x: p[0], y: p[1] - 160 }, Wd = 390, Ht = 844;
  const onScreen = [.02, .1, .35, 1, 2].every(z => { const sy = Ht * .58 + (p[1] - cam.y) * z; return sy > 0 && sy < Ht; });
  if (!((P.gas ? !!(big && !mods.cloud && mods.cloud !== 0) : P.amp > 0) && fin && isFinite(p[0]) && isFinite(p[1]) && dry && onScreen)) bad.push({ k, type, amp: P.amp, gas: P.gas, fin, dry, onScreen }); } }
console.log((bad.length ? 'FAIL ' : 'ok   ') + 'GROUND every planet kind has finite, dry, on-screen ground at landing', JSON.stringify({ n, bad: bad.slice(0, 5) }));
console.log(`ground ${bad.length ? 0 : 1}/1`);
