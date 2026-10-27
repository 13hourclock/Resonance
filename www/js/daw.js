'use strict';
// Organic DAW view: the place's music as a looping river. Lanes = voices (creatures, colonies (braided), instruments, environment, star pulse).
// Beads = notes. Everything is edited with the universal touches; edits are written back into the world (creature motifs/scores, instrument tension,
// world tempo/key) and persist with the place. Model functions are pure enough to test headless; view/gesture code draws on the canvas only.
(function (G) {
const RS = G.RS, TAU = RS.TAU, C = () => RS.Creature;
RS.DAW = function (Sf) {
  const D = { Sf, open: false, T: 0, sel: new Set(), pat: null, undo: [], redo: [], scrollY: 0 };
  const M = Sf.M, mix = () => (Sf.mix = Sf.mix || {});
  // ---------------- model ----------------
  D.lanes = () => { const out = [], seen = new Set(), mx = mix();
    for (const cl of Sf.clusters) { if (!cl.members.length) continue; const key = 'k' + cl.id, open = !!(mx[key] && mx[key].open); out.push({ id: key, kind: 'colony', ref: cl, col: cl.members[0].col, braided: !open, members: cl.members });
      for (const m of cl.members) { seen.add(m); if (open) out.push({ id: m.id, kind: 'creature', ref: m, col: m.col, sub: true, parent: key }); } }
    for (const c of Sf.creatures) { if (c.dead || seen.has(c) || c.caught) continue; out.push({ id: c.id, kind: c.home ? 'instrument' : 'creature', ref: c, col: c.col, body: c.home || null }); }
    out.push({ id: 'env', kind: 'env', col: Sf.pal.water }); out.push({ id: 'star', kind: 'star', col: RS.bbRGB(Sf.sys.star.T) });
    return out; };
  D.lane = id => D.lanes().find(l => l.id === id);
  const creatureOf = L => L.kind === 'colony' ? L.ref.members[0] : L.ref;
  // pattern of a lane: notes on a step lattice. creature -> its (scored) motif; instrument -> its loop; colony braided -> leader's; env/star -> read from the log
  D.pattern = L => { if (!L) return { len: 16, notes: [] };
    if (L.kind === 'instrument' && L.ref.loop) { const lp = L.ref.loop; return { len: lp.len, notes: lp.steps.map((s, k) => ({ k, s: s.s, deg: s.deg == null ? 0 : s.deg, len: 1, vel: RS.clamp(s.v / 900, .1, 1), chord: s.chord || [] })), inst: true }; }
    if (L.kind === 'creature' || L.kind === 'colony' || L.kind === 'instrument') return C().score(creatureOf(L));
    // environment / star pulse: what they played in the last two bars (read-only beads)
    const t = Sf.now(), b = M.barDur(), src = Sf.recentNotes.filter(n => n.t > t - 2 * b && n.t <= t && (L.kind === 'env' ? (n.lane === 'env' && !n.src) : n.lane === 'star')); return { len: 32, ro: true, notes: src.map((n, k) => ({ k, s: Math.floor(((n.t - M.t0) / M.dt16()) % 32), deg: M.nearestDeg(n.f), len: 1, vel: RS.clamp(n.g * 6, .1, 1), chord: [] })) }; };
  // write a pattern back into the creature (score = exact playback; motif = the musical memory; persists via serialCreature)
  D.write = (L, pat) => { if (pat.ro) return false; if (L.kind === 'instrument' && L.ref.loop && pat.inst) { L.ref.loop.len = pat.len; L.ref.loop.steps = pat.notes.map(n => ({ s: ((n.s % pat.len) + pat.len) % pat.len, x: 0, y: 0, v: n.vel * 900, deg: n.deg, chord: n.chord && n.chord.length ? n.chord.slice() : undefined })); L.ref.loop.learned = true; return true; }
    const targets = L.kind === 'colony' ? (L.braided ? [L.ref.members[0]] : []) : [L.ref]; for (const c of targets) D.writeCreature(c, pat); if (L.kind === 'colony') L.ref.motif = targets[0] && targets[0].motif.slice(); return true; };
  D.writeCreature = (c, pat) => { const ns = pat.notes.slice().sort((a, b) => a.s - b.s), mo = [], du = [], ve = [], le = [], ch = [], fc = []; let cur = 0;
    if (ns.length && ns[0].s > 0) { mo.push(null); du.push(ns[0].s); ve.push(0); le.push(0); ch.push([]); fc.push(0); cur = ns[0].s; }
    ns.forEach((n, i) => { const nx = i + 1 < ns.length ? ns[i + 1].s : pat.len; mo.push(n.deg); du.push(Math.max(1, nx - n.s)); ve.push(n.vel); le.push(n.len); ch.push(n.chord || []); fc.push(n.free || 0); });
    if (!ns.length) { mo.push(null); du.push(pat.len); ve.push(0); le.push(0); ch.push([]); fc.push(0); }
    c.motif = mo; c.mdur = du; c.mvel = ve; c.mlen = le; c.mchord = ch; c.freeCents = fc.some(x => x) ? fc : null; c.loopLen = pat.len; c.scored = true; c.scoreV = (c.scoreV || 0) + 1; c.devKey = null; Sf.stats.dawEdits = (Sf.stats.dawEdits || 0) + 1; };
  const snap = L => { const c = L.kind === 'instrument' && L.ref.loop ? null : creatureOf(L); return { id: L.id, loop: L.ref && L.ref.loop ? JSON.parse(JSON.stringify(L.ref.loop)) : null, c: c ? { motif: c.motif.slice(), mdur: c.mdur.slice(), mvel: c.mvel && c.mvel.slice(), mlen: c.mlen && c.mlen.slice(), mchord: c.mchord && JSON.parse(JSON.stringify(c.mchord)), loopLen: c.loopLen, scored: c.scored, freeCents: c.freeCents } : null }; };
  const restore = s => { const L = D.lane(s.id); if (!L) return; if (s.loop && L.ref) L.ref.loop = s.loop; if (s.c) { const c = creatureOf(L); Object.assign(c, s.c); c.scoreV = (c.scoreV || 0) + 1; } };
  D.edit = (L, fn) => { if (!L || L.kind === 'env' || L.kind === 'star') return null; const before = snap(L), pat = D.pattern(L); if (pat.ro) return null; const r = fn(pat); if (r === false) return null; D.write(L, pat); D.undo.push({ before, after: snap(L) }); D.redo = []; if (D.undo.length > 60) D.undo.shift(); D.touch(); return pat; };
  D.doUndo = () => { const u = D.undo.pop(); if (!u) return false; if (u.paint != null) RS.DawPaint.restore(Sf, u.paint, u.before); else restore(u.before); D.redo.push(u); D.touch(); return true; };
  D.doRedo = () => { const u = D.redo.pop(); if (!u) return false; if (u.paint != null) RS.DawPaint.restore(Sf, u.paint, u.after); else restore(u.after); D.undo.push(u); D.touch(); return true; };
  D.touch = () => { if (Sf.dirty && Sf.view) Sf.dirty.add(Sf.chunkKey(Sf.P.chunkOf(Sf.P.theta(Sf.view.cx, Sf.view.cy)))); for (const c of Sf.creatures) if (c.x != null) Sf.dirty.add(Sf.chunkKey(Sf.P.chunkOf(Sf.P.theta(c.x, c.y)))); D.changed = (D.changed || 0) + 1; };
  // ---- edit operations (each changes the lane's notes; the creature then plays the new part)
  const clampDeg = d => RS.clamp(Math.round(d), -9, 12);
  D.ops = {
    pitch: (L, k, deg, free) => D.edit(L, p => { const n = p.notes.find(q => q.k === k); if (!n) return false; n.deg = clampDeg(deg); n.free = free || 0; if (L.kind === 'instrument' && L.body) D.retune(L.body, deg); }),
    time: (L, k, s) => D.edit(L, p => { const n = p.notes.find(q => q.k === k); if (!n) return false; n.s = ((Math.round(s) % p.len) + p.len) % p.len; }),
    length: (L, k, len) => D.edit(L, p => { const n = p.notes.find(q => q.k === k); if (!n) return false; n.len = RS.clamp(Math.round(len), 1, 16); }),
    vel: (L, k, v) => D.edit(L, p => { const n = p.notes.find(q => q.k === k); if (!n) return false; n.vel = RS.clamp(v, .05, 1); }),
    add: (L, s, deg) => D.edit(L, p => { s = ((Math.round(s) % p.len) + p.len) % p.len; if (p.notes.some(q => q.s === s && q.deg === clampDeg(deg))) return false; const ex = p.notes.find(q => q.s === s); if (ex) { ex.chord = (ex.chord || []).concat([clampDeg(deg)]); return; } p.notes.push({ k: 1000 + p.notes.length, s, deg: clampDeg(deg), len: 2, vel: .8, chord: [] }); }),
    remove: (L, k) => D.edit(L, p => { const i = p.notes.findIndex(q => q.k === k); if (i < 0) return false; p.notes.splice(i, 1); }),
    chord: (L, s, degs) => D.edit(L, p => { let n = p.notes.find(q => q.s === s); if (!n) { n = { k: 2000, s, deg: clampDeg(degs[0]), len: 2, vel: .8, chord: [] }; p.notes.push(n); } const set = new Set([n.deg, ...(n.chord || [])]); for (const d of degs) set.add(clampDeg(d)); set.delete(n.deg); n.chord = [...set].sort((a, b) => a - b); }),
    loopLen: (L, len) => D.edit(L, p => { p.len = RS.clamp(Math.round(len), 2, 64); p.notes = p.notes.filter(n => n.s < p.len); }),
    shiftRow: (L, deg, ds) => D.edit(L, p => { let any = false; for (const n of p.notes) if (n.deg === deg) { n.s = ((n.s + Math.round(ds)) % p.len + p.len) % p.len; any = true; } return any ? undefined : false; }),
    invert: L => D.edit(L, p => { const ax = p.notes.length ? p.notes.slice().sort((a, b) => a.s - b.s)[0].deg : 0; for (const n of p.notes) { n.deg = clampDeg(2 * ax - n.deg); n.chord = (n.chord || []).map(d => clampDeg(2 * ax - d)); } }),
    retro: L => D.edit(L, p => { for (const n of p.notes) n.s = ((p.len - n.s - n.len) % p.len + p.len) % p.len; }),
    copy: (L, ks, L2, ds = 0) => { const src = D.pattern(L).notes.filter(n => ks.includes(n.k)); return D.edit(L2, p => { for (const n of src) p.notes.push(Object.assign({}, n, { k: 3000 + p.notes.length, s: ((n.s + ds) % p.len + p.len) % p.len })); }); },
    loopRegion: (L, s0, s1) => D.edit(L, p => { const a = Math.max(0, Math.floor(Math.min(s0, s1))), b = Math.min(p.len, Math.ceil(Math.max(s0, s1))); if (b - a < 2) return false; p.notes = p.notes.filter(n => n.s >= a && n.s < b).map(n => Object.assign(n, { s: n.s - a })); p.len = b - a; }),
    groupShift: (L, ks, dDeg, dS) => D.edit(L, p => { for (const n of p.notes) if (ks.includes(n.k)) { n.deg = clampDeg(n.deg + dDeg); n.s = ((n.s + dS) % p.len + p.len) % p.len; } }),
    groupVel: (L, ks, f) => D.edit(L, p => { for (const n of p.notes) if (ks.includes(n.k)) n.vel = RS.clamp(n.vel * f, .05, 1); }),
    groupLen: (L, ks, f) => D.edit(L, p => { for (const n of p.notes) if (ks.includes(n.k)) n.len = RS.clamp(Math.round(n.len * f), 1, 16); }) };
  // instrument lane pitch edit -> physical retune (string pitch ~ sqrt(tension))
  // b.tension is the rest-length factor (smaller = tighter = higher), so iterate on the live physics until the raw pitch reaches the target degree (octave-folded)
  D.retune = (b, deg) => { let f = Sf.S.physics(b).f0; if (!(f > 0) || !Number.isFinite(f)) return; let tgt = M.degHz(deg); if (!(tgt > 0) || !Number.isFinite(tgt)) return; let g = 0; while (tgt > f * 1.414 && g++ < 64) tgt /= 2; g = 0; while (tgt < f / 1.414 && g++ < 64) tgt *= 2; for (let k = 0; k < 14; k++) { f = Sf.S.physics(b).f0; if (Math.abs(1200 * Math.log2(f / tgt)) < 3) break; b.tension = RS.clamp((b.tension || 1) * Math.pow(f / tgt, .35), .5, 1.5); } Sf.stats.retunes = (Sf.stats.retunes || 0) + 1; A_retune(b); };
  const A_retune = b => { if (Sf.A && Sf.A.retune) try { Sf.A.retune(b.id, 1); } catch (e) { } };
  // lane-level mix + timbre; river-level tempo + key
  D.mixOp = { volume: (L, v) => { const m = mix(); m[L.id] = Object.assign(m[L.id] || {}, { vol: RS.clamp(v, 0, 1.5) }); D.touch(); }, mute: L => { const m = mix(); if (L.kind === 'creature' && L.ref && RS.Harm) { const on = RS.Harm.mute(Sf, L.ref); D.touch(); return on; } m[L.id] = Object.assign(m[L.id] || {}, { mute: !(m[L.id] && m[L.id].mute) }); D.touch(); return m[L.id].mute; },   /* C18: an ohm's DAW mute IS its jam mute (c.muted) */
    solo: L => { const m = mix(); m[L.id] = Object.assign(m[L.id] || {}, { solo: !(m[L.id] && m[L.id].solo) }); m._solo = Object.keys(m).some(k => k !== '_solo' && m[k] && m[k].solo); D.touch(); return m[L.id].solo; },
    timbre: (L, d) => { if (L.kind === 'creature' || L.kind === 'colony') { const c = creatureOf(L); c.P.bright = RS.clamp(c.P.bright + d, .05, 1); c.P.purity = RS.clamp((c.P.purity || .5) - d * .5, 0, 1); } else if (L.body) { L.body.mat.stiff = RS.clamp(L.body.mat.stiff + d * .3, .3, 1); } D.touch(); },
    braid: (L, open) => { if (L.kind !== 'colony' && !L.parent) return; const key = L.kind === 'colony' ? L.id : L.parent, m = mix(); m[key] = Object.assign(m[key] || {}, { open }); D.touch(); } };
  D.tempo = f => { const old = M.bpm; M.bpm = RS.clamp(Math.round(old * f), 50, 160); const t = Sf.now(); M.t0 = t - (t - M.t0) * old / M.bpm; Sf.mods.music = Object.assign(Sf.mods.music || {}, { bpm: M.bpm }); D.touch(); return M.bpm; };
  D.transpose = semis => { if (!semis) return M.root; M.root = ((M.root + semis) % 12 + 12) % 12; Sf.mods.music = Object.assign(Sf.mods.music || {}, { root: M.root }); for (const c of Sf.creatures) Sf.colourCreature(c); D.touch(); return M.root; };
  // ---------------- view geometry ----------------
  D.geo = (Wd, Ht) => { const ls = D.lanes(), top = 70 - D.scrollY, x0 = 46, x1 = Wd - 16, rows = []; let y = top; for (const L of ls) { const h = D.pat && D.pat.id === L.id ? 300 : L.sub ? 46 : 62; rows.push({ L, y, h }); y += h + 8; } return { rows, x0, x1, w: x1 - x0, Wd, Ht }; };
  D.laneAt = (g, x, y) => g.rows.find(r => y >= r.y && y < r.y + r.h) || null;
  // step <-> x across the river (the river shows two repeats: the pattern and its echo)
  // one shared time axis for every lane (D.SPAN steps across the river) so lanes and sub-lanes line up in time; loops repeat along it
  D.SPAN = 32; D.sx = (g, r, s, len) => g.x0 + (s / D.SPAN) * g.w; D.xs = (g, r, x, len) => (x - g.x0) / g.w * D.SPAN;
  D.dy = (r, deg) => r.y + r.h * .5 - deg * (r.h / 26); D.yd = (r, y) => -(y - r.y - r.h * .5) / (r.h / 26);
  // syllable letters of a creature's words (letters split across the word's syllables), drawn with the handwriting glyph skeletons
  D.sylLetters = c => { const key = c.words.map(w => w.w).join('|'); if (c._sylL && c._sylK === key) return c._sylL; const out = []; for (const w of c.words) { const word = /^[a-z']+$/.test(w.w) ? w.w : null, sy = RS.Creature.wordSyl(w); if (!word) { for (const s2 of sy) out.push('~'); continue; } const n = sy.length; let i0 = 0; for (let k = 0; k < n; k++) { const i1 = k === n - 1 ? word.length : Math.round(word.length * (k + 1) / n); out.push(word.slice(i0, i1)); i0 = i1; } } c._sylK = key; c._sylL = out; return out; };
  D.glyphs = (ctx, txt, x, y, sz, col, dim) => { const SK = RS.Ink && RS.Ink.SK; ctx.strokeStyle = RS.Render.css(RS.Render.mix(col, [255, 250, 225], .6), .9 * dim); ctx.lineWidth = 1.1; const w = sz * .8, x0 = x - (txt.length - 1) * w / 2;
    for (let i = 0; i < txt.length; i++) { const sk = SK && SK[txt[i]]; const cx = x0 + i * w; if (!sk) { ctx.beginPath(); ctx.arc(cx, y, sz * .3, 0, Math.PI * 2); ctx.stroke(); continue; } for (const st of sk) { ctx.beginPath(); st.forEach((p, k) => { const px = cx + (p[0] - .5) * sz * .7, py = y + (p[1] - .7) * sz * .7; k ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }); ctx.stroke(); } } };
  D.dragH = () => drag && drag.h;   /* v08-dawbrain: which stored bead a finger is on (the ghost lights up) */
  D.beadAt = (g, x, y) => { const r = D.laneAt(g, x, y); if (!r) return null; const p = D.pattern(r.L); if (D.pat && D.pat.id === r.L.id) return { r, n: D.patBead(g, r, p, x, y), p }; for (const n of p.notes) { const bx = D.sx(g, r, n.s, p.len), by = D.dy(r, n.deg), w = Math.max(10, D.sx(g, r, n.len, p.len) - g.x0); for (let rep = 0; rep * p.len < D.SPAN; rep++) { const ox = rep * p.len * g.w / D.SPAN; if (x >= bx + ox - 9 && x <= bx + ox + w && Math.abs(y - by) < 10) return { r, n, p }; } } return { r, n: null, p }; };
  // ---------------- gestures (called by the app's recogniser) ----------------
  let drag = null; const tapSound = (L, deg) => { const c = L.ref && L.ref.P ? creatureOf(L) : null; if (c) C().sing(Sf, c, deg, Sf.now() + .01, { gain: .9 }); else Sf.blip(Sf.view.cx, Sf.view.cy, M.degHz(deg + 7), .05, .4); };
  D.down = (x, y, g, pr) => { const h = D.beadAt(g, x, y); drag = { x0: x, y0: y, t0: performance.now(), h, path: [[x, y]], moved: 0 }; if (D.pat && h && h.r.L.id === D.pat.id) drag.inPat = true; if (h && h.r && Math.abs(y - h.r.y) < 8) drag.edge = 'top'; if (h && h.r && Math.abs(y - (h.r.y + h.r.h)) < 8) drag.edge = 'bot'; if (h && h.n && D.sel.has(h.r.L.id + ':' + h.n.k)) drag.group = true;
    // v08-dawpaint: an ohm lane PAINTS: from an empty spot at once; from a stored bead / edge after a short rest (DP.REST) then a drag
    { const DPm = RS.DawPaint; if (DPm && h && h.r && !D.pat && !drag.group && DPm.can(h.r.L)) { if (!h.n && !drag.edge) { drag.paint = true; DPm.begin(h.r.L.id, x, y, drag.t0, pr); } else drag.paintable = true; } }
    // bead EDGES (creature lanes, not the open pattern): the front edge = attack (drag right = softer), the tail = release (drag right = longer)
    if (h && h.n && !drag.inPat && h.r.L.kind === 'creature' && h.r.L.ref && h.r.L.ref.P.inst) { const p = h.p, n = h.n, X = D.sx(g, h.r, n.s, p.len), w = Math.max(4, D.sx(g, h.r, n.len, p.len) - g.x0), rad = 3 + n.vel * 5; if (Math.abs(x - (X - rad)) < 5) drag.benv = 'att'; else if (Math.abs(x - (X + w)) < 6 && x > X + rad * .5) drag.benv = 'rel'; } };
  D.move = (x, y, g, pr) => { if (!drag) return; drag.path.push([x, y]); drag.moved = Math.max(drag.moved, Math.hypot(x - drag.x0, y - drag.y0)); const h = drag.h; if (!h) return;
    { const DPm = RS.DawPaint; if (drag.paint) { DPm.push(x, y, performance.now(), pr); return; }   // v08-dawpaint: the stroke being painted (fixed buffer)
      if (drag.paintable && !drag.pdec && drag.moved >= 10) { drag.pdec = true; const now = performance.now(); if (now - drag.t0 >= DPm.REST && !drag.select) { drag.paint = true; DPm.begin(h.r.L.id, drag.x0, drag.y0, drag.t0, pr); const k = Math.max(1, drag.path.length - 1); for (let i = 1; i < drag.path.length; i++) DPm.push(drag.path[i][0], drag.path[i][1], drag.t0 + (now - drag.t0) * i / k, pr); return; } } }
    // swipe across beads = select (fast drag starting on a bead and crossing others)
    if (h.n && !drag.group && !drag.inPat) { const v = drag.moved / Math.max(1, performance.now() - drag.t0); if (v > .9 && drag.moved > 40) { drag.select = true; const b = D.beadAt(g, x, y); if (b && b.n) D.sel.add(b.r.L.id + ':' + b.n.k); D.sel.add(h.r.L.id + ':' + h.n.k); } } };
  D.up = (x, y, g, info = {}) => { const d = drag; drag = null; if (!d) return null; const h = d.h; if (!h) return null; const r = h.r, L = r.L, p = h.p, dt = performance.now() - d.t0;
    if (d.paint) { const DPm = RS.DawPaint; DPm.end(); if (d.moved >= 10 && !info.held) {   // v08-dawpaint: a closed loop is still the loop region; a rub erases; anything else is a painted phrase
        const P0 = d.path[0], Pn = d.path[d.path.length - 1]; if (d.path.length > 8 && Math.hypot(P0[0] - Pn[0], P0[1] - Pn[1]) < 30 && d.moved > 50 && !DPm.rub()) { const xs = d.path.map(q => q[0]); D.ops.loopRegion(L, D.xs(g, r, Math.min(...xs), p.len), D.xs(g, r, Math.max(...xs), p.len)); return 'loop'; }
        if (DPm.rub()) { const xr = DPm.xRange(); DPm.stats.rubs++; return DPm.erase(D, Sf, g, r, xr[0], xr[1]) ? 'erase' : null; }
        return DPm.paint(D, Sf, g, r) ? 'paint' : null; } }
    if (d.benv && Math.abs(x - d.x0) >= 6) { const c = L.ref, gi = RS.IG[d.benv]; RS.Creature.editGene(Sf, c, d.benv, RS.clamp(c.g[gi] + (x - d.x0) / 160, 0, .9999)); tapSound(L, h.n.deg); return d.benv === 'att' ? 'attack' : 'release'; }
    if (d.moved < 10 && dt < 300) return D.tap(x, y, g, h);
    if (d.select) return 'select';
    if (d.edge && !h.n) { const dd = (d.edge === 'top' ? d.y0 - y : y - d.y0) / 80; D.mixOp.timbre(L, dd); return 'timbre'; }
    if (d.group) { const dS = Math.round(D.xs(g, r, x, p.len) - D.xs(g, r, d.x0, p.len)), dDeg = Math.round(D.yd(r, y) - D.yd(r, d.y0)); const r2 = D.laneAt(g, x, y); const ks = [...D.sel].filter(s => s.startsWith(L.id + ':')).map(s => +s.split(':')[1]);
      if (r2 && r2.L.id !== L.id) { D.ops.copy(L, ks, r2.L, dS); return 'copy'; } D.ops.groupShift(L, ks, dDeg, dS); D.sel.clear(); return 'group'; }
    if (D.pat && D.pat.id === L.id) return D.patUp(d, x, y, g, h);
    // a drawn closed loop around a region -> make it the loop
    const P0 = d.path[0], Pn = d.path[d.path.length - 1]; if (d.path.length > 8 && Math.hypot(P0[0] - Pn[0], P0[1] - Pn[1]) < 30 && d.moved > 50) { const xs = d.path.map(q => q[0]); D.ops.loopRegion(L, D.xs(g, r, Math.min(...xs), p.len), D.xs(g, r, Math.max(...xs), p.len)); return 'loop'; }
    if (h.n) { const dS = D.xs(g, r, x, p.len) - D.xs(g, r, d.x0, p.len), dDeg = D.yd(r, y) - D.yd(r, d.y0); if (Math.abs(dDeg) >= Math.abs(dS) * .6) { const nd = h.n.deg + dDeg, over = Math.abs(dDeg) > 9; D.ops.pitch(L, h.n.k, nd, over ? Math.round((nd - Math.round(nd)) * 100) || 37 : 0); tapSound(L, Math.round(nd)); return over ? 'free' : 'pitch'; } D.ops.time(L, h.n.k, h.n.s + dS); return 'time'; }
    // drawing on an empty lane writes notes (in key) at the steps crossed
    let wrote = 0; const done = new Set(); for (const q of d.path) { const s = Math.round(D.xs(g, r, q[0], p.len)); if (s < 0 || s >= p.len || done.has(s)) continue; done.add(s); if (D.ops.add(L, s, Math.round(D.yd(r, q[1])))) wrote++; } return wrote ? 'write' : null; };
  D.tap = (x, y, g, h) => { const r = h.r, L = r.L; if (h.n) { if (D.pat && D.pat.id === L.id) { D.ops.remove(L, h.n.k); return 'remove'; } tapSound(L, h.n.deg); return 'audition'; }
    if (D.pat && D.pat.id === L.id) { const p = h.p, s = Math.floor(D.patS(g, r, x, p.len)), deg = Math.round(D.patDeg(r, y)); D.ops.add(L, s, deg); return 'add'; }
    if (L.kind === 'colony' && L.braided) { D.mixOp.braid(L, true); return 'unbraid'; }
    if (L.kind !== 'env' && L.kind !== 'star') { D.pat = { id: L.id }; return 'openPattern'; } return null; };
  D.doubleTap = (x, y, g) => { const r = D.laneAt(g, x, y); if (!r) return null; return D.mixOp.solo(r.L) ? 'solo' : 'unsolo'; };
  D.hold = (x, y, g) => { const r = D.laneAt(g, x, y); if (!r) return null; return D.mixOp.mute(r.L) ? 'mute' : 'unmute'; };
  // two fingers: on a bead = stretch (length) / pinch (velocity); on a lane = volume (vertical pinch) / braid; on empty river = tempo (horizontal stretch)
  D.two = (ph, info, g) => { if (ph === 'start') { const h = D.beadAt(g, info.cx, info.cy); D.twoH = h; D.two0 = info; return; } if (ph !== 'end') return; const h = D.twoH, s0 = D.two0; D.twoH = null; if (D.pat && (info.dist / Math.max(20, s0.dist)) < .45) { D.pat = null; return 'closePattern'; } if (!h) { const fx = info.dx / Math.max(20, s0.dx); if (Math.abs(info.dx) > Math.abs(info.dy) && Math.abs(fx - 1) > .1) return D.tempo(fx) && 'tempo'; return null; }
    if (D.pat && (info.dist / Math.max(20, s0.dist)) < .45) { D.pat = null; return 'closePattern'; }
    const L = h.r.L, sx = Math.abs(info.dx) / Math.max(20, Math.abs(s0.dx)), sy = Math.abs(info.dy) / Math.max(20, Math.abs(s0.dy)), ratio = info.dist / Math.max(20, s0.dist);
    if (D.pat && D.pat.id === L.id && ratio < .45) { D.pat = null; return 'closePattern'; }
    if (L.kind === 'colony' || L.parent) { if (ratio > 1.3) { D.mixOp.braid(L, true); return 'unbraid'; } if (ratio < .75) { D.mixOp.braid(L, false); return 'braid'; } }
    const ks = [...D.sel].filter(s => s.startsWith(L.id + ':')).map(s => +s.split(':')[1]);
    if (h.n || ks.length) { const kk = ks.length ? ks : [h.n.k]; if (Math.abs(s0.dx) >= Math.abs(s0.dy)) { if (kk.length > 1) D.ops.groupLen(L, kk, sx); else D.ops.length(L, kk[0], Math.max(1, h.n.len * sx)); return 'length'; } if (kk.length > 1) D.ops.groupVel(L, kk, ratio); else D.ops.vel(L, kk[0], h.n.vel * ratio); return 'velocity'; }
    if (Math.abs(s0.dy) > Math.abs(s0.dx)) { const m = mix(); D.mixOp.volume(L, ((m[L.id] && m[L.id].vol) == null ? 1 : m[L.id].vol) * sy); return 'volume'; } return null; };
  D.twist = deg => { const semis = Math.round(deg / 30); return D.transpose(semis); };
  // ---- pattern lattice (opened in place): rows = scale degrees, columns = steps
  D.patS = (g, r, x, len) => (x - g.x0) / g.w * len; D.patX = (g, r, s, len) => g.x0 + s / len * g.w;
  D.patDeg = (r, y) => -(y - r.y - r.h * .5) / (r.h / 20); D.patY = (r, deg) => r.y + r.h * .5 - deg * (r.h / 20);
  D.patBead = (g, r, p, x, y) => p.notes.find(n => { const bx = D.patX(g, r, n.s, p.len), by = D.patY(r, n.deg), w = D.patX(g, r, n.len, p.len) - g.x0; return x >= bx - 6 && x <= bx + w && Math.abs(by - y) < 9; }) || null;
  D.patUp = (d, x, y, g, h) => { const r = h.r, L = r.L, p = D.pattern(L), sx0 = D.patS(g, r, d.x0, p.len), sx1 = D.patS(g, r, x, p.len), dg0 = D.patDeg(r, d.y0), dg1 = D.patDeg(r, y), dx = x - d.x0, dy = y - d.y0, fast = d.moved / Math.max(1, performance.now() - d.t0) > .8;
    // drag the pattern's end -> loop length
    if (Math.abs(d.x0 - D.patX(g, r, p.len, p.len)) < 16) { D.ops.loopLen(L, sx1); return 'loopLen'; }
    // flip gestures across the centre: horizontal fast swipe through the middle -> invert; vertical fast swipe through the middle -> retrograde
    const cy = r.y + r.h / 2, cx = g.x0 + g.w / 2; if (fast && Math.abs(dx) > g.w * .4 && (d.y0 - cy) * (y - cy) <= 0 + 400 && Math.abs(d.y0 - cy) < 40) { D.ops.invert(L); return 'invert'; }
    if (fast && Math.abs(dy) > r.h * .5 && Math.abs(d.x0 - cx) < 30) { D.ops.retro(L); return 'retro'; }
    // vertical swipe across a column -> stack a chord
    if (Math.abs(dy) > 40 && Math.abs(dx) < 16) { const s = Math.floor(sx0), lo = Math.round(Math.min(dg0, dg1)), hi = Math.round(Math.max(dg0, dg1)), degs = []; for (let k = lo; k <= hi; k += 2) degs.push(k); D.ops.chord(L, s, degs); return 'chord'; }
    // slide a whole row (from the left margin)
    if (d.x0 < g.x0 + 10) { D.ops.shiftRow(L, Math.round(dg0), sx1 - sx0); return 'shiftRow'; }
    const n = D.patBead(g, r, p, d.x0, d.y0); if (n) { D.ops.time(L, n.k, Math.floor(sx1)); D.ops.pitch(L, n.k, Math.round(n.deg + (dg1 - dg0))); return 'move'; }
    return null; };
  D.patTwo = D.two;
  // ---------------- render ----------------
  D.render = (ctx, Wd, Ht, dpr, T) => { const g = D.geo(Wd, Ht), t = Sf.now(), B = RS.DawBrain ? RS.DawBrain.frame(D, Sf) : null;   /* v08-dawbrain: the brain layer (null = off) */ ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.globalAlpha = T; const css = RS.Render.css;
    ctx.fillStyle = 'rgba(6,8,16,.94)'; ctx.fillRect(0, 0, Wd, Ht);
    // harmonic colour tension per bar (warm = tension (D), cool = rest (T)) and river bends at section changes
    const bar = M.bar(t), bd = M.barDur(); for (let k = 0; k < 4; k++) { const bi = M.barInfo(t + k * bd * .5 - (t - M.t0) % bd), fn = bi.fn || 'T', col = fn === 'D' ? [255, 120, 60] : fn === 'S' ? [220, 200, 90] : [70, 140, 255]; ctx.fillStyle = css(col, .07 + (bi.cad ? .06 : 0)); ctx.fillRect(g.x0 + k * g.w / 4, 0, g.w / 4, Ht); }
    for (const r of g.rows) { const L = r.L, p = D.pattern(L), col = L.col || [200, 200, 200], m = (Sf.mix || {})[L.id] || {}, dim = m.mute ? .25 : (Sf.mix && Sf.mix._solo && !m.solo) ? .35 : 1;
      // lane = a flowing band of the voice's own colour (braided colonies twist several strands)
      const bend = k => Math.sin(k * .006 + t * .4 + r.y * .01) * 4 + (RS.Theory ? Math.sin(Math.floor((bar + k / g.w * 2) / 4) * 1.7) * 3 : 0);
      ctx.beginPath(); for (let k = 0; k <= g.w; k += 12) ctx.lineTo(g.x0 + k, r.y + bend(k)); for (let k = g.w; k >= 0; k -= 12) ctx.lineTo(g.x0 + k, r.y + r.h + bend(k)); ctx.closePath(); ctx.fillStyle = css(col, .13 * dim); ctx.fill();
      if (L.kind === 'colony' && L.braided) { ctx.lineWidth = 1.5; L.members.forEach((mm, i) => { ctx.strokeStyle = css(mm.col || col, .5 * dim); ctx.beginPath(); for (let k = 0; k <= g.w; k += 6) ctx.lineTo(g.x0 + k, r.y + r.h / 2 + Math.sin(k * .03 + i * TAU / L.members.length + t) * r.h * .3); ctx.stroke(); }); }
      // the voice's tiny living silhouette at the lane start
      const c = L.ref && L.ref.P ? (L.kind === 'colony' ? L.ref.members[0] : L.ref) : null; if (c) { ctx.save(); ctx.translate(22, r.y + r.h / 2); const O = RS.Creature.outline(c.P, 9, 0, 14); ctx.beginPath(); O.forEach(([px, py], i) => i ? ctx.lineTo(px, py + Math.sin(t * 3 + i) * .6) : ctx.moveTo(px, py)); ctx.closePath(); ctx.fillStyle = css(c.col || col, dim); ctx.fill(); ctx.restore(); }
      else { ctx.fillStyle = css(col, .7 * dim); ctx.beginPath(); ctx.arc(22, r.y + r.h / 2, L.kind === 'star' ? 7 + Math.sin(t * 2) * 1.5 : 5, 0, TAU); ctx.fill(); }
      const inPat = D.pat && D.pat.id === L.id;
      const DPo = RS.DawPaint && inPat ? RS.DawPaint : null;   /* v08-dawpaint (8:45 PM card: "Yes, make the pattern editor organic too"): no rows / columns; the loop end = a living frond */
      if (inPat) { if (DPo) DPo.patEnd(ctx, D.patX(g, r, p.len, p.len), r.y + 8, r.y + r.h - 8, col, t); else { ctx.strokeStyle = 'rgba(255,255,255,.08)'; ctx.lineWidth = 1; for (let s = 0; s <= p.len; s++) { const x = D.patX(g, r, s, p.len); ctx.beginPath(); ctx.moveTo(x, r.y); ctx.lineTo(x, r.y + r.h); ctx.stroke(); } for (let d2 = -9; d2 <= 10; d2++) { const y = D.patY(r, d2); ctx.strokeStyle = d2 % 7 === 0 ? 'rgba(255,255,255,.16)' : 'rgba(255,255,255,.05)'; ctx.beginPath(); ctx.moveTo(g.x0, y); ctx.lineTo(g.x1, y); ctx.stroke(); }
        ctx.fillStyle = css(col, .8); ctx.fillRect(D.patX(g, r, p.len, p.len) - 3, r.y + 8, 6, r.h - 16); } }
      if (B) B.under(ctx, g, r, L, t, dim, inPat); const ga = B ? B.ghostA(L, inPat) : 1;   /* v08-dawbrain: lattice / chord / cycle / kit rows under; the stored tune turns into a ghost while live notes show */
      // beads (notes): colour = pitch colour, size = velocity, length = duration; chords = clusters; second repeat = the loop's echo
      for (const rep of inPat ? [0] : Array.from({ length: Math.ceil(D.SPAN / p.len) }, (_, i) => i)) for (const n of p.notes) { const X = inPat ? D.patX(g, r, n.s, p.len) : D.sx(g, r, n.s, p.len) + rep * p.len * g.w / D.SPAN, Y = inPat ? D.patY(r, n.deg) : D.dy(r, n.deg), w = Math.max(4, (inPat ? D.patX(g, r, n.len, p.len) : D.sx(g, r, n.len, p.len)) - g.x0), rad = 3 + n.vel * 5, f = M.degHz(n.deg + 7), bc = RS.soundColour ? RS.soundColour(M, f, .7) : col, sel = D.sel.has(L.id + ':' + n.k);
        if (DPo) { const sw = DPo.patNote(ctx, X, Y, w, rad, bc, .95 * dim * ga, t, n.k || 0, sel); for (const cd of n.chord || []) { const Y2 = D.patY(r, cd); DPo.tendril(ctx, X, Y, Y2, bc, .5 * dim * ga, t, n.k || 0); DPo.patNote(ctx, X, Y2, w * .6, rad * .8, bc, .8 * dim * ga, t, (n.k || 0) + cd, false); }
          if (c && c.words && c.words.length && RS.Vocal) { const sl = D.sylLetters(c), k = p.notes.indexOf(n), txt = sl.length ? sl[k % sl.length] : ''; if (txt) D.glyphs(ctx, txt, X, Y + sw - rad - 9, Math.max(5, rad * 1.3), bc, dim); } continue; }   // organic: a swaying leaf per note, chords = a tendril of leaves
        ctx.fillStyle = css(bc, (rep ? .35 : .95) * dim * ga); ctx.beginPath(); ctx.arc(X, Y, rad, Math.PI / 2, Math.PI * 1.5); ctx.lineTo(X + w, Y - rad * .6); ctx.arc(X + w, Y, rad * .6, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill(); if (ga < 1 && !rep) { ctx.strokeStyle = 'rgba(255,255,255,.22)'; ctx.lineWidth = 1; ctx.stroke(); } if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke(); }
        { const cr = L.kind === 'creature' ? L.ref : null, ms = cr && cr.motifSrc; if (ms && ms.p && n.k != null) { const sc = ms.p[n.k % 8] === 'a' ? ms.ca : ms.cb; if (sc) { ctx.strokeStyle = css(sc, .32 * dim * ga); ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(X, Y, rad + 2.2, 0, TAU); ctx.stroke(); } } }   /* inherited bead: faint tint of its source parent */
        for (const cd of n.chord || []) { const Y2 = inPat ? D.patY(r, cd) : D.dy(r, cd); ctx.strokeStyle = css(bc, .5 * dim * ga); ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X, Y2); ctx.stroke(); ctx.beginPath(); ctx.arc(X, Y2, rad * .8, 0, TAU); ctx.fill(); }
        if (c && c.words && c.words.length && !rep && RS.Vocal) { const sl = D.sylLetters(c), k = p.notes.indexOf(n), txt = sl.length ? sl[k % sl.length] : ''; if (txt) D.glyphs(ctx, txt, X, Y - rad - 9, Math.max(5, rad * 1.3), bc, dim); }   // the word's syllable, in glowing letter glyphs (the player's own words)
        if (n.free) { ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.arc(X, Y, rad + 3, 0, TAU); ctx.stroke(); ctx.setLineDash([]); } }
      // playhead: where this voice is in its own loop
      const ph = c && c.scored && c.scorePos != null ? c.scorePos : ((M.b16(t) * (c ? c.tempo : 1)) % p.len); const X = inPat ? D.patX(g, r, ph, p.len) : D.sx(g, r, ph, p.len); ctx.strokeStyle = css(col, .6 * (ga < 1 ? .5 : 1)); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, r.y + 4); ctx.lineTo(X, r.y + r.h - 4); ctx.stroke();
      if (RS.DawPaint && !inPat) RS.DawPaint.draw(ctx, D, g, r, L, t, dim);   /* v08-dawpaint: painted ribbons (and the stroke being painted) */
      if (B) B.over(ctx, g, r, L, t, dim, inPat); }   /* v08-dawbrain: live beads (read-only), the brain's sweep, the role mark */
    // key wheel (colour wheel turns with transposition) - top right, a living ring, no text
    const kx = Wd - 34, ky = 34; for (let k = 0; k < 12; k++) { const a = (k - M.root) / 12 * TAU - Math.PI / 2, f = M.rootHz() * Math.pow(2, k / 12); ctx.fillStyle = css(RS.soundColour ? RS.soundColour(M, f, .8) : [255, 255, 255], k === 0 ? 1 : .55); ctx.beginPath(); ctx.arc(kx + Math.cos(a) * 18, ky + Math.sin(a) * 18, k === 0 ? 4.5 : 3, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; };
  return D; };
})(typeof window !== 'undefined' ? window : globalThis);
