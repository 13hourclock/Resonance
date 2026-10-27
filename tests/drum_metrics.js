// Drum-variety metrics (Wilbow 6:56 PM Oct 23: "Most of them sound like high hats, need kick and other varieties").
// Renders one hit offline with RS.Inst.render (no recordings, no files) and classifies it from its sound:
// spectral centroid, low-band share, flatness (noise), decay, attack, dominant pitch and pitch sweep.
const RS = global.RS, SR = 48000;
const fft = (re, im) => { const n = re.length; for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= n; len <<= 1) { const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a); for (let i = 0; i < n; i += len) { let cr = 1, ci = 0; for (let k = 0; k < len / 2; k++) { const ur = re[i + k], ui = im[i + k], vr = re[i + k + len / 2] * cr - im[i + k + len / 2] * ci, vi = re[i + k + len / 2] * ci + im[i + k + len / 2] * cr; re[i + k] = ur + vr; im[i + k] = ui + vi; re[i + k + len / 2] = ur - vr; im[i + k + len / 2] = ui - vi; const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t; } } } };
const spec = (x, off, win, N = 8192) => { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < win && off + i < x.length; i++) re[i] = x[off + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / win)); fft(re, im); const p = new Float64Array(N / 2); for (let k = 0; k < N / 2; k++) p[k] = re[k] * re[k] + im[k] * im[k]; return p; };
const peakHz = (p, lo, hi, N = 8192) => { let bk = 0, bv = -1; for (let k = Math.floor(lo * N / SR); k < Math.min(p.length, hi * N / SR); k++) if (p[k] > bv) { bv = p[k]; bk = k; } return bk * SR / N; };
const feats = x => { const fr = 240, env = []; for (let i = 0; i + fr <= x.length; i += fr) { let s = 0; for (let k = 0; k < fr; k++) s += x[i + k] * x[i + k]; env.push(Math.sqrt(s / fr)); }
  let pk = 0, pi = 0; env.forEach((v, i) => { if (v > pk) { pk = v; pi = i; } }); if (!(pk > 1e-6)) return null;
  let e20 = pi; while (e20 < env.length && env[e20] > pk * .1) e20++; const decay = (e20 - pi) * fr / SR, attack = pi * fr / SR;
  let lastPeaks = 0; for (let i = 2; i < Math.min(env.length - 1, pi + 20); i++) if (env[i] > env[i - 1] * 1.25 && env[i] >= env[i + 1] && env[i] > pk * .3) lastPeaks++;   // re-attacks (claps)
  const on = Math.max(0, pi * fr - 120), p = spec(x, on, 4096), N = 8192; let E = 0, C = 0, lo = 0, lo2 = 0, hi = 0, lg = 0, nb = 0, ar = 0, ph = 0;
  for (let k = 1; k < N / 2; k++) { const f = k * SR / N, v = p[k]; E += v; C += v * f; if (f < 200) lo += v; if (f < 500) lo2 += v; if (f > 5000) hi += v; if (f > 250) ph += v; if (f > 300 && f < 16000) { lg += Math.log(v + 1e-20); ar += v; nb++; } }
  const flat = Math.exp(lg / nb) / (ar / nb + 1e-30), cent = C / E, pkF = peakHz(p, 30, 2400);
  const pE = spec(x, on, 1200), pL = spec(x, on + 2400, 2400), fE = peakHz(pE, 30, 1200), fL = peakHz(pL, 30, 1200), sweep = fE > 0 && fL > 0 ? Math.log2(fE / fL) : 0;
  return { cent: Math.round(cent), lo: +(lo / E).toFixed(3), lo2: +(lo2 / E).toFixed(3), hi: +(hi / E).toFixed(3), flat: +flat.toFixed(3), decay: +decay.toFixed(3), attack: +attack.toFixed(4), pkF: Math.round(pkF), sweep: +sweep.toFixed(2), reatt: lastPeaks, ph: +(10 * Math.log10(ph / E + 1e-9)).toFixed(1) }; };   // ph = dB of the hit's energy a phone speaker can reproduce (> 250 Hz), relative to the whole hit
// class names in player terms
const CLASSES = ['kick', 'snare', 'hat/cymbal', 'tom', 'clap', 'rim/click', 'shaker', 'wood/bell', 'hand drum', 'other'];
const classify = F => { if (!F) return 'other'; const noisy = F.flat > .12;
  if (F.lo > .4 && F.cent < 700 && F.pkF < 105) return 'kick';
  if (F.lo2 > .55 && F.cent < 900 && F.sweep > .25 && F.pkF < 160) return 'kick';
  if (noisy && F.decay < .04 && F.cent < 6000 && F.cent > 1100) return 'rim/click';
  if (noisy && F.cent > 4500) return F.attack > .012 ? 'shaker' : 'hat/cymbal';
  if (noisy && (F.reatt >= 2 || F.lo2 < .05) && F.cent < 3500 && F.decay < .25) return 'clap';   // flammed bursts / no drum body under the noise
  if (noisy && F.cent > 1100) return F.decay < .025 && F.cent < 3000 ? 'rim/click' : 'snare';
  if (F.decay < .03 && F.cent > 700) return 'rim/click';
  if (F.pkF < 380 && F.lo2 > .3) return F.sweep > .08 || F.pkF < 180 ? 'tom' : 'hand drum';
  if (F.pkF >= 160 && F.pkF < 700 && F.cent < 2500) return 'hand drum';
  if (F.pkF >= 500 && !noisy) return 'wood/bell';
  if (F.cent > 4500) return 'hat/cymbal';
  return 'other'; };
const hit = (P, f, dur = .12, secs = .6) => { const x = RS.Inst.render(P, f, dur, secs); return feats(x); };
const hist = xs => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
const pct = (h, n) => Object.fromEntries(CLASSES.filter(c => h[c]).map(c => [c, Math.round(h[c] / n * 100) + '%']));
module.exports = { feats, classify, hit, hist, pct, CLASSES };
