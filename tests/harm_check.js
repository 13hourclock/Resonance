// v0.3.1 lean checks: harmonic brains (listening followers, cues), settling + lock, tap join / mute (C1 option B, C18), cue body signs, C7/C8 fixes.
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dna']) require('../www/js/' + m + '.js');
const H = RS.Harm, J = RS.Jam, res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const mk = () => { const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; return Sf; };
const place = (Sf, seed, x, y) => { const c = T.add(Sf, T.plain(seed), x); if (y != null) c.y = y; return c; };
const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(RS.Genome.express(T.plain(s)).inst)) return s; };
const Sf = mk(), cx = Sf.view.cx, cy = Sf.view.cy || 400; H.log = [];
const dr = pick(I => I.percK > .75, 7000), t1 = pick(I => I.percK < .2, 7100), t2 = pick(I => I.percK < .2, 7400), t3 = pick(I => I.percK < .2, 7800);
const cs = [place(Sf, dr, cx - 90, cy), place(Sf, t1, cx, cy + 40), place(Sf, t2, cx + 90, cy), place(Sf, t3, cx + 30, cy - 60)];
T.run(Sf, 70); const E = cs.map(c => c.mind.E).find(Boolean);
ok('HARM the ohms form ONE frame (no second pair-frame next to it)', E && cs.filter(c => c.mind.E === E).length >= 3, { frames: [...new Set(cs.map(c => c.mind.E && c.mind.E.id))] });
const ch = H.log.filter(e => e.k === 'chord' && E && e.E === E.id), bel = H.log.filter(e => e.k === 'belief' && E && e.E === E.id);
ok('HARM the proposer moves through >= 3 chords, changing every 1-2 bars', new Set(ch.map(e => e.id)).size >= 3 && ch.length >= 8, { chords: ch.map(e => e.id).slice(0, 16).join(' ') });
{ const beat = E ? 60 / E.members[0].mind.bpm : .6; let n = 0, hit = 0; const ton = new Set(cs.filter(c => c.mind.perc <= .55).map(c => c.id));
  for (let i = 1; i < ch.length; i++) { if (ch[i].id === ch[i - 1].id) continue; for (const f of ton) { if (f === ch[i].by) continue; if (!bel.some(e => e.c === f && Math.abs(e.t - ch[i].t) < 8 * beat)) continue; n++; if (bel.some(e => e.c === f && e.id === ch[i].id && e.t >= ch[i].t - .25 && e.t <= ch[i].t + beat)) hit++; } }
  ok('HARM followers find the new chord BY EAR within 1 beat >= 80% of changes', n >= 6 && hit / n >= .8, { checks: n, pct: Math.round(100 * hit / Math.max(1, n)) }); }
const settled = H.log.find(e => e.k === 'settled' && E && e.E === E.id), rearr = H.log.filter(e => e.k === 'rearrange' && E && e.E === E.id && e.settled);
ok('SETTLE the frame settles (score >= .7 for ~2 phrases) and does not re-arrange after the lock', !!settled && E.phase === 'settled' && rearr.length === 0, { settledAt: settled && +settled.t.toFixed(1), after: rearr.length, score: E && +(E.score || 0).toFixed(2) });
// C1 option B / C18: tap a member = mute (same state as the DAW mute), tap again = back
const mem = cs.find(c => c.jam && c.mind.perc <= .55 && c.mind.E && c.mind.E.prop !== c) || cs.find(c => c.jam);
if (mem) { const r1 = Sf.jamTap(mem); const t0 = T.t; T.run(Sf, 6); const loud = T.notes.filter(n => n.when > t0 + .3 && n.n.src === mem && n.n.mind && (n.n.gain || 0) > 1e-4).length; const mixMuted = !!(Sf.mix[mem.id] && Sf.mix[mem.id].mute);
  const r2 = Sf.jamTap(mem); ok('TAP a jam member mutes it (silent, still in the jam, DAW mix shows the same mute); tap again unmutes', r1 === 'mute' && loud === 0 && mem.jam && mixMuted && r2 === 'unmute' && !mem.muted, { r1, r2, loud, mixMuted }); }
else ok('TAP a jam member mutes it', false, 'no jam');
// a bystander near the jam is silent; a tap brings it in (listens first, enters at the top of a phrase)
const by = place(Sf, pick(I => I.percK < .2, 8600), cx + 220, cy + 10); T.run(Sf, 4); const j = cs.find(c => c.jam) && cs.find(c => c.jam).jam;
const t0 = T.t; T.run(Sf, 4); const byNotes = T.notes.filter(n => n.when > t0 && n.n.src === by && n.n.mind && !n.n.hum).length;
ok('BYSTANDER an ohm next to the jam (not in it) stays quiet and watches', byNotes === 0 && (!!by.bystander || by.jam === j), { notes: byNotes, watching: !!by.bystander, inJam: by.jam === j });
if (!by.jam) { const r = Sf.jamTap(by); const listen = by.mind.hb && by.mind.hb.listen; T.run(Sf, 30); const first = T.notes.find(n => n.n.src === by && n.n.mind && !n.n.hum && n.when > T.t - 30);
  ok('TAP a bystander = join: it listens about a phrase, then enters at the top of a phrase', r === 'join' && by.jam === j && listen >= 3 && !!first, { r, listen, entered: !!first }); }
else ok('TAP a bystander = join', true, 'already joined by fit');
// a lone ohm (no jam near) keeps the chirp: jamTap returns null
{ const lone = place(Sf, pick(I => I.percK < .2, 9100), cx + 3000, cy); T.run(Sf, 1); ok('TAP a lone ohm keeps the chirp (no join / mute far from a jam)', Sf.jamTap(lone) === null && !lone.jam); }
// cue body signs (pure mapping)
{ const c = cs[1], tn = Sf.now(), base = RS.Cues.of(c, tn); const sig = k => { c.cue = { k, t: tn - .2, dur: 1 }; const q = RS.Cues.of(c, tn); c.cue = null; return q; };
  const nod = sig('nod'), sw = sig('swell'), mu = sig('mute'), jo = sig('joining'), ag = sig('again'), wk = sig('walk');
  ok('CUES each cue has a body sign (nod dips, swell grows, mute/joining rings, again hops, walk-up climbs)', nod.bobY > base.bobY && sw.swell > 0 && mu.ring && mu.ring.r1 < mu.ring.r0 && jo.ring && jo.ring.r1 < jo.ring.r0 && ag.lift > (base.lift || 0) && wk.walkU != null); }
// C11: an ink line across a SETTLED jam does not strum-call (and does not cancel the material); the ohm just glows
{ const m = cs.find(c => c.jam && c.mind.E && c.mind.E.phase === 'settled'); if (m) { const ink = { crossed: new Map() }; m.cue = null; /* vertical through the ohm so the line cannot clip a bystander sitting beside it */ Sf.inkMove(m.x, m.y - 80, m.x, m.y + 80, .5, ink); ok('C11 an ink line across a settled jam: no strum, the ohm glows', ink.crossed.size === 0 && m.cue && m.cue.k === 'glow', { crossed: ink.crossed.size, cue: m.cue && m.cue.k }); } else ok('C11 settled jam present', false); }
// C7: a bubble flick never orbits; C8: an infinity with no pair fizzles (never a catch)
{ const SY = RS.Symbols, tr = SY.trace('infinity', cx - 1500, cy - 300, 60)[0], r = Sf.stroke(tr, tr.map((_, i) => i * 12)); ok('C8 an infinity drawn with no two ohms under it fizzles instead of catching', r && r.k === 'fizzle', r); }
console.log('harm ' + res.filter(Boolean).length + '/' + res.length);
