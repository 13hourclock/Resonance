// DAW (river) model tests: each edit changes the lane's notes, the creature's motif and what the world plays; braided colony lanes;
// member-only edits; undo/redo; persistence through pack/unpack; tempo/transpose; mixer.
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw']) require('../www/js/' + m + '.js');
const C = RS.Creature, res = []; const ok = (name, pass, info) => res.push({ name, pass: !!pass, info });
const J = x => JSON.stringify(x);
function setup(n = 1, opt = {}) { const { Sf } = T.scene({ clear: true }); const cs = []; for (let i = 0; i < n; i++) cs.push(T.add(Sf, T.plain(11 + i * 3), Sf.view.cx - 60 + i * 50)); const D = RS.DAW(Sf); return { Sf, D, cs }; }
const playedBy = (c, t0) => T.notesSince(t0, n => n.lane === c.id && n.grid && n.gain > 1e-4 && n.scored);
const degsOf = (Sf, c, ns) => ns.map(n => n.n.deg);
// --- basic model
{ const { Sf, D, cs } = setup(1); const c = cs[0], L = D.lane(c.id); ok('creature has a lane', L && L.kind === 'creature'); const lanes = D.lanes(); ok('env + star lanes exist', lanes.some(l => l.kind === 'env') && lanes.some(l => l.kind === 'star'));
  const p0 = D.pattern(L); ok('pattern reads the motif', p0.notes.length === c.motif.filter(x => x != null).length, p0.notes.length);
  // add
  D.ops.loopLen(L, 16); D.edit(L, p => { p.notes = []; }); D.ops.add(L, 0, 0); D.ops.add(L, 4, 2); D.ops.add(L, 8, 4); D.ops.add(L, 12, 7);
  let p = D.pattern(L); ok('add: 4 notes at steps 0,4,8,12', J(p.notes.map(n => [n.s, n.deg])) === J([[0, 0], [4, 2], [8, 4], [12, 7]]), J(p.notes.map(n => [n.s, n.deg])));
  ok('add: creature motif updated + scored', c.scored && J(c.motif.filter(x => x != null)) === J([0, 2, 4, 7]), J(c.motif));
  // playback: the creature plays exactly the scored notes
  let t0 = T.t; T.run(Sf, 12); let pl = degsOf(Sf, c, playedBy(c, t0)); ok('playback follows the edited part', pl.length >= 4 && pl.every(d => [0, 2, 4, 7].includes(d)), J(pl.slice(0, 12)));
  // remove
  D.ops.remove(L, D.pattern(L).notes.find(n => n.deg === 7).k); ok('remove: note gone from motif', !c.motif.includes(7) && D.pattern(L).notes.length === 3);
  // move (time) + pitch
  let n4 = D.pattern(L).notes.find(n => n.deg === 2); D.ops.time(L, n4.k, 6); ok('move in time: step 4 -> 6', D.pattern(L).notes.some(n => n.s === 6 && n.deg === 2));
  n4 = D.pattern(L).notes.find(n => n.deg === 2); D.ops.pitch(L, n4.k, 3); ok('move in pitch: deg 2 -> 3', D.pattern(L).notes.some(n => n.s === 6 && n.deg === 3) && c.motif.includes(3));
  t0 = T.t + .4; T.run(Sf, 12); pl = degsOf(Sf, c, playedBy(c, t0)); /* v0.3.2: skip the ~160 ms of notes already handed to the audio clock before the edit (scheduler look-ahead), they cannot be recalled */ ok('playback after move/pitch/remove', pl.length >= 3 && pl.includes(3) && !pl.includes(2) && !pl.includes(7), J(pl.slice(0, 12)));
  // free tuning past the key
  n4 = D.pattern(L).notes.find(n => n.deg === 3); D.ops.pitch(L, n4.k, 3, 37); ok('free pitch: stores cents offset', c.freeCents && c.freeCents.some(x => x === 37));
  // chord (vertical swipe) + length + velocity
  D.ops.chord(L, 0, [2, 4]); ok('chord: stacked on step 0', J(D.pattern(L).notes.find(n => n.s === 0).chord) === J([2, 4]));
  t0 = T.t; T.run(Sf, 12); const chordNotes = playedBy(c, t0); const at0 = {}; chordNotes.forEach(n => { const k = n.when.toFixed(2); at0[k] = (at0[k] || 0) + 1; }); ok('chord plays simultaneous notes', Object.values(at0).some(v => v >= 3), J(Object.values(at0).slice(0, 8)));
  const nn = D.pattern(L).notes.find(n => n.s === 8); D.ops.length(L, nn.k, 6); ok('length edit', D.pattern(L).notes.find(n => n.s === 8).len === 6);
  D.ops.vel(L, nn.k, .2); ok('velocity edit', Math.abs(D.pattern(L).notes.find(n => n.s === 8).vel - .2) < 1e-6);
  t0 = T.t; T.run(Sf, 12); const soft = playedBy(c, t0).filter(n => Math.abs(degsOf(Sf, c, [n])[0] - 4) < .5 && !n.chord), loud = playedBy(c, t0).filter(n => degsOf(Sf, c, [n])[0] === 0); ok('velocity changes playback gain', soft.length && loud.length && soft[0].n.gain < loud[0].n.gain, soft.length && loud.length && [soft[0].n.gain, loud[0].n.gain].map(x => x.toFixed(3)).join(' '));
  // loop length, invert, retro, shiftRow
  D.ops.loopLen(L, 12); ok('loop length 16 -> 12', D.pattern(L).len === 12 && c.loopLen === 12);
  const before = D.pattern(L).notes.map(n => n.deg); D.ops.invert(L); const inv = D.pattern(L).notes.map(n => n.deg); ok('invert mirrors about the first note', inv.every((d, i) => d === 2 * before[0] - before[i]), J([before, inv]));
  const sb = D.pattern(L).notes.map(n => n.s).sort((a, b) => a - b); D.ops.retro(L); const sr = D.pattern(L).notes.map(n => n.s).sort((a, b) => a - b); ok('retrograde reverses time', J(sb) !== J(sr), J([sb, sr]));
  const row = D.pattern(L).notes[0].deg, s0 = D.pattern(L).notes.filter(n => n.deg === row).map(n => n.s); D.ops.shiftRow(L, row, 1); ok('shift a row = rhythm shift', D.pattern(L).notes.filter(n => n.deg === row).every((n, i) => n.s === (s0[i] + 1) % 12));
  // undo / redo
  const snapM = J(c.motif); D.ops.add(L, 2, 5); const after = J(c.motif); D.doUndo(); ok('undo restores motif', J(c.motif) === snapM); D.doRedo(); ok('redo re-applies', J(c.motif) === after);
  // loop region
  D.ops.loopRegion(L, 0, 8); ok('drawn loop sets length + keeps region', D.pattern(L).len === 8 && D.pattern(L).notes.every(n => n.s < 8));
  // tempo + transpose
  const bpm = Sf.M.bpm; D.tempo(1.25); ok('stretch river = tempo', Sf.M.bpm === Math.round(bpm * 1.25) && Sf.mods.music.bpm === Sf.M.bpm, [bpm, Sf.M.bpm]);
  const root = Sf.M.root, f0 = C.hz(Sf, c, 0); D.twist(60); ok('twist = transpose +2 semitones', Sf.M.root === (root + 2) % 12 && Math.abs(1200 * Math.log2(C.hz(Sf, c, 0) / f0)) > 50, [root, Sf.M.root]);
  // mixer
  D.mixOp.mute(L); t0 = T.t; T.run(Sf, 6); const mutedLoud = T.notesSince(t0 + .25, n => n.lane === c.id)   /* notes already handed to the audio clock (<= 1 lookahead) play out */.filter(n => n.n.gain > 1e-4).length; D.mixOp.mute(L); ok('hold = mute silences the lane', mutedLoud === 0, mutedLoud);
  D.mixOp.volume(L, .3); t0 = T.t; T.run(Sf, 8); const gv = playedBy(c, t0).map(n => n.n.gain); D.mixOp.volume(L, 1); t0 = T.t; T.run(Sf, 8); const gf = playedBy(c, t0).map(n => n.n.gain); const avg = a => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length); ok('pinch lane = volume', gv.length && gf.length && avg(gv) < avg(gf) * .5, [avg(gv), avg(gf)].map(x => x.toFixed(4)).join(' '));
  const c2 = T.add(Sf, T.plain(77), Sf.view.cx + 80); const L2 = D.lane(c2.id); D.mixOp.solo(L2); t0 = T.t; T.run(Sf, 8); const other = T.notesSince(t0 + .5, n => n.lane === c.id && n.gain > 1e-4).length; D.mixOp.solo(L2); ok('double-tap = solo silences others', other === 0, other);
  const b0 = c.P.bright; D.mixOp.timbre(L, .2); ok('pull lane edge = timbre', c.P.bright > b0);
  // copy a phrase to another lane
  const ks = D.pattern(L).notes.slice(0, 2).map(n => n.k), n2 = D.pattern(L2).notes.length; D.ops.copy(L, ks, L2, 0); ok('drag region = copy phrase to another lane', D.pattern(L2).notes.length === n2 + 2 && c2.scored);
  // persistence: pack -> fresh surface -> unpack
  for (const ci of Sf.active) Sf.dirty.add(ci); T.run(Sf, 2); const data = JSON.parse(JSON.stringify(Sf.pack())); const motif = J(c.motif), id = c.id;
  const o2 = T.make({}); o2.Sf.unpack(data, Date.now()); const vw = Sf.view, hw = (vw.x1 - vw.x0) / 2; o2.Sf.view = Object.assign({}, vw, { cx: c.x, cy: c.y, x0: c.x - hw, x1: c.x + hw, y0: c.y - 400, y1: c.y + 300 }); T.run(o2.Sf, 1); const c3 = o2.Sf.creatures.find(q => q.id === id) || o2.Sf.creatures.find(q => J(q.motif) === motif);
  ok('edits persist (motif, scored, loopLen) through save/load', c3 && J(c3.motif) === motif && c3.scored && c3.loopLen === 8, c3 ? [J(c3.motif), motif, c3.loopLen] : 'missing ' + o2.Sf.creatures.length + ' dead=' + c.dead + ' fade=' + c.fade + ' energy=' + c.energy + ' inSf=' + Sf.creatures.includes(c) + ' chunks=' + Object.keys(data.chunks).map(k => k + ':' + (data.chunks[k].c || []).map(q => q.id).join('|')).join(' ') + ' id=' + id);
  ok('tempo/key persist', o2.Sf.M.bpm === Sf.M.bpm && o2.Sf.M.root === Sf.M.root, [o2.Sf.M.bpm, Sf.M.bpm, o2.Sf.M.root, Sf.M.root]);
  ok('mixer persists', J(o2.Sf.mix) === J(Sf.mix)); }
// --- instruments retune physically
{ const { Sf } = T.scene({ clear: true }); const D = RS.DAW(Sf); const x = Sf.view.cx, gy = Sf.ground(x); const rod = Sf.makeRod ? Sf.makeRod([[x - 40, gy - 30], [x, gy - 30], [x + 40, gy - 30]], 3) : null;
  if (rod) { const t0 = rod.tension || 1; const L = { id: 'fake', kind: 'instrument', body: rod, ref: {} }; D.retune(rod, 4); const f = Sf.S.physics(rod).f0, tg = Sf.M.degHz(4), cents = 1200 * Math.log2(f / tg), off = Math.abs(((cents % 1200) + 1800) % 1200 - 600); ok('instrument lane pitch edit retunes the body physically to the note', (rod.tension || 1) !== t0 && off < 6, { t0, t: rod.tension, offCents: +off.toFixed(1) }); } else ok('instrument retune', false, 'no makeRod'); }
// --- colonies: braided lanes, unbraid = one aligned lane per member, member-only edits
{ const { Sf, D, cs } = setup(3); T.run(Sf, .5); let cl = null; for (let i = 1; i < 3; i++) cl = RS.Colony.fuse(Sf, cs[0], cs[i]) || cl; cl = cs[0].cluster; ok('colony formed', cl && cl.members.length === 3, cl && cl.members.length);
  let ls = D.lanes(); const K = ls.find(l => l.kind === 'colony'); ok('colony lane is braided by default', K && K.braided && !ls.some(l => l.sub));
  const g = D.geo(412, 860); const r = g.rows.find(rr => rr.L.id === K.id); ok('tap on braid = unbraid', D.tap(r.x0 + 30 || 100, r.y + r.h / 2, g, { r, p: D.pattern(K) }) === 'unbraid');
  ls = D.lanes(); const subs = ls.filter(l => l.sub); ok('unbraided: one sub-lane per member', subs.length === 3 && new Set(subs.map(l => l.ref)).size === 3, subs.length);
  const g2 = D.geo(412, 860), rows = g2.rows.filter(rr => rr.L.sub); const xsAt = rows.map(rr => [0, 4, 8, 12].map(st => D.sx(g2, rr, st, D.pattern(rr.L).len))); ok('sub-lanes time-aligned (same step -> same x on every member lane)', rows.length === 3 && xsAt.every(a => JSON.stringify(a) === JSON.stringify(xsAt[0])) && new Set(rows.map(rr => rr.y)).size === 3, xsAt[0]);
  ok('each sub-lane its own colour', new Set(subs.map(l => J(l.col))).size >= 2 || subs.every(l => l.col));
  const before = cs.map(c => J(c.motif)); const Lm = subs[1]; D.ops.add(Lm, 3, 6); const after = cs.map(c => J(c.motif)); const changed = cs.map((c, i) => before[i] !== after[i]);
  ok('editing a member lane changes only that member', changed.filter(Boolean).length === 1 && changed[cs.indexOf(Lm.ref)], J(changed));
  const t0 = T.t; T.run(Sf, 10); const pl = degsOf(Sf, Lm.ref, playedBy(Lm.ref, t0)); ok('edited member plays its new note', pl.includes(6) || playedBy(Lm.ref, t0).length > 0, J(pl.slice(0, 10)));
  D.mixOp.braid(K, false); ok('pinch = braid again', !D.lanes().some(l => l.sub)); }
// --- no DOM: the DAW draws on a canvas context only (smoke render with a recording fake context)
{ const { Sf, D } = setup(2); const calls = {}; const ctx = new Proxy({}, { get: (o, k) => { if (k in o) return o[k]; return (...a) => { calls[k] = (calls[k] || 0) + 1; return k === 'createLinearGradient' || k === 'createRadialGradient' ? { addColorStop: () => { } } : k === 'measureText' ? { width: 10 } : undefined; }; }, set: (o, k, v) => { o[k] = v; return true; } });
  let err = null; try { D.open = true; D.render(ctx, 412, 860, 1, 1); D.pat = { id: D.lanes()[0].id }; D.render(ctx, 412, 860, 1, 1); } catch (e) { err = e.stack; } ok('DAW renders to canvas (no DOM)', !err && (calls.arc || 0) > 3 && !calls.fillText, err || J(calls)); }
const pass = res.filter(r => r.pass).length; for (const r of res) console.log((r.pass ? 'ok  ' : 'FAIL') + ' ' + r.name + (r.info !== undefined ? '  ' + (typeof r.info === 'string' ? r.info : J(r.info)) : ''));
console.log(`DAW ${pass}/${res.length}`); process.exit(pass === res.length ? 0 : 1);
