'use strict';
// v0.6 PAIRINGS near home (#1 carrier & rider, #5 hearing & seeing, #6 cleaner & hoarder, #12 mineral grinders, #15 food web of sound,
// #16 population balance). Every home move is OFF-SCREEN only and stays within Pa.SHIFT (120 px) of the ohm's original home (home00),
// well inside the 190 px leash; nothing here makes an ohm travel. Runs on the symbiosis 1 s tick (Y.tick -> Pa.tick).
(function (G) {
const RS = G.RS, clamp = RS.clamp;
const Pa = RS.Pairs = {};
Pa.SHIFT = 120; Pa.RIDE_HOME = 200; Pa.DB_R = 320; Pa.CLEAN_R = 260; Pa.GRIND_R = 200; Pa.DUST_MAX = 16; Pa.TAIL_R = 320; Pa.SPREAD_R = 250; Pa.SPREAD_COOL = 60;
const live = c => c && !c.dead && !c.caught && !c.leaving && c.mind;
const free = c => !c.jam && !c.partner && !(c.mind && c.mind.E) && !c.grabbed && !c.caught;
const perc = c => (c.mind.perc || 0) > .6;
const gene = (c, k) => RS.GI && RS.GI[k] != null ? c.g[RS.GI[k]] : .5;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const S = c => c.sym || (c.sym = {});
const home = c => c.home0 || c.anchor || [c.x, c.y];
const wrapC = d => { d = ((d % 1200) + 1200) % 1200; return d > 600 ? d - 1200 : d; };
const stat = (Sf, k, n = 1) => { const s = Sf.stats.pairs || (Sf.stats.pairs = {}); s[k] = (s[k] || 0) + n; };
const unseen = (Sf, c) => !(Sf.inView && Sf.inView(c.x, c.y, 120)) && !(RS.Jam && RS.Jam.watched(Sf, c));
// move the true home toward (tx, ty), at most SHIFT from the original home, onto dry, gentle ground; off-screen only
Pa.shiftHome = (Sf, c, tx, ty, why) => { if (!unseen(Sf, c) || c.grabbed || c.caught || c.homeSet || c.called) return false;   /* v0.8b4: a player-set home never shifts */ const P = Sf.P; if (c.home00 && Math.hypot(home(c)[0] - c.home00[0], home(c)[1] - c.home00[1]) > Pa.SHIFT + 40) { c.home00 = null; c.homeWhy = null; }   /* re-homed by the player (dropped / thrown): that is the new original */ const base = c.home00 || home(c); let dx = tx - base[0], dy = ty - base[1]; const d = Math.hypot(dx, dy) || 1; if (d > Pa.SHIFT) { dx *= Pa.SHIFT / d; dy *= Pa.SHIFT / d; }
  const th = P.theta(base[0] + dx, base[1] + dy); if (!P.gas && (P.height(th) < P.sea + 4 || Math.abs(P.height(th + 12 / P.R) - P.height(th - 12 / P.R)) / 24 > .45)) return false;
  const F = Sf.frameAt(th), h = [F.sx + F.ux * 30, F.sy + F.uy * 30]; if (Math.hypot(h[0] - base[0], h[1] - base[1]) > Pa.SHIFT + 35) return false;
  c.home00 = base.slice(); c.home0 = h; c.anchor = h.slice(); c.homeWhy = why; stat(Sf, 'shift_' + why); return true; };
// the tick
Pa.tick = (Sf, tn, cs) => { if (RS.PAIRS6 === false) return; cs = cs || Sf.creatures.filter(live); const byId = new Map(cs.map(c => [c.id, c])); const lastBy = new Map(); for (const q of Sf.recentNotes || []) if (q.lane) lastBy.set(q.lane, q.t);   // lane = the ohm's id
  for (const c of cs) { const s = S(c), m = c.mind;
    // #1 carrier & rider: a small high voice settles beside a big low one (homes within 200 px); it plays on top, in the carrier's key + tempo
    if (RS.Items && RS.Items.smallHigh(c) && free(c)) { let k = byId.get(s.ride); if (k && (!live(k) || Math.hypot(home(k)[0] - home(c)[0], home(k)[1] - home(c)[1]) > Pa.RIDE_HOME + Pa.SHIFT)) { S(k).rider = 0; k = null; s.ride = 0; }
      if (!k) { let bd = Pa.RIDE_HOME; for (const o of cs) if (o !== c && RS.Items.lowDrone(o) && gene(o, 'size') > .5 && !S(o).rider) { const d = Math.hypot(home(o)[0] - home(c)[0], home(o)[1] - home(c)[1]); if (d < bd) { bd = d; k = o; } }
        if (k) { s.ride = k.id; S(k).rider = c.id; stat(Sf, 'ride'); Sf.fx({ k: 'keeperBond', a: k, b: c, dur: 1.2, event: true }); } }
      if (k) { const d = wrapC(k.mind.tonicC - m.tonicC); if (Math.abs(d) > 3) { m.tonicC = Math.round(m.tonicC + d * .3); c.mindTonic = m.tonicC; } if (!c.jam && !m.E) m.bpmT += (k.mind.bpm - m.bpmT) * .2;
        if (dist(c, k) > 90) { const H = home(k), u = Sf.frameAt(Sf.P.theta(H[0], H[1])); Pa.shiftHome(Sf, c, H[0] + u.tx * 50, H[1] + u.ty * 50, 'ride'); }
        if (RS.Items.gain && tn - (lastBy.get(c.id) || -99) < 2) RS.Items.gain(Sf, k, .001, 'rider'); } }
    // #5 hearing & seeing: the deaf one feels the blind one's beat (tempo lock); the blind one hears the deaf one's key (tonic pull)
    if (c.P.sense && c.P.sense.deaf && !c.P.sense.blind && free(c)) { let b = byId.get(s.db); if (b && (!live(b) || dist(b, c) > Pa.DB_R * 1.5)) { S(b).db = 0; b = null; s.db = 0; }
      if (!b) { let bd = Pa.DB_R; for (const o of cs) if (o !== c && o.P.sense && o.P.sense.blind && !o.P.sense.deaf && !S(o).db && free(o)) { const d = dist(o, c); if (d < bd) { bd = d; b = o; } } if (b) { s.db = b.id; S(b).db = c.id; stat(Sf, 'deafBlind'); Sf.fx({ k: 'twinBond', a: c, b, dur: 1.2, event: true }); } }
      if (b) { if (!c.jam && !m.E) { m.bpmT += (b.mind.bpm - m.bpmT) * .5; if (Math.abs(m.bpm - b.mind.bpm) < 1) c.phase = b.phase; } const bm = b.mind, d = wrapC(m.tonicC - bm.tonicC); if (Math.abs(d) > 3 && !b.jam && !bm.E) { bm.tonicC = Math.round(bm.tonicC + d * .3); b.mindTonic = bm.tonicC; } } }
    // #15 food web of sound: hungry, non-percussive ohms feed on other ohms' long note tails nearby; silence makes them rest (never starve)
    if (gene(c, 'hunger') > .6 && !perc(c)) { let n = 0; const L = Sf.recentNotes || []; for (let i = L.length - 1; i >= 0 && n < 6; i--) { const q = L[i]; if (tn - q.t > 3) break; if (q.lane === c.id || q.d < .6 || q.x == null) continue; if (Math.hypot(q.x - c.x, q.y - c.y) < Pa.TAIL_R) n++; }
      if (n) { s.tailT = tn; if (RS.Items && RS.Items.gain) RS.Items.gain(Sf, c, Math.min(.012, .003 * n * Math.min(1, 1.2 - c.energy)), 'tails'); stat(Sf, 'tailFeed'); }
      else if (tn - (s.tailT || 0) > 12 && tn - (s.tailRest || -99) > 12 && !c.jam && !m.E) { m.restLeft = Math.max(m.restLeft || 0, 1); s.tailRest = tn; stat(Sf, 'tailRest'); } } }
  // #6 cleaner & hoarder: a calm, precise ohm near a hoarder's pile restores worn items; the hoarder gives it one in return
  if (RS.Items && Sf.items) for (const h of cs) { if (!h.hoard || !h.hoard.length) continue; for (const uid of h.hoard.slice()) { const it = Sf.items.find(q => q.uid === uid); if (!it) { h.hoard = h.hoard.filter(u => u !== uid); continue; } if (it.wear < .25 && !it.cleanT) continue; const [ix, iy] = RS.Items.pos(Sf, it);
      let cl = null, bd = Pa.CLEAN_R; for (const o of cs) if (o !== h && free(o) && gene(o, 'calm') > .5 && !perc(o)) { const d = Math.hypot(o.x - ix, o.y - iy); if (d < bd) { bd = d; cl = o; } } if (!cl) continue;
      it.wear = clamp(it.wear - .05, 0, 1); it.charge = clamp(it.charge + .03, 0, 1); it.cleanT = tn; stat(Sf, 'clean');
      if (it.wear <= .02) { it.cleanT = 0; if (!cl.item && unseen(Sf, cl) && unseen(Sf, h)) { h.hoard = h.hoard.filter(u => u !== uid); it.owner = null; RS.Items.take(Sf, cl, it); stat(Sf, 'gift'); } } } }
  // #12 mineral grinders: percussive ohms playing near a ringing crystal grind it to dust; dust softens the brightness there and shy ohms settle by it
  const D = Sf.mods.dust || (Sf.mods.dust = []); for (const q of D) q.v = Math.max(0, q.v - .0015);
  const crys = Sf.instruments ? Sf.instruments().filter(b => b.meta && b.meta.role === 'crystal') : [];
  if (crys.length) for (const c of cs) { if (!perc(c) || tn - (lastBy.get(c.id) || -99) > 1.5) continue; for (const b of crys) { const i = b.idx[0], x = Sf.W.x[i], y = Sf.W.y[i]; if (Math.hypot(x - c.x, y - c.y) > Pa.GRIND_R) continue; const th = Sf.P.theta(x, y); let q = D.find(z => Math.abs(wrapC2(z.th - th)) * Sf.P.R < 120); if (!q) { if (D.length >= Pa.DUST_MAX) D.sort((a, b2) => a.v - b2.v).shift(); q = { th: +th.toFixed(5), v: 0 }; D.push(q); } q.v = Math.min(1, q.v + .03); stat(Sf, 'grind'); break; } }
  for (let i = D.length - 1; i >= 0; i--) if (D[i].v <= 0) D.splice(i, 1);
  for (const c of cs) { if (gene(c, 'shyness') < .6 || !free(c) || c.homeWhy === 'dust') continue; const H = home(c); const th = Sf.P.theta(H[0], H[1]); const q = D.find(z => z.v > .4 && Math.abs(wrapC2(z.th - th)) * Sf.P.R < Pa.SHIFT + 60 && Math.abs(wrapC2(z.th - th)) * Sf.P.R > 40); if (q) { const F = Sf.frameAt(q.th); Pa.shiftHome(Sf, c, F.sx + F.ux * 30, F.sy + F.uy * 30, 'dust'); } }
  // #16 population balance: >= 3 of one instrument type within 250 px -> one of them moves its home up to 120 px away from the crowd (off-screen)
  if (tn - (Sf._paSpreadT || -99) > Pa.SPREAD_COOL) for (const c of cs) { if (!free(c) || c.home00 || !c.P.inst) continue; const same = cs.filter(o => o !== c && o.P.inst && o.P.inst.engName === c.P.inst.engName && dist(o, c) < Pa.SPREAD_R); if (same.length < 2) continue;
    if (same.some(o => o.homeWhy === 'spread')) continue; let mx = 0, my = 0; for (const o of same) { mx += o.x; my += o.y; } mx /= same.length; my /= same.length; const H = home(c); let dx = H[0] - mx, dy = H[1] - my; const d = Math.hypot(dx, dy) || 1;
    if (Pa.shiftHome(Sf, c, H[0] + dx / d * Pa.SHIFT, H[1] + dy / d * Pa.SHIFT, 'spread')) { Sf._paSpreadT = tn; stat(Sf, 'spread'); break; } } };
const wrapC2 = a => Math.atan2(Math.sin(a), Math.cos(a));
// brightness softening by dust (#12): a 0..1 factor the creature's voice uses (1 = no dust)
Pa.dustAt = (Sf, x, y) => { const D = Sf.mods && Sf.mods.dust; if (!D || !D.length) return 0; const th = Sf.P.theta(x, y); let v = 0; for (const q of D) { const d = Math.abs(wrapC2(q.th - th)) * Sf.P.R; if (d < 160) v = Math.max(v, q.v * (1 - d / 160)); } return v; };
// cheap speckle band over dusty ground: <= 14 tiny rects per dust site in view, no particles
Pa.draw = (ctx, Sf, t) => { const D = Sf.mods && Sf.mods.dust; if (!D || !D.length) return; for (const q of D) { if (q.v < .08) continue; const F = Sf.frameAt(q.th); if (!Sf.inView(F.sx, F.sy, 160)) continue; ctx.fillStyle = `rgba(214,196,170,${(.18 + .3 * q.v).toFixed(3)})`;
    for (let k = 0; k < 14; k++) { const u = ((RS.hash('dust', k, Math.round(q.th * 1e4)) % 1000) / 1000 - .5) * 220, v = 4 + ((k * 37) % 23) + 3 * Math.sin(t * .6 + k); ctx.fillRect(F.sx + F.tx * u + F.ux * v - 1, F.sy + F.ty * u + F.uy * v - 1, 2, 2); } } };
})(typeof window !== 'undefined' ? window : globalThis);
