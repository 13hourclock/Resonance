// Resonance — orbit.js: push objects into orbit. An object (not a creature) thrown upward past escape speed (from this world's gravity)
// leaves the ground, becomes a satellite and keeps sounding: once per orbit it passes overhead and rings its own tone (with a Doppler
// glide), on the grid, in key (the gate places it). Satellites persist with the world.
(function (G) { const RS = G.RS = G.RS || {};
RS.Orbit = Sf => { const O = { sats: [], pending: new Map() }; const W = Sf.W, TAU = Math.PI * 2;
  O.escapeV = () => Math.sqrt(2 * (W.grav.g || 900) * 650);   // must out-run gravity for ~650 px of climb (low-gravity worlds are easier)
  // radial "up" = away from the planet centre
  const up = (x, y) => { const g = W.grav, dx = x - g.cx, dy = y - g.cy, d = Math.hypot(dx, dy) || 1; return [dx / d, dy / d]; };
  O.thrown = (b, vx, vy) => { if (!b || !b.meta || b.meta.role === 'creature' || b.meta.role === 'limb' || b.meta.role === 'egg' || b.kind === 'water') return false; const [cx, cy] = W.center(b), [ux, uy] = up(cx, cy), vr = vx * ux + vy * uy;
    if (vr < O.escapeV() * .98) return false; O.pending.set(b.id, { b, t: Sf.now() }); return true; };
  O.capture = b => { const [cx, cy] = W.center(b), spec = Sf.S.strike(b, cx, cy, 400, { t: Sf.now() }), n = O.sats.length, r = RS.rng(RS.hash('orbit', b.id, n));
    const s = { f0: spec.f0, modes: spec.modes.slice(0, 4).map(m => ({ f: m.f, a: m.a, d: Math.min(m.d, 3) })), col: Sf.colourOf(b), bars: 2 + (n % 4) + (r() < .3 ? 1 : 0), ph: Math.floor(r() * 4), a0: r() * TAU, tilt: r() * .5 - .25, born: Sf.now() };
    W.removeBody(b); O.sats.push(s); if (O.sats.length > 12) O.sats.shift(); Sf.stats.satellites = (Sf.stats.satellites || 0) + 1; Sf.fx({ k: 'launch', x: cx, y: cy, col: s.col, dur: 1.5 }); Sf.dirty && Sf.chunkKey && Sf.dirty.add(Sf.chunkKey(Sf.P.chunkOf(Sf.P.theta(cx, cy)))); return s; };
  O.tick = () => { for (const [id, p] of O.pending) { const b = p.b; if (!W.bodies.has(id)) { O.pending.delete(id); continue; } const [cx, cy] = W.center(b), alt = Sf.alt ? Sf.alt(cx, cy) : Sf.ground(cx) - cy;   /* v0.8a9: radial altitude */
      if (alt > 600) { O.pending.delete(id); O.capture(b); } else if (Sf.now() - p.t > 4) O.pending.delete(id); } };
  // position on the sky arc (screen fraction), one lap per s.bars bars
  O.pos = (s, t) => { const lap = s.bars * Sf.M.barDur(), a = s.a0 + TAU * ((t - s.born) / lap); return { a, x: .5 + Math.cos(a) * .46, y: .16 + Math.sin(a) * .07 + s.tilt * Math.cos(a) * .1, front: Math.sin(a) > -.2 }; };
  O.onGrid = (g, tg) => { if (!O.sats.length || ((g % 16) + 16) % 16) return; const bar = Math.floor(g / 16);
    O.sats.forEach((s, k) => { if ((bar + s.ph) % s.bars) return; s.pingT = tg; Sf.play({ modes: s.modes, f0: s.f0, gain: .035, att: .01, send: .7, glide: .9997, lane: 'sat' + k, kind: 'satellite', grid: true }, tg, null, null); Sf.stats.satPings = (Sf.stats.satPings || 0) + 1; }); };
  O.pack = () => O.sats.map(s => Object.assign({}, s, { born: 0 }));
  O.unpack = a => { O.sats = (a || []).map(s => Object.assign({}, s, { born: Sf.now() })); };
  return O; };
})(typeof window !== 'undefined' ? window : globalThis);
