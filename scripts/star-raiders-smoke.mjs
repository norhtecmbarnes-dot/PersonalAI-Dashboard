/**
 * Star Raiders Reborn — end-to-end smoke test.
 *
 * Drives the real game in a real browser (system Edge/Chrome via the project's
 * own playwright-core, same as the SAM.gov agent): launch a mission, fly, fight,
 * warp via the chart, dock, and die into the rank screen. Prints a JSON verdict
 * and saves screenshots to screenshots/.
 *
 * Usage: node scripts/star-raiders-smoke.mjs [baseUrl]
 */
import { chromium } from 'playwright-core';
import { existsSync, mkdirSync } from 'node:fs';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';

const BASE = process.argv[2] ?? 'http://localhost:62339';

const BROWSER_EXECUTABLES = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/Applications/Google Chrome.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/microsoft-edge',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
];

const exe = BROWSER_EXECUTABLES.find(p => existsSync(p));
if (!exe) {
  console.error(JSON.stringify({ ok: false, error: 'no browser found', checked: BROWSER_EXECUTABLES }));
  process.exit(1);
}

const results = { steps: [], errors: [] };
const step = (name, data) => {
  results.steps.push({ name, ...data });
  console.error(`  · ${name}`);
};

const browser = await chromium.launch({
  executablePath: exe,
  headless: true,
  args: ['--no-sandbox', '--use-gl=angle', '--enable-unsafe-swiftshader'],
});

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('pageerror', err => results.errors.push(String(err)));
  page.on('response', res => {
    if (res.status() >= 400) results.errors.push(`HTTP ${res.status()} ${res.url()}`);
  });
  page.on('console', msg => {
    if (msg.type() === 'error') results.errors.push(msg.text());
  });

  await page.goto(`${BASE}/star-raiders?seed=1979`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.__starRaiders), null, { timeout: 30000 });

  const info = () => page.evaluate(() => window.__starRaiders.debugInfo);
  const press = code =>
    page.evaluate(c => window.dispatchEvent(new KeyboardEvent('keydown', { code: c, bubbles: true })), code);
  const release = code =>
    page.evaluate(c => window.dispatchEvent(new KeyboardEvent('keyup', { code: c, bubbles: true })), code);
  const tap = async code => {
    await press(code);
    await page.waitForTimeout(90);
    await release(code);
  };
  const wait = ms => page.waitForTimeout(ms);

  // ---- dismiss briefing + start ---------------------------------------------
  const dismissBriefing = async () => {
    // Loop because the overlay advances on click.
    for (let i = 0; i < 6; i++) {
      const state = await page.evaluate(() => {
        const container = document.querySelector('canvas')?.parentElement;
        const next = Array.from(container?.querySelectorAll('button') ?? []).find(b => b.textContent?.includes('NEXT'));
        const done = Array.from(container?.querySelectorAll('button') ?? []).find(b =>
          b.textContent?.includes('GOT IT'),
        );
        const skip = Array.from(container?.querySelectorAll('button') ?? []).find(b =>
          b.textContent?.includes('SKIP'),
        );
        if (next) {
          next.click();
          return 'next';
        }
        if (done) {
          done.click();
          return 'done';
        }
        if (skip) {
          skip.click();
          return 'skip';
        }
        return null;
      });
      if (!state) break;
      await wait(150);
    }
  };

  await dismissBriefing();
  await page.evaluate(() => {
    const container = document.querySelector('canvas')?.parentElement;
    Array.from(container?.querySelectorAll('button') ?? [])
      .find(b => b.textContent?.includes('BEGIN MISSION'))
      ?.click();
  });
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'flying', null, { timeout: 10000 });
  step('mission-start', await info());

  // ---- flight: throttle up, confirm motion ----------------------------------
  await tap('Digit6');
  await wait(1200);
  const flight = await info();
  step('flight', { speed: flight.player.speed, pos: flight.player.pos, asteroids: flight.asteroids });
  if (!(flight.player.speed > 3)) throw new Error(`ship did not reach speed (got ${flight.player.speed})`);
  if (flight.asteroids < 5) throw new Error(`expected an asteroid field (got ${flight.asteroids})`);

  // ---- combat: computer + lock + fire ---------------------------------------
  await tap('KeyC');
  await tap('KeyT');
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space', bubbles: true })));
  await wait(1600);
  await release('Space');
  const combat = await info();
  step('combat', { bolts: combat.bolts, drones: combat.drones, kills: combat.stats.kills });
  if (combat.bolts <= 0) throw new Error('no photons in flight after firing');

  // ---- fore/aft views -------------------------------------------------------
  await tap('KeyV');
  await wait(120);
  const aft = await info();
  await tap('KeyV');
  step('views', { aftViewWorked: aft.view === 'aft' });

  // ---- chart + warp ---------------------------------------------------------
  await tap('KeyG');
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'chart', null, { timeout: 5000 });
  const chart = await page.evaluate(() => window.__starRaiders.state.get().chart);
  const threats = chart.cells.filter(c => c.enemies > 0);
  step('chart', {
    grid: `${chart.width}x${chart.height}`,
    player: [chart.playerX, chart.playerY],
    threatCells: threats.length,
    bases: chart.cells.filter(c => c.base && c.baseAlive).length,
  });
  if (chart.width !== 8 || chart.height !== 4) throw new Error('chart is not 8x4');
  if (threats.length < 2) throw new Error(`expected hostile cells on the chart (got ${threats.length})`);

  const target = threats.sort((a, b) => a.cost - b.cost)[0];
  await page.evaluate(
    ({ x, y }) => {
      window.__starRaiders.setCursor(x, y);
    },
    { x: target.x, y: target.y },
  );
  const plan = await page.evaluate(() => window.__starRaiders.state.get().chart?.plan);
  step('warp-plan', { target: [target.x, target.y], cost: plan?.cost, affordable: plan?.affordable });
  if (!plan?.affordable) throw new Error(`warp to nearest threat unaffordable (cost ${plan?.cost})`);

  await page.evaluate(() => window.__starRaiders.confirmWarp());
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'warp', null, { timeout: 5000 });
  step('warp-tunnel', { mode: 'warp' });

  await press('KeyH');
  await page.waitForFunction(
    tx => window.__starRaiders.debugInfo.mode === 'flying' && window.__starRaiders.debugInfo.galaxy.playerCell.x === tx,
    target.x,
    { timeout: 15000 },
  );
  await release('KeyH');
  const arrived = await info();
  step('arrival', { cell: arrived.galaxy.playerCell, hostiles: arrived.enemies, energy: arrived.player.energy });
  if (arrived.enemies <= 0) throw new Error('arrived in a hostile sector but no enemies engaged');

  // ---- scan ----------------------------------------------------------------
  await tap('KeyL');
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'scan', null, { timeout: 5000 });
  const scan = await page.evaluate(() => window.__starRaiders.state.get().scan);
  step('scan', { contacts: scan?.contacts?.length ?? 0, hostile: scan?.contacts?.filter(c => c.hostile).length ?? 0 });
  await tap('KeyL');

  // ---- dock ----------------------------------------------------------------
  // The nearest base cell from the warp plan panel: query the chart, then warp
  // there with auto-align on (Novice) so the hold is trivial.
  await tap('KeyG');
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'chart', null, { timeout: 5000 });
  const chart2 = await page.evaluate(() => window.__starRaiders.state.get().chart);
  const base = chart2.cells.find(c => c.base && c.baseAlive);
  await page.evaluate(({ x, y }) => window.__starRaiders.setCursor(x, y), { x: base.x, y: base.y });
  await page.evaluate(() => window.__starRaiders.confirmWarp());
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'warp', null, { timeout: 5000 });
  await press('KeyH');
  await page.waitForFunction(
    tx => window.__starRaiders.debugInfo.mode === 'flying' && window.__starRaiders.debugInfo.galaxy.playerCell.x === tx,
    base.x,
    { timeout: 15000 },
  );
  await release('KeyH');
  const atBase = await info();
  step('warp-to-base', { cell: atBase.galaxy.playerCell, energy: atBase.player.energy });

  // Steer the nose at the base (the hook replaces a human's aiming hand), fly
  // at docking speed until acquisition, then hold speed 3 to fill brackets.
  await page.waitForFunction(
    () => Boolean(window.__starRaiders.debugInfo.basePos),
    null,
    { timeout: 5000 },
  );
  await page.evaluate(() => window.__starRaiders.debugSteerToBase());
  await tap('Digit3');
  // Keep re-aiming as the ship closes; brackets fill once the phase is right.
  for (let i = 0; i < 30; i++) {
    await page.evaluate(() => window.__starRaiders.debugSteerToBase());
    await wait(400);
    if ((await info()).mode === 'docked') break;
  }
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'docked', null, { timeout: 20000 });
  const docked = await info();
  step('docked', { energy: docked.player.energy, hull: docked.player.hull, systems: docked.player.systems });
  if (docked.player.energy < 9000) throw new Error(`docking did not restore energy (${docked.player.energy})`);

  // ---- damage → death → rank -----------------------------------------------
  await tap('Digit0');
  for (let i = 0; i < 10; i++) {
    await page.evaluate(() => window.__starRaiders.debugDamage());
    await wait(220);
    if ((await info()).mode === 'rank') break;
  }
  await page.waitForFunction(() => window.__starRaiders.debugInfo.mode === 'rank', null, { timeout: 10000 });
  const rank = await page.evaluate(() => window.__starRaiders.state.get().rank);
  step('rank', {
    score: rank?.score,
    title: rank?.title,
    outcome: rank?.stats?.outcome,
    kills: rank?.stats?.kills,
    basesYouKilled: rank?.stats?.basesYouKilled,
    seconds: rank?.stats?.seconds,
  });
  if (!rank?.title) throw new Error('rank result missing');

  // ---- screenshots for the README ------------------------------------------
  const shotDir = path.resolve('screenshots');
  mkdirSync(shotDir, { recursive: true });

  await page.evaluate(() => window.__starRaiders.beginMission());
  await wait(900);
  await tap('KeyC');
  await page.screenshot({ path: path.join(shotDir, 'star-raiders-cockpit.png') });

  await tap('KeyG');
  await wait(500);
  await page.screenshot({ path: path.join(shotDir, 'star-raiders-chart.png') });
  await tap('KeyG');

  await tap('KeyL');
  await wait(400);
  await page.screenshot({ path: path.join(shotDir, 'star-raiders-scan.png') });
  await tap('KeyL');

  await page.evaluate(() => window.__starRaiders.confirmWarp());
  await wait(400);
  await page.screenshot({ path: path.join(shotDir, 'star-raiders-warp.png') });

  await mkdir(path.join(shotDir), { recursive: true }).catch(() => {});

  console.log(JSON.stringify({ ok: results.errors.length === 0, steps: results.steps, errors: results.errors }, null, 2));
} catch (error) {
  console.log(
    JSON.stringify({ ok: false, steps: results.steps, errors: [...results.errors, String(error)] }, null, 2),
  );
  process.exitCode = 1;
} finally {
  await browser.close();
}
