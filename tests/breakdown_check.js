// v0.3.1.1 quick headless breakdown check (no audio render): a long, settled jam; the lead calls a breakdown; members lay out
// and come back; lock / arrangement unchanged; notes in key and on the grid; a muted member stays muted; a bystander keeps watching.
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dna']) require('../www/js/' + m + '.js');
const H = RS.Harm, Mi = RS.Mind, res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const SEED = +(process.env.SEED || 0);
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.mindLog = Sf.mindLog || [];
const place = (seed, x, y) => { const c = T.add(Sf, T.plain(seed), x); if (y != null) c.y = y; return c; };
const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(RS.Genome.express(T.plain(s)).inst)) return s; };
const cx = Sf.view.cx, cy = Sf.view.cy || 400; H.log = [];
const dr = pick(I => I.percK > .75, 7000 + SEED), t1 = pick(I => I.percK < .2, 7100 + SEED), t2 = pick(I => I.percK < .2, 7400 + SEED), t3 = pick(I => I.percK < .2, 7800 + SEED), t4 = pick(I => I.percK < .2, 8200 + SEED);
const cs = [place(dr, cx - 90, cy), place(t1, cx, cy + 40), place(t2, cx + 90, cy), place(t3, cx + 30, cy - 60), place(t4, cx - 40, cy - 70)];
const rec = []; let byW = null, lastRec = null, b0 = null, byAt = null, byEnd = null, rolesB = null, rolesA = null, roles0 = null, muted = null, mutedAt = null, by = null;
const muted0 = () => cs.some(c => c.jam);   /* v0.8b5: a tap only mutes inside a formed jam (c.jam); before that it invites (drums moved seed 0's jam to ~70 s) */
const E0 = () => cs.map(c => c.mind.E).find(Boolean);
T.run(Sf, 240, i => { const E = E0(); if (!E) return;
  if (!roles0 && E.phase === 'settled') roles0 = E.members.map(c => c.id + ':' + c.mind.role).sort().join(',');
  if (!muted && E.phase === 'settled' && T.t > 50 && muted0()) { muted = E.members.find(c => c.mind.E === E && c !== E.lead && c !== E.prop && c.mind.role !== 'bass' && c.mind.perc <= .55); if (muted) { Sf.jamTap(muted); mutedAt = T.t; } }
  if (!by && T.t > 55 && cs.some(c => c.jam)) { const j = cs.find(c => c.jam).jam;   /* v0.8b5: wait for the jam (drums reshuffled seed 0: it now locks at ~70 s instead of ~40 s; seeds 1-5 unchanged) */ by = place(pick(I => I.percK < .2, 8600 + SEED), j.x + +(process.env.BYD || 260), j.y)   /* v0.3.2: 260 (was 300); body plans make some ohms longer, 300 sat on the edge of the watch radius */; by.wander = 0; }
  if (process.env.DBY && by && i % 60 === 0) { const j = cs.find(c => c.jam) && cs.find(c => c.jam).jam; console.log('t', T.t.toFixed(0), 'w', !!by.bystander, 'jam', !!by.jam, 'E', by.mind.E && by.mind.E.id, 'd', j && Math.round(Math.hypot(by.x - j.x, by.y - j.y)), 'bd', !!(E.drop)); }
  if (by && by.bystander && !byW) byW = T.t; const bB = byW && H.log.find(e => e.k === 'breakdown' && e.t > byW + 1);   /* the bystander check uses the first breakdown after it started watching */
  if (by && bB && byAt && !byEnd && T.t >= bB.t + (bB.len + 2) * 4 * 60 / E.members[0].mind.bpm) byEnd = { watching: !!by.bystander, jam: !!by.jam };
  if (by && bB && !byAt && T.t >= bB.t) byAt = { watching: !!by.bystander, jam: !!by.jam };
  { const bb = H.log.filter(e => e.k === 'breakdown'); b0 = bb[0]; if (b0 && !rolesB && T.t >= b0.t) rolesB = E.members.map(c => c.id + ':' + c.mind.role).sort().join(','); if (b0 && rolesB && !rolesA && T.t >= b0.t + (b0.len + 3) * 4 * 60 / E.members[0].mind.bpm) rolesA = E.members.map(c => c.id + ':' + c.mind.role).sort().join(','); }
  const L = Sf.mindLog, k0 = lastRec ? L.lastIndexOf(lastRec) + 1 : 0;   /* v0.8 bdfix: Mi.play trims mindLog (splice 100 at 400), so a plain index skipped ~100 notes - a whole silent bar - whenever the trim fell inside the breakdown */ for (let k = k0; k < L.length; k++) { const r = L[k]; if (!r.c || !r.c.mind || r.c.mind.E !== E || r.manual) continue; const P = E.pulse || E.lead, pm = P.mind, rate = pm.bpm / 60 * 4, p = pm.pos + (r.t - Sf.now()) * rate;
    rec.push({ t: r.t, c: r.c.id, f: r.f, perc: r.perc, pass: r.pass, drum: r.c.P.inst.drum, grace: r.grace, p, sw: (E.swing || 0), rate, base: Mi.tonicHz(Sf, pm), cents: E.sys.cents.slice(), P: E.sys.period || 1200, ch: E.propChord && E.propChord.cents.slice(), bar: Math.floor((p + .5) / Mi.barLen(pm))   /* v0.8 bdfix: a downbeat played a hair early (micro-timing, p = 335.97) belongs to the bar it starts, not the one before */, muted: r.c.muted }); }
  lastRec = L[L.length - 1] || lastRec; });
if (process.env.DBG) { const E = E0(), b = H.log.find(e => e.k === 'breakdown'); for (let k = -1; k <= b.len; k++) console.log(k, [...new Set(rec.filter(r => r.bar === b.from + k).map(r => r.c + (r.muted ? 'M' : '')))].join(' '), H.log.filter(e => e.k === 'bd' && e.bar === b.from + k).map(e => e.c + '=' + e.st).join(' ')); console.log('roles', roles0, '\n', E.members.map(c => c.id + ':' + c.mind.role).sort().join(','), 'by', by.id, b.by, b.anchor); }
const E = E0(), bds = H.log.filter(e => e.k === 'breakdown' && E && e.E === E.id), st = H.log.filter(e => e.k === 'settled' && e.E === E.id)[0];
ok('BD a breakdown is called in a long settled jam (after >= 2 sections), occasionally', bds.length >= 1 && bds.length <= 4 && st && bds[0].t > st.t, { n: bds.length, at: bds.map(b => +b.t.toFixed(1)), len: bds.map(b => b.len), settledAt: st && +st.t.toFixed(1) });
const b = bds[0]; if (b) { const bars = {}; for (const r of rec) { const k = r.bar - b.from; if (k < -2 || k > b.len + 2) continue; (bars[k] = bars[k] || new Set()).add(r.c); }
  const act = Object.fromEntries(Object.entries(bars).sort((x, y) => x[0] - y[0]).map(([k, s]) => [k, s.size])); const live = E.members.filter(c => !c.muted && c.mind.role !== 'listen').length;   /* v0.3.2: the voice cap parks extra members on 'listen' */
  ok('BD most members drop out (those who missed the cue follow by ear a bar later), the anchor + lead keep the key and pulse', Math.min(bars[0] ? bars[0].size : 9, bars[1] ? bars[1].size : 9) <= 2 && (bars[0] ? bars[0].size : 0) >= 1 && (bars[1] ? bars[1].size : 0) >= 1 && (bars[-1] ? bars[-1].size : 0) >= live - 1, { voicesPerBar: act, live, anchor: b.anchor });
  ok('BD members come back member by member and land together on the downbeat', (bars[b.len] ? bars[b.len].size : 0) >= live - 1 && (bars[b.len - 1] ? bars[b.len - 1].size : 0) >= (bars[0] ? bars[0].size : 0), { voicesPerBar: act });
  const cue = H.log.filter(e => (e.k === 'bd' || e.k === 'bdLand') && e.E === E.id && e.bar >= b.from && e.bar <= b.from + b.len); ok('BD every ohm decides its own part (per-ohm bd events, no central composer)', new Set(cue.map(e => e.c)).size >= 3, { ohms: new Set(cue.map(e => e.c)).size }); }
const rearr = H.log.filter(e => e.k === 'rearrange' && e.E === E.id && e.settled), uns = H.log.filter(e => e.k === 'unsettled' && e.E === E.id && b && e.t > b.t - 2), roles1 = E.members.map(c => c.id + ':' + c.mind.role).sort().join(',');
ok('BD lock + arrangement unchanged: still settled, no re-arrange after lock, same roles, not counted as unsettle', E.phase === 'settled' && rearr.length === 0 && uns.length === 0 && rolesB && rolesB === rolesA, { phase: E.phase, rearr: rearr.length, unsettled: uns.length, before: rolesB, after: rolesA });
const ton = rec.filter(r => !r.perc && !r.pass && r.f && b && r.bar >= b.from - 2 && r.bar <= b.from + b.len + 4), md = (a, n) => ((a % n) + n) % n;
const inKey = r => { const cc = md(1200 * Math.log2(r.f / r.base), r.P); const hit = xs => xs && xs.some(x => Math.abs(md(cc - x + r.P / 2, r.P) - r.P / 2) < 35); return hit(r.cents) || hit(r.ch); };
const onGrid = r => { const sw = r.sw / r.rate * r.rate, d1 = Math.abs(r.p - Math.round(r.p)) / r.rate, d2 = Math.abs(r.p - sw - Math.round(r.p - sw)) / r.rate; const d3 = r.perc ? Math.abs(r.p * 2 - Math.round(r.p * 2)) / 2 / r.rate : 1; return d1 < .03 || d2 < .03 || d3 < .03; };   /* drums may sit on the 32nd grid (rolls, fills) */
const all = rec.filter(r => b && r.bar >= b.from - 2 && r.bar <= b.from + b.len + 4);
if (process.env.DGR) console.log(all.filter(r => !onGrid(r)).slice(0, 8).map(r => [r.c, r.drum, r.perc, +(r.p % 1).toFixed(3), r.grace]), ton.filter(r => !inKey(r)).slice(0,4).map(r => [r.c, r.f, r.base]));
ok('BD nothing goes out of key or off the grid around the breakdown (100%)', ton.length > 20 && ton.every(inKey) && all.every(onGrid), { tonal: ton.length, inKey: ton.filter(inKey).length, notes: all.length, onGrid: all.filter(onGrid).length });
const mLoud = muted ? T.notes.filter(n => n.when > mutedAt + .5 && n.n.src === muted && n.n.mind && (n.n.gain || 0) > 1e-4).length : -1;
ok('BD a muted member stays muted through the breakdown', muted && muted.muted && mLoud === 0, { muted: muted && muted.id, loud: mLoud });
const bq = byW && H.log.find(e => e.k === 'breakdown' && e.t > byW + 1), byN = by && byAt && byAt.watching ? T.notes.filter(n => n.n.src === by && n.n.mind && !n.n.hum && bq && n.when > bq.t && n.when < bq.t + (bq.len + 2) * 4 * 60 / E.members[0].mind.bpm).length : -1;
ok('BD a watching bystander stays a quiet watcher through the breakdown (still watching, silent)', byAt && byAt.watching && byN === 0 && byEnd && byEnd.watching, { at: byAt, notes: byN, atLanding: byEnd });
if (process.env.DBY) console.log(T.notes.filter(n => n.n.src === by && n.n.mind && !n.n.hum && b && n.when > b.t && n.when < b.t + 20).map(n => [n.when.toFixed(2), n.n.gain, n.n.vel, Object.keys(n.n).join('/')]));
console.log('breakdown ' + res.filter(Boolean).length + '/' + res.length);
