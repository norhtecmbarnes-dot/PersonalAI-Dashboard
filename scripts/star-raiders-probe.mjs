import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';

const BASE = process.argv[2] ?? 'http://localhost:60198';
const exe = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
].find(p => existsSync(p));

const browser = await chromium.launch({ executablePath: exe, headless: true, args: ['--no-sandbox', '--use-gl=angle'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${BASE}/star-raiders?seed=1979`, { waitUntil: 'domcontentloaded' });
await page.waitForFunction(() => Boolean(window.__starRaiders));

await page.evaluate(() => {
  window.__starRaiders.dismissFirstRun();
  window.__starRaiders.beginMission();
});
await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'flying');

// warp straight to a base cell
await page.evaluate(() => window.__starRaiders.openChart());
await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'chart');
await page.evaluate(() => {
  const chart = window.__starRaiders.state.get().chart;
  const base = chart.cells.find(c => c.base && c.baseAlive);
  window.__starRaiders.setCursor(base.x, base.y);
});
await page.evaluate(() => window.__starRaiders.confirmWarp());
await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'warp');
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyH', bubbles: true })));
await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'flying');
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyH', bubbles: true })));

console.log('arrived:', JSON.stringify(await page.evaluate(() => {
  const d = window.__starRaiders.debugInfo;
  return { cell: d.galaxy.playerCell, mode: d.mode, base: d.basePos, dock: d.dock };
})));

// steer + speed 3, watch for 14s
await page.evaluate(() => window.__starRaiders.debugSteerToBase());
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Digit3', bubbles: true })));

for (let i = 0; i < 14; i++) {
  await page.waitForTimeout(850);
  if (i % 2 === 0) await page.evaluate(() => window.__starRaiders.debugSteerToBase());
  const s = await page.evaluate(() => {
    const d = window.__starRaiders.debugInfo;
    const b = d.basePos;
    const dist = b ? Math.round(Math.hypot(b.x - d.player.pos.x, b.y - d.player.pos.y, b.z - d.player.pos.z)) : null;
    return { mode: d.mode, dock: d.dock, speed: d.player.speed, dist, energy: d.player.energy };
  });
  console.log(i, JSON.stringify(s));
  if (s.mode === 'docked') break;
}

await browser.close();
