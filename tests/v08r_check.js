// v0.8a9 (Wilbow 12:06 / 12:07) headless check: RANDOM VOICES for drawn blobs/rods and default spiral ohms.
// R1 30 blobs + 30 rods: all 9 engines, none over ~25 %, wide pairwise timbre spread, bell-like (inharmonic + decaying dominant) under 20 %
// R2 save/reload keeps a v2 shape's voice; a pre-0.8a9 save (4-element dr) keeps its old v1 voice
// R3 30 default spiral ohms: all 9 engines, none over ~25 %, spread, few bells; the stroke reading still decides drums/pads (lean kept)
// R4 voices fixed for life: after 90 s of jamming no ohm or shape changed its voice; no ohm took a shape's voice
const T = require('./node_env.js'), RS = global.RS, Sh = RS.Shapes, VM = require('./voice_metrics.js');
let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const fresh = (u = 1) => { const { Sf } = T.scene({ clear: true, useed: u }); Sf.noSeedItems = Sf.noPatches = true; Sf.items = []; Sf.moldOn = false; T.run(Sf, .1); return Sf; };
const circle = (x, y, r, n = 24) => { const p = []; for (let k = 0; k <= n; k++) { const a = k / n * Math.PI * 2; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } return p; };
const spiral = (x, y, r, turns, n = 60) => { const p = []; for (let k = 0; k <= n; k++) { const t = k / n, a = t * turns * Math.PI * 2; p.push([x + Math.cos(a) * r * (.15 + .85 * t), y + Math.sin(a) * r * (.15 + .85 * t)]); } return p; };
const N = 30, MAXF = .25, SPREAD = 1.2, BELL = .2;
const summary = (rs) => { const h = VM.hist(rs.map(r => r.e)), mx = Math.max(...Object.values(h)) / rs.length; return { h, mx: +mx.toFixed(2), sp: VM.spread(rs.map(r => r.v)), bell: rs.filter(r => r.bell).length / rs.length }; };
// ---- R1 ----
const shapes = {};
for (const kind of ['blob', 'rod']) { const Sf = fresh(), rs = [], bs = [];
  for (let s = 1; rs.length < N && s < 120; s++) { const cx = Sf.view.cx + (s % 10) * 160 - 800, gy = Sf.ground(cx) - Math.floor(s / 10) * 260, pts = kind === 'blob' ? circle(cx, gy - 120, 30 + (s % 4) * 10) : [[cx - 60, gy - 100], [cx, gy - 140 - s % 30], [cx + 60, gy - 120]];
    const r = Sf.stroke(pts, pts.map((_, i) => i * 30), { z: 1 }), b = r && r.id != null ? Sf.W.bodies.get(r.id) : null; if (!b || !b.drawn || b.kind !== kind) continue;
    const q = Sh.ring(b), P = Sh.voice(b, null), sh = Sh.share(b); rs.push({ e: VM.eng(P), v: VM.vec(P, [sh, VM.harmDev(q.R) * (1 - sh)]), bell: VM.bell(P, 1 - sh, VM.harmDev(q.R)) }); bs.push(b); }
  const S = summary(rs); shapes[kind] = { Sf, bs };
  ok(`R1 ${N} drawn ${kind}s`, rs.length === N && bs.every(b => b.dr.v === 2), rs.length);
  ok(`R1 ${kind}s reach all 9 engines`, RS.ENGINES.every(e => S.h[e]), S.h);
  ok(`R1 ${kind}s: no engine over ${MAXF * 100}%`, S.mx <= MAXF, S.mx);
  ok(`R1 ${kind}s: pairwise timbre spread mean > ${SPREAD}`, S.sp.mean > SPREAD && S.sp.min > .15, S.sp);
  ok(`R1 ${kind}s: bell-like under ${BELL * 100}%`, S.bell < BELL, S.bell);
  ok(`R1 ${kind}s: the engine voice is louder than the modal ring`, bs.every(b => Sh.share(b) >= .55), Math.min(...bs.map(Sh.share)));
  const fams = new Set(bs.map(b => Sh.ring(b).fam)); ok(`R1 ${kind}s: ring characters vary`, fams.size >= 4, [...fams]); }
// ---- R2 ----
{ const { Sf, bs } = shapes.blob, b = bs[5], sb = JSON.parse(JSON.stringify(Sf.serialBody(b))), Sf2 = fresh(2), b2 = Sf2.loadBody(sb);
  ok('R2 v2 save/reload -> identical voice + ring', b2 && b2.dr.v === 2 && JSON.stringify(Sh.voice(b, null)) === JSON.stringify(Sh.voice(b2, null)) && JSON.stringify(Sh.ring(b).R) === JSON.stringify(Sh.ring(b2).R) && Sh.share(b) === Sh.share(b2), b2 && b2.dr);
  const old = JSON.parse(JSON.stringify(sb)); old.dr = old.dr.slice(0, 4); const b3 = fresh(3).loadBody(old);
  ok('R2 a pre-0.8a9 save keeps its v1 voice (bag genome, no ring remap)', b3 && b3.dr.v === 1 && !Sh.ring(b3) && JSON.stringify(Sh.voice(b3, .2)) === JSON.stringify((() => { const g = Sh.genome(b3); g[RS.IG.exc] = .2; g[RS.IG.res] = Sh.resOf(b3); return RS.Inst.fromGenome(g); })()), b3 && b3.dr);
  const spec = { modes: [{ f: 200, a: .5, d: .8 }, { f: 318, a: .3, d: .6 }, { f: 427, a: .2, d: .5 }] }; Sh.reRing(b3, spec); ok('R2 v1 shape: modal ring untouched', spec.modes[1].f === 318); }
// ---- R3 ----
const ohmW = fresh(7); const spun = [];
{ const rs = [], all = []; let drumTight = 0, tightN = 0;
  for (let s = 1; rs.length < N && s < 600; s++) { const Sf = fresh(1 + s), rr = RS.rng(s * 97 + 5), cx = Sf.view.cx + (s % 7) * 30 - 90, gy = Sf.ground(cx), pts = spiral(cx, gy - 220, 70 + rr() * 45, 1.8 + rr() * .8);
    const r = Sf.stroke(pts, pts.map((_, i) => i * 14), { z: 1 }), c = r && r.c != null ? Sf.creatures.find(q => q.id === r.c) : null; if (!c) continue; all.push(c);
    if (c.g.spun && c.g.spun.voice) continue; const P = c.P.inst; rs.push({ e: VM.eng(P), v: VM.vec(P), bell: VM.bell(P) }); }
  for (let s = 1; s <= 10; s++) { const Sf = fresh(900 + s), cx = Sf.view.cx, gy = Sf.ground(cx), pts = spiral(cx, gy - 200, 40, 2.4); const r = Sf.stroke(pts, pts.map((_, i) => i * 14), { z: 1 }), c = r && r.c != null ? Sf.creatures.find(q => q.id === r.c) : null; if (c) { tightN++; if (c.g.spun && String(c.g.spun.voice).startsWith('drum:')) drumTight++; } }
  const S = summary(rs);
  ok(`R3 ${N} default spiral ohms`, rs.length === N, rs.length);
  ok('R3 default spirals reach all 9 engines', RS.ENGINES.every(e => S.h[e]), S.h);
  ok(`R3 default spirals: no engine over ${MAXF * 100}%`, S.mx <= MAXF, S.mx);
  ok(`R3 default spirals: pairwise timbre spread mean > ${SPREAD}`, S.sp.mean > SPREAD && S.sp.min > .15, S.sp);
  ok(`R3 default spirals: bell-like under ${BELL * 100}%`, S.bell < BELL, S.bell);
  ok('R3 stroke reading still leads: a small tight spiral is still a drummer', tightN >= 8 && drumTight >= tightN * .8, { drumTight, tightN });
  ok('R3 default spirals marked dflt (budding/breeding untouched: no spinDefault outside a spiral)', all.filter(c => c.g.spun && !c.g.spun.voice).every(c => c.g.spun.dflt)); }
// ---- R4 ----
{ const Sf = ohmW, V = Sf.view, cs = [], bs = [];
  for (let k = 0; k < 6; k++) { const cx = V.cx - 300 + k * 120, gy = Sf.ground(cx), pts = spiral(cx, gy - 220, 80, 2); const r = Sf.stroke(pts, pts.map((_, i) => i * 14), { z: 1 }); const c = r && r.c != null ? Sf.creatures.find(q => q.id === r.c) : null; if (c) cs.push(c); }
  for (let k = 0; k < 3; k++) { const cx = V.cx - 150 + k * 150, gy = Sf.ground(cx), pts = k === 1 ? circle(cx, gy - 80, 30) : [[cx - 50, gy - 60], [cx + 50, gy - 90]]; const r = Sf.stroke(pts, pts.map((_, i) => i * 30), { z: 1 }), b = r && r.id != null ? Sf.W.bodies.get(r.id) : null; if (b && b.drawn) bs.push(b.uid); }
  const sig = c => JSON.stringify([VM.eng(c.P.inst), c.P.inst.eng, c.P.inst.cut, c.P.inst.att, c.P.inst.dec]), bv = uid => { const b = [...Sf.W.bodies.values()].find(q => q.uid === uid); return b ? JSON.stringify([b.dr, Sh.voice(b, null)]) : null; };
  const c0 = cs.map(sig), b0 = bs.map(bv); T.run(Sf, 90); const live = cs.filter(c => !c.dead);
  ok('R4 setup: 6 ohms + 3 shapes', cs.length === 6 && bs.length === 3, { c: cs.length, b: bs.length });
  ok('R4 after 90 s of jamming every ohm keeps its voice', live.length > 0 && live.every(c => sig(c) === c0[cs.indexOf(c)]), { live: live.length });
  ok('R4 every shape keeps its voice', bs.every((u, i) => bv(u) === null || bv(u) === b0[i]));
  const sv = bs.map(u => { const b = [...Sf.W.bodies.values()].find(q => q.uid === u); return b ? JSON.stringify(Sh.voice(b, null)) : ''; }); ok('R4 no ohm took a shape\'s voice', live.every(c => !sv.includes(JSON.stringify(c.P.inst)))); }
// ---- R5 (item 4): the radial ground helpers that replaced top-half-only Sf.ground(x) in abilities/creature/items/orbit/symbio ----
{ const Sf = fresh(11), P = Sf.P, x = Sf.view.cx + 30, gy = Sf.ground(x);
  const a = Sf.surfAt(x, gy - 50, 14); ok('R5 top: surfAt = the old ground(x) - lift', Math.abs(a[0] - x) < 2 && Math.abs(a[1] - (gy - 14)) < 2, a.map(v => +v.toFixed(1)));
  const T0 = Sf.tanAt(x, gy - 5), gl = Sf.ground(x - 12), gr = Sf.ground(x + 12), tl = Math.hypot(24, gr - gl); ok('R5 top: tanAt = the old ground slope', Math.abs(T0.tx - 24 / tl) < .02 && Math.abs(T0.ty - (gr - gl) / tl) < .02 && Math.abs(T0.c - 1) < .05, T0);
  ok('R5 top: alt = ground(x) - y', Math.abs(Sf.alt(x, gy - 100) - 100) < 3, Sf.alt(x, gy - 100));
  const [bx, by] = P.top(Math.PI), r = Math.hypot(bx - P.cx, by - P.cy), ux = (bx - P.cx) / r, uy = (by - P.cy) / r, hx = bx + ux * 80, hy = by + uy * 80;
  const b = Sf.surfAt(hx, hy, 10); ok('R5 underside: surfAt lands on the bottom ground (not the top)', Math.hypot(b[0] - (bx + ux * 10), b[1] - (by + uy * 10)) < 3, { b: b.map(v => v | 0), want: [bx + ux * 10 | 0, by + uy * 10 | 0] });
  ok('R5 underside: alt is the radial height', Math.abs(Sf.alt(hx, hy) - 80) < 3, Sf.alt(hx, hy));
  const Tb = Sf.tanAt(hx, hy); ok('R5 underside: tangent is horizontal-ish and points the other way (th = pi)', Math.abs(Tb.ty) < .3 && Tb.tx < 0 && Tb.c < -.9, Tb);
  const q = Sf.surfArc(hx, hy, 100, 0), d = Math.hypot(q[0] - bx, q[1] - by); ok('R5 underside: surfArc walks along the ground', d > 80 && d < 130 && Math.hypot(q[0] - P.top(P.theta(q[0], q[1]))[0], q[1] - P.top(P.theta(q[0], q[1]))[1]) < 2, { d: d | 0 }); }
console.log(`v08r_check: ${pass}/${tot} passed`);
