// v0.8b6 TEACHER: the teacher level (TEACHER_AURA.md sections 1-5), the new experience fields, jam novelty learning (DECISIONS 4:28 / 4:32 PM),
// lineage, the gift gene and wild teachers. No play effect: the level only feeds the aura (aura.js) and later the spoken titles (b7).
// Off-screen cost: every hook is a counter bump inside existing 2 s / event paths; the level is only computed for ohms on screen or on demand.
(function (G) {
const RS = G.RS, Te = RS.Teacher = {}; RS.WorldLook = RS.WorldLook || {};
// one parameter object (TEACHER_AURA section 6): RS.WorldLook.teacherAura === RS.Teacher.P (aura.js adds the look params)
Te.P = RS.WorldLook.teacherAura = {
  on: 1, paceScale: 1,
  ladder: [3, 12, 50, 200, 750],                 // measure values for lambda 1..5 (lam(M) = M<3 ? M/3 : 1+log4(M/3))
  w: { jl: 2, pxp: 1, at: 6, wn: 6, gal: 60, tn: 6, tx: 2, rn: 5, rx: 1, st: 5, hn: 2, fu: 20 },
  /* v0.8b2 (Wilbow 8:57 PM: 'any ohm can be teacher with enough experience and its not only a title but a gradient scale'): no teacher
     title or flag. Teaching is Te.teach(c) in 0..1, read from the level (= experience); the tiers are only named points on it. */
  teachFull: 5,                                  // level at which teaching reaches 1 (master); teach = clamp(level / teachFull, 0, 1)
  allTeach: .6,                                  // the rare 'every member teaches well' jam: every member's teach >= .6 (= level 3)
  teachW: .5,                                    // what a member passes on in a jam scales with (teachW + its teach): a new ohm still teaches a little
  giftTeach: .15,                                // v0.8b6: a gifted birth starts this far up the teaching scale (still a gradient: gifted = .15 + .85 * teach)
  tchLink: .25,                                  // v0.8b6: an ohm's own teacher (student link) teaches it a little better: t + (1 - t) * .25
  learn: 1,                                      // jam novelty learning on/off (tests can switch it off)
  novK: .5,                                      // novelty gain scale: extra xp = k * novelty * (1 + own level) * novK  (uncapped)
  linkMin: .5,                                   // novelty one ohm brings another that counts as a teacher->student link
  ease: 20,                                      // s for the shown level to reach its target
  wildSame: .03, wildOther: .08, wildHops: 3,    // wild teacher odds per world (same galaxy >= 3 systems from home / another galaxy)
  giftBase: .001, giftGene: .009                 // P(gifted) = .001 + .009 * g^8  (~1 in 500 on average)
};
Te.ROLES = ['bass', 'melody', 'comp', 'harmony', 'counter', 'answer', 'drone', 'listen', 'pulse', 'lead', 'pad', 'solo', 'fill', 'call'];
const log4 = Math.log(4), lam = M => { M /= (Te.P.paceScale || 1); return M <= 0 ? 0 : M < 3 ? M / 3 : 1 + Math.log(M / 3) / log4; }; Te.lam = lam;
const pop = x => { let n = 0; x = x >>> 0; while (x) { x &= x - 1; n++; } return n; };
const real = () => (RS.Styles && RS.Styles.REAL) || [];
const ex = c => c && c.exp;
// ---------------- the six measures + level (section 1.2 / 1.3) ----------------
Te.measures = e => { const w = Te.P.w, sum = o => { let s = 0; for (const k in o || {}) if (typeof o[k] === 'number') s += o[k]; return s; };
  return { J: (e.jn || 0) + w.jl * (e.jl || 0) + w.pxp * (e.pxp || 0) + w.at * (e.at || 0), P: (e.pn || 0) + w.wn * (e.wn || 0) + w.gal * Math.max(0, (e.gn || 1) - 1),
    C: w.tn * (e.tn || 0) + w.tx * sum(e.tx), R: w.rn * (e.rn || 0) + w.rx * sum(e.rx), S: w.st * (e.st || 0) + w.hn * (e.hn || 0), F: w.fu * (e.fu || 0) }; };
Te.layers = e => { const M = Te.measures(e), o = {}; for (const k in M) o[k] = lam(M[k]); return o; };
Te.target = e => { if (!e) return 0; const L = Te.layers(e); let cap = Infinity; const n2 = Object.values(L).filter(v => v >= 2).length, n3 = Object.values(L).filter(v => v >= 3).length;
  if (n2 < 3) cap = 3.95; else if (!(n3 >= 4 && L.S >= 3.5 && ((e.gn || 1) >= 2 || e.wild))) cap = 4.95;
  let v = Math.min(L.J, cap); if (e.wild && e.wildL) v = Math.max(v, e.wildL); return v; };
Te.level = c => { const e = ex(c); if (!e) return 0; return c._auL != null ? c._auL : Te.target(e); };
Te.tier = L => L < 1 ? 'none' : L < 2 ? 'flicker' : L < 3 ? 'forming' : L < 4 ? 'clear' : L < 5 ? 'extreme' : 'master';
/* teaching ability: one continuous value from experience (no stored flag, so old saves load unchanged; a b6 save's flag-free record reads the same) */
Te.teachL = L => Math.max(0, Math.min(1, L / (Te.P.teachFull || 5)));
Te.teach = c => Te.teachL(Te.level(c));
Te.teachE = e => e ? Te.teachL(Te.target(e)) : 0;
// v0.8b6 on top of the 0.8b2 gradient: gifted births start higher; how strongly o teaches the ohm whose experience is e (layer learning,
// kit growth) reads o's TRUE level (an off-screen ohm's eased aura level can be stale), plus a little more from its own teachers (student links).
{ const t0 = Te.teach; Te.gift = (c, t) => c && Te.gifted && Te.gifted(c) ? Te.P.giftTeach + (1 - Te.P.giftTeach) * t : t;
  Te.teach = c => Te.gift(c, t0(c)); }
Te.teachOf = (e, o) => { if (!o) return 0; const t = Te.gift(o, o.exp ? Te.teachE(o.exp) : 0); return e && e.tch && e.tch.includes(o.id) ? t + (1 - t) * Te.P.tchLink : t; };
// learning speed multiplier from a teacher's strength: 1 (no teaching) .. x (the strongest teacher), smooth in between
Te.teachX = (t, x) => 1 + (x - 1) * Math.max(0, Math.min(1, t || 0));
// combos (section 2.2)
Te.combos = e => { const L = Te.layers(e), o = [];
  if ((e.gn || 1) >= 3 && L.P >= 4.5 && L.C >= 4) o.push('starRoad'); if (L.S >= 4.5 && (e.sm || 0) >= 5) o.push('orchard'); if (L.F >= 4.5 && L.C >= 4.5 && (e.tn || 0) >= 6) o.push('prism');
  if (L.R >= 3.5 && L.J >= 3) { const G2 = new Set(Object.keys(e.mx || {}).filter(m => (e.mx[m] || 0) > .05).map(m => { const M = RS.Mind && RS.Mind.METERS && RS.Mind.METERS[m]; return M ? M.length : m; })); if (G2.size >= 3) o.push('polymeter'); }
  const top = o2 => { let b = null, bv = -1; for (const k in o2 || {}) if (o2[k] > bv) { bv = o2[k]; b = k; } return b; };
  if (Te.target(e) >= 4 && (e.jl || 0) / Math.max(1, e.jn || 0) < .05 && /^(drone|listen)$/.test(top(e.rx) || '')) o.push('quiet');
  if ((e.hn || 0) >= 150 && L.F >= 3) o.push('bridge'); return o; };
// ---------------- the new fields (section 5) ----------------
Te.led = c => { if (c && !c.exp && c.mind && RS.Exp) c.exp = RS.Exp.make(c); const e = ex(c); if (e) e.jl = (e.jl || 0) + 1; };   /* the leader may not have learned yet */
Te.fused = c => { const e = ex(c); if (e) e.fu = (e.fu || 0) + 1; };
Te.hosted = h => { const e = ex(h); if (e) e.hn = (e.hn || 0) + 1; };
// worlds: a 32-entry recent set of world keys; the first world (birth) is home and does not count. Galaxies: a set of useeds.
Te.visit = (c, key, useed) => { const e = ex(c); if (!e || key == null) return; if (!e.hk) e.hk = key; const W = e.wv || (e.wv = [e.hk]); if (!W.includes(key)) { W.push(key); if (W.length > 32) W.shift(); e.wn = (e.wn || 0) + 1; }
  if (useed != null) { const L = e.gl || (e.gl = [useed]); if (!L.includes(useed)) { L.push(useed); if (L.length > 16) L.shift(); e.gn = (e.gn || 1) + 1; } if (!e.gn) e.gn = 1; } };
Te.born = (Sf, c) => { if (c && c.exp && Sf) Te.visit(c, Sf.key, Sf.useed); };
// cultures / roles distinct counts (bitsets for the real traditions + the role list; a short list for generated cultures)
Te.learned = (e, trad, role) => { if (trad) { const i = real().indexOf(trad); if (i >= 0) { const b = 1 << i; if (!((e.tb || 0) & b)) { e.tb = (e.tb || 0) | b; e.tn = pop(e.tb) + (e.tg ? e.tg.length : 0); } } else if (/^g:/.test(trad)) { const L = e.tg || (e.tg = []); if (!L.includes(trad) && L.length < 16) { L.push(trad); e.tn = pop(e.tb || 0) + L.length; } } }
  if (role) { let i = Te.ROLES.indexOf(role); if (i < 0) i = 15 + (RS.hash('role', role) % 16); const b = 1 << i; if (!((e.rb || 0) & b)) { e.rb = (e.rb || 0) | b; e.rn = pop(e.rb); } } };
// a student link a -> b (distinct students by a 64-slot hash bitset, last 8 ids); b remembers its teachers (last 4) for back-links (sm)
Te.student = (Sf, a, b) => { const e = ex(a), f = ex(b); if (!e || !f || a === b) return false; const h = RS.hash('stu', b.id) % 64, w = h >> 5, bit = 1 << (h & 31), S = e.sb || (e.sb = [0, 0]); if (S[w] & bit) return false;
  S[w] |= bit; e.st = (e.st || 0) + 1; e.su = (e.su || []).concat([b.id]).slice(-8); f.tch = (f.tch || []).filter(id => id !== a.id).concat([a.id]).slice(-4); if (Sf && Sf.stats) Sf.stats.teachLink = (Sf.stats.teachLink || 0) + 1; return true; };
// sm: when a student first reaches level 3, every teacher it remembers (on this world) gets +1
Te.grown = (Sf, c) => { const f = ex(c); if (!f || f.sg || !f.tch || Te.target(f) < 3) return; f.sg = 1; for (const id of f.tch) { const t = Sf.creatures.find(o => o.id === id && o.exp); if (t) t.exp.sm = (t.exp.sm || 0) + 1; } };
// lineage (section 3): a master (level >= 5) who teaches gives its sigil; inherited sigils pass gen+1, gone after gen 3, max 2
Te.sigil = (a, gen) => { const e = ex(a), tx = e && e.tx || {}; let t = null, v = -1; for (const k in tx) if (tx[k] > v) { v = tx[k]; t = k; } const hue = RS.Trad && RS.Trad.hue ? RS.Trad.hue(t || 'western') : 200;
  return { id: a.id, seed: RS.hash('aura', a.id) >>> 0, hue, N1: 5 + (RS.hash('n1', a.id) % 4), gen: gen || 1 }; };
Te.giveSigil = (e, s) => { if (!e || !s || s.gen > 3) return; const L = (e.lm || []).filter(x => x.id !== s.id); L.push(s); L.sort((p, q) => p.gen - q.gen); e.lm = L.slice(0, 2); };
Te.taught = (Sf, a, b) => { if (!a.exp || !b) return; if (!b.exp && b.mind && RS.Exp) b.exp = RS.Exp.make(b); Te.student(Sf, a, b); if (Te.target(a.exp) >= 5) Te.giveSigil(b.exp, Te.sigil(a, 1)); };
Te.inherit = (e, ps) => { for (const p of ps || []) for (const s of (p.exp && p.exp.lm) || []) if (s.gen < 3) Te.giveSigil(e, Object.assign({}, s, { gen: s.gen + 1 })); };
// gift (section 4): gene 240; read lazily from the id + gene so no save field is needed
Te.gifted = c => { if (!c) return false; if (c._gift != null) return c._gift; const g = c.g && c.g.length > 240 ? c.g[240] : 0, u = ((RS.hash(c.id, 'gift') >>> 0) % 100000) / 100000;
  return (c._gift = u < Te.P.giftBase + Te.P.giftGene * Math.pow(g, 8)); };
// ---------------- jam novelty learning (DECISIONS 4:28 / 4:32 PM) ----------------
// Every member (teachers too) gains in proportion to what the others know that it doesn't: traditions, scales, meters, roles, tempo range.
// The gain is scaled to its own level (1 + level) and never capped; the others' unknown keys seed into its own maps; links run both ways.
const known = (o, min) => { const s = []; for (const k in o || {}) if (o[k] >= min) s.push(k); return s; };
Te.novelty = (e, f) => { let n = 0; const gain = [];
  for (const key of ['tx', 'sx', 'mx', 'rx']) { const theirs = known(f[key], .2); if (!theirs.length) continue; let u = 0; for (const q of theirs) if (!((e[key] || {})[q] >= .05)) { u++; gain.push([key, q]); } n += u / Math.max(4, theirs.length); }
  const a = e.bpm, b = f.bpm; if (a && b && b[1] > b[0]) { const lo = Math.max(a[0], b[0]), hi = Math.min(a[1], b[1]), wb = Math.log2(b[1] / b[0]) || 1e-3, ov = hi > lo ? Math.log2(hi / lo) : 0; n += Math.max(0, 1 - ov / wb) * .5; }
  return { n, gain }; };
Te.peer = (Sf, c, j, k) => { if (!Te.P.on || !Te.P.learn || !j || c.jam !== j || !c.exp || !(k > 0)) return 0; const e = c.exp, own = Te.target(e); let tot = 0;
  for (const o of j.members) { if (o === c || !o.exp || o.dead) continue; const { n, gain } = Te.novelty(e, o.exp); if (n <= 0) continue; const tw = Te.teachE(o.exp); tot += n * (Te.P.teachW + tw);   /* a better teacher passes on more */
    for (const [key, q] of gain) { const m = e[key] || (e[key] = {}); m[q] = Math.min(6, Math.round(((m[q] || 0) + k * .5 * Math.min(1, n)) * 1000) / 1000); if (key === 'tx' || key === 'rx') Te.learned(e, key === 'tx' ? q : null, key === 'rx' ? q : null); }
    if (n >= Te.P.linkMin) Te.student(Sf, o, c); }   /* no title gate: any ohm that taught c enough that was new to it gains c as a student (how much it passed on rose with its teach) */
  if (tot <= 0) return 0; const g = k * tot * (1 + own) * Te.P.novK; e.pxp = Math.round(((e.pxp || 0) + g) * 1000) / 1000; e.xp = Math.round(((e.xp || 0) + g) * 100) / 100; Sf.stats.peerLearn = (Sf.stats.peerLearn || 0) + 1; return g; };
// all-teach jam (a rare experience kind; its woven look waits): every member teaches well (teach >= allTeach) -> once per jam, each gets at += 1
Te.jamTick = (Sf, j) => { if (!Te.P.on || !j || j._atDone || !j.members || j.members.length < 2) return false; for (const c of j.members) if (!c.exp || Te.teach(c) < Te.P.allTeach) return false;
  j._atDone = 1; for (const c of j.members) c.exp.at = (c.exp.at || 0) + 1; Sf.stats.allTeach = (Sf.stats.allTeach || 0) + 1; (Sf.mindLog || (Sf.mindLog = [])).push({ t: Sf.now(), k: 'allTeach', j: j.id, n: j.members.length }); return true; };
// shown level: eased toward the target over ~20 s; only for ohms the aura draws (on screen) - called from the 2 s tick with dt
Te.ease = (c, dt) => { const e = ex(c); if (!e) return 0; const t = Te.target(e); if (c._auL == null) c._auL = t; else c._auL += (t - c._auL) * Math.min(1, dt / Te.P.ease); if (Math.abs(t - c._auL) < .01) c._auL = t; return c._auL; };
Te.tick = (Sf, dt) => { if (!Te.P.on || !Sf.view) return; for (const c of Sf.creatures) { if (c.wildT && c.mind && !(c.exp && c.exp.wild) && RS.Exp) { if (!c.exp) c.exp = RS.Exp.make(c); Te.wake(Sf, c); } if (c.dead || !c.exp) continue; if (!Sf.inView(c.x, c.y, 600)) { c._auL = null; continue; } Te.ease(c, dt); Te.grown(Sf, c); if (RS.Aura) RS.Aura.keyTick(c); } };
// ---------------- wild teachers (section 4) ----------------
// u = hash(useed, sys, body, 'wild'); a world far from home (>= 3 systems, same galaxy) gets one at 3%, another galaxy 8%; never home systems.
Te.wildOdds = (o) => { if (!o || !o.home) return 0; if (o.useed !== o.home.u) return Te.P.wildOther; return (o.hops || 0) >= Te.P.wildHops ? Te.P.wildSame : 0; };
Te.wildRoll = (o) => { const p = Te.wildOdds(o); if (!p) return null; const u = ((RS.hash(o.useed, o.sys, o.body, 'wild') >>> 0) % 1e6) / 1e6; if (u >= p) return null; const u2 = Math.max(1e-6, ((RS.hash(o.useed, o.sys, o.body, 'wild2') >>> 0) % 1e6) / 1e6); return 3 + (-Math.log(u2)) / 1.2; };
// a wild teacher's experience: drawn from its level so its layers read as a long life (many jams, places, cultures)
Te.wildExp = (e, L, seed) => { const r = RS.rng(seed >>> 0), Mof = l => 3 * Math.pow(4, l - 1), M = Mof(L);
  e.jn = Math.round(M * .6); e.jl = Math.round(M * .2); e.pn = Math.round(Mof(L - .3 - r() * .5)); e.wn = Math.round(Mof(L - .5) / 12); e.gn = 1 + (r() < .5 ? 1 : 0); e.gl = e.gl || [];
  const R = real().filter(t => t !== 'overtone'), nt = Math.min(R.length, 3 + Math.floor(r() * 6)); for (let i = 0; i < nt; i++) { const t = R[Math.floor(r() * R.length)]; e.tx[t] = Math.round((1 + r() * 5) * 100) / 100; Te.learned(e, t, null); }
  const nr = 4 + Math.floor(r() * 5); for (let i = 0; i < nr; i++) { const q = Te.ROLES[Math.floor(r() * 9)]; e.rx[q] = Math.round((1 + r() * 4) * 100) / 100; Te.learned(e, null, q); }
  e.st = Math.round(Mof(L - .2) / 7); e.hn = Math.round(Mof(L - .4) / 3); e.fu = Math.round(Mof(L - 1 - r()) / 20); e.xp = Math.round(M * .3); e.sk = .9; e.wild = 1; e.wildL = Math.round(L * 100) / 100; return e; };
Te.wildSeed = (Sf, o) => { if (!Te.P.on || !Sf || Sf.creatures.some(c => c.exp && c.exp.wild)) return null; const L = Te.wildRoll(o); if (L == null) return null;
  const seed = RS.hash(o.useed, o.sys, o.body, 'wildg') >>> 0, g = RS.Genome.random(seed), x = ((seed % 1000) / 1000 - .5) * 1400; const c = Sf.addCreature(g, x, (Sf.ground ? Sf.ground(x) : 0) - 40, { distinct: true, growth: 1 }); if (!c) return null;
  c.wildT = 1; c._wildL = L; Sf.stats.wildTeacher = (Sf.stats.wildTeacher || 0) + 1; return c; };
// the exp record appears when the mind wakes: fill it then (called from Ex.make's first use via Te.wake)
Te.wake = (Sf, c) => { if (!c.wildT || !c.exp || c.exp.wild) return; Te.wildExp(c.exp, c._wildL || 3, RS.hash('wexp', c.id)); };
})(typeof window !== 'undefined' ? window : globalThis);
