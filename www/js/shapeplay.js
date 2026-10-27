'use strict';
// v0.8a6 (chunk 3c part 2, V08_SPEC P5-P7): ohms play drawn shapes (P5), ensembles (P6 1-4), partial jam pull (P7).
// Wilbow 3:38/3:41: an ohm playing a shape NEVER takes the shape's timbre as its own instrument. The shape sounds in its own
// voice (Sf.strikeBody / a bow spec on the SHAPE, layered by Sf.shapeLayer). c.P.inst is never written; no voice lock; items only modulate.
// Off-screen cheap: every per-ohm decision and every jam pull is gated by Sf.inView; nothing here runs when no drawn shape exists.
(function (G) {
const RS = G.RS, clamp = RS.clamp, SP = RS.ShapePlay = {};
SP.SEEK = 300; SP.ENS_R = 250; SP.ENS_MAX = 40; SP.REACH = 450; SP.CAP = .25; SP.STEP = .08; SP.AWAY = .25; SP.NEAR8 = 8;
const Mi = () => RS.Mind, J = () => RS.Jam, To = () => RS.Tonal;
const ctr = (Sf, b) => Sf.W.center(b);
const barS = (Sf, m) => (m && m.bpm ? Mi().barLen(m) / (m.bpm / 60 * 4) : Sf.M.barDur());
const isStr = b => b.kind === 'rod' && (b.thick || 4) < 7 && b.pins && b.pins.length + (b.links ? b.links.length : 0) >= 2;
const isTine = b => b.kind === 'rod' && b.pins && b.pins.length + (b.links ? b.links.length : 0) === 1;
const isBar = b => b.kind === 'rod' && !isStr(b) && !isTine(b);
const smooth = b => (b.mat.clear || 0) > .4 || (b.mat.grain != null ? b.mat.grain : .5) < .3;
const angOf = (W, b) => { const a = b.idx[0], c = b.idx[b.idx.length - 1]; let t = Math.atan2(W.y[c] - W.y[a], W.x[c] - W.x[a]); if (t < 0) t += Math.PI; if (t >= Math.PI) t -= Math.PI; return t; };
const busy = (Sf, c) => c.dead || c.grabbed || c.caught || c.carried || c.batonOn || c.state === 'flee' || (c.fleeT > 0) || !c.mind || (c.jam && c.jam.settleT && Sf.now() < c.jam.settleT);
// the shapes list is rebuilt at most once a second (and on shape events) -> P6 recognition runs only when it changes
SP.list = Sf => { const t = Sf.now(), st = SP.st(Sf); if (st.list && t - st.listT < 1 && st.ev === Sf._shapeEv) return st.list; st.listT = t;
  const out = []; for (const b of Sf.W.bodies.values()) if (b.drawn && b.meta && b.meta.role === 'instrument' && b.idx.length >= 2) out.push(b);
  const key = out.map(b => b.uid).join(','); if (key !== st.key || st.ev !== Sf._shapeEv) { st.key = key; st.ev = Sf._shapeEv; st.dirty = true; } return st.list = out; };
SP.st = Sf => Sf._sp || (Sf._sp = { list: null, listT: -9, key: '', ev: 0, dirty: false, ens: [], tickT: -9, ensT: -9 });
// ---------------- key context: nearest jam -> regional key -> session key (same order as P2) ----------------
SP.keyAt = (Sf, x, y) => { const j = J(); const m = j && j.local ? j.local(Sf, x, y) : null; if (m && m.sys) return { sys: m.sys, base: Mi().tonicHz(Sf, m), chord: m.curChord || null, m };
  const rk = Sf.region && Sf.region.keyAt ? Sf.region.keyAt(x, y) : null, sys = rk && RS.Field && RS.Field.sysOf ? RS.Field.sysOf(rk) : null;
  if (sys) return { sys, base: Mi().tonicHz(Sf, { sys, tonicC: rk.tc, regOct: 0, oct: 0 }), chord: null };
  const S = Sf.M.S && Sf.M.S(); if (S && S.c) return { sys: { cents: S.c.slice(), period: 1200 }, base: Sf.M.rootHz(), chord: null }; return null; };
const degOf = (K, f) => To().degOfCents(K.sys, 1200 * Math.log2(f / K.base)).d;
const hzOf = (K, d) => K.base * Math.pow(2, To().cents(K.sys, d) / 1200);
// ---------------- P6: ensembles (recognised only on shape events) ----------------
SP.recognise = Sf => { const st = SP.st(Sf), W = Sf.W, L = st.list || []; st.dirty = false; const old = new Map(st.ens.map(e => [e.kind + ':' + e.ids.join(','), e]));
  for (const b of L) { b.ens = null; b.rowBar = false; }
  const P = L.map(b => ({ b, c: ctr(Sf, b) })); const seen = new Set(), groups = [];
  for (const p of P) { if (seen.has(p)) continue; const g = [p]; seen.add(p); for (let k = 0; k < g.length && g.length < SP.ENS_MAX; k++) for (const q of P) if (!seen.has(q) && Math.hypot(q.c[0] - g[k].c[0], q.c[1] - g[k].c[1]) < SP.ENS_R) { seen.add(q); g.push(q); if (g.length >= SP.ENS_MAX) break; } groups.push(g); }
  const ens = [];
  for (const g of groups) { const bars = g.filter(p => isBar(p.b)), strs = g.filter(p => isStr(p.b)), blobs = g.filter(p => p.b.kind === 'blob');
    const par = arr => { if (arr.length < 3) return null; const a = arr.map(p => angOf(W, p.b)); for (const a0 of a) { const m = arr.filter((p, i) => { let d = Math.abs(a[i] - a0); d = Math.min(d, Math.PI - d); return d < 25 * Math.PI / 180; }); if (m.length >= 3) return m; } return null; };
    const row = par(bars); if (row) ens.push({ kind: 'row', m: row });
    let harp = par(strs); if (!harp && strs.length >= 3) { const an = p => new Set([...(p.b.links || []).map(i => W.bod[i])]); const s0 = an(strs[0]); const sh = strs.filter(p => [...an(p)].some(x => s0.has(x))); if (sh.length >= 3) harp = sh; } if (harp) ens.push({ kind: 'harp', m: harp });
    if (blobs.length >= 3) { const cx = blobs.reduce((a, p) => a + p.c[0], 0) / blobs.length, cy = blobs.reduce((a, p) => a + p.c[1], 0) / blobs.length; const m = blobs.filter(p => Math.hypot(p.c[0] - cx, p.c[1] - cy) < SP.ENS_R); if (m.length >= 3) ens.push({ kind: 'circle', m }); }
    for (const p of g) if (p.b.kind === 'rod' && !p.b.ens && W.length(p.b) >= 300 && !(row && row.includes(p)) && !(harp && harp.includes(p))) ens.push({ kind: 'drone', m: [p] }); }
  st.ens = []; const recs = [];
  for (const e of ens) { const ids = e.m.map(p => p.b.uid).sort((a, b) => a - b), E = { kind: e.kind, ids, bs: e.m.map(p => p.b) }; for (const p of e.m) { p.b.ens = E; if (e.kind === 'row') p.b.rowBar = true; }
    if (e.kind === 'circle') { const s = e.m.slice().sort((a, b) => Math.abs(Sf.W.area(b.b)) - Math.abs(Sf.W.area(a.b))); s.forEach((p, i) => { p.b.drumRole = i === 0 ? 'kick' : i === s.length - 1 ? 'small' : 'tom'; }); }
    st.ens.push(E); recs.push({ kind: e.kind, ids });
    if (!old.has(e.kind + ':' + ids.join(',')) && e.kind !== 'drone') SP.announce(Sf, E); }
  Sf.mods.shapeEns = recs; Sf.stats.shapeEns = (Sf.stats.shapeEns || 0) + 1; return st.ens; };
// a newly recognised ensemble: a soft glow links the members, then one rising sweep (on screen only)
SP.announce = (Sf, E) => { Sf.stats.ensNew = (Sf.stats.ensNew || 0) + 1; const pts = E.bs.map(b => ctr(Sf, b)); if (!pts.some(p => Sf.inView(p[0], p[1], 0))) return;
  const cx = pts.reduce((a, p) => a + p[0], 0) / pts.length, cy = pts.reduce((a, p) => a + p[1], 0) / pts.length, r = Math.max(30, ...pts.map(p => Math.hypot(p[0] - cx, p[1] - cy))) + 20;
  Sf.fx({ k: 'bloom', x: cx, y: cy, r, col: [255, 236, 170], dur: 1.4 }); const now = Sf.now(), S = Sf.S;
  E.bs.slice().sort((a, b) => S.physics(a).f0 - S.physics(b).f0).forEach((b, i) => { const p = ctr(Sf, b); Sf.strikeBody(b, p[0], p[1], 160, now + .12 + i * .09, { soft: true, auto: true, noImpulse: true, noSum: true }); });
  Sf.stats.ensSweep = (Sf.stats.ensSweep || 0) + 1; };
// ensemble tuning, called from Shapes.tune: row = distinct adjacent scale degrees; harp = distinct chord tones; drone = jam tonic/fifth when within 50 cents
SP.ensTune = (Sf, b, f) => { const E = b.ens; if (!E || E.kind === 'circle') return 0; const p = ctr(Sf, b), K = SP.keyAt(Sf, p[0], p[1]); if (!K) return 0; const S = Sf.S;
  if (E.kind === 'drone') { const jm = K.m && K.m.c && K.m.c.jam; if (!jm || jm.members.concat([jm.leader]).filter(c => c && c.P && c.P.inst && (c.P.inst.bow || 0) + (c.P.inst.blow || 0) > .4).length < 2) return 0;   /* a drone needs a jam with 2+ bowers */ const c = 1200 * Math.log2(f / K.base), per = K.sys.period || 1200, five = To().cents(K.sys, K.sys.cents.length >= 7 ? 4 : Math.min(K.sys.cents.length - 1, 3));
    for (const t of [0, five]) { const e = ((c - t) % per + per * 1.5) % per - per / 2; if (Math.abs(e) <= 50) { Sf.stats.droneLock = (Sf.stats.droneLock || 0) + 1; return f * Math.pow(2, -e / 1200); } } return 0; }
  const bs = E.bs.filter(q => Sf.W.bodies.has(q.id)); if (bs.length < 2) return 0; const raw = bs.map(q => ({ q, f: q === b ? f : S.physics(q).f0 })).sort((a, c) => a.f - c.f);
  const n = K.sys.cents.length, ch = K.chord || [0, 2, 4], ok = d => E.kind === 'row' || To().isChordTone(K.sys, d, ch); let d = degOf(K, raw[0].f); if (!Number.isFinite(d)) return 0; const G = n * 4 + 8; let g = 0; while (!ok(d) && g++ < G) d++;   /* stab: capped (no chord tone / NaN can't hang) */
  const out = new Map(); for (let i = 0; i < raw.length; i++) { if (i) { d++; g = 0; while (!ok(d) && g++ < G) d++; } out.set(raw[i].q, d); } const dd = out.get(b); if (dd == null) return 0;
  Sf.stats.ensTune = (Sf.stats.ensTune || 0) + 1; return hzOf(K, dd); };
// ---------------- P5: ohms play drawn shapes (on screen only, one decision per 4 bars) ----------------
const love = c => (c.P.beh && c.P.beh.instrLove != null ? c.P.beh.instrLove : .5);
SP.techs = (Sf, c, b, f0) => { const I = c.P.inst || {}, m = c.mind, out = [], L = love(c);
  const ctrHz = m && m.sys ? Mi().tonicHz(Sf, m) : 220, oc = Math.abs(Math.log2(f0 / ctrHz)), reg = oc <= 1 ? 1 : oc <= 2 ? .7 : .4;
  const sc = (k, g) => { if (g > 0) out.push({ k, s: g * (.4 + .6 * L) * reg }); };
  sc('strike', Math.max(m ? m.perc || 0 : 0, I.strike || 0)); if (isStr(b) || isTine(b)) sc('pluck', I.pluck || 0); if (smooth(b)) sc('bow', (I.bow || 0) + (I.blow || 0));
  if ((I.voc || 0) > 0) { out.push({ k: 'sing', s: (I.voc || 0) * (.4 + .6 * L) }); } if (L > .45 && b.kind === 'blob') out.push({ k: 'perch', s: L * .5 });
  return out.sort((a, q) => q.s - a.s); };
SP.decide = (Sf, c, L) => { const now = Sf.now(), m = c.mind; c._spNext = now + 4 * barS(Sf, m); c._spN = (c._spN || 0) + 1; Sf.stats.spDecide = (Sf.stats.spDecide || 0) + 1;
  let best = null; for (const b of L) { const p = ctr(Sf, b), d = Math.hypot(p[0] - c.x, p[1] - c.y); if (d > SP.SEEK) continue; const f0 = Sf.S.physics(b).f0, T = SP.techs(Sf, c, b, f0)[0]; if (!T) continue; const s = T.s * (1 - d / SP.SEEK * .5); if (!best || s > best.s) best = { b, k: T.k, s, f0 }; }
  if (!best || best.s < .1) { c.shp = null; return null; }
  c.shp = { b: best.b, k: best.k, t0: now, until: now + 4 * barS(Sf, m), nextT: 0 }; Sf.stats['sp_' + best.k] = (Sf.stats['sp_' + best.k] || 0) + 1;
  if (!c.jam && (best.k === 'strike' || best.k === 'pluck') && c.home !== best.b && RS.Creature && RS.Creature.adopt) RS.Creature.adopt(Sf, c, best.b);   // outside a jam: the existing adopt loop (strikes the SHAPE via strikeBody byCreature)
  return c.shp; };
const EXC = { strike: .15, pluck: .25, bow: .6, sing: 1 };
// one hit on the member grid (in a jam) or on the world 16th grid; strike/pluck use the shape's own ring + voice, bow uses a sustained rub
SP.hit = (Sf, c, P, t) => { const b = P.b, W = Sf.W; if (!W.bodies.has(b.id)) { c.shp = null; return; } const p = ctr(Sf, b), x = p[0], y = p[1], m = c.mind;
  if (P.k === 'bow') { const S = Sf.S; let spec = S.rub ? S.rub(b, { mat: { clear: 1 } }, x, y, 400, { t }) : null; if (!spec) return; const bl = barS(Sf, m), dur = b.ens && b.ens.kind === 'drone' ? bl * 1.15 : bl * .6;
    for (const md of spec.modes || []) md.d = Math.max(md.d || 0, dur); spec.att = Math.max(spec.att || 0, .12); spec.byCreature = c.id; if (Sf.shapeLayer) Sf.shapeLayer(b, spec, t, x, y, 300, { exc: .6, byCreature: c }); Sf.play(spec, t, x, y);   /* v0.8a9: layer before play (it was added after the note had already gone out) */
    SP.heard(Sf, b, spec, t, { byCreature: c }); Sf.stats.spBow = (Sf.stats.spBow || 0) + 1; return; }
  let v = P.k === 'pluck' ? 260 + 120 * (c.mind.mood ? c.mind.mood.a : .5) : 300 + 200 * (m.perc || .5);
  Sf.strikeBody(b, x + (b.kind === 'rod' ? 0 : (c.rnd ? c.rnd() - .5 : 0) * 6), y, v, t, { byCreature: c, exc: EXC[P.k], noImpulse: true }); Sf.stats['spHit_' + P.k] = (Sf.stats['spHit_' + P.k] || 0) + 1; };
// drum circle roles: a kick drummer takes the largest drum, toms the middle ones, others the smallest; kit drummers play the whole circle
SP.drumFor = (c, P) => { const E = P.b.ens; if (!E || E.kind !== 'circle') return P.b; const d = c.P.inst && c.P.inst.drum, want = d === 'kick' ? 'kick' : d === 'tom' ? 'tom' : d === 'kit' ? null : 'small';
  if (!want) return E.bs[Math.floor((c._spK = (c._spK || 0) + 1)) % E.bs.length]; return E.bs.find(b => b.drumRole === want) || P.b; };
SP.ohmTick = (Sf, c, now) => { const P = c.shp; if (!P) return; if (now > P.until || busy(Sf, c) || !Sf.inView(c.x, c.y, 60)) { c.shp = null; return; } const m = c.mind;
  const p = ctr(Sf, P.b), d = Math.hypot(p[0] - c.x, p[1] - c.y);
  if (!c.jam && d > 60 && RS.Creature && RS.Creature.impulse && P.k !== 'strike' && P.k !== 'pluck') RS.Creature.impulse(Sf, c, (p[0] - c.x) / d * 40, (p[1] - c.y) / d * 40);   // walk/drift up to it (adopt seeks for strike/pluck)
  if (P.k === 'sing' || P.k === 'perch') return; if (!c.jam) { if (P.k === 'bow' && now >= P.nextT) { P.nextT = now + barS(Sf, m); SP.hit(Sf, c, P, now + .02); } return; }
  if (P.nextT && now < P.nextT - .12) return; const every = P.k === 'bow' ? Mi().barLen(m) : P.k === 'pluck' ? 2 : 4, t = J().gridTime(Sf, m, now + .05, every);
  const Q = P.k === 'strike' ? Object.assign({}, P, { b: SP.drumFor(c, P) }) : P; if (P.k === 'bow' || (c.rnd ? c.rnd() : Math.random()) < .35 + .5 * (m.perc || 0) * (P.k === 'strike' ? 1 : .6)) SP.hit(Sf, c, Q, t); P.nextT = t + .02; };
// sing-to: when a singer sings a note within 30 cents (any octave) of a shape's pitch, the shape rings softly back -- no impulse, the shape's own voice
SP.onPlay = (Sf, spec, when) => { const c = spec.src; if (!c || !c.shp || c.shp.k !== 'sing' || !(spec.f0 > 0)) return; const b = c.shp.b; if (!Sf.W.bodies.has(b.id)) return; const f = Sf.S.physics(b).f0, sf = Sf.S.tune ? Sf.S.tune(b, f, when || Sf.now()) : f;
  const e = 1200 * Math.log2(spec.f0 / sf), r = ((e % 1200) + 1800) % 1200 - 600; if (Math.abs(r) > 30) return; const t = Sf.now(); if (b._symT && t - b._symT < .5) return; b._symT = t; const p = ctr(Sf, b);
  Sf.strikeBody(b, p[0], p[1], 75, when || t, { soft: true, noImpulse: true, byCreature: c, exc: 1, sym: true }); Sf.stats.spSing = (Sf.stats.spSing || 0) + 1; };
// ---------------- P7: what a shape is playing (per-shape onset summary) ----------------
SP.heard = (Sf, b, spec, t, o2) => { if (!b.drawn || (o2 && (o2.noSum || o2.click))) return; const c = o2 && o2.byCreature && typeof o2.byCreature === 'object' ? o2.byCreature : null;
  const w = c ? 1 : o2 && o2.auto ? .3 : 1, f = spec && spec.modes && spec.modes[0] ? spec.modes[0].f : spec && spec.f0 || 0; const S = b._sum || (b._sum = { on: [], f: [] });
  S.on.push({ t, w, c }); if (S.on.length > 12) S.on.shift(); if (f > 0) { S.f.push(f); if (S.f.length > 8) S.f.shift(); } S.last = t; };
const tempoOf = (on, ref) => { if (on.length < 3) return null; const iv = []; for (let i = 1; i < on.length; i++) { const d = on[i].t - on[i - 1].t; if (d > .06) iv.push(d); } if (iv.length < 2) return null;
  iv.sort((a, c) => a - c); const med = iv[iv.length >> 1], mean = iv.reduce((a, c) => a + c, 0) / iv.length, sd = Math.sqrt(iv.reduce((a, c) => a + (c - mean) * (c - mean), 0) / iv.length);
  let bpm = 60 / med; if (!(bpm > 0 && Number.isFinite(bpm) && ref > 0 && Number.isFinite(ref))) bpm = ref > 0 && Number.isFinite(ref) ? ref : 100; else { let g = 0; while (bpm > ref * Math.SQRT2 && g++ < 64) bpm /= 2; g = 0; while (bpm < ref / Math.SQRT2 && g++ < 64) bpm *= 2; } return { bpm, reg: clamp(1 - sd / Math.max(.05, mean) * 1.5, 0, 1) }; };
SP.follow = (Sf, c, w, melody) => { const m = c.mind; if (!m) return 0; const ex = c.exp && c.exp.sk != null ? c.exp.sk : (m.exp && m.exp.sk != null ? m.exp.sk : .5);
  let f = w * (.5 + .5 * clamp(m.learn || .5, 0, 1)) * (1 - .8 * (m.stub != null ? m.stub : .5)) * (.6 + .4 * clamp(ex, 0, 1)) * (.5 + .5 * love(c));
  const comp = c.P.life ? c.P.life.competitive || 0 : 0, cur = c.P.beh ? c.P.beh.curiosity || 0 : 0; if (comp > .6) f *= .6; if (melody && cur > .6) f *= 1.3; return clamp(f, 0, SP.CAP); };
// once per jam bar (called from jam.js): sum the pull of the nearest heard shapes, move the jam's tempo a little, offer members the shape's line
SP.jamBar = (Sf, j) => { const st = Sf._sp; if (!st || !st.list || !st.list.length || !j.leader || !j.leader.mind) return; const L = j.leader.mind, now = Sf.now(), bl = barS(Sf, L);
  const jx = j.x != null ? j.x : j.leader.x, jy = j.y != null ? j.y : j.leader.y; if (!Sf.inView(jx, jy, 0)) return;
  const bat = j.members.some(c => c.batonOn) || j.leader.batonOn; if (bat) { j._spBat = now; j._spW = 0; return; } if (j._spBat && now - j._spBat < 2 * bl) return;
  const E = j.E, cur = E && E.bpmBase ? E.bpmBase : L.bpmT || L.bpm; if (j._spHome == null || (j._spSet != null && Math.abs(cur - j._spSet) > .5)) j._spHome = cur;   // someone else moved the tempo: that is the new home
  const cand = []; for (const b of st.list) { const S = b._sum; if (!S || !S.last || now - S.last > 8 * bl) continue; const p = ctr(Sf, b), d = Math.hypot(p[0] - jx, p[1] - jy); if (d < SP.REACH) cand.push({ b, S, d }); }
  cand.sort((a, c) => a.d - c.d); let W = 0, tw = 0, tb = 0, mel = null, mw = 0; const st8 = j._spS || (j._spS = new Map());
  for (const q of cand.slice(0, SP.NEAR8)) { const on = q.S.on.filter(o => !(o.c && o.c.jam === j)), recent = on.filter(o => now - o.t < 2 * bl).reduce((a, o) => a + o.w, 0), act = clamp(recent / 8, 0, 1), close = 1 - q.d / SP.REACH, T = tempoOf(on, cur);
    const prev = st8.get(q.b.uid) || 0, quiet = (now - q.S.last) / bl; let w = SP.CAP * act * close * (T ? .4 + .6 * T.reg : .4); w = Math.max(w, prev * Math.pow(.5, 1 / 2)); if (quiet > 8) w = 0; st8.set(q.b.uid, w); if (w <= 0) continue;
    W += w; if (T) { tw += w; tb += w * T.bpm; } if (w > mw && q.S.f.length >= 4) { mw = w; mel = q.S.f.slice(-4); } }
  W = Math.min(SP.CAP, W); j._spW = W; Sf.stats.jamPullW = W; const home = j._spHome; let nb = cur;
  if (tw > 0 && W > .005) { const fl = j.members.concat([j.leader]).filter(c => !c.batonOn), fm = fl.reduce((a, c) => a + SP.follow(Sf, c, W, false), 0) / Math.max(1, fl.length), tgt = tb / tw, gap = tgt - cur;
    nb = cur + clamp(gap * W * (.5 + clamp(fm / Math.max(1e-6, W), 0, 1)), -cur * SP.STEP, cur * SP.STEP); Sf.stats.jamPull = (Sf.stats.jamPull || 0) + 1; }   // open ohms lean in more (Q127 follow strength)
  nb += (home - cur) * .3 * (1 - W / SP.CAP);   // and the jam keeps relaxing toward its own tempo
  nb = clamp(nb, home * (1 - SP.AWAY), home * (1 + SP.AWAY)); if (Math.abs(nb - cur) > .01) { if (E && E.bpmBase) E.bpmBase = nb; else L.bpmT = nb; } j._spSet = nb;
  if (mel) for (const c of j.members.concat([j.leader])) { if (c.batonOn || !c.mind) continue; const f = SP.follow(Sf, c, W, true); if (f > 0) c.mind.spLine = { fs: mel, f, until: now + 8 * bl }; } };
// mind.js hook (genBar0, first bar of a phrase): borrow the shape's last 3-4 intervals into the local motif only (never m.motif / genes); prob = follow, <= 1 in 3 phrases
SP.borrow = (Sf, m, mot, bi) => { const s = m.spLine; if (!s || bi !== 0 || !Array.isArray(mot) || !mot.length) return mot; if (Sf.now() > s.until) { m.spLine = null; return mot; }
  m._spPh = (m._spPh || 0) + 1; if (m._spLast != null && m._spPh - m._spLast < 3) return mot; const r = Mi().rng ? Mi().rng(m, 'spb', m._spPh)() : Math.random(); if (r >= s.f) return mot;
  const base = Mi().tonicHz(Sf, m), ds = s.fs.map(f => To().degOfCents(m.sys, 1200 * Math.log2(f / base)).d), out = mot.slice(); let k0 = out.findIndex(v => v != null); if (k0 < 0) return mot;
  let cur = out[k0]; for (let i = 1, k = k0 + 1; i < ds.length && k < out.length; k++) { if (out[k] == null) continue; cur += clamp(ds[i] - ds[i - 1], -4, 4); out[k] = cur; i++; }
  m._spLast = m._spPh; Sf.stats.spBorrow = (Sf.stats.spBorrow || 0) + 1; return out; };
// ---------------- install ----------------
SP.install = Sf => { if (Sf._spInst) return; Sf._spInst = true; Sf._shapeEv = Sf._shapeEv || 0;
  const sb0 = Sf.strikeBody; Sf.strikeBody = (b, x, y, v, when, o2) => { const spec = sb0(b, x, y, v, when, o2); if (spec && b && b.drawn) SP.heard(Sf, b, spec, when || Sf.now(), o2 || {}); return spec; };
  const pl0 = Sf.play; Sf.play = (spec, when, x, y) => { if (spec && spec.src && spec.src.shp) SP.onPlay(Sf, spec, when); return pl0(spec, when, x, y); };
  const eat0 = Sf.eat; if (eat0) Sf.eat = (c, b) => { if (b && b.drawn && b._sum && b._sum.last && Sf.now() - b._sum.last < 4 * Sf.M.barDur()) { Sf.stats.spNoEat = (Sf.stats.spNoEat || 0) + 1; return; } return eat0(c, b); };
  const ge0 = Sf.grabEnd; Sf.grabEnd = (vx, vy) => { const D = Sf.shapeDrag, r = ge0(vx, vy); if (D) Sf._shapeEv++; return r; };
  const st0 = Sf.stroke; Sf.stroke = (...a) => { const r = st0(...a); Sf._shapeEv++; return r; };
  const step0 = Sf.step; Sf.step = (...a) => { const r = step0(...a); SP.tick(Sf); return r; }; };
SP.tick = Sf => { const st = SP.st(Sf), now = Sf.now(); if (now - st.tickT < .125) return; st.tickT = now; const L = SP.list(Sf); if (!L.length) return;
  if (st.dirty && now - st.ensT > .3) { st.ensT = now; SP.recognise(Sf); }
  const quarter = now - (st.decT || -9) >= .25; if (quarter) st.decT = now;
  for (const c of Sf.creatures) { if (c.dead || !c.mind) continue; if (c.shp) SP.ohmTick(Sf, c, now); if (!quarter || busy(Sf, c) || (c._spNext && now < c._spNext) || !Sf.inView(c.x, c.y, 0)) continue;
    let near = false; for (const b of L) { const p = ctr(Sf, b); if (Math.abs(p[0] - c.x) < SP.SEEK && Math.abs(p[1] - c.y) < SP.SEEK) { near = true; break; } } if (near) SP.decide(Sf, c, L); } };
})(typeof window !== 'undefined' ? window : global);
