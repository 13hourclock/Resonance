// v08-dawpaint headless check (Wilbow 8:44 PM MDT Oct 24 2026: "I think we should be able to paint notes in the daw river.  The notes should dictate whatever is
// being currently sung and introduced to the jam"; 8:45 PM: "Instead of a grid make the notes more organic and have movement"; card: "Yes, make the pattern editor organic too").
// P1 stroke -> notes: settles onto scale tones; a smooth slope = connected notes + glide; a quick jump = a clean step; wobble = vibrato; slow = louder; soft beat pull
// P2 painting on an empty ohm lane makes a stroke (no grid: the brain's dot lattice hides on that lane); a short drag still taps; P3 the brain plays them from the
// next unplanned bar, in place of its own notes there (bars already queued are untouched), not 'manual' (crowd cap), glide / vibrato reach the synth spec
// P4 vocal ohms sing them; P5 drummers: a stroke on a kit row paints that hit, only those hits give way; P6 breakdown / play-mode lay out; P7 rub erases,
// painting over replaces, undo / redo; P8 saved (world save + song snapshot); P9 the old gestures (tap, bead move, swipe-select, edge timbre, loop draw, hold,
// rest-then-paint on a bead); P10 the painted colour in the live ring; P11 drawing: ribbons sway (move with time), text-free, pattern editor has no rows / columns; P12 cost
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dawbrain']) require('../www/js/' + m + '.js');
const DP = RS.DawPaint, DB = RS.DawBrain, Mi = RS.Mind, C = RS.Creature, res = []; const ok = (name, pass, info) => res.push({ name, pass: !!pass, info }); const J = x => JSON.stringify(x);
let clk = 1000; const pn = performance.now.bind(performance); performance.now = () => clk;
const fake = () => { const calls = {}, segs = []; let last = null; const ctx = new Proxy({}, { get: (o, k) => { if (k in o) return o[k]; return (...a) => { calls[k] = (calls[k] || 0) + 1; if (k === 'moveTo') last = a; if (k === 'lineTo' && last) { segs.push([last[0], last[1], a[0], a[1]]); last = a; } return k === 'createLinearGradient' || k === 'createRadialGradient' ? { addColorStop: () => { } } : k === 'measureText' ? { width: 10 } : undefined; }; }, set: (o, k, v) => { o[k] = v; return true; } }); return { ctx, calls, segs }; };
function setup(n = 2) { const { Sf } = T.scene({ clear: true }); const cs = []; for (let i = 0; i < n; i++) { const c = T.add(Sf, T.plain(31 + i * 5), Sf.view.cx - 60 + i * 60, { quiet: false }); if (c.mind) c.mind.quiet = false; cs.push(c); } const D = RS.DAW(Sf); T.run(Sf, .5); for (const c of cs) if (c.mind) c.mind.quiet = false; return { Sf, D, cs }; }
const render = (D, W = 412, H = 860) => { const f = fake(); D.open = true; D.render(f.ctx, W, H, 1, 1); return f; };
const rowOf = (D, c) => { const g = D.geo(412, 860); return { g, r: g.rows.find(r => DP.ohm(r.L) === c) }; };
const emptyAt = (D, g, r, x) => { for (let y = r.y + r.h / 2; y > r.y + 10; y -= 3) { const h = D.beadAt(g, x, y); if (h && !h.n) return y; } for (let y = r.y + r.h / 2; y < r.y + r.h - 10; y += 3) { const h = D.beadAt(g, x, y); if (h && !h.n) return y; } return null; };
// paint: f(k) -> [x, y] for k = 0..N, dt ms between points
const stroke = (D, g, pts, dt = 30, info) => { D.down(pts[0][0], pts[0][1], g); for (let i = 1; i < pts.length; i++) { clk += dt; D.move(pts[i][0], pts[i][1], g); } clk += dt; const L = pts[pts.length - 1]; return D.up(L[0], L[1], g, info || {}); };
const S = (f, q0 = 0, q1 = 8, sp = .1) => { const o = []; for (let q = q0; q <= q1 + 1e-9; q += .25) o.push({ q, deg: f(q), sp, pr: .5 }); return o; };
// --- P1 pure stroke -> notes
{ const L = 16, grp = [4, 4, 4, 4];
  const ramp = DP.notes(S(q => q * .5, 0, 8), { L, groups: grp }); ok('P1 a smooth rising line = connected notes on scale tones', ramp.length >= 3 && ramp.every(n => Number.isInteger(n.deg)) && ramp.every((n, i) => !i || Math.abs(n.s - (ramp[i - 1].s + ramp[i - 1].d)) < .6), J(ramp.map(n => [n.s, n.d, n.deg, n.gl])));
  ok('P1 ... gliding from tone to tone (portamento)', ramp.filter(n => n.gl != null).length >= 1 && ramp.every(n => n.gl == null || Math.abs(n.gl - n.deg) === 1), ramp.map(n => n.gl));
  const step = DP.notes(S(q => q < 3 ? 0 : q < 6 ? 3 : 5, 0, 8), { L, groups: grp }); ok('P1 quick jumps = clean separate notes, no glide', J(step.map(n => n.deg)) === '[0,3,5]' && step.every(n => n.gl == null), J(step.map(n => [n.s, n.deg, n.gl])));
  const wob = DP.notes(S(q => 2 + Math.sin(q * 6) * .45, 0, 6), { L, groups: grp }); ok('P1 a wobble around a tone = vibrato on that note (not extra notes)', wob.length <= 2 && wob[0].deg === 2 && wob[0].vib > .2, J(wob));
  const slow = DP.notes(S(q => 1, 0, 4, .05), { L }), fast = DP.notes(S(q => 1, 0, 4, 1.4), { L }); ok('P1 slower stroke = louder (swell)', slow[0].vel > fast[0].vel + .3, [slow[0].vel, fast[0].vel]);
  const pr = DP.notes([0, .25, .5, .75, 1, 1.25, 1.5].map(q => ({ q: q + 3.4, deg: 0, sp: .5, pr: .9 })), { L: 16, groups: [3, 3, 2] }); ok('P1 timing: a soft pull toward the beat, not a hard snap (3.4 -> ~3.12 near a beat-group start)', Math.abs(pr[0].s - (3.4 + (3 - 3.4) * DP.PULL_BEAT)) < .01 && pr[0].s !== 3, pr[0].s);
  const off = DP.notes([0, .25, .5, .75, 1].map(q => ({ q: q + 5.4, deg: 0, sp: .5, pr: .5 })), { L: 16, groups: [8, 8] }); ok('P1 off the beat groups: half way to the 16th (5.4 -> 5.2)', Math.abs(off[0].s - 5.2) < .01, off[0].s);
  const quiv = DP.notes(S(q => 2 + (q % 1 < .5 ? .3 : -.3), 0, 6), { L }); ok('P1 small shakes do not hop tones (hysteresis)', quiv.every(n => n.deg === 2), J(quiv.map(n => n.deg)));
  const lng = DP.notes(S(q => 0, 0, 30), { L: 16 }); ok('P1 a long line re-articulates (<= 8 steps) and never crosses a bar line', lng.every(n => n.d <= DP.MAX_NOTE + 1e-6 && Math.floor(n.q / 16 + 1e-6) === Math.floor((n.q + n.d - .01) / 16)), J(lng.map(n => [n.q, n.d]))); }
// --- P2 painting a lane
let W1; { const { Sf, D, cs } = setup(2); render(D); const c = cs[0], { g, r } = rowOf(D, c); const x0 = g.x0 + g.w * .2, y0 = emptyAt(D, g, r, x0);
  const before = (Sf.mindLog || []).length;
  ok('P2 setup: an ohm lane with an empty spot', r && y0 != null, { r: !!r, y0 });
  const tapR = stroke(D, g, [[x0, y0], [x0 + 3, y0]], 20); ok('P2 a short touch is still a tap (opens the pattern), not paint', !c.paint && tapR !== 'paint' && D.pat && D.pat.id === r.L.id, tapR); D.pat = null; D.sel.clear();
  const g2 = D.geo(412, 860), r2 = g2.rows.find(q => q.L.id === r.L.id), y1 = emptyAt(D, g2, r2, x0);
  D.down(x0, y1, g2); for (let k = 1; k <= 30; k++) { clk += 30; D.move(x0 + k * 6, y1 - k * .9, g2); } const fl = render(D); ok('P2 while painting the lane shows no grid (the brain\'s dot lattice hides there)', DP.noGrid(r2.L) && DP.live === r2.L.id); clk += 30; const pr = D.up(x0 + 180, y1 - 27, g2, {});
  ok('P2 a drag from an empty spot paints a stroke', pr === 'paint' && c.paint && c.paint.s.length === 1 && c.paint.s[0].n.length >= 2, [pr, c.paint && J(c.paint.s[0].n)]);
  const st = c.paint.s[0]; ok('P2 the stroke keeps a small cached path (<= ' + DP.PTS + ' points) and loops over 1, 2, 4 or 8 bars', st.pts.length / 3 <= DP.PTS && [1, 2, 4, 8].includes(st.p), { pts: st.pts.length / 3, p: st.p });
  ok('P2 the painted line climbs (screen up = higher tones)', st.n[st.n.length - 1].deg > st.n[0].deg, st.n.map(n => n.deg));
  ok('P2 no live stroke left after the finger lifts', DP.live == null);
  W1 = { Sf, D, c, st };
  // --- P3 the brain plays them
  const m = c.mind, Lb = Mi.barLen(m), queued = m.q.filter(q => q.pos >= m.pos).map(q => q.pos), qBar = Math.round(m.genTo / Lb) - 1;
  const bar = Math.round(m.genTo / Lb) + 4, roff = ((bar - st.ph) % st.p + st.p) % st.p; let tb = bar; while (!st.n.some(n => n.r === ((tb - st.ph) % st.p + st.p) % st.p)) tb++;
  const out = Mi.genBar(Sf, m, tb), ro = ((tb - st.ph) % st.p + st.p) % st.p, want = st.n.filter(n => n.r === ro), lo = Math.min(...want.map(n => n.s)), hi = Math.max(...want.map(n => n.s + n.d));
  ok('P3 the brain\'s next bars carry the painted notes', want.every(w => out.some(o => o.painted && Math.abs(o.s - w.s) < 1e-6 && o.deg === w.deg)), J(out.filter(o => o.painted).map(o => [o.s, o.deg])));
  ok('P3 ... in place of its own notes in that stretch (they dictate)', !out.some(o => !o.painted && !o.perc && o.s >= lo - .3 && o.s < hi), J(out.map(o => [o.s, o.deg, !!o.painted])));
  ok('P3 painted notes are not \'manual\' (the crowd cap still applies)', out.filter(o => o.painted).every(o => !o.manual));
  ok('P3 bars already queued are not rewritten (the phrase enters at the next bar)', m.q.filter(q => q.pos >= m.pos).every(q => !q.painted || q.pos >= qBar * Lb), queued.length);
  const L0 = (Sf.mindLog || []).length; let painted = 0; const spy = DB.rec; DB.armed = true; for (let i = 0; i < 60 * 10; i++) { T.t += 1 / 60; Sf.step(1 / 60); if (i % 10 === 0) render(D); } const v = DB.view(c); painted = v.notes.filter(n => n.src === DB.SRC.painted).length;
  ok('P3 the ohm really plays them (live ring: painted notes, leaf green source)', painted >= 2 && J(DB.SRC_COL[DB.SRC.painted]) === J(DP.COL), { painted, all: v.notes.length });
  ok('P10 the painted colour is its own (not cyan / magenta / amber)', [1, 2, 3].every(k => J(DB.SRC_COL[k]) !== J(DP.COL)));
  // glide / vibrato reach the synth
  let spec = null; const sp0 = Sf.play; Sf.play = (s, ...a) => { spec = s; return sp0.call(Sf, s, ...a); }; m.quiet = false; Mi.play(Sf, c, { s: 0, d: 2, deg: 2, vel: .8, painted: 1, gl: 4, vib: .6, pos: m.pos }, Sf.now() + .05, 1); Sf.play = sp0;
  ok('P3 a painted glide slides up over the note; a wobble = vibrato (synth spec)', spec && spec.glide > 1 && spec.vib > 0 && spec.vibR > 3, spec && { glide: spec.glide, vib: spec.vib, vibR: spec.vibR });
  // --- P6 breakdowns / play mode lay out
  m.bd = true; const o2 = DP.merge(Sf, m, tb, []); m.bd = false; ok('P6 a breakdown bar gets no painted dictation of its own (lays out like the rest; a jam phrase that already took the notes in is thinned by the breakdown as usual)', o2.length === 0, J(o2).slice(0, 200)); Sf.playFocus = c; const o3 = Mi.genBar(Sf, m, tb); Sf.playFocus = null; ok('P6 in play mode the player plays (no painted notes)', !(o3 || []).some(o => o.painted));
  // --- P4 vocal ohms sing them
  const vv = RS.MouthLook.vocal; RS.MouthLook.vocal = () => true; const g3 = D.geo(412, 860), r3 = g3.rows.find(q => q.L.id === r.L.id); clk += 2000; const xa = g3.x0 + g3.w * .62; const ya = emptyAt(D, g3, r3, xa) || r3.y + 14; stroke(D, g3, Array.from({ length: 20 }, (_, k) => [xa + k * 5, ya]), 30); RS.MouthLook.vocal = vv;
  const sv = c.paint.s[c.paint.s.length - 1]; let tb2 = Math.round(m.genTo / Lb) + 8; while (!sv.n.some(n => n.r === ((tb2 - sv.ph) % sv.p + sv.p) % sv.p)) tb2++; const o4 = Mi.genBar(Sf, m, tb2).filter(o => o.painted === sv.id);
  ok('P4 on a singing ohm the painted notes are sung (with its syllables)', sv.sing && o4.length && o4.every(o => o.sing), { sing: sv.sing, n: o4.length }); }
// --- P5 drummers
{ const { Sf, D } = setup(0); render(D); const g0 = RS.Genome.random(9101); g0[RS.IG.perc] = .92; g0.dk = ['kick', 'snare', 'hat'].map((h, i) => ({ h, s: RS.hash('dbk', i) >>> 0, b: 1 })); const c = Sf.addCreature(g0, Sf.view.cx, Sf.ground(Sf.view.cx) - 40, { growth: 1, energy: .9 }); if (c.mind) c.mind.quiet = false; T.run(Sf, 1); render(D);
  const { g, r } = rowOf(D, c); const yLow = DB.rowY(r, 0), x0 = g.x0 + g.w * .3; let y = yLow; if (!(D.beadAt(g, x0, y) && !D.beadAt(g, x0, y).n)) y = yLow - 2;
  const res5 = stroke(D, g, Array.from({ length: 24 }, (_, k) => [x0 + k * 4, y + (k % 6 === 3 ? -2 : 0)]), 40); const st = c.paint && c.paint.s[0];
  ok('P5 a drummer\'s stroke along the low row paints low hits (that hit)', res5 === 'paint' && st && st.drum && st.n.length >= 1 && st.n.every(n => n.k === 0 || DP.KIT_SLOT[n.k] === RS.Drums.slotOf(c.P.inst.dkP[n.h].hitId)), st && J(st.n));
  const h0 = st && c.P.inst.dkP[st.n[0].h]; ok('P5 ... the hit it paints is the kit\'s own low hit (kick)', h0 && RS.Drums.slotOf(h0.hitId) === 'low', h0 && h0.hitId);
  const m = c.mind, Lb = Mi.barLen(m); let tb = Math.round(m.genTo / Lb) + 2; while (!st.n.some(n => n.r === ((tb - st.ph) % st.p + st.p) % st.p)) tb++; const out = Mi.genBar(Sf, m, tb);
  const pp = out.filter(o => o.painted), other = out.filter(o => !o.painted && o.perc); ok('P5 the brain plays the painted hits; the rest of the kit keeps going', pp.length >= 1 && pp.every(o => o.perc && o.hit === st.n[0].h || o.perc) && other.length >= 1, { painted: pp.length, other: other.length });
  const fr = render(D); ok('P5 the drummer lane draws its painted ribbon', (fr.calls.fill || 0) > 0); }
// --- P7 erase / replace / undo
{ const { Sf, D, c } = W1, { g, r } = rowOf(D, c); const n0 = c.paint.s.length, s0 = c.paint.s[0], xs = g.x0 + s0.w0 / 32 * g.w, xe = g.x0 + s0.w1 / 32 * g.w;
  const y = D.dy(r, s0.pts[1]); // a fresh stroke over the first one replaces it
  clk += 2000; const yy = emptyAt(D, g, r, xs + 4) || y; const pr = stroke(D, g, Array.from({ length: 16 }, (_, k) => [xs + 4 + k * (xe - xs - 8) / 15, yy + 8]), 30);
  ok('P7 painting over a painted stretch replaces it', pr === 'paint' && c.paint.s.length === n0 && !c.paint.s.some(q => q.id === s0.id), { pr, n: c.paint.s.length, ids: c.paint.s.map(q => q.id) });
  const top = c.paint.s[c.paint.s.length - 1]; const und = D.doUndo(); ok('P7 undo takes the stroke away (and brings back what it replaced)', und && c.paint.s.some(q => q.id === s0.id) && !c.paint.s.some(q => q.id === top.id));
  const red = D.doRedo(); ok('P7 redo puts it back', red && c.paint.s.some(q => q.id === top.id) && !c.paint.s.some(q => q.id === s0.id));
  const S0 = (() => { let o = null; DP.occ(top, c.mind.pos, Mi.barLen(c.mind), s => { if (o == null) o = s; }); return o; })(), xm = g.x0 + (((S0 + top.len / 2) % 32 + 32) % 32) / 32 * g.w, ym = D.dy(r, top.pts[Math.floor(top.pts.length / 6) * 3 + 1]);
  const pts = []; for (let k = 0; k <= 32; k++) pts.push([xm + Math.sin(k / 32 * Math.PI * 8) * 24, (emptyAt(D, g, r, xm) || ym) + (k % 2)]); clk += 2000; const er = stroke(D, g, pts, 18);
  ok('P7 rubbing back and forth across a painted ribbon erases it', er === 'erase' && !(c.paint && c.paint.s.some(q => q.id === top.id)), { er, ids: c.paint && c.paint.s.map(q => q.id) });
  D.doUndo(); ok('P7 undo brings an erased stroke back', c.paint && c.paint.s.some(q => q.id === top.id)); }
// --- P8 saved
{ const { Sf, c } = W1; const pj = J(c.paint); const sv = C.serial(c); ok('P8 the world save keeps the painted strokes', J(sv.paint) === pj);
  const c2 = Sf.loadCreature(Object.assign({}, JSON.parse(J(sv)), { id: 'paintcopy', x: c.x + 200 })); ok('P8 ... and a reloaded ohm has them', c2 && J(c2.paint) === pj);
  const snap = RS.SongSave.pack(Sf); c.paint = null; RS.SongSave.apply(Sf, snap); ok('P8 the song snapshot (leaving and coming back) keeps them', J(c.paint) === pj); }
// --- P9 the old gestures
{ const { Sf, D, cs } = setup(2); render(D); const c = cs[1], { g, r } = rowOf(D, c), p = D.pattern(r.L); if (!p.notes.length) D.ops.add(r.L, 4, 2); const p2 = D.pattern(r.L), n = p2.notes[0];
  const bx = D.sx(g, r, n.s, p2.len) + 2, by = D.dy(r, n.deg); const hh = D.beadAt(g, bx, by); ok('P9 setup: a stored bead', hh && hh.n, !!hh);
  const before = J(p2.notes); clk += 1000; const mv = stroke(D, g, [[bx, by], [bx + 2, by - 6], [bx + 3, by - 14], [bx + 3, by - 26]], 25); ok('P9 dragging a bead right away still moves its pitch (no paint)', (mv === 'pitch' || mv === 'free') && !c.paint, mv);
  D.undo.length && D.doUndo(); const p3 = D.pattern(r.L), n3 = p3.notes[0], bx3 = D.sx(g, r, n3.s, p3.len) + 2, by3 = D.dy(r, n3.deg);
  clk += 1000; D.down(bx3, by3, g); clk += DP.REST + 60; const pts = Array.from({ length: 20 }, (_, k) => [bx3 + 3 + k * 6, by3 - k]); for (const q of pts) { clk += 25; D.move(q[0], q[1], g); } clk += 25; const rp = D.up(pts[19][0], pts[19][1], g, {});
  ok('P9 rest a moment on a bead, then drag = paint over it (the bead stays)', rp === 'paint' && c.paint && c.paint.s.length === 1 && D.pattern(r.L).notes.length === p3.notes.length, rp);
  clk += 1000; D.down(bx3, by3, g); clk += 500; for (const q of pts) { clk += 25; D.move(q[0], q[1], g); } clk += 25; const rh = D.up(pts[19][0], pts[19][1], g, { held: true }); ok('P9 a held (muting) finger never paints', rh !== 'paint' && c.paint.s.length === 1, rh);
  // swipe-select: fast across beads
  D.ops.add(r.L, 8, 2); D.ops.add(r.L, 12, 2); const p4 = D.pattern(r.L), a = p4.notes.find(q => q.s === 8) || p4.notes[0]; const ax = D.sx(g, r, a.s, p4.len) + 2, ay = D.dy(r, a.deg); clk += 1000; D.down(ax, ay, g); for (let k = 1; k <= 6; k++) { clk += 8; D.move(ax + k * 14, ay, g); } clk += 8; const rs = D.up(ax + 84, ay, g, {});
  ok('P9 a fast swipe from a bead still selects', rs === 'select' && D.sel.size >= 1, rs); D.sel.clear();
  // closed loop drawn from an empty spot = loop region
  const cx = g.x0 + g.w * .5, cy = emptyAt(D, g, r, cx) || r.y + 20, lp = []; for (let k = 0; k <= 24; k++) { const a2 = k / 24 * Math.PI * 2; lp.push([cx + Math.cos(a2) * 40 - 40, cy + Math.sin(a2) * 16]); } clk += 1000; const rl = stroke(D, g, lp, 20); ok('P9 a closed loop drawn on a lane is still the loop region', rl === 'loop', rl);
  // edge timbre (top 8 px of a lane, empty spot)
  let ex = null; for (let x = g.x0 + 6; x < g.x1 && ex == null; x += 4) { const h = D.beadAt(g, x, r.y + 3); if (h && !h.n) ex = x; } clk += 1000; const rt = stroke(D, g, [[ex, r.y + 3], [ex, r.y - 10], [ex, r.y - 30]], 30); ok('P9 dragging a lane edge is still timbre', rt === 'timbre', rt);
  // a plain lane with no ohm brain still writes stored notes
  ok('P9 lanes without an ohm brain (env / star) never paint', g.rows.filter(q => !DP.can(q.L)).length >= 1 && g.rows.filter(q => q.L.kind === 'env' || q.L.kind === 'star').every(q => !DP.can(q.L))); }
// --- P11 drawing
{ const { D, c } = W1; DP.live = null; const f1 = render(D), { r } = rowOf(D, c);
  ok('P11 painted ribbons draw (fills) and nothing writes text', (f1.calls.fill || 0) > 0 && !f1.calls.fillText && !f1.calls.strokeText, f1.calls.fillText);
  // movement: the ribbon sways with time
  const pick = f => f.segs.length; const t0 = T.t; const snapY = () => { const f = fake(); const D2 = D; D2.render(f.ctx, 412, 860, 1, 1); return f; }; const a = snapY(); T.t += .37; W1.Sf.step(1 / 60); const b = snapY(); ok('P11 the ribbons move (sway / breathe) from frame to frame', J(a.segs.slice(0, 40)) !== J(b.segs.slice(0, 40)));
  ok('P11 the brain\'s dot lattice stays hidden on a lane holding painted notes', DP.noGrid(r.L));
  // the pattern editor: no rows / columns
  D.pat = { id: r.L.id }; const f2 = render(D), g2 = D.geo(412, 860), r2 = g2.rows.find(q => q.L.id === r.L.id); const vert = f2.segs.filter(s => Math.abs(s[0] - s[2]) < .01 && Math.abs(s[3] - s[1]) >= r2.h - 1).length, hor = f2.segs.filter(s => Math.abs(s[1] - s[3]) < .01 && Math.abs(s[2] - s[0]) >= g2.x1 - g2.x0 - 1 && s[1] > r2.y && s[1] < r2.y + r2.h).length;
  ok('P11 the open pattern editor draws no grid (no full-height columns, no full-width rows)', vert === 0 && hor === 0 && !f2.calls.fillText, { vert, hor });
  ok('P11 ... its notes are living leaf shapes (curves), its loop end a swaying frond', (f2.calls.bezierCurveTo || 0) >= 2 * D.pattern(r.L).notes.length, f2.calls.bezierCurveTo);
  D.pat = null; }
// --- P12 cost
{ const { D, c, Sf } = W1; while (c.paint.s.length < DP.MAXS) { const s = JSON.parse(J(c.paint.s[0])); s.id = c.paint.seq + 1; c.paint.seq++; s.w0 += .1; c.paint.s.push(s); }
  const nop = () => { }, ctx = { beginPath: nop, moveTo: nop, lineTo: nop, quadraticCurveTo: nop, bezierCurveTo: nop, closePath: nop, fill: nop, stroke: nop, arc: nop }, g = D.geo(412, 860), r = g.rows.find(q => DP.ohm(q.L) === c), w0 = (() => { for (let i = 0; i < 200; i++) DP.draw(ctx, D, g, r, r.L, i / 60, 1); })(), t0 = pn(); for (let i = 0; i < 1000; i++) DP.draw(ctx, D, g, r, r.L, i / 60, 1); const per = (pn() - t0) / 1000;
  ok('P12 drawing ' + DP.MAXS + ' painted strokes (the most an ohm can hold) costs < .3 ms a frame (canvas calls stubbed)', per < .3, +per.toFixed(4));
  let calls = 0; const d0 = DP.draw; DP.draw = (...a) => { calls++; return d0(...a); }; D.open = false; for (let i = 0; i < 120; i++) { T.t += 1 / 60; Sf.step(1 / 60); } DP.draw = d0; ok('P12 nothing is drawn while the DAW is closed', calls === 0, calls);
  const m = c.mind, t1 = pn(); for (let i = 0; i < 2000; i++) DP.merge(Sf, m, i, []); ok('P12 the brain\'s per-bar check is cheap (< .02 ms a bar)', (pn() - t1) / 2000 < .02, (pn() - t1) / 2000);
  ok('P12 one fixed touch buffer (Float32Array) reused for every stroke', DP.buf instanceof Float32Array && DP.buf.length === DP.BUF * 4); }
performance.now = pn;
let pass = 0; for (const r of res) { console.log((r.pass ? 'ok  ' : 'FAIL') + ' ' + r.name + (r.pass ? '' : '  ' + J(r.info))); if (r.pass) pass++; }
console.log('DAWPAINT ' + pass + '/' + res.length); process.exit(pass === res.length ? 0 : 1);
