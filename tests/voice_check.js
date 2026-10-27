// v08-voice check: THE BIG MOUTH (mouth.js). Offline: the live tract is rendered in a local TractFactory and measured (LPC formants, rms, zcr).
// tube double-tap opens it (the app glue is checked in pw_voice.js); tongue drag moves F1/F2 the right way and /a/ /i/ /u/ are reachable; roof tap = k / t by place,
// roof rub = s / sh, lips tap = p, lips held while voiced = m; the pitch arc snaps to the key and lifting stops the voice; a phrase sung twice is learned
// (Play.teach) and its syllables come back in a jam; undo removes it; nothing runs while the view is closed.
const T = require('./node_env.js'); let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const { formants } = require('./formants.js'), SR = 48000, Pm = RS.Play, Mo = RS.Mouth, Mi = RS.Mind, To = RS.Tonal, V = RS.Vocal;
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true;
let seed = 300; while (RS.Genome.express(T.plain(seed)).inst.percK > .2 || !(RS.Genome.express(T.plain(seed)).tract.amt > .3)) seed++;   // a melodic ohm with a throat (like play_check)
const c = T.add(Sf, T.plain(seed), 0), c2 = T.add(Sf, T.plain(seed + 7), 120); Sf.minds(); T.run(Sf, 1);
// ---- cost: play mode on, mouth closed: nothing ticks, nothing is sent, no live tract message anywhere
const s = Pm.enter(Sf, c); T.tract.length = 0; const st0 = { ...Mo.stats }; T.run(Sf, 3);
ok('COST closed: no mouth ticks / messages / live tract voice while play mode runs', Mo.cur === null && Mo.stats.ticks === st0.ticks && Mo.stats.sent === st0.sent && !T.tract.some(e => e.m.live), { ticks: Mo.stats.ticks, sent: Mo.stats.sent });
ok('OPEN needs the tube (no tube = no mouth)', Pm.vocalAmt(c) > .02 && !!s.tube && Mo.open(Sf, { ...s, tube: null }, 800, 480, 400, 240) === null);
// ---- offline live render harness
let TF = RS.TractFactory(SR), now = 0; const sent = []; Mo.send = m => { Mo.stats.sent++; sent.push(m); TF.msg(m); };
const L = new Float32Array(128), R = new Float32Array(128), Wt = new Float32Array(128), rec = [];
const run = (sec, M) => { const n = Math.round(sec * SR / 128); for (let b = 0; b < n; b++) { L.fill(0); R.fill(0); Wt.fill(0); TF.render(L, R, Wt, 128); for (let i = 0; i < 128; i++) rec.push(L[i] + R[i]); now += 128 / SR; if (M && Mo.cur === M) Mo.tick(Sf, M, now); } };
const tail = sec => Float32Array.from(rec.slice(-Math.round(sec * SR))), rms = x => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / Math.max(1, x.length)), zcr = x => { let z = 0; for (let i = 1; i < x.length; i++) if ((x[i] >= 0) !== (x[i - 1] >= 0)) z++; return z / x.length * SR; };
const tm0 = c.taughtMotif || 0; const M = Mo.open(Sf, s, 800, 480, 400, 300); run(.05, M);
ok('OPEN: a live tract voice is on for the played ohm; the pool reserves it (others: one voice fewer)', !!M && sent[0].live === 'on' && TF.stats().act === 1 && V.reserve === 1, { act: TF.stats().act });
{ V.busy.clear(); for (let k = 0; k < 3; k++) V.busy.set(900 + k, [[T.t, T.t + 2]]); const open3 = V.claim(999, T.t, .5); V.reserve = 0; const closed3 = V.claim(998, T.t, .5); V.reserve = 1; V.busy.clear();
  ok('POOL of 4: with the mouth open a 4th other singer falls back (played ohm keeps priority); closed it gets the voice', !open3 && closed3); }
const tid = { n: 1 }, nid = () => tid.n++;
// sing a vowel with the tongue only (no pitch finger): voiced at the current note while the finger is down
M.deg = Mo.degRange(M)[0];   // a low note: LPC formants are clean at a low f0
const vowelAt = (tu, td) => { const id = nid(), [x, y] = Mo.tonguePt(M, tu, td); Mo.down(Sf, M, id, x, y, now); run(.55, M); const f = formants(tail(.3), SR, 12); Mo.up(Sf, M, id, x, y, now); run(.15, M); return f; };
const F = { a: vowelAt(...V.VW.AA), i: vowelAt(...V.VW.IY), u: vowelAt(...V.VW.UW) }; if (process.env.DBG) console.log("dbg u", JSON.stringify(M.last), M.gain, M.tense);
ok('TONGUE /a/ reachable: F1 high, F2 mid', F.a[0] > 550 && F.a[1] > 900 && F.a[1] < 1600, F.a);
ok('TONGUE /i/ reachable: F1 low, F2 high', F.i[0] < 450 && F.i[1] > 1800, F.i);
ok('TONGUE /u/ reachable: F1 low, F2 low (rounded)', F.u[0] < F.a[0] * .6 && F.u[1] < 1100, F.u);
const back = vowelAt(.34, 2.3), front = vowelAt(.62, 2.3), hi = vowelAt(.5, 2.05), lo = vowelAt(.5, 3.0);
ok('TONGUE drag right (front) raises F2; drag down (lower/open) raises F1', front[1] > back[1] * 1.25 && lo[0] > hi[0] * 1.2, { back: back.slice(0, 2), front: front.slice(0, 2), hi: hi.slice(0, 2), lo: lo.slice(0, 2) });
run(.2, M); ok('LIFT the tongue finger (no pitch finger) = the voice stops', rms(tail(.1)) < 1e-4, { rms: rms(tail(.1)) });
// ---- consonants by place (each between voiced vowels at the current note)
const msgSince = i0 => sent.slice(i0).filter(m => m.live === 'set');
const roofTap = px => { const id = nid(), [x, y] = Mo.roofPt(M, px), i0 = sent.length; Mo.down(Sf, M, id, x, y, now); const closeM = { ...M.last }; run(.12, M); if (process.env.DBG) console.log(px, [...Array(12)].map((_, j) => rms(Float32Array.from(rec.slice(rec.length - Math.round(.12 * SR) + j * 480, rec.length - Math.round(.12 * SR) + (j + 1) * 480))).toFixed(4)).join(' ')); const sil = rms(tail(.05)); const i1 = sent.length; Mo.up(Sf, M, id, x, y, now); const rel = msgSince(i1).find(m => m.burst); run(.03, M); return { cx: closeM && closeM.cx, cd: closeM && closeM.cd, burst: !!rel, sil, bur: rms(tail(.025)), ph: M.lastCons }; };
const hapt = []; Mo.haptic = ms => hapt.push(ms);
const k = roofTap(.55), t = roofTap(.86);
ok('ROOF tap: back = k (closure at .55), middle = t (.8); release = a burst after silence; haptic on each tap', k.ph === 'K' && k.cx === .55 && k.cd === 0 && t.ph === 'T' && t.cx === .8 && k.burst && t.burst && k.bur > k.sil * 4 && t.bur > t.sil * 4 && hapt.length >= 2, { k, t, hapt: hapt.length });
const rub = px => { const id = nid(), [x, y] = Mo.roofPt(M, px); Mo.down(Sf, M, id, x, y, now); for (let j = 1; j <= 20; j++) { Mo.move(Sf, M, id, x + 12 * Math.sin(j), y, now); run(.02, M); } const sig = tail(.2), r = { z: zcr(sig), rms: rms(sig), ph: M.lastCons, vo: M.last.vo, cx: M.last.cx }; run(.25, M); r.idle = rms(tail(.05)); Mo.up(Sf, M, id, x, y, now); run(.05, M); return r; };
const S = rub(.88), SH = rub(.66);
ok('ROOF rub = a voiceless fricative: front = s, further back = sh; s brighter than sh; stops when the rub stops', S.ph === 'S' && SH.ph === 'SH' && S.vo === 0 && SH.vo === 0 && S.z > 3000 && SH.z > 1500 && S.z > SH.z && S.idle < S.rms * .3, { S, SH });
{ const id = nid(), [x, y] = Mo.lipsPt(M), i0 = sent.length; Mo.down(Sf, M, id, x, y, now); run(.05, M); Mo.up(Sf, M, id, x, y, now); const b = msgSince(i0).find(m => m.burst); run(.03, M);
  ok('LIPS tap = p (lips close, burst at the lips)', M.lastCons === 'P' && !!b && M.last.cx === .97, { ph: M.lastCons }); }
{ const tg = nid(), [tx, ty] = Mo.tonguePt(M, ...V.VW.AA); Mo.down(Sf, M, tg, tx, ty, now); run(.4, M); const open = rms(tail(.2)); const id = nid(), [x, y] = Mo.lipsPt(M); Mo.down(Sf, M, id, x, y, now); run(.4, M); const nas = M.last, mur = rms(tail(.2)), sig = tail(.2);
  Mo.up(Sf, M, id, x, y, now); run(.1, M); Mo.up(Sf, M, tg, tx, ty, now); run(.15, M);
  ok('LIPS held closed while voiced = m (velum open, a quieter voiced murmur)', M.lastCons === 'M' && nas.vel >= .4 && nas.lip === 0 && nas.vo === 1 && mur > 1e-3 && mur < open * .8, { open: +open.toFixed(4), mur: +mur.toFixed(4), z: Math.round(zcr(sig)) }); }
// ---- pitch arc: snapped to the scale in key; lift = silence
{ const tg = nid(), [tx, ty] = Mo.tonguePt(M, ...V.VW.AH); Mo.down(Sf, M, tg, tx, ty, now); run(.1, M); const pid = nid(), f0s = [], degs = [], base = Mi.tonicHz(Sf, c.mind);
  let [x, y] = Mo.arcPt(M, .05); Mo.down(Sf, M, pid, x, y, now); for (let u = .05; u <= .95; u += .03) { [x, y] = Mo.arcPt(M, u); Mo.move(Sf, M, pid, x + 3, y, now); run(.01, M); f0s.push(M.last.f0); degs.push(M.deg); }
  const inKey = f0s.every(f => To.degOfCents(c.mind.sys, 1200 * Math.log2(f / base)).err < 2), uniq = new Set(degs).size; run(.2, M); const lv = rms(tail(.1));
  Mo.up(Sf, M, pid, x, y, now); run(.2, M); const after = rms(tail(.08)); Mo.up(Sf, M, tg, tx, ty, now); run(.1, M);
  ok('PITCH arc: every pitch is a scale step in key (Mind.hz); the arc spans > an octave of steps', inKey && uniq >= c.mind.sys.cents.length + 1 && f0s[f0s.length - 1] > f0s[0] * 1.9, { n: c.mind.sys.cents.length, steps: uniq, lo: f0s[0], hi: f0s[f0s.length - 1] });
  ok('PITCH lifting the pitch finger stops the voice (tongue still down)', lv > 1e-3 && after < 1e-4, { voiced: +lv.toFixed(4), after }); }
// ---- teach by singing: the same 4-note phrase twice, with consonants and vowels
ok('TEACH: exploring vowels / consonants on one note (many touches) never teaches a flat phrase', (c.taughtMotif || 0) === tm0, { taught: c.taughtMotif || 0, notes: M.ph.length });
T.run(Sf, 3); M.ph.length = M.sy.length = 0; const mot0 = c.motif.slice(), n0 = c.taughtMotif || 0; c.sung = null;   // fresh phrase memory, and past the 2 s undo merge window
const phrase = [0, 2, 4, 2], vows = ['AA', 'IY', 'UW', 'EH'], cons = [.55, .86, null, .55];
const singOnce = () => { for (let j = 0; j < 4; j++) { if (cons[j] != null) roofTap(cons[j]); else { const id = nid(), [x, y] = Mo.lipsPt(M); Mo.down(Sf, M, id, x, y, now); run(.04, M); Mo.up(Sf, M, id, x, y, now); }
  const tg = nid(), [tx, ty] = Mo.tonguePt(M, ...V.VW[vows[j]]); Mo.down(Sf, M, tg, tx, ty, now); const [lo, hi] = Mo.degRange(M), u = (phrase[j] - lo) / (hi - lo), [ax, ay] = Mo.arcPt(M, u), pid = nid(); Mo.down(Sf, M, pid, ax, ay, now); run(.2, M); Mo.up(Sf, M, pid, ax, ay, now); Mo.up(Sf, M, tg, tx, ty, now); run(.05, M); } };
const tg0 = M.taught || 0; singOnce(); const once = c.taughtMotif || 0; singOnce();
ok('TEACH once is not enough; the same phrase sung twice is learned (motif = the sung steps, through Play.teach)', once === n0 && c.taughtMotif === n0 + 1 && c.motif.slice(0, 4).join() === phrase.join() && !!c.sung && M.taught === tg0 + 1, { once, n0, n: c.taughtMotif, taught: M.taught, motif: c.motif, sung: c.sung && c.sung.syl.map(y => (y.on || []).join('') + y.nu) });
ok('TEACH keeps the sung syllables (consonant + vowel per note)', c.sung && c.sung.syl.slice(0, 4).map(y => (y.on || []).join('') + '-' + y.nu).join() === 'K-AA,T-IY,P-UW,K-EH', c.sung && c.sung.syl.slice(0, 4));
// ---- close: off, pool back, nothing runs afterwards
const preClose = Mo.stats.sent; Mo.close(Sf, M); run(.4); ok('CLOSE: the live voice is freed, the pool is back to normal', Mo.cur === null && sent[sent.length - 1].live === 'off' && TF.stats().act === 0 && V.reserve === 0 && Mo.stats.sent === preClose + 1, TF.stats());
{ const tk = Mo.stats.ticks, sn = Mo.stats.sent; T.tract.length = 0; T.run(Sf, 2); ok('COST after close: nothing ticks or sends', Mo.stats.ticks === tk && Mo.stats.sent === sn && !T.tract.some(e => e.m.live)); }
{ const s2 = Pm.enter(Sf, c), M2 = Mo.open(Sf, s2, 800, 480, 400, 300); const was = !!Mo.cur; Pm.exit(Sf, s2); ok('EXIT play mode closes an open mouth (no voice left on)', was && Mo.cur === null && sent[sent.length - 1].live === 'off' && M2.closed); }
// ---- jams: the learned phrase is sung with its syllables
Pm.exit(Sf, s); const jamSung = () => { V.busy.clear(); T.tract.length = 0; if (!c.jam) RS.Jam.form(Sf, [c, c2], .8); T.run(Sf, 16); return T.tract.filter(e => e.n.src === c || (e.n.lane != null && e.n.lane === c.id)).map(e => e.n.syl).filter(Boolean); };
const js = jamSung(); if (process.env.DBG) { const ns = T.notes.filter(e => e.n.src === c || e.n.lane === c.id); console.log("dbg roles", [...new Set(ns.map(e => e.n.role))], c.mind.role, c2.mind && c2.mind.role, "lead", c.jam.leader === c); console.log("dbg tract", T.tract.length, "notesC", ns.length, "keys", Object.keys(ns[0] ? ns[0].n : {}).join(","), "role", c.jam && c.jam.roles ? JSON.stringify(c.jam.roles) : "", c.P.tract.amt, c.g[168], !!c.sung, T.notes.length); } const sungS = js.filter(y => y.sung), nus = new Set(sungS.map(y => y.nu));
ok('JAM: the taught phrase comes back in a jam, sung with its own syllables', !!c.jam && sungS.length >= 3 && [...nus].every(n => vows.includes(n)) && nus.size >= 2, { jam: !!c.jam, syl: js.length, sung: sungS.length, nus: [...nus] });
// ---- undo removes it
let u = 0; while (c.sung && u++ < 30) Sf.doUndo();
ok('UNDO removes the sung phrase (motif and syllables back)', !c.sung && c.motif.join() === mot0.join() && (c.taughtMotif || 0) === n0, { motif: c.motif, undos: u });
const js2 = jamSung(); ok('UNDO: the jam no longer sings the taught syllables', js2.filter(y => y.sung).length === 0, { syl: js2.length });
ok('SAVE: the sung phrase is part of the creature record', 'sung' in RS.Creature.serial(c));
console.log(`voice_check: ${pass}/${tot}`); process.exit(pass === tot ? 0 : 1);
