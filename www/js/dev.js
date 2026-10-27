'use strict';
// v0.8a10 DEV PANEL (Wilbow 2:31 PM / 2:38 PM): a hidden developer window. The one deliberate exception to "no menus": plain text,
// small, scrollable, semi-transparent, never hinted by the guide. OPEN/CLOSE: three fingers held still (< 30 px) for 2.0 s (a ring fills
// while they rest; lifting early does nothing; a quick 3-finger tap is still undo). While open, a 1-finger tap on anything IDENTIFIES it
// (the tap is consumed: no play / join / mute / pop). Shows: health (fps, ohms, voices, off-screen, audio, build, save size, last errors)
// and the tapped thing (an ohm gets a full sheet). ZERO COST WHEN CLOSED: no per-frame work, no timers; the error ring is event-only.
(function (G) { const RS = G.RS, D = RS.Dev = {};
D.BUILD = { name: '0.8b10', code: 35 };   /* keep in step with android/app/build.gradle (pw_dev checks it) */
D.HOLD_MS = 2000; D.HOLD_PX = 30; D.LAND_MS = 350; D.ERR_N = 12;
D.open = false; D.errs = []; D.sel = null; D.hold = null; D.el = null; D.timer = 0; D.raf = 0; D.fps = 0;
const r2 = x => typeof x === 'number' ? Math.round(x * 100) / 100 : x, esc = s => String(s).replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
const short = (v, n = 120) => { let s; try { s = typeof v === 'string' ? v : JSON.stringify(v, (k, x) => typeof x === 'number' ? r2(x) : (x && x.length > 12 && Array.isArray(x)) ? '[' + x.length + ']' : x); } catch (e) { s = String(v); } return s && s.length > n ? s.slice(0, n) + '…' : s; };
// ---- caught errors (from App.inputFail, the frame loop's catch, window error / unhandledrejection): event-only, last ERR_N kept ----
D.err = (where, msg) => { D.errs.push({ where, msg: String(msg).slice(0, 160), at: new Date().toTimeString().slice(0, 8) }); if (D.errs.length > D.ERR_N) D.errs.shift(); };
if (G.addEventListener) { G.addEventListener('error', e => D.err('window', e && (e.message || e.error) || 'error')); G.addEventListener('unhandledrejection', e => D.err('promise', e && e.reason && (e.reason.message || e.reason) || 'rejection')); }
// ---- the 3-finger hold (driven by app.js's recogniser) ----
D.holdStart = (App, pts, landSpread) => { D.holdCancel(); if (landSpread > D.LAND_MS) return false; let x = 0, y = 0; for (const q of pts) { x += q.x; y += q.y; } x /= pts.length; y /= pts.length;
  const h = D.hold = { x, y, t0: performance.now(), done: false }; D.ring(h, true); h.to = setTimeout(() => { if (D.hold !== h) return; h.done = true; D.ring(h, false); D.toggle(App); if (navigator.vibrate) try { navigator.vibrate(24); } catch (e) {} }, D.HOLD_MS); return true; };
D.holdMoved = px => { if (D.hold && !D.hold.done && px >= D.HOLD_PX) D.holdCancel(); };
D.holdCancel = () => { const h = D.hold; if (!h) return; clearTimeout(h.to); D.ring(h, false); D.hold = null; };
D.holdEnd = () => { const h = D.hold, done = !!(h && h.done); D.holdCancel(); return done; };   /* true = the hold toggled the panel (the lift is consumed: no undo) */
D.ring = (h, on) => { const doc = G.document; if (!doc || !doc.body) return; if (!on) { if (h.el) { h.el.remove(); h.el = null; } return; }
  const el = h.el = doc.createElement('div'); el.id = 'devring'; const R = 34;
  el.style.cssText = `position:fixed;left:${h.x - R}px;top:${h.y - R}px;width:${2 * R}px;height:${2 * R}px;pointer-events:none;z-index:30`;
  el.innerHTML = `<svg width="${2 * R}" height="${2 * R}"><circle cx="${R}" cy="${R}" r="${R - 4}" fill="none" stroke="rgba(200,230,255,.18)" stroke-width="3"/><circle id="devringf" cx="${R}" cy="${R}" r="${R - 4}" fill="none" stroke="rgba(200,230,255,.75)" stroke-width="3" stroke-dasharray="${2 * Math.PI * (R - 4)}" stroke-dashoffset="${2 * Math.PI * (R - 4)}" transform="rotate(-90 ${R} ${R})" style="transition:stroke-dashoffset ${D.HOLD_MS}ms linear"/></svg>`;
  doc.body.appendChild(el); const f = el.querySelector('#devringf'); el.getBoundingClientRect(); f.style.strokeDashoffset = '0'; };
// ---- open / close ----
D.toggle = App => D.open ? D.close() : D.show(App);
D.show = App => { const doc = G.document; D.App = App; D.open = true; if (!doc) return; let el = D.el; if (!el) { el = D.el = doc.createElement('div'); el.id = 'devpanel';
    /* top-left, at most 46 % wide and 52 % tall: the rest of the screen stays free for the closing hold and for identify taps */
    el.style.cssText = 'position:fixed;left:6px;top:calc(6px + env(safe-area-inset-top));width:min(46vw,360px);max-height:52vh;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y;background:rgba(8,12,18,.62);color:#d8e8f0;font:11px/1.35 monospace;padding:6px 8px;border-radius:6px;z-index:31;white-space:pre-wrap;word-break:break-word';
    el.addEventListener('pointerdown', e => e.stopPropagation());
    el.addEventListener('click', e => { if (e.target && e.target.id === 'devauralab') D.auraLab(D.App); }); }
  doc.body.appendChild(el); D.render(); D.timer = setInterval(D.render, 500); let n = 0, t0 = performance.now(); const tick = () => { if (!D.open) return; n++; const t = performance.now(); if (t - t0 >= 1000) { D.fps = Math.round(n * 1000 / (t - t0)); n = 0; t0 = t; } D.raf = requestAnimationFrame(tick); }; D.raf = requestAnimationFrame(tick); };
D.close = () => { D.open = false; clearInterval(D.timer); D.timer = 0; if (D.raf) cancelAnimationFrame(D.raf); D.raf = 0; if (D.el) D.el.remove(); };
// v0.8b2 the aura showcase entry (Wilbow 7:58 PM): opens the sandbox lab (auralab.js) and closes the panel; the lab has its own 'back to my world'
D.auraLab = App => { if (!RS.AuraLab) return false; RS.AuraLab.err = null; const ok = RS.AuraLab.enter(App); if (ok) D.close(); else D.render(); return ok; };
// ---- identify (a 1-finger tap while open; consumed) ----
D.identify = (App, sx, sy) => { const Sf = App.Sf; let s = null; try { s = D.find(App, sx, sy); } catch (e) { s = { type: 'error', why: String(e && e.message || e) }; } D.sel = s || { type: 'nothing here', level: App.level }; D.render(); return D.sel; };
D.find = (App, sx, sy) => { const Sf = App.Sf; if (App.level !== 'surface' || !Sf) return { type: 'level ' + App.level, note: 'identify works on the surface; this level shows its own view' };
  const w = RS.Render.toWorld(App.cam, App.Wd, App.Ht, sx, sy), [x, y] = w, z = App.cam.z || 1;
  if (RS.Egg && RS.Egg.on && RS.Egg.on(Sf, sx, sy, z)) return { type: 'egg (word egg)', state: short(Sf.wordEgg && Object.fromEntries(Object.entries(Sf.wordEgg).filter(([k, v]) => typeof v !== 'object')), 160) };
  if (Sf.clay && RS.Mold && RS.Mold.on && RS.Mold.on(Sf, x, y)) return D.clay(Sf.clay);
  const c = Sf.creatureAt(x, y, 14 / z) || (Sf.hit(x, y) || {}).creature; if (c) return D.ohm(Sf, c);
  const h = Sf.hit(x, y) || {}; if (h.bubble) return D.body(h.bubble, 'bubble'); if (h.body) return D.body(h.body);
  for (const it of Sf.items || []) { const p = RS.Items ? RS.Items.pos(Sf, it) : [it.x, it.y]; if (Math.hypot(p[0] - x, p[1] - y) < (it.R || 11) + 8 / z) return D.item(it); }
  const gr = Sf.grow; if (gr) for (const p of gr.plants || []) if (p.x != null && Math.hypot(p.x - x, p.y - y) < 26 / z + 10) return { type: 'plant (' + (p.kind || 'sound') + ')', hz: r2(p.hz), size: r2(p.L || p.sg), from: p.src || p.by || p.jam || '', made: p.kind === 'jam' ? 'a jam (seed)' : 'grown from nearby sound' };
  if (RS.Water && RS.Water.at && RS.Water.at(Sf, x, y) > 0) { const P = Sf.P, p = RS.Water.poolNear(Sf, P.theta(x, y), 0); return { type: 'pool (water)', depth: p && r2(p.depth), vol: p && Math.round(p.vol), rain: p && r2(p.rain), made: p && (p.key ? 'player (poured)' : 'world') }; }
  const st = (Sf.stars || []).find(q => Math.hypot(q.x - x, q.y - y) < 20 / z); if (st) return { type: 'star', detail: short(st) };
  return null; };
const made = m => m ? (m.made || m.by || m.maker || (m.player || m.drawn ? 'player' : m.kit ? 'world (kit)' : m.landmark ? 'world (landmark)' : m.cave ? 'world (cave)' : 'world')) : '?';
D.body = (b, type) => { const m = b.meta || {}; const it = m.item; if (it) return D.item(it); const o = { type: type || ((b.kind || 'body') + (m.role ? ' / ' + m.role : '')), material: short(b.mat, 160), made: made(m) };
  const v = m.voice || m.sv || m.shapeVoice; if (v) o.voice = short(v.P ? Object.assign({ id: RS.Inst && RS.Inst.identity ? RS.Inst.identity(v.P) : '' }, v) : v, 200);
  const extra = {}; for (const k in m) if (!['role', 'born', 'voice', 'sv', 'shapeVoice', 'item'].includes(k)) extra[k] = m[k]; o.meta = short(extra, 200); o.id = b.uid || b.id; return o; };
D.item = it => ({ type: 'item: ' + it.kind + ' effect', kind: it.kind, settings: short(it.p, 200), charge: r2(it.charge), wear: r2(it.wear), made: it.made || 'world', holder: it.holder ? it.holder.id : '' });
D.clay = cl => ({ type: 'clay (unhatched ohm)', stage: cl.stage || cl.phase || '', family: cl.cs ? cl.cs.fam : '', made: 'player', detail: short(Object.fromEntries(Object.entries(cl).filter(([k, v]) => typeof v !== 'object' || v === null)), 200) });
// ---- the selected ohm's sheet ----
D.GENES = { 0: 'size', 20: 'stiffness', 21: 'density', 64: 'boldness', 65: 'sociability', 96: 'tempo', 97: 'rhythmic density', 123: 'range', 124: 'role lean', 136: 'lifespan', 137: 'fertility', 168: 'vocal tract', 172: 'exciter', 173: 'resonance', 181: 'attack', 182: 'decay', 203: 'bodyRes' };
D.ohm = (Sf, c) => { const g = c.g || [], m = c.mind || {}, e = c.exp || {}, P = c.P || {}, I = P.inst || {};
  const genes = {}; for (const k in D.GENES) if (g[k] != null) genes[D.GENES[k]] = r2(g[k]); for (let i = 0; i < 6 && RS.INST_GENES; i++) { const n = RS.INST_GENES[i]; genes['inst.' + n] = r2(g[172 + i]); }
  const kids = (Sf.creatures || []).filter(o => o.parents && o.parents.includes && o.parents.includes(c.id)).map(o => o.id);
  const t = c.tally || {}; const j = c.jam;
  const top = o => o ? Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => k + ' ' + r2(v)).join(', ') : '';
  return { type: 'ohm', id: c.id, name: c.name || (RS.Genome && RS.Genome.name ? RS.Genome.name(g) : ''), species: RS.Items && RS.Items.species ? RS.Items.species(Sf, c) : c.sp,
    instrument: RS.Inst && RS.Inst.identity ? RS.Inst.identity(I, g) : '', engine: short({ exc: I.exc, style: P.style || I.style, eng: I.eng || I.engines, sec: I.sec }, 160), voice: c.voice ? short(c.voice, 100) : '',
    genes: short(genes, 400), xp: r2(e.xp), sk: r2(e.sk), jn: e.jn, pn: e.pn, inherited: short(e.ih, 160), bpm: short(e.bpm), feel: short(e.en), meter: top(e.mx), scales: top(e.sx), roles: top(e.rx), traditions: top(e.tx),
    parents: short(c.parents), children: short(kids), gen: c.gen, tally: `w ${Math.round(t.w || 0)} s, i ${t.i || 0}, o ${t.o || 0}, t ${short(t.t || [])}`,
    mood: short(m.mood), state: c.state || '', activity: c.activity == null ? '' : r2(c.activity), role: m.role || '', jam: j ? `${j.id || ''} leader ${j.leader && j.leader.id} · ${j.members ? j.members.length : 0} members · coh ${r2(j.coh)} · phase ${j.E && j.E.phase}` : 'none',
    growth: r2(c.growth), energy: r2(c.energy), muted: !!c.muted, onScreen: !c.off }; };
// ---- health ----
D.health = App => { const Sf = App.Sf, A = RS.audio || {}, L = A.last || {}, cs = (Sf && Sf.creatures) || [], v = Sf && Sf.view;
  let off = 0; if (v) for (const c of cs) if (!(c.x >= v.x0 && c.x <= v.x1 && c.y >= v.y0 && c.y <= v.y1)) off++;
  const S = RS.Save, wb = S && S.stats && S.stats.worldBytes, bytes = wb ? Object.values(wb).reduce((x, y) => x + (y || 0), 0) : 0;
  let load = 'n/a (the worklet reports no render time)'; if (A.ctx && A.mon && A.mon.length > 4) { const a = A.mon[A.mon.length - 1], b = A.mon[A.mon.length - 5]; const wall = (a.wall - b.wall) / 1000, au = a.ct - b.ct; if (wall > 0) load = 'clock ' + Math.round(100 * au / wall) + '% of wall (100 = keeping up)'; }
  return { build: D.BUILD.name + ' (vc ' + D.BUILD.code + ')', fps: D.fps, level: App.level, ohms: cs.length, offScreen: off, voices: `${L.act || 0} modal · ${L.inst || 0} inst · ${L.tract || 0} tract`, stolen: (L.stolen || 0) + (L.instStolen || 0), peak: r2(L.peak), audio: load, mode: A.mode || 'off',
    save: bytes ? (bytes / 1024).toFixed(1) + ' KB (this world)' : 'not saved yet', errors: ((App.stats && App.stats.inputErr) || 0) + ' input · ' + ((App.stats && App.stats.frameErr) || 0) + ' frame' }; };
D.lines = o => Object.entries(o).filter(([k, v]) => v !== undefined && v !== '' && v !== null).map(([k, v]) => k.padEnd(11) + ' ' + v).join('\n');
D.render = () => { if (!D.open || !D.el) return; const App = D.App; let h = ''; try { h = '<b>DEV</b> (hold 3 fingers 2 s to close · tap anything)\n' + (RS.AuraLab ? '<span id="devauralab" style="display:inline-block;margin:2px 0 4px;padding:4px 10px;border:1px solid rgba(200,230,255,.4);border-radius:5px;cursor:pointer">aura showcase (sandbox) &gt;</span>' + (RS.AuraLab.err ? ' ' + esc(RS.AuraLab.err) : '') + '\n' : '') + esc(D.lines(D.health(App))) + '\n\n<b>' + esc(D.sel ? D.sel.type : 'tap something') + '</b>\n' + (D.sel ? esc(D.lines(Object.assign({}, D.sel, { type: undefined }))) : '') + '\n\n<b>last errors</b>\n' + (D.errs.length ? esc(D.errs.slice().reverse().map(e => e.at + ' ' + e.where + ': ' + e.msg).join('\n')) : 'none'); } catch (e) { h = 'dev panel error: ' + esc(e && e.message || e); }
  D.el.innerHTML = h; };
})(typeof window !== 'undefined' ? window : globalThis);
