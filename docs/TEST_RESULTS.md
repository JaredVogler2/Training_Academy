# Test results

Everything in this file was actually run. Where something was not run, it says so.

- **Date:** 2026-11-22
- **Code under test:** commit `e69eb06` on branch `claude/zealous-carson-qyiipa` (Phase 02; later commits change
  documents only)
- **Locally:** a Linux container (Ubuntu 24.04, 4 CPU cores, **no GPU**), Node 22.23.5, npm 10.9.9, Playwright 1.63.0
  with its Chromium 157 (headless; WebGL through the SwiftShader software renderer). WebKit is not installed there.
- **In CI:** GitHub Actions, `ubuntu-latest`, Node 22, the Chromium and WebKit builds that Playwright 1.63.0 installs.

## The release check

One command runs all of it, stopping at the first failure:

```bash
npm run verify:release
```

Result of the last local run: **passed.**

| Step                   | Result                                                                                   |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `npm run format:check` | clean                                                                                    |
| `npm run lint`         | no errors, no warnings                                                                   |
| `npm run typecheck`    | no errors (TypeScript strict, plus `noUncheckedIndexedAccess`)                           |
| `npm test`             | **594 tests in 25 files, all passed**                                                    |
| `npm run build`        | built; 48 files in `dist/`                                                               |
| `npm run verify:dist`  | **156 checks, all passed** (sizes below)                                                 |
| `npm run test:e2e`     | **177 browser tests: 173 passed, 4 skipped by design, 0 failed (Chromium, 3.8 minutes)** |

The skipped tests are keyboard journeys, which run on the desktop project and are skipped on the touch one.

Phase 01 ended with 420 unit tests and 140 browser tests. No test was removed; those that described the dock of
tiles and the hand-drawn island were rewritten for the map.

## Continuous integration

Every push to a pull request runs three jobs (`.github/workflows/ci.yml`): lint, types, unit tests and build; the
browser tests in Chromium on five screen shapes; and the browser tests in WebKit on two.

**Phase 02** is pull request [#2](https://github.com/JaredVogler2/Training_Academy/pull/2). Its first run had not
finished when this file was written; the result is recorded here by the next commit, and in the meantime the pull
request's own checks are the place to look.

### Phase 01, for the record

The run on Phase 01's tested commit, [45047511979](https://github.com/JaredVogler2/Training_Academy/actions/runs/45047511979):
Chromium 137 passed, 3 skipped by design; WebKit 101 passed, 21 skipped. It took eight runs to get there, and the
failures were the useful part:

| Run | Commit    | Chromium                       | WebKit          | What it showed                                                                                                                               |
| --- | --------- | ------------------------------ | --------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `713dbd7` | 2 failed, 2 flaky              | 7 failed        | WebKit: a page wider than the phone; a lost download that did not recover; two test-harness quirks. Chromium: the gate opening late.         |
| 2   | `791ea9d` | passed                         | 2 failed        | The layout fix held. The lost-download recovery still failed in WebKit.                                                                      |
| 3   | `f75e885` | 9 failed (desktop, 11 minutes) | passed          | Fetching lazy parts by their own import fixed WebKit. Chromium's desktop tests were being starved of CPU.                                    |
| 4   | `1a7ce5f` | passed (8.4 minutes)           | passed          | Holding the gate until it opens made the tests tolerant; a probe measured main-thread stalls of 3 to 5 seconds on desktop.                   |
| 5   | `0809289` | 1 failed (5.3 minutes)         | passed          | With the idle home screen made cheap, the stalls shrank to about 1.4 seconds. The one failure was Chromium's own preload remark.             |
| 6   | `8f1bcfb` | passed (4.8 minutes)           | passed          | A browser trace of what was left of the stall: Chromium tearing down the previous page's compositor and waiting for a software-emulated GPU. |
| 7   | `972c209` | passed (5.1 minutes)           | passed, 1 retry | The probe removed. One WebKit test needed its retry: a download cancelled by the test's own reload had been counted as a failed request.     |
| 8   | `19e2b55` | passed (4.3 minutes)           | passed          | The tested commit. No failures and no retries in either browser.                                                                             |

## What the unit tests cover (Vitest, 594)

| Area                              | Files                                                 | What is proven                                                                                                                                                                                                                                                                                                                                                          |
| --------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Engine                            | `tests/engine/*` (3)                                  | Seeded randomness is stable; a sitting is planned, resumed and finished deterministically; wrong answers, hints, reveals, re-probes and double submissions behave as specified; a property test plays lessons with arbitrary taps and they always end; evidence rules, including "watching, hints and second tries never count" and "one success per challenge per day" |
| Content                           | `tests/content/packs.test.ts`                         | The shipped pack passes the schema and every lint rule; every lint rule is shown to fire on a deliberately broken copy; a test fails if a rule is added without such a case                                                                                                                                                                                             |
| Storage                           | `tests/storage/*` (4)                                 | One contract suite against IndexedDB (fake-indexeddb), localStorage and memory drivers; atomic batches; insert-only attempts; migrations including an interrupted one and data from a newer version; export/import round trip, damage, wrong owner, idempotent merge; fallbacks when storage is refused                                                                 |
| Game                              | `tests/game/*` (2)                                    | The lesson runner saves, resumes, survives a failed save and a second tab; the counting pictures never overlap or leave their box for 1–10 things                                                                                                                                                                                                                       |
| Shell                             | `tests/app/*` (6), `tests/parent/*` (1)               | Router parsing and addresses; settings and their fallbacks; audio unlock, mute and unavailable audio; quality-tier choice; diagnostics; control components; the wording of evidence shown to grown-ups                                                                                                                                                                  |
| Build and server                  | `tests/config/*` (2)                                  | `vercel.json` as compiled by Vercel's own route compiler: rewrites, 404s, headers, cache rules; the service worker's policy against a fake Cache API, including the `Vary` case found in a real browser                                                                                                                                                                 |
| **Layout of the hub** (Phase 02)  | `tests/render/archipelago.test.ts`                    | For ten screen shapes: the right arrangement is chosen; every island is inside the free part of the screen; every tap area is at least 96 pixels square; no two overlap; the lighthouse is never inside one; the guide, boats, rocks and clouds are clear of every island and every name; the camera's target agrees with the arithmetic                                |
| **Island models** (Phase 02)      | `tests/render/islands.test.ts`                        | Each of the seven models stays inside the room the layout gives it, followed through the motion of its moving parts; is modelled rather than a placeholder; is under 40,000 triangles at every tier and lighter on the lowest; stores each corner once; builds identically every time                                                                                   |
| **The hub's pictures** (Phase 02) | `tests/render/sprites.test.ts`, `hubPicture.test.tsx` | The committed pictures were rendered from the models as they are now (a hash of the sources); one for every island and floating thing, the right size, not too heavy; the page puts each where the layout says, far islands first, and lifts the one pointed at                                                                                                         |
| **The guide** (Phase 02)          | `tests/ui/guide.test.tsx`                             | A pose for every state; hidden from assistive technology; points with the arm on the right side and by the right angle; unique gradients when two are on a page                                                                                                                                                                                                         |
| **Assets** (Phase 02)             | `tests/config/assets.test.ts`                         | Everything in `src/assets` and `public` is in the manifest; every listed path exists; nothing from elsewhere lacks a source, a holder and an allowed licence; no shipped file contains the address of another site                                                                                                                                                      |

## What the browser tests cover (Playwright, against the production build)

The build is served by `vite preview` with the `vercel.json` rules applied, so the tests run under the production
Content-Security-Policy, headers and routing.

**Every test also fails on:** any console error or warning, any uncaught exception, any failed request, any HTTP
status of 400 or more, and any request to another origin. (One thing passes on its own: a download the browser
cancelled because the page had gone on to load another document.) Exceptions are named one by one in `e2e/fixtures.ts`
(software-renderer noise, Playwright's own notices) or in the single test that expects them.

| Screen shape          | Size     | Tests                                |
| --------------------- | -------- | ------------------------------------ |
| Desktop               | 1366×768 | all 72                               |
| Phone, upright, touch | 390×844  | all 72 (4 keyboard journeys skipped) |
| Phone, sideways       | 844×390  | the 11 layout tests                  |
| Tablet                | 768×1024 | the 11 layout tests                  |
| Small phone           | 360×740  | the 11 layout tests                  |
| WebKit desktop, phone | as above | all 72 each, in CI only (see CI)     |

| Spec                 | What it proves in a real browser                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `shell.spec.ts`      | Six worlds, laid out for the screen, each a large target wholly on screen with no overlap, names never cut short or off the screen; a world's page shows its own island; real links, Back and Forward, titles, focus; deep links and refresh; not-found; sound and calm-motion toggles work and are remembered; calm motion really stops every animation on the home screen; sound really plays after a touch and stops when muted; keyboard, skip link, focus ring                                                                                                                                                                                                                                                                                                                                                                                                        |
| `hub.spec.ts`        | The picture is there first; the 3D scene arrives in its own chunks and draws a real scene (decoded from a screenshot: many colours, paler water far away); it moves gently, and not at all under reduced motion; it is taken down on leaving and rebuilt on return; a lost graphics context, a failed download or no WebGL each leave the picture; on automatic, a software-only renderer keeps the picture; the 3D code is never fetched where it is not used. **The map:** every island answers a tap at five points across it; a tap on a landmark or on a name opens that island; each picture sits exactly under its tap area; the lighthouse goes nowhere; focus lifts an island; Tab reaches the worlds in teaching order; the guide points at the open island, clear of every other, and waves when tapped. **Picture and 3D put every island in the same place.** |
| `lesson.spec.ts`     | A new player finishes the activity by looking and tapping; wrong answers are set aside, taught and never counted as independent; help comes one step at a time and is recorded; the guide points, wonders, is glad and is patient at the right moments; a double tap counts once; **a refresh mid-question resumes at the same question with the pictures in the same places**; the activity fits one screen                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `grownups.spec.ts`   | The press-and-hold gate (pointer and keyboard); add, switch, change and remove players; separate records; save a copy, erase, load it back; a damaged or foreign file is refused; settings; diagnostics; fits the screen with the longest names                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `resilience.spec.ts` | **Lost storage:** wiped between visits, and wiped while the page is open; IndexedDB refused (progress kept in localStorage and survives a reload); all storage refused (still playable, and the grown-up is told); a part that cannot be downloaded shows a calm message and recovers on reload                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `offline.spec.ts`    | With the real service worker: what was opened once opens again with no network and progress is kept; a part never opened says so; installing downloads the first screen only                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `a11y.spec.ts`       | axe-core, WCAG 2.1 A and AA rule sets, on the hub, world pages, five states of the activity, the grown-ups gate, area and a dialog, and the not-found page: no violations                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `smoke.spec.ts`      | Security headers, deep links, cache rules, the installable-app files, and a clean start. Tagged `@smoke`: these are the tests to run against a real deployment                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |

## Sizes (`npm run verify:dist`)

| What                                   | Size (gzip) | Budget  |
| -------------------------------------- | ----------- | ------- |
| Script for the first screen            | 98.6 kB     | 110 kB  |
| Styles for the first screen            | 6.2 kB      | 12 kB   |
| Fonts                                  | 67.2 kB     | 80 kB   |
| The hub's pictures (WebP, not gzipped) | 283.2 kB    | 330 kB  |
| 3D hub (on demand)                     | 259.7 kB    | 290 kB  |
| Largest other on-demand part           | 5.8 kB      | 30 kB   |
| Whole build, uncompressed, 48 files    | 1783.5 kB   | 2600 kB |

The verifier also proves, on the built files: one entry script; no 3D code, studio or character sheet reachable from
it by static import; no inline script or style (so the CSP holds); no development URL in any file; the manifest and
its icons; and that the service worker pre-downloads exactly the first screen's files and knows every hashed file.

## Screenshots

`docs/review/phase-02/` — 48 JPEGs taken from the running production build by `npm run screens` (headless Chromium,
software rendering, 2× pixel density), and one strip of four frames a few seconds apart. The script refuses to save
a picture of a page that is wider than its screen, and stops on any console error.

| Set                                                        | Sizes                                         |
| ---------------------------------------------------------- | --------------------------------------------- |
| Home, 3D (high tier)                                       | 390×844, 844×390, 360×740, 768×1024, 1366×768 |
| Home, as a picture                                         | 390×844, 768×1024, 1366×768                   |
| Home, 3D low tier; an island with focus; the guide's hello | 390×844; 1366×768; 1366×768                   |
| Each of the seven islands, close up                        | 1366×768                                      |
| The guide's character sheet                                | 1366×1080                                     |
| A world that is open, and one that is not                  | 390×844, 1366×768                             |
| The activity, six states                                   | 390×844, 844×390, 768×1024, 1366×768          |
| Four frames, 2.6 seconds apart: the mill, the robot, gulls | crops of 1366×768                             |

`docs/review/phase-02/round-1/` holds the home screen and the islands as they were at the first rated review, at
half size; `docs/review/phase-01/` is the build before this phase. The grown-ups area was not re-captured: it has not
changed.

## What verification found

Everything in this table was fixed, except the two rows that say a browser's own remark is now allowed in tests.

| Found by                               | Fault                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unit test (model sizes)** — Phase 02 | **Sunflowers, a tree's crown and a flag reached outside the room their islands were given**, so pictures of them were cut off and a neighbour's tap area could have covered them. Room is now measured as drawn on screen, and every model is measured against it.                                                                                                                                                                                        |
| **Unit test (layout)** — Phase 02      | A cloud placed over the lighthouse island on a tablet, a boat over a name on a sideways phone, the guide over an island's name on a phone: all placed by eye. They are now placed by the layout's arithmetic.                                                                                                                                                                                                                                             |
| **Browser test under load** — Phase 02 | **When the 3D code could not be downloaded, React sometimes wrote the error to the console** (two runs in twelve). The hub fell back correctly, but a thrown error is the wrong tool for an ordinary event: the 3D code is now fetched by hand.                                                                                                                                                                                                           |
| **Idle-cost measurement** — Phase 02   | The picture hub kept a quarter of a core busy: twenty stepped animations, each on its own clock. One shared beat brought it to 14%.                                                                                                                                                                                                                                                                                                                       |
| Screenshot capture — Phase 02          | A picture still being decoded is left out of the frame a screenshot takes ("complete" is not "drawn"): captures and tests now wait for decoding.                                                                                                                                                                                                                                                                                                          |
| Browser test — Phase 02                | The first Tab press reached the guide before any island; the test of calm motion was measuring an emblem that is no longer on the page (rewritten to measure everything that moves on the home screen).                                                                                                                                                                                                                                                   |
| `verify:dist`                          | The bundler's grouping made the 3D code a static dependency of the first screen.                                                                                                                                                                                                                                                                                                                                                                          |
| Offline browser test                   | Files fetched at install could never be found again: browsers send `Origin` with module requests and the server answered `Vary: Origin`. The worker's lookups now ignore `Vary`.                                                                                                                                                                                                                                                                          |
| Console guard                          | An unknown `Permissions-Policy` feature; a three.js shadow mode that no longer exists; a deprecation notice triggered inside React Three Fiber (filtered by exact text, everything else still shown).                                                                                                                                                                                                                                                     |
| Layout tests                           | World names cut off at 360 px; a hidden file input announced as a second button; question cards morphing into the next question; tile pictures overflowing on a sideways phone.                                                                                                                                                                                                                                                                           |
| Unit test (counting pictures)          | Things overlapped or left their box for groups of four to ten.                                                                                                                                                                                                                                                                                                                                                                                            |
| **WebKit in CI**                       | **A long button label ("Save a copy of …") made the grown-ups area wider than a phone.** Chromium's phone emulation hid it: it widens its layout viewport to hold the content, so `scrollWidth` equalled `innerWidth`. The label now wraps, and every layout test measures against the configured screen size and checks each control's edges (`screenFit` in `e2e/fixtures.ts`).                                                                         |
| **WebKit in CI**                       | **After one failed download of a lazy part, "Load the page again" did not recover.** WebKit kept the failed preload and reused it. Lazy parts are now fetched by their own `import()` rather than a late `<link rel="modulepreload">`.                                                                                                                                                                                                                    |
| WebKit in CI (tests, not the app)      | WebKit forgot a test's override set on the `indexedDB` object (now set on the prototype); Playwright's screenshot stylesheet is refused by the CSP and WebKit reports it (allowed, on WebKit only); a download cancelled by a test's own reload was counted as a failed request (the guard now tells the two apart).                                                                                                                                      |
| **The slow Chromium CI runner**        | **The idle home screen, in its illustrated form, kept a whole CPU core busy** (seven SVG animations at 60 frames a second under a backdrop blur). It starved the rest of the run: the grown-ups gate took up to six seconds to open instead of two, and nine desktop tests timed out. The animations now move in steps and the blur is gone (100% of a core → 10%). Tests also hold the gate's button until the area appears instead of for a fixed time. |
| Measuring the above                    | Software-rendered 3D costs more than three cores for 8 to 27 frames a second, so on automatic a software renderer now keeps the illustration.                                                                                                                                                                                                                                                                                                             |
| Chromium in CI (tests, not the app)    | With a service worker in control, Chromium sometimes declines to reuse a file that `index.html` preloaded and fetches it from the worker again, with a console remark. Harmless; allowed in the offline tests only, with the reason beside it.                                                                                                                                                                                                            |
| Screenshot review                      | See `docs/QUALITY_REPORT.md`.                                                                                                                                                                                                                                                                                                                                                                                                                             |

## iOS Safari: exactly what is and is not verified

**Verified:** the WebKit engine, as built by Playwright for Linux, running headless in CI at 1366×768 and as an
emulated 390×844 touch phone. On it: layout and screen fit, navigation, deep links and refresh, the whole activity by
touch, saving and resuming in IndexedDB, both storage-refusal paths, lost storage, players, export and import, the
press-and-hold gate, sound toggling, calm motion, the hub as a picture with its tap areas and the guide,
accessibility checks, and headers.

**That is not Safari, and it is not an iPhone.** It shares the layout and JavaScript engine. It does not share
Apple's graphics, audio, storage policy, touch handling, browser chrome or installation behaviour.

**Not verified on WebKit at all** (skipped there, and why):

| Skipped                                                               | Why                                                                             |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| The 3D hub, what a software renderer is given, and picture against 3D | Headless WebKit on Linux has no usable WebGL. Only the picture is tested there. |
| Offline and the service worker (3 per project)                        | Run in Chromium only.                                                           |

**Not verified on any Apple device or in any real Safari** — none of this has been tried:

- the 3D hub on Apple graphics hardware: whether it runs, at what frame rate, with how much memory, and what happens
  when the tab is sent to the background and the graphics context is taken away;
- sound: unlocking on the first touch, the silent switch, interruptions by calls or other apps;
- storage: private browsing, eviction after a week without use, quota;
- layout around the notch and home indicator, the collapsing toolbar (`dvh`), rotation, and system text size;
- the press-and-hold gate against iOS's own long-press behaviours;
- saving a copy (downloads on iOS) and loading one (the file picker);
- the service worker, offline use and "Add to Home Screen";
- the system's Reduce Motion setting.

The same holds for Android: Chromium's phone emulation is not a phone. **Before anyone relies on this build on a
tablet or phone, open it on one.** `docs/CONTINUE_HERE.md` lists what to look at first.

## Seen only on the CI machine, and explained

On the page that follows a finished lesson, the main thread stalls for one to two seconds, about a second after the
page starts. A temporary probe recorded a browser trace of it in CI: Chromium destroys the previous page's compositor
(`LayerTreeHost::~LayerTreeHost`) and waits for the GPU process to finish its queued work, and on that machine the
"GPU" is SwiftShader, a CPU emulation. Nothing in the game causes it; it does not happen on the faster machine this
was developed on, even with the CPU throttled; and with the home screen no longer starving the runner it no longer
delays anything a test waits for. It has not been checked on a device with a real GPU, where that wait should be
milliseconds.

## Also not done

- No Firefox run.
- No deployment, so nothing has been tested on Vercel itself. `docs/DEPLOYMENT.md` lists what a first preview must
  confirm. The smoke tests that will check it were run the same way against a locally served build
  (`BASE_URL=http://127.0.0.1:4173 npx playwright test --project=desktop --project=phone`): 16 passed.
- No performance measurement on real hardware (`docs/QUALITY_REPORT.md`).
- No screenshot-comparison tests; screenshots were reviewed by eye.
- No review by an early-years teacher, and no child has played it.

## Running the tests yourself

```bash
npm ci
```

```bash
npx playwright install chromium webkit
```

```bash
npm run verify:release
```

A single spec, one screen shape, with the browser visible:

```bash
npx playwright test e2e/lesson.spec.ts --project=phone --headed
```

The browser tests start their own server on port 4173 and will not reuse one that is already running there.
