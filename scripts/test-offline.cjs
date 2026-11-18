// Verifies manifest + service worker + offline navigation against `vite preview`.
const { chromium } = require('playwright');
(async () => {
  const base = process.env.BASE || 'http://localhost:4173/';
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 412, height: 915 } });
  const p = await ctx.newPage();
  await p.goto(base);
  const manifest = await p.evaluate(async () => {
    const href = document.querySelector('link[rel=manifest]')?.getAttribute('href');
    const m = await (await fetch(href)).json();
    return { href, name: m.name, display: m.display, icons: m.icons.map((i) => `${i.sizes}${i.purpose ? ' ' + i.purpose : ''}`), theme: m.theme_color };
  });
  await p.evaluate(() => navigator.serviceWorker.ready);
  await p.reload();
  await p.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  await ctx.setOffline(true);
  const results = {};
  for (const r of ['/', '/nadi', '/prana', '/3d', '/library', '/library/prasna-upanishad', '/settings']) {
    await p.goto(base + '#' + r);
    await p.reload();
    await p.waitForTimeout(r === '/3d' ? 2500 : 1000);
    results[r] = await p.evaluate(() => ({ h1: document.querySelector('h1')?.textContent?.trim(), offlinePill: document.body.innerText.includes('Offline'), canvas: !!document.querySelector('canvas') }));
  }
  await p.screenshot({ path: process.argv[2] || 'offline.png' });
  console.log(JSON.stringify({ manifest, controlled: true, offline: results }, null, 1));
  await b.close();
})();
