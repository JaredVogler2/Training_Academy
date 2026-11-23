# Progress

The plan is the seventeen phases in `prompt-series/`. A phase is marked done only when its own acceptance checks
have been run and passed; the evidence is linked. `docs/CONTINUE_HERE.md` has the next action.

| Phase | Subject                                        | Status                                      |
| ----- | ---------------------------------------------- | ------------------------------------------- |
| 01    | Architecture, tooling, Vercel-ready foundation | **Done** (2026-11-22) — see below           |
| 02    | Visual identity and art pipeline               | **Done** (2026-11-22) — see below           |
| 03    | World and player journey, first vertical slice | **Done** (2026-11-23) — see below           |
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

## Phase 03 — what was asked, and where the evidence is

Added by the owner for this phase: **it must work on Android and iOS devices when deployed on Vercel.**

### The flow

| Asked for                                                           | Delivered                                                                                                                                     | Evidence                                                      |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| A simple splash animation                                           | The front door: the card springs in front of the map, Glim waves, the pictures pop in                                                         | `src/app/FrontDoor.tsx`, `docs/review/phase-03/door-1-*.jpg`  |
| Select a locally stored avatar                                      | One tap on a picture: the players this device knows, or six pictures to choose from on a first visit (the tap creates the player)             | `e2e/journey.spec.ts`, `door-2-who-is-playing-*.jpg`          |
| Choose a world, or be gently guided to one                          | The map; Glim says hello, then points at the island that has something to play, which also has the sun tag                                    | `door-3-arriving-on-the-map-*.jpg`, `e2e/journey.spec.ts`     |
| The mascot demonstrates a task                                      | Glim counts the group, then its match, with the same notes, and lights them together                                                          | `src/game/lesson/script.ts`, `lesson-1-*`, `lesson-2-*`       |
| The child interacts; feedback explains or reveals the right idea    | A right answer is counted on both sides; a wrong one is counted against the group — a different number of notes — and set aside               | `lesson-4-*`, `lesson-6-*`, `tests/game/lessonScript.test.ts` |
| Celebration, then the next challenge or home                        | Glim is glad of each right answer; the end is calm: the island, a flower for each thing done, "Again" and the way home                        | `lesson-9-finished-*.jpg`                                     |
| Pictures, animation, sounds and a visible repeat-instruction button | Nothing needs reading. Glim is the "show me again" button, with a badge that says so                                                          | `tooltip-2-*.jpg`, `e2e/journey.spec.ts`                      |
| Settings behind a separate, intentional parental control            | Unchanged: the grown-ups' area behind its press-and-hold, not offered inside an activity. The two family switches are also on the pause sheet | `e2e/grownups.spec.ts`, `lesson-8-paused-*.jpg`               |

### Implement

| Asked for                                                                                                               | Delivered                                                                                                                                                                                           | Evidence                                                        |
| ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Animated hub with clear interactable landmarks for the six worlds                                                       | Phase 02's map, now behind a front door and with the 3D held back until the door opens                                                                                                              | `e2e/hub.spec.ts`, `click-map-2-map-*.jpg`                      |
| Distinct, meaningful illustrations of what tapping each world does; hover, focus and touch states; keyboard activation  | Each world's page pins its emblem to the picture of the place, and an open world shows an example of the activity from the lesson's own demonstration. States and keyboard as in Phase 02           | `world-open-*.jpg`, `world-not-open-*.jpg`, `e2e/shell.spec.ts` |
| A polished cross-world lesson frame; shared pause, replay and home controls; soft transitions; feedback and celebration | `src/game/lesson/`: a frame that knows nothing of amounts (a world says what can be counted); home, help, pause; Glim replays; pages fade in; no confetti anywhere                                  | `docs/ARCHITECTURE.md` → _The lesson frame_, `lesson-*.jpg`     |
| One complete playable slice of 4–6 authored visual challenges that teaches, with no literacy needed                     | Number Garden's "same amount, up to three": six steps a sitting (one shown, two guided, three alone) from eight authored challenges. The suggested first-sound slice needs a voice: Phase 04 and 05 | `docs/CURRICULUM.md` → _The first activity as it is played_     |
| Persist the session; play start → demo → guided → independent → calm completion → hub; a reload resumes safely          | As asked, including a refresh in the middle of a step with choices set aside and help used                                                                                                          | `e2e/journey.spec.ts`, `e2e/lesson.spec.ts`                     |
| No fake activity buttons; an honest, parent-readable "coming later" for worlds not built                                | Five worlds say "not open yet", show what is planned, and offer nothing to tap                                                                                                                      | `e2e/shell.spec.ts`, `world-not-open-*.jpg`                     |

### Interaction contract

| Asked for                                               | How it is met                                                                                                              |
| ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Low motor precision; targets that do not overlap        | Choices are 148 pixels or more on the tightest screen; every child's control is 56 or more (21 click maps)                 |
| No timed questions, no speed-based accuracy             | Nothing is timed. Response time is recorded and used for nothing                                                           |
| A wrong answer brings a scaffold, not a red X or a loss | The choice is counted against the group and set aside (one choice fewer); with one left it is shown. Nothing is taken away |
| The child can leave at any point                        | Home is in the bar and on the pause sheet; the place is kept                                                               |
| No double-submit races                                  | Three guards (runner, engine, store), tested with two taps in one tick                                                     |

### Acceptance

| Asked for                                                                           | Done                                                                                                                                          |
| ----------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| E2E (a): a brand-new pre-reader completes a concept without text, desktop and touch | `e2e/journey.spec.ts`, first test: from the front door to the end and home, acting on what is drawn. Desktop, phone, Pixel 7, iPhone 13, iPad |
| E2E (b): the hint and wrong-answer path, and pause and resume                       | `e2e/journey.spec.ts`, third and fourth tests: a wrong answer, "show me again", help in steps, pause, a refresh, leaving and coming back      |
| Capture real interactions, click maps, tooltips and responsive screens              | `docs/review/phase-03/`: 85 pictures from the running build, 21 of them click maps, 3 tooltips, at six screen sizes                           |
| Document actual content ids and replay-safe progression                             | `docs/CURRICULUM.md` → _The first activity as it is played_                                                                                   |
| Commit                                                                              | Branch `claude/zealous-carson-qyiipa`, pull request #4                                                                                        |

### The requirement about phones and Vercel

Met as far as code, emulation and reasoning go; **not verified on any device, and nothing is deployed.** What was
done, how each part was checked, and what only a device can tell are in `docs/QUALITY_REPORT.md` → _Phones_. How to
get it onto a phone, and the twelve things to try there, are in `docs/DEPLOYMENT.md` → _Trying it on a real phone
and tablet_.

### Beyond the brief (and why)

- **A notice for a browser too old to run the game.** A blank page on an old iPad would otherwise be the whole
  story.
- **Click maps as part of `npm run screens`.** They found two controls under size in their first run.
- **Named device profiles in the browser tests.** Asked for by the requirement, in effect.

## Phase 02 — what was asked, and where the evidence is

### Produce

| #   | Asked for                                                                                                                                                                           | Delivered                                                                                                                                                                                                                                                                                                         | Evidence                                                                                                       |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `docs/ART_DIRECTION.md`: mood, silhouettes, 6–8 role colours, contrast, typography, lighting, staging, character turnaround and emotion set, 2D language, transitions, sound motifs | Written as a standard: each rule with its reason. Eight colour roles with measured contrast; a silhouette table for the seven islands; the guide's construction, six states and three views                                                                                                                       | `docs/ART_DIRECTION.md`, `docs/review/phase-02/guide-character-sheet-1366x1080.jpg`                            |
| 2   | Asset manifest, source and licence tracking, a pipeline for vector, texture, sprite, low-poly 3D, shaders and audio; no hot links, nothing unsourced                                | `docs/assets.manifest.json`, kept true by tests; one way to make each kind of asset, each with its check                                                                                                                                                                                                          | `docs/ASSETS.md`, `tests/config/assets.test.ts`, `tests/render/sprites.test.ts`                                |
| 3   | A real-time rendered hero hub with depth, interaction-ready elements and ambient animation                                                                                          | A lighthouse and six modelled islands in a moving sea, drawn in real time; each island a link that lifts when pointed at; water, wind, moving landmarks, boats, gulls, clouds                                                                                                                                     | `src/render/hub3d/`, `e2e/hub.spec.ts`, `docs/review/phase-02/hub-3d-*.jpg`, `motion-four-frames-1366x768.jpg` |
| 4   | One character with idle, celebrate, think, gentle retry and point states, transparent, responsive to events                                                                         | Glim: one rigged SVG with those five states and a wave; reacts to the lesson's events and to a tap on the hub                                                                                                                                                                                                     | `src/ui/Guide.tsx`, `tests/ui/guide.test.tsx`, `e2e/lesson.spec.ts`, `e2e/hub.spec.ts`                         |
| 5   | Semantic lighting, cast and received shadows, atmosphere, animated foliage, clouds and water, spatial hierarchy, readable hotspots                                                  | One warm sun and cool fill; a shadow map drawn once, contact shade on every tier; haze and a vignette; wind in everything that grows; clouds with shadows; a water shader with shallows, foam and rings                                                                                                           | `docs/ART_DIRECTION.md` → _Light_, _Materials_, _Motion_; `src/render/hub3d/{paint,Sea,stage}.ts*`             |
| 6   | Low, medium and high tiers; capped pixel ratio; GPU resources managed and disposed; reduced motion; a no-WebGL fallback                                                             | Three tiers (the lowest also cuts curves coarser and drops the water's decoration); pixel ratio capped at 1, 1.5, 2 and stepped down if frames are slow; everything disposed with the scene; one still frame under calm motion; the hub as a picture, rendered from the same models, wherever 3D is not available | `src/render/quality.ts`, `e2e/hub.spec.ts`, `docs/QUALITY_REPORT.md` → _Performance_                           |
| 7   | Child-scale UI: targets of 48–64 px or more, legible contrast, no instruction only in 3D, icons with optional labels, clear feedback                                                | The whole island is the target (96 px square at the least); names in ink on white at 13:1; no words in the 3D scene at all; each name with an icon; press, lift and a sound for every tap                                                                                                                         | `tests/render/archipelago.test.ts`, `e2e/shell.spec.ts`, `e2e/a11y.spec.ts`                                    |

### The art gate

| Asked for                                                                                                                                    | Done                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Screenshots at 390×844, 844×390, 768×1024, 1366×768 and a 360-pixel-wide screen                                                              | `docs/review/phase-02/` (and `round-1/` for the first round)                                                                                                                                                                                                                                                 |
| Each rated 1–5 in nine categories; anything under 4 recorded                                                                                 | `docs/QUALITY_REPORT.md` → _The art review_. Home screen: 4 or more in the six categories that can be rated here. Recorded below 4: the picture's liveliness, the low tier's craft and depth, and the activity screen. **Not rated at all: motion in 3D, device performance, child comprehension** — and why |
| Iterate at least twice                                                                                                                       | Two rated rounds, after about fifteen earlier corrections; all in the "seen — cause — fix" log                                                                                                                                                                                                               |
| No untextured primitive-only islands; no emoji as art; no stock hero image over an inert UI; no giant empty gradients; no illegible hotspots | Modelled, painted, brush-textured islands; all art drawn or modelled for this project; the picture is the interface; the sea is never empty; every hotspot is an island with its name                                                                                                                        |
| Check actual interaction and pointer hit areas                                                                                               | Browser tests hit-test five points on every island at five screen sizes, tap landmarks and names, and tap the lighthouse to see that nothing happens                                                                                                                                                         |
| Save before and after screenshots and commit                                                                                                 | `docs/review/phase-01/` (before), `phase-02/round-1/`, `phase-02/`                                                                                                                                                                                                                                           |

### Beyond the brief (and why)

- **The dock of tiles is gone.** With the worlds on the map, a second menu of them was a second way to do one thing.
- **The fallback is rendered from the 3D models**, not drawn separately. Phase 01's two hubs were two different
  pictures; one set of models now makes both.
- **A world's page shows its island.** One line of continuity until Phase 03 builds the journey.
- **A studio route** (`/studio/<island>`, `/studio/guide`), linked from nowhere: it is how the pictures are rendered
  and how the art is reviewed.

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

### Known gaps carried forward (updated at the end of Phase 03)

| Gap                                                                                                                               | Owner phase |
| --------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| **Frame rate has still only been measured on a software renderer, never on a real GPU or a phone** (and there it is poor)         | owner, 14   |
| The guide's name, "Glim", has not been checked for prior use                                                                      | owner       |
| **Nothing has run on a real phone or tablet, and nothing is deployed.** Sound on iOS, long presses, the notch, real GPUs          | owner, 16   |
| Going to an island is a fade, not a journey; nothing on an island answers a tap except by rising                                  | 17          |
| The hub's picture has still islands                                                                                               | 17          |
| No spoken instructions: "show me again" replays what was shown and its notes. Eleven synthesised motifs and a counting note       | 04          |
| The first-sound slice the brief suggested was not built: it needs a voice. The slice is number sense                              | 04, 05      |
| One skill, one lesson, eight challenges; no review by an early-years teacher; no child has played it                              | 05–11       |
| Evidence thresholds are product heuristics; no spaced review, no difficulty adjustment                                            | 12          |
| Grown-ups area: no session limits, no per-skill history view, no printable summary                                                | 13          |
| `navigator.storage.persist()` is not requested; Safari may evict unused sites' data                                               | 13, 14      |
| No update prompt when a new version is waiting (it applies when the tabs are closed)                                              | 14          |
| The first screen's own files are still preloaded from `index.html`; whether a failed one recovers on reload in Safari is untested | 14          |
| No privacy/legal review; no dependency licence audit                                                                              | 14          |
| No image-comparison tests; no Firefox; no physical devices                                                                        | 15          |
| In CI, a browser test that follows a 3D test has taken up to 44.5 of its 60 seconds (see `docs/TEST_RESULTS.md`)                  | 15          |
| Not deployed; GitHub Actions are pinned to major versions, not commit SHAs                                                        | 16          |

## Log

- **2026-11-23** — Phase 03 implemented and verified in browsers, with the owner's added requirement that it work
  on Android and iOS devices on a Vercel deployment. A visit now opens on a front door and runs through to the end
  of an activity and home; the lesson frame is the one every world will use. Sound, touch and layout were reworked
  for phones, and the tests run as a Pixel 7, an iPhone 13 and an iPad. None of it has been on a device, and
  nothing is deployed: `docs/DEPLOYMENT.md` says how to change that and what to check.

- **2026-11-22** — Phase 02 implemented and verified. The hub became the map: layout arithmetic shared by 3D, picture
  and links; a modelling kit, one painted material and a water shader; seven island models; the picture rendered
  from them; Glim; an art standard, an asset manifest and a pipeline; two rated rounds of review. What the tests and
  measurements found along the way is in `docs/TEST_RESULTS.md` and `docs/QUALITY_REPORT.md`. CI passed in Chromium
  and in WebKit on every run, and the pull request was merged as `65a137b`. Reading the times of those green runs
  showed that the browser tests of the 3D scene had less time than they sometimes need, which was put right. (A
  trial of running them in order was taken out again; the CI machine varies too much from run to run for it to
  have shown anything.) The largest thing still unknown is the same as before: how it runs on a real device.

- **2026-11-22** — Phase 01 implemented and verified. Toolchain; engine and first content pack; storage; shell, hub
  (3D and illustrated), sample activity, grown-ups area; release tooling and service worker; browser tests on five
  screen shapes; CI with Chromium and WebKit. CI earned its keep: WebKit found a long button label that widened the
  page (hidden by Chromium's phone emulation) and a lost download that a reload could not recover from; the
  Chromium run on the slower CI machine exposed an idle home screen that kept a whole CPU core busy. All three were
  fixed in the game, not just in the tests.
