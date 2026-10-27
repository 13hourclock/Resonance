'use strict';
// COHESION GLUE (v0.3.1 musicality reset). Still no central composer: when ohms converse, the most confident one PROPOSES a shared musical
// frame from its OWN mind (tonic + mode, tempo + meter + swing, an 8-bar chord progression from its harmonic habit, a groove cell from its
// rhythm grammar) and the others ADOPT it by conversation: they converge onto its pulse within a couple of bars, then lock (same tempo,
// aligned downbeats), map their playing onto the shared tonic + scale (their own genome, learned scale and motifs are untouched and come back
// when they leave), follow the same chord on the same downbeat, align phrases to the 4/8-bar grid and cadence together. Roles are soft but
// musical: the lead sings the melody (targets chord tones on strong beats), the lowest ohm anchors chord ROOTS on downbeats, mid ohms pad the
// chord on changes (and leave space while the lead is busy), percussive ohms play the shared groove (the second interlocks). Near the camera
// at most CAP ohms are fully audible; the rest hum very softly or wait. Environment = a seed only (initial tempo pull, see Mind.make).
// v0.3.1b: CHORDS are no longer a shared list. They live in each ohm's harmonic brain (harmony.js): the bass proposes, the others follow by ear.
(function (G) { const RS = G.RS, Co = RS.Cohere = {}, Hm = () => RS.Harm, Mi = () => RS.Mind, To = () => RS.Tonal; const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), md = (a, n) => ((a % n) + n) % n;
Co.CAP = 6; Co.TON = 4; Co.DRUMS = 3; Co.AUD = 6;   /* v0.3.2 voice cap: <= 6 playing roles in a frame (<= 4 tonal, <= 3 drums), <= 6 fully audible ohms near the camera */ Co.PHRASE = 8;
Co.conf = c => { const m = c.mind, b = m.bold == null ? .5 : m.bold; return m.lead * .6 + b * .3 + m.stub * .2 + (c.P.life.leadership || .5) * .3 + (m.perc > .55 ? -.3 : 0); };   // a melodic, bold, stubborn leader proposes
Co.groove = (Sf, m) => { const L = Mi().barLen(m), C = Mi().CELLS[m.grammar]; if (C && L === 16) return { low: C.low.slice(), back: C.back.slice(), time: C.time.slice() }; const st = []; let a = 0; for (const g of m.groups) { st.push(a); a += g; }
  return { low: [0, st[Math.floor(st.length / 2)] || 0].filter((x, i, A) => A.indexOf(x) === i), back: st.slice(1), time: Array.from({ length: Math.floor(L / 2) }, (_, i) => i * 2) }; };
/* v0.8a4 C: proposer pick = highest Co.conf; ONLY when the top two are within .05 does the one closer to the area's remembered key propose (the consensus rule is unchanged) */
Co.TIE = .05; Co.pick = (Sf, ms) => { const s = ms.slice().sort((a, b) => Co.conf(b) - Co.conf(a)); if (s.length < 2 || Co.conf(s[0]) - Co.conf(s[1]) > Co.TIE || !Sf.region || !Sf.region.keyAt) return s[0];
  const rk = Sf.region.keyAt(s[0].x, s[0].y); if (!rk || !RS.Field) return s[0]; const dk = c => { const m = c.mind, S = m.sysOwn || m.sys; return Math.abs(RS.Field.wc((m.tonicC || 0) - rk.tc)) + (S && (S.name || S.id) === rk.sys ? 0 : 50); };
  const w = dk(s[1]) < dk(s[0]) ? s[1] : s[0]; if (w !== s[0]) Sf.stats.regionTie = (Sf.stats.regionTie || 0) + 1; return w; };
Co.form = (Sf, members) => { const lead = Co.pick(Sf, members), Lm = lead.mind, own = Lm.sysOwn || Lm.sys, perc = members.find(c => c.mind.perc > .55);
  const E = { id: 'E' + (Sf.coN = (Sf.coN || 0) + 1), leader: lead, sys: own, tonicC: Lm.tonicC, swing: clamp(Lm.swing, 0, .14), members: [], t0: Sf.now(), phase: 'seeking', hist: [] };
  E.half = !!(perc || lead).mind.half; E.groove = Co.groove(Sf, perc ? perc.mind : Lm); if (E.half && Mi().barLen(Lm) === 16) E.groove.back = [8]; E.grooveFrom = (perc || lead).id; if (RS.Trad) RS.Trad.apply(Sf, E, members, lead);   /* v0.7 G: the jam settles on a tradition by consensus */
  for (const c of members) { Co.join(Sf, E, c); if (c.mind.hb) c.mind.hb.listen = 1; } Co.roles(Sf, E, true); if (Hm()) Hm().restore(Sf, E); Sf.stats.cohere = (Sf.stats.cohere || 0) + 1; return E; };
Co.join = (Sf, E, c) => { const m = c.mind; if (!m || m.E === E) return; if (m.E) Co.leave(Sf, c); m.sysOwn = m.sys; m.bpmPref = m.bpmPref || m.bpm; m.E = E; m.sys = E.sys; m.grav = To().gravity(E.sys); m.lockT = null; m.phrase = null; E.members.push(c); if (Hm()) Hm().init(Sf, m, E); if (E.phase === 'settled' && E.members.length > 2) { m.role = E.lead ? 'comp' : 'melody'; if (m.perc > .55) { m.role = 'pulse:time'; m.cellOverride = E.groove; } E.grown = (E.grown || 0) + 1; } };
Co.leave = (Sf, c) => { const m = c.mind; if (!m || !m.E) return; const E = m.E; E.members = E.members.filter(o => o !== c); m.E = null; if (m.sysOwn) { m.sys = m.sysOwn; m.grav = To().gravity(m.sys); } m.sysOwn = null; m.phrase = null; m.role = 'solo'; m.cellOverride = null; m.hb = null; m.regShift = 0; m.thin = 0; m.inten = 1;
  if (E.leader === c && E.members.length) { E.leader = Co.pick(Sf, E.members); } if (E.members.length === 1) Co.leave(Sf, E.members[0]); else if (E.members.length) Co.roles(Sf, E, true); };
// roles: lead = most melodic (the proposer if it is melodic), bass = lowest-register other tonal ohm, pads = the rest, drums = groove (+ interlock)
Co.reg = (Sf, c) => Math.log2(Mi().tonicHz(Sf, c.mind)) + (c.P.size || 20) / -80;
Co.DNI = { kit: 'pulse:all', kick: 'pulse:low', snare: 'pulse:back', hat: 'pulse:time', tom: 'pulse:colour' };
Co.drumNiche = (E, c) => { const t = c.P.inst.drum || 'kit', taken = r => E.members.some(o => o !== c && o.mind && o.mind.role === r), n = Co.DNI[t];
  if (c.P.inst.dkP && RS.Drums) return RS.Drums.niches(c.P.inst).find(x => !taken(x)) || 'listen';   /* v0.8 drum sets: take a free part this ohm can actually play */ if (!taken(n)) return n; if (!taken('pulse:time')) return 'pulse:time'; return 'listen'; };
// v0.3.2: a PAD (a texture voice, or a slow-attack sustained one) never carries a melody line: it holds chord tones instead
Co.isPad = c => { const I = c && c.P && c.P.inst; return !!I && ((RS.Inst.isTex && RS.Inst.isTex(I)) || ((I.att || 0) > .3 && (I.sus || 0) > .6)); };
Co.roles = (Sf, E, force) => { const ms = E.members.filter(c => c.mind), ton = ms.filter(c => c.mind.perc <= .55), dr = ms.filter(c => c.mind.perc > .55);
  if (E.phase === 'settled' && !force && E.lead && ms.includes(E.lead)) { for (const c of ms) if (c.mind.role === 'listen' || c.mind.role === 'solo' || !c.mind.role) { const r = c.mind.erole && c.mind.erole !== 'listen' && c.mind.erole !== 'solo' ? c.mind.erole : c.mind.perc > .55 ? Co.drumNiche(E, c) : (RS.Inst.isTex && RS.Inst.isTex(c.P.inst) ? 'texture' : 'comp'); c.mind.role = c.mind.erole = r; if (c.mind.perc > .55) c.mind.cellOverride = E.groove; } return; }   // SETTLED: the arrangement is locked (joins / leaves re-assign with force); a newcomer that finished listening takes its free niche
  const sing = ton.filter(c => !Co.isPad(c)); let lead = ton.includes(E.leader) && (!Co.isPad(E.leader) || !sing.length) ? E.leader : (sing.length ? sing : ton).slice().sort((a, b) => RS.Jam.fit(b, 'melody') - RS.Jam.fit(a, 'melody'))[0]; const rest = ton.filter(c => c !== lead).sort((a, b) => Co.reg(Sf, a) - Co.reg(Sf, b));
  const set = (c, r) => { c.mind.role = r; c.mind.erole = r; }; if (lead) set(lead, 'melody'); if (rest.length) set(rest[0], 'bass');
  { const up = rest.slice(1); let comp = 0; up.forEach((c, i) => { const tx = RS.Inst.isTex && RS.Inst.isTex(c.P.inst); if (i >= Co.TON - 2) set(c, 'listen'); else if (tx && (comp || up.some(o => o !== c && !RS.Inst.isTex(o.P.inst)))) set(c, 'texture'); else { set(c, 'comp'); comp++; } }); }   // v0.3.2: a long sustained voice takes the TEXTURE niche when someone else holds the chords
  // v0.3.2 drums: each drummer takes the niche of its own DRUM TYPE (kick -> low, snare -> back, hats -> time, toms -> colour, a kit -> all); the
  // timekeeper (a kit, else the kick) leads the groove; a doubled type or a 4th drummer listens; a kit thins itself around specialists (mind.js)
  { const tOf = c => (c.P.inst.drum) || 'kit', ord = { kit: 0, kick: 1, snare: 2, hat: 3, tom: 4 }, NI = { kit: 'pulse:all', kick: 'pulse:low', snare: 'pulse:back', hat: 'pulse:time', tom: 'pulse:colour' };
    dr.sort((a, b) => ord[tOf(a)] - ord[tOf(b)]); const seen = {}, taken = new Set(); let nd = 0;
    // v0.8 drum sets: an ohm with its own hits takes the first niche it can play that nobody holds yet (a set of 2-3 parts may hold 'all'), so jam
    // drummers spread over low / back / time / colour; legacy (no set) drummers keep the rule above
    for (const c of dr) { const t = tOf(c), dn = c.P.inst.dkP && RS.Drums ? RS.Drums.niches(c.P.inst) : null; let r = NI[t]; if (dn) r = dn.find(x => !taken.has(x)) || 'listen'; else if (seen[t]) r = t === 'kit' && !seen.hat ? 'pulse:time' : 'listen'; if (r !== 'listen') taken.add(r); if (r !== 'listen' && ++nd > Co.DRUMS) r = 'listen'; seen[t] = 1; set(c, r); c.mind.cellOverride = E.groove; } } E.lead = lead || null; E.bass = rest[0] || null;
  E.prop = E.bass || rest[1] || lead || null;   // by convention the bass (or the pad, or the lead alone) proposes the chords
  E.pulse = dr[0] || E.bass || lead || ms[0];   // the shared pulse comes from the drums (or the bass); everyone else entrains to it
  { let k = 0; for (const c of ms) if (c.mind.role !== 'listen' && ++k > Co.CAP) set(c, 'listen'); } };
// lock to the proposer's pulse: converge (couple of bars), then hold exactly (same tempo, aligned downbeats); shared swing feel
Co.lock = (Sf, c, m, now) => { const E = m.E, L = E.pulse && E.pulse.mind && E.pulse.mind.E === E ? E.pulse : E.leader; if (!L || !L.mind) return; const Lm = L.mind;
  if (L === c) { // the pulse-setter: tempo is NEGOTIATED (slowly toward what the members prefer while seeking; held once settled); the ending ritards
    const dt = clamp(now - (m.coT || now), 0, .25); m.coT = now; if (E.phase !== 'settled') { const pref = E.members.map(o => o.mind.bpmPref || o.mind.bpm).reduce((a, b) => a + b, 0) / E.members.length; E.bpmBase = (E.bpmBase || m.bpm) + (pref - (E.bpmBase || m.bpm)) * Math.min(1, dt * .03); } else E.bpmBase = E.bpmBase || m.bpm;
    m.bpm = m.bpmT = E.bpmBase * (E.rit || 1) * (E.rit && E.rit < 1 ? 1 : 1); return; }
  if (Lm.groups !== m.groups && Lm.meter !== m.meter) { m.meter = Lm.meter; m.groups = Lm.groups; m.genTo = null; }
  const Lr = Lm.bpm / 60 * 4 * (Lm.feel || 1), Lpos = Lm.pos + Math.max(0, now - (Lm.lastT || now)) * Lr, BL = Mi().barLen(m), err = md(m.pos - Lpos + BL / 2, BL) - BL / 2;
  if (m.lockT != null || (Math.abs(err) < .15 && Math.abs(m.bpm - Lm.bpm) < .6)) { m.pos = Lpos; m.bpm = m.bpmT = Lm.bpm; m.feel = Lm.feel; if (m.lockT == null) m.lockT = now; return; }
  const dt = clamp(now - (m.coT || now), 0, .25); m.coT = now; m.bpm += (Lm.bpm - m.bpm) * Math.min(1, dt * 2.5); m.bpmT = m.bpm; m.pos -= err * Math.min(1, dt * 2); };
Co.bassDeg = (Sf, m, root) => { const n = m.sys.cents.length; let d = root; for (let i = 0; i < 6 && Mi().hz(Sf, m, d) > 150; i++) d -= n; for (let i = 0; i < 6 && Mi().hz(Sf, m, d) < 52; i++) d += n; return d; };
Co.padDeg = (Sf, m, d) => { const n = m.sys.cents.length, k = Math.pow(2, m.regShift || 0); for (let i = 0; i < 6 && Mi().hz(Sf, m, d) > 600 * k; i++) d -= n; for (let i = 0; i < 6 && Mi().hz(Sf, m, d) < 160 * k; i++) d += n; return d; };
// one bar inside a shared frame: the chord comes from THIS ohm's harmonic brain (proposer: its own choice; others: what they heard / expect)
Co.bar = (Sf, m, bar) => { const E = m.E, c = m.c, L = Mi().barLen(m), n = m.sys.cents.length, Hb = Hm(), prop = E.prop === c;
  Hb.atBar(Sf, c, m, bar); const ch = prop ? Hb.propose(Sf, c, m, bar) : (m.hb && (m.hb.cur || m.hb.pred)) || null; Hb.leadBar(Sf, c, m, bar);
  const chord = ch ? ch.tones.map(t => t.d) : To().chord(m.sys, 0, 'triad'), root = chord[0]; m.curChord = chord; m.curRoot = ch ? ch.id : root;
  const S = E.song, bi = S && S.at != null ? bar - S.at : bar, dyn = clamp((m.feelDyn || 1) * (.55 + .3 * m.mood.a) * (m.inten || 1), .25, 1), G = E.groove, r = Mi().rng(m, 'co', bar), out = []; m.cad = md(bi, 4) === 3 ? (md(bi, 8) === 7 ? 'auth' : 'half') : null;
  if (m.lockT == null && E.pulse !== c) return [];   // converging onto the pulse: listen first
  if (!Hb.mayPlay(Sf, c, m, bar)) return [];        // a newcomer listens a phrase or two; rejoins at the top of a phrase
  if ((m.restLeft || 0) > 0) { m.restLeft--; return []; }
  const plan = E.plan && E.plan.at === bar + 1 && E.plan.seen.has(c.id) ? E.plan : null, rate = m.bpm / 60 * 4, tOf = s => Sf.now() + (bar * L + s - m.pos) / rate;
  const thin = x => !(m.thin > 0 && !x.db && !x.root && r() < m.thin);
  let role = m.role; if (role === 'harmony' || (Co.isPad(c) && /^(melody|counter|answer|solo|ornament)$/.test(role))) role = 'comp';   // v0.3.2: the harmony role and any pad hold chords, never a melody bar
  switch (role) {
    case 'bass': { if (!prop) return [{ s: 0, d: L * .5, ti: 0, bassReg: true, deg: Co.bassDeg(Sf, m, root), vel: dyn * .8, db: true }];
      const d = Co.bassDeg(Sf, m, root), t0 = ch && ch.tones[0].a ? Math.pow(2, ch.tones[0].a / 1200) : 1, f0 = t0 !== 1 ? Mi().hz(Sf, m, d) * t0 : null; out.push({ s: 0, d: Math.max(4, L * .55), deg: d, f: f0, vel: dyn * .95, db: true, root: true });
      const fifth = ch && ch.tones[2] ? ch.tones[2] : { d: root + (n === 7 ? 4 : Math.min(n - 1, 3)) }; for (const s of G.low) if (s > 0 && s < L - 4) { const five = r() < .3; out.push({ s, d: 2, deg: five ? Co.bassDeg(Sf, m, fifth.d) : d, f: five ? null : f0, vel: dyn * .7, root: !five }); }
      // WALK-UP into the next chord (its own plan, or a section change it saw cued): scale steps over the last beat, a visible cue
      const nx = Hb.next(E, bar + 1), nch = nx && m.hb.V[nx], walk = (plan && plan.next !== 'drop') || (nch && nch.id !== ch.id && r() < .45);
      if (walk) { const tgt = nch ? Co.bassDeg(Sf, m, nch.tones[0].d) : Co.bassDeg(Sf, m, 0), dir = tgt >= d ? 1 : -1; const chrom = r() < .5; [3, 2, 1].forEach((k, i) => out.push(chrom && k === 1 ? { s: L - 3 + i, d: .9, deg: tgt, f: Mi().hz(Sf, m, tgt) * Math.pow(2, -dir / 12), vel: dyn * (.5 + i * .1), walk: true, approach: true } : { s: L - 3 + i, d: .9, deg: tgt - dir * k, vel: dyn * (.5 + i * .1), walk: true }));   /* v0.3.2: sometimes the last step is a CHROMATIC approach (a half step into the target) */ Hb.cue(Sf, c, 'walk', { t: tOf(L - 4), dur: 60 / m.bpm }); }
      else if (nch && nch.id !== ch.id) { const tg = Co.bassDeg(Sf, m, nch.tones[0].d), sg = Math.sign(tg - d) || 1; if (r() < .45) out.push({ s: L - 1, d: 1, deg: tg, f: Mi().hz(Sf, m, tg) * Math.pow(2, -sg / 12), vel: dyn * .55, approach: true }); else out.push({ s: L - 2, d: 2, deg: d + Math.sign(tg - d), vel: dyn * .55 }); }   // approach note: a scale step, or a chromatic half step below / above the next root
      return out.filter(thin); }
    case 'comp': { const busy = (E.leadAct || 0) >= 4, known = prop || (m.hb && m.hb.pred && m.hb.trust > .5), s0 = known ? 0 : 4;   // not sure of the next chord: let the bass speak first (beat 2)
      chord.slice(0, 3).forEach((dd, i) => out.push({ s: s0, d: L * (busy ? .9 : .7) - s0, ti: i, pad: true, deg: Co.padDeg(Sf, m, dd), vel: dyn * (.3 - i * .04), chordTone: true }));
      if (!busy) for (const s of G.back) if (s > s0 && r() < .7) out.push({ s, d: 1.5, ti: 1, pad: true, deg: Co.padDeg(Sf, m, chord[1 % chord.length]), vel: dyn * .24, chordTone: true });
      if (prop) out.push({ s: 0, d: L * .5, deg: Co.bassDeg(Sf, m, root), vel: dyn * .7, db: true, root: true });   // no low ohm: the pad also anchors the root (transposed down)
      return out.filter(thin); }
    // v0.3.2 TEXTURE: long, sparse, quiet chord tones (root or fifth, an octave up or down) that sit around the harmony, never in the melody's space
    case 'texture': { if (md(bi, 2) !== 0 || r() < .2) return []; const nx = Hb.next(E, bar + 1), nch = nx && m.hb && m.hb.V[nx], nd = nch ? nch.tones.map(t => t.d % n) : null, cand = [root, chord[2 % chord.length], chord[1 % chord.length]], keep = nd ? cand.find(x => nd.includes(x % n)) : null, tone = keep != null ? keep : cand[r() < .6 ? 0 : 1], two = keep != null;
      return [{ s: 0, d: L * (two ? 1.9 : .95), ti: 0, pad: true, tex: true, deg: Co.padDeg(Sf, m, tone) + (r() < .5 ? -n : 0), vel: dyn * .22, chordTone: true }]; }   // held over the next bar only when the tone is in the next chord too
    case 'listen': return [];
    case 'melody': { const ph = m.phrase; if (!ph || bar >= ph.start + ph.n) { if (md(bar, 4) !== 0) return []; m.rest = 0; Mi().newPhrase(Sf, m, bar); const P = m.phrase; if (P.n > 8) { P.n = 8; P.U = P.U.slice(0, 8); } P.cadAt = {}; for (let i = 0; i < P.n; i++) { const b = md(bi + i, 8); if (b === 7) P.cadAt[i] = 'auth'; else if (b === 3) P.cadAt[i] = 'half'; } }
      m.phrase.prog = Array.from({ length: m.phrase.n }, (_, i) => { const lp = prop && E.song && E.song.at != null ? E.song.secs[E.song.cur] : m.hb && m.hb.loops[m.hb.curLoop], id = lp ? lp[md(m.phrase.start + i, 4)] : null, cc = id && m.hb && m.hb.V[id]; return cc ? cc.tones[0].d : root; }); m.phrase.prog[bar - m.phrase.start] = root;   // what it EXPECTS (learned loop) for the coming bars, what it hears now for this one
      const o = Mi().genBar0(Sf, m, bar).filter(x => !x.grace && !x.orn); const strong = new Set(); { let a = 0; for (const g of m.groups) { strong.add(a); a += g; } } let kept = o; if (o.length > 6) kept = o.filter((x, i) => strong.has(Math.round(x.s)) || i % 2 === 0).slice(0, 6);   // singable: at most ~6 notes a bar
      if (E.ending && E.ending.bar === bar && kept.length) { kept = [Object.assign(kept[0], { s: 0, d: L * 2, deg: 0, vel: Math.min(1, kept[0].vel * 1.1) })]; Hb.cue(Sf, c, 'hold', { t: tOf(0), dur: 2 * L / rate }); }   // the lead holds the final tonic
      { const seen = new Set(); kept = kept.map(x => Object.assign(x, { s: Math.round(x.s), d: Math.max(1, Math.round(x.d)) })).filter(x => !seen.has(x.s) && seen.add(x.s)); }   /* v0.3.1: the jam lead sings on the shared 16th grid (high-complexity genes halved durations to 32nds) */
      E.leadAct = kept.length; kept.forEach(x => { x.vel = Math.min(1, x.vel * 1.1); }); return kept; } }
  if (m.role.startsWith('pulse')) { if (plan && plan.next !== 'end') { m.fillNext = true; Hb.cue(Sf, c, 'fill', { t: tOf(L - 4), dur: 60 / m.bpm }); } return null; }   // drums: the normal drum grammar (shared groove cell); a fill when it SAW the lead's cue
  return null; };
// restraint for a lone ohm: short singable phrases, real rests (>= ~40 %), at most 4 notes a bar
Co.solo = (Sf, m, bar, out) => { if (!out.length) return out; const strong = new Set(); { let a = 0; for (const g of m.groups) { strong.add(a); a += g; } } let o = out.filter(x => !x.grace && !x.orn); if (o.length > 4) { const n = m.sys.cents.length, res = m.grav && m.grav.res, keep = new Set(); o.forEach((x, i) => { if (strong.has(Math.round(x.s)) || i % 3 === 0) keep.add(i); }); for (const i of [...keep]) { const pc = md(o[i].deg, n); if (res && res[pc] && o[i + 1]) keep.add(i + 1); }   /* a tendency tone keeps its resolution */ o = o.filter((x, i) => keep.has(i)).slice(0, 5); }
  o.forEach((x, i) => { const nx = o[i + 1]; x.d = Math.max(x.d, nx ? Math.min(nx.s - x.s, 4) : 3); }); return o; };
// audibility near the camera: at most CAP fully audible ohms (frame members first, then nearest); the rest hum softly or wait
Co.audible = Sf => { const v = Sf.view; if (!v) return; const cs = Sf.creatures.filter(c => c.mind && !c.dead && !c.caught && !c.muted && !(c.mind.quietWatch)); const sc = c => (c.mind.E ? 3 : 0) + (c.mind.role === 'melody' ? .5 : 0) - Math.hypot(c.x - v.cx, c.y - v.cy) / 500 + (Sf.playFocus === c ? 9 : 0);
  cs.sort((a, b) => sc(b) - sc(a)); cs.forEach((c, i) => { c.mind.quiet = i >= Co.AUD; }); };
Co.hum = (Sf, m, bar) => { const L = Mi().barLen(m), n = m.sys.cents.length; return md(bar, 4) === 0 ? [{ s: 0, d: L * 2.5, deg: -n, vel: .12, hum: true }] : []; };
// visual / motion cue: shared-beat bob phase for the body (render reads c.bob: 0..1, bigger on the downbeat)
Co.bob = (c, m) => { const jm = c.bystander && c.bystander.leader && c.bystander.leader.mind, P = jm || m; const ph = md(P.pos, 4) / 4, bar = md(P.pos, Mi().barLen(P)) < 4; const b = m.perc > .55 ? Math.pow(1 - ph, 6) : Math.pow(1 - ph, 3); const sh = m.bold == null ? .5 : m.bold, back = m.back || 0;
  c.bob = b * (bar ? 1.6 : 1) * (.5 + sh * .6) * (1 - back * .8) * (c.holding ? 1 : .4) * (jm ? .45 : 1); };   // bystanders sway lightly to the jam's beat
})(typeof window !== 'undefined' ? window : globalThis);
