// Count visual fx emissions by kind in a calm 6-creature scene (no player input) -> ripple-like emissions per second.
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dna']) require('../www/js/' + m + '.js');
const secs = +(process.argv[2] || 30); const { Sf } = T.scene({ clear: true }); const x0 = Sf.view.cx; for (let k = 0; k < 6; k++) T.add(Sf, T.plain(400 + k), x0 - 160 + k * 64);
const cnt = {}; const push0 = Sf.fxl.push.bind(Sf.fxl); Sf.fxl.push = f => { cnt[f.k] = (cnt[f.k] || 0) + 1; return push0(f); }; T.run(Sf, secs);
const WAVES = new Set(['sing', 'ring', 'strike', 'tune', 'harmony', 'clash', 'filament', 'ripple', 'listen', 'echo', 'pulse', 'wave', 'bloom', 'deafRipple', 'call', 'answer']);
const waves = Object.values(cnt).reduce((s, v) => s + v, 0);   /* every drawn fx counts */
console.log(JSON.stringify({ secs, perSec: +(waves / secs).toFixed(2), byKind: cnt }));
