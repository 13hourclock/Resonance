'use strict';
/* v08-jamview: THE JAM VIEW (approved by Wilbow 5:43-5:51 PM MDT Oct 24 2026). A text-free view of ONE jam:
   ENTRY  pinch-zoom past 4.2 onto EMPTY space between a jam's members (past 4.2 on/near an ohm still opens DNA).  EXIT  pinch in (out of the view) or Android back.
   LAYOUT the world dims + freezes as a cached bitmap, the camera eases in ~0.6 s; members glide into a ring keeping their real bodies; centre = key disc
          inside a bar clock with a sweep; every ohm has its own note ring (bass inner .. melody outer), marks = this bar's notes, melodies as pitch ribbons,
          harmony threads between rings; section beads on an outer arc; item knots on rings.
   CONTROLS (4) ring: slide along = volume (capped), slide in/out = register in whole octaves, tap = mute; (5) phrase chunk: drag = move in the bar,
          drop on another ohm = trade (swap); (6) drag an ohm onto another's spot = swap roles (part only, instrument kept); (7) beads: drag = reorder, flick = drop;
          (8) clock band: slide round = tempo, lean in/out = swing; (9) key disc: twist rim = key (circle of fifths), slide the middle up/down = brighter/darker mood;
          (10) pinch the centre = breakdown, spread = build back; (11) hold a ring + slide = brightness, item knot slide = item amount; (12) tap a phrase = pin.
   MUSIC  (A) every change lands at the next boundary (bar: pitch/role/mix; phrase or cycle end: key/tempo/sections/breakdown); the lead nods one bar ahead
          (on-screen only; off-screen a tiny cached summary E.jv.sum). (B) snapping per tradition, coarse by default, fine after 0.4 s still; swing after snap.
          (C) traded phrases re-voiced for the receiver. (D) role swap = part only, one-bar fade. (E) key = strong vote, pivots, mood per tradition, never retune.
          (F) pins follow key/mode, keep cycle spot + mix slot. (G) whole octaves, clean section ends, tempo ~3%/bar, half/double instant.
   All jam edits live in E.jv (plain data keyed by ohm id) -> saved by songsave (whole minds) and by the jam snapshot (H.snap/H.restore wrappers).
   The drawing is a swappable look table (JV.LOOKS.plain); no allocation per frame in the look or for off-screen ohms. */
(function (G) {
const RS = G.RS = G.RS || {}; const JV = RS.JamView = {};
const TAU = Math.PI * 2, clamp = (v, a, b) => v < a ? a : v > b ? b : v, md = (a, n) => ((a % n) + n) % n, now = () => (G.performance ? G.performance.now() : Date.now());
const Mi = () => RS.Mind, Co = () => RS.Cohere, Hm = () => RS.Harm, Tr = () => RS.Trad, To = () => RS.Tonal;
// ---------------- tuning knobs (defaults, see the report) ----------------
JV.ENTER_Z = 4.2; JV.EXIT_RATIO = .6; JV.EASE = .6; JV.VOL = [.3, 1.35]; JV.OCT = 2; JV.HZ = [55, 1760]; JV.FINE_MS = 400; JV.TEMPO_STEP = .03;
JV.KEY_STEPS = 2; JV.FADE = 1; JV.PIN_MIN = 4; JV.BD_LEN = 64; JV.DIR_PX = 12; JV.VOL_PX = 260; JV.OCT_PX = 42; JV.BR_PX = 220; JV.FLICK = 1.1;
// ---------------- model ----------------
JV.st = E => E.jv || (E.jv = { v: 1, vol: {}, oct: {}, br: {}, pins: {}, shifts: [], trades: [], roles: {}, leadDrum: null, fade: {}, form: null, tempo: null,
  q: [], n: 0, sum: null, keyAim: null });
JV.leadOf = E => E && (E.pulse && E.pulse.mind && E.pulse.mind.E === E ? E.pulse : E.leader || E.members && E.members[0]);
JV.bar = E => { const L = JV.leadOf(E); return L && L.mind && Number.isFinite(L.mind.bar) ? Math.max(0, L.mind.bar) : 0; };
JV.phraseLen = E => { const cy = E && E.trCyc || 1; return cy >= 4 ? cy : 4; };
JV.nextPhrase = (E, bar) => { const P = JV.phraseLen(E), b0 = E.song && Number.isFinite(E.song.at) ? E.song.at : 0, b = bar + 1; return b0 + Math.ceil((b - b0) / P) * P; };
JV.byId = (E, id) => { if (!E || !E.members) return null; for (const c of E.members) if (c.id === id) return c; return null; };
JV.isDrum = c => !!(c && c.mind && c.mind.perc > .55);
JV.PHRASE_OPS = { key: 1, mood: 1, tempo: 1, form: 1, bd: 1 };
// queue a change; it lands at the next musical boundary (A). Returns the op (with .at).
JV.push = (Sf, E, op, o = {}) => { const J = JV.st(E), b = JV.bar(E); op.at = o.at != null ? o.at : JV.PHRASE_OPS[op.k] ? JV.nextPhrase(E, b) : b + 1; op.id = ++J.n;
  if (op.k === 'tempo' && op.inst) op.at = b + 1;   /* half / double time is instant: the next bar */
  // a newer op of the same kind on the same target replaces a still-queued one (slide again before it landed)
  const key = JV.opKey(op); if (key) { const i = J.q.findIndex(p => JV.opKey(p) === key); if (i >= 0) { op.inv = J.q[i].inv; J.q.splice(i, 1); } }
  J.q.push(op); JV.summary(E); if (op.at <= b + 1 && Sf) JV.cue(Sf, E); if (!o.noHist && JV.view && JV.view.E === E) { JV.view.U.push(op); JV.view.Rd.length = 0; } return op; };
JV.opKey = op => op.k === 'trade' || op.k === 'undo' ? null : op.k + ':' + (op.id1 != null ? op.id1 : '') + ':' + (op.a != null && op.k === 'shift' ? op.a : '');
JV.summary = E => { const J = E.jv; if (!J) return; const s = J.sum || (J.sum = { n: 0, next: -1 }); s.n = J.q.length; let nx = -1; for (const p of J.q) if (nx < 0 || p.at < nx) nx = p.at; s.next = nx; };
// land due ops once per bar per jam; cue the lead one bar ahead (on-screen only)
JV.land = (Sf, E, bar) => { const J = E.jv; if (!J || J._bar === bar) return; J._bar = bar;
  if (J.q.length) { let due = null; for (const op of J.q) if (op.at <= bar) (due || (due = [])).push(op);
    if (due) { J.q = J.q.filter(op => op.at > bar); for (const op of due) { try { JV.apply(Sf, E, op, bar); } catch (e) { J.err = String(e && e.message || e); } } } }   /* applying may queue a follow-up (key pivots) */
  JV.perBar(Sf, E, bar);
  if (J.q.length) { let soon = false; for (const op of J.q) if (op.at === bar + 1) { soon = true; break; } if (soon) JV.cue(Sf, E); }
  JV.summary(E); };
// the lead's one-bar-ahead nod: only when someone can see it (off-screen: just the cached summary)
JV.cue = (Sf, E) => { const L = JV.leadOf(E), J = E.jv, b = JV.bar(E); if (!L || !Hm() || !Hm().cue || J._cued === b) return false; if (!(JV.view && JV.view.E === E || RS.Jam && RS.Jam.watched && RS.Jam.watched(Sf, L))) return false; J._cued = b; Hm().cue(Sf, L, 'nod', { dur: .9 }); return true; };
JV.perBar = (Sf, E, bar) => { const J = E.jv;
  // (G) tempo: ~3% per bar toward the aim (whole jam)
  if (J.tempo && Number.isFinite(J.tempo.to)) { const L = JV.leadOf(E), cur = L && L.mind ? JV.bpm(E, L) : J.tempo.to, to = J.tempo.to;
    const nx = Math.abs(to / cur - 1) <= JV.TEMPO_STEP ? to : cur * (to > cur ? 1 + JV.TEMPO_STEP : 1 - JV.TEMPO_STEP); JV.setBpm(Sf, E, nx, false); if (nx === to) J.tempo = null; }
  // (7) sections: the arranged form is the jam's form; growth trials stop while the player owns it
  if (J.form && E.grow) { const g = E.grow; if (!g.form || g.form.join() !== J.form.join()) { g.form = J.form.slice(); g.fi = md(g.fi, g.form.length); } g.trial = null; }
  // (10) the player's breakdown holds (a jam-made drop never replaces it) until spread
  if (J.bd) { if (bar >= J.bd.to) J.bd = null; else if (!E.drop || !E.drop.jv || bar >= E.drop.to) JV.bdMake(E, bar); }
  // role overrides survive the jam's own reshuffles
  for (const id in J.fade) if (J.fade[id] < bar - JV.FADE) delete J.fade[id]; };
JV.bpm = (E, L) => E.bpmBase > 0 ? E.bpmBase : (L.mind.bpmT || L.mind.bpm);   /* the jam's base tempo (the engine's own ritardando rides on top) */
JV.setBpm = (Sf, E, bpm, hard) => { bpm = clamp(bpm, 40, 220);
  for (const c of E.members) { const m = c.mind; if (!m) continue; m.bpmT = bpm; if (m.bpmPref != null) m.bpmPref = bpm; if (hard) m.bpm = bpm; } E.bpmBase = bpm; };
// ---------------- applying ops ----------------
JV.apply = (Sf, E, op, bar) => { const J = E.jv, k = op.k;
  if (k === 'vol') { if (op.v == null || Math.abs(op.v - 1) < .02) delete J.vol[op.id1]; else J.vol[op.id1] = op.v; }
  else if (k === 'oct') { if (!op.v) delete J.oct[op.id1]; else J.oct[op.id1] = op.v; }
  else if (k === 'br') { if (!op.v) delete J.br[op.id1]; else J.br[op.id1] = op.v; }
  else if (k === 'amt') { const c = JV.byId(E, op.id1); if (c && c.item && RS.FXK) RS.FXK.set(Sf, c.item, 'mix', op.v); }
  else if (k === 'shift') { J.shifts = J.shifts.filter(s => !(s.id === op.id1 && s.a === op.a)); if (op.by) J.shifts.push({ id: op.id1, a: op.a, b: op.b, by: op.by, wrap: !!op.wrap }); }
  else if (k === 'trade') { for (const t of op.t) { J.trades = J.trades.filter(x => !(x.to === t.to && x.a < t.b && t.a < x.b)); J.trades.push({ to: t.to, a: t.a, b: t.b, notes: t.notes, tid: op.tid, from: t.from }); } }
  else if (k === 'untrade') { J.trades = J.trades.filter(x => x.tid !== op.tid); if (op.prev) for (const x of op.prev) J.trades.push(x); }
  else if (k === 'pin') { if (op.pin) J.pins[op.id1] = op.pin; else delete J.pins[op.id1]; }
  else if (k === 'role') { for (const id in op.set) { const c = JV.byId(E, +id) || JV.byId(E, id); if (!c || !c.mind) continue; const r = op.set[id]; if (r) { J.roles[id] = r; c.mind.role = c.mind.erole = r; c.mind.phrase = null; } else delete J.roles[id]; J.fade[id] = bar; }
    J.leadDrum = op.leadDrum == null ? null : op.leadDrum; }
  else if (k === 'form') { J.form = op.form ? op.form.slice() : null; if (E.grow && op.form) { E.grow.form = op.form.slice(); E.grow.fi = -1; } }
  else if (k === 'tempo') { if (op.inst) { JV.setBpm(Sf, E, op.to, true); J.tempo = null; } else J.tempo = { to: op.to }; }
  else if (k === 'swing') { E.swing = clamp(op.v, 0, .3); for (const c of E.members) if (c.mind) c.mind.swing = E.swing; }
  else if (k === 'key') JV.keyLand(Sf, E, op, bar);
  else if (k === 'mood') JV.moodLand(Sf, E, op);
  else if (k === 'bd') JV.bdLand(Sf, E, op, bar); };
// ---------------- (E) key: a strong vote into the consensus, circle-of-fifths pivots, never retune ----------------
JV.fixed = E => { const S = E && E.sys; return !!(E && (E.trad === 'gamelan' || E.trad === 'overtone') || S && ((S.period || 1200) !== 1200 || S.fam === 'gamelan' || S.fam === 'overtone')); };
JV.norm = c => { c = md(c + 600, 1200) - 600; return c === -600 ? 600 : c; };
// the player's weight vs the members' wish to stay (lead counts more; low creativity = stubborn)
JV.keyVote = E => { let stay = 0, n = 0; const L = JV.leadOf(E); for (const c of E.members) { if (!c.mind) continue; n++; const cr = c.mind.creat == null ? .5 : c.mind.creat; stay += (c === L ? 1.5 : 1) * (.35 + .65 * (1 - cr)); } return { player: 1.5 + .25 * n + .5 * n, stay }; };
JV.keyLand = (Sf, E, op, bar) => { const S = E.sys; if (!S) return; let steps = op.steps | 0; if (!steps) return; const v = JV.keyVote(E), cap = v.player >= v.stay ? JV.KEY_STEPS : 1, take = Math.sign(steps) * Math.min(Math.abs(steps), cap);
  if (JV.fixed(E)) { const n = S.cents.length, P = S.period || 1200; let t = E.tonicC || 0; for (let i = 0; i < Math.abs(take); i++) { if (take > 0) t += S.cents[1] - S.cents[0]; else t -= P - S.cents[n - 1]; } E.tonicC = JV.norm(t); }   /* start note moves by a scale step */
  else E.tonicC = JV.norm((E.tonicC || 0) + take * 700);
  for (const c of E.members) if (c.mind) { c.mind.tonicC = E.tonicC; c.mind.phrase = null; }
  const H = Hm(); if (H && E.members[0] && E.members[0].mind && E.members[0].mind.hb) for (const c of E.members) if (c.mind && c.mind.hb) c.mind.hb.cur = null;
  const rest = steps - take; E.jv.keyAim = rest ? rest : null; if (rest) JV.push(Sf, E, { k: 'key', steps: rest, pivot: true }, { at: JV.nextPhrase(E, bar), noHist: true }); };
// mood (9): next brighter / darker member of the tradition's own set, same tuning frame. Fixed tuning: rotate the mode on the same pitches (pathet).
JV.moods = E => { const S = E.sys, CAT = To() && To().CAT || []; if (!S) return []; const D = Tr() && Tr().D ? Tr().D(E.trad || 'western') : null, P = S.period || 1200, n = S.cents.length;
  const ok = e => (e.period || 1200) === P && e.cents.length === n; let set = [];
  if (D && (D.names || D.fams)) set = CAT.filter(e => ok(e) && (D.names && D.names.includes(e.name) || D.fams && D.fams.includes(e.fam)));
  if (set.length < 2) set = CAT.filter(e => ok(e) && e.fam === S.fam); if (set.length < 2 && n === 7) set = CAT.filter(e => ok(e) && e.fam === 'diatonic');
  if (!set.some(e => e.name === S.name)) set.push(S); return set.slice().sort((a, b) => (a.bright || 0) - (b.bright || 0)); };
JV.rotate = (base, r) => { const bc = base.baseCents || base.cents, n = bc.length, P = base.period || 1200; r = md(r, n); const cents = []; for (let i = 0; i < n; i++) { const q = r + i; cents.push(bc[q % n] + (q >= n ? P : 0) - bc[r]); }
  return Object.assign({}, base, { cents, rot: r, shift: bc[r], baseCents: bc.slice(), baseName: base.baseName || base.name }); };
JV.moodLand = (Sf, E, op) => { const S = E.sys; if (!S || !op.dir && !op.sys) return; let N = null, dT = 0;
  if (op.sys) { N = op.sys; dT = (N.shift || 0) - (S.shift || 0); if (!JV.fixed(E)) dT = 0; }   /* undo: that exact system back */
  else if (JV.fixed(E)) { N = JV.rotate(S, (S.rot || 0) + (op.dir > 0 ? 1 : -1)); dT = N.shift - (S.shift || 0); }   /* pathet / mode: same pitches, new start note */
  else { const set = JV.moods(E), i = set.findIndex(e => e.name === S.name), j = clamp(i + (op.dir > 0 ? 1 : -1), 0, set.length - 1); if (j === i) return; N = set[j]; }
  if (!N || N === S) return; const H = Hm(), mode0 = H && H.mode ? H.mode(S) : null; E.sys = N; if (dT) E.tonicC = JV.norm((E.tonicC || 0) + dT);
  const grav = To().gravity ? To().gravity(N) : null; for (const c of E.members) { const m = c.mind; if (!m) continue; m.sys = N; if (grav) m.grav = grav; m.phrase = null; if (dT) m.tonicC = E.tonicC;
    if (m.hb && H && H.vocab) { m.hb.V = Object.assign(H.vocab(N, m.hb.st), E.keyV || {}); m.hb.cur = null; } }
  if (H && H.mode && H.section && E.song && E.song.secs && H.mode(N) !== mode0) { const L = JV.leadOf(E); try { for (const kd in E.song.secs) E.song.secs[kd] = H.section(L.mind, kd, E.song.r || Math.random); } catch (e) { } }
  if (Tr().RAGA) E.raga = Tr().RAGA[N.name] || (E.trad === 'hindustani' || E.trad === 'carnatic' ? E.raga : null); };
// (10) breakdown: reuse harmony's drop (bdFilter thins the parts, bdBar staggers the build back)
JV.bdLand = (Sf, E, op, bar) => { const J = E.jv; if (op.on) { J.bd = { to: bar + JV.BD_LEN }; JV.bdMake(E, bar); } else { J.bd = null; if (E.drop && bar < E.drop.to) { E.drop.to = Math.max(bar + 2, Math.min(E.drop.to, JV.nextPhrase(E, bar))); E.drop.len = E.drop.to - E.drop.from; } } };
JV.bdMake = (E, bar) => { const L = JV.leadOf(E), bass = E.members.find(c => c.mind && c.mind.role === 'bass');
    const to = E.jv.bd ? E.jv.bd.to : bar + JV.BD_LEN, from = E.drop && E.drop.jv && E.drop.from <= bar ? E.drop.from : bar;
  E.drop = { from, to, len: to - from, seen: new Set(E.members.map(c => c.id)), by: L ? L.id : null, anchor: bass ? bass.id : null, jv: 1 }; };
// ---------------- (B) snapping per tradition ----------------
// candidate landing steps for a chunk start inside a bar: coarse = beats / beat groups, fine = every step (still for FINE_MS)
JV.snapSet = (E, m, fine) => { const L = Mi().barLen(m), out = []; if (fine) { for (let s = 0; s < L; s++) out.push(s); return out; }
  const g = m.groups && m.groups.length ? m.groups : [L]; let s = 0; const additive = g.some(x => x !== g[0]) || E.trad === 'aksak' || E.trad === 'makam' || E.trad === 'hindustani' || E.trad === 'carnatic';
  if (additive) { for (const x of g) { out.push(s); s += x; } return out; } const beat = g.length > 1 ? g[0] : (L % 4 === 0 ? L / 4 : L % 3 === 0 ? L / 3 : 1); for (s = 0; s < L; s += beat) out.push(s); return out; };
JV.snap = (E, m, s, fine) => { const set = JV.snapSet(E, m, fine); let b = set[0], d = 1e9; for (const x of set) { const dd = Math.abs(x - s); if (dd < d) { d = dd; b = x; } } return b; };
// chunk windows (phrase pieces): the meter's beat groups when additive, else half bars
JV.chunks = (E, m) => { const L = Mi().barLen(m), g = m.groups && m.groups.length > 2 && (g0 => g0.some(x => x !== g0[0]))(m.groups) ? m.groups : null, out = [];
  if (g) { let s = 0; for (const x of g) { out.push([s, s + x]); s += x; } } else { const h = L / 2; out.push([0, h], [h, L]); } return out; };
// may this chunk move? tala sam (step 0 on a cycle start) and the gamelan gong end stay; clave patterns never wrap across the bar
JV.fixedChunk = (E, m, a, b, bar) => { const cy = E.trCyc || 1, L = Mi().barLen(m); if ((E.trad === 'hindustani' || E.trad === 'carnatic') && a === 0) return 'sam';
  if (E.trad === 'gamelan' && b >= L && md(bar + 1, cy) === 0) return 'gong'; return null; };
JV.shiftLimits = (E, m, a, b) => { const L = Mi().barLen(m), wrap = !(E.trad === 'cuban' || E.trad === 'rumba' || E.trad === 'bossa' || E.trad === 'samba') && !(E.trad === 'gamelan'); return { lo: -a, hi: L - b, wrap, L }; };
// ---------------- (C) a traded phrase, re-voiced for the receiver ----------------
JV.meanHz = (Sf, m, notes) => { let s = 0, n = 0; for (const o of notes) { if (o.perc) continue; const h = o.f || Mi().hz(Sf, m, o.deg); if (h > 0) { s += Math.log2(h); n++; } } return n ? Math.pow(2, s / n) : 0; };
JV.mapPhrase = (Sf, E, from, to, src, a, b) => { const mf = from.mind, mt = to.mind, n = (mt.sys || E.sys).cents.length, out = [], toDrum = JV.isDrum(to), fromDrum = JV.isDrum(from);
  const mine = JV.view && JV.view.cap[to.id] ? JV.view.cap[to.id].notes : null; let k = 0;
  for (const o of src) { const q = { s: o.s - a, d: o.d || 1, vel: o.vel == null ? .7 : o.vel };
    if (toDrum) { q.perc = o.perc || 1; q.deg = 0; } else if (fromDrum || o.perc) { q.deg = q.vel > .62 ? 0 : (q.s % 2 ? 4 : 2); }   /* rhythm onto chord tones */
    else { q.deg = o.f && To().degOfCents ? To().degOfCents(mt.sys || E.sys, 1200 * Math.log2(o.f / Mi().tonicHz(Sf, mf))) : o.deg; if (o.orn && !toDrum) q.orn = o.orn; }
    if (o.db) q.db = o.db; out.push(q); }
  if (!toDrum) { const own = mine && mine.length ? JV.meanHz(Sf, mt, mine) : Mi().tonicHz(Sf, mt) * 1.5, got = JV.meanHz(Sf, mt, out); if (own > 0 && got > 0) k = Math.round(Math.log2(own / got));
    // mix band: a non-bass receiver never sinks into the bass band; a bass stays low
    const bassC = E.members.find(c => c.mind && c.mind.role === 'bass' && c !== to), bassHz = bassC && JV.view && JV.view.cap[bassC.id] ? JV.meanHz(Sf, bassC.mind, JV.view.cap[bassC.id].notes) : 0;
    if (mt.role !== 'bass' && bassHz > 0) while (got * Math.pow(2, k) < bassHz * 1.6 && k < JV.OCT) k++; if (mt.role === 'bass') while (got * Math.pow(2, k) > 260 && k > -JV.OCT) k--;
    for (const q of out) q.deg += k * n;
    // the receiver's own ornaments: a grace note before its longest note (raga: never on Sa or Pa)
    if ((mt.orn || 0) > .45 && out.length) { let L = out[0]; for (const q of out) if (q.d > L.d) L = q; if (!JV.protectedDeg(E, mt, L.deg) && L.s >= .5) out.push({ s: L.s - .5, d: .5, deg: L.deg + 1, vel: L.vel * .5, grace: 1 }); } }
  return out; };
JV.protectedDeg = (E, m, deg) => { if (!(E.trad === 'hindustani' || E.trad === 'carnatic')) return false; const S = m.sys || E.sys, n = S.cents.length, i = md(Math.round(deg), n); if (i === 0) return true; return Math.abs(S.cents[i] - 702) < 30; };
// ---------------- the note hook: every jam member's bar goes through here ----------------
const cp = o => Object.assign({}, o);
JV.gen = (Sf, m, bar, out) => { const E = m.E; if (!E || !E.jv) return out; JV.land(Sf, E, bar); const J = E.jv, c = m.c; if (!c) return out; const id = c.id, L = Mi().barLen(m);
  let touched = false; const own = () => { if (!touched) { out = out.map(cp); touched = true; } };
  // (12)(F) pin: keeps its cycle spot; stored as degrees so it follows key + mode
  const pn = J.pins[id]; if (pn && md(bar, pn.cyc) === pn.slot) { out = pn.notes.map(cp); touched = true; }
  // (5)(C) trades: the window plays the traded phrase
  for (const t of J.trades) if (t.to === id && t.a < L) { own(); out = out.filter(o => o.s < t.a || o.s >= t.b); for (const q of t.notes) if (t.a + q.s < L) { const o = cp(q); o.s = t.a + q.s; out.push(o); } }
  // (5) shifted chunks (gamelan: kotekan partners carry the same shift - stored for both at push time)
  for (const sh of J.shifts) if (sh.id === id) { own(); for (const o of out) if (o.s >= sh.a && o.s < sh.b) o.s = sh.wrap ? md(o.s + sh.by, L) : clamp(o.s + sh.by, 0, L - .01); }
  // (4)(G) register: whole octaves, pitched notes only
  const k = J.oct[id] | 0; if (k && !JV.isDrum(c)) { own(); const n = (m.sys || E.sys).cents.length; for (const o of out) if (!o.perc) { if (o.f) o.f *= Math.pow(2, k); else o.deg += k * n; } }
  // (4) volume (capped), (D) one-bar fade-in after a role swap, lead drum accent
  const vol = J.vol[id], fd = J.fade[id], lead = J.leadDrum === id;
  if (vol != null || fd != null || lead) { own(); const g = (vol == null ? 1 : clamp(vol, JV.VOL[0], JV.VOL[1])) * (lead ? 1.18 : 1); for (const o of out) { let v = (o.vel == null ? .7 : o.vel) * g; if (fd != null && bar <= fd + JV.FADE - 1) v *= .4 + .6 * o.s / L; o.vel = clamp(v, 0, 1.6); }
    if (lead && md(bar, 4) === 3 && out.length) { let hi = out[0]; for (const o of out) if (o.vel > hi.vel) hi = o; out.push(Object.assign(cp(hi), { s: L - 1, d: .5, vel: hi.vel * .8 }), Object.assign(cp(hi), { s: L - .5, d: .5, vel: hi.vel * .9 })); } }
  if (JV.view && JV.view.E === E) JV.capture(c, bar, L, out);
  return out; };
JV.capture = (c, bar, L, out) => { const V = JV.view, s = V.cap[c.id] || (V.cap[c.id] = { bar: -1, L: 16, notes: [] }); s.bar = bar; s.L = L; s.notes = out.slice(); s.t = now(); };
// brightness (11): the ohm's own filter, scaled, without touching its genome (a cached instrument copy per value)
JV.brInst = (c, k) => { const src = c.P.inst; if (!src || !(src.cut > 0)) return null; const ck = c._jvBr; if (ck && ck.src === src && ck.k === k) return ck.inst; const inst = Object.assign({}, src, { cut: clamp(src.cut * Math.pow(2, k * 1.6), 120, 16000) }); c._jvBr = { src, k, inst }; return inst; };
// ---------------- install (engine hooks; idempotent) ----------------
JV.hook = () => { if (JV._hooked || !RS.Mind || !RS.Mind.genBar) return; JV._hooked = true; const M = RS.Mind;
  const gen0 = M.genBar; M.genBar = (Sf, m, bar) => { const o = gen0(Sf, m, bar); return m && m.E && m.E.jv ? JV.gen(Sf, m, bar, o || []) : o; };
  const play0 = M.play; if (play0) M.play = function (Sf, c) { const E = c && c.mind && c.mind.E, k = E && E.jv && E.jv.br[c.id]; if (!k || !c.P) return play0.apply(this, arguments); const inst = JV.brInst(c, k); if (!inst) return play0.apply(this, arguments); const keep = c.P.inst; c.P.inst = inst; try { return play0.apply(this, arguments); } finally { c.P.inst = keep; } };
  const C = RS.Cohere; if (C && C.roles) { const r0 = C.roles; C.roles = function (Sf, E) { const r = r0.apply(this, arguments); if (E && E.jv) for (const id in E.jv.roles) { const c = JV.byId(E, +id) || JV.byId(E, id); if (c && c.mind) c.mind.role = c.mind.erole = E.jv.roles[id]; } return r; }; }
  const H = RS.Harm; if (H && H.snap) { const s0 = H.snap; H.snap = function (E) { const s = s0.apply(this, arguments); if (s && E && E.jv) s.jv = JSON.parse(JSON.stringify(E.jv, (k, v) => k === '_bar' || k === '_cued' || k === 'err' ? undefined : v)); return s; }; }
  if (H && H.restore) { const r0 = H.restore; H.restore = function (Sf, E) { const r = r0.apply(this, arguments); const s = E && E.restored; if (s && s.jv && !E.jv) { E.jv = s.jv; s.jv = null; } return r; }; } };
JV.hook();
// ---------------- the view: geometry + gestures (screen px) ----------------
JV.view = null; JV.LOOKS = {}; JV.look = 'plain';
const MAXN = 16;
JV.newView = (Sf, j, Wd, Ht) => ({ Sf, j, E: j.E, t0: now(), Wd, Ht, cx: Wd / 2, cy: Ht * .47, R: Math.min(Wd, Ht) * .42, cap: {}, U: [], Rd: [], Rr: Math.min(Wd, Ht) * .42, R: Math.min(Wd, Ht) * .42,
  ring: new Float64Array(MAXN), ang: new Float64Array(MAXN), sx: new Float64Array(MAXN), sy: new Float64Array(MAXN), fx: new Float64Array(MAXN), fy: new Float64Array(MAXN), n: 0,
  g: null, bmp: null, bk: null, pend: null, order: [] });
JV.REG = { bass: 0, drone: .5, drum: 1, rhythm: 1.5, comp: 2, texture: 2.5, counter: 3, answer: 3.5, harmony: 3, melody: 5, solo: 5 };
JV.layout = V => { const E = V.E, ms = E.members.filter(c => c && c.mind && !c.dead).slice(0, MAXN); V.order = ms.slice().sort((a, b) => (JV.REG[a.mind.role] == null ? 2.2 : JV.REG[a.mind.role]) - (JV.REG[b.mind.role] == null ? 2.2 : JV.REG[b.mind.role]) || (a.id > b.id ? 1 : -1));
  const n = V.n = V.order.length, R = V.R; V.c0 = R * .14; V.c1 = R * .26; V.r0 = R * .32; V.r1 = R * .80; V.band = n ? (V.r1 - V.r0) / n : 1; V.spot = R * .93; V.beadR = R * 1.1;
  // spots: members sit round the rim at fixed angles by id order (stable through role swaps), rings stack bass inner -> melody outer
  const byId = ms.slice().sort((a, b) => (a.id > b.id ? 1 : -1));
  for (let i = 0; i < n; i++) { const c = V.order[i]; V.ring[i] = V.r0 + V.band * (i + .5); const k = byId.indexOf(c); V.ang[i] = -Math.PI / 2 + ((k + .5) / n - .5) * TAU * .78; } };
JV.spotOf = (V, i) => { const a = V.ang[i]; return [V.cx + Math.cos(a) * V.spot, V.cy + Math.sin(a) * V.spot]; };
JV.memberIdx = (V, c) => V.order.indexOf(c);
// what is under a finger: knot > phrase mark > ring > ohm body > bead > key disc > clock band
JV.hit = (V, x, y) => { const dx = x - V.cx, dy = y - V.cy, r = Math.hypot(dx, dy), a = Math.atan2(dy, dx);
  for (let i = 0; i < V.n; i++) { const p = JV.spotOf(V, i); if (Math.hypot(x - p[0], y - p[1]) < Math.max(22, V.band * .7)) return { k: 'body', i }; }
  const nb = JV.beads(V).length; if (nb && r > V.beadR - 18 && r < V.beadR + 22) { const b = JV.beadAt(V, a); if (b >= 0) return { k: 'bead', i: b }; }
  if (r < V.c0) return { k: r > V.c0 * .55 ? 'key' : 'mood' };
  if (r < V.c1) return { k: 'clock' };
  if (r >= V.r0 && r < V.r1) { const i = clamp(Math.floor((r - V.r0) / V.band), 0, V.n - 1), c = V.order[i];
    if (c && c.item) { const ka = V.ang[i] + .32, kx = V.cx + Math.cos(ka) * V.ring[i], ky = V.cy + Math.sin(ka) * V.ring[i]; if (Math.hypot(x - kx, y - ky) < 16) return { k: 'knot', i }; }
    const ch = JV.chunkAt(V, i, a); if (ch) return { k: 'mark', i, a: ch[0], b: ch[1] }; return { k: 'ring', i }; }
  return { k: 'none' }; };
// a bar runs clockwise from 12 o'clock; step <-> angle
JV.stepAng = (s, L) => -Math.PI / 2 + s / L * TAU;
JV.angStep = (a, L) => md(a + Math.PI / 2, TAU) / TAU * L;
JV.chunkAt = (V, i, a) => { const c = V.order[i], cap = V.cap[c.id]; if (!cap || !cap.notes.length) return null; const L = cap.L, s = JV.angStep(a, L);
  for (const o of cap.notes) if (Math.abs(md(s - o.s + L / 2, L) - L / 2) < Math.max(.75, L / 24)) { for (const ch of JV.chunks(V.E, c.mind)) if (o.s >= ch[0] && o.s < ch[1]) return ch; } return null; };
JV.beads = V => { const g = V.E.grow, J = V.E.jv; return (J && J.form) || (g && g.form) || []; };
JV.beadAng = (V, k, n) => Math.PI / 2 + (k - (n - 1) / 2) * .24;
JV.beadAt = (V, a) => { const b = JV.beads(V), n = b.length; for (let k = 0; k < n; k++) if (Math.abs(md(a - JV.beadAng(V, k, n) + Math.PI, TAU) - Math.PI) < .12) return k; return -1; };
// ---------------- entry / exit ----------------
JV.jamAt = (Sf, wx, wy) => { if (!Sf || !Sf.jams) return null; if (Sf.creatureAt && Sf.creatureAt(wx, wy, 30)) return null; let best = null, bd = 1e9;
  for (const j of Sf.jams) { if (!j || !j.E || !j.members || j.members.length < 2) continue; let x = 0, y = 0, far = 0; for (const c of j.members) { x += c.x; y += c.y; } x /= j.members.length; y /= j.members.length;
    for (const c of j.members) far = Math.max(far, Math.hypot(c.x - x, c.y - y)); const d = Math.hypot(wx - x, wy - y); if (d < Math.max(70, far * .9) && d < bd) { bd = d; best = j; } } return best; };
JV.install = (App, Hd) => { JV.App = App; JV.hook(); Hd.jamview = JV.handlers(App);
  const two0 = Hd.surface.two; Hd.surface.two = (ph, info) => { const r = two0(ph, info); if (ph === 'move' && App.level === 'surface' && !App.play && !App.pinchB && !(App.daw && App.daw.open) && App.cam.z > JV.ENTER_Z && info.ratio > 1) { const w = RS.Render.toWorld(App.cam, App.Wd, App.Ht, info.cx, info.cy), j = JV.jamAt(App.Sf, w[0], w[1]); if (j) JV.enter(App, j); } return r; };
  const back0 = App.back; App.back = () => { if (App.level === 'jamview') { JV.exit(App); return true; } return back0(); };
  const u0 = App.undo, r0 = App.redo; App.undo = () => App.level === 'jamview' ? JV.undo() : u0(); App.redo = () => App.level === 'jamview' ? JV.redo() : r0(); };
JV.enter = (App, j) => { if (App.level === 'jamview' || !j || !j.E) return false; App.resetGesture(); const V = JV.view = JV.newView(App.Sf, j, App.Wd, App.Ht); JV.st(j.E);
  V.cam0 = { x: App.cam.x, y: App.cam.y, z: App.cam.z, th: App.cam.th }; JV.fixR(V); JV.layout(V);
  for (let i = 0; i < V.n; i++) { const c = V.order[i], p = RS.Render.toScreen(App.cam, App.Wd, App.Ht, c.x, c.y); V.fx[i] = p[0]; V.fy[i] = p[1]; }
  try { if (typeof document !== 'undefined' && App.canvas) { const b = document.createElement('canvas'); b.width = App.canvas.width; b.height = App.canvas.height; b.getContext('2d').drawImage(App.canvas, 0, 0); V.bmp = b; } } catch (e) { V.bmp = null; }
  App.level = 'jamview'; App.trail = ['galaxy', 'system', 'surface']; if (App.tone) App.tone(true, .8); return true; };
JV.fixR = V => { V.R = V.Rr; };
JV.exit = (App, why) => { const V = JV.view; if (App.level !== 'jamview') return false; App.resetGesture(); JV.view = null; App.level = 'surface'; if (V && V.cam0) { App.cam.x = V.cam0.x; App.cam.y = V.cam0.y; } App.cam.z = Math.min(App.cam.z, 2.5); App.updateTrail(); if (App.tone) App.tone(false, .8); if (App.save) App.save(); App.lastJv = why || 'exit'; return true; };
// ---------------- undo / redo (in-view history) ----------------
JV.inverse = (Sf, E, op) => { const J = JV.st(E), k = op.k, id = op.id1;
  if (k === 'vol' || k === 'oct' || k === 'br') return { k, id1: id, v: J[k][id] == null ? (k === 'vol' ? 1 : 0) : J[k][id] };
  if (k === 'amt') { const c = JV.byId(E, id); return { k, id1: id, v: c && c.item && RS.FXK ? RS.FXK.val(Sf, c.item, 'mix') : 0 }; }
  if (k === 'shift') { const s = J.shifts.find(x => x.id === id && x.a === op.a); return { k, id1: id, a: op.a, b: op.b, by: s ? s.by : 0, wrap: op.wrap }; }
  if (k === 'trade') return { k: 'untrade', tid: op.tid, prev: J.trades.filter(x => op.t.some(t => t.to === x.to && x.a < t.b && t.a < x.b)) };
  if (k === 'pin') return { k, id1: id, pin: J.pins[id] || null };
  if (k === 'role') { const set = {}; for (const i in op.set) { const c = JV.byId(E, +i) || JV.byId(E, i); set[i] = c && c.mind ? c.mind.role : null; } return { k, set, leadDrum: J.leadDrum }; }
  if (k === 'form') return { k, form: J.form ? J.form.slice() : null };
  if (k === 'tempo') { const L = JV.leadOf(E); return { k, to: L && L.mind ? JV.bpm(E, L) : 100, inst: op.inst }; }
  if (k === 'swing') return { k, v: E.swing || 0 };
  if (k === 'key') return { k, steps: -op.steps };
  if (k === 'mood') return { k, dir: -op.dir, sys: E.sys };
  if (k === 'bd') return { k, on: !op.on };
  return null; };
JV.op = (Sf, E, op) => { op.inv = JV.inverse(Sf, E, op); return JV.push(Sf, E, op); };
JV.undo = () => { const V = JV.view; if (!V) return false; const op = V.U.pop(); if (!op) return false; const J = JV.st(V.E), i = J.q.indexOf(op);
  if (i >= 0) J.q.splice(i, 1); else if (op.inv) JV.push(V.Sf, V.E, Object.assign({}, op.inv), { noHist: true }); V.Rd.push(op); JV.summary(V.E); V.last = 'undo'; return true; };
JV.redo = () => { const V = JV.view; if (!V) return false; const op = V.Rd.pop(); if (!op) return false; const o2 = Object.assign({}, op); delete o2.at; o2.inv = JV.inverse(V.Sf, V.E, o2); JV.push(V.Sf, V.E, o2, { noHist: true }); V.U.push(o2); V.last = 'redo'; return true; };
// ---------------- player actions (also used by tests) ----------------
JV.act = {
  vol: (V, c, v) => JV.op(V.Sf, V.E, { k: 'vol', id1: c.id, v: clamp(v, JV.VOL[0], JV.VOL[1]) }),
  oct: (V, c, k) => { const rg = JV.octRange(V.Sf, c); return JV.op(V.Sf, V.E, { k: 'oct', id1: c.id, v: clamp(Math.round(k), rg[0], rg[1]) }); },
  br: (V, c, v) => JV.op(V.Sf, V.E, { k: 'br', id1: c.id, v: clamp(v, -1, 1) }),
  amt: (V, c, u) => c.item ? JV.op(V.Sf, V.E, { k: 'amt', id1: c.id, v: clamp(u, 0, 1) }) : null,
  mute: (V, c) => { if (Hm() && Hm().mute) Hm().mute(V.Sf, c); else c.muted = !c.muted; return c.muted; },
  shift: (V, c, a, b, by) => { const m = c.mind, E = V.E, lim = JV.shiftLimits(E, m, a, b), bar = c.mind.bar; if (JV.fixedChunk(E, m, a, b, bar)) return null; by = lim.wrap ? by : clamp(by, lim.lo, lim.hi);
    const op = JV.op(V.Sf, E, { k: 'shift', id1: c.id, a, b, by, wrap: lim.wrap });
    // gamelan kotekan: the interlocking partner moves with it
    const cap = V.cap[c.id]; if (E.trad === 'gamelan' && cap && cap.notes.some(o => o.kotekan)) for (const o of E.members) if (o !== c && V.cap[o.id] && V.cap[o.id].notes.some(q => q.kotekan)) JV.op(V.Sf, E, { k: 'shift', id1: o.id, a, b, by, wrap: lim.wrap, partner: c.id });
    return op; },
  trade: (V, c, a, b, c2) => { const E = V.E, A = V.cap[c.id], B = V.cap[c2.id]; if (!A || c === c2) return null; const pick = (cap, x0, x1) => cap ? cap.notes.filter(o => o.s >= x0 && o.s < x1).map(cp) : [];
    const pa = pick(A, a, b), pb = pick(B, a, b), tid = 't' + (JV.st(E).n + 1) + ':' + c.id; const t = [{ to: c2.id, from: c.id, a, b, notes: JV.mapPhrase(V.Sf, E, c, c2, pa, a, b) }];
    if (pb.length || pa.length) t.push({ to: c.id, from: c2.id, a, b, notes: JV.mapPhrase(V.Sf, E, c2, c, pb, a, b) });   /* default: a swap */
    return JV.op(V.Sf, E, { k: 'trade', t, tid }); },
  pin: (V, c) => { const E = V.E, J = JV.st(E), cap = V.cap[c.id]; if (J.pins[c.id]) return JV.op(V.Sf, E, { k: 'pin', id1: c.id, pin: null }); if (!cap) return null; const cyc = Math.max(JV.PIN_MIN, E.trCyc || 1);
    return JV.op(V.Sf, E, { k: 'pin', id1: c.id, pin: { cyc, slot: md(cap.bar, cyc), notes: cap.notes.map(o => { const q = cp(o); if (q.f && !q.perc) { q.deg = To().degOfCents ? To().degOfCents(c.mind.sys || E.sys, 1200 * Math.log2(q.f / Mi().tonicHz(V.Sf, c.mind))) : 0; delete q.f; } return q; }) } }); },
  role: (V, c, c2) => { if (!c || !c2 || c === c2) return null; const ra = c.mind.role, rb = c2.mind.role, da = JV.isDrum(c), db = JV.isDrum(c2), set = {}; let lead = JV.st(V.E).leadDrum;
    if (da === db) { set[c.id] = rb; set[c2.id] = ra; } else { const drum = da ? c : c2, ton = da ? c2 : c, tr = ton.mind.role; set[ton.id] = 'comp'; set[drum.id] = drum.mind.role; if (tr === 'melody' || tr === 'solo') lead = drum.id; else if (lead === drum.id) lead = null; }   /* a drum on the lead spot = lead drum */
    return JV.op(V.Sf, V.E, { k: 'role', set, leadDrum: lead }); },
  form: (V, form) => JV.op(V.Sf, V.E, { k: 'form', form: form.length === 1 ? [form[0], form[0]] : form.slice() }),
  tempo: (V, bpm) => { const L = JV.leadOf(V.E), cur = L && L.mind ? JV.bpm(V.E, L) : bpm, r = bpm / cur, inst = Math.abs(r - 2) < .06 || Math.abs(r - .5) < .03; return JV.op(V.Sf, V.E, { k: 'tempo', to: inst ? cur * (r > 1 ? 2 : .5) : Math.round(bpm), inst }); },
  swing: (V, v) => JV.op(V.Sf, V.E, { k: 'swing', v: clamp(v, 0, .3) }),
  key: (V, steps) => steps ? JV.op(V.Sf, V.E, { k: 'key', steps: Math.round(steps) }) : null,
  mood: (V, dir) => dir ? JV.op(V.Sf, V.E, { k: 'mood', dir: Math.sign(dir) }) : null,
  bd: (V, on) => JV.op(V.Sf, V.E, { k: 'bd', on: !!on }) };
JV.octRange = (Sf, c) => { const f0 = Mi().tonicHz(Sf, c.mind) * Math.pow(2, -((c.mind.E && c.mind.E.jv && c.mind.E.jv.oct[c.id]) | 0) * 0); let lo = 0, hi = 0;
  while (lo > -JV.OCT && f0 * Math.pow(2, lo - 1) >= JV.HZ[0]) lo--; while (hi < JV.OCT && f0 * Math.pow(2, hi + 1) <= JV.HZ[1]) hi++; return [lo, hi]; };
// ---------------- gesture handlers (H.jamview) ----------------
JV.handlers = App => {
  const V = () => JV.view;
  return {
    down: (x, y) => { const v = V(); if (!v) return; const h = JV.hit(v, x, y), t = now(); v.g = Object.assign(h, { x0: x, y0: y, x, y, t0: t, tm: t, dir: null, still: t, vx: 0, vy: 0 }); },
    move: (x, y) => { const v = V(); if (!v || !v.g) return; const g = v.g, t = now(), dt = Math.max(1, t - g.tm); g.vx = (x - g.x) / dt; g.vy = (y - g.y) / dt; if (Math.hypot(x - g.x, y - g.y) > 1.5) g.still = t; g.x = x; g.y = y; g.tm = t;
      if (!g.dir && Math.hypot(x - g.x0, y - g.y0) > JV.DIR_PX) { const r0x = g.x0 - v.cx, r0y = g.y0 - v.cy, rl = Math.hypot(r0x, r0y) || 1, ddx = x - g.x0, ddy = y - g.y0, rad = (ddx * r0x + ddy * r0y) / rl, tan = (-ddx * r0y + ddy * r0x) / rl; g.dir = Math.abs(rad) > Math.abs(tan) ? 'rad' : 'tan'; }
      g.prev = JV.preview(v, g); },
    up: (x, y, q, o) => { const v = V(); if (!v || !v.g) return; const g = v.g; v.g = null; if (o && o.tap) { App.lastJv = JV.tap(v, g); return; } App.lastJv = JV.commit(v, g); },
    tap: () => { }, doubleTap: () => { },
    hold: (x, y, on) => { const v = V(); if (!on || !v || !v.g) return; const g = v.g; if (g.k === 'ring' && Math.hypot(g.x - g.x0, g.y - g.y0) < JV.DIR_PX) { g.k = 'bright'; g.x0 = g.x; g.y0 = g.y; g.dir = null; } },
    two: (ph, info) => { const v = V(); if (!v) return; if (v.g) v.g = null; const d0 = Math.hypot(info.cx - v.cx, info.cy - v.cy);
      if (ph === 'move') { v.pinch = { r: info.ratio, centre: v.pinch ? v.pinch.centre : d0 < v.c1 * 1.3 }; return; }
      if (ph === 'end') { const centre = v.pinch ? v.pinch.centre : d0 < v.c1 * 1.3; v.pinch = null;
        if (centre) { if (info.ratio < .8) { JV.act.bd(v, true); App.lastJv = 'breakdown'; } else if (info.ratio > 1.25) { JV.act.bd(v, false); App.lastJv = 'build'; } return; }
        if (info.ratio < JV.EXIT_RATIO) JV.exit(App, 'pinch'); } },
    cancel: () => { const v = V(); if (v) v.g = null; } }; };
JV.fine = g => now() - g.still >= JV.FINE_MS;
JV.alongPx = (v, g) => { const r0x = g.x0 - v.cx, r0y = g.y0 - v.cy, rl = Math.hypot(r0x, r0y) || 1, ddx = g.x - g.x0, ddy = g.y - g.y0; return { rad: (ddx * r0x + ddy * r0y) / rl, tan: (-ddx * r0y + ddy * r0x) / rl }; };
JV.angDelta = (v, g) => { const a0 = Math.atan2(g.y0 - v.cy, g.x0 - v.cx), a1 = Math.atan2(g.y - v.cy, g.x - v.cx); return md(a1 - a0 + Math.PI, TAU) - Math.PI + (g.turns || 0) * TAU; };
JV.preview = (v, g) => { const J = JV.st(v.E), d = JV.alongPx(v, g), c = g.i != null ? v.order[g.i] : null;
  if (g.k === 'ring' && c) { if (g.dir === 'tan') return { vol: clamp((J.vol[c.id] == null ? 1 : J.vol[c.id]) + d.tan / JV.VOL_PX, JV.VOL[0], JV.VOL[1]) }; if (g.dir === 'rad') { const rg = JV.octRange(v.Sf, c); return { oct: clamp(Math.round((J.oct[c.id] | 0) + d.rad / JV.OCT_PX), rg[0], rg[1]) }; } }
  if (g.k === 'bright' && c) return { br: clamp((J.br[c.id] || 0) + d.tan / JV.BR_PX, -1, 1) };
  if (g.k === 'knot' && c && c.item) return { amt: clamp(RS.FXK.val(v.Sf, c.item, 'mix') + d.tan / JV.BR_PX, 0, 1) };
  if (g.k === 'mark' && c) { const cap = v.cap[c.id], L = cap ? cap.L : 16, a = Math.atan2(g.y - v.cy, g.x - v.cx), s = JV.angStep(a, L) - JV.angStep(Math.atan2(g.y0 - v.cy, g.x0 - v.cx), L), by0 = Math.abs(md(s + L / 2, L) - L / 2) * Math.sign(md(s + L / 2, L) - L / 2);
    const to = JV.snap(v.E, c.mind, g.a + by0, JV.fine(g)) - g.a, r = Math.hypot(g.x - v.cx, g.y - v.cy); let drop = -1; for (let i = 0; i < v.n; i++) { const p = JV.spotOf(v, i); if (Math.hypot(g.x - p[0], g.y - p[1]) < Math.max(26, v.band) && i !== g.i) drop = i; }
    if (drop < 0 && (r < v.r0 || r > v.r1 + 10)) drop = -2; return { by: to, drop }; }
  if (g.k === 'body') { let to = -1; for (let i = 0; i < v.n; i++) { const p = JV.spotOf(v, i); if (i !== g.i && Math.hypot(g.x - p[0], g.y - p[1]) < Math.max(26, v.band)) to = i; } return { to }; }
  if (g.k === 'clock') return { tempo: Math.pow(2, JV.angDelta(v, g) / TAU), swing: clamp((v.E.swing || 0) + d.rad / 400, 0, .3), lean: Math.abs(d.rad) > Math.abs(d.tan) * 1.2 };
  if (g.k === 'key') return { steps: Math.round(JV.angDelta(v, g) / (TAU / 12)) };
  if (g.k === 'mood') return { dir: Math.abs(g.y - g.y0) > 30 ? (g.y < g.y0 ? 1 : -1) : 0 };
  if (g.k === 'bead') { const n = JV.beads(v).length, a = Math.atan2(g.y - v.cy, g.x - v.cx), r = Math.hypot(g.x - v.cx, g.y - v.cy); let k = Math.round((a - Math.PI / 2) / .24 + (n - 1) / 2); k = clamp(k, 0, n - 1);
    const flick = Math.hypot(g.vx, g.vy) > JV.FLICK || Math.abs(r - v.beadR) > 70; return { to: k, drop: flick }; }
  return null; };
JV.tap = (v, g) => { const c = g.i != null ? v.order[g.i] : null; if ((g.k === 'ring' || g.k === 'body' || g.k === 'knot') && c) { JV.act.mute(v, c); return 'mute'; } if (g.k === 'mark' && c) { JV.act.pin(v, c); return 'pin'; } return null; };
JV.commit = (v, g) => { const p = g.prev || JV.preview(v, g), c = g.i != null ? v.order[g.i] : null; if (!p) return null;
  if (g.k === 'ring' && c) { if (p.vol != null) { JV.act.vol(v, c, p.vol); return 'vol'; } if (p.oct != null && p.oct !== (JV.st(v.E).oct[c.id] | 0)) { JV.act.oct(v, c, p.oct); return 'oct'; } return null; }
  if (g.k === 'bright' && c && p.br != null) { JV.act.br(v, c, p.br); return 'bright'; }
  if (g.k === 'knot' && c && p.amt != null) { JV.act.amt(v, c, p.amt); return 'amt'; }
  if (g.k === 'mark' && c) { if (p.drop >= 0) { JV.act.trade(v, c, g.a, g.b, v.order[p.drop]); return 'trade'; } if (p.drop === -1 && p.by) { JV.act.shift(v, c, g.a, g.b, p.by); return 'shift'; } return null; }
  if (g.k === 'body' && c && p.to >= 0) { JV.act.role(v, c, v.order[p.to]); return 'role'; }
  if (g.k === 'clock') { if (p.lean) { JV.act.swing(v, p.swing); return 'swing'; } const L = JV.leadOf(v.E), cur = L && L.mind ? JV.bpm(v.E, L) : 100; if (Math.abs(p.tempo - 1) > .02) { JV.act.tempo(v, cur * p.tempo); return 'tempo'; } return null; }
  if (g.k === 'key' && p.steps) { JV.act.key(v, p.steps); return 'key'; }
  if (g.k === 'mood' && p.dir) { JV.act.mood(v, p.dir); return 'mood'; }
  if (g.k === 'bead') { const f = JV.beads(v).slice(); if (!f.length) return null; const it = f.splice(g.i, 1)[0]; if (p.drop) { if (!f.length) return null; JV.act.form(v, f); return 'drop'; } f.splice(p.to, 0, it); if (p.to === g.i) return null; JV.act.form(v, f); return 'reorder'; }
  return null; };
// ---------------- drawing ----------------
JV.draw = (App, ctx, dt) => { const v = JV.view; if (!v) return; const Wd = App.Wd, Ht = App.Ht, dpr = App.dpr || 1;
  if (v.Wd !== Wd || v.Ht !== Ht) { v.Wd = Wd; v.Ht = Ht; v.cx = Wd / 2; v.cy = Ht * .47; v.Rr = Math.min(Wd, Ht) * .42; JV.fixR(v); }
  if (v.E.members.length !== v.n || (v._lay = (v._lay || 0) + 1) % 30 === 0) JV.layout(v);
  if (!v.E.members.length || !v.E.members.some(c => c && c.mind && c.mind.E === v.E)) { JV.exit(App, 'gone'); return; }
  const e = clamp((now() - v.t0) / 1000 / JV.EASE, 0, 1), k = 1 - Math.pow(1 - e, 3); const look = JV.LOOKS[JV.look] || JV.LOOKS.plain; look.draw(ctx, v, App, k, dpr); };
JV.LOOKS.plain = { draw: (ctx, v, App, k, dpr) => { const Sf = v.Sf, E = v.E, J = JV.st(E), Wd = v.Wd, Ht = v.Ht, cx = v.cx, cy = v.cy;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#05070c'; ctx.fillRect(0, 0, ctx.canvas ? ctx.canvas.width : Wd * dpr, ctx.canvas ? ctx.canvas.height : Ht * dpr);
  if (v.bmp) { const z = 1 + .6 * k, w = v.bmp.width, h = v.bmp.height; ctx.globalAlpha = 1 - .72 * k; ctx.drawImage(v.bmp, cx * dpr - cx * dpr * z, cy * dpr - cy * dpr * z, w * z, h * z); ctx.globalAlpha = 1; }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = k;
  const L = JV.leadOf(E), Lm = L && L.mind, Lb = Lm ? Mi().barLen(Lm) : 16, ph = Lm && Lm.pos != null ? md(Lm.pos, Lb) / Lb : 0, P = JV.phraseLen(E), bar = JV.bar(E);
  // clock band: bar ticks, sweep, phrase pips, queued changes as dots at their landing bar
  ctx.strokeStyle = 'rgba(200,215,255,.22)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, v.c1, 0, TAU); ctx.stroke();
  const beats = Lm && Lm.groups ? Lm.groups.length : 4; for (let i = 0; i < beats; i++) { const a = -Math.PI / 2 + i / beats * TAU; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * v.c1 * .86, cy + Math.sin(a) * v.c1 * .86); ctx.lineTo(cx + Math.cos(a) * v.c1, cy + Math.sin(a) * v.c1); ctx.stroke(); }
  const sa = -Math.PI / 2 + ph * TAU; ctx.strokeStyle = 'rgba(255,240,200,.85)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(cx + Math.cos(sa) * v.c0, cy + Math.sin(sa) * v.c0); ctx.lineTo(cx + Math.cos(sa) * v.c1, cy + Math.sin(sa) * v.c1); ctx.stroke();
  const b0 = E.song && Number.isFinite(E.song.at) ? E.song.at : 0, pi = md(bar - b0, P); for (let i = 0; i < P; i++) { const a = -Math.PI / 2 + (i + .5) / P * TAU; ctx.fillStyle = i === pi ? 'rgba(255,240,200,.9)' : 'rgba(200,215,255,.25)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (v.c1 + 7), cy + Math.sin(a) * (v.c1 + 7), i === pi ? 3 : 2, 0, TAU); ctx.fill(); }
  for (const op of J.q) { const i = md(op.at - b0, P), a = -Math.PI / 2 + (i + .5) / P * TAU, soon = op.at === bar + 1; ctx.strokeStyle = soon ? 'rgba(255,200,120,.95)' : 'rgba(255,200,120,.45)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (v.c1 + 7), cy + Math.sin(a) * (v.c1 + 7), soon ? 6 : 4.5, 0, TAU); ctx.stroke(); }
  // tempo arc (bpm 40..220 round the band) + swing (offset of the inner ticks)
  const bpm = Lm ? Lm.bpm : 100; ctx.strokeStyle = 'rgba(140,220,200,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, (v.c0 + v.c1) / 2, -Math.PI / 2, -Math.PI / 2 + clamp((bpm - 40) / 180, .02, 1) * TAU); ctx.stroke();
  const sw = E.swing || 0; ctx.fillStyle = 'rgba(140,220,200,.7)'; for (let i = 0; i < 8; i++) { const a = -Math.PI / 2 + (i + (i % 2 ? sw * 2 : 0)) / 8 * TAU; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * (v.c0 + 5), cy + Math.sin(a) * (v.c0 + 5), 1.6, 0, TAU); ctx.fill(); }
  // key disc: 12 fifths round the rim (current lit), fill brightness = mood
  const S = E.sys, br = S && S.bright != null ? S.bright : 0, kc = md(Math.round((E.tonicC || 0) / 100) * 7, 12); ctx.fillStyle = `hsla(${210 - 40 * br},35%,${22 + 14 * br}%,.95)`; ctx.beginPath(); ctx.arc(cx, cy, v.c0, 0, TAU); ctx.fill();
  for (let i = 0; i < 12; i++) { const a = -Math.PI / 2 + i / 12 * TAU; ctx.fillStyle = i === kc ? 'rgba(255,240,200,.95)' : 'rgba(255,255,255,.22)'; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * v.c0 * .78, cy + Math.sin(a) * v.c0 * .78, i === kc ? 3 : 1.6, 0, TAU); ctx.fill(); }
  if (E.drop && bar < E.drop.to) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash && ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.arc(cx, cy, v.c0 * .45, 0, TAU); ctx.stroke(); ctx.setLineDash && ctx.setLineDash([]); }
  // rings + marks + ribbons
  for (let i = 0; i < v.n; i++) { const c = v.order[i], r = v.ring[i], cap = v.cap[c.id], hue = c.P && c.P.hue != null ? c.P.hue : (i * 47) % 360, muted = c.muted, vol = J.vol[c.id] == null ? 1 : J.vol[c.id];
    ctx.strokeStyle = `hsla(${hue},45%,60%,${muted ? .12 : .3})`; ctx.lineWidth = Math.max(1, v.band * .5 * clamp(vol, .3, 1.35) / 1.35); ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    if (J.pins[c.id]) { ctx.fillStyle = 'rgba(255,240,200,.9)'; ctx.beginPath(); ctx.arc(cx + Math.cos(-Math.PI / 2) * r, cy - r, 3, 0, TAU); ctx.fill(); }
    if (c.item) { const a = v.ang[i] + .32; ctx.strokeStyle = 'rgba(255,255,255,.6)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 5, 0, TAU); ctx.stroke(); }
    if (!cap || !cap.notes.length) continue; const Lc = cap.L, mel = c.mind.role === 'melody' || c.mind.role === 'solo' || c.mind.role === 'counter' || c.mind.role === 'answer', drum = JV.isDrum(c), n = (c.mind.sys || E.sys).cents.length;
    ctx.fillStyle = `hsla(${hue},70%,70%,${muted ? .25 : .9})`; ctx.strokeStyle = `hsla(${hue},70%,72%,${muted ? .2 : .75})`; ctx.lineWidth = 1.6; if (mel) ctx.beginPath();
    let first = true; for (const o of cap.notes) { const a = JV.stepAng(o.s, Lc), off = drum || o.perc ? 0 : clamp(((o.deg || 0) - n) / (n * 2), -.5, .5) * v.band * .8, rr = r + off, x = cx + Math.cos(a) * rr, y = cy + Math.sin(a) * rr;
      if (mel && !o.perc) { if (first) ctx.moveTo(x, y); else ctx.lineTo(x, y); first = false; } else { ctx.fillRect(x - 2, y - 2, 4, 4 * clamp(o.vel == null ? .7 : o.vel, .3, 1.4)); } }
    if (mel) ctx.stroke(); }
  // harmony threads: same-step onsets a consonance apart
  ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(255,240,210,.18)'; ctx.beginPath();
  for (let i = 0; i < v.n; i++) { const ci = v.order[i], A = v.cap[ci.id]; if (!A || JV.isDrum(ci)) continue; for (let j = i + 1; j < v.n; j++) { const cj = v.order[j], B = v.cap[cj.id]; if (!B || JV.isDrum(cj)) continue; const S2 = ci.mind.sys || E.sys, n2 = S2.cents.length;
      for (const a of A.notes) { if (a.perc) continue; for (const b of B.notes) { if (b.perc || Math.abs(a.s - b.s) > .25) continue; const iv = md(Math.round(S2.cents[md(Math.round(b.deg || 0), n2)] - S2.cents[md(Math.round(a.deg || 0), n2)]), 1200); if (iv > 280 && iv < 420 || iv > 680 && iv < 720 || iv > 780 && iv < 920 || iv < 20) { const an = JV.stepAng(a.s, A.L); ctx.moveTo(cx + Math.cos(an) * v.ring[i], cy + Math.sin(an) * v.ring[i]); ctx.lineTo(cx + Math.cos(an) * v.ring[j], cy + Math.sin(an) * v.ring[j]); } } } } }
  ctx.stroke();
  // section beads on the outer arc
  const bd = JV.beads(v), nb = bd.length, gi = E.grow ? md(E.grow.fi, Math.max(1, nb)) : -1; for (let i = 0; i < nb; i++) { const a = JV.beadAng(v, i, nb), ch = String(bd[i]).charCodeAt(0) || 65; ctx.fillStyle = `hsla(${(ch * 67) % 360},55%,62%,${i === gi ? .95 : .55})`; ctx.beginPath(); ctx.arc(cx + Math.cos(a) * v.beadR, cy + Math.sin(a) * v.beadR, i === gi ? 8 : 6, 0, TAU); ctx.fill(); }
  // drag feedback (shapes only)
  const g = v.g; if (g && g.prev) { ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(g.x, g.y, 14, 0, TAU); ctx.stroke(); }
  // ohms: real bodies glide from where they stood to their spots
  const day = Sf.day == null ? 1 : Sf.day, cam = App.cam; for (let i = 0; i < v.n; i++) { const c = v.order[i]; let sx = Math.cos(v.ang[i]) * v.spot + cx, sy = Math.sin(v.ang[i]) * v.spot + cy;
    if (g && g.k === 'body' && g.i === i) { sx = g.x; sy = g.y; } const x = v.fx[i] + (sx - v.fx[i]) * k, y = v.fy[i] + (sy - v.fy[i]) * k, rad = RS.Creature && RS.Creature.radius ? RS.Creature.radius(c) : 20, s1 = clamp(Math.max(16, v.band * .55) / Math.max(4, rad), .2, 3), s = cam.z + (s1 - cam.z) * k;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.translate(x, y); ctx.scale(s, s); ctx.rotate(-(cam.th || 0)); ctx.translate(-c.x, -c.y); try { RS.Render.creature(ctx, Sf, c, day); } catch (e) { } }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = 1; } };
})(typeof window !== 'undefined' ? window : globalThis);
