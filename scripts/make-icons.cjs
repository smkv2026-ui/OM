// Regenerate PWA icons: node scripts/make-icons.cjs
const { chromium } = require('playwright');
const path = require('path');
const lotus = (maskable) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="75%">
      <stop offset="0" stop-color="#2b2470"/><stop offset=".6" stop-color="#110d36"/><stop offset="1" stop-color="#07061a"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#f3c35b" stop-opacity=".55"/><stop offset="1" stop-color="#f3c35b" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe6a3"/><stop offset="1" stop-color="#e0a93a"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="${maskable ? 0 : 112}" fill="url(#bg)"/>
  <g transform="translate(256 262) scale(${maskable ? 0.74 : 0.92})">
    <circle r="190" fill="url(#halo)"/>
    <g fill="none" stroke="url(#gold)" stroke-width="10" stroke-linejoin="round" stroke-linecap="round">
      <path d="M0-150c38 46 58 92 58 138S38 74 0 104c-38-30-58-70-58-116S-38-104 0-150Z"/>
      <path d="M-54-40c-46-22-92-28-132-20 6 74 50 136 128 158M54-40c46-22 92-28 132-20-6 74-50 136-128 158"/>
      <path d="M-160 138c48 18 102 26 160 26s112-8 160-26"/>
    </g>
    <line x1="0" y1="-120" x2="0" y2="96" stroke="#fff2c8" stroke-width="5" stroke-linecap="round" opacity=".85"/>
    ${[-110,-70,-30,10,50,84].map((y,i)=>`<circle cx="0" cy="${y}" r="9" fill="${['#c9a7ff','#f7f3e8','#8b5cf6','#3fb6ff','#ff4a1c','#d7263d'][i]}"/>`).join('')}
  </g>
</svg>`;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 512, height: 512 } });
  const out = path.join(__dirname, '..', 'public', 'icons');
  for (const [name, mask, size] of [['icon-512', false, 512], ['icon-192', false, 192], ['maskable-512', true, 512], ['apple-touch-180', true, 180]]) {
    await p.setViewportSize({ width: size, height: size });
    await p.setContent(`<html><body style="margin:0;background:transparent">${lotus(mask).replace('width="512" height="512"', `width="${size}" height="${size}"`)}</body></html>`);
    await p.screenshot({ path: path.join(out, `${name}.png`), omitBackground: true });
  }
  require('fs').writeFileSync(path.join(out, 'icon.svg'), lotus(false));
  await b.close();
})();
