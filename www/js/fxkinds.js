'use strict';
// v0.8b5 (4:07-4:11 PM steers): the item KIND table beyond the 8 base effects, the beat-grid / key locking of every item insert, each
// item's seeded CHARACTER, the culture weighting of world kinds, and the close-up CONTROL model (itemedit.js draws it).
//  - TIME kinds lock to the carrier's beat grid (p.per / p.t0 / p.off / p.now -> fx.js keeps the phase); free time = off a notch.
//  - PITCH kinds stay in the carrier's key (ratios from its scale); cents detune = off the notch.
//  - Controls store only what the player moved (it.adj[k] in 0..1); everything else follows the item's home (character + state).
(function (G) { const RS = G.RS = G.RS || {}; const X = RS.FXK = {}; const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
X.NEW = ['shm', 'frz', 'tap', 'spr', 'wah', 'phs', 'spn', 'vow', 'hrm', 'sub', 'gld', 'sym', 'grn', 'rng', 'wrm', 'rad', 'gat', 'swl', 'dop', 'pmp'];
X.BASE = ['rev', 'dly', 'dst', 'glt', 'cho', 'trm', 'cmb', 'pit'];
X.ALL = X.BASE.concat(X.NEW);
X.NAME = { shm: 'shimmer star', frz: 'frost flake', tap: 'tape reel', spr: 'spring coil', wah: 'wah horn', phs: 'phaser ring', spn: 'spinner', vow: 'vowel mouth', hrm: 'harmony twin', sub: 'sub stone', gld: 'glide feather', sym: 'string harp', grn: 'grain cloud', rng: 'ring bell', wrm: 'warm coal', rad: 'old radio', gat: 'gate comb', swl: 'swell bud', dop: 'doppler comet', pmp: 'pump heart' };
X.COL = { shm: [255, 245, 190], frz: [200, 235, 255], tap: [150, 120, 100], spr: [190, 200, 210], wah: [255, 170, 80], phs: [140, 160, 255], spn: [255, 220, 120], vow: [255, 140, 170], hrm: [180, 255, 200], sub: [110, 90, 140], gld: [240, 230, 255], sym: [220, 200, 150], grn: [210, 210, 190], rng: [230, 230, 120], wrm: [255, 150, 90], rad: [170, 150, 110], gat: [120, 255, 220], swl: [200, 255, 150], dop: [255, 200, 240], pmp: [255, 90, 120] };
X.FAMG = { shm: 'aRev', frz: 'aRev', spr: 'aRev', tap: 'aDly', wah: 'aCho', phs: 'aCho', swl: 'aCho', spn: 'aTrm', gat: 'aTrm', dop: 'aTrm', pmp: 'aTrm', vow: 'aCmb', sym: 'aCmb', rng: 'aCmb', hrm: 'aPit', sub: 'aPit', gld: 'aPit', grn: 'aGlt', wrm: 'aDst', rad: 'aDst' };
X.ON = {}; for (const k of X.NEW) X.ON[k] = true;   /* all 20 default ON (RS.FXK.ON[k] = false turns one off for world seeding) */
X.R = { shm: 11, frz: 11, tap: 12, spr: 10, wah: 12, phs: 11, spn: 10, vow: 11, hrm: 10, sub: 13, gld: 10, sym: 13, grn: 12, rng: 11, wrm: 11, rad: 13, gat: 11, swl: 10, dop: 10, pmp: 11 };
// which kinds run on the beat grid / in key
X.TIME = { dly: 1, tap: 1, gat: 1, trm: 1, wah: 1, phs: 1, spn: 1, pmp: 1, grn: 1, frz: 1, swl: 1, gld: 1, dop: 1, vow: 1 };
X.PITCH = { shm: 1, hrm: 1, sub: 1, gld: 1, sym: 1, rng: 1, pit: 1, cmb: 1, grn: 1 };
// close-up controls per kind (order = around the ring)
X.CTRL = { dly: ['div', 'off', 'tone', 'depth'], tap: ['div', 'off', 'tone', 'depth'], gat: ['div', 'off', 'depth'], trm: ['div', 'off', 'depth'], phs: ['div', 'off', 'depth'], spn: ['div', 'off', 'depth'], pmp: ['div', 'off', 'depth'], dop: ['div', 'off', 'depth'],
  wah: ['div', 'off', 'depth', 'tone'], grn: ['div', 'off', 'depth'], frz: ['div', 'depth', 'tone'], swl: ['div', 'depth'], gld: ['div', 'iv', 'cents'],
  shm: ['cents', 'tone', 'depth'], hrm: ['iv', 'cents'], sub: ['depth', 'tone'], sym: ['cents', 'depth', 'tone'], rng: ['iv', 'cents', 'depth'], pit: ['iv', 'cents'], cmb: ['cents', 'depth'],
  vow: ['depth', 'tone', 'div'], wrm: ['depth', 'tone'], rad: ['depth', 'tone'], spr: ['depth', 'tone'], rev: ['depth', 'tone'], dst: ['depth', 'tone'], cho: ['depth', 'tone'], glt: ['depth'] };
X.controls = it => ['mix'].concat(X.CTRL[it.kind] || ['depth']);
// beat divisions (beats per cycle); notch values for the div control; u = (log2(beats) + 2) / 4  (1/4 beat .. 4 beats)
X.DIVS = [.25, 1 / 3, .5, 2 / 3, .75, 1, 1.5, 2, 4];
X.divU = b => clamp((Math.log2(b) + 2) / 4, 0, 1); X.uDiv = u => Math.pow(2, -2 + 4 * u);
X.FACETDIV = { 3: 1 / 3, 4: 1, 5: .75, 6: .5, 7: 2, 8: 1 };   /* E2: echo time = a musical value chosen by the crystal's facets (triplet, 1/4, dotted 1/8, 1/8, 1/2) */
X.IV = { hrm: [2, 4, -3, 5, 7], rng: [0, 7, 4, 12], pit: [-7, -4, 4, 7, 12, -14], gld: [-1, -2, -4, 1] };   // scale-degree steps (in-key)
// ---------------- character: seeded from the item's shape + the world seed ----------------
X.ch = (Sf, it) => { if (it.ch) return it.ch; const sp = it.p || {}, r = RS.rng(RS.hash('fxch', (Sf && Sf.seed) || 1, it.kind, Math.round((it.R || 10) * 10), Math.round((sp.facets || 0) * 7 + (sp.size || 0) * 100 + (sp.freq || 0) + (sp.rate || 0) * 10)));
  const di = [2, 3, 4, 5, 6, 7][Math.floor(r() * 6)];
  return (it.ch = { tone: .25 + r() * .6, depth: .35 + r() * .5, spread: r(), fb: .3 + r() * .4, div: X.DIVS[it.kind === 'gat' || it.kind === 'grn' ? [0, 2, 2, 4][Math.floor(r() * 4)] : di], ivI: Math.floor(r() * 5), pat: (Math.floor(r() * 254) + 1) | 0x11, vow: Math.floor(r() * 4) + r() * .5 }); };
// ---------------- the home (resting) value of each control, 0..1 ----------------
X.home = (Sf, it, k) => { const ch = X.ch(Sf, it), p = it.p || {};
  switch (k) { case 'mix': return .5; case 'off': return .5; case 'cents': return .5; case 'iv': { const L = X.IV[it.kind] || [0]; return (ch.ivI % L.length + .5) / L.length; }
    case 'div': if (it.kind === 'dly') return X.divU(X.FACETDIV[clamp(Math.round(3 + (it.mass == null ? .3 : it.mass) * 5), 3, 8)] || 1); if (it.kind === 'trm') return X.divU(.5); return X.divU(ch.div);
    case 'tone': return it.kind === 'dly' ? (p.tone == null ? ch.tone : p.tone) : it.kind === 'dst' || it.kind === 'cho' ? (p.tone == null ? ch.tone : p.tone) : ch.tone;
    case 'depth': return it.kind === 'dly' || it.kind === 'tap' ? clamp(((p.fb == null ? ch.fb : p.fb) - .25) / .55, 0, 1) : it.kind === 'trm' ? (p.depth == null ? ch.depth : p.depth) : it.kind === 'cho' ? (p.depth == null ? ch.depth : p.depth) : it.kind === 'cmb' ? clamp(((p.fb || .7) - .5) / .4, 0, 1) : it.kind === 'dst' ? clamp(((p.drive || .6) - .4) / .5, 0, 1) : it.kind === 'rev' ? (p.size == null ? ch.depth : p.size) : ch.depth; }
  return .5; };
X.val = (Sf, it, k) => (it.adj && it.adj[k] != null) ? it.adj[k] : X.home(Sf, it, k);
// notch points of a control (0..1) - the sync / key point(s); snap is the default resting point
X.notches = (Sf, it, k) => { if (k === 'div') return X.DIVS.map(X.divU); if (k === 'iv') { const L = X.IV[it.kind] || [0]; return L.map((_, i) => (i + .5) / L.length); } if (k === 'mix' || k === 'off' || k === 'cents') return [.5]; return [X.home(Sf, it, k)]; };
X.MAG = .03; X.SNAP = .05;
X.snap = (Sf, it, k, u, rel) => { if (k === 'iv') { const L = X.IV[it.kind] || [0]; return (clamp(Math.floor(u * L.length), 0, L.length - 1) + .5) / L.length; } let b = null, bd = 1; for (const n of X.notches(Sf, it, k)) { const d = Math.abs(n - u); if (d < bd) { bd = d; b = n; } } const f = k === 'div' ? .5 : 1;   /* the division notches sit close together: half the window keeps free time reachable between them */ return b != null && bd < (rel ? X.SNAP : X.MAG) * f ? b : clamp(u, 0, 1); };
X.onNotch = (Sf, it, k) => { const u = X.val(Sf, it, k); return X.notches(Sf, it, k).some(n => Math.abs(n - u) < 1e-3); };
X.set = (Sf, it, k, u, rel) => { const v = X.snap(Sf, it, k, u, rel); it.adj = it.adj || {}; if (Math.abs(v - X.home(Sf, it, k)) < 1e-4) delete it.adj[k]; else it.adj[k] = Math.round(v * 1e4) / 1e4; if (!Object.keys(it.adj).length) it.adj = null; return v; };
// ---------------- the carrier's grid + key ----------------
X.grid = (Sf, c) => { const m = c && c.mind, now = Sf.now(); if (!m || !(m.bpm > 0)) return { beat: 60 / 90, t0: 0, now }; const feel = m.feel || 1, beat = 60 / (m.bpm * feel), pos = Number.isFinite(m.pos) ? m.pos : 0; return { beat, t0: now - ((pos % 4) / 4) * beat, now }; };
X.cents = c => { const S = c && c.mind && c.mind.sys; return S && S.cents && S.cents.length ? S.cents : [0, 200, 400, 500, 700, 900, 1100]; };
X.tonic = (Sf, c) => { try { if (RS.Mind && c && c.mind) { const h = RS.Mind.tonicHz(Sf, c.mind); if (h > 0 && Number.isFinite(h)) return h; } } catch (e) { } return (Sf && Sf.M && Sf.M.rootHz ? Sf.M.rootHz() : 220); };
X.degC = (C, d) => { const n = C.length, o = Math.floor(d / n), i = ((d % n) + n) % n; return C[i] + 1200 * o; };
X.nearDeg = (C, cents) => { const n = C.length; let best = 0, bd = 1e9; for (let d = -2 * n; d <= 3 * n; d++) { const e = Math.abs(X.degC(C, d) - cents); if (e < bd) { bd = e; best = d; } } return best; };
X.stepRatio = (C, d0, step) => Math.pow(2, (X.degC(C, d0 + step) - X.degC(C, d0)) / 1200);
X.inKeyHz = (Sf, c, lo, hi) => { let h = X.tonic(Sf, c); while (h < lo) h *= 2; while (h > hi) h /= 2; return h; };
X.ivStep = (Sf, it) => { const L = X.IV[it.kind] || [0]; return L[clamp(Math.floor(X.val(Sf, it, 'iv') * L.length), 0, L.length - 1)]; };
// ---------------- the worklet params for an item carried by c (base params already in p) ----------------
X.apply = (Sf, c, it, p, mix) => { const k = it.kind, ch = X.ch(Sf, it), V = q => X.val(Sf, it, q), g = X.grid(Sf, c), C = X.cents(c), dc = (V('cents') - .5) * 200;
  mix *= V('mix') * 2 > 1 ? 1 + (V('mix') - .5) * 1.2 : V('mix') * 2; mix = clamp(mix, 0, 1.3);
  if (X.TIME[k]) { const b = X.uDiv(V('div')); p.per = clamp(b * g.beat, .03, 2.8); p.t0 = g.t0; p.now = g.now; p.off = V('off') - .5; p.beats = b; }
  const dep = V('depth'), tn = V('tone');
  switch (k) {
    case 'dly': p.time = p.per; p.tone = tn; p.fb = clamp(.25 + dep * .55, .1, .8); break;
    case 'tap': p.time = p.per; p.tone = tn; p.fb = clamp(.25 + dep * .5, .1, .78); break;
    case 'trm': p.depth = dep; break;
    case 'cho': p.depth = dep; p.tone = tn; break;
    case 'dst': p.drive = .4 + dep * .5; p.tone = tn; break;
    case 'rev': p.size = dep; p.damp = 1 - tn; break;
    case 'cmb': { const d = X.nearDeg(C, 1200 * Math.log2(Math.max(20, p.freq || 220) / X.tonic(Sf, c))); p.freq = clamp(X.tonic(Sf, c) * Math.pow(2, (X.degC(C, d) + dc) / 1200), 40, 2000); p.fb = .5 + dep * .4; break; }   // snapped to the key
    case 'pit': { const st = X.ivStep(Sf, it); p.ratio = Math.pow(2, (X.degC(C, st) + dc) / 1200); p.semi = 12 * Math.log2(p.ratio); break; }   // in-key degree steps (the old raw semis snap to the scale)
    case 'glt': p.rep = clamp(.1 + dep * .7, 0, .9); break;
    case 'shm': p.ratio = 2 * Math.pow(2, dc / 1200); p.tone = tn; p.depth = dep; p.fb = ch.fb; p.spread = ch.spread; break;
    case 'hrm': p.step = X.ivStep(Sf, it); p.dc = dc; p.spread = ch.spread; p.ratio = p.ratio || X.stepRatio(C, 0, p.step) * Math.pow(2, dc / 1200); break;   // per-note ratio arrives with each note (fx set-msg)
    case 'gld': p.step = X.ivStep(Sf, it); p.cents = 0; p.dc = dc; p.semi = p.semi || 12 * Math.log2(X.stepRatio(C, 0, p.step)); break;
    case 'sub': p.depth = dep; p.tone = tn; break;
    case 'sym': { const r0 = X.inKeyHz(Sf, c, 70, 140) * Math.pow(2, dc / 1200), f5 = X.degC(C, 4); p.fr = [r0, r0 * Math.pow(2, f5 / 1200), r0 * 2, r0 * Math.pow(2, X.degC(C, 2) / 1200) * 2].map(f => Math.round(f * 10) / 10); p.depth = dep; p.tone = tn; break; }
    case 'rng': { const st = X.ivStep(Sf, it); p.hz = Math.round(X.inKeyHz(Sf, c, 200, 800) * Math.pow(2, (X.degC(C, st) - 0 + dc) / 1200) * 10) / 10; p.depth = dep; break; }
    case 'grn': { const has5 = C.some(x => Math.abs(x - 700) < 30); p.rates = has5 ? [1, 2, .5, 1.5] : [1, 2, .5]; p.depth = dep; p.spread = ch.spread; break; }
    case 'gat': p.pat = ch.pat; p.depth = dep; break;
    case 'vow': p.vow = ch.vow; p.morph = dep * .8; p.tone = tn; break;
    default: p.depth = dep; p.tone = tn; }
  return { p, mix }; };
// a note through a harmony / glide item: the in-key ratio for THIS note (sent as a partial update so the buffers keep running)
X.noteSet = (Sf, c, it, f0) => { if (!it || !(f0 > 0) || (it.kind !== 'hrm' && it.kind !== 'gld')) return null; const C = X.cents(c), d = X.nearDeg(C, 1200 * Math.log2(f0 / X.tonic(Sf, c))), st = X.ivStep(Sf, it), dc = (X.val(Sf, it, 'cents') - .5) * 200, cents = X.degC(C, d + st) - X.degC(C, d) + dc;
  return it.kind === 'hrm' ? { ratio: Math.round(Math.pow(2, cents / 1200) * 1e4) / 1e4 } : { semi: Math.round(cents) / 100 }; };
// ---------------- culture weighting of world kinds ----------------
X.CULT = { gamelan: ['shm', 'sym', 'rng', 'cmb', 'trm'], hindustani: ['sym', 'gld', 'dly', 'dop'], carnatic: ['sym', 'gld', 'dly', 'dop'], maqam: ['gld', 'rev', 'cho', 'vow'], wafrica: ['gat', 'pmp', 'trm', 'dst'], cuban: ['spr', 'rev', 'pmp'], bossa: ['cho', 'wrm', 'rev', 'spr'],
  aksak: ['glt', 'gat', 'dly'], flamenco: ['rev', 'spr', 'dst'], celtic: ['rev', 'dly', 'shm', 'frz'], andean: ['cho', 'dly', 'rev', 'vow'], blues: ['dst', 'wah', 'spr', 'tap', 'rad'], japan: ['rev', 'frz', 'shm', 'dly'], western: [],
  jazz: ['rev', 'cho', 'tap', 'wrm'], funk: ['wah', 'pmp', 'dst', 'gat'], dastgah: ['gld', 'rev', 'dly', 'vow'], makam: ['gld', 'rev', 'cho', 'vow'], samba: ['spr', 'pmp', 'rev'], rumba: ['spr', 'rev', 'pmp'],
  reggae: ['dly', 'rev', 'spr', 'wah'], techno: ['gat', 'pmp', 'dst', 'dly', 'glt'], overtone: ['vow', 'rev', 'shm', 'dly'], china: ['rev', 'dly', 'cho', 'gld'] };   /* v0.8b6 new traditions */
X.cultOf = t => { const m = /^g:[^:]+:([a-z]+):([a-z]+)$/.exec(t || ''); return m ? (X.CULT[m[1]] || []).concat(X.CULT[m[2]] || []) : []; };   /* a generated culture leans on both parents */
X.blend = Sf => { const T = RS.Trad, b = {}; if (!T) return b; let n = 0; for (const c of Sf.creatures || []) { if (c.dead || !c.mind) continue; const had = c.trad; let t = null; try { t = T.lean(Sf, c); } catch (e) { } if (had === undefined) delete c.trad; else c.trad = had; if (t) { b[t] = (b[t] || 0) + 1; n++; } }
  let w = null; try { w = T.world(Sf); } catch (e) { } if (w) { b[w] = (b[w] || 0) + 2; n += 2; } if (n) for (const k in b) b[k] /= n; return b; };
X.weights = Sf => { const b = X.blend(Sf), w = {}; for (const k of X.ALL) w[k] = X.ON[k] === false ? 0 : 1; for (const t in b) for (const k of X.CULT[t] || X.cultOf(t)) if (w[k]) w[k] += 4 * b[t]; return w; };
X.pick = (Sf, r) => { const w = X.weights(Sf); let s = 0; for (const k in w) s += w[k]; let u = r() * s; for (const k in w) { u -= w[k]; if (u <= 0) return k; } return 'rev'; };
})(typeof window !== 'undefined' ? window : globalThis);
