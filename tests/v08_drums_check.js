// v0.8 drums (Wilbow 6:56 / 6:57 / 6:58 PM MDT, Oct 23 2026) headless check: percussion ohms span the drum family instead of mostly hats.
// D1 60 new percussion ohms from every birth path (spiral / natural / fresh launch / egg), 2 populations: no sound class over ~30 % (by main
//    sound and by hits heard), kicks >= ~12 %, the hat family (hat + shaker) <= 30 %, natural births no longer hat-dominated, >= 7 classes
// D2 every row of RS.Drums.HITS renders as its own family most of the time (the synthesis matches the table); kicks reach a phone speaker
// D3 each ohm keeps its own set for life: deterministic from its genes, saved + reloaded (and chunk-packed) unchanged; 1-3 birth hits
// D4 an old save (no set) keeps exactly its old gene drum
// D5 RS.Drums.learn: appends, refuses duplicates / non-drummers / unknown hits, cap 6, birth hits never dropped, a learned hit is played
// D6 big / heavy bodies lean low (more kicks + toms), small / light ones lean high
// D7 a jam's drummers take complementary niches (no two set-drummers on the same part)
// D8 cheap: a hit lookup costs well under a microsecond-scale budget
const B = require('./drum_births.js'), DM = require('./drum_metrics.js'), RS = global.RS, D = RS.Drums, T = B.T;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const share = (rows, f) => { const h = {}; let t = 0; for (const r of rows) for (const [k, w] of f(r)) { h[k] = (h[k] || 0) + w; t += w; } for (const k in h) h[k] = h[k] / t; return h; };
// D1
let E0;
for (const seed of [12345, 99]) { B.reseed(seed); const E = B.births(); if (!E0) E0 = E; const rows = E.map(e => Object.assign({ e, path: e.path }, B.sound(e)));
  const main = share(rows, r => [[r.top, 1]]), heard = share(rows, r => r.hits.map(x => [x.cl, x.w])), nat = share(rows.filter(r => r.path === 'natural'), r => [[r.top, 1]]);
  const mx = h => Math.max(...Object.values(h)), hatF = h => (h['hat/cymbal'] || 0) + (h.shaker || 0), P = h => Object.fromEntries(Object.entries(h).map(([k, v]) => [k, Math.round(v * 100)]));
  ok(`D1 [${seed}] ${E.length} percussion ohms born`, E.length >= 55, E.length);
  ok(`D1 [${seed}] no class over 30 % (main sound)`, mx(main) <= .30, P(main));
  ok(`D1 [${seed}] no class over 30 % (hits heard)`, mx(heard) <= .30, P(heard));
  ok(`D1 [${seed}] kicks >= 12 %`, (main.kick || 0) >= .12 && (heard.kick || 0) >= .12, { main: P(main).kick, heard: P(heard).kick });
  ok(`D1 [${seed}] hat family <= 30 %`, hatF(main) <= .30 && hatF(heard) <= .30, { main: Math.round(hatF(main) * 100), heard: Math.round(hatF(heard) * 100) });
  ok(`D1 [${seed}] natural births not hat-dominated (<= 40 %) and include kicks`, hatF(nat) <= .40 && (nat.kick || 0) > 0, P(nat));
  ok(`D1 [${seed}] >= 7 distinct classes`, Object.keys(main).filter(k => k !== 'other').length >= 7, Object.keys(main));
  ok(`D1 [${seed}] every new percussion ohm has a set of 1-3 birth hits`, E.every(e => e.c.g.dk && e.c.g.dk.length >= 1 && e.c.g.dk.length <= 3 && e.c.g.dk.every(q => q.b)), E.map(e => (e.c.g.dk || []).length).join('')); }
// D2 every HITS row as its family
{ const FAM = { kick: ['kick'], snare: ['snare', 'clap', 'rim/click'], clap: ['clap', 'snare', 'rim/click'], hat: ['hat/cymbal'], shaker: ['shaker', 'hat/cymbal'], tom: ['tom', 'hand drum', 'kick'], hand: ['hand drum', 'tom'], rim: ['rim/click', 'wood/bell'], wood: ['wood/bell', 'rim/click'], cowbell: ['wood/bell'], bell: ['wood/bell'] };
  const gs = []; for (let s = 1; gs.length < 10; s++) { const g = RS.Genome.random(s * 31 + 5); if (g[RS.IG.perc] > .7) gs.push(g); } const ph = [], sw = [];
  for (const id of Object.keys(D.HITS)) { let hitN = 0; for (let k = 0; k < gs.length; k++) { const Q = D.hitP(RS.Inst.fromGenome(gs[k]), { h: id, s: RS.hash('chk', id, k) }), H = D.HITS[id]; const f = H.pitched ? H.f[0] + (H.f[1] - H.f[0]) * k / 9 : Q.drumF; const F = DM.hit(Q, f); if ((FAM[id] || [id]).includes(DM.classify(F))) hitN++; if (id === 'kick') { ph.push(F.ph); sw.push(F.sweep); } }
    ok(`D2 '${id}' sounds like its family`, hitN >= 6, hitN + '/10'); }
  ph.sort((a, b) => a - b); ok('D2 kicks drop in pitch (a thump, not a rising boop)', sw.filter(x => x > .25).length >= 8, sw); ok('D2 kicks carry phone-audible energy (> 250 Hz share, median >= -12 dB, old kicks ~-16)', ph[5] >= -12, ph); }
// D3 deterministic + save round-trip
{ const e = E0.find(q => q.c.g.dk.length > 1) || E0[0], c = e.c, Sf = e.Sf; const g2 = RS.Genome.fromCode(c.code || RS.Genome.toCode(c.g));
  { let n = 0; for (let s = 1; s < 40; s++) { const g = RS.Genome.random(s * 77); g[RS.IG.perc] = .9; if (JSON.stringify(D.birth(g)) === JSON.stringify(D.birth(Float32Array.from(g)))) n++; } ok('D3 same genes -> same set', n === 39, n); }
  const s = JSON.parse(JSON.stringify(Sf.serialCreature(c))); ok('D3 the set is saved', JSON.stringify(s.dk) === JSON.stringify(c.g.dk));
  const Sf2 = B.fresh(901), c2 = Sf2.loadCreature(Object.assign({}, s, { id: 990001 })) || Sf2.creatures.find(q => q.id === 990001);
  ok('D3 reload keeps the same hits and voices', c2 && JSON.stringify(c2.g.dk) === JSON.stringify(c.g.dk) && c2.P.inst.drum === c.P.inst.drum && c2.P.inst.dkP.map(q => q.hitId + q.drumF + q.mdec).join() === c.P.inst.dkP.map(q => q.hitId + q.drumF + q.mdec).join(), c2 && c2.g.dk);
  const before = JSON.stringify(c.g.dk); B.T.run(Sf, 20); RS.Inst.fromGenome(c.g); ok('D3 the set never changes while it lives', JSON.stringify(c.g.dk) === before); }
// D4 old save
{ const e = E0[0], s = JSON.parse(JSON.stringify(e.Sf.serialCreature(e.c))); delete s.dk; const Sf2 = B.fresh(902), c2 = Sf2.loadCreature(Object.assign({}, s, { id: 990002 })) || Sf2.creatures.find(q => q.id === 990002);
  const legacy = RS.Inst.fromGenome(RS.Genome.fromCode(s.code)); ok('D4 a pre-sets save keeps its old drum exactly', c2 && !c2.g.dk && !c2.P.inst.dkP && ['drum', 'drumF', 'penv', 'cut', 'noise', 'mdec', 'clap'].every(k => JSON.stringify(c2.P.inst[k]) === JSON.stringify(legacy[k])), c2 && c2.P.inst.drum); }
// D5 learn
{ const e = E0.find(q => q.c.g.dk.length === 1) || E0[0], c = e.c, birth = c.g.dk.filter(q => q.b).map(q => q.h), cand = Object.keys(D.HITS).filter(h => !c.g.dk.some(q => q.h === h));
  const a = D.learn(c, cand[0]); ok('D5 learn appends a new hit and the voice rebuilds', a && c.g.dk[c.g.dk.length - 1] === a && c.P.inst.dkP.length === c.g.dk.length && c.P.inst.dkP.some(q => q.hitId === cand[0]));
  ok('D5 learning a hit it already has does nothing', D.learn(c, cand[0]) === null && D.learn(c, 'nope') === null);
  const nd = RS.Genome.random(3); nd[RS.IG.perc] = .2; ok('D5 a non-drummer cannot learn a drum', D.learn({ g: nd }, 'kick') === null);
  for (const h of cand.slice(1)) D.learn(c, h); ok('D5 capped at CAP, birth hits kept, newest learned kept', c.g.dk.length === D.CAP && birth.every(h => c.g.dk.some(q => q.b && q.h === h)) && c.g.dk[c.g.dk.length - 1].h === cand[cand.length - 1], c.g.dk.map(q => q.h + (q.b ? '*' : '')));
  const w = D.learn(c, { base: 'cowbell', set: { mdec: .5 } }); ok('D5 learn accepts a custom hit {base, set}', w && w.x && c.P.inst.dkP[c.P.inst.dkP.length - 1].mdec === .5);
  const s = JSON.parse(JSON.stringify(e.Sf.serialCreature(c))), c2 = B.fresh(903).loadCreature(Object.assign({}, s, { id: 990003 })); ok('D5 learned hits are saved too', c2 && JSON.stringify(c2.g.dk) === JSON.stringify(c.g.dk)); }
// D6 body lean
{ const cnt = big => { const h = { low: 0, high: 0 }; for (let s = 1, n = 0; n < 150; s++) { const g = RS.Genome.random(s * 13 + (big ? 1 : 2)); if (g[RS.IG.perc] <= .7) continue; n++; g[0] = big ? .85 + .1 * (s % 3) / 3 : .05 + .1 * (s % 3) / 3; g[22] = big ? .8 : .2; for (const q of D.birth(g)) { const b = D.HITS[q.h].band; if (b === 'low') h.low++; if (b === 'high') h.high++; } } return h; };
  const bg = cnt(true), sm = cnt(false); ok('D6 big/heavy bodies lean low, small/light lean high', bg.low > bg.high * 1.5 && sm.high > sm.low * 1.3 && bg.low > sm.low * 1.5, { big: bg, small: sm }); }
// D7 jam niches
{ const Sf = B.fresh(904), Co = RS.Cohere; let bad = 0, jams = 0, nds = []; for (let t = 0; t < 30; t++) { const ms = []; for (let s = 1; ms.length < 3; s++) { const g = RS.Genome.random(RS.hash('jam', t, s)); if (g[RS.IG.perc] <= .7) continue; const x = Sf.view.cx - 300 + ms.length * 150; ms.push(Sf.addCreature(g, x, Sf.ground(x) - 40, { growth: 1, quiet: true, birth: 'wild' })); }
    for (const c of ms) if (!c.mind) { c.mind = RS.Mind.make(Sf, c); c.mind.g = c.g; }
    const E = { members: ms, phase: 'form', groove: null }; try { Co.roles(Sf, E, true); } catch (er) { if (t === 0) console.log('  (roles)', er.message); continue; } jams++;
    const rs = ms.map(c => c.mind.role).filter(r => r && r.startsWith('pulse')); if (new Set(rs).size !== rs.length) bad++; nds.push(rs.join(','));
    for (const c of ms) Sf.removeCreature ? Sf.removeCreature(c) : (c.dead = true); }
  ok('D7 jam drummers hold different niches', jams >= 20 && bad === 0, { jams, bad, eg: nds.slice(0, 6) }); }
// D8 cost
{ const c = E0.find(q => q.c.g.dk.length > 1).c, I = c.P.inst, st = ['bass', 'slap', 'mute', 'ghost', 'ring', 'tone'], t0 = process.hrtime.bigint(); let k = 0; for (let i = 0; i < 2e5; i++) if (D.voice(I, { stroke: st[i % 6], perc: true }, 200)) k++;
  const us = Number(process.hrtime.bigint() - t0) / 2e5 / 1e3; ok('D8 a hit lookup is cheap (< 2 us)', us < 2, +us.toFixed(3)); }
console.log(`\nv08_drums_check: ${pass}/${tot} passed`); process.exit(pass === tot ? 0 : 1);
