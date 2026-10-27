'use strict';
// v0.4b SYMBIOTIC PAIRINGS (7 picked from the 16-idea list, see NOTES.md), MOTIF CRAZES and CARRYING WATER.
// Rides on the attraction-object system (RS.Items). Everything is learned behaviour (the genome never changes; mutation stays 0),
// deterministic (seeded by ids and time buckets), cheap (1 s tick) and event-only in its visuals. No new gestures.
//  #2 timekeeper & wanderer: a lone pitched ohm bonds to a nearby drummer / pulse leader and locks to its beat (entrainment + tempo).
//  #3 breath & body: a wind-blowing ohm with no wind rock nearby breathes on a drum-belly / percussive ohm; the body's next bar sounds out.
//  #4 tuner & drifter: a stubborn tonal ohm tunes a flexible lone one into its key (learned tonic, kept).
//  #7 harmony nest: a coherent jam that stays together near home weaves a nest on the ground; it remembers the key and enriches the place;
//     lone ohms living by it settle into that key.
//  #8 call & echo twins: two ohms that talk a lot become twins; the follower echoes the caller's theme in its own key.
// #13 wind farmers: an ohm tending a wind rock / reed bed while a blower plays it makes the feature ring longer and richer (persistent).
// #14 dew collectors: a water-loving ohm living on dry ground carries a droplet from the nearest pool home; the ground there gets wetter.
// Motif crazes: a phrase that catches on in a conversation spreads ohm to ohm (partners, jam-mates), is played for a while, then fades.
(function (G) { const RS = G.RS; const Y = RS.Sym = {}; const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
Y.on = () => RS.SYM !== false && !!RS.Items;
Y.TICK = 1; Y.R = 520; Y.CRAZE_MAX = 8; Y.NESTS = 12;
const live = c => c && !c.dead && !c.caught && !c.leaving && c.mind;
const S = c => c.sym || (c.sym = {});
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = (...k) => RS.rng(RS.hash('sym', ...k))();
const stat = (Sf, k) => { const s = Sf.stats.sym || (Sf.stats.sym = {}); s[k] = (s[k] || 0) + 1; };
const byId = (Sf, id) => { if (!id) return null; if (!Sf._syIdx || Sf._syIdxT !== Sf._syT) { Sf._syIdx = new Map(); for (const c of Sf.creatures) Sf._syIdx.set(c.id, c); Sf._syIdxT = Sf._syT; } return Sf._syIdx.get(id) || null; };
const perc = c => (c.mind.perc || 0) > .6;
const beh = (c, k, d) => { const B = c.P && c.P.beh; return B && B[k] != null ? B[k] : d; };
const free = c => !c.jam && !c.partner && !(c.mind && c.mind.E) && !c.grabbed && !c.caught;
const wrapC = d => { d = ((d % 1200) + 1200) % 1200; return d > 600 ? d - 1200 : d; };
Y.keeperOK = c => perc(c) || (c.mind.lead || 0) > .62;
Y.bodyOK = c => (c.P.body && c.P.body.plan === 'drum-belly') || perc(c);
Y.tunerOK = c => !perc(c) && (c.mind.stub || 0) > .58;
Y.drifterOK = c => !perc(c) && (c.mind.stub || 0) < .45;
Y.blower = c => RS.Field && RS.Field.blower ? !!RS.Field.blower(c) : false;
// ---------------- the 1 s tick ----------------
Y.tick = Sf => { if (!Y.on()) return; const tn = Sf.now(); if (Sf._syT != null && tn - Sf._syT < Y.TICK && tn >= Sf._syT) return; Sf._syT = tn;
  const cs = Sf.creatures.filter(live); Sf.crazes = Sf.crazes || {};
  for (const c of cs) c._syKeeps = 0; for (const c of cs) { const k = c.sym && c.sym.keeper && byId(Sf, c.sym.keeper); if (k) k._syKeeps = (k._syKeeps || 0) + 1; }   // live count: a keeper takes at most 3 wanderers
  for (const c of cs) { const s = S(c), m = c.mind;
    // #2 timekeeper & wanderer
    if (!Y.keeperOK(c)) { let k = byId(Sf, s.keeper); if (s.keeper && (!live(k) || dist(k, c) > Y.R * 1.6)) { k = null; s.keeper = 0; }
      if (!k && free(c)) { let bd = Y.R; for (const o of cs) if (o !== c && Y.keeperOK(o) && (o._syKeeps || 0) < 3) { const d = dist(o, c); if (d < bd) { bd = d; k = o; } }
        if (k) { s.keeper = k.id; k._syKeeps = (k._syKeeps || 0) + 1; stat(Sf, 'keeper'); Sf.fx({ k: 'keeperBond', a: k, b: c, dur: 1.2, event: true }); } }
      if (k && !c.jam && !m.E) m.bpmT += (k.mind.bpm - m.bpmT) * .2; }
    // #4 tuner & drifter (and #7: a nest tunes the ohms that live by it)
    if (Y.drifterOK(c) && free(c) && !(s.tunedT && tn - s.tunedT < 120)) { let tc = null, by = null;
      const nest = Y.nestAt(Sf, (c.anchor || [c.x])[0], (c.anchor || [0, c.y])[1], 260); if (nest && nest.str > .3) { tc = nest.tc; by = 'nest'; }
      else { let bd = Y.R; for (const o of cs) if (o !== c && Y.tunerOK(o) && !o.mind.E) { const d = dist(o, c); if (d < bd && Math.abs(wrapC(o.mind.tonicC - m.tonicC)) > 50) { bd = d; tc = o.mind.tonicC; by = o; } } }
      if (tc != null) { const d = wrapC(tc - m.tonicC); if (Math.abs(d) > 50) { m.tonicC = Math.round(m.tonicC + d); c.mindTonic = m.tonicC; s.tunedT = tn; s.tuner = by === 'nest' ? 'nest' : by.id; stat(Sf, by === 'nest' ? 'nestTune' : 'tune'); Sf.fx(by === 'nest' ? { k: 'nestGrow', x: c.x, y: c.y, c, dur: 1, event: true } : { k: 'tuneBond', a: by, b: c, dur: 1.2, event: true }); } } }
    // v0.5b #4 fine-tuning pull: a slightly-off drifter (< 50 cents) is pulled gradually into tune by a tuner nearby; the tuner borrows that microtonal colour
    if (Y.drifterOK(c) && free(c)) { let tu = null, bd = Y.R * .7; for (const o of cs) if (o !== c && Y.tunerOK(o) && !o.mind.E) { const d = dist(o, c); if (d < bd) { bd = d; tu = o; } }
      if (tu) { const d = wrapC(tu.mind.tonicC - m.tonicC); if (Math.abs(d) > 3 && Math.abs(d) <= 50) { const before = m.tonicC; m.tonicC = Math.round((m.tonicC + d * .3) * 10) / 10; c.mindTonic = m.tonicC; stat(Sf, 'fineTune'); if (!tu.mind.colourC || rnd('col', tu.id, Math.floor(tn / 20)) < .3) { tu.mind.colourC = tu.colourC = clamp(Math.round(-d), -45, 45); stat(Sf, 'colourBorrow'); } if (!(s.fineFx > tn - 8)) { s.fineFx = tn; Sf.fx({ k: 'tuneBond', a: tu, b: c, dur: .8, event: true }); } } } }
    // v0.5c #7: a lone pitched ohm near a cluster chord ohm becomes its guest (stays a guest while it is near and the host keeps offering)
    if (!Y.hostOK(c) && !perc(c)) { const h = byId(Sf, s.host); if (s.host && (!live(h) || dist(h, c) > 260 || !free(c) || !(h.sym && h.sym.chordF && tn - h.sym.chordT < 8))) s.host = 0;
      if (!s.host && free(c)) { let bd = 240, hb = null; for (const o of cs) if (o !== c && Y.hostOK(o) && o.sym && o.sym.chordF && tn - o.sym.chordT < 8) { const d = dist(o, c); if (d < bd) { bd = d; hb = o; } } if (hb) { s.host = hb.id; stat(Sf, 'chordHost'); } } }
    // #8 call & echo twins
    if (c.partner && live(c.partner) && !s.twin && !perc(c) && !perc(c.partner) && !S(c.partner).twin) { const o = c.partner; s.conv = s.conv || {}; s.conv[o.id] = (s.conv[o.id] || 0) + Y.TICK;
      if (s.conv[o.id] >= 12) { const lead = (m.lead || 0) > (o.mind.lead || 0) || ((m.lead || 0) === (o.mind.lead || 0) && c.id < o.id); s.twin = o.id; S(o).twin = c.id; s.echo = !lead; S(o).echo = lead; s.conv = null; stat(Sf, 'twin'); Sf.fx({ k: 'twinBond', a: c, b: o, dur: 1.5, event: true }); } }
    if (s.twin && !live(byId(Sf, s.twin))) { const t = byId(Sf, s.twin); if (!t || t.dead) { s.twin = 0; s.echo = false; } }
    // motif crazes: catching, fading
    Y.crazeTick(Sf, c, tn, cs); }
  for (const c of cs) if (c.grabbed && c.sym && c.sym.dew) { Y.spill(Sf, c); c.sym.dew = null; c.sym.dewT = tn; }   /* v0.8 B: grabbing a carrier mid-trip drops its droplet: the water is poured where it is */
  Y.waterTick(Sf, tn);
  Y.nestTick(Sf, tn); if (RS.Pairs) RS.Pairs.tick(Sf, tn, cs); };   // v0.6 pairings #1 #5 #6 #12 #15 #16 (pairs6.js)
// ---------------- motif crazes ----------------
Y.crazeTick = (Sf, c, tn, cs) => { const s = S(c), m = c.mind, cz = c.craze;
  if (cz && tn > cz.until) { s.imm = s.imm || []; s.imm.push(cz.id); if (s.imm.length > 6) s.imm.shift(); c.craze = null; stat(Sf, 'crazeFade'); return; }
  if (cz) { const C = Sf.crazes[cz.id]; if (!C || C.n >= Y.CRAZE_MAX) return; const mates = []; if (c.partner && live(c.partner)) mates.push(c.partner); if (c.jam) for (const o of c.jam.members || []) if (o !== c && live(o)) mates.push(o);
    for (const o of mates) { if (o.craze || perc(o) || (S(o).imm || []).includes(cz.id) || dist(o, c) > 420) continue; if (rnd('catch', o.id, cz.id, Math.floor(tn)) > .3) continue;
      o.craze = { id: cz.id, m: cz.m, src: c.id, t: tn, until: tn + 28 + 12 * rnd('len', o.id, cz.id), hue: cz.hue }; C.n++; stat(Sf, 'crazeCatch'); Sf.fx({ k: 'crazeCatch', a: c, b: o, dur: 1.2, event: true }); if (C.n >= Y.CRAZE_MAX) break; } return; }
  // a new craze: a creative ohm in a conversation that has caught on (>= 6 s), none alive nearby, at most 2 at a time
  if (!c.partner || perc(c) || (m.creat || 0) < .5) return; s.talk = (s.talk || 0) + Y.TICK; if (c.partner._syLastP !== c.id) { c.partner._syLastP = c.id; } if (s.talk < 6) return;
  const alive = cs.filter(o => o.craze); if (new Set(alive.map(o => o.craze.id)).size >= 2 || alive.some(o => dist(o, c) < 900)) return; if (rnd('start', c.id, Math.floor(tn / 30)) > .12) return;
  const id = 'z' + c.id + '_' + Math.floor(tn); Sf.crazes[id] = { t: tn, n: 1, src: c.id }; c.craze = { id, m: m.motif.slice(), src: c.id, t: tn, until: tn + 40, hue: Math.floor(rnd('hue', id) * 360) }; s.talk = 0; stat(Sf, 'craze'); };
// the motif a mind develops this bar: a craze it carries, the echo of its twin's theme, or its own
Y.motif = (Sf, m, unit) => { const c = m.c; if (!Y.on() || !c) return m.motif; if (c.craze && (unit === 'state' || unit === 'state2' || unit === 'seq' || unit === 'var')) { stat(Sf, 'crazePlay'); return c.craze.m; }
  const s = c.sym; if (s && s.echo && s.twin && (unit === 'state' || unit === 'state2' || c.partner === byId(Sf, s.twin))) {   /* v0.5a: also on any bar of a conversation with the twin */ const t = byId(Sf, s.twin); if (live(t) && dist(t, c) < 700 && t.mind.motif && m.heard.some(h => h.from === t.id && Sf.now() - h.t < 6)) { stat(Sf, 'echo'); const tn = Sf.now(); if (!(s.echoFx > tn - 12)) { s.echoFx = tn; Sf.fx({ k: 'twinEcho', a: t, b: c, dur: 1, event: true }); } return t.mind.motif.slice(0, 8); } }
  return m.motif; };
// v0.5a #8: in a back-and-forth conversation turn, an echo twin answering its twin echoes the call (same degrees + rhythm, so the turn is an
// audible echo) instead of the usual inversion / sequence / fifth answer. Returns true when the answer should be the literal echo.
Y.echoAns = (Sf, m) => { const c = m.c; if (!Y.on() || !c || !c.sym || !c.sym.echo || !c.sym.twin) return false; const t = byId(Sf, c.sym.twin); if (!live(t) || c.partner !== t || dist(t, c) > 700) return false; if (!m.heard.some(h => h.from === t.id && Sf.now() - h.t < 6)) return false; stat(Sf, 'echoTurn'); const tn = Sf.now(); if (!(c.sym.echoFx > tn - 12)) { c.sym.echoFx = tn; Sf.fx({ k: 'twinEcho', a: t, b: c, dur: 1, event: true }); } return true; };
// entrainment weight bonus for the pulse a wanderer is bonded to
Y.hearW = (oc, src) => oc.sym && src && oc.sym.keeper === src.id ? .6 : 0;
// #3 breath & body: the breathed body's next bar accents (velocity only, never more notes)
Y.shapeBar = (Sf, m, bar, o) => { if (!Y.on() || !o || !o.length) return o; const bt = m.breathT; if (bt != null && Sf.now() - bt < 3) { o.forEach((n, i) => { if (i === 0 || n.s === 0) n.vel = Math.min(1, (n.vel || .6) * 1.25); }); stat(Sf, 'breathBar'); }
  const c = m.c; if (!c || !c.mind || c.dead) return o; const s = S(c), tn = Sf.now(), L = RS.Mind.barLen(m);
  // v0.5c #2 rubato: a wanderer bonded to a live keeper bends its timing inside the bar (the downbeat stays put, the bar length stays exact);
  // it leaves its onsets for the keeper, who folds up to 2 of its own hits onto them every 4th bar (moves/accents, never adds notes)
  if (s.keeper && !perc(c) && !m.E && !c.jam) { const k = byId(Sf, s.keeper); if (live(k) && dist(k, c) < Y.R * 1.6) { const A = 4 * .12 * (.6 + .8 * (1 - (m.stub == null ? .5 : m.stub))); for (const n of o) if (n.s > 0 && n.s < L) n.s = Math.min(L - .1, n.s + A * Math.sin(Math.PI * n.s / L)); s.varRh = o.filter(n => n.s > 0).map(n => +n.s.toFixed(2)).slice(0, 8); s.varT = tn; stat(Sf, 'rubato'); } }
  if (Y.keeperOK(c) && perc(c) && bar % 4 === 3 && !m.E) { let w = null; for (const q of Sf.creatures) if (q !== c && live(q) && q.sym && q.sym.keeper === c.id && q.sym.varRh && q.sym.varRh.length && tn - q.sym.varT < 8) { w = q; break; }
    if (w) { let moved = 0; for (const on of w.sym.varRh) { if (moved >= 2) break; const tgt = Math.round(on * 2) / 2; if (tgt <= 0 || tgt >= L) continue; let bn = null, bd = 1.01; for (const n of o) { if (n.s === 0 || n.db || n._var) continue; const d = Math.abs(n.s - tgt); if (d < bd) { bd = d; bn = n; } } if (bn) { bn.s = tgt; bn.vel = Math.min(1, (bn.vel || .6) * 1.15); bn._var = 1; moved++; } }
      o.sort((a, b) => a.s - b.s); if (moved) { stat(Sf, 'drumVar'); if (!(s.varFx > tn - 8)) { s.varFx = tn; Sf.fx({ k: 'drumVar', a: c, b: w, dur: 1.2, event: true }); } } } }
  // v0.5c #7 cluster chord ohm: a cluster-bodied (chord-playing colonial) ohm offers its bar's chord; a lone guest close by sings inside it
  if (Y.hostOK(c)) { const fs = []; for (const n of o) if (n.chordTone && n.deg != null) { const f = n.f || RS.Mind.hz(Sf, m, n.deg); if (f > 20 && !fs.some(g => Math.abs(1200 * Math.log2(f / g)) % 1200 < 20)) fs.push(f); }
    if (fs.length < 2) { const d0 = Math.min(...o.map(n => n.deg == null ? 99 : n.deg)), b0 = d0 === 99 ? 0 : d0; fs.length = 0; for (const d of [0, 2, 4]) fs.push(RS.Mind.hz(Sf, m, b0 + d)); }
    s.chordF = fs.slice(0, 5).map(f => +f.toFixed(2)); s.chordT = tn; }
  else if (s.host && !perc(c) && !m.E && !c.jam) { const h = byId(Sf, s.host), hs = h && h.sym; if (live(h) && hs && hs.chordF && tn - hs.chordT < 8 && dist(h, c) < 240) { let snapped = 0; for (const n of o) { if (n.deg == null && !n.f) continue; const f = n.f || RS.Mind.hz(Sf, m, n.deg); if (!(f > 20)) continue; let best = f, bd = 1e9; for (const g of hs.chordF) { const cand = g * Math.pow(2, Math.round(Math.log2(f / g))), d = Math.abs(Math.log2(cand / f)); if (d < bd) { bd = d; best = cand; } } if (Math.abs(1200 * Math.log2(best / f)) > 1) { n.f = best; snapped++; } else n.f = best; }
      stat(Sf, 'chordSing'); if (!(s.hostFx > tn - 10)) { s.hostFx = tn; Sf.fx({ k: 'chordHost', a: h, b: c, dur: 1.4, event: true }); } } }
  return o; };
Y.hostOK = c => !!(c.P && c.P.body && c.P.body.plan === 'cluster') && !perc(c);
// ---------------- goals (inside J.seekGoal: within the leash, only when the calm rules allow seeking) ----------------
Y.goal = (Sf, c) => { if (!Y.on() || !c.mind) return null; const s = S(c), tn = Sf.now();
  // #3 a blower with no wind feature nearby goes to breathe on a body
  if (Y.blower(c) && !(RS.Field && RS.Field.near(Sf, c.x, c.y, 'wind', 420))) { let b = byId(Sf, s.body); if (!live(b) || dist(b, c) > 420) { b = null; s.body = 0; let bd = 420; for (const o of Sf.creatures) if (o !== c && live(o) && Y.bodyOK(o)) { const d = dist(o, c); if (d < bd) { bd = d; b = o; } } if (b) { s.body = b.id; stat(Sf, 'breathPair'); } }
    if (b) { if (dist(b, c) < 130 && !(c.mind.rest > 0) && !(s.puffT > tn - 2)) { s.puffT = tn; c.blowT = tn; c.blowAt = [b.x, b.y]; b.mind.breathT = tn; b.energy = Math.min(1, (b.energy || .5) + .01); stat(Sf, 'breath'); if (!(s.jointT > tn - 6)) { s.jointT = tn; Y.joint(Sf, c, b); } } return { k: 'breath', x: b.x, y: b.y, stop: 100, mag: .06 }; } }
  // v0.5c #7 a guest drifts in beside its chord host (J.seekGoal keeps it inside its home leash)
  if (s.host) { const h = byId(Sf, s.host); if (live(h) && dist(h, c) < 260) return { k: 'chordNest', x: h.x, y: h.y, stop: 60, mag: .04 }; }
  // #13 a non-blower living by a wind feature that is being played tends it
  if (!Y.blower(c) && Sf.field && RS.Field) { const q = RS.Field.near(Sf, c.x, c.y, 'wind', 300); if (q && q.by && tn - q.sungT < 8 && q.by !== c.id) { const [x, y] = RS.Field.pos(Sf, q, 20); return { k: 'farm', x, y, stop: 70, mag: .05 }; } }
  return null; };
// v0.5c #3 joint voice: the blower's breath sounds THROUGH the body: one soft sustained note on the body's own tonic with the body's resonator
// (its horn / sac / membrane) but a blown, breathy exciter - a sound neither makes alone. On the body's next beat; the crowd cap still applies.
Y.joint = (Sf, c, b) => { const bm = b.mind, Mi = RS.Mind; if (!bm || !Mi || !b.P || !b.P.inst) return false; const I0 = b.P.inst, inst = Object.assign({}, I0, { pluck: 0, strike: 0, scrape: 0, bow: 0, blow: 1, voc: 0, noise: Math.max(.15, I0.noise || 0), att: .08, dec: .5, sus: .55, rel: .45 });
  const rate = Math.max(1, (bm.bpm || 100) / 60 * 4 * (bm.feel || 1)), tn = Sf.now(), when = tn + ((4 - ((bm.pos || 0) % 4)) % 4) / rate + .02; Mi.play(Sf, b, { s: 0, d: 6, deg: 0, vel: .4, inst, joint: 1, f: Mi.hz(Sf, bm, 0) }, when, rate);
  stat(Sf, 'jointVoice'); Sf.fx({ k: 'jointVoice', a: c, b, dur: 1.4, event: true }); return true; };
// #13 called from F.onGrid for each wind feature about to sound: returns its farmed level (0..1); a blower + a tender grow it
Y.farm = (Sf, q, x, y, blow) => { if (!Y.on()) return 0; const F = Sf.mods.farm || (Sf.mods.farm = {}), lv = F[q.k] || 0; if (!blow) return lv;
  let tender = null; for (const c of Sf.creatures) if (live(c) && c !== blow && !Y.blower(c) && Math.hypot(c.x - x, c.y - y) < 170) { tender = c; break; }
  if (tender) { F[q.k] = Math.min(1, lv + .03); Y.bump(Sf, q.th, 0, .003); stat(Sf, 'farm'); const tn = Sf.now(); if (!(q.farmFx > tn - 10)) { q.farmFx = tn; Sf.fx({ k: 'farmTend', a: blow, b: tender, dur: 1.2, event: true }); } }
  return lv; };
// per-area field delta bump (channel 0 rich, 1 wear, 2 water carried in)
Y.bump = (Sf, th, i, v, cap = 1) => { if (!Sf.field || !RS.Field) return; const F = RS.Field, D = Sf.mods.fieldD || (Sf.mods.fieldD = {}), n = Math.ceil(2 * Math.PI * Sf.field.R / F.AREA), a = F.area(Sf, th); if (!(i >= 0 && i < 8) || !Number.isFinite(a) || !(n > 0 && n < 1e5)) return;   /* stab guards */
  for (const o of [-1, 0, 1]) { const k = ((a + o) % n + n) % n, e = D[k] || (D[k] = [0, 0]); while (e.length <= i) e.push(0); e[i] = clamp(e[i] + v * (o ? .4 : 1), 0, cap); } };
// ---------------- #7 harmony nests ----------------
Y.nestAt = (Sf, x, y, R) => { let best = null, bd = R; for (const n of (Sf.mods && Sf.mods.nests) || []) { const d = Math.hypot(n.x - x, n.y - y); if (d < bd) { bd = d; best = n; } } return best; };
Y.nestTick = (Sf, tn) => { const N = Sf.mods.nests || (Sf.mods.nests = []), J = RS.Jam, L = J ? J.LEASH : 190;
  for (const j of Sf.jams || []) { const ms = (j.members || []).filter(live); if (ms.length < 3 || !(j.coh > .62)) { j._nestT = 0; continue; } j._nestT = (j._nestT || 0) + Y.TICK; if (j._nestT < 20) continue;
    const homeNear = ms.filter(o => o.anchor && Math.hypot(o.anchor[0] - j.x, o.anchor[1] - j.y) < L * 1.5).length; if (homeNear < 2) continue;
    const lead = j.leader && j.leader.mind ? j.leader : ms[0], [gx, gy] = Sf.surfAt ? Sf.surfAt(j.x, j.y) : [j.x, j.y];   /* v0.8a9: radial ground */ let n = Y.nestAt(Sf, gx, gy, 300);
    if (!n && N.length < Y.NESTS) { n = { x: Math.round(gx), y: Math.round(gy), str: .3, tc: lead.mind.tonicC, t: Math.round(tn) }; N.push(n); stat(Sf, 'nestMade'); Sf.fx({ k: 'nestGrow', x: gx, y: gy - 10, dur: 1.6, event: true }); }
    if (n) { n.str = Math.min(1, n.str + .01); n.tc = lead.mind.tonicC; if (Sf.field) Y.bump(Sf, Sf.P.theta(n.x, n.y), 0, .002); } }
  for (const n of N) if (!(Sf.jams || []).some(j => Math.hypot(j.x - n.x, j.y - n.y) < 400)) n.str = Math.max(.1, n.str - .0005); };
// ---------------- #14 dew collectors (an errand: J.steer runs it when no item errand is active) ----------------
Y.dewOK = (Sf, c) => beh(c, 'waterLove', .5) > .55 && !Y.blower(c) && !perc(c);
Y.think = (Sf, c, tn) => { if (!Y.on() || !c.mind || !Sf.field || !RS.Field || c.grabbed || c.caught) return; const s = S(c), F = RS.Field, dw = s.dew;
  if (dw) { if (c.jam || tn - dw.t0 > 90) { stat(Sf, c.jam ? 'dewAbortJam' : 'dewAbort' + dw.ph); Y.spill(Sf, c); c.anchor = [dw.ax != null ? dw.ax : dw.hx, dw.ay != null ? dw.ay : dw.hy]; s.dew = null; s.drop = 0; s.dewT = tn; return; }   /* v0.8 B: an aborted trip pours what it carries where it is (no loss) */
    if (dw.ph === 'go') { const d = Math.hypot(dw.px - c.x, dw.py - c.y); if (d < 70) { dw.ph = 'back'; dw.t0 = tn; const Wt = RS.Water; s.dewVol = !c.lod && Wt && Sf.water ? Wt.take(Sf, dw.pid, Y.tripVol(c)) : 0; s.drop = s.dewVol > 0 ? clamp(s.dewVol / 90, .7, 1.4) : 1; if (s.dewVol > 0 && Wt) { const p = Sf.water.pools.find(q => q.id === dw.pid); if (p) Wt.ripple(Sf, p, 14, 1.2); } stat(Sf, 'dewFill'); Sf.fx({ k: 'dewFill', x: dw.px, y: dw.py, c, dur: .8, event: true }); } else { c.itemGoal = { x: dw.px, y: dw.py, stop: 40, dew: 1 }; return; } }   /* v0.8 B: the dip takes REAL water (on screen; off screen the per-area tally moves it) */
    const d = Math.hypot(dw.hx - c.x, dw.hy - c.y); if (d < 45) { Y.bump(Sf, Sf.P.theta(dw.hx, dw.hy), 2, .08, .6); if (s.dewVol > 0) Y.pourHome(Sf, dw.hx, dw.hy, s.dewVol, dw.area, !c.lod); s.dewVol = 0; c.anchor = [dw.ax != null ? dw.ax : dw.hx, dw.ay != null ? dw.ay : dw.hy]; s.dew = null; s.drop = 0; s.dewT = tn; stat(Sf, 'dew'); Sf.fx({ k: 'dewDrop', x: dw.hx, y: dw.hy, c, dur: 1.2, event: true }); return; }
    c.itemGoal = { x: dw.hx, y: dw.hy, stop: 30, dew: 1 }; return; }
  if (c.lod || !Y.dewOK(Sf, c) || !free(c) || (s.dewT && tn - s.dewT < 45) || (RS.Jam && RS.Jam.watched(Sf, c)) || !c.anchor) return; if (c.mind.rest > 0 && rnd('dewr', c.id, Math.floor(tn / 5)) > .3) return;
  const src = Y.dewSource(Sf, c, tn); if (!src) return; if (rnd('dew', c.id, Math.floor(tn / 15)) > .5) return;
  s.dew = { ph: 'go', hx: src.hx, hy: src.hy, ax: c.anchor[0], ay: c.anchor[1], px: src.px, py: src.py, pid: src.pid, area: src.area, t0: tn }; stat(Sf, 'dewTrip'); c.itemGoal = { x: src.px, y: src.py, stop: 40, dew: 1 }; };   /* v0.8b2 B9: off screen (c.lod) no new trips: the per-area tally (Y.waterTick) does the carrying; a trip begun on screen still finishes */
// v0.8 B: where a dew carrier fetches from and pours to. Source: the nearer of a field pool (spring-fed: never below its natural level) and a
// player-poured pool (can be emptied), within 360 px of home; at most 2 carriers per pool. Target: home if dry, or a thirsty plant within 160 px.
Y.CARRY_POOL = 2; Y.PLANT_R = 160;
Y.tripVol = c => clamp(60 + ((RS.Creature ? RS.Creature.radius(c) : 12) - 8) * 4, 60, 120);
Y.dewSource = (Sf, c, tn) => { const F = RS.Field, P = Sf.P, [hx, hy] = c.anchor; if (Sf.mediumAt && Sf.mediumAt(hx, hy).water) return null; const f = F.at(Sf, hx); let tx = hx, ty = hy;
  if (f.moist > .7) { const pl = Y.thirstyPlant(Sf, hx, hy, tn); if (!pl) return null; tx = pl[0]; ty = pl[1]; }   // drier than the pool's banks (the ark is a wet world, so 'dry' is relative), or a thirsty plant nearby
  const q = F.near(Sf, hx, hy, 'pool', 360);   /* v0.5b: dew trips only to a pool near home (was 650) */ let best = null;
  if (q) { const [px, py] = F.pos(Sf, q, 6); if (F.at(Sf, px).moist - f.moist >= .15 || tx !== hx) best = { px, py, pid: 'f' + q.k, d: Math.hypot(px - hx, py - hy) }; }
  if (Sf.water && !P.gas) for (const p of Sf.water.pools) { if (p.q || p.src === 'carry' || !(p.depth > 2)) continue; const hth = P.theta(hx, hy), sd = Math.sign(Math.atan2(Math.sin(hth - p.th), Math.cos(hth - p.th))) || 1, [px, py] = P.surf(p.th + sd * p.span * .7 / P.R), d = Math.hypot(px - hx, py - hy); if (d < 360 && (!best || d < best.d)) best = { px, py: py - 4, pid: p.id, d }; }   /* the near bank, not the middle of a wide poured pool */
  if (!best) return null; let n = 0; for (const o of Sf.creatures) if (o !== c && o.sym && o.sym.dew && o.sym.dew.pid === best.pid) n++; if (n >= Y.CARRY_POOL) return null;
  return Object.assign(best, { hx: tx, hy: ty, area: F.area(Sf, P.theta(hx, hy)) }); };
Y.thirstyPlant = (Sf, x, y, tn) => { const g = Sf.grow; if (!g || !RS.Grow) return null; for (const p of g.plants) { if (p.wetT != null && tn - p.wetT < 600 && tn >= p.wetT) continue; const b = RS.Grow.base(Sf, p); if (Math.hypot(b[0] - x, b[1] - y) < Y.PLANT_R) return b; } return null; };
Y.pourHome = (Sf, x, y, vol, area, vis) => { const Wt = RS.Water; if (!Wt || !Sf.water || !(vol > 0)) return null; const p = Wt.carryPour(Sf, x, y, vol, area); stat(Sf, 'dewPour'); Sf.stats.carried = (Sf.stats.carried || 0) + vol;
  const g = Sf.grow, tn = Sf.now(); if (g) for (const pl of g.plants) { const b = RS.Grow.base(Sf, pl); if (Math.hypot(b[0] - x, b[1] - y) < Y.PLANT_R) pl.wetT = tn; }   // plants and sprouts there perk up (growth.js wet boost)
  if (vis && p && !Sf.mods.dewPourSeen) { Sf.mods.dewPourSeen = 1; const [sx, sy] = Sf.P.surf(p.th); Sf.fx({ k: 'puddleShimmer', x: sx, y: sy - 4, dur: 1.6, force: true }); Sf.blip(sx, sy, 1320, .035, .4, { force: true }); }   // I/B: the first on-screen pour shimmers once with a soft splash
  return p; };
Y.spill = (Sf, c) => { const s = c.sym; if (!s || !(s.dewVol > 0)) return; const Wt = RS.Water; if (Wt && Sf.water) { Wt.pour(Sf, c.x, c.y, s.dewVol); Sf.stats.carried = (Sf.stats.carried || 0) + s.dewVol; } s.dewVol = 0; s.drop = 0; stat(Sf, 'dewSpill'); };
// v0.8 B off screen: once a minute, one number per home area: the dew-capable ohms living off screen there move the average on-screen volume
// (no flight, no droplet, no per-frame work). Carried puddles soak away (~10 min with no trips).
Y.RATE = .99;   // carry rate per area per minute on screen, as a share of a.v (measured in tests/v08_check.js B9: steady on-screen trip cadence 94-120 vol/min, mean ~108 = .99 x 109; v0.8b2 recalibrated from .52, which was carried-until-wet / 30 min)
Y.waterTick = (Sf, tn) => { const Wt = RS.Water; if (!Wt || !Sf.water || !Sf.field || !RS.Field) return; if (Sf._ywT != null && tn - Sf._ywT < 60 && tn >= Sf._ywT) return; const dt = Sf._ywT == null || tn < Sf._ywT ? 60 : tn - Sf._ywT; Sf._ywT = tn;
  Wt.soak(Sf, dt); const A = {}; for (const c of Sf.creatures) { if (!c.lod || !live(c) || !c.anchor || !Y.dewOK(Sf, c) || !free(c)) continue; const src = Y.dewSource(Sf, c, tn); if (!src) continue; const a = A[src.area] || (A[src.area] = { n: 0, v: 0, src }); a.n++; a.v += Y.tripVol(c); }
  for (const k in A) { const a = A[k], want = a.v * Y.RATE * dt / 60, got = Wt.take(Sf, a.src.pid, want); if (got > 0) { Y.pourHome(Sf, a.src.hx, a.src.hy, got, a.src.area, false); Y.bump(Sf, Sf.P.theta(a.src.hx, a.src.hy), 2, .08 * got / (a.v / a.n), .6); Sf.stats.carryTally = (Sf.stats.carryTally || 0) + got; } } };   /* v0.8b2 B9: the tally wets home ground like the trips it stands for (.08 per trip's worth of water), so home fills to the same 'wet enough' point on and off screen */
// ---------------- persistence ----------------
Y.packC = c => { const s = c.sym; if (!s) return null; const o = {}; if (s.keeper) o.keeper = s.keeper; if (s.twin) { o.twin = s.twin; o.echo = s.echo ? 1 : 0; } if (s.tuner) o.tuner = s.tuner; if (s.dewT) o.dewT = 1; return Object.keys(o).length ? o : null; };
// ---------------- drawing (world space, after items; event-only + state you can read) ----------------
Y.draw = (ctx, Sf, t) => { if (!Y.on()) return; if (RS.Pairs) RS.Pairs.draw(ctx, Sf, t); const R = RS.Render, css = (c, a) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  for (const n of (Sf.mods && Sf.mods.nests) || []) { if (!Sf.inView(n.x, n.y, 80)) continue; if (R.tag) R.tag(ctx, 'item', 70); ctx.strokeStyle = css([226, 196, 140], .25 + .35 * n.str); ctx.lineWidth = 1.6;
    for (let k = 0; k < 5; k++) { const a0 = Math.PI * (1.05 + k * .19), a1 = a0 + .5 + .1 * Math.sin(t * .7 + k); ctx.beginPath(); ctx.arc(n.x, n.y - 4, 16 + 4 * (k % 2) + 6 * n.str, a0, a1); ctx.stroke(); } }
  for (const c of Sf.creatures) { if (!live(c) || !Sf.inView(c.x, c.y, 60)) continue; const r = RS.Creature.radius(c);
    if (c.sym && c.sym.drop) { if (R.tag) R.tag(ctx, 'item', 30); const x = c.x, y = c.y - r - 10; ctx.save(); ctx.translate(x, y); ctx.scale(c.sym.drop, c.sym.drop); ctx.translate(-x, -y); ctx.fillStyle = css([140, 200, 255], .75); ctx.strokeStyle = css([210, 235, 255], .8); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.quadraticCurveTo(x + 5, y, x, y + 4); ctx.quadraticCurveTo(x - 5, y, x, y - 6); ctx.fill(); ctx.stroke(); ctx.restore(); }
    if (c.craze) { if (R.tag) R.tag(ctx, 'item', 30); const h = c.craze.hue, a = t * 2.2 + c.id, x = c.x + Math.cos(a) * (r + 8), y = c.y + Math.sin(a) * (r + 8), fade = Math.min(1, Math.max(0, (c.craze.until - Sf.now()) / 8));
      ctx.fillStyle = `hsla(${h},80%,72%,${.75 * fade})`; ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 2 * Math.PI); ctx.fill(); } }
  if (Sf.field && Sf.mods && Sf.mods.farm) for (const q of Sf.field.feat) { const lv = Sf.mods.farm[q.k]; if (!lv || (q.kind !== 'rock' && q.kind !== 'reed') || !RS.Field) continue; const [x, y] = RS.Field.pos(Sf, q, 0); if (!Sf.inView(x, y, 80)) continue; if (R.tag) R.tag(ctx, 'item', 40);
    ctx.strokeStyle = css([170, 230, 160], .2 + .4 * lv); ctx.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { const xx = x + k * 9, h = 4 + 8 * lv * (1 - Math.abs(k) * .2); ctx.beginPath(); ctx.moveTo(xx, y + 2); ctx.lineTo(xx + 1.5, y + 2 - h); ctx.stroke(); } } };
})(typeof window !== 'undefined' ? window : globalThis);
