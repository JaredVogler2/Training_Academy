import { existsSync } from 'node:fs';
import { defineConfig, devices, webkit, type Project } from '@playwright/test';
import { PAGE_LIMIT, pageLogPath } from './e2e/diagnosis';

/**
 * Browser tests run against the production build, served by `vite preview` under the same headers, rewrites and
 * 404s as vercel.json describes (scripts/vite/vercel-parity.ts).
 *
 * Projects
 *   desktop, phone                         Chromium; every spec. The phone project is a touch device.
 *   phone-landscape, tablet, small-phone   Chromium; the specs tagged @layout.
 *   webkit-desktop, webkit-phone           WebKit; every spec. Run when a WebKit build is installed (CI installs
 *                                          one). WebKit is Safari's engine, not an iPhone: see docs/TEST_RESULTS.md.
 *   android, android-landscape             Chromium as a Pixel 7: the screen its browser leaves a page, its pixel
 *                                          ratio, its user agent. The specs tagged @layout or @journey.
 *   iphone, iphone-landscape, ipad         WebKit as an iPhone 13 and an iPad, likewise; with the WebKit projects.
 *
 * The named devices are emulations: the right size, pixel ratio, touch and user agent on a desktop engine. They
 * catch what depends on those. They are not the devices (docs/TEST_RESULTS.md says what that leaves untested).
 *
 * Against a deployment: `BASE_URL=https://… npx playwright test` runs the specs tagged @smoke against that URL and
 * starts no local server. If the deployment is protected, set VERCEL_AUTOMATION_BYPASS_SECRET.
 */

// E2E_PORT lets two checkouts on one machine test at the same time without meeting on a port.
const PORT = Number(process.env.E2E_PORT ?? 4173);
const remote = process.env.BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL;
const baseURL = remote ?? `http://127.0.0.1:${PORT}`;
const bypassSecret = process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
const ci = Boolean(process.env.CI);

function webkitInstalled(): boolean {
  if (process.env.PW_WEBKIT === '1') return true;
  if (process.env.PW_WEBKIT === '0') return false;
  try {
    return existsSync(webkit.executablePath());
  } catch {
    return false;
  }
}

/**
 * Headless Chromium has no GPU; these flags give it WebGL through SwiftShader, a CPU rasteriser. The page itself is
 * drawn by Chromium's own software path, as on any machine without a GPU.
 *
 * Not `--use-gl=angle --use-angle=swiftshader`, which were here until CI's runs 69 and 70. They put all of a page's
 * drawing on SwiftShader as well, not only WebGL, and Chromium, taking down the drawing of a page it has left, waits
 * until SwiftShader has finished everything queued for it, on the main thread of the page that follows
 * (`LayerTreeHost::~LayerTreeHost`, waiting in `RasterImplementation::Finish`). As the tablet, 1536 by 2048 pixels,
 * that wait was 10 to 15 seconds on CI's machine, and the tests waiting on that page failed. WebGL reports the same
 * renderer either way. docs/TEST_RESULTS.md, under _Runs 69 and 70_, has the measurements.
 */
const SOFTWARE_GL = ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'];

const chromium = { browserName: 'chromium' as const, launchOptions: { args: SOFTWARE_GL } };
const touch = { hasTouch: true, isMobile: true, deviceScaleFactor: 2 };

const projects: Project[] = [
  { name: 'desktop', use: { ...chromium, viewport: { width: 1366, height: 768 } } },
  { name: 'phone', use: { ...chromium, ...touch, viewport: { width: 390, height: 844 } } },
  {
    name: 'phone-landscape',
    grep: /@layout/,
    use: { ...chromium, ...touch, viewport: { width: 844, height: 390 } },
  },
  {
    name: 'tablet',
    grep: /@layout/,
    use: { ...chromium, ...touch, viewport: { width: 768, height: 1024 } },
  },
  {
    name: 'small-phone',
    grep: /@layout/,
    use: { ...chromium, ...touch, viewport: { width: 360, height: 740 } },
  },
];

/** The specs that are about fitting a screen and about playing through: what a particular device can change. */
const ON_DEVICES = /@layout|@journey/;

projects.push(
  { name: 'android', grep: ON_DEVICES, use: { ...devices['Pixel 7'], ...chromium } },
  {
    name: 'android-landscape',
    grep: ON_DEVICES,
    use: { ...devices['Pixel 7 landscape'], ...chromium },
  },
);

if (webkitInstalled()) {
  projects.push(
    {
      name: 'webkit-desktop',
      use: { browserName: 'webkit', viewport: { width: 1366, height: 768 } },
    },
    {
      name: 'webkit-phone',
      use: { browserName: 'webkit', ...touch, viewport: { width: 390, height: 844 } },
    },
    { name: 'iphone', grep: ON_DEVICES, use: { ...devices['iPhone 13'] } },
    { name: 'iphone-landscape', grep: ON_DEVICES, use: { ...devices['iPhone 13 landscape'] } },
    { name: 'ipad', grep: ON_DEVICES, use: { ...devices['iPad (gen 7)'] } },
  );
}

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'test-results',
  // Two minutes for a test, where it was one. A test here plays a game at the game's own pace, and the longest
  // play a whole activity through: measured over CI's run 49, of the tests that had the one minute, 55 took 30
  // to 42 seconds, 17 took 42 to 55, and two took 59.5 and 59.4. Those two ran out of time on the next run
  // (run 50, on `main`), on a machine a fiftieth slower. The limit is there to stop a test that hangs, so it
  // stands well clear of what any test takes; and a test that still uses three quarters of it fails for that
  // (`nearItsLimit`, in the fixtures), which is how the next one is found on the day it is written.
  timeout: 120_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  workers: ci ? 2 : 3,
  reporter: ci ? [['list'], ['html', { open: 'never' }]] : [['list']],
  // Against a deployment, only the smoke specs make sense.
  ...(remote ? { grep: /@smoke/ } : {}),
  use: {
    baseURL,
    // A page that has not come in half a minute is not coming (see PAGE_LIMIT): the test fails then, and says
    // what it was waiting for, instead of waiting out the whole of its own time.
    navigationTimeout: PAGE_LIMIT,
    // Tracing every test costs about a third of the run; switch it on to debug a failure (`--trace on`). In CI a
    // test that has to be run a second time is traced on that second run, so that something is left to read.
    trace: ci ? 'on-first-retry' : 'off',
    screenshot: 'only-on-failure',
    // Most specs intercept or count network requests, which a service worker would hide. e2e/offline.spec.ts opts in.
    serviceWorkers: 'block',
    ...(remote
      ? {
          extraHTTPHeaders: {
            // Ask Vercel not to inject its preview toolbar (a third-party script this site's policy blocks anyway).
            'x-vercel-skip-toolbar': '1',
            ...(bypassSecret ? { 'x-vercel-protection-bypass': bypassSecret } : {}),
          },
        }
      : {}),
  },
  projects,
  ...(remote
    ? {}
    : {
        webServer: {
          command: 'npm run build && npm run preview',
          url: baseURL,
          // Never reuse a server that may be serving an older build.
          reuseExistingServer: false,
          timeout: 180_000,
          stdout: 'ignore' as const,
          stderr: 'pipe' as const,
          // The server notes each page it is asked for, for a test that runs out of time waiting for one.
          env: { PREVIEW_PAGE_LOG: pageLogPath(PORT) },
        },
      }),
});
