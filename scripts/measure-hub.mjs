// Measures what the 3D hub costs at each quality tier, from the running production build, and prints a Markdown
// table for docs/QUALITY_REPORT.md.
//
//   npm run build && npm run measure:hub
//
// Read the numbers for what they are. Draw calls, triangles and pixel ratio are properties of the scene and do not
// depend on the machine. Frames per second here come from SwiftShader, a CPU rasteriser in a container with no GPU:
// they say nothing about a phone or a laptop, and are printed only to compare the tiers with each other.

import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PORT = 4178;
const BASE = `http://127.0.0.1:${PORT}`;

const SCREENS = [
  {
    name: 'desktop 1366×768',
    viewport: { width: 1366, height: 768 },
    deviceScaleFactor: 1,
    touch: false,
  },
  {
    name: 'phone 390×844 @3×',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 3,
    touch: true,
  },
];
const TIERS = ['low', 'medium', 'high'];

/** Hold the gate's button down until the grown-ups area opens (a busy machine can take longer than the two seconds). */
async function holdGateOpen(page) {
  const hold = page.getByRole('button', { name: 'Press and hold' });
  await hold.waitFor();
  const box = await hold.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.getByRole('heading', { name: 'Players' }).waitFor({ timeout: 30_000 });
  await page.mouse.up();
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
  const rows = [];
  let renderer = '';
  for (const screen of SCREENS) {
    for (const tier of TIERS) {
      const context = await browser.newContext({
        viewport: screen.viewport,
        deviceScaleFactor: screen.deviceScaleFactor,
        hasTouch: screen.touch,
        isMobile: screen.touch,
        serviceWorkers: 'block',
      });
      const page = await context.newPage();
      await page.goto(`${BASE}/?gfx=${tier}`);
      await page.locator('[data-hub-mode="3d"]').waitFor({ timeout: 120_000 });
      // Long enough for at least one full sampling window (90 frames) even at a few frames per second.
      await page.waitForTimeout(25_000);

      // The diagnostics live in the page's memory; the grown-ups area shows them.
      await page.getByRole('link', { name: 'Grown-ups' }).click();
      await holdGateOpen(page);
      const panel = page.getByTestId('diagnostics');
      await panel.getByText('Diagnostics', { exact: true }).click();
      const fact = async (label) =>
        (
          await panel
            .locator('dt', { hasText: new RegExp(`^${label}$`) })
            .locator('xpath=following-sibling::dd')
            .innerText()
        ).trim();
      renderer = await fact('Renderer');
      rows.push({
        screen: screen.name,
        tier,
        scene: await fact('Scene'),
        frames: await fact('Frames'),
      });
      await context.close();
    }
  }
  await browser.close();

  console.log(`Renderer: ${renderer}\n`);
  console.log(
    '| Screen | Tier | Draw calls | Triangles | Pixel ratio | Frames/s (software) | 95% of frames under |',
  );
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const row of rows) {
    const scene = /(\d+) draw calls, (\d+) triangles/.exec(row.scene);
    const frames = /(\d+) per second, 95% under ([\d.]+) ms, pixel ratio ([\d.?]+)/.exec(
      row.frames,
    );
    console.log(
      `| ${row.screen} | ${row.tier} | ${scene?.[1] ?? '—'} | ${scene ? Number(scene[2]).toLocaleString('en') : '—'} | ` +
        `${frames?.[3] ?? '—'} | ${frames?.[1] ?? 'not measured'} | ${frames ? `${frames[2]} ms` : '—'} |`,
    );
  }
} finally {
  server.kill();
}
