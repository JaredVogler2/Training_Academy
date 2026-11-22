// Captures the review screenshots from the RUNNING production build: real pages, real interactions, no mock-ups.
//
//   npm run build && npm run screens                          everything, into docs/review/phase-02/
//   npm run screens -- phase-02/round-1 hub,lesson            some groups, into another folder
//
// Groups: hub, islands, guide, world, lesson, grownups. The folder is relative to docs/review/, so a second set can
// be kept beside the first for before-and-after comparisons.
//
// It starts `vite preview` itself (the same server the browser tests use, with the vercel.json headers), drives the
// game in headless Chromium, and writes JPEGs.
//
// Headless Chromium has no GPU: the 3D hub is drawn by SwiftShader, a CPU rasteriser. The pictures show composition,
// colour, lighting and layout faithfully. They say nothing about frame rate on a real device, and a still picture
// says nothing about motion.

import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/review', process.argv[2] ?? 'phase-02');
const GROUPS = ['hub', 'islands', 'guide', 'world', 'lesson', 'grownups'];
const wanted = new Set(process.argv[3] ? process.argv[3].split(',') : GROUPS);
for (const group of wanted) {
  if (!GROUPS.includes(group))
    throw new Error(`No such group: ${group}. Groups: ${GROUPS.join(', ')}`);
}
const PORT = 4179;
const BASE = `http://127.0.0.1:${PORT}`;
const LESSON = '/world/number-garden/play/ng-same-amount-01';

const SCREENS = {
  phone: { width: 390, height: 844, touch: true },
  'phone-landscape': { width: 844, height: 390, touch: true },
  'small-phone': { width: 360, height: 740, touch: true },
  tablet: { width: 768, height: 1024, touch: true },
  desktop: { width: 1366, height: 768, touch: false },
};

mkdirSync(out, { recursive: true });

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

/** Open a page on one of the screens and hand it to `steps`, which calls `shot(name)` whenever it likes. */
async function session(screen, steps, { graphics = 'pictures' } = {}) {
  const { width, height, touch } = SCREENS[screen];
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    hasTouch: touch,
    isMobile: touch,
    serviceWorkers: 'block',
  });
  await context.addInitScript(
    (value) => {
      if (window.localStorage.getItem('training-academy.settings.v1') === null) {
        window.localStorage.setItem('training-academy.settings.v1', value);
      }
    },
    JSON.stringify({ version: 1, sound: true, motion: 'system', graphics }),
  );
  const page = await context.newPage();
  page.on('console', (message) => {
    const text = message.text();
    const harness = /GPU stall due to ReadPixels|Service Worker registration blocked/.test(text);
    if ((message.type() === 'error' || message.type() === 'warning') && !harness) {
      problems.push(`${screen}: ${text}`);
    }
  });
  page.on('pageerror', (error) => problems.push(`${screen}: ${error.message}`));

  const press = (target) => (touch ? target.tap() : target.click());
  const shot = async (name) => {
    const file = `${name}-${width}x${height}.jpg`;
    // A phone browser zooms out to hold a page that is too wide, and the picture would hide the fault.
    const pageWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    if (pageWidth > width) problems.push(`${file}: the page is ${pageWidth} px wide`);
    await page.screenshot({ path: join(out, file), type: 'jpeg', quality: 82 });
    console.log(`  ${file}`);
  };
  try {
    await steps({ page, press, shot });
  } finally {
    await context.close();
  }
}

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

/** Tap a choice whose amount matches the group to match (`right`), or one that does not. */
async function choose(page, press, right) {
  const lesson = page.getByTestId('lesson');
  const target = await lesson.locator('[data-same] svg').first().getAttribute('data-count');
  const choices = lesson.locator('[data-choice]:not([data-state="away"])');
  for (let index = 0; index < (await choices.count()); index++) {
    const choice = choices.nth(index);
    const amount = await choice.locator('svg').first().getAttribute('data-count');
    if ((amount === target) === right) return press(choice);
  }
  throw new Error('No such choice.');
}

try {
  console.log(`Writing to ${out}`);

  if (wanted.has('hub')) {
    // The hub in 3D at its high tier, on every screen shape.
    for (const screen of Object.keys(SCREENS)) {
      await session(
        screen,
        async ({ page, shot }) => {
          await page.goto(`${BASE}/`);
          await page.locator('[data-hub-mode="3d"]').waitFor({ timeout: 90_000 });
          await page.waitForTimeout(1800);
          await shot('hub-3d');
        },
        { graphics: 'high' },
      );
    }

    // The hub as a picture: the first paint, and what a device without usable WebGL keeps.
    for (const screen of ['phone', 'tablet', 'desktop']) {
      await session(screen, async ({ page, shot }) => {
        await page.goto(`${BASE}/`);
        await page.getByRole('navigation', { name: 'Worlds' }).waitFor();
        // Downloaded, decoded and drawn: a picture still being decoded is left out of the frame a screenshot takes.
        await page.waitForFunction(() => {
          const images = [...document.querySelectorAll('[data-testid="hub-picture"] img')];
          return (
            images.length >= 7 && images.every((image) => image.complete && image.naturalWidth > 0)
          );
        });
        await page.evaluate(async () => {
          const images = [...document.querySelectorAll('[data-testid="hub-picture"] img')];
          await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
          await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
        });
        await page.waitForTimeout(700);
        await shot('hub-picture');
      });
    }

    // The low tier, as a weak device gets it.
    await session(
      'phone',
      async ({ page, shot }) => {
        await page.goto(`${BASE}/`);
        await page.locator('[data-hub-mode="3d"]').waitFor({ timeout: 90_000 });
        await page.waitForTimeout(1500);
        await shot('hub-3d-low-tier');
      },
      { graphics: 'low' },
    );

    // An island with keyboard focus: it rises, and the ring shows what Enter will open.
    await session(
      'desktop',
      async ({ page, shot }) => {
        await page.goto(`${BASE}/`);
        await page.locator('[data-hub-mode="3d"]').waitFor({ timeout: 90_000 });
        await page.getByRole('link', { name: /Number Garden/ }).focus();
        await page.waitForTimeout(1200);
        await shot('hub-3d-island-focused');
      },
      { graphics: 'high' },
    );

    // The guide answering a tap. Taken with the hub as a picture: software-rendered 3D keeps the page so busy that
    // the wave can be over before a screenshot of it is possible.
    await session('desktop', async ({ page, shot }) => {
      await page.goto(`${BASE}/`);
      await page.getByRole('button', { name: /Glim/ }).click();
      await page.locator('[data-testid="guide"][data-state="wave"]').waitFor();
      await page.waitForTimeout(350);
      await shot('hub-picture-guide-hello');
    });
  }

  // Each island on its own, from the studio, and the guide's character sheet.
  if (wanted.has('islands')) {
    await session('desktop', async ({ page, shot }) => {
      for (const island of [
        'academy',
        'reading-cove',
        'number-garden',
        'robot-ridge',
        'memory-forest',
        'inventor-island',
        'explorer-harbor',
      ]) {
        await page.goto(`${BASE}/studio/${island}`);
        await page
          .locator('[data-testid="studio"][data-ready="true"]')
          .waitFor({ timeout: 90_000 });
        await page.waitForTimeout(1500);
        await shot(`island-${island}`);
      }
    });
  }
  if (wanted.has('guide')) {
    await session('desktop', async ({ page, shot }) => {
      await page.setViewportSize({ width: 1366, height: 1080 });
      await page.goto(`${BASE}/studio/guide`);
      await page.getByTestId('guide-sheet').waitFor();
      await page.waitForTimeout(900);
      await page.screenshot({
        path: join(out, 'guide-character-sheet-1366x1080.jpg'),
        type: 'jpeg',
        quality: 86,
      });
      console.log('  guide-character-sheet-1366x1080.jpg');
      void shot;
    });
  }

  // World front doors: one that is open, one that is not.
  for (const screen of wanted.has('world') ? ['phone', 'desktop'] : []) {
    await session(screen, async ({ page, shot }) => {
      await page.goto(`${BASE}/world/number-garden`);
      await page.getByRole('link', { name: 'Play' }).waitFor();
      await page.waitForTimeout(500);
      await shot('world-open');
      await page.goto(`${BASE}/world/reading-cove`);
      await page.getByText('This world is not open yet.').waitFor();
      await page.waitForTimeout(300);
      await shot('world-not-open');
    });
  }

  // The sample activity, state by state.
  for (const screen of wanted.has('lesson')
    ? ['phone', 'phone-landscape', 'tablet', 'desktop']
    : []) {
    await session(screen, async ({ page, press, shot }) => {
      const next = page.getByRole('button', { name: 'Next' });
      await page.goto(`${BASE}${LESSON}`);
      await page.getByRole('button', { name: 'My turn' }).waitFor();
      await page.waitForTimeout(3200);
      await shot('lesson-1-demonstration');

      await press(page.getByRole('button', { name: 'My turn' }));
      await page.waitForTimeout(500);
      await choose(page, press, true);
      await page.waitForTimeout(1500);
      await shot('lesson-2-right-answer');
      await press(next);
      await choose(page, press, true);
      await press(next);
      await page.waitForTimeout(600);
      await shot('lesson-3-question');

      await choose(page, press, false);
      await page.waitForTimeout(1300);
      await shot('lesson-4-wrong-answer');
      await press(page.getByRole('button', { name: 'Help me' }));
      await page.waitForTimeout(1400);
      await shot('lesson-5-hint');

      for (
        let guard = 0;
        guard < 20 && !(await page.getByTestId('lesson-finished').isVisible());
        guard++
      ) {
        if (await next.isVisible()) await press(next);
        else await choose(page, press, true);
        await page.waitForTimeout(350);
      }
      await page.waitForTimeout(900);
      await shot('lesson-6-finished');
    });
  }

  // The grown-ups area and the "something went wrong" screens.
  for (const screen of wanted.has('grownups') ? ['phone', 'desktop'] : []) {
    await session(screen, async ({ page, shot }) => {
      await page.goto(`${BASE}${LESSON}`);
      const next = page.getByRole('button', { name: 'Next' });
      await page.getByRole('button', { name: 'My turn' }).click();
      for (
        let guard = 0;
        guard < 20 && !(await page.getByTestId('lesson-finished').isVisible());
        guard++
      ) {
        if (await next.isVisible()) await next.click();
        else await choose(page, (target) => target.click(), true);
        await page.waitForTimeout(250);
      }
      await page.goto(`${BASE}/grown-ups`);
      const hold = page.getByRole('button', { name: 'Press and hold' });
      await hold.waitFor();
      const box = await hold.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.waitForTimeout(1100);
      await shot('grown-ups-1-gate');
      await page.getByRole('heading', { name: 'Players' }).waitFor();
      await page.mouse.up();
      await page.waitForTimeout(500);
      await shot('grown-ups-2-area');
      await page.getByTestId('skill').first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await shot('grown-ups-3-evidence');

      await page.goto(`${BASE}/somewhere/else`);
      await page.getByRole('heading', { level: 1 }).waitFor();
      await shot('not-found');
    });
  }

  // The longest names the form accepts, on the narrowest screens: nothing may push the page wider than the screen.
  for (const screen of wanted.has('grownups') ? ['small-phone', 'phone'] : []) {
    await session(screen, async ({ page, shot }) => {
      await page.goto(`${BASE}/grown-ups`);
      await holdGateOpen(page);
      for (const [name, picture] of [
        ['Wonderful long nickname', 'Drop'],
        ['W'.repeat(24), 'Shell'],
      ]) {
        await page.getByRole('button', { name: 'Add a player' }).click();
        await page.getByLabel('Nickname', { exact: true }).fill(name);
        await page.getByRole('radio', { name: picture }).check({ force: true });
        await page.getByRole('button', { name: 'Add', exact: true }).click();
        await page.getByTestId('player').filter({ hasText: name }).waitFor();
      }
      await page.waitForTimeout(400);
      await shot('grown-ups-4-long-names');
      await page.getByRole('heading', { name: 'Saved data' }).scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await shot('grown-ups-5-long-names-saved-data');
    });
  }

  const files = readdirSync(out).filter((file) => file.endsWith('.jpg'));
  const bytes = files.reduce((total, file) => total + statSync(join(out, file)).size, 0);
  console.log(`\n${files.length} screenshots, ${(bytes / 1024 / 1024).toFixed(1)} MB.`);
  if (problems.length > 0) {
    console.error(`\nConsole problems while capturing:\n  ${[...new Set(problems)].join('\n  ')}`);
    process.exitCode = 1;
  }
} finally {
  await browser.close();
  server.kill();
}
