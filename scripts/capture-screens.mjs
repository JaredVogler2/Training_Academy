// Captures the review screenshots from the RUNNING production build: real pages, real interactions, no mock-ups.
//
//   npm run build && npm run screens                          everything, into docs/review/phase-03/
//   npm run screens -- phase-03/round-1 door,lesson           some groups, into another folder
//   npm run screens -- worlds worlds                          every world's page and every activity, into worlds/
//
// Groups: door, hub, islands, guide, world, lesson, tips, clickmaps, grownups, phones; and worlds, which is run
// only when asked for by name. The folder is relative to docs/review/, so a second set can be kept beside the
// first for before-and-after comparisons.
//
// The `worlds` group is one picture of each world's page and one of each activity at the first thing a child does
// in it, on a phone, read from the content packs so that none can be missed; and the first activity of each world
// while it is being shown, and on a phone held sideways.
//
// The `phones` group is what a phone does that the other screens do not show: the little height a browser leaves
// with the phone on its side, and a notch. A notch is given to the page through the four --safe-* tokens every
// rule reads it from (a desktop browser reports none), and the part of the screen it takes is shaded in the
// picture.
//
// A click map is a screenshot with every control outlined and measured: teal where it is at least the 56 pixels a
// child's control must be, amber from 48 (a grown-up's), red below that.
//
// It starts `vite preview` itself (the same server the browser tests use, with the vercel.json headers), drives the
// game in headless Chromium, and writes JPEGs.
//
// Headless Chromium has no GPU: the 3D hub is drawn by SwiftShader, a CPU rasteriser. The pictures show composition,
// colour, lighting and layout faithfully. They say nothing about frame rate on a real device, and a still picture
// says nothing about motion.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'docs/review', process.argv[2] ?? 'phase-03');
const GROUPS = [
  'door',
  'hub',
  'islands',
  'guide',
  'world',
  'lesson',
  'tips',
  'clickmaps',
  'grownups',
  'phones',
  'worlds',
];
const wanted = new Set(
  process.argv[3] ? process.argv[3].split(',') : GROUPS.filter((group) => group !== 'worlds'),
);
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
  // What Safari leaves a page on an iPhone 13 held sideways, with its bars showing: the tightest real screen.
  'iphone-landscape': { width: 750, height: 342, touch: true },
  // What Chrome leaves a page on an Android phone 360 pixels wide — the commonest size — held sideways: its 360
  // of height less the status bar, Chrome's own bar and a gesture bar.
  'android-flat': { width: 800, height: 264, touch: true },
  // The narrowest of those phones.
  'android-narrow-flat': { width: 640, height: 256, touch: true },
  // An iPhone 13 held sideways in Safari, as the page really gets it: the whole screen, of which the notch takes
  // 47 pixels at each end and the home bar 21 at the bottom.
  'iphone-notch': {
    width: 844,
    height: 342,
    touch: true,
    notch: { top: 0, right: 47, bottom: 21, left: 47 },
  },
};
/** The five screen shapes every phase reviews, and the tight one. */
const REVIEW_SCREENS = ['phone', 'phone-landscape', 'small-phone', 'tablet', 'desktop'];

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

/**
 * Open a page on one of the screens and hand it to `steps`, which calls `shot(name)` whenever it likes.
 * `begun: false` arrives as a new visit does, at the front door.
 */
async function session(screen, steps, { graphics = 'pictures', begun = true } = {}) {
  const { width, height, touch, notch } = SCREENS[screen];
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
    hasTouch: touch,
    isMobile: touch,
    serviceWorkers: 'block',
  });
  await context.addInitScript(
    ({ value, begun }) => {
      if (window.localStorage.getItem('training-academy.settings.v1') === null) {
        window.localStorage.setItem('training-academy.settings.v1', value);
      }
      if (begun) window.sessionStorage.setItem('training-academy.begun', '1');
    },
    { value: JSON.stringify({ version: 1, sound: true, motion: 'system', graphics }), begun },
  );
  if (notch) {
    await context.addInitScript((taken) => {
      const set = () => {
        for (const edge of ['top', 'right', 'bottom', 'left']) {
          document.documentElement.style.setProperty(`--safe-${edge}`, `${taken[edge]}px`);
        }
      };
      if (document.documentElement) set();
      else {
        new MutationObserver((_records, observer) => {
          if (!document.documentElement) return;
          set();
          observer.disconnect();
        }).observe(document, { childList: true });
      }
    }, notch);
  }
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
    // On a screen with a notch, shade what the notch and the home bar take, so the picture shows what keeps clear.
    if (notch) {
      await page.evaluate((taken) => {
        const host = document.querySelector('dialog[open]') ?? document.body;
        const bands = [
          { left: '0', top: '0', width: `${taken.left}px`, height: '100%' },
          { right: '0', top: '0', width: `${taken.right}px`, height: '100%' },
          { left: '0', top: '0', width: '100%', height: `${taken.top}px` },
          { left: '0', bottom: '0', width: '100%', height: `${taken.bottom}px` },
        ];
        for (const band of bands) {
          const shade = document.createElement('div');
          shade.dataset.notchBand = '';
          Object.assign(shade.style, band, {
            position: 'fixed',
            zIndex: '2147483646',
            background: 'rgb(201 48 44 / 30%)',
            pointerEvents: 'none',
          });
          host.append(shade);
        }
      }, notch);
    }
    await page.screenshot({ path: join(out, file), type: 'jpeg', quality: 82 });
    if (notch) {
      await page.evaluate(() => {
        for (const shade of document.querySelectorAll('[data-notch-band]')) shade.remove();
      });
    }
    console.log(`  ${file}`);
  };
  /** A screenshot with every control outlined and measured. The outlines are removed again afterwards. */
  const clickMap = async (name) => {
    await page.evaluate(() => {
      // In front of everything: inside an open dialog if there is one, since a dialog is drawn over the page.
      const host = document.querySelector('dialog[open]') ?? document.body;
      const layer = document.createElement('div');
      layer.id = 'click-map';
      Object.assign(layer.style, { position: 'fixed', inset: '0', zIndex: '2147483647' });
      layer.style.pointerEvents = 'none';
      const controls = document.querySelectorAll(
        'a[href], button, input, select, textarea, summary, [role="button"], [role="link"]',
      );
      for (const control of controls) {
        if (control.closest('[inert]') || !control.checkVisibility({ visibilityProperty: true })) {
          continue;
        }
        // While a dialog is open, only what is in it can be reached.
        if (host !== document.body && !host.contains(control)) continue;
        if (
          control.getAttribute('aria-disabled') === 'true' &&
          !control.hasAttribute('data-choice')
        ) {
          continue;
        }
        const box = control.getBoundingClientRect();
        if (box.width < 2 || box.height < 2 || box.bottom <= 0 || box.top >= innerHeight) continue;
        const least = Math.min(box.width, box.height);
        const colour = least >= 56 ? '#0b8f86' : least >= 48 ? '#c77700' : '#c9302c';
        const outline = document.createElement('div');
        Object.assign(outline.style, {
          position: 'fixed',
          left: `${box.left}px`,
          top: `${box.top}px`,
          width: `${box.width}px`,
          height: `${box.height}px`,
          boxSizing: 'border-box',
          border: `2px solid ${colour}`,
          borderRadius: '6px',
          background: `${colour}22`,
        });
        const label = document.createElement('span');
        label.textContent = `${Math.round(box.width)}×${Math.round(box.height)}`;
        Object.assign(label.style, {
          position: 'absolute',
          left: '0',
          top: '0',
          padding: '0 4px',
          borderRadius: '0 0 6px 0',
          color: '#fff',
          background: colour,
          font: '700 10px/14px system-ui, sans-serif',
        });
        outline.append(label);
        layer.append(outline);
      }
      host.append(layer);
    });
    await shot(`click-map-${name}`);
    await page.evaluate(() => document.getElementById('click-map')?.remove());
  };
  /** Wait until whatever is arriving has arrived: every animation that has an end has reached it. */
  const arrived = () =>
    page.evaluate(async () => {
      const ending = document.getAnimations().filter((animation) => {
        const end = animation.effect?.getComputedTiming().endTime;
        return typeof end === 'number' && Number.isFinite(end);
      });
      await Promise.all(ending.map((animation) => animation.finished.catch(() => undefined)));
    });
  try {
    await steps({ page, press, shot, clickMap, arrived });
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

/** Downloaded, decoded and drawn: a picture still being decoded is left out of the frame a screenshot takes. */
async function hubPictures(page) {
  await page.waitForFunction(() => {
    const images = [...document.querySelectorAll('[data-testid="hub-picture"] img')];
    return images.length >= 7 && images.every((image) => image.complete && image.naturalWidth > 0);
  });
  await page.evaluate(async () => {
    const images = [...document.querySelectorAll('[data-testid="hub-picture"] img')];
    await Promise.all(images.map((image) => image.decode().catch(() => undefined)));
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  });
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

  // The front door: a first visit on every screen shape, and a device two children have played on.
  if (wanted.has('door')) {
    for (const screen of [...REVIEW_SCREENS, 'iphone-landscape']) {
      await session(
        screen,
        async ({ page, shot, arrived }) => {
          await page.goto(`${BASE}/`);
          await page.getByTestId('front-door').getByRole('button').first().waitFor();
          await hubPictures(page);
          await arrived();
          await shot('door-1-first-visit');
        },
        { begun: false },
      );
    }
    for (const screen of ['phone', 'desktop']) {
      await session(
        screen,
        async ({ page, press, shot, arrived }) => {
          // Two players, made the way a family makes them: one at the front door, one in the grown-ups' area.
          await page.goto(`${BASE}/`);
          await press(page.getByTestId('front-door').locator('button[data-avatar="star"]'));
          await page.getByTestId('front-door').waitFor({ state: 'detached' });
          await page.goto(`${BASE}/grown-ups`);
          await holdGateOpen(page);
          await page.getByRole('button', { name: 'Add a player' }).click();
          await page.getByLabel('Nickname', { exact: true }).fill('Mina');
          await page.getByRole('radio', { name: 'Moon' }).check({ force: true });
          await page.getByRole('button', { name: 'Add', exact: true }).click();
          await page.getByTestId('player').filter({ hasText: 'Mina' }).waitFor();
          // A new visit.
          await page.evaluate(() => window.sessionStorage.clear());
          await page.goto(`${BASE}/`);
          await page.getByTestId('front-door').getByRole('button').first().waitFor();
          await hubPictures(page);
          await arrived();
          await shot('door-2-who-is-playing');
          // And through it: the map, with Glim saying hello before pointing the way.
          await press(page.getByTestId('front-door').getByRole('button', { name: 'Play as Mina' }));
          await page.getByTestId('front-door').waitFor({ state: 'detached' });
          await page.locator('[data-testid="guide"][data-state="wave"]').waitFor();
          await page.waitForTimeout(400);
          await shot('door-3-arriving-on-the-map');
        },
        { begun: false },
      );
    }
  }

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
  for (const screen of wanted.has('world') ? ['phone', 'desktop', 'iphone-landscape'] : []) {
    await session(screen, async ({ page, shot, arrived }) => {
      await page.goto(`${BASE}/world/number-garden`);
      await page.getByTestId('world-example').waitFor();
      await arrived();
      await shot('world-open');
      await page.goto(`${BASE}/world/reading-cove`);
      await page.getByText('This world is not open yet.').waitFor();
      await arrived();
      await shot('world-not-open');
    });
  }

  // The activity, state by state: shown first, asked, answered wrongly, helped, answered, paused, finished.
  for (const screen of wanted.has('lesson')
    ? ['phone', 'phone-landscape', 'tablet', 'desktop', 'iphone-landscape']
    : []) {
    await session(screen, async ({ page, press, shot, arrived }) => {
      const next = page.getByRole('button', { name: 'Next' });
      const lit = page.getByTestId('lesson').locator('[data-same="true"]');
      await page.goto(`${BASE}${LESSON}`);
      await page.getByRole('button', { name: 'My turn' }).waitFor();
      // Glim is counting the group…
      await page.locator('[data-same] svg[data-counting="true"]').waitFor();
      await page.waitForTimeout(450);
      await shot('lesson-1-demonstration-counting');
      // …and at the end the group and its match are lit together.
      await lit.waitFor({ timeout: 15_000 });
      await arrived();
      await shot('lesson-2-demonstration-the-same');

      await press(page.getByRole('button', { name: 'My turn' }));
      await page.waitForTimeout(2600);
      await shot('lesson-3-guided-question');
      await choose(page, press, true);
      await lit.waitFor({ timeout: 15_000 });
      await arrived();
      await shot('lesson-4-right-answer');
      await press(next);
      await choose(page, press, true);
      await press(next);
      await page.waitForTimeout(1800);
      await shot('lesson-5-question-on-their-own');

      await choose(page, press, false);
      // The choice that was tried is being counted against the group.
      await page.locator('[data-choice][data-comparing="true"]').waitFor({ timeout: 15_000 });
      await page.waitForTimeout(500);
      await shot('lesson-6-wrong-answer-compared');
      await page.waitForTimeout(2500);
      await press(page.getByRole('button', { name: 'Help me' }));
      await page.waitForTimeout(1200);
      await shot('lesson-7-help');

      await press(page.getByRole('button', { name: 'Pause' }));
      await page.getByTestId('lesson-paused').waitFor();
      await page.waitForTimeout(500);
      await shot('lesson-8-paused');
      await press(page.getByRole('button', { name: 'Carry on' }));

      for (
        let guard = 0;
        guard < 20 && !(await page.getByTestId('lesson-finished').isVisible());
        guard++
      ) {
        if (await next.isVisible()) await press(next);
        else await choose(page, press, true);
        await page.waitForTimeout(350);
      }
      await arrived();
      await shot('lesson-9-finished');
    });
  }

  // Tooltips: what a mouse or a keyboard is told about a control that is only a picture.
  if (wanted.has('tips')) {
    await session('desktop', async ({ page, shot }) => {
      await page.goto(`${BASE}${LESSON}`);
      await page.getByRole('button', { name: 'My turn' }).waitFor();
      await page.getByRole('link', { name: 'Leave the activity' }).focus();
      await page.keyboard.press('Shift+Tab');
      await page.keyboard.press('Tab');
      await page.waitForTimeout(400);
      await shot('tooltip-1-keyboard-focus');
      await page.getByRole('button', { name: 'Show me again' }).hover();
      await page.waitForTimeout(900);
      await shot('tooltip-2-hover-on-the-guide');
      await page.goto(`${BASE}/`);
      await page.getByRole('button', { name: 'Sound' }).hover();
      await page.waitForTimeout(900);
      await shot('tooltip-3-hover-on-a-switch');
    });
  }

  // Click maps: every control on the screens a child uses, outlined and measured.
  for (const screen of wanted.has('clickmaps') ? ['phone', 'desktop', 'iphone-landscape'] : []) {
    await session(
      screen,
      async ({ page, press, clickMap, arrived }) => {
        await page.goto(`${BASE}/`);
        await page.getByTestId('front-door').getByRole('button').first().waitFor();
        await hubPictures(page);
        await arrived();
        await clickMap('1-front-door');
        await press(page.getByTestId('front-door').locator('button[data-avatar="drop"]'));
        await page.getByTestId('front-door').waitFor({ state: 'detached' });
        await page
          .locator('[data-testid="guide"][data-state="point"]')
          .waitFor({ timeout: 15_000 });
        await clickMap('2-map');

        await press(page.locator('a[data-world="number-garden"]'));
        await page.getByTestId('world-example').waitFor();
        await arrived();
        await clickMap('3-world');

        await press(page.getByRole('link', { name: 'Play', exact: true }));
        await page.getByRole('button', { name: 'My turn' }).waitFor();
        await page.getByTestId('lesson').locator('[data-same="true"]').waitFor({ timeout: 15_000 });
        await arrived();
        await clickMap('4-demonstration');
        await press(page.getByRole('button', { name: 'My turn' }));
        await choose(page, press, true);
        await press(page.getByRole('button', { name: 'Next' }));
        await choose(page, press, true);
        await press(page.getByRole('button', { name: 'Next' }));
        await page.waitForTimeout(2000);
        await clickMap('5-question');
        await press(page.getByRole('button', { name: 'Pause' }));
        await page.getByTestId('lesson-paused').waitFor();
        await page.waitForTimeout(500);
        await clickMap('6-paused');
        await press(page.getByRole('button', { name: 'Carry on' }));
        const next = page.getByRole('button', { name: 'Next' });
        for (
          let guard = 0;
          guard < 20 && !(await page.getByTestId('lesson-finished').isVisible());
          guard++
        ) {
          if (await next.isVisible()) await press(next);
          else await choose(page, press, true);
          await page.waitForTimeout(350);
        }
        await arrived();
        await clickMap('7-finished');
      },
      { begun: false },
    );
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

  // Phones: the map in the little height a browser leaves with the phone on its side, and a notch.
  if (wanted.has('phones')) {
    for (const screen of ['android-flat', 'android-narrow-flat']) {
      await session(screen, async ({ page, press, shot, clickMap, arrived }) => {
        await page.goto(`${BASE}/`);
        await hubPictures(page);
        await page
          .locator('[data-testid="guide"][data-state="point"]')
          .waitFor({ timeout: 15_000 });
        await shot('phones-1-map-on-a-flat-screen');
        await clickMap('8-map-on-a-flat-screen');
        await press(page.locator('a[data-world="number-garden"]'));
        await page.getByTestId('world-example').waitFor();
        await arrived();
        await shot('phones-2-world-on-a-flat-screen');
        await press(page.getByRole('link', { name: 'Play', exact: true }));
        await page.getByRole('button', { name: 'My turn' }).waitFor();
        await press(page.getByRole('button', { name: 'My turn' }));
        await page.getByTestId('lesson').locator('[data-choice]').first().waitFor();
        await page.waitForTimeout(2000);
        await shot('phones-3-question-on-a-flat-screen');
        const next = page.getByRole('button', { name: 'Next' });
        for (
          let guard = 0;
          guard < 20 && !(await page.getByTestId('lesson-finished').isVisible());
          guard++
        ) {
          if (await next.isVisible()) await press(next);
          else await choose(page, press, true);
          await page.waitForTimeout(350);
        }
        await arrived();
        await shot('phones-10-finished-on-a-flat-screen');
      });
    }
    // The same map as the 3D scene draws it.
    await session(
      'android-flat',
      async ({ page, shot }) => {
        await page.goto(`${BASE}/`);
        await page
          .locator('[data-testid="hub-stage"][data-hub-mode="3d"]')
          .waitFor({ timeout: 120_000 });
        await page.waitForTimeout(3000);
        await shot('phones-4-map-on-a-flat-screen-3d');
      },
      { graphics: 'high' },
    );
    // A notch at each end and a home bar below: shaded, with everything else clear of them.
    await session(
      'iphone-notch',
      async ({ page, press, shot, arrived }) => {
        await page.goto(`${BASE}/`);
        await page.getByTestId('front-door').getByRole('button').first().waitFor();
        await hubPictures(page);
        await arrived();
        await shot('phones-5-notch-front-door');
        await press(page.getByTestId('front-door').locator('button[data-avatar="star"]'));
        await page.getByTestId('front-door').waitFor({ state: 'detached' });
        await page
          .locator('[data-testid="guide"][data-state="point"]')
          .waitFor({ timeout: 15_000 });
        await shot('phones-6-notch-map');
        await press(page.locator('a[data-world="number-garden"]'));
        await page.getByTestId('world-example').waitFor();
        await arrived();
        await shot('phones-7-notch-world');
        await press(page.getByRole('link', { name: 'Play', exact: true }));
        await page.getByRole('button', { name: 'My turn' }).waitFor();
        await press(page.getByRole('button', { name: 'My turn' }));
        await page.getByTestId('lesson').locator('[data-choice]').first().waitFor();
        await page.waitForTimeout(2000);
        await shot('phones-8-notch-question');
        await press(page.getByRole('button', { name: 'Pause' }));
        await page.getByTestId('lesson-paused').waitFor();
        await page.waitForTimeout(500);
        await shot('phones-9-notch-paused');
      },
      { begun: false },
    );
  }

  if (wanted.has('worlds')) {
    const order = [
      'reading-cove',
      'number-garden',
      'robot-ridge',
      'memory-forest',
      'inventor-island',
      'explorer-harbor',
    ];
    const folder = join(root, 'src/content/packs');
    const packs = readdirSync(folder)
      .map((file) => JSON.parse(readFileSync(join(folder, file), 'utf8')))
      .sort((a, b) => order.indexOf(a.world) - order.indexOf(b.world));
    /** Into an activity the way a child comes in: by a tap on its card, which also wakes the sound. */
    const open = async (page, press, world, lessonId) => {
      await page.goto(`${BASE}/world/${world}`);
      await press(page.locator(`[data-lesson="${lessonId}"]`));
      await page.getByRole('button', { name: 'My turn' }).waitFor();
    };
    /** Past every demonstration, to the first thing the child does. */
    const toTheirTurn = async (page, press) => {
      const myTurn = page.getByRole('button', { name: 'My turn' });
      for (let guard = 0; guard < 6 && (await myTurn.isVisible()); guard++) {
        await press(myTurn);
        await page.waitForTimeout(500);
      }
      await page.waitForTimeout(2600);
    };
    for (const pack of packs) {
      const place = `${String(order.indexOf(pack.world) + 1)}-${pack.world}`;
      await session('phone', async ({ page, press, shot, arrived }) => {
        await page.goto(`${BASE}/world/${pack.world}`);
        await page.getByTestId('world-example').waitFor();
        await arrived();
        await shot(`${place}-0-page`);
        for (const [index, lesson] of pack.lessons.entries()) {
          const name = `${place}-${String(index + 1)}-${lesson.id}`;
          await open(page, press, pack.world, lesson.id);
          if (index === 0) {
            // The first activity, while Glim is showing it.
            await page.waitForTimeout(6000);
            await shot(`${name}-shown`);
          }
          await toTheirTurn(page, press);
          await shot(name);
        }
      });
      await session('phone-landscape', async ({ page, press, shot }) => {
        const last = pack.lessons.at(-1);
        await open(page, press, pack.world, last.id);
        await toTheirTurn(page, press);
        await shot(`${place}-${String(pack.lessons.length)}-${last.id}`);
      });
    }
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
