// Renders the pictures the hub falls back to when real-time 3D is not available: one per island and one per floating
// thing, from the very models the 3D scene uses, on a clear background.
//
//   npm run build && npm run art:sprites && npm run build
//
// It starts `vite preview` itself, opens each subject in the studio (src/render/hub3d/Studio.tsx) in headless
// Chromium, and writes WebP files and a manifest to src/assets/hub/. The second build picks the new pictures up.
//
// Headless Chromium has no GPU: the pictures are drawn by SwiftShader, a CPU rasteriser, with the same shaders, so
// they are faithful to the 3D scene; they are not byte-for-byte reproducible from one machine to another, which is
// why they are committed. A unit test (tests/render/sprites.test.ts) fails when the models have changed since the
// pictures were rendered.

import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { SPRITE_SOURCES, sourceHash } from './sprite-sources.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src/assets/hub');
const PORT = 4178;
const BASE = `http://127.0.0.1:${PORT}`;
/** Pixels to the world unit. Islands are drawn at 25 to 90 CSS pixels to the unit, so this is sharp on most screens
 * and a little soft on the largest, which suits a painted picture. */
const PIXELS_PER_UNIT = 80;
const SUBJECTS = [
  'academy',
  'reading-cove',
  'number-garden',
  'robot-ridge',
  'memory-forest',
  'inventor-island',
  'explorer-harbor',
  'boat-0',
  'boat-1',
  'boat-2',
  'rock',
  'cloud',
];

async function startPreview() {
  const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
    cwd: root,
    stdio: 'ignore',
  });
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      if ((await fetch(BASE)).ok) return server;
    } catch {
      // Not up yet.
    }
    await new Promise((done) => setTimeout(done, 150));
  }
  server.kill();
  throw new Error('The preview server did not start. Is dist/ built?');
}

mkdirSync(out, { recursive: true });
for (const file of readdirSync(out)) {
  if (file.endsWith('.webp')) rmSync(join(out, file));
}

const server = await startPreview();
const browser = await chromium.launch({
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-unsafe-swiftshader',
    '--ignore-gpu-blocklist',
  ],
});
const problems = [];
const sprites = {};
let total = 0;

try {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 800 },
    deviceScaleFactor: 1,
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  page.on('console', (message) => {
    if (message.type() !== 'error' && message.type() !== 'warning') return;
    if (/GPU stall|Service Worker registration blocked/.test(message.text())) return;
    problems.push(message.text().slice(0, 300));
  });
  page.on('pageerror', (error) => problems.push(`page error: ${error.message.slice(0, 300)}`));

  for (const subject of SUBJECTS) {
    await page.goto(`${BASE}/studio/${subject}?sprite=${PIXELS_PER_UNIT}&tier=high`);
    const studio = page.locator('[data-testid="studio"][data-ready="true"]');
    await studio.waitFor({ timeout: 90_000 });
    // Two more frames, so the shadows drawn on the first are on the canvas that is captured.
    await page.evaluate(
      () =>
        new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(() => done(null)))),
    );
    await page.waitForTimeout(300);
    const anchorX = Number(await studio.getAttribute('data-anchor-x'));
    const anchorY = Number(await studio.getAttribute('data-anchor-y'));
    const png = await studio.screenshot({ omitBackground: true, type: 'png' });
    const image = sharp(png);
    const { width, height } = await image.metadata();
    const webp = await image
      .webp({ quality: 80, alphaQuality: 88, effort: 6, smartSubsample: true })
      .toBuffer();
    const file = `${subject}.webp`;
    writeFileSync(join(out, file), webp);
    sprites[subject] = {
      file,
      width,
      height,
      anchorX: Math.round(anchorX * 100) / 100,
      anchorY: Math.round(anchorY * 100) / 100,
    };
    total += webp.length;
    console.log(
      `${file.padEnd(22)} ${String(width).padStart(4)} × ${String(height).padEnd(4)} ${(webp.length / 1024).toFixed(1).padStart(6)} kB`,
    );
  }
} finally {
  await browser.close();
  server.kill();
}

if (problems.length > 0) {
  console.error(`\nThe studio reported problems:\n  ${[...new Set(problems)].join('\n  ')}`);
  process.exit(1);
}

writeFileSync(
  join(out, 'sprites.json'),
  `${JSON.stringify(
    {
      about:
        'Written by scripts/render-sprites.mjs. Sizes and anchors are in pixels of the picture; `source` is a hash of the model sources the pictures were rendered from.',
      pixelsPerUnit: PIXELS_PER_UNIT,
      source: sourceHash(root),
      sources: SPRITE_SOURCES,
      sprites,
    },
    null,
    2,
  )}\n`,
);
console.log(
  `\n${Object.keys(sprites).length} pictures, ${(total / 1024).toFixed(1)} kB in all → src/assets/hub/`,
);
