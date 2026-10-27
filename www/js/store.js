'use strict';
// Persistence (v0.5a: IndexedDB-FIRST). IndexedDB is the real store (large quota); everything is loaded into an in-memory cache before the
// app starts (RS.Store.ready()), so reads stay synchronous. Each write puts the new copy AND the previous good copy (.bak) in ONE IndexedDB
// transaction (atomic: both or neither); a failed/aborted transaction is retried with the newest value. localStorage is only a small
// best-effort mirror (crash safety on WebViews where IndexedDB is missing or broken); a quota error there is ignored. On start the newest
// copy (by its own timestamp) wins between IndexedDB and the mirror, and older localStorage-only saves are migrated into IndexedDB.
// Corrupt JSON falls back to the .bak copy. Versioned migrations as before.
(function (G) {
const RS = G.RS; RS.SAVE_V = 3;
const LS = () => { try { return G.localStorage || null; } catch (e) { return null; } };
const mem = {};    // authoritative synchronous cache (key -> JSON string)
const IDB = { db: null, ok: false, fails: 0, pending: {}, busy: {},
  open: () => new Promise(res => { try { if (!G.indexedDB) return res(null); const r = G.indexedDB.open('resonance', 1); r.onupgradeneeded = () => { try { r.result.createObjectStore('kv'); } catch (e) { } }; r.onsuccess = () => { IDB.db = r.result; IDB.ok = true; try { IDB.db.onversionchange = () => { try { IDB.db.close(); } catch (e) { } IDB.db = null; IDB.ok = false; }; } catch (e) { } res(IDB.db); }; r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); } }),
  // write a group of keys atomically; on failure retry (max 3) with whatever is newest in mem at that time
  write: (keys, tries = 0) => { if (!IDB.db) return false; try { const tx = IDB.db.transaction('kv', 'readwrite'), os = tx.objectStore('kv'); for (const k of keys) { if (mem[k] == null) os.delete(k); else os.put(mem[k], k); }
      tx.oncomplete = () => { S.idbWrites++; }; const bad = () => { IDB.fails++; S.lastErr = 'idb'; if (tries < 3) setTimeout(() => IDB.write(keys, tries + 1), 400 * (tries + 1)); }; tx.onerror = bad; tx.onabort = bad; return true; } catch (e) { IDB.fails++; S.lastErr = String(e && e.name || e); if (tries < 3) setTimeout(() => IDB.write(keys, tries + 1), 400 * (tries + 1)); return false; } },
  all: () => new Promise(res => { const db = IDB.db; if (!db) return res({}); const out = {}; try { const cur = db.transaction('kv').objectStore('kv').openCursor(); cur.onsuccess = () => { const c = cur.result; if (c) { out[c.key] = c.value; c.continue(); } else res(out); }; cur.onerror = () => res(out); } catch (e) { res(out); } }) };
const stamp = s => { try { const d = JSON.parse(s); return d && typeof d === 'object' ? (+d.t || 0) : -1; } catch (e) { return -1; } };   // -1 = corrupt
const lsSet = (k, v) => { const s = LS(); if (!s) return; try { if (v == null) s.removeItem(k); else if (v.length > S.lsMax) s.removeItem(k); else s.setItem(k, v); } catch (e) { try { s.removeItem(k); } catch (e2) { } } };
const raw = { get: k => mem[k] == null ? null : mem[k],
  set: (k, v) => { mem[k] = v; IDB.write([k]); lsSet(k, v); },
  del: k => { delete mem[k]; IDB.write([k]); lsSet(k, null); } };
// migrations by version: each takes the parsed object and returns the next version
const MIG = { 1: d => { d.v = 2; d.mods = d.mods || {}; return d; }, 2: d => { d.v = 3; d.daw = d.daw || {}; return d; } };
const migrate = d => { let guard = 0; while (d && d.v < RS.SAVE_V && MIG[d.v] && guard++ < 10) d = MIG[d.v](d); return d; };
const S = RS.Store = { prefix: 'rs1:', cap: 6000000, lsMax: 350000, writes: 0, idbWrites: 0, bytes: 0, lastErr: null, raw, IDB, mem, loaded: false, src: {},
  // load IndexedDB + the localStorage mirror into memory, newest copy per key wins; legacy localStorage-only saves are copied into IDB.
  // Resolves within ~2.5 s even if IndexedDB hangs (then localStorage + memory carry on and IDB writes are skipped).
  ready: () => S._ready || (S._ready = new Promise(done => { let fin = false; const finish = all => { if (fin) return; fin = true; clearTimeout(tm); all = all || {}; const s = LS(), lk = [];
      if (s) { try { for (let i = 0; i < s.length; i++) { const k = s.key(i); if (k && k.startsWith(S.prefix)) lk.push(k); } } catch (e) { } }
      const keys = new Set(Object.keys(all).filter(k => String(k).startsWith(S.prefix)).concat(lk)), up = [];
      for (const k of keys) { const a = all[k] != null ? String(all[k]) : null; let b = null; try { b = s ? s.getItem(k) : null; } catch (e) { }
        const ta = a == null ? -2 : stamp(a), tb = b == null ? -2 : stamp(b); if (tb > ta) { mem[k] = b; S.src[k] = 'ls'; up.push(k); } else if (a != null) { mem[k] = a; S.src[k] = 'idb'; } }
      for (const k in mem) { if (k.endsWith('.bak') || stamp(mem[k]) >= 0) continue; const bk = mem[k + '.bak']; if (bk && stamp(bk) >= 0) { mem[k] = bk; S.repaired = (S.repaired || 0) + 1; up.push(k); } }   /* corrupt copy -> repaired from its .bak */
      if (up.length && IDB.db) IDB.write(up); S.loaded = true; S.migrated = up.length; done(S); };
    const tm = setTimeout(() => finish(null), 2500); IDB.open().then(db => db ? IDB.all() : {}).then(finish, () => finish(null)); })),
  boot: () => { },     // v0.3 refill-and-reload dance is gone (kept so old callers don't break)
  key: (...p) => S.prefix + p.join(':'),
  get: k => { for (const kk of [k, k + '.bak']) { const s = raw.get(kk); if (!s) continue; try { const d = JSON.parse(s); if (d && typeof d === 'object') return migrate(d); } catch (e) { /* corrupt -> try backup */ } } return null; },
  // new copy + previous good copy written together (one IDB transaction)
  set: (k, obj) => { obj.v = obj.v || RS.SAVE_V; obj.t = obj.t || Date.now(); let s = JSON.stringify(obj); if (s.length > S.cap) { obj.trimmed = true; if (obj.chunks) { const ks = Object.keys(obj.chunks); while (s.length > S.cap && ks.length) { delete obj.chunks[ks.shift()]; s = JSON.stringify(obj); } } }
    const prev = mem[k]; if (prev && stamp(prev) >= 0) mem[k + '.bak'] = prev; mem[k] = s; IDB.write(prev ? [k, k + '.bak'] : [k]); lsSet(k, s); if (prev) lsSet(k + '.bak', s.length > S.lsMax / 2 ? null : prev);
    S.writes++; S.bytes = s.length; return true; },
  /* v0.8 H: several ready-made records (pre-stringified by RS.Save) + their previous copies (.bak) in ONE IndexedDB transaction. Chunk records
     (rs2:c:) stay out of the small localStorage mirror; headers / profile / galaxy records are mirrored (no .bak in the mirror). */
  putStrs: list => { const ks = []; for (const [k, s] of list) { const prev = mem[k]; if (prev && prev !== s) { mem[k + '.bak'] = prev; ks.push(k + '.bak'); } mem[k] = s; ks.push(k); if (!S.lsSkip(k)) lsSet(k, s); S.bytes = s.length; } IDB.write(ks); S.writes += list.length; return true; },
  lsSkip: k => IDB.ok && (k.startsWith('rs2:c:') || k === 'rs2:resume'),   /* songsave: the resume record goes where the chunks go, so a cut-short save never leaves a record without its world */   // without a working IndexedDB the mirror is all there is, so chunks go there too
  del: k => { delete mem[k]; delete mem[k + '.bak']; IDB.write([k, k + '.bak']); lsSet(k, null); lsSet(k + '.bak', null); },
  // meta: the player's universe (seed, home, ark lineage, aliveness, orbit nudges, world-shaping mods)
  meta: () => S.get(S.key('meta')) || { v: RS.SAVE_V, useed: 1, lineage: [], alive: {}, orbit: {}, mods: {}, seen: {}, t: Date.now() },
  saveMeta: m => { m.t = Date.now(); return S.set(S.key('meta'), m); },
  surfKey: (useed, sys, bodyKey) => S.key('s', useed, sys, bodyKey) };
})(typeof window !== 'undefined' ? window : globalThis);
