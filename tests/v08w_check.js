// v0.8b4 headless check (Wilbow 3:32 PM MDT Oct 23 2026): moving ohms. Loop select vs catch, call, tap tempo, group drag, drop-still home, call-spot home,
// drift home, home persistence, off-screen home shifts refused.
const T = require('./node_env.js'), RS = global.RS, Hd = RS.Herd;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const loop = (cx, cy, r, n = 40) => { const pts = [], times = []; for (let i = 0; i <= n; i++) { const a = i / n * Math.PI * 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); times.push(i * 16); } return { pts, times }; };
const scene = () => { const o = T.scene({ clear: true, useed: 3 }), Sf = o.Sf || o, x0 = (Sf.view.x0 + Sf.view.x1) / 2; const a = T.add(Sf, T.plain(11), x0 - 40), b = T.add(Sf, T.plain(12), x0 + 40); T.run(Sf, .5); return { Sf, a, b, x0 }; };
const dist = (c, p) => Math.hypot(c.x - p[0], c.y - p[1]);
// W1-W3 loop select vs catch
{ const { Sf, a, b } = scene(), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2, L = loop(cx, cy, 90), r = Sf.stroke(L.pts, L.times, {});
  ok('W1 a closed loop round 2 ohms SELECTS them (no catch)', r && r.k === 'select' && r.n === 2 && !a.caught && !b.caught, r && { k: r.k, n: r.n }); }
{ const { Sf, a, b } = scene(), L = loop(a.x, a.y, 30), r = Sf.stroke(L.pts, L.times, {});
  ok('W2 a plain loop round ONE ohm still catches it (unchanged)', r && r.k === 'catch' && a.caught && !Sf.herd, r && r.k); }
{ const { Sf, a } = scene(), L = loop(a.x, a.y, 30), r = Sf.stroke(L.pts, L.times, { endHold: 600 });
  ok('W3 a loop round one ohm whose end RESTS (>= CLAY_HOLD) selects it', r && r.k === 'select' && r.n === 1 && !a.caught, r && r.k); }
{ const { Sf, a } = scene(), L = loop(a.x, a.y, 30), r = Sf.stroke(L.pts, L.times, { star: [a.x, a.y], starR: 60 });
  ok('W4 the record-star loop keeps priority over select / catch', r && r.k === 'record', r && r.k); }
// W5-W8 call + tap tempo
{ const { Sf, a, b, x0 } = scene(), L = loop((a.x + b.x) / 2, (a.y + b.y) / 2, 90); Sf.stroke(L.pts, L.times, {}); const sx = x0 + 150, sy = Sf.ground(sx) - 30, r = Hd.call(Sf, sx, sy);
  ok('W5 a call with a group selected calls the whole group', r && r.group && r.n === 2 && a.called && b.called, r);
  T.run(Sf, 12); ok('W6 the called group walks to the spot (both within 70 px after 12 s)', dist(a, [sx, sy]) < 70 && dist(b, [sx, sy]) < 70, { a: Math.round(dist(a, [sx, sy])), b: Math.round(dist(b, [sx, sy])) });
  const t0 = T.t; let tr = null; for (let i = 0; i < 4; i++) { tr = Hd.tempoTap(Sf, sx + 5, sy - 3, 1, t0 + i * .5) || tr; } const m = a.mind;
  ok('W7 four taps 0.5 s apart on the call spot set 120 bpm on the called ohms', tr && tr.k === 'tempo' && tr.bpm === 120 && a.tapBpm === 120 && b.tapBpm === 120 && (!m || m.bpmT === 120), tr);
  ok('W8 a tap far from the call spot is not a tempo tap', Hd.tempoTap(Sf, sx + 300, sy, 1, t0 + 2.2) === null);
  const h = Hd.callHold(Sf, sx, sy, 1); ok('W9 holding the called spot sets home there for the called ohms', h && h.k === 'home' && h.how === 'call' && a.homeSet && b.homeSet && dist(a, a.homeSet) < 90, h && h.n);
  T.run(Sf, 32); ok('W10 the call ends after ~30 s and they stay home (anchor = home)', !a.called && !b.called && a.anchor && Math.hypot(a.anchor[0] - a.homeSet[0], a.anchor[1] - a.homeSet[1]) < 1, { ac: !!a.called }); }
{ const { Sf, a, b } = scene(); Sf.lastOhm = { id: b.id, t: T.t }; const sx = b.x - 160, r = Hd.call(Sf, sx, Sf.ground(sx) - 30);
  ok('W11 without a selection the call goes to the watched (last touched) ohm only', r && !r.group && r.n === 1 && r.ids[0] === b.id && !a.called, r); }
// W12-W14 group drag + drop-still home
{ const { Sf, a, b } = scene(), L = loop((a.x + b.x) / 2, (a.y + b.y) / 2, 90); Sf.stroke(L.pts, L.times, {}); const b0 = [b.x, b.y], a0 = [a.x, a.y], g = Sf.grabStart(a.x, a.y); let tx = a.x, ty = a.y;
  for (let i = 0; i < 60; i++) { tx += 2.5; Sf.grabMove(tx, ty); T.run(Sf, 1 / 60); } const mv = Math.hypot(b.x - b0[0], b.y - b0[1]), ma = Math.hypot(a.x - a0[0], a.y - a0[1]);
  ok('W12 dragging a selected member moves the group (the other member follows: > 0.7x the dragged one, > 50 px)', !!g && mv > 50 && mv > .7 * ma && b.herdDrag, { mv: Math.round(mv), ma: Math.round(ma) });
  T.run(Sf, .5); ok('W13 no home yet after 0.5 s still', !a.homeSet);
  T.run(Sf, .7); ok('W14 the finger kept still 1 s after a drag = home for the whole group (soft marker)', a.homeSet && b.homeSet && (Sf.homeMarks || []).length >= 2, { a: a.homeSet, b: b.homeSet });
  Sf.grabEnd(0, 0); T.run(Sf, .1); ok('W15 the group drag ends with the grab (no member left flagged)', !b.herdDrag && !a.grabbed); }
// W16-W18 drift home, persistence, off-screen shifts
{ const { Sf, a } = scene(); Hd.setHome(Sf, [a], 'drop'); const H = a.homeSet.slice(); const g = Sf.grabStart(a.x, a.y); let tx = a.x; for (let i = 0; i < 40; i++) { tx += 7; Sf.grabMove(tx, a.y); T.run(Sf, 1 / 60); } Sf.grabEnd(0, 0); const d0 = dist(a, H); T.run(Sf, 25);
  ok('W16 dragged away without the still rest, an ohm drifts back home', d0 > 150 && dist(a, H) < 110, { d0: Math.round(d0), d1: Math.round(dist(a, H)) });
  const s = Sf.serialCreature(a); const c2 = Sf.loadCreature(Object.assign({}, s, { id: undefined }));
  ok('W17 the home is saved and restored with the ohm', s.homeSet && c2.homeSet && c2.homeSet[0] === a.homeSet[0]);
  ok('W18 an off-screen home shift (pairs6) never moves a player-set home', !RS.Pairs || !RS.Pairs.shiftHome || RS.Pairs.shiftHome(Sf, a, a.x + 200, a.y, 'test') === false); }
// W19 selection clears after ~20 s; Herd.clear
{ const { Sf, a, b } = scene(), L = loop((a.x + b.x) / 2, (a.y + b.y) / 2, 90); Sf.stroke(L.pts, L.times, {}); const s0 = !!Sf.herd; T.run(Sf, 21);
  ok('W19 the selection times out (~20 s)', s0 && !Sf.herd); Sf.stroke(L.pts, L.times, {}); ok('W20 Herd.clear (an empty-ground tap) clears it', RS.Herd.clear(Sf, 'tap') && !Sf.herd); }
// W21 idle cost: Herd.tick with nothing going on is a few property reads
{ const { Sf } = scene(); const t0 = process.hrtime.bigint(); for (let i = 0; i < 20000; i++) Hd.tick(Sf); const us = Number(process.hrtime.bigint() - t0) / 1e3 / 20000; ok('W21 idle Herd.tick < 2 us', us < 2, +us.toFixed(3)); }
console.log('v08w_check ' + res.filter(Boolean).length + '/' + res.length); process.exit(res.every(Boolean) ? 0 : 1);
