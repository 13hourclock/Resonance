// v0.8b songsave: the world's song (jams, ensembles, each ohm's musical mind, the world's key / tempo / grid) saved when the app goes away and restored exactly on return.
/* Wilbow 7:27 PM MDT Oct 23 2026: "When exiting the game the song didn't sound the same on return.  It needs to preserve it" / "Switched away" / "It should preserve it in both cases".
   Background (switched away): audio.js pauses the game clock while hidden, so nothing here is needed.
   Full close + reopen: on hide / pagehide / leaving a world App.suspendSong writes a RESUME record (rs2:resume): the world key, camera, the game time and a snapshot of the
   musical state. The next launch goes back to that world (instead of a fresh random one), sets the game clock to the saved time and puts the snapshot back into the
   ohms as they load (before their minds tick), so the same ensemble plays the same section of the same song, with the same roles, key, tempo and phase.
   The snapshot is a graph: live objects are referenced (ohms by id, minds by their ohm, tonal systems by catalogue index, drawn bodies by uid); shared objects keep
   their identity; Sets, Maps, typed arrays and non-finite numbers survive JSON. Old saves have no resume record and launch as before. */
(function (G) { const RS = G.RS, SS = RS.SongSave = {};
SS.V = 1; SS.KEY = 'rs2:resume';
// what is musical state: the Surface's jam / ensemble bookkeeping, the world music clock, each ohm's mind and these per-ohm fields
// + the Surface's own clocks and short memories (what was just heard / ringing / which insert slots are taken, the ensemble / growth / social timers, the sky and wind)
SS.SF2 = ['day', 'water', 'acc', 'brainAcc', 'played', 'lastNote', 'recentNotes', 'onRing', 'fxSlots', 'fxGate', 'g16', 'crazes', 'cosmic', 'bornN', 'ancestors', 'erupting', 'dayPhase', 'sunAngle', 'sunDir', 'sunPos', 'wind', 'zones', 'shapePool', 'd3s', 'stats',
  '_grH', '_grO', '_grS', '_grT', '_instr', '_instrT', '_itT', '_seedT', '_sp', '_syIdx', '_syIdxT', '_syT', '_tickT', '_voyT', '_ywT'];
SS.SF = ['frame', 'jams', 'jamN', 'coN', 'mindLog', 'lastG', '_jamT', 'convs', 'ties', 'cmdT', '_exT', 'bridges', '_soT'];
SS.MIND_SKIP = new Set(['c', 'Sf', 'g', 'I']);
// per ohm: every own field (behaviour, mood, jam, partner, cues, timers...) except what is the ohm itself (genome, body build, mind object, identity)
SS.C_SKIP = new Set(['id', 'g', 'P', 'name', 'code', 'segs', 'limbs', 'bodies', 'rnd', 'mind', 'born', 'gen', 'parents', 'dead', 'caught', 'leaving', 'settleT']);
const plain = o => { const p = Object.getPrototypeOf(o); return p === Object.prototype || p === null || Array.isArray(o); };
const TA = { Float32Array: G.Float32Array, Float64Array: G.Float64Array, Int32Array: G.Int32Array, Uint8Array: G.Uint8Array, Int16Array: G.Int16Array, Uint16Array: G.Uint16Array, Int8Array: G.Int8Array, Uint32Array: G.Uint32Array };
// live objects that are referenced, never copied
SS.extOut = Sf => { const X = new Map(); X.set(Sf, { $Sf: 1 }); if (Sf.M) X.set(Sf.M, { $M: 1 });
  for (const c of Sf.creatures) { if (!c || c.id == null) continue; X.set(c, { $c: c.id }); if (c.mind) { X.set(c.mind, { $m: c.id }); if (c.mind.I) X.set(c.mind.I, { $I: c.id }); } if (c.P) X.set(c.P, { $P: c.id }); if (c.g) X.set(c.g, { $g: c.id }); }
  const CAT = RS.Tonal && RS.Tonal.CAT; if (CAT) CAT.forEach((e, i) => X.set(e, { $cat: i }));
  for (const it of Sf.items || []) if (it && it.uid != null) X.set(it, { $it: it.uid });
  if (Sf.W && Sf.W.bodies) for (const b of Sf.W.bodies.values()) if (b && b.uid != null && !X.has(b)) X.set(b, { $b: b.uid });
  return X; };
// encode a root set: pass 1 finds shared objects, pass 2 writes them once ($i) and refers to them after ($r)
SS.encode = (Sf, roots) => { const X = SS.extOut(Sf), cnt = new Map();
  const scan = v => { if (v == null || typeof v !== 'object' || X.has(v)) return; const n = (cnt.get(v) || 0) + 1; cnt.set(v, n); if (n > 1) return;
    if (v instanceof Set) { for (const x of v) scan(x); return; } if (v instanceof Map) { for (const [k, x] of v) { scan(k); scan(x); } return; } if (ArrayBuffer.isView(v) || !plain(v)) return;
    for (const k of Object.keys(v)) if (typeof v[k] !== 'function') scan(v[k]); };
  scan(roots); const ids = new Map(); let nid = 0;
  const enc = v => { if (v === undefined || typeof v === 'function' || typeof v === 'symbol') return undefined; if (typeof v === 'number') return Number.isFinite(v) ? v : { $n: String(v) }; if (v === null || typeof v !== 'object') return v;
    const x = X.get(v); if (x) return x; if (ids.has(v)) return { $r: ids.get(v) }; const sh = cnt.get(v) > 1; let id; if (sh) { id = nid++; ids.set(v, id); }
    let o; if (v instanceof Set) o = { $set: [...v].map(enc) }; else if (v instanceof Map) o = { $map: [...v].map(([k, q]) => [enc(k), enc(q)]) };
    else if (ArrayBuffer.isView(v)) { const nm = v.constructor && v.constructor.name; if (!TA[nm]) return undefined; o = { $ta: nm, a: Array.from(v, q => Number.isFinite(q) ? q : 0) }; }
    else if (!plain(v)) return undefined;
    else if (Array.isArray(v)) { const a = v.map(q => { const e = enc(q); return e === undefined ? null : e; }); if (!sh) return a; o = { $a: a }; }
    else { o = {}; for (const k of Object.keys(v)) { if (k[0] === '$') continue; const e = enc(v[k]); if (e !== undefined) o[k] = e; } }
    if (sh) o.$i = id; return o; };
  return enc(roots); };
SS.extIn = Sf => { const byId = new Map(); for (const c of Sf.creatures) if (c && c.id != null && !c.dead) byId.set(c.id, c); const byUid = new Map(); if (Sf.W && Sf.W.bodies) for (const b of Sf.W.bodies.values()) if (b && b.uid != null) byUid.set(b.uid, b); const byIt = new Map(); for (const it of Sf.items || []) if (it && it.uid != null) byIt.set(it.uid, it); return { byId, byUid, byIt }; };
SS.decode = (Sf, d, L) => { L = L || SS.extIn(Sf); const ids = new Map(), CAT = RS.Tonal && RS.Tonal.CAT; SS._miss = 0;
  const dec = v => { if (v === null || typeof v !== 'object') return v;
    if (Array.isArray(v)) return v.map(dec);
    if ('$r' in v) return ids.has(v.$r) ? ids.get(v.$r) : null;
    if ('$n' in v) return Number(v.$n); if ('$Sf' in v) return Sf; if ('$M' in v) return Sf.M;
    if ('$c' in v) { const c = L.byId.get(v.$c); if (!c) SS._miss++; return c || null; }
    if ('$m' in v) { const c = L.byId.get(v.$m); return c && c.mind || null; } if ('$I' in v) { const c = L.byId.get(v.$I); return c && c.mind ? c.mind.I : null; }
    if ('$P' in v) { const c = L.byId.get(v.$P); return c ? c.P : null; } if ('$g' in v) { const c = L.byId.get(v.$g); return c ? c.g : null; }
    if ('$cat' in v) return CAT ? CAT[v.$cat] || null : null; if ('$b' in v) return L.byUid.get(v.$b) || null; if ('$it' in v) return L.byIt.get(v.$it) || null;
    let o; const reg = q => { if ('$i' in v) ids.set(v.$i, q); return q; };
    if ('$set' in v) { o = reg(new Set()); for (const q of v.$set) o.add(dec(q)); return o; }
    if ('$map' in v) { o = reg(new Map()); for (const [k, q] of v.$map) o.set(dec(k), dec(q)); return o; }
    if ('$ta' in v) { const T = TA[v.$ta] || G.Float32Array; return reg(T.from(v.a || [])); }
    if ('$a' in v) { o = reg([]); for (const q of v.$a) o.push(dec(q)); return o; }
    o = reg({}); for (const k of Object.keys(v)) if (k !== '$i') o[k] = dec(v[k]); return o; };
  return dec(d); };
// ---- the snapshot ----
// one physics body, exactly: its points (position, previous position = velocity, flags, heat), its springs (rest length / stiffness: muscles, growth) and its own scalars
SS.BF = ['tension', 'inflate', 'area0', 'age', 'energy', 'lit', 'closed', 'thick'];
SS.bOut = (W, b) => { const p = [], s = [], f = {}; for (const i of b.idx || []) p.push(W.x[i], W.y[i], W.px[i], W.py[i], W.fl[i], W.heat[i], W.im[i], W.rad[i]); for (const j of b.springs || []) s.push(W.sr[j], W.sk[j]); for (const k of SS.BF) if (typeof b[k] === 'number' || typeof b[k] === 'boolean') f[k] = b[k]; if (b.mat) f.mat = Object.assign({}, b.mat); for (const k of ['light', 'shadow']) if (b[k] !== undefined) f[k] = b[k] && typeof b[k] === 'object' ? Object.assign({}, b[k]) : b[k]; return { p, s, f, n: 8 }; };
SS.bIn = (W, b, o) => { if (!o || !b) return; if (Array.isArray(o)) o = { p: o, n: 4 }; const N = o.n || 4, p = o.p || []; if (b.idx && p.length === b.idx.length * N) b.idx.forEach((i, k) => { W.x[i] = p[k * N]; W.y[i] = p[k * N + 1]; W.px[i] = p[k * N + 2]; W.py[i] = p[k * N + 3]; if (N > 4) { W.fl[i] = p[k * N + 4]; W.heat[i] = p[k * N + 5]; } if (N > 6) { W.im[i] = p[k * N + 6]; W.rad[i] = p[k * N + 7]; } });
  const s = o.s || []; if (b.springs && s.length === b.springs.length * 2) b.springs.forEach((j, k) => { W.sr[j] = s[k * 2]; W.sk[j] = s[k * 2 + 1]; }); const f = o.f || {}; for (const k in f) { if (k === 'mat' && b.mat && f.mat) Object.assign(b.mat, f.mat); else b[k] = f[k]; } };
SS.pack = Sf => { if (!Sf || !Sf.creatures) return null; const sf = {}, ohms = [];
  for (const k of SS.SF.concat(SS.SF2)) if (Sf[k] !== undefined) sf[k] = Sf[k];
  const fd = Sf.field; const fld = fd ? { t: fd.t, cache: fd.cache, feat: fd.feat } : null; const Wt = Sf.W ? Sf.W.t : null;   // the light / shade / wind field: its cells drift and diffuse, and the features remember when they last sang
  const M = {}; if (Sf.M) for (const k of Object.keys(Sf.M)) if (typeof Sf.M[k] !== 'function' && k !== 'persona') M[k] = Sf.M[k];
  for (const c of Sf.creatures) { if (!c || c.dead || c.caught || !c.mind) continue; const m = {}; for (const k of Object.keys(c.mind)) if (!SS.MIND_SKIP.has(k) && typeof c.mind[k] !== 'function') m[k] = c.mind[k];
    const cc = {}; for (const k of Object.keys(c)) if (!SS.C_SKIP.has(k) && typeof c[k] !== 'function') cc[k] = c[k];
    const W = Sf.W, pts = (c.bodies || []).map(b => SS.bOut(W, b));   // the body exactly where (and how fast) it was
    let g = null; if (c.g && c.code && RS.Genome) { const q = RS.Genome.fromCode(c.code); if (q.length !== c.g.length || c.g.some((v, i) => v !== q[i])) g = Array.from(c.g); }   // the genome as it plays (the world save keeps it at code precision)
    let p = null; if (g && c.P) { p = {}; for (const k of Object.keys(c.P)) if (k !== 'inst' && typeof c.P[k] !== 'function') p[k] = c.P[k]; }   // ... and its expression (body plan, voice, behaviour genes) at that precision too
    ohms.push({ id: c.id, m, c: cc, rnd: c.rnd && c.rnd.st ? c.rnd.st() : null, pts, g, p }); }
  const bods = []; if (Sf.W && Sf.W.bodies) for (const b of Sf.W.bodies.values()) { const r = b.meta && b.meta.role; if (b.uid == null || b.kind === 'water' || !b.idx || !b.idx.length || r === 'ground' || r === 'creature') continue; bods.push([b.uid, SS.bOut(Sf.W, b)]); }   // drawn pieces, items, instruments: where they lie / swing
  const its = (Sf.items || []).map(it => { const o = { uid: it.uid }; for (const k of Object.keys(it)) if (typeof it[k] === 'number' || typeof it[k] === 'string' || typeof it[k] === 'boolean') o[k] = it[k]; return o; });
  const q = Sf.A && Sf.A.qOut ? Sf.A.qOut() : [];
  return { v: SS.V, now: Sf.now(), sf: SS.encode(Sf, { sf, M, ohms, its, q, fld }), bods, Wt }; };
// put a snapshot back into a loaded world: ohms that are not there (died / not loaded) are skipped and dropped from the jams
SS.mind = (Sf, c) => { if (c.mind && c.mind.g === c.g) return c.mind; if (!RS.Mind) return null; c.mind = RS.Mind.make(Sf, c); c.mind.g = c.g; if (c.colourC) c.mind.colourC = c.colourC; if (c._inhP && RS.Exp) RS.Exp.inheritFrom(Sf, c, c._inhP); return c.mind; };   // = Sf.minds()
SS.apply = (Sf, snap) => { if (!snap || snap.v !== SS.V || !snap.sf) return null; for (const c of Sf.creatures) if (c && !c.dead && !c.caught && !c.leaving) SS.mind(Sf, c); const L = SS.extIn(Sf), d = SS.decode(Sf, snap.sf, L); if (!d) return null; let n = 0, miss = 0;
  for (const o of d.ohms || []) { const c = L.byId.get(o.id); if (!c || !c.mind) { miss++; continue; } if (o.g && c.g && o.g.length === c.g.length) { c.g.set(o.g); c._gt = null; if (c.P && o.p) for (const k in o.p) c.P[k] = o.p[k]; if (RS.Inst && c.P) { c.P.inst = RS.Inst.fromGenome(c.g); c.mind.I = c.P.inst; } } Object.assign(c.mind, o.m); c.mind.c = c; for (const k of Object.keys(c)) if (!(k in o.c) && !SS.C_SKIP.has(k) && typeof c[k] !== 'function') delete c[k];   /* fields the loader fills in that the live ohm did not have */ for (const k in o.c) c[k] = o.c[k]; c._fxKey = null;   /* a reopened game has a new renderer: resend the effect insert */ if (o.rnd != null && c.rnd && c.rnd.st) c.rnd.st(o.rnd);
    (c.bodies || []).forEach((b, bi) => SS.bIn(Sf.W, b, o.pts && o.pts[bi])); n++; }
  if (d.q && d.q.length && Sf.A && Sf.A.qIn) Sf.A.qIn(d.q);
  for (const [uid, o] of snap.bods || []) SS.bIn(Sf.W, L.byUid.get(uid), o);
  if (Sf.W) { if (typeof snap.Wt === 'number') Sf.W.t = snap.Wt; if (Sf.W.rehash) Sf.W.rehash(); }
  for (const q of d.its || []) { const it = L.byIt.get(q.uid); if (it) for (const k in q) if (k !== 'uid') it[k] = q[k]; }
  if (d.M && Sf.M) for (const k in d.M) Sf.M[k] = d.M[k];
  for (const k in d.sf || {}) Sf[k] = d.sf[k];
  if (d.fld && Sf.field) { Sf.field.t = d.fld.t; if (d.fld.cache instanceof Map) Sf.field.cache = d.fld.cache; if (Array.isArray(d.fld.feat) && d.fld.feat.length === (Sf.field.feat || []).length) Sf.field.feat = d.fld.feat; }
  const live = c => c && !c.dead && L.byId.get(c.id) === c;
  if (Sf.jams) { for (const j of Sf.jams) { if (j.members) j.members = j.members.filter(live); if (j.leader && !live(j.leader)) j.leader = j.members && j.members[0] || null; } Sf.jams = Sf.jams.filter(j => j.leader && j.members && j.members.length); }
  for (const c of L.byId.values()) { if (c.jam && !(Sf.jams || []).includes(c.jam)) c.jam = null; const E = c.mind && c.mind.E; if (E && E.members) { E.members = E.members.filter(live); if (E.leader && !live(E.leader)) E.leader = E.members[0] || null; } }
  Sf.songRestored = { n, miss: miss + SS._miss, t: snap.now }; return Sf.songRestored; };
// pending until the ohms of the snapshot have streamed in (called after Sf.stream, before the minds' next tick); gives up after ~4 s of frames
SS.pend = (Sf, snap) => { Sf.songPend = snap; Sf.songPendN = 0; };
/* all or nothing: if the saved world does not hold every ohm of the snapshot (a save cut short by the OS, an old world), the song snapshot is dropped and the world
   plays on from its plain save (as before songsave) instead of a half-restored song with dangling partners */
SS.tryApply = Sf => { const snap = Sf.songPend; if (!snap) return; Sf.songPendN = (Sf.songPendN || 0) + 1; const want = snap.ids || [], have = new Set(Sf.creatures.filter(c => !c.dead).map(c => c.id)), miss = want.filter(id => !have.has(id)).length;
  if (!miss) { Sf.songPend = null; try { SS.apply(Sf, snap); SS.tidy(Sf); } catch (e) { Sf.songRestored = { err: String(e && e.message || e) }; SS.tidy(Sf); } }
  else if (Sf.songPendN > 30) { Sf.songPend = null; Sf.songRestored = { skipped: 'missing ohms', miss, of: want.length }; } };
// drop references to ohms that are not in this world (never expected after an all-or-nothing apply; a guard so a stale record can never crash a frame)
SS.tidy = Sf => { const ok = c => c && !c.dead && Sf.creatures.includes(c);
  if (Sf.convs instanceof Map) for (const [k, q] of [...Sf.convs]) if (!q || !ok(q.a) || !ok(q.b)) Sf.convs.delete(k);
  if (Array.isArray(Sf.bridges)) Sf.bridges = Sf.bridges.filter(b => b && ok(b.a) && ok(b.b));
  if (Array.isArray(Sf.jams)) Sf.jams = Sf.jams.filter(j => j && j.leader && ok(j.leader) && Array.isArray(j.members) && (j.members = j.members.filter(ok)).length);
  for (const c of Sf.creatures) if (c && c.jam && !(Sf.jams || []).includes(c.jam)) c.jam = null; };
// ---- the resume record (profile level: one per install) ----
SS.out = (Sf, extra) => { const snap = SS.pack(Sf); if (!snap) return null; snap.ids = Sf.creatures.filter(c => c && !c.dead && !c.caught && !c.leaving && c.mind).map(c => c.id); return Object.assign({ v: SS.V, t: Date.now() }, extra || {}, { song: snap }); };
SS.write = rec => { const St = RS.Store; if (!St || !rec) return false; try { const s = JSON.stringify(rec); if (St.putStrs) St.putStrs([[SS.KEY, s]]); else St.set(SS.KEY, rec); SS.stats.writes++; SS.stats.bytes = s.length; return true; } catch (e) { SS.stats.errs++; SS.lastErr = String(e); return false; } };
SS.read = () => { const St = RS.Store; if (!St) return null; try { const s = St.raw && St.raw.get ? St.raw.get(SS.KEY) : null; const d = s ? JSON.parse(s) : null; return d && d.v === SS.V && d.song ? d : null; } catch (e) { return null; } };
SS.clear = () => { const St = RS.Store; if (St && St.raw && St.raw.get(SS.KEY) != null && St.del) St.del(SS.KEY); };
SS.stats = { writes: 0, errs: 0, bytes: 0 };
})(typeof window !== 'undefined' ? window : globalThis);
