'use strict';
// Colony relations: alliance, merging, and musical duels by call-and-response (callbacks that quote and transform the previous phrase).
(function (G) {
const RS = G.RS, C = RS.Creature, K = RS.Colony;
const D = RS.Duel = { log: [] };
D.idiom = cl => { const L = cl.members[0], P = L.P; const k = Math.round(P.beh.rhythm * 3), base = [[0, 4, 8, 12], [0, 3, 8, 11], [0, 6, 8, 14], [0, 2, 4, 10]][k]; const sync = P.syncop > .6 ? 1 : 0;
  return { key: L.keyC, tempo: L.tempo, motif: (() => { const m = (cl.motif || L.motif).filter(x => x != null).slice(0, 4); return m.length >= 2 ? m : [0, 2, 4, 2]; })(), cell: base.map((s, i) => (s + (i % 2 ? sync : 0)) % 16) }; };
D.compat = (a, b) => C.compat(a.members[0], b.members[0]);
D.tick = (Sf, dt) => { D.t = (D.t || 0) + dt; if (D.t < 2) return; D.t = 0; const cls = Sf.clusters.filter(c => c.members.length >= 2);
  for (let i = 0; i < cls.length; i++) for (let j = i + 1; j < cls.length; j++) { const a = cls[i], b = cls[j]; const d = Math.hypot(a.x - b.x, a.y - b.y); if (d > 320 || a.duel || b.duel) continue;
    if (D.compat(a, b).ok) { if (!a.allies || !a.allies.includes(b)) { (a.allies = a.allies || []).push(b); (b.allies = b.allies || []).push(a); Sf.fx({ k: 'ally', a, b, t: Sf.now(), dur: 1.5 }); Sf.stats.allies = (Sf.stats.allies || 0) + 1;
        // co-build: b adopts a's plan near a (a larger shared structure)
        if (a.plan && b.plan !== a.plan) { b.plan = a.plan; b.step = a.step; b.style = a.style; } b.members[0].phase = a.members[0].phase; } continue; }
    const contested = d < 200 || (Sf.brightSpot && (() => { const s = Sf.brightSpot(); return s && Math.hypot(s[0] - a.x, s[1] - a.y) < 160 && Math.hypot(s[0] - b.x, s[1] - b.y) < 160; })());
    if (contested) D.start(Sf, a, b); } };
D.start = (Sf, a, b) => { const du = { a, b, turn: 0, n: 0, max: 4 + Math.floor((a.members.length + b.members.length) % 5), score: [0, 0], esc: 0, last: null, quotes: [], t0: Sf.now(), nextBar: null };
  a.duel = b.duel = du; Sf.duels.push(du); Sf.fx({ k: 'duelStart', a, b, t: Sf.now(), dur: 1.2 }); Sf.stats.duels = (Sf.stats.duels || 0) + 1; return du; };
// phrase helpers
D.phrase = (id, esc, r) => { const notes = id.cell.map((s, i) => ({ s, deg: id.motif[i % id.motif.length] + (esc > 2 ? 2 : 0) })); if (esc >= 2) notes.push({ s: (id.cell[3] + 2) % 16, deg: id.motif[0] + 4 }); return notes; };
const ivs = ph => ph.slice(1).map((n, i) => n.deg - ph[i].deg);
// callback: quote the call's intervals and rhythm cell, re-rooted on the answerer's motif start, one variation, escalation
D.answer = (call, id, esc, seed) => { const r = RS.rng(seed), iv = ivs(call); let deg = id.motif[0]; const out = [{ s: call[0].s, deg }]; for (let k = 0; k < iv.length; k++) { deg += iv[k]; out.push({ s: call[k + 1].s, deg }); }
  const v = 1 + r.int(0, out.length - 2); out[v].deg += r() < .5 ? 1 : -1;   // one variation
  if (esc >= 1) out.forEach(n => n.deg += esc >= 3 ? 7 : 0);   // register push at the climax
  if (esc >= 2 && out.length < 7) out.push({ s: (out[out.length - 1].s + 1) % 16, deg: out[out.length - 1].deg + 1 });   // denser
  return out; };
D.overlap = (call, ans) => { const a = ivs(call), b = ivs(ans); let same = 0; for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] === b[i]) same++; let rs = 0; for (const n of ans) if (call.some(m => m.s === n.s)) rs++; return { iv: same / Math.max(1, Math.min(a.length, b.length)), rhythm: rs / ans.length }; };
D.scoreOf = (Sf, cl, ph) => { const M = Sf.M, n = M.S().c.length; let ct = 0; for (const x of ph) { const k = ((x.deg % n) + n) % n; if (k === 0 || k === 2 || k === 4) ct++; } const energy = cl.members.reduce((s, m) => s + m.energy * (.5 + (m.light || 0)), 0) / cl.members.length;
  return ct / ph.length * .35 + energy * .35 + Math.min(1, cl.members.length / 4) * .2 + RS.rng(RS.hash(cl.id, Sf.now()))() * .1; };
// called every bar from the surface clock: alternate call / answer; schedule notes on the 16th grid of that bar
D.onBar = (Sf, barT) => { for (const du of Sf.duels.slice()) { if (du.done) continue; const who = du.turn % 2 === 0 ? du.a : du.b, other = who === du.a ? du.b : du.a, id = D.idiom(who);
    let ph; if (!du.last) ph = D.phrase(id, du.esc); else { ph = D.answer(du.last, id, du.esc, RS.hash(du.n, who.id)); const ov = D.overlap(du.last, ph); du.quotes.push(ov); }
    const dt16 = Sf.M.dt16(), lead = who.members[0]; ph.forEach((nt, k) => { const when = barT + nt.s * dt16 * (1 - du.esc * .03); C.sing(Sf, lead, nt.deg, when, { gain: .9 + du.esc * .15 }); if (du.esc >= 3 && k === 0) K.sing(Sf, who, when); });
    Sf.fx({ k: 'duelWave', from: who, to: other, t: barT, dur: Sf.M.barDur(), esc: du.esc }); du.score[du.turn % 2] += D.scoreOf(Sf, who, ph); du.last = ph; du.n++; du.turn++; if (du.n % 2 === 0) du.esc = Math.min(3, du.esc + 1);
    for (const m of who.members) C.impulse(Sf, m, (other.x - who.x) * .4, -30);   // lean toward each other
    if (du.n >= du.max) D.resolve(Sf, du); } };
D.resolve = (Sf, du) => { du.done = true; const [sa, sb] = du.score, diff = (sa - sb) / Math.max(.01, (sa + sb) / 2), a = du.a, b = du.b; let out;
  const avgE = [...a.members, ...b.members].reduce((s, m) => s + m.energy, 0) / (a.members.length + b.members.length);
  if (avgE < .15) out = 'stalemate'; else if (Math.abs(diff) < .08) out = 'reconcile'; else out = 'sway';
  if (out === 'sway') { const win = diff > 0 ? a : b, lose = win === a ? b : a; const wl = win.members[0]; for (const m of lose.members) { let dk = ((wl.keyC - m.keyC) % 1200 + 1800) % 1200 - 600; m.keyC += dk * .6; m.tempo += (wl.tempo - m.tempo) * .6; m.motif[0] = wl.motif[0]; m.motif[2] = wl.motif[2]; m.retreat = { from: [win.x, win.y], until: Sf.now() + 10 }; }
    for (const m of lose.members) RS.Creature.entrain(Sf, m, wl, 'duel');
    lose.motif = lose.members[0].motif.slice(); if (lose.made) { const near = lose.made.filter(s => Sf.W.bodies.has(s.id)); for (const s of near) { s.meta.owner = win.id; (win.made = win.made || []).push(s); } lose.made = []; } du.winner = win.id; }
  else if (out === 'reconcile') { const k = (a.members[0].keyC + b.members[0].keyC) / 2; if (Sf.modulateTo) Sf.modulateTo(k); const _k = k, t = (a.members[0].tempo + b.members[0].tempo) / 2, mot = a.members[0].motif.slice(0, 2).concat(b.members[0].motif.slice(2)); for (const m of [...a.members, ...b.members]) { m.keyC = k; m.tempo = t; m.motif = mot.slice(); } a.motif = b.motif = mot; const ref = a.members[0]; for (const m of [...a.members, ...b.members]) if (m !== ref) RS.Creature.entrain(Sf, m, ref, 'duel'); }
  du.outcome = out; a.duel = b.duel = null; Sf.duels = Sf.duels.filter(d => d !== du); D.log.push({ out, score: du.score.slice(), quotes: du.quotes.slice() }); Sf.fx({ k: 'duelEnd', a, b, out, t: Sf.now(), dur: 2 }); Sf.stats['duel_' + out] = (Sf.stats['duel_' + out] || 0) + 1; return out; };
D.stop = (Sf, cl) => { const du = cl.duel; if (!du) return; du.done = true; du.a.duel = du.b.duel = null; Sf.duels = Sf.duels.filter(d => d !== du); du.outcome = 'interrupted'; };
// the player joins: >=3 strikes within a bar near a colony -> the colony answers with a callback of the player's phrase
D.playerPhrase = (Sf, strikes, nextBarT) => { if (strikes.length < 3) return null; const M = Sf.M, t0 = strikes[0].t, ph = strikes.slice(-6).map(s => ({ s: Math.round((s.t - t0) / M.dt16()) % 16, deg: M.nearestDeg(s.f || 220), f: s.f || 220 })); const x = strikes[0].x, y = strikes[0].y;
  let best = null, bd = 260; for (const cl of Sf.clusters) { const d = Math.hypot(cl.x - x, cl.y - y); if (d < bd) { bd = d; best = cl; } }
  if (!best) { for (const c of Sf.creatures) { const d = Math.hypot(c.x - x, c.y - y); if (d < bd && !c.caught) { bd = d; best = { members: [c], id: c.id, x: c.x, y: c.y, solo: true }; } } }
  if (!best) return null; { const l0 = best.members[0] && best.members[0].mind; if (l0 && l0.E && l0.sys && RS.Tonal) for (const p of ph) p.deg = RS.Tonal.degOfCents(l0.sys, 1200 * Math.log2(p.f / RS.Mind.tonicHz(Sf, l0))).d; } const id = D.idiom(best), ans = D.answer(ph, id, 0, RS.hash(Sf.now())); const lead = best.members[0], dt16 = M.dt16(), lm = lead.mind && lead.mind.E && lead.mind.sys ? lead.mind : null; ans.forEach(nt => C.sing(Sf, lead, nt.deg, nextBarT + nt.s * dt16, lm ? { gain: 1, hz: RS.Mind.hz(Sf, lm, nt.deg) } : { gain: 1 })); if (lm) Sf.stats.playerAnsweredJam = (Sf.stats.playerAnsweredJam || 0) + 1;   /* v0.8a4 D: answer in the jam's key */
  Sf.fx({ k: 'duelWave', from: { x, y }, to: best, t: nextBarT, dur: M.barDur(), esc: 0 }); Sf.stats.playerAnswered = (Sf.stats.playerAnswered || 0) + 1; return { ph, ans, ov: D.overlap(ph, ans), who: best.id, lead: lead.id }; };
/* v0.6.1 TEACH BY DEMONSTRATION (no new gesture): the player plays a phrase on the world's instruments (plain taps, as before), the nearest ohm answers it (call and response, as before);
   play the SAME phrase again (same notes, rhythm within a 16th) as the next phrase, within ~4 bars, near the same ohm -> that ohm adopts it as its motif (learned, heritable, undoable;
   genes untouched). Needs >= 4 notes so a casual 3-tap answer never teaches. */
D.demo = (Sf, r) => { const L = Sf.demoLast; Sf.demoLast = null; if (!r || !r.ph || r.ph.length < 4) return false; const now = Sf.now(); Sf.demoLast = { ph: r.ph, lead: r.lead, t: now };
  if (!L || L.lead !== r.lead || now - L.t > Sf.M.barDur() * 4.5 || L.ph.length !== r.ph.length || !L.ph.every((p, i) => p.deg === r.ph[i].deg && Math.abs(p.s - r.ph[i].s) <= 1)) return false;
  const c = Sf.creatures.find(q => q.id === r.lead); if (!c || c.dead) return false; const cl = (v, a, b) => Math.max(a, Math.min(b, v)), mot = r.ph.map(p => p.deg).concat(r.ph.map(p => p.deg)).slice(0, 8).map(d => cl(d, -6, 9)); if (Sf.undoPush) Sf.undoPush({ k: 'motif', id: c.id, motif: (c.motif || []).slice(), taught: c.taughtMotif || 0 });
  c.motif = mot; if (c.mind) c.mind.motif = mot.slice(); c.taughtMotif = (c.taughtMotif || 0) + 1; Sf.demoLast = null; Sf.fx({ k: 'learned', c, col: c.col, dur: 1.2, r: 36 }); Sf.stats.demoTaught = (Sf.stats.demoTaught || 0) + 1; return true; };
})(typeof window !== 'undefined' ? window : globalThis);
