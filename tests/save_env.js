// v0.8 H test harness: node_env + store.js + persist.js on a fake IndexedDB that survives simulated app restarts
const T = require('./node_env.js'); const path = require('path');
const DB = new Map(); const later = f => setImmediate(f);
const req = () => ({ onsuccess: null, onerror: null, result: null });
global.indexedDB = { open: () => { const r = req(); r.onupgradeneeded = null; later(() => { r.result = { transaction: () => { const tx = { oncomplete: null, onerror: null, onabort: null, objectStore: () => ({ put: (v, k) => DB.set(k, v), delete: k => DB.delete(k),
  openCursor: () => { const c = req(), ks = [...DB.keys()]; let i = 0; const nx = () => later(() => { c.result = i < ks.length ? { key: ks[i], value: DB.get(ks[i]), continue: () => { i++; nx(); } } : null; c.onsuccess && c.onsuccess(); }); nx(); return c; } }) }; later(() => tx.oncomplete && tx.oncomplete()); return tx; }, createObjectStore: () => { } }; r.onsuccess && r.onsuccess(); }); return r; } };
const js = f => path.join(__dirname, '../www/js', f);
// (re)start the save layer: a fresh Store + Save, as after an app restart; resolves when Store.ready() finished reading the fake IDB
T.boot = async () => { for (const f of ['store.js', 'persist.js']) delete require.cache[require.resolve(js(f))]; require(js('store.js')); require(js('persist.js')); await RS.Store.ready(); await new Promise(r => setImmediate(r)); return RS.Save; };
T.DB = DB;
T.settle = () => new Promise(r => setTimeout(r, 5));
T.bodyKey = (S, b) => b.kind === 'moon' ? 'p' + S.bodies.find(p => p.moons.includes(b)).k + 'm' + b.k : 'p' + b.k;   // = App.bodyKey
// a world entered like App.enterSurface does: key, load (if saved), attach
T.enter = (opt = {}) => { const o = T.make(opt), Sf = o.Sf, SV = RS.Save, key = SV.worldKey(opt.useed || 1, o.sys, o.body || Sf.body || (opt.sys ? o.sys.bodies[0] : o.sys.bodies[1].moons[0]), T.bodyKey); const data = SV.loadWorld(key); if (data) Sf.unpack(data, Date.now()); SV.attach(Sf, key, data); o.key = key; o.data = data; return o; };
module.exports = T;
