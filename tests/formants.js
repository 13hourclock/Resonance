'use strict';
// LPC formant estimator (offline): downsample-free, order ~ SR/1000+4, envelope peak picking 90..4000 Hz.
function lpc(x, p) { const n = x.length, r = new Float64Array(p + 1); for (let k = 0; k <= p; k++) { let s = 0; for (let i = k; i < n; i++) s += x[i] * x[i - k]; r[k] = s; } r[0] *= 1.0001;
  const a = new Float64Array(p + 1); a[0] = 1; let e = r[0]; for (let i = 1; i <= p; i++) { let acc = r[i]; for (let j = 1; j < i; j++) acc += a[j] * r[i - j]; const k = -acc / e; const t = a.slice(); for (let j = 1; j < i; j++) a[j] = t[j] + k * t[i - j]; a[i] = k; e *= 1 - k * k; } return a; }
function formants(sig, SR, p) { // pre-emphasis + hamming, decimate to 10 kHz for clean low formants
  const D = Math.max(1, Math.round(SR / 10000)), fs = SR / D, y = []; let lp = 0; for (let i = 0; i < sig.length; i++) { lp += (sig[i] - lp) * .35; if (i % D === 0) y.push(lp); }
  const x = new Float64Array(y.length); for (let i = 1; i < y.length; i++) x[i] = (y[i] - .94 * y[i - 1]) * (.54 - .46 * Math.cos(2 * Math.PI * i / (y.length - 1)));
  const a = lpc(x, p || 12), env = []; for (let f = 90; f < 4400; f += 10) { const w = 2 * Math.PI * f / fs; let re = 0, im = 0; for (let k = 0; k < a.length; k++) { re += a[k] * Math.cos(w * k); im -= a[k] * Math.sin(w * k); } env.push([f, -10 * Math.log10(re * re + im * im)]); }
  const pk = []; for (let i = 1; i < env.length - 1; i++) if (env[i][1] > env[i - 1][1] && env[i][1] >= env[i + 1][1]) pk.push(env[i][0]); return pk; }
module.exports = { formants, lpc };
