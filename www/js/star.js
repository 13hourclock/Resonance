'use strict';
// Star physics -> tempo and polyrhythm, from (scaled) REAL stellar periods. Each star gets: a solar-like oscillation frequency
// nu_max = 3090 uHz * (g/g_sun) / sqrt(T/5777) (asteroseismic scaling), a rotation period, a pulsation class by temperature
// (delta Scuti, RR Lyrae, beta Cephei, Mira, or solar-like p-modes), and sometimes a binary companion (orbital period, eclipses).
// Periods are octave-folded (x 2^k, the usual sonification move) into the musical range: nu_max -> the world tempo; the
// rotation : pulsation ratio -> a Euclidean polyrhythm against the bar; the binary orbit -> a second cross-rhythm + eclipses.
(function (G) {
const RS = G.RS, DAY = 86400;
const fold = (hz, lo, hi) => { if (!(hz > 0) || !Number.isFinite(hz) || !(hi > lo)) return lo; let g = 0; while (hz < lo && g++ < 64) hz *= 2; g = 0; while (hz >= hi && g++ < 64) hz /= 2; return hz; };
const SIMPLE = [[1, 1], [5, 4], [4, 3], [3, 2], [5, 3], [7, 4], [2, 1]];
const nearestRatio = r => { let b = SIMPLE[0], bd = 1e9; for (const q of SIMPLE) { const d = Math.abs(Math.log(r / (q[0] / q[1]))); if (d < bd) { bd = d; b = q; } } return b; };
RS.euclid = (k, n) => { const out = []; for (let i = 0; i < n; i++) out.push(Math.floor((i + 1) * k / n) - Math.floor(i * k / n)); return out; };   // k onsets spread over n steps
RS.StarPhys = (star, seed) => { const r = RS.rng(RS.hash('starphys', seed >>> 0)), T = star.T, M = Math.pow(T / 5800, 1.6) * (star.i === 0 ? 1 : 1), Rr = Math.pow(Math.max(.08, M), .8), g = M / (Rr * Rr);
  const numax = 3090e-6 * g / Math.sqrt(T / 5777);   // Hz (Sun ~ 3.1 mHz, a 5-minute oscillation)
  let rotD; if (star.i === 0) rotD = 25.4; else if (T > 7000) rotD = r.range(.5, 2.5); else if (T > 5000) rotD = r.range(10, 35); else rotD = r() < .2 ? r.range(1, 5) : r.range(15, 80);
  let puls; const u = r(); if (star.i === 0) puls = { kind: 'solar', Pd: 1 / numax / DAY };
  else if (T > 10000 && u < .5) puls = { kind: 'betaCep', Pd: r.range(.1, .3) }; else if (T > 6500 && T < 8500 && u < .6) puls = { kind: 'deltaScuti', Pd: r.range(.03, .2) };
  else if (T > 6000 && T < 7500 && u < .25) puls = { kind: 'RRLyrae', Pd: r.range(.4, .8) }; else if (T < 3500 && u < .3) puls = { kind: 'Mira', Pd: r.range(150, 450) }; else puls = { kind: 'solar', Pd: 1 / numax / DAY };
  const binary = star.i !== 0 && r() < .35 ? { Pd: Math.exp(r.range(Math.log(1), Math.log(1000))), q: r.range(.2, 1), ecl: r() < .3, T2: Math.round(T * r.range(.5, 1)) } : null;
  const bpm = Math.round(fold(numax, 72 / 60, 144 / 60) * 60), fRot = 1 / (rotD * DAY), fPul = 1 / (puls.Pd * DAY);
  const poly = nearestRatio(fold(fPul / fRot, 1, 2)), cross = binary ? nearestRatio(fold((1 / (binary.Pd * DAY)) / fRot, 1, 2)) : null;
  // per bar of 16 steps: pulsation = the steady pulse (every beat); rotation = poly[0] onsets per poly[1] beats spread euclidean over the bar
  const rotN = RS.clamp(Math.round(4 * poly[0] / poly[1]), 2, 9), binN = cross ? RS.clamp(Math.round(4 * cross[0] / cross[1]) + 1, 3, 11) : 0;
  // eclipse cadence: orbital period folded into 4..16 bars
  const eclBars = binary && binary.ecl ? [4, 8, 16][Math.floor(r() * 3)] : 0;
  return { T, numax, numaxUHz: +(numax * 1e6).toFixed(1), rotD: +rotD.toFixed(2), puls, binary, bpm, poly, cross, rotN, binN, rotPat: RS.euclid(rotN, 16), binPat: binN ? RS.euclid(binN, 16).map((v, i, a) => a[(i + 3) % 16]) : null, eclBars }; };
// star voice: called once per 16th step by the surface. Quiet, low, on the grid, in key (the gate places it); the sky star throbs with it.
// (v0.3.1) RS.StarVoice removed: the star no longer plays a pulse over the ohms; its period seeds the ohms' starting tempo only.
})(typeof window !== 'undefined' ? window : globalThis);
