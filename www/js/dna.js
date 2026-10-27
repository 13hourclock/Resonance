'use strict';
// DNA zoom: body -> cells -> nucleus -> helix. Genes are rungs coloured by value (hue -> pitch through the light->pitch mapping) on strands
// banded by region. Drag a rung = slide its value (live ghost preview); pinch = amplify; tap = pluck (hear it); fast swipe across a region = scramble
// it (player-initiated mutation). The music region (motif stave, genes 107-122) is a playable stave: pluck along it to hear the encoded motif.
// Leaving re-grows the creature from the edited genome.
(function (G) {
const RS = G.RS, TAU = RS.TAU;
RS.DNA = function (Sf, c) {
  if (RS.Creature.epiUpdate) RS.Creature.epiUpdate(Sf, c);
  const V = { Sf, c, g: new Float32Array(c.g), depth: 0, scroll: 0, edited: false, ghost: null, t0: Sf.now() }, M = Sf.M, NG = RS.Genome.NG;
  V.refresh = () => { V.ghost = RS.Genome.express(V.g, Sf.env); };
  V.refresh();
  // geometry: helix vertical; gene i at y = top + i*sp - scroll; rung spans the two strands
  V.geo = (Wd, Ht) => { const sp = 22, cx = Wd / 2, amp = Math.min(120, Wd * .32); return { sp, cx, amp, top: 120 - V.scroll, Wd, Ht }; };
  V.yOf = (geo, i) => geo.top + i * geo.sp; V.iAt = (geo, y) => Math.round((y - geo.top) / geo.sp);
  V.toneOf = i => { const v = V.g[i], wl = 400 + v * 300; return M.wlHz(wl); };
  V.pluck = (i, when) => { const f = V.toneOf(i), reg = RS.regionOf(i); Sf.play({ modes: [{ f, a: 1, d: .9 }, { f: f * 2, a: .3, d: .5 }, { f: f * 3, a: .12, d: .3 }], gain: .08, att: .004, send: .5, force: true, lane: 'dna' }, when || Sf.now() + .01, c.x, c.y); return f; };
  // the stave: genes 107..114 pitches + 115..122 durations -> play the motif from the rung tapped onward
  V.playMotif = (from = 0) => { const mo = RS.Genome.motifOf(V.g); let t = Sf.now() + .02; const out = []; for (let k = from; k < 8; k++) { const d = mo.d[k] * M.dt16(); if (mo.p[k] != null) { const f = RS.Creature.hz(Sf, c, mo.p[k]); Sf.play({ modes: [{ f, a: 1, d: .5 }, { f: f * 2, a: .25, d: .3 }], gain: .09, att: .01, send: .4, force: true, lane: 'dna' }, t, c.x, c.y); out.push(mo.p[k]); } t += d; } return out; };
  V.set = (i, v) => { if (i < 0 || i >= NG) return; V.g[i] = RS.clamp(v, 0, .9999); V.edited = true; V.refresh(); };
  V.amplify = (i, f) => V.set(i, .5 + (V.g[i] - .5) * f);
  V.scramble = (reg, seed) => { const m = RS.Genome.mutate(V.g, seed, 1, .25, .35, true); for (let i = reg.a; i < reg.b; i++) V.g[i] = m[i]; V.edited = true; V.refresh(); };
  // ---- gestures
  let drag = null;
  V.down = (x, y, geo) => { const i = V.iAt(geo, y); drag = { x0: x, y0: y, i, v0: V.g[i], t0: performance.now(), onRung: Math.abs(x - geo.cx) < geo.amp + 20 && i >= 0 && i < NG, moved: 0, sc0: V.scroll }; };
  V.move = (x, y, geo) => { if (!drag) return; drag.moved = Math.max(drag.moved, Math.hypot(x - drag.x0, y - drag.y0)); const dx = x - drag.x0, dy = y - drag.y0;
    if (drag.onRung && Math.abs(dx) > Math.abs(dy) * 1.2 && drag.moved > 8) { drag.mode = 'slide'; V.set(drag.i, drag.v0 + dx / (geo.amp * 2)); if (performance.now() - (drag.lastP || 0) > 90) { drag.lastP = performance.now(); V.pluck(drag.i); } }
    else if (drag.mode !== 'slide') { drag.mode = 'scroll'; V.scroll = RS.clamp(drag.sc0 - dy, -200, NG * geo.sp - geo.Ht + 260); } };
  V.up = (x, y, geo) => { const d = drag; drag = null; if (!d) return null; const dt = performance.now() - d.t0;
    if (d.moved < 10 && dt < 300 && d.onRung) { if (d.i >= 107 && d.i < 123) { V.playMotif(d.i < 115 ? d.i - 107 : d.i - 115); return 'stave'; } V.pluck(d.i); return 'pluck'; }
    // fast horizontal swipe across the helix = scramble that region (deliberate, player-initiated)
    if (d.mode === 'slide' && Math.abs(x - d.x0) > geo.amp * 1.6 && dt < 260) { V.g[d.i] = d.v0; const reg = RS.regionOf(d.i); V.scramble(reg, Math.floor(performance.now())); V.audition(d.i); return 'scramble'; }
    if (d.mode === 'slide') V.audition(d.i);
    return d.mode || null; };
  V.pinch = (ratio, cy, geo) => { const i = V.iAt(geo, cy); if (i < 0 || i >= NG) return null; V.amplify(i, ratio); V.audition(i); return 'amplify'; };
  // audition: the edited creature (ghost genome) sings a short phrase of its motif in its NEW voice, on the grid, in key (conductor gate);
  // music genes play the changed motif in full. The ghost pulses while it sings.
  V.audition = i => { const P = V.ghost, mo = P.mus.motif, full = i >= 96 && i < 128, n = full ? 8 : 4, M2 = Sf.M; let g0 = M2.nextGrid(Sf.now() + .03).g; const out = [];
    for (let k = 0; k < n; k++) { const deg = mo.p[k]; const step = Math.max(1, Math.min(4, mo.d[k] || 2)); if (deg != null) { const f = RS.Creature.hz(Sf, c, deg) * Math.pow(2, (P.reg - c.P.reg) * .5) * Math.sqrt(c.P.size / P.size), v = Sf.S.voice(P, 0, { gain: .1 * (P.loud || 1), len: .25 * step, pan: 0 }); const r = f / v.f0; v.modes.forEach(m => m.f *= r); v.f0 = f; v.player = true; v.lane = 'dna'; v.grid = true; Sf.play(v, M2.gridTime(g0), c.x, c.y); out.push(deg); } g0 += step; }
    V.pulseT = Sf.now(); Sf.stats.auditions = (Sf.stats.auditions || 0) + 1; return out; };
  // leaving: the creature re-grows from the edited genome (keeps its learned key/tempo/place)
  V.commit = () => { if (!V.edited) return c; const ed = []; for (let i = 0; i < NG; i++) if (V.g[i] !== c.g[i]) ed.push(i); const has = (a, b) => ed.some(i => i >= a && i < b);
    // player edits write the genome and WIN over learned (epigenetic) state for the edited genes; untouched learned traits are kept
    const keep = { gen: c.gen, parents: c.parents, growth: .35, energy: c.energy }; if (!has(164, 165)) keep.keyC = c.keyC; if (!has(165, 166)) keep.tempo = c.tempo; if (!has(167, 168)) keep.regOff = c.regOff;
    const x = c.x, y = c.y, oldMotif = c.motif.slice(), oldEpi = c.epi, oldLoop = c.loop, oldHome = c.home; Sf.removeCreature(c); const n = Sf.addCreature(RS.Genome.fromCode(RS.Genome.toCode(V.g)), x, y - 10, keep);   /* snapped to the stored precision: what you hear now is what reloads */
    if (!has(107, 123)) n.motif = oldMotif; if (oldEpi) { n.epi = { via: oldEpi.via || {}, marks: {} }; } if (!has(164, 168)) { n.epiPhase = c.epiPhase; n.loopG0 = c.loopG0; } RS.Creature.epiUpdate(Sf, n); n.editedGenes = ed; n.edited = true; Sf.stats.dnaEdits = (Sf.stats.dnaEdits || 0) + 1; Sf.fx({ k: 'bloom', x, y, col: n.col, dur: 1.5 }); V.c = n; return n; };
  // ---- render: depth 0..1 (body -> cells -> nucleus -> helix)
  V.render = (ctx, Wd, Ht, dpr) => { const css = RS.Render.css, geo = V.geo(Wd, Ht), d = V.depth, t = Sf.now(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = ctx.createRadialGradient(Wd / 2, Ht / 2, 0, Wd / 2, Ht / 2, Ht); bg.addColorStop(0, css(RS.Render.mix(c.col || [80, 80, 90], [10, 10, 20], .7))); bg.addColorStop(1, 'rgb(4,4,10)'); ctx.fillStyle = bg; ctx.fillRect(0, 0, Wd, Ht);
    if (d < .66) { // cells: a membrane mosaic that swells, then one nucleus fills the view
      const r = RS.rng(RS.Genome.hash(c.g)), z = 1 + d * 10, n = 40; for (let k = 0; k < n; k++) { const x = Wd / 2 + (r() - .5) * Wd * 1.4 * z, y = Ht / 2 + (r() - .5) * Ht * 1.4 * z, R = (18 + r() * 16) * z; ctx.fillStyle = css(c.col || [150, 150, 150], .25); ctx.strokeStyle = css(c.col2 || [200, 200, 200], .5); ctx.beginPath(); ctx.arc(x, y, R, 0, TAU); ctx.fill(); ctx.stroke(); ctx.fillStyle = css([255, 255, 255], .15); ctx.beginPath(); ctx.arc(x, y, R * .3, 0, TAU); ctx.fill(); }
      if (d > .33) { const k = (d - .33) / .33, R = 40 + k * Math.max(Wd, Ht); ctx.fillStyle = css([20, 18, 40], k); ctx.beginPath(); ctx.arc(Wd / 2, Ht / 2, R, 0, TAU); ctx.fill(); } return; }
    const a = RS.clamp((d - .66) / .34, 0, 1); ctx.globalAlpha = a;
    // ghost preview of the edited creature (top), breathing
    if (V.ghost) { ctx.save(); ctx.translate(Wd / 2, 62); const pz = V.pulseT != null ? Math.max(0, 1 - (t - V.pulseT) / 1.2) : 0; ctx.scale(1 + pz * .15, 1 + pz * .15); const O = RS.Creature.outline(V.ghost, Math.min(46, V.ghost.size * 1.2), 0, 30); ctx.beginPath(); O.forEach(([px, py], i) => i ? ctx.lineTo(px, py * (1 + Math.sin(t * 2) * .03)) : ctx.moveTo(px, py)); ctx.closePath(); const gcol = RS.soundColour(M, V.ghost.f0, V.ghost.bright * V.ghost.sat); ctx.fillStyle = css(gcol, .55); ctx.fill(); ctx.strokeStyle = css([255, 255, 255], .4); ctx.stroke(); ctx.restore(); }
    for (let i = 0; i < NG; i++) { const y = V.yOf(geo, i); if (y < 90 || y > Ht + 20) continue; const ph = i * .45 + t * .3, x1 = geo.cx + Math.sin(ph) * geo.amp, x2 = geo.cx - Math.sin(ph) * geo.amp, depth = Math.cos(ph), reg = RS.regionOf(i), v = V.g[i];
      const val = RS.oklch ? RS.oklch(.72, .14, RS.pHue(v)) : RS.wlRGB(400 + v * 300), band = RS.oklch ? RS.oklch(.55, .1, reg.hue) : [200, 200, 200];
      ctx.strokeStyle = css(val, .55 + .45 * (depth * .5 + .5)); ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(x1, y); ctx.lineTo(x2, y); ctx.stroke();
      if (c.editedGenes && c.editedGenes.includes(i)) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y - 3); ctx.lineTo(x2, y - 3); ctx.stroke(); }   /* player-edited genes (envelope halo / DAW edges / DNA) shine */
      // what this gene controls, as a glyph in its region's colour (no text): body ○, material ■, colour ◐, motion ∿, behaviour ➤, voice ◠◠, music ♪-dots, senses ◉, life ✿, tuning ⋔
      { const gx = geo.cx - geo.amp - 24, gc = css(band, .85); ctx.strokeStyle = gc; ctx.fillStyle = gc; ctx.lineWidth = 1.6; ctx.beginPath(); const k = reg.k;
        if (k === 'body') ctx.arc(gx, y, 5, 0, TAU); else if (k === 'material') ctx.rect(gx - 4, y - 4, 8, 8); else if (k === 'colour') { ctx.arc(gx, y, 5, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill(); ctx.beginPath(); ctx.arc(gx, y, 5, 0, TAU); }
        else if (k === 'motion') { for (let q = 0; q <= 8; q++) { const xx = gx - 6 + q * 1.5, yy = y + Math.sin(q / 8 * TAU + t * 3) * 3; q ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } } else if (k === 'behaviour') { ctx.moveTo(gx - 5, y - 4); ctx.lineTo(gx + 5, y); ctx.lineTo(gx - 5, y + 4); }
        else if (k === 'voice') { ctx.arc(gx - 3, y + 2, 3, Math.PI, 0); ctx.moveTo(gx + 6, y + 2); ctx.arc(gx + 3, y + 2, 3, Math.PI, 0); } else if (k === 'music') { ctx.arc(gx - 3, y + 2, 2.2, 0, TAU); ctx.moveTo(gx + 5.2, y - 2); ctx.arc(gx + 3, y - 2, 2.2, 0, TAU); ctx.fill(); ctx.beginPath(); }
        else if (k === 'senses') { ctx.ellipse(gx, y, 6, 3.5, 0, 0, TAU); ctx.moveTo(gx + 1.8, y); ctx.arc(gx, y, 1.8, 0, TAU); } else if (k === 'life') { for (let q = 0; q < 5; q++) { const a = q / 5 * TAU; ctx.moveTo(gx, y); ctx.lineTo(gx + Math.cos(a) * 5, y + Math.sin(a) * 5); } } else { ctx.moveTo(gx - 3, y + 5); ctx.lineTo(gx - 3, y - 4); ctx.moveTo(gx + 3, y + 5); ctx.lineTo(gx + 3, y - 4); ctx.moveTo(gx - 3, y + 1); ctx.lineTo(gx + 3, y + 1); }
        ctx.stroke(); }
      // epigenetic mark (learned, not in the DNA): a warm glowing tag at the EXPRESSED value; the genetic bead stays where the gene is
      const em = c.epi && c.epi.marks ? c.epi.marks[i] : null; if (em != null) { const ex = x2 + (x1 - x2) * em, pr = 7 + Math.sin(t * 3 + i) * 2, eg = ctx.createRadialGradient(ex, y, 0, ex, y, pr * 2.2); eg.addColorStop(0, 'rgba(255,214,120,.85)'); eg.addColorStop(1, 'rgba(255,214,120,0)'); ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, y, pr * 2.2, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,230,170,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(ex, y, pr, 0, TAU); ctx.stroke(); }
      // value bead slides along the rung
      const bx = x2 + (x1 - x2) * v; ctx.fillStyle = css(val); ctx.beginPath(); ctx.arc(bx, y, 5, 0, TAU); ctx.fill();
      ctx.fillStyle = css(band, .9); ctx.beginPath(); ctx.arc(x1, y, 4, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.arc(x2, y, 4, 0, TAU); ctx.fill();
      if (i >= 107 && i < 123) { ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1; for (let s = -2; s <= 2; s++) { ctx.beginPath(); ctx.moveTo(geo.cx - geo.amp - 30, y + s * 3); ctx.lineTo(geo.cx + geo.amp + 30, y + s * 3); ctx.stroke(); } } }
    ctx.globalAlpha = 1; };
  return V; };
})(typeof window !== 'undefined' ? window : globalThis);
