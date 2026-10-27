'use strict';
// Perceptual palettes (OKLab/OKLCH) derived from physics, and the colour<->sound mapping used everywhere.
(function (G) {
const RS = G.RS, TAU = RS.TAU;
const lin = c => (c /= 255) <= .04045 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4), gam = c => 255 * (c <= .0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - .055);
RS.rgb2oklab = ([r, g, b]) => { r = lin(r); g = lin(g); b = lin(b); const l = Math.cbrt(.4122214708 * r + .5363325363 * g + .0514459929 * b), m = Math.cbrt(.2119034982 * r + .6806995451 * g + .1073969566 * b), s = Math.cbrt(.0883024619 * r + .2817188376 * g + .6299787005 * b);
  return [.2104542553 * l + .793617785 * m - .0040720468 * s, 1.9779984951 * l - 2.428592205 * m + .4505937099 * s, .0259040371 * l + .7827717662 * m - .808675766 * s]; };
RS.oklab2rgb = ([L, a, b]) => { const l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, -.0041960863 * l - .7034186147 * m + 1.707614701 * s].map(v => RS.clamp(gam(v), 0, 255)); };
RS.oklch = (L, Cc, h) => { // gamut-safe: reduce chroma until in sRGB
  for (let k = 0; k < 12; k++) { const a = Cc * Math.cos(h * Math.PI / 180), b = Cc * Math.sin(h * Math.PI / 180), l = (L + .3963377774 * a + .2158037573 * b) ** 3, m = (L - .1055613458 * a - .0638541728 * b) ** 3, s = (L - .0894841775 * a - 1.291485548 * b) ** 3;
    const r = 4.0767416621 * l - 3.3077115913 * m + .2309699292 * s, g = -1.2684380046 * l + 2.6097574011 * m - .3413193965 * s, bl = -.0041960863 * l - .7034186147 * m + 1.707614701 * s;
    if (r >= -.001 && r <= 1.001 && g >= -.001 && g <= 1.001 && bl >= -.001 && bl <= 1.001) return [r, g, bl].map(v => Math.round(RS.clamp(gam(Math.max(0, v)), 0, 255))); Cc *= .85; }
  return RS.oklab2rgb([L, 0, 0]).map(Math.round); };
RS.lch = rgb => { const [L, a, b] = RS.rgb2oklab(rgb); return [L, Math.hypot(a, b), (Math.atan2(b, a) * 180 / Math.PI + 360) % 360]; };
RS.css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
// ---- hue <-> wavelength <-> pitch (OKLCH hue of spectral colours, measured from Bruton wlRGB) ----
const HW = []; for (let wl = 400; wl <= 700; wl += 5) { const [L, Cc, h] = RS.lch(RS.wlRGB(wl)); HW.push([wl, h]); }
// unwrap hue so it is monotonic over the spectrum (red ~30 deg -> violet ~300 deg)
RS.HW = HW; RS.hueWl = h => { h = ((h % 360) + 360) % 360; // purples (non-spectral) fold to the violet end
  let best = 400, bd = 1e9; for (const [wl, hh] of HW) { const d = Math.abs(((hh - h + 540) % 360) - 180); if (d < bd) { bd = d; best = wl; } } return best; };
RS.wlHue = wl => { let best = HW[0]; for (const e of HW) if (Math.abs(e[0] - wl) < Math.abs(best[0] - wl)) best = e; return best[1]; };
// sound -> colour (used for every body): hue from pitch class (via wavelength), lightness from register, chroma from richness
// pitch position p = log2(f/root) mod 1 <-> hue: red (root) -> yellow -> green -> blue -> violet -> purple -> back to red (spectral order of Lensure's 700/wl mapping)
RS.pHue = p => (29 + (((p % 1) + 1) % 1) * 360) % 360; RS.hueP = h => ((((h - 29) / 360) % 1) + 1) % 1;
RS.soundColour = (M, f, rich = .5) => { const o = Math.log2(f / M.rootHz()); const L = RS.clamp(.42 + o * .11, .22, .92), Cc = .04 + RS.clamp(rich, 0, 1) * .13; return RS.oklch(L, Cc, RS.pHue(o)); };
RS.colourSound = (M, rgb) => { const [L, Cc, h] = RS.lch(rgb), p = RS.hueP(h), o = (L - .42) / .11, n = Math.round(o - p); return { f: M.rootHz() * Math.pow(2, n + p), rich: RS.clamp((Cc - .04) / .13, 0, 1), L, Cc, h, p }; };
// ---- palettes ----
RS.HARMONY = ['analogous', 'complementary', 'split', 'triadic', 'tetradic', 'mono'];
RS.palette = (seed, baseRGB, atmoRGB, opt = {}) => { const r = RS.rng(RS.hash('pal', seed)); let [L0, C0, h0] = RS.lch(baseRGB);
  if (atmoRGB) { const [, , ha] = RS.lch(atmoRGB); h0 = (h0 * .55 + ha * .45 + (Math.abs(h0 - ha) > 180 ? 180 : 0)) % 360; }
  h0 = (h0 + r.range(-25, 25) + 360) % 360; const type = opt.type || RS.HARMONY[r.int(0, 5)];
  const off = { analogous: [0, 30, -30, 55], complementary: [0, 180, 15, 195], split: [0, 150, 210, 20], triadic: [0, 120, 240, 20], tetradic: [0, 90, 180, 270], mono: [0, 0, 0, 180] }[type];
  const hues = off.map(o => (h0 + o + 360) % 360), chroma = r.range(.07, .16), dark = r.range(.12, .22);
  const P = { type, h0, hues, chroma, seed };
  P.sky = [RS.oklch(dark, chroma * .5, hues[0]), RS.oklch(dark + .22 + r.range(0, .12), chroma * .7, hues[1 % 4]), RS.oklch(.72, chroma * .5, hues[2])];
  P.ground = [RS.oklch(.3 + r.range(0, .08), chroma * .55, hues[type === 'mono' ? 0 : 2]), RS.oklch(.48, chroma * .5, hues[type === 'mono' ? 0 : 2])];
  P.water = RS.oklch(.55, Math.max(.08, chroma * .8), type === 'mono' ? hues[0] : (hues[1] + 200) % 360 * 0 + 225 + (hues[1] - 225) * .25);
  P.accent = RS.oklch(.78, Math.min(.2, chroma * 1.4), hues[3]); P.ink = RS.oklch(.9, .03, hues[0]);
  P.ramp = k => RS.oklch(RS.clamp(.25 + k * .55, 0, 1), chroma, hues[Math.min(3, Math.floor(k * 4))]);
  P.contrast = Math.abs(RS.lch(P.ink)[0] - RS.lch(P.sky[0])[0]);
  return P; };
// harmony type -> harmonic language of that place
RS.paletteMusic = (M, pal) => { const r = RS.rng(RS.hash('pm', pal.seed)); const T = pal.type;
  const pick = a => a[r.int(0, a.length - 1)];
  if (T === 'analogous') { M.scale = pick([4, 6, 5]); M.prog = pick([[0, 1, 0, 6], [0, 6, 3, 0], [0, 1, 3, 1]].map(p => p.map(x => x % 7))); }
  else if (T === 'complementary') { M.scale = pick([2, 7]); M.prog = pick([[0, 3, 4, 0], [5, 3, 4, 0], [0, 5, 3, 4]]); }
  else if (T === 'split') { M.scale = pick([0, 1, 8]); M.prog = pick([[0, 2, 3, 2], [0, 3, 1, 4]]); }
  else if (T === 'triadic') { M.scale = pick([2, 3]); M.prog = pick([[0, 3, 4, 3], [0, 4, 5, 3], [0, 3, 4, 4]]); }
  else if (T === 'tetradic') { M.scale = pick([2, 10, 5]); M.prog = pick([[0, 5, 1, 4], [0, 2, 5, 4]]); }
  else { M.scale = pick([9, 0, 1, 11]); M.prog = [0, 0, 3, 0]; }
  // hue of the base colour -> tonic pitch class (via its wavelength)
  M.root = Math.round(RS.hueP(pal.h0) * 12) % 12; M.dyn = RS.clamp(pal.contrast, .3, 1); M.harmony = T; return M; };
})(typeof window !== 'undefined' ? window : globalThis);
