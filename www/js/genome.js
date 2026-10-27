'use strict';
// Genetics: 164 continuous genes (v0.1: 96 body/voice + 32 musicality + 8 senses + 28 life-history/temperament) in [0,1). Genes drive body plan, material, colour, motion, behaviour and voice through the shared physics.
// Pure JS (no DOM). Genome <-> short code; name from hash; crossover + mutation; phenotype distance for uniqueness tests.
(function (G) {
const RS = G.RS, NG = 241, GIFT = 240, HN = 164, TN = 168, IN = 172;   // v0.3b (12:29 steer): + 28 synth-engine/technique genes (204..231) + 8 effect-attraction genes (232..239)   // v0.3: + 28 instrument genes (172..199), see RS.INST_GENES   // + 4 vocal-tract genes (168..171): tract amount, tenseness, nasality, articulation agility   // 164 body/voice/music/senses/life genes + 4 'learned-trait' genes (key, tempo, phase, register) that epigenetic marks can carry into offspring
// gene regions (used for colour bands on the DNA helix too)
RS.GENE_REGIONS = [{ k: 'body', a: 0, b: 20, hue: 28 }, { k: 'material', a: 20, b: 32, hue: 190 }, { k: 'colour', a: 32, b: 48, hue: 300 },
  { k: 'motion', a: 48, b: 64, hue: 120 }, { k: 'behaviour', a: 64, b: 80, hue: 55 }, { k: 'voice', a: 80, b: 96, hue: 260 },
  { k: 'music', a: 96, b: 128, hue: 335 }, { k: 'senses', a: 128, b: 136, hue: 90 }, { k: 'life', a: 136, b: 164, hue: 160 }, { k: 'tuning', a: 164, b: 168, hue: 45 }, { k: 'vocal', a: 168, b: 172, hue: 12 }, { k: 'instrument', a: 172, b: 200, hue: 230 }, { k: 'percussion', a: 200, b: 204, hue: 20 }, { k: 'engine', a: 204, b: 232, hue: 262 }, { k: 'attraction', a: 232, b: 240, hue: 120 }];
// instrument genes (v0.3): continuous coordinates in the timbre space (inst.js). Index = 172 + position.
RS.INST_GENES = ['exc', 'res', 'fmI', 'fmR', 'inharm', 'noise', 'noiseCol', 'att', 'dec', 'sus', 'rel', 'curve', 'ftype', 'cut', 'reso', 'fenv', 'fdec', 'penv', 'ptime', 'lfoR', 'lfoP', 'lfoF', 'lfoA', 'detune', 'sat', 'formant', 'width', 'complexity', 'perc', 'pitched', 'transient', 'bodyRes',
  /* synth engines (blend weights; the physical-model share is engMix) + their shape genes + playing technique */ 'eVA', 'eFM', 'eWT', 'eADD', 'ePD', 'eFOLD', 'eRING', 'eGRAN', 'eNRES', 'engMix', 'pwm', 'fmOps', 'fmFb', 'fmR2', 'wtPos', 'wtScan', 'addTilt', 'addSpread', 'pdAmt', 'fold', 'lpg', 'ringR', 'granDens', 'granSize', 'trem', 'techRate', 'gliss', 'drone',
  /* attraction to each effect item kind */ 'aRev', 'aDly', 'aDst', 'aGlt', 'aCho', 'aTrm', 'aCmb', 'aPit'];
RS.ENGINES = ['eVA', 'eFM', 'eWT', 'eADD', 'ePD', 'eFOLD', 'eRING', 'eGRAN', 'eNRES'];
RS.IG = {}; RS.INST_GENES.forEach((k, i) => { RS.IG[k] = 172 + i; });
// named gene indices for the new regions (the DNA stave = 107..122: the encoded motif)
RS.GI = { mode: 96, tuning: 97, micro: 98, stepLeap: 99, prefIv: 100, consTol: 101, meter: 102, subdiv: 103, syncop: 104, swing: 105, precision: 106, motifP: 107, motifD: 115, range: 123, role: 124, improv: 125, ornament: 126, dynRange: 127,
  sight: 128, hearing: 129, vibration: 130, touch: 131, chem: 132, uv: 133, ir: 134, echo: 135,
  lifespan: 136, metabolism: 137, growthRate: 138, fertility: 139, mutRate: 140, competitive: 141, patience: 142, memory: 143, creativity: 144, leadership: 145, empathy: 146, tempTol: 147, gravTol: 148,
  aquatic: 149, energySrc: 150, loudness: 151, purity: 152, symmetry: 153, regen: 154, fusionAff: 155, builder: 156, learnRate: 157, conformity: 158, vacuumTol: 159, atmoAff: 160, chameleon: 161, spark: 162, texture: 163,
  size: 0, curiosity: 64, shyness: 65, social: 66, hunger: 67, rhythm: 71, territory: 73, mimic: 77, lightLove: 68, waterLove: 69, instrLove: 70, wander: 72, play: 74, calm: 75, chorus: 76, night: 78, bold: 79, glow: 38, clear: 24, clear2: 25, buoy: 29, mass: 22, stiff: 20, reg: 82, vib: 84 , keyG: 164, tempoG: 165, phaseG: 166, regG: 167 };
RS.MUTATION = false;   // single flag: spontaneous mutation off until the base music is good (player DNA edits pass force=true)
RS.regionOf = i => RS.GENE_REGIONS.find(r => i >= r.a && i < r.b);
RS.Genome = {
  NG,
  random: seed => { const r = RS.rng(seed >>> 0), g = new Float32Array(NG); for (let i = 0; i < HN; i++) g[i] = r(); RS.Genome.fillTuning(g); RS.Genome.fillVocal(g); RS.Genome.fillInst(g); RS.Genome.fillGift(g); return g; },
  /* v0.8b6: gene 240 = gift (teacher aura cue only, no play effect); its own hash stream so no other gene moves */ fillGift: g => { g[GIFT] = RS.rng((RS.Genome.hash(g) ^ 0x61f7) >>> 0)() * .9999; return g; },
  // instrument genes for fresh or pre-v0.3 genomes: deterministic from the genome hash. Complexity is skewed so only a few creatures are virtuosic.
  fillInst: (g, from = 0, salt = 0) => { const r = RS.rng((RS.Genome.hash(g) ^ 0x1257 ^ (salt * 0x9e3779b1)) >>> 0), keep = from ? Array.from(g.slice(IN, IN + from)) : null; for (let k = 0; k < 32; k++) g[IN + k] = r() * .9999; g[RS.IG.perc] = (r() < .21 ? .72 + r() * .28 : r() * .55) * .9999;   /* ~1 in 5 lean strongly percussive (continuous, never a class) */ g[RS.IG.complexity] = Math.pow(r(), 1.7) * .9999; g[RS.IG.att] = Math.pow(g[RS.IG.att], 1.6); g[RS.IG.lfoP] = Math.pow(g[RS.IG.lfoP], 1.5); { const r2 = RS.rng((RS.Genome.hash(g) ^ 0x5e7a ^ (salt * 0x85ebca6b)) >>> 0), I = RS.IG; for (let k = 32; k < 68; k++) g[IN + k] = r2() * .9999;
      /* engines are SPARSE: one dominant engine (or the physical models), sometimes a second; so two creatures rarely share a voice */
      const E = RS.ENGINES, prim = Math.floor(r2() * (E.length + 3)); for (const e of E) g[I[e]] = r2() * .22; if (prim < E.length) { g[I[E[prim]]] = .72 + r2() * .27; g[I.engMix] = r2() * .35; } else g[I.engMix] = .7 + r2() * .29;
      if (r2() < .45) { const e2 = I[E[Math.floor(r2() * E.length)]]; g[e2] = Math.max(g[e2], .4 + r2() * .3); }
      RS.Genome.archetype(g, RS.rng((RS.Genome.hash(g) ^ 0xa7c3 ^ (salt * 0xc2b2ae35)) >>> 0));   /* v0.3.1: a distinct instrument ARCHETYPE first, then extreme-favouring values inside it */
      if (g[I.perc] > .7) g[I.engMix] = Math.max(g[I.engMix], .6 + r2() * .3);   /* drummers stay mostly physical (membranes / bars) */
      g[I.trem] = Math.pow(r2(), 2.2) * .9999; g[I.gliss] = Math.pow(r2(), 1.8) * .9999; g[I.drone] = Math.pow(r2(), 2.4) * .9999;
      { const A = RS.Genome.ARCH.find(a => a.id === g.arch); if (A && A.post && g[I.perc] <= .7) for (const k in A.post) { const [lo, hi] = A.post[k]; g[I[k]] = (lo + (hi - lo) * r2()) * .9999; } }
      if (g[I.perc] > .7) RS.Genome.drumGenes(g, RS.rng((RS.Genome.hash(g) ^ 0xd2a1 ^ (salt * 0x27d4eb2f)) >>> 0)); }
    if (keep) for (let k = 0; k < from; k++) g[IN + k] = keep[k];
    { const sn = RS.Genome.fromCode(RS.Genome.toCode(g)); for (let i = IN; i < NG; i++) g[i] = sn[i]; }   // v0.3.1: the live instrument genes = what the save stores (an edit + undo lands exactly back)
    return g; },
  // v0.3.1 TIMBRE SPREAD: 11 instrument archetypes (pluck, pad, lead, bell, reed/breath, bass synth, organ/glass, grit, grain cloud, singer,
  // struck/physical). Each sets RANGES for the character genes and picks its engine; values inside a range use an arcsine (beta .5,.5) shape so
  // they favour the extremes instead of clustering mid-range. Deterministic from the genome (spawn-time, not mutation). Drummers keep theirs.
  ARCH: [
    { id: 'pluck', eng: ['eVA', 'eWT', 'eADD'], att: [0, .06], dec: [.15, .45], sus: [0, .12], rel: [.05, .3], cut: [.55, .95], fenv: [.5, 1], lfoA: [0, .2], reso: [.1, .6] },
    { id: 'pad', eng: ['eWT', 'eVA', 'eADD'], att: [.6, 1], dec: [.5, 1], sus: [.75, 1], rel: [.6, 1], cut: [.2, .55], lfoA: [.2, .6], detune: [.55, 1], reso: [0, .4] },
    { id: 'lead', eng: ['eVA', 'eFM', 'ePD'], att: [.04, .25], dec: [.3, .7], sus: [.6, .9], rel: [.2, .5], cut: [.6, 1], reso: [.4, .95], lfoA: [.45, .95], sat: [.3, .8] },
    { id: 'bell', eng: ['eFM', 'eRING', 'eADD'], att: [0, .04], dec: [.7, 1], sus: [0, .1], rel: [.6, 1], inharm: [.6, 1], cut: [.6, 1], fmI: [.5, 1] },
    { id: 'reed', eng: ['ePD', 'eNRES', 'eVA'], att: [.15, .5], noise: [.45, .9], sus: [.6, .9], formant: [.5, 1], cut: [.35, .7], lfoA: [.3, .7], pdAmt: [.5, 1] },
    { id: 'bass', eng: ['eVA', 'eFOLD', 'ePD'], att: [0, .1], dec: [.3, .6], sus: [.5, .9], cut: [.12, .42], reso: [.5, 1], sat: [.5, 1], fenv: [.4, .9] },
    { id: 'organ', eng: ['eADD', 'eWT'], att: [.08, .3], sus: [.9, 1], rel: [.1, .3], cut: [.7, 1], addTilt: [0, .35], lfoA: [0, .3] },
    { id: 'grit', eng: ['eFOLD', 'eRING'], att: [0, .2], sat: [.6, 1], fold: [.6, 1], cut: [.4, .9], reso: [.3, .8], lpg: [.4, 1] },
    { id: 'grain', eng: ['eGRAN'], att: [.4, .9], sus: [.6, 1], rel: [.5, 1], granDens: [.5, 1], granSize: [.3, 1], cut: [.3, .8] },
    { id: 'singer', eng: ['eVA', 'eADD'], att: [.1, .35], sus: [.6, .9], lfoA: [.4, .8], cut: [.4, .8], tract: [.72, .95] },
    { id: 'struck', eng: null, att: [0, .05], dec: [.4, .9], sus: [0, .3], cut: [.4, 1], bodyRes: [0, 1] },
    /* v0.3.2: the palette widens (textures, physical families, sub, folded leads) */
    { id: 'drone', eng: ['eADD', 'eWT', 'eVA'], tex: 1, att: [.6, 1], dec: [.7, 1], sus: [.9, 1], rel: [.75, 1], cut: [.15, .5], lfoA: [.1, .4], lfoF: [.2, .6], detune: [.3, .8], post: { drone: [.75, 1] } },
    { id: 'wind', eng: ['eNRES'], tex: 1, att: [.55, 1], sus: [.7, 1], rel: [.6, 1], noise: [.75, 1], noiseCol: [.2, .8], reso: [.55, 1], cut: [.3, .8], lfoA: [.3, .8] },
    { id: 'shimmer', eng: ['eGRAN', 'eADD'], tex: 1, att: [.5, .9], sus: [.6, 1], rel: [.7, 1], granDens: [.75, 1], granSize: [0, .3], cut: [.7, 1], addTilt: [0, .3] },
    { id: 'movepad', eng: ['eWT', 'eVA'], tex: 1, att: [.6, 1], sus: [.8, 1], rel: [.6, 1], lfoA: [.5, 1], lfoF: [.5, 1], wtScan: [.65, 1], detune: [.6, 1], cut: [.25, .6] },
    { id: 'bowed', eng: null, exc: [.57, .63], res: [0, .06], att: [.35, .75], sus: [.7, 1], rel: [.4, .8], lfoP: [.2, .5], cut: [.4, .8], post: { trem: [0, .4] } },
    { id: 'mallet', eng: null, exc: [.17, .23], res: [.22, .28], inharm: [0, .3], att: [0, .03], dec: [.45, .8], sus: [0, .05], rel: [.2, .5], cut: [.5, .9] },
    { id: 'harp', eng: null, exc: [0, .04], res: [0, .06], att: [0, .03], dec: [.35, .75], sus: [0, .1], rel: [.3, .7], cut: [.5, 1] },
    { id: 'pipe', eng: null, exc: [.77, .83], res: [.72, .78], att: [.15, .45], sus: [.7, 1], noise: [.3, .6], cut: [.35, .7], lfoA: [.2, .6] },
    { id: 'glass', eng: ['eFM', 'eADD'], att: [0, .03], dec: [.6, 1], sus: [0, .08], rel: [.7, 1], inharm: [.75, 1], cut: [.8, 1], fmI: [.1, .4], fmR: [.7, 1] },
    { id: 'choir', eng: ['eADD', 'eWT'], att: [.3, .6], sus: [.8, 1], rel: [.4, .8], formant: [.3, .85], lfoA: [.3, .6], cut: [.3, .6], tract: [.55, .8] },
    { id: 'sub', eng: ['eVA', 'eWT'], att: [0, .08], dec: [.4, .8], sus: [.7, 1], cut: [0, .2], reso: [0, .25], sat: [0, .25], wtPos: [0, .1], fenv: [0, .3] },
    { id: 'foldlead', eng: ['eFOLD', 'ePD'], att: [0, .12], sus: [.6, .9], rel: [.15, .4], fold: [.7, 1], sat: [.6, 1], cut: [.6, 1], reso: [.3, .7], lfoA: [.4, .8] } ],
  archetype: (g, r, id) => { const I = RS.IG, E = RS.ENGINES; if (g[I.perc] > .7) return null; const A = (id && RS.Genome.ARCH.find(a => a.id === id)) || RS.Genome.ARCH[Math.floor(r() * RS.Genome.ARCH.length)], as = u => (1 - Math.cos(Math.PI * u)) / 2;
    for (const k in A) { if (k === 'id' || k === 'eng' || k === 'tex' || k === 'post') continue; const [lo, hi] = A[k], v = (lo + (hi - lo) * as(r())) * .9999; if (k === 'tract') g[168] = v; else if (I[k] != null) g[I[k]] = v; }
    for (const k of ['fmI', 'fold', 'reso', 'cut', 'att', 'wtPos', 'pdAmt', 'ringR', 'lfoR', 'noiseCol']) if (A[k] == null && I[k] != null) g[I[k]] = as(g[I[k]]) * .9999;   // the rest: extreme-favouring too
    if (A.id !== 'singer' && A.id !== 'choir' && g[168] > .5) g[168] = .1 + r() * .3;   // only singers sing through the tract
    for (const e of E) g[I[e]] = Math.min(g[I[e]], .22); if (A.eng) { g[I[A.eng[Math.floor(r() * A.eng.length)]]] = .75 + r() * .24; g[I.engMix] = r() * .2; } else g[I.engMix] = .8 + r() * .19;
    g.arch = A.id; return A.id; },
  // v0.3.2 PERCUSSION SPECIALISATION (creation only): a drummer is born as one drum type, written into its own percussion genes so it is a genome
  // trait (RS.Inst.drumType reads it back): kick (low, punchy), snare / clap (noise body), hats / shakers (metal or seed, short), toms / woodblock (tuned), full kit.
  DRUMS: ['kick', 'snare', 'hat', 'tom', 'kit'],
  drumGenes: (g, r, type) => { const I = RS.IG, t = type || ['kick', 'kick', 'snare', 'snare', 'hat', 'hat', 'tom', 'kit', 'kit'][Math.floor(r() * 9)], u = (a, b) => (a + (b - a) * r()) * .9999;
    if (t === 'hat') { g[I.bodyRes] = u(.74, 1); g[I.pitched] = u(0, .45); g[I.transient] = u(.3, 1); }
    else if (t === 'tom') { g[I.bodyRes] = u(0, .68); g[I.pitched] = u(.64, 1); g[I.transient] = u(.25, 1); }
    else if (t === 'snare') { g[I.bodyRes] = u(.2, .7); g[I.pitched] = u(0, .5); g[I.transient] = u(.7, 1); }
    else if (t === 'kit') { g[I.bodyRes] = u(0, .7); g[I.pitched] = u(0, .55); g[I.transient] = u(0, .2); g[I.complexity] = Math.max(g[I.complexity], u(.35, .9)); }
    else { g[I.bodyRes] = u(0, .7); g[I.pitched] = u(0, .55); g[I.transient] = u(.24, .66); }
    return t; },
  // vocal genes for genomes that predate them: deterministic from the genome hash; most creatures get a little tract, few a lot (cubic skew)
  fillVocal: g => { const r = RS.rng(RS.Genome.hash(g) ^ 0x70ca1); g[168] = .04 + .9 * Math.pow(r(), 3); g[169] = r(); g[170] = Math.pow(r(), 2) * .8; g[171] = r(); return g; },
  // the 4 tuning genes of a fresh (or pre-v0.2) genome: same key/tempo distribution as v0.1 (derived from the other genes), phase 0, register 0
  fillTuning: g => { const r = RS.rng(RS.Genome.hash(g) ^ 0x5bd1), k = r(); const keyC = k < .45 ? 0 : k < .7 ? r.pick([500, 700, -500, -700]) : k < .9 ? r.pick([200, -200, 300, -300, 400, -400, 600, -100, 100]) : Math.round(r.range(-300, 300)); const t = r(), tempo = t < .45 ? 1 : r.pick([.67, .75, .85, 1.15, 1.25, 1.33, 1.5]);   /* v0.3.2: a wider spread of keys and tempi at creation */
    const E = RS.Genome.enc; g[164] = E.key(keyC); g[165] = E.tempo(tempo); g[166] = E.phase(0); g[167] = E.reg(0); return g; },
  // encodings (continuous, invertible) for the learned traits
  enc: { key: c => RS.clamp((c + 1200) / 2400, 0, .9999), tempo: t => RS.clamp((Math.log2(t) + 1) / 2, 0, .9999), phase: p => ((p % 1) + 1) % 1 * .9999, reg: c => RS.clamp((c + 2400) / 4800, 0, .9999),
    deg: d => d == null ? .03 : RS.clamp(.062 + (d + 6) / 15 * .94, .062, .9999) },   /* .062: float32 of .06 decoded as a rest (fixed) */
  dec: { key: g => g * 2400 - 1200, tempo: g => Math.pow(2, g * 2 - 1), phase: g => g / .9999, reg: g => g * 4800 - 2400 },
  // v0.3.2 clay: the voices the twist steps through (every archetype, the five drum types, the textures last), and a way to set one
  VOICES: ['bell', 'pluck', 'pad', 'reed', 'singer', 'choir', 'lead', 'organ', 'glass', 'mallet', 'harp', 'bowed', 'pipe', 'struck', 'bass', 'sub', 'grit', 'foldlead', 'grain', 'drum:kick', 'drum:snare', 'drum:hat', 'drum:tom', 'drum:kit', 'drone', 'wind', 'shimmer', 'movepad'],
  voiceOf: g => g[RS.IG.perc] > .7 ? 'drum:' + RS.Inst.drumType(g) : (g.arch || null),
  // v0.8a9 (Wilbow 12:07): a default spiral ohm's voice = any of the 9 engines (a shuffled 9-card deck, so they spread evenly), an optional second
  // engine, the physical part kept small, tonal. The archetype's envelope stays (it is already a wide spread); only the source is re-dealt.
  _deck: [], deal: r => { const D = RS.Genome; if (!D._deck.length) { const d = [0, 1, 2, 3, 4, 5, 6, 7, 8]; for (let k = 8; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [d[k], d[j]] = [d[j], d[k]]; } D._deck = d; } return D._deck.pop(); },
  spinDefault: (g, r) => { const I = RS.IG, E = RS.ENGINES, e0 = E[RS.Genome.deal(r)]; for (const e of E) g[I[e]] = r() * .2; g[I[e0]] = (.72 + r() * .27) * .9999; const e1 = E[Math.floor(r() * 9)];
    if (r() < .38 && e1 !== e0 && e0 !== 'eNRES' && e1 !== 'eNRES') g[I[e1]] = (.34 + r() * .3) * .9999; g[I.engMix] = r() * .3 * .9999; g[I.perc] = Math.min(g[I.perc], r() * .45); g[I.inharm] = Math.min(g[I.inharm], .5); g.arch = g.arch || null; return g; },
  setVoice: (g, id, r) => { const I = RS.IG; r = r || RS.rng(RS.Genome.hash(g) ^ 0x3c1a); if (id.startsWith('drum:')) { g[I.perc] = (.76 + r() * .22) * .9999; RS.Genome.drumGenes(g, r, id.slice(5)); g[I.engMix] = Math.max(g[I.engMix], .6 + r() * .3); g.arch = null; }
    else { g[I.perc] = Math.min(g[I.perc], .55 * r()) ; RS.Genome.archetype(g, r, id); const A = RS.Genome.ARCH.find(a => a.id === id); if (A && A.post) for (const k in A.post) { const [lo, hi] = A.post[k]; g[I[k]] = (lo + (hi - lo) * r()) * .9999; } }
    return RS.Genome.snap(g); },
  SIBS: (() => { const o = {}, grp = [['drum:kick', 'drum:snare', 'drum:hat', 'drum:tom', 'drum:kit'], ['drone', 'sub', 'bowed'], ['pad', 'shimmer', 'movepad', 'choir', 'wind', 'drone'], ['struck', 'mallet', 'harp'], ['bell', 'pluck', 'organ', 'glass', 'singer']]; for (const G of grp) for (const v of G) o[v] = (o[v] || []).concat(G); return o; })(),   /* v0.4a: same spiral-reading branch, for distinctness fallback */
  snap: g => { const a = g.arch, sp = g.spun, sn = RS.Genome.fromCode(RS.Genome.toCode(g)); for (let i = 0; i < NG; i++) g[i] = sn[i]; g.arch = a; if (sp) g.spun = sp; return g; },
  // a drawn spiral seeds a genome: stroke features + system seed + time hash -> the same drawing never makes the same creature twice
  fromStroke: (feat, sysSeed, salt) => { const h = RS.hash('stroke', sysSeed, salt || Date.now(), feat.size, feat.speed, feat.turns, feat.cx, feat.cy, feat.dir); const g = RS.Genome.random(h);
    // features bias their genes (size -> size gene, speed -> muscle freq/energy, turns -> segments, tightness -> outline detail, direction -> symmetry)
    const mix = (i, v, w = .6) => { g[i] = RS.clamp(g[i] * (1 - w) + v * w, 0, .9999); };
    mix(0, RS.clamp(feat.size / 160, 0, 1)); mix(48, RS.clamp(feat.speed / 1.6, 0, 1), .5); mix(1, RS.clamp((feat.turns - 1.3) / 2.5, 0, 1), .5); mix(2, feat.dir > 0 ? .25 : .75, .3); mix(80 + 2, 1 - RS.clamp(feat.size / 160, 0, 1), .4);
    if (feat.read) RS.Genome.readStroke(g, feat.read, RS.rng(h ^ 0x51a7), feat);
    return g; },
  /* v0.6.2 LIGHT ENVIRONMENT LEAN at birth (spiral spawns and clay hatches). e = the birthplace: echo, hollow, cave, moist, pool, hard, wind, rich, wear (0..1).
     Each lean pulls a gene a small way (weight <= LEAN_W, scaled by how far the place is from neutral) toward a target. Never touches genes the stroke set
     (g.spun.set), the drum-type genes, or the voice family (perc stays on its side of .7, and the whole lean is undone if voiceOf would change). No themes. */
  LEAN_W: .18,
  lean: (g, e) => { if (!g || !e) return null; const I = RS.IG, GI = RS.GI, set = (g.spun && g.spun.set) || new Set(), v0 = RS.Genome.voiceOf(g), keep = Array.from(g), W = RS.Genome.LEAN_W, out = {},
      drum = g[I.perc] > .7, lock = new Set([I.perc, I.pitched, I.transient, I.bodyRes]), pos = v => RS.clamp((v - .5) * 2, 0, 1),
      pull = (i, tgt, k) => { if (set.has(i) || (drum && lock.has(i)) || !(k > .02)) return; const w = W * Math.min(1, k); g[i] = RS.clamp(g[i] * (1 - w) + tgt * w, 0, .9999); out[i] = (out[i] || 0) + w; };
    const dark = Math.max(pos(e.echo), pos(e.hollow), e.cave || 0), wet = Math.max(pos(e.moist), e.pool || 0), hard = pos(e.hard), wind = pos(e.wind), rich = RS.clamp(e.rich || 0, 0, 1), worn = RS.clamp(e.wear || 0, 0, 1);
    /* the spiral reading already owns many of the obvious genes (cut, rel, sus, sat, noise, purity, aquatic...), so each lean has free partners it can use instead */
    pull(I.cut, .2, dark); pull(I.rel, .85, dark); pull(I.dec, .8, dark); pull(I.fenv, .15, dark);                      // echo / hollow / cave: darker, longer release
    pull(I.att, .45, wet * .7); pull(I.reso, .15, wet * .6); pull(I.sat, .05, wet * .6); pull(GI.aquatic, .9, wet); pull(GI.waterLove || 69, .85, wet); pull(GI.purity, .75, wet * .5);   // moist / pool: softer, rounder, toward swimmers
    pull(I.att, .02, hard); pull(I.fdec, .1, hard * .7); pull(I.sus, .15, hard * .7); if (!drum) { pull(I.transient, .85, hard * .7); const p0 = g[I.perc]; pull(I.perc, .69, hard * .5); if (p0 <= .7) g[I.perc] = Math.min(g[I.perc], .699); }   // hard ground: sharper attack, more percussive
    pull(I.noise, .6, wind * .7); pull(I.noiseCol, .7, wind * .6); pull(I.lfoA, .45, wind * .4);   // wind: slightly breathy, blown
    pull(GI.purity, .9, rich); pull(I.noise, .1, rich * .5); pull(I.detune, .1, rich * .5); pull(I.sat, .45, worn); pull(GI.purity, .3, worn * .7); pull(I.detune, .55, worn * .6);   // rich ground: purer; worn: slight grit
    if (RS.Genome.voiceOf(g) !== v0) { for (let i = 0; i < keep.length; i++) g[i] = keep[i]; return { undone: true }; }
    return out; },
  // v0.3.2 RICHER SPIRAL READING (creation only; strong weights, the hash keeps the randomness): how the spiral was drawn shapes the voice.
  // weight (pressure, else slowness) -> size / mass / loudness / low register; wobble -> grit + syncopation (smooth = pure + steady);
  // tight turns -> a compact drummer, loose -> a pad or drone; speed trend -> pluck (fast->slow) or swell (slow->fast); pauses -> motif rhythm;
  // screen height -> floater + high register / crawler + low; shape round / oval / square -> body aspect + outline and tonal vs percussive.
  readStroke: (g, R, r, feat = {}) => { const I = RS.IG, cl = v => RS.clamp(v, 0, .9999), SET = new Set(), mix = (i, v, w = .75) => { SET.add(i); g[i] = cl(g[i] * (1 - w) + v * w); }, W = R.weight, Wb = R.wobble, Tt = R.tight;
    const sizeN = RS.clamp((feat.size || 60) / 160, 0, 1);
    mix(0, .4 * sizeN + .6 * W); mix(22, W); mix(151, .15 + .8 * W); mix(123, RS.clamp(.55 - .45 * W + .45 * (1 - R.hy) - .2, 0, 1), .7);
    mix(29, RS.clamp(1.1 - R.hy * 1.3, 0, 1), .8); mix(30, R.hy, .6); mix(149, 1 - R.hy, .3);
    mix(8, RS.clamp((R.asp - .6) / 1.1, 0, 1), .8); mix(11, .5 + .45 * R.sq, .85); mix(9, .5 + .3 * R.oval, .6);
    // voice class first (it rewrites the instrument genes), then the character genes on top
    const cur = RS.Genome.voiceOf(g); let want = null;
    if (Tt > .74 || (R.sq > .6 && Tt > .55)) want = 'drum:' + (W > .66 ? 'kick' : W < .33 && Wb < .5 ? 'hat' : Wb > .55 ? 'snare' : R.sq > .5 ? 'tom' : r.pick(['kit', 'tom', 'snare', 'kick', 'hat']));
    else if (Tt < .26) want = W > .6 ? r.pick(['drone', 'sub', 'bowed']) : W < .35 ? r.pick(['pad', 'shimmer', 'movepad', 'choir']) : r.pick(['pad', 'drone', 'movepad', 'wind']);
    else if (R.sq > .55) want = r.pick(['struck', 'mallet', 'harp']);
    else if (cur && cur.startsWith('drum:') && R.round > .5) want = r.pick(['bell', 'pluck', 'organ', 'glass', 'singer']);
    if (want && want !== cur) RS.Genome.setVoice(g, want, r);
    const dflt = !want && !(feat && feat.keepVoice); if (dflt) RS.Genome.spinDefault(g, r);   /* v0.8a9 (Wilbow 12:07): the default reading gets a fully random engine voice; the stroke and birthplace still lean it below */
    g.spun = { voice: want, set: SET, dflt };   /* v0.3.2: what the spiral chose; Sf.distinct re-rolls only the rest (and keeps this family) */
    const tonal = g[I.perc] <= .7;
    mix(RS.GI.purity, 1 - Wb); mix(I.noise, Wb * .85, .6); mix(I.fold, Wb, .7); mix(I.sat, .15 + .8 * Wb, .6); mix(I.inharm, Wb * .8, .5); mix(I.lpg, Wb, .4);
    mix(RS.GI.syncop, Wb, .8); mix(RS.GI.precision, 1 - .7 * Wb, .6); if (Wb > .6 && tonal) { const e = RS.IG.eFOLD; SET.add(e); g[e] = Math.max(g[e], .45 + Wb * .4); }
    if (tonal) { mix(I.sus, 1 - Tt, .5); mix(I.rel, 1 - Tt, .45); mix(I.perc, Tt * .66, .45); }
    if (R.trend > .2) { mix(I.att, 0, .85 * Math.min(1, R.trend * 1.6)); mix(I.rel, .9, .7 * Math.min(1, R.trend * 1.6)); if (tonal) mix(I.sus, .1, .5); }
    else if (R.trend < -.2) { mix(I.att, .92, .85 * Math.min(1, -R.trend * 1.6)); if (tonal) mix(I.sus, .85, .6); }
    mix(I.cut, RS.clamp(.35 + .5 * (1 - W) + .15 * (1 - R.hy), 0, 1), .5);
    if (R.durs && R.durs.length) for (let k = 0; k < 8; k++) SET.add(115 + k), g[115 + k] = RS.Mind ? RS.Mind.encDur(R.durs[k % R.durs.length]) : g[115 + k];
    if (tonal) g[I.perc] = Math.min(g[I.perc], .69); return RS.Genome.snap(g); },
  // natural (rare) life: genome from the system seed, adapted to its world
  fromWorld: (sysSeed, env) => { const g = RS.Genome.random(RS.hash('life', sysSeed)); g[32] = RS.clamp((env.starWl - 400) / 300, 0, .999); g[51] = env.wet > .5 ? .1 : .6; g[69] = .8;
    // natural life is where the rare abilities live: half of all natural lineages carry one
    const r = RS.rng(RS.hash('lifeab', sysSeed)); if (RS.Abilities && r() < .5) RS.Abilities.grant(g, r.pick(RS.Abilities.IDS), r); return g; },
  crossover: (a, b, seed) => { const r = RS.rng(seed >>> 0), c = new Float32Array(NG); let src = r() < .5 ? a : b;
    for (let i = 0; i < NG; i++) { if (r() < .18) src = src === a ? b : a; c[i] = src[i]; }   // linked blocks: genes travel in runs
    // the motif crosses over musically: antecedent half from one parent, consequent half from the other (pitch + rhythm together)
    const first = r() < .5 ? a : b, second = first === a ? b : a; for (let k = 0; k < 8; k++) { const s2 = k < 4 ? first : second; c[107 + k] = s2[107 + k]; c[115 + k] = s2[115 + k]; }
    c.src = 'crossover'; return c; },
  // mutation scaled by the mutation-rate gene; the motif mutates musically (transposition, inversion, note substitution) rather than as noise
  mutate: (g, seed, rate = .12, sigma = .03, big = .02, force = false) => { if (!RS.MUTATION && !force) { const m = new Float32Array(g); m.op = null; return m; } const r = RS.rng(seed >>> 0), m = new Float32Array(g), mr = .5 + (g[140] || .5); rate *= mr; big *= mr;
    for (let i = 0; i < NG; i++) { if (i >= 107 && i < 115) continue; if (r() < big) m[i] = r(); else if (r() < rate) m[i] = RS.clamp(m[i] + r.gauss() * sigma, 0, .9999); }
    const mo = RS.Genome.motifOf(m); let op = null; const u = r();
    if (u < .07 * mr) { op = 'transpose'; const k = r.pick([-2, -1, 1, 2]); mo.p = mo.p.map(x => x == null ? x : x + k); }
    else if (u < .11 * mr) { op = 'invert'; const a = mo.p.find(x => x != null) || 0; mo.p = mo.p.map(x => x == null ? x : 2 * a - x); }
    else if (u < .2 * mr) { op = 'substitute'; const i = r.int(0, 7); mo.p[i] = mo.p[i] == null ? r.int(-3, 5) : mo.p[i] + r.pick([-1, 1, 2, -2]); }
    if (op) RS.Genome.setMotif(m, mo); m.op = op; return m; },
  // motif <-> genes: 8 pitches (scale steps -6..+9, low values = rest) and 8 durations (1,2,3,4,6 sixteenths)
  motifOf: g => { const p = [], d = []; for (let k = 0; k < 8; k++) { const v = g[107 + k]; p.push(v < .06 ? null : Math.round(-6 + (v - .06) / .94 * 15)); d.push([1, 2, 2, 3, 4, 6][Math.min(5, Math.floor(g[115 + k] * 6))]); } return { p, d }; },
  setMotif: (g, mo) => { for (let k = 0; k < 8; k++) { const x = mo.p[k]; g[107 + k] = x == null ? .03 : RS.clamp(.06 + (RS.clamp(Math.round(x), -6, 9) + 6) / 15 * .94, .061, .9999); } },
  toCode: g => { let s = ''; for (let i = 0; i < TN; i++) s += String.fromCharCode(Math.round(RS.clamp(g[i], 0, .9999) * 255)); for (let i = HN; i < TN; i++) { const v = Math.round(RS.clamp(g[i], 0, .9999) * 65535); s += String.fromCharCode(v >> 8, v & 255); } /* tuning genes: 16-bit */ for (let i = TN; i < NG; i++) s += String.fromCharCode(Math.round(RS.clamp(g[i] || 0, 0, .9999) * 255)); const b = (typeof btoa !== 'undefined' ? btoa(s) : Buffer.from(s, 'latin1').toString('base64')); return b.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); },
  fromCode: c => { let s = c.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '='; const d = typeof atob !== 'undefined' ? atob(s) : Buffer.from(s, 'base64').toString('latin1'); const g = new Float32Array(NG); for (let i = 0; i < TN; i++) g[i] = (d.charCodeAt(i) || 0) / 255 + 1 / 512; if (d.length < TN) RS.Genome.fillTuning(g); else if (d.length >= TN + 8) for (let i = HN; i < TN; i++) { const k = TN + (i - HN) * 2; g[i] = ((d.charCodeAt(k) << 8) | d.charCodeAt(k + 1)) / 65535; }
    if (d.length >= TN + 8 + 4) for (let i = TN; i < IN; i++) g[i] = Math.min(.9999, d.charCodeAt(TN + 8 + i - TN) / 255 + 1 / 512);   /* v0.3.1 fix: a stored 255 decoded to 1.002 (> 1) and indexed past table ends (NaN ring voice) */ else RS.Genome.fillVocal(g);
    { const haveAll = Math.max(0, Math.min(NG - IN, d.length - (TN + 8 + (IN - TN)))), have = Math.min(haveAll, GIFT - IN); for (let i = IN; i < IN + have; i++) g[i] = Math.min(.9999, d.charCodeAt(TN + 8 + i - TN) / 255 + 1 / 512);   /* v0.3.1 fix: a stored 255 decoded to 1.002 (> 1) and indexed past table ends (NaN ring voice) */ if (have < GIFT - IN) RS.Genome.fillInst(g, have >= 32 ? have : 0); if (haveAll > GIFT - IN) g[GIFT] = Math.min(.9999, d.charCodeAt(TN + 8 + GIFT - TN) / 255 + 1 / 512); else RS.Genome.fillGift(g); } return g; },   /* older codes: missing engine/attraction genes are filled deterministically, the stored ones are kept */
  hash: g => { let h = 2166136261; for (let i = 0; i < HN; i++) { h ^= Math.round(RS.clamp(g[i], 0, .9999) * 255); h = Math.imul(h, 16777619); } return h >>> 0; },
  name: g => { const h = RS.Genome.hash(g), C = 'bdfghklmnprstvwz', V = 'aeiouy', r = RS.rng(h); let n = ''; const syl = 2 + (h % 2); for (let i = 0; i < syl; i++) n += C[r.int(0, 15)] + V[r.int(0, 5)] + (r() < .25 ? 'n' : ''); return n[0].toUpperCase() + n.slice(1); },
  // ---- phenotype: everything is derived here once and cached per creature ----
  express: (g, env = {}) => { const P = {}; const L = (i, a, b) => a + (b - a) * g[i];
    // body plan
    P.size = L(0, 14, 46); P.segments = 1 + Math.floor(g[1] * 4.99); P.radial = g[2] > .62; P.symN = P.radial ? 3 + Math.floor(g[3] * 5.99) : 2;
    P.limbs = Math.floor(g[4] * 7.99) * (g[5] > .2 ? 1 : 0); P.limbLen = L(6, .4, 1.6); P.limbTaper = L(7, .2, .9); P.aspect = L(8, .6, 1.7);
    P.harm = []; for (let k = 0; k < 6; k++) P.harm.push({ a: (g[9 + k] - .5) * .5 * (k < 2 ? 1 : .6), ph: g[15 + k % 5] * RS.TAU });
    P.segTaper = L(15, .55, 1); P.headBulge = L(16, 0, .5); P.tail = g[17] > .7 ? L(18, .4, 1.4) : 0; P.eyes = Math.floor(g[19] * 3.99);
    // material
    P.stiff = L(20, .35, .95); P.pressure = L(21, .7, 1.15); P.mass = L(22, .5, 1.8); P.damp = L(23, .001, .012); P.clear = g[24] > .78 ? L(25, .5, 1) : g[25] * .35;   /* gene 25: translucency for everyone (fully clear bodies when 24 is high) */ P.nIdx = L(26, 1.2, 1.7);
    P.membrane = L(27, 2, 6); P.squish = L(28, .2, 1); P.buoy = L(29, 0, .95); P.fric = L(30, .1, .8); P.bendK = L(31, .1, .6);
    // colour & pattern (bioluminescence wavelength -> pitch class)
    P.wl = L(32, 410, 690); P.hueShift = (g[33] - .5) * 60; P.sat = L(34, .35, 1); P.pattern = Math.floor(g[35] * 3.99); P.patScale = L(36, 2, 9); P.contrast = L(37, .1, .8);
    P.glow = L(38, .1, 1); P.wl2 = L(39, 410, 690); P.spots = Math.floor(L(40, 0, 9)); P.stripeAng = g[41] * Math.PI; P.patSeed = Math.floor(g[42] * 1e6); P.light = L(43, .2, 1);
    P.rimW = L(44, .5, 3); P.pulse = L(45, .2, 2); P.irid = g[46]; P.dark = L(47, 0, .5);
    // locomotion (muscle springs)
    P.mFreq = L(48, .5, 3.2); P.mAmp = L(49, .04, .3); P.wave = L(50, 0, 2.5); P.style = ['swim', 'crawl', 'float', 'jet'][Math.floor(g[51] * 3.99)]; P.jetPeriod = L(52, .8, 3);
    P.gaitAsym = (g[53] - .5) * .6; P.maxSpeed = L(54, 30, 140); P.turn = L(55, .5, 3); P.limbPhase = g[56] * RS.TAU; P.limbAmp = L(57, .1, .9); P.hop = g[58] > .8 ? L(59, .3, 1) : 0; P.mAmp *= .55 + g[59] * .9;   /* gene 59: hop strength for hoppers, gait bounce (muscle amplitude) for all */
    P.rest = L(60, .1, .8); P.burst = L(61, 0, 1); P.climb = L(62, 0, 1); P.drag = L(63, .2, 1);
    // behaviour
    const B = P.beh = {}; ['curiosity', 'shyness', 'social', 'hunger', 'lightLove', 'waterLove', 'instrLove', 'rhythm', 'wander', 'territory', 'play', 'calm', 'chorus', 'mimic', 'night', 'bold'].forEach((k, i) => B[k] = g[64 + i]);
    // voice (formants from body resonance; register falls with size)
    P.reg = L(82, -1, 1.2); P.F1 = L(80, 280, 900); P.F2 = L(81, 800, 2600); P.bright = L(83, .2, 1); P.vib = L(84, 0, .02) * (.4 + g[98] * 1.6); P.vibR = L(85, 3, 7);
    P.motif = [0, 1, 2, 3].map(k => Math.floor(g[86 + k] * 9) - 4); P.density = L(90, .15, 1); P.callLen = L(91, .12, .9); P.breath = L(92, 0, .6); P.glideV = L(93, .9, 1.12); P.vdecay = L(94, .3, 1.6); P.syncop = g[95];
    P.f0 = 220 * Math.pow(2, P.reg) * Math.sqrt(26 / P.size);
    // ---- musicality (continuous) ----
    const MU = P.mus = {}; MU.mode = RS.Theory ? RS.Theory.modeFromGene(g[96]) : 'ionian'; MU.tuning = RS.Theory ? RS.Theory.tuningFromGene(g[97], g[98]) : { sys: '12tet', micro: 0 };
    MU.stepLeap = g[99]; MU.prefIv = [2, 3, 4, 5, 7][Math.min(4, Math.floor(g[100] * 5))]; MU.consTol = g[101]; MU.meter = RS.Theory ? RS.Theory.meterFromGene(g[102]) : '4/4'; MU.subdiv = [1, 2, 2, 3][Math.min(3, Math.floor(g[103] * 4))];
    MU.syncop = g[104]; MU.swing = g[105] * .22; MU.precision = g[106]; MU.motif = RS.Genome.motifOf(g); MU.range = 4 + Math.round(g[123] * 10); MU.role = g[124]; MU.improv = g[125]; MU.ornament = g[126]; MU.dynRange = .2 + g[127] * .8;
    // ---- senses: skewed so most see and hear; blindness/deafness are rare tails of the same gradient
    const SE = P.sense = { sight: Math.pow(g[128], .6), hearing: Math.pow(g[129], .6), vibration: g[130], touch: g[131], chem: g[132], uv: g[133], ir: g[134], echo: g[135] };
    SE.blind = SE.sight < .15; SE.deaf = SE.hearing < .15; SE.wlLo = 400 - SE.uv * 80; SE.wlHi = 700 + SE.ir * 120; SE.sightR = 80 + SE.sight * 420; SE.hearR = 60 + SE.hearing * 340;
    // ---- life history + temperament gradients
    const LI = P.life = {}; ['lifespan', 'metabolism', 'growthRate', 'fertility', 'mutRate', 'competitive', 'patience', 'memory', 'creativity', 'leadership', 'empathy', 'tempTol', 'gravTol', 'aquatic', 'energySrc', 'loudness', 'purity', 'symmetry', 'regen', 'fusionAff', 'builder', 'learnRate', 'conformity', 'vacuumTol', 'atmoAff', 'chameleon', 'spark', 'texture'].forEach((k, i) => LI[k] = g[136 + i]);
    LI.lifeSec = 600 + LI.lifespan * 5400; LI.drain = .004 + LI.metabolism * .02; LI.memLen = 2 + Math.round(LI.memory * 14);
    // symmetry gene strengthens the outline's symmetric harmonics; purity thins the voice's noise; loudness scales gain
    if (LI.symmetry > .7) for (const h of P.harm) h.a *= 1 - (LI.symmetry - .7); P.purity = LI.purity; P.loud = .55 + LI.loudness * .9;
    P.abil = RS.Abilities ? RS.Abilities.of(g) : [];
    // environment fit (gentle selection): biolum near the star colour, stiffness vs gravity, swimmers on wet worlds
    if (env.starWl) { const a = 1 - Math.min(1, Math.abs(P.wl - env.starWl) / 200), b = 1 - Math.abs(P.stiff - RS.clamp((env.g || 900) / 1400, .3, .95)), c = env.wet != null ? (P.style === 'swim' || P.style === 'float' ? env.wet : 1 - env.wet * .5) : .6; P.fit = RS.clamp((a + b + c) / 3, 0, 1); } else P.fit = .6;
    // vocal tract (continuous, not a class): how much of the voice goes through the articulatory tract, its length from body size, voice quality, nasality, agility
    { const vg = i => g[i] == null ? .3 : g[i]; P.tract = { amt: vg(168), tense: .3 + .65 * vg(169), nasal: vg(170), agil: .25 + .75 * vg(171), len: RS.clamp(.74 + (P.size - 12) / 50 * .5, .72, 1.28) }; }
    // instrument (v0.3): timbre-space coordinates; the look follows the sound (hue from resonator family, lightness from brightness, saturation from purity, spikes from a percussive attack)
    if (RS.Inst) { P.inst = RS.Inst.fromGenome(g); const lk = RS.Inst.look(P.inst); P.wl = P.wl * .25 + lk.wl * .75; P.sat = P.sat * .3 + lk.sat * .7; P.light = P.light * .3 + lk.light * .7; P.spiky = lk.spiky; P.softEdge = lk.soft; }
    /* v0.3.2: the 8 effect-attraction genes are expressed traits too (items.js reads the same values); before this they were read raw and the gene sweep called them dead */
    P.attract = {}; ['rev', 'dly', 'dst', 'glt', 'cho', 'trm', 'cmb', 'pit'].forEach((k, i) => { P.attract[k] = g[232 + i] == null ? .5 : g[232 + i]; });
    P.gift = g[GIFT] == null ? 0 : g[GIFT];   /* v0.8b6: the gift gene - odds of being gifted-born (teacher.js); an expressed trait, no sound or body effect */
    if (RS.Body) P.body = RS.Body.plan(g, P);   // v0.3.2 body plans (body.js): a plan + appendages from genes; never changes sound or f0
    return P; },
  // feature vector (normalised) for phenotype distance
  traits: P => [P.size / 46, P.segments / 5, P.radial ? 1 : 0, P.symN / 8, P.limbs / 8, P.limbLen / 1.6, P.aspect / 1.7, ...P.harm.map(h => h.a * 2 + .5), P.stiff, P.pressure - .5, P.mass / 1.8, P.clear,
    (P.wl - 400) / 300, P.sat, P.pattern / 4, P.patScale / 9, P.mFreq / 3.2, P.mAmp * 3, ['swim', 'crawl', 'float', 'jet'].indexOf(P.style) / 3, P.maxSpeed / 140,
    ...Object.values(P.beh), Math.log2(P.f0 / 110) / 4, P.F1 / 900, P.F2 / 2600, P.bright, ...P.motif.map(m => (m + 4) / 8), P.density,
    ...(P.mus ? [P.mus.stepLeap, P.mus.consTol, P.mus.syncop, P.mus.precision, P.mus.role, P.mus.improv, ...P.mus.motif.p.map(x => x == null ? -.2 : (x + 6) / 15)] : []), ...(P.sense ? [P.sense.sight, P.sense.hearing, P.sense.vibration, P.sense.echo] : []), ...(P.life ? Object.values(P.life).slice(0, 28).map(v => v > 1 ? 0 : v) : [])],
  dist: (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return Math.sqrt(s); },
};
})(typeof window !== 'undefined' ? window : globalThis);
