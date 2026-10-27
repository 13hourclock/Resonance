// v0.7 D + D2: EXPERIENCE (a layer on top of the genome, never replacing a gene, never forgotten, saved with the world) and the
// COMPATIBILITY SKILL (one number per ohm that grows with experience). Ohms seek successful jams; members and bystanders learn the jam's
// tempo range, feel/intensity, meter, scale system, roles (rate = learnRate x openness). Experience widens the jam fit check; a skilled
// member bridges a wider gap (hosts the newcomer: cues it in at a phrase, plays simpler under it, shares what it knows). No mutation.
// Slow tick (2 s), compact numbers; the bridging cues/line are on-screen only.
(function (G) { const RS = G.RS, Ex = RS.Exp = {}; const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), r2 = x => Math.round(x * 100) / 100;
Ex.TICK = 2; Ex.EXPO = .5; Ex.RATE = 1 / 15; Ex.T0 = [.72, 1.4]; Ex.E0 = .3;
Ex.sk = c => c && c.exp ? c.exp.sk || 0 : 0;
Ex.pref = c => { const m = c.mind; return m.bpm0 || m.bpm || 100; };
Ex.make = c => { const m = c.mind, p = Ex.pref(c), a = m.base ? m.base.a : .5; return { xp: 0, jn: 0, pn: 0, ids: [], pl: [], bpm: [r2(p * Ex.T0[0]), r2(p * Ex.T0[1])], en: [r2(a - Ex.E0), r2(a + Ex.E0)], mx: {}, sx: {}, rx: {}, tx: {}, ex: {}, sk: 0 }; };
Ex.good = (Sf, j) => !!(j && j.E && j.leader && j.leader.mind && j.members.length >= 2 && (j.E.phase === 'settled' || j.coh > (RS.Jam ? RS.Jam.TH : .62)));
Ex.jamEn = j => j.members.reduce((s, c) => s + (c.mind && c.mind.mood ? c.mind.mood.a : .5), 0) / Math.max(1, j.members.length);
Ex.host = j => { let h = null, s = 0; for (const c of j.members) { const k = Ex.sk(c); if (k > s) { s = k; h = c; } } return [h, s]; };
const add = (o, k, v, cap) => { o[k] = r2((o[k] || 0) + v); const ks = Object.keys(o); if (ks.length > cap) { ks.sort((a, b) => o[a] - o[b]); delete o[ks[0]]; } };
const widen = (r, v, k, mg) => { if (v < r[0]) r[0] = r2(r[0] + (v - mg - r[0]) * k); if (v > r[1]) r[1] = r2(r[1] + (v + mg - r[1]) * k); };   /* aims a little past the jam, so the range really comes to include it */
// v0.7 (Wilbow 2:19 AM): a hatchling inherits PART of its parents' experience, on top of its genome: about a third of the mean of
// the parents' learned leanings (scales, styles, roles, traditions, places), its comfort ranges (tempo, energy) pulled a third of the
// way toward theirs, a little skill and xp. Not their friends or places played (ids / pl). One pass at hatch; nothing per frame.
Ex.INH = .35;
Ex.inherit = (Sf, c, pids) => { if (!c || !pids || !pids.length) return null; const ps = pids.map(id => Sf.creatures.find(o => o.id === id && o.exp)).filter(Boolean).map(p => ({ id: p.id, exp: JSON.parse(JSON.stringify(p.exp)) })); if (!ps.length) return null; if (!c.mind) { c._inhP = ps; return null; } return Ex.inheritFrom(Sf, c, ps); };   /* the mind wakes a moment after hatching: keep a snapshot until then */
Ex.inheritFrom = (Sf, c, ps) => { c._inhP = null; const e = c.exp || (c.exp = Ex.make(c)), k = Ex.INH / ps.length;
  for (const key of ['mx', 'sx', 'rx', 'tx', 'ex']) { for (const p of ps) { const src = p.exp[key] || {}; for (const q in src) if (typeof src[q] === 'number') add(e[key], q, src[q] * k, 6); } }
  for (const key of ['bpm', 'en']) { const m0 = ps.reduce((a, p) => a + (p.exp[key] ? p.exp[key][0] : e[key][0]), 0) / ps.length, m1 = ps.reduce((a, p) => a + (p.exp[key] ? p.exp[key][1] : e[key][1]), 0) / ps.length; e[key] = [r2(e[key][0] + (m0 - e[key][0]) * Ex.INH), r2(e[key][1] + (m1 - e[key][1]) * Ex.INH)]; }
  e.xp = r2(ps.reduce((a, p) => a + (p.exp.xp || 0), 0) * k * .7); e.sk = r2(ps.reduce((a, p) => a + (p.exp.sk || 0), 0) * k * .7); e.inh = ps.map(p => p.id); e.ih = JSON.parse(JSON.stringify({ mx: e.mx, sx: e.sx, rx: e.rx, tx: e.tx, ex: e.ex, bpm: e.bpm, en: e.en, xp: e.xp, sk: e.sk }));   /* v0.7 save: the inherited share kept apart (frozen at hatch), so v0.8 can tell own vs inherited experience */ if (RS.Teacher) RS.Teacher.inherit(e, ps); Sf.stats.expInherit = (Sf.stats.expInherit || 0) + 1; return e; };
// ---------------- the slow learning tick ----------------
Ex.tick = Sf => { const tn = Sf.now(); if (Sf._exT != null && tn - Sf._exT < Ex.TICK && tn >= Sf._exT) return; const dt = Sf._exT == null || tn < Sf._exT ? Ex.TICK : Math.min(4, tn - Sf._exT); Sf._exT = tn;
  for (const j of Sf.jams || []) { if (!Ex.good(Sf, j)) continue; const L = j.leader.mind; j.en = Ex.jamEn(j); const [hc, hs] = Ex.host(j), ci = Sf.P && Sf.chunkKey ? Sf.chunkKey(Sf.P.chunkOf(Sf.P.theta(j.x, j.y))) : 0;
    for (const c of Sf.creatures) { if (c.dead || !c.mind || (c.jam !== j && c.bystander !== j)) continue; Ex.learn(Sf, c, j, L, ci, dt * (c.jam === j ? 1 : .6) * (c !== hc ? 1 + .8 * hs : 1) * (c.jam === j && c.mind.qGoodT != null && tn - c.mind.qGoodT < Ex.TICK + 2 ? 1.1 : 1)); }   /* v0.8a7 Q.4: a clear bar after a room-making move: +10% */ Ex.growTick(Sf, j, dt); if (RS.Trad) RS.Trad.fuseTick(Sf, j); if (RS.Teacher) RS.Teacher.jamTick(Sf, j); } if (RS.Teacher) RS.Teacher.tick(Sf, dt); };
Ex.learn = (Sf, c, j, L, ci, w) => { if (c._inhP && c.mind) Ex.inheritFrom(Sf, c, c._inhP); const m = c.mind, e = c.exp || (c.exp = Ex.make(c)), k = clamp(w * Ex.RATE * clamp(m.learn, .05, 1.5) * (.4 + (1 - m.stub)), 0, .25);
  const had = e.ex[j.id] || 0; add(e.ex, j.id, k, 6); if (had < .2 && e.ex[j.id] >= .2) { e.jn++; e.ids = e.ids.concat([j.id]).slice(-8); } if (!e.pl.includes(ci)) { e.pl = e.pl.concat([ci]).slice(-12); e.pn++; }
  widen(e.bpm, L.bpm, clamp(k * 3, 0, .5), L.bpm * .08); widen(e.en, j.en, clamp(k * 3, 0, .5), .06); add(e.mx, L.meter, k, 6); add(e.sx, L.sysBase ? L.sysBase.i : 0, k, 6); if (c.jam === j && m.role) add(e.rx, m.role.split(':')[0], k, 6); if (j.E.trad) add(e.tx, j.E.trad, k, 6);
  if (RS.Teacher) { const Te = RS.Teacher; if (!e.hk) Te.born(Sf, c); Te.learned(e, j.E.trad, c.jam === j && m.role ? m.role.split(':')[0] : null); Te.peer(Sf, c, j, k); }   /* v0.8b2 aura (from b6): distinct cultures/roles + jam novelty learning (teacher.js) */
  if (RS.Layers && (!RS.Teacher || RS.Teacher.P.learn)) RS.Layers.learn(Sf, c, j, k);   /* v0.8b6: slowly learning other ohms' sounds (layers.js) */
  e.xp = r2(e.xp + k); e.sk = Math.round((1 - Math.exp(-(Math.min(e.xp, 12) * .04 + e.jn * .15 + e.pn * .1))) * 1000) / 1000;   /* breadth (distinct jams / places) counts more than hours in one jam */ Sf.stats.expLearn = (Sf.stats.expLearn || 0) + 1; };
// ---------------- the fit check (genome defaults, widened by experience and by a skilled host) ----------------
Ex.fit = (Sf, c, j) => { const m = c.mind, e = c.exp, p = Ex.pref(c), a = m.base ? m.base.a : .5, L = j.leader.mind, jb = L.bpm, je = j.en != null ? j.en : Ex.jamEn(j), [hc, hs] = Ex.host(j);
  const T = e ? e.bpm : [p * Ex.T0[0], p * Ex.T0[1]], En = e ? e.en : [a - Ex.E0, a + Ex.E0];
  const gap = (h) => { const lo = T[0] / (1 + .35 * h), hi = T[1] * (1 + .35 * h), el = En[0] - .25 * h, eh = En[1] + .25 * h; return Math.max(0, jb < lo ? Math.log2(lo / jb) : jb > hi ? Math.log2(jb / hi) : 0) + Math.max(0, je < el ? el - je : je > eh ? je - eh : 0); };
  const g0 = gap(0), g1 = gap(hs); return { ok: g1 === 0, gap: r2(g0), bridged: g0 > 0 && g1 === 0 ? hc : null, fam: e ? e.ex[j.id] || 0 : 0 }; };
// a bystander asks in when it fits (now) and the jam has its niche free, or when it has watched this jam long enough to know it
Ex.gate = (Sf, c, j, miss) => { const f = Ex.fit(Sf, c, j); if (!f.ok) { if (c.turned !== j.id) { c.turned = j.id; Sf.stats.expTurned = (Sf.stats.expTurned || 0) + 1; } return { go: false, f }; } return { go: !!miss || f.fam >= Ex.EXPO, by: f.bridged, f }; };
// D2 host: cue the newcomer in at the next phrase, play simpler under it for two phrases, a soft link line (L hint)
Ex.bridge = (Sf, h, c, j) => { if (!h || !c) return; const tn = Sf.now(), L = j.leader.mind, PH = RS.Mind.barLen(L) * 4, rem = (PH - ((L.pos % PH) + PH) % PH) / (L.bpm / 15); h.hostT = tn + rem + 2 * PH / (L.bpm / 15); c.hostedBy = h.id;
  if (RS.Harm) RS.Harm.cue(Sf, h, 'pass', { t: tn + rem, dur: 1.4, dir: Math.sign(c.x - h.x) || 1 }); (Sf.bridges = Sf.bridges || []).push({ a: h, b: c, t: tn, t1: h.hostT }); Sf.stats.bridged = (Sf.stats.bridged || 0) + 1; if (RS.Teacher) RS.Teacher.hosted(h); };
Ex.simpler = (Sf, c, o) => { c._hn = (c._hn || 0) + 1; if (c._hn % 3 === 0) return null; return Object.assign({}, o, { vel: o.vel == null ? o.vel : o.vel * .8 }); };
Ex.pack = e => e ? Object.assign({}, e) : null;
// ---------------- v0.7 D3: ROAM when watched from afar, HOLD when directed. Sf.d3 = -1 (hold) .. 0 (v0.6 stay-home) .. +1 (roam), eased.
// ROAM target: zoomed out (z < ZR) and no touches for IDLE s. HOLD target: focused (z >= ZR), camera still for STILL s and a command
// (a touch that did not move the camera; the baton; the egg) within CMD s. Only ohms in view feel it (J: off screen stays cheap).
Ex.ZR = .8; Ex.IDLE = 6; Ex.STILL = 1.2; Ex.CMD = 18; Ex.EASE = .35;
Ex.mode = (Sf, dt) => { const v = Sf.view; if (!v) return; const tn = Sf.now(), D = Sf.d3s || (Sf.d3s = { px: v.cx, py: v.cy, pz: v.z || 1, still: 0, m: 0 }); if (Sf.baton || Sf.conducted || Sf.wordEgg) Sf.cmdT = tn;
  const z = v.z || 1, mv = Math.hypot(v.cx - D.px, v.cy - D.py) * z + Math.abs(z / D.pz - 1) * 400; D.px = v.cx; D.py = v.cy; D.pz = z; D.still = mv > 1.5 ? 0 : D.still + dt;
  const ct = Sf.cmdT != null ? tn - Sf.cmdT : 1e9, tg = z < Ex.ZR && ct > Ex.IDLE ? 1 : z >= Ex.ZR && D.still > Ex.STILL && ct < Ex.CMD ? -1 : 0, pm = D.m;
  D.m += clamp(tg - D.m, -Ex.EASE * dt, Ex.EASE * dt); Sf.d3 = D.m;
  if (Sf.mods && ((pm < .5 && D.m >= .5) || (pm > -.5 && D.m <= -.5))) { const G = Sf.mods.guide || (Sf.mods.guide = {}), k = D.m > 0 ? 'roamN' : 'holdN'; G[k] = (G[k] || 0) + 1; D.hint = { k, t: tn }; } };   /* L: count mode entries (hints fade) */
Ex.inView = (Sf, c) => { const v = Sf.view; return !!v && !c.lod && c.x > v.x0 && c.x < v.x1 && c.y > v.y0 && c.y < v.y1; };
Ex.roam = (Sf, c) => (Sf.d3 || 0) > 0 && Ex.inView(Sf, c) ? Sf.d3 : 0;
Ex.hold = (Sf, c) => (Sf.d3 || 0) < 0 && Ex.inView(Sf, c) ? -Sf.d3 : 0;
Ex.developed = (Sf, j) => !!j && ((j.loopBars || 4) > 4 || (j.E && j.E.phase === 'settled' && Sf.now() - j.t0 > 40));
// a roaming ohm with nothing to do wanders: a fresh spot within its widened range every 7-14 s (deterministic per ohm)
Ex.wander = (Sf, c, LE) => { const tn = Sf.now(); if (!c.roamGo || tn > c.roamGo.t) { const h = RS.hash(c.id, Math.floor(tn / 7)), a = (h % 1000) / 1000, b = ((h >> 10) % 1000) / 1000; const th = Sf.P ? Sf.P.theta(c.home0[0], c.home0[1]) : 0, dx = (a * 2 - 1) * LE; let x = c.home0[0] + dx, y = c.home0[1]; if (Sf.P) { const p = Sf.P.surf(th + dx / Sf.P.R); x = p[0]; y = p[1]; } if (h % 2 === 0) { let best = null, bd = LE * 2; for (const o of Sf.creatures) { if (o === c || o.dead || o.lod || !o.mind || !Ex.inView(Sf, o)) continue; const d = Math.hypot(o.x - c.x, o.y - c.y); if (d > 200 && d < bd) { bd = d; best = o; } } if (best) { const dx = best.x - c.home0[0], dy = best.y - c.home0[1], dl = Math.hypot(dx, dy) || 1, k = Math.min(1, LE / dl); x = c.home0[0] + dx * k; y = c.home0[1] + dy * k; } }   /* every other refresh: head toward someone seen on screen (mingle / find a jam) */ c.roamGo = { x, y, t: tn + 7 + b * 7 }; } return c.roamGo; };
// L hint for D3 (no text): entering ROAM, a faint dotted ring around each ohm in view swells outward (its range loosens); entering HOLD,
// a soft ring closes in onto each ohm's feet (it settles) while it turns to face you. Fades after ~5 entries of each (mods.guide.roamN / holdN).
Ex.drawMode = (ctx, Sf) => { const D = Sf.d3s, h = D.hint, tn = Sf.now(), u = (tn - h.t) / 2.4; if (u > 1) { D.hint = null; return; } const n = (Sf.mods && Sf.mods.guide && Sf.mods.guide[h.k]) || 1, fa = clamp(1 - (n - 5) / 4, .15, 1) * Math.sin(Math.PI * u), roam = h.k === 'roamN';
  ctx.save(); ctx.lineWidth = 1.4; ctx.setLineDash(roam ? [2, 8] : []); for (const c of Sf.creatures || []) { if (c.dead || !Ex.inView(Sf, c)) continue; const R = RS.Creature.radius(c), r = roam ? R * (1.6 + 3.5 * u) : R * (4 - 2.6 * u); ctx.strokeStyle = (roam ? 'rgba(190,230,255,' : 'rgba(255,235,200,') + (.22 * fa).toFixed(3) + ')'; ctx.beginPath(); if (roam) ctx.arc(c.x, c.y, r, 0, Math.PI * 2); else ctx.ellipse(c.x, c.y + R * .9, r, r * .3, 0, 0, Math.PI * 2); ctx.stroke(); } ctx.restore(); };
// ---------------- seeking: a successful jam within reach of home draws the ohm (the leash still holds) ----------------
Ex.seek = (Sf, c) => { if (c.jam || c.bystander || !c.mind || !c.home0) return null; let best = null, bd = 1e9; for (const j of Sf.jams || []) { if (!Ex.good(Sf, j) || j.members.length >= RS.Jam.MAX || c.avoidJam === j.id) continue; const d = Math.hypot(j.x - c.x, j.y - c.y), dh = Math.hypot(j.x - c.home0[0], j.y - c.home0[1]); if (dh < RS.Jam.LEASH * (1 + 2.2 * Ex.roam(Sf, c)) + 320 && d < bd) { bd = d; best = j; } } return best ? { k: 'jam', x: best.x, y: best.y, stop: 200, mag: .06 } : null; };
// ---------------- L hints: the travel-worn sheen (rings, no text) and the bridging link line ----------------
Ex.sheen = (ctx, c, R, tn) => { const s = Ex.sk(c); if (s < .05) return; const n = 1 + Math.min(3, Math.floor(s * 4)); ctx.save(); ctx.lineWidth = 1.1; for (let i = 0; i < n; i++) { const a0 = tn * .35 + i * 2.1 + (c.id.length || 0), h = (a0 * 40 + i * 70) % 360; ctx.strokeStyle = 'hsla(' + h.toFixed(0) + ',70%,78%,' + (.07 + .16 * s).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(c.x, c.y, R * (1.12 + i * .1), a0, a0 + .9 + s * 1.4); ctx.stroke(); } ctx.restore(); };
Ex.draw = (ctx, Sf) => { const tn = Sf.now(); Sf.bridges = (Sf.bridges || []).filter(b => tn < b.t1 && !b.a.dead && !b.b.dead && b.b.jam); for (const j of Sf.jams || []) { Ex.drawGrow(ctx, Sf, j); if (RS.Trad) RS.Trad.draw(ctx, Sf, j); } for (const b of Sf.bridges) { const f = clamp(Math.min(tn - b.t, b.t1 - tn) / 1.5, 0, 1), p = .5 + .5 * Math.sin(tn * 3); ctx.save(); ctx.strokeStyle = 'rgba(255,240,210,' + (.12 + .1 * p) * f + ')'; ctx.lineWidth = 2; ctx.setLineDash([3, 7]); ctx.lineDashOffset = -tn * 14; ctx.beginPath(); ctx.moveTo(b.a.x, b.a.y); ctx.quadraticCurveTo((b.a.x + b.b.x) / 2, Math.min(b.a.y, b.b.y) - 40, b.b.x, b.b.y); ctx.stroke(); ctx.restore(); } };
// ---------------- v0.7 E: WATCHED JAMS GROW. Attention (the player keeps the jam centred) + every playing member matched (key + time, muted
// members don't count) -> the shared loop grows in phrase steps 4 -> 8 -> 16 bars. The proven loop is KEPT inside the longer one
// (A -> A A' -> A A' B A'); the new part is an exploration on trial: kept ("what works") if the jam keeps scoring, reverted if not.
// Parts get a little richer per level (phrase-end fills, drum rolls, a call-and-response echo). No composer: the proposer just follows the
// jam's agreed form. On screen only (J): attention needs the jam centred in view; the slow 2 s tick does the bookkeeping.
Ex.GATT = 16; Ex.GMAX = 2; Ex.GTRIAL = 8;
Ex.VARY = { IV: 'ii', ii: 'IV', vi: 'iii', iii: 'vi', V: 'V/V', I: 'vi' };
Ex.vary = (sec, hb, n) => { const p = sec.slice(); for (const i of [3, 2]) { const id = p[i], alt = /^d\d+$/.test(id) ? 'd' + ((+id.slice(1) + 2) % n) : Ex.VARY[id]; if (alt && hb && hb.V[alt] && !(alt === 'V/V' && i === 3)) { p[i] = alt; return p; } } const t = p[2]; p[2] = p[3]; p[3] = t; return p; };
Ex.growTick = (Sf, j, dt) => { const E = j.E; if (!E || !E.song) return; const G = E.grow || (E.grow = { lvl: 0, form: null, fi: -1, works: [], att: 0, trial: null, keep: 0, rev: 0 }); j.loopBars = G.form ? G.form.length * 4 : 4;
  if (!RS.Jam || !RS.Jam.watched(Sf, j.leader)) return;   /* looking away pauses growth; nothing is erased */
  G.att += dt; Sf.stats.growAtt = (Sf.stats.growAtt || 0) + dt; if (G.trial || G.lvl >= Ex.GMAX || E.phase !== 'settled' || (E.matchBars || 0) < 4 || G.att < Ex.GATT) return; G.att = 0; Ex.growUp(Sf, j, E, G); };
Ex.growUp = (Sf, j, E, G) => { const S = E.song, P0 = (G.form ? G.form[0] : S.cur) || 'A', P = P0.replace(/'+$/, ''), P2 = P + "'", pm = (E.prop || j.leader).mind, hb = pm.hb, prev = G.form ? G.form.slice() : [P];
  if (!S.secs[P]) return; if (!S.secs[P2]) S.secs[P2] = Ex.vary(S.secs[P], hb, (E.sys || pm.sys).cents.length);
  let add; if (G.lvl === 0) { G.form = [P, P2]; add = [P2]; } else { let Q = Object.keys(S.secs).find(k => !/'/.test(k) && k !== P && k !== 'K'); if (!Q && RS.Harm.section) { Q = P === 'A' ? 'B' : 'A'; S.secs[Q] = RS.Harm.section(pm, Q, RS.rng(RS.hash('grow', S.seed, Q))); } if (!Q) return; G.form = [P, P2, Q, P2]; add = [Q]; }
  G.lvl++; G.fi = G.form.indexOf(S.cur); G.trial = { prev, add, bars: 0, sum: 0, bad: 0 }; j.loopBars = G.form.length * 4; G.t = Sf.now();
  if (!G.works.includes(P)) G.works.push(P); Sf.stats.growUp = (Sf.stats.growUp || 0) + 1; if (Sf.mods) { const Gd = Sf.mods.guide || (Sf.mods.guide = {}); Gd.growN = (Gd.growN || 0) + 1; }
  (Sf.mindLog || []).push({ t: Sf.now(), k: 'grow', E: E.id, lvl: G.lvl, form: G.form.join(' ') }); };
// per bar (from Harm.barE, after the groove score): judge an exploration while it is being played
Ex.growBar = (Sf, E, sc, all) => { const G = E.grow, T = G && G.trial; if (!T) return; const cur = E.song && E.song.cur; if (E.phase !== 'settled') return Ex.growRevert(Sf, E, G, 'unsettled'); if (!T.add.includes(cur)) return;
  T.bars++; T.sum += sc; if (!all) T.bad++; if (T.bars < Ex.GTRIAL) return; if (T.sum / T.bars >= RS.Harm.DROP + .07 && T.bad <= 2) { for (const a of T.add) if (!G.works.includes(a)) G.works.push(a); G.trial = null; G.keep++; Sf.stats.growKeep = (Sf.stats.growKeep || 0) + 1;
    const j = (Sf.jams || []).find(q => q.E === E); if (j) { const L = j.leader.mind; for (const c of j.members) if (!c.muted && c.mind) Ex.learn(Sf, c, j, L, 0, 4); } }   /* growth counts as experience (D) */
  else Ex.growRevert(Sf, E, G, 'score'); };
Ex.growRevert = (Sf, E, G, why) => { const T = G.trial; if (!T) return; G.form = T.prev.length > 1 ? T.prev : null; G.lvl = Math.max(0, G.lvl - 1); G.trial = null; G.rev++; G.att = 0; if (E.song && T.add.includes(E.song.cur)) E.song.cur = (G.form || T.prev)[0]; G.fi = G.form ? G.form.indexOf(E.song.cur) : -1; Sf.stats.growRevert = (Sf.stats.growRevert || 0) + 1; (Sf.mindLog || []).push({ t: Sf.now(), k: 'growRevert', E: E.id, why }); };
// the proposer follows the agreed form at phrase boundaries (called from Harm.propose); null = the usual A/B behaviour
Ex.growNext = E => { const G = E.grow; if (!G || !G.form || G.form.length < 2) return null; G.fi = (G.fi + 1) % G.form.length; return G.form[G.fi]; };
// richer parts per level (always in the scale; late binding still fits them to the chord): phrase-end fills / rolls, a soft echo answer
Ex.growNotes = (Sf, m, bar, out) => { const G = m.E && m.E.grow, c = m.c; if (!G || !G.lvl || !out || !out.length || !c || c.muted || m.role === 'listen') return out; const L = RS.Mind.barLen(m), b4 = ((bar % 4) + 4) % 4, r = RS.rng(RS.hash('gn', c.id, bar));
  if (b4 === 3 && r() < .7) { if (m.perc > .55) { for (let s = L - 2; s < L; s += .5) if (!out.some(q => Math.abs(q.s - s) < .2)) out.push({ s, d: .5, perc: true, vel: .25 + (s - L + 2) * .12, fill: true }); }
    else if (!/bass/.test(m.role || '')) { const last = out.filter(q => q.deg != null && !q.perc).pop(); if (last) { const dir = r() < .5 ? 1 : -1; for (let k = 1; k <= 2; k++) { const s = L - 3 + k; if (s > last.s && !out.some(q => Math.abs(q.s - s) < .4)) out.push({ s, d: .9, deg: last.deg + dir * k, vel: (last.vel || .5) * .7, fill: true }); } } } }
  if (G.lvl >= 2 && b4 % 2 === 1 && /lead|melody|solo|answer/.test(m.role || '')) { const head = out.filter(q => q.deg != null && !q.perc && q.s < L / 2).slice(0, 2); for (const q of head) { const s = q.s + L / 2; if (!out.some(o => Math.abs(o.s - s) < .4)) out.push(Object.assign({}, q, { s, deg: q.deg - 2, vel: (q.vel || .5) * .6, echo: true })); } }
  Sf.stats.growNotes = (Sf.stats.growNotes || 0) + 1; return out; };
// L hint: the loop ring around a watched jam - one arc per 4-bar section; proven sections solid, the one on trial dotted, the one playing lit.
// The ring lengthens as the loop grows (a quarter turn per section) and the old segment stays marked. Fades after ~5 growths (mods.guide.growN).
Ex.drawGrow = (ctx, Sf, j) => { const G = j.E && j.E.grow; if (!G || !Ex.inView(Sf, j.leader)) return; const form = G.form || [j.E.song ? j.E.song.cur : 'A'], cur = j.E.song && j.E.song.cur, n = form.length, tn = Sf.now(), [x, y] = RS.Jam.center(j), R = 46 + 14 * Math.sqrt(j.members.length), used = (Sf.mods && Sf.mods.guide && Sf.mods.guide.growN) || 0, fa = Math.max(.3, 1 - Math.max(0, used - 5) / 6), lit = G.t ? clamp(1 - (tn - G.t) / 6, 0, 1) : 0;
  ctx.save(); ctx.lineWidth = 2.2; const a0 = -Math.PI / 2, seg = Math.PI / 2; for (let i = 0; i < n; i++) { const id = form[i], proven = G.works.includes(id) && !(G.trial && G.trial.add.includes(id)), on = id === cur && (G.fi === i || n === 1); ctx.setLineDash(proven ? [] : [4, 6]); ctx.strokeStyle = 'rgba(255,236,200,' + ((on ? .34 : proven ? .2 : .13) + .25 * lit) * fa + ')'; ctx.beginPath(); ctx.arc(x, y, R, a0 + i * seg + .05, a0 + (i + 1) * seg - .05); ctx.stroke(); }
  if (G.att > 0 && !G.trial && G.lvl < Ex.GMAX) { ctx.setLineDash([]); ctx.strokeStyle = 'rgba(255,236,200,' + .08 * fa + ')'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y, R + 6, a0, a0 + n * seg * clamp(G.att / Ex.GATT, 0, 1)); ctx.stroke(); }   /* attention filling */
  ctx.restore(); };
})(typeof window !== 'undefined' ? window : globalThis);
