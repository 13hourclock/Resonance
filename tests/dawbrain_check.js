// v08-dawbrain headless check (Wilbow 7:39 PM MDT Oct 24 2026: "The dawn view should show the notes and elements the ohms music brain is using";
// 7:41 PM approved all six: live notes, chords and scale, role and rhythm cycle, where notes came from, which sound, drum kit hits).
// B1 nothing is recorded until the DAW has been drawn once; then the ring holds exactly what Mi.play sent (same positions as Sf.mindLog)
// B2 the ring is capped and preallocated (same typed arrays after a long run; nothing new on the creature; never in a save)
// B3 the stored tune is the ghost while live notes show; editing still writes the stored tune and lights the ghost; the live ring is untouched
// B4 chord + bar + tradition cycle per bar; the lattice / chord glow / cycle marks draw (fake canvas), text-free
// B5 role marks; B6 note origins (own / learned / taught / the player's); B7 learned sound (faint / clean / teacher colour) through the real Mi.play
// B8 drummers: kit hits land in their kit rows; B9 kill switch + off-screen rows cost nothing; B10 render cost
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dawbrain']) require('../www/js/' + m + '.js');
const DB = RS.DawBrain, Mi = RS.Mind, res = []; const ok = (name, pass, info) => res.push({ name, pass: !!pass, info }); const J = x => JSON.stringify(x);
const fake = () => { const calls = {}; const ctx = new Proxy({}, { get: (o, k) => { if (k in o) return o[k]; return (...a) => { calls[k] = (calls[k] || 0) + 1; return k === 'createLinearGradient' || k === 'createRadialGradient' ? { addColorStop: () => { } } : k === 'measureText' ? { width: 10 } : undefined; }; }, set: (o, k, v) => { o[k] = v; return true; } }); return { ctx, calls }; };
function setup(n = 2, opt = {}) { const { Sf } = T.scene({ clear: true }); const cs = []; for (let i = 0; i < n; i++) { const c = T.add(Sf, T.plain(31 + i * 5), Sf.view.cx - 60 + i * 60, { quiet: false }); if (c.mind) c.mind.quiet = false; cs.push(c); } const D = RS.DAW(Sf); T.run(Sf, .5); for (const c of cs) if (c.mind) c.mind.quiet = false; return { Sf, D, cs }; }
const render = (D, W = 412, H = 860) => { const f = fake(); D.open = true; D.render(f.ctx, W, H, 1, 1); return f; };
const runDraw = (Sf, D, sec) => { for (let i = 0; i < sec * 60; i++) { T.t += 1 / 60; Sf.step(1 / 60); if (i % 6 === 0) render(D); } };
// --- B1
{ DB.armed = false; const { Sf, D, cs } = setup(2); T.run(Sf, 4); ok('B1 DAW never opened: nothing recorded', cs.every(c => !DB.has(c)), cs.map(c => DB.has(c)));
  render(D); ok("B1 drawing the DAW arms the recorder", DB.armed); { const D2 = RS.DAW(Sf); DB.armed = false; const f = fake(); D2.open = false; D2.render(f.ctx, 412, 860, 1, 1); ok("B1 a closed river fading out does not arm it", !DB.armed); render(D); } const L0 = (Sf.mindLog || []).length; T.run(Sf, 6); for (let k = 0; k < 6 && !cs.some(c => DB.has(c) && DB.view(c).notes.length >= 3); k++) T.run(Sf, 3);   /* a quiet ohm may play only a note or two in 6 s: keep listening */
  const c = cs.slice().sort((a, b) => (DB.has(b) ? DB.view(b).notes.length : 0) - (DB.has(a) ? DB.view(a).notes.length : 0))[0], v = DB.view(c);
  const logged = (Sf.mindLog || []).filter(r => r.c === c).slice(-DB.N).map(r => +r.pos.toFixed(3)), got = v ? v.notes.map(n => +n.pos.toFixed(3)) : [];
  const tail = logged.slice(-Math.min(logged.length, got.length)); ok('B1 the ring = exactly what the brain played (positions match Sf.mindLog)', got.length >= 3 && J(got.slice(-tail.length)) === J(tail), { got, log: tail }); }
// --- B2
{ const { Sf, D, cs } = setup(1); const c = cs[0]; render(D); T.run(Sf, 2); const R = DB.ring(c), arr = [R.pos, R.deg, R.src, R.snd, R.slot, R.tid]; T.run(Sf, 40);
  ok('B2 the ring is capped (64 notes)', R.n <= DB.N && R.n > 10, R.n); ok('B2 no reallocation (same typed arrays after 40 s)', arr[0] === R.pos && arr[1] === R.deg && arr[2] === R.src && arr[3] === R.snd && arr[4] === R.slot && arr[5] === R.tid);
  ok('B2 nothing new on the ohm (kept in a WeakMap: never saved)', !Object.values(c).some(v => v === R || (v && typeof v === 'object' && Object.values(v).includes(R))));
  const sv = RS.Store && Sf.serialCreature ? JSON.stringify(Sf.serialCreature(c)) : JSON.stringify(Object.keys(c)); ok('B2 a save carries no brain ring', !/"pos":\{|Float32/.test(sv)); }
// --- B3
{ const { Sf, D, cs } = setup(1); const c = cs[0], L = D.lane(c.id); render(D); runDraw(Sf, D, 4); ok('B3 live notes show on the lane', DB.liveCount(c) > 0, DB.liveCount(c));
  ok('B3 stored tune = faint ghost behind live notes', DB.ghostA(L, false) < .5, DB.ghostA(L, false)); ok('B3 open pattern lattice = the stored tune at full', DB.ghostA(L, true) === 1);
  const v0 = J(DB.view(c).notes), p0 = D.pattern(L), es = [...Array(p0.len).keys()].find(s => !p0.notes.some(n => n.s === s)), m0 = J(p0.notes); D.ops.add(L, es, 5); ok('B3 an edit still writes the stored tune', J(D.pattern(L).notes) !== m0 && D.pattern(L).notes.some(n => n.s === es && n.deg === 5), { es, n: D.pattern(L).notes.length });
  ok('B3 an edit does not touch the live ring', J(DB.view(c).notes) === v0); ok('B3 the ghost lights up on an edit', DB.ghostA(L, false) > .9, DB.ghostA(L, false));
  const tw = performance.now(); while (performance.now() - tw < DB.EDIT_MS + 60) { } const n = D.pattern(L).notes[0]; D.sel.add(L.id + ':' + n.k); ok('B3 a selected stored bead keeps the ghost lit', DB.ghostA(L, false) === 1, DB.ghostA(L, false)); D.sel.clear();
  const g = D.geo(412, 860), r = g.rows.find(q => q.L.id === L.id), bx = D.sx(g, r, n.s, D.pattern(L).len), by = D.dy(r, n.deg); D.down(bx + 2, by, g); ok('B3 a finger on a ghost bead lights it (still the same edit gestures)', DB.ghostA(L, false) === 1, { a: DB.ghostA(L, false), h: !!D.dragH() }); D.up(bx + 2, by, g);
  const t1 = performance.now(); while (performance.now() - t1 < DB.EDIT_MS + 60) { } ok('B3 the ghost fades back after the edit', DB.ghostA(L, false) < .5, DB.ghostA(L, false)); }
// --- B4
{ const { Sf, D, cs } = setup(2); render(D); const seen = new Set(); for (let i = 0; i < 900; i++) { T.t += 1 / 60; Sf.step(1 / 60); if (i % 6 === 0) { render(D); if (cs[0].mind.bar >= 0) seen.add(cs[0].mind.bar); } } const c = cs[0], v = DB.view(c), m = c.mind; ok('B4 every bar the brain made has its chord + length recorded', seen.size >= 1 && v.bars.length === Math.min(DB.NB, seen.size) && v.bars.every(b => b.bar >= 0 && b.chord.length >= 2 && b.L === Mi.barLen(m)), v.bars.slice(-3));
  const last = v.bars.find(b => b.bar === m.bar); ok('B4 the latest bar\'s chord = the chord the brain follows', last && J(last.chord) === J(m.curChord.slice(0, 4).map(Math.round)), { last, cur: m.curChord });
  const f = render(D); ok('B4 lattice / glow / marks draw (batched), no text', (f.calls.fillRect || 0) + (f.calls.rect || 0) > 40 && !f.calls.fillText && !f.calls.strokeText, { rect: f.calls.rect, fillRect: f.calls.fillRect, fill: f.calls.fill });
  // a tradition cycle (gamelan: the gong lands on cycle bar 0)
  const E = { id: 'tE', trad: 'gamelan', trCyc: 4, members: [c], sys: m.sys, leader: c }; m.E = E; m.bar = (m.bar || 0) + 1; DB.barRec(Sf, c, DB.ring(c)); const b1 = DB.view(c).bars.find(b => b.bar === m.bar);
  ok('B4 the cycle position per bar (tradition cycle)', b1 && b1.cyc === RS.Trad.cycBar(E, m, m.bar), b1); m.E = null; }
// --- B5
{ const R = ['melody', 'solo', 'answer', 'counter', 'comp', 'texture', 'bass', 'pulse:all', 'pulse:low', 'listen'].map(DB.ROLE); ok('B5 role marks: lead / second / comp / bass / drums / listen', J(R) === J(['lead', 'lead', 'second', 'second', 'comp', 'comp', 'bass', 'drums', 'drums', 'listen']), R);
  const { Sf, D, cs } = setup(1); render(D); runDraw(Sf, D, 2); const marks = {}; for (const ro of ['melody', 'comp', 'bass', 'pulse:time', 'listen', 'answer']) { cs[0].mind.role = ro; const f = render(D); marks[ro] = (f.calls.arc || 0) + '/' + (f.calls.moveTo || 0); } ok('B5 every role draws its own mark', new Set(Object.values(marks)).size >= 4, marks); }
// --- B6 (origins through DB.rec with real notes)
{ const { Sf, D, cs } = setup(1); const c = cs[0], m = c.mind; render(D); m.role = 'melody'; const send = o => DB.rec(Sf, c, Object.assign({ pos: m.pos, d: 1, vel: .6, deg: 2 }, o), Sf.now(), 8, null, null, 300), lastSrc = () => DB.view(c).notes.slice(-1)[0].src;
  send({}); const own = lastSrc(); c.taughtMotif = (c.taughtMotif || 0) + 1; send({}); const taught = lastSrc(); c.copied = (c.copied || 0) + 1; send({}); const learned = lastSrc(); send({ added: true }); const rec = lastSrc(); send({ manual: true }); const man = lastSrc(); send({ chordTone: true }); const ct = lastSrc(); m.role = 'bass'; send({}); const bass = lastSrc();
  ok('B6 origins: own / taught / learned (latest wins) / recorded / played live', J([own, taught, learned, rec, man]) === J([0, 2, 1, 3, 3]), [own, taught, learned, rec, man]); ok('B6 chord tones and bass lines are the ohm\'s own (no ring)', ct === 0 && bass === 0, [ct, bass]);
  c.scored = true; m.role = 'melody'; send({}); ok('B6 a tune written in the DAW counts as taught', lastSrc() === 2); }
// --- B7 (learned sounds through the real Mi.play)
{ const { Sf, D, cs } = setup(2); const [c, tch] = cs; render(D); c.exp = c.exp || RS.Exp.make(c); c.exp.sl = [{ s: tch.id, k: 'colour', p: .6, P: tch.P.inst, t0: 0 }]; const pk = RS.Layers.pick; let mode = 'faint';
  RS.Layers.pick = (Sf2, cc, o) => cc === c && !o.perc ? (mode === 'faint' ? { faint: true, P: tch.P.inst, a: .3, i: 0 } : { clean: true, P: tch.P.inst, i: 0 }) : null;
  try { T.run(Sf, 8); let v = DB.view(c).notes.filter(n => n.tid === tch.id); ok('B7 a faint learned layer is marked with its teacher', v.length > 0 && v.every(n => n.snd === 1), v.slice(-2));
    mode = 'clean'; T.run(Sf, 4); v = DB.view(c).notes.filter(n => n.snd === 2); ok('B7 a clean learned sound is marked (teacher\'s colour)', v.length > 0 && v.every(n => n.tid === tch.id) && DB.colOf(Sf, tch.id) === tch.col, v.length); } finally { RS.Layers.pick = pk; }
  c.exp.sl = []; T.run(Sf, 8); ok('B7 birth voice notes stay unmarked', DB.view(c).notes.slice(-4).every(n => n.snd === 0), DB.view(c).notes.slice(-4).map(n => n.snd)); }
// --- B8 drummers
{ const { Sf, D } = setup(0); render(D); const g = RS.Genome.random(9101); g[RS.IG.perc] = .92; g.dk = ['kick', 'snare', 'hat'].map((h, i) => ({ h, s: RS.hash('dbk', i) >>> 0, b: 1 })); const c = Sf.addCreature(g, Sf.view.cx, Sf.ground(Sf.view.cx) - 40, { growth: 1, energy: .9 }); if (c.mind) c.mind.quiet = false;
  runDraw(Sf, D, 8); const v = DB.view(c), hits = v ? v.notes.filter(n => n.slot >= 0) : [], used = [...new Set(hits.map(n => n.slot))].sort();
  ok('B8 a drummer\'s lane splits into kit rows', DB.drummer(c), c.mind && c.mind.perc); ok('B8 kit hits land in their rows (kick low, snare back, hat time)', hits.length > 4 && used.every(s => [0, 1, 2].includes(s)) && used.length >= 2, { n: hits.length, used });
  const f = render(D); ok('B8 kit rows draw', (f.calls.fillRect || 0) > 10, f.calls.fillRect); }
// --- B9 kill switch + off-screen
{ const { Sf, D, cs } = setup(2); render(D); T.run(Sf, 3); const n0 = DB.view(cs[0]).notes.length + DB.ring(cs[0]).i; RS.DAWBRAIN = false; const f0 = render(D); T.run(Sf, 3); const n1 = DB.view(cs[0]).notes.length + DB.ring(cs[0]).i; RS.DAWBRAIN = undefined;
  ok('B9 RS.DAWBRAIN = false: no recording', n1 === n0, [n0, n1]); const f1 = render(D); ok('B9 ... and no brain layer drawn', (f0.calls.fillRect || 0) < (f1.calls.fillRect || 0), [f0.calls.fillRect, f1.calls.fillRect]);
  D.scrollY = 5000; const f2 = render(D); D.scrollY = 0; ok('B9 rows off screen draw no brain layer', (f2.calls.fillRect || 0) <= (f0.calls.fillRect || 0) + 1, [f2.calls.fillRect, f0.calls.fillRect]); }
// --- B10 cost
{ const { Sf, D, cs } = setup(10); render(D); runDraw(Sf, D, 6); const N = 200; let t0 = performance.now(); for (let i = 0; i < N; i++) render(D); const on = (performance.now() - t0) / N; RS.DAWBRAIN = false; t0 = performance.now(); for (let i = 0; i < N; i++) render(D); const off = (performance.now() - t0) / N; RS.DAWBRAIN = undefined;
  ok('B10 brain layer render cost (10 ohm lanes, fake canvas) < 1.5 ms per frame', on - off < 1.5, { on: +on.toFixed(3), off: +off.toFixed(3) });
  const c = cs[0], m = c.mind, o = { pos: 0, d: 1, vel: .5, deg: 1 }; t0 = performance.now(); for (let i = 0; i < 20000; i++) { o.pos = i; DB.rec(Sf, c, o, 0, 8, null, null, 300); } const us = (performance.now() - t0) / 20000 * 1000; ok('B10 the emit hook < 2 us per note', us < 2, +us.toFixed(3)); }
// --- B11 (v08-bdfix crowd cap, merged in v0.8b8): live notes = what is HEARD. A crowded scene: every note the cap drops is missing from the ring too
{ const { Sf, D, cs } = setup(12); render(D); const cnt = new Map(), seen = new Map(); for (const c of cs) { cnt.set(c, 0); } const ml0 = (Sf.mindLog || []).length; const sk0 = Sf.stats.crowdSkip || 0;
  const pl = Sf.play; let heard = 0; Sf.play = function (spec, ...a) { if (spec && spec.src && cs.includes(spec.src) && !spec._lyF) heard++; return pl.call(this, spec, ...a); };
  const rec = DB.rec; let rings = 0; DB.rec = function (...a) { rings++; return rec.apply(this, a); }; const mp = Mi.play; let logged = 0; const lg0 = () => (Sf.mindLog || []).length;
  try { for (let i = 0; i < 600; i++) { const n0 = (Sf.mindLog || []).length; T.t += 1 / 60; Sf.step(1 / 60); const n1 = (Sf.mindLog || []).length; logged += n1 >= n0 ? n1 - n0 : n1 - n0 + 100; if (i % 6 === 0) render(D); } } finally { Sf.play = pl; DB.rec = rec; }
  const skipped = (Sf.stats.crowdSkip || 0) - sk0; ok('B11 a crowded scene really drops notes (crowd cap)', skipped > 0, skipped);
  ok('B11 the ring gets exactly the notes that were heard (dropped notes never show)', rings > 0 && rings === logged, { rings, logged, skipped }); }
const pass = res.filter(r => r.pass).length; for (const r of res) console.log((r.pass ? 'ok  ' : 'FAIL') + ' ' + r.name + (r.info !== undefined ? '  ' + (typeof r.info === 'string' ? r.info : J(r.info)) : ''));
console.log(`DAWBRAIN ${pass}/${res.length}`); process.exit(pass === res.length ? 0 : 1);
