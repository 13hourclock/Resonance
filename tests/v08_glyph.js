// v0.8a O6 (chunk 2): TWO-STROKE GLYPHS. A hook is held for SY.WIN s; + '<' or '>' = undo; + a point under it = '?' (the guide comes);
// alone = a normal material rod; never held: loops, spirals, flicks, egg strokes, strokes from an ohm, strums. O7 tests 1-5, 7 (+ space helpers; 6 in pw_glyph.js).
const T = require('./node_env.js'); let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const SY = RS.Symbols, Gd = RS.Guide;
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; const c = T.add(Sf, T.plain(5), 0); T.run(Sf, 1);
const gx = c.x + 400, gy = Sf.ground(c.x + 400) - 220;
const slow = q => q.map((_, i) => i * 420 / q.length);                                         // a hook drawn in ~.4 s (a flick is < .25 s)
const hook = (id = 'undo', x = gx, y = gy, s = 50) => { const tr = SY.trace(id, x, y, s)[0]; return { tr, r: Sf.stroke(tr, slow(tr)) }; };
const chev = (H, dir) => { const e = H.end, L = H.size * .3; return dir === '<' ? [[e[0] + L, e[1] - L * .8], [e[0], e[1]], [e[0] + L, e[1] + L * .8]] : [[e[0] - L, e[1] - L * .8], [e[0], e[1]], [e[0] - L, e[1] + L * .8]]; };
const dense = q => { const o = []; for (let i = 1; i < q.length; i++) for (let k = 0; k < 8; k++) o.push([q[i - 1][0] + (q[i][0] - q[i - 1][0]) * k / 8, q[i - 1][1] + (q[i][1] - q[i - 1][1]) * k / 8]); o.push(q[q.length - 1]); return o; };
const second = q => { const d = dense(q); return Sf.stroke(d, d.map((_, i) => i * 12)); };
const edit = () => { RS.Creature.editGene(Sf, c, 'cut', c.g[RS.IG.cut] < .5 ? .8 : .2); return Sf.undo.length; };
const kinds = () => Sf.items ? Sf.items.length : 0;
// 1. hook alone: no undo; at the end of the window a normal material rod
let n0 = edit(), h = hook(); const held = h.r && h.r.k === 'held' && !!Sf.glyphHold, cut1 = c.g[RS.IG.cut]; T.run(Sf, .6); const midHeld = !!Sf.glyphHold; T.run(Sf, .8);
const rod = Sf.lastHold && Sf.lastHold.k === 'rod' && Sf.lastHold.r; ok('O6-1 hook alone: held (no undo), then at the end of the window a normal material rod', held && midHeld && !Sf.glyphHold && c.g[RS.IG.cut] === cut1 && rod && rod.k !== 'glyph' && rod.k !== 'held', { held: h.r && h.r.k, rod: rod && rod.k });
const fresh = (() => { const tr = SY.trace('undo', gx + 200, gy, 50)[0]; return Sf.stroke(tr, slow(tr), { noHold: true }); })(); ok('O6-1b the rod is what the same stroke makes without the hold', rod && fresh && rod.k === fresh.k, { rod: rod && rod.k, fresh: fresh && fresh.k });
// 2. hook + '<' -> undo; hook + '>' -> undo; late chevron -> no undo
const tryUndo = (dir, wait) => { T.run(Sf, 2.1); const before = c.g[RS.IG.cut]; edit(); const mid = c.g[RS.IG.cut]; const H = hook().r && Sf.glyphHold; T.run(Sf, wait); const r = H ? second(chev(H, dir)) : null; T.run(Sf, .1); return { r, undone: Math.abs(c.g[RS.IG.cut] - before) < .002 && mid !== before, H: !!H }; };
const u1 = tryUndo('<', .5), u2 = tryUndo('>', 1.0), u3 = tryUndo('<', 1.3);
ok('O6-2 hook + "<" (within 1.2 s) = undo; hook + ">" = undo (Q100)', u1.r && u1.r.k === 'glyph' && u1.r.id === 'undo' && u1.undone && u2.r && u2.r.id === 'undo' && u2.undone, { u1: u1.r && u1.r.k, u2: u2.r && u2.r.k });
ok('O6-2b at 1.3 s: no undo; the hook is already a rod and the chevron routes as a normal stroke', u3.H && !u3.undone && !(u3.r && u3.r.k === 'glyph') && Sf.lastHold.k === 'rod', { r: u3.r && u3.r.k });
// 3. hook + point under it -> '?': the guide comes. Beside / above -> nothing (the hook fades; the tap routes as a normal tap)
Sf.mods.guide = { step: 0, done: true, id: null }; const g0 = Gd.genome(Sf); let H = (hook('question'), Sf.glyphHold); T.run(Sf, .4); const pt = [H.end[0] + 2, H.box.y1 + 18], q1 = SY.tap(Sf, pt[0], pt[1]); const gd = Gd.guide(Sf);
ok('O6-3 hook + a point under it = "?": the guide is called (re-hatched here: none existed)', q1 && q1.k === 'glyph' && q1.id === 'question' && q1.res && q1.res.how === 'hatch' && gd && gd.guide && !Sf.glyphHold && Sf.mods.glyphs.question === 1, { q1: q1 && q1.res });
H = (hook('undo'), Sf.glyphHold); const qs = (() => { const d = [[H.end[0] + 1, H.box.y1 + 12], [H.end[0] + 4, H.box.y1 + 14]]; return Sf.stroke(d, [0, 60]); })();
ok('O6-3b a tiny stroke (< 12 px) under an undo hook is "?" too (both hooks finish both ways)', qs && qs.id === 'question', { qs: qs && qs.k });
const side = () => { const H2 = (hook(), Sf.glyphHold); return [SY.tap(Sf, H2.box.x1 + H2.size, H2.box.y1 + 10), Sf.lastHold.k, SY.tap(Sf, 0, 0)]; }, sd1 = side(); const H3 = (hook(), Sf.glyphHold), ab = SY.tap(Sf, H3.end[0], H3.box.y0 - 30);
ok('O6-3c a point beside or above: nothing (the hook fades, no rod; the tap routes as normal)', sd1[0] === null && sd1[1] === 'fade' && ab === null && Sf.lastHold.k === 'fade' && !Sf.glyphHold);
// 4. hook, then a material stroke after the window -> material, unchanged
hook(); T.run(Sf, 1.3); const ln = [[gx - 100, gy + 60], [gx - 40, gy + 61], [gx + 40, gy + 60], [gx + 100, gy + 62]], m1 = Sf.stroke(ln, [0, 70, 140, 210]); const ln2 = ln.map(p => [p[0], p[1] + 40]), m2 = Sf.stroke(ln2, [0, 70, 140, 210]);
ok('O6-4 hook, then a material stroke after the window: material, as today', m1 && m2 && m1.k === m2.k && m1.k !== 'glyph', { m1: m1 && m1.k, m2: m2 && m2.k });
// 4b. a different stroke inside the window: the hook fades and the stroke routes normally
hook(); const m3 = Sf.stroke(ln.map(p => [p[0], p[1] + 80]), [0, 70, 140, 210]); ok('O6-4b any other stroke in the window: the hook fades, the stroke routes at once', m3 && m3.k === m1.k && Sf.lastHold.k === 'fade', { m3: m3 && m3.k });
// 5. never held
const circ = []; for (let k = 0; k <= 40; k++) circ.push([c.x + Math.cos(k / 40 * 6.283) * 130, c.y + Math.sin(k / 40 * 6.283) * 130]); const s1 = Sf.stroke(circ, circ.map((_, i) => i * 16));
const sp = []; for (let k = 0; k <= 60; k++) { const a = k / 60 * 6.283 * 2.2, rr = 10 + k * 1.3; sp.push([gx + Math.cos(a) * rr, gy + Math.sin(a) * rr]); } const s2 = Sf.stroke(sp, sp.map((_, i) => i * 12));
const ftr = SY.trace('undo', gx, gy, 50)[0], fl = Sf.stroke(ftr, ftr.map((_, i) => i * 8)); const tiny = SY.trace('undo', gx, gy, 14)[0], ti = Sf.stroke(tiny, slow(tiny));
const otr = SY.trace('undo', c.x + 30, c.y, 50)[0].map(p => p.slice()); otr.unshift([c.x, c.y]); const oh = Sf.stroke(otr, slow(otr));
const G0 = Sf.mods.guide; Sf.eggOn = true; Sf.mods.guide = Object.assign({}, G0, { done: false, egg: 0 }); const etr = SY.trace('undo', gx, gy, 50)[0], eg = Sf.stroke(etr, slow(etr)); Sf.eggOn = false; Sf.mods.guide = G0; Sf.glyphHold = null;   // 0.8a8 (Wilbow 11:41): hooks ARE held during the egg lessons now
const st = Sf.stroke(etr, slow(etr), { ink: { crossed: new Set([c.id]) } });
ok('O6-5 never held: catch loop, spiral, flick (fast / tiny), a stroke from an ohm, a strum; a hook during the egg lessons IS held (0.8a8)', s1 && s1.k === 'catch' && s2 && (s2.k === 'creature' || s2.k === 'clay') && eg && eg.k === 'held' && [fl, ti, oh, st].every(r => !r || r.k !== 'held') && !Sf.glyphHold, { s1: s1 && s1.k, s2: s2 && s2.k, fl: fl && fl.k, ti: ti && ti.k, oh: oh && oh.k, eg: eg && eg.k, st: st && st.k });
ok('O6-5b SY.UNDO_GROUND retired; a lone hook is never a glyph (SY.offer)', SY.UNDO_GROUND === undefined && SY.offer(Sf, [SY.trace('undo', gx, gy, 50)[0]]) === null);
const a = T.add(Sf, T.plain(11), gx + 900), b = T.add(Sf, T.plain(12), gx + 1060); T.run(Sf, .5); const itr = SY.trace('infinity', (a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(a.x - b.x, a.y - b.y) * .62)[0], i1 = Sf.stroke(itr, itr.map((_, i) => i * 12));
ok('O6-5c the infinity glyph still bonds in ONE stroke', i1 && i1.k === 'glyph' && i1.id === 'infinity' && a.bond === b.id);
T.run(Sf, 2.1); edit(); const cu = c.g[RS.IG.cut]; const ru = Sf.doUndo(), und = c.g[RS.IG.cut] !== cu; ok('O6-5d the 3-finger undo path is unchanged (Sf.doUndo; nothing held)', ru === 'gene' && und && !Sf.glyphHold);
// 7. summon: alive (off view: flies in from the edge), deleted (re-hatches, same genome), caught (re-hatches)
let g = Gd.guide(Sf); Gd.shift(Sf, g, Sf.view.x1 + 1500 - g.x, 0); T.run(Sf, .2); const far = g.x; H = (hook('question', Sf.view.cx - 40, Sf.view.cy - 60, 50), Sf.glyphHold);
const sx = H ? H.end[0] : 0, sy = H ? H.box.y1 + 20 : 0, r7 = H && SY.tap(Sf, sx, sy); const placed = g.x; T.run(Sf, 8); const dEnd = Math.hypot(g.x - sx, g.y - Math.min(sy, Sf.ground(sx) - 20)), dStart = Math.hypot(placed - sx, g.y - sy);
ok('O6-7 summon, guide alive off-screen: placed just outside the view, then comes to the point', r7 && r7.res && r7.res.how === 'flyIn' && placed < far && dEnd < dStart * .5 && Sf.stats.summons >= 2, { how: r7 && r7.res && r7.res.how, dStart: dStart | 0, dEnd: dEnd | 0 });
const gene0 = JSON.stringify(Array.from(g.g.slice(0, 8))); Sf.removeCreature ? Sf.removeCreature(g) : (g.dead = true); T.run(Sf, .2); const r8 = Gd.summon(Sf, Sf.view.cx, Sf.view.cy); const g2 = Gd.guide(Sf);
ok('O6-7b summon, guide deleted: it re-hatches from its seed (same genome family) and its lessons are not restarted', r8 && r8.how === 'hatch' && g2 && g2 !== g && Gd.state(Sf).done === true, { how: r8 && r8.how, same: g2 && JSON.stringify(Array.from(g2.g.slice(0, 8))) === gene0 });
g2.caught = true; const r9 = Gd.summon(Sf, Sf.view.cx, Sf.view.cy); ok('O6-7c summon, guide caught (in a jar): a fresh guide hatches', r9 && r9.how === 'hatch' && Gd.guide(Sf) !== g2);
// space helpers (screen coords): a '?' pan shape + point under it; a point beside does nothing
const sq = SY.trace('question', 200, 300, 120)[0], sH = SY.hookShape(sq, slow(sq), 1); ok('O6-6 (helpers) space: a "?"-shaped pan is a hook; a point under it counts, beside it does not', sH && SY.isPoint(sH, [sH.end[0], sH.box.y1 + 30]) && !SY.isPoint(sH, [sH.end[0] + 120, sH.box.y1 + 30]));
// cost: a held hook is one timer (no per-frame work beyond a compare)
hook(); const t0 = process.hrtime.bigint(); for (let i = 0; i < 1e5; i++) SY.holdTick(Sf.glyphHold ? { glyphHold: Sf.glyphHold, now: Sf.now } : Sf); const us = Number(process.hrtime.bigint() - t0) / 1e5 / 1e3; ok('O7 cost: the held-hook check is a timer compare (< 1 us per step)', us < 1, { us: +us.toFixed(3) });
// drawing: the undo lesson / '?' hint ghosts (hook, then the second stroke) and the held hook draw without errors, no text
{ RS.Render = RS.Render || { css: (c, a) => 'rgba(0,0,0,' + a + ')' }; let lines = 0, text = 0, arcs = 0; const ctx = new Proxy({}, { get: (o, k) => k === 'createRadialGradient' ? () => ({ addColorStop() {} }) : k === 'lineTo' ? () => lines++ : k === 'arc' ? () => arcs++ : k === 'fillText' || k === 'strokeText' ? () => text++ : (o[k] !== undefined ? o[k] : () => {}), set: (o, k, v) => { o[k] = v; return true; } });
  const l0 = []; for (const id of ['undo', 'question']) for (const t of [.3, .8]) { lines = 0; arcs = 0; Gd.drawTwo(ctx, Sf, id, 300, 300, 60, t, 1); l0.push([id, t, lines, arcs]); } hook(); SY.drawHold(ctx, Sf, 1); SY.cancel(Sf); SY.drawHold(ctx, Sf, 1);
  ok('O6 drawing: the lesson ghost draws the hook first and the arrowhead / point after it; no text', l0[0][2] > 0 && l0[1][2] > l0[0][2] && l0[3][3] > l0[2][3] && !text, { l0 }); }
ok('O6 hint: the "?" ghost hint is the LAST old-gesture hint (counts of the others unchanged) and shows at most 3 times', Gd.OLD[Gd.OLD.length - 1].k === 'qmark' && !Gd.OLD[Gd.OLD.length - 1].n && Gd.MAXN === 3);
console.log(`v08_glyph ${pass}/${tot}`);
