'use strict';
// Procedural planet: periodic heightfield around the globe (seamless), sea level, biomes, landmarks. Deterministic from seed. Pure.
(function (G) {
const RS = G.RS, TAU = RS.TAU;
RS.Planet = function (body, sysStar, mods = {}) {
  // v0.3 ground fix: gas/ringed giants used to be GROUNDLESS (amp 0, no terrain in gravity -> nothing to stand on, 'some planets have no ground').
  // Planet kinds are a table (RS.Planet.KIND); a groundless gas-giant kind is a future option (RS.Planet.GROUNDLESS, off) - every v0.3 planet has ground.
  const seed = body.seed, r = RS.rng(seed), type = body.type, K0 = RS.Planet.KIND[type] || RS.Planet.KIND.rocky, gas = !!(RS.Planet.GROUNDLESS && K0.groundless && mods.cloud !== 0);   /* v0.6: groundless kinds (KIND[type].groundless) become cloud worlds; a giant already saved as solid ground keeps it (mods.cloud = 0) */
  const R = Math.round(gas ? 20000 : K0.giant ? 14000 + body.size * 1500 : 6000 + body.size * 9000), N = Math.round(TAU * R / 4), h = new Float32Array(N);
  const amp = gas ? 0 : K0.amp * r.range(.7, 1.3), K = R / 2200;
  // domain-warped fbm on a circle (wraps exactly)
  for (let i = 0; i < N; i++) { const a = i / N * TAU, cx = Math.cos(a) * K, cy = Math.sin(a) * K, w = RS.fbm(seed + 7, cx * .7, cy * .7, 3) * 2.2;
    let v = RS.fbm(seed, cx + w, cy - w, 5) - .5; const ridge = 1 - Math.abs(RS.fbm(seed + 3, cx * 2.2, cy * 2.2, 4) * 2 - 1); v += ridge * ridge * .35 * RS.fbm(seed + 11, cx * .5, cy * .5, 2);
    h[i] = v * amp * 2.2; }
  // craters
  const ncr = gas ? 0 : r.int(type === 'rocky' ? 6 : 1, type === 'rocky' ? 22 : 6); for (let k = 0; k < ncr; k++) { const c = r.int(0, N - 1), w = r.int(80, 900), d = w * r.range(.08, .2); for (let j = -w * 1.3; j <= w * 1.3; j += 4) { const u = Math.abs(j) / w, i = ((c + Math.round(j / 4)) % N + N) % N; h[i] += u < 1 ? -d * (1 - u * u) + d * .35 * Math.exp(-(((u - 1) * 6) ** 2)) : d * .35 * Math.exp(-(((u - 1) * 6) ** 2)); } }
  // cliffs: a few terraces
  for (let k = 0; k < (gas ? 0 : r.int(2, 8)); k++) { const c = r.int(0, N - 1), w = r.int(40, 200), d = r.range(40, 160) * (r() < .5 ? -1 : 1); for (let j = 0; j < N / 40; j++) { const i = (c + j) % N; h[i] += d * RS.clamp((j - w / 4) / 6, 0, 1); } }
  // smooth a little (finger-scale stability)
  const hs = new Float32Array(N); for (let i = 0; i < N; i++) { let s = 0; for (let k = -2; k <= 2; k++) s += h[(i + k + N) % N]; hs[i] = s / 5; } h.set(hs);
  const sorted = Array.from(h).sort((a, b) => a - b); const wetFrac = gas || K0.giant ? 0 : RS.clamp(body.wet * .7 + (mods.water || 0) * .02, 0, .75); const sea = wetFrac > .02 ? sorted[Math.floor(wetFrac * (N - 1))] : -1e9;
  // the landing point (theta 0) is always dry, walkable land: a gentle island rises above the sea there (ocean worlds used to land you underwater)
  if (!gas && sea > -1e8 && type !== 'ark') { const W2 = Math.round(2400 / 4); for (let j = -W2; j <= W2; j++) { const i = (j + N) % N, u = Math.abs(j) / W2, k = u < .6 ? 1 : Math.cos((u - .6) / .4 * Math.PI / 2) ** 2; h[i] = Math.max(h[i], h[i] * (1 - k) + (sea + 45) * k); } }   // flat-topped dry landing island
  // v0.4b start shore: the ark landing stays the shallow coast Wilbow knows, but a screen or so to the east the sea floor now rises into a low dry shore with
  // a small pool hollow (rock, reeds and the pool are placed on it by RS.Field), so the dry-land features are met within 1-2 screens. Only s = 380..1160 px changes.
  if (type === 'ark' && sea > -1e8 && RS.START_SHORE !== false) { const sm = (a, b, x) => { const u = RS.clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
    for (let j = Math.round(380 / 4); j <= Math.round(1160 / 4); j++) { const x = j * 4, i = j % N, k = sm(380, 540, x) * (1 - sm(1000, 1160, x)), dip = Math.exp(-(((x - 770) / 48) ** 2)), tg = sea + 26 - 30 * dip, nh = h[i] * (1 - k) + tg * k; h[i] = Math.abs(x - 770) < 130 ? nh : Math.max(h[i], nh); } }
  for (let i = 0; i < N; i++) if (!isFinite(h[i])) h[i] = 0;
  if (gas) h.fill(RS.Planet.GAS_FLOOR);   // v0.6 cloud world: a flat safety floor far below the cloud deck (nothing falls forever)
  const P = { R, N, h, sea: gas ? 0 : sea, seed, type, gas, kind: K0, cx: 0, cy: R, amp, body };
  P.idx = th => { const u = ((th / TAU) % 1 + 1) % 1 * N; return u; };
  P.height = th => { const u = P.idx(th), i = Math.floor(u), f = u - i; return h[i % N] * (1 - f) + h[(i + 1) % N] * f; };
  P.theta = (x, y) => Math.atan2(x - P.cx, P.cy - y);
  P.surf = th => { const rr = R + P.height(th); return [P.cx + Math.sin(th) * rr, P.cy - Math.cos(th) * rr]; };
  P.seaR = R + P.sea;   // v0.6: on a cloud world this is the cloud deck (the top of the breathable cloud)
  P.top = gas ? th => [P.cx + Math.sin(th) * R, P.cy - Math.cos(th) * R] : P.surf;   // where things stand / float: the deck on cloud worlds, the ground elsewhere
  // biome from latitude (theta 0 = north pole on this great circle), temperature, moisture
  P.lat = th => Math.abs(Math.sin(th));   // 1 at poles (theta 0 = equator, top of the map)
  P.biome = th => { const hh = P.height(th), t = (body.temp || .5) - P.lat(th) * .45 - Math.max(0, hh) / 2000, m = RS.fbm(seed + 21, Math.cos(th) * 4, Math.sin(th) * 4, 3);
    if (gas) return 'cloud'; if (hh < sea) return t < .12 ? 'ice' : 'ocean'; if (t < .15) return 'ice'; if (hh > amp * .9) return 'peak'; if (t > .75 && m < .45) return 'desert'; if (m > .55 && t > .3) return 'lush'; return type === 'icy' ? 'tundra' : 'rock'; };
  P.BIOME_COL = { ocean: [40, 90, 150], ice: [220, 235, 245], peak: [200, 200, 210], desert: [205, 170, 110], lush: [70, 130, 80], rock: [120, 105, 95], tundra: [160, 175, 180], cloud: [210, 180, 140] };
  // landmarks: deterministic special spots (tall spires, arches, geysers, natural-life site)
  P.landmarks = []; for (let k = 0; k < (gas ? 2 : r.int(4, 9)); k++) P.landmarks.push({ th: r.range(0, TAU), kind: r.pick(gas ? ['storm', 'vortex'] : ['spire', 'crystal', 'geyser', 'arch', 'bones']), size: r.range(.6, 1.6) });
  P.chunkOf = th => Math.floor(((th / TAU) % 1 + 1) % 1 * TAU * R / 1200);
  P.nChunks = Math.ceil(TAU * R / 1200);
  P.chunkTh = c => (c + .5) * 1200 / R;
  return P; };
RS.Planet.GROUNDLESS = true;   // v0.6: gas giants are cloud worlds with floating creatures (kinds marked groundless)
RS.Planet.GAS_FLOOR = -1400;
RS.Planet.KIND = { rocky: { amp: 420 }, ocean: { amp: 340 }, icy: { amp: 260 }, gas: { amp: 180, giant: true, groundless: true }, ringed: { amp: 180, giant: true, groundless: true }, ark: { amp: 420 } };
})(typeof window !== 'undefined' ? window : globalThis);
