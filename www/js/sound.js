'use strict';
// Sound IS the physics: each body's modes come from its live geometry and material; excitation = real impulse at a real point.
// Pure mapping (no DOM): RS.Sound(world, music) -> { modesOf(body), strike(body, x, y, v, opts) -> note spec }.
(function (G) {
const RS = G.RS;
const BAR = [1, 2.756, 5.404, 8.933, 13.34], CANT = [1, 6.267, 17.55, 34.39], BESSEL = [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501];
RS.Sound = function (W, M) {
  const S = { stats: { strikes: 0, auto: 0 } };
  // physical fundamental and mode ratios from geometry
  S.physics = b => { const x = W.x, y = W.y; let f0, ratios, decay, shape, kind;
    const anchored = b.pins.length + ((b.links && b.links.length) || 0);
    if (b.kind === 'rod') { const L = Math.max(20, W.length(b)), h = b.thick || 4, st = W.stretch(b) / (b.tension || 1), T = Math.max(.05, 1 + (st - 1) * 4) / 1.44 * (.5 + b.mat.stiff * .55);
      if (anchored >= 2 && h < 7) { kind = 'string'; f0 = 196 * (300 / L) * Math.sqrt(T); const B = h * h * 2e-5; ratios = [1, 2, 3, 4, 5, 6, 7, 8].map(n => n * Math.sqrt(1 + B * n * n)); decay = 2.6 * (1 - b.mat.damp * 40); shape = 'sin'; }
      else if (anchored === 1) { kind = 'tine'; f0 = 1.18e6 * h / (L * L) * .16 * (1 + (st - 1) * 6); ratios = CANT; decay = 2.2; shape = 'cant'; }
      else { kind = anchored >= 2 ? 'clampbar' : 'bar'; f0 = 1.18e6 * h / (L * L) * (anchored >= 2 ? 1.2 : 1) * (1 + (st - 1) * 6); ratios = BAR; decay = 1.6; shape = 'bar'; } }
    else if (b.kind === 'blob' || b.kind === 'creature') { const A = Math.abs(W.area(b)), R = Math.sqrt(A / Math.PI) || 10, st = W.stretch(b) / (b.tension || 1), p = (b.mat.pressure || 1) * (b.inflate || 1), T = Math.max(.1, p * (.4 + (st - 1) * 20 + b.mat.stiff * .6));
      kind = 'drum'; f0 = 92 * (100 / R) * Math.sqrt(T) * (anchored ? 1.08 : 1); ratios = BESSEL; decay = .35 + .9 * b.mat.stiff * Math.min(1.4, p); shape = 'mem'; }
    else { kind = 'water'; f0 = 600; ratios = [1]; decay = .08; shape = 'none'; }
    if (b.mat && b.mat.density != null) f0 /= Math.sqrt(.6 + b.mat.density * .8);
    if (b.rowBar && (kind === 'bar' || kind === 'clampbar')) ratios = [1, 4, 9.9];   /* v0.8a6 P6: a marimba row's bars are tuned 1:4:9.9 (P0-c) */
    f0 = RS.Shapes ? RS.Shapes.softLimit(f0) : RS.clamp(f0, 28, 4200);   /* v0.8a5 P2 (Q116): order-preserving soft limit into E1-C7 (was: clamp 28-4200 Hz) */ return { f0, ratios, decay: Math.max(.08, decay), shape, kind }; };
  // position of the strike along the body (0..1) or radially (0 centre ..1 rim)
  S.where = (b, X, Y) => { if (b.closed) { const [cx, cy] = W.center(b), R = Math.sqrt(Math.abs(W.area(b)) / Math.PI) || 1; return RS.clamp(Math.hypot(X - cx, Y - cy) / R, 0, 1); }
    let best = 0, bd = 1e9; b.idx.forEach((i, k) => { const d = (W.x[i] - X) ** 2 + (W.y[i] - Y) ** 2; if (d < bd) { bd = d; best = k; } }); return b.idx.length > 1 ? best / (b.idx.length - 1) : .5; };
  // tuning: physical pitch, gently pulled into the session key (deep: free when over-stretched past the snap point)
  S.tieTune = null; S.tune = (b, f, t, chord) => { if (b.free || M.free) return f; const tf = S.tieTune && b.kind === 'rod' ? S.tieTune(b, f) : 0; if (tf > 0) return tf; const sf = b.drawn && S.shapeTune ? S.shapeTune(b, f, t, chord) : 0; return sf > 0 ? sf : M.snap(f, { t, chord }); };   /* v0.8a5 P2 (Q117): drawn shapes: nearest jam -> regional key -> session key */   /* v0.8a4 D: a tied string sounds in its jam's notes (jam.js J.tieTune); else the session key as before */
  // ---- S1: continuous material timbre (no presets). Every body carries a continuous material vector:
  //  rigid (0..1, 'stiff' in the vector) bending rigidity -> inharmonic stretch of partials (string-like .. bar-like continuum); hard (0..1) surface hardness -> brightness + click;
  //  loss (0..1) internal friction -> overall decay AND how much faster upper modes die (metal-like ring .. clay-like thud);
  //  grain (0..1) micro-structure -> detuned twin partials (beating, shimmer, rasp); density (0..1) -> pitch drop + longer low ring.
  // Geometry still chooses the base mode family; the material moves it continuously between families.
  S.MAT0 = { stiff: .3, hard: .55, loss: .45, grain: .05, density: .4 };
  S.matv = b => { const m = b.mat || {}; return { stiff: m.rigid != null ? m.rigid : RS.clamp((m.bendK || m.bend || .3) * .35, 0, .6), hard: m.hard == null ? RS.clamp((m.stiff == null ? .8 : m.stiff) * .7, 0, 1) : m.hard, loss: m.loss == null ? .45 : m.loss, grain: m.grain || 0, density: m.density == null ? RS.clamp((m.mass || 1) / 4, 0, 1) : m.density }; };
  S.timbre = (modes, mv, f0) => { const out = []; const inh = Math.pow(mv.stiff, 3) * .9 * (1 - mv.loss * .3), lossExp = .25 + mv.loss * 1.4, dScale = (2.2 - mv.loss * 1.85) * (.8 + mv.density * .5), tilt = 1.6 - mv.hard * 1.3;
    const nb = mv.grain > .02 ? Math.min(modes.length, 6) : modes.length; for (let n = 0; n < nb; n++) { const m = modes[n], r = m.f / f0, rs = r * (1 + inh * .012 * Math.max(0, r - 1) * Math.max(0, r - 1) / (1 + r * .08));
      out.push({ f: f0 * rs, a: m.a / Math.pow(Math.max(1, rs), tilt * .5), d: m.d * dScale / Math.pow(Math.max(1, rs), lossExp * .5) });
      if (mv.grain > .02 && n < 2) out.push({ f: f0 * rs * (1 + mv.grain * .018 * (n + 1)), a: m.a * mv.grain * .7, d: m.d * dScale * (1 - mv.grain * .5) }); }
    return out.slice(0, 8); };
  S.centroid = modes => { let s = 0, w = 0; for (const m of modes) { s += m.f * m.a; w += m.a; } return w ? s / w : 0; };
  S.strike = (b, X, Y, v, o = {}) => { const ph = S.physics(b), u = S.where(b, X, Y), t = o.t || 0; let f0 = S.tune(b, ph.f0, t, o.chord); const vel = RS.clamp(v / 900, .02, 1); let hard = RS.clamp(o.hard == null ? vel : o.hard, 0, 1);
    const modes = []; ph.ratios.slice(0, 8).forEach((r, n) => { let w; const k = n + 1;
      if (ph.shape === 'sin') w = Math.abs(Math.sin(k * Math.PI * RS.clamp(u, .04, .96))) / Math.pow(k, 1.2 - hard * .5);
      else if (ph.shape === 'mem') w = n === 0 ? (1 - u * u * .7) : Math.min(1, u * 1.3) / Math.pow(k, .8 - hard * .3);
      else if (ph.shape === 'cant') w = 1 / Math.pow(k, 1.8 - hard);
      else w = (n === 0 ? 1 : Math.abs(Math.cos(k * Math.PI * u)) * .8 + .2) / Math.pow(k, 1.3 - hard * .6);
      // shadow muffles the upper modes; light adds clarity
      if (b.shadow) w *= Math.pow(.45, n * .6);
      modes.push({ f: f0 * r, a: w, d: ph.decay / Math.pow(r, .55) * (b.held ? .05 : 1) }); });
    { const mv = S.matv(b); const tm = S.timbre(modes, mv, f0); modes.length = 0; tm.forEach(m => modes.push(m)); if (o.hard == null) hard = RS.clamp(hard * (.55 + mv.hard * .9), 0, 1); }
    // light on the body: a sympathetic partial at the light's pitch (Lensure wavelength -> pitch), folded into the body's register
    if (b.light && b.light.I > .05 && modes.length < 8) { let lf = M.wlHz(b.light.wl || 550); if (!(lf > 0 && isFinite(lf)) || !(f0 > 0 && isFinite(f0))) lf = 0; else { lf = f0 * Math.pow(2, ((Math.log2(lf / f0) % 2) + 2) % 2); } if (lf) modes.push({ f: M.free ? lf : M.snap(lf), a: .35 * Math.min(1, b.light.I * 2), d: ph.decay * 1.4 }); }
    const sum = modes.reduce((s, m) => s + m.a, 0) || 1; modes.forEach(m => m.a /= sum);
    const role = M.role(f0, ph.kind === 'drum' && f0 < 160), lvl = (RS.ROLES[role] || { lvl: .8 }).lvl;
    S.stats.strikes++; return { modes, gain: vel * .5 * lvl * (o.gain || 1), click: hard * (ph.kind === 'drum' ? .25 : .12), att: .0015 + (1 - hard) * .006, pan: o.pan || 0, send: o.send == null ? .28 : o.send, body: b.id, prio: o.prio || 1, f0, kind: ph.kind, role }; };
  // water: Minnaert bubble (f ~ 3.26 m/s / r), rising chirp
  // friction voices (unthemed sound variety): smooth/clear surfaces BOW (sustained body modes, slow attack, speed -> loudness + slight pitch lift);
  // rough/dense surfaces SCRAPE (dense inharmonic cluster, short decays, centroid rises with speed); ground slides CRACKLE by biome/material.
  S.rub = (b, other, X, Y, speed, o = {}) => { const ph = S.physics(b), smooth = (b.mat.clear || 0) > .55 || (other && (other.mat.clear || 0) > .55), f0 = S.tune(b, ph.f0, o.t || 0), sp = RS.clamp(speed / 600, 0, 1);
    if (smooth) return { modes: ph.ratios.slice(0, 5).map((r, n) => ({ f: f0 * r * (1 + sp * .004), a: 1 / Math.pow(n + 1, 1.1), d: .5 + sp * .6 })), gain: .05 + sp * .1, att: .05 + (1 - sp) * .06, vib: .003, vibR: 5, send: .45, body: b.id, prio: .6, kind: 'bow' };
    const r = RS.rng(Math.floor(X * 13 + Y * 7 + speed)), fc = 900 + sp * 3200 * (1 - (b.mat.stiff || .5) * .3), modes = []; for (let k = 0; k < 7; k++) modes.push({ f: fc * (.4 + r() * 1.6), a: .3 + r(), d: .02 + r() * .05 });
    return { modes, gain: .025 + sp * .07, att: .001, click: .3 + sp * .4, send: .15, body: b.id, prio: .4, kind: 'scrape' }; };
  S.crackle = (b, biome, speed) => { const sp = RS.clamp(speed / 500, 0, 1), base = { sand: 1400, snow: 600, ice: 2600, rock: 2000, grass: 900 }[biome] || 1500, r = RS.rng(Math.floor(speed * 31) ^ (b ? b.id : 0)), modes = [];
    for (let k = 0; k < 6; k++) modes.push({ f: base * (.5 + r() * 1.5) * (1 + sp * .5), a: .2 + r(), d: biome === 'ice' ? .15 : .012 + r() * .03 }); return { modes, gain: .02 + sp * .06, att: .001, click: biome === 'tundra' || biome === 'lush' ? .15 : .5, send: .12, prio: .3, kind: 'crackle' }; };
  S.bubble = (r, v) => { const f = RS.clamp(3260 / Math.max(1.5, r), 300, 3200); return { modes: [{ f: M.free ? f : M.snap(f), a: 1, d: .05 + .03 * Math.random() }], gain: RS.clamp(v / 1500, .02, .22), glide: 1.8, att: .002, send: .4, prio: .4 }; };
  // creature voice: formant-weighted harmonics of a size-derived f0, motif degree on top
  S.voice = (P, deg, o = {}) => { const base = M.free ? P.f0 : M.snap(P.f0); let f0 = M.free ? base * Math.pow(2, deg / 7) : M.degHz(M.nearestDeg(base) + deg, o.chord || 0); const modes = [];
    for (let k = 1; k <= 8; k++) { const f = f0 * k, w = 1.5 * Math.exp(-(((f - P.F1) / (P.F1 * .32)) ** 2)) + .9 * Math.exp(-(((f - P.F2) / (P.F2 * .25)) ** 2)) + .1 / k;   /* sharper formants: vowel colour genes are clearly audible */ modes.push({ f, a: w * (k > 3 ? P.bright : 1), d: P.vdecay * (o.len || 1) / Math.sqrt(k) }); }
    const s = modes.reduce((a, m) => a + m.a, 0); modes.forEach(m => m.a /= s); return { modes, gain: (o.gain || .25), att: .02 + P.breath * .05, vib: P.vib, vibR: P.vibR, glide: P.glideV, click: P.breath * .05, send: .4, pan: o.pan || 0, body: o.body || 0, prio: .8, f0 }; };
  return S; };
})(typeof window !== 'undefined' ? window : globalThis);
