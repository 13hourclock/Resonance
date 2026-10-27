// v0.6.2 headless check: gentle separation of an ohm placed on screen on top of others (no jump; the ohms under it hold still).
process.env.ID_SEED = process.env.ID_SEED || '6';
const T = require('./node_env.js'), RS = global.RS;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const fresh = (o = {}) => { const { Sf } = T.scene(Object.assign({ clear: true }, o)); return Sf; };
const cm = (Sf, c) => { const W = Sf.W; let x = 0, y = 0, vx = 0, vy = 0, n = 0; for (const b of c.segs) for (const i of b.idx) { x += W.x[i]; y += W.y[i]; vx += W.x[i] - W.px[i]; vy += W.y[i] - W.py[i]; n++; } return [x / n, y / n, Math.hypot(vx, vy) / n / (W.dt || 1 / 60)]; };
const overlap = (Sf, a, b) => { const W = Sf.W; let n = 0; for (const s of a.segs.concat(a.limbs || [])) for (const i of s.idx) for (const t of b.segs.concat(b.limbs || [])) for (const j of t.idx) if (Math.hypot(W.x[i] - W.x[j], W.y[i] - W.y[j]) < W.rad[i] + W.rad[j]) n++; return n; };
const longG = () => { for (let s = 1; s < 400; s++) { const g = T.plain(s); const P = RS.Genome.express(g); if (P.segments >= 4 && !P.radial) return g; } };
try {
  const run = on => { RS.SEP = on ? undefined : false; RS.idReset(6); T.t = 0; const Sf = fresh(); const a = T.add(Sf, T.plain(3), -18), b = T.add(Sf, T.plain(4), 18); T.run(Sf, 2);
    const v = Sf.view, inV = a.x > v.x0 && a.x < v.x1 && a.y > v.y0 && a.y < v.y1; const a0 = cm(Sf, a), b0 = cm(Sf, b);
    const k = Sf.addCreature(longG(), (a.x + b.x) / 2, (a.y + b.y) / 2 - 10, { growth: 1, quiet: true }); const ov0 = overlap(Sf, k, a) + overlap(Sf, k, b);
    let mv = 0, step = 0, mv1 = 0, step1 = 0, last = cm(Sf, k); for (let f = 0; f < 60 * 12; f++) { T.run(Sf, 1 / 60); mv = Math.max(mv, cm(Sf, a)[2], cm(Sf, b)[2]); const p = cm(Sf, k); step = Math.max(step, Math.hypot(p[0] - last[0], p[1] - last[1])); last = p; if (f === 59) { mv1 = mv; step1 = step; } }
    const a1 = cm(Sf, a), b1 = cm(Sf, b), drift = Math.max(Math.hypot(a1[0] - a0[0], a1[1] - a0[1]), Math.hypot(b1[0] - b0[0], b1[1] - b0[1]));
    RS.SEP = undefined; return { inV, ov0, ov: overlap(Sf, k, a) + overlap(Sf, k, b), mv: Math.round(mv), mv1: Math.round(mv1), step1: +step1.toFixed(2), drift: Math.round(drift), step: +step.toFixed(2), st: [Sf.stats.sepStart || 0, Sf.stats.sepDone || 0, Sf.stats.sepTimeout || 0], seps: Sf.seps.length }; };
  const old = run(false), now = run(true);
  ok('1 an ohm placed on screen on top of two others slides clear over several seconds (no jump, <= 1.5 px/frame); the two under it stay calm (their contact push is off during the glide)', now.inV && now.ov0 > 0 && now.ov === 0 && now.mv <= 60 && now.step <= 1.5 && now.st[0] >= 1 && now.seps === 0, { old, now });
  // 2 birthplace lean: the same stroke in two very different field spots gives related, not identical ohms; the shift is small and never touches stroke genes or the voice family
  { const spiral = require('./spiral_synth.js'), Sf = fresh(), F = RS.Field, P = Sf.P, I = RS.IG;
    let A = null, B = null, sa = -9, sb = -9; for (let k = 0; k < 720; k++) { const th = k / 720 * 2 * Math.PI, p = P.surf(th), x = p[0], y = p[1] - 30, f = F.at(Sf, x, y), cv = F.caveAt(Sf, x, y), pl = F.poolAt(Sf, x, y) ? 1 : 0;
      const dk = Math.max(f.echo, f.hollow, cv) + Math.max(f.moist, pl) - f.hard - f.wind, hd = -dk; if (dk > sa) { sa = dk; A = [x, y]; } if (hd > sb) { sb = hd; B = [x, y]; } }
    const cases = [{}, { wob: 3 }, { turns: 5, R: 50 }, { turns: 1.6, R: 140 }, { sq: 1 }, { speed: .3 }, { trend: 1 }, { asp: 1.6 }]; let n = 0, voiceSame = 0, setSame = 0, notIdent = 0, maxD = 0, sumLean = 0, sumRand = 0, cutA = 0, cutB = 0, relA = 0, relB = 0, attA = 0, attB = 0, aqA = 0, aqB = 0;
    for (let ci = 0; ci < cases.length; ci++) for (let salt = 1; salt <= 4; salt++) { const s = spiral(cases[ci]), c = RS.classify(s.pts), read = RS.strokeRead(s.pts, s.times, null, { turns: c.turns, hy: .5 });
      const feat = { size: c.size, speed: .6, turns: c.turns, cx: 0, cy: 0, dir: c.dir, read }, g0 = RS.Genome.fromStroke(feat, 1234, salt * 7919), g1 = RS.Genome.fromStroke(feat, 1234, salt * 7919 + 1);
      const cp = g => { const h = Float32Array.from(g); h.arch = g.arch; h.spun = g.spun; return h; }, gA = cp(g0), gB = cp(g0); Sf.leanAt(gA, A[0], A[1]); Sf.leanAt(gB, B[0], B[1]); n++;
      const v0 = RS.Genome.voiceOf(g0); if (RS.Genome.voiceOf(gA) === v0 && RS.Genome.voiceOf(gB) === v0) voiceSame++;
      if ([...g0.spun.set].every(i => gA[i] === g0[i] && gB[i] === g0[i])) setSame++;
      let dAB = 0, dR = 0, diff = 0; for (let i = 0; i < g0.length; i++) { const d = Math.abs(gA[i] - gB[i]); dAB += d; dR += Math.abs(g0[i] - g1[i]); if (d > .01) diff++; maxD = Math.max(maxD, Math.abs(gA[i] - g0[i]), Math.abs(gB[i] - g0[i])); } if (diff >= 2) notIdent++; sumLean += dAB / g0.length; sumRand += dR / g0.length;
      cutA += gA[I.fenv]; cutB += gB[I.fenv]; relA += gA[I.dec]; relB += gB[I.dec]; attA += gA[I.att]; attB += gB[I.att]; aqA += gA[69]; aqB += gB[69]; }
    const r = { spots: { A: +sa.toFixed(2), B: +sb.toFixed(2) }, n, voiceSame, setSame, notIdent, maxGeneShift: +maxD.toFixed(3), meanLeanDiff: +(sumLean / n).toFixed(4), meanRandomDiff: +(sumRand / n).toFixed(4), ratio: +((sumRand / n) / (sumLean / n)).toFixed(1),
      dir: { fenv: [+(cutA / n).toFixed(2), +(cutB / n).toFixed(2)], dec: [+(relA / n).toFixed(2), +(relB / n).toFixed(2)], att: [+(attA / n).toFixed(3), +(attB / n).toFixed(3)], waterLove: [+(aqA / n).toFixed(2), +(aqB / n).toFixed(2)] } };
    ok('2 the same stroke in a dark wet hollow vs on hard windy ground: same voice family, stroke genes untouched, related but not identical (small shift, randomness dominant), leaning darker / longer / wetter vs sharper', voiceSame === n && setSame === n && notIdent === n && maxD <= .2 && r.ratio >= 5 && cutA < cutB && relA > relB && attA > attB && aqA > aqB, r); }
  // 3 quick spawn: a plain spiral hatches an ohm at once; the same spiral ending in a still hold opens the clay window
  { const spiral = require('./spiral_synth.js'), s = spiral({}); let Sf = fresh(); const x0 = Sf.view.cx, map = s.pts.map(p => [p[0] - 400 + x0, p[1] - 300 + Sf.ground(x0) - 160]); const r1 = Sf.stroke(map, s.times, {}); const q = { k: r1 && r1.k, clay: !!Sf.clay, n: Sf.creatures.length, why: Sf.lastHatch && Sf.lastHatch.why, lean: !!(Sf.creatures[0] && Sf.creatures[0].g) };
    Sf = fresh(); const r2 = Sf.stroke(map.map(p => p.slice()), s.times, { endHold: 600 }); const h = { k: r2 && r2.k, clay: !!Sf.clay, n: Sf.creatures.length };
    Sf = fresh(); const r3 = Sf.stroke(map.map(p => p.slice()), s.times, { endHold: 300 }); const h3 = { k: r3 && r3.k, clay: !!Sf.clay };
    ok('3 a plain spiral hatches at once (no clay); a spiral ending in a 0.45 s still hold opens the clay; a shorter rest (0.3 s) still hatches at once', q.k === 'creature' && !q.clay && q.n === 1 && q.why === 'quick' && h.k === 'clay' && h.clay && h.n === 0 && h3.k === 'creature' && !h3.clay, { q, h, h3 }); }
} catch (e) { console.log('FAIL exception', e.stack); res.push(false); }
console.log(`v0.6.2: ${res.filter(Boolean).length}/${res.length} passed`);
