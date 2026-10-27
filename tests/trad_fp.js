// v0.8b6 tradition fingerprint: every note each tradition's jam generates (seeded scene), hashed per tradition.
// Used by v08y_check to prove the data-driven styles refactor keeps the 14 existing traditions sounding exactly the same.
const T = require('./node_env.js'), RS = global.RS, Tr = RS.Trad, Mi = RS.Mind;
const GS = +(process.env.GSEED || 81);
const fp = (trads, seed = GS) => { RS.idReset(seed); Math.random = RS.rng(RS.hash('mrand', seed)); T.t = 0; const { Sf } = T.scene({ clear: true }); Sf.noSeedItems = Sf.noPatches = true; Sf.mindLog = Sf.mindLog || []; const cx = Sf.view.cx;
  const pick = (f, s0) => { for (let s = s0; ; s += 7) if (f(RS.Genome.express(T.plain(s)).inst)) return s; };
  const band = [pick(I => I.percK > .75, 7000), pick(I => I.percK < .2, 7100), pick(I => I.percK < .2, 7400)].map((sd, i) => T.add(Sf, T.plain(sd), cx - 70 + i * 70)); band.forEach((c, i) => { c.trad = trads[i % trads.length]; });
  const rec = []; const gb = Mi.genBar; Mi.genBar = (S2, m, bar) => { const o = gb(S2, m, bar); if (S2 === Sf && m.E) rec.push([m.c.id, bar, m.role, m.E.trad, m.E.trMeter || '', m.E.sys.name, o.map(q => [q.s, +(q.d || 0).toFixed(3), q.deg, +(q.vel || 0).toFixed(3)].join(',')).join(';')].join('|')); return o; };
  const chs = []; const hp = RS.Harm.prop; RS.Harm.prop = (S2, c, m, ch, bar) => { if (S2 === Sf && m.E) chs.push(bar + ':' + (ch && ch.id)); return hp(S2, c, m, ch, bar); };
  for (let k = 0; k < 90; k++) { T.run(Sf, 1); if (rec.length > 220) break; } Mi.genBar = gb; RS.Harm.prop = hp;
  const s = rec.join('\n') + '\n#' + chs.join(','); return { n: rec.length, h: RS.hash('fp', s).toString(36), trad: (band[0].jam && band[0].jam.E && band[0].jam.E.trad) || null }; };
module.exports = fp;
if (require.main === module) { const out = {}; for (const t of ['western', 'hindustani', 'carnatic', 'maqam', 'gamelan', 'wafrica', 'cuban', 'bossa', 'aksak', 'flamenco', 'japan', 'blues', 'celtic', 'andean']) out[t] = fp([t]); out['mix'] = fp(['hindustani', 'wafrica', 'hindustani']); console.log(JSON.stringify(out)); }
