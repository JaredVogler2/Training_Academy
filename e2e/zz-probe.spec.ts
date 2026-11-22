import { LESSON_PATH, SETTINGS_KEY, finishCorrectly, test, type Page } from './fixtures';

/**
 * TEMPORARY — a measurement, not a test. On the CI runner the grown-ups gate has been taking far longer than its two
 * seconds when it is opened after a finished lesson, on the desktop project only. This reports what the page itself
 * saw, with sound on and with sound off. It is deleted once the cause is known.
 */

interface Seen {
  events: string[];
  stalls: string[];
}

async function instrument(page: Page, sound: boolean): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
      const seen: Seen = { events: [], stalls: [] };
      (window as unknown as { __seen: Seen }).__seen = seen;
      const at = () => String(Math.round(performance.now()));
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'blur', 'focus']) {
        document.addEventListener(
          type,
          (event) => {
            const target = event.target instanceof Element ? event.target.tagName : '?';
            seen.events.push(`${at()} ${type} ${target}`);
          },
          true,
        );
      }
      // A heartbeat every 100 ms: a late beat means the main thread was not running.
      let last = performance.now();
      window.setInterval(() => {
        const now = performance.now();
        if (now - last > 400) seen.stalls.push(`${String(Math.round(last))}→${at()}`);
        last = now;
      }, 100);
    },
    {
      key: SETTINGS_KEY,
      value: JSON.stringify({ version: 1, sound, motion: 'system', graphics: 'pictures' }),
    },
  );
}

async function timeTheGate(page: Page, label: string): Promise<void> {
  const started = Date.now();
  await page.goto('/grown-ups');
  const hold = page.getByRole('button', { name: 'Press and hold' });
  await hold.waitFor();
  const box = await hold.boundingBox();
  if (!box) throw new Error('no hold button');
  const shown = Date.now();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = Date.now();
  let opened = 'never (30 s)';
  try {
    await page.getByRole('heading', { name: 'Players' }).waitFor({ timeout: 30_000 });
    opened = `${String(Date.now() - pressed)} ms`;
  } catch {
    // Reported below.
  }
  await page.mouse.up();
  const seen = await page.evaluate(() => (window as unknown as { __seen: Seen }).__seen);
  console.log(
    `[probe] ${label}: page→button ${String(shown - started)} ms, press→open ${opened}\n` +
      `[probe]    events: ${seen.events.join(' | ')}\n` +
      `[probe]    stalls: ${seen.stalls.join(' | ') || 'none'}`,
  );
}

test.describe('probe: how long the gate takes', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'Chromium only.');
  test.describe.configure({ mode: 'serial', retries: 0 });

  for (const sound of [true, false]) {
    for (const round of [1, 2]) {
      const name = `sound ${sound ? 'on' : 'off'}, round ${String(round)}`;

      test(`gate first, ${name}`, async ({ page }, testInfo) => {
        await instrument(page, sound);
        await timeTheGate(page, `${testInfo.project.name} · gate first · ${name}`);
      });

      test(`after a finished lesson, ${name}`, async ({ page, press }, testInfo) => {
        await instrument(page, sound);
        await page.goto(LESSON_PATH);
        await finishCorrectly(page, press);
        await timeTheGate(page, `${testInfo.project.name} · after a lesson · ${name}`);
      });
    }
  }
});
