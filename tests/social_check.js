// lean check: v0.3 behaviours (sleep, curiosity, shy/bold, favourites/rivals, mourning, parenting, ground tapping) + the jam-seed snapshot hook.
const T = require('./node_env.js'); let pass = 0, tot = 0; const ok = (n, c, i) => { tot++; if (c) pass++; console.log((c ? 'ok   ' : 'FAIL ') + n + (i !== undefined ? '  ' + JSON.stringify(i) : '')); };
const So = RS.Social, Mi = RS.Mind; const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.stats = Sf.stats || {};
const a = T.add(Sf, T.plain(11), -60), b = T.add(Sf, T.plain(12), 60); T.run(Sf, 1); [a, b].forEach(c => Mi.ensure ? Mi.ensure(Sf, c) : null);
const m = a.mind; a.doze = true; const hum = So.shapeBar(Sf, m, 0, [{ s: 0, d: 2, deg: 3, vel: .6 }]); ok('SLEEP a dozing creature hums a soft low drone in its own scale', hum.length === 1 && hum[0].hum && hum[0].vel < .2 && Number.isInteger(hum[0].deg), hum);
b.bond = null; a.bond = b.id; So.heard(Sf, a, { c: b, f: 0, vel: .6 }); ok('SLEEP it wakes when a bonded / liked creature plays', !a.doze && a.wokeT != null);
a.bond = null; const c = T.add(Sf, T.plain(13), 0); T.run(Sf, .5); a.g[RS.GI.curiosity] = .9; a.known = { [b.id]: 1 }; a.curious = null; a.copied = 0; const th = Mi.tonicHz(Sf, m), deg = d => th * Math.pow(2, m.sys.cents[d % m.sys.cents.length] / 1200);
[0, 2, 1, 3, 2].forEach(d => So.heard(Sf, a, { c, f: deg(d), vel: .6 })); ok('CURIOSITY a novel voice is approached and a phrase copied into the learned motif', a.copied === 1 && (a.motif || []).slice(-4).join() === '0,2,1,3', a.motif);
const shy = T.add(Sf, T.plain(14), 200), bold = T.add(Sf, T.plain(15), 260); shy.g[RS.GI.shyness] = 1; shy.g[RS.GI.bold] = 0; bold.g[RS.GI.bold] = 1; bold.g[RS.GI.shyness] = 0; T.run(Sf, .6);
const bars = cr => { let n = 0; for (let k = 0; k < 20; k++) n += So.shapeBar(Sf, cr.mind, k, [0, 1, 2, 3, 4, 5].map(s => ({ s, d: 1, deg: s, vel: .5 }))).length; return n; };
ok('SHY/BOLD shy is quieter + sparser, bold louder + fuller; neither mutes', So.gain(shy) < So.gain(bold) && bars(shy) < bars(bold) && bars(shy) > 20, [So.gain(shy), So.gain(bold), bars(shy), bars(bold)]);
for (let k = 0; k < 8; k++) So.exchange(Sf, a, b, .8, false); for (let k = 0; k < 8; k++) So.exchange(Sf, a, c, .2, true); a.parentId = null; a.youngT = null; a.curious = null;
c.x = a.x + 50; c.y = a.y; const g1 = So.goal(Sf, a); ok('GRUDGES a favourite is sought and a nearby rival drifted from (persisted)', a.rel[b.id] > .3 && a.rel[c.id] < -.3 && g1 && g1.away && JSON.parse(JSON.stringify(RS.Creature.serial(a))).rel[b.id] > .3, [a.rel, g1]);
a.bond = b.id; RS.Farewell.go ? null : null; So.onDelete(Sf, b); ok('MOURNING deleting a bonded partner starts a slow, sparse lament; undo stops it', !!a.mourn && So.shapeBar(Sf, m, 1, [0, 1, 2, 3].map(s => ({ s, d: 1, deg: s, vel: .5 }))).length === 2, a.mourn);
So.onRestore(Sf, b.id); ok('MOURNING undo of the deletion ends the lament', !a.mourn);
const kid = T.add(Sf, T.plain(16), 100); T.run(Sf, .5); So.onHatch(Sf, kid, [a.id]); const code0 = kid.code; const mo = [0, 1, 2, 3, 4, 3, 2, 1].map((d, s) => ({ s, d: 1, deg: d, vel: .5 }));
const errs = () => So.shapeBar(Sf, kid.mind, 3, mo.map(n => Object.assign({}, n))).reduce((e, n, i) => e + (n.deg !== mo[i].deg) + Math.abs(n.s - mo[i].s), 0); let e0 = 0, e1 = 0; for (let q = 0; q < 6; q++) e0 += errs(); kid.youngT = Sf.now() - So.YOUNG * .95; for (let q = 0; q < 6; q++) e1 += errs();
ok('PARENTING offspring follow the parent and practise its motif imperfectly, corrected with age; genome exact', So.goal(Sf, kid) && e0 > e1 && kid.code === code0, [e0, e1]);
const dr = shy; dr.mind.perc = .9; const gx = dr.x + 40, gy = dr.y; let cell = null; for (let k = 0; k < 4; k++) { cell = So.groundTap(Sf, gx, gy) || cell; T.run(Sf, .3); }
ok('GROUND TAPPING >= 3 rhythmic taps on empty ground -> a percussive neighbour adopts the rhythm cell', cell && cell.length >= 3 && dr.tapCell === cell && So.drumExtra(dr.mind, []).length === cell.length, cell);
const j = { leader: a, members: [a, kid], coh: .8 }; const sn = JSON.parse(JSON.stringify(RS.Jam.snapshot(Sf, j)));
ok('JAM SEED HOOK the jam snapshot is serialisable: participants, roles, key, tempo, motifs, voices', sn.members.length === 2 && sn.key.cents.length && sn.bpm > 0 && Array.isArray(sn.members[0].motif) && sn.members[0].code, Object.keys(sn));
console.log(`social ${pass}/${tot}`);
