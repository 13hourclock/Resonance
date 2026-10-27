// For every gene: sweep min->max on several genomes and measure the largest change in expressed traits (P leaves), voice audio
// parameters and body/colour. Reports dead (no effect) and tiny (< perceptibility threshold) genes.
const path = require('path'), root = path.resolve(process.argv[2] && !process.argv[2].startsWith('--') ? process.argv[2] : path.join(__dirname, '..'));
const T = require(path.join(root, 'tests/node_env.js')); for (const m of ['store', 'render', 'daw', 'dna']) require(path.join(root, 'www/js', m + '.js'));
const Gn = RS.Genome, NG = Gn.NG; const X = g => { const P = Gn.express(g); if (!process.argv.includes('--notune')) P._tune = RS.Creature.defaults(g, P); return P; };
const leaves = (o, pre = '', out = {}, d = 0) => { if (d > 6 || o == null) return out; if (typeof o === 'number') { if (isFinite(o)) out[pre] = o; return out; } if (typeof o === 'boolean') { out[pre] = o ? 1 : 0; return out; } if (typeof o === 'string') { out[pre + '#'] = o; return out; }
  if (Array.isArray(o) || ArrayBuffer.isView(o)) { for (let k = 0; k < Math.min(o.length, 24); k++) leaves(o[k], pre + '[' + k + ']', out, d + 1); return out; } if (typeof o === 'object') for (const k of Object.keys(o)) leaves(o[k], pre ? pre + '.' + k : k, out, d + 1); return out; };
// trait spans: the natural range of each leaf across random genomes (normalises effect size)
const span = {}; { const vals = {}; for (let s = 0; s < 200; s++) { const L = leaves(X(Gn.random(5000 + s))); for (const k in L) if (typeof L[k] === 'number') (vals[k] = vals[k] || []).push(L[k]); } for (const k in vals) { const a = vals[k].sort((x, y) => x - y); span[k] = Math.max(1e-9, a[Math.floor(a.length * .95)] - a[Math.floor(a.length * .05)]); } }
const voiceFeat = P => { const S = RS.Sound ? null : null; return {}; };
const effect = i => { let best = 0, bestK = null; for (const s of [11, 23, 37, 51]) { const a = Gn.random(7000 + s), b = new Float32Array(a); a[i] = .02; b[i] = .98; const La = leaves(X(a)), Lb = leaves(X(b));
    for (const k in Lb) if (La[k] === undefined && !k.endsWith('#')) { if (1 > best) { best = 1; bestK = k + '(appears)'; } }
    for (const k in La) { if (k.endsWith('#')) { if (La[k] !== Lb[k]) { if (1 > best) { best = 1; bestK = k; } } continue; } if (Lb[k] === undefined) { if (1 > best) { best = 1; bestK = k + '(appears)'; } continue; } const sp = span[k]; const e = (!sp || sp < 1e-6) ? (Math.abs(La[k] - Lb[k]) > 1e-6 ? 1 : 0) : Math.abs(La[k] - Lb[k]) / sp; if (e > best) { best = e; bestK = k; } } }
  return { i, eff: +best.toFixed(3), via: bestK }; };
const THR = +(process.argv[process.argv.indexOf('--thr') + 1]) || .25;
const res = []; for (let i = 0; i < NG; i++) res.push(effect(i)); const dead = res.filter(r => r.eff < .02), tiny = res.filter(r => r.eff >= .02 && r.eff < THR);
console.log(JSON.stringify({ NG, thr: THR, dead: dead.length, tiny: tiny.length, deadGenes: dead.map(r => r.i), tinyGenes: tiny.map(r => [r.i, r.eff, r.via]) }));
if (process.argv.includes('--all')) console.log(JSON.stringify(res));
