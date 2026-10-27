'use strict';
// v0.8b5 item gestures + the item CLOSE-UP (4:07-4:11 PM steers). Text-free, 44 px targets, always on screen.
//  CLOSE-UP: zoom in (1.8..4.2) with an item (carried / worn / on the ground) at the middle of the screen and nearer the middle than any ohm
//    -> one ring of control sectors around it (mix, beat division, offset, tone, depth, interval, cents ... per kind, fxkinds.js X.controls).
//    Every value rests on its sync / key point (a notch tick; the handle glows on a notch); drag it off the notch = free time / sync offset /
//    detune. Dragging is magnetic near a notch, release snaps within .05. Values are saved with the item (it.adj, packed).
//  G1: touch a carried / worn item (inside its drawn radius only) and drag it away = take it (you then hold it like any body: release throws).
//  G2: flick a carried / worn item (fast, short) = knock it off; it lands nearby (40-120 px along the flick), never thrown far.
//  G6: two fingers that both START on two different ohms FUSED together (one colony) and spread apart QUICKLY and WIDELY unfuse them along
//    the spread axis (the side of the perpendicular through the start midpoint). Anything else stays the normal pinch / zoom.
(function (G) { const RS = G.RS = G.RS || {}; const TAU = Math.PI * 2, clamp = (v, a, b) => Math.max(a, Math.min(b, v)); const IE = RS.ItemEdit = {};
IE.M = { hit: 22, minR: 46, maxR: 130 };
const X = () => RS.FXK, It = () => RS.Items, S = (App, x, y) => RS.Render.toScreen(App.cam, App.Wd, App.Ht, x, y);
// where an item is right now (world) + its touch radius (world): a carried glyph, a carried piece (its own body) or a free item body
IE.at = (Sf, it) => { const c = it.holder; if (c && !it.piece && RS.Render && RS.Render.itemAt) { const q = RS.Render.itemAt(c, it); return [q[0], q[1], q[2]]; } if (it.b && Sf.W.bodies.has(it.b.id)) { const q = Sf.W.center(it.b); return [q[0], q[1], it.piece ? clamp((it.span || 20) * .5, 8, 40) : (it.R || 10)]; } return [it.x, it.y, it.R || 10]; };
// G1/G2 hit: a carried / worn item (not swallowed: it is inside the ohm) whose drawn radius contains the touch (min 6 screen px)
IE.hitCarried = (App, wx, wy) => { const Sf = App.Sf; if (!Sf || !It()) return null; let best = null, bd = 1e9; for (const it of Sf.items || []) { const c = it.holder; if (!c || c.dead || it.mode === 'swallow' || it.mode === 'nest') continue; const q = IE.at(Sf, it), d = Math.hypot(q[0] - wx, q[1] - wy), r = Math.max(q[2], 6 / App.cam.z); if (d <= r && d < bd) { bd = d; best = { it, c }; } } return best; };
IE.take = (Sf, it, w) => { const c = it.holder; if (!c) return false; It().drop(Sf, c, true); it.free = Sf.now() + 8; if (!it.piece) It().place(Sf, it, w[0], w[1]); Sf.stats.itemsTaken = (Sf.stats.itemsTaken || 0) + 1; Sf.fx({ k: 'itemShare', a: c, b: c, col: It().COL[it.kind], dur: .6 }); const p = it.piece ? IE.at(Sf, it) : w; return !!Sf.grabStart(p[0], p[1]); };
IE.knock = (Sf, it, vx, vy) => { const c = it.holder; if (!c) return null; const q = IE.at(Sf, it), m = Math.hypot(vx, vy) || 1, dist = clamp(40 + m / 30, 40, 120); let x = q[0] + vx / m * dist, y = q[1] + vy / m * dist; It().drop(Sf, c, true); it.free = Sf.now() + 6; if (Sf.surfAt) { const g = Sf.surfAt(x, y, (it.R || 10) + 2); if (g && Number.isFinite(g[0])) { x = g[0]; y = g[1]; } }
  if (!it.piece) It().place(Sf, it, x, y); Sf.stats.itemsKnocked = (Sf.stats.itemsKnocked || 0) + 1; Sf.fx({ k: 'itemSteal', c, col: It().COL[it.kind], dur: .8 }); return [x, y]; };
IE.FLICK = { v: 650, maxMs: 260, minPx: 24 };   // screen px/s, ms, px
// ---------------- close-up ----------------
IE.safe = App => RS.EnvEdit ? RS.EnvEdit.safe(App) : { x0: 28, x1: App.Wd - 28, y0: 30, y1: App.Ht - 58, cx: App.Wd / 2, cy: (App.Ht - 28) / 2 };
IE.room = (App, s) => { const B = IE.safe(App); return Math.min(s[0] - B.x0, B.x1 - s[0], s[1] - B.y0, B.y1 - s[1]); };
IE.pick = App => { const Sf = App.Sf, cam = App.cam; if (App.level !== 'surface' || !Sf || !It() || !X() || App.play || cam.z < 1.8 || cam.z > 4.2) return null; const B = IE.safe(App), mid = s => Math.min(Math.hypot(s[0] - B.cx, s[1] - B.cy), Math.hypot(s[0] - App.Wd / 2, s[1] - App.Ht * .58));
  let oh = 1e9; for (const c of Sf.creatures) { if (c.dead || c.caught) continue; const s = S(App, c.x, c.y); oh = Math.min(oh, mid(s)); }
  const ok = it => it && (Sf.items || []).includes(it) && it.mode !== 'swallow' && it.mode !== 'nest';
  const cur = App.itemSel; if (ok(cur)) { const q = IE.at(Sf, cur), s = S(App, q[0], q[1]); if (mid(s) < 140 && IE.room(App, s) - 26 >= IE.M.minR) return cur; }
  let best = null, bd = 60; for (const it of Sf.items || []) { if (!ok(it)) continue; const q = IE.at(Sf, it), s = S(App, q[0], q[1]), d = mid(s); if (d < bd && d < oh - 20 && IE.room(App, s) - 26 >= IE.M.minR) { bd = d; best = it; } } return best; };
IE.layout = (App, it) => { const q = IE.at(App.Sf, it), s = S(App, q[0], q[1]), ctl = X().controls(it), n = ctl.length, R = clamp(IE.room(App, s) - 26, IE.M.minR, IE.M.maxR), a0 = -Math.PI / 2 - TAU * 150 / 360, span = TAU * 300 / 360 / n;
  return { s, R, ctl, n, a0, span, ri: Math.max(14, q[2] * App.cam.z + 6) }; };
IE.angOf = (L, k, u) => L.a0 + (k + .1 + clamp(u, 0, 1) * .8) * L.span;
IE.hpos = (L, k, u) => { const a = IE.angOf(L, k, u); return [L.s[0] + Math.cos(a) * L.R, L.s[1] + Math.sin(a) * L.R]; };
// hit a handle (44 px target) or anywhere along a sector's arc band (drag from there)
IE.hit = (App, sx, sy) => { const it = App.itemSel; if (!it) return null; const L = IE.layout(App, it), Sf = App.Sf; let best = null, bd = IE.M.hit; L.ctl.forEach((k, i) => { const p = IE.hpos(L, i, X().val(Sf, it, k)), d = Math.hypot(p[0] - sx, p[1] - sy); if (d < bd) { bd = d; best = { k, i }; } }); if (best) return best;
  const r = Math.hypot(sx - L.s[0], sy - L.s[1]); if (Math.abs(r - L.R) > IE.M.hit) return null; let a = Math.atan2(sy - L.s[1], sx - L.s[0]) - L.a0; a = ((a % TAU) + TAU) % TAU; const i = Math.floor(a / L.span); return i >= 0 && i < L.n ? { k: L.ctl[i], i } : null; };
IE.drag = (App, h, sx, sy, rel) => { const it = App.itemSel; if (!it || !h) return null; const L = IE.layout(App, it); let a = Math.atan2(sy - L.s[1], sx - L.s[0]) - L.a0; a = ((a % TAU) + TAU) % TAU; const u = (a / L.span - h.i - .1) / .8, v = X().set(App.Sf, it, h.k, clamp(u, 0, 1), rel); IE.dirty(App.Sf, it); return v; };
IE.dirty = (Sf, it) => { if (it.holder) it.holder._fxKey = null; Sf.itemsDirty = true; };
IE.release = (App, h, sx, sy) => { const v = IE.drag(App, h, sx, sy, true), it = App.itemSel, c = it && it.holder; if (c && It()) It().slots(App.Sf); if (c && RS.EnvEdit && c.mind) RS.EnvEdit.note(App.Sf, c); App.lastItemEdit = { k: h.k, v }; return v; };
IE.ease = (App, it, k) => { const q = IE.at(App.Sf, it), B = IE.safe(App), w = RS.Render.toWorld(App.cam, App.Wd, App.Ht, B.cx, B.cy); App.cam.x += (q[0] - w[0]) * k; App.cam.y += (q[1] - w[1]) * k; };
// text-free control icons (screen px)
IE.icon = (ctx, k, x, y, s, it) => { ctx.beginPath(); switch (k) {
  case 'mix': ctx.arc(x - s * .3, y, s * .5, 0, TAU); ctx.moveTo(x + s * .8, y); ctx.arc(x + s * .3, y, s * .5, 0, TAU); break;   // dry + wet overlap
  case 'div': for (let j = 0; j < 4; j++) { ctx.moveTo(x - s * .75 + j * s * .5 + 2, y); ctx.arc(x - s * .75 + j * s * .5, y, 2, 0, TAU); } break;   // beats
  case 'off': for (let j = 0; j < 3; j++) { ctx.moveTo(x - s * .7 + j * s * .6, y + s * .5); ctx.lineTo(x - s * .7 + j * s * .6, y - s * .5); } ctx.moveTo(x - s * .4, y - s * .7); ctx.lineTo(x - s * .4, y + s * .7); break;   // grid + shifted tick
  case 'tone': ctx.moveTo(x - s, y + s * .5); ctx.lineTo(x - s * .2, y + s * .5); ctx.lineTo(x + s, y - s * .6); break;   // tilt (dark .. bright)
  case 'depth': for (let j = 0; j <= 16; j++) { const u = j / 16, xx = x - s + u * 2 * s, yy = y + Math.sin(u * TAU * 1.5) * s * .6 * u; j ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); } break;   // growing wave
  case 'cents': ctx.moveTo(x - s * .4, y + s * .7); ctx.lineTo(x - s * .4, y - s * .4); ctx.moveTo(x + s * .4, y + s * .7); ctx.lineTo(x + s * .4, y - s * .4); ctx.moveTo(x - s * .4, y + s * .7); ctx.lineTo(x + s * .4, y + s * .7); ctx.moveTo(x, y + s * .7); ctx.lineTo(x, y + s); break;   // tuning fork
  case 'iv': ctx.moveTo(x - s * .4 + 3, y + s * .4); ctx.arc(x - s * .4, y + s * .4, 3, 0, TAU); ctx.moveTo(x + s * .4 + 3, y - s * .4); ctx.arc(x + s * .4, y - s * .4, 3, 0, TAU); ctx.moveTo(x - s * .4, y + s * .4); ctx.lineTo(x + s * .4, y - s * .4); break;   // two stacked notes
  } ctx.stroke(); };
IE.draw = (ctx, App) => { const it = App.itemSel, Sf = App.Sf; if (!it || !X()) return; const L = IE.layout(App, it), css = RS.Render.css, col = (It().COL[it.kind]) || [220, 220, 255], t = performance.now() / 1000, act = App.itemAct || null, dpr = App.dpr || 1;
  ctx.save(); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); RS.Render.tag && RS.Render.tag(ctx, 'item', 0);
  ctx.strokeStyle = css(col, .25); ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(L.s[0], L.s[1], L.ri, 0, TAU); ctx.stroke();
  L.ctl.forEach((k, i) => { const a1 = IE.angOf(L, i, 0), a2 = IE.angOf(L, i, 1), u = X().val(Sf, it, k), on = X().onNotch(Sf, it, k), hot = act && act.k === k;
    ctx.lineCap = 'round'; ctx.strokeStyle = css(col, .22); ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(L.s[0], L.s[1], L.R, a1, a2); ctx.stroke();
    // value arc from the home / notch point to the value
    const h = X().home(Sf, it, k); ctx.strokeStyle = css(col, on ? .35 : .7); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(L.s[0], L.s[1], L.R, Math.min(IE.angOf(L, i, h), IE.angOf(L, i, u)), Math.max(IE.angOf(L, i, h), IE.angOf(L, i, u)) + 1e-3); ctx.stroke();
    // notches (sync / key points): ticks across the band
    for (const nu of X().notches(Sf, it, k)) { const a = IE.angOf(L, i, nu), big = Math.abs(nu - h) < 1e-3; ctx.strokeStyle = css([255, 250, 220], big ? .8 : .45); ctx.lineWidth = big ? 2 : 1.2; ctx.beginPath(); ctx.moveTo(L.s[0] + Math.cos(a) * (L.R - (big ? 11 : 7)), L.s[1] + Math.sin(a) * (L.R - (big ? 11 : 7))); ctx.lineTo(L.s[0] + Math.cos(a) * (L.R + (big ? 11 : 7)), L.s[1] + Math.sin(a) * (L.R + (big ? 11 : 7))); ctx.stroke(); }
    // handle: glows when it rests on a notch (in sync / in key); a hollow ring when free / detuned
    const p = IE.hpos(L, i, u), rr = hot ? 13 : 10; if (on) { ctx.fillStyle = css([255, 250, 220], .18 + .1 * Math.sin(t * 4)); ctx.beginPath(); ctx.arc(p[0], p[1], rr + 8, 0, TAU); ctx.fill(); }
    ctx.fillStyle = css(on ? [255, 250, 225] : col, on ? .95 : .35); ctx.strokeStyle = css(col, .95); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p[0], p[1], rr, 0, TAU); ctx.fill(); ctx.stroke();
    // icon inside the ring at the sector's middle
    const am = (a1 + a2) / 2, ir = Math.max(L.ri + 12, L.R - 30); ctx.strokeStyle = css(col, hot ? .95 : .65); ctx.lineWidth = 1.5; IE.icon(ctx, k, L.s[0] + Math.cos(am) * ir, L.s[1] + Math.sin(am) * ir, 8, it); });
  ctx.restore(); };
// ---------------- G6: unfuse two fused ohms with a quick, wide two-finger spread ----------------
// Wilbow 4:54 + 4:55 PM: 'group' = ohms FUSED together (one colony). Jams, clusters-by-style and herds are not split. Only a QUICK, WIDE spread
// counts (finger separation grows by >= IE.SPREAD_PX within IE.SPREAD_MS); slow or small moves keep the old squeeze / DNA spread / zoom.
IE.groupOf = (Sf, a, b) => (a && b && a !== b && a.cluster && a.cluster === b.cluster ? { k: 'cluster', g: a.cluster } : null);
IE.SPREAD_PX = 120; IE.SPREAD_MS = 350;
IE.quick = (d0, d1, ms) => d1 - d0 >= IE.SPREAD_PX && ms <= IE.SPREAD_MS;
IE.split = (Sf, grp, p0, p1, members) => { const mx = (p0[0] + p1[0]) / 2, my = (p0[1] + p1[1]) / 2, ax = p1[0] - p0[0], ay = p1[1] - p0[1], side = c => ((c.x - mx) * ax + (c.y - my) * ay) >= 0 ? 1 : 0;
  if (!grp || grp.k !== 'cluster' || !RS.Colony) return null;
  const K = RS.Colony, cl = grp.g, W = Sf.W, mem = (members || cl.members).filter(c => c && !c.dead), B = mem.filter(c => side(c)), A = mem.filter(c => !side(c)); if (!A.length || !B.length) return null;
  const inB = new Set(B.map(c => c.id)), keep = []; let cut = 0; for (const L of cl.links) { if (inB.has(L.a) !== inB.has(L.b)) { if (L.s >= 0) W.sk[L.s] = 0; cut++; } else keep.push(L); } W.compact();
  const la = keep.filter(L => !inB.has(L.a)), lb = keep.filter(L => inB.has(L.a)), nb = { id: RS.ID_SEED != null ? 'k' + RS.newId().slice(1) : 'k' + Date.now().toString(36) + Math.floor(Math.random() * 1e4), members: B, links: lb, style: cl.style, plan: null, built: 0 };
  cl.members = A; cl.links = la; Sf.clusters = (Sf.clusters || []).filter(q => q !== cl);
  for (const q of [cl, nb]) { if (q.members.length < 2) { for (const m of q.members) m.cluster = null; continue; } for (const m of q.members) m.cluster = q; K.reindex(Sf, q); K.caps(Sf, q); Sf.clusters.push(q); }
  if (K.markApart) K.markApart(Sf, A, B);   // no re-fuse across the cut for K.REFUSE s, then normal
  const d = W.dt || 1 / 120, La = Math.hypot(ax, ay) || 1, push = 70 * d; for (const [sd, sg] of [[A, -1], [B, 1]]) for (const c of sd) for (const bb of c.segs || []) for (const i of bb.idx) { W.px[i] -= ax / La * push * sg; W.py[i] -= ay / La * push * sg; }
  Sf.stats.groupSplits = (Sf.stats.groupSplits || 0) + 1; Sf.fx({ k: 'separate', x: mx, y: my, dur: 1, force: true }); return { k: 'cluster', a: A.length, b: B.length, cut }; };
})(typeof window !== 'undefined' ? window : globalThis);
