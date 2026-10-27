// Timbre descriptor: render one instrument note alone (fresh DSP, real InstFactory [+ vocal tract when the ohm sings through it]) at a COMMON
// pitch, then measure harmonic profile (16 partials), brightness (centroid / f0), noisiness (non-harmonic energy share), odd/even balance,
// attack and sustain. distance() compares two descriptors (log / L1, ~1 = clearly different instrument).
module.exports = (RS, A, SR) => {
  const T = {}, F0 = 220;
  T.render = (P, o = {}) => { const d = A.DSPFactory(SR, RS.TractFactory, RS.InstFactory, RS.FXFactory), n = Math.round(SR * .7), x = new Float32Array(n); d.msg({ t: 'inst', id: 9e6 + (T.k = (T.k || 0) + 1), P, f: o.f || F0, dur: .45, vel: .8, gain: .2, pan: 0, send: 0, fx: -1, from: 0 });
    if (o.tract) d.msg(o.tract); for (let i = 0; i < n; i += 128) { const a = new Float32Array(128), b = new Float32Array(128); d.render(a, b, 128); x.set(a.subarray(0, Math.min(128, n - i)), i); } return x; };
  T.desc = (P, o = {}) => { const x = T.render(P, o), f = o.f || F0, N = Math.round(SR * .12); let o0 = 0; { let pk = 0; for (let i = 0; i < SR * .3; i++) if (Math.abs(x[i]) > pk) { pk = Math.abs(x[i]); o0 = i; } o0 = Math.max(0, o0 - 120); } let tot = 0; for (let i = 0; i < N; i++) tot += x[o0 + i] * x[o0 + i]; tot = tot / N * 2;
    const h = []; for (let k = 1; k <= 16; k++) { let re = 0, im = 0; const w = 2 * Math.PI * f * k / SR; for (let i = 0; i < N; i++) { const v = x[o0 + i] * (.5 - .5 * Math.cos(2 * Math.PI * i / N)); re += v * Math.cos(w * i); im += v * Math.sin(w * i); } h.push(Math.hypot(re, im) / N * 4); }
    const he = h.reduce((a, b) => a + b * b, 0) / 2, e = h.reduce((a, b) => a + b, 0) || 1e-9; let pk = 0, pi = 0, env = []; for (let i = 0; i < x.length; i += 480) { let s = 0; for (let j = i; j < Math.min(x.length, i + 480); j++) s = Math.max(s, Math.abs(x[j])); env.push(s); if (s > pk) { pk = s; pi = i; } }
    const odd = h.filter((_, i) => i % 2 === 0).slice(1).reduce((a, b) => a + b, 0), even = h.filter((_, i) => i % 2 === 1).reduce((a, b) => a + b, 0);
    return { bright: +(h.reduce((a, b, i) => a + b * (i + 1), 0) / e).toFixed(2), noise: +Math.min(1, Math.max(0, 1 - he / (tot || 1e-9))).toFixed(2), oddEven: +Math.log2((odd + 1e-4) / (even + 1e-4)).toFixed(2), att: +(pi / SR).toFixed(3), sus: +(env[Math.min(env.length - 1, 40)] / (pk || 1)).toFixed(2), prof: h.map(v => +(v / (h[0] + Math.max(...h) * .1 + 1e-9)).toFixed(2)).slice(0, 8), rms: +Math.sqrt(tot / 2).toFixed(4) }; };
  T.dist = (a, b) => { let d = Math.abs(Math.log2((a.bright + .5) / (b.bright + .5))) * 1.2 + Math.abs(a.noise - b.noise) * 2 + Math.abs(a.oddEven - b.oddEven) * .25 + Math.abs(Math.log2((a.att + .004) / (b.att + .004))) * .35 + Math.abs(a.sus - b.sus) * 1.2;
    for (let k = 1; k < 8; k++) d += Math.abs(Math.log2((a.prof[k] + .05) / (b.prof[k] + .05))) * .12; return +d.toFixed(2); };
  return T; };
