'use strict';
// v08-dawbrain (Wilbow 7:39 / 7:41 PM): the DAW river shows what each ohm's music brain is really doing, not only its stored tune.
//  1 live notes: beads = what the ohm actually played (the last 32 steps, a wipe), its stored tune (C.score) a faint ghost behind
//  2 the chord it follows glows under the lane; its tradition's scale as a soft dot lattice + a true-cents comb at the lane start
//  3 a text-free role mark (lead / second voice / comp / bass / drums / listening) + the cycle's strong beats on the lane's top edge
//  4 where a note came from: a ring colour (learned motif amber, taught phrase cyan, the player's own notes magenta; own = no ring)
//  5 which sound played it: bead fill = birth voice (the ohm's colour) or the learned sound (its teacher's colour, whole or a dot)
//  6 drummers: the lane splits into five thin rows by kit part (low / back / time / fill / colour)
// Cheap: one emit hook in Mi.play writes into a small per-ohm ring of typed arrays (allocated once per ohm, held in a WeakMap, never
// saved). Nothing is recorded until the DAW has been opened once (DB.armed). Drawing runs only from D.render (DAW open), skips rows
// outside the screen, and allocates no arrays per frame. RS.DAWBRAIN = false (or DB.on = false) turns the whole layer off.
(function (G) { const RS = G.RS = G.RS || {}; const DB = RS.DawBrain = {};
const md = (a, n) => ((a % n) + n) % n, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), TAU = Math.PI * 2;
DB.on = true; DB.armed = false; DB.N = 64; DB.NB = 8; DB.SPAN = 32; DB.GHOST = .3; DB.EDIT_MS = 1400;
DB.SRC = { own: 0, learned: 1, taught: 2, player: 3, painted: 4 }; DB.SND = { birth: 0, faint: 1, clean: 2, hit: 3 };
DB.SRC_COL = [null, [255, 196, 90], [110, 225, 255], [255, 105, 200], [150, 255, 120]];   /* v08-dawpaint: painted = leaf green */   // own: no ring; learned motif amber; taught phrase cyan; the player's notes magenta
DB.LEARNED_COL = [190, 160, 255];   // a learned sound whose teacher is gone
DB.HIT_COL = [[255, 120, 80], [245, 245, 255], [255, 236, 140], [255, 170, 90], [120, 230, 210]];   // kit rows: low, back, time, fill, colour
const W = new WeakMap();
DB.ring = c => { let R = W.get(c); if (R) return R; const N = DB.N, NB = DB.NB;
  R = { i: 0, n: 0, pos: new Float32Array(N), deg: new Float32Array(N), dur: new Float32Array(N), vel: new Float32Array(N), src: new Uint8Array(N), snd: new Uint8Array(N), slot: new Int8Array(N), tid: new Array(N).fill(null),
    bi: 0, bar: new Int32Array(NB).fill(-2147483647), b0: new Float32Array(NB), bL: new Uint8Array(NB), cyc: new Int16Array(NB), cn: new Uint8Array(NB), cd: new Int8Array(NB * 4),
    org: 0, kT: c.taughtMotif || 0, kC: c.copied || 0, kR: c.revived || null, kZ: c.craze || null, kS: !!c.scored, kU: c.cultureFrom || null };
  R.org = c.scored || c.taughtMotif ? 2 : (c.copied || c.cultureFrom || c.revived || c.craze) ? 1 : 0; W.set(c, R); return R; };
DB.has = c => W.has(c);
// the motif's origin: whichever changed last wins (a phrase the player taught, then a copied one = learned)
DB.origin = (c, R) => { if ((c.taughtMotif || 0) !== R.kT) { R.kT = c.taughtMotif || 0; R.org = 2; } if (!!c.scored !== R.kS) { R.kS = !!c.scored; if (c.scored) R.org = 2; }
  if ((c.copied || 0) !== R.kC) { R.kC = c.copied || 0; R.org = 1; } if ((c.revived || null) !== R.kR) { R.kR = c.revived || null; if (c.revived) R.org = 1; }
  if ((c.craze || null) !== R.kZ) { R.kZ = c.craze || null; if (c.craze) R.org = 1; } if ((c.cultureFrom || null) !== R.kU) { R.kU = c.cultureFrom || null; if (c.cultureFrom) R.org = 1; } return R.org; };
const MEL = { melody: 1, solo: 1, answer: 1, harmony: 1, counter: 1 }, PSLOT = { 'pulse:low': 0, 'pulse:back': 1, 'pulse:time': 2, 'pulse:colour': 4 }, KI = { low: 0, back: 1, time: 2, fill: 3, colour: 4 };
DB.slotOf = (m, o, dv, f) => { const Dr = RS.Drums; if (dv && dv.hit && Dr && Dr.slotOf) { const s = KI[Dr.slotOf(dv.hit)]; if (s != null) return s; }
  const ps = PSLOT[m.role]; if (ps != null) return ps; const sp = o.stroke && Dr && Dr.STROKE_PART && Dr.STROKE_PART[o.stroke]; if (sp && KI[sp] != null) return KI[sp]; return f < 160 ? 0 : f < 700 ? 1 : 2; };
// THE emit hook (Mi.play, right after the note is sent to the synth): o = the note, dv = its drum voice, LY = its learned-sound pick
DB.rec = (Sf, c, o, when, rate, dv, LY, fH) => { if (!DB.on || RS.DAWBRAIN === false) return; const m = c.mind; if (!m) return; const R = DB.ring(c), i = R.i;
  const now = Sf.now ? Sf.now() : when; R.pos[i] = o.pos != null ? o.pos : m.pos + (when - now) * (rate || 1);
  let deg = o.deg; if (deg == null) { const n = m.sys && m.sys.cents ? m.sys.cents.length : 7, tH = RS.Mind && RS.Mind.tonicHz ? RS.Mind.tonicHz(Sf, m) : 0; deg = tH > 0 && fH > 0 ? Math.round(n * Math.log2(fH / tH)) : 0; }
  R.deg[i] = deg; R.dur[i] = o.d || .5; R.vel[i] = o.vel == null ? .5 : o.vel;
  R.src[i] = o.painted ? 4 : o.added || o.manual ? 3 : (MEL[m.role] && !o.chordTone && !o.pad && !o.back && !o.perc && !o.grace && !o.orn && !o.hum && !o.drone && !o.root && !o.het && !o.resp) ? DB.origin(c, R) : 0;
  let s = 0, tid = null; if (LY && LY.clean) s = 2; else if (LY && LY.faint) s = 1; else if (dv && o.hit != null) s = 3;
  if (LY && c.exp && c.exp.sl && c.exp.sl[LY.i]) tid = c.exp.sl[LY.i].s; R.snd[i] = s; R.tid[i] = tid;
  R.slot[i] = o.perc || dv ? DB.slotOf(m, o, dv, fH || 0) : -1; R.i = (i + 1) % DB.N; if (R.n < DB.N) R.n++; };
// per bar (read at draw time from the bar the brain last generated): its chord, its length and where it sits in the tradition's cycle
DB.barRec = (Sf, c, R) => { const m = c.mind; if (!m || m.bar == null || m.bar < 0 || R.bar[R.bi] === m.bar) return; const b = R.bi = (R.bi + 1) % DB.NB, ch = m.curChord, L = RS.Mind.barLen(m), Tr = RS.Trad, E = m.E;
  R.bar[b] = m.bar; R.b0[b] = m.genTo != null && Number.isFinite(m.genTo) ? m.genTo - L : m.bar * L; R.bL[b] = clamp(L, 1, 255); R.cyc[b] = E && E.trad && E.trad !== 'western' && Tr && Tr.cycBar ? Tr.cycBar(E, m, m.bar) : -1; const k = ch ? Math.min(4, ch.length) : 0; R.cn[b] = k; for (let j = 0; j < k; j++) R.cd[b * 4 + j] = clamp(Math.round(ch[j]), -100, 100); };
DB.barSlot = (R, bar) => { for (let j = 0; j < DB.NB; j++) if (R.bar[j] === bar) return j; return -1; };
// colour strings, cached (no string building per bead once warm)
const CS = new Map(); DB.css = (c, a) => { const q = Math.round(clamp(a, 0, 1) * 40), k = ((c[0] & 255) << 16 | (c[1] & 255) << 8 | (c[2] & 255)) * 64 + q; let s = CS.get(k); if (!s) { s = 'rgba(' + (c[0] | 0) + ',' + (c[1] | 0) + ',' + (c[2] | 0) + ',' + (q / 40) + ')'; if (CS.size > 4000) CS.clear(); CS.set(k, s); } return s; };
const LIT = new WeakMap(); DB.lit = c => { const k = c.col || [200, 200, 200]; let o = LIT.get(c); if (!o || o.k !== k) { o = { k, v: [k[0] + (255 - k[0]) * .3, k[1] + (255 - k[1]) * .3, k[2] + (255 - k[2]) * .3] }; LIT.set(c, o); } return o.v; };   // the birth voice: the ohm's own colour, lifted
let byId = null, byIdT = -1e9, byIdN = -1; DB.colOf = (Sf, id) => { if (id == null) return DB.LEARNED_COL; const tn = typeof performance !== 'undefined' ? performance.now() : 0;
  if (!byId || tn - byIdT > 2000 || byIdN !== Sf.creatures.length) { byId = new Map(); for (const q of Sf.creatures) byId.set(q.id, q); byIdT = tn; byIdN = Sf.creatures.length; } const q = byId.get(id); return q && q.col ? q.col : DB.LEARNED_COL; };
// the lane's brain: the ohm whose mind it shows (colony = its first member, instrument = the ohm in it)
DB.ohmOf = L => { const c = L.kind === 'colony' ? L.ref && L.ref.members && L.ref.members[0] : L.ref; return c && c.mind && !c.dead ? c : null; };
DB.drummer = c => !!(c && c.mind && (c.mind.perc > .55 || (c.P && c.P.inst && c.P.inst.dkP && c.P.inst.dkP.length)));
DB.ROLE = r => !r ? 'lead' : r === 'melody' || r === 'solo' ? 'lead' : r === 'answer' || r === 'counter' || r === 'harmony' || r === 'ornament' ? 'second' : r === 'bass' ? 'bass' : /^pulse/.test(r) ? 'drums' : r === 'listen' ? 'listen' : 'comp';
// how many live notes the lane shows now (beads inside the 32-step window)
DB.liveCount = (c) => { const R = c && W.get(c), m = c && c.mind; if (!R || !m) return 0; let k = 0; for (let j = 0; j < R.n; j++) { const a = m.pos - R.pos[j]; if (a >= -.25 && a < DB.SPAN - 1) k++; } return k; };
// ---- the DAW hooks (daw.js calls these from D.render; B = DB.frame(...) is null when the layer is off)
const edits = new Map(); DB.touch = id => edits.set(id, typeof performance !== 'undefined' ? performance.now() : 0);
DB.frame = (D, Sf) => { if (!DB.on || RS.DAWBRAIN === false) return null; if (D.open) DB.armed = true;   /* only a real open arms it (the boot frames fade a closed river out) */ DB.D = D; DB.Sf = Sf;
  if (!D._dbW && D.write) { const w0 = D.write; D.write = (L, p) => { if (L) DB.touch(L.id); return w0(L, p); }; D._dbW = true; }   /* every edit writes the stored tune: light the ghost up */
  return DB; };
// the stored tune is the ghost while the lane has live notes; it lights up fully while it is being edited (selected / dragged / just written / pattern open)
DB.ghostA = (L, inPat) => { if (inPat) return 1; const c = DB.ohmOf(L); if (!c || !W.has(c)) return 1; const D = DB.D, tn = typeof performance !== 'undefined' ? performance.now() : 0, e = edits.get(L.id);
  if (e != null && tn - e < DB.EDIT_MS) return DB.GHOST + (1 - DB.GHOST) * (1 - (tn - e) / DB.EDIT_MS); const h = D && D.dragH && D.dragH(); if (h && h.r && h.r.L.id === L.id && h.n) return 1;
  if (D && D.sel && D.sel.size) for (const k of D.sel) if (k.startsWith(L.id + ':')) return 1; return DB.liveCount(c) ? DB.GHOST : 1; };
const vis = (g, r) => r.y + r.h >= -4 && r.y <= g.Ht + 4;
const X = (g, s) => g.x0 + md(s, DB.SPAN) / DB.SPAN * g.w;
// a stretch of steps [a, b) on the wipe, split where it wraps
const span = (ctx, g, a, b, y, h) => { if (b <= a) return; if (b - a >= DB.SPAN) { ctx.rect(g.x0, y, g.w, h); return; } const xa = X(g, a), xb = X(g, b); if (xb > xa || md(b, DB.SPAN) === 0) ctx.rect(xa, y, (md(b, DB.SPAN) === 0 ? g.x1 : xb) - xa, h); else { ctx.rect(xa, y, g.x1 - xa, h); ctx.rect(g.x0, y, xb - g.x0, h); } };   // adds to the current path (callers batch one fill per style)
// under the beads: the scale lattice, the chord glow, the cycle's beats, the kit rows
DB.under = (ctx, g, r, L, t, dim, inPat) => { if (inPat || !vis(g, r)) return; const c = DB.ohmOf(L); if (!c) return; const m = c.mind, R = DB.ring(c), Sf = DB.Sf; DB.barRec(Sf, c, R);
  const n = m.sys && m.sys.cents ? m.sys.cents.length : 7, now = m.pos, Dd = DB.D, rs = r.h / 26, top = r.y + 2, bot = r.y + r.h - 2, drum = DB.drummer(c), Tr = RS.Trad, Dj = m.E && m.E.trad && m.E.trad !== 'western' && Tr ? Tr.Dj(m.E) : null, hue = Dj && Tr.hue ? (Tr.hue(m.E.trad) || '230,210,160') : null;
  const hc = hue ? DB.hueRGB(hue) : [230, 230, 240];
  let nx = 0;
  // the bars in the window (newest generated bar back ~3 bars). Batched: one path + one fill per style (a few fills per lane, not hundreds)
  const lo = now - DB.SPAN + 1, hi = now + 1; let nl = 0;
  if (!drum) for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); // chord glow: every chord tone in the lane's range over the stretch of the bar already played (pass 0 = the root, brighter)
    for (let j = 0; j < DB.NB; j++) { if (R.bar[j] < -1e9) continue; const bL = R.bL[j], b0 = R.b0[j]; if (b0 > hi || b0 + bL < lo) continue; const a = Math.max(b0, lo), b = Math.min(b0 + bL, hi);
      for (let k = pass ? 1 : 0; k < (pass ? R.cn[j] : Math.min(1, R.cn[j])); k++) { const d0 = md(R.cd[j * 4 + k], n); for (let d = d0 - 2 * n; d <= 12; d += n) { if (d < -12) continue; const y = Dd.dy(r, d); if (y < top || y > bot) continue; span(ctx, g, a, b, y - Math.max(1.5, rs * .7), Math.max(3, rs * 1.4)); } } }
    ctx.fillStyle = DB.css(GLOW, (pass ? .09 : .16) * dim); ctx.fill(); }
  // the cycle's beats on the lane's top edge: group starts small, the bar line taller; the cycle's landing (sam / gong / clave...) a bright diamond
  ctx.beginPath(); for (let j = 0; j < DB.NB; j++) { if (R.bar[j] < -1e9) continue; const bL = R.bL[j], b0 = R.b0[j]; if (b0 > hi || b0 + bL < lo) continue; const grp = m.groups; let s = 0;
    for (let k = 0; k <= grp.length && s < bL; k++) { const st = b0 + s; if (st > lo && st <= hi) { const x = X(g, st), land = R.cyc[j] === 0 && (Dj && Dj.land === 'three' ? s === Math.round(bL / 2) : s === 0);
        if (land) { if (nl < LS.length) LS[nl++] = st; } else ctx.rect(x - .75, r.y, 1.5, s === 0 ? 6 : 3.5);
        if (!drum && nx < XS.length) XS[nx++] = x; }   // a strong beat: the lattice gets a column here
      if (k < grp.length) s += grp[k]; } }
  ctx.fillStyle = DB.css(hc, .34 * dim); ctx.fill();
  for (let i = 0; i < nl; i++) { const x = X(g, LS[i]), age = now - LS[i], z = 4 + (age < 2 ? 2 * (1 - age / 2) : 0); ctx.fillStyle = DB.css(hc, (.55 + (age < 2 ? .4 : 0)) * dim); ctx.beginPath(); ctx.moveTo(x, r.y - z * .4); ctx.lineTo(x + z * .7, r.y + z * .6); ctx.lineTo(x, r.y + z * 1.6); ctx.lineTo(x - z * .7, r.y + z * .6); ctx.closePath(); ctx.fill(); }
  const Ra = Dj && ((m.E.fuse && m.E.fuse.rhythm && Tr.D(m.E.fuse.with)) || Dj);   // the accents live on the rhythm side (a fused jam may take another tradition's rhythm)
  if (Ra && Array.isArray(Ra.acc) && Ra.acc.length) { ctx.beginPath(); let any = 0; for (let j = 0; j < DB.NB; j++) { if (R.bar[j] < -1e9) continue; const bL = R.bL[j], b0 = R.b0[j]; if (b0 > hi || b0 + bL < lo) continue; for (const ac of Ra.acc) { const st = b0 + ac; if (ac < bL && st > lo && st <= hi) { const x = X(g, st); ctx.moveTo(x + 1.6, r.y + 2); ctx.arc(x, r.y + 2, 1.6, 0, TAU); any = 1; } } } if (any) { ctx.fillStyle = DB.css(hc, .5 * dim); ctx.fill(); } }
  const ng = RS.DawPaint && RS.DawPaint.noGrid(L);   // v08-dawpaint (8:45 PM "Instead of a grid make the notes more organic"): no dot lattice / tonic lines on a lane being painted or holding painted notes
  if (nx && !ng) for (let pass = 0; pass < 2; pass++) { ctx.beginPath(); const z = pass ? 2 : 1; for (let d = -12; d <= 12; d++) { if ((md(d, n) === 0) !== !!pass) continue; const y = Dd.dy(r, d); if (y < top + 6 || y > bot) continue; for (let i = 0; i < nx; i++) ctx.rect(XS[i] - z / 2, y - z / 2, z, z); } ctx.fillStyle = pass ? DB.css(WH, .22 * dim) : DB.css(WH, .07 * dim); ctx.fill(); }
  if (!drum) { // tonic lines across the lane, and the scale's true shape (cents) as a comb just left of the lane
    if (!ng) { ctx.beginPath(); for (let d = -2 * n; d <= 12; d += n) { if (d < -12) continue; const y = Dd.dy(r, d); if (y < top || y > bot) continue; ctx.rect(g.x0, y - .5, g.w, 1); } ctx.fillStyle = DB.css(WH, .07 * dim); ctx.fill(); }
    const y0 = Dd.dy(r, 0), y1 = Dd.dy(r, n), P = (m.sys && m.sys.period) || 1200, cs = m.sys && m.sys.cents; if (cs) for (let k = 0; k <= cs.length; k++) { const ce = k < cs.length ? cs[k] : P, y = y0 + (y1 - y0) * ce / P, mic = Math.abs(ce / 100 - Math.round(ce / 100)) > .15;
      ctx.fillStyle = DB.css(mic ? [255, 190, 120] : hc, (k === 0 || k === cs.length ? .7 : .45) * dim); ctx.fillRect(g.x0 - 9, y - .6, k === 0 || k === cs.length ? 7 : 5, 1.2); } }
  else for (let k = 0; k < 5; k++) { const y = DB.rowY(r, k); ctx.fillStyle = DB.css(DB.HIT_COL[k], .08 * dim); ctx.fillRect(g.x0, y - (r.h - 10) / 10, g.w, (r.h - 10) / 5 - 1); } };
const XS = new Float32Array(48), LS = new Float32Array(8), WH = [255, 255, 255], GLOW = [255, 232, 190];
DB.rowY = (r, k) => r.y + r.h - 5 - (k + .5) * (r.h - 10) / 5;   // kit rows bottom to top: low, back, time, fill, colour
const HUE = new Map(); DB.hueRGB = h => { let v = HUE.get(h); if (!v) { v = h.split(',').map(Number); HUE.set(h, v); } return v; };
// over everything: the live beads, the brain's own playhead (a sweep), the role mark
DB.over = (ctx, g, r, L, t, dim, inPat) => { if (!vis(g, r)) return; const c0 = DB.ohmOf(L); if (!c0) return; DB.role(ctx, r, c0.mind.role, dim, c0); if (inPat) return;
  const ms = L.kind === 'colony' && L.braided ? L.ref.members : null, K = ms ? Math.min(6, ms.length) : 1;
  for (let q = 0; q < K; q++) { const c = ms ? ms[q] : c0; if (!c || !c.mind || c.dead) continue; const R = W.get(c); if (!R) continue; const m = c.mind, now = m.pos, drum = DB.drummer(c), birth = DB.lit(c), Sf = DB.Sf, Dd = DB.D;
    for (let j = 0; j < R.n; j++) { const age = now - R.pos[j]; if (age < -.25 || age >= DB.SPAN - 1) continue; const a = (1 - .62 * age / DB.SPAN) * dim, x = X(g, R.pos[j]), v = R.vel[j], sn = R.snd[j], tc = sn ? DB.colOf(Sf, R.tid[j]) : null;
      if (R.slot[j] >= 0 && drum) { const y = DB.rowY(r, R.slot[j]), hh = Math.max(3, (r.h - 10) / 5 - 2); ctx.fillStyle = DB.css(sn === 2 || sn === 3 ? tc : birth, (.55 + .45 * v) * a); ctx.fillRect(x - 1.5, y - hh / 2, 3 + v * 2, hh); if (sn === 1) { ctx.fillStyle = DB.css(tc, a); ctx.fillRect(x - .5, y - hh / 2, 1.5, hh); } if (R.src[j] >= 3) { ctx.strokeStyle = DB.css(DB.SRC_COL[R.src[j]], .9 * a); ctx.lineWidth = 1; ctx.strokeRect(x - 2.5, y - hh / 2 - 1, 5 + v * 2, hh + 2); } continue; }
      const y = Dd.dy(r, clamp(R.deg[j], -12.5, 12.5)), rad = 2.2 + v * 3.2, w = Math.min(g.w * .5, R.dur[j] / DB.SPAN * g.w);
      ctx.fillStyle = DB.css(sn === 2 ? tc : birth, .92 * a); ctx.fillRect(x, y - rad * .45, Math.max(0, Math.min(w, g.x1 - x)), rad * .9); ctx.beginPath(); ctx.arc(x, y, rad, 0, TAU); ctx.fill();
      if (sn === 1 || sn === 3) { ctx.fillStyle = DB.css(tc, a); ctx.beginPath(); ctx.arc(x, y, rad * .5, 0, TAU); ctx.fill(); }   // a learned sound layered faintly under the birth voice
      const sc = DB.SRC_COL[R.src[j]]; if (sc) { ctx.strokeStyle = DB.css(sc, .9 * a); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(x, y, rad + 1.8, 0, TAU); ctx.stroke(); } }
    if (q === 0 && R.n) { const x = X(g, now); ctx.fillStyle = DB.css(birth, .55 * dim); ctx.fillRect(x - 1, r.y + 3, 2, r.h - 6); } } };
// the role mark, left of the silhouette: lead = a filled spike, second voice = a hollow one, comp = stacked dots, bass = a low bar, drums = a diamond, listening = an open ring
DB.role = (ctx, r, role, dim, c) => { const k = DB.ROLE(role), x = 8, y = r.y + r.h / 2, col = c && c.mind && c.mind.E && c.mind.E.leader === c ? [255, 240, 200] : [235, 235, 245]; ctx.fillStyle = ctx.strokeStyle = DB.css(col, .75 * dim); ctx.lineWidth = 1.3;
  if (k === 'lead' || k === 'second') { ctx.beginPath(); ctx.moveTo(x, y - 6); ctx.lineTo(x + 4, y + 4); ctx.lineTo(x - 4, y + 4); ctx.closePath(); if (k === 'lead') ctx.fill(); else ctx.stroke(); }
  else if (k === 'comp') { for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x, y + i * 4.5, 1.8, 0, TAU); ctx.fill(); } }
  else if (k === 'bass') ctx.fillRect(x - 4.5, y + 2, 9, 3.5);
  else if (k === 'drums') { ctx.beginPath(); ctx.moveTo(x, y - 5); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 5); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill(); }
  else { ctx.beginPath(); ctx.arc(x, y, 4, 0, TAU); ctx.stroke(); } };
// test / dev read-out (allocates; never called by the game)
DB.view = c => { const R = W.get(c); if (!R) return null; const out = []; for (let j = 0; j < R.n; j++) { const i = md(R.i - R.n + j, DB.N); out.push({ pos: R.pos[i], deg: R.deg[i], dur: R.dur[i], vel: R.vel[i], src: R.src[i], snd: R.snd[i], slot: R.slot[i], tid: R.tid[i] }); }
  const bars = []; for (let j = 0; j < DB.NB; j++) if (R.bar[j] > -1e9) bars.push({ bar: R.bar[j], L: R.bL[j], cyc: R.cyc[j], chord: Array.from(R.cd.slice(j * 4, j * 4 + R.cn[j])) }); return { notes: out, bars, org: R.org }; };
})(typeof window !== 'undefined' ? window : globalThis);
