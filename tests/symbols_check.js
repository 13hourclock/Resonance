// lean check: drawn-symbol FOUNDATION. Recogniser classifies its templates + jittered/scaled/rotated variants; routing by context works
// (ground / body / bubble; halo never); stubs + low scores fizzle; the existing strokes (loop = catch, spiral = creature, line = teach/material) still win.
const T = require('./node_env.js'); let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const SY = RS.Symbols, r = RS.rng(42), ids = Object.keys(SY.templates).filter(k => k !== 'scribble'); let hit = 0, n = 0, miss = [];
for (const id of ids) for (let v = 0; v < 3; v++) { const s = 60 + r() * 80, rot = (r() - .5) * .25, ox = r() * 300, oy = r() * 300; const st = SY.templates[id].map(ss => ss.map(([x, y]) => { const X = x * Math.cos(rot) - y * Math.sin(rot), Y = x * Math.sin(rot) + y * Math.cos(rot); return [ox + X * s + (r() - .5) * s * .06, oy + Y * s + (r() - .5) * s * .06]; }));
  const res = SY.recognize(st); n++; if (res && res.id === id) hit++; else if (v === 0) miss.push(id + '->' + (res && res.id)); }
// near-duplicate templates in the ported set (e.g. caret vs arrow) count as misses; foundation bar: >= 85 %
ok('SYM recogniser: templates + jittered / scaled / rotated variants', hit / n >= .85, { acc: +(hit / n).toFixed(2), n, miss: miss.slice(0, 8) });
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; const c = T.add(Sf, T.plain(5), 0); T.run(Sf, 1);
const calls = []; SY.register('triangle', 'ground', (S, t) => calls.push('ground'), {}); SY.register('triangle', 'body', (S, t) => calls.push('body:' + (t && t.id)), {});
const tri = (x, y, s) => SY.templates.triangle.map(ss => ss.map(([a, b]) => [x + a * s, y + b * s]));
const gx = c.x + 400, gy = Sf.ground(c.x + 400) - 140; const r1 = SY.route(Sf, tri(gx, gy, 50)); const onBody = tri(c.x, c.y, 50); onBody[0] = onBody[0].map(p => p); onBody[0].unshift([c.x, c.y]); const r2 = SY.route(Sf, onBody, { ctx: 'body', target: c });
ok('SYM routing by context: ground glyph -> ground action, glyph started on the body -> creature action', r1.k === 'glyph' && r2.k === 'glyph' && calls[0] === 'ground' && calls[1] === 'body:' + c.id, { calls });
const r3 = SY.route(Sf, SY.templates.star.map(ss => ss.map(([a, b]) => [gx + a * 50, gy + b * 50]))), r4 = SY.route(Sf, [[[gx, gy], [gx + 30, gy + 2], [gx + 2, gy + 25], [gx + 31, gy + 31], [gx - 5, gy + 9]]]);
ok('SYM stub and unregistered / low-score glyphs fizzle harmlessly', r3.k === 'fizzle' && r4.k === 'fizzle', { r3: r3.why, r4: r4.why });
const nC = Sf.creatures.length, circ = []; for (let k = 0; k <= 40; k++) circ.push([c.x + Math.cos(k / 40 * 6.283) * 130, c.y + Math.sin(k / 40 * 6.283) * 130]); const s1 = Sf.stroke(circ, circ.map((_, i) => i * 16));
const sp = []; for (let k = 0; k <= 60; k++) { const a = k / 60 * 6.283 * 2.2, rr = 10 + k * 1.3; sp.push([gx + Math.cos(a) * rr, gy + Math.sin(a) * rr]); } const s2 = Sf.stroke(sp, sp.map((_, i) => i * 12));
const ln = [[gx - 100, gy + 60], [gx + 100, gy + 60]], s3 = Sf.stroke(ln, [0, 200]);
ok('SYM existing strokes still route first: loop = catch, spiral = creature (v0.3.2: clay that hatches into one), plain line = material', s1 && s1.k === 'catch' && s2 && (s2.k === 'creature' || s2.k === 'clay') && s3 && s3.k !== 'glyph', { s1: s1 && s1.k, s2: s2 && s2.k, s3: s3 && s3.k });
// v0.3 picks
const a = T.add(Sf, T.plain(11), gx + 900), b = T.add(Sf, T.plain(12), gx + 1060); T.run(Sf, .5); const inf = () => { const tr = SY.trace('infinity', (a.x + b.x) / 2, (a.y + b.y) / 2, Math.hypot(a.x - b.x, a.y - b.y) * .62)[0]; return Sf.stroke(tr, tr.map((_, i) => i * 12)); };
const i1 = inf(); const bonded = a.bond === b.id && b.bond === a.id; const i2 = inf(); const unb = !a.bond && !b.bond; inf();
ok('GLYPH infinity across two creatures bonds them (before the catch loop); again = unbond; persists in the save', i1 && i1.k === 'glyph' && bonded && unb && a.bond === b.id && JSON.stringify(Sf.serialCreature(a)).includes('"bond":"' + b.id), { i1: i1 && i1.k, i2: i2 && i2.res });
const undo = () => { const tr = SY.trace('undo', gx, gy - 220, 50)[0], h = Sf.stroke(tr, tr.map((_, i) => i * 420 / tr.length)); if (!h || h.k !== 'held') return h; T.run(Sf, .3); const H = Sf.glyphHold, e = H.end, L = H.size * .3, ch = [[e[0] + L, e[1] - L * .8], [e[0], e[1]], [e[0] + L, e[1] + L * .8]]; return Sf.stroke(ch, [0, 90, 180]); };   // v0.8a O6: two strokes (hook + '<')
const cut0 = a.g[RS.IG.cut]; RS.Creature.editGene(Sf, a, 'cut', .9); const u1 = undo(); const geneBack = Math.abs(a.g[RS.IG.cut] - cut0) < .002; const u2 = undo(); const bondBack = !a.bond;
ok('GLYPH hook + arrowhead (two strokes, v0.8a O6) = undo (a DNA/tweak edit, then the bond); bounded history', u1 && u1.k === 'glyph' && u1.id === 'undo' && geneBack && bondBack && Sf.UNDO_MAX === 40, { u1: u1 && u1.res, u2: u2 && u2.res, cut: [cut0, a.g[RS.IG.cut]] });
ok('GLYPH constellation: discovered glyphs are saved (sky stars)', ['infinity', 'undo'].every(id => Sf.mods.glyphs[id]) && JSON.parse(JSON.stringify(Sf.pack())).mods.glyphs.undo === 1);
const half = SY.trace('undo', 0, 0, 60)[0]; const gh = SY.ghostFor(Sf, half.slice(0, Math.round(half.length * .6)));
ok('GLYPH ghost completion: a seen glyph half drawn shows the rest', gh && gh.id === 'undo' && gh.pts.length === half.length);
const nU = (Sf.mods.glyphUser.undo || []).length; SY.loadUser(Sf); ok('GLYPH personal variants: successful strokes saved (capped 3) and reloaded as templates', nU >= 1 && nU <= 3 && SY.TPL.some(t => t.user && t.id === 'undo'), { nU });
console.log(`symbols ${pass}/${tot}`);
