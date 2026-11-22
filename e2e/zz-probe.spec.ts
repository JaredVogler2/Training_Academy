import { LESSON_PATH, SETTINGS_KEY, finishCorrectly, test, type Page } from './fixtures';

/**
 * TEMPORARY — a measurement, not a test. On the CI runner the page that follows a finished lesson stalls for a
 * second or more, about a second after it starts, on the desktop project only. This records a browser trace of that
 * moment and prints what was running. It is deleted once the cause is known.
 */

interface TraceEvent {
  name: string;
  ph: string;
  ts: number;
  dur?: number;
  pid: number;
  tid: number;
  cat?: string;
  args?: { name?: string; data?: Record<string, unknown> };
}

const CATEGORIES = [
  'toplevel',
  'mojom',
  'ipc',
  'gpu',
  'viz',
  'cc',
  'v8',
  'blink',
  'blink.user_timing',
  'devtools.timeline',
  'loading',
  'audio',
  'media',
  'storage',
  'IndexedDB',
  'net',
  'disabled-by-default-devtools.timeline',
  'disabled-by-default-v8.gc',
];

async function watchForStalls(page: Page): Promise<void> {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
      const stalls: [number, number][] = [];
      (window as unknown as { __stalls: [number, number][] }).__stalls = stalls;
      let last = performance.now();
      window.setInterval(() => {
        const now = performance.now();
        if (now - last > 300) stalls.push([Math.round(last), Math.round(now)]);
        last = now;
      }, 50);
    },
    {
      key: SETTINGS_KEY,
      value: JSON.stringify({ version: 1, sound: true, motion: 'system', graphics: 'pictures' }),
    },
  );
}

async function traceTheGate(page: Page, label: string): Promise<void> {
  const cdp = await page.context().newCDPSession(page);
  const events: TraceEvent[] = [];
  cdp.on('Tracing.dataCollected', ({ value }) => {
    events.push(...(value as unknown as TraceEvent[]));
  });
  await cdp.send('Tracing.start', {
    transferMode: 'ReportEvents',
    traceConfig: { includedCategories: CATEGORIES },
  });

  await page.goto('/grown-ups');
  const hold = page.getByRole('button', { name: 'Press and hold' });
  await hold.waitFor();
  const box = await hold.boundingBox();
  if (!box) throw new Error('no hold button');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const pressed = Date.now();
  await page.getByRole('heading', { name: 'Players' }).waitFor({ timeout: 30_000 });
  const took = Date.now() - pressed;
  await page.mouse.up();

  const complete = new Promise((resolve) => cdp.once('Tracing.tracingComplete', resolve));
  await cdp.send('Tracing.end');
  await complete;

  const stalls = await page.evaluate(
    () => (window as unknown as { __stalls: [number, number][] }).__stalls,
  );
  const lines = [
    `[probe] ${label}: press→open ${String(took)} ms; stalls ${stalls.map(([a, b]) => `${String(a)}→${String(b)}`).join(' | ') || 'none'}`,
  ];

  // Page time zero in trace time: the last navigationStart mark.
  const starts = events.filter((event) => event.name === 'navigationStart');
  const zero = starts.at(-1)?.ts;
  const window_ = stalls[0] ?? [900, 2300];
  if (zero !== undefined) {
    const from = zero + window_[0] * 1000;
    const to = zero + window_[1] * 1000;
    const threads = new Map<string, string>();
    const processes = new Map<number, string>();
    for (const event of events) {
      if (event.ph !== 'M') continue;
      if (event.name === 'thread_name') {
        threads.set(`${String(event.pid)}:${String(event.tid)}`, event.args?.name ?? '?');
      }
      if (event.name === 'process_name') processes.set(event.pid, event.args?.name ?? '?');
    }
    const busy = events
      .filter(
        (event) =>
          event.ph === 'X' &&
          (event.dur ?? 0) >= 150_000 &&
          event.ts < to &&
          event.ts + (event.dur ?? 0) > from,
      )
      .sort((a, b) => (b.dur ?? 0) - (a.dur ?? 0))
      .slice(0, 28);
    lines.push(
      `[probe]    in the window ${String(window_[0])}→${String(window_[1])} ms, events of 150 ms or more:`,
    );
    for (const event of busy) {
      const where = `${processes.get(event.pid) ?? '?'}/${threads.get(`${String(event.pid)}:${String(event.tid)}`) ?? '?'}`;
      const detail = event.args?.data ? ` ${JSON.stringify(event.args.data).slice(0, 110)}` : '';
      lines.push(
        `[probe]      ${String(Math.round((event.dur ?? 0) / 1000)).padStart(5)} ms  +${String(Math.round((event.ts - zero) / 1000))}  ${where}  ${event.name}${detail}`,
      );
    }
    if (busy.length === 0) lines.push('[probe]      none');
  } else {
    lines.push('[probe]    no navigationStart mark in the trace');
  }
  console.log(lines.join('\n'));
}

test.describe('probe: what stalls the page after a lesson', () => {
  test.skip(
    ({ browserName, hasTouch }) => browserName !== 'chromium' || hasTouch,
    'Chromium desktop only.',
  );
  test.describe.configure({ mode: 'serial', retries: 0 });

  for (const round of [1, 2]) {
    test(`gate first, round ${String(round)}`, async ({ page }) => {
      await watchForStalls(page);
      await traceTheGate(page, `gate first · round ${String(round)}`);
    });

    test(`after a finished lesson, round ${String(round)}`, async ({ page, press }) => {
      await watchForStalls(page);
      await page.goto(LESSON_PATH);
      await finishCorrectly(page, press);
      await traceTheGate(page, `after a lesson · round ${String(round)}`);
    });
  }
});
