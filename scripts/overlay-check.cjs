const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const [,, tsFile, detailsFile, img, out] = process.argv;
  const ts = fs.readFileSync(tsFile, 'utf8');
  const outline = JSON.parse(ts.match(/FRONT_OUTLINE = (".*?");/)[1]);
  const gaps = JSON.parse(ts.match(/FRONT_ARM_GAPS = (\[.*?\]);/)[1]);
  const details = fs.readFileSync(detailsFile, 'utf8');
  const b64 = fs.readFileSync(img).toString('base64');
  const S = 380 / 302;
  const html = `<html><body style="margin:0;background:#fff">
  <svg width="900" height="900" viewBox="-210 -205 420 420">
   <image href="data:image/png;base64,${b64}" x="${-143 * S}" y="-198" width="${286 * S}" height="380" opacity="0.55"/>
   <path d="${outline} ${gaps.join(' ')}" fill="rgba(80,120,255,0.18)" fill-rule="evenodd" stroke="#e11" stroke-width="0.6"/>
   <g fill="none" stroke="#0a0" stroke-width="0.9" stroke-linecap="round">${details}</g>
   <line x1="0" y1="-200" x2="0" y2="200" stroke="#f0f" stroke-width="0.3"/>
  </svg></body></html>`;
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 900, height: 900 } });
  await p.setContent(html); await p.screenshot({ path: out }); await b.close();
})();
