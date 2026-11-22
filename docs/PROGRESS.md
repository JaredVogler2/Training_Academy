# Progress

The plan is the seventeen phases in `prompt-series/`. A phase is marked done only when its own acceptance checks
have been run and passed; the evidence is linked. `docs/CONTINUE_HERE.md` has the next action.

| Phase | Subject                                        | Status                                      |
| ----- | ---------------------------------------------- | ------------------------------------------- |
| 01    | Architecture, tooling, Vercel-ready foundation | **Done** (2026-11-22) — see below           |
| 02    | Visual identity and art pipeline               | Not started                                 |
| 03    | World and player journey, first vertical slice | Not started                                 |
| 04    | Audio and pre-reader onboarding                | Not started                                 |
| 05    | Phonics                                        | Not started                                 |
| 06    | Math                                           | Not started (one sample lesson exists)      |
| 07    | Robots (visual programming)                    | Not started                                 |
| 08    | Memory                                         | Not started                                 |
| 09    | Inventors' lab                                 | Not started                                 |
| 10    | Storytelling and geography                     | Not started                                 |
| 11    | Music and additional skills                    | Not started                                 |
| 12    | Adaptive mastery engine                        | Not started (evidence rules exist)          |
| 13    | Parent dashboard                               | Not started (a basic grown-ups area exists) |
| 14    | Accessibility, privacy, performance            | Not started (foundations in place)          |
| 15    | Test and visual QA                             | Not started (test harness in place)         |
| 16    | Vercel release                                 | Not started — **nothing is deployed**       |
| 17    | Polish, expansion, hand-off                    | Not started                                 |

## Phase 01 — what was asked, and where the evidence is

### Implement now

| #   | Asked for                                                                                                       | Delivered                                                                                                                                                                                    | Evidence                                                                                  |
| --- | --------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | Project structure                                                                                               | `src/{app,game,engine,content,render,ui,audio,storage,parent}`, `public/assets`, `tests`, `e2e`, `docs`, `scripts`                                                                           | the tree; layer rules in `eslint.config.js`                                               |
| 2   | Home shell, routes, reduced-motion and sound toggles, focus-visible controls, error boundary, no-WebGL fallback | Six-world hub, five routes with a History-API router, both toggles (remembered), one focus ring, boundaries around the routed view and the hub, an illustrated hub that is also the fallback | `e2e/shell.spec.ts`, `e2e/hub.spec.ts`, `e2e/a11y.spec.ts`                                |
| 3   | Typed Skill, Lesson, Challenge, Attempt, Evidence, Profile, LessonSession; stable IDs; content versioning       | Valibot schemas with inferred types; `schemaVersion`, `contentVersion`, lesson `version`; ID conventions                                                                                     | `src/engine/schema.ts`, `docs/CURRICULUM.md`, `tests/content`                             |
| 4   | `getNextChallenge`, `submitAttempt`, `getHint`, `getSkillEvidence`; no faked mastery                            | A pure, seeded engine; evidence derived from an append-only attempt log; watching, hints and retries never count as independent                                                              | `tests/engine/*` (incl. property tests), `e2e/lesson.spec.ts`                             |
| 5   | Profile CRUD; session save and restore; nothing on a server                                                     | Repository over IndexedDB → localStorage → memory; migrations; export/import; resume after refresh                                                                                           | `tests/storage/*`, `e2e/grownups.spec.ts`, `e2e/lesson.spec.ts`, `e2e/resilience.spec.ts` |
| 6   | 3D hub lazy-loaded; each module loads on entry; performance instrumentation without telemetry                   | `three`, `r3f`, `Hub3D` chunks after the shell; world code and content on entering the world; on-device diagnostics                                                                          | `npm run verify:dist`, `e2e/hub.spec.ts`, Grown-ups → Diagnostics                         |
| 7   | Scripts: dev, typecheck, lint, test, test:e2e, build, preview, verify:release                                   | All present, plus format, verify:dist, screens, icons                                                                                                                                        | `package.json`, `README.md`                                                               |
| 8   | `vercel.json` for history routes, cache rules, security headers, without breaking service-worker updates        | One rewrite, immutable caching for hashed files, no caching of `sw.js`, strict CSP and other headers; preview and production builds are identical                                            | `vercel.json`, `tests/config/vercel.test.ts`, `e2e/smoke.spec.ts`, `docs/DEPLOYMENT.md`   |

### Deliverables

| Asked for                                             | Where                                                                               |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------- |
| README startup instructions                           | `README.md`                                                                         |
| `docs/ARCHITECTURE.md`                                | written                                                                             |
| `docs/CURRICULUM.md` skeleton                         | written (one skill, one lesson recorded; the rest marked as planned)                |
| `docs/CONTINUE_HERE.md`, `docs/PROGRESS.md`           | written                                                                             |
| Sample versioned challenge and passing engine test    | `src/content/packs/number-garden.v1.json`, `tests/engine/session.test.ts`           |
| True Vite production build                            | `npm run build` → `dist/`; inspected by `npm run verify:dist`                       |
| Shell correct at 390×844, 844×390, 768×1024, 1366×768 | Browser tests on those four and on 360×740; screenshots in `docs/review/phase-01/`  |
| Also kept, as the series README asks                  | `docs/ART_DIRECTION.md` (interim), `docs/QUALITY_REPORT.md`, `docs/TEST_RESULTS.md` |
| Added because they were needed                        | `docs/DEPLOYMENT.md`, `docs/ASSETS.md`                                              |

### Verification

| Asked for                                       | Done                                                                                                       |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Lint, typecheck, unit tests, build              | Yes — `docs/TEST_RESULTS.md`                                                                               |
| Preview server and Playwright on the shell      | Yes — production build served with the `vercel.json` rules; Chromium locally and in CI, WebKit in CI       |
| Screenshots at phone portrait and desktop       | Yes, plus phone landscape, tablet and a 360 px phone — `docs/review/phase-01/`                             |
| No hydration or console errors                  | Every browser test fails on any console error or warning, page error, failed request or outside request    |
| Simulate refresh and lost storage               | Yes — `e2e/lesson.spec.ts`, `e2e/resilience.spec.ts`                                                       |
| State what is and is not verified in iOS Safari | `docs/TEST_RESULTS.md` → _iOS Safari_. In short: WebKit on Linux in CI only; no iPhone, no iPad, no Safari |
| Commit                                          | Branch `claude/zealous-carson-qyiipa`, pull request #1                                                     |
| Do not claim a Vercel deployment                | None exists; none is claimed                                                                               |

### Beyond the brief (and why)

- **A playable sample activity** (Number Garden, "same amount"). The engine had to be proven end to end through real
  touches, saving and resuming — a headless engine with no screen would have been "a theoretical learning engine".
- **A basic grown-ups area.** Profile CRUD, reset, export and import need somewhere to live and to be tested.
- **A service worker.** The brief allows it once its caching policy is tested; it is, in unit tests and in a real
  browser offline.
- **A local server that applies `vercel.json`.** Otherwise the headers and rewrites would have gone untested until a
  first deployment.

### Known gaps carried forward

| Gap                                                                                                                               | Owner phase |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| The island is built from primitive shapes; no guide character; emblems are not a family                                           | 02          |
| Frame rate has only been measured on a software renderer, never on a real GPU or a phone                                          | 02, 14      |
| The 3D scene uses about 60–100 draw calls for very little geometry (no instancing yet)                                            | 02          |
| The hub is a menu over a picture: worlds are not yet places you travel to                                                         | 03          |
| No spoken instructions; six synthesised cues only                                                                                 | 04          |
| One skill, one lesson, eight challenges; no review by an early-years teacher; no child has played it                              | 05–11       |
| Evidence thresholds are product heuristics; no spaced review, no difficulty adjustment                                            | 12          |
| Grown-ups area: no session limits, no per-skill history view, no printable summary                                                | 13          |
| `navigator.storage.persist()` is not requested; Safari may evict unused sites' data                                               | 13, 14      |
| No update prompt when a new version is waiting (it applies when the tabs are closed)                                              | 14          |
| The first screen's own files are still preloaded from `index.html`; whether a failed one recovers on reload in Safari is untested | 14          |
| No privacy/legal review; no dependency licence audit                                                                              | 14          |
| No image-comparison tests; no Firefox; no physical devices                                                                        | 15          |
| Not deployed; GitHub Actions are pinned to major versions, not commit SHAs                                                        | 16          |

## Log

- **2026-11-22** — Phase 01 implemented and verified. Toolchain; engine and first content pack; storage; shell, hub
  (3D and illustrated), sample activity, grown-ups area; release tooling and service worker; browser tests on five
  screen shapes; CI with Chromium and WebKit. CI earned its keep: WebKit found a long button label that widened the
  page (hidden by Chromium's phone emulation) and a lost download that a reload could not recover from; the
  Chromium run on the slower CI machine exposed an idle home screen that kept a whole CPU core busy. All three were
  fixed in the game, not just in the tests.
