const { chromium } = require('playwright');
(async () => { const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const p = await b.newPage({ viewport: { width: 412, height: 860 }, hasTouch: true, isMobile: true });
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message + ' ' + (e.stack || '').split('\n')[1])); p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:' + (process.env.RS_PORT || 8811) + '/index.html?fixed=1'); await p.waitForTimeout(3000);
  const r = await p.evaluate(() => { const A = window.RSAPP; return { level: A.level, frames: A.stats.frames, avgFt: A.avgFt, cr: A.Sf && A.Sf.creatures.length, bodies: A.Sf && A.Sf.W.bodies.size, dom: document.body.querySelectorAll('*').length }; });
  console.log(JSON.stringify(r)); console.log(errs.slice(0, 10).join('\n')); await b.close(); })();
