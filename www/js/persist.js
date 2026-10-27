'use strict';
// v0.8 H (chunk 1): PERSISTENCE FOUNDATION. A fresh save system under new 'rs2:' keys (Wilbow 3:12: old rs1 saves are ignored, never migrated, never
// deleted). Layout:  rs2:p = profile (lineage, guide hint progress, galaxies index, launch stats, other meta)  |  rs2:g:<useed> = one galaxy (orbit
// nudges, aliveness, scalar world mods, seeds, index of CHANGED worlds)  |  rs2:w:<useed>:<sys>:<body> = one world header (sats, mods, mix, daw,
// items, clay, grow, water, chunk list)  |  rs2:c:<useed>:<sys>:<body>:<ci> = one chunk of one world (bodies + ohms). Every record is
// { v, t, k, comp: { id: { v, d } } } built by a VERSIONED COMPONENT REGISTRY (RS.Save.register): each component has a scope, a version, pack/unpack
// and step-wise migrations; components this build does not know (or newer versions) are kept verbatim and written back untouched.
// Saving is a DELTA by place: only touched chunks, and only when their packed text differs from the last write. A world that was never changed
// stores nothing. Writes happen in idle time (2 s after the last edit, at most 30 s after the first pending one, and a 60 s drift pass while ohms
// live there), one chunk per slice inside requestIdleCallback with a ~3 ms budget; hiding / leaving the app flushes synchronously.
// O1: per-ohm counters (c.tally = { w: watched seconds ON SCREEN only, i: interactions (tap, catch, grab, play, DNA edit), o: offspring, t: teachers })
// are saved as the 'tally' ohm component. No per-frame work is added off screen (one check per second, on-screen ohms only).
(function (G) {
const RS = G.RS, St = RS.Store; if (!St) return;
St.prefix = 'rs2:';   // FRESH START: rs1 keys are never loaded (ready() only reads keys under the current prefix)
const now = () => SV.now();   // scheduling clock (tests may fake it)
const rt = () => (G.performance && G.performance.now ? G.performance.now() : Date.now());   // real clock, for slice budgets / timings
const SV = RS.Save = { V: 1, comps: {}, order: {}, unk: {}, cur: null, cfg: { quiet: 2000, maxWait: 30000, drift: 60000, budget: 3, worldMax: 1000000, chunkMax: 200000 },
  now: () => (G.performance && G.performance.now ? G.performance.now() : Date.now()),
  stats: { writes: 0, skipped: 0, bytes: 0, slices: 0, sliceMs: [], flushMs: 0, errs: 0, newer: 0, worldBytes: {} } };
// ---------------- keys ----------------
SV.K = { p: () => 'rs2:p', g: u => 'rs2:g:' + u, w: (u, sys, bk) => 'rs2:w:' + u + ':' + sys + ':' + bk, c: (wk, ci) => 'rs2:c:' + wk.slice(6) + ':' + ci };
SV.worldKey = (u, S, b, bodyKey) => SV.K.w(u, S.i, b.ark ? 'ark' : bodyKey(S, b));
SV.parseW = k => { const p = String(k).split(':'); return p[0] === 'rs2' && p[1] === 'w' && p.length >= 5 ? { u: +p[2], sys: +p[3], bk: p.slice(4).join(':'), tail: p.slice(3).join(':') } : null; };
// ---------------- registry ----------------
SV.register = (id, spec) => { const s = Object.assign({ v: 1, migrate: {} }, spec, { id }); if (!s.scope || !s.pack || !s.unpack) throw new Error('Save.register ' + id + ': scope/pack/unpack needed');
  const o = SV.order[s.scope] = (SV.order[s.scope] || []).filter(x => x !== id); o.push(id); SV.comps[id] = s; return s; };
SV.packComps = (scope, ctx, keep) => { const comp = {}; for (const id of SV.order[scope] || []) { const s = SV.comps[id]; let d; try { d = s.pack(ctx); } catch (e) { SV.stats.errs++; SV.lastErr = id + ': ' + e; continue; } if (d !== undefined && d !== null) comp[id] = { v: s.v, d }; }
  if (keep) for (const id in keep) comp[id] = keep[id];   // unknown / newer components ride along untouched
  return comp; };
SV.unpackComps = (scope, ctx, comp) => { comp = comp && typeof comp === 'object' ? comp : {}; const keep = {}; let nk = 0;
  for (const id in comp) { const s = SV.comps[id]; if (!s || s.scope !== scope) { keep[id] = comp[id]; nk++; } else if (comp[id] && (comp[id].v || 1) > s.v) { keep[id] = comp[id]; nk++; SV.stats.newer++; } }
  for (const id of SV.order[scope] || []) { const e = comp[id]; if (!e || keep[id]) continue; const s = SV.comps[id]; let d = e.d, v = e.v || 1, g = 0;
    while (v < s.v && g++ < 64) { const m = s.migrate[v]; if (!m) break; d = m(d, ctx); v++; }
    if (v !== s.v) { keep[id] = e; nk++; continue; }
    try { s.unpack(ctx, d); } catch (er) { keep[id] = e; nk++; SV.stats.errs++; SV.lastErr = id + ': ' + er; } }
  return nk ? keep : null; };
// ---------------- raw records (never through Store.get: its rs1 migrations must not touch rs2 records) ----------------
const parse = s => { try { const d = JSON.parse(s); return d && typeof d === 'object' ? d : null; } catch (e) { return null; } };
SV.read = k => { for (const kk of [k, k + '.bak']) { const s = St.raw.get(kk); if (!s) continue; const d = parse(s); if (d && d.comp) return d; } return null; };
SV.has = k => St.raw.get(k) != null;
// body = record text without its time stamp (used to skip writes that change nothing); the stored text carries t first so Store.ready can pick the newest copy
const body = (k, comp) => JSON.stringify({ v: SV.V, k, comp });
// SV.last keeps a digest of the last body written per key (length + two 32-bit hashes), not the text: unchanged chunks are skipped without a second copy of every save in memory
const dig = s => { let a = 0x811c9dc5, b = 5381; for (let i = 0; i < s.length; i++) { const c = s.charCodeAt(i); a = Math.imul(a ^ c, 16777619); b = (Math.imul(b, 33) + c) | 0; } return s.length + ':' + (a >>> 0).toString(36) + ':' + (b >>> 0).toString(36); };
SV.dig = dig;
const stampd = (b, t) => '{"t":' + t + ',' + b.slice(1);
SV.last = {};   // key -> last written body
SV.put = (list, t) => { const out = []; t = t || Date.now(); for (const [k, b] of list) { const d = dig(b); if (SV.last[k] === d) { SV.stats.skipped++; continue; } SV.last[k] = d; const s = stampd(b, t); out.push([k, s]); SV.stats.bytes += s.length; }
  if (out.length) { St.putStrs(out); SV.stats.writes += out.length; } return out.length; };
SV.del = k => { delete SV.last[k]; if (St.raw.get(k) != null) St.del(k); };
// ================= PROFILE + GALAXY (App.meta is split across rs2:p and rs2:g:<useed>, joined again on load) =================
SV.prof = { guide: null, gal: {}, stats: { launches: 0 } };   // profile-owned state
SV.gw = {};    // useed -> { worldTail: [tMin, nOhms, alive] }  (index of changed worlds)
const GUIDE_LOCAL = { id: 1, t: 1 };   // the guide ohm's id and its world-clock stamp stay with the world
SV.register('lineage', { scope: 'profile', pack: c => c.meta.lineage || [], unpack: (c, d) => { c.meta.lineage = d; } });
SV.register('guide', { scope: 'profile', pack: () => SV.prof.guide || undefined, unpack: (c, d) => { SV.prof.guide = d; } });
SV.register('galaxies', { scope: 'profile', pack: () => SV.prof.gal, unpack: (c, d) => { SV.prof.gal = d || {}; } });
SV.register('pstats', { scope: 'profile', pack: () => SV.prof.stats, unpack: (c, d) => { SV.prof.stats = d || { launches: 0 }; } });
const META_SPLIT = { lineage: 1, alive: 1, orbit: 1, mods: 1, seeds: 1, t: 1, v: 1 };
SV.register('meta', { scope: 'profile', pack: c => { const o = {}; for (const k in c.meta) if (!META_SPLIT[k]) o[k] = c.meta[k]; return o; }, unpack: (c, d) => { Object.assign(c.meta, d); } });
const galOf = k => { const w = SV.parseW(k); return w ? w.u : null; };
const scal = m => { const o = {}; for (const k in m || {}) { const v = m[k]; if (v == null || typeof v !== 'object') o[k] = v; } return o; };
SV.register('orbit', { scope: 'galaxy', pack: c => c.meta.orbit && c.meta.orbit[c.u], unpack: (c, d) => { (c.meta.orbit = c.meta.orbit || {})[c.u] = d; } });
SV.register('alive', { scope: 'galaxy', pack: c => { const o = {}, p = c.u + ':'; for (const k in c.meta.alive || {}) if (k.startsWith(p)) o[k.slice(p.length)] = c.meta.alive[k]; return o; }, unpack: (c, d) => { c.meta.alive = c.meta.alive || {}; for (const k in d) c.meta.alive[c.u + ':' + k] = d[k]; } });
SV.register('wmods', { scope: 'galaxy', pack: c => { const o = {}; for (const k in c.meta.mods || {}) if (galOf(k) === c.u) o[SV.parseW(k).tail] = scal(c.meta.mods[k]); return o; },
  unpack: (c, d) => { c.meta.mods = c.meta.mods || {}; for (const t in d) { const k = 'rs2:w:' + c.u + ':' + t; c.meta.mods[k] = Object.assign(c.meta.mods[k] || {}, d[t]); } } });
SV.register('seeds', { scope: 'galaxy', pack: c => { const o = {}; for (const k in c.meta.seeds || {}) if (galOf(k) === c.u) o[k] = c.meta.seeds[k]; return o; }, unpack: (c, d) => { c.meta.seeds = Object.assign(c.meta.seeds || {}, d); } });
SV.register('worlds', { scope: 'galaxy', pack: c => SV.gw[c.u] || {}, unpack: (c, d) => { SV.gw[c.u] = d || {}; } });
const emptyMeta = () => ({ v: RS.SAVE_V, useed: 1, lineage: [], alive: {}, orbit: {}, mods: {}, seen: {}, t: Date.now() });
SV.loadMeta = () => { const meta = emptyMeta(), pr = SV.read(SV.K.p()); SV.prof = { guide: null, gal: {}, stats: { launches: 0 } }; SV.gw = {};
  if (pr) { SV.unk[SV.K.p()] = SV.unpackComps('profile', { meta }, pr.comp); SV.last[SV.K.p()] = dig(body(SV.K.p(), pr.comp)); }
  const us = new Set(Object.keys(SV.prof.gal).map(Number)); us.add(+meta.useed);
  for (const u of us) { const k = SV.K.g(u), r = SV.read(k); if (!r) continue; SV.unk[k] = SV.unpackComps('galaxy', { meta, u }, r.comp); SV.last[k] = dig(body(k, r.comp)); }
  return meta; };
SV.saveMeta = meta => { meta.t = Date.now(); const us = new Set(); const add = u => { if (u != null && isFinite(u)) us.add(+u); };
  for (const k in meta.mods || {}) add(galOf(k)); for (const k in meta.seeds || {}) add(galOf(k)); for (const u in meta.orbit || {}) add(u); for (const u in SV.gw) add(u); for (const u in SV.prof.gal) add(u);
  const list = [];
  for (const u of us) { const ctx = { meta, u }, comp = SV.packComps('galaxy', ctx, SV.unk[SV.K.g(u)]); const nW = Object.keys(comp.worlds ? comp.worlds.d : {}).length, nO = comp.orbit ? 1 : 0, nS = Object.keys(comp.seeds ? comp.seeds.d : {}).length;
    if (!nW && !nO && !nS && !SV.prof.gal[u]) continue;   // a galaxy where nothing was changed is not recorded
    SV.prof.gal[u] = [Math.floor(Date.now() / 60000), nW]; list.push([SV.K.g(u), body(SV.K.g(u), comp)]); }
  const pk = SV.K.p(); list.push([pk, body(pk, SV.packComps('profile', { meta }, SV.unk[pk]))]);
  return SV.put(list, meta.t) >= 0; };
// ---- the old Store API keeps working for app.js: meta() / saveMeta() / surfKey() now speak rs2
St.meta = () => SV.loadMeta();
St.saveMeta = m => SV.saveMeta(m);
St.surfKey = (u, sys, bk) => SV.K.w(u, sys, bk);
// ---- reachability: every changed world is listed in its galaxy's record, every such galaxy in the profile
SV.changedWorlds = () => { const out = []; for (const u in SV.gw) for (const t in SV.gw[u]) out.push({ u: +u, key: 'rs2:w:' + u + ':' + t, tail: t, info: SV.gw[u][t] }); return out; };
SV.galaxies = () => Object.keys(SV.prof.gal).map(Number).filter(u => SV.gw[u] && Object.keys(SV.gw[u]).length);
SV.isChanged = k => { const w = SV.parseW(k); return !!(w && SV.gw[w.u] && SV.gw[w.u][w.tail]); };
// ================= WORLD: header + chunk components =================
const HDR = ['sats', 'mods', 'mix', 'daw', 'items', 'clay', 'grow', 'water'];
for (const f of HDR) SV.register(f, { scope: 'world', pack: c => c.h[f], unpack: (c, d) => { c.h[f] = d; } });
SV.register('world', { scope: 'world', pack: c => ({ started: c.h.started, alive: c.h.alive, n: c.h.n, cis: c.cis }), unpack: (c, d) => { c.h.started = d.started; c.h.alive = d.alive; c.h.n = d.n; c.cis = d.cis || []; } });
// header fields a later build adds to Sf.packHeader() without registering them still persist (verbatim)
SV.register('hx', { scope: 'world', pack: c => { const o = {}; let n = 0; for (const k in c.h) if (!(k in HX_KNOWN)) { o[k] = c.h[k]; n++; } return n ? o : undefined; }, unpack: (c, d) => { Object.assign(c.h, d); } });
const HX_KNOWN = { v: 1, t: 1, chunks: 1, started: 1, alive: 1, n: 1 }; for (const f of HDR) HX_KNOWN[f] = 1;
SV.register('bodies', { scope: 'chunk', pack: c => c.d.b || [], unpack: (c, d) => { c.d.b = d || []; } });
SV.register('ohms', { scope: 'chunk', pack: c => c.d.c || [], unpack: (c, d) => { c.d.c = d || []; } });
SV.register('cx', { scope: 'chunk', pack: c => { const o = {}; let n = 0; for (const k in c.d) if (k !== 'b' && k !== 'c' && k !== 'saved' && k !== 't') { o[k] = c.d[k]; n++; } return n ? o : undefined; }, unpack: (c, d) => { Object.assign(c.d, d); } });
// ---- ohm-scope components live inside each saved ohm as s.cp (hooked from Sf.serialCreature / Sf.loadCreature)
SV.ohmOut = (c, s) => { const cp = SV.packComps('ohm', c, c._cpKeep); for (const k in cp) { s.cp = cp; break; } return s; };
SV.ohmIn = (c, s) => { if (s && s.cp) c._cpKeep = SV.unpackComps('ohm', c, s.cp) || undefined; return c; };
SV.tally = c => c.tally || (c.tally = { w: 0, i: 0, o: 0, t: [] });
SV.register('tally', { scope: 'ohm', pack: c => { const t = c.tally; if (!t || !(t.w || t.i || t.o || (t.t && t.t.length))) return undefined; const a = [Math.round(t.w), t.i, t.o]; if (t.t && t.t.length) a.push(t.t); return a; },
  unpack: (c, d) => { c.tally = { w: +d[0] || 0, i: +d[1] || 0, o: +d[2] || 0, t: Array.isArray(d[3]) ? d[3].slice(0, 2) : [] }; } });
// ---------------- load one world (only when it is entered; other worlds are never parsed) ----------------
SV.loadWorld = k => { const r = SV.read(k); if (!r) return null; const ctx = { h: {}, cis: [] }; const keepH = SV.unpackComps('world', ctx, r.comp); const chunks = {}, keepC = {}, seen = {}; let bad = 0;
  for (const ci of ctx.cis) { const ck = SV.K.c(k, ci), cr = SV.read(ck); if (!cr) { bad++; continue; } const d = { saved: true, t: cr.t || r.t, b: [], c: [] }, kc = SV.unpackComps('chunk', { d }, cr.comp); if (kc) keepC[ci] = kc;
    // safety net: an ohm caught mid-move between two chunk writes appears once (newest chunk wins)
    d.c = d.c.filter(s => { const o = seen[s.id]; if (!o) { seen[s.id] = { d, s }; return true; } if ((o.d.t || 0) >= d.t) return false; o.d.c = o.d.c.filter(q => q !== o.s); seen[s.id] = { d, s }; return true; });
    chunks[ci] = d; SV.last[ck] = dig(body(ck, cr.comp)); }
  SV.last[k] = dig(body(k, r.comp)); SV._loaded = { k, keepH, keepC, cis: ctx.cis.slice(), bad };
  return Object.assign({ v: RS.SAVE_V, t: r.t || Date.now(), chunks }, ctx.h); };
// ================= the idle saver =================
const ckOf = (Sf, x, y) => Sf.chunkKey(Sf.P.chunkOf(Sf.P.theta(x, y)));
SV.attach = (Sf, k, loaded) => { const L = SV._loaded && SV._loaded.k === k ? SV._loaded : null; SV._loaded = null;
  const st = Sf._sv = { key: k, changed: !!loaded, pend: new Set(), first: 0, last: 0, q: null, sched: 0, lastDrift: now(), full: true, keepH: L ? L.keepH : null, keepC: L ? L.keepC : {}, cis: new Set(L ? L.cis : []), ohmCis: new Set(), fp: null, fpT: 0, sizes: {} };
  if (L) for (const ci of L.cis) { const s = SV.last[SV.K.c(k, ci)]; if (s) st.sizes[ci] = parseInt(s, 10); }
  // the guide's hint progress belongs to the player, not the world: profile wins
  if (SV.prof.guide) Sf.mods.guide = Object.assign(Sf.mods.guide || { step: 0, done: false, id: null }, SV.prof.guide);
  st.fp = SV.fingerprint(Sf); SV.cur = Sf; SV.stats.attached = k; return st; };
// DAW / mix edits have no Surface verb, so they are noticed by comparing this small text every 2 s (of the world mods only the player-made music tempo / key and user glyphs: the world fills in nests / dust / farm / fieldD / regionBpm itself)
SV.fingerprint = Sf => { const m = Sf.mods || {}; try { return JSON.stringify([Sf.dawEdits || {}, Sf.mix || {}, m.music || null, m.glyphUser || null]); } catch (e) { return ''; } };
SV.guideOut = Sf => { const g = Sf.mods && Sf.mods.guide; if (!g) return; const o = {}; for (const k in g) if (!GUIDE_LOCAL[k]) o[k] = g[k]; SV.prof.guide = o; };
// mark a player change (world becomes worth storing) at a place (chunk id) or for the header only
SV.mark = (Sf, ci, notChange) => { const st = Sf && Sf._sv; if (!st) return; if (!notChange) st.changed = true; if (!st.changed) return; if (ci != null && isFinite(ci)) st.pend.add(ci); const n = now(); if (!st.first) st.first = n; st.last = n; };
SV.markAt = (Sf, x, y, notChange) => SV.mark(Sf, (typeof x === 'number' && typeof y === 'number') ? ckOf(Sf, x, y) : null, notChange);
// chunks that hold live ohms now (bounded by the ohm count; no per-frame cost: only when a cycle starts)
const ohmChunks = Sf => { const s = new Set(); for (const c of Sf.creatures) if (!c.dead && !c.caught) s.add(ckOf(Sf, c.x, c.y)); return s; };
SV.startCycle = (Sf, why) => { const st = Sf._sv; const ids = new Set(Sf.chunkIds()), q = [];
  const want = st.full ? new Set(ids) : new Set([...st.pend, ...ohmChunks(Sf), ...st.ohmCis]); st.full = false; st.pend.clear(); st.first = 0; st.lastDrift = now();
  for (const ci of want) q.push(ci); q.push('hdr'); st.q = q; st.ids = ids; st.why = why; return q; };
SV.chunkRec = (Sf, ci) => { const st = Sf._sv, d = Sf.chunkLive(ci); if (!d) return null; const ck = SV.K.c(st.key, ci); return [ck, body(ck, SV.packComps('chunk', { Sf, d, ci }, st.keepC[ci]))]; };
SV.task = (Sf, t, list) => { const st = Sf._sv;
  if (t === 'hdr') return SV.hdrTask(Sf, list);
  if (!st.ids.has(t)) { if (st.cis.has(t)) { st.cis.delete(t); SV.del(SV.K.c(st.key, t)); } st.ohmCis.delete(t); return; }
  const r = SV.chunkRec(Sf, t); if (!r) return; const total = Object.values(st.sizes).reduce((a, b) => a + b, 0) - (st.sizes[t] || 0);
  const d = Sf.chunkLive(t), hasOhm = d && d.c && d.c.length; if (hasOhm) st.ohmCis.add(t); else st.ohmCis.delete(t);
  if (r[1].length > SV.cfg.chunkMax || (total + r[1].length > SV.cfg.worldMax && !hasOhm && !Sf.dirty.has(t))) { SV.stats.overBudget = (SV.stats.overBudget || 0) + 1; return; }   // natural terrain regenerates; never drop ohms or touched places
  st.sizes[t] = r[1].length; st.cis.add(t); if (list) list.push(r); else SV.put([r]); };
SV.hdrTask = (Sf, list) => { const st = Sf._sv, k = st.key, h = Sf.packHeader(); SV.guideOut(Sf);
  for (const ci of [...st.cis]) if (!st.ids.has(ci)) { st.cis.delete(ci); delete st.sizes[ci]; SV.del(SV.K.c(k, ci)); }
  const cis = [...st.cis].sort((a, b) => a - b), comp = SV.packComps('world', { Sf, h, cis }, st.keepH), r = [k, body(k, comp)];
  if (list) list.push(r); else SV.put([r]); st.sizes.hdr = r[1].length; const w = SV.parseW(k);
  if (w) { const gw = SV.gw[w.u] = SV.gw[w.u] || {}; gw[w.tail] = [Math.floor(Date.now() / 60000), h.n || 0, h.alive || 0]; }
  SV.stats.worldBytes[k] = Object.values(st.sizes).reduce((a, b) => a + b, 0); st.fp = SV.fingerprint(Sf); };
// one idle slice: at least one task, then more while under budget
SV.slice = (Sf, budget) => { const st = Sf && Sf._sv; if (!st || !st.q) return 0; const t0 = rt(), b = budget == null ? SV.cfg.budget : budget; let n = 0;
  while (st.q.length) { const t = st.q.shift(); SV.task(Sf, t); n++; if (t === 'hdr' && SV.app && SV.app.Sf === Sf && SV.app.save) { try { SV.app.save(true); } catch (e) { SV.stats.errs++; } } if (rt() - t0 >= b * .5) break; }
  if (!st.q.length) { st.q = null; SV.stats.cycles = (SV.stats.cycles || 0) + 1; }
  const ms = rt() - t0; SV.stats.slices++; const a = SV.stats.sliceMs; a.push(ms); if (a.length > 400) a.shift(); return ms; };
SV.drain = Sf => { let g = 0; while (Sf._sv && Sf._sv.q && g++ < 10000) SV.slice(Sf, Infinity); };
// per frame: a few comparisons; heavy work only in idle callbacks
SV.pump = (Sf, tNow) => { const st = Sf && Sf._sv; if (!st) return; const n = tNow == null ? now() : tNow;
  if (n - st.fpT > 2000) { st.fpT = n; const fp = SV.fingerprint(Sf); if (fp !== st.fp) { st.fp = fp; SV.mark(Sf, null); } }   // DAW / mix / tempo-key / user-glyph edits
  if (!st.changed) return;
  if (!st.q && ((st.first && (n - st.last >= SV.cfg.quiet || n - st.first >= SV.cfg.maxWait)) || n - st.lastDrift >= SV.cfg.drift)) SV.startCycle(Sf, st.first ? 'edit' : 'drift');
  if (st.q && !st.sched) { st.sched = 1; const run = dl => { st.sched = 0; if (SV.cur !== Sf || !st.q) return; const left = dl && dl.timeRemaining ? dl.timeRemaining() : SV.cfg.budget; SV.slice(Sf, Math.min(SV.cfg.budget, Math.max(1, left))); };
    if (G.requestIdleCallback) G.requestIdleCallback(run, { timeout: 1000 }); else setTimeout(run, 0); } };
// synchronous flush (hide / leave / pagehide / App.save): everything pending in one Store transaction
SV.flush = Sf => { const st = Sf && Sf._sv; if (!st) return 0; const t0 = rt(); if (!st.changed) { const fp = SV.fingerprint(Sf); if (fp !== st.fp) st.changed = true; else return 0; }
  const q = st.q ? st.q.filter(t => t !== 'hdr') : []; SV.startCycle(Sf, 'flush'); for (const t of q) if (!st.q.includes(t)) st.q.unshift(t);
  const list = []; for (const t of st.q) SV.task(Sf, t, list); st.q = null; const n = SV.put(list); SV.stats.flushMs = rt() - t0; SV.stats.flushN = list.length; return n; };
// size of everything stored under rs2 (for the soak test and the stats overlay)
SV.size = () => { let n = 0; for (const k in St.mem) if (k.startsWith('rs2:') && !k.endsWith('.bak')) n += St.mem[k].length; return n; };
// ================= hooks into each Surface (verbs, tally, step) =================
const VERBS = ['hold', 'grabStart', 'grabMove', 'grabEnd', 'squeeze', 'stroke', 'catch'];
const bump = (c, f) => { if (c && !c.dead) SV.tally(c)[f]++; };
SV.hookSurface = Sf => { if (!Sf || Sf._svHooked) return Sf; Sf._svHooked = true; let gx = null, gy = null, inVerb = 0;
  const tc0 = Sf.touchChunk; if (tc0) Sf.touchChunk = (ci, ...a) => { const r = tc0(ci, ...a); SV.mark(Sf, Sf.chunkKey(ci), !inVerb); return r; };
  const tp0 = Sf.tap; if (tp0) Sf.tap = (x, y, s) => { const h = Sf.hit ? Sf.hit(x, y) : {}; inVerb++; let r; try { r = tp0(x, y, s); } finally { inVerb--; }
    let c = null; if (r === 'chirp' && h.creature) c = h.creature; else if (r === 'pop' && h.bubble && h.bubble.meta) c = h.bubble.meta.c; if (c) { bump(c, 'i'); SV.markAt(Sf, c.x, c.y); } else if (r && r !== 'chirp') SV.markAt(Sf, x, y);
    return r; };
  for (const v of VERBS) { const f0 = Sf[v]; if (!f0) continue;
    Sf[v] = (...a) => { let pre = null; if (v === 'grabStart') { const h = Sf.hit ? Sf.hit(a[0], a[1]) : {}; pre = h.creature || (h.bubble && h.bubble.meta && h.bubble.meta.c) || null; }
      inVerb++; let r; try { r = f0(...a); } finally { inVerb--; } if (v === 'grabMove') { gx = a[0]; gy = a[1]; return r; }
      if (!r) return r; let x = a[0], y = a[1];
      if (v === 'catch' && a[0]) { x = a[0].x; y = a[0].y; bump(a[0], 'i'); } else if (v === 'stroke' && Array.isArray(a[0])) { const p = a[0][a[0].length >> 1] || []; x = p[0]; y = p[1]; } else if (v === 'grabEnd' || v === 'squeeze') { x = gx; y = gy; }
      if (v === 'grabStart') { gx = x; gy = y; if (pre) bump(pre, 'i'); return r; }   // the move itself is stored when it ends
      SV.markAt(Sf, x, y); return r; }; }
  const ht0 = Sf.hatch; if (ht0) Sf.hatch = (e, ...a) => { const par = e && e.meta && e.meta.child && e.meta.child.parents; const r = ht0(e, ...a); if (par) for (const id of par) bump(Sf.creatures.find(c => c.id === id), 'o'); return r; };
  // watched seconds: once per second of sim time, only ohms on screen (c.lod 0 is the existing per-frame visibility cull)
  const sp0 = Sf.step; let acc = 0; if (sp0) Sf.step = (dt, ...a) => { const r = sp0(dt, ...a); acc += dt || 0; if (acc >= 1) { const k = Math.floor(acc); acc -= k; for (const c of Sf.creatures) if (c.lod === 0 && !c.dead && !c.caught && (!Sf.inView || Sf.inView(c.x, c.y, 40))) SV.tally(c).w += k; } return r; };
  const dc0 = Sf.deactivate; if (dc0) Sf.deactivate = ci => { const was = Sf.active.has(ci); const r = dc0(ci); if (was && Sf._sv && Sf._sv.changed) Sf._sv.pend.add(ci); return r; };
  return Sf; };
// wrappers keep the original in ._raw so a second load of this file (tests) wraps the original, not the previous wrapper
const raw0 = (o, k) => o && o[k] ? (o[k]._raw || o[k]) : null;
const mk0 = raw0(RS, 'Surface'); if (mk0) { RS.Surface = function (...a) { return SV.hookSurface(mk0.apply(this, a)); }; Object.assign(RS.Surface, mk0); RS.Surface._raw = mk0; }
// teaching (b learns from a), playing an ohm, editing its DNA
if (RS.Creature && RS.Creature.teach) { const t0 = raw0(RS.Creature, 'teach'); RS.Creature.teach = (Sf, a, b, ...x) => { const r = t0(Sf, a, b, ...x); if (a && b && a.id && b !== a) { const t = SV.tally(b).t; if (!t.includes(a.id)) { t.push(a.id); if (t.length > 2) t.shift(); } } return r; }; RS.Creature.teach._raw = t0; }
if (RS.Play && RS.Play.note) { const n0 = raw0(RS.Play, 'note'); RS.Play.note = (Sf, s, ...x) => { const r = n0(Sf, s, ...x); const c = s && s.c; if (c) { const tn = now(); if (!c._tn || tn - c._tn > 1500) { bump(c, 'i'); SV.markAt(Sf, c.x, c.y); } c._tn = tn; } return r; }; RS.Play.note._raw = n0; }
if (RS.EnvEdit && RS.EnvEdit.note) { const e0 = raw0(RS.EnvEdit, 'note'); RS.EnvEdit.note = (Sf, c, ...x) => { const r = e0(Sf, c, ...x); if (c && c.x != null) { bump(c, 'i'); SV.markAt(Sf, c.x, c.y); } return r; }; RS.EnvEdit.note._raw = e0; }
SV.hookDNA = () => { if (!RS.DNA) return; const d0 = raw0(RS, 'DNA'); RS.DNA = function (Sf, c, ...x) { const V = d0.call(this, Sf, c, ...x); if (V && V.commit) { const cm = V.commit; V.commit = (...y) => { const ed = V.edited; const r = cm(...y); if (ed && c) { bump(c, 'i'); SV.markAt(Sf, c.x, c.y); } return r; }; } return V; }; Object.assign(RS.DNA, d0); RS.DNA._raw = d0; };
SV.hookDNA();
// v0.8 H: on hide / pagehide only the dirty header + chunks are flushed (small, synchronous); replaces the old 10 s whole-world save
SV.hide = () => { const A = SV.app; if (!A || !A.Sf || !A.save) return; const t0 = rt(); try { A.save(); } catch (e) { SV.stats.errs++; } SV.stats.hideMs = rt() - t0; SV.stats.hides = (SV.stats.hides || 0) + 1; };
if (G.document && G.addEventListener && !G.__rsSaveHide) { G.__rsSaveHide = 1; G.document.addEventListener('visibilitychange', () => { if (G.document.visibilityState === 'hidden') RS.Save.hide(); }); G.addEventListener('pagehide', () => RS.Save.hide()); }
// ask the browser to keep our storage (best effort)
try { if (G.navigator && G.navigator.storage && G.navigator.storage.persist) G.navigator.storage.persist().then(p => { SV.stats.persisted = p; }, () => { }); if (G.navigator && G.navigator.storage && G.navigator.storage.estimate) G.navigator.storage.estimate().then(e => { SV.stats.estimate = { usage: e.usage, quota: e.quota }; }, () => { }); } catch (e) { }
})(typeof window !== 'undefined' ? window : globalThis);
