// Usage: node scripts/shot.cjs <url-hash> <out.png> [mobile|desktop] [theme] [actions-json]
const { chromium, devices } = require('playwright');
(async () => {
  const [, , hash = '/', out = 'shot.png', kind = 'mobile', theme = 'dark', actions = '[]'] = process.argv;
  const base = process.env.BASE || 'http://localhost:5173/';
  const b = await chromium.launch();
  const ctx =
    kind === 'mobile'
      ? await b.newContext({ ...devices['Pixel 7'], colorScheme: theme })
      : await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: theme });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', (e) => errs.push('pageerror: ' + e.message));
  p.on('console', (m) => m.type() === 'error' && errs.push('console: ' + m.text()));
  await p.addInitScript((t) => localStorage.setItem('om-settings', JSON.stringify({ state: { theme: t }, version: 1 })), theme);
  await p.goto(base + '#' + hash);
  await p.waitForTimeout(1500);
  for (const a of JSON.parse(actions)) {
    if (a.click) await p.click(a.click, { force: true });
    if (a.tap) await p.tap(a.tap, { force: true });
    if (a.eval) await p.evaluate(a.eval);
    if (a.wait) await p.waitForTimeout(a.wait);
  }
  await p.waitForTimeout(600);
  await p.screenshot({ path: out });
  if (errs.length) console.log(errs.join('\n'));
  await b.close();
})();
