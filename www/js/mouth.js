(function (G) { const RS = G.RS;
// v08-voice: THE BIG MOUTH. In play mode, a double tap on the throat tube opens a large, soft side view of the ohm's mouth (screen space, no text).
// It drives the ohm's own tract live (tract.js live mode: direct, smoothed targets):
//   tongue / cavity drag = vowels (x = back..front, y = high..low; lip rounding follows the nearest vowels), roof tap = a stop at that place
//   (back = k, middle = t), roof rub = a fricative (front = s, further back = sh), lips tap = p, lips held closed while voiced = m (velum open),
//   pitch arc (second finger) = pitch snapped to the ohm's scale in the world key (Mind.hz, like the play nodes). Voicing runs while the arc finger is
//   down; with no arc finger yet, while the tongue finger is down at the ohm's current note. Lifting stops it.
//   Teach by singing: the same 4..8-note phrase sung twice -> Play.teach (the play-mode path) with its syllables (c.sung), undoable.
// Nothing here runs while it is closed (Mo.cur == null): no tick, no draw, no messages, no tract voice.
const clamp = RS.clamp, TAU = Math.PI * 2;
const Mo = RS.Mouth = { cur: null, stats: { opened: 0, sent: 0, ticks: 0, cons: {}, taught: 0 } };
Mo.send = m => { Mo.stats.sent++; if (RS.audio && RS.audio.send) RS.audio.send(m); };
Mo.haptic = ms => { if (RS.haptic) RS.haptic(ms); };
const VWL = ['AA', 'AE', 'AH', 'AO', 'EH', 'ER', 'IH', 'IY', 'UH', 'UW'];
Mo.TU = [.30, .66]; Mo.TD = [2.0, 3.1];
// layout (screen px): panel box + pitch arc on its left
Mo.geo = (M, Wd, Ht) => { const w = Math.min(Wd * .74, Ht * 1.1, 560), h = w * .62, arc = w * .2 + 20, ax = M.ax == null ? Wd / 2 : M.ax, ay = M.ay == null ? Ht / 2 : M.ay;
  const cx = clamp(ax, w / 2 + arc, Math.max(w / 2 + arc, Wd - w / 2 - 8)), cy = clamp(ay - h * .2, h / 2 + 30, Math.max(h / 2 + 30, Ht - h / 2 - 30));
  return M.g = { w, h, x0: cx - w / 2, y0: cy - h / 2, cx, cy, acx: cx - w / 2 + w * .22, acy: cy, ar: w * .36, band: Math.max(30, w * .085) }; };
Mo.local = (M, x, y) => { const g = M.g; return [(x - g.x0) / g.w, (y - g.y0) / g.h]; };
Mo.arcU = (M, x, y) => { const g = M.g, dx = x - g.acx, dy = y - g.acy; let a = Math.atan2(dy, dx); if (a < 0) a += TAU; const d = Math.hypot(dx, dy), A0 = Math.PI * 100 / 180, A1 = Math.PI * 260 / 180;
  if (Math.abs(d - g.ar) > g.band || a < A0 || a > A1) return null; return clamp((a - Math.PI * 120 / 180) / (Math.PI * 120 / 180), 0, 1); };   // 0 = bottom (low) .. 1 = top (high)
Mo.region = (M, x, y) => { const [X, Y] = Mo.local(M, x, y); if (Mo.arcU(M, x, y) != null && X < .02) return 'arc';
  if (X >= .86 && X <= 1.08 && Y >= 0 && Y <= 1) return 'lips'; if (X >= .04 && X < .86 && Y >= -.08 && Y < .26) return 'roof'; if (X >= -.03 && X < .86 && Y >= .26 && Y <= 1.06) return 'tongue';
  if (Mo.arcU(M, x, y) != null) return 'arc'; return 'out'; };
// screen point for a tongue target / a roof place / an arc position (tests + drawing)
Mo.tonguePt = (M, tu, td) => { const g = M.g, X = .05 + (tu - Mo.TU[0]) / (Mo.TU[1] - Mo.TU[0]) * .77, Y = .3 + (td - Mo.TD[0]) / (Mo.TD[1] - Mo.TD[0]) * .65; return [g.x0 + X * g.w, g.y0 + Y * g.h]; };
Mo.roofPt = (M, px) => { const g = M.g, X = .08 + (px - .5) / .42 * .78; return [g.x0 + X * g.w, g.y0 + .12 * g.h]; };
Mo.lipsPt = M => [M.g.x0 + .93 * M.g.w, M.g.y0 + .5 * M.g.h];
Mo.arcPt = (M, u) => { const g = M.g, a = Math.PI * (120 + 120 * u) / 180; return [g.acx + Math.cos(a) * g.ar, g.acy + Math.sin(a) * g.ar]; };
Mo.outPt = M => [M.g.x0 + M.g.w * 1.3 > M.W - 4 ? M.g.x0 + M.g.w * .5 : M.g.x0 + M.g.w * 1.2, M.g.y0 + M.g.h * 1.3 > M.H - 4 ? 6 : M.g.y0 + M.g.h * 1.3];
Mo.tongueAt = (M, x, y) => { const [X, Y] = Mo.local(M, x, y); return [Mo.TU[0] + clamp((X - .05) / .77, 0, 1) * (Mo.TU[1] - Mo.TU[0]), Mo.TD[0] + clamp((Y - .3) / .65, 0, 1) * (Mo.TD[1] - Mo.TD[0])]; };
// lip rounding + the nearest vowel (inverse-distance over the vowel table)
Mo.vowel = (tu, td) => { const VW = RS.Vocal.VW; let sw = 0, sl = 0, best = 'AH', bd = 1e9; for (const k of VWL) { const v = VW[k]; if (!v) continue; const d = ((tu - v[0]) / .36) ** 2 + ((td - v[1]) / 1.1) ** 2, w = 1 / (d + .002) ** 2; sw += w; sl += w * v[2]; if (d < bd) { bd = d; best = k; } } return { lip: sl / sw, nu: best }; };
Mo.degRange = M => { const n = M.n; return [-Math.round(n * .43), n + Math.round(n * .57)]; };
Mo.degAt = (M, u) => { const [lo, hi] = Mo.degRange(M); return Math.round(lo + u * (hi - lo)); };
Mo.hz = (Sf, M, deg) => RS.Mind.hz(Sf, RS.Play.mind(Sf, M.c), deg);
Mo.open = (Sf, s, Wd, Ht, ax, ay) => { if (!s || !s.c || !s.tube) return null; if (Mo.cur) Mo.close(Sf, Mo.cur); const c = s.c, T = c.P.tract || { amt: .3, len: 1, tense: .6, nasal: 0 }, vx = c.voice || {}, m = RS.Play.mind(Sf, c);
  const M = { Sf, s, c, key: c.born % 1e6 | 0, W: Wd, H: Ht, ax, ay, n: m.sys.cents.length, ptr: new Map(), tongue: [.42, 2.6], deg: c.lastDeg != null ? c.lastDeg : 0, pitchId: null, tongueId: null, pitchUsed: false, cons: null,
    amt: T.amt, gain: (c.P.loud || 1) * .17 * (.3 + .7 * clamp(T.amt, 0, 1)), tense: clamp((T.tense == null ? .6 : T.tense) + (vx.tense || 0), .05, 1), vel0: .01 + clamp((T.nasal || 0) + (vx.vel || 0), 0, 1) * .08,
    ph: [], sy: [], note: null, pendOn: [], multi: null, last: {}, lastSend: -1, dirty: false, flash: 0, t: 0 };
  Mo.geo(M, Wd, Ht); Mo.cur = M; Mo.stats.opened++; if (RS.Vocal) RS.Vocal.reserve = 1;   // the played ohm keeps a pooled voice: other ohms fall back to the formant voice sooner
  const st = Mo.state(M); Mo.send(Object.assign({ t: 'tract', live: 'on', key: M.key, gain: M.gain, pan: 0, send: .3, len: T.len || 1, tense: M.tense }, st)); M.last = st; return M; };
Mo.close = (Sf, M) => { M = M || Mo.cur; if (!M) return null; Mo.send({ t: 'tract', live: 'off', key: M.key }); if (Mo.cur === M) Mo.cur = null; if (RS.Vocal) RS.Vocal.reserve = 0; M.closed = true; return null; };
// what the tract should do now
Mo.voiced = M => M.pitchId != null || (M.tongueId != null && !M.pitchUsed);
Mo.state = M => { const [tu, td] = M.tongue, V = Mo.vowel(tu, td), vo = Mo.voiced(M) && !M.multi; const st = { f0: +Mo.hz(M.Sf, M, M.deg).toFixed(2), tu, td, lip: V.lip, vo: vo ? 1 : 0, vel: M.vel0, cx: M.cx || .8, cd: 3, man: 0 }; const k = M.cons;
  if (k && !M.multi) { if (k.kind === 'stop') { st.cx = k.cx; st.cd = 0; st.man = 1; st.vo = 0; } else if (k.kind === 'fric' && k.active) { st.cx = k.cx; st.cd = k.cd; st.man = 2; st.vo = 0; if (k.lip != null) st.lip = Math.min(st.lip, k.lip); }
    else if (k.kind === 'rel') { st.cx = k.cx; st.cd = 3; st.man = 1; }   // a stop opening: the constriction opens with its burst of turbulence
    else if (k.kind === 'lips') { st.lip = 0; st.cx = .97; if (vo) { st.vel = .45; st.man = 3; } } }
  return st; };
Mo.push = (M, t, force, extra) => { const st = Mo.state(M), d = {}; let any = false; for (const k in st) if (st[k] !== M.last[k]) { d[k] = st[k]; any = true; } if (extra) { Object.assign(d, extra); any = true; }
  if (!any) return; if (!force && t - M.lastSend < .016) { M.dirty = true; return; } M.last = st; M.lastSend = t; M.dirty = false; Mo.send(Object.assign({ t: 'tract', live: 'set', key: M.key }, d)); };
// sung notes for teaching: one per voiced onset / pitch change; the vowel is the one held at the end of the note
Mo.noteOn = M => { const N = M.note; if (N && M.t - N.t0 < .15 && M.ph.length && M.sy[M.sy.length - 1] === N) {   // a pitch change right after the onset (or a quick slide) retargets that note rather than adding one
    N.deg = M.deg; M.ph[M.ph.length - 1] = M.deg; N.t0 = M.t; Mo.learn(M); return; }
  const n = { deg: M.deg, on: M.pendOn.slice(-2), nu: Mo.vowel(M.tongue[0], M.tongue[1]).nu, co: [], t0: M.t }; M.pendOn = []; M.note = n; M.ph.push(n.deg); M.sy.push(n); if (M.ph.length > 16) { M.ph.shift(); M.sy.shift(); } Mo.learn(M); };
Mo.learn = M => { const d = M.ph[M.ph.length - 1]; M.c.lastDeg = d; M.s.lastF = Mo.hz(M.Sf, M, d); if (new Set(M.ph.slice(-8)).size < 2) return;   /* singing on one note (exploring vowels / consonants at the current note) never teaches: a taught phrase needs at least two pitches */ if (RS.Play.teach(M.Sf, M.s, { phrase: M.ph, syl: M.sy })) { M.taught = (M.taught || 0) + 1; Mo.stats.taught++; } };
Mo.cons = (M, p) => { Mo.stats.cons[p] = (Mo.stats.cons[p] || 0) + 1; M.pendOn.push(p); if (M.pendOn.length > 2) M.pendOn.shift(); M.lastCons = p; };
Mo.track = (M, wasV) => { const v = Mo.voiced(M) && !M.multi; if (v && !wasV) Mo.noteOn(M); else if (!v) M.note = null; };
Mo.down = (Sf, M, id, x, y, t) => { M.t = t; const r = Mo.region(M, x, y), p = { id, r, x0: x, y0: y, x, y, t0: t, moved: 0 }; M.ptr.set(id, p); const wasV = Mo.voiced(M) && !M.multi;
  if (!M.multi && M.ptr.size >= 3) { M.multi = { n: M.ptr.size, t0: Math.min(...[...M.ptr.values()].map(q => q.t0)), moved: 0 }; M.cons = null; M.note = null; Mo.push(M, t, true); return 'multi'; }   // three fingers: cancel the sounds, it's undo / redo
  if (M.multi) { M.multi.n = Math.max(M.multi.n, M.ptr.size); return 'multi'; }
  if (r === 'arc') { if (M.pitchId != null) { p.r = 'idle'; return 'idle'; } M.pitchId = id; M.pitchUsed = true; const d = Mo.degAt(M, Mo.arcU(M, x, y)), ch = d !== M.deg; M.deg = d; if (ch && wasV) Mo.noteOn(M); }
  else if (r === 'tongue') { if (M.tongueId != null) { p.r = 'idle'; return 'idle'; } M.tongueId = id; M.pitchUsed = M.pitchId != null; M.tongue = Mo.tongueAt(M, x, y); }
  else if (r === 'roof') { const [X] = Mo.local(M, x, y), px = .5 + clamp((X - .08) / .78, 0, 1) * .42; p.px = px; M.cons = p.k = { kind: 'stop', cx: px < .67 ? .55 : .8, ph: px < .67 ? 'K' : 'T', px, id }; Mo.haptic(12); }
  else if (r === 'lips') { M.cons = p.k = { kind: 'lips', id, vT: Mo.voiced(M) ? t : null }; Mo.haptic(10); }
  Mo.track(M, wasV); Mo.push(M, t, true); return r; };
Mo.move = (Sf, M, id, x, y, t) => { M.t = t; const p = M.ptr.get(id); if (!p) return; const dm = Math.hypot(x - p.x, y - p.y); p.moved = Math.max(p.moved, Math.hypot(x - p.x0, y - p.y0)); p.x = x; p.y = y; if (M.multi) { M.multi.moved = Math.max(M.multi.moved, p.moved); return; }
  const wasV = Mo.voiced(M); if (p.r === 'arc' && M.pitchId === id) { const u = Mo.arcU(M, x, y); if (u != null) { const d = Mo.degAt(M, u); if (d !== M.deg) { M.deg = d; if (Mo.voiced(M)) Mo.noteOn(M); } } }
  else if (p.r === 'tongue' && M.tongueId === id) { M.tongue = Mo.tongueAt(M, x, y); if (M.note) M.note.nu = Mo.vowel(M.tongue[0], M.tongue[1]).nu; }
  else if (p.r === 'roof' && p.k) { const [X] = Mo.local(M, x, y), px = .5 + clamp((X - .08) / .78, 0, 1) * .42; if (p.moved > 8 || p.k.kind === 'fric') { const sh = px < .77, ph = sh ? 'SH' : 'S';
      if (p.k.kind !== 'fric' || p.k.ph !== ph) { if (p.k.kind !== 'fric') Mo.haptic(8); p.k = { kind: 'fric', ph, cx: sh ? .74 : .8, cd: sh ? .32 : .28, lip: sh ? .6 : null, active: true, id }; Mo.cons(M, ph); } if (dm > .5) { p.k.active = true; p.k.mt = t; } if (M.cons && M.cons.id === id || !M.cons || M.cons.kind !== 'lips') M.cons = p.k; } }
  else if (p.r === 'lips' && p.k && p.k.vT == null && Mo.voiced(M)) p.k.vT = t;
  Mo.track(M, wasV); Mo.push(M, t, false); };
// returns 'close' | 'undo' | 'redo' | the region
Mo.up = (Sf, M, id, x, y, t) => { M.t = t; const p = M.ptr.get(id); if (!p) return null; M.ptr.delete(id); if (x != null) { p.moved = Math.max(p.moved, Math.hypot(x - p.x0, y - p.y0)); }
  if (M.multi) { M.multi.moved = Math.max(M.multi.moved, p.moved); if (p.r === 'arc' && M.pitchId === id) M.pitchId = null; if (M.tongueId === id) M.tongueId = null; if (M.ptr.size) return 'multi'; const mu = M.multi; M.multi = null; M.cons = null; Mo.push(M, t, true); if (t - mu.t0 < .4 && mu.moved < 30) return mu.n >= 4 ? 'redo' : 'undo'; return 'multi'; }
  const wasV = Mo.voiced(M); let extra = null;
  if (p.r === 'arc' && M.pitchId === id) M.pitchId = null;
  else if (p.r === 'tongue' && M.tongueId === id) M.tongueId = null;
  else if (p.r === 'roof' && p.k) { if (p.k.kind === 'stop') { Mo.cons(M, p.k.ph); extra = { burst: 1 }; M.flash = 1; } if (M.cons === p.k) M.cons = null; }
  else if (p.r === 'lips' && p.k) { const held = p.k.vT != null && t - p.k.vT >= .12; Mo.cons(M, held ? 'M' : 'P'); if (!held) { extra = { burst: 1 }; M.flash = 1; } if (M.cons === p.k) M.cons = null; }
  else if (p.r === 'out') { Mo.track(M, wasV); if (p.moved < 12 && t - p.t0 < .3 && !M.ptr.size) return 'close'; return 'out'; }
  if (extra && extra.burst) { M.cx = p.k.kind === 'lips' ? .97 : p.k.cx; if (!M.cons) M.cons = { kind: 'rel', cx: M.cx, t0: t, id: null }; }
  Mo.track(M, wasV); Mo.push(M, t, true, extra); return p.r; };
Mo.tick = (Sf, M, t) => { Mo.stats.ticks++; M.t = t; const k = M.cons; if (k && k.kind === 'fric' && k.active && k.mt != null && t - k.mt > .18) k.active = false;   // a rub that stops = the hiss stops
  if (k && k.kind === 'rel' && t - k.t0 > .05) { M.cons = null; Mo.push(M, t, true); }
  M.flash *= .85; if (M.dirty || (k && k.kind === 'fric')) Mo.push(M, t, M.dirty && t - M.lastSend >= .016); };
Mo.release = (Sf, M) => { if (!M) return; M.ptr.clear(); M.pitchId = M.tongueId = null; M.cons = null; M.multi = null; M.note = null; Mo.push(M, M.t, true); };
// ---------------- drawing (screen space, soft glow, no text) ----------------
Mo.draw = (ctx, Sf, M, Wd, Ht, now) => { if (Wd !== M.W || Ht !== M.H) { M.W = Wd; M.H = Ht; Mo.geo(M, Wd, Ht); } const g = M.g, col = M.c.col || [220, 220, 255], css = (a, c2) => `rgba(${(c2 || col)[0] | 0},${(c2 || col)[1] | 0},${(c2 || col)[2] | 0},${a})`, st = M.last, P = (X, Y) => [g.x0 + X * g.w, g.y0 + Y * g.h];
  ctx.save(); const bg = ctx.createRadialGradient(g.cx, g.cy, g.h * .1, g.cx, g.cy, g.w * .7); bg.addColorStop(0, css(.22)); bg.addColorStop(1, css(0)); ctx.fillStyle = bg; ctx.fillRect(g.x0 - g.w * .3, g.y0 - g.h * .4, g.w * 1.6, g.h * 1.8);
  ctx.lineCap = ctx.lineJoin = 'round'; ctx.shadowColor = css(.8); ctx.shadowBlur = 14;
  // palate + back wall + jaw
  ctx.strokeStyle = css(.75); ctx.lineWidth = 3; ctx.beginPath(); let q = P(.06, 1.02); ctx.moveTo(q[0], q[1]); q = P(.06, .24); ctx.lineTo(q[0], q[1]); const a1 = P(.3, -.06), b1 = P(.6, -.02), e1 = P(.86, .2); ctx.bezierCurveTo(a1[0], a1[1], b1[0], b1[1], e1[0], e1[1]); ctx.stroke();
  // lips: open by the live lip value, rounding = pushed out
  const lip = clamp(st.lip == null ? 1 : st.lip, 0, 1.2), gap = .04 + lip * .22, pr = (1 - Math.min(1, lip)) * .06; ctx.fillStyle = css(.35); ctx.strokeStyle = css(.8); ctx.lineWidth = 2.5;
  for (const sgn of [-1, 1]) { const c0 = P(.9 + pr, .5 + sgn * (gap / 2 + .11)); ctx.beginPath(); ctx.ellipse(c0[0], c0[1], g.w * (.05 + pr * .6), g.h * .11, 0, 0, TAU); ctx.fill(); ctx.stroke(); }
  // tongue hump at its live target
  const [hx, hy] = Mo.tonguePt(M, st.tu == null ? .42 : st.tu, st.td == null ? 2.6 : st.td); const tg = ctx.createLinearGradient(0, hy, 0, g.y0 + g.h); tg.addColorStop(0, css(.75, [255, 170, 190])); tg.addColorStop(1, css(.15, [255, 170, 190]));
  ctx.fillStyle = tg; ctx.beginPath(); q = P(.08, 1.02); ctx.moveTo(q[0], q[1]); const l0 = P(.1, .7); ctx.quadraticCurveTo(l0[0], hy - g.h * .02, hx, hy); const r0 = P(.82, .75), e2 = P(.84, 1.02); ctx.quadraticCurveTo(r0[0], hy + g.h * .05, e2[0], e2[1] - g.h * .1); ctx.lineTo(e2[0], e2[1]); ctx.closePath(); ctx.fill();
  // constriction / burst glow at its place
  if (st.man === 1 || st.man === 2 || M.flash > .05) { const k = M.cons, X = .08 + ((k ? k.cx : M.cx || .8) - .5) / .42 * .78, fp = P(X, .14), r = g.h * (.08 + .1 * (st.man === 2 ? .6 + .4 * Math.sin(now * 40) : M.flash)); const fg = ctx.createRadialGradient(fp[0], fp[1], 0, fp[0], fp[1], r * 2); fg.addColorStop(0, css(.9, [255, 255, 255])); fg.addColorStop(1, css(0, [255, 255, 255])); ctx.fillStyle = fg; ctx.beginPath(); ctx.arc(fp[0], fp[1], r * 2, 0, TAU); ctx.fill(); }
  // voicing: the glottis glows and the back wall shimmers
  if (st.vo) { const gp = P(.06, 1.0), r = g.h * (.07 + .02 * Math.sin(now * 30)); ctx.fillStyle = css(.85, [255, 240, 200]); ctx.beginPath(); ctx.arc(gp[0], gp[1], r, 0, TAU); ctx.fill(); }
  if (st.man === 3) { const np = P(.45, -.1); ctx.strokeStyle = css(.6, [200, 230, 255]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(np[0], np[1], g.h * .08, 0, TAU); ctx.stroke(); }
  // pitch arc: one tick per scale step, the tonic bigger; the sung degree glows
  ctx.shadowBlur = 8; ctx.strokeStyle = css(.35); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(g.acx, g.acy, g.ar, Math.PI * 120 / 180, Math.PI * 240 / 180); ctx.stroke(); const [lo, hi] = Mo.degRange(M);
  for (let d = lo; d <= hi; d++) { const u = (d - lo) / (hi - lo), [x, y] = Mo.arcPt(M, u), ton = ((d % M.n) + M.n) % M.n === 0, cur = d === M.deg; ctx.fillStyle = css(cur ? (st.vo ? 1 : .7) : ton ? .6 : .3, cur ? [255, 250, 220] : null); ctx.beginPath(); ctx.arc(x, y, cur ? 9 : ton ? 6 : 3.5, 0, TAU); ctx.fill(); }
  for (const p of M.ptr.values()) { ctx.fillStyle = css(.25, [255, 255, 255]); ctx.beginPath(); ctx.arc(p.x, p.y, 22, 0, TAU); ctx.fill(); }
  ctx.restore(); };
// any play-mode exit closes the mouth
if (RS.Play && !RS.Play._mouthWrap) { const ex = RS.Play.exit; RS.Play.exit = (Sf, s) => { if (Mo.cur && (!s || Mo.cur.s === s)) Mo.close(Sf, Mo.cur); return ex(Sf, s); }; RS.Play._mouthWrap = true; }
})(typeof window !== 'undefined' ? window : globalThis);
