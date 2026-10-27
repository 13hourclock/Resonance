// v0.8b2 browser check of the AURA LAB (Wilbow 7:58 PM MDT Oct 23 2026 "And build a test environment to show advanced auras and jam auras"):
// opened from the hidden dev panel (real 3-finger 2 s hold, then the panel entry), every station renders (all tiers 0..master baked + drawn,
// masters pulse, the ultra-rare combos, gifted / wild / lineage, the 6 mappings, a live jam), 'back to my world' restores the real game,
// and the real save (Store memory, IndexedDB, localStorage) is byte-for-byte unchanged by the visit. No screenshots.
const { chromium } = require('playwright'); const PORT = process.env.PORT || process.env.RS_PORT || 8811;
const res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok  ' : 'FAIL') + ' ' + n + (i !== undefined ? '  ' + JSON.stringify(i).slice(0, 600) : '')); };
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const ctx = await b.newContext({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/index.html?fixed=1`); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(2500); const cdp = await ctx.newCDPSession(p);
  const T = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((q, i) => ({ x: q[0], y: q[1], id: i, radiusX: 4, radiusY: 4, force: .5 })) });
  const W = ms => p.waitForTimeout(ms), E = (f, a) => p.evaluate(f, a);
  const tapEl = async id => { const r = await E(id => { const e = document.getElementById(id); if (!e) return null; const q = e.getBoundingClientRect(); return [q.x + q.width / 2, q.y + q.height / 2]; }, id); if (!r) return false; await T('touchStart', [r]); await W(40); await T('touchEnd', []); await W(250); return true; };
  // the real save, all three copies
  const snap = () => E(async () => { const mem = JSON.stringify(Object.keys(RS.Store.mem).sort().map(k => [k, RS.Store.mem[k]])); const ls = JSON.stringify(Object.keys(localStorage).sort().map(k => [k, localStorage.getItem(k)]));
    const idb = await new Promise(res => { try { const r = indexedDB.open('resonance', 1); r.onsuccess = () => { try { const db = r.result, out = []; const tx = db.transaction('kv', 'readonly'), os = tx.objectStore('kv'), c = os.openCursor(); c.onsuccess = () => { const cu = c.result; if (cu) { out.push([cu.key, cu.value]); cu.continue(); } else { db.close(); res(JSON.stringify(out.sort((a, b) => a[0] < b[0] ? -1 : 1))); } }; c.onerror = () => res('err'); } catch (e) { res('err:' + e.message); } }; r.onerror = () => res('err'); } catch (e) { res('err:' + e.message); } });
    return { mem, ls, idb, n: Object.keys(RS.Store.mem).length, writes: RS.Store.writes }; });
  const real0 = await E(() => { const S = RSAPP.Sf; S._pwReal = 1; return { level: RSAPP.level, key: S.key, n: S.creatures.length, ids: S.creatures.map(c => c.id).join(), cam: [RSAPP.cam.x, RSAPP.cam.y] }; });
  ok('L0 the game starts on a real world', real0.level === 'surface' && real0.n >= 1, real0);
  ok('L0b the lab is not running and costs nothing until opened', await E(() => !!RS.AuraLab && !RS.AuraLab.on && !document.getElementById('auralab') && !RS.AuraLab.rafId));
  // open the dev panel with the real gesture, then pick the entry
  const F3 = [[150, 640], [220, 640], [185, 700]]; await T('touchStart', F3); await W(2300); await T('touchEnd', []); await W(300);
  const hasEntry = await E(() => RS.Dev.open && !!document.getElementById('devauralab')); ok('L1 the dev panel (3-finger 2 s hold) lists the aura showcase', hasEntry);
  await E(() => RSAPP.save()); await W(400); await tapEl('devauralab'); await W(600);
  const s1 = await snap(); const realIn = await E(() => RS.AuraLab.saved.Sf.creatures.filter(c => !c.dead).map(c => c.id).join()); const lab = await E(() => ({ on: RS.AuraLab.on, sandbox: RSAPP.Sf && RSAPP.Sf._lab === true && RSAPP.Sf.key === 'auralab' && !RSAPP.Sf._pwReal, bar: !!document.getElementById('auralab'), panel: RS.Dev.open, attached: !!RSAPP.Sf._sv }));
  ok('L2 picking it opens the lab in a sandbox world (own Surface, never attached to the saver); the panel closes', lab.on && lab.sandbox && lab.bar && !lab.panel && !lab.attached, lab);
  const R = () => E(() => RS.AuraLab.report());
  const waitBaked = async (ms) => { let r; for (let t = 0; t < ms; t += 250) { r = await R(); if (r.ohms.filter(o => o.L >= 1 || o.gift || o.lm).every(o => o.baked || (o.L < 1))) break; await W(250); } return r; };
  // station 1: tiers
  let r = await waitBaked(9000); const tiers = r.ohms.map(o => o.tier);
  ok('L3 tiers station: a row at 0 / 5 / 25 / 100 / 400 / 1500 jams reads none / flicker / forming / clear / extreme / master', r.st === 'tiers' && tiers.join() === 'none,flicker,forming,clear,extreme,master', r.ohms.map(o => [o.cap, o.tier, o.L]));
  ok('L4 every tier from 5 jams up is baked and on screen; the 0-jam ohm only glows faintly (no bake)', r.ohms.slice(1).every(o => o.key && o.baked && o.inView) && !r.ohms[0].baked, r.ohms.map(o => [o.cap, o.key, o.baked, o.inView]));
  await W(500); r = await R(); ok('L5 the auras are drawn each frame (the ladder stays on full)', r.drawn >= 5 && r.lvl <= 1, { drawn: r.drawn, lvl: r.lvl });
  const want = { gradient: o => o.length === 13 && o.every((x, i) => !i || x.L >= o[i - 1].L - .02) && o[0].L < .3 && o[12].L >= 5 && o.every(x => x.inView) && new Set(o.map(x => x.tier)).size === 6, masters: o => o.every(x => x.tier === 'master' && x.pulse === 1), rare1: o => ['starRoad', 'orchard', 'prism'].every((k, i) => o.some(x => x.combos.includes(k))), rare2: o => ['polymeter', 'quiet', 'bridge'].every(k => o.some(x => x.combos.includes(k))),
    origins: o => o.some(x => x.gift) && o.some(x => /wild/.test(x.cap) && x.L >= 3) && o.filter(x => x.lm).length >= 2, map1: o => o.length === 3 && o.every(x => x.L >= 4), map2: o => o.length === 3 && o.every(x => x.L >= 4),
    /* 0.8b6: experience strands (styles + learned sounds) and kit arcs (birth hits -> full kit) */ strands: o => o.length === 4 && o.every(x => x.sk) && o[0].sStyle >= 3 && o[1].sSound === 1 && o[2].sSound === 3 && o[3].sSound === 6 && o[3].sStyle >= 3, kit: o => o.length === 5 && o.every(x => x.sk && x.kit != null) && o[0].kit === .2 && o[4].kit === 1 && o.every((x, i) => !i || x.kit > o[i - 1].kit), jam: o => o.length >= 4 && o.filter(x => x.L >= 4).length >= 4 };
  const seen = ['tiers'];
  const nSt = await E(() => RS.AuraLab.STATIONS.length); for (let i = 1; i < nSt; i++) { await tapEl('auralabnext'); r = await waitBaked(9000); seen.push(r.st);
    const f = want[r.st]; ok('L6 station ' + r.st + ': its examples render (baked + on screen)', f && f(r.ohms) && r.ohms.filter(o => o.L >= 1).every(o => o.baked && o.inView) && r.drawn >= 1 && (r.ohms.every(o => o.L >= 1) || r.faint >= 1) && (!/^(strands|kit)$/.test(r.st) || r.sDrawn >= r.ohms.length), { faint: r.faint, ohms: r.ohms.map(o => [o.cap, o.tier, o.L, o.combos.join('+'), o.baked, o.inView]), drawn: r.drawn, sDrawn: r.sDrawn, strands: r.ohms.map(o => [o.sStyle, o.sSound, o.kit]) });
    if (r.st === 'jam') { await W(3000); r = await R(); const jl = await E(() => { const L = RS.AuraLab.jam; return L ? { n: L.members.length, inJam: L.members.filter(c => c.jam === L).length, lead: !!(L.leader && L.leader.mind), env: L.members.map(c => +RS.Aura.env(c, performance.now() / 1000, 100).toFixed(2)), hi: L.members.filter(c => RS.Teacher.level(c) >= 4).length } : null; });
      ok('L7 live jam: 4+ high-tier ohms jam together, the aura pulse rides the leader\'s beat', r.jam && jl && jl.inJam >= 4 && jl.hi >= 4 && jl.lead && !r.jamErr, { jl, forms: r.jamForms, err: r.jamErr }); } }
  ok('L8 all 11 stations visited (tiers, gradient, masters, rare I + II, origins, mappings I + II, strands, kit, live jam)', ['tiers', 'gradient', 'masters', 'rare1', 'rare2', 'origins', 'map1', 'map2', 'strands', 'kit', 'jam'].every(s => seen.includes(s)), seen);
  const held = await E(() => RS.AuraLab.held); const s2 = await snap();
  ok('L9 nothing is written while the lab is open', s2.mem === s1.mem && s2.idb === s1.idb && s2.ls === s1.ls && s2.writes === s1.writes, { held, n: [s1.n, s2.n], writes: [s1.writes, s2.writes] });
  // back out
  const labIds = await E(() => RSAPP.Sf.creatures.map(c => c.id));
  await tapEl('auralabexit'); await W(100);
  const s3 = await snap(); const back = await E(() => ({ on: RS.AuraLab.on, level: RSAPP.level, real: RSAPP.Sf && RSAPP.Sf._pwReal === 1, key: RSAPP.Sf && RSAPP.Sf.key, ids: RSAPP.Sf.creatures.filter(c => !c.dead).map(c => c.id), bar: !!document.getElementById('auralab'), raf: RS.AuraLab.rafId }));
  ok('L10 \'back to my world\' returns to his real world (same world, same ohms + any natural hatch, no lab ohm leaked, same level), the lab bar is gone', !back.on && back.level === real0.level && back.real && back.key === real0.key && realIn.split(',').filter(Boolean).every(i => back.ids.includes(i)) && !back.ids.some(i => labIds.includes(i)) && !back.bar, back);
  ok('L11 the real save is unchanged after the visit (Store memory, IndexedDB, localStorage)', s3.mem === s1.mem && s3.idb === s1.idb && s3.ls === s1.ls && s3.idb.length > 2 && !/^err/.test(s3.idb), { n: [s1.n, s3.n], idb: s3.idb.length });
  await W(1500); const live = await E(() => { const f0 = RSAPP.stats.frames; return new Promise(res => setTimeout(() => res({ frames: RSAPP.stats.frames - f0, saveWorks: RS.Store.writes }), 600)); }); await E(() => RSAPP.save()); const wAfter = await E(() => RS.Store.writes);
  ok('L12 the normal game runs on afterwards and saves again as usual', live.frames > 10 && wAfter >= s3.writes, { live, wAfter, w3: s3.writes });
  // zooming out from the lab (leaveSurface) also goes home first, without saving the sandbox
  await E(() => RS.Dev.auraLab(RSAPP)); await W(400); const z = await E(() => { const in1 = RS.AuraLab.on && RSAPP.Sf._lab; RSAPP.leaveSurface(); return { in1, on: RS.AuraLab.on, lab: Object.keys(RS.Store.mem).some(k => /auralab/.test(k)), level: RSAPP.level }; });
  ok('L13 leaving the lab by zooming out restores the real world first; no sandbox key is ever stored', z.in1 && !z.on && !z.lab, z);
  ok('L14 no page errors', errs.length === 0, errs.slice(0, 5));
  await b.close(); console.log('pw_aura ' + res.filter(Boolean).length + '/' + res.length); process.exit(res.every(Boolean) ? 0 : 1);
})().catch(e => { console.log('FAIL pw_aura crashed: ' + (e && e.stack || e)); process.exit(1); });
