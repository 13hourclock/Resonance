'use strict';
// v08-dawpaint (Wilbow 8:44 PM MDT Oct 24 2026): "I think we should be able to paint notes in the daw river.  The notes should dictate whatever is being currently
// sung and introduced to the jam"; 8:45 PM: "Instead of a grid make the notes more organic and have movement"; card 8:45 PM: "Yes, make the pattern editor organic too".
//  1 a finger PAINTS along an ohm's river lane (from an empty spot at once; from a stored bead after a short rest): a freehand stroke, no grid shown
//  2 the stroke becomes notes: pitch settles onto the ohm's own scale tones (its tradition's scale, quarter tones where it has them), time keeps the stroke's own
//    feel with a soft pull toward the beat (PULL), a smooth slope between tones = a glide (portamento), a wobble = vibrato, a slow / firm stroke = louder
//  3 those notes DICTATE what the ohm plays in that stretch of its bars, from the next bar it has not yet planned (bars already queued play out): its improvised
//    notes there give way (drummers: only the painted kit row gives way), the crowd cap still applies (Mi.play), breakdowns / mute / quiet still lay out,
//    vocal ohms sing them with their own syllables, the brain does not bend them to chord tones (it keeps its own accents and swing: its touch)
//  4 they loop in the ohm's phrase (1, 2, 4 or 8 bars: the smallest that holds the stroke) until erased or painted over; saved with the world and the song
//  5 the stroke stays drawn as a living ribbon in the lane (leaf green, the 'painted' source colour), swaying and breathing with the river
//  6 erase = rub back and forth across a painted ribbon; undo / redo (3 / 4 fingers) take a stroke away / put it back
// Cheap: one fixed Float32Array touch buffer (reused), strokes stored as small flat arrays (<= PTS points), drawing only from D.render (DAW open), no per-frame
// allocation; Mi.genBar gains one check (c.paint) per bar per ohm.
(function (G) { const RS = G.RS = G.RS || {}; const DP = RS.DawPaint = { stats: { strokes: 0, erased: 0, dict: 0, notes: 0, rubs: 0 } };
const md = (a, n) => ((a % n) + n) % n, clamp = (x, a, b) => Math.max(a, Math.min(b, x)), TAU = Math.PI * 2;
DP.on = true;
DP.COL = [150, 255, 120];   // painted: leaf green (own = no ring, learned amber, taught cyan, the player's play-mode notes magenta)
DP.SPAN = 32;               // the river's time axis (steps), same as daw.js D.SPAN / dawbrain DB.SPAN
DP.PULL = .5;               // beat pull: a painted note moves half way toward the nearest 16th ...
DP.PULL_BEAT = .7;          // ... and 70% toward a beat-group start (the tradition's own beats) when within BEAT_NEAR steps of one
DP.BEAT_NEAR = .6;
DP.HYST = .7;               // a stroke must lean .7 of a scale step past a tone before it settles on the next one
DP.MIN_NOTE = .75;          // shorter stays on a tone = a passing touch (part of the glide), not a note
DP.GLIDE_MIN = .75;         // a slope this long (steps) into the next tone = a glide; quicker = a clean step
DP.MAX_NOTE = 8;            // a long held line re-articulates after 8 steps (half a bar of 4/4)
DP.SWAY = 2.2;              // px the ribbon sways up and down
DP.BREATH = .18;            // how much the ribbon's thickness breathes
DP.REST = 220;              // ms: rest a finger this long on a stored bead, then drag = paint (the hold-mute fires at 450 ms)
DP.PTS = 40;                // drawn points kept per stroke
DP.MAXS = 6;                // strokes per ohm (oldest out)
DP.MAXN = 48;               // painted notes per ohm
DP.BUF = 256;               // touch points per stroke (the buffer)
DP.KIT_STROKE = ['bass', 'slap', 'mute', null, 'ring'];   // kit rows: low, back, time, fill, colour
DP.KIT_SLOT = ['low', 'back', 'time', 'fill', 'colour'];
const BUF = new Float32Array(DP.BUF * 4);   // x, y, t(ms), pressure
DP.buf = BUF; DP.n = 0; DP.live = null;     // the stroke being painted (lane id) for the preview
DP.begin = (id, x, y, t, pr) => { DP.n = 0; DP.live = id; DP.push(x, y, t, pr); };
DP.push = (x, y, t, pr) => { if (DP.n >= DP.BUF) return; const i = DP.n * 4; BUF[i] = x; BUF[i + 1] = y; BUF[i + 2] = t; BUF[i + 3] = pr == null ? .5 : pr; DP.n++; };
DP.end = () => { DP.live = null; };
// ---------------- the stroke -> notes (pure; tests call it directly) ----------------
// S: samples along time: q (abs step, ascending), deg (float scale degree), sp (px/ms), pr (pressure .5 = none). o: { L, groups, drum, row(deg->kit row) }
DP.notes = (S, o) => { const out = [], n = S.length; if (!n) return out; const L = o.L || 16;
  if (o.drum) return DP.hits(S, o);
  // settle each sample onto a tone (hysteresis), then cut runs
  const tone = new Int16Array(n); let cur = Math.round(S[0].deg); for (let i = 0; i < n; i++) { const d = S[i].deg; if (Math.abs(d - cur) >= DP.HYST) cur = Math.round(d); tone[i] = cur; }
  const runs = []; let a = 0; for (let i = 1; i <= n; i++) if (i === n || tone[i] !== tone[a]) { runs.push({ a, b: i - 1, deg: tone[a], q0: S[a].q, q1: i < n ? S[i].q : S[n - 1].q + (n > 1 ? S[n - 1].q - S[n - 2].q : .25) }); a = i; }
  // short stays = passing touches: fold into the previous run (its glide tail) or, at the start, into the next
  const keep = []; for (const r of runs) { if (r.q1 - r.q0 < DP.MIN_NOTE && keep.length) { const p = keep[keep.length - 1]; p.q1 = r.q1; p.b = r.b; p.pass = (p.pass || 0) + (r.q1 - r.q0); } else if (r.q1 - r.q0 < DP.MIN_NOTE && !keep.length && runs.length > 1) { r.lead = true; keep.push(r); } else { if (keep.length === 1 && keep[0].lead) { r.q0 = keep[0].q0; r.a = keep[0].a; keep.pop(); } keep.push(r); } }
  if (keep.length === 1 && keep[0].lead) keep[0].lead = false;
  for (let k = 0; k < keep.length; k++) { const r = keep[k], nx = keep[k + 1];
    // where the stroke stopped sitting on this tone (the start of its slope into the next)
    let settle = r.b; for (let i = r.b; i >= r.a; i--) if (Math.abs(S[i].deg - r.deg) < .3) { settle = i; break; }
    const slope = nx ? r.q1 - S[settle].q : 0;
    // wobble: direction changes of the line around the tone while it sits there = vibrato
    let rev = 0, amp = 0, lastS = 0; for (let i = r.a + 1; i <= settle; i++) { const dv = S[i].deg - S[i - 1].deg; amp = Math.max(amp, Math.abs(S[i].deg - r.deg)); const sg = dv > .02 ? 1 : dv < -.02 ? -1 : 0; if (sg && lastS && sg !== lastS) rev++; if (sg) lastS = sg; }
    const vib = rev >= 2 && amp > .12 ? +clamp(amp * 2.2, .15, 1).toFixed(2) : 0;
    let sp = 0, pr = 0, prN = 0; for (let i = r.a; i <= r.b; i++) { sp += S[i].sp; if (Math.abs(S[i].pr - .5) > .01) { pr += S[i].pr; prN++; } } sp /= (r.b - r.a + 1);
    const vSp = clamp(1.05 - sp * .55, .35, 1), vel = +(prN ? clamp(vSp * .5 + (pr / prN) * .6, .3, 1) : vSp).toFixed(2);
    // long lines re-articulate; bar lines cut notes (each bar holds its own part)
    let q = r.q0; const end = r.q1; while (q < end - .2) { const barEnd = (Math.floor(q / L + 1e-6) + 1) * L, q2 = Math.min(end, q + DP.MAX_NOTE, barEnd), last = q2 >= end - .2;
      out.push({ q, d: q2 - q, deg: clamp(r.deg, -12, 12), vel, vib, gl: last && nx && slope >= DP.GLIDE_MIN && Math.abs(nx.q0 - end) < .3 ? clamp(nx.deg, -12, 12) : null }); q = q2; } }
  return DP.feel(out, o); };
// drummers: a hit where the stroke starts, at every bump (a tick up or down), and on each beat along a plain line; the row = the kit part under the finger
DP.hits = (S, o) => { const out = [], n = S.length, rowOf = o.row || (() => 0); let lastQ = -99, lastS = 0;
  const add = (i) => { const q = S[i].q; if (q - lastQ < .9) return; lastQ = q; out.push({ q, d: .5, deg: 0, vel: +clamp(1.05 - S[i].sp * .55, .35, 1).toFixed(2), vib: 0, gl: null, row: rowOf(S[i].deg) }); };
  add(0); let bumps = 0; for (let i = 1; i < n - 1; i++) { const dv = S[i].deg - S[i - 1].deg, sg = dv > .15 ? 1 : dv < -.15 ? -1 : 0; if (sg && lastS && sg !== lastS) { add(i); bumps++; } if (sg) lastS = sg; }
  if (!bumps) for (let i = 1; i < n; i++) if (S[i].q - lastQ >= 4) add(i);
  return DP.feel(out, o); };
// humanised timing: the stroke's own timing, pulled softly toward the 16th and harder toward the tradition's beat-group starts
DP.feel = (ns, o) => { const L = o.L || 16, gs = o.groups && o.groups.length ? o.groups : null; for (const nt of ns) { const bar = Math.floor(nt.q / L + 1e-6), s = nt.q - bar * L; let t = s + (Math.round(s) - s) * DP.PULL;
    if (gs) { let a = 0, best = null; for (let k = 0; k <= gs.length; k++) { if (Math.abs(s - a) < DP.BEAT_NEAR && (best == null || Math.abs(s - a) < Math.abs(s - best))) best = a; if (k < gs.length) a += gs[k]; } if (best != null) t = s + (best - s) * DP.PULL_BEAT; }
    t = clamp(t, 0, L - .25); const e = nt.q + nt.d; nt.bar = bar; nt.s = +t.toFixed(3); nt.q = bar * L + nt.s; nt.d = +Math.max(.4, Math.min(e - nt.q, L - nt.s)).toFixed(3); } return ns; };
// ---------------- painting a lane (called by daw.js D.up) ----------------
DP.ohm = L => RS.DawBrain ? RS.DawBrain.ohmOf(L) : (L && L.ref && L.ref.mind ? L.ref : null);
DP.can = L => !!(DP.on && L && (L.kind === 'creature' || L.kind === 'colony' || L.kind === 'instrument') && DP.ohm(L));
DP.drum = c => RS.DawBrain ? RS.DawBrain.drummer(c) : !!(c && c.mind && c.mind.perc > .55);
DP.rowY = (r, k) => RS.DawBrain ? RS.DawBrain.rowY(r, k) : r.y + r.h - 5 - (k + .5) * (r.h - 10) / 5;
// the kit hit an ohm has for a row (the nearest row that has one)
DP.hitFor = (c, k) => { const hs = c.P && c.P.inst && c.P.inst.dkP, Dr = RS.Drums; if (!hs || !hs.length || !Dr || !Dr.slotOf) return { k, h: null };
  for (let dk = 0; dk < 5; dk++) for (const s of dk ? [k - dk, k + dk] : [k]) { if (s < 0 || s > 4) continue; const i = hs.findIndex(q => Dr.slotOf(q.hitId) === DP.KIT_SLOT[s]); if (i >= 0) return { k: s, h: i }; } return { k, h: 0 }; };
const xq = (g, x) => clamp((x - g.x0) / g.w * DP.SPAN, 0, DP.SPAN - .01);
// paint the buffered stroke onto lane row r; returns the new stroke (or null)
DP.paint = (D, Sf, g, r) => { const L = r.L, c = DP.ohm(L); if (!c || DP.n < 2) return null; const m = c.mind, Lb = RS.Mind.barLen(m), drum = DP.drum(c), n = DP.n;
  // samples ordered by time (x), resampled every quarter step
  const P = []; for (let i = 0; i < n; i++) P.push({ q: xq(g, BUF[i * 4]), y: BUF[i * 4 + 1], t: BUF[i * 4 + 2], pr: BUF[i * 4 + 3], sp: i ? Math.hypot(BUF[i * 4] - BUF[i * 4 - 4], BUF[i * 4 + 1] - BUF[i * 4 - 3]) / Math.max(1, BUF[i * 4 + 2] - BUF[i * 4 - 2]) : 0 });
  { let a = 9, b = -9; for (const q of P) { a = Math.min(a, q.pr); b = Math.max(b, q.pr); } if (b - a < .05) for (const q of P) q.pr = .5; }   // a screen without real pressure reports a constant: use speed only
  if (P.length > 1) P[0].sp = P[1].sp; P.sort((a, b) => a.q - b.q); const q0 = P[0].q, q1 = P[P.length - 1].q; if (q1 - q0 < .5) return null;
  const degOf = y => clamp(D.yd(r, y), -12.5, 12.5), S = []; let j = 0;
  for (let q = q0; q <= q1 + 1e-6; q += .25) { while (j < P.length - 2 && P[j + 1].q < q) j++; const A = P[j], B = P[Math.min(P.length - 1, j + 1)], u = B.q > A.q ? clamp((q - A.q) / (B.q - A.q), 0, 1) : 0, y = A.y + (B.y - A.y) * u;
    S.push({ q, deg: drum ? y : degOf(y), sp: A.sp + (B.sp - A.sp) * u, pr: A.pr + (B.pr - A.pr) * u }); }
  // wipe position -> the ohm's own clock: the next time its sweep reaches the stroke's start
  const now = m.pos, A0 = now + md(q0 - now, DP.SPAN); for (const s of S) s.q = A0 + (s.q - q0);
  let rowY = null; if (drum) { rowY = y => { let best = 0, bd = 1e9; for (let k = 0; k < 5; k++) { const d = Math.abs(DP.rowY(r, k) - y); if (d < bd) { bd = d; best = k; } } return best; }; }
  const ns = DP.notes(S, { L: Lb, groups: m.groups, drum, row: rowY }); if (!ns.length) return null;
  const bar0 = ns[0].bar, span = ns[ns.length - 1].bar - bar0 + 1, p = span <= 1 ? 1 : span <= 2 ? 2 : span <= 4 ? 4 : 8, vocal = !!(RS.MouthLook && RS.MouthLook.vocal ? RS.MouthLook.vocal(c) : (c.g && c.g[168] >= .5));
  const P0 = c.paint || { s: [], seq: 0 }, id = (P0.seq || 0) + 1;
  const st = { id, p, ph: md(bar0, p), a: +(A0 - bar0 * Lb).toFixed(3), L: Lb, len: +(q1 - q0).toFixed(3), w0: +q0.toFixed(2), w1: +q1.toFixed(2), drum: drum || undefined, sing: vocal || undefined, n: [], pts: [] };
  for (const nt of ns) { const o = { r: nt.bar - bar0, s: nt.s, d: nt.d, deg: nt.deg, vel: nt.vel }; if (nt.vib) o.vib = nt.vib; if (nt.gl != null && nt.gl !== nt.deg) o.gl = nt.gl; if (drum) { const hf = DP.hitFor(c, nt.row); o.k = hf.k; o.h = hf.h; } st.n.push(o); }
  // the drawn ribbon: <= PTS points (step offset from the start, height as a degree or kit row, thickness)
  const K = Math.min(DP.PTS, S.length); for (let k = 0; k < K; k++) { const s = S[Math.round(k * (S.length - 1) / Math.max(1, K - 1))]; st.pts.push(+(s.q - A0).toFixed(2), drum ? rowY(s.deg) : +s.deg.toFixed(2), +clamp(1.05 - s.sp * .55, .35, 1).toFixed(2)); }
  const before = c.paint ? JSON.parse(JSON.stringify(c.paint)) : null;
  // painting over a stretch replaces what was painted there (drummers: only the same kit rows)
  const rows = drum ? new Set(st.n.map(o => o.k)) : null;
  let ss = P0.s.filter(o => !(o.w1 > st.w0 - .25 && o.w0 < st.w1 + .25 && (!drum || !o.drum || o.n.some(x => rows.has(x.k))))); ss.push(st); while (ss.length > DP.MAXS) ss.shift();
  let tot = 0; for (let i = ss.length - 1; i >= 0; i--) { tot += ss[i].n.length; if (tot > DP.MAXN && i < ss.length - 1) { ss = ss.slice(i + 1); break; } }
  c.paint = { s: ss, seq: id }; DP.stats.strokes++; DP.undoPush(D, c, before); return st; };
// erase: strokes on this lane whose ribbon the rub crossed (drawn positions)
DP.erase = (D, Sf, g, r, x0, x1) => { const c = DP.ohm(r.L); if (!c || !c.paint || !c.paint.s.length) return 0; const m = c.mind, Lb = RS.Mind.barLen(m), before = JSON.parse(JSON.stringify(c.paint)), a = xq(g, Math.min(x0, x1)), b = xq(g, Math.max(x0, x1));
  const hit = st => { let any = false; DP.occ(st, m.pos, Lb, S0 => { const s0 = md(S0, DP.SPAN), s1 = s0 + st.len; for (const off of [0, -DP.SPAN]) if (s1 + off >= a && s0 + off <= b) any = true; }); return any || (st.w1 >= a && st.w0 <= b); };
  const keep = c.paint.s.filter(st => !hit(st)), k = c.paint.s.length - keep.length; if (!k) return 0; c.paint = keep.length ? { s: keep, seq: c.paint.seq } : null; DP.stats.erased += k; DP.undoPush(D, c, before); return k; };
// a rub = the finger goes back and forth across the lane (>= 3 turns of >= 10 px)
DP.rub = () => { let turns = 0, dir = 0, ext = BUF[0]; for (let i = 1; i < DP.n; i++) { const x = BUF[i * 4]; if (dir >= 0 && x > ext) { ext = x; dir = 1; } else if (dir <= 0 && x < ext) { ext = x; dir = -1; } else if ((dir === 1 && ext - x >= 10) || (dir === -1 && x - ext >= 10)) { turns++; dir = -dir; ext = x; } } return turns >= 3; };
DP.xRange = () => { let a = 1e9, b = -1e9; for (let i = 0; i < DP.n; i++) { const x = BUF[i * 4]; if (x < a) a = x; if (x > b) b = x; } return [a, b]; };
// undo / redo through the DAW's own stack (3 / 4 fingers while the river is open)
DP.undoPush = (D, c, before) => { if (!D || !D.undo) return; D.undo.push({ paint: c.id, before, after: c.paint ? JSON.parse(JSON.stringify(c.paint)) : null }); D.redo = []; if (D.undo.length > 60) D.undo.shift(); if (D.touch) D.touch(); };
DP.restore = (Sf, id, v) => { const c = Sf.creatures.find(q => q.id === id); if (!c) return false; c.paint = v ? JSON.parse(JSON.stringify(v)) : null; return true; };
// each upcoming / recent occurrence of a stroke near 'now' (abs start step), fn(S)
DP.occ = (st, now, Lb, fn) => { if (!(Lb > 0)) return; const per = st.p * Lb, b0 = Math.floor((now - DP.SPAN) / Lb); let B = b0 + md(st.ph - b0, st.p); for (let k = 0; k < 64 && B * Lb < now + DP.SPAN; k++, B += st.p) { const S0 = B * Lb + st.a; if (S0 + st.len > now - 1 && S0 < now + DP.SPAN - 1) fn(S0); if (per <= 0) break; } };
// ---------------- the brain plays them (Mi.genBar wrapper; outermost, so it also overrides added play-mode notes in the span) ----------------
DP.merge = (Sf, m, bar, o) => { const c = m.c, PP = c && c.paint; if (!PP || !PP.s || !PP.s.length || !DP.on || !Array.isArray(o)) return o;
  if (m.bd || (m.quiet && !m.E) || (m.quietWatch && !m.E) || Sf.playFocus === c) return o;   // breakdowns, quiet bystanders and play mode lay out as before
  const Lb = RS.Mind.barLen(m); let out = o, n = 0;
  for (const st of PP.s) { const roff = md(bar - st.ph, st.p); let lo = 1e9, hi = -1e9, cnt = 0; for (const a of st.n) if (a.r === roff && a.s < Lb) { lo = Math.min(lo, a.s); hi = Math.max(hi, a.s + a.d); cnt++; } if (!cnt) continue;
    if (out === o) out = o.slice();
    if (st.drum) { for (const a of st.n) if (a.r === roff && a.s < Lb) for (let i = out.length - 1; i >= 0; i--) { const q = out[i]; if (!q.painted && q.perc && Math.abs(q.s - a.s) < .5) out.splice(i, 1); } }   // only the painted kit hits give way
    else for (let i = out.length - 1; i >= 0; i--) { const q = out[i]; if (!q.painted && !q.perc && q.s >= lo - .3 && q.s < hi) out.splice(i, 1); }   // its improvised notes in the painted stretch give way
    for (const a of st.n) { if (a.r !== roff || a.s >= Lb) continue; const q = { s: a.s, d: Math.min(a.d, Lb - a.s), deg: a.deg, vel: a.vel, painted: st.id };
      if (st.drum) { q.perc = true; q.hit = a.h; q.stroke = DP.KIT_STROKE[a.k] || undefined; } else { if (st.sing) q.sing = true; if (a.gl != null) q.gl = a.gl; if (a.vib) q.vib = a.vib; }
      out.push(q); n++; } }
  if (n) { out.sort((x, y) => x.s - y.s); DP.stats.dict++; DP.stats.notes += n; } return out; };
if (RS.Mind && RS.Mind.genBar && !RS.Mind.genBar._dp) { const gb = RS.Mind.genBar; RS.Mind.genBar = (Sf, m, bar) => DP.merge(Sf, m, bar, gb(Sf, m, bar)); RS.Mind.genBar._dp = 1; }
// Mi.play: a painted glide slides into the next tone over the note (synth glide = ratio per second); a wobble = vibrato. The vocal tract glides legato by itself.
DP.spec = (Sf, c, m, o, spec, f, dur) => { if (o.gl != null && !o.perc && f > 20) { const f2 = RS.Mind.hz(Sf, m, o.gl); if (f2 > 20 && Number.isFinite(f2)) spec.glide = Math.pow(f2 / f, 1 / Math.max(.05, dur)); }
  if (o.vib && !o.perc) { spec.vib = .003 + .011 * o.vib; spec.vibR = 4.6 + 1.4 * o.vib; } };
// ---------------- drawing (DAW open only) ----------------
const css = (c, a) => RS.DawBrain ? RS.DawBrain.css(c, a) : 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')';
const WH = [235, 255, 225];
DP.noGrid = L => { if (DP.live != null && L && DP.live === L.id) return true; const c = L && DP.ohm(L); return !!(c && c.paint && c.paint.s.length); };
const UP = new Float32Array(DP.PTS * 2 + 4), LO = new Float32Array(DP.PTS * 2 + 4);
// one ribbon: points (x, yMid, thick) -> a filled organic band (upper edge out, lower edge back) + a soft glow line
const ribbon = (ctx, k, col, a) => { if (k < 2) return; ctx.beginPath(); ctx.moveTo(UP[0], UP[1]); for (let i = 1; i < k; i++) { const xm = (UP[(i - 1) * 2] + UP[i * 2]) / 2, ym = (UP[(i - 1) * 2 + 1] + UP[i * 2 + 1]) / 2; ctx.quadraticCurveTo(UP[(i - 1) * 2], UP[(i - 1) * 2 + 1], xm, ym); } ctx.lineTo(UP[(k - 1) * 2], UP[(k - 1) * 2 + 1]);
  ctx.lineTo(LO[(k - 1) * 2], LO[(k - 1) * 2 + 1]); for (let i = k - 2; i >= 0; i--) { const xm = (LO[(i + 1) * 2] + LO[i * 2]) / 2, ym = (LO[(i + 1) * 2 + 1] + LO[i * 2 + 1]) / 2; ctx.quadraticCurveTo(LO[(i + 1) * 2], LO[(i + 1) * 2 + 1], xm, ym); } ctx.lineTo(LO[0], LO[1]); ctx.closePath(); ctx.fillStyle = css(col, a); ctx.fill(); };
// the painted ribbons of a lane (river, not the open pattern)
// one painted occurrence (module-level function, no per-frame closures)
const drawOcc = (ctx, D, g, r, st, S0, now, Lb, t, dim) => { const age = now - S0, near = age > -2 && age < st.len + 1, a = (near ? 1 : .6) * dim; let k = 0, prevX = -1;
  for (let i = 0; i < st.pts.length; i += 3) { const pos = S0 + st.pts[i], x = g.x0 + md(pos, DP.SPAN) / DP.SPAN * g.w; if (k && x < prevX - 2) { ribbon(ctx, k, DP.COL, .78 * a); k = 0; }   // wraps the river's edge: break the ribbon
    const ym = st.drum ? DP.rowY(r, st.pts[i + 1]) : D.dy(r, st.pts[i + 1]), sw = Math.sin(t * 1.6 + pos * .37 + st.id) * DP.SWAY, th = (1.2 + st.pts[i + 2] * 3.4) * (1 + DP.BREATH * Math.sin(t * 2.3 + pos * .5)) * (pos <= now && pos > now - 1.5 ? 1.5 : 1);
    if (k < DP.PTS + 1) { UP[k * 2] = x; UP[k * 2 + 1] = ym + sw - th; LO[k * 2] = x; LO[k * 2 + 1] = ym + sw + th; k++; } prevX = x; }
  ribbon(ctx, k, DP.COL, .78 * a);
  // the notes inside the ribbon: soft buds where each note begins (glow brighter as the brain plays them)
  const B0 = Math.floor(S0 / Lb); for (let j = 0; j < st.n.length; j++) { const nt = st.n[j], pos = (B0 + nt.r) * Lb + nt.s, x = g.x0 + md(pos, DP.SPAN) / DP.SPAN * g.w, ym = st.drum ? DP.rowY(r, nt.k) : D.dy(r, nt.deg), sw = Math.sin(t * 1.6 + pos * .37 + st.id) * DP.SWAY, hot = now >= pos && now < pos + nt.d;
    ctx.fillStyle = css(hot ? WH : DP.COL, (hot ? .95 : .55) * a); ctx.beginPath(); ctx.arc(x, ym + sw, (hot ? 3.2 : 2.2) + nt.vel * 1.6, 0, TAU); ctx.fill(); } };
// the painted ribbons of a lane (river, not the open pattern)
DP.draw = (ctx, D, g, r, L, t, dim) => { if (r.y + r.h < -4 || (g.Ht && r.y > g.Ht + 4)) return; const c = DP.ohm(L), PP = c && c.paint; if (PP && PP.s.length) { const m = c.mind, Lb = RS.Mind.barLen(m), now = m.pos;
    if (Lb > 0) for (let si = 0; si < PP.s.length; si++) { const st = PP.s[si], per = st.p * Lb, b0 = Math.floor((now - DP.SPAN) / Lb); let B = b0 + md(st.ph - b0, st.p);
      for (let k = 0; k < 64 && B * Lb < now + DP.SPAN; k++, B += st.p) { const S0 = B * Lb + st.a; if (S0 + st.len > now - 1 && S0 < now + DP.SPAN - 1) drawOcc(ctx, D, g, r, st, S0, now, Lb, t, dim); if (per <= 0) break; } } }
  // the stroke being painted right now (screen points straight from the touch buffer)
  if (DP.live != null && DP.live === L.id && DP.n > 1) { let k = 0; const step = Math.max(1, Math.ceil(DP.n / (DP.PTS + 1))); for (let i = 0; i < DP.n && k < DP.PTS + 1; i += step) { const x = BUF[i * 4], y = BUF[i * 4 + 1], sp = i ? Math.hypot(x - BUF[(i - step) * 4], y - BUF[(i - step) * 4 + 1]) / Math.max(1, BUF[i * 4 + 2] - BUF[(i - step) * 4 + 2]) : 0, th = 1.4 + clamp(1.05 - sp * .55, .35, 1) * 3.4, sw = Math.sin(t * 1.6 + x * .02) * DP.SWAY * .5; UP[k * 2] = x; UP[k * 2 + 1] = y + sw - th; LO[k * 2] = x; LO[k * 2 + 1] = y + sw + th; k++; } ribbon(ctx, k, DP.COL, .6 * dim); } };
// the open pattern editor, de-gridded: a stored note = a swaying leaf-shaped stroke (pitch = height, time flows left to right), chords = a soft tendril
DP.patNote = (ctx, X, Y, w, rad, col, a, t, k, sel) => { const sw = Math.sin(t * 1.5 + k * .9) * DP.SWAY, sw2 = Math.sin(t * 1.5 + k * .9 + 1.3) * DP.SWAY, br = 1 + DP.BREATH * Math.sin(t * 2.1 + k);
  const h = rad * br, x1 = X + Math.max(w, rad * 1.6); ctx.beginPath(); ctx.moveTo(X - rad * .9, Y + sw); ctx.bezierCurveTo(X - rad * .4, Y + sw - h * 1.15, x1 - (x1 - X) * .45, Y + sw2 - h * .7, x1, Y + sw2); ctx.bezierCurveTo(x1 - (x1 - X) * .45, Y + sw2 + h * .7, X - rad * .4, Y + sw + h * 1.15, X - rad * .9, Y + sw); ctx.closePath();
  ctx.fillStyle = css(col, a); ctx.fill(); if (sel) { ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.lineWidth = 1.5; ctx.stroke(); } return sw; };
DP.tendril = (ctx, X, Y, Y2, col, a, t, k) => { const sw = Math.sin(t * 1.5 + k * .9) * DP.SWAY; ctx.strokeStyle = css(col, a); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(X, Y + sw); ctx.quadraticCurveTo(X + 6 * Math.sin(t + k), (Y + Y2) / 2, X, Y2 + sw); ctx.stroke(); };
// the loop's end in the open pattern: a glowing living frond instead of a bar (still the loop-length handle)
DP.patEnd = (ctx, x, y0, y1, col, t) => { ctx.strokeStyle = css(col, .75); ctx.lineWidth = 3; ctx.beginPath(); for (let k = 0; k <= 12; k++) { const y = y0 + (y1 - y0) * k / 12, xx = x + Math.sin(t * 1.8 + k * .7) * 2.5; k ? ctx.lineTo(xx, y) : ctx.moveTo(xx, y); } ctx.stroke(); ctx.strokeStyle = css(col, .18); ctx.lineWidth = 9; ctx.stroke(); };
})(typeof window !== 'undefined' ? window : globalThis);
