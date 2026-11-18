// E2E for the sensor-device panel: a fake Web Bluetooth device records every command byte.
const { chromium } = require('playwright');
(async () => {
  const base = process.env.BASE || 'http://localhost:5173/';
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = [];
  p.on('pageerror', (e) => errs.push(e.message));
  await p.addInitScript(() => {
    window.__writes = [];
    const ch = (uuid) => ({
      uuid, addEventListener() {}, startNotifications: async function () { return this; },
      readValue: async () => new DataView(new Uint8Array([87]).buffer),
      writeValueWithoutResponse: async (v) => { window.__writes.push(Array.from(new Uint8Array(v.buffer || v))); },
    });
    const service = { getCharacteristic: async (u) => ch(u) };
    const server = { connected: true, connect: async () => server, disconnect() {}, getPrimaryService: async () => service };
    Object.defineProperty(navigator, 'bluetooth', { value: { requestDevice: async () => Object.assign(new EventTarget(), { name: 'Om Chakra Device', gatt: server }) } });
  });
  await p.goto(base + '#/nadi');
  await p.waitForFunction(() => window.__nadi);
  await p.click('button:has-text("7 Sensors")');
  await p.click('button:has-text("Connect Bluetooth")');
  await p.waitForSelector('text=Om Chakra Device');
  const hex = (a) => a.map((x) => x.toString(16).padStart(2, '0')).join(' ');
  const take = () => p.evaluate(() => window.__writes.splice(0));
  const ping = await take();
  // set Anahata to 40 Hz via the device slider, then test pulse
  const slider = p.locator('input[aria-label="Anahata vibration frequency"]');
  await slider.fill('40');
  const engineFreq = await p.evaluate(() => window.__nadi.freqs['sensor-4']);
  await p.locator('div.glass:has-text("Anahata") >> button:has-text("Test")').first().click();
  await p.waitForTimeout(100);
  const test = await take();
  // Hold + live retune + release
  await p.locator('div.glass:has-text("Vishuddha") >> button:has-text("Hold")').first().click();
  await p.locator('input[aria-label="Vishuddha vibration intensity"]').fill('80');
  await p.locator('div.glass:has-text("Vishuddha") >> button:has-text("Release")').first().click();
  const hold = await take();
  // sequence: select only Muladhara, Manipura, Ajna; Up; 1 s; no gap
  await p.click('button:has-text("Clear")');
  for (const n of ['Muladhara', 'Manipura', 'Ajna']) await p.check(`input[aria-label="Include ${n} in play mode"]`);
  await p.click('[role=radio]:has-text("Up")');
  await p.locator('input[aria-label="Seconds per chakra"]').fill('1');
  await p.locator('input[aria-label="Pause between chakras"]').fill('0');
  await p.click('button:has-text("Play on device")');
  await p.waitForTimeout(1500);
  const markerMid = await p.evaluate(() => ({ active: window.__nadi.marker.active, target: window.__nadi.marker.target, pulses: window.__nadi.devicePulses.length }));
  await p.screenshot({ path: process.argv[2] || 'device.png' });
  await p.waitForTimeout(2500);
  const seq = await take();
  // emergency stop during a new run
  await p.click('button:has-text("Play on device")');
  await p.waitForTimeout(300);
  await p.click('button:has-text("STOP ALL VIBRATION")');
  await p.waitForTimeout(200);
  const stop = await take();
  const playing = await p.evaluate(() => document.body.innerText.includes('Stop sequence'));
  console.log(JSON.stringify({
    ping: ping.map(hex), engineFreqLinked: engineFreq, test: test.map(hex), hold: hold.map(hex),
    markerMid, sequence: seq.map(hex), emergency: stop.map(hex), stillPlaying: playing, errs,
  }, null, 1));
  await b.close();
})();
