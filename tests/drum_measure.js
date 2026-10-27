// prints the drum-sound distribution of new percussion ohms (step 1 of the 6:56 PM fix)
const B = require('./drum_births.js'), DM = require('./drum_metrics.js'), RS = global.RS;
const E = B.births(), rows = E.map(e => Object.assign({ c: e.c, path: e.path, type: e.c.P.inst.drum, size: +(e.c.P.size || 0).toFixed(1) }, B.sound(e)));
const n = rows.length, h = DM.hist(rows.map(r => r.top)); console.log('ohms', n, 'by main sound', DM.pct(h, n));
for (const p of ['spiral', 'natural', 'fresh', 'egg']) { const rs = rows.filter(r => r.path === p); console.log(' ', p, rs.length, DM.pct(DM.hist(rs.map(r => r.top)), rs.length)); }
console.log('legacy type', DM.hist(rows.map(r => r.type)));
const byT = {}; for (const r of rows) (byT[r.type] = byT[r.type] || []).push(r.top); for (const t in byT) console.log('  type', t, DM.hist(byT[t]));
const hs = rows.flatMap(r => r.hits); const hw = {}; let tw = 0; for (const x of hs) { hw[x.cl] = (hw[x.cl] || 0) + x.w; tw += x.w; } console.log('share of hits heard', Object.fromEntries(Object.entries(hw).map(([k, v]) => [k, Math.round(v / tw * 100) + '%'])));
{ const by = {}; for (const r of rows) (by[r.top] = by[r.top] || []).push(...r.hits.filter(x => x.cl === r.top).map(x => x.F.ph)); console.log('phone-audible share (dB, median) by class', Object.fromEntries(Object.entries(by).map(([k, v]) => [k, v.sort((a, b) => a - b)[v.length >> 1]]))); }
console.log('sets', DM.hist(rows.map(r => (r.c.g.dk || []).map(e => e.h).join('+') || '-')));
if (process.env.V) for (const r of rows) console.log(r.path, r.type, r.size, r.top, r.hits.map(x => x.cl + '@' + Math.round(x.f) + JSON.stringify(x.F)).join(' | '));
