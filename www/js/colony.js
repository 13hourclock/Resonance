'use strict';
// Fusions & colonies: clusters of creatures joined by material springs; capabilities emerge from member genes; colonies build structures from a gene grammar.
(function (G) {
const RS = G.RS, C = RS.Creature, TAU = RS.TAU;
const K = RS.Colony = {};
// ---- fusion ----
/* v0.8b5 G6 (Wilbow 4:55 PM): ohms pulled apart by a two-finger spread won't re-fuse with each other for K.REFUSE s (game time); after that
   they fuse normally again. Pair marks live on the ohms (c.noFuse[id] = until), in memory only (a reload clears them). */
K.REFUSE = 240;
K.blocked = (Sf, a, b) => { const t = Sf.now(); return !!((a.noFuse && a.noFuse[b.id] > t) || (b.noFuse && b.noFuse[a.id] > t)); };
K.markApart = (Sf, A, B, sec) => { const until = Sf.now() + (sec == null ? K.REFUSE : sec); for (const a of A) for (const b of B) { (a.noFuse = a.noFuse || {})[b.id] = until; (b.noFuse = b.noFuse || {})[a.id] = until; } };
K.fuse = (Sf, a, b) => { const W = Sf.W; if (a === b || (a.cluster && a.cluster === b.cluster) || K.blocked(Sf, a, b)) return null; const links = [];
  // link nearest perimeter particles (up to 4 pairs)
  const pairs = []; for (const sa of a.segs) for (const i of sa.idx) for (const sb of b.segs) for (const j of sb.idx) { const d = Math.hypot(W.x[i] - W.x[j], W.y[i] - W.y[j]); pairs.push([d, i, j]); }
  pairs.sort((p, q) => p[0] - q[0]); const used = new Set(); for (const [d, i, j] of pairs) { if (links.length >= 4) break; if (used.has(i) || used.has(j)) continue; used.add(i); used.add(j); const s = W.addS(i, j, .6, Math.max(4, Math.min(d, 9)), -1); links.push({ s, i, j, a: a.id, b: b.id, rest: W.sr[s] }); }
  let cl = a.cluster || b.cluster; if (!cl) cl = { id: RS.ID_SEED != null ? 'k' + RS.newId().slice(1) : 'k' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), members: [], links: [], style: null, plan: null, built: 0 };
  for (const m of [a, b]) { if (m.cluster && m.cluster !== cl) { for (const q of m.cluster.members) if (!cl.members.includes(q)) { cl.members.push(q); q.cluster = cl; } cl.links.push(...m.cluster.links); } if (!cl.members.includes(m)) cl.members.push(m); m.cluster = cl; }
  cl.links.push(...links); K.caps(Sf, cl); if (!Sf.clusters.includes(cl)) Sf.clusters.push(cl); Sf.fx({ k: 'fuse', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, t: Sf.now(), dur: 1.2 }); Sf.stats.fusions = (Sf.stats.fusions || 0) + 1; Sf.fusionSound(a, b); return cl; };
K.separate = (Sf, c) => { const cl = c.cluster; if (!cl) return false; const W = Sf.W; const keep = []; for (const L of cl.links) { if (L.a === c.id || L.b === c.id) { W.sk[L.s] = 0; } else keep.push(L); } cl.links = keep; W.compact();
  // compact() renumbers springs: refresh link spring indices
  K.reindex(Sf, cl); cl.members = cl.members.filter(m => m !== c); c.cluster = null; if (cl.members.length < 2) { for (const m of cl.members) m.cluster = null; Sf.clusters = Sf.clusters.filter(q => q !== cl); } else K.caps(Sf, cl);
  Sf.fx({ k: 'pop', x: c.x, y: c.y, t: Sf.now(), dur: .7 }); Sf.popSound(c); Sf.stats.separations = (Sf.stats.separations || 0) + 1; return true; };
K.reindex = (Sf, cl) => { const W = Sf.W; for (const L of cl.links) { L.s = -1; for (let s = 0; s < W.ns; s++) if (((W.sa[s] === L.i && W.sb[s] === L.j) || (W.sa[s] === L.j && W.sb[s] === L.i)) && W.sbody[s] === -1) { L.s = s; break; } } cl.links = cl.links.filter(L => L.s >= 0); };
// ---- emergent capabilities from member genes + arrangement ----
K.caps = (Sf, cl) => { const ms = cl.members; let prop = 0, eye = 0, stiff = 0, voice = 0; const roles = new Map();
  for (const m of ms) { const P = m.P, p = P.maxSpeed / 140 * (P.mAmp / .3) * (P.style === 'jet' ? 1.4 : 1), e = P.clear * (.5 + P.beh.lightLove), s = P.stiff, v = P.density * P.bright;
    prop += p; eye += e; stiff += s; voice += v; const best = Math.max(p, e, s * .8, v); roles.set(m.id, best === p ? 'propel' : best === e ? 'eye' : best === v ? 'voice' : 'skeleton'); }
  const n = ms.length; let rough = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (!C.compat(ms[i], ms[j]).ok) rough++;
  cl.rough = n > 1 ? rough / (n * (n - 1) / 2) : 0; cl.caps = { propulsion: prop / Math.sqrt(n), sight: eye, skeleton: stiff / n, choir: voice, size: n }; cl.roles = roles;
  // skeleton members stiffen the joins; roughness weakens cohesion
  const k = RS.clamp(.35 + cl.caps.skeleton * .6 - cl.rough * .4, .15, 1); for (const L of cl.links) if (L.s >= 0) Sf.W.sk[L.s] = k; cl.cohesion = k; return cl.caps; };
// cluster brain: one organism. Leader sets a want; members with 'propel' role push, 'eye' members steer to light.
K.think = (Sf, cl, dt) => { const ms = cl.members.filter(m => !m.dead); if (ms.length < 2) return; let x = 0, y = 0; for (const m of ms) { x += m.x; y += m.y; } x /= ms.length; y /= ms.length; cl.x = x; cl.y = y;
  let dx = 0, dy = 0; for (const m of ms) { dx += m.want[0]; dy += m.want[1]; }
  if (cl.caps.sight > .3 && Sf.brightSpot) { const bs = Sf.brightSpot(); if (bs) { const d = Math.hypot(bs[0] - x, bs[1] - y) || 1; dx += (bs[0] - x) / d * cl.caps.sight * 2; dy += (bs[1] - y) / d * cl.caps.sight * 2; } }
  const m = Math.hypot(dx, dy) || 1; const want = [dx / m, dy / m];
  for (const q of ms) { const role = cl.roles.get(q.id); q.want = want; q.wantMag = (role === 'propel' ? 1.3 : .25) * q.activity * RS.clamp(cl.caps.propulsion, .3, 2); }
  // roughness: out-of-key members slowly loosen the bond and may drift out
  if (cl.rough > .5 && Math.random() < dt * .03) { const odd = ms[ms.length - 1]; K.separate(Sf, odd); }
  // separation by stretching: a grabbed member pulled far
  for (const L of cl.links) { if (L.s < 0) continue; const W = Sf.W, d = Math.hypot(W.x[L.i] - W.x[L.j], W.y[L.i] - W.y[L.j]); if (d > L.rest * 2.2 + 26) { const c = Sf.creatures.find(q => (q.id === L.a || q.id === L.b) && q.grabbed); if (c) { K.separate(Sf, c); break; } } }
  K.build(Sf, cl, dt); };
// choir: the cluster voice is a chord of its members' own pitches (in key if compatible; otherwise rough)
K.sing = (Sf, cl, when) => { const ms = cl.members; ms.forEach((m, k) => { C.sing(Sf, m, [0, 2, 4, 7, 9][k % 5] + (cl.rough > 0 && !C.compat(ms[0], m).ok ? .35 : 0), when, { gain: .6 / Math.sqrt(ms.length) }); }); Sf.fx({ k: 'choir', x: cl.x, y: cl.y, t: when, dur: .8 }); };
// ---- building: gene grammar + environment + (cultural) style ----
K.STYLES = ['tower', 'arch', 'harp', 'web', 'shell', 'drum', 'ring'];
K.styleOf = (Sf, ms) => { if (ms[0] && ms[0].style) return ms[0].style; let v = [0, 0, 0, 0, 0]; for (const m of ms) { v[0] += m.g[73]; v[1] += m.g[76]; v[2] += m.g[0]; v[3] += m.g[50]; v[4] += m.g[86]; } v = v.map(a => a / ms.length);
  const micro = (Sf.env.g || 900) < 200; let k = Math.floor(RS.clamp(v[0] * 3 + v[1] * 2 + v[3] * 2, 0, 6.99)) % 7; if (micro) k = 6; else if (K.STYLES[k] === 'ring') k = 2; return { kind: K.STYLES[k], scale: .6 + v[2] * .9, count: 3 + Math.floor(v[4] * 6), twist: v[3], seed: RS.hash(ms.map(m => m.id).join(), Sf.seed) }; };
K.plan = (Sf, st, x, y) => { const r = RS.rng(st.seed), gy = Sf.W.groundY(x), s = st.scale, P = [];
  const base = Math.min(y, gy); const H = 50 + 90 * s * (1100 / Math.max(300, Sf.env.g || 900));
  if (st.kind === 'tower') for (let k = 0; k < st.count + 2; k++) P.push({ t: 'bead', x: x + Math.sin(k * st.twist * 2) * 6, y: gy - 10 - k * 15, r: 8 - k * .3 });
  else if (st.kind === 'arch') { const w = 70 + 80 * s; P.push({ t: 'rod', pts: Array.from({ length: 12 }, (_, i) => { const a = Math.PI * i / 11; return [x - w / 2 * Math.cos(a), gy - 4 - H * .7 * Math.sin(a)]; }), thick: 7, pinEnds: true }); }
  else if (st.kind === 'harp') { const w = 60 + 70 * s, n = st.count; P.push({ t: 'rod', pts: [[x - w / 2, gy], [x - w / 2, gy - H]], thick: 9, pinEnds: 'start' }); P.push({ t: 'rod', pts: [[x + w / 2, gy], [x + w / 2, gy - H * (.6 + r() * .3)]], thick: 9, pinEnds: 'start' });
    for (let k = 0; k < n; k++) { const yy = gy - H * (.2 + .7 * k / n); P.push({ t: 'string', pts: [[x - w / 2 + 6, yy], [x + w / 2 - 6, yy - r.range(-8, 8)]], thick: 2.5 }); } }
  else if (st.kind === 'web') { const R = 40 + 50 * s; for (let k = 0; k < st.count + 2; k++) { const a = Math.PI * (k + .5) / (st.count + 2); P.push({ t: 'string', pts: [[x, gy - R], [x + Math.cos(a + Math.PI) * R * 1.2, gy - R + Math.sin(a + Math.PI) * R * 1.2 * -1]], thick: 2, webCentre: [x, gy - R] }); } }
  else if (st.kind === 'shell') { for (let k = 0; k < st.count * 3; k++) { const a = k * .7 + st.twist * 3, rr = 6 + k * 2.5 * s; P.push({ t: 'bead', x: x + Math.cos(a) * rr, y: gy - 30 - Math.sin(a) * rr * .8, r: 5 + k * .2, fix: true }); } }
  else if (st.kind === 'drum') { const R = 22 + 20 * s; P.push({ t: 'blob', pts: Array.from({ length: 20 }, (_, i) => [x + R * Math.cos(i / 20 * TAU), gy - R - 2 + R * .6 * Math.sin(i / 20 * TAU)]), pinBottom: true }); }
  else if (st.kind === 'ring') { const R = 50 + 40 * s; for (let k = 0; k < 12 + st.count; k++) { const a = k / (12 + st.count) * TAU; P.push({ t: 'bead', x: x + Math.cos(a) * R, y: y + Math.sin(a) * R, r: 5, ring: [x, y] }); } }
  return P; };
K.build = (Sf, cl, dt) => { const ms = cl.members; if (!cl.style) { cl.style = K.styleOf(Sf, ms); for (const m of ms) m.style = cl.style; }
  if (!cl.plan) { cl.plan = K.plan(Sf, cl.style, cl.x, cl.y); cl.step = 0; cl.made = []; }
  if (cl.step >= cl.plan.length) return; const energy = ms.reduce((a, m) => a + m.energy, 0) / ms.length; cl.buildT = (cl.buildT || 0) + dt * (.4 + energy) * (Sf.buildRate || 1);
  if (cl.buildT < 1.6) return; cl.buildT = 0; const item = cl.plan[cl.step++]; const b = Sf.makeStructure(item, cl); if (b) { cl.made.push(b); for (const m of ms) m.energy = Math.max(0, m.energy - .02); Sf.stats.built = (Sf.stats.built || 0) + 1; } };
})(typeof window !== 'undefined' ? window : globalThis);
