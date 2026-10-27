// v0.3.2 lean headless check: pads / harmony never play melody bars; real modulation (consensus cue, pivot, key area, home); #4 over V/V.
const T = require('./node_env.js'); for (const m of ['store', 'render', 'daw', 'dna']) require('../www/js/' + m + '.js');
const H = RS.Harm, Co = RS.Cohere, res = []; const ok = (n, p, i) => { res.push(!!p); console.log((p ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const md = (a, n) => ((a % n) + n) % n;
const ONLY = process.env.ONLY || '';
if (!ONLY || ONLY === 'mod') {
const SEED = +(process.env.SEED || 0);
const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.mindLog = Sf.mindLog || [];
const place = (seed, x, y) => { const c = T.add(Sf, T.plain(seed), x); if (y != null) c.y = y; return c; };
const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(RS.Genome.express(T.plain(s)).inst)) return s; };
const cx = Sf.view.cx, cy = Sf.view.cy || 400; H.log = [];
const dr = pick(I => I.percK > .75, 7000 + SEED), tn = [7100, 7400, 7800, 8200].map(s => pick(I => I.percK < .2, s + SEED));
const cs = [place(dr, cx - 90, cy), place(tn[0], cx, cy + 40), place(tn[1], cx + 90, cy), place(tn[2], cx + 30, cy - 60), place(tn[3], cx - 40, cy - 70)];
T.run(Sf, 1); for (const c of cs) { c.wander = 0; c.mind.creat = Math.max(c.mind.creat || 0, .7); if (c.mind.hb) c.mind.hb.st = H.style(c.mind); }
const E0 = () => cs.map(c => c.mind.E).find(Boolean); let padBad = 0, padN = 0, lastLen = 0; const notes = [];
T.run(Sf, +(process.env.SECS || 420), () => { const E = E0(); if (!E) return; if (E.keyV === undefined) {}
  const L = Sf.mindLog; for (let k = lastLen; k < L.length; k++) { const r = L[k]; if (!r.c || !r.c.mind || r.c.mind.E !== E || r.manual || r.perc || !r.f) continue; notes.push({ t: r.t, c: r.c, f: r.f, role: r.c.mind.role, ka: E.keyArea ? E.keyArea : null, ch: E.propChord }); } lastLen = L.length; });
const ev = k => H.log.filter(e => e.k === k), E = E0();
ok('a key change was planned by consensus (lead cue "key")', ev('modPlan').length >= 1 && H.log.some(e => e.k === 'cue' && e.cue === 'key'), { plans: ev('modPlan').map(e => e.to), vote: E && E.modVote });
ok('a pivot chord led into the new key', ev('pivot').length >= 1, ev('pivot').map(e => e.id));
ok('the band entered the key area', ev('modulate').length >= 1, ev('modulate').map(e => e.to));
ok('... and came home (home dominant, back to A)', ev('home').length >= 1 && ev('pivotHome').length >= 1, { home: ev('home').length });
const S = E && E.sys, P = S ? S.period || 1200 : 1200, base = E ? RS.Mind.tonicHz(Sf, E.lead.mind) : 1;
const fits = (n, cents) => { const cc = md(1200 * Math.log2(n.f / base), P); return cents.some(x => Math.abs(md(cc - x + P / 2, P) - P / 2) < 35); };
const inK = notes.filter(n => n.ka), keyScale = ka => { const al = H.keyChords(S, ka.to).alt; return S.cents.map((c, d) => md(c + (al[d] || 0), P)); };
const fitK = inK.filter(n => fits(n, keyScale(n.ka)) || (n.ch && fits(n, n.ch.cents))).length / Math.max(1, inK.length);
ok('notes in the key area fit the NEW key (scale + chord)', inK.length > 20 && fitK > .85, { n: inK.length, fit: +fitK.toFixed(2) });
const after = notes.filter(n => ev('home').length && n.t > ev('home')[0].t + 4 && !n.ka), fitH = after.filter(n => fits(n, S.cents) || (n.ch && fits(n, n.ch.cents))).length / Math.max(1, after.length);
ok('after coming home the notes fit the home key again', after.length > 10 && fitH > .85, { n: after.length, fit: +fitH.toFixed(2) });
ok('the jam stayed settled through the key change', E && E.phase === 'settled' && !ev('unsettled').length, { phase: E && E.phase });
}
// V/V: a melody note on scale degree 4 (index 3) is raised by the chord's implied alteration
if (!ONLY || ONLY === 'vv') { const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = true; const a = T.add(Sf, T.plain(7100), 300), b = T.add(Sf, T.plain(7400), 360); T.run(Sf, 2);
  const m = a.mind; let res4 = null; const E = { sys: m.sys, members: [a, b], prop: b, tonicC: 0 }; m.E = E; H.init(Sf, m, E); const mj = m.E.sys.cents.length === 7 && H.mode(m.E.sys) === 'major';
  m.hb.V['V/V'] = m.hb.V['V/V'] || null; const vv = m.hb.V['V/V'] || (H.vocab(m.E.sys, { sec: 1, bor: 0 }))['V/V'];
  if (vv) { m.hb.cur = vv; m.hb.conf = 1; m.E.prop = b; m.role = 'melody'; const o = H.bind(Sf, a, m, { deg: 3, pos: 2, d: 1, vel: .7 }); res4 = o.f ? Math.round(1200 * Math.log2(o.f / RS.Mind.hz(Sf, m, 3))) : 0; }
  ok('melody over V/V takes the raised 4th', !mj || res4 === 100, { major: mj, cents: res4 }); }
// pads / the harmony role never play a melody bar
if (!ONLY || ONLY === 'pad') { const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = true; let pad = null, s = 300; for (; s < 9000; s += 13) { const g = T.plain(s), P = RS.Genome.express(g); if (RS.Inst.isTex(P.inst)) { pad = s; break; } }
  const a = T.add(Sf, T.plain(pad), 300), b = T.add(Sf, T.plain(7100), 380); T.run(Sf, 2); ok('a pad voice is recognised as a pad', Co.isPad(a), { att: a.P.inst.att, sus: a.P.inst.sus });
  const E = { members: [a, b], phase: 'seeking', sys: a.mind.sys }; a.mind.E = b.mind.E = E; Co.roles(Sf, E, true); ok('with a singer present the pad never takes the melody', a.mind.role !== 'melody' && b.mind.role === 'melody', { pad: a.mind.role, other: b.mind.role });
  let bad = 0, tot = 0; for (const role of ['harmony', 'counter', 'answer', 'melody']) { a.mind.role = role; a.mind.E = null; a.mind.c = a; const ph = a.mind.phrase; for (let bar = 0; bar < 8; bar++) { const o = RS.Mind.genBar0(Sf, a.mind, bar) || []; tot += o.length; bad += o.filter(x => !x.chordTone && !x.back && !x.pad).length; } }
  ok('a pad in harmony / counter / answer / melody roles holds chord tones only', bad === 0 && tot > 0, { bad, tot });
  b.mind.role = 'harmony'; b.mind.E = null; let hb = 0, ht = 0; for (let bar = 0; bar < 8; bar++) { const o = RS.Mind.genBar0(Sf, b.mind, bar) || []; ht += o.length; hb += o.filter(x => !x.chordTone && !x.back && !x.pad).length; } ok('the harmony role (non-pad) also holds chord tones, never a line', hb === 0 && ht > 0, { hb, ht }); }
if (!ONLY || ONLY === 'body') {   // v0.3.2 body plans
  const Gn = RS.Genome, B = RS.Body, cnt = {}, byLook = {}; let soundChg = 0;
  for (let s = 0; s < 400; s++) { const g = Gn.random(9000 + s), P = Gn.express(g), b = P.body; cnt[b.plan] = (cnt[b.plan] || 0) + 1; (byLook[b.look] = byLook[b.look] || []).push(b);
    const sv = RS.Body; RS.Body = null; const P0 = Gn.express(g); RS.Body = sv; if (P0.f0 !== P.f0 || JSON.stringify(P0.inst) !== JSON.stringify(P.inst) || P0.size !== P.size) soundChg++; }
  ok('all seven body plans occur, none dominates', B.PLANS.every(p => cnt[p] >= 8) && Math.max(...Object.values(cnt)) < 400 * .4, cnt);
  ok('body plans never change sound (f0, instrument, size)', soundChg === 0, { soundChg });
  const fr = (L, f) => (byLook[L] || []).filter(f).length / Math.max(1, (byLook[L] || []).length), has = k => b => b.app.some(x => x.k === k);
  ok('roles read from the body: kicks are drum-bellies, hats spiky, snares carry feelers, pads fronds, basses a keel', fr('kick', b => b.plan === 'drum-belly') > .9 && fr('hat', has('spikes')) === 1 && fr('snare', has('feelers')) === 1 && fr('pad', has('fronds')) === 1 && fr('bass', has('keel')) === 1, { kick: fr('kick', b => b.plan === 'drum-belly'), hat: fr('hat', has('spikes')) });
  const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; let typed = 0, lim = 0, drawErr = 0, calls = 0; const plans = {};
  const ctx = new Proxy({}, { get: (o, k) => k in o ? o[k] : (() => { calls++; }), set: (o, k, v) => { o[k] = v; return true; } });
  for (let s = 0; s < 160 && Object.keys(plans).length < 7; s++) { const g = Gn.random(9500 + s), P = Gn.express(g); if (plans[P.body.plan]) continue; const c = T.add(Sf, g, Sf.view.cx + (Object.keys(plans).length - 3) * 120); plans[P.body.plan] = c;
    for (const r of c.limbs) { lim++; if (r.meta && r.meta.kind) typed++; } try { c.pulseT = Sf.now(); RS.Body.draw(ctx, Sf, c, (x, a) => '', [1, 1, 1], [1, 1, 1], 1); for (const r of c.limbs) RS.Body.limbTip(ctx, Sf, c, r, (x, a) => '', [1, 1, 1], [1, 1, 1], 1); } catch (e) { drawErr++; console.log(e.stack); } }
  ok('hatched bodies have typed physical limbs and every plan draws its appendages', typed === lim && drawErr === 0 && calls > 50 && Object.keys(plans).length === 7, { typed, lim, drawErr, calls, plans: Object.keys(plans) });
  const mk = (plan, kind) => ({ P: { body: { plan } }, limbs: [{ meta: { kind } }, { meta: { kind } }] });
  ok('movement follows the plan (strider walks, serpent swims, drum-belly heavy)', B.move(mk('strider', 'leg'), false, true).k > B.move(mk('blob', 'arm'), false, true).k && B.move(mk('serpent', 'fin'), true, false).k > B.move(mk('blob', 'arm'), true, false).k && B.move(mk('drum-belly', 'leg'), false, true).k < 1);
  const sv2 = RS.Genome.express(Gn.random(9001)); ok('limb kind follows where it sits (down legs, up feelers)', B.limbKind({ plan: 'blob' }, Math.PI / 2) === 'leg' && B.limbKind({ plan: 'blob' }, -Math.PI / 2) === 'feeler' && B.limbKind({ plan: 'serpent' }, 0) === 'fin', sv2.body.plan);
}
const pass = res.filter(Boolean).length; console.log(`${pass}/${res.length} passed`); process.exit(pass === res.length ? 0 : 1);
