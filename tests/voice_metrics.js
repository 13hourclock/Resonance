// v0.8a9 (Wilbow 12:06 / 12:07): shared voice metrics for drawn-shape and spiral-ohm voices.
// eng(P): the dominant sound source ('phys' = the physical model only). vec(P): a normalized timbre vector. bell(...): inharmonic + decaying dominant.
const RS = global.RS;
const harmDev = rs => { if (!rs || !rs.length) return 0; let d = 0; for (let k = 1; k < Math.min(4, rs.length); k++) { const r = rs[k] / rs[0], n = Math.max(1, Math.round(r)); d += Math.min(1, Math.abs(r - n) / .25); } return d / Math.max(1, Math.min(3, rs.length - 1)); };
const eng = P => { if (P.drum) return 'phys'; const w = { phys: P.phys || 0, eNRES: P.nres || 0 }; for (const [i, v] of P.eng || []) w[RS.ENGINES[i]] = (w[RS.ENGINES[i]] || 0) + v; return Object.keys(w).sort((a, b) => w[b] - w[a])[0]; };
const lg = (v, a, b) => Math.max(0, Math.min(1, Math.log(Math.max(a, v) / a) / Math.log(b / a)));
const vec = (P, extra = []) => { const E = RS.ENGINES, oh = E.map(() => 0); for (const [i, v] of P.eng || []) oh[i] += v; oh[8] += P.nres || 0;
  return [lg(P.att, .001, 1.5), lg(P.dec, .05, 2.5), P.sus || 0, lg(P.rel, .03, 2.6), lg(P.cut, 180, 10800), Math.min(1, P.noise / .6), Math.min(1, (P.det - 1) * 70), Math.min(1, (P.fmIx || 0) / 6), Math.min(1, (P.lfoA || 0) / .55 + (P.lfoP || 0) / .6), harmDev(P.ratios) * (P.phys || 0), P.phys || 0, ...oh.map(v => v * .8), ...extra]; };
const dist = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); };
const spread = V => { let s = 0, n = 0, mn = 1e9; for (let i = 0; i < V.length; i++) for (let j = i + 1; j < V.length; j++) { const d = dist(V[i], V[j]); s += d; n++; mn = Math.min(mn, d); } return { mean: +(s / n).toFixed(3), min: +mn.toFixed(3) }; };
// bell-like: the mix is mostly inharmonic partials that only decay (no sustain). voiceInh = the voice's physical part with non-harmonic ratios, ring mod, or a non-integer FM ratio.
const voiceInh = P => { const e = eng(P), m = (P.eng || []).reduce((a, [i, v]) => a + (RS.ENGINES[i] === 'eRING' ? v : RS.ENGINES[i] === 'eFM' && Math.abs((P.fmR2 || 1) - Math.round(P.fmR2 || 1)) > .1 ? v : 0), 0); return Math.min(1, (P.phys || 0) * harmDev(P.ratios) + m + (e === 'eNRES' ? (P.nres || 0) * .5 : 0)); };
const bell = (P, ringW = 0, ringInh = 0) => { const inh = ringW * ringInh + (1 - ringW) * voiceInh(P), decay = ringW > .5 || ((P.sus || 0) < .25 && P.dec < 3); /* a dominant modal ring only ever decays */ return inh > .5 && decay; };
const hist = xs => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
module.exports = { harmDev, eng, vec, dist, spread, bell, voiceInh, hist };
