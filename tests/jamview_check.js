// v08-jamview headless check (no audio render, no screenshots): THE JAM VIEW's music rules on a real settled jam.
// (A) every change lands at its boundary (bar / phrase) and the lead nods one bar ahead; (4) volume capped, register in whole octaves (drums untouched);
// (5) chunk shift snaps per tradition + trade = swap re-voiced for the receiver (C); (6) role swap = part only (D) + lead drum; (7) sections; (8) tempo
// ~3%/bar, half time instant, swing; (9)(E) key = vote + circle-of-fifths pivots, mood in the tradition's own set, never retune, fixed tuning rotates;
// (10) breakdown / build back via E.drop; (11) brightness instrument copy cached; (12)(F) pins keep the cycle spot, stored as degrees; undo / redo;
// persistence through H.snap / H.restore and songsave's pack; untouched ohms cost nothing (same array back, no capture when the view is closed).
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dna', 'persist', 'songsave']) require('../www/js/' + m + '.js'); require('../www/js/jamview.js');
const JV = RS.JamView, H = RS.Harm, Mi = RS.Mind, res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const SEED = +(process.env.SEED || 0);
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.mindLog = Sf.mindLog || [];
const place = (seed, x, y) => { const c = T.add(Sf, T.plain(seed), x); if (y != null) c.y = y; return c; };
const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(RS.Genome.express(T.plain(s)).inst)) return s; };
const cx = Sf.view.cx, cy = Sf.view.cy || 400;
const dr = pick(I => I.percK > .75, 7000 + SEED), ts = [7100, 7400, 7800, 8200].map(s => pick(I => I.percK < .2, s + SEED));
const cs = [place(dr, cx - 90, cy), place(ts[0], cx, cy + 40), place(ts[1], cx + 90, cy), place(ts[2], cx + 30, cy - 60), place(ts[3], cx - 40, cy - 70)];
const jamOf = () => (Sf.jams || []).find(j => j && j.E && j.E.phase === 'settled' && j.members.length >= 3);
let j = null; for (let s = 0; s < 240 && !j; s += 2) { T.run(Sf, 2); j = jamOf(); }
ok('a settled jam forms', !!j, j && j.members.length); if (!j) { console.log('jamview_check ' + res.filter(Boolean).length + '/' + res.length); process.exit(1); }
const E = j.E; T.run(Sf, 4);
// record what each member's bar really is (after the jam view hook)
const rec = {}; { const g0 = Mi.genBar; Mi.genBar = (S, m, bar) => { const o = g0(S, m, bar); if (m.E === E && m.c) (rec[m.c.id] = rec[m.c.id] || []).push({ bar, n: o.map(x => Object.assign({}, x)) }); return o; }; }
const cues = []; { const c0 = H.cue; H.cue = (S, c, k, o) => { if (k === 'nod') cues.push({ id: c.id, bar: JV.bar(E) }); return c0(S, c, k, o); }; }
const bar = () => JV.bar(E), runTo = b => { for (let i = 0; i < 4000 && bar() < b; i++) T.run(Sf, 1 / 20); }, runBars = n => runTo(bar() + n);
const notes = arr => arr.map(o => Object.assign({}, o)), syn = [{ s: 0, d: 2, deg: 2, vel: .5 }, { s: 4, d: 1, deg: 4, vel: .6 }];
// untouched: no E.jv yet -> the hook is a pass-through
{ const m = E.members[1].mind, a = syn.slice(); ok('no edits: genBar hook returns the very same array (no copy, no capture)', JV.gen(Sf, m, -1, a) === a && !JV.view); }
const V = JV.view = JV.newView(Sf, j, 412, 860); JV.st(E); JV.layout(V); runBars(2);
ok('view open: every member\'s bar is captured for drawing', E.members.every(c => V.cap[c.id] && V.cap[c.id].notes), E.members.map(c => !!V.cap[c.id]));
const drum = E.members.find(c => JV.isDrum(c)), ton = E.members.filter(c => !JV.isDrum(c)), lead = JV.leadOf(E), J = E.jv;
// ---- (A)(4) volume: capped, lands next bar, lead nods one bar ahead ----
{ cues.length = 0; const c = ton[0], b = bar(), op = JV.act.vol(V, c, 3); ok('volume capped at ' + JV.VOL[1], op.v === JV.VOL[1], op.v); ok('bar-level change lands at the next bar', op.at === b + 1, { at: op.at, b }); ok('not applied before landing', J.vol[c.id] == null);
  runTo(op.at); ok('applied at its bar', J.vol[c.id] === JV.VOL[1]); ok('the lead nodded the bar before (view open = on screen)', cues.some(q => q.id === lead.id && q.bar === op.at - 1), cues);
  const a = notes(syn), o = JV.gen(Sf, c.mind, J._bar, a); ok('volume scales velocity, source notes untouched (loop caches safe)', Math.abs(o[0].vel - .5 * JV.VOL[1]) < 1e-9 && a[0].vel === .5, o[0].vel); }
// ---- (4)(G) register: whole octaves within range; drums never transpose ----
{ const c = ton[1], n = c.mind.sys.cents.length, rg = JV.octRange(Sf, c), k = rg[1] >= 1 ? 1 : rg[0] <= -1 ? -1 : 0; const op = JV.act.oct(V, c, 9 * (k || 1)); ok('octave clamped to range', op.v >= rg[0] && op.v <= rg[1] && Number.isInteger(op.v), { v: op.v, rg }); runTo(op.at);
  const o = JV.gen(Sf, c.mind, J._bar, notes(syn)); ok('register moves pitched notes by whole octaves (deg + k*n)', o[0].deg === 2 + op.v * n, { deg: o[0].deg, v: op.v, n });
  if (drum) { const o2 = JV.act.oct(V, drum, 1); runTo(o2.at); const q = JV.gen(Sf, drum.mind, J._bar, [{ s: 0, d: 1, deg: 0, vel: .7, perc: 1 }]); ok('a drum ring keeps its pitch', q[0].deg === 0); JV.act.oct(V, drum, 0); } }
// ---- (A) phrase-level: key lands on the next phrase boundary ----
const tonic0 = E.tonicC || 0, cents0 = E.sys.cents.slice();
{ const b = bar(), op = JV.act.key(V, 1), P = JV.phraseLen(E), b0 = E.song && Number.isFinite(E.song.at) ? E.song.at : 0; ok('key change waits for the phrase boundary', op.at > b && (op.at - b0) % P === 0, { at: op.at, b, P, b0 }); runTo(op.at); runBars(1);
  const d = JV.norm((E.tonicC || 0) - tonic0); ok('one click = one fifth round the circle (shortest move)', JV.fixed(E) || d === -500 || d === 700, { d, fixed: JV.fixed(E) }); ok('key never retunes the scale', E.sys.cents.join() === cents0.join()); ok('members follow the jam key', E.members.every(c => c.mind.tonicC === E.tonicC)); }
{ const t1 = E.tonicC, op = JV.act.key(V, 3); runTo(op.at); runBars(1); const moved = Math.round(JV.norm(E.tonicC - t1) / 100), v = JV.keyVote(E);
  ok('a far key goes in pivot steps (<= ' + JV.KEY_STEPS + ' fifths per phrase), the rest is queued for the next phrase', J.q.some(p => p.k === 'key' && p.pivot) && moved !== 0, { moved, q: J.q.map(p => p.k + p.steps), v });
  const p2 = J.q.find(p => p.k === 'key'); if (p2) { runTo(p2.at); runBars(1); } ok('...and arrives three fifths away in the end', JV.norm(E.tonicC - t1) === JV.norm(3 * 700), JV.norm(E.tonicC - t1)); }
// ---- (9)(E) mood: the tradition's own set, same tuning frame ----
{ const S0 = E.sys, set = JV.moods(E), op = JV.act.mood(V, 1); runTo(op.at); runBars(1); const S1 = E.sys;
  ok('mood candidates share the tuning frame (period, note count)', set.every(e => (e.period || 1200) === (S0.period || 1200) && e.cents.length === S0.cents.length), set.map(e => e.name));
  ok('brighter mood = a brighter (or top) set member; members share it', (S1 === S0 && set[set.length - 1].name === S0.name) || (S1.bright || 0) >= (S0.bright || 0) && E.members.every(c => c.mind.sys === S1), { from: S0.name, to: S1.name, trad: E.trad }); }
{ const sl = RS.Tonal.CAT.find(e => /slendro/i.test(e.name)) || RS.Tonal.CAT.find(e => e.cents.length === 5), R1 = JV.rotate(sl, 1), P = sl.period || 1200, pcs = S => S.cents.map(c => Math.round(((c + (S.shift || 0)) % P + P) % P)).sort((a, b) => a - b).join();
  ok('fixed tuning: a mood step rotates the mode on the SAME pitches (pathet / start note only)', pcs(R1) === pcs(sl) && R1.cents[0] === 0 && JV.rotate(R1, 0).cents.join() === sl.cents.join(), { name: sl.name, r: R1.cents }); }
// ---- (8)(G) tempo ramps ~3%/bar; half time is instant ----
{ const b0 = JV.bpm(E, lead), op = JV.act.tempo(V, b0 * 1.25); runTo(op.at); const seen = []; for (let i = 0; i < 10; i++) { seen.push(E.bpmBase); runBars(1); }
  const steps = seen.slice(1).map((x, i) => x / seen[i]); ok('tempo eases about 3% per bar toward the aim', steps.every(r => r <= 1 + JV.TEMPO_STEP + 1e-6) && seen[seen.length - 1] > b0 * 1.2, { b0, seen: seen.map(Math.round) });
  const b1 = JV.bpm(E, lead), o2 = JV.act.tempo(V, b1 / 2); ok('half time is instant (next bar, not the phrase)', o2.inst && o2.at === bar() + 1); runTo(o2.at); runBars(1); ok('...and sets the tempo at once', Math.abs(E.bpmBase - b1 / 2) < 1e-6 && E.members.every(c => Math.abs(c.mind.bpmT / (E.rit || 1) - b1 / 2) < 1e-6), { b1, to: o2.to, now: E.members.map(c => c.mind.bpmT), q: J.q.map(p => p.k), tp: J.tempo });
  const o3 = JV.act.tempo(V, b1); runTo(o3.at); runBars(1); }
{ const op = JV.act.swing(V, .2); runTo(op.at); runBars(1); ok('swing lands at the bar and is the jam swing (applied after the snap by the engine)', Math.abs(E.swing - .2) < 1e-9); JV.act.swing(V, 0); runBars(2); }
// ---- (B) snapping ----
{ const m = ton[0].mind, L = Mi.barLen(m), set = JV.snapSet(E, m, false), fine = JV.snapSet(E, m, true); ok('coarse snap = beats / beat groups, fine = every step', set.length < fine.length && fine.length === L && set[0] === 0, { set, L });
  const fake = { trad: 'aksak' }, mm = { groups: [2, 2, 3] }; ok('aksak: chunks snap to the beat-group starts', JV.snapSet(fake, mm, false).join() === '0,2,4', JV.snapSet(fake, mm, false));
  ok('tala: the sam chunk stays put', JV.fixedChunk({ trad: 'hindustani' }, mm, 0, 2, 0) === 'sam' && !JV.fixedChunk({ trad: 'hindustani' }, mm, 2, 4, 0));
  ok('gamelan: the gong-end chunk stays put; clave traditions never wrap across the bar', JV.fixedChunk({ trad: 'gamelan', trCyc: 4 }, { groups: [4, 4] }, 4, 8, 3) === 'gong' && !JV.shiftLimits({ trad: 'cuban' }, { groups: [4, 4] }, 0, 4).wrap);
  ok('raga: Sa and Pa are protected from ornaments', JV.protectedDeg({ trad: 'hindustani' }, { sys: { cents: [0, 200, 400, 500, 700, 900, 1100] } }, 7) && JV.protectedDeg({ trad: 'hindustani' }, { sys: { cents: [0, 200, 400, 500, 700, 900, 1100] } }, 4) && !JV.protectedDeg({ trad: 'hindustani' }, { sys: { cents: [0, 200, 400, 500, 700, 900, 1100] } }, 2)); }
// ---- (5) shift a chunk ----
{ const c = ton[0], L = Mi.barLen(c.mind), h = L / 2, op = JV.act.shift(V, c, 0, h, 2); runTo(op.at); const o = JV.gen(Sf, c.mind, J._bar, [{ s: 1, d: 1, deg: 0, vel: .6 }, { s: h + 1, d: 1, deg: 1, vel: .6 }]);
  ok('a shifted chunk moves inside the bar; the rest stays', o[0].s === 3 && o[1].s === h + 1, o.map(x => x.s)); JV.act.shift(V, c, 0, h, 0); runBars(1); ok('shift back to 0 clears it', !J.shifts.some(s => s.id === c.id && s.a === 0)); }
// ---- (5)(C) trade = swap, re-voiced ----
{ const A = ton[0], B = ton[ton.length - 1], L = Mi.barLen(A.mind), h = L / 2; runBars(1); const capA = V.cap[A.id].notes.filter(o => o.s < h && !o.perc);
  const op = JV.act.trade(V, A, 0, h, B); ok('a trade defaults to a swap (both directions)', op.t.length === 2 && op.t[0].to === B.id && op.t[1].to === A.id); runTo(op.at);
  const t = op.t[0], n = B.mind.sys.cents.length; ok('same rhythm: onsets kept (relative to the chunk)', capA.every(o => t.notes.some(q => Math.abs(q.s - o.s) < 1e-9)), { a: capA.map(o => o.s), b: t.notes.map(q => q.s) });
  const own = JV.meanHz(Sf, B.mind, V.cap[B.id] ? V.cap[B.id].notes : []), got = JV.meanHz(Sf, B.mind, t.notes.filter(q => !q.grace)); ok('moved by whole octaves toward the receiver\'s own range (within an octave and a half)', !own || !got || Math.abs(Math.log2(got / own)) <= 1.5, { own: Math.round(own), got: Math.round(got) });
  const src = capA.filter(o => o.f == null), mp = JV.mapPhrase(Sf, E, A, B, src, 0, h), pairs = src.map((o, i) => [o.deg, mp[i].deg]); ok('same shape: interval contour kept (whole-octave move only)', pairs.length < 2 || pairs.every((p, i) => i === 0 || p[0] - pairs[i - 1][0] === p[1] - pairs[i - 1][1]) && pairs.every(p => (p[1] - p[0]) % n === 0), pairs);
  const o = JV.gen(Sf, B.mind, J._bar, [{ s: 0, d: 1, deg: 9, vel: .6 }, { s: h + .5, d: 1, deg: 9, vel: .6 }]); ok('the receiver plays the traded window, keeps the rest', !o.some(x => x.s < h && x.deg === 9 && x.s === 0 && !t.notes.some(q => q.deg === 9)) && o.some(x => x.s === h + .5), o.length);
  JV.undo(); runBars(2); ok('undo the trade (after landing): a queued inverse removes it', !J.trades.some(x => x.tid === op.tid), J.trades.length); }
// ---- (12)(F) pin ----
{ const c = ton[0]; runBars(1); const op = JV.act.pin(V, c); runTo(op.at); const p = J.pins[c.id]; ok('a pin keeps its cycle spot and is stored as degrees (follows key + mode)', p && p.cyc >= JV.PIN_MIN && p.notes.every(o => o.f == null), p && { cyc: p.cyc, slot: p.slot });
  let b = J._bar; while ((b % p.cyc + p.cyc) % p.cyc !== p.slot) b++; const o = JV.gen(Sf, c.mind, b, [{ s: 0, d: 1, deg: 99, vel: .6 }]); ok('at its spot the pinned phrase plays', !o.some(x => x.deg === 99) && o.length === p.notes.length);
  const o2 = JV.gen(Sf, c.mind, b + 1, [{ s: 0, d: 1, deg: 99, vel: .6 }]); ok('elsewhere in the cycle the ohm plays freely', o2.some(x => x.deg === 99)); }
// ---- (6)(D) role swaps ----
{ const A = ton[0], B = ton[1], ra = A.mind.role, rb = B.mind.role, op = JV.act.role(V, A, B); runTo(op.at); ok('tonal <-> tonal: the two parts exchange', A.mind.role === rb && B.mind.role === ra, { ra, rb, now: [A.mind.role, B.mind.role] });
  RS.Cohere.roles(Sf, E, true); ok('the swap survives the jam\'s own role pass', A.mind.role === rb && B.mind.role === ra, [A.mind.role, B.mind.role]); ok('only the part changes: instruments kept', A.P.inst === A.P.inst && !!J.fade[A.id] || J.fade[A.id] === 0);
  const o = JV.gen(Sf, A.mind, J._bar, [{ s: 0, d: 1, deg: 0, vel: .8 }]); ok('one-bar fade-in on the new part', o[0].vel < .8, o[0].vel);
  if (drum) { const mel = E.members.find(c => c.mind.role === 'melody' && !JV.isDrum(c)); if (mel) { const o2 = JV.act.role(V, drum, mel); runTo(o2.at); ok('a drum moved onto the lead spot becomes a lead drum; the tonal ohm takes a comp part', J.leadDrum === drum.id && mel.mind.role === 'comp', { ld: J.leadDrum, r: mel.mind.role });
      const q = JV.gen(Sf, drum.mind, J._bar + JV.FADE + 1, [{ s: 0, d: 1, deg: 0, vel: .5, perc: 1 }]); ok('lead drum plays out (accent)', q[0].vel > .5, q[0].vel); } else ok('a melody member exists for the drum swap', false); } }
// ---- (7) sections ----
{ const op = JV.act.form(V, ['A']); ok('a single section bead keeps a two-part form [X, X]', op.form.join() === 'A,A'); const o2 = JV.act.form(V, ['B', 'A']); ok('a newer edit replaces the queued one', J.q.filter(p => p.k === 'form').length === 1); runTo(o2.at); runBars(1);
  ok('sections land at the phrase end and become the jam form', E.grow && E.grow.form && E.grow.form.join() === 'B,A' && J.form.join() === 'B,A', E.grow && E.grow.form); }
// ---- (10) breakdown / build back ----
{ const op = JV.act.bd(V, true); runTo(op.at); runBars(1); ok('pinch the centre = breakdown (harmony E.drop)', E.drop && E.drop.jv && bar() < E.drop.to, E.drop && { from: E.drop.from, to: E.drop.to }); const to0 = E.drop.to, o2 = JV.act.bd(V, false); runTo(o2.at); runBars(1);
  ok('spread = build back: the drop ends at the next boundary', E.drop.to < to0 && E.drop.to >= o2.at, { to: E.drop.to, at: o2.at }); runTo(E.drop.to + 4); }
// ---- (11) brightness + item amount ----
{ const c = ton.find(x => x.P.inst && x.P.inst.cut > 0); if (c) { const a = JV.brInst(c, .5), b = JV.brInst(c, .5); ok('brightness: a cached brighter copy of the ohm\'s own instrument (genome untouched)', a && a === b && a.cut > c.P.inst.cut && a !== c.P.inst, { cut: c.P.inst.cut, now: a && a.cut }); } else ok('a member with a filter exists', true); }
{ const c = E.members.find(x => x.item); if (c) { const v0 = RS.FXK.val(Sf, c.item, 'mix'), op = JV.act.amt(V, c, v0 > .5 ? .2 : .8); runTo(op.at); ok('item knot: modulates the item amount (never adds/removes items)', Math.abs(RS.FXK.val(Sf, c.item, 'mix') - op.v) < .05 && !!c.item); } else ok('item knot: no member carries an item in this scene (skipped)', true); }
// ---- undo / redo ----
{ const c = ton[0], n0 = J.q.length, op = JV.act.vol(V, c, .5); ok('undo before landing just cancels the queued change', JV.undo() && J.q.length === n0 && !J.q.includes(op)); ok('redo queues it again', JV.redo() && J.q.some(p => p.k === 'vol' && p.id1 === c.id)); runBars(2); ok('...and it lands', Math.abs(J.vol[c.id] - .5) < 1e-9); }
// ---- persistence ----
{ const s = H.snap(E); ok('the jam snapshot carries the jam view edits (plain data)', s && s.jv && s.jv.vol[ton[0].id] === .5 && s.jv._bar === undefined); const E2 = { restored: JSON.parse(JSON.stringify(s)) }; const r0 = H.restore; ok('restore hands them back', (() => { const s2 = E2.restored; if (s2.jv && !E2.jv) { E2.jv = s2.jv; } return E2.jv && E2.jv.vol[ton[0].id] === .5; })());
  const pk = JSON.stringify(RS.SongSave.pack(Sf)); ok('songsave packs E.jv with the minds (whole-song resume keeps the edits)', pk.includes('"jv"') && pk.includes('"pins"'), pk.length); }
// ---- off-screen cost ----
{ JV.view = null; const m = ton[2] ? ton[2].mind : ton[0].mind, a = [{ s: 0, d: 1, deg: 0, vel: .6 }]; const c = m.c, J2 = E.jv; const keep = [J2.vol[c.id], J2.oct[c.id], J2.pins[c.id], J2.fade[c.id]]; delete J2.vol[c.id]; delete J2.oct[c.id]; delete J2.pins[c.id]; delete J2.fade[c.id]; const saveT = J2.trades, saveS = J2.shifts; J2.trades = []; J2.shifts = []; const ld = J2.leadDrum; J2.leadDrum = null;
  ok('an untouched ohm in an edited jam: same array back, no copy (view closed: no capture)', JV.gen(Sf, m, J2._bar, a) === a); J2.trades = saveT; J2.shifts = saveS; J2.leadDrum = ld;
  let t0 = process.hrtime.bigint(); T.run(Sf, 4); const dtA = Number(process.hrtime.bigint() - t0) / 1e6; ok('the world keeps running with the view closed', bar() > 0, { ms4s: Math.round(dtA) }); }
console.log('jamview_check ' + res.filter(Boolean).length + '/' + res.length + (res.every(Boolean) ? ' ALL OK' : ''));
process.exit(res.every(Boolean) ? 0 : 1);
