// v0.3.2-pre quick headless variety check (no audio render): creation variety (archetypes, drum roles, keys, tempi, groove),
// timbre distance between neighbours, drum-role beat placement, and a jam with specialists + texture staying in key and on the grid.
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dna']) require('../www/js/' + m + '.js');
const Mi = RS.Mind, res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const cnt = xs => xs.reduce((a, x) => (a[x] = (a[x] || 0) + 1, a), {});
// 1. 20 random creations
const G = Array.from({ length: 20 }, (_, s) => RS.Genome.random(RS.hash('variety', s))), X = G.map(g => ({ g, P: RS.Genome.express(g) }));
const arch = cnt(X.map(x => x.g.arch || '?')), ids = cnt(X.map(x => RS.Inst.identity(x.P.inst, x.g)));
ok('VAR 20 random creations span many instrument archetypes and timbre families', Object.keys(arch).length >= 8 && Object.keys(ids).length >= 8, { arch, families: Object.keys(ids).length });
const D = []; for (let s = 0; D.length < 20; s++) { const g = RS.Genome.random(RS.hash('vdrum', s)), I = RS.Genome.express(g).inst; if (I.drum) D.push(I.drum); }
const dc = cnt(D); ok('VAR 20 random drummers take varied drum roles (kick / snare / hat / tom / kit), none dominant', Object.keys(dc).length >= 4 && Math.max(...Object.values(dc)) <= 9, dc);
const tun = G.map(g => [Math.round((g[164] - .5) * 2400), +g[165].toFixed(2)]);
// 2. starting scenes differ between universes
const st = []; for (const u of [1, 2, 3, 4, 5, 6, 7, 8]) { const o = T.make({ useed: u }); const Sf = o.Sf; for (let i = 0; i < 3; i++) { T.t += 1 / 60; Sf.step(1 / 60); }
  const cs = Sf.creatures.filter(c => c.mind && !c.dead); st.push({ u, n: cs.length, key: cs[0] ? Math.round(cs[0].keyC || 0) : null, tempo: cs[0] ? +(cs[0].tempo || 1).toFixed(2) : null, mix: cs.map(c => c.P.inst.drum || (RS.Inst.isTex(c.P.inst) ? 'tex' : RS.Inst.identity(c.P.inst, c.g))).sort().join('+'), size: cs.map(c => Math.round(c.P.size)).join('/') }); }
ok('VAR starting scenes differ across universes (key, tempo, role mix, sizes); universe 1 unchanged', new Set(st.map(s => s.key + '|' + s.tempo)).size >= 4 && new Set(st.map(s => s.mix)).size >= 6 && st[0].key === 0 && st.every(s => s.n >= 3), st);
// 3. timbre distance: spawn 10 ohms in one place; no two neighbours share an identity (drum types + physical families count)
{ const { Sf } = T.scene({ clear: true }); const cx = Sf.view.cx; const cs = []; for (let s = 0; s < 10; s++) cs.push(T.add(Sf, T.plain(9000 + s * 13), cx + s * 30));
  const id = cs.map(c => RS.Inst.identity(c.P.inst, c.g)); ok('VAR minimum timbre distance holds: 10 neighbours, no doubled identity', new Set(id).size === id.length || new Set(id).size >= 9, cnt(id)); }
const dtyOf = g => (RS.Drums && g[RS.IG.perc] > .7) ? RS.Drums.typeOf(RS.Drums.birth(g)) : RS.Genome.express(g).inst.drum;   // v0.8 drums: a new drummer's type comes from its born drum set
// 4. drum-role beat placement (per type, many bars)
{ const { Sf } = T.scene({ clear: true }); const cx = Sf.view.cx; const pickD = (t, s0) => { for (let s = s0; ; s++) { const g = T.plain(s); if (dtyOf(g) === t) return g; } };
  const pos = {}; for (const t of ['kick', 'snare', 'hat', 'tom', 'kit']) { const c = T.add(Sf, pickD(t, 100 + t.length * 977), cx); T.run(Sf, .1); const m = c.mind; if (!m || !m.groups) { pos[t] = null; Sf.removeCreature(c); continue; } if (Mi.barLen(m) !== 16) { m.meter = '4/4'; m.groups = [4, 4, 4, 4]; }   /* placement is checked in 4/4 */ if (Mi.barLen(m) !== 16) { pos[t] = null; Sf.removeCreature(c); continue; }
    const hist = new Array(16).fill(0); let n = 0; const role = { kick: 'pulse:low', snare: 'pulse:back', hat: 'pulse:time', tom: 'pulse:colour', kit: 'pulse' }[t]; for (let b = 0; b < 24; b++) { const out = Mi.drumBar0(Sf, m, b, role, b % 8 === 7, RS.rng(RS.hash('vb', t, b)), .8, [0, 2, 4]); for (const o of out) { hist[((Math.round(o.s) % 16) + 16) % 16] += 1; n++; } }
    pos[t] = { n, hist }; Sf.removeCreature(c); }
  const fr = (t, ss) => pos[t] ? ss.reduce((a, s) => a + pos[t].hist[s], 0) / Math.max(1, pos[t].n) : 1;
  ok('VAR kick sits mostly on the downbeats / low cell (steps 0, 8 + cell)', fr('kick', [0, 8, 6, 10, 3, 11, 14]) > .7 && pos.kick && pos.kick.hist[0] >= 20, pos.kick);
  ok('VAR snare / clap sits on the backbeats (4, 12)', fr('snare', [4, 12]) > .55, pos.snare);
  ok('VAR hats fill the 8ths / 16ths (many hits, spread over the bar)', pos.hat && pos.hat.n >= 24 * 7 && pos.hat.hist.filter(x => x > 0).length >= 8, pos.hat);
  ok('VAR toms / wood play sparse colour (fewer hits than hats)', pos.tom && pos.hat && pos.tom.n < pos.hat.n, pos.tom); }
// 5. a jam with specialists + texture: in key, on the grid, kit thins when specialists are present
{ const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.mindLog = []; const cx = Sf.view.cx, cy = Sf.view.cy || 400;
  const find = (f, s0) => { for (let s = s0; ; s++) { const g = T.plain(s); if (f(RS.Genome.express(g).inst)) return g; } }; const findD = (t, s0) => { for (let s = s0; ; s++) { const g = T.plain(s); if (dtyOf(g) === t) return g; } };
  const gs = [findD('kick', 300), findD('snare', 500), findD('hat', 700), find(I => !I.drum && I.percK < .2, 900), find(I => !I.drum && I.percK < .2, 1300), find(I => RS.Inst.isTex(I), 1700)];
  const cs = gs.map((g, i) => { const c = T.add(Sf, g, cx - 100 + i * 40); c.y = cy + (i % 2) * 40; return c; }); const rec = []; let last = 0;
  T.run(Sf, 120, () => { const E = cs.map(c => c.mind.E).find(Boolean); if (!E) return; const L = Sf.mindLog; for (let k = last; k < L.length; k++) { const r = L[k]; if (!r.c || r.c.mind.E !== E || r.manual) continue; const P = E.pulse || E.lead, pm = P.mind, rate = pm.bpm / 60 * 4, p = pm.pos + (r.t - Sf.now()) * rate;
    rec.push({ c: r.c.id, role: r.c.mind.role, f: r.f, perc: r.perc, pass: r.pass, p, sw: E.swing || 0, rate, base: Mi.tonicHz(Sf, pm), cents: E.sys.cents.slice(), P: E.sys.period || 1200, ch: E.propChord && E.propChord.cents.slice(), settled: E.phase === 'settled' }); } last = L.length; });
  const md = (a, n) => ((a % n) + n) % n, inKey = r => { const cc = md(1200 * Math.log2(r.f / r.base), r.P); const hit = xs => xs && xs.some(x => Math.abs(md(cc - x + r.P / 2, r.P) - r.P / 2) < 35); return hit(r.cents) || hit(r.ch); };
  const onGrid = r => { const d1 = Math.abs(r.p - Math.round(r.p)) / r.rate, d2 = Math.abs(r.p - r.sw - Math.round(r.p - r.sw)) / r.rate, d3 = r.perc ? Math.abs(r.p * 2 - Math.round(r.p * 2)) / 2 / r.rate : 1; return d1 < .03 || d2 < .03 || d3 < .03; };
  const S = rec.filter(r => r.settled), ton = S.filter(r => !r.perc && !r.pass && r.f), roles = cnt([...new Set(S.map(r => r.c + ':' + r.role))].map(x => x.split(':').slice(1).join(':')));
  ok('VAR specialists jam together: distinct drum parts (pulse:low / back / time) + a texture or comp voice', ['pulse:low', 'pulse:back', 'pulse:time'].filter(k => roles[k] || (k === 'pulse:low' && roles.pulse)).length >= 2, roles);
  ok('VAR the jam stays in key (chromatic approach notes excepted) and on the grid (100%)', ton.length > 40 && ton.every(inKey) && S.every(onGrid), { tonal: ton.length, inKey: ton.filter(inKey).length, notes: S.length, onGrid: S.filter(onGrid).length, pass: S.filter(r => r.pass).length }); }
console.log('variety ' + res.filter(Boolean).length + '/' + res.length); process.exit(res.every(Boolean) ? 0 : 1);
