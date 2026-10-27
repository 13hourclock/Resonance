'use strict';
// Music layer, re-derived from Lensure (core.js scales, merge31 progressions/chord snapping, v34m clock/swing/roles/rests).
// Pure: feed it times (audio clock seconds) and physical frequencies; it returns in-key frequencies and grid times.
(function (G) {
const RS = G.RS;
const R2C = r => 1200 * Math.log2(r);
RS.SCALES = [
  { n: 'Pentatonic', c: [0, 200, 400, 700, 900] }, { n: 'Minor pent', c: [0, 300, 500, 700, 1000] },
  { n: 'Major', c: [0, 200, 400, 500, 700, 900, 1100] }, { n: 'Natural minor', c: [0, 200, 300, 500, 700, 800, 1000] },
  { n: 'Dorian', c: [0, 200, 300, 500, 700, 900, 1000] }, { n: 'Lydian', c: [0, 200, 400, 600, 700, 900, 1100] },
  { n: 'Mixolydian', c: [0, 200, 400, 500, 700, 900, 1000] }, { n: 'Harmonic minor', c: [0, 200, 300, 500, 700, 800, 1100] },
  { n: 'Hirajoshi', c: [0, 200, 300, 700, 800] }, { n: 'Yo', c: [0, 200, 500, 700, 900] },
  { n: 'Just major', c: [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 15 / 8].map(R2C) }, { n: 'Slendro', c: [0, 240, 480, 720, 960] },
  { n: 'Phrygian', c: [0, 100, 300, 500, 700, 800, 1000] }, { n: 'Locrian', c: [0, 100, 300, 500, 600, 800, 1000] }, { n: 'Melodic minor', c: [0, 200, 300, 500, 700, 900, 1100] },
  { n: 'Whole-tone', c: [0, 200, 400, 600, 800, 1000] }, { n: 'Octatonic', c: [0, 200, 300, 500, 600, 800, 900, 1100] }];
RS.SCALE_FAMILY = ['pent', 'pent', 'diatonic', 'diatonic', 'diatonic', 'diatonic', 'diatonic', 'minor', 'pent', 'pent', 'diatonic', 'pent', 'diatonic', 'diatonic', 'minor', 'sym', 'sym'];
RS.scaleIndexOfMode = m => ({ pentMajor: 0, pentMinor: 1, ionian: 2, aeolian: 3, dorian: 4, lydian: 5, mixolydian: 6, harmonicMinor: 7, phrygian: 12, locrian: 13, melodicMinor: 14, wholeTone: 15, octatonic: 16 })[m];
RS.PROGS = [[0, 4, 5, 3], [0, 5, 3, 4], [0, 3, 4, 3], [5, 3, 0, 4], [0, 2, 3, 4], [0, 0, 3, 4], [0, 5, 1, 4], [3, 4, 0, 0]];
RS.ROLES = { bass: { lo: 40, hi: 165, lvl: .95 }, chords: { lo: 130, hi: 520, lvl: .62 }, melody: { lo: 260, hi: 1560, lvl: .9 }, perc: { lvl: .78 } };
RS.Music = function (seed, persona) {
  const r = RS.rng(RS.hash('music', seed)), M = {};
  M.seed = seed; M.root = r.int(0, 11); M.scale = r.pick([0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 6, 7, 8, 9, 10, 11]);
  M.prog = RS.PROGS[r.int(0, RS.PROGS.length - 1)]; M.bpm = Math.round(r.range(70, 102)); M.swing = r.range(.05, .15); M.free = false; M.t0 = 0;
  if (persona) { const r2 = RS.rng(RS.hash('music-persona', seed)); M.scale = RS.pickScale(persona, r2); M.swing = RS.clamp(persona.swing + (r2() - .5) * .04, .02, .2); M.persona = persona; }   // S8: the galaxy's character shapes each world's music
  M.rootHz = () => 110 * Math.pow(2, M.root / 12);   // A2..G#3
  M.S = () => RS.SCALES[M.scale];
  M.beatDur = () => 60 / M.bpm; M.barDur = () => 4 * M.beatDur(); M.dt16 = () => M.beatDur() / 4;
  M.b16 = t => (t - M.t0) / M.dt16();
  M.bar = t => Math.floor((t - M.t0) / M.barDur());
  // functional harmony: a 16-bar AABA plan (cadences, secondary dominants); 5-note/symmetric scales fall back to the 4-chord loop
  M.tuning = M.scale === 10 ? { sys: 'just', micro: 0 } : { sys: '12tet', micro: 0 }; M.functional = true; M.plan = RS.Theory ? RS.Theory.plan(seed) : null; M.meter = '4/4';
  M.hepta = () => M.S().c.length === 7;
  M.barInfo = t => { const b = M.bar(t); if (M.functional && M.plan && M.hepta()) return M.plan.bars[((b % 16) + 16) % 16]; return { deg: M.prog[((b % 4) + 4) % 4], fn: null, cad: null }; };
  M.chord = t => M.barInfo(t).deg;
  M.chordPcs = t => { const bi = M.barInfo(t), S = M.S().c; if (bi.sec != null && RS.Theory) return RS.Theory.secondaryDom(S, bi.sec); return RS.Theory ? RS.Theory.triad(S, bi.deg).map(c => ((c % 1200) + 1200) % 1200) : [0, 400, 700]; };
  M.cadenceAt = t => { const b = M.bar(t), cur = M.barInfo(t), prev = M.barInfo(t - M.barDur()); return cur.cad ? cur.cad : (RS.Theory && prev.cad && RS.Theory.cadence(prev, cur)) || null; };
  M.tension = t => RS.Theory ? RS.Theory.tension(M.bar(t), Math.floor(((t - M.t0) / M.beatDur()) % 4)) : .5;
  // pivot-chord modulation (used when colonies reconcile / creatures are taught): queued for the next phrase start
  M.modulate = (newRoot, newScale = M.scale) => { if (!RS.Theory) { M.root = newRoot; return null; } const piv = RS.Theory.pivot({ root: M.root, scale: M.S().c }, { root: newRoot, scale: RS.SCALES[newScale].c }); M.pendingMod = { root: newRoot, scale: newScale, piv }; M.mods = (M.mods || 0) + 1; return piv; };
  M.applyMod = () => { if (!M.pendingMod) return false; M.lastShift = M.pendingMod.shift || 0; M.root = M.pendingMod.root; M.scale = M.pendingMod.scale; M.lastPivot = M.pendingMod.piv; M.pendingMod = null; return true; };
  M.degHz = (deg, chord = 0) => { const S = M.S(), n = S.c.length, d = Math.round(deg) + chord, o = Math.floor(d / n), i = ((d % n) + n) % n; return M.rootHz() * Math.pow(2, M.tc(o * 1200 + S.c[i], i) / 1200); };
  M.tc = (cents, deg = 0) => RS.Theory && M.tuning && M.tuning.sys !== '12tet' ? RS.Theory.tune(cents, M.tuning.sys, M.tuning.micro, deg) : cents;
  // nearest scale degree to f (and optionally only chord tones of the current chord)
  M.nearestDeg = (f, chordOnly, t) => { const S = M.S(), n = S.c.length, c = chordOnly ? M.chord(t) : 0; let bd = 1e9, best = 0; const g = Math.log2(f / M.rootHz()) * n;
    for (let d = Math.floor(g) - n - 2; d <= Math.ceil(g) + n + 2; d++) { if (chordOnly) { const k = ((d - c) % n + n) % n; if (k !== 0 && k !== 2 && k !== 4) continue; } const e = Math.abs(Math.log2(M.degHz(d) / f)); if (e < bd) { bd = e; best = d; } } return best; };
  // musical by default: the physical pitch is pulled onto the key; deep option (M.free) leaves physics untouched
  M.snap = (f, opt = {}) => { if (!(f > 0) || M.free || opt.free) return f; const d = M.nearestDeg(f, !!opt.chord, opt.t || 0), g = M.degHz(d), s = opt.strength == null ? 1 : opt.strength; return Math.exp(Math.log(f) + (Math.log(g) - Math.log(f)) * s); };
  M.pc = f => { const n = M.S().c.length; return ((M.nearestDeg(f) % n) + n) % n; };   // scale-degree class
  // grid with swing (odd 16ths late) — the world clock
  M.gridTime = g => M.t0 + (g + (((g % 2) + 2) % 2 ? M.swing : 0)) * M.dt16();
  M.nextGrid = (t, every = 1) => { let g = Math.ceil((t - M.t0) / M.dt16() / every - 1e-6) * every; let tt = M.gridTime(g), gN = 0; while (tt < t - 1e-4 && gN++ < 256) { g += every; tt = M.gridTime(g); } return { g, t: tt }; };
  M.strong = g => ((g % 4) + 4) % 4 === 0;
  M.weight = g => { const w = RS.Theory ? RS.Theory.weights(M.meter) : [4, 1, 2, 1, 3, 1, 2, 1, 3, 1, 2, 1, 3, 1, 2, 1]; return w[((g % w.length) + w.length) % w.length]; };
  M.role = (f, perc) => perc ? 'perc' : f < 140 ? 'bass' : f < 420 ? 'chords' : 'melody';
  // light <-> pitch (Lensure optics: optical octave, f = root * 700/wl)
  M.wlHz = wl => M.rootHz() * 2 * (700 / wl);
  M.hzWl = f => { if (!(f > 0 && isFinite(f))) return 550; let r = Math.pow(2, ((Math.log2(f / M.rootHz()) % 1) + 1) % 1); return RS.clamp(700 / r, 400, 700); };
  M.pcColor = f => RS.wlRGB(M.hzWl(f));
  M.name = () => ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'][(M.root + 9) % 12] + ' ' + M.S().n;
  return M; };
// Bruton wavelength -> rgb (from Lensure optics.js)
RS._rgb = [];
RS.wlRGB = wl => { const k = Math.round(RS.clamp(wl, 380, 780)); if (RS._rgb[k]) return RS._rgb[k]; let r = 0, g = 0, b = 0;
  if (k < 440) { r = (440 - k) / 60; b = 1; } else if (k < 490) { g = (k - 440) / 50; b = 1; } else if (k < 510) { g = 1; b = (510 - k) / 20; } else if (k < 580) { r = (k - 510) / 70; g = 1; } else if (k < 645) { r = 1; g = (645 - k) / 65; } else r = 1;
  const f = k < 420 ? .3 + .7 * (k - 380) / 40 : k > 680 ? .3 + .7 * Math.max(0, 780 - k) / 100 : 1;
  return RS._rgb[k] = [Math.round(255 * Math.pow(r * f, .8)), Math.round(255 * Math.pow(g * f, .8)), Math.round(255 * Math.pow(b * f, .8))]; };
// blackbody colour (approx, Tanner Helland) for star temperatures
RS.bbRGB = T => { const t = T / 100; let r, g, b; r = t <= 66 ? 255 : 329.7 * Math.pow(t - 60, -.1332); g = t <= 66 ? 99.47 * Math.log(t) - 161.1 : 288.1 * Math.pow(t - 60, -.0755); b = t >= 66 ? 255 : t <= 19 ? 0 : 138.5 * Math.log(t - 10) - 305;
  return [r, g, b].map(v => Math.round(RS.clamp(v, 0, 255))); };
// Wien peak, folded into the visible band -> the system's tonal colour
RS.starWl = T => { let wl = 2.898e6 / T; if (!(wl > 0 && isFinite(wl))) return 550; while (wl < 400) wl *= 1.6; while (wl > 700) wl /= 1.4; return wl; };
})(typeof window !== 'undefined' ? window : globalThis);
