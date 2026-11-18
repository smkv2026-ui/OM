// E2E: drag sensors from the palette to their ideal chakra spots with TOUCH (mobile) and MOUSE (desktop).
// Usage: node scripts/test-nadi.cjs <outdir> [count=3]
const { chromium, devices } = require('playwright');
const base = process.env.BASE || 'http://localhost:5173/';
const out = process.argv[2] || '.';
const count = Number(process.argv[3] || 3);

async function touchDrag(page, client, from, to) {
  const steps = 14;
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  for (let i = 1; i <= steps; i++) {
    const x = from.x + ((to.x - from.x) * i) / steps;
    const y = from.y + ((to.y - from.y) * i) / steps;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
    await page.waitForTimeout(16);
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function mouseDrag(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 14 });
  await page.mouse.up();
}

(async () => {
  const b = await chromium.launch();
  for (const kind of ['mobile', 'desktop']) {
    const ctx = kind === 'mobile' ? await b.newContext({ ...devices['Pixel 7'], colorScheme: process.env.THEME || 'light' }) : await b.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: process.env.THEME || 'light' });
    const page = await ctx.newPage();
    const errs = [];
    page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(base + '#/nadi');
    await page.waitForFunction(() => window.__nadi && window.__nadi.w > 0);
    if (count !== 3) {
      if (kind === 'mobile') await page.click('button:has-text("Controls")');
      await page.click(`[role=radio]:has-text("${count} Sensor")`);
      if (kind === 'mobile') await page.click('button:has-text("Controls")');
      await page.waitForTimeout(500);
    }
    const client = await ctx.newCDPSession(page);
    const ids = await page.evaluate(() => window.__nadi.set.map((c) => c.id));
    for (const [i, id] of ids.entries()) {
      const btn = page.locator('[role=listitem]').nth(i);
      const bb = await btn.boundingBox();
      const target = await page.evaluate((id) => {
        const e = window.__nadi; const c = e.set.find((s) => s.id === id); const r = e.canvas.getBoundingClientRect();
        const p = e.ideal(c); return { x: r.left + p.x, y: r.top + p.y };
      }, id);
      const from = { x: bb.x + bb.width / 2, y: bb.y + bb.height / 2 };
      if (kind === 'mobile') await touchDrag(page, client, from, target);
      else await mouseDrag(page, from, target);
      await page.waitForTimeout(150);
    }
    const placed = await page.evaluate(() => window.__nadi.placed.size);
    // reposition test: drag first placed sensor away by touch/mouse and back
    const first = await page.evaluate(() => { const e = window.__nadi; const id = e.set[0].id; const r = e.canvas.getBoundingClientRect(); const p = e.sensorPos(id); return { x: r.left + p.x, y: r.top + p.y }; });
    const away = { x: first.x + 70, y: first.y + 20 };
    if (kind === 'mobile') await touchDrag(page, client, first, away); else await mouseDrag(page, first, away);
    await page.waitForTimeout(200);
    const moved = await page.evaluate(() => { const e = window.__nadi; const p = e.sensorPos(e.set[0].id); return Math.round(p.x - e.cx); });
    if (kind === 'mobile') await touchDrag(page, client, away, first); else await mouseDrag(page, away, first);
    await page.waitForTimeout(2500);
    const status = await page.locator('[role=status] >> nth=0').innerText().catch(() => '');
    const align = await page.evaluate(() => window.__nadi.alignment.toFixed(3));
    // rotation / resize survival
    let resizeOk = 'n/a';
    if (kind === 'mobile') {
      const before = await page.evaluate(() => { const e = window.__nadi; const p = e.placed.get(e.set[0].id); return [p.rx.toFixed(4), p.ry.toFixed(4)].join(','); });
      await page.setViewportSize({ width: 915, height: 412 });
      await page.waitForTimeout(800);
      const after = await page.evaluate(() => { const e = window.__nadi; const p = e.placed.get(e.set[0].id); return [p.rx.toFixed(4), p.ry.toFixed(4)].join(','); });
      resizeOk = before === after ? 'kept' : `changed ${before} -> ${after}`;
      await page.screenshot({ path: `${out}/nadi-${kind}-landscape-${count}.png` });
      await page.setViewportSize({ width: 412, height: 915 });
      await page.waitForTimeout(800);
    }
    await page.screenshot({ path: `${out}/nadi-${kind}-${count}.png` });
    console.log(JSON.stringify({ kind, count, placed, movedDx: moved, alignment: align, status: status.replace(/\s+/g, ' '), resize: resizeOk, errors: errs }));
    await ctx.close();
  }
  await b.close();
})();
