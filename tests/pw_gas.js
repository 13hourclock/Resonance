// v0.6 cloud worlds in the real app: a new giant is a cloud world, it stays a cloud world after save + re-entry, a giant saved before v0.6 (no mods.cloud in its save) stays solid. Page errors = fail.
const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.waitForTimeout(4000);
  const r = await p.evaluate(async () => { const A = window.RSAPP, RS = window.RS, out = {}; let gi = null;
    for (let i = 0; i < 40 && !gi; i++) { const S = A.system(i); const bd = S.bodies.filter(x => x.type === 'gas' || x.type === 'ringed'); if (bd.length >= 2) gi = { i, a: bd[0], b: bd[1] }; }
    if (!gi) return { err: 'no system with two giants' };
    const S = A.system(gi.i), ka = A.surfKey(S, gi.a), kb = A.surfKey(S, gi.b); RS.Store.raw.set && 0;
    A.enterSurface(gi.i, gi.a); await new Promise(r => setTimeout(r, 1500)); out.first = { gas: !!A.Sf.P.gas, cloud: A.Sf.mods.cloud };
    A.save(); A.enterSurface(gi.i, gi.b); await new Promise(r => setTimeout(r, 500)); A.enterSurface(gi.i, gi.a); await new Promise(r => setTimeout(r, 1500)); out.again = { gas: !!A.Sf.P.gas, cloud: A.Sf.mods.cloud };
    A.save(); const d = RS.Store.get(kb) || {}; d.mods = Object.assign({}, d.mods); delete d.mods.cloud; if (A.meta.mods[kb]) delete A.meta.mods[kb].cloud; d.v = 1; RS.Store.set(kb, d); out.pre = (s => s ? { has: 1, mc: s.mods && s.mods.cloud, mk: Object.keys(s.mods || {}).join() } : null)(RS.Store.get(kb)); out.meta = JSON.stringify(A.meta.mods[kb]); A.enterSurface(gi.i, gi.b); await new Promise(r => setTimeout(r, 1500)); out.legacy = { gas: !!A.Sf.P.gas, cloud: A.Sf.mods.cloud };
    out.ft = A.avgFt; return out; });
  const ok = !r.err && r.first.gas && r.again.gas && !r.legacy.gas && !errs.length;
  console.log((ok ? 'ok   ' : 'FAIL ') + 'GAS cloud world persists across save + re-entry; a pre-v0.6 giant save stays solid; no page errors', JSON.stringify(r), errs.slice(0, 3).join(' | ')); await b.close(); process.exit(ok ? 0 : 1); })();
