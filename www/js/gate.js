'use strict';
// The musical gate: every sound on a planet passes through here before the audio engine. Default = music:
// times snap to the shared audio-clock grid, pitches snap to the shared key/scale (chord tones where it matters), a per-step
// and per-beat onset budget by layer (melody > texture > noise), phrase breathing (the end of every 4-bar phrase thins out),
// consonance-weighted re-voicing of clashing notes, a layered mix and gentle envelopes. Variety stays continuous: the gate never picks
// sounds, it only places them in time/pitch/mix. A spec with .raw bypasses it; .free keeps its exact pitch (DAW microtones).
(function (G) {
const RS = G.RS, Gt = RS.Gate = {};
Gt.on = true;
Gt.CLEAN = new Set(['string', 'bar', 'clampbar', 'tine', 'rod']);
Gt.NOISE = new Set(['scrape', 'bow', 'crackle', 'bubble', 'rain', 'wind', 'rumble', 'splash', 'pop', 'hiss', 'thunder', 'quake']);
// per-step and per-beat onset budgets by layer; the player is never crowded out (own budget)
Gt.LAYER = { player: { gain: 1, perStep: 3, perBeat: 4 }, lead: { gain: .9, perStep: 1, perBeat: 2 }, tex: { gain: .5, perStep: 1, perBeat: 1 }, noise: { gain: .25, perStep: 1, perBeat: 1 }, star: { gain: .7, perStep: 1, perBeat: 2 } };   /* star = the sky's pulse/rotation/binary rhythm (star.js) */
Gt.PER_STEP = 4;
const ICLASS_DISS = [0, 1, .45, 0, 0, 0, .9, 0, 0, 0, .35, .8];   // semitone class -> dissonance
Gt.layerOf = s => { if (s.layer) return s.layer; if (s.lane === 'star') return 'star'; if (Gt.NOISE.has(s.kind) || s.lane === 'env' || s.auto) return 'noise'; if (s.player) return 'player'; if (s.scored || (s.src && !s.loopInst)) return 'lead'; return 'tex'; };
Gt.make = Sf => { const M = Sf.M, slots = new Map(), beats = new Map(); let lastClean = 0; const st = Sf.gateStats = { in: 0, out: 0, dropped: 0, moved: 0, snapped: 0, revoiced: 0, rest: 0 };
  const f0Of = s => s.f0 || (s.modes && s.modes[0] && s.modes[0].f) || 0;
  const retune = (s, f) => { const f0 = f0Of(s); if (!(f0 > 0) || !(f > 0)) return; const r = f / f0; if (Math.abs(r - 1) < 1e-6) return; s.modes = s.modes.map(m => ({ f: m.f * r, a: m.a, d: m.d })); s.f0 = f; };
  const diss = (f, list) => { let d = 0; for (const q of list) { const c = Math.round(Math.abs(12 * Math.log2(f / q.f))) % 12; d = Math.max(d, ICLASS_DISS[c] * Math.min(1, .3 + q.g * 15)); } return d; };
  return (s, when) => { if (!Gt.on || s.raw || !s.modes || !s.modes.length) return when; st.in++; const now = Sf.now(), L = Gt.layerOf(s), cfg = Gt.LAYER[L];
    if (now - lastClean > 2) { lastClean = now; const g0 = Math.floor(M.b16(now)) - 8; for (const k of slots.keys()) if (k < g0) slots.delete(k); for (const k of beats.keys()) if (k < g0 / 4 - 1) beats.delete(k); }
    const nb = () => ({ player: 0, lead: 0, tex: 0, noise: 0, star: 0 });
    // time: next grid step on the audio clock (noise + automatic collisions only on 8ths); a pre-gridded part keeps its time
    let t = Math.max(when || now, now + .005); let g;
    if ((s.grid || s.chordTone) && when) { g = Math.round(M.b16(when)); if (M.gridTime(g) < now) g = M.nextGrid(t - .004).g; } else { const every = L === 'noise' ? 2 : 1, ng = M.nextGrid(t - .004, every); g = ng.g; }
    // phrase breathing: the last half-bar of each 4-bar phrase rests (noise silent, texture only on the beat); budget per step/beat
    const pos = ((g % 64) + 64) % 64; let tries = 0;
    const fits = gg => { const p = ((gg % 64) + 64) % 64, sl = slots.get(gg) || { n: 0, player: 0, lead: 0, tex: 0, noise: 0, star: 0, f: [] }, b = beats.get(Math.floor(gg / 4)) || nb();
      if (p >= 56 && (L === 'noise' || (L === 'tex' && p % 4))) return false; if (L === 'noise' && (gg % 2)) return false;
      if (L !== 'noise' && ((s.force && L === 'player') || (s.chordTone && s.lane && sl.lanes && (sl.lanes[s.lane] || 0) < 3))) return true;
      const ens = s.src && s.src.ens && s.src.ens.grp.length > 1 ? s.src.ens : null; if (L === 'lead' && ens && sl.ens === ens && sl.lead < 4 && sl.n < Gt.PER_STEP && gg % 4 === 0 && (b.chord || 0) < 4) return true;
      if (L === 'star' && sl.n >= 2) return false;   // the star is background: it yields to a busy step (dropped, never shifted off its pattern)
      return (L === 'player' || sl.n < Gt.PER_STEP) && sl[L] < cfg.perStep && b[L] < cfg.perBeat; };
    while (!fits(g) && tries < (L === 'player' || s.force ? 4 : L === 'lead' ? 2 : L === 'star' ? 0 : 1)) { g += L === 'noise' ? 2 : 1; tries++; }
    if (!fits(g)) { st.dropped++; if (pos >= 56) st.rest++; return null; } if (tries) st.moved++;
    const tq = M.gridTime(g), sl = slots.get(g) || { n: 0, player: 0, lead: 0, tex: 0, noise: 0, star: 0, f: [] }, bk = Math.floor(g / 4), bt = beats.get(bk) || nb();
    // pitch: shared key + scale; texture/noise and strong-beat melody that clash get re-voiced to the nearest chord tone
    // v0.3: no conductor. Physics + player sounds follow the LOCAL music (the nearest playing creature's own system, chord and pulse)
    const loc = RS.Jam && RS.MIND !== false && s._x != null ? RS.Jam.local(Sf, s._x, s._y) : null;
    if (loc) { const f0l = f0Of(s); if (f0l > 0 && !s.free) { const strong = (Math.round(M.b16(tq)) % 4) === 0; retune(s, RS.Jam.snap(Sf, loc, f0l, strong || L === 'noise')); } st.local = (st.local || 0) + 1; const tl = RS.Jam.gridTime(Sf, loc, tq, L === 'noise' ? 2 : 1); s.gain = (s.gain || .1) * cfg.gain; s.att = Math.max(s.att || .002, .003); if (s.lane) { sl.lanes = sl.lanes || {}; sl.lanes[s.lane] = (sl.lanes[s.lane] || 0) + 1; } sl.n++; sl[L]++; slots.set(g, sl); bt[L]++; beats.set(bk, bt); s.layer = L; st.out++; return tl; }
    const f0 = f0Of(s); if (f0 > 0 && !s.free) { let f = M.snap(f0, { t: tq }); let ring = sl.f; for (let k = 1; k <= 3; k++) ring = ring.concat((slots.get(g - k) || { f: [] }).f);
      if (Math.abs(f / f0 - 1) > 1e-4) st.snapped++;
      const strong = g % 4 === 0, thr = L === 'player' ? .5 : L === 'lead' ? (strong ? .25 : .5) : .25; if (diss(f, ring) > thr) { const fc = M.snap(f0, { chord: true, t: tq }); if (diss(fc, ring) < diss(f, ring)) { f = fc; st.revoiced++; } }
      retune(s, f); sl.f.push({ f, g: s.gain || .1 }); }
    // clean pitched tone for struck rods/strings/bars: mostly harmonic partials, short soft transient, bounded ring (material colour stays, just tamed)
    if (Gt.CLEAN.has(s.kind) && f0 > 0) { const fq = f0Of(s); s.modes = s.modes.map((m, k) => { const r = m.f / fq, h = Math.max(1, Math.round(r)), off = Math.abs(1200 * Math.log2(r / h)); return { f: m.f, a: m.a * (k && off > 40 ? .3 : 1) / (k ? 1 + k * .15 : 1), d: Math.min(m.d, L === 'player' ? 3.5 : 2.2) }; }); if (s.click) s.click = Math.min(s.click, .12); }
    // creatures singing far from the shared key are softer (they still sing; breeding uses the key distance)
    if (s.src && s.src.keyC != null) { const off = Math.abs((((s.src.keyC % 1200) + 1800) % 1200) - 600 - 0); const semis = Math.min(off, 1200 - off) / 100; if (semis > .5) s.gain *= .55; }
    // mix + envelopes: melody over texture, noise/percussive quiet; no clicks, soft attacks for voices, noise tails short
    s.gain = (s.gain || .1) * cfg.gain * (sl.n ? 1 / Math.sqrt(1 + sl.n * .6) : 1); s.att = Math.max(s.att || .002, L !== 'noise' && s.src ? .015 : L === 'noise' ? .006 : .003);
    if (s.click) s.click *= L === 'player' ? .7 : L === 'lead' ? .5 : .25; if (L === 'noise') s.modes = s.modes.map(m => ({ f: m.f, a: m.a, d: Math.min(m.d, .45) }));
    const chordMate = L === 'lead' && s.src && s.src.ens && sl.ens === s.src.ens; if (s.lane) { sl.lanes = sl.lanes || {}; sl.lanes[s.lane] = (sl.lanes[s.lane] || 0) + 1; } sl.n++; sl[L]++; if (L === 'lead' && s.src && s.src.ens && !sl.ens) sl.ens = s.src.ens; slots.set(g, sl); if (!chordMate) bt[L]++; else bt.chord = (bt.chord || 0) + 1; beats.set(bk, bt); s.gridG = g; s.layer = L; st.out++; return tq; }; };
})(typeof window !== 'undefined' ? window : globalThis);
