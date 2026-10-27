'use strict';
// v0.7 G: musical traditions with their own rules, not just their scales. A jam settles on one by consensus (each member leans
// to the tradition of its own scale family, a light nudge from the world for the rest, more weight for experience). Rules work on
// the jam's normal bars: tuning (CAT systems, microtones per note), rhythm cycle (meter groups + a cycle landing), harmony
// (drone / a fixed form / a cadence), and melodic rules (raga ascent/descent + vadi + gamaka, maqam sayr + heterophony, gamelan
// colotomy + kotekan + irama, bell/clave timelines, call and response, ma). Fusion only through an experienced bridge in a matched
// jam (E gate). No composer: every ohm applies the shared rules to its own bar. Cheap: a few array passes per generated bar.
// v0.8b6: the traditions are data (styles.js, PATTERN_LIBRARY 1.2); Tr.T is built from it. 10 new traditions play through new rule
// switches only (drum cells, bass / comp cells, semitone chord progressions, the One, the one-drop, motifs, overtone melody), so the
// 14 v0.7 traditions play exactly as before (tests/trad_fp.js fingerprints). Planets carry a seeded culture blend (Tr.blend).
(function (G) { const RS = G.RS = G.RS || {}; const Tr = RS.Trad = {}; const St = RS.Styles;
const md = (a, n) => ((a % n) + n) % n, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), To = () => RS.Tonal, Mi = () => RS.Mind;
// new tunings (weight 0: never drawn at birth, so existing worlds keep their ohms' scales; only a gamelan jam uses them)
if (To() && !To().CAT.some(e => e.name === 'Slendro')) { const add = (name, cents, fam, bright) => To().CAT.push({ i: To().CAT.length, name, cents, fam, bright, w: 0, period: 1200 });
  add('Slendro', [0, 231, 474, 717, 955], 'gamelan', .2); add('Pelog', [0, 120, 270, 540, 670, 785, 950], 'gamelan', -.4); To().TUNING.gamelan = 'slendro / pelog (non-equal, gamelan)'; }
if (To() && St && !To().CAT.some(e => e.name === St.SCALES[0][0])) for (const [name, cents, fam, bright] of St.SCALES) To().CAT.push({ i: To().CAT.length, name, cents, fam, bright, w: 0, period: 1200 });   /* v0.8b6: the new styles' tunings, weight 0 */
const M = Mi() && Mi().METERS; if (M) Object.assign(M, { '12/8': [6, 6, 6, 6], '9/8': [4, 4, 4, 6], '11/8': [4, 4, 6, 4, 4], rupak: [12, 8, 8], jhaptal: [8, 12, 8, 12], adi: [16, 8, 8], compas: [6, 6, 4, 4, 4] }); if (M && St) for (const k in St.METERS) if (!M[k]) M[k] = St.METERS[k];
// raga detail (degree indices in the 7-note scale): ascent skips, descent skips, vadi / samvadi, a characteristic phrase (pakad)
Tr.RAGA = { 'Raga Yaman': { up: [0, 4], dn: [], vadi: 2, sam: 6, pakad: [-1, 1, 2, 1, 0] }, 'Raga Bhairav': { up: [], dn: [], vadi: 5, sam: 1, pakad: [2, 3, 5, 5, 4] },
  'Raga Kafi': { up: [], dn: [], vadi: 4, sam: 0, pakad: [0, 0, 1, 1, 2, 3, 4] }, 'Raga Todi': { up: [4], dn: [], vadi: 5, sam: 2, pakad: [5, 6, 7, 8, 9, 8, 7] } };
// the traditions: scales it uses, its rhythm cycle (meter + cycle length in bars + where it lands), harmony, swing, texture
Tr.T = {}; for (const k of Object.keys(St.P)) Tr.T[k] = St.engine(k);   /* v0.7 rules unchanged for the 14 old traditions (cells resolve to the same steps) */
Tr.FAM = { raga: 'hindustani', maqam: 'maqam', '24tet': 'maqam', japanese: 'japan', blues: 'blues', bebop: 'blues', gamelan: 'gamelan', dastgah: 'dastgah', makam: 'makam', chinese: 'china', overtone: 'overtone' };
// a tradition's rules by key: real styles, their variants (dub / house) and generated cultures (rebuilt from the id, never saved)
Tr.D = t => Tr.T[t] || (t && /^g:/.test(t) && (Tr.T[t] = St.gen(t))) || null;
Tr.Dj = E => (E.trVar && Tr.T[E.trVar]) || Tr.D(E.trad);
Tr.voiceLike = c => !!(c && c.P && RS.Inst && RS.Inst.identity(c.P, c.g) === 'tract');   /* Q153: overtone singing only from voice-like bodies */
Tr.blend = Sf => Sf._trB || (Sf._trB = St.blend(Sf.useed || 0, Sf.key || '', (Sf.body && Sf.body.name) || ''));
Tr.WORLD = ['carnatic', 'wafrica', 'cuban', 'bossa', 'aksak', 'flamenco', 'celtic', 'andean', 'gamelan'];
// an ohm's own leaning: its scale family decides when it has one; diatonic / other ohms are mostly western, with a light nudge
// from the world (each world favours one tradition). Experience (exp.tx) adds weight: well-travelled ohms carry traditions.
Tr.world = Sf => Sf._trW || (Sf._trW = St.top(Tr.blend(Sf)) || Tr.WORLD[RS.hash('tradw', Sf.key || '', Sf.useed || 0, (Sf.body && Sf.body.name) || '') % Tr.WORLD.length]);   /* v0.8b6: the planet's leading real culture */
Tr.lean = (Sf, c) => { if (c.trad) return c.trad; const m = c.mind, S = (m && (m.sysOwn || m.sysBase || m.sys)) || null, f = S && S.fam, nm = S && S.name; let t = Tr.FAM[f];
  if (!t && nm === 'Phrygian dominant') t = 'flamenco'; if (t === 'overtone' && !Tr.voiceLike(c)) t = null;
  if (!t) { const r = (RS.hash('tradc', c.id) % 1000) / 1000, bl = Tr.blend(Sf); t = r < bl.pull ? St.pick(bl, (RS.hash('tradb', c.id) % 1000) / 1000, k => k !== 'overtone' || Tr.voiceLike(c)) || 'western' : 'western'; } return (c.trad = t); };   /* v0.8b6: drawn from the planet's culture blend */
// consensus at jam formation: leaning votes (leader x2, experience adds), the winner is the jam's tradition
Tr.vote = (Sf, members, lead) => { const v = {}; for (const c of members) { if (!c.mind) continue; if (c._inhP && RS.Exp) RS.Exp.inheritFrom(Sf, c, c._inhP); const t = Tr.lean(Sf, c), w = (c === lead ? 2 : 1) + (c.exp && c.exp.tx ? Math.min(2, c.exp.tx[t] || 0) : 0); v[t] = (v[t] || 0) + w; if (c.exp && c.exp.tx) for (const k in c.exp.tx) if (k !== t) v[k] = (v[k] || 0) + Math.min(1, c.exp.tx[k]) * .5; }
  let best = 'western', bw = -1; for (const k in v) { if (k === 'overtone' && !Tr.voiceLike(lead)) continue; if (v[k] > bw) { bw = v[k]; best = k; } } return best; };   /* overtone only with a voice-like leader */
Tr.sysFor = (Sf, t, own, seed) => { const D = Tr.D(t); if (!D || !D.fams && !D.names) return own; if ((D.fams && D.fams.includes(own.fam)) || (D.names && D.names.includes(own.name))) return own;
  const cand = To().CAT.filter(e => (D.names && D.names.includes(e.name)) || (D.fams && D.fams.includes(e.fam))); return cand.length ? cand[seed % cand.length] : own; };
// set up a tradition on a new jam (called from Cohere.form before anyone joins, so the harmony vocabulary is built for it)
Tr.apply = (Sf, E, members, lead) => { const t = Tr.vote(Sf, members, lead), D0 = Tr.D(t); E.trad = t; if (!D0 || t === 'western') return; const seed = RS.hash('trs', E.id, lead.id);
  if (D0.vars) { let u = (RS.hash('trv', E.id, lead.id) % 1000) / 1000; for (const x of D0.vars) { if (u < x.w) { E.trVar = x.id; break; } u -= x.w; } }   /* reggae -> sometimes dub, techno -> sometimes house */
  const D = Tr.Dj(E); E.sys = Tr.sysFor(Sf, E.trVar || t, E.sys, seed); if (D.harm === 'prog') { const pr = Tr.progs(D); E.trProg = pr.length ? (seed >>> 3) % pr.length : 0; } const mt = D.meters[seed % D.meters.length]; E.trMeter = mt; E.trCyc = (D.cyc && D.cyc[mt]) || 1; if (D.swing != null) E.swing = D.swing; else if (t !== 'blues') E.swing = Math.min(E.swing || 0, .04);
  { const Lm = lead.mind; if (Lm && M && M[mt]) { Lm._trM = Lm._trM || { meter: Lm.meter, groups: Lm.groups }; Lm.meter = mt; Lm.groups = M[mt]; Lm.genTo = null; } }
  if (D.iqa) E.groove = { low: D.iqa.low.slice(), back: D.iqa.back.slice(), time: D.iqa.time.slice() };
  if (D.raga) E.raga = Tr.RAGA[E.sys.name] || null; Sf.stats.trad = Sf.stats.trad || {}; Sf.stats.trad[t] = (Sf.stats.trad[t] || 0) + 1; (Sf.mindLog || []).push({ t: Sf.now(), k: 'trad', E: E.id, trad: t, sys: E.sys.name, meter: mt }); };
Tr.progs = D => { const h = (D._e && D._e.harm) || {}; return h.prog || (h.vamp ? [h.vamp] : []); };
// a chord from semitones (prog / vamp styles): each tone is the nearest scale degree, altered by the difference (alt, like V/V)
Tr.mkSemi = (S, semi, ty, key) => { const P = S.period || 1200, n = S.cents.length, tones = [], seen = new Set(); for (const x of St.CH[ty] || St.CH.maj) { const c = (semi + x) * 100, q = To().degOfCents(S, c); if (seen.has(q.d)) continue; seen.add(q.d); tones.push({ d: q.d, a: Math.round(c - To().cents(S, q.d)) }); }
  const alt = {}; for (const t of tones) if (t.a) alt[md(t.d, n)] = t.a; return { id: key, name: key, fn: semi === 0 ? 'T' : semi === 7 || semi === 11 ? 'D' : 'S', r: tones[0].d, tones, cents: tones.map(t => md(To().cents(S, t.d) + t.a, P)), alt }; };
const mk3 = (S, r, alt3) => { const tr = To().chord(S, r, 'triad'), tones = tr.map((d, i) => ({ d, a: i === 1 ? alt3 : 0 })), n = S.cents.length, P = S.period || 1200, alt = {}; alt[md(tr[1], n)] = alt3; return { id: 'Fl:I', name: 'Fl:I', fn: 'T', r: tr[0], tones, cents: tones.map(t => md(To().cents(S, t.d) + (t.a || 0), P)), alt }; };   /* the major tonic of the Phrygian cadence (raised 3rd) */
// leaving a jam gives the leader its own meter back
{ const Co = RS.Cohere; if (Co && !Co._trL) { const lv = Co.leave; Co.leave = (Sf, c) => { const m = c.mind; if (m && m._trM && m.E) { m.meter = m._trM.meter; m.groups = m._trM.groups; m.genTo = null; m._trM = null; } return lv(Sf, c); }; Co._trL = 1; } }
// meter: the jam's members (and anyone joining) take the tradition's cycle
Tr.meter = (E, m) => { if (!E || !E.trMeter || !M || !M[E.trMeter]) return; if (m.meter !== E.trMeter) { m.meter = E.trMeter; m.groups = M[E.trMeter]; m.genTo = null; } };
// harmony: a tradition's own chord for this bar (called by Harm.propose); null = the jam's usual song
Tr.BLUES = [0, 0, 0, 0, 3, 3, 0, 0, 4, 3, 0, 4]; Tr.ANDAL = [3, 2, 1, 'Fl:I'];
Tr.chord = (E, hb, bi) => { const D = Tr.Dj(E); if (!D || !D.harm || !hb) return null; const byRoot = r => { let f = null; for (const k in hb.V) { const c = hb.V[k]; if (!c.tones || /[/:]/.test(k) || md(c.tones[0].d, n) !== md(r, n)) continue; if (c.tones.length === 3) return k; f = f || k; } return f; }, n = E.sys.cents.length;
  if (E.fuse && E.fuse.harm === false) return null; if (D.harm === 'drone') return byRoot(0); if (D.harm === 'blues12') return byRoot(Tr.BLUES[md(bi, 12)]);
  if (D.harm === 'andalusian') { if (!hb.V['Fl:I']) hb.V['Fl:I'] = mk3(E.sys, 0, 100); const x = Tr.ANDAL[md(bi, 4)]; return typeof x === 'string' ? (hb.V[x] ? x : byRoot(0)) : byRoot(x); }
  if (D.harm === 'prog') { const pr = Tr.progs(D)[E.trProg || 0]; if (!pr || !pr.length) return byRoot(0); const [semi, ty] = pr[md(bi, pr.length)], key = 'Tp:' + semi + ':' + ty; if (!hb.V[key]) hb.V[key] = Tr.mkSemi(E.sys, semi, ty, key); return key; } return null; };   /* v0.8b6: ':' keeps byRoot away from these */
// where the cycle lands (sam / gong / clave start / compas end) - bar index within the cycle
Tr.cycBar = (E, m, bar) => { const S = E.song, bi = S && S.at != null ? bar - S.at : bar; return md(bi, E.trCyc || 1); };
// the rules on one generated bar (after the jam / drum grammar made it). out = this member's notes for the bar
Tr.bar = (Sf, m, bar, out) => { const E = m.E, c = m.c; if (!E || !E.trad || E.trad === 'western' || !c || !out) return out; const D = Tr.Dj(E); if (!D) return out; Tr.meter(E, m);
  const L = Mi().barLen(m), n = m.sys.cents.length, role = m.role || '', cb = Tr.cycBar(E, m, bar), land = cb === 0, perc = m.perc > .55, lead = E.leader === c || role === 'melody', tonal = !perc && role !== 'listen' && !/^pulse/.test(role), r = RS.rng(RS.hash('trb', c.id, bar));
  if (lead && cb === 0) { const rate = m.bpm / 60 * 4; E.landT = Sf.now() + Math.max(0, bar * L - m.pos) / rate; }   /* when the cycle lands (for the L ripple) */
  let o = out; const F = E.fuse && Tr.D(E.fuse.with), R = F && E.fuse.rhythm ? F : D, Dm = F && !E.fuse.rhythm ? Object.assign({}, D, { gam: F.gam || D.gam, blue: F.blue || D.blue, sayr: F.sayr || D.sayr, land: F.land === 'sam' ? 'sam' : D.land }) : D;   /* fusion: the bridge brings the other tradition's rhythm layer, or its melodic ornament (gamaka / blue notes / sayr) over this one's cycle */
  // --- rhythm cycle: the landing (sam / gong / clave / compas) is accented by everyone; drum timelines
  if (perc) { o = Tr.drums(Sf, m, bar, o, R, L, cb); }
  if (land && D.land !== 'three') for (const q of o) if (q.s === 0) q.vel = Math.min(1, (q.vel || .5) * 1.25);
  if (D.land === 'three') for (const q of o) if (q.s === L / 2) q.vel = Math.min(1, (q.vel || .5) * 1.3);   /* the one-drop: weight on beat 3, not 1 */
  if (D.one) for (const q of o) if (q.s === 0) q.vel = Math.min(1, (q.vel || .5) * D.one);   /* funk: everything lands hard on the One */
  if (R.acc) for (const q of o) if (R.acc.includes(Math.round(q.s))) q.vel = Math.min(1, (q.vel || .5) * 1.3);
  if (!tonal) return o;
  // --- harmony / texture
  if (D.harm === 'drone' && (role === 'comp' || role === 'texture' || role === 'harmony')) { const Co = RS.Cohere, p = d => Co ? Co.padDeg(Sf, m, d) : d, fifth = To().degOfCents ? To().degOfCents(m.sys, 700).d : 4;   /* tanpura: Pa Sa Sa Sa(low), plucked through the bar */
    o = [{ s: 0, d: L * .45, deg: p(fifth) - n, vel: .2, drone: true, chordTone: true }, { s: Math.round(L / 4), d: L * .4, deg: p(0), vel: .2, drone: true, chordTone: true }, { s: Math.round(L / 2), d: L * .4, deg: p(0), vel: .2, drone: true, chordTone: true }, { s: Math.round(3 * L / 4), d: L * .45, deg: p(0) - n, vel: .22, drone: true, chordTone: true }]; }
  if (D.colo && role === 'bass') { o = [{ s: 0, d: L * (cb === 0 ? 2.5 : .8), deg: (cb === 0 ? -2 * n : -n), vel: cb === 0 ? .9 : .55, gong: cb === 0, colo: true }]; if (cb !== 0) o.push({ s: Math.round(L / 2), d: L * .4, deg: -n + Math.min(n - 1, 2), vel: .45, colo: true }); }   /* gong ends the gongan, kenong / kempul mark it */
  if (D.tumbao && role === 'bass') { const root = o.find(q => q.root) || o[0]; if (root) { const d0 = root.deg, d5 = d0 + (n === 7 ? 4 : 3); o = [{ s: 6, d: 2, deg: d5, vel: .7, tumbao: true }, { s: 12, d: 3, deg: d0, vel: .75, tumbao: true }]; } }   /* tumbao: the 'and' of 2 and beat 4, no downbeat */
  if (D.montuno && role === 'comp') { const ch = m.curChord || [0, 2, 4], p = d => RS.Cohere.padDeg(Sf, m, d); o = [0, 3, 6, 8, 10, 12, 14].filter(s => s < L).map((s, i) => ({ s, d: 1.5, deg: p(ch[i % 2 ? 2 : 0]) + (i % 2 ? 0 : n), vel: .26, chordTone: true, montuno: true })); }
  if (R.bossa && role === 'bass') { const root = o.find(q => q.root) || o[0]; if (root) o = [{ s: 0, d: 5, deg: root.deg, vel: .7 }, { s: 6, d: 2, deg: root.deg + (n === 7 ? 4 : 3), vel: .6 }, { s: 8, d: 5, deg: root.deg, vel: .65 }, { s: 14, d: 2, deg: root.deg + (n === 7 ? 4 : 3), vel: .55 }].filter(q => q.s < L); for (const q of o) q.bossa = 1; }   /* v0.8a7: tagged so Q never moves the partido-alto bass */
  if (R.bossa && role === 'comp') { const ch = m.curChord || [0, 2, 4], p = d => RS.Cohere.padDeg(Sf, m, d), pat = md(bar, 2) ? [0, 3, 6, 10, 13] : [0, 3, 6, 10]; o = []; for (const s of pat) if (s < L) ch.slice(0, 3).forEach((d, i) => o.push({ s, d: 2, deg: p(d), vel: .2 - i * .03, chordTone: true, bossa: 1 })); }
  if (D.kotekan && (role === 'comp' || role === 'counter' || role === 'answer')) { const ks = E.members.filter(q => q.mind && q.mind.perc <= .55 && /^(comp|counter|answer)$/.test(q.mind.role || '')).slice(0, 2), ki = ks.indexOf(c); if (ki >= 0 && ks.length === 2) { const age = Sf.now() - (E.t0 || 0), step = age > 60 ? 1 : 2, root = (m.curChord || [0])[0], pat = [0, 1, 2, 1], base = Mi().hz(Sf, m, root) > 500 ? root - n : root; o = []; for (let s = ki * step, k = 0; s < L; s += step * 2, k++) o.push({ s, d: step, deg: base + pat[k % 4] + ki, vel: .3, kotekan: ki ? 'sangsih' : 'polos' }); E.irama = step === 1 ? 2 : 1; } }   /* interlocking: polos on the even steps, sangsih on the odd; irama doubles the density once the jam has played a while */
  if (D.bassC && role === 'bass') o = Tr.bassCell(Sf, m, bar, o, D, L, n, cb, r);
  if (D.compC && role === 'comp') o = Tr.compCell(Sf, m, bar, o, D, L, n, cb);
  // --- melody rules
  if (lead) o = Tr.melody(Sf, m, bar, o, Dm, L, n, cb, r);
  if (D.het && !lead && (role === 'counter' || role === 'answer' || role === 'harmony') && E._trLead && E._trLead.bar >= bar - 1) { o = E._trLead.notes.map(q => Object.assign({}, q, { s: q.s + (r() < .5 ? 0 : 1), deg: q.deg + (r() < .25 ? (r() < .5 ? 1 : -1) : 0), vel: (q.vel || .5) * .55, het: true })).filter(q => q.s < L); }   /* heterophony: the same line, slightly varied, a hair late */
  if (D.call && !lead && /^(counter|answer|comp)$/.test(role) && md(bar, 2) === 1 && E._trLead) { o = E._trLead.notes.slice(0, 4).map((q, i, a) => Object.assign({}, q, { deg: i === a.length - 1 ? 0 : q.deg, vel: (q.vel || .5) * .7, resp: true })); }   /* response: the call back, ending home */
  if (D.ma && !lead && md(bar, 4) === 2) o = [];   /* ma: the space after a phrase is left empty */
  return o; };
Tr.melody = (Sf, m, bar, o, D, L, n, cb, r) => { const E = m.E; let t = o.filter(q => q.deg != null && !q.perc).sort((a, b) => a.s - b.s);
  if (D.ma && md(bar, 4) === 2) { E._trLead = { bar, notes: [] }; return []; }   /* ma: silence between phrases */
  if (D.call && md(bar, 2) === 1) { return o.filter(q => q.perc); }   /* the leader calls on even bars; the others answer */
  if (D.mot && md(bar, 4) === 1) { const ph = Tr.motif(E, D, bar); if (ph && ph.length) { const step = Math.max(1, Math.floor(L / ph.length)); t = ph.slice(0, L).map((d, i) => ({ s: Math.min(L - 1, i * step), d: step, deg: d, vel: .55, motif: true, sty: 1 })); o = o.filter(q => q.perc).concat(t); } }   /* v0.8b6: the style's own phrase */
  const Rg = E.raga; if (Rg && n === 7) { if (md(bar, 8) === 1 && Rg.pakad) { const st = []; let a = 0; for (const g of m.groups) { st.push(a); a += g; } const step = Math.max(1, Math.floor(L / Rg.pakad.length)); t = Rg.pakad.map((d, i) => ({ s: Math.min(L - 1, i * step), d: step, deg: d, vel: .55, pakad: true })); o = t.slice(); }   /* the characteristic phrase */
    for (let i = 1; i < t.length; i++) { const a = t[i - 1].deg, q = t[i]; if (q.deg > a) { let g = 0; while (Rg.up.includes(md(q.deg, 7)) && g++ < 3) q.deg++; } else if (q.deg < a) { let g = 0; while (Rg.dn.includes(md(q.deg, 7)) && g++ < 3) q.deg--; } }   /* aroha / avaroha */
    const lg = t.slice().sort((a, b) => b.d - a.d)[0]; if (lg) { const oc = Math.floor(lg.deg / 7) * 7, tg = [Rg.vadi, Rg.sam].map(x => oc + x).sort((x, y) => Math.abs(x - lg.deg) - Math.abs(y - lg.deg))[0]; lg.deg = tg; lg.vadi = true; } }   /* the longest note rests on the vadi / samvadi */
  if (D.sayr) { const band = [[0, 3], [2, 5], [3, 7], [0, 4]][md(bar, 4)]; for (const q of t) { const oc = Math.floor(q.deg / n) * n; let d = q.deg - oc; if (d < band[0]) d = band[0] + md(d, 2); if (d > band[1]) d = band[1] - md(d, 2); q.deg = oc + clamp(d, 0, n - 1); } }   /* sayr: lower jins, up to the ghammaz, the upper register, home */
  if (D.land === 'sam' || D.land === 'tonic' || D.land === 'gong') { if (cb === 0 && t.length) { const q0 = t[0]; if (q0.s <= 1) { q0.s = 0; q0.deg = Math.round(q0.deg / n) * n; q0.sam = true; } else { const nq = { s: 0, d: Math.min(4, q0.s), deg: Math.round(q0.deg / n) * n, vel: .6, sam: true }; o.push(nq); t.unshift(nq); } } }   /* the cycle lands on Sa / the tonic */
  if (D.gam || D.blue) { const gi = Tr.gamInst(m.c); for (const q of t) { if (D.gam && q.d >= 2 && r() < D.gam) { q.from = Mi().hz(Sf, m, q.deg + (r() < .6 ? 1 : -1)); q.inst = gi; q.gamaka = true; } else if (D.blue && n === 7 && md(q.deg, 7) === 2 && r() < .6) { q.from = Mi().hz(Sf, m, q.deg) * Math.pow(2, -.75 / 12); q.inst = gi; q.blue = true; } } }   /* gamaka: slide into the note from a neighbour; blue note: bend up to the 3rd */
  if (D.grace || D.bend || D.tahrir || D.antic || D.ovt) { const gi = Tr.gamInst(m.c), fi = Tr.graceInst(m.c), add = [];   /* v0.8b6 ornaments (new styles only) */
    for (const q of t) { if (q.from) continue; if (D.antic && q.s > 0 && q.s % 4 === 0 && r() < D.antic) { q.s -= 1; q.antic = true; q.sty = 1; }
      if (D.tahrir && q.d >= 3 && r() < D.tahrir) { const k = Math.min(3, Math.floor(q.d) - 1); for (let i = 1; i <= k; i++) add.push({ s: q.s + i, d: 1, deg: q.deg + (i % 2), vel: (q.vel || .5) * .5, tahrir: true, sty: 1 }); q.d = 1; q.tahrir = true; q.sty = 1; continue; }   /* tahrir: fast yodel flips on a long note */
      if (D.grace && q.d >= 2 && r() < D.grace) { q.from = Mi().hz(Sf, m, q.deg + 1); q.inst = fi; q.grace = true; q.sty = 1; } else if (D.bend && q.d >= 2 && r() < D.bend) { q.from = Mi().hz(Sf, m, q.deg) * Math.pow(2, -1 / 12); q.inst = gi; q.bend = true; q.sty = 1; } }
    if (add.length) { const tk = new Set(t.map(q => Math.round(q.s))); for (const a of add) if (a.s < L && !tk.has(a.s)) { o.push(a); t.push(a); } }
    if (D.ovt) for (const q of t) { q.deg += n; q.ovt = true; q.sty = 1; } }   /* overtone: the tune rides the harmonic series an octave above the drone */
  E._trLead = { bar, notes: t.map(q => ({ s: q.s, d: q.d, deg: q.deg, vel: q.vel })) }; return o; };
// a motif of the style as scale degrees of the jam's tuning (semitones or cents -> nearest degree); makam picks the seyir of its makam
Tr.motif = (E, D, bar) => { const X = (D._e ? D : Tr.Dj(E))._e, ms = X ? X.motifs.filter(x => D.mot.includes(x.k)) : []; if (!ms.length) return null; let M = null;
  if (D.motBy === 'scale') { const w = (E.sys.name || '').split(' ').pop().toLowerCase(); M = ms.find(x => x.k.startsWith(w)); } M = M || ms[md(Math.floor(bar / 4), ms.length)];
  return (M.c || M.st.map(x => x * 100)).map(c => To().degOfCents(E.sys, c).d); };
Tr.graceInst = c => c._grI || (c._grI = Object.assign({}, c.P.inst, { glT: .035 }));
// bass on the style's cell: walking chord tones (jazz), a motif (funk / reggae / acid), or root + fifth (samba surdo)
Tr.bassCell = (Sf, m, bar, o, D, L, n, cb, r) => { const B = D.bassC, X = D._e || Tr.Dj(m.E)._e; if (!X || !X.cells[B.cell]) return o; const root = o.find(q => q.root) || o.find(q => q.deg != null && !q.perc), d0 = root ? root.deg : -n, S = m.sys;
  const cellPts = nm => { const bs = St.bars(X.cells[nm]); return St.place(bs[md(cb, bs.length)], St.gridOf(X, nm), L); };
  let pts = cellPts(B.cell).map(s => s + (B.off || 0)).filter(s => s < L); const p2 = B.cell2 ? cellPts(B.cell2) : [], fifth = To().degOfCents(S, 700).d;
  const all = [...new Set(pts.concat(p2))].sort((a, b) => a - b); if (!all.length) return o; const mot = B.mot && X.motifs.find(x => x.k === B.mot), mv = mot ? (mot.c || mot.st.map(x => x * 100)).map(c => To().degOfCents(S, c).d) : null;
  const walk = n >= 7 ? [0, 2, 4, 5] : [0, 1, 2, 3];
  return all.map((s, i) => { const nx = i + 1 < all.length ? all[i + 1] : L, deg = B.walk ? d0 + (i === all.length - 1 && r() < .5 ? -1 : walk[i % 4]) : mv ? d0 + mv[i % mv.length] : p2.includes(s) && !pts.includes(s) ? d0 + fifth - n : d0;
    const q = { s, d: Math.max(.5, Math.min(4, nx - s) * (B.walk ? .95 : .8)), deg, vel: (s === 0 ? .75 : .62) * (B.deep ? 1.1 : 1), bassC: true, sty: 1 }; if (B.glide && i && r() < .4) { q.from = Mi().hz(Sf, m, all.length && mv ? d0 + mv[(i - 1) % mv.length] : d0); q.inst = Tr.gamInst(m.c); } return q; }); };
// comp stabs on the style's cell (skank / scratch / charleston / partido alto / house stab); dub echoes the chops
Tr.compCell = (Sf, m, bar, o, D, L, n, cb) => { const C = D.compC, X = D._e || Tr.Dj(m.E)._e, nm = C.alt && md(bar, 2) ? C.alt : C.cell; if (!X || !X.cells[nm]) return o; const bs = St.bars(X.cells[nm]), pts = St.place(bs[md(cb, bs.length)], St.gridOf(X, nm), L);
  const ch = m.curChord || [0, 2, 4], p = d => RS.Cohere ? RS.Cohere.padDeg(Sf, m, d) : d, out = [];
  for (const s of pts) { ch.slice(0, 3).forEach((d, i) => out.push({ s, d: C.len, deg: p(d), vel: .22 - i * .03, chordTone: true, compC: true, sty: 1 }));
    if (D.echo) for (const [k, f] of [[3, .5], [6, .25]]) if (s + k < L && !pts.includes(s + k)) ch.slice(0, 2).forEach((d, i) => out.push({ s: s + k, d: C.len, deg: p(d), vel: (.2 - i * .03) * f, chordTone: true, echo: true, sty: 1 })); }
  return out; };
Tr.gamInst = c => c._gamI || (c._gamI = Object.assign({}, c.P.inst, { glT: Math.max(.07, c.P.inst.glT || 0) }));
Tr.drums = (Sf, m, bar, o, R, L, cb) => { const role = m.role || '', all = role === 'pulse:all' || role === 'pulse', hit = (s, stroke, vel, k) => Object.assign({ s, d: .5, deg: 0, vel, stroke, perc: true, db: s === 0 }, k), dy = Math.max(.3, Math.min(1, o.reduce((a, q) => Math.max(a, q.vel || 0), 0) || .6));
  const timeline = (pts, stroke, tag) => { for (const s of pts) if (s < L && !o.some(q => Math.abs(q.s - s) < .3 && q.stroke === stroke)) o.push(hit(s, stroke, dy * (s === 0 ? .7 : .5), { [tag]: true })); };
  if (R.bell) { if (role === 'pulse:time' || role === 'pulse:colour') { o = o.filter(q => q.stroke === 'ring' && role === 'pulse:colour'); timeline(R.bell, 'mute', 'bell'); } else if (all) { o = o.filter(q => q.stroke !== 'mute' && q.stroke !== 'ghost'); timeline(R.bell, 'mute', 'bell'); } }   /* the 12/8 standard bell */
  if (R.cross && role === 'pulse:back') { o = []; for (let s = 0; s < L; s += 4) o.push(hit(s, 'slap', dy * (s === 0 ? .8 : .55), { cross: 2 })); }   /* hands in 4 (2 per 3/4 half) against the feet in 3 */
  if (R.cross && (role === 'pulse:low' || all)) { o = o.filter(q => q.stroke !== 'bass'); for (let s = 0; s < L; s += 6) o.push(hit(s, 'bass', dy * (s === 0 ? 1 : .7), { cross: 3 })); }
  if (R.clave) { const cl = R.clave[md(cb, 2)]; if (role === 'pulse:time' || role === 'pulse:colour') { o = []; timeline(cl, 'mute', 'clave'); } else if (all) { o = o.filter(q => q.stroke !== 'mute' && q.stroke !== 'ghost'); timeline(cl, 'mute', 'clave'); } }   /* son clave 3-2 over two bars */
  if (R.colo && role.startsWith('pulse')) o = o.filter(q => Math.round(q.s) % 4 === 0);
  if (R.tl) { const X = R._e || {}, cs = X.cells || {}, T = R.tl, pts = spec => { const ns = [].concat(spec).filter(k => cs[k]); if (!ns.length) return []; const nm = ns.find(k => St.gridOf(X, k) === L) || ns[0], bs = St.bars(cs[nm]); return St.place(bs[md(cb, bs.length)], St.gridOf(X, nm), L); };   /* v0.8b6: the style's drum cells */
    const put = (spec, stroke, v, drop) => { o = o.filter(q => !drop.includes(q.stroke)); for (const s of pts(spec)) if (!o.some(q => Math.abs(q.s - s) < .3 && q.stroke === stroke)) o.push(hit(s, stroke, dy * (s === 0 ? v : v * .72), { tl: true, sty: 1 })); };
    if (T.low && (role === 'pulse:low' || all)) put(T.low, 'bass', 1, ['bass']);
    if (T.back && (role === 'pulse:back' || all)) { put(T.back, 'slap', .85, ['slap']); if (T.ghost) put(T.ghost, 'ghost', .4, []); }
    if (T.time && (role === 'pulse:time' || all || (role === 'pulse:colour' && !T.colour))) put(T.time, 'mute', .6, ['mute', 'ghost']);
    if (T.colour && role === 'pulse:colour') put(T.colour, 'ring', .55, ['ring', 'mute']); }   /* gamelan drums (kendhang) keep to the frame */
  return o; };
// L hint (no text): a watched jam playing a tradition breathes a soft ripple out from its centre each time its cycle lands (sam / gong /
// clave / compas / 12th bar), so the cycle can be seen as well as heard; a fused jam sends a second-coloured ripple from the bridge ohm.
// Fades after a few traditions have been seen (mods.guide.tradN, same storage as the other hints - S43 unchanged).
Tr.HUE = { hindustani: '255,190,120', carnatic: '255,170,110', maqam: '230,200,140', gamelan: '200,220,170', wafrica: '255,200,150', cuban: '255,180,160', bossa: '200,230,210', aksak: '220,190,230', flamenco: '255,150,130', japan: '210,225,255', blues: '170,190,255', celtic: '180,230,190', andean: '230,215,170' }; for (const k of St.REAL) if (!Tr.HUE[k] && k !== 'western') Tr.HUE[k] = St.hue(k);
Tr.hue = t => Tr.HUE[t] || (Tr.D(t) && Tr.D(t)._e && Tr.D(t)._e.hue) || null;
Tr.draw = (ctx, Sf, j) => { const E = j.E; if (!E || !E.trad || E.trad === 'western' || !RS.Exp.inView(Sf, j.leader)) return; const g = Sf.mods && (Sf.mods.guide = Sf.mods.guide || {}); if (g && !E._seen) { E._seen = 1; g.tradN = (g.tradN || 0) + 1; }
  const used = (g && g.tradN) || 0, fa = Math.max(.25, 1 - Math.max(0, used - 4) / 6), tn = Sf.now(), [x, y] = RS.Jam.center(j), R = 46 + 14 * Math.sqrt(j.members.length), hue = Tr.hue(E.trad) || '255,236,200', gen = /^g:/.test(E.trad);
  const ring = (cx, cy, u, col, a) => { ctx.strokeStyle = 'rgba(' + col + ',' + a * (1 - u) * fa + ')'; ctx.lineWidth = 2 * (1 - u) + .5; ctx.beginPath(); ctx.arc(cx, cy, R * (.55 + .9 * u), 0, 6.283); ctx.stroke(); };
  ctx.save(); ctx.setLineDash(gen ? [7, 6] : []); if (E.landT != null) { const u = (tn - E.landT) / 1.4; if (u >= 0 && u < 1) ring(x, y, u, hue, .3); }
  if (E.fuse) { const b = j.members.find(c => c.id === E.fuse.by), u = ((tn - E.fuse.t) % 4) / 1.6; if (b && tn - E.fuse.t < 20 && u < 1) ring(b.x, b.y, u * .6, Tr.hue(E.fuse.with) || hue, .26); }
  ctx.restore(); };
// fusion: two traditions only fuse when an experienced ohm in the jam has played both and the jam stays matched (E gate)
Tr.BRIDGE = .6;
Tr.fuseTick = (Sf, j) => { const E = j.E; if (!E || !E.trad || E.fuse) return; const others = new Set(); for (const c of j.members) { if (!c.mind) continue; const t = Tr.lean(Sf, c); if (t !== E.trad) others.add(t); } if (!others.size) return;
  if ((E.matchBars || 0) < 4 || E.phase !== 'settled') return; for (const c of j.members) { const tx = c.exp && c.exp.tx; if (!tx || (tx[E.trad] || 0) < Tr.BRIDGE) continue; for (const o of others) if ((tx[o] || 0) >= Tr.BRIDGE && o !== 'western') { if (RS.Teacher) RS.Teacher.fused(c); E.fuse = { with: o, by: c.id, rhythm: Tr.D(o) && (Tr.D(o).bell || Tr.D(o).clave || Tr.D(o).cross || Tr.D(o).tl) ? o : null, t: Sf.now() }; Sf.stats.trFuse = (Sf.stats.trFuse || 0) + 1; (Sf.mindLog || []).push({ t: Sf.now(), k: 'fuse', E: E.id, a: E.trad, b: o, by: c.id }); return; } } };
})(typeof window !== 'undefined' ? window : globalThis);
