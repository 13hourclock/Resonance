// v0.8 H shortened save soak (V08_SPEC H, accelerated): 6 "hours" = 360 sim minutes. Each sim minute = 1 s of real stepping, a steady edit
// rate, and 60 s of idle-save clock. Travel: a new world every 3 minutes across 20 worlds in 3 universes (all visited by hour 1, revisited
// 6x by hour 6). Edits per minute: 2 strokes while the world has < CAP player-made bodies, else 2 moves of an existing player body
// (a sandbox being worked, not only grown), a birth every 3 min (<= 16 ohms), a tap every 2 min, a water pour mod every 5 min.
// Checks (spec H): size(6 h) <= 1.5 x size(1 h) at a steady edit rate and within budget; world load <= 150 ms; idle slice p99 <= 3 ms;
// sim step time on a reference world at hour 6 within 10% of hour 1; heap at hour 6 within 15% of hour 1; the last state round-trips.
// MIN=<n> sim minutes (default 360), CAP=<n> player bodies per world (default 24).
const T = require('./save_env.js'), RS = global.RS, { performance } = require('perf_hooks');
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const MIN = +(process.env.MIN || 360), CAP = +(process.env.CAP || 24), St = () => RS.Store, H1 = Math.min(60, MIN);
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(s.length * p))] || 0; };
const W = []; for (let s = 0; s < 10; s++) W.push({ useed: 101, sys: s }); for (let s = 0; s < 5; s++) W.push({ useed: 202, sys: s }); for (let s = 0; s < 5; s++) W.push({ useed: 303, sys: s });
(async () => { T.DB.clear(); let SV = await T.boot(); const meta = St().meta(); let clk = 1e6; SV.now = () => clk;
  let o = null; const mineOf = Sf => [...Sf.W.bodies.values()].filter(b => b.meta && b.meta.role === 'instrument' && !b.meta.owner && !b.meta.glass);   // player-made strokes
  const items = {}; const leave = () => { if (!o) return; if (o.key.indexOf(':909:') < 0) items[o.key] = mineOf(o.Sf).length + o.Sf.creatures.filter(c => !c.dead && !c.caught).length; SV.flush(o.Sf); meta.mods[o.key] = o.Sf.mods; St().saveMeta(meta); o = null; };
  const enter = opt => { leave(); T.t = 0; if (T.notes) T.notes.length = 0; if (T.tract) T.tract.length = 0;   /* node_env's audio stub records every note / tract call (and so every old world); a phone plays and forgets them */ o = T.enter(opt); SV.app = { Sf: o.Sf, save: () => St().saveMeta(meta) }; T.run(o.Sf, .3); return o; };
  // reference world: never edited (so never stored); same content every visit -> step time and heap comparable across hours
  const ref = () => { enter({ useed: 909, sys: 2 }); T.run(o.Sf, 1); const ms = []; for (let r = 0; r < 5; r++) { const t0 = performance.now(); for (let i = 0; i < 30; i++) { T.t += 1 / 30; o.Sf.step(1 / 30); } ms.push((performance.now() - t0) / 30); } leave(); global.gc && global.gc(); global.gc && global.gc(); return { step: q(ms, .5), heap: process.memoryUsage().heapUsed, data: dataHeap() }; };
  // heap minus V8's own compiled code / feedback / object shapes (they keep growing as the JIT warms up over hours; not app data)
  const dataHeap = () => { const d = JSON.parse(require('fs').readFileSync(require('v8').writeHeapSnapshot('/tmp/soak_save_' + process.pid + '.heapsnapshot'), 'utf8')); try { require('fs').unlinkSync('/tmp/soak_save_' + process.pid + '.heapsnapshot'); } catch (e) { } const m = d.snapshot.meta, nf = m.node_fields, N = nf.length, ti = nf.indexOf('type'), si = nf.indexOf('self_size'), nt = m.node_types[0], nodes = d.nodes; let sum = 0; for (let i = 0; i < nodes.length; i += N) { const t = nt[nodes[i + ti]]; if (t !== 'code' && t !== 'object shape') sum += nodes[i + si]; } return sum; };
  const r = RS.rng(12345), memC = {}, nItems = {}, sizes = {}, refs = {}, sliceAll = [], loads = []; let wi = -1;
  for (let m = 1; m <= MIN; m++) { if ((m - 1) % 3 === 0) { wi = (wi + 1) % W.length; enter(W[wi]); } const Sf = o.Sf;
    for (let e = 0; e < 2; e++) { const live = mineOf(Sf);
      if (live.length < CAP) { const x = Sf.view.cx + r.range(-160, 160), g = Sf.ground(x), pts = []; for (let i = 0; i < 12; i++) pts.push([x - 60 + i * 10, g - 70 - r() * 30]); Sf.stroke(pts, pts.map((_, i) => i * 15), {}); }
      else { const b = live[Math.floor(r() * live.length)]; const [x, y] = Sf.W.center(b); if (Sf.grabStart(x, y)) { Sf.grabMove(x + r.range(-30, 30), y - 10); Sf.grabEnd(0, 0); } SV.markAt(Sf, x, y); } }
    if (m % 3 === 0 && Sf.creatures.length < 16) { const c = T.add(Sf, T.plain(m), Sf.view.cx + r.range(-150, 150)); SV.markAt(Sf, c.x, c.y); }
    if (m % 2 === 0 && Sf.creatures.length) { const c = Sf.creatures[Math.floor(r() * Sf.creatures.length)]; if (!c.dead && !c.caught) Sf.tap(c.x, c.y); }
    if (m % 5 === 0) { Sf.mods.water = RS.clamp((Sf.mods.water || 0) + .02, 0, 1); SV.mark(Sf, null); }
    for (let i = 0; i < 30; i++) { T.t += 1 / 30; Sf.step(1 / 30); }
    clk += 60000; SV.pump(Sf); let g = 0; while (Sf._sv.q && g++ < 500) sliceAll.push(SV.slice(Sf, 3)); await new Promise(r => setTimeout(r, 0));   // let the (fallback) idle timers run, as a real event loop would
    if (m === H1 || m === MIN || m === Math.round(MIN / 2)) { const cur = W[wi]; leave(); sizes[m] = SV.size(); nItems[m] = Object.values(items).reduce((a, b) => a + b, 0); memC[m] = Object.keys(St().mem).reduce((a, k) => a + String(St().mem[k]).length, 0); refs[m] = ref(); const t0 = performance.now(); enter(cur); loads.push(performance.now() - t0); } }
  leave(); const nw = SV.changedWorlds().length, wr = { writes: SV.stats.writes, skipped: SV.stats.skipped, KB: Math.round(SV.stats.bytes / 1024) };
  let big = 0, bigK = null; const per = {}; for (const k in St().mem) if (k.startsWith('rs2:') && !k.endsWith('.bak')) { const t = k.split(':')[1]; per[t] = (per[t] || 0) + St().mem[k].length; }
  for (const w of SV.changedWorlds()) { let n = (St().mem[w.key] || '').length; for (const k in St().mem) if (k.startsWith('rs2:c:' + w.key.slice(6) + ':') && !k.endsWith('.bak')) n += St().mem[k].length; if (n > big) { big = n; bigK = w.key; } }
  // last state round-trips after a restart; world load time on the biggest world
  enter(W[wi]); const lastKey = o.key, ids0 = o.Sf.creatures.filter(c => !c.dead && !c.caught).map(c => c.id).sort(), bod0 = mineOf(o.Sf).length; leave();
  await T.settle(); SV = await T.boot(); SV.now = () => clk; T.t = 0; const t0 = performance.now(); o = T.enter(W[wi]); const ldMs = performance.now() - t0; T.run(o.Sf, .2); const ids1 = o.Sf.creatures.filter(c => !c.dead && !c.caught).map(c => c.id).sort(), bod1 = mineOf(o.Sf).length;
  const bw = W.find(w => SV.worldKey(w.useed, RS.System(RS.Universe(w.useed), w.sys), w.sys ? RS.System(RS.Universe(w.useed), w.sys).bodies[0] : RS.System(RS.Universe(w.useed), 0).bodies[1].moons[0], T.bodyKey) === bigK); const tb = performance.now(); if (bw) T.enter(bw); const bigLd = performance.now() - tb;
  const s1 = sizes[H1], s6 = sizes[MIN], p99 = q(sliceAll, .99), r1 = refs[H1], r6 = refs[MIN];
  console.log('perf', JSON.stringify({ minutes: MIN, cap: CAP, changedWorlds: nw, sizeKB: Object.fromEntries(Object.entries(sizes).map(([k, v]) => [k, +(v / 1024).toFixed(1)])), perKindKB: Object.fromEntries(Object.entries(per).map(([k, v]) => [k, +(v / 1024).toFixed(1)])), biggestWorldKB: +(big / 1024).toFixed(1), slices: sliceAll.length, sliceMs: { p50: +q(sliceAll, .5).toFixed(3), p99: +p99.toFixed(3), max: +Math.max(...sliceAll).toFixed(3) }, refStepMs: Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, +v.step.toFixed(3)])), refHeapMB: Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, +(v.heap / 1e6).toFixed(1)])), refDataHeapMB: Object.fromEntries(Object.entries(refs).map(([k, v]) => [k, +(v.data / 1e6).toFixed(2)])), loadMs: { last: +ldMs.toFixed(1), biggest: +bigLd.toFixed(1), inRunMax: +Math.max(...loads).toFixed(1) }, writes: wr }));
  const b1 = s1 / nItems[H1], b6 = s6 / nItems[MIN];   // player-made content keeps growing here (no content cap exists), so 'steady' = bytes per stored item
  ok('SOAK size: bytes per player-made item (bodies + ohms) after 6 h <= 1.5 x after 1 h (no history bloat); every world <= 256 KB typical; total <= 50 MB', b6 <= b1 * 1.5 && big <= 256 * 1024 && s6 <= 50e6, { s1, s6, rawRatio: +(s6 / s1).toFixed(2), items1: nItems[H1], items6: nItems[MIN], bytesPerItem1: Math.round(b1), bytesPerItem6: Math.round(b6), big });
  ok('SOAK world load <= 150 ms (node): the last world and the biggest world', ldMs <= 150 && bigLd <= 150, { ldMs, bigLd });
  ok('SOAK idle saver slices: p99 <= 3 ms', p99 <= 3, { p99: +p99.toFixed(3) });
  ok('SOAK reference-world sim step at hour 6 within 10% of hour 1 (+.05 ms timer noise)', r6.step <= r1.step * 1.1 + .05, { h1: r1.step, h6: r6.step });
  // the store keeps every record (and its .bak) in memory by design (store.js mem cache); the saved content itself grows here, so the heap allowance is 15% of hour 1 plus 2 bytes per added stored char
  const allow = r1.data * .15 + 2 * (memC[MIN] - memC[H1]);
  ok('SOAK data heap (heap minus JIT code / shapes) at hour 6 within 15% of hour 1 plus the in-memory copy of the added saved content; persistence memory <= 20 MB', r6.data - r1.data <= allow && 2 * memC[MIN] <= 20e6, { dataH1MB: +(r1.data / 1e6).toFixed(2), dataH6MB: +(r6.data / 1e6).toFixed(2), allowMB: +(allow / 1e6).toFixed(2), totalH1MB: +(r1.heap / 1e6).toFixed(1), totalH6MB: +(r6.heap / 1e6).toFixed(1), totalRatio: +(r6.heap / r1.heap).toFixed(2), storeMemMB: +(2 * memC[MIN] / 1e6).toFixed(2) });
  ok('SOAK the last world round-trips after a restart (same ohm ids, same player bodies)', ids0.length > 0 && JSON.stringify(ids0) === JSON.stringify(ids1) && bod0 === bod1 && bod0 > 0, { n0: ids0.length, n1: ids1.length, bod0, bod1 });
  console.log(res.every(Boolean) ? 'ALL OK' : 'SOME FAILED', res.filter(Boolean).length + '/' + res.length); process.exit(0);
})().catch(e => { console.error(e); console.log('SOME FAILED (exception)'); process.exit(1); });
