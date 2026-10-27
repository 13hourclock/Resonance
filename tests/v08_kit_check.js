// 0.8b6 KIT GROWTH headless check (Wilbow 8:50 PM MDT Oct 23 2026: "Drums should be able to play a mix of sounds through learning from other
// types of drum" / "As in slowly becoming a full kit through experience").
// K1 sped-up simulation: a 1-hit drummer jamming with other kinds of drummers goes sparse -> full kit (5 slots), monotonic; time to full
//    kit reported for a beginner / a levelled ohm / with a teacher (rate = the 0.8b6 learned-sound rule: k * rateK * (1 + level) * .5)
// K2 birth hits are never lost (growth, D.learn past CAP, save / reload)
// K3 the learned share of what it plays rises with experience; birth hits stay the loudest; a veteran plays every kit slot in its role
// K4 a jam of several veteran drummers interlocks: no slot doubled, <= 1 learned slot each
// K5 cost: kitBar / study per call well under budget; off screen adds nothing
// K6 save / load of a half-learned kit is exact; an old save (no set) does not grow and keeps its gene drum
// K7 rebalance (10:28 PM: the birth hits stay the main part of its playing for life): on full-kit veterans (10 birth sets x 4 roles, 64 bars)
//    the birth hits are >= 50 % of notes and the most-played single hit is a birth hit; the learned hits still cover every kit slot
const B = require('./drum_births.js'), RS = global.RS, D = RS.Drums, Mi = RS.Mind, T = B.T;
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const Sf = B.fresh(811); let nid = 0;
const drummer = (hits, x) => { const g = RS.Genome.random(9001 + nid * 13); g[RS.IG.perc] = .92; g.dk = hits.map((h, i) => ({ h, s: RS.hash('kc', nid, i) >>> 0, b: 1 })); nid++;
  const c = Sf.addCreature(g, Sf.view.cx - 280 + (nid % 8) * 80, Sf.ground(Sf.view.cx) - 40, { growth: 1, energy: .9, quiet: true }); if (!c.mind) { c.mind = Mi.make(Sf, c); c.mind.g = c.g; } return c; };
const K = 0.1, rateOf = (lv, k = K) => k * .04 * (1 + lv) * .5;   // the b6 rule (layers.js P.rateK = .04, own = 1 + level, typical jam k ~ .1 per 2 s tick)
const mates = [drummer(['kick']), drummer(['snare', 'tom']), drummer(['hat', 'bell']), drummer(['hand', 'clap']), drummer(['wood'])];
// K1
const grow = (lv, teach) => { const c = drummer(['shaker']), F = [D.fullness(c)]; let t = 0, mono = true, first = null; const T0 = mates[0];
  for (; t < 20000 && !D.isFull(c); t++) { const r = D.study(c, mates, rateOf(lv), o => teach || 0); if (r && r.start && first == null) first = t; const f = D.fullness(c); if (f < F[F.length - 1] - 1e-9) mono = false; if (t % 100 === 0) F.push(f); }
  return { c, ticks: t, min: Math.round(t * 2 / 60), F, mono, first }; };
const g0 = grow(0, false), g2 = grow(2, false), gT = grow(0, true), g4T = grow(4, true);
ok('K1 a 1-hit drummer starts sparse (fullness .2)', g0.F[0] === .2, g0.F[0]);
ok('K1 ... and becomes a full kit (low + back + time + fill + colour) through jamming', D.isFull(g0.c) && g0.c.g.dk.length === 5, g0.c.g.dk.map(e => e.h + (e.b ? '*' : '')));
ok('K1 fullness only ever rises (slowly: one hit at a time)', g0.mono && g0.F.filter((f, i) => i && f > g0.F[i - 1]).length >= 8, g0.F.map(f => +f.toFixed(2)).filter((f, i, a) => i % 10 === 0));
ok('K1 slow for a beginner: >= 45 min of jamming to a full kit', g0.min >= 45, g0.min + ' min');
ok('K1 faster with level and with a teacher', g2.min < g0.min * .5 && gT.min < g0.min && g4T.min < g2.min, { beginner: g0.min, level2: g2.min, teacher: gT.min, level4Teacher: g4T.min });
console.log('     time to a full kit (min of jamming, 1 birth hit): beginner', g0.min, '| level 2', g2.min, '| beginner + teacher', gT.min, '| level 4 + teacher', g4T.min);
ok('K1 teaching is a gradient: time to a full kit falls smoothly as the mate\'s teaching strength rises', (() => { const ts = [0, .25, .5, .75, 1].map(v => grow(0, v).ticks); return ts.every((t, i) => !i || t < ts[i - 1]); })());
ok('K1 learned hits are exact copies of a mate\'s hit (same id + seed)', g0.c.g.dk.filter(e => e.l).every(e => mates.some(o => o.id === e.o && o.g.dk.some(q => q.h === e.h && q.s === e.s))));
ok('K1 one hit learned at a time', (() => { const c = drummer(['kick']); for (let t = 0; t < 600; t++) { D.study(c, mates, rateOf(1)); if (c.g.dk.filter(e => e.l && e.p < 1).length > 1) return false; } return true; })());
ok('K1 no mates of other kinds -> nothing to learn', (() => { const c = drummer(['hat']), m2 = [drummer(['shaker'])]; for (let t = 0; t < 3000; t++) D.study(c, m2, rateOf(3)); return c.g.dk.length === 1; })());
ok('K1 a non-drummer does not grow a kit', (() => { const g = RS.Genome.random(77); g[RS.IG.perc] = .2; const c = { id: 1, g, P: {} }; return D.study(c, mates, .01) === null && !g.dk; })());
// K2
{ const c = g0.c, birth = c.g.dk.filter(e => e.b).map(e => e.h + e.s); ok('K2 birth hits kept through growth', birth.length === 1 && c.g.dk[0].b && c.g.dk[0].h === 'shaker');
  for (const h of Object.keys(D.HITS)) D.learn(c, h); ok('K2 ... and past CAP (' + D.CAP + ')', c.g.dk.length <= D.CAP && c.g.dk.filter(e => e.b).map(e => e.h + e.s).join() === birth.join());
  const k3 = drummer(['kick', 'snare', 'hat']), b3 = k3.g.dk.map(e => e.h).join(); for (const h of Object.keys(D.HITS)) D.learn(k3, h); for (let t = 0; t < 4000; t++) D.study(k3, mates, rateOf(4));
  ok('K2 a 3-hit drummer keeps all 3 for life', k3.g.dk.filter(e => e.b).map(e => e.h).join() === b3 && k3.P.inst.drum === 'kit'); }
// K3 learned share of play rises; birth stays the loudest
const play = (c, role = 'solo', bars = 16, E) => { const m = c.mind, r = RS.rng(5); if (E) m.E = E; else m.E = null; let lv = 0, bv = 0, ln = 0, bn = 0; const slots = new Set();
  for (let b = 0; b < bars; b++) for (const n of Mi.drumBar(Sf, m, b, role, b % 4 === 3, r, .8, [0, 2, 4])) { const v = D.voice(c.P.inst, n, 220); if (!v) continue; if (n.kit) { lv += n.vel; ln++; } else { bv += n.vel; bn++; } slots.add(D.slotOf(v.hit)); }
  m.E = null; return { share: lv / (lv + bv || 1), lAvg: lv / (ln || 1), bAvg: bv / (bn || 1), slots: [...slots] }; };
{ const c = drummer(['kick']), sh = [], at = []; let t = 0; sh.push(play(c).share); at.push(0);
  while (!D.isFull(c) && t < 30000) { D.study(c, mates, rateOf(1)); t++; if (t % 150 === 0) { sh.push(play(c).share); at.push(Math.round(t * 2 / 60)); } } sh.push(play(c).share); at.push(Math.round(t * 2 / 60));
  const q = sh.length, early = sh.slice(0, Math.ceil(q / 4)).reduce((a, b) => a + b) / Math.ceil(q / 4), late = sh.slice(-Math.ceil(q / 4)).reduce((a, b) => a + b) / Math.ceil(q / 4);
  ok('K3 a young drummer plays only its birth hits', sh[0] === 0);
  ok('K3 the learned share rises with experience (first quarter < last quarter) to a real kit share that stays under the birth hits (end 20-45 % of loudness)', early < late && sh[sh.length - 1] >= .2 && sh[sh.length - 1] <= .45, { min: at.filter((_, i) => i % 4 === 0), share: sh.filter((_, i) => i % 4 === 0).map(s => Math.round(s * 100)) });
  const v = play(c); ok('K3 birth hits stay the most prominent (avg learned velocity < .75 x birth)', v.lAvg < .75 * v.bAvg, { learned: +v.lAvg.toFixed(2), birth: +v.bAvg.toFixed(2) });
  ok('K3 a veteran plays a full kit when alone: every slot heard', D.KIT.every(s => v.slots.includes(s)), v.slots);
  const L = Mi.barLen(c.mind), o = Mi.drumBar(Sf, c.mind, 0, 'solo', false, RS.rng(9), .8, [0, 2, 4]).filter(n => n.kit), at2 = id => o.filter(n => D.slotOf(c.P.inst.dkP[n.hit].hitId) === id).map(n => Math.round(n.s - (c.mind.micro || 0) * 4));
  ok('K3 natural roles: snare on back-beats, hats on 8ths', at2('back').every(s => s > 0) && at2('time').every(s => s % 2 === 0), { back: at2('back'), time: at2('time'), L });
  const fl = Mi.drumBar(Sf, c.mind, 3, 'solo', true, RS.rng(9), .8, [0, 2, 4]).filter(n => n.kit && D.slotOf(c.P.inst.dkP[n.hit].hitId) === 'fill');
  ok('K3 toms / hand drums play the fills', fl.length >= 2 && fl.every(n => n.s >= L - 4.5), fl.map(n => +n.s.toFixed(2))); }
// K4 interlock: 3 veterans in one jam
{ const vs = [drummer(['kick']), drummer(['hat']), drummer(['snare'])]; for (const c of vs) { let t = 0; while (!D.isFull(c) && t++ < 40000) D.study(c, mates, rateOf(4)); }
  const E = { members: vs }; vs[0].mind.role = 'pulse:low'; vs[1].mind.role = 'pulse:time'; vs[2].mind.role = 'pulse:back'; for (const c of vs) c.mind.E = E;
  const R = vs.map((c, i) => { const p = play(c, c.mind.role, 16, E), own = c.P.inst.dkP.filter(q => q.hitB).map(q => D.slotOf(q.hitId)); return { own, extra: p.slots.filter(s => !own.includes(s)) }; });
  const all = R.flatMap(x => x.own.concat(x.extra)), dup = all.length - new Set(all).size;
  ok('K4 3 full-kit veterans in one jam: none plays the full kit', vs.every(c => D.isFull(c)) && R.every(x => x.extra.length <= 1), R);
  ok('K4 ... and no kit slot is doubled (they interlock)', dup === 0, all);
  const solo = play(vs[0]); ok('K4 the same veteran alone plays its full kit again', solo.slots.length === 5, solo.slots); for (const c of vs) c.mind.E = null; }
// K5 cost
{ const c = drummer(['kick']); let t = 0; while (!D.isFull(c) && t++ < 40000) D.study(c, mates, rateOf(4)); const m = c.mind, L = Mi.barLen(m), r = RS.rng(1), N = 4000;
  const t0 = process.hrtime.bigint(); for (let i = 0; i < N; i++) D.kitBar(Sf, m, i, 'solo', i % 4 === 3, .8, [], null, L); const us = Number(process.hrtime.bigint() - t0) / 1e3 / N;
  const t1 = process.hrtime.bigint(); for (let i = 0; i < N; i++) D.study(c, mates, rateOf(1)); const us2 = Number(process.hrtime.bigint() - t1) / 1e3 / N;
  ok('K5 kit player < 15 us a bar, study < 10 us a tick', us < 15 && us2 < 10, { kitBar: +us.toFixed(2), study: +us2.toFixed(2) });
  const v0 = Sf.view, iv = Sf.inView; Sf.inView = () => false; const off = D.kitBar(Sf, m, 1, 'solo', false, .8, [], null, L).length; Sf.inView = iv;
  ok('K5 off screen: no extra notes', off === 0);
  const y = drummer(['kick']), t2 = process.hrtime.bigint(); for (let i = 0; i < N; i++) D.kitBar(Sf, y.mind, i, 'solo', false, .8, [], null, L); const us3 = Number(process.hrtime.bigint() - t2) / 1e3 / N;
  ok('K5 a drummer with nothing learned: ~free', us3 < 2, +us3.toFixed(3)); }
// K6 save / load
{ const c = drummer(['tom']); let t = 0; while (c.g.dk.filter(e => e.l && e.p >= 1).length < 1 || !c.g.dk.some(e => e.l && e.p > 0 && e.p < 1)) { D.study(c, mates, rateOf(2)); if (++t > 30000) break; }
  const s = JSON.parse(JSON.stringify(Sf.serialCreature(c))), Sf2 = B.fresh(812), c2 = Sf2.loadCreature(Object.assign({}, s, { id: 990101 })) || Sf2.creatures.find(q => q.id === 990101);
  ok('K6 a half-learned kit saves + reloads exactly (progress too)', c2 && JSON.stringify(c2.g.dk) === JSON.stringify(c.g.dk) && c2.P.inst.dkP.map(q => q.hitId + q.drumF).join() === c.P.inst.dkP.map(q => q.hitId + q.drumF).join(), s.dk);
  ok('K6 the reloaded drummer keeps its birth type + niches', c2.P.inst.drum === c.P.inst.drum && D.niches(c2.P.inst).join() === D.niches(c.P.inst).join(), D.niches(c2.P.inst));
  const g = RS.Genome.random(4242); g[RS.IG.perc] = .9; const o = Sf.addCreature(g, Sf.view.cx, Sf.ground(Sf.view.cx) - 40, { growth: 1, quiet: true }); delete o.g.dk; const I0 = o.P.inst = RS.Inst.fromGenome(o.g);
  ok('K6 an old save (no set) does not grow and keeps its gene drum', D.study(o, mates, .05) === null && !o.g.dk && o.P.inst === I0); }
// K7 rebalance: birth hits stay the main part of a full-kit veteran's playing
{ const res = [], allMates = mates.concat([drummer(['shaker'])]);
  for (const birth of [['kick'], ['shaker'], ['snare'], ['hat'], ['wood'], ['clap'], ['tom'], ['bell'], ['kick', 'snare'], ['hand']]) for (const role of ['solo', 'lead', 'bass', 'pad']) {
    const c = drummer(birth); let t = 0; while (!D.isFull(c) && t < 40000) { D.study(c, allMates, .002); t++; } for (const e of c.g.dk) if (e.l) e.p = 1; D.refresh(c);
    const m = c.mind, r = RS.rng(5); m.E = null; const cnt = {}, slots = new Set(); let bn = 0, ln = 0;
    for (let b = 0; b < 64; b++) for (const n of Mi.drumBar(Sf, m, b, role, b % 4 === 3, r, .8, [0, 2, 4])) { const v = D.voice(c.P.inst, n, 220); if (!v) continue; const k = (n.kit ? 'L:' : 'B:') + v.hit; cnt[k] = (cnt[k] || 0) + 1; if (n.kit) ln++; else bn++; slots.add(D.slotOf(v.hit)); }
    const top = Object.entries(cnt).sort((a, b) => b[1] - a[1]); res.push({ k: birth.join('+') + '/' + role, full: D.isFull(c), b: bn / (bn + ln), top: top[0][0], slots: slots.size, solo: role === 'solo' }); }
  const minB = Math.min(...res.map(q => q.b)), mean = res.reduce((a, q) => a + q.b, 0) / res.length, worst = res.slice().sort((a, b) => a.b - b.b)[0];
  ok('K7 full-kit veterans: birth hits are >= 50 % of notes in every birth set x role (birth sound stays the main part of its playing)', res.every(q => q.full) && minB >= .5, { min: +minB.toFixed(2), mean: +mean.toFixed(2), worst: worst.k, n: res.length });
  ok('K7 ... and the most-played single hit is always a birth hit', res.every(q => q.top.startsWith('B:')), res.filter(q => !q.top.startsWith('B:')).map(q => q.k + ' ' + q.top));
  ok('K7 ... while it still sounds like a full kit: alone (solo) every kit slot is heard', res.filter(q => q.solo).every(q => q.slots === D.KIT.length), res.filter(q => q.solo).map(q => q.slots)); }
console.log(`\nv08_kit_check: ${pass}/${tot} passed`); process.exit(pass === tot ? 0 : 1);
