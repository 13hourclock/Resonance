'use strict';
// Space: a seeded spiral galaxy of systems; each system a star + Keplerian bodies whose periods are rhythmic multiples of the world bar.
// Deterministic from (universe seed, system index). Pure (no DOM).
(function (G) {
const RS = G.RS, TAU = RS.TAU;
RS.NSYS = 480; RS.LIFE_ODDS = 1 / 300;
RS.Universe = function (useed) {
  const U = { seed: useed, systems: [] }, r = RS.rng(RS.hash('galaxy', useed)), arms = 2 + r.int(0, 2), twist = r.range(3, 5.5), rot = r.range(0, TAU);
  U.arms = arms; U.twist = twist; U.rot = rot; U.hue = r.range(180, 320);
  for (let i = 0; i < RS.NSYS; i++) { const q = RS.rng(RS.hash('sys', useed, i)); let x, y;
    if (i === 0) { x = .42 * Math.cos(rot + .6); y = .42 * Math.sin(rot + .6); }   // home system: always the same place in a universe
    else { const arm = q.int(0, arms - 1), d = Math.pow(q(), .7), a = rot + arm * TAU / arms + d * twist + q.gauss() * .18 * (1.2 - d); x = d * Math.cos(a) + q.gauss() * .03; y = d * Math.sin(a) + q.gauss() * .03; }
    // star temperature: cool stars common (rough IMF), hot rare
    const T = i === 0 ? 5600 : Math.round(2800 + Math.pow(q(), 2.4) * 11000), lum = Math.pow(T / 5800, 4) * (i === 0 ? 1 : q.range(.6, 1.4)), sseed = RS.hash('sseed', useed, i);
    U.systems.push({ i, seed: sseed, x, y, T, lum, rgb: RS.bbRGB(T), wl: RS.starWl(T), size: .7 + Math.min(2.5, Math.sqrt(lum)) * .5, lifeRoll: q() }); }
  U.sys = i => U.systems[i];
  return U; };
// S8 galaxy personality, emergent from its physical makeup: the star population (hot/cool fractions), spiral shape (arms, twist),
// a seeded metallicity. Hot, young galaxies lean bright (lydian/major/pentatonic), old cool ones dark (dorian/minor/hirajoshi);
// tight spirals swing more; metal-rich galaxies make ringing materials; few arms = spacious reverb. Continuous, not themed.
RS.galaxyPersona = U => { const n = U.systems.length, hot = U.systems.filter(s => s.T > 7000).length / n, cool = U.systems.filter(s => s.T < 4000).length / n, r = RS.rng(RS.hash('persona', U.seed));
  const metal = RS.clamp(.25 + hot * 1.4 + r() * .3, 0, 1), bright = RS.clamp((hot * 2.2 - cool * .9) + .45 + (r() - .5) * .2, 0, 1);
  const BRIGHT = [5, 2, 0, 9, 6, 10], DARK = [4, 3, 1, 8, 12, 7], pool = []; BRIGHT.forEach((sc, i) => pool.push([sc, bright * (1 - i * .12)])); DARK.forEach((sc, i) => pool.push([sc, (1 - bright) * (1 - i * .12)]));
  return { hot: +hot.toFixed(3), cool: +cool.toFixed(3), metal: +metal.toFixed(2), bright: +bright.toFixed(2), swing: +RS.clamp(.03 + (U.twist - 3) / 2.5 * .14, .03, .17).toFixed(3), space: +RS.clamp(1.2 - U.arms * .2, .3, 1).toFixed(2), pool }; };
RS.pickScale = (persona, r) => { const tot = persona.pool.reduce((a, p) => a + p[1], 0); let u = r() * tot; for (const [sc, w] of persona.pool) { u -= w; if (u <= 0) return sc; } return persona.pool[0][0]; };
// planet types & their physics
RS.PTYPES = { rocky: { col: [150, 120, 100], wet: .1, rho: 1 }, ocean: { col: [60, 120, 190], wet: 1, rho: .9 }, icy: { col: [200, 225, 240], wet: .5, rho: .6 }, gas: { col: [210, 170, 120], wet: 0, rho: .25 }, ringed: { col: [220, 200, 150], wet: 0, rho: .25 }, ark: { col: [120, 170, 150], wet: .55, rho: 1.4 } };
RS.MULTS = [2, 3, 4, 6, 8, 12, 16, 24];   // orbital periods in bars
RS.System = function (U, i, M) {
  const s = U.sys(i), r = RS.rng(s.seed), S = { i, star: s, bodies: [], seed: s.seed, home: i === 0 };
  const starMass = Math.pow(s.T / 5800, 1.6), n = i === 0 ? 4 : 1 + r.int(0, 5);
  const used = new Set(); let mi = 0;
  for (let k = 0; k < n; k++) { mi = Math.min(RS.MULTS.length - 1, mi + (k === 0 ? r.int(0, 1) : r.int(1, 2))); if (used.has(mi)) continue; used.add(mi);
    const mult = RS.MULTS[mi], aAU = Math.cbrt(starMass * mult * mult) * .5;   // Kepler III: a^3 ∝ M P^2
    const temp = RS.clamp(Math.sqrt(Math.sqrt(s.lum)) / Math.sqrt(aAU) * .45, 0, 1.2);   // ~equilibrium temperature, 0 cold .. 1 hot
    let type; if (i === 0 && k === 1) type = 'ocean'; else if (temp > .85) type = 'rocky'; else if (temp > .38) type = r() < .45 ? 'ocean' : 'rocky'; else if (temp > .22) type = r() < .5 ? 'icy' : (r() < .5 ? 'gas' : 'ringed'); else type = r() < .5 ? 'gas' : r() < .5 ? 'ringed' : 'icy';
    const big = type === 'gas' || type === 'ringed', size = big ? r.range(2.2, 4) : r.range(.6, 1.4), P = { k, kind: 'planet', type, mult, a: aAU, e: r.range(0, .12), w: r.range(0, TAU), M0: r.range(0, TAU), size, temp, seed: RS.hash('planet', s.seed, k), moons: [] };
    P.g = RS.clamp(size * RS.PTYPES[type].rho * 700, 250, 1600); P.wet = RS.PTYPES[type].wet; P.atmo = type === 'rocky' ? r.range(0, .5) : r.range(.4, 1);
    P.col = RS.PTYPES[type].col.map(c => RS.clamp(c + r.range(-30, 30), 0, 255)); P.rings = type === 'ringed' || (big && r() < .2);
    const nm = big ? r.int(0, 3) : r.int(0, 1); for (let m = 0; m < nm; m++) P.moons.push({ kind: 'moon', k: m, beats: [1, 2, 3, 4, 6][r.int(0, 4)] * 2, d: size * (1.6 + m * .9) + 1, size: r.range(.18, .4), M0: r.range(0, TAU), seed: RS.hash('moon', P.seed, m), type: r() < .5 ? 'icy' : 'rocky' });
    if (i === 0 && k === 1) { P.moons = [{ kind: 'moon', k: 0, beats: 8, d: 2.6, size: .45, M0: 0, seed: RS.hash('ark'), type: 'ark', ark: true }]; P.home = true; }
    S.bodies.push(P); }
  // comet: eccentric water/ice body
  if (r() < .6) S.comet = { kind: 'comet', mult: 16, a: Math.cbrt(starMass * 256) * .5, e: .78, w: r.range(0, TAU), M0: r.range(0, TAU), size: .25, wet: 1 };
  if (r() < .5) S.belt = { a: (S.bodies[Math.floor(S.bodies.length / 2)] || { a: 1.5 }).a * 1.35, n: 90, seed: RS.hash('belt', s.seed) };
  // life: very rare, and only on a wet, lit, temperate world
  S.habitable = S.bodies.filter(b => b.wet >= .5 && b.temp > .3 && b.temp < .8);
  S.life = i !== 0 && s.lifeRoll < RS.LIFE_ODDS && S.habitable.length > 0; if (S.life) S.lifeBody = S.habitable[0].k;
  S.starMass = starMass;
  return S; };
// Kepler: position of a body at audio time t (bars from the music clock), solving M = E - e sin E
RS.kepler = (b, t, barDur) => { const P = b.mult * barDur, Mn = b.M0 + TAU * t / P, e = b.e || 0; let E = Mn; for (let k = 0; k < 6; k++) E -= (E - e * Math.sin(E) - Mn) / (1 - e * Math.cos(E));
  const xo = b.a * (Math.cos(E) - e), yo = b.a * Math.sqrt(1 - e * e) * Math.sin(E), c = Math.cos(b.w || 0), s = Math.sin(b.w || 0); return [xo * c - yo * s, xo * s + yo * c, ((Mn % TAU) + TAU) % TAU]; };
RS.moonPos = (m, t, beatDur) => { const a = m.M0 + TAU * t / (m.beats * beatDur); return [Math.cos(a) * m.d, Math.sin(a) * m.d, ((a % TAU) + TAU) % TAU]; };
// orbit nudging: a new radius re-quantises to the nearest rhythmic period (Kepler III gives the radius back)
RS.snapOrbit = (S, aWanted) => { let best = RS.MULTS[0], bd = 1e9; for (const m of RS.MULTS) { const a = Math.cbrt(S.starMass * m * m) * .5, d = Math.abs(Math.log(a / aWanted)); if (d < bd) { bd = d; best = m; } } return { mult: best, a: Math.cbrt(S.starMass * best * best) * .5 }; };
RS.envOf = (S, b, mods = {}) => { const s = S.star; return { starWl: s.wl, T: s.T, bright: RS.clamp(Math.sqrt(s.lum) / (b.a || 1) * (1 + (mods.light || 0) * .3), 0, 3), g: b.g || 600, wet: RS.clamp((b.wet || 0) + (mods.water || 0) * .1, 0, 1), temp: b.temp, type: b.type }; };
// creature habitability fit: genes vs world
RS.fitOf = (P, env) => { const a = 1 - Math.min(1, Math.abs(P.wl - env.starWl) / 220), b = 1 - Math.min(1, Math.abs(P.stiff - RS.clamp(env.g / 1400, .3, .95)) * 1.4 * (P.life ? 1 - P.life.gravTol * .6 : 1)), c = (P.style === 'swim' || P.style === 'float') ? env.wet : 1 - Math.max(0, env.wet - .6),
  d = 1 - Math.min(1, Math.abs((env.temp == null ? .5 : env.temp) - (.35 + P.mass * .2)) * 1.6 * (P.life ? 1 - P.life.tempTol * .6 : 1)), e = RS.clamp(env.bright == null ? 1 : env.bright, 0, 1.2) / 1.2 * (1 - P.beh.night * .5) + P.beh.night * .5;
  return RS.clamp(a * .25 + b * .2 + c * .2 + d * .2 + e * .15, 0, 1); };
})(typeof window !== 'undefined' ? window : globalThis);
