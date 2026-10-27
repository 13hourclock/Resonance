// compare two note streams modulo a constant time offset: best offset alignment, then exact (src, role, pitch, t-t0 to 5 ms) matches
module.exports = (A, B) => { const pa = A.map(s => s.split('|')), pb = B.map(s => s.split('|')); if (!pa.length || !pb.length) return { sim: 0 };
  let best = { sim: 0 }; const cand = new Set(); for (let i = 0; i < Math.min(12, pa.length); i++) for (let j = 0; j < Math.min(40, pb.length); j++) if (pa[i][0] === pb[j][0] && pa[i][2] === pb[j][2]) cand.add((+pb[j][3] - +pa[i][3]).toFixed(3)); cand.add('0.000');
  for (const d of cand) { const key = p => p.slice(0, 3).join('|') + '|' + Math.round(+p[3] * 200); const sb = new Map(); for (const p of pb) { const k = key([p[0], p[1], p[2], +p[3] - +d]); sb.set(k, (sb.get(k) || 0) + 1); } let n = 0; for (const p of pa) { const k = key(p); if (sb.get(k)) { n++; sb.set(k, sb.get(k) - 1); } } const sim = n / Math.max(pa.length, pb.length); if (sim > best.sim) best = { sim: +sim.toFixed(3), d: +d }; }
  return best; };
if (require.main === module) { const [a, b] = process.argv.slice(2).map(f => require(require('path').resolve(f))); console.log(module.exports(a.out, b.out)); }
