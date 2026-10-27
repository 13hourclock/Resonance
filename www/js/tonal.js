'use strict';
// Tonal systems for creature minds: a large scale catalog (cents within a period), tunings, a gravity map (stable degrees,
// tendency tones and where they resolve), the chords a scale implies, and Krumhansl-Schmuckler key finding. Pure JS.
(function (G) { const RS = G.RS = G.RS || {}; const To = RS.Tonal = {};
const C = a => a.map(x => x * 100);
// name, cents, family, brightness (-1 dark .. +1 bright), rarity weight
To.CAT = [
  ['Ionian', C([0, 2, 4, 5, 7, 9, 11]), 'diatonic', .7, 6], ['Dorian', C([0, 2, 3, 5, 7, 9, 10]), 'diatonic', .1, 6], ['Phrygian', C([0, 1, 3, 5, 7, 8, 10]), 'diatonic', -.6, 4],
  ['Lydian', C([0, 2, 4, 6, 7, 9, 11]), 'diatonic', 1, 4], ['Mixolydian', C([0, 2, 4, 5, 7, 9, 10]), 'diatonic', .45, 5], ['Aeolian', C([0, 2, 3, 5, 7, 8, 10]), 'diatonic', -.35, 6], ['Locrian', C([0, 1, 3, 5, 6, 8, 10]), 'diatonic', -1, 1.5],
  ['Harmonic minor', C([0, 2, 3, 5, 7, 8, 11]), 'harmonic', -.45, 4], ['Locrian #6', C([0, 1, 3, 5, 6, 9, 10]), 'harmonic', -.8, 1], ['Ionian #5', C([0, 2, 4, 5, 8, 9, 11]), 'harmonic', .5, 1],
  ['Ukrainian dorian', C([0, 2, 3, 6, 7, 9, 10]), 'harmonic', -.1, 1.5], ['Phrygian dominant', C([0, 1, 4, 5, 7, 8, 10]), 'harmonic', -.3, 3], ['Lydian #2', C([0, 3, 4, 6, 7, 9, 11]), 'harmonic', .6, 1], ['Ultralocrian', C([0, 1, 3, 4, 6, 8, 9]), 'harmonic', -1, .6],
  ['Melodic minor', C([0, 2, 3, 5, 7, 9, 11]), 'melodic', -.05, 3], ['Dorian b2', C([0, 1, 3, 5, 7, 9, 10]), 'melodic', -.3, 1], ['Lydian augmented', C([0, 2, 4, 6, 8, 9, 11]), 'melodic', .9, 1],
  ['Lydian dominant', C([0, 2, 4, 6, 7, 9, 10]), 'melodic', .65, 2.5], ['Mixolydian b6', C([0, 2, 4, 5, 7, 8, 10]), 'melodic', .15, 1.5], ['Locrian #2', C([0, 2, 3, 5, 6, 8, 10]), 'melodic', -.7, 1], ['Altered', C([0, 1, 3, 4, 6, 8, 10]), 'melodic', -.9, 1],
  ['Major pentatonic', C([0, 2, 4, 7, 9]), 'pentatonic', .6, 6], ['Minor pentatonic', C([0, 3, 5, 7, 10]), 'pentatonic', -.2, 6], ['Egyptian', C([0, 2, 5, 7, 10]), 'pentatonic', .05, 3],
  ['Blues', C([0, 3, 5, 6, 7, 10]), 'blues', -.25, 4], ['Major blues', C([0, 2, 3, 4, 7, 9]), 'blues', .4, 2.5], ['Bebop dominant', C([0, 2, 4, 5, 7, 9, 10, 11]), 'bebop', .45, 2], ['Bebop major', C([0, 2, 4, 5, 7, 8, 9, 11]), 'bebop', .6, 1.5],
  ['Whole-tone', C([0, 2, 4, 6, 8, 10]), 'symmetric', .3, 1.5], ['Octatonic HW', C([0, 1, 3, 4, 6, 7, 9, 10]), 'symmetric', -.5, 1.2], ['Octatonic WH', C([0, 2, 3, 5, 6, 8, 9, 11]), 'symmetric', -.4, 1.2], ['Augmented', C([0, 3, 4, 7, 8, 11]), 'symmetric', .2, 1],
  ['Hungarian minor', C([0, 2, 3, 6, 7, 8, 11]), 'exotic', -.55, 2], ['Double harmonic', C([0, 1, 4, 5, 7, 8, 11]), 'exotic', -.35, 2], ['Neapolitan minor', C([0, 1, 3, 5, 7, 8, 11]), 'exotic', -.7, 1.2], ['Neapolitan major', C([0, 1, 3, 5, 7, 9, 11]), 'exotic', -.2, 1],
  ['Hirajoshi', C([0, 2, 3, 7, 8]), 'japanese', -.45, 3], ['In', C([0, 1, 5, 7, 8]), 'japanese', -.75, 2], ['Iwato', C([0, 1, 5, 6, 10]), 'japanese', -.95, 1], ['Yo', C([0, 2, 5, 7, 9]), 'japanese', .35, 3],
  ['Raga Bhairav', C([0, 1, 4, 5, 7, 8, 11]), 'raga', -.35, 1.5], ['Raga Yaman', C([0, 2, 4, 6, 7, 9, 11]), 'raga', .95, 1.5], ['Raga Kafi', C([0, 2, 3, 5, 7, 9, 10]), 'raga', .1, 1.5], ['Raga Todi', C([0, 1, 3, 6, 7, 8, 11]), 'raga', -.75, 1.2],
  ['Maqam Rast', [0, 200, 350, 500, 700, 900, 1050], 'maqam', .3, 2], ['Maqam Bayati', [0, 150, 300, 500, 700, 800, 1000], 'maqam', -.3, 2], ['Maqam Saba', [0, 150, 300, 400, 700, 800, 1000], 'maqam', -.8, 1],
  ['Just major', [0, 203.9, 386.3, 498, 702, 884.4, 1088.3], 'just', .75, 2], ['Just minor', [0, 203.9, 315.6, 498, 702, 813.7, 1017.6], 'just', -.3, 2],
  ['19-TET major', [0, 3, 6, 8, 11, 14, 17].map(s => s * 1200 / 19), '19tet', .6, 1], ['19-TET minor', [0, 3, 5, 8, 11, 13, 16].map(s => s * 1200 / 19), '19tet', -.3, 1],
  ['24-TET neutral', [0, 200, 350, 500, 700, 850, 1050], '24tet', 0, 1],
  ['Bohlen-Pierce lambda', [0, 2, 3, 4, 6, 7, 9, 10, 12].map(s => s * 1901.96 / 13), 'bp', 0, .35],
].map(([name, cents, fam, bright, w], i) => ({ i, name, cents, fam, bright, w, period: fam === 'bp' ? 1901.96 : 1200 }));
To.TUNING = { diatonic: '12-TET', harmonic: '12-TET', melodic: '12-TET', pentatonic: '12-TET', blues: '12-TET', bebop: '12-TET', symmetric: '12-TET', exotic: '12-TET', japanese: '12-TET', raga: '12-TET', maqam: '24-TET (quarter tones)', just: 'just (5-limit)', '19tet': '19-TET', '24tet': '24-TET', bp: 'Bohlen-Pierce (tritave)' };
// gene x in [0,1) -> catalog entry (weighted so common systems are common, BP rare); deterministic + continuous in x
To.cum = (() => { let s = 0; const a = To.CAT.map(e => (s += e.w)); return a.map(v => v / s); })();
To.fromGene = x => { for (let i = 0; i < To.cum.length; i++) if (x < To.cum[i]) return To.CAT[i]; return To.CAT[To.CAT.length - 1]; };
// pitch of degree d (any integer) in cents above the tonic
To.cents = (S, d) => { const n = S.cents.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return o * S.period + S.cents[i]; };
To.hz = (S, tonicHz, d) => tonicHz * Math.pow(2, To.cents(S, d) / 1200);
To.degOfCents = (S, c) => { const n = S.cents.length; let best = 0, bd = 1e9; const o0 = Math.floor(c / S.period); for (let o = o0 - 1; o <= o0 + 1; o++) for (let i = 0; i < n; i++) { const e = Math.abs(o * S.period + S.cents[i] - c); if (e < bd) { bd = e; best = o * n + i; } } return { d: best, err: bd }; };
// gravity map: stability per degree + tendency resolutions (half steps / quarter tones toward a more stable neighbour)
To.gravity = S => { const n = S.cents.length, per = S.period, st = S.cents.map(c => { const fifth = per === 1200 ? 702 : 884;   /* BP: the 5:3 is its 'fifth' */
      if (c === 0) return 1; if (Math.abs(c - fifth) < 40) return .85; if (per === 1200 && (Math.abs(c - 386) < 75 || Math.abs(c - 316) < 40)) return .7; if (per === 1200 && Math.abs(c - 498) < 30) return .45; return .3; });
  const res = []; for (let i = 0; i < n; i++) { let best = null; for (const dd of [-1, 1]) { const j = i + dd, cj = To.cents(S, j), ci = S.cents[i], gap = Math.abs(cj - ci), sj = st[((j % n) + n) % n]; if (gap <= 160 && sj > st[i] + .2 && (!best || sj > best.s || (sj === best.s && gap < best.gap))) best = { to: dd, s: sj, gap }; } res.push(best ? best.to : 0); }
  return { stab: st, res }; };   // res[i] = -1/+1: tendency tone resolves down/up; 0 = free
// chords the scale implies: stacked scale steps (triad 0-2-4, 7th 0-2-4-6, quartal ~500c stacks, cluster 0-1-2)
To.chord = (S, root, type) => { const n = S.cents.length; if (type === 'quartal') { const out = [root]; let c = To.cents(S, root); for (let k = 0; k < 2; k++) { const t = To.degOfCents(S, c + 500); out.push(t.d); c = To.cents(S, t.d); } return out; }
  const st = type === 'seventh' ? [0, 2, 4, 6] : type === 'cluster' ? [0, 1, 2] : n <= 5 ? [0, 2, 3] : [0, 2, 4]; return st.map(k => root + k); };
To.isChordTone = (S, d, chord) => { const n = S.cents.length; return chord.some(c => ((c - d) % n + n) % n === 0); };
// pitch-class set of a system at a tonic, in 24 bins (quarter tones), for agreement between systems
To.pcs24 = (S, tonicCents) => { const set = new Set(); if (S.period !== 1200) { for (let d = 0; d < S.cents.length * 3; d++) set.add(((Math.round((To.cents(S, d) + tonicCents) / 50) % 24) + 24) % 24); return set; } for (const c of S.cents) set.add(((Math.round((c + tonicCents) / 50) % 24) + 24) % 24); return set; };
To.agree = (A, ta, B, tb) => { const a = To.pcs24(A, ta), b = To.pcs24(B, tb); let i = 0; for (const x of a) if (b.has(x) || b.has((x + 1) % 24) && false) i++; return i / Math.max(a.size, b.size); };
// Krumhansl-Kessler key profiles (major/minor), correlated against a heard pitch-class histogram (12 bins)
To.KK = { maj: [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88], min: [6.33, 2.68, 3.52, 5.38, 2.6, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17] };
const corr = (x, y) => { const n = x.length, mx = x.reduce((a, b) => a + b) / n, my = y.reduce((a, b) => a + b) / n; let sxy = 0, sx = 0, sy = 0; for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sx += (x[i] - mx) ** 2; sy += (y[i] - my) ** 2; } return sx && sy ? sxy / Math.sqrt(sx * sy) : 0; };
To.keyFind = hist => { let best = { tonic: 0, mode: 'maj', r: -2 }; for (const mode of ['maj', 'min']) for (let t = 0; t < 12; t++) { const prof = To.KK[mode].map((_, i) => To.KK[mode][((i - t) % 12 + 12) % 12]); const r = corr(hist, prof); if (r > best.r) best = { tonic: t, mode, r }; } return best; };
To.hist = notes => { const h = new Array(12).fill(0); for (const n of notes) { const pc = ((Math.round(12 * Math.log2(n.f / 16.3516)) % 12) + 12) % 12; h[pc] += n.w || 1; } return h; };
// consonance of an interval (cents) 0..1 (octave/5th/4th/3rds/6ths high; 2nds/7ths/tritone low; quarter tones lowest)
To.cons = c => { const x = ((Math.abs(c) % 1200) + 1200) % 1200, t = [[0, 1], [702, .9], [498, .75], [386, .7], [316, .65], [884, .65], [814, .55], [969, .35], [1088, .2], [204, .3], [112, .1], [590, .2], [1200, 1]]; let best = 0; for (const [cc, v] of t) { const d = Math.abs(x - cc); best = Math.max(best, v * Math.exp(-(d * d) / (2 * 22 * 22))); } return best; };
})(typeof window !== 'undefined' ? window : globalThis);
