// v0.8a7 (V08_SPEC Q, chunk 3c): ROOM IN THE JAM. Each on-screen jam keeps an occupancy map (7 octave bands x the bar's own step
// count, <= 48) built once per bar from the notes its members already generated (one-bar lag). Each member compares its share with a
// fair share by role and makes at most ONE move per bar: thin, softer, octave (one PERIOD of its scale), subdivision (slide into empty
// slots), or fill (bold / skilled ohms below their share). The lead keeps its band in its busy slots, the bass keeps the lowest band,
// tradition parts / the player / shapes are only counted. Q moves NOTES, TIMING and REGISTER only - never an instrument, gene, motif or
// role (Wilbow 3:38/3:41). Off screen: no map, no decisions, the last arrangement is applied frozen (a few ops per note).
(function (G) {
const RS = G.RS, clamp = RS.clamp, Mi = () => RS.Mind;
const QR = RS.QRoom = {};
QR.NB = 7; QR.NMAX = 48; QR.CROWD = 1.0; QR.HOLD = 4; QR.MIN = 3;   /* moves only in jams of >= 3 members (2-member jams are under their limits; K) */
QR.W = { melody: 1.4, solo: 1.4, bass: 1, pulse: 1, counter: .9, answer: .9, comp: .8, harmony: .8, texture: .8, drone: .8, ornament: .9, guest: 1 };
// tradition tags laid by RS.Trad.bar: never moved, only counted (chunk 4 traditions push their own tags here)
QR.PROT = ['drone', 'colo', 'gong', 'tumbao', 'montuno', 'kotekan', 'bell', 'clave', 'cross', 'sam', 'pakad', 'vadi', 'het', 'resp', 'gamaka', 'blue', 'bossa', 'sty'];   /* v0.8b6: sty = laid by a data style's rules */
QR.off = false;   /* test hook: build maps (measure) but make no moves */
const band = f => f < 80 ? 0 : f < 160 ? 1 : f < 320 ? 2 : f < 640 ? 3 : f < 1280 ? 4 : f < 2560 ? 5 : 6;
const DRUMB = { bass: 0, slap: 2, tone: 3, ring: 3, ghost: 6, mute: 6 };
QR.band = band; QR.bs = m => barSec(m); QR.cellsOf = (ns, N) => cellsOf(ns, N);
QR.prot = (E, o) => { if (!o || !E || !E.trad || E.trad === 'western') return false; for (const k of QR.PROT) if (o[k]) return true; return false; };
QR.wOf = role => { const r = (role || '').split(':')[0]; return QR.W[r] != null ? QR.W[r] : r === 'listen' ? 0 : .9; };
const isLead = m => /^(melody|solo)$/.test(m.role || ''), isBass = m => m.role === 'bass', isDrum = m => (m.perc || 0) > .55 || /^pulse/.test(m.role || '');
const barSec = m => Mi().barLen(m) / (m.bpm / 60 * 4 * (m.feel || 1));
const bright = c => { const P = c && c.P && c.P.inst; return P && P.cut ? clamp(Math.log(P.cut / 180) / Math.log(60), 0, 1) : .5; };
QR.onScreen = (Sf, j) => { if (!Sf.view || !Sf.inView || !j.members.length) return false; const [x, y] = RS.Jam.center(j); return Sf.inView(x, y, 120); };
// one note -> { b band, s slot, n held slots, v energy, perc, prot, wk weakness } on a grid of N slots (member bar = L steps)
const noteRec = (Sf, m, E, o, L, N, hum, br) => { const v = (o.vel == null ? .5 : o.vel) * hum; if (v <= 0) return null; let b, f = 0;
  if (o.perc) b = o.stroke && DRUMB[o.stroke] != null ? (o.f && (o.stroke === 'tone' || o.stroke === 'ring') ? band(o.f) : DRUMB[o.stroke]) : (o.f ? band(o.f) : 3);
  else if (o.deg == null && !o.f) return null; else { f = o.f || Mi().hz(Sf, m, o.deg); b = band(f); }
  const s = clamp(Math.floor((o.s || 0) * N / L + 1e-6), 0, N - 1), n = clamp(Math.round((o.d || 1) * N / L), 1, Math.min(8, N - s));
  return { b, f, s, n, v, br: o.perc ? 0 : br, perc: !!o.perc, prot: QR.prot(E, o), db: !!(o.db || o.root), wk: v * ((o.s || 0) % 4 === 0 ? 1.6 : (o.s || 0) % 2 === 0 ? 1.2 : 1) * (o.db ? 3 : 1) };
};
// a member's cells from its records: Map idx -> energy (onset full, held x .4, brightness x .3 one / two bands up)
const cellsOf = (ns, N, out = new Map(), cap = true) => { const add = (i, e) => out.set(i, (out.get(i) || 0) + e); for (const r of ns) { if (r.off) continue; const b = r.b;
  add(b * N + r.s, r.v); for (let k = 1; k < r.n; k++) add(b * N + r.s + k, r.v * .4); if (r.br > 0 && b < 6) { add((b + 1) * N + r.s, r.v * r.br * .3); if (r.br > .5 && b < 5) add((b + 2) * N + r.s, r.v * r.br * .15); } } if (cap) for (const [i, v] of out) if (v > 1) out.set(i, 1); return out; };   /* one voice fills a cell at most once (a chord is one voice) */
// ---------------- the wrapper (LAST on Mi.genBar) ----------------
QR.bar = (Sf, m, bar, o) => { const c = m.c, j = c && c.jam;
  if (!j || !m.E || !o) { if (m.qOct || m.qThin != null) QR.reset(m); return o; }
  if (j.members.length < QR.MIN) { if (m.qOct || m.qThin != null) QR.reset(m); return o; }
  if (c.batonOn) m.qBat = bar;
  const on = QR.onScreen(Sf, j), tn = Sf.now();
  if (on) { const bs = barSec(m); if (j.qT == null || tn - j.qT >= bs * .6 || tn < j.qT) QR.build(Sf, j, tn); }
  const D = m.E.drop, brk = m.bd || (D && bar >= D.from && bar <= D.to + 1);   /* a breakdown and its landing bar belong to the lead's arrangement: Q passes them through */
  const out = (c.batonOn || QR.off || brk) ? o : QR.apply(Sf, m, bar, o, j);
  if (on) QR.rec(Sf, m, out, o, tn);
  if (out.length) m.qLastB = bar; return out; };
QR.reset = m => { m.qOct = 0; m.qThin = null; m.qSoft = null; m.qSub = null; m.qFill = null; m.qMove = null; m.qRec = null; };
// record what a member actually generated (post-move) + its raw energy, for the next map
QR.rec = (Sf, m, out, raw, tn) => { const c = m.c, L = Mi().barLen(m), N = Math.min(QR.NMAX, L), E = m.E, hum = (c.muted || c.batonCut) ? 0 : m.quiet ? .35 : 1, br = bright(c);
  const ns = []; let e = 0, e0 = 0; for (const x of out) { const r = noteRec(Sf, m, E, x, L, N, hum, br); if (r) { r.src = x; ns.push(r); e += r.v; } } for (const x of raw) e0 += (x.vel == null ? .5 : x.vel) * hum;
  m.qRec = { T: tn, L, N, ns, e, e0 }; };
// ---------------- the map + decisions (once per bar per on-screen jam) ----------------
QR.build = (Sf, j, tn) => { j.qT = tn; Sf.stats.qBuild = (Sf.stats.qBuild || 0) + 1; const Lm = j.leader.mind, bs = barSec(Lm), N = Math.min(QR.NMAX, Mi().barLen(Lm)), NB = QR.NB, Gr = new Float32Array(NB * N);
  const mem = []; let raw = 0, post = 0;
  for (const c of j.members) { const m = c.mind; if (!m || c.dead) continue; const R = m.qRec; if (!R || tn - R.T > bs * 2.5 || c.muted || c.batonCut || m.role === 'listen') continue;
    const ns = R.N === N ? R.ns : R.ns.map(r => Object.assign({}, r, { s: clamp(Math.floor(r.s * N / R.N), 0, N - 1), n: Math.max(1, Math.round(r.n * N / R.N)) }));
    const cells = cellsOf(ns, N); mem.push({ c, m, ns, cells, e: 0, w: QR.wOf(m.role) }); raw += R.e0; post += R.e; }
  // the guest (player strikes + drawn shapes) and shapes played by members (counted, never moved)
  QR.guest(Sf, j, N, Lm, tn, bs, mem);
  for (const M of mem) { let e = 0; for (const [i, v] of M.cells) { Gr[i] += v; e += v; } M.e = e; }
  const T = mem.reduce((a, M) => a + M.e, 0); if (!mem.length || T <= 0) { j.qs = { clar: 1, bands: [0, 0, 0, 0, 0, 0, 0], mask: 0 }; return; }
  let occ = 0, cr = 0; for (let i = 0; i < Gr.length; i++) if (Gr[i] > .05) { occ++; if (Gr[i] > QR.CROWD) cr++; }
  const clar = occ ? 1 - cr / occ : 1, prevC = j.clar; j.clar = Math.round(clar * 1000) / 1000; j.qCrowd = cr; j.qOcc = occ; j.qN = N; j.qGr = Gr;
  const bands = []; for (let b = 0; b < NB; b++) { let s = 0; for (let k = 0; k < N; k++) s += Gr[b * N + k]; bands.push(Math.round(s * 100) / 100); }
  let mask = 0; for (let k = 0; k < Math.min(N, 30); k++) { let s = 0; for (let b = 0; b < NB; b++) s += Gr[b * N + k]; if (s > .05) mask |= 1 << k; }
  j.qs = { clar: j.clar, bands, mask };
  // loudness: what thinning took is given back on uncrowded notes (jam energy within +-10%)
  if (raw > 0 && post > 0) j.qGain = clamp((j.qGain || 1) * Math.pow(raw / post, .6), 1, 1.3);
  // experience (Q.4): a clear bar after a move
  for (const M of mem) if (M.m && M.m.qMoveT != null && tn - M.m.qMoveT < bs * 1.6 && j.clar >= .7) M.m.qGoodT = tn;
  // pairs whose cells stayed apart (no shared crowded cell) count bars apart (social familiarity grows a little faster after 8)
  for (const A of mem) { if (!A.m) continue; const ap = A.m.qApart || (A.m.qApart = {}); for (const B of mem) { if (A === B || !B.c) continue; let clash = false; for (const [i] of A.cells) if (Gr[i] > QR.CROWD && B.cells.has(i)) { clash = true; break; } ap[B.c.id] = clash ? 0 : Math.min(64, (ap[B.c.id] || 0) + 1); } }
  // the hint (Q.7): a jam of 4+ arranging itself on screen
  if (prevC != null && j.clar - (j.qC0 != null ? j.qC0 : prevC) >= .15 && mem.length >= 4) QR.hint(Sf, j, mem, tn);
  j.qC0 = j.qC0 == null ? j.clar : j.qC0 * .7 + j.clar * .3;
  if (QR.off) return;
  QR.decide(Sf, j, mem, Gr, N, T, tn); };
QR.guest = (Sf, j, N, Lm, tn, bs, mem) => { const [x, y] = RS.Jam.center(j), L = Mi().barLen(Lm), rate = Lm.bpm / 60 * 4 * (Lm.feel || 1);
  const slotAt = t => { const p = Lm.pos + (t - tn) * rate; return clamp(Math.floor(((p % L) + L) % L / L * N), 0, N - 1); };
  const g = { c: null, m: null, ns: [], cells: null, e: 0, w: QR.W.guest, guest: true }, byId = new Map(mem.map(M => [M.c, M]));
  for (const s of Sf.strikesP || []) { if (tn - s.t > bs * 1.05 || tn < s.t || !(s.f > 0) || Math.hypot(s.x - x, s.y - y) > 450) continue; g.ns.push({ b: band(s.f), s: slotAt(s.t), n: 1, v: .8 * clamp(s.v == null ? 1 : s.v, .2, 1), br: 0, prot: true }); }
  if (Sf.W && Sf.W.bodies) for (const b of Sf.W.bodies.values()) { const S = b.drawn && b._sum; if (!S || !S.on.length || tn - (S.last || 0) > bs * 1.05) continue; const [bx, by] = Sf.W.center(b); if (Math.hypot(bx - x, by - y) > 450) continue;
    const fs = S.f.slice().sort((a, b2) => a - b2), f = fs.length ? fs[fs.length >> 1] : 0; if (!(f > 0)) continue;
    for (const h of S.on) { if (tn - h.t > bs * 1.05 || tn < h.t) continue; const M = h.c ? byId.get(h.c) : null; const r = { b: band(f), s: slotAt(h.t), n: 1, v: .8 * h.w, br: 0, prot: true };
      if (M) { M.ns = M.ns.concat([r]); cellsOf([r], N, M.cells); } else if (!h.c) g.ns.push(r); } }
  if (g.ns.length) { g.cells = cellsOf(g.ns, N); mem.push(g); Sf.stats.qGuest = (Sf.stats.qGuest || 0) + 1; } };
// decisions: shy first (lowest own limit), each sees the map as the earlier ones left it
QR.decide = (Sf, j, mem, Gr, N, T, tn) => { const So = RS.Social, Ex = RS.Exp, NB = QR.NB, Wsum = mem.reduce((a, M) => a + M.w, 0) || 1;
  const lead = mem.find(M => M.m && isLead(M.m)), bass = mem.find(M => M.m && isBass(M.m));
  const LB = new Set(); if (lead) for (const r of lead.ns) if (!r.perc && !r.off) for (let k = 0; k < r.n; k++) LB.add(r.b * N + r.s + k);
  let bassB = -1; if (bass) { let lo = 9; for (const r of bass.ns) if (!r.perc && !r.off && r.b < lo) lo = r.b; if (lo < 9) bassB = lo; } { const hb = j.qBassH || (j.qBassH = []); hb.push(bassB); if (hb.length > 4) hb.shift(); j.qBassB = bassB = Math.max(...hb); }   /* the bass's floor over its last 4 bars: a walking bass that dips keeps its band */
  const forcedOf = (M, ns) => { let f = 0; for (const r of ns) { if (r.off || r.perc || r.prot) continue; if (LB.has(r.b * N + r.s)) f += r.v; if (bassB >= 0 && r.b <= bassB) f += r.v; } return f; };
  const scoreOf = (M, ns, lim) => { const mine = cellsOf(ns, N); let s = 0, e = 0; for (const [i, v] of mine) { const o = Gr[i] - (M.cells.get(i) || 0); s += Math.max(0, Math.min(v, o + v - QR.CROWD)); e += v; } return { s: s + forcedOf(M, ns), e, mine }; };
  const took = new Set(); const order = mem.filter(M => M.m).map(M => { const c = M.c, m = M.m, bold = So ? So.bold(c) : .5, lead2 = (c.P && c.P.life && c.P.life.leadership) || 0;
    return Object.assign(M, { bold, fair: M.w / Wsum, lim: (M.w / Wsum) * (1.2 + .8 * bold + .4 * (m.comp == null ? .5 : m.comp) + .3 * lead2), sk: Ex ? Ex.sk(c) : 0 }); })
    .sort((a, b) => (a.lim / a.fair) - (b.lim / b.fair) || (a.c.id > b.c.id ? 1 : -1));
  for (const M of order) { const c = M.c, m = M.m, bar = m.bar || 0;
    if (isLead(m) || isBass(m) || c.batonOn || (m.qBat != null && bar <= m.qBat + 1) || m.role === 'listen') continue;
    const prot = M.ns.filter(r => r.prot).length; if (prot * 2 > M.ns.length) continue;   /* a tradition part: only counted */
    const r = Mi().rng(m, 'q', bar), share = M.e / T, base = scoreOf(M, M.ns, M.lim), cued = c.batonCue && tn - c.batonCue < barSec(m) * 4;
    const crowded = share > M.lim || base.s > Math.max(.05, .1 * M.e);   /* any real part in an overflowing cell */ let mv = null;
    if (crowded) { const cand = [];
      const thinNs = (() => { const ns = M.ns.map(x => Object.assign({}, x)), mov = ns.filter(x => !x.prot && !x.db).sort((a, b) => a.wk - b.wk); const tgt = M.lim * T; let e = M.e, k = 0;
        for (const x of mov) { if (k >= Math.ceil(ns.length * .5) || (e <= tgt && k > 0)) break; x.off = true; e -= x.v; k++; }
        if (ns.every(x => x.off)) ns[0].off = false; return { ns, keep: ns.filter(x => !x.off).length / Math.max(1, ns.length) }; })();
      if (!cued && thinNs.keep < 1) cand.push({ k: 'thin', ns: thinNs.ns, keep: thinNs.keep });
      { const ns = M.ns.map(x => !x.prot && (Gr[x.b * N + x.s] > QR.CROWD || LB.has(x.b * N + x.s)) ? Object.assign({}, x, { v: x.v * .7 }) : x); cand.push({ k: 'soft', ns }); }
      if (!isDrum(m)) { const per = (m.sys && m.sys.period) || 1200, f0 = Mi().hz(Sf, m, 0), cur = m.qOct || 0, held = m.qOctB != null && bar - m.qOctB < QR.HOLD;
        if (!held) for (const d of [1, -1]) { const to = cur + d; if (Math.abs(to) > 1) continue; const k = Math.pow(2, d * per / 1200), fs = [];
          const ns = M.ns.map(x => { if (x.prot || x.perc || !x.f) return x; const f = x.f * k; fs.push(f); return Object.assign({}, x, { f, b: band(f) }); });
          const med = fs.length ? fs.sort((a, b) => a - b)[fs.length >> 1] : 0; if (!med || med < f0 / 4 || med > f0 * Math.pow(2, 2.5) || med < 45 || med > 4000) continue; if (took.has(band(med))) continue;   /* one ohm moves into a band per bar (no two leaping into each other) */
          if (bassB >= 0 && ns.some(x => !x.perc && !x.prot && x.b <= bassB)) continue; cand.push({ k: 'oct', ns, to, mb: band(med) }); } }
      { const map = {}, used = new Set(), sp = Math.max(1, Math.round(N / 16)), ns = M.ns.map(x => { if (x.prot || x.db || x.off) return x; const i0 = x.b * N + x.s; if (!(Gr[i0] > QR.CROWD || LB.has(i0))) return x;
          for (const dd of [sp, -sp, 2 * sp, -2 * sp]) { const s2 = x.s + dd; if (s2 <= 0 || s2 >= N || used.has(s2) || map[x.s] != null) continue; const i2 = x.b * N + s2; if (Gr[i2] - (M.cells.get(i2) || 0) < .05 && !LB.has(i2)) { map[x.s] = s2; used.add(s2); return Object.assign({}, x, { s: s2 }); } }
          return x; }); if (Object.keys(map).length) cand.push({ k: 'sub', ns, map }); }
      for (const C of cand) { const sc = scoreOf(M, C.ns, M.lim); C.sc = sc.s + Math.max(0, sc.e / T - M.lim) * T * .5 + (C.k === 'sub' && isDrum(m) ? -.05 : 0) + (C.k === 'soft' ? .02 : 0); C.mine = sc.mine; }
      const b0 = base.s + Math.max(0, share - M.lim) * T * .5, best = cand.slice().sort((a, b) => a.sc - b.sc)[0];
      if (best && best.sc < b0 - .01) { if (r() < .4 + .6 * M.sk) mv = best; else if (M.sk < .3 && r() < .2) mv = null; else mv = cand.find(x => x.k === 'thin') || null; } }
    else { // room to spare: relax the last arrangement, or fill (bold / skilled, never shy)
      if (m.qOct && m.qOctB != null && bar - m.qOctB >= QR.HOLD) { const k = Math.pow(2, -(m.qOct) * ((m.sys && m.sys.period) || 1200) / 1200), ns = M.ns.map(x => x.prot || x.perc || !x.f ? x : Object.assign({}, x, { f: x.f * k, b: band(x.f * k) })), sc = scoreOf(M, ns, M.lim);
        if (sc.s <= .05 && !(bassB >= 0 && ns.some(x => !x.perc && !x.prot && x.b <= bassB))) mv = { k: 'home', ns, to: 0, mine: sc.mine }; }
      if (!mv && m.qThin != null && m.qThin < 1 && (m.qThinB == null || bar - m.qThinB >= QR.HOLD) && base.s <= .05 && share / m.qThin < M.lim * .9) mv = { k: 'unthin', ns: M.ns, keep: Math.min(1, m.qThin + .25) };
      if (!mv && (m.qSoft || m.qSub) && base.s <= .05 && (m.qSubB == null || bar - m.qSubB >= QR.HOLD)) mv = { k: 'relax', ns: M.ns };
      if (!mv && M.ns.length && share < .5 * M.fair && ((j.qGain || 1) > 1.02 || share < .25 * M.fair) && M.bold > .35 && (M.bold > .6 || M.sk > .6)) { const ton = M.ns.filter(x => !x.perc && !x.off); const b = ton.length ? ton[ton.length >> 1].b : isDrum(m) ? 6 : 3, src = ton.length ? ton[ton.length >> 1].src : null, sp = Math.max(1, Math.round(N / 8)), fl = [];
        if (bassB < 0 || b > bassB) for (let s = sp; s < N && fl.length < 2; s += sp) { const i = b * N + s; if (Gr[i] < .05 && !LB.has(i) && r() < .5) fl.push(s); }
        if (fl.length) mv = { k: 'fill', ns: M.ns.concat(fl.map(s => ({ b, s, n: 1, v: .35, br: 0 }))), fill: fl.map(s => ({ s, deg: src && src.deg != null ? src.deg : 0, perc: !src, stroke: src ? undefined : 'mute' })), N }; } }
    if (!mv) { if (crowded) Sf.stats.qStay = (Sf.stats.qStay || 0) + 1; m.qFill = null; continue; }
    if (mv.mb != null) took.add(mv.mb); QR.commit(Sf, m, mv, bar, N, Gr, M, tn);
    const mine = mv.mine || cellsOf(mv.ns, N); for (const [i, v] of M.cells) Gr[i] -= v; for (const [i, v] of mine) Gr[i] += v; M.cells = mine; M.ns = mv.ns; M.e = 0; for (const [, v] of mine) M.e += v; } };
QR.commit = (Sf, m, mv, bar, N, Gr, M, tn) => { m.qMove = mv.k; m.qMoveT = tn; m.qFill = null; Sf.stats['q_' + mv.k] = (Sf.stats['q_' + mv.k] || 0) + 1; Sf.stats.qMove = (Sf.stats.qMove || 0) + 1;
  if (mv.k === 'thin') { m.qThin = Math.round(mv.keep * 100) / 100; m.qThinB = bar; }
  else if (mv.k === 'unthin') { m.qThin = mv.keep >= .999 ? null : mv.keep; m.qThinB = bar; }
  else if (mv.k === 'soft') { const S = new Set(); for (const x of M.ns) { const i = x.b * N + x.s; if (Gr[i] > QR.CROWD) S.add(x.s); } m.qSoft = { N, slots: S }; }
  else if (mv.k === 'oct' || mv.k === 'home') { m.qOct = mv.to; m.qOctB = bar; m.qOctN = (m.qOctN || 0) + 1; }
  else if (mv.k === 'sub') { m.qSub = { N, map: mv.map }; m.qSubB = bar; }
  else if (mv.k === 'relax') { m.qSoft = null; m.qSub = null; }
  else if (mv.k === 'fill') m.qFill = { N, notes: mv.fill }; };
// ---------------- apply the member's arrangement to its bar (on- and off-screen: a few ops per note) ----------------
QR.apply = (Sf, m, bar, o, j) => { const E = m.E, L = Mi().barLen(m), n = m.sys.cents.length, per = m.sys.period || 1200, c = m.c; let out = o, ch = false;
  const P = x => QR.prot(E, x), cl = (x, a) => Object.assign({}, x, a);
  if (m.qOct) { const k = Math.pow(2, m.qOct * per / 1200), bb = m.qOct < 0 && j && j.qBassB != null ? j.qBassB : -1; out = out.map(x => { if (x.perc || P(x) || x.deg == null) return x; const d2 = x.deg + m.qOct * n; if (bb >= 0 && band(x.f ? x.f * k : Mi().hz(Sf, m, d2)) <= bb) return x; return cl(x, { deg: d2, f: x.f ? x.f * k : x.f, qo: m.qOct }); }); ch = true; }   /* never down into the bass's band */
  if (m.qSub && m.qSub.map) { const Nq = m.qSub.N, mp = m.qSub.map; out = out.map(x => { if (P(x) || x.db || x.root) return x; const sl = Math.floor((x.s || 0) * Nq / L + 1e-6), to = mp[sl]; if (to == null || Math.abs((x.s || 0) - sl * L / Nq) > .01) return x; const s2 = to * L / Nq; return s2 > 0 && s2 < L ? cl(x, { s: s2, qs: true }) : x; }); ch = true; }
  const cued = c && c.batonCue && Sf.now() - c.batonCue < barSec(m) * 4;
  if (m.qThin != null && m.qThin < 1 && !cued && out.length > 1) { const mov = out.filter(x => !P(x) && !x.db && !x.root), keepN = Math.ceil(out.length * m.qThin), drop = Math.min(mov.length, out.length - keepN);
    if (drop > 0) { const wk = x => (x.vel == null ? .5 : x.vel) * ((x.s || 0) % 4 === 0 ? 1.6 : (x.s || 0) % 2 === 0 ? 1.2 : 1); const gone = new Set(mov.slice().sort((a, b) => wk(a) - wk(b) || a.s - b.s).slice(0, drop)); out = out.filter(x => !gone.has(x)); ch = true;
      if (!out.length && (m.qLastB == null || m.qLastB < bar - 1)) out = [mov.slice().sort((a, b) => wk(b) - wk(a))[0]]; } }   /* floor: >= 1 note per 2 bars from Q alone */
  if (m.qSoft && m.qSoft.slots.size) { const Nq = m.qSoft.N; out = out.map(x => P(x) || x.vel == null || !m.qSoft.slots.has(Math.floor((x.s || 0) * Nq / L + 1e-6)) ? x : cl(x, { vel: x.vel * .7, qv: true })); ch = true; }
  if (m.qFill && m.qFill.notes.length) { const Nq = m.qFill.N; for (const f of m.qFill.notes) { const s = f.s * L / Nq; if (s >= L || out.some(x => Math.abs((x.s || 0) - s) < .4) || (!f.perc && j && j.qBassB >= 0 && band(Mi().hz(Sf, m, f.deg)) <= j.qBassB)) continue; out = out.concat([f.perc ? { s, d: .5, perc: true, stroke: f.stroke, vel: .3, qf: true } : { s, d: Math.max(1, L / Nq * 2), deg: f.deg, vel: .32, qf: true, chordTone: true }]); } ch = true; }
  // v0.7 E growth places its extra notes only in empty cells (Q142)
  if (j && j.qN && m.qRec && j.qs && j.qs.mask) { const Nq = j.qN; out = out.filter(x => { if (!(x.fill || x.echo) || x.qf) return true; const sl = Math.floor((x.s || 0) * Nq / L + 1e-6); return sl >= 30 || !(j.qs.mask & (1 << sl)) || !(j.qCrowd > 0); }); }
  // loudness: give back what thinning took, on this member's uncrowded notes
  const g = j && j.qGain || 1; if (g > 1.001 && (m.qThin != null || m.qSoft) && !isLead(m) && !isBass(m)) { const Gq = j.qGr, Nq = j.qN; out = out.map(x => { if (x.qv || P(x) || x.vel == null) return x; if (Gq && Nq) { const b = x.perc ? (DRUMB[x.stroke] != null ? DRUMB[x.stroke] : 3) : x.deg == null && !x.f ? -1 : band(x.f || Mi().hz(Sf, m, x.deg)); if (b < 0 || Gq[b * Nq + Math.min(Nq - 1, Math.floor((x.s || 0) * Nq / L + 1e-6))] > .7) return x; } return cl(x, { vel: Math.min(1, x.vel * g) }); }); ch = true; }   /* only into cells with room */
  if (ch) out.sort((a, b) => (a.s || 0) - (b.s || 0)); return out; };
// ---------------- the hint (Q.7, section I style) ----------------
QR.hint = (Sf, j, mem, tn) => { if (!Sf.mods || Sf.baton || (j.settleT && tn < j.settleT) || Sf.dna || Sf.daw) return; const Gd = Sf.mods.guide || (Sf.mods.guide = {}); if ((Gd.qN || 0) >= 3 || Sf.qHint) return;
  Gd.qN = (Gd.qN || 0) + 1; Sf.qHint = { t: tn, j, hs: mem.filter(M => M.c).map(M => { let lo = 0, w = 0; for (const r of M.ns) { if (r.off) continue; lo += r.b * r.v; w += r.v; } return { c: M.c, h: w ? lo / w / 6 : .5 }; }) }; Sf.stats.qHint = (Sf.stats.qHint || 0) + 1; };
QR.draw = (ctx, Sf) => { const H = Sf.qHint, u = (Sf.now() - H.t) / 2.4; if (u > 1 || u < 0) { Sf.qHint = null; return; } const a = Math.sin(Math.PI * u);
  for (const { c, h } of H.hs) { if (c.dead || !Sf.inView(c.x, c.y, 40)) continue; const R = (c.r || 16), y = c.y - R * (1 + h * 3) * (.4 + .6 * a); ctx.save(); const gr = ctx.createRadialGradient(c.x, y, 0, c.x, y, R * 1.3); const col = c.col || [255, 255, 255];
    gr.addColorStop(0, 'rgba(' + col.map(v => v | 0).join(',') + ',' + (.35 * a) + ')'); gr.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(c.x, y, R * 1.3, 0, Math.PI * 2); ctx.fill(); ctx.restore(); } };
// LAST wrapper on Mi.genBar (after drumSong, Trad and growNotes)
if (RS.Mind) { const gb = RS.Mind.genBar; RS.Mind.genBar = (Sf, m, bar) => QR.bar(Sf, m, bar, gb(Sf, m, bar)); }
})(typeof window !== 'undefined' ? window : globalThis);
