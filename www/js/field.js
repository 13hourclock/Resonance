'use strict';
// v0.4a ENVIRONMENT FIELDS (one of the four shared systems: fields, attraction objects, growth engine, events).
// Smooth planet-seeded fields along the surface (arc position): hard, absorb, echo, moist, temp, charge, wind, hollow, light. Slow per-area
// deltas written by the music (Sf.mods.fieldD, saved with the world): coherent jams make an area RICH (more resonant, hollow, moist, warm,
// greener; grass grows), harsh noisy clashes WEAR it (charged, dry, grey). Fields feed: the acoustics of every sound made there (Sf.applyMedium),
// each ohm's comfort (how much it plays), light seeking, the starting tempo of an ohm born there (only), rain and lightning placement, and the
// features they form: wind rocks + reed beds (sound in the wind or when a wind-blowing ohm breathes on them, tuned to the nearest ohm's key),
// caves (dark, long echo; blind / night ohms like them) and pools (shallow water: muffled, water-lovers like them). No central composer:
// features only sound in the key of the nearest ohm and are silent when no ohm is near.
(function (G) { const RS = G.RS, F = RS.Field = {}, TAU = Math.PI * 2, clamp = RS.clamp;
  RS.FIELDS = RS.FIELDS !== false; F.KEYS = ['hard', 'absorb', 'echo', 'moist', 'temp', 'charge', 'wind', 'hollow', 'light']; F.AREA = 400; F.CELL = 170;
  const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const wrap = th => ((th % TAU) + TAU) % TAU;
  F.init = Sf => { const P = Sf.P; if (!RS.FIELDS || !P || !P.surf || !P.R) return null; Sf.region = F.region(Sf); const fd = Sf.field = { seed: RS.hash('field', P.seed) >>> 0, cache: new Map(), feat: [], R: P.R, gas: P.biome && P.biome(0) === 'cloud', t: 0 };
    if (!Sf.mods.fieldD) Sf.mods.fieldD = {}; if (!fd.gas) F.features(Sf); Sf.stats.fieldFeat = fd.feat.length; return fd; };
  const nz = (fd, k, th, sc) => { const r = fd.R / sc, v = RS.fbm(fd.seed + k * 131, Math.cos(th) * r, Math.sin(th) * r, 2); return clamp((v - .34) * 2.6 + .5, 0, 1); };
  // base fields at a surface angle (cached on a 25 px grid; independent of the music)
  F.raw = (Sf, th) => { const fd = Sf.field, P = Sf.P, key = Math.round(wrap(th) * fd.R / 25); let o = fd.cache.get(key); if (o) return o; th = key * 25 / fd.R; const env = Sf.env || {};
    const bi = P.biome ? P.biome(th) : 'rock', h = P.height(th), dth = 380 / fd.R, ex = clamp((h - (P.height(th - dth) + P.height(th + dth)) / 2) / 90 * .5 + .5, 0, 1);
    const hard = clamp(.55 * nz(fd, 1, th, 1400) + .45 * nz(fd, 2, th, 450) + (bi === 'rock' || bi === 'peak' || bi === 'ice' ? .15 : bi === 'lush' ? -.12 : 0), 0, 1);
    const absorb = clamp(.6 * nz(fd, 3, th, 1200) + (bi === 'lush' || bi === 'desert' || bi === 'tundra' ? .3 : .12) - hard * .2, 0, 1);
    const moist = clamp(.6 * nz(fd, 4, th, 1600) + .3 * (env.wet == null ? .5 : env.wet) + (bi === 'lush' || bi === 'ocean' ? .15 : bi === 'desert' ? -.3 : 0) + (h < P.sea + 40 ? .15 : 0), 0, 1);
    const temp = clamp(.5 * nz(fd, 5, th, 2000) + .5 * (env.temp == null ? .5 : env.temp), 0, 1), wind = clamp(.5 * nz(fd, 6, th, 900) + .5 * ex * (env.atmo == null ? .6 : Math.min(1, env.atmo * 1.4)), 0, 1);
    const hollow = nz(fd, 7, th, 700), light = clamp(.35 + .65 * nz(fd, 8, th, 1100), 0, 1), charge = clamp(.6 * nz(fd, 9, th, 1500) + .2 * ex, 0, 1);
    o = { hard, absorb, echo: clamp(.5 * hard + .5 * hollow - absorb * .2, 0, 1), moist, temp, charge, wind, hollow, light, biome: bi, ex };
    if (fd.cache.size > 6000) fd.cache.clear(); fd.cache.set(key, o); return o; };
  /* v0.6.1 REGIONAL BIAS (the v0.3 hook, now filled): every area remembers the pulse of the last jams that came together there (a jam seed = a resolved, coherent jam).
     A lone ohm in that area leans at most 3 % toward it (mind.js tie-break, only with no partner/jam); ohms never change scale, motif or genes. Persisted in Sf.mods.regionBpm. */
  F.region = Sf => ({ learn: (x, y, bpm) => { if (!Sf.field || !(bpm > 0)) return; const D = Sf.mods.regionBpm = Sf.mods.regionBpm || {}, a = F.area(Sf, Sf.P.theta(x, y)); D[a] = +(D[a] ? D[a] * .6 + bpm * .4 : bpm).toFixed(1); Sf.stats.regionLearn = (Sf.stats.regionLearn || 0) + 1; },
    /* v0.8a4 C REGIONAL KEYS (light): the area also remembers the KEY of the settled jams (tonic cents .6/.4 on the circle; scale replaced only after 2 seeds agree; no decay).
       Used only by world voices (wind rocks / reeds / farm drones), a jam-proposer tie-break and a 20 % birth chance. Never retunes an existing ohm. Persisted in Sf.mods.regionKey. */
    learnKey: (x, y, tc, S) => { if (!Sf.field || !isFinite(tc) || !S || !S.cents) return; const D = Sf.mods.regionKey = Sf.mods.regionKey || {}, a = F.area(Sf, Sf.P.theta(x, y)), o = D[a], sys = S.name || S.id || 'sys', put = q => { q.sys = sys; q.cents = S.cents.slice(); q.per = S.period || 1200; };
      if (!o) { D[a] = { tc: +F.wc(tc).toFixed(1), n: 1 }; put(D[a]); } else { o.tc = +F.wc(o.tc + .4 * F.wc(tc - o.tc)).toFixed(1); o.n = (o.n || 1) + 1; if (sys !== o.sys) { if (o.cand === sys) { put(o); o.cand = null; } else o.cand = sys; } else o.cand = null; }
      Sf.stats.regionKeyLearn = (Sf.stats.regionKeyLearn || 0) + 1; },
    keyAt: (x, y) => { const D = Sf.mods.regionKey; if (!D || !Sf.field) return null; const a = F.area(Sf, Sf.P.theta(x, y)), n = Math.ceil(TAU * Sf.field.R / F.AREA); return D[a] || D[(a + 1) % n] || D[(a - 1 + n) % n] || null; },
    bpmAt: (x, y) => { const D = Sf.mods.regionBpm; if (!D || !Sf.field) return 0; const a = F.area(Sf, Sf.P.theta(x, y)), n = Math.ceil(TAU * Sf.field.R / F.AREA); return D[a] || D[(a + 1) % n] || D[(a - 1 + n) % n] || 0; } });
  F.wc = c => ((((c + 600) % 1200) + 1200) % 1200) - 600;   // v0.8a4: wrap cents to [-600, 600)
  F.sysOf = rk => { const T = RS.Tonal, k = T && T.CAT && T.CAT.find(e => e.name === rk.sys); return k || (rk.cents && rk.cents.length ? { name: rk.sys, cents: rk.cents, period: rk.per || 1200 } : null); };
  // world voices sing in the area key when the nearest ohm is not in a jam (a jam nearby keeps its own key: Q117 order jam > region > the ohm)
  F.voiceMind = (Sf, near, x, y) => { const m = near.mind; if (m.E || !Sf.region || !Sf.region.keyAt) return m; const rk = Sf.region.keyAt(x, y), sys = rk && F.sysOf(rk); if (!rk || !sys) return m;
    Sf.stats.regionVoice = (Sf.stats.regionVoice || 0) + 1; return { sys, tonicC: rk.tc, regOct: m.regOct || 0, oct: m.oct || 0 }; };
  // births (spiral, clay, egg, wild settlement): 20 % chance the key gene starts at the area key, only when the caller did not set a key
  F.BIRTH_KEY = .2; F.birthKey = (Sf, x, y, o2, salt) => { if (o2.keyC != null || !Sf.region || !Sf.region.keyAt) return; const rk = Sf.region.keyAt(x, y); if (!rk) return; Sf.stats.birthKeyRoll = (Sf.stats.birthKeyRoll || 0) + 1;
    if (RS.rng(RS.hash('birthKey', salt, Math.round(x), Math.round(y)))() < F.BIRTH_KEY) { o2.keyC = rk.tc; Sf.stats.birthKey = (Sf.stats.birthKey || 0) + 1; } };
  F.area = (Sf, th) => Math.floor(wrap(th) * Sf.field.R / F.AREA);
  F.delta = (Sf, th) => { const D = Sf.mods.fieldD || {}, s = wrap(th) * Sf.field.R / F.AREA - .5, a = Math.floor(s), u = s - a, n = Math.ceil(TAU * Sf.field.R / F.AREA), q = i => D[((i % n) + n) % n] || [0, 0], A = q(a), B = q(a + 1);
    return [A[0] * (1 - u) + B[0] * u, A[1] * (1 - u) + B[1] * u, (A[2] || 0) * (1 - u) + (B[2] || 0) * u]; };
  F.atTh = (Sf, th) => { const b = F.raw(Sf, th), [r, w, dw] = F.delta(Sf, th); if (!r && !w && !dw) return Object.assign({ rich: 0, wear: 0 }, b);   /* v0.4b: dw = water carried in by dew collectors */
    return { hard: clamp(b.hard + .1 * r + .08 * w, 0, 1), absorb: clamp(b.absorb - .06 * r + .1 * w, 0, 1), echo: clamp(b.echo + .1 * r, 0, 1), moist: clamp(b.moist + .12 * r - .15 * w + .5 * (dw || 0), 0, 1), temp: clamp(b.temp + .08 * r, 0, 1),
      charge: clamp(b.charge + .35 * w, 0, 1), wind: b.wind, hollow: clamp(b.hollow + .15 * r, 0, 1), light: b.light, biome: b.biome, ex: b.ex, rich: r, wear: w }; };
  F.at = (Sf, x, y) => F.atTh(Sf, Sf.P.theta(x, y == null ? Sf.ground(x) : y));
  F.grad = (Sf, x, key, y) => { if (!Sf.field) return 0; const P = Sf.P, th = P.theta(x, y == null ? Sf.ground(x) : y), d = 200 / Sf.field.R, a = F.atTh(Sf, th + d)[key], b = F.atTh(Sf, th - d)[key];
    const t = P.surf(th + d), s = P.surf(th - d), dx = t[0] - s[0]; return (a - b) / 400 * Math.sign(dx || 1); };   // per world-x pixel along the local ground
  // ---------------- features (from the base fields; deterministic per planet) ----------------
  F.features = Sf => { const fd = Sf.field, P = Sf.P, N = Math.floor(TAU * fd.R / F.CELL), out = fd.feat; let lastCave = -1e9, lastPool = -1e9;
    for (let k = 0; k < N; k++) { const r = RS.rng(RS.hash(fd.seed, 'ft', k)), th = (k + .2 + r() * .6) * F.CELL / fd.R, f = F.raw(Sf, th), h = P.height(th); if (h < P.sea + 4) { if (h > P.sea - 90 && f.moist > .55 && r() < .5) out.push({ k, kind: 'reed', th, s: th * fd.R, sungT: -9, n: 4 + Math.floor(r() * 4), hgt: 40 + r() * 30, seed: r() * 1e6, wet: 1 }); continue; }   /* reeds also grow in the shallows */ const s = th * fd.R, mk = (kind, o) => out.push(Object.assign({ k, kind, th, s, sungT: -9 }, o));
      const dth = 150 / fd.R, dip = Math.min(P.height(th - dth), P.height(th + dth)) - h;
      if (f.hollow > .62 && f.light < .62 && s - lastCave > 2200 && r() < .8) { lastCave = s; mk('cave', { span: 150 + r() * 90, roof: 120 + r() * 50 }); continue; }
      if (f.moist > .5 && dip > 6 && s - lastPool > 900 && r() < .8) { lastPool = s; mk('pool', { span: 70 + Math.min(110, dip * 4), depth: Math.min(26, dip * .8) }); continue; }
      if (f.wind > .5 && f.hard > .4 && r() < .45) mk('rock', { size: 16 + r() * 14, holes: 2 + Math.floor(r() * 3), seed: r() * 1e6 });
      else if (f.moist > .55 && r() < .5) mk('reed', { n: 4 + Math.floor(r() * 4), hgt: 34 + r() * 26, seed: r() * 1e6 }); }
    /* v0.4b start shore (RS.Planet raises it on the ark): a wind rock, reeds and a pool a screen or two east of the landing, so the dry-land features are met at once.
       Only the start shore's own cells change (features are re-derived from the seed each load; the saved field deltas are per area and untouched). */
    if (P.type === 'ark' && RS.START_SHORE !== false && P.height(770 / fd.R) < P.height(640 / fd.R) - 10) { for (let i = out.length - 1; i >= 0; i--) if (out[i].s > 680 && out[i].s < 1000) out.splice(i, 1);
      const at = (kind, s, o) => out.push(Object.assign({ k: 9500 + Math.round(s / 10), kind, th: s / fd.R, s, sungT: -9, start: 1 }, o)); at('rock', 640, { size: 22, holes: 3, seed: 6407 }); at('pool', 770, { span: 90, depth: 24 }); at('reed', 905, { n: 6, hgt: 46, seed: 9051 }); out.sort((a, b) => a.s - b.s); }
    // the landing coast always has one wind rock on the first dry ground near the start (so the new sound is met early)
    if (!out.some(q => q.kind === 'rock' && Math.min(Math.abs(q.s), TAU * fd.R - q.s) < 2600)) for (let d = 1; d < 16; d++) { let done = 0; for (const sg of [1, -1]) { const th = sg * d * F.CELL / fd.R; if (P.height(th) > P.sea + 8) { out.push({ k: 9000 + d * sg, kind: 'rock', th: wrap(th), s: wrap(th) * fd.R, sungT: -9, size: 22, holes: 3, seed: d * 77, start: 1 }); done = 1; break; } } if (done) break; }
    // pools are surfaces at a level angle: the lower rim of the dip
    for (const q of out) if (q.kind === 'pool') { const d = 150 / fd.R; q.span = Math.min(q.span, 150); q.level = Math.min(P.height(q.th - d), P.height(q.th + d)) - 1; }   /* v0.4a: the rim the dip was measured at (wider spans spilled over a lower rim and left the pool near-empty) */
    fd.byKind = k => out.filter(q => q.kind === k); };
  F.near = (Sf, x, y, kind, R0) => { const fd = Sf.field; if (!fd) return null; const th = Sf.P.theta(x, y), s = wrap(th) * fd.R, C = TAU * fd.R; let best = null, bd = R0 || 1e9;
    for (const q of fd.feat) { if (kind && q.kind !== kind && !(kind === 'wind' && (q.kind === 'rock' || q.kind === 'reed'))) continue; let d = Math.abs(q.s - s); d = Math.min(d, C - d); if (d < bd) { bd = d; best = q; } } return best; };
  F.pos = (Sf, q, up = 0) => { const P = Sf.P, p = P.surf(q.th); return [p[0] + Math.sin(q.th) * up, p[1] - Math.cos(q.th) * up]; };
  const arcD = (Sf, q, th) => { let d = Math.abs(wrap(th) - wrap(q.th)); d = Math.min(d, TAU - d); return d * Sf.field.R; };
  // inside a cave (under its roof) / a pool (below its level)?
  /* v0.6.1 REAL CAVES: a cave is now a true overhang. Its roof is a static, pinned rock rim (one rod, ~30 particles, only while its chunk is loaded): anchored on the ground on the
     east side, arching over the hollow and ending in a hanging lip on the west side (the mouth). Same flat frame as the drawn dome, so what you see is what ohms bump. */
  /* v0.7 H.4: q.lift raises the arch over an ohm that lives under it (runtime only, never saved) */ F.ROOF = true; F.caveRoof = (Sf, q) => { const P = Sf.P, p = P.surf(q.th), up = [Math.sin(q.th), -Math.cos(q.th)], tg = [-up[1], up[0]], at = (a, u) => [p[0] + tg[0] * a + up[0] * u, p[1] + tg[1] * a + up[1] * u], out = [];
    for (let i = 0; i <= 14; i++) { const a = q.span - 1.4 * q.span * i / 14, u = 9 + (q.roof + (q.lift || 0) - 9) * Math.sqrt(Math.max(0, 1 - Math.pow(a / q.span, 2))); out.push(at(a, u)); } const l = out[out.length - 1]; out.push([l[0] - tg[0] * 10 - up[0] * 22, l[1] - tg[1] * 10 - up[1] * 22]); return out; };
  F.caveAt = (Sf, x, y) => { if (!Sf.field) return 0; const P = Sf.P, th = P.theta(x, y), q = F.near(Sf, x, y, 'cave', 400); if (!q) return 0; const d = arcD(Sf, q, th); if (d > q.span) return 0;
    const up = Math.hypot(x - P.cx, y - P.cy) - (P.R + P.height(th)); return up < q.roof ? sm(q.span, q.span * .7, d) : 0; };
  F.poolAt = (Sf, x, y) => { if (!Sf.field) return 0; const P = Sf.P, th = P.theta(x, y), q = F.near(Sf, x, y, 'pool', 260); if (!q) return 0; const r = Math.hypot(x - P.cx, y - P.cy) - P.R;
    return arcD(Sf, q, th) < q.span && r < q.level && r > P.height(th) - 40 ? 1 : 0; };
  // ---------------- acoustics: the field where a sound is made ----------------
  F.medium = (Sf, x, y, med) => { if (!Sf.field || x == null) return med; const f = F.at(Sf, x, y), cv = F.caveAt(Sf, x, y), pl = F.poolAt(Sf, x, y);
    med.cave = Math.max(med.cave || 0, cv); if (pl) med.water = 1; med.hard = f.hard; med.absorb = med.water ? f.absorb : Math.min(.95, f.absorb + Math.max(0, f.moist - .55) * .7); med.damp = f.moist;   /* v0.5b #14: damp ground (dew-kept, rained-on) muffles harshness */ med.echo = Math.max(f.echo * (1 - f.absorb * .5), cv); return med; };
  F.shape = (spec, med) => { if (med.hard == null) return spec; const ring = 1 + (med.hard - .5) * .3 - (med.absorb - .5) * .35;   // resonant ground rings a little longer, soft / absorbent ground damps
    spec.modes = spec.modes.map(m => ({ f: m.f, a: m.a * (1 - Math.max(0, med.absorb - .55) * .4 * Math.min(1, m.f / 2500)), d: m.d * ring })); spec.send = clamp((spec.send == null ? .3 : spec.send) + (med.echo - .5) * .15, 0, .95); return spec; };
  F.light = (Sf, x, y) => Sf.field ? (1 - .7 * F.caveAt(Sf, x, y)) * Math.min(1, .75 + .5 * F.at(Sf, x, y).light) : 1;   /* v0.4b: fields can only dim the light that feeds ohms (caves, shade), never brighten it past the v0.3.2 sky: bright patches had over-fed ohms, which kept duets going and delayed the first jam (crowd density 6.9 -> 8.9) */
  // ---------------- behaviour: comfort shapes how much an ohm plays (never where it goes) ----------------
  F.comfort = (Sf, c) => { if (!Sf.field || !c.P) return 0; const B = c.P.beh || {}, SE = c.P.sense || {}, cv = F.caveAt(Sf, c.x, c.y), f = F.at(Sf, c.x, c.y); let k = 0;
    if (SE.blind || (B.night || 0) > .6) k += .7 * cv + .2 * (.5 - f.light); else if ((B.lightLove || 0) > .6) k += -.6 * cv + .4 * (f.light - .5);
    const wet = Sf.mediumAt ? Sf.mediumAt(c.x, c.y).water : 0, wl = B.waterLove == null ? .5 : B.waterLove; k += wet ? (wl - .5) * 1.2 : wl > .75 ? -(wl - .75) * 1.6 + (f.moist - .5) * .4 : 0;
    k += f.rich * .5 - f.wear * .4; if (((c.P.loud || 1) < .85 || (B.shy || 0) > .6) && !(Sf.mediumAt && (Sf.mediumAt(c.x, c.y) || {}).water)) k += (f.moist - .5) * .5;   /* v0.5b #14: quiet / shy ohms prefer damp, muffled ground */
    return c.comfort = clamp(k, -1, 1); };
  F.restAdj = (Sf, c) => { const k = F.comfort(Sf, c); return k < -.35 ? 1 : k > .45 ? -1 : 0; };
  // tempo: the place an ohm is born nudges its starting pulse (hard, ringing ground quicker; soft, absorbent ground slower); then the ohms own it
  F.tempoMul = (Sf, x, y) => { if (!Sf.field || x == null) return 1; const f = F.at(Sf, x, y); return clamp(1 + (f.hard - .5) * .16 - (f.absorb - .5) * .12, .9, 1.1); };
  // ---------------- the music writes the fields (slowly) ----------------
  F.tick = (Sf, dt) => { const fd = Sf.field; if (!fd) return; fd.t += dt; if (fd.t < 1) return; const step = fd.t; fd.t = 0; const D = Sf.mods.fieldD || (Sf.mods.fieldD = {}), n = Math.ceil(TAU * fd.R / F.AREA);
    const bump = (th, i, v) => { const a = F.area(Sf, th); for (const o of [-1, 0, 1]) { const k = ((a + o) % n + n) % n, e = D[k] || (D[k] = [0, 0]); e[i] = clamp(e[i] + v * (o ? .4 : 1), 0, 1); } };
    for (const j of Sf.jams || []) { if (!j.members || j.members.length < 2) continue; const th = Sf.P.theta(j.x, j.y), coh = j.coh || 0;
      if (coh > .6) { bump(th, 0, .006 * step * (coh - .5) * 2); bump(th, 1, -.004 * step); Sf.stats.fieldRich = (Sf.stats.fieldRich || 0) + 1; }
      const harsh = j.members.reduce((s, c) => s + ((c.P && c.P.inst && c.P.inst.noise) || 0) + ((c.P && c.P.inst && c.P.inst.fold) || 0) * .5, 0) / j.members.length;
      if (coh < .35 && harsh > .25) { bump(th, 1, .005 * step * (1 - coh)); Sf.stats.fieldWear = (Sf.stats.fieldWear || 0) + 1; } } };
  // ---------------- wind: rocks and reeds sound in the wind or when a wind-blowing ohm breathes on them ----------------
  F.blower = c => { if (c._blow == null) { const id = RS.Inst && RS.Inst.identity ? RS.Inst.identity(c.P, c.g) : ''; c._blow = c.P && (c.P.style === 'jet' || id === 'wind' || /^phys:blow-/.test(id)) ? 1 : 0; } return c._blow; };
  F.windAt = (Sf, q, t) => { const f = F.raw(Sf, q.th), atm = Sf.env && Sf.env.atmo != null ? Sf.env.atmo : .6, gust = 70 * atm * f.wind * Math.pow(Math.max(0, Math.sin(t * .31 + q.k * 1.7)), 2);
    return (Math.abs((Sf.wind && Sf.wind[0]) || 0) + gust) * (.4 + f.wind); };
  F.onGrid = (Sf, g, tg) => { const fd = Sf.field; if (!fd || g % 4 !== 0) return; const t = Sf.now();
    for (const q of fd.feat) { if (q.kind !== 'rock' && q.kind !== 'reed') continue; const [x, y] = F.pos(Sf, q, 10); if (!Sf.inView(x, y, 500)) continue; if (t - q.sungT < (q.kind === 'rock' ? 4 : 2) * (Sf.M.barDur ? Sf.M.barDur() / 2 : 1)) continue;
      let near = null, bd = 900, blow = 0; for (const c of Sf.creatures) { if (c.dead || !c.mind) continue; const d = Math.hypot(c.x - x, c.y - y); if (d < bd) { bd = d; near = c; } if (d < 170 && F.blower(c) && !(c.mind.rest > 0)) blow = c; }
      if (!near) continue; const drive = ((q.wet && Sf.P.height(q.th) < Sf.P.sea ? 0 : F.windAt(Sf, q, t)) + (blow ? 140 : 0)) / 150; if (drive < .55) { const lv = RS.Sym ? RS.Sym.farm(Sf, q, x, y, 0) : 0;   /* v0.5b #13: a well-farmed rock / reed bed keeps a quiet lasting drone going even in still air; others tune to it (its root is the nearest ohm's tonic) */
        if (lv >= .4 && !(t - q.droneT < 8) && !(t < q.droneT)) { const f0 = RS.Mind.hz(Sf, F.voiceMind(Sf, near, x, y), q.kind === 'rock' ? -14 : -7); if (f0 > 30 && f0 < 2000) { Sf.play({ modes: [{ f: f0, a: 1, d: 7 }, { f: f0 * 1.5, a: .18, d: 5 }, { f: f0 * 2.003, a: .12, d: 4 }], gain: .008 + .01 * lv, att: 1.2, send: .6, force: true, raw: true, lane: 'wind', kind: 'farmDrone', f0 }, tg, x, y); q.droneT = t; Sf.stats.farmDrone = (Sf.stats.farmDrone || 0) + 1; } }
        continue; }
      if (RS.rng(RS.hash(fd.seed, q.k, g))() > Math.min(.75, drive * .4)) continue;
      const fb = RS.Sym ? RS.Sym.farm(Sf, q, x, y, blow) : 0;   /* v0.4b wind farmers: a tended feature rings longer + louder (never more often) */
      const m = F.voiceMind(Sf, near, x, y), rock = q.kind === 'rock', deg = [0, 2, 4][(q.k + (g >> 5)) % 3] + (rock ? -7 : 7), f0 = RS.Mind.hz(Sf, m, deg); if (!(f0 > 30 && f0 < 6000)) continue;
      const spec = { modes: [{ f: f0, a: 1, d: (rock ? 2.2 : 1.1) * (1 + .5 * fb) }, { f: f0 * 2.004, a: .28, d: rock ? 1.2 : .8 }, { f: f0 * 3.01, a: rock ? .12 : .05, d: .6 }], gain: (.016 + .018 * Math.min(1, drive - .5)) * (1 + .4 * fb), att: rock ? .22 : .1, send: .55, force: true, raw: true, lane: 'wind', kind: rock ? 'windRock' : 'reed', f0 };
      Sf.play(spec, tg, x, y); q.sungT = t; q.by = blow ? blow.id : 0; Sf.stats[rock ? 'windRock' : 'windReed'] = (Sf.stats[rock ? 'windRock' : 'windReed'] || 0) + 1; if (blow) { Sf.stats.windBlown = (Sf.stats.windBlown || 0) + 1; blow.blowT = t; blow.blowAt = [x, y]; } } };
  // a wind-blowing ohm is drawn (gently, within its leash) to the nearest wind rock / reed bed
  F.blowGoal = (Sf, c) => { if (!Sf.field || !F.blower(c)) return null; const q = F.near(Sf, c.x, c.y, 'wind', 420); if (!q) return null; const [x, y] = F.pos(Sf, q, 24); return { k: 'blow', x, y, stop: 90, mag: .06 }; };
  // ---------------- weather follows the fields ----------------
  F.rainBias = (Sf) => { if (!Sf.field || !Sf.view) return 0; const v = Sf.view; return F.at(Sf, (v.x0 + v.x1) / 2).moist - .5; };
  F.dropOK = (Sf, x) => !Sf.field || F.at(Sf, x).moist > .22;   // rain shadow over dry ground
  F.boltX = (Sf, xs) => { if (!Sf.field) return xs[0]; let b = xs[0], bc = -1; for (const x of xs) { const c = F.at(Sf, x).charge; if (c > bc) { bc = c; b = x; } } return b; };
  // ---------------- drawing (world space, after the terrain) ----------------
  const css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`, mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  F.draw = (ctx, Sf, cam, t) => { const fd = Sf.field; if (!fd || fd.gas) return; const P = Sf.P, day = Sf.day == null ? 1 : Sf.day, lit = .45 + day * .55, thc = P.theta(cam.x, cam.y), span = Math.min(.5, Math.hypot(Sf.view.x1 - Sf.view.x0, Sf.view.y1 - Sf.view.y0) / P.R * .6 + .01);
    // blended biome skin: a soft band whose colour follows the local fields (moist -> green-blue, warm -> ochre, rich -> fresh green, worn -> grey)
    const N = 90; ctx.lineCap = 'round'; ctx.lineWidth = Math.max(3, 9 / (cam.z || 1)); let prev = null;
    for (let k = 0; k <= N; k++) { const th = thc - span + 2 * span * k / N, p = P.surf(th); const sub = P.height(th) < P.sea; const f = F.atTh(Sf, th), base = P.BIOME_COL[f.biome] || [120, 110, 100];
      let c = mix(base, f.moist > .5 ? [70, 140, 110] : [190, 160, 100], Math.abs(f.moist - .5) * .7); c = mix(c, [205, 150, 90], Math.max(0, f.temp - .6)); c = mix(c, [110, 190, 100], f.rich * .7); c = mix(c, [128, 122, 125], f.wear * .8);
      if (prev) { ctx.strokeStyle = css(c, (sub ? .2 : .38) * lit); ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(p[0], p[1]); ctx.stroke(); } prev = p;
      if (f.rich > .15 && k % 2 === 0 && !sub) { const up = [Math.sin(th), -Math.cos(th)], n = Math.ceil(f.rich * 4); ctx.strokeStyle = css([120, 200, 110], .55 * lit); ctx.lineWidth = 1.4;   // grass grows where the music was good
        for (let i = 0; i < n; i++) { const o = (i - n / 2) * 5, bx = p[0] + up[1] * -o, by = p[1] + up[0] * o, hh = 6 + 8 * f.rich + 3 * Math.sin(t * 1.3 + k + i); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + up[0] * hh + Math.sin(t + i) * 1.5, by + up[1] * hh); ctx.stroke(); } ctx.lineWidth = Math.max(3, 9 / (cam.z || 1)); } }
    const wnd = (Sf.wind && Sf.wind[0]) || 0;
    for (const q of fd.feat) { let d = Math.abs(wrap(q.th) - wrap(thc)); d = Math.min(d, TAU - d); if (d > span + .03) continue; const p = P.surf(q.th), up = [Math.sin(q.th), -Math.cos(q.th)], tg = [-up[1], up[0]], glow = Math.max(0, 1 - (t - q.sungT) / 1.5);
      const at = (a, u) => [p[0] + tg[0] * a + up[0] * u, p[1] + tg[1] * a + up[1] * u];
      if (q.kind === 'cave' && F.ROOF && !P.gas) { const rf = F.caveRoof(Sf, q); ctx.fillStyle = css([6, 6, 14], .46); ctx.beginPath(); rf.forEach((s, i) => i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])); const g0 = at(-q.span * .4 - 10, 0), g1 = at(q.span, 0); ctx.lineTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.closePath(); ctx.fill();   /* v0.6.1 the hollow sits under the overhang only; the west side is an open mouth */
        ctx.strokeStyle = css([14 + 50 * lit, 12 + 46 * lit, 18 + 54 * lit], .95); ctx.lineWidth = 15; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.beginPath(); rf.forEach((s, i) => i ? ctx.lineTo(s[0], s[1]) : ctx.moveTo(s[0], s[1])); ctx.stroke(); ctx.lineCap = 'butt'; }
      else if (q.kind === 'cave') { const L = at(-q.span, 0), Rr = at(q.span, 0); ctx.fillStyle = css([6, 6, 14], .42); ctx.beginPath(); ctx.moveTo(L[0], L[1]); for (let i = 0; i <= 16; i++) { const a = -q.span + 2 * q.span * i / 16, u = q.roof * Math.sqrt(Math.max(0, 1 - Math.pow(a / q.span, 2))); const s = at(a, u); ctx.lineTo(s[0], s[1]); } ctx.lineTo(Rr[0], Rr[1]); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = css(mix([90, 80, 85], [0, 0, 0], 1 - lit), .95); ctx.lineWidth = 16; ctx.beginPath(); for (let i = 0; i <= 16; i++) { const a = -q.span * 1.05 + 2.1 * q.span * i / 16, u = (q.roof + 6) * Math.sqrt(Math.max(0, 1 - Math.pow(a / (q.span * 1.05), 2))); const s = at(a, u); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); } ctx.stroke(); }
      else if (q.kind === 'pool' && !(RS.Water && Sf.water)) { const rr = P.R + q.level; ctx.fillStyle = css(Sf.pal && Sf.pal.water || [60, 110, 170], .55 + day * .15); ctx.beginPath(); let st = 0; const n = 24;
        for (let i = 0; i <= n; i++) { const th = q.th - q.span / fd.R + 2 * q.span / fd.R * i / n; if (P.height(th) >= q.level) continue; const s = [P.cx + Math.sin(th) * rr, P.cy - Math.cos(th) * rr]; if (st++) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); }
        for (let i = n; i >= 0; i--) { const th = q.th - q.span / fd.R + 2 * q.span / fd.R * i / n; if (P.height(th) >= q.level) continue; const s = P.surf(th); ctx.lineTo(s[0], s[1]); } if (st) { ctx.closePath(); ctx.fill(); } }
      else if (q.kind === 'rock') { const c = mix([120, 112, 118], [0, 0, 0], 1 - lit); ctx.fillStyle = css(c, .95); ctx.beginPath(); for (let i = 0; i <= 12; i++) { const a = Math.PI * i / 12, w = q.size * (1 + .18 * Math.sin(q.seed + i * 2.1)), s = at(Math.cos(a) * w, Math.sin(a) * w * 1.25); if (i) ctx.lineTo(s[0], s[1]); else ctx.moveTo(s[0], s[1]); } ctx.closePath(); ctx.fill();
        for (let h = 0; h < q.holes; h++) { const s = at((h - (q.holes - 1) / 2) * q.size * .55, q.size * (.5 + .25 * (h % 2))); ctx.fillStyle = glow > 0 ? css([255, 236, 190], .25 + .6 * glow) : css([14, 12, 18], .85); ctx.beginPath(); ctx.arc(s[0], s[1], 2.6 + q.size * .06, 0, TAU); ctx.fill(); } }
      else if (q.kind === 'reed') { const sway = clamp(wnd / 300, -1, 1) * .35; ctx.lineWidth = 1.6; for (let i = 0; i < q.n; i++) { const o = (i - q.n / 2) * 4.5, hh = q.hgt * (.75 + .25 * Math.sin(q.seed + i * 1.9)), w = sway + .08 * Math.sin(t * (1.1 + i * .13) + i) * (.4 + Math.abs(sway) * 2), b0 = at(o, 0), tip = at(o + Math.sin(w) * hh, Math.cos(w) * hh);
          ctx.strokeStyle = css(mix([110, 140, 80], [0, 0, 0], 1 - lit), .9); ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.quadraticCurveTo((b0[0] + tip[0]) / 2 + up[0] * hh * .1, (b0[1] + tip[1]) / 2 + up[1] * hh * .1, tip[0], tip[1]); ctx.stroke(); ctx.fillStyle = glow > 0 ? css([255, 230, 170], .4 + .5 * glow) : css(mix([140, 100, 60], [0, 0, 0], 1 - lit), .9); ctx.beginPath(); ctx.arc(tip[0], tip[1], 2.2, 0, TAU); ctx.fill(); } } }
    // wind streaks: faint lines drifting with the wind, more where the wind field is high
    if (Math.abs(wnd) > 25) { const v = Sf.view, n = Math.min(14, Math.floor(Math.abs(wnd) / 25)), dir = Math.sign(wnd); ctx.lineWidth = 1; for (let i = 0; i < n; i++) { const r = RS.rng(RS.hash('ws', i))(), r2 = RS.rng(RS.hash('ws2', i))(), ph = ((t * Math.abs(wnd) / 900 + r) % 1), x = dir > 0 ? v.x0 + ph * (v.x1 - v.x0) : v.x1 - ph * (v.x1 - v.x0), gy = Sf.ground(x), y = gy - 30 - r2 * Math.max(60, gy - v.y0 - 40) * .8;
        const f = F.at(Sf, x), a = .08 + .14 * f.wind; ctx.strokeStyle = css([235, 240, 255], a * Math.sin(ph * Math.PI)); ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - dir * 22, y - 3, x - dir * 46, y + 1); ctx.stroke(); } }
    // a wind-blowing ohm's breath: a soft puff toward what it plays
    for (const c of Sf.creatures) if (c.blowT && t >= c.blowT && t - c.blowT < .8 && c.blowAt) { const a = 1 - (t - c.blowT) / .8; ctx.strokeStyle = css([230, 240, 255], .35 * a); ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { const u = .3 + .2 * i + .3 * (1 - a); ctx.beginPath(); ctx.arc(c.x + (c.blowAt[0] - c.x) * u, c.y + (c.blowAt[1] - c.y) * u, Math.max(0, 4 + 5 * i * (1 - a)), 0, TAU); ctx.stroke(); } } };
  F.drawSky = (ctx, Sf, Wd, Ht) => { if (!Sf.field || !Sf.weather || !(Sf.weather.rain > 0)) return; const b = F.rainBias(Sf), a = clamp(.1 + b * .25, .04, .24); const g = ctx.createLinearGradient(0, 0, 0, Ht * .3); g.addColorStop(0, `rgba(60,64,78,${a})`); g.addColorStop(1, 'rgba(60,64,78,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, Wd, Ht * .3); };
})(typeof window !== 'undefined' ? window : globalThis);
