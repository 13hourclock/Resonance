'use strict';
// Phoneme layer for the vocal tract: text -> phonemes (small dictionary + letter-to-sound rules) -> syllables -> articulatory
// segments (tongue position/diameter, lip opening, constriction place/manner, voicing, velum, timing). Also the creature's
// own wordless syllables (from its genome), learned words (epigenetic song layer) and the main-thread tract voice budget.
(function (G) {
const RS = G.RS;
// vowel targets [tongue position 0..1 (back->front), tongue diameter (2.05 high .. 3.4 low), lip opening]; calibrated by LPC (tests/test_v2 VOX)
const VW = { AA: [.32, 2.4, 1], AE: [.56, 2.9, 1], AH: [.42, 2.6, .85], AO: [.36, 2.4, .6], EH: [.56, 2.4, 1], ER: [.5, 2.3, .8], IH: [.58, 2.3, 1], IY: [.64, 2.05, 1], UH: [.5, 2.1, .5], UW: [.45, 2.05, .3] };
const DIPH = { EY: ['EH', 'IY'], AY: ['AA', 'IY'], AW: ['AA', 'UW'], OW: ['AO', 'UW'], OY: ['AO', 'IY'] };
// consonants: x = constriction place (0 glottis .. 1 lips), d = diameter, man 1 stop / 2 fricative / 3 nasal / 4 approximant, vo = voiced, lip = lip opening override
const CN = { P: { x: .97, d: 3, man: 1, vo: 0, lip: 0 }, B: { x: .97, d: 3, man: 1, vo: 1, lip: 0 }, M: { x: .97, d: 3, man: 3, vo: 1, lip: 0 },
  T: { x: .8, d: 0, man: 1, vo: 0 }, D: { x: .8, d: 0, man: 1, vo: 1 }, N: { x: .8, d: 0, man: 3, vo: 1 }, K: { x: .55, d: 0, man: 1, vo: 0 }, G: { x: .55, d: 0, man: 1, vo: 1 }, NG: { x: .55, d: 0, man: 3, vo: 1 },
  F: { x: .95, d: .3, man: 2, vo: 0, lip: .15 }, V: { x: .95, d: .3, man: 2, vo: 1, lip: .15 }, TH: { x: .86, d: .32, man: 2, vo: 0 }, DH: { x: .86, d: .32, man: 2, vo: 1 },
  S: { x: .8, d: .28, man: 2, vo: 0 }, Z: { x: .8, d: .28, man: 2, vo: 1 }, SH: { x: .74, d: .32, man: 2, vo: 0, lip: .6 }, ZH: { x: .74, d: .32, man: 2, vo: 1, lip: .6 }, HH: { x: .2, d: .55, man: 2, vo: 0 },
  CH: { x: .76, d: 0, man: 1, vo: 0, aff: 'SH' }, JH: { x: .76, d: 0, man: 1, vo: 1, aff: 'ZH' },
  L: { x: .8, d: .6, man: 4, vo: 1 }, R: { x: .7, d: .8, man: 4, vo: 1, lip: .7 }, W: { x: .97, d: 3, man: 4, vo: 1, lip: .25 }, Y: { x: .66, d: .55, man: 4, vo: 1 } };
const isV = p => !!(VW[p] || DIPH[p]);
// small pronunciation dictionary (ARPAbet without stress)
const DICT = {}; ('the:DH AH|a:AH|i:AY|you:Y UW|me:M IY|my:M AY|we:W IY|love:L AH V|hello:HH AH L OW|hi:HH AY|sing:S IH NG|song:S AO NG|star:S T AA R|stars:S T AA R Z|sun:S AH N|moon:M UW N|sky:S K AY|water:W AO T ER|world:W ER L D|light:L AY T|night:N AY T|day:D EY|one:W AH N|two:T UW|three:TH R IY|four:F AO R|five:F AY V|is:IH Z|are:AA R|to:T UW|of:AH V|and:AE N D|in:IH N|it:IH T|oh:OW|ah:AA|la:L AA|do:D UW|re:R EY|mi:M IY|so:S OW|ti:T IY|yes:Y EH S|no:N OW|good:G UH D|baby:B EY B IY|home:HH OW M|friend:F R EH N D|music:M Y UW Z IH K|eye:AY|eyes:AY Z|heart:HH AA R T|ocean:OW SH AH N|rain:R EY N|fire:F AY ER|blue:B L UW|red:R EH D|green:G R IY N|what:W AH T|who:HH UW|why:W AY|where:W EH R|there:DH EH R|here:HH IY R|come:K AH M|go:G OW|wilbow:W IH L B OW|resonance:R EH Z AH N AH N S|creature:K R IY CH ER|people:P IY P AH L|have:HH AE V|give:G IH V|live:L IH V|said:S EH D|says:S EH Z|was:W AA Z|been:B IH N|could:K UH D|would:W UH D|should:SH UH D|your:Y AO R|our:AW ER|they:DH EY|this:DH IH S|that:DH AE T|with:W IH DH|from:F R AH M|all:AO L|again:AH G EH N|one:W AH N|once:W AH N S|beautiful:B Y UW T AH F AH L|dance:D AE N S|dream:D R IY M|space:S P EY S').split('|').forEach(e => { const [w, p] = e.split(':'); DICT[w] = p.split(' '); });
// letter-to-sound rules: [pattern, phonemes, condition]; greedy longest match left to right
const VOW = 'aeiouy', isVowL = ch => VOW.includes(ch);
const RULES = [['tch', ['CH']], ['ough', ['AO']], ['augh', ['AO']], ['eigh', ['EY']], ['igh', ['AY']], ['tion', ['SH', 'AH', 'N']], ['sion', ['ZH', 'AH', 'N']],
  ['th', ['TH']], ['sh', ['SH']], ['ch', ['CH']], ['ph', ['F']], ['wh', ['W']], ['ck', ['K']], ['ng', ['NG']], ['qu', ['K', 'W']], ['kn', ['N'], (w, i) => i === 0], ['wr', ['R'], (w, i) => i === 0],
  ['ee', ['IY']], ['ea', ['IY']], ['oo', ['UW']], ['ou', ['AW']], ['ow', ['OW']], ['ai', ['EY']], ['ay', ['EY']], ['oa', ['OW']], ['oi', ['OY']], ['oy', ['OY']], ['au', ['AO']], ['aw', ['AO']], ['ie', ['IY']], ['ey', ['IY'], (w, i) => i === w.length - 2], ['ue', ['UW']], ['ew', ['UW']],
  ['er', ['ER']], ['ir', ['ER']], ['ur', ['ER']], ['ar', ['AA', 'R']], ['or', ['AO', 'R']], ['x', ['K', 'S']],
  ['c', ['S'], (w, i) => 'eiy'.includes(w[i + 1] || '')], ['c', ['K']], ['g', ['JH'], (w, i) => 'eiy'.includes(w[i + 1] || '') && i > 0], ['g', ['G']],
  ['y', ['Y'], (w, i) => i === 0], ['y', ['AY'], (w, i) => i === w.length - 1 && w.length <= 3], ['y', ['IY'], (w, i) => i === w.length - 1], ['y', ['IH']],
  ['e', [], (w, i) => i === w.length - 1 && w.length > 2], ['s', ['Z'], (w, i) => i === w.length - 1 && i > 0 && !'ptkf'.includes(w[i - 1])],
  ['j', ['JH']], ['b', ['B']], ['d', ['D']], ['f', ['F']], ['h', ['HH']], ['k', ['K']], ['l', ['L']], ['m', ['M']], ['n', ['N']], ['p', ['P']], ['r', ['R']], ['s', ['S']], ['t', ['T']], ['v', ['V']], ['w', ['W']], ['z', ['Z']]];
const SHORT = { a: 'AE', e: 'EH', i: 'IH', o: 'AA', u: 'AH' }, LONG = { a: 'EY', e: 'IY', i: 'AY', o: 'OW', u: 'UW' };
function g2p(word) { word = String(word || '').toLowerCase().replace(/[^a-z']/g, '').replace(/'/g, ''); if (!word) return []; if (DICT[word]) return DICT[word].slice();
  const out = []; let i = 0; const n = word.length;
  // magic e: V C e$ -> long vowel
  const magic = n >= 3 && word[n - 1] === 'e' && !isVowL(word[n - 2]) && isVowL(word[n - 3]) ? n - 3 : -1;
  while (i < n) { const ch = word[i];
    if (word[i] === word[i + 1] && !isVowL(ch) && ch !== 'c') { i++; continue; }   // doubled consonants
    if ('aeiou'.includes(ch) && !RULES.some(r => r[0].length > 1 && word.startsWith(r[0], i) && isVowL(r[0][0]) && (!r[2] || r[2](word, i)))) {
      if (ch === 'e' && i === n - 1 && n > 2) { i++; continue; }
      out.push(i === magic ? LONG[ch] : (n <= 2 && i === n - 1 ? LONG[ch] : SHORT[ch])); i++; continue; }
    let hit = null; for (const r of RULES) if (word.startsWith(r[0], i) && (!r[2] || r[2](word, i))) { hit = r; break; }
    if (hit) { out.push(...hit[1]); i += hit[0].length; } else i++; }
  if (!out.some(isV)) out.push('AH'); return out; }
// syllables: one vowel nucleus each; a single consonant between vowels starts the next syllable, clusters split after the first
function syllables(ph) { const sy = []; let on = [], cur = null;
  for (let k = 0; k < ph.length; k++) { const p = ph[k]; if (isV(p)) { cur = { on, nu: p, co: [] }; sy.push(cur); on = []; } else { on.push(p); } }
  if (!sy.length) return [{ on: [], nu: 'AH', co: on }];
  for (let k = 0; k < sy.length - 1; k++) { const nx = sy[k + 1]; if (nx.on.length >= 2) { sy[k].co.push(nx.on.shift()); } }
  sy[sy.length - 1].co.push(...on); return sy; }
const VX = { RS: null };
VX.VW = VW; VX.CN = CN; VX.DIPH = DIPH; VX.DICT = DICT; VX.g2p = g2p; VX.syllables = syllables; VX.isV = isV;
VX.text = txt => { const out = []; for (const w of String(txt).split(/\s+/).filter(Boolean)) { const ph = g2p(w); if (!ph.length) continue; for (const s of syllables(ph)) out.push(Object.assign(s, { w: w.toLowerCase() })); } return out; };
const CDUR = { 1: .055, 2: .085, 3: .06, 4: .05 };
// one syllable sung on one note: consonant segments carry the NEXT vowel's tongue target (coarticulation), the vowel fills the rest; legato into the next syllable
VX.segs = (sy, dur, f0, agil = .5) => { const sc = 1.25 - agil * .5, vt = VW[sy.nu] || VW[DIPH[sy.nu][0]], segs = []; let used = 0;
  const cons = (p, v) => { const c = CN[p]; if (!c) return; const d = CDUR[c.man] * sc; if (c.aff) { segs.push({ c, v, dur: d * .6, f0 }); segs.push({ c: CN[c.aff], v, dur: d * .6, f0 }); used += d * 1.2; } else { segs.push({ c, v, dur: d, f0 }); used += d; } };
  for (const p of sy.on) cons(p, vt); let codaDur = 0; for (const p of sy.co) { const c = CN[p]; if (c) codaDur += CDUR[c.man] * sc * (c.aff ? 1.2 : 1); }
  const vd = Math.max(.06, dur - used - codaDur); if (DIPH[sy.nu]) { const [a, b] = DIPH[sy.nu]; segs.push({ v: VW[a], dur: vd * .6, f0 }); segs.push({ v: VW[b], dur: vd * .4, f0 }); } else segs.push({ v: vt, dur: vd, f0 });
  for (const p of sy.co) cons(p, segs[segs.length - 1].v); return segs; };
// a creature's own wordless syllables: a small consonant inventory and vowel colour from its genome; vowel follows the pitch degree
const INV = ['M', 'N', 'L', 'B', 'D', 'W', 'Y', 'T', 'K', 'S', 'HH', 'R', 'V', 'Z', 'P', 'G', 'F', 'SH'], VSET = ['AA', 'EH', 'IY', 'OW', 'UW', 'AE', 'IH', 'AH'];
VX.innate = (c, deg, i) => { const g = c.g, h = RS.Genome.hash(g), inv = []; for (let k = 0; k < 3; k++) inv.push(INV[(h >>> (k * 5)) % (6 + Math.floor(g[171] * 12))]);
  const nu = VSET[(((deg | 0) % 8) + 8 + Math.floor(g[80] * 3)) % 8]; const on = (i % 4 === 3) ? [] : [inv[i % 3]]; return { on, nu, co: [], w: null }; };
// what a creature sings next: its learned words (epigenetic song layer) take turns with its innate syllables
VX.nextSyl = c => { const W = c.words && c.words.length ? c.words : null; c.sylI = (c.sylI || 0) + 1;
  if (W) { const flat = c._wsyl && c._wsylN === W.length ? c._wsyl : (c._wsylN = W.length, c._wsyl = W.flatMap(w => (w.ph && w.ph.length ? w.ph.map(s => Object.assign({ w: w.w }, s)) : VX.text(w.w)))); if (flat.length) { const s = flat[c.sylI % flat.length]; return s; } }
  const S = c.sung; if (S && S.syl && S.syl.length && (!W || c.sylI % 2)) return VX.sungSyl(c, S);   /* v08-voice: a phrase sung through the mouth: its syllables, matched to the degree when it can */
  return VX.innate(c, c.lastDeg || 0, c.sylI); };
VX.sungSyl = (c, S) => { const n = S.syl.length, d = c._curDeg != null ? c._curDeg : c.lastDeg, i0 = c._sungI || 0; let k = -1; for (let j = 0; j < n && k < 0; j++) if (S.deg[(i0 + j) % n] === d) k = (i0 + j) % n; if (k < 0) k = i0 % n; c._sungI = k + 1; const y = S.syl[k]; return { on: (y.on || []).slice(), nu: y.nu || 'AH', co: (y.co || []).slice(), w: null, sung: 1 }; };
// main-thread budget: at most MAX creatures through the tract at once (the rest sing with the formant voice)
VX.MAX = 4; VX.reserve = 0; VX.busy = new Map(); VX.stats = { sent: 0, fallback: 0 };
// intervals per creature (notes are scheduled ahead and may arrive out of order, so count overlaps rather than 'currently busy')
VX.claim = (key, when, dur) => { const t1 = when + dur + .06; let others = 0, mine = false; for (const [k, iv] of VX.busy) { while (iv.length && iv[0][1] < when - 4) iv.shift(); if (!iv.length) { VX.busy.delete(k); continue; } const ov = iv.some(([a, b]) => a < t1 && b > when); if (!ov) continue; if (k === key) mine = true; else others++; }
  if (others >= VX.MAX - (VX.reserve || 0)) return false;   /* v08-voice: the open mouth reserves one pooled voice for the played ohm */ if (!VX.busy.has(key)) VX.busy.set(key, []); VX.busy.get(key).push([when, t1]); return true; };
// attach a tract part to a creature note spec (continuous blend: amt of the voice goes through the tract)
VX.attach = (Sf, c, v, dur) => { const T = c.P.tract; if (!T) return; const hasW = c.words && c.words.length; if (T.amt < .1 && !hasW && !(c.sung && T.amt > .02)) return;   /* v08-voice: a sung phrase keeps its own (small) tract share */ const sy = VX.nextSyl(c); v.tract = { voice: c.voice || null, key: c.born % 1e6 | 0, amt: hasW ? Math.max(.4, T.amt) : T.amt, len: T.len, tense: T.tense, nasal: T.nasal, agil: T.agil, sy, dur: RS.clamp(dur, .14, .9) }; v.syl = sy; };
// called by the audio engine at send time (after the gate placed the pitch): build the tract message
VX.message = (spec, when) => { const t = spec.tract, f0 = spec.modes[0].f; if (!VX.claim(t.key, when || 0, t.dur)) { VX.stats.fallback++; return null; } VX.stats.sent++;
  let segs = t.segs || VX.segs(t.sy, t.dur, f0, t.agil); if (t.segs) for (const s of segs) if (!s.f0) s.f0 = f0; if (t.voice && RS.Play) { for (const s of segs) if (!s.f0) s.f0 = f0; segs = RS.Play.applyVX(segs, t.voice); }
  return { t: 'tract', key: t.key, f0, gain: (spec.gain || .1) * t.amt * 2.2, pan: spec.pan, send: spec.send, len: t.len, tense: RS.clamp(t.tense + (t.voice ? t.voice.tense : 0), .05, 1), nasal: RS.clamp(t.nasal + (t.voice ? t.voice.vel : 0), 0, 1), agil: t.agil, segs }; };
RS.Vocal = VX;
})(typeof window !== 'undefined' ? window : globalThis);
