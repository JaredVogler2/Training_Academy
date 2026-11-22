// Measures what each screen costs while nobody is touching it: the CPU time of every browser process over a few
// seconds, from the running production build. Prints a Markdown table for docs/QUALITY_REPORT.md.
//
//   npm run build && npm run measure:idle
//
// 100% means one CPU core fully busy. A screen that is not being used should be close to zero; anything that is not
// is repainting on a timer and will cost battery on a real device.
//
// Linux only (it reads /proc). The numbers come from headless Chromium with software rendering, so they overstate
// what a device with a GPU would spend — but a screen that is expensive here is the one to look at first.

import { spawn } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4177;
const BASE = `http://127.0.0.1:${PORT}`;
const SECONDS = 5;
const LESSON = '/world/number-garden/play/ng-same-amount-01';

const DESKTOP = { width: 1366, height: 768 };
const PHONE = { width: 390, height: 844 };
const CASES = [
  ['Home, illustrated', '/', { graphics: 'pictures', motion: 'full' }, DESKTOP],
  ['Home, illustrated (phone)', '/', { graphics: 'pictures', motion: 'full' }, PHONE],
  ['Home, illustrated, calm motion', '/', { graphics: 'pictures', motion: 'reduced' }, DESKTOP],
  [
    "A world's front page",
    '/world/number-garden',
    { graphics: 'pictures', motion: 'full' },
    DESKTOP,
  ],
  ['The activity', LESSON, { graphics: 'pictures', motion: 'full' }, DESKTOP],
  ['The grown-ups gate', '/grown-ups', { graphics: 'pictures', motion: 'full' }, DESKTOP],
  ['Home, 3D, low tier (software 3D)', '/', { graphics: 'low', motion: 'full' }, DESKTOP],
];

/** User plus system CPU time, in clock ticks, of every Chromium process on this machine. */
function browserTicks() {
  let total = 0;
  for (const pid of readdirSync('/proc').filter((name) => /^\d+$/.test(name))) {
    try {
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf8');
      const name = stat.slice(stat.indexOf('(') + 1, stat.lastIndexOf(')'));
      if (!/chrome|headless_shell/i.test(name)) continue;
      const fields = stat.slice(stat.lastIndexOf(')') + 2).split(' ');
      total += Number(fields[11]) + Number(fields[12]);
    } catch {
      // The process ended between listing and reading.
    }
  }
  return total;
}

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  cwd: root,
  stdio: 'ignore',
});
try {
  for (let attempt = 0; ; attempt++) {
    try {
      if ((await fetch(BASE)).ok) break;
    } catch {
      // Not up yet.
    }
    if (attempt > 100) throw new Error('The preview server did not start. Is dist/ built?');
    await new Promise((done) => setTimeout(done, 150));
  }

  const browser = await chromium.launch({
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--ignore-gpu-blocklist',
    ],
  });
  console.log('| Screen | Size | CPU while idle |');
  console.log('| --- | --- | --- |');
  for (const [name, path, settings, viewport] of CASES) {
    const context = await browser.newContext({ viewport, serviceWorkers: 'block' });
    await context.addInitScript(
      (value) => window.localStorage.setItem('training-academy.settings.v1', value),
      JSON.stringify({ version: 1, sound: true, ...settings }),
    );
    const page = await context.newPage();
    await page.goto(BASE + path);
    // Let the page finish arriving (the 3D hub takes a while in software) before the measurement starts.
    await page.waitForTimeout(settings.graphics === 'pictures' ? 3000 : 10_000);
    const before = browserTicks();
    const started = Date.now();
    await page.waitForTimeout(SECONDS * 1000);
    const cpuSeconds = (browserTicks() - before) / 100;
    const share = (100 * cpuSeconds) / ((Date.now() - started) / 1000);
    console.log(`| ${name} | ${viewport.width}×${viewport.height} | ${share.toFixed(0)}% |`);
    await context.close();
  }
  await browser.close();
} finally {
  server.kill();
}
