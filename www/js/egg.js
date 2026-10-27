// v0.7 A: EGG STROKE GRAMMAR. A plain spiral (drawn by touch) lays an egg instead of hatching at once. For ~1.5 s (each stroke that STARTS on the egg
// extends it) strokes on the egg choose what hatches - no text, no menus:
//   tier 1 (type): taps = drummer (1 kick, 2 snare, 3 hat, 4 tom, 5+ kit; the tap timing becomes its rhythm), wave through = pad (bigger = more movement),
//                  circle round = ringer (bell), flick out = pluck
//   tier 2: the same glyph twice = the stronger version (wave x2 drone, circle x2 long glassy ring, x3 shimmer, flick x2 struck)
//   tier 3: hidden combinations (first word, then another) - see COMBOS; dim orbiters that light only when one stroke away
//   vibe: stroke speed -> a synced tempo ratio + intensity (drive, brightness, short decay); a fast SERIES of strokes = harder; slow = soft, ambient
//   anything else on the egg = a small random nudge (wobble + click). No stroke = the quick v0.6.2 ohm (with its light birthplace lean).
// On-screen only by design (J): the egg exists only while the player is drawing at it; its tick is O(1).
(function (G) { const RS = G.RS, TAU = RS.TAU, Eg = RS.Egg = {};
Eg.WIN = 1.5; Eg.R = 16; Eg.HIT = 46;   // window (s), egg radius (world px), hit radius (screen px)
Eg.T1 = ['taps', 'wave', 'circle', 'flick'];
Eg.TAPV = ['drum:kick', 'drum:snare', 'drum:hat', 'drum:tom', 'drum:kit'];
Eg.T2 = { wave: ['pad', 'drone'], circle: ['bell', 'glass', 'glass'], flick: ['pluck', 'struck'] };
Eg.COMBOS = [{ a: 'wave', b: 'circle', v: 'choir' }, { a: 'taps', b: 'wave', v: 'grain' }, { a: 'circle', b: 'flick', v: 'harp' }, { a: 'flick', b: 'wave', v: 'bowed' }, { a: 'taps', b: 'circle', v: 'mallet' }, { a: 'wave', b: 'taps', v: 'bass' }];
Eg.TEMPI = [.5, .75, 1, 1.5, 2];   // world-synced ratios only, so an egg's ohm always plays in time
Eg.make = (Sf, g, x, y, o = {}) => { const t = Sf.now(); const e = Sf.wordEgg = { g, x, y, growth: o.growth || .5, read: o.read || null, t0: t, until: t + Eg.WIN, words: [], taps: [], speeds: [], gaps: [], lastEnd: t, flare: 0, nudge: 0, wob: 0, seed: o.seed || ((Math.random() * 1e9) | 0) };
  Sf.stats.eggs = (Sf.stats.eggs || 0) + 1; Sf.fx({ k: 'bloom', x, y, col: [255, 244, 220], dur: .35 }); Sf.blip(x, y, 520, .04, .4, { force: true }); return e; };
Eg.on = (Sf, x, y, z = 1) => { const e = Sf.wordEgg; return !!e && Math.hypot(x - e.x, y - e.y) < Eg.HIT / z + Eg.R * .5; };
Eg.extend = Sf => { const e = Sf.wordEgg; if (!e) return; const t = Sf.now(); e.until = Math.max(e.until, t + Eg.WIN); };
// the sequence collapsed into runs: [['wave',2],['taps',3]]
Eg.runs = e => { const r = []; for (const w of e.words) { const L = r[r.length - 1]; if (L && L[0] === w) L[1]++; else r.push([w, 1]); } return r; };
Eg.word = (Sf, w, sp) => { const e = Sf.wordEgg, t = Sf.now(); if (!e) return; if (w !== 'taps' || e.words[e.words.length - 1] !== 'taps') { e.gaps.push(t - e.lastEnd); } e.words.push(w); if (sp != null) e.speeds.push(sp); e.lastEnd = t; e.until = t + Eg.WIN;
  const I = Eg.intensity(e); e.flare = Math.min(1.6, e.flare + .45 + I * .6); const f = { taps: 180, wave: 330, circle: 660, flick: 990 }[w] * (1 + I * .5);
  Sf.blip(e.x, e.y, f, .035 + I * .05, .25 + (1 - I) * .4, { force: true }); if (RS.haptic) RS.haptic(Math.round(8 + I * 30)); Sf.stats.eggWords = (Sf.stats.eggWords || 0) + 1; };
Eg.tap = (Sf, x, y) => { const e = Sf.wordEgg; if (!e) return false; const t = Sf.now(), L = e.taps[e.taps.length - 1]; if (L != null && e.tapLock == null && t - L >= Eg.LOCK) e.tapLock = e.taps.length; e.taps.push(t); Eg.word(Sf, 'taps', null); Eg.preview(Sf, e); return true; };
// v0.7 F1: a preview of the drum each tap would hatch (pitch + length per type); after a 0.4 s pause the type locks (more taps only add rhythm)
Eg.LOCK = .4; Eg.PREV = { 'drum:kick': [62, .28], 'drum:snare': [215, .11], 'drum:hat': [2300, .04], 'drum:tom': [128, .2], 'drum:kit': [80, .16] };
Eg.tapType = e => Eg.TAPV[Math.min(4, (e.tapLock || e.taps.length) - 1)];
Eg.preview = (Sf, e) => { const v = Eg.tapType(e), q = Eg.PREV[v]; if (!q) return; Sf.blip(e.x, e.y, q[0], .06, q[1], { force: true, player: true, att: .002, when: Sf.now() + .03 }); if (v === 'drum:kit') Sf.blip(e.x, e.y, 2300, .03, .04, { force: true, player: true, att: .002, when: Sf.now() + .03 }); e.prevT = Sf.now(); e.prevV = v; };
// v0.7 F2: a touch that lands right next to the egg (not on it) slides the egg aside, so a new spiral beside it doesn't hit it
Eg.aside = (Sf, x, y, z = 1) => { const e = Sf.wordEgg; if (!e || e.slide) return false; const d = Math.hypot(x - e.x, y - e.y), r0 = Eg.HIT / z + Eg.R * .5; if (d < r0 || d > r0 * 2.2) return false; const ux = (e.x - x) / (d || 1), uy = (e.y - y) / (d || 1), D = r0 * 1.6; e.slide = { x: e.x + ux * D, y: e.y + uy * D }; Eg.extend(Sf); Sf.stats.eggAside = (Sf.stats.eggAside || 0) + 1; return true; };
// what a stroke that started on the egg says (null = unrecognised -> nudge)
Eg.read = (e, pts, times) => { const n = pts.length; if (n < 3) return null; let len = 0; for (let i = 1; i < n; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); const dur = Math.max(.03, (times[n - 1] - times[0]) / 1000), sp = len / dur;
  let wind = 0, rs = 0; for (let i = 1; i < n; i++) { const a0 = Math.atan2(pts[i - 1][1] - e.y, pts[i - 1][0] - e.x), a1 = Math.atan2(pts[i][1] - e.y, pts[i][0] - e.x); let d = a1 - a0; d = RS.wrapA(d); wind += d; rs += Math.hypot(pts[i][0] - e.x, pts[i][1] - e.y); }
  const rMean = rs / (n - 1), loops = Math.abs(wind) / TAU, ch = Math.hypot(pts[n - 1][0] - pts[0][0], pts[n - 1][1] - pts[0][1]), out = Math.hypot(pts[n - 1][0] - e.x, pts[n - 1][1] - e.y);
  if (loops >= .8 && rMean > Eg.R * .8 && rMean < 140) return { w: 'circle', k: Math.max(1, Math.round(loops)), sp, size: rMean * 2 };
  if (dur < .35 && ch > len * .8 && out > 45 && len < 260) return { w: 'flick', k: 1, sp, size: len };
  const c = RS.classify(pts); if (c && (c.id === 'wave' || c.id === 'zigzag')) return { w: 'wave', k: 1, sp, size: c.size || len / 3 };
  return null; };
Eg.stroke = (Sf, pts, times) => { const e = Sf.wordEgg; if (!e) return null; const r = Eg.read(e, pts, times);
  if (!r) { Eg.nudgeIt(Sf); return { k: 'eggNudge' }; } e.sizes = e.sizes || {}; e.sizes[r.w] = Math.max(e.sizes[r.w] || 0, r.size || 0); for (let k = 0; k < Math.min(3, r.k); k++) Eg.word(Sf, r.w, r.sp); return { k: 'eggWord', w: r.w, n: r.k }; };
Eg.nudgeIt = Sf => { const e = Sf.wordEgg; if (!e) return; const r = RS.rng(RS.hash('nudge', e.seed, ++e.nudge)), I = RS.IG; for (const k of ['cut', 'fmI', 'inharm', 'detune', 'formant', 'noise']) if (I[k] != null) e.g[I[k]] = RS.clamp(e.g[I[k]] + (r() - .5) * .16, 0, .9999);
  e.wob = 1; Eg.extend(Sf); Sf.blip(e.x, e.y, 260 + r() * 300, .03, .12, { force: true }); if (RS.haptic) RS.haptic(6); Sf.stats.eggNudge = (Sf.stats.eggNudge || 0) + 1; };
// 0 calm .. 1 frenzy: stroke speed + a fast series (short gaps between strokes)
Eg.intensity = e => { const v = e.speeds.length ? RS.clamp((e.speeds.reduce((a, b) => a + b, 0) / e.speeds.length - 250) / 1150, 0, 1) : .35, gs = e.gaps.slice(1); let s = 0; if (gs.length) { const m = gs.reduce((a, b) => a + b, 0) / gs.length; s = RS.clamp((.7 - m) / .5, 0, 1); } if (e.taps.length > 1) { const iv = e.taps.slice(1).map((t, i) => t - e.taps[i]), m = iv.reduce((a, b) => a + b, 0) / iv.length; s = Math.max(s, RS.clamp((.45 - m) / .3, 0, 1)); } return RS.clamp(v * .65 + s * .35 + (e.speeds.length ? 0 : s * .3), 0, 1); };
// the choice the egg will hatch as (also drives the orbit hints)
Eg.choice = e => { const R = Eg.runs(e); if (!R.length) return null; const kinds = R.map(q => q[0]);
  if (kinds.length >= 2) { const cb = Eg.COMBOS.find(q => q.a === kinds[0] && q.b === kinds[1]); if (cb) return { tier: 3, voice: cb.v, combo: cb }; }
  const [w, n] = R[0]; if (w === 'taps') return { tier: 1, voice: Eg.tapType(e), taps: true }; const L = Eg.T2[w]; return { tier: n >= 2 ? 2 : 1, voice: L[Math.min(L.length - 1, n - 1)], w, n }; };
Eg.tick = Sf => { const e = Sf.wordEgg; if (!e) return; e.flare *= .9; e.wob *= .88; if (e.slide) { e.x += (e.slide.x - e.x) * .18; e.y += (e.slide.y - e.y) * .18; if (Math.hypot(e.slide.x - e.x, e.slide.y - e.y) < .5) e.slide = null; } if (Sf.now() >= e.until) Eg.hatch(Sf, 'window'); };
Eg.hatch = (Sf, why = 'window') => { const e = Sf.wordEgg; if (!e) return null; Sf.wordEgg = null; const ch = Eg.choice(e), g = e.g, I = RS.IG, r = RS.rng(RS.hash('egg', e.seed));
  let opt = { distinct: !ch, growth: e.growth }, Iv = .35;
  if (ch) { RS.Genome.setVoice(g, ch.voice, r); if (/^drum:/.test(ch.voice)) g.dkWant = ch.voice.slice(5);   /* v0.8: an asked-for drum leans its hit set */ Iv = Eg.intensity(e); const set = (k, v) => { if (I[k] != null) g[I[k]] = RS.clamp(v, 0, .9999); };
    if (Iv > .55) { const q = (Iv - .55) / .45; set('sat', g[I.sat] + q * .5); set('cut', g[I.cut] + q * .3); set('dec', g[I.dec] * (1 - .55 * q)); set('transient', (g[I.transient] || .5) + q * .3); }
    else if (Iv < .3) { const q = (.3 - Iv) / .3; set('sat', g[I.sat] * (1 - .7 * q)); set('cut', g[I.cut] - q * .2); set('att', g[I.att] + q * .25); set('rel', g[I.rel] + q * .3); }
    if (ch.w === 'wave' || (ch.combo && (ch.combo.a === 'wave' || ch.combo.b === 'wave'))) { const m = RS.clamp(((e.sizes || {}).wave || 60) / 260, 0, 1); set('lfoA', .15 + m * .7); set('lfoR', .2 + m * .5); }
    if (ch.voice === 'glass' && ch.n >= 2) { set('dec', .85 + r() * .14); set('rel', .8 + r() * .19); if (ch.n >= 3) { set('detune', .6 + r() * .3); set('lfoR', .75); set('lfoA', .25); set('cut', .85); } }
    opt.tempo = Eg.TEMPI[Math.round(Iv * 4)]; }
  opt.birth = 'egg'; const c = Sf.addCreature(g, e.x, e.y, opt); if (!c) return null; Sf.stats.spawned = (Sf.stats.spawned || 0) + 1;
  if (ch) { c.eggVoice = ch.voice; c.glyphs = Eg.runs(e).map(q => q[0] + (q[1] > 1 && q[0] !== 'taps' ? q[1] : '')).slice(0, 4); c.eggBpm = opt.tempo; c.eggTier = ch.tier;
    if (ch.taps && e.taps.length > 1 && !c.mind && RS.Mind) c.mind = RS.Mind.make(Sf, c); if (ch.taps && e.taps.length > 1 && c.mind) { const sx = c.mind.bpm / 60 * 4, L = RS.Mind.barLen(c.mind), T0 = e.taps[0]; c.tapCell = [...new Set(e.taps.map(t => Math.round((t - T0) * sx) % L))].sort((a, b) => a - b); } }
  if (Sf.record) Sf.record([], [c]);
  Sf.fx({ k: 'bloom', x: c.x, y: c.y, col: c.col || [235, 225, 255], dur: .45 + Iv * .5 }); if (ch) { Sf.blip(c.x, c.y, 440 * (1 + Iv), .05 + Iv * .07, .6, { force: true }); if (RS.haptic) RS.haptic(Math.round(15 + Iv * 45)); }
  Sf.lastHatch = { why: ch ? 'egg' : 'quick', id: c.id, voice: ch ? ch.voice : null, tier: ch ? ch.tier : 0, glyphs: c.glyphs || null, intensity: +Iv.toFixed(2), tempo: opt.tempo || null, steps: 0, age: 0, egg: why };
  Sf.stats.eggHatch = (Sf.stats.eggHatch || 0) + 1; if (ch && Sf.mods && RS.Guide) { const G = RS.Guide.state(Sf); G.eggWords = (G.eggWords || 0) + 1; } if (ch && RS.Guide) RS.Guide.notify(Sf, 'egg:' + (ch.taps ? 'taps' : ch.w || '')); return c; };
// ---- orbit hints (no text): what is available right now in every tier
Eg.hints = e => { const R = Eg.runs(e), kinds = R.map(q => q[0]), out = [];
  for (const w of Eg.T1) out.push({ g: w, tier: 1, lit: 1 });
  for (const w of ['wave', 'circle', 'flick']) out.push({ g: w + '2', tier: 2, lit: kinds.length === 1 && kinds[0] === w ? 1 : .55 });
  for (const cb of Eg.COMBOS) out.push({ g: null, tier: 3, lit: kinds.length === 1 && kinds[0] === cb.a ? 1 : .12 });   /* unlabelled: lights only one stroke away */
  out.push({ g: 'hold', tier: 0, lit: R.length ? .35 : .8 }); return out; };
Eg.glyph = (ctx, k, x, y, s, a) => { ctx.save(); ctx.translate(x, y); ctx.strokeStyle = ctx.fillStyle = 'rgba(255,248,230,' + a.toFixed(3) + ')'; ctx.lineWidth = Math.max(1, s * .16); ctx.lineCap = 'round';
  const two = /2$/.test(k || ''), base = (k || '').replace(/\d$/, ''), one = dy => { ctx.save(); ctx.translate(0, dy);
    if (base === 'taps') { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * s * .45, 0, s * .14, 0, TAU); ctx.fill(); } }
    else if (base === 'wave') { ctx.beginPath(); for (let i = 0; i <= 12; i++) { const u = i / 12; ctx[i ? 'lineTo' : 'moveTo']((u - .5) * s * 1.6, Math.sin(u * TAU) * s * .32); } ctx.stroke(); }
    else if (base === 'circle') { ctx.beginPath(); ctx.arc(0, 0, s * .55, .3, TAU - .2); ctx.stroke(); }
    else if (base === 'flick') { ctx.beginPath(); ctx.moveTo(-s * .5, s * .3); ctx.lineTo(s * .5, -s * .3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(s * .5, -s * .3); ctx.lineTo(s * .18, -s * .3); ctx.stroke(); }
    else if (base === 'hold') { const u = (performance.now() / 900) % 1; ctx.globalAlpha = .4; ctx.beginPath(); ctx.arc(0, 0, s * .55, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(0, 0, s * .55, -Math.PI / 2, -Math.PI / 2 + u * TAU); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(0, 0, s * .22, 0, TAU); ctx.fill(); } ctx.restore(); };
  if (two) { one(-s * .32); one(s * .32); } else one(0); ctx.restore(); };
Eg.draw = (ctx, Sf, z = 1) => { const e = Sf.wordEgg; if (!e) return; const t = Sf.now(), left = RS.clamp((e.until - t) / Eg.WIN, 0, 1), wob = Math.sin(t * 40) * e.wob * 4, R = Eg.R * (1 + e.flare * .25);
  ctx.save(); ctx.fillStyle = 'rgba(255,246,228,.92)'; ctx.beginPath(); ctx.ellipse(e.x + wob, e.y, R * .82, R, 0, 0, TAU); ctx.fill(); if (e.flare > .05) { ctx.fillStyle = 'rgba(255,220,160,' + (.3 * Math.min(1, e.flare)).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(e.x, e.y, R * (1.6 + e.flare), 0, TAU); ctx.fill(); }
  ctx.strokeStyle = 'rgba(255,255,255,.25)'; ctx.lineWidth = 1.5 / z; ctx.beginPath(); ctx.arc(e.x, e.y, R + 8, -Math.PI / 2, -Math.PI / 2 + left * TAU); ctx.stroke();   // the window, closing
  const used = (Sf.mods && Sf.mods.guide && Sf.mods.guide.eggWords) || 0, fa = Math.max(.2, 1 - Math.max(0, used - 5) / 6);   /* v0.7 L: orbit hints fade once the player has hatched ~5 worded eggs (mods.guide.eggWords, saved) */
  const zf = RS.clamp((z - .35) / .4, 0, 1), sh = .55 + .45 * left; if (zf <= 0) { ctx.restore(); return; }   /* v0.7 F7: hints shrink as the window runs out, fade when zoomed out */
  const H = Eg.hints(e), n = H.length, OR = 58 / Math.max(.6, Math.min(1, z)), s = 9 * sh; H.forEach((h, i) => { const a = t * .5 + i / n * TAU, x = e.x + Math.cos(a) * OR * (h.tier === 3 ? 1.25 : h.tier === 2 ? 1.1 : 1), y = e.y + Math.sin(a) * OR * (h.tier === 3 ? 1.25 : h.tier === 2 ? 1.1 : 1); Eg.glyph(ctx, h.g, x, y, h.tier === 1 ? s * 1.2 : s, h.lit * (h.tier === 3 ? .7 : .85) * fa * zf); });
  ctx.restore(); };
// ---- glyph marks (#4): the glyph(s) an ohm was made with, faint in its body; wild ohms and fossils show the one their voice implies
Eg.markOf = c => { if (c.glyphs && c.glyphs.length) return c.glyphs; const v = c.eggVoice || (c.g && RS.Genome.voiceOf(c.g)) || '', I = c.P && c.P.inst; if (/^drum/.test(v) || (I && (I.drum || (I.percK || 0) > .5))) return ['taps']; if (/pad|drone|grain/.test(v) || (I && RS.Inst.isTex && RS.Inst.isTex(I))) return ['wave']; if (/bell|glass|choir|mallet/.test(v)) return ['circle']; if (/pluck|struck|harp/.test(v)) return ['flick'];
  return [Eg.T1[1 + ((c.g ? Math.floor(c.g[3] * 997) : 0) % 3)]]; };
Eg.markOfGenome = g => { const P = RS.Genome.express(g); return Eg.markOf({ g, P }); };
Eg.drawMark = (ctx, list, x, y, s, a) => { const n = list.length; list.forEach((k, i) => Eg.glyph(ctx, k, x + (i - (n - 1) / 2) * s * 1.5, y, s, a)); };
})(window);
