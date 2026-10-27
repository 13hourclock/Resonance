'use strict';
// v0.3 BEHAVIOURS (cheap, behaviour-level): sleep cycles (doze + hum, wake to liked music), curiosity (lean toward a novel voice, copy a
// phrase into the learned motif), shyness/boldness (gradient: quieter/sparser/steps back vs leans forward/solos), grudges & favourites
// (who answered well vs clashed; seek / drift; persistent, slow decay; bonds override), mourning (a bonded partner or close favourite is
// deleted -> slow, sparse, darker lament for a while; undoing the deletion stops it), parenting (offspring follow a parent and practise
// its motifs imperfectly, corrected as they grow - learning, the genome stays exact), ground tapping (>= 3 rhythmic taps on empty
// ground -> nearby percussive-leaning creatures adopt it as a learned rhythm cell). All deterministic (seeded), persisted in C.serial.
(function (G) { const RS = G.RS; if (G.RESONANCE_NOSOCIAL) return; const So = RS.Social = {}; const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const gene = (c, k) => { const i = RS.GI[k]; const v = i == null ? null : c.g[i]; return v == null || isNaN(v) ? .5 : v; };
So.bold = c => clamp(.5 + (gene(c, 'bold') - gene(c, 'shyness')) * .8, 0, 1);   // 0 shy .. 1 bold
So.DOZE_P = 360; So.YOUNG = 180; So.MOURN = 75;
// ---- per-tick (0.5 s, from Sf.minds) ----
So.tick = Sf => { const tn = Sf.now(); if (Sf._soT != null && tn - Sf._soT < .5 && tn >= Sf._soT) return; Sf._soT = tn;
  for (const c of Sf.creatures) { if (c.dead || c.caught || !c.mind) continue; const m = c.mind;
    // sleep cycle: a deterministic doze window per creature (longer for calm / night-loving genes); never while jamming / played / mourning
    const per = So.DOZE_P * (.7 + gene(c, 'calm') * .6), ph = ((tn + (c.born % 997)) % per) / per, dozeLen = .12 + .18 * gene(c, 'night');
    const busy = c.jam || c.partner || Sf.playFocus === c || c.mourn; if (c.wokeT && tn - c.wokeT < 40) c.doze = false; else c._seenT = c._seenT == null ? tn : c._seenT; c.doze = !busy && tn - c._seenT > 240 && ph < dozeLen;   // first doze only after ~4 min awake
    // relationships decay slowly
    if (c.rel) for (const k in c.rel) { c.rel[k] *= .9985; if (Math.abs(c.rel[k]) < .02) delete c.rel[k]; }
    // mourning ends
    if (c.mourn && tn > c.mourn.until) c.mourn = null;
    // growing up
    if (c.youngT != null && tn - c.youngT > So.YOUNG) { c.youngT = null; c.parentId = null; }
    m.bold = So.bold(c); } };
// ---- hearing hooks (from Mi.hear) ----
So.heard = (Sf, oc, rec) => { const c = oc, m = c.mind, src = rec.c; if (!m || !src || src === c) return; const tn = Sf.now();
  // wake: music it likes = consonant with its key, or from a bonded / favoured creature
  if (c.doze || c.sleep > .5) { const liked = c.bond === src.id || (c.rel && c.rel[src.id] > .3) || (rec.f > 0 && RS.Tonal.degOfCents(m.sys, 1200 * Math.log2(rec.f / RS.Mind.tonicHz(Sf, m))).err < 12 && (rec.vel || .5) > .25);
    if (liked) { c.doze = false; c.sleep = 0; c.wokeT = tn; Sf.stats.woke = (Sf.stats.woke || 0) + 1; } }
  // curiosity: a voice it has never heard (a new creature) or the player playing it -> lean toward it, then copy a phrase
  c.known = c.known || {}; const novel = !c.known[src.id] || (rec.manual && src !== c); const cur = gene(c, 'curiosity');
  if (novel && cur > .35 && !c.curious) c.curious = { id: src.id, t: tn, notes: [] }; c.known[src.id] = 1;
  if (c.curious && c.curious.id === src.id && rec.f > 0) { const d = RS.Tonal.degOfCents(m.sys, 1200 * Math.log2(rec.f / RS.Mind.tonicHz(Sf, m))); if (d.err < 30) { c.curious.notes.push(d.d); (c.curious.ts = c.curious.ts || []).push(rec.t == null ? tn : rec.t); }
    if (c.curious.notes.length >= 4) { const ph = c.curious.notes.slice(-4).map(x => clamp(Math.round(x), -6, 9)); c.motif = (c.motif || [0, 1, 2, 3, 4, 3, 2, 1]).slice(0, 4).concat(ph); if (m) m.motif = c.motif.slice(); const qd = So.copyRhythm(Sf, c, c.curious.ts); if (qd) { const bd = (c.mdur && c.mdur.length >= 4 ? c.mdur : [2, 2, 2, 2]).slice(0, 4); c.mdur = bd.concat(qd); if (m) m.mdur = c.mdur.slice(); Sf.stats.rhythmCopy = (Sf.stats.rhythmCopy || 0) + 1; } c.copied = (c.copied || 0) + 1; c.curious = null; Sf.fx({ k: 'learned', c, col: c.col, dur: 1, r: 30 }); } }
  if (c.curious && tn - c.curious.t > 20) c.curious = null; };
// v0.6 curiosity copies RHYTHM too (was pitch degrees only): the last 4 heard onsets -> inter-onset gaps in 16ths, snapped to the motif
// duration set (Mi.DUR 1,2,3,4,6); the 4th note keeps the 3rd gap. Gaps over 2 s are not a phrase -> durations untouched (pitch still copied).
So.copyRhythm = (Sf, c, ts) => { if (!ts || ts.length < 4) return null; const t = ts.slice(-4), m = c.mind, bpm = (m && m.bpm) || (Sf.M && Sf.M.bpm) || 100, sx = 60 / bpm / 4, out = [];
  for (let i = 1; i < 4; i++) { const g = t[i] - t[i - 1]; if (!(g > .03) || g > 2) return null; const q = g / sx; let best = 1; for (const d of [1, 2, 3, 4, 6]) if (Math.abs(d - q) < Math.abs(best - q)) best = d; out.push(best); }
  out.push(out[2]); return out; };
// conversation outcome -> favourites / rivals (from the jam conversation exchange)
So.exchange = (Sf, a, b, coh, duel) => { const d = duel ? -.12 : coh > .6 ? .05 : coh < .35 ? -.06 : 0; if (!d) return; for (const [x, y] of [[a, b], [b, a]]) { x.rel = x.rel || {}; const ap = d > 0 && x.mind && x.mind.qApart && x.mind.qApart[y.id] >= 8 ? 1.25 : 1; /* v0.8a7 Q.4: partners whose parts stayed apart 8 bars */ x.rel[y.id] = clamp((x.rel[y.id] || 0) + d * ap, -1, 1); const ks = Object.keys(x.rel); if (ks.length > 12) { ks.sort((p, q) => Math.abs(x.rel[p]) - Math.abs(x.rel[q])); delete x.rel[ks[0]]; } } };
// steering (from J.steer, idle branch): parent > bond (in jam.js) > favourite; drift from rivals; lean toward a curious source
So.goal = (Sf, c) => { const find = id => Sf.creatures.find(o => o.id === id && !o.dead && !o.caught);
  if (c.parentId && c.youngT != null) { const p = find(c.parentId); if (p) return { x: p.x, y: p.y, stop: 40 + So.reach(Sf, c) + So.reach(Sf, p), mag: .18 }; }   /* v0.6.1 storm-spike root cause #3: 'stop' was 70 px centre-to-centre, so a long hatchling kept nuzzling INTO its parent (off screen, under water) until their chains tangled and the contact solver threw the parent at 231 px/s; now it stops outside both bodies */
  if (c.curious) { const s = find(c.curious.id); if (s) return { x: s.x, y: s.y, stop: 160, mag: .1 }; }
  if (c.rel) { let fav = null, fv = .3, riv = null, rv = -.3; for (const k in c.rel) { if (k === c.bond) continue; if (c.rel[k] > fv) { fv = c.rel[k]; fav = k; } if (c.rel[k] < rv) { rv = c.rel[k]; riv = k; } }
    const r = riv && find(riv); if (r && Math.hypot(r.x - c.x, r.y - c.y) < 220) return { x: c.x - (r.x - c.x), y: c.y - (r.y - c.y), stop: 0, mag: .08, away: true };
    const f = fav && find(fav); if (f && Math.hypot(f.x - c.x, f.y - c.y) < 700) return { x: f.x, y: f.y, stop: 120, mag: .12 }; }
  return null; };
// ---- playing hooks: shape a bar (from the Mi.genBar wrapper) ----
So.shapeBar = (Sf, m, bar, out) => { const c = m.c, r = RS.rng(RS.hash('so', c.born, bar, (c._sb = (c._sb || 0) + 1)));
  if (c.doze || c.sleep > .5) return bar % 2 ? [] : [{ s: 0, d: Math.max(4, RS.Mind.barLen(m) * 1.8), deg: -m.sys.cents.length, vel: .14, hum: true }];   // a soft sleeping hum, low, in its own scale
  let o = out; const b = m.bold == null ? So.bold(c) : m.bold;
  if (b < .4 && o.length > 1) o = o.filter((n, i) => i === 0 || r() > (.4 - b) * 1.4);   // shy: sparser
  if (c.mourn) { o = o.filter((n, i) => i % 2 === 0).map(n => Object.assign(n, { d: n.d * 1.6, vel: n.vel * .7 })); }   // lament: sparse, long, soft (the darker system + slower tempo in Mi)
  if (c.youngT != null) { const k = clamp((Sf.now() - c.youngT) / So.YOUNG, 0, 1), err = (1 - k) * .45; o = o.map(n => { if (n.perc) return n; const q = Object.assign({}, n); if (r() < err) q.deg = n.deg + (r() < .5 ? -1 : 1); q.s = Math.max(0, n.s + (r() - .5) * err * 1.2); q.young = true; return q; }); }   // practising: wrong-but-in-scale notes + loose timing, corrected with age
  return o; };
So.gain = c => { const b = c.mind && c.mind.bold != null ? c.mind.bold : So.bold(c); return (.75 + .45 * b) * (c.mourn ? .8 : 1); };
// ---- mourning ----
So.onDelete = (Sf, gone) => { for (const c of Sf.creatures) { if (c.dead || c === gone) continue; if (c.bond === gone.id || (c.rel && c.rel[gone.id] > .5)) { c.mourn = { id: gone.id, until: Sf.now() + So.MOURN }; Sf.stats.mourn = (Sf.stats.mourn || 0) + 1; } } };
So.onRestore = (Sf, id) => { for (const c of Sf.creatures) if (c.mourn && c.mourn.id === id) c.mourn = null; };
// ---- parenting (from Sf.hatch) ----
So.reach = (Sf, c) => { const now = Sf.now(); if (c._reachT != null && now - c._reachT < 1) return c._reach; const W = Sf.W; let m = 0; for (const b of c.segs) for (const i of b.idx) { const d = Math.hypot(W.x[i] - c.x, W.y[i] - c.y) + (W.rad[i] || 4); if (d > m) m = d; } c._reachT = now; return c._reach = Math.min(m, 160); };
So.onHatch = (Sf, c, parents) => { if (!parents || !parents.length) return; c.parentId = parents[0]; c.youngT = Sf.now(); };
// ---- ground tapping ----
So.groundTap = (Sf, x, y) => { const tn = Sf.now(); Sf._taps = (Sf._taps || []).filter(t => tn - t.t < 2.6 && Math.hypot(t.x - x, t.y - y) < 220); Sf._taps.push({ t: tn, x, y }); const T = Sf._taps; if (T.length < 3) return null;
  const iv = T.slice(1).map((t, i) => t.t - T[i].t); if (iv.some(v => v < .08 || v > 1.2)) return null;   // in rhythm: not a scrabble, not a pause
  let best = null, bd = 400; for (const c of Sf.creatures) { if (c.dead || c.caught || !c.mind || (c.mind.perc || 0) < .35) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; best = c; } } if (!best) return null;
  const m = best.mind, sx = m.bpm / 60 * 4, L = RS.Mind.barLen(m), cell = [...new Set(T.map(t => Math.round((t.t - T[0].t) * sx) % L))].sort((a, b) => a - b);
  for (const c of Sf.creatures) { if (c.dead || !c.mind || (c.mind.perc || 0) < .35 || Math.hypot(c.x - x, c.y - y) > 400) continue; c.tapCell = cell; Sf.fx({ k: 'learned', c, col: c.col, dur: 1, r: 30 }); }
  Sf._taps = []; Sf.stats.tapCells = (Sf.stats.tapCells || 0) + 1; return cell; };
So.drumExtra = (m, out) => { const cell = m.c.tapCell; if (!cell || !cell.length) return out; const have = new Set(out.map(o => Math.round(o.s))); for (const s of cell) if (!have.has(s)) out.push({ s, d: 1, deg: 0, vel: .6, perc: true, stroke: 'tone', tap: true }); return out; };
})(typeof window !== 'undefined' ? window : globalThis);
