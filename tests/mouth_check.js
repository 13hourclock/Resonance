// v08-mouth check (Wilbow 5:27 / 5:29 / 5:31 PM MDT Oct 24 2026): every ohm wears a MOUTH (mouthlook.js); a double tap on a vocal ohm's mouth in play mode opens the
// big mouth (app glue: pw_mouth.js); what is played in play mode is ADDED to the ohm's phrase (quantised, never replacing it), undoable and saved.
// LOOK: shaped by the voice genes, no two alike, cached (no rebuild per frame); non-vocal = a tiny closed mouth. ANIM: opens / shapes the sung vowel, lips shut on p/b/m.
// COST: nothing is drawn when tiny on screen; off-screen ohms (never drawn) build nothing. HIT: generous, vocal only. GHOST: once, saved. RECORD / MERGE / UNDO / SAVE.
process.env.ID_SEED = process.env.ID_SEED || '71'; const T = require('./node_env.js'); let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const Ml = RS.MouthLook, Pm = RS.Play, Mo = RS.Mouth, Mi = RS.Mind;
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true;
let seed = 300; while (RS.Genome.express(T.plain(seed)).inst.percK > .2 || !(RS.Genome.express(T.plain(seed)).tract.amt > .3)) seed++;
const g = T.plain(seed); g[168] = .8; const c = T.add(Sf, g, 0); let ds = seed + 1; while (!(RS.Genome.express(T.plain(ds)).inst.percK > .5)) ds++; const dr = T.add(Sf, T.plain(ds), 120);
const c2 = T.add(Sf, T.plain(seed + 7), -120); Sf.minds(); T.run(Sf, 1);
// ---- LOOK
{ const q = { g: Float32Array.from(c.g), P: RS.Genome.express(c.g) }; q.P = Object.assign({}, q.P, { tract: Object.assign({}, q.P.tract, { amt: .1 }) }); q.g[168] = .1; ok('VOCAL: an instrument voice with hardly any throat (< .2) wears the closed mouth', !Ml.vocal(q)); }
ok('VOCAL: a singer (tract gene >= .5) has a vocal mouth; a drummer does not', Ml.vocal(c) && !Ml.vocal(dr), { c: Ml.vocal(c), dr: Ml.vocal(dr), percK: dr.P.inst.percK });
{ const keys = [], vs = []; for (let i = 0; i < 24; i++) { const gi = T.plain(1000 + i * 13); if (i % 2) gi[168] = .5 + .5 * ((i * 7) % 10) / 10; const P = RS.Genome.express(gi), q = { g: gi, P, col: [180, 160, 200], words: null, sung: null }; const L = Ml.look(q).L; vs.push(L.voc); keys.push([L.hw, L.k, L.round, L.nose, L.bow, L.gap, L.lw].map(v => v.toFixed(3)).join()); }
  ok('LOOK: 24 ohms, 24 different mouths (width / curve / roundness / nose / bow / gap / lips)', new Set(keys).size === 24 && vs.some(Boolean) && vs.some(v => !v), { distinct: new Set(keys).size, vocal: vs.filter(Boolean).length }); }
{ const q = { g: Float32Array.from(c.g), P: RS.Genome.express(c.g), col: c.col }; const a = { ...Ml.look(q).L }; q.g[171] = (q.g[171] + .5) % 1; q.P = RS.Genome.express(q.g); const b = { ...Ml.look(q).L }; q.P = RS.Genome.express(c.g); q.voice = { tu: 0, td: 0, lip: .3, vel: .5, tense: -.8 }; const v = { ...Ml.look(q).L };
  const L1 = RS.Genome.express(Object.assign(Float32Array.from(c.g), { [RS.GI.size || 0]: c.g[RS.GI.size || 0] })).tract;
  ok('LOOK follows the voice genes and the learned tube voice (agility = bow, rounder lips / breathier / nasal voice = rounder, parted, a nose)', (a.bow > 0) !== (b.bow > 0) || a.bow !== b.bow, { a: a.bow, b: b.bow });
  ok('LOOK: a rounded, breathy, nasal tube voice changes the mouth (rounder, parted lips, nose)', v.round > a.round && v.gap > a.gap && v.nose >= a.nose, { round: [a.round, v.round], gap: [a.gap, v.gap], nose: [a.nose, v.nose] }); }
{ const L = Ml.look(dr).L, Lc = Ml.look(c).L; ok('NON-VOCAL: a tiny closed mouth (smaller than a singer\'s, never opens, no glow)', !L.voc && L.hw < Lc.hw && L.open0 === 0 && L.gap === 0, { dr: L.hw, c: Lc.hw }); }
// ---- DRAW cost (a counting fake canvas)
const calls = { n: 0 }, ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (o[k] = typeof k === 'string' && /^(begin|arc|ell|move|quad|line|stroke|fill)/.test(k) && !/Style|Width|Cap/.test(k) ? () => { calls.n++; } : undefined), set: (o, k, v) => { o[k] = v; return true; } });
Sf.view.z = 1; const lk0 = Ml.stats.looks; calls.n = 0; for (let i = 0; i < 600; i++) Ml.draw(ctx, Sf, c, 1); const per = calls.n / 600;
ok('DRAW: a handful of canvas calls per ohm per frame, the look is never rebuilt while it stays the same', per > 2 && per < 16 && Ml.stats.looks === lk0, { perFrame: per, rebuilt: Ml.stats.looks - lk0 });
Sf.view.z = .02; calls.n = 0; const sk0 = Ml.stats.skipped; for (let i = 0; i < 100; i++) Ml.draw(ctx, Sf, c, 1); ok('DRAW: zoomed far out (mouth < 1.4 px) = skipped, no canvas calls', calls.n === 0 && Ml.stats.skipped === sk0 + 100); Sf.view.z = 1;
ok('COST: an ohm that was never on screen has no mouth state at all (built on first draw only)', (() => { const q = T.add(Sf, T.plain(seed + 40), 300); Sf.minds(); T.run(Sf, 1); const has = Ml.stats.looks; return Ml.look(q) && Ml.stats.looks === has + 1; })());
{ const e = Ml.look(c), tn = 10; c.noteT = tn; c.noteDur = .4; c.noteVel = .8; c.notePerc = false; e.syT = tn; const at = (sy, dt) => { e.sy = sy; const s = Ml.shape(Sf, c, e, tn + dt); return [s[0], s[1]]; };
  const A = at({ on: [], nu: 'AA' }, .15), I = at({ on: [], nu: 'IY' }, .15), U = at({ on: [], nu: 'UW' }, .15), M0 = at({ on: ['M'], nu: 'AA' }, .02), M1 = at({ on: ['M'], nu: 'AA' }, .15), off = at({ on: [], nu: 'AA' }, .6), H = at(null, .15);
  ok('ANIM: /a/ opens wide, /i/ barely, /u/ narrower (rounded); closed again after the note', A[0] > I[0] * 1.5 && U[1] < I[1] && off[0] === 0, { A, I, U, off });
  ok('ANIM: lips shut on an m / b / p onset, then open on the vowel; a sung note without a syllable = a soft hum', M0[0] === 0 && M1[0] > 0 && H[0] > 0 && H[0] < A[0], { M0, M1, H });
  const ed = Ml.look(dr); dr.noteT = tn; dr.noteDur = .4; dr.notePerc = false; ed.sy = { on: [], nu: 'AA' }; ed.syT = tn; ok('ANIM: a non-vocal mouth never opens', Ml.shape(Sf, dr, ed, tn + .15)[0] === 0); }
{ RS.Jam.form(Sf, [c, c2], .8); Ml.look(c); const seen = new Set(); let opens = 0; for (let i = 0; i < 480; i++) { T.run(Sf, 1 / 30); const e = Ml.look(c), s = Ml.shape(Sf, c, e, T.t); if (s[0] > 0) opens++; if (e.sy && e.syT === c.noteT) seen.add(e.sy.nu); }
  ok('ANIM live: singing in a jam opens the mouth on its notes with the vowels it sings', opens > 10 && seen.size >= 1, { opens, vowels: [...seen] }); }
// ---- HIT
{ const p = Ml.pt(Sf, c), pd = Ml.pt(Sf, dr), R = Ml.headR(c); ok('HIT: the mouth (and ~R/2 around it) hits; the far side of the body does not; a non-vocal mouth never hits', Ml.hit(Sf, c, p[0], p[1]) && Ml.hit(Sf, c, p[0] + R * .4, p[1]) && !Ml.hit(Sf, c, p[0] - R * 1.6, p[1] - R * 1.2) && !Ml.hit(Sf, dr, pd[0], pd[1], 30), { R });
  ok('HIT: the minimum target (30 px at the play zoom) is respected', Ml.hit(Sf, c, p[0] + 29 / 1.8, p[1], 30 / 1.8) && !Ml.hit(Sf, c, p[0] + 80, p[1], 30 / 1.8)); }
// ---- GHOST once
Sf.mods.guide.mouthHint = 0; Sf._mhint = null; { Sf.mods.guide.done = false; const st = Pm.enter(Sf, c), tut = !Sf._mhint && !Sf.mods.guide.mouthHint; Pm.exit(Sf, st); Sf.mods.guide.done = true; ok('GHOST: not during the tutorial (it has its own play-mode ghosts); kept for later', tut); }
{ const sd = Pm.enter(Sf, dr); const nh = !Sf._mhint; Pm.exit(Sf, sd); const s1 = Pm.enter(Sf, c), h1 = Sf._mhint && Sf._mhint.id === c.id; Pm.exit(Sf, s1); Sf._mhint = null; const s2 = Pm.enter(Sf, c), h2 = !!Sf._mhint; Pm.exit(Sf, s2);
  ok('GHOST: not on a non-vocal ohm; shown the first time play mode opens on a vocal ohm, never again (saved in the guide state)', nh && h1 && !h2 && Sf.mods.guide.mouthHint === 1, { nh, h1, h2 }); }
// ---- RECORD + MERGE
T.run(Sf, 3); c.addPh = null; const mot0 = c.motif.slice(); let s = Pm.enter(Sf, c); const play = (degs, hold = .15, gap = .3) => { for (const d of degs) { const o = s.nodes.find(n => n.deg === d) || s.nodes[0]; Pm.note(Sf, s, o, .7); T.run(Sf, hold); Pm.up(Sf, s); T.run(Sf, gap); } };
play([4, 2, 5]); const pre = s.rec.length; s.drag = { kind: 'handle' }; Pm.up(Sf, s); const prev = s.rec.length;
ok('RECORD: node taps are recorded on the jam grid (bar, 16th, scale step); the tweak preview note is not', pre === 3 && prev === 3 && s.rec.every(r => Number.isInteger(r.s) && r.s >= 0 && r.s < r.L && Number.isInteger(r.deg)), s.rec.map(r => [r.bar, r.s, r.deg, r.d]));
Pm.exit(Sf, s); const A1 = c.addPh;
ok('COMMIT on leaving play mode: the 3 notes are added to the phrase (the motif itself is unchanged)', A1 && A1.notes.length === 3 && A1.notes.map(n => n.deg).join() === '4,2,5' && c.motif.join() === mot0.join(), A1);
{ const m = c.mind, L = Mi.barLen(m), own = [{ s: 0, d: 2, deg: 0, vel: .7 }, { s: 4, d: 2, deg: 1, vel: .7 }], ad = { notes: A1.notes.map((n, i) => ({ ...n, p: 1, b: 0, s: [0, 6, 9][i] })) }; c.addPh = ad;
  const out = Ml.merge(Sf, m, 5, own), keep = own.every(o => out.includes(o)), adds = out.filter(o => o.added);
  ok('MERGE: the ohm keeps every note of its own; added notes only on free 16ths (the one on its note is dropped), a bit softer', keep && adds.length === 2 && adds.every(a => a.s !== 0 && a.vel < .7) && out.length === 4, out.map(o => [o.s, o.deg, !!o.added]));
  m.bd = 'thin'; const bd = Ml.merge(Sf, m, 5, own); m.bd = null; const rest = Ml.merge(Sf, m, 5, [{ s: 0, d: 4, deg: 0, hum: true }]), none = Ml.merge(Sf, m, 5, []);
  ok('MERGE: nothing is added in a breakdown bar, a resting bar or a hum-only bar', bd === own && rest.length === 1 && none.length === 0);
  c.addPh = { notes: [...Array(8)].map((_, i) => ({ p: 1, b: 0, s: 1 + i, d: 1, deg: i, vel: .7, n: i + 1 })) }; ok('MERGE: at most 4 added notes in one bar', Ml.merge(Sf, m, 1, own).filter(o => o.added).length === Ml.PER_BAR);
  c.addPh = { notes: [{ p: 2, b: 1, s: 6, d: 2, deg: 3, vel: .7, n: 1 }] }; ok('MERGE: a note added on bar 2 of a 2-bar loop plays on odd bars only', Ml.merge(Sf, m, 3, own).length === 3 && Ml.merge(Sf, m, 4, own).length === 2); c.addPh = A1; }
{ const a0 = Ml.stats.added, t0 = T.t; if (!c.jam) RS.Jam.form(Sf, [c, c2], .8); T.run(Sf, 16); const ns = T.notesSince(t0, n => n.src === c && !n.manual), degs = new Set(A1.notes.map(n => n.deg));
  ok('JAM: the added notes are played in the jam, in key (as scale steps), alongside its own phrase', Ml.stats.added > a0 && ns.length > Ml.stats.added - a0, { added: Ml.stats.added - a0, notes: ns.length }); }
// collisions, cap, undo
T.run(Sf, 3); s = Pm.enter(Sf, c); Sf._mhint = null; { const rec = [{ bar: 10, s: A1.notes[0].s, deg: 7, vel: .7, d: 2, t: T.t, rate: 8, L: 16, done: 1 }]; for (let i = 0; i < 9; i++) rec.push({ bar: 10, s: (A1.notes[0].s + 1 + i) % 16, deg: i % 5, vel: .6, d: 1, t: T.t, rate: 8, L: 16, done: 1 }); s.rec = rec; }
Pm.exit(Sf, s); const A2 = c.addPh;
ok('COLLIDE + CAP: a newer note on the same 16th replaces the older; the session keeps its last 8; the layer holds 8 at most', A2.notes.length === 8 && !A2.notes.some(n => n.deg === 7) && A2.notes.length <= Ml.CAP, A2.notes.map(n => [n.s, n.deg]));
Sf.doUndo(); ok('UNDO: the last addition comes off (the earlier one is back)', JSON.stringify(c.addPh.notes) === JSON.stringify(A1.notes), c.addPh);
T.run(Sf, 3); Sf.doUndo(); ok('UNDO again: no additions at all', !c.addPh);
// teach: a phrase played twice is taught as the motif, not added on top
T.run(Sf, 3); s = Pm.enter(Sf, c); const tm = c.taughtMotif || 0; play([0, 2, 4, 2], .1, .15); play([0, 2, 4, 2], .1, .15); const taught = (c.taughtMotif || 0) > tm; Pm.exit(Sf, s);
ok('TEACH: a phrase played twice becomes the motif (as before) and is not added again', taught && !c.addPh, { taught, add: c.addPh });
// mouth notes
T.run(Sf, 3); s = Pm.enter(Sf, c); Sf._mhint = null; { const M = Mo.open(Sf, s, 800, 480, 400, 300); Mo.send = () => { }; M.deg = 3; M.t = Sf.now(); Mo.noteOn(M); T.run(Sf, .3); M.t = Sf.now(); M.deg = 1; M.note = null; Mo.noteOn(M); T.run(Sf, .2); Mo.close(Sf, M); }
const rs = s.rec.map(r => [r.deg, r.sing, r.d]); Pm.exit(Sf, s);
ok('MOUTH notes: notes sung in the big mouth are recorded (as sung notes) and added', rs.length === 2 && rs.every(r => r[1]) && c.addPh && c.addPh.notes.map(n => n.deg).join() === '3,1' && c.addPh.notes.every(n => n.sing), { rs, add: c.addPh });
// save
{ const ser = RS.Creature.serial(c); const { Sf: S2 } = T.scene({ clear: true }); const q = S2.loadCreature(JSON.parse(JSON.stringify(ser)));
  if (process.env.DBG) console.log(!!q, q && JSON.stringify(q.addPh), Object.keys(ser).filter(k => /^(_ml|mouthLook|look)$/i.test(k)));
  ok('SAVE: the additions are part of the ohm record and come back on load (no mouth cache saved)', 'addPh' in ser && q && JSON.stringify(q.addPh) === JSON.stringify(c.addPh) && !Object.keys(ser).some(k => /^(_ml|mouthLook|look)$/i.test(k)), Object.keys(ser).length); }
{ const SS = RS.SongSave, snap = SS.pack(Sf), keep = JSON.stringify(c.addPh); c.addPh = null; const r = SS.apply(Sf, snap); ok('SONGSAVE: the song snapshot restores the additions too', r != null && JSON.stringify(c.addPh) === keep, { r }); }
console.log(`mouth_check: ${pass}/${tot}`); process.exit(pass === tot ? 0 : 1);
