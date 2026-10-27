'use strict';
// v0.8b6 learned sound layers (Wilbow 6:57-6:59 PM MDT Oct 23 2026: "The individual ohms keep theor instrument. Its not a rule that each
// each type can be only one thing or sound" / "It can learn other sounds too" / "All ohms" / "They should also cleanly be able to pull them
// out individually after fully learning them").
//  - Every ohm (drums and melodic alike) can slowly learn up to 3 extra sounds from the ohms it jams with, faster from its teachers and the
//    more experienced it is. A learned sound = a snapshot of that ohm's birth instrument (its engine parameters), kept in exp.sl (saved).
//  - The birth instrument is permanent and stays the default: it is never changed, replaced or swapped (c.P.inst is never written here).
//  - While partly learned (p < 1) a sound is only a faint extra voice under the birth voice (gain ~ p, on screen only).
//  - Fully learned (p = 1) the ohm occasionally plays a note / phrase with that sound ALONE: a separate synth voice instance (its own 'inst'
//    message with the learned parameters), with no birth-voice and no other-layer energy. Rarely (7:25 PM "Alone, but rarely"): as a fill /
//    phrase ending in about 1 phrase in 12, never two phrases in a row, drums never on a downbeat; otherwise it is blended faintly.
//  - Off screen: no extra voices and no choices (birth voice only); learning is a few multiplications in the 2 s experience tick.
//  - Drummers with their own hit set (g.dk, 0.8 drums) learn other drummers' hits as kit slots (RS.Drums.study, 8:50 PM kit growth) instead.
//  - Teaching is a 0..1 gradient from experience (RS.Teacher.teach, 8:57 PM): any ohm teaches, more experienced ones faster.
(function (G) {
const RS = G.RS, Ly = RS.Layers = {};
// Wilbow 7:23 PM "Maybe that is too disruptive" -> 7:25 PM "Alone, but rarely": learned sounds (fully learned ones too) are normally a subtle
// blended layer under the birth voice; a fully learned sound solos only rarely (Ly.soloPhrase). P.clean = 0 turns solos off entirely.
const P = Ly.P = (RS.WorldLook || (RS.WorldLook = {})).layers = { on: 1, clean: 1, cap: 3, minD: .15, startK: .03, rateK: .04, teachX: 2, practice: .15, faint: .35, faintMin: .15,
  solo: 1 / 12, soloEnd: .4, phrase: 4, view: 150 };
const r4 = v => Math.round(v * 1e4) / 1e4;
const perc = c => !!(c && c.mind && c.mind.perc > .55);
Ly.list = c => (c && c.exp && c.exp.sl) || null;
// how different two birth instruments are (0..1): mean gene distance over the instrument genes, + .2 if one is percussive and the other not
Ly.dist = (a, b) => { const IG = RS.IG, ks = RS.INST_GENES; if (!a.g || !b.g) return 0; let s = 0, n = 0; for (const k of ks) { const i = IG[k], x = a.g[i], y = b.g[i]; if (x == null || y == null || isNaN(x) || isNaN(y)) continue; s += Math.abs(x - y); n++; } return (n ? s / n : 0) + (perc(a) !== perc(b) ? .2 : 0); };
// a learned sound = the teacher's birth instrument, numbers rounded (arrays kept)
Ly.snap = I => { const o = {}; for (const k in I) { if (k === 'dkP') continue; /* derived per-hit voices (0.8 drums): rebuilt from dk, never saved */ const v = I[k]; if (typeof v === 'number') o[k] = r4(v); else if (Array.isArray(v)) o[k] = v.map(x => typeof x === 'number' ? r4(x) : x && typeof x === 'object' ? JSON.parse(JSON.stringify(x)) : x); else if (v == null || typeof v === 'string' || typeof v === 'boolean') o[k] = v; } return o; };
const lvl = e => RS.Teacher ? Math.max(0, RS.Teacher.target(e)) : 0;
// v0.8b6 (Wilbow 8:57 PM): teaching is a 0..1 gradient from experience (RS.Teacher.teachOf); the speed-up scales smoothly 1 .. teachX
const teachOf = (e, o) => RS.Teacher && RS.Teacher.teachOf ? RS.Teacher.teachOf(e, o) : (e.tch && e.tch.includes(o.id) ? 1 : 0);
const tX = (e, o) => 1 + (P.teachX - 1) * teachOf(e, o);
Ly.teachX = tX;
// called from Ex.learn (every 2 s per jam member) with its learning weight k
Ly.learn = (Sf, c, j, k) => { if (!P.on || !j || c.jam !== j || !c.exp || !(k > 0) || !c.P || !c.P.inst) return 0; const e = c.exp, own = 1 + lvl(e), L = e.sl || null, ms = j.members;
  let done = 0;
  if (L) for (const q of L) { if (q.p >= 1) continue; const src = ms.find(o => o.id === q.s && !o.dead); const dp = k * P.rateK * own * .5 * (src ? tX(e, src) : P.practice);
    q.p = Math.min(1, r4(q.p + dp)); if (q.p >= 1) { q.t = Math.round(Sf.now()); done++; Sf.stats.layerFull = (Sf.stats.layerFull || 0) + 1; if (q.k === 'hit' && perc(c) && RS.Drums && RS.Drums.learn) try { RS.Drums.learn(c, { from: q.s, P: q.P, k: 'learned' }); } catch (err) { } } }   /* a legacy drummer (no g.dk) finishing a hit layer is handed to drums: it gets its birth set + that hit, then grows a kit */
  // v0.8b6 kit growth (Wilbow 8:50 PM "slowly becoming a full kit through experience"): a drummer with its own hit set learns other drummers'
  // hits one kit slot at a time, at the same rate rules (k * rateK * (1 + level) * .5, teacher gradient, practice when the mate has left)
  const kitD = !!(c.g && c.g.dk && RS.Drums && RS.Drums.study); if (kitD) { const r = RS.Drums.study(c, ms, k * P.rateK * own * .5, o => o.exp || o.g ? teachOf(e, o) : 0); if (r && r.done) { done++; Sf.stats.kitHit = (Sf.stats.kitHit || 0) + 1; } else if (r && r.start) Sf.stats.kitStart = (Sf.stats.kitStart || 0) + 1; }
  if ((L ? L.length : 0) >= P.cap) return done;
  let best = null, bd = 0; for (const o of ms) { if (o === c || o.dead || !o.P || !o.P.inst || (L && L.some(q => q.s === o.id)) || (kitD && perc(o))) continue; const d = Ly.dist(c, o) * tX(e, o);   /* a kit drummer learns drummers as kit hits, not as layers */ if (d > bd) { bd = d; best = o; } }
  if (!best || Ly.dist(c, best) < P.minD) return done;
  const u = ((RS.hash('lys', c.id, best.id, Math.floor(Sf.now() / 2)) >>> 0) % 1e6) / 1e6; if (u >= k * P.startK * own * tX(e, best)) return done;
  (e.sl || (e.sl = [])).push({ s: best.id, k: perc(best) ? 'hit' : 'colour', p: 0, P: Ly.snap(best.P.inst), t0: Math.round(Sf.now()) }); Sf.stats.layerStart = (Sf.stats.layerStart || 0) + 1; return done; };
// which voice plays this note: null = birth voice only; { clean, P, i } = the learned sound alone; { faint, P, a } = a faint extra layer
Ly.pick = (Sf, c, o, when) => { const L = Ly.list(c); if (!P.on || !L || !L.length || o.manual || o.inst || o.hum) return null; if (!Sf.inView || !Sf.inView(c.x, c.y, P.view)) return null;
  const full = []; for (let i = 0; i < L.length; i++) if (L[i].p >= 1) full.push(i);
  if (full.length && P.clean) { const pc = !!o.perc || perc(c), idx = Math.floor(when / P.phrase), pos = when / P.phrase - idx;
    // "Alone, but rarely" (7:25 PM): a fully learned sound solos only as a fill / phrase ending: about 1 phrase in 12, never two phrases in a row,
    // only in the last part of that phrase, never on a downbeat for drums. Timing and pitch are the ohm's own (on its beat grid, in key): only the timbre changes.
    if (pos >= 1 - P.soloEnd && !(pc && o.db) && Ly.soloPhrase(c, idx)) { const i = full[(RS.hash('lyi', c.id, idx) >>> 0) % full.length]; return { clean: true, P: L[i].P, i }; } }
  let bi = -1, bp = 0; for (let i = 0; i < L.length; i++) if (L[i].p >= P.faintMin && L[i].p > bp) { bp = L[i].p; bi = i; }
  return bi >= 0 ? { faint: true, P: L[bi].P, a: P.faint * bp, i: bi } : null; };
const pu = (c, idx) => ((RS.hash('lyp', c.id, idx) >>> 0) % 1e6) / 1e6;
Ly.soloPhrase = (c, idx) => pu(c, idx) < P.solo && !(pu(c, idx - 1) < P.solo);   // never on consecutive phrases
Ly.stats = Sf => { let n = 0, full = 0; for (const c of Sf.creatures) { const L = Ly.list(c); if (!L) continue; n += L.length; full += L.filter(q => q.p >= 1).length; } return { n, full }; };
})(typeof window !== 'undefined' ? window : globalThis);
