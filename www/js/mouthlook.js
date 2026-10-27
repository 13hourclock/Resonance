'use strict';
// v08-mouth (Wilbow 5:27 / 5:29 / 5:31 PM MDT Oct 24 2026): every ohm wears a MOUTH you can find.
//   1 always on the body (on the head, in front of and below the eyes, on the side it faces); drawn only for on-screen ohms, skipped when tiny on screen
//   2 shaped by its voice genes (tract amount / length / tenseness / nasality, its learned tube voice) and a per-genome curve, so no two look alike
//   3 it opens and shapes each vowel while the ohm sings (the syllable the shared vocal tract is sent, VX.attach) - no allocation, on-screen only
//   4 in play mode it glows softly; a DOUBLE TAP ON THE MOUTH opens the big mouth (RS.Mouth), with a generous target (the tube double tap still works)
//   5 non-vocal ohms (drummers, instruments) wear a tiny closed mouth: it never opens, and a double tap on it does nothing new (C3 'ohmDouble')
//   6 a one-time ghost fingertip double-taps the mouth the first time you play a vocal ohm after the tutorial (Sf.mods.guide.mouthHint, saved)
//   C what you play on an ohm in play mode (node taps, pads, notes sung in the big mouth) is ADDED to its phrase on leaving play mode (c.addPh):
//     quantised to the bar's 16ths and the jam's scale steps, played only in bars where the ohm already plays, never over its own notes. Undoable, saved.
(function (G) { const RS = G.RS, clamp = RS.clamp, TAU = Math.PI * 2;
const Ml = RS.MouthLook = { stats: { looks: 0, draws: 0, skipped: 0, commits: 0, added: 0 } };
const Pm = RS.Play, Mo = RS.Mouth, Mi = RS.Mind, VX = RS.Vocal;
const LK = new WeakMap();   // per ohm: cached look + live mouth state (never saved: songsave copies own fields only)
const VWL = VX ? VX.VW : {}, DIPH = VX ? VX.DIPH : {}, LAB = { P: 1, B: 1, M: 1, F: 1, V: 1, W: 1 };
// an ohm is VOCAL (its mouth can open the big mouth, and moves when it sings) when it has a real throat: a tube (Pm.vocalAmt > .02, the big mouth drives it)
// and either it sings through the shared vocal tract (the mind.js singer rule: tract gene >= .5, or it learned words / a sung phrase) or its throat is
// at least Ml.THROAT strong and it is not a drummer. Drummers and instrument-voiced ohms with hardly any throat wear the tiny closed mouth.
Ml.THROAT = .2;
Ml.vocal = c => { const T = c && c.P && c.P.tract; if (!T || !(T.amt > .02)) return false; const sung = !!((c.words && c.words.length) || c.sung), drum = !!(c.P.inst && c.P.inst.percK > .5); return sung || (!drum && (T.amt >= Ml.THROAT || (c.g && c.g[168] >= .5))); };
Ml.headR = c => c.P.size * (c.growth || 1);
const sig = c => { const T = c.P.tract, v = c.voice; return (T ? T.amt + T.len * 3 + T.tense * 7 + T.nasal * 11 : 0) + (v ? v.tu * 13 + v.td * 17 + v.lip * 19 + v.vel * 23 + v.tense * 29 : 0) + (c.words && c.words.length ? 31 : 0) + (c.sung ? 37 : 0); };
// the look, in head-radius units: half-width hw, curve k (+ smile / - frown), rest gap (breathy), roundness, nose bump, cupid's bow, lip thickness, colours
Ml.look = c => { let e = LK.get(c); if (!e) { e = { f: 1, x: 0, y: 0, sy: null, syT: -1, P: null, s: NaN }; LK.set(c, e); } const s = sig(c); if (e.P === c.P && e.s === s && e.L) return e;
  Ml.stats.looks++; e.P = c.P; e.s = s; const T = c.P.tract || { amt: 0, len: 1, tense: .6, nasal: 0, agil: .5 }, v = c.voice || { tu: 0, td: 0, lip: 1, vel: 0, tense: 0 }, voc = Ml.vocal(c), h = c.g ? RS.Genome.hash(c.g) : 1;
  const u = k => ((h >>> k) & 255) / 255, L01 = clamp((T.len - .72) / .56, 0, 1), ten = clamp(T.tense + (v.tense || 0), .05, 1), nas = clamp(T.nasal + (v.vel || 0), 0, 1), lip = clamp(v.lip == null ? 1 : v.lip, .2, 1.4), col = c.col || [200, 200, 200];
  const L = e.L = e.L || {}; L.voc = voc;
  if (voc) { L.hw = .17 + .17 * L01 + .1 * T.amt + .04 * u(3); L.k = -.3 + 1.1 * u(11); L.gap = ten < .45 ? (.45 - ten) * .5 : 0; L.round = clamp((1 - lip) * 1.2 + (1 - ten) * .35 + .3 * u(19), 0, 1); L.nose = nas > .3 ? .08 + .14 * nas : 0; L.bow = (T.agil || .5) > .6 ? .05 + .1 * u(5) : 0; L.lw = .05 + .07 * T.amt; L.open0 = .35 + .5 * T.amt; }
  else { L.hw = .1 + .04 * u(3); L.k = -.15 + .5 * u(11); L.gap = 0; L.round = 0; L.nose = 0; L.bow = 0; L.lw = .04; L.open0 = 0; }
  const lc = RS.Render ? RS.Render.mix(col.map(x => x * .55), [235, 110, 140], voc ? .3 + .4 * T.amt : .15) : col; L.lipC = 'rgb(' + (lc[0] | 0) + ',' + (lc[1] | 0) + ',' + (lc[2] | 0) + ')'; L.inC = 'rgb(46,16,32)'; L.lineC = voc ? L.lipC : 'rgba(30,22,30,.7)';
  L.noseC = 'rgba(' + (col[0] * .6 | 0) + ',' + (col[1] * .6 | 0) + ',' + (col[2] * .6 | 0) + ',.8)'; return e; };
// where the mouth is: on the head segment, in front of and below the eyes, on the side the ohm faces (writes e.x / e.y; no allocation)
Ml.place = (Sf, c, e) => { const W = Sf.W, b = c.segs && c.segs[0], Rh = Ml.headR(c); let hx = c.x, hy = c.y; if (b && b.idx && b.idx.length && W) { hx = 0; hy = 0; const ix = b.idx; for (let i = 0; i < ix.length; i++) { hx += W.x[ix[i]]; hy += W.y[ix[i]]; } hx /= ix.length; hy /= ix.length; }
  const d = c.batonLook || c.want, f = d && d[0] < 0 ? -1 : 1; e.f += (f - e.f) * .15; e.x = hx + e.f * Rh * .42; e.y = hy + Rh * .4; return e; };
Ml.pt = (Sf, c) => { const e = Ml.place(Sf, c, Ml.look(c)); return [e.x, e.y]; };
// how open the mouth is right now (0 = at rest) and its vowel shape: [open, widthFactor]; reads the last sung syllable (no allocation)
const sh = [0, 1];
Ml.shape = (Sf, c, e, tn) => { sh[0] = 0; sh[1] = 1; const L = e.L; if (!L.voc || c.noteT == null) return sh; const nd = Math.max(.12, c.noteDur || .2), age = tn - c.noteT; if (age < 0 || age > nd + .06 || c.notePerc) return sh;
  const env = Math.min(1, age / .05) * (age > nd ? 1 - (age - nd) / .06 : 1) * (.55 + .45 * clamp(c.noteVel == null ? .7 : c.noteVel, 0, 1));
  const sy = e.syT === c.noteT ? e.sy : null; if (!sy) { sh[0] = .25 * env * L.open0; return sh; }   // a vocal ohm's note without a sung syllable: a soft hum
  if (sy.on && sy.on.length && LAB[sy.on[sy.on.length - 1]] && age < .06) return sh;   // p / b / m / f / v / w: lips closed at the onset
  let nu = sy.nu; const dp = DIPH[nu]; if (dp) nu = age < nd * .5 ? dp[0] : dp[1]; const q = VWL[nu] || VWL.AH; if (!q) return sh;
  sh[0] = env * clamp((q[1] - 1.95) / 1.0, .18, 1) * (.6 + .4 * L.open0); sh[1] = .55 + .45 * q[2]; return sh; };
// draw it (render.js calls this right after the eyes, for on-screen ohms only)
Ml.draw = (ctx, Sf, c, a) => { if (!c.P || !c.segs) return; const z = Sf.view && Sf.view.z != null ? Sf.view.z : 1, e = Ml.look(c), L = e.L, Rh = Ml.headR(c);
  if (L.hw * Rh * z < 1.4 || a < .05) { Ml.stats.skipped++; return; } Ml.stats.draws++; Ml.place(Sf, c, e); const tn = Sf.now(), x = e.x, y = e.y, hw = L.hw * Rh, s = Ml.shape(Sf, c, e, tn), op = s[0], wf = s[1];
  ctx.globalAlpha = a;
  if (L.voc && Sf.playFocus === c) { const H = Sf._mhint, hi = H && H.id === c.id && tn > H.t && tn < H.t + Ml.HINT ? .2 : 0, gl = .14 + .07 * Math.sin(tn * 3) + hi; ctx.fillStyle = 'rgba(255,236,205,' + (gl * .6).toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, hw * 2.4 + 4, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,240,215,' + gl.toFixed(3) + ')'; ctx.beginPath(); ctx.arc(x, y, hw * 1.5 + 2, 0, TAU); ctx.fill(); }   // 4: a soft glow in play mode
  const lw = Math.max(.8, L.lw * Rh), k = L.k * hw * .5;
  if (L.nose) { ctx.fillStyle = L.noseC; ctx.beginPath(); ctx.ellipse(x - e.f * hw * .1, y - hw * .7 - L.nose * Rh * .5, L.nose * Rh * .7, L.nose * Rh * .45, 0, 0, TAU); ctx.fill(); }
  const oh = Math.max(L.gap * hw, op * hw * 1.25), ow = hw * (op > 0 ? wf * (1 - .35 * L.round * op) : 1);
  if (oh > .6) { ctx.fillStyle = L.inC; ctx.beginPath(); ctx.ellipse(x, y + k * .4, ow, oh * (.5 + .5 * L.round) + oh * .4, 0, 0, TAU); ctx.fill(); ctx.strokeStyle = L.lipC; ctx.lineWidth = lw; ctx.stroke(); }
  else { ctx.strokeStyle = L.lineC; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - ow, y); if (L.bow) { ctx.quadraticCurveTo(x - ow * .5, y + k - L.bow * Rh, x, y + k * .6); ctx.quadraticCurveTo(x + ow * .5, y + k - L.bow * Rh, x + ow, y); } else ctx.quadraticCurveTo(x, y + k * 2, x + ow, y); ctx.stroke(); }
  ctx.globalAlpha = 1; };
// the double-tap target: generous (at least minR world units, normally the screen's ~30 px / zoom), vocal ohms only
Ml.hit = (Sf, c, wx, wy, minR) => { if (!Ml.vocal(c)) return false; const e = Ml.place(Sf, c, Ml.look(c)), Rh = Ml.headR(c), r = Math.max(minR || 0, e.L.hw * Rh * 1.6, Rh * .45); return Math.hypot(wx - e.x, wy - e.y) <= r; };
// ---- 3: remember the syllable each sung note was sent with (only for ohms whose look exists = ones that were drawn; others cost one WeakMap get)
let syC = null, syS = null;
if (VX && VX.attach && !VX.attach._ml) { const at0 = VX.attach; VX.attach = (Sf, c, v, dur) => { const r = at0(Sf, c, v, dur); if (v && v.syl) { syC = c; syS = v.syl; } return r; }; VX.attach._ml = 1; }
if (Mi && Mi.play && !Mi.play._ml) { const p0 = Mi.play; Mi.play = (Sf, c, o, when, rate) => { syC = null; const t0 = c.noteT, r = p0(Sf, c, o, when, rate); if (c.noteT !== t0) { const e = LK.get(c); if (e) { e.sy = syC === c ? syS : null; e.syT = c.noteT; } } syC = null; return r; }; Mi.play._ml = 1; }
// ---- 6: the one-time ghost (the guide ghost's double-tap dot, no text), the first time play mode opens on a vocal ohm
Ml.HINT = 2.6; Ml.HINT_DELAY = .9;
Ml.hintMaybe = (Sf, c) => { if (!Sf || !Sf.mods || !Ml.vocal(c)) return false; const st = RS.Guide ? RS.Guide.state(Sf) : (Sf.mods.guide = Sf.mods.guide || {}); if (st.mouthHint || (RS.Guide && !st.done)) return false;   /* not during the tutorial (its own play-mode ghosts): the first play mode after it */ st.mouthHint = 1; Sf._mhint = { id: c.id, t: Sf.now() + Ml.HINT_DELAY }; Ml.stats.hints = (Ml.stats.hints || 0) + 1; return true; };
const pulse = (t, a, b) => t > a && t < b ? Math.sin(Math.PI * (t - a) / (b - a)) : 0;
Ml.drawHint = (ctx, Sf, s, z) => { const H = Sf._mhint; if (!H || !s || H.id !== s.c.id) return; const tn = Sf.now(); if (Mo && Mo.cur) { Sf._mhint = null; return; } if (tn < H.t) return; const u = (tn - H.t) / Ml.HINT; if (u > 1) { Sf._mhint = null; return; }
  const p = Ml.pt(Sf, s.c), fade = Math.min(1, u * 6, (1 - u) * 6), al = fade * (pulse(u, .25, .38) + pulse(u, .45, .58)), r = 11 * 1.6 / Math.max(.5, z || 1); if (al <= .01) return;
  const css = RS.Render.css; ctx.fillStyle = css([255, 250, 230], .5 * al); ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, TAU); ctx.fill(); ctx.fillStyle = css([255, 255, 245], .35 * al); ctx.beginPath(); ctx.arc(p[0], p[1], r * .45, 0, TAU); ctx.fill(); };
// ---- C: record what is played in play mode, add it to the ohm's phrase on exit
Ml.DT_WIN = .6; Ml.KEEP = 8; Ml.CAP = 8; Ml.PER_BAR = 4; Ml.VEL = .85; Ml.WIN = 4;   // notes kept per session, layer cap, added notes per bar, their level, the bars a session keeps
const recNow = (Sf, s, deg, vel, o) => { const c = s.c, m = c.mind; if (!m || !Mi) return null; const L = Mi.barLen(m); if (!(L > 0) || !Number.isFinite(m.pos)) return null; const rate = m.bpm / 60 * 4 * (m.feel || 1);
  let bar = Math.floor(m.pos / L), st = Math.round(m.pos - bar * L); if (st >= L) { st -= L; bar++; } const r = { bar, s: st, deg, vel: clamp(vel == null ? .7 : vel, .15, 1), d: 2, t: Sf.now(), rate, perc: !!o.perc, stroke: o.stroke || null, sing: !!o.sing, L };
  (s.rec = s.rec || []).push(r); if (s.rec.length > 64) s.rec.shift(); return r; };
const endRec = (Sf, r) => { if (!r || r.done) return; r.done = 1; if (!r.perc) r.d = clamp(Math.round((Sf.now() - r.t) * r.rate), 1, 8); else r.d = 1; };
let preview = false, taught = 0;
if (Pm && !Pm._ml) { Pm._ml = 1;
  const n0 = Pm.note; Pm.note = (Sf, s, o, vel, from) => { const t1 = taught, sp = n0(Sf, s, o, vel, from); if (!preview && t1 === taught && s && o && !(Mo && Mo.cur)) { const r = recNow(Sf, s, o.deg, vel, { perc: !!o.pad, stroke: o.pad ? o.stroke : null }); if (r) { if (s._recHeld) endRec(Sf, s._recHeld); s._recHeld = o.pad ? null : r; if (o.pad) endRec(Sf, r); } } return sp; };
  const u0 = Pm.up; Pm.up = (Sf, s) => { if (s && s._recHeld) { endRec(Sf, s._recHeld); s._recHeld = null; } preview = true; try { return u0(Sf, s); } finally { preview = false; } };   // the tweak preview note is not recorded
  const t0 = Pm.teach; Pm.teach = (Sf, s, o) => { const r = t0(Sf, s, o); if (r && s) { taught++; s.rec = []; s._recHeld = null; if (Mo && Mo.cur) Mo.cur._recN = null; } return r; };   // taught = it became the motif; not added again
  const en0 = Pm.enter; Pm.enter = (Sf, c) => { const s = en0(Sf, c); if (s) { s.rec = []; Ml.hintMaybe(Sf, c); } return s; };
  const ex0 = Pm.exit; Pm.exit = (Sf, s) => { const r = ex0(Sf, s); if (s && s.rec && s.rec.length) Ml.commit(Sf, s); if (Sf && Sf._mhint && s && Sf._mhint.id === s.c.id) Sf._mhint = null; return r; };
  const d0 = Pm.draw; Pm.draw = (ctx, Sf, s, z) => { const r = d0(ctx, Sf, s, z); Ml.drawHint(ctx, Sf, s, z); return r; }; }
if (Mo && !Mo._ml) { Mo._ml = 1;
  const op0 = Mo.open; Mo.open = (Sf, s, Wd, Ht, ax, ay) => { const M = op0(Sf, s, Wd, Ht, ax, ay); if (M && s && s.rec && Sf) { const t = Sf.now() - Ml.DT_WIN; s.rec = s.rec.filter(r => r.t < t); s._recHeld = null; } return M; };   // the taps of the double tap that opened it (e.g. a limb-tip node under the mouth) are not kept
  const on0 = Mo.noteOn; Mo.noteOn = M => { const N0 = M.note, r = on0(M); if (M.note && M.s) { if (M.note === N0 && M._recN) M._recN.deg = M.note.deg;   // a retargeted onset keeps its slot, takes the new step
    else { if (M._recN) endRec(M.Sf, M._recN); M._recN = recNow(M.Sf, M.s, M.note.deg, .75, { sing: true }); } } return r; };
  const tr0 = Mo.track; Mo.track = (M, wasV) => { const r = tr0(M, wasV); if (!M.note && M._recN) { endRec(M.Sf, M._recN); M._recN = null; } return r; };
  const cl0 = Mo.close; Mo.close = (Sf, M) => { if (M && M._recN) { endRec(Sf, M._recN); M._recN = null; } return cl0(Sf, M); }; }
const ovl = (a, b) => (a.b % Math.min(a.p, b.p)) === (b.b % Math.min(a.p, b.p));   // two layer notes can fall in the same bar
// commit a session: the most recent notes (the last WIN bars, at most KEEP) -> notes with a loop length p (1, 2 or 4 bars: the smallest that fits) and
// their bar b = bar mod p, merged into c.addPh (a newer note on the same 16th of the same bars replaces the older; at most CAP, oldest out)
Ml.commit = (Sf, s) => { const c = s.c, rec = s.rec.filter(r => r.deg != null); s.rec = []; if (!rec.length || !c || c.dead) return null; for (const r of rec) endRec(Sf, r);
  const last = rec[rec.length - 1].bar, win = rec.filter(r => r.bar > last - Ml.WIN).slice(-Ml.KEEP), span = last - win[0].bar + 1, p = span <= 1 ? 1 : span <= 2 ? 2 : 4, seq = (c.addPh && c.addPh.seq) || 0;
  const add = win.map((r, i) => ({ b: ((r.bar % p) + p) % p, p, s: r.s, d: r.d, deg: clamp(Math.round(r.deg), -7, 14), vel: +r.vel.toFixed(2), perc: r.perc || undefined, stroke: r.stroke || undefined, sing: r.sing || undefined, n: seq + i + 1 }));
  const prev = c.addPh ? JSON.parse(JSON.stringify(c.addPh)) : null; let ns = prev ? prev.notes.slice() : [];
  for (const a of add) { ns = ns.filter(o => !(o.s === a.s && ovl(o, a))); ns.push(a); } ns.sort((x, y) => x.n - y.n); if (ns.length > Ml.CAP) ns = ns.slice(-Ml.CAP);
  if (Sf.undoPush) { Ml.undoKind(Sf); Sf.undoPush({ k: 'addph', id: c.id, prev }); } c.addPh = { notes: ns, seq: seq + add.length }; Ml.stats.commits++;
  if (Sf.fx) Sf.fx({ k: 'bloom', c, col: c.col, dur: .7 }); return c.addPh; };
Ml.undoKind = Sf => { if (Sf.undoKinds && !Sf.undoKinds.addph) Sf.undoKinds.addph = a => { const c = Sf.creatures.find(q => q.id === a.id); if (c) c.addPh = a.prev || null; }; };
// the added notes of one bar, merged into what the ohm generated: only when it really plays this bar (not resting, listening, humming or in a breakdown),
// never on a 16th where it already has a note, at most PER_BAR, a little softer
Ml.merge = (Sf, m, bar, o) => { const c = m.c, A = c && c.addPh; if (!A || !A.notes || !A.notes.length || !Array.isArray(o) || !o.length || m.bd || m.role === 'listen' || (m.quiet && !m.E) || Sf.playFocus === c) return o;
  let real = false; for (const q of o) if (!q.hum) { real = true; break; } if (!real) return o; const L = Mi.barLen(m); let n = 0, out = o;
  for (const a of A.notes) { if (n >= Ml.PER_BAR) break; if (((bar % a.p) + a.p) % a.p !== a.b || a.s >= L) continue; let hit = false; for (const q of o) if (Math.abs(q.s - a.s) < .5) { hit = true; break; } if (hit) continue;
    if (out === o) out = o.slice(); out.push({ s: a.s, d: Math.min(a.d, L - a.s), deg: a.deg, vel: a.vel * Ml.VEL, perc: !!a.perc, stroke: a.stroke || undefined, sing: !!a.sing, added: true }); n++; }
  if (n) { out.sort((x, y) => x.s - y.s); Ml.stats.added += n; } return out; };
if (Mi && Mi.genBar && !Mi.genBar._ml) { const gb = Mi.genBar; Mi.genBar = (Sf, m, bar) => Ml.merge(Sf, m, bar, gb(Sf, m, bar)); Mi.genBar._ml = 1; }
})(typeof window !== 'undefined' ? window : globalThis);
