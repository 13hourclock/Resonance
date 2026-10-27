// v0.8 drums (Wilbow 6:56 PM Oct 23 2026: "Most of them sound like high hats, need kick and other varieties"; 6:57 "The individual ohms keep
// their instrument. Its not a rule that each type can be only one thing or sound"; 6:58 "It can learn other sounds too").
// A NEW percussion ohm is born with its own small DRUM SET: 1-3 hits drawn (seeded, weighted, steered by its body) from the data table below,
// stored on its genome as g.dk = [{ h: 'kick', s: seed, b: 1 }, ...] and saved with it. Birth hits are permanent; learned hits
// (RS.Drums.learn) are appended up to CAP. Ohms saved before this (no g.dk) keep the old gene-derived drum exactly.
// ADDING A DRUM = adding an entry to HITS (or RS.Drums.add(id, def)): band (low/mid/high = where it sits in a mix), part (which part of the
// groove it plays: low = kick cell, back = backbeat, time = 8ths/16ths, colour = syncopated chord-pitch hits), w (how common), lean (+ = big
// / heavy bodies, - = small / light ones), fam (the old gene drum types that lean toward it), f (its pitch range, Hz) and make(Q, v) (the
// synthesis: v = 4 seeded numbers in [0,1) that make this ohm's kick its own kick).
(function (G) { const RS = G.RS, cl = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x)), D = RS.Drums = {};
  const MEMB = [1, 1.594, 2.136, 2.296], WOOD = [1, 2.76, 5.4, 8.93], METAL = [1, 1.483, 1.932, 2.546], TABLA = [1, 2, 3, 4], BELL = [1, 2.0, 2.76, 5.4];
  D.CAP = 8; D.BIRTH_MAX = 3;   // 0.8b6 kit growth: up to 3 birth hits + learned hits (a full kit is 5 slots)
  D.HITS = {
    kick: { band: 'low', part: 'low', w: 1.15, lean: 1, fam: ['kick', 'kit'], f: [44, 72],   // round body with a fast pitch drop + a beater click (so a phone speaker hears it)
      make: (Q, v) => { Q.ratios = [1, 1.5 + v[0] * .25, 2.1, 2.9]; Q.modal = 1; Q.osc = .45 + .3 * v[1]; Q.penv = 1.6 + .8 * v[2]; Q.ptime = .02 + .015 * v[3]; Q.noise = .3 + .1 * v[1]; Q.noiseLP = .35; Q.cut = 1600 + 1600 * v[0]; Q.ftype = .1; Q.q = 1.1; Q.fenv = 2.5; Q.fdec = .012; Q.mdec = .22 + .28 * v[2]; Q.dec = Q.mdec * .8; Q.rel = .06; Q.sat = Math.max(Q.sat || 0, .35 + .3 * v[3]); } },
    snare: { band: 'mid', part: 'back', w: 1.1, lean: 0, fam: ['snare', 'kit'], f: [150, 260],   // tuned membrane under a band of snare-wire noise
      make: (Q, v) => { Q.ratios = MEMB.slice(); Q.modal = .3; Q.osc = .08; Q.noise = .8 + .2 * v[0]; Q.noiseLP = .4 + .2 * v[1]; Q.cut = 2000 + 1800 * v[1]; Q.ftype = .1; Q.q = 1; Q.fenv = 1.2; Q.fdec = .04; Q.mdec = .1 + .12 * v[2]; Q.dec = Q.mdec; Q.rel = .05 + .08 * v[2]; Q.penv = .25; Q.ptime = .015; } },
    clap: { band: 'mid', part: 'back', w: .55, lean: -.2, fam: ['snare'], f: [700, 1100], clap: true,   // band-passed noise burst (doubled by the grammar)
      make: (Q, v) => { Q.ratios = MEMB.slice(); Q.modal = .1; Q.osc = 0; Q.noise = .97; Q.noiseLP = .45 + .25 * v[0]; Q.cut = 1100 + 900 * v[1]; Q.ftype = .5; Q.q = 1.2; Q.trem = .6; Q.techRate = 75 + 25 * v[3]; Q.mdec = .045 + .05 * v[2]; Q.dec = Q.mdec; Q.rel = .06 + .06 * v[2]; Q.penv = 0; Q.att = .002; } },
    hat: { band: 'high', part: 'time', w: 1.1, lean: -1, fam: ['hat'], f: [420, 800],   // metal partials + high-passed noise; some ohms' hats ring open
      make: (Q, v) => { Q.ratios = METAL.map((x, i) => x * (1 + i * v[0] * .07)); Q.modal = 1; Q.osc = 0; Q.noise = .84; Q.noiseLP = .75 + .25 * v[1]; Q.cut = 6500 + 5000 * v[1]; Q.ftype = .85; Q.q = 1.2; Q.mdec = v[3] > .75 ? .2 + .25 * v[2] : .03 + .06 * v[2]; Q.dec = Q.mdec; Q.rel = .03; Q.att = .0008; Q.penv = 0; } },
    shaker: { band: 'high', part: 'time', w: .55, lean: -.8, fam: ['hat'], f: [500, 900],   // soft-attack grains of noise
      make: (Q, v) => { Q.ratios = METAL.slice(); Q.modal = 1; Q.osc = 0; Q.noise = .97; Q.noiseLP = .6 + .3 * v[0]; Q.cut = 4500 + 3500 * v[1]; Q.ftype = .5; Q.q = 1.1; Q.att = .018 + .014 * v[2]; Q.mdec = .06 + .05 * v[3]; Q.dec = Q.mdec; Q.rel = .05; Q.penv = 0; } },
    tom: { band: 'low', part: 'colour', w: .9, lean: .7, fam: ['tom', 'kick'], f: [105, 240], pitched: true,   // big membrane, pitch sags after the hit
      make: (Q, v) => { Q.ratios = MEMB.slice(); Q.modal = 1; Q.osc = .3 + .2 * v[0]; Q.noise = .06 + .06 * v[1]; Q.noiseLP = .3; Q.cut = 1400 + 1400 * v[1]; Q.ftype = .1; Q.q = 1; Q.mdec = .22 + .3 * v[2]; Q.dec = Q.mdec * .8; Q.rel = .08; Q.penv = .3 + .35 * v[3]; Q.ptime = .04; Q.fenv = 1.2; Q.fdec = .03; } },
    hand: { band: 'mid', part: 'colour', w: .9, lean: .1, fam: ['tom'], f: [170, 360], pitched: true, strokes: true,   // conga / djembe / tabla: open, slap, bass from one skin
      make: (Q, v) => { const t = v[0]; Q.ratios = MEMB.map((x, i) => x + (TABLA[i] - x) * t); Q.modal = 1; Q.osc = .15 + .15 * t; Q.noise = .08 + .1 * v[1]; Q.noiseLP = .4; Q.cut = 2200 + 2200 * v[1]; Q.ftype = .1; Q.q = 1.1; Q.mdec = .14 + .26 * v[2]; Q.dec = Q.mdec * .8; Q.rel = .06; Q.penv = t > .6 ? -.06 : .12; Q.ptime = .06; Q.fenv = 1.4; Q.fdec = .03; } },
    rim: { band: 'high', part: 'back', w: .55, lean: -.6, fam: ['snare', 'hat'], f: [700, 1300],   // rim shot / side stick: a dry knock
      make: (Q, v) => { Q.ratios = WOOD.slice(); Q.modal = 1; Q.osc = .25; Q.noise = .3 + .15 * v[0]; Q.noiseLP = .3; Q.cut = 1800 + 1400 * v[1]; Q.ftype = .4; Q.q = 1.3; Q.mdec = .018 + .02 * v[2]; Q.dec = Q.mdec; Q.rel = .02; Q.penv = 0; Q.att = .0005; } },
    wood: { band: 'mid', part: 'colour', w: .35, lean: -.3, fam: ['tom'], f: [600, 1300], pitched: true,   // woodblock / log drum / clave
      make: (Q, v) => { Q.ratios = WOOD.slice(); Q.modal = 1; Q.osc = .1; Q.noise = .04; Q.noiseLP = .5; Q.cut = 4000 + 2000 * v[1]; Q.ftype = .1; Q.q = 1; Q.mdec = .04 + .06 * v[2]; Q.dec = Q.mdec; Q.rel = .03; Q.penv = 0; } },
    cowbell: { band: 'mid', part: 'time', w: .4, lean: -.2, fam: ['tom', 'hat'], f: [520, 820],   // two clanging square-ish tones
      make: (Q, v) => { Q.ratios = [1, 1.48 + .04 * v[0], 2.0, 2.96]; Q.modal = 1; Q.osc = .35; Q.noise = .03; Q.noiseLP = .5; Q.cut = 3000 + 2000 * v[1]; Q.ftype = .5; Q.q = 1.6; Q.mdec = .12 + .14 * v[2]; Q.dec = Q.mdec; Q.rel = .05; Q.penv = 0; Q.sat = Math.max(Q.sat || 0, .3); } },
    bell: { band: 'high', part: 'colour', w: .25, lean: -.5, fam: ['tom', 'hat'], f: [650, 1300], pitched: true,   // agogo / gong-bell / triangle: a long metal ring
      make: (Q, v) => { Q.ratios = BELL.map((x, i) => x * (1 + i * v[0] * .02)); Q.modal = 1; Q.osc = .1; Q.noise = .02; Q.noiseLP = .5; Q.cut = 5000 + 3000 * v[1]; Q.ftype = .1; Q.q = 1; Q.mdec = .4 + .5 * v[2]; Q.dec = Q.mdec; Q.rel = .2; Q.penv = 0; } } };
  D.PART_TYPE = { low: 'kick', back: 'snare', time: 'hat', colour: 'tom' };
  D.PART_OF = { kick: 'low', snare: 'back', hat: 'time', tom: 'colour' };   // the specialist part (mind.js drumSpec / cohere niches) a single-part set plays
  D.STROKE_PART = { bass: 'low', slap: 'back', mute: 'time', ghost: 'back', ring: 'colour', tone: 'colour' };
  D.add = (id, def) => { D.HITS[id] = def; D._cache = null; return def; };   // a new drum (a new musical style's percussion) is one entry
  const seedOf = g => { let h = 0x9e3779b1; for (const i of [0, 1, 22, RS.IG.perc, RS.IG.bodyRes, RS.IG.pitched, RS.IG.transient, RS.IG.noiseCol, RS.IG.dec, RS.IG.cut]) h = Math.imul(h ^ Math.round((g[i] || 0) * 65535), 2654435761) >>> 0; return h >>> 0; };
  // body lean: -1 (small, light, few segments) .. +1 (big, heavy, long)
  D.bodyLean = g => cl((g[0] - .5) * 1.7 + (g[22] - .5) * .9 + (g[1] - .5) * .3, -1, 1);
  // the BIRTH SET. want = an explicit drum pick (egg taps / a clay 'drum:x' voice / the spiral's stroke reading): its family leads
  D.birth = (g, want) => { const r = RS.rng(seedOf(g) ^ 0x51ed27), B = D.bodyLean(g), old = want || (RS.Inst.drumType ? RS.Inst.drumType(g) : null), ids = Object.keys(D.HITS);
    const wt = (id, set) => { const H = D.HITS[id]; let w = H.w * Math.exp((H.lean || 0) * B * 1.1); if (old && H.fam && H.fam.includes(old)) w *= want ? 4 : 1.8;
      if (set.length) { if (set.some(e => e.h === id)) return 0; const bands = set.map(e => D.HITS[e.h].band), parts = set.map(e => D.HITS[e.h].part); if (parts.includes(H.part)) w *= .15; if (!bands.includes(H.band)) w *= 2; } return w; };
    const pick = set => { let tot = 0; const ws = ids.map(id => { const w = wt(id, set); tot += w; return w; }); let x = r() * tot; for (let i = 0; i < ids.length; i++) if ((x -= ws[i]) <= 0) return ids[i]; return ids[0]; };
    const cx = g[RS.IG.complexity] || .5, n = want === 'kit' ? 3 : 1 + (r() < .35 + cx * .35 ? 1 : 0) + (r() < .12 + cx * .25 ? 1 : 0), set = [];
    if (want === 'kit') for (const id of ['kick', r() < .7 ? 'snare' : 'clap', r() < .7 ? 'hat' : 'shaker']) set.push({ h: id, s: (r() * 4294967296) >>> 0, b: 1 });
    else for (let k = 0; k < n; k++) set.push({ h: pick(set), s: (r() * 4294967296) >>> 0, b: 1 });
    return set; };
  // what the set plays as a whole: one part -> that specialist; several parts -> a kit (plays every part, each with its own hit)
  D.typeOf = dk => { const ps = [...new Set(dk.map(e => (D.HITS[e.h] || (e.x && D.HITS[e.x.base]) || {}).part).filter(Boolean))]; return ps.length === 1 ? D.PART_TYPE[ps[0]] : 'kit'; };
  // one hit's instrument, from the ohm's own base instrument (keeps its engine colour, saturation, width...) + the hit's synthesis
  D.hitP = (I, e) => { const H = D.HITS[e.h] || (e.x && D.HITS[e.x.base]) || D.HITS.kick, Q = Object.assign({}, I), v = RS.rng(e.s >>> 0); Q._kit = null; Q.dk = null; Q.velB = H.velB != null ? H.velB : .25;   /* 0.8b3 velocity shading is gentle on drum hits: their recipe is the timbre; a harder hit is only a little brighter */ Q.ratios = (I.ratios || [1]).slice();
    // a drum hit is struck + resonant/noisy: clear the melodic machinery it inherits (bow/blow/strings, synth engines, filter LFO and sweep,
    // tremolo rolls) so each hit sounds like its row in HITS; the ohm's own genes still colour it through sat, curve, fm, det and v.
    Object.assign(Q, { pluck: 0, strike: 1, scrape: 0, bow: 0, blow: 0, voc: 0, str: 0, tube: 0, form: 0, nres: 0, eng: [], lfoF: 0, lfoP: 0, lfoA: 0, fenv: 0, fdec: .03, trem: 0, glT: 0, phys: 1, att: .001, sus: 0, uni: 0 }); const vv = [v(), v(), v(), v()]; H.make(Q, vv);
    if (e.x && e.x.set) for (const k in e.x.set) if (typeof e.x.set[k] === 'number') Q[k] = e.x.set[k];   // a learned hit may carry its own numbers
    const f = H.f || [100, 400]; Q.drumF = f[0] + (f[1] - f[0]) * v(); Q.hitId = e.h; Q.hitBand = H.band; Q.perc = I.perc; Q.percK = 1; Q.sus = 0; Q.str = 0; Q.tube = 0; Q.form = 0; Q.lfoP = 0; Q.lfoA = 0; Q.uni = 0; return Q; };
  // attach a set to an instrument (inst.js fromGenome); every hit voice is built once here and cached on the instrument
  // jam niches this ohm can fill, best first: 'pulse:all' when it holds 2+ parts, then each part it has (cohere.js spreads drummers over these)
  D.niches = I => { const ps = [...new Set((I.dkP || []).filter(q => q.hitB !== false).map(q => D.HITS[q.hitId] ? D.HITS[q.hitId].part : 'colour'))]; return (ps.length > 1 ? ['pulse:all'] : []).concat(ps.map(p => 'pulse:' + p)); };
  D.attach = (P, g) => { const core = g.dk.filter(e => !e.l); P.dk = g.dk; P.drum = D.typeOf(core.length ? core : g.dk); P.dkP = null; P.dkP = g.dk.map(e => { const Q = D.hitP(P, e); Q.hitB = !e.l; Q.hitE = e; Q.dkP = null; return Q; }); const lo = P.dkP.find(q => q.hitB && q.hitBand === 'low') || P.dkP.find(q => q.hitB) || P.dkP[0]; P.drumF = lo.drumF; P.clap = P.dkP.some(q => q.hitB && D.HITS[q.hitId] && D.HITS[q.hitId].clap) && P.drum === 'snare'; return P; };
  // performing: which of its hits the ohm uses for a note of its drum part (stroke -> part); returns { P, f } or null (= this set has no hit
  // for that part: the note is left out, so a kick + rim ohm plays kick on the low cell and rim on the backbeat and leaves the hats alone)
  // which BIRTH hit plays a grammar note (-1 = left out). A single-birth-hit drummer plays every grammar note on its birth hit for life, even after
  // it has learned other hits (0.8b6 rebalance, 10:28 PM: the birth sound stays the main part of its playing; learned hits only add the kit around it).
  D.birthIdx = (hs, o, one = true) => { const part = o.part || D.STROKE_PART[o.stroke] || 'low'; let i = hs.findIndex(q => q.hitB !== false && D.HITS[q.hitId] && D.HITS[q.hitId].part === part);
    if (i < 0 && o.stroke === 'ghost') i = hs.findIndex(q => q.hitB !== false && q.hitBand === 'mid'); if (i < 0 && one) { let n = 0, k = -1; for (let j = 0; j < hs.length; j++) if (hs[j].hitB !== false) { n++; if (k < 0) k = j; } if (n === 1) i = k; } return i; };
  D.voice = (I, o, f) => { const hs = I.dkP; if (!hs || !hs.length) return null;
    let i = o.hit != null ? -1 : D.birthIdx(hs, o, !o.manual);   /* the grammar plays the BIRTH hits; learned hits come in through D.kitBar (o.hit) */ if (o.hit != null) i = Math.min(hs.length - 1, o.hit); if (i < 0 && o.manual) i = Math.max(0, ['bass', 'tone', 'slap', 'ghost', 'mute', 'ring'].indexOf(o.stroke)) % hs.length;   /* play-mode pads reach every hit */ if (i < 0) { if (hs.length > 1) return null; i = 0; }
    const Q = hs[i], H = D.HITS[Q.hitId] || {}; let P = Q;
    if (o.stroke === 'ghost' || (H.strokes && o.stroke && o.stroke !== 'bass')) P = RS.Inst.stroke(Q, o.stroke === 'mute' && !H.strokes ? 'ghost' : o.stroke);   // ghost notes; a hand drum's open / slap / bass
    else if (o.stroke === 'ring' && H.part === 'time') P = RS.Inst.stroke(Q, 'ring');   // an open hat at the bar end
    let ff = Q.drumF; if (H.pitched && f > 20) { const lo = H.f[0], hi = H.f[1]; ff = f; while (ff < lo) ff *= 2; while (ff > hi * 1.0001) ff /= 2; if (ff < lo) ff = lo; }   // tuned drums follow the chord inside their own range
    return { P, f: ff, hit: Q.hitId }; };
  // LEARNING (the trigger is the 0.8b6 teacher work): append a hit to an ohm's set. hitDef = a HITS id ('cowbell'), or
  // { h: 'cowbell', s: seed } (copy a teacher's exact hit), or { base: 'snare', set: { cut: 3000, ... } } for a new variant of a table drum.
  // Birth hits stay; past CAP the oldest LEARNED hit makes room. Returns the new entry, or null (not a drummer / already has it / unknown).
  D.learn = (c, hitDef) => { const g = c && (c.g || c); if (!g || !(g[RS.IG.perc] > .7)) return null; if (!g.dk) g.dk = D.birth(g);
    const d = typeof hitDef === 'string' ? { h: hitDef } : Object.assign({}, hitDef || {}), id = d.h || d.base; if (!D.HITS[id]) return null;
    const e = { h: id, s: d.s != null ? d.s >>> 0 : (seedOf(g) ^ RS.hash('learn', id, g.dk.length)) >>> 0, l: 1, p: 1 }; if (d.from != null) e.o = d.from; if (d.set) e.x = { base: id, set: Object.assign({}, d.set) };
    if (!d.set && g.dk.some(q => q.h === id && (d.s == null || q.s === e.s))) return null;
    if (g.dk.length >= D.CAP) { const k = g.dk.findIndex(q => !q.b); if (k < 0) return null; g.dk.splice(k, 1); } g.dk.push(e);
    D.refresh(c); return e; };
  // re-attach after the set changed: in place when the instrument already has a set (the jam, layers and mind keep their reference)
  D.refresh = c => { const g = c && c.g; if (!c || !c.P || !g || !g.dk) return; if (c.P.inst && c.P.inst.dkP) D.attach(c.P.inst, g); else { c.P.inst = RS.Inst.fromGenome(g); if (c.mind) c.mind.I = c.P.inst; } };
  // ---------------- 0.8b6 KIT GROWTH (Wilbow 8:50 PM: "Drums should be able to play a mix of sounds through learning from other types of
  // drum" / "As in slowly becoming a full kit through experience"). A drummer keeps its 1-3 birth hits for life; jamming with other kinds of
  // drummers (and teachers) it slowly learns THEIR hits, one at a time, for the kit slots it is missing, until it has a full kit:
  // low (kick) + back (snare / clap / rim) + time (hat / shaker) + fill (tom / hand) + colour (wood / cowbell / bell).
  // A learned hit is a g.dk entry { h, s (the mate's own hit seed = an exact copy), l: 1, p: progress 0..1, o: the mate's id } (saved with g.dk).
  // The rate comes from the 0.8b6 learning system (layers.js: k * rateK * (1 + level) * .5, x teachX with a teacher, x practice when the
  // mate has gone) times P.kitK; the start chance follows the same rules. D.kitBar plays the learned hits (faint while learning).
  D.KIT = ['low', 'back', 'time', 'fill', 'colour'];
  D.SLOT = { kick: 'low', snare: 'back', clap: 'back', rim: 'back', hat: 'time', shaker: 'time', tom: 'fill', hand: 'fill', wood: 'colour', cowbell: 'colour', bell: 'colour' };
  D.slotOf = h => { const H = D.HITS[h]; return !H ? null : H.slot || D.SLOT[h] || ({ low: 'low', back: 'back', time: 'time', colour: 'fill' })[H.part] || 'colour'; };
  D.KP = { kitK: .8, startK: .6, teachX: 2, practice: .15, minP: .04, learnedGain: .65, learnedMax: .8, jamSlots: 1, view: 400 };
  const prog = e => e.b || !e.l ? 1 : e.p == null ? 1 : cl(e.p);
  const u32 = (...a) => (RS.hash(...a) >>> 0) / 4294967296;
  // slot -> coverage (birth = 1, learned = its progress)
  D.kit = c => { const g = c && (c.g || c), o = {}; for (const s of D.KIT) o[s] = 0; for (const e of (g && g.dk) || []) { const s = D.slotOf(e.h || (e.x && e.x.base)); if (s) o[s] = Math.max(o[s], prog(e)); } return o; };
  D.fullness = c => { const k = D.kit(c); return D.KIT.reduce((a, s) => a + k[s], 0) / D.KIT.length; };
  D.isFull = c => D.KIT.every(s => D.kit(c)[s] >= 1);
  // the hits a mate can teach: its birth hits + its fully learned ones; an old-save drummer (no set) teaches its gene drum
  const LEG = { kick: ['kick'], snare: ['snare'], hat: ['hat'], tom: ['tom'], kit: ['kick', 'snare', 'hat'] };
  D.teaches = o => { const g = o && o.g; if (!g || !(g[RS.IG.perc] > .7)) return []; if (g.dk) return g.dk.filter(e => prog(e) >= 1 && D.HITS[e.h]).map(e => ({ h: e.h, s: e.s >>> 0 }));
    const t = o.P && o.P.inst && o.P.inst.drum; return (LEG[t] || []).map(h => ({ h, s: (seedOf(g) ^ RS.hash('leg', h)) >>> 0 })); };
  // one learning step (the 2 s jam tick). rate = the b6 progress step; isT(o) = how strongly o teaches, 0..1 (a gradient; true = 1).
  // A mate teaches at 1 + (teachX - 1) * isT(o) times the plain rate. Returns what happened.
  D.study = (c, mates, rate, isT) => { const g = c && c.g; if (!g || !g.dk || !(g[RS.IG.perc] > .7) || !(rate > 0) || c.dead) return null; const T = o => { const v = isT ? isT(o) : 0; return v === true ? 1 : cl(+v || 0); }, X = o => 1 + (D.KP.teachX - 1) * T(o);
    const cur = g.dk.find(e => e.l && e.p != null && e.p < 1);
    if (cur) { const src = (mates || []).find(o => o && o.id === cur.o && !o.dead), x = src ? X(src) : D.KP.practice; cur.p = Math.min(1, Math.round((cur.p + rate * D.KP.kitK * x) * 1e5) / 1e5);
      if (cur.p >= 1) { cur.p = 1; D.refresh(c); return { done: cur.h }; } return { step: cur.h }; }
    const cov = D.kit(c), miss = D.KIT.filter(s => cov[s] <= 0); if (!miss.length || g.dk.length >= D.CAP) return null;
    let cand = []; for (const o of mates || []) { if (!o || o === c || o.dead) continue; const t = T(o); for (const q of D.teaches(o)) if (miss.includes(D.slotOf(q.h)) && !g.dk.some(e => e.h === q.h)) cand.push({ o, t, q }); }
    if (!cand.length) return null; { const tm = Math.max(...cand.map(x => x.t)); if (tm > 0) cand = cand.filter(x => x.t >= tm * .5); }   // the stronger teachers' hits first
    c._dkT = (c._dkT || 0) + 1; const x = cand[Math.floor(u32('kitpick', c.id, c._dkT) * cand.length)];
    if (u32('kitstart', c.id, c._dkT, g.dk.length) >= rate * D.KP.kitK * D.KP.startK * X(x.o) * 20) return null;
    const e = { h: x.q.h, s: x.q.s, l: 1, p: 0, o: x.o.id }; g.dk.push(e); D.refresh(c); return { start: e.h, from: x.o.id }; };
  // ---------------- the KIT PLAYER: a post-pass on the drummer's bar (mind.js Mi.drumBar) that adds its learned hits in their natural roles:
  // kick on the strong beats, snare / clap on the back-beats, hats / shakers keeping time, toms / colour in fills. Birth hits stay the core and
  // the loudest (learned <= KP.learnedGain of a birth hit); a hit fades in with its progress. In a jam with other drummers a slot that another
  // drummer already covers is left to it, and each drummer adds at most KP.jamSlots learned slot(s), so they interlock instead of all
  // playing a full kit. Off screen nothing is added (cheap). Deterministic (hash, not the bar's r()), so the birth groove is unchanged.
  D.kitBar = (Sf, m, bar, role, fill, dyn, out, cell, L) => { const I = m.I, hs = I && I.dkP; if (!hs || !hs.some(q => !q.hitB)) return out; const c = m.c;
    if (c && Sf && Sf.view && Sf.inView && Sf.playFocus !== c && !Sf.inView(c.x, c.y, D.KP.view)) return out;
    let mine = []; hs.forEach((q, i) => { if (q.hitB || !q.hitE) return; const p = prog(q.hitE); if (p < D.KP.minP) return; mine.push({ i, p, s: D.slotOf(q.hitId) }); });
    if (!mine.length) return out; const birth = new Set(hs.filter(q => q.hitB).map(q => D.slotOf(q.hitId)));
    mine = mine.filter(x => !birth.has(x.s));
    const E = m.E, others = E ? E.members.filter(o => o !== c && o.mind && o.mind !== m && !o.muted && o.P && o.P.inst && (o.P.inst.percK || 0) > .5 && o.mind.role && o.mind.role !== 'listen') : [];
    if (others.length) { const taken = new Set(); for (const o of others) { const J = o.P.inst; if (J.dkP) { for (const q of J.dkP) if (q.hitB) taken.add(D.slotOf(q.hitId)); } else for (const h of LEG[J.drum] || []) taken.add(D.slotOf(h));
        if (J.dkP && E.members.indexOf(o) < E.members.indexOf(c)) for (const q of J.dkP) if (!q.hitB && q.hitE && prog(q.hitE) >= .5) { const s = D.slotOf(q.hitId); if (!taken.has(s) && D.KP.jamSlots > 0) taken.add(s); } }
      mine = mine.filter(x => !taken.has(x.s)).sort((a, b) => b.p - a.p).slice(0, D.KP.jamSlots); }
    if (!mine.length) return out; const G = m.groups || [L], gs = []; { let a = 0; for (const n of G) { gs.push(a); a += n; } }
    const id = c ? c.id : 0, mic = (m.micro || 0) * 4, n = gs.length;
    const cand = [], rk = {}, put = (x, s, vel, stroke, deg) => { if (s < 0 || s >= L) return; const r = rk[x.i] = (rk[x.i] || 0) + 1; const pr = Math.pow(cl((x.p - D.KP.minP) / (1 - D.KP.minP)), 1.2); if (u32('kb', id, bar, x.i, s) >= pr) return;
      cand.push({ r: r + u32('ko', id, bar, x.i) - (fill && x.s === 'fill' ? 2 : 0), f: fill && x.s === 'fill', n: { s: s + mic, d: .5, deg: deg || 0, vel: vel * D.KP.learnedGain * (.45 + .55 * x.p), stroke, perc: true, db: false, hit: x.i, kit: 1 } }); };
    for (const x of mine) { if (x.s === 'low') { put(x, 0, dyn, 'bass'); if (n >= 3) put(x, gs[Math.floor(n / 2)], dyn * .85, 'bass'); else if (L >= 8) put(x, Math.floor(L / 2), dyn * .8, 'bass'); }
      else if (x.s === 'back') { const bb = n >= 2 ? gs.filter((_, k) => k % 2 === 1) : [Math.floor(L / 2)]; for (const s of bb) put(x, s, dyn * .85, 'slap'); }
      else if (x.s === 'time') { for (let s = 0; s < L; s += 2) put(x, s, dyn * (s % 4 === 0 ? .34 : .24), 'mute'); }
      else if (x.s === 'fill') { if (fill) for (let s = L - 4; s < L; s++) put(x, s, dyn * (.55 + .1 * (s - L + 4)), 'tone', -(s - L + 4)); else if (u32('kf', id, bar) < .3) put(x, L - 2, dyn * .55, 'tone'); }
      else { const off = [3, 7, 11, 14, 5, 13].filter(s => s < L), k = Math.floor(u32('kc', id, bar) * off.length); put(x, off[k], dyn * .5, 'tone', 2); if (fill || u32('kc2', id, bar) < .35) put(x, off[(k + 2) % off.length], dyn * .4, 'tone', 4); } }
    // 0.8b6 rebalance (Wilbow was told the birth hits stay the main part of a drummer's playing for life): the learned notes of a bar are capped
    // at KP.learnedMax x the birth notes heard in it (so birth >= ~55 % of notes on a full-kit veteran), and no learned hit may out-play the
    // drummer's most-played birth hit. Each slot's role-defining note comes first (rank 1: kick on the one, the first back-beat, ...), ties
    // rotate per bar (hash), so over a few bars every slot is still heard: a full kit, around the birth sound.
    if (!cand.length) return out; const bc = {}; let nB = 0, topB = 0; for (const o of out) { if (!o.perc || o.kit) continue; const i = D.birthIdx(hs, o); if (i < 0) continue; nB++; bc[i] = (bc[i] || 0) + 1; if (bc[i] > topB) topB = bc[i]; }
    let room = Math.floor(nB * D.KP.learnedMax + u32('kq', id, bar)); if (cand.some(q => q.f)) room = Math.max(room, 2); if (room <= 0) return out; cand.sort((a, b) => a.r - b.r); const used = {};
    for (const q of cand) { if (room <= 0) break; const h = q.n.hit, cap = Math.max(q.f ? 2 : 0, topB - 1 + (u32('kh', id, bar, h) < .5 ? 1 : 0));   /* a fill bar's tom run gets 2 */ if ((used[h] || 0) >= cap) continue; used[h] = (used[h] || 0) + 1; room--; out.push(q.n); }
    return out; };
  // stats for tests / the dev panel: hits heard split birth / learned
  D.stats = c => { const g = c && (c.g || c), dk = (g && g.dk) || []; return { birth: dk.filter(e => !e.l).length, learned: dk.filter(e => e.l).length, done: dk.filter(e => e.l && prog(e) >= 1).length, fullness: D.fullness(g), kit: D.kit(g) }; };
  D.hits = c => ((c && (c.g || c)).dk || []).map(e => ({ id: e.h, birth: !!e.b, learned: !!e.l })); })(typeof window !== 'undefined' ? window : globalThis);
