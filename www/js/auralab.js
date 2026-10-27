'use strict';
// v0.8b2 AURA LAB (Wilbow 7:58 PM MDT Oct 23 2026: "And build a test environment to show advanced auras and jam auras").
// A showcase picked from the hidden dev panel (3 fingers held 2 s; never hinted in the game; no new gestures). It runs in a SANDBOX world:
// its own Surface (key 'auralab', never attached to the saver), and while it is open every storage write is held (RS.Save.put / App.save
// do nothing), so the real save cannot change. Leaving restores the real world, camera and level exactly as they were (nothing saved).
// Stations (bottom bar: < > to move, 'back to my world' to leave; zooming out / landing anywhere also leaves first):
//   tiers 0 / 5 / 25 / 100 / 400 / 1500 jams · masters glowing + pulsing · the ultra-rare combinations (starRoad, orchard, prism, polymeter,
//   quiet, bridge) · gifted-born / wild teacher / master lineage · the 6 experience mappings (jams, places, cultures, roles, students, fusions)
//   · a live jam of high-tier ohms (the aura pulse follows the leader's beat).
// Zero cost when closed: nothing runs until it is opened.
(function (G) { const RS = G.RS, L = RS.AuraLab = { on: false, st: 0, held: 0 };
const TR = ['hindustani', 'maqam', 'gamelan', 'cuban', 'japan', 'celtic', 'flamenco', 'blues', 'bossa', 'carnatic', 'andean', 'wafrica', 'aksak'];
const Mof = l => 3 * Math.pow(4, l - 1);   // measure value for layer level l (lam inverse, l >= 1)
// a rounded life of N jams (every layer grown alongside, so the jam count sets the level the way it would in play)
L.life = (e, N, k = 0) => { Object.assign(e, { jn: N, pn: Math.round(N * .5), tn: Math.min(13, 1 + Math.round(Math.log2(1 + N))), rn: Math.min(12, 1 + Math.round(Math.log2(1 + N) * .8)), st: Math.round(N * .06), fu: Math.round(N / 80), gn: N >= 750 ? 2 : 1, xp: N * .3, sk: Math.min(.95, .2 + N / 2000) });
  e.tx = {}; e.tx[TR[k % TR.length]] = Math.round(N * .1 * 100) / 100 + .5; if (N >= 25) e.tx[TR[(k + 4) % TR.length]] = Math.round(N * .05 * 100) / 100 + .3; if (N >= 400) e.tx[TR[(k + 7) % TR.length]] = Math.round(N * .02 * 100) / 100 + .2;
  e.rx = { melody: 1 + N * .05, bass: .5 + N * .04, comp: .3 + N * .03 }; e.sx = { [3 + (k % 5)]: 2, 1: 1 }; e.mx = { '4/4': 1 }; return e; };
const base = (e, k) => { L.life(e, 200, k); Object.assign(e, { pn: 12, tn: 2, rn: 3, st: 3, fu: 1, gn: 1 }); e.tx = { [TR[k % TR.length]]: 1 }; e.rx = { melody: 1 }; return e; };
L.GRAD = [0, 1, 3, 6, 12, 25, 50, 100, 200, 400, 800, 1500, 3000];
// a learned sound for the strands station: the snapshot of another ohm's instrument (the way layers.js stores it), p = how far it is learned
L.snd = (seed, p) => { let P = null; try { P = RS.Layers && RS.Inst ? RS.Layers.snap(RS.Inst.fromGenome(RS.Genome.random(RS.hash('labsnd', seed) >>> 0))) : null; } catch (er) { } return { s: 'lab' + seed, k: 'colour', p, P, t0: 0 }; };
// a drummer for the kit station: its birth hits plus learned hits at a progress (the g.dk record drums.js keeps)
L.kit = (g, K, si, k) => { g[RS.IG.perc] = .92; g.dk = K.birth.map((h, i) => ({ h, s: RS.hash('labkit', si, k, i) >>> 0, b: 1 })).concat(K.learned.map(([h, p], i) => ({ h, s: RS.hash('labkitL', si, k, i) >>> 0, l: 1, p, o: 'lab' }))); return g; };
// stations: each item = [caption, (e, c, k) => fill the record]; optional z (camera zoom) and step (spacing along the ground)
L.STATIONS = [
  { name: 'tiers: 0 · 5 · 25 · 100 · 400 · 1500 jams', id: 'tiers', items: [0, 5, 25, 100, 400, 1500].map((N, k) => [N + ' jams', e => L.life(e, N, k)]) },
  // v0.8b2 (Wilbow 8:57 PM): one smooth scale, not switches: 13 ohms from a newborn to a 3000-jam master, side by side (zoomed out to fit)
  { name: 'experience gradient: newborn → master (one smooth scale)', id: 'gradient', z: .42, step: 60, items: L.GRAD.map((N, k) => [N + ' jams', e => L.life(e, N, k)]) },
  { name: 'master level: glowing + pulsing', id: 'masters', items: [['master (1500 jams, crossed a galaxy)', e => L.life(e, 1500, 2)], ['master (3000 jams, 3 galaxies)', e => { L.life(e, 3000, 5); e.gn = 3; }]] },
  { name: 'ultra-rare I: star road · orchard · prism', id: 'rare1', items: [
    ['star road (3 galaxies, far travelled)', e => { L.life(e, 800, 1); Object.assign(e, { gn: 3, pn: 700, wn: 40, tn: 10 }); e.tx[TR[9]] = 40; }],
    ['orchard (students who grew into teachers)', e => { L.life(e, 800, 3); Object.assign(e, { st: 90, sm: 7, hn: 12 }); }],
    ['prism (many fusions across cultures)', e => { L.life(e, 800, 6); Object.assign(e, { fu: 30, tn: 12 }); Object.assign(e.tx, { [TR[10]]: 40, [TR[11]]: 40 }); }]] },
  { name: 'ultra-rare II: polymeter · quiet · bridge', id: 'rare2', items: [
    ['polymeter (3+ meter lengths)', e => { L.life(e, 400, 4); Object.assign(e, { rn: 12, mx: { '4/4': 1, '3/4': 1, '11/8': 1, '7/8': .6 } }); e.rx.pulse = 30; }],
    ['quiet (a drone that never leads)', e => { L.life(e, 500, 8); Object.assign(e, { jl: 2, rx: { drone: 60, listen: 30, melody: 2 } }); e.jl = 2; }],
    ['bridge (hosted 150+ bridges)', e => { L.life(e, 500, 0); Object.assign(e, { hn: 170, fu: 6 }); }]] },
  { name: 'origins: gifted-born · wild teacher · master lineage', id: 'origins', items: [
    ['gifted-born (a newborn, pearl motes)', (e, c) => { L.life(e, 3, 0); c._gift = true; }],
    ['wild teacher (met far from home)', (e, c, k, Sf) => { e.tx = e.tx || {}; e.rx = e.rx || {}; RS.Teacher.wildExp(e, 4.6, 4242); }],
    ['lineage: a master\'s student (sigil, gen 1)', (e, c, k, Sf, prev) => { L.life(e, 60, 5); e.lm = [{ id: 'lab-master', seed: 777, hue: (RS.Trad.HUE || {}).maqam || '230,200,140', N1: 6, gen: 1 }]; }],
    ['lineage: its child (gen 2, fainter)', e => { L.life(e, 12, 7); e.lm = [{ id: 'lab-master', seed: 777, hue: (RS.Trad.HUE || {}).maqam || '230,200,140', N1: 6, gen: 2 }]; }]] },
  { name: 'experience mappings I: jams · places · cultures', id: 'map1', items: [
    ['jams (J): many jams', e => { base(e, 0); e.jn = 700; }],
    ['places (P): worlds + galaxies', e => { base(e, 1); Object.assign(e, { pn: 500, wn: 30, gn: 2 }); }],
    ['cultures (C): traditions known', e => { base(e, 2); e.tn = 12; for (let i = 0; i < 6; i++) e.tx[TR[i]] = 30; }]] },
  { name: 'experience mappings II: roles · students · fusions', id: 'map2', items: [
    ['roles (R): every part', e => { base(e, 3); e.rn = 13; e.rx = { melody: 40, bass: 40, comp: 30, drone: 20, pulse: 20, counter: 20 }; }],
    ['students (S): taught many', e => { base(e, 4); Object.assign(e, { st: 100, hn: 30 }); }],
    ['fusions (F): fused traditions', e => { base(e, 5); e.fu = 35; }]] },
  // v0.8b6 (Wilbow 8:51 / 8:57 PM: learned sounds + influenced styles show in the aura; 8:50 PM: drummers slowly become a full kit): the
  // experience strands (style curls in each tradition's colour, a wisp per learned sound, brighter as it is learned) and the 5 kit arcs.
  { name: 'strands: influenced styles · learned sounds', id: 'strands', items: [
    ['influenced styles (3 traditions)', e => L.life(e, 400, 2)],
    ['learning one sound (40%)', e => { L.life(e, 40, 4); e.sl = [L.snd(1, .4)]; }],
    ['three learned sounds', e => { L.life(e, 150, 6); e.sl = [L.snd(2, 1), L.snd(3, 1), L.snd(4, .7)]; }],
    ['teacher: many styles + 6 sounds', e => { L.life(e, 900, 8); e.sl = [1, 2, 3, 4, 5, 6].map(i => L.snd(10 + i, i < 5 ? 1 : .5)); }]] },
  { name: 'drum kit: birth hits → full kit', id: 'kit', items: [
    ['birth hit only (kick)', null, ['kick']],
    ['learning a snare (50%)', null, ['kick'], [['snare', .5]]],
    ['half kit', null, ['kick', 'hat'], [['snare', 1], ['tom', .3]]],
    ['nearly full', null, ['snare'], [['kick', 1], ['hat', 1], ['tom', .6]]],
    ['full kit (veteran)', null, ['hat', 'bell'], [['kick', 1], ['snare', 1], ['tom', 1]]]].map(([cap, , birth, learned], k) => [cap, e => L.life(e, 60 + 120 * k, k), { birth, learned: learned || [] }]) },
  { name: 'live jam: high-tier ohms playing together', id: 'jam', jam: true, items: [[ 'master', e => L.life(e, 1600, 1)], ['extreme', e => L.life(e, 450, 3)], ['extreme', e => L.life(e, 380, 9)], ['clear', e => L.life(e, 120, 6)], ['master', e => { L.life(e, 2200, 11); e.gn = 2; }]] }];
L.GAP = 2400; L.STEP = 105;   // stations far enough apart that only one is on screen; a row stays a row (the station spot is dry + gentle, no per-ohm search)
// ---- storage hold: nothing is written while the lab is open ----
L.hold = on => { const SV = RS.Save; if (SV && !SV._labPut) { const p0 = SV.put; SV._labPut = p0; SV.put = (...a) => L.on ? (L.held++, 0) : p0(...a); }
  if (RS.Store && !RS.Store._labSM) { const s0 = RS.Store.saveMeta; RS.Store._labSM = s0; RS.Store.saveMeta = (...a) => L.on ? (L.held++, true) : s0(...a); } };
L.wrapApp = App => { if (App._labWrapped) return; App._labWrapped = true; const sv0 = App.save, lv0 = App.leaveSurface, en0 = App.enterSurface;
  App.save = (...a) => { if (L.on) { L.held++; return; } return sv0(...a); };
  App.leaveSurface = (...a) => { if (L.on) { L.exit(); return lv0(...a); } return lv0(...a); };   // zooming out of the lab: back to the real world first, then leave it as usual
  App.enterSurface = (...a) => { if (L.on) L.exit(); return en0(...a); }; };
// ---- build the sandbox world ----
L.build = (App, body, sys) => { const M = RS.Music(RS.hash('m', body.seed), App.persona || (App.U && RS.galaxyPersona ? RS.galaxyPersona(App.U) : undefined)), mods = { water: 0, light: 0, cloud: 0, guide: { step: 0, done: true, id: null } };
  const Sf = RS.Surface({ M, A: RS.audio, sys, body, key: 'auralab', mods, galaxy: App.persona, useed: (App.meta && App.meta.useed) || 1 }); Sf._lab = true; Sf._gdOnce = true; Sf.noSeedItems = true; Sf.noPatches = true; Sf.eggOn = false;
  if (RS.paletteMusic) RS.paletteMusic(M, Sf.pal); if (RS.Theory && RS.Theory.plan) M.plan = RS.Theory.plan(RS.hash('plan', body.seed)); M.t0 = performance.now() / 1000;
  const R = Sf.P.R || 1000, F0 = Sf.frameAt(0); Sf.view = { x0: F0.sx - 400, x1: F0.sx + 400, y0: F0.sy - 400, y1: F0.sy + 400, cx: F0.sx, cy: F0.sy, z: 1 }; Sf.step(1 / 60);
  for (const c of Sf.creatures.slice()) Sf.removeCreature ? Sf.removeCreature(c) : (c.dead = true);   // no companions: only the showcase ohms
  L.ohms = []; let prevTh = -1e9; L.STATIONS.forEach((S, si) => { let th0 = si ? prevTh + L.GAP / R : 0, th = th0; for (let k = 0; k < 6; k++) { th = Sf.landSpot ? Sf.landSpot(th0, { r: 340 }) : th0; if (th - prevTh >= .9 * L.GAP / R) break; th0 += L.GAP / 2 / R; } prevTh = th; S.th = th; S.ohms = [];
    S.items.forEach(([cap, fill, K], k) => { const dth = (k - (S.items.length - 1) / 2) * (S.jam ? 46 : S.step || L.STEP) / R, Fo = Sf.frameAt(th + dth), x = Fo.sx + Fo.ux * 40, y = Fo.sy + Fo.uy * 40; let g = RS.Genome.random(RS.hash('auralab', si, k) >>> 0); if (K) L.kit(g, K, si, k);   /* the kit station keeps its set kit: Sf.distinct would re-roll the genome and drop g.dk */
      const c = Sf.addCreature(g, x, y, { growth: S.id === 'origins' && k === 0 ? .3 : 1, energy: .95, quiet: !S.jam, distinct: !K }); if (!c) return; if (!c.mind && RS.Mind) c.mind = RS.Mind.make(Sf, c);
      const e = c.exp = RS.Exp.make(c); fill(e, c, k, Sf); e.hk = 'auralab'; c._labCap = cap; c._labSt = S.id; c._auL = RS.Teacher.target(e); if (RS.Aura) RS.Aura.keyTick(c); S.ohms.push(c); L.ohms.push(c); }); });
  L.Sf = Sf; L.keepJam(); return Sf; };
// the live jam: formed at build and re-formed whenever it has broken up (he may wait at another station a long while)
L.keepJam = () => { const Sf = L.Sf, J = L.STATIONS.find(s => s.jam); if (!Sf || !J || !RS.Jam || J.ohms.length < 2) return;
  if (L.jam && Sf.jams.includes(L.jam) && J.ohms.every(c => c.jam === L.jam)) return;
  try { for (const c of J.ohms) if (c.jam && Sf.jams.includes(c.jam)) RS.Jam.dissolve(Sf, c.jam); L.jam = RS.Jam.form(Sf, J.ohms, .92); L.jamForms = (L.jamForms || 0) + 1; } catch (err) { L.jamErr = String(err && err.message || err); } };
// ---- open / close ----
L.enter = App => { if (L.on) return true; App = App || G.RSAPP; const body = App.body, sys = App.sysI != null && App.system ? App.system(App.sysI) : null; if (!body || !sys) { L.err = 'land on a world first'; return false; }
  L.wrapApp(App); try { App.save(); } catch (e) { }   // the real world as it is now (a normal save); nothing else is written until the lab closes
  L.hold(true); L.saved = { Sf: App.Sf, cam: Object.assign({}, App.cam), level: App.level, daw: App.daw, persona: App.persona }; L.held = 0; L.on = true;
  let Sf; try { Sf = L.build(App, body, sys); } catch (err) { L.on = false; L.err = String(err && err.message || err); App.Sf = L.saved.Sf; App.cam = L.saved.cam; App.level = L.saved.level; App.daw = L.saved.daw; return false; }
  L.Sf = Sf; App.Sf = Sf; App.daw = RS.DAW ? RS.DAW(Sf) : null; App.level = 'surface'; L.go(App, 0); L.ui(App, true); L.raf(App); return true; };
L.exit = () => { if (!L.on) return; const App = L.App || G.RSAPP, s = L.saved; L.on = false; L.ui(App, false); cancelAnimationFrame(L.rafId || 0);
  if (L.Sf) { for (const c of L.Sf.creatures) c.dead = true; L.Sf.jams && (L.Sf.jams.length = 0); }
  App.Sf = s.Sf; App.cam = s.cam; App.level = s.level; App.daw = s.daw; App.persona = s.persona; L.Sf = null; L.jam = null; if (App.Sf && App.syncView) App.syncView(); L.exits = (L.exits || 0) + 1; };
L.go = (App, i) => { L.st = (i + L.STATIONS.length) % L.STATIONS.length; const S = L.STATIONS[L.st], Sf = L.Sf, F = Sf.frameAt(S.th); App.cam = { x: F.sx + F.ux * 70, y: F.sy + F.uy * 70, z: S.z || 1, th: S.th }; if (S.jam) L.keepJam(); L.follow = true; L.lastCam = [App.cam.x, App.cam.y]; if (App.syncView) App.syncView(); L.caption(); };
// the camera rides along with the station's ohms (they still walk) until he pans away himself
L.raf = App => { L.App = App; const f = () => { if (!L.on) return; L.rafId = requestAnimationFrame(f); const S = L.STATIONS[L.st], c = App.cam; if (!S || !c) return; if (S.jam && (L.fr = (L.fr || 0) + 1) % 60 === 0) L.keepJam();
  if (L.lastCam && Math.hypot(c.x - L.lastCam[0], c.y - L.lastCam[1]) > 3) L.follow = false;
  if (L.follow && S.ohms.length) { let x = 0, y = 0, n = 0; for (const o of S.ohms) if (!o.dead) { x += o.x; y += o.y; n++; } if (n) { const F = L.Sf.frameAt(L.Sf.P.theta(x / n, y / n)); c.x += (x / n + F.ux * 70 - c.x) * .04; c.y += (y / n + F.uy * 70 - c.y) * .04; } }
  L.lastCam = [c.x, c.y]; }; L.rafId = requestAnimationFrame(f); };
// ---- the bar (plain text, like the dev panel) ----
L.caption = () => { if (!L.el) return; const S = L.STATIONS[L.st], Te = RS.Teacher; const lines = S.ohms.slice().sort((a, b) => (a.x - b.x)).map(c => esc(c._labCap) + ' · ' + Te.tier(RS.Teacher.level(c)) + ' ' + (RS.Teacher.level(c)).toFixed(1) + (Te.combos(c.exp).length ? ' · ' + Te.combos(c.exp).join('+') : '') + L.sCap(c));
  L.el.querySelector('#auralabt').innerHTML = '<b>AURA LAB</b> ' + (L.st + 1) + '/' + L.STATIONS.length + ' · ' + esc(S.name) + '\n' + lines.join('\n'); };
L.sCap = c => { const Au = RS.Aura; if (!Au || !Au.strands || !c._auSK) return ''; const St = Au.strands(c); return ' · strands ' + St.style.length + '/' + St.sounds.length + (St.kit ? ' · kit ' + Math.round(St.kit.fullness * 100) + '%' : ''); };
const esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
L.ui = (App, on) => { const doc = G.document; if (!doc || !doc.body) return; if (!on) { if (L.el) L.el.remove(); L.el = null; clearInterval(L.capT); return; }
  const el = L.el = doc.createElement('div'); el.id = 'auralab';
  el.style.cssText = 'position:fixed;left:6px;right:6px;bottom:calc(6px + env(safe-area-inset-bottom));max-height:34vh;overflow-y:auto;background:rgba(8,12,18,.66);color:#d8e8f0;font:11px/1.4 monospace;padding:6px 8px;border-radius:6px;z-index:32;white-space:pre-wrap';
  const btn = 'display:inline-block;margin:4px 6px 0 0;padding:6px 12px;border:1px solid rgba(200,230,255,.35);border-radius:5px;cursor:pointer';
  el.innerHTML = `<div id="auralabt"></div><span id="auralabprev" style="${btn}">&lt; prev</span><span id="auralabnext" style="${btn}">next &gt;</span><span id="auralabexit" style="${btn};border-color:rgba(255,220,180,.6)">back to my world</span>`;
  for (const ev of ['pointerdown', 'pointerup', 'touchstart', 'touchend', 'mousedown', 'wheel']) el.addEventListener(ev, e => e.stopPropagation());
  el.addEventListener('click', e => { const id = e.target && e.target.id; if (id === 'auralabprev') L.go(App, L.st - 1); else if (id === 'auralabnext') L.go(App, L.st + 1); else if (id === 'auralabexit') L.exit(); });
  doc.body.appendChild(el); L.caption(); L.capT = setInterval(L.caption, 1000); };
// what the playwright check reads
L.report = () => { const Au = RS.Aura, Te = RS.Teacher, S = L.STATIONS[L.st]; return { on: L.on, st: S && S.id, held: L.held, jam: !!(L.jam && L.Sf && L.Sf.jams.includes(L.jam) && L.jam.members.length >= 4 && L.jam.members.every(c => c.jam === L.jam)), jamForms: L.jamForms || 0, jamErr: L.jamErr,
  faint: Au.S.faintN || 0, ohms: S ? S.ohms.map(c => ({ cap: c._labCap, L: +Te.level(c).toFixed(2), tier: Te.tier(Te.level(c)), key: !!c._auK, baked: !!(c._auB && Au.S.cache.has(c._auB)), inView: L.Sf ? L.Sf.inView(c.x, c.y, 0) : false, gift: Te.gifted(c), lm: !!(c.exp.lm && c.exp.lm.length), combos: Te.combos(c.exp), pulse: Au.vis(Te.level(c)).pulse, sk: !!c._auSK, sStyle: Au.strands ? Au.strands(c).style.length : 0, sSound: Au.strands ? Au.strands(c).sounds.length : 0, kit: RS.Drums && c.g && c.g.dk && RS.Drums.fullness ? +RS.Drums.fullness(c.g).toFixed(2) : null })) : [], drawn: Au.S.drawn, sDrawn: Au.S.sDrawn || 0, lvl: Au.S.lvl }; };
})(typeof window !== 'undefined' ? window : globalThis);
